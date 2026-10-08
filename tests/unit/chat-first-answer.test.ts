// The guest tutor's first-answer sign-up card (8 Oct 2026 — src/lib/
// chat-first-answer.ts, src/app/chat/FirstAnswerOffer.tsx, src/app/chat/
// ChatInterface.tsx). Pins:
//   A. when it shows — the first answered turn only, a guest only, never a
//      school chat, never after the under-13 line, never while a reply streams,
//      never while the B6 unanswered-question door is up, never on a kids'
//      exam chat (the save card stays there), and the save card from the
//      second answer on: one invitation a screen;
//   B. what it says — the variant (fail closed), the lines in en / hi / te,
//      the words the product cannot back, and each promise's code;
//   C. how it is counted — the door id, the one "shown" row (an impression),
//      the press, the door in the callback and on the SIGNUP row, the tooltip
//      entry and /login's sentence;
//   D. the chat island and the card's own file (source), and the card rendered.
// No DB, no network.
// Run: npx vitest run tests/unit/chat-first-answer.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as reactDom from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";

const beacons = vi.hoisted(() => [] as { cta: string; props: Record<string, unknown> }[]);
vi.mock("@/lib/cta-beacon", () => ({
  ctaBeacon: (cta: string, props: Record<string, unknown>) => {
    beacons.push({ cta, props });
  },
}));

import * as ctaBeaconMod from "@/lib/cta-beacon";
import * as signinCtaMod from "@/lib/signin-cta";
import * as firstMod from "@/lib/chat-first-answer";
import * as placeMod from "@/lib/signup-place";
import * as copyMod from "@/lib/signup-cta-copy";
import * as hooksMod from "@/lib/use-signup-words";
import * as tipPlaceMod from "@/lib/signup-tip-place";
import * as sessionHintMod from "@/lib/session-hint";
import * as inAppMod from "@/lib/in-app-browser";
import * as directMod from "@/lib/direct-signin-ab";
import * as contentSignupMod from "@/lib/content-signup";
import { SIGNUP_CLAIM_PROOF, SIGNUP_PLACE_BANNED_WORDS, type SignUpClaim } from "@/lib/signup-cta-claims";

const {
  CHAT_FIRST_ANSWER_DOOR,
  FIRST_ANSWER_COPY,
  firstAnswerHref,
  firstAnswerReason,
  firstAnswerShownBeacon,
  firstAnswerVariant,
  firstQuestionOf,
  guestChatOffer,
  quizSeedScore,
} = firstMod;
const { SIGNIN_SURFACES, callbackDoor, callbackOfLoginHref, cleanFrom, doorShownIsPress, isSigninSurface, loginHrefWithDoor, signupEventProps } = signinCtaMod;

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** Source with comments removed. */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const flat = (s: string) => s.replace(/\s+/g, " ");

type Msg = firstMod.OfferMessage;
const u = (content: string): Msg => ({ role: "user", content });
const a = (content: string, failed?: boolean): Msg => ({ role: "assistant", content, ...(failed ? { failed: true } : {}) });
const base = { guest: true, school: false, under13: false, busy: false, questionDoorUp: false, examCode: "SSC_CGL" as string | null };
const offer = (messages: Msg[], over: Partial<typeof base> = {}) => guestChatOffer({ ...base, ...over, messages });

const QUIZ_SEED =
  "I just took a quick Quantitative Aptitude quiz for SSC CGL and scored 2/5. Explain these questions I got wrong and how to approach them:\n• A train …";

// ── A. when it shows ─────────────────────────────────────────────────────

