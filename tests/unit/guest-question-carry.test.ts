// A guest's unanswered tutor question → the account it signs up to
// (7 Oct 2026, B6 — src/lib/guest-question-carry.ts, src/lib/tutor-unavailable.ts,
// src/app/api/chat/carry-question/route.ts, src/app/chat/GuestQuestionDoor.tsx,
// src/components/WelcomeStrip.tsx).
// What it pins:
//   • the door: a guest's AI-unavailable failure the browser kept shows it;
//     a school chat, the under-13 line, a kids' exam chat, a member, a
//     question the browser could not keep and a reply that had started never do;
//   • the kept question: 30 minutes, its own scope, never over a seed;
//   • the server takes nothing on the client's word: only a FAILED guest turn of
//     this browser (no reply), same scope, in the last 6 hours, not answered by a
//     later guest turn; the row it stores is the failed member question the
//     late-answer run picks, and a Retry from the chat reuses that very row;
//   • counted like the other doors: "signin-door" shown + "signin-click" under
//     the door id "chat-unanswered", the save card's words in the tooltip.
// No network, no DB. Run: npx vitest run tests/unit/guest-question-carry.test.ts

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  logs: [] as Array<{ id: string; userMessage: string; reply: string | null; createdAt: Date }>,
  taken: [] as Array<{ id: string; sessionId: string; content: string; turnId: string | null }>,
  recent: 0,
  exam: { id: "e1", active: true } as null | { id: string; active: boolean },
  profile: { onbStage: "WORKING", onbPrepCodes: ["SSC_CGL"] } as null | { onbStage: string | null; onbPrepCodes: string[] },
  importSession: null as null | Record<string, unknown>,
  cookies: {} as Record<string, string>,
  created: [] as Array<{ model: string; data: Record<string, unknown> }>,
  updated: [] as Array<{ model: string; data: Record<string, unknown> }>,
  logQuery: null as null | Record<string, unknown>,
}));

vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: (k: string) => (k in state.cookies ? { value: state.cookies[k] } : undefined), set: () => {} }),
}));
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: async () => ({ ok: true, limit: 30, remaining: 29, reset: 0 }),
  rateLimited: () => new Response("rate limited", { status: 429 }),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { findUnique: async () => state.profile },
    exam: { findUnique: async () => state.exam },
    anonTutorLog: {
      findMany: async (q: Record<string, unknown>) => {
        state.logQuery = q;
        return state.logs;
      },
    },
    chatSession: {
      findUnique: async () => state.importSession,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.created.push({ model: "chatSession", data });
        return data;
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        state.updated.push({ model: "chatSession", data });
        return data;
      },
    },
    chatMessage: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        state.created.push({ model: "chatMessage", data });
        return data;
      },
    },
    $queryRaw: async (strings: TemplateStringsArray) => {
      const sql = strings.join("?");
      if (/COUNT\(\*\)/.test(sql)) return [{ n: state.recent }];
      return state.taken;
    },
    $transaction: async (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}));

import {
  CARRY_LOG_WINDOW_MS,
  CARRY_SESSION_SOURCE,
  GUEST_QUESTION_CARRY_TTL_MS,
  appendTarget,
  carriedQuestionHref,
  carriedQuestionMeta,
  guestQuestionDoor,
  parseQuestionCarry,
  pickFailedGuestTurn,
  questionCarryDecision,
} from "@/lib/guest-question-carry";
import { GUEST_CHAT_TTL_MS } from "@/lib/guest-chat-carry";
import {
  GUEST_QUESTION_CARRIED_NOTE,
  GUEST_QUESTION_DOOR_REASON,
  GUEST_UNANSWERED_TTL_MS,
  TUTOR_UNAVAILABLE_CODE,
  guestQuestionCarriedNote,
  guestQuestionDoorReason,
} from "@/lib/tutor-unavailable";
import { CHAT_QUESTION_DOOR, SIGNIN_SURFACES, chatQuestionDoorAllowed, isSigninSurface } from "@/lib/signin-cta";
import { inDirectSigninTest } from "@/lib/direct-signin-ab";
import { signUpPlaceFor } from "@/lib/signup-place";
import { chatResumeHref } from "@/lib/recent-chats";
import { lateAnswerPromised, lateCandidateVerdict, lateTurnMeta } from "@/lib/tutor-late-answer";
import { decideTurn } from "@/lib/chat-turn-dedupe";
import { POST } from "@/app/api/chat/carry-question/route";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

