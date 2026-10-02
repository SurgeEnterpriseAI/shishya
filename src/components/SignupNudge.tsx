"use client";

// Engagement-triggered signup nudge for anonymous visitors.
//
// Founder call (3 Aug 2026): ~72% of engaged visitors never sign up,
// yet everything that retains them (streaks, weak areas, mistake
// notebook, coach) needs identity. This asks at the moment of earned
// value — never at the door.
//
// Form: slide-up bottom bar (mobile) / corner card (desktop) — NOT a
// screen-blocking modal, because Google penalizes intrusive
// interstitials on mobile organic landings and SEO is the growth
// engine.
//
// Hard courtesy rules (all enforced here):
//   • anonymous visitors only (any session-token cookie → render null)
//   • (until 30 Sep 2026) 5+ minutes of ACTIVE tab time AND 3+ pageviews
//     this session — replaced by build 3's trigger, below
//   • never during a mock/live-test attempt, never on /login, /admin,
//     /i/, /join, /aptitude
//   • max once per day; gone forever after 3 dismissals or 1 click
//   • every shown/clicked/dismissed logged as CTA_CLICKED with
//     cta 'signup-nudge' + action, so the conversion lift is measured,
//     not assumed. (11 Sep 2026: the beacon used to carry only
//     surface+action while the CTA report groups by props.cta — 386
//     events collapsed into one "(none)" row.)
//
// 27 Sep 2026 (founder, content first):
//   • never on /schooling (school pages carry their own after-practice
//     save line, and children must not be asked) or on /chat (the chat has
//     its own after-value save card);
//   • on Class 1-7 school pages (below 13: no data taken) not even the
//     session page-view / active-seconds counters are written;
//   • "Sign up free" returns to the page it was clicked on (callbackUrl =
//     this path + query), never into a questionnaire.
//
// 30 Sep 2026 (sign-up build 1): the sheet's sign-in button is the shared
// in-page sign-in (src/components/SignInLink.tsx): its click is the one
// "signin-click" beacon (surface "signup-nudge") — it replaces this file's
// action "clicked" beacon; "shown" and "dismissed" keep cta "signup-nudge" —
// and the skip-/login test's direct arm. Same link, same from=header.
//
// 30 Sep 2026 (sign-up build 3, src/lib/content-signup.ts) — earlier,
// slimmer, and only on CONTENT pages. The old trigger (5 active minutes
// AND 3 page views) reached 11.5% of guest visitor-days at best while 79% of
// sign-ups happen within 5 minutes of landing, and it showed mostly on the
// hub and the quiz, whose own buttons already convert. Now:
//   • only on a content family (contentFamily: syllabus, updates, cutoff,
//     topic notes, guide, tricks, news, current affairs, scholarships,
//     careers, colleges, exam calendar, jobs map, /ask, school Class 8-12);
//     never on the hub, quiz, build-mock, PYQ, mock or any page the
//     site-wide offer may not show on (Class 1-7, /schooling, /chat, login…);
//   • after 45 s of ACTIVE time on this page OR a scroll past 60% of it,
//     whichever comes first — counted in memory only (no storage at all);
//   • a slim one-line bar: a bottom bar on phones (about 7% of the screen;
//     a little more with the review's age line, below),
//     a small corner card on desktop; it never covers the page's own
//     sign-up line — it waits while that line is on screen;
//   • unchanged: guests only (the forced server check right before it
//     shows), once a day, gone after 3 dismissals or 1 click, the ✕;
//   • beacons: "shown" (+ trigger) and "dismissed" keep cta "signup-nudge",
//     the click is build 1's "signin-click"; all three carry the page
//     family as placement.
//
// 30 Sep 2026 (build 3 review):
//   • the free + age line ("Free · For students 13 and above") sits under
//     the line on every screen, plus what Google shares on wider screens —
//     "signup-nudge" is in the skip-/login test, so half of the guests who
//     tap it reach Google's chooser without /login's age line, and the bar
//     also shows on Class 8-12 pages;
//   • the native Hindi notes (/exams/X/topics/Y/hi, no /hi prefix) get the
//     Hindi bar, like their own early line (content-signup.ts
//     fixedPageLocale);
//   • the desktop card sits above FeedbackWidget's "Suggest a feature" pill
//     (fixed bottom-4 right-4, same z-40) instead of on top of it — it now
//     shows after 45 s, not 5 minutes, so it covered the pill far more often.
//
// 2 Oct 2026 (founder, standing: "Sign up with Google"): the bar's button
// reads "Sign up with Google" — the one shared sign-up button
// (src/components/SignUpButton.tsx). With a mouse (the desktop corner card)
// hover or keyboard focus opens the explanation as a tooltip ABOVE the
// button; on touch there is none — the bar's own line says it. Same link,
// same "signin-click" beacon (surface "signup-nudge"), same test arms.
//
// 2 Oct 2026, evening (founder, with a screenshot of the white Google button:
// "sign up should show like this instead of the orange color one … check all
// the places"): the bar's button was our saffron TEXT-ONLY button; it is
// Google's LIGHT button now — white pill, the colour "G", then the label.
// `stack`: the label's two halves sit on two lines beside the "G" ("Sign up"
// over "with Google" — the full approved words) at every width, in the
// compact size below sm, so the line beside it keeps about the room it had.
// Font arithmetic, not yet seen on a screen: the button is about 115 px wide
// on a phone and about 136 px in the 448 px desktop card, where one line
// would take 190 px (242 in Telugu) and leave the bar's own line about
// 170 px for its two lines.
//
// 2 Oct 2026, later (founder: "Each sign in with Google should be
// contextualized from the location where it is"; decision: a phone sees no
// tooltip, so THE BAR'S ONE LINE IS THE PAGE FAMILY'S CAPTION): the line
// beside the button is the caption of the entry this page takes — "No forms.
// Your AI tutor chats about schemes are saved." on a scholarship, "No forms.
// SSC CGL stays on your dashboard as your exam." on its updates page … — and
// the tooltip (a mouse only) is the same entry's full sentence, the one the
// header and the site card show on this page (src/lib/signup-place.ts
// signUpPagePlace). The reader's language (and the rules that choose the
// entry) are fetched right before the bar shows, so the bar comes up with
// its line in place; if that fetch fails the
// bar shows the line it had until today (nudgeBarCopy). Nothing is fetched
// while the bar is hidden.
//
// 2 Oct 2026 (review of that build):
//   • THE LINE IS NOT CUT. The captions are longer than the old line (47 /
//     52 / 51 characters in en / hi / te; a caption runs to about 60-70 with
//     an exam's name), and the paragraph was clamped to two lines — on a
//     360-375 px phone the text column is about 156-180 px, where the old
//     Telugu line already lost its verb to that clamp once
//     (src/lib/content-signup.ts). The clamp is a ceiling now, not the
//     height: up to four lines on a phone and three from sm, so a caption is
//     shown as written and the bar is only as tall as its words. Font
//     arithmetic, not seen on a screen — look at it at 360 and 375 px in all
//     three languages with a long exam name before it ships. If four lines
//     are too tall, the answer is a shorter caption in the table, never a
//     cut one;
//   • a school page: the line is "Saved practice is on CBSE chapters for
//     now." on every board (src/lib/signup-place.ts, rule 6) — the bar
//     cannot know whether this chapter has practice, so it never says "Your
//     chapter practice scores are saved." on its own;
//   • the wait for the words (1.5 s at most): if the reader has moved to
//     another page by then, or the page's own sign-up line has come on
//     screen, the bar does not show and today's turn is not used up; and the
//     line the bar comes up with stays — words that arrive later do not
//     change it under the reader's eyes.

