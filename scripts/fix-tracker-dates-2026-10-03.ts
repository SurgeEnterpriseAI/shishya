// scripts/fix-tracker-dates-2026-10-03.ts — exam-tracker rows that are wrong,
// superseded, or cited only to an aggregator, each checked on the conducting
// body's own site on 3 Oct 2026 (signup-100 plan, lever 4: "first fix wrong
// or stale rows: NSEJS, CTET's 4 Oct row, UP PET's 23/24 Oct rows, and
// relabel 45 aggregator rows 'reported'").
//
// What a "reported" row is, and why this script writes no "reported" label:
// ExamImportantDate stores only confidence "official" (announced, URL cited)
// or "expected" (estimate). The tier a page prints is DERIVED from the cited
// host by src/lib/official-source.ts sourceTier(): the body's own site (or a
// regulated government / academic domain, or the exam's portal) → official;
// any other host → reported; a denylisted copycat → expected. So every row
// cited only to an aggregator is already "reported" on every surface that
// goes through sourceTier (hub title, lead and countdown chip, tracker, exam
// calendar, context.md; Event JSON-LD takes official rows only). The dry run
// of 3 Oct 2026 (12:45 IST) listed 55 live future rows stored "official"
// whose tier derives as reported or expected — 46 inside the next 60 days
// (the plan counted 45), 2 of them cited to a denylisted host — with what
// this script does to each. The two surfaces that printed a reported
// date without its tier word are fixed in code (src/lib/date-tier-view.ts):
// the tracker's countdown strip now, the hub's Important Dates list by the
// patch the report describes.
//
// Two groups, applied separately (each changes hub titles, a search surface,
// and gets its own by-channel read — the plan's rule). --apply takes exactly
// one group; "--only all" is a dry run only.
//   fix  — honesty fixes. A row the body contradicts is ARCHIVED, and when it
//          was generated its source becomes SUPPRESSED_SOURCE so the refresh
//          writer (src/lib/exam-data-writer.ts) never re-creates that kind on
//          that day for that exam. A wrong date, or an estimate the body has
//          since replaced, gives way to a new row at the date the body states,
//          citing the body (UKPSC PCS prelims; MP Police Constable).
//   cite — rows whose date the body's own page confirms, but which cite an
//          aggregator: the citation becomes the body's document, the notes the
//          body's words (and, where a row was misnamed, its label or kind).
//          "sticky" rows take the provenance tag below, which the refresh
//          writer treats as a curated, human-checked row (it then drops
//          generated copies of that kind within its window); rows on
//          multi-recruitment hubs (MP ESB, JKSSB) keep their generated
//          source, because a curated row there would also drop OTHER
//          recruitments' generated dates of the same kind — the next refresh
//          of those exams may put an aggregator citation back.
// HELD cites (review of 3 Oct): confirmed on the body's page, but waiting on
// a founder decision, so they are printed and NOT written — Sikkim PSC (its
// dated rows are a Junior Engineer exam on a Civil Services hub) and NSTSE
// (the SOF/SZF/NSTSE decision due Wed 7 Oct). "--release SK_SPSC,NSTSE"
// includes them in a cite run once the founder has decided.
// An exam day that becomes official (the rows fix creates, every EXAM row
// cite upgrades) also enters schema.org Event data on that exam's tracker,
// on /exam-calendar and on the home page — structured data, part of the same
// search-surface change. A CREATED official row is also "new" to the daily
// exam-alerts cron (src/app/api/cron/exam-alerts/route.ts, 9 AM IST): that
// exam's subscribers get one mail / phone alert naming it (the dry run
// prints how many). Apply fix before cite: UP PET's title stays "Under
// Revision" until the superseded 23/24 Oct rows are archived.
// Rows are found at run time by exam, kind, IST day and cited host — never by
// id alone: a refresh re-writes generated rows (CTET's changed between two
// reads on 3 Oct). Nothing found → printed and skipped; a cite that finds
// more than one row → printed and skipped.
// Never deletes. Writes run in one transaction; each row is re-read inside it
// (a row to create is looked for again) and the whole run stops if anything
// changed since the plan.
//
// Undo: --apply writes data/fix-logs/fix-tracker-dates-2026-10-03.<group>.<time>.json
// with every row's fields before and after; --undo <that file> puts them back
// (a created row is archived, never deleted). Hubs read the change within 10
// minutes (exam-shared cache), trackers within 30.
//
// USAGE (from D:\CodexProjects\shishya; .env.local is PRODUCTION):
//   npx tsx --env-file=.env.local scripts/fix-tracker-dates-2026-10-03.ts                       # dry run, both groups
//   npx tsx --env-file=.env.local scripts/fix-tracker-dates-2026-10-03.ts --only fix            # dry run, one group
//   npx tsx --env-file=.env.local scripts/fix-tracker-dates-2026-10-03.ts --apply --only fix    # write the honesty fixes
//   npx tsx --env-file=.env.local scripts/fix-tracker-dates-2026-10-03.ts --apply --only cite   # write the citations (separate read)
//   npx tsx --env-file=.env.local scripts/fix-tracker-dates-2026-10-03.ts --apply --only cite --release NSTSE   # a held cite, after the founder decides
//   npx tsx --env-file=.env.local scripts/fix-tracker-dates-2026-10-03.ts --undo data/fix-logs/<file>.json [--apply]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { prisma } from "../src/lib/db/prisma";
import { SUPPRESSED_SOURCE, buildTimeline, isUnannouncedAnswerKey, isoDay, resolveKind, rowCitation } from "../src/lib/exam-timeline";
import { GEN_SOURCE } from "../src/lib/exam-data-writer";
import { sourceTier } from "../src/lib/official-source";
import { heldTitleLead, hubDateLead, hubTitleDay, hubTitlePrefix, hubTitleYear, revisionTitleLead } from "../src/lib/hub-title";
import { hubLead } from "../src/lib/answer-lead";
import { computeExamWeekState } from "../src/lib/exam-week";
import { stateInfo } from "../src/lib/state-info";

const PROVENANCE = "official-research:2026-10-03";
const LOG_DIR = "data/fix-logs";
const LOG_STEM = "fix-tracker-dates-2026-10-03";
const DAY_MS = 86_400_000;

// ── Evidence: each read on the body's own site on 3 Oct 2026 ────────────

interface Evidence {
  body: string;
  url: string;
  /** The document, and where the body lists it. */
  doc: string;
  /** What it says, word for word (Hindi / Gujarati notices quoted in English where marked). */
  quote: string;
}