const NOW = Date.UTC(2026, 9, 7, 6, 0, 0);
const door = (over: Partial<Parameters<typeof guestQuestionDoor>[0]> = {}) =>
  guestQuestionDoor({
    code: TUTOR_UNAVAILABLE_CODE.guest,
    carriable: true,
    kept: true,
    streamed: false,
    guest: true,
    school: false,
    under13: false,
    examCode: "SSC_CGL",
    ...over,
  });

// ── 1. the door ─────────────────────────────────────────────────────────

describe("the door under a guest's 'AI tutor unavailable' notice", () => {
  it("opens for a guest whose question failed because the AI was unavailable and this browser kept it", () => {
    expect(door()).toBe(true);
    // The general chat too.
    expect(door({ examCode: null })).toBe(true);
  });

  it("never for a school chat, after the under-13 line, or on a kids' exam / class container chat", () => {
    expect(door({ school: true })).toBe(false);
    expect(door({ under13: true })).toBe(false);
    for (const code of ["SOF_IMO", "SZF_IOM", "NSTSE", "JNVST", "NCERT_C09", "NCERT_C06"]) expect(door({ examCode: code }), code).toBe(false);
    expect(chatQuestionDoorAllowed(null)).toBe(true);
    expect(chatQuestionDoorAllowed("SSC_CGL")).toBe(true);
    expect(chatQuestionDoorAllowed("NCERT_C05")).toBe(false);
  });

  it("never when nothing can be carried: not kept by the browser, a reply had started, a member, another failure", () => {
    expect(door({ kept: false })).toBe(false);
    // Review: the route did not say carry (no shishya_anon cookie yet — its log row could never be verified).
    expect(door({ carriable: false })).toBe(false);
    expect(door({ streamed: true })).toBe(false);
    expect(door({ guest: false })).toBe(false);
    expect(door({ code: TUTOR_UNAVAILABLE_CODE.member })).toBe(false);
    expect(door({ code: TUTOR_UNAVAILABLE_CODE.memberEmail })).toBe(false);
    expect(door({ code: "still-answering" })).toBe(false);
    expect(door({ code: undefined })).toBe(false);
  });

  it("the reason line promises what the carry does — an answer here — and no email; en exact, hi / te present", () => {
    expect(GUEST_QUESTION_DOOR_REASON.en).toBe("Sign up free and we'll answer this question here as soon as the tutor is back.");
    expect(guestQuestionDoorReason("hi")).toBe(GUEST_QUESTION_DOOR_REASON.hi);
    expect(guestQuestionDoorReason("ta")).toBe(GUEST_QUESTION_DOOR_REASON.en);
    for (const l of ["en", "hi", "te"] as const) {
      for (const line of [GUEST_QUESTION_DOOR_REASON[l], GUEST_QUESTION_CARRIED_NOTE[l]]) {
        expect(line.length, l).toBeGreaterThan(30);
        expect(line, l).not.toMatch(/e-?mail|ईमेल|ఈమెయిల్|sign in/i);
      }
    }
    expect(guestQuestionCarriedNote("te")).toBe(GUEST_QUESTION_CARRIED_NOTE.te);
    expect(GUEST_QUESTION_CARRIED_NOTE.en).toContain("press Retry");
    // The Retry button's own word in each language (ChatInterface TURN_COPY.retry).
    expect(GUEST_QUESTION_CARRIED_NOTE.hi).toContain("फिर से भेजें");
    expect(GUEST_QUESTION_CARRIED_NOTE.te).toContain("మళ్లీ పంపండి");
  });

  it("is counted like the other doors: its own id, shown + click beacons, the save card's words, /login kept", () => {
    expect(CHAT_QUESTION_DOOR).toBe("chat-unanswered");
    expect(isSigninSurface(CHAT_QUESTION_DOOR)).toBe(true);
    expect(SIGNIN_SURFACES[SIGNIN_SURFACES.length - 1]).toBe("link");
    expect(inDirectSigninTest(CHAT_QUESTION_DOOR)).toBe(false);
    // The tooltip / caption: the save card's entry, by exam and practice, back on /chat only.
    const EXAM = { exam: "SSC CGL", examCode: "SSC_CGL" };
    expect(signUpPlaceFor({ surface: "chat-unanswered", callback: "/chat?examCode=SSC_CGL", ...EXAM, practice: "canServe" }).key).toBe("door.chat-save.exam.practice");
    expect(signUpPlaceFor({ surface: "chat-unanswered", callback: "/chat?examCode=SSC_CGL", ...EXAM }).key).toBe("door.chat-save.exam");
    expect(signUpPlaceFor({ surface: "chat-unanswered", callback: "/chat?general=1" }).key).toBe("door.chat-save.general");
    expect(signUpPlaceFor({ surface: "chat-unanswered", callback: "/dashboard" }).key).toBe("family.fallback");
    expect(signUpPlaceFor({ surface: "login", from: "chat-unanswered", callback: "/chat?general=1" }).key).toBe("door.chat-save.general");

    const src = read("src/app/chat/GuestQuestionDoor.tsx");
    // Review, 8 Oct 2026: its shown row is an impression (not a press, as a 401 door's), flagged like the first-answer card's.
    expect(src).toContain("signinDoorShownBeacon(CHAT_QUESTION_DOOR, { examCode, impression: true });");
    expect(src).toMatch(/<SignUpButton\s+href=\{href\}\s+surface="chat-unanswered"/);
    expect(src).toContain("beaconProps={{ examCode }}");
    // The reason line is the button's own visible line (explain="own", data-su-reason): no second caption under it.
    expect(src).toContain('<p data-su-reason className="text-center text-sm font-semibold text-ink-900">{guestQuestionDoorReason(locale)}</p>');
    expect(src).toContain('explain="own"');
    expect(src).toContain("{nudgeBarCopy(locale).privacy}");
    expect(src).toContain('side="top"');
  });
});

