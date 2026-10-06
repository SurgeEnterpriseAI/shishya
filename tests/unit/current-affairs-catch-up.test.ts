// Current affairs: same-day catch-up (3 Oct 2026, fix C15) and retry until
// the day is written (6 Oct 2026, B2).
//
// vercel.json runs /api/cron/daily-current-affairs at 06:30, 14:30 and 20:30
// IST. The run takes a per-date advisory lock first (a second run at the same
// time answers "call-in-flight" and pays nothing) and holds it through the
// check, the model call, the ledger row and the write
// (src/lib/current-affairs-slot.ts). Under the lock: rows already written →
// skip; paid calls today (AiUsage ledger) ≥ slots begun → skip (one paid call
// per slot, three a day at most); a failed lock or read → 500 and no call.
// Since 6 Oct a paid run that stored nothing no longer ends the day: the next
// slot calls again. An empty AI balance answers 200 { ok: false, stopped:
// "credit" }; a reply with no usable digest stores nothing and answers 500.
// The writer stores a day only from a reply with at least MIN_DIGEST_ITEMS
// sourced items, in one transaction under a per-day lock, and only while the
// day has no rows; the ledger row is awaited before the write. No DB, no AI:
// prisma, the generator and the Anthropic client are mocked.

import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  aiUsageCount: vi.fn(),
  executeRaw: vi.fn(),
  txQueryRaw: vi.fn(),
  transaction: vi.fn(),
  generate: vi.fn(),
  create: vi.fn(),
  recordAiUsage: vi.fn(),
  recordAiUsageAwaited: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $queryRaw: h.queryRaw,
    $executeRawUnsafe: h.executeRaw,
    $transaction: h.transaction,
    aiUsage: { count: h.aiUsageCount },
  },
}));
vi.mock("@/lib/current-affairs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/current-affairs")>()),
  generateDailyCurrentAffairs: h.generate,
}));
vi.mock("@/lib/ai/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/client")>()),
  anthropic: { messages: { create: h.create } },
}));
vi.mock("@/lib/ai/usage", () => ({ recordAiUsage: h.recordAiUsage, recordAiUsageAwaited: h.recordAiUsageAwaited }));

import { GET, maxDuration } from "@/app/api/cron/daily-current-affairs/route";
import { CA_MODEL_TIMEOUT_MS, CurrentAffairsReplyError, MIN_DIGEST_ITEMS, finalReplyText, usableItems } from "@/lib/current-affairs";
import {
  CA_CALL_TX_TIMEOUT_MS,
  CA_SLOT_IST_MINUTES,
  MAX_PAID_CALLS_PER_DAY,
  caCallLockKey,
  caRunDecision,
  istDateStr,
  nextSlotIso,
  paidCallsAllowed,
  slotsBegun,
} from "@/lib/current-affairs-run";

const SECRET = "test-secret";
const call = () => GET(new Request("https://shishya.in/api/cron/daily-current-affairs", { headers: { authorization: `Bearer ${SECRET}` } }));

/** The three cron slots on 6 Oct 2026 (UTC) and the IST date they file under. */
const SLOT1 = "2026-10-06T01:00:04Z"; // 06:30 IST
const SLOT2 = "2026-10-06T09:00:03Z"; // 14:30 IST
const SLOT3 = "2026-10-06T15:00:02Z"; // 20:30 IST
const DAY = "2026-10-06";
const at = (iso: string) => vi.setSystemTime(new Date(iso));

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

/** n good, sourced digest items. */
function goodItems(n: number) {
  return Array.from({ length: n }, (_, i) => ({
    title: `Item ${i + 1} headline`,
    summary: `Fact ${i + 1}.`,
    category: "National",
    examTags: ["UPSC"],
    whyItMatters: null,
    source: `https://example.gov.in/news/${i + 1}`,
  }));
}

