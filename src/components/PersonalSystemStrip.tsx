// Homepage explainer for the personal layer — contextual, static, calm.
// Placed right before the "Pick your exam" ask: proof (stats) → alive
// (grinders) → what YOU personally get → the ask. Anonymous visitors
// clicking through land on login with a callback — the funnel is the
// explanation.

import Link from "next/link";

const TILES = [
  {
    icon: "📊",
    title: "Your daily status report",
    body: "Exactly where you stand — strong areas, weak areas, days to exam — updated every day, downloadable as PDF.",
    href: "/me/report",
  },
  {
    icon: "📚",
    title: "A study pack made for you",
    body: "Built fresh each day from YOUR weakest topics: notes, memory tricks and practice questions with answers at the back.",
    href: "/me/report",
  },
  {
    icon: "📈",
    title: "Week-vs-week progress",
    body: "What improved, what slipped, and the two things to change next week — computed from your real attempts.",
    href: "/me/report",
  },
  {
    icon: "🤝",
    title: "A coach — and real mentors",
    body: "A free day-by-day plan that re-plans itself whenever you return, and a human who cleared your exam when you want one.",
    href: "/coach",
  },
];

export function PersonalSystemStrip() {
  return (
    <section className="mt-10">
      <p className="text-center text-xs font-semibold uppercase tracking-wider text-saffron-700">
        Built in, free, switches on when you sign in
      </p>
      <h2 className="mt-1 text-center text-xl font-bold text-ink-900">
        Not just tests — a personal preparation system
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {TILES.map((t) => (
          <Link
            key={t.title}
            href={t.href}
            className="rounded-xl border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
          >
            <p className="text-xl" aria-hidden>{t.icon}</p>
            <p className="mt-1 text-sm font-semibold text-ink-900">{t.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-ink-600">{t.body}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
