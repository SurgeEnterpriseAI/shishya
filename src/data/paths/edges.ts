// Typed edges of the path graph (30 Sep 2026, P1 build 1, spec §1.1-§1.2).
//
// Two kinds of edge:
//   • hand-written stream edges (STREAM_EDGES): what an option after Class 10
//     keeps open or closes. Each one states a rule, so each carries the
//     official document it was read in (30 Sep 2026) and a note in our own
//     words with no digits. Where a rule has an escape hatch, the edge is NOT
//     "closes": NMC lets Physics, Chemistry, Biology and English be passed as
//     additional subjects after Class 12, so no option "closes" NEET — the
//     stream pages print that fact instead;
//   • derived edges, built from the other registry files so they cannot
//     drift: the stage chain, stage → option / family, option → family (with
//     the family's rule when one was read, else a plain "leads-to"), exam →
//     family, family → college stream, family → career category, and exam →
//     career from careers.ts examCodes (only for exams in PATH_EXAMS).
//
// No numbers in any note; a rule's numbers live in the sourced PathFacts.
// Pure: data files only (careers.ts is plain data).

import { CAREERS } from "@/data/careers";
import type { PathEdge, PathNodeId, PathSource, StreamOptionSlug } from "./types";
import { PATH_STAGE_IDS } from "./types";
import { PATH_SOURCES as S } from "./sources";
import { STREAM_OPTIONS } from "./streams";
import { COURSE_FAMILIES, COURSE_FAMILY_DETAILS } from "./course-families";
import { PATH_EXAMS } from "./exams";

const keeps = (from: StreamOptionSlug, to: PathNodeId, note: string, source: PathSource): PathEdge => ({
  from: `stream:${from}`,
  to,
  kind: "keeps-open",
  note,
  source,
});
const closes = (from: StreamOptionSlug, to: PathNodeId, note: string, source: PathSource, label?: string): PathEdge => ({
  from: `stream:${from}`,
  to,
  kind: "closes",
  note,
  source,
  ...(label ? { label } : {}),
});

const N_CUET = "Open to any Class 12 stream; each university sets its own programme rules.";
const N_CLAT = "No stream is named for the UG programme.";
const N_NDA_ARMY = "Only the Army wing: its rule asks for a Class 12 pass and names no subjects.";
const N_JEE_ADV_CLOSED = "JEE Advanced needs Physics, Chemistry and Mathematics in Class 12.";
const N_ENGG_CLOSED = "B.Tech seats at NITs, IIITs and other central institutes need Physics and Mathematics in Class 12.";
const N_BARCH_CLOSED = "B.Arch needs Physics and Mathematics in Class 12.";

// 30 Sep 2026 (review fix): a "closes" line prints what its note covers, not
// the whole course family. The engineering note covers only the NIT-system
// seats (AP EAPCET still takes BiPC for B.Tech Biotechnology, a fact the
// BiPC page prints), and the architecture note covers B.Arch only —
// B.Planning asks for Mathematics alone (F_BPLAN), which MEC, Kerala course
// 36, UP Mathematics and Bihar arts Mathematics all offer.
const L_ENGG_CLOSED = "B.E./B.Tech at NITs, IIITs and other central institutes (JEE Main)";
const L_BARCH_CLOSED = "B.Arch (Council of Architecture rule)";

