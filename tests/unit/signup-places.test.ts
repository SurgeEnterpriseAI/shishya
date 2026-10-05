// EVERY "SIGN UP WITH GOOGLE" BUTTON SAYS WHAT IS TRUE WHERE IT STANDS
// (2 Oct 2026 — founder: "Each sign in with Google should be contextualized
// from the location where it is. It should not be the same tooltip
// information for all the Google sign up buttons. Based on the context where
// they are, prepare a tooltip information, and each tooltip will show a
// better use case of how Shishya can be helpful.")
//
// Until this build every button showed one of five sentences, and 48 of 69
// placements the general one. The words are a table now: 76 entries — a
// tooltip and a caption each, in English, Hindi and Telugu — written from
// what a signed-in student really gets in each place, reviewed for honesty
// and clarity, and kept in ONE data source:
// src/data/signup-places/{en,hi,te}.json. src/lib/signup-place.ts decides
// which entry a placement shows.
//
// This file pins, with no DB, no network and no browser:
//   0. THE DATA SOURCE — three files, the same 76 keys, the closing sentence
//      and the age sentence stored once per language, lengths, variables;
//   A. EVERY PLACEMENT resolves to its entry (or its stated fallback), and
//      the words a placement renders are the data source's words — in
//      English, Hindi and Telugu (the test loads the same files; no sentence
//      is typed here);
//   B. EVERY CONDITION is enforced, fail closed: an unknown practice value, a
//      missing name, year or count takes the next entry of the chain, never
//      the stronger sentence;
//   C. NO TWO ENTRIES render the same tooltip;
//   D. THE CLAIMS — each entry says exactly the claims listed for it, each
//      claim names code that is there, what is "not kept" is pinned the other
//      way round, and no banned word is used in any language;
//   E. NEVER UNDER 13 — no button, tooltip, caption or fetch of the words on
//      a Class 1-7 page; the callers' rules are as they were;
//   F. PAGE WEIGHT — no client component imports the words statically: the
//      three files are reached from "use client" code only through the
//      dynamic imports of src/lib/signup-place-load.ts;
//   G. THE TOOLTIP BOX — 360 px wide, and the placement function keeps a box
//      of that width and ten lines on screen and off the button;
//   H. THE REVIEW OF 2 OCT 2026 — a caption is shown only where it is true
//      by itself (school pages, a topic's test, the builder's two doors), a
//      door never says "no practice questions", the timed bar's line is not
//      cut, a failed fetch of the words is tried again and leaves no empty
//      line, the "explanation opened" beacon needs an explanation, a touch
//      screen fetches no words for a tooltip nobody can open, and the three
//      data files are the reviewed table (a checksum).
//
// What no test here can see: pixels, and the words arriving in a browser
// (the idle fetch, the tooltip opening on hover with the new sentence, the
// timed bar coming up with its caption). Those have to be looked at in a
// browser. The Hindi and Telugu were not read by a native speaker.
// Run: npx vitest run tests/unit/signup-places.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import crypto from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as reactDom from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";

import * as copyMod from "@/lib/signup-cta-copy";
import * as placeMod from "@/lib/signup-place";
import * as loadMod from "@/lib/signup-place-load";
import * as hooksMod from "@/lib/use-signup-words";
import * as signinCtaMod from "@/lib/signin-cta";
import * as ctaBeaconMod from "@/lib/cta-beacon";
import * as sessionHintMod from "@/lib/session-hint";
import * as inAppMod from "@/lib/in-app-browser";
import * as directMod from "@/lib/direct-signin-ab";
import * as tipPlaceMod from "@/lib/signup-tip-place";
import { SIGNUP_TABLES, signUpPlaceWords, signUpWords } from "@/lib/signup-place-words";
import {
  SIGNUP_BANNED_WORDS,
  SIGNUP_CLAIM_PROOF,
  SIGNUP_CLAIM_SAYS_EN,
  SIGNUP_NOT_KEPT_PINS,
  SIGNUP_PLACE_BANNED_WORDS,
  SIGNUP_PLACE_CLAIMS,
  SIGNUP_PRACTICE_CLAIMS,
  type SignUpClaim,
} from "@/lib/signup-cta-claims";
import { contentFamily } from "@/lib/content-signup";
import { isChildSchoolPath, pitchAllowedPath } from "@/lib/signup-pitch";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";
import { MIN_SERVED_QUESTIONS } from "@/lib/served-paper";
import { NO_PRACTICE, practiceStateFromCounts } from "@/lib/exam-practice-state";

const {
  SIGNUP_CAN_SERVE_MIN,
  signUpPagePlace,
  signUpPlaceFor,
  signUpPlaceOfContext,
  signUpPracticeOf,
  signUpWordsFrom,
  signUpWordsLocale,
} = placeMod;
type Key = placeMod.SignUpPlaceKey;
type Place = placeMod.SignUpPlace;
type Input = placeMod.SignUpPlaceInput;
type Vars = placeMod.SignUpVars;
const { SIGNUP_TIP_GAP, SIGNUP_TIP_MARGIN, placeSignUpTip } = tipPlaceMod;

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** Source with comments removed (JSX comments, block comments, whole-line comments). */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const walk = (d: string, re: RegExp): string[] =>
  fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), re) : re.test(e.name) ? [path.join(d, e.name)] : [])) : [];
const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, "/");

const LANGS = ["en", "hi", "te"] as const;
type Lang = (typeof LANGS)[number];
const KEYS = Object.keys(SIGNUP_PLACE_CLAIMS) as Key[];

/** The words of an entry, put together HERE from the data source (the code
 *  under test is not called): the stored body, the "lands on the dashboard"
 *  sentence unless the placement returns to its page, the age sentence, the
 *  closing sentence; then the variables. */
function tableWords(l: Lang, key: Key, vars: Record<string, string | number> = {}, back = false, cap?: Key): { text: string; short: string } {
  const T = SIGNUP_TABLES[l];
  const e = T.places[key];
  const fill = (s: string) => s.replace(/\{(\w+)\}/g, (hole, name: string) => (name in vars ? String(vars[name]) : name === "institute" ? T.institute : hole));
  // `cap`: the caption is another entry's (a CBSE class page: the caption that is true on every school page).
  return { text: fill([e.t, back ? "" : e.tail ?? "", e.age ? T.age : "", e.bare ? "" : T.closing].filter(Boolean).join(" ")), short: fill((cap ? T.places[cap] : e).c) };
}

/** The caption a CBSE class page, class chat or class practice set shows instead of family.schoolCbse's own. */
const SCHOOL_CAP: Key = "family.schoolOtherBoard";

/** Sample values for every variable (a 7-letter and a 14-letter exam name are both tried in section 0). */
const SAMPLE: Record<string, string | number> = { exam: "SSC CGL", year: "2024", n: 10, institute: "Vidya Coaching" };
const sampleVars = (key: Key): Vars => {
  const holes = new Set([...(SIGNUP_TABLES.en.places[key].t + SIGNUP_TABLES.en.places[key].c).matchAll(/\{(\w+)\}/g)].map((m) => m[1]));
  const v: Vars = {};
  if (holes.has("exam")) v.exam = String(SAMPLE.exam);
  if (holes.has("year")) v.year = String(SAMPLE.year);
  if (holes.has("n")) v.n = Number(SAMPLE.n);
  if (holes.has("institute")) v.institute = String(SAMPLE.institute);
  return v;
};

// ── 0. the data source ───────────────────────────────────────────────────

describe("0. the data source: three files, 76 entries, each sentence stored once", () => {
  const AGE_KEYS: Key[] = ["family.schoolCbse", "family.schoolOtherBoard", "family.schoolChat", "family.examOlympiad", "door.school-save"];
  const TAIL_KEYS: Key[] = ["door.vouch", "door.verify-fact"];

  it("the three files hold the same 76 keys — the keys of the resolver's own type", () => {
    expect(KEYS).toHaveLength(76);
    expect(KEYS.filter((k) => k.startsWith("family."))).toHaveLength(37);
    expect(KEYS.filter((k) => k.startsWith("door."))).toHaveLength(39);
    for (const l of LANGS) {
      const raw = JSON.parse(read(`src/data/signup-places/${l}.json`)) as placeMod.SignUpTable;
      expect(Object.keys(raw.places).sort(), l).toEqual([...KEYS].sort());
      // The module the server reads is these files, nothing else.
      expect(SIGNUP_TABLES[l], l).toEqual(raw);
      expect(Object.keys(raw).sort(), l).toEqual(["age", "closing", "institute", "places"]);
    }
    expect(fs.readdirSync(path.join(ROOT, "src/data/signup-places")).sort()).toEqual(["en.json", "hi.json", "te.json"]);
  });

  it("the closing sentence and the age sentence are stored ONCE per language and appended; one entry has no closing sentence", () => {
    expect(SIGNUP_TABLES.en.closing).toBe("Free, with your Google account, no forms.");
    expect(SIGNUP_TABLES.en.age).toBe("For students 13 and above.");
    for (const l of LANGS) {
      const T = SIGNUP_TABLES[l];
      expect(T.closing, l).toContain("Google");
      expect(T.age, l).toContain("13");
      expect(T.institute.length, l).toBeGreaterThan(2);
      for (const k of KEYS) {
        const e = T.places[k];
        // Never typed into an entry: the closing sentence and the age sentence come from the one stored copy.
        expect(e.t.includes(T.closing), `${l}/${k}: closing typed into the entry`).toBe(false);
        expect(e.t.includes(T.age), `${l}/${k}: age sentence typed into the entry`).toBe(false);
        expect(e.bare === true, `${l}/${k}`).toBe(k === "door.login.returning");
        expect(e.age === true, `${l}/${k}`).toBe(AGE_KEYS.includes(k));
        expect(typeof e.tail === "string", `${l}/${k}`).toBe(TAIL_KEYS.includes(k));
        const words = signUpPlaceWords(l, { key: k, vars: sampleVars(k) });
        expect(words.text.endsWith(T.closing), `${l}/${k}`).toBe(k !== "door.login.returning");
        if (AGE_KEYS.includes(k)) expect(words.text.endsWith(`${T.age} ${T.closing}`), `${l}/${k}`).toBe(true);
        else expect(words.text.includes(T.age), `${l}/${k}`).toBe(false);
      }
    }
  });

  it("variables: only {exam}, {year}, {n} and {institute}; the same ones in every language; {exam} at most twice in a tooltip", () => {
    const holes = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
    for (const k of KEYS) {
      const en = SIGNUP_TABLES.en.places[k];
      for (const h of holes(en.t + (en.tail ?? "") + en.c)) expect(["{exam}", "{year}", "{n}", "{institute}"], `${k}: ${h}`).toContain(h);
      expect((en.t.match(/\{exam\}/g) ?? []).length, k).toBeLessThanOrEqual(2);
      for (const l of ["hi", "te"] as const) {
        const e = SIGNUP_TABLES[l].places[k];
        expect(holes(e.t + (e.tail ?? "")), `${l}/${k} tooltip`).toEqual(holes(en.t + (en.tail ?? "")));
        expect(holes(e.c), `${l}/${k} caption`).toEqual(holes(en.c));
      }
    }
    // No stray brace anywhere.
    for (const l of LANGS) for (const k of KEYS) expect((SIGNUP_TABLES[l].places[k].t + SIGNUP_TABLES[l].places[k].c).replace(/\{(?:exam|year|n|institute)\}/g, ""), `${l}/${k}`).not.toMatch(/[{}]/);
  });

  it("lengths: an English tooltip is at most 300 characters, Hindi and Telugu at most 360; a caption is one line (at most 70)", () => {
    for (const exam of ["SSC CGL", "KSRP Constable"]) {
      for (const l of LANGS) {
        for (const k of KEYS) {
          const w = signUpPlaceWords(l, { key: k, vars: { ...sampleVars(k), ...(sampleVars(k).exam ? { exam } : {}) } });
          expect(w.text.length, `${l}/${k} (${exam}): ${w.text.length}`).toBeLessThanOrEqual(l === "en" ? 300 : 361);
          expect(w.short.length, `${l}/${k} (${exam}): ${w.short}`).toBeLessThanOrEqual(70);
          expect(w.short.length, `${l}/${k}`).toBeGreaterThan(15);
          // Two to four sentences a student reads in a glance: never a one-liner, never empty.
          expect(w.text.length, `${l}/${k}`).toBeGreaterThan(120);
        }
      }
    }
  });

  it("every caption keeps its shape — 'No forms.' and one sentence — except the 'Welcome back' card's", () => {
    const lead: Record<Lang, string> = { en: "No forms. ", hi: SIGNUP_TABLES.hi.places["family.fallback"].c.split("। ")[0] + "। ", te: SIGNUP_TABLES.te.places["family.fallback"].c.split(". ")[0] + ". " };
    for (const l of LANGS) {
      for (const k of KEYS) {
        const c = SIGNUP_TABLES[l].places[k].c;
        expect(c.startsWith(lead[l]), `${l}/${k}: ${c}`).toBe(k !== "door.login.returning");
      }
    }
    // The 'No forms' of each language is the closing sentence's own last clause.
    expect(SIGNUP_TABLES.en.closing.toLowerCase()).toContain(lead.en.trim().toLowerCase().replace(".", ""));
  });

  it("Hindi and Telugu are in their own script, name Google, and their captions keep no English word but the exam's name", () => {
    for (const l of ["hi", "te"] as const) {
      for (const k of KEYS) {
        const w = signUpPlaceWords(l, { key: k, vars: sampleVars(k) });
        expect(w.text, `${l}/${k}`).not.toBe(signUpPlaceWords("en", { key: k, vars: sampleVars(k) }).text);
        expect(/[ऀ-ॿ]/.test(w.text), `${l}/${k}`).toBe(l === "hi");
        expect(/[ఀ-౿]/.test(w.text), `${l}/${k}`).toBe(l === "te");
        expect(w.text, `${l}/${k}`).toContain("Google");
        expect(/[ऀ-ॿ]/.test(w.short), `${l}/${k} caption`).toBe(l === "hi");
        expect(/[ఀ-౿]/.test(w.short), `${l}/${k} caption`).toBe(l === "te");
        expect(w.short.replace(String(SAMPLE.exam), "").replace(/\bAI\b/g, ""), `${l}/${k} caption: ${w.short}`).not.toMatch(/[A-Za-z]{3,}/);
      }
    }
  });

  it("no digit but the age sentence's, no exclamation mark, no count, rank or superlative — in any language", () => {
    for (const l of LANGS) {
      const T = SIGNUP_TABLES[l];
      for (const k of KEYS) {
        const e = T.places[k];
        const body = `${e.t} ${e.tail ?? ""} ${e.c}`;
        expect(body, `${l}/${k}`).not.toMatch(/[0-9०-९౦-౯]/);
        expect(body, `${l}/${k}`).not.toContain("!");
        if (l === "en") expect(body, k).not.toMatch(/\b(?:rank|best|biggest|everything|always|guaranteed?)\b/i);
        const lower = body.toLowerCase();
        for (const w of SIGNUP_PLACE_BANNED_WORDS) expect(lower.includes(w.toLowerCase()), `${l}/${k}: ${w}`).toBe(false);
      }
      expect(T.age.replace("13", ""), l).not.toMatch(/[0-9]/);
    }
    expect(SIGNUP_PLACE_BANNED_WORDS).toEqual(expect.arrayContaining([...SIGNUP_BANNED_WORDS, "mastery", "knows you", "unlock", "all-india", "this chat is saved"]));
  });

  it("the school entries the code uses say nothing of an exam, a tutor or a chat (the school tutor keeps no memory)", () => {
    for (const k of ["family.schoolCbse", "family.schoolOtherBoard", "door.school-save"] as Key[]) {
      const en = signUpPlaceWords("en", { key: k, vars: sampleVars(k) });
      expect(`${en.text} ${en.short}`, k).not.toMatch(/exam|tutor|chat/i);
      for (const l of ["hi", "te"] as const) {
        const w = signUpPlaceWords(l, { key: k, vars: sampleVars(k) });
        expect(`${w.text} ${w.short}`, `${l}/${k}`).not.toMatch(/AI|ट्यूटर|ట్యూటర్|चैट|చాట్|परीक्षा|పరీక్ష/);
      }
    }
    // family.schoolChat needs the word "chat" — which is why no placement takes it (section A).
    expect(signUpPlaceWords("en", { key: "family.schoolChat" }).text).toMatch(/chat/);
  });
});

// ── A. every placement ───────────────────────────────────────────────────

const EXAM = { exam: "SSC CGL", examCode: "SSC_CGL" } as const;
const HUB = "/exams/SSC_CGL";
const pageOf = (over: Partial<placeMod.SignUpPageData> = {}): placeMod.SignUpPageData => ({ exam: "SSC CGL", code: "SSC_CGL", practice: "canServe", ...over });

