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
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  pages: {
    signIn: "/login",
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
