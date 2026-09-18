// Pure unit tests for the app-surface copy modules added on 16 Sep 2026
// (i18n.6, i18n.8, i18n.10, i18n.11, i18n.14): /ideas and its cards, the
// dashboard and results cards, the quiz and mock entry points, the /share
// landing and the discussion disclosure labels.
//
// No DB, no network. Run with:
//   npx vitest run tests/unit/i18n-c-app-copy.test.ts
//
// What these tests are for:
//   1. English must be BYTE-IDENTICAL to the literals these modules
//      replaced. Every one of these surfaces is read by English visitors
//      and (on /ideas, /discussions, /exams/*/build-mock) by crawlers that
//      send no cookie, so an English change would be a search-surface
//      change. The tables below hold the pre-change strings verbatim.
//      One deliberate exception (review pass, 16 Sep 2026): the two quiz
//      headers no longer call the questions "real {exam} questions" — the
//      quiz draws from every validated MCQ, whatever its source — and say
//      "in the {exam} pattern" in en, hi and te alike. Both pages are
//      noindex, so this is not a search-surface change.
//   2. hi and te must exist for every key, be non-empty, and carry exactly
//      the same {placeholders} as English — a dropped {n} silently prints
//      a sentence with a hole in it.
//   3. The honesty words must survive translation: "pattern" on the
//      PYQ-pattern and full-mock lines, "Shishya" on the seed-thread
//      disclosure, "not a student" on the AI reply tag, and the hedge in
//      "marked built".

import { afterEach, describe, it, expect, vi } from "vitest";