/** A model reply as web_search returns it: a preamble, two searches, then the answer. */
function reply(finalText: string, o: { stop?: string; out?: number } = {}) {
  return {
    content: [
      { type: "text", text: "I'll search for today's most exam-relevant news {first}." },
      { type: "server_tool_use", id: "s1", name: "web_search", input: { query: "india news" } },
      { type: "web_search_tool_result", tool_use_id: "s1", content: [] },
      { type: "text", text: "Let me search for more." },
      { type: "server_tool_use", id: "s2", name: "web_search", input: { query: "rbi" } },
      { type: "web_search_tool_result", tool_use_id: "s2", content: [] },
      { type: "text", text: finalText },
    ],
    stop_reason: o.stop ?? "end_turn",
    usage: { input_tokens: 36000, output_tokens: o.out ?? 3200 },
  };
}

/** The transaction client the slot run gets: its lock and count go to h.queryRaw, its ledger count to h.aiUsageCount. */
const slotTx = { $queryRaw: h.queryRaw, $executeRawUnsafe: h.executeRaw, aiUsage: { count: h.aiUsageCount } };

/**
 * The DB as the slot run sees it: `rows` stored for today, `paid` ledger rows,
 * and a call lock that is free unless `lock.held`. A transaction takes the
 * lock with its first statement and frees it when it ends, as Postgres does
 * with pg_try_advisory_xact_lock.
 */
