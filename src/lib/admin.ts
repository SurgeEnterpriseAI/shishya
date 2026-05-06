// Admin authorization. Admins are a comma-separated list of emails in env.
// We check email (not user id) so that adding/removing admins doesn't require
// touching the DB.

import { auth } from "./auth";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export async function isCurrentUserAdmin(): Promise<{
  isAdmin: boolean;
  userId?: string;
  email?: string;
}> {
  const session = await auth();
  if (!session?.user?.email) return { isAdmin: false };
  const email = session.user.email.toLowerCase();
  return {
    isAdmin: adminEmails().includes(email),
    userId: session.user.id,
    email,
  };
}

/** Throws a 403-tagged error if not admin. */
export async function requireAdmin(): Promise<{ userId: string; email: string }> {
  const { isAdmin, userId, email } = await isCurrentUserAdmin();
  if (!isAdmin || !userId || !email) {
    const e = new Error("FORBIDDEN");
    (e as any).status = 403;
    throw e;
  }
  return { userId, email };
}
