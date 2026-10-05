// utm_content from landing to account (3 Oct 2026, sign-ups-to-100 plan: count
// per-link sources — one YouTube Short, one coaching centre's link).
//
// Page views already kept it (props.utmContent, 30 Sep 2026 — 14 rows by 3 Oct);
// the SIGNUP row never did: the first-landing attribution cookie
// (src/middleware.ts) held utm_source / utm_medium / utm_campaign only. Now:
//   • the cleaner (src/lib/utm-content.ts) also drops personal data — an email
//     address or a phone number — whole, on both paths;
//   • the middleware keeps the cleaned utm_content in the cookie (it opens no
//     trail by itself and does not change "direct"); never on a Class 1-7 page;
//   • src/lib/signup-attribution.ts reads it (only beside one of the other
//     three tags, as the tracker keeps it) — the User columns are unchanged;
//   • the SIGNUP row carries it in props.utmContent (signupEventProps), the
//     same key and the same cleaned value as a page view's.
// Runs the real middleware, the real attribution reader and the real
// createUser event against mocked cookies; no DB, no network.
// Run: npx vitest run tests/unit/signup-utm-content.test.ts

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const state = vi.hoisted(() => ({
  cookies: {} as Record<string, string>,
  events: [] as Record<string, unknown>[],
  updates: 0,
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => (name in state.cookies ? { name, value: state.cookies[name] } : undefined),
    set: () => {},
  }),
}));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $executeRaw: async () => {
      state.updates += 1;
      return 1;
    },
  },
}));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("next-auth/providers/google", () => ({ default: () => ({ id: "google" }) }));
vi.mock("@/lib/analytics", () => ({
  recordEvent: async (e: Record<string, unknown>) => {
    state.events.push(e);
  },
}));
vi.mock("@/lib/email", () => ({ sendWelcomeEmail: async () => true }));
vi.mock("@/lib/school/student-db", () => ({ findStudentModeContainer: async () => null }));
vi.mock("@/lib/db/enrollment", () => ({ ensureEnrollment: async () => ({}) }));
vi.mock("@/lib/signup-profile", () => ({ applySignupProfile: async () => ({}) }));

import { UTM_CONTENT_MAX, cleanUtmContent, withUtmContent } from "@/lib/utm-content";
import { signupEventProps } from "@/lib/signin-cta";
import { readSignupAttribution, captureSignupAttribution } from "@/lib/signup-attribution";
import { middleware } from "@/middleware";
import { authOptions } from "@/lib/auth";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const ATTRIB = "shishya_attrib";
const CHROME = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36";
const event = { waitUntil() {}, sourcePage: "" } as never;

function run(url: string, referer?: string) {
  const headers = new Headers({ "user-agent": CHROME });
  if (referer) headers.set("referer", referer);
  return middleware(new NextRequest(url, { headers }), event);
}
const payloadOf = (res: ReturnType<typeof run>) => {
  const c = res.cookies.get(ATTRIB);
  return c ? (JSON.parse(c.value) as Record<string, unknown>) : null;
};

beforeEach(() => {
  state.cookies = {};
  state.events = [];
  state.updates = 0;
});

// ── 1. the cleaner ───────────────────────────────────────────────────────