function slotDb(o: { rows?: number; paid?: number } = {}) {
  const lock = { held: false };
  const state = { rows: o.rows ?? 0, paid: o.paid ?? 0 };
  h.queryRaw.mockImplementation(async (strings: TemplateStringsArray) => {
    const sql = strings.join("?");
    if (sql.includes("pg_try_advisory_xact_lock")) {
      if (lock.held) return [{ got: false }];
      lock.held = true;
      return [{ got: true }];
    }
    return [{ n: state.rows }];
  });
  h.aiUsageCount.mockImplementation(async () => state.paid);
  h.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
    let mine = false;
    const tx = {
      ...slotTx,
      $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const wasHeld = lock.held;
        const r = (await h.queryRaw(strings, ...values)) as { got?: boolean }[];
        if (!wasHeld && r[0]?.got) mine = true;
        return r;
      },
    };
    try {
      return await fn(tx);
    } finally {
      if (mine) lock.held = false;
    }
  });
  return { lock, state };
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  at(SLOT1);
  vi.stubEnv("CRON_SECRET", SECRET);
  for (const f of Object.values(h)) f.mockReset();
  h.generate.mockResolvedValue({ items: goodItems(10), written: 10, inputTokens: 1000, outputTokens: 1000 });
  h.recordAiUsageAwaited.mockResolvedValue(0.2);
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("current-affairs-run: one paid call per slot, the day retried until written", () => {
  it("counts the slots begun in the IST day (06:30, 14:30, 20:30 IST; 5 minutes early counts)", () => {
    expect(slotsBegun(new Date("2026-10-05T19:00:00Z"))).toBe(0); // 00:30 IST on 6 Oct
    expect(slotsBegun(new Date("2026-10-06T00:55:00Z"))).toBe(1); // 06:25 IST
    expect(slotsBegun(new Date("2026-10-06T00:54:00Z"))).toBe(0);
    expect(slotsBegun(new Date(SLOT1))).toBe(1);
    expect(slotsBegun(new Date(SLOT2))).toBe(2);
    expect(slotsBegun(new Date(SLOT3))).toBe(3);
    expect(slotsBegun(new Date("2026-10-06T18:29:00Z"))).toBe(3); // 23:59 IST
  });

  it("allows at least one call (a hand run before 06:30 IST) and never more than three", () => {
    expect(paidCallsAllowed(new Date("2026-10-05T19:00:00Z"))).toBe(1);
    expect(paidCallsAllowed(new Date(SLOT3))).toBe(MAX_PAID_CALLS_PER_DAY);
    expect(MAX_PAID_CALLS_PER_DAY).toBe(3);
  });

  it("files a run under its IST date (18:30 UTC starts the next IST day)", () => {
    expect(istDateStr(new Date("2026-10-05T18:29:59Z"))).toBe("2026-10-05");
    expect(istDateStr(new Date("2026-10-05T18:30:00Z"))).toBe("2026-10-06");
  });

  it("names the next slot, and none after 20:30 IST", () => {
    expect(nextSlotIso(new Date(SLOT1))).toBe("2026-10-06T09:00:00.000Z");
    expect(nextSlotIso(new Date(SLOT2))).toBe("2026-10-06T15:00:00.000Z");
    expect(nextSlotIso(new Date(SLOT3))).toBeNull();
    expect(nextSlotIso(new Date("2026-10-05T19:00:00Z"))).toBe("2026-10-06T01:00:00.000Z");
  });

  it("rows already written → never a call, whatever the ledger says", () => {
    expect(caRunDecision({ rowsToday: 12, paidCallsToday: 0, now: new Date(SLOT3) })).toEqual({ run: false, skipped: "already-written" });
  });

  it("a morning paid run that stored nothing → the 14:30 slot calls again (attempt 2), the 20:30 slot a third time, then no more", () => {
    expect(caRunDecision({ rowsToday: 0, paidCallsToday: 0, now: new Date(SLOT1) })).toEqual({ run: true, attempt: 1 });
    expect(caRunDecision({ rowsToday: 0, paidCallsToday: 1, now: new Date(SLOT1) })).toMatchObject({ run: false, skipped: "slot-call-used" });
    expect(caRunDecision({ rowsToday: 0, paidCallsToday: 1, now: new Date(SLOT2) })).toEqual({ run: true, attempt: 2 });
    expect(caRunDecision({ rowsToday: 0, paidCallsToday: 2, now: new Date(SLOT2) })).toMatchObject({ run: false, skipped: "slot-call-used" });
    expect(caRunDecision({ rowsToday: 0, paidCallsToday: 2, now: new Date(SLOT3) })).toEqual({ run: true, attempt: 3 });
    expect(caRunDecision({ rowsToday: 0, paidCallsToday: 3, now: new Date(SLOT3) })).toEqual({
      run: false,
      skipped: "slot-call-used",
      paidCalls: 3,
      allowed: 3,
      nextSlot: null,
    });
  });

  it("the slots are vercel.json's schedule for the route (06:30, 14:30, 20:30 IST = 01:00, 09:00, 15:00 UTC)", () => {
    const crons = (JSON.parse(readFileSync("vercel.json", "utf8")) as { crons: { path: string; schedule: string }[] }).crons;
    const schedule = crons.find((c) => c.path === "/api/cron/daily-current-affairs")?.schedule;
    const utcHours = CA_SLOT_IST_MINUTES.map((m) => (m - 330) / 60);
    expect(schedule).toBe(`0 ${utcHours.join(",")} * * *`);
  });

  it("a slot that paid nothing (credit stop, API error before a reply) leaves the later slot free", () => {
    expect(caRunDecision({ rowsToday: 0, paidCallsToday: 0, now: new Date(SLOT2) })).toEqual({ run: true, attempt: 1 });
  });

  it("the locked transaction outlasts the model call and ends before the route is stopped and before the DB's idle limit", () => {
    expect(CA_MODEL_TIMEOUT_MS).toBe(240_000);
    expect(CA_MODEL_TIMEOUT_MS).toBeLessThan(CA_CALL_TX_TIMEOUT_MS);
    expect(CA_CALL_TX_TIMEOUT_MS).toBeLessThan(maxDuration * 1000);
    // idle_in_transaction_session_timeout on the production DB, read 6 Oct 2026: 5min.
    expect(CA_MODEL_TIMEOUT_MS).toBeLessThan(5 * 60_000);
    expect(caCallLockKey(DAY)).toBe("current-affairs-call:2026-10-06");
  });
});

