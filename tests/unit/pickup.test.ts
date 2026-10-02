// "Pick up where you left off" (30 Sep 2026) — the pure rules
// (src/lib/pickup.ts, src/lib/pickup-followup.ts) and the source seams.
// What it pins:
//   • the card: "did not get an answer" ONLY when the stored last row is the
//     student's (or an empty stored reply); an unanswered chat links into its
//     answer (f=answer) with no follow-up chip; an answered one continues the
//     saved chat and offers ONE fixed follow-up (practice, or "Next mistake"
//     in a mistake review); the quoted question is the student's own typed
//     words when there are any, else the chat's honest title; en / hi / te;
//   • the last result: score, IST day, the attempt's weakest topics (a miss
//     at least), each with the results page's own seed — which the tutor's
//     memory reads as a weak topic the student chose to ask about;
//   • the follow-up: only with a reopened conversation (no seed), only our
//     own words (listed as ours for the memory and demand mining), a retry
//     only when the last turn is retryable, never under an unanswered turn,
//     never busy or closed, once per tab, and ?f= leaves the URL;
//   • the mail line: the student's own last TYPED question (never our
//     prompts), <= 60 characters, control characters out, HTML-escaped,
//     today / yesterday / two days ago only, a link back into that chat
//     (f=answer when it never got an answer), null when there is none;
//   • the seams: the hub mounts the strip only for a signed-in member
//     enrolled on that exam, as a client island (no server HTML); home,
//     dashboard, the chat page and island, both mails and the founder's
//     wave copy (never carries a student's quote).
// No DB. Run: npx vitest run tests/unit/pickup.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  EMAIL_QUOTE_CHARS,
  emailQuote,
  escapeHtml,
  isUnansweredLast,
  pickEmailQuestion,
  pickupCopy,
  pickupEmailLine,
  pickupQuestionText,
  pickupView,
  weakTopicSeed,
  weakTopicsOf,
  type EmailQuestionRow,
  type PickupMock,
  type PickupThread,
} from "@/lib/pickup";
import {
  PRACTICE_FOLLOW_UP,
  followUpAction,
  followUpOnceKey,
  followUpText,
  pickupFollowUpParam,
  stripFollowUpParam,
} from "@/lib/pickup-followup";
import { REVIEW_CHIPS, TITLE_CHARS } from "@/lib/recent-chats";
import { isOurTutorPrompt } from "@/lib/tutor-templates";
import { isTypedQuestion, weakTopicOfSeed } from "@/lib/tutor-memory";
import { withoutPrivateParts } from "@/lib/email";
import { quizRecallCopy } from "@/lib/quiz-carry";

const NOW = new Date("2026-09-30T06:00:00Z"); // 11:30 IST
const hoursAgo = (h: number) => new Date(NOW.getTime() - h * 3600_000);
/** 2 Oct 2026 (wave W1b): the mail line asks who the student is; these tests are about an adult's line.
 *  The school-age side is tests/unit/mail-school-age.test.ts. */
const ADULT = { schoolAge: false };

function thread(over: Partial<PickupThread> = {}): PickupThread {
  return {
    sessionId: "sess_abcdefgh",
    examCode: "SSC_CGL",
    examShort: "SSC CGL",
    lastAt: hoursAgo(20),
    lastRole: "ASSISTANT",
    lastContent: "Here is how compound interest works…",
    opener: "How do I solve compound interest questions fast?",
    lastUser: "How do I solve compound interest questions fast?",
    lastTyped: "How do I solve compound interest questions fast?",
    reviewMockTitle: null,
    ...over,
  };
}

