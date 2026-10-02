// "SIGN UP WITH GOOGLE" IN THE SENTENCES TOO (2 Oct 2026, later the same
// night — founder: "wherever the sign in or sign up or free sign in everywhere
// sign has to be replaced with Google sign up … and everywhere try to say
// something why sign in will help them").
//
// tests/unit/signup-everywhere.test.ts made every CLICKABLE call the white
// "Sign up with Google" button. This file pins the SENTENCES a signed-out
// visitor reads beside, above or away from those buttons: they invited a
// guest to "Sign in free", "sign in (free)", "Sign in with Google" — in
// English, Hindi and Telugu — over a button that says "Sign up with Google".
//
// THE RULE
//   1. A sentence that invites a GUEST to sign in invites them to "sign up
//      with Google", with its meaning and its reason kept, and "free" kept
//      where the sentence said it. Hindi and Telugu use the label's own words
//      (src/lib/signup-cta-copy.ts).
//   2. A sentence addressed to a returning member, or one that describes a
//      state or a mechanism ("Signed in, the tutor also sees …", "no sign-in
//      needed", "Google often blocks sign-in in built-in browsers", "your
//      sign-in expired"), stays. /login and the signed-out mock page are a
//      member's way in too: one line under the button says the same button
//      signs a member in. Where the Google button reads "Continue with
//      Google" (the "Welcome back" card, a language other than en / hi / te)
//      the in-app line above it still ends "then sign in with Google".
//   3. Only the verb changed. No promise was added, widened or strengthened
//      (section C compares every English sentence with what it was).
//   4. Nothing in this pass put sign-up wording on a school page — or in a
//      school chat (section E).
//
// REVIEW, same night (sections D, E and G): the mock gate got /login's member
// line; /login shows it on every card whose words invite sign-up, in any
// language; /discussions has a guest's subtitle; the in-app line follows the
// button; the guest tutor's "not in this browser" line carries no invitation
// in a school chat; and ew.signup.nudge — never printed, and promising a
// comparison the site does not make — is deleted, not reworded.
//
// WHAT THIS FILE CANNOT SEE: whether the Hindi and Telugu read naturally.
// They were written by the model that wrote this pass and have NOT been read
// by a native speaker.
// Run: npx vitest run tests/unit/signup-sentences.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { dict } from "@/lib/i18n";
import { SIGNUP_LOCALES, googleButtonLabel, isSignUpLocale, signUpLabel, signUpLabelParts, type SignUpLocale } from "@/lib/signup-cta-copy";
import { SIGNUP_BANNED_WORDS } from "@/lib/signup-cta-claims";
import { signupLineCopy } from "@/lib/content-signup";
import { signupPitchCopy } from "@/lib/signup-pitch";
import { softWallCopy } from "@/lib/soft-wall";
import { guestPaperCopy } from "@/lib/guest-paper-copy";
import { PYQ_YEAR_COPY } from "@/lib/pyq-year-copy";
import { MOCK_GATE_COPY } from "@/lib/mock-gate-copy";
import { ideaCardCopy, ideasPageCopy } from "@/lib/ideas-copy";
import { IN_APP_COPY, inAppBody } from "@/lib/in-app-browser";
import { HOME_STRIP_COPY } from "@/lib/home-strip-copy";

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
const d = (l: SignUpLocale) => dict[l] as Record<string, string>;