const EVIDENCE = {
  iapt: {
    body: "Indian Association of Physics Teachers (IAPT)",
    url: "https://iapt.org.in/?id=2423",
    doc: "IAPT NSE 2026 page",
    quote:
      "Examination Schedule NSEA (Astronomy) Saturday 21.11.26 2.30 pm to 4.30 pm NSEP (Physics) Sunday 22.11.26 8.30 am to 10.30 am NSEC (Chemistry) Sunday 22.11.26 11.30 am to 1.30 pm NSEB (Biology) Sunday 22.11.26 2.30 pm to 4.30 pm NSEJS (Junior Science) Sunday 22.11.26 2.30 pm to 4.30 pm",
  },
  cbse: {
    body: "CBSE (CTET unit)",
    url: "https://cdnbbsr.s3waas.gov.in/s3443dec3062d0286986e21dc0631734c9/uploads/2026/09/20260914325514446.pdf",
    doc: "Public notice of 14 Sep 2026, linked on ctet.nic.in as 'PUBLIC NOTICE: Exam Dates for 22nd edition of CTET'",
    quote:
      "the 22nd edition of the Central Teacher Eligibility Test (CTET) will be conducted on 12th and 13th December 2026. … The Admit Card, containing details of the Examination Centre, will be made available for download from the CTET portal two days before the examination.",
  },
  upsssc: {
    body: "UPSSSC",
    url: "https://upsssc.gov.in/ViewPdf.aspx?NJbKyTiDxAqQnRYKCqojRTHwngIdnR5KGQXPSU/8zc0=",
    doc: "Notice 1423/36/तीन(परी0-1)/2026/खण्ड-2 of 25 Sep 2026, listed 25/09/2026 on https://upsssc.gov.in/News.aspx?id=1 (scanned PDF, read as an image)",
    quote:
      "आयोग की आवश्यक सूचना सं0 1303/36/तीन(परी0-1)/2026/खण्ड-2, दिनांक 09.09.2026 द्वारा … PET-2026 की लिखित परीक्षा का आयोजन दिनांक-23, 24 व 25 अक्टूबर, 2026 को … कराये जाने की सूचना दी गयी थी। … अपरिहार्य कारणों से प्रश्नगत परीक्षा दिनांक 25 अक्टूबर, 2026 (रविवार), 30 अक्टूबर, 2026 (शुक्रवार) व 01 नवम्बर, 2026 (रविवार) को प्रत्येक दिवस दो पाली (प्रथम पाली- पूर्वाह्न 10:00 बजे से 12:00 बजे तक तथा द्वितीय पाली अपराह्न 03:00 बजे से 05:00 बजे तक) में आयोजित की जायेगी। उक्त परीक्षा के प्रवेश पत्र निर्गत किये जाने के सम्बन्ध में अभ्यर्थियों को वेबसाइट के माध्यम से पृथक से यथासमय सूचित किया जाएगा।",
  },
  ukpsc: {
    body: "Uttarakhand Public Service Commission (UKPSC)",
    url: "https://psc.uk.gov.in/public/uploads/pdf/1788267804.pdf",
    doc: "Exam Calendar 2026-27 (Updated), letter 115/2026-27 of 1 Sep 2026, listed on https://psc.uk.gov.in/exam%20calendar; the PCS 2026 notice 116/06/E-01/DR/PCS/2026-27 of 9 Sep 2026 (https://psc.uk.gov.in/public/uploads/recruitment/1247631101.pdf) gives application dates only",
    quote:
      "1 | कार्मिक विभाग | उत्तराखण्ड सम्मिलित राज्य सिविल/प्रवर अधीनस्थ सेवा परीक्षा–2026 (प्रारम्भिक परीक्षा) | प्रस्तावित परीक्षा तिथि: 29 नवम्बर, 2026 | रविवार",
  },
  gpsc: {
    body: "Gujarat Public Service Commission (GPSC)",
    url: "https://gpsc.gujarat.gov.in/Documents/ES-04072026.pdf",
    doc: "Exam Schedule, linked from the gpsc.gujarat.gov.in home page (Gujarati, read as an image)",
    quote:
      "12 | 5 | 2026-27 | ગુજરાત વહિવટી સેવા, વર્ગ-૧, ગુજરાત મુલ્કી સેવા, વર્ગ-૧ અને વર્ગ-૨ તથા ગુજરાત નગરપાલિકાના મુખ્ય અધિકારી, વર્ગ-૨ | 213 | મુખ્ય પરીક્ષા : ૫ થી ૧૧-૧૦-૨૦૨૬ (Mains: 5 to 11-10-2026)",
  },
  apsc: {
    body: "Assam Public Service Commission (APSC)",
    url: "https://apsc.nic.in/notif_2026/CCE_Mains_2025_Schedule_01_2026.pdf",
    doc: "Notification No.8PSC/E-10/2026-2027 of 5 Sep 2026, linked on apsc.nic.in",
    quote:
      "the Combined Competitive (Main) Examination, 2025 will be held as per programme given below at Guwahati Centre: 09.10.2026 (Friday) Paper-1 Essay / Paper-2 General Studies-I; 10.10.2026 (Saturday) Paper-3 General Studies-II / Paper-4 General Studies-III; 11.10.2026 (Sunday) Paper-5 General Studies-IV / Paper-6 General Studies-V. Forenoon 09:00 AM to 12:00 PM, Afternoon 01:30 PM to 04:30 PM.",
  },
  spsc: {
    body: "Sikkim Public Service Commission (SPSC)",
    url: "https://spsc.sikkim.gov.in/Notices/JE_Civil_Written_Notice.pdf",
    doc: "Notice No.120/SPSC/EXAM/2026 of 8 Sep 2026, linked on spsc.sikkim.gov.in",
    quote:
      "The written examination for filling up of 100 (hundred) posts of Junior Engineer (Civil) under Roads & Bridges Department … is hereby scheduled … 9:00 am to 11:00 am [and] 01:00 noon to 4:00 pm, 11th Oct. 2026 (Sunday) … Eligible candidates may download their admit cards with effect from 29/09/2026",
  },
  ucOffline: {
    body: "Unified Council (NSTSE)",
    url: "https://www.unifiedcouncil.com/about-nstse.html",
    doc: "About NSTSE (offline) page",
    quote: "Offline Exam dates (for Registrations through Schools) 20-11-2026(Friday) & 02-12-2026(Wednesday) Online Exam Date (for Direct Registrations) 24-01-2027(Sunday)",
  },
  ucOnline: {
    body: "Unified Council (NSTSE)",
    url: "https://www.unifiedcouncil.com/about-nstse-online.html",
    doc: "About NSTSE (online) page",
    quote: "Mock Exam : 17-01-2027 (Sunday) Final Exam : 24-01-2027 (Sunday) Schedule and procedure will be informed to the candidate before 15 days of the exam.",
  },
  esbPolice: {
    body: "MP Employees Selection Board (ESB)",
    url: "https://esb.mp.gov.in/Rulebooks/RB_2026/PCRT_2026_Rulebook_Revised_Page_01_15092026.pdf",
    doc: "Police Constable (GD) Recruitment Test 2026 rulebook, revised page 1 (15 Sep 2026), linked on esb.mp.gov.in (scanned, read as an image)",
    quote:
      "ऑनलाइन आवेदन पत्र भरने की प्रारम्भ तिथि : 22-09-2026 | ऑनलाइन आवेदन पत्र भरने की अंतिम तिथि : 06-10-2026 | आवेदन पत्र में संशोधन करने की अंतिम तिथि : 11-10-2026 | संभावित परीक्षा दिनांक व दिन : 19-11-2026 से प्रारंभ",
  },
  esbGroup3: {
    body: "MP Employees Selection Board (ESB)",
    url: "https://esb.mp.gov.in/Advertisement/ADV_2026/Group3_2026_ExamDate_changeNotice_01102026.jpg",
    doc: "'Form Reopen and Exam Date Postponed Notice' of 1 Oct 2026, linked on esb.mp.gov.in (image)",
    quote:
      "उक्त परीक्षा के पुन: ऑनलाइन आवेदन पत्र भरने हेतु दिनांक 13/10/2026 से 27/10/2026 तक एवं संशोधन हेतु दिनांक 13/10/2026 से 28/10/2026 तक की समयावधि निर्धारित की जाती है। … दिनांक 07/10/2026 से प्रस्तावित समूह-3 के अंतर्गत उपयंत्री, मानचित्रकार, प्रयोगशाला तकनीशियन व अन्य समकक्ष पदों हेतु संयुक्त भर्ती परीक्षा 2026 (द्वितीय) का आयोजन दिसंबर-जनवरी माह में किया जायेगा।",
  },
  // Review of 3 Oct: the builder's first pass read only JKSSB's annual
  // calendar (months only) and missed these two exam-date notices, both
  // listed on https://jkssb.nic.in/Whatsnew.html.
  jkssbHome: {
    body: "J&K Services Selection Board (JKSSB)",
    url: "https://jkssb.nic.in/Pdf/notice_01082026.pdf",
    doc: "Notice JKSSB-COE0EXAM(UT)/10/2022-04 of 1 Aug 2026, 'Advance Notice for Conduct of Examinations for various Posts of Home Department, J&K', listed on https://jkssb.nic.in/Whatsnew.html (scanned, read as an image)",
    quote:
      "the Jammu and Kashmir Services Selection Board is scheduled to conduct the OMR-Based Written Examinations for various posts of Home Department, J&K, as per the schedule mentioned in Annexure \"A\" to this notice. The Admit Cards shall be issued seven (07) days prior to the date of Examinations. | Annexure A: 02 of 2024, item 07, Sub-Inspector, 29.11.2026 | 12 of 2025, items 273-274, Constable (Executive), 13.12.2026 | 14 of 2025, items 323-324, Constable (Armed/IRP/SDRF), 20.12.2026 | 11 of 2025, item 272, Sub Inspector (Telecommunication), 23.12.2026 | 15 of 2025, item 325, Constable (Telecommunication), 27.12.2026 | 15 of 2025, item 326, Constable (Photographer), 30.12.2026",
  },
  jkssbFinance: {
    body: "J&K Services Selection Board (JKSSB)",
    url: "https://jkssb.nic.in/Pdf/notice1_31072026.pdf",
    doc: "Notice JKSSB-COEOEXAM/10/2022-04 of 31 Jul 2026 ('Rescheduling of OMR Based Written Examinations for the Posts of Health & Medical Education Department and Issuance of Advance Notice for Conduct of Examinations for Various Posts'), listed on https://jkssb.nic.in/Whatsnew.html. JKSSB's notice of 17 Sep 2026 (https://jkssb.nic.in/Pdf/notice2_17092026.pdf) modifies it for Health & Medical Education posts only.",
    quote: "Annexure A, row 15: 10 of 2025 | 271 | Finance Department | Accounts Assistant | 15-11-2026 (Sunday)",
  },
} satisfies Record<string, Evidence>;
type EvidenceId = keyof typeof EVIDENCE;

