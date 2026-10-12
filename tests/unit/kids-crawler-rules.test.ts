// Release 2 (14 Oct 2026), build kids-crawler — the pure rules and the wiring
// the route test cannot reach (the page and the chat island):
//   • src/lib/kids-tutor.ts: which turns are a kids' exam guest's, what the
//     line may point to (never practice the exam has not got, never a sign-up);
//   • src/lib/guest-seed-hold.ts: the five conditions of the crawler hold
//     (rule 5, review 11 Oct 2026: a landing with a utm tag or an outside
//     referrer is a walk-in, never held), the cookie test, the list's SQL
//     (SELECT only, ua-sweep tags, 30 days);
//   • src/lib/ua-fingerprint.ts: the analytics rows' uaHash, now shared — the
//     analytics route imports it and keeps no copy;
//   • /chat: a kids' exam guest gets KidsGuestTutorOff, never the chat island;
//     a seeded guest page passes the crawler verdict; the island sends the
//     seed with autoSeed and keeps a held seed in the box, unsent.
// Run: npx vitest run tests/unit/kids-crawler-rules.test.ts

import { createHmac } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  KIDS_GUEST_TUTOR_CODE,
  KIDS_GUEST_TUTOR_COPY,
  kidsGuestTutorFrames,
  kidsGuestTutorOff,
  kidsGuestTutorText,
  kidsGuestTutorView,
  kidsTutorLang,
  unknownKidsTutorOffer,
} from "@/lib/kids-tutor";
import {
  ANON_COOKIE,
  CONVICTED_AGENT_TAG_LIKE,
  convictedAgentsSql,
  guestSeedHold,
  hasAnonCookie,
  LANDING_TAGS,
  SEED_HELD_ERROR,
  seedHoldCandidate,
  taggedLanding,
} from "@/lib/guest-seed-hold";
import { analyticsFingerprint, uaFingerprint } from "@/lib/ua-fingerprint";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");

describe("kidsGuestTutorOff — a guest on a kids' exam", () => {
  it("is every kids' family, signed out, not general", () => {
    for (const code of ["SOF_IMO", "SOF_IEO", "SZF_IOM", "NSTSE", "PRIL", "ZIO", "JNVST", " SOF_NSO "]) {
      expect(kidsGuestTutorOff({ signedIn: false, examCode: code }), code).toBe(true);
    }
  });
  it("catches a lower-case spelling", () => {
    expect(kidsGuestTutorOff({ signedIn: false, examCode: "sof_imo" })).toBe(true);
    expect(kidsGuestTutorOff({ signedIn: false, examCode: "nstse" })).toBe(true);
  });
  it("is never a member, the general chat, a grown-up exam, a 13+ olympiad or a school container", () => {
    expect(kidsGuestTutorOff({ signedIn: true, examCode: "SOF_IMO" })).toBe(false);
    expect(kidsGuestTutorOff({ signedIn: false, general: true, examCode: "SOF_IMO" })).toBe(false);
    for (const code of ["SSC_CGL", "IOQM", "NSEJS", "NCERT_C09", "", null, undefined]) {
      expect(kidsGuestTutorOff({ signedIn: false, examCode: code as string | null }), String(code)).toBe(false);
    }
  });
});