// ── What counts as inviting a guest to sign in ───────────────────────────
// English: the verb is written "sign in" (two words). The noun "sign-in"
// ("no sign-in needed", "Google sign-in did not complete") is a state or a
// mechanism and is not an invitation — except with "free" beside it.
// Hindi and Telugu: the verb forms, in their own script or with the Latin
// words the Telugu copy sometimes keeps, and "free sign-in" in either order.
// "मुफ़्त" is matched loosely: its nukta may be precomposed or combining.
const INVITES: Readonly<Record<SignUpLocale, RegExp>> = {
  en: /\bsign in\b|\bfree sign-in\b|\bsign-in,? \(?free\b/i,
  hi: /(?:साइन[ -]?इन|sign in) (?:करें|कीजिए|करिए|करो|करने पर|नहीं करना)|मु\S{1,4}त साइन[ -]?इन/,
  te: /(?:సైన్[ -]?ఇన్|sign in) ?(?:చేయండి|చేస్తే|చేసి|చేయాలని)|ఉచిత(?:ంగా)? సైన్[ -]?ఇన్/,
};
const scriptOf = (s: string): SignUpLocale => (/[ఀ-౿]/.test(s) ? "te" : /[ऀ-ॿ]/.test(s) ? "hi" : "en");

/** The modules this pass reworded — their code, comments removed, line by
 *  line. (src/lib/i18n.ts is scanned through the dictionary itself, below:
 *  en, hi and te only — the 19 other languages have no "Sign up with Google"
 *  label; their buttons read their own "Continue with Google".) */
const SCANNED = [
  "src/lib/content-signup.ts",
  "src/lib/signup-pitch.ts",
  "src/lib/soft-wall.ts",
  "src/lib/guest-paper-copy.ts",
  "src/lib/pyq-year-copy.ts",
  "src/lib/mock-gate-copy.ts",
  "src/lib/ideas-copy.ts",
  "src/lib/in-app-browser.ts",
  "src/lib/home-strip-copy.ts",
  "src/lib/signup-cta-copy.ts",
  "src/app/chat/ChatInterface.tsx",
  "src/app/for/[persona]/page.tsx",
  "src/app/login/page.tsx",
  "src/components/VerificationPanel.tsx",
  "src/components/home/HomeSignIn.tsx",
  // The review, same night: the pages and components it touched.
  "src/app/mocks/[id]/MockGate.tsx",
  "src/app/discussions/page.tsx",
  "src/components/InAppBrowserHint.tsx",
  "src/components/GuestQuizGate.tsx",
  "src/components/ExamVerdictPoll.tsx",
];

/** Lines of the scanned modules that still say "sign in", deliberately. The
 *  scan skips a line of `file` that starts with `starts`; `count` such lines
 *  must exist and each must still say it (no stale entry). */
const SCANNED_LEFT: { file: string; starts: string; count: number; why: string }[] = [
  // Above a button that reads "Continue with Google" — /login's "Welcome back" card (a returning member is not
  // signing up) and a language other than en / hi / te — the in-app line keeps its older ending.
  { file: "src/lib/in-app-browser.ts", starts: 'bodySignIn: "', count: 3, why: "the in-app line above a 'Continue with Google' button" },
];

/** Dictionary sentences that still say "sign in", deliberately. A key that is
 *  not listed here and matches INVITES fails the scan: reword it, or add it
 *  with its reason. */
const DICT_LEFT: Readonly<Record<string, string>> = {
  // The "Welcome back" card of /login: a returning member (its button reads "Continue with Google").
  "login.intent.return.body": "addressed to a returning member",
  // A member mid-paper whose session ran out.
  "player.save.signinExpired": "a member mid-paper: sign in AGAIN",
  "player.submit.signinExpired": "a member mid-paper: sign in AGAIN",
  // /discussions' subtitle for a MEMBER (and the member-only /discussions/new). A guest reads disc.subtitle.guest
  // in en / hi / te — the page knows who reads (section D).
  "disc.subtitle": "a member's subtitle; a guest reads disc.subtitle.guest",
};

// ── A. the scan ──────────────────────────────────────────────────────────

describe("A. no sentence in the reworded modules invites a guest to 'sign in'", () => {
  it("the rules see what they should", () => {
    for (const s of ["Sign in free — Shishya keeps", "sign in (free) to use the tutor", "Sign in with Google", "or sign in free for full mocks", "Free sign-in, no payment", "Sign in to reply"]) expect(INVITES.en.test(s), s).toBe(true);
    for (const s of ["No sign-in needed.", "Google sign-in did not complete.", "Signed in, the tutor also sees your mock mistakes", "The same button signs you in.", "Sign up with Google, free — Shishya keeps", "Sign back in any time"]) expect(INVITES.en.test(s), s).toBe(false);
    for (const s of ["साइन इन करें", "साइन-इन कीजिए", "अभी साइन इन नहीं करना?"]) expect(INVITES.hi.test(s), s).toBe(true);
    expect(INVITES.hi.test(`${d("hi")["login.freeLine"].split(" ")[0]} साइन इन`)).toBe(true); // "free sign-in", with the dictionary's own word for free
    for (const s of ["बिना साइन-इन", "आप साइन इन हो गए हैं।", "साइन इन के बाद ट्यूटर", "Google से साइन अप करें"]) expect(INVITES.hi.test(s), s).toBe(false);
    for (const s of ["ఉచితంగా సైన్ ఇన్ చేయండి", "ఉచిత సైన్-ఇన్", "Google తో sign in చేయండి", "సైన్ ఇన్ చేస్తే", "ఇప్పుడే sign in చేయాలని లేదా?"]) expect(INVITES.te.test(s), s).toBe(true);
    for (const s of ["సైన్-ఇన్ అవసరం లేదు", "మీరు sign in అయ్యారు", "సైన్ ఇన్ అయ్యాక ట్యూటర్", "Google తో సైన్ అప్ చేయండి"]) expect(INVITES.te.test(s), s).toBe(false);
  });

  it.each(SCANNED)("%s", (file) => {
    const left = SCANNED_LEFT.filter((x) => x.file === file);
    const hits: string[] = [];
    code(file)
      .split("\n")
      .forEach((line, i) => {
        if (left.some((x) => line.trim().startsWith(x.starts))) return;
        if (INVITES[scriptOf(line)].test(line)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 140)}`);
      });
    expect(hits).toEqual([]);
  });

  it("the lines the scan skips are listed, still there, and still say 'sign in' — one per language", () => {
    for (const x of SCANNED_LEFT) {
      expect(SCANNED, x.file).toContain(x.file);
      const lines = code(x.file)
        .split("\n")
        .filter((line) => line.trim().startsWith(x.starts));
      expect(lines, `${x.file}: ${x.why}`).toHaveLength(x.count);
      for (const line of lines) expect(INVITES[scriptOf(line)].test(line), line.trim().slice(0, 80)).toBe(true);
      expect(lines.map(scriptOf).sort(), x.file).toEqual(["en", "hi", "te"]);
    }
  });

  it("the dictionary (en, hi, te): only the listed keys still say it — and each listed key still does", () => {
    const stillThere = new Set<string>();
    const hits: string[] = [];
    for (const l of SIGNUP_LOCALES) {
      for (const [key, value] of Object.entries(d(l))) {
        if (!INVITES[l].test(value)) continue;
        if (key in DICT_LEFT) stillThere.add(key);
        else hits.push(`${l}/${key}: ${value.slice(0, 120)}`);
      }
    }
    expect(hits).toEqual([]);
    // No stale entry: a key reworded later comes off the list.
    expect([...stillThere].sort()).toEqual(Object.keys(DICT_LEFT).sort());
  });

  it("the three old forms are gone from every scanned module and from the dictionary", () => {
    const OLD = [/sign in,? \(?free/i, /मु\S{1,4}त साइन[ -]?इन/, /ఉచిత(?:ంగా)? సైన్[ -]?ఇన్/];
    for (const file of SCANNED) for (const re of OLD) expect(re.test(code(file)), `${file}: ${re}`).toBe(false);
    for (const l of SIGNUP_LOCALES) for (const [key, value] of Object.entries(d(l))) for (const re of OLD) expect(re.test(value), `${l}/${key}`).toBe(false);
  });
});

// ── B. the label's own words, and "free" kept ────────────────────────────

/** Every reworded sentence, per language. `full`: it names Google ("sign up
 *  with Google"); otherwise it is a short question or heading that says "sign
 *  up" only. `free`: the sentence said "free" before and still does. */
function sentences(l: SignUpLocale): { where: string; text: string; full: boolean; free?: boolean }[] {
  const pitch = signupPitchCopy(l);
  const pyq = PYQ_YEAR_COPY[l];
  const gate = MOCK_GATE_COPY[l];
  const k = d(l);
  return [
    { where: "content-signup lineExam", text: signupLineCopy(l, "SSC CGL", true).line, full: true, free: true },
    { where: "content-signup lineExamNoPractice", text: signupLineCopy(l, "AILET", false).line, full: true, free: true },
    { where: "content-signup line", text: signupLineCopy(l, null).line, full: true },
    { where: "signup-pitch lead", text: pitch.lead, full: true },
    { where: "signup-pitch short", text: pitch.short, full: true, free: true },
    { where: "soft-wall body", text: softWallCopy(l).body, full: true, free: true },
    { where: "guest-paper signIn", text: guestPaperCopy(l).signIn, full: true, free: true },
    { where: "pyq ctaBody", text: pyq.ctaBody, full: true, free: true },
    { where: "pyq ctaSave", text: pyq.ctaSave, full: true },
    { where: "mock-gate body", text: gate.body, full: true },
    { where: "mock-gate quizHeading", text: gate.quizHeading, full: false },
    { where: "ideas upvoteHintSignedOut", text: ideasPageCopy(l).upvoteHintSignedOut, full: true },
    { where: "ideas signInToUpvote", text: ideaCardCopy(l).signInToUpvote, full: true },
    { where: "in-app body", text: IN_APP_COPY[l].body, full: true },
    { where: "home-strip signupCta", text: HOME_STRIP_COPY[l].signupCta, full: true, free: true },
    { where: "cutoff.nudge.signin", text: k["cutoff.nudge.signin"], full: true, free: true },
    { where: "nav.signin", text: k["nav.signin"], full: true },
    { where: "nav.signin.short", text: k["nav.signin.short"], full: false },
    { where: "how.s1.title", text: k["how.s1.title"], full: true },
    { where: "disc.thread.signinToReply", text: k["disc.thread.signinToReply"], full: true },
    { where: "disc.subtitle.guest", text: k["disc.subtitle.guest"], full: true },
    { where: "sg.join.signin", text: k["sg.join.signin"], full: true },
    { where: "chat.guest.signin", text: k["chat.guest.signin"], full: true, free: true },
    { where: "login.h1", text: k["login.h1"], full: true },
    { where: "login.intent.mock.h1", text: k["login.intent.mock.h1"], full: false },
    { where: "login.intent.mock.h1Exam", text: k["login.intent.mock.h1Exam"], full: false },
    { where: "login.intent.mock.body", text: k["login.intent.mock.body"], full: true },
    { where: "login.intent.coach.body", text: k["login.intent.coach.body"], full: true },
    { where: "login.intent.chat.body", text: k["login.intent.chat.body"], full: true },
    { where: "login.intent.school.body", text: k["login.intent.school.body"], full: true },
    { where: "login.tryFirst", text: k["login.tryFirst"], full: false },
  ];
}

const FREE: Readonly<Record<SignUpLocale, RegExp>> = { en: /\bfree\b/i, hi: /मु\S{1,4}त/, te: /ఉచిత/ };
/** "sign up" in the language: the first two words of the label's verb half. */
const stem = (l: SignUpLocale) => (l === "en" ? "sign up" : signUpLabelParts(l)[1].split(" ").slice(0, 2).join(" "));
const stemRe = (l: SignUpLocale) => new RegExp(stem(l).replace(" ", "[ -]"), "i");
/** "with Google" in the language (hi "Google से", te "Google తో"). */
const withGoogle = (l: SignUpLocale) => (l === "en" ? "with Google" : signUpLabelParts(l)[0]);

describe("B. the reworded sentences are built on the button's own words", () => {
  it("the label is what it was: 'Sign up with Google' in en, hi and te", () => {
    expect(signUpLabel("en")).toBe("Sign up with Google");
    expect(signUpLabelParts("hi")).toEqual(["Google से", "साइन अप करें"]);
    expect(signUpLabelParts("te")).toEqual(["Google తో", "సైన్ అప్ చేయండి"]);
    expect(stem("hi")).toBe("साइन अप");
    expect(stem("te")).toBe("సైన్ అప్");
  });

  it.each(SIGNUP_LOCALES.map((l) => [l] as const))("%s: every sentence says 'sign up'; the full ones name Google; 'free' is kept where it was", (l) => {
    for (const s of sentences(l)) {
      expect(s.text, `${l}/${s.where}`).toBeTruthy();
      expect(stemRe(l).test(s.text), `${l}/${s.where}: ${s.text}`).toBe(true);
      if (s.full) expect(s.text.toLowerCase(), `${l}/${s.where}`).toContain(withGoogle(l).toLowerCase());
      if (s.free) expect(FREE[l].test(s.text), `${l}/${s.where}: free`).toBe(true);
      expect(INVITES[l].test(s.text), `${l}/${s.where}`).toBe(false);
    }
  });

  it("English: the full sentences carry the label word for word, or in its two halves around one word", () => {
    for (const s of sentences("en").filter((x) => x.full)) {
      expect(/sign up with Google|Sign up with Google/.test(s.text), s.where).toBe(true);
    }
  });

  it("Hindi and Telugu: their own script, the same placeholders as English, no banned word", () => {
    const en = sentences("en");
    for (const l of ["hi", "te"] as const) {
      sentences(l).forEach((s, i) => {
        expect(s.where).toBe(en[i].where);
        expect(s.text, `${l}/${s.where}`).not.toBe(en[i].text);
        expect(scriptOf(s.text), `${l}/${s.where}`).toBe(l);
        const holes = (t: string) => (t.match(/\{\w+\}/g) ?? []).sort();
        expect(holes(s.text), `${l}/${s.where}`).toEqual(holes(en[i].text));
      });
    }
    for (const l of SIGNUP_LOCALES) for (const s of sentences(l)) for (const w of SIGNUP_BANNED_WORDS) expect(s.text.toLowerCase().includes(w.toLowerCase()), `${l}/${s.where}: ${w}`).toBe(false);
  });

  it("the sentences written in a page or a component say it too — with the label taken from the copy module, not typed", () => {
    // tests/unit/signup-cta.test.ts: "only the copy module spells the label". These three files hold a sign-up
    // button, so their sentences call signUpLabel() where the label goes.
    const chat = read("src/app/chat/ChatInterface.tsx");
    expect(chat).toContain('import { signUpLabel } from "@/lib/signup-cta-copy";');
    const lines = chat.split("\n").filter((x) => /^\s*unavailable: `/.test(x));
    expect(lines).toHaveLength(3);
    const seen: string[] = [];
    for (const line of lines) {
      const l = scriptOf(line);
      seen.push(l);
      // The label of the line's own language, once, then "(free)".
      expect(line.split(`\${signUpLabel("${l}")}`).length - 1, l).toBe(1);
      expect(line).not.toMatch(/signUpLabel\("(?!en"|hi"|te")/);
      const text = line.replace(`\${signUpLabel("${l}")}`, signUpLabel(l));
      expect(text, l).toContain(withGoogle(l));
      expect(stemRe(l).test(text), l).toBe(true);
      expect(FREE[l].test(text), l).toBe(true);
      expect(INVITES[l].test(text), l).toBe(false);
    }
    expect(seen.sort()).toEqual(["en", "hi", "te"]);
    expect(chat).toContain('unavailable: `The guest tutor isn\'t available in this browser. ${signUpLabel("en")} (free) to use the tutor.`,');
    const persona = code("src/app/for/[persona]/page.tsx");
    expect(persona).toContain('with no sign-in. {signUpLabel("en")} (free, for ages 13');
    expect(persona).toContain('import { signUpLabel } from "@/lib/signup-cta-copy";');
    const panel = code("src/components/VerificationPanel.tsx");
    expect(panel).toContain('{signUpLabel("en")} to help verify this fact, flag inaccuracies, or');
    expect(panel).toContain('import { signUpLabel } from "@/lib/signup-cta-copy";');
  });

  it("the guest tutor's line reads as one sentence: lead, the invitation, what it keeps", () => {
    const k = d("en");
    expect(`${k["chat.guest.lead"]} ${k["chat.guest.signin"]} ${k["chat.guest.tail"]}`).toBe(
      "You're chatting as a guest. Sign up with Google, free, to keep your chats in your account (accounts are for ages 13 and above).",
    );
    expect(`${k["chat.guest.signin"]} ${k["chat.guest.tailExam"]}`).toBe("Sign up with Google, free, to save your chats and get tutoring tuned to your weak topics.");
    // The page still joins the three parts with spaces, in this order.
    expect(read("src/app/chat/page.tsx")).toContain('${t("chat.guest.signin")} ${anonExamShort ? t("chat.guest.tailExam") : t("chat.guest.tail")}`');
  });
});

// ── C. only the verb changed ─────────────────────────────────────────────

/** Each English sentence as it was, and the one swap that makes it what it
 *  is. Anything else different — a new clause, a stronger word — fails. */
const VERB_ONLY: { where: string; now: () => string; was: string; from: string; to: string }[] = [
  { where: "content-signup lineExam", now: () => signupLineCopy("en", "SSC CGL", true).line, was: "Sign in free — Shishya keeps your SSC CGL mocks, scores and weak topics, and picks up where you left off next time.", from: "Sign in free", to: "Sign up with Google, free" },
  { where: "content-signup lineExamNoPractice", now: () => signupLineCopy("en", "AILET", false).line, was: "Sign in free — Shishya keeps AILET as your exam and picks up where you left off next time.", from: "Sign in free", to: "Sign up with Google, free" },
  { where: "content-signup line", now: () => signupLineCopy("en", null).line, was: "Sign in and Shishya keeps your exam, your mocks, scores and weak topics, and picks up where you left off next time.", from: "Sign in", to: "Sign up with Google" },
  { where: "signup-pitch lead", now: () => signupPitchCopy("en").lead, was: "Sign in once and Shishya remembers you. Every visit picks up from what you did last:", from: "Sign in once", to: "Sign up with Google once" },
  { where: "signup-pitch short", now: () => signupPitchCopy("en").short, was: "Sign in free and Shishya remembers you — your exams, weak topics, saved results and a personal plan.", from: "Sign in free and", to: "Sign up with Google, free, and" },
  { where: "soft-wall body", now: () => softWallCopy("en").body, was: "Sign in free with Google to read the full page. Shishya then remembers you: your exams, weak topics, saved results and a personal plan.", from: "Sign in free with Google", to: "Sign up with Google, free," },
  { where: "guest-paper signIn", now: () => guestPaperCopy("en").signIn, was: "Sign in free to keep your results", from: "Sign in free", to: "Sign up with Google, free," },
  { where: "pyq ctaBody", now: () => PYQ_YEAR_COPY.en.ctaBody, was: "{modelled} · instant scoring · topic-wise analysis. Sign in free to attempt and track your progress.", from: "Sign in free", to: "Sign up with Google, free," },
  { where: "pyq ctaSave", now: () => PYQ_YEAR_COPY.en.ctaSave, was: "Sign in to take the whole set and save your score →", from: "Sign in", to: "Sign up with Google" },
  { where: "mock-gate body", now: () => MOCK_GATE_COPY.en.body, was: "One Google sign-in (no password) brings you straight back to this mock. Your score and weak topics are saved.", from: "One Google sign-in (no password) brings you", to: "Sign up with Google once (no password) and you come" },
  { where: "mock-gate quizHeading", now: () => MOCK_GATE_COPY.en.quizHeading, was: "Not ready to sign in?", from: "sign in", to: "sign up" },
  { where: "ideas upvoteHintSignedOut", now: () => ideasPageCopy("en").upvoteHintSignedOut, was: "Sign in to upvote the ones you want built next.", from: "Sign in", to: "Sign up with Google" },
  { where: "ideas signInToUpvote", now: () => ideaCardCopy("en").signInToUpvote, was: "Sign in to upvote", from: "Sign in", to: "Sign up with Google" },
  { where: "in-app body", now: () => IN_APP_COPY.en.body, was: "You are reading Shishya inside {app}. Google often blocks sign-in in built-in browsers — open this page in Chrome or Safari, then sign in with Google.", from: "then sign in with Google", to: "then sign up with Google" },
  { where: "home-strip signupCta", now: () => HOME_STRIP_COPY.en.signupCta, was: "Free sign-up — start prepping", from: "Free sign-up", to: "Sign up with Google, free" },
  { where: "cutoff.nudge.signin", now: () => d("en")["cutoff.nudge.signin"], was: "or sign in free for full mocks with your scores saved →", from: "sign in free", to: "sign up with Google, free," },
  { where: "nav.signin", now: () => d("en")["nav.signin"], was: "Sign in with Google", from: "Sign in", to: "Sign up" },
  { where: "nav.signin.short", now: () => d("en")["nav.signin.short"], was: "Sign in", from: "Sign in", to: "Sign up" },
  { where: "how.s1.title", now: () => d("en")["how.s1.title"], was: "Sign in with Google", from: "Sign in", to: "Sign up" },
  { where: "disc.thread.signinToReply", now: () => d("en")["disc.thread.signinToReply"], was: "Sign in to reply", from: "Sign in", to: "Sign up with Google" },
  // A guest's subtitle on /discussions: the member's sentence (still disc.subtitle) with the one swap.
  { where: "disc.subtitle.guest", now: () => d("en")["disc.subtitle.guest"], was: "Live discussion threads. Read freely; sign in to reply.", from: "sign in", to: "sign up with Google" },
  { where: "sg.join.signin", now: () => d("en")["sg.join.signin"], was: "Sign in to join", from: "Sign in", to: "Sign up with Google" },
  { where: "chat.guest.signin", now: () => d("en")["chat.guest.signin"], was: "Sign in free", from: "Sign in free", to: "Sign up with Google, free," },
  { where: "login.h1", now: () => d("en")["login.h1"], was: "Sign in and make Shishya yours", from: "Sign in", to: "Sign up with Google" },
  { where: "login.body", now: () => d("en")["login.body"], was: "Free — for any of {n} exams. An account makes Shishya yours: it keeps your exam, your weak topics, your mocks and the questions you ask, and picks up from them next time. Google sign-in only. No passwords. No spam.", from: "Google sign-in only", to: "Google account only" },
  { where: "login.body.noCount", now: () => d("en")["login.body.noCount"], was: "Free. An account makes Shishya yours: it keeps your exam, your weak topics, your mocks and the questions you ask, and picks up from them next time. Google sign-in only. No passwords. No spam.", from: "Google sign-in only", to: "Google account only" },
  { where: "login.intent.mock.h1", now: () => d("en")["login.intent.mock.h1"], was: "Your mock is one sign-in away", from: "sign-in", to: "sign-up" },
  { where: "login.intent.mock.h1Exam", now: () => d("en")["login.intent.mock.h1Exam"], was: "Your {exam} mock is one sign-in away", from: "sign-in", to: "sign-up" },
  { where: "login.intent.mock.body", now: () => d("en")["login.intent.mock.body"], was: "Sign in once with Google — no password — and you come straight back here. Your mock scores and weak topics are then kept in your account, and Shishya picks up from them next time.", from: "Sign in once with Google", to: "Sign up with Google once" },
  { where: "login.intent.coach.body", now: () => d("en")["login.intent.coach.body"], was: "The coach needs an account only to remember your progress and rebuild your plan every morning. Google sign-in, no password.", from: "Google sign-in,", to: "Sign up with Google," },
  { where: "login.intent.chat.body", now: () => d("en")["login.intent.chat.body"], was: "Sign in with Google once (no password) and your chats are kept in your account. Asking stays free with or without an account. Accounts are for people aged 13 and above.", from: "Sign in", to: "Sign up" },
  { where: "login.intent.school.body", now: () => d("en")["login.intent.school.body"], was: "Sign in with Google once (no password) to practise chapters with your score kept in your account. Reading, the practice on each chapter page and the AI tutor need no account. Accounts are for people aged 13 and above.", from: "Sign in", to: "Sign up" },
  { where: "login.tryFirst", now: () => d("en")["login.tryFirst"], was: "Not ready to sign in? Try 5 {exam} questions first — no login →", from: "sign in", to: "sign up" },
];

describe("C. only the verb changed: each English sentence is what it was, with one swap", () => {
  it.each(VERB_ONLY.map((v) => [v.where, v] as const))("%s", (_w, v) => {
    expect(v.was.split(v.from).length - 1, "the swap applies once").toBe(1);
    expect(v.now()).toBe(v.was.replace(v.from, v.to));
  });

  it("covers every sentence of section B (no reworded sentence goes unchecked)", () => {
    const b = sentences("en").map((s) => s.where);
    const c = new Set(VERB_ONLY.map((v) => v.where));
    for (const w of b) expect(c.has(w), w).toBe(true);
  });

  it("Hindi and Telugu: the label's words were put in once — and what this cannot check is said", () => {
    // The old Hindi and Telugu sentences are not typed out here, so this file cannot prove word for word that
    // nothing else moved in them; section B checks their shape (script, placeholders, "free", no banned word) and
    // this checks the swap went in once. The sentences were not read by a native speaker.
    for (const l of ["hi", "te"] as const) {
      for (const s of sentences(l).filter((x) => x.full)) expect(s.text.split(withGoogle(l)).length - 1, `${l}/${s.where}: Google named once`).toBe(1);
      for (const s of sentences(l)) expect((s.text.match(new RegExp(stemRe(l).source, "g")) ?? []).length, `${l}/${s.where}: 'sign up' once`).toBe(1);
    }
  });
});

// ── D. /login still lets a member in, and says so ────────────────────────

describe("D. /login: the headings invite sign-up; one line tells a returning member the same button signs them in", () => {
  const page = code("src/app/login/page.tsx");

  it("the line, in en, hi and te — on every card whose words invite sign-up, never on 'Welcome back'", () => {
    expect(d("en")["login.member"]).toBe("Already have an account? The same button signs you in.");
    expect(d("hi")["login.member"]).toBe("पहले से अकाउंट है? इसी बटन से साइन इन हो जाएगा।");
    expect(d("te")["login.member"]).toMatch(/సైన్ ఇన్/);
    for (const l of ["hi", "te"] as const) {
      expect(scriptOf(d(l)["login.member"])).toBe(l);
      // It tells a member what happens; it does not invite anyone to sign in or to sign up.
      expect(INVITES[l].test(d(l)["login.member"]), l).toBe(false);
      expect(stemRe(l).test(d(l)["login.member"]), l).toBe(false);
    }
    // The other languages have no such key; where the line shows for them it is the English one (below).
    for (const l of Object.keys(dict)) if (!["en", "hi", "te"].includes(l)) expect("login.member" in (dict as Record<string, Record<string, string>>)[l], l).toBe(false);
    expect(page).toContain('import { isSignUpLocale } from "@/lib/signup-cta-copy";');
    // Left-aligned small text, like the button's caption above it. Review, same night: the mock, coach, chat and
    // school cards exist in en / hi / te only, so another language reads their English "Sign up with Google once …"
    // over its own "Continue with Google" button — the line shows there too (`intent !== null`). Not on another
    // language's default card: its own heading still says sign in.
    expect(page).toMatch(/\{li\.kind !== "return" && \(isSignUpLocale\(locale\) \|\| intent !== null\) && \(\s*<p className="mt-1\.5 text-xs text-ink-600">\{t\("login\.member"\)\}<\/p>\s*\)\}/);
    // Under the button, before the "try 5 questions first" alternative.
    expect(page.indexOf('t("login.member")')).toBeGreaterThan(page.indexOf("<GoogleSignInButton"));
    expect(page.indexOf('t("login.member")')).toBeLessThan(page.indexOf("{examCode && li.tryFirst && ("));
  });

  it("the cards another language reads in English are exactly the ones `intent` covers", () => {
    const others = Object.keys(dict).filter((l) => !["en", "hi", "te"].includes(l));
    expect(others.length).toBeGreaterThan(10);
    for (const kind of ["mock", "coach", "chat", "school"]) {
      for (const l of others) expect(`login.intent.${kind}.body` in (dict as Record<string, Record<string, string>>)[l], `${l}/${kind}`).toBe(false);
      expect(stemRe("en").test(d("en")[`login.intent.${kind}.body`]), kind).toBe(true);
      expect(page).toContain(`t("login.intent.${kind}.body")`);
    }
    // Their default card is their own, and none of them was reworded to "sign up" in this pass.
    for (const l of others) {
      const own = (dict as Record<string, Record<string, string>>)[l]["login.h1"];
      expect(own, l).toBeTruthy();
      expect(own, l).not.toBe(d("en")["login.h1"]);
    }
  });

  it("the signed-out mock page says it too: the same line under its Google button, in every language", () => {
    const gate = code("src/app/mocks/[id]/MockGate.tsx");
    // Under the button, above the "Free · …" line; the same small left-aligned text as on /login.
    expect(gate).toMatch(/className="mt-4"\s*\/>\s*<p className="mt-1\.5 text-xs text-ink-600">\{memberLine\}<\/p>\s*<p className="mt-2 text-center text-xs text-ink-500">/);
    expect(gate).toMatch(/memberLine: string;/);
    // No language guard: the gate's own words fall back to English ("Sign up with Google once …") and so does the line.
    expect(gate).not.toMatch(/isSignUpLocale/);
    expect(read("src/app/mocks/[id]/page.tsx")).toMatch(/freeLine=\{t\("login\.freeLine"\)\}\s+memberLine=\{t\("login\.member"\)\}/);
    for (const l of SIGNUP_LOCALES) expect(stemRe(l).test(MOCK_GATE_COPY[l].body), l).toBe(true);
  });

  it("/discussions: a guest reads 'sign up with Google to reply' (en / hi / te); a member keeps 'sign in to reply'", () => {
    const list = code("src/app/discussions/page.tsx");
    expect(list).toContain('{t(!session?.user && isSignUpLocale(locale) ? "disc.subtitle.guest" : "disc.subtitle")}');
    expect(list).toContain('import { isSignUpLocale } from "@/lib/signup-cta-copy";');
    expect(list.match(/t\("disc\.subtitle"\)/g)).toBeNull();
    expect(d("en")["disc.subtitle"]).toBe("Live discussion threads. Read freely; sign in to reply.");
    for (const l of SIGNUP_LOCALES) {
      // The guest line is the member line with the one swap: everything before the last clause is the same.
      const member = d(l)["disc.subtitle"];
      const guest = d(l)["disc.subtitle.guest"];
      expect(guest.slice(0, guest.indexOf(";")), l).toBe(member.slice(0, member.indexOf(";")));
      expect(guest, l).toContain(withGoogle(l));
    }
    // A language without the guest key keeps its own subtitle (the page asks isSignUpLocale first).
    for (const l of Object.keys(dict)) if (!["en", "hi", "te"].includes(l)) expect("disc.subtitle.guest" in (dict as Record<string, Record<string, string>>)[l], l).toBe(false);
    // /discussions/new is a member's page (a guest is sent to /login): the member's subtitle.
    expect(code("src/app/discussions/new/page.tsx")).toContain('t("disc.subtitle")');
  });

  it("the in-app line follows the button under it: 'sign up' above 'Sign up with Google', 'sign in' above 'Continue with Google'", () => {
    expect(IN_APP_COPY.en.bodySignIn).toBe(
      "You are reading Shishya inside {app}. Google often blocks sign-in in built-in browsers — open this page in Chrome or Safari, then sign in with Google.",
    );
    for (const l of SIGNUP_LOCALES) {
      const c = IN_APP_COPY[l];
      // One line, two endings: the same words up to the last clause.
      const cut = c.body.lastIndexOf(l === "en" ? "then " : "Google");
      expect(cut, l).toBeGreaterThan(40);
      expect(c.bodySignIn.slice(0, cut), l).toBe(c.body.slice(0, cut));
      expect(INVITES[l].test(c.bodySignIn), l).toBe(true);
      expect(stemRe(l).test(c.bodySignIn), l).toBe(false);
      expect(INVITES[l].test(c.body), l).toBe(false);
      expect(inAppBody(c, "instagram")).toBe(c.body.replace("{app}", "Instagram"));
      expect(inAppBody(c, "instagram", true)).toBe(c.bodySignIn.replace("{app}", "Instagram"));
      expect(inAppBody(c, "webview", true)).toBe(c.bodySignIn.replace("{app}", c.thisApp));
    }
    const hint = code("src/components/InAppBrowserHint.tsx");
    expect(hint).toMatch(/signIn = false,/);
    expect(hint).toContain("{inAppBody(c, hint.family, signIn)}");
    // /login: the "Welcome back" card and a language other than en / hi / te — exactly where googleButtonLabel()
    // returns "Continue with Google".
    expect(page).toContain('<InAppBrowserHint signIn={li.kind === "return" || !isSignUpLocale(locale)} />');
    for (const [l, returning, signIn] of [["en", false, false], ["hi", false, false], ["te", false, false], ["en", true, true], ["ta", false, true], ["bn", true, true]] as const) {
      expect(googleButtonLabel(l, "CONTINUE", returning) === "CONTINUE", `${l}/${returning}`).toBe(signIn);
      expect(returning || !isSignUpLocale(l), `${l}/${returning}`).toBe(signIn);
    }
    // The gates (no "Welcome back" there): another language only, and only where the button was given its words.
    const gate = code("src/components/GuestQuizGate.tsx");
    expect(gate).toContain("{inAppHint && <InAppBrowserHint signIn={!!continueLabel && !isSignUpLocale(locale)} />}");
    expect(gate).toContain('import { isSignUpLocale } from "@/lib/signup-cta-copy";');
  });

  it("Telugu keeps one script inside a box: 'సైన్ ఇన్' beside 'సైన్ అప్', not the Latin words", () => {
    const te = IN_APP_COPY.te;
    for (const s of [te.title, te.body, te.bodySignIn, MOCK_GATE_COPY.te.body, MOCK_GATE_COPY.te.quizHeading, MOCK_GATE_COPY.te.quizLine, d("te")["login.intent.return.body"], d("te")["disc.subtitle"], d("te")["disc.subtitle.guest"]]) {
      expect(/sign[ -]?(?:in|up)/i.test(s), s.slice(0, 60)).toBe(false);
    }
    expect(te.title).toContain("సైన్ ఇన్");
    expect(MOCK_GATE_COPY.te.quizLine).toContain("సైన్ ఇన్ అవసరం లేదు");
  });

  it("the 'Welcome back' card is a member's and still says 'Sign in'", () => {
    expect(d("en")["login.intent.return.h1"]).toBe("Welcome back");
    expect(d("en")["login.intent.return.body"]).toBe("Sign in to continue where you left off — your mocks, plan and report are all still here.");
    expect(page).toContain('returning={li.kind === "return"}');
  });

  it("what describes a state or a mechanism was left as it was", () => {
    expect(d("en")["login.error"]).toBe("Google sign-in did not complete. Nothing was saved — please try again.");
    expect(d("en")["login.escape.ask"]).toBe("Ask Shishya a question — free, no sign-in →");
    expect(MOCK_GATE_COPY.en.quizLine).toContain("no sign-in");
    expect(MOCK_GATE_COPY.en.choiceLine).toBe("You're signed in. The clock starts only when you pick one.");
    expect(IN_APP_COPY.en.title).toBe("Sign-in may not work inside this app");
    expect(read("src/app/chat/ChatInterface.tsx")).toContain('sub: "Signed in, the tutor also sees your mock mistakes and weak topics.",');
    expect(guestPaperCopy("en").guestLine).toBe("No sign-in needed. Your answers stay on this device until you submit.");
  });
});

// ── E. minors, and the home page's section name ──────────────────────────

describe("E. no sign-up wording reached a school page; the home section is named by its button for a guest only", () => {
  it("none of the reworded modules is a school page, a school component or the school copy", () => {
    for (const f of SCANNED) expect(/^src\/(?:app\/schooling|components\/school|lib\/school)\//.test(f), f).toBe(false);
  });

  it("no file of the school pages carries a 'sign up with Google' sentence", () => {
    const files = [
      ...walk(path.join(ROOT, "src/app/schooling"), /\.tsx?$/),
      ...walk(path.join(ROOT, "src/components/school"), /\.tsx?$/),
      ...walk(path.join(ROOT, "src/lib/school"), /\.ts$/),
    ].map(rel);
    expect(files.length).toBeGreaterThan(10);
    const hits = files.filter((f) => /sign up with google|साइन[ -]अप|సైన్[ -]అప్/i.test(code(f)));
    expect(hits).toEqual([]);
  });

  it("the guest tutor's 'not in this browser' line carries no invitation in a school chat, or once the under-13 line closed the chat", () => {
    // A school chat (Class 8-12) shows no sign-up offer — the banner and the save card are off there — and the
    // reworded line had put "Sign up with Google (free)" into it. The plain line is the full one's first sentence.
    const chat = read("src/app/chat/ChatInterface.tsx").split("\n");
    const plain = chat.filter((x) => /^\s*unavailablePlain: "/.test(x));
    const full = chat.filter((x) => /^\s*unavailable: `/.test(x));
    expect(plain).toHaveLength(3);
    expect(plain.map(scriptOf).sort()).toEqual(["en", "hi", "te"]);
    for (const line of plain) {
      const l = scriptOf(line);
      const text = JSON.parse(line.trim().slice("unavailablePlain: ".length, -1)) as string;
      expect(stemRe(l).test(text), l).toBe(false);
      expect(INVITES[l].test(text), l).toBe(false);
      expect(text, l).not.toMatch(/Google|sign/i);
      expect(FREE[l].test(text), l).toBe(false);
      const whole = full.find((x) => scriptOf(x) === l) ?? "";
      expect(whole.trim().startsWith(`unavailable: \`${text} `), l).toBe(true);
    }
    expect(plain.find((x) => scriptOf(x) === "en")?.trim()).toBe('unavailablePlain: "The guest tutor isn\'t available in this browser.",');
    expect(chat.join("\n")).toContain('throw new Error(TURN_COPY[uiLang()][school || under13Ref.current ? "unavailablePlain" : "unavailable"]);');
  });

  it("the home page's sign-in section: 'Sign up with Google' for a guest, no name for a member", () => {
    const home = code("src/components/home/HomeSignIn.tsx");
    expect(home).toContain('<section className="mt-11 text-center" aria-label={signedIn ? undefined : signUpLabel(homeCopyLocaleOf(copy))}>');
    expect(home).not.toMatch(/copy\.signin\.cta/);
    expect(home).toContain('import { signUpLabel } from "@/lib/signup-cta-copy";');
  });
});

// ── F. what was deliberately left ────────────────────────────────────────

/** Sentences outside the scanned modules that still say "sign in", and why.
 *  Each must still be there: when one is reworded, take it off this list.
 *  NOT listed (other unfinished, uncommitted work on 2 Oct 2026 — those files
 *  may or may not be in the tree): src/lib/home-doors-copy.ts signin.cta
 *  ("Sign in free", no longer read by HomeSignIn) and
 *  src/lib/saved-path-core.ts ("Keep it on every device: sign in"). */
const LEFT: { file: string; has: string; why: string }[] = [
  // tests/unit/schooling-honesty.test.ts (other unfinished work) bans the words "sign up" in this file.
  { file: "src/lib/school/student-copy.ts", has: "Want your practice kept? Sign in with Google to practise this chapter", why: "blocked: the school honesty test forbids 'sign up' in the school copy" },
  // Rendered only when the visitor IS signed in (the guest's card above it has the button and its own sentence).
  { file: "src/app/find-your-exam/page.tsx", has: "Sign in free to lock your exam, get a daily plan, mock tests and an AI tutor in your", why: "a signed-in visitor's card — OPEN: it tells a member to sign in" },
  // Vouching is open to verified Domain Experts only — people who already have an account.
  { file: "src/app/community-vouching/[domain]/page.tsx", has: "Sign in to vouch (only available to verified Domain Experts in this domain).", why: "addressed to existing members" },
  // A status badge on a search result, shown to members and guests alike.
  { file: "src/lib/search-copy.ts", has: '"sign-in": "Sign in to use"', why: "a status for every reader, not a call beside a button" },
  // The /mock-tests FAQ answer (also in the page's FAQ structured data) and its meta description.
  { file: "src/lib/mock-catalogue.ts", has: "You sign in to take one, so your score is saved.", why: "describes how it works; machine-readable too" },
  { file: "src/lib/mock-catalogue.ts", has: "Free sign-in, no payment.", why: "a meta description" },
  // An API error for a caller with no session.
  { file: "src/lib/challenge-db.ts", has: "Sign in to challenge friends with your mock.", why: "an API error; the card is on a member's results page" },
];

describe("F. what still says 'sign in', on purpose", () => {
  it.each(LEFT.map((x) => [`${x.file} — ${x.why}`, x] as const))("%s", (_n, x) => {
    expect(read(x.file).includes(x.has), x.has).toBe(true);
  });
});

// ── G. a sentence that was never printed is deleted, not reworded ────────

describe("G. the paper poll's sign-up offer is a switch, not a sentence", () => {
  // ew.signup.nudge ("… to save your rating and compare when the key is out") was read only for being set: the
  // poll shows the shared button, not the sentence. A guest's rating is stored anyway and nothing compares a rating
  // with an answer key, so the sentence was untrue — and this pass had reworded it into a sign-up invitation one
  // refactor away from being shown. It is gone from the dictionary; the poll takes a boolean.
  it("ew.signup.nudge is in no language, and no English sentence promises a comparison 'when the key is out'", () => {
    for (const [l, table] of Object.entries(dict as Record<string, Record<string, string>>)) expect("ew.signup.nudge" in table, l).toBe(false);
    for (const [key, value] of Object.entries(d("en"))) expect(/compare when the key is out/i.test(value), key).toBe(false);
    expect(read("src/lib/i18n.ts")).not.toContain("ew.signup.nudge");
  });

  it("the poll shows the button on a boolean, and its three callers pass true", () => {
    const poll = code("src/components/ExamVerdictPoll.tsx");
    expect(poll).toMatch(/\n\s*nudge\?: boolean;/);
    expect(poll).toMatch(/\{done && verdict && !signedIn && labels\.nudge && \(\s*<SignUpButton/);
    for (const f of ["src/app/exams/[code]/cutoff/page.tsx", "src/components/exam-phase/ExamNightFacts.tsx", "src/components/ExamWeekBlock.tsx"]) {
      const src = code(f);
      expect(src.match(/\bnudge: true,/g), f).toHaveLength(1);
      expect(src, f).not.toContain("ew.signup.nudge");
    }
  });
});
