// The late-answer run's DB steps (1 Oct 2026 review) — src/lib/db/tutor-late-answer.ts
// against a stubbed Prisma and a stubbed tutorStream. What it pins:
//   • answer() builds the history the chat would have had: the conversation's
//     30 rows AT OR BEFORE the question, oldest first, the question itself
//     left out (it is the turn's message), a leading reply trimmed; the
//     tutor gets the question as the message and books the run's feature;
//   • answer() prices the very request tutorStream will send and does not ask
//     when its worst case does not fit in what is left of the run;
//   • a row from before replyLang was recorded is answered in the script it
//     is written in (a Devanagari question on an EN account → Hindi);
//   • a declared 13-17 account's general chat is never answered (the route
//     gives such an account the school tutor only);
//   • release() gives a try back only when told to (an outage, never asked),
//     spends all tries when final, and only ever touches its own claim — and
//     never writes sentAt;
//   • loadRows() (2 Oct 2026): the SQL window — 72 hours from sentAt or
//     createdAt, floored at 7 days on createdAt — keeps exactly the rows the
//     pure rule (lateWindowOpen) keeps; pendingMail()'s scan floor is the
//     same 7 days.
// No DB, no model. Run: npx vitest run tests/unit/tutor-late-answer-db.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  log: [] as Array<{ model: string; op: string; args: any }>,
  raw: [] as Array<{ sql: string; values: unknown[] }>,
  queries: [] as Array<{ sql: string; values: unknown[] }>,
  session: { id: "s1", userId: "u1", exam: null } as any,
  user: { preferredLang: "EN", onbStage: null, onbPrepCodes: [] } as any,
  messages: [] as any[],
  tutorInputs: [] as any[],
}));

vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    chatSession: {
      findUnique: async (args: any) => {
        state.log.push({ model: "chatSession", op: "findUnique", args });
        return state.session;
      },
    },
    user: {
      findUnique: async (args: any) => {
        state.log.push({ model: "user", op: "findUnique", args });
        return state.user;
      },
    },
    chatMessage: {
      // Prisma's semantics the step relies on: where.sessionId + createdAt.lte, orderBy createdAt desc, take.
      findMany: async (args: any) => {
        state.log.push({ model: "chatMessage", op: "findMany", args });
        let rows = state.messages.filter((m) => m.sessionId === args.where.sessionId);
        if (args.where.createdAt?.lte) rows = rows.filter((m) => m.createdAt <= args.where.createdAt.lte);
        rows = [...rows].sort((a, b) => b.createdAt - a.createdAt);
        return rows.slice(0, args.take);
      },
    },
    $executeRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      state.raw.push({ sql: strings.join("?"), values });
      return 1;
    },
    // The reads (loadRows, pendingMail): the statement and its bound values are kept; no row comes back.
    $queryRaw: async (strings: TemplateStringsArray, ...values: unknown[]) => {
      state.queries.push({ sql: strings.join("?"), values });
      return [];
    },
  },
}));
vi.mock("@/lib/ai", () => ({
  tutorStream: async function* (input: any) {
    state.tutorInputs.push(input);
    yield { delta: "Here is the answer." };
    yield { done: { reply: "Here is the answer.", suggestedActions: [] } };
  },
}));
vi.mock("@/lib/tutor-turn", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/tutor-turn")>();
  return {
    ...orig,
    loadTutorTurnContext: async (s: any) => ({
      studentState: { userId: s.userId, examCode: "", examName: "", preferredLang: s.preferredLang ?? "EN", enrolledAt: "2026-09-01T00:00:00.000Z", weaknesses: [], strengths: [], totalMocksTaken: 0 },
      syllabus: null,
      journey: null,
      band: null,
      topicFocus: null,
      schoolFocus: null,
    }),
  };
});
vi.mock("@/lib/email", () => ({ sendTutorAnsweredEmail: async () => true }));
vi.mock("@/lib/db/tutor-answer-email", () => ({
  answeredEmailTargets: async () => [],
  reserveAnsweredEmail: async () => null,
  unreserveAnsweredEmail: async () => {},
}));
vi.mock("@/lib/school/tutor-context", () => ({ getSchoolTutorContext: async () => null }));

import { CONTEXT_TURNS, historyAtQuestion, lateAnswerDeps, pendingMail, release } from "@/lib/db/tutor-late-answer";
import {
  LATE_HARD_STOP_MS,
  LATE_MAIL_PENDING_MS,
  LATE_MAX_TRIES,
  LATE_USAGE_FEATURE,
  LATE_WINDOW_MS,
  lateWindowOpen,
  type LateCandidateRow,
} from "@/lib/tutor-late-answer";
import { langToReplyLanguage } from "@/lib/preferred-lang";

