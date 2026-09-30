// Pure unit tests for the signed-out mock gate and the short-or-full choice
// after sign-in (25 Sep 2026): src/lib/mock-gate.ts and
// src/lib/mock-gate-copy.ts. No DB.
// Run with: npx vitest run tests/unit/mock-gate.test.ts

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHOICE_MIN_QUESTIONS,
  DEFAULT_MOCK_DURATION_MIN,
  FROM_PARAM,
  FROM_SIGNIN,
  WARMUP_QUESTION_COUNT,
  WARMUP_REQUEST,
  WARMUP_RETURN_KEY,
  WARMUP_TIMER_MIN,
  buildGateCallbackPath,
  gateCallbackPath,
  gateLoginRedirectPath,
  isFromSignin,
  isWarmupReturn,
  mockDurationMin,
  mockPathAfterChoice,
  shouldOfferShortOrFull,
  type ChoiceInput,
} from "@/lib/mock-gate";
import { MOCK_GATE_COPY, mockGateCopy, type MockGateCopy } from "@/lib/mock-gate-copy";
import { isSameOriginPath } from "@/lib/login-return";
import { GUEST_WHOLE_PAPER_OPEN } from "@/lib/guest-paper";
import { examHubCopy } from "@/lib/exam-hub-copy";

const ID = "cmtimrgem005b102t2e7u9iyh";
// What src/lib/email.ts withMailUtm() puts on a win-back link.
const EMAIL = { utm_source: "email", utm_medium: "winback", utm_campaign: "winback" };

/** Decode the callbackUrl the way /login's searchParams will see it. */
function callbackOf(loginPath: string): string {
  expect(loginPath.startsWith("/login?callbackUrl=")).toBe(true);
  return new URLSearchParams(loginPath.slice("/login?".length)).get("callbackUrl") ?? "";
}

describe("isFromSignin — the return from Google via the gate", () => {
  it("is true only for from=signin", () => {
    expect(isFromSignin({ from: "signin" })).toBe(true);
    expect(isFromSignin({ from: ["signin", "x"] })).toBe(true);
    expect(isFromSignin(new URLSearchParams("from=signin&utm_source=email"))).toBe(true);
  });

  it("is false for anything else", () => {
    expect(isFromSignin({})).toBe(false);
    expect(isFromSignin(null)).toBe(false);
    expect(isFromSignin(undefined)).toBe(false);
    expect(isFromSignin({ from: "Signin" })).toBe(false);
    expect(isFromSignin({ from: "email" })).toBe(false);
    expect(isFromSignin({ from: ["x", "signin"] })).toBe(false);
    expect(isFromSignin({ utm_source: "signin" })).toBe(false);
  });
});

describe("shouldOfferShortOrFull — who sees the choice", () => {
  const base: ChoiceInput = { fromSignin: true, questionCount: 100, hasInProgress: false, isLiveTest: false };

  it("a paper-length mock, just signed in, nothing in progress → choice", () => {
    expect(shouldOfferShortOrFull(base)).toBe(true);
    expect(shouldOfferShortOrFull({ ...base, questionCount: CHOICE_MIN_QUESTIONS })).toBe(true);
    expect(CHOICE_MIN_QUESTIONS).toBe(50);
  });

  it("no from=signin → today's start-on-load", () => {
    expect(shouldOfferShortOrFull({ ...base, fromSignin: false })).toBe(false);
  });

  it("under 50 questions → today's start-on-load", () => {
    expect(shouldOfferShortOrFull({ ...base, questionCount: 49 })).toBe(false);
    expect(shouldOfferShortOrFull({ ...base, questionCount: 5 })).toBe(false);
    expect(shouldOfferShortOrFull({ ...base, questionCount: 0 })).toBe(false);
  });

  it("resuming an attempt → today's resume", () => {
    expect(shouldOfferShortOrFull({ ...base, hasInProgress: true })).toBe(false);
  });

  it("a live test keeps its start-on-load flow", () => {
    expect(shouldOfferShortOrFull({ ...base, isLiveTest: true })).toBe(false);
  });
});

