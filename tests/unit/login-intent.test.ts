// /login's card for a callback (src/lib/login-intent.ts, 27 Sep 2026 review).
// The header "Sign in" and the SignupNudge send the current page plus
// from=header, so every page is now a possible callback: a header click is
// never a gated action, /exams/browse is not an exam, an exam sub-page is
// not a mock, and /mentors is not /mentor.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loginIntent } from "@/lib/login-intent";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("loginIntent — gated actions", () => {
  it("a mock, a PYQ set, an exam quiz or topics, a diagnostic and the exam hub get the mock card", () => {
    expect(loginIntent("/mocks/abc123")).toEqual({ kind: "mock", examCode: null, tryFirst: false });
    expect(loginIntent("/exams/SSC_CGL/pyq/2024")).toEqual({ kind: "mock", examCode: "SSC_CGL", tryFirst: true });
    expect(loginIntent("/exams/SSC_CGL/quiz")).toMatchObject({ kind: "mock", examCode: "SSC_CGL" });
    expect(loginIntent("/exams/SSC_CGL/topics/quant.algebra")).toMatchObject({ kind: "mock", examCode: "SSC_CGL" });
    expect(loginIntent("/exams/SSC_CGL")).toMatchObject({ kind: "mock", examCode: "SSC_CGL", tryFirst: true });
    expect(loginIntent("/exams/SSC_CGL#custom-mock")).toMatchObject({ kind: "mock", examCode: "SSC_CGL" });
    expect(loginIntent("/exams/IBPS_PO?start=diagnostic")).toMatchObject({ kind: "mock", examCode: "IBPS_PO" });
    expect(loginIntent("https://shishya.in/exams/SSC_CGL")).toMatchObject({ kind: "mock", examCode: "SSC_CGL" });
  });

  it("an exam sub-page that is not gated is no mock (the user returns to the syllabus, not a mock)", () => {
    expect(loginIntent("/exams/SSC_CGL/syllabus")).toEqual({ kind: null, examCode: "SSC_CGL", tryFirst: false });
    expect(loginIntent("/exams/SSC_CGL/cutoff")).toMatchObject({ kind: null, tryFirst: false });
  });

  it("section pages under /exams are not exams: no 'browse mock', no /exams/browse/quiz link", () => {
    for (const cb of ["/exams/browse", "/exams/entrance", "/exams/state/telangana", "/exams/category/banking", "/exams/after/12th"]) {
      expect(loginIntent(cb), cb).toEqual({ kind: null, examCode: null, tryFirst: false });
    }
  });

  it("coach and 'Welcome back' only on their own anchored paths; /mentors is not /mentor", () => {
    expect(loginIntent("/coach").kind).toBe("coach");
    expect(loginIntent("/coach?exam=SSC_CGL").kind).toBe("coach");
    expect(loginIntent("/me/report").kind).toBe("return");
    expect(loginIntent("/mentor").kind).toBe("return");
    expect(loginIntent("/live-test").kind).toBe("return");
    // 2 Oct 2026: /live-test's own guest button ("Sign up with Google", from=live-test) is a sign-up —
    // the general card, never "Welcome back … your mocks, plan and report are all still here".
    expect(loginIntent("/live-test", "live-test")).toEqual({ kind: null, examCode: null, tryFirst: false });
    expect(loginIntent("/hi/live-test", "live-test").kind).toBeNull();
    // The tag only takes "Welcome back" away: a gated action keeps its own card.
    expect(loginIntent("/mocks/abc12345", "live-test").kind).toBe("mock");
    expect(read("src/app/live-test/page.tsx")).toContain('href="/login?callbackUrl=%2Flive-test&from=live-test"');
    expect(loginIntent("/mentors").kind).toBeNull();
    expect(loginIntent("/mentors/ssc").kind).toBeNull();
    expect(loginIntent("/coaching-centres").kind).toBeNull();
  });

  it("chat and school callbacks get their own cards", () => {
    expect(loginIntent("/chat?general=1").kind).toBe("chat");
    expect(loginIntent("/chat?examCode=SSC_CGL").kind).toBe("chat");
    expect(loginIntent("/chat?examCode=NCERT_C09&topicCode=iemh1.ch02&from=school").kind).toBe("school");
    expect(loginIntent("/schooling/cbse/class-9/mathematics/polynomials?from=school").kind).toBe("school");
    expect(loginIntent("/dashboard").kind).toBeNull();
  });
});

