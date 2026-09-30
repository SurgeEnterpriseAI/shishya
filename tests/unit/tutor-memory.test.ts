// The tutor's memory of earlier chats (30 Sep 2026, "the tutor remembers") —
// src/lib/tutor-memory.ts (what is remembered), journeyBlock in
// src/lib/ai/prompts.ts (how it reads to the model) and tutorTurnContext in
// src/lib/ai/tutor.ts (which chats get it). What it pins:
//   • template openers never crowd out the student's own questions: mistake
//     reviews fold into one line, weak-topic buttons become "weak topics they
//     chose to ask about", quick replies are ignored;
//   • up to 8 typed-question threads, each marked answered or NO REPLY YET by
//     its last stored row (information only);
//   • the offer (review fix, 30 Sep 2026): one named question, only from the
//     NEWEST conversation's unanswered typed question within 72 hours, never
//     from a mistake review; no offer line without journey.offer;
//   • a general chat gets the journey (questions only, headed as such); a
//     school chat gets none; an exam chat's context keeps its shape;
//   • the block is bounded (140 characters per text, JOURNEY_MAX_CHARS).
// No DB, no model call. Run: npx vitest run tests/unit/tutor-memory.test.ts

import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/server", () => ({ after: () => {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import {
  JOURNEY_MAX_CHARS,
  MAX_ASKED_WEAK,
  MAX_THREADS,
  MEMORY_TEXT_CHARS,
  MEMORY_WINDOW_DAYS,
  OFFER_WINDOW_MS,
  isTypedQuestion,
  offerOf,
  reviewOfSeed,
  summariseChatMemory,
  weakTopicOfSeed,
  type MemorySession,
  type TutorJourney,
} from "@/lib/tutor-memory";
import { journeyBlock } from "@/lib/ai/prompts";
import { tutorTurnContext } from "@/lib/ai/tutor";

const NOW = Date.now();
const hoursAgo = (h: number) => new Date(NOW - h * 3600_000);
const REVIEW = (exam: string, n: number, weakest?: string) =>
  `I just took a ${exam} mock and got ${n} questions wrong${weakest ? ` — weakest: ${weakest}` : ""}. Go through my mistakes one by one: why the right answer is right, and how to get it next time.`;

function session(id: string, h: number, user: string[], lastRole: "USER" | "ASSISTANT", examShort = "SSC CGL", meta: unknown[] = []): MemorySession {
  return { id, lastAt: hoursAgo(h), examShort, userRows: user.map((content) => ({ content })), lastRole, assistantMeta: meta };
}

describe("what counts as the student's own question", () => {
  it("typed text yes; Shishya's seeds, starters and quick replies no", () => {
    expect(isTypedQuestion("why is option B wrong in Q4?")).toBe(true);
    expect(isTypedQuestion(REVIEW("SSC CGL", 3))).toBe(false);
    expect(isTypedQuestion("Next mistake")).toBe(false);
    expect(isTypedQuestion("Explain it more simply")).toBe(false);
    expect(isTypedQuestion("Percentage is one of my weakest topics for SSC CGL. Explain the key ideas and give me one practice question.")).toBe(false);
    expect(isTypedQuestion("  ")).toBe(false);
  });
  it("reads the review seed and the weak-topic buttons", () => {
    expect(reviewOfSeed(REVIEW("SSC CGL", 6, "Percentage, Time, Speed and Distance"))).toEqual({ examShort: "SSC CGL", wrong: 6, weakest: "Percentage, Time, Speed and Distance" });
    expect(reviewOfSeed(REVIEW("NDA", 1))).toEqual({ examShort: "NDA", wrong: 1, weakest: null });
    expect(reviewOfSeed("I just took a break")).toBeNull();
    expect(weakTopicOfSeed("I'm weak in Syllogism for SBI Clerk. Tutor me on this topic.")).toEqual({ name: "Syllogism", examShort: "SBI Clerk" });
    expect(weakTopicOfSeed("Tutor me on Tourism in MP — that's my weakest area in MPESB Group.")).toEqual({ name: "Tourism in MP", examShort: "MPESB Group" });
    expect(weakTopicOfSeed("On my last KPSC KAS mock I got 3/10 on Rivers of Karnataka. Help me improve on this topic.")).toEqual({ name: "Rivers of Karnataka", examShort: "KPSC KAS" });
    expect(weakTopicOfSeed("Percentage is one of my weakest topics for SSC CGL. Explain the key ideas and give me one practice question.")).toEqual({ name: "Percentage", examShort: "SSC CGL" });
    expect(weakTopicOfSeed("I'm weak in maths, what should I do?")).toBeNull();
  });
});