describe("gateCallbackPath — the gate's Google callback", () => {
  it("is this mock + from=signin", () => {
    expect(gateCallbackPath(ID, {})).toBe(`/mocks/${ID}?from=signin`);
    expect(gateCallbackPath(ID, null)).toBe(`/mocks/${ID}?from=signin`);
  });

  it("keeps the three valid utm tags after from=signin", () => {
    expect(gateCallbackPath(ID, EMAIL)).toBe(
      `/mocks/${ID}?from=signin&utm_source=email&utm_medium=winback&utm_campaign=winback`,
    );
    expect(gateCallbackPath(ID, new URLSearchParams("utm_source=chatgpt.com"))).toBe(
      `/mocks/${ID}?from=signin&utm_source=chatgpt.com`,
    );
  });

  it("copies nothing else from the gate URL (tokens, callbackUrl, its own from)", () => {
    const p = gateCallbackPath(ID, {
      ...EMAIL,
      utm_content: "x",
      token: "abc",
      callbackUrl: "https://evil.example",
      from: "elsewhere",
    });
    expect(p).toBe(`/mocks/${ID}?from=signin&utm_source=email&utm_medium=winback&utm_campaign=winback`);
    expect(p).not.toMatch(/token|evil|utm_content|elsewhere/);
  });

  it("drops a malformed utm value instead of rewriting it", () => {
    expect(gateCallbackPath(ID, { utm_source: "<script>", utm_medium: "win back" })).toBe(`/mocks/${ID}?from=signin`);
  });

  it("is always a same-origin relative path, even for a hostile id", () => {
    for (const id of [ID, "//evil.example", "/\\evil", "a b", "x?from=signin#y", "https://evil.example"]) {
      const p = gateCallbackPath(id, EMAIL);
      expect(isSameOriginPath(p)).toBe(true);
      expect(p.startsWith("/mocks/")).toBe(true);
      expect(new URL(p, "https://shishya.in").origin).toBe("https://shishya.in");
      expect(new URL(p, "https://shishya.in").searchParams.get(FROM_PARAM)).toBe(FROM_SIGNIN);
    }
  });
});

describe("gateLoginRedirectPath — the private-mock bounce keeps the marker", () => {
  it("wraps the same callback once-encoded", () => {
    const login = gateLoginRedirectPath(ID, EMAIL);
    expect(callbackOf(login)).toBe(gateCallbackPath(ID, EMAIL));
    expect(login).toBe(`/login?callbackUrl=${encodeURIComponent(gateCallbackPath(ID, EMAIL))}`);
  });

  it("does not put the utm tags on /login itself", () => {
    const login = gateLoginRedirectPath(ID, EMAIL);
    expect(new URLSearchParams(login.slice("/login?".length)).get("utm_source")).toBeNull();
  });
});

describe("mockPathAfterChoice — where 'Start this mock' goes", () => {
  it("is the mock without from=signin, so a reload resumes instead of asking again", () => {
    expect(mockPathAfterChoice(ID, { from: "signin" })).toBe(`/mocks/${ID}`);
    expect(isFromSignin(new URL(mockPathAfterChoice(ID, { from: "signin" }), "https://shishya.in").searchParams)).toBe(false);
  });

  it("keeps the valid utm tags and nothing else", () => {
    expect(mockPathAfterChoice(ID, { from: "signin", ...EMAIL, token: "t" })).toBe(
      `/mocks/${ID}?utm_source=email&utm_medium=winback&utm_campaign=winback`,
    );
  });

  it("round trip: gate callback → choice → full paper never loops back to the choice", () => {
    const landed = new URL(gateCallbackPath(ID, EMAIL), "https://shishya.in");
    expect(isFromSignin(landed.searchParams)).toBe(true);
    const full = new URL(mockPathAfterChoice(ID, landed.searchParams), "https://shishya.in");
    expect(full.pathname).toBe(`/mocks/${ID}`);
    expect(isFromSignin(full.searchParams)).toBe(false);
    expect(full.searchParams.get("utm_source")).toBe("email");
  });
});

