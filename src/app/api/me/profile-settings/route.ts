// POST /api/me/profile-settings — updates profilePublic + handle.
//
// Validation:
//   - handle: ^[a-z0-9_-]{3,30}$ or null
//   - profilePublic: boolean
//   - Cannot set profilePublic=true if handle is null/empty (form-side
//     check already exists; we enforce it server-side too).
//   - Handle uniqueness is enforced at DB-level via @unique constraint.
//     On collision we return a friendly error.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

const HANDLE_PATTERN = /^[a-z0-9_-]{3,30}$/;

// Reserved handles — block common paths so /u/admin doesn't collide
// with anything we might ship later, and block obvious squatting.
const RESERVED = new Set([
  "admin", "api", "app", "auth", "blog", "dashboard", "help", "home",
  "me", "settings", "support", "shishya", "team", "verification",
  "schooling", "colleges", "exams", "scholarships", "scholarship",
  "worldwide", "insights", "post-graduation", "jobs", "verification",
  "login", "logout", "signup", "register", "u", "user", "users",
  "anonymous", "deleted", "system", "root", "null", "undefined",
]);

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let body: { profilePublic?: unknown; handle?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const profilePublic = body.profilePublic === true;
  const rawHandle = body.handle;
  const handle =
    rawHandle === null || rawHandle === undefined || rawHandle === ""
      ? null
      : typeof rawHandle === "string"
      ? rawHandle.toLowerCase().trim()
      : null;

  if (handle !== null) {
    if (!HANDLE_PATTERN.test(handle)) {
      return NextResponse.json(
        { error: "Handle must be 3–30 lowercase letters, digits, dashes or underscores." },
        { status: 400 },
      );
    }
    if (RESERVED.has(handle)) {
      return NextResponse.json(
        { error: "That handle is reserved. Pick another." },
        { status: 400 },
      );
    }
  }

  if (profilePublic && !handle) {
    return NextResponse.json(
      { error: "Pick a handle before making your profile public." },
      { status: 400 },
    );
  }

  try {
    // Use raw SQL to avoid stale Prisma client locally.
    if (handle === null) {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "profilePublic" = ${profilePublic},
            "handle" = NULL,
            "updatedAt" = NOW()
        WHERE "id" = ${session.user.id}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "User"
        SET "profilePublic" = ${profilePublic},
            "handle" = ${handle},
            "updatedAt" = NOW()
        WHERE "id" = ${session.user.id}
      `;
    }
  } catch (err: unknown) {
    // Unique constraint violation on `handle`
    const msg = err instanceof Error ? err.message : String(err);
    if (/unique|duplicate/i.test(msg) && /handle/i.test(msg)) {
      return NextResponse.json(
        { error: "That handle is already taken. Pick another." },
        { status: 409 },
      );
    }
    console.error("[profile-settings] update failed:", err);
    return NextResponse.json({ error: "Save failed. Try again." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profilePublic, handle });
}