describe("daily-current-affairs route", () => {
  it("today already has rows → 200 skipped, 0 model calls, no ledger read needed", async () => {
    slotDb({ rows: 9 });
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, date: DAY, skipped: "already-written" });
    expect(h.generate).not.toHaveBeenCalled();
    expect(h.aiUsageCount).not.toHaveBeenCalled();
  });

  it("06:30 slot, no rows, no paid call yet → the lock first, then exactly one model call inside the same transaction", async () => {
    slotDb();
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, date: DAY, items: 10, attempt: 1 });
    expect(h.transaction).toHaveBeenCalledTimes(1);
    expect(h.transaction.mock.calls[0][1]).toEqual({ maxWait: 10_000, timeout: CA_CALL_TX_TIMEOUT_MS });
    const [lockStrings, ...lockValues] = h.queryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    expect(lockStrings.join("?")).toContain("pg_try_advisory_xact_lock(hashtext(?))");
    expect(lockValues).toEqual([caCallLockKey(DAY)]);
    expect(h.generate).toHaveBeenCalledTimes(1);
    expect(h.generate).toHaveBeenCalledWith({ istDate: DAY, tx: expect.objectContaining({ aiUsage: slotTx.aiUsage }) });
    expect(h.aiUsageCount).toHaveBeenCalledWith({ where: { feature: "current-affairs", ref: DAY } });
  });

  it("the 6 Oct case: the morning run paid and stored nothing → the 14:30 slot calls again", async () => {
    at(SLOT2);
    slotDb({ paid: 1 });
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, date: DAY, items: 10, attempt: 2 });
    expect(h.generate).toHaveBeenCalledTimes(1);
  });

  it("a hand re-run in the slot that already paid → 200 skipped, 0 model calls, names the next slot", async () => {
    slotDb({ paid: 1 });
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      ok: false,
      date: DAY,
      skipped: "slot-call-used",
      paidCalls: 1,
      allowed: 1,
      nextSlot: "2026-10-06T09:00:00.000Z",
    });
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("three paid calls already → the 20:30 slot pays nothing more", async () => {
    at(SLOT3);
    slotDb({ paid: 3 });
    const res = await call();
    expect(await res.json()).toMatchObject({ ok: false, skipped: "slot-call-used", nextSlot: null });
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("the row count reads today's IST date", async () => {
    slotDb({ rows: 3 });
    await call();
    const [strings, ...values] = h.queryRaw.mock.calls[1] as [TemplateStringsArray, ...unknown[]];
    expect(strings.join("?")).toMatch(/SELECT COUNT\(\*\)::int AS n FROM "CurrentAffair" WHERE date = \?::date/);
    expect(values).toEqual([DAY]);
  });

  it("another run holds today's call lock → 200 call-in-flight: no count read, no model call", async () => {
    const { lock } = slotDb();
    lock.held = true;
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, date: DAY, skipped: "call-in-flight" });
    expect(h.generate).not.toHaveBeenCalled();
    expect(h.aiUsageCount).not.toHaveBeenCalled();
  });

  it("two deliveries of the same cron event at once → one model call; the second answers call-in-flight", async () => {
    slotDb();
    let answer!: (v: unknown) => void;
    h.generate.mockImplementation(() => new Promise((r) => (answer = r)));
    const first = call();
    await vi.waitFor(() => expect(h.generate).toHaveBeenCalledTimes(1));
    const second = await call(); // the first still waits for the model
    expect(await second.json()).toEqual({ ok: false, date: DAY, skipped: "call-in-flight" });
    answer({ items: goodItems(10), written: 10, inputTokens: 1000, outputTokens: 1000 });
    expect(await (await first).json()).toMatchObject({ ok: true, items: 10, attempt: 1 });
    expect(h.generate).toHaveBeenCalledTimes(1);
  });

  it("a re-run after a failed call in the same slot counts that call (its ledger row lands before the lock is freed) → no second payment", async () => {
    const { state } = slotDb();
    h.generate.mockImplementation(async () => {
      state.paid += 1; // the real writer awaits the ledger row before judging the reply
      throw new CurrentAffairsReplyError("unparseable", "Failed to parse JSON", { stopReason: "end_turn", chars: 1446 });
    });
    expect((await call()).status).toBe(500);
    expect(await (await call()).json()).toMatchObject({ ok: false, skipped: "slot-call-used", paidCalls: 1 });
    expect(h.generate).toHaveBeenCalledTimes(1);
  });

  it("a credit-shaped error → 200 with stopped: credit (nothing billed, so the next slot is free)", async () => {
    slotDb();
    h.generate.mockRejectedValue(creditError());
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false, date: DAY, stopped: "credit" });
    expect(h.generate).toHaveBeenCalledTimes(1);
  });

  it("a reply with no usable digest → 500 naming the reason and the next slot; nothing stored", async () => {
    slotDb();
    h.generate.mockRejectedValue(new CurrentAffairsReplyError("unparseable", "Failed to parse JSON", { stopReason: "end_turn", chars: 1446 }));
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({
      ok: false,
      date: DAY,
      error: "no usable digest: unparseable",
      attempt: 1,
      nextSlot: "2026-10-06T09:00:00.000Z",
    });
  });

  it("another writer stored the day while this one waited → 200 skipped, ours not mixed in", async () => {
    slotDb();
    h.generate.mockResolvedValue({ items: goodItems(10), written: 0, inputTokens: 1000, outputTokens: 1000 });
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ ok: true, date: DAY, skipped: "written-by-another-run" });
  });

  it("an API 500 after the call began → 500 with the API's error (not reported as a failed check)", async () => {
    slotDb();
    h.generate.mockRejectedValue(Object.assign(new Error("500 Internal server error"), { status: 500, error: { type: "error", error: { type: "api_error", message: "Internal server error" } } }));
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, date: DAY, error: "500 Internal server error", attempt: 1, nextSlot: "2026-10-06T09:00:00.000Z" });
  });

  it("a failed lock or row count → 500 and 0 model calls", async () => {
    slotDb();
    h.queryRaw.mockRejectedValue(new Error("connection refused"));
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, date: DAY, error: "today's check failed" });
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("a failed ledger count → 500 and 0 model calls", async () => {
    slotDb();
    h.aiUsageCount.mockRejectedValue(new Error("connection refused"));
    const res = await call();
    expect(res.status).toBe(500);
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("no transaction to be had (pool timeout) → 500 and 0 model calls", async () => {
    h.transaction.mockRejectedValue(new Error("P2024 Timed out fetching a new connection from the connection pool"));
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, date: DAY, error: "today's check failed" });
    expect(h.generate).not.toHaveBeenCalled();
  });

  it("still refuses a call without the cron secret", async () => {
    const res = await GET(new Request("https://shishya.in/api/cron/daily-current-affairs"));
    expect(res.status).toBe(401);
    expect(h.transaction).not.toHaveBeenCalled();
  });

  it("the hand seed script runs the same locked slot, not the bare generator", () => {
    const src = readFileSync("scripts/seed-current-affairs.ts", "utf8");
    expect(src).toContain("runCurrentAffairsSlot");
    expect(src).not.toMatch(/\bgenerateDailyCurrentAffairs\b/);
  });
});

