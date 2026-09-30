// Saved tutor chats (30 Sep 2026, "the tutor remembers") — the pure rules in
// src/lib/recent-chats.ts: which /chat URL reopens a conversation (never a
// seeded one), where it continues (its own scope), how a stored conversation
// becomes bubbles (a question with no reply reads "Not answered" and only the
// latest can be retried), the honest titles and dates of the Recent chats
// lists, the mistake review's quick replies, and the review tag.
// Pure — no DB. Run: npx vitest run tests/unit/recent-chats.test.ts

import { describe, expect, it } from "vitest";
import {
  REVIEW_CHIPS,
  RESUME_TURNS,
  SESSION_TOUCH_MS,
  TITLE_CHARS,
  chatResumeHref,
  chatResumeView,
  chatTitle,
  continueReviewNoteText,
  cutText,
  historyToBubbles,
  isMistakeReviewOpener,
  isResumeUrlCanonical,
  istDayLabel,
  mistakeReviewExam,
  recentChatItem,
  recentChatsCopy,
  recentChatsList,
  resumeSessionParam,
  reviewAttemptParam,
  reviewChipsVisible,
  reviewSnapshot,
  reviewTagOf,
  shouldTouchSession,
} from "@/lib/recent-chats";
import { canRetryAt, failedReplyKind, retryableTurn } from "@/lib/chat-reply-status";
import { isOurTutorPrompt } from "@/lib/tutor-templates";

const SEED =
  "I just took a SSC CGL mock and got 6 questions wrong — weakest: Percentage, Time, Speed and Distance. Go through my mistakes one by one: why the right answer is right, and how to get it next time.";
const en = recentChatsCopy("en");

describe("resumeSessionParam — which URL reopens a saved chat", () => {
  it("takes a cuid or an imported chat's UUID", () => {
    expect(resumeSessionParam({ session: "cmg1abcd2000008l4efgh1234" })).toBe("cmg1abcd2000008l4efgh1234");
    expect(resumeSessionParam({ session: "3f1b2c4d-1111-4222-8333-944455556666" })).toBe("3f1b2c4d-1111-4222-8333-944455556666");
  });
  it("a seeded URL never attaches to an old conversation", () => {
    expect(resumeSessionParam({ session: "cmg1abcd2000008l4efgh1234", seed: "Quiz me on Percentage" })).toBeNull();
    // A blank seed is no seed.
    expect(resumeSessionParam({ session: "cmg1abcd2000008l4efgh1234", seed: "  " })).toBe("cmg1abcd2000008l4efgh1234");
  });
  it("ignores missing or malformed ids", () => {
    for (const bad of [undefined, null, "", "short", "a b c d e f g h", "x".repeat(65), "id;drop", "../../etc"]) {
      expect(resumeSessionParam({ session: bad as string | null | undefined })).toBeNull();
    }
  });
});

describe("reviewAttemptParam — the attempt a results seed reviews", () => {
  it("only with the seed it came with", () => {
    expect(reviewAttemptParam({ review: "cmg1attempt00001", seed: SEED })).toBe("cmg1attempt00001");
    expect(reviewAttemptParam({ review: "cmg1attempt00001" })).toBeNull();
    expect(reviewAttemptParam({ review: "cmg1attempt00001", seed: " " })).toBeNull();
    expect(reviewAttemptParam({ review: "bad id!", seed: SEED })).toBeNull();
  });
});

describe("a saved chat continues only in its own scope", () => {
  it("chatResumeHref: general → ?general=1, exam or school class → ?examCode=", () => {
    expect(chatResumeHref({ examCode: null, sessionId: "s_general_1" })).toBe("/chat?general=1&session=s_general_1");
    expect(chatResumeHref({ examCode: "SSC_CGL", sessionId: "s_exam_0001" })).toBe("/chat?examCode=SSC_CGL&session=s_exam_0001");
    expect(chatResumeHref({ examCode: "NCERT_C09", sessionId: "s_school_01" })).toBe("/chat?examCode=NCERT_C09&session=s_school_01");
  });
  it("isResumeUrlCanonical: the page redirects once to that URL, never in a loop", () => {
    expect(isResumeUrlCanonical({ general: "1" }, { examCode: null })).toBe(true);
    expect(isResumeUrlCanonical({}, { examCode: null })).toBe(false);
    expect(isResumeUrlCanonical({ examCode: "SSC_CGL" }, { examCode: null })).toBe(false);
    expect(isResumeUrlCanonical({ examCode: "SSC_CGL" }, { examCode: "SSC_CGL" })).toBe(true);
    expect(isResumeUrlCanonical({ examCode: "SSC_CGL", general: "1" }, { examCode: "SSC_CGL" })).toBe(false);
    expect(isResumeUrlCanonical({ examCode: "RRB_NTPC" }, { examCode: "SSC_CGL" })).toBe(false);
    expect(isResumeUrlCanonical({ examCode: "NCERT_C09" }, { examCode: "NCERT_C09" })).toBe(true);
    // The target of every redirect is canonical for the same chat.
    for (const examCode of [null, "SSC_CGL", "NCERT_C09"]) {
      const url = new URL(chatResumeHref({ examCode, sessionId: "s_000000001" }), "https://shishya.in");
      const sp = Object.fromEntries(url.searchParams.entries());
      expect(isResumeUrlCanonical(sp, { examCode })).toBe(true);
      expect(resumeSessionParam(sp)).toBe("s_000000001");
    }
  });
});

