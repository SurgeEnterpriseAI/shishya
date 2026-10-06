// scripts/fix-tracker-dates-2026-10-06.ts — one date-honesty batch from the
// 6 Oct 2026 week read ("do next" items 1, 2 and 6), every date read again
// on the conducting body's own page on Tue 6 Oct 2026 between 09:28 and
// 10:14 IST. Same structure, guards and undo-log format as
// scripts/fix-tracker-dates-2026-10-03.ts.
//
// Three groups, applied one at a time (each changes hub pages and gets its
// own IndexNow ping and read). --apply takes exactly one group; "--only all"
// is a dry run only.
//   gate     — GATE 2027, all six hubs (GATE_CE, GATE_CSE, GATE_DA, GATE_ECE,
//              GATE_EE, GATE_ME). IIT Madras's important-dates page now
//              strikes through 27 Sep (regular close) and 5 Oct (late-fee
//              close): regular registration closes 5 Oct, late-fee
//              registration 12 Oct 2026. Every hub said the late-fee window
//              closed on 5 Oct. Per hub: the 27 Sep row is archived, the 5 Oct
//              row is relabelled as the regular close, and a 12 Oct late-fee
//              row is created. On the five paper hubs (not GATE_CSE) the
//              14 Oct rectification row is relabelled so it names 2027 only
//              (its "(14–21 Oct 2026)" made those titles read "GATE CE 2026";
//              date unchanged). GATE_CSE only: IIT Madras gives ONE exam
//              window for all papers (6, 7, 13, 14, 20 and 21 Feb 2027) and
//              no paper-wise schedule (important-dates page and home page
//              re-read 10:14 IST), but GATE_CSE stored the window as two
//              EXAM rows ("GATE 2027 exams begin" 6 Feb, "… end" 21 Feb), so
//              its title told students "GATE CSE 2027 — Exam Date 6 Feb
//              2027" (and "21 Feb 2027" after 6 Feb). Both EXAM rows are
//              archived and suppressed, and one OTHER row names the window
//              and says the CS paper's own date is not announced yet — the
//              row the five paper hubs already carry. Title: "GATE CSE 2027
//              — Exam Date Not Announced Yet". Archived, not retyped: as
//              curated EXAM rows they have kept the refresh writer's
//              generated GATE_CSE exam days out (it wrote one on 6 Feb in 6
//              of its 8 runs from June to August); suppressed, it can never
//              write an EXAM row on 6 or 21 Feb for GATE_CSE again (a day
//              inside the window it still can — see the batch's open issues).
//              Every other GATE row still matches the page (GOAPS 2 Sep;
//              rectification 14–21 Oct; city slip 4 Jan; results 19 Mar) and
//              is left as it is. The page says "Admit Card download: TBA":
//              GATE_CSE's expected 3 Jan 2027 admit-card estimate is left as
//              it is (an estimate, tier "expected"); no admit-card date is
//              written.
//   olympiad — HBCSE (olympiads.hbcse.tifr.res.in) and IAPT (iapt.org.in).
//              NSEB, NSEC and NSEP 22 Nov rows cite IAPT's NSE 2026 schedule
//              instead of pw.live (tier reported → official). INPhO and INBO
//              (stage II) are 31 Jan 2027 on HBCSE's page: the estimates
//              "7 Feb" (NSEP hub) and "1 Feb" (NSEB hub) are archived and
//              suppressed, and official rows are created. INChO 30 Jan 2027
//              is added to the NSEC hub (HBCSE prints it; the hub had none).
//              RMO 15 Nov 2026 and INMO 17 Jan 2027 are added to the IOQM hub
//              (there is no RMO or INMO hub).
//              Stage-II and RMO/INMO rows are stored as kind OTHER, not EXAM:
//              the hub title leads with the next announced EXAM row
//              (src/lib/hub-title.ts hubDateLead), so an EXAM row would make
//              the IOQM title read "IOQM 2026 — Exam Date 15 Nov 2026" (IOQM
//              itself was 6 Sep) and, after 22 Nov, the NSEP title "Exam Date
//              31 Jan 2027". As OTHER they list on the tracker and calendar
//              with their own names and never stand in for the hub's exam.
//   cite     — the 3 Oct "cite" group (scripts/fix-tracker-dates-2026-10-03.ts
//              --only cite), which was never applied, re-checked: every source
//              re-read on 6 Oct, every row still true. It SUPERSEDES the 3 Oct
//              cite group: do not run that one's --apply --only cite after
//              this. Differences from 3 Oct: NSEB/NSEC/NSEP moved to the
//              olympiad group; UP PET's three rows are now cited to
//              testbook.com (a refresh replaced careerpower.in), so they are
//              found by either host; MP ESB's Group-3 13 Oct and 27 Oct rows
//              are dropped (a refresh already cites esb.mp.gov.in — official).
//              MP ESB's Police Constable exam row (19 Nov) is NOT cited: ESB
//              prints it as a PROBABLE start ("संभावित परीक्षा दिनांक … 19-11-2026
//              से प्रारंभ"), and as an official row it would lead the hub
//              title bare, "Exam Date 19 Nov 2026". It stays "(reported)"
//              until the founder decides (FOUNDER_QUESTIONS); its 6 Oct and
//              11 Oct rows are cited.
//              HELD by the founder and NOT in this script: NSTSE (the
//              SOF/SZF/NSTSE decision) and SK_SPSC (JE (Civil) rows on the
//              Civil Services hub). The 3 Oct script still carries them as
//              held cites (--release).
//
// Rows: ExamImportantDate. A row is found at run time by exam, kind, IST day,
// cited host and (where needed) label — never by id alone; nothing found →
// printed and skipped; an update or archive that finds more than one row →
// printed and skipped. Every row this script writes cites an official-tier
// URL for its exam (sourceTier "official"), or the action is skipped.
//   archive — archivedAt = now and source = SUPPRESSED_SOURCE: every row this
//             script archives is one the body's page now strikes through or
//             contradicts (GATE_CSE's two EXAM rows: the page does not give
//             either day as the CS paper's date), so the refresh writer
//             (src/lib/exam-data-writer.ts) never re-creates that kind on
//             that day. Suppressed rows are also left off the hub's /archive
//             page, so a struck date is never shown as an archived official
//             date. The undo log keeps the original source.
//   create  — confidence "official", url = the body's page, source =
//             PROVENANCE (a curated row the refresh writer never overrides).
//   update  — url = the body's page, confidence "official", notes (and label
//             or kind where stated); source = PROVENANCE ("sticky"), except on
//             multi-recruitment hubs (MP ESB, JKSSB), where it stays generated
//             as on 3 Oct (a curated row there would drop OTHER recruitments'
//             generated dates of the same kind; the next refresh of those
//             exams may put an aggregator citation back).
// A CREATED official row is "new" to the exam-alerts cron
// (src/app/api/cron/exam-alerts/route.ts, 9 AM IST): that exam's subscribers
// get one mail / phone alert naming it (the dry run prints how many).
//
// Guards: dry run by default; --apply needs --only gate|olympiad|cite; unknown
// flags are refused; --apply is refused when an evidence read is more than
// MAX_READ_AGE_DAYS old (re-read the pages, update readAt, re-run) unless
// --accept-stale-reads; never deletes (no delete call anywhere); the undo log
// is written (status "pending") BEFORE the first write; writes run in one
// transaction, each row re-read inside it, and the whole run stops if any row
// changed since the plan.
//
// Undo: --apply writes data/fix-logs/fix-tracker-dates-2026-10-06.<group>.<time>.json
// with every row's fields before and after; --undo <that file> is a dry run
// of the undo, --undo <file> --apply puts them back (a created row is
// archived, never deleted) and logs the undo. Hubs read the change within 10
// minutes (exam-shared cache), trackers within 30.
//
// IndexNow list: per group, every page that prints a changed exam's dates —
// the hub, /updates, context.md and the state page (examFactUrls), the
// exam-week pages for an exam in its exam week, the home page and
// /exam-calendar when a changed day falls in their window, and the exam
// list pages whose next-exam cell changes: /mock-tests (the hub title's
// decision) and the live /exams/category/* and indexable /exams/after/*
// pages that list the exam (src/lib/exam-list-rows.ts next exam day and
// tier). The list-page membership is read from the database (SELECT only)
// by main(); without it the dry run says "not checked".
//
// Evidence: each EVIDENCE entry quotes the page's visible text (HTML comments,
// scripts, styles and struck-through <del> text removed first; scanned PDFs
// read as images), with the read time. The saved copies and the per-row
// evidence are in the 6 Oct batch's dates-evidence.md.
//
// USAGE (from D:\CodexProjects\shishya; .env.local is PRODUCTION):
//   npx tsx --env-file=.env.local scripts/fix-tracker-dates-2026-10-06.ts                          # dry run, all groups
//   npx tsx --env-file=.env.local scripts/fix-tracker-dates-2026-10-06.ts --only gate              # dry run, one group
//   npx tsx --env-file=.env.local scripts/fix-tracker-dates-2026-10-06.ts --apply --only gate      # write one group
//   npx tsx --env-file=.env.local scripts/fix-tracker-dates-2026-10-06.ts --undo data/fix-logs/<file>.json [--apply]

import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { SUPPRESSED_SOURCE, buildTimeline, isUnannouncedAnswerKey, isoDay, resolveKind, rowCitation, stageOf } from "../src/lib/exam-timeline";
import { sourceTier } from "../src/lib/official-source";
import { heldTitleLead, hubDateLead, hubTitleDay, hubTitlePrefix, hubTitleYear, revisionTitleLead } from "../src/lib/hub-title";
import { hubLead } from "../src/lib/answer-lead";
import { computeExamWeekState, istDay } from "../src/lib/exam-week";
import { stateInfo, stateSlug } from "../src/lib/state-info";
import { DATE_WINDOW_AHEAD_DAYS, DATE_WINDOW_PAST_DAYS, nextExamOf, nextExamText } from "../src/lib/mock-catalogue";
import { nextExamCell } from "../src/lib/exam-categories";

export const PROVENANCE = "official-research:2026-10-06";
export const LOG_DIR = "data/fix-logs";
export const LOG_STEM = "fix-tracker-dates-2026-10-06";
/** The refresh writer's provenance tag (src/lib/exam-data-writer.ts GEN_SOURCE;
 *  not imported, so this script does not load the IndexNow module — a test
 *  pins the two equal). */