describe("the kids' line — honest links, no sign-up", () => {
  const base = { examCode: "SOF_IMO", exam: "SOF IMO", hasQuestions: true, hasSamplePapers: true };
  it("names the free practice and the sample papers when the exam has them", () => {
    const v = kidsGuestTutorView(base, "en");
    expect(v.line).toBe(KIDS_GUEST_TUTOR_COPY.en.line.replace("{exam}", "SOF IMO"));
    expect(v.links.map((l) => [l.kind, l.href])).toEqual([
      ["quiz", "/exams/SOF_IMO/quiz"],
      ["samples", "/exams/SOF_IMO#official-sample-papers"],
    ]);
  });
  it("never promises practice the exam has not got: no questions → no quiz; nothing → the exam's page", () => {
    expect(kidsGuestTutorView({ ...base, hasQuestions: false }, "en").links.map((l) => l.kind)).toEqual(["samples"]);
    expect(kidsGuestTutorView({ ...base, hasSamplePapers: false }, "en").links.map((l) => l.kind)).toEqual(["quiz"]);
    const none = kidsGuestTutorView({ ...base, hasQuestions: false, hasSamplePapers: false }, "en");
    expect(none.links).toEqual([{ kind: "hub", href: "/exams/SOF_IMO", label: "SOF IMO page →" }]);
  });
  it("an exam no active row has (JNVST today) sends to the exam list, never a dead hub", () => {
    const v = kidsGuestTutorView(unknownKidsTutorOffer("JNVST"), "en");
    expect(v.line).toContain("guests on JNVST");
    expect(v.links).toEqual([{ kind: "browse", href: "/exams/browse", label: "All exams →" }]);
  });
  it("claims nothing the product does not do (review, 11 Oct 2026): a member's chat on a kids' exam IS kept", () => {
    expect(KIDS_GUEST_TUTOR_COPY.en.line).toBe(
      "The AI tutor is not open to guests on {exam}, because children sit this exam. Practise free instead, with no account:",
    );
    for (const lang of ["en", "hi", "te"] as const) {
      expect(KIDS_GUEST_TUTOR_COPY[lang].line, lang).not.toMatch(/keeps no|no questions from|सवाल नहीं रखता|ఉంచుకోదు/i);
    }
  });
  it("carries no sign-up or account invitation in any language", () => {
    for (const lang of ["en", "hi", "te"] as const) {
      const all = Object.values(KIDS_GUEST_TUTOR_COPY[lang]).join(" ");
      expect(all, lang).not.toMatch(/sign\s*(in|up)|google|login|log in|साइन|సైన్/i);
      expect(KIDS_GUEST_TUTOR_COPY[lang].line, lang).toContain("{exam}");
    }
  });
  it("the route's frames: one delta and a done with the code, no meta (no conversation)", () => {
    const text = kidsGuestTutorText(base, "en");
    expect(text).toContain("(https://shishya.in/exams/SOF_IMO/quiz)");
    expect(text).toContain("[Free practice questions]");
    const frames = kidsGuestTutorFrames(text);
    expect(frames).not.toContain("event: meta");
    expect(frames).toContain(`event: delta\ndata: ${JSON.stringify(text)}\n\n`);
    expect(frames).toContain(`"code":"${KIDS_GUEST_TUTOR_CODE}"`);
  });
  it("kidsTutorLang keeps en / hi / te and falls back to en", () => {
    expect(kidsTutorLang("hi")).toBe("hi");
    expect(kidsTutorLang("te")).toBe("te");
    expect(kidsTutorLang("ta")).toBe("en");
    expect(kidsTutorLang(undefined)).toBe("en");
  });
});

