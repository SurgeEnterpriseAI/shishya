// "Shishya at a glance" — content-depth numbers as a full-width band of
// tiles below the finder card. The trust/attraction figures a new
// visitor needs (how much is here, how many languages, that it's free),
// complementing the LIVE activity strip which shows real-time traffic.

import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { homeStripCopy } from "@/lib/home-strip-copy";

interface Stat {
  value: string;
  label: string;
  icon: string;
}

export function PortalStatsBand({
  examCount,
  questions,
  notes,
  locale,
}: {
  examCount: string; // live DB count, or "170+" when the count is unavailable
  questions: string; // pre-rounded, e.g. "30,000+"
  notes: string; // e.g. "3,700+"
  /** The home page's language (getT().locale). Defaults to English. */
  locale?: string;
}) {
  // 16 Sep 2026: labels in the reader's language on the / twins. The numbers
  // themselves stay as the page computed them — nothing is rounded up here.
  const C = homeStripCopy(locale);
  const stats: Stat[] = [
    { icon: "🎯", value: examCount, label: C.statExams },
    { icon: "📝", value: questions, label: C.statQuestions },
    { icon: "📖", value: notes, label: C.statNotes },
    { icon: "🗣️", value: String(INDIAN_LANGUAGE_COUNT), label: C.statLanguages },
    { icon: "🆓", value: "₹0", label: C.statFree },
  ];
  return (
    <div>
      <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        {C.statsKicker}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex flex-col items-center rounded-xl border border-ink-200 bg-white/70 px-2 py-3 text-center shadow-sm"
          >
            <span className="text-lg" aria-hidden>{s.icon}</span>
            <span className="mt-0.5 text-xl font-bold tabular-nums text-saffron-700 sm:text-2xl">{s.value}</span>
            <span className="mt-0.5 text-[11px] font-medium leading-tight text-ink-600">{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