describe("historyToBubbles — a stored conversation on screen", () => {
  it("pairs questions and replies; a question with no reply reads Not answered and only the latest is retryable", () => {
    const b = historyToBubbles([
      { id: "1", role: "USER", content: "What is a ratio?", metadata: { turnId: "t1" } },
      { id: "2", role: "ASSISTANT", content: "A ratio compares…" },
      { id: "3", role: "USER", content: "And a proportion?", metadata: { turnId: "t2", failedAt: 1 } },
      { id: "4", role: "USER", content: "Hello?", metadata: { turnId: "t3" } },
    ]);
    expect(b.map((m) => [m.role, m.content, !!m.failed])).toEqual([
      ["user", "What is a ratio?", false],
      ["assistant", "A ratio compares…", false],
      ["user", "And a proportion?", false],
      ["assistant", "", true],
      ["user", "Hello?", false],
      ["assistant", "", true],
    ]);
    expect(b[0].turnId).toBe("t1");
    expect(failedReplyKind(b[3])).toBe("not-answered");
    expect(canRetryAt(b, 3)).toBe(false);
    expect(canRetryAt(b, 5)).toBe(true);
    // Retry re-sends the latest question with its own turnId (the route reuses that row).
    expect(retryableTurn(b)).toEqual({ text: "Hello?", turnId: "t3" });
    expect(new Set(b.map((m) => m.id)).size).toBe(b.length);
  });
  it("drops replies whose question fell outside the loaded window, and marks an empty stored reply failed", () => {
    const b = historyToBubbles([
      { id: "a", role: "ASSISTANT", content: "…the end of an old answer" },
      { id: "b", role: "USER", content: "Next one" },
      { id: "c", role: "ASSISTANT", content: "  " },
    ]);
    expect(b.map((m) => m.role)).toEqual(["user", "assistant"]);
    expect(b[1].failed).toBe(true);
    expect(b[0].turnId).toBeUndefined();
  });
  it("an answered conversation offers no Retry", () => {
    const b = historyToBubbles([
      { id: "1", role: "USER", content: "Q" },
      { id: "2", role: "ASSISTANT", content: "A" },
    ]);
    expect(retryableTurn(b)).toBeNull();
    expect(RESUME_TURNS).toBe(30);
  });
});

