"use client";

// The start button for long pre-built mocks (PYQs, full-length SME mocks).
//
// 27 Sep 2026 (founder rule 1: no overlay or picker before content): the
// click-time "full mock or warm-up?" dialog is gone. The button is always a
// plain link to /mocks/[id]. Where the dialog used to open — no submitted
// attempt on this exam, and a set of more than 20 questions / 25 minutes —
// an optional text link under the button offers the 10-question warm-up
// (/chat?examCode=… seeded with the "Quiz me" prompt the tutor turns into a
// warm-up via start_adaptive_quiz). Nothing is asked before the paper.
//
// Language (16 Sep 2026): the link takes the year page's `locale` when it
// is passed and otherwise reads the shishya-lang cookie after mount. The
// warmup seed stays English because the tutor matches on its wording to
// fire start_adaptive_quiz.

import Link from "next/link";
import { useEffect, useState } from "react";
import { clientUiLocale, type CopyLocale } from "@/lib/ui-locale-copy";
import { fullMockCopy } from "@/lib/quiz-entry-copy";

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
  /** The page's locale when the server already has one (16 Sep 2026);
   *  without it the warm-up link reads the shishya-lang cookie after mount. */
  locale?: string;
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
  locale,
}: Props) {
  const [cookieLocale, setCookieLocale] = useState<CopyLocale>("en");
  useEffect(() => {
    if (locale == null) setCookieLocale(clientUiLocale());
  }, [locale]);
  const C = fullMockCopy(locale ?? cookieLocale);
  // Kept in the props for the caller; the dialog that used them is gone.
  void paperQuestions;

  // The warm-up link shows where the old dialog opened: a first-timer on
  // this exam facing a long set. Everyone else gets the button alone.
  const offerWarmup = !(hasSubmittedHistory || totalQuestions <= 20 || durationMin <= 25);
  const button = (
    <Link href={`/mocks/${mockId}`} prefetch={false} className="btn-primary">
      {label}
    </Link>
  );
  if (!offerWarmup) return button;

  // The "Quiz me" seed below is the same wording the tutor recognises
  // to fire its start_adaptive_quiz tool — keep it stable so the chat
  // route lands on a warmup, not a generic conversation.
  const warmupSeed = `Quiz me on ${examShortName} — start with 10 easy questions, then build a full mock around my weak topics.`;
  const warmupHref = `/chat?examCode=${examCode}&seed=${encodeURIComponent(warmupSeed)}`;

  return (
    <div className="flex flex-col items-stretch sm:items-end">
      {button}
      <Link href={warmupHref} prefetch={false} className="mt-2 block text-xs font-semibold text-saffron-700 hover:underline">
        {C.warmupCta}
      </Link>
    </div>
  );
}