// ── The changes ──────────────────────────────────────────────────────────

type Group = "fix" | "cite";

interface Find {
  kind: string;
  /** IST calendar day, YYYY-MM-DD. */
  day: string;
  /** The cited host (no www.) the row must carry; "" = no citation. */
  hosts: string[];
  label?: RegExp;
}

interface ArchiveAction {
  group: "fix";
  type: "archive";
  exam: string;
  find: Find;
  why: string;
  evidence: EvidenceId;
}
interface CreateAction {
  group: "fix";
  type: "create";
  exam: string;
  row: { kind: string; day: string; label: string; notes: string; isExamDay: boolean };
  why: string;
  evidence: EvidenceId;
}
interface CiteAction {
  group: "cite";
  type: "cite";
  exam: string;
  find: Find;
  notes: string;
  label?: string;
  /** Re-type a row the aggregator filed under the wrong kind (NSTSE's
   *  practice mock was an EXAM row and would have led the hub title). */
  retype?: { kind: string; isExamDay: boolean };
  /** Curated provenance (see the header); false on multi-recruitment hubs. */
  sticky: boolean;
  evidence: EvidenceId;
  /** Waiting on the founder: printed, not written, unless --release names the exam. */
  hold?: string;
}
type Action = ArchiveAction | CreateAction | CiteAction;

const UP_PET_NOTE =
  "Two shifts each day: 10:00–12:00 and 15:00–17:00. UPSSSC notice 1423 of 25 Sep 2026 (listed under that date in upsssc.gov.in's news) moved the written exam from 23, 24 and 25 Oct to 25 Oct, 30 Oct and 1 Nov 2026; the admit card will be announced on upsssc.gov.in.";
const APSC_NOTE = (papers: string) =>
  `CCE (Main) 2025 at the Guwahati centre: ${papers} (APSC notification 8PSC/E-10/2026-2027 of 5 Sep 2026).`;
const SPSC_NOTE =
  "SPSC notice 120/SPSC/EXAM/2026 of 8 Sep 2026: Junior Engineer (Civil), Roads & Bridges Department, 100 posts — written exam Sunday 11 Oct 2026 (Paper I 9:00–11:00, Paper II 1:00–4:00); admit cards from 29 Sep 2026.";
const ESB_POLICE_NOTE =
  "ESB rulebook, revised page 1 (15 Sep 2026): online applications 22 Sep–6 Oct 2026, corrections until 11 Oct; probable exam date: from 19 Nov 2026, two shifts (10:00–12:00, 15:00–17:00).";
const ESB_GROUP3_NOTE =
  "ESB notice of 1 Oct 2026: applications reopen 13–27 Oct 2026 (corrections 13–28 Oct); the test planned from 7 Oct will be held in December–January.";
const JKSSB_HOME_NOTE = (post: string, ref: string, day: string) =>
  `JKSSB advance notice of 1 Aug 2026 (Home Department posts, Annexure A): ${post} (${ref}) — OMR-based written exam on ${day}. Admit cards seven days before the exam.`;
const SPSC_HOLD =
  "The SK_SPSC hub is \"Sikkim PSC Civil Services Prelims\", but these rows are SPSC's Junior Engineer (Civil) exam. Citing them drops \"(reported)\" and the hub title would read \"Exam Date 11 Oct 2026\" bare, as if it were the Civil Services date. Founder decision first: should this hub carry JE (Civil) dates?";
const NSTSE_HOLD =
  "NSTSE waits on the founder's SOF/SZF/NSTSE decision (due Wed 7 Oct); this cite changes the NSTSE hub title (drops \"(reported)\"), a search-surface change on those same pages.";

