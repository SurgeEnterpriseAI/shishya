// /me — logged-in user's profile + contribution dashboard.
//
// Phase 1.3 enrichments:
//   * Sections-contributed bar chart (Schooling / Colleges / Exams /
//     Scholarships / Universities / Boards) — concrete evidence of
//     impact across the platform.
//   * Inline verified credentials with claim type + institution.
//   * Recognition section (badges earned + dates + Domain Expert
//     domains).
//   * Activity timeline extended to last 20.
//   * Settings link (privacy toggle + handle for public profile).
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
  profilePublic: boolean;
  handle: string | null;
  createdAt: Date;
}

interface VerificationRow {
  id: string;
  actionType: string;
  resolutionStatus: string;
  factId: string;
  pageId: string;
  claimText: string;
  section: string;
  createdAt: Date;
}

interface SectionCountRow {
  section: string;
  count: bigint;
}

interface CredentialRow {
  id: string;
  domain: string;
  claimType: string;
  institution: string;
  status: string;
  verifiedAt: Date | null;
  notes: string | null;
}

// Threshold table mirroring computeBadgeLevel in facts.ts.
const THRESHOLDS = {
  CONTRIBUTOR:      { verifications: 10, label: "10 verifications" },
  VERIFIER:         { verifications: 50, label: "50 verifications" },
  TRUSTED_VERIFIER: { verifications: 200, label: "200 verifications + 90 days on the platform" },
  DOMAIN_EXPERT:    { verifications: -1, label: "Admin promotion after credential verification" },
};

const SECTION_LABEL: Record<string, string> = {
  EXAM: "Exams",
  COLLEGE: "Colleges",
  SCHOLARSHIP: "Scholarships",
  BOARD: "School boards",
  UNIVERSITY: "Worldwide universities",
  VISA: "Visa info",
  CAREER: "Careers",
  GENERAL: "Other",
};

