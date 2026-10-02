// The nightly brief no longer builds a practice set (2 Oct 2026, resilience
// plan build 2).
//
// Why: every model-written brief also built an adaptive mock through a second
// model call. 1,629 were built since 10 May 2026; 1 was started and 0 were
// submitted, for about $0.44 a day from a credit balance that is topped up by
// hand and is sometimes zero. The build is removed. What must stay exactly as
// it was: the note itself, who gets one, and the rule brief the run falls
// back to after its first failed model call.
//
// The route is driven here with a fake database and a fake SDK: no network,
// no model call, no row written.

import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";

const h = vi.hoisted(() => ({
  sdkCreate: vi.fn(),
  mockCreate: vi.fn(),
  questionFindMany: vi.fn(),
  generateMock: vi.fn(),
  briefCreate: vi.fn(),
  briefUpdate: vi.fn(),
  chatFindMany: vi.fn(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = { create: h.sdkCreate };
  },
}));
vi.mock("@/lib/ai/usage", () => ({ recordAiUsage: vi.fn() }));
// The practice-set builder: the route must never reach it again.
vi.mock("@/lib/ai", () => ({ generateMock: h.generateMock }));

const NOW = Date.now();
const ENROLLMENTS = [
  {
    userId: "u1",
    examId: "e1",
    exam: { id: "e1", code: "SSC_CGL", shortName: "SSC CGL", name: "SSC Combined Graduate Level" },
    user: { id: "u1", _count: { attempts: 3, chatSessions: 1 } },
  },
  {
    userId: "u2",
    examId: "e1",
    exam: { id: "e1", code: "SSC_CGL", shortName: "SSC CGL", name: "SSC Combined Graduate Level" },
    user: { id: "u2", _count: { attempts: 1, chatSessions: 0 } },
  },
];

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    // The active-users read names "AnalyticsEvent"; the next-exam-day read of a rule brief gets no rows.
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) =>
      strings.join("?").includes('"AnalyticsEvent"')
        ? [
            { userId: "u1", last: new Date(NOW - 3_600_000) },
            { userId: "u2", last: new Date(NOW - 7_200_000) },
          ]
        : [],
    ),
    dailyBrief: {
      findMany: vi.fn(async () => []),
      findUnique: vi.fn(async () => null),
      create: h.briefCreate,
      update: h.briefUpdate,
    },
    enrollment: { findMany: vi.fn(async () => ENROLLMENTS) },
    weaknessMap: {
      findMany: vi.fn(async () => [
        { attemptsCount: 10, correctCount: 3, topic: { code: "quant.percentage", name: "Percentage" } },
        { attemptsCount: 8, correctCount: 6, topic: { code: "quant.ratio", name: "Ratio and Proportion" } },
      ]),
    },
    chatSession: { findMany: h.chatFindMany },
    attempt: { findMany: vi.fn(async () => [{ scorePct: 62, durationSec: 900, startedAt: new Date(NOW - 86_400_000) }]) },
    mock: { create: h.mockCreate },
    question: { findMany: h.questionFindMany },
  },
}));

import { GET } from "@/app/api/cron/daily-brief/route";
import { RULE_BRIEF_SOURCE } from "@/lib/brief-fallback";

