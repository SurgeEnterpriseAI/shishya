// The body of one Shishya Pulse week (27 Sep 2026), shared by /pulse (the
// latest week) and /pulse/{yyyy}-w{ww}. Server component, no client JS, no
// cookie or header read. Every value arrives gated (src/lib/pulse-rules.ts);
// this file only lays it out — plain tables, each with its definition,
// phone-first at 360 px (wide tables scroll inside their own box).

import Link from "next/link";
import type { ReactNode } from "react";
import { PulseSparkline } from "@/components/pulse/PulseSparkline";
import {
  PULSE_K,
  PULSE_MIN_PEOPLE,
  PULSE_TOPIC_MIN_PEOPLE,
  istDayLabel,
  parsePulseSlug,
  pulseWeeksLabel,
} from "@/lib/pulse-rules";
import {
  PULSE_DEFINITIONS,
  PULSE_UNAVAILABLE,
  countText,
  examHref,
  joinLabels,
  pulseCitation,
  topicHref,
  type PulseView,
} from "@/lib/pulse-view";

const TABLE = "mt-3 w-full min-w-[18rem] border-collapse text-left text-sm";
const TH = "border-b border-ink-200 py-2 pr-3 text-xs font-semibold text-ink-600";
const THN = `${TH} text-right`;
const TD = "border-b border-ink-100 py-2 pr-3 align-top text-ink-800";
const TDN = `${TD} text-right tabular-nums`;
const LINK = "text-saffron-700 underline underline-offset-2 hover:text-saffron-800";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** "Mon 21 Sep" of an IST calendar day. */
function shortDay(isoDay: string): string {
  const d = new Date(`${isoDay}T00:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${istDayLabel(isoDay).replace(/ \d{4}$/, "")}`;
}

/** "27 Jul–20 Sep 2026" for a sparkline series (oldest first). */
function seriesRange(series: readonly { slug: string; label: string }[]): string {
  const first = parsePulseSlug(series[0].slug);
  const last = parsePulseSlug(series[series.length - 1].slug);
  return first && last ? pulseWeeksLabel(first, last) : `${series[0].label} to ${series[series.length - 1].label}`;
}

function Section({ id, title, definition, children }: { id: string; title: string; definition: ReactNode; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="mt-10 scroll-mt-20">
      <h2 id={`${id}-h`} className="text-lg font-semibold text-ink-900">
        {title}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-ink-500">{definition}</p>
      {children}
    </section>
  );
}

function Scroll({ children }: { children: ReactNode }) {
  return <div className="-mx-1 overflow-x-auto px-1">{children}</div>;
}

function Unavailable() {
  return <p className="mt-3 rounded-md bg-ink-50 px-3 py-2 text-sm text-ink-600">{PULSE_UNAVAILABLE}</p>;
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm text-ink-600">{children}</p>;
}

export function PulseReport({ view }: { view: PulseView }) {
  const wl = view.weekLine;
  const labels = wl?.series.map((p) => p.label) ?? [];
  return (
    <div className="text-sm leading-relaxed text-ink-700">
      <Section id="week" title="The week in numbers" definition={PULSE_DEFINITIONS.weekLine}>
        {wl ? (
          <Scroll>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    <span className="sr-only">Measure</span>
                  </th>
                  <th scope="col" className={THN}>
                    This week
                  </th>
                  <th scope="col" className={THN}>
                    The week before
                  </th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Mocks taken", wl.mocks, wl.prevMocks, wl.series.map((p) => p.mocks)],
                    ["Questions to the AI tutor", wl.tutor, wl.prevTutor, wl.series.map((p) => p.tutor)],
                    ["Sign-ups", wl.signups, wl.prevSignups, wl.series.map((p) => p.signups)],
                  ] as const
                ).map(([name, cur, prev, series]) => (
                  <tr key={name}>
                    <th scope="row" className={`${TD} font-medium`}>
                      {name}
                      <PulseSparkline name={name} values={series} labels={labels} />
                    </th>
                    <td className={TDN}>{countText(cur)}</td>
                    <td className={TDN}>{countText(prev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        ) : (
          <Unavailable />
        )}
        {wl && wl.series.length > 1 ? (
          <p className="mt-2 text-[11px] text-ink-500">
            The small lines show the {wl.series.length} weeks {seriesRange(wl.series)}; each line&apos;s values are in its description for screen
            readers. No line is drawn when a week had fewer than {PULSE_K}.
          </p>
        ) : null}
      </Section>

      <Section id="mocks" title="Most-taken mocks this week" definition={PULSE_DEFINITIONS.examMocks}>
        {view.examMocks == null ? (
          <Unavailable />
        ) : view.examMocks.length === 0 ? (
          <Empty>
            No exam reached {PULSE_K} mocks from {PULSE_MIN_PEOPLE} different students this week.
          </Empty>
        ) : (
          <Scroll>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Exam
                  </th>
                  <th scope="col" className={THN}>
                    Mocks this week
                  </th>
                  <th scope="col" className={THN}>
                    The week before
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.examMocks.map((r) => (
                  <tr key={r.code}>
                    <th scope="row" className={`${TD} font-medium`}>
                      <Link href={examHref(r.code)} className={LINK}>
                        {r.name}
                      </Link>
                    </th>
                    <td className={TDN}>{countText(r.mocks)}</td>
                    <td className={TDN}>{r.prevMocks == null ? <span title="Did not meet the rule that week">—</span> : countText(r.prevMocks)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
        {view.examMocks && view.examMocks.some((r) => r.prevMocks == null) ? (
          <p className="mt-1 text-[11px] text-ink-500">
            — : that exam did not reach {PULSE_K} mocks from {PULSE_MIN_PEOPLE} different students the week before.
          </p>
        ) : null}

        <h3 className="mt-6 text-sm font-semibold text-ink-900">By kind of exam</h3>
        <p className="mt-1 text-xs text-ink-500">{PULSE_DEFINITIONS.kindMocks}</p>
        {view.kindMocks == null ? (
          <Unavailable />
        ) : view.kindMocks.length === 0 ? (
          <Empty>Not shown this week: the groups were too small to print separately.</Empty>
        ) : (
          <Scroll>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Kind of exam
                  </th>
                  <th scope="col" className={THN}>
                    Mocks
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.kindMocks.map((g) => (
                  <tr key={g.keys.join("+")}>
                    <th scope="row" className={`${TD} font-medium`}>
                      {joinLabels(g.labels)}
                      {g.merged ? <span className="ml-1 text-xs font-normal text-ink-500">(merged)</span> : null}
                    </th>
                    <td className={TDN}>{countText(g.n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </Section>

      <Section id="topics" title={`Most-practised topics, ${view.windowLabel}`} definition={PULSE_DEFINITIONS.practised}>
        {view.practisedTopics == null ? (
          <Unavailable />
        ) : view.practisedTopics.length === 0 ? (
          <Empty>
            No topic was answered by {PULSE_TOPIC_MIN_PEOPLE} different students in these weeks.
          </Empty>
        ) : (
          <Scroll>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Topic
                  </th>
                  <th scope="col" className={TH}>
                    Exam
                  </th>
                  <th scope="col" className={THN}>
                    Answers
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.practisedTopics.map((t) => (
                  <tr key={`${t.examCode}/${t.topicCode}`}>
                    <th scope="row" className={`${TD} font-medium`}>
                      <Link href={topicHref(t.examCode, t.topicCode)} className={LINK}>
                        {t.topicName}
                      </Link>
                    </th>
                    <td className={TD}>{t.examName}</td>
                    <td className={TDN}>{countText(t.answers)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </Section>

      <Section
        id="hardest"
        title={`Hardest topics, ${view.windowLabel}`}
        definition={
          <>
            {PULSE_DEFINITIONS.hardest} <b className="font-medium text-ink-600">{PULSE_DEFINITIONS.hardestCaveat}</b>
          </>
        }
      >
        {view.hardestTopics == null ? (
          <Unavailable />
        ) : view.hardestTopics.length === 0 ? (
          <Empty>{PULSE_DEFINITIONS.hardestEmpty}</Empty>
        ) : (
          <Scroll>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Topic
                  </th>
                  <th scope="col" className={TH}>
                    Exam
                  </th>
                  <th scope="col" className={THN}>
                    Answers
                  </th>
                  <th scope="col" className={THN}>
                    Share correct
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.hardestTopics.map((t) => (
                  <tr key={`${t.examCode}/${t.topicCode}`}>
                    <th scope="row" className={`${TD} font-medium`}>
                      <Link href={topicHref(t.examCode, t.topicCode)} className={LINK}>
                        {t.topicName}
                      </Link>
                    </th>
                    <td className={TD}>{t.examName}</td>
                    <td className={TDN}>{countText(t.answers)}</td>
                    <td className={TDN}>{(t.sharePct ?? 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </Section>

      <Section id="dates" title="Official exam dates this week" definition={PULSE_DEFINITIONS.officialDates}>
        {view.officialDates == null ? (
          <Unavailable />
        ) : view.officialDates.length === 0 ? (
          <Empty>No official-tier date fell in this week.</Empty>
        ) : (
          <Scroll>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Day
                  </th>
                  <th scope="col" className={TH}>
                    Exam and what
                  </th>
                  <th scope="col" className={TH}>
                    Sources
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.officialDates.map((d) => (
                  <tr key={`${d.examCode}|${d.day}|${d.label}`}>
                    <td className={`${TD} whitespace-nowrap tabular-nums`}>{shortDay(d.day)}</td>
                    <td className={TD}>
                      <Link href={examHref(d.examCode)} className="font-medium text-ink-900 hover:underline">
                        {d.examName}
                      </Link>
                      <span className="block text-ink-700">{d.label}</span>
                    </td>
                    <td className={`${TD} whitespace-nowrap`}>
                      <a href={d.url} className={LINK} target="_blank" rel="noopener noreferrer">
                        Official notice
                      </a>
                      <br />
                      <Link href={`${examHref(d.examCode)}/updates`} className={LINK}>
                        Tracker
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
        <p className="mt-2 text-xs text-ink-500">
          Reported and expected dates are on each exam&apos;s tracker and in the{" "}
          <Link href="/exam-calendar" className={LINK}>
            exam calendar
          </Link>
          .
        </p>
      </Section>

      <Section id="tutor" title={`What students asked the AI tutor about, ${view.windowLabel}`} definition={PULSE_DEFINITIONS.tutor}>
        {view.tutorByExam == null ? (
          <Unavailable />
        ) : view.tutorByExam.length === 0 ? (
          <Empty>
            No exam reached {PULSE_K} questions from {PULSE_MIN_PEOPLE} different people in these weeks.
          </Empty>
        ) : (
          <Scroll>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Exam the tutor was set to
                  </th>
                  <th scope="col" className={THN}>
                    Questions
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.tutorByExam.map((t) => (
                  <tr key={t.code ?? t.label}>
                    <th scope="row" className={`${TD} font-medium`}>
                      {t.code ? (
                        <Link href={examHref(t.code)} className={LINK}>
                          {t.label}
                        </Link>
                      ) : (
                        t.label
                      )}
                    </th>
                    <td className={TDN}>{countText(t.questions)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </Section>

      <Section id="sections" title="Sign-ups by section of their first page" definition={PULSE_DEFINITIONS.sections}>
        {view.signupSections == null ? (
          <Unavailable />
        ) : view.signupSections.onlySection ? (
          <Empty>
            No section other than {view.signupSections.onlySection.toLowerCase()} reached {PULSE_K} sign-ups this week.
          </Empty>
        ) : view.signupSections.rows.length === 0 ? (
          <Empty>Fewer than {PULSE_K} sign-ups this week.</Empty>
        ) : (
          <Scroll>
            <table className={TABLE}>
              <thead>
                <tr>
                  <th scope="col" className={TH}>
                    Section of the first page
                  </th>
                  <th scope="col" className={THN}>
                    Sign-ups
                  </th>
                </tr>
              </thead>
              <tbody>
                {view.signupSections.rows.map((g) => (
                  <tr key={g.keys.join("+")}>
                    <th scope="row" className={`${TD} font-medium`}>
                      {joinLabels(g.labels)}
                      {g.merged ? <span className="ml-1 text-xs font-normal text-ink-500">(merged)</span> : null}
                    </th>
                    <td className={TDN}>{countText(g.n)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Scroll>
        )}
      </Section>

      <section id="method" aria-labelledby="method-h" className="mt-10 rounded-lg border border-ink-100 bg-white/70 p-4">
        <h2 id="method-h" className="text-base font-semibold text-ink-900">
          Method and how to cite
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-ink-600">
          {PULSE_DEFINITIONS.method} Computed on {istDayLabel(view.computedDay)} (IST). Definitions of Shishya&apos;s other public numbers are on{" "}
          <Link href="/shishya-in-numbers" className={LINK}>
            Shishya in numbers
          </Link>
          ; how questions and dates are checked is in the{" "}
          <Link href="/editorial-policy" className={LINK}>
            editorial policy
          </Link>
          .
        </p>
        <p className="mt-3 text-xs text-ink-500">Cite as:</p>
        <p className="mt-1 break-words rounded bg-ink-50 px-2 py-1.5 font-mono text-[11px] text-ink-800">{pulseCitation(view.week, view.computedDay)}</p>
      </section>
    </div>
  );
}
