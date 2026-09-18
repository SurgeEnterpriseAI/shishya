// ExamsTodayStrip — homepage "Exams today" strip (13 Sep 2026). Server
// component, zero client JS.
//
// Audit (11 Sep 2026): the homepage had no element for exams being held
// today — the exam calendar lives in a desktop-only right rail, so a phone
// visitor on NDA / CDS / SBI PO day saw nothing about it.
//
// What it shows (selection is pickExamsStrip in src/lib/exam-checklist.ts,
// unit-tested):
//   • today: every ANNOUNCED exam day (tier official or reported — cited on
//     the conducting body's site, or on a secondary source) whose IST day
//     is today, each linking its hub; once the first shift has plausibly
//     started (the row's own timing, else noon; always from 18:00 IST) the
//     prompt is "how was it?" — the hub carries the poll on announced days
//   • no exam today: the announced exam days of the next 7 days, each with
//     its hub link and the fact-based checklist
//   • expected (estimated) exam days never appear; a day with nothing
//     announced renders nothing at all
//
// One indexed date-range read, cached 5 minutes under the "exam-dates" tag
// (the tracker cron already revalidates it). The cache key carries the IST
// day, so the window rolls over at midnight IST.

import Link from "next/link";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { istDay } from "@/lib/exam-week";
import { pickExamsStrip, type StripRowInput } from "@/lib/exam-checklist";
import { getT } from "@/lib/i18n-server";
import { fillHome, homeStripCopy } from "@/lib/home-strip-copy";

const DAY_MS = 86_400_000;

const loadStripRows = unstable_cache(
  async (todayIst: string): Promise<StripRowInput[]> => {
    const start = new Date(`${todayIst}T00:00:00.000Z`);
    const rows = await prisma.examImportantDate.findMany({
      where: {
        archivedAt: null,
        kind: { equals: "EXAM", mode: "insensitive" },
        // "official" confidence is the announced flag; the display tier
        // (official vs reported) is derived from the cited domain below.
        confidence: { equals: "official", mode: "insensitive" },
        // One day either side: stored instants are midnight-UTC of the IST
        // day by convention, but the selection re-checks the IST day.
        date: { gte: new Date(start.getTime() - DAY_MS), lt: new Date(start.getTime() + 9 * DAY_MS) },
        exam: { active: true, category: { not: "SCHOOL_BOARD" } },
      },
      orderBy: { date: "asc" },
      take: 120,
      select: {
        id: true,
        label: true,
        date: true,
        kind: true,
        confidence: true,
        url: true,
        source: true,
        notes: true,
        exam: { select: { code: true, shortName: true, eligibility: { select: { officialUrl: true } } } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      examCode: r.exam.code,
      examShort: r.exam.shortName,
      label: r.label,
      date: r.date.toISOString(),
      kind: r.kind,
      confidence: r.confidence,
      url: r.url,
      source: r.source,
      notes: r.notes,
      officialUrl: r.exam.eligibility?.officialUrl ?? null,
    }));
  },
  ["home-exams-today-v1"],
  { revalidate: 300, tags: ["exam-dates"] },
);

export async function ExamsTodayStrip() {
  // 16 Sep 2026: the strip follows the reader's language on the / twins.
  // "Announced dates only · every date with its source tier" is the honesty
  // line here and it is translated with the same force.
  const { locale } = await getT();
  const C = homeStripCopy(locale);
  const now = new Date();
  const rows = await loadStripRows(istDay(now)).catch((err) => {
    console.error("[shishya/ExamsTodayStrip] load failed:", err);
    return [] as StripRowInput[];
  });
  const strip = pickExamsStrip(rows, now);
  if (strip.mode === "none") return null;
  const today = strip.mode === "today";
  const pill =
    "shrink-0 rounded-full border border-saffron-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-saffron-800 hover:bg-saffron-100";

  return (
    <section
      aria-label={today ? C.examsToday : C.examsThisWeek}
      className="mb-5 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 px-4 py-3 shadow-sm"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <p className="text-xs font-bold uppercase tracking-wider text-saffron-800">
          🎯 {today ? C.examsToday : C.examsThisWeek}
        </p>
        <p className="text-[11px] text-ink-500">{C.announcedOnly}</p>
      </div>
      <ul className="mt-1.5 divide-y divide-saffron-200/70">
        {strip.items.map((i) => (
          <li key={i.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1.5 text-sm">
            <Link href={`/exams/${i.examCode}`} className="font-bold text-ink-900 hover:text-saffron-800">
              {i.examShort}
            </Link>
            <span className="min-w-0 flex-1 text-ink-700">
              {i.label} · {i.dated}
              {!today && <span className="text-ink-500"> · {i.daysTo === 1 ? C.tomorrow : fillHome(C.inDays, { n: i.daysTo })}</span>}
            </span>
            {today && i.pollOpen ? (
              <Link href={`/exams/${i.examCode}`} className={pill}>
                {C.pollPill}
              </Link>
            ) : (
              <Link href={`/exams/${i.examCode}/checklist`} className={pill}>
                📋 {today ? C.checklistToday : C.checklistWeek} →
              </Link>
            )}
          </li>
        ))}
      </ul>
      {strip.more > 0 && (
        <Link href="/exam-calendar" className="mt-1 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800">
          {fillHome(C.moreOnCalendar, { n: strip.more })}
        </Link>
      )}
    </section>
  );
}
