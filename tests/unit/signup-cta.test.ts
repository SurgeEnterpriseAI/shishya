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
//      Google's "G" on Google's own fills only, the caption on touch and none
//      where the tap must stay clear; the CSS that makes the tooltip open on
//      hover AND keyboard focus with no layout shift and never over the
//      button; Escape closes it;
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
// 2 Oct 2026 (evening — founder, with a screenshot of the white button: "sign
// up should show like this instead of the orange color one at the top and
// also the hover is hiding behind; check all the places") — also pinned:
//   • NO SAFFRON SIGN-UP BUTTON is left: the header's guest button and the
//     timed bar's are Google's light button with the "G" (rendered here);
//     the "brand" variant and its label component are gone from src/;
//   • THE TOP LAYER — with a mouse and the script running, the explanation
//     is a copy rendered into <body>, position: fixed, above every z-index
//     in src/, pointer-events: none, aria-hidden; the CSS tooltip is the
//     fallback before and without JavaScript and is switched off the moment
//     the script runs, so the two never show together;
//   • WHERE IT GOES — src/lib/signup-tip-place.ts as a pure function: under
//     or above the button, the other side when there is no room, 8 px inside
//     the window, never over the button (sections 12 and 13).
// 2 Oct 2026 (review of the evening build) — also pinned:
//   • the tooltip opens for KEYBOARD focus (:focus-visible) and a hovering
//     mouse or pen — not for the focus a mouse click leaves on the button;
//     a focus or pointer that left without an event (a disabled button)
//     closes it;
//   • it is placed again when an animation or transition ends and when the
//     page or the button changes size, and is not shown while the button is
//     cut off by a scrolling pane;
//   • the header's wordmark gives way only while the Telugu GUEST BUTTON is
//     on screen (<html data-hdr-guest>), never on <html lang> alone; the
//     header label follows the language control at once.
// 2 Oct 2026 (night — founder, with the same screenshot: "wherever the sign
// in or sign up … has to be replaced with Google sign up the way which I
// have showed … and everywhere try to say something why sign in will help
// them") — changed here, and pinned in full in
// tests/unit/signup-everywhere.test.ts:
//   • ONE LOOK: Google's light button everywhere. The dark theme (nine
//     placements, a few hours on 2 Oct) and the `theme` prop are gone;
//   • the short caption shows on EVERY device (it was touch only); a
//     placement with its own benefit line passes explain="own" and gets no
//     caption; explain="tooltip" is the header's and the timed bar's only;
//   • the alternative beside a sign-up button is quiet (a text link or a
//     1 px ink outline) — that, not a dark fill, keeps the sign-up the main
//     action.
// What no test here can see: pixels, and the tooltip RUNNING. No DOM test
// library is installed, so section 6 pins the tooltip's source text; only
// the placement function (section 12) and the static renders run real code.
// The 360 px header row and the tooltip on hover and on keyboard focus have
// to be looked at in a browser.
// Run: npx vitest run tests/unit/signup-cta.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as reactDom from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";

import * as copyMod from "@/lib/signup-cta-copy";
import * as claimsMod from "@/lib/signup-cta-claims";
import * as signinCtaMod from "@/lib/signin-cta";
import * as ctaBeaconMod from "@/lib/cta-beacon";
import * as sessionHintMod from "@/lib/session-hint";
import * as inAppMod from "@/lib/in-app-browser";
import * as directMod from "@/lib/direct-signin-ab";
import * as tipPlaceMod from "@/lib/signup-tip-place";
import * as i18nMod from "@/lib/i18n";
import * as studyDayCopyMod from "@/lib/study-day-copy";
import * as studentClassesMod from "@/lib/school/student-classes";
import * as uiLocaleCopyMod from "@/lib/ui-locale-copy";
import * as signupPitchMod from "@/lib/signup-pitch";
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
const { SIGNUP_TIP_GAP, SIGNUP_TIP_MARGIN, placeSignUpTip } = tipPlaceMod;

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

/** The path the header's usePathname() reports (set by the header tests). */
let headerPath = "/";