const SECTION_COLOR: Record<string, string> = {
  EXAM: "bg-emerald-500",
  COLLEGE: "bg-sky-500",
  SCHOLARSHIP: "bg-violet-500",
  BOARD: "bg-amber-500",
  UNIVERSITY: "bg-rose-500",
  VISA: "bg-rose-400",
  CAREER: "bg-slate-500",
  GENERAL: "bg-ink-400",
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
           "badgeEarnedAt", "profilePublic", "handle", "createdAt"
    FROM "User" WHERE "id" = ${userId} LIMIT 1
  `;
  const user = userRows[0];
  if (!user) redirect("/login?callbackUrl=/me");

  // Last-20 activity (was 15) + Fact.section join so the timeline
  // shows what each item is.
  const recent = await prisma.$queryRaw<VerificationRow[]>`
    SELECT v."id", v."actionType"::text AS "actionType",
           v."resolutionStatus"::text AS "resolutionStatus", v."factId",
           f."pageId", f."claimText", f."section"::text AS "section",
           v."createdAt"
    FROM "Verification" v
    JOIN "Fact" f ON f."id" = v."factId"
    WHERE v."userId" = ${userId}
    ORDER BY v."createdAt" DESC
    LIMIT 20
  `;

  // Sections-contributed bar: count VERIFY-action rows by Fact.section,
  // EXCLUDING rejected/invalidated ones so users see what STUCK.
  const sectionCounts = await prisma.$queryRaw<SectionCountRow[]>`
    SELECT f."section"::text AS "section", COUNT(*) AS count
    FROM "Verification" v
    JOIN "Fact" f ON f."id" = v."factId"
    WHERE v."userId" = ${userId}
      AND v."actionType" = 'VERIFY'
      AND v."resolutionStatus" <> 'REJECTED'
    GROUP BY f."section"
    ORDER BY count DESC
  `;

  // User's credentials (verified + pending) — surfaced inline so the
  // /me page is the single source of truth, no clicking through.
  const credentials = await prisma.$queryRaw<CredentialRow[]>`
    SELECT "id", "domain", "claimType", "institution",
           "status"::text AS "status", "verifiedAt", "notes"
    FROM "UserCredential"
    WHERE "userId" = ${userId}
    ORDER BY
      CASE WHEN "status" = 'VERIFIED' THEN 0 ELSE 1 END,
      "createdAt" DESC
  `;

  const level = user.badgeLevel as UserBadgeLevel;
  const next = nextLevelInfo(level, user.verificationCount);
  const daysOnPlatform = Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000);
  const verifiedCredentials = credentials.filter((c) => c.status === "VERIFIED");
  const expertDomains = verifiedCredentials.map((c) => c.domain);

  const totalSectionContribs = sectionCounts.reduce((a, r) => a + Number(r.count), 0);
  const topSectionCount = totalSectionContribs > 0
    ? Math.max(...sectionCounts.map((r) => Number(r.count)))
    : 0;

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Your profile
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-ink-900">{user.name ?? user.email.split("@")[0]}</h1>
          <UserBadge
            level={level}
            domain={level === "DOMAIN_EXPERT" && expertDomains.length > 0 ? expertDomains[0] : null}
          />
        </div>
        <p className="mt-1 text-xs text-ink-500">
          {user.email} · {daysOnPlatform} day{daysOnPlatform === 1 ? "" : "s"} on Shishya
          {user.profilePublic && user.handle && (
            <>
              {" "}·{" "}
              <Link href={`/u/${user.handle}`} className="text-saffron-700 underline">
                Public profile: /u/{user.handle}
              </Link>
            </>
          )}
        </p>
        <p className="mt-2 text-xs">
          <Link href="/me/credentials" className="text-saffron-700 underline">
            Manage credentials →
          </Link>
          {" · "}
          <Link href="/me/notifications" className="text-saffron-700 underline">
            Notifications →
          </Link>
          {" · "}
          <Link href="/me/settings" className="text-saffron-700 underline">
            Profile settings →
          </Link>
        </p>

        {/* Stats grid */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Contribution score" value={user.contributionScore} />
          <Stat label="Verifications" value={user.verificationCount} />
          <Stat
            label="Flags"
            value={user.flagCount}
            sublabel={user.flagValidatedCount > 0 ? `${user.flagValidatedCount} validated` : undefined}
          />
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
            {next.next === "TRUSTED_VERIFIER" && (
              <p className="mt-1 text-[11px] text-ink-500">
                Trusted Verifier promotion also requires admin audit of a
                random 10-verification sample at ≥80% quality — your work
                is sampled automatically once you cross 200 verifications.
              </p>
            )}
            {next.next === "DOMAIN_EXPERT" && (
              <p className="mt-1 text-[11px] text-ink-500">
                Domain Expert is unlocked by submitting a credential
                (e.g., "IIT Madras alumnus", "UPSC qualifier") and either
                receiving 3 vouches from existing Domain Experts in the
                same domain, or admin grant after credential review.
              </p>
            )}
          </div>
        )}

        {/* Sections contributed — bar chart */}
        {totalSectionContribs > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">
              Sections you've contributed to
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              Distribution of your confirmed verifications. Rejected
              verifications are excluded.
            </p>
            <ul className="mt-3 space-y-2">
              {sectionCounts.map((r) => {
                const n = Number(r.count);
                const pct = topSectionCount > 0 ? (n / topSectionCount) * 100 : 0;
                const label = SECTION_LABEL[r.section] ?? r.section;
                const color = SECTION_COLOR[r.section] ?? "bg-ink-400";
                return (
                  <li key={r.section} className="rounded-md border border-ink-100 bg-white p-3">
                    <div className="flex items-baseline justify-between text-xs">
                      <span className="font-medium text-ink-800">{label}</span>
                      <span className="text-ink-500 tabular-nums">
                        {n} verification{n === 1 ? "" : "s"}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ink-100">
                      <div
                        className={`h-1.5 rounded-full ${color} transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {/* Verified credentials (inline) */}
        {verifiedCredentials.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">
              Verified credentials
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {verifiedCredentials.map((c) => (
                <li key={c.id} className="rounded-lg border border-saffron-200 bg-saffron-50/30 p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                    {c.domain.replace(/_/g, " ")}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-ink-900">{c.institution}</p>
                  <p className="mt-0.5 text-xs text-ink-600">
                    {c.claimType.replace(/_/g, " ")}
                    {c.verifiedAt && (
                      <> · verified {c.verifiedAt.toISOString().slice(0, 10)}</>
                    )}
                  </p>
                  {c.notes && (
                    <p className="mt-2 text-[11px] text-ink-500 line-clamp-2">{c.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Pending credentials — kept low-key so the verified ones above stay primary */}
        {credentials.length > verifiedCredentials.length && (
          <div className="mt-4 rounded-md border border-dashed border-ink-300 bg-white px-4 py-3 text-xs text-ink-600">
            <p>
              <strong className="text-ink-800">
                {credentials.length - verifiedCredentials.length} credential
                {credentials.length - verifiedCredentials.length === 1 ? "" : "s"} pending
              </strong>{" "}
              — visit{" "}
              <Link href="/me/credentials" className="text-saffron-700 underline">
                /me/credentials
              </Link>{" "}
              to manage or request vouches in the appropriate community.
            </p>
          </div>
        )}

        {/* Recognition: badges earned with dates */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">Recognition</h2>
        <div className="mt-3 rounded-lg border border-ink-200 bg-white p-5">
          <ul className="space-y-2">
            <RecognitionRow
              label="Joined Shishya"
              earnedAt={user.createdAt}
              kind="join"
            />
            {level !== "NEWCOMER" && (
              <RecognitionRow
                label={`Earned ${titleCase(level)} badge`}
                earnedAt={user.badgeEarnedAt}
                kind="badge"
              />
            )}
            {verifiedCredentials.map((c) => (
              <RecognitionRow
                key={`cred-${c.id}`}
                label={`Verified ${c.claimType.replace(/_/g, " ")}: ${c.institution}`}
                earnedAt={c.verifiedAt}
                kind="credential"
              />
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-ink-500">
            Annual recognition (top-10 contributors, domain awards) ships
            November 2026 — current numbers will carry over.
          </p>
        </div>

        {/* Recent activity */}
        <h2 className="mt-10 text-base font-semibold text-ink-900">
          Recent activity{recent.length > 0 && <span className="ml-2 text-xs font-normal text-ink-500">last {recent.length}</span>}
        </h2>
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
                  <p className="min-w-0">
                    <span className={
                      r.actionType === "VERIFY"
                        ? "rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-800"
                        : r.actionType === "FLAG"
                        ? "rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-800"
                        : "rounded bg-saffron-100 px-1.5 py-0.5 text-[10px] font-medium text-saffron-800"
                    }>
                      {r.actionType.replace("_", " ")}
                    </span>
                    {" · "}
                    <span className="text-[10px] uppercase tracking-wider text-ink-500">
                      {SECTION_LABEL[r.section] ?? r.section}
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

function RecognitionRow({
  label,
  earnedAt,
  kind,
}: {
  label: string;
  earnedAt: Date | null | undefined;
  kind: "join" | "badge" | "credential";
}) {
  const color =
    kind === "credential"
      ? "border-saffron-300 bg-saffron-100 text-saffron-800"
      : kind === "badge"
      ? "border-emerald-300 bg-emerald-100 text-emerald-800"
      : "border-ink-300 bg-ink-100 text-ink-700";
  return (
    <li className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
      <span className="flex items-center gap-2">
        <span className={`inline-flex h-1.5 w-1.5 flex-shrink-0 rounded-full border ${color}`} aria-hidden />
        <span className="text-ink-800">{label}</span>
      </span>
      <span className="text-xs text-ink-500 tabular-nums">
        {earnedAt ? earnedAt.toISOString().slice(0, 10) : "—"}
      </span>
    </li>
  );
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
