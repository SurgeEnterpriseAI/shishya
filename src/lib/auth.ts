// NextAuth configuration — Google (Gmail) social sign-in only.
// Server-side helper to fetch the session in route handlers.

import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions, DefaultSession } from "next-auth";
import { getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./db/prisma";

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
  // hook for the SIGNUP analytics event.
  events: {
    async createUser({ user }) {
      try {
        // Inline import avoids a circular dep (analytics → prisma → auth).
        const { recordEvent } = await import("./analytics");
        await recordEvent({
          kind: "SIGNUP",
          userId: user.id,
          path: "/login",
          props: { provider: "google" },
        });
      } catch (err) {
        console.error("[auth] SIGNUP event record failed (non-fatal):", err);
      }
      // Welcome email — best-effort, never blocks the auth callback.
      // sendEmail() is stub-safe when RESEND_API_KEY is unset, so this
      // is a no-op until the env var lands in Vercel.
      try {
        if (user.email) {
          const { sendWelcomeEmail } = await import("./email");
          await sendWelcomeEmail({ email: user.email, name: user.name });
        }
      } catch (err) {
        console.error("[auth] welcome email failed (non-fatal):", err);
      }
    },
  },
};

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
