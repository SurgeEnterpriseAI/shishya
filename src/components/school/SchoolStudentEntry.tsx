"use client";

// Student-mode entry on a Class 8-12 school page (26 Sep 2026; content first
// since 27 Sep 2026).
//
// Founder decision (26 Sep 2026): Class 8-12 pages get the AI tutor and
// account practice; Classes 1-7 do not — the pages render this island ONLY
// under isStudentModeClass(cls) (src/lib/school/student-classes.ts), so a
// Class 6 chapter page carries none of it, in HTML or in JS.
// Founder direction (27 Sep 2026, content first): no question before
// content. The one-time age-band card is gone — nobody is asked their age
// or role — and the tutor needs no sign-in: a guest opens the school chat
// with the chapter's context, where the school safeguards come from that
// context (study-only, hint-first, never textbook text, the daily message
// cap). Sign-in is offered only AFTER value, to save practice, with the
// "for students 13 and above" line.
//
// The school pages are public and ISR-cached (revalidate 600), so the page
// itself reads no session: the same HTML goes to every visitor and to every
// crawler — the guest tutor entry. After mount the island asks the session
// hint (src/lib/session-hint.ts: guests fire no request). What it shows is
// ONE decision, studentEntryView():
//   guest (or not known yet) → slot "tutor": "Ask the AI tutor about this
//                  chapter" (/chat with the container, the chapter and a
//                  hint-first seed; no sign-in), the visible "you will be
//                  talking to an AI tutor" line and the under-13 line;
//                  slot "save" (after the page's practice, only when the
//                  chapter has practice): "Want your practice kept? … Sign
//                  in to save your practice" (Google sign-in, callback =
//                  this page + from=school), with the age line;
//   ready (signed in) → "Practise this chapter — N questions" (POST
//                  /api/mocks/custom with the school flag; N is the
//                  chapter's own checked count, at most 10; no button under
//                  5) and the tutor link, with the AI line. Nothing asked.
// The class variant is one line: open a chapter to read or ask — and to
// practise only when the class has practice (hasPractice). The pages render it
// only for a CBSE / NCERT class with a chapter map.
// Every word comes from src/lib/school/student-copy.ts. No leaderboard,
// streak, challenge, share or teacher piece; nothing stored in the browser.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchSignedIn } from "@/lib/session-hint";
import { schoolChapterMockCount, schoolSignInHref, schoolTutorHref, studentEntryView } from "@/lib/school/student-classes";
import { STUDENT_ENTRY_COPY as C } from "@/lib/school/student-copy";
import { SignUpButton } from "@/components/SignUpButton";

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

export interface SchoolStudentEntryProps {
  /** "chapter": the tutor entry / practice (slot "tutor") or the guest's
   *  save-practice line (slot "save"); "class": one "open a chapter" line. */
  variant: "chapter" | "class";
  /** Chapter variant only. "tutor" (default): the entry before the notes.
   *  "save": after the page's practice — shown to a guest, and only when the
   *  chapter has practice. */
  slot?: "tutor" | "save";
  cls: number;
  examCode: string;
  /** This page's own path — the sign-in callback. */
  pagePath: string;
  topicCode?: string;
  chapterName?: string;
  subjectName?: string;
  /** Checked, servable questions on the chapter (surface count). */
  validatedQuestions?: number;
  /** Class variant only: at least one chapter of the class has checked practice. */
  hasPractice?: boolean;
}

export function SchoolStudentEntry(p: SchoolStudentEntryProps) {
  const router = useRouter();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchSignedIn()
      .then((ok) => {
        if (live) setSignedIn(ok === true);
      })
      .catch(() => {
        if (live) setSignedIn(false);
      });
    return () => {
      live = false;
    };
  }, []);

  const view = studentEntryView({ cls: p.cls, signedIn, validatedQuestions: p.validatedQuestions ?? 0 });
  if (view.kind === "none") return null;

  const slot = p.slot ?? "tutor";
  const signInHref = schoolSignInHref(p.pagePath);

  // ── Class page: one line, "open a chapter" ─────────────────────────
  if (p.variant === "class") {
    return (
      <section aria-labelledby="school-student-entry" className="mt-8 rounded-xl border border-saffron-200 bg-saffron-50/50 p-5">
        <h2 id="school-student-entry" className="text-base font-semibold text-ink-900">
          {C.classHeading(p.cls, p.hasPractice === true)}
        </h2>
        <p className="mt-1 text-sm text-ink-700">
          {p.hasPractice ? (signedIn ? C.classSignedInPractice : C.classGuestPractice) : signedIn ? C.classSignedIn : C.classGuest}
        </p>
      </section>
    );
  }

  // ── Chapter page, after the practice: a guest's save line ──────────
  // Only once the probe says "guest" (never in the SSR / crawler HTML) and
  // only when the chapter has practice to keep.
  if (slot === "save") {
    if (!(signedIn === false && schoolChapterMockCount(p.validatedQuestions ?? 0) !== null)) return null;
    return (
      <div className="mt-6 rounded-xl border border-ink-200 bg-white p-5">
        <p className="text-sm text-ink-700">{C.saveBody}</p>
        {/* 2 Oct 2026 (founder, standing): the one shared button (Google's
            white button with the "G", the one label) in place of the small
            text link. Class 8-12 only (this island renders nothing below
            Class 8), still only AFTER the practice and only for a known
            guest. With a mouse its tooltip carries the school words —
            practice and scores saved; no exam, no tutor memory — and on
            touch the line above already says it. Always /login (not in the
            skip-/login test); the old "school-save-google" beacon is kept. */}
        <SignUpButton
          href={signInHref}
          surface="school-save"
          rel="nofollow"
          explain="tooltip"
          className="mt-3"
          beaconProps={{ examCode: p.examCode }}
          onSignInClick={() => beacon("school-save-google", { examCode: p.examCode, topic: p.topicCode })}
        />
      </div>
    );
  }

  const tutorHref =
    p.topicCode && p.chapterName
      ? schoolTutorHref({ examCode: p.examCode, topicCode: p.topicCode, chapterName: p.chapterName, cls: p.cls, subjectName: p.subjectName ?? "" })
      : null;

  // ── Chapter page, guest (also the SSR / crawler HTML): the tutor ───
  if (view.kind === "guest") {
    return (
      <section aria-labelledby="school-student-entry" className="mt-6 rounded-xl border border-saffron-200 bg-saffron-50/50 p-5">
        <h2 id="school-student-entry" className="text-base font-semibold text-ink-900">
          {C.guestHeading}
        </h2>
        <p className="mt-1 text-sm text-ink-700">{C.guestBody}</p>
        {tutorHref && (
          <Link
            href={tutorHref}
            prefetch={false}
            rel="nofollow"
            onClick={() => beacon("school-tutor", { examCode: p.examCode, topic: p.topicCode, guest: true })}
            className="mt-3 inline-flex items-center justify-center rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
          >
            {C.tutorButton}
          </Link>
        )}
        <p className="mt-3 text-[11px] text-ink-600">{C.aiLine}</p>
        <p className="mt-1 text-[11px] text-ink-500">{schoolChapterMockCount(p.validatedQuestions ?? 0) !== null ? C.under13Practice : C.under13}</p>
      </section>
    );
  }

  // ready (signed in)
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
