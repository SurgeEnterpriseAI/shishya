// "This mock is being rebuilt" (26 Sep 2026). Shown instead of the gate, the
// choice or the player when the paper a mock can serve is empty or under
// MIN_SERVED_QUESTIONS (src/lib/served-paper.ts): the bank answer check has
// withdrawn most of its questions and nothing honest is left to start.
// Nothing is created — no attempt, no enrolment. Server component.
//
// 26 Sep 2026 (review fix): when the student already has an attempt
// IN_PROGRESS on this mock (`attempt` set — one started before the paper was
// persisted, on a mock the answer check has since cut under the minimum),
// the notice is not a dead end: it carries the same two exits the expired
// gate has — submit the answers saved on questions that passed the check
// (/submit grades that same list) when there are any, and discard — in the
// MockRebuildingAttempt island. Otherwise the attempt could be neither
// finished nor cleared, and the dashboard's "still in progress" card kept
// sending the student here (93 such attempts on the day, 88 with answers).

import Link from "next/link";
import { Header } from "@/components/Header";
import { fillTemplate } from "@/lib/i18n";
import type { ServedPaperCopy } from "@/lib/served-paper";
import { MockRebuildingAttempt } from "./MockRebuildingAttempt";

export function MockRebuilding({
  title,
  examCode,
  examShort,
  copy,
  attempt = null,
}: {
  title: string;
  examCode: string;
  examShort: string;
  copy: ServedPaperCopy;
  /** The student's IN_PROGRESS attempt on this mock, if any: its id, the
   *  owner (for the player's localStorage mirror key) and how many answers
   *  it holds on questions of the paper submit would grade. */
  attempt?: { id: string; userId: string; answered: number } | null;
}) {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-6 sm:py-10">
        <div className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 p-5 text-center sm:p-6">
          <p className="text-xs font-medium text-ink-600">{title}</p>
          <h1 className="mt-2 text-lg font-bold text-ink-900">{copy.rebuildTitle}</h1>
          <p className="mt-2 text-sm text-ink-700">{fillTemplate(copy.rebuildBody, { exam: examShort })}</p>
          {attempt && (
            <MockRebuildingAttempt
              attemptId={attempt.id}
              userId={attempt.userId}
              answered={attempt.answered}
              examCode={examCode}
              copy={{
                line: fillTemplate(attempt.answered > 0 ? copy.rebuildAttemptAnswered : copy.rebuildAttemptEmpty, {
                  answered: attempt.answered,
                }),
                submit: fillTemplate(copy.rebuildSubmit, { answered: attempt.answered }),
                discard: copy.rebuildDiscard,
                busy: copy.rebuildBusy,
              }}
            />
          )}
          <Link
            href={`/exams/${encodeURIComponent(examCode)}`}
            className="btn-primary mt-5 inline-block text-center"
          >
            {fillTemplate(copy.rebuildBack, { exam: examShort })}
          </Link>
        </div>
      </section>
    </main>
  );
}