const T0 = new Date("2026-10-01T06:00:00Z").getTime();
const at = (min: number) => new Date(T0 - min * 60_000);
const msg = (id: string, role: "USER" | "ASSISTANT", content: string, min: number, sessionId = "s1") => ({ id, sessionId, role, content, createdAt: at(min) });

function row(over: Partial<LateCandidateRow> = {}): LateCandidateRow {
  return {
    id: "q",
    sessionId: "s1",
    userId: "u1",
    content: "Why is 1 not a prime number?",
    createdAt: at(30),
    metadata: { turnId: "t1", failedReason: "credit", latePromised: true, replyLang: "EN" },
    laterAssistant: false,
    reAsked: false,
    examCode: null,
    examCategory: null,
    ...over,
  };
}

beforeEach(() => {
  state.log = [];
  state.raw = [];
  state.queries = [];
  state.session = { id: "s1", userId: "u1", exam: null };
  state.user = { preferredLang: "EN", onbStage: null, onbPrepCodes: [] };
  state.messages = [];
  state.tutorInputs = [];
});

describe("answer() — the chat's pipeline, as the conversation stood when the question was asked", () => {
  it("history: the 30 rows at or before the question, oldest first, the question itself left out", async () => {
    state.messages = [
      // 35 earlier rows (a long conversation), then the question, then a later row that must not be read.
      ...Array.from({ length: 35 }, (_, i) => msg(`m${i}`, i % 2 ? "ASSISTANT" : "USER", `row ${i}`, 100 - i)),
      msg("q", "USER", "Why is 1 not a prime number?", 30),
      msg("later", "USER", "Hello?", 10),
    ];
    const out = await lateAnswerDeps().answer(row(), 1);
    expect(out).toMatchObject({ ok: true, text: "Here is the answer." });
    const read = state.log.find((c) => c.model === "chatMessage")!;
    expect(read.args).toEqual({
      where: { sessionId: "s1", createdAt: { lte: at(30) } },
      orderBy: { createdAt: "desc" },
      take: CONTEXT_TURNS,
      select: { id: true, role: true, content: true },
    });
    expect(CONTEXT_TURNS).toBe(30);
    const input = state.tutorInputs[0];
    // 30 rows read = the question + the 29 before it (m6..m34); m6 is USER.
    expect(input.history).toHaveLength(29);
    expect(input.history[0]).toEqual({ role: "user", content: "row 6" });
    expect(input.history[28]).toEqual({ role: "user", content: "row 34" });
    expect(input.history.some((t: any) => t.content === "Why is 1 not a prime number?" || t.content === "Hello?")).toBe(false);
    // 1 Oct 2026: the model is told when the question was asked; the question follows unchanged.
    expect(input.userMessage.startsWith("[Context from Shishya, not written by the student: this question was asked on ")).toBe(true);
    expect(input.userMessage.endsWith("\n\nWhy is 1 not a prime number?")).toBe(true);
    expect(input.generalMode).toBe(true);
    expect(input.ctx).toBeUndefined();
    expect(input.usage.feature).toBe(LATE_USAGE_FEATURE);
    expect(input.language).toBe("EN");
  });

  it("a window that opens on a reply is trimmed to start on the student's turn", async () => {
    state.messages = [msg("a0", "ASSISTANT", "earlier reply", 40), msg("u1", "USER", "first", 35), msg("q", "USER", "Why is 1 not a prime number?", 30)];
    const h = await historyAtQuestion("s1", { id: "q", createdAt: at(30) });
    expect(h).toEqual([{ role: "user", content: "first" }]);
  });

  it("not asked when its worst case does not fit in what is left of the run", async () => {
    state.messages = [msg("q", "USER", "Why is 1 not a prime number?", 30)];
    const out = await lateAnswerDeps().answer(row(), 0.01);
    expect(out).toMatchObject({ ok: false, overBudget: true, costUsd: 0 });
    expect((out as any).worstUsd).toBeGreaterThan(0.01);
    expect(state.tutorInputs).toHaveLength(0);
  });

  it("an old row with no recorded language: a Devanagari question on an EN account is answered in Hindi", async () => {
    const q = "भारत की राजधानी क्या है?";
    state.messages = [msg("q", "USER", q, 30)];
    await lateAnswerDeps().answer(row({ content: q, metadata: { turnId: "t1", failedAt: 1 } }), 1);
    expect(state.tutorInputs[0].language).toBe(langToReplyLanguage("hi"));
    // …and an English one stays on the account's language.
    state.tutorInputs = [];
    await lateAnswerDeps().answer(row({ metadata: { turnId: "t1", failedAt: 1 } }), 1);
    expect(state.tutorInputs[0].language).toBe("EN");
  });

  it("a declared 13-17 account's general chat is never answered (final), and nothing is asked", async () => {
    state.user = { preferredLang: "EN", onbStage: "CLASS_9_10", onbPrepCodes: ["NCERT_C09"] };
    const out = await lateAnswerDeps().answer(row(), 1);
    expect(out).toMatchObject({ ok: false, reason: "other", final: true, note: "school-only" });
    expect(state.tutorInputs).toHaveLength(0);
    // Someone else's conversation: final too.
    state.user = { preferredLang: "EN", onbStage: null, onbPrepCodes: [] };
    state.session = { id: "s1", userId: "u2", exam: null };
    expect(await lateAnswerDeps().answer(row(), 1)).toMatchObject({ ok: false, final: true, note: "session" });
  });
});

