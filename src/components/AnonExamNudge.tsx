"use client";

// Anonymous-visitor nudge for public SEO pages (cutoff, and reusable for
// tricks/guide later). Never gates content — the page stays fully
// readable; this only OFFERS the next step at a high-intent moment
// ("will my score clear the cutoff?").
//
// 11 Sep 2026 signup-leak audit: this offered a login wall
// (/login?callbackUrl=/exams/CODE) — shown 699×, clicked 31× in 30 days,
// on a page that bounces 81% (Bing landers converted at 0%). It now
// offers the thing the lander actually wants: 10 real questions, scored
// in the browser against the category cutoffs on this page, no sign-in
// (/exams/CODE/quiz?n=10&from=cutoff — the existing anonymous quiz). The
// sign-in ask moves to the quiz's result screen, after value.
//
// 18 Sep 2026: the quiz stays the main offer, but with no sign-in link at
// all the cutoff -> /login path went from 1.2 people a day to 0. A quiet
// second link under the button brings the direct route back (its own
// beacon: {surface}-signin-click). It returns to the exam page, where the
// mocks are.
//
// Session is checked CLIENT-side so the host page keeps its ISR caching —
// no server cookie read. Since 13 Sep 2026 that is the shared, hint-gated
// probe (src/lib/session-hint.ts): a guest without the `shishya_in` hint
// resolves at once with NO /api/auth/session request. Renders nothing until
// the visitor is known not to be signed in (signed-in users never see it,
// with no flash). Instrumented with shown/click beacons per surface.

import { useEffect, useRef, useState } from "react";
import { fetchSignedIn } from "@/lib/session-hint";

function beacon(cta: string, extra?: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({
          kind: "CTA_CLICKED",
          path: typeof location !== "undefined" ? location.pathname : "/",
          props: { cta, ...extra },
        })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}

// Language (checked 16 Sep 2026): the keys exist and the only caller uses
// them — /exams/[code]/cutoff passes t("cutoff.nudge.body") and
// t("cutoff.nudge.cta") (en, hi, te in src/lib/i18n.ts) through `body` and
// `cta`, exactly as `headline` is passed. The two constants below are the
// last-resort fallback for a caller that passes neither; they are never what
// a hi/te reader sees on /cutoff today. The earlier note here claimed this
// component was English-only, which it no longer is.
const QUIZ_BODY = "Answer 10 questions in this exam's pattern and see your score next to these category cutoffs — no account needed.";
const QUIZ_CTA = "Try 10 questions — see where you stand, no sign-in →";
const SIGN_IN_LABEL = "or sign in free for full mocks with your scores saved →";

export function AnonExamNudge({
  examCode,
  headline,
  body,
  cta,
  signInLabel,
  surface,
}: {
  examCode: string;
  /** Bold lead-in, e.g. "Will your score clear the SSC CGL cutoff?" */
  headline: string;
  /** Localised body (i18n cutoff.nudge.body) — describes the no-sign-in
   *  10-question quiz; falls back to the English constant. */
  body?: string;
  /** Localised button label (i18n cutoff.nudge.cta). */
  cta?: string;
  /** Localised secondary sign-in link (i18n cutoff.nudge.signin). */
  signInLabel?: string;
  /** Analytics surface tag, e.g. "cutoff-nudge". */
  surface: string;
}) {
  const [anon, setAnon] = useState(false);
  const seen = useRef(false);

  useEffect(() => {
    let cancelled = false;
    // false (guest) or null (probe failed) both show the offer — fail-open,
    // as before; only a confirmed session hides it.
    fetchSignedIn().then((v) => {
      if (!cancelled && v !== true) setAnon(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (anon && !seen.current) {
      seen.current = true;
      beacon(`${surface}-shown`, { surface, examCode, target: "anon-quiz" });
    }
  }, [anon, surface, examCode]);

  if (!anon) return null;

  // The anonymous quiz page is noindex and client-graded; n=10 is its cap,
  // from=cutoff makes its result screen show the category cutoff rows.
  const href = `/exams/${examCode}/quiz?n=10&from=cutoff`;
  return (
    <div className="mt-4 flex flex-col items-start gap-2 rounded-lg border border-emerald-300 bg-emerald-50/60 p-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-ink-700">
        <span className="font-semibold text-ink-900">{headline}</span> {body || QUIZ_BODY}
      </p>
      <div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end">
        <a
          href={href}
          onClick={() => beacon(`${surface}-click`, { surface, examCode, target: "anon-quiz" })}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-emerald-700"
        >
          {cta || QUIZ_CTA}
        </a>
        <a
          href={`/login?callbackUrl=${encodeURIComponent(`/exams/${examCode}`)}`}
          rel="nofollow"
          onClick={() => beacon(`${surface}-signin-click`, { surface, examCode, target: "login" })}
          className="text-xs font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-900"
        >
          {signInLabel || SIGN_IN_LABEL}
        </a>
      </div>
    </div>
  );
}
