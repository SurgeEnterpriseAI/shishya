"use client";

// "Full paper or warm up first?" (25 Sep 2026) — shown INSTEAD of starting
// the attempt when a student has just come back from Google sign-in
// (?from=signin) to a paper-length mock with nothing in progress (the rule is
// shouldOfferShortOrFull in src/lib/mock-gate.ts). September: of 41 first
// attempts started on load after /login, 54% finished and 20% left at 0
// answers; the hub's short diagnostic finishes 84-87%.
//
//   Full  → the same mock URL without from=signin (router.replace), where the
//           page starts the attempt exactly as before; a reload resumes it.
//   Short → the hub's own diagnostic: POST /api/mocks with WARMUP_REQUEST
//           (what StartMockButton's ?start=diagnostic auto-start sends),
//           then router.push to the new mock (as StartMockButton does). A
//           reload there resumes the warm-up, never this choice.
//           25 Sep 2026 (review): it was router.replace, which dropped this
//           page from history — after the warm-up nothing led back to the
//           paper the student signed in for (the results page links to no
//           other mock), and Back went to Google's sign-in pages. Now Back
//           from the warm-up (or from its result, which replaces the player)
//           lands here again; WARMUP_RETURN_KEY lets this page say so.
// Nothing is created until a button is pressed; the clock starts with the
// attempt. Beacons: mock-choice-view (once per visit; returned: true when
// coming Back from the warm-up), mock-choice-full, mock-choice-short.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fillTemplate } from "@/lib/i18n";
import { ctaBeacon } from "@/lib/cta-beacon";
import {
  WARMUP_QUESTION_COUNT,
  WARMUP_REQUEST,
  WARMUP_RETURN_KEY,
  WARMUP_TIMER_MIN,
  isWarmupReturn,
} from "@/lib/mock-gate";
import type { MockGateCopy } from "@/lib/mock-gate-copy";
import type { MockStartCopy } from "@/lib/quiz-entry-copy";

export function ShortOrFullChoice({
  mockId,
  title,
  examCode,
  examShort,
  questionCount,
  durationMin,
  fullHref,
  copy,
  errCopy,
}: {
  mockId: string;
  title: string;
  examCode: string;
  examShort: string;
  questionCount: number;
  durationMin: number;
  /** mockPathAfterChoice(): /mocks/{id} + utm, never from=signin. */
  fullHref: string;
  copy: MockGateCopy;
  errCopy: MockStartCopy;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "full" | "short">(null);
  const [err, setErr] = useState<string | null>(null);
  const [returned, setReturned] = useState(false);
  const viewSent = useRef(false);
  const beaconProps = { examCode, mockId, n: questionCount };

  useEffect(() => {
    if (viewSent.current) return;
    viewSent.current = true;
    let back = false;
    try {
      back = isWarmupReturn(window.sessionStorage.getItem(WARMUP_RETURN_KEY), mockId);
    } catch {
      /* storage blocked: first-visit wording, beacon without the flag */
    }
    if (back) setReturned(true);
    ctaBeacon("mock-choice-view", back ? { ...beaconProps, returned: true } : beaconProps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A page restored from the back/forward cache keeps its last state; after
  // the Back-from-warm-up return the buttons must not stay on "Starting…".
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  function startFull() {
    if (busy) return;
    setErr(null);
    setBusy("full");
    ctaBeacon("mock-choice-full", returned ? { ...beaconProps, returned: true } : beaconProps);
    try {
      window.sessionStorage.removeItem(WARMUP_RETURN_KEY);
    } catch {
      /* best-effort */
    }
    router.replace(fullHref);
  }

  async function startShort() {
    if (busy) return;
    setErr(null);
    setBusy("short");
    ctaBeacon("mock-choice-short", returned ? { ...beaconProps, returned: true } : beaconProps);
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, request: WARMUP_REQUEST }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.mock?.id) {
        setErr(typeof data?.error === "string" ? data.error : errCopy.errStart);
        setBusy(null);
        return;
      }
      try {
        window.sessionStorage.setItem(WARMUP_RETURN_KEY, mockId);
      } catch {
        /* best-effort: Back still returns here, just without the "still here" line */
      }
      router.push(`/mocks/${encodeURIComponent(data.mock.id)}`);
    } catch {
      setErr(errCopy.errNetwork);
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl rounded-xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
        <Link href={`/exams/${examCode}`} className="hover:text-saffron-800">
          {fillTemplate(copy.kicker, { exam: examShort })}
        </Link>
      </p>
      <h1 className="mt-1 line-clamp-3 text-lg font-bold leading-snug text-ink-900 sm:text-xl">{title}</h1>
      <p className="mt-3 text-base font-semibold text-ink-900">{copy.choiceHeading}</p>
      <p className="mt-1 text-sm text-ink-600">{returned ? copy.choiceBackLine : copy.choiceLine}</p>

      <button
        type="button"
        onClick={startFull}
        disabled={busy !== null}
        className="btn-primary mt-4 w-full text-center disabled:opacity-60"
      >
        {busy === "full" ? copy.choiceStarting : fillTemplate(copy.choiceFull, { n: questionCount, min: durationMin })}
      </button>

      <button
        type="button"
        onClick={startShort}
        disabled={busy !== null}
        className="mt-3 w-full rounded-lg border border-saffron-300 bg-saffron-50 px-4 py-3 text-sm font-semibold text-saffron-800 transition-colors hover:bg-saffron-100 disabled:opacity-60"
      >
        {busy === "short"
          ? copy.choiceStarting
          : fillTemplate(copy.choiceShort, { n: WARMUP_QUESTION_COUNT, min: WARMUP_TIMER_MIN })}
      </button>
      <p className="mt-1.5 text-xs text-ink-500">
        {fillTemplate(copy.choiceShortNote, { n: WARMUP_QUESTION_COUNT, exam: examShort })}
      </p>
      {err && (
        <p role="alert" className="mt-2 text-xs text-rose-700">
          {err}
        </p>
      )}
    </div>
  );
}