describe("A. when the card shows", () => {
  it("under the guest's FIRST answered turn, in an exam chat and in the general chat", () => {
    expect(offer([u("What is the CGL pattern?"), a("Tier 1 has …")])).toBe("first-answer");
    expect(offer([u("Explain Newton's laws"), a("First law …")], { examCode: null })).toBe("first-answer");
  });

  it("not before any answer, not while the first reply streams, not for a reply that failed", () => {
    expect(offer([])).toBeNull();
    expect(offer([u("q")])).toBeNull();
    expect(offer([u("q"), a("partial …")], { busy: true })).toBeNull();
    expect(offer([u("q"), a("")], { busy: true })).toBeNull();
    expect(offer([u("q"), a("", true)])).toBeNull();
    expect(offer([u("q"), a("cut off …", true)])).toBeNull();
  });

  it("a guest only — never a member, never a school chat, never once the under-13 line closed the chat", () => {
    const m = [u("q"), a("answer")];
    expect(offer(m, { guest: false })).toBeNull();
    expect(offer(m, { school: true })).toBeNull();
    expect(offer(m, { under13: true })).toBeNull();
  });

  it("never while the B6 unanswered-question door is up (and the two cannot meet: the door needs no finished answer)", () => {
    expect(offer([u("q"), a("", true)], { questionDoorUp: true })).toBeNull();
    expect(offer([u("q"), a("answer")], { questionDoorUp: true })).toBeNull();
    // The chat's own rule for the door: up only while no answer has finished.
    const src = flat(code("src/app/chat/ChatInterface.tsx"));
    expect(src).toContain(
      'const questionDoorUp = !!questionDoor && !!guestSignInHref && !school && !under13 && !busy && !messages.some((m) => m.role === "assistant" && m.content && !m.failed);',
    );
  });

  it("the first answered turn ONLY: from the second answer on the save card comes back, and stays — one invitation a screen", () => {
    expect(offer([u("q1"), a("a1"), u("q2"), a("a2")])).toBe("save");
    expect(offer([u("q1"), a("a1"), u("q2"), a("a2"), u("q3"), a("a3")])).toBe("save");
    // While the second reply streams: neither card.
    expect(offer([u("q1"), a("a1"), u("q2"), a("par")], { busy: true })).toBeNull();
    // The second turn failed: the latest turn is not the first answered one — the save card, as before.
    expect(offer([u("q1"), a("a1"), u("q2"), a("", true)])).toBe("save");
    // A first turn that failed and was retried in place, now answered: that IS the first answered turn.
    expect(offer([u("q1"), a("a1 after retry")])).toBe("first-answer");
    // An outage answer first, then a second question answered: the first answered turn is the latest.
    expect(offer([u("q1"), a("", true), u("q2"), a("a2")])).toBe("first-answer");
  });

  it("never on a kids' exam chat or a school class container — the save card stays exactly as it was there", () => {
    for (const code of ["SOF_IMO", "SOF_NSO", "SZF_IOM", "NSTSE", "JNVST"]) {
      expect(offer([u("q"), a("answer")], { examCode: code }), code).toBe("save");
      expect(offer([u("q"), a("answer"), u("q2"), a("a2")], { examCode: code }), code).toBe("save");
    }
    expect(offer([u("q"), a("answer")], { examCode: "NCERT_C10" })).toBe("save");
  });

  it("the save card shows exactly where it did before this build, but for the first answered turn", () => {
    // Before: guest && !school && !under13 && !busy && some finished reply.
    const states: Msg[][] = [
      [],
      [u("q")],
      [u("q"), a("x")],
      [u("q"), a("", true)],
      [u("q"), a("x"), u("q2"), a("y")],
      [u("q"), a("x"), u("q2"), a("", true)],
      [u("q"), a("", true), u("q2"), a("y")],
    ];
    for (const m of states) {
      for (const busy of [false, true]) {
        const before = !busy && m.some((x) => x.role === "assistant" && x.content && !x.failed);
        const now = offer(m, { busy });
        expect(now !== null, JSON.stringify({ m, busy })).toBe(before);
      }
    }
  });

  it("the first question is the first user turn (the seed, when one opened the chat)", () => {
    expect(firstQuestionOf([u(QUIZ_SEED), a("x"), u("next")])).toBe(QUIZ_SEED);
    expect(firstQuestionOf([u("  "), u("real")])).toBe("real");
    expect(firstQuestionOf([])).toBeNull();
  });
});