describe("1. cleanUtmContent: a short slug, and never personal data", () => {
  it("keeps our own per-link slugs as they are", () => {
    for (const s of ["ssc-cgl", "itv-test-tnpsc-g4", "centre-03", "short_2026", "itv-20261003", "tutor-answered", "ssc_gd"]) expect(cleanUtmContent(s), s).toBe(s);
    // The five ITV Shorts the founder will post (D:/CodexProjects/shishya-data/youtube/itv-test-2026-10, read 3 Oct 2026).
    for (const s of ["ask-shishya", "nse-ioqm-papers", "sof-sample-papers", "ssc-cgl-tier1", "tnpsc-group4"]) expect(cleanUtmContent(s), s).toBe(s);
    expect(cleanUtmContent("  TNPSC Group 4 Short ")).toBe("tnpsc-group-4-short");
    expect(cleanUtmContent("a".repeat(500))).toHaveLength(UTM_CONTENT_MAX);
    expect(UTM_CONTENT_MAX).toBe(64);
  });

  it("drops an email address or a phone number whole — not cleaned into a slug that still holds it", () => {
    for (const s of ["student@gmail.com", "venu.m@example.in", "x@y", "%40", "9876543210", "+91 98765 43210", "91-98765-43210", "call-9876543210-now", "23851234567890123"]) {
      const raw = s === "%40" ? decodeURIComponent(s) : s;
      expect(cleanUtmContent(raw), s).toBeNull();
    }
    // Nine digits or fewer (a year, a date, a centre number) are not a phone number.
    expect(cleanUtmContent("centre-123456789")).toBe("centre-123456789");
    // … on the page-view path too (the analytics route's own call).
    expect(withUtmContent({ cta: "x" }, "someone@gmail.com")).toEqual({ cta: "x" });
    expect(withUtmContent(undefined, "98765 43210")).toBeUndefined();
  });

  it("an address encoded twice (3 Oct 2026 review): 'a%2540gmail.com' arrives as 'a%40gmail.com' and is dropped too", () => {
    for (const s of ["a%40gmail.com", "A%40GMAIL.COM", "student%40example.in", "x%40y"]) expect(cleanUtmContent(s), s).toBeNull();
    // The way it arrives: one decode by the URL parser.
    expect(new URL("https://shishya.in/exams/SSC_CGL?utm_content=a%2540gmail.com").searchParams.get("utm_content")).toBe("a%40gmail.com");
    expect(payloadOf(run("https://shishya.in/exams/SSC_CGL?utm_source=email&utm_content=a%2540gmail.com"))).toMatchObject({ utm_content: "" });
    expect(withUtmContent({ cta: "x" }, "a%40gmail.com")).toEqual({ cta: "x" });
    // A "%" that is not an encoded "@" is just cleaned, as before.
    expect(cleanUtmContent("50%off")).toBe("50-off");
  });

  it("the per-link slug format we hand out keeps to nine digits or fewer — a slug with ten is dropped whole, so never make one", () => {
    // Lever 8 (the coaching centres): one link per centre, a slug per centre. Kept as written.
    for (let n = 1; n <= 10; n++) {
      const nn = String(n).padStart(2, "0");
      for (const s of [`centre-${nn}`, `ap-centre-${nn}`, `ts-centre-${nn}`, `tn-centre-${nn}`]) expect(cleanUtmContent(s), s).toBe(s);
    }
    // The ITV Shorts' slugs (above) and a dated campaign within nine digits are kept.
    expect(cleanUtmContent("itv-20261003")).toBe("itv-20261003");
    // What NOT to make: a full date plus a number (ten digits), or an ad tool's numeric id. Dropped, not cut.
    expect(cleanUtmContent("2026-10-05-centre-01")).toBeNull();
    expect(cleanUtmContent("23851234567")).toBeNull();
  });
});

// ── 2. the middleware's cookie ───────────────────────────────────────────

