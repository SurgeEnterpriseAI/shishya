// The welcome mail and a school sign-in (26 Sep 2026, student mode, fixer).
//
// The NextAuth createUser event fires once per new account and sent the
// exam-prep welcome ("your 90-second diagnostic is ready", "the surest way
// to crack the job", a human subject expert, /coach) to EVERY new account —
// a 13-17 student whose first sign-in is the Class 8-12 school entry
// included. The age band is declared after this event, so the only signal
// is where NextAuth sends the browser next: its callback-url cookie. Pinned
// here against the real authOptions with the cookie jar, the mailer, the
// analytics writer and the attribution capture stubbed:
//   • a school-page return (either cookie name) → no welcome mail, and the
//     SIGNUP row carries props.school = true;
//   • a school-tutor return (/chat?examCode=<container>) → no welcome mail;
//   • an exam return, no cookie, or an unreadable jar → the welcome exactly
//     as before, with the SIGNUP props byte-identical to before;
//   • no email on the account → no mail either way (unchanged).
// 27 Sep 2026 (founder: no age question — safeguards by context): a first
// sign-in that returns to a Class 8-12 school page or the school chat also
// enrols the account on that class container with the school flag (the
// marker the mail audiences and the dashboard's school home read); a
// Class 1-7 return, an exam return or no cookie enrols nothing, and a
// failing enrolment is swallowed.
// 30 Sep 2026 (sign-up build 1): the SIGNUP props also say where the account
// was made from — callbackFamily (always), callbackPath (the callback's path,
// no query) and landingPath (the `shishya_land` first-landing cookie) — so
// "byte-identical" now means: provider (+ school) exactly as before, plus
// those three (src/lib/signin-cta.ts signupEventProps).
// 30 Sep 2026 (sign-up build 2): createUser then hands the sign-up profile
// (src/lib/signup-profile.ts — the exam goal, language, guest links and the
// welcome strip's cookie; its own rules are pinned in
// tests/unit/signup-profile.test.ts) the account, the anonId, the callback
// and the school flag; a failing profile changes nothing above.
// No DB, no network. Run: npx vitest run tests/unit/auth-welcome-school.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  cookies: {} as Record<string, string>,
  cookiesThrow: false,
  welcome: [] as unknown[],
  events: [] as Record<string, unknown>[],
  containerLookups: [] as string[],
  enrolments: [] as { userId: string; exam: { id: string; code: string; category: string }; patch: unknown; opts: unknown }[],
  enrolThrows: false,
  profiles: [] as Record<string, unknown>[],
  profileThrows: false,
}));

vi.mock("next/headers", () => ({
  cookies: async () => {
    if (state.cookiesThrow) throw new Error("cookies() outside a request scope");
    return {
      get: (name: string) => (name in state.cookies ? { name, value: state.cookies[name] } : undefined),
      set: () => {},
    };
  },
}));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: () => ({}) }));
vi.mock("next-auth", () => ({ getServerSession: async () => null }));
vi.mock("next-auth/providers/google", () => ({ default: () => ({ id: "google" }) }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/signup-attribution", () => ({
  readAnalyticsAnonId: async () => "anon-1",
  captureSignupAttribution: async () => null,
}));
vi.mock("@/lib/analytics", () => ({
  recordEvent: async (e: Record<string, unknown>) => {
    state.events.push(e);
  },
}));
vi.mock("@/lib/email", () => ({
  sendWelcomeEmail: async (u: unknown) => {
    state.welcome.push(u);
    return true;
  },
}));
vi.mock("@/lib/school/student-db", () => ({
  // A Class 8-12 container row (the real helper returns null for Class 1-7
  // and real exam codes; the caller filters those before asking).
  findStudentModeContainer: async (code: string) => {
    state.containerLookups.push(code);
    const cls = Number(/_C(\d{2})$/.exec(code)?.[1] ?? NaN);
    return cls >= 8 && cls <= 12
      ? { id: `exam-${code}`, code, category: "SCHOOL_BOARD", shortName: `Class ${cls}`, name: `Class ${cls}`, durationMin: 30, totalQuestions: 10, cls }
      : null;
  },
}));
vi.mock("@/lib/db/enrollment", () => ({
  ensureEnrollment: async (userId: string, exam: { id: string; code: string; category: string }, patch: unknown, opts: unknown) => {
    if (state.enrolThrows) throw new Error("db down");
    state.enrolments.push({ userId, exam, patch, opts });
    return {};
  },
}));

vi.mock("@/lib/signup-profile", () => ({
  applySignupProfile: async (input: Record<string, unknown>) => {
    if (state.profileThrows) throw new Error("db down");
    state.profiles.push(input);
    return { goal: null, lang: null, challengesLinked: 0, alertsLinked: 0, welcomeCookie: !input.school };
  },
}));

import { authOptions } from "@/lib/auth";

const SECURE = "__Secure-next-auth.callback-url";
const PLAIN = "next-auth.callback-url";
const USER = { id: "u-1", email: "student@example.com", name: "Asha", emailVerified: null };

