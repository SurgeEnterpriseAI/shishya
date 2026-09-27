// School tutor scope (26 Sep 2026) — which school container a chat may open
// the AI tutor on, and nothing else.
//
// Founder decision, 26 Sep 2026: classes whose students are 13 and above —
// Class 8 to 12 (NCERT_C08..C12, CISCE_C08..C12) — get the AI tutor and
// practice on their school pages; Classes 1-7 stay content + no-account
// practice only. The class rule itself is the shared one in
// src/lib/school/student-classes.ts (studentModeClassOfExamCode), so the
// chapter page's "Ask the AI tutor" link, the enrolment door and this chat
// entry can never disagree on which classes are open.
//
// Guests too since 27 Sep 2026 (founder, content first): the safeguards come
// from the context — the school persona, the study-only pre-filter
// (src/lib/chat-scope.ts) and the daily cap (per account, or per browser for
// a guest) — not from sign-in or a declaration. Nobody is asked an age band.
//
// How the exam-scoped chat machinery is reused: POST /api/chat and
// /chat look a real exam up with realExamKey() (src/lib/db/exam-scope.ts),
// under which a SCHOOL_BOARD row is an unknown exam (404). On a Class 8-12
// container, schoolStudentExamKey() gives the category-pinned key instead
// (SCHOOL_CONTAINER_WHERE: the containers are inactive by design and are
// never read by `active`), and the route loads the class through
// src/lib/school/tutor-context.ts. Classes 1-7 get null here and fall
// through to realExamKey() — 404, signed in or not.
//
// Pure: no DB, no React. Tests: tests/unit/school-tutor.test.ts.

import { SCHOOL_CATEGORY } from "@/lib/db/exam-scope";
import { isStudentModeClass, studentModeClassOfExamCode } from "./student-classes";
import type { SchoolUiLang } from "./tutor-cap";

/** Where the tutor may take a school student: Class 8-12 only. */
export const SCHOOL_TUTOR_MIN_CLASS = 8;

/** The category-pinned lookup key of a school container. */
export interface SchoolStudentExamKey {
  category: typeof SCHOOL_CATEGORY;
  code: string;
  /** 8-12 */
  cls: number;
}

/**
 * The lookup key for the school tutor's container, or null when the chat
 * must treat the code as an unknown exam: a Class 1-7 container, a real
 * exam's code, garbage. Guests too since 27 Sep 2026 (founder, content
 * first): the safeguards come from the context — the school persona, the
 * study-only pre-filter and the daily cap — not from sign-in or a
 * declaration.
 */
export function schoolStudentExamKey(args: { code: string | null | undefined }): SchoolStudentExamKey | null {
  if (!args.code) return null;
  const cls = studentModeClassOfExamCode(args.code);
  if (cls === null || !isStudentModeClass(cls)) return null;
  return { category: SCHOOL_CATEGORY, code: args.code, cls };
}

/** True when this chat request is for a school container the tutor serves
 *  (Class 8-12, guest or signed in — 27 Sep 2026). */
export function isSchoolTutorRequest(args: { code: string | null | undefined }): boolean {
  return schoolStudentExamKey(args) !== null;
}

// ── A declared 13-17 student and the exam tutor (26 Sep 2026, fixer review) ──
// 27 Sep 2026: nobody is asked the band any more; an account that declared
// 13-17 before then keeps this rule (its stored band is never deleted).
// The age band (src/lib/school/student-classes.ts) is answered once on a
// school page; until this review it was read only inside the school branch,
// so /chat?general=1, plain /chat and every /chat?examCode=<real exam> gave a
// declared minor the ADULT tutor: the exam persona (iCall / Vandrevala, no
// hint-first rule, no "never ask for a name or phone" rule), tool use, no
// daily cap, the "talk to a teacher" phone form — and a real-exam chat
// enrolled the child on that exam, out of "school-only" and into the exam
// mail audiences. Now a declared 13-17 account gets the school tutor ONLY:
// /chat sends it to its class chat, and POST /api/chat refuses a general or
// real-exam turn with the line below (an error event, before enrolment, before
// any write, no model call). Adult school bands (18+, parent, teacher) keep
// the exam tutor. Founder call if a minor should ever get the exam tutor: the
// gate is one condition in each file (isMinorBand).

/** The `code` on the error event of a refused general / exam turn. */
export const SCHOOL_ONLY_TUTOR_CODE = "school-only-tutor";

/** The line a declared 13-17 student sees on the general or an exam chat. */
export const SCHOOL_ONLY_TUTOR_COPY: Record<SchoolUiLang, string> = {
  en: "Your tutor is on your class pages — open the chapter you are studying and ask from there.",
  hi: "आपका ट्यूटर आपकी कक्षा के पेजों पर है — जो अध्याय पढ़ रहे हैं उसे खोलें और वहीं से पूछें।",
  te: "మీ ట్యూటర్ మీ తరగతి పేజీల్లో ఉంది — మీరు చదువుతున్న అధ్యాయాన్ని తెరిచి అక్కడి నుంచి అడగండి.",
};

/** The class chat a declared 13-17 account is sent to: the class of the
 *  request when it is one the account confirmed, else its first class. */
export function schoolOnlyChatPath(classCodes: readonly string[], requested: string | null | undefined): string {
  const code = requested && classCodes.includes(requested) ? requested : classCodes[0];
  return `/chat?examCode=${encodeURIComponent(code)}`;
}

/** The SSE error event of a refused turn: the localised line, the stable
 *  code, and `next` = the class chat. No meta frame (no conversation). */
export function schoolOnlyTutorErrorFrame(next: string, lang: SchoolUiLang): string {
  return `event: error\ndata: ${JSON.stringify({ error: SCHOOL_ONLY_TUTOR_COPY[lang], code: SCHOOL_ONLY_TUTOR_CODE, next })}\n\n`;
}