describe("buildGateCallbackPath — the builder's quiz-end sign-in", () => {
  it("returns to the builder, in PYQ mode when the visitor was in it", () => {
    expect(buildGateCallbackPath("SBI_CLERK", false, {})).toBe("/exams/SBI_CLERK/build-mock");
    expect(buildGateCallbackPath("SBI_CLERK", true, {})).toBe("/exams/SBI_CLERK/build-mock?pyq=1");
  });

  it("carries the valid utm tags, no from=signin", () => {
    expect(buildGateCallbackPath("SBI_CLERK", true, { ...EMAIL, topics: "x" })).toBe(
      "/exams/SBI_CLERK/build-mock?pyq=1&utm_source=email&utm_medium=winback&utm_campaign=winback",
    );
    expect(buildGateCallbackPath("SBI_CLERK", false, EMAIL)).not.toContain("from=");
  });

  it("stays same-origin for a hostile code", () => {
    expect(isSameOriginPath(buildGateCallbackPath("//evil.example", false, EMAIL))).toBe(true);
  });
});

describe("mockDurationMin — the timer the player will run", () => {
  it("reads config.durationMin like the page does, else 30", () => {
    expect(mockDurationMin({ durationMin: 60 })).toBe(60);
    expect(mockDurationMin({ durationMin: 120, count: 100 })).toBe(120);
    expect(mockDurationMin({ durationMin: "90" })).toBe(90);
    expect(mockDurationMin({})).toBe(DEFAULT_MOCK_DURATION_MIN);
    expect(mockDurationMin(null)).toBe(30);
    expect(mockDurationMin(undefined)).toBe(30);
    expect(mockDurationMin({ durationMin: null })).toBe(30);
    expect(mockDurationMin({ durationMin: "abc" })).toBe(30);
    expect(mockDurationMin([])).toBe(30);
  });
});

describe("the warm-up is the hub's own diagnostic, with its real size and timer", () => {
  const root = path.resolve(__dirname, "../..");

  it("sends the same request StartMockButton's ?start=diagnostic sends", () => {
    expect(WARMUP_REQUEST).toEqual({ type: "DIAGNOSTIC", questionCount: 5 });
    expect(WARMUP_QUESTION_COUNT).toBe(5);
    const src = readFileSync(path.join(root, "src/app/exams/[code]/StartMockButton.tsx"), "utf8");
    expect(src).toContain('{ type: "DIAGNOSTIC", questionCount: 5 }');
  });

  it("shows the timer /api/mocks will set: estimateDuration(5) = 10", () => {
    expect(WARMUP_TIMER_MIN).toBe(10);
    const gen = readFileSync(path.join(root, "src/lib/ai/generator.ts"), "utf8");
    expect(gen).toContain("return Math.max(10, Math.round(count * 1.2));");
    expect(gen).toMatch(/ruleBasedDiagnostic[\s\S]*?durationMin: estimateDuration\(picked\.length\)/);
  });
});

// 25 Sep 2026 (review): the warm-up used to router.replace the choice away,
// so after it nothing led back to the paper. The note now tells the student
// "press Back", which is only true while these two navigations hold.
describe("the way back from the warm-up to the paper", () => {
  const root = path.resolve(__dirname, "../..");

  it("isWarmupReturn: only this paper's marker counts", () => {
    expect(WARMUP_RETURN_KEY).toBe("shishya.warmupFor");
    expect(isWarmupReturn(ID, ID)).toBe(true);
    expect(isWarmupReturn("other-mock", ID)).toBe(false);
    expect(isWarmupReturn(null, ID)).toBe(false);
    expect(isWarmupReturn(undefined, ID)).toBe(false);
    expect(isWarmupReturn("", "")).toBe(false);
  });

  it("the choice pushes the warm-up (keeps itself in history) and marks the tab", () => {
    const src = readFileSync(path.join(root, "src/app/mocks/[id]/ShortOrFullChoice.tsx"), "utf8");
    expect(src).toContain("router.push(`/mocks/${encodeURIComponent(data.mock.id)}`)");
    expect(src).not.toContain("router.replace(`/mocks/${encodeURIComponent(data.mock.id)}`)");
    expect(src).toContain("sessionStorage.setItem(WARMUP_RETURN_KEY, mockId)");
    // "Full" still leaves the choice for good: a reload then resumes.
    expect(src).toContain("router.replace(fullHref)");
  });

  it("the player replaces itself with the result, so Back from the result skips it", () => {
    const player = readFileSync(path.join(root, "src/app/mocks/[id]/MockPlayer.tsx"), "utf8");
    expect(player).toContain("router.replace(`/attempts/${attemptId}/results`)");
  });
});