describe("release() — back to failed; the try given back only when told", () => {
  const flat = (s: string) => s.replace(/\s+/g, " ");

  it("an outage (refundTry): the claim's try is given back, never below 0; only its own claim is touched", async () => {
    await release(row(), 1234, { reason: "overloaded", final: false, refundTry: true }, 5678);
    const { sql, values } = state.raw[0];
    expect(flat(sql)).toContain(
      `SET metadata = (COALESCE(metadata, '{}'::jsonb) - 'answeringAt' - 'lateClaimAt') || ?::jsonb || jsonb_build_object('lateTries', GREATEST(COALESCE((metadata->>'lateTries')::int, 1) - 1, 0)) WHERE id = ? AND (metadata->>'lateClaimAt')::bigint = ?::bigint`,
    );
    expect(JSON.parse(values[0] as string)).toEqual({ failedAt: 5678, lateFailedReason: "overloaded" });
    expect(values.slice(1)).toEqual(["q", "1234"]);
  });

  it("never asked (over budget): no reason recorded, the try given back", async () => {
    await release(row(), 1234, { reason: null, final: false, refundTry: true }, 5678);
    expect(flat(state.raw[0].sql)).toContain("GREATEST(");
    expect(JSON.parse(state.raw[0].values[0] as string)).toEqual({ failedAt: 5678 });
  });

  it("a question-specific failure keeps its try; a final one spends them all (a refund never undoes final)", async () => {
    await release(row(), 1234, { reason: "other", final: false, refundTry: false }, 5678);
    expect(flat(state.raw[0].sql)).not.toContain("GREATEST(");
    expect(JSON.parse(state.raw[0].values[0] as string)).toEqual({ failedAt: 5678, lateFailedReason: "other" });
    await release(row(), 1234, { reason: "other", final: true, refundTry: true }, 5678);
    expect(flat(state.raw[1].sql)).not.toContain("GREATEST(");
    expect(JSON.parse(state.raw[1].values[0] as string)).toEqual({ failedAt: 5678, lateFailedReason: "other", lateTries: LATE_MAX_TRIES });
  });

  it("never writes sentAt, whatever the row carries (2 Oct 2026: the window must not slide with the run's own bookkeeping)", async () => {
    const sent = { metadata: { turnId: "t1", failedReason: "credit", latePromised: true, sentAt: 1111 } };
    await release(row(sent), 1234, { reason: "credit", final: false, refundTry: true }, 5678);
    await release(row(sent), 1234, { reason: "other", final: true, refundTry: false }, 5678);
    for (const w of state.raw) {
      expect(w.sql).not.toContain("sentAt");
      expect(String(w.values[0])).not.toContain("sentAt");
    }
  });
});