import { asCopyLocale, clientUiLocale, COPY_LOCALES, pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";
import {
  builtForYouCopy,
  builtForYouHeadingFor,
  builtForYouShareFor,
  builtWithoutRecordFor,
  ideaCardCopy,
  ideaStatusLabelFor,
  ideasPageCopy,
  markedBuiltFor,
} from "@/lib/ideas-copy";
import {
  dailyFiveCopy,
  inviteCopy,
  inviteMessage,
  rankBlockCopy,
  shareScoreCopy,
} from "@/lib/dashboard-cards-copy";
import {
  buildMockCopy,
  examPickerCopy,
  examQuizCopy,
  fullMockCopy,
  mockStartCopy,
  topicQuizCopy,
} from "@/lib/quiz-entry-copy";
import {
  resolveShareLandingLocale,
  shareLandingCopy,
  shareLandingPath,
  shareLinkLocale,
  shareQuizPath,
} from "@/lib/share-landing-copy";
import { shareUrl } from "@/lib/share-url";
import { discussionLabelsCopy } from "@/lib/discussion-labels-copy";
import { homeStripCopy } from "@/lib/home-strip-copy";
import {
  BUILT_WITHOUT_RECORD_LINE,
  FEATURE_REQUEST_STATUSES,
  PUBLIC_STATUS_LABEL,
  builtForYouHeading,
  builtForYouShareMessage,
  formatShipDate,
  markedBuiltLabel,
  type ShipRole,
} from "@/lib/feature-requests";

type Copy = Record<string, string>;
type Builder = (locale: string) => Copy;
/** The *Copy shapes are interfaces (no index signature), so viewing one as a
 *  plain string map goes through unknown — type-only, nothing at runtime. */
const asBuilder =
  (build: (locale: string) => object): Builder =>
  (locale) =>
    build(locale) as unknown as Copy;

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

/** Every surface, by the builder that returns its strings. */
const SURFACES: ReadonlyArray<readonly [string, Builder]> = [
  ["ideas page", asBuilder(ideasPageCopy)],
  ["idea card", asBuilder(ideaCardCopy)],
  ["built for you", asBuilder(builtForYouCopy)],
  ["invite", asBuilder(inviteCopy)],
  ["daily five", asBuilder(dailyFiveCopy)],
  ["rank block", asBuilder(rankBlockCopy)],
  ["share score", asBuilder(shareScoreCopy)],
  ["exam quiz", asBuilder(examQuizCopy)],
  ["topic quiz", asBuilder(topicQuizCopy)],
  ["full mock", asBuilder(fullMockCopy)],
  ["mock start", asBuilder(mockStartCopy)],
  ["build mock", asBuilder(buildMockCopy)],
  ["exam picker", asBuilder(examPickerCopy)],
  ["share landing", asBuilder(shareLandingCopy)],
  ["discussion labels", asBuilder(discussionLabelsCopy)],
];

describe("locale picking", () => {
  it("only en, hi and te exist; everything else is English", () => {
    expect([...COPY_LOCALES]).toEqual(["en", "hi", "te"]);
    expect(asCopyLocale("hi")).toBe("hi");
    expect(asCopyLocale("te")).toBe("te");
    for (const other of ["en", "mr", "ta", "kn", "EN", "", null, undefined, "hi-IN"]) {
      expect(asCopyLocale(other)).toBe("en");
    }
  });

  it("pickCopy falls back to English on a locale we have no words for", () => {
    const map: Record<CopyLocale, string> = { en: "E", hi: "H", te: "T" };
    expect(pickCopy(map, "hi")).toBe("H");
    expect(pickCopy(map, "ta")).toBe("E");
    expect(pickCopy(map, null)).toBe("E");
  });

  it("clientUiLocale is English with no document (server render)", () => {
    expect(clientUiLocale()).toBe("en");
  });
});

describe("clientUiLocale in a browser follows getLocale()'s order: URL prefix, then cookie", () => {
  afterEach(() => vi.unstubAllGlobals());
  const browser = (pathname: string, cookie: string) => {
    vi.stubGlobal("document", { cookie });
    vi.stubGlobal("location", { pathname });
  };

  it("reads the shishya-lang cookie on an un-prefixed URL", () => {
    browser("/dashboard", "a=1; shishya-lang=hi; b=2");
    expect(clientUiLocale()).toBe("hi");
    browser("/exams/SSC_CGL", "shishya-lang=te");
    expect(clientUiLocale()).toBe("te");
    browser("/exams/SSC_CGL", "shishya-lang=mr");
    expect(clientUiLocale()).toBe("en");
    browser("/exams/SSC_CGL", "");
    expect(clientUiLocale()).toBe("en");
  });

  it("a /hi or /te twin URL beats the cookie, as it does on the server", () => {
    browser("/hi/exams/SSC_CGL/pyq/2024", "shishya-lang=en");
    expect(clientUiLocale()).toBe("hi");
    browser("/te", "shishya-lang=hi");
    expect(clientUiLocale()).toBe("te");
  });

  it("a path that merely starts with the letters is not a twin", () => {
    browser("/hindi-typing", "shishya-lang=te");
    expect(clientUiLocale()).toBe("te");
    browser("/terms", "");
    expect(clientUiLocale()).toBe("en");
  });
});

describe("every surface has all three languages, with the same placeholders", () => {
  for (const [name, build] of SURFACES) {
    it(`${name}`, () => {
      const en = build("en");
      const keys = Object.keys(en);
      expect(keys.length).toBeGreaterThan(0);
      for (const locale of ["hi", "te"] as const) {
        const other = build(locale);
        expect(Object.keys(other).sort()).toEqual([...keys].sort());
        for (const k of keys) {
          // A key may be deliberately empty in English only (scoredAfter).
          if (en[k] !== "") expect(other[k], `${name}.${k} (${locale})`).not.toBe("");
          expect(placeholders(other[k]), `${name}.${k} (${locale}) placeholders`).toEqual(placeholders(en[k]));
        }
      }
    });
  }

  it("an unknown locale returns exactly the English entry", () => {
    for (const [, build] of SURFACES) {
      expect(build("ta")).toEqual(build("en"));
    }
  });
});

// ── English, byte for byte ───────────────────────────────────────────────
// Each expected value is the literal that used to sit in the JSX.

describe("English is unchanged — /ideas (i18n.6)", () => {
  const C = ideasPageCopy("en");
  const card = ideaCardCopy("en");

  it("board headings and notes", () => {
    expect(C.home).toBe("Home");
    expect(C.crumb).toBe("Ideas");
    expect(C.h1).toBe("Ideas board");
    expect(C.introBefore + C.pill + C.introAfter).toBe(
      "What students asked us to build — what is built so far, and what is still open. Upvote the open ones you want next, or click the 💡 Suggest a feature pill on any page to add your own.",
    );
    expect(C.all).toBe("All");
    expect(C.emptyBoard).toBe(
      "No ideas in this area yet. Be the first to suggest one — click the pill at the bottom-right of any page.",
    );
    expect(C.builtHeading).toBe("Built");
    expect(C.builtNote).toBe(
      "Ideas the Shishya team has marked built. The date is the day it was marked, not necessarily the day it went live.",
    );
    expect(C.openHeading).toBe("Still open");
    expect(C.upvoteHint).toBe("Upvote the ones you want built next.");
    expect(C.upvoteHintSignedOut).toBe("Sign in to upvote the ones you want built next.");
    expect(C.emptyOpen).toBe("No open ideas in this area. Suggest one from the pill at the bottom-right of any page.");
    expect(C.footer.replace("{built}", "3").replace("{open}", "12")).toBe("3 built · 12 open shown.");
  });

  it("card labels, including the upvote aria text's plural", () => {
    expect(card.votingClosed).toBe("Voting is closed on built ideas");
    expect(card.votesClosedOne.replace("{n}", "1")).toBe("1 upvote, voting closed");
    expect(card.votesClosedMany.replace("{n}", "4")).toBe("4 upvotes, voting closed");
    expect(card.removeUpvote).toBe("Remove your upvote");
    expect(card.upvoteThis).toBe("Upvote this idea");
    expect(card.signInToUpvote).toBe("Sign in to upvote");
    expect(card.showMore).toBe("Show more");
    expect(card.showLess).toBe("Show less");
    expect(card.whatWeBuilt).toBe("What we built:");
    expect(card.openIt).toBe("Open it →");
    expect(card.anon).toBe("anon");
    expect(card.justNow).toBe("just now");
    expect(card.minAgo.replace("{n}", "7")).toBe("7m ago");
    expect(card.hourAgo.replace("{n}", "3")).toBe("3h ago");
    expect(card.dayAgo.replace("{n}", "12")).toBe("12d ago");
  });

  it("status chips and the no-record line: English is feature-requests.ts itself", () => {
    expect(C.statusOpen).toBe("Open");
    expect(C.statusUnderReview).toBe("Under review");
    expect(C.statusPlanned).toBe("Planned");
    expect(C.statusBuilt).toBe("Built");
    expect(C.statusDeclined).toBe("Declined");
    expect(C.noRecord).toBe("Marked built without a note — no description or link yet.");
    for (const s of FEATURE_REQUEST_STATUSES) {
      expect(ideaStatusLabelFor("en", s)).toBe(PUBLIC_STATUS_LABEL[s]);
      expect(ideaStatusLabelFor("ta", s)).toBe(PUBLIC_STATUS_LABEL[s]);
      for (const locale of ["hi", "te"] as const) {
        expect(ideaStatusLabelFor(locale, s)).not.toBe("");
        expect(ideaStatusLabelFor(locale, s)).not.toBe(PUBLIC_STATUS_LABEL[s]);
      }
    }
    // An unknown stored value reads as Open, as the page always did.
    expect(ideaStatusLabelFor("en", "WHATEVER")).toBe("Open");
    expect(ideaStatusLabelFor("hi", "WHATEVER")).toBe(ideasPageCopy("hi").statusOpen);
    expect(builtWithoutRecordFor("en")).toBe(BUILT_WITHOUT_RECORD_LINE);
    expect(builtWithoutRecordFor("hi")).toBe(ideasPageCopy("hi").noRecord);
    expect(builtWithoutRecordFor("te")).toBe(ideasPageCopy("te").noRecord);
  });

  it("the built-for-you heading delegates to the English-only builder", () => {
    const sets: ShipRole[][] = [
      ["asked"],
      ["upvoted"],
      ["asked", "asked"],
      ["upvoted", "upvoted"],
      ["asked", "upvoted"],
    ];
    for (const roles of sets) {
      expect(builtForYouHeadingFor("en", roles)).toBe(builtForYouHeading(roles));
      // Other languages take the matching branch and stay non-empty.
      for (const locale of ["hi", "te"] as const) {
        expect(builtForYouHeadingFor(locale, roles)).not.toBe("");
        expect(builtForYouHeadingFor(locale, roles)).not.toBe(builtForYouHeading(roles));
      }
    }
  });

  it("the ship date keeps its hedge, and English delegates", () => {
    const at = "2026-09-13T04:30:00.000Z";
    expect(markedBuiltFor("en", at)).toBe(markedBuiltLabel(at));
    expect(markedBuiltFor("en", at, { capital: false })).toBe(markedBuiltLabel(at, { capital: false }));
    const date = formatShipDate(at);
    for (const locale of ["hi", "te"] as const) {
      const line = markedBuiltFor(locale, at);
      // The date itself is never translated away…
      expect(line).toContain(date);
      // …and the sentence is never a bare date: the "marked" hedge is the
      // whole point, so the line must carry words around it.
      expect(line).not.toBe(date);
      expect(line.length).toBeGreaterThan(date.length + 3);
    }
  });

  it("the share line delegates in English and keeps the title in every language", () => {
    for (const role of ["asked", "upvoted"] as const) {
      expect(builtForYouShareFor("en", role, "Topic-wise PYQ")).toBe(builtForYouShareMessage(role, "Topic-wise PYQ"));
      for (const locale of ["hi", "te"] as const) {
        expect(builtForYouShareFor(locale, role, "Topic-wise PYQ")).toContain("Topic-wise PYQ");
        expect(builtForYouShareFor(locale, role, "Topic-wise PYQ")).toContain("Shishya");
      }
    }
  });
});

describe("English is unchanged — dashboard and results cards (i18n.8)", () => {
  const FREE = "free mock tests, previous-year papers & an AI tutor in your own language";

  it("the four invite messages, with and without a first name", () => {
    expect(inviteMessage("en", { firstName: "Ravi", examShort: "SSC CGL", moment: "personal-best", scoreDisplay: "72%" })).toBe(
      `Ravi here — I just hit my personal best (72%) on a SSC CGL mock on Shishya — ${FREE}. Study with me:`,
    );
    expect(inviteMessage("en", { firstName: null, examShort: "SSC CGL", moment: "personal-best", scoreDisplay: null })).toBe(
      `I just hit my personal best on a SSC CGL mock on Shishya — ${FREE}. Study with me:`,
    );
    expect(inviteMessage("en", { firstName: "Ravi", examShort: "CTET", moment: "first-mock" })).toBe(
      `Ravi here — I just took my first CTET mock on Shishya — ${FREE}. Take yours and let's compare:`,
    );
    expect(inviteMessage("en", { firstName: "Ravi", examShort: "CTET" })).toBe(
      `Ravi here — I'm prepping for CTET free on Shishya — ${FREE}, all free. Study with me:`,
    );
    expect(inviteMessage("en", { firstName: null, examShort: null })).toBe(
      `I'm prepping on Shishya — ${FREE} for government exams. Study with me:`,
    );
    // A moment with no exam falls back to the plain lines, as before.
    expect(inviteMessage("en", { firstName: null, examShort: null, moment: "first-mock" })).toBe(
      `I'm prepping on Shishya — ${FREE} for government exams. Study with me:`,
    );
  });

  it("the invite messages carry the student's own numbers in every language", () => {
    for (const locale of ["hi", "te"] as const) {
      const m = inviteMessage(locale, { firstName: "Ravi", examShort: "SSC CGL", moment: "personal-best", scoreDisplay: "72%" });
      expect(m).toContain("Ravi");
      expect(m).toContain("72%");
      expect(m).toContain("SSC CGL");
      expect(m).toContain("Shishya");
      // No promise of a reward or a counter was introduced anywhere.
      expect(m).not.toMatch(/₹|\bbonus\b|\breward\b/i);
    }
  });

  it("one WhatsApp line speaks to the friend in one register", () => {
    // The hi/te messages say तुम / నువ్వు to the friend ("तुम भी दो",
    // "నువ్వూ రాయి"), so no part of the same line may say आप / మీ.
    const moments = [
      { examShort: "SSC CGL", moment: "personal-best" as const, scoreDisplay: "72%" },
      { examShort: "SSC CGL", moment: "first-mock" as const },
      { examShort: "SSC CGL" },
      { examShort: null },
    ];
    for (const p of moments) {
      expect(inviteMessage("hi", { firstName: "Ravi", ...p })).not.toMatch(/आप/);
      expect(inviteMessage("te", { firstName: "Ravi", ...p })).not.toMatch(/మీ(?![ఀ-౿])|మీరు/);
    }
  });

  it("invite headings and bodies", () => {
    const C = inviteCopy("en");
    expect(C.headingMoment).toBe("📣 Bring your batch along");
    expect(C.headingDefault).toBe("📣 Prep is easier with your batch");
    expect(C.bodyPersonalBest).toBe(
      "A good day to invite a friend or your WhatsApp study group — they get the same free mocks, papers and tutor. No signup wall to try.",
    );
    expect(C.bodyFirstMock).toBe(
      "Baseline set — invite a friend or your WhatsApp study group to take theirs. Same free mocks, papers and tutor; no signup wall to try.",
    );
    expect(C.bodyDefault).toBe(
      "Invite a friend or your WhatsApp study group — everyone gets the same free mocks, papers and tutor. No signup wall to try.",
    );
    expect(C.shareLabel).toBe("Invite:");
  });

  it("Daily 5", () => {
    const C = dailyFiveCopy("en");
    expect(C.eyebrow).toBe("☀️ Today's 5 · your daily plan");
    expect(C.titleTopic.replace("{topic}", "Polity").replace("{exam}", "SSC CGL")).toBe(
      "5 quick questions on Polity (SSC CGL)",
    );
    expect(C.titleExam.replace("{exam}", "SSC CGL")).toBe("5 quick questions for SSC CGL");
    expect(C.subRotated).toBe("~3 minutes on one of your weakest topics — questions you haven't seen yet.");
    expect(C.subNormal).toBe("~3 minutes on your weakest area.");
    expect(C.streakActive.replace("{n}", "5")).toBe("🔥 5-day streak — already active today, make it count.");
    expect(C.streakKeep.replace("{n}", "5")).toBe("🔥 Keep your 5-day streak alive.");
    expect(C.streakNone).toBe("Do it daily — small reps are how toppers are made.");
    expect(C.building).toBe("Building…");
    expect(C.start).toBe("Start today's 5 →");
    expect(C.errBuild).toBe("Couldn't build today's 5 — try again.");
    expect(C.errNetwork).toBe("Network hiccup — try again.");
  });

  it("the All-India rank block always says what the rank is out of", () => {
    const C = rankBlockCopy("en");
    expect(C.rehearsalRank.replace("{rank}", "12")).toBe("Rank #12");
    expect(C.rehearsalOf.replace("{of}", "340")).toBe("of 340 who took this rehearsal");
    expect(C.airRank.replace("{rank}", "12")).toBe("🇮🇳 All-India Rank #12");
    expect(C.airOf.replace("{of}", "340")).toBe("of 340 across India");
    expect(C.rehearsalNote).toBe("Same paper for everyone who takes it before it closes.");
    expect(C.airNote).toBe("Same paper, same day, whole country.");
    expect(C.nextLive).toBe("Next live test →");
    for (const locale of ["hi", "te"] as const) {
      const L = rankBlockCopy(locale);
      expect(L.rehearsalOf).toContain("{of}");
      expect(L.airOf).toContain("{of}");
    }
  });

  it("share your score, including the WhatsApp message", () => {
    const C = shareScoreCopy("en");
    expect(C.kicker).toBe("🔥 Share your score");
    expect(C.heading).toBe("Tell your prep group you took this mock");
    expect(C.sub).toBe(
      "One tap → WhatsApp message pre-filled with your score and the link. Friends who click see your card and can try 5 questions without signing in.",
    );
    expect(C.whatsapp).toBe("Share on WhatsApp");
    expect(C.copy).toBe("Copy link");
    expect(C.copied).toBe("Copied ✓");
    expect(C.more).toBe("More…");
    expect(C.message.replace("{score}", "72%").replace("{exam}", "SSC CGL").replace("{link}", "L")).toBe(
      "I just scored 72% on a SSC CGL mock at Shishya 🎯\n\nFree mocks, PYQ, AI tutor — see where YOU stand (5 questions, no sign-in):\nL",
    );
    expect(C.nativeTitle.replace("{score}", "72%").replace("{exam}", "SSC CGL")).toBe("Scored 72% on SSC CGL — Shishya");
    // The two blank lines before the link survive translation.
    for (const locale of ["hi", "te"] as const) {
      expect(shareScoreCopy(locale).message).toContain("\n\n");
      expect(shareScoreCopy(locale).message.endsWith("{link}")).toBe(true);
    }
  });
});

describe("English is unchanged — quiz and mock entry points (i18n.10)", () => {
  it("the anonymous exam quiz", () => {
    const C = examQuizCopy("en");
    expect(C.crumb).toBe("Free quiz");
    expect(C.none).toBe("No quiz questions here yet.");
    expect(C.explore.replace("{code}", "SSC_CGL")).toBe("Explore SSC_CGL on Shishya →");
    expect(C.h1.replace("{exam}", "SSC CGL").replace("{n}", "5")).toBe("SSC CGL — free 5-question quiz");
    expect(C.replay.replace("{n}", "5")).toBe(
      "Same 5 questions as the link you opened, in the same order — no signup, instant scoring and solutions.",
    );
    expect(C.fresh.replace("{n}", "5").replace("{exam}", "SSC CGL")).toBe(
      "No signup needed. Answer 5 questions in the SSC CGL pattern, get instant scoring and solutions, then unlock full mocks and your weak-topic map for free.",
    );
  });

  it("no quiz header calls the questions real exam questions, in any language", () => {
    // The quiz draws from every validated MCQ of the exam, whatever its
    // source (src/lib/anon-quiz.ts) — not from original papers. The cutoff
    // nudge that links here already says "in this exam's pattern".
    for (const locale of ["en", "hi", "te"] as const) {
      for (const line of [examQuizCopy(locale).fresh, topicQuizCopy(locale).fresh]) {
        expect(line, locale).not.toMatch(/\breal\b|असली|నిజమైన|అసలు/i);
      }
    }
    expect(examQuizCopy("en").fresh).toContain("pattern");
    expect(topicQuizCopy("en").fresh).toContain("pattern");
    expect(examQuizCopy("hi").fresh).toContain("पैटर्न");
    expect(topicQuizCopy("hi").fresh).toContain("पैटर्न");
    expect(examQuizCopy("te").fresh).toContain("పద్ధతిలో");
    expect(topicQuizCopy("te").fresh).toContain("పద్ధతిలో");
  });

  it("the topic quiz", () => {
    const C = topicQuizCopy("en");
    expect(C.topicFallback).toBe("Topic");
    expect(C.crumb).toBe("Quiz");
    expect(C.none).toBe("No questions for this topic yet.");
    expect(C.back).toBe("← Back to the notes");
    expect(C.h1.replace("{scope}", "Polity")).toBe("Polity — quick quiz");
    expect(C.replay.replace("{n}", "5")).toBe(
      "Same 5 questions as the link you opened, in the same order. Instant scoring and solutions, no signup.",
    );
    expect(C.fresh.replace("{n}", "5").replace("{exam}", "SSC CGL").replace("{scope}", "Polity")).toBe(
      "5 SSC CGL-pattern questions on Polity. Instant scoring and solutions, no signup — see where you stand in a few minutes.",
    );
  });

  it("the full-mock warning keeps the pattern hedge in every language", () => {
    const C = fullMockCopy("en");
    expect(C.headsUp).toBe("Heads up");
    expect(C.close).toBe("Close");
    expect(C.qMin.replace("{q}", "100").replace("{m}", "60")).toBe("100 questions · 60 minutes");
    expect(C.fullLength).toBe("This is a full-length timed mock.");
    expect(C.patternSet.replace("{q}", "20").replace("{paper}", "150")).toBe(
      "This is a 20-question timed set in the pattern of the 150-question paper.",
    );
    expect(C.clockNote).toBe("The clock starts when you click Start and you can't pause it.");
    expect(C.warmupNote.replace("{exam}", "SSC CGL")).toBe(
      "If you've never taken a SSC CGL mock here before, try a quick 10-question warmup first — Shishya picks your weakest topic, adapts to you, and gets you ready for the full mock.",
    );
    expect(C.warmupCta).toBe("Take a 10-Q warmup first →");
    expect(C.startFull.replace("{q}", "100")).toBe("Start the full 100-Q mock anyway");
    expect(C.startSet.replace("{q}", "20")).toBe("Start the 20-question set anyway");
    expect(C.cancel).toBe("Cancel");
    // A 20-of-150 set must never read as the real paper in hi or te.
    expect(fullMockCopy("hi").patternSet).toContain("पैटर्न");
    expect(fullMockCopy("te").patternSet).toContain("పద్ధతి");
  });

  it("the hub mock button's two errors", () => {
    expect(mockStartCopy("en").errStart).toBe("Could not start mock");
    expect(mockStartCopy("en").errNetwork).toBe("Network hiccup — try again.");
  });

  it("the custom mock builder, PYQ-pattern hedge included", () => {
    const C = buildMockCopy("en");
    expect(C.crumb).toBe("Build your own mock");
    expect(C.h1.replace("{exam}", "SSC CGL")).toBe("Build your own SSC CGL mock");
    expect(C.h1Pyq.replace("{exam}", "SSC CGL")).toBe("Topic-wise SSC CGL PYQ-pattern practice");
    expect(C.intro.replace("{n}", "18")).toBe(
      "Pick exactly the topics you want — today polity, tomorrow number system — choose the size and difficulty, and attempt it like any mock: timed, scored, full solutions, weak-topic analysis. Questions can be read in Hindi and 18 other languages inside the test.",
    );
    expect(C.loadFailed).toBe("The topic list couldn't be loaded just now — please refresh the page.");
    expect(
      C.emptyBefore.replace("{exam}", "NEET PG").replace("{min}", "3") +
        C.emptyLink.replace("{exam}", "NEET PG") +
        C.emptyAfter,
    ).toBe(
      "No NEET PG topic has 3 or more checked questions yet, so a topic-wise mock can't be built for this exam. Dates, notifications and results are on the NEET PG exam page.",
    );
    // "PYQ" stays, and so does the word that makes it a pattern claim.
    for (const locale of ["hi", "te"] as const) {
      expect(buildMockCopy(locale).h1Pyq).toContain("PYQ");
    }
    expect(buildMockCopy("hi").h1Pyq).toContain("पैटर्न");
    // Telugu: "PYQ-ప్యాటర్న్" is the term the builder's own toggle and its
    // "not the original papers" note use (build.mode.pyq, build.pyq.note).
    expect(buildMockCopy("te").h1Pyq).toContain("PYQ-ప్యాటర్న్");
  });

  it("the exam picker's one line", () => {
    expect(examPickerCopy("en").alreadyYours).toBe("Already one of your exams:");
  });
});

describe("English is unchanged — /share landing (i18n.11)", () => {
  const C = shareLandingCopy("en");

  it("the two headlines read exactly as before", () => {
    expect(C.scoredBefore.replace("{name}", "Ravi") + "72%" + C.scoredAfter).toBe("Ravi scored 72%");
    expect(C.onMockBefore + "SSC CGL" + C.onMockAfter).toBe("on a SSC CGL mock at Shishya");
    expect(C.sentBefore + "SSC CGL" + C.sentAfter).toBe("A friend sent you a SSC CGL mock");
    expect(C.fromShishya.replace("{exam}", "Staff Selection Commission CGL")).toBe(
      "from Shishya — free mocks, previous-year papers and exam dates for Staff Selection Commission CGL",
    );
  });

  it("the CTA card", () => {
    expect(C.freeNoSignIn).toBe("Free · no sign-in");
    expect(C.ctaHeadingScore.replace("{score}", "72%")).toBe("Your friend scored 72% — check your own 5 questions");
    expect(C.ctaHeadingPlain.replace("{exam}", "SSC CGL")).toBe("Check your own 5 SSC CGL questions");
    expect(C.ctaSub.replace("{exam}", "SSC CGL")).toBe(
      "About 90 seconds: 5 SSC CGL-level questions, graded instantly, with the answers. No account, no app.",
    );
    expect(C.ctaButton.replace("{exam}", "SSC CGL")).toBe("Try 5 SSC CGL questions — no sign-in →");
    expect(C.fineprint.replace("{n}", "19")).toBe("Free · No credit card · 19 languages");
    expect(C.exploreCount.replace("{n}", "178")).toBe("Explore all 178 exams →");
    expect(C.exploreAll).toBe("Explore all exams →");
  });

  it("the no-sign-in promise survives translation", () => {
    for (const locale of ["hi", "te"] as const) {
      const L = shareLandingCopy(locale);
      expect(L.freeNoSignIn).not.toBe("");
      expect(L.ctaButton).toContain("{exam}");
      // The landing never invents a count or a claim of its own.
      expect(L.fineprint).toContain("{n}");
    }
  });
});

describe("a share sent in Hindi or Telugu lands in that language", () => {
  it("the English link is the bare path, exactly as before", () => {
    expect(shareLandingPath("abc123", "en")).toBe("/share/abc123");
    expect(shareLandingPath("abc123", undefined)).toBe("/share/abc123");
    // A locale we have no words for must not tag the link either.
    expect(shareLandingPath("abc123", "mr")).toBe("/share/abc123");
    expect(shareUrl(shareLandingPath("abc123", "en"), { surface: "results", channel: "whatsapp", exam: "SSC_CGL" })).toBe(
      "https://shishya.in/share/abc123?utm_source=whatsapp&utm_medium=share&utm_campaign=results&utm_content=ssc_cgl",
    );
  });

  it("hi and te tag the link, and the utm tags survive next to it", () => {
    expect(shareLandingPath("abc123", "hi")).toBe("/share/abc123?lang=hi");
    expect(shareLandingPath("abc123", "te")).toBe("/share/abc123?lang=te");
    const u = new URL(
      shareUrl(shareLandingPath("abc123", "hi"), { surface: "results", channel: "whatsapp", exam: "SSC_CGL" }),
    );
    expect(u.pathname).toBe("/share/abc123");
    expect(u.searchParams.get("lang")).toBe("hi");
    expect(u.searchParams.get("utm_source")).toBe("whatsapp");
    expect(u.searchParams.get("utm_campaign")).toBe("results");
  });

  it("?lang= can only ever pick a language the landing has", () => {
    expect(shareLinkLocale("hi")).toBe("hi");
    expect(shareLinkLocale(["te", "hi"])).toBe("te");
    for (const junk of [undefined, "", "en", "mr", "HI", "hi-IN", "../x", ["en"]]) {
      expect(shareLinkLocale(junk)).toBeNull();
    }
  });

  it("the visitor's own choice beats the link; only a visitor with none follows it", () => {
    // First-time friend: no cookie, signed out → getLocale() says "en".
    expect(resolveShareLandingLocale({ own: "en", cookie: null, link: "hi" })).toBe("hi");
    expect(resolveShareLandingLocale({ own: "en", cookie: undefined, link: "te" })).toBe("te");
    // An explicit English choice always leaves shishya-lang=en behind.
    expect(resolveShareLandingLocale({ own: "en", cookie: "en", link: "hi" })).toBe("en");
    // Their own Hindi/Telugu (cookie or account) wins over the link.
    expect(resolveShareLandingLocale({ own: "te", cookie: "te", link: "hi" })).toBe("te");
    expect(resolveShareLandingLocale({ own: "hi", cookie: null, link: "te" })).toBe("hi");
    // A language we have no words for stays theirs (the copy falls back to en).
    expect(resolveShareLandingLocale({ own: "mr", cookie: "mr", link: "hi" })).toBe("mr");
    expect(shareLandingCopy(resolveShareLandingLocale({ own: "mr", cookie: "mr", link: "hi" }))).toBe(
      shareLandingCopy("en"),
    );
    // No link language: English, as before.
    expect(resolveShareLandingLocale({ own: "en", cookie: null, link: null })).toBe("en");
  });

  it("the quiz CTA opens the quiz's own twin in hi/te and the plain path in English", () => {
    expect(shareQuizPath("SSC_CGL", "en")).toBe("/exams/SSC_CGL/quiz");
    expect(shareQuizPath("SSC_CGL", "mr")).toBe("/exams/SSC_CGL/quiz");
    expect(shareQuizPath("SSC_CGL", "hi")).toBe("/hi/exams/SSC_CGL/quiz");
    expect(shareQuizPath("SSC_CGL", "te")).toBe("/te/exams/SSC_CGL/quiz");
  });
});

describe("English is unchanged — discussion disclosure labels (i18n.14)", () => {
  it("English matches the 11 Sep 2026 labels exactly", () => {
    const D = discussionLabelsCopy("en");
    expect(D.starter).toBe("Starter question · Shishya");
    expect(D.shishyaAi).toBe("Shishya AI");
    expect(D.aiReply).toBe("AI reply · not a student");
    expect(D.anonymous).toBe("Anonymous");
    expect(D.pinned).toBe("Pinned");
    expect(D.locked).toBe("Locked");
  });

  it("hi and te say the same thing: Shishya's own question, and an AI that is not a student", () => {
    for (const locale of ["hi", "te"] as const) {
      const D = discussionLabelsCopy(locale);
      expect(D.starter).toContain("Shishya");
      expect(D.shishyaAi).toBe("Shishya AI");
      expect(D.aiReply).toContain("AI");
      expect(D.aiReply).not.toBe(D.shishyaAi);
      expect(D.anonymous).not.toBe("");
    }
    // The "not a student" half is present, in the language's own words.
    expect(discussionLabelsCopy("hi").aiReply).toMatch(/छात्र.*नहीं/);
    expect(discussionLabelsCopy("te").aiReply).toMatch(/విద్యార్థి.*కాదు/);
  });

  it("the four disclosure labels are the home page's own — one wording per language", () => {
    // 16 Sep 2026 fixer: "/" (src/lib/home-strip-copy.ts) and /discussions
    // had each translated these chips, with different Hindi/Telugu wording
    // for the same honesty label. They now have one source.
    for (const locale of ["en", "hi", "te"] as const) {
      const D = discussionLabelsCopy(locale);
      const H = homeStripCopy(locale);
      expect(D.starter).toBe(H.starterQuestion);
      expect(D.shishyaAi).toBe(H.shishyaAi);
      expect(D.aiReply).toBe(H.aiReply);
      expect(D.anonymous).toBe(H.anonymous);
    }
  });
});

describe("product names stay in Latin script", () => {
  // Counted per surface, not per key: a split line (the /share headline)
  // legitimately moves "Shishya" from the second half to the first when the
  // word order changes, but the name must never be dropped or transliterated.
  const shishyaCount = (c: Copy) =>
    Object.values(c).reduce((n, v) => n + (v.match(/Shishya/g) ?? []).length, 0);

  it("Shishya appears as often in hi and te as in English", () => {
    for (const [name, build] of SURFACES) {
      const want = shishyaCount(build("en"));
      for (const locale of ["hi", "te"] as const) {
        expect(shishyaCount(build(locale)), `${name} (${locale})`).toBe(want);
      }
    }
  });

  it("no surface spells the name in Devanagari or Telugu script", () => {
    for (const [name, build] of SURFACES) {
      for (const locale of ["hi", "te"] as const) {
        for (const [k, v] of Object.entries(build(locale))) {
          expect(v, `${name}.${k} (${locale})`).not.toMatch(/शिष्य|शिक्षा|శిష్య/);
        }
      }
    }
  });
});
