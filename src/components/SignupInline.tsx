"use client";

// The free sign-up offer in one compact block, for a guest (27 Sep 2026) —
// inside "Next on Shishya" (src/components/LandingActions.tsx), right under a
// landing page's answer. Same words and page rule as the site card
// (src/lib/signup-pitch.ts); renders nothing on the server, for a signed-in
// student, or on a child school page.
//
// 30 Sep 2026 (sign-up build 1): its button is the shared in-page sign-in
// (src/components/SignInLink.tsx) — one "signin-click" beacon with surface
// "signup-inline" and the page family as placement (it was cta
// "signup-inline-click" with surface = family), and the skip-/login test's
// direct arm. Its /login link keeps from=pitch.
//
// 30 Sep 2026 (sign-up build 3, src/lib/content-signup.ts): the EARLY line.
// It left "Next on Shishya" (whose links stay server-rendered where they
// were) and each content page now mounts it once, right after its first
// answer block: exam-specific words ("Preparing for SSC CGL? Sign in free —
// Shishya keeps your SSC CGL mocks, scores and weak topics…"), a full-width
// button on phones instead of a small one, the reader's language. Still a
// client island — no server HTML, so crawlers and the /hi and /te twins see
// no change — guest-only, never on a Class 1-7 page. One "seen" beacon
// (cta "signup-inline", action "seen", placement) the first time it is on
// screen, so its click rate has a denominator; the click is build 1's.
// Explicit margins and no-underline: on guide, tricks and topic notes it
// sits inside the article's .prose (src/app/globals.css — zero-specificity
// rules, so these classes win), between two sections.
//
// 30 Sep 2026 (build 3 review):
//   • `practice` — the exam's practice state, passed by the page
//     (src/lib/exam-practice-state.ts hasPractice). Only an exam with
//     practice is promised "{exam} mocks, scores and weak topics"; a live
//     hub without a checked question or shared mock (AILET, NEET PG, NIFT …)
//     gets the exam line without them. Missing = none (fail closed).
//   • `revealOffscreen` — no layout shift. It first renders an empty
//     zero-height marker and appears only where nothing on screen moves
//     (content-signup.ts revealWithoutShift): at once when the spot is
//     below the screen, else once the reader has scrolled it off screen.
//     The in-article and lower mounts pass it; the lead-paragraph pages
//     (syllabus, updates, cutoff, career, scholarship) do not — theirs is
//     the early, visible line, where the 27 Sep block already appeared
//     after hydration.
//
// 2 Oct 2026 (founder, standing: "Sign up with Google", visible and clear,
// with a description on hover): the button is the one shared sign-up button
// (src/components/SignUpButton.tsx) — Google's white button with the "G",
// still full width on phones. With a mouse, hover or keyboard focus opens the
// explanation as a tooltip (it names the exam only when this page's sign-in
// returns to that exam — src/lib/signup-cta-copy.ts signUpContextFor). No
// extra caption on touch: the line beside the button already says what the
// account does. Same link, beacon (surface "signup-inline" + placement) and
// test arms. The same day the line was mounted on more page families
// (life-stage hubs, stream pages, list pages …) — the list is pinned in
// tests/unit/signup-cta.test.ts. Review, same day: on list pages it sits
// after the intro or the first group, never as the last block above the
// root layout's sign-up card (one in-content invitation per screen); the
// /ask, exam archive, /exams/state and closing-soon mounts were removed.

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { fetchSignedIn } from "@/lib/session-hint";
import { clientUiLocale } from "@/lib/ui-locale-copy";
import { pitchAllowedPath, signupHref } from "@/lib/signup-pitch";
import { revealWithoutShift, signupLineCopy, type ContentLocale, type SignupLineCopy } from "@/lib/content-signup";
import { ctaBeacon } from "@/lib/cta-beacon";
import { SignUpButton } from "@/components/SignUpButton";

function scrollAnchoring(): boolean {
  try {
    return typeof CSS !== "undefined" && CSS.supports("overflow-anchor", "auto");
  } catch {
    return false;
  }
}

export function SignupInline({
  surface,
  exam,
  practice,
  locale,
  revealOffscreen,
}: {
  /** The page family (analytics placement), e.g. "exam-syllabus". */
  surface: string;
  /** The exam's short name when the page is about one exam. */
  exam?: string | null;
  /** That exam has practice (ExamPracticeState.hasPractice). Only true
   *  promises its mocks, scores and weak topics. */
  practice?: boolean;
  /** A fixed language (a page in one language, e.g. the Hindi notes);
   *  otherwise the reader's (URL prefix, else the shishya-lang cookie). */
  locale?: ContentLocale;
  /** Appear only where nothing on screen moves (see above). */
  revealOffscreen?: boolean;
}) {
  const [copy, setCopy] = useState<SignupLineCopy | null>(null);
  // False while only the zero-height marker is in the page (revealOffscreen).
  const [shown, setShown] = useState(false);
  const [href, setHref] = useState("/login");
  // The language the line is in (the button's label and tooltip follow it).
  const [lang, setLang] = useState<ContentLocale>("en");
  const box = useRef<HTMLDivElement | null>(null);
  const marker = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    let alive = true;
    if (!pitchAllowedPath(location.pathname)) return;
    fetchSignedIn()
      .then((signedIn) => {
        if (!alive || signedIn !== false) return;
        setHref(signupHref(location.pathname + location.search));
        const lc = locale ?? clientUiLocale();
        setLang(lc);
        setCopy(signupLineCopy(lc, exam, practice));
        if (!revealOffscreen) setShown(true);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [exam, practice, locale, revealOffscreen]);

  // revealOffscreen: the marker is measured before paint; on screen, it
  // waits for the reader to scroll it off (no observer → it never shows).
  useLayoutEffect(() => {
    const el = marker.current;
    if (!copy || shown || !el) return;
    const anchoring = scrollAnchoring();
    const safe = () => {
      const r = el.getBoundingClientRect();
      return revealWithoutShift(r.top, r.bottom, window.innerHeight, anchoring);
    };
    if (safe()) {
      setShown(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => !e.isIntersecting) && safe()) {
        io.disconnect();
        setShown(true);
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [copy, shown]);

  // "seen": once, when at least half of it is on screen.
  useEffect(() => {
    const el = box.current;
    if (!shown || !el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          ctaBeacon("signup-inline", { action: "seen", surface: "signup-inline", placement: surface });
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [shown, surface]);

  if (!copy) return null;
  // Not yet: an empty marker, no height and no margin (a space-y parent
  // must not add any) — nothing moves.
  if (!shown) return <div ref={marker} aria-hidden="true" style={{ height: 0, margin: 0 }} />;
  return (
    <div
      ref={box}
      data-signup-inline={surface}
      className="mt-5 rounded-xl border-2 border-saffron-300 bg-saffron-50 p-4 print:hidden sm:flex sm:items-center sm:gap-4"
    >
      <p data-su-reason className="my-0 min-w-0 flex-1 text-sm leading-relaxed text-ink-800">
        <strong className="font-bold text-ink-900">{copy.lead}</strong> {copy.line}
        <span className="mt-1 block text-[11px] leading-snug text-ink-500">{copy.privacy}</span>
      </p>
      <SignUpButton
        href={href}
        surface="signup-inline"
        locale={lang}
        exam={exam}
        practice={practice}
        explain="own"
        block
        align="end"
        className="mt-3 shrink-0 sm:mt-0 sm:w-auto"
        buttonClassName="no-underline"
        beaconProps={{ placement: surface }}
      />
    </div>
  );
}
