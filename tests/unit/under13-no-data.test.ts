// Class 1-7 school pages take no data (27 Sep 2026, founder rule 5: "Below
// 13: don't show sign-up, don't take any data, just show the content").
//
// What this pins:
//   1. isUnder13SchoolPath — /schooling/{board}/class-1 … class-7 and
//      everything under them; never Class 8-12, the school hub or another
//      section;
//   2. the ingest route (src/app/api/analytics/route.ts): an event from a
//      Class 1-7 page is a bare count — userId, anonId, utm, referrer host
//      and both fingerprints null, no shishya_anon cookie issued — while a
//      Class 8-12 page keeps its identity exactly as before;
//   3. the middleware writes no shishya_attrib cookie on a Class 1-7 page
//      (a utm-tagged, outside-referred Class 9 page still gets one);
//   4. source guards on the client islands: the page-view tracker and the
//      school quiz send with no cookie and no referrer there, the header
//      shows no Sign in, SignupNudge never shows on /schooling and writes no
//      counter on Class 1-7, and FeedbackWidget / InstallOffer stay off.
// No DB, no network. Run: npx vitest run tests/unit/under13-no-data.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  events: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/auth", () => ({ auth: async () => state.session }));
vi.mock("@/lib/analytics", () => ({
  recordEvent: async (e: Record<string, unknown>) => {
    state.events.push(e);
  },
}));
vi.mock("@/lib/client-class", () => ({ classifyClient: () => "browser" }));

import { isUnder13SchoolPath } from "@/lib/school/student-classes";
import { blockedInstallPath } from "@/lib/install-offer";
import { POST as analyticsPost } from "@/app/api/analytics/route";
import { middleware } from "@/middleware";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const stripComments = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";

beforeEach(() => {
  state.session = null;
  state.events = [];
});

// ── 1. the rule ──────────────────────────────────────────────────────

describe("isUnder13SchoolPath", () => {
  it("is true for Class 1-7 school pages and everything under them", () => {
    for (const p of [
      "/schooling/cbse/class-1",
      "/schooling/cbse/class-7/science",
      "/schooling/icse-cisce/class-5/mathematics/x?y=1",
      "/schooling/cbse/class-3/",
      "/schooling/cbse/class-6#notes",
    ]) {
      expect(isUnder13SchoolPath(p), p).toBe(true);
    }
  });

  it("is false for Class 8-12, the school hub, a board page and every other section", () => {
    for (const p of [
      "/schooling/cbse/class-8",
      "/schooling/cbse/class-10",
      "/schooling/cbse/class-12",
      "/schooling/cbse/class-11/physics/x",
      "/schooling",
      "/schooling/cbse",
      "/exams/SSC_CGL",
      "/chat",
      "/",
    ]) {
      expect(isUnder13SchoolPath(p), p).toBe(false);
    }
    expect(isUnder13SchoolPath(null)).toBe(false);
    expect(isUnder13SchoolPath(undefined)).toBe(false);
  });
});

// ── 2. the ingest route ──────────────────────────────────────────────

function analyticsReq(body: Record<string, unknown>, cookie?: string): NextRequest {
  const headers = new Headers({
    "content-type": "application/json",
    "user-agent": CHROME,
    referer: "https://www.google.com/",
    host: "shishya.in",
    "x-forwarded-for": "203.0.113.7",
  });
  if (cookie) headers.set("cookie", cookie);
  return new NextRequest("https://shishya.in/api/analytics", { method: "POST", headers, body: JSON.stringify(body) });
}

const VIEW = { kind: "PAGE_VIEW", referrer: "https://www.google.com/", utmSource: "google", utmMedium: "organic", utmCampaign: "c1" };

