// Student mode on school pages (26 Sep 2026) — the pure rules.
//
// Founder decision (26 Sep 2026): classes whose students are 13 and above —
// Class 8 to 12 (NCERT_C08..C12, CISCE_C08..C12) — get student sign-in, the
// AI tutor and account practice on their school pages. Classes 1-7 stay
// content + no-account practice only. Everything that decides "is this a
// student-mode class / container", "has this account answered the age
// band", "how many questions does a chapter practice hold" and "where do
// the sign-in and tutor links go" lives here, so the chapter page, the
// class page, the enrolment door (src/lib/db/enrollment.ts), the mock
// builders and the profile route cannot disagree.
//
// Age band (Anthropic usage policy for minors applies to the tutor NOW;
// DPDP child rules from ~May 2027 — see the 25 Sep rules lens): every school
// sign-in entry carries the line "for students 13 and above", and the first
// school sign-in asks a one-time self-declared band — 13-17 student / 18+
// student / parent / teacher. It is stored in EXISTING User fields, no
// migration:
//   • User.onbStage  = the band, in the wizard's own vocabulary:
//       a 13-17 student → CLASS_8 | CLASS_9_10 | CLASS_11_12 (from the class
//       of the container they signed in on — CLASS_8 is new; the wizard's
//       Class 9-10 / 11-12 values are reused as they are);
//       an 18+ student → SCHOOL_ADULT; a parent → SCHOOL_PARENT; a teacher →
//       SCHOOL_TEACHER.
//   • User.onbPrepCodes gains the container code (NCERT_C09 …) — "exam codes
//     the user is targeting" — and that code is the MARKER that the band was
//     answered: only the school flow writes a school container there (the
//     wizard validates its codes against real exams and keeps existing
//     school codes). A wizard-only CLASS_9_10 user never declared an age, so
//     schoolBandOfProfile() is null for them until they answer the card.
//
// Pure and import-free: the client island (src/components/school/
// SchoolStudentEntry.tsx) bundles this file, so nothing here may reach
// @prisma/client — the three facts it needs from src/lib/db/exam-scope.ts,
// src/lib/school/scope.ts and surface.ts (the category name, the container
// code shape, the guest quiz minimum) are restated here and pinned equal by
// tests/unit/school-student-mode.test.ts.
// Tests: tests/unit/school-student-mode.test.ts

/** = SCHOOL_CATEGORY (src/lib/db/exam-scope.ts). */
const SCHOOL_CATEGORY_NAME = "SCHOOL_BOARD";
/** = the container code shape src/lib/school/surface.ts parses (NCERT_Cnn / CISCE_Cnn). */
const CONTAINER_CODE = /^(NCERT|CISCE)_C(0[1-9]|1[0-2])$/;
/** = SCHOOL_GUEST_QUIZ_MIN (src/lib/school/scope.ts) = MIN_SERVED_QUESTIONS (src/lib/served-paper.ts). */
const CHAPTER_PRACTICE_MIN = 5;

function isSchoolCategory(category: string | null | undefined): boolean {
  return String(category ?? "").toUpperCase() === SCHOOL_CATEGORY_NAME;
}

/** NCERT_C06 → 6; null when the code is not a school container code. */
export function schoolContainerClassOf(code: string): number | null {
  const m = CONTAINER_CODE.exec(code);
  return m ? Number(m[2]) : null;
}

/** The first class whose students are 13 and above (Class 8 ≈ age 13). */
export const STUDENT_MODE_MIN_CLASS = 8;
export const STUDENT_MODE_MAX_CLASS = 12;

/** Class 8-12: the classes with student sign-in, the tutor and practice. */
export function isStudentModeClass(cls: number): boolean {
  return Number.isInteger(cls) && cls >= STUDENT_MODE_MIN_CLASS && cls <= STUDENT_MODE_MAX_CLASS;
}

/** NCERT_C09 → 9 when that is a student-mode class; null for NCERT_C05, a
 *  real exam code, or anything else. */
export function studentModeClassOfExamCode(code: string): number | null {
  const cls = schoolContainerClassOf(code);
  return cls !== null && isStudentModeClass(cls) ? cls : null;
}

/** True for a school container whose class is 8-12 — the ONLY school rows
 *  that may hold an Enrollment, a personal mock or a tutor chat. A real
 *  exam is false here too (it is not a school container). */
export function isStudentModeContainer(exam: { code: string; category: string }): boolean {
  return isSchoolCategory(exam.category) && studentModeClassOfExamCode(exam.code) !== null;
}

// ── Age band ──────────────────────────────────────────────────────────

