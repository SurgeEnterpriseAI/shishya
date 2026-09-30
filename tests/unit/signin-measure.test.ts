// Sign-up build 1 (30 Sep 2026): measurement and the sign-up path.
//
// Pins, with no DB and no network:
//   (a) MEASURE — every sign-in door sends ONE CTA_CLICKED
//       { cta: "signin-click", surface: <stable id> }; /login's Google button
//       sends "login-google-click" with the callback family, ?from= and an
//       in-app flag; the SIGNUP event's props carry the callback family and
//       path and the first landing path (src/lib/signin-cta.ts);
//   (b) /login — the Google button first, the in-app escape line only in
//       webviews, honest copy (no "5 seconds", no "opens straight away", no
//       "rank", no result-day email line; the founder's "makes Shishya yours"
//       words), the one-request hand-off (src/lib/google-handoff.ts);
//   (c) the skip-/login 50/50 test (src/lib/direct-signin-ab.ts): a stable
//       localStorage bucket, a kill switch, only in-page buttons;
//   (d) the header's "Sign in free" (en / hi / te) with a 44 px tap target,
//       still hidden on Class 1-7 pages;
//   (e) HUB START — the hub box's sign-in returns to ?start=practice and the
//       guarded auto-start keeps the promise without surprising a returning
//       member.
// Run: npx vitest run tests/unit/signin-measure.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  callbackOfLoginHref,
  cleanFrom,
  cookieHasLanding,
  HEADER_SIGNIN_LABEL,
  hubAutoStart,
  isSigninSurface,
  LANDING_COOKIE,
  landingCookieString,
  loginCallbackFamily,
  loginHrefFor,
  parseLandingCookie,
  SIGNIN_CTA,
  SIGNIN_SURFACES,
  signinBeacon,
  signinLinkBeaconProps,
  signupEventProps,
  sitePathOnly,
} from "@/lib/signin-cta";
import { chromeIntentUrl, IN_APP_COPY, inAppBody, inAppBrowser } from "@/lib/in-app-browser";
import {
  DIRECT_SIGNIN_AB_KEY,
  DIRECT_SIGNIN_SURFACES,
  DIRECT_SIGNIN_TEST_ON,
  inDirectSigninTest,
  readOrAssignDirectBucket,
  signinRoute,
} from "@/lib/direct-signin-ab";
import { dict } from "@/lib/i18n";
import { MOCK_GATE_COPY } from "@/lib/mock-gate-copy";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");
/** Source without comments (the dated comments name the old click names on purpose). */
const code = (p: string) =>
  read(p)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

// next-auth's client, for the hand-off tests (src/lib/google-handoff.ts).
const na = vi.hoisted(() => ({ getCsrfToken: vi.fn(), signIn: vi.fn() }));
vi.mock("next-auth/react", () => na);

// ── user agents ──────────────────────────────────────────────────────
const UA = {
  chromeAndroid: "Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36",
  safariIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
  chromeIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/128.0.6613.98 Mobile/15E148 Safari/604.1",
  desktop: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
  instagramIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 342.0.0.33.97 (iPhone14,5; iOS 17_5; en_IN; en)",
  instagramAndroid: "Mozilla/5.0 (Linux; Android 13; RMX3085 Build/TP1A.220905.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36 Instagram 346.0.0.34.94 Android",
  facebookIos: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/476.0.0.37.109;FBBV/630012345]",
  facebookAndroid: "Mozilla/5.0 (Linux; Android 13; SM-M325F Build/TP1A.220624.014; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/477.0.0.49.83;]",
  linkedin: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [LinkedInApp]/9.30.1",
  line: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Safari Line/14.10.0",
  snapchat: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Snapchat/13.5.0.37 (like Safari/8618.2.12.10.9, panda)",
  androidWebView: "Mozilla/5.0 (Linux; Android 12; Redmi Note 10 Build/SKQ1.210908.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.127 Mobile Safari/537.36",
};