// ── 2. the kept question ────────────────────────────────────────────────

describe("the question kept for the sign-up", () => {
  const rec = (over: Record<string, unknown> = {}) =>
    JSON.stringify({ v: 1, text: "  What is the GST rate on gold?  ", examCode: "SSC_CGL", topicCode: "ssc.ga.economy", savedAt: NOW - 60_000, ...over });

  it("keeps 30 minutes (the guest chat carry's TTL), trims, and drops a malformed scope or topic", () => {
    expect(GUEST_QUESTION_CARRY_TTL_MS).toBe(GUEST_CHAT_TTL_MS);
    expect(parseQuestionCarry(rec(), NOW)).toEqual({ v: 1, text: "What is the GST rate on gold?", examCode: "SSC_CGL", topicCode: "ssc.ga.economy", savedAt: NOW - 60_000 });
    expect(parseQuestionCarry(rec({ savedAt: NOW - GUEST_QUESTION_CARRY_TTL_MS - 1 }), NOW)).toBe("expired");
    expect(parseQuestionCarry(rec({ examCode: "x y", topicCode: "<script>" }), NOW)).toMatchObject({ examCode: null, topicCode: null });
    for (const bad of [null, "", "{", JSON.stringify({ v: 2 }), rec({ text: "  " })]) expect(parseQuestionCarry(bad as never, NOW)).toBeNull();
  });

  it("signed in: posted on its own chat's page (or any non-chat page), never over a seed, dropped when expired", () => {
    const kept = parseQuestionCarry(rec(), NOW) as Exclude<ReturnType<typeof parseQuestionCarry>, "expired" | null>;
    expect(questionCarryDecision(kept, { childPath: false, chatScope: { examCode: "SSC_CGL", seeded: false } })).toBe("post");
    expect(questionCarryDecision(kept, { childPath: false, chatScope: null })).toBe("post");
    expect(questionCarryDecision(kept, { childPath: false, chatScope: { examCode: null, seeded: false } })).toBe("none");
    expect(questionCarryDecision(kept, { childPath: false, chatScope: { examCode: "SSC_CGL", seeded: true } })).toBe("none");
    expect(questionCarryDecision(kept, { childPath: true, chatScope: null })).toBe("none");
    expect(questionCarryDecision("expired", { childPath: false })).toBe("drop");
    expect(questionCarryDecision(null, { childPath: false })).toBe("none");
  });

  it("opens the saved conversation where the chat's own 'reopen' links do", () => {
    for (const [code, sid] of [["SSC_CGL", "abc12345"], [null, "def67890"]] as const) {
      expect(carriedQuestionHref(code, sid)).toBe(chatResumeHref({ examCode: code, sessionId: sid }));
    }
  });
});