const ACTIONS: Action[] = [
  // ── fix ──
  {
    group: "fix",
    type: "archive",
    exam: "NSEJS",
    find: { kind: "EXAM", day: "2026-11-21", hosts: ["iapt.org.in"], label: /\bNSEA\b/ },
    why: "NSEA's exam day filed under NSEJS (the hub lead read \"NSEJS — NSEA exam: 21 Nov 2026\"). IAPT puts NSEA on Sat 21 Nov and NSEJS on Sun 22 Nov 2026; the NSEJS row of 22 Nov, already cited to IAPT, stays.",
    evidence: "iapt",
  },
  {
    group: "fix",
    type: "archive",
    exam: "CTET",
    find: { kind: "ADMIT_CARD", day: "2026-10-04", hosts: ["adda247.com"] },
    why: "\"CTET Sept 2026 admit card (expected)\", 4 Oct, from adda247. CBSE's notice of 14 Sep 2026 moved the 22nd CTET to 12–13 Dec 2026 and says the admit card comes two days before the exam.",
    evidence: "cbse",
  },
  {
    group: "fix",
    type: "archive",
    exam: "UP_UPSSSC_PET",
    find: { kind: "EXAM", day: "2026-10-23", hosts: ["testbook.com"] },
    why: "Superseded: UPSSSC's notice 1423 of 25 Sep 2026 moved PET-2026 from 23, 24 and 25 Oct to 25 Oct, 30 Oct and 1 Nov 2026.",
    evidence: "upsssc",
  },
  {
    group: "fix",
    type: "archive",
    exam: "UP_UPSSSC_PET",
    find: { kind: "EXAM", day: "2026-10-24", hosts: ["testbook.com"] },
    why: "Superseded: UPSSSC's notice 1423 of 25 Sep 2026 moved PET-2026 from 23, 24 and 25 Oct to 25 Oct, 30 Oct and 1 Nov 2026.",
    evidence: "upsssc",
  },
  {
    group: "fix",
    type: "archive",
    exam: "UK_UKPSC_PCS",
    find: { kind: "EXAM", day: "2026-10-11", hosts: ["testbook.com"] },
    why: "Wrong date. UKPSC's exam calendar (updated 1 Sep 2026) proposes 29 Nov 2026 for the PCS 2026 prelims; its PCS notice of 9 Sep gives no exam date. The row's note (\"Official notice confirms first fortnight of October\") is not what UKPSC's documents say.",
    evidence: "ukpsc",
  },
  {
    group: "fix",
    type: "archive",
    exam: "UK_UKPSC_PCS",
    find: { kind: "RESULT", day: "2026-12-15", hosts: [""], label: /prelims result/i },
    why: "An estimate counted 6–8 weeks from the wrong 11 Oct prelims date; with the prelims proposed for 29 Nov it would fall 16 days after the exam. No replacement estimate is written.",
    evidence: "ukpsc",
  },
  {
    group: "fix",
    type: "create",
    exam: "UK_UKPSC_PCS",
    row: {
      kind: "EXAM",
      day: "2026-11-29",
      label: "PCS 2026 Prelims (tentative, UKPSC exam calendar)",
      notes:
        "Combined State Civil/Upper Subordinate Services Exam-2026, preliminary exam: proposed date Sunday 29 Nov 2026 in UKPSC's Exam Calendar 2026-27 (updated, letter 115/2026-27 of 1 Sep 2026). UKPSC's PCS 2026 notice of 9 Sep gives the application dates only.",
      isExamDay: true,
    },
    why: "The date the body states, replacing the archived 11 Oct row.",
    evidence: "ukpsc",
  },
  {
    group: "fix",
    type: "archive",
    exam: "MP_MPESB",
    find: { kind: "EXAM", day: "2026-10-07", hosts: ["esb.mp.gov.in"], label: /group\s*3/i },
    why: "Postponed: ESB's notice of 1 Oct 2026 moves the Group-3 Sub Engineer combined test planned from 7 Oct to December–January (the row was official-tier, inside the hub's exam-week window).",
    evidence: "esbGroup3",
  },
  // MP Police Constable hub (review of 3 Oct): its two estimates say the
  // notification is "expected" 15 Oct and the exam 15 Dec, while ESB's
  // rulebook has applications open 22 Sep–6 Oct. Time-critical: apply
  // before 6 Oct. The same three dates are cited on the MP_MPESB hub below.
  {
    group: "fix",
    type: "archive",
    exam: "MP_POLICE_PC",
    find: { kind: "NOTIFICATION", day: "2026-10-15", hosts: [""], label: /expected/i },
    why: "Superseded estimate (\"Notification (2026 cycle - expected)\", 15 Oct): ESB has already issued it — online applications for the Police Constable (GD) Recruitment Test 2026 opened 22 Sep and close 6 Oct 2026 (ESB rulebook, revised page 1).",
    evidence: "esbPolice",
  },
  {
    group: "fix",
    type: "archive",
    exam: "MP_POLICE_PC",
    find: { kind: "EXAM", day: "2026-12-15", hosts: [""], label: /expected/i },
    why: "Superseded estimate (\"Written exam (2026 cycle - expected)\", 15 Dec): ESB's rulebook gives the probable exam date as from 19 Nov 2026.",
    evidence: "esbPolice",
  },
  {
    group: "fix",
    type: "create",
    exam: "MP_POLICE_PC",
    row: { kind: "APPLICATION_END", day: "2026-10-06", label: "Online application closes", notes: ESB_POLICE_NOTE, isExamDay: false },
    why: "The date ESB's rulebook states.",
    evidence: "esbPolice",
  },
  {
    group: "fix",
    type: "create",
    exam: "MP_POLICE_PC",
    row: { kind: "CORRECTION_WINDOW", day: "2026-10-11", label: "Last date to correct the application", notes: ESB_POLICE_NOTE, isExamDay: false },
    why: "The date ESB's rulebook states.",
    evidence: "esbPolice",
  },
  {
    group: "fix",
    type: "create",
    exam: "MP_POLICE_PC",
    row: { kind: "EXAM", day: "2026-11-19", label: "Written exam begins (probable date, ESB)", notes: ESB_POLICE_NOTE, isExamDay: true },
    why: "The date ESB's rulebook states (\"संभावित परीक्षा दिनांक … 19-11-2026 से प्रारंभ\" — probable, from 19 Nov), replacing the archived 15 Dec estimate.",
    evidence: "esbPolice",
  },

  // ── cite ──
  { group: "cite", type: "cite", exam: "NSEP", find: { kind: "EXAM", day: "2026-11-22", hosts: ["pw.live"] }, notes: "Sunday 22 Nov 2026, 8:30–10:30 am (IAPT's NSE 2026 schedule).", sticky: true, evidence: "iapt" },
  { group: "cite", type: "cite", exam: "NSEC", find: { kind: "EXAM", day: "2026-11-22", hosts: ["pw.live"] }, notes: "Sunday 22 Nov 2026, 11:30 am–1:30 pm (IAPT's NSE 2026 schedule).", sticky: true, evidence: "iapt" },
  { group: "cite", type: "cite", exam: "NSEB", find: { kind: "EXAM", day: "2026-11-22", hosts: ["pw.live"] }, notes: "Sunday 22 Nov 2026, 2:30–4:30 pm (IAPT's NSE 2026 schedule).", sticky: true, evidence: "iapt" },
  { group: "cite", type: "cite", exam: "UP_UPSSSC_PET", find: { kind: "EXAM", day: "2026-10-25", hosts: ["careerpower.in"] }, notes: UP_PET_NOTE, sticky: true, evidence: "upsssc" },
  { group: "cite", type: "cite", exam: "UP_UPSSSC_PET", find: { kind: "EXAM", day: "2026-10-30", hosts: ["careerpower.in"] }, notes: UP_PET_NOTE, sticky: true, evidence: "upsssc" },
  { group: "cite", type: "cite", exam: "UP_UPSSSC_PET", find: { kind: "EXAM", day: "2026-11-01", hosts: ["careerpower.in"] }, notes: UP_PET_NOTE, sticky: true, evidence: "upsssc" },
  // The sitting is CCE (Main) 2025, held in Oct 2026 — the labels say so
  // ("Mains exam (Day 1)" under a "2026" title read as the 2026 cycle).
  { group: "cite", type: "cite", exam: "AS_APSC_CCE", find: { kind: "EXAM", day: "2026-10-09", hosts: ["jobassam.in"] }, label: "CCE (Main) 2025 — Day 1", notes: APSC_NOTE("Paper-1 Essay 9:00–12:00, Paper-2 General Studies-I 13:30–16:30"), sticky: true, evidence: "apsc" },
  { group: "cite", type: "cite", exam: "AS_APSC_CCE", find: { kind: "EXAM", day: "2026-10-10", hosts: ["adda247.com"] }, label: "CCE (Main) 2025 — Day 2", notes: APSC_NOTE("Paper-3 General Studies-II 9:00–12:00, Paper-4 General Studies-III 13:30–16:30"), sticky: true, evidence: "apsc" },
  { group: "cite", type: "cite", exam: "AS_APSC_CCE", find: { kind: "EXAM", day: "2026-10-11", hosts: ["testbook.com"] }, label: "CCE (Main) 2025 — Day 3", notes: APSC_NOTE("Paper-5 General Studies-IV 9:00–12:00, Paper-6 General Studies-V 13:30–16:30"), sticky: true, evidence: "apsc" },
  {
    group: "cite",
    type: "cite",
    exam: "GJ_GPSC_CLASS12",
    find: { kind: "EXAM", day: "2026-10-05", hosts: ["testbook.com"] },
    notes: "Mains for Advt. 5/2026-27 (Gujarat Administrative Service Class-1, Gujarat Civil Service Class-1 and 2, Municipal Chief Officer Class-2; 213 posts): 5 to 11 Oct 2026 (GPSC exam schedule).",
    sticky: true,
    evidence: "gpsc",
  },
  { group: "cite", type: "cite", exam: "NSTSE", find: { kind: "EXAM", day: "2026-11-20", hosts: ["school.careers360.com"] }, notes: "Offline exam for school registrations: 20 Nov 2026 (Friday) and 2 Dec 2026 (Wednesday) — Unified Council.", sticky: true, evidence: "ucOffline", hold: NSTSE_HOLD },
  { group: "cite", type: "cite", exam: "NSTSE", find: { kind: "EXAM", day: "2026-12-02", hosts: ["school.careers360.com"] }, notes: "Offline exam for school registrations: 20 Nov 2026 (Friday) and 2 Dec 2026 (Wednesday) — Unified Council.", sticky: true, evidence: "ucOffline", hold: NSTSE_HOLD },
  // A practice mock, not the exam: stored as OTHER, so after 2 Dec it can
  // never lead the hub title as "Exam Date 17 Jan 2027" (24 Jan is the exam).
  {
    group: "cite",
    type: "cite",
    exam: "NSTSE",
    find: { kind: "EXAM", day: "2027-01-17", hosts: ["school.careers360.com"] },
    retype: { kind: "OTHER", isExamDay: false },
    notes: "Online mock (practice) exam for direct registrations: 17 Jan 2027 (Sunday); the online final exam is 24 Jan 2027 — Unified Council.",
    sticky: true,
    evidence: "ucOnline",
    hold: NSTSE_HOLD,
  },
  { group: "cite", type: "cite", exam: "NSTSE", find: { kind: "EXAM", day: "2027-01-24", hosts: ["school.careers360.com"] }, notes: "Online final exam for direct registrations: 24 Jan 2027 (Sunday) — Unified Council.", sticky: true, evidence: "ucOnline", hold: NSTSE_HOLD },
  { group: "cite", type: "cite", exam: "SK_SPSC", find: { kind: "ADMIT_CARD", day: "2026-09-29", hosts: ["indiajobalerts.com"] }, notes: SPSC_NOTE, sticky: false, evidence: "spsc", hold: SPSC_HOLD },
  { group: "cite", type: "cite", exam: "SK_SPSC", find: { kind: "EXAM", day: "2026-10-11", hosts: ["indiajobalerts.com"] }, notes: SPSC_NOTE, sticky: false, evidence: "spsc", hold: SPSC_HOLD },
  // JKSSB (review of 3 Oct): a multi-recruitment hub, so the source stays
  // generated (see the header). Hub title: "Exam Date 15 Nov 2026 (reported)"
  // → "Exam Date 15 Nov 2026".
  {
    group: "cite",
    type: "cite",
    exam: "JK_JKSSB",
    find: { kind: "EXAM", day: "2026-11-15", hosts: ["freejobalert.com"], label: /accounts assistant/i },
    notes: "JKSSB notice of 31 Jul 2026 (Annexure A, row 15): Accounts Assistant, Finance Department (Notification 10 of 2025, item 271) — OMR-based written exam on Sunday 15 Nov 2026. Admit cards seven days before the exam. JKSSB's notice of 17 Sep 2026 reschedules Health & Medical Education posts only.",
    sticky: false,
    evidence: "jkssbFinance",
  },
  {
    group: "cite",
    type: "cite",
    exam: "JK_JKSSB",
    find: { kind: "EXAM", day: "2026-11-29", hosts: ["freejobalert.com"], label: /sub-inspector/i },
    // Was "Sub-Inspector & Constable (Home Dept) Exam (expected)": the
    // body dates the Sub-Inspector exam alone on 29 Nov, and announced it.
    label: "Sub-Inspector (Home Department) — OMR written exam",
    notes: JKSSB_HOME_NOTE("Sub-Inspector", "Notification 02 of 2024, item 07", "29 Nov 2026"),
    sticky: false,
    evidence: "jkssbHome",
  },
  {
    group: "cite",
    type: "cite",
    exam: "JK_JKSSB",
    find: { kind: "EXAM", day: "2026-12-13", hosts: ["freejobalert.com"], label: /constable \(executive\)/i },
    notes: JKSSB_HOME_NOTE("Constable (Executive)", "Notification 12 of 2025, items 273-274", "13 Dec 2026"),
    sticky: false,
    evidence: "jkssbHome",
  },
  {
    group: "cite",
    type: "cite",
    exam: "JK_JKSSB",
    find: { kind: "EXAM", day: "2026-12-20", hosts: ["freejobalert.com"], label: /armed/i },
    notes: JKSSB_HOME_NOTE("Constable (Armed/IRP/SDRF)", "Notification 14 of 2025, items 323-324", "20 Dec 2026"),
    sticky: false,
    evidence: "jkssbHome",
  },
  { group: "cite", type: "cite", exam: "MP_MPESB", find: { kind: "APPLICATION_END", day: "2026-10-06", hosts: ["careerindia.com"] }, notes: ESB_POLICE_NOTE, sticky: false, evidence: "esbPolice" },
  { group: "cite", type: "cite", exam: "MP_MPESB", find: { kind: "CORRECTION_WINDOW", day: "2026-10-11", hosts: ["careerindia.com"] }, notes: ESB_POLICE_NOTE, sticky: false, evidence: "esbPolice" },
  {
    group: "cite",
    type: "cite",
    exam: "MP_MPESB",
    find: { kind: "EXAM", day: "2026-11-19", hosts: ["careerindia.com"] },
    label: "MP Police Constable (GD) exam begins (probable date, ESB)",
    notes: ESB_POLICE_NOTE,
    sticky: false,
    evidence: "esbPolice",
  },
  { group: "cite", type: "cite", exam: "MP_MPESB", find: { kind: "APPLICATION_START", day: "2026-10-13", hosts: ["adda247.com"] }, notes: ESB_GROUP3_NOTE, sticky: false, evidence: "esbGroup3" },
  {
    group: "cite",
    type: "cite",
    exam: "MP_MPESB",
    find: { kind: "APPLICATION_END", day: "2026-10-27", hosts: ["sarkariresult.app"] },
    label: "Group 3 Sub Engineer re-application closes",
    notes: ESB_GROUP3_NOTE,
    sticky: false,
    evidence: "esbGroup3",
  },
];

