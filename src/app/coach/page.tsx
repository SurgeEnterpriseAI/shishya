// /coach — the Personal Coach: the free replacement for coaching-
// institute hand-holding. Anonymous visitors see the promise (SEO:
// "free online coaching for government exams"); signed-in students
// without a plan get the 30-second intake; students with a plan get
// today's rebuilt plan in full.
//
// Rollover (Exam Week Mode wave 2, play 12): /coach?next=1&from=CODE —
// the post-exam task and the dashboard rollover card land here. The
// intake opens pre-filled with the NEXT exam in the student's track (same
// category + state, exam day 7–90 days out, other active enrolments
// first), the old plan's daily minutes kept, and the syllabus overlap
// between the two exams named. No model call — the plan itself is
// rebuilt by the usual night pass.

import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_SQL, REAL_EXAM_SQL, realExamKey } from "@/lib/db/exam-scope";
import { getT } from "@/lib/i18n-server";
import { Header } from "@/components/Header";
import { SHISHYA_ORG_REF } from "@/components/JsonLd";
import { computeCoachPlan } from "@/lib/coach-plan";
import { coachTaskDoneFlags } from "@/lib/coach-done";
import { CoachIntake, type CoachRollover, type ExamOption } from "./CoachIntake";
import { CoachPlanView } from "./CoachPlanView";

export const dynamic = "force-dynamic";

const EXAM_CODE_RE = /^[A-Z0-9_]{2,40}$/;
const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 330 * 60_000;

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

interface RolloverData {
  from: { code: string; short: string };
  /** Recommended next exam (null when nothing in the track is 7–90 days out). */
  next: { code: string; short: string; day: string } | null;
  /** Subject names both syllabi share (next exam's spelling), max 5. */
  overlap: string[];
}

/** The next exam in the finished exam's track for this student. */
async function loadRollover(userId: string, fromCode: string): Promise<RolloverData | null> {
  if (!EXAM_CODE_RE.test(fromCode)) return null;
  const from = await prisma.exam
    .findUnique({ where: realExamKey({ code: fromCode }), select: { id: true, code: true, shortName: true, category: true, state: true } })
    .catch(() => null);
  if (!from) return null;

  const todayUtc = new Date(`${new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10)}T00:00:00.000Z`);
  const lo = new Date(todayUtc.getTime() + 7 * DAY_MS);
  const hi = new Date(todayUtc.getTime() + 90 * DAY_MS);
  // 25 Sep 2026: the coach plans toward real exams only — school class
  // containers (src/lib/db/exam-scope.ts) are never a rollover or an option.
  const rows = await prisma.$queryRaw<{ id: string; code: string; short: string; date: Date; enrolled: boolean }[]>`
    SELECT e.id, e.code, e."shortName" AS short, MIN(d.date) AS date, (en."userId" IS NOT NULL) AS enrolled
    FROM "ExamImportantDate" d
    JOIN "Exam" e ON e.id = d."examId" AND ${REAL_EXAM_SQL}
    LEFT JOIN "Enrollment" en ON en."examId" = e.id AND en."userId" = ${userId} AND en.active = TRUE
    WHERE d."archivedAt" IS NULL
      AND (d.kind = 'EXAM' OR (d.kind IS NULL AND d."isExamDay" = TRUE))
      AND e.category::text = ${from.category}
      AND e.state IS NOT DISTINCT FROM ${from.state}::text
      AND e.id <> ${from.id}
      AND d.date >= ${lo} AND d.date <= ${hi}
    GROUP BY e.id, e.code, e."shortName", en."userId"
    ORDER BY (en."userId" IS NOT NULL) DESC, MIN(d.date) ASC
    LIMIT 1`.catch((err) => {
    console.error("[coach] rollover next-in-track failed (non-fatal):", err);
    return [] as { id: string; code: string; short: string; date: Date; enrolled: boolean }[];
  });
  const hit = rows[0] ?? null;
  const next = hit ? { id: hit.id, code: hit.code, short: hit.short, day: new Date(hit.date).toISOString().slice(0, 10) } : null;

  let overlap: string[] = [];
  if (next) {
    const subjects = await prisma.subject
      .findMany({ where: { examId: { in: [from.id, next.id] } }, select: { examId: true, name: true }, orderBy: { orderIdx: "asc" } })
      .catch(() => [] as { examId: string; name: string }[]);
    const norm = (s: string) => s.trim().toLowerCase();
    const fromNames = new Set(subjects.filter((s) => s.examId === from.id).map((s) => norm(s.name)));
    const seen = new Set<string>();
    for (const s of subjects) {
      if (s.examId !== next.id) continue;
      const key = norm(s.name);
      if (!key || !fromNames.has(key) || seen.has(key)) continue;
      seen.add(key);
      overlap.push(s.name.trim());
    }
    overlap = overlap.slice(0, 5);
  }
  return { from: { code: from.code, short: from.shortName }, next: next && { code: next.code, short: next.short, day: next.day }, overlap };
}