describe("2. the first-landing cookie keeps the cleaned utm_content", () => {
  it("a tagged landing: utm_content beside the three tags, cleaned", () => {
    const p = payloadOf(run("https://shishya.in/exams/SSC_CGL?utm_source=youtube&utm_medium=shorts&utm_campaign=itv-test&utm_content=SSC%20CGL%20Short"));
    expect(p).toMatchObject({ utm_source: "youtube", utm_medium: "shorts", utm_campaign: "itv-test", utm_content: "ssc-cgl-short", direct: false });
    // A coaching centre's link to the mock builder.
    expect(payloadOf(run("https://shishya.in/exams/SSC_CGL/build-mock?utm_source=coaching&utm_campaign=centres&utm_content=centre-03"))).toMatchObject({ utm_content: "centre-03" });
  });

  it("no tag, a personal value or a huge one: an empty utm_content — and a huge tag can no longer push the cookie past 4 KB", () => {
    expect(payloadOf(run("https://shishya.in/exams/SSC_CGL?utm_source=chatgpt.com"))).toMatchObject({ utm_source: "chatgpt.com", utm_content: "" });
    expect(payloadOf(run("https://shishya.in/exams/SSC_CGL?utm_source=email&utm_content=student%40gmail.com"))).toMatchObject({ utm_content: "" });
    const huge = payloadOf(run(`https://shishya.in/exams/SSC_CGL?utm_source=youtube&utm_content=${"v".repeat(5000)}`));
    expect(huge?.utm_content).toBe("v".repeat(64));
    expect(JSON.stringify(huge).length).toBeLessThan(400);
  });

  it("utm_content alone opens no trail on a content page (the three tags or an outside referrer do, as before)", () => {
    expect(run("https://shishya.in/exams/SSC_CGL?utm_content=ssc-cgl").cookies.get(ATTRIB)).toBeUndefined();
    // /login is the last-mile catch: a cookie, "direct", and its utm_content (never read without a tag: section 3).
    expect(payloadOf(run("https://shishya.in/login?utm_content=ssc-cgl"))).toMatchObject({ direct: true, utm_content: "ssc-cgl" });
  });

  it("never on a Class 1-7 page; a Class 9 page as before", () => {
    expect(run("https://shishya.in/schooling/cbse/class-5/science?utm_source=youtube&utm_content=class5").cookies.get(ATTRIB)).toBeUndefined();
    expect(payloadOf(run("https://shishya.in/schooling/cbse/class-9?utm_source=youtube&utm_content=class9"))).toMatchObject({ utm_content: "class9" });
  });

  it("the cleaner is the analytics route's own, imported once at the top of the middleware", () => {
    const src = read("src/middleware.ts");
    expect(src).toContain('import { cleanUtmContent } from "@/lib/utm-content";');
    expect(src).toContain('const utmContent = cleanUtmContent(sp.get("utm_content")) ?? "";');
    expect(src).toContain("utm_content: utmContent,");
    // It opens no trail and does not change "direct".
    expect(src).toContain("const haveTrail = utmSource || utmMedium || utmCampaign || refererIsExternal;");
    expect(src).toContain("!referer && !utmSource && !utmMedium && !utmCampaign;");
    expect(read("src/app/api/analytics/route.ts")).toContain("props: child ? body.props : withUtmContent(body.props, body.utmContent),");
  });
});

// ── 3. the attribution reader ────────────────────────────────────────────