describe("generateDailyCurrentAffairs: only a usable, sourced digest is stored, all at once", () => {
  /** The real writer, with the Anthropic client and prisma mocked. */
  const real = () => vi.importActual<typeof import("@/lib/current-affairs")>("@/lib/current-affairs");
  let txRowCount = 0;
  let insertCalls = 0;

  beforeEach(() => {
    txRowCount = 0;
    insertCalls = 0;
    h.txQueryRaw.mockImplementation(async (strings: TemplateStringsArray) =>
      strings.join("?").includes("pg_advisory_xact_lock") ? [{ ok: 1 }] : [{ n: txRowCount }],
    );
    h.executeRaw.mockImplementation(async () => {
      insertCalls++;
      return 1;
    });
    h.transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn({ $queryRaw: h.txQueryRaw, $executeRawUnsafe: h.executeRaw }),
    );
  });

  it("27 Sep / 3 Oct: prose instead of JSON → logged with stop_reason, length and the model's own words; nothing written", async () => {
    const { generateDailyCurrentAffairs } = await real();
    const prose = "Based on my search results, I need to inform you that I was unable to find sufficient genuinely fresh news specifically from October 3, 2026 (today).";
    h.create.mockResolvedValue(reply(prose, { out: 645 }));
    const err = vi.mocked(console.error);
    const p = generateDailyCurrentAffairs({ istDate: "2026-10-03" });
    await expect(p).rejects.toBeInstanceOf(CurrentAffairsReplyError);
    await expect(p).rejects.toMatchObject({ reason: "unparseable" });
    expect(err).toHaveBeenCalledWith(
      "[current-affairs] reply did not parse",
      JSON.stringify({ stop_reason: "end_turn", chars: prose.length, head: prose.slice(0, 300) }),
    );
    expect(h.transaction).not.toHaveBeenCalled();
    expect(insertCalls).toBe(0);
  });

  it("the ledger row of a paid call has landed before the reply is judged (a failed reply still counts as the slot's call)", async () => {
    const { generateDailyCurrentAffairs } = await real();
    let landed = false;
    h.recordAiUsageAwaited.mockImplementation(() => new Promise((r) => setTimeout(() => ((landed = true), r(0.2)), 5)));
    h.create.mockResolvedValue(reply("I could not find enough news for today.", { out: 568 }));
    const landedAtReject = await generateDailyCurrentAffairs({ istDate: DAY }).then(
      () => "resolved",
      () => landed,
    );
    expect(landedAtReject).toBe(true);
    expect(h.recordAiUsageAwaited).toHaveBeenCalledWith("current-affairs", expect.anything(), expect.objectContaining({ ref: DAY }));
    expect(h.recordAiUsage).not.toHaveBeenCalled();
  });

  it("a cut-off reply (max_tokens) → unparseable, nothing written", async () => {
    const { generateDailyCurrentAffairs } = await real();
    h.create.mockResolvedValue(reply('{"items": [ {"title": "cut', { stop: "max_tokens", out: 4000 }));
    await expect(generateDailyCurrentAffairs({ istDate: "2026-10-03" })).rejects.toMatchObject({ reason: "unparseable" });
    expect(h.transaction).not.toHaveBeenCalled();
  });

  it('6 Oct: {"items": []} → too-few-items, nothing written', async () => {
    const { generateDailyCurrentAffairs } = await real();
    h.create.mockResolvedValue(reply('{"items": []}', { out: 759 }));
    await expect(generateDailyCurrentAffairs({ istDate: DAY })).rejects.toMatchObject({ reason: "too-few-items", detail: { usable: 0, returned: 0 } });
    expect(h.transaction).not.toHaveBeenCalled();
  });

  it(`fewer than ${MIN_DIGEST_ITEMS} usable items → no thin day is stored`, async () => {
    const { generateDailyCurrentAffairs } = await real();
    const items = [...goodItems(MIN_DIGEST_ITEMS - 1), { ...goodItems(1)[0], title: "No source", source: null }];
    h.create.mockResolvedValue(reply(JSON.stringify({ items })));
    await expect(generateDailyCurrentAffairs({ istDate: DAY })).rejects.toMatchObject({
      reason: "too-few-items",
      detail: { usable: MIN_DIGEST_ITEMS - 1, returned: MIN_DIGEST_ITEMS },
    });
    expect(h.transaction).not.toHaveBeenCalled();
  });

  it("a good reply → one transaction: the per-day lock, a re-count, then every row", async () => {
    const { generateDailyCurrentAffairs } = await real();
    h.create.mockResolvedValue(reply(JSON.stringify({ items: goodItems(10) })));
    const r = await generateDailyCurrentAffairs({ istDate: DAY });
    expect(r.written).toBe(10);
    expect(r.items).toHaveLength(10);
    expect(h.transaction).toHaveBeenCalledTimes(1);
    const lockCall = h.txQueryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]];
    expect(lockCall[0].join("?")).toContain("pg_advisory_xact_lock");
    expect(lockCall.slice(1)).toEqual([`current-affairs-day:${DAY}`]);
    expect(insertCalls).toBe(10);
    const [sql, date, title, , category, tags, , source] = h.executeRaw.mock.calls[0] as unknown[];
    expect(String(sql)).toMatch(/ON CONFLICT \(date, title\) DO NOTHING/);
    expect([date, title, category, tags, source]).toEqual([DAY, "Item 1 headline", "National", ["UPSC"], "https://example.gov.in/news/1"]);
  });

  it("with the cron's locked transaction (tx) → the rows go through it; no transaction of its own", async () => {
    const { generateDailyCurrentAffairs } = await real();
    const tx = { $queryRaw: h.txQueryRaw, $executeRawUnsafe: h.executeRaw };
    h.create.mockResolvedValue(reply(JSON.stringify({ items: goodItems(10) })));
    const r = await generateDailyCurrentAffairs({ istDate: DAY, tx: tx as never });
    expect(r.written).toBe(10);
    expect(h.transaction).not.toHaveBeenCalled();
    expect((h.txQueryRaw.mock.calls[0] as unknown[]).slice(1)).toEqual([`current-affairs-day:${DAY}`]);
    expect(insertCalls).toBe(10);
  });

  it("the day was written by another run meanwhile → 0 written, no insert", async () => {
    const { generateDailyCurrentAffairs } = await real();
    txRowCount = 12;
    h.create.mockResolvedValue(reply(JSON.stringify({ items: goodItems(10) })));
    const r = await generateDailyCurrentAffairs({ istDate: DAY });
    expect(r.written).toBe(0);
    expect(insertCalls).toBe(0);
  });

  it("an insert that fails mid-day fails the whole transaction (the DB rolls every row back)", async () => {
    const { generateDailyCurrentAffairs } = await real();
    h.executeRaw.mockImplementation(async () => {
      insertCalls++;
      if (insertCalls === 3) throw new Error("connection reset");
      return 1;
    });
    h.create.mockResolvedValue(reply(JSON.stringify({ items: goodItems(10) })));
    await expect(generateDailyCurrentAffairs({ istDate: DAY })).rejects.toThrow("connection reset");
    expect(h.transaction).toHaveBeenCalledTimes(1);
  });

  it("states today's date as fact, asks for the 48 hours and JSON only, and makes no hidden second request", async () => {
    const { generateDailyCurrentAffairs } = await real();
    h.create.mockResolvedValue(reply(JSON.stringify({ items: goodItems(8) })));
    await generateDailyCurrentAffairs({ istDate: DAY });
    const [body, options] = h.create.mock.calls[0] as [
      { messages: { content: string }[]; system: { text: string }[] },
      { maxRetries: number; timeout: number },
    ];
    expect(body.messages[0].content).toContain("Today is Tuesday, 6 October 2026 in India (IST). This is the real current date.");
    expect(body.messages[0].content).toContain("news published on Monday, 5 October 2026 or Tuesday, 6 October 2026");
    expect(body.system[0].text).toMatch(/never treat them as simulated or hypothetical/);
    expect(body.system[0].text).toMatch(/your final message is the JSON object and nothing else/);
    expect(options).toEqual({ timeout: CA_MODEL_TIMEOUT_MS, maxRetries: 0 });
    expect(h.recordAiUsageAwaited).toHaveBeenCalledWith("current-affairs", expect.anything(), expect.objectContaining({ ref: DAY }));
  });
});

