// The exam hub's panel for an exam with NO practice questions (27 Sep 2026)
// — it takes the place of the action panel, the Mock Tests section and the
// empty Previous-papers / Rank sections (src/app/exams/[code]/page.tsx). It
// renders the pure model from src/lib/no-practice-copy.ts noPracticePanel():
// the official facts with their sources, the dates with their tier words, one
// plain line that there are no practice questions yet, the AI tutor line and
// links to related exams that have practice. No DB, no client code.

import Link from "next/link";
import type { NoPracticePanelModel } from "@/lib/no-practice-copy";

export function NoPracticeExamPanel({ model }: { model: NoPracticePanelModel }) {
  return (
    <section id="official-facts" aria-labelledby="official-facts-heading" className="mt-8 scroll-mt-20 rounded-md border border-ink-200 bg-white p-6">
      <h2 id="official-facts-heading" className="text-base font-semibold text-ink-900">
        {model.title}
      </h2>
      <p className="mt-1 text-xs text-ink-500">{model.note}</p>
      <dl className="mt-4 space-y-3 text-sm">
        {model.facts.map((f) => (
          <div key={f.label}>
            <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">{f.label}</dt>
            <dd className="mt-0.5 text-ink-800">
              {f.text && <span>{f.text} </span>}
              {f.href && f.hrefLabel && (
                <a href={f.href} target="_blank" rel="nofollow noopener noreferrer" className="break-words font-medium text-emerald-700 hover:underline">
                  {f.hrefLabel}
                </a>
              )}
              {f.readOn && <span className="ml-1 text-xs text-ink-500">({f.readOn})</span>}
            </dd>
          </div>
        ))}
        <div>
          <dt className="text-xs font-semibold uppercase tracking-wide text-ink-500">{model.datesLabel}</dt>
          <dd className="mt-0.5 text-ink-800">
            {model.dates.length > 0 ? (
              <ul className="space-y-1">
                {model.dates.map((d) => (
                  <li key={d.text}>
                    {d.href ? (
                      <a href={d.href} target="_blank" rel="nofollow noopener noreferrer" className="hover:underline">
                        {d.text} ↗
                      </a>
                    ) : (
                      d.text
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{model.noDates}</p>
            )}
            <Link href={model.trackerHref} className="mt-1 inline-block text-xs font-semibold text-saffron-700 hover:underline">
              {model.trackerLabel}
            </Link>
          </dd>
        </div>
      </dl>
      <p className="mt-5 text-sm text-ink-700">{model.line}</p>
      <div className="mt-3 flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-700">{model.tutor}</p>
        <Link rel="nofollow" href={model.tutorHref} className="btn-secondary !py-2 !px-4 text-xs sm:text-sm">
          {model.tutorCta}
        </Link>
      </div>
      {model.relatedTitle && model.related.length > 0 && (
        <div className="mt-5 border-t border-ink-100 pt-4">
          <h3 className="text-sm font-semibold text-ink-900">{model.relatedTitle}</h3>
          <ul className="mt-2 flex flex-wrap gap-2 text-sm">
            {model.related.map((r) => (
              <li key={r.href}>
                <Link href={r.href} className="inline-block rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 font-medium text-saffron-800 hover:bg-saffron-100">
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