describe("3. the attribution reader: utmContent beside a tag, cleaned again; the User columns as before", () => {
  const cookieOf = (o: Record<string, unknown>) => {
    state.cookies[ATTRIB] = JSON.stringify(o);
  };

  it("a tagged landing's utm_content is read (and cleaned again: an older or hand-made cookie is not trusted)", async () => {
    cookieOf({ ref: "", utm_source: "youtube", utm_medium: "shorts", utm_campaign: "itv-test", utm_content: "ssc-cgl", direct: false });
    expect(await readSignupAttribution()).toMatchObject({ utmSource: "youtube", utmCampaign: "itv-test", utmContent: "ssc-cgl", referrerHost: "youtube" });
    cookieOf({ utm_source: "youtube", utm_content: "  SSC CGL <b>  " });
    expect((await readSignupAttribution())?.utmContent).toBe("ssc-cgl-b");
    cookieOf({ utm_source: "email", utm_content: "someone@gmail.com" });
    expect((await readSignupAttribution())?.utmContent).toBeNull();
  });

  it("no tag beside it (a direct visit, a referrer only, a cookie from before this build): no utmContent", async () => {
    cookieOf({ ref: "", utm_source: "", utm_medium: "", utm_campaign: "", utm_content: "ssc-cgl", direct: true });
    expect(await readSignupAttribution()).toMatchObject({ referrerHost: "direct", utmContent: null });
    cookieOf({ ref: "https://www.bing.com/", utm_content: "ssc-cgl", direct: false });
    expect(await readSignupAttribution()).toMatchObject({ referrerHost: "bing.com", refHost: "bing.com", utmContent: null });
    cookieOf({ ref: "", utm_source: "chatgpt.com", utm_medium: "", utm_campaign: "", direct: false });
    expect(await readSignupAttribution()).toMatchObject({ utmSource: "chatgpt.com", utmContent: null });
  });

  it("the User row's canonical source string is the three tags, exactly as before (utm_content is not written there)", async () => {
    cookieOf({ utm_source: "youtube", utm_medium: "shorts", utm_campaign: "itv-test", utm_content: "ssc-cgl" });
    const a = await captureSignupAttribution("u-1");
    expect(a?.referrerUrl).toBe("utm_source=youtube&utm_medium=shorts&utm_campaign=itv-test");
    expect(state.updates).toBe(1);
    const src = read("src/lib/signup-attribution.ts");
    expect(src).toContain('SET "signupReferrerUrl"  = ${attribution.referrerUrl},');
    expect(src).not.toMatch(/utm_content=\$\{/);
  });
});

// ── 4. the SIGNUP row ────────────────────────────────────────────────────

describe("4. the SIGNUP row carries props.utmContent — the same key and value as a page view's", () => {
  it("signupEventProps: utmContent when given, cleaned; no key otherwise (older reads see the same props)", () => {
    expect(signupEventProps({ school: false, callback: "https://shishya.in/exams/SSC_CGL?start=practice", landing: null, utmContent: "ssc-cgl" })).toEqual({
      provider: "google",
      callbackFamily: "exam",
      callbackPath: "/exams/SSC_CGL",
      utmContent: "ssc-cgl",
    });
    for (const v of [undefined, null, "", "  --  ", "a@b.com", "98765 43210"]) {
      expect(signupEventProps({ school: false, callback: null, landing: null, utmContent: v }), String(v)).toEqual({ provider: "google", callbackFamily: "none" });
    }
    // Still far under /api/analytics' 1 KB props cap at every cap.
    const big = signupEventProps({ school: true, callback: "https://shishya.in/" + "a".repeat(500), landing: encodeURIComponent("/" + "b".repeat(500)), utmContent: "c".repeat(500) });
    expect(big.utmContent).toBe("c".repeat(64));
    expect(JSON.stringify(big).length).toBeLessThan(500);
  });

  async function signUp() {
    await authOptions.events!.createUser!({ user: { id: "u-1", email: "student@example.com", name: "Asha", emailVerified: null } as never });
    const rows = state.events.filter((e) => e.kind === "SIGNUP");
    expect(rows).toHaveLength(1);
    return rows[0];
  }

  it("createUser: a tagged first landing puts the three columns AND props.utmContent on the SIGNUP row", async () => {
    state.cookies[ATTRIB] = JSON.stringify({ ref: "", utm_source: "youtube", utm_medium: "shorts", utm_campaign: "itv-test", utm_content: "tnpsc-g4", direct: false });
    state.cookies["__Secure-next-auth.callback-url"] = "https://shishya.in/exams/TNPSC_GROUP_4?start=practice";
    const row = await signUp();
    expect(row).toMatchObject({ utmSource: "youtube", utmMedium: "shorts", utmCampaign: "itv-test" });
    expect(row.props).toEqual({ provider: "google", callbackFamily: "exam", callbackPath: "/exams/TNPSC_GROUP_4", utmContent: "tnpsc-g4" });
  });

  it("createUser: no cookie, an untagged landing or a personal value — no utmContent, props exactly as before", async () => {
    let row = await signUp();
    expect(row.props).toEqual({ provider: "google", callbackFamily: "none" });
    state.events = [];
    state.cookies[ATTRIB] = JSON.stringify({ ref: "https://chatgpt.com/", utm_content: "ssc-cgl", direct: false });
    row = await signUp();
    expect(row.props).toEqual({ provider: "google", callbackFamily: "none" });
    expect(row.refHost).toBe("chatgpt.com");
    state.events = [];
    state.cookies[ATTRIB] = JSON.stringify({ utm_source: "email", utm_content: "student@gmail.com" });
    row = await signUp();
    expect(row.props).toEqual({ provider: "google", callbackFamily: "none" });
    expect(row.utmSource).toBe("email");
  });
});