const STUBS: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  // The real react-dom: createPortal is imported by the button, and never
  // called in a static render (the top-layer copy mounts only while open).
  "react-dom": reactDom,
  "next/link": { __esModule: true, default: LinkStub },
  "next/navigation": { usePathname: () => headerPath },
  "@/lib/signup-tip-place": tipPlaceMod,
  // The header's own imports (HeaderAuthControls is rendered in section 14).
  "./LangSwitcher": { LangSwitcher: () => null },
  "./NotificationBell": { NotificationBell: () => null },
  "@/lib/i18n": i18nMod,
  "@/lib/study-day-copy": studyDayCopyMod,
  "@/lib/school/student-classes": studentClassesMod,
  "@/lib/ui-locale-copy": uiLocaleCopyMod,
  "@/lib/signup-pitch": signupPitchMod,
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
  SignUpFace: unknown;
  SignUpStackedFace: unknown;
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
      expect(src).toContain('import { SignUpShell, SignUpStackedFace } from "./SignUpButton";');
      // Both guest branches: the "G" and the label's two halves (one line from sm).
      expect(src.match(/<SignUpStackedFace locale=\{lang\} joinFromSm \/>/g)).toHaveLength(2);
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
    expect(src).toContain("className={`${googleButtonClass()} w-full`}");
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
    expect(read("src/lib/signup-cta-claims.ts").match(/^import .*$/gm)).toEqual(['import type { SignUpExplainVariant, SignUpReason } from "@/lib/signup-cta-copy";']);
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
    // After the link: the short caption (in the flow, on every device), then the frame that holds the full sentence
    // (the tooltip, and what a screen reader hears).
    const frame = hub.match(/<\/a><span class="su-cap">([^<]*)<\/span><span class="su-tip"><span id="[^"]+" role="tooltip" class="su-tip-text">([^<]*)<\/span><\/span><\/span>$/);
    expect(frame?.[1]).toBe(signUpExplainShort("en", { kind: "exam", exam: "SSC CGL", practice: true }));
    expect(frame?.[2]).toBe(signUpExplain("en", { kind: "exam", exam: "SSC CGL", practice: true }));
    // The short caption is plain text: no role, no id, nothing the button points at.
    expect(hub).toContain('<span class="su-cap">No forms. SSC CGL is set up as your exam.</span>');
    expect(hub).not.toContain("su-tip-short");
    // Title-less: a native title tooltip would double it and cannot be styled or dismissed.
    expect(hub).not.toMatch(/\stitle=/);
    // It follows the button in the DOM (reading order: button, then its description).
    expect(hub.indexOf("</a>")).toBeLessThan(hub.indexOf('role="tooltip"'));
  });

  it("in-page buttons default to tooltip + caption; the frame carries the mode", () => {
    expect(hub).toMatch(/^<span class="su-wrap" data-su-explain="both">/);
    const block = render(ui.SignUpButton, { href, surface: "quiz-end", block: true, className: "flex-1" });
    expect(block).toMatch(/^<span class="su-wrap su-block flex-1" data-su-explain="both">/);
    expect(block).toContain('class="su-google w-full"');
    const top = render(ui.SignUpButton, { href, surface: "signup-nudge", stack: true, explain: "tooltip", side: "top", align: "end" });
    expect(top).toMatch(/^<span class="su-wrap" data-su-explain="tooltip" data-su-side="top" data-su-align="end">/);
    // explain="tooltip": no caption element at all — only the full sentence, for the mouse and the screen reader.
    expect(top).not.toContain("su-cap");
    expect(top.match(/role="tooltip" class="su-tip-text"/g)).toHaveLength(1);
    // explain="own" (the placement has its own benefit line beside the button): no caption either, the same tooltip.
    const own = render(ui.SignUpButton, { href, surface: "signup-pitch", explain: "own" });
    expect(own).toMatch(/^<span class="su-wrap" data-su-explain="own">/);
    expect(own).not.toContain("su-cap");
    expect(own.match(/role="tooltip" class="su-tip-text"/g)).toHaveLength(1);
  });

  it("one look: Google's light button — a `theme` (the dark one, removed 2 Oct 2026) or a `variant` asked for changes nothing", () => {
    const asked = render(ui.SignUpButton, { href, surface: "hub-box", exam: "SSC CGL", examCode: "SSC_CGL", practice: true, theme: "dark", side: "top" } as never);
    const a = asked.slice(asked.indexOf("<a"), asked.indexOf("</a>"));
    expect(attr(a, "class")).toBe("su-google");
    expect(textOf(a)).toBe("Sign up with Google");
    for (const c of ["#EA4335", "#4285F4", "#FBBC05", "#34A853"]) expect(a).toContain(`fill="${c}"`);
    expect(asked).toMatch(/^<span class="su-wrap" data-su-explain="both" data-su-side="top">/);
    const block = render(ui.SignUpButton, { href, surface: "quiz-end", theme: "dark", block: true } as never);
    expect(block).toContain('class="su-google w-full"');
    expect(asked + block).not.toContain("su-google-dark");
    // There is no other form: an unknown `variant` (the saffron "brand" one, removed 2 Oct 2026) changes nothing.
    const stray = render(ui.SignUpButton, { href, surface: "signup-nudge", variant: "brand", buttonClassName: "x" } as never);
    expect(attr(stray.match(/<a\b[^>]*>/)?.[0] ?? "", "class")).toBe("su-google x");
    expect(stray).toContain("<svg");
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

  it("no saffron sign-up button is left: the narrow form (the timed bar) is Google's light button too — the G, then the label on two lines", () => {
    const bar = render(ui.SignUpButton, { href, surface: "signup-nudge", stack: true, explain: "tooltip", side: "top", align: "end", className: "shrink-0" });
    const a = bar.slice(bar.indexOf("<a"), bar.indexOf("</a>"));
    // Google's light button, compact below sm — no fill of ours, no dark theme.
    expect(attr(a, "class")).toBe("su-google su-google-compact");
    for (const c of ["#EA4335", "#4285F4", "#FBBC05", "#34A853"]) expect(a).toContain(`fill="${c}"`);
    // The full approved words, in order, each half on its own line; the G first.
    expect(textOf(a)).toBe("Sign up with Google");
    expect(a).toContain('<span class="flex flex-col items-start"><span class="whitespace-nowrap">Sign up</span> <span class="whitespace-nowrap">with Google</span></span>');
    expect(a.indexOf("<svg")).toBeLessThan(a.indexOf("Sign up"));
    expect(textOf(render(ui.SignUpButton, { href, surface: "signup-nudge", stack: true, locale: "te" }).split("</a>")[0])).toBe("Google తో సైన్ అప్ చేయండి");
    // And nowhere in the app is the G put on a saffron or brand-coloured element.
    for (const b of BUTTONS) {
      const src = code(b.file);
      expect(src, b.file).not.toContain("<GoogleG");
      for (const m of src.matchAll(/className="([^"]*su-google[^"]*)"/g)) expect(m[1], b.file).not.toMatch(/bg-(?!white)/);
      // No caller hands the button a fill, a text colour or a shape of its own.
      for (const m of src.matchAll(/buttonClassName="([^"]*)"/g)) expect(m[1], b.file).not.toMatch(/\bbg-|\btext-|\brounded|\bborder/);
    }
    const shared = code("src/components/SignUpButton.tsx");
    // The G is drawn in two places, both inside a Google-branded button: the one-line face and the two-line one.
    expect(shared.match(/<GoogleG \/>/g)).toHaveLength(2);
    expect(shared).toContain('const cls = `${googleButtonClass()}${stack ? " su-google-compact" : ""}${block ? " w-full" : ""}${buttonClassName ? ` ${buttonClassName}` : ""}`;');
    // One class, no argument: no caller can ask for another look.
    expect(shared).toMatch(/export function googleButtonClass\(\): string \{\s*return "su-google";\s*\}/);
    expect(shared).not.toMatch(/\btheme\b|su-google-dark/);
    // The label: the one module's words; a 22-language page's own "Continue with Google" for a language beyond en / hi / te.
    expect(shared).toContain("const label = continueLabel ? googleButtonLabel(locale, continueLabel) : signUpLabel(locale);");
    expect(shared).toContain("{stack ? <SignUpStackedFace locale={locale} /> : <SignUpFace label={label} />}");
    expect(shared).not.toContain("btn-primary");
    expect(shared).not.toMatch(/saffron/);
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
    // /login and the gates: the same light button (a `theme` asked for changes nothing), the tooltip above
    // (another action sits under the button).
    const above = render(googleBtn.GoogleSignInButton, { callbackUrl: "/exams/SSC_CGL", locale: "en", continueLabel: "Continue with Google", theme: "dark", side: "top" } as never);
    expect(attr(above.match(/<button\b[^>]*>/)?.[0] ?? "", "class")).toBe("su-google w-full");
    expect(above).toMatch(/^<span class="su-wrap su-block mt-6" data-su-explain="both" data-su-side="top">/);
    expect(code("src/components/GoogleSignInButton.tsx")).not.toMatch(/\btheme\b|su-google-dark/);
    // A returning member and a language beyond en / hi / te keep "Continue with Google".
    const back = render(googleBtn.GoogleSignInButton, { callbackUrl: "/me/report", locale: "en", continueLabel: "Continue with Google", returning: true });
    expect(textOf(back.slice(back.indexOf("<button"), back.indexOf("</button>")))).toBe("Continue with Google");
    const ta = render(googleBtn.GoogleSignInButton, { callbackUrl: "/dashboard", locale: "ta", continueLabel: "Google உடன் தொடரவும்" });
    expect(textOf(ta.slice(ta.indexOf("<button"), ta.indexOf("</button>")))).toBe("Google உடன் தொடரவும்");
    // A language the words do not exist in: NO caption (English small print under a Tamil button); the tooltip stays,
    // and the page's own heading and body, in that language, are the reason ("own").
    expect(ta).toMatch(/^<span class="su-wrap su-block mt-6" data-su-explain="own">/);
    expect(ta).not.toContain("su-cap");
    for (const l of ["hi", "te"]) expect(render(googleBtn.GoogleSignInButton, { callbackUrl: "/dashboard", locale: l, continueLabel: "x" })).toContain('<span class="su-cap">');
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
    // On a touch screen there is NO tooltip (the frame that holds the full sentence is never displayed there), and
    // explain="tooltip" renders no caption — nothing can take the tap.
    const css = read("src/app/globals.css");
    expect(css.slice(0, css.indexOf("@media (hover: hover) and (pointer: fine) {"))).toMatch(/\.su-wrap > \.su-tip \{\s*display: none;\s*\}/);
    // Still a plain /login link counted by the layout listener (not in the skip-/login test).
    expect(controls).toContain('data-signin-surface="header"');
    expect(controls).not.toContain("SignInLink");
    // A Class 8-12 page's header gets the school words.
    expect(controls).toContain("const signUpTip = signUpExplain(lang, signUpContextFor({ callback: callbackOfLoginHref(loginHref) }));");
    // Header.tsx types no label and gains no title attribute (twin English budget, tests/unit/header-nav.test.ts).
    expect(code("src/components/Header.tsx")).not.toMatch(/Sign up|Sign in free/);
  });

  it("the two-line face keeps both halves on one word-wrap-free line each, after the G; the header joins them from sm", () => {
    const header = render(ui.SignUpStackedFace, { locale: "en", joinFromSm: true });
    expect(header).toMatch(/^<svg class="su-google-g"[\s\S]*<\/svg><span class="flex flex-col items-start sm:flex-row sm:gap-1"><span class="whitespace-nowrap">Sign up<\/span> <span class="whitespace-nowrap">with Google<\/span><\/span>$/);
    const bar = render(ui.SignUpStackedFace, { locale: "hi" });
    expect(bar).toMatch(/<\/svg><span class="flex flex-col items-start"><span class="whitespace-nowrap">Google से<\/span> <span class="whitespace-nowrap">साइन अप करें<\/span><\/span>$/);
    // The words are the label, whole: a space joins the halves for a screen reader and a copy.
    for (const l of SIGNUP_LOCALES) expect(textOf(render(ui.SignUpStackedFace, { locale: l }))).toBe(signUpLabel(l));
    // The one-line face is unchanged.
    expect(render(ui.SignUpFace, { label: "Sign up with Google" })).toMatch(/<\/svg><span>Sign up with Google<\/span>$/);
  });
});