export const GEN_SOURCE = "ai-generated:claude";
/** --apply refuses evidence read more than this many days ago. */
export const MAX_READ_AGE_DAYS = 2;
export const SITE = "https://shishya.in";
const DAY_MS = 86_400_000;

export const GROUPS = ["gate", "olympiad", "cite"] as const;
export type Group = (typeof GROUPS)[number];

// ── Evidence: each read on the body's own site on 6 Oct 2026 ─────────────

export interface Evidence {
  body: string;
  url: string;
  /** The document, and where the body lists it. */
  doc: string;
  /** Visible text, word for word (Hindi / Gujarati notices in English where marked). */
  quote: string;
  /** When this run read it (IST). */
  readAt: string;
  /** Saved copy (file name in the batch's pages/ folder). */
  saved: string;
}

export const EVIDENCE = {
  gate: {
    body: "IIT Madras (GATE 2027 organising institute)",
    url: "https://gate2027.iitm.ac.in/important_dates",
    doc: "GATE 2027 Important Dates page (superseded dates shown struck through)",
    quote:
      "Closing Date of REGULAR online registration (without late fee) | [struck: 21st September 2026, 27th September 2026] 5th October 2026 | Monday. Closing Date of EXTENDED online registration (with late fee) | [struck: 30th September 2026, 5th October 2026] 12th October 2026 | Monday. Opening Date of GATE 2027 Application rectification | 14th October 2026. Closing Date of GATE 2027 Application rectification | 21st October 2026. City allotment notification | 4th January 2027. Admit Card download | TBA. GATE 2027 Examinations | 6th, 7th, 13th, 14th, 20th, 21st February 2027. Announcement of results | 19th March 2027. *All dates are liable to change",
    readAt: "2026-10-06T09:28:00+05:30",
    saved: "gate2027-important_dates.html",
  },
  gateWindow: {
    body: "IIT Madras (GATE 2027 organising institute)",
    url: "https://gate2027.iitm.ac.in/important_dates",
    doc: "GATE 2027 Important Dates page, re-read for GATE_CSE's exam rows (visible text the same as at 09:28), and the GATE 2027 home page https://gate2027.iitm.ac.in/ ('Important Dates*' block, read 10:14:03). Neither page gives a paper-wise schedule: no paper, session or 'CS' is named against an exam day",
    quote:
      "GATE 2027 Examinations | 6th February 2027 7th February 2027 Saturday Sunday 13th February 2027 14th February 2027 Saturday Sunday 20th February 2027 21st February 2027 Saturday Sunday | Announcement of results | 19th March 2027 | Friday | *All dates are liable to change. Home page: Examination Week-1 6th, 7th February 2027 Week-2 13th, 14th February 2027 Week-3 20th, 21st February 2027 GATE 2027 examinations",
    readAt: "2026-10-06T10:13:59+05:30",
    saved: "gate2027-important_dates-recheck.html, gate2027-home.html",
  },
  hbcseSci: {
    body: "HBCSE (TIFR), National Olympiad Programme",
    url: "https://olympiads.hbcse.tifr.res.in/science-olympiad-2026-2027/",
    doc: "Science Olympiad 2026-2027 page",
    quote:
      "Stage I: National Standard Examinations (NSEs) NSEA: November 21, 2026, 14:30-16:30 hrs NSEB: November 22, 2026, 14:30-16:30 hrs NSEC: November 22, 2026, 11:30-13:30 hrs NSEP: November 22, 2026, 08:30-10:30 hrs … Stage II: Indian National Olympiad Examinations (INOs) INAO: January 30, 2027, 09:00-12:00 hrs INChO: January 30, 2027, 13:30-16:30 hrs INPhO: January 31, 2027, 09:00-12:00 hrs INBO: January 31, 2027, 13:30-15:30 hrs The list of students selected for the INOs will be published by January 15, 2027 on the IAPT website (www.iapt.org.in). All students appearing in INOs must register themselves on the HBCSE website after publication of the list, in order to obtain their INO admit cards.",
    readAt: "2026-10-06T09:29:10+05:30",
    saved: "hbcse-science-olympiad-2026-2027.html",
  },
  hbcseMath: {
    body: "HBCSE (TIFR), National Olympiad Programme",
    url: "https://olympiads.hbcse.tifr.res.in/mathematical-olympiad-2026-2027/",
    doc: "Mathematical Olympiad 2026-2027 page",
    quote:
      "Second stage exam : Regional Mathematical Olympiad (RMO) Date: November 15, 2026; Time: 13:00 to 16:00 hrs Duration: 3 hours … Third stage exam: Indian National Mathematical Olympiad (INMO) Date of INMO 2026: January 17, 2027; Time: 12:00 to 16:30 hrs Duration: 4.5 hours",
    readAt: "2026-10-06T09:29:35+05:30",
    saved: "hbcse-mathematical-olympiad-2026-2027.html",
  },
  iapt: {
    body: "Indian Association of Physics Teachers (IAPT)",
    url: "https://iapt.org.in/?id=2423",
    doc: "IAPT NSE 2026 page",
    quote:
      "Examination Schedule NSEA (Astronomy) Saturday 21.11.26 2.30 pm to 4.30 pm NSEP (Physics) Sunday 22.11.26 8.30 am to 10.30 am NSEC (Chemistry) Sunday 22.11.26 11.30 am to 1.30 pm NSEB (Biology) Sunday 22.11.26 2.30 pm to 4.30 pm NSEJS (Junior Science) Sunday 22.11.26 2.30 pm to 4.30 pm",
    readAt: "2026-10-06T09:29:50+05:30",
    saved: "iapt-id-2423.html",
  },
  apsc: {
    body: "Assam Public Service Commission (APSC)",
    url: "https://apsc.nic.in/notif_2026/CCE_Mains_2025_Schedule_01_2026.pdf",
    doc: "Notification No.8PSC/E-10/2026-2027 of 5 Sep 2026 (scanned, read as an image), listed on apsc.nic.in as 'NOTIFICATION REGARDING THE SCHEDULE FOR COMBINED COMPETITIVE(MAIN) EXAMINATION, 2025'; the home page read at 09:32:52 lists no change to it",
    quote:
      "the Combined Competitive (Main) Examination, 2025 will be held as per programme given below at Guwahati Centre: 09.10.2026 (Friday) Paper-1 Essay / Paper-2 General Studies-I; 10.10.2026 (Saturday) Paper-3 General Studies-II / Paper-4 General Studies-III; 11.10.2026 (Sunday) Paper-5 General Studies-IV / Paper-6 General Studies-V. Forenoon (09:00 AM to 12:00 PM), Afternoon (01:30 PM to 04:30 PM).",
    readAt: "2026-10-06T09:32:32+05:30",
    saved: "apsc-cce-mains-2025-schedule.pdf",
  },
  upsssc: {
    body: "UPSSSC",
    url: "https://upsssc.gov.in/ViewPdf.aspx?NJbKyTiDxAqQnRYKCqojRTHwngIdnR5KGQXPSU/8zc0=",
    doc: "Notice 1423/36/तीन(परी0-1)/2026/खण्ड-2 of 25 Sep 2026 (scanned, read as an image); upsssc.gov.in's notice board (read 09:33:54) still lists it, dated 25/09/2026, as the latest PET-2026 notice",
    quote:
      "अपरिहार्य कारणों से प्रश्नगत परीक्षा दिनांक 25 अक्टूबर, 2026 (रविवार), 30 अक्टूबर, 2026 (शुक्रवार) व 01 नवम्बर, 2026 (रविवार) को प्रत्येक दिवस दो पाली (प्रथम पाली- पूर्वाह्न 10:00 बजे से 12:00 बजे तक तथा द्वितीय पाली अपराह्न 03:00 बजे से 05:00 बजे तक) में आयोजित की जायेगी। (In English: the exam will be held on 25 Oct, 30 Oct and 1 Nov 2026, two shifts each day, 10:00–12:00 and 15:00–17:00.)",
    readAt: "2026-10-06T09:33:35+05:30",
    saved: "upsssc-notice-1423.pdf",
  },
  gpsc: {
    body: "Gujarat Public Service Commission (GPSC)",
    url: "https://gpsc.gujarat.gov.in/Documents/ES-04072026.pdf",
    doc: "'Updated Exam Schedule as on 04.07.2026', still the 'Exam Schedule' link on the gpsc.gujarat.gov.in home page (read 09:33:22); Gujarati, read as an image",
    quote:
      "૧૨ | ૫ | ૨૦૨૬-૨૭ | ગુજરાત વહિવટી સેવા, વર્ગ-૧, ગુજરાત મુલ્કી સેવા, વર્ગ-૧ અને વર્ગ-૨ તથા ગુજરાત નગરપાલિકાના મુખ્ય અધિકારી, વર્ગ-૨ | ૨૧૩ | મુખ્ય પરીક્ષા : ૫ થી ૧૧-૧૦-૨૦૨૬ (In English: row 12, Advt. 5/2026-27, 213 posts — Mains: 5 to 11-10-2026)",
    readAt: "2026-10-06T09:33:04+05:30",
    saved: "gpsc-ES-04072026.pdf",
  },
  jkssbFinance: {
    body: "J&K Services Selection Board (JKSSB)",
    url: "https://jkssb.nic.in/Pdf/notice1_31072026.pdf",
    doc: "Notice JKSSB-COEOEXAM/10/2022-04 of 31 Jul 2026, listed on https://jkssb.nic.in/Whatsnew.html; the What's New list read at 09:34:51 has no later notice for Finance or Home Department posts. Its later reschedule, notice of 17 Sep 2026 (https://jkssb.nic.in/Pdf/notice2_17092026.pdf, read 10:14:07, scanned, read as an image, saved jkssb-notice2_17092026.pdf), is 'In partial modification to the Notice No. JKSSB-COE0EXAM/10/2022-04(7055504) Dated 31.07.2026' for 'the following posts of Health and Medical Education Department' only: Female MPHW/Male Multipurpose Health Worker 20.09.2026 → 11.10.2026, Junior Theatre Technician 24.09.2026 → 29.10.2026, Health Educator 27.09.2026 → 01.11.2026, and Dresser/Junior Pharmacist (11.10.2026) postponed",
    quote: "Annexure A, row 15: 10 of 2025 | 271 | Finance Department | Accounts Assistant | 15-11-2026 (Sunday). The Admit Cards shall be issued seven (07) days prior to the date of Examination.",
    readAt: "2026-10-06T09:34:15+05:30",
    saved: "jkssb-notice1_31072026.pdf",
  },
  jkssbHome: {
    body: "J&K Services Selection Board (JKSSB)",
    url: "https://jkssb.nic.in/Pdf/notice_01082026.pdf",
    doc: "Notice JKSSB-COE0EXAM(UT)/10/2022-04 of 1 Aug 2026, 'Advance Notice for Conduct of Examinations for various Posts of Home Department, J&K' (scanned, read as an image), listed on https://jkssb.nic.in/Whatsnew.html",
    quote:
      "The Admit Cards shall be issued seven (07) days prior to the date of Examinations. | Annexure A: 02 of 2024 | 07 | Sub-Inspector | 29.11.2026; 12 of 2025 | 273-274 | Constable (Executive) | 13.12.2026; 14 of 2025 | 323-324 | Constable (Armed/IRP/SDRF) | 20.12.2026; 11 of 2025 | 272 | Sub Inspector (Telecommunication) | 23.12.2026; 15 of 2025 | 325 | Constable (Telecommunication) | 27.12.2026; 15 of 2025 | 326 | Constable (Photographer) | 30.12.2026",
    readAt: "2026-10-06T09:34:31+05:30",
    saved: "jkssb-notice_01082026.pdf",
  },
  esbPolice: {
    body: "MP Employees Selection Board (ESB)",
    url: "https://esb.mp.gov.in/Rulebooks/RB_2026/PCRT_2026_Rulebook_Revised_Page_01_15092026.pdf",
    doc: "Police Constable (GD) Recruitment Test 2026 rulebook, revised page 1 (15 Sep 2026; scanned, read as an image), linked on https://esb.mp.gov.in/home_n.html, which (read 09:35:48, 'Last updation: 01 October, 2026') lists no date change for it",
    quote:
      "ऑनलाइन आवेदन पत्र भरने की प्रारम्भ तिथि : 22-09-2026 | ऑनलाइन आवेदन पत्र भरने की अंतिम तिथि : 06-10-2026 | आवेदन पत्र मे संशोधन करने की अंतिम तिथि : 11-10-2026 | संभावित परीक्षा दिनांक व दिन : 19-11-2026 से प्रारंभ (In English: applications 22 Sep–6 Oct 2026, corrections until 11 Oct, probable exam date from 19 Nov 2026; shifts 10:00–12:00 and 03:00–05:00 pm)",
    readAt: "2026-10-06T09:35:17+05:30",
    saved: "esb-pcrt-2026-rulebook-p1.pdf",
  },
} satisfies Record<string, Evidence>;
export type EvidenceId = keyof typeof EVIDENCE;

