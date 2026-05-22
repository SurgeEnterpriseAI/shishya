// Renders the Eligibility / Cutoffs / Paper analysis / Salary sections
// on /exams/[code] from the deep-content data in src/data/exam-deep-content.ts.
//
// Each subsection is independently rendered — exams may have any subset
// of fields populated. The block as a whole is hidden when nothing is
// authored yet (parent should check hasDeepContent before rendering).
//
// Every figure carries an inline source citation. The point of this
// surface is to RANK for long-tail SEO queries — "SSC CGL eligibility
// 2025", "NEET UG cutoff general category", "IBPS PO salary in metro" —
// so the content has to be concrete, sourced, and Google-crawlable.

import type {
  Eligibility,
  CutoffTable,
  PaperAnalysis,
  SalaryBand,
  ExamDeepContent,
} from "@/data/exam-deep-content";

interface Props {
  content: ExamDeepContent;
  /** Short name used in section headings — e.g. "SSC CGL". */
  examShortName: string;
}

export function ExamDeepContentBlock({ content, examShortName }: Props) {
  const { eligibility, cutoffs, paperAnalysis, salaryBands } = content;
  return (
    <div className="mt-10 space-y-10">
      {eligibility && <EligibilitySection eligibility={eligibility} examShortName={examShortName} />}
      {cutoffs && cutoffs.length > 0 && (
        <CutoffSection tables={cutoffs} examShortName={examShortName} />
      )}
      {paperAnalysis && (
        <PaperAnalysisSection analysis={paperAnalysis} examShortName={examShortName} />
      )}
      {salaryBands && salaryBands.length > 0 && (
        <SalarySection bands={salaryBands} examShortName={examShortName} />
      )}
    </div>
  );
}