// 2 Oct 2026. The window was 72 hours from createdAt, and a re-send keeps the
// row's first date: a question first asked 26 Sep and re-sent 1 Oct was
// promised an answer and never picked. Now: 72 hours from metadata.sentAt
// (createdAt when there is none), and never past 7 days after createdAt.
describe("loadRows() — the window in SQL is the pure rule's window", () => {
  const flat = (s: string) => s.replace(/\s+/g, " ");
  const HOUR = 3600_000;
  const DAY = 24 * HOUR;

  it("the statement: floored at 7 days on createdAt; 72 hours counted from sentAt (a JSON number only) or createdAt", async () => {
    const sinceMs = T0 - LATE_WINDOW_MS;
    expect(await lateAnswerDeps().loadRows(sinceMs, T0)).toEqual([]);
    expect(state.queries).toHaveLength(1);
    const { sql, values } = state.queries[0];
    expect(flat(sql)).toContain(
      `WHERE m.role = 'USER' AND m."createdAt" >= ? AND m."createdAt" <= ? AND ( m."createdAt" >= ? OR CASE WHEN jsonb_typeof(m.metadata->'sentAt') = 'number' THEN (m.metadata->>'sentAt')::numeric >= ?::numeric ELSE FALSE END ) AND (m.metadata->>'failedAt' IS NOT NULL OR m.metadata->>'lateClaimAt' IS NOT NULL)`,
    );
    expect(values.slice(0, 4)).toEqual([new Date(T0 - LATE_HARD_STOP_MS), new Date(T0), new Date(sinceMs), String(sinceMs)]);
    // The statement reads sentAt and writes nothing.
    expect(sql).not.toMatch(/\bUPDATE\b|\bINSERT\b|\bDELETE\b/);
  });

  it("the SQL floor and the pure rule agree, row by row, at every edge", async () => {
    const sinceMs = T0 - LATE_WINDOW_MS;
    await lateAnswerDeps().loadRows(sinceMs, T0);
    const [hardFloor, upTo, since, sinceText] = state.queries[0].values as [Date, Date, Date, string];
    // The statement's window, with the values it was bound with. jsonb_typeof = 'number' is "a JSON number".
    const sqlKeeps = (createdAt: Date, metadata: Record<string, unknown>) => {
      const stored = createdAt.getTime();
      const sent = metadata.sentAt;
      const sentInWindow = typeof sent === "number" ? sent >= Number(sinceText) : false;
      return stored >= hardFloor.getTime() && stored <= upTo.getTime() && (stored >= since.getTime() || sentInWindow);
    };
    const storedAgo = [0, HOUR, LATE_WINDOW_MS - 1, LATE_WINDOW_MS, LATE_WINDOW_MS + 1, 4 * DAY, 5 * DAY, LATE_HARD_STOP_MS - 1, LATE_HARD_STOP_MS, LATE_HARD_STOP_MS + 1, 8 * DAY, -60_000];
    const sentAts: unknown[] = [
      undefined,
      "1790000000000",
      null,
      T0 - HOUR,
      T0 - LATE_WINDOW_MS,
      T0 - LATE_WINDOW_MS - 1,
      T0 - LATE_WINDOW_MS + 0.5,
      T0 - 30 * DAY,
      T0 + HOUR,
    ];
    let open = 0;
    let shut = 0;
    for (const ago of storedAgo) {
      for (const sentAt of sentAts) {
        const createdAt = new Date(T0 - ago);
        const metadata = { failedAt: 1, ...(sentAt === undefined ? {} : { sentAt }) };
        const pure = lateWindowOpen({ createdAt, metadata }, T0);
        expect(sqlKeeps(createdAt, metadata), `stored ${ago} ms ago, sentAt ${String(sentAt)}`).toBe(pure);
        if (pure) open++;
        else shut++;
      }
    }
    // Both outcomes were exercised, not one side only.
    expect(open).toBeGreaterThan(20);
    expect(shut).toBeGreaterThan(20);
    // The cases the change is about.
    expect(lateWindowOpen({ createdAt: new Date(T0 - 5 * DAY), metadata: { sentAt: T0 - HOUR } }, T0)).toBe(true);
    expect(lateWindowOpen({ createdAt: new Date(T0 - 5 * DAY), metadata: {} }, T0)).toBe(false);
    expect(lateWindowOpen({ createdAt: new Date(T0 - 8 * DAY), metadata: { sentAt: T0 - HOUR } }, T0)).toBe(false);
  });

  it("pendingMail(): the scan floor is the 7-day hard stop, so a question answered 6 days after it was first stored is still told", async () => {
    const sinceMs = T0 - LATE_MAIL_PENDING_MS;
    expect(await pendingMail(sinceMs, null)).toEqual([]);
    const { sql, values } = state.queries[0];
    expect(flat(sql)).toContain(`WHERE m.role = 'USER' AND m."createdAt" >= ? AND m.metadata->>'lateAnsweredAt' IS NOT NULL`);
    expect(values[0]).toEqual(new Date(sinceMs - LATE_HARD_STOP_MS));
    expect(values[1]).toBe(String(sinceMs));
  });
});
