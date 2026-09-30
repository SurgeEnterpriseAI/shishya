// NextAuth configuration — Google (Gmail) social sign-in only.
// Server-side helper to fetch the session in route handlers.

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions, DefaultSession } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./db/prisma";
// Type-only: the runtime import stays inline in the event (no cycle).
import type { SignupAttribution } from "./signup-attribution";
import { SESSION_HINT_COOKIE, SESSION_HINT_MAX_AGE_S, SESSION_HINT_VALUE } from "./session-hint";
// Pure and import-free (no prisma, no next): safe at module scope here.
import { isSchoolSignInCallback, studentModeClassOfExamCode } from "./school/student-classes";
// Pure (no prisma, no next; its one import is the tiny beacon helper).
import { LANDING_COOKIE, signupEventProps } from "./signin-cta";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthOptions = {
  // Adapter is kept so OAuth User + Account rows are still written to Postgres
  // on first sign-in (we use the User row everywhere as the canonical identity).
  // Sessions themselves move to JWT below — at 10k concurrent students, doing
  // an extra Session SELECT on every API request would dominate DB load.
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  // JWT sessions — stateless, no per-request DB hit. The adapter still writes
  // the User on first sign-in; the JWT carries that user.id forward.
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, user }) {
      // On initial sign-in, NextAuth passes the freshly-created User. Stash
      // its id on the JWT so subsequent requests don't need to look it up.
      if (user) token.id = (user as { id: string }).id;
      return token;
    },
    async session({ session, token }) {
      if (session.user && token?.id) session.user.id = token.id as string;
      return session;
    },
  },
  pages: {
    signIn: "/login",
    signOut: "/logout",
  },
  // NextAuth events — createUser fires exactly once per real signup
  // (first OAuth callback for an email we've never seen). Perfect
  // hook for the SIGNUP analytics event — and, since 11 Sep 2026, for
  // signup attribution.
  events: {
    // Signed-in hint (13 Sep 2026, phone-first speed): a non-httpOnly,
    // PII-free `shishya_in=1` cookie so client islands can skip
    // /api/auth/session for guests (3-4 calls per guest page before). It
    // only says "a session probably exists" — the islands still ask the
    // server before showing anything signed-in (src/lib/session-hint.ts).
    // Both events run inside the /api/auth route handler, where Next merges
    // cookies() writes onto NextAuth's response (the same scope the
    // createUser attribution capture relies on). Never fatal.
    async signIn() {
      try {
        const { cookies } = await import("next/headers");
        (await cookies()).set(SESSION_HINT_COOKIE, SESSION_HINT_VALUE, {
          path: "/",
          maxAge: SESSION_HINT_MAX_AGE_S,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          httpOnly: false,
        });
      } catch (err) {
        console.error("[auth] session hint set failed (non-fatal):", err);
      }
    },
    async signOut() {
      try {
        const { cookies } = await import("next/headers");
        (await cookies()).set(SESSION_HINT_COOKIE, "", {
          path: "/",
          maxAge: 0,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          httpOnly: false,
        });
      } catch (err) {
        console.error("[auth] session hint clear failed (non-fatal):", err);
      }
    },
    async createUser({ user }) {
      // Signup attribution (11 Sep 2026 signup-leak audit). Capture used
      // to run only from /dashboard inside the cookie window, but every
      // exam-surface CTA sends a new student back to /exams/CODE, /pyq or
      // /mocks/ID — a third of signups ended up with no source. This event
      // runs inside the OAuth callback route handler, so cookies() is in
      // scope and the trail is written for every new user regardless of
      // where they land next. /dashboard keeps the same call as an
      // idempotent fallback (see src/lib/signup-attribution.ts).
      let attribution: SignupAttribution | null = null;
      let anonId: string | null = null;
      try {
        const { captureSignupAttribution, readAnalyticsAnonId } = await import("./signup-attribution");
        anonId = await readAnalyticsAnonId();
        attribution = await captureSignupAttribution(user.id);
      } catch (err) {
        console.error("[auth] signup attribution capture failed (non-fatal):", err);
      }
      // School sign-in (26 Sep 2026, student mode, fixer): a first sign-in
      // from a Class 8-12 school page ("for students 13 and above") or the
      // school tutor is known here only by where NextAuth will send the
      // browser next — its callback-url cookie, in scope in this handler
      // exactly as the attribution cookie is (read-only; NextAuth clears it
      // itself). 27 Sep 2026: no age band is asked any more — a Class 8-12
      // return also enrols the account on that class container below, the
      // context marker the enrolment-keyed audience helpers
      // (src/lib/db/enrollment.ts) read. Unreadable → null → false → the
      // exam path as before.
      const signInCallback = await readSignInCallbackCookie();
      const schoolSignIn = isSchoolSignInCallback(signInCallback);
      try {
        // Inline import avoids a circular dep (analytics → prisma → auth).
        const { recordEvent } = await import("./analytics");
        await recordEvent({
          kind: "SIGNUP",
          userId: user.id,
          // The link row: the browser's anonymous analytics id rides on the
          // one event that also carries the new userId, so the pre-sign-in
          // trail (real landing page, real referrer) joins to the account.
          // Without it the first identified row of a land-once-then-sign-in
          // visitor was the OAuth return with refHost accounts.google.com.
          anonId,
          path: "/login",
          // props.school only on a school sign-in, so the school ones can be
          // counted apart.
          // 30 Sep 2026 (sign-up build 1, src/lib/signin-cta.ts): + where the
          // account was made from — the callback's family and path (the page
          // it signed up from) — and the browser's first landing path, so a
          // sign-up whose anonymous trail is missing is still placed. Paths
          // only, no query; no new table.
          props: signupEventProps({ school: schoolSignIn, callback: signInCallback, landing: await readFirstLandingCookie() }),
          // Same trail on the SIGNUP row itself, so attributionSources()
          // (which groups SIGNUP by utmSource / refHost) stops reading
          // every signup as "(direct)".
          utmSource: attribution?.utmSource ?? null,
          utmMedium: attribution?.utmMedium ?? null,
          utmCampaign: attribution?.utmCampaign ?? null,
          refHost: attribution?.refHost ?? null,
        });
      } catch (err) {
        console.error("[auth] SIGNUP event record failed (non-fatal):", err);
      }
      // 27 Sep 2026 (founder: no age question — safeguards by context): a first sign-in that returns to a Class 8-12 school page or the school chat enrols the account on that class container (school flag), the marker that keeps it out of the exam-prep mail audiences (schoolOnlyAccountSql) and gives it the dashboard's school home. Best-effort, never fatal, nothing asked.
      if (schoolSignIn) {
        try {
          const code = await schoolContainerOfCallback(signInCallback);
          if (code) {
            const { findStudentModeContainer } = await import("./school/student-db");
            const exam = await findStudentModeContainer(code);
            if (exam) {
              const { ensureEnrollment } = await import("./db/enrollment");
              await ensureEnrollment(user.id, exam, {}, { school: true });
            }
          }
        } catch (err) {
          console.error("[auth] school class enrolment failed (non-fatal):", err);
        }
      }
      // 30 Sep 2026 (sign-up build 2, founder: the account is "the entire
      // Shishya in their hand" because it is personalised): the profile the
      // account starts with, from signals the student already gave — the
      // exam of the page it signed up from becomes its goal (never on a
      // school sign-in; real exams only), the page language fills
      // preferredLang, the guest's challenges and exam alerts are linked,
      // and an exam-side sign-up gets the one-time "Your Shishya is ready"
      // strip's cookie. Rules in src/lib/signup-profile.ts; each step is
      // best-effort, never fatal, nothing asked.
      try {
        const { applySignupProfile } = await import("./signup-profile");
        await applySignupProfile({ userId: user.id, email: user.email ?? null, anonId, callback: signInCallback, school: schoolSignIn });
      } catch (err) {
        console.error("[auth] sign-up profile failed (non-fatal):", err);
      }
      // Welcome email — best-effort, never blocks the auth callback.
      // sendEmail() is stub-safe when RESEND_API_KEY is unset, so this
      // is a no-op until the env var lands in Vercel.
      // 26 Sep 2026 (student mode, fixer): NOT on a school sign-in. The
      // welcome is exam-prep marketing (the 90-second diagnostic, "the
      // surest way to crack the job", a human subject expert, /coach) and
      // the founder rule is that a school-only account gets no exam-prep
      // mail — the most likely school sign-in is a 13-17 student. sendEmail
      // itself only skips on a missing key or an opted-out unsubUserId, so
      // the gate has to be here. A school account that later enrols on a
      // real exam joins the exam loops from there.
      try {
        if (user.email && !schoolSignIn) {
          const { sendWelcomeEmail } = await import("./email");
          await sendWelcomeEmail({ email: user.email, name: user.name });
        } else if (schoolSignIn) {
          console.log(`[auth] welcome email skipped — school sign-in (user ${user.id})`);
        }
      } catch (err) {
        console.error("[auth] welcome email failed (non-fatal):", err);
      }
    },
  },
};

