// The exam a new account starts with, and its language (30 Sep 2026,
// sign-up build 2 — src/lib/signup-goal.ts).
//
// Pinned: the callback page names the goal — /exams/{CODE}/… (+ the /hi and
// /te twins), /chat?examCode=, /coach?exam=, /mocks/{id}; never /exams/browse
// or another lower-case section, never a school container (Class 1-7 or
// 8-12); the browser's own last page decides only for a generic callback,
// and only when that last page itself names an exam; the page language is
// stored only when it is not English and the enum has it.
// No DB, no network. Run: npx vitest run tests/unit/signup-goal.test.ts

import { describe, expect, it } from "vitest";
import { callbackAllowsTrailGoal, goalFromTrail, signupGoalOf, signupLanguage } from "@/lib/signup-goal";

describe("signupGoalOf: the page the account was made from", () => {
  it("an exam hub and every exam sub-page (absolute callback cookie or path)", () => {
    for (const url of [
      "https://shishya.in/exams/SSC_CGL",
      "https://shishya.in/exams/SSC_CGL?start=practice",
      "https://shishya.in/exams/SSC_CGL/pyq/2024",
      "http://localhost:3000/exams/SSC_CGL/quiz",
      "/exams/SSC_CGL/topics/number-system",
      "/exams/SSC_CGL/build-mock",
      "/exams/SSC_CGL/syllabus",
      "/hi/exams/SSC_CGL",
      "/te/exams/SSC_CGL/cutoff",
    ]) {
      expect(signupGoalOf(url), url).toEqual({ kind: "exam", code: "SSC_CGL" });
    }
  });

  it("the tutor and the coach name their exam in the query", () => {
    expect(signupGoalOf("https://shishya.in/chat?examCode=RRB_NTPC&seed=x")).toEqual({ kind: "exam", code: "RRB_NTPC" });
    expect(signupGoalOf("/coach?exam=NEET_UG")).toEqual({ kind: "exam", code: "NEET_UG" });
    expect(signupGoalOf("/chat?general=1")).toBeNull();
    expect(signupGoalOf("/coach")).toBeNull();
  });

  it("a mock page names its mock (its exam is looked up server-side)", () => {
    expect(signupGoalOf("https://shishya.in/mocks/cm1abcdefghijklmnopqrstu")).toEqual({ kind: "mock", id: "cm1abcdefghijklmnopqrstu" });
    expect(signupGoalOf("/mocks/cm1abcdefghijklmnopqrstu/review")).toEqual({ kind: "mock", id: "cm1abcdefghijklmnopqrstu" });
    expect(signupGoalOf("/mocks")).toBeNull();
    expect(signupGoalOf("/mocks/x")).toBeNull();
  });

  it("lower-case exam sections are not exams", () => {
    for (const url of ["/exams/browse", "/exams/entrance", "/exams/state/AP", "/exams/category/banking", "/exams/after/12th", "/exams"]) {
      expect(signupGoalOf(url), url).toBeNull();
    }
  });

  it("a school container is never an exam goal — Class 1-7 or 8-12, any way it arrives", () => {
    for (const url of [
      "/exams/NCERT_C09",
      "/exams/NCERT_C05/quiz",
      "/chat?examCode=NCERT_C09&topicCode=x",
      "/chat?examCode=CISCE_C12",
      "/coach?exam=NCERT_C06",
      "/schooling/cbse/class-9/mathematics",
      "/schooling/cbse/class-5",
    ]) {
      expect(signupGoalOf(url), url).toBeNull();
    }
  });

  it("anything else names nothing, and never throws", () => {
    for (const url of [null, undefined, "", "/", "/dashboard", "/colleges/iit-bombay", "/current-affairs", "http://[bad", "/exams/ssc_cgl"]) {
      expect(signupGoalOf(url as string | null)).toBeNull();
    }
  });
});

describe("the browser's last page decides only for a generic callback", () => {
  it("generic returns: none, /, /dashboard, /today, plain /coach and the general chat", () => {
    for (const cb of [null, "", "https://shishya.in/", "https://shishya.in/dashboard", "/today", "/coach", "/chat", "/chat?general=1", "/hi"]) {
      expect(callbackAllowsTrailGoal(cb), String(cb)).toBe(true);
    }
  });

  it("a specific page is the student's own context — no goal from an older page", () => {
    for (const cb of ["/colleges/iit-bombay", "/current-affairs", "/schooling/cbse/class-9", "/exams/browse", "/scholarships", "/chat?examCode=SSC_CGL", "/coach?exam=SSC_CGL"]) {
      expect(callbackAllowsTrailGoal(cb), cb).toBe(false);
    }
  });

  it("goalFromTrail: the newest page before /login, and only if it names an exam", () => {
    expect(goalFromTrail(["/login", "/exams/SSC_CGL/cutoff", "/"])).toEqual({ kind: "exam", code: "SSC_CGL" });
    expect(goalFromTrail(["/login", "/login", "/hi/exams/UPSC_CSE"])).toEqual({ kind: "exam", code: "UPSC_CSE" });
    // The last page read was the home page: an older exam page is not taken over it.
    expect(goalFromTrail(["/login", "/", "/exams/SSC_CGL"])).toBeNull();
    expect(goalFromTrail(["/login", "/schooling/cbse/class-9", "/exams/SSC_CGL"])).toBeNull();
    expect(goalFromTrail([null, "/mocks/cm1abcdefghijklmnopqrstu"])).toEqual({ kind: "mock", id: "cm1abcdefghijklmnopqrstu" });
    expect(goalFromTrail([])).toBeNull();
  });
});

describe("signupLanguage: the page language, when not English", () => {
  it("a /hi or /te callback is the explicit signal and wins over the cookie", () => {
    expect(signupLanguage({ callback: "https://shishya.in/hi/exams/SSC_CGL", cookie: "te" })).toBe("HI");
    expect(signupLanguage({ callback: "/te/exams/SSC_CGL", cookie: null })).toBe("TE");
  });

  it("otherwise the shishya-lang cookie", () => {
    expect(signupLanguage({ callback: "/exams/SSC_CGL", cookie: "hi" })).toBe("HI");
    expect(signupLanguage({ callback: null, cookie: "ta" })).toBe("TA");
  });

  it("English, a locale the enum lacks, or nothing → null (preferredLang stays as it is)", () => {
    expect(signupLanguage({ callback: "/exams/SSC_CGL", cookie: "en" })).toBeNull();
    expect(signupLanguage({ callback: null, cookie: "kok" })).toBeNull();
    expect(signupLanguage({ callback: null, cookie: null })).toBeNull();
    expect(signupLanguage({ callback: "/exams/SSC_CGL", cookie: "garbage;" })).toBeNull();
  });
});