export const metadata: Metadata = {
  title: "Free Personal Coach for Government Exams — day-by-day plan | Shishya",
  description:
    "Can't afford ₹50,000 coaching? Shishya's free personal coach builds your day-by-day plan to the exam — and rebuilds it every morning around what you actually did. Syllabus, mocks, weak-area focus, honest triage when time runs short. 100% free.",
  alternates: { canonical: "https://shishya.in/coach" },
  openGraph: {
    title: 'Free Personal Coach for government exams — a plan rebuilt every morning | Shishya'.replace(" | Shishya", ""),
    description: 'A day-by-day study plan to your exam date, rebuilt each morning around what you actually did. Honest triage when days run short. The free replacement for Rs 30,000-50,000 coaching guidance.',
    url: "https://shishya.in/coach",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: 'Free Personal Coach for government exams — a plan rebuilt every morning | Shishya'.replace(" | Shishya", ""),
    description: 'A day-by-day study plan to your exam date, rebuilt each morning around what you actually did. Honest triage when days run short. The free replacement for Rs 30,000-50,000 coaching guidance.',
  },
};

async function examOptions(userId: string | null): Promise<ExamOption[]> {
  // Enrolled exams first, then the platform's most-prepared exams.
  const rows = await prisma.$queryRaw<{ code: string; short: string; enrolled: boolean }[]>`
    SELECT e.code, e."shortName" AS short,
           (en."userId" IS NOT NULL) AS enrolled
    FROM "Exam" e
    LEFT JOIN "Enrollment" en ON en."examId" = e.id AND en."userId" = ${userId}
    LEFT JOIN (SELECT "examId", COUNT(*) c FROM "Enrollment" GROUP BY 1) pop ON pop."examId" = e.id
    WHERE ${REAL_EXAM_SQL}
    ORDER BY (en."userId" IS NOT NULL) DESC, COALESCE(pop.c, 0) DESC, e."shortName" ASC
    LIMIT 60`;
  const dates = await prisma.$queryRaw<{ code: string; d: Date }[]>`
    SELECT DISTINCT ON (e.code) e.code, i.date AS d
    FROM "ExamImportantDate" i JOIN "Exam" e ON e.id = i."examId"
    WHERE i."isExamDay" = TRUE AND i."archivedAt" IS NULL AND i.date > NOW() AND ${NOT_SCHOOL_SQL}
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
  searchParams: Promise<{ edit?: string; exam?: string; next?: string; from?: string }>;
}) {
  const sp = await searchParams;
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const plan = userId ? await computeCoachPlan(userId) : null;
  // ?next=1&from=CODE — the rollover intake (post-exam task / dashboard
  // card). `from` defaults to the current plan's exam.
  const wantsRollover = sp.next === "1";
  const fromCode = (sp.from ?? plan?.examCode ?? "").toUpperCase();
  const rolloverData = userId && wantsRollover ? await loadRollover(userId, fromCode) : null;
  const showIntake = userId && (!plan || sp.edit === "1" || !!rolloverData);
  const allOptions = showIntake ? await examOptions(userId) : [];
  // ?exam=CODE (from the coach entry on exam/syllabus/results pages)
  // pre-selects that exam so the student lands on a half-filled form; the
  // rollover's recommended next exam wins when both are present.
  const wanted = rolloverData?.next?.code ?? sp.exam?.toUpperCase();
  const preselected = wanted
    ? allOptions.find((o) => o.code === wanted) ??
      (rolloverData?.next && rolloverData.next.code === wanted
        ? { code: rolloverData.next.code, short: rolloverData.next.short, nextDate: rolloverData.next.day }
        : undefined)
    : undefined;
  const options = preselected
    ? [preselected, ...allOptions.filter((o) => o.code !== preselected.code)]
    : allOptions;

  const { t, locale } = await getT();
  // Ticks on today's tasks (16 Sep 2026) — the breadcrumb's own definition
  // (src/lib/coach-done.ts). Only when the plan view renders; a failed read
  // shows no ticks rather than a wrong one.
  const planDone =
    userId && plan && sp.edit !== "1" && !rolloverData
      ? await coachTaskDoneFlags(userId, plan.todayTasks).catch(() => null)
      : null;
  const rollover: CoachRollover | null = rolloverData
    ? {
        title: fill(t("ew.coach.postexam.title"), { exam: rolloverData.from.short }),
        body: t("ew.coach.postexam.body"),
        cta: t("ew.coach.postexam.cta"),
        overlap:
          rolloverData.next && rolloverData.overlap.length > 0
            ? fill(t("ew.coach.overlap"), { exam: rolloverData.next.short, topics: rolloverData.overlap.join(", ") })
            : null,
        nextCode: rolloverData.next?.code ?? null,
      }
    : null;
  // Prefill: the next exam + its date, the old plan's daily minutes.
  const intakeInitial = rolloverData
    ? {
        examCode: rolloverData.next?.code,
        examDate: rolloverData.next?.day,
        dailyMinutes: plan?.dailyMinutes,
      }
    : null;
  const selfPath = wantsRollover && EXAM_CODE_RE.test(fromCode)
    ? `/coach?next=1&from=${fromCode}`
    : sp.exam
      ? `/coach?exam=${sp.exam.toUpperCase()}`
      : "/coach";

  // AEO: the questions aspirants actually type into Google and ask
  // ChatGPT/Gemini/Perplexity about affording coaching, making a plan,
  // and recovering after missed days — answered in liftable form.
  // 26 Sep 2026: the first answer said "free for 177 government and entrance
  // exams" — a typed count (the live catalogue is larger); number-free now.
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
      // 26 Sep 2026: the root layout Organization's @id, so crawlers join the nodes.
      provider: SHISHYA_ORG_REF,
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
            text: "Yes. Shishya's Personal Coach (https://shishya.in/coach) is completely free — no fees, no subscription, no credit card. Coaching institutes charge ₹30,000–₹50,000 for what is essentially a study plan, doubt-solving and test series; Shishya gives all three free for every government and entrance exam on the site.",
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
                You commit to your exam — say 60 days out. Ten good days. Then a wedding in the
                family, a fever, a week at the shop. And the thought arrives:{" "}
                <span className="italic text-ink-500">
                  &ldquo;Six days gone. My plan is ruined. I&apos;ll never catch up — maybe next
                  year.&rdquo;
                </span>{" "}
                That thought, not those six days, is what ends most attempts.
              </p>
              <p className="mt-3 text-sm leading-relaxed text-ink-900">
                Here, you never have to think it. There is{" "}
                <span className="font-bold">no such thing as a ruined plan on Shishya</span> —
                while you sleep, your coach quietly rebuilds everything: 44 days left, 39 topics
                to go, here&apos;s <span className="font-bold">today&apos;s</span> best move. If
                you&apos;ve fallen far behind, it openly parks the lowest-weightage topics so
                every hour you have left goes where the marks are. You never see a backlog. You
                only ever see today — and today is always winnable.
              </p>
            </div>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-700">
              Tell your coach three things — your exam, its date, and how much time you honestly
              have each day. Every morning after that, your plan is rebuilt around what you
              actually did. That&apos;s what ₹50,000 buys you at an institute. Here it&apos;s free.
            </p>
            <ul className="mt-4 max-w-2xl space-y-1.5 text-sm text-ink-700">
              <li>📋 Day-by-day plan from today to exam day — reads, topic tests, mocks</li>
              <li>🔁 Rebuilt every morning from your real progress, not wishful thinking</li>
              <li>✂️ Honest triage when days run short — best score with what&apos;s left</li>
              <li>🇮🇳 Sunday All-India Live Test as your weekly benchmark</li>
            </ul>
            <Link
              href={`/login?callbackUrl=${encodeURIComponent(selfPath)}`}
              className="mt-6 inline-block rounded-lg bg-saffron-500 px-8 py-3 text-sm font-bold text-white shadow-sm hover:bg-saffron-600"
            >
              Start free — build my plan →
            </Link>
            <p className="mt-2 text-[11px] text-ink-400">
              No payment, no trial, no card. Free is the product.
            </p>
          </>
        )}

        {showIntake && <CoachIntake options={options} initial={intakeInitial} rollover={rollover} />}

        {userId && plan && sp.edit !== "1" && !rolloverData && (
          <>
            <CoachPlanView plan={plan} full done={planDone} locale={locale} />
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