describe("the crawler hold — all five conditions, or nothing", () => {
  const convicted = new Set(["4065b3da6bc72303"]);
  const held = { signedIn: false, autoSeed: true, anonCookie: false, uaHash: "4065b3da6bc72303", convicted };
  it("holds a signed-out, auto-sent, cookie-less seed from a convicted agent", () => {
    expect(guestSeedHold(held)).toBe(true);
  });
  it("lets each one through when any condition fails", () => {
    expect(guestSeedHold({ ...held, signedIn: true })).toBe(false);
    expect(guestSeedHold({ ...held, autoSeed: false })).toBe(false);
    expect(guestSeedHold({ ...held, anonCookie: true })).toBe(false);
    expect(guestSeedHold({ ...held, uaHash: "aaaaaaaaaaaaaaaa" })).toBe(false);
    expect(guestSeedHold({ ...held, uaHash: null })).toBe(false);
    // A failed list read holds nothing (fails open).
    expect(guestSeedHold({ ...held, convicted: null })).toBe(false);
    // Rule 5: a walk-in from a tagged link or another site.
    expect(guestSeedHold({ ...held, taggedLanding: true })).toBe(false);
    expect(guestSeedHold({ ...held, taggedLanding: false })).toBe(true);
  });
  it("reads the list only for a candidate (signed out, auto-sent, no cookie)", () => {
    expect(seedHoldCandidate({ signedIn: false, autoSeed: true, anonCookie: false })).toBe(true);
    expect(seedHoldCandidate({ signedIn: false, autoSeed: true, anonCookie: true })).toBe(false);
    expect(seedHoldCandidate({ signedIn: false, autoSeed: false, anonCookie: false })).toBe(false);
    expect(seedHoldCandidate({ signedIn: true, autoSeed: true, anonCookie: false })).toBe(false);
    expect(seedHoldCandidate({ signedIn: false, autoSeed: true, anonCookie: false, taggedLanding: true })).toBe(false);
  });
  it("taggedLanding is the middleware's trail rule: a utm tag or a referrer on another host", () => {
    expect(LANDING_TAGS).toEqual(["utm_source", "utm_medium", "utm_campaign"]);
    // The middleware reads the same three tags (src/middleware.ts haveTrail).
    const mw = read("src/middleware.ts");
    for (const t of LANDING_TAGS) expect(mw).toContain(`sp.get("${t}")`);
    const q = (s: string) => {
      const p = new URLSearchParams(s);
      return (n: string) => p.get(n);
    };
    const host = "shishya.in";
    // The crawler's landing: no tag, no referrer.
    expect(taggedLanding({ param: q("examCode=SSC_CGL&seed=Walk+me"), referrer: "", host })).toBe(false);
    expect(taggedLanding({ param: q(""), referrer: null, host })).toBe(false);
    // ChatGPT / Copilot / a share: a utm tag, with or without a referrer.
    expect(taggedLanding({ param: q("seed=x&utm_source=chatgpt.com"), referrer: "", host })).toBe(true);
    expect(taggedLanding({ param: q("utm_medium=share"), referrer: undefined, host })).toBe(true);
    expect(taggedLanding({ param: q("utm_campaign=oct"), referrer: undefined, host })).toBe(true);
    expect(taggedLanding({ param: q("utm_source=%20"), referrer: undefined, host })).toBe(false);
    // Another site.
    expect(taggedLanding({ param: q(""), referrer: "https://www.google.com/", host })).toBe(true);
    expect(taggedLanding({ param: q(""), referrer: "https://chatgpt.com/", host: "www.shishya.in" })).toBe(true);
    // This site (either spelling, any page) is not an outside referrer.
    expect(taggedLanding({ param: q(""), referrer: "https://shishya.in/exams/SSC_CGL", host })).toBe(false);
    expect(taggedLanding({ param: q(""), referrer: "https://www.shishya.in/", host })).toBe(false);
    expect(taggedLanding({ param: q(""), referrer: "https://shishya.in/x", host: "www.shishya.in" })).toBe(false);
    expect(taggedLanding({ param: q(""), referrer: "http://localhost:3000/exams/X", host: "localhost:3000" })).toBe(false);
    // A preview host's own pages are not outside either; a garbled referrer counts as none.
    expect(taggedLanding({ param: q(""), referrer: "https://shishya-git-x.vercel.app/a", host: "shishya-git-x.vercel.app" })).toBe(false);
    expect(taggedLanding({ param: q(""), referrer: "not a url", host })).toBe(false);
  });
  it("hasAnonCookie reads the analytics cookie only, with a value", () => {
    expect(ANON_COOKIE).toBe("shishya_anon");
    expect(hasAnonCookie("shishya_anon=3f2c")).toBe(true);
    expect(hasAnonCookie("a=1; shishya_anon=3f2c; b=2")).toBe(true);
    expect(hasAnonCookie("shishya_anon=")).toBe(false);
    expect(hasAnonCookie("x_shishya_anon=3f2c")).toBe(false);
    expect(hasAnonCookie("shishya_land=%2Fchat; shishya-lang=hi")).toBe(false);
    expect(hasAnonCookie(null)).toBe(false);
    expect(hasAnonCookie("")).toBe(false);
  });
  it("the list is a SELECT of ua-sweep-tagged agents in a bounded window — the scrub's own verdict", () => {
    const sql = convictedAgentsSql();
    expect(sql.trim()).toMatch(/^SELECT DISTINCT "uaHash" FROM "AnalyticsEvent"/);
    expect(sql).not.toMatch(/\b(UPDATE|INSERT|DELETE|DROP|ALTER)\b/i);
    expect(sql).toContain(`props->>'retroTag' LIKE '${CONVICTED_AGENT_TAG_LIKE}'`);
    expect(sql).toContain("interval '30 days'");
    expect(convictedAgentsSql(7)).toContain("interval '7 days'");
    // Never anything but a small integer in the SQL text.
    expect(convictedAgentsSql(0)).toContain("interval '30 days'");
    expect(convictedAgentsSql(1.5)).toContain("interval '30 days'");
    // The tag the bot scrub writes.
    expect(read("src/lib/bot-scrub.ts")).toContain("const tag = `ua-sweep-${new Date().toISOString().slice(0, 10)}`;");
    expect(SEED_HELD_ERROR).toBe("seed-held");
  });
});