// ── The changes ──────────────────────────────────────────────────────────

export interface Find {
  kind: string;
  /** IST calendar day, YYYY-MM-DD. */
  day: string;
  /** Cited hosts (no www.) the row may carry; "" = no citation. */
  hosts: string[];
  label?: RegExp;
}

export interface ArchiveAction {
  group: Group;
  type: "archive";
  exam: string;
  find: Find;
  why: string;
  evidence: EvidenceId;
}
export interface CreateAction {
  group: Group;
  type: "create";
  exam: string;
  row: { kind: string; day: string; label: string; notes: string; isExamDay: boolean };
  /** A live official row that already says this (same day, label matching) → skipped. */
  twin: RegExp;
  why: string;
  evidence: EvidenceId;
}
export interface UpdateAction {
  group: Group;
  type: "update";
  exam: string;
  find: Find;
  notes: string;
  label?: string;
  retype?: { kind: string; isExamDay: boolean };
  /** Curated provenance (see the header); false on multi-recruitment hubs. */
  sticky: boolean;
  why: string;
  evidence: EvidenceId;
}
export type Action = ArchiveAction | CreateAction | UpdateAction;

export const GATE_EXAMS = ["GATE_CE", "GATE_CSE", "GATE_DA", "GATE_ECE", "GATE_EE", "GATE_ME"] as const;
const GATE_HOST = ["gate2027.iitm.ac.in"];
const GATE_REGULAR_NOTE =
  "IIT Madras, GATE 2027 important dates (read 6 Oct 2026): regular online registration (without late fee) closes Monday 5 Oct 2026 — extended from 21 Sep and then 27 Sep, both struck through on the page. Registration with the late fee is open until Monday 12 Oct 2026.";
const GATE_LATE_NOTE =
  "IIT Madras, GATE 2027 important dates (read 6 Oct 2026): extended online registration (with late fee) closes Monday 12 Oct 2026 — extended from 30 Sep and then 5 Oct, both struck through on the page. The application rectification window is 14–21 Oct 2026.";

const GATE_RECTIFICATION_NOTE =
  "IIT Madras, GATE 2027 important dates (read 6 Oct 2026): application rectification opens Wednesday 14 Oct and closes Wednesday 21 Oct 2026.";
const GATE_WINDOW_NOTE =
  "IIT Madras, GATE 2027 important dates (re-read 6 Oct 2026): the GATE 2027 examinations are on Saturday 6, Sunday 7, Saturday 13, Sunday 14, Saturday 20 and Sunday 21 Feb 2027. Which of these days the CS paper is held on is not given on the important-dates page or the GATE 2027 home page yet. All dates are liable to change.";

// GATE_CSE only (review of 6 Oct): the window was stored as two EXAM rows,
// which led the hub title as the CS paper's own date. See the header.
const gateCseWindowActions: Action[] = [
  {
    group: "gate",
    type: "archive",
    exam: "GATE_CSE",
    find: { kind: "EXAM", day: "2027-02-06", hosts: GATE_HOST, label: /^GATE 2027 exams begin$/i },
    why: "IIT Madras gives 6 Feb 2027 only as the first day of the GATE 2027 exam window (6, 7, 13, 14, 20 and 21 Feb) for all papers; it has not said which day the CS paper is held. As an EXAM row on the CS hub it made the title read \"GATE CSE 2027 — Exam Date 6 Feb 2027\". Archived and suppressed, so a refresh cannot write a CS exam day on 6 Feb again; the window moves to the OTHER row created below.",
    evidence: "gateWindow",
  },
  {
    group: "gate",
    type: "archive",
    exam: "GATE_CSE",
    find: { kind: "EXAM", day: "2027-02-21", hosts: GATE_HOST, label: /^GATE 2027 exams end$/i },
    why: "21 Feb 2027 is the last day of the same window, not the CS paper's date; after 6 Feb it would lead the title as \"Exam Date 21 Feb 2027\". Archived and suppressed; the OTHER row below names the whole window.",
    evidence: "gateWindow",
  },
  {
    group: "gate",
    type: "create",
    exam: "GATE_CSE",
    row: { kind: "OTHER", day: "2027-02-06", label: "GATE 2027 exams on 6, 7, 13, 14, 20 and 21 Feb 2027 — the CS paper's own date is not announced yet", notes: GATE_WINDOW_NOTE, isExamDay: false },
    twin: /own date is not announced/i,
    why: "The window IIT Madras states, as one OTHER row (the row the five paper hubs carry): it lists on the tracker and calendar and never stands in for the CS paper's exam date.",
    evidence: "gateWindow",
  },
];

const gateActions: Action[] = GATE_EXAMS.flatMap((exam): Action[] => [
  // The five paper hubs' rectification row names "2026" in its label ("…
  // window (14–21 Oct 2026)"), so its title year reads 2026
  // (src/lib/exam-timeline.ts labelCycleYear: a label naming the row's own
  // year keeps it): "GATE CE 2026 — Exam Date Not Announced Yet" for the
  // GATE 2027 cycle. The new 12 Oct row fixes the year until 12 Oct; this
  // relabel keeps it right through 14 Oct instead of flipping back to 2026.
  // Same date, same source; the window moves to the notes. GATE_CSE's
  // rectification rows already name 2027 only.
  ...(exam === "GATE_CSE"
    ? []
    : [
        {
          group: "gate",
          type: "update",
          exam,
          find: { kind: "CORRECTION_WINDOW", day: "2026-10-14", hosts: GATE_HOST, label: /rectification window \(14–21 Oct 2026\)/i },
          label: "GATE 2027 application rectification window (14–21 Oct)",
          notes: GATE_RECTIFICATION_NOTE,
          sticky: true,
          why: "Date unchanged (IIT Madras: 14–21 Oct 2026). The label named 2026, which made the hub title read \"2026\" for the GATE 2027 cycle; the label now names 2027 only.",
          evidence: "gate",
        } satisfies UpdateAction,
      ]),
  {
    group: "gate",
    type: "archive",
    exam,
    find: { kind: "APPLICATION_END", day: "2026-09-27", hosts: GATE_HOST, label: /regular registration/i },
    why: "Superseded: IIT Madras now strikes 27 Sep through — regular registration (without late fee) was extended to Monday 5 Oct 2026.",
    evidence: "gate",
  },
  {
    group: "gate",
    type: "update",
    exam,
    find: { kind: "APPLICATION_END", day: "2026-10-05", hosts: GATE_HOST, label: /extended registration/i },
    label: "GATE 2027 regular registration closes (without late fee)",
    notes: GATE_REGULAR_NOTE,
    sticky: true,
    why: "5 Oct is now the REGULAR close (without late fee); IIT Madras strikes 5 Oct through as the late-fee close, which moved to 12 Oct. The row said the late-fee window closed on 5 Oct.",
    evidence: "gate",
  },
  {
    group: "gate",
    type: "create",
    exam,
    row: { kind: "APPLICATION_END", day: "2026-10-12", label: "GATE 2027 extended registration closes (with late fee)", notes: GATE_LATE_NOTE, isExamDay: false },
    twin: /late fee|extended/i,
    why: "The late-fee close IIT Madras states: Monday 12 Oct 2026.",
    evidence: "gate",
  },
  ...(exam === "GATE_CSE" ? gateCseWindowActions : []),
]);

const NSE_NOTE = (code: string, time: string) =>
  `Sunday 22 Nov 2026, ${time} (IAPT's NSE 2026 schedule; HBCSE's Science Olympiad 2026-27 page gives the same date and time for ${code}).`;
const INO_LIST_NOTE =
  "The list of students selected for the INOs will be published by 15 Jan 2027 on the IAPT website (iapt.org.in); selected students must then register on the HBCSE website to get their INO admit cards.";