// ── B. what it says ──────────────────────────────────────────────────────

const PAGE = { code: "SSC_CGL", practice: "canServe" as const, olympiad: false };
const view = (over: Partial<Parameters<typeof firstAnswerVariant>[0]> = {}) =>
  firstAnswerVariant({ examCode: "SSC_CGL", exam: "SSC CGL", page: PAGE, firstQuestion: "What is the CGL pattern?", ...over });

describe("B. the reason line: tied to what they asked, true of this exam, fail closed", () => {
  it("reads the guest quiz's score from its own seed (src/components/AnonQuizPlayer.tsx) and nothing else", () => {
    expect(quizSeedScore(QUIZ_SEED)).toEqual({ score: 2, total: 5 });
    expect(quizSeedScore("I just took a quick SBI Clerk quiz for SBI Clerk and scored 5/5. Give me the next things to study.")).toEqual({ score: 5, total: 5 });
    // The seed's template in AnonQuizPlayer is still the one this reads.
    expect(read("src/components/AnonQuizPlayer.tsx")).toContain("`I just took a quick ${quiz.scopeLabel} quiz for ${quiz.examShort} and scored ${score}/${qs.length}.`");
    for (const s of [
      "I scored 2/5 on a quiz",
      "I just took a quick quiz and scored 2/5",
      "I just took a quick X quiz for Y and scored 6/5.",
      "I just took a quick X quiz for Y and scored 2/0.",
      "I just took a CGL mock and got 3 questions wrong",
      "",
      null,
      undefined,
    ]) {
      expect(quizSeedScore(s as string), String(s)).toBeNull();
    }
  });

  it("chooses the variant from the page's facts — tests only where the exam can serve them, an exam named only when the page said it", () => {
    expect(view({ firstQuestion: QUIZ_SEED })).toEqual({ variant: "quiz", exam: "SSC CGL", score: 2, total: 5 });
    expect(view()).toEqual({ variant: "practice", exam: "SSC CGL" });
    expect(view({ page: { ...PAGE, practice: "none" } })).toEqual({ variant: "chatsExam", exam: "SSC CGL" });
    expect(view({ page: { ...PAGE, practice: undefined } })).toEqual({ variant: "chatsExam", exam: "SSC CGL" });
    // The quiz seed on an exam that cannot be shown to serve practice: no tests promised.
    expect(view({ firstQuestion: QUIZ_SEED, page: { ...PAGE, practice: null } })).toEqual({ variant: "chatsExam", exam: "SSC CGL" });
    // Fail closed: no page facts, another exam's facts, an olympiad or an unknown olympiad flag, no name.
    expect(view({ page: null }).variant).toBe("chats");
    expect(view({ page: { ...PAGE, code: "IBPS_PO" } }).variant).toBe("chats");
    expect(view({ page: { ...PAGE, olympiad: true } }).variant).toBe("chats");
    expect(view({ page: { ...PAGE, olympiad: null } }).variant).toBe("chats");
    expect(view({ exam: null }).variant).toBe("chats");
    expect(view({ exam: "{exam}" }).variant).toBe("chats");
    // The general chat and the kids' exams name no exam.
    expect(view({ examCode: null, exam: null, page: null }).variant).toBe("chats");
    expect(view({ examCode: "SOF_IMO", exam: "IMO", page: { ...PAGE, code: "SOF_IMO" } }).variant).toBe("chats");
  });

  it("the English lines, exactly", () => {
    expect(firstAnswerReason("en", { variant: "quiz", exam: "SSC CGL", score: 2, total: 5 })).toBe(
      "You scored 2/5. Sign up free for more SSC CGL tests — each new score is kept, and this tutor then sees your mistakes and weak topics.",
    );
    expect(firstAnswerReason("en", { variant: "practice", exam: "SSC CGL" })).toBe(
      "Sign up free to practise SSC CGL with tests — each score is kept, and this tutor then sees your mistakes and weak topics.",
    );
    expect(firstAnswerReason("en", { variant: "chatsExam", exam: "SSC CGL" })).toBe("Sign up free and your SSC CGL chats from now on are saved, to reopen later.");
    expect(firstAnswerReason("en", { variant: "chats" })).toBe("Sign up free and your chats with the tutor from now on are saved, to reopen later.");
  });

  it("the quiz line keeps only NEW scores: the guest quiz's own score is never an Attempt and is not carried from /chat", () => {
    // Review, 8 Oct 2026: "You scored 2/5 … each score is kept" read as if the 2/5 were kept.
    expect(FIRST_ANSWER_COPY.en.quiz).toContain("each new score is kept");
    expect(FIRST_ANSWER_COPY.hi.quiz).toContain("हर नया स्कोर");
    expect(FIRST_ANSWER_COPY.te.quiz).toContain("ప్రతి కొత్త స్కోర్");
    expect(read("src/lib/quiz-carry.ts")).toContain("It is never an Attempt");
    expect(read("src/app/chat/ChatInterface.tsx")).not.toContain("AnonQuizRecall");
    expect(read("src/app/chat/page.tsx")).not.toContain("AnonQuizRecall");
  });

  it("every line in en, hi and te: filled, no hole, the exam and the score where they belong, never a word the product cannot back", () => {
    const views: firstMod.FirstAnswerView[] = [
      { variant: "quiz", exam: "SSC CGL", score: 2, total: 5 },
      { variant: "practice", exam: "SSC CGL" },
      { variant: "chatsExam", exam: "SSC CGL" },
      { variant: "chats" },
    ];
    for (const l of ["en", "hi", "te"] as const) {
      expect(Object.keys(FIRST_ANSWER_COPY[l]).sort(), l).toEqual(["chats", "chatsExam", "practice", "quiz"]);
      for (const v of views) {
        const line = firstAnswerReason(l, v);
        expect(line, `${l} ${v.variant}`).not.toMatch(/[{}]/);
        expect(line.length, `${l} ${v.variant}`).toBeGreaterThan(20);
        if (v.exam) expect(line, `${l} ${v.variant}`).toContain("SSC CGL");
        else expect(line, `${l} ${v.variant}`).not.toContain("SSC CGL");
        if (v.variant === "quiz") expect(line, l).toContain("2/5");
        const lower = line.toLowerCase();
        for (const w of SIGNUP_PLACE_BANNED_WORDS) expect(lower, `${l} ${v.variant}: ${w}`).not.toContain(w);
      }
      // Hindi and Telugu are written in their own script (founder review), not English.
      if (l !== "en") for (const v of views) expect(firstAnswerReason(l, v), l).toMatch(l === "hi" ? /[ऀ-ॿ]/ : /[ఀ-౿]/);
    }
    // Any other UI language reads English.
    expect(firstAnswerReason("ta", { variant: "chats" })).toBe(firstAnswerReason("en", { variant: "chats" }));
    expect(firstAnswerReason(null, { variant: "chats" })).toBe(firstAnswerReason("en", { variant: "chats" }));
  });

  it("a view with a missing value falls back to the line that needs none — never a hole", () => {
    expect(firstAnswerReason("en", { variant: "quiz", exam: "SSC CGL" })).toBe(firstAnswerReason("en", { variant: "chats" }));
    expect(firstAnswerReason("en", { variant: "practice" })).toBe(firstAnswerReason("en", { variant: "chats" }));
    expect(firstAnswerReason("hi", { variant: "chatsExam", exam: "" })).toBe(firstAnswerReason("hi", { variant: "chats" }));
  });

  it("each promise is backed by code today (the claim table's own proofs)", () => {
    const CLAIMS: Record<firstMod.FirstAnswerVariant, SignUpClaim[]> = {
      // "each score is kept", "this tutor then sees your mistakes and weak topics", "more {exam} tests"
      quiz: ["scores-kept", "weak-topics", "tutor-reads-papers", "mocks-timed"],
      practice: ["scores-kept", "weak-topics", "tutor-reads-papers", "mocks-timed"],
      // "your chats from now on are saved, to reopen later"
      chatsExam: ["chats-saved", "chats-recent-listed"],
      chats: ["chats-saved", "chats-recent-listed"],
    };
    for (const [variant, claims] of Object.entries(CLAIMS)) {
      for (const c of claims) {
        const proofs = SIGNUP_CLAIM_PROOF[c];
        expect(proofs?.length, `${variant}: ${c}`).toBeGreaterThan(0);
        for (const p of proofs) expect(read(p.file), `${variant}: ${c} — ${p.file}`).toContain(p.has);
      }
    }
    // The tutor's tools are for a signed-in exam chat only — the "quiz" and "practice" lines are exam chats only.
    expect(read("src/lib/ai/tools.ts")).toContain("get_my_mastery");
    // Never "this chat is saved" (the guest chat's carry is best-effort).
    for (const l of ["en", "hi", "te"] as const) for (const s of Object.values(FIRST_ANSWER_COPY[l])) expect(s.toLowerCase()).not.toContain("this chat");
  });
});