describe("(a) the sign-in beacon: one CTA_CLICKED { cta: signin-click, surface }", () => {
  let sent: { url: string; body: Blob }[];
  beforeEach(() => {
    sent = [];
    vi.stubGlobal("navigator", { sendBeacon: (url: string, body: Blob) => (sent.push({ url, body }), true) });
    vi.stubGlobal("location", { pathname: "/exams/SSC_CGL" });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends exactly one event with the fixed cta and the stable surface id (the surface wins over extras)", async () => {
    signinBeacon("hub-box", { examCode: "SSC_CGL", surface: "spoofed", bucket: "direct" });
    expect(sent).toHaveLength(1);
    expect(sent[0].url).toBe("/api/analytics");
    const body = JSON.parse(await sent[0].body.text());
    expect(body).toEqual({
      kind: "CTA_CLICKED",
      path: "/exams/SSC_CGL",
      props: { cta: SIGNIN_CTA, examCode: "SSC_CGL", surface: "hub-box", bucket: "direct" },
    });
    expect(SIGNIN_CTA).toBe("signin-click");
  });

  it("the surface ids are unique, kebab-case and cover every door this build wired", () => {
    expect(new Set(SIGNIN_SURFACES).size).toBe(SIGNIN_SURFACES.length);
    for (const s of SIGNIN_SURFACES) expect(s).toMatch(/^[a-z0-9-]{1,32}$/);
    for (const s of ["header", "hub-box", "hub-try-one", "hub-start-401", "subject-test-401", "topic-quiz-401", "custom-mock-401", "pyq-year", "quiz-end", "build-mock-form", "signup-pitch", "signup-inline", "signup-nudge", "mock-gate", "mock-gate-quiz-end", "build-gate-quiz-end", "home-signin", "link"]) {
      expect(isSigninSurface(s), s).toBe(true);
    }
    expect(isSigninSurface("hub-signin-practice")).toBe(false);
  });

  it("a plain link to /login is counted once, by the layout listener; a self-beaconing button is not", () => {
    const el = (attrs: Record<string, string>) => ({ getAttribute: (n: string) => attrs[n] ?? null });
    const origin = "https://shishya.in";
    expect(signinLinkBeaconProps(el({ href: "/login?callbackUrl=%2Fexams%2FSSC_CGL&from=header", "data-signin-surface": "header" }), origin)).toEqual({
      surface: "header",
      callbackFamily: "exam",
      from: "header",
    });
    expect(signinLinkBeaconProps(el({ href: "/login?callbackUrl=%2Fdashboard", "data-signin-surface": "home-signin" }), origin)).toEqual({
      surface: "home-signin",
      callbackFamily: "dashboard",
    });
    // Untagged (a page this build did not touch) → "link"; unknown tag → "link".
    expect(signinLinkBeaconProps(el({ href: "/login?callbackUrl=%2Fcoach" }), origin)).toMatchObject({ surface: "link", callbackFamily: "coach" });
    expect(signinLinkBeaconProps(el({ href: "/login", "data-signin-surface": "made-up" }), origin)).toMatchObject({ surface: "link", callbackFamily: "none" });
    // SignInLink beacons itself (bucket, via) — never twice.
    expect(signinLinkBeaconProps(el({ href: "/login?callbackUrl=%2F", "data-signin-beacon": "self" }), origin)).toBeNull();
    // Not a sign-in: other pages, /login/institution, another host, no element.
    expect(signinLinkBeaconProps(el({ href: "/exams/SSC_CGL" }), origin)).toBeNull();
    expect(signinLinkBeaconProps(el({ href: "/login/institution" }), origin)).toBeNull();
    expect(signinLinkBeaconProps(el({ href: "https://evil.example/login" }), origin)).toBeNull();
    expect(signinLinkBeaconProps(null, origin)).toBeNull();
    // A junk from= never rides on the row.
    expect(signinLinkBeaconProps(el({ href: "/login?from=%3Cscript%3E" }), origin)).not.toHaveProperty("from");
  });

  it("callback families are the /login page view's own (moved, not changed)", () => {
    expect(loginCallbackFamily(null)).toBe("none");
    expect(loginCallbackFamily("/exams/SSC_CGL/pyq/2024")).toBe("pyq");
    expect(loginCallbackFamily("/mocks/abc")).toBe("mock");
    expect(loginCallbackFamily("/coach?exam=X")).toBe("coach");
    expect(loginCallbackFamily("/dashboard")).toBe("dashboard");
    expect(loginCallbackFamily("https://shishya.in/exams/SSC_CGL?start=practice")).toBe("exam");
    expect(loginCallbackFamily("/chat?general=1")).toBe("other");
    // AnalyticsTracker re-exports the same function for existing importers.
    const tracker = read("src/components/AnalyticsTracker.tsx");
    expect(tracker).toContain("export { loginCallbackFamily };");
    expect(tracker).not.toMatch(/export function loginCallbackFamily/);
  });

  it("from= ids and link builders", () => {
    expect(cleanFrom("hub-box")).toBe("hub-box");
    expect(cleanFrom("Hub Box")).toBeNull();
    expect(cleanFrom("x".repeat(40))).toBeNull();
    expect(cleanFrom(undefined)).toBeNull();
    expect(loginHrefFor("/exams/SSC_CGL?start=diagnostic", "hub-start-401")).toBe("/login?callbackUrl=%2Fexams%2FSSC_CGL%3Fstart%3Ddiagnostic&from=hub-start-401");
    expect(loginHrefFor("//evil.example", "quiz-end")).toBe("/login?callbackUrl=%2F&from=quiz-end");
    expect(callbackOfLoginHref("/login?callbackUrl=%2Fexams%2FSSC_CGL%3Fstart%3Dpractice&from=hub-box")).toBe("/exams/SSC_CGL?start=practice");
    expect(callbackOfLoginHref("/login")).toBe("/");
    expect(callbackOfLoginHref("/login?callbackUrl=https%3A%2F%2Fevil.example")).toBe("/");
    expect(callbackOfLoginHref("/login?callbackUrl=%2F%2Fevil.example")).toBe("/");
  });
});