/** Every placement of the map (file, what the code passes there, the entry it must take). */
const PLACEMENTS: { name: string; file: string; input: Input; key: Key; vars?: Record<string, string | number>; back?: boolean; cap?: Key }[] = [
  // ── Exam practice doors
  { name: "hub-box", file: "src/app/exams/[code]/StartMockButton.tsx", input: { surface: "hub-box", callback: `${HUB}?start=practice`, ...EXAM, practice: "canServe" }, key: "door.hub-box", vars: { exam: "SSC CGL" } },
  { name: "hub-try-one", file: "src/app/exams/[code]/TryOneQuestion.tsx", input: { surface: "hub-try-one", callback: HUB, ...EXAM, page: pageOf() }, key: "door.hub-try-one", vars: { exam: "SSC CGL" } },
  { name: "pyq-year (a set of five or more)", file: "src/app/exams/[code]/pyq/[year]/page.tsx", input: { surface: "pyq-year", callback: `${HUB}/pyq/2024`, ...EXAM, setQuestions: 10, vars: { year: 2024 } }, key: "door.pyq-year", vars: { exam: "SSC CGL", year: "2024" } },
  { name: "pyq-year (a smaller set)", file: "src/app/exams/[code]/pyq/[year]/page.tsx", input: { surface: "pyq-year", callback: `${HUB}/pyq/2024`, ...EXAM, setQuestions: 3, vars: { year: 2024 } }, key: "family.exam.unknown", vars: { exam: "SSC CGL" } },
  { name: "quiz-end", file: "src/components/AnonQuizPlayer.tsx", input: { surface: "quiz-end", callback: HUB, ...EXAM, page: pageOf() }, key: "door.quiz-end", vars: { exam: "SSC CGL" } },
  { name: "build-mock-form (its topics hold a set that can be built)", file: "src/app/exams/[code]/build-mock/BuilderForm.tsx", input: { surface: "build-mock-form", callback: `${HUB}/build-mock?pyq=1`, ...EXAM, setQuestions: 6 }, key: "door.build-mock-form", vars: { exam: "SSC CGL" } },
  { name: "build-mock-form (one listed topic of four questions)", file: "src/app/exams/[code]/build-mock/BuilderForm.tsx", input: { surface: "build-mock-form", callback: `${HUB}/build-mock`, ...EXAM, setQuestions: 4 }, key: "family.exam.unknown", vars: { exam: "SSC CGL" } },
  { name: "mock-gate", file: "src/app/mocks/[id]/MockGate.tsx", input: { surface: "mock-gate", callback: "/mocks/cm1234567890?from=signin", ...EXAM }, key: "door.mock-gate", vars: { exam: "SSC CGL" } },
  { name: "mock-gate-quiz-end", file: "src/components/GuestQuizGate.tsx", input: { surface: "mock-gate-quiz-end", callback: "/mocks/cm1234567890?from=signin", ...EXAM }, key: "door.mock-gate-quiz-end", vars: { exam: "SSC CGL" } },
  { name: "build-gate-quiz-end (the builder's topics hold a set that can be built)", file: "src/components/GuestQuizGate.tsx", input: { surface: "build-gate-quiz-end", callback: `${HUB}/build-mock`, ...EXAM, setQuestions: 6 }, key: "door.build-gate-quiz-end", vars: { exam: "SSC CGL" } },
  { name: "build-gate-quiz-end (one listed topic of three questions; the exam can serve a mock)", file: "src/components/GuestQuizGate.tsx", input: { surface: "build-gate-quiz-end", callback: `${HUB}/build-mock`, ...EXAM, setQuestions: 3, practice: "canServe" }, key: "family.exam.practice", vars: { exam: "SSC CGL" } },
  { name: "cutoff-nudge", file: "src/components/AnonExamNudge.tsx", input: { surface: "cutoff-nudge", callback: HUB, ...EXAM, page: pageOf() }, key: "door.cutoff-nudge", vars: { exam: "SSC CGL" } },
  { name: "verdict-poll", file: "src/components/ExamVerdictPoll.tsx", input: { surface: "verdict-poll", callback: `${HUB}/updates`, ...EXAM }, key: "door.verdict-poll", vars: { exam: "SSC CGL" } },
  { name: "challenge-end", file: "src/app/c/[token]/ChallengeLanding.tsx", input: { surface: "challenge-end", callback: HUB, ...EXAM, page: pageOf() }, key: "door.challenge-end", vars: { exam: "SSC CGL" } },
  { name: "live-test", file: "src/app/live-test/page.tsx", input: { surface: "live-test", callback: "/live-test", vars: { exam: "SSC CGL" } }, key: "door.live-test", vars: { exam: "SSC CGL" } },
  { name: "guest-paper (switched off)", file: "src/app/mocks/[id]/GuestPaperPlayer.tsx", input: { surface: "guest-paper", callback: HUB }, key: "door.guest-paper" },
  // ── The tutor
  { name: "chat-banner (an exam chat, the exam can serve a mock)", file: "src/app/chat/ChatInterface.tsx", input: { surface: "chat-banner", callback: "/chat?examCode=SSC_CGL", ...EXAM, page: pageOf() }, key: "door.chat-banner.exam.practice", vars: { exam: "SSC CGL" } },
  { name: "chat-banner (an exam chat, practice not known)", file: "src/app/chat/ChatInterface.tsx", input: { surface: "chat-banner", callback: "/chat?examCode=SSC_CGL", ...EXAM }, key: "door.chat-banner.exam", vars: { exam: "SSC CGL" } },
  { name: "chat-banner (the general chat)", file: "src/app/chat/ChatInterface.tsx", input: { surface: "chat-banner", callback: "/chat?general=1" }, key: "door.chat-banner.general" },
  { name: "chat-save (an exam chat, the exam can serve a mock)", file: "src/app/chat/ChatInterface.tsx", input: { surface: "chat-save", callback: "/chat?examCode=SSC_CGL", ...EXAM, page: pageOf() }, key: "door.chat-save.exam.practice", vars: { exam: "SSC CGL" } },
  { name: "chat-save (an exam chat, practice not known)", file: "src/app/chat/ChatInterface.tsx", input: { surface: "chat-save", callback: "/chat?examCode=SSC_CGL", ...EXAM }, key: "door.chat-save.exam", vars: { exam: "SSC CGL" } },
  { name: "chat-save (the general chat)", file: "src/app/chat/ChatInterface.tsx", input: { surface: "chat-save", callback: "/chat?general=1", exam: null, examCode: null }, key: "door.chat-save.general" },
  // ── School (Class 8-12 only)
  { name: "school-save", file: "src/components/school/SchoolStudentEntry.tsx", input: { surface: "school-save", callback: "/schooling/cbse/class-9/science/motion?from=school", vars: { n: 10 } }, key: "door.school-save", vars: { n: 10 } },
  // ── Home page
  { name: "home-signin", file: "src/components/home/HomeSignIn.tsx", input: { surface: "home-signin", callback: "/dashboard" }, key: "door.home-signin" },
  { name: "home-vacancies", file: "src/components/VacancyExplorer.tsx", input: { surface: "home-vacancies", callback: "/dashboard" }, key: "door.home-vacancies" },
  // ── Tools and pitches
  { name: "coach-start", file: "src/app/coach/page.tsx", input: { surface: "coach-start", callback: "/coach" }, key: "door.coach-start" },
  { name: "coach-start (?exam= of an exam that can serve a mock)", file: "src/app/coach/page.tsx", input: { surface: "coach-start", callback: "/coach?exam=SSC_CGL", ...EXAM, practice: "canServe" }, key: "door.coach-start.exam", vars: { exam: "SSC CGL" } },
  { name: "revision-start", file: "src/app/revision/page.tsx", input: { surface: "revision-start", callback: "/revision" }, key: "door.revision-start" },
  { name: "finder-save", file: "src/app/find-your-exam/SaveMatchesNudge.tsx", input: { surface: "finder-save", callback: "/find-your-exam?age=22&edu=GRADUATE#results" }, key: "door.finder-save" },
  { name: "finder-start", file: "src/app/find-your-exam/page.tsx", input: { surface: "finder-start", callback: HUB, ...EXAM }, key: "door.finder-start", vars: { exam: "SSC CGL" } },
  { name: "persona-card", file: "src/app/for/[persona]/page.tsx", input: { surface: "persona-card", callback: "/for/working-professionals" }, key: "door.persona-card" },
  // ── Community
  { name: "batch-join", file: "src/app/join/[inviteCode]/page.tsx", input: { surface: "batch-join", callback: "/join/ABC123", vars: { institute: "Vidya Coaching" } }, key: "door.batch-join", vars: { institute: "Vidya Coaching" } },
  { name: "group-join", file: "src/app/g/[token]/page.tsx", input: { surface: "group-join", callback: "/g/abcdef1234" }, key: "door.group-join" },
  { name: "discussion-reply", file: "src/app/discussions/[id]/page.tsx", input: { surface: "discussion-reply", callback: "/discussions/cm123" }, key: "door.discussion-reply" },
  { name: "ideas-upvote", file: "src/app/ideas/page.tsx", input: { surface: "ideas-upvote", callback: "/ideas" }, key: "door.ideas-upvote" },
  { name: "vouch (returns to its page)", file: "src/app/community-vouching/[domain]/page.tsx", input: { surface: "vouch", callback: "/community-vouching/medicine" }, key: "door.vouch", back: true },
  { name: "verify-fact (returns to its page)", file: "src/components/VerificationPanel.tsx", input: { surface: "verify-fact", callback: "/colleges/iit-bombay" }, key: "door.verify-fact", back: true },
  // ── /login and the stopped wall
  { name: "login (a bare /login)", file: "src/app/login/page.tsx", input: { surface: "login", callback: "/dashboard" }, key: "door.login.default" },
  { name: "login ('Welcome back')", file: "src/app/login/page.tsx", input: { surface: "login", callback: "/me/report", returning: true }, key: "door.login.returning" },
  { name: "soft-wall (stopped)", file: "src/components/SoftWallClient.tsx", input: { surface: "soft-wall", callback: "/colleges/iit-bombay" }, key: "door.soft-wall" },
];