describe("mock gate copy — en, hi, te", () => {
  const keys = Object.keys(MOCK_GATE_COPY.en) as (keyof MockGateCopy)[];
  const placeholders = (s: string) => (s.match(/\{[a-z]+\}/g) ?? []).sort();

  it("every locale has every key, non-empty", () => {
    for (const loc of ["en", "hi", "te"] as const) {
      expect(Object.keys(MOCK_GATE_COPY[loc]).sort()).toEqual([...keys].sort());
      for (const k of keys) expect(MOCK_GATE_COPY[loc][k].trim().length).toBeGreaterThan(0);
    }
  });

  it("every locale keeps the same {placeholders}", () => {
    for (const k of keys) {
      const en = placeholders(MOCK_GATE_COPY.en[k]);
      expect(placeholders(MOCK_GATE_COPY.hi[k]), `hi ${k}`).toEqual(en);
      expect(placeholders(MOCK_GATE_COPY.te[k]), `te ${k}`).toEqual(en);
    }
  });

  it("sizes and times are never typed in: {n}/{min} carry them", () => {
    for (const loc of ["en", "hi", "te"] as const) {
      const c = MOCK_GATE_COPY[loc];
      for (const k of ["size", "choiceFull", "choiceShort"] as const) {
        expect(placeholders(c[k])).toEqual(["{min}", "{n}"]);
        expect(c[k].replace(/\{[a-z]+\}/g, "")).not.toMatch(/\d/);
      }
      for (const k of ["quizLine", "quizStart", "choiceShortNote"] as const) {
        expect(c[k]).toContain("{n}");
        expect(c[k].replace(/\{[a-z]+\}/g, "")).not.toMatch(/\d/);
      }
    }
  });

  it("the guest-quiz lines never claim the quiz saves anything", () => {
    for (const loc of ["en", "hi", "te"] as const) {
      const c = MOCK_GATE_COPY[loc];
      for (const k of ["quizHeading", "quizLine", "quizStart", "quizEndSignIn", "buildQuizEndSignIn"] as const) {
        expect(c[k]).not.toMatch(/sav|सेव|సేవ్|progress|प्रगति|ప్రగతి/i);
      }
    }
  });

  // 25 Sep 2026 (review): ruleBasedDiagnostic gives floor(5 / subjects) per
  // subject, so on an exam with more than 5 subjects only the first five are
  // drawn from; /api/mocks tops a short set up from any subject/difficulty.
  it("the warm-up note makes no subject-coverage or difficulty claim, and says how to get back", () => {
    for (const loc of ["en", "hi", "te"] as const) {
      const note = MOCK_GATE_COPY[loc].choiceShortNote;
      expect(note, loc).not.toMatch(/all (its )?subjects|every subject|सभी विषय|हर विषय|అన్ని సబ్జెక్ట|ప్రతి సబ్జెక్ట/i);
      expect(note, loc).not.toMatch(/easy|medium|आसान|मध्यम|సులభ|మధ్యస్థ/i);
      expect(note, loc).toContain("Back");
      expect(note, loc).toContain("{exam}");
    }
  });

  // 25 Sep 2026 (integration): 18 of the 761 public 50+ question mocks that
  // get the choice are titled as part of a paper ("2025 PYQ-pattern set (120
  // of 200 questions)", AP AMVI "Paper-I practice set"), so the choice never
  // calls the mock "the full paper".
  it("the choice never calls the mock a full paper", () => {
    for (const loc of ["en", "hi", "te"] as const) {
      const c = MOCK_GATE_COPY[loc];
      for (const k of ["choiceHeading", "choiceLine", "choiceFull", "choiceShortNote", "choiceBackLine"] as const) {
        expect(c[k], `${loc} ${k}`).not.toMatch(/full paper|full-length|पूरा पेपर|पूर्ण|పూర్తి పేపర్|పూర్తి/i);
      }
    }
  });

  it("the back-from-warm-up line types no number and promises no auto-start", () => {
    for (const loc of ["en", "hi", "te"] as const) {
      const line = MOCK_GATE_COPY[loc].choiceBackLine;
      expect(line, loc).not.toMatch(/\d/);
      expect(line, loc).not.toMatch(/\{[a-z]+\}/);
    }
  });

  it("the gate makes no rank claim (a rank exists only for some papers)", () => {
    for (const loc of ["en", "hi", "te"] as const) {
      expect(MOCK_GATE_COPY[loc].body).not.toMatch(/rank|रैंक|ర్యాంక్/i);
    }
  });

  it("falls back to English for other locales", () => {
    expect(mockGateCopy("ta")).toBe(MOCK_GATE_COPY.en);
    expect(mockGateCopy(null)).toBe(MOCK_GATE_COPY.en);
    expect(mockGateCopy("hi")).toBe(MOCK_GATE_COPY.hi);
    expect(mockGateCopy("te")).toBe(MOCK_GATE_COPY.te);
  });
});

