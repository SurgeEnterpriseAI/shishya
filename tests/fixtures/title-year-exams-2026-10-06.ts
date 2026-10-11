// Fixture rows for the tracker-vs-hub title year test (6 Oct 2026, search
// plan doNow 4). Copied from the prod read of the same day
// (scripts/tmp-b1-probe2.ts, SELECT only): each exam's live tracker rows as
// the hub title reads them (getExamShared titleDates: archivedAt null, -120 d
// to +365 d, unannounced answer keys dropped) — labels, dates, kinds, tiers,
// URLs and write times as stored — plus the hub's year decision over those
// rows (hubYear: computed in the probe by hubTitleDecision, the hub's HEAD
// logic unchanged; NOT read from live hub HTML — review r1) and what /updates
// printed before the fix (cycleYear). No DB, no network.

import type { HubTitleRowInput, HubTitleYear } from "@/lib/hub-title";

/** The read time, 6 Oct 2026 13:39 IST. */
export const TY_NOW = new Date("2026-10-06T08:09:04.895Z");

export interface TitleYearExam {
  code: string;
  shortName: string;
  name: string;
  officialUrl: string | null;
  /** hubTitleDecision over `rows` at TY_NOW (the probe's value; not read from live HTML). */
  hubYear: HubTitleYear;
  /** The year /updates printed before 6 Oct 2026 (cycleYear over its own 60 rows). */
  updatesOld: number;
  rows: HubTitleRowInput[];
}

