// Fixture rows for the G3 answer-lead / hub-title tests (26 Sep 2026).
// Copied from the prod read of the same day (scripts/tmp-w2-g3-probe.ts,
// SELECT only): the five acceptance exams' stored pattern tuple, official
// site, practice counts and live tracker rows (labels, dates, kinds, tiers
// and URLs as stored). No DB, no network.

import type { TimelineInput } from "@/lib/exam-timeline";

/** 26 Sep 2026, 22:30 IST. */
export const G3_NOW = new Date("2026-09-26T17:00:00Z");

export interface G3Exam {
  code: string;
  shortName: string;
  name: string;
  totalQuestions: number;
  totalMarks: number;
  durationMin: number;
  negativeMark: number;
  officialUrl: string | null;
  officialName: string | null;
  subjects: string[];
  topicCount: number;
  systemMocks: number;
  pyqYears: number;
  officialPapers: number;
  validatedQuestions: number;
  rows: TimelineInput[];
}

let seq = 0;
const r = (label: string, date: string, kind: string | null, confidence: string | null, url: string | null = null): TimelineInput => ({
  id: `r${++seq}`,
  label,
  date: `${date}T00:00:00.000Z`,
  isExamDay: kind === "EXAM",
  kind,
  confidence,
  url,
});

const SSC_NOTICE = "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Important%20Notice%202026_cgle_2026_12092026.pdf";
const ICAI_PDF = "https://resource.cdn.icai.org/92035exam020526.pdf";