describe("(a) the SIGNUP event: where the account was made from", () => {
  it("sitePathOnly keeps a same-site path only (no query, no hash, capped)", () => {
    expect(sitePathOnly("https://shishya.in/exams/SSC_CGL?start=practice#x")).toBe("/exams/SSC_CGL");
    expect(sitePathOnly("http://localhost:3000/chat?examCode=SSC_CGL")).toBe("/chat");
    expect(sitePathOnly("/exams/SSC_CGL/pyq/2024")).toBe("/exams/SSC_CGL/pyq/2024");
    expect(sitePathOnly("https://evil.example/exams/SSC_CGL")).toBeNull();
    expect(sitePathOnly(null)).toBeNull();
    expect(sitePathOnly("/" + "a".repeat(300))?.length).toBe(120);
  });

  it("the first-landing cookie: path only, 30 days, round-trips, never a query", () => {
    expect(LANDING_COOKIE).toBe("shishya_land");
    const c = landingCookieString("/exams/SSC_CGL/cutoff", true)!;
    expect(c).toBe("shishya_land=%2Fexams%2FSSC_CGL%2Fcutoff; Path=/; Max-Age=2592000; SameSite=Lax; Secure");
    expect(landingCookieString("/x", false)).not.toContain("Secure");
    const raw = c.split(";")[0].split("=")[1];
    expect(parseLandingCookie(raw)).toBe("/exams/SSC_CGL/cutoff");
    expect(cookieHasLanding("a=1; shishya_land=%2F; b=2")).toBe(true);
    expect(cookieHasLanding("a=1; b=2")).toBe(false);
    expect(parseLandingCookie("%E0%A4%A")).toBeNull();
    expect(parseLandingCookie(encodeURIComponent("https://evil.example/x"))).toBeNull();
    expect(parseLandingCookie(encodeURIComponent("//evil.example/x"))).toBeNull();
  });

  it("signupEventProps: provider (+ school) as before, plus family, path and landing", () => {
    expect(signupEventProps({ school: false, callback: null, landing: null })).toEqual({ provider: "google", callbackFamily: "none" });
    expect(
      signupEventProps({ school: false, callback: "https://shishya.in/exams/SSC_CGL?start=practice", landing: encodeURIComponent("/exams/SSC_CGL/syllabus") }),
    ).toEqual({ provider: "google", callbackFamily: "exam", callbackPath: "/exams/SSC_CGL", landingPath: "/exams/SSC_CGL/syllabus" });
    expect(signupEventProps({ school: true, callback: "https://shishya.in/schooling/cbse/class-9", landing: null })).toEqual({
      provider: "google",
      school: true,
      callbackFamily: "other",
      callbackPath: "/schooling/cbse/class-9",
    });
    // Small: well under /api/analytics' 1 KB props cap even at the path caps.
    const big = signupEventProps({ school: true, callback: "https://shishya.in/" + "a".repeat(500), landing: encodeURIComponent("/" + "b".repeat(500)) });
    expect(JSON.stringify(big).length).toBeLessThan(400);
  });

  it("auth.ts writes those props on the SIGNUP row (tests/unit/auth-welcome-school.test.ts runs it)", () => {
    const auth = read("src/lib/auth.ts");
    expect(auth).toContain("props: signupEventProps({ school: schoolSignIn, callback: signInCallback, landing: await readFirstLandingCookie() }),");
    expect(auth).toContain('import { LANDING_COOKIE, signupEventProps } from "./signin-cta";');
  });

  it("the tracker writes the landing once, never on a Class 1-7 page", () => {
    const src = read("src/components/AnalyticsTracker.tsx");
    const at = src.indexOf("if (!cookieHasLanding(document.cookie)) {");
    expect(at).toBeGreaterThan(-1);
    expect(src.slice(src.lastIndexOf("if (!child) {", at), at)).toContain("if (!child) {");
    expect(src).toContain('const c = landingCookieString(pathname, location.protocol === "https:");');
  });
});