function mock(over: Partial<PickupMock> = {}): PickupMock {
  return {
    attemptId: "att_abcdefgh",
    mockTitle: "SSC CGL Full Mock 3",
    scorePct: 62.5,
    finishedAt: hoursAgo(26),
    examCode: "SSC_CGL",
    examShort: "SSC CGL",
    topicScores: {
      t1: { topicCode: "PERC", topicName: "Percentages", correct: 1, total: 4, score: 0.25 },
      t2: { topicCode: "TW", topicName: "Time & Work", correct: 2, total: 3, score: 0.667 },
      t3: { topicCode: "GK", topicName: "Static GK", correct: 5, total: 5, score: 1 },
      t4: { topicCode: "SI", topicName: "Simple Interest", correct: 0, total: 2, score: 0 },
      t5: { topicCode: "AVG", topicName: "Averages", correct: 1, total: 4, score: 0.25 },
    },
    ...over,
  };
}

describe("pickup card — the last question", () => {
  it("says 'did not get an answer' only when the stored last row is the student's, or an empty stored reply", () => {
    expect(isUnansweredLast("USER", "anything")).toBe(true);
    expect(isUnansweredLast("ASSISTANT", "   ")).toBe(true);
    expect(isUnansweredLast("ASSISTANT", "An answer")).toBe(false);
    expect(isUnansweredLast("SYSTEM", "")).toBe(false);
    expect(isUnansweredLast(null, null)).toBe(false);
  });

  it("an answered chat: 'You asked the tutor', continue the saved chat, one practice follow-up", () => {
    const v = pickupView({ thread: thread(), mock: null }, "en", NOW)!;
    expect(v.title).toBe("Pick up where you left off");
    expect(v.question).toMatchObject({
      answered: true,
      label: "You asked the tutor",
      text: "How do I solve compound interest questions fast?",
      meta: "SSC CGL · yesterday",
      primary: { href: "/chat?examCode=SSC_CGL&session=sess_abcdefgh", label: "Continue this chat →" },
      followUp: { href: "/chat?examCode=SSC_CGL&session=sess_abcdefgh&f=practice", label: PRACTICE_FOLLOW_UP.en },
    });
    expect(v.mock).toBeNull();
  });

  it("an unanswered chat: the honest line, a link into its answer (f=answer), and no follow-up chip", () => {
    const t = thread({ lastRole: "USER", lastContent: "Why is 7 prime?", lastUser: "Why is 7 prime?", lastTyped: "Why is 7 prime?" });
    const v = pickupView({ thread: t, mock: null }, "en", NOW)!;
    expect(v.question).toMatchObject({
      answered: false,
      label: "Your question did not get an answer",
      text: "Why is 7 prime?",
      primary: { href: "/chat?examCode=SSC_CGL&session=sess_abcdefgh&f=answer", label: "Get the answer now →" },
      followUp: null,
    });
    // An empty stored reply is no answer either.
    expect(pickupView({ thread: thread({ lastContent: "  " }), mock: null }, "en", NOW)!.question!.answered).toBe(false);
  });

  it("a general chat links to the general scope and says so", () => {
    const v = pickupView({ thread: thread({ examCode: null, examShort: null, lastAt: hoursAgo(1) }), mock: null }, "en", NOW)!;
    expect(v.question!.primary.href).toBe("/chat?general=1&session=sess_abcdefgh");
    expect(v.question!.meta).toBe("General · today");
  });

  it("a mistake review: its title, and 'Next mistake' as the follow-up", () => {
    const seed = "I just took a SSC CGL mock and got 12 questions wrong — weakest: Percentages. Go through my mistakes one by one";
    const t = thread({ opener: seed, lastUser: "Next mistake", lastTyped: null, reviewMockTitle: "SSC CGL Full Mock 3" });
    const v = pickupView({ thread: t, mock: null }, "en", NOW)!;
    expect(v.question!.text).toBe("Mistake review: SSC CGL Full Mock 3");
    expect(v.question!.followUp).toEqual({ href: "/chat?examCode=SSC_CGL&session=sess_abcdefgh&f=next", label: REVIEW_CHIPS.en[0] });
  });

  it("unanswered quotes exactly the message that got no answer; answered quotes the typed words; cut to the title length", () => {
    // Unanswered: the waiting row itself — never the earlier question that WAS answered.
    const chipWaiting = thread({ lastRole: "USER", lastUser: "Give me 3 practice questions on this", lastTyped: "Explain ratios", opener: "Explain ratios" });
    expect(pickupQuestionText(chipWaiting, "en")).toBe("Give me 3 practice questions on this");
    // A mistake review whose own seed got no answer reads as its title.
    const seed = "I just took a SSC CGL mock and got 12 questions wrong. Go through my mistakes one by one";
    const reviewWaiting = thread({ lastRole: "USER", lastUser: seed, opener: seed, lastTyped: null, reviewMockTitle: null });
    expect(pickupQuestionText(reviewWaiting, "en")).toBe("Mistake review: SSC CGL mock");
    // Answered, with no typed question at all → the chat's title (its opener).
    const seededOnly = thread({ lastTyped: null, lastUser: "I'm weak in Percentages for SSC CGL. Tutor me on this topic.", opener: "I'm weak in Percentages for SSC CGL. Tutor me on this topic." });
    expect(pickupQuestionText(seededOnly, "en")).toBe("I'm weak in Percentages for SSC CGL. Tutor me on this topic.");
    // Answered, the last row ours → the latest typed question.
    const chip = thread({ lastUser: "Give me a similar question", lastTyped: "What is a harmonic mean?" });
    expect(pickupQuestionText(chip, "en")).toBe("What is a harmonic mean?");
    const long = "x".repeat(200);
    const cut = pickupQuestionText(thread({ lastTyped: long, lastUser: long }), "en");
    expect(Array.from(cut).length).toBe(TITLE_CHARS);
    expect(cut.endsWith("…")).toBe(true);
  });

  it("speaks Hindi and Telugu", () => {
    const hi = pickupView({ thread: thread({ lastRole: "USER" }), mock: mock() }, "hi", NOW)!;
    expect(hi.title).toBe("जहाँ छोड़ा था, वहीं से शुरू करें");
    expect(hi.question!.label).toBe("आपके सवाल का जवाब नहीं आया था");
    expect(hi.mock!.weak[0].detail).toBe("2 में से 0 सही");
    const te = pickupView({ thread: thread(), mock: null }, "te", NOW)!;
    expect(te.question!.followUp!.label).toBe(PRACTICE_FOLLOW_UP.te);
    expect(te.question!.meta).toBe("SSC CGL · నిన్న");
  });

  it("en / hi / te parity: every line in every language, the placeholders kept", () => {
    const en = pickupCopy("en");
    for (const l of ["hi", "te"]) {
      const c = pickupCopy(l);
      expect(Object.keys(c).sort()).toEqual(Object.keys(en).sort());
      for (const k of Object.keys(en) as Array<keyof typeof en>) {
        expect(c[k].trim().length, `${l}.${k}`).toBeGreaterThan(0);
        expect(c[k].match(/\{\w+\}/g)?.sort() ?? [], `${l}.${k}`).toEqual(en[k].match(/\{\w+\}/g)?.sort() ?? []);
      }
      expect(PRACTICE_FOLLOW_UP[l as "hi" | "te"].trim().length).toBeGreaterThan(0);
    }
    const qen = quizRecallCopy("en");
    for (const l of ["hi", "te"]) {
      const c = quizRecallCopy(l);
      for (const k of Object.keys(qen) as Array<keyof typeof qen>) {
        expect(c[k].trim().length, `${l}.${k}`).toBeGreaterThan(0);
        expect(c[k].match(/\{\w+\}/g)?.sort() ?? [], `${l}.${k}`).toEqual(qen[k].match(/\{\w+\}/g)?.sort() ?? []);
      }
    }
    // Any other locale falls back to English.
    expect(pickupCopy("ta")).toEqual(en);
  });

  it("nothing to pick up → no card", () => {
    expect(pickupView({ thread: null, mock: null }, "en", NOW)).toBeNull();
    expect(pickupView(null, "en", NOW)).toBeNull();
  });
});

