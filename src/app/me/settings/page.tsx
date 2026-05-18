// /me/settings — privacy toggle + public-profile handle.
//
// Two settings:
//   1. profilePublic — when ON, /u/[handle] is publicly accessible.
//      Default OFF for every user; the spec's "no dark patterns" rule
//      means a user must explicitly opt in.
//   2. handle       — URL slug for /u/[handle]. Pattern: [a-z0-9_-]{3,30}.
//      Once set + profilePublic is ON, the public page surfaces only:
//      display name, badge level, sections-contributed, verified
//      credentials, badge-earned dates. NEVER email or activity-by-page.

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { ProfileSettingsForm } from "./ProfileSettingsForm";

export const metadata: Metadata = {
  title: "Profile settings — Shishya",
  description: "Make your profile public, pick a handle for /u/[handle], control what gets surfaced.",
  robots: { index: false, follow: false },
};

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  profilePublic: boolean;
  handle: string | null;
  badgeLevel: string;
}

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/me/settings");

  const userRows = await prisma.$queryRaw<UserRow[]>`
    SELECT "id", "email", "name", "profilePublic", "handle",
           "badgeLevel"::text AS "badgeLevel"
    FROM "User" WHERE "id" = ${session.user.id} LIMIT 1
  `;
  const user = userRows[0];
  if (!user) redirect("/login?callbackUrl=/me/settings");

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/me" className="hover:text-ink-800">Your profile</Link> · Settings
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink-900">Profile settings</h1>
        <p className="mt-1 text-sm text-ink-600">
          Decide what's public + pick your URL handle. Off by default.
        </p>

        <ProfileSettingsForm
          initialProfilePublic={user.profilePublic}
          initialHandle={user.handle ?? ""}
        />

        <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h2 className="text-base font-semibold text-ink-900">
            What goes on the public page
          </h2>
          <p className="mt-2 text-xs">When public profile is ON, /u/[handle] shows:</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink-700">
            <li>Your display name (no email)</li>
            <li>Badge level + date earned</li>
            <li>Verified credentials (domain + institution + claim type)</li>
            <li>Sections you've contributed to (counts only, no per-fact details)</li>
            <li>Days on Shishya</li>
          </ul>
          <p className="mt-3 text-xs">Never visible:</p>
          <ul className="mt-2 list-disc space-y-0.5 pl-5 text-xs text-ink-700">
            <li>Email address</li>
            <li>Per-fact activity timeline</li>
            <li>Pending credentials</li>
            <li>Signup referrer / how you came to Shishya</li>
          </ul>
        </div>

        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50/40 p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">Turning the public profile OFF</p>
          <p className="mt-1">
            You can flip this back any time. The page disappears immediately;
            Google may keep a cached copy for a few days.
          </p>
        </div>
      </section>
    </main>
  );
}
