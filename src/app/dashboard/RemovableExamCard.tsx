"use client";

// One card of the dashboard's "Your exams" list, with a small "Remove"
// control (7 Oct 2026, inbox fix B5: a student asked on 20 Sep how to remove
// an exam they don't need — nothing let them). Remove asks once ("Your past
// mocks and scores stay"), then DELETE /api/me/exams/[code] turns the
// student's own enrolment off; the card then says so and offers Undo (POST,
// the same row back on). The page is not refreshed: the card would vanish
// with its Undo. The rest of the dashboard follows on the next visit.
// Words and the call: src/lib/remove-exam.ts. The server passes the copy for
// the page's locale, so there is no language flash.

import { useId, useState, type ReactNode } from "react";
import { setExamOnList, withExam, type RemoveExamCopy } from "@/lib/remove-exam";

type Phase = "idle" | "confirm" | "removing" | "removed" | "restoring";

export function RemovableExamCard({
  examCode,
  examShort,
  copy,
  children,
}: {
  examCode: string;
  examShort: string;
  copy: RemoveExamCopy;
  /** The card's usual content (name, Continue / Syllabus links). */
  children: ReactNode;
}) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const askId = useId();

  async function remove() {
    setPhase("removing");
    setError(null);
    if (await setExamOnList(examCode, false)) setPhase("removed");
    else {
      setPhase("confirm");
      setError(copy.failed);
    }
  }

  async function undo() {
    setPhase("restoring");
    setError(null);
    if (await setExamOnList(examCode, true)) setPhase("idle");
    else {
      setPhase("removed");
      setError(copy.undoFailed);
    }
  }

  if (phase === "removed" || phase === "restoring") {
    return (
      <div role="status">
        <p id={`${askId}-done`} className="text-sm text-ink-700">{withExam(copy.removed, examShort)}</p>
        <button
          type="button"
          // The "Yes, remove" button that had focus is gone: focus moves here,
          // and the line above is read with it.
          autoFocus
          aria-describedby={`${askId}-done`}
          onClick={undo}
          disabled={phase === "restoring"}
          className="mt-3 text-xs font-semibold text-saffron-700 underline-offset-2 hover:underline disabled:opacity-60"
        >
          {phase === "restoring" ? copy.undoing : copy.undo}
        </button>
        {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
      </div>
    );
  }

  return (
    <>
      {children}
      {phase === "idle" ? (
        <button
          type="button"
          onClick={() => setPhase("confirm")}
          aria-label={withExam(copy.removeAria, examShort)}
          className="mt-3 text-xs text-ink-500 underline-offset-2 hover:text-ink-700 hover:underline"
        >
          {copy.remove}
        </button>
      ) : (
        <div className="mt-3 rounded-md border border-ink-200 bg-ink-50 p-3">
          <p id={askId} className="text-xs text-ink-700">{withExam(copy.confirm, examShort)}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={remove}
              disabled={phase === "removing"}
              className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {phase === "removing" ? copy.working : copy.yes}
            </button>
            <button
              type="button"
              // Focus lands on the safe choice when the question opens, and a
              // screen reader reads the question with it.
              autoFocus
              aria-describedby={askId}
              onClick={() => {
                setPhase("idle");
                setError(null);
              }}
              disabled={phase === "removing"}
              className="rounded-md border border-ink-300 bg-white px-3 py-1 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-60"
            >
              {copy.keep}
            </button>
          </div>
          {error && (
            <p role="alert" className="mt-2 text-xs text-rose-700">
              {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
