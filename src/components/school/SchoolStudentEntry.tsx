"use client";

// Student-mode entry on a Class 8-12 school page (26 Sep 2026).
//
// Founder decision (26 Sep 2026): Class 8-12 pages get student sign-in, the
// AI tutor and account practice; Classes 1-7 do not — the pages render this
// island ONLY under isStudentModeClass(cls) (src/lib/school/student-classes.ts),
// so a Class 6 chapter page carries none of it, in HTML or in JS.
//
// The school pages are public and ISR-cached (revalidate 600), so the page
// itself reads no session: the same HTML goes to every visitor and to every
// crawler — the signed-out entry with the age line. After mount the island
// asks the session hint (src/lib/session-hint.ts: guests fire no request)
// and, for a signed-in account, GET /api/me/onboarding-profile?school=1 for
// the age band. What it shows is ONE decision, studentEntryView():
//   signed out  → "Sign in to practise and ask the tutor — for students 13
//                  and above" (Google sign-in, callback = this page + from=school);
//   no band yet → the one-time age-band card (13-17 student / 18+ student /
//                  parent / teacher), POSTed to the profile route;
//   ready       → "Practise this chapter — N questions" (POST /api/mocks/custom
//                  with the school flag; N is the chapter's own checked count,
//                  at most 10; no button under 5) and "Ask the AI tutor about
//                  this chapter" (/chat with the container, the chapter and a
//                  hint-first seed), with the visible "you will be talking to
//                  an AI tutor" line.
// Every word comes from src/lib/school/student-copy.ts. No leaderboard,
// streak, challenge, share or teacher piece; nothing stored in the browser.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchSignedIn } from "@/lib/session-hint";
import {
  SCHOOL_BANDS,
  schoolSignInHref,
  schoolTutorHref,
  studentEntryView,
  type SchoolBand,
} from "@/lib/school/student-classes";
import { STUDENT_ENTRY_COPY as C } from "@/lib/school/student-copy";

function beacon(cta: string, extra?: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({ kind: "CTA_CLICKED", path: typeof location !== "undefined" ? location.pathname : "/schooling", props: { cta, surface: "school", ...extra } })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}

type ProfileAnswer = { signedIn: boolean; band: SchoolBand | null };

async function readProfile(): Promise<ProfileAnswer> {
  const res = await fetch("/api/me/onboarding-profile?school=1", { cache: "no-store" });
  if (!res.ok) throw new Error(`profile ${res.status}`);
  const data = (await res.json()) as { signedIn?: boolean; band?: string | null };
  const band = (SCHOOL_BANDS as readonly string[]).includes(data.band ?? "") ? (data.band as SchoolBand) : null;
  return { signedIn: data.signedIn === true, band };
}

export interface SchoolStudentEntryProps {
  /** "chapter": the practice + tutor entry; "class": the sign-in line, the
   *  band card when signed in without a band, else "open a chapter". */
  variant: "chapter" | "class";
  cls: number;
  examCode: string;
  /** This page's own path — the sign-in callback. */
  pagePath: string;
  topicCode?: string;
  chapterName?: string;
  subjectName?: string;
  /** Checked, servable questions on the chapter (surface count). */
  validatedQuestions?: number;
}