describe("pickup card — the last result", () => {
  it("score, day, results link and the weakest topics with the results page's own seed", () => {
    const v = pickupView({ thread: null, mock: mock() }, "en", NOW)!;
    expect(v.question).toBeNull();
    expect(v.mock).toMatchObject({
      attemptId: "att_abcdefgh",
      label: "Your last result",
      title: "SSC CGL Full Mock 3",
      score: "62.5%",
      meta: "SSC CGL · yesterday",
      href: "/attempts/att_abcdefgh/results",
    });
    expect(v.mock!.weak.map((w) => w.name)).toEqual(["Simple Interest", "Averages", "Percentages"]);
    const first = v.mock!.weak[0];
    expect(first.detail).toBe("0/2 right");
    const seed = new URL(`https://shishya.in${first.href}`).searchParams.get("seed")!;
    expect(seed).toBe(weakTopicSeed("SSC CGL", { name: "Simple Interest", correct: 0, total: 2 }));
    expect(first.href).toContain("examCode=SSC_CGL&topicCode=SI&seed=");
    // The memory knows it as a weak topic the student asked about; it is ours, not theirs.
    expect(weakTopicOfSeed(seed)).toEqual({ name: "Simple Interest", examShort: "SSC CGL" });
    expect(isOurTutorPrompt(seed)).toBe(true);
  });

  it("weakTopicsOf: misses only, lowest share right first, then most missed, capped; odd shapes → []", () => {
    // SI 0/2 first; PERC and AVG tie at 1/4 with 3 missed each → by name; TW 2/3 last.
    expect(weakTopicsOf(mock().topicScores, 10).map((w) => w.code)).toEqual(["SI", "AVG", "PERC", "TW"]);
    expect(weakTopicsOf(mock().topicScores, 2).map((w) => w.code)).toEqual(["SI", "AVG"]);
    expect(weakTopicsOf(null)).toEqual([]);
    expect(weakTopicsOf([1, 2])).toEqual([]);
    expect(weakTopicsOf({ a: { topicCode: "X", topicName: "X", correct: 3, total: 3 } })).toEqual([]);
    expect(weakTopicsOf({ a: { topicCode: "", topicName: "X", correct: 0, total: 3 }, b: "junk" })).toEqual([]);
    expect(pickupView({ thread: null, mock: mock({ topicScores: null, scorePct: null }) }, "en", NOW)!.mock).toMatchObject({ weak: [], score: "—" });
  });
});