import { useEffect, useRef, useState } from "react";
import { pitchAllowedPath } from "@/lib/signup-pitch";
import { clientUiLocale } from "@/lib/ui-locale-copy";
import { usePathname } from "next/navigation";
import { fetchSignedIn } from "@/lib/session-hint";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";
import { SignUpButton } from "@/components/SignUpButton";
import { contentFamily, fixedPageLocale, nudgeBarCopy, nudgeTrigger, scrollDepthReached } from "@/lib/content-signup";
import { cachedSignUpKit, loadSignUpKit, signUpWordsLang } from "@/lib/signup-place-load";
import { useSignUpPageData, useSignUpWords } from "@/lib/use-signup-words";

const MAX_DISMISSALS = 3;

const LS_DISMISS = "shishya_nudge_dismissals";
const LS_LAST = "shishya_nudge_last_shown";
const LS_DONE = "shishya_nudge_done";

function blockedPath(p: string): boolean {
  // 27 Sep 2026 (evening): the site-wide offer's rule (src/lib/signup-pitch.ts)
  // — no child school page (Class 1-7, /schooling, board hubs), no paper in
  // progress, no chat, login or admin — plus live tests. Class 8-12 school
  // pages DO get it now (founder: sign-ups everywhere except below Class 8).
  return !pitchAllowedPath(p) || p.startsWith("/live-test/");
}