const olympiadActions: Action[] = [
  { group: "olympiad", type: "update", exam: "NSEP", find: { kind: "EXAM", day: "2026-11-22", hosts: ["pw.live"] }, notes: NSE_NOTE("NSEP", "8:30–10:30 am"), sticky: true, why: "IAPT (the conducting body) and HBCSE both print NSEP on Sunday 22 Nov 2026; the row cited pw.live (tier reported).", evidence: "iapt" },
  { group: "olympiad", type: "update", exam: "NSEC", find: { kind: "EXAM", day: "2026-11-22", hosts: ["pw.live"] }, notes: NSE_NOTE("NSEC", "11:30 am–1:30 pm"), sticky: true, why: "IAPT (the conducting body) and HBCSE both print NSEC on Sunday 22 Nov 2026; the row cited pw.live (tier reported).", evidence: "iapt" },
  { group: "olympiad", type: "update", exam: "NSEB", find: { kind: "EXAM", day: "2026-11-22", hosts: ["pw.live"] }, notes: NSE_NOTE("NSEB", "2:30–4:30 pm"), sticky: true, why: "IAPT (the conducting body) and HBCSE both print NSEB on Sunday 22 Nov 2026; the row cited pw.live (tier reported).", evidence: "iapt" },
  {
    group: "olympiad",
    type: "archive",
    exam: "NSEP",
    find: { kind: "EXAM", day: "2027-02-07", hosts: [""], label: /INPhO/i },
    why: "Estimate \"INPhO 2027 (Stage 2) exam (expected)\" 7 Feb 2027; HBCSE states INPhO on 31 Jan 2027.",
    evidence: "hbcseSci",
  },
  {
    group: "olympiad",
    type: "create",
    exam: "NSEP",
    row: { kind: "OTHER", day: "2027-01-31", label: "INPhO 2027 — Stage II, for NSEP qualifiers", notes: `Indian National Physics Olympiad (stage II): Sunday 31 Jan 2027, 09:00–12:00 (HBCSE, Science Olympiad 2026-27). ${INO_LIST_NOTE}`, isExamDay: false },
    twin: /INPhO/i,
    why: "The date HBCSE states, replacing the archived 7 Feb estimate.",
    evidence: "hbcseSci",
  },
  {
    group: "olympiad",
    type: "archive",
    exam: "NSEB",
    find: { kind: "EXAM", day: "2027-02-01", hosts: [""], label: /INBO/i },
    why: "Estimate \"INBO 2027 exam (Stage 2, expected)\" 1 Feb 2027; HBCSE states INBO on 31 Jan 2027.",
    evidence: "hbcseSci",
  },
  {
    group: "olympiad",
    type: "create",
    exam: "NSEB",
    row: { kind: "OTHER", day: "2027-01-31", label: "INBO 2027 — Stage II, for NSEB qualifiers", notes: `Indian National Biology Olympiad (stage II): Sunday 31 Jan 2027, 13:30–15:30 (HBCSE, Science Olympiad 2026-27). ${INO_LIST_NOTE}`, isExamDay: false },
    twin: /INBO/i,
    why: "The date HBCSE states, replacing the archived 1 Feb estimate.",
    evidence: "hbcseSci",
  },
  {
    group: "olympiad",
    type: "create",
    exam: "NSEC",
    row: { kind: "OTHER", day: "2027-01-30", label: "INChO 2027 — Stage II, for NSEC qualifiers", notes: `Indian National Chemistry Olympiad (stage II): Saturday 30 Jan 2027, 13:30–16:30 (HBCSE, Science Olympiad 2026-27). ${INO_LIST_NOTE}`, isExamDay: false },
    twin: /INChO/i,
    why: "HBCSE states INChO on 30 Jan 2027; the NSEC hub had no stage-II date (its 15 Jan \"INChO 2027 Registration (expected)\" estimate is left as it is).",
    evidence: "hbcseSci",
  },
  {
    group: "olympiad",
    type: "create",
    exam: "IOQM",
    row: { kind: "OTHER", day: "2026-11-15", label: "RMO 2026 — second stage, for IOQM 2026 qualifiers", notes: "Regional Mathematical Olympiad: Sunday 15 Nov 2026, 13:00–16:00 (3 hours, 6 proof questions) — HBCSE, Mathematical Olympiad 2026-27. Who qualifies from IOQM 2026 is set by HBCSE's RMO selection criteria.", isExamDay: false },
    twin: /\bRMO\b|Regional Math/i,
    why: "HBCSE states RMO on 15 Nov 2026; the IOQM hub had no RMO date and there is no RMO hub.",
    evidence: "hbcseMath",
  },
  {
    group: "olympiad",
    type: "create",
    exam: "IOQM",
    row: { kind: "OTHER", day: "2027-01-17", label: "INMO — third stage of the 2026-27 cycle, for RMO 2026 qualifiers", notes: "Indian National Mathematical Olympiad: Sunday 17 Jan 2027, 12:00–16:30 (4.5 hours, 6 proof questions). HBCSE's Mathematical Olympiad 2026-27 page: \"Date of INMO 2026: January 17, 2027\".", isExamDay: false },
    twin: /\bINMO\b|National Math/i,
    why: "HBCSE states INMO on 17 Jan 2027; the IOQM hub had no INMO date and there is no INMO hub.",
    evidence: "hbcseMath",
  },
];

const UP_PET_NOTE =
  "Two shifts each day: 10:00–12:00 and 15:00–17:00. UPSSSC notice 1423 of 25 Sep 2026 (listed under that date in upsssc.gov.in's news) moved the written exam from 23, 24 and 25 Oct to 25 Oct, 30 Oct and 1 Nov 2026; the admit card will be announced on upsssc.gov.in.";
const APSC_NOTE = (papers: string) => `CCE (Main) 2025 at the Guwahati centre: ${papers} (APSC notification 8PSC/E-10/2026-2027 of 5 Sep 2026).`;
const ESB_POLICE_NOTE =
  "ESB rulebook, revised page 1 (15 Sep 2026): online applications 22 Sep–6 Oct 2026, corrections until 11 Oct; probable exam date: from 19 Nov 2026, two shifts (10:00–12:00, 15:00–17:00).";
const JKSSB_HOME_NOTE = (post: string, ref: string, day: string) =>
  `JKSSB advance notice of 1 Aug 2026 (Home Department posts, Annexure A): ${post} (${ref}) — OMR-based written exam on ${day}. Admit cards seven days before the exam.`;
const CITE_WHY = "The body's own document states this date (re-read 6 Oct 2026); the row cited an aggregator (tier reported).";
const PET_HOSTS = ["testbook.com", "careerpower.in"];

const citeActions: Action[] = [
  { group: "cite", type: "update", exam: "UP_UPSSSC_PET", find: { kind: "EXAM", day: "2026-10-25", hosts: PET_HOSTS }, notes: UP_PET_NOTE, sticky: true, why: CITE_WHY, evidence: "upsssc" },
  { group: "cite", type: "update", exam: "UP_UPSSSC_PET", find: { kind: "EXAM", day: "2026-10-30", hosts: PET_HOSTS }, notes: UP_PET_NOTE, sticky: true, why: CITE_WHY, evidence: "upsssc" },
  { group: "cite", type: "update", exam: "UP_UPSSSC_PET", find: { kind: "EXAM", day: "2026-11-01", hosts: PET_HOSTS }, notes: UP_PET_NOTE, sticky: true, why: CITE_WHY, evidence: "upsssc" },
  // The sitting is CCE (Main) 2025, held in Oct 2026 — the labels say so.
  { group: "cite", type: "update", exam: "AS_APSC_CCE", find: { kind: "EXAM", day: "2026-10-09", hosts: ["jobassam.in"] }, label: "CCE (Main) 2025 — Day 1", notes: APSC_NOTE("Paper-1 Essay 9:00–12:00, Paper-2 General Studies-I 13:30–16:30"), sticky: true, why: CITE_WHY, evidence: "apsc" },
  { group: "cite", type: "update", exam: "AS_APSC_CCE", find: { kind: "EXAM", day: "2026-10-10", hosts: ["adda247.com"] }, label: "CCE (Main) 2025 — Day 2", notes: APSC_NOTE("Paper-3 General Studies-II 9:00–12:00, Paper-4 General Studies-III 13:30–16:30"), sticky: true, why: CITE_WHY, evidence: "apsc" },
  { group: "cite", type: "update", exam: "AS_APSC_CCE", find: { kind: "EXAM", day: "2026-10-11", hosts: ["testbook.com"] }, label: "CCE (Main) 2025 — Day 3", notes: APSC_NOTE("Paper-5 General Studies-IV 9:00–12:00, Paper-6 General Studies-V 13:30–16:30"), sticky: true, why: CITE_WHY, evidence: "apsc" },
  {
    group: "cite",
    type: "update",
    exam: "GJ_GPSC_CLASS12",
    find: { kind: "EXAM", day: "2026-10-05", hosts: ["testbook.com"] },
    notes: "Mains for Advt. 5/2026-27 (Gujarat Administrative Service Class-1, Gujarat Civil Service Class-1 and 2, Municipal Chief Officer Class-2; 213 posts): 5 to 11 Oct 2026 (GPSC exam schedule).",
    sticky: true,
    why: CITE_WHY,
    evidence: "gpsc",
  },
  // JKSSB: a multi-recruitment hub, so the source stays generated.
  {
    group: "cite",
    type: "update",
    exam: "JK_JKSSB",
    find: { kind: "EXAM", day: "2026-11-15", hosts: ["freejobalert.com"], label: /accounts assistant/i },
    notes: "JKSSB notice of 31 Jul 2026 (Annexure A, row 15): Accounts Assistant, Finance Department (Notification 10 of 2025, item 271) — OMR-based written exam on Sunday 15 Nov 2026. Admit cards seven days before the exam. JKSSB's notice of 17 Sep 2026 reschedules Health & Medical Education posts only.",
    sticky: false,
    why: CITE_WHY,
    evidence: "jkssbFinance",
  },
  {
    group: "cite",
    type: "update",
    exam: "JK_JKSSB",
    find: { kind: "EXAM", day: "2026-11-29", hosts: ["freejobalert.com"], label: /sub-inspector/i },
    // Was "Sub-Inspector & Constable (Home Dept) Exam (expected)": the body
    // dates the Sub-Inspector exam alone on 29 Nov, and announced it.
    label: "Sub-Inspector (Home Department) — OMR written exam",
    notes: JKSSB_HOME_NOTE("Sub-Inspector", "Notification 02 of 2024, item 07", "29 Nov 2026"),
    sticky: false,
    why: CITE_WHY,
    evidence: "jkssbHome",
  },
  {
    group: "cite",
    type: "update",
    exam: "JK_JKSSB",
    find: { kind: "EXAM", day: "2026-12-13", hosts: ["freejobalert.com"], label: /constable \(executive\)/i },
    notes: JKSSB_HOME_NOTE("Constable (Executive)", "Notification 12 of 2025, items 273-274", "13 Dec 2026"),
    sticky: false,
    why: CITE_WHY,
    evidence: "jkssbHome",
  },
  {
    group: "cite",
    type: "update",
    exam: "JK_JKSSB",
    find: { kind: "EXAM", day: "2026-12-20", hosts: ["freejobalert.com"], label: /armed/i },
    notes: JKSSB_HOME_NOTE("Constable (Armed/IRP/SDRF)", "Notification 14 of 2025, items 323-324", "20 Dec 2026"),
    sticky: false,
    why: CITE_WHY,
    evidence: "jkssbHome",
  },
  // MP ESB: a multi-recruitment hub, so the source stays generated. The
  // 19 Nov exam row is not cited (a probable date — FOUNDER_QUESTIONS).
  { group: "cite", type: "update", exam: "MP_MPESB", find: { kind: "APPLICATION_END", day: "2026-10-06", hosts: ["careerindia.com"] }, notes: ESB_POLICE_NOTE, sticky: false, why: CITE_WHY, evidence: "esbPolice" },
  { group: "cite", type: "update", exam: "MP_MPESB", find: { kind: "CORRECTION_WINDOW", day: "2026-10-11", hosts: ["careerindia.com"] }, notes: ESB_POLICE_NOTE, sticky: false, why: CITE_WHY, evidence: "esbPolice" },
];

