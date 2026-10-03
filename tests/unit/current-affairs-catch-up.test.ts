// Current affairs: same-day catch-up (3 Oct 2026, fix C15).
//
// vercel.json now runs /api/cron/daily-current-affairs at 06:30, 14:30 and
// 20:30 IST. Before any model call the route reads today's IST date: rows
// already written → skip; a current-affairs ledger row (AiUsage, ref = today)
// → skip (a paid run that stored nothing is not paid for again that day); a
// failed read → 500 and no call. An empty AI balance answers 200
// { ok: false, stopped: "credit" }; any other failure keeps the 500. And a
// reply that does not parse is logged with its stop_reason and length.
// No DB, no AI: prisma, the generator and the Anthropic client are mocked.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  aiUsageCount: vi.fn(),
  executeRaw: vi.fn(),
  generate: vi.fn(),
  create: vi.fn(),
  recordAiUsage: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: { $queryRaw: h.queryRaw, $executeRawUnsafe: h.executeRaw, aiUsage: { count: h.aiUsageCount } },
}));
vi.mock("@/lib/current-affairs", () => ({ generateDailyCurrentAffairs: h.generate }));
vi.mock("@/lib/ai/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/client")>()),
  anthropic: { messages: { create: h.create } },
}));
vi.mock("@/lib/ai/usage", () => ({ recordAiUsage: h.recordAiUsage }));

import { GET } from "@/app/api/cron/daily-current-affairs/route";

const SECRET = "test-secret";
const call = () => GET(new Request("https://shishya.in/api/cron/daily-current-affairs", { headers: { authorization: `Bearer ${SECRET}` } }));

/** Today's IST date the way the route computes it. */
const istToday = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);

/** The API's empty-balance 400, as the SDK surfaces it. */
function creditError() {
  return Object.assign(new Error("400 Your credit balance is too low to access the Anthropic API."), {
    status: 400,
    error: {
      type: "error",
      error: {
        type: "invalid_request_error",
        message: "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.",
      },
    },
  });
}

beforeEach(() => {
  vi.stubEnv("CRON_SECRET", SECRET);
  for (const f of Object.values(h)) f.mockReset();
  h.generate.mockResolvedValue({ items: [{ title: "t", summary: "s" }], inputTokens: 1000, outputTokens: 1000 });
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("daily-current-affairs: one paid call a day at most", () => {
  it("today already has rows → 200 skipped, 0 model calls, no ledger read needed", async () => {
    h.queryRaw.mockResolvedValue([{ n: 9 }]);
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: istToday(), skipped: "already-written" });
    expect(h.generate).not.toHaveBeenCalled();
    expect(h.aiUsageCount).not.toHaveBeenCalled();
  });

  it("no rows but a current-affairs ledger row for today → 200 skipped, 0 model calls", async () => {
    h.queryRaw.mockResolvedValue([{ n: 0 }]);
    h.aiUsageCount.mockResolvedValue(1);
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: istToday(), skipped: "paid-run-stored-nothing" });
    expect(h.generate).not.toHaveBeenCalled();
    expect(h.aiUsageCount).toHaveBeenCalledWith({ where: { feature: "current-affairs", ref: istToday() } });
  });

  it("neither → exactly one model call, for today's IST date", async () => {
    h.queryRaw.mockResolvedValue([{ n: 0 }]);
    h.aiUsageCount.mockResolvedValue(0);
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, date: istToday(), items: 1 });
    expect(h.generate).toHaveBeenCalledTimes(1);
    expect(h.generate).toHaveBeenCalledWith({ istDate: istToday() });
  });

  it("the row count reads today's IST date", async () => {
    h.queryRaw.mockResolvedValue([{ n: 3 }]);
    await call();
    const [strings, ...values] = h.queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    expect(strings.join("?")).toMatch(/SELECT COUNT\(\*\)::int AS n FROM "CurrentAffair" WHERE date = \?::date/);
    expect(values).toEqual([istToday()]);
  });

  it("a credit-shaped error → 200 with stopped: credit", async () => {
    h.queryRaw.mockResolvedValue([{ n: 0 }]);
    h.aiUsageCount.mockResolvedValue(0);
    h.generate.mockRejectedValue(creditError());
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, date: istToday(), stopped: "credit" });
    expect(h.generate).toHaveBeenCalledTimes(1);
  });

  it("an API 500 → 500, as before", async () => {
    h.queryRaw.mockResolvedValue([{ n: 0 }]);
    h.aiUsageCount.mockResolvedValue(0);
    h.generate.mockRejectedValue(Object.assign(new Error("500 Internal server error"), { status: 500, error: { type: "error", error: { type: "api_error", message: "Internal server error" } } }));
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ ok: false, date: istToday() });
  });

  it("a failed row count → 500 and 0 model calls", async () => {
    h.queryRaw.mockRejectedValue(new Error("connection refused"));
    const res = await call();
    expect(res.status).toBe(500);
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("a failed ledger count → 500 and 0 model calls", async () => {
    h.queryRaw.mockResolvedValue([{ n: 0 }]);
    h.aiUsageCount.mockRejectedValue(new Error("connection refused"));
    const res = await call();
    expect(res.status).toBe(500);
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("still refuses a call without the cron secret", async () => {
    const res = await GET(new Request("https://shishya.in/api/cron/daily-current-affairs"));
    expect(res.status).toBe(401);
    expect(h.queryRaw).not.toHaveBeenCalled();
  });
});

describe("generateDailyCurrentAffairs: a reply that does not parse is logged, then fails as before", () => {
  it("logs stop_reason and the reply length, rethrows, writes nothing", async () => {
    const { generateDailyCurrentAffairs } = await vi.importActual<typeof import("@/lib/current-affairs")>("@/lib/current-affairs");
    const text = "Here are today's items: {\"items\": [ {\"title\": \"cut";
    h.create.mockResolvedValue({
      content: [{ type: "text", text }],
      stop_reason: "max_tokens",
      usage: { input_tokens: 10, output_tokens: 4000 },
    });
    const err = vi.mocked(console.error);
    await expect(generateDailyCurrentAffairs({ istDate: "2026-10-03" })).rejects.toThrow(/Failed to parse JSON/);
    expect(err).toHaveBeenCalledWith("[current-affairs] reply did not parse", JSON.stringify({ stop_reason: "max_tokens", chars: text.length }));
    expect(h.executeRaw).not.toHaveBeenCalled();
  });
});
