"use client";

// CTA on the exam page. Calls POST /api/mocks → redirects to /mocks/:id.
// Labels passed in by the server component so the strings can be in any locale.
//
// ABANDONMENT FIX (12 Jun 2026)
// Three of the best early users (yuvraj, harshal, yeshwanth) completed
// the 5-Q diagnostic but then opened the follow-up ADAPTIVE mock and
// bailed with ZERO answers. Root cause: clicking "adaptive" instantly
// created a 15-question mock and dropped them into the player with the
// timer ALREADY running — a wall for a casual return visit.
//
// Now the returning-user path offers a length CHOICE up front (5 / 10 /
// 15) with a clear time estimate, and defaults to 10 (not 15) so the
// commitment reads as reasonable before they click. They pick what fits
// their time, then start — no surprise 15-Q timed wall.
//
// DEAD PRIMARY CTA FIX (11 Sep 2026 signup-leak audit)
// For an anonymous visitor this button — the hub's primary CTA — POSTed
// /api/mocks, got 401 {error:"UNAUTHENTICATED"} and printed that string in
// red. Now a 401 sends them to /login with callbackUrl back to this hub
// carrying ?start=diagnostic; on the signed-in return the diagnostic they
// asked for starts by itself, once (sessionStorage guard — never a loop).
// Same pattern as SubjectTestButton / CustomMockBuilder.
// 28 Sep 2026 (founder: the sign-up must be there as it was): the 401 goes
// to /login again, with the ?start=diagnostic return. For one day (27 Sep)
// it sent the guest to the no-sign-in quiz instead; the quiz keeps its own
// button beside the sign-in on the hub.
//
// 30 Sep 2026 (sign-up build 1):
//   • the 401 sends the site-wide sign-in beacon (surface "hub-start-401";
//     it was cta "diagnostic-401") and names its door on /login (from=);
//   • HUB START: the hub box's "Sign in free — start practising" returns to
//     /exams/CODE?start=practice (src/app/exams/[code]/page.tsx), and the
//     same guarded auto-start below keeps that promise: a member with no
//     mock on this exam yet gets the 5-question diagnostic started — the
//     button a first-timer sees — once; a returning member who already has
//     mocks here is NOT dropped into a surprise diagnostic: the page just
//     scrolls to their own start panel (length picker). ?start=diagnostic
//     (the 401 path: they pressed the diagnostic itself) starts it as before.
//   • HubSignInLink is the shared in-page sign-in button (SignInLink:
//     beacon + the skip-/login test).

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchSignedIn } from "@/lib/session-hint";
import { clientUiLocale, type CopyLocale } from "@/lib/ui-locale-copy";
import { mockStartCopy } from "@/lib/quiz-entry-copy";
import { SignInLink } from "@/components/SignInLink";
import { hubAutoStart, loginHrefFor, signinBeacon } from "@/lib/signin-cta";

/** The signed-out hub box's "Sign in free — start practising" button (16
 *  Sep 2026: it was the one hub CTA with no CTA_CLICKED). Renders the same
 *  link the server page did — href, class and text passed through — as the
 *  shared in-page sign-in button (30 Sep 2026, src/components/SignInLink.tsx):
 *  one "signin-click" beacon (surface "hub-box"; it was cta
 *  "hub-signin-practice"), and in the skip-/login test's direct arm the tap
 *  goes straight to Google with the same callback. */
export function HubSignInLink({
  examCode,
  href,
  className,
  children,
}: {
  examCode: string;
  href: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <SignInLink href={href} surface="hub-box" className={className} beaconProps={{ examCode }}>
      {children}
    </SignInLink>
  );
}

interface Labels {
  adaptive: string;
  diagnostic: string;
  firstDiagnostic: string;
  building: string;
}

// Length options for the adaptive mock. minutes ≈ questions (≈1 min/Q
// is realistic for most exams; the per-mock duration is set server-side
// from questionCount anyway). 10 is the recommended default.
const LENGTHS = [
  { count: 5, label: "Quick", mins: 5 },
  { count: 10, label: "Standard", mins: 10 },
  { count: 15, label: "Full", mins: 15 },
] as const;

