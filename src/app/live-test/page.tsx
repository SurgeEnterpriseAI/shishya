// /live-test — the All-India Live Test hub.
// Sunday, one paper per exam, the same for everyone who takes it that day:
// cards for this week's tests with countdown (upcoming), Join (open) or
// aggregate results (closed).
// Privacy: aggregates + the signed-in user's OWN rank only — never a
// named public leaderboard.
//
// 10 Oct 2026 (honesty, Release 1): this page promised what the site does
// not do. It said a live test had no sign-in barrier, but taking one needs
// a free account (src/lib/guest-paper.ts: live tests keep their sign-in;
// isGuestPaperMock refuses a live-test mock). It said the whole country
// writes each paper and gets a national rank, but each Sunday paper had
// 0–4 takers from 30 Aug to 4 Oct 2026 (LiveTest × Attempt, SELECT of
// 10 Oct). Every line now says what is true: free, the same paper for
// everyone who takes it that day, a free sign-up to take it, and a rank
// among those who have taken it so far (each card prints how many wrote
// it; the rank shown on submit counts those who have submitted by then).
// tests/unit/live-test-honesty.test.ts keeps the old claims out.
//
// Under 13 (founder rule: content only, no sign-up, no data; review of
// Release 1, 10 Oct 2026): a kids' exam's card (src/lib/signin-cta.ts
// isKidsExamCode: the SOF, Silverzone and NSTSE olympiads, JNVST) shows a
// guest NO sign-up button. On 10 Oct the SZF IOS rehearsal card offered
// "Sign up with Google" to Class 1-12 olympiad students.
//
// Exam-week rehearsals (Mock.config.rehearsalFor) also live in "LiveTest"
// but are open for 3–7 days before ONE exam's day, so they get their own
// section here and are kept out of the Sunday buckets and the FAQ list —
// calling a Tuesday warm-up "this Sunday's paper" is simply wrong (review
// 6 Sep 2026). Every other "open now" surface excludes them outright; this
// hub is where they stay reachable.

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_SQL } from "@/lib/db/exam-scope";
import { Header } from "@/components/Header";
import { SignUpButton } from "@/components/SignUpButton";
import { signUpWords } from "@/lib/signup-place-words";
import { signUpReason } from "@/lib/signup-cta-copy";
import { isKidsExamCode } from "@/lib/signin-cta";

export const dynamic = "force-dynamic";

// The share card's line (Open Graph and X), one sentence set for both.
const SHARE_DESCRIPTION =
  "Every Sunday: a free live mock test for top government exams, the same paper for everyone who takes it that day. Sign up free to take it; when you submit, you see your rank among those who have taken it so far.";

export const metadata: Metadata = {
  title: "All-India Live Test — free Sunday mock test with your rank | Shishya",
  description:
    "Every Sunday, 6 AM to 11 PM IST: one free 25-question mock per exam, the same paper for everyone who takes it that day. Sign up free to take it; your rank is among those who took the same paper. SSC, banking, railways, state exams.",
  alternates: { canonical: "https://shishya.in/live-test" },
  openGraph: {
    title: 'All-India Live Test — free weekly mock with your rank | Shishya'.replace(" | Shishya", ""),
    description: SHARE_DESCRIPTION,
    url: "https://shishya.in/live-test",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
    // Explicit og:image: a page-level openGraph block replaces the root's,
    // so the root card (src/app/opengraph-image.tsx) was not inherited.
    images: [{ url: "https://shishya.in/opengraph-image", width: 1200, height: 630, alt: "Shishya — one smart place to study: school, entrance exams, government exams, colleges and scholarships, careers" }],
  },
  twitter: {
    card: "summary_large_image",
    images: ["https://shishya.in/opengraph-image"],
    title: 'All-India Live Test — free weekly mock with your rank | Shishya'.replace(" | Shishya", ""),
    description: SHARE_DESCRIPTION,
  },
};

interface Row {
  id: string;
  mockId: string;
  opensAt: Date;
  closesAt: Date;
  code: string;
  short: string;
  /** IST exam day the paper rehearses for; null on the Sunday papers. */
  rehearsalFor: string | null;
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