/** What the body check found for exams whose aggregator rows this script
 *  leaves "reported" (printed in the AGGREGATOR ROWS section). */
const BODY_CHECKS: Record<string, string> = {
  MH_MPSC_RAJYASEVA: "mpsc.gov.in is a JavaScript app whose API refuses requests without the app's own header (\"CRC header is missing\"); not read.",
  RRB_NTPC: "rrb.indianrailways.gov.in/chandigarh lists CENs up to 05/2026 — no CEN 06/2026 or 07/2026 (NTPC Graduate / Undergraduate) yet; the application dates cannot be confirmed.",
  RRB_ALP: "RRB's notice pages (getdata?cenum=01/2026…) answered \"Request Rejected\" (firewall) twice; not read.",
  JK_JKSSB:
    "Its four exam rows (15 Nov, 29 Nov, 13 Dec, 20 Dec) are cited to JKSSB's notices of 31 Jul and 1 Aug 2026 by the cite group. The 9 Oct \"Advertisement No. 08/2026\" closing row stays reported: advertisement 08 of 2026 (4 Aug 2026) is listed on What's New, but its closing date was not read for this fix.",
  SK_SPSC:
    "Confirmed on SPSC notice 120/SPSC/EXAM/2026 of 8 Sep 2026 (JE (Civil) written exam 11 Oct, admit cards from 29 Sep). The cite is HELD for the founder: the rows are a Junior Engineer exam on the Civil Services Prelims hub.",
  NSTSE:
    "Confirmed on unifiedcouncil.com (offline 20 Nov and 2 Dec 2026; online mock 17 Jan, final 24 Jan 2027). The cite is HELD until the founder's SOF/SZF/NSTSE decision (Wed 7 Oct); release with --release NSTSE.",
  AILET: "nationallawuniversitydelhi.in (AILET 2027) renders only with JavaScript; not read.",
  SZF_IOM: "silverzone.org loads its exam dates from an app API that could not be reached; not read.",
  SZF_IOS: "silverzone.org loads its exam dates from an app API that could not be reached; not read.",
  SZF_IOEL: "silverzone.org loads its exam dates from an app API that could not be reached; not read.",
  MP_TET:
    "esb.mp.gov.in: 12-10-2026 is the start of ESB's eligibility test for IN-SERVICE primary and secondary teachers (rulebook 17 Aug 2026, p.1; applications extended to 5 Oct on 18 Sep), not the Varg 1/2/3 MP TET this hub describes. Left as it is — a decision for the founder.",
  PRIL: "ioling.org (the International Linguistics Olympiad's own site) states Bangkok, 21–28 July 2027. It stays \"reported\" because the PRIL hub's portal is ltrc.iiit.ac.in; widening the official-host list would re-tier rows site-wide.",
  UP_POLICE_CONSTABLE: "Cited to sarkariresult.com.cm (denylisted): tier \"expected\", and the tracker no longer links it. uppbpb.gov.in lists PET date notices for recruitment 2025; not read for this fix.",
};

