// "Sign up with Google" EVERYWHERE, ONE LOOK, A REASON AT EVERY BUTTON
// (2 Oct 2026, night — founder, with a screenshot of the white Google button
// and the grey line under it: "wherever the sign in or sign up or free sign
// in everywhere sign has to be replaced with Google sign up the way which I
// have showed the screenshot so it will increase the sign ups and everywhere
// try to say something why sign in will help them").
//
// The earlier build (tests/unit/signup-cta.test.ts) made the PRIMARY guest
// buttons the shared component. This file pins what that left open:
//   A. ONE LOOK — Google's light button. No dark theme, no saffron sign-up
//      button, nowhere in src/.
//   B. EVERY CLICKABLE CALL to a guest to sign in — a button, a bar, a pill
//      or a text link — is that button: a scan of every <Link> and <a> under
//      src/app and src/components whose href leads to /login, against an
//      explicit list of what was deliberately left.
//   C. A VISIBLE REASON at every button, on every device: the short caption
//      (explain "both", the default), or the placement's own line marked
//      data-su-reason (explain "own"). Tooltip only: the header and the
//      timed bar, nowhere else.
//   D. THE SIGN-UP STAYS THE MAIN ACTION — the alternative beside a button
//      is a text link or a 1 px ink outline, and comes after it.
//   E. COUNTING — every newly converted door has its own id, goes to /login
//      as it did, and keeps its older beacon where it had one.
//   F. MINORS — no newly converted placement can show where a child under
//      13 may be reading.
//   G. HONESTY — the new reason lines make only claims the code backs; four
//      old lines that promised more than the site does are gone.
//   H. THE REVIEW'S FIXES (same night): the home rail keeps its list, the
//      cutoff box follows rule D, the finder's bottom card has a button, a
//      /live-test sign-up is not greeted "Welcome back", the gate counts only
//      clicks on its button, and 22-language pages keep their own language.
// 2 Oct 2026 (later — founder: every button's explanation is its own): the
// explanation is one of 76 entries of a table now (src/data/signup-places/,
// chosen by src/lib/signup-place.ts; pinned in
// tests/unit/signup-places.test.ts). Changed here: a button gets its words
// from a server page or loads them on demand, so the renders below hand the
// words in; the "vouch" button and the fact panel's button return to their
// page; the finder's line is the reason line "startExam".
// What no test here can see: pixels. How the white button, its caption and
// the quiet alternative look side by side — at 360 px and on a desktop — has
// to be looked at in a browser.
// Run: npx vitest run tests/unit/signup-everywhere.test.ts

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
import * as placeMod from "@/lib/signup-place";
import * as hooksMod from "@/lib/use-signup-words";
import { signUpPlaceWords, signUpWords } from "@/lib/signup-place-words";
import * as signinCtaMod from "@/lib/signin-cta";
import * as ctaBeaconMod from "@/lib/cta-beacon";
import * as sessionHintMod from "@/lib/session-hint";
import * as inAppMod from "@/lib/in-app-browser";
import * as directMod from "@/lib/direct-signin-ab";
import * as tipPlaceMod from "@/lib/signup-tip-place";
import { dict as i18nDict } from "@/lib/i18n";
import { isChildSchoolPath, pitchAllowedPath } from "@/lib/signup-pitch";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";
import { loginIntent } from "@/lib/login-intent";

const { SIGNUP_BANNED_WORDS, SIGNUP_CLAIM_PROOF, SIGNUP_REASON_CLAIMS } = claimsMod;
const { SIGNUP_LOCALES, signUpLabel, signUpReason } = copyMod;
const { SIGNIN_SURFACES, cleanFrom, isSigninSurface } = signinCtaMod;
const { inDirectSigninTest } = directMod;

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
/** Source with comments removed (JSX comments, block comments, line comments). */
const code = (rel: string) =>
  read(rel)
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
const walk = (d: string, re: RegExp): string[] =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name), re) : re.test(e.name) ? [path.join(d, e.name)] : []));
const rel = (f: string) => path.relative(ROOT, f).replace(/\\/g, "/");
/** Every page and component file. */
const TSX = [...walk(path.join(ROOT, "src/app"), /\.tsx$/), ...walk(path.join(ROOT, "src/components"), /\.tsx$/)].map(rel).sort();

/** The JSX opening tags of the given element names in `src` — up to the tag's
 *  own ">" (braces and strings inside attribute values are skipped, so "=>"
 *  and a ">" inside a template string do not end the tag). */
function jsxTags(src: string, names: string[]): { name: string; text: string; at: number }[] {
  const out: { name: string; text: string; at: number }[] = [];
  const re = new RegExp(`<(${names.join("|")})\\b`, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    let i = m.index + m[0].length;
    let depth = 0;
    let quote: string | null = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === quote && src[i - 1] !== "\\") quote = null;
        continue;
      }
      if (c === '"' || c === "'" || (depth > 0 && c === "`")) quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    out.push({ name: m[1], text: src.slice(m.index, i + 1), at: m.index });
  }
  return out;
}

/** A tag's href attribute as written: "…" or {…}. */
function hrefOf(tag: string): string | null {
  const m = /\bhref=/.exec(tag);
  if (!m) return null;
  let i = m.index + m[0].length;
  if (tag[i] === '"') return tag.slice(i, tag.indexOf('"', i + 1) + 1);
  if (tag[i] !== "{") return null;
  const start = i;
  let depth = 0;
  for (; i < tag.length; i++) {
    if (tag[i] === "{") depth++;
    else if (tag[i] === "}" && --depth === 0) break;
  }
  return tag.slice(start, i + 1);
}

// ── a small TSX loader (the tests/unit/signup-cta.test.ts one) ───────────

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
const ui = load("src/components/SignUpButton.tsx") as { SignUpButton: unknown };
const googleBtn = load("src/components/GoogleSignInButton.tsx") as { GoogleSignInButton: unknown };

// ── A. one look ──────────────────────────────────────────────────────────

