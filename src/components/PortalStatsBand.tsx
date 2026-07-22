// "Shishya at a glance" — content-depth numbers shown as a compact
// vertical panel beside the finder card (two-column hero). These are the
// trust/attraction figures a new visitor needs: how much is here, in how
// many languages, and that it's free — complementing the LIVE activity
// strip (which shows real-time traffic).

interface Stat {
  value: string;
  label: string;
  icon: string;
}

export function PortalStatsBand({
  examCount,
  questions,
  notes,
}: {
  examCount: number;
  questions: string; // pre-rounded, e.g. "30,000+"
  notes: string; // e.g. "3,700+"
}) {
  const stats: Stat[] = [
    { icon: "🎯", value: String(examCount), label: "Govt & entrance exams" },
    { icon: "📝", value: questions, label: "Practice questions" },
    { icon: "📖", value: notes, label: "Free study notes" },
    { icon: "🗣️", value: "22", label: "Indian languages" },
    { icon: "🆓", value: "₹0", label: "Always free" },
  ];
  return (
    <div className="flex h-full flex-col rounded-2xl border border-ink-200 bg-white/70 p-4 shadow-sm">
      <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-ink-400">
        Shishya at a glance
      </p>
      <ul className="mt-3 flex flex-1 flex-col justify-between gap-2.5">
        {stats.map((s) => (
          <li key={s.label} className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-saffron-50 text-base" aria-hidden>
              {s.icon}
            </span>
            <span className="flex min-w-0 items-baseline gap-1.5">
              <span className="text-lg font-bold tabular-nums text-saffron-700">{s.value}</span>
              <span className="truncate text-xs font-medium text-ink-600">{s.label}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