/** NextAuth v4 keeps the sign-in's callbackUrl (already passed through the
 *  redirect callback, so same-origin) in `next-auth.callback-url`, prefixed
 *  `__Secure-` when NEXTAUTH_URL is https — both are read. The caller asks
 *  whether it returns to a school page or the school tutor
 *  (src/lib/school/student-classes.ts isSchoolSignInCallback) and which
 *  class container it names (schoolContainerOfCallback). null when absent
 *  or on any error. Never throws. */
async function readSignInCallbackCookie(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    const jar = await cookies();
    return jar.get("__Secure-next-auth.callback-url")?.value ?? jar.get("next-auth.callback-url")?.value ?? null;
  } catch (err) {
    console.error("[auth] callback-url cookie read failed (non-fatal):", err);
    return null;
  }
}

/** The browser's first landing path (the `shishya_land` cookie the root
 *  layout's tracker writes on the first page view — never on a Class 1-7
 *  page), raw; signupEventProps() validates it. null when absent or on any
 *  error. Never throws. (30 Sep 2026) */
async function readFirstLandingCookie(): Promise<string | null> {
  try {
    const { cookies } = await import("next/headers");
    return (await cookies()).get(LANDING_COOKIE)?.value ?? null;
  } catch (err) {
    console.error("[auth] landing cookie read failed (non-fatal):", err);
    return null;
  }
}

/** The Class 8-12 container a school sign-in returns to — /chat?examCode=<container> or /schooling/{board}/class-{n}/… — or null. */
async function schoolContainerOfCallback(url: string | null): Promise<string | null> {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url, "https://shishya.in"); } catch { return null; }
  let code: string | null = null;
  if (u.pathname === "/chat" || u.pathname === "/chat/") code = u.searchParams.get("examCode");
  else {
    const m = /^\/schooling\/([^/]+)\/class-(\d{1,2})(?:\/|$)/.exec(u.pathname);
    if (m) { const { schoolExamCode } = await import("./school/surface"); code = schoolExamCode(m[1], Number(m[2])); }
  }
  return code && studentModeClassOfExamCode(code) !== null ? code : null;
}

export const auth = () => getServerSession(authOptions);

/** Returns the user id, or 401-throws an Error caller should map to a 401. */
export async function requireUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) {
    const e = new Error("UNAUTHENTICATED");
    (e as any).status = 401;
    throw e;
  }
  return session.user.id;
}
