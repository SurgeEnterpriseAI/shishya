// Institution-side authentication helpers.
//
// Why a separate auth stack from NextAuth (which we use for students):
//   - Students sign in with Google OAuth → User table
//   - Institutions sign in with email + password → InstitutionUser table
//   - The two should never confuse the session: a student visiting /i/*
//     gets bounced to /login/institution, never to /dashboard.
//
// Implementation: a signed JWT in an httpOnly cookie. Token payload
// carries the InstitutionUser id and a `sessionEpoch` integer; on every
// request we verify both match what's in the DB. Bumping sessionEpoch
// on the InstitutionUser row instantly invalidates every issued token
// — used by password-change / logout-everywhere.
//
// Cookie name: `shishya_inst` (httpOnly, sameSite=lax, 30-day max-age).
// Distinct from `shishya_anon` (analytics) and NextAuth's session cookies.

import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db/prisma";

const COOKIE_NAME = "shishya_inst";
const SESSION_DAYS = 30;
const BCRYPT_ROUNDS = 12;

function getSecret(): Uint8Array {
  const raw = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET;
  if (!raw) {
    throw new Error(
      "Institution auth requires NEXTAUTH_SECRET (or AUTH_SECRET) to be set",
    );
  }
  return new TextEncoder().encode(raw);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

interface InstSessionClaims {
  /** InstitutionUser.id */
  uid: string;
  /** Institution.id — duplicated so we don't need a DB hit just to know
   *  which institution the user belongs to. */
  iid: string;
  /** InstitutionUser.sessionEpoch at issuance — must match the row's
   *  current value to be considered valid. */
  epoch: number;
}

/**
 * Sign a fresh session token and set it as an httpOnly cookie. Call
 * this after a successful login or signup.
 */
export async function issueInstitutionSession(args: {
  userId: string;
  institutionId: string;
  sessionEpoch: number;
}): Promise<void> {
  const token = await new SignJWT({
    uid: args.userId,
    iid: args.institutionId,
    epoch: args.sessionEpoch,
  } satisfies InstSessionClaims)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const jar = await cookies();
  jar.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function clearInstitutionSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(COOKIE_NAME);
}

/**
 * Read the current institution-session from cookies. Returns null if
 * no cookie, expired, signature invalid, sessionEpoch mismatched, or
 * the InstitutionUser row no longer exists. Otherwise returns the user
 * + their institution rows for use in admin routes.
 */
export async function getInstitutionSession() {
  const jar = await cookies();
  const raw = jar.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  let claims: InstSessionClaims;
  try {
    const { payload } = await jwtVerify(raw, getSecret(), { algorithms: ["HS256"] });
    claims = payload as unknown as InstSessionClaims;
  } catch {
    return null; // tampered / expired
  }
  if (!claims.uid || !claims.iid || typeof claims.epoch !== "number") return null;

  // Server-side validation — the cookie alone is never trusted on its
  // own. Look up the user and confirm sessionEpoch matches.
  const user = await prisma.institutionUser.findUnique({
    where: { id: claims.uid },
    include: { institution: true },
  });
  if (!user) return null;
  if (user.sessionEpoch !== claims.epoch) return null;
  if (user.institutionId !== claims.iid) return null;
  if (!user.institution.active) return null;

  return { user, institution: user.institution };
}

/**
 * Sugar for admin routes: returns the session or redirects to
 * /login/institution. Use in server components / API handlers that
 * MUST have an authenticated institution-user.
 *
 * Return type is the non-null branch — TypeScript narrows correctly
 * because `redirect()` is typed as returning `never`.
 */
export async function requireInstitutionSession() {
  const s = await getInstitutionSession();
  if (!s) redirect("/login/institution");
  return s;
}

/**
 * Generate a URL-safe slug from an institution name. Mostly ASCII
 * letters/digits, single hyphens, ≤ 60 chars. Caller must check
 * uniqueness before insert — we just produce a candidate.
 */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "institution";
}