/** The four page-wide placements: the path, what the page said, the entry. */
const PAGES: { path: string; page?: placeMod.SignUpPageData | null; key: Key; vars?: Record<string, string | number>; cap?: Key }[] = [
  { path: "/", key: "family.home" },
  { path: "/hi", key: "family.home" },
  { path: "/te/", key: "family.home" },
  // An exam page, when the page supplied the exam's name.
  { path: HUB, page: pageOf(), key: "family.exam.practice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/quiz`, page: pageOf(), key: "family.exam.practice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/pyq/2024`, page: pageOf(), key: "family.exam.practice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/build-mock`, page: pageOf(), key: "family.exam.practice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/archive`, page: pageOf(), key: "family.exam.practice", vars: { exam: "SSC CGL" } },
  { path: `/hi${HUB}/live`, page: pageOf(), key: "family.exam.practice", vars: { exam: "SSC CGL" } },
  { path: HUB, page: pageOf({ practice: "none" }), key: "family.exam.noPractice", vars: { exam: "SSC CGL" } },
  { path: HUB, page: pageOf({ practice: undefined }), key: "family.exam.unknown", vars: { exam: "SSC CGL" } },
  { path: HUB, page: pageOf({ olympiad: true }), key: "family.examOlympiad" },
  { path: `${HUB}/syllabus`, page: pageOf({ notes: true }), key: "family.examSyllabus.practice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/syllabus`, page: pageOf({ notes: true, practice: undefined }), key: "family.examSyllabus.noPractice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/topics/algebra`, page: pageOf({ notes: true, topicQuestions: 5 }), key: "family.examTopic.practice", vars: { exam: "SSC CGL" } },
  // The topic itself has fewer than five checked questions: no topic test, so nothing about a test score.
  { path: `${HUB}/topics/algebra`, page: pageOf({ notes: true, topicQuestions: 4 }), key: "family.examTopic.noPractice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/topics/algebra`, page: pageOf({ notes: true, practice: "none" }), key: "family.examTopic.noPractice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/topics/algebra`, page: pageOf({ notes: false, topicQuestions: 5 }), key: "family.examTopic.testOnly", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/topics/algebra/hi`, page: pageOf({ notes: true }), key: "family.exam.practice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/updates`, page: pageOf(), key: "family.examUpdates.practice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/updates`, page: pageOf({ practice: "none" }), key: "family.examUpdates.noPractice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/checklist`, page: pageOf(), key: "family.examChecklist.practice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/checklist`, page: pageOf({ practice: undefined }), key: "family.examUpdates.noPractice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/cutoff`, page: pageOf(), key: "family.examCutoff.practice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/guide`, page: pageOf(), key: "family.examGuide.practice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/tricks`, page: pageOf(), key: "family.examTricks.practice", vars: { exam: "SSC CGL" } },
  { path: `${HUB}/news/cm123`, page: pageOf(), key: "family.examNews.practice", vars: { exam: "SSC CGL" } },
  // … and when it did not (the fail-closed default): nothing is named.
  { path: HUB, key: "family.examPath" },
  { path: `${HUB}/syllabus`, key: "family.examPath" },
  { path: `/te${HUB}/cutoff`, key: "family.examPath" },
  // Exam lists.
  { path: "/exams/browse", key: "family.examList" },
  { path: "/exams/entrance", key: "family.examList" },
  { path: "/exams/state/telangana", key: "family.examList" },
  { path: "/exams/category/banking", key: "family.examList" },
  { path: "/exams/after/12th", key: "family.examList" },
  // The mock page, the live test, the tutor, the tools.
  { path: "/mocks/cm1234567890", page: { mockGate: true, code: "SSC_CGL" }, key: "door.mock-gate.unnamed" },
  { path: "/mocks/cm1234567890", key: "family.fallback" },
  { path: "/live-test", key: "door.live-test.unnamed" },
  { path: "/chat", key: "door.chat-banner.general" },
  { path: "/chat?general=1", key: "door.chat-banner.general" },
  { path: "/chat?examCode=SSC_CGL", key: "door.chat-banner.general" },
  { path: "/chat?examCode=SSC_CGL", page: pageOf(), key: "door.chat-banner.exam.practice", vars: { exam: "SSC CGL" } },
  { path: "/chat?examCode=SSC_CGL", page: pageOf({ practice: undefined }), key: "door.chat-banner.exam", vars: { exam: "SSC CGL" } },
  { path: "/chat?examCode=NCERT_C09", key: "family.schoolCbse", cap: SCHOOL_CAP },
  { path: "/chat?examCode=CISCE_C10", key: "family.schoolOtherBoard" },
  { path: "/coach", key: "door.coach-start" },
  { path: "/coach?exam=SSC_CGL", key: "door.coach-start" },
  { path: "/coach?exam=SSC_CGL", page: pageOf(), key: "door.coach-start.exam", vars: { exam: "SSC CGL" } },
  { path: "/revision", key: "door.revision-start" },
  { path: "/find-your-exam", key: "family.fallback" },
  { path: "/find-your-exam?age=22&edu=GRADUATE", key: "door.finder-save" },
  { path: "/for/working-professionals", key: "door.persona-card" },
  // Colleges, scholarships, careers, current affairs, jobs, the calendar.
  { path: "/colleges/iit-bombay", key: "family.college" },
  { path: "/colleges/iit-bombay/cse", key: "family.college" },
  { path: "/colleges", key: "family.colleges" },
  { path: "/colleges/state/karnataka", key: "family.colleges" },
  { path: "/colleges/stream/engineering", key: "family.colleges" },
  { path: "/colleges/cutoffs", key: "family.colleges" },
  { path: "/colleges/placements", key: "family.colleges" },
  { path: "/colleges/iti-diploma", key: "family.fallback" },
  { path: "/scholarships/nsp-post-matric", key: "family.scholarship" },
  { path: "/scholarships", key: "family.scholarships" },
  { path: "/scholarships/for/girls", key: "family.scholarships" },
  { path: "/scholarships/closing-soon", key: "family.scholarships" },
  { path: "/scholarships/match", key: "family.scholarships" },
  { path: "/careers/data-scientist", key: "family.career" },
  { path: "/careers", key: "family.careers" },
  { path: "/career-map", key: "family.careers" },
  { path: "/current-affairs", key: "family.currentAffairs" },
  { path: "/current-affairs/2026-10-01", key: "family.currentAffairs" },
  { path: "/current-affairs/capsule/2026-09", key: "family.currentAffairs" },
  { path: "/jobs", key: "family.jobs" },
  { path: "/jobs/govt-jobs", key: "family.jobs" },
  { path: "/jobs-map", key: "family.jobs" },
  { path: "/jobs/internships", key: "family.fallback" },
  { path: "/jobs/skill-careers", key: "family.fallback" },
  { path: "/jobs/resume", key: "family.fallback" },
  { path: "/exam-calendar", key: "family.examCalendar" },
  { path: "/hi/exam-calendar", key: "family.examCalendar" },
  // Life stage and school (Class 8-12).
  { path: "/after-10th", key: "family.stageHub" },
  { path: "/after-12th", key: "family.stageHub" },
  { path: "/schooling/streams/science-pcm", key: "family.streamOption" },
  { path: "/schooling/cbse/class-8", key: "family.schoolCbse", cap: SCHOOL_CAP },
  { path: "/schooling/cbse/class-10/science/light", key: "family.schoolCbse", cap: SCHOOL_CAP },
  { path: "/schooling/cbse/class-12/physics/electric-charges-and-fields", key: "family.schoolCbse", cap: SCHOOL_CAP },
  { path: "/schooling/icse-cisce/class-9", key: "family.schoolOtherBoard" },
  { path: "/schooling/tn-state-board/class-12/physics", key: "family.schoolOtherBoard" },
  // Community.
  { path: "/discussions", key: "family.discussions" },
  { path: "/discussions/cm123", key: "family.discussions" },
  { path: "/g/abcdef1234", key: "family.groupInvite" },
  { path: "/join/ABC123", key: "door.batch-join" },
  { path: "/ideas", key: "door.ideas-upvote" },
  { path: "/c/abcdef1234", key: "family.challengeLink" },
  // Everything else.
  { path: "/ask?q=ssc", key: "family.fallback" },
  { path: "/mentors", key: "family.fallback" },
  { path: "/insights", key: "family.fallback" },
  { path: "/worldwide", key: "family.fallback" },
  { path: "/community-vouching/medicine", key: "family.fallback" },
  { path: "/exams", key: "family.fallback" },
  { path: "/exams/state", key: "family.fallback" },
  { path: "/a-page-that-does-not-exist-yet", key: "family.fallback" },
];

/** The early line's placement ids (the "surface" each page passes to <SignupInline>): a path of that page, the entry. */
const EARLY_LINE: { id: string; path: string; page?: placeMod.SignUpPageData; key: Key }[] = [
  { id: "exam-syllabus", path: `${HUB}/syllabus`, page: pageOf({ notes: true }), key: "family.examSyllabus.practice" },
  { id: "exam-updates", path: `${HUB}/updates`, page: pageOf(), key: "family.examUpdates.practice" },
  { id: "exam-cutoff", path: `${HUB}/cutoff`, page: pageOf(), key: "family.examCutoff.practice" },
  { id: "guide", path: `${HUB}/guide`, page: pageOf(), key: "family.examGuide.practice" },
  { id: "tricks", path: `${HUB}/tricks`, page: pageOf(), key: "family.examTricks.practice" },
  { id: "topic", path: `${HUB}/topics/algebra`, page: pageOf({ notes: true, topicQuestions: 5 }), key: "family.examTopic.practice" },
  { id: "news", path: `${HUB}/news/cm123`, page: pageOf(), key: "family.examNews.practice" },
  { id: "exam-checklist", path: `${HUB}/checklist`, page: pageOf(), key: "family.examChecklist.practice" },
  { id: "exams-after", path: "/exams/after/12th", key: "family.examList" },
  { id: "exams-browse", path: "/exams/browse", key: "family.examList" },
  { id: "exams-category", path: "/exams/category/banking", key: "family.examList" },
  { id: "exams-entrance", path: "/exams/entrance", key: "family.examList" },
  { id: "exams-state", path: "/exams/state/telangana", key: "family.examList" },
  { id: "college", path: "/colleges/iit-bombay", key: "family.college" },
  { id: "college-branch", path: "/colleges/iit-bombay/cse", key: "family.college" },
  { id: "colleges-index", path: "/colleges", key: "family.colleges" },
  { id: "colleges-state", path: "/colleges/state/karnataka", key: "family.colleges" },
  { id: "colleges-stream", path: "/colleges/stream/engineering", key: "family.colleges" },
  { id: "colleges-cutoffs", path: "/colleges/cutoffs", key: "family.colleges" },
  { id: "colleges-placements", path: "/colleges/placements", key: "family.colleges" },
  { id: "colleges-iti-diploma", path: "/colleges/iti-diploma", key: "family.fallback" },
  { id: "scholarship", path: "/scholarships/nsp-post-matric", key: "family.scholarship" },
  { id: "scholarships-index", path: "/scholarships", key: "family.scholarships" },
  { id: "scholarships-for", path: "/scholarships/for/girls", key: "family.scholarships" },
  { id: "career", path: "/careers/data-scientist", key: "family.career" },
  { id: "careers-index", path: "/careers", key: "family.careers" },
  { id: "ca-index", path: "/current-affairs", key: "family.currentAffairs" },
  { id: "ca-daily", path: "/current-affairs/2026-10-01", key: "family.currentAffairs" },
  { id: "ca-capsule", path: "/current-affairs/capsule/2026-09", key: "family.currentAffairs" },
  { id: "jobs-index", path: "/jobs", key: "family.jobs" },
  { id: "jobs-map", path: "/jobs-map", key: "family.jobs" },
  { id: "exam-calendar", path: "/exam-calendar", key: "family.examCalendar" },
  { id: "stage-hub", path: "/after-10th", key: "family.stageHub" },
  { id: "stream-option", path: "/schooling/streams/science-pcm", key: "family.streamOption" },
];

// ── a small TSX loader (the tests/unit/signup-cta.test.ts one, trimmed) ───

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
};
const loaded = new Map<string, { exports: Record<string, unknown> }>();
function load(relPath: string): Record<string, unknown> {
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
}
type FC<P> = (p: P) => React.ReactElement | null;
const render = <P extends object>(C: unknown, props: P) => renderToStaticMarkup(React.createElement(C as FC<P>, props));
const unescape = (html: string) => html.replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const ui = load("src/components/SignUpButton.tsx") as { SignUpButton: unknown; SIGNUP_CAPTION_PENDING: string };
const googleBtn = load("src/components/GoogleSignInButton.tsx") as { GoogleSignInButton: unknown };

describe("A. every placement resolves to its entry, and renders the data source's words", () => {
  it.each(PLACEMENTS.map((p) => [p.name, p] as const))("%s", (_n, p) => {
    const place = signUpPlaceFor(p.input);
    expect(place.key).toBe(p.key);
    expect(place.back === true).toBe(p.back === true);
    expect(place.cap).toBe(p.cap);
    // The entry exists in the table, and the words are the table's — in English, Hindi and Telugu.
    for (const l of LANGS) {
      expect(SIGNUP_TABLES[l].places[p.key], `${l}/${p.key}`).toBeTruthy();
      const want = tableWords(l, p.key, p.vars ?? {}, p.back === true, p.cap);
      expect(want.text + want.short, `${l}: a hole was left in the expected words`).not.toMatch(/[{}]/);
      expect(signUpWords(l, p.input), l).toEqual(want);
      expect(signUpWordsFrom(SIGNUP_TABLES[l], place), l).toEqual(want);
    }
    // The placement's file is there and names its door.
    expect(fs.existsSync(path.join(ROOT, p.file)), p.file).toBe(true);
  });

  it.each(PAGES.map((p) => [`${p.path}${p.page ? ` + ${JSON.stringify(p.page)}` : ""}`, p] as const))("page family: %s", (_n, p) => {
    const place = signUpPagePlace(p.path, p.page);
    expect(place.key).toBe(p.key);
    expect(place.cap).toBe(p.cap);
    // The header, the site card, the timed bar and the early line take the same entry on one page.
    for (const surface of ["header", "signup-pitch", "signup-nudge", "signup-inline"]) {
      expect(signUpPlaceFor({ surface, callback: p.path, page: p.page }), surface).toEqual(place);
    }
    for (const l of LANGS) expect(signUpWordsFrom(SIGNUP_TABLES[l], place), l).toEqual(tableWords(l, p.key, p.vars ?? {}, false, p.cap));
  });

  it("the early line: every placement id (the surface each page passes) takes the entry of its page family", () => {
    const inline = code("src/components/SignupInline.tsx");
    // The line's button is a page-wide placement: it passes its door and its own link, nothing about an exam.
    const tag = inline.match(/<SignUpButton\b[\s\S]*?\/>/)?.[0] ?? "";
    expect(tag).toContain('surface="signup-inline"');
    expect(tag).not.toMatch(/\bexam=|\bpractice=|\bcontext=|\bplace=/);
    // Every id mounted anywhere under src/ is in the list above.
    const mounted = new Set<string>();
    for (const f of [...walk(path.join(ROOT, "src/app"), /\.tsx$/), ...walk(path.join(ROOT, "src/components"), /\.tsx$/)].map(rel)) {
      for (const m of code(f).matchAll(/<SignupInline\b[^>]*\bsurface="([^"]+)"/g)) mounted.add(m[1]);
    }
    expect([...mounted].sort()).toEqual(EARLY_LINE.map((e) => e.id).sort());
    for (const e of EARLY_LINE) {
      expect(signUpPlaceFor({ surface: "signup-inline", callback: e.path, page: e.page }).key, e.id).toBe(e.key);
      expect(pitchAllowedPath(e.path), e.id).toBe(true);
    }
  }, 60_000);

  it("the timed bar: every content family it shows on has an entry, and a page it never shows on is not asked", () => {
    const families = new Set<string>();
    for (const p of PAGES) {
      const fam = contentFamily(p.path.split("?")[0]);
      if (fam) families.add(fam);
    }
    // Every family the bar knows is exercised by a path of the list above.
    expect([...families].sort()).toEqual(
      ["ask", "ca-capsule", "ca-daily", "career", "careers", "college", "colleges", "current-affairs", "exam-archive", "exam-calendar", "exam-checklist", "exam-cutoff", "exam-syllabus", "exam-updates", "guide", "jobs-map", "news", "scholarship", "scholarships", "school", "topic", "tricks"].sort(),
    );
    // "ask" and a page with no entry of its own: the general words; a school page: by its board.
    expect(signUpPagePlace("/ask").key).toBe("family.fallback");
    expect(contentFamily("/schooling/cbse/class-9/science/motion")).toBe("school");
    expect(contentFamily("/schooling/tn-state-board/class-10/science")).toBe("school");
    expect(signUpPagePlace("/schooling/tn-state-board/class-10/science").key).toBe("family.schoolOtherBoard");
  });

  it("the placements use every entry of the table but one — family.schoolChat, which needs the word 'chat' on a school surface", () => {
    const used = new Set<Key>([...PLACEMENTS.map((p) => p.key), ...PAGES.map((p) => p.key)]);
    expect(KEYS.filter((k) => !used.has(k))).toEqual(["family.schoolChat"]);
    // The class chat's header takes the class page's entry instead (decision of 2 Oct 2026).
    expect(signUpPagePlace("/chat?examCode=NCERT_C09").key).toBe("family.schoolCbse");
    expect(signUpPlaceFor({ surface: "login", callback: "/chat?examCode=NCERT_C10" }).key).toBe("family.schoolCbse");
  });

  it("the old five variants are aliases of five entries", () => {
    expect(signUpPlaceOfContext({ kind: "general" })).toEqual({ key: "family.fallback" });
    expect(signUpPlaceOfContext(null)).toEqual({ key: "family.fallback" });
    expect(signUpPlaceOfContext({ kind: "exam", exam: "SSC CGL", practice: true })).toEqual({ key: "family.exam.practice", vars: { exam: "SSC CGL" } });
    // "examNoPractice" was used for "not known" too: never the entry that says "no practice questions yet".
    expect(signUpPlaceOfContext({ kind: "exam", exam: "AILET", practice: false })).toEqual({ key: "family.exam.unknown", vars: { exam: "AILET" } });
    expect(signUpPlaceOfContext({ kind: "exam", exam: "  ", practice: true })).toEqual({ key: "family.fallback" });
    expect(signUpPlaceOfContext({ kind: "school" })).toEqual({ key: "family.schoolCbse", cap: SCHOOL_CAP });
    expect(signUpPlaceOfContext({ kind: "tutor" })).toEqual({ key: "door.chat-save.general" });
  });

  it("a language other than en / hi / te reads the English words", () => {
    for (const l of ["ta", "bn", "", null, undefined]) {
      expect(signUpWordsLocale(l)).toBe("en");
      expect(signUpPlaceWords(l, { key: "family.home" })).toEqual(tableWords("en", "family.home"));
    }
  });

  it("rendered: the button a SERVER page fills shows the entry's caption under it and its tooltip as the button's description", () => {
    for (const l of LANGS) {
      const input: Input = { surface: "pyq-year", callback: `${HUB}/pyq/2024`, ...EXAM, setQuestions: 10, vars: { year: 2024 } };
      const words = signUpWords(l, input);
      const html = unescape(render(ui.SignUpButton, { href: `/login?callbackUrl=${encodeURIComponent(`${HUB}/pyq/2024`)}&from=pyq-year`, surface: "pyq-year", locale: l, ...words, side: "top" }));
      const want = tableWords(l, "door.pyq-year", { exam: "SSC CGL", year: "2024" });
      expect(html, l).toContain(`<span class="su-cap">${want.short}</span>`);
      const id = html.match(/<a\b[^>]*\saria-describedby="([^"]+)"/)?.[1];
      expect(html, l).toContain(`<span id="${id}" role="tooltip" class="su-tip-text">${want.text}</span>`);
      // /login's and the gate's button: the same two elements.
      const login = unescape(render(googleBtn.GoogleSignInButton, { callbackUrl: "/dashboard", locale: l, continueLabel: "Continue with Google", ...signUpWords(l, { surface: "login", callback: "/dashboard" }) }));
      const def = tableWords(l, "door.login.default");
      expect(login, l).toContain(`<span class="su-cap">${def.short}</span>`);
      expect(login, l).toContain(`role="tooltip" class="su-tip-text">${def.text}</span>`);
    }
  });

  it("rendered: a client island's button has no words in the server HTML — its caption's line is held open, nothing else", () => {
    const html = render(ui.SignUpButton, { href: `/login?callbackUrl=${encodeURIComponent(HUB)}&from=quiz-end`, surface: "quiz-end", ...EXAM });
    expect(html).toContain(`<span class="su-cap">${ui.SIGNUP_CAPTION_PENDING}</span>`);
    expect(ui.SIGNUP_CAPTION_PENDING).toBe(" ");
    expect(html).not.toMatch(/role="tooltip"|aria-describedby|su-tip/);
    // explain="own" / "tooltip": nothing at all until the words arrive.
    for (const explain of ["own", "tooltip"]) {
      const bare = render(ui.SignUpButton, { href: "/login?callbackUrl=%2Fideas&from=ideas-upvote", surface: "ideas-upvote", explain });
      expect(bare, explain).not.toMatch(/su-cap|role="tooltip"|aria-describedby|su-tip/);
      expect(bare, explain).toContain("Sign up with Google");
    }
  });

  it("the browser's words are the same data source, chosen by the same rules: each language's chunk is the file the server reads", async () => {
    for (const l of LANGS) {
      expect(loadMod.cachedSignUpKit(l), l).toBeNull();
      const kit = await loadMod.loadSignUpKit(l);
      expect(kit.table, l).toEqual(SIGNUP_TABLES[l]);
      // The rules the browser loads are the module the server imports — not a copy.
      expect(kit.rules.signUpPlaceFor, l).toBe(signUpPlaceFor);
      expect(kit.rules.signUpWordsFrom, l).toBe(signUpWordsFrom);
      expect(loadMod.cachedSignUpKit(l), l).toBe(kit);
      for (const p of PLACEMENTS) expect(kit.rules.signUpWordsFrom(kit.table, kit.rules.signUpPlaceFor(p.input)), `${l}/${p.name}`).toEqual(signUpWords(l, p.input));
    }
    for (const l of ["en", "hi", "te", "ta", "bn", "", null, undefined]) expect(loadMod.signUpWordsLang(l), String(l)).toBe(signUpWordsLocale(l));
  });
});

// ── A2. the wiring ───────────────────────────────────────────────────────

describe("A2. the wiring: server pages resolve their words; client doors pass what the resolver needs", () => {
  /** A server-rendered door: its page resolves the words (signUpWords) for this door. */
  const SERVER: [string, string][] = [
    ["src/app/exams/[code]/page.tsx", "hub-box"],
    ["src/app/exams/[code]/pyq/[year]/page.tsx", "pyq-year"],
    ["src/app/mocks/[id]/MockGate.tsx", "mock-gate"],
    ["src/app/live-test/page.tsx", "live-test"],
    ["src/app/coach/page.tsx", "coach-start"],
    ["src/app/revision/page.tsx", "revision-start"],
    ["src/app/find-your-exam/page.tsx", "finder-start"],
    ["src/app/for/[persona]/page.tsx", "persona-card"],
    ["src/app/join/[inviteCode]/page.tsx", "batch-join"],
    ["src/app/g/[token]/page.tsx", "group-join"],
    ["src/app/discussions/[id]/page.tsx", "discussion-reply"],
    ["src/app/ideas/page.tsx", "ideas-upvote"],
    ["src/app/community-vouching/[domain]/page.tsx", "vouch"],
    ["src/components/home/HomeSignIn.tsx", "home-signin"],
    ["src/app/login/page.tsx", "login"],
  ];

  it.each(SERVER)("%s resolves the words of door %s on the server", (file, door) => {
    const src = code(file);
    expect(src).not.toMatch(/^\s*["']use client["']/m);
    expect(src).toContain('import { signUpWords } from "@/lib/signup-place-words";');
    expect(src).toMatch(new RegExp(`signUpWords\\([^{]{0,60}\\{\\s*surface: "${door}"`));
    // … and hands them to the button (spread: `text` and `short`).
    expect(src).toMatch(/\{\.\.\.(?:signUpWords\(|pyqSignUp\}|topSignUp\}|signUp\})/);
  });

  it("the server pages pass each door what its entry needs", () => {
    const hub = code("src/app/exams/[code]/page.tsx");
    expect(hub).toContain("practice: signUpPracticeOf(practice),");
    expect(hub).toContain("olympiad: String(exam.category) === OLYMPIAD_CATEGORY,");
    expect(hub).toContain("callback: `/exams/${exam.code}?start=practice`,");
    const pyq = code("src/app/exams/[code]/pyq/[year]/page.tsx");
    expect(pyq).toContain("setQuestions: guestSet.length,");
    expect(pyq).toContain("vars: { year: yearNum },");
    expect(pyq.match(/\{\.\.\.pyqSignUp\}/g)).toHaveLength(2);
    expect(code("src/app/live-test/page.tsx")).toContain('signUpWords("en", { surface: "live-test", callback: "/live-test", vars: { exam: r.short } })');
    expect(code("src/app/join/[inviteCode]/page.tsx")).toContain("vars: { institute: batch.course.institution.name }");
    // The live-test card's exam is a VARIABLE only: this sign-in sets no exam, so no `exam` prop is passed.
    expect(code("src/app/live-test/page.tsx").match(/<SignUpButton\b[\s\S]*?\/>/)?.[0]).not.toMatch(/\bexam=|\bexamCode=/);
    // /login: the visitor's own door, the catalogue's name, the exam's practice value (a failed read: not known).
    const login = code("src/app/login/page.tsx");
    expect(login).toContain("from: sp.from ?? null,");
    expect(login).toContain('returning: li.kind === "return",');
    expect(login).toContain("const signUpFacts = signUpExam ? await examSignUpFacts(signUpExam.code) : null;");
    expect(login).toContain("practice: signUpFacts?.practice,");
    // The coach: an exam is named only for a guest's ?exam= that the cached practice map holds.
    const coach = code("src/app/coach/page.tsx");
    expect(coach).toContain("examSignUpFacts(guestExamCode),");
    expect(coach).toContain("exam: guestExam?.short,");
    expect(coach).toContain("practice: guestExam?.practice,");
  });

  it("no caller passes a hard-coded practice any more, and the tutor's card passes its exam instead of a fixed context", () => {
    const hits: string[] = [];
    for (const f of [...walk(path.join(ROOT, "src/app"), /\.tsx$/), ...walk(path.join(ROOT, "src/components"), /\.tsx$/)].map(rel)) {
      if (f === "src/components/SignUpButton.tsx" || f === "src/components/GoogleSignInButton.tsx") continue;
      for (const m of code(f).matchAll(/<(?:SignUpButton|GoogleSignInButton|HubSignInLink|GateSignInButton)\b[\s\S]*?\/>/g)) {
        if (/\n\s*practice\n|\spractice\s|\bpractice=\{true\}|\bpractice=\{practice\.hasPractice\}/.test(m[0])) hits.push(`${f}: a hard-coded or boolean practice`);
        if (/\bcontext=\{/.test(m[0])) hits.push(`${f}: a fixed context`);
      }
    }
    expect(hits).toEqual([]);
    const chat = code("src/app/chat/ChatInterface.tsx");
    const save = (chat.match(/<SignUpButton\b[\s\S]*?\/>/g) ?? []).find((t) => t.includes('surface="chat-save"')) ?? "";
    expect(save).toContain("exam={examShortName}");
    expect(save).toContain("examCode={examCode}");
    // The school chapter's save line passes the size of the account set.
    expect(code("src/components/school/SchoolStudentEntry.tsx")).toContain("vars={{ n: schoolChapterMockCount(p.validatedQuestions ?? 0) }}");
  }, 60_000);

  it("the 'vouch' button and the fact panel's button return to the page they were pressed on", () => {
    const vouch = code("src/app/community-vouching/[domain]/page.tsx");
    expect(vouch).toContain("href={`/login?callbackUrl=${encodeURIComponent(`/community-vouching/${dom}`)}&from=vouch`}");
    expect(vouch).not.toContain('href="/login?from=vouch"');
    const panel = code("src/components/VerificationPanel.tsx");
    expect(panel).toContain('href={pathname && pathname.startsWith("/") && !pathname.startsWith("//") ? `/login?callbackUrl=${encodeURIComponent(pathname)}&from=verify-fact` : "/login?from=verify-fact"}');
    // With the callback, the sentence that said "you land on your dashboard" is left out — in every language.
    for (const l of LANGS) {
      for (const [surface, callback, key] of [["vouch", "/community-vouching/medicine", "door.vouch"], ["verify-fact", "/colleges/iit-bombay", "door.verify-fact"]] as const) {
        const back = signUpWords(l, { surface, callback });
        const tail = SIGNUP_TABLES[l].places[key].tail ?? "";
        expect(tail.length, `${l}/${key}`).toBeGreaterThan(20);
        expect(back.text.includes(tail), `${l}/${key}`).toBe(false);
        expect(back, `${l}/${key}`).toEqual(tableWords(l, key, {}, true));
        // Without a callback (the link as it was) the visitor does land on the dashboard, and the entry says so.
        const dash = signUpWords(l, { surface, callback: surface === "vouch" ? "/" : "/" });
        expect(dash.text.includes(tail), `${l}/${key}: no callback`).toBe(true);
        expect(dash, `${l}/${key}`).toEqual(tableWords(l, key, {}, false));
      }
    }
    expect(SIGNUP_TABLES.en.places["door.vouch"].tail).toMatch(/dashboard/);
    expect(signUpWords("en", { surface: "vouch", callback: "/community-vouching/medicine" }).text).not.toMatch(/dashboard/);
  });

  it("every exam page tells its placements the exam's name and what is true of it; the gate marks the mock page", () => {
    const pages = ["syllabus", "updates", "cutoff", "guide", "tricks", "checklist", "archive", "quiz", "live", "reactions", "score-estimate", "build-mock", "news/[id]", "topics/[topicCode]", "topics/[topicCode]/hi", "topics/[topicCode]/quiz", "pyq/[year]"];
    for (const p of pages) {
      const src = code(`src/app/exams/[code]/${p}/page.tsx`);
      expect(src, p).toContain('import { ExamSignUpContext } from "@/components/ExamSignUpContext";');
      expect(src, p).toMatch(/<ExamSignUpContext code=\{[^}]+\} exam=\{[^}]+\}/);
    }
    expect(code("src/app/exams/[code]/syllabus/page.tsx")).toContain("notes={counts.linkedTopics > 0}");
    expect(code("src/app/exams/[code]/topics/[topicCode]/page.tsx")).toContain("notes={!!notes} topicQuestions={practiceQs.length}");
    // The Hindi notes page passes no notes flag: it takes the exam's entry, never a topic entry.
    expect(code("src/app/exams/[code]/topics/[topicCode]/hi/page.tsx")).not.toMatch(/<ExamSignUpContext[^>]*\bnotes=/);
    expect(code("src/app/exams/[code]/page.tsx")).toContain("<SignUpPageContext exam={exam.shortName} code={exam.code} practice={signUpPracticeOf(practice)} olympiad={String(exam.category) === OLYMPIAD_CATEGORY} />");
    expect(code("src/app/chat/page.tsx")).toContain("{anonExamCode && anonExamShort && <ExamSignUpContext code={anonExamCode} exam={anonExamShort} />}");
    expect(code("src/app/c/[token]/page.tsx")).toContain("<ExamSignUpContext code={ch.examCode} exam={ch.examShort} />");
    expect(code("src/app/mocks/[id]/MockGate.tsx")).toContain("<SignUpPageContext mockGate={schoolContainerClassOf(examCode) === null} code={examCode} olympiad={olympiad} />");
    // The facts come from the cached practice map — and nothing is said when that read fails.
    const ctx = code("src/components/ExamSignUpContext.tsx");
    expect(ctx).not.toMatch(/["']use client["']/);
    expect(ctx).toContain("const facts = await examSignUpFacts(code);");
    expect(ctx).toContain("if (!facts) return null;");
    const facts = code("src/lib/db/exam-practice.ts");
    expect(facts).toMatch(/export async function examSignUpFacts\([\s\S]*?try \{\s*const row = \(await loadExamPracticeStates\(\)\)\.get\(code\);\s*if \(!row\) return null;\s*return \{ practice: signUpPracticeOf\(row\.practice\), olympiad: row\.category === OLYMPIAD_CATEGORY \};\s*\} catch \{\s*return null;\s*\}/);
    // The island writes under the page's own path and takes its facts back when the page goes.
    const island = code("src/components/SignUpPageContext.tsx");
    expect(island).toMatch(/^\s*"use client";/);
    expect(island).toContain("setSignUpPageData(path, data);");
    expect(island).toContain("return () => clearSignUpPageData(path, data);");
    expect(island).toContain("return null;");
  }, 60_000);

  it("the checklist page passes its exam to the early line — and '{exam} mocks' only for an exam that can serve one", () => {
    const src = code("src/app/exams/[code]/checklist/page.tsx");
    expect(src).toContain('<SignupInline surface="exam-checklist" exam={short} practice={examCanServeMock} revealOffscreen />');
    // The same test as the tooltip on that line's button (family.examChecklist.practice): five or more checked
    // questions. "Has practice" is true from ONE question or one shared mock; a failed read is "not known".
    expect(src).toContain('const examCanServeMock = signUpFacts?.practice === "canServe";');
    expect(src).toMatch(/const \[session, articleRow, gates, signUpFacts\] = await Promise\.all\(\[[\s\S]*?examSignUpFacts\(exam\.code\),\s*\]\);/);
    expect(src).not.toMatch(/examPracticeState|hasPractice/);
  });

  it("the builder's two doors are resolved by its page, which counts the questions its topics hold", () => {
    const page = code("src/app/exams/[code]/build-mock/page.tsx");
    expect(page).not.toMatch(/^\s*["']use client["']/m);
    expect(page).toContain('import { signUpWords } from "@/lib/signup-place-words";');
    // The checked questions in the topics the form lists, in the mode the page is in (`n` is the PYQ count in ?pyq=1).
    expect(page).toContain("const listedQuestions = [...subjects.values()].reduce((sum, s) => sum + s.topics.reduce((a, t) => a + t.n, 0), 0);");
    expect(page).toContain("n: pyq ? r.npyq : r.n,");
    expect(page).toMatch(/const builderSignUp = \(surface: "build-mock-form" \| "build-gate-quiz-end", locale: string, callback: string\) =>\s*signUpWords\(locale, \{\s*surface,\s*callback,\s*exam: exam\.shortName,\s*examCode: exam\.code,\s*practice: signUpFacts\?\.practice,\s*olympiad: String\(exam\.category\) === OLYMPIAD_CATEGORY,\s*setQuestions: listedQuestions,\s*\}\);/);
    expect(page).toContain('signUp={guestButtons ? builderSignUp("build-mock-form", tt.locale, `/exams/${exam.code}/build-mock${pyq ? "?pyq=1" : ""}`) : null}');
    expect(page).toContain('signInWords={builderSignUp("build-gate-quiz-end", guestQuiz.locale, gateCallback)}');
    // The form and the gate hand the words to their buttons as text.
    const form = (code("src/app/exams/[code]/build-mock/BuilderForm.tsx").match(/<SignUpButton\b[\s\S]*?\/>/g) ?? []).find((t) => t.includes('surface="build-mock-form"')) ?? "";
    expect(form).toContain("text={signUp?.text}");
    expect(form).toContain("short={signUp?.short}");
    const gate = code("src/components/GuestQuizGate.tsx");
    expect(gate).toContain("text={signInWords?.text}");
    expect(gate).toContain("short={signInWords?.short}");
    // The form lists a topic from three questions and refuses a set under five: the two numbers the rule rests on.
    expect(page).toContain("HAVING COUNT(q.id) >= 3");
    expect(code("src/app/exams/[code]/build-mock/BuilderForm.tsx")).toContain("const tooFew = hasSel && available < MIN_MOCK_QUESTIONS;");
    expect(read("src/lib/mock-fill.ts")).toMatch(/export const MIN_MOCK_QUESTIONS = 5;/);
  });

  it("the header, the site card and the timed bar choose the page family's entry — and the bar's one line is its caption", () => {
    const header = code("src/components/HeaderAuthControls.tsx");
    expect(header).toContain("const pageData = useSignUpPageData();");
    expect(header).toMatch(
      /useSignUpWords\(\s*lang,\s*\{ surface: "header", callback: callbackOfLoginHref\(loginHref\), page: pageData \},\s*\{ off: !guestButton \|\| isChildSchoolPath\(pathname\) \|\| \(session === null && hasSessionHint\(\)\) \},\s*\)\?\.text \?\? ""/,
    );
    // Nothing is added under the header button: still tooltip only, after mount.
    expect(header).toMatch(/<SignUpShell text=\{signUpTip\} surface="header" explain="tooltip" align="end" deferText onWant=\{wantTip\}>/);
    // The site card: its button decides from the card's own link (this page) — a page-wide surface.
    const card = code("src/components/SignupPitch.tsx").match(/<SignUpButton\b[\s\S]*?\/>/)?.[0] ?? "";
    expect(card).toContain('surface="signup-pitch"');
    expect(card).toContain("href={href}");
    expect(code("src/components/SignupPitch.tsx")).toContain("setHref(signupHref(location.pathname + location.search));");
    // The timed bar: the same entry; its line is the caption, the old line only if the words did not arrive.
    const bar = code("src/components/SignupNudge.tsx");
    expect(bar).toContain('const words = useSignUpWords(barLocale, show ? { surface: "signup-nudge", callback: herePath, page: pageData } : null, { now: true, off: !show });');
    expect(bar).toContain("{oldLine ? copy.line : words?.short ?? copy.line}");
    expect(bar).toContain("herePath = location.pathname + location.search;");
    expect(bar.match(/<SignUpButton\b[\s\S]*?\/>/)?.[0]).toContain("href={`/login?callbackUrl=${encodeURIComponent(location.pathname + location.search)}&from=header`}");
    // The words are fetched right before the bar shows, so it comes up with its line in place.
    expect(bar).toMatch(/Promise\.race\(\[loadSignUpKit\(lc\)\.then\(\(\) => undefined, \(\) => undefined\), waited\]\)\.then\(\(\) => \{[\s\S]*?setShow\(here\);\s*beacon\("shown", \{ placement: here, trigger \}\);/);
    // The shared button resolves a page-wide surface from its own link and the page's facts.
    const btn = code("src/components/SignUpButton.tsx");
    expect(btn).toContain("const page = useSignUpPageData();");
    expect(btn).toContain("{ surface, callback: callbackOfLoginHref(href), exam, examCode, practice, olympiad, page, vars, setQuestions },");
    // The four page-wide surfaces take the page family's entry (the rules' PAGE_WIDE set).
    expect(code("src/lib/signup-place.ts")).toContain('const PAGE_WIDE: ReadonlySet<string> = new Set(["header", "signup-pitch", "signup-inline", "signup-nudge"]);');
    expect(code("src/lib/signup-place.ts")).toContain("if (PAGE_WIDE.has(p.surface)) return signUpPagePlace(callback, p.page);");
  });
});

// ── B. every condition, fail closed ──────────────────────────────────────

describe("B. every entry's condition is enforced: what cannot be shown to hold takes the next entry", () => {
  const key = (i: Input) => signUpPlaceFor(i).key;

  it("practice has three values: 5 or more checked questions; a read that found nothing; not known", () => {
    expect(SIGNUP_CAN_SERVE_MIN).toBe(MIN_SERVED_QUESTIONS);
    expect(signUpPracticeOf({ questions: 5, systemMocks: 0 })).toBe("canServe");
    expect(signUpPracticeOf({ questions: 4000, systemMocks: 12 })).toBe("canServe");
    expect(signUpPracticeOf({ questions: 0, systemMocks: 0 })).toBe("none");
    // 1 to 4 questions, or shared mocks alone (a count cannot say one can be served): not known.
    for (const c of [{ questions: 1, systemMocks: 0 }, { questions: 4, systemMocks: 3 }, { questions: 0, systemMocks: 2 }]) expect(signUpPracticeOf(c), JSON.stringify(c)).toBeUndefined();
    for (const c of [null, undefined, { questions: Number.NaN, systemMocks: 0 }]) expect(signUpPracticeOf(c as never)).toBeUndefined();
    expect(signUpPracticeOf(practiceStateFromCounts({ questions: 7, systemMocks: 0 }))).toBe("canServe");
    // A FAILED read must never reach signUpPracticeOf as "no practice": the reader returns null instead
    // (src/lib/db/exam-practice.ts examSignUpFacts) — the frozen "no practice" a failed read falls back to would say "none".
    expect(signUpPracticeOf(NO_PRACTICE)).toBe("none");
    expect(code("src/lib/db/exam-practice.ts")).toMatch(/examSignUpFacts[\s\S]*?\} catch \{\s*return null;\s*\}/);
  });

  it.each(["hub-box", "hub-try-one", "quiz-end", "cutoff-nudge", "challenge-end"] as const)("%s promises whole timed mocks: only for an exam that can serve one", (surface) => {
    const base: Input = { surface, callback: surface === "hub-box" ? `${HUB}?start=practice` : HUB, ...EXAM };    expect(key({ ...base, practice: "canServe" })).toBe(`door.${surface}`);
    expect(key({ ...base })).toBe("family.exam.unknown");
    expect(key({ ...base, practice: null })).toBe("family.exam.unknown");
    // A door never says "no practice questions for {exam} yet": it stands beside a question, and the practice
    // value comes from a ten-minute cache (review of 2 Oct 2026).
    expect(key({ ...base, practice: "none" })).toBe("family.exam.unknown");
    expect(key({ ...base, page: pageOf({ practice: "none" }) })).toBe("family.exam.unknown");
    // What the page said about THIS exam counts; what it said about another exam does not.
    expect(key({ ...base, page: pageOf() })).toBe(`door.${surface}`);
    expect(key({ ...base, page: pageOf({ code: "SSC_CHSL" }) })).toBe("family.exam.unknown");
    // No name, a name the link does not back, or another exam's code: nothing is named.
    expect(key({ ...base, exam: null, practice: "canServe" })).toBe("family.examPath");
    expect(key({ ...base, exam: "  ", practice: "canServe" })).toBe("family.examPath");
    expect(key({ ...base, examCode: "SSC_CHSL", practice: "canServe" })).toBe("family.examPath");
    expect(key({ ...base, callback: "/colleges/iit-bombay", practice: "canServe" })).toBe("family.fallback");
    expect(key({ ...base, callback: null, practice: "canServe" })).toBe("family.fallback");
    // An olympiad: no exam named, no candidate addressed, the age sentence.
    expect(key({ ...base, practice: "canServe", olympiad: true })).toBe("family.examOlympiad");
    expect(key({ ...base, page: pageOf({ olympiad: true }) })).toBe("family.examOlympiad");
  });

  it("practice not known never gets a sentence that says 'no practice questions' — and never one that promises a mock", () => {
    const says = (k: Key) => `${SIGNUP_TABLES.en.places[k].t} ${SIGNUP_TABLES.en.places[k].c}`;
    const noPractice = KEYS.filter((k) => /no practice questions/i.test(says(k)));
    expect(noPractice).toEqual(["family.exam.noPractice"]);
    const unknownInputs: Input[] = [
      ...(["hub-box", "hub-try-one", "quiz-end", "cutoff-nudge", "challenge-end", "pyq-year", "verdict-poll"] as const).map((surface) => ({ surface, callback: HUB, ...EXAM })),
      { surface: "chat-banner", callback: "/chat?examCode=SSC_CGL", ...EXAM },
      { surface: "chat-save", callback: "/chat?examCode=SSC_CGL", ...EXAM },
      ...["", "/syllabus", "/topics/algebra", "/updates", "/checklist", "/cutoff", "/guide", "/tricks", "/news/cm1", "/archive"].flatMap((sub) => [
        { surface: "header", callback: `${HUB}${sub}`, page: pageOf({ practice: undefined, notes: true }) },
        { surface: "signup-inline", callback: `${HUB}${sub}`, page: pageOf({ practice: undefined, notes: false, topicQuestions: 2 }) },
      ]),
    ];
    for (const i of unknownInputs) {
      const k = key(i);
      expect(k, JSON.stringify(i)).not.toBe("family.exam.noPractice");
      for (const claim of SIGNUP_PRACTICE_CLAIMS) expect(SIGNUP_PLACE_CLAIMS[k].includes(claim), `${k} (${i.surface} ${i.callback}): ${claim}`).toBe(false);
    }
    // … and "none" gets no mock promise either.
    for (const sub of ["", "/syllabus", "/topics/algebra", "/updates", "/checklist", "/cutoff", "/guide", "/tricks", "/news/cm1"]) {
      const k = signUpPagePlace(`${HUB}${sub}`, pageOf({ practice: "none", notes: true })).key;
      for (const claim of SIGNUP_PRACTICE_CLAIMS) expect(SIGNUP_PLACE_CLAIMS[k].includes(claim), `${k}: ${claim}`).toBe(false);
    }
  });

  it("the PYQ year: the timed set's sentence needs the year and a set of five or more", () => {
    const base: Input = { surface: "pyq-year", callback: `${HUB}/pyq/2024`, ...EXAM, setQuestions: 5, vars: { year: 2024 } };
    expect(signUpPlaceFor(base)).toEqual({ key: "door.pyq-year", vars: { exam: "SSC CGL", year: "2024" } });
    expect(key({ ...base, setQuestions: 4 })).toBe("family.exam.unknown");
    expect(key({ ...base, setQuestions: undefined })).toBe("family.exam.unknown");
    expect(key({ ...base, setQuestions: 4, practice: "canServe" })).toBe("family.exam.practice");
    expect(key({ ...base, vars: {} })).toBe("family.exam.unknown");
    expect(key({ ...base, vars: { year: "last year" } })).toBe("family.exam.unknown");
    expect(key({ ...base, exam: null })).toBe("family.examPath");
    expect(key({ ...base, olympiad: true })).toBe("family.examOlympiad");
  });

  it("the gates: named only with the mock's exam and its code; a school class's own practice set gets the school words", () => {
    const cb = "/mocks/cm1234567890?from=signin";
    expect(key({ surface: "mock-gate", callback: cb, ...EXAM })).toBe("door.mock-gate");
    expect(key({ surface: "mock-gate", callback: cb, exam: "SSC CGL" })).toBe("door.mock-gate.unnamed");
    expect(key({ surface: "mock-gate", callback: cb })).toBe("door.mock-gate.unnamed");
    expect(key({ surface: "mock-gate-quiz-end", callback: cb })).toBe("door.mock-gate.unnamed");
    expect(key({ surface: "mock-gate", callback: HUB, ...EXAM })).toBe("family.fallback");
    expect(key({ surface: "mock-gate", callback: cb, exam: "NCERT Class 9", examCode: "NCERT_C09" })).toBe("family.schoolCbse");
    expect(key({ surface: "mock-gate", callback: cb, exam: "ICSE Class 9", examCode: "CISCE_C09" })).toBe("family.schoolOtherBoard");
    expect(key({ surface: "mock-gate", callback: cb, ...EXAM, olympiad: true })).toBe("family.examOlympiad");
    expect(key({ surface: "build-gate-quiz-end", callback: `${HUB}/build-mock`, setQuestions: 40 })).toBe("family.examPath");
    expect(key({ surface: "build-mock-form", callback: `${HUB}/build-mock`, exam: null, setQuestions: 40 })).toBe("family.examPath");
    // The header on /mocks/{id}: the gate's sentence only where the gate rendered — never from the path alone.
    expect(signUpPagePlace("/mocks/cm1234567890").key).toBe("family.fallback");
    expect(signUpPagePlace("/mocks/cm1234567890", { mockGate: false, code: "SSC_CGL" }).key).toBe("family.fallback");
    expect(signUpPagePlace("/mocks/cm1234567890", { mockGate: true, code: "SSC_CGL" }).key).toBe("door.mock-gate.unnamed");
    expect(signUpPagePlace("/mocks/cm1234567890", { mockGate: false, code: "NCERT_C09" }).key).toBe("family.schoolCbse");
  });

  it("the tutor: the exam is named only on that exam's chat; the mock clause only where it can serve one; a school chat gets no tutor word", () => {
    for (const door of ["chat-banner", "chat-save"] as const) {
      const exam: Input = { surface: door, callback: "/chat?examCode=SSC_CGL", ...EXAM };
      expect(key({ ...exam, practice: "canServe" })).toBe(`door.${door}.exam.practice`);
      expect(key(exam)).toBe(`door.${door}.exam`);
      expect(key({ ...exam, practice: "none" })).toBe(`door.${door}.exam`);
      expect(key({ ...exam, examCode: "SSC_CHSL" })).toBe(`door.${door}.general`);
      expect(key({ ...exam, exam: null })).toBe(`door.${door}.general`);
      expect(key({ surface: door, callback: "/chat?general=1", ...EXAM })).toBe(`door.${door}.general`);
      expect(key({ surface: door, callback: "/dashboard", ...EXAM })).toBe("family.fallback");
      expect(key({ ...exam, olympiad: true })).toBe("family.examOlympiad");
      expect(key({ surface: door, callback: "/chat?examCode=NCERT_C09", exam: "Class 9", examCode: "NCERT_C09" })).toBe("family.schoolCbse");
    }
    // The save card never says the chat on screen is saved: no carried guest chat has been seen in production.
    for (const k of ["door.chat-save.exam.practice", "door.chat-save.exam", "door.chat-save.general"] as Key[]) {
      const en = signUpPlaceWords("en", { key: k, vars: { exam: "SSC CGL" } });
      expect(`${en.text} ${en.short}`, k).not.toMatch(/this chat is saved|this chat is kept/i);
      expect(`${en.text} ${en.short}`, k).toMatch(/after signing up|from then on/);
    }
  });

  it("the coach names an exam only for ?exam= of an exam that can serve a mock", () => {
    const base: Input = { surface: "coach-start", callback: "/coach?exam=SSC_CGL", ...EXAM };
    expect(key({ ...base, practice: "canServe" })).toBe("door.coach-start.exam");
    expect(key(base)).toBe("door.coach-start");
    expect(key({ ...base, practice: "none" })).toBe("door.coach-start");
    expect(key({ ...base, practice: "canServe", olympiad: true })).toBe("door.coach-start");
    expect(key({ surface: "coach-start", callback: "/coach", ...EXAM, practice: "canServe" })).toBe("door.coach-start");
    expect(key({ surface: "coach-start", callback: "/dashboard" })).toBe("family.fallback");
  });

  it("the live test: the paper's exam is a variable only; without it the entry that names none", () => {
    expect(signUpPlaceFor({ surface: "live-test", callback: "/live-test", vars: { exam: "SSC CGL" } })).toEqual({ key: "door.live-test", vars: { exam: "SSC CGL" } });
    expect(key({ surface: "live-test", callback: "/live-test" })).toBe("door.live-test.unnamed");
    // The `exam` prop claims an enrolment — this sign-in sets no exam, so it is not read here.
    expect(key({ surface: "live-test", callback: "/live-test", ...EXAM })).toBe("door.live-test.unnamed");
    expect(key({ surface: "live-test", callback: "/dashboard", vars: { exam: "SSC CGL" } })).toBe("family.fallback");
    for (const k of ["door.live-test", "door.live-test.unnamed"] as Key[]) {
      const text = signUpPlaceWords("en", { key: k, vars: { exam: "SSC CGL" } }).text;
      expect(text, k).toContain("however few");
      expect(text, k).not.toMatch(/All-India|set up as your exam/i);
    }
  });

  it("a school return gets a school entry whatever the caller passes; its own button needs the count and a CBSE chapter", () => {
    const chapter = "/schooling/cbse/class-9/science/motion?from=school";
    expect(signUpPlaceFor({ surface: "school-save", callback: chapter, vars: { n: 10 } })).toEqual({ key: "door.school-save", vars: { n: 10 } });
    expect(key({ surface: "school-save", callback: chapter })).toBe("family.schoolCbse");
    expect(key({ surface: "school-save", callback: chapter, vars: { n: 0 } })).toBe("family.schoolCbse");
    // The save line is shown only on a chapter with practice, whatever its board — and only on a chapter page.
    expect(key({ surface: "school-save", callback: "/schooling/tn-state-board/class-10/science/light", vars: { n: 10 } })).toBe("door.school-save");
    expect(key({ surface: "school-save", callback: "/schooling/tn-state-board/class-10/science/light" })).toBe("family.schoolOtherBoard");
    expect(key({ surface: "school-save", callback: "/schooling/cbse/class-9/science", vars: { n: 10 } })).toBe("family.schoolCbse");
    for (const surface of ["hub-box", "quiz-end", "chat-save", "home-signin", "login", "finder-start"]) {
      expect(key({ surface, callback: "/schooling/cbse/class-10/science/light", ...EXAM, practice: "canServe" }), surface).toBe("family.schoolCbse");
      expect(key({ surface, callback: "/schooling/icse-cisce/class-8", ...EXAM, practice: "canServe" }), surface).toBe("family.schoolOtherBoard");
    }
    // CISCE and state boards: the plain entry, which says they have no saved practice yet.
    expect(signUpPlaceWords("en", { key: "family.schoolOtherBoard" }).text).toMatch(/no saved practice yet/);
    // Not a school class page: the stream pages (Class 10 leavers).
    expect(key({ surface: "header", callback: "/schooling/streams/science-pcm" })).toBe("family.streamOption");
  });

  it("the page families: a syllabus without notes, a topic without notes or with too few questions, a Hindi notes page", () => {
    const at = (p: string, page?: placeMod.SignUpPageData | null) => signUpPagePlace(p, page).key;
    // Syllabus: its own entry only where a topic on the page has notes to open.
    expect(at(`${HUB}/syllabus`, pageOf({ notes: true }))).toBe("family.examSyllabus.practice");
    expect(at(`${HUB}/syllabus`, pageOf({ notes: false }))).toBe("family.exam.practice");
    expect(at(`${HUB}/syllabus`, pageOf())).toBe("family.exam.practice");
    expect(at(`${HUB}/syllabus`, pageOf({ notes: false, practice: "none" }))).toBe("family.exam.noPractice");
    // Topic: read marks only with notes; a test-only sentence only with five or more checked questions on the topic.
    expect(at(`${HUB}/topics/algebra`, pageOf({ notes: true, practice: undefined }))).toBe("family.examTopic.noPractice");
    expect(at(`${HUB}/topics/algebra`, pageOf({ notes: true, practice: undefined, topicQuestions: 5 }))).toBe("family.examTopic.noPractice");
    // "Your test score kept" needs a topic test: five or more checked questions ON THE TOPIC, in an exam that can serve a mock.
    expect(at(`${HUB}/topics/algebra`, pageOf({ notes: true }))).toBe("family.examTopic.noPractice");
    expect(at(`${HUB}/topics/algebra`, pageOf({ notes: true, topicQuestions: 4 }))).toBe("family.examTopic.noPractice");
    expect(at(`${HUB}/topics/algebra`, pageOf({ notes: true, topicQuestions: 5 }))).toBe("family.examTopic.practice");
    expect(at(`${HUB}/topics/algebra`, pageOf({ notes: true, topicQuestions: 4000 }))).toBe("family.examTopic.practice");
    expect(at(`${HUB}/topics/algebra`, pageOf({ notes: false, topicQuestions: 4000 }))).toBe("family.examTopic.testOnly");
    expect(at(`${HUB}/topics/algebra`, pageOf({ notes: false, topicQuestions: 4 }))).toBe("family.exam.practice");
    expect(at(`${HUB}/topics/algebra`, pageOf({ notes: false, topicQuestions: 5, practice: undefined }))).toBe("family.examTopic.testOnly");
    expect(at(`${HUB}/topics/algebra`, pageOf({ topicQuestions: 9 }))).toBe("family.exam.practice");
    expect(at(`${HUB}/topics/algebra/hi`, pageOf({ notes: true }))).toBe("family.exam.practice");
    expect(at(`${HUB}/topics/algebra/quiz`, pageOf({ notes: true }))).toBe("family.exam.practice");
    // Cutoff, guide, tricks, news: their own entry needs an exam that can serve a mock.
    for (const sub of ["cutoff", "guide", "tricks", "news/cm1"]) {
      expect(at(`${HUB}/${sub}`, pageOf({ practice: undefined })), sub).toBe("family.exam.unknown");
      expect(at(`${HUB}/${sub}`, pageOf({ practice: "none" })), sub).toBe("family.exam.noPractice");
    }
    // Another exam's facts, or none: nothing is named. A school class container is not an exam page.
    expect(at(`${HUB}/syllabus`, pageOf({ code: "SSC_CHSL", notes: true }))).toBe("family.examPath");
    expect(at(`${HUB}/syllabus`, { code: "SSC_CGL", practice: "canServe", notes: true })).toBe("family.examPath");
    expect(at("/exams/NCERT_C09", pageOf({ code: "NCERT_C09" }))).toBe("family.fallback");
    expect(at("/exams/ssc_cgl", pageOf())).toBe("family.fallback");
    // An olympiad, on every one of its pages.
    for (const sub of ["", "/syllabus", "/topics/algebra", "/updates", "/cutoff", "/guide", "/pyq/2024"]) expect(at(`${HUB}${sub}`, pageOf({ olympiad: true, notes: true })), sub).toBe("family.examOlympiad");
    const oly = signUpPlaceWords("en", { key: "family.examOlympiad" });
    expect(oly.text).toContain(SIGNUP_TABLES.en.age);
    expect(oly.text).not.toMatch(/Preparing for|\{exam\}/);
  });

  it("/login: the 'Welcome back' card; else the visitor's own door when the callback is that door's; else the page it returns to; else its own", () => {
    const login = (i: Partial<Input>) => signUpPlaceFor({ surface: "login", callback: "/dashboard", ...i });
    expect(login({ returning: true, from: "hub-box", callback: `${HUB}?start=practice`, ...EXAM, practice: "canServe" }).key).toBe("door.login.returning");
    // The sentence hovered a moment ago is the sentence here.
    expect(login({ from: "hub-box", callback: `${HUB}?start=practice`, ...EXAM, practice: "canServe" })).toEqual(signUpPlaceFor({ surface: "hub-box", callback: `${HUB}?start=practice`, ...EXAM, practice: "canServe" }));
    expect(login({ from: "hub-box", callback: `${HUB}?start=practice`, ...EXAM }).key).toBe("family.exam.unknown");
    expect(login({ from: "home-signin" }).key).toBe("door.home-signin");
    expect(login({ from: "home-vacancies" }).key).toBe("door.home-vacancies");
    expect(login({ from: "coach-start", callback: "/coach" }).key).toBe("door.coach-start");
    expect(login({ from: "ideas-upvote", callback: "/ideas" }).key).toBe("door.ideas-upvote");
    expect(login({ from: "vouch", callback: "/community-vouching/medicine" })).toEqual({ key: "door.vouch", back: true });
    expect(login({ from: "verify-fact", callback: "/colleges/iit-bombay" })).toEqual({ key: "door.verify-fact", back: true });
    expect(login({ from: "chat-save", callback: "/chat?general=1" }).key).toBe("door.chat-save.general");
    // "vouch" with a callback that is not the vouching page would say "you land on your dashboard": the page instead.
    expect(login({ from: "vouch", callback: "/colleges/iit-bombay" }).key).toBe("family.college");
    expect(login({ from: "vouch" }).key).toBe("door.login.default");
    // The guest's whole paper is switched off: no button sends from=guest-paper, and a typed link gets no "This result …".
    expect(login({ from: "guest-paper", callback: HUB, ...EXAM, practice: "canServe" }).key).toBe("family.exam.practice");
    expect(login({ from: "guest-paper", callback: "/colleges/iit-bombay" }).key).toBe("family.college");
    // The builder's sentence needs the count of its topics' questions, which /login does not have: the exam's own entry.
    expect(login({ from: "build-mock-form", callback: `${HUB}/build-mock`, ...EXAM, practice: "canServe" }).key).toBe("family.exam.practice");
    expect(login({ from: "build-mock-form", callback: `${HUB}/build-mock`, ...EXAM }).key).toBe("family.exam.unknown");
    // A door whose callback is not its own: the page the sign-in returns to instead.
    expect(login({ from: "coach-start", callback: "/colleges/iit-bombay" }).key).toBe("family.college");
    expect(login({ from: "home-signin", callback: "/scholarships" }).key).toBe("family.scholarships");
    // The header, the site card, the bar and the early line send their page; a page-wide placement is not a door.
    expect(login({ from: "header", callback: "/colleges/iit-bombay" }).key).toBe("family.college");
    expect(login({ from: "pitch", callback: `${HUB}/updates`, ...EXAM, practice: "canServe" })).toEqual({ key: "family.examUpdates.practice", vars: { exam: "SSC CGL" } });
    expect(login({ from: "header", callback: `${HUB}/updates` }).key).toBe("family.examPath");
    expect(login({ from: "header", callback: "/" }).key).toBe("family.home");
    // A /mocks/{id} callback keeps the general words: /login does not look the mock up (and the gates never pass through /login).
    expect(login({ from: "mock-gate", callback: "/mocks/cm1234567890?from=signin", ...EXAM }).key).toBe("family.fallback");
    expect(login({ callback: "/mocks/cm1234567890" }).key).toBe("family.fallback");
    // A bare /login, and anything unreadable: its own entry or the general words — never a door's.
    expect(login({}).key).toBe("door.login.default");
    expect(login({ callback: null }).key).toBe("door.login.default");
    expect(login({ from: "something-else" }).key).toBe("door.login.default");
    expect(login({ callback: "//evil.example/exams/SSC_CGL", ...EXAM }).key).toBe("family.fallback");
    // A school return: the school words.
    expect(login({ callback: "/schooling/cbse/class-9/science/motion?signedin=1", from: "header" })).toEqual({ key: "family.schoolCbse", cap: SCHOOL_CAP });
    // The returning card's entry carries no closing sentence: nobody is signing up.
    const back = signUpPlaceWords("en", { key: "door.login.returning" });
    expect(back.text.endsWith(SIGNUP_TABLES.en.closing)).toBe(false);
    expect(back.text).not.toMatch(/sign up/i);
  });

  it("the doors that say 'you return here' are shown only where the link does return there", () => {
    const doors: [string, string][] = [
      ["home-signin", "/dashboard"],
      ["home-vacancies", "/dashboard"],
      ["revision-start", "/revision"],
      ["finder-save", "/find-your-exam?age=22&edu=GRADUATE"],
      ["persona-card", "/for/working-professionals"],
      ["batch-join", "/join/ABC123"],
      ["group-join", "/g/abcdef1234"],
      ["discussion-reply", "/discussions/cm123"],
      ["ideas-upvote", "/ideas"],
    ];
    for (const [surface, callback] of doors) {
      expect(key({ surface, callback }), surface).toBe(`door.${surface}`);
      expect(key({ surface, callback: "/colleges/iit-bombay" }), surface).toBe("family.fallback");
      expect(key({ surface, callback: null }), surface).toBe("family.fallback");
    }
    // The finder's save card: its link must carry the answers ("they stay in this page's link").
    expect(key({ surface: "finder-save", callback: "/find-your-exam" })).toBe("family.fallback");
    expect(key({ surface: "finder-save", callback: "/find-your-exam?age=22" })).toBe("family.fallback");
    // The hub box: "a starter test opens by itself" only for the link that returns to ?start=practice.
    expect(key({ surface: "hub-box", callback: HUB, ...EXAM, practice: "canServe" })).toBe("family.exam.practice");
    expect(key({ surface: "hub-box", callback: `${HUB}?start=diagnostic`, ...EXAM, practice: "canServe" })).toBe("family.exam.practice");
    expect(key({ surface: "finder-start", callback: HUB, ...EXAM })).toBe("door.finder-start");
    expect(key({ surface: "finder-start", callback: HUB })).toBe("family.fallback");
    expect(key({ surface: "finder-start", callback: "/exams/browse", exam: "Browse", examCode: "browse" })).toBe("family.fallback");
    // A door the table does not know: the general words. A tooltip is never empty.
    // (3 Oct 2026: "hub-start-401" left this list — the 401 doors take door.hub-box or the exam's family entry,
    // tests/unit/practice-401-doors.test.ts.)
    for (const surface of ["link", "save-path", "", "no-such-door"]) expect(key({ surface, callback: HUB, ...EXAM }), surface).toBe("family.fallback");
  });

  it("a variable is never printed raw; a missing institute has its default; an unknown key gets the general words", () => {
    for (const l of LANGS) {
      const T = SIGNUP_TABLES[l];
      const general = tableWords(l, "family.fallback");
      // An entry with a hole left gets the general entry.
      for (const k of KEYS.filter((x) => /\{(?:exam|year|n)\}/.test(T.places[x].t + T.places[x].c))) {
        expect(signUpWordsFrom(T, { key: k }), `${l}/${k}`).toEqual(general);
        expect(signUpWordsFrom(T, { key: k, vars: { exam: "  ", year: "soon", n: 0 } }), `${l}/${k}`).toEqual(general);
      }
      expect(signUpWordsFrom(T, { key: "door.pyq-year", vars: { exam: "SSC CGL" } }), l).toEqual(general);
      expect(signUpWordsFrom(T, { key: "family.exam.practice", vars: { exam: "SSC {CGL}" } }), l).toEqual(general);
      // The institute: its name, or "the institute".
      expect(signUpWordsFrom(T, { key: "door.batch-join" }).text, l).toContain(T.institute);
      expect(signUpWordsFrom(T, { key: "door.batch-join", vars: { institute: "Vidya Coaching" } }).text, l).toContain("Vidya Coaching");
      expect(signUpWordsFrom(T, { key: "door.batch-join", vars: { institute: "x".repeat(200) } }).text, l).toContain(T.institute);
      // A key the table does not hold; nothing at all.
      expect(signUpWordsFrom(T, { key: "door.no-such-entry" as Key }), l).toEqual(general);
      expect(signUpWordsFrom(T, null), l).toEqual(general);
      for (const k of KEYS) {
        const w = signUpWordsFrom(T, { key: k, vars: sampleVars(k) });
        expect(w.text + w.short, `${l}/${k}`).not.toMatch(/[{}]/);
        expect(w.text.length, `${l}/${k}`).toBeGreaterThan(0);
      }
    }
  });
});

// ── C. no two entries say the same ───────────────────────────────────────

describe("C. no two placements the table gives different entries render the same tooltip", () => {
  it("the 76 tooltips are 76 different sentences, in each language (and both forms of the two that drop a sentence)", () => {
    for (const l of LANGS) {
      const seen = new Map<string, string>();
      const add = (name: string, text: string) => {
        expect(seen.get(text), `${l}: ${name} says what ${seen.get(text)} says`).toBeUndefined();
        seen.set(text, name);
      };
      for (const k of KEYS) add(k, signUpPlaceWords(l, { key: k, vars: sampleVars(k) }).text);
      add("door.vouch (back)", signUpPlaceWords(l, { key: "door.vouch", back: true }).text);
      add("door.verify-fact (back)", signUpPlaceWords(l, { key: "door.verify-fact", back: true }).text);
      expect(seen.size, l).toBe(78);
    }
  });

  it("two placements with different entries never show the same tooltip; with the same entry, the same words", () => {
    const all = [...PLACEMENTS.map((p) => ({ name: p.name, place: signUpPlaceFor(p.input) })), ...PAGES.map((p) => ({ name: `page ${p.path}`, place: signUpPagePlace(p.path, p.page) }))];
    for (const l of LANGS) {
      const byText = new Map<string, string>();
      for (const a of all) {
        const text = signUpPlaceWords(l, a.place).text;
        const id = `${a.place.key}${a.place.back ? " (back)" : ""}`;
        const was = byText.get(text);
        if (was !== undefined) expect(was, `${l}: ${a.name}`).toBe(id);
        byText.set(text, id);
      }
      // The founder's observation is gone: no longer one sentence for most placements.
      expect(byText.size, l).toBeGreaterThanOrEqual(75);
    }
  });
});

// ── D. the claims ────────────────────────────────────────────────────────

describe("D. every entry says exactly the claims listed for it, and every claim names code that is there", () => {
  const CLAIMS = Object.keys(SIGNUP_CLAIM_PROOF) as SignUpClaim[];

  it("the claim list covers the table: 76 entries, each with its claims; every claim has a proof and (but one) its words", () => {
    expect(Object.keys(SIGNUP_PLACE_CLAIMS).sort()).toEqual(Object.keys(SIGNUP_TABLES.en.places).sort());
    expect(Object.keys(SIGNUP_CLAIM_SAYS_EN).sort()).toEqual([...CLAIMS].sort());
    for (const k of KEYS) {
      expect(SIGNUP_PLACE_CLAIMS[k].length, k).toBeGreaterThanOrEqual(3);
      expect(new Set(SIGNUP_PLACE_CLAIMS[k]).size, k).toBe(SIGNUP_PLACE_CLAIMS[k].length);
      for (const c of SIGNUP_PLACE_CLAIMS[k]) expect(CLAIMS, `${k}: ${c}`).toContain(c);
    }
    // Every claim is made by at least one entry, except the one the finder's kept line makes.
    const made = new Set(KEYS.flatMap((k) => [...SIGNUP_PLACE_CLAIMS[k]]));
    expect(CLAIMS.filter((c) => !made.has(c))).toEqual(["tutor-memory"]);
    expect(SIGNUP_CLAIM_SAYS_EN["tutor-memory"]).toBeNull();
  });

  it.each(KEYS)("%s", (k) => {
    const e = SIGNUP_TABLES.en.places[k];
    const said = [e.t, e.tail ?? "", e.age ? SIGNUP_TABLES.en.age : "", e.bare ? "" : SIGNUP_TABLES.en.closing, e.c].filter(Boolean).join(" ");
    for (const claim of CLAIMS) {
      const how = SIGNUP_CLAIM_SAYS_EN[claim];
      const says = how !== null && new RegExp(how, "i").test(said);
      expect(says, `${k} / ${claim}`).toBe(SIGNUP_PLACE_CLAIMS[k].includes(claim));
    }
    // The caption alone never says more than the tooltip and it together are listed for.
    for (const claim of CLAIMS) {
      const how = SIGNUP_CLAIM_SAYS_EN[claim];
      if (how !== null && new RegExp(how, "i").test(e.c)) expect(SIGNUP_PLACE_CLAIMS[k], `${k} caption / ${claim}`).toContain(claim);
    }
  });

  it("every claim names code that makes it true today, and that code is there", () => {
    for (const [claim, proofs] of Object.entries(SIGNUP_CLAIM_PROOF)) {
      expect(proofs.length, claim).toBeGreaterThan(0);
      for (const p of proofs) expect(read(p.file).includes(p.has), `${claim}: ${p.file} has "${p.has}"`).toBe(true);
    }
  });

  it("what an entry says is NOT kept is pinned the other way round: no such table, no such route", () => {
    const schema = read("prisma/schema.prisma");
    const routes = walk(path.join(ROOT, "src/app/api"), /^route\.ts$/).map(rel);
    expect(routes.length).toBeGreaterThan(50);
    for (const pin of SIGNUP_NOT_KEPT_PINS) {
      for (const k of pin.in) expect(`${SIGNUP_TABLES.en.places[k].t}`, `${k}: "${pin.says}"`).toContain(pin.says);
      expect(new RegExp(`^model (?:${pin.noModel})\\b`, "m").test(schema), `a model now holds what "${pin.says}" says is not kept — read the entry again`).toBe(false);
      expect(routes.filter((r) => new RegExp(pin.noRoute, "i").test(r)), `a route now holds what "${pin.says}" says is not kept`).toEqual([]);
    }
    // The scholarship star keeps its state in this browser only.
    const star = code("src/components/SaveScholarshipButton.tsx");
    expect(star).toContain("localStorage");
    expect(star).not.toMatch(/fetch\(|\/api\//);
    // A guest's whole paper stays closed (the entry that speaks of its result is not mounted).
    expect(read("src/lib/guest-paper.ts")).toContain("GUEST_WHOLE_PAPER_OPEN: boolean = false");
    expect(read("src/lib/soft-wall.ts")).toContain("SOFT_WALL_ON: boolean = false");
  }, 60_000);

  it("the entries a placement takes when practice is not known, or known to be none, promise no mock, score, daily five or notebook", () => {
    const safe: Key[] = ["family.exam.noPractice", "family.exam.unknown", "family.examSyllabus.noPractice", "family.examTopic.noPractice", "family.examUpdates.noPractice", "door.chat-banner.exam", "door.chat-save.exam", "door.verdict-poll"];
    for (const k of safe) for (const claim of SIGNUP_PRACTICE_CLAIMS) expect(SIGNUP_PLACE_CLAIMS[k].includes(claim), `${k}: ${claim}`).toBe(false);
    // "weak topics", scores and mocks are spoken of only by an entry for an exam that can serve a mock, a door
    // that exists only with questions, or as a condition ("where it has practice …", "once you finish a mock").
    for (const k of ["family.examPath", "family.examOlympiad", "family.examList", "family.college", "family.colleges", "family.jobs", "door.finder-start", "door.finder-save", "door.home-vacancies"] as Key[]) {
      expect(SIGNUP_TABLES.en.places[k].t, k).toMatch(/[Ww]here (?:it|the exam) has practice/);
    }
  });

  it("the proof tables are in a module no page loads", () => {
    const importers = walk(path.join(ROOT, "src"), /\.tsx?$/)
      .filter((f) => /signup-cta-claims/.test(fs.readFileSync(f, "utf8").replace(/^\s*\/\/.*$/gm, "")))
      .map(rel);
    expect(importers).toEqual([]);
    expect(read("src/lib/signup-cta-claims.ts").match(/^import .*$/gm)).toEqual(['import type { SignUpReason } from "@/lib/signup-cta-copy";', 'import type { SignUpPlaceKey } from "@/lib/signup-place";']);
  }, 60_000);
});

// ── E. never under 13 ────────────────────────────────────────────────────

describe("E. no sign-up button, tooltip, caption or fetch of the words on a Class 1-7 page", () => {
  const CHILD = ["/schooling/cbse/class-1", "/schooling/cbse/class-5/maths", "/schooling/tn-state-board/class-7/science/chapter-1", "/schooling/icse-cisce/class-3/english/a-poem"];

  it("the callers' rules are as they were: no card, no early line, no bar, no header button there", () => {
    for (const p of CHILD) {
      expect(isUnder13SchoolPath(p), p).toBe(true);
      expect(pitchAllowedPath(p), p).toBe(false);
      expect(contentFamily(p), p).toBeNull();
    }
    for (const p of ["/schooling", "/schooling/cbse"]) {
      expect(isChildSchoolPath(p), p).toBe(true);
      expect(pitchAllowedPath(p), p).toBe(false);
      expect(contentFamily(p), p).toBeNull();
    }
    const header = code("src/components/HeaderAuthControls.tsx");
    expect(header).toMatch(/\) : childSafe \|\| isUnder13SchoolPath\(pathname\) \? null : isChildSchoolPath\(pathname\) \? \(/);
    expect(header).toContain("const guestButton = !signedIn && !childSafe && !isUnder13SchoolPath(pathname);");
    expect(code("src/components/SignupPitch.tsx")).toContain("if (!pitchAllowedPath(pathname)) return;");
    expect(code("src/components/SignupInline.tsx")).toContain("if (!pitchAllowedPath(location.pathname)) return;");
    expect(code("src/components/SignupNudge.tsx")).toContain("return !pitchAllowedPath(p) || p.startsWith(\"/live-test/\");");
  });

  it("the words are not even fetched there: the header asks for them only while it renders a button with a tooltip", () => {
    const header = code("src/components/HeaderAuthControls.tsx");
    // off: no guest button (a member, a Class 1-7 page, a child-safe page), or the plain link of /schooling and a board hub.
    expect(header).toMatch(/off: !guestButton \|\| isChildSchoolPath\(pathname\) \|\| \(session === null && hasSessionHint\(\)\)/);
    const hook = code("src/lib/use-signup-words.ts");
    expect(hook).toContain("const skip = givenText !== null || !!opts?.off || !input;");
    expect(hook).toMatch(/useEffect\(\(\) => \{\s*if \(skip \|\| cachedSignUpKit\(lang\)\) return;/);
    // The bar asks only while it shows; the card and the early line render no button on such a path (above).
    expect(code("src/components/SignupNudge.tsx")).toContain("{ now: true, off: !show }");
    // The only fetches of the words: the hook, and the bar right before it shows on a content page.
    const callers = walk(path.join(ROOT, "src"), /\.tsx?$/).map(rel).filter((f) => /loadSignUpKit\(/.test(fs.readFileSync(path.join(ROOT, f), "utf8")) && /loadSignUpKit\(/.test(code(f)) && f !== "src/lib/signup-place-load.ts");
    expect(callers.sort()).toEqual(["src/components/SignupNudge.tsx", "src/lib/use-signup-words.ts"]);
    // The page-facts island is mounted by no school page.
    for (const f of [...walk(path.join(ROOT, "src/app/schooling"), /\.tsx$/), ...walk(path.join(ROOT, "src/components/school"), /\.tsx$/)].map(rel)) {
      expect(code(f), f).not.toMatch(/SignUpPageContext|ExamSignUpContext|signUpWords\(|signup-place-words/);
    }
  }, 60_000);

  it("the resolver itself gives a Class 1-7 path no school promise, whoever asks", () => {
    for (const p of CHILD) {
      expect(signUpPagePlace(p).key, p).toBe("family.fallback");
      for (const surface of ["header", "signup-pitch", "signup-nudge", "signup-inline", "school-save", "login", "hub-box"]) {
        expect(signUpPlaceFor({ surface, callback: p, vars: { n: 10 }, ...EXAM, practice: "canServe" }).key, `${surface} ${p}`).toBe("family.fallback");
      }
    }
    expect(signUpPagePlace("/chat?examCode=NCERT_C05").key).toBe("family.fallback");
    expect(signUpPlaceFor({ surface: "mock-gate", callback: "/mocks/cm1234567890", exam: "Class 5", examCode: "NCERT_C05" }).key).toBe("family.fallback");
    // Class 8-12 pages say who an account is for: the age sentence is part of every school entry.
    for (const k of ["family.schoolCbse", "family.schoolOtherBoard", "door.school-save"] as Key[]) expect(signUpPlaceWords("en", { key: k, vars: { n: 10 } }).text, k).toContain("For students 13 and above.");
  });
});

// ── F. page weight ───────────────────────────────────────────────────────

describe("F. page weight: no client component imports the words statically", () => {
  const SRC = walk(path.join(ROOT, "src"), /\.(?:tsx?|json)$/).map(rel);
  const exists = new Set(SRC);
  /** The file a module specifier resolves to (a file under src/), or null (a package, a style, a file outside src/). */
  const resolve = (from: string, spec: string): string | null => {
    const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? path.posix.normalize(path.posix.join(path.posix.dirname(from), spec)) : null;
    if (!base) return null;
    for (const cand of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) if (exists.has(cand)) return cand;
    return null;
  };
  /** Each file's code (comments removed), read once: the walk below visits every file under src/. */
  const codeOnce = new Map<string, string>();
  const src1 = (file: string): string => {
    let s = codeOnce.get(file);
    if (s === undefined) {
      s = code(file);
      codeOnce.set(file, s);
    }
    return s;
  };
  /** STATIC imports and re-exports that are in the bundle (type-only ones are erased). */
  const staticOnce = new Map<string, string[]>();
  const staticImports = (file: string): string[] => {
    if (file.endsWith(".json")) return [];
    const hit = staticOnce.get(file);
    if (hit) return hit;
    const out: string[] = [];
    for (const m of src1(file).matchAll(/^\s*(?:import|export)\s+(type\s+)?(?:[^"'()]*?\sfrom\s+)?["']([^"']+)["']/gm)) {
      if (m[1]) continue;
      const to = resolve(file, m[2]);
      if (to) out.push(to);
    }
    staticOnce.set(file, out);
    return out;
  };
  const dynamicImports = (file: string): string[] =>
    file.endsWith(".json")
      ? []
      : [...src1(file).matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g)].map((m) => resolve(file, m[1])).filter((x): x is string => !!x);
  /** These tests read about 1,500 files; on a busy machine that takes longer than the default five seconds. */
  const SLOW = 60_000;

  const WORD_FILES = ["src/data/signup-places/en.json", "src/data/signup-places/hi.json", "src/data/signup-places/te.json"];
  const SERVER_WORDS = "src/lib/signup-place-words.ts";
  /** The rules that choose an entry: about 10 KB — loaded with the words, never in a page's first script. */
  const RULES = "src/lib/signup-place.ts";

  it("the three word files are imported statically by ONE module (the server's) and dynamically by ONE (the browser's loader)", () => {
    const stat = SRC.filter((f) => staticImports(f).some((t) => WORD_FILES.includes(t)));
    expect(stat).toEqual([SERVER_WORDS]);
    expect(staticImports(SERVER_WORDS).filter((t) => WORD_FILES.includes(t)).sort()).toEqual(WORD_FILES);
    const dyn = SRC.filter((f) => dynamicImports(f).some((t) => WORD_FILES.includes(t)));
    expect(dyn).toEqual(["src/lib/signup-place-load.ts"]);
    // One language per request: three separate dynamic imports, each of one file — and the rules, their own chunk.
    // (The rules are named twice in the loader: once as a type — `typeof import(…)`, erased — and once as the import.)
    expect([...new Set(dynamicImports("src/lib/signup-place-load.ts"))].sort()).toEqual([...WORD_FILES, RULES].sort());
    expect(staticImports("src/lib/signup-place-load.ts")).toEqual([]);
    expect(SRC.filter((f) => dynamicImports(f).includes(RULES))).toEqual(["src/lib/signup-place-load.ts"]);
    // No file reads them from disk at run time either.
    for (const f of SRC.filter((x) => !x.endsWith(".json"))) expect(/signup-places\/(?:en|hi|te)\.json/.test(src1(f)) && f !== SERVER_WORDS && f !== "src/lib/signup-place-load.ts", f).toBe(false);
  }, SLOW);

  it("no \"use client\" file reaches the words — or the rules that choose them — through its static imports, walked to the end", () => {
    const clients = SRC.filter((f) => /\.tsx?$/.test(f) && /^\s*["']use client["'];?\s*$/m.test(read(f).split("\n").slice(0, 400).filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l)).slice(0, 3).join("\n")));
    // The scan sees the client files it should (the button, the header's island, the bar, the card, the early line, the hook).
    for (const f of ["src/components/SignUpButton.tsx", "src/components/GoogleSignInButton.tsx", "src/components/HeaderAuthControls.tsx", "src/components/SignupNudge.tsx", "src/components/SignupPitch.tsx", "src/components/SignupInline.tsx", "src/components/SignUpPageContext.tsx", "src/lib/use-signup-words.ts", "src/app/chat/ChatInterface.tsx", "src/components/AnonQuizPlayer.tsx"]) {
      expect(clients, f).toContain(f);
    }
    expect(clients.length).toBeGreaterThan(100);
    const memo = new Map<string, boolean>();
    const reaches = (file: string, trail: Set<string>): boolean => {
      if (file === SERVER_WORDS || file === RULES || WORD_FILES.includes(file)) return true;
      const known = memo.get(file);
      if (known !== undefined) return known;
      if (trail.has(file)) return false;
      trail.add(file);
      const hit = staticImports(file).some((t) => reaches(t, trail));
      memo.set(file, hit);
      return hit;
    };
    const bad = clients.filter((f) => reaches(f, new Set()));
    expect(bad).toEqual([]);
    // The walker does find a real chain: the server module reaches the files, and so does a server page that uses it.
    expect(reaches("src/app/login/page.tsx", new Set())).toBe(true);
    expect(reaches("src/components/home/HomeSignIn.tsx", new Set())).toBe(true);
  }, SLOW);

  it("the modules the header loads stay light: no words, no catalogue, a short import list", () => {
    const imports = (f: string) => read(f).match(/^import [\s\S]*?from "[^"]+";$/gm)?.map((s) => s.match(/from "([^"]+)"/)?.[1]) ?? [];
    expect(imports("src/lib/signup-cta-copy.ts")).toEqual(["@/lib/school/student-classes"]);
    expect(imports("src/lib/signup-place.ts")).toEqual(["@/lib/signup-cta-copy", "@/lib/school/student-classes"]);
    expect(imports("src/lib/signup-page-data.ts")).toEqual(["@/lib/signup-place"]);
    expect(imports("src/lib/signup-place-load.ts")).toEqual(["@/lib/signup-place"]);
    expect(imports("src/lib/use-signup-words.ts").sort()).toEqual(["@/lib/signup-cta-copy", "@/lib/signup-page-data", "@/lib/signup-place", "@/lib/signup-place-load", "react"]);
    // … and where a browser module names the rules or the page facts, it is their TYPES only (erased at build).
    for (const f of ["src/lib/signup-place-load.ts", "src/lib/signup-page-data.ts", "src/lib/use-signup-words.ts", "src/components/SignUpButton.tsx", "src/components/GoogleSignInButton.tsx", "src/components/SignUpPageContext.tsx"]) {
      for (const line of read(f).match(/^import [^\n]*"@\/lib\/signup-place";$/gm) ?? []) expect(line, f).toMatch(/^import type /);
    }
    expect(read("src/lib/use-signup-words.ts")).toContain('import type { SignUpContext } from "@/lib/signup-cta-copy";');
    // The copy module holds no sentence of the explanation any more — the five old ones are gone from it.
    const copy = read("src/lib/signup-cta-copy.ts");
    expect(copy).not.toMatch(/const EXPLAIN\b|EXPLAIN_SHORT|export function signUpExplain/);
    for (const l of LANGS) expect(copy.includes(SIGNUP_TABLES[l].closing), l).toBe(false);
    // The resolver holds no sentence either: no entry's words, in any language.
    const resolver = read("src/lib/signup-place.ts");
    for (const l of LANGS) {
      for (const k of KEYS) expect(resolver.includes(SIGNUP_TABLES[l].places[k].c), `${l}/${k}`).toBe(false);
      expect(resolver.includes(SIGNUP_TABLES[l].closing), l).toBe(false);
    }
    expect(resolver).not.toMatch(/exam-cache|getExamCatalog|prisma/);
    // What the header's bundle gained is small: the resolver's code without its comments.
    expect(code("src/lib/signup-place.ts").replace(/\n\s*/g, "\n").length).toBeLessThan(22_000);
  }, 60_000);

  it("the words reach a browser one language at a time, when it is idle or when a caption is waiting", () => {
    const hook = code("src/lib/use-signup-words.ts");
    expect(hook).toContain("const kit = useSyncExternalStore(subscribeSignUpKits, () => cachedSignUpKit(lang), NONE);");
    // A caption is waiting: at once. A tooltip only: on a screen with a mouse, after the window has loaded, when idle.
    expect(hook).toMatch(/if \(now\) \{\s*go\(\);\s*return;\s*\}\s*if \(!hoverScreen\(\)\) return;\s*return whenLoadedAndIdle\(go\);/);
    expect(hook).toContain("w.requestIdleCallback(fn, { timeout: 2000 })");
    // The server snapshot is "nothing": the first client render is the server's HTML.
    expect(hook).toContain("const NONE = () => null;");
    const loader = code("src/lib/signup-place-load.ts");
    expect(loader).toContain('en: () => import("@/data/signup-places/en.json"),');
    expect(loader).toContain('hi: () => import("@/data/signup-places/hi.json"),');
    expect(loader).toContain('te: () => import("@/data/signup-places/te.json"),');
    expect(loader).toContain('const loadRules = (): Promise<SignUpRules> => import("@/lib/signup-place");');
    expect(loader).toContain("const p = Promise.all([TABLES[lang](), loadRules()])");
    // Sizes, so a later table is weighed again: a language is one request of at most 70 KB before compression.
    for (const l of LANGS) expect(Buffer.byteLength(JSON.stringify(SIGNUP_TABLES[l])), l).toBeLessThan(70_000);
  });
});

// ── G. the tooltip box ───────────────────────────────────────────────────

describe("G. the tooltip box holds 300 characters: 360 px wide, kept on screen and off the button", () => {
  it("the stylesheet: 22.5rem (360 px) for the top-layer copy and for the CSS fallback — never wider than the window minus 16 px", () => {
    const css = read("src/app/globals.css");
    const float = css.slice(css.indexOf("  .su-float {"), css.indexOf("  .container-prose {"));
    expect(float).toContain("max-width: min(22.5rem, calc(100% - 16px));");
    expect(float).toContain("width: max-content;");
    expect(float).toContain("box-sizing: border-box;");
    const hover = css.slice(css.indexOf("@media (hover: hover) and (pointer: fine) {"), css.indexOf("  .su-float {"));
    expect(hover).toContain("max-width: min(22.5rem, calc(100vw - 2rem));");
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/max-width: min\(20rem/);
    // 12 px text at a 1.45 line: a 300-character English sentence is about six lines, Hindi and Telugu up to ten.
    expect(float).toContain("font-size: 12px;");
    expect(float).toContain("line-height: 1.45;");
  });

  const at = (top: number, left: number, w = 190, h = 44) => ({ top, left, right: left + w, bottom: top + h });

  it("the header's button and the timed bar's, with the wide box: wholly on screen, never over the button", () => {
    const viewport = { width: 1280, height: 800 };
    // Six lines (English) and ten lines (Hindi, Telugu) of 12 px text at 1.45, plus the box's padding.
    for (const tip of [{ width: 360, height: 121 }, { width: 360, height: 190 }]) {
      const header = placeSignUpTip({ button: at(10, 1074), tip, viewport, align: "end" });
      expect(header).toEqual({ top: 62, left: 1264 - 360, side: "bottom", hidden: false });
      expect(header.left + tip.width).toBeLessThanOrEqual(viewport.width - SIGNUP_TIP_MARGIN);
      const bar = placeSignUpTip({ button: at(700, 1100, 136), tip, viewport, side: "top", align: "end" });
      expect(bar.side).toBe("top");
      expect(bar.top + tip.height).toBeLessThanOrEqual(700 - SIGNUP_TIP_GAP);
      expect(bar.top).toBeGreaterThanOrEqual(SIGNUP_TIP_MARGIN);
    }
    // A narrow mouse window (360 px): the CSS caps the box at the window minus 16 px, and it sits 8 px in.
    const narrow = placeSignUpTip({ button: at(10, 230, 114), tip: { width: 344, height: 200 }, viewport: { width: 360, height: 640 }, align: "end" });
    expect(narrow).toEqual({ top: 62, left: 8, side: "bottom", hidden: false });
  });

  it("over a grid of buttons and windows, a 360 px box of six, ten and fourteen lines: never over the button, inside the window whenever one side has room", () => {
    const broken: string[] = [];
    let checked = 0;
    for (const vh of [480, 640, 800, 1080]) {
      for (const vw of [360, 768, 1280, 1920]) {
        for (const h of [121, 190, 260]) {
          const w = Math.min(360, vw - 16);
          for (let top = -40; top <= vh + 40; top += 23) {
            for (const left of [-50, 0, 90, vw - 200, vw - 60]) {
              for (const side of [undefined, "top"] as const) {
                for (const align of [undefined, "end"] as const) {
                  const button = at(top, left);
                  const p = placeSignUpTip({ button, tip: { width: w, height: h }, viewport: { width: vw, height: vh }, side, align });
                  const fail = (rule: string) => broken.push(`${rule}: vh${vh} vw${vw} h${h} w${w} top${top} left${left} ${side} ${align} -> ${JSON.stringify(p)}`);
                  const underIt = p.top >= button.bottom + SIGNUP_TIP_GAP;
                  const aboveIt = p.top + h <= button.top - SIGNUP_TIP_GAP;
                  if (!underIt && !aboveIt) fail("over the button");
                  if (p.side !== (underIt ? "bottom" : "top")) fail("side");
                  if (p.left < SIGNUP_TIP_MARGIN || p.left + w > vw - SIGNUP_TIP_MARGIN) fail("outside, sideways");
                  const roomUnder = button.bottom + SIGNUP_TIP_GAP + h <= vh - SIGNUP_TIP_MARGIN;
                  const roomAbove = button.top - SIGNUP_TIP_GAP - h >= SIGNUP_TIP_MARGIN;
                  if ((roomUnder || roomAbove) && (p.top < SIGNUP_TIP_MARGIN || p.top + h > vh - SIGNUP_TIP_MARGIN)) fail("outside, up or down");
                  if (side === "top" && roomAbove && p.side !== "top") fail("left the side asked for (top)");
                  if (side !== "top" && roomUnder && p.side !== "bottom") fail("left the side asked for (bottom)");
                  if (!Number.isInteger(p.top) || !Number.isInteger(p.left)) fail("not whole pixels");
                  checked++;
                }
              }
            }
          }
        }
      }
    }
    expect(broken.slice(0, 5)).toEqual([]);
    expect(checked).toBeGreaterThan(20_000);
  });

  it("a tall box where neither side has room (a short window): the roomier side, past the edge — still never over the button", () => {
    const tip = { width: 360, height: 260 };
    const short = { width: 1280, height: 300 };
    const under = placeSignUpTip({ button: at(40, 200), tip, viewport: short });
    expect(under.side).toBe("bottom");
    expect(under.top).toBe(40 + 44 + SIGNUP_TIP_GAP);
    const over = placeSignUpTip({ button: at(240, 200), tip, viewport: short, side: "top" });
    expect(over.side).toBe("top");
    expect(over.top + tip.height).toBeLessThanOrEqual(240 - SIGNUP_TIP_GAP);
  });
});

// ── H. the review of 2 Oct 2026 ──────────────────────────────────────────

describe("H. review: a caption stands alone, the bar's line is not cut, a failed fetch leaves nothing false or empty", () => {
  const key = (i: Input) => signUpPlaceFor(i).key;

  it("a CBSE class page shows the CBSE tooltip with the caption that is true on every school page — never 'Your chapter practice scores are saved.' alone", () => {
    const cbse = ["/schooling/cbse/class-8", "/schooling/cbse/class-9/science/motion", "/schooling/cbse/class-11/physics/units-and-measurements", "/schooling/cbse/class-12/chemistry"];
    for (const p of cbse) {
      for (const surface of ["header", "signup-pitch", "signup-nudge", "signup-inline", "login", "hub-box", "school-save"]) {
        const place = signUpPlaceFor({ surface, callback: p, ...EXAM, practice: "canServe" });
        expect(place, `${surface} ${p}`).toEqual({ key: "family.schoolCbse", cap: SCHOOL_CAP });
        for (const l of LANGS) {
          const w = signUpWordsFrom(SIGNUP_TABLES[l], place);
          // The tooltip is family.schoolCbse's (it says "on chapters that have practice"); the caption is the other entry's.
          expect(w.text, `${l} ${surface} ${p}`).toBe(tableWords(l, "family.schoolCbse").text);
          expect(w.short, `${l} ${surface} ${p}`).toBe(SIGNUP_TABLES[l].places[SCHOOL_CAP].c);
          expect(w.short, `${l} ${surface} ${p}`).not.toBe(SIGNUP_TABLES[l].places["family.schoolCbse"].c);
        }
      }
    }
    // The same for a class chat and a class's own practice set (NCERT containers).
    expect(signUpPagePlace("/chat?examCode=NCERT_C11")).toEqual({ key: "family.schoolCbse", cap: SCHOOL_CAP });
    expect(signUpPlaceFor({ surface: "mock-gate", callback: "/mocks/cm1234567890", exam: "Class 9", examCode: "NCERT_C09" })).toEqual({ key: "family.schoolCbse", cap: SCHOOL_CAP });
    // English, so a reader of this test sees the two sentences.
    expect(SIGNUP_TABLES.en.places["family.schoolCbse"].t).toContain("on chapters that have practice");
    expect(SIGNUP_TABLES.en.places["family.schoolCbse"].c).toBe("No forms. Your chapter practice scores are saved.");
    expect(SIGNUP_TABLES.en.places[SCHOOL_CAP].c).toBe("No forms. Saved practice is on CBSE chapters for now.");
    // NO placement renders family.schoolCbse's own caption: every school return goes through the one rule.
    for (const p of PLACEMENTS) expect(signUpPlaceFor(p.input).key === "family.schoolCbse" && !signUpPlaceFor(p.input).cap, p.name).toBe(false);
    for (const p of PAGES) expect(signUpPagePlace(p.path, p.page).key === "family.schoolCbse" && !signUpPagePlace(p.path, p.page).cap, p.path).toBe(false);
    const resolver = code("src/lib/signup-place.ts");
    expect(resolver.match(/"family\.schoolCbse"/g)).toHaveLength(2); // the key's type, and the one constant
    expect(resolver).toContain('const SCHOOL_CBSE: SignUpPlace = { key: "family.schoolCbse", cap: "family.schoolOtherBoard" };');
    // The chapter's own save line — shown only on a chapter with practice — keeps its own entry and caption.
    expect(signUpPlaceFor({ surface: "school-save", callback: "/schooling/cbse/class-9/science/motion", vars: { n: 10 } })).toEqual({ key: "door.school-save", vars: { n: 10 } });
    // Class 11-12 have no checked questions yet: the fact the caption could not stand on.
    expect(read("src/lib/school/student-copy.ts")).toMatch(/Class 11-12 have none yet/);
    // An entry named by `cap` that the table does not hold: the general words, never half an entry.
    for (const l of LANGS) expect(signUpWordsFrom(SIGNUP_TABLES[l], { key: "family.schoolCbse", cap: "door.no-such-entry" as Key }), l).toEqual(tableWords(l, "family.fallback"));
  });

  it("the builder's two doors: 'build this mock … with your score kept' only where the listed topics hold five or more questions", () => {
    for (const surface of ["build-mock-form", "build-gate-quiz-end"] as const) {
      const base: Input = { surface, callback: `${HUB}/build-mock`, ...EXAM };
      expect(signUpPlaceFor({ ...base, setQuestions: 5 }), surface).toEqual({ key: `door.${surface}`, vars: { exam: "SSC CGL" } });
      expect(key({ ...base, setQuestions: 4000 }), surface).toBe(`door.${surface}`);
      expect(key({ ...base, callback: `${HUB}/build-mock?pyq=1`, setQuestions: 6 }), surface).toBe(`door.${surface}`);
      // One topic of three or four questions (the form lists it; a set is refused): the exam's plain sentence.
      for (const n of [3, 4, 0, undefined, null, Number.NaN]) expect(key({ ...base, setQuestions: n as number }), `${surface} ${n}`).toBe("family.exam.unknown");
      // The EXAM can serve a mock (five questions spread over topics of three, one and one) — the builder still cannot:
      // neither the caller's practice value nor the page's opens the builder's sentence.
      expect(key({ ...base, setQuestions: 3, practice: "canServe" }), surface).toBe("family.exam.practice");
      expect(key({ ...base, practice: "canServe" }), surface).toBe("family.exam.practice");
      expect(key({ ...base, page: pageOf() }), surface).toBe("family.exam.practice");
      expect(key({ ...base, setQuestions: 3, page: pageOf({ practice: "none" }) }), surface).toBe("family.exam.unknown");
      // An olympiad, a missing name, another exam's code: as every exam door.
      expect(key({ ...base, setQuestions: 40, olympiad: true }), surface).toBe("family.examOlympiad");
      expect(key({ ...base, setQuestions: 40, exam: null }), surface).toBe("family.examPath");
      expect(key({ ...base, setQuestions: 40, examCode: "SSC_CHSL" }), surface).toBe("family.examPath");
    }
    // The two sentences that need the count.
    expect(SIGNUP_TABLES.en.places["door.build-mock-form"].t).toMatch(/Sign up to build this mock/);
    expect(SIGNUP_TABLES.en.places["door.build-gate-quiz-end"].t).toMatch(/make your own \{exam\} mock/);
  });

  it("a door that names an exam never says 'no practice questions' — only the four page-wide placements do", () => {
    const doors = ["hub-box", "hub-try-one", "pyq-year", "quiz-end", "build-mock-form", "build-gate-quiz-end", "cutoff-nudge", "verdict-poll", "challenge-end", "finder-start", "chat-banner", "chat-save", "coach-start"];
    for (const surface of doors) {
      for (const callback of [HUB, `${HUB}?start=practice`, `${HUB}/pyq/2024`, `${HUB}/build-mock`, `${HUB}/quiz`, "/chat?examCode=SSC_CGL", "/coach?exam=SSC_CGL"]) {
        for (const input of [
          { surface, callback, ...EXAM, practice: "none" as const },
          { surface, callback, ...EXAM, page: pageOf({ practice: "none" }) },
          { surface, callback, ...EXAM, practice: "none" as const, setQuestions: 3, vars: { year: 2024 } },
        ]) {
          expect(key(input), JSON.stringify(input)).not.toBe("family.exam.noPractice");
        }
      }
    }
    // The quiz result on /exams/{CODE}/quiz and on a challenge page, in the ten minutes after an exam's first questions were checked.
    expect(key({ surface: "quiz-end", callback: HUB, ...EXAM, page: pageOf({ practice: "none" }) })).toBe("family.exam.unknown");
    expect(key({ surface: "challenge-end", callback: HUB, ...EXAM, page: pageOf({ practice: "none" }) })).toBe("family.exam.unknown");
    // The page-wide placements still say it, for a read that found nothing.
    for (const surface of ["header", "signup-pitch", "signup-nudge", "signup-inline"]) expect(key({ surface, callback: HUB, page: pageOf({ practice: "none" }) }), surface).toBe("family.exam.noPractice");
  });

  it("the timed bar's line is not cut: the clamp is a ceiling of four lines on a phone and three from sm", () => {
    const bar = code("src/components/SignupNudge.tsx");
    const line = bar.match(/<p className="([^"]*)">\{oldLine \? copy\.line : words\?\.short \?\? copy\.line\}<\/p>/)?.[1] ?? "";
    expect(line.split(" ")).toEqual(expect.arrayContaining(["line-clamp-4", "sm:line-clamp-3", "text-xs", "sm:text-sm"]));
    expect(line).not.toMatch(/(?:^|\s)line-clamp-2\b|truncate|hidden/);
    // The button stays centred beside a taller line.
    expect(bar).toContain('<div className="flex items-center gap-2 sm:gap-3">');
    // Why two lines were not enough: the captions the bar can take are longer than the line it had (47 / 52 / 51).
    const old = { en: 47, hi: 52, te: 51 } as const;
    for (const l of LANGS) {
      const families = KEYS.filter((k) => k.startsWith("family."));
      const longer = families.filter((k) => signUpPlaceWords(l, { key: k, vars: sampleVars(k) }).short.length > old[l]);
      expect(longer.length, l).toBeGreaterThan(15);
    }
    // The bar's line on a school page is the caption that is true on every school page.
    for (const l of LANGS) {
      const kitWords = signUpWords(l, { surface: "signup-nudge", callback: "/schooling/cbse/class-12/physics/electric-charges-and-fields" });
      expect(kitWords.short, l).toBe(SIGNUP_TABLES[l].places[SCHOOL_CAP].c);
    }
  });

  it("the bar's wait for its words: another page, or the page's own line on screen, gives the turn back; the line it comes up with stays", () => {
    const bar = code("src/components/SignupNudge.tsx");
    expect(bar).toContain("const startPath = location.pathname;");
    expect(bar).toMatch(/if \(document\.hidden \|\| !here \|\| location\.pathname !== startPath \|\| inlineOnScreen\(\)\) \{[\s\S]*?localStorage\.removeItem\(LS_LAST\);[\s\S]*?return;\s*\}/);
    expect(bar).toMatch(/setOldLine\(!cachedSignUpKit\(lc\)\);\s*setShow\(here\);\s*beacon\("shown", \{ placement: here, trigger \}\);/);
    expect(bar).toContain("const [oldLine, setOldLine] = useState(false);");
  });

  it("a failed fetch of the words is counted, tried again, and forgotten when the words come", async () => {
    // Executed: a fresh copy of the loader whose Telugu file cannot be fetched.
    vi.resetModules();
    vi.doMock("@/data/signup-places/te.json", () => {
      throw new Error("offline");
    });
    const fresh = await import("@/lib/signup-place-load");
    let told = 0;
    const stop = fresh.subscribeSignUpKits(() => {
      told += 1;
    });
    expect(fresh.signUpKitFailures("te")).toBe(0);
    await expect(fresh.loadSignUpKit("te")).rejects.toBeTruthy();
    expect(fresh.signUpKitFailures("te")).toBe(1);
    expect(fresh.cachedSignUpKit("te")).toBeNull();
    expect(told).toBe(1);
    await expect(fresh.loadSignUpKit("te")).rejects.toBeTruthy();
    expect(fresh.signUpKitFailures("te")).toBe(2);
    // Another language is not touched by it.
    expect(fresh.signUpKitFailures("en")).toBe(0);
    await fresh.loadSignUpKit("en");
    expect(fresh.signUpKitFailures("en")).toBe(0);
    // The file can be fetched again: the next call brings the words and the count is forgotten.
    vi.doUnmock("@/data/signup-places/te.json");
    vi.resetModules();
    const again = await import("@/lib/signup-place-load");
    const kit = await again.loadSignUpKit("te");
    expect(kit.table).toEqual(SIGNUP_TABLES.te);
    expect(again.signUpKitFailures("te")).toBe(0);
    stop();
    // In the loader: a failure is counted and told, a success forgets it.
    const loader = code("src/lib/signup-place-load.ts");
    expect(loader).toMatch(/\.catch\(\(err\) => \{\s*delete pending\[lang\];\s*failures\[lang\] = \(failures\[lang\] \?\? 0\) \+ 1;\s*tell\(\);\s*throw err;\s*\}\);/);
    expect(loader).toMatch(/kits\[lang\] = kit;\s*delete pending\[lang\];\s*delete failures\[lang\];\s*tell\(\);/);
    expect(loader).toContain("return kits[lang] ? 0 : failures[lang] ?? 0;");
  });

  it("after a failed fetch: tried again twice by itself, when the browser is back online, and on a hover or a keyboard focus; no caption line stands empty", () => {
    const hook = code("src/lib/use-signup-words.ts");
    expect(hook).toContain("const SIGNUP_WORDS_RETRIES = 2;");
    expect(hook).toMatch(
      /useEffect\(\(\) => \{\s*if \(skip \|\| failures === 0\) return;\s*const again = \(\) => void loadSignUpKit\(lang\)\.catch\(\(\) => \{\}\);\s*const timer = failures <= SIGNUP_WORDS_RETRIES \? window\.setTimeout\(again, SIGNUP_WORDS_RETRY_MS \* failures\) : null;\s*window\.addEventListener\("online", again\);\s*return \(\) => \{\s*if \(timer !== null\) window\.clearTimeout\(timer\);\s*window\.removeEventListener\("online", again\);\s*\};\s*\}, \[lang, skip, failures\]\);/,
    );
    expect(hook).toMatch(/export function wantSignUpWords\(locale: string \| null \| undefined\): void \{\s*const lang = signUpWordsLang\(locale\);\s*if \(!cachedSignUpKit\(lang\)\) void loadSignUpKit\(lang\)\.catch\(\(\) => \{\}\);\s*\}/);
    expect(hook).toMatch(/export function useSignUpWordsFailed\(locale: string \| null \| undefined\): boolean \{\s*const lang = signUpWordsLang\(locale\);\s*return useSyncExternalStore\(subscribeSignUpKits, \(\) => signUpKitFailures\(lang\), ZERO\) > 0;\s*\}/);
    // wantSignUpWords in node: the words are fetched, and a second call does nothing more.
    hooksMod.wantSignUpWords("hi");
    hooksMod.wantSignUpWords("hi");
    // The two buttons: the caption's line is held open while the words load, and let go once the fetch has failed.
    for (const f of ["src/components/SignUpButton.tsx", "src/components/GoogleSignInButton.tsx"]) {
      const src = code(f);
      expect(src, f).toContain("const failed = useSignUpWordsFailed(locale);");
      expect(src, f).toContain('const short = words ? words.short : failed ? "" : SIGNUP_CAPTION_PENDING;');
      expect(src, f).toContain('onWant={typeof givenText === "string" ? undefined : () => wantSignUpWords(locale)}');
    }
    // The frame renders no caption element for an empty caption.
    const shell = code("src/components/SignUpButton.tsx");
    expect(shell).toContain('{shown && short && explain === "both" && <span className="su-cap">{short}</span>}');
    // A hover (a mouse, a pen) or a KEYBOARD focus on a button without words asks for them — a tap does not.
    expect(shell).toMatch(/setHovered\(true\);\s*if \(text === ""\) onWant\?\.\(\);/);
    expect(shell).toMatch(/if \(opens && text === ""\) onWant\?\.\(\);\s*if \(!canHover\(\)\) return;\s*if \(opens\) setFocused\(true\);/);
    // The header passes it too.
    const header = code("src/components/HeaderAuthControls.tsx");
    expect(header).toContain("const wantTip = useCallback(() => wantSignUpWords(lang), [lang]);");
  });

  it("the 'explanation opened' beacon goes out only when there is an explanation to open", () => {
    const shell = code("src/components/SignUpButton.tsx");
    expect(shell).toContain('const ready = shown && text !== "";');
    // The hover timer fires 0.6 s later: it asks whether the words are there THEN.
    expect(shell).toMatch(/const readyNow = useRef\(false\);\s*useEffect\(\(\) => \{\s*readyNow\.current = ready;\s*\}, \[ready\]\);/);
    expect(shell).toMatch(/hoverTimer\.current = window\.setTimeout\(\(\) => \{\s*if \(readyNow\.current\) explainOpened\(surface, "hover"\);\s*\}, SIGNUP_EXPLAIN_HOVER_MS\);/);
    expect(shell).toContain('if (keyboard && ready) explainOpened(surface, "focus");');
    // No unguarded call is left; the beacon's name, props and once-per-page rule are as they were.
    expect(shell.match(/explainOpened\(surface, "(?:hover|focus)"\)/g)).toEqual(['explainOpened(surface, "hover")', 'explainOpened(surface, "focus")']);
    expect(shell).not.toMatch(/window\.setTimeout\(\(\) => explainOpened\(/);
    expect(shell).not.toContain('if (keyboard) explainOpened(surface, "focus");');
    expect(shell).toContain("ctaBeacon(SIGNUP_EXPLAIN_CTA, { surface, via });");
    expect(shell).toContain("if (!explainBeaconDue(path, explainSentPath)) return;");
  });

  it("a tooltip's words are fetched after the page has loaded, on a screen with a mouse only; a caption's at once", () => {
    const hook = code("src/lib/use-signup-words.ts");
    // After the window's load event, then idle — two seconds after the load where the browser cannot say it is idle.
    const idle = hook.slice(hook.indexOf("function whenLoadedAndIdle("), hook.indexOf("export function wantSignUpWords("));
    expect(idle).toContain('if (document.readyState === "complete") idle();');
    expect(idle).toContain('window.addEventListener("load", idle, { once: true });');
    expect(idle).toContain('cancel = () => window.removeEventListener("load", idle);');
    expect(idle).toContain("const id = window.setTimeout(fn, 2000);");
    expect(hook).not.toMatch(/setTimeout\(fn, 300\)|function whenIdle\(/);
    // A touch screen opens no tooltip: nothing is fetched for one there (the button's own test of "can hover").
    expect(hook).toMatch(/function hoverScreen\(\): boolean \{\s*try \{\s*return window\.matchMedia\("\(hover: hover\) and \(pointer: fine\)"\)\.matches;\s*\} catch \{\s*return false;\s*\}\s*\}/);
    expect(code("src/components/SignUpButton.tsx")).toContain('return window.matchMedia("(hover: hover) and (pointer: fine)").matches;');
    // The header and the page-wide buttons ask for a tooltip only; a "both" button and the bar ask at once.
    expect(code("src/components/HeaderAuthControls.tsx")).not.toMatch(/now: true/);
    expect(code("src/components/SignUpButton.tsx")).toContain('now: mode === "both" },');
    expect(code("src/components/SignupNudge.tsx")).toContain("{ now: true, off: !show }");
    expect(code("src/components/SignupPitch.tsx").match(/<SignUpButton\b[\s\S]*?\/>/)?.[0]).toContain('explain="own"');
    expect(code("src/components/SignupInline.tsx").match(/<SignUpButton\b[\s\S]*?\/>/)?.[0]).toContain('explain="own"');
  });

  it("the page's facts are written before the browser paints", () => {
    const island = code("src/components/SignUpPageContext.tsx");
    expect(island).toContain('import { useLayoutEffect } from "react";');
    expect(island).toMatch(/useLayoutEffect\(\(\) => \{[\s\S]*?setSignUpPageData\(path, data\);\s*return \(\) => clearSignUpPageData\(path, data\);\s*\}, \[pathname, exam, code, practice, olympiad, notes, topicQuestions, mockGate\]\);/);
    expect(island).not.toMatch(/\buseEffect\b/);
    // One name for the olympiad category wherever a page reads it.
    expect(code("src/app/mocks/[id]/page.tsx")).toContain("olympiad={String(guestMock.exam.category) === OLYMPIAD_CATEGORY}");
    expect(code("src/app/mocks/[id]/page.tsx")).not.toContain('=== "OLYMPIAD"');
  });

  it("the three data files are the reviewed table: a hand edit shows up here", () => {
    // Generated from the reviewed table (final.json, 2 Oct 2026) by a script that is not in the repository, and
    // compared with it character for character. If a sentence must change, change the table, have it reviewed,
    // regenerate the three files, and put the new checksums here in the same commit.
    const sums: Record<Lang, string> = {
      en: "e5d6740495a2aaedf316a1b91390ad3051b21d67260fc23574a3d6ef46fe48c6",
      hi: "700a557d6de6fba4c8cd4cfdc10b9258dd1374b5c63b3644defa5ad31cb23fdb",
      te: "25713cfd1bdae34bae1c1281afab356f3bfdd8b4d588c8548af091804c4eed0a",
    };
    for (const l of LANGS) {
      expect(crypto.createHash("sha256").update(read(`src/data/signup-places/${l}.json`)).digest("hex"), l).toBe(sums[l]);
    }
  });
});
