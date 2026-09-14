"use client";

// Click-time guard for long pre-built mocks (PYQs, full-length SME
// mocks). Catches first-time users before they walk into a 60-min /
// 100-Q wall and bounce.
//
// Behaviour:
//   - If the user already has a submitted attempt on this exam OR the
//     mock has <=20 questions, the button is just a Link — no modal.
//   - Otherwise the click opens a small dialog with two paths:
//       (a) "Take a 10-Q warmup with Shishya AI" → /chat?examCode=...
//           seeded with a "Quiz me" prompt the tutor turns into a
//           warmup using start_adaptive_quiz.
//       (b) "Start the full mock anyway" → /mocks/[id]
//
// Why click-time and not page-time: the warmup button needs to fire
// the user's intent to start *something*. Showing this before they've
// clicked anything just adds friction. Showing it AFTER they've
// landed in /mocks/[id] is too late (the timer starts).
//
// 15 Sep 2026: the dialog called every set over 20 questions "a full-length
// timed mock", including PYQ-pattern years holding 20 of a 150-question
// paper. It says "full-length" only when the set holds at least 80% of the
// real paper (the year page's own rule).

import Link from "next/link";
import { useState } from "react";

interface Props {
  mockId: string;
  examCode: string;
  examShortName: string;
  totalQuestions: number;
  /** The real paper's question count; 0 or absent when unknown. */
  paperQuestions?: number;
  durationMin: number;
  hasSubmittedHistory: boolean;
  label: string;
}

export function StartFullMockButton({
  mockId,
  examCode,
  examShortName,
  totalQuestions,
  paperQuestions = 0,
  durationMin,
  hasSubmittedHistory,
  label,
}: Props) {
  const [open, setOpen] = useState(false);
  const fullLength = !(paperQuestions > 0) || totalQuestions >= 0.8 * paperQuestions;

  // Bypass the modal when the user knows what they're doing (already
  // taken at least one mock on this exam) or the mock is short.
  const skipGuard = hasSubmittedHistory || totalQuestions <= 20 || durationMin <= 25;
  if (skipGuard) {
    return (
      <Link href={`/mocks/${mockId}`} prefetch={false} className="btn-primary">
        {label}
      </Link>
    );
  }

  // The "Quiz me" seed below is the same wording the tutor recognises
  // to fire its start_adaptive_quiz tool — keep it stable so the chat
  // route lands on a warmup, not a generic conversation.
  const warmupSeed = `Quiz me on ${examShortName} — start with 10 easy questions, then build a full mock around my weak topics.`;
  const warmupHref = `/chat?examCode=${examCode}&seed=${encodeURIComponent(warmupSeed)}`;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="full-mock-confirm-title"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close"
            className="absolute inset-0 bg-ink-900/55"
          />
          <div className="relative w-full max-w-md rounded-xl border border-saffron-200 bg-white p-6 shadow-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
              Heads up
            </p>
            <h3 id="full-mock-confirm-title" className="mt-1 text-lg font-semibold text-ink-900">
              {totalQuestions} questions · {durationMin} minutes
            </h3>
            <p className="mt-2 text-sm text-ink-700">
              {fullLength
                ? "This is a full-length timed mock."
                : `This is a ${totalQuestions}-question timed set in the pattern of the ${paperQuestions}-question paper.`}{" "}
              The clock starts when you click Start and you can&apos;t pause it.
            </p>
            <p className="mt-2 text-sm text-ink-700">
              If you&apos;ve never taken a {examShortName} mock here before, try a quick
              10-question warmup first — Shishya picks your weakest topic,
              adapts to you, and gets you ready for the full mock.
            </p>

            <div className="mt-5 flex flex-col gap-2">
              <Link
                href={warmupHref}
                prefetch={false}
                className="btn-primary block w-full text-center"
              >
                Take a 10-Q warmup first →
              </Link>
              <Link
                href={`/mocks/${mockId}`}
                prefetch={false}
                className="btn-secondary block w-full text-center"
              >
                {fullLength ? `Start the full ${totalQuestions}-Q mock anyway` : `Start the ${totalQuestions}-question set anyway`}
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-1 text-xs text-ink-500 hover:text-ink-800"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