export const G3_EXAMS: Record<string, G3Exam> = {
  SSC_CGL: {
    code: "SSC_CGL",
    shortName: "SSC CGL",
    name: "SSC Combined Graduate Level (Tier 1)",
    totalQuestions: 100,
    totalMarks: 200,
    durationMin: 60,
    negativeMark: 0.5,
    officialUrl: "https://ssc.gov.in",
    officialName: "Staff Selection Commission (SSC)",
    subjects: ["General Intelligence and Reasoning", "General Awareness", "Quantitative Aptitude", "English Comprehension"],
    topicCount: 61,
    systemMocks: 22,
    pyqYears: 5,
    officialPapers: 0,
    validatedQuestions: 595,
    rows: [
      r("Application end date (CGL 2026)", "2026-06-21", "APPLICATION_END", "official", "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_cgl_2025.pdf"),
      r("SSC CGL 2026 correction window", "2026-06-29", "CORRECTION_WINDOW", "official", "https://xylemlearning.com/ssc-cgl-2026-notification-12256-vacancies/"),
      r("Tier 1 admit card release", "2026-07-23", null, null),
      r("City intimation slip (expected)", "2026-09-21", "OTHER", "expected"),
      r("Tier 1 admit card (expected)", "2026-09-27", "ADMIT_CARD", "expected"),
      r("Tier 1 exam begins", "2026-09-30", "EXAM", "official", SSC_NOTICE),
      r("Tier 1 exam ends", "2026-10-30", "EXAM", "official", SSC_NOTICE),
      r("Tier 1 result (expected)", "2026-12-15", "RESULT", "expected"),
      r("Tier 2 exam (expected)", "2027-01-15", "EXAM", "expected"),
    ],
  },
  CA_FOUNDATION: {
    code: "CA_FOUNDATION",
    shortName: "CA Foundation",
    name: "CA Foundation (ICAI)",
    totalQuestions: 100,
    totalMarks: 100,
    durationMin: 180,
    negativeMark: 0.25,
    officialUrl: "https://www.icai.org",
    officialName: "Institute of Chartered Accountants of India (ICAI)",
    subjects: [],
    topicCount: 0,
    systemMocks: 0,
    pyqYears: 0,
    officialPapers: 0,
    validatedQuestions: 0,
    rows: [
      r("May 2026 result", "2026-07-30", "RESULT", "official", "https://icai.org/category/examination-students"),
      r("September 2026 exam — Paper 1 (Principles and Practice of Accounting)", "2026-09-02", "EXAM", "official", ICAI_PDF),
      r("September 2026 exam — Paper 2 (Business Laws and Business Correspondence)", "2026-09-05", "EXAM", "official", ICAI_PDF),
      r("September 2026 exam — Paper 3 (Business Mathematics and Logical Reasoning)", "2026-09-07", "EXAM", "official", ICAI_PDF),
      r("September 2026 exam — Paper 4 (Business Economics and Business & Commercial Knowledge)", "2026-09-09", "EXAM", "official", ICAI_PDF),
      r("January 2027 notification (expected)", "2026-10-15", "NOTIFICATION", "expected"),
      r("January 2027 application start (expected)", "2026-11-01", "APPLICATION_START", "expected"),
      r("September 2026 result (expected)", "2026-11-06", "RESULT", "expected"),
      r("January 2027 exam (expected)", "2027-01-16", "EXAM", "expected"),
    ],
  },
  NEET_UG: {
    code: "NEET_UG",
    shortName: "NEET UG",
    name: "National Eligibility cum Entrance Test (UG)",
    totalQuestions: 200,
    totalMarks: 720,
    durationMin: 200,
    negativeMark: 1,
    officialUrl: "https://neet.nta.nic.in",
    officialName: "National Testing Agency (NTA)",
    subjects: ["Physics", "Chemistry", "Biology"],
    topicCount: 87,
    systemMocks: 15,
    pyqYears: 5,
    officialPapers: 0,
    validatedQuestions: 487,
    rows: [
      r("NEET UG 2026 exam", "2026-06-21", "EXAM", "official", "https://nta.ac.in/Download/Notice/Notice_20260720093135.pdf"),
      r("Result (NEET UG 2026)", "2026-07-16", "RESULT", "official", "https://nta.ac.in/Download/Notice/Notice_20260720093135.pdf"),
      r("MCC counselling Round 2 seat allotment result", "2026-09-10", "OTHER", "official", "https://www.shiksha.com/medicine-health-sciences/neet-exam"),
      r("Notification (NEET UG 2027, expected)", "2027-02-15", "NOTIFICATION", "expected"),
      r("Application start (NEET UG 2027, expected)", "2027-02-15", "APPLICATION_START", "expected"),
      r("NEET UG 2027 exam (expected)", "2027-05-02", "EXAM", "expected"),
      r("Result (NEET UG 2027, expected)", "2027-06-15", "RESULT", "expected"),
    ],
  },
  JEE_MAIN: {
    code: "JEE_MAIN",
    shortName: "JEE Main",
    name: "Joint Entrance Examination — Main",
    totalQuestions: 75,
    totalMarks: 300,
    durationMin: 180,
    negativeMark: 1,
    officialUrl: "https://nta.ac.in",
    officialName: "National Testing Agency (NTA)",
    subjects: ["Physics", "Chemistry", "Mathematics"],
    topicCount: 264,
    systemMocks: 15,
    pyqYears: 5,
    officialPapers: 0,
    validatedQuestions: 303,
    rows: [
      r("CSAB Round 2 seat allotment result", "2026-08-12", "OTHER", "official", "https://www.sarvgyan.com/articles/jee-main-2026"),
      r("JEE Main 2027 Session 1 application start (expected)", "2026-10-31", "APPLICATION_START", "expected"),
      r("JEE Main 2027 notification (expected)", "2026-10-31", "NOTIFICATION", "expected"),
      r("JEE Main 2027 Session 1 application end (expected)", "2026-11-27", "APPLICATION_END", "expected"),
      r("JEE Main 2027 Session 1 exam (expected)", "2027-01-21", "EXAM", "expected"),
    ],
  },
  UPSC_PRELIMS: {
    code: "UPSC_PRELIMS",
    shortName: "UPSC Prelims",
    name: "UPSC Civil Services Examination — Prelims",
    totalQuestions: 100,
    totalMarks: 200,
    durationMin: 120,
    negativeMark: 2 / 3,
    officialUrl: "https://upsc.gov.in",
    officialName: "Union Public Service Commission (UPSC)",
    subjects: ["General Studies Paper I"],
    topicCount: 75,
    systemMocks: 12,
    pyqYears: 5,
    officialPapers: 10,
    validatedQuestions: 274,
    rows: [
      r("Prelims result announced", "2026-06-15", "RESULT", "official", "https://www.upsc.gov.in/sites/default/files/WR-NameList-CSP-2026-Engl-170626.pdf"),
      r("Mains exam begins", "2026-08-21", "EXAM", "official", "https://www.upsc.gov.in/sites/default/files/TT-CSM-2026-Engl-100726.pdf"),
      r("Personality Test / Interview (expected)", "2027-02-15", "INTERVIEW", "expected"),
      r("Final result (expected)", "2027-05-15", "RESULT", "expected"),
    ],
  },
};