/** The page family where the bar may show, or null (build 3: content only). */
function nudgePlacement(p: string): string | null {
  return blockedPath(p) ? null : contentFamily(p);
}

/** The page's own sign-up line (src/components/SignupInline.tsx) is on
 *  screen: the bar waits, so two invitations never sit there together. */
function inlineOnScreen(): boolean {
  try {
    const h = window.innerHeight;
    for (const el of Array.from(document.querySelectorAll("[data-signup-inline]"))) {
      const r = el.getBoundingClientRect();
      if (r.bottom > 0 && r.top < h) return true;
    }
  } catch {
    /* old browser */
  }
  return false;
}

// NOTE (4 Aug 2026 incident): the original check read document.cookie
// for the session token — but auth cookies are httpOnly and INVISIBLE
// to JS, so the nudge fired for signed-in students too and its bottom
// sheet could sit over exam-hub UIs. Signed-in detection now probes
// the session endpoint once; until it answers, we assume signed-in
// (fail-closed: never nudge when unsure).
//
// 13 Sep 2026 (phone-first audit): the mount check is the shared,
// hint-gated probe (src/lib/session-hint.ts) — a guest without the
// non-httpOnly, PII-free `shishya_in` hint resolves anonymous with NO
// request. A missing hint is not proof of being a guest (cookie reset, a
// sign-in from before the hint shipped), so right before the card would
// show we ask the server once more (force) and stay silent unless it
// answers "guest". Never on page load; at most once per guest per day.

function beacon(action: "shown" | "dismissed", extra: Record<string, string>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({
          kind: "CTA_CLICKED",
          path: location.pathname,
          props: { cta: "signup-nudge", surface: "signup-nudge", action, ...extra },
        })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* best-effort */
  }
}

