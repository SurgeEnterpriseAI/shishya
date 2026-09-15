// "More {state} government exams →" on a state exam's high-crawl pages
// (15 Sep 2026, SEO/AEO wave 2).
//
// Crawler logs for 1–15 Sep: topic and news pages took most AI and Bing
// crawling (tens of thousands of hits) while the state pages were barely
// read. This link on topic, news and syllabus pages of state exams sends
// that crawl to /exams/state/{slug}. It renders nothing for national exams.
// The label arrives translated from the page (exam.state.more), so the
// component carries no literal text.

import Link from "next/link";
import { stateInfo, stateSlug } from "@/lib/state-info";

export function StateExamsLink({
  state,
  label,
  className = "mt-2 text-sm",
}: {
  state: string | null | undefined;
  /** Template with {state}, e.g. t("exam.state.more"). */
  label: string;
  className?: string;
}) {
  const st = stateInfo(state);
  if (!st) return null;
  return (
    <p className={className}>
      <Link href={`/exams/state/${stateSlug(st.code)}`} prefetch={false} className="font-medium text-saffron-700 hover:underline">
        {label.replace("{state}", st.name)}
      </Link>
    </p>
  );
}
