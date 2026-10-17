// The "talk to a mentor" request on the Student-360 report (/me/report,
// src/components/MentorRequestCard.tsx, POST /api/mentor-sessions) — who may
// open one, and the words it says (17 Oct 2026, under-13 safety + honesty).
//
// WHO: never in a kids' context. The request stores a note and the consent to
// show the student's whole preparation report to a mentor, and the founder
// rule is that a child under 13 gives us no data. A kids' exam (src/lib/
// signin-cta.ts under13ExamGuard — SOF, Silverzone, NSTSE, PRIL, ZIO, JNVST;
// children from Class 1 sit them) closes it when it is the report's exam OR
// one of the account's active exams ("kids' goals"). One of the 4 requests
// still NEW on 17 Oct 2026 came from a SOF IMO report (SELECT-only read).
// Class 1-7 school pages never reach it (no school page links the report,
// and a Class 1-7 container never holds an enrolment). The "Talk to a
// mentor" callback form (src/components/TalkToTeacher.tsx) has its own guard
// by exam code, and /api/teacher-request refuses the code too; on the
// dashboard, whose doors are keyed to the weakest topic's exam or to no exam
// (the educator's doubt form), an account holding a kids' goal gets neither
// (holdsKidsGoal).
//
// WORDS: only what the product keeps. On 17 Oct 2026 the card promised that
// "a mentor who has cleared this path will pick up your request and reach
// you by email", and "a real person who has cleared this exam" — while 4
// requests had waited 5 to 48 days with none taken, and the one approved
// mentor (the founder) had applied for one exam (IBPS Clerk) and can take a
// request for any exam (src/app/mentor/page.tsx lists every NEW request).
// Now: the network is small, a mentor takes requests as they are available,
// there is no set time, there may be no mentor for the exam yet — and when
// one takes it, the student gets an email with the session link (that email
// is sent by PATCH /api/mentor-sessions/[id] "take", to the account's email)
// and the room shows on the report. For a later session (one DONE before)
// that mail carries the ₹9 payment link instead, and the room opens on the
// report once it is paid — so the words say so (review, same day).
//
// Pure: no React, no DB. Tests: tests/unit/mentor-request.test.ts.

import { under13ExamGuard } from "@/lib/signin-cta";

/** A kids' exam code, checked as given and upper-cased. */
function isKidsCode(c: string | null | undefined): boolean {
  return typeof c === "string" && (under13ExamGuard(c) || under13ExamGuard(c.trim().toUpperCase()));
}

/** True when one of the account's active exams is a kids' exam — the
 *  "kids' goal" that also hides the dashboard's "Talk to a mentor" doors
 *  (the weak-areas link and the educator's doubt form: both take a phone
 *  number, name, email and city). */
export function holdsKidsGoal(goalCodes: readonly (string | null | undefined)[] | null | undefined): boolean {
  return (goalCodes ?? []).some(isKidsCode);
}

/** True when a new mentor request may be offered and stored: the report's
 *  exam is not a kids' exam and none of the account's active exams is one. */
export function mentorRequestOpen(i: { examCode?: string | null; goalCodes?: readonly (string | null | undefined)[] | null }): boolean {
  return !isKidsCode(i.examCode) && !holdsKidsGoal(i.goalCodes);
}

/** The card's words (English, as the report page is). */
export const MENTOR_REQUEST_COPY = {
  formTitle: "🤝 Ask for a mentor session — free",
  formBody:
    "Mentors are real people on Shishya's mentor network, which is new and small. A mentor takes requests as they are available, so there is no set waiting time, and there may be no mentor for your exam yet. When a mentor takes your request, you get an email with the session link — for a later session, with the ₹9 step that unlocks it.",
  fee: "Your first session is free. Later sessions are ₹9 — only for the mentor's time, never for the platform: everything you use on Shishya stays free forever.",
  sentTitle: "✅ Request sent",
  sentBody:
    "Your request is waiting for a mentor. Mentors take requests as they are available — there is no set time, and it can take a while. When a mentor takes it, you get an email with the session link — for a later session, the ₹9 step that unlocks it — and it shows on this page. Your report goes with the request, so the talk starts from what you need.",
} as const;
