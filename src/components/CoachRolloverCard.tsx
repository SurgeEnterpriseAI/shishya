// CoachRolloverCard — "{exam} is done. Roll your plan to the next exam?"
// (Exam Week Mode wave 2, play 12). Presentational, no hooks, so it
// renders inside the server-side dashboard MissionCard and the client-side
// CoachIntake alike. Strings arrive translated (ew.coach.postexam.* /
// ew.coach.overlap) from the mounting page.
//
//   • with `href`  → the CTA is a link (dashboard: to /coach?next=1&from=X)
//   • without      → the mounting form carries the CTA (coach intake)

import Link from "next/link";

export interface CoachRolloverLabels {
  title: string;
  body: string;
  cta: string;
  /** ew.coach.overlap already filled — omitted when the two syllabi share nothing. */
  overlap?: string | null;
}

export function CoachRolloverCard({ labels, href }: { labels: CoachRolloverLabels; href?: string }) {
  return (
    <div className="rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 px-4 py-3">
      <p className="text-sm font-bold text-ink-900">🏁 {labels.title}</p>
      <p className="mt-1 text-xs text-ink-700">{labels.body}</p>
      {labels.overlap && <p className="mt-1 text-xs font-medium text-emerald-800">🔁 {labels.overlap}</p>}
      {href && (
        <Link
          href={href}
          className="mt-2 inline-block rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-saffron-600"
        >
          {labels.cta} →
        </Link>
      )}
    </div>
  );
}