export const SCHOOL_BANDS = ["STUDENT_13_17", "STUDENT_18", "PARENT", "TEACHER"] as const;
export type SchoolBand = (typeof SCHOOL_BANDS)[number];

export function isSchoolBand(v: unknown): v is SchoolBand {
  return typeof v === "string" && (SCHOOL_BANDS as readonly string[]).includes(v);
}

/** onbStage values only the school flow writes. */
export const SCHOOL_ADULT_STAGE = "SCHOOL_ADULT";
export const SCHOOL_PARENT_STAGE = "SCHOOL_PARENT";
export const SCHOOL_TEACHER_STAGE = "SCHOOL_TEACHER";
/** The wizard's class stages a 13-17 student maps to (CLASS_8 is new). */
export const STUDENT_STAGES = ["CLASS_8", "CLASS_9_10", "CLASS_11_12"] as const;

/** The onbStage for a 13-17 student of this class. */
export function studentStageForClass(cls: number): (typeof STUDENT_STAGES)[number] {
  if (cls <= 8) return "CLASS_8";
  if (cls <= 10) return "CLASS_9_10";
  return "CLASS_11_12";
}

/** The User.onbStage value the school band card writes. */
export function schoolStageForBand(band: SchoolBand, cls: number): string {
  switch (band) {
    case "STUDENT_13_17":
      return studentStageForClass(cls);
    case "STUDENT_18":
      return SCHOOL_ADULT_STAGE;
    case "PARENT":
      return SCHOOL_PARENT_STAGE;
    case "TEACHER":
      return SCHOOL_TEACHER_STAGE;
  }
}

/** The band a stored onbStage means, or null for any other stage (UG, PG,
 *  WORKING, OTHER, null …). */
export function schoolBandOfStage(stage: string | null | undefined): SchoolBand | null {
  if (!stage) return null;
  if ((STUDENT_STAGES as readonly string[]).includes(stage)) return "STUDENT_13_17";
  if (stage === SCHOOL_ADULT_STAGE) return "STUDENT_18";
  if (stage === SCHOOL_PARENT_STAGE) return "PARENT";
  if (stage === SCHOOL_TEACHER_STAGE) return "TEACHER";
  return null;
}

export interface SchoolProfileFields {
  onbStage: string | null;
  onbPrepCodes: readonly string[] | null;
}

export interface SchoolBandProfile {
  band: SchoolBand;
  /** The student-mode container codes the account confirmed (NCERT_C09 …). */
  classCodes: string[];
}

/** The student-mode container codes among a profile's prep codes. */
export function studentModeCodesOf(codes: readonly string[] | null | undefined): string[] {
  return (codes ?? []).filter((c) => studentModeClassOfExamCode(c) !== null);
}

/** null until the account answered the school age-band card: a student-mode
 *  container code in onbPrepCodes (the marker only the school flow writes)
 *  AND a stage the school flow could have written. A wizard-only account
 *  with onbStage CLASS_9_10 and no school code is null — it never declared
 *  an age. A stage the wizard later overwrote (UG …) is null again: the
 *  card is asked once more rather than assumed. */
export function schoolBandOfProfile(p: SchoolProfileFields | null | undefined): SchoolBandProfile | null {
  if (!p) return null;
  const classCodes = studentModeCodesOf(p.onbPrepCodes);
  if (classCodes.length === 0) return null;
  const band = schoolBandOfStage(p.onbStage);
  return band ? { band, classCodes } : null;
}

/** The band is a minor's (13-17) — what the DPDP layer will key on. */
export function isMinorBand(band: SchoolBand | null | undefined): boolean {
  return band === "STUDENT_13_17";
}

// ── Chapter practice size ─────────────────────────────────────────────

/** A chapter practice set holds up to this many of the chapter's checked questions. */
export const SCHOOL_CHAPTER_MOCK_MAX = 10;
/** Below this many checked questions there is no practice button (= SCHOOL_GUEST_QUIZ_MIN). */
export const SCHOOL_CHAPTER_MOCK_MIN = CHAPTER_PRACTICE_MIN;

/** How many questions "Practise this chapter" builds from `validated`
 *  checked questions: the honest number (all of them under 10), or null
 *  when the chapter has fewer than the guest quiz minimum — then there is
 *  no button at all, never a padded set. The same 5 the guest quiz and the
 *  served-paper rule (src/lib/served-paper.ts MIN_SERVED_QUESTIONS) use. */
export function schoolChapterMockCount(validated: number): number | null {
  if (!Number.isFinite(validated) || validated < CHAPTER_PRACTICE_MIN) return null;
  return Math.min(SCHOOL_CHAPTER_MOCK_MAX, Math.floor(validated));
}

// ── Links ─────────────────────────────────────────────────────────────