const NOTE = "Percentage is your weakest topic at 3 of 10 right. Do one short Percentage set today, then review the misses.";
const modelReply = () => ({
  model: "claude-sonnet-4-5-20250929",
  content: [{ type: "text", text: NOTE }],
  usage: { input_tokens: 220, output_tokens: 60, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
});
/** The empty-balance reply as the SDK surfaces it. The route does not read it; any failure flips the run. */
const creditError = () =>
  Object.assign(new Error("400 Your credit balance is too low to access the Anthropic API."), {
    status: 400,
    error: { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API." } },
  });

const run = async () => {
  const res = await GET(new Request("https://shishya.in/api/cron/daily-brief", { headers: { authorization: "Bearer test-secret" } }));
  return { status: res.status, body: (await res.json()) as Record<string, unknown> };
};
type BriefRow = { userId: string; examId: string; reflection: string; mockId: string | null; inputs: { source: string; facts?: unknown; weakest: string[] } };
const created = () => h.briefCreate.mock.calls.map((c) => (c[0] as { data: BriefRow }).data);

beforeEach(() => {
  process.env.CRON_SECRET = "test-secret";
  for (const f of Object.values(h)) f.mockReset();
  h.briefCreate.mockResolvedValue({});
  h.briefUpdate.mockResolvedValue({});
  h.chatFindMany.mockResolvedValue([]);
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

describe("a model-written brief is stored with no practice set", () => {
  it("one model call per brief, the note stored as written, mockId null, and no set is built", async () => {
    h.sdkCreate.mockImplementation(async () => modelReply());
    const { status, body } = await run();
    expect(status).toBe(200);
    // one note call per (student, exam); the second call that built the set is gone
    expect(h.sdkCreate).toHaveBeenCalledTimes(2);
    expect(h.sdkCreate.mock.calls.every((c) => (c[0] as { max_tokens: number }).max_tokens === 300)).toBe(true);
    const rows = created();
    expect(rows.map((r) => r.userId).sort()).toEqual(["u1", "u2"]);
    for (const r of rows) {
      expect(r.reflection).toBe(NOTE);
      expect(r.mockId).toBeNull();
      expect(r.inputs.source).toBe("ai");
      expect(r.inputs.weakest).toEqual(["quant.percentage", "quant.ratio"]);
    }
    expect(h.mockCreate).not.toHaveBeenCalled();
    expect(h.questionFindMany).not.toHaveBeenCalled();
    expect(h.generateMock).not.toHaveBeenCalled();
    expect(body).toMatchObject({ ok: true, briefsCreated: 2, ruleBriefs: 0, aiDown: false });
    expect(body).not.toHaveProperty("mocksCreated");
  });

  it("the note prompt is the one the brief always used", async () => {
    h.sdkCreate.mockImplementation(async () => modelReply());
    await run();
    const params = h.sdkCreate.mock.calls[0][0] as { system: string; messages: Array<{ content: string }> };
    expect(params.system).toContain("You are Shishya, a free AI study companion for students in India.");
    expect(params.messages[0].content).toContain("Write a 2–3 sentence personal note from Shishya to a student preparing for SSC CGL.");
    expect(params.messages[0].content).toContain("- Percentage (3 of 10 questions right on record, 30%)");
    expect(params.messages[0].content).toContain("Recent mock scores (most recent first): 62%");
  });
});

describe("the rule brief is unchanged", () => {
  it("the first failed model call flips the run: no further call, a rule brief for everyone, still no practice set", async () => {
    h.sdkCreate.mockImplementation(async () => {
      throw creditError();
    });
    const { status, body } = await run();
    expect(status).toBe(200);
    expect(h.sdkCreate).toHaveBeenCalledTimes(1);
    const rows = created();
    expect(rows).toHaveLength(2);
    for (const r of rows) {
      expect(r.mockId).toBeNull();
      expect(r.inputs.source).toBe(RULE_BRIEF_SOURCE);
      expect(r.inputs.facts).toMatchObject({
        examShort: "SSC CGL",
        weakest: [
          { name: "Percentage", attemptsCount: 10, correctCount: 3 },
          { name: "Ratio and Proportion", attemptsCount: 8, correctCount: 6 },
        ],
        lastScorePct: 62,
        nextExam: null,
      });
      // built from stored facts: it names the weakest topic and none of the provider's words
      expect(r.reflection).toContain("Percentage");
      expect(r.reflection).not.toMatch(/credit|billing|Anthropic/i);
    }
    // tutor chats feed only the model prompt: not read again once the model is down
    expect(h.chatFindMany).toHaveBeenCalledTimes(1);
    expect(h.mockCreate).not.toHaveBeenCalled();
    expect(h.generateMock).not.toHaveBeenCalled();
    expect(body).toMatchObject({ ok: true, briefsCreated: 2, ruleBriefs: 2, aiDown: true });
  });

  it("a reply too short to be a note gets the rule brief for that student only", async () => {
    h.sdkCreate.mockImplementationOnce(async () => ({ ...modelReply(), content: [{ type: "text", text: "Keep going." }] })).mockImplementation(async () => modelReply());
    const { body } = await run();
    expect(h.sdkCreate).toHaveBeenCalledTimes(2);
    expect(created().map((r) => r.inputs.source).sort()).toEqual(["ai", RULE_BRIEF_SOURCE].sort());
    expect(body).toMatchObject({ briefsCreated: 2, ruleBriefs: 1, aiDown: false });
  });
});

describe("the route", () => {
  const src = fs.readFileSync(path.resolve(__dirname, "..", "..", "src/app/api/cron/daily-brief/route.ts"), "utf8").replace(/\r\n/g, "\n");
  const code = src
    .split("\n")
    .filter((l) => !l.trim().startsWith("//"))
    .join("\n");

  it("has no practice-set code left", () => {
    for (const gone of ["generateMock", "prisma.mock.create", "fetchAdaptivePool", "mocksCreated", "getStudentState", "getSyllabusContext", "cron:daily-brief"]) {
      expect(code, gone).not.toContain(gone);
    }
    expect(code).not.toMatch(/from "@\/lib\/ai"/);
  });

  it("still refuses a call without the cron secret", async () => {
    const res = await GET(new Request("https://shishya.in/api/cron/daily-brief"));
    expect(res.status).toBe(401);
    expect(h.sdkCreate).not.toHaveBeenCalled();
  });

  it("says why, with the date", () => {
    expect(src).toMatch(/No brief mock \(2 Oct 2026\)/);
  });
});
