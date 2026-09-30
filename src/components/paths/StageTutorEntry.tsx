// The tutor entry on the life-stage pages (30 Sep 2026, P1 build 1, spec §5 —
// agent B).
//
// A seeded link into the general tutor, /chat?general=1&seed=…, built by
// src/lib/paths/stage-tutor.ts (a question in the student's own voice, no
// facts). P1 adds no chat code; chat-seed-once stops a re-send. The line
// under the button says what the tutor is: it explains, and dates and rules
// are confirmed on the official site.
//
// Children (founder rule: nothing for Class 1-7, no tutor for a stage that
// may include Class 1-8 readers): renders nothing when the stage may include
// children ("school", and /career-map's Class 1-8 and Class 9-10 rows),
// when the builder returned null (a Class 1-7 context, an exam or career
// node), or when the href is not the seeded general-tutor shape. Server
// component: the link is plain HTML, no JS needed.

import Link from "next/link";
import type { PathStage } from "@/data/paths";
import { stageTutorLabels } from "@/lib/paths/stage-tutor";
import { pathViewCopy } from "./view-copy";

/** The only link shape this entry renders (stage-tutor.ts generalTutorHref). */
export const STAGE_TUTOR_HREF_PREFIX = "/chat?general=1&seed=";

export function StageTutorEntry({
  stage,
  href,
  locale,
  heading = true,
}: {
  stage: Pick<PathStage, "mayIncludeChildren"> | null | undefined;
  href: string | null | undefined;
  locale?: string | null;
  /** false = the compact form (a /career-map stage card). */
  heading?: boolean;
}) {
  if (!stage || stage.mayIncludeChildren) return null;
  if (!href || !href.startsWith(STAGE_TUTOR_HREF_PREFIX)) return null;
  const { button, line } = stageTutorLabels(locale);
  if (!heading) {
    return (
      <p className="mt-3 text-xs text-ink-600" data-stage-tutor="compact">
        <Link href={href} prefetch={false} className="font-semibold text-saffron-700 underline hover:text-saffron-800">
          {button} →
        </Link>{" "}
        <span className="text-ink-500">{line}</span>
      </p>
    );
  }
  return (
    <aside aria-label={button} className="mt-10 rounded-2xl border border-saffron-200 bg-saffron-50/50 p-5" data-stage-tutor="box">
      <p className="text-sm font-semibold text-ink-900">{pathViewCopy(locale).tutorHeading}</p>
      <Link href={href} prefetch={false} className="btn-primary mt-3 w-full sm:w-auto">
        {button}
      </Link>
      <p className="mt-2 text-xs text-ink-600">{line}</p>
    </aside>
  );
}