export function SchoolStudentEntry(p: SchoolStudentEntryProps) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [band, setBand] = useState<SchoolBand | null>(null);
  const [choice, setChoice] = useState<SchoolBand | null>(null);
  const [saving, setSaving] = useState(false);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchSignedIn()
      .then(async (ok) => {
        if (!ok) return { signedIn: false, band: null } as ProfileAnswer;
        return readProfile();
      })
      .then((a) => {
        if (!live) return;
        setSignedIn(a.signedIn);
        setBand(a.band);
      })
      .catch(() => {
        if (live) setSignedIn(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const view = studentEntryView({ cls: p.cls, signedIn, band, validatedQuestions: p.validatedQuestions ?? 0 });
  if (view.kind === "none") return null;

  const signInHref = schoolSignInHref(p.pagePath);

  // ── Class page: one line, sign-in or "open a chapter" ──────────────
  // 26 Sep 2026 (integrator): signed in without the band, the class page
  // asks it too (the band card below): /chat's band card and POST
  // /api/chat's band-required event send a class-level chat here with
  // ?from=school, so the question must be asked on this page as well.
  if (p.variant === "class" && view.kind !== "band-card") {
    return (
      <section aria-labelledby="school-student-entry" className="mt-8 rounded-xl border border-saffron-200 bg-saffron-50/50 p-5">
        <h2 id="school-student-entry" className="text-base font-semibold text-ink-900">
          {C.classHeading(p.cls)}
        </h2>
        {view.kind === "signed-out" ? (
          <>
            <p className="mt-1 text-sm text-ink-700">{C.classBody}</p>
            <Link
              href={signInHref}
              prefetch={false}
              onClick={() => beacon("school-entry-google", { examCode: p.examCode, surface: "class" })}
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
            >
              {C.signInButton}
            </Link>
            <p className="mt-3 text-[11px] text-ink-500">{C.under13}</p>
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-700">{C.classSignedIn}</p>
        )}
      </section>
    );
  }

  // ── Chapter page ───────────────────────────────────────────────────
  if (view.kind === "signed-out") {
    return (
      <section aria-labelledby="school-student-entry" className="mt-6 rounded-xl border border-saffron-200 bg-saffron-50/50 p-5">
        <h2 id="school-student-entry" className="text-base font-semibold text-ink-900">
          {C.signedOutHeading}
        </h2>
        <p className="mt-1 text-sm text-ink-700">{C.signedOutBody}</p>
        <Link
          href={signInHref}
          prefetch={false}
          onClick={() => beacon("school-entry-google", { examCode: p.examCode, topic: p.topicCode, surface: "chapter" })}
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
        >
          {C.signInButton}
        </Link>
        <p className="mt-3 text-[11px] text-ink-500">{C.under13}</p>
      </section>
    );
  }

  if (view.kind === "band-card") {
    const submit = async () => {
      if (!choice) {
        setError(C.bandPick);
        return;
      }
      setSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/me/onboarding-profile", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ school: { band: choice, examCode: p.examCode } }),
        });
        if (!res.ok) throw new Error(`band ${res.status}`);
        beacon("school-band", { examCode: p.examCode, band: choice });
        setBand(choice);
      } catch {
        setError(C.error);
      } finally {
        setSaving(false);
      }
    };
    return (
      <section aria-labelledby="school-student-entry" className="mt-6 rounded-xl border border-saffron-300 bg-white p-5 shadow-sm">
        <h2 id="school-student-entry" className="text-base font-semibold text-ink-900">
          {C.bandHeading}
        </h2>
        <p className="mt-1 text-sm text-ink-700">{C.bandBody}</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {SCHOOL_BANDS.map((b) => {
            const active = choice === b;
            return (
              <li key={b}>
                <button
                  type="button"
                  onClick={() => setChoice(b)}
                  aria-pressed={active}
                  className={`w-full rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors ${
                    active ? "border-saffron-500 bg-saffron-50 text-ink-900" : "border-ink-200 bg-white text-ink-800 hover:border-saffron-400"
                  }`}
                >
                  {C.bandOption(b, p.cls)}
                </button>
              </li>
            );
          })}
        </ul>
        {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
        <button
          type="button"
          onClick={submit}
          disabled={saving}
          className="mt-3 inline-flex items-center justify-center rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:opacity-60"
        >
          {saving ? C.bandSaving : C.bandContinue}
        </button>
        <p className="mt-3 text-[11px] text-ink-500">{C.bandNote}</p>
      </section>
    );
  }

  // ready
  const tutorHref =
    p.topicCode && p.chapterName
      ? schoolTutorHref({ examCode: p.examCode, topicCode: p.topicCode, chapterName: p.chapterName, cls: p.cls, subjectName: p.subjectName ?? "" })
      : null;
  const practise = async () => {
    if (!p.topicCode || view.practiceCount === null) return;
    setBuilding(true);
    setError(null);
    try {
      const res = await fetch("/api/mocks/custom", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode: p.examCode, school: true, topicCode: p.topicCode, count: view.practiceCount, difficulty: "MIXED" }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (res.status === 403 && data.error === "school-band-required") {
        setBand(null);
        return;
      }
      if (!res.ok || !data.id) {
        setError(data.error ?? C.error);
        return;
      }
      beacon("school-practise", { examCode: p.examCode, topic: p.topicCode, count: view.practiceCount });
      router.push(`/mocks/${encodeURIComponent(data.id)}`);
    } catch {
      setError(C.error);
    } finally {
      setBuilding(false);
    }
  };
  return (
    <section aria-labelledby="school-student-entry" className="mt-6 rounded-xl border border-saffron-200 bg-saffron-50/50 p-5">
      <h2 id="school-student-entry" className="text-base font-semibold text-ink-900">
        {C.readyHeading}
      </h2>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {view.practiceCount !== null && (
          <button
            type="button"
            onClick={practise}
            disabled={building}
            className="inline-flex items-center justify-center rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:opacity-60"
          >
            {building ? C.practiceBuilding : C.practiceButton(view.practiceCount)}
          </button>
        )}
        {tutorHref && (
          <Link
            href={tutorHref}
            prefetch={false}
            onClick={() => beacon("school-tutor", { examCode: p.examCode, topic: p.topicCode })}
            className="inline-flex items-center justify-center rounded-lg border border-ink-300 bg-white px-5 py-2.5 text-sm font-semibold text-ink-800 transition-colors hover:bg-ink-50"
          >
            {C.tutorButton}
          </Link>
        )}
      </div>
      {error && <p className="mt-2 text-xs text-rose-700">{error}</p>}
      <p className="mt-3 text-[11px] text-ink-600">{C.aiLine}</p>
      <p className="mt-1 text-[11px] text-ink-500">{view.practiceCount !== null ? C.practiceHonesty : C.noPractice}</p>
    </section>
  );
}