  // 25 Sep 2026: real exams only (NOT_SCHOOL_SQL) — never a school class container.
  const rows = await prisma.$queryRaw<Row[]>`
    SELECT lt.id, lt."mockId", lt."opensAt", lt."closesAt",
           e.code, e."shortName" AS short,
           m.config->>'rehearsalFor' AS "rehearsalFor",
           COALESCE(agg.participants, 0)::int AS participants,
           agg."topPct", agg."avgPct"
    FROM "LiveTest" lt
    JOIN "Exam" e ON e.id = lt."examId"
    LEFT JOIN "Mock" m ON m.id = lt."mockId"
    LEFT JOIN LATERAL (
      SELECT COUNT(DISTINCT a."userId")::int AS participants,
             MAX(a."scorePct") AS "topPct",
             AVG(a."scorePct") AS "avgPct"
      FROM "Attempt" a
      WHERE a."mockId" = lt."mockId" AND a.status IN ('SUBMITTED', 'AUTO_SUBMITTED')
    ) agg ON TRUE
    WHERE lt."closesAt" > NOW() - INTERVAL '8 days' AND ${NOT_SCHOOL_SQL}
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

  // Sunday papers and exam-week rehearsals are different products; the
  // Sunday buckets below must never quietly absorb a rehearsal.
  const sunday = rows.filter((r) => !r.rehearsalFor);
  const rehearsalsOpen = rows.filter(
    (r) => r.rehearsalFor && r.opensAt <= now && r.closesAt > now,
  );
  const upcoming = sunday.filter((r) => r.opensAt > now);
  const open = sunday.filter((r) => r.opensAt <= now && r.closesAt > now);
  const closed = sunday.filter((r) => r.closesAt <= now);

  const card = (r: Row, state: "upcoming" | "open" | "closed" | "rehearsal") => {
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
          {state === "rehearsal" && (
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
              ● Open till {istLabel(r.closesAt)}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-ink-500">
          {state === "rehearsal"
            ? "25 questions · 20 minutes · a calm run-through before your exam day"
            : "25 questions · 20 minutes · one paper for everyone who takes it"}
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
        ) : (state === "open" || state === "rehearsal") && userId ? (
          <Link
            href={`/mocks/${r.mockId}`}
            className="mt-3 inline-flex items-center rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-saffron-600"
          >
            Write it now →
          </Link>
        ) : (state === "open" || state === "rehearsal") && isKidsExamCode(r.code) ? (
          // Under 13: a kids' exam (olympiads sat from Class 1, JNVST) asks a
          // guest for nothing — no sign-up button, no line asking for one.
          null
        ) : state === "open" || state === "rehearsal" ? (
          // 2 Oct 2026 (founder: every sign-in call is the white Google
          // button, with a line saying why): a guest's button here was our
          // saffron "Sign in free to write it →". What it was for is now the
          // plain line (signUpReason "writePaper"), and under it the one
          // shared button. Same destination — /login, back to /live-test —
          // with its own door id ("live-test"; it was counted as "link").
          // A member's "Write it now →" above is unchanged.
          <div className="mt-3">
            <p data-su-reason className="text-xs text-ink-700">{signUpReason("en", "writePaper")}</p>
            {/* 2 Oct 2026, later: the tooltip is this door's own entry
                (door.live-test), resolved here on the server. It names the
                paper's exam as a VARIABLE only — this sign-in returns to
                /live-test and sets no exam — and says where the student
                stands "among those who wrote the same paper, however few". */}
            <SignUpButton
              href="/login?callbackUrl=%2Flive-test&from=live-test"
              surface="live-test"
              {...signUpWords("en", { surface: "live-test", callback: "/live-test", vars: { exam: r.short } })}
              explain="own"
              className="mt-2"
            />
          </div>
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
        "Free weekly live mock test for Indian government exams — every Sunday one 25-question paper per exam, the same for everyone who takes it that day. A free sign-up is needed to take it; when you submit, you see your rank among those who have taken it so far.",
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
          name: "Is there a free weekly mock test with a rank for government exams?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Shishya runs a free live test every Sunday from 6 AM to 11 PM IST at https://shishya.in/live-test — one 25-question paper per exam, the same for everyone who takes it that day. You sign up free to take it. When you submit, you see your rank among those who have taken the same paper so far; each paper's card shows how many wrote it. No fee and no test-series subscription.",
          },
        },
        {
          "@type": "Question",
          name: "Why should I take a live test instead of a normal mock?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "A live test adds two things a solo mock cannot: a fixed appointment that builds an exam-day routine, and a rank among everyone else who took the same paper that day. The rank is out of however many took that paper, so when only a few take it, read it as a rough comparison, not a forecast of selection.",
          },
        },
        {
          "@type": "Question",
          name: "Which exams have the Shishya live test?",
          acceptedAnswer: {
            "@type": "Answer",
            // Sunday papers only — a rehearsal is not one of "the exams that
            // have the Sunday live test".
            text: `Papers are created weekly for the most-prepared exams on the platform. Current live tests: ${
              sunday.length ? [...new Set(sunday.map((r) => r.short))].slice(0, 8).join(", ") : "published every Saturday night for the coming Sunday"
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
          Every Sunday, 6 AM – 11 PM IST: one free 25-question paper per exam, the same for
          everyone who takes it that day. Sign up free to take it. When you submit, you see
          your rank among those who have taken the same paper so far.
        </p>

        {open.length > 0 && (
          <>
            <h2 className="mt-7 text-base font-bold text-emerald-800">● Live now</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">{open.map((r) => card(r, "open"))}</div>
          </>
        )}
        {rehearsalsOpen.length > 0 && (
          <>
            <h2 className="mt-7 text-base font-bold text-ink-900">Exam-week rehearsal</h2>
            {/* No exam DATE printed here: we hold only the day, not its
                source tier, and an untiered date is not ours to show. */}
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-ink-600">
              These exams are being written this week. An easier-leaning warm-up paper — open now,
              closing the evening before the exam day. Not the Sunday paper: write one to
              settle the nerves and check your timing.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              {rehearsalsOpen.map((r) => card(r, "rehearsal"))}
            </div>
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
        {/* closed rehearsals render nowhere, so key the empty state on what
            is actually shown — not on the raw row count. */}
        {sunday.length === 0 && rehearsalsOpen.length === 0 && (
          <div className="mt-8 rounded-xl border border-dashed border-ink-300 bg-white px-4 py-10 text-center text-sm text-ink-500">
            This week&apos;s tests are being prepared — papers go up by Saturday night.
          </div>
        )}
      </section>
    </main>
  );
}