/** Rows this script leaves as they are until the founder answers (6 Oct
 *  review). Never written here; the dry run prints them. */
export const FOUNDER_QUESTIONS: { exam: string; day: string; kind: string; question: string }[] = [
  {
    exam: "MP_MPESB",
    day: "2026-11-19",
    kind: "EXAM",
    question:
      "ESB's Police Constable (GD) rulebook (revised page 1, 15 Sep 2026) gives the exam only as a probable start: \"संभावित परीक्षा दिनांक व दिन : 19-11-2026 से प्रारंभ\" (probable exam date: from 19 Nov 2026). Cited to ESB, the row would be official and lead the MPESB hub title bare, \"Exam Date 19 Nov 2026\", with \"probable\" only in the row label. It stays as it is (\"Exam Date 19 Nov 2026 (reported)\", cited to careerindia.com). The same probable date already leads the MP Police PC hub title as official since the 3 Oct fix group (\"MP Police PC (Madhya Pradesh) 2026 — Exam Date 19 Nov 2026\", row cmus928m3000812skae0p4d58 \"Written exam begins (probable date, ESB)\"). May a probable date from the body lead a title as official, or should the title say \"probable\"? The answer covers both hubs.",
  },
];

export const ACTIONS: Action[] = [...gateActions, ...olympiadActions, ...citeActions];

/** What the founder holds (3 Oct cite group) — never written by this script. */
export const HELD_BY_FOUNDER: Record<string, string> = {
  NSTSE: "Unified Council dates (offline 20 Nov and 2 Dec 2026; online mock 17 Jan, final 24 Jan 2027) wait on the founder's SOF/SZF/NSTSE decision (due Wed 7 Oct).",
  SK_SPSC: "SPSC's Junior Engineer (Civil) exam rows (admit cards from 29 Sep, exam 11 Oct) sit on the Sikkim PSC Civil Services Prelims hub; citing them would print \"Exam Date 11 Oct 2026\" bare as if it were the Civil Services date. Founder decision first.",
};

// ── Rows ─────────────────────────────────────────────────────────────────

export interface Row {
  id: string;
  examId: string;
  label: string;
  date: Date;
  isExamDay: boolean;
  source: string | null;
  notes: string | null;
  kind: string | null;
  confidence: string | null;
  url: string | null;
  createdAt: Date;
  archivedAt: Date | null;
}
export const ROW_SELECT = {
  id: true,
  examId: true,
  label: true,
  date: true,
  isExamDay: true,
  source: true,
  notes: true,
  kind: true,
  confidence: true,
  url: true,
  createdAt: true,
  archivedAt: true,
} as const;

/** The fields this script may change, as JSON (dates as ISO strings). */
export interface Fields {
  label: string;
  kind: string | null;
  isExamDay: boolean;
  source: string | null;
  notes: string | null;
  confidence: string | null;
  url: string | null;
  archivedAt: string | null;
}
export const fieldsOf = (r: Row): Fields => ({
  label: r.label,
  kind: r.kind,
  isExamDay: r.isExamDay,
  source: r.source,
  notes: r.notes,
  confidence: r.confidence,
  url: r.url,
  archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
});
const updateData = (f: Fields) => ({
  label: f.label,
  kind: f.kind,
  isExamDay: f.isExamDay,
  source: f.source,
  notes: f.notes,
  confidence: f.confidence,
  url: f.url,
  archivedAt: f.archivedAt ? new Date(f.archivedAt) : null,
});
export const sameFields = (a: Fields, b: Fields) => (Object.keys(a) as (keyof Fields)[]).every((k) => a[k] === b[k]);

export function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}
const kindOf = (r: Pick<Row, "kind" | "label" | "isExamDay">) => resolveKind({ kind: r.kind, label: r.label, isExamDay: r.isExamDay });
const citedHost = (r: Row) => hostOf(rowCitation(r));
export const matches = (r: Row, f: Find) => kindOf(r) === f.kind && isoDay(r.date) === f.day && f.hosts.includes(citedHost(r)) && (!f.label || f.label.test(r.label));

// ── CLI ──────────────────────────────────────────────────────────────────

export interface Cli {
  apply: boolean;
  only: Group | "all";
  undoFile: string | null;
  acceptStale: boolean;
  log: string | null;
}

/** Parse argv (without node and the script). Refuses unknown flags, --apply
 *  without one group, and "--apply --only all". */
export function parseCli(argv: readonly string[]): Cli {
  const known = new Set(["--apply", "--only", "--undo", "--accept-stale-reads", "--log"]);
  const takesValue = new Set(["--only", "--undo", "--log"]);
  const values: Record<string, string> = {};
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!known.has(a)) throw new Error(`unknown argument ${JSON.stringify(a)} — allowed: ${[...known].join(" ")}`);
    if (takesValue.has(a)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      values[a] = v;
      i++;
    } else flags.add(a);
  }
  const apply = flags.has("--apply");
  const undoFile = values["--undo"] ?? null;
  if (undoFile) {
    if (values["--only"]) throw new Error("--undo takes the log file only (the log says which group it applied)");
    return { apply, only: "all", undoFile, acceptStale: false, log: null };
  }
  const only = (values["--only"] ?? (apply ? "" : "all")) as Group | "all";
  if (!([...GROUPS, "all"] as string[]).includes(only)) throw new Error(`--apply needs --only ${GROUPS.join(" | ")} (each group changes hub pages and gets its own read)`);
  if (apply && only === "all") throw new Error(`--apply writes one group at a time: --only ${GROUPS.join(", then --only ")}. "all" is a dry run only.`);
  return { apply, only, undoFile: null, acceptStale: flags.has("--accept-stale-reads"), log: values["--log"] ?? null };
}

/** Evidence the actions rely on that was read more than MAX_READ_AGE_DAYS ago. */
export function staleEvidence(actions: readonly Action[], now: Date): EvidenceId[] {
  const ids = [...new Set(actions.map((a) => a.evidence))];
  return ids.filter((id) => now.getTime() - new Date(EVIDENCE[id].readAt).getTime() > MAX_READ_AGE_DAYS * DAY_MS);
}

// ── Plan ─────────────────────────────────────────────────────────────────

export interface ExamCtx {
  id: string;
  code: string;
  shortName: string;
  name: string;
  state: string | null;
  officialUrl: string | null;
  live: Row[];
}

export interface Planned {
  action: Action;
  examCode: string;
  rowId: string | null;
  before: Fields | null;
  after: Fields | null;
  /** For a created row: the full row to insert. */
  create?: { kind: string; date: Date; label: string; notes: string; isExamDay: boolean; url: string };
}

export function plan(actions: readonly Action[], exams: ReadonlyMap<string, ExamCtx>, now: Date, skipped: string[]): Planned[] {
  const out: Planned[] = [];
  for (const a of actions) {
    const ex = exams.get(a.exam);
    if (!ex) {
      skipped.push(`${a.exam}: no such exam — skipped`);
      continue;
    }
    const ev = EVIDENCE[a.evidence];
    if (a.type !== "archive" && sourceTier("official", ev.url, ex.officialUrl) !== "official") {
      skipped.push(`${a.exam}: ${ev.url} is not an official-tier host for this exam (portal ${ex.officialUrl ?? "none"}) — skipped`);
      continue;
    }
    if (a.type === "create") {
      const date = new Date(`${a.row.day}T00:00:00.000Z`);
      const already = ex.live.find(
        (r) =>
          isoDay(r.date) === a.row.day &&
          ((r.source === PROVENANCE && kindOf(r) === a.row.kind) || (a.twin.test(r.label) && sourceTier(r.confidence, rowCitation(r), ex.officialUrl) === "official")),
      );
      if (already) {
        skipped.push(`${a.exam} ${a.row.day} ${a.row.kind} "${a.row.label}": a live official row already says it (${already.id} "${already.label}") — skipped`);
        continue;
      }
      const after: Fields = { label: a.row.label, kind: a.row.kind, isExamDay: a.row.isExamDay, source: PROVENANCE, notes: a.row.notes, confidence: "official", url: ev.url, archivedAt: null };
      out.push({ action: a, examCode: ex.code, rowId: null, before: null, after, create: { kind: a.row.kind, date, label: a.row.label, notes: a.row.notes, isExamDay: a.row.isExamDay, url: ev.url } });
      continue;
    }
    const hits = ex.live.filter((r) => matches(r, a.find));
    const what = `${a.exam} ${a.find.day} ${a.find.kind} cited to ${a.find.hosts.map((h) => h || "(none)").join("/")}${a.find.label ? ` ${a.find.label}` : ""}`;
    if (hits.length === 0) {
      const done = a.type === "update" ? ex.live.find((r) => isoDay(r.date) === a.find.day && kindOf(r) === a.find.kind && r.url === ev.url) : null;
      skipped.push(`${what}: no live row found${done ? ` — a live row already cites ${ev.url} (${done.id})` : " (already fixed, or changed by a refresh — check the tracker by hand)"}`);
      continue;
    }
    if (hits.length > 1) {
      skipped.push(`${what}: ${hits.length} live rows match — ambiguous, skipped`);
      continue;
    }
    const r = hits[0];
    const before = fieldsOf(r);
    let after: Fields;
    if (a.type === "archive") {
      after = { ...before, archivedAt: now.toISOString(), source: SUPPRESSED_SOURCE };
    } else {
      after = {
        ...before,
        label: a.label ?? r.label,
        kind: a.retype?.kind ?? r.kind,
        isExamDay: a.retype?.isExamDay ?? r.isExamDay,
        url: ev.url,
        confidence: "official",
        notes: a.notes,
        source: a.sticky ? PROVENANCE : r.source,
      };
    }
    if (sameFields(before, after)) {
      skipped.push(`${what}: already as planned (${r.id}) — skipped`);
      continue;
    }
    out.push({ action: a, examCode: ex.code, rowId: r.id, before, after });
  }
  return out;
}