describe("POST /api/analytics on a Class 1-7 page: a bare count", () => {
  it("drops userId, anonId, utm, referrer host and fingerprints, and issues no cookie (signed in, with a cookie)", async () => {
    state.session = { user: { id: "u1" } };
    const res = await analyticsPost(analyticsReq({ ...VIEW, path: "/schooling/cbse/class-5/science", props: { a: 1 } }, "shishya_anon=abc"));
    expect(res.status).toBe(204);
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(state.events).toHaveLength(1);
    expect(state.events[0]).toMatchObject({
      kind: "PAGE_VIEW",
      path: "/schooling/cbse/class-5/science",
      props: { a: 1 },
      client: "browser",
      userId: null,
      anonId: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      refHost: null,
      uaHash: null,
      ipHash: null,
    });
  });

  it("a cookie-less guest on a Class 1-7 page gets no shishya_anon cookie and no fingerprint either", async () => {
    const res = await analyticsPost(analyticsReq({ ...VIEW, path: "/schooling/cbse/class-2" }));
    expect(res.headers.get("set-cookie")).toBeNull();
    expect(state.events[0]).toMatchObject({ userId: null, anonId: null, refHost: null, utmSource: null, uaHash: null, ipHash: null });
  });

  it("the school quiz's finish on a Class 1-7 page is counted the same bare way (kind and props kept)", async () => {
    const props = { anon: true, school: true, exam: "NCERT_C06", topic: "fegp1.ch01", score: 4, total: 5 };
    await analyticsPost(analyticsReq({ kind: "QUIZ_ATTEMPTED", path: "/schooling/cbse/class-6/mathematics/x", props }, "shishya_anon=abc"));
    expect(state.events[0]).toMatchObject({ kind: "QUIZ_ATTEMPTED", props, anonId: null, userId: null, refHost: null });
  });

  it("a Class 8-12 page keeps its identity exactly as before", async () => {
    await analyticsPost(analyticsReq({ ...VIEW, path: "/schooling/cbse/class-9" }, "shishya_anon=abc"));
    expect(state.events[0]).toMatchObject({
      path: "/schooling/cbse/class-9",
      userId: null,
      anonId: "abc",
      utmSource: "google",
      utmMedium: "organic",
      utmCampaign: "c1",
      refHost: "www.google.com",
      uaHash: null,
      ipHash: null,
    });
    // Signed in: the userId is kept (and the anon side deduped away).
    state.session = { user: { id: "u1" } };
    await analyticsPost(analyticsReq({ ...VIEW, path: "/schooling/cbse/class-9" }, "shishya_anon=abc"));
    expect(state.events[1]).toMatchObject({ userId: "u1", anonId: null, refHost: "www.google.com" });
  });

  it("a cookie-less guest on a Class 8-12 page is still issued the cookie (the guard is what stops it on Class 1-7)", async () => {
    const res = await analyticsPost(analyticsReq({ ...VIEW, path: "/schooling/cbse/class-10" }));
    expect(res.headers.get("set-cookie") ?? "").toMatch(/shishya_anon=/);
    // An outside referrer counts the first hit under the issued id, as before.
    expect(state.events[0].anonId).toEqual(expect.any(String));
  });
});

// ── 3. the middleware ────────────────────────────────────────────────

describe("middleware: no attribution cookie on a Class 1-7 page", () => {
  const event = { waitUntil() {}, sourcePage: "" } as never;
  const run = (url: string, referer?: string) => {
    const headers = new Headers({ "user-agent": CHROME });
    if (referer) headers.set("referer", referer);
    return middleware(new NextRequest(url, { headers }), event);
  };

  it("a tagged, outside-referred Class 5 page gets no shishya_attrib; a Class 9 page still does", () => {
    expect(run("https://shishya.in/schooling/cbse/class-5/science?utm_source=chatgpt.com", "https://chatgpt.com/").cookies.get("shishya_attrib")).toBeUndefined();
    expect(run("https://shishya.in/schooling/cbse/class-7?utm_source=google").cookies.get("shishya_attrib")).toBeUndefined();
    expect(run("https://shishya.in/schooling/cbse/class-9?utm_source=chatgpt.com").cookies.get("shishya_attrib")).toBeDefined();
  });

  it("the guard sits before any attribution code, right after the section test", () => {
    const src = stripComments(read("src/middleware.ts"));
    const guard = src.indexOf("if (isUnder13SchoolPath(path)) return res;");
    expect(guard).toBeGreaterThan(src.indexOf("const isSectionLanding = isSectionPath(path);"));
    expect(guard).toBeLessThan(src.indexOf("if (req.cookies.get(COOKIE)?.value) return res;"));
    expect(guard).toBeLessThan(src.indexOf("name: COOKIE,"));
    expect(src).toMatch(/import \{ isUnder13SchoolPath \} from "@\/lib\/school\/student-classes";/);
  });
});