/** The query flag the sign-in callback carries back to a school page. */
export const SCHOOL_RETURN_PARAM = "from";
export const SCHOOL_RETURN_VALUE = "school";

/** The sign-in callback: the page itself + from=school. Same-origin path only. */
export function schoolReturnPath(pagePath: string): string {
  const safe = /^\/(?!\/|\\)/.test(pagePath) ? pagePath : "/schooling";
  return `${safe}${safe.includes("?") ? "&" : "?"}${SCHOOL_RETURN_PARAM}=${SCHOOL_RETURN_VALUE}`;
}

/** "/login?callbackUrl=<page>?from=school" — Google sign-in, back to the
 *  chapter or class page the student was on. */
export function schoolSignInHref(pagePath: string): string {
  return `/login?callbackUrl=${encodeURIComponent(schoolReturnPath(pagePath))}`;
}

/** True when the page URL carries the sign-in return flag. */
export function isSchoolReturn(search: string | null | undefined): boolean {
  try {
    return new URLSearchParams(search ?? "").get(SCHOOL_RETURN_PARAM) === SCHOOL_RETURN_VALUE;
  } catch {
    return false;
  }
}

/** The seed the "Ask the AI tutor about this chapter" link opens with: the
 *  chapter named, hint-first framing, no personal detail asked for. */
export function schoolTutorSeed(i: { chapterName: string; cls: number; subjectName: string }): string {
  return `Help me understand "${i.chapterName}" (Class ${i.cls} ${i.subjectName}) step by step. Start with what the chapter is about in simple words, then ask me one question to check what I already know.`;
}

/** "/chat?examCode=NCERT_C09&topicCode=…&seed=…" — the school tutor entry
 *  for a signed-in student of a student-mode class (the chat route reads the
 *  container and the chapter; src/app/api/chat/route.ts owns the persona).
 *  `seed` replaces the default opening line (the results page passes the
 *  attempt's own). */
export function schoolTutorHref(i: { examCode: string; topicCode: string; chapterName: string; cls: number; subjectName: string }, seed?: string): string {
  const q = new URLSearchParams({ examCode: i.examCode, topicCode: i.topicCode, seed: seed ?? schoolTutorSeed(i) });
  return `/chat?${q.toString()}`;
}

/** True when a sign-in callback URL (absolute or a path) returns to a
 *  school page (/schooling…) or to the school tutor (/chat?examCode=<school
 *  container>). 26 Sep 2026 (fixer): NextAuth's createUser event reads the
 *  callback-url cookie through this so a FIRST sign-in from a school page
 *  sends no exam-prep welcome mail (src/lib/auth.ts) — it fires before the
 *  age band exists, so where the sign-in returns to is the only signal.
 *  Any school container counts (a Class 6 return is still the school
 *  surface). Unparseable or empty → false: the exam welcome is the default
 *  and the school skip needs a positive match. The host is not checked —
 *  NextAuth's redirect callback already refused a foreign origin before the
 *  cookie was written. */
export function isSchoolSignInCallback(url: string | null | undefined): boolean {
  if (typeof url !== "string" || url.length === 0) return false;
  let u: URL;
  try {
    u = new URL(url, "https://shishya.in");
  } catch {
    return false;
  }
  const p = u.pathname;
  if (p === "/schooling" || p.startsWith("/schooling/")) return true;
  if (p === "/chat" || p === "/chat/") return schoolContainerClassOf(u.searchParams.get("examCode") ?? "") !== null;
  return false;
}

// ── What the entry shows ───────────────────────────────────────────────

export type StudentEntryView =
  /** Not a student-mode class: the page renders nothing of this. */
  | { kind: "none" }
  /** The sign-in CTA with the age line. */
  | { kind: "signed-out" }
  /** Signed in, band not answered yet: the age-band card. */
  | { kind: "band-card" }
  /** Signed in and answered: the tutor entry and, when the chapter has enough
   *  checked questions, the practice button with its honest count. */
  | { kind: "ready"; practiceCount: number | null; band: SchoolBand };

/** ONE decision for the chapter / class entry, so the island and the tests
 *  agree. `signedIn` null = not known yet (before the session probe). */
export function studentEntryView(i: {
  cls: number;
  signedIn: boolean | null;
  band: SchoolBand | null;
  validatedQuestions: number;
}): StudentEntryView {
  if (!isStudentModeClass(i.cls)) return { kind: "none" };
  if (!i.signedIn) return { kind: "signed-out" };
  if (!i.band) return { kind: "band-card" };
  return { kind: "ready", practiceCount: schoolChapterMockCount(i.validatedQuestions), band: i.band };
}