// ── Preview: what the hub says before and after ──────────────────────────

/** Rows as they would be after the planned changes (in memory only). */
export function simulate(ex: ExamCtx, planned: readonly Planned[], now: Date): Row[] {
  const mine = planned.filter((p) => p.examCode === ex.code);
  const rows: Row[] = [];
  for (const r of ex.live) {
    const p = mine.find((x) => x.rowId === r.id);
    if (!p || !p.after) {
      rows.push(r);
      continue;
    }
    if (p.after.archivedAt) continue;
    rows.push({ ...r, label: p.after.label, kind: p.after.kind, isExamDay: p.after.isExamDay, source: p.after.source, notes: p.after.notes, confidence: p.after.confidence, url: p.after.url });
  }
  for (const p of mine) {
    if (!p.create) continue;
    rows.push({
      id: `new-${p.create.kind}-${isoDay(p.create.date)}`,
      examId: ex.id,
      label: p.create.label,
      date: p.create.date,
      isExamDay: p.create.isExamDay,
      source: PROVENANCE,
      notes: p.create.notes,
      kind: p.create.kind,
      confidence: "official",
      url: p.create.url,
      createdAt: now,
      archivedAt: null,
    });
  }
  return rows.sort((a, b) => a.date.getTime() - b.date.getTime() || (a.id < b.id ? -1 : 1));
}

/** The hub <title> up to its practice suffix, the answer lead's date
 *  sentence, the next date and the exam-week phase — the decisions
 *  src/app/exams/[code]/page.tsx makes, over the same -120/+365-day rows. */
export function hubPreview(ex: ExamCtx, rows: Row[], now: Date): string[] {
  const from = now.getTime() - 120 * DAY_MS;
  const to = now.getTime() + 365 * DAY_MS;
  const titleRows = rows.filter((r) => r.date.getTime() >= from && r.date.getTime() <= to && !isUnannouncedAnswerKey(r, ex.officialUrl));
  const timeline = buildTimeline(titleRows, now, ex.officialUrl);
  const exam = { code: ex.code, shortName: ex.shortName, name: ex.name };
  const lead = hubDateLead(timeline, exam, new Map(titleRows.map((r) => [r.id, r.createdAt] as const)));
  const year = hubTitleYear(lead, timeline, exam, now);
  const dateBit =
    lead.kind === "held"
      ? `${heldTitleLead("en", lead, lead.row.tier !== "official" ? "reported" : null)}, `
      : lead.kind === "revision"
        ? `${revisionTitleLead("en")}, `
        : lead.kind === "announced"
          ? `Exam Date ${hubTitleDay(lead.row.date)}${lead.row.tier === "official" ? "" : " (reported)"}, `
          : "Exam Date Not Announced Yet, ";
  const st = stateInfo(ex.state);
  const title = `${hubTitlePrefix("en", `${ex.shortName}${st ? ` (${st.name})` : ""}`, year, dateBit)}…`;
  const sentence = hubLead({ short: ex.shortName, dateLead: lead, titleYear: year, timeline, pattern: null, officialUrl: ex.officialUrl }) ?? "(none)";
  const { next } = stageOf(timeline);
  const week = computeExamWeekState(rows.filter((r) => r.date.getTime() >= now.getTime() - 13 * DAY_MS), ex.officialUrl, now);
  const weekText = week.phase === "none" ? "none" : `${week.phase} — ${week.focus?.label ?? "?"} ${week.focusDay ?? ""} (${week.tier ?? "?"})`;
  return [
    `title: ${title}`,
    `lead:  ${sentence}`,
    `next date: ${next ? `${next.day} ${next.kind} "${next.label}" (${next.tier})` : "none"}`,
    `exam-week block: ${weekText}`,
  ];
}

/** The next-exam cells the exam list pages print for one exam, over the
 *  given rows (live rows as they would be):
 *   • list — /exams/category/* and /exams/after/* (src/lib/exam-list-rows.ts:
 *     stageOf(buildTimeline(…)).nextExam over now −2 / +400 days, suppressed
 *     rows out; printed by src/lib/exam-categories.ts nextExamCell);
 *   • mock — /mock-tests (src/lib/mock-catalogue.ts nextExamOf, the hub
 *     title's decision, over the IST day −120 / +365 days). */
export function listCells(ex: ExamCtx, rows: readonly Row[], now: Date): { list: string; mock: string } {
  const live = rows.filter((r) => !r.archivedAt && r.source !== SUPPRESSED_SOURCE);
  const lFrom = now.getTime() - 2 * DAY_MS;
  const lTo = now.getTime() + 400 * DAY_MS;
  const next = stageOf(buildTimeline(live.filter((r) => r.date.getTime() >= lFrom && r.date.getTime() <= lTo), now, ex.officialUrl)).nextExam;
  const today = new Date(`${istDay(now)}T00:00:00.000Z`).getTime();
  const mFrom = today - DATE_WINDOW_PAST_DAYS * DAY_MS;
  const mTo = today + DATE_WINDOW_AHEAD_DAYS * DAY_MS;
  const mock = nextExamOf(
    live.filter((r) => r.date.getTime() >= mFrom && r.date.getTime() <= mTo),
    { code: ex.code, shortName: ex.shortName, name: ex.name },
    ex.officialUrl,
    now,
  );
  return { list: nextExamCell({ nextExam: next ? { day: next.day, tier: next.tier, label: next.label } : null }), mock: nextExamText(mock) };
}

/** Which exam list pages print an exam (live category hubs, indexable
 *  after-level pages, /mock-tests). Read by main() from the database. */
export interface ListMembership {
  mockTests: boolean;
  categories: string[];
  levels: string[];
}
export type ListMembershipLoader = (codes: readonly string[], now: Date) => Promise<Map<string, ListMembership>>;

/** The list pages whose next-exam cell for this exam changes. */
export function listPageUrls(m: ListMembership, before: { list: string; mock: string }, after: { list: string; mock: string }): string[] {
  const out: string[] = [];
  if (m.mockTests && before.mock !== after.mock) out.push(`${SITE}/mock-tests`);
  if (before.list !== after.list) {
    for (const c of m.categories) out.push(`${SITE}/exams/category/${c}`);
    for (const l of m.levels) out.push(`${SITE}/exams/after/${l}`);
  }
  return out;
}

function showRow(r: Row, officialUrl: string | null): string {
  const tier = sourceTier(r.confidence, rowCitation(r), officialUrl);
  return `${isoDay(r.date)} ${kindOf(r).padEnd(17)} ${tier.padEnd(8)} "${r.label}" ${rowCitation(r) ?? ""} [${r.source ?? "no source"}] ${r.id}`;
}

export function showChange(p: Planned): string[] {
  const a = p.action;
  const ev = EVIDENCE[a.evidence];
  const head =
    a.type === "archive" ? "- ARCHIVE + SUPPRESS" : a.type === "create" ? "+ CREATE" : `~ UPDATE, cites the body${a.sticky ? " (curated)" : " (source stays generated)"}`;
  const lines = [`  ${head}  [${a.group}] ${p.rowId ?? "(new row)"}`];
  if (a.type === "create" && p.create) {
    lines.push(`      before: (no row)`);
    lines.push(`      after:  ${isoDay(p.create.date)} ${p.create.kind} official "${p.create.label}" url=${p.create.url} source=${PROVENANCE}`);
    lines.push(`      notes:  ${p.create.notes}`);
  } else if (p.before && p.after) {
    for (const k of Object.keys(p.before) as (keyof Fields)[]) {
      if (p.before[k] !== p.after[k]) lines.push(`      ${k}: ${JSON.stringify(p.before[k])} → ${JSON.stringify(p.after[k])}`);
    }
  }
  lines.push(`      why: ${a.why}`);
  lines.push(`      source: ${ev.url} (${ev.body}; read ${ev.readAt})`);
  return lines;
}

// ── The pages whose text changes (IndexNow after the apply) ──────────────

/** Every URL of `code` that prints its tracker dates (the refresh writer's
 *  factUrlsForExam set, src/lib/indexnow.ts, plus context.md). The hi / te
 *  twins go to IndexNow only through gateTwinUrls (localised twins). */
export function examFactUrls(code: string, state: string | null): { urls: string[]; twins: string[] } {
  return {
    urls: [`${SITE}/exams/${code}`, `${SITE}/exams/${code}/updates`, `${SITE}/exams/${code}/context.md`, ...(state ? [`${SITE}/exams/state/${stateSlug(state)}`] : [])],
    twins: [`${SITE}/hi/exams/${code}`, `${SITE}/te/exams/${code}`, `${SITE}/hi/exams/${code}/updates`, `${SITE}/te/exams/${code}/updates`],
  };
}

/** Pages that print the exam-week block (src/lib/indexnow.ts examWeekUrls
 *  without /cutoff, plus the .ics and llms-full.txt's exam-week block). */
export function examWeekPageUrls(code: string): string[] {
  return [`${SITE}/exams/${code}/checklist`, `${SITE}/exams/${code}/live`, `${SITE}/exams/${code}/reactions`, `${SITE}/exams/${code}/exam-week.ics`, `${SITE}/llms-full.txt`];
}

// ── Write ────────────────────────────────────────────────────────────────

export interface LogEntry {
  type: Action["type"];
  group: Group;
  exam: string;
  rowId: string | null;
  before: Fields | null;
  after: Fields | null;
  why: string;
  evidenceUrl: string;
  evidenceReadAt?: string;
}
export interface LogFile {
  script: string;
  kind: "apply" | "undo";
  startedAt: string;
  status: "pending" | "applied" | "failed";
  only: string;
  undoOf?: string;
  entries: LogEntry[];
  error?: string;
}