// ── 3. the server's check and the row it stores ─────────────────────────

const log = (id: string, minsAgo: number, reply: string | null, userMessage = "What is the GST rate on gold?") => ({
  id,
  userMessage,
  reply,
  createdAt: new Date(NOW - minsAgo * 60_000),
});

describe("pickFailedGuestTurn — only a failed guest turn of this browser", () => {
  it("the newest failed turn of the same text, within 6 hours", () => {
    expect(CARRY_LOG_WINDOW_MS).toBe(GUEST_UNANSWERED_TTL_MS);
    const logs = [log("a", 50, null), log("b", 40, "partial answer"), log("c", 30, null), log("d", 20, null, "another question")];
    expect(pickFailedGuestTurn(logs, "What is the GST rate on gold?  ", NOW)?.id).toBe("c");
    expect(pickFailedGuestTurn([log("a", 6 * 60 + 1, null)], "What is the GST rate on gold?", NOW)).toBeNull();
    expect(pickFailedGuestTurn([log("a", -5, null)], "What is the GST rate on gold?", NOW)).toBeNull();
  });

  it("not a turn that got a reply, nor one answered by a later guest turn, nor another text", () => {
    expect(pickFailedGuestTurn([log("a", 30, "The rate is 3%.")], "What is the GST rate on gold?", NOW)).toBeNull();
    expect(pickFailedGuestTurn([log("a", 30, null), log("b", 10, "The rate is 3%.")], "What is the GST rate on gold?", NOW)).toBeNull();
    expect(pickFailedGuestTurn([log("a", 30, null)], "Something I never asked", NOW)).toBeNull();
    expect(pickFailedGuestTurn([log("a", 30, null)], "   ", NOW)).toBeNull();
  });

  it("appends only into this account's own guest chat of the same scope, imported just now, older than the question", () => {
    const asked = new Date(NOW - 10 * 60_000);
    const s = { userId: "u1", examId: "e1", contextSnapshot: { source: "guest-import", firstLogId: "l0" }, lastMessageAt: new Date(NOW - 20 * 60_000) };
    expect(appendTarget(s, { userId: "u1", examId: "e1", askedAt: asked })).toBe(true);
    expect(appendTarget({ ...s, userId: "u2" }, { userId: "u1", examId: "e1", askedAt: asked })).toBe(false);
    expect(appendTarget({ ...s, examId: null }, { userId: "u1", examId: "e1", askedAt: asked })).toBe(false);
    expect(appendTarget({ ...s, contextSnapshot: null }, { userId: "u1", examId: "e1", askedAt: asked })).toBe(false);
    expect(appendTarget({ ...s, contextSnapshot: { source: "guest-import", kind: "question" } }, { userId: "u1", examId: "e1", askedAt: asked })).toBe(false);
    expect(appendTarget({ ...s, lastMessageAt: new Date(NOW - 5 * 60_000) }, { userId: "u1", examId: "e1", askedAt: asked })).toBe(false);
    expect(appendTarget(null, { userId: "u1", examId: "e1", askedAt: asked })).toBe(false);
  });

  it("the stored row is a failed, promised member question the late-answer run picks, and a Retry reuses it", () => {
    const askedAt = new Date(NOW - 30 * 60_000);
    const meta = carriedQuestionMeta({ turnId: "carry-1", nowMs: NOW, askedAt, replyLang: "HI", topicCode: "ssc.ga.economy", logId: "l1" });
    expect(meta).toMatchObject({ turnId: "carry-1", failedAt: NOW, sentAt: askedAt.getTime(), latePromised: true, emailPromised: false, replyLang: "HI", topicCode: "ssc.ga.economy", guestLogId: "l1", carriedAt: NOW });
    expect(carriedQuestionMeta({ turnId: "t", nowMs: NOW, askedAt, replyLang: "hindi!", topicCode: "a b", logId: "l1" })).not.toHaveProperty("replyLang");
    expect(lateTurnMeta(meta)).toMatchObject({ failedAt: NOW, sentAt: askedAt.getTime(), latePromised: true, replyLang: "HI", topicCode: "ssc.ga.economy" });
    expect(lateAnswerPromised(meta)).toBe(true);
    const row = { id: "m1", sessionId: "s1", userId: "u1", content: "What is the GST rate on gold?", createdAt: askedAt, metadata: meta, laterAssistant: false, examCode: "SSC_CGL", examCategory: "SSC" };
    expect(lateCandidateVerdict(row, NOW + 15 * 60_000)).toBeNull();
    // The 72 hours run from when the guest asked.
    expect(lateCandidateVerdict(row, askedAt.getTime() + 73 * 3600_000)).toBe("outside-window");
    // The chat's Retry: the same text and the row's own turnId → that very row is answered again.
    const stored = { id: "m1", sessionId: "s1", role: "USER", content: "What is the GST rate on gold?", metadata: meta, createdAt: askedAt };
    expect(decideTurn({ message: "What is the GST rate on gold?", continuing: true, retry: true, turnId: "carry-1", latestUser: stored, next: null, now: NOW + 60_000 })).toEqual({
      kind: "reuse",
      sessionId: "s1",
      userRowId: "m1",
    });
  });

  it("its conversation is a copy of a guest turn, counted once (the counters' guest-import rule)", () => {
    expect(CARRY_SESSION_SOURCE).toBe("guest-import");
    expect(read("src/lib/live-counts-server.ts")).toContain('export const GUEST_IMPORT_SOURCE = "guest-import";');
    expect(read("src/app/api/chat/import/route.ts")).toContain('const IMPORT_SOURCE = "guest-import";');
  });
});