async function signUp(user: typeof USER | { id: string; email: string | null; name: string | null; emailVerified: null } = USER) {
  const createUser = authOptions.events?.createUser;
  expect(createUser).toBeTypeOf("function");
  await createUser!({ user: user as never });
}

function signupRow() {
  const rows = state.events.filter((e) => e.kind === "SIGNUP");
  expect(rows).toHaveLength(1);
  return rows[0];
}

beforeEach(() => {
  state.cookies = {};
  state.cookiesThrow = false;
  state.welcome = [];
  state.events = [];
  state.containerLookups = [];
  state.enrolments = [];
  state.enrolThrows = false;
  state.profiles = [];
  state.profileThrows = false;
});

describe("createUser: no exam-prep welcome mail on a school sign-in", () => {
  it("a Class 9 chapter return (secure cookie, production) → no welcome; SIGNUP carries school: true", async () => {
    state.cookies[SECURE] = "https://shishya.in/schooling/cbse/class-9/mathematics/polynomials?from=school";
    await signUp();
    expect(state.welcome).toEqual([]);
    expect(signupRow().props).toEqual({
      provider: "google",
      school: true,
      callbackFamily: "other",
      callbackPath: "/schooling/cbse/class-9/mathematics/polynomials",
    });
    expect(signupRow().userId).toBe("u-1");
  });

  it("a class-page return (plain cookie, dev) → no welcome", async () => {
    state.cookies[PLAIN] = "http://localhost:3000/schooling/cbse/class-8";
    await signUp();
    expect(state.welcome).toEqual([]);
    expect(signupRow().props).toEqual({ provider: "google", school: true, callbackFamily: "other", callbackPath: "/schooling/cbse/class-8" });
  });

  it("a school-tutor return (/chat?examCode=<container>) → no welcome", async () => {
    state.cookies[SECURE] = "https://shishya.in/chat?examCode=NCERT_C09&topicCode=iemh1.ch02&seed=Help+me&from=school";
    await signUp();
    expect(state.welcome).toEqual([]);
  });

  it("an exam return → the welcome exactly as before; SIGNUP props = provider + where it signed up from", async () => {
    state.cookies[SECURE] = "https://shishya.in/exams/SSC_CGL?start=practice";
    await signUp();
    // id (7 Oct 2026): the 'sent:welcome' send-log row — the mail itself is unchanged.
    expect(state.welcome).toEqual([{ id: "u-1", email: "student@example.com", name: "Asha" }]);
    expect(signupRow().props).toEqual({ provider: "google", callbackFamily: "exam", callbackPath: "/exams/SSC_CGL" });
  });

  it("an exam-tutor return (/chat?examCode=<real exam>) keeps the welcome", async () => {
    state.cookies[PLAIN] = "http://localhost:3000/chat?examCode=SSC_CGL";
    await signUp();
    expect(state.welcome).toHaveLength(1);
    expect(signupRow().props).toEqual({ provider: "google", callbackFamily: "other", callbackPath: "/chat" });
  });

  it("no callback cookie (the /dashboard default) → the welcome as before", async () => {
    await signUp();
    expect(state.welcome).toHaveLength(1);
    expect(signupRow().props).toEqual({ provider: "google", callbackFamily: "none" });
  });

  it("an unreadable cookie jar never throws and falls back to the exam path", async () => {
    state.cookiesThrow = true;
    await expect(signUp()).resolves.toBeUndefined();
    expect(state.welcome).toHaveLength(1);
    expect(signupRow().props).toEqual({ provider: "google", callbackFamily: "none" });
  });

  it("no email on the account → no mail on either path (unchanged)", async () => {
    await signUp({ id: "u-2", email: null, name: null, emailVerified: null });
    expect(state.welcome).toEqual([]);
    state.events = [];
    state.cookies[SECURE] = "https://shishya.in/schooling/cbse/class-9";
    await signUp({ id: "u-3", email: null, name: null, emailVerified: null });
    expect(state.welcome).toEqual([]);
  });
});