/** What each option keeps open or closes — every edge sourced. */
export const STREAM_EDGES: readonly PathEdge[] = [
  // MPC / PCM
  keeps("mpc-pcm", "exam:JEE_MAIN", "Physics and Mathematics in Class 12 keep the B.Tech seats at NITs, IIITs and other central institutes open.", S.jeeMainBulletin),
  keeps("mpc-pcm", "exam:JEE_ADVANCED", "Physics, Chemistry and Mathematics are compulsory in Class 12.", S.jeeAdvancedEligibility),
  keeps("mpc-pcm", "exam:NDA", "All three wings stay open, including the Air Force and Navy.", S.ndaNotice),
  keeps("mpc-pcm", "exam:MH_MHTCET", "MHT-CET has a PCM group paper.", S.mhtCetBrochure),
  keeps("mpc-pcm", "exam:CUET_UG", N_CUET, S.cuetBulletin),
  keeps("mpc-pcm", "exam:CLAT", N_CLAT, S.clatEligibility),

  // BiPC / PCB
  keeps("bipc-pcb", "exam:NEET_UG", "Physics, Chemistry and Biology, with English, are the subjects NEET UG asks for.", S.neetBulletin),
  keeps("bipc-pcb", "exam:MH_MHTCET", "MHT-CET has a PCB group paper.", S.mhtCetBrochure),
  keeps("bipc-pcb", "exam:AP_EAMCET", "The agriculture and pharmacy stream of AP EAPCET takes Biology, Physics and Chemistry.", S.apEapcetAgriPharma),
  keeps("bipc-pcb", "exam:NDA", "The Army wing stays open; the Air Force and Navy wings need Mathematics too.", S.ndaNotice),
  keeps("bipc-pcb", "exam:CUET_UG", N_CUET, S.cuetBulletin),
  keeps("bipc-pcb", "exam:CLAT", N_CLAT, S.clatEligibility),
  closes("bipc-pcb", "exam:JEE_ADVANCED", N_JEE_ADV_CLOSED, S.jeeAdvancedEligibility),
  closes("bipc-pcb", "course:engineering", N_ENGG_CLOSED, S.jeeMainBulletin, L_ENGG_CLOSED),
  closes("bipc-pcb", "course:architecture", N_BARCH_CLOSED, S.jeeMainBulletin, L_BARCH_CLOSED),

  // PCMB
  keeps("pcmb", "exam:JEE_MAIN", "Physics and Mathematics in Class 12 keep the B.Tech seats at NITs, IIITs and other central institutes open.", S.jeeMainBulletin),
  keeps("pcmb", "exam:JEE_ADVANCED", "Physics, Chemistry and Mathematics are compulsory in Class 12.", S.jeeAdvancedEligibility),
  keeps("pcmb", "exam:NEET_UG", "Physics, Chemistry and Biology, with English, are the subjects NEET UG asks for.", S.neetBulletin),
  keeps("pcmb", "exam:NDA", "All three wings stay open, including the Air Force and Navy.", S.ndaNotice),
  keeps("pcmb", "exam:MH_MHTCET", "Both the PCM and the PCB group papers stay open.", S.mhtCetBrochure),
  keeps("pcmb", "exam:CUET_UG", N_CUET, S.cuetBulletin),
  keeps("pcmb", "exam:CLAT", N_CLAT, S.clatEligibility),

  // Commerce
  keeps("commerce-cec-mec", "exam:CUET_UG", N_CUET, S.cuetBulletin),
  keeps("commerce-cec-mec", "exam:CLAT", N_CLAT, S.clatEligibility),
  keeps("commerce-cec-mec", "exam:NDA", N_NDA_ARMY, S.ndaNotice),
  closes("commerce-cec-mec", "exam:JEE_ADVANCED", N_JEE_ADV_CLOSED, S.jeeAdvancedEligibility),
  closes("commerce-cec-mec", "course:engineering", N_ENGG_CLOSED, S.jeeMainBulletin, L_ENGG_CLOSED),
  closes("commerce-cec-mec", "course:architecture", N_BARCH_CLOSED, S.jeeMainBulletin, L_BARCH_CLOSED),

  // Arts / Humanities
  keeps("arts-hec-humanities", "exam:CUET_UG", N_CUET, S.cuetBulletin),
  keeps("arts-hec-humanities", "exam:CLAT", N_CLAT, S.clatEligibility),
  keeps("arts-hec-humanities", "exam:NDA", N_NDA_ARMY, S.ndaNotice),
  closes("arts-hec-humanities", "exam:JEE_ADVANCED", N_JEE_ADV_CLOSED, S.jeeAdvancedEligibility),
  closes("arts-hec-humanities", "course:engineering", N_ENGG_CLOSED, S.jeeMainBulletin, L_ENGG_CLOSED),
  closes("arts-hec-humanities", "course:architecture", N_BARCH_CLOSED, S.jeeMainBulletin, L_BARCH_CLOSED),

  // Vocational Class 11-12
  keeps("vocational", "exam:JEE_MAIN", "The Higher Secondary Certificate Vocational Examination is a listed qualifying examination.", S.jeeMainBulletin),
  keeps("vocational", "exam:CUET_UG", "The Higher Secondary Certificate Vocational Examination is a listed qualifying examination.", S.cuetBulletin),

  // Polytechnic diploma
  keeps("diploma-polytechnic", "exam:JEE_MAIN", "A diploma of at least three years from AICTE or a State board of technical education is a listed qualifying examination.", S.jeeMainBulletin),
  keeps("diploma-polytechnic", "exam:CUET_UG", "A diploma of at least three years from AICTE or a State board of technical education is a listed qualifying examination.", S.cuetBulletin),

  // NIOS
  keeps("nios", "exam:JEE_MAIN", "NIOS Senior Secondary with at least five subjects is a listed qualifying examination.", S.jeeMainBulletin),
  keeps("nios", "exam:CUET_UG", "NIOS Senior Secondary with at least five subjects is a listed qualifying examination.", S.cuetBulletin),
];

/** The rule that keeps a course family open from an option, when one was read.
 *  Absent → the option → family edge is a plain "leads-to" (a path, no rule).
 *  `label` narrows the printed name when the rule covers only part of the
 *  family (30 Sep 2026 review fix): the COA rule read for diploma holders is
 *  about B.Arch (no B.Planning rule for them was read), and without
 *  Mathematics only the NDA Army wing stays open. */
