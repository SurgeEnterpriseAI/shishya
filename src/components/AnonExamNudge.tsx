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
// 2 Oct 2026 (founder: every sign-in call is the white Google button, with
// a line saying why): that quiet second link ("or sign in free for full
// mocks with your scores saved →") is the one shared "Sign up with Google"
// button now, in the page's language, and what the link's words promised is
// the plain line above it (signUpReason "fullMocks" — the page mounts this
// box only where the exam has practice). Same destination (the exam's hub
// through /login), its own door id ("cutoff-nudge"; it was counted as
// "link"), and the older "{surface}-signin-click" beacon still fires on the
// same click.
// 2 Oct 2026 (review, same day — the lead's rule D, which has no exception:
// "in every block where the sign-up sits beside or above an alternative the
// Google button stays FIRST, and the alternative must not be visually
// heavier than it"): the ORDER changed here too. The reason line and the
// sign-up button come first; the quiz link follows as a quiet 1 px ink
// outline (it was first and filled emerald, bold white text). Nothing was
// removed: the quiz link has the same words, the same destination and the
// same "{surface}-click" beacon, and the box's headline and body — which
// describe the quiz — are unchanged.
// TO WATCH after this ships (the 11 Sep numbers above are why the quiz was
// the main offer: the sign-in offer was shown 699 times and clicked 31):
// read "cutoff-nudge-click" (quiz) against "signin-click" surface
// "cutoff-nudge" for a few days. If quiz starts from this box fall and
// sign-ups do not rise, swap the two elements back — it is the order of two
// JSX elements below and one row in tests/unit/signup-everywhere.test.ts
// (section D) — but keep the quiz link unfilled.
//
// Session is checked CLIENT-side so the host page keeps its ISR caching —
// no server cookie read. Since 13 Sep 2026 that is the shared, hint-gated
// probe (src/lib/session-hint.ts): a guest without the `shishya_in` hint
// resolves at once with NO /api/auth/session request. Renders nothing until
// the visitor is known not to be signed in (signed-in users never see it,
// with no flash). Instrumented with shown/click beacons per surface.

import { useEffect, useRef, useState } from "react";
import { SignUpButton } from "@/components/SignUpButton";
import { fetchSignedIn } from "@/lib/session-hint";
import { signUpReason } from "@/lib/signup-cta-copy";

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

export function AnonExamNudge({
  examCode,
  headline,
  body,
  cta,
  locale,
  examShort,
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
  /** The page's language: the sign-up button's label and the line above it. */
  locale?: string | null;
  /** The exam's short name — the button's tooltip names it (the sign-in
   *  returns to this exam's hub, so the new account is enrolled in it). */
  examShort?: string | null;
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
        <p data-su-reason className="text-xs text-ink-700">{signUpReason(locale, "fullMocks")}</p>
        {/* side="top": the quiz link sits under the button, and the tooltip
            must not cover the pointer's way to it. */}
        <SignUpButton
          href={`/login?callbackUrl=${encodeURIComponent(`/exams/${examCode}`)}&from=cutoff-nudge`}
          surface="cutoff-nudge"
          locale={locale}
          exam={examShort}
          examCode={examCode}
          explain="own"
          side="top"
          align="end"
          rel="nofollow"
          beaconProps={{ examCode }}
          onSignInClick={() => beacon(`${surface}-signin-click`, { surface, examCode, target: "login" })}
        />
        <a
          href={href}
          onClick={() => beacon(`${surface}-click`, { surface, examCode, target: "anon-quiz" })}
          className="mt-1 inline-flex min-h-[44px] items-center justify-center rounded-lg border border-ink-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"
        >
          {cta || QUIZ_CTA}
        </a>
      </div>
    </div>
  );
}