// ── Eligibility ────────────────────────────────────────────────────
function EligibilitySection({
  eligibility,
  examShortName,
}: {
  eligibility: Eligibility;
  examShortName: string;
}) {
  const ageLine =
    eligibility.ageMin != null && eligibility.ageMax != null
      ? `${eligibility.ageMin} – ${eligibility.ageMax} years (General)`
      : eligibility.ageMin != null
      ? `Minimum ${eligibility.ageMin} years`
      : eligibility.ageMax != null
      ? `Up to ${eligibility.ageMax} years (General)`
      : null;

  return (
    <section id="eligibility" className="scroll-mt-20">
      <h2 className="text-base font-semibold text-ink-800">{examShortName} eligibility</h2>
      <p className="mt-1 text-xs text-ink-500">
        Verified against the official notification.{" "}
        <a
          href={eligibility.source}
          target="_blank"
          rel="noopener noreferrer"
          className="text-saffron-700 underline"
        >
          Source ↗
        </a>{" "}
        · last reconciled {eligibility.verifiedAt}.
      </p>
      <div className="mt-3 rounded-md border border-ink-200 bg-white p-5">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[max-content_1fr]">
          {ageLine && (
            <>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Age</dt>
              <dd className="text-sm text-ink-800">
                {ageLine}
                {eligibility.ageNotes && (
                  <span className="mt-0.5 block text-xs text-ink-600">{eligibility.ageNotes}</span>
                )}
              </dd>
            </>
          )}
          <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Education</dt>
          <dd className="text-sm text-ink-800">
            {eligibility.education}
            {eligibility.educationDetails && eligibility.educationDetails.length > 0 && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-600">
                {eligibility.educationDetails.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
            )}
          </dd>
          {eligibility.attempts && (
            <>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Attempts</dt>
              <dd className="text-sm text-ink-800">{eligibility.attempts}</dd>
            </>
          )}
          {eligibility.nationality && (
            <>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Nationality
              </dt>
              <dd className="text-sm text-ink-800">{eligibility.nationality}</dd>
            </>
          )}
          {eligibility.specialConstraints && eligibility.specialConstraints.length > 0 && (
            <>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Other
              </dt>
              <dd className="text-sm text-ink-800">
                <ul className="list-disc space-y-1 pl-5 text-xs text-ink-700">
                  {eligibility.specialConstraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </dd>
            </>
          )}
          {eligibility.reservations && eligibility.reservations.length > 0 && (
            <>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Reservations
              </dt>
              <dd className="text-sm text-ink-800">
                <ul className="list-disc space-y-1 pl-5 text-xs text-ink-700">
                  {eligibility.reservations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </dd>
            </>
          )}
        </dl>
      </div>
    </section>
  );
}

// ── Cutoffs ────────────────────────────────────────────────────────
function CutoffSection({
  tables,
  examShortName,
}: {
  tables: CutoffTable[];
  examShortName: string;
}) {
  return (
    <section id="cutoffs" className="scroll-mt-20">
      <h2 className="text-base font-semibold text-ink-800">{examShortName} cutoffs</h2>
      <p className="mt-1 text-xs text-ink-500">
        Historical cutoffs are a guide, not a prediction. Use them to set a realistic target,
        not to predict next year&apos;s exact number.
      </p>
      <div className="mt-3 space-y-5">
        {tables.map((t, ti) => (
          <div key={ti} className="rounded-md border border-ink-200 bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink-900">{t.title}</h3>
              {t.outOf && (
                <span className="text-[11px] uppercase tracking-wider text-ink-500">
                  out of {t.outOf}
                </span>
              )}
            </div>
            {t.notes && <p className="mt-2 text-xs text-ink-600">{t.notes}</p>}
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-xs uppercase tracking-wider text-ink-500">
                    <th className="py-2 pr-3 font-medium">Year</th>
                    <th className="py-2 pr-3 font-medium">Category</th>
                    <th className="py-2 pr-3 font-medium">Cutoff</th>
                  </tr>
                </thead>
                <tbody>
                  {t.rows.map((r, ri) => (
                    <tr
                      key={ri}
                      className="border-b border-ink-100 last:border-b-0 hover:bg-ink-50/40"
                    >
                      <td className="py-2 pr-3 text-ink-700 tabular-nums">{r.year}</td>
                      <td className="py-2 pr-3 text-ink-800">{r.category}</td>
                      <td className="py-2 pr-3 font-medium text-ink-900 tabular-nums">
                        {r.cutoff}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-[11px] text-ink-500">
              Source:{" "}
              <a
                href={t.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-saffron-700 underline"
              >
                official ↗
              </a>{" "}
              · verified {t.verifiedAt}.
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Paper analysis ─────────────────────────────────────────────────
function PaperAnalysisSection({
  analysis,
  examShortName,
}: {
  analysis: PaperAnalysis;
  examShortName: string;
}) {
  // Group topics by subject for visual clarity.
  const grouped = new Map<string, typeof analysis.topics>();
  for (const t of analysis.topics) {
    if (!grouped.has(t.subject)) grouped.set(t.subject, []);
    grouped.get(t.subject)!.push(t);
  }

  return (
    <section id="paper-analysis" className="scroll-mt-20">
      <h2 className="text-base font-semibold text-ink-800">
        {examShortName} paper analysis — what actually got asked
      </h2>
      <p className="mt-1 text-xs text-ink-500">
        Topic-by-topic weightage averaged across {analysis.yearsAnalyzed} papers. Use this to
        decide where to invest study hours, not where to skim.{" "}
        <a
          href={analysis.source}
          target="_blank"
          rel="noopener noreferrer"
          className="text-saffron-700 underline"
        >
          Source ↗
        </a>{" "}
        · verified {analysis.verifiedAt}.
      </p>
      <div className="mt-3 rounded-md border border-ink-200 bg-white p-5">
        <div className="space-y-5">
          {Array.from(grouped.entries()).map(([subject, topics]) => {
            const subjectAvg = topics.reduce((s, t) => s + t.recentMarksAvg, 0);
            return (
              <div key={subject}>
                <div className="flex items-baseline justify-between">
                  <h3 className="text-sm font-semibold text-ink-900">{subject}</h3>
                  <p className="text-[11px] uppercase tracking-wider text-ink-500 tabular-nums">
                    {subjectAvg}/{analysis.totalMarks} marks avg
                  </p>
                </div>
                <ul className="mt-2 space-y-1.5">
                  {topics.map((t, i) => {
                    const pct = Math.round((t.recentMarksAvg / analysis.totalMarks) * 100);
                    return (
                      <li
                        key={i}
                        className="flex items-baseline justify-between gap-3 border-b border-ink-100 py-1.5 last:border-b-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-ink-800">{t.topic}</p>
                          {t.notes && <p className="text-[11px] text-ink-500">{t.notes}</p>}
                        </div>
                        <div className="flex shrink-0 items-baseline gap-3 text-xs text-ink-600 tabular-nums">
                          <span>~{t.recentMarksAvg} marks</span>
                          <span className="text-ink-400">({pct}%)</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
        {analysis.takeaways.length > 0 && (
          <div className="mt-5 rounded-md border border-saffron-200 bg-saffron-50/50 p-4">
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">
              Takeaways for prep planning
            </h3>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-xs text-ink-700">
              {analysis.takeaways.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

// ── Salary ─────────────────────────────────────────────────────────
function SalarySection({
  bands,
  examShortName,
}: {
  bands: SalaryBand[];
  examShortName: string;
}) {
  return (
    <section id="salary" className="scroll-mt-20">
      <h2 className="text-base font-semibold text-ink-800">{examShortName} salary after selection</h2>
      <p className="mt-1 text-xs text-ink-500">
        Approximate starting gross at an X-class (metro) posting. Actual pay depends on
        post, city, year of joining and prevailing DA.
      </p>
      <ul className="mt-3 space-y-3">
        {bands.map((b, i) => (
          <li key={i} className="rounded-md border border-ink-200 bg-white p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-ink-900">{b.postName}</h3>
              {b.payLevel && (
                <span className="rounded-full border border-ink-200 px-2 py-0.5 text-[10px] font-medium text-ink-600">
                  {b.payLevel}
                </span>
              )}
            </div>
            <dl className="mt-3 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]">
              {b.basicPay && (
                <>
                  <dt className="text-xs uppercase tracking-wider text-ink-500">Basic pay</dt>
                  <dd className="text-ink-800 tabular-nums">{b.basicPay}</dd>
                </>
              )}
              <dt className="text-xs uppercase tracking-wider text-ink-500">Gross monthly</dt>
              <dd className="font-medium text-ink-900 tabular-nums">{b.grossPayApprox}</dd>
              {b.perks && b.perks.length > 0 && (
                <>
                  <dt className="text-xs uppercase tracking-wider text-ink-500">Perks</dt>
                  <dd>
                    <ul className="list-disc space-y-1 pl-5 text-xs text-ink-700">
                      {b.perks.map((p, pi) => (
                        <li key={pi}>{p}</li>
                      ))}
                    </ul>
                  </dd>
                </>
              )}
            </dl>
            <p className="mt-3 text-[11px] text-ink-500">
              Source:{" "}
              <a
                href={b.source}
                target="_blank"
                rel="noopener noreferrer"
                className="text-saffron-700 underline"
              >
                official ↗
              </a>{" "}
              · verified {b.verifiedAt}.
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