describe("the user-agent hash is the analytics rows' own", () => {
  it("is HMAC-SHA256 under the stable UA key, 16 hex characters", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Safari/537.36";
    const secret = process.env.NEXTAUTH_SECRET ?? "shishya-analytics";
    const key = createHmac("sha256", secret).update("fp-ua-stable").digest();
    const want = createHmac("sha256", key).update(ua).digest("hex").slice(0, 16);
    expect(uaFingerprint(ua)).toBe(want);
    expect(uaFingerprint(ua)).toMatch(/^[0-9a-f]{16}$/);
    expect(uaFingerprint(null)).toBeNull();
    expect(uaFingerprint("")).toBeNull();
  });
  it("the IP key still rotates by calendar month", () => {
    const a = analyticsFingerprint("1.2.3.4", "ip", new Date("2026-10-11T00:00:00Z"));
    const b = analyticsFingerprint("1.2.3.4", "ip", new Date("2026-11-01T00:00:00Z"));
    expect(a).not.toBe(b);
    expect(analyticsFingerprint("1.2.3.4", "ip", new Date("2026-10-31T23:00:00Z"))).toBe(a);
  });
  it("the analytics route uses the shared function and keeps no copy", () => {
    const src = read("src/app/api/analytics/route.ts");
    expect(src).toContain('import { analyticsFingerprint as fingerprint } from "@/lib/ua-fingerprint";');
    expect(src).not.toContain("createHmac");
    expect(src).toContain('uaHash: !child && !userId && !anonId && !measurement ? fingerprint(req.headers.get("user-agent"), "ua") : null,');
    expect(src).toContain('ipHash: !child && !userId && !anonId && !measurement ? fingerprint(clientIp(req), "ip") : null,');
  });
});

