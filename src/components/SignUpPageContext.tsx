"use client";

// What this page tells the "Sign up with Google" placements on it
// (2 Oct 2026 — src/lib/signup-page-data.ts has the why). It renders nothing:
// after mount it writes the facts its server page already holds, under this
// page's path, and takes them back when the page goes. The header, the site
// card, the timed bar, the early line and the doors on the page read them, so
// they can name the exam and say what is true of it (src/lib/signup-place.ts)
// — and so the four page-wide placements say one sentence on one page.
//
// No server HTML, no storage, no request. Without it a page gets the
// sentence that names nothing.
//
// A LAYOUT effect (2 Oct 2026 review): the facts are in place before the
// browser paints, so a button whose words are already in memory (a move from
// another page) never shows one frame of the weaker sentence first.

import { useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { clearSignUpPageData, setSignUpPageData } from "@/lib/signup-page-data";
import type { SignUpPageData, SignUpPractice } from "@/lib/signup-place";

export function SignUpPageContext({
  exam,
  code,
  practice,
  olympiad,
  notes,
  topicQuestions,
  mockGate,
}: {
  /** The exam's short name and code (both, or the exam is not named). */
  exam?: string | null;
  code?: string | null;
  /** "canServe" / "none"; leave out when it is not known. */
  practice?: SignUpPractice | null;
  olympiad?: boolean | null;
  /** A topic page: it has notes. A syllabus page: a topic on it has notes. */
  notes?: boolean | null;
  /** A topic page without notes: the topic's checked questions. */
  topicQuestions?: number | null;
  /** The signed-out mock page rendered its sign-in gate. */
  mockGate?: boolean | null;
}) {
  const pathname = usePathname();
  useLayoutEffect(() => {
    let path = pathname;
    try {
      path = window.location.pathname;
    } catch {
      /* the router's path */
    }
    if (!path) return;
    const data: SignUpPageData = { exam, code, practice, olympiad, notes, topicQuestions, mockGate };
    setSignUpPageData(path, data);
    return () => clearSignUpPageData(path, data);
  }, [pathname, exam, code, practice, olympiad, notes, topicQuestions, mockGate]);
  return null;
}