describe("reply helpers", () => {
  it("finalReplyText reads the text after the last search, not the preamble", () => {
    const r = reply('{"items": []}');
    expect(finalReplyText(r.content)).toBe('{"items": []}');
  });

  it("finalReplyText joins an answer split into several text blocks without adding newlines", () => {
    const content = [
      { type: "web_search_tool_result" },
      { type: "text", text: '{"items": [{"title": "A ' },
      { type: "text", text: 'B", "summary": "s"}]}' },
    ];
    expect(JSON.parse(finalReplyText(content))).toEqual({ items: [{ title: "A B", summary: "s" }] });
  });

  it("finalReplyText falls back to all the text when nothing follows the last search", () => {
    expect(finalReplyText([{ type: "text", text: "a" }, { type: "server_tool_use" }])).toBe("a");
  });

  it("usableItems needs a title, a summary and an http(s) source; dedupes titles; caps at 14", () => {
    const items = [
      ...goodItems(3),
      { ...goodItems(1)[0], title: "  item 1   HEADLINE " }, // duplicate of item 1
      { title: "No summary", summary: "", source: "https://a.in" },
      { title: "Bad source", summary: "s", source: "javascript:alert(1)" },
      { title: "Null source", summary: "s", source: null },
      ...goodItems(20).slice(3),
    ];
    const out = usableItems(items);
    expect(out).toHaveLength(14);
    expect(out.map((i) => i.title)).not.toContain("Bad source");
    expect(out.filter((i) => i.title.toLowerCase().includes("item 1 headline"))).toHaveLength(1);
    expect(usableItems("not an array")).toEqual([]);
  });
});