// ── Rows ─────────────────────────────────────────────────────────────────

interface Row {
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
const ROW_SELECT = {
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
interface Fields {
  label: string;
  kind: string | null;
  isExamDay: boolean;
  source: string | null;
  notes: string | null;
  confidence: string | null;
  url: string | null;
  archivedAt: string | null;
}
const fieldsOf = (r: Row): Fields => ({
  label: r.label,
  kind: r.kind,
  isExamDay: r.isExamDay,
  source: r.source,
  notes: r.notes,
  confidence: r.confidence,
  url: r.url,
  archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
});
/** The Prisma update for a Fields value. */
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
const sameFields = (a: Fields, b: Fields) => (Object.keys(a) as (keyof Fields)[]).every((k) => a[k] === b[k]);

function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}
const kindOf = (r: Pick<Row, "kind" | "label" | "isExamDay">) => resolveKind({ kind: r.kind, label: r.label, isExamDay: r.isExamDay });
const citedHost = (r: Row) => hostOf(rowCitation(r));
const matches = (r: Row, f: Find) => kindOf(r) === f.kind && isoDay(r.date) === f.day && f.hosts.includes(citedHost(r)) && (!f.label || f.label.test(r.label));

// ── Plan ─────────────────────────────────────────────────────────────────

interface Planned {
  action: Action;
  examCode: string;
  rowId: string | null;
  before: Fields | null;
  after: Fields | null;
  /** For a created row: the full row to insert. */
  create?: { kind: string; date: Date; label: string; notes: string; isExamDay: boolean; url: string };
}

interface ExamCtx {
  id: string;
  code: string;
  shortName: string;
  name: string;
  state: string | null;
  officialUrl: string | null;
  live: Row[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

/** A held cite: the rows it would change, and why it waits. */
interface Held {
  action: CiteAction;
  rows: Row[];
}

function plan(actions: Action[], exams: Map<string, ExamCtx>, skipped: string[], held: Held[], release: ReadonlySet<string>): Planned[] {
  const out: Planned[] = [];
  const now = new Date();
  for (const a of actions) {
    const ex = exams.get(a.exam);
    if (!ex) {
      skipped.push(`${a.exam}: no such exam — skipped`);
      continue;
    }
    const ev = EVIDENCE[a.evidence];
    if (a.type === "create") {
      const date = new Date(`${a.row.day}T00:00:00.000Z`);
      const already = ex.live.find((r) => r.source === PROVENANCE && kindOf(r) === a.row.kind && isoDay(r.date) === a.row.day);
      if (already) {
        skipped.push(`${a.exam} ${a.row.day} ${a.row.kind}: already created (${already.id}) — skipped`);
        continue;
      }
      out.push({
        action: a,
        examCode: ex.code,
        rowId: null,
        before: null,
        after: {
          label: a.row.label,
          kind: a.row.kind,
          isExamDay: a.row.isExamDay,
          source: PROVENANCE,
          notes: a.row.notes,
          confidence: "official",
          url: ev.url,
          archivedAt: null,
        },
        create: { kind: a.row.kind, date, label: a.row.label, notes: a.row.notes, isExamDay: a.row.isExamDay, url: ev.url },
      });
      continue;
    }
    const hits = ex.live.filter((r) => matches(r, a.find));
    if (a.type === "cite" && a.hold && !release.has(a.exam)) {
      held.push({ action: a, rows: hits });
      continue;
    }
    const what = `${a.exam} ${a.find.day} ${a.find.kind} cited to ${a.find.hosts.map((h) => h || "(none)").join("/")}`;
    if (hits.length === 0) {
      const done =
        a.type === "cite" ? ex.live.find((r) => isoDay(r.date) === a.find.day && r.url === ev.url) : null;
      skipped.push(`${what}: no live row found${done ? ` — a live row already cites ${ev.url} (${done.id})` : " (already fixed, or changed by a refresh — check the tracker by hand)"}`);
      continue;
    }
    if (a.type !== "archive" && hits.length > 1) {
      skipped.push(`${what}: ${hits.length} live rows match — ambiguous, skipped`);
      continue;
    }
    for (const r of hits) {
      const before = fieldsOf(r);
      let after: Fields;
      if (a.type === "archive") {
        // A generated row is suppressed, so the refresh writer never writes
        // this kind on this day for this exam again; a curated one is archived only.
        const generated = (r.source ?? "") === GEN_SOURCE;
        after = { ...before, archivedAt: now.toISOString(), source: generated ? SUPPRESSED_SOURCE : r.source };
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
      out.push({ action: a, examCode: ex.code, rowId: r.id, before, after });
    }
  }
  return out;
}

// ── Preview: what the hub says before and after ──────────────────────────

/** Rows as they would be after the planned changes (in memory only). */
function simulate(ex: ExamCtx, planned: Planned[], now: Date): Row[] {
  const mine = planned.filter((p) => p.examCode === ex.code);
  const rows: Row[] = [];
  for (const r of ex.live) {
    const p = mine.find((x) => x.rowId === r.id);
    if (!p || !p.after) {
      rows.push(r);
      continue;
    }
    if (p.after.archivedAt) continue;
    rows.push({
      ...r,
      label: p.after.label,
      kind: p.after.kind,
      isExamDay: p.after.isExamDay,
      source: p.after.source,
      notes: p.after.notes,
      confidence: p.after.confidence,
      url: p.after.url,
    });
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
 *  sentence, and the exam-week phase — the decisions src/app/exams/[code]/
 *  page.tsx makes, over the same -120/+365-day rows (titleDates). */
function hubPreview(ex: ExamCtx, rows: Row[], now: Date): string[] {
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
  const week = computeExamWeekState(
    rows.filter((r) => r.date.getTime() >= now.getTime() - 13 * DAY_MS),
    ex.officialUrl,
    now,
  );
  const weekText = week.phase === "none" ? "none" : `${week.phase} — ${week.focus?.label ?? "?"} ${week.focusDay ?? ""} (${week.tier ?? "?"})`;
  return [`title: ${title}`, `lead:  ${sentence}`, `exam-week block: ${weekText}`];
}

function showRow(r: Row, officialUrl: string | null): string {
  const tier = sourceTier(r.confidence, rowCitation(r), officialUrl);
  return `${isoDay(r.date)} ${kindOf(r).padEnd(17)} ${tier.padEnd(8)} "${r.label}" ${rowCitation(r) ?? ""} [${r.source ?? "no source"}] ${r.id}`;
}

function showChange(p: Planned): string[] {
  const a = p.action;
  const ev = EVIDENCE[a.evidence];
  const head =
    a.type === "archive"
      ? `- ARCHIVE${p.after?.source === SUPPRESSED_SOURCE ? " + SUPPRESS" : ""}`
      : a.type === "create"
        ? "+ CREATE"
        : `~ CITE THE BODY${a.sticky ? " (curated)" : " (source stays generated)"}${a.hold ? " — RELEASED from hold" : ""}`;
  const lines = [`  ${head}  [${a.group}] ${p.rowId ?? "(new row)"}`];
  if (a.type === "create" && p.create) {
    lines.push(`      ${isoDay(p.create.date)} ${p.create.kind} official "${p.create.label}" url=${p.create.url} source=${PROVENANCE}`);
    lines.push(`      notes: ${p.create.notes}`);
  } else if (p.before && p.after) {
    for (const k of Object.keys(p.before) as (keyof Fields)[]) {
      if (p.before[k] !== p.after[k]) lines.push(`      ${k}: ${JSON.stringify(p.before[k])} → ${JSON.stringify(p.after[k])}`);
    }
  }
  lines.push(`      why: ${"why" in a ? a.why : "the body's own page confirms this date; the row cited an aggregator."}`);
  lines.push(`      evidence: ${ev.body} — ${ev.doc} — ${ev.url}`);
  return lines;
}

function showHeld(h: Held, officialUrl: string | null): string[] {
  const a = h.action;
  const ev = EVIDENCE[a.evidence];
  const lines = [`  = HELD (not written) [cite] ${a.find.day} ${a.find.kind} — release with --release ${a.exam}`];
  if (h.rows.length === 0) lines.push("      no live row matches today (already changed, or rewritten by a refresh)");
  for (const r of h.rows) lines.push(`      row: ${showRow(r, officialUrl)}`);
  lines.push(`      would cite: ${ev.url}${a.label ? `; label → ${JSON.stringify(a.label)}` : ""}${a.retype ? `; kind → ${a.retype.kind}` : ""}`);
  lines.push(`      held because: ${a.hold}`);
  return lines;
}

// ── Load ─────────────────────────────────────────────────────────────────

async function loadExams(codes: string[]): Promise<Map<string, ExamCtx>> {
  const exams = await prisma.exam.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true, shortName: true, name: true, state: true, eligibility: { select: { officialUrl: true } } },
  });
  const out = new Map<string, ExamCtx>();
  for (const e of exams) {
    const live = (await prisma.examImportantDate.findMany({ where: { examId: e.id, archivedAt: null }, orderBy: [{ date: "asc" }, { id: "asc" }], select: ROW_SELECT })) as Row[];
    out.set(e.code, { id: e.id, code: e.code, shortName: e.shortName, name: e.name, state: e.state, officialUrl: e.eligibility?.officialUrl ?? null, live });
  }
  return out;
}

// ── Write ────────────────────────────────────────────────────────────────

interface LogEntry {
  type: Action["type"];
  group: Group;
  exam: string;
  rowId: string | null;
  before: Fields | null;
  after: Fields | null;
  why: string;
  evidenceUrl: string;
}
interface LogFile {
  script: string;
  kind: "apply" | "undo";
  startedAt: string;
  status: "pending" | "applied" | "failed";
  only: string;
  /** Exams whose held cites this run included (--release). */
  release?: string[];
  undoOf?: string;
  entries: LogEntry[];
  error?: string;
}

function writeLog(path: string, log: LogFile) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(log, null, 1));
}

async function applyPlanned(planned: Planned[], logPath: string, only: string, release: string[]) {
  const startedAt = new Date();
  const entries: LogEntry[] = planned.map((p) => ({
    type: p.action.type,
    group: p.action.group,
    exam: p.examCode,
    rowId: p.rowId,
    before: p.before,
    after: p.after,
    why: "why" in p.action ? p.action.why : `cited to ${EVIDENCE[p.action.evidence].body}'s own document`,
    evidenceUrl: EVIDENCE[p.action.evidence].url,
  }));
  const log: LogFile = { script: LOG_STEM, kind: "apply", startedAt: startedAt.toISOString(), status: "pending", only, release, entries };
  writeLog(logPath, log);
  try {
    await prisma.$transaction(
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
    console.log(`Could not write the log (${(e as Error).message}); here it is:\n${JSON.stringify(log, null, 1)}`);
  }
  if (log.status === "failed") throw new Error(log.error);
  console.log(`\nAPPLIED ${entries.length} change(s). Undo log: ${logPath}`);
  console.log(`Undo: npx tsx --env-file=.env.local scripts/${LOG_STEM}.ts --undo ${logPath} --apply`);
}

async function undo(file: string, apply: boolean) {
  const log = JSON.parse(readFileSync(file, "utf8")) as LogFile;
  if (log.script !== LOG_STEM || log.kind !== "apply" || log.status !== "applied") throw new Error(`${file} is not an applied log of ${LOG_STEM}`);
  console.log(`UNDO of ${file} (${log.entries.length} entries, applied ${log.startedAt}). ${apply ? "APPLY" : "DRY RUN"}\n`);
  const steps: { entry: LogEntry; restore: Fields; current: Fields }[] = [];
  const problems: string[] = [];
  for (const e of [...log.entries].reverse()) {
    if (!e.rowId) {
      problems.push(`${e.exam} ${e.type}: no row id in the log — skipped`);
      continue;
    }
    const r = (await prisma.examImportantDate.findUnique({ where: { id: e.rowId }, select: ROW_SELECT })) as Row | null;
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
    console.log(`  ${s.entry.type === "create" ? "ARCHIVE created row" : "RESTORE"} ${s.entry.exam} ${s.entry.rowId}`);
    for (const k of Object.keys(s.current) as (keyof Fields)[]) {
      if (s.current[k] !== s.restore[k]) console.log(`      ${k}: ${JSON.stringify(s.current[k])} → ${JSON.stringify(s.restore[k])}`);
    }
  }
  for (const p of problems) console.log(`  ! ${p}`);
  if (!apply) {
    console.log("\nDry run — re-run with --apply to write.");
    return;
  }
  const logPath = join(LOG_DIR, `${LOG_STEM}.undo.${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
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
  await prisma.$transaction(
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
  writeLog(logPath, undoLog);
  console.log(`\nUNDONE ${steps.length} change(s). Log: ${logPath}`);
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const apply = process.argv.includes("--apply");
  const undoFile = arg("--undo");
  if (undoFile) {
    if (!existsSync(undoFile)) throw new Error(`no such log: ${undoFile}`);
    await undo(undoFile, apply);
    return;
  }
  const only = arg("--only") ?? (apply ? "" : "all");
  if (!["fix", "cite", "all"].includes(only)) throw new Error("--apply needs --only fix | cite (each group changes hub titles and gets its own read)");
  if (apply && only === "all") throw new Error("--apply writes one group at a time: --only fix, then (as its own read) --only cite. \"all\" is a dry run only.");
  const release = [...new Set((arg("--release") ?? "").split(",").map((s) => s.trim()).filter(Boolean))];
  const heldExams = new Set(ACTIONS.filter((a) => a.type === "cite" && a.hold).map((a) => a.exam));
  const unknown = release.filter((c) => !heldExams.has(c));
  if (unknown.length) throw new Error(`--release ${unknown.join(",")}: no held cite for that exam (held: ${[...heldExams].join(", ")})`);
  const actions = ACTIONS.filter((a) => only === "all" || a.group === only);
  const now = new Date();

  const codes = [...new Set(actions.map((a) => a.exam))];
  const exams = await loadExams(codes);
  const skipped: string[] = [];
  const held: Held[] = [];
  const planned = plan(actions, exams, skipped, held, new Set(release));

  console.log(`Tracker date fixes, checked on the bodies' own sites 3 Oct 2026 — group: ${only}. ${apply ? "APPLY" : "DRY RUN (nothing is written)"}`);
  console.log(
    `Planned: ${planned.length} change(s) on ${new Set(planned.map((p) => p.examCode)).size} exam(s); skipped: ${skipped.length}; held for the founder: ${held.length} cite(s) on ${new Set(held.map((h) => h.action.exam)).size} exam(s)${release.length ? `; released: ${release.join(", ")}` : ""}.\n`,
  );

  for (const code of codes) {
    const ex = exams.get(code);
    if (!ex) continue;
    const mine = planned.filter((p) => p.examCode === code);
    const mineHeld = held.filter((h) => h.action.exam === code);
    console.log(`== ${code} (${ex.shortName}) — portal ${ex.officialUrl ?? "(none)"}`);
    const touched = new Set(mine.map((p) => p.rowId));
    const upcoming = ex.live.filter((r) => r.date.getTime() >= now.getTime() - 10 * DAY_MS || touched.has(r.id));
    console.log("  live rows from 10 days back (BEFORE):");
    for (const r of upcoming) console.log(`    ${touched.has(r.id) ? "*" : " "} ${showRow(r, ex.officialUrl)}`);
    if (mine.length) {
      console.log("  CHANGES:");
      for (const p of mine) for (const l of showChange(p)) console.log(l);
    } else console.log("  CHANGES: none planned");
    for (const h of mineHeld) for (const l of showHeld(h, ex.officialUrl)) console.log(l);
    const before = hubPreview(ex, ex.live, now);
    const after = hubPreview(ex, simulate(ex, planned, now), now);
    console.log("  HUB BEFORE:");
    for (const l of before) console.log(`    ${l}`);
    console.log("  HUB AFTER:");
    for (const l of after) console.log(`    ${l}${before.includes(l) ? "" : "   ← changes"}`);
    // A created official row is "new" to the exam-alerts cron: one mail /
    // phone alert per subscriber at the next 9 AM IST run (within its cap).
    const creates = mine.filter((p) => p.create);
    if (creates.length) {
      const [mail, phones] = await Promise.all([
        prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "ExamAlert" WHERE "examId" = ${ex.id} AND "unsubscribedAt" IS NULL`.catch(() => null),
        prisma.$queryRaw<{ n: bigint }[]>`SELECT COUNT(*)::bigint AS n FROM "ExamPushAlert" WHERE "examId" = ${ex.id} AND "unsubscribedAt" IS NULL`.catch(() => null),
      ]);
      const count = (r: { n: bigint }[] | null) => (r ? String(r[0]?.n ?? 0) : "?");
      console.log(
        `  ALERTS: ${creates.length} new official row(s) — the next exam-alerts run (9 AM IST) mails ${count(mail)} live email subscriber(s) and ${count(phones)} phone(s) of ${code}, within their resend cap. The mail names the new date; it does not say which date it replaces.`,
      );
    }
    console.log("");
  }
  if (skipped.length) {
    console.log("SKIPPED:");
    for (const s of skipped) console.log(`  ! ${s}`);
    console.log("");
  }

  // Every live future row stored "official" whose tier derives as reported
  // or expected — the aggregator rows. Nothing is written for a row this
  // script does not list above: sourceTier() already prints it "reported".
  const todayStart = new Date(`${isoDay(new Date(now.getTime() + 330 * 60_000))}T00:00:00.000Z`);
  const announced = await prisma.examImportantDate.findMany({
    where: { archivedAt: null, confidence: "official", date: { gte: todayStart } },
    orderBy: [{ date: "asc" }, { id: "asc" }],
    select: { ...ROW_SELECT, exam: { select: { code: true, eligibility: { select: { officialUrl: true } } } } },
  });
  const byId = new Map(planned.filter((p) => p.rowId).map((p) => [p.rowId!, p] as const));
  const aggregator = announced
    .map((r) => ({ r: r as Row & { exam: { code: string; eligibility: { officialUrl: string | null } | null } }, tier: sourceTier(r.confidence, rowCitation(r), r.exam.eligibility?.officialUrl) }))
    .filter((x) => x.tier !== "official");
  const within60 = aggregator.filter((x) => x.r.date.getTime() < todayStart.getTime() + 61 * DAY_MS).length;
  console.log(
    `AGGREGATOR ROWS — live future rows stored "official" whose tier derives from the cited host as reported/expected: ${aggregator.length} (${within60} in the next 60 days). Every surface prints them "reported" (or "expected" for a denylisted host) — no label is written for them.`,
  );
  const heldById = new Map(held.flatMap((h) => h.rows.map((r) => [r.id, h] as const)));
  for (const { r, tier } of aggregator) {
    const p = byId.get(r.id);
    const h = heldById.get(r.id);
    const fate = p
      ? `→ ${p.action.type}${p.action.type === "cite" ? ` (${EVIDENCE[p.action.evidence].body})` : ""} [${p.action.group}]`
      : h
        ? `→ stays ${tier} — cite HELD for the founder (--release ${h.action.exam})`
        : `→ stays ${tier}`;
    console.log(`  ${r.exam.code.padEnd(20)} ${isoDay(r.date)} ${kindOf(r).padEnd(17)} ${tier.padEnd(8)} ${citedHost(r).padEnd(22)} ${fate}`);
  }
  const notes = [...new Set(aggregator.filter((x) => !byId.has(x.r.id)).map((x) => x.r.exam.code))];
  console.log("  Body checks for the rows that stay:");
  for (const c of notes) console.log(`    ${c}: ${BODY_CHECKS[c] ?? "not checked in this pass."}`);
  console.log("");

  if (!apply) {
    console.log("Dry run — nothing written. Re-run with --apply --only fix, then (its own read) --apply --only cite; each group changes hub titles.");
    return;
  }
  if (planned.length === 0) {
    console.log("Nothing to write.");
    return;
  }
  const logPath = arg("--log") ?? join(LOG_DIR, `${LOG_STEM}.${only}.${now.toISOString().replace(/[:.]/g, "-")}.json`);
  await applyPlanned(planned, logPath, only, release);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