describe("honest titles and dates", () => {
  it("a results-page opener is a mistake review of its mock; anything else is the first question cut to 80", () => {
    expect(isMistakeReviewOpener(SEED)).toBe(true);
    expect(mistakeReviewExam(SEED)).toBe("SSC CGL");
    expect(chatTitle({ opener: SEED }, en)).toBe("Mistake review: SSC CGL mock");
    expect(chatTitle({ opener: SEED, reviewMockTitle: "SSC CGL Tier 1 — Full Mock 3" }, en)).toBe("Mistake review: SSC CGL Tier 1 — Full Mock 3");
    expect(chatTitle({ opener: SEED }, recentChatsCopy("hi"))).toBe("गलतियों की समीक्षा: SSC CGL मॉक");
    const long = "Why is the answer to question 14 option C and not option B when both look the same to me after I did the working twice";
    const t = chatTitle({ opener: long }, en);
    expect(Array.from(t).length).toBeLessThanOrEqual(TITLE_CHARS);
    expect(t.endsWith("…")).toBe(true);
    expect(long.startsWith(t.slice(0, -1))).toBe(true);
    expect(chatTitle({ opener: "  What   is\n a ratio? " }, en)).toBe("What is a ratio?");
    // The school mistakes seed is not the exam review.
    expect(isMistakeReviewOpener('I practised "Matter" (Class 9) and got 2 questions wrong — mostly on States of matter.')).toBe(false);
  });
  it("cutText counts characters, not UTF-16 units", () => {
    expect(cutText("नमस्ते दुनिया", 100)).toBe("नमस्ते दुनिया");
    expect(Array.from(cutText("अ".repeat(200), 80)).length).toBe(80);
  });
  it("istDayLabel counts IST calendar days", () => {
    const now = new Date("2026-09-30T04:00:00Z"); // 09:30 IST
    expect(istDayLabel(new Date("2026-09-29T19:00:00Z"), now, en)).toBe("today"); // 00:30 IST on the 30th
    expect(istDayLabel(new Date("2026-09-29T18:00:00Z"), now, en)).toBe("yesterday"); // 23:30 IST on the 29th
    expect(istDayLabel(new Date("2026-09-26T10:00:00Z"), now, en)).toBe("4 days ago");
    expect(istDayLabel(new Date("2026-09-26T10:00:00Z"), now, recentChatsCopy("te"))).toBe("4 రోజుల క్రితం");
  });
  it("a list line: title, exam or General, day, and 'no reply yet' only when the last row is the student's", () => {
    const now = new Date("2026-09-30T06:00:00Z");
    const answered = recentChatItem(
      { id: "s1_000000", examCode: "SSC_CGL", examShort: "SSC CGL", opener: "What is a ratio?", lastAt: new Date("2026-09-29T06:00:00Z"), lastRole: "ASSISTANT", reviewMockTitle: null },
      en,
      now,
    );
    expect(answered).toEqual({ id: "s1_000000", title: "What is a ratio?", meta: "SSC CGL · yesterday", href: "/chat?examCode=SSC_CGL&session=s1_000000", unanswered: false });
    const waiting = recentChatItem(
      { id: "s2_000000", examCode: null, examShort: null, opener: "Which stream after Class 10?", lastAt: now, lastRole: "USER", reviewMockTitle: null },
      en,
      now,
    );
    expect(waiting.meta).toBe("General · today · no reply yet");
    expect(waiting.href).toBe("/chat?general=1&session=s2_000000");
    expect(waiting.unanswered).toBe(true);
    const list = recentChatsList([], en, now);
    expect(list).toEqual({ heading: "Your recent chats", continueLabel: "Continue", items: [] });
  });
  it("the reopened chat's note and the results page's continue line", () => {
    const now = new Date("2026-09-30T06:00:00Z");
    const v = chatResumeView(
      { id: "s1_000000", rows: [{ id: "1", role: "USER", content: SEED }, { id: "2", role: "ASSISTANT", content: "Q1…" }], lastAt: new Date("2026-09-28T06:00:00Z"), opener: SEED },
      "/chat?examCode=SSC_CGL",
      en,
      now,
    );
    expect(v.sessionId).toBe("s1_000000");
    expect(v.note).toBe("Your saved chat · last active 2 days ago");
    expect(v.newChatHref).toBe("/chat?examCode=SSC_CGL");
    expect(v.newChatLabel).toBe("New chat");
    expect(v.mistakeReview).toBe(true);
    expect(v.messages).toHaveLength(2);
    // The opener decides, even when it is outside the loaded turns.
    expect(chatResumeView({ id: "x_0000000", rows: [{ id: "9", role: "USER", content: "Next mistake" }], lastAt: now, opener: SEED }, "/chat", en, now).mistakeReview).toBe(true);
    expect(chatResumeView({ id: "x_0000000", rows: [], lastAt: now, opener: "What is GST?" }, "/chat", en, now).mistakeReview).toBe(false);
    expect(continueReviewNoteText(new Date("2026-09-29T06:00:00Z"), now, en)).toBe("You started this review yesterday. It opens where you left off.");
  });
});

describe("copy parity (en / hi / te)", () => {
  it("every key in every language, with the English placeholders, in its own script", () => {
    const placeholders = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
    const base = recentChatsCopy("en");
    for (const [locale, script] of [["hi", /[ऀ-ॿ]/], ["te", /[ఀ-౿]/]] as const) {
      const c = recentChatsCopy(locale);
      for (const k of Object.keys(base) as (keyof typeof base)[]) {
        expect(c[k], `${locale}.${k}`).toBeTruthy();
        expect(c[k], `${locale}.${k}`).toMatch(script);
        expect(placeholders(c[k]), `${locale}.${k}`).toEqual(placeholders(base[k]));
      }
    }
    // Any other locale reads English.
    expect(recentChatsCopy("ta")).toEqual(base);
  });
});

