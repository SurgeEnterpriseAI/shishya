// One exam named by a section page (26 Sep 2026, group D): a link to its
// hub when the code is in the live catalogue (src/lib/live-exam-codes.ts),
// otherwise the same chip as plain text — never a link that 404s.

import Link from "next/link";
import { examCodeLabel, examHubHref } from "@/lib/section-seo";

export function ExamChip({
  code,
  live,
  label,
  className,
  plainClassName,
  suffix = "",
}: {
  code: string;
  live: ReadonlyMap<string, string>;
  /** Defaults to the live shortName, else the code with spaces. */
  label?: string;
  className: string;
  /** Class for the plain label (defaults to className). */
  plainClassName?: string;
  /** Appended to linked chips only (e.g. " →"). */
  suffix?: string;
}) {
  const href = examHubHref(code, live);
  const text = label ?? live.get(code) ?? examCodeLabel(code);
  if (!href) return <span className={plainClassName ?? className}>{text}</span>;
  return (
    <Link href={href} className={className}>
      {text}
      {suffix}
    </Link>
  );
}