describe("summariseChatMemory", () => {
  it("folds mistake reviews into one line and keeps typed questions, most recent first", () => {
    const m = summariseChatMemory(
      [
        session("r1", 50, [REVIEW("SSC CGL", 4, "Ratio")], "ASSISTANT"),
        session("r2", 2, [REVIEW("RRB NTPC", 6, "Percentage, Time, Speed and Distance")], "USER", "RRB NTPC"),
        session("r3", 30, [REVIEW("SSC CGL", 5), "why is option B wrong in Q4?"], "ASSISTANT"),
        session("t1", 10, ["What is the difference between GDP and GNP?"], "ASSISTANT"),
      ],
      { exam: true },
    );
    expect(m.reviews).toMatchObject({ count: 3, examShorts: ["RRB NTPC", "SSC CGL"], latestWeakest: "Percentage, Time, Speed and Distance", latestAnswered: false });
    // Only typed questions make threads — including a follow-up typed inside a review.
    expect(m.threads.map((t) => [t.sessionId, t.openingMessage, t.answered])).toEqual([
      ["t1", "What is the difference between GDP and GNP?", true],
      ["r3", "why is option B wrong in Q4?", true],
    ]);
  });
  it("marks a thread unanswered by its last row and names the waiting question", () => {
    const m = summariseChatMemory(
      [
        session("a", 5, ["Explain compound interest", "and for half-yearly?"], "USER"),
        session("b", 6, ["What is a coalition government?"], "USER", ""),
        session("c", 7, ["What is inflation?", "Next mistake"], "USER"),
      ],
      { exam: false },
    );
    expect(m.threads[0]).toMatchObject({ sessionId: "a", answered: false, waiting: "and for half-yearly?" });
    // The opening question itself is the one waiting: no separate waiting line.
    expect(m.threads[1]).toMatchObject({ sessionId: "b", answered: false, waiting: null, examShort: "" });
    // A quick reply left unanswered is not "their question".
    expect(m.threads[2]).toMatchObject({ sessionId: "c", answered: false, waiting: null });
    // Only the newest conversation's waiting question is offered.
    expect(m.offer).toEqual({ text: "and for half-yearly?" });
  });
  it("the offer: newest conversation only, typed, unanswered, within 72 hours, never a review", () => {
    const now = new Date(NOW);
    expect(OFFER_WINDOW_MS).toBe(72 * 3600_000);
    // An older unanswered thread behind an answered newest one: no offer.
    const olderWaiting = summariseChatMemory(
      [session("new", 1, ["What is GDP?"], "ASSISTANT"), session("old", 5, ["Explain compound interest"], "USER")],
      { exam: true, now },
    );
    expect(olderWaiting.threads.find((t) => t.sessionId === "old")?.answered).toBe(false);
    expect(olderWaiting.offer).toBeNull();
    // The opening question itself waiting: offered.
    expect(summariseChatMemory([session("n", 2, ["Explain compound interest"], "USER")], { exam: true, now }).offer).toEqual({ text: "Explain compound interest" });
    // Older than 72 hours: not offered (still listed as NO REPLY YET).
    const stale = summariseChatMemory([session("n", 73, ["Explain compound interest"], "USER")], { exam: true, now });
    expect(stale.threads[0].answered).toBe(false);
    expect(stale.offer).toBeNull();
    expect(summariseChatMemory([session("n", 71, ["Explain compound interest"], "USER")], { exam: true, now }).offer).not.toBeNull();
    // A mistake review — the seed alone, or a typed follow-up inside it: never offered.
    expect(summariseChatMemory([session("r", 1, [REVIEW("SSC CGL", 4, "Ratio")], "USER")], { exam: true, now }).offer).toBeNull();
    expect(summariseChatMemory([session("r", 1, [REVIEW("SSC CGL", 4), "why is option B wrong in Q4?"], "USER")], { exam: true, now }).offer).toBeNull();
    // A quick reply or a weak-topic button left unanswered is ours, not their question.
    expect(summariseChatMemory([session("q", 1, ["What is inflation?", "Next mistake"], "USER")], { exam: true, now }).offer).toBeNull();
    expect(summariseChatMemory([session("w", 1, ["I'm weak in Syllogism for SBI Clerk. Tutor me on this topic."], "USER")], { exam: true, now }).offer).toBeNull();
    // Nothing remembered: no offer.
    expect(offerOf(undefined, now)).toBeNull();
    // The offered text is cut like every remembered text.
    expect(Array.from(offerOf(session("l", 1, ["z".repeat(500)], "USER"), now)!.text).length).toBe(MEMORY_TEXT_CHARS);
  });
  it("keeps at most 8 threads and the last 3 distinct weak topics the student chose", () => {
    const many = Array.from({ length: 12 }, (_, i) => session(`s${i}`, i + 1, [`my own question number ${i}`], "ASSISTANT"));
    const weak = [
      session("w1", 0.5, ["I'm weak in Syllogism for SBI Clerk. Tutor me on this topic."], "ASSISTANT", "SBI Clerk"),
      session("w2", 0.6, ["Percentage is one of my weakest topics for SSC CGL. Explain the key ideas and give me one practice question."], "ASSISTANT"),
      session("w3", 0.7, ["I'm weak in syllogism for SBI Clerk. Tutor me on this topic."], "ASSISTANT", "SBI Clerk"),
      session("w4", 0.8, ["Tutor me on Ratio — that's my weakest area in SSC CGL."], "ASSISTANT"),
      session("w5", 0.9, ["On my last SSC CGL mock I got 1/5 on Algebra. Help me improve on this topic."], "ASSISTANT"),
    ];
    const m = summariseChatMemory([...many, ...weak], { exam: true });
    expect(MAX_THREADS).toBe(8);
    expect(m.threads).toHaveLength(8);
    expect(m.threads[0].sessionId).toBe("s0");
    expect(MAX_ASKED_WEAK).toBe(3);
    expect(m.askedWeakTopics).toEqual([
      { name: "Syllogism", examShort: "SBI Clerk" },
      { name: "Percentage", examShort: "SSC CGL" },
      { name: "Ratio", examShort: "SSC CGL" },
    ]);
  });
  it("cuts every remembered text to 140 characters", () => {
    const long = "x".repeat(500);
    const m = summariseChatMemory([session("l", 1, [long, "y".repeat(500)], "USER")], { exam: false });
    expect(Array.from(m.threads[0].openingMessage).length).toBe(MEMORY_TEXT_CHARS);
    expect(Array.from(m.threads[0].waiting!).length).toBe(MEMORY_TEXT_CHARS);
    expect(MEMORY_WINDOW_DAYS).toBe(30);
  });
  it("topic codes and suggested actions only in an exam chat", () => {
    const meta = [{ toolCalls: [{ args: { topic_code: "quant.percentage" } }], actions: [{ kind: "TAKE_MOCK", topicCode: "quant.percentage", reason: "Practise it" }] }];
    const s = [session("m", 1, ["teach me percentage change"], "ASSISTANT", "SSC CGL", meta)];
    const exam = summariseChatMemory(s, { exam: true });
    expect(exam.threads[0].topicCodes).toEqual(["quant.percentage"]);
    expect(exam.topAskedTopics).toEqual([{ topicCode: "quant.percentage", count: 1 }]);
    expect(exam.openActions).toEqual([{ kind: "TAKE_MOCK", topicCode: "quant.percentage", reason: "Practise it" }]);
    const general = summariseChatMemory(s, { exam: false });
    expect(general.threads[0].topicCodes).toEqual([]);
    expect(general.topAskedTopics).toEqual([]);
    expect(general.openActions).toEqual([]);
  });
});