// 27 Sep 2026 (founder: content first; sign-in never questions).
// 28 Sep 2026 (founder: "the sign-up has to be there, the way it was"): the
// free sign-in is the main action again on the hub box, the mock page and
// the past-year page; the no-sign-in quiz sits beside or under it. Sign-ups
// had gone from about 25 a day to 10 in the two days it was a side link.
// Source pins for the practice surfaces a guest or a fresh sign-in meets.
describe("sign-in is the main action on practice surfaces; no question after it", () => {
  const root = path.resolve(__dirname, "../..");
  const read = (rel: string) => readFileSync(path.join(root, rel), "utf8").replace(/\r\n/g, "\n");

  it("/mocks/{id}: a return from sign-in starts the paper — the choice screen is not imported", () => {
    const page = read("src/app/mocks/[id]/page.tsx");
    expect(page).not.toMatch(/import\(["']\.\/ShortOrFullChoice["']\)|from ["']\.\/ShortOrFullChoice["']|<ShortOrFullChoice\b/);
    expect(page).not.toContain("shouldOfferShortOrFull(");
    expect(page).toContain("a return from sign-in starts the paper the student asked for");
  });

  it("the guest gate shows the sign-in card first, then the no-sign-in quiz", () => {
    const gate = read("src/app/mocks/[id]/MockGate.tsx");
    const quiz = gate.indexOf("<GuestQuizGate");
    const signIn = gate.indexOf("<GateSignInButton");
    expect(signIn).toBeGreaterThan(-1);
    expect(quiz).toBeGreaterThan(signIn);
  });

  it("a guest on /mocks/{id} gets the sign-in card: the guest whole paper is closed", () => {
    expect(GUEST_WHOLE_PAPER_OPEN).toBe(false);
    const page = read("src/app/mocks/[id]/page.tsx");
    expect(page).toContain('if (GUEST_WHOLE_PAPER_OPEN && guestMock.generatedBy !== "live-test"');
    const pyq = read("src/app/exams/[code]/pyq/[year]/page.tsx");
    expect(pyq).toContain("const guestPaperId = !userId && GUEST_WHOLE_PAPER_OPEN");
  });

  it("the hub's diagnostic button sends a guest to /login and back to the diagnostic", () => {
    const src = read("src/app/exams/[code]/StartMockButton.tsx");
    // 30 Sep 2026 (sign-up build 1): the 401 sends the site-wide sign-in beacon
    // (surface "hub-start-401"; it was cta "diagnostic-401") and names its door (from=).
    expect(src).toMatch(/if \(res\.status === 401\) \{[\s\S]{0,500}?signinBeacon\("hub-start-401"[\s\S]{0,200}?window\.location\.href = loginHrefFor\(/);
    expect(src).toContain('loginHrefFor(`/exams/${examCode}?start=diagnostic`, "hub-start-401")');
    expect(src).not.toContain("window.location.href = `/exams/${examCode}/quiz`");
  });

  it("the exam hub: no tour overlay; the free sign-in is the filled button, the quiz the outlined one beside it", () => {
    const hub = read("src/app/exams/[code]/page.tsx");
    expect(hub).not.toContain("<PageTour");
    const box = hub.slice(hub.indexOf("{!userId && hasContent && ("));
    const quiz = box.indexOf("href={`/exams/${exam.code}/quiz`}");
    const signIn = box.indexOf("<HubSignInLink");
    expect(signIn).toBeGreaterThan(-1);
    expect(quiz).toBeGreaterThan(signIn);
    expect(box.slice(signIn, quiz)).toContain('className="btn-primary inline-block !py-2 !px-4 text-sm"');
    expect(box.slice(quiz, quiz + 400)).toContain("border-2 border-saffron-500");
    expect(examHubCopy("en").coachButton).toBe("Sign in free — start practising →");
  });

  it("the PYQ year page: the free sign-in is the guest's main button; this set's own questions with no sign-in is the link under it", () => {
    const pyq = read("src/app/exams/[code]/pyq/[year]/page.tsx");
    // 27 Sep 2026 (review): only ids the no-sign-in player replays (MCQ, not
    // withdrawn — getAnonQuiz's filter), so "{n} questions from this set" holds.
    expect(pyq).toMatch(/const guestSet = questions\s*\.filter\(\(q\) => q\.type === "MCQ" && !q\.tags\.includes\("rejected"\)\)\s*\.slice\(0, 10\)\s*\.map\(\(q\) => q\.id\);/);
    expect(read("src/lib/anon-quiz.ts")).toContain('validated: true, type: "MCQ", NOT: { tags: { has: "rejected" } } },');
    // 28 Sep 2026: the whole-set branch stays in the file behind GUEST_WHOLE_PAPER_OPEN (closed); in the
    // branch a guest gets, the sign-in button comes first and is the filled one.
    expect(pyq).toContain("{!userId && guestPaperId ? (");
    const branch = pyq.slice(pyq.indexOf(") : !userId && guestSet.length >= 5 ? ("));
    const signIn = branch.indexOf("{P.ctaSignIn}");
    const practise = branch.indexOf("{fillPyq(P.ctaPractise, { n: guestSet.length })}");
    expect(signIn).toBeGreaterThan(-1);
    expect(practise).toBeGreaterThan(signIn);
    expect(branch.slice(0, signIn)).toContain('className="btn-primary text-center"');
    // 30 Sep 2026 (sign-up build 1): the same filled button as the shared in-page
    // sign-in (SignInLink, surface "pyq-year"), its /login link naming the door.
    expect(branch.slice(0, signIn)).toContain("<SignInLink");
    expect(branch.slice(0, signIn)).toContain('surface="pyq-year"');
    expect(branch.slice(0, signIn)).toContain("href={`/login?callbackUrl=${encodeURIComponent(`/exams/${code}/pyq/${yearNum}`)}&from=pyq-year`}");
    expect(branch).toContain("href={`/exams/${code}/quiz?set=${guestSet.join(\",\")}&n=${guestSet.length}`}");
  });

  it("the PYQ start button opens no dialog; the warm-up is an optional link", () => {
    const btn = read("src/app/exams/[code]/pyq/[year]/StartFullMockButton.tsx");
    expect(btn).not.toContain('role="dialog"');
    expect(btn).not.toContain("setOpen");
    expect(btn).toContain("{C.warmupCta}");
  });

  it("/for/{persona}: sign-in returns to the persona page, never into /onboarding", () => {
    const persona = read("src/app/for/[persona]/page.tsx");
    expect(persona).not.toContain("/onboarding");
    expect(persona).toContain("href={`/login?callbackUrl=${encodeURIComponent(`/for/${persona.slug}`)}`}");
  });
});