describe("loginIntent — from=header (the header Sign in and the SignupNudge)", () => {
  it("is never a gated action: no mock, coach or 'Welcome back' card, no try-first link", () => {
    for (const cb of ["/exams/SSC_CGL", "/exams/SSC_CGL/quiz", "/exams/SSC_CGL/pyq/2024", "/mocks/abc", "/coach", "/live-test", "/me/report", "/mentor"]) {
      const li = loginIntent(cb, "header");
      expect(li.kind, cb).toBeNull();
      expect(li.tryFirst, cb).toBe(false);
    }
  });

  it("still gets the chat and school cards (they only say what signing in keeps)", () => {
    expect(loginIntent("/chat?general=1", "header").kind).toBe("chat");
    expect(loginIntent("/schooling/cbse/class-10", "header").kind).toBe("school");
  });

  it("the header and the nudge both send from=header; /login reads it through loginIntent", () => {
    expect(read("src/components/HeaderAuthControls.tsx")).toContain(
      "setLoginHref(`/login?callbackUrl=${encodeURIComponent(p + location.search)}&from=header`)",
    );
    expect(read("src/components/SignupNudge.tsx")).toContain(
      "href={`/login?callbackUrl=${encodeURIComponent(location.pathname + location.search)}&from=header`}",
    );
    const login = read("src/app/login/page.tsx");
    expect(login).toContain("const li = loginIntent(cb, sp.from);");
    expect(login).toContain("{examCode && li.tryFirst && (");
    expect(login).not.toMatch(/cb\.match\(\/\\\/exams\\\/\(\[A-Z0-9_\]\+\)\/i\)/);
  });

  it("a stale session with no User row is sent to /logout from /me and /me/settings (no /me → /login → /me loop)", () => {
    for (const f of ["src/app/me/page.tsx", "src/app/me/settings/page.tsx"]) {
      const src = read(f);
      expect(src, f).toContain('if (!user) redirect("/logout");');
      expect(src, f).not.toMatch(/if \(!user\) redirect\("\/login/);
    }
  });
});

// 30 Sep 2026 (sign-up build 1): in-page sign-in buttons name their door on
// /login with from=<surface id> (src/lib/signin-cta.ts). Only header, pitch and
// wall are general sign-ins; every new door keeps the card its callback gives,
// and the hub box's new ?start=practice callback is still the mock card.
describe("loginIntent — the doors' from= ids keep today's cards", () => {
  it("hub-box / pyq-year / quiz-end / hub-try-one / *-401 read like no from at all", () => {
    for (const from of ["hub-box", "pyq-year", "quiz-end", "hub-try-one", "hub-start-401", "subject-test-401", "topic-quiz-401", "custom-mock-401", "build-mock-form"]) {
      for (const cb of ["/exams/SSC_CGL", "/exams/SSC_CGL/pyq/2024", "/exams/SSC_CGL/syllabus", "/coach", "/chat?general=1", "/dashboard"]) {
        expect(loginIntent(cb, from), `${from} ${cb}`).toEqual(loginIntent(cb));
      }
    }
  });

  it("the hub box's callback /exams/CODE?start=practice gets the mock card and the try-first link", () => {
    expect(loginIntent("/exams/SSC_CGL?start=practice", "hub-box")).toEqual({ kind: "mock", examCode: "SSC_CGL", tryFirst: true });
    expect(loginIntent("/hi/exams/SSC_CGL?start=practice", "hub-box")).toMatchObject({ kind: "mock", examCode: "SSC_CGL" });
  });

  it("header, pitch and wall stay general", () => {
    for (const from of ["header", "pitch", "wall"]) {
      expect(loginIntent("/exams/SSC_CGL?start=practice", from).kind).toBeNull();
    }
  });
});