// ── 4. POST /api/chat/carry-question ─────────────────────────────────────

function req(body: Record<string, unknown>, cookie = "shishya_anon=anon-1") {
  return new Request("https://shishya.in/api/chat/carry-question", {
    method: "POST",
    headers: { "content-type": "application/json", cookie },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/carry-question — after sign-in the kept question becomes a saved, failed member question", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
    state.session = { user: { id: "u1" } };
    state.logs = [log("l1", 30, null)];
    state.taken = [];
    state.recent = 0;
    state.exam = { id: "e1", active: true };
    state.profile = { onbStage: "WORKING", onbPrepCodes: ["SSC_CGL"] };
    state.importSession = null;
    state.cookies = { "shishya-lang": "hi" };
    state.created = [];
    state.updated = [];
    state.logQuery = null;
    return () => vi.useRealTimers();
  });

  it("stores the LOGGED question as a failed, promised USER row in a new conversation of the same exam", async () => {
    const res = await POST(req({ examCode: "SSC_CGL", text: "What is the GST rate on gold?", topicCode: "ssc.ga.economy" }));
    const j = await res.json();
    expect(j).toMatchObject({ saved: true, text: "What is the GST rate on gold?", appended: false });
    expect(typeof j.turnId).toBe("string");
    // Only this browser's guest log, this scope, the last 6 hours.
    expect(state.logQuery).toMatchObject({ where: { anonId: "anon-1", examCode: "SSC_CGL", createdAt: { gte: new Date(NOW - CARRY_LOG_WINDOW_MS) } } });
    const session = state.created.find((c) => c.model === "chatSession")!.data;
    expect(session).toMatchObject({ id: j.sessionId, userId: "u1", examId: "e1", contextSnapshot: { source: "guest-import", kind: "question", logId: "l1" } });
    const msg = state.created.find((c) => c.model === "chatMessage")!.data;
    expect(msg).toMatchObject({ sessionId: j.sessionId, role: "USER", content: "What is the GST rate on gold?", createdAt: new Date(NOW - 30 * 60_000) });
    expect(msg.metadata).toMatchObject({
      turnId: j.turnId,
      failedAt: NOW,
      sentAt: NOW - 30 * 60_000,
      latePromised: true,
      emailPromised: false,
      replyLang: "HI",
      topicCode: "ssc.ga.economy",
      guestLogId: "l1",
    });
  });

  it("at the end of the guest chat this sign-in just imported, when it is that account's, same scope", async () => {
    state.importSession = {
      id: "imp12345",
      userId: "u1",
      examId: "e1",
      contextSnapshot: { source: "guest-import", firstLogId: "l0" },
      messages: [{ createdAt: new Date(NOW - 40 * 60_000) }],
    };
    const j = await (await POST(req({ examCode: "SSC_CGL", text: "What is the GST rate on gold?", sessionId: "imp12345" }))).json();
    expect(j).toMatchObject({ saved: true, sessionId: "imp12345", appended: true });
    expect(state.created.map((c) => c.model)).toEqual(["chatMessage"]);
    expect(state.updated).toHaveLength(1);
    // Someone else's conversation: a new one instead.
    state.created = [];
    state.importSession = { ...state.importSession, userId: "u2" };
    const k = await (await POST(req({ examCode: "SSC_CGL", text: "What is the GST rate on gold?", sessionId: "imp12345" }))).json();
    expect(k.sessionId).not.toBe("imp12345");
    expect(state.created.map((c) => c.model)).toEqual(["chatSession", "chatMessage"]);
  });

  it("nothing on the client's word: no failed guest turn of this browser → nothing written", async () => {
    state.logs = [log("l1", 30, "It was answered.")];
    expect(await (await POST(req({ examCode: "SSC_CGL", text: "What is the GST rate on gold?" }))).json()).toEqual({ saved: false, reason: "not-verified" });
    state.logs = [log("l1", 30, null)];
    expect(await (await POST(req({ examCode: "SSC_CGL", text: "A question this browser never asked" }))).json()).toEqual({ saved: false, reason: "not-verified" });
    expect(await (await POST(req({ examCode: "SSC_CGL", text: "What is the GST rate on gold?" }, ""))).json()).toEqual({ saved: false, reason: "no-guest-log" });
    expect(state.created).toEqual([]);
  });

  it("never for school-age chats: a class container, a kids' exam, a declared 13-17 account; signed out is 401", async () => {
    for (const examCode of ["NCERT_C09", "NCERT_C05", "SOF_IMO", "JNVST"]) {
      expect(await (await POST(req({ examCode, text: "What is the GST rate on gold?" }))).json(), examCode).toEqual({ saved: false, reason: "not-here" });
    }
    state.profile = { onbStage: "CLASS_9_10", onbPrepCodes: ["NCERT_C09"] };
    const minor = await (await POST(req({ examCode: null, text: "What is the GST rate on gold?" }))).json();
    expect(minor.saved).toBe(false);
    expect(state.created).toEqual([]);
    state.session = null;
    expect((await POST(req({ examCode: null, text: "x" }))).status).toBe(401);
  });

  it("once per guest turn per account (a repeat returns the saved row), at most 3 a day", async () => {
    state.taken = [{ id: "m9", sessionId: "s9", content: "What is the GST rate on gold?", turnId: "carry-9" }];
    expect(await (await POST(req({ examCode: "SSC_CGL", text: "What is the GST rate on gold?" }))).json()).toEqual({
      saved: true,
      already: true,
      sessionId: "s9",
      turnId: "carry-9",
      text: "What is the GST rate on gold?",
    });
    state.taken = [];
    state.recent = 3;
    expect(await (await POST(req({ examCode: "SSC_CGL", text: "What is the GST rate on gold?" }))).json()).toEqual({ saved: false, reason: "limit" });
    expect(state.created).toEqual([]);
  });
});

// ── 5. the Header island (any page the sign-in lands on but the chat) ────

describe("the Header island carries the question on the page the sign-in lands on (source)", () => {
  const src = read("src/components/WelcomeStrip.tsx");

  it("after the guest chat's import, into it when the same scope; the strip links the saved conversation", () => {
    expect(src).toContain("const qAction = questionCarryDecision(question, { childPath: false, chatScope: null });");
    expect(src).toContain('carryQuestion({ sessionId: r.sessionId, examCode: kept.examCode });');
    expect(src).toContain("if (alive) setChatHref(carriedQuestionHref(carried.examCode, q.sessionId));");
    expect(src).toContain('if (q.status === "retry") return; // the key stays for a later page');
    // Still: nothing on a Class 1-7 or class-agnostic school page, and not on the chat page.
    expect(src.indexOf("if (isChildSchoolPath(path) || isUnder13SchoolPath(path)) return;")).toBeLessThan(src.indexOf("readGuestQuestionCarry()"));
    expect(src).toContain("if (!carryStarted && hasSessionHint() && !isChatPath(path)) {");
  });
});