/** The part of the Prisma client this script writes through (no delete). */
export interface TxDb {
  exam: { findUniqueOrThrow(args: { where: { code: string }; select: { id: true } }): Promise<{ id: string }> };
  examImportantDate: {
    findMany(args: unknown): Promise<unknown[]>;
    findUnique(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
    create(args: unknown): Promise<{ id: string }>;
  };
}
export interface Db extends TxDb {
  exam: TxDb["exam"] & { findMany(args: unknown): Promise<unknown[]> };
  $transaction<T>(fn: (tx: TxDb) => Promise<T>, opts?: { timeout?: number }): Promise<T>;
  $queryRaw?: (q: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>;
}

export function writeLog(path: string, log: LogFile) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(log, null, 1));
}

/** Writes the planned changes in one transaction. The log (status
 *  "pending") is on disk before the first write; a write error marks it
 *  "failed" and rethrows. */
export async function applyPlanned(db: Db, planned: readonly Planned[], logPath: string, only: string, say: (s: string) => void = console.log) {
  const startedAt = new Date();
  const entries: LogEntry[] = planned.map((p) => ({
    type: p.action.type,
    group: p.action.group,
    exam: p.examCode,
    rowId: p.rowId,
    before: p.before,
    after: p.after,
    why: p.action.why,
    evidenceUrl: EVIDENCE[p.action.evidence].url,
    evidenceReadAt: EVIDENCE[p.action.evidence].readAt,
  }));
  const log: LogFile = { script: LOG_STEM, kind: "apply", startedAt: startedAt.toISOString(), status: "pending", only, entries };
  writeLog(logPath, log); // before any write: if this throws, nothing is written
  try {
    await db.$transaction(
      async (tx) => {
        for (const [i, p] of planned.entries()) {
          if (p.create) {
            const exam = await tx.exam.findUniqueOrThrow({ where: { code: p.examCode }, select: { id: true } });
            // Looked for again inside the transaction: a second run, or a
            // hand edit since the plan, must not leave two curated rows.
            const twins = (await tx.examImportantDate.findMany({
              where: { examId: exam.id, archivedAt: null, source: PROVENANCE, date: p.create.date },
              select: ROW_SELECT,
            })) as Row[];
            const twin = twins.find((r) => kindOf(r) === p.create!.kind);
            if (twin) throw new Error(`${p.examCode} ${isoDay(p.create.date)} ${p.create.kind}: a live ${PROVENANCE} row already exists (${twin.id}) — nothing written; re-run the dry run`);
            const made = await tx.examImportantDate.create({
              data: {
                examId: exam.id,
                label: p.create.label,
                date: p.create.date,
                isExamDay: p.create.isExamDay,
                kind: p.create.kind,
                confidence: "official",
                url: p.create.url,
                notes: p.create.notes,
                source: PROVENANCE,
              },
              select: { id: true },
            });
            entries[i].rowId = made.id;
            continue;
          }
          if (!p.rowId || !p.before || !p.after) continue;
          const now = (await tx.examImportantDate.findUnique({ where: { id: p.rowId }, select: ROW_SELECT })) as Row | null;
          if (!now || !sameFields(fieldsOf(now), p.before)) throw new Error(`row ${p.rowId} (${p.examCode}) changed since the plan — nothing written; re-run the dry run`);
          await tx.examImportantDate.update({ where: { id: p.rowId }, data: updateData(p.after) });
        }
      },
      { timeout: 60_000 },
    );
    log.status = "applied";
  } catch (e) {
    log.status = "failed";
    log.error = (e as Error).message;
  }
  try {
    writeLog(logPath, log);
  } catch (e) {
    say(`Could not write the log (${(e as Error).message}); here it is:\n${JSON.stringify(log, null, 1)}`);
  }
  if (log.status === "failed") throw new Error(log.error);
  say(`\nAPPLIED ${entries.length} change(s). Undo log: ${logPath}`);
  say(`Undo: npx tsx --env-file=.env.local scripts/${LOG_STEM}.ts --undo ${logPath.replace(/\\/g, "/")} --apply`);
}

/** Puts an applied log back: each row to its `before`, a created row
 *  archived (never deleted). Rows changed since the apply are skipped. Dry
 *  run unless `apply`; the undo writes its own log first. */