export const TY_EXAMS: Record<string, TitleYearExam> = {
  GATE_CSE: {
    code: "GATE_CSE",
    shortName: "GATE CSE",
    name: "Graduate Aptitude Test in Engineering — Computer Science",
    officialUrl: "https://gate2027.iitm.ac.in/",
    hubYear: { kind: "cycle", year: 2027 },
    updatesOld: 2026,
    rows: [
      { id: "cmtioz5wm002neozw490engei", label: "GATE 2027 official notification released", date: "2026-07-20T00:00:00.000Z", isExamDay: false, kind: "NOTIFICATION", confidence: "official", url: "https://gate2027.iitm.ac.in/", notes: "IIT Madras launched official website and notification", source: "ai-generated:claude", createdAt: "2026-09-01T13:17:20.422Z" },
      { id: "cmpjtaazx00195ef82ioa5z6n", label: "GATE 2026 — registration opens", date: "2026-08-28T00:00:00.000Z", isExamDay: false, kind: null, confidence: null, url: null, notes: null, source: "https://gate2026.iitg.ac.in/", createdAt: "2026-05-24T13:26:55.534Z" },
      { id: "cmuiy2hoc000i4eey5ribr4ot", label: "GATE 2027 online application portal (GOAPS) opened", date: "2026-09-02T00:00:00.000Z", isExamDay: false, kind: "APPLICATION_START", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: "IIT Madras, GATE 2027 important dates: GOAPS opened 2 Sep 2026 (the earlier 14 Aug and 27 Aug dates are struck through on the official page).", source: "official-calendar:2026-27", createdAt: "2026-09-26T22:11:34.524Z" },
      { id: "cmuiy2hqq000m4eeyx5c24dig", label: "GATE 2027 regular registration closes (without late fee)", date: "2026-10-05T00:00:00.000Z", isExamDay: false, kind: "APPLICATION_END", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: "IIT Madras, GATE 2027 important dates (read 6 Oct 2026): regular online registration (without late fee) closes Monday 5 Oct 2026 — extended from 21 Sep and then 27 Sep, both struck through on the page. Registration with the late fee is open until Monday 12 Oct 2026.", source: "official-research:2026-10-06", createdAt: "2026-09-26T22:11:34.611Z" },
      { id: "cmuw7lwes0004z6yybymm1g5u", label: "GATE 2027 extended registration closes (with late fee)", date: "2026-10-12T00:00:00.000Z", isExamDay: false, kind: "APPLICATION_END", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: "IIT Madras, GATE 2027 important dates (read 6 Oct 2026): extended online registration (with late fee) closes Monday 12 Oct 2026 — extended from 30 Sep and then 5 Oct, both struck through on the page. The application rectification window is 14–21 Oct 2026.", source: "official-research:2026-10-06", createdAt: "2026-10-06T04:59:36.916Z" },
      { id: "cmuiy2hry000o4eeyjntc395t", label: "GATE 2027 application rectification opens", date: "2026-10-14T00:00:00.000Z", isExamDay: false, kind: "CORRECTION_WINDOW", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: "IIT Madras, GATE 2027 important dates: rectification window 14-21 Oct 2026.", source: "official-calendar:2026-27", createdAt: "2026-09-26T22:11:34.654Z" },
      { id: "cmuiy2ht4000q4eeyam3ygasx", label: "GATE 2027 application rectification ends", date: "2026-10-21T00:00:00.000Z", isExamDay: false, kind: "CORRECTION_WINDOW", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: "IIT Madras, GATE 2027 important dates. The brochure lists 21 Oct 2026 as the last date for change of category, paper and exam city choices.", source: "official-calendar:2026-27", createdAt: "2026-09-26T22:11:34.696Z" },
      { id: "cmtioz5x2002veozwgzait07u", label: "GATE 2027 admit card release", date: "2027-01-03T00:00:00.000Z", isExamDay: false, kind: "ADMIT_CARD", confidence: "expected", url: "https://gate2027.iitm.ac.in/", notes: "Expected based on GATE 2027 schedule; downloadable from GOAPS portal", source: "ai-generated:claude", createdAt: "2026-09-01T13:17:20.438Z" },
      { id: "cmuiy2huc000s4eey1l9uoga6", label: "GATE 2027 exam city allotment notification", date: "2027-01-04T00:00:00.000Z", isExamDay: false, kind: "OTHER", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: "IIT Madras, GATE 2027 important dates. Admit card download date: TBA on the official page.", source: "official-calendar:2026-27", createdAt: "2026-09-26T22:11:34.740Z" },
      { id: "cmuw7lwnk0006z6yy75egf7ff", label: "GATE 2027 exams on 6, 7, 13, 14, 20 and 21 Feb 2027 — the CS paper's own date is not announced yet", date: "2027-02-06T00:00:00.000Z", isExamDay: false, kind: "OTHER", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: "IIT Madras, GATE 2027 important dates (re-read 6 Oct 2026): the GATE 2027 examinations are on Saturday 6, Sunday 7, Saturday 13, Sunday 14, Saturday 20 and Sunday 21 Feb 2027. Which of these days the CS paper is held on is not given on the important-dates page or the GATE 2027 home page yet. All dates are liable to change.", source: "official-research:2026-10-06", createdAt: "2026-10-06T04:59:37.232Z" },
      { id: "cmuiy2hy6000y4eeyv480ahr1", label: "GATE 2027 results announced", date: "2027-03-19T00:00:00.000Z", isExamDay: false, kind: "RESULT", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: "IIT Madras, GATE 2027 important dates. All dates are liable to change.", source: "official-calendar:2026-27", createdAt: "2026-09-26T22:11:34.878Z" },
    ],
  },
  GATE_CE: {
    code: "GATE_CE",
    shortName: "GATE CE",
    name: "Graduate Aptitude Test in Engineering — Civil Engineering",
    officialUrl: "https://gate2027.iitm.ac.in/",
    hubYear: { kind: "cycle", year: 2027 },
    updatesOld: 2026,
    rows: [
      { id: "cmuiy4802002qsf5y2m949tw3", label: "GATE 2027 online application (GOAPS) opened", date: "2026-09-02T00:00:00.000Z", isExamDay: false, kind: "APPLICATION_START", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: null, source: "official-research:2026-09-27", createdAt: "2026-09-26T22:12:55.299Z" },
      { id: "cmuiy482h002usf5yd6vs3jpw", label: "GATE 2027 regular registration closes (without late fee)", date: "2026-10-05T00:00:00.000Z", isExamDay: false, kind: "APPLICATION_END", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: "IIT Madras, GATE 2027 important dates (read 6 Oct 2026): regular online registration (without late fee) closes Monday 5 Oct 2026 — extended from 21 Sep and then 27 Sep, both struck through on the page. Registration with the late fee is open until Monday 12 Oct 2026.", source: "official-research:2026-10-06", createdAt: "2026-09-26T22:12:55.385Z" },
      { id: "cmuw7lw4n0002z6yy3gs3zlrc", label: "GATE 2027 extended registration closes (with late fee)", date: "2026-10-12T00:00:00.000Z", isExamDay: false, kind: "APPLICATION_END", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: "IIT Madras, GATE 2027 important dates (read 6 Oct 2026): extended online registration (with late fee) closes Monday 12 Oct 2026 — extended from 30 Sep and then 5 Oct, both struck through on the page. The application rectification window is 14–21 Oct 2026.", source: "official-research:2026-10-06", createdAt: "2026-10-06T04:59:36.549Z" },
      { id: "cmuiy483p002wsf5ybu2nipho", label: "GATE 2027 application rectification window (14–21 Oct)", date: "2026-10-14T00:00:00.000Z", isExamDay: false, kind: "CORRECTION_WINDOW", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: "IIT Madras, GATE 2027 important dates (read 6 Oct 2026): application rectification opens Wednesday 14 Oct and closes Wednesday 21 Oct 2026.", source: "official-research:2026-10-06", createdAt: "2026-09-26T22:12:55.430Z" },
      { id: "cmuiy484x002ysf5yq2az72kf", label: "GATE 2027 exam city allotment notification", date: "2027-01-04T00:00:00.000Z", isExamDay: false, kind: "OTHER", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: null, source: "official-research:2026-09-27", createdAt: "2026-09-26T22:12:55.473Z" },
      { id: "cmuiy48650030sf5y7u6lu9dx", label: "GATE 2027 exams on 6, 7, 13, 14, 20 and 21 Feb 2027 — the CE paper's own date is not announced yet", date: "2027-02-06T00:00:00.000Z", isExamDay: false, kind: "OTHER", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: null, source: "official-research:2026-09-27", createdAt: "2026-09-26T22:12:55.517Z" },
      { id: "cmuiy487e0032sf5ytz8onokp", label: "GATE 2027 results announced", date: "2027-03-19T00:00:00.000Z", isExamDay: false, kind: "RESULT", confidence: "official", url: "https://gate2027.iitm.ac.in/important_dates", notes: null, source: "official-research:2026-09-27", createdAt: "2026-09-26T22:12:55.562Z" },
    ],
  },
  CLAT: {
    code: "CLAT",
    shortName: "CLAT",
    name: "CLAT — Common Law Admission Test (UG), Consortium of National Law Universities",
    officialUrl: "https://consortiumofnlus.ac.in/",
    hubYear: { kind: "cycle", year: 2027 },
    updatesOld: 2026,
    rows: [
      { id: "cmuiy46gr000psf5yt3wae6dw", label: "CLAT 2027 press release: exam on 6 December 2026, applications 3 August – 31 October 2026", date: "2026-07-22T00:00:00.000Z", isExamDay: false, kind: "NOTIFICATION", confidence: "official", url: "https://consortiumofnlus.ac.in/clat-2027/", notes: null, source: "official-research:2026-09-27", createdAt: "2026-09-26T22:12:53.307Z" },
      { id: "cmuiy46hz000rsf5yld4ih378", label: "CLAT 2027 applications open", date: "2026-08-03T00:00:00.000Z", isExamDay: false, kind: "APPLICATION_START", confidence: "official", url: "https://consortiumofnlus.ac.in/clat-2027/", notes: null, source: "official-research:2026-09-27", createdAt: "2026-09-26T22:12:53.351Z" },
      { id: "cmuiy46j7000tsf5ylyfi70gu", label: "CLAT 2027 last date for receiving applications", date: "2026-10-31T00:00:00.000Z", isExamDay: false, kind: "APPLICATION_END", confidence: "official", url: "https://consortiumofnlus.ac.in/clat-2027/", notes: null, source: "official-research:2026-09-27", createdAt: "2026-09-26T22:12:53.395Z" },
      { id: "cmuiy46kf000vsf5yc1w503fc", label: "CLAT 2027 exam, 2:00 pm to 4:00 pm", date: "2026-12-06T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "official", url: "https://consortiumofnlus.ac.in/clat-2027/", notes: null, source: "official-research:2026-09-27", createdAt: "2026-09-26T22:12:53.440Z" },
    ],
  },
  HR_TET: {
    code: "HR_TET",
    shortName: "HTET",
    name: "Haryana Teacher Eligibility Test (HTET)",
    officialUrl: "https://bseh.org.in",
    hubYear: { kind: "cycle", year: 2027 },
    updatesOld: 2026,
    rows: [
      { id: "cmtip1zcq0053eozwqgrsnhif", label: "Exam City Intimation Slip", date: "2026-06-25T00:00:00.000Z", isExamDay: false, kind: "OTHER", confidence: "official", url: "https://quicksarkari.com/htet-admit-card-2026/", notes: "Exam city intimation slip released at 4:00 PM", source: "ai-generated:claude", createdAt: "2026-09-01T13:19:31.898Z" },
      { id: "cmtip1zct0055eozw4ta0w1ma", label: "Admit Card Release", date: "2026-07-01T00:00:00.000Z", isExamDay: false, kind: "ADMIT_CARD", confidence: "official", url: "https://www.careerpower.in/htet-admit-card.html", notes: "Admit cards for all three levels released", source: "ai-generated:claude", createdAt: "2026-09-01T13:19:31.901Z" },
      { id: "cmtip1zcx0057eozwfd9jvbm2", label: "HTET Exam - Level 1, 2, 3", date: "2026-07-04T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "official", url: "https://testbook.com/news/htet-notification-2026-out/", notes: "Exam conducted on July 4-5, 2026 in offline mode", source: "ai-generated:claude", createdAt: "2026-09-01T13:19:31.905Z" },
      { id: "cmt5veqy600c313qej2cr9mf4", label: "HTET Exam - Day 2", date: "2026-07-05T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "official", url: "https://www.adda247.com/teaching-jobs-exam/haryana-htet-exam-2026-postponed-once-again/", notes: "Day 2 of examination", source: "ai-generated:claude", createdAt: "2026-08-23T13:56:24.942Z" },
      { id: "cmt5ver0g00c513qe3u83yj31", label: "Provisional Answer Key released", date: "2026-07-06T00:00:00.000Z", isExamDay: false, kind: "ANSWER_KEY", confidence: "official", url: "https://news.aglasem.com/htet-answer-key-2026-download-bseh-org-in-prt-tgt-pgt/", notes: "Revised answer key uploaded July 7; objection window July 6-9", source: "ai-generated:claude", createdAt: "2026-08-23T13:56:25.024Z" },
      { id: "cmtip1zd00059eozwkxcvm4ne", label: "Result Declaration", date: "2026-08-05T00:00:00.000Z", isExamDay: false, kind: "RESULT", confidence: "official", url: "https://competition.careers360.com/articles/htet-result", notes: "HTET 2026 result released at bseh.org.in", source: "ai-generated:claude", createdAt: "2026-09-01T13:19:31.908Z" },
      { id: "cmtip1zd3005beozwvgtqixz5", label: "HTET 2027 Notification (expected)", date: "2026-12-24T00:00:00.000Z", isExamDay: false, kind: "NOTIFICATION", confidence: "expected", url: null, notes: "Expected notification for next cycle based on 2026 pattern", source: "ai-generated:claude", createdAt: "2026-09-01T13:19:31.911Z" },
    ],
  },
  UP_UPTET: {
    code: "UP_UPTET",
    shortName: "UPTET",
    name: "Uttar Pradesh Teacher Eligibility Test (UPTET)",
    officialUrl: "https://upessc.up.gov.in",
    hubYear: { kind: "held-year", year: 2026 },
    updatesOld: 2026,
    rows: [
      { id: "cmt5w00ty02st13qertaoe9gu", label: "Admit card released", date: "2026-06-30T00:00:00.000Z", isExamDay: false, kind: "ADMIT_CARD", confidence: "official", url: "https://www.sarkaristation.com/results/uptet-answer-key-2026-out", notes: "Hall tickets available via UPESSC portal with registration number and OTP", source: "ai-generated:claude", createdAt: "2026-08-23T14:12:57.526Z" },
      { id: "cmt5w00vf02sx13qeimlscarc", label: "UPTET 2026 Exam (Paper 1 & Paper 2)", date: "2026-07-02T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "official", url: "https://www.adda247.com/teaching-jobs-exam/uptet-notification-2026-out/", notes: "Exam conducted over 3 days (July 2-4) in two shifts per day across 955 centres", source: "ai-generated:claude", createdAt: "2026-08-23T14:12:57.580Z" },
      { id: "cmt5w00wx02t113qejaznhtz0", label: "Provisional Answer Key released", date: "2026-07-08T00:00:00.000Z", isExamDay: false, kind: "ANSWER_KEY", confidence: "official", url: "https://www.pw.live/teaching/exams/uptet-answer-key-2026", notes: "Paper 1 and Paper 2 provisional answer keys released; objection window July 8-14", source: "ai-generated:claude", createdAt: "2026-08-23T14:12:57.633Z" },
      { id: "cmpjtabju001j5ef8z7n38sj3", label: "UPTET — notification expected", date: "2026-07-15T00:00:00.000Z", isExamDay: false, kind: null, confidence: null, url: null, notes: null, source: "https://updeled.gov.in/", createdAt: "2026-05-24T13:26:56.251Z" },
      { id: "cmt5w013m02t913qe1hs2ow95", label: "UPTET 2026 Result (expected)", date: "2026-08-30T00:00:00.000Z", isExamDay: false, kind: "RESULT", confidence: "expected", url: "https://news.careers360.com/uptet-results-2026-date-time-live-updates-uttar-pradesh-tet-ka-result-kab-aayega-official-link-upessc-up-gov-in-qualifying-marks", notes: "UPESSC expected to release results in August 2026; exact date not announced", source: "ai-generated:claude", createdAt: "2026-08-23T14:12:57.874Z" },
    ],
  },
  JEE_MAIN: {
    code: "JEE_MAIN",
    shortName: "JEE Main",
    name: "Joint Entrance Examination — Main",
    officialUrl: "https://nta.ac.in",
    hubYear: { kind: "cycle", year: 2027 },
    updatesOld: 2027,
    rows: [
      { id: "cmtk4d9m3000h14mbnnikz7w8", label: "CSAB Round 2 seat allotment result", date: "2026-08-12T00:00:00.000Z", isExamDay: false, kind: "OTHER", confidence: "official", url: "https://www.sarvgyan.com/articles/jee-main-2026", notes: "Final counselling round for NIT/IIIT admissions", source: "ai-generated:claude", createdAt: "2026-09-02T13:15:58.827Z" },
      { id: "cmtk4d9m6000j14mbvitb1eyl", label: "JEE Main 2027 notification (expected)", date: "2026-10-31T00:00:00.000Z", isExamDay: false, kind: "NOTIFICATION", confidence: "expected", url: null, notes: "NTA typically releases notification in late October each year", source: "ai-generated:claude", createdAt: "2026-09-02T13:15:58.830Z" },
      { id: "cmtk4d9m9000l14mbp3cw82ww", label: "JEE Main 2027 Session 1 application start (expected)", date: "2026-10-31T00:00:00.000Z", isExamDay: false, kind: "APPLICATION_START", confidence: "expected", url: null, notes: "Registration typically opens same day as notification", source: "ai-generated:claude", createdAt: "2026-09-02T13:15:58.833Z" },
      { id: "cmtk4d9mc000n14mbhjq4ex0m", label: "JEE Main 2027 Session 1 application end (expected)", date: "2026-11-27T00:00:00.000Z", isExamDay: false, kind: "APPLICATION_END", confidence: "expected", url: null, notes: "Based on 2026 cycle pattern; typically 4-week window", source: "ai-generated:claude", createdAt: "2026-09-02T13:15:58.837Z" },
      { id: "cmuiy2j2z001w4eey928tuosz", label: "JEE Main 2027 Session 1 exam begins (tentative)", date: "2027-01-22T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "official", url: "https://nta.ac.in/Download/Notice/Notice_20260916195948.pdf", notes: "NTA Examination Calendar (public notice 16 Sep 2026): Session 1 on 22-24 and 28-30 Jan 2027, buffer day 31 Jan 2027 (6 exam days). Application dates come in the Information Bulletin, not yet out.", source: "official-calendar:2026-27", createdAt: "2026-09-26T22:11:36.347Z" },
      { id: "cmuiy2j47001y4eeyuldvuizu", label: "JEE Main 2027 Session 1 exam ends (tentative)", date: "2027-01-30T00:00:00.000Z", isExamDay: true, kind: "EXAM", confidence: "official", url: "https://nta.ac.in/Download/Notice/Notice_20260916195948.pdf", notes: "NTA Examination Calendar (public notice 16 Sep 2026): last scheduled Session 1 day; 31 Jan 2027 is the buffer day.", source: "official-calendar:2026-27", createdAt: "2026-09-26T22:11:36.391Z" },
    ],
  },
};
