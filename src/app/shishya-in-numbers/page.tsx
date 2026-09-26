// /shishya-in-numbers — every public number about Shishya, each with its
// definition and date (27 Sep 2026).
//
// Why: founder ask (27 Sep 2026) — make Shishya the platform the market
// slowly recognises, honestly. The press, institutions and investors divide
// vanity counts; what they can quote is a number with its definition. So the
// numbers that show whether students stay come first (came back within 7
// days, days 8-30, 30-day actives, mocks per active account), then where new
// students arrive from, then the week-by-week table, the all-time counters
// (getLiveCounts, definitions word for word), coverage and what the answer
// check found. No number is typed: every one is read from the DB when the
// page is built (hourly), through src/lib/public-numbers.ts.
//
// Privacy (founder rule): aggregates only; no printed group under K_MIN
// (src/lib/public-stats.ts); team accounts left out and never counted aloud;
// dates only, no times. Server component: no cookies(), headers() or locale
// reads, so it stays statically renderable with hourly ISR.

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { JsonLd, breadcrumbLd } from "@/components/JsonLd";
import { DefinedNumber, NOT_COMPUTED } from "@/components/numbers/DefinedNumber";
import { StatTable, type StatColumn } from "@/components/numbers/StatTable";
import { istDayLabel } from "@/lib/iso-week";
import { loadPublicNumbers } from "@/lib/public-numbers";
import { DEFINITIONS, NUMBERS_PATH, NUMBERS_URL, answerCheckMethod, citationLine } from "@/lib/public-numbers-rules";
import {
  CONTEXT_MD_PATH,
  SOURCE_LIMITS,
  answerCheckRows,
  cohortTable,
  counterCell,
  headlineTiles,
  numbersDatasetLd,
  numbersFaqFor,
  sourceView,
  sparkLabel,
  weeklyDigits,
  weeklyView,
} from "@/lib/public-numbers-view";
import { formatInt, publishable } from "@/lib/public-stats";

export const revalidate = 3600;

const TITLE = "Shishya in numbers — usage, return rates and answer checks, with definitions";
const DESCRIPTION =
  "Numbers about Shishya, a free study platform for students in India, each with its definition and date: sign-ups, mocks and AI tutor questions by week, how many students come back, where they arrive from, and what the automated answer check found.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: NUMBERS_URL },
  openGraph: { title: TITLE, description: DESCRIPTION, url: NUMBERS_URL, siteName: "Shishya", locale: "en_IN", type: "website" },
};

const JUMPS: [string, string][] = [
  ["come-back", "Do students come back?"],
  ["sources", "Where they arrive from"],
  ["weekly", "Week by week"],
  ["counters", "All-time counters"],
  ["coverage", "What Shishya covers"],
  ["answer-check", "Answer check"],
  ["questions", "Questions"],
  ["cite", "How to cite"],
];

const H2 = "mt-10 scroll-mt-20 text-lg font-semibold text-ink-900";
const LINK = "text-saffron-700 underline";

function Unavailable() {
  return <p className="mt-3 text-sm italic text-ink-500">This part {NOT_COMPUTED}; it is recomputed every hour.</p>;
}