function familyRule(familyId: string, from: StreamOptionSlug): { note: string; source: PathSource; label?: string } | null {
  switch (familyId) {
    case "engineering":
      return { note: "B.Tech seats at NITs, IIITs and other central institutes need Physics and Mathematics in Class 12.", source: S.jeeMainBulletin };
    case "medical":
      return { note: "NEET UG asks for Physics, Chemistry, Biology or Biotechnology, and English.", source: S.neetBulletin };
    case "law":
      return { note: "CLAT names no stream for the UG programme.", source: S.clatEligibility };
    case "university":
      return { note: "CUET UG accepts this route as a qualifying examination; each university sets its own programme rules.", source: S.cuetBulletin };
    case "defence":
      return from === "mpc-pcm" || from === "pcmb"
        ? { note: "All three NDA wings stay open.", source: S.ndaNotice }
        : { note: "The NDA Army wing asks for a Class 12 pass and names no subjects.", source: S.ndaNotice, label: "NDA Army wing only" };
    case "architecture":
      return from === "diploma-polytechnic"
        ? {
            note: "The Council of Architecture rule accepts a diploma after Class 10 with Mathematics.",
            source: S.jeeMainBulletin,
            label: "B.Arch, with Mathematics in the diploma",
          }
        : { note: "B.Arch needs Physics and Mathematics in Class 12 (Council of Architecture rule).", source: S.jeeMainBulletin };
    case "diploma-lateral":
      return from === "iti"
        ? { note: "AICTE: Class 10 and a two-year ITI course allow entry to the second year of an engineering diploma.", source: S.aicteAph }
        : { note: "AICTE diplomas in Engineering and Technology take a Class 10 pass.", source: S.aicteAph };
    default:
      return null;
  }
}

/** Stage chain in life order (govt-job-prep is reached from several stages). */
function stageEdges(): PathEdge[] {
  const chain = PATH_STAGE_IDS.filter((id) => id !== "govt-job-prep");
  const out: PathEdge[] = [];
  for (let i = 0; i + 1 < chain.length; i++) out.push({ from: `stage:${chain[i]}`, to: `stage:${chain[i + 1]}`, kind: "leads-to" });
  for (const id of ["after-10th", "after-12th", "college", "after-graduation"] as const) {
    out.push({ from: `stage:${id}`, to: "stage:govt-job-prep", kind: "leads-to" });
  }
  for (const o of STREAM_OPTIONS) out.push({ from: "stage:after-10th", to: `stream:${o.slug}`, kind: "leads-to" });
  for (const f of COURSE_FAMILIES) {
    if (f.after === "12th") out.push({ from: "stage:after-12th", to: `course:${f.id}`, kind: "leads-to" });
  }
  return out;
}

function familyEdges(): PathEdge[] {
  const out: PathEdge[] = [];
  for (const f of COURSE_FAMILIES) {
    for (const s of f.fromStreams) {
      const rule = familyRule(f.id, s);
      out.push(
        rule
          ? { from: `stream:${s}`, to: `course:${f.id}`, kind: "keeps-open", note: rule.note, source: rule.source, ...(rule.label ? { label: rule.label } : {}) }
          : { from: `stream:${s}`, to: `course:${f.id}`, kind: "leads-to" },
      );
    }
    for (const code of f.examCodes) out.push({ from: `exam:${code}`, to: `course:${f.id}`, kind: "entrance-for" });
    if (f.collegeStream) out.push({ from: `course:${f.id}`, to: `college-stream:${f.collegeStream}`, kind: "studied-at" });
    // 30 Sep 2026 (review fix): a family with its own career list points at
    // those careers, not at a whole category that holds careers it does not lead to.
    const slugs = COURSE_FAMILY_DETAILS[f.id]?.careerSlugs;
    if (slugs) for (const slug of slugs) out.push({ from: `course:${f.id}`, to: `career:${slug}`, kind: "leads-to" });
    else for (const cat of f.careerCategories) out.push({ from: `course:${f.id}`, to: `career-cat:${cat}`, kind: "leads-to" });
  }
  return out;
}

function careerExamEdges(): PathEdge[] {
  const known = new Set(PATH_EXAMS.map((e) => e.code));
  const out: PathEdge[] = [];
  for (const c of CAREERS) {
    for (const code of c.examCodes ?? []) {
      if (known.has(code)) out.push({ from: `exam:${code}`, to: `career:${c.slug}`, kind: "entrance-for" });
    }
  }
  return out;
}

export const PATH_EDGES: readonly PathEdge[] = [...stageEdges(), ...STREAM_EDGES, ...familyEdges(), ...careerExamEdges()];