export function SignupNudge() {
  const pathname = usePathname();
  // The page family it is showing on (null = hidden).
  const [show, setShow] = useState<string | null>(null);
  // null = unknown (treat as signed-in; never nudge), true = anonymous.
  const [anon, setAnon] = useState<boolean | null>(null);
  // A forced session check is in flight (the pre-show confirmation below).
  const confirming = useRef(false);
  // This page's active seconds and scroll depth — memory only, reset on
  // every navigation (nothing is stored, on any page).
  const pageSeconds = useRef(0);
  const scrolledPast = useRef(false);
  // The bar came up before its words arrived: it keeps the old line while it is up.
  const [oldLine, setOldLine] = useState(false);
  // The bar's line and its button's tooltip: the entry of the page family the
  // bar is showing on (nothing is read or fetched while it is hidden).
  const pageData = useSignUpPageData();
  // The page's own language (the Hindi notes), else the reader's (URL
  // prefix, else the shishya-lang cookie).
  const barLocale = fixedPageLocale(pathname) ?? clientUiLocale();
  let herePath = pathname ?? "";
  if (show) {
    try {
      herePath = location.pathname + location.search;
    } catch {
      /* the router's path */
    }
  }
  const words = useSignUpWords(barLocale, show ? { surface: "signup-nudge", callback: herePath, page: pageData } : null, { now: true, off: !show });

  useEffect(() => {
    // Shared, hint-gated probe: false = guest (no request without the
    // hint), true = signed in, null = probe failed → stay silent.
    fetchSignedIn().then((v) => setAnon(v === null ? null : !v));
  }, []);

  // If the bar is up and the student navigates anywhere else — a
  // protected page (mock, attempt, login…) or a page that is not a
  // content page — hide it at once: client-side navigation keeps this
  // component mounted, so the trigger-time check alone isn't enough.
  // On another content page it stays, under that page's family.
  useEffect(() => {
    if (!show) return;
    const here = nudgePlacement(pathname);
    if (here !== show) setShow(here);
  }, [pathname, show]);

  // A new page starts its own count.
  useEffect(() => {
    pageSeconds.current = 0;
    scrolledPast.current = false;
  }, [pathname]);

  // Scroll depth, on content pages only, for a confirmed guest.
  useEffect(() => {
    if (anon !== true || show || !nudgePlacement(pathname)) return;
    const onScroll = () => {
      if (scrolledPast.current) return;
      try {
        if (scrollDepthReached(window.scrollY, window.innerHeight, document.documentElement.scrollHeight)) scrolledPast.current = true;
      } catch {
        /* old browser */
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [anon, show, pathname]);

  // Accumulate ACTIVE seconds (tab visible only) and evaluate the
  // rules once per tick. Cheap: one 1s interval, all checks local.
  // Runs ONLY once the session probe has positively confirmed the
  // visitor is anonymous.
  useEffect(() => {
    if (anon !== true) return;
    const id = window.setInterval(() => {
      if (isUnder13SchoolPath(location.pathname)) return; // Class 1-7: nothing counted (founder rule 5)
      if (document.hidden || show) return;
      const placement = nudgePlacement(location.pathname);
      if (!placement) return;
      try {
        if (localStorage.getItem(LS_DONE)) return;
        if (Number(localStorage.getItem(LS_DISMISS) ?? "0") >= MAX_DISMISSALS) return;
        const today = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem(LS_LAST) === today) return;

        pageSeconds.current += 1;
        const trigger = nudgeTrigger(pageSeconds.current, scrolledPast.current);
        if (!trigger || inlineOnScreen()) return;
        // A missing hint is not proof of being a guest, so confirm with
        // the server right before showing (force). Signed in or unsure →
        // never nudge. At most one call per engaged guest per day.
        if (confirming.current) return;
        confirming.current = true;
        fetchSignedIn({ force: true }).then((v) => {
          confirming.current = false;
          if (v !== false) {
            setAnon(v === true ? false : null);
            return;
          }
          if (document.hidden || !nudgePlacement(location.pathname)) return;
          try {
            if (localStorage.getItem(LS_LAST) === today) return;
            localStorage.setItem(LS_LAST, today);
          } catch {
            return;
          }
          // The bar's line is its page family's caption: fetch the reader's
          // language first (a second and a half at most), so the bar comes
          // up with its line in place.
          const startPath = location.pathname;
          const lc = signUpWordsLang(fixedPageLocale(startPath) ?? clientUiLocale());
          const waited = new Promise<void>((done) => window.setTimeout(done, 1500));
          void Promise.race([loadSignUpKit(lc).then(() => undefined, () => undefined), waited]).then(() => {
            const here = nudgePlacement(location.pathname);
            if (document.hidden || !here || location.pathname !== startPath || inlineOnScreen()) {
              // Not shown after all (while the words loaded the tab was
              // hidden, the reader moved to another page — this trigger was
              // the first page's — or the page's own sign-up line came on
              // screen): today's turn is not used up.
              try {
                localStorage.removeItem(LS_LAST);
              } catch {
                /* ok */
              }
              return;
            }
            // The line it comes up with stays for as long as it is up.
            setOldLine(!cachedSignUpKit(lc));
            setShow(here);
            beacon("shown", { placement: here, trigger });
          });
        });
      } catch {
        /* private mode — never nudge if we can't be polite about it */
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [show, anon]);

  if (!show) return null;
  const copy = nudgeBarCopy(barLocale);
  const dismiss = () => {
    try {
      localStorage.setItem(
        LS_DISMISS,
        String(Number(localStorage.getItem(LS_DISMISS) ?? "0") + 1),
      );
    } catch { /* ok */ }
    beacon("dismissed", { placement: show });
    setShow(null);
  };

  // role="dialog" (non-modal): InstallOffer (src/components/InstallOffer.tsx)
  // steps aside while any dialog is on screen.
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 print:hidden sm:inset-x-auto sm:bottom-16 sm:right-4 sm:max-w-md"
      role="dialog"
      aria-label={copy.label}
      data-signup-nudge={show}
    >
      <div
        className="animate-[slideup_.3s_ease-out] border-t-2 border-saffron-300 bg-white px-3 pt-2 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:rounded-xl sm:border-2 sm:px-4 sm:py-2.5 sm:shadow-xl"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <style>{`@keyframes slideup{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="min-w-0 flex-1">
            <p className="line-clamp-4 text-xs font-medium leading-snug text-ink-800 sm:line-clamp-3 sm:text-sm">{oldLine ? copy.line : words?.short ?? copy.line}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-ink-500">
              {copy.privacy}
              <span className="hidden sm:inline">{copy.privacyMore}</span>
            </p>
          </div>
          <SignUpButton
            href={`/login?callbackUrl=${encodeURIComponent(location.pathname + location.search)}&from=header`}
            surface="signup-nudge"
            locale={barLocale}
            stack
            explain="tooltip"
            side="top"
            align="end"
            className="shrink-0"
            beaconProps={{ placement: show }}
            onSignInClick={() => {
              try { localStorage.setItem(LS_DONE, "1"); } catch { /* ok */ }
            }}
          />
          <button
            type="button"
            aria-label={copy.later}
            onClick={dismiss}
            className="shrink-0 rounded-md p-1.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