export default async function ShishyaInNumbersPage() {
  const p = await loadPublicNumbers();
  const tiles = headlineTiles(p);
  const faq = numbersFaqFor(p);
  const jsonLd = [
    numbersDatasetLd(p),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
    breadcrumbLd([["Shishya in numbers", NUMBERS_PATH]]),
  ];
  const wv = p.weekly ? weeklyView(p.weekly) : null;
  const weeklyColumns: StatColumn[] = wv
    ? [
        { key: "week", label: "Week" },
        ...wv.columns.map((c) => ({
          key: c.key,
          label: c.label,
          align: "right" as const,
          spark: wv.series[c.key],
          sparkLabel: sparkLabel(c.label, p.weekly?.weeks.period ?? "", wv.series[c.key], weeklyDigits(c.key)),
        })),
      ]
    : [];

  return (
    <main className="min-h-screen bg-ink-50/40">
      <JsonLd data={jsonLd} />
      <Header />
      <section className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
        <h1 className="text-2xl font-bold text-ink-900">Shishya in numbers</h1>
        <p className="mt-3">
          Every number on this page is counted from Shishya&apos;s database when the page is built, with its definition;
          computed on <b>{istDayLabel(p.today)}</b> (IST), refreshed hourly. Only complete weeks (Monday to Sunday, IST) are{" "}
          {/* 27 Sep 2026 (integrator): the k rule covers people and what they did,
              not supply counts (exams, papers, chapters), which can be small. */}
          shown, and no count of people, or of what they did, is printed below twenty (counts of exams, papers and
          chapters can be smaller). How content is made and checked is in the{" "}
          <Link href="/editorial-policy" className={LINK}>editorial policy</Link>; facts and contacts for writing about Shishya
          are in the <Link href="/press" className={LINK}>press kit</Link>.
        </p>
        <nav aria-label="On this page" className="mt-4">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {JUMPS.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className={LINK}>{label}</a>
              </li>
            ))}
          </ul>
        </nav>

        {/* 1. Do students come back? */}
        <h2 id="come-back" className={H2}>Do students come back?</h2>
        <p className="mt-2">
          The numbers that say whether Shishya is useful: how many new accounts are used again, and how much practice an
          active account does. They count signed-in activity only, so they are floors.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {tiles.map((t) => (
            <DefinedNumber key={t.id} id={t.id} label={t.label} value={t.value} sub={t.sub} definition={t.definition} period={t.period} asOf={t.asOf} />
          ))}
        </div>
        {p.cohorts ? (
          <>
            <h3 className="mt-6 font-semibold text-ink-900">{p.cohorts.weekly.label}</h3>
            <StatTable
              caption={`Sign-up weeks ${p.cohorts.weekly.period.replace(/^sign-up weeks /, "")}, computed ${istDayLabel(p.cohorts.weekly.asOf)}`}
              columns={[
                { key: "week", label: "Sign-up week" },
                { key: "signups", label: "Sign-ups", align: "right" },
                { key: "returned", label: "Came back within 7 days", align: "right" },
                { key: "share", label: "Share", align: "right" },
              ]}
              rows={cohortTable(p.cohorts).map((r) => ({
                key: r.week,
                cells: { week: r.label, signups: r.signups, returned: r.returned, share: r.share },
              }))}
              footnotes={[DEFINITIONS.cohortWeekly]}
            />
          </>
        ) : (
          <Unavailable />
        )}

        {/* 2. Where new students arrive from */}
        <h2 id="sources" className={H2}>Where new students arrive from</h2>
        {[p.signupSources, p.newPeople].map((s, i) =>
          s ? (
            <div key={s.id} id={s.id} className="scroll-mt-20">
              <h3 className="mt-5 font-semibold text-ink-900">
                {s.label} <span className="font-normal text-ink-500">({s.period})</span>
              </h3>
              {(() => {
                const v = sourceView(s);
                return (
                  <>
                    <StatTable
                      caption={`${s.label}, ${s.period}; groups under twenty merged`}
                      columns={[
                        { key: "source", label: "Source" },
                        { key: "n", label: i === 0 ? "Sign-ups" : "New people", align: "right" },
                        { key: "share", label: "Share", align: "right" },
                      ]}
                      rows={v.rows.map((r) => ({ key: r.key, cells: { source: r.label, n: r.n, share: r.share } }))}
                    />
                    <ul className="mt-2 space-y-1 text-xs">
                      {v.named ? <li>Named source (a tag or referrer said where the first visit came from): <b>{v.named}</b></li> : null}
                      {v.ai ? <li>From AI assistants: <b>{v.ai}</b></li> : null}
                    </ul>
                    <p className="mt-2 text-xs leading-relaxed text-ink-600">{s.definition}</p>
                  </>
                );
              })()}
            </div>
          ) : (
            <Unavailable key={i} />
          ),
        )}
        <p className="mt-4 text-xs leading-relaxed text-ink-600">{SOURCE_LIMITS}</p>

        {/* 3. Week by week */}
        <h2 id="weekly" className={H2}>Week by week</h2>
        {p.weekly && wv ? (
          <>
            <p className="mt-2 text-xs text-ink-600">{p.weekly.weeks.definition}</p>
            <StatTable
              caption={`Weeks ${p.weekly.weeks.period}, computed ${istDayLabel(p.weekly.weeks.asOf)}`}
              columns={weeklyColumns}
              rows={wv.rows.map((r) => ({ key: r.week, cells: { week: r.label, ...r.cells } }))}
              footnotes={[...wv.columns.map((c) => `${c.label}: ${c.definition}`), ...wv.footnotes]}
            />
          </>
        ) : (
          <Unavailable />
        )}

        {/* 4. All-time counters */}
        <h2 id="counters" className={H2}>All-time counters</h2>
        <p className="mt-2">
          The site&apos;s running totals, each with the definition the counter itself uses, word for word. The live numbers
          (people active now, today&apos;s totals) are on the <Link href="/" className={LINK}>home page strip</Link>; an hourly
          page cannot show them truthfully.
        </p>
        {p.counters ? (
          <div className="mt-3 overflow-hidden rounded-lg border border-ink-200 bg-white">
            <table className="w-full border-collapse text-xs sm:text-sm">
              <caption className="px-3 pt-2 text-left text-xs text-ink-500">All time, computed {istDayLabel(p.counters.asOf)}</caption>
              <thead>
                <tr className="border-b border-ink-200">
                  <th scope="col" className="px-3 py-2 text-left font-semibold text-ink-800">Counter and definition</th>
                  <th scope="col" className="px-3 py-2 text-right font-semibold text-ink-800">Value</th>
                </tr>
              </thead>
              <tbody>
                {p.counters.value.map((c) => (
                  <tr key={c.key} id={`counter-${c.key}`} className="border-b border-ink-100 align-top last:border-0">
                    <th scope="row" className="px-3 py-2 text-left font-normal">
                      <span className="font-medium text-ink-800">{c.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-relaxed text-ink-500">{c.definition}</span>
                    </th>
                    <td className="whitespace-nowrap px-3 py-2 text-right font-semibold tabular-nums text-ink-900">{counterCell(c)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Unavailable />
        )}

        {/* 5. Coverage */}
        <h2 id="coverage" className={H2}>What Shishya covers</h2>
        {p.coverage ? (
          <>
            <p className="mt-2 text-xs text-ink-600">
              {p.coverage.definition} Computed {istDayLabel(p.coverage.asOf)}.
            </p>
            {p.coverage.value.map((g) => (
              <div key={g.title}>
                <h3 className="mt-5 font-semibold text-ink-900">{g.title}</h3>
                <ul className="mt-2 divide-y divide-ink-100 rounded-lg border border-ink-200 bg-white">
                  {g.rows.map((r) => (
                    <li key={r.id} id={r.id} className="scroll-mt-20 px-3 py-2">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium text-ink-800">{r.label}</span>
                        <span className="whitespace-nowrap font-semibold tabular-nums text-ink-900">{formatInt(r.value)}</span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-ink-500">
                        {r.detail ? <span className="text-ink-600">{r.detail}. </span> : null}
                        {r.definition}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        ) : (
          <Unavailable />
        )}

        {/* 6. Answer check */}
        <h2 id="answer-check" className={H2}>Answer check</h2>
        <p className="mt-2">{answerCheckMethod()}</p>
        <p className="mt-2 text-xs text-ink-600">
          How content is produced is in the <Link href="/editorial-policy" className={LINK}>editorial policy</Link>. The{" "}
          <Link href="/verification" className={LINK}>verification page</Link> covers something else: the fact badges on college
          and school-board pages.
        </p>
        {p.answerCheck ? (
          (() => {
            const rows = answerCheckRows(p.answerCheck);
            return (
              <>
                <StatTable
                  caption={`Every check so far, computed ${istDayLabel(p.answerCheck.asOf)}`}
                  columns={[
                    { key: "what", label: "Outcome" },
                    { key: "n", label: "Questions", align: "right" },
                  ]}
                  rows={rows.outcomes.map((r, i) => ({
                    key: `o${i}`,
                    cells: { what: r.note ? `${r.label} (${r.note})` : r.label, n: r.value },
                  }))}
                  footnotes={[p.answerCheck.definition, DEFINITIONS.uncheckedLive]}
                />
                {rows.liveBefore.length ? (
                  <StatTable
                    caption="Among questions that were live before the check"
                    columns={[
                      { key: "what", label: "Outcome" },
                      { key: "n", label: "Questions", align: "right" },
                      { key: "share", label: "Share", align: "right" },
                    ]}
                    rows={rows.liveBefore.map((r, i) => ({ key: `l${i}`, cells: { what: r.label, n: r.value, share: r.note ?? "" } }))}
                  />
                ) : null}
              </>
            );
          })()
        ) : (
          <Unavailable />
        )}
        {p.reports && publishable(p.reports.value.den) && publishable(p.reports.value.num) ? (
          <p id={p.reports.id} className="mt-3 scroll-mt-20 text-xs text-ink-600">
            Student question reports, all time: <b>{formatInt(p.reports.value.den)}</b> received,{" "}
            <b>{formatInt(p.reports.value.num)}</b> closed. {p.reports.definition}
          </p>
        ) : null}

        {/* 7. Questions (FAQPage) */}
        <h2 id="questions" className={H2}>Questions</h2>
        <dl className="mt-2 space-y-4">
          {faq.map(([q, a]) => (
            <div key={q}>
              <dt className="font-semibold text-ink-900">{q}</dt>
              <dd className="mt-1">{a}</dd>
            </div>
          ))}
        </dl>

        {/* 8. How to cite */}
        <h2 id="cite" className={H2}>How to cite</h2>
        <p className="mt-2 rounded-lg border border-ink-200 bg-white px-3 py-2 font-mono text-xs text-ink-800">{citationLine(p.today)}</p>
        <p className="mt-3 text-xs">
          The same numbers as markdown: <a href={CONTEXT_MD_PATH} className={LINK}>context.md</a> ·{" "}
          <Link href="/pulse" className={LINK}>Shishya Pulse</Link> (weekly data note) ·{" "}
          <Link href="/press" className={LINK}>Press kit</Link> · <Link href="/about" className={LINK}>About Shishya</Link>
        </p>
      </section>
    </main>
  );
}