describe("the mistake review's quick replies", () => {
  const msgs = (last: { role: "user" | "assistant"; content: string; failed?: boolean }) => [
    { role: "user" as const, content: SEED },
    last,
  ];
  it("show under a complete reply in a mistake review only", () => {
    const ok = { reviewMode: true, school: false, busy: false, closed: false };
    expect(reviewChipsVisible({ ...ok, messages: msgs({ role: "assistant", content: "Mistake 1: …" }) })).toBe(true);
    expect(reviewChipsVisible({ ...ok, reviewMode: false, messages: msgs({ role: "assistant", content: "…" }) })).toBe(false);
    expect(reviewChipsVisible({ ...ok, school: true, messages: msgs({ role: "assistant", content: "…" }) })).toBe(false);
    expect(reviewChipsVisible({ ...ok, busy: true, messages: msgs({ role: "assistant", content: "…" }) })).toBe(false);
    expect(reviewChipsVisible({ ...ok, closed: true, messages: msgs({ role: "assistant", content: "…" }) })).toBe(false);
  });
  it("never under a failed, empty or pending reply — so they never stack", () => {
    const ok = { reviewMode: true, school: false, busy: false, closed: false };
    expect(reviewChipsVisible({ ...ok, messages: msgs({ role: "assistant", content: "", failed: true }) })).toBe(false);
    expect(reviewChipsVisible({ ...ok, messages: msgs({ role: "assistant", content: "Part of it", failed: true }) })).toBe(false);
    expect(reviewChipsVisible({ ...ok, messages: msgs({ role: "assistant", content: "" }) })).toBe(false);
    expect(reviewChipsVisible({ ...ok, messages: msgs({ role: "user", content: "Next mistake" }) })).toBe(false);
    expect(reviewChipsVisible({ ...ok, messages: [] })).toBe(false);
  });
  it("three per language, and every one is known as Shishya's own words (demand mining, tutor memory)", () => {
    for (const l of ["en", "hi", "te"] as const) {
      expect(REVIEW_CHIPS[l]).toHaveLength(3);
      for (const chip of REVIEW_CHIPS[l]) expect(isOurTutorPrompt(chip), chip).toBe(true);
    }
    expect(REVIEW_CHIPS.en).toEqual(["Next mistake", "Give me a similar question", "Explain it more simply"]);
  });
});

describe("the review tag and the activity touch", () => {
  it("reviewTagOf reads only a well-formed tag", () => {
    expect(reviewTagOf({ reviewAttemptId: "a1", reviewMockTitle: " Mock 3 " })).toEqual({ attemptId: "a1", mockTitle: "Mock 3" });
    expect(reviewTagOf({ reviewAttemptId: "a1" })).toEqual({ attemptId: "a1", mockTitle: null });
    for (const bad of [null, undefined, "a1", [], {}, { reviewAttemptId: 5 }, { reviewAttemptId: "" }, { importedAt: "x" }]) {
      expect(reviewTagOf(bad)).toBeNull();
    }
  });
  it("reviewSnapshot round-trips and caps the title", () => {
    expect(reviewTagOf(reviewSnapshot({ attemptId: "a1", mockTitle: "Mock 3" }))).toEqual({ attemptId: "a1", mockTitle: "Mock 3" });
    expect(reviewSnapshot({ attemptId: "a1", mockTitle: null })).toEqual({ reviewAttemptId: "a1" });
    expect(Array.from(reviewSnapshot({ attemptId: "a1", mockTitle: "M".repeat(300) }).reviewMockTitle!).length).toBe(120);
  });
  it("shouldTouchSession: at most once per 30 minutes, never on a missing date", () => {
    const now = Date.parse("2026-09-30T06:00:00Z");
    expect(SESSION_TOUCH_MS).toBe(30 * 60_000);
    expect(shouldTouchSession(new Date(now - SESSION_TOUCH_MS), now)).toBe(true);
    expect(shouldTouchSession(new Date(now - 5 * 60_000), now)).toBe(false);
    expect(shouldTouchSession(undefined, now)).toBe(false);
    expect(shouldTouchSession(new Date("nope"), now)).toBe(false);
    expect(shouldTouchSession("2026-09-01", now)).toBe(false);
  });
});