const BASE: TutorJourney = { examCode: "SSC_CGL", threads: [], topAskedTopics: [], todayBrief: null, lastMock: null, openActions: [] };

describe("journeyBlock", () => {
  it("empty memory renders nothing", () => {
    expect(journeyBlock(BASE)).toBe("");
    expect(journeyBlock({ ...BASE, examCode: null, reviews: null, askedWeakTopics: [] })).toBe("");
  });
  const WAITING_THREADS: TutorJourney["threads"] = [
    { sessionId: "a", startedAt: hoursAgo(20).toISOString(), examShort: "SSC CGL", openingMessage: "Explain compound interest", topicCodes: [], answered: false, waiting: "and for half-yearly?" },
    { sessionId: "b", startedAt: hoursAgo(50).toISOString(), examShort: "", openingMessage: "What is GDP?", topicCodes: [], answered: true, waiting: null },
  ];
  it("marks NO REPLY YET and, with an offer, asks the tutor to offer THAT question once", () => {
    const text = journeyBlock({ ...BASE, threads: WAITING_THREADS, offer: { text: "and for half-yearly?" } });
    expect(text).toContain('· NO REPLY YET: "Explain compound interest" — then asked, still with no reply: "and for half-yearly?"');
    expect(text).toContain('(general): "What is GDP?"');
    expect(text).toContain('offer in one short line to answer "and for half-yearly?" now');
    expect(text).toContain("Offer only once");
  });
  it("NO REPLY YET without an offer is information only: no offer line", () => {
    for (const offer of [undefined, null]) {
      const text = journeyBlock({ ...BASE, threads: WAITING_THREADS, offer });
      expect(text).toContain("NO REPLY YET");
      expect(text).not.toContain("Offer only once");
      expect(text).not.toContain("offer in one short line");
      expect(text).toContain("Do not offer to answer it unless the student brings it up.");
    }
  });
  it("no offer line when everything was answered; the review line and weak topics render", () => {
    const text = journeyBlock({
      ...BASE,
      threads: [{ sessionId: "b", startedAt: hoursAgo(3).toISOString(), examShort: "SSC CGL", openingMessage: "What is GDP?", topicCodes: ["eco.gdp"], answered: true }],
      reviews: { count: 4, examShorts: ["SSC CGL"], latestWeakest: "Ratio, Percentage", latestAt: hoursAgo(30).toISOString(), latestAnswered: true },
      askedWeakTopics: [{ name: "Syllogism", examShort: "SBI Clerk" }],
    });
    expect(text).not.toContain("NO REPLY YET");
    expect(text).not.toContain("Offer only once");
    expect(text).not.toContain("Do not offer to answer it");
    expect(text).toContain("Reviewed their mock mistakes with you 4 times in the last 30 days (SSC CGL); the latest (yesterday) named weakest: Ratio, Percentage.");
    expect(text).toContain("Syllogism (SBI Clerk)");
    expect(text).toContain("`eco.gdp`");
  });
  it("an unanswered review is information only: never an offer (the tutor may not be able to read that mock)", () => {
    const text = journeyBlock({ ...BASE, examCode: null, reviews: { count: 1, examShorts: ["NDA"], latestWeakest: null, latestAt: hoursAgo(2).toISOString(), latestAnswered: false } });
    expect(text).toContain("Reviewed their mock mistakes with you 1 time in the last 30 days (NDA); the latest review got NO REPLY YET.");
    expect(text).not.toContain("Offer only once");
    expect(text).not.toContain("offer in one short line");
    expect(text).toContain("Do not offer to answer it unless the student brings it up.");
  });
  it("a general chat's block says these are the student's own chats and study buttons, no scores", () => {
    const text = journeyBlock({ ...BASE, examCode: null, threads: [{ sessionId: "b", startedAt: hoursAgo(3).toISOString(), examShort: "", openingMessage: "Which stream after Class 10?", topicCodes: [], answered: true }] });
    expect(text).toContain(
      "This student is signed in. Below are their own earlier chats with you: questions they typed and study buttons they pressed (mistake reviews, weak topics). No scores or marks, and this chat has no exam data. Use them only for continuity.",
    );
    const exam = journeyBlock({ ...BASE, threads: [{ sessionId: "b", startedAt: hoursAgo(3).toISOString(), examShort: "SSC CGL", openingMessage: "Q", topicCodes: [], answered: true }] });
    expect(exam).not.toContain("This student is signed in.");
  });
  it("is capped: the oldest threads are dropped to fit", () => {
    const threads = Array.from({ length: 8 }, (_, i) => ({
      sessionId: `s${i}`,
      startedAt: hoursAgo(i + 1).toISOString(),
      examShort: "SSC CGL",
      openingMessage: `${i}:` + "q".repeat(137),
      topicCodes: ["a.b", "c.d", "e.f", "g.h"],
      answered: false,
      waiting: "w".repeat(140),
    }));
    const text = journeyBlock({ ...BASE, threads, todayBrief: { reflection: "r".repeat(600), mockTitle: "Mock" } });
    expect(text.length).toBeLessThanOrEqual(JOURNEY_MAX_CHARS);
    expect(text).toContain('"0:');
    expect(text).not.toContain('"7:');
  });
});