export async function undo(db: Db, file: string, apply: boolean, logDir: string = LOG_DIR, say: (s: string) => void = console.log): Promise<{ restored: number; problems: string[] }> {
  const log = JSON.parse(readFileSync(file, "utf8")) as LogFile;
  if (log.script !== LOG_STEM || log.kind !== "apply" || log.status !== "applied") throw new Error(`${file} is not an applied log of ${LOG_STEM}`);
  say(`UNDO of ${file} (${log.entries.length} entries, applied ${log.startedAt}). ${apply ? "APPLY" : "DRY RUN"}\n`);
  const steps: { entry: LogEntry; restore: Fields; current: Fields }[] = [];
  const problems: string[] = [];
  for (const e of [...log.entries].reverse()) {
    if (!e.rowId) {
      problems.push(`${e.exam} ${e.type}: no row id in the log — skipped`);
      continue;
    }
    const r = (await db.examImportantDate.findUnique({ where: { id: e.rowId }, select: ROW_SELECT })) as Row | null;
    if (!r) {
      problems.push(`${e.exam} ${e.rowId}: row not found — skipped`);
      continue;
    }
    const current = fieldsOf(r);
    if (!e.after || !sameFields(current, e.after)) {
      problems.push(`${e.exam} ${e.rowId}: changed since this script wrote it — skipped, check by hand`);
      continue;
    }
    // A created row is archived, never deleted.
    const restore = e.type === "create" || !e.before ? { ...current, archivedAt: new Date().toISOString() } : e.before;
    steps.push({ entry: e, restore, current });
  }
  for (const s of steps) {
    say(`  ${s.entry.type === "create" ? "ARCHIVE created row" : "RESTORE"} ${s.entry.exam} ${s.entry.rowId}`);
    for (const k of Object.keys(s.current) as (keyof Fields)[]) {
      if (s.current[k] !== s.restore[k]) say(`      ${k}: ${JSON.stringify(s.current[k])} → ${JSON.stringify(s.restore[k])}`);
    }
  }
  for (const p of problems) say(`  ! ${p}`);
  if (!apply) {
    say("\nDry run — re-run with --apply to write.");
    return { restored: 0, problems };
  }
  const logPath = join(logDir, `${LOG_STEM}.undo.${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const undoLog: LogFile = {
    script: LOG_STEM,
    kind: "undo",
    startedAt: new Date().toISOString(),
    status: "pending",
    only: log.only,
    undoOf: file,
    entries: steps.map((s) => ({ type: s.entry.type, group: s.entry.group, exam: s.entry.exam, rowId: s.entry.rowId, before: s.current, after: s.restore, why: `undo of ${file}`, evidenceUrl: s.entry.evidenceUrl })),
  };
  writeLog(logPath, undoLog);
  try {
    await db.$transaction(
      async (tx) => {
        for (const s of steps) {
          const r = (await tx.examImportantDate.findUnique({ where: { id: s.entry.rowId! }, select: ROW_SELECT })) as Row | null;
          if (!r || !sameFields(fieldsOf(r), s.current)) throw new Error(`row ${s.entry.rowId} changed during the undo — nothing written`);
          await tx.examImportantDate.update({ where: { id: s.entry.rowId! }, data: updateData(s.restore) });
        }
      },
      { timeout: 60_000 },
    );
    undoLog.status = "applied";
  } catch (e) {
    undoLog.status = "failed";
    undoLog.error = (e as Error).message;
  }
  writeLog(logPath, undoLog);
  if (undoLog.status === "failed") throw new Error(undoLog.error);
  say(`\nUNDONE ${steps.length} change(s). Log: ${logPath}`);
  return { restored: steps.length, problems };
}

// ── Load ─────────────────────────────────────────────────────────────────

export async function loadExams(db: Db, codes: readonly string[]): Promise<Map<string, ExamCtx>> {
  const exams = (await db.exam.findMany({
    where: { code: { in: [...codes] } },
    select: { id: true, code: true, shortName: true, name: true, state: true, eligibility: { select: { officialUrl: true } } },
  })) as { id: string; code: string; shortName: string; name: string; state: string | null; eligibility: { officialUrl: string | null } | null }[];
  const out = new Map<string, ExamCtx>();
  for (const e of exams) {
    const live = (await db.examImportantDate.findMany({ where: { examId: e.id, archivedAt: null }, orderBy: [{ date: "asc" }, { id: "asc" }], select: ROW_SELECT })) as Row[];
    out.set(e.code, { id: e.id, code: e.code, shortName: e.shortName, name: e.name, state: e.state, officialUrl: e.eligibility?.officialUrl ?? null, live });
  }
  return out;
}

// ── Run ──────────────────────────────────────────────────────────────────

export interface RunOpts {
  now?: Date;
  say?: (s: string) => void;
  logDir?: string;
  /** Which list pages print each exam (main() reads it; tests stub it). */
  listPages?: ListMembershipLoader;
}

export async function run(argv: readonly string[], db: Db, opts: RunOpts = {}): Promise<{ planned: Planned[]; skipped: string[]; applied: boolean }> {
  const cli = parseCli(argv);
  const say = opts.say ?? console.log;
  const logDir = opts.logDir ?? LOG_DIR;
  if (cli.undoFile) {
    if (!existsSync(cli.undoFile)) throw new Error(`no such log: ${cli.undoFile}`);
    await undo(db, cli.undoFile, cli.apply, logDir, say);
    return { planned: [], skipped: [], applied: cli.apply };
  }
  const now = opts.now ?? new Date();
  const actions = ACTIONS.filter((a) => cli.only === "all" || a.group === cli.only);
  const codes = [...new Set(actions.map((a) => a.exam))];
  const exams = await loadExams(db, codes);
  const skipped: string[] = [];
  const planned = plan(actions, exams, now, skipped);

  say(`Tracker date fixes, read on the bodies' own sites 6 Oct 2026 (09:28–10:14 IST) — group: ${cli.only}. ${cli.apply ? "APPLY" : "DRY RUN (nothing is written)"}`);
  say(`Planned: ${planned.length} change(s) on ${new Set(planned.map((p) => p.examCode)).size} exam(s); skipped: ${skipped.length}.\n`);

  let membership: Map<string, ListMembership> | null = null;
  let membershipNote = "list pages: not checked (no list-page reader)";
  if (opts.listPages) {
    try {
      membership = await opts.listPages(codes, now);
      membershipNote = "";
    } catch (e) {
      membershipNote = `list pages: not checked (${(e as Error).message})`;
    }
  }

  const urls = new Set<string>();
  const twinUrls = new Set<string>();
  const calendarFrom = now.getTime() - 1.5 * DAY_MS;
  const calendarTo = now.getTime() + 120 * DAY_MS;
  let calendarChanges = false;
  let llmsFull = false;
  const changedDays: string[] = [];

  for (const code of codes) {
    const ex = exams.get(code);
    if (!ex) continue;
    const mine = planned.filter((p) => p.examCode === code);
    say(`== ${code} (${ex.shortName}) — portal ${ex.officialUrl ?? "(none)"}`);
    const touched = new Set(mine.map((p) => p.rowId));
    const upcoming = ex.live.filter((r) => r.date.getTime() >= now.getTime() - 10 * DAY_MS || touched.has(r.id));
    say("  live rows from 10 days back (BEFORE):");
    for (const r of upcoming) say(`    ${touched.has(r.id) ? "*" : " "} ${showRow(r, ex.officialUrl)}`);
    if (mine.length) {
      say("  CHANGES (before → after):");
      for (const p of mine) for (const l of showChange(p)) say(l);
    } else say("  CHANGES: none planned");
    const afterRows = simulate(ex, planned, now);
    if (mine.length) {
      say("  live rows from 10 days back (AFTER):");
      for (const r of afterRows.filter((r) => r.date.getTime() >= now.getTime() - 10 * DAY_MS)) say(`      ${showRow(r, ex.officialUrl)}`);
    }
    const before = hubPreview(ex, ex.live, now);
    const after = hubPreview(ex, afterRows, now);
    say("  HUB BEFORE:");
    for (const l of before) say(`    ${l}`);
    say("  HUB AFTER:");
    for (const l of after) say(`    ${l}${before.includes(l) ? "" : "   ← changes"}`);
    const cellsBefore = listCells(ex, ex.live, now);
    const cellsAfter = listCells(ex, afterRows, now);
    const m = membership?.get(code) ?? null;
    const listedOn = m
      ? [...(m.mockTests ? ["/mock-tests"] : []), ...m.categories.map((c) => `/exams/category/${c}`), ...m.levels.map((l) => `/exams/after/${l}`)].join(", ") || "none"
      : membershipNote;
    say(`  LIST PAGES (listed on: ${listedOn}):`);
    say(`    category / after-level cell: "${cellsBefore.list}" → "${cellsAfter.list}"${cellsBefore.list === cellsAfter.list ? " (same)" : "   ← changes"}`);
    say(`    /mock-tests cell: "${cellsBefore.mock}" → "${cellsAfter.mock}"${cellsBefore.mock === cellsAfter.mock ? " (same)" : "   ← changes"}`);
    if (mine.length) {
      const f = examFactUrls(code, ex.state);
      f.urls.forEach((u) => urls.add(u));
      f.twins.forEach((u) => twinUrls.add(u));
      if (m) listPageUrls(m, cellsBefore, cellsAfter).forEach((u) => urls.add(u));
      // An exam inside its exam week (before or after) prints its rows on the
      // exam-week pages and in llms-full.txt's exam-week block too.
      const inWeek = (xs: string[]) => !xs.includes("exam-week block: none");
      if (inWeek(before) || inWeek(after)) {
        examWeekPageUrls(code).forEach((u) => urls.add(u));
        llmsFull = true;
      }
      for (const p of mine) {
        const d = p.create?.date ?? ex.live.find((r) => r.id === p.rowId)?.date;
        if (!d) continue;
        changedDays.push(isoDay(d));
        if (d.getTime() >= calendarFrom && d.getTime() <= calendarTo) calendarChanges = true;
      }
    }
    // A created official row is "new" to the exam-alerts cron: one mail /
    // phone alert per subscriber at the next 9 AM IST run (within its cap).
    const creates = mine.filter((p) => p.create);
    if (creates.length) {
      const q = db.$queryRaw?.bind(db);
      const count = async (read: (q: NonNullable<Db["$queryRaw"]>) => Promise<unknown>) => {
        if (!q) return "?";
        try {
          const r = (await read(q)) as { n: bigint }[];
          return String(r[0]?.n ?? 0);
        } catch {
          return "?";
        }
      };
      const mail = await count((q) => q`SELECT COUNT(*)::bigint AS n FROM "ExamAlert" WHERE "examId" = ${ex.id} AND "unsubscribedAt" IS NULL`);
      const phones = await count((q) => q`SELECT COUNT(*)::bigint AS n FROM "ExamPushAlert" WHERE "examId" = ${ex.id} AND "unsubscribedAt" IS NULL`);
      say(
        `  ALERTS: ${creates.length} new official row(s) — the next exam-alerts run (9 AM IST) mails ${mail} live email subscriber(s) and ${phones} phone(s) of ${code}, within their resend cap (at most 4 new rows per exam per mail). The mail names the new date; it does not say which date it replaces.`,
      );
    }
    say("");
  }
  if (skipped.length) {
    say("SKIPPED:");
    for (const s of skipped) say(`  ! ${s}`);
    say("");
  }
  if (cli.only === "all" || cli.only === "cite") {
    say("HELD BY THE FOUNDER (not in this script; the 3 Oct script keeps them as held cites):");
    for (const [code, why] of Object.entries(HELD_BY_FOUNDER)) say(`  = ${code}: ${why}`);
    say("LEFT AS THEY ARE, FOUNDER QUESTION (never written by this script):");
    for (const q of FOUNDER_QUESTIONS) say(`  ? ${q.exam} ${q.day} ${q.kind}: ${q.question}`);
    say("");
  }

  // The home page's upcoming rail lists the 30 soonest live rows of real exams.
  let homeLine = "home page rail: not checked";
  try {
    const todayStart = new Date(`${isoDay(new Date(now.getTime() + 330 * 60_000))}T00:00:00.000Z`);
    const soonest = (await db.examImportantDate.findMany({
      // REAL_EXAM_WHERE (src/lib/db/exam-scope.ts), as the home page reads it.
      where: { date: { gte: todayStart }, archivedAt: null, exam: { active: true, category: { not: "SCHOOL_BOARD" } } },
      orderBy: { date: "asc" },
      take: 30,
      select: { id: true, date: true },
    })) as { id: string; date: Date }[];
    const last = soonest.length ? isoDay(soonest[soonest.length - 1].date) : null;
    const today = isoDay(todayStart);
    const inRail = changedDays.filter((d) => d >= today && last !== null && d <= last);
    if (inRail.length) urls.add(`${SITE}/`);
    homeLine = `home page rail (30 soonest live rows, the last on ${last ?? "?"}): ${inRail.length ? `changes (${[...new Set(inRail)].join(", ")})` : "no change from this group"}`;
  } catch (e) {
    homeLine = `home page rail: not checked (${(e as Error).message})`;
  }
  if (calendarChanges) urls.add(`${SITE}/exam-calendar`);
  if (llmsFull) urls.add(`${SITE}/llms-full.txt`);
  say(homeLine);
  if (!membership) say(`${membershipNote} — /mock-tests, /exams/category/* and /exams/after/* are NOT in the list below; check them by hand.`);
  say(`INDEXNOW after the apply of this group (${urls.size} URLs; the hi / te twins only through gateTwinUrls):`);
  for (const u of [...urls].sort()) say(`  ${u}`);
  if (twinUrls.size) say(`  twins (gateTwinUrls first): ${[...twinUrls].sort().join(" ")}`);
  say("");

  const stale = staleEvidence(actions, now);
  if (stale.length) say(`STALE READS: ${stale.map((id) => `${id} (read ${EVIDENCE[id].readAt})`).join(", ")} — more than ${MAX_READ_AGE_DAYS} days old. Re-read those pages; --apply is refused until readAt is updated (or --accept-stale-reads after a same-day re-read).`);

  if (!cli.apply) {
    say(`Dry run — nothing written. Apply one group at a time: --apply --only ${GROUPS.join(" | ")}.`);
    return { planned, skipped, applied: false };
  }
  if (stale.length && !cli.acceptStale) throw new Error(`REFUSED — stale evidence (${stale.join(", ")}); see above.`);
  if (planned.length === 0) {
    say("Nothing to write.");
    return { planned, skipped, applied: false };
  }
  const logPath = cli.log ?? join(logDir, `${LOG_STEM}.${cli.only}.${now.toISOString().replace(/[:.]/g, "-")}.json`);
  await applyPlanned(db, planned, logPath, cli.only, say);
  return { planned, skipped, applied: true };
}

/** The live list pages that print each exam, read the way those pages read
 *  them (SELECT only): src/lib/exam-list-rows.ts loadExamListRows for the
 *  category and after-level pages, src/lib/db/mock-catalogue-db.ts for
 *  /mock-tests. Membership does not depend on tracker dates, so it is the
 *  same before and after the apply. */
async function loadListMembership(codes: readonly string[], now: Date): Promise<Map<string, ListMembership>> {
  const [{ loadExamListRows }, cats, qual, { loadMockCatalogueInput }, { buildMockCatalogue, catalogueRows }] = await Promise.all([
    import("../src/lib/exam-list-rows"),
    import("../src/lib/exam-categories"),
    import("../src/lib/exam-qualification"),
    import("../src/lib/db/mock-catalogue-db"),
    import("../src/lib/mock-catalogue"),
  ]);
  const rows = await loadExamListRows(now);
  const onMocks = new Set(catalogueRows(buildMockCatalogue(await loadMockCatalogueInput(now), now)).map((r) => r.code));
  const out = new Map<string, ListMembership>();
  for (const code of codes) {
    const categories = cats.EXAM_CATEGORIES.filter((c) => {
      const list = cats.examsInCategory(c, rows);
      return cats.isCategoryLive(list) && list.some((e) => e.code === code);
    }).map((c) => c.slug);
    const levels = qual.PUBLISHED_LEVELS.filter((l) => {
      const g = qual.examsAfter(l, rows);
      return qual.isLevelIndexable(l, g) && [...g.government, ...g.entrance].some((e) => e.code === code);
    }).map((l) => l.slug);
    out.set(code, { mockTests: onMocks.has(code), categories, levels });
  }
  return out;
}

async function main() {
  const { prisma } = await import("../src/lib/db/prisma");
  try {
    await run(process.argv.slice(2), prisma as unknown as Db, { listPages: loadListMembership });
  } finally {
    await prisma.$disconnect();
  }
}

if (/fix-tracker-dates-2026-10-06\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
