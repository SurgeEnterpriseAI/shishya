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

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchSignedIn } from "@/lib/session-hint";
import { clientUiLocale, type CopyLocale } from "@/lib/ui-locale-copy";
import { mockStartCopy } from "@/lib/quiz-entry-copy";

// First-party analytics beacon (same shape as ShareExamButton) — the 401
// path is counted so the audit can see how much mock intent the wall
// receives and how much of it returns signed in.
function beacon(cta: string, extra?: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [
          JSON.stringify({
            kind: "CTA_CLICKED",
            path: typeof location !== "undefined" ? location.pathname : "/",
            props: { cta, ...extra },
          }),
        ],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}

/** The signed-out hub banner's "Sign in free — build my plan" link (16 Sep
 *  2026). It was the one hub CTA with no CTA_CLICKED, so the /coach
 *  callback's volume could only be guessed from /login views. Renders the
 *  same <a> the server page did — href, class and text passed through —
 *  and beacons on click (sendBeacon survives the navigation). */
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
    <Link href={href} className={className} onClick={() => beacon("hub-signin-practice", { surface: "hub-banner", examCode })}>
      {children}
    </Link>
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
        beacon("diagnostic-401", { examCode, kind });
        window.location.href = `/login?callbackUrl=${encodeURIComponent(`/exams/${examCode}?start=diagnostic`)}`;
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

  // Post-login auto-start: /exams/CODE?start=diagnostic is only ever
  // produced by the 401 path above, so a signed-in arrival with it means
  // "you asked for the diagnostic before the wall — here it is". Guarded
  // by sessionStorage so a reload, back-navigation, Strict Mode double
  // effect or an expired session mid-flight can never loop through
  // /login again, and by a session probe so a pasted URL just shows the
  // button to a guest. No storage → no guard → no auto-start.
  useEffect(() => {
    if (searchParams?.get("start") !== "diagnostic") return;
    const key = `shishya_autostart_diag:${examCode}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      return;
    }
    // Forced probe (never trusts a missing `shishya_in` hint): this URL only
    // comes back from the 401 → /login path, so a casual guest never pays
    // for it. null (probe failed) → leave the button to the student.
    fetchSignedIn({ force: true }).then((v) => {
      if (v === true) void start("DIAGNOSTIC");
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
