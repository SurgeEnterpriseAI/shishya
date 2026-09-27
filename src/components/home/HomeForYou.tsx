// "For you" on the home page, for a signed-in student (27 Sep 2026).
//
// The sign-up offer promises that Shishya remembers the student and the home
// page opens where they left off (src/lib/signup-pitch.ts). This block is
// that promise: the paper still in progress, the last result, the exams they
// follow, their weakest topics (each one tap to the tutor), their school
// class, and their streak — all from their own rows, nothing guessed.
// Server component; renders nothing for a brand-new account with no
// activity (the home page itself is then their starting point).

import Link from "next/link";
import { prisma } from "@/lib/db/prisma";
import { getStudyStreak } from "@/lib/db/streak";
import { schoolContainerClassOf } from "@/lib/school/student-classes";
import { formatDisplayScorePct } from "@/lib/scoring";
import { REAL_EXAM_WHERE, SCHOOL_CATEGORY } from "@/lib/db/exam-scope";

type L = "en" | "hi" | "te";
const COPY: Record<L, {
  title: string; resume: string; last: string; exams: string; weak: string; askTutor: string; cls: string; streak: string; dashboard: string;
}> = {
  en: { title: "For you", resume: "Continue your paper", last: "Your last result", exams: "Your exams", weak: "Your weakest topics", askTutor: "Ask the tutor", cls: "Your class", streak: "Study streak: {n} days", dashboard: "Your dashboard →" },
  hi: { title: "आपके लिए", resume: "अपना पेपर जारी रखें", last: "आपका पिछला परिणाम", exams: "आपकी परीक्षाएँ", weak: "आपके सबसे कमज़ोर टॉपिक", askTutor: "ट्यूटर से पूछें", cls: "आपकी कक्षा", streak: "पढ़ाई की स्ट्रीक: {n} दिन", dashboard: "आपका डैशबोर्ड →" },
  te: { title: "మీ కోసం", resume: "మీ పేపర్ కొనసాగించండి", last: "మీ చివరి ఫలితం", exams: "మీ పరీక్షలు", weak: "మీ బలహీన టాపిక్‌లు", askTutor: "ట్యూటర్‌ను అడగండి", cls: "మీ తరగతి", streak: "చదువు స్ట్రీక్: {n} రోజులు", dashboard: "మీ డ్యాష్‌బోర్డ్ →" },
};

export async function HomeForYou({ userId, locale }: { userId: string; locale: string }) {
  const c = COPY[(locale === "hi" || locale === "te" ? locale : "en") as L];
  const [inProgress, last, weak, examEnrolls, schoolEnrolls, streak] = await Promise.all([
    prisma.attempt
      .findFirst({
        where: { userId, status: "IN_PROGRESS" },
        orderBy: { startedAt: "desc" },
        select: { mockId: true, mock: { select: { title: true, generatedBy: true } } },
      })
      .catch(() => null),
    prisma.attempt
      .findFirst({
        where: { userId, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } },
        orderBy: { finishedAt: "desc" },
        select: { id: true, scorePct: true, mock: { select: { title: true } } },
      })
      .catch(() => null),
    prisma.weaknessMap
      .findMany({
        where: { userId, attemptsCount: { gte: 3 } },
        orderBy: [{ masteryScore: "asc" }, { attemptsCount: "desc" }],
        take: 3,
        select: { topic: { select: { code: true, name: true } }, exam: { select: { code: true, shortName: true } } },
      })
      .catch(() => []),
    prisma.enrollment
      .findMany({
        where: { userId, active: true, exam: REAL_EXAM_WHERE },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { exam: { select: { code: true, shortName: true } } },
      })
      .catch(() => []),
    prisma.enrollment
      .findMany({
        // Class containers are inactive by design (kept out of exam lists), so no active filter here.
        where: { userId, active: true, exam: { category: SCHOOL_CATEGORY } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: { exam: { select: { code: true } } },
      })
      .catch(() => []),
    getStudyStreak(userId).catch(() => null),
  ]);

  const exams = examEnrolls.map((e) => e.exam);
  const classes = schoolEnrolls
    .map((e) => schoolContainerClassOf(e.exam.code))
    .filter((n): n is number => n !== null && n >= 8);
  const resume = inProgress && inProgress.mock.generatedBy !== "live-test" ? inProgress : null;
  const hasAnything = resume || last || weak.length > 0 || exams.length > 0 || classes.length > 0;
  if (!hasAnything) return null;

  return (
    <section aria-label={c.title} className="mt-8 rounded-2xl border border-ink-200 bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-bold text-ink-900">{c.title}</h2>
        <span className="flex items-center gap-3 text-xs text-ink-600">
          {streak && streak.current > 0 && <span>🔥 {c.streak.replace("{n}", String(streak.current))}</span>}
          <Link href="/dashboard" className="font-semibold text-saffron-700 hover:underline">{c.dashboard}</Link>
        </span>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {resume && (
          <Link href={`/mocks/${resume.mockId}`} className="rounded-xl border border-saffron-300 bg-saffron-50 p-3 hover:bg-saffron-100">
            <p className="text-xs font-semibold uppercase tracking-wider text-saffron-800">{c.resume}</p>
            <p className="mt-1 truncate text-sm font-medium text-ink-900">{resume.mock.title}</p>
          </Link>
        )}
        {last && (
          <Link href={`/attempts/${last.id}/results`} className="rounded-xl border border-ink-200 p-3 hover:bg-ink-50">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{c.last}</p>
            <p className="mt-1 truncate text-sm font-medium text-ink-900">
              {last.mock.title} · {formatDisplayScorePct(last.scorePct == null ? null : Number(last.scorePct))}
            </p>
          </Link>
        )}
        {exams.length > 0 && (
          <div className="rounded-xl border border-ink-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{c.exams}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {exams.map((e) => (
                <Link key={e.code} href={`/exams/${e.code}`} className="rounded-full border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-800 hover:border-saffron-400">
                  {e.shortName}
                </Link>
              ))}
            </div>
          </div>
        )}
        {classes.length > 0 && (
          <div className="rounded-xl border border-ink-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{c.cls}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[...new Set(classes)].map((n) => (
                <Link key={n} href={`/schooling/cbse/class-${n}`} className="rounded-full border border-ink-200 px-2.5 py-1 text-xs font-medium text-ink-800 hover:border-saffron-400">
                  Class {n}
                </Link>
              ))}
            </div>
          </div>
        )}
        {weak.length > 0 && (
          <div className="rounded-xl border border-ink-200 p-3 sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{c.weak}</p>
            <ul className="mt-2 space-y-1.5">
              {weak.map((w) => (
                <li key={`${w.exam.code}:${w.topic.code}`} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="text-ink-800">{w.topic.name} <span className="text-xs text-ink-500">· {w.exam.shortName}</span></span>
                  <Link
                    href={`/chat?examCode=${encodeURIComponent(w.exam.code)}&topicCode=${encodeURIComponent(w.topic.code)}&seed=${encodeURIComponent(`${w.topic.name} is one of my weakest topics for ${w.exam.shortName}. Explain the key ideas and give me one practice question.`)}`}
                    className="text-xs font-semibold text-saffron-700 hover:underline"
                  >
                    {c.askTutor} →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
