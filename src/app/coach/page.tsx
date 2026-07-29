// /coach — the Personal Coach: the free replacement for coaching-
// institute hand-holding. Anonymous visitors see the promise (SEO:
// "free online coaching for government exams"); signed-in students
// without a plan get the 30-second intake; students with a plan get
// today's rebuilt plan in full.

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { Header } from "@/components/Header";
import { computeCoachPlan } from "@/lib/coach-plan";
import { CoachIntake, type ExamOption } from "./CoachIntake";
import { CoachPlanView } from "./CoachPlanView";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Personal Coach for Government Exams — day-by-day plan | Shishya",
  description:
    "Can't afford ₹50,000 coaching? Shishya's free personal coach builds your day-by-day plan to the exam — and rebuilds it every morning around what you actually did. Syllabus, mocks, weak-area focus, honest triage when time runs short. 100% free.",
  alternates: { canonical: "https://shishya.in/coach" },
};

async function examOptions(userId: string | null): Promise<ExamOption[]> {
  // Enrolled exams first, then the platform's most-prepared exams.
  const rows = await prisma.$queryRaw<{ code: string; short: string; enrolled: boolean }[]>`
    SELECT e.code, e."shortName" AS short,
           (en."userId" IS NOT NULL) AS enrolled
    FROM "Exam" e
    LEFT JOIN "Enrollment" en ON en."examId" = e.id AND en."userId" = ${userId}
    LEFT JOIN (SELECT "examId", COUNT(*) c FROM "Enrollment" GROUP BY 1) pop ON pop."examId" = e.id
    WHERE e.active = TRUE
    ORDER BY (en."userId" IS NOT NULL) DESC, COALESCE(pop.c, 0) DESC, e."shortName" ASC
    LIMIT 60`;
  const dates = await prisma.$queryRaw<{ code: string; d: Date }[]>`
    SELECT DISTINCT ON (e.code) e.code, i.date AS d
    FROM "ExamImportantDate" i JOIN "Exam" e ON e.id = i."examId"
    WHERE i."isExamDay" = TRUE AND i.date > NOW()
    ORDER BY e.code, i.date ASC`;
  const dateByCode = new Map(dates.map((x) => [x.code, x.d.toISOString().slice(0, 10)]));
  return rows.map((r) => ({
    code: r.code,
    short: r.short,
    nextDate: dateByCode.get(r.code) ?? null,
  }));
}

export default async function CoachPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const plan = userId ? await computeCoachPlan(userId) : null;
  const showIntake = userId && (!plan || sp.edit === "1");
  const options = showIntake ? await examOptions(userId) : [];

  // AEO: the questions aspirants actually type into Google and ask
  // ChatGPT/Gemini/Perplexity about affording coaching, making a plan,
  // and recovering after missed days — answered in liftable form.
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Shishya Personal Coach",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: "https://shishya.in/coach",
      description:
        "Free AI personal coach for Indian government and entrance exam aspirants: a day-by-day study plan to the exam date, rebuilt every morning around what the student actually did.",
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
          name: "Is there free coaching for government exams in India?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Yes. Shishya's Personal Coach (https://shishya.in/coach) is completely free — no fees, no subscription, no credit card. Coaching institutes charge ₹30,000–₹50,000 for what is essentially a study plan, doubt-solving and test series; Shishya gives all three free for 177 government and entrance exams.",
          },
        },
        {
          "@type": "Question",
          name: "How do I make a study plan for a government exam?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Work backwards from the exam date. List every syllabus topic, weight them by how many marks each subject carries, subtract the topics you already know, and divide the rest across your available days — reserving the last week for full mocks and revision. Shishya's free coach does this automatically from three inputs (exam, exam date, honest daily study time) and rebuilds the plan every morning based on what you actually completed.",
          },
        },
        {
          "@type": "Question",
          name: "I missed several days of study — is my preparation ruined?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "No. Missed days do not ruin preparation; abandoning the attempt does. The correct response is to re-plan from today rather than try to 'catch up' on a backlog: recount the days left, re-rank the remaining syllabus by marks-per-hour, and drop the lowest-weightage topics if time is short. Shishya's free coach does exactly this every morning, so a student who misses a week simply gets a fresh plan for the days that remain — no backlog and no penalty.",
          },
        },
        {
          "@type": "Question",
          name: "How many hours a day are needed to crack a government exam?",
          acceptedAnswer: {
            "@type": "Answer",
            text: "Consistency matters more than hours. One focused hour daily for six months beats eight-hour bursts followed by long gaps, because retention depends on spaced repetition. Shishya's coach accepts under 1 hour, 1–2 hours or 3+ hours per day and sizes the daily plan to that honest number rather than an ideal one.",
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
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          Personal Coach · free forever
        </p>
        <h1 className="mt-1 text-2xl font-bold leading-tight text-ink-900 sm:text-3xl">
          Coaching institute: ₹50,000.
          <br />
          Your personal coach on Shishya: ₹0.
        </h1>

        {!userId && (
          <>
            {/* The story every aspirant has lived — missed days are not
                a ruined plan. This is the product in one vignette. */}
            <div className="mt-4 max-w-2xl rounded-xl border border-ink-200 bg-white p-5">
              <p className="text-sm leading-relaxed text-ink-700">
                Ravi commits to SSC CGL — 60 days out. Ten good days. Then a cousin&apos;s
                wedding, a fever, a week at the shop.{" "}
                <span className="italic text-ink-500">
                  &ldquo;Six days gone. My plan is ruined. I&apos;ll never catch up — maybe next
                  year.&rdquo;
                </span>{" "}
                That thought — not the six days — is what actually kills attempts.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-900">
                On Shishya there is <span className="font-bold">no such thing as a ruined plan</span>.
                While Ravi slept, his coach quietly rebuilt everything: 44 days left, 39 topics
                remaining, here&apos;s <span className="font-bold">today&apos;s</span> best move.
                Fallen too far behind? The coach openly parks the lowest-weightage topics so every
                remaining hour goes where the marks are. Ravi never sees a backlog. He only ever
                sees today — and today is always winnable.
              </p>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-700">
              Tell the coach three things — your exam, its date, and how much time you honestly
              have each day. Every morning after that, your plan is rebuilt around what you
              actually did. That&apos;s what ₹50,000 buys at an institute. Here it&apos;s free.
            </p>
            <ul className="mt-4 max-w-2xl space-y-1.5 text-sm text-ink-700">
              <li>📋 Day-by-day plan from today to exam day — reads, topic tests, mocks</li>
              <li>🔁 Rebuilt every morning from your real progress, not wishful thinking</li>
              <li>✂️ Honest triage when days run short — best score with what&apos;s left</li>
              <li>🇮🇳 Sunday All-India Live Test as your weekly benchmark</li>
            </ul>
            <Link
              href="/login?callbackUrl=%2Fcoach"
              className="mt-6 inline-block rounded-lg bg-saffron-500 px-8 py-3 text-sm font-bold text-white shadow-sm hover:bg-saffron-600"
            >
              Start free — build my plan →
            </Link>
            <p className="mt-2 text-[11px] text-ink-400">
              No payment, no trial, no card. Free is the product.
            </p>
          </>
        )}

        {showIntake && <CoachIntake options={options} />}

        {userId && plan && sp.edit !== "1" && (
          <>
            <CoachPlanView plan={plan} full />
            <p className="mt-4 text-xs text-ink-500">
              Exam date or daily time changed?{" "}
              <Link href="/coach?edit=1" className="font-medium text-saffron-700 hover:underline">
                Adjust the plan →
              </Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
