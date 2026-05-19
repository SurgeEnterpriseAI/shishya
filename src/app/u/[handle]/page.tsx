// /u/[handle] — public contribution profile for opted-in users.
//
// Shown only when: User.profilePublic = TRUE && User.handle matches.
// Anything else 404s — no information disclosure, no
// "this user has a private profile" leak.
//
// What's surfaced (mirrors the policy text on /me/settings):
//   - display name (no email)
//   - badge level + earned date
//   - verified credentials
//   - sections-contributed counts
//   - days on Shishya
// Never: email, per-fact activity timeline, pending credentials,
// signup referrer.
//
// SEO: indexable (only public profiles reach this code path), with
// JSON-LD Person schema for rich-result eligibility.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { UserBadge, type UserBadgeLevel } from "@/components/UserBadge";
import { prisma } from "@/lib/db/prisma";

interface PageParams { handle: string }

interface PublicUserRow {
  id: string;
  name: string | null;
  badgeLevel: string;
  contributionScore: number;
  verificationCount: number;
  badgeEarnedAt: Date | null;
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
  verifiedAt: Date | null;
}

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

async function loadPublicUser(handle: string) {
  const userRows = await prisma.$queryRaw<PublicUserRow[]>`
    SELECT "id", "name", "badgeLevel"::text AS "badgeLevel",
           "contributionScore", "verificationCount", "badgeEarnedAt",
           "createdAt"
    FROM "User"
    WHERE "handle" = ${handle} AND "profilePublic" = TRUE
    LIMIT 1
  `;
  return userRows[0] ?? null;
}

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { handle } = await params;
  const user = await loadPublicUser(handle);
  if (!user) return { title: "Profile not found — Shishya" };
  const displayName = user.name ?? handle;
  const title = `${displayName} on Shishya — ${user.verificationCount} verifications, ${titleCase(user.badgeLevel)}`;
  const description =
    `${displayName} has contributed ${user.verificationCount} verifications on Shishya, ` +
    `India's free, community-driven education platform. Badge: ${titleCase(user.badgeLevel)}.`;
  return {
    title,
    description,
    alternates: { canonical: `https://shishya.in/u/${handle}` },
    openGraph: {
      title,
      description,
      url: `https://shishya.in/u/${handle}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "profile",
    },
  };
}

export default async function PublicProfile({
  params,
}: { params: Promise<PageParams> }) {
  const { handle } = await params;
  const user = await loadPublicUser(handle);
  if (!user) notFound();

  const sectionCounts = await prisma.$queryRaw<SectionCountRow[]>`
    SELECT f."section"::text AS "section", COUNT(*) AS count
    FROM "Verification" v
    JOIN "Fact" f ON f."id" = v."factId"
    WHERE v."userId" = ${user.id}
      AND v."actionType" = 'VERIFY'
      AND v."resolutionStatus" <> 'REJECTED'
    GROUP BY f."section"
    ORDER BY count DESC
  `;

  const credentials = await prisma.$queryRaw<CredentialRow[]>`
    SELECT "id", "domain", "claimType", "institution", "verifiedAt"
    FROM "UserCredential"
    WHERE "userId" = ${user.id} AND "status" = 'VERIFIED'
    ORDER BY "verifiedAt" DESC NULLS LAST
  `;

  const displayName = user.name ?? handle;
  const level = user.badgeLevel as UserBadgeLevel;
  const daysOnPlatform = Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000);
  const totalSectionContribs = sectionCounts.reduce((a, r) => a + Number(r.count), 0);
  const topSectionCount = totalSectionContribs > 0
    ? Math.max(...sectionCounts.map((r) => Number(r.count)))
    : 0;

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: displayName,
    url: `https://shishya.in/u/${handle}`,
    description: `Contributor on Shishya with ${user.verificationCount} verified contributions.`,
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · /u/{handle}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-ink-900">{displayName}</h1>
          <UserBadge
            level={level}
            domain={level === "DOMAIN_EXPERT" && credentials.length > 0 ? credentials[0].domain : null}
          />
        </div>
        <p className="mt-1 text-xs text-ink-500">
          On Shishya for {daysOnPlatform} day{daysOnPlatform === 1 ? "" : "s"}
          {user.badgeEarnedAt && (
            <> · {titleCase(user.badgeLevel)} since {user.badgeEarnedAt.toISOString().slice(0, 10)}</>
          )}
        </p>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Verifications" value={user.verificationCount} />
          <Stat label="Contribution score" value={user.contributionScore} />
          <Stat label="Verified credentials" value={credentials.length} />
        </div>

        {/* Verified credentials */}
        {credentials.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">
              Verified credentials
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {credentials.map((c) => (
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
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Sections contributed */}
        {totalSectionContribs > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">
              Sections contributed to
            </h2>
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

        {totalSectionContribs === 0 && (
          <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-6 text-center text-sm text-ink-600">
            No public verification activity yet.
          </div>
        )}

        <div className="mt-10 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">How verification on Shishya works</h3>
          <p className="mt-2">
            Shishya is India's free, community-driven education platform. Facts
            on exam, college, and scholarship pages are verified by a community
            of trusted verifiers and domain experts, with AI assistance. Read the{" "}
            <Link href="/verification" className="text-saffron-700 underline">
              verification policy
            </Link>.
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{value}</p>
    </div>
  );
}

function titleCase(s: string): string {
  return s.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