describe("createUser: a school sign-in enrols the account on its class container (27 Sep 2026, context marking)", () => {
  it("a Class 9 chapter return → enrolled on NCERT_C09 with { school: true }", async () => {
    state.cookies[SECURE] = "https://shishya.in/schooling/cbse/class-9/mathematics/polynomials?from=school";
    await signUp();
    expect(state.enrolments).toHaveLength(1);
    expect(state.enrolments[0].userId).toBe("u-1");
    expect(state.enrolments[0].exam.code).toBe("NCERT_C09");
    expect(state.enrolments[0].patch).toEqual({});
    expect(state.enrolments[0].opts).toEqual({ school: true });
    // Still no exam-prep welcome on a school sign-in.
    expect(state.welcome).toEqual([]);
  });

  it("a class-page return (plain cookie, dev) → enrolled on that class", async () => {
    state.cookies[PLAIN] = "http://localhost:3000/schooling/cbse/class-12";
    await signUp();
    expect(state.enrolments.map((e) => e.exam.code)).toEqual(["NCERT_C12"]);
  });

  it("a school-tutor return (/chat?examCode=NCERT_C09) → enrolled on NCERT_C09", async () => {
    state.cookies[SECURE] = "https://shishya.in/chat?examCode=NCERT_C09&topicCode=iemh1.ch02&seed=Help+me&from=school";
    await signUp();
    expect(state.enrolments).toHaveLength(1);
    expect(state.enrolments[0].exam.code).toBe("NCERT_C09");
    expect(state.enrolments[0].opts).toEqual({ school: true });
  });

  it("a Class 5 return enrols nothing (Class 1-7 never holds an enrolment) and asks for no container", async () => {
    state.cookies[SECURE] = "https://shishya.in/schooling/cbse/class-5/mathematics";
    await signUp();
    expect(state.enrolments).toEqual([]);
    expect(state.containerLookups).toEqual([]);
    state.events = [];
    state.cookies[SECURE] = "https://shishya.in/chat?examCode=NCERT_C05";
    await signUp();
    expect(state.enrolments).toEqual([]);
  });

  it("an exam return, an exam-tutor return, the /schooling index or no cookie enrols no class container", async () => {
    for (const url of ["https://shishya.in/exams/SSC_CGL", "http://localhost:3000/chat?examCode=SSC_CGL", "https://shishya.in/schooling"]) {
      state.events = [];
      state.cookies = { [SECURE]: url };
      await signUp();
    }
    state.events = [];
    state.cookies = {};
    await signUp();
    expect(state.enrolments).toEqual([]);
    expect(state.containerLookups).toEqual([]);
    // 30 Sep 2026: the exam goal is the sign-up profile's (mocked here).
    expect(state.profiles.map((p) => [p.callback, p.school])).toEqual([
      ["https://shishya.in/exams/SSC_CGL", false],
      ["http://localhost:3000/chat?examCode=SSC_CGL", false],
      ["https://shishya.in/schooling", true],
      [null, false],
    ]);
  });

  it("a failing enrolment never throws and leaves the SIGNUP row and the welcome skip intact", async () => {
    state.enrolThrows = true;
    state.cookies[SECURE] = "https://shishya.in/schooling/cbse/class-9";
    await expect(signUp()).resolves.toBeUndefined();
    expect(state.enrolments).toEqual([]);
    expect(signupRow().props).toMatchObject({ provider: "google", school: true });
    expect(state.welcome).toEqual([]);
  });
});

describe("createUser: the SIGNUP event records where the account was made from (30 Sep 2026)", () => {
  it("the first landing cookie rides on the SIGNUP row as landingPath", async () => {
    state.cookies[SECURE] = "https://shishya.in/exams/SSC_CGL/pyq/2024";
    state.cookies.shishya_land = encodeURIComponent("/exams/SSC_CGL/cutoff");
    await signUp();
    expect(signupRow().props).toEqual({
      provider: "google",
      callbackFamily: "pyq",
      callbackPath: "/exams/SSC_CGL/pyq/2024",
      landingPath: "/exams/SSC_CGL/cutoff",
    });
  });

  it("a malformed landing cookie or a foreign callback host adds nothing", async () => {
    state.cookies[SECURE] = "https://evil.example/exams/SSC_CGL";
    state.cookies.shishya_land = "%E0%A4%A";
    await signUp();
    expect(signupRow().props).toEqual({ provider: "google", callbackFamily: "exam" });
  });
});

describe("createUser: the sign-up profile gets the account's signals (30 Sep 2026, sign-up build 2)", () => {
  it("an exam return → the profile gets the user, email, anonId, the callback and school: false", async () => {
    state.cookies[SECURE] = "https://shishya.in/exams/SSC_CGL/pyq/2024";
    await signUp();
    expect(state.profiles).toEqual([
      { userId: "u-1", email: "student@example.com", anonId: "anon-1", callback: "https://shishya.in/exams/SSC_CGL/pyq/2024", school: false },
    ]);
    expect(state.welcome).toHaveLength(1);
  });

  it("a school return → school: true (no exam goal, no strip — the profile's own rule)", async () => {
    state.cookies[SECURE] = "https://shishya.in/schooling/cbse/class-9";
    await signUp();
    expect(state.profiles).toHaveLength(1);
    expect(state.profiles[0].school).toBe(true);
  });

  it("a failing profile never throws: the SIGNUP row, the school enrolment and the welcome skip stand", async () => {
    state.profileThrows = true;
    state.cookies[SECURE] = "https://shishya.in/schooling/cbse/class-9";
    await expect(signUp()).resolves.toBeUndefined();
    expect(signupRow().props).toMatchObject({ provider: "google", school: true });
    expect(state.enrolments.map((e) => e.exam.code)).toEqual(["NCERT_C09"]);
    expect(state.welcome).toEqual([]);
    state.events = [];
    state.cookies = { [SECURE]: "https://shishya.in/exams/SSC_CGL" };
    await expect(signUp()).resolves.toBeUndefined();
    expect(state.welcome).toHaveLength(1);
  });
});