describe("wiring — the route, the page and the chat island", () => {
  const route = read("src/app/api/chat/route.ts");
  const page = read("src/app/chat/page.tsx");
  const island = read("src/app/chat/ChatInterface.tsx");

  it("the route decides both before the pre-filter's log, the exam read and the model", () => {
    const kids = route.indexOf("if (kidsGuestTutorOff({ signedIn: !!userId, general: body.general, examCode: body.examCode })) {");
    const hold = route.indexOf("if (seedHoldCandidate({ signedIn: !!userId, autoSeed: body.autoSeed === true, taggedLanding: body.taggedLanding === true, anonCookie })) {");
    const parse = route.indexOf("body = Body.parse(await req.json());");
    const prefilter = route.indexOf("const scopeReply = chatScopeReply(body.message, schoolUiLang(jar.get(\"shishya-lang\")?.value));");
    const firstLog = route.indexOf("prisma.anonTutorLog.create(");
    const examRead = route.indexOf("await prisma.exam.findUnique({ where: realExamKey({ code: examCodeForChat! }) })");
    expect(parse).toBeGreaterThan(0);
    expect(kids).toBeGreaterThan(parse);
    expect(hold).toBeGreaterThan(kids);
    for (const later of [prefilter, firstLog, examRead]) expect(later).toBeGreaterThan(hold);
    expect(route).toContain("autoSeed: z.boolean().optional(),");
    expect(route).toContain("taggedLanding: z.boolean().optional(),");
  });

  it("a kids' exam guest gets the line, never the chat island or its beacon", () => {
    const branch = page.slice(page.indexOf("if (kidsGuestTutorOff({ signedIn: false, general: generalMode, examCode: sp.examCode })) {"));
    const end = branch.indexOf("\n    }\n");
    const body = branch.slice(0, end);
    expect(body).toContain("<KidsGuestTutorOff offer={offer} lang={kidsTutorLang(locale)} />");
    expect(body).toContain("<Header childSafe />");
    expect(body).not.toContain("<ChatInterface");
    expect(body).not.toContain("ChatOpenedBeacon");
    // It is the guest branch's first decision after the exam read, before the island.
    const guest = page.indexOf("if (!session?.user?.id) {");
    expect(page.indexOf("if (kidsGuestTutorOff(")).toBeGreaterThan(guest);
    expect(page.indexOf("if (kidsGuestTutorOff(")).toBeLessThan(page.indexOf("guestSignInHref={loginHref}"));
  });

  it("both guest islands get the page's crawler verdict", () => {
    expect(page).toContain("seedHold={memberId == null ? await guestSeedHeld() : false}");
    expect(page).toContain("seedHold={await guestSeedHeld()}");
    expect(page).toContain('if (session?.user?.id || !(typeof sp.seed === "string" && sp.seed.trim())) return false;');
    // Rule 5: a walk-in's landing is never held — checked before the list is read.
    const fn = page.slice(page.indexOf("const guestSeedHeld = async"), page.indexOf("// CHAT_OPENED is now fired"));
    const walk = fn.indexOf('if (taggedLanding({ param, referrer: h.get("referer"), host: h.get("host") })) return false;');
    expect(walk).toBeGreaterThan(0);
    expect(walk).toBeLessThan(fn.indexOf("convicted: await loadConvictedAgents(),"));
  });

  it("the island sends the seed with autoSeed and keeps a held one in the box, unsent", () => {
    expect(island).toContain("const pageHold = seedHold === true && !landingTaggedRef.current;");
    expect(island).toContain("if (automated || pageHold || wasSeedFiredRecently(store, fp)) {");
    // Rule 5: the landing is read before the seed leaves the URL, and rides on the seed's own turn.
    const effect = island.slice(island.indexOf("seedFiredRef.current = true;"));
    expect(effect.indexOf("landingTaggedRef.current = taggedLanding({")).toBeGreaterThan(0);
    expect(effect.indexOf("landingTaggedRef.current = taggedLanding({")).toBeLessThan(effect.indexOf("stripSeedParam(window.location.href)"));
    expect(island).toContain("taggedLanding: opts.autoSeed && !opts.retry && landingTaggedRef.current ? true : undefined,");
    expect(island).toContain("void send(seed, reviewAttemptId ? { reviewAttemptId, autoSeed: true } : { autoSeed: true });");
    expect(island).toContain("autoSeed: opts.autoSeed && !opts.retry ? true : undefined,");
    const held = island.slice(island.indexOf("if (res.status === 403 && code === SEED_HELD_ERROR && opts.autoSeed) {"));
    expect(held.slice(0, 300)).toContain("setMessages((m) => m.slice(0, -2));");
    expect(held.slice(0, 300)).toContain("setInput(text);");
    expect(held.slice(0, 300)).toContain("return;");
    // The held check comes before the generic 403 crawler line.
    expect(island.indexOf("code === SEED_HELD_ERROR")).toBeLessThan(island.indexOf('res.status === 403 && code === "unavailable"'));
    // The "press Send" line in en / hi / te.
    expect(island.match(/seedReady: "/g)).toHaveLength(3);
  });
});