describe("A. one look everywhere: Google's light button — no dark theme, no saffron sign-up button", () => {
  it("no file under src/ names the dark theme: no su-google-dark, no theme=\"dark\", no theme prop on the shared buttons", () => {
    const hits: string[] = [];
    for (const f of [...walk(path.join(ROOT, "src"), /\.(?:tsx?|css)$/)].map(rel)) {
      const raw = read(f);
      // Comments included: nobody should find the old class name and bring it back.
      if (/su-google-dark/.test(raw)) hits.push(`${f}: su-google-dark`);
      if (/theme=["{]\s*"?dark/.test(raw)) hits.push(`${f}: theme="dark"`);
      if (!f.endsWith(".css")) {
        for (const t of jsxTags(code(f), ["SignUpButton", "GoogleSignInButton", "SignUpShell", "HubSignInLink", "GateSignInButton"])) {
          if (/\btheme=/.test(t.text)) hits.push(`${f}: a theme prop`);
          if (/\bvariant=/.test(t.text)) hits.push(`${f}: a variant prop`);
        }
      }
    }
    expect(hits).toEqual([]);
  });

  it("the component cannot be asked for another look: one class, no theme in its props", () => {
    const btn = code("src/components/SignUpButton.tsx");
    expect(btn).toMatch(/export function googleButtonClass\(\): string \{\s*return "su-google";\s*\}/);
    expect(btn).not.toMatch(/\btheme\b/);
    expect(code("src/components/GoogleSignInButton.tsx")).not.toMatch(/\btheme\b/);
    // Rendered: whatever a caller passes, the class is Google's light button.
    for (const extra of [{}, { theme: "dark" }, { variant: "brand" }, { theme: "saffron" }]) {
      const html = render(ui.SignUpButton, { href: "/login?callbackUrl=%2F", surface: "signup-pitch", ...extra } as never);
      expect(html.match(/<a\b[^>]*\sclass="([^"]*)"/)?.[1]).toBe("su-google");
      expect(html).toContain('fill="#4285F4"');
    }
    const login = render(googleBtn.GoogleSignInButton, { callbackUrl: "/dashboard", locale: "en", theme: "dark" } as never);
    expect(login.match(/<button\b[^>]*\sclass="([^"]*)"/)?.[1]).toBe("su-google w-full");
  });

  it("the stylesheet has one Google button: white fill, grey stroke — and nothing that fills it", () => {
    const css = read("src/app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(css).not.toMatch(/su-google-dark|#131314/);
    const rule = css.slice(css.indexOf("  .su-google {"), css.indexOf("  .su-google:hover {"));
    expect(rule).toContain("background-color: #ffffff;");
    expect(rule).toContain("border: 1px solid #747775;");
    // Every rule that touches the button: none sets a background but the one above.
    const fills = [...css.matchAll(/\.su-google[^{,]*\{[^}]*background(?:-color)?:[^;]*;/g)].map((m) => m[0].slice(0, m[0].indexOf("{")).trim());
    expect(fills).toEqual([".su-google"]);
  });

  it("no caller hands the button a fill, a text colour or a shape; the G is drawn by the shared component only", () => {
    const hits: string[] = [];
    for (const f of TSX) {
      const src = code(f);
      for (const t of jsxTags(src, ["SignUpButton", "GoogleSignInButton"])) {
        const cls = t.text.match(/buttonClassName="([^"]*)"/)?.[1] ?? "";
        if (/\bbg-|\btext-|\bborder|\brounded/.test(cls)) hits.push(`${f}: buttonClassName "${cls}"`);
      }
      if (f !== "src/components/SignUpButton.tsx" && /<GoogleG\b/.test(src)) hits.push(`${f}: its own G`);
      // A hand-made element wearing the Google class: only the header's two plain links (one constant).
      if (f !== "src/components/SignUpButton.tsx" && f !== "src/components/GoogleSignInButton.tsx" && f !== "src/components/HeaderAuthControls.tsx" && /su-google/.test(src)) hits.push(`${f}: su-google by hand`);
    }
    expect(hits).toEqual([]);
  });
});

// ── B. every clickable call is the button ────────────────────────────────

/** Every <Link> / <a> in a page or component whose href leads to /login:
 *  the literal, a variable defined in the same file from a /login string or
 *  loginHrefFor(), or a name that says so (loginHref, signInHref,
 *  saveSignInHref(…)). The shared button's own link (SignInLink) is found too
 *  and listed below. */
function loginAnchors(): string[] {
  const LOGIN = /["'`(]\/login(?![/\w-])/;
  const hits: string[] = [];
  for (const f of TSX) {
    const src = code(f);
    const loginIds = new Set<string>();
    for (const m of src.matchAll(/\b(?:const|let)\s+(\w+)\s*(?::[^=\n]+)?=\s*([\s\S]*?);\n/g)) {
      const def = m[2].slice(0, 400);
      if (LOGIN.test(def) || /loginHrefFor\(/.test(def)) loginIds.add(m[1]);
    }
    for (const t of jsxTags(src, ["Link", "a"])) {
      const h = hrefOf(t.text);
      if (!h) continue;
      const ids = [...h.matchAll(/[A-Za-z_]\w*/g)].map((x) => x[0]);
      const named = ids.some((id) => /login|signin/i.test(id) && /href|url|link/i.test(id));
      if (LOGIN.test(h) || ids.some((id) => loginIds.has(id)) || named) hits.push(`${f} :: ${h.replace(/\s+/g, " ")}`);
    }
  }
  return hits.sort();
}

/** What was deliberately left a plain link, and why. A new plain link to
 *  /login anywhere in src/app or src/components fails this test: make it a
 *  <SignUpButton> (or add it here with its reason). */
const LEFT_AS_LINKS_ALL: { hit: string; why: string; guestSees: boolean; action?: boolean; optional?: boolean }[] = [
  // The header: Google's light button already (class su-google), kept a plain link so the cached HTML of every
  // page is the same and the root layout's listener counts it (door "header"). Two branches: the plain one on
  // /schooling and board hubs (no tooltip), and the one inside the tooltip frame.
  { hit: "src/components/HeaderAuthControls.tsx :: {loginHref}", why: "the header's own Google button (plain branch)", guestSees: true },
  { hit: "src/components/HeaderAuthControls.tsx :: {loginHref}", why: "the header's own Google button (with the tooltip)", guestSees: true },
  // The coaching institutes' admin page (email + password): "Student account? Use the student sign-in instead" —
  // a way out for a student on the wrong page, not a call to sign up; a Google pill would compete with that form.
  { hit: 'src/app/login/institution/page.tsx :: "/login"', why: "a way out on the institute admins' password page", guestSees: true },
  // "Start new discussion": an ACTION button whose label says nothing about signing in; a guest's click goes
  // through /login to the form — like the hub's practice buttons that answer 401. /login then shows the button.
  { hit: "src/app/discussions/page.tsx :: {newHref}", why: "an action button that leads a guest through /login", guestSees: true, action: true },
  // OTHER UNFINISHED WORK (not committed on 2 Oct 2026, not to be edited here): "Keep it on every device: sign
  // in" on the save-my-path island. To convert when that work lands: the words as a plain line and a
  // SignUpButton surface="save-path" under it (the id is already in src/lib/signin-cta.ts). `optional`: the file
  // is not in the repository until that work is committed, and this test must pass with and without it.
  { hit: "src/components/paths/SavePathButton.tsx :: {saveSignInHref(page.page)}", why: "other unfinished work — convert when it lands", guestSees: true, optional: true },
  // Not rendered to a guest: /dashboard redirects guests before ExamPicker mounts.
  { hit: "src/components/ExamPicker.tsx :: {href}", why: "mounted only on /dashboard, which a guest never sees", guestSees: false },
  // Not imported by any file (dead code).
  { hit: "src/components/DiscussionsSidebar.tsx :: {newDiscHref}", why: "not imported anywhere", guestSees: false },
  { hit: "src/components/HomeDiscussions.tsx :: {newDiscussionHref}", why: "not imported anywhere", guestSees: false },
  { hit: "src/components/HomeFeatureCards.tsx :: {wrapHref(card.href)}", why: "not imported anywhere", guestSees: false },
];
/** The list as it applies to the files that are there. */
const LEFT_AS_LINKS = LEFT_AS_LINKS_ALL.filter((l) => !l.optional || fs.existsSync(path.join(ROOT, l.hit.split(" :: ")[0])));

describe("B. every clickable call to a guest to sign in is the shared button", () => {
  const anchors = loginAnchors();

  it("no <Link> or <a> under src/app or src/components leads to /login — except the list of what was deliberately left", () => {
    expect(anchors).toEqual(LEFT_AS_LINKS.map((l) => l.hit).sort());
  });

  it("the scan sees what it should: it finds a literal, a variable, a named helper — and the shared link itself is not hand-made anywhere else", () => {
    // The shared button's link is <Link href={href}> inside SignInLink: `href` there is a prop, not a /login
    // string, so it is (rightly) not in the list; no other file renders SignInLink by hand.
    const users = TSX.filter((f) => /<SignInLink\b/.test(code(f)));
    expect(users).toEqual(["src/components/SignUpButton.tsx"]);
    // The straight-to-Google hand-off (no /login page) has two callers: the /login button and the shared link.
    const handoff = [...walk(path.join(ROOT, "src"), /\.tsx?$/)].map(rel).filter((f) => /goToGoogle\(/.test(code(f)) && f !== "src/lib/google-handoff.ts");
    expect(handoff.sort()).toEqual(["src/components/GoogleSignInButton.tsx", "src/components/SignInLink.tsx"]);
    // And next-auth's signIn() is called in one module only.
    const signIn = [...walk(path.join(ROOT, "src"), /\.tsx?$/)].map(rel).filter((f) => /\bsignIn\(\s*["']google["']/.test(code(f)));
    expect(signIn).toEqual(["src/lib/google-handoff.ts"]);
  });

  it("what is left dead or unreachable really is: the three components have no importer; ExamPicker is on /dashboard only", () => {
    const all = [...walk(path.join(ROOT, "src"), /\.tsx?$/)].map(rel);
    for (const name of ["DiscussionsSidebar", "HomeDiscussions", "HomeFeatureCards"]) {
      const importers = all.filter((f) => f !== `src/components/${name}.tsx` && new RegExp(`components/${name}["']`).test(code(f)));
      expect(importers, name).toEqual([]);
    }
    // Others import its types only; one file renders it.
    const picker = all.filter((f) => f !== "src/components/ExamPicker.tsx" && /<ExamPicker\b/.test(code(f)));
    expect(picker).toEqual(["src/app/dashboard/page.tsx"]);
    expect(read("src/app/dashboard/page.tsx")).toContain('if (!session?.user?.id) redirect(loginRedirectPath("/dashboard", sp));');
    // It reads every file under src/: on a busy machine that takes longer than the default five seconds.
  }, 60_000);

  it("no saffron sign-up button is left: of the links a guest can see, only the one ACTION button is filled", () => {
    for (const l of LEFT_AS_LINKS.filter((x) => x.guestSees)) {
      const file = l.hit.split(" :: ")[0];
      const href = l.hit.split(" :: ")[1];
      const tags = jsxTags(code(file), ["Link", "a"]).filter((t) => hrefOf(t.text)?.replace(/\s+/g, " ") === href);
      expect(tags.length, l.hit).toBeGreaterThan(0);
      for (const t of tags) {
        const filled = /bg-saffron-[4-9]00|btn-primary|bg-emerald-[5-9]00/.test(t.text);
        expect(filled, `${l.hit}: ${l.why}`).toBe(l.action === true);
      }
    }
    // The discussions button's label is an action in every language — it never says "sign in".
    expect(code("src/app/discussions/page.tsx")).toMatch(/\{t\("disc\.startNew"\)\}/);
  });

  it("the old own-look calls are gone from the code: their classes and their words as a link", () => {
    const gone: [string, RegExp][] = [
      ["src/components/home/HomeSignIn.tsx", /data-signin-surface=|btn-secondary">\s*\{copy\.signin\.cta\}/],
      ["src/app/live-test/page.tsx", /Sign in free to write it/],
      ["src/app/g/[token]/page.tsx", /btn-primary/],
      ["src/components/VerificationPanel.tsx", /Sign in →|href="\/login"/],
      ["src/components/VacancyExplorer.tsx", /Sign in free →|border-emerald-300 bg-emerald-50/],
      ["src/app/discussions/[id]/page.tsx", /signinToReply"\)\} →/],
      ["src/app/mocks/[id]/GuestPaperPlayer.tsx", /bg-saffron-500 px-3 py-1\.5 text-sm font-semibold text-white/],
      ["src/components/SoftWallClient.tsx", /bg-saffron-500|wall\.cta/],
      ["src/app/chat/page.tsx", /<Link href=\{loginHref\}/],
      ["src/components/AnonExamNudge.tsx", /SIGN_IN_LABEL|signInLabel/],
      ["src/components/ExamVerdictPoll.tsx", /\{labels\.nudge\} →|<a rel="nofollow" href=\{loginHref\}/],
      ["src/app/community-vouching/[domain]/page.tsx", /<Link href="\/login"/],
    ];
    for (const [file, re] of gone) expect(re.test(code(file)), `${file}: ${re}`).toBe(false);
  });

  it("the calls that are NOT links are written down: one search result row, and sentences with nothing to press", () => {
    // The site search answers "sign in" / "login" with a result row that opens /login — a result, not a pill.
    expect((read("src/lib/search/landings.ts").match(/path: "\/login"/g) ?? []).length).toBe(1);
    // The guest tutor's "not available in this browser — sign up with Google to use the tutor" is a sentence in an error box;
    // the header's button is on screen.
    // (2 Oct 2026, the sentences pass: it says "Sign up with Google (free)" — the label comes from the copy module.)
    expect(read("src/app/chat/ChatInterface.tsx")).toContain('${signUpLabel("en")} (free) to use the tutor.`,');
  });
});

// ── C. a visible reason at every button ──────────────────────────────────

/** Every placement of the shared buttons, by file: the explain mode of each tag. */
function placements(): { file: string; name: string; explain: string }[] {
  const out: { file: string; name: string; explain: string }[] = [];
  for (const f of TSX) {
    // The two component files render the frame themselves (explain={mode}).
    if (f === "src/components/SignUpButton.tsx" || f === "src/components/GoogleSignInButton.tsx") continue;
    for (const t of jsxTags(code(f), ["SignUpButton", "GoogleSignInButton", "SignUpShell"])) {
      const lit = t.text.match(/\bexplain="([^"]*)"/)?.[1];
      const expr = /\bexplain=\{/.test(t.text);
      out.push({ file: f, name: t.name, explain: expr ? "(expression)" : lit ?? "both" });
    }
  }
  return out;
}

describe("C. a visible reason at every button, on every device", () => {
  const all = placements();

  it("finds the placements (the scan is not empty) and every one names its mode with a literal", () => {
    // 33 buttons in 31 files on 2 Oct 2026.
    expect(all.length).toBeGreaterThanOrEqual(33);
    expect(new Set(all.map((p) => p.file)).size).toBeGreaterThanOrEqual(31);
    expect(all.filter((p) => p.explain === "(expression)")).toEqual([]);
    for (const p of all) expect(["both", "own", "tooltip"], `${p.file}: ${p.explain}`).toContain(p.explain);
  });

  it("tooltip only — no visible line of the button's own — is the header's and the timed bar's, nowhere else", () => {
    const tooltip = all.filter((p) => p.explain === "tooltip").map((p) => p.file);
    expect(tooltip.sort()).toEqual(["src/components/HeaderAuthControls.tsx", "src/components/SignupNudge.tsx"]);
    // The timed bar's own line sits beside its button all the same.
    expect(code("src/components/SignupNudge.tsx")).toMatch(/\{copy\.line\}|bar\.line|\.line\}/);
  });

  it("explain=\"own\": the placement marks its own benefit line (data-su-reason) — one for each such button, and no stray mark", () => {
    const own = new Map<string, number>();
    for (const p of all.filter((x) => x.explain === "own")) own.set(p.file, (own.get(p.file) ?? 0) + 1);
    // The files, pinned, so a new "own" placement is looked at once by a person.
    expect([...own.keys()].sort()).toEqual(
      [
        "src/app/chat/ChatInterface.tsx",
        // 7 Oct 2026 (B6): the tutor's unanswered-question door — "Sign up free and we'll answer this question here …".
        "src/app/chat/GuestQuestionDoor.tsx",
        // 8 Oct 2026: the tutor's first-answer card — its reason line tied to what the guest asked.
        "src/app/chat/FirstAnswerOffer.tsx",
        "src/app/coach/page.tsx",
        "src/app/community-vouching/[domain]/page.tsx",
        "src/app/discussions/[id]/page.tsx",
        "src/app/exams/[code]/TryOneQuestion.tsx",
        "src/app/find-your-exam/SaveMatchesNudge.tsx",
        "src/app/find-your-exam/page.tsx",
        "src/app/g/[token]/page.tsx",
        "src/app/ideas/page.tsx",
        "src/app/join/[inviteCode]/page.tsx",
        "src/app/live-test/page.tsx",
        "src/app/mocks/[id]/GuestPaperPlayer.tsx",
        "src/app/revision/page.tsx",
        "src/components/AnonExamNudge.tsx",
        "src/components/SignupInline.tsx",
        "src/components/SignupPitch.tsx",
        "src/components/SoftWallClient.tsx",
        "src/components/VacancyExplorer.tsx",
        "src/components/VerificationPanel.tsx",
        "src/components/home/HomeSignIn.tsx",
        "src/components/school/SchoolStudentEntry.tsx",
      ].sort(),
    );
    for (const [file, n] of own) {
      const marks = (code(file).match(/\bdata-su-reason\b/g) ?? []).length;
      expect(marks, `${file}: ${n} button(s) with their own line`).toBe(n);
    }
    // No file marks a reason line without a button that relies on it.
    for (const f of TSX) if (/\bdata-su-reason\b/.test(code(f))) expect(own.has(f), f).toBe(true);
  });

  it("the marked line holds words — an element with text or a copy expression in it, never an empty tag", () => {
    for (const f of TSX) {
      const src = code(f);
      for (const m of src.matchAll(/<(p|ul|span|div)\b[^>]*\bdata-su-reason\b[^>]*>([\s\S]{0,400}?)<\/\1>/g)) {
        expect(m[2].replace(/<[^>]+>/g, "").trim().length, `${f}: ${m[0].slice(0, 60)}`).toBeGreaterThan(3);
      }
    }
  });

  it("explain \"both\" (the default): the caption is in the page with the button — on a desktop too — in en, hi and te", () => {
    for (const l of SIGNUP_LOCALES) {
      // The words are the door's own entry (resolved by its page, or loaded on demand): handed in here.
      const quizEnd = signUpWords(l, { surface: "quiz-end", callback: "/exams/SSC_CGL", exam: "SSC CGL", examCode: "SSC_CGL", practice: "canServe" });
      const html = render(ui.SignUpButton, { href: "/login?callbackUrl=%2Fexams%2FSSC_CGL&from=quiz-end", surface: "quiz-end", locale: l, exam: "SSC CGL", examCode: "SSC_CGL", ...quizEnd });
      const cap = html.match(/<span class="su-cap">([^<]*)<\/span>/)?.[1];
      expect(cap, l).toBe(quizEnd.short);
      expect(quizEnd, l).toEqual(signUpPlaceWords(l, { key: "door.quiz-end", vars: { exam: "SSC CGL" } }));
      // A sibling of the link inside the frame, before the tooltip's frame: in the flow.
      expect(html, l).toMatch(/<\/a><span class="su-cap">[^<]+<\/span><span class="su-tip">/);
      const rail = signUpWords(l, { surface: "home-vacancies", callback: "/dashboard" });
      const general = render(ui.SignUpButton, { href: "/login?callbackUrl=%2Fdashboard", surface: "home-vacancies", locale: l, ...rail });
      expect(general.match(/<span class="su-cap">([^<]*)<\/span>/)?.[1], l).toBe(signUpPlaceWords(l, { key: "door.home-vacancies" }).short);
      // A client island's button, before the reader's language has loaded: the caption's line is held open.
      const pending = render(ui.SignUpButton, { href: "/login?callbackUrl=%2Fdashboard", surface: "home-vacancies", locale: l });
      expect(pending, l).toContain('<span class="su-cap">\u00a0</span>');
    }
    // Nothing in the stylesheet hides it with a mouse (it was a touch-only caption until 2 Oct 2026).
    const css = read("src/app/globals.css").replace(/\/\*[\s\S]*?\*\//g, "");
    const mouse = css.slice(css.indexOf("@media (hover: hover) and (pointer: fine) {"), css.indexOf("  .su-float {"));
    expect(mouse).not.toContain("su-cap");
    expect(css).toMatch(/\.su-wrap > \.su-cap \{\s*display: block;/);
    expect(css.match(/\.su-cap\b/g)).toHaveLength(1);
  });

  it("the full sentence stays the tooltip and the screen reader's description in EVERY mode", () => {
    const home = signUpWords("en", { surface: "home-signin", callback: "/dashboard" });
    expect(home).toEqual(signUpPlaceWords("en", { key: "door.home-signin" }));
    for (const explain of ["both", "own", "tooltip"]) {
      const html = render(ui.SignUpButton, { href: "/login?callbackUrl=%2Fdashboard", surface: "home-signin", explain, ...home });
      const id = html.match(/<a\b[^>]*\saria-describedby="([^"]+)"/)?.[1];
      expect(id, explain).toBeTruthy();
      expect(html, explain).toContain(`<span id="${id}" role="tooltip" class="su-tip-text">${home.text}</span>`);
      expect(/su-cap/.test(html), explain).toBe(explain === "both");
    }
  });

  it("a 22-language page: en / hi / te sign up, another language keeps its own 'Continue with Google' — and gets no English caption", () => {
    const ta = render(ui.SignUpButton, { href: "/login?callbackUrl=%2Fg%2Fabc&from=group-join", surface: "group-join", locale: "ta", continueLabel: "Google உடன் தொடரவும்" });
    expect(ta).toContain("<span>Google உடன் தொடரவும்</span>");
    expect(ta).not.toContain("su-cap");
    expect(ta).toMatch(/^<span class="su-wrap" data-su-explain="own">/);
    const hi = render(ui.SignUpButton, { href: "/login?callbackUrl=%2Fg%2Fabc&from=group-join", surface: "group-join", locale: "hi", continueLabel: "Google से जारी रखें" });
    expect(hi).toContain(`<span>${signUpLabel("hi")}</span>`);
    expect(hi).toContain('<span class="su-cap">');
    // The three pages that pass it take the words from /login's own key.
    for (const f of ["src/app/g/[token]/page.tsx", "src/app/discussions/[id]/page.tsx", "src/app/chat/page.tsx"]) {
      expect(code(f), f).toMatch(/continueLabel[=:]\s*\{?t\("login\.continue"\)/);
    }
    // The paper poll's labels are in the page's language, so its button is too: the three callers hand it
    // login.continue and the page's locale (it read the reader's en / hi / te cookie and showed English).
    for (const f of ["src/app/exams/[code]/cutoff/page.tsx", "src/components/ExamWeekBlock.tsx", "src/components/exam-phase/ExamNightFacts.tsx"]) {
      expect(code(f), f).toContain('continue: t("login.continue"),');
      expect(jsxTags(code(f), ["ExamVerdictPoll"])[0]?.text, f).toMatch(/\blocale=\{locale\}/);
    }
    const pollTag = jsxTags(code("src/components/ExamVerdictPoll.tsx"), ["SignUpButton"])[0]?.text ?? "";
    expect(pollTag).toContain("locale={locale ?? clientUiLocale()}");
    expect(pollTag).toContain("continueLabel={labels.continue}");
    // The gates' quiz-end button (it had no continueLabel: English in 19 languages while the gate's top button
    // read the page's own "Continue with Google").
    const gate = code("src/components/GuestQuizGate.tsx");
    expect(jsxTags(gate, ["GateSignInButton"])[0]?.text).toContain("continueLabel={continueLabel}");
    expect(code("src/app/mocks/[id]/MockGate.tsx")).toMatch(/signinSurface="mock-gate-quiz-end"\s+continueLabel=\{signInLabel\}/);
    expect(code("src/app/exams/[code]/build-mock/page.tsx")).toMatch(/signinSurface="build-gate-quiz-end"\s+continueLabel=\{tt\.t\("login\.continue"\)\}/);
    // Without continueLabel nothing changes: English for any other language, as before.
    expect(render(ui.SignUpButton, { href: "/login", surface: "vouch", locale: "ta" })).toContain("<span>Sign up with Google</span>");
  });
});

// ── D. the sign-up stays the main action ─────────────────────────────────

/** A block where the sign-up button sits beside or above another action:
 *  where the button is, which tag the alternative is, and its quiet form. */
const BESIDE: { file: string; signUp: string; alt: string; form: "outline" | "text" }[] = [
  { file: "src/app/exams/[code]/page.tsx", signUp: "<HubSignInLink", alt: "href={`/exams/${exam.code}/quiz`}", form: "outline" },
  { file: "src/app/exams/[code]/TryOneQuestion.tsx", signUp: "<SignUpButton", alt: "href={`/exams/${examCode}/quiz`}", form: "text" },
  { file: "src/app/exams/[code]/pyq/[year]/page.tsx", signUp: "<SignUpButton", alt: 'href={`/exams/${code}/quiz?set=${guestSet.join(",")}&n=${guestSet.length}`}', form: "text" },
  { file: "src/app/exams/[code]/pyq/[year]/page.tsx", signUp: "<SignUpButton", alt: "href={`/exams/${code}/quiz`}", form: "text" },
  { file: "src/components/AnonQuizPlayer.tsx", signUp: "<SignUpButton", alt: "href={tutorHref}", form: "outline" },
  { file: "src/app/c/[token]/ChallengeLanding.tsx", signUp: "<SignUpButton", alt: "href={`/exams/${data.examCode}/quiz`}", form: "outline" },
  { file: "src/app/for/[persona]/page.tsx", signUp: "<SignUpButton", alt: 'href="/exams/browse"', form: "outline" },
  { file: "src/app/login/page.tsx", signUp: "<GoogleSignInButton", alt: "href={`/exams/${examCode}/quiz`}", form: "outline" },
  // The cutoff page's green box: the sign-up first, the 10-question quiz link after it (it was first and filled
  // emerald until the review of 2 Oct 2026 — rule D has no exception).
  { file: "src/components/AnonExamNudge.tsx", signUp: "<SignUpButton", alt: "href={href}", form: "outline" },
  // The finder's bottom card for a guest: the sign-up first, "Start {exam} prep →" beside it.
  { file: "src/app/find-your-exam/page.tsx", signUp: "<SignUpButton", alt: "href={topHub}", form: "outline" },
  // The gates: the sign-in card comes first on the page; the quiz card's start button is below it.
  { file: "src/components/GuestQuizGate.tsx", signUp: "<GoogleSignInButton", alt: "ctaBeacon(beacons.start, { ...beaconProps, n });", form: "outline" },
];

describe("D. the sign-up stays the main action: it comes first, and the alternative beside it is quiet", () => {
  it.each(BESIDE.map((b) => [`${b.file} — ${b.alt.slice(0, 40)}`, b] as const))("%s", (_n, b) => {
    const src = code(b.file);
    const signUpAt = src.indexOf(b.signUp);
    expect(signUpAt).toBeGreaterThan(-1);
    // The alternative's own tag, after the sign-up button in the source.
    const tag = jsxTags(src, ["Link", "a", "button"]).find((t) => t.at > signUpAt && t.text.includes(b.alt));
    expect(tag, `no alternative after the sign-up button`).toBeTruthy();
    const cls = tag!.text.match(/className="([^"]*)"/)?.[1] ?? "";
    expect(cls.length).toBeGreaterThan(0);
    // Never a filled button, a saffron or 2 px outline, a tinted box or bold white words.
    expect(cls).not.toMatch(/btn-primary|bg-saffron|bg-emerald|bg-amber|border-2|border-saffron|text-white|font-bold/);
    if (b.form === "outline") {
      expect(cls).toMatch(/\bborder border-ink-300 bg-white\b/);
      expect(cls).toMatch(/\btext-ink-[78]00\b/);
    } else {
      // A small text link: no border, no fill.
      expect(cls).not.toMatch(/\bborder\b|\bbg-/);
      expect(cls).toMatch(/\btext-xs\b/);
    }
  });

  it("the home page's vacancies rail: the sign-up first for a guest, 'Find my exams' after it as a small text link; a member keeps the filled one", () => {
    const src = code("src/components/VacancyExplorer.tsx");
    const signUp = src.indexOf("<SignUpButton");
    const find = src.indexOf('href="/find-your-exam"', signUp);
    expect(signUp).toBeGreaterThan(-1);
    expect(find).toBeGreaterThan(signUp);
    expect(src.slice(find, find + 500)).toMatch(
      /signedIn === false\s*\? "block py-1 text-center text-xs font-semibold text-saffron-700 underline-offset-2 hover:underline"\s*: "block rounded-lg bg-saffron-500 px-3 py-2 text-center text-xs font-bold text-white hover:bg-saffron-600"/,
    );
    // Nothing was removed: the link is there for everyone, and goes where it went.
    expect(src).toContain("Which fit YOU? Find my exams →");
  });

  it("the cutoff page's nudge follows the rule too: the sign-up comes first, the quiz link after it is unfilled — and how to undo it is written down", () => {
    const src = code("src/components/AnonExamNudge.tsx");
    const reason = src.indexOf("<p data-su-reason");
    const signUp = src.indexOf("<SignUpButton");
    const quiz = src.indexOf("href={href}");
    expect(reason).toBeGreaterThan(-1);
    expect(signUp).toBeGreaterThan(reason);
    expect(quiz).toBeGreaterThan(signUp);
    expect(src).not.toMatch(/bg-emerald-[5-9]00|font-bold text-white/);
    // The quiz link is the same link: same destination, same beacon, same words.
    expect(src).toContain("const href = `/exams/${examCode}/quiz?n=10&from=cutoff`;");
    expect(src).toContain('onClick={() => beacon(`${surface}-click`, { surface, examCode, target: "anon-quiz" })}');
    expect(src).toContain("{cta || QUIZ_CTA}");
    // The tooltip opens above the button: the quiz link sits under it.
    expect(jsxTags(src, ["SignUpButton"])[0].text).toContain('side="top"');
    // Written down where the next reader looks: what to watch, and that the order is two elements to swap.
    const raw = read("src/components/AnonExamNudge.tsx");
    expect(raw).not.toContain("NOT CHANGED, and for the lead to decide");
    expect(raw).toContain("TO WATCH after this ships");
  });

  it("no alternative was removed and none goes anywhere else", () => {
    expect(code("src/app/exams/[code]/page.tsx")).toContain("Try a free 5-question quiz — no signup →");
    expect(code("src/app/exams/[code]/TryOneQuestion.tsx")).toContain("or try 5 more questions — no signup needed →");
    expect(code("src/app/login/page.tsx")).toContain('fillTemplate(t("login.tryFirst"), { exam: examCode.replace(/_/g, " ") })');
    expect(code("src/components/GuestQuizGate.tsx")).toContain("{fillTemplate(copy.start, vars)}");
    expect(code("src/app/for/[persona]/page.tsx")).toContain("Browse all exams instead");
    expect(code("src/app/find-your-exam/page.tsx")).toContain("Start {top.shortName} prep →");
  });
});

// ── E. counting ──────────────────────────────────────────────────────────

/** The doors converted in this build: file, door id, the href's from= tag
 *  (null where the old link carried none and still does not). */
const CONVERTED: { file: string; surface: string; from: string | null; keeps?: string }[] = [
  { file: "src/components/home/HomeSignIn.tsx", surface: "home-signin", from: null },
  { file: "src/app/live-test/page.tsx", surface: "live-test", from: "live-test" },
  { file: "src/app/g/[token]/page.tsx", surface: "group-join", from: "group-join" },
  { file: "src/components/VerificationPanel.tsx", surface: "verify-fact", from: "verify-fact" },
  { file: "src/components/VacancyExplorer.tsx", surface: "home-vacancies", from: "home-vacancies", keeps: "onSignInClick={nudgeClick}" },
  { file: "src/app/discussions/[id]/page.tsx", surface: "discussion-reply", from: "discussion-reply" },
  { file: "src/app/chat/ChatInterface.tsx", surface: "chat-banner", from: "chat-banner" },
  { file: "src/components/AnonExamNudge.tsx", surface: "cutoff-nudge", from: "cutoff-nudge", keeps: 'onSignInClick={() => beacon(`${surface}-signin-click`, { surface, examCode, target: "login" })}' },
  { file: "src/components/ExamVerdictPoll.tsx", surface: "verdict-poll", from: "verdict-poll" },
  { file: "src/app/community-vouching/[domain]/page.tsx", surface: "vouch", from: "vouch" },
  { file: "src/app/ideas/page.tsx", surface: "ideas-upvote", from: "ideas-upvote" },
  { file: "src/app/find-your-exam/page.tsx", surface: "finder-start", from: "finder-start" },
  { file: "src/app/mocks/[id]/GuestPaperPlayer.tsx", surface: "guest-paper", from: "guest-paper", keeps: 'onSignInClick={() => beacon("guest-paper-signin-click", { examCode: mock.examCode })}' },
  { file: "src/components/SoftWallClient.tsx", surface: "soft-wall", from: null, keeps: 'onSignInClick={() => beacon("softwall-signin-click", { bucket: "wall", surface: wall.family })}' },
];

describe("E. counting: one click, one \"signin-click\", under the door's own id", () => {
  it("the new door ids exist, are short kebab-case ids, are unique — and none is in the skip-/login test", () => {
    const ids = ["live-test", "group-join", "verify-fact", "home-vacancies", "discussion-reply", "chat-banner", "cutoff-nudge", "verdict-poll", "vouch", "ideas-upvote", "save-path", "guest-paper", "soft-wall", "descriptive-401", "finder-start"];
    for (const s of ids) {
      expect(isSigninSurface(s), s).toBe(true);
      expect(cleanFrom(s), s).toBe(s);
      expect(inDirectSigninTest(s), s).toBe(false);
    }
    expect(new Set(SIGNIN_SURFACES).size).toBe(SIGNIN_SURFACES.length);
    // Added at the end, before the fallback: the older ids keep their places.
    expect(SIGNIN_SURFACES.slice(0, 2)).toEqual(["header", "hub-box"]);
    expect(SIGNIN_SURFACES[SIGNIN_SURFACES.length - 1]).toBe("link");
    expect(SIGNIN_SURFACES.indexOf("live-test" as never)).toBeGreaterThan(SIGNIN_SURFACES.indexOf("finder-save" as never));
    // save-path's id is the tag its (not yet converted) link already carries — in the other unfinished work,
    // which may or may not be in the tree yet.
    const savedPath = path.join(ROOT, "src/lib/saved-path-core.ts");
    if (fs.existsSync(savedPath)) expect(fs.readFileSync(savedPath, "utf8")).toMatch(/SAVE_PATH_SIGNIN_FROM = "save-path"/);
  });

  it.each(CONVERTED.map((c) => [`${c.file} → ${c.surface}`, c] as const))("%s", (_n, c) => {
    const src = code(c.file);
    expect(src).toContain('import { SignUpButton } from "@/components/SignUpButton";');
    const tag = jsxTags(src, ["SignUpButton"]).find((t) => t.text.includes(`surface="${c.surface}"`));
    expect(tag, "the button with this door id").toBeTruthy();
    // The shared button is a SignInLink: it sends the one beacon and marks itself, so the root layout's
    // /login-link listener does not count the click again. No hand-made link, no label of its own.
    expect(src).not.toContain("<SignInLink");
    expect(tag!.text).not.toMatch(/\blabel=|\bchildren=/);
    if (c.from) expect(tag!.text).toMatch(new RegExp(`[?&]from=${c.from}\\b`));
    // An older beacon the door had still fires, on the same click.
    if (c.keeps) expect(tag!.text.replace(/\s+/g, " ")).toContain(c.keeps);
  });

  it("the rendered button counts itself once: data-signin-beacon=\"self\" and the door id on the link", () => {
    for (const c of CONVERTED) {
      const html = render(ui.SignUpButton, { href: `/login?callbackUrl=%2F${c.from ? `&from=${c.from}` : ""}`, surface: c.surface });
      const a = html.match(/<a\b[^>]*>/)?.[0] ?? "";
      expect(a, c.surface).toContain('data-signin-beacon="self"');
      expect(a, c.surface).toContain(`data-signin-surface="${c.surface}"`);
      // … which is what makes the layout listener skip it.
      const attrs: Record<string, string> = { href: `/login?callbackUrl=%2F`, "data-signin-beacon": "self", "data-signin-surface": c.surface };
      expect(signinCtaMod.signinLinkBeaconProps({ getAttribute: (n: string) => attrs[n] ?? null }, "https://shishya.in"), c.surface).toBeNull();
    }
  });

  it("every one still goes to /login (none joins the skip-/login test), to the page it went to before — but the two that had no page to return to", () => {
    const hrefs: [string, string][] = [
      ["src/components/home/HomeSignIn.tsx", 'href="/login?callbackUrl=%2Fdashboard"'],
      ["src/app/live-test/page.tsx", 'href="/login?callbackUrl=%2Flive-test&from=live-test"'],
      ["src/app/g/[token]/page.tsx", "href={`/login?callbackUrl=${encodeURIComponent(`/g/${group.token}`)}&from=group-join`}"],
      // 2 Oct 2026, later (decision): it returns to the page the panel was opened on (it had no callback and
      // landed on the dashboard); without a path it is the link it was.
      ["src/components/VerificationPanel.tsx", 'href={pathname && pathname.startsWith("/") && !pathname.startsWith("//") ? `/login?callbackUrl=${encodeURIComponent(pathname)}&from=verify-fact` : "/login?from=verify-fact"}'],
      ["src/components/VacancyExplorer.tsx", 'href={`/login?callbackUrl=${encodeURIComponent("/dashboard")}&from=home-vacancies`}'],
      ["src/app/discussions/[id]/page.tsx", "href={`/login?callbackUrl=${encodeURIComponent(`/discussions/${thread.id}`)}&from=discussion-reply`}"],
      ["src/app/chat/ChatInterface.tsx", "href={`${guestSignInHref}&from=chat-banner`}"],
      ["src/components/AnonExamNudge.tsx", "href={`/login?callbackUrl=${encodeURIComponent(`/exams/${examCode}`)}&from=cutoff-nudge`}"],
      ["src/components/ExamVerdictPoll.tsx", "href={`${loginHref}&from=verdict-poll`}"],
      // 2 Oct 2026, later (decision): it returns to this vouching page.
      ["src/app/community-vouching/[domain]/page.tsx", "href={`/login?callbackUrl=${encodeURIComponent(`/community-vouching/${dom}`)}&from=vouch`}"],
    ];
    for (const [file, href] of hrefs) expect(code(file), file).toContain(href);
  });

  it("the home page: the same door id as before, and its own delegated beacon still fires from the wrapper", () => {
    const home = code("src/components/home/HomeSignIn.tsx");
    expect(home).toMatch(
      /<div data-home-cta="signin"[^>]*>\s*<SignUpButton href="\/login\?callbackUrl=%2Fdashboard" surface="home-signin" locale=\{homeCopyLocaleOf\(copy\)\} \{\.\.\.signUpWords\(homeCopyLocaleOf\(copy\), \{ surface: "home-signin", callback: "\/dashboard" \}\)\} explain="own" center \/>\s*<\/div>/,
    );
    // … a wrapper only as wide as the button: a click on the empty space beside it is not a "signin" click.
    expect(home).toContain('<div data-home-cta="signin" className="mx-auto w-fit max-w-full">');
    expect(home).not.toMatch(/data-home-cta="signin" className="[^"]*\bflex\b/);
    // HomeBeacons finds the name on the closest ancestor of what was clicked.
    expect(read("src/components/home/HomeBeacons.tsx")).toContain('target?.closest?.("[data-home-cta]")');
    // The page itself did not have to change: the language comes from the copy it passes.
    expect(home).toContain('import { homeCopyLocaleOf } from "@/lib/home-ask-link";');
  });

  it("/descriptive: a guest's 401 trip to /login is counted now (it was the one door nothing counted)", () => {
    const src = code("src/app/descriptive/DescriptiveStudio.tsx");
    expect(src).toMatch(/if \(res\.status === 401\) \{[\s\S]{0,500}?signinBeacon\("descriptive-401", \{ via: "login" \}\);\s*router\.push\(loginHrefFor\("\/descriptive", "descriptive-401"\)\);/);
    expect(signinCtaMod.loginHrefFor("/descriptive", "descriptive-401" as never)).toBe("/login?callbackUrl=%2Fdescriptive&from=descriptive-401");
    // The draft is still kept for the return.
    expect(src).toContain('"shishya-descriptive-draft"');
  });

  it("every 401 trip to /login beacons its door (a push or a location change is not a link the listener sees)", () => {
    const hits: string[] = [];
    for (const f of TSX) {
      const src = code(f);
      if (!/(?:router\.push|window\.location\.href\s*=)\s*\(?\s*loginHrefFor\(/.test(src)) continue;
      if (!/signinBeacon\(/.test(src)) hits.push(f);
    }
    expect(hits).toEqual([]);
  });
});

// ── F. never where a child may be reading ────────────────────────────────

describe("F. minors: no newly converted placement can show on a Class 1-7 page or in an under-13 context", () => {
  it("no school page file renders a sign-up button, and none mounts a converted component — but the fact badge", () => {
    const converted = ["HomeSignIn", "VacancyExplorer", "AnonExamNudge", "ExamVerdictPoll", "ExamWeekBlock", "ExamNightFacts", "SoftWall", "SaveMatchesNudge", "GuestPaperPlayer"];
    for (const f of [...walk(path.join(ROOT, "src/app/schooling"), /\.tsx$/), ...walk(path.join(ROOT, "src/components/school"), /\.tsx$/)].map(rel)) {
      const src = code(f);
      if (f !== "src/components/school/SchoolStudentEntry.tsx") expect(src, f).not.toMatch(/<SignUpButton|<GoogleSignInButton/);
      for (const name of converted) expect(src, `${f} imports ${name}`).not.toMatch(new RegExp(`components/(?:[\\w-]+/)*${name}["']`));
    }
  });

  it("the routes of the converted pages are not school pages", () => {
    for (const p of ["/", "/live-test", "/g/abc123", "/discussions/abc", "/community-vouching/medicine", "/ideas", "/exams/SSC_CGL/cutoff", "/exams/SSC_CGL", "/colleges/iit-bombay", "/chat", "/find-your-exam", "/descriptive"]) {
      expect(isChildSchoolPath(p), p).toBe(false);
      expect(isUnder13SchoolPath(p), p).toBe(false);
    }
  });

  it("the fact panel CAN open on a board's hub (every class from 1): there a guest gets no sign-in sentence, no button, no tooltip", () => {
    // It is mounted there …
    expect(read("src/app/schooling/[slug]/page.tsx")).toMatch(/ClickableVerificationBadge|VerificationBadge/);
    for (const p of ["/schooling/cbse", "/schooling/tn-state-board", "/schooling", "/schooling/cbse/class-3"]) expect(isChildSchoolPath(p), p).toBe(true);
    // … and the panel itself refuses, by the page's path, before anything is rendered for a guest.
    const src = code("src/components/VerificationPanel.tsx");
    expect(src).toContain('import { usePathname } from "next/navigation";');
    expect(src).toContain('import { isChildSchoolPath } from "@/lib/signup-pitch";');
    expect(src).toContain("const childPage = isChildSchoolPath(pathname) || isUnder13SchoolPath(pathname ?? \"\");");
    expect(src).toMatch(/\{!signedIn \? \(\s*childPage \? null : \(\s*<div[^>]*>\s*<p data-su-reason/);
    // The one button in the file is inside that guard.
    expect(src.match(/<SignUpButton\b/g)).toHaveLength(1);
    expect(src.indexOf("childPage ? null : (")).toBeLessThan(src.indexOf("<SignUpButton"));
    // A college page still shows it.
    expect(isChildSchoolPath("/colleges/iit-bombay")).toBe(false);
  });

  it("the guest tutor's line: never in a school chat, gone (sentence and button) once a guest says they are under 13", () => {
    const chat = code("src/app/chat/ChatInterface.tsx");
    expect(chat).toContain("{guestBanner && guestSignInHref && !school && !under13 && (");
    // The server page no longer renders the sentence itself (it could not take it away).
    const page = code("src/app/chat/page.tsx");
    expect(page).not.toMatch(/<Link href=\{loginHref\}/);
    expect(page).not.toMatch(/<p[^>]*>\s*\{anonExamShort \? fillTemplate\(t\("chat\.guest\.leadExam"\)/);
    // It passes the line only in the guest branch — after the school branch has returned.
    expect(page.match(/guestBanner=\{\{/g)).toHaveLength(1);
    expect(page.indexOf("guestBanner={{")).toBeGreaterThan(page.indexOf("if (!session?.user?.id) {"));
    expect(page.indexOf("if (schoolCls !== null) {")).toBeLessThan(page.indexOf("if (!session?.user?.id) {"));
    const school = page.slice(page.indexOf("if (schoolCls !== null) {"), page.indexOf("if (!session?.user?.id) {"));
    expect(school).not.toMatch(/guestBanner|guestSignInHref/);
    // One invitation on a screen: the banner's button steps aside once the save card is up.
    // … once a reply has FINISHED (the one streaming now does not count), which is when the card comes up.
    expect(chat).toContain("const guestHasReply = messages.some((m, i) => m.role === \"assistant\" && m.content && !m.failed && !(busy && i === messages.length - 1));");
    // 7 Oct 2026 (B6): … and while the unanswered-question door is up.
    expect(chat).toMatch(/\{!guestHasReply && !questionDoorUp && \(\s*<SignUpButton\s+href=\{`\$\{guestSignInHref\}&from=chat-banner`\}/);
    // Its click keeps the chat for the new account like every /login link on the page (the capture listener).
    expect(chat).toContain("if (a && isLoginLink(a.getAttribute(\"href\"), location.origin)) keepGuestChatForSignIn();");
  });

  it("the cutoff nudge and the paper poll sit on real exams' pages only (a school class container is refused by the page)", () => {
    expect(read("src/app/exams/[code]/cutoff/page.tsx")).toContain("where: realExamKey({ code }),");
    // The wall (stopped) keeps its own path rule.
    expect(code("src/components/SoftWallClient.tsx")).toContain("if (!family || !pitchAllowedPath(path) || classifyClient(navigator.userAgent) === \"bot\") return;");
    for (const p of ["/schooling/cbse/class-5/maths", "/schooling", "/schooling/cbse"]) expect(pitchAllowedPath(p), p).toBe(false);
  });
});

// ── G. honesty ───────────────────────────────────────────────────────────

describe("G. honesty: the new reason lines say only what the code backs; lines that promised more are gone", () => {
  it("the four new lines, exactly, in English", () => {
    expect(signUpReason("en", "writePaper")).toBe("Sign up to write this paper — your score is saved to your account.");
    expect(signUpReason("en", "fullMocks")).toBe("Sign up for full mocks with your scores saved.");
    expect(signUpReason("en", "vacancies")).toBe("Prepping for one of these? Your tests and tutor chats are saved.");
    expect(signUpReason("en", "tryOne")).toBe("Sign up free: adaptive mocks with your scores saved, and Shishya tracks your weak topics. No credit card.");
    for (const l of ["ta", "", null, undefined]) expect(signUpReason(l, "fullMocks")).toBe(signUpReason("en", "fullMocks"));
    // A fifth (2 Oct 2026, later): the finder's bottom card keeps its line word for word — it was the old
    // tooltip sentence for an exam whose practice is not known, and lives with the reason lines now.
    expect(signUpReason("en", "startExam")).toBe("Sign up with your Google account, no forms. {exam} is set up as your exam the moment you sign up, and the AI tutor remembers where you left off.");
  });

  it("each makes claims from the allowed list only, says them in so many words, and the code that backs them is there", () => {
    expect(Object.keys(SIGNUP_REASON_CLAIMS).sort()).toEqual(["fullMocks", "startExam", "tryOne", "vacancies", "writePaper"]);
    for (const [key, r] of Object.entries(SIGNUP_REASON_CLAIMS)) {
      const en = signUpReason("en", key as copyMod.SignUpReason);
      expect(en, key).toContain(r.says);
      expect(r.claims.length, key).toBeGreaterThan(0);
      for (const claim of r.claims) {
        expect(Object.keys(SIGNUP_CLAIM_PROOF), claim).toContain(claim);
        for (const p of SIGNUP_CLAIM_PROOF[claim]) expect(read(p.file).includes(p.has), `${claim}: ${p.file}`).toBe(true);
      }
      expect(read(r.needs.file).includes(r.needs.has), `${key}: ${r.needs.file} has "${r.needs.has}"`).toBe(true);
    }
    // The cutoff line promises mocks: the page mounts the box only where the exam has practice.
    expect(read("src/app/exams/[code]/cutoff/page.tsx")).toMatch(/\{practice\.hasPractice && \(\s*<AnonExamNudge/);
    // The try-one line promises mocks and the weak-topic map: the hub mounts the card only for a guest and only
    // where it found a checked question of this exam.
    expect(read("src/app/exams/[code]/page.tsx")).toMatch(/\{!userId && sampleQuestion && \(\s*<TryOneQuestion/);
    expect(read("prisma/schema.prisma")).toContain("model WeaknessMap {");
    // The rail's line says what the general caption says — the same two claims, the same words.
    expect(signUpReason("en", "vacancies")).toContain(signUpPlaceWords("en", { key: "family.fallback" }).short.replace("No forms. ", ""));
  });

  it("Hindi and Telugu say the same in their own script; no banned word, no number, no rank in any language", () => {
    for (const key of ["writePaper", "fullMocks", "vacancies", "tryOne"] as const) {
      for (const l of SIGNUP_LOCALES) {
        // The product's name stays in Latin script in every language.
        const text = signUpReason(l, key).replace(/Shishya/g, "");
        expect(text.length, `${l}/${key}`).toBeGreaterThan(10);
        // One or two lines of small text; the try-one line is the card's own sentence and is longer.
        expect(text.length, `${l}/${key}`).toBeLessThan(key === "tryOne" ? 140 : 90);
        for (const w of SIGNUP_BANNED_WORDS) expect(text.toLowerCase(), `${l}/${key}: ${w}`).not.toContain(w);
        expect(text).not.toMatch(/\d|rank|#1|best|biggest|सबसे|అతిపెద్ద|→/i);
        if (l !== "en") {
          expect(text).not.toBe(signUpReason("en", key));
          expect(/[ऀ-ॿ]/.test(text)).toBe(l === "hi");
          expect(/[ఀ-౿]/.test(text)).toBe(l === "te");
          expect(text).not.toMatch(/[A-Za-z]{3,}/);
        }
      }
    }
  });

  it("the placements print them from the copy module — no page types its own", () => {
    expect(code("src/app/live-test/page.tsx")).toContain('<p data-su-reason className="text-xs text-ink-700">{signUpReason("en", "writePaper")}</p>');
    expect(code("src/components/AnonExamNudge.tsx")).toContain('{signUpReason(locale, "fullMocks")}');
    expect(code("src/components/VacancyExplorer.tsx")).toContain('<p data-su-reason className="text-center text-xs text-ink-700">{signUpReason(locale, "vacancies")}</p>');
    expect(code("src/app/exams/[code]/TryOneQuestion.tsx")).toMatch(/<p data-su-reason className="mt-1 text-xs text-ink-600">\s*\{signUpReason\(locale, "tryOne"\)\}\s*<\/p>/);
    expect(code("src/app/exams/[code]/cutoff/page.tsx")).toMatch(/<AnonExamNudge[\s\S]{0,400}?locale=\{locale\}\s+examShort=\{short\}/);
    // The copy module is still light: the header loads it on every page.
    expect(read("src/lib/signup-cta-copy.ts").match(/^import .*$/gm)).toEqual(['import { isUnder13SchoolPath, schoolContainerClassOf } from "@/lib/school/student-classes";']);
  });

  it("four lines that promised more than the site does are gone", () => {
    // The finder: nothing stores a guest's matches at sign-in, and no plan is set up by signing in.
    const finder = code("src/app/find-your-exam/SaveMatchesNudge.tsx");
    expect(finder).not.toMatch(/we&apos;ll save them|set up your daily prep plan|Don&apos;t lose these/);
    expect(finder).toContain("Sign up free — you come back to these same results, and your tests and tutor chats are saved.");
    // The batch invite: the measured median from /login to an account is 17 s, not "a second".
    const join = code("src/app/join/[inviteCode]/page.tsx");
    expect(join).not.toMatch(/takes a second/);
    expect(join).toContain("Use your Google account to join this batch — no forms to fill.");
    // The try-one card: not every hub with one checked question has a previous-year set.
    const tryOne = code("src/app/exams/[code]/TryOneQuestion.tsx");
    expect(tryOne).not.toMatch(/PYQs|Sign in free →/);
    // The paper poll: a guest's rating is stored anyway, and nothing compares a rating with an answer key.
    const poll = code("src/components/ExamVerdictPoll.tsx");
    expect(poll).not.toMatch(/\{labels\.nudge\}/);
    expect(poll).toMatch(/\{done && verdict && !signedIn && labels\.nudge && \(\s*<SignUpButton/);
  });

  it("/login's headings no longer say 'one tap away' — the route is the button, Google's chooser and its share screen", () => {
    for (const l of ["en", "hi", "te"] as const) {
      const d = i18nDict[l] as Record<string, string>;
      for (const k of ["login.intent.mock.h1", "login.intent.mock.h1Exam", "login.intent.mock.body", "login.intent.coach.h1", "login.intent.coach.body", "login.intent.chat.h1", "login.intent.school.h1", "login.h1", "login.body"]) {
        expect(d[k], `${l}/${k}`).toBeTruthy();
        expect(d[k], `${l}/${k}`).not.toMatch(/one tap|एक टैप|ఒక్క ట్యాప్/i);
      }
    }
    expect(i18nDict.en["login.intent.mock.h1"]).toBe("Your mock is one sign-up away");
    expect(i18nDict.en["login.intent.mock.h1Exam"]).toBe("Your {exam} mock is one sign-up away");
    // The plan needs the coach's three questions after sign-in: the heading says "to start it", not "one tap away".
    expect(i18nDict.en["login.intent.coach.h1"]).toBe("Your free day-by-day plan — sign up to start it");
    // The heading is what stands above /login's button for a mock, a PYQ set or a hub's practice.
    expect(read("src/app/login/page.tsx")).toContain('t("login.intent.mock.h1Exam")');
  });

  it("no line beside a button says 'one tap', and none of the new words is a promise the claims file forbids", () => {
    for (const f of [...new Set([...CONVERTED.map((c) => c.file), "src/app/find-your-exam/SaveMatchesNudge.tsx", "src/app/join/[inviteCode]/page.tsx", "src/app/exams/[code]/TryOneQuestion.tsx"])]) {
      const src = code(f).toLowerCase();
      for (const w of SIGNUP_BANNED_WORDS) expect(src.includes(w.toLowerCase()), `${f}: ${w}`).toBe(false);
    }
  });
});

// ── H. the review's fixes (2 Oct 2026, same night) ───────────────────────

describe("H. the review's fixes", () => {
  it("the home rail keeps its list: the guest footer is a line, the button and a text link (no caption), and a guest's rails are 2rem taller", () => {
    const panel = code("src/components/VacancyExplorer.tsx");
    const tag = jsxTags(panel, ["SignUpButton"])[0].text;
    // One reason line (the rail's own), no caption under the button: the footer's height comes out of the list.
    expect(tag).toContain('explain="own"');
    expect(tag).toContain("locale={locale}");
    expect(tag).toContain("block");
    // Rendered: no caption element, whatever the language.
    for (const l of SIGNUP_LOCALES) {
      const html = render(ui.SignUpButton, { href: "/login?callbackUrl=%2Fdashboard&from=home-vacancies", surface: "home-vacancies", locale: l, explain: "own", side: "top", block: true, center: true });
      expect(html, l).not.toContain("su-cap");
      expect(html, l).toContain(`<span>${signUpLabel(l)}</span>`);
    }
    // The rails: 26rem for a member (unchanged), 28rem for a guest, one constant for both rails so they stay level.
    const rails = code("src/components/home/HomeRails.tsx");
    expect(rails).toContain("const RAIL_MEMBER = `${RAIL_BOX} h-[26rem]`;");
    expect(rails).toContain("const RAIL_GUEST = `${RAIL_BOX} h-[28rem]`;");
    expect(rails).toContain("const RAIL = signedIn ? RAIL_MEMBER : RAIL_GUEST;");
    expect(rails.match(/className=\{RAIL\}|className=\{`\$\{RAIL\}/g)).toHaveLength(2);
    // The arithmetic the comment gives, so a later change to the footer is re-counted: padding and border 25,
    // one line of text-xs 16, gap 6, button 44, margin 4, text link 16 + 8 = 119 px; the old two bars were 99 px.
    const footer = 25 + 16 + 6 + 44 + 4 + 24;
    expect(footer).toBe(119);
    expect(panel).toContain('<div className="mb-1">');
    expect(panel).toContain('className="mt-1.5"');
    expect(footer - 99).toBeLessThanOrEqual(32); // 2rem
  });

  it("the home page's twins: the rail's sign-up line and button follow the page's language", () => {
    const rails = code("src/components/home/HomeRails.tsx");
    expect(rails).toContain('import { homeCopyLocaleOf } from "@/lib/home-ask-link";');
    expect(rails).toContain("<VacancyExplorerPanel data={vacancy} signedIn={signedIn} locale={homeCopyLocaleOf(copy)} />");
    expect(/[ऀ-ॿ]/.test(signUpReason("hi", "vacancies"))).toBe(true);
    expect(/[ఀ-౿]/.test(signUpReason("te", "vacancies"))).toBe(true);
    // The hub's try-one card: the page hands its language down.
    expect(code("src/app/exams/[code]/page.tsx")).toMatch(/<TryOneQuestion[\s\S]{0,200}?locale=\{locale\}/);
    expect(jsxTags(code("src/app/exams/[code]/TryOneQuestion.tsx"), ["SignUpButton"])[0].text).toContain("locale={locale}");
  });

  it("the finder's bottom card: a guest gets the button first and the copy module's own sentence — no 'lock your exam', no 'daily plan'", () => {
    const src = code("src/app/find-your-exam/page.tsx");
    // The reason is the allowed sentence for a sign-in that returns to that exam's hub; it fails closed.
    // 2 Oct 2026, later: the LINE is kept word for word (the reason line "startExam"); the button's TOOLTIP is
    // the door's own entry of the table (door.finder-start), resolved here on the server.
    expect(src).toContain('const topSignUp = top && topHub ? signUpWords("en", { surface: "finder-start", callback: topHub, exam: top.shortName, examCode: top.code }) : null;');
    expect(src).toContain('const topNamed = top && topHub ? signUpContextFor({ callback: topHub, exam: top.shortName, examCode: top.code }).kind === "exam" : false;');
    expect(src).toContain('const topReason = top && topSignUp ? (topNamed ? signUpReason("en", "startExam").replace("{exam}", top.shortName.trim()) : topSignUp.text) : null;');
    expect(src).toContain("const topHub = top ? `/exams/${top.code}` : null;");
    const guest = src.slice(src.indexOf("{!signedIn && top && topHub && topReason ? ("), src.indexOf(") : (", src.indexOf("{!signedIn && top && topHub && topReason ? (")));
    expect(guest).toMatch(/<p data-su-reason className="mt-1 text-sm text-ink-600">\s*\{topReason\} Everything free — no coaching fees\.\s*<\/p>/);
    expect(guest).not.toMatch(/lock your exam|daily plan|mock tests|btn-primary|bg-saffron/);
    const tag = jsxTags(guest, ["SignUpButton"])[0].text;
    expect(tag).toContain("href={`/login?callbackUrl=${encodeURIComponent(topHub)}&from=finder-start`}");
    expect(tag).toContain('explain="own"');
    expect(tag).toContain("{...topSignUp}");
    // What the line says for a real exam, and for a code sign-up would not enrol.
    const ctx = copyMod.signUpContextFor({ callback: "/exams/SSC_CGL", exam: "SSC CGL", examCode: "SSC_CGL", practice: false });
    expect(ctx.kind).toBe("exam");
    expect(signUpReason("en", "startExam").replace("{exam}", "SSC CGL")).toBe("Sign up with your Google account, no forms. SSC CGL is set up as your exam the moment you sign up, and the AI tutor remembers where you left off.");
    expect(copyMod.signUpContextFor({ callback: "/exams/browse", exam: "Browse", examCode: "browse", practice: false })).toEqual({ kind: "general" });
    // The tooltip: the door's own entry — "where it has practice …": this page does not read the exam's practice.
    expect(signUpWords("en", { surface: "finder-start", callback: "/exams/SSC_CGL", exam: "SSC CGL", examCode: "SSC_CGL" })).toEqual(signUpPlaceWords("en", { key: "door.finder-start", vars: { exam: "SSC CGL" } }));
    expect(signUpWords("en", { surface: "finder-start", callback: "/exams/browse", exam: "Browse", examCode: "browse" })).toEqual(signUpPlaceWords("en", { key: "family.fallback" }));
    // A signed-in visitor's card is the old one, word for word.
    const member = src.slice(src.indexOf(") : (", src.indexOf("{!signedIn && top && topHub && topReason ? (")));
    expect(member).toContain("Sign in free to lock your exam, get a daily plan, mock tests and an AI tutor in your");
    expect(member).toContain('className="btn-primary mt-3 inline-block !py-2 !px-4 text-sm"');
    // The session is read on this branch only (results with at least one match), as before.
    expect(src).toContain("if (hasAnswers && eligible.length > 0) {");
    // With one match the nudge above no longer reads "one of these 1?".
    expect(code("src/app/find-your-exam/SaveMatchesNudge.tsx")).toContain('{matchCount === 1 ? "Preparing for this exam?" : `Preparing for one of these ${matchCount}?`}');
  });

  it("/live-test's sign-up is not greeted 'Welcome back': from=live-test gets the general card", () => {
    expect(loginIntent("/live-test", "live-test").kind).toBeNull();
    expect(loginIntent("/live-test").kind).toBe("return");
    expect(code("src/app/live-test/page.tsx")).toContain('href="/login?callbackUrl=%2Flive-test&from=live-test"');
    // /login hands its ?from= to the rule.
    expect(read("src/app/login/page.tsx")).toContain("const li = loginIntent(cb, sp.from);");
  });

  it("the gates count a sign-in click only when the BUTTON is clicked — not the caption under it, not the margin", () => {
    const gate = code("src/components/GuestQuizGate.tsx");
    expect(gate).not.toContain("onClickCapture={() => signinBeacon(");
    expect(gate).toMatch(/onClickCapture=\{\(e\) => \{\s*const button = \(e\.target as Element \| null\)\?\.closest\?\.\("button"\);\s*if \(button && !\(button as HTMLButtonElement\)\.disabled\) signinBeacon\(surface, \{ \.\.\.beaconProps, via: "google" \}\);\s*\}\}/);
    // One beacon call in the file, same ids and props as before.
    expect(gate.match(/signinBeacon\(/g)).toHaveLength(1);
    // The caption IS inside that wrapper (which is why the handler has to look): rendered, it follows the button.
    const gateWords = signUpWords("en", { surface: "mock-gate", callback: "/mocks/abcd1234?from=signin", exam: "SSC CGL", examCode: "SSC_CGL" });
    expect(gateWords).toEqual(signUpPlaceWords("en", { key: "door.mock-gate", vars: { exam: "SSC CGL" } }));
    const html = render(googleBtn.GoogleSignInButton, { callbackUrl: "/mocks/abcd1234?from=signin", locale: "en", continueLabel: "Continue with Google", exam: "SSC CGL", examCode: "SSC_CGL", ...gateWords, surface: "mock-gate", side: "top" });
    expect(html).toMatch(/<\/button><span class="su-cap">[^<]+<\/span>/);
  });

  it("one reason at the try-one card, and the revision pitch no longer promises 'forever'", () => {
    const tryOne = code("src/app/exams/[code]/TryOneQuestion.tsx");
    expect(jsxTags(tryOne, ["SignUpButton"])[0].text).toContain('explain="own"');
    expect(tryOne.match(/\bdata-su-reason\b/g)).toHaveLength(1);
    const revision = code("src/app/revision/page.tsx");
    expect(revision).not.toMatch(/Free forever/);
    expect(revision).toContain("Free · every exam on Shishya · your notebook fills itself from your very first mock.");
  });

  it("the search row that opens /login reads 'Sign up with Google' and is still found by 'sign in' and 'login'", () => {
    const row = read("src/lib/search/landings.ts").split("\n").find((l) => l.includes('path: "/login"')) ?? "";
    expect(row).toContain('title: "Sign up with Google"');
    expect(row).toContain('sub: "Free, with your Google account — no forms. Members sign in here too."');
    for (const term of ['"sign in"', '"sign up"', '"login"', '"log in"']) expect(row, term).toContain(term);
    for (const w of SIGNUP_BANNED_WORDS) expect(row.toLowerCase().includes(w.toLowerCase()), w).toBe(false);
  });

  it("no script sends a guest to /login with a typed address: every push or location change goes through loginHrefFor (and so names its door)", () => {
    const hits: string[] = [];
    for (const f of [...walk(path.join(ROOT, "src"), /\.tsx?$/)].map(rel)) {
      const src = code(f);
      // router.push("/login…"), router.replace(`/login…`), location.href = "/login…", location.assign("/login…")
      if (/(?:router\.(?:push|replace)|location\.(?:assign|replace))\(\s*["'`]\/login(?![\w-])/.test(src)) hits.push(`${f}: router / location call`);
      if (/location(?:\.href)?\s*=\s*["'`]\/login(?![\w-])/.test(src)) hits.push(`${f}: location assignment`);
    }
    expect(hits).toEqual([]);
  });
});