describe("(a) /login measurement: the page view and the Google button", () => {
  it("the /login PAGE_VIEW carries from= and the in-app family next to callbackFamily", () => {
    const src = read("src/components/AnalyticsTracker.tsx");
    expect(src).toContain('const from = pathname === "/login" ? cleanFrom(searchParams?.get("from")) : null;');
    expect(src).toMatch(/const inApp = pathname === "\/login" \? inAppBrowser\(/);
    expect(src).toContain("...(from ? { from } : {}),");
    expect(src).toContain("...(inApp ? { inApp } : {}),");
  });

  it("the layout's /login-link listener skips Class 1-7 pages and self-beaconing buttons", () => {
    const src = read("src/components/AnalyticsTracker.tsx");
    const listener = src.slice(src.indexOf("const onClick = (e: MouseEvent) => {"), src.indexOf('document.addEventListener("click", onClick, true);'));
    expect(listener).toContain("if (isUnder13SchoolPath(window.location.pathname)) return;");
    expect(listener).toContain("signinLinkBeaconProps(el, window.location.origin)");
    expect(listener).toContain('signinBeacon(surface, { ...rest, via: "login" });');
  });

  it("GoogleSignInButton: login-google-click only when /login passes `beacon`; the gate's wrapper sends signin-click", () => {
    const btn = read("src/components/GoogleSignInButton.tsx");
    expect(btn).toMatch(/if \(beacon\) \{[\s\S]{0,400}ctaBeacon\(LOGIN_GOOGLE_CTA, \{[\s\S]{0,200}surface: beacon\.family \?\? loginCallbackFamily\(callbackUrl\)/);
    expect(btn).toContain("...(inApp ? { inApp } : {}),");
    const login = read("src/app/login/page.tsx");
    expect(login).toContain("beacon={{ from: sp.from ?? null, family: loginCallbackFamily(sp.callbackUrl) }}");
    const gate = read("src/components/GuestQuizGate.tsx");
    expect(gate).toContain('onClickCapture={() => signinBeacon(surface, { ...beaconProps, via: "google" })}');
    expect(gate).toMatch(/<GoogleSignInButton callbackUrl=\{callbackUrl\} label=\{label\} \/>/);
    expect(code("src/components/GuestQuizGate.tsx")).not.toMatch(/mock-gate-signin-click|build-gate-signin-click/);
    expect(read("src/app/mocks/[id]/MockGate.tsx")).toContain('surface="mock-gate"');
    expect(read("src/app/mocks/[id]/MockGate.tsx")).toContain('signinSurface="mock-gate-quiz-end"');
    expect(read("src/app/exams/[code]/build-mock/page.tsx")).toContain('signinSurface="build-gate-quiz-end"');
  });
});

describe("(a) every door is wired to its surface id", () => {
  const signInLink = (file: string, surface: string) => {
    const src = read(file);
    expect(src, file).toContain('import { SignInLink } from "@/components/SignInLink";');
    expect(src, file).toContain(`surface="${surface}"`);
  };

  it("in-page buttons use the shared SignInLink", () => {
    signInLink("src/app/exams/[code]/StartMockButton.tsx", "hub-box");
    signInLink("src/app/exams/[code]/TryOneQuestion.tsx", "hub-try-one");
    signInLink("src/app/exams/[code]/pyq/[year]/page.tsx", "pyq-year");
    signInLink("src/app/exams/[code]/build-mock/BuilderForm.tsx", "build-mock-form");
    signInLink("src/components/AnonQuizPlayer.tsx", "quiz-end");
    signInLink("src/components/SignupPitch.tsx", "signup-pitch");
    signInLink("src/components/SignupInline.tsx", "signup-inline");
    signInLink("src/components/SignupNudge.tsx", "signup-nudge");
  });

  it("the old per-button click names are gone from these files (one beacon per click)", () => {
    expect(code("src/app/exams/[code]/StartMockButton.tsx")).not.toMatch(/hub-signin-practice|"diagnostic-401"/);
    expect(code("src/components/SignupPitch.tsx")).not.toContain("signup-pitch-click");
    expect(code("src/components/SignupInline.tsx")).not.toContain("signup-inline-click");
    expect(code("src/components/SignupNudge.tsx")).not.toContain('beacon("clicked")');
  });

  it("the 401 redirects beacon their own surface and name the door on /login", () => {
    for (const [file, surface] of [
      ["src/app/exams/[code]/StartMockButton.tsx", "hub-start-401"],
      ["src/app/exams/[code]/SubjectTestButton.tsx", "subject-test-401"],
      ["src/app/exams/[code]/topics/[topicCode]/TopicQuizButton.tsx", "topic-quiz-401"],
      ["src/app/exams/[code]/CustomMockBuilder.tsx", "custom-mock-401"],
    ]) {
      const src = read(file);
      expect(src, file).toMatch(new RegExp(`if \\(res\\.status === 401\\) \\{[\\s\\S]{0,400}?signinBeacon\\("${surface}"[\\s\\S]{0,200}?window\\.location\\.href = loginHrefFor\\([^\\n]*"${surface}"\\);`));
    }
  });

  it("server-rendered links are tagged for the layout listener", () => {
    expect(read("src/components/HeaderAuthControls.tsx")).toContain('data-signin-surface="header"');
    expect(read("src/components/home/HomeSignIn.tsx")).toContain('data-signin-surface="home-signin"');
  });
});

describe("SignInLink: the no-JS link stays, the click decides", () => {
  const src = read("src/components/SignInLink.tsx");

  it("renders the caller's /login link (no-JavaScript fallback) and marks itself for the listener", () => {
    expect(src).toMatch(/<Link\s+href=\{href\}\s+prefetch=\{false\}/);
    expect(src).toContain('data-signin-beacon="self"');
  });

  it("one beacon per click, with bucket, via and in-app flag; Google only on the direct route", () => {
    const click = src.slice(src.indexOf("const onClick = "), src.indexOf("return (\n    <Link"));
    expect(click.match(/signinBeacon\(/g)).toHaveLength(1);
    expect(click).toContain("...(plan.bucket ? { bucket: plan.bucket } : {}),");
    expect(click).toContain("...(plan.inApp ? { inApp: plan.inApp } : {}),");
    // A new-tab click (modifier / middle button) keeps the link.
    expect(click).toContain('const via = modified ? "login" : plan.via;');
    expect(click).toMatch(/if \(via !== "google"\) return;\s*e\.preventDefault\(\);/);
    expect(click).toContain("m.goToGoogle(callbackUrl)");
    // A chunk that fails to load still reaches /login.
    expect(click).toMatch(/\.catch\(\(\) => \{[\s\S]{0,200}window\.location\.href = href;/);
  });

  it("the hand-off (next-auth/react) loads on intent, never with the root layout's pitch and nudge", () => {
    // 30 Sep 2026 review: a static import put ~11 KB gzipped of next-auth on
    // every page via SignupPitch / SignupNudge in the root layout.
    expect(src).toContain('const loadHandoff = () => import("@/lib/google-handoff");');
    expect(src).not.toMatch(/^import[^\n]*@\/lib\/google-handoff/m);
    expect(src).toContain("void loadHandoff().then((m) => m.warmGoogleHandoff()).catch(() => {});");
    const staticNextAuth = /from\s+["'](?:@\/lib\/google-handoff|next-auth\/react)["']|^import\s+["']next-auth\/react["']/m;
    for (const file of [
      "src/components/SignInLink.tsx",
      "src/components/SignupPitch.tsx",
      "src/components/SignupNudge.tsx",
      "src/components/AnalyticsTracker.tsx",
      "src/lib/signin-cta.ts",
      "src/lib/direct-signin-ab.ts",
      "src/lib/in-app-browser.ts",
      "src/lib/session-hint.ts",
      "src/lib/signup-pitch.ts",
    ]) {
      expect(read(file), file).not.toMatch(staticNextAuth);
    }
    expect(read("src/app/layout.tsx")).toContain('import { SignupPitch } from "@/components/SignupPitch";');
  });

  it("no bucket for a browser with the signed-in hint or a surface outside the test", () => {
    expect(src).toContain("const bucket = !hinted && inDirectSigninTest(surface) ? readOrAssignDirectBucket(storage) : null;");
    expect(src).toContain("via: signinRoute({ bucket, inApp })");
  });
});

describe("(b) /login: order, words, in-app escape", () => {
  const login = read("src/app/login/page.tsx");

  it("the Google button comes before the 'try 5 questions first' alternative; the in-app line sits above the button", () => {
    const hint = login.indexOf("<InAppBrowserHint />");
    const button = login.indexOf("<GoogleSignInButton");
    const tryFirst = login.indexOf("{examCode && li.tryFirst && (");
    expect(hint).toBeGreaterThan(-1);
    expect(button).toBeGreaterThan(hint);
    expect(tryFirst).toBeGreaterThan(button);
    // The alternative stays on the page (content first: no wall).
    expect(login).toContain('fillTemplate(t("login.tryFirst"), { exam: examCode.replace(/_/g, " ") })');
  });

  const LOGIN_KEYS = [
    "login.h1",
    "login.body",
    "login.body.noCount",
    "login.bullets.1",
    "login.bullets.2",
    "login.bullets.3",
    "login.bullets.4",
    "login.intent.mock.h1",
    "login.intent.mock.h1Exam",
    "login.intent.mock.body",
    "login.intent.coach.body",
  ] as const;
  const val = (locale: "en" | "hi" | "te", k: string) => (dict[locale] as Record<string, string>)[k] ?? "";

  it("no invented speed, no rank, no 'opens straight away', no email promise — in en, hi and te", () => {
    const BANNED: Record<"en" | "hi" | "te", RegExp> = {
      en: /5 seconds|\brank\b|straight away|one email|result day|result is out/i,
      hi: /सेकंड|रैंक|तुरंत खुल|ईमेल/,
      te: /సెకన్లు|ర్యాంక్|వెంటనే తెరుచు|ఈమెయిల్/,
    };
    for (const locale of ["en", "hi", "te"] as const) {
      for (const k of LOGIN_KEYS) expect(val(locale, k), `${locale} ${k}`).not.toMatch(BANNED[locale]);
    }
    for (const locale of ["en", "hi", "te"] as const) {
      expect(MOCK_GATE_COPY[locale].body, locale).not.toMatch(/5 seconds|5 सेकंड|5 సెకన్లు/);
    }
  });

  it("the default card carries the founder's idea: an account makes Shishya yours and picks up next time", () => {
    expect(val("en", "login.body.noCount")).toBe(
      "Free. An account makes Shishya yours: it keeps your exam, your weak topics, your mocks and the questions you ask, and picks up from them next time. Google sign-in only. No passwords. No spam.",
    );
    expect(val("en", "login.h1")).toBe("Sign in and make Shishya yours");
    expect(val("hi", "login.body")).toMatch(/Shishya आपका अपना/);
    expect(val("te", "login.body")).toMatch(/Shishya మీ సొంతమవుతుంది/);
    // The mock card promises only what every callback does: back to this page.
    expect(val("en", "login.intent.mock.body")).toContain("you come straight back here");
  });
});

describe("(b) in-app browsers", () => {
  it("names the webview families and leaves real browsers (and ChatGPT's link browser) alone", () => {
    expect(inAppBrowser(UA.instagramIos)).toBe("instagram");
    expect(inAppBrowser(UA.instagramAndroid)).toBe("instagram");
    expect(inAppBrowser(UA.facebookIos)).toBe("facebook");
    expect(inAppBrowser(UA.facebookAndroid)).toBe("facebook");
    expect(inAppBrowser(UA.linkedin)).toBe("linkedin");
    expect(inAppBrowser(UA.line)).toBe("line");
    expect(inAppBrowser(UA.snapchat)).toBe("snapchat");
    expect(inAppBrowser(UA.androidWebView)).toBe("webview");
    // Chrome Custom Tabs (ChatGPT on Android) and SFSafariViewController
    // (ChatGPT on iOS) carry the ordinary Chrome / Safari user agent.
    for (const ua of [UA.chromeAndroid, UA.safariIos, UA.chromeIos, UA.desktop]) expect(inAppBrowser(ua), ua).toBeNull();
    expect(inAppBrowser("")).toBeNull();
    expect(inAppBrowser(undefined)).toBeNull();
  });

  it("the Chrome intent keeps path and query, drops the hash", () => {
    expect(chromeIntentUrl("https://shishya.in/login?callbackUrl=%2Fexams%2FSSC_CGL#x")).toBe(
      "intent://shishya.in/login?callbackUrl=%2Fexams%2FSSC_CGL#Intent;scheme=https;package=com.android.chrome;end",
    );
    expect(chromeIntentUrl("javascript:alert(1)")).toBeNull();
    expect(chromeIntentUrl("not a url")).toBeNull();
  });

  it("the escape line speaks en, hi and te, names the app, and says 'may not' (Google often blocks, not always)", () => {
    const keys = Object.keys(IN_APP_COPY.en).sort();
    for (const locale of ["hi", "te"] as const) expect(Object.keys(IN_APP_COPY[locale]).sort()).toEqual(keys);
    for (const locale of ["en", "hi", "te"] as const) expect(IN_APP_COPY[locale].body).toContain("{app}");
    expect(IN_APP_COPY.hi.title).toMatch(/[ऀ-ॿ]/);
    expect(IN_APP_COPY.te.title).toMatch(/[ఀ-౿]/);
    expect(inAppBody(IN_APP_COPY.en, "instagram")).toContain("inside Instagram");
    expect(inAppBody(IN_APP_COPY.en, "webview")).toContain("inside this app");
    expect(inAppBody(IN_APP_COPY.hi, "webview")).toContain("इस ऐप के अंदर");
    expect(IN_APP_COPY.en.title).toContain("may not");
  });

  it("the hint renders nothing on the server or in a normal browser, and sits on /login and the mock gate only", () => {
    const hint = read("src/components/InAppBrowserHint.tsx");
    expect(hint).toContain("const family = inAppBrowser(navigator.userAgent);");
    expect(hint).toContain("if (!family) return;");
    expect(hint).toContain("if (!hint) return null;");
    expect(read("src/components/GuestQuizGate.tsx")).toContain("{inAppHint && <InAppBrowserHint />}");
  });

  it("one escape line per page: the mock gate's quiz-end button leaves it to the top button", () => {
    const gate = read("src/components/GuestQuizGate.tsx");
    // Default on for GateSignInButton and GuestQuizGate; passed through to the quiz-end button.
    expect(gate.match(/inAppHint = true,/g)).toHaveLength(2);
    expect(gate).toMatch(/className="\[&>button\]:mt-0"\s*inAppHint=\{inAppHint\}/);
    const mockGate = read("src/app/mocks/[id]/MockGate.tsx");
    const top = mockGate.slice(mockGate.indexOf("<GateSignInButton"), mockGate.indexOf("<GuestQuizGate"));
    expect(top).not.toContain("inAppHint");
    const quiz = mockGate.slice(mockGate.indexOf("<GuestQuizGate"));
    expect(quiz.slice(0, quiz.indexOf("/>"))).toContain("inAppHint={false}");
    // The build-mock gate has no other straight-to-Google button: it keeps the line.
    const build = read("src/app/exams/[code]/build-mock/page.tsx");
    expect(build).toContain("<GuestQuizGate");
    expect(build).not.toContain("inAppHint={false}");
  });
});

describe("(b) the one-request hand-off to Google", () => {
  it("submits NextAuth's own sign-in form (csrfToken + callbackUrl, no json) and falls back to signIn()", () => {
    const src = read("src/lib/google-handoff.ts");
    expect(src).toContain('export const GOOGLE_SIGNIN_ACTION = "/api/auth/signin/google";');
    expect(src).toContain('form.method = "POST";');
    expect(src).not.toMatch(/\["json"/);
    expect(src).toContain('await signIn("google", { callbackUrl });');
    expect(read("src/components/GoogleSignInButton.tsx")).toContain("void goToGoogle(callbackUrl)");
  });

  describe("goToGoogle (next-auth mocked, a fake document)", () => {
    let forms: { method: string; action: string; inputs: { name: string; value: string }[]; submitted: boolean }[];

    beforeEach(() => {
      vi.resetModules();
      na.getCsrfToken.mockReset();
      na.signIn.mockReset();
      forms = [];
      vi.stubGlobal("document", {
        createElement: (tag: string) => {
          if (tag === "form") {
            const f = { method: "", action: "", style: {}, inputs: [] as { name: string; value: string }[], submitted: false, appendChild: (i: { name: string; value: string }) => f.inputs.push(i), submit: () => { f.submitted = true; } };
            forms.push(f as never);
            return f;
          }
          return { type: "", name: "", value: "" };
        },
        body: { appendChild: () => {} },
      });
    });
    afterEach(() => vi.unstubAllGlobals());

    it("with a token: one form POST to Google's sign-in route, next-auth's 3-call signIn() not used", async () => {
      na.getCsrfToken.mockResolvedValue("tok123");
      const m = await import("@/lib/google-handoff");
      await m.goToGoogle("/exams/SSC_CGL?start=practice");
      expect(forms).toHaveLength(1);
      expect(forms[0]).toMatchObject({ method: "POST", action: "/api/auth/signin/google", submitted: true });
      expect(forms[0].inputs.map((i) => [i.name, i.value])).toEqual([
        ["csrfToken", "tok123"],
        ["callbackUrl", "/exams/SSC_CGL?start=practice"],
      ]);
      expect(na.signIn).not.toHaveBeenCalled();
    });

    it("the token is fetched once for warm + tap", async () => {
      na.getCsrfToken.mockResolvedValue("tok");
      const m = await import("@/lib/google-handoff");
      await m.warmGoogleHandoff();
      await m.goToGoogle("/");
      expect(na.getCsrfToken).toHaveBeenCalledTimes(1);
    });

    it("no token (fetch failed) → signIn('google', { callbackUrl }) exactly as before, and the failure is not cached", async () => {
      na.getCsrfToken.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce("tok2");
      const m = await import("@/lib/google-handoff");
      await m.goToGoogle("/exams/SSC_CGL/pyq/2024");
      expect(forms).toHaveLength(0);
      expect(na.signIn).toHaveBeenCalledWith("google", { callbackUrl: "/exams/SSC_CGL/pyq/2024" });
      await m.goToGoogle("/");
      expect(forms).toHaveLength(1);
    });
  });
});

describe("(c) the skip-/login 50/50 test", () => {
  const mem = () => {
    const m = new Map<string, string>();
    return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
  };

  it("a guest gets a stable bucket in localStorage (shishya_direct_signin_ab_v1 = direct|login)", () => {
    expect(DIRECT_SIGNIN_AB_KEY).toBe("shishya_direct_signin_ab_v1");
    const s = mem();
    expect(readOrAssignDirectBucket(s, () => 0.2)).toBe("direct");
    expect(s.m.get(DIRECT_SIGNIN_AB_KEY)).toBe("direct");
    // Stable: a later draw never moves them.
    expect(readOrAssignDirectBucket(s, () => 0.9)).toBe("direct");
    const t = mem();
    expect(readOrAssignDirectBucket(t, () => 0.7)).toBe("login");
    expect(readOrAssignDirectBucket(t, () => 0.1)).toBe("login");
  });

  it("50/50 over many draws; junk is redrawn; no or broken storage is the safe 'login' arm", () => {
    let direct = 0;
    for (let i = 0; i < 1000; i++) if (readOrAssignDirectBucket(mem(), () => i / 1000) === "direct") direct++;
    expect(direct).toBe(500);
    const s = mem();
    s.m.set(DIRECT_SIGNIN_AB_KEY, "wall");
    expect(readOrAssignDirectBucket(s, () => 0.1)).toBe("direct");
    expect(readOrAssignDirectBucket(null)).toBe("login");
    expect(readOrAssignDirectBucket({ getItem: () => { throw new Error("denied"); }, setItem: () => {} })).toBe("login");
    // A write that does not stick (quota) is not an arm.
    expect(readOrAssignDirectBucket({ getItem: () => null, setItem: () => {} }, () => 0.1)).toBe("login");
  });

  it("only in-page sign-in buttons are in it — never the header, the 401 redirects or the always-direct mock gate", () => {
    for (const s of ["hub-box", "hub-try-one", "pyq-year", "quiz-end", "build-mock-form", "signup-pitch", "signup-inline", "signup-nudge"]) {
      expect(inDirectSigninTest(s), s).toBe(DIRECT_SIGNIN_TEST_ON);
    }
    for (const s of ["header", "home-signin", "link", "hub-start-401", "subject-test-401", "topic-quiz-401", "custom-mock-401", "mock-gate", "mock-gate-quiz-end", "build-gate-quiz-end"]) {
      expect(inDirectSigninTest(s), s).toBe(false);
    }
    for (const s of DIRECT_SIGNIN_SURFACES) expect(isSigninSurface(s), s).toBe(true);
    // The header is not a SignInLink: it always goes to /login.
    expect(read("src/components/HeaderAuthControls.tsx")).not.toContain("SignInLink");
  });

  it("straight to Google only for the direct arm in a normal browser", () => {
    expect(signinRoute({ bucket: "direct", inApp: null })).toBe("google");
    expect(signinRoute({ bucket: "direct", inApp: "instagram" })).toBe("login");
    expect(signinRoute({ bucket: "login", inApp: null })).toBe("login");
    expect(signinRoute({ bucket: null, inApp: null })).toBe("login");
  });

  it("one module holds the switch: the kill switch constant and the 7-day read that decides", () => {
    const src = read("src/lib/direct-signin-ab.ts");
    expect(src).toContain("export const DIRECT_SIGNIN_TEST_ON: boolean = true;");
    expect(src).toMatch(/DECISION: the 7-day read — sign-ups per clicker, by bucket/);
    expect(src).toContain("if (!DIRECT_SIGNIN_TEST_ON) return null;");
  });
});

describe("(d) the header's guest button", () => {
  const controls = read("src/components/HeaderAuthControls.tsx");

  it("reads 'Sign in free' — English in the cached HTML, hi / te after mount", () => {
    expect(read("src/components/Header.tsx")).toContain('signinShort: "Sign in free",');
    expect(HEADER_SIGNIN_LABEL).toEqual({ en: "Sign in free", hi: "मुफ़्त साइन इन", te: "ఉచితంగా Sign in" });
    expect(controls).toContain('const [lang, setLang] = useState<CopyLocale>("en");');
    expect(controls).toContain("setLang(clientUiLocale());");
    expect(controls).toContain('const signinLabel = lang === "en" ? labels.signinShort : HEADER_SIGNIN_LABEL[lang];');
    expect(controls).toContain("{signinLabel}");
  });

  it("has a ≥ 40 px phone tap target (44 px) and never wraps; still the filled button; still hidden on Class 1-7 pages", () => {
    expect(controls).toMatch(/<Link rel="nofollow" href=\{loginHref\} className="btn-primary min-h-\[44px\] whitespace-nowrap !py-2 !px-4 text-xs sm:text-sm"/);
    expect(read("src/app/globals.css")).toMatch(/\.btn-primary \{[\s\S]{0,400}min-height: 44px;/);
    expect(controls).toMatch(/\) : isUnder13SchoolPath\(pathname\) \? null : \(\s*<Link rel="nofollow" href=\{loginHref\}/);
  });
});

describe("(e) HUB START: the hub box's sign-in lands the new member in the practice it promised", () => {
  it("the hub box returns to /exams/CODE?start=practice and names its door", () => {
    const hub = read("src/app/exams/[code]/page.tsx");
    const box = hub.slice(hub.indexOf("{!userId && hasContent && ("));
    expect(box.slice(0, box.indexOf("</HubSignInLink>"))).toContain(
      "href={`/login?callbackUrl=${encodeURIComponent(`/exams/${exam.code}?start=practice`)}&from=hub-box`}",
    );
  });

  it("a new member (no mock on this exam) gets the diagnostic; a returning member gets no surprise mock", () => {
    expect(hubAutoStart("practice", false)).toBe("diagnostic");
    expect(hubAutoStart("practice", true)).toBe("panel");
    // The 401 path is unchanged: they pressed the diagnostic itself.
    expect(hubAutoStart("diagnostic", false)).toBe("diagnostic");
    expect(hubAutoStart("diagnostic", true)).toBe("diagnostic");
    expect(hubAutoStart(null, false)).toBeNull();
    expect(hubAutoStart("1", false)).toBeNull();
  });

  it("the auto-start keeps its guards: once per tab (sessionStorage), and only after a forced signed-in probe", () => {
    const src = read("src/app/exams/[code]/StartMockButton.tsx");
    const effect = src.slice(src.indexOf("const startParam = searchParams?.get(\"start\");"), src.indexOf("}, [searchParams, examCode]);"));
    expect(effect).toContain("if (hubAutoStart(startParam, hasHistory) === null) return;");
    expect(effect).toMatch(/if \(sessionStorage\.getItem\(key\)\) return;\s*sessionStorage\.setItem\(key, "1"\);/);
    expect(effect).toContain("fetchSignedIn({ force: true }).then((v) => {");
    expect(effect).toContain("if (v !== true) return;");
    expect(effect).toContain('if (what === "diagnostic") void start("DIAGNOSTIC");');
    // A returning member only sees their own start panel.
    expect(effect).toContain('document.querySelector(\'[data-tour="exam-start-mock"]\')');
    expect(read("src/app/exams/[code]/page.tsx")).toContain('<span data-tour="exam-start-mock">');
  });

  it("?start= leaves the address bar once the guard is set, so a copied hub link starts nothing", () => {
    const src = read("src/app/exams/[code]/StartMockButton.tsx");
    const effect = src.slice(src.indexOf("const startParam = searchParams?.get(\"start\");"), src.indexOf("}, [searchParams, examCode]);"));
    const guard = effect.indexOf('sessionStorage.setItem(key, "1");');
    const drop = effect.indexOf('u.searchParams.delete("start");');
    const probe = effect.indexOf("fetchSignedIn({ force: true })");
    expect(guard).toBeGreaterThan(-1);
    expect(drop).toBeGreaterThan(guard);
    expect(probe).toBeGreaterThan(drop);
    expect(effect).toContain('window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);');
    // The re-run on the new searchParams stops at the first line; this run
    // keeps its captured startParam for the probe's callback.
    expect(effect).toContain("const what = hubAutoStart(startParam, hasHistory);");
  });
});