describe("the one-tap follow-up (src/lib/pickup-followup.ts)", () => {
  const bubbles = (last: "reply" | "failed" | "user") => [
    { id: "h-1", role: "user" as const, content: "Explain ratios", turnId: "t1" },
    ...(last === "reply"
      ? [{ id: "h-2", role: "assistant" as const, content: "Ratios compare…" }]
      : last === "failed"
        ? [{ id: "h-1-none", role: "assistant" as const, content: "", failed: true }]
        : []),
  ];

  it("only with a reopened conversation, never with a seed, only known kinds", () => {
    expect(pickupFollowUpParam({ f: "practice", session: "sess_abcdefgh" })).toBe("practice");
    expect(pickupFollowUpParam({ f: "answer", session: "sess_abcdefgh" })).toBe("answer");
    expect(pickupFollowUpParam({ f: "next", session: "sess_abcdefgh" })).toBe("next");
    expect(pickupFollowUpParam({ f: "practice" })).toBeNull();
    expect(pickupFollowUpParam({ f: "practice", session: "sess_abcdefgh", seed: "hello" })).toBeNull();
    expect(pickupFollowUpParam({ f: "Tell me a joke", session: "sess_abcdefgh" })).toBeNull();
    expect(pickupFollowUpParam({ f: "practice", session: "bad id!" })).toBeNull();
  });

  it("sends only our own fixed words — listed as ours, never taken for the student's", () => {
    for (const lang of ["en", "hi", "te"] as const) {
      const practice = followUpText("practice", lang)!;
      expect(practice).toBe(PRACTICE_FOLLOW_UP[lang]);
      expect(isOurTutorPrompt(practice)).toBe(true);
      expect(isTypedQuestion(practice)).toBe(false);
      expect(followUpText("next", lang)).toBe(REVIEW_CHIPS[lang][0]);
      expect(followUpText("answer", lang)).toBeNull();
    }
  });

  it("answer → Retry only when the last turn is retryable; practice/next only under a complete reply", () => {
    const base = { busy: false, closed: false, lang: "en" as const };
    expect(followUpAction({ ...base, kind: "answer", messages: bubbles("failed") })).toEqual({ type: "retry" });
    expect(followUpAction({ ...base, kind: "answer", messages: bubbles("reply") })).toBeNull();
    expect(followUpAction({ ...base, kind: "practice", messages: bubbles("reply") })).toEqual({ type: "send", text: PRACTICE_FOLLOW_UP.en });
    expect(followUpAction({ ...base, kind: "next", messages: bubbles("reply"), lang: "hi" })).toEqual({ type: "send", text: REVIEW_CHIPS.hi[0] });
    // Never stacked on a question still waiting for its answer.
    expect(followUpAction({ ...base, kind: "practice", messages: bubbles("failed") })).toBeNull();
    expect(followUpAction({ ...base, kind: "practice", messages: bubbles("user") })).toBeNull();
    // Never busy, never closed, never without a kind.
    expect(followUpAction({ ...base, kind: "practice", messages: bubbles("reply"), busy: true })).toBeNull();
    expect(followUpAction({ ...base, kind: "answer", messages: bubbles("failed"), closed: true })).toBeNull();
    expect(followUpAction({ ...base, kind: null, messages: bubbles("reply") })).toBeNull();
  });

  it("once per conversation state per tab, and ?f= leaves the URL", () => {
    expect(followUpOnceKey("sess_abcdefgh", "practice", bubbles("reply"))).toBe("shishya_pickup_f:sess_abcdefgh:practice:h-2");
    expect(stripFollowUpParam("https://shishya.in/chat?examCode=SSC_CGL&session=s1abcdefg&f=answer")).toBe(
      "https://shishya.in/chat?examCode=SSC_CGL&session=s1abcdefg",
    );
    expect(stripFollowUpParam("https://shishya.in/chat?general=1&session=s1abcdefg")).toBeNull();
    expect(stripFollowUpParam("not a url")).toBeNull();
  });
});

