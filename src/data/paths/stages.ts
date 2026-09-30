// The life stages, in life order (30 Sep 2026, P1 build 1, spec §1.2 / §1.3).
//
// One row per PathStageId. The labels come from the /career-map LIFECYCLE
// and the home doors; the hubs are existing pages except /after-10th and
// /after-12th (new in this build). "school" may include Class 1-8 readers
// and under-13s, so it is never stored, never beaconed and never gets a
// tutor entry (mayIncludeChildren).
//
// onbStage (filled by build 2's "Save my path" only while User.onbStage is
// null, never overwriting the wizard):
//   after-10th → CLASS_9_10: the reader is choosing what follows Class 10,
//     which the wizard files under "Class 9-10";
//   after-12th → CLASS_11_12; college → UG; working → WORKING;
//   after-graduation and govt-job-prep → null: a graduate may be a final-year
//     student, a master's applicant or working, and a government-job
//     aspirant can be at any stage — the stage alone does not say which.
//
// Stage → scholarship levels (spec §1.3): school → CLASS_9_10; after-10th →
// CLASS_11_12 + DIPLOMA; after-12th and college → UG; after-graduation → PG +
// PHD; the rest none.
//
// STAGE_HUB_FACTS: the confirmed "decision facts" each new hub prints. Every
// one is a rule read on the conducting body's or regulator's own document on
// 30 Sep 2026 (PATH_SOURCES); numbers appear only inside these sourced facts.
//
// Pure data: no DB, clock or React.

import type { PathFact, PathStage, PathStageId } from "./types";
import { PATH_SOURCES as S } from "./sources";

export const PATH_STAGES: readonly PathStage[] = [
  {
    id: "school",
    label: "In school (Class 1-10)",
    shortLabel: "In school",
    hubPath: "/schooling",
    mayIncludeChildren: true,
    onbStage: null,
    scholarshipLevels: ["CLASS_9_10"],
  },
  {
    id: "after-10th",
    label: "After Class 10",
    shortLabel: "After 10th",
    hubPath: "/after-10th",
    mayIncludeChildren: false,
    onbStage: "CLASS_9_10",
    scholarshipLevels: ["CLASS_11_12", "DIPLOMA"],
  },
  {
    id: "after-12th",
    label: "Class 11-12 / After 12th",
    shortLabel: "After 12th",
    hubPath: "/after-12th",
    mayIncludeChildren: false,
    onbStage: "CLASS_11_12",
    scholarshipLevels: ["UG"],
  },
  {
    id: "college",
    label: "In college",
    shortLabel: "College",
    hubPath: "/colleges",
    mayIncludeChildren: false,
    onbStage: "UG",
    scholarshipLevels: ["UG"],
  },
  {
    id: "after-graduation",
    label: "After graduation",
    shortLabel: "After graduation",
    hubPath: "/post-graduation",
    mayIncludeChildren: false,
    onbStage: null,
    scholarshipLevels: ["PG", "PHD"],
  },
  {
    id: "govt-job-prep",
    label: "Preparing for a government job",
    shortLabel: "Government jobs",
    hubPath: "/exams/browse",
    mayIncludeChildren: false,
    onbStage: null,
    scholarshipLevels: [],
  },
  {
    id: "working",
    label: "Working / learning anything",
    shortLabel: "Working",
    hubPath: "/careers",
    mayIncludeChildren: false,
    onbStage: "WORKING",
    scholarshipLevels: [],
  },
];

const confirmed = (text: string, source: PathFact["source"]): PathFact => ({ text, status: "confirmed", source });

/** Decision facts printed on the two new hubs (confirmed only). */
export const STAGE_HUB_FACTS: Readonly<Partial<Record<PathStageId, readonly PathFact[]>>> = {
  "after-10th": [
    confirmed(
      "CBSE treats Class XI and XII as one composite course: the subjects taken in Class XI continue in Class XII. There are no fixed streams; after two languages, students choose electives.",
      S.cbseScheme,
    ),
    confirmed(
      "AICTE diplomas in Engineering and Technology, Applied Arts and Crafts, and Design take 3 years and need a pass in Class 10 (10th Std./SSC).",
      S.aicteAph,
    ),
    confirmed(
      "ITI trades under the Craftsmen Training Scheme take one or two years and are entered after Class VIII or Class X, depending on the trade.",
      S.dgtNiosFaq,
    ),
    confirmed(
      "JEE (Main) 2026 lists, among its qualifying examinations, the Higher Secondary Certificate Vocational Examination, the NIOS Senior Secondary examination with at least five subjects, and an AICTE or State-board diploma of at least 3 years.",
      S.jeeMainBulletin,
    ),
    confirmed(
      "CUET (UG) 2026 lists the same three routes (HSC Vocational, NIOS Senior Secondary with at least five subjects, a diploma of at least 3 years) as qualifying examinations.",
      S.cuetBulletin,
    ),
  ],
  "after-12th": [
    confirmed(
      "B.E./B.Tech seats at NITs, IIITs and other central institutes through JEE (Main) Paper 1 need Class XII with Physics, Mathematics, a language, one of Chemistry, Biotechnology, Biology or a Technical Vocational subject, and one more subject.",
      S.jeeMainBulletin,
    ),
    confirmed(
      "For those NIT-system seats a student also needs at least 75% aggregate in five Class XII subjects (65% for SC, ST and PwD), or a place in the category-wise top 20 percentile of their board.",
      S.jeeMainBulletin,
    ),
    confirmed(
      "NEET (UG) 2026 asks for Physics, Chemistry, Biology or Biotechnology (with practicals) and English. Under NMC's public notice of 22.11.2023, these may be passed as additional subjects after Class 12 from a recognised board.",
      S.neetBulletin,
    ),
    confirmed(
      "CUET (UG) 2026 lets a candidate choose up to five test subjects, including languages and the General Aptitude Test, irrespective of the subjects taken in Class XII; each university sets its own programme rules.",
      S.cuetBulletin,
    ),
    confirmed(
      "CLAT 2027 (UG) asks for 10+2 or an equivalent examination with at least 45% marks (40% for SC, ST and PwD), with no upper age limit.",
      S.clatEligibility,
    ),
    confirmed(
      "NDA and NA (II) 2026: for the Army wing the notice asks for a Class 12 pass of the 10+2 pattern and names no subjects; the Air Force and Naval wings need Physics, Chemistry and Mathematics.",
      S.ndaNotice,
    ),
    confirmed(
      "B.Arch (Council of Architecture rule, quoted in the JEE (Main) 2026 bulletin): Physics and Mathematics compulsory plus one of Chemistry, Biology, a Technical Vocational subject, Computer Science, IT, Informatics Practices, Engineering Graphics or Business Studies, with at least 45% aggregate; or a 10+3 diploma with Mathematics and at least 45%.",
      S.jeeMainBulletin,
    ),
    confirmed(
      "B.Planning through JEE (Main): at least 50% in Mathematics and 50% aggregate in the qualifying examination.",
      S.jeeMainBulletin,
    ),
  ],
};
