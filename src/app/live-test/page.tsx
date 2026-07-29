// /live-test — the All-India Live Test hub.
// Sunday, same paper, whole country: cards for this week's tests with
// countdown (upcoming), Join (open) or aggregate results (closed).
// Privacy: aggregates + the signed-in user's OWN rank only — never a
// named public leaderboard.

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/Header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "All-India Live Test — free Sunday mock with national rank | Shishya",
  description:
    "Every Sunday, one shared mock test per top exam — the whole country writes the same paper and gets an All-India rank. Free, 6 AM to 11 PM IST. SSC, banking, railways, state exams.",
  alternates: { canonical: "https://shishya.in/live-test" },
};

interface Row {
  id: string;
  mockId: string;
  opensAt: Date;
  closesAt: Date;
  code: string;
  short: string;
  participants: number;
  topPct: number | null;
  avgPct: number | null;
}

function istLabel(d: Date, withDay = true) {
  return d.toLocaleString("en-IN", {
    ...(withDay ? { weekday: "long" } : {}),
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
}

export default async function LiveTestPage() {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const now = new Date();

  const rows = await prisma.$queryRaw<Row[]>`
    SELECT lt.id, lt."mockId", lt."opensAt", lt."closesAt",
           e.code, e."shortName" AS short,
           COALESCE(agg.participants, 0)::int AS participants,
           agg."topPct", agg."avgPct"
    FROM "LiveTest" lt
    JOIN "Exam" e ON e.id = lt."examId"
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT a."userId")::int AS participants,
             MAX(a."scorePct") AS "topPct",
             AVG(a."scorePct") AS "avgPct"
      FROM "Attempt" a
      WHERE a."mockId" = lt."mockId" AND a.status IN ('SUBMITTED', 'AUTO_SUBMITTED')
    ) agg ON TRUE
    WHERE lt."closesAt" > NOW() - INTERVAL '8 days'
    ORDER BY lt."opensAt" ASC, e."shortName" ASC
    LIMIT 24`;

  // The signed-in user's own first-attempt result per live mock.
  const myByMock = new Map<string, { pct: number | null; attemptId: string }>();
  if (userId && rows.length) {
    const mockIds = rows.map((r) => r.mockId);
    const mine = await prisma.$queryRaw<{ mockId: string; id: string; pct: number | null }[]>`
      SELECT DISTINCT ON ("mockId") "mockId", id, "scorePct" AS pct
      FROM "Attempt"
      WHERE "userId" = ${userId} AND "mockId" = ANY(${mockIds})
        AND status IN ('SUBMITTED', 'AUTO_SUBMITTED')
      ORDER BY "mockId", "startedAt" ASC`;
    for (const m of mine) myByMock.set(m.mockId, { pct: m.pct, attemptId: m.id });
  }

  const upcoming = rows.filter((r) => r.opensAt > now);
  const open = rows.filter((r) => r.opensAt <= now && r.closesAt > now);
  const closed = rows.filter((r) => r.closesAt <= now);

  const card = (r: Row, state: "upcoming" | "open" | "closed") => {
    const mine = myByMock.get(r.mockId);
    return (
      <div key={r.id} className="rounded-xl border border-ink-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-bold text-ink-900">{r.short}</p>
          {state === "open" && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              ● LIVE until {istLabel(r.closesAt, false)}
            </span>
          )}
          {state === "upcoming" && (
            <span className="rounded-full bg-saffron-100 px-2.5 py-0.5 text-[11px] font-bold text-saffron-800">
              Opens {istLabel(r.opensAt)}
            </span>
          )}
          {state === "closed" && (
            <span className="rounded-full bg-ink-100 px-2.5 py-0.5 text-[11px] font-semibold text-ink-600">
              Concluded
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-500">
          25 questions · 20 minutes · same paper across India
        </p>

        {(state !== "upcoming" || r.participants > 0) && (
          <p className="mt-2 text-xs text-ink-600">
            <span className="font-semibold text-ink-800">{r.participants}</span> wrote it
            {r.topPct != null && (
              <>
                {" "}· top score <span className="font-semibold">{Math.round(r.topPct)}%</span>
              </>
            )}
            {r.avgPct != null && (
              <>
                {" "}· average <span className="font-semibold">{Math.round(r.avgPct)}%</span>
              </>
            )}
          </p>
        )}

        {mine ? (
          <Link
            href={`/attempts/${mine.attemptId}/results`}
            className="mt-3 inline-flex items-center rounded-lg border border-saffron-400 bg-saffron-50 px-4 py-2 text-sm font-bold text-saffron-800 hover:bg-saffron-100"
          >
            Your result{mine.pct != null ? ` — ${Math.round(mine.pct)}%` : ""} &amp; rank →
          </Link>
        ) : state === "open" ? (
          <Link
            href={userId ? `/mocks/${r.mockId}` : `/login?callbackUrl=%2Flive-test`}
            className="mt-3 inline-flex items-center rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-saffron-600"
          >
            {userId ? "Write it now →" : "Sign in free to write it →"}
          </Link>
        ) : state === "upcoming" ? (
          <Link
            href={`/exams/${r.code}`}
            className="mt-3 inline-flex items-center rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:border-saffron-400"
          >
            Warm up with {r.short} mocks →
          </Link>
        ) : null}
      </div>
    );
  };

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Shishya All-India Live Test",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: "https://shishya.in/live-test",
      description:
        "Free weekly All-India live mock test for Indian government exams — every Sunday one shared paper per exam, with an All-India rank on submission.",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      provider: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: "Is there a free All-India mock test with rank for government exams?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Shishya runs a free All-India Live Test every Sunday from 6 AM to 11 PM IST at https://shishya.in/live-test — one shared 25-question paper per exam, written by aspirants across India on the same day, with your All-India rank shown the moment you submit. No fee and no test-series subscription.",
          },
        },
        {
          "@type": "Question",
          name: "Why should I take a live test instead of a normal mock?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A live test adds the two things a solo mock cannot: a fixed appointment that builds exam-day routine, and a comparison against everyone else who wrote the same paper that day. That relative position — not your raw score — is what actually predicts selection, because government exams are ranked competitions with cutoffs.",
          },
        },
        {
          "@type": "Question",
          name: "Which exams have the Shishya live test?",
          acceptedAnswer: {
            "@type": "Answer",
            text: `Papers are created weekly for the most-prepared exams on the platform. Current live tests: ${
              rows.length ? [...new Set(rows.map((r) => r.short))].slice(0, 8).join(", ") : "published every Saturday night for the coming Sunday"
            }.`,
          },
        },
      ],
    },
  ];

  return (
    <main className="min-h-screen bg-paper-50">
      {jsonLd.map((j, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }}
        />
      ))}
      <Header />
      <section className="container-prose py-8">
        <h1 className="text-2xl font-bold text-ink-900">🇮🇳 All-India Live Test</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-ink-600">
          Every Sunday, 6 AM – 11 PM IST: one paper per exam, the whole country writes the
          same 25 questions, and you get your All-India rank the moment you submit. Free,
          like everything on Shishya.
        </p>

        {open.length > 0 && (
          <>
            <h2 className="mt-7 text-base font-bold text-emerald-800">● Live now</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">{open.map((r) => card(r, "open"))}</div>
          </>
        )}
        {upcoming.length > 0 && (
          <>
            <h2 className="mt-7 text-base font-bold text-ink-900">This Sunday</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {upcoming.map((r) => card(r, "upcoming"))}
            </div>
          </>
        )}
        {closed.length > 0 && (
          <>
            <h2 className="mt-7 text-base font-bold text-ink-900">Last Sunday</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {closed.map((r) => card(r, "closed"))}
            </div>
          </>
        )}
        {rows.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-10 text-center text-sm text-ink-500">
            This week&apos;s tests are being prepared — papers go up by Saturday night.
          </div>
        )}
      </section>
    </main>
  );
}