// ── 6. behaviour and CSS ─────────────────────────────────────────────────

describe("6. the tooltip: hover AND keyboard focus, no layout shift, never over the button, Escape closes", () => {
  const css = read("src/app/globals.css");
  const hover = css.slice(css.indexOf("@media (hover: hover) and (pointer: fine) {"));
  // The mouse-only rules: up to the top-layer copy's own rule.
  const block = hover.slice(0, hover.indexOf("  .su-float {"));
  const shell = code("src/components/SignUpButton.tsx");

  it("EVERY device: a plain caption under the button, always visible, in the flow; the full sentence is never displayed without a mouse", () => {
    const base = css.slice(css.indexOf("  .su-wrap > .su-cap {"), css.indexOf("@media (hover: hover) and (pointer: fine) {"));
    expect(base).toMatch(/^  \.su-wrap > \.su-cap \{\s*display: block;/);
    expect(base).not.toMatch(/position: absolute|visibility|pointer-events/);
    expect(base).toMatch(/font-size: 12px;/);
    // AA on white and on saffron-50: ink-600 (#475569).
    expect(base).toContain('color: theme("colors.ink.600");');
    // It wraps inside its frame (the frame is never wider than what it sits in) — no sideways scroll at 360 px.
    expect(base).toContain("white-space: normal;");
    expect(css).toMatch(/\.su-wrap \{\s*position: relative;\s*display: flex;\s*max-width: 100%;/);
    // Centred where the button is centred.
    expect(css).toMatch(/\.su-center \{\s*align-items: center;\s*text-align: center;\s*\}/);
    // Without a mouse the full sentence's frame is not displayed (it is still the button's description).
    expect(base).toMatch(/\.su-wrap > \.su-tip \{\s*display: none;\s*\}/);
    // 2 Oct 2026: the caption is NOT a touch-only thing any more — no rule inside the mouse query hides it.
    expect(hover.slice(0, hover.indexOf("  .su-float {")).replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/su-cap|su-tip-short/);
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("su-tip-short");
    // The shell renders it for explain "both" only, with the button (no wait for the script: nothing moves).
    expect(shell).toContain('{ready && short && explain === "both" && <span className="su-cap">{short}</span>}');
    // The top layer is a mouse-only thing: no rule outside the hover query reads data-su-float.
    expect(css.slice(0, css.indexOf("@media (hover: hover) and (pointer: fine) {")).replace(/\/\*[\s\S]*?\*\//g, "")).not.toContain("data-su-float");
  });

  it("the fallback (before and without JavaScript), with a mouse: absolutely positioned (no layout shift), closed until hover or focus-within — CSS only", () => {
    expect(block).toMatch(/\.su-wrap > \.su-tip \{[^}]*position: absolute;[^}]*display: none;/);
    expect(block).toMatch(/\.su-wrap:hover > \.su-tip,\s*\.su-wrap:focus-within > \.su-tip \{\s*display: block;\s*\}/);
    // display:none while closed: it adds no scroll width and cannot intercept a click.
    expect(block).not.toMatch(/visibility: hidden|opacity: 0/);
    expect(css).toMatch(/\.su-wrap \{\s*position: relative;/);
    // With a mouse: the full sentence as the tooltip (the caption stays in the flow above it).
    expect(block).toMatch(/\.su-wrap > \.su-tip > \.su-tip-text \{\s*display: block;/);
  });

  it("the fallback never covers the button: it starts at the frame's bottom edge — under the button and its caption — (or its top edge, above)", () => {
    expect(block).toMatch(/\.su-wrap > \.su-tip \{[^}]*top: 100%;[^}]*padding-top: 8px;/);
    expect(block).toMatch(/\.su-wrap\[data-su-side="top"\] > \.su-tip \{\s*top: auto;\s*bottom: 100%;/);
    expect(block).toMatch(/\.su-wrap\[data-su-align="end"\] > \.su-tip \{\s*right: 0;\s*left: auto;/);
    // Never wider than the screen.
    expect(block).toContain("max-width: min(20rem, calc(100vw - 2rem));");
    // The frame carries the caller's side and edge as they are (the script no longer rewrites them).
    expect(shell).toContain("data-su-side={side}");
    expect(shell).toContain("data-su-align={align}");
    expect(shell).not.toMatch(/setFlip|setDrop|data-su-closed/);
  });

  it("the two never show together: once the script runs the frame says so and the CSS tooltip is off", () => {
    // After mount only — the server HTML and the first client render carry no mark (no hydration mismatch).
    expect(shell).toContain("const [mounted, setMounted] = useState(false);");
    expect(shell).toMatch(/useEffect\(\(\) => \{\s*setMounted\(true\);/);
    expect(shell).toContain('data-su-float={mounted ? "on" : undefined}');
    // The rule comes AFTER the hover / focus rule and weighs the same, so it wins.
    const off = '.su-wrap[data-su-float="on"] > .su-tip';
    expect(block.indexOf(off)).toBeGreaterThan(block.indexOf(".su-wrap:focus-within > .su-tip"));
    expect(block).toMatch(/\.su-wrap\[data-su-float="on"\] > \.su-tip \{\s*display: none;\s*\}/);
    expect(block.slice(block.indexOf(off))).not.toMatch(/\.su-wrap[^{]*> \.su-tip \{\s*display: block;/);
    // And the top-layer copy exists only while that mark is on.
    expect(shell).toContain("{mounted && active && !closed && <SignUpTipFloat frame={frame} text={text} side={side} align={align} />}");
  });

  it("the top layer: a copy in <body>, position: fixed, never in the way of a click, hidden until placed", () => {
    // Rendered through a portal into <body>: no ancestor of the button can clip it or paint over it.
    expect(shell).toContain('import { createPortal } from "react-dom";');
    expect(shell).toMatch(/return createPortal\(\s*<span ref=\{tip\} className="su-float" aria-hidden="true">\s*\{text\}\s*<\/span>,\s*document\.body,\s*\);/);
    expect(shell.match(/createPortal\(/g)).toHaveLength(1);
    const float = css.slice(css.indexOf("  .su-float {"), css.indexOf("  .container-prose {"));
    expect(float).toMatch(/^  \.su-float \{\s*position: fixed;\s*top: 0;\s*left: 0;\s*z-index: 1000;\s*visibility: hidden;/);
    expect(float).toContain("pointer-events: none;");
    // 8 px free on each side of the window (its width without the scrollbar).
    expect(float).toContain("max-width: min(20rem, calc(100% - 16px));");
    expect(float).toContain("box-sizing: border-box;");
    // The same look as the CSS tooltip: white on ink-900, 12 px.
    expect(float).toMatch(/background-color: theme\("colors\.ink\.900"\);[^}]*color: #ffffff;/);
    expect(float).toContain("font-size: 12px;");
    // Not inside the hover query: the script decides when it exists.
    expect(css.indexOf("  .su-float {")).toBeGreaterThan(css.indexOf('.su-wrap[data-su-float="on"] > .su-tip'));
  });

  it("the top layer is placed from the button's box before paint, and again while anything scrolls or the window is resized", () => {
    expect(shell).toContain('import { placeSignUpTip } from "@/lib/signup-tip-place";');
    // The button itself (the link or <button>), not its frame; the window without its scrollbars.
    expect(shell).toContain('button: (wrap.querySelector("a, button") ?? wrap).getBoundingClientRect(),');
    expect(shell).toContain("viewport: { width: root.clientWidth, height: root.clientHeight },");
    expect(shell).toMatch(/useLayoutEffect\(\(\) => \{[\s\S]*?place\(\);/);
    expect(shell).toContain("el.style.top = `${p.top}px`;");
    expect(shell).toContain("el.style.left = `${p.left}px`;");
    expect(shell).toContain('el.style.visibility = p.hidden || cut ? "hidden" : "visible";');
    // Passive listeners (a scroll inside a pane too: capture), once a frame, removed when it closes.
    expect(shell).toContain('window.addEventListener("scroll", later, { passive: true, capture: true });');
    expect(shell).toContain('window.addEventListener("resize", later, { passive: true });');
    expect(shell).toContain('window.removeEventListener("scroll", later, { capture: true });');
    expect(shell).toContain('window.removeEventListener("resize", later);');
    expect(shell).toContain("if (!raf) raf = window.requestAnimationFrame(place);");
    expect(shell).toContain("if (raf) window.cancelAnimationFrame(raf);");
  });

  it("the button moves with no scroll (the timed bar slides up, content loads, the label changes language): placed again; cut off by a scrolling pane: not shown", () => {
    const float = shell.slice(shell.indexOf("function SignUpTipFloat("), shell.indexOf("export function SignUpShell("));
    // The end of any animation or transition on the page (the bar's 0.3 s slide), anywhere: capture.
    for (const ev of ["animationend", "transitionend"]) {
      expect(float).toContain(`window.addEventListener("${ev}", later, { passive: true, capture: true });`);
      expect(float).toContain(`window.removeEventListener("${ev}", later, { capture: true });`);
    }
    // The page or the button changes size: the same once-a-frame placing. Guarded: an old browser keeps scroll and resize.
    expect(float).toMatch(/if \(button && typeof ResizeObserver !== "undefined"\) \{\s*sizes = new ResizeObserver\(later\);\s*sizes\.observe\(document\.body\);\s*sizes\.observe\(button\);\s*\}/);
    // The button is inside the window but cut off by what it sits in (the tutor's message pane): the
    // browser's own answer, which takes every clipping ancestor into account — then hidden, like a button off screen.
    expect(float).toMatch(/if \(button && typeof IntersectionObserver !== "undefined"\) \{\s*seen = new IntersectionObserver\(\(entries\) => \{\s*const last = entries\[entries\.length - 1\];\s*if \(!last\) return;\s*cut = !last\.isIntersecting;\s*later\(\);\s*\}\);\s*seen\.observe\(button\);\s*\}/);
    expect(float).toContain("let cut = false;");
    // Both observers stop when it closes; a browser without them throws nothing.
    expect(float).toContain("sizes?.disconnect();");
    expect(float).toContain("seen?.disconnect();");
    expect(float.match(/new (?:ResizeObserver|IntersectionObserver)\(/g)).toHaveLength(2);
    // Placing writes styles, never React state: no render loop from an observer.
    expect(float).not.toMatch(/useState|set[A-Z]\w*\(/);
  });

  it("ONE description for a screen reader: the in-page element; the top-layer copy is aria-hidden and carries no role or id", () => {
    expect(shell.match(/role="tooltip"/g)).toHaveLength(1);
    expect(shell).toContain('<span id={tipId} role="tooltip" className="su-tip-text">');
    const portalAt = shell.indexOf("return createPortal(");
    const float = shell.slice(portalAt, shell.indexOf("document.body", portalAt));
    expect(float).toContain('aria-hidden="true"');
    expect(float).not.toMatch(/\brole=|\bid=/);
    // A static render (the server, the first client render) has no top-layer copy and no mark.
    const html = render(ui.SignUpButton, { href: loginHrefFor("/exams/SSC_CGL", "hub-box"), surface: "hub-box", side: "top" });
    expect(html).not.toMatch(/su-float|data-su-float/);
    expect(html.match(/role="tooltip"/g)).toHaveLength(1);
  });

  it("Escape closes it until the pointer and the focus leave; leaving the page closes it too", () => {
    expect(shell).toContain('if (e.key === "Escape") setClosed(true);');
    expect(shell).toContain('document.addEventListener("keydown", onKey);');
    expect(shell).toContain('document.removeEventListener("keydown", onKey);');
    // Leaving re-arms it.
    expect(shell).toMatch(/if \(!active\) \{\s*setClosed\(false\);\s*return;\s*\}/);
    // A tap on the button itself navigates away: closed, so the back button never finds it stuck open.
    expect(shell).toContain('window.addEventListener("pagehide", onHide);');
    expect(shell).toContain('window.removeEventListener("pagehide", onHide);');
    // A touch pointer never opens (or counts) anything; nor does a screen without a mouse.
    // A pen that hovers opens it (the CSS tooltip did); only a resting MOUSE is counted, as before.
    expect(shell).toMatch(/onPointerEnter=\{\(e\) => \{\s*if \(e\.pointerType === "touch" \|\| !canHover\(\)\) return;\s*setHovered\(true\);\s*if \(e\.pointerType !== "mouse"\) return;\s*if \(hoverTimer\.current !== null\) window\.clearTimeout\(hoverTimer\.current\);\s*hoverTimer\.current = window\.setTimeout\(\(\) => explainOpened\(surface, "hover"\), SIGNUP_EXPLAIN_HOVER_MS\);\s*\}\}/);
    expect(shell).not.toContain('e.pointerType !== "mouse" || !canHover()');
    expect(shell).toMatch(/if \(!el \|\| !canHover\(\)\) return;/);
  });

  it("KEYBOARD focus opens it, not the focus a mouse click leaves behind; a focus or pointer that left without telling the frame closes it", () => {
    // Chrome and Firefox focus a link or button on a mouse click: after a Ctrl-click the tooltip would stay with nobody on it.
    // :focus-visible is asked FIRST, and only it opens; a browser too old to know it opens on any focus and counts none.
    expect(shell).toMatch(
      /onFocus=\{\(e\) => \{\s*if \(!canHover\(\)\) return;\s*let keyboard = false;\s*let opens = true;\s*try \{\s*keyboard = \(e\.target as HTMLElement\)\.matches\(":focus-visible"\);\s*opens = keyboard;\s*\} catch \{\s*keyboard = false;\s*\}\s*if \(opens\) setFocused\(true\);\s*if \(keyboard\) explainOpened\(surface, "focus"\);\s*\}\}/,
    );
    // setFocused(true) is never unconditional any more.
    expect(shell).not.toMatch(/if \(!canHover\(\)\) return;\s*setFocused\(true\);/);
    expect(shell.match(/setFocused\(true\)/g)).toHaveLength(2);
    // The hand-over at mount asks the same question of the button (not "is the focus inside the frame").
    expect(shell).toMatch(/const button = el\.querySelector\("a, button"\);\s*if \(button\?\.matches\(":hover"\)\) setHovered\(true\);\s*if \(button\?\.matches\(":focus-visible"\)\) setFocused\(true\);/);
    expect(shell).not.toContain("el.contains(document.activeElement)) setFocused(true)");
    // /login's button turns disabled on its own click and a disabled button sends no blur: asked again when
    // the focus moves, a pointer goes down, or the pointer enters another element — only while it is open.
    expect(shell).toContain('if (!el.contains(document.activeElement) || (button instanceof HTMLButtonElement && button.disabled)) setFocused(false);');
    expect(shell).toContain('if (e.type === "pointerover" && !(e.target instanceof Node && el.contains(e.target))) setHovered(false);');
    const effect = shell.slice(shell.indexOf("const active = hovered || focused;"), shell.indexOf("}, [active]);"));
    for (const ev of ["focusin", "pointerdown", "pointerover"]) {
      expect(effect).toContain(`document.addEventListener("${ev}", onElsewhere, true);`);
      expect(effect).toContain(`document.removeEventListener("${ev}", onElsewhere, true);`);
    }
    // … and nothing is listened for while it is closed.
    expect(effect).toMatch(/if \(!active\) \{\s*setClosed\(false\);\s*return;\s*\}[\s\S]*document\.addEventListener\("focusin"/);
    // The beacon is as it was: a mouse resting 600 ms, or keyboard focus — never the mount hand-over, never the close.
    expect(shell.match(/explainOpened\(surface, "(?:hover|focus)"\)/g)).toEqual(['explainOpened(surface, "hover")', 'explainOpened(surface, "focus")']);
    expect(SIGNUP_EXPLAIN_HOVER_MS).toBe(600);
  });

  it("the tooltip text is readable: white on ink-900", () => {
    expect(block).toMatch(/\.su-tip-text \{[^}]*background-color: theme\("colors\.ink\.900"\);[^}]*color: #ffffff;/);
  });
});

// ── 7. Google's branding numbers ─────────────────────────────────────────

describe("7. Google's 'Sign in with Google' branding guidelines (read 2 Oct 2026): the light theme, the only one", () => {
  const css = read("src/app/globals.css");
  const rule = css.slice(css.indexOf("  .su-google {"), css.indexOf("  .su-google:hover {"));

  it("no dark theme is left: no rule, no class, no fill but white", () => {
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/su-google-dark|#131314|#8e918f|#e3e3e3/i);
    expect(rule).toMatch(/^  \.su-google \{[^}]*\}\s*$/);
    expect(rule).not.toContain("#131314");
  });

  // Until the evening of 2 Oct 2026 these wore Google's DARK button (the
  // "filled" one beside an outlined alternative). One look now: the light
  // button everywhere; the count of buttons in each file is unchanged.
  const WAS_DARK: [string, number][] = [
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
  // These were light all along (inside our own tinted cards, and the timed bar).
  const LIGHT = ["src/components/SignupPitch.tsx", "src/components/SignupInline.tsx", "src/components/school/SchoolStudentEntry.tsx", "src/app/chat/ChatInterface.tsx", "src/app/find-your-exam/SaveMatchesNudge.tsx", "src/components/SignupNudge.tsx"];

  it("every door wears the light button: no placement passes a theme", () => {
    const tags = (file: string) => code(file).match(/<(?:SignUpButton|GoogleSignInButton)\b[\s\S]*?\/>/g) ?? [];
    for (const [file, n] of WAS_DARK) {
      const t = tags(file);
      expect(t, file).toHaveLength(n);
      for (const tag of t) expect(tag, file).not.toContain("theme=");
    }
    for (const file of LIGHT) {
      const t = tags(file);
      expect(t.length, file).toBeGreaterThan(0);
      for (const tag of t) expect(tag, file).not.toContain("theme=");
    }
    // The hub's quiz button beside it: still a button, still second — a quiet 1 px ink outline now, so the white
    // sign-up button stays the main action (28 Sep: hub sign-ups fell from about 11 a day to 4 when it was not).
    const hub = code("src/app/exams/[code]/page.tsx");
    const at = hub.indexOf("<HubSignInLink");
    const beside = hub.slice(at, at + 900);
    expect(beside).toContain('className="inline-flex min-h-[44px] items-center justify-center rounded-md border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"');
    expect(beside).not.toMatch(/border-2|saffron/);
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
  it("the compact size (the header on a phone, the timed bar): below sm only, smaller text and paddings, an 18px G — the fill, stroke, colour and 44px height stay Google's", () => {
    const at = css.indexOf("  @media (max-width: 639.98px) {\n    .su-google-compact {");
    expect(at).toBeGreaterThan(-1);
    const compact = css.slice(at, css.indexOf("  @media (max-width: 439.98px) {"));
    expect(compact).toMatch(/\.su-google-compact \{\s*gap: 6px;\s*padding: 0 10px;\s*font-size: 12px;\s*line-height: 16px;\s*\}/);
    expect(compact).toMatch(/\.su-google-compact > \.su-google-g \{\s*width: 18px;\s*height: 18px;\s*\}/);
    // It changes sizes only: no fill, no stroke, no text colour, no height, no shape.
    expect(compact.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/background|border|(?<!-)color:|min-height|radius/);
    // After the standard G rule, so the 18 px wins at equal weight; two 16 px lines fit the 44 px button.
    expect(at).toBeGreaterThan(css.indexOf("  .su-google-g {"));
    // Written down as a deviation from Google's page.
    expect(css.slice(css.indexOf("  /* The COMPACT size"), at)).toContain("ACCEPTED DEVIATION");
    expect(read("src/components/SignUpButton.tsx")).toMatch(/3\. the compact, two-line form/);
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
    // The save card (door "chat-save") …
    const saveAt = chat.lastIndexOf("<SignUpButton", chat.indexOf('surface="chat-save"'));
    const card = chat.slice(chat.lastIndexOf("{guestSignInHref && !school && !under13", saveAt), saveAt);
    expect(card).toContain("{guestSignInHref && !school && !under13 && !busy &&");
    // … and the line under the page title (door "chat-banner", 2 Oct 2026): the same three conditions.
    const bannerAt = chat.lastIndexOf("<SignUpButton", chat.indexOf('surface="chat-banner"'));
    expect(chat.slice(chat.lastIndexOf("{guestBanner &&", bannerAt), bannerAt)).toContain("{guestBanner && guestSignInHref && !school && !under13 && (");
    expect(chat.match(/<SignUpButton\b/g)).toHaveLength(2);
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

  it("/login wears the light button and opens its tooltip above — 'Try 5 questions first' sits under it, as a quiet outline", () => {
    const tag = login.match(/<GoogleSignInButton\b[\s\S]*?\/>/)?.[0] ?? "";
    expect(tag).toContain('side="top"');
    expect(tag).not.toContain("theme=");
    expect(login.indexOf("<GoogleSignInButton")).toBeLessThan(login.indexOf('t("login.tryFirst")'));
    // The alternative is a 1 px ink outline on white (it was a saffron-tinted box): the sign-up stays the main action.
    const alt = login.slice(login.indexOf("{examCode && li.tryFirst && ("), login.indexOf('t("login.tryFirst")'));
    expect(alt).toContain('className="mt-3 block rounded-lg border border-ink-300 bg-white px-3 py-2 text-center text-sm font-medium text-ink-800 hover:bg-ink-50"');
    expect(alt).not.toMatch(/saffron/);
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
        // 2 Oct 2026 (review): the finder's bottom card — the sign-up, then "Start {exam} prep →".
        "src/app/find-your-exam/page.tsx",
        "src/app/for/[persona]/page.tsx",
        "src/app/login/page.tsx",
        // 2 Oct 2026 (review): the cutoff box — the sign-up now comes first, the quiz link under it.
        "src/components/AnonExamNudge.tsx",
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
    const chatTags = code("src/app/chat/ChatInterface.tsx").match(/<SignUpButton\b[\s\S]*?\/>/g) ?? [];
    expect(chatTags.find((t) => t.includes('surface="chat-save"'))).toContain('side="top"');
    expect(code("src/components/GuestQuizGate.tsx").match(/<GoogleSignInButton\b[\s\S]*?\/>/)?.[0]).toContain('side="top"');
    // GoogleSignInButton hands side to the frame.
    expect(code("src/components/GoogleSignInButton.tsx")).toContain("<SignUpShell text={text} short={short} surface={surface} explain={mode} side={side} block className={className}>");
  });
});

// ── 12. where the top-layer tooltip goes (pure) ───────────────────────────

describe("12. the top-layer tooltip's place: under or above the button, inside the window, never over the button (2 Oct 2026, evening)", () => {
  // A desktop window and the general sentence's box (320 px wide, four lines).
  const viewport = { width: 1280, height: 800 };
  const tip = { width: 320, height: 86 };
  const at = (top: number, left: number, w = 190, h = 44) => ({ top, left, right: left + w, bottom: top + h });

  it("8 px from the button and 8 px from every edge of the window", () => {
    expect(SIGNUP_TIP_GAP).toBe(8);
    expect(SIGNUP_TIP_MARGIN).toBe(8);
  });

  it("under the button by default, hung from its left edge; above it for side=top; from its right edge for align=end", () => {
    const button = at(300, 200);
    expect(placeSignUpTip({ button, tip, viewport })).toEqual({ top: 352, left: 200, side: "bottom", hidden: false });
    expect(placeSignUpTip({ button, tip, viewport, side: "top" })).toEqual({ top: 206, left: 200, side: "top", hidden: false });
    expect(placeSignUpTip({ button, tip, viewport, align: "end" })).toEqual({ top: 352, left: 70, side: "bottom", hidden: false });
    expect(placeSignUpTip({ button, tip, viewport, side: "bottom", align: "start" })).toEqual(placeSignUpTip({ button, tip, viewport }));
  });

  it("the header's button (top right of the screen): under the top row, wholly on screen — whatever is layered under the header", () => {
    // 64 px row, 44 px button centred, 16 px from the right edge of a 1280 px window.
    const p = placeSignUpTip({ button: at(10, 1074), tip, viewport, align: "end" });
    expect(p).toEqual({ top: 62, left: 944, side: "bottom", hidden: false });
    // It ends at y = 148: 46 px below the header's 102 px. The live strip there used to paint over those lines.
    expect(p.top + tip.height).toBe(148);
    expect(p.left + tip.width).toBeLessThanOrEqual(viewport.width - SIGNUP_TIP_MARGIN);
  });

  it("the timed bar's button (bottom right): above the bar", () => {
    expect(placeSignUpTip({ button: at(700, 1100, 136), tip, viewport, side: "top", align: "end" })).toEqual({ top: 606, left: 916, side: "top", hidden: false });
  });

  it("slides along the button to stay 8 px inside the window, left and right", () => {
    // Hung from the left edge of a button at the right of the screen: pushed left.
    expect(placeSignUpTip({ button: at(300, 1074), tip, viewport }).left).toBe(1280 - 8 - 320);
    // Hung from the right edge of a button at the left of the screen: pushed right.
    expect(placeSignUpTip({ button: at(300, 16), tip, viewport, align: "end" }).left).toBe(8);
    // A narrow mouse window (360 px): never off the left edge (the old CSS tooltip checked the right edge only).
    const narrow = { width: 360, height: 640 };
    expect(placeSignUpTip({ button: at(560, 190, 136), tip, viewport: narrow, side: "top", align: "end" }).left).toBe(8);
    expect(placeSignUpTip({ button: at(10, 230, 114), tip, viewport: narrow, align: "end" }).left).toBe(24);
    // A tooltip wider than the window keeps its start on screen.
    expect(placeSignUpTip({ button: at(10, 10), tip: { width: 400, height: 86 }, viewport: narrow }).left).toBe(8);
  });

  it("no room on the side asked for: the other side", () => {
    // side=top with the button at the top of the screen: under it.
    expect(placeSignUpTip({ button: at(20, 200), tip, viewport, side: "top" })).toEqual({ top: 72, left: 200, side: "bottom", hidden: false });
    // Under by default with the button at the bottom of the screen: above it.
    expect(placeSignUpTip({ button: at(740, 200), tip, viewport })).toEqual({ top: 646, left: 200, side: "top", hidden: false });
    // Exactly enough room is enough: 300 + 44 + 8 + 86 = 438 = 446 - 8.
    expect(placeSignUpTip({ button: at(300, 200), tip, viewport: { width: 1280, height: 446 } }).side).toBe("bottom");
    expect(placeSignUpTip({ button: at(300, 200), tip, viewport: { width: 1280, height: 445 } }).side).toBe("top");
    // The guest tutor's save card at the top edge of its scrolling pane: the
    // pane is not in the arithmetic at all — the copy is not inside it.
    expect(placeSignUpTip({ button: at(260, 400), tip, viewport, side: "top" })).toEqual({ top: 166, left: 400, side: "top", hidden: false });
  });

  it("no room on either side (a very short window): the roomier side, past the window's edge — still never over the button", () => {
    const short = { width: 1280, height: 150 };
    // More room under the button.
    const under = placeSignUpTip({ button: at(50, 200), tip, viewport: short });
    expect(under).toEqual({ top: 102, left: 200, side: "bottom", hidden: false });
    expect(placeSignUpTip({ button: at(50, 200), tip, viewport: short, side: "top" })).toEqual(under);
    // More room above it.
    const over = placeSignUpTip({ button: at(90, 200), tip, viewport: short });
    expect(over).toEqual({ top: -4, left: 200, side: "top", hidden: false });
    expect(over.top + tip.height).toBe(90 - SIGNUP_TIP_GAP);
  });

  it("never over the button, and inside the window whenever one side has room — over a grid of buttons, tooltips and windows", () => {
    // Plain checks collected into one list (one assertion at the end): the grid is about 35,000 placements.
    const broken: string[] = [];
    let checked = 0;
    for (const vh of [200, 400, 800]) {
      for (const vw of [360, 768, 1280]) {
        for (const h of [40, 86, 120]) {
          for (const w of [200, 320]) {
            for (let top = -40; top <= vh + 40; top += 17) {
              for (const left of [-50, 0, 90, vw - 200, vw - 60]) {
                for (const side of [undefined, "top"] as const) {
                  for (const align of [undefined, "end"] as const) {
                    const button = at(top, left);
                    const p = placeSignUpTip({ button, tip: { width: w, height: h }, viewport: { width: vw, height: vh }, side, align });
                    const fail = (rule: string) => broken.push(`${rule}: vh${vh} vw${vw} h${h} w${w} top${top} left${left} ${side} ${align} -> ${JSON.stringify(p)}`);
                    // Rule 1: wholly under the button, or wholly above it, with the gap.
                    const underIt = p.top >= button.bottom + SIGNUP_TIP_GAP;
                    const aboveIt = p.top + h <= button.top - SIGNUP_TIP_GAP;
                    if (!underIt && !aboveIt) fail("over the button");
                    if (p.side !== (underIt ? "bottom" : "top")) fail("side");
                    // Sideways: always inside (every tooltip here is narrower than the window).
                    if (p.left < SIGNUP_TIP_MARGIN || p.left + w > vw - SIGNUP_TIP_MARGIN) fail("outside, sideways");
                    // Up and down: inside whenever it fits on one side of the button.
                    const roomUnder = button.bottom + SIGNUP_TIP_GAP + h <= vh - SIGNUP_TIP_MARGIN;
                    const roomAbove = button.top - SIGNUP_TIP_GAP - h >= SIGNUP_TIP_MARGIN;
                    if ((roomUnder || roomAbove) && (p.top < SIGNUP_TIP_MARGIN || p.top + h > vh - SIGNUP_TIP_MARGIN)) fail("outside, up or down");
                    // The side asked for is kept whenever it has room.
                    if (side === "top" && roomAbove && p.side !== "top") fail("left the side asked for (top)");
                    if (side !== "top" && roomUnder && p.side !== "bottom") fail("left the side asked for (bottom)");
                    // Whole pixels.
                    if (!Number.isInteger(p.top) || !Number.isInteger(p.left)) fail("not whole pixels");
                    checked++;
                  }
                }
              }
            }
          }
        }
      }
    }
    expect(broken.slice(0, 5)).toEqual([]);
    expect(checked).toBeGreaterThan(5000);
  });

  it("the button has left the screen (it kept the focus, the page was scrolled): nothing is shown; half on screen still is", () => {
    for (const button of [at(-100, 200), at(-44, 200), at(800, 200), at(900, 200), at(300, -190), at(300, 1280)]) {
      expect(placeSignUpTip({ button, tip, viewport }).hidden, JSON.stringify(button)).toBe(true);
    }
    // Half on screen at the top: shown, under it, never above the window.
    expect(placeSignUpTip({ button: at(-20, 200), tip, viewport, side: "top" })).toEqual({ top: 32, left: 200, side: "bottom", hidden: false });
    // Half on screen at the bottom: shown, above it.
    expect(placeSignUpTip({ button: at(780, 200), tip, viewport })).toEqual({ top: 686, left: 200, side: "top", hidden: false });
  });

  it("whole pixels out of fractional measurements, rounded away from the button; a missing measurement shows nothing", () => {
    const p = placeSignUpTip({ button: { top: 10.4, left: 100.5, right: 290.2, bottom: 54.6 }, tip: { width: 319.3, height: 85.7 }, viewport });
    expect(p).toEqual({ top: 63, left: 101, side: "bottom", hidden: false });
    const q = placeSignUpTip({ button: { top: 400.6, left: 100.5, right: 290.2, bottom: 444.6 }, tip: { width: 319.3, height: 85.7 }, viewport, side: "top" });
    expect(q.top).toBe(306);
    expect(q.top + 86).toBeLessThanOrEqual(400.6 - SIGNUP_TIP_GAP);
    for (const bad of [
      { button: at(Number.NaN, 0), tip, viewport },
      { button: at(10, 10), tip: { width: 0, height: 0 }, viewport },
      { button: at(10, 10), tip, viewport: { width: 0, height: 0 } },
      { button: at(10, 10), tip: { width: 320, height: Number.POSITIVE_INFINITY }, viewport },
    ]) {
      expect(placeSignUpTip(bad)).toEqual({ top: 0, left: 0, side: "bottom", hidden: true });
    }
  });

  it("the module is pure: no React, no DOM, no import at all", () => {
    const src = read("src/lib/signup-tip-place.ts");
    expect(src.match(/^import .*$/gm) ?? []).toEqual([]);
    expect(code("src/lib/signup-tip-place.ts")).not.toMatch(/\bwindow\b|\bdocument\b/);
  });
});

// ── 13. above every other layer ──────────────────────────────────────────

describe("13. the top-layer tooltip is above every other layer of the site", () => {
  it("its z-index is higher than every z-index written anywhere in src/", () => {
    const css = read("src/app/globals.css");
    const floatRule = css.slice(css.indexOf("  .su-float {"), css.indexOf("  .container-prose {"));
    const floatZ = Number(floatRule.match(/z-index: (\d+);/)?.[1]);
    expect(floatZ).toBe(1000);
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.(?:tsx?|css)$/.test(e.name) ? [path.join(d, e.name)] : []));
    const layers: { file: string; z: number }[] = [];
    for (const f of walk(path.join(ROOT, "src"))) {
      const src = fs.readFileSync(f, "utf8");
      // Tailwind's z-[N] and z-N, a CSS z-index, an inline zIndex.
      for (const m of src.matchAll(/(?<![\w-])z-\[(\d+)\]|(?<![\w-])z-(\d+)\b|z-index:\s*(\d+)|zIndex:\s*["']?(\d+)/g)) {
        layers.push({ file: path.relative(ROOT, f).replace(/\\/g, "/"), z: Number(m[1] ?? m[2] ?? m[3] ?? m[4]) });
      }
    }
    // The scan sees the layers the site has (the header, the bars, the modals, the loading bar, the tours).
    for (const z of [30, 40, 45, 50, 60, 100]) expect(layers.some((l) => l.z === z), `z ${z}`).toBe(true);
    const own = layers.filter((l) => l.file === "src/app/globals.css" && l.z === floatZ);
    expect(own).toHaveLength(1);
    const others = layers.filter((l) => !(l.file === "src/app/globals.css" && l.z === floatZ));
    const top = others.reduce((a, b) => (b.z > a.z ? b : a));
    expect(top.z, `${top.file} has z ${top.z}`).toBeLessThan(floatZ);
  });

  it("it is not inside anything: a child of <body>, which nothing transforms, filters or clips", () => {
    const layout = code("src/app/layout.tsx");
    // <body> carries the font only — no transform, filter, backdrop blur or overflow class that would trap a fixed child.
    expect(layout).toContain('<body className="font-multi">');
    const css = read("src/app/globals.css");
    const body = css.slice(css.indexOf("  body {"), css.indexOf("  /* All clickable surfaces"));
    expect(body.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/transform|filter|contain|perspective|will-change/);
    // The same for <html>, <body>'s only ancestor: a transform there would trap a fixed child too.
    const html = css.slice(css.indexOf("  html {"), css.indexOf("  body {"));
    expect(html).toMatch(/^  html \{/);
    expect(html.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/transform|filter|contain|perspective|will-change/);
    // <html> carries the two font variables only — no class that transforms, filters or clips.
    expect(layout).toMatch(/<html\s+lang="en"\s+dir="ltr"\s+className=\{`\$\{inter\.variable\} \$\{notoDevanagari\.variable\}`\}\s*>/);
  });
});

// ── 14. the header and the timed bar wear Google's light button ───────────

describe("14. no saffron sign-up button: the header and the timed bar are Google's light button (2 Oct 2026, evening)", () => {
  const headerMod = load("src/components/HeaderAuthControls.tsx") as { HeaderAuthControls: unknown };
  /** The header's right rail as the server sends it to a visitor on `p` (the session is not known yet: the guest button). */
  const rail = (p: string, childSafe = false) => {
    headerPath = p;
    return render(headerMod.HeaderAuthControls, { locale: "en", labels: { dashboard: "Dashboard", signout: "Sign out" }, childSafe });
  };
  const controls = code("src/components/HeaderAuthControls.tsx");

  it("the header's guest button, rendered: the white pill, the colour G, then 'Sign up with Google' — a plain /login link", () => {
    for (const p of ["/", "/exams/SSC_CGL", "/colleges", "/schooling/cbse/class-9"]) {
      const html = rail(p);
      const a = html.slice(html.indexOf("<a"), html.indexOf("</a>"));
      expect(attr(a, "class"), p).toBe("su-google su-google-compact");
      for (const c of ["#EA4335", "#4285F4", "#FBBC05", "#34A853"]) expect(a, p).toContain(`fill="${c}"`);
      expect(a.match(/<svg /g), p).toHaveLength(1);
      expect(textOf(a), p).toBe("Sign up with Google");
      // The G first, then the label's halves: two lines below sm, one line from sm.
      expect(a, p).toMatch(/<\/svg><span class="flex flex-col items-start sm:flex-row sm:gap-1"><span class="whitespace-nowrap">Sign up<\/span> <span class="whitespace-nowrap">with Google<\/span><\/span>$/);
      // Still the plain /login link the root layout's listener counts; never a SignInLink.
      expect(attr(a, "href"), p).toBe("/login");
      expect(attr(a, "rel"), p).toBe("nofollow");
      expect(attr(a, "data-signin-surface"), p).toBe("header");
      expect(a, p).not.toContain("data-signin-beacon");
      // Inside the frame that carries the explanation — whose words arrive after mount (not in the cached HTML).
      expect(html, p).toMatch(/^<span class="su-wrap" data-su-explain="tooltip" data-su-align="end"><a /);
      expect(html, p).not.toMatch(/role="tooltip"|aria-describedby|su-tip|su-float/);
      // Nothing saffron, nothing of the old button.
      expect(html, p).not.toMatch(/btn-primary|saffron|text-xs/);
    }
  });

  it("the header's classes: one constant for both guest branches, Google's light button, compact below sm", () => {
    expect(controls).toContain('const GUEST_BUTTON_CLASS = "su-google su-google-compact";');
    expect(controls.match(/className=\{GUEST_BUTTON_CLASS\}/g)).toHaveLength(2);
    expect(controls).not.toMatch(/btn-primary|bg-saffron|SignUpBrandLabel/);
    // The dark theme is not used here: the header's button is the white one in the founder's screenshot.
    expect(controls).not.toContain("su-google-dark");
  });

  it("never under 13, exactly as before: nothing on a Class 1-7 page or a child-safe page; the plain link (no frame, no tooltip) on /schooling and a board hub", () => {
    for (const p of ["/schooling/cbse/class-1", "/schooling/cbse/class-5/maths", "/schooling/tn-state-board/class-7/science/chapter-1"]) {
      expect(rail(p), p).toBe("");
    }
    // The page says a child may be reading (/ask with a Class 1-7 question).
    expect(rail("/ask", true)).toBe("");
    expect(rail("/exams/SSC_CGL", true)).toBe("");
    for (const p of ["/schooling", "/schooling/cbse", "/schooling/tn-state-board"]) {
      const html = rail(p);
      // The same white button — but the link alone: no frame, so no tooltip, no description and no "explanation opened" beacon.
      expect(html, p).toMatch(/^<a /);
      expect(html, p).not.toMatch(/su-wrap|su-tip|su-float|role="tooltip"|aria-describedby/);
      expect(attr(html, "class"), p).toBe("su-google su-google-compact");
      expect(textOf(html), p).toBe("Sign up with Google");
      expect(explainBeaconDue(p, null), p).toBe(false);
    }
    // The branch order in the source is what it was.
    expect(controls).toMatch(/\) : childSafe \|\| isUnder13SchoolPath\(pathname\) \? null : isChildSchoolPath\(pathname\) \? \(\s*<Link rel="nofollow" href=\{loginHref\} className=\{GUEST_BUTTON_CLASS\} data-signin-surface="header">\s*<SignUpStackedFace locale=\{lang\} joinFromSm \/>\s*<\/Link>\s*\) : \(\s*<SignUpShell /);
  });

  it("the 360 px row: the wordmark gives way to the Telugu GUEST BUTTON between 400 and 439 px — only while that button is on screen (font arithmetic — not yet seen on a phone)", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/@media \(max-width: 439\.98px\) \{\s*html\[data-hdr-guest="te"\] \.hdr-wordmark \{\s*display: none;\s*\}\s*\}/);
    // Never on the page's language alone: a signed-in Telugu reader, and a Telugu reader of a Class 1-7 page, have no button and keep the wordmark.
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "")).not.toMatch(/html\[lang[^\]]*\][^{]*\.hdr-wordmark/);
    expect(css.replace(/\/\*[\s\S]*?\*\//g, "").match(/\.hdr-wordmark/g)).toHaveLength(1);
    expect(code("src/components/Header.tsx")).toContain('<span className="hdr-wordmark hidden flex-col min-[400px]:flex">');
    // The mark is written by the header's own island, while it renders the guest button — the same test as its
    // branches (not signed in, not child-safe, not a Class 1-7 page) — and carries the LABEL's language, so the
    // rule and the label can never disagree. Removed when the button goes; not set while a reader the hint
    // cookie says is signed in is still being asked about. Before paint (a layout effect).
    expect(controls).toContain("const guestButton = !signedIn && !childSafe && !isUnder13SchoolPath(pathname);");
    expect(controls).toMatch(
      /useLayoutEffect\(\(\) => \{\s*if \(!guestButton \|\| \(session === null && hasSessionHint\(\)\)\) return;\s*const root = document\.documentElement;\s*root\.setAttribute\("data-hdr-guest", lang\);\s*return \(\) => root\.removeAttribute\("data-hdr-guest"\);\s*\}, \[guestButton, session, lang\]\);/,
    );
    expect(controls.match(/data-hdr-guest/g)).toHaveLength(2);
    // Nothing of it in the server HTML (the cached page is the same for everyone).
    for (const p of ["/", "/schooling", "/schooling/cbse/class-3"]) expect(rail(p), p).not.toContain("data-hdr-guest");
  });

  it("the header label follows the language control at once — a change of language does not change the path", () => {
    // LangSwitcher tells its parent the language it shows at the moment it sets <html lang>.
    const sw = code("src/components/LangSwitcher.tsx");
    expect(sw).toContain("setCur(fromUrl ?? readCookieLocale() ?? current);");
    expect(sw).toMatch(/document\.documentElement\.lang = cur;[\s\S]*?onLocale\?\.\(cur\);\s*\}, \[cur, onLocale\]\);/);
    expect(sw).toContain("onLocale?: (lc: Locale) => void;");
    // A language change on a plain URL only refreshes the route: no new path, so the label's own effect would not run.
    expect(sw).toContain("startTransition(() => router.refresh());");
    // The header passes a STABLE function (or LangSwitcher's effect would run on every render) that sets the label's language.
    expect(controls).toContain("const onLocale = useCallback((lc: string) => setLang(asCopyLocale(lc)), []);");
    expect(controls).toContain("<LangSwitcher current={safeLocale} onLocale={onLocale} />");
    // The first value after mount, and every navigation, still read the URL prefix, then the cookie — the same two sources.
    expect(controls).toMatch(/useEffect\(\(\) => \{\s*setLang\(clientUiLocale\(\)\);\s*\}, \[pathname\]\);/);
    // Any language without its own label is English, as in the label module.
    for (const [lc, want] of [["te", "te"], ["hi", "hi"], ["en", "en"], ["ta", "en"], ["ur", "en"]] as const) {
      expect(uiLocaleCopyMod.asCopyLocale(lc), lc).toBe(want);
      expect(signUpLabelParts(uiLocaleCopyMod.asCopyLocale(lc)).join(" "), lc).toBe(signUpLabel(want));
    }
    // The row itself is as it was: one line that cannot wrap, both sides rigid.
    const header = code("src/components/Header.tsx");
    expect(header).toContain('<div className="container-prose flex h-16 items-center gap-2 sm:gap-3">');
    expect(header).toContain('<nav className="ml-auto flex shrink-0 items-center gap-2 text-sm text-ink-700 sm:gap-3">');
  });

  it("the timed bar's button: the shared button, light, two lines beside the G, tooltip above — no fill of its own", () => {
    const bar = code("src/components/SignupNudge.tsx");
    const tag = bar.match(/<SignUpButton\b[\s\S]*?\/>/)?.[0] ?? "";
    expect(tag).toMatch(/surface="signup-nudge"\s+locale=\{barLocale\}\s+stack\s+explain="tooltip"\s+side="top"\s+align="end"\s+className="shrink-0"\s+beaconProps=\{\{ placement: show \}\}/);
    expect(tag).not.toMatch(/variant=|theme=|buttonClassName|saffron|bg-/);
    // The bar's own frame keeps its saffron top border; only the button changed.
    expect(bar).toContain("border-saffron-300 bg-white");
    expect(bar).not.toMatch(/bg-saffron-500|hover:bg-saffron-600/);
  });

  it("the 'brand' variant and its label are gone from src/; no file styles a sign-up button saffron", () => {
    const walk = (d: string): string[] =>
      fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []));
    const hits: string[] = [];
    for (const f of walk(path.join(ROOT, "src"))) {
      const rel = path.relative(ROOT, f).replace(/\\/g, "/");
      const src = fs.readFileSync(f, "utf8");
      if (/SignUpBrandLabel|variant="brand"|variant: "brand"|"google" \| "brand"/.test(src)) hits.push(`${rel}: brand variant`);
      // Every button of the shared components, wherever it is mounted: no theme at all, no class that fills or recolours it.
      for (const m of src.matchAll(/<(?:SignUpButton|GoogleSignInButton)\b[\s\S]*?\/>/g)) {
        if (/variant=/.test(m[0])) hits.push(`${rel}: variant prop`);
        if (/theme=/.test(m[0])) hits.push(`${rel}: theme prop`);
        const cls = m[0].match(/buttonClassName="([^"]*)"/)?.[1] ?? "";
        if (/\bbg-|\btext-|\bborder|\brounded/.test(cls)) hits.push(`${rel}: buttonClassName "${cls}"`);
      }
      // The G is drawn by the shared component only.
      if (rel !== "src/components/SignUpButton.tsx" && /<GoogleG\b/.test(src)) hits.push(`${rel}: its own G`);
    }
    expect(hits).toEqual([]);
    expect(Object.keys(ui)).not.toContain("SignUpBrandLabel");
    const props = code("src/components/SignUpButton.tsx");
    expect(props).not.toMatch(/\bvariant\b/);
  });
});