// ── C. counting ──────────────────────────────────────────────────────────

describe("C. counted like a door: one impression row, one press row, the door on the SIGNUP row", () => {
  beforeEach(() => {
    beacons.length = 0;
  });

  it("the door id exists, is a clean id, sits before the fallback and is not in the skip-/login test", () => {
    expect(CHAT_FIRST_ANSWER_DOOR).toBe("chat-first-answer");
    expect(signinCtaMod.CHAT_FIRST_ANSWER_DOOR).toBe("chat-first-answer");
    expect(isSigninSurface("chat-first-answer")).toBe(true);
    expect(cleanFrom("chat-first-answer")).toBe("chat-first-answer");
    expect(directMod.inDirectSigninTest("chat-first-answer")).toBe(false);
    expect(new Set(SIGNIN_SURFACES).size).toBe(SIGNIN_SURFACES.length);
    expect(SIGNIN_SURFACES[SIGNIN_SURFACES.length - 1]).toBe("link");
    expect(SIGNIN_SURFACES.indexOf("chat-first-answer" as never)).toBe(SIGNIN_SURFACES.indexOf("chat-unanswered" as never) + 1);
  });

  it("ONE \"signin-door\" shown row — an impression, with the exam and the variant", () => {
    firstAnswerShownBeacon("SSC_CGL", "quiz");
    expect(beacons).toEqual([
      { cta: "signin-door", props: { examCode: "SSC_CGL", variant: "quiz", impression: true, action: "shown", surface: "chat-first-answer" } },
    ]);
    beacons.length = 0;
    firstAnswerShownBeacon(null, "chats");
    expect(beacons[0].props).toMatchObject({ examCode: null, variant: "chats", surface: "chat-first-answer", action: "shown" });
    expect(ctaBeaconMod.ctaBeacon).toBeTypeOf("function");
  });

  it("a tutor door's shown row is not a press; a 401 door's is", () => {
    for (const s of ["hub-start-401", "subject-test-401", "custom-mock-401"]) expect(doorShownIsPress(s), s).toBe(true);
    for (const s of ["chat-first-answer", "chat-unanswered", "chat-save", "hub-box", "", null, undefined]) expect(doorShownIsPress(s), String(s)).toBe(false);
  });

  it("the link returns to this chat, with the door named in the callback and in ?from=", () => {
    const exam = "/login?callbackUrl=%2Fchat%3FexamCode%3DSSC_CGL";
    const href = firstAnswerHref(exam);
    expect(href).toBe("/login?callbackUrl=%2Fchat%3FexamCode%3DSSC_CGL%26door%3Dchat-first-answer&from=chat-first-answer");
    expect(callbackOfLoginHref(href)).toBe("/chat?examCode=SSC_CGL&door=chat-first-answer");
    expect(new URL(href, "https://shishya.in").searchParams.get("from")).toBe("chat-first-answer");
    // The general chat, and a guest who opened a saved chat's link (B3: &session=).
    expect(callbackOfLoginHref(firstAnswerHref("/login?callbackUrl=%2Fchat%3Fgeneral%3D1"))).toBe("/chat?general=1&door=chat-first-answer");
    expect(callbackOfLoginHref(firstAnswerHref(`/login?callbackUrl=${encodeURIComponent("/chat?examCode=SSC_CGL&session=abc123")}`))).toBe(
      "/chat?examCode=SSC_CGL&session=abc123&door=chat-first-answer",
    );
    // Applied twice: still one door, one from.
    const twice = loginHrefWithDoor(href, "chat-first-answer");
    expect(callbackOfLoginHref(twice)).toBe("/chat?examCode=SSC_CGL&door=chat-first-answer");
    expect(twice.match(/from=/g)).toHaveLength(1);
    // Not a /login link: unchanged.
    expect(loginHrefWithDoor("/chat?examCode=SSC_CGL", "chat-first-answer")).toBe("/chat?examCode=SSC_CGL");
    // The page the callback names is still this exam's chat (the button's words and /login's read it).
    expect(copyMod.callbackGoal(callbackOfLoginHref(href))).toEqual(copyMod.callbackGoal("/chat?examCode=SSC_CGL"));
  });

  it("the SIGNUP row carries the door (props.door) — only a known door id, only on our own site", () => {
    expect(callbackDoor("https://shishya.in/chat?examCode=SSC_CGL&door=chat-first-answer")).toBe("chat-first-answer");
    expect(callbackDoor("/chat?general=1&door=chat-first-answer")).toBe("chat-first-answer");
    for (const cb of [
      "/chat?examCode=SSC_CGL",
      "/chat?door=not-a-door",
      "/chat?door=link",
      "/chat?door=someone%40example.com",
      "https://evil.example/chat?door=chat-first-answer",
      "",
      null,
      undefined,
    ]) {
      expect(callbackDoor(cb as string), String(cb)).toBeNull();
    }
    const props = signupEventProps({ school: false, callback: "https://shishya.in/chat?examCode=SSC_CGL&door=chat-first-answer", landing: "/exams/SSC_CGL" });
    expect(props).toEqual({ provider: "google", callbackFamily: "other", callbackPath: "/chat", landingPath: "/exams/SSC_CGL", door: "chat-first-answer" });
    // Every other sign-up's props are unchanged: no key.
    expect(signupEventProps({ school: false, callback: "https://shishya.in/chat?examCode=SSC_CGL", landing: null })).not.toHaveProperty("door");
    // The createUser event passes the callback-url cookie to it, as before.
    expect(read("src/lib/auth.ts")).toContain("props: signupEventProps({ school: schoolSignIn, callback: signInCallback,");
  });

  it("the button's tooltip and /login's sentence: the save card's entries (no new words in the table)", () => {
    const EXAM = { exam: "SSC CGL", examCode: "SSC_CGL" } as const;
    const cb = "/chat?examCode=SSC_CGL&door=chat-first-answer";
    const page = { exam: "SSC CGL", code: "SSC_CGL", practice: "canServe" as const };
    expect(placeMod.signUpPlaceFor({ surface: "chat-first-answer", callback: cb, ...EXAM, page })).toEqual(
      placeMod.signUpPlaceFor({ surface: "chat-save", callback: "/chat?examCode=SSC_CGL", ...EXAM, page }),
    );
    expect(placeMod.signUpPlaceFor({ surface: "chat-first-answer", callback: cb, ...EXAM, page }).key).toBe("door.chat-save.exam.practice");
    expect(placeMod.signUpPlaceFor({ surface: "chat-first-answer", callback: cb, ...EXAM }).key).toBe("door.chat-save.exam");
    expect(placeMod.signUpPlaceFor({ surface: "chat-first-answer", callback: "/chat?general=1&door=chat-first-answer", exam: null, examCode: null }).key).toBe("door.chat-save.general");
    expect(placeMod.signUpPlaceFor({ surface: "chat-first-answer", callback: cb, ...EXAM, page: { ...page, olympiad: true } }).key).toBe("family.examOlympiad");
    // Returning somewhere else: no door sentence.
    expect(placeMod.signUpPlaceFor({ surface: "chat-first-answer", callback: "/dashboard", ...EXAM }).key).toBe("family.fallback");
    // /login after the press shows the same sentence.
    expect(placeMod.signUpPlaceFor({ surface: "login", from: "chat-first-answer", callback: "/chat?general=1&door=chat-first-answer" }).key).toBe("door.chat-save.general");
  });
});

