// Left-side sticky rail showing the next ~30 exam events across all
// 163 exams, ordered chronologically. Mirrors the right-side
// DiscussionsSidebar layout: fixed panel on lg+, slide-in drawer with
// FAB on smaller screens. Pure server-side data (no polling — exam
// dates change at most once per day via the refresh-exam-data cron).
//
// Build marker v202605250030 — force Vercel to rebuild from latest
// source. The CLI deploys today were silently reusing a build cache
// that predated the IST-phase + inline-snippet commits; this tiny
// content change invalidates that cache.
//
// PHASE CHIPS — for any event close to the exam date we surface a
// small action link under the date row that takes the visitor to
// the right phase article (📋 Checklist / 🔴 Live / 📊 Reactions).
//
// Phase resolution is delegated to src/lib/exam-phase.ts so the
// sidebar UI and the refresh-phase-articles cron agree on which
// window an exam is in. Both use IST-aware calendar-day math —
// "exam over" flips Live → Reactions at 18:00 IST on exam day,
// not at midnight UTC.

import Link from "next/link";
import { resolvePhase, PHASE_SLUG } from "@/lib/exam-phase";
import type { ExamPhase } from "@prisma/client";

export interface UpcomingEvent {
  id: string;
  examCode: string;
  examShort: string;
  date: string; // ISO
  label: string;
  isExamDay: boolean;
  /**
   * 1-2 sentence preview from the matching phase article, server-
   * resolved alongside the phase. When present, the sidebar renders
   * this in place of the plain "Live" / "Checklist" / "Reactions"
   * chip text so the student sees the article's hook before clicking.
   * Null if the exam isn't in a phase window or the article doesn't
   * exist yet (cron hasn't generated one).
   */
  phaseSnippet?: string | null;
}

interface PhaseChip {
  phase: ExamPhase;
  slug: "checklist" | "live" | "reactions";
  icon: string;
  color: string;
  /** What to render as the chip's body text — snippet from the article when
   *  available, otherwise the static fallback teaser. */
  text: string;
  /** Where the chip click goes. Deep-links to the phase article ONLY when
   *  one actually exists (snippet present); otherwise routes to the exam
   *  overview page so the click never dead-ends on an empty phase shell. */
  href: string;
  /** True when a live phase article backs this chip. Drives the arrow
   *  (→ to the article vs. nothing for a plain overview link). */
  hasArticle: boolean;
}

// Phase metadata used for the inline preview row in the sidebar:
//   - `icon`      lives left, always visible (phase identifier at a glance)
//   - `fallback`  is the chip label shown when the article doesn't
//                 exist yet (cron hasn't generated a summary) — better
//                 than "🔴 Live →" pointing at an empty page, this
//                 hints at what they'll see if they click in early.
const PHASE_CHIP_META: Record<ExamPhase, { icon: string; color: string; fallback: string }> = {
  CHECKLIST: {
    icon: "📋",
    color: "bg-amber-100 text-amber-900",
    fallback: "Last-minute revision sheet — what to carry, topics to skim, time-table.",
  },
  LIVE: {
    icon: "🔴",
    color: "bg-rose-100 text-rose-900",
    fallback: "Live shift-by-shift difficulty + first answer-key trackers as they release.",
  },
  REACTIONS: {
    icon: "📊",
    color: "bg-sky-100 text-sky-900",
    fallback: "Student verdict, expected cutoff, answer-key analysis — refreshed every 2 h.",
  },
};

function phaseChipFor(event: UpcomingEvent): PhaseChip | null {
  // Only flag actual exam-day rows. "Application opens" etc. shouldn't
  // get phase chips even if they fall close to today's date.
  if (!event.isExamDay) return null;
  const phase = resolvePhase(new Date(event.date));
  if (!phase) return null;
  const meta = PHASE_CHIP_META[phase];
  const snippet = event.phaseSnippet?.trim();
  const hasArticle = Boolean(snippet);
  return {
    phase,
    slug: PHASE_SLUG[phase],
    icon: meta.icon,
    color: meta.color,
    // Prefer the live AI snippet (set by the 2-hour cron) — falls back
    // to the static teaser so the chip never reads as a bare label.
    text: snippet || meta.fallback,
    // Deep-link to the phase article only when one exists; otherwise the
    // phase page is an empty shell, so send the click to the exam
    // overview (always has content). This is what stops a tempting chip
    // from landing the student on a blank page.
    href: hasArticle
      ? `/exams/${event.examCode}/${PHASE_SLUG[phase]}`
      : `/exams/${event.examCode}`,
    hasArticle,
  };
}

export function UpcomingExamsSidebar({ events }: { events: UpcomingEvent[] }) {
  return (
    <aside
      className="fixed bottom-0 left-0 top-16 z-20 hidden w-80 flex-col border-r border-ink-200 bg-white shadow-sm lg:flex"
      aria-label="Upcoming exam dates"
    >
      <div className="flex items-start justify-between gap-2 border-b border-ink-200 bg-ink-50/40 px-4 py-3">
        <div>
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
            <span className="inline-block h-2 w-2 rounded-full bg-saffron-500" aria-hidden />
            Upcoming
          </p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-ink-900">
            Exam calendar
          </h3>
        </div>
        <Link
          href="/exams"
          className="shrink-0 rounded-md border border-ink-300 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:bg-ink-100"
        >
          All
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="flex-1 px-4 py-10 text-center">
          <p className="text-sm text-ink-500">No upcoming dates announced.</p>
        </div>
      ) : (
        <ul className="flex-1 divide-y divide-ink-100 overflow-y-auto">
          {events.map((e) => {
            const chip = phaseChipFor(e);
            return (
              <li key={e.id} className={e.isExamDay ? "bg-saffron-50/40" : ""}>
                {/* Outer Link wraps the title + date so the whole row
                    is clickable like before. Phase chip below is a
                    separate <Link> so its click doesn't navigate to
                    the generic exam landing — it goes to the phase
                    article instead. */}
                <Link
                  href={`/exams/${e.examCode}`}
                  className="block px-4 pt-3 transition-colors hover:bg-saffron-50/50"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-ink-900">
                      {e.examShort}
                    </p>
                    <span
                      className={`shrink-0 text-[11px] font-medium tabular-nums ${
                        e.isExamDay ? "text-saffron-800" : "text-ink-600"
                      }`}
                    >
                      {formatDate(e.date)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-ink-600">
                    {e.isExamDay && (
                      <span className="mr-1.5 rounded bg-saffron-200 px-1 py-0.5 text-[10px] font-medium text-saffron-900">
                        EXAM DAY
                      </span>
                    )}
                    {e.label}
                  </p>
                </Link>
                {chip && (
                  <Link
                    href={chip.href}
                    className={`mx-4 my-2 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-[11px] leading-snug ${chip.color} hover:brightness-95`}
                  >
                    <span aria-hidden className="shrink-0 leading-snug">{chip.icon}</span>
                    <span className="flex-1 line-clamp-3 font-medium">{chip.text}</span>
                    {chip.hasArticle && (
                      <span aria-hidden className="shrink-0 leading-snug">→</span>
                    )}
                  </Link>
                )}
                {!chip && <div className="h-2" />}
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-ink-200 bg-white px-4 py-3 text-center">
        <Link
          href="/exams"
          className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
        >
          Browse all exam dates →
        </Link>
      </div>
    </aside>
  );
}

/** Compact "16 May" / "16 May 26" style. Year only shown if not the current year. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const day = d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  if (d.getFullYear() === now.getFullYear()) return day;
  return `${day} ${String(d.getFullYear()).slice(2)}`;
}
