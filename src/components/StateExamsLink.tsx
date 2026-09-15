// "More {state} government exams →" on a state exam's high-crawl pages
// (15 Sep 2026, SEO/AEO waves 2–3).
//
// Crawler logs for 1–15 Sep: topic and news pages took most AI and Bing
// crawling (tens of thousands of hits) while the state pages were barely
// read. This link on the topic, news, syllabus, tracker, cutoff, estimator,
// PYQ, guide, tricks and archive pages of state exams sends that crawl to
// /exams/state/{slug}. It renders nothing for national exams.
// The label arrives translated from the page (exam.state.more), so the
// component carries no literal text. The state name follows the reader's
// language where Shishya has it in that script — Hindi for every state,
// Telugu for Andhra Pradesh and Telangana — and is English otherwise.

import Link from "next/link";
import { stateInfo, stateSlug } from "@/lib/state-info";

export function StateExamsLink({
  state,
  label,
  locale,
  className = "mt-2 text-sm",
}: {
  state: string | null | undefined;
  /** Template with {state}, e.g. t("exam.state.more"). */
  label: string;
  /** The body's language (getT().locale). */
  locale?: string;
  className?: string;
}) {
  const st = stateInfo(state);
  if (!st) return null;
  // One quoted literal per line: the twin test's English heuristic reads two
  // literals on one line as a hard-coded sentence.
  const teluguState = st.languages[0] === "TE";
  let name = st.name;
  if (locale === "hi") name = st.hindiName;
  else if (locale === "te" && teluguState) name = st.nativeName;
  return (
    <p className={className}>
      <Link href={`/exams/state/${stateSlug(st.code)}`} prefetch={false} className="font-medium text-saffron-700 hover:underline">
        {label.replace("{state}", name)}
      </Link>
    </p>
  );
}