// ── 4. the client islands ────────────────────────────────────────────

describe("client islands send and store nothing identifying on Class 1-7 pages", () => {
  it("AnalyticsTracker: PAGE_VIEW and shishyaTrack go out with no cookie, no referrer and no utm there", () => {
    const src = stripComments(read("src/components/AnalyticsTracker.tsx"));
    expect(src).toMatch(/const child = isUnder13SchoolPath\(pathname\);/);
    expect(src).toMatch(/const utm = child \? \{\} : \{ \.\.\.readUtmFromStorage\(\), \.\.\.captureUtmFromUrl\(/);
    expect(src).toMatch(/void send\("PAGE_VIEW", pathname, props, utm, \{ anonymous: child \}\);/);
    expect(src).toMatch(/\.\.\.\(anonymous \? \{ credentials: "omit" as const, referrerPolicy: "no-referrer" as const \} : \{\}\)/);
    expect(src).toMatch(/body: JSON\.stringify\(anonymous \? \{ kind, path, props \} : \{ kind, path, props, referrer, \.\.\.utm \}\)/);
    expect(src).toMatch(/if \(isUnder13SchoolPath\(window\.location\.pathname\)\) \{\s*sendChildSafeEvent\(kind, window\.location\.pathname, props\);/);
  });

  it("the school quiz's finish uses the no-cookie send on Class 1-7 pages", () => {
    const src = stripComments(read("src/components/school/SchoolChapterQuiz.tsx"));
    expect(src).toMatch(/if \(isUnder13SchoolPath\(path\)\) \{\s*sendChildSafeEvent\("QUIZ_ATTEMPTED", path as string, props\);/);
  });

  it("the header shows no Sign in and no Ask Shishya chip on Class 1-7 pages", () => {
    const controls = stripComments(read("src/components/HeaderAuthControls.tsx"));
    expect(controls).toMatch(/isUnder13SchoolPath\(pathname\) \? null :/);
    expect(stripComments(read("src/components/Header.tsx"))).toMatch(/\{!childSafe && \(\s*<Link\s+href="\/chat"/);
  });

  it("SignupNudge never shows on /schooling or /chat, and writes no counter on Class 1-7 pages", () => {
    const src = stripComments(read("src/components/SignupNudge.tsx"));
    const blocked = src.slice(src.indexOf("function blockedPath("), src.indexOf("function beacon("));
    expect(blocked).toContain("/^\\/schooling(\\/|$)/.test(p)");
    expect(blocked).toContain('p === "/chat"');
    // The page-view counter and the active-seconds tick both return first on Class 1-7.
    expect(src.match(/if \(isUnder13SchoolPath\(location\.pathname\)\) return;/g)?.length).toBe(2);
    expect(src.indexOf("if (isUnder13SchoolPath(location.pathname)) return;")).toBeLessThan(src.indexOf("sessionStorage.setItem(SS_VIEWS"));
    // Its CTA returns to the page, never a bare /login (27 Sep 2026 review: + from=header, not a gated action).
    expect(src).not.toMatch(/href="\/login"/);
    expect(src).toContain("href={`/login?callbackUrl=${encodeURIComponent(location.pathname + location.search)}&from=header`}");
  });

  it("FeedbackWidget hides and InstallOffer stays off (and writes no visit counter) on Class 1-7 pages", () => {
    expect(stripComments(read("src/components/FeedbackWidget.tsx"))).toMatch(/\|\|\s*isUnder13SchoolPath\(pathname\);/);
    const offer = stripComments(read("src/components/InstallOffer.tsx"));
    expect(offer).toMatch(/const child = isUnder13SchoolPath\(location\.pathname\);\s*if \(!child\) \{\s*try \{\s*const counted = sessionStorage/);
    expect(blockedInstallPath("/schooling/cbse/class-5")).toBe(true);
    expect(blockedInstallPath("/schooling/cbse/class-5/science/x")).toBe(true);
    expect(blockedInstallPath("/schooling/cbse/class-9")).toBe(false);
    expect(blockedInstallPath("/schooling")).toBe(false);
  });
});