describe("the next-day mail line", () => {
  const q = (over: Partial<EmailQuestionRow> = {}): EmailQuestionRow => ({
    sessionId: "sess_abcdefgh",
    examCode: "SSC_CGL",
    content: "How do I solve compound interest questions fast?",
    createdAt: hoursAgo(20),
    answered: true,
    isLastUser: true,
    ...over,
  });

  it("the student's own last TYPED question — Shishya's prompts and quick replies are skipped", () => {
    const rows = [
      q({ content: "Next mistake", createdAt: hoursAgo(1) }),
      q({ content: "I'm weak in Percentages for SSC CGL. Tutor me on this topic.", createdAt: hoursAgo(2) }),
      q({ content: "Why does the base change in successive percentages?", createdAt: hoursAgo(3) }),
    ];
    expect(pickEmailQuestion(rows)?.content).toBe("Why does the base change in successive percentages?");
    expect(pickEmailQuestion([q({ content: PRACTICE_FOLLOW_UP.en })])).toBeNull();
    expect(pickEmailQuestion([])).toBeNull();
  });

  it("the quote: at most 60 characters, control characters out", () => {
    const quote = emailQuote(`a\u0000b\nc ${"word ".repeat(40)}`);
    expect(Array.from(quote).length).toBeLessThanOrEqual(EMAIL_QUOTE_CHARS);
    expect(quote.startsWith("a b c word")).toBe(true);
    expect(quote.endsWith("…")).toBe(true);
    expect(emailQuote("   ")).toBe("");
    // Bidi controls (the "Trojan Source" set) are stripped too.
    expect(emailQuote("abc\u202Edef\u2066g\u200Eh")).toBe("abc def g h");
  });

  it("the quote's character class is written as escapes — no invisible bidi characters in the source", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "src/lib/pickup.ts"), "utf8");
    expect(src).not.toMatch(/[\u200E\u200F\u202A-\u202E\u2066-\u2069]/);
  });

  it("answered: 'Yesterday you asked the tutor', the saved chat, escaped HTML", () => {
    const line = pickupEmailLine(q({ content: `<script>alert("x")</script> & 'y'` }), NOW, ADULT)!;
    expect(line.text).toBe(
      `💬 Yesterday you asked the tutor: “<script>alert("x")</script> & 'y'” — pick up where you left off: https://shishya.in/chat?examCode=SSC_CGL&session=sess_abcdefgh&utm_content=pickup`,
    );
    expect(line.html).not.toContain("<script>");
    expect(line.html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;y&#39;");
    expect(line.html).toContain(`href="https://shishya.in/chat?examCode=SSC_CGL&amp;session=sess_abcdefgh&amp;utm_content=pickup"`);
    expect(line.html).toContain("Pick up where you left off →");
  });

  it("unanswered: says so, and links into its answer (f=answer)", () => {
    const line = pickupEmailLine(q({ answered: false, examCode: null }), NOW, ADULT)!;
    expect(line.text).toContain("it did not get an answer then. Get the answer now: https://shishya.in/chat?general=1&session=sess_abcdefgh&f=answer&utm_content=pickup");
    expect(line.html).toContain("It did not get an answer then — get the answer now →");
  });

  it("unanswered but no longer the chat's last student turn: the neutral line and the plain link (Retry would re-send the later turn)", () => {
    const line = pickupEmailLine(q({ answered: false, isLastUser: false }), NOW, ADULT)!;
    expect(line.text).toBe(
      "💬 Yesterday you asked the tutor: “How do I solve compound interest questions fast?” — pick up where you left off: https://shishya.in/chat?examCode=SSC_CGL&session=sess_abcdefgh&utm_content=pickup",
    );
    expect(line.text).not.toContain("f=answer");
    expect(line.html).not.toContain("f=answer");
    expect(line.html).not.toContain("did not get an answer");
    expect(line.html).toContain("Pick up where you left off →");
    // An answered question is the same whatever came after it.
    expect(pickupEmailLine(q({ isLastUser: false }), NOW, ADULT)!.text).toBe(pickupEmailLine(q(), NOW, ADULT)!.text);
  });

  it("today / yesterday / two days ago only; none, empty, older or future → no line", () => {
    expect(pickupEmailLine(q({ createdAt: hoursAgo(2) }), NOW, ADULT)!.text.startsWith("💬 Earlier today")).toBe(true);
    expect(pickupEmailLine(q({ createdAt: hoursAgo(40) }), NOW, ADULT)!.text.startsWith("💬 Two days ago")).toBe(true);
    expect(pickupEmailLine(q({ createdAt: hoursAgo(24 * 3 + 12) }), NOW, ADULT)).toBeNull();
    expect(pickupEmailLine(q({ createdAt: new Date(NOW.getTime() + 2 * 86_400_000) }), NOW, ADULT)).toBeNull();
    expect(pickupEmailLine(q({ content: " \n " }), NOW, ADULT)).toBeNull();
    expect(pickupEmailLine(null, NOW, ADULT)).toBeNull();
  });

  it("2 Oct 2026: a school-age account never gets the line — the same question, no quote", () => {
    expect(pickupEmailLine(q(), NOW, ADULT)).not.toBeNull();
    expect(pickupEmailLine(q(), NOW, { schoolAge: true })).toBeNull();
  });

  it("the founder's wave copy never carries a student's quote", () => {
    const line = pickupEmailLine(q(), NOW, ADULT)!;
    const html = `<p>Daily 5</p>${line.html}<p>end</p>`;
    const text = `Daily 5\n\n${line.text}\n\nend`;
    expect(withoutPrivateParts(html, [line.html, line.text])).toBe("<p>Daily 5</p><p>end</p>");
    expect(withoutPrivateParts(text, [line.html, line.text])).not.toContain("compound interest");
    expect(withoutPrivateParts(html, undefined)).toBe(html);
    expect(withoutPrivateParts(undefined, [line.text])).toBeUndefined();
  });

  it("escapeHtml escapes the five characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

// ── Source seams ───────────────────────────────────────────────────────

const ROOT = process.cwd();
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");

describe("where the card and the line live", () => {
  it("the hub: a client strip, mounted only for a signed-in member enrolled on this exam", () => {
    const hub = read("src/app/exams/[code]/page.tsx");
    const mounts = hub.match(/<MemberPickupStrip\b[^>]*\/>/g) ?? [];
    expect(mounts).toHaveLength(1);
    expect(hub).toContain("{userId && isEnrolled && <MemberPickupStrip examCode={exam.code} locale={locale} />}");
    // No server-rendered pickup on the hub: the card only arrives through the island.
    expect(hub).not.toMatch(/loadPickup|pickupView|<PickupCard/);
    const strip = read("src/components/MemberPickupStrip.tsx");
    expect(strip.startsWith('"use client"')).toBe(true);
    expect(strip).toContain("/api/me/pickup?examCode=");
    expect(strip).toMatch(/useEffect\(/);
  });

  it("home 'For you' opens with the card; the dashboard carries it near the top", () => {
    const home = read("src/components/home/HomeForYou.tsx");
    const grid = home.indexOf('<div className="mt-4 grid gap-3 sm:grid-cols-2">');
    expect(grid).toBeGreaterThan(0);
    expect(home.indexOf("<PickupCard", grid)).toBeGreaterThan(grid);
    expect(home.indexOf("<PickupCard", grid)).toBeLessThan(home.indexOf("{resume && (", grid));
    const dash = read("src/app/dashboard/page.tsx");
    expect(dash).toContain('{pickup && <PickupCard view={pickup} surface="dashboard" className="mt-5" />}');
    expect(dash.indexOf("<PickupCard")).toBeLessThan(dash.indexOf("<EducatorCard"));
  });

  it("the chat page passes a follow-up only with a reopened chat, never to the school chat", () => {
    const page = read("src/app/chat/page.tsx");
    expect(page).toContain("const followUp = viewerId ? pickupFollowUpParam(sp) : null;");
    expect(page).toContain("followUp={generalResume ? followUp : null}");
    expect(page).toContain("followUp={examResume ? followUp : null}");
    expect(page.match(/followUp=\{/g)).toHaveLength(2);
    const island = read("src/app/chat/ChatInterface.tsx");
    expect(island).toMatch(/if \(!followUp \|\| !resume \|\| school \|\| !langReady \|\| followUpFiredRef\.current\) return;/);
    expect(island).toContain("stripFollowUpParam(window.location.href)");
    expect(island).toContain("window.sessionStorage.setItem(key, \"1\")");
  });

  it("both morning mails carry the line; the founder copy drops it; no new email type", () => {
    const email = read("src/lib/email.ts");
    expect(email.match(/\$\{p\.pickup\?\.html \?\? ""\}/g)).toHaveLength(2);
    expect(email.match(/privateParts: p\.pickup \? \[p\.pickup\.html, p\.pickup\.text\] : undefined/g)).toHaveLength(2);
    expect(email).toContain("html: withoutPrivateParts(payload.html, payload.privateParts),");
    for (const f of ["src/app/api/cron/daily-five/route.ts", "src/app/api/cron/coach-morning/route.ts"]) {
      const src = read(f);
      expect(src).toContain("loadEmailQuestions(");
      expect(src).toMatch(/pickupEmailLine\(lastQuestions\.get\(/);
    }
    // The Daily-5 leaves the quote out for anyone the coach mail reached in the last 20 hours.
    expect(read("src/app/api/cron/daily-five/route.ts")).toContain("WHERE tag = 'coach-morning' AND \"sentAt\" > NOW() - INTERVAL '20 hours'");
    const vercel = read("vercel.json");
    expect(vercel).not.toContain("pickup");
  });
});