// ── D. the chat island and the card (source), and the card rendered ──────

describe("D. the chat island holds one invitation a screen; the card's own file", () => {
  const chat = code("src/app/chat/ChatInterface.tsx");
  const card = code("src/app/chat/FirstAnswerOffer.tsx");

  it("the island decides through the shared rule, with the B6 door's state", () => {
    expect(flat(chat)).toContain(
      "const guestOffer = guestChatOffer({ guest: !!guestSignInHref, school: !!school, under13, busy, questionDoorUp, examCode: examCode ?? null, messages, });",
    );
    expect(chat.indexOf("const guestOffer = guestChatOffer(")).toBeGreaterThan(chat.indexOf("const questionDoorUp ="));
  });

  it("the card in the save card's place (under the answer), the save card only from the second answer on", () => {
    expect(flat(chat)).toContain(
      "{guestOffer === \"first-answer\" && guestSignInHref && ( <FirstAnswerOffer href={firstAnswerHref(guestSignInHref)} locale={navLang} exam={examShortName} examCode={examCode} firstQuestion={firstQuestionOf(messages)} pane={scrollRef} onSignInClick={keepGuestChatForSignIn} /> )}",
    );
    expect(chat).toContain('{guestSignInHref && !school && !under13 && !busy && guestOffer === "save" && (');
    const cardAt = chat.indexOf("<FirstAnswerOffer");
    const saveAt = chat.indexOf('surface="chat-save"');
    expect(cardAt).toBeGreaterThan(chat.indexOf("{importedNote && ("));
    expect(cardAt).toBeLessThan(saveAt);
    // The card is in the scrolling message pane, after the messages.
    expect(cardAt).toBeGreaterThan(chat.indexOf("<div ref={scrollRef}"));
    expect(cardAt).toBeGreaterThan(chat.indexOf("{messages.map((m, i) => {"));
    // The island still holds two shared buttons (the banner's and the save card's); the card's is in its own file.
    expect(chat.match(/<SignUpButton\b/g)).toHaveLength(2);
    // The banner's button has left by then (it waits for no finished reply).
    expect(chat).toMatch(/\{!guestHasReply && !questionDoorUp && \(\s*<SignUpButton/);
  });

  it("the card: one shared button under its door id, its own reason line, above-opening tooltip, the age line", () => {
    expect(card).toContain('import { SignUpButton } from "@/components/SignUpButton";');
    expect(card.match(/<SignUpButton\b/g)).toHaveLength(1);
    const tag = card.slice(card.indexOf("<SignUpButton"), card.indexOf("/>", card.indexOf("<SignUpButton")));
    for (const attr of ['surface="chat-first-answer"', "href={href}", 'explain="own"', 'side="top"', "block", "exam={exam}", "examCode={examCode}", "onSignInClick={onSignInClick}"]) {
      expect(tag, attr).toContain(attr);
    }
    expect(tag).not.toMatch(/\blabel=|\bchildren=/);
    expect(card).not.toContain("<SignInLink");
    expect(card.match(/\bdata-su-reason\b/g)).toHaveLength(1);
    expect(card).toContain("{firstAnswerReason(locale, view)}");
    expect(card).toContain("{nudgeBarCopy(locale).privacy}");
    expect(card).toContain("data-signin-door={CHAT_FIRST_ANSWER_DOOR}");
  });

  it("the card counts itself once, when half of it is on screen, and is brought into view", () => {
    expect(flat(card)).toContain("if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) { send(); io.disconnect(); }");
    expect(flat(card)).toContain("firstAnswerShownBeacon(examCode, variantRef.current);");
    expect(flat(card)).toContain('if (typeof IntersectionObserver === "undefined") { send(); return; }');
    expect(flat(card)).toContain('box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });');
    // Nothing is drawn over the answer: no fixed or absolute layer, no blur.
    expect(card).not.toMatch(/\bfixed\b|\babsolute\b|blur/);
  });

  it("rendered: the reason, the button under its door id with the door in its link, the age line", () => {
    beacons.length = 0;
    function LinkStub({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children?: React.ReactNode } & Record<string, unknown>) {
      void prefetch;
      return React.createElement("a", { href, ...rest }, children);
    }
    const STUBS: Record<string, unknown> = {
      react: React,
      "react/jsx-runtime": jsxRuntime,
      "react-dom": reactDom,
      "next/link": { __esModule: true, default: LinkStub },
      "@/lib/signup-tip-place": tipPlaceMod,
      "@/lib/signup-cta-copy": copyMod,
      "@/lib/signup-place": placeMod,
      "@/lib/use-signup-words": hooksMod,
      "@/lib/signin-cta": signinCtaMod,
      "@/lib/cta-beacon": ctaBeaconMod,
      "@/lib/session-hint": sessionHintMod,
      "@/lib/in-app-browser": inAppMod,
      "@/lib/direct-signin-ab": directMod,
      "@/lib/google-handoff": { goToGoogle: async () => {}, warmGoogleHandoff: async () => {} },
      "@/lib/content-signup": contentSignupMod,
      "@/lib/chat-first-answer": firstMod,
    };
    const loaded = new Map<string, { exports: Record<string, unknown> }>();
    const load = (relPath: string): Record<string, unknown> => {
      const file = path.normalize(path.join(ROOT, relPath));
      const hit = loaded.get(file);
      if (hit) return hit.exports;
      const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
        fileName: file,
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
      }).outputText;
      const mod = { exports: {} as Record<string, unknown> };
      loaded.set(file, mod);
      const req = (spec: string): unknown => {
        if (spec in STUBS) return STUBS[spec];
        if (spec.startsWith("@/components/")) return load(`src/components/${spec.slice("@/components/".length)}.tsx`);
        throw new Error(`${relPath} imports an unexpected module: ${spec}`);
      };
      new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
      return mod.exports;
    };
    const { FirstAnswerOffer } = load("src/app/chat/FirstAnswerOffer.tsx") as { FirstAnswerOffer: React.FC<Record<string, unknown>> };
    for (const l of ["en", "hi", "te"] as const) {
      const html = renderToStaticMarkup(
        React.createElement(FirstAnswerOffer, {
          href: firstAnswerHref("/login?callbackUrl=%2Fchat%3FexamCode%3DSSC_CGL"),
          locale: l,
          exam: "SSC CGL",
          examCode: "SSC_CGL",
          firstQuestion: QUIZ_SEED,
        }),
      );
      // On the server no page facts are read yet: the line that names no exam (fail closed).
      expect(html, l).toContain(firstAnswerReason(l, { variant: "chats" }).replace(/&/g, "&amp;"));
      expect(html, l).toContain('data-signin-door="chat-first-answer"');
      expect(html, l).toContain('data-signin-surface="chat-first-answer"');
      expect(html, l).toContain('data-signin-beacon="self"');
      expect(html, l).toContain("door%3Dchat-first-answer");
      expect(html, l).toContain("from=chat-first-answer");
      expect(html, l).toContain(contentSignupMod.nudgeBarCopy(l).privacy);
      // No beacon is sent by rendering: the count waits for the card to be on screen.
    }
    expect(beacons).toEqual([]);
  });
});