describe("tutorTurnContext — which chats carry the memory", () => {
  const state = { userId: "u1", examCode: "SSC_CGL", examName: "SSC CGL", preferredLang: "EN" as const, enrolledAt: "2026-09-01", weaknesses: [], strengths: [], totalMocksTaken: 2 };
  const journey: TutorJourney = { ...BASE, examCode: null, threads: [{ sessionId: "b", startedAt: hoursAgo(3).toISOString(), examShort: "", openingMessage: "Which stream after Class 10?", topicCodes: [], answered: true }] };
  it("a signed-in general chat gets its journey before the language line, and no student state or actions", () => {
    const ctx = tutorTurnContext({ school: null, generalMode: true, studentState: state, journey, focusBlock: "", language: "EN" });
    expect(ctx).toContain('"Which stream after Class 10?"');
    expect(ctx.endsWith("Reply language: EN.")).toBe(true);
    expect(ctx).not.toContain("# Student state");
    expect(ctx).not.toContain("<<ACTIONS>>");
  });
  it("a general chat with no journey is exactly the language line (guests, as before)", () => {
    expect(tutorTurnContext({ school: null, generalMode: true, studentState: state, journey: undefined, focusBlock: "", language: "HI" })).toBe("Reply language: HI.");
  });
  it("an exam chat keeps its shape: state, journey, language, actions", () => {
    const ctx = tutorTurnContext({ school: null, generalMode: false, studentState: state, journey: { ...journey, examCode: "SSC_CGL" }, focusBlock: "", language: "EN" });
    expect(ctx.startsWith("# Student state")).toBe(true);
    expect(ctx).toContain("# Recent journey");
    expect(ctx).toContain("Reply language: EN.");
    expect(ctx).toContain("<<ACTIONS>>");
  });
  it("a school chat never gets a journey", () => {
    const school = {
      scope: { examCode: "NCERT_C09", cls: 9, board: "CBSE", boardShort: "CBSE", classPath: "/schooling/cbse/class-9", subjects: [] },
      focus: null,
      band: null,
    } as unknown as Parameters<typeof tutorTurnContext>[0]["school"];
    const ctx = tutorTurnContext({ school, generalMode: false, studentState: state, journey, focusBlock: "", language: "EN" });
    expect(ctx).not.toContain("Recent journey");
    expect(ctx).not.toContain("Which stream after Class 10?");
  });
});
