// /me — logged-in user's profile + contribution dashboard.
//
// Closes the verification engagement loop: verify a fact → return here
// → see the count go up → see progress toward the next badge level.
// The recognition system the spec calls for; without this page, every
// verification feels like it vanishes into the void.

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { UserBadge, type UserBadgeLevel } from "@/components/UserBadge";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Your profile — Shishya",
  description:
    "Your verification contributions, current badge level, and progress toward the next.",
  robots: { index: false, follow: false }, // personal page; don't index
};

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  badgeLevel: string;
  contributionScore: number;
  verificationCount: number;
  flagCount: number;
  flagValidatedCount: number;
  suggestionAcceptedCount: number;
  badgeEarnedAt: Date | null;
  createdAt: Date;
}

interface VerificationRow {
  id: string;
  actionType: string;
  resolutionStatus: string;
  factId: string;
  pageId: string;
  claimText: string;
  createdAt: Date;
}

// Threshold table mirroring computeBadgeLevel in facts.ts.
const THRESHOLDS = {
  CONTRIBUTOR:      { verifications: 10, label: "10 verifications" },
  VERIFIER:         { verifications: 50, label: "50 verifications" },
  TRUSTED_VERIFIER: { verifications: 200, label: "200 verifications + 90 days on the platform" },
  DOMAIN_EXPERT:    { verifications: -1, label: "Admin promotion after credential verification" },
};

function nextLevelInfo(current: UserBadgeLevel, count: number): {
  next: UserBadgeLevel | null;
  remaining: number;
  label: string;
  progressPct: number;
} {
  if (current === "NEWCOMER") {
    return {
      next: "CONTRIBUTOR",
      remaining: Math.max(0, 10 - count),
      label: THRESHOLDS.CONTRIBUTOR.label,
      progressPct: Math.min(100, (count / 10) * 100),
    };
  }
  if (current === "CONTRIBUTOR") {
    return {
      next: "VERIFIER",
      remaining: Math.max(0, 50 - count),
      label: THRESHOLDS.VERIFIER.label,
      progressPct: Math.min(100, (count / 50) * 100),
    };
  }
  if (current === "VERIFIER") {
    return {
      next: "TRUSTED_VERIFIER",
      remaining: Math.max(0, 200 - count),
      label: THRESHOLDS.TRUSTED_VERIFIER.label,
      progressPct: Math.min(100, (count / 200) * 100),
    };
  }
  if (current === "TRUSTED_VERIFIER") {
    return {
      next: "DOMAIN_EXPERT",
      remaining: 0,
      label: THRESHOLDS.DOMAIN_EXPERT.label,
      progressPct: 100,
    };
  }
  return { next: null, remaining: 0, label: "Top of the ladder", progressPct: 100 };
}

export default async function MeProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/me");
  const userId = session.user.id;

  // Use raw SQL for the new verification columns — typed Prisma client
  // may not include them locally yet (Windows file lock on regen).
  const userRows = await prisma.$queryRaw<UserRow[]>`
    SELECT "id", "email", "name", "badgeLevel"::text AS "badgeLevel",
           "contributionScore", "verificationCount", "flagCount",
           "flagValidatedCount", "suggestionAcceptedCount",
           "badgeEarnedAt", "createdAt"
    FROM "User" WHERE "id" = ${userId} LIMIT 1
  `;
  const user = userRows[0];
  if (!user) redirect("/login?callbackUrl=/me");

  const recent = await prisma.$queryRaw<VerificationRow[]>`
    SELECT v."id", v."actionType"::text AS "actionType",
           v."resolutionStatus"::text AS "resolutionStatus", v."factId",
           f."pageId", f."claimText",
           v."createdAt"
    FROM "Verification" v
    JOIN "Fact" f ON f."id" = v."factId"
    WHERE v."userId" = ${userId}
    ORDER BY v."createdAt" DESC
    LIMIT 15
  `;

  const level = user.badgeLevel as UserBadgeLevel;
  const next = nextLevelInfo(level, user.verificationCount);
  const daysOnPlatform = Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000);

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Your profile
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-ink-900">{user.name ?? user.email.split("@")[0]}</h1>
          <UserBadge level={level} />
        </div>
        <p className="mt-1 text-xs text-ink-500">
          {user.email} · {daysOnPlatform} day{daysOnPlatform === 1 ? "" : "s"} on Shishya
        </p>

        {/* Stats grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Contribution score" value={user.contributionScore} />
          <Stat label="Verifications" value={user.verificationCount} />
          <Stat label="Flags" value={user.flagCount} sublabel={user.flagValidatedCount > 0 ? `${user.flagValidatedCount} validated` : undefined} />
          <Stat label="Suggestions accepted" value={user.suggestionAcceptedCount} />
        </div>

        {/* Progress to next badge */}
        {next.next && (
          <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold text-ink-900">
                Progress to <span className="text-saffron-700">{titleCase(next.next)}</span>
              </h2>
              <span className="text-xs text-ink-500">
                {next.remaining > 0 ? `${next.remaining} more to go` : "Threshold met"}
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-2 rounded-full bg-saffron-500 transition-all"
                style={{ width: `${next.progressPct}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-ink-600">Requirement: {next.label}</p>
          </div>
        )}

        {/* Recent activity */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Recent activity</h2>
        {recent.length === 0 ? (
          <div className="mt-3 rounded-lg border border-dashed border-ink-300 bg-white p-6 text-center text-sm text-ink-600">
            You haven't verified anything yet. Click a verification badge on any{" "}
            <Link href="/colleges" className="text-saffron-700 underline">college</Link>,{" "}
            <Link href="/exams" className="text-saffron-700 underline">exam</Link> or{" "}
            <Link href="/schooling" className="text-saffron-700 underline">school board</Link>{" "}
            page to confirm what you know.
          </div>
        ) : (
          <ul className="mt-3 divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-200 bg-white">
            {recent.map((r) => (
              <li key={r.id} className="px-4 py-3 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p>
                    <span className={
                      r.actionType === "VERIFY"
                        ? "rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"
                        : r.actionType === "FLAG"
                        ? "rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-800"
                        : "rounded bg-saffron-100 px-1.5 py-0.5 text-[10px] font-medium text-saffron-800"
                    }>
                      {r.actionType.replace("_", " ")}
                    </span>{" "}
                    <Link href={r.pageId} className="text-ink-800 hover:text-saffron-800">
                      {r.claimText}
                    </Link>
                  </p>
                  <span className="text-xs text-ink-500">
                    {r.createdAt.toISOString().slice(0, 10)}
                  </span>
                </div>
                {r.resolutionStatus !== "PENDING" && (
                  <p className="mt-1 text-[11px] text-ink-500">
                    Status: {r.resolutionStatus.toLowerCase()}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="mt-10 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">How verification badges work</h3>
          <p className="mt-2">
            Every confirmed verification adds 1 to your contribution score
            and counts toward your next badge level. Flagged inaccuracies
            that turn out to be correct add 2 points. Accepted update
            suggestions add 3 points. Recognition is the only currency —
            there's no money in this system, ever.
          </p>
          <Link
            href="/verification"
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          >
            Read the verification policy →
          </Link>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, sublabel }: { label: string; value: number; sublabel?: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{value}</p>
      {sublabel && <p className="mt-0.5 text-[11px] text-ink-500">{sublabel}</p>}
    </div>
  );
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
