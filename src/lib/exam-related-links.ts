// "Related on Shishya" — the exam hub's links into School and Careers
// (26 Sep 2026).
//
// Why: ChatGPT, Bing and Google land students on exam hubs (almost all of
// today's organic traffic), and a hub linked nowhere outside the exam
// section: a JEE or NEET aspirant never learnt that the same site lists the
// NCERT Class 11-12 chapters with the official books, and a career guide
// naming the exam never got a link from it. Every link here goes to a page
// that exists, with a label that says what that page holds:
//   • school subject pages come from the school surface (src/lib/school/
//     surface.ts — the DB read the sitemap uses) and are linked only when
//     the subject has chapters; "notes and practice" is said only for
//     chapters that carry BOTH Shishya's notes and a checked quiz (today the
//     five Class 6 Mathematics chapters), never for a chapter list;
//   • careers come from src/data/careers.ts: a career whose examCodes name
//     this exam, at most three;
//   • at most RELATED_MAX links in all.
// Which school subjects an exam links is a hand-made, relevance-first map:
// class 11-12 PCM for JEE, PCB for NEET UG, class 12 for CUET UG (its
// domain papers follow the class 12 syllabus), mathematics for the maths
// admission tests, class 6-10 mathematics / science for the junior
// olympiads, class 11-12 physics / chemistry / biology for the NSE
// olympiads. Postgraduate and design entrances (GATE, NEET PG, NID, NIFT,
// UCEED) link no school page — a Class 11 chapter list is not what their
// students need.
//
// Pure: the page passes the surface and the careers in, so the unit test
// (tests/unit/exam-related-links.test.ts) runs without a DB.

import {
  CHAPTER_INDEXABLE_MIN_QUESTIONS,
  findSchoolClass,
  schoolSubjectPath,
  schoolSubjectSlug,
  type SchoolSurface,
} from "@/lib/school/surface";

export interface RelatedLink {
  href: string;
  label: string;
}

export const RELATED_MAX = 8;
export const RELATED_CAREERS_MAX = 3;

interface SchoolPlan {
  classes: readonly number[];
  subjects: readonly string[];
}

const PCM = ["PHYSICS", "CHEMISTRY", "MATHEMATICS"] as const;
const PCB = ["PHYSICS", "CHEMISTRY", "BIOLOGY"] as const;
const SENIOR = [11, 12] as const;
const JUNIOR = [6, 7, 8, 9, 10] as const;

/** Exam code → the CBSE (NCERT) subject pages its hub links. */
export const SCHOOL_LINK_PLAN: Readonly<Record<string, SchoolPlan>> = {
  JEE_MAIN: { classes: SENIOR, subjects: PCM },
  JEE_ADVANCED: { classes: SENIOR, subjects: PCM },
  NEET_UG: { classes: SENIOR, subjects: PCB },
  CUET_UG: { classes: [12], subjects: [...PCM, "BIOLOGY"] },
  CMI_ADMISSION: { classes: SENIOR, subjects: ["MATHEMATICS"] },
  ISI_BSTAT: { classes: SENIOR, subjects: ["MATHEMATICS"] },
  NATA: { classes: SENIOR, subjects: ["MATHEMATICS"] },
  NDA: { classes: SENIOR, subjects: ["MATHEMATICS", "PHYSICS", "CHEMISTRY"] },
  IOQM: { classes: JUNIOR, subjects: ["MATHEMATICS"] },
  SOF_IMO: { classes: JUNIOR, subjects: ["MATHEMATICS"] },
  SZF_IOM: { classes: JUNIOR, subjects: ["MATHEMATICS"] },
  SOF_NSO: { classes: JUNIOR, subjects: ["SCIENCE"] },
  SZF_IOS: { classes: JUNIOR, subjects: ["SCIENCE"] },
  NSEJS: { classes: [8, 9, 10], subjects: ["SCIENCE", "MATHEMATICS"] },
  NSTSE: { classes: JUNIOR, subjects: ["MATHEMATICS"] },
  NSEP: { classes: SENIOR, subjects: ["PHYSICS"] },
  NSEC: { classes: SENIOR, subjects: ["CHEMISTRY"] },
  NSEB: { classes: SENIOR, subjects: ["BIOLOGY"] },
  NSEA: { classes: SENIOR, subjects: ["PHYSICS", "MATHEMATICS"] },
};

/** "PHYSICS" → "Physics", "SOCIAL_SCIENCE" → "Social Science". */
function subjectWord(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

/** The CBSE subject pages an exam's hub links, in plan order (class, then
 *  subject). A subject the surface does not hold, or holds with no chapter,
 *  is left out. */
export function relatedSchoolLinks(code: string, surface: Pick<SchoolSurface, "classes">): RelatedLink[] {
  const plan = SCHOOL_LINK_PLAN[code];
  if (!plan) return [];
  const out: RelatedLink[] = [];
  for (const cls of plan.classes) {
    const c = findSchoolClass(surface, "cbse", cls);
    if (!c) continue;
    for (const subjectCode of plan.subjects) {
      const s = c.subjects.find((x) => x.code === subjectCode);
      if (!s || s.chapters.length === 0) continue;
      const both = s.chapters.filter((ch) => ch.hasNotes && ch.validatedQuestions >= CHAPTER_INDEXABLE_MIN_QUESTIONS).length;
      const what =
        both > 0
          ? `chapter list with the official books; Shishya notes and practice for ${both} ${both === 1 ? "chapter" : "chapters"}`
          : "chapter list with the official books";
      out.push({
        href: schoolSubjectPath("cbse", cls, s.slug || schoolSubjectSlug(s.code)),
        label: `NCERT Class ${cls} ${subjectWord(s.code)} — ${what}`,
      });
    }
  }
  return out;
}

/** Career guides whose examCodes name this exam, at most `max`. */
export function relatedCareerLinks(
  code: string,
  careers: readonly { slug: string; name: string; examCodes?: readonly string[] }[],
  max: number = RELATED_CAREERS_MAX,
): RelatedLink[] {
  return careers
    .filter((c) => (c.examCodes ?? []).includes(code))
    .slice(0, Math.max(0, max))
    .map((c) => ({ href: `/careers/${c.slug}`, label: `${c.name} — career guide` }));
}

/** The whole block: careers keep up to three places, school pages fill the
 *  rest, RELATED_MAX in all. */
export function relatedLinks(
  code: string,
  surface: Pick<SchoolSurface, "classes">,
  careers: readonly { slug: string; name: string; examCodes?: readonly string[] }[],
  max: number = RELATED_MAX,
): RelatedLink[] {
  const careerLinks = relatedCareerLinks(code, careers, Math.min(RELATED_CAREERS_MAX, max));
  const school = relatedSchoolLinks(code, surface).slice(0, Math.max(0, max - careerLinks.length));
  return [...school, ...careerLinks];
}
