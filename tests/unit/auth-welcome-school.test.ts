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
// No DB, no network. Run: npx vitest run tests/unit/auth-welcome-school.test.ts

import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  cookies: {} as Record<string, string>,
  cookiesThrow: false,
  welcome: [] as unknown[],
  events: [] as Record<string, unknown>[],
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
});

describe("createUser: no exam-prep welcome mail on a school sign-in", () => {
  it("a Class 9 chapter return (secure cookie, production) → no welcome; SIGNUP carries school: true", async () => {
    state.cookies[SECURE] = "https://shishya.in/schooling/cbse/class-9/mathematics/polynomials?from=school";
    await signUp();
    expect(state.welcome).toEqual([]);
    expect(signupRow().props).toEqual({ provider: "google", school: true });
    expect(signupRow().userId).toBe("u-1");
  });

  it("a class-page return (plain cookie, dev) → no welcome", async () => {
    state.cookies[PLAIN] = "http://localhost:3000/schooling/cbse/class-8";
    await signUp();
    expect(state.welcome).toEqual([]);
    expect(signupRow().props).toEqual({ provider: "google", school: true });
  });

  it("a school-tutor return (/chat?examCode=<container>) → no welcome", async () => {
    state.cookies[SECURE] = "https://shishya.in/chat?examCode=NCERT_C09&topicCode=iemh1.ch02&seed=Help+me&from=school";
    await signUp();
    expect(state.welcome).toEqual([]);
  });

  it("an exam return → the welcome exactly as before, SIGNUP props byte-identical", async () => {
    state.cookies[SECURE] = "https://shishya.in/exams/SSC_CGL";
    await signUp();
    expect(state.welcome).toEqual([{ email: "student@example.com", name: "Asha" }]);
    expect(signupRow().props).toEqual({ provider: "google" });
  });

  it("an exam-tutor return (/chat?examCode=<real exam>) keeps the welcome", async () => {
    state.cookies[PLAIN] = "http://localhost:3000/chat?examCode=SSC_CGL";
    await signUp();
    expect(state.welcome).toHaveLength(1);
    expect(signupRow().props).toEqual({ provider: "google" });
  });

  it("no callback cookie (the /dashboard default) → the welcome as before", async () => {
    await signUp();
    expect(state.welcome).toHaveLength(1);
    expect(signupRow().props).toEqual({ provider: "google" });
  });

  it("an unreadable cookie jar never throws and falls back to the exam path", async () => {
    state.cookiesThrow = true;
    await expect(signUp()).resolves.toBeUndefined();
    expect(state.welcome).toHaveLength(1);
    expect(signupRow().props).toEqual({ provider: "google" });
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