export function StartMockButton({
  examCode,
  hasHistory,
  labels,
  locale,
}: {
  examCode: string;
  hasHistory: boolean;
  labels: Labels;
  /** The hub page's locale when it passes one (16 Sep 2026); without it
   *  the two error lines follow the shishya-lang cookie, read after mount. */
  locale?: string;
}) {
  const router = useRouter();
  // The hub page renders per request (it reads the session), so this needs
  // no Suspense boundary of its own; the root layout's AnalyticsTracker
  // is the precedent.
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Default to 10 questions — the previous instant-15 was the wall.
  const [count, setCount] = useState<number>(10);
  // The two error lines in the student's language (16 Sep 2026). The hub
  // page passes its `locale`; until it does (it is outside this partition)
  // the cookie is read here after mount. Both lines only ever appear after a
  // click, and the API's own error string still wins when it sends one.
  const [cookieLocale, setCookieLocale] = useState<CopyLocale>("en");
  useEffect(() => {
    if (locale == null) setCookieLocale(clientUiLocale());
  }, [locale]);
  const errCopy = mockStartCopy(locale ?? cookieLocale);

  async function start(kind: "DIAGNOSTIC" | "ADAPTIVE", n?: number) {
    setErr(null);
    setBusy(true);
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examCode,
          request:
            kind === "DIAGNOSTIC"
              ? { type: "DIAGNOSTIC", questionCount: 5 }
              : { type: "ADAPTIVE", questionCount: n ?? count },
        }),
      });
      if (res.status === 401) {
        // Anonymous visitor: keep the intent instead of printing the error.
        // The callback brings them back to THIS hub with ?start=diagnostic,
        // which the effect below turns into the mock they asked for.
        signinBeacon("hub-start-401", { examCode, kind, via: "login" });
        window.location.href = loginHrefFor(`/exams/${examCode}?start=diagnostic`, "hub-start-401");
        return;
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.mock?.id) {
        setErr(data?.error ?? errCopy.errStart);
        setBusy(false);
        return;
      }
      router.push(`/mocks/${data.mock.id}`);
    } catch {
      setErr(errCopy.errNetwork);
      setBusy(false);
    }
  }

  // Post-login auto-start: /exams/CODE?start=diagnostic comes back from the
  // 401 path above ("you asked for the diagnostic before the wall — here it
  // is"), and since 30 Sep 2026 /exams/CODE?start=practice from the hub
  // box's "Sign in free — start practising" (hubAutoStart decides: the
  // diagnostic for a member with no mock here yet, the start panel for a
  // returning one). Guarded by sessionStorage so a reload, back-navigation,
  // Strict Mode double effect or an expired session mid-flight can never
  // loop through /login again, and by a session probe so a pasted URL just
  // shows the button to a guest. No storage → no guard → no auto-start.
  useEffect(() => {
    const startParam = searchParams?.get("start");
    if (hubAutoStart(startParam, hasHistory) === null) return;
    const key = `shishya_autostart_diag:${examCode}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    // 30 Sep 2026 (review): once the guard is set, drop ?start= from the
    // address bar. Otherwise it stays there for a returning member (the
    // panel branch only scrolls) and after a failed start, and a copied hub
    // link would start a surprise diagnostic for a signed-in friend with no
    // mock here. The effect re-runs on the new searchParams and stops at
    // hubAutoStart(null); this run keeps its own startParam.
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("start");
      window.history.replaceState(window.history.state, "", u.pathname + u.search + u.hash);
    } catch {
      /* keep the URL */
    }
    // Forced probe (never trusts a missing `shishya_in` hint): these URLs
    // only come back from a sign-in, so a casual guest never pays for it.
    // null (probe failed) → leave the button to the student.
    fetchSignedIn({ force: true }).then((v) => {
      if (v !== true) return;
      const what = hubAutoStart(startParam, hasHistory);
      if (what === "diagnostic") void start("DIAGNOSTIC");
      else if (what === "panel") {
        try {
          document.querySelector('[data-tour="exam-start-mock"]')?.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch {
          /* no scroll — the panel is still on the page */
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, examCode]);

  // First-timer (no history): single low-commitment diagnostic.
  if (!hasHistory) {
    return (
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <button
          onClick={() => start("DIAGNOSTIC")}
          disabled={busy}
          className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
        >
          {busy ? labels.building : `${labels.firstDiagnostic} · 5 Q · ~5 min`}
        </button>
        {err && <span className="text-xs text-rose-700">{err}</span>}
      </div>
    );
  }

  // Returning user: length picker + clear time estimate, then start.
  const selected = LENGTHS.find((l) => l.count === count) ?? LENGTHS[1];
  return (
    <div className="flex flex-col items-stretch gap-2">
      {/* Length chooser — pick your commitment before the clock starts. */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium text-ink-500">Length:</span>
        {LENGTHS.map((l) => (
          <button
            key={l.count}
            type="button"
            onClick={() => setCount(l.count)}
            disabled={busy}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              count === l.count
                ? "bg-saffron-500 text-white"
                : "border border-ink-200 bg-white text-ink-700 hover:border-saffron-400"
            }`}
          >
            {l.count} Q
            <span className="ml-1 opacity-70">· ~{l.mins}m</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
        <button
          onClick={() => start("ADAPTIVE")}
          disabled={busy}
          className="btn-primary !py-2 !px-4 text-sm disabled:opacity-50"
        >
          {busy
            ? labels.building
            : `Start ${selected.count}-question mock · ~${selected.mins} min →`}
        </button>
        <button
          onClick={() => start("DIAGNOSTIC")}
          disabled={busy}
          className="text-xs font-medium text-saffron-700 hover:text-saffron-800 disabled:opacity-50"
        >
          or a quick 5-Q diagnostic
        </button>
      </div>
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </div>
  );
}
