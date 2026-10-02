// "Sign up with Google" everywhere (2 Oct 2026, founder, standing: "Always
// make sure as many sign-ups as possible come … 'Sign up with Google' is easy
// — students may think sign-up needs a lot of details … make the buttons
// visible and clear, and on hover show a description of how signing up is
// useful").
//
// Pins, with no DB, no network and no browser:
//   1. THE LABEL — one module (src/lib/signup-cta-copy.ts), en / hi / te,
//      a Google-approved wording; every primary guest button renders it
//      through the one shared component, and the old per-surface wordings are
//      gone from the code;
//   2. THE EXPLANATION — surface-aware variants, and every claim pinned to
//      the feature that makes it true (auto-enrol, saved attempts, tutor
//      memory, saved chats, school practice, the guest-chat carry-over); the
//      exam words only where the sign-in really returns to that exam;
//   3. THE BUTTON — rendered: role="tooltip" + aria-describedby, the label,
//      Google's "G" only on the white button, text only on the saffron one,
//      the caption on touch and none where the tap must stay clear; the CSS
//      that makes the tooltip open on hover AND keyboard focus with no layout
//      shift and never over the button; Escape closes it;
//   4. GOOGLE'S NUMBERS — fill, stroke, text colour, 14/20 Medium, 12/10/12;
//   5. NEVER UNDER 13 — no button on a Class 1-7 page, the /ask line is off
//      for a Class 1-7 question, life-stage lines are off where children may
//      read, and the "explanation opened" beacon never fires there;
//   6. MEASURING — the click is still the one "signin-click" beacon with the
//      same surface ids; new doors have their own ids; every new mount of the
//      early line has its own placement id; the skip-/login test is unchanged.
// 2 Oct 2026 (review, same day) — also pinned:
//   • /login names an exam only when the cached catalogue has it (a real,
//     active exam — the only kind sign-up enrols);
//   • the tooltip opens ABOVE every button that has another action under it;
//   • the filled doors wear Google's DARK theme, the tinted cards the light;
//   • the touch caption is the SHORT sentence, a subset of the full one's
//     claims; nowhere "one tap";
//   • no early line right above the root layout's sign-up card;
//   • no header tooltip or beacon on /schooling and board hubs, no header
//     button for a Class 1-7 question on /ask.
// Run: npx vitest run tests/unit/signup-cta.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";

import * as copyMod from "@/lib/signup-cta-copy";
import * as claimsMod from "@/lib/signup-cta-claims";
import * as signinCtaMod from "@/lib/signin-cta";
import * as ctaBeaconMod from "@/lib/cta-beacon";
import * as sessionHintMod from "@/lib/session-hint";
import * as inAppMod from "@/lib/in-app-browser";
import * as directMod from "@/lib/direct-signin-ab";
import { signupGoalOf } from "@/lib/signup-goal";
import { isChildSchoolPath, pitchAllowedPath, signupPitchCopy } from "@/lib/signup-pitch";
import { contentFamily, nudgeBarCopy, signupLineCopy } from "@/lib/content-signup";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";
import { loginHrefFor } from "@/lib/signin-cta";

const { SIGNUP_BANNED_WORDS, SIGNUP_CLAIM_PHRASE_EN, SIGNUP_CLAIM_SHORT_PHRASE_EN, SIGNUP_CLAIM_PROOF, SIGNUP_EXPLAIN_CLAIMS, SIGNUP_SHORT_CLAIMS } = claimsMod;
const {
  SIGNUP_EXPLAIN_CTA,
  SIGNUP_EXPLAIN_HOVER_MS,
  SIGNUP_LABEL_EN,
  SIGNUP_LOCALES,
  callbackGoal,
  childSchoolPathForExplain,
  explainBeaconDue,
  googleButtonLabel,
  isSchoolClassCallback,
  signUpContextFor,
  signUpExplain,
  signUpExplainShort,
  signUpExplainVariant,
  signUpLabel,
  signUpLabelParts,
} = copyMod;
const { DIRECT_SIGNIN_AB_KEY, DIRECT_SIGNIN_SURFACES, DIRECT_SIGNIN_TEST_ON, inDirectSigninTest, readOrAssignDirectBucket, signinRoute } = directMod;
const { SIGNIN_CTA, SIGNIN_SURFACES, isSigninSurface } = signinCtaMod;

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** Source with comments removed (JSX comments, block comments, line comments). */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

// ── a small TSX loader (the tests/unit/where-now.test.ts one, trimmed) ────

function LinkStub({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children?: React.ReactNode } & Record<string, unknown>) {
  void prefetch;
  return React.createElement("a", { href, ...rest }, children);
}

const STUBS: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "next/link": { __esModule: true, default: LinkStub },
  "@/lib/signup-cta-copy": copyMod,
  "@/lib/signin-cta": signinCtaMod,
  "@/lib/cta-beacon": ctaBeaconMod,
  "@/lib/session-hint": sessionHintMod,
  "@/lib/in-app-browser": inAppMod,
  "@/lib/direct-signin-ab": directMod,
  // The hand-off is never called in a static render.
  "@/lib/google-handoff": { goToGoogle: async () => {}, warmGoogleHandoff: async () => {} },
};

const loaded = new Map<string, { exports: Record<string, unknown> }>();
function load(rel: string): Record<string, unknown> {
  const file = path.normalize(path.join(ROOT, rel));
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
    if (spec.startsWith("./")) return load(path.relative(ROOT, path.resolve(path.dirname(file), spec)) + ".tsx");
    throw new Error(`${rel} imports an unexpected module: ${spec}`);
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports;
}

type FC<P> = (p: P) => React.ReactElement | null;
const render = <P extends object>(C: unknown, props: P) => renderToStaticMarkup(React.createElement(C as FC<P>, props));
const attr = (html: string, name: string) => html.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1] ?? null;
const textOf = (html: string) =>
  html
    .replace(/<svg[\s\S]*?<\/svg>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const ui = load("src/components/SignUpButton.tsx") as {
  SignUpButton: unknown;
  SignUpShell: unknown;
  SignUpBrandLabel: unknown;
  GoogleG: unknown;
};
const googleBtn = load("src/components/GoogleSignInButton.tsx") as { GoogleSignInButton: unknown };

// ── 1. the label ─────────────────────────────────────────────────────────

describe("1. the label: one wording, one module", () => {
  it("reads 'Sign up with Google' in English, Hindi and Telugu — a wording Google's guidelines allow, naming Google", () => {
    expect(SIGNUP_LABEL_EN).toBe("Sign up with Google");
    expect(signUpLabel("en")).toBe("Sign up with Google");
    expect(signUpLabel("hi")).toBe("Google से साइन अप करें");
    expect(signUpLabel("te")).toBe("Google తో సైన్ అప్ చేయండి");
    // Any other language (and nothing at all) is English, never an empty label.
    for (const l of ["ta", "bn", "", null, undefined]) expect(signUpLabel(l)).toBe("Sign up with Google");
    for (const l of SIGNUP_LOCALES) {
      expect(signUpLabel(l)).toContain("Google");
      // Google: never "Google" alone as the action.
      expect(signUpLabel(l).replace("Google", "").trim().length).toBeGreaterThan(5);
      // No arrow, no "free", no surface's own promise in the label.
      expect(signUpLabel(l)).not.toMatch(/→|—|free|मुफ़्त|ఉచిత/i);
      // The two halves (a phone header stacks them) join to the label.
      expect(signUpLabelParts(l).join(" ")).toBe(signUpLabel(l));
      for (const half of signUpLabelParts(l)) expect(half.length).toBeGreaterThan(0);
    }
  });

  it("/login and the mock gate (22 languages): en / hi / te sign up; another language and a returning member keep 'Continue with Google'", () => {
    expect(googleButtonLabel("en", "Continue with Google")).toBe("Sign up with Google");
    expect(googleButtonLabel("hi", "Google से जारी रखें")).toBe("Google से साइन अप करें");
    expect(googleButtonLabel("te", "Google తో కొనసాగించండి")).toBe("Google తో సైన్ అప్ చేయండి");
    expect(googleButtonLabel("ta", "Google உடன் தொடரவும்")).toBe("Google உடன் தொடரவும்");
    expect(googleButtonLabel("en", "Continue with Google", true)).toBe("Continue with Google");
    const login = read("src/app/login/page.tsx");
    expect(login).toMatch(/<GoogleSignInButton\s+callbackUrl=\{cb\}\s+locale=\{locale\}\s+continueLabel=\{t\("login\.continue"\)\}\s+returning=\{li\.kind === "return"\}/);
  });

  it("the other copy modules take their button words from it — none keeps a wording of its own", () => {
    for (const l of SIGNUP_LOCALES) {
      expect(signupPitchCopy(l).cta).toBe(signUpLabel(l));
      expect(signupLineCopy(l, "SSC CGL", true).cta).toBe(signUpLabel(l));
      expect(signupLineCopy(l).cta).toBe(signUpLabel(l));
      expect(nudgeBarCopy(l).cta).toBe(signUpLabel(l));
      expect(nudgeBarCopy(l).label).toBe(signUpLabel(l));
    }
    expect(code("src/lib/exam-hub-copy.ts")).not.toContain("coachButton");
    expect(code("src/lib/pyq-year-copy.ts")).not.toContain("ctaSignIn");
    expect(code("src/lib/mock-gate-copy.ts")).not.toMatch(/quizEndSignIn|buildQuizEndSignIn/);
    expect(code("src/lib/school/student-copy.ts")).not.toContain("saveLink");
    expect(code("src/lib/i18n.ts")).not.toMatch(/"build\.signin"|"quiz\.signIn"/);
    expect(code("src/lib/signin-cta.ts")).not.toContain("HEADER_SIGNIN_LABEL");
  });
});

// ── 2. every primary button goes through the shared component ────────────

/** Every primary guest sign-up button: file, its door id, how it is wired. */
const BUTTONS: { file: string; surface: string; via: "SignUpButton" | "GoogleSignInButton" | "SignUpShell" }[] = [
  { file: "src/components/HeaderAuthControls.tsx", surface: "header", via: "SignUpShell" },
  { file: "src/app/exams/[code]/StartMockButton.tsx", surface: "hub-box", via: "SignUpButton" },
  { file: "src/app/exams/[code]/TryOneQuestion.tsx", surface: "hub-try-one", via: "SignUpButton" },
  { file: "src/app/exams/[code]/pyq/[year]/page.tsx", surface: "pyq-year", via: "SignUpButton" },
  { file: "src/components/AnonQuizPlayer.tsx", surface: "quiz-end", via: "SignUpButton" },
  { file: "src/app/exams/[code]/build-mock/BuilderForm.tsx", surface: "build-mock-form", via: "SignUpButton" },
  { file: "src/components/SignupPitch.tsx", surface: "signup-pitch", via: "SignUpButton" },
  { file: "src/components/SignupInline.tsx", surface: "signup-inline", via: "SignUpButton" },
  { file: "src/components/SignupNudge.tsx", surface: "signup-nudge", via: "SignUpButton" },
  { file: "src/app/mocks/[id]/MockGate.tsx", surface: "mock-gate", via: "GoogleSignInButton" },
  { file: "src/components/school/SchoolStudentEntry.tsx", surface: "school-save", via: "SignUpButton" },
  { file: "src/app/chat/ChatInterface.tsx", surface: "chat-save", via: "SignUpButton" },
  { file: "src/app/c/[token]/ChallengeLanding.tsx", surface: "challenge-end", via: "SignUpButton" },
  { file: "src/app/for/[persona]/page.tsx", surface: "persona-card", via: "SignUpButton" },
  // 2 Oct 2026 (review): four more filled guest buttons that carried their own words.
  { file: "src/app/coach/page.tsx", surface: "coach-start", via: "SignUpButton" },
  { file: "src/app/revision/page.tsx", surface: "revision-start", via: "SignUpButton" },
  { file: "src/app/join/[inviteCode]/page.tsx", surface: "batch-join", via: "SignUpButton" },
  { file: "src/app/find-your-exam/SaveMatchesNudge.tsx", surface: "finder-save", via: "SignUpButton" },
];

/** The wordings the buttons carried until 2 Oct 2026 (ten of them, none "Sign up"). */
const OLD_BUTTON_WORDS = [
  "Sign in free — start practising",
  "Sign in & keep practising",
  "Sign in free & start",
  "Sign in free — take the full mock",
  "Sign in free & build",
  "Sign in free with Google →",
  "Google से मुफ़्त साइन इन →",
  "Google తో ఉచితంగా సైన్ ఇన్ →",
  "Sign in with Google — back to this mock",
  "Sign in with Google — build your mock",
  "Sign in to save your practice",
  "Save this chat to your account — sign in free",
  "Keep this chat in a free Shishya account — sign in",
  // 2 Oct 2026 (review)
  "Start free — build my plan",
  "Start my free Mistake Notebook",
  "Sign in with Google →",
  "Save my matches — sign in free",
  "Sign in free — full {exam} mocks",
];

describe("2. every primary guest button is the one shared component", () => {
  it.each(BUTTONS.map((b) => [b.file, b] as const))("%s", (_f, b) => {
    const src = code(b.file);
    expect(src).toContain(`surface="${b.surface}"`);
    if (b.via === "SignUpButton") {
      expect(src).toContain('import { SignUpButton } from "@/components/SignUpButton";');
      expect(src).toContain("<SignUpButton");
      // No hand-made sign-in link beside it, and no label passed in: the component owns the words.
      expect(src).not.toContain("<SignInLink");
      const tag = src.slice(src.indexOf("<SignUpButton"));
      expect(tag.slice(0, tag.indexOf("/>"))).not.toMatch(/\blabel=|\bchildren=/);
    } else if (b.via === "SignUpShell") {
      expect(src).toContain('import { SignUpBrandLabel, SignUpShell } from "./SignUpButton";');
      expect(src).toContain("<SignUpBrandLabel locale={lang} stack />");
    } else {
      expect(src).toContain("<GateSignInButton");
      expect(code("src/components/GuestQuizGate.tsx")).toMatch(/<GoogleSignInButton\s+callbackUrl=\{callbackUrl\}\s+locale=\{locale\}/);
    }
  });

  it("the straight-to-Google button (/login, the gates) takes its words from the one module and wears Google's button", () => {
    const src = code("src/components/GoogleSignInButton.tsx");
    expect(src).toContain("const label = continueLabel ? googleButtonLabel(locale, continueLabel, returning) : signUpLabel(locale);");
    expect(src).toContain("const ctx = signUpContextFor({ callback: callbackUrl, exam, examCode, practice });");
    expect(src).toContain("const text = signUpExplain(locale, ctx);");
    expect(src).toContain("const short = signUpExplainShort(locale, ctx);");
    expect(src).toContain("className={`${googleButtonClass(theme)} w-full`}");
    expect(src).not.toContain("btn-primary");
    // The quiz-end buttons of both gates: the shared label (no label prop left).
    expect(code("src/components/GuestQuizGate.tsx")).not.toMatch(/label=\{|endSignIn/);
    expect(code("src/app/mocks/[id]/MockGate.tsx")).not.toContain("quizEndSignIn");
    expect(code("src/app/exams/[code]/build-mock/page.tsx")).not.toContain("buildQuizEndSignIn");
  });

  it("the dead challenge label is gone from the dictionary and the key list", () => {
    expect(read("src/lib/i18n.ts")).not.toContain("challenge.played.signIn");
    expect(read("src/lib/challenge-copy.ts")).not.toContain("challenge.played.signIn");
  });

  it("the old per-surface wordings are gone from the app's code", () => {
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
    const files = [...walk(path.join(ROOT, "src/app")), ...walk(path.join(ROOT, "src/components")), ...walk(path.join(ROOT, "src/lib"))];
    const hits: string[] = [];
    for (const f of files) {
      const rel = path.relative(ROOT, f).replace(/\\/g, "/");
      const src = code(rel);
      for (const w of OLD_BUTTON_WORDS) if (src.includes(w)) hits.push(`${rel}: ${w}`);
    }
    expect(hits).toEqual([]);
  });

  it("only the copy module spells the label: no component or page types 'Sign up with Google' itself", () => {
    for (const b of BUTTONS) expect(code(b.file), b.file).not.toMatch(/Sign up with Google|साइन अप करें|సైన్ అప్ చేయండి/);
    for (const f of ["src/components/SignUpButton.tsx", "src/components/GoogleSignInButton.tsx", "src/components/GuestQuizGate.tsx"]) {
      expect(code(f), f).not.toMatch(/Sign up with Google|साइन अप करें|సైన్ అప్ చేయండి/);
    }
  });
});

// ── 3. the explanation: copy and claims ──────────────────────────────────

describe("3. the explanation: honest, surface-aware, every claim pinned to its feature", () => {
  it("the English words, exactly — the full sentence (tooltip)", () => {
    expect(signUpExplain("en", { kind: "exam", exam: "SSC CGL", practice: true })).toBe(
      "Sign up with your Google account, no forms. SSC CGL is set up for you the moment you sign up: your tests and progress are saved and the AI tutor remembers where you left off.",
    );
    expect(signUpExplain("en", { kind: "exam", exam: "AILET", practice: false })).toBe(
      "Sign up with your Google account, no forms. AILET is set up as your exam the moment you sign up, and the AI tutor remembers where you left off.",
    );
    expect(signUpExplain("en", { kind: "general" })).toBe(
      "Sign up with your Google account, no forms. Your tests and progress are saved, your tutor chats are saved, and the AI tutor picks up where you left off.",
    );
    expect(signUpExplain("en")).toBe(signUpExplain("en", { kind: "general" }));
    expect(signUpExplain("en", { kind: "school" })).toBe("Sign up with your Google account, no forms. Your chapter practice and scores are saved to your account.");
    expect(signUpExplain("en", { kind: "tutor" })).toBe(
      "Sign up with your Google account, no forms. This chat is saved to your account, and the AI tutor remembers what you asked next time.",
    );
  });

  it("the English words, exactly — the short caption (touch): one line at 360 px", () => {
    expect(signUpExplainShort("en", { kind: "exam", exam: "SSC CGL", practice: true })).toBe("No forms. SSC CGL is set up as your exam.");
    expect(signUpExplainShort("en", { kind: "exam", exam: "AILET", practice: false })).toBe("No forms. AILET is set up as your exam.");
    expect(signUpExplainShort("en", { kind: "general" })).toBe("No forms. Your tests and tutor chats are saved.");
    expect(signUpExplainShort("en")).toBe(signUpExplainShort("en", { kind: "general" }));
    expect(signUpExplainShort("en", { kind: "school" })).toBe("No forms. Your practice scores are saved.");
    expect(signUpExplainShort("en", { kind: "tutor" })).toBe("No forms. This chat is saved to your account.");
    // An exam with no name: the general caption, like the full sentence.
    expect(signUpExplainShort("en", { kind: "exam", exam: " ", practice: true })).toBe(signUpExplainShort("en", { kind: "general" }));
    // One line: about 55 characters of 12 px text fit a 360 px phone's 328 px column.
    for (const l of SIGNUP_LOCALES) {
      for (const ctx of [{ kind: "exam", exam: "SSC CGL", practice: true }, { kind: "general" }, { kind: "school" }, { kind: "tutor" }] as copyMod.SignUpContext[]) {
        const short = signUpExplainShort(l, ctx);
        expect(short.length, `${l}: ${short}`).toBeLessThanOrEqual(66);
        expect(short.length).toBeLessThan(signUpExplain(l, ctx).length / 2);
        expect(short).not.toContain("{exam}");
      }
    }
  });

  it("'one tap' is not said anywhere: the route is the button, Google's account chooser and its share screen", () => {
    for (const l of SIGNUP_LOCALES) {
      for (const ctx of [{ kind: "exam", exam: "X", practice: true }, { kind: "exam", exam: "X", practice: false }, { kind: "general" }, { kind: "school" }, { kind: "tutor" }] as copyMod.SignUpContext[]) {
        for (const text of [signUpExplain(l, ctx), signUpExplainShort(l, ctx)]) expect(text).not.toMatch(/one tap|एक टैप|ఒక్క ట్యాప్/i);
      }
      // The site card's privacy line, right under the same button.
      expect(signupPitchCopy(l).privacy).not.toMatch(/one tap|एक टैप|ఒక్క ట్యాప్/i);
      expect(signupPitchCopy(l).privacy).toContain("Google");
    }
    expect(signupPitchCopy("en").privacy).toMatch(/^Free\. Sign up with your Google account — we get only your name, email and profile picture\./);
    expect(SIGNUP_BANNED_WORDS).toEqual(expect.arrayContaining(["one tap", "एक टैप", "ఒక్క ట్యాప్"]));
    expect(SIGNUP_CLAIM_PHRASE_EN["google-only-no-forms"]).toBe("Sign up with your Google account, no forms.");
  });

  it("an exam with no name falls back to the general words; an exam without practice never promises tests", () => {
    expect(signUpExplainVariant({ kind: "exam", exam: "  ", practice: true })).toBe("general");
    expect(signUpExplainVariant({ kind: "exam", exam: "NIFT", practice: false })).toBe("examNoPractice");
    for (const l of SIGNUP_LOCALES) {
      expect(signUpExplain(l, { kind: "exam", exam: "NIFT", practice: false })).not.toMatch(/tests|टेस्ट|టెస్టు/);
    }
  });

  it("each variant says exactly the claims it lists — no more, no fewer", () => {
    const variants = Object.keys(SIGNUP_EXPLAIN_CLAIMS) as (keyof typeof SIGNUP_EXPLAIN_CLAIMS)[];
    expect(variants.sort()).toEqual(["exam", "examNoPractice", "general", "school", "tutor"]);
    const ctxOf = (v: (typeof variants)[number]): copyMod.SignUpContext =>
      v === "exam" ? { kind: "exam", exam: "{exam}", practice: true } : v === "examNoPractice" ? { kind: "exam", exam: "{exam}", practice: false } : { kind: v };
    for (const v of variants) {
      const text = signUpExplain("en", ctxOf(v));
      for (const claim of Object.keys(SIGNUP_CLAIM_PHRASE_EN) as claimsMod.SignUpClaim[]) {
        const says = text.includes(SIGNUP_CLAIM_PHRASE_EN[claim]);
        expect(says, `${v} / ${claim}`).toBe(SIGNUP_EXPLAIN_CLAIMS[v].includes(claim));
      }
      // The short caption: exactly ITS listed claims, and never a claim the full sentence does not make.
      const short = signUpExplainShort("en", ctxOf(v));
      for (const claim of Object.keys(SIGNUP_CLAIM_SHORT_PHRASE_EN) as claimsMod.SignUpClaim[]) {
        const phrase = SIGNUP_CLAIM_SHORT_PHRASE_EN[claim];
        const says = phrase !== null && short.includes(phrase);
        expect(says, `short ${v} / ${claim}`).toBe(SIGNUP_SHORT_CLAIMS[v].includes(claim));
      }
      for (const claim of SIGNUP_SHORT_CLAIMS[v]) expect(SIGNUP_EXPLAIN_CLAIMS[v], `short ${v} / ${claim}`).toContain(claim);
      // Two sentences at most: "No forms." and one more.
      expect(short.match(/\./g)).toHaveLength(2);
    }
    expect(Object.keys(SIGNUP_SHORT_CLAIMS).sort()).toEqual([...variants].sort());
    // The school words: no exam, no tutor, no chat — the school tutor keeps no memory.
    expect(signUpExplain("en", { kind: "school" })).not.toMatch(/exam|tutor|chat/i);
    expect(signUpExplainShort("en", { kind: "school" })).not.toMatch(/exam|tutor|chat/i);
  });

  it("the proof tables are in a module no page loads (the header's bundle holds the words only)", () => {
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
    const importers = walk(path.join(ROOT, "src"))
      .filter((f) => /signup-cta-claims/.test(fs.readFileSync(f, "utf8").replace(/^\s*\/\/.*$/gm, "")))
      .map((f) => path.relative(ROOT, f).replace(/\\/g, "/"));
    expect(importers).toEqual([]);
    const copy = read("src/lib/signup-cta-copy.ts");
    for (const name of ["SIGNUP_CLAIM_PROOF", "SIGNUP_CLAIM_PHRASE_EN", "SIGNUP_BANNED_WORDS", "SIGNUP_EXPLAIN_CLAIMS"]) expect(copy, name).not.toContain(name);
    // And the claims module pulls nothing in but a type.
    expect(read("src/lib/signup-cta-claims.ts").match(/^import .*$/gm)).toEqual(['import type { SignUpExplainVariant } from "@/lib/signup-cta-copy";']);
  });

  it("every claim names code that makes it true today, and that code is there", () => {
    for (const [claim, proofs] of Object.entries(SIGNUP_CLAIM_PROOF)) {
      expect(proofs.length, claim).toBeGreaterThan(0);
      for (const p of proofs) expect(read(p.file).includes(p.has), `${claim}: ${p.file} has "${p.has}"`).toBe(true);
    }
    // Auto-enrol: the callback's exam becomes an active enrolment at sign-up, never on a school sign-in.
    const profile = read("src/lib/signup-profile.ts");
    expect(profile).toContain("await ensureEnrollment(i.userId, exam, { active: true });");
    // Google is the ONLY provider — "sign up with your Google account" has no other door.
    const auth = read("src/lib/auth.ts");
    expect(auth.match(/Provider\(\{/g)).toHaveLength(1);
    // The school tutor gets no memory — which is why the school words never mention the tutor.
    expect(read("src/lib/tutor-memory.ts")).toContain("The school tutor gets none.");
  });

  it("Hindi and Telugu carry the same variants, name Google and the AI tutor, and keep the exam's name", () => {
    for (const l of ["hi", "te"] as const) {
      for (const ctx of [
        { kind: "exam", exam: "SSC CGL", practice: true },
        { kind: "exam", exam: "SSC CGL", practice: false },
        { kind: "general" },
        { kind: "school" },
        { kind: "tutor" },
      ] as copyMod.SignUpContext[]) {
        const text = signUpExplain(l, ctx);
        expect(text).not.toBe(signUpExplain("en", ctx));
        expect(text).toContain("Google");
        expect(text).not.toContain("{exam}");
        if (ctx.kind === "exam") expect(text).toContain("SSC CGL");
        if (ctx.kind === "school") expect(text).not.toMatch(/AI|ट्यूटर|ట్యూటర్/);
        else expect(text).toContain("AI");
        expect(/[ऀ-ॿ]/.test(text)).toBe(l === "hi");
        expect(/[ఀ-౿]/.test(text)).toBe(l === "te");
        // The short caption: the same language, the exam's name, no English left behind.
        const short = signUpExplainShort(l, ctx);
        expect(short).not.toBe(signUpExplainShort("en", ctx));
        if (ctx.kind === "exam") expect(short).toContain("SSC CGL");
        if (ctx.kind === "school") expect(short).not.toMatch(/AI|ट्यूटर|ట్యూటర్/);
        expect(/[ऀ-ॿ]/.test(short)).toBe(l === "hi");
        expect(/[ఀ-౿]/.test(short)).toBe(l === "te");
        expect(short.replace("SSC CGL", "")).not.toMatch(/[A-Za-z]{3,}/);
      }
    }
  });

  it("never the words the product cannot back: no superintelligence, no 'everything changes', no 'fully personalised', no number", () => {
    for (const l of SIGNUP_LOCALES) {
      for (const ctx of [{ kind: "exam", exam: "X", practice: true }, { kind: "exam", exam: "X", practice: false }, { kind: "general" }, { kind: "school" }, { kind: "tutor" }] as copyMod.SignUpContext[]) {
        const text = signUpExplain(l, ctx);
        for (const both of [text, signUpExplainShort(l, ctx)]) {
          for (const w of SIGNUP_BANNED_WORDS) expect(both.toLowerCase(), `${l}: ${w}`).not.toContain(w);
          expect(both).not.toMatch(/\d|rank|#1|best|biggest|सबसे|అతిపెద్ద/i);
        }
        // One or two sentences a student reads in a glance.
        expect(text.length).toBeLessThan(240);
      }
    }
    expect(SIGNUP_BANNED_WORDS).toEqual(expect.arrayContaining(["superintelligence", "everything changes", "fully personalised"]));
  });
});

// ── 4. which words a button may use ──────────────────────────────────────

describe("4. the exam words only where the sign-in really sets that exam up", () => {
  it("every exam surface's callback is an exam goal — the new account is enrolled in it", () => {
    const callbacks = [
      "/exams/SSC_CGL?start=practice", // hub box
      "/exams/SSC_CGL", // try-one, quiz end, challenge
      "/exams/SSC_CGL/pyq/2024", // PYQ year
      "/exams/SSC_CGL/build-mock", // builder
      "/exams/SSC_CGL/build-mock?pyq=1",
      "/exams/SSC_CGL/syllabus", // the early line on an exam page
      "/hi/exams/SSC_CGL/cutoff", // a twin
      "/chat?examCode=SSC_CGL",
    ];
    for (const cb of callbacks) {
      expect(signupGoalOf(cb), cb).toEqual({ kind: "exam", code: "SSC_CGL" });
      expect(signUpContextFor({ callback: cb, exam: "SSC CGL", examCode: "SSC_CGL", practice: true }), cb).toEqual({ kind: "exam", exam: "SSC CGL", practice: true });
    }
    // A mock: the mock's own exam is enrolled — the caller must pass that exam's code.
    expect(signUpContextFor({ callback: "/mocks/cm1234567890?from=signin", exam: "SSC CGL", examCode: "SSC_CGL", practice: true })).toEqual({ kind: "exam", exam: "SSC CGL", practice: true });
    expect(signUpContextFor({ callback: "/mocks/cm1234567890?from=signin", exam: "SSC CGL" })).toEqual({ kind: "general" });
  });

  it("callbackGoal reads a callback exactly as signupGoalOf does (it is a copy, so the header does not load the language tables)", () => {
    const urls = [
      "/exams/SSC_CGL", "/exams/SSC_CGL/", "/exams/SSC_CGL?start=practice", "/exams/SSC_CGL/pyq/2024", "/exams/SSC_CGL/topics/algebra/hi",
      "/hi/exams/SSC_CGL/cutoff", "/te/exams/RRB_NTPC", "/hi", "/te/", "https://shishya.in/exams/UPSC_CSE/syllabus", "https://www.shishya.in/te/exams/UPSC_CSE",
      "/exams/browse", "/exams/state/telangana", "/exams/after/12th", "/exams/entrance", "/exams/category/banking", "/exams/ssc_cgl", "/exams/NCERT_C09", "/exams/CISCE_C05/x",
      "/chat?examCode=SSC_CGL", "/chat/?examCode=SSC_CGL", "/chat?examCode=NCERT_C10", "/chat?general=1", "/chat", "/chat/abc?examCode=SSC_CGL",
      "/coach?exam=IBPS_PO", "/coach", "/coach/?exam=IBPS_PO", "/coach?exam=x",
      "/mocks/cm1234567890", "/mocks/cm1234567890?from=signin&utm_source=mail", "/mocks/short", "/mocks/", "/mocks/has space",
      "/", "/dashboard", "/today", "/colleges/iit-bombay", "/schooling/cbse/class-9", "/schooling/streams/science-pcm", "/ask?q=ssc", "/for/working-professionals",
      "", "http://[bad", "exams/SSC_CGL", "//evil.example/exams/SSC_CGL",
    ];
    for (const u of urls) expect(callbackGoal(u), u).toEqual(signupGoalOf(u));
    for (const u of [null, undefined]) expect(callbackGoal(u)).toEqual(signupGoalOf(u));
    // And the copy module stays light: it imports the school class rules only.
    const src = read("src/lib/signup-cta-copy.ts");
    expect(src.match(/^import .*$/gm)).toEqual(['import { isUnder13SchoolPath, schoolContainerClassOf } from "@/lib/school/student-classes";']);
    expect(read("src/lib/school/student-classes.ts").match(/^import .*$/gm) ?? []).toEqual([]);
  });

  it("fails closed: another page, another exam's code, no name, unknown practice", () => {
    expect(signUpContextFor({ callback: "/colleges/iit-bombay", exam: "JEE Main", examCode: "JEE_MAIN", practice: true })).toEqual({ kind: "general" });
    expect(signUpContextFor({ callback: "/exams/browse", exam: "SSC CGL" })).toEqual({ kind: "general" });
    expect(signUpContextFor({ callback: "/exams/SSC_CHSL", exam: "SSC CGL", examCode: "SSC_CGL", practice: true })).toEqual({ kind: "general" });
    expect(signUpContextFor({ callback: "/exams/SSC_CGL", exam: "", practice: true })).toEqual({ kind: "general" });
    expect(signUpContextFor({ callback: "/exams/SSC_CGL", exam: null })).toEqual({ kind: "general" });
    expect(signUpContextFor({ callback: "/", exam: "SSC CGL" })).toEqual({ kind: "general" });
    expect(signUpContextFor({ callback: null, exam: "SSC CGL" })).toEqual({ kind: "general" });
    // Practice unknown → the exam is named, tests are not promised.
    expect(signUpContextFor({ callback: "/exams/SSC_CGL", exam: "SSC CGL" })).toEqual({ kind: "exam", exam: "SSC CGL", practice: false });
    expect(signUpContextFor({ callback: "/exams/SSC_CGL", exam: "SSC CGL", practice: null })).toEqual({ kind: "exam", exam: "SSC CGL", practice: false });
  });

  it("a school class return, the school tutor and a school class's practice set get the school words — whatever the caller passes", () => {
    for (const cb of ["/schooling/cbse/class-9", "/schooling/cbse/class-10/science/light?signedin=1", "/chat?examCode=NCERT_C09", "https://shishya.in/schooling/cbse/class-12/physics"]) {
      expect(isSchoolClassCallback(cb), cb).toBe(true);
      expect(signUpContextFor({ callback: cb, exam: "SSC CGL", examCode: "SSC_CGL", practice: true }), cb).toEqual({ kind: "school" });
    }
    expect(signUpContextFor({ callback: "/mocks/cm1234567890", exam: "NCERT Class 9", examCode: "NCERT_C09", practice: true })).toEqual({ kind: "school" });
    // Not school class pages: the stream pages (Class 10 leavers), /schooling itself, an exam chat.
    for (const cb of ["/schooling/streams/science-pcm", "/schooling", "/schooling/cbse", "/chat?examCode=SSC_CGL", "/chat", null, ""]) {
      expect(isSchoolClassCallback(cb), String(cb)).toBe(false);
    }
    expect(signUpContextFor({ callback: "/chat?general=1", tutor: true })).toEqual({ kind: "tutor" });
  });

  it("the shared button derives the context from its own link; callers cannot hand it an exam claim the link does not back", () => {
    const btn = code("src/components/SignUpButton.tsx");
    expect(btn).toContain("const ctx = context ?? signUpContextFor({ callback: callbackOfLoginHref(href), exam, examCode, practice });");
    // `context` is used by one caller only: the guest tutor's card.
    const users = BUTTONS.filter((b) => /\bcontext=\{/.test(code(b.file))).map((b) => b.file);
    expect(users).toEqual(["src/app/chat/ChatInterface.tsx"]);
    expect(code("src/app/chat/ChatInterface.tsx")).toContain('context={{ kind: "tutor" }}');
  });
});

// ── 5. the button, rendered ──────────────────────────────────────────────

describe("5. the rendered button: label, Google's mark, tooltip and caption", () => {
  const href = loginHrefFor("/exams/SSC_CGL?start=practice", "hub-box");
  const hub = render(ui.SignUpButton, { href, surface: "hub-box", exam: "SSC CGL", examCode: "SSC_CGL", practice: true });

  it("is the same /login link as before, with the same door id and the self-beacon mark", () => {
    const a = hub.match(/<a\b[^>]*>/)?.[0] ?? "";
    expect(attr(a, "href")).toBe("/login?callbackUrl=%2Fexams%2FSSC_CGL%3Fstart%3Dpractice&amp;from=hub-box");
    expect(attr(a, "data-signin-surface")).toBe("hub-box");
    expect(attr(a, "data-signin-beacon")).toBe("self");
  });

  it("reads 'Sign up with Google' with Google's colour G on the white button", () => {
    const a = hub.slice(hub.indexOf("<a"), hub.indexOf("</a>"));
    expect(textOf(a)).toBe("Sign up with Google");
    expect(attr(a, "class")).toBe("su-google");
    // The standard four-colour mark, decorative (the text names Google), never stretched.
    for (const c of ["#EA4335", "#4285F4", "#FBBC05", "#34A853"]) expect(a).toContain(`fill="${c}"`);
    expect(a.match(/<path /g)).toHaveLength(5);
    expect(a).toMatch(/<svg class="su-google-g"[^>]*viewBox="0 0 48 48"[^>]*aria-hidden="true"/);
    // The G comes first, then the text (12px · G · 10px · text · 12px).
    expect(a.indexOf("<svg")).toBeLessThan(a.indexOf("<span>Sign up with Google</span>"));
  });

  it("the full explanation is ONE element: role=tooltip, the link's aria-describedby, no title attribute; the short caption sits beside it", () => {
    const a = hub.match(/<a\b[^>]*>/)?.[0] ?? "";
    const id = attr(a, "aria-describedby");
    expect(id).toMatch(/^su-tip-[A-Za-z0-9_-]+$/);
    const tips = [...hub.matchAll(/<span id="([^"]+)" role="tooltip" class="su-tip-text">/g)];
    expect(tips).toHaveLength(1);
    expect(tips[0][1]).toBe(id);
    expect(hub.match(/role="tooltip"/g)).toHaveLength(1);
    // The frame holds the short caption (touch) and then the full sentence (the tooltip, and what a screen reader hears).
    const frame = hub.match(/<span class="su-tip"><span class="su-tip-short">([^<]*)<\/span><span id="[^"]+" role="tooltip" class="su-tip-text">([^<]*)<\/span><\/span>/);
    expect(frame?.[1]).toBe(signUpExplainShort("en", { kind: "exam", exam: "SSC CGL", practice: true }));
    expect(frame?.[2]).toBe(signUpExplain("en", { kind: "exam", exam: "SSC CGL", practice: true }));
    // The short caption is plain text: no role, no id, nothing the button points at.
    expect(hub).toContain('<span class="su-tip-short">No forms. SSC CGL is set up as your exam.</span>');
    // Title-less: a native title tooltip would double it and cannot be styled or dismissed.
    expect(hub).not.toMatch(/\stitle=/);
    // It follows the button in the DOM (reading order: button, then its description).
    expect(hub.indexOf("</a>")).toBeLessThan(hub.indexOf('role="tooltip"'));
  });

  it("in-page buttons default to tooltip + touch caption; the frame carries the mode the CSS reads", () => {
    expect(hub).toMatch(/^<span class="su-wrap" data-su-explain="both">/);
    const block = render(ui.SignUpButton, { href, surface: "quiz-end", block: true, className: "flex-1" });
    expect(block).toMatch(/^<span class="su-wrap su-block flex-1" data-su-explain="both">/);
    expect(block).toContain('class="su-google w-full"');
    const top = render(ui.SignUpButton, { href, surface: "signup-nudge", variant: "brand", explain: "tooltip", side: "top", align: "end", buttonClassName: "x" });
    expect(top).toMatch(/^<span class="su-wrap" data-su-explain="tooltip" data-su-side="top" data-su-align="end">/);
    // explain="tooltip": no caption element at all — only the full sentence, for the mouse and the screen reader.
    expect(top).not.toContain("su-tip-short");
    expect(top.match(/role="tooltip" class="su-tip-text"/g)).toHaveLength(1);
  });

  it("theme: Google's light button by default, its dark one on request — the same G, label and frame", () => {
    const dark = render(ui.SignUpButton, { href, surface: "hub-box", exam: "SSC CGL", examCode: "SSC_CGL", practice: true, theme: "dark", side: "top" });
    const a = dark.slice(dark.indexOf("<a"), dark.indexOf("</a>"));
    expect(attr(a, "class")).toBe("su-google su-google-dark");
    expect(textOf(a)).toBe("Sign up with Google");
    // Google: the brand-colour G on the dark, light and neutral buttons alike — never a one-colour G.
    for (const c of ["#EA4335", "#4285F4", "#FBBC05", "#34A853"]) expect(a).toContain(`fill="${c}"`);
    expect(dark).toMatch(/^<span class="su-wrap" data-su-explain="both" data-su-side="top">/);
    const block = render(ui.SignUpButton, { href, surface: "quiz-end", theme: "dark", block: true });
    expect(block).toContain('class="su-google su-google-dark w-full"');
    // The brand (saffron) form ignores the theme: it is not a Google button.
    expect(render(ui.SignUpButton, { href, surface: "signup-nudge", variant: "brand", theme: "dark", buttonClassName: "x" })).not.toContain("su-google");
  });

  it("the language follows the page: Hindi and Telugu labels and explanations", () => {
    const hi = render(ui.SignUpButton, { href, surface: "hub-box", locale: "hi", exam: "SSC CGL", examCode: "SSC_CGL", practice: true });
    expect(textOf(hi.slice(hi.indexOf("<a"), hi.indexOf("</a>")))).toBe("Google से साइन अप करें");
    expect(textOf(hi)).toContain(signUpExplain("hi", { kind: "exam", exam: "SSC CGL", practice: true }));
    const te = render(ui.SignUpButton, { href: "/login?callbackUrl=%2Fcolleges&from=pitch", surface: "signup-pitch", locale: "te" });
    expect(textOf(te)).toContain("Google తో సైన్ అప్ చేయండి");
    expect(textOf(te)).toContain(signUpExplain("te", { kind: "general" }));
  });

  it("a button whose link does not return to the exam gets the general words even if a caller names an exam", () => {
    const wrong = render(ui.SignUpButton, { href: "/login?callbackUrl=%2Fcolleges%2Fiit-bombay&from=pitch", surface: "signup-inline", exam: "JEE Main", practice: true });
    expect(textOf(wrong)).toContain(signUpExplain("en", { kind: "general" }));
    expect(textOf(wrong)).not.toContain("JEE Main");
    const school = render(ui.SignUpButton, { href: "/login?callbackUrl=%2Fschooling%2Fcbse%2Fclass-9%2Fscience%2Fmotion", surface: "school-save", exam: "SSC CGL" });
    expect(textOf(school)).toContain(signUpExplain("en", { kind: "school" }));
  });

  it("the saffron (brand) form is TEXT ONLY — no Google mark on a coloured button", () => {
    const brand = render(ui.SignUpButton, { href, surface: "signup-nudge", variant: "brand", stack: true, buttonClassName: "rounded-lg bg-saffron-500 text-white" });
    expect(brand).not.toContain("<svg");
    expect(brand).not.toContain("su-google");
    expect(attr(brand.match(/<a\b[^>]*>/)?.[0] ?? "", "class")).toBe("rounded-lg bg-saffron-500 text-white");
    expect(textOf(brand.slice(brand.indexOf("<a"), brand.indexOf("</a>")))).toBe("Sign up with Google");
    // Stacked halves on a phone, one line from sm.
    expect(brand).toContain('<span class="flex flex-col items-center leading-[1.15] sm:flex-row sm:gap-1 sm:leading-normal">');
    // And nowhere in the app is the G put on a saffron or brand-coloured element.
    for (const b of BUTTONS) {
      const src = code(b.file);
      expect(src, b.file).not.toContain("<GoogleG");
      for (const m of src.matchAll(/className="([^"]*su-google[^"]*)"/g)) expect(m[1], b.file).not.toMatch(/bg-(?!white)/);
    }
    const shared = code("src/components/SignUpButton.tsx");
    expect(shared.match(/<GoogleG \/>/g)).toHaveLength(1);
    expect(shared).toContain('const cls = variant === "google" ? `${googleButtonClass(theme)}${block ? " w-full" : ""}${buttonClassName ? ` ${buttonClassName}` : ""}` : buttonClassName ?? "btn-primary";');
    expect(shared).toContain('return theme === "dark" ? "su-google su-google-dark" : "su-google";');
  });

  it("the straight-to-Google button (/login, the gates): a real <button>, the same face, tooltip and caption", () => {
    const login = render(googleBtn.GoogleSignInButton, { callbackUrl: "/exams/SSC_CGL/pyq/2024", locale: "en", continueLabel: "Continue with Google", exam: "SSC CGL", examCode: "SSC_CGL" });
    const b = login.match(/<button\b[^>]*>/)?.[0] ?? "";
    expect(attr(b, "type")).toBe("button");
    expect(attr(b, "class")).toBe("su-google w-full");
    expect(attr(b, "aria-describedby")).toBe(login.match(/<span id="([^"]+)" role="tooltip"/)?.[1]);
    expect(textOf(login.slice(login.indexOf("<button"), login.indexOf("</button>")))).toBe("Sign up with Google");
    expect(login).toContain('fill="#4285F4"');
    // /login does not know the exam's practice state: the exam is named, tests are not promised.
    expect(textOf(login)).toContain(signUpExplain("en", { kind: "exam", exam: "SSC CGL", practice: false }));
    expect(login).toMatch(/^<span class="su-wrap su-block mt-6" data-su-explain="both">/);
    expect(textOf(login)).toContain(signUpExplainShort("en", { kind: "exam", exam: "SSC CGL", practice: false }));
    // /login and the gates: Google's dark button, the tooltip above (another action sits under the button).
    const filled = render(googleBtn.GoogleSignInButton, { callbackUrl: "/exams/SSC_CGL", locale: "en", continueLabel: "Continue with Google", theme: "dark", side: "top" });
    expect(attr(filled.match(/<button\b[^>]*>/)?.[0] ?? "", "class")).toBe("su-google su-google-dark w-full");
    expect(filled).toMatch(/^<span class="su-wrap su-block mt-6" data-su-explain="both" data-su-side="top">/);
    // A returning member and a language beyond en / hi / te keep "Continue with Google".
    const back = render(googleBtn.GoogleSignInButton, { callbackUrl: "/me/report", locale: "en", continueLabel: "Continue with Google", returning: true });
    expect(textOf(back.slice(back.indexOf("<button"), back.indexOf("</button>")))).toBe("Continue with Google");
    const ta = render(googleBtn.GoogleSignInButton, { callbackUrl: "/dashboard", locale: "ta", continueLabel: "Google உடன் தொடரவும்" });
    expect(textOf(ta.slice(ta.indexOf("<button"), ta.indexOf("</button>")))).toBe("Google உடன் தொடரவும்");
    // A language the words do not exist in: NO touch caption (English small print under a Tamil button); the tooltip stays.
    expect(ta).toMatch(/^<span class="su-wrap su-block mt-6" data-su-explain="tooltip">/);
    expect(ta).not.toContain("su-tip-short");
    for (const l of ["hi", "te"]) expect(render(googleBtn.GoogleSignInButton, { callbackUrl: "/dashboard", locale: l, continueLabel: "x" })).toContain("su-tip-short");
    // A school return: the school words.
    const school = render(googleBtn.GoogleSignInButton, { callbackUrl: "/schooling/cbse/class-9/science/motion?signedin=1", locale: "en", continueLabel: "Continue with Google" });
    expect(textOf(school)).toContain(signUpExplain("en", { kind: "school" }));
  });

  it("the header: the words arrive after mount — the cached HTML of every page holds the label and nothing else", () => {
    const shell = render(ui.SignUpShell, {
      text: signUpExplain("en"),
      surface: "header",
      explain: "tooltip",
      align: "end",
      deferText: true,
      children: (describedBy: string | undefined) => React.createElement("a", { href: "/login", "aria-describedby": describedBy }, "x"),
    });
    expect(shell).toBe('<span class="su-wrap" data-su-explain="tooltip" data-su-align="end"><a href="/login">x</a></span>');
    const controls = code("src/components/HeaderAuthControls.tsx");
    expect(controls).toMatch(/<SignUpShell text=\{signUpTip\} surface="header" explain="tooltip" align="end" deferText>/);
    // explain="tooltip": on a touch screen there is NO tooltip and no caption — nothing can take the tap.
    expect(read("src/app/globals.css")).toMatch(/\.su-wrap\[data-su-explain="tooltip"\] > \.su-tip \{\s*display: none;\s*\}/);
    // Still a plain /login link counted by the layout listener (not in the skip-/login test).
    expect(controls).toContain('data-signin-surface="header"');
    expect(controls).not.toContain("SignInLink");
    // A Class 8-12 page's header gets the school words.
    expect(controls).toContain("const signUpTip = signUpExplain(lang, signUpContextFor({ callback: callbackOfLoginHref(loginHref) }));");
    // Header.tsx types no label and gains no title attribute (twin English budget, tests/unit/header-nav.test.ts).
    expect(code("src/components/Header.tsx")).not.toMatch(/Sign up|Sign in free/);
  });

  it("the stacked header label keeps both halves on one word-wrap-free line each", () => {
    const stacked = render(ui.SignUpBrandLabel, { locale: "en", stack: true });
    expect(stacked).toBe(
      '<span class="flex flex-col items-center leading-[1.15] sm:flex-row sm:gap-1 sm:leading-normal"><span class="whitespace-nowrap">Sign up</span> <span class="whitespace-nowrap">with Google</span></span>',
    );
    expect(render(ui.SignUpBrandLabel, { locale: "hi" })).toBe("Google से साइन अप करें");
  });
});

// ── 6. behaviour and CSS ─────────────────────────────────────────────────

describe("6. the tooltip: hover AND keyboard focus, no layout shift, never over the button, Escape closes", () => {
  const css = read("src/app/globals.css");
  const hover = css.slice(css.indexOf("@media (hover: hover) and (pointer: fine) {"));
  const block = hover.slice(0, hover.indexOf("  .container-prose {"));

  it("touch / no hover (the default): a plain caption under the button, always visible, in the flow", () => {
    const base = css.slice(css.indexOf("  .su-wrap > .su-tip {"), css.indexOf("@media (hover: hover) and (pointer: fine) {"));
    expect(base).toMatch(/\.su-wrap > \.su-tip \{\s*display: block;/);
    expect(base).not.toMatch(/position: absolute|visibility|pointer-events/);
    expect(base).toMatch(/font-size: 12px;/);
    // AA on white and on saffron-50: ink-600 (#475569).
    expect(base).toContain('color: theme("colors.ink.600");');
    // Touch shows the SHORT caption; the full sentence is not displayed (it is still the button's description).
    expect(base).toMatch(/\.su-wrap > \.su-tip > \.su-tip-short \{\s*display: block;\s*\}/);
    expect(base).toMatch(/\.su-wrap > \.su-tip > \.su-tip-text \{\s*display: none;\s*\}/);
  });

  it("with a mouse: absolutely positioned (no layout shift), closed until hover or focus-within — CSS only", () => {
    expect(block).toMatch(/\.su-wrap > \.su-tip \{[^}]*position: absolute;[^}]*display: none;/);
    expect(block).toMatch(/\.su-wrap:hover > \.su-tip,\s*\.su-wrap:focus-within > \.su-tip \{\s*display: block;\s*\}/);
    // display:none while closed: it adds no scroll width and cannot intercept a click.
    expect(block).not.toMatch(/visibility: hidden|opacity: 0/);
    expect(css).toMatch(/\.su-wrap \{\s*position: relative;/);
    // With a mouse: the full sentence, and no caption.
    expect(block).toMatch(/\.su-wrap > \.su-tip > \.su-tip-short \{\s*display: none;\s*\}/);
    expect(block).toMatch(/\.su-wrap > \.su-tip > \.su-tip-text \{\s*display: block;/);
  });

  it("side=top with no room above drops below; the measure runs on hover and on focus", () => {
    const shell = code("src/components/SignUpButton.tsx");
    expect(shell).toContain('if (side === "top" && r.height > 0 && r.top < 8) setDrop(true);');
    expect(shell).toContain("data-su-side={drop ? undefined : side}");
    expect(shell).toMatch(/if \(!active\) \{\s*setClosed\(false\);\s*setDrop\(false\);\s*return;\s*\}/);
  });

  it("never covers the button: it starts at the button's bottom edge (or its top edge, above)", () => {
    expect(block).toMatch(/\.su-wrap > \.su-tip \{[^}]*top: 100%;[^}]*padding-top: 8px;/);
    expect(block).toMatch(/\.su-wrap\[data-su-side="top"\] > \.su-tip \{\s*top: auto;\s*bottom: 100%;/);
    expect(block).toMatch(/\.su-wrap\[data-su-align="end"\] > \.su-tip \{\s*right: 0;\s*left: auto;/);
    // Never wider than the screen.
    expect(block).toContain("max-width: min(20rem, calc(100vw - 2rem));");
  });

  it("Escape closes it until the pointer and the focus leave; the closed rule wins over hover", () => {
    expect(block.indexOf('.su-wrap[data-su-closed="true"] > .su-tip')).toBeGreaterThan(block.indexOf(".su-wrap:focus-within > .su-tip"));
    expect(block).toMatch(/\.su-wrap\[data-su-closed="true"\] > \.su-tip \{\s*display: none;\s*\}/);
    const shell = code("src/components/SignUpButton.tsx");
    expect(shell).toContain('if (e.key === "Escape") setClosed(true);');
    expect(shell).toContain('document.addEventListener("keydown", onKey);');
    expect(shell).toContain('return () => document.removeEventListener("keydown", onKey);');
    expect(shell).toContain('data-su-closed={closed ? "true" : undefined}');
    // Leaving re-arms it.
    expect(shell).toMatch(/if \(!active\) \{\s*setClosed\(false\);/);
    // A touch pointer never opens (or counts) anything.
    expect(shell).toContain('if (e.pointerType !== "mouse" || !canHover()) return;');
  });

  it("the tooltip text is readable: white on ink-900", () => {
    expect(block).toMatch(/\.su-tip-text \{[^}]*background-color: theme\("colors\.ink\.900"\);[^}]*color: #ffffff;/);
  });
});

// ── 7. Google's branding numbers ─────────────────────────────────────────

describe("7. Google's 'Sign in with Google' branding guidelines (read 2 Oct 2026), the light and dark themes", () => {
  const css = read("src/app/globals.css");
  const rule = css.slice(css.indexOf("  .su-google {"), css.indexOf("  .su-google-dark {"));
  const darkRule = css.slice(css.indexOf("  .su-google-dark {"), css.indexOf("  .su-google:hover {"));

  it("dark theme: fill #131314, stroke #8E918F (the same 1px), text #E3E3E3 — colours only, the same paddings, shape and G", () => {
    expect(darkRule).toMatch(/^  \.su-google-dark \{\s*border-color: #8e918f;\s*background-color: #131314;\s*color: #e3e3e3;\s*\}\s*$/);
    // After the light rule, so it wins at equal weight.
    expect(css.indexOf("  .su-google-dark {")).toBeGreaterThan(css.indexOf("  .su-google {"));
    expect(rule).not.toContain("#131314");
  });

  // Where the button is a block's main action beside or above an outlined
  // alternative it is the FILLED (dark) one — founder, 28 Sep 2026: the free
  // sign-in is the filled button and the quiz the outlined one.
  const DARK: [string, number][] = [
    ["src/app/exams/[code]/StartMockButton.tsx", 1],
    ["src/app/exams/[code]/TryOneQuestion.tsx", 1],
    ["src/app/exams/[code]/pyq/[year]/page.tsx", 2],
    ["src/app/exams/[code]/build-mock/BuilderForm.tsx", 1],
    ["src/components/AnonQuizPlayer.tsx", 1],
    ["src/app/c/[token]/ChallengeLanding.tsx", 1],
    ["src/app/for/[persona]/page.tsx", 1],
    ["src/app/coach/page.tsx", 1],
    ["src/app/revision/page.tsx", 1],
    ["src/app/join/[inviteCode]/page.tsx", 1],
    ["src/app/login/page.tsx", 1], // GoogleSignInButton
    ["src/components/GuestQuizGate.tsx", 1], // GoogleSignInButton: the mock gate and both gate quiz-ends
  ];
  // Inside our own tinted cards the light button stays (and the saffron bar is not a Google button).
  const LIGHT = ["src/components/SignupPitch.tsx", "src/components/SignupInline.tsx", "src/components/school/SchoolStudentEntry.tsx", "src/app/chat/ChatInterface.tsx", "src/app/find-your-exam/SaveMatchesNudge.tsx", "src/components/SignupNudge.tsx"];

  it("the filled doors wear the dark theme; the tinted cards the light one", () => {
    const tags = (file: string) => code(file).match(/<(?:SignUpButton|GoogleSignInButton)\b[\s\S]*?\/>/g) ?? [];
    for (const [file, n] of DARK) {
      const t = tags(file);
      expect(t, file).toHaveLength(n);
      for (const tag of t) expect(tag, file).toContain('theme="dark"');
    }
    for (const file of LIGHT) {
      const t = tags(file);
      expect(t.length, file).toBeGreaterThan(0);
      for (const tag of t) expect(tag, file).not.toContain("theme=");
    }
    // The hub's quiz button beside it is still the outlined one.
    const hub = code("src/app/exams/[code]/page.tsx");
    const at = hub.indexOf("<HubSignInLink");
    expect(hub.slice(at, at + 900)).toContain("border-2 border-saffron-500 bg-white");
  });

  it("fill #FFFFFF, stroke #747775 1px, text #1F1F1F", () => {
    expect(rule).toContain("background-color: #ffffff;");
    expect(rule).toContain("border: 1px solid #747775;");
    expect(rule).toContain("color: #1f1f1f;");
  });
  it("accepted deviations are written down where the next reader looks: the flat G and the font fallback", () => {
    const btn = read("src/components/SignUpButton.tsx");
    expect(btn).toContain("signin-assets.zip");
    expect(btn).toMatch(/gradient super G/);
    expect(css).toContain("ACCEPTED DEVIATION (2 Oct 2026 review): the guidelines ask for");
  });

  it("Medium 14px / 20px, Google Sans first, Roboto next, no web font downloaded", () => {
    expect(rule).toContain("font-size: 14px;");
    expect(rule).toContain("line-height: 20px;");
    expect(rule).toContain("font-weight: 500;");
    expect(rule).toMatch(/font-family: "Google Sans", Roboto, /);
    expect(css).not.toMatch(/@font-face[^}]*Google Sans/);
    expect(read("src/app/layout.tsx")).not.toMatch(/Google_Sans|Google\+Sans/);
  });
  it("12px before the G, 10px between the G and the text, 12px after the text; pill; a 20px G that cannot stretch", () => {
    expect(rule).toContain("padding: 0 12px;");
    expect(rule).toContain("gap: 10px;");
    expect(rule).toContain("border-radius: 9999px;");
    expect(css).toMatch(/\.su-google-g \{\s*display: block;\s*width: 20px;\s*height: 20px;\s*flex: none;\s*\}/);
  });
  it("keeps the 44px touch target and a visible keyboard focus ring", () => {
    expect(rule).toContain("min-height: 44px;");
    expect(css).toMatch(/\.su-google:focus-visible \{\s*outline: 2px solid theme\("colors\.saffron\.600"\);/);
  });
  it("the hover state never recolours the button (no saffron, no coloured fill)", () => {
    const hoverRule = css.slice(css.indexOf("  .su-google:hover {"), css.indexOf("  .su-google:focus-visible {"));
    expect(hoverRule).not.toMatch(/background|color:/);
  });
});

// ── 8. never under 13 ────────────────────────────────────────────────────

describe("8. never on a Class 1-7 page or in an under-13 context", () => {
  const CHILD = ["/schooling/cbse/class-1", "/schooling/cbse/class-5/maths", "/schooling/tn-state-board/class-7/science/chapter-1"];

  it("the header renders no button there; the card, the early line and the bar are off", () => {
    for (const p of CHILD) {
      expect(isUnder13SchoolPath(p), p).toBe(true);
      expect(pitchAllowedPath(p), p).toBe(false);
      expect(contentFamily(p), p).toBeNull();
    }
    const controls = code("src/components/HeaderAuthControls.tsx");
    expect(controls).toMatch(/\) : childSafe \|\| isUnder13SchoolPath\(pathname\) \? null : isChildSchoolPath\(pathname\) \? \(/);
    expect(code("src/components/SignupPitch.tsx")).toContain("if (!pitchAllowedPath(pathname)) return;");
    expect(code("src/components/SignupInline.tsx")).toContain("if (!pitchAllowedPath(location.pathname)) return;");
    // /schooling and a board hub (they list every class) stay off too.
    for (const p of ["/schooling", "/schooling/cbse"]) expect(isChildSchoolPath(p), p).toBe(true);
  });

  it("no school page file mounts the early line; the school island's button is the Class 8-12 save line only", () => {
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".tsx") ? [path.join(d, e.name)] : []));
    for (const f of walk(path.join(ROOT, "src/app/schooling"))) {
      const src = fs.readFileSync(f, "utf8");
      expect(src, f).not.toContain("<SignupInline");
      expect(src, f).not.toContain("<SignUpButton");
    }
    const island = code("src/components/school/SchoolStudentEntry.tsx");
    expect(island.match(/<SignUpButton/g)).toHaveLength(1);
    // Inside the save slot, which renders only for a known guest on a chapter with practice …
    const save = island.slice(island.indexOf('if (slot === "save") {'), island.indexOf("const tutorHref ="));
    expect(save).toContain("<SignUpButton");
    expect(save).toContain("if (!(signedIn === false && schoolChapterMockCount(p.validatedQuestions ?? 0) !== null)) return null;");
    // … and the island renders nothing at all below Class 8.
    expect(island.indexOf('if (view.kind === "none") return null;')).toBeLessThan(island.indexOf('if (slot === "save") {'));
  });

  it("/schooling and a board hub (a child may be reading): the header button is the plain link — no tooltip, no beacon", () => {
    const controls = code("src/components/HeaderAuthControls.tsx");
    expect(controls).toContain('import { isChildSchoolPath } from "@/lib/signup-pitch";');
    const plain = controls.slice(controls.indexOf("isChildSchoolPath(pathname) ? ("), controls.indexOf("<SignUpShell"));
    expect(plain).toContain('<Link rel="nofollow" href={loginHref} className={GUEST_BUTTON_CLASS} data-signin-surface="header">');
    expect(plain).not.toMatch(/aria-describedby|SignUpShell|signUpTip/);
    // One shell in the file, after that branch — reached only on a page that is not a child school page.
    expect(controls.match(/<SignUpShell /g)).toHaveLength(1);
    // The beacon rule says the same, whoever calls it.
    for (const p of ["/schooling", "/schooling/", "/schooling/cbse", "/schooling/tn-state-board?x=1"]) {
      expect(isChildSchoolPath(p), p).toBe(true);
      expect(explainBeaconDue(p, null), p).toBe(false);
    }
    // childSchoolPathForExplain is isChildSchoolPath written out (the copy module imports the class rules only).
    for (const p of ["/", "/schooling", "/schooling/", "/schooling/cbse", "/schooling/cbse/", "/schooling/cbse/class-1", "/schooling/cbse/class-7/maths", "/schooling/cbse/class-8", "/schooling/cbse/class-10/science/light", "/schooling/streams", "/schooling/streams/science-pcm", "/exams/SSC_CGL", "/ask", "/schooling?x=1", "/schooling/cbse#top", null, undefined]) {
      expect(childSchoolPathForExplain(p), String(p)).toBe(isChildSchoolPath(p));
    }
  });

  it("/ask: a Class 1-7 question gets the child-safe header (no sign-up button); no early line on the page at all", () => {
    const ask = code("src/app/ask/page.tsx");
    expect(ask).toContain('<Header childSafe={r.schoolScope === "class1to7"} />');
    expect(ask).not.toContain("SignupInline");
    // Header hands childSafe down; the controls then render no guest button.
    expect(code("src/components/Header.tsx")).toContain("<HeaderAuthControls locale={DEFAULT_LOCALE} labels={RAIL_LABELS} childSafe={childSafe} />");
    const controls = code("src/components/HeaderAuthControls.tsx");
    expect(controls).toMatch(/childSafe = false,\s*\}: \{/);
    expect(controls).toMatch(/\) : childSafe \|\| isUnder13SchoolPath\(pathname\) \? null : /);
  });

  it("life-stage and stream pages: the line is off wherever children may be reading", () => {
    expect(code("src/components/paths/StageHubView.tsx")).toContain('{!model.stage.mayIncludeChildren && <SignupInline surface="stage-hub" revealOffscreen />}');
    expect(code("src/components/paths/StreamOptionView.tsx")).toContain('{stage && !stage.mayIncludeChildren && <SignupInline surface="stream-option" revealOffscreen />}');
    // /career-map (Class 1-8 rows) and the school chats get no new button.
    expect(read("src/app/career-map/page.tsx")).not.toMatch(/SignupInline|SignUpButton/);
    const chat = code("src/app/chat/ChatInterface.tsx");
    const card = chat.slice(chat.lastIndexOf("{guestSignInHref && !school && !under13", chat.indexOf("<SignUpButton")), chat.indexOf("<SignUpButton"));
    expect(card).toContain("{guestSignInHref && !school && !under13 && !busy &&");
  });

  it("the 'explanation opened' beacon never fires on a Class 1-7 path, and once per page view elsewhere", () => {
    for (const p of CHILD) expect(explainBeaconDue(p, null), p).toBe(false);
    expect(explainBeaconDue("/exams/SSC_CGL", null)).toBe(true);
    expect(explainBeaconDue("/exams/SSC_CGL", "/exams/SSC_CGL")).toBe(false);
    expect(explainBeaconDue("/exams/SSC_CGL/syllabus", "/exams/SSC_CGL")).toBe(true);
    expect(explainBeaconDue("/schooling/cbse/class-9", null)).toBe(true);
    // /schooling and a board hub list every class: never there either (2 Oct 2026 review).
    expect(explainBeaconDue("/schooling", null)).toBe(false);
    expect(explainBeaconDue("/schooling/cbse", null)).toBe(false);
    for (const bad of [null, undefined, "", "exams"]) expect(explainBeaconDue(bad as string | null, null)).toBe(false);
  });
});

// ── 9. measuring ─────────────────────────────────────────────────────────

describe("9. measuring: the click is unchanged; new doors and new mounts have their own names", () => {
  it("the click beacon and every existing door id are as they were", () => {
    expect(SIGNIN_CTA).toBe("signin-click");
    for (const s of ["header", "hub-box", "hub-try-one", "hub-start-401", "subject-test-401", "topic-quiz-401", "custom-mock-401", "pyq-year", "quiz-end", "build-mock-form", "signup-pitch", "signup-inline", "signup-nudge", "mock-gate", "mock-gate-quiz-end", "build-gate-quiz-end", "home-signin", "link"]) {
      expect(isSigninSurface(s), s).toBe(true);
    }
    // Still in their original order at the head of the list (the 7-day reads key on them).
    expect(SIGNIN_SURFACES.slice(0, 2)).toEqual(["header", "hub-box"]);
    expect(SIGNIN_SURFACES[SIGNIN_SURFACES.length - 1]).toBe("link");
    expect(new Set(SIGNIN_SURFACES).size).toBe(SIGNIN_SURFACES.length);
  });

  it("eight doors that were plain links have their own ids now — and stay out of the skip-/login test", () => {
    for (const s of ["school-save", "chat-save", "challenge-end", "persona-card", "coach-start", "revision-start", "batch-join", "finder-save"]) {
      expect(isSigninSurface(s), s).toBe(true);
      expect(s).toMatch(/^[a-z0-9-]{1,32}$/);
      expect(inDirectSigninTest(s), s).toBe(false);
    }
  });

  it("the skip-/login test is exactly as it was: same key, same eight buttons, same two arms", () => {
    expect(DIRECT_SIGNIN_TEST_ON).toBe(true);
    expect(DIRECT_SIGNIN_AB_KEY).toBe("shishya_direct_signin_ab_v1");
    expect([...DIRECT_SIGNIN_SURFACES].sort()).toEqual(["build-mock-form", "hub-box", "hub-try-one", "pyq-year", "quiz-end", "signup-inline", "signup-nudge", "signup-pitch"]);
    expect(signinRoute({ bucket: "direct", inApp: null })).toBe("google");
    expect(signinRoute({ bucket: "login", inApp: null })).toBe("login");
    expect(signinRoute({ bucket: "direct", inApp: "instagram" })).toBe("login");
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect(readOrAssignDirectBucket(storage, () => 0.1)).toBe("direct");
    expect(readOrAssignDirectBucket(storage, () => 0.9)).toBe("direct"); // kept
    // The shared link still decides: the click handler, the beacon and the hand-off are untouched.
    const link = code("src/components/SignInLink.tsx");
    expect(link).toContain("const bucket = !hinted && inDirectSigninTest(surface) ? readOrAssignDirectBucket(storage) : null;");
    expect(link).toContain("signinBeacon(surface, {");
    expect(link).toContain('if (via !== "google") return;');
    expect(link).toContain("aria-describedby={describedBy}");
    // Both arms render the same button: nothing in the button reads the bucket.
    expect(code("src/components/SignUpButton.tsx")).not.toMatch(/bucket|DIRECT_SIGNIN|localStorage/);
  });

  it("one light 'explanation opened' beacon: hover that rests, or keyboard focus — once per page view", () => {
    expect(SIGNUP_EXPLAIN_CTA).toBe("signup-explain");
    expect(SIGNUP_EXPLAIN_HOVER_MS).toBeGreaterThanOrEqual(400);
    const shell = code("src/components/SignUpButton.tsx");
    expect(shell).toContain("if (!explainBeaconDue(path, explainSentPath)) return;");
    expect(shell).toContain("ctaBeacon(SIGNUP_EXPLAIN_CTA, { surface, via });");
    expect(shell).toContain('hoverTimer.current = window.setTimeout(() => explainOpened(surface, "hover"), SIGNUP_EXPLAIN_HOVER_MS);');
    expect(shell).toContain('if (keyboard) explainOpened(surface, "focus");');
    // Only one beacon call in the component, and it stores nothing.
    expect(shell.match(/ctaBeacon\(/g)).toHaveLength(1);
    expect(shell).not.toMatch(/sessionStorage|document\.cookie/);
  });

  // Every NEW mount of the early line (2 Oct 2026) and its placement id.
  const MOUNTS: [string, string][] = [
    ["src/components/paths/StageHubView.tsx", "stage-hub"],
    ["src/components/paths/StreamOptionView.tsx", "stream-option"],
    ["src/app/exams/after/[level]/page.tsx", "exams-after"],
    ["src/app/exams/browse/page.tsx", "exams-browse"],
    ["src/app/exams/category/[slug]/page.tsx", "exams-category"],
    ["src/app/exams/entrance/page.tsx", "exams-entrance"],
    ["src/app/exams/state/[slug]/page.tsx", "exams-state"],
    ["src/app/exams/[code]/checklist/page.tsx", "exam-checklist"],
    ["src/app/colleges/page.tsx", "colleges-index"],
    ["src/app/colleges/state/[slug]/page.tsx", "colleges-state"],
    ["src/app/colleges/stream/[stream]/page.tsx", "colleges-stream"],
    ["src/app/colleges/cutoffs/page.tsx", "colleges-cutoffs"],
    ["src/app/colleges/placements/page.tsx", "colleges-placements"],
    ["src/app/colleges/iti-diploma/page.tsx", "colleges-iti-diploma"],
    ["src/app/colleges/[slug]/[branch]/page.tsx", "college-branch"],
    ["src/app/scholarships/page.tsx", "scholarships-index"],
    ["src/app/scholarships/for/[filter]/page.tsx", "scholarships-for"],
    ["src/app/careers/page.tsx", "careers-index"],
    ["src/app/current-affairs/page.tsx", "ca-index"],
    ["src/app/jobs/page.tsx", "jobs-index"],
  ];

  // Mounted on 2 Oct 2026 and removed the same day (review): each stood right
  // above the root layout's sign-up card — two invitations on one phone screen.
  const UNMOUNTED = ["src/app/ask/page.tsx", "src/app/exams/[code]/archive/page.tsx", "src/app/exams/state/page.tsx", "src/app/scholarships/closing-soon/page.tsx"];

  /** The page's JSX after the mount, up to the end of <main> (comments removed). */
  const afterMount = (file: string) => {
    const src = code(file);
    const from = src.indexOf("<SignupInline");
    const rest = src.slice(src.indexOf("/>", from) + 2);
    const end = rest.indexOf("</main>");
    return end === -1 ? rest : rest.slice(0, end);
  };
  /** Block-level JSX (a section, a list, a card, a component) — a paragraph of links does not count. */
  const BLOCK = /<(?:section|nav|div|ul|ol|table|dl|h2|h3|(?!Link\b|Fragment\b)[A-Z][A-Za-z]*)\b/g;

  it("at most one in-content invitation per screen: no early line is the last block before the page's end (where the site card follows)", () => {
    expect(new Set(MOUNTS.map(([f]) => f)).size).toBe(20);
    for (const [file] of MOUNTS) expect((afterMount(file).match(BLOCK) ?? []).length, file).toBeGreaterThanOrEqual(1);
    for (const file of UNMOUNTED) {
      expect(read(file), file).not.toMatch(/<SignupInline|components\/SignupInline/);
      expect(MOUNTS.map(([f]) => f)).not.toContain(file);
    }
    // The rule would have caught the three it removed: a line of links is all that followed them.
    expect("<p><Link href=\"/x\">Back</Link></p></section>".match(BLOCK)).toBeNull();
  });

  it("on the list pages the line sits EARLY — after the intro or the first group, never after the whole list", () => {
    const before = (file: string, marker: string) => {
      const src = code(file);
      expect(src.indexOf(marker), `${file}: ${marker}`).toBeGreaterThan(-1);
      expect(src.indexOf("<SignupInline"), file).toBeLessThan(src.indexOf(marker));
    };
    // Before the list itself.
    before("src/app/scholarships/page.tsx", "<ScholarshipBrowser");
    before("src/app/colleges/page.tsx", "<CollegeFinderFromQuery");
    // Under the first group only.
    expect(code("src/app/careers/page.tsx")).toContain('{firstShown && <SignupInline surface="careers-index" revealOffscreen />}');
    expect(code("src/app/careers/page.tsx")).toContain("const firstShown = cat.slug === CAREER_CATEGORIES.find((x) => careersByCategory(x.slug).length > 0)?.slug;");
    expect(code("src/app/exams/browse/page.tsx")).toContain('{si === 0 && <SignupInline surface="exams-browse" revealOffscreen />}');
    expect(code("src/app/exams/entrance/page.tsx")).toContain('{gi === 0 && <SignupInline surface="exams-entrance" revealOffscreen />}');
    // A flat list: rendered in two parts, the line after the first.
    const stream = code("src/app/colleges/stream/[stream]/page.tsx");
    expect(stream).toContain("[filtered.slice(0, EARLY_ROWS), filtered.slice(EARLY_ROWS)].map(");
    expect(stream).toContain('{pi === 0 && <SignupInline surface="colleges-stream" revealOffscreen />}');
    expect(stream).toContain("part.length > 0 && (");
    expect(stream).toContain('<ol className={pi === 0 ? "mt-8 space-y-3" : "mt-3 space-y-3"}>');
    const ca = code("src/app/current-affairs/page.tsx");
    expect(ca).toContain("[latestItems.slice(0, 4), latestItems.slice(4, 10)].map(");
    expect(ca).toContain('{pi === 0 && <SignupInline surface="ca-index" revealOffscreen />}');
    // Every one of them keeps revealOffscreen: it appears only where nothing on screen moves.
    for (const [file] of MOUNTS) expect(code(file).match(/<SignupInline\b[^>]*\/>/)?.[0], file).toContain("revealOffscreen");
  });

  it("every new mount has its own placement id, one line per page, never before the content", () => {
    const ids = MOUNTS.map(([, id]) => id);
    expect(new Set(ids).size).toBe(ids.length);
    const existing = ["exam-syllabus", "exam-updates", "exam-cutoff", "career", "scholarship", "news", "college", "jobs-map", "ca-daily", "ca-capsule", "exam-calendar", "guide", "tricks", "topic"];
    for (const id of ids) {
      expect(id).toMatch(/^[a-z0-9-]{1,32}$/);
      expect(existing, id).not.toContain(id);
    }
    for (const [file, id] of MOUNTS) {
      const src = code(file);
      expect(src, file).toContain('import { SignupInline } from "@/components/SignupInline";');
      const tags = src.match(/<SignupInline\b[^>]*\/>/g) ?? [];
      expect(tags, file).toHaveLength(1);
      expect(tags[0], file).toContain(`surface="${id}"`);
      // No exam name on these mounts: the general line (no practice read on the page).
      expect(tags[0], file).not.toMatch(/\sexam=/);
      // After the page's h1 — never above the content.
      expect(src.indexOf("<SignupInline"), file).toBeGreaterThan(src.indexOf("<h1"));
    }
  });

  it("the new mounts' pages may show the offer (the path rule allows them) and none is a child school page", () => {
    for (const p of ["/after-10th", "/after-12th", "/schooling/streams/science-pcm", "/exams/after/12th", "/exams/browse", "/exams/category/banking", "/exams/entrance", "/exams/state", "/exams/state/telangana", "/exams/SSC_CGL/archive", "/exams/SSC_CGL/checklist", "/colleges", "/colleges/state/karnataka", "/colleges/stream/engineering", "/colleges/cutoffs", "/colleges/placements", "/colleges/iti-diploma", "/colleges/iit-bombay/cse", "/scholarships", "/scholarships/closing-soon", "/scholarships/for/girls", "/careers", "/current-affairs", "/jobs", "/ask"]) {
      expect(pitchAllowedPath(p), p).toBe(true);
      expect(isChildSchoolPath(p), p).toBe(false);
      expect(isUnder13SchoolPath(p), p).toBe(false);
    }
  });

  it("the early line's click is still surface 'signup-inline' with the page's placement", () => {
    const inline = code("src/components/SignupInline.tsx");
    expect(inline).toMatch(/surface="signup-inline"[\s\S]{0,400}beaconProps=\{\{ placement: surface \}\}/);
    expect(inline).toContain('ctaBeacon("signup-inline", { action: "seen", surface: "signup-inline", placement: surface });');
  });
});

// ── 10. /login names an exam only when it is a real, active one ───────────

describe("10. /login: the exam is named only when the catalogue has it (review blocker, 2 Oct 2026)", () => {
  const login = code("src/app/login/page.tsx");

  it("the name and the code come from the cached catalogue of active, non-school exams — never from the URL alone", () => {
    expect(login).toContain("const catalog: Awaited<ReturnType<typeof getExamCatalog>> = await getExamCatalog().catch(() => []);");
    expect(login).toContain("const signUpExam = examCode ? catalog.find((e) => e.code === examCode) ?? null : null;");
    const tag = login.match(/<GoogleSignInButton\b[\s\S]*?\/>/)?.[0] ?? "";
    expect(tag).toContain("exam={signUpExam?.shortName ?? null}");
    expect(tag).toContain("examCode={signUpExam ? examCode : null}");
    // The URL's own code (underscores → spaces) never reaches the button.
    expect(tag).not.toContain("examLabel");
    expect(tag).not.toMatch(/examCode=\{examCode\}/);
    // The catalogue is the rows sign-up can enrol: active, not a school container.
    expect(read("src/lib/db/exam-cache.ts")).toMatch(/export const getExamCatalog = unstable_cache\(\s*async \(\) => \{\s*const exams = await prisma\.exam\.findMany\(\{\s*where: REAL_EXAM_WHERE,/);
    expect(read("src/lib/db/exam-scope.ts")).toMatch(/export const REAL_EXAM_WHERE = \{\s*active: true,\s*category: \{ not: SCHOOL_CATEGORY \},/);
    // … and sign-up enrols an active exam only.
    expect(read("src/lib/signup-profile.ts")).toContain("return exam && exam.active ? exam : null;");
  });

  it("an unknown code (a typed link, a retired exam's 404 page) gets the general sentence; a known one names the exam", () => {
    // What the page passes for /login?callbackUrl=/exams/FOO: no name, no code.
    const unknown = render(googleBtn.GoogleSignInButton, { callbackUrl: "/exams/FOO", locale: "en", continueLabel: "Continue with Google", exam: null, examCode: null });
    expect(textOf(unknown)).toContain(signUpExplain("en", { kind: "general" }));
    expect(textOf(unknown)).not.toMatch(/FOO|is set up/);
    const known = render(googleBtn.GoogleSignInButton, { callbackUrl: "/exams/SSC_CGL", locale: "en", continueLabel: "Continue with Google", exam: "SSC CGL", examCode: "SSC_CGL" });
    expect(textOf(known)).toContain("SSC CGL is set up as your exam the moment you sign up");
  });

  it("/login wears the filled (dark) button and opens its tooltip above — 'Try 5 questions first' sits under it", () => {
    const tag = login.match(/<GoogleSignInButton\b[\s\S]*?\/>/)?.[0] ?? "";
    expect(tag).toContain('side="top"');
    expect(tag).toContain('theme="dark"');
    expect(login.indexOf("<GoogleSignInButton")).toBeLessThan(login.indexOf('t("login.tryFirst")'));
  });
});

// ── 11. the tooltip never covers the next action ──────────────────────────

describe("11. a button with another action under it opens its tooltip ABOVE (review, 2 Oct 2026)", () => {
  const walk = (d: string): string[] =>
    fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".tsx") ? [path.join(d, e.name)] : []));
  const FILES = [...walk(path.join(ROOT, "src/app")), ...walk(path.join(ROOT, "src/components"))].map((f) => path.relative(ROOT, f).replace(/\\/g, "/"));
  // Wrappers that set side themselves: the tag at the call site has no side prop.
  const WRAPPER: Record<string, string> = { HubSignInLink: "src/app/exams/[code]/StartMockButton.tsx", GateSignInButton: "src/components/GuestQuizGate.tsx" };

  /** What follows a tag once closers and "{cond && (" are skipped. */
  const next = (rest: string) => {
    let r = rest;
    for (;;) {
      const was = r;
      r = r.replace(/^\s+/, "").replace(/^\)\}/, "").replace(/^\)/, "").replace(/^\{[^{}<>]*&&\s*\(?/, "");
      if (r === was) return r;
    }
  };

  const found: { file: string; name: string; tag: string }[] = [];
  for (const file of FILES) {
    if (file === "src/components/SignUpButton.tsx") continue;
    const src = code(file);
    for (const m of src.matchAll(/<(SignUpButton|GoogleSignInButton|HubSignInLink|GateSignInButton)\b[\s\S]*?\/>/g)) {
      if (/^<(?:Link|a|button)\b/.test(next(src.slice((m.index ?? 0) + m[0].length)))) found.push({ file, name: m[1], tag: m[0] });
    }
  }

  it("finds the buttons that have a link or a button right after them", () => {
    expect([...new Set(found.map((f) => f.file))].sort()).toEqual(
      [
        "src/app/c/[token]/ChallengeLanding.tsx",
        "src/app/exams/[code]/TryOneQuestion.tsx",
        "src/app/exams/[code]/page.tsx",
        "src/app/exams/[code]/pyq/[year]/page.tsx",
        "src/app/for/[persona]/page.tsx",
        "src/app/login/page.tsx",
        "src/components/AnonQuizPlayer.tsx",
        "src/components/SignupNudge.tsx",
      ].sort(),
    );
    expect(found.filter((f) => f.file === "src/app/exams/[code]/pyq/[year]/page.tsx")).toHaveLength(2);
  });

  it("every one of them carries side=\"top\" (a wrapper: in the wrapper)", () => {
    for (const f of found) {
      if (f.name in WRAPPER) {
        const inner = code(WRAPPER[f.name]).match(/<(?:SignUpButton|GoogleSignInButton)\b[\s\S]*?\/>/g) ?? [];
        expect(inner.length, f.name).toBeGreaterThan(0);
        for (const tag of inner) expect(tag, f.name).toContain('side="top"');
      } else {
        expect(f.tag, f.file).toContain('side="top"');
      }
    }
  });

  it("the tutor's save card (the last thing in a scrolling pane) and both gates open above too", () => {
    expect(code("src/app/chat/ChatInterface.tsx").match(/<SignUpButton\b[\s\S]*?\/>/)?.[0]).toContain('side="top"');
    expect(code("src/components/GuestQuizGate.tsx").match(/<GoogleSignInButton\b[\s\S]*?\/>/)?.[0]).toContain('side="top"');
    // GoogleSignInButton hands side to the frame.
    expect(code("src/components/GoogleSignInButton.tsx")).toContain("<SignUpShell text={text} short={short} surface={surface} explain={mode} side={side} block className={className}>");
  });
});
