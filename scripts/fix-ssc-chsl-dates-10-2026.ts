// scripts/fix-ssc-chsl-dates-10-2026.ts — wrong and over-stated rows on the
// SSC CHSL tracker (quality review, 13 Oct 2026).
//
// What is wrong (read 13 Oct 2026, 09:30–09:55 IST: SELECT only on the
// production DB, the live /exams/SSC_CHSL/updates page, and SSC's own PDFs):
//
//   apr30 — three AI-made rows (refresh generator, 28 Aug 2026, source
//           "ai-generated:claude") cited only to sarkariexamsalerts.com:
//             "SSC CHSL 2026 notification released"  30 Apr 2026
//             "Application window start"             30 Apr 2026
//             "Application window end"               31 May 2026
//           The tracker prints all three as "Reported · Done", beside the
//           real 2026 rows (notification 7 Sep, applications 7 Sep – 7 Oct).
//           A student reads two notifications and an application window that
//           never opened. SSC's CHSL 2026 notice: "(To be uploaded on the
//           website of the Commission; i.e. https://ssc.gov.in/ on
//           07-09-2026)" and "Dates for submission of online applications
//           07.09.2026 to 07.10.2026". SSC's 2026-27 tentative calendar gave
//           MONTHS only (advertisement April 2026, closing May 2026); the
//           cited page (posted 27 Apr 2026) turned those months into days and
//           called them released. Wrong: archive + suppress.
//   mar20 — "SSC CHSL 2025 Tier 1 final answer key released" twice: 19 Mar
//           (careers360) and 20 Mar 2026 (careers360 /amp). SSC: "uploaded
//           Final Answer Key(s) … on its website on 19.03.2026 (06:00 PM)".
//           The 20 Mar copy is a day late and a duplicate: archive +
//           suppress; the 19 Mar row stays.
//   keys25 — the 2025 cycle's answer keys: Tier-I tentative 8 Dec 2025, Tier-I
//           final 19 Mar 2026, Tier-II tentative 20 Apr 2026. Each date is
//           right (SSC's notices of 08.12.2025, 19.03.2026, 20.04.2026), but
//           on the 2026 cycle's tracker the key-dates strip picks the latest
//           key and shows "🔑 Answer key 20 Apr 2026 · Reported · Done" — a
//           student reads that this cycle's key is out. The 2026 Tier-I is
//           only proposed for 30 Nov – 31 Dec. Archive + suppress (as SSC
//           CGL's 2025 keys were on 12 Oct, --only both); with
//           mar20 and keys25 the strip says the key is not announced yet.
//   nov30 — "Tier 1 exam" 30 Nov 2026 (AI-made, cited to ssc.gov.in's home
//           page) with the notes "exact date announced on October 1, 2026",
//           and "in multiple shifts". SSC's Important Notice of 01.10.2026
//           lists CHSL 2026 Tier-I under "Proposed Dates": "30th November,
//           to 31st December, 2026". The day is right; "exact" is not, and
//           "multiple shifts" is not on the notice. Relabel in place (the
//           label the 10 Oct official-date checks chose for this row), cite
//           the notice, replace the notes. Source and confidence are kept, so
//           the page still prints "Reported" (src/lib/official-source.ts
//           dateRowTier: an AI-made row is never official) — making it
//           official is the founder's open decision 2 of 10 Oct (a date the
//           body calls proposed), not this script's.
//   news1 — the news item "SSC CHSL 2026 Tier 1 exam dates announced for
//           Nov-Dec 2026" (5 Oct, AI-written, cited to ssc.gov.in's home
//           page): "the Tier 1 exam will be conducted from 30th November to
//           31st December 2026 … for 2,536 vacancies". SSC: "Proposed Dates";
//           "approx. 2536 tentative vacancies". Rewrite title and body to say
//           proposed, cite the notice, date it 1 Oct (SSC posted it then).
//
// Every other live SSC_CHSL row and story was checked and is left as it is
// (the evidence table is in the quality-chsl notes): the 2025 cycle's exam,
// result and FRTA rows match SSC's notices of 08.12.2025, 27.02.2026,
// 20.04.2026 and 19.06.2026 and stay as history (no strip card falls back to
// them); the 2026 rows of 7 Sep, 7 Oct, 8 Oct and 14 Oct match the CHSL 2026
// notice; the three "(expected)" estimates say so.
//
// The writes — never a delete, never a create:
//   archive + suppress (apr30, mar20, keys25): archivedAt = now, source =
//     SUPPRESSED_SOURCE, so the refresh writer never re-creates a row of
//     that kind on that day (src/lib/exam-data-writer.ts suppressedKeys) —
//     plain archiving is not enough: an "official" generated row with a URL
//     is KEPT by every refresh that does not re-confirm it, which is how the
//     30 Apr rows outlived the real notice by five weeks.
//   edit in place (nov30, news1): only the fields named above.
// How long the edits last: nov30 and news1 stay generated rows, so a later
// refresh that writes an official EXAM row on 30 Nov, or restates the story,
// replaces them with its own wording (still "reported"; no worse than
// today). The lasting fix for nov30 is decision 2 (curate it) — if the
// founder takes it, apply-official-date-checks-2026-10.ts matches this row
// by its old label "Tier 1 exam", so run that INSTEAD of --only nov30.
//
// Guards: dry run by default; --apply needs --only <groups> (comma list, or
// "all"); unknown flags are refused. Rows are found at run time by exam,
// kind, IST day, cited host, provenance and exact label (stories by exact
// title, day and host) — never by id alone; a row missing or found twice is
// printed and skipped, never guessed. --apply of apr30 is refused unless the
// tracker holds the 2026 notification row on 7 Sep cited to SSC's CHSL 2026
// notice (the evidence the 30 Apr rows are wrong, and the cycle the 2025 keys
// are stale for: keys25 too); of mar20, unless the 19 Mar final-key row is
// live or keys25 archives it in the same run; of nov30 / news1,
// when SSC's notice was read more than READ_MAX_DAYS ago (proposed dates can
// move: re-read, update EVIDENCE.schedule.readAt). The undo log is written
// (status "pending") BEFORE the first write; the writes run in one
// transaction, each row re-read inside it, and the run stops if any row
// changed since the plan.
//
// Undo: --apply writes data/fix-logs/fix-ssc-chsl-dates-10-2026.<groups>.<time>.json
// with every row's fields before and after; --undo <that file> is a dry run
// of the undo, --undo <file> --apply puts the rows back and logs the undo.
// The tracker and hub read the change within 30 minutes (ISR).
//
// IndexNow after the apply (the dry run prints the list): the hub, tracker,
// their hi / te twins, context.md, and the news permalink for news1.
//
// USAGE (from the repo root; .env.local is PRODUCTION):
//   npx tsx --env-file=.env.local scripts/fix-ssc-chsl-dates-10-2026.ts                     # dry run, all groups
//   npx tsx --env-file=.env.local scripts/fix-ssc-chsl-dates-10-2026.ts --apply --only all  # or --only apr30,mar20
//   npx tsx --env-file=.env.local scripts/fix-ssc-chsl-dates-10-2026.ts --undo data/fix-logs/<file>.json [--apply]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SUPPRESSED_SOURCE, buildTimeline, fmtDay, isoDay, latestOfKind, resolveKind, rowCitation, upcomingOfKind, type TimelineRow } from "../src/lib/exam-timeline";
import { dateRowTier } from "../src/lib/official-source";

export const EXAM = "SSC_CHSL";
export const LOG_DIR = "data/fix-logs";
export const LOG_STEM = "fix-ssc-chsl-dates-10-2026";
/** The refresh writer's provenance tag (src/lib/exam-data-writer.ts GEN_SOURCE;
 *  not imported, so this script does not load the IndexNow module). */
export const GEN_SOURCE = "ai-generated:claude";
export const SITE = "https://shishya.in";
/** Proposed dates can move: --apply of nov30 / news1 wants a read this fresh. */
export const READ_MAX_DAYS = 5;

export const GROUPS = ["apr30", "mar20", "keys25", "nov30", "news1"] as const;
export type Group = (typeof GROUPS)[number];

// ── Evidence (SSC's own documents, read 13 Oct 2026) ─────────────────────

export const EVIDENCE = {
  schedule: {
    url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_01102026.pdf",
    doc: "SSC Important Notice F. No. HQ-EC033/7/2025-EC of 01.10.2026 ('Important Notice - Schedule of Examinations' on ssc.gov.in's notice board, posted 1 Oct 2026)",
    quote: "3. Combined Higher Secondary (10+2) Level Examination, 2026 | Tier-I (CBE) | [column: Proposed Dates] 30th November, to 31st December, 2026",
    readAt: "2026-10-13T09:45:00+05:30",
  },
  notice: {
    url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Notice_of_adv_chsl_2026.pdf",
    doc: "SSC Notice of Combined Higher Secondary (10+2) Level Examination, 2026 (F. No. HQ-C1102/5/2026-C-1), page 1",
    quote:
      "(To be uploaded on the website of the Commission; i.e. https://ssc.gov.in/ on 07-09-2026) … Dates for submission of online applications 07.09.2026 to 07.10.2026 | Last date and time for receipt of online applications 07.10.2026 (23:00 Hours) | Schedule of Tier-I (Computer Based Examination) To be notified later",
    readAt: "2026-10-13T09:40:00+05:30",
  },
  calendar: {
    url: "https://ssc.gov.in/api/attachment/uploads/masterData/ExamCalendar/Tentative_Calendar2026_27_08012026.pdf",
    doc: "SSC Tentative Calendar of Examinations for the year 2026-2027",
    quote: "7 Combined Higher Secondary (10+2) Level Examination, 2026 | Tier-I (CBE)* | Date of Advertisement: April 2026 | Closing Date: May 2026 | Tentative Date / Month of Examination: July – September 2026",
    readAt: "2026-10-13T09:50:00+05:30",
  },
  tentKey: {
    url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/writeup_08122025.pdf",
    doc: "SSC notice No. HQ-C1102/22/2025-C-1 dated 08.12.2025 (CHSL 2025 Tier-I tentative answer keys)",
    quote: "The representations/ challenges against the Tentative Answer Keys, if any, may be submitted online from 08.12.2025 (06:00 PM) to 11.12.2025 (06:00 PM)",
    readAt: "2026-10-13T09:52:00+05:30",
  },
  t2Key: {
    url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Write%20Up%20for%20CHSLE%202025%20Tier-II.pdf",
    doc: "SSC notice No. HQ-C1102/22/2025-C-1 dated 20.04.2026 (CHSL 2025 Tier-II tentative answer keys)",
    quote: "The representations in respect of the Tentative Answer Key(s), if any, may be submitted online from 20.04.2026 (01.00 PM) to 23.04.2026 (06.00 PM)",
    readAt: "2026-10-13T09:52:00+05:30",
  },
  finalKey: {
    url: "https://ssc.gov.in/api/attachment/uploads/masterData/NoticeBoards/Answer_key_19032026.pdf",
    doc: "SSC notice No. HQ-C1102/22/2025-C-1 of 19.03.2026 (CHSL 2025 Tier-I final answer keys)",
    quote: "The Commission has uploaded Final Answer Key(s) along-with Candidates' Response Sheet(s) of Tier-I of Combined Higher Secondary (10+2) Level Examination, 2025 on its website on 19.03.2026 (06:00 PM)",
    readAt: "2026-10-13T09:52:00+05:30",
  },
} as const;
export type EvidenceKey = keyof typeof EVIDENCE;

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

export interface Story {
  id: string;
  examId: string;
  title: string;
  body: string;
  source: string | null;
  url: string | null;
  publishedAt: Date;
  archivedAt: Date | null;
}
export const STORY_SELECT = { id: true, examId: true, title: true, body: true, source: true, url: true, publishedAt: true, archivedAt: true } as const;

// ── Targets ──────────────────────────────────────────────────────────────

/** The label nov30 gets — the one apply-official-date-checks-2026-10.ts chose
 *  for this row on 10 Oct (its newLabel), so both paths word it alike. */
export const NOV30_LABEL = "Tier 1 exam (proposed: 30 Nov – 31 Dec 2026)";
export const NOV30_NOTES =
  "SSC Important Notice of 1 Oct 2026 (F. No. HQ-EC033/7/2025-EC): CHSL 2026 Tier-I (computer-based), proposed dates 30 Nov to 31 Dec 2026. SSC's CHSL 2026 notice (7 Sep 2026) said the Tier-I schedule would be notified later.";
/** The generator's notes line for a stage with no published key (src/lib/ai/exam-info.ts NO_KEY_PUBLISHED_NOTE; not imported, see GEN_SOURCE). */
export const NO_KEY_PUBLISHED_NOTE = "no key published for this stage";

export interface DateTarget {
  group: Group;
  /** Resolved kind (resolveKind). */
  kind: string;
  /** IST calendar day, YYYY-MM-DD. */
  day: string;
  /** Cited hosts (no www.; subdomains match). */
  hosts: readonly string[];
  /** The row's whole label. */
  label: RegExp;
  action: "archive-suppress" | "edit";
  /** The fields an "edit" target changes (the rest are kept). */
  edit?: (r: Row) => Partial<DateFields>;
  evidence: EvidenceKey;
  why: string;
}

export const DATE_TARGETS: readonly DateTarget[] = [
  {
    group: "apr30",
    kind: "NOTIFICATION",
    day: "2026-04-30",
    hosts: ["sarkariexamsalerts.com"],
    label: /^SSC CHSL 2026 notification released$/,
    action: "archive-suppress",
    evidence: "notice",
    why: "SSC published the CHSL 2026 notice on 7 Sep 2026, not 30 Apr. The cited aggregator page (posted 27 Apr) turned SSC's calendar month (\"April 2026\") into a day and called it released.",
  },
  {
    group: "apr30",
    kind: "APPLICATION_START",
    day: "2026-04-30",
    hosts: ["sarkariexamsalerts.com"],
    label: /^Application window start$/,
    action: "archive-suppress",
    evidence: "notice",
    why: "SSC's CHSL 2026 applications opened on 07.09.2026; no window opened on 30 Apr 2026.",
  },
  {
    group: "apr30",
    kind: "APPLICATION_END",
    day: "2026-05-31",
    hosts: ["sarkariexamsalerts.com"],
    label: /^Application window end$/,
    action: "archive-suppress",
    evidence: "notice",
    why: "SSC's CHSL 2026 applications closed on 07.10.2026 (23:00); 31 May 2026 was never a closing date (the calendar said only \"May 2026\").",
  },
  {
    group: "mar20",
    kind: "ANSWER_KEY",
    day: "2026-03-20",
    hosts: ["careers360.com"],
    label: /^SSC CHSL 2025 Tier 1 final answer key released$/,
    action: "archive-suppress",
    evidence: "finalKey",
    why: "A second copy of the CHSL 2025 Tier-I final key, a day late: SSC uploaded the final keys on 19.03.2026 (06:00 PM), and the 19 Mar row says so already.",
  },
  {
    group: "keys25",
    kind: "ANSWER_KEY",
    day: "2025-12-08",
    hosts: ["careers360.com"],
    label: /^SSC CHSL 2025 Tier 1 answer key released$/,
    action: "archive-suppress",
    evidence: "tentKey",
    why: "The 2025 cycle's Tier-I tentative key (right date). On the 2026 tracker it is the strip's answer-key card once the later 2025 keys go.",
  },
  {
    group: "keys25",
    kind: "ANSWER_KEY",
    day: "2026-03-19",
    hosts: ["careers360.com"],
    label: /^SSC CHSL 2025 Tier 1 final answer key released$/,
    action: "archive-suppress",
    evidence: "finalKey",
    why: "The 2025 cycle's Tier-I final key (right date). On the 2026 tracker it is the strip's answer-key card once 20 Apr goes.",
  },
  {
    group: "keys25",
    kind: "ANSWER_KEY",
    day: "2026-04-20",
    hosts: ["ssc.gov.in"],
    label: /^CHSL 2025 Tier 2 answer key released$/,
    action: "archive-suppress",
    evidence: "t2Key",
    why: "The 2025 cycle's Tier-II tentative key (right date). The 2026 tracker's strip shows it as \"Answer key 20 Apr 2026 · Reported · Done\" while the 2026 Tier-I is only proposed for 30 Nov – 31 Dec.",
  },
  {
    group: "nov30",
    kind: "EXAM",
    day: "2026-11-30",
    hosts: ["ssc.gov.in"],
    label: /^Tier 1 exam$/,
    action: "edit",
    edit: (r) => ({ label: NOV30_LABEL, url: EVIDENCE.schedule.url, notes: nov30Notes(r.notes) }),
    evidence: "schedule",
    why: "SSC lists 30 Nov – 31 Dec 2026 as PROPOSED dates; the row's notes say \"exact date announced\" and \"multiple shifts\" (not on the notice) and it cites only ssc.gov.in's home page.",
  },
];

export interface NewsTarget {
  group: Group;
  /** IST day of publishedAt, YYYY-MM-DD. */
  day: string;
  hosts: readonly string[];
  title: RegExp;
  evidence: EvidenceKey;
  edit: { title: string; body: string; url: string; publishedAt: string };
  why: string;
}

export const NEWS_TARGETS: readonly NewsTarget[] = [
  {
    group: "news1",
    day: "2026-10-05",
    hosts: ["ssc.gov.in"],
    title: /^SSC CHSL 2026 Tier 1 exam dates announced for Nov-Dec 2026$/,
    evidence: "schedule",
    edit: {
      title: "SSC CHSL 2026 Tier 1: proposed dates 30 Nov – 31 Dec 2026",
      body: "SSC's important notice of 1 October 2026 gives proposed dates for the CHSL 2026 Tier-I computer-based exam: 30 November to 31 December 2026. SSC calls these dates proposed, so check ssc.gov.in for any change. The CHSL 2026 notice came out on 7 September 2026 with about 2,536 tentative vacancies.",
      url: EVIDENCE.schedule.url,
      // When SSC posted the notice (its notice-board feed, createdAt).
      publishedAt: "2026-10-01T12:43:07.517Z",
    },
    why: "The story says the Tier 1 exam \"will be conducted\" 30 Nov – 31 Dec and gives \"2,536 vacancies\"; SSC calls the dates proposed and the vacancies approximate and tentative. It cited only ssc.gov.in's home page and was dated 5 Oct (SSC posted the notice on 1 Oct).",
  },
];

// ── Selection (pure) ─────────────────────────────────────────────────────

export function hostOf(url: string | null): string {
  if (!url) return "";
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}
export const onHosts = (url: string | null, hosts: readonly string[]) => {
  const h = hostOf(url);
  return !!h && hosts.some((x) => h === x || h.endsWith(`.${x}`));
};
const kindOf = (r: Pick<Row, "kind" | "label" | "isExamDay">) => resolveKind({ kind: r.kind, label: r.label, isExamDay: r.isExamDay });

/** A live, generated row of the target's kind, day, cited host and label.
 *  Only the generator's rows: a curated or official-watch row is a person's
 *  or our own fetch's reading, never this script's to change. */
export function matchesDateTarget(r: Row, t: DateTarget): boolean {
  return !r.archivedAt && r.source === GEN_SOURCE && kindOf(r) === t.kind && isoDay(r.date) === t.day && onHosts(rowCitation(r), t.hosts) && t.label.test(r.label);
}
export function matchesNewsTarget(n: Story, t: NewsTarget): boolean {
  return !n.archivedAt && n.source === GEN_SOURCE && isoDay(n.publishedAt) === t.day && onHosts(n.url, t.hosts) && t.title.test(n.title);
}

export interface DatePick {
  target: DateTarget;
  row: Row;
}
export interface NewsPick {
  target: NewsTarget;
  story: Story;
}

/** One row per target, or a problem line: none found (already fixed, or a
 *  refresh re-wrote it) or more than one (never guessed). */
export function selectTargets(
  rows: readonly Row[],
  stories: readonly Story[],
  groups: readonly Group[],
): { dates: DatePick[]; news: NewsPick[]; problems: string[] } {
  const dates: DatePick[] = [];
  const news: NewsPick[] = [];
  const problems: string[] = [];
  for (const t of DATE_TARGETS.filter((x) => groups.includes(x.group))) {
    const found = rows.filter((r) => matchesDateTarget(r, t));
    if (found.length === 1) dates.push({ target: t, row: found[0] });
    else if (found.length === 0) problems.push(`${t.group}: no live generated ${t.kind} row on ${t.day} cited to ${t.hosts.join(", ")} with label ${t.label} — nothing to do (already fixed, or re-written by a refresh?)`);
    else problems.push(`${t.group}: ${found.length} rows match (${found.map((r) => r.id).join(", ")}) — skipped, never guessed`);
  }
  for (const t of NEWS_TARGETS.filter((x) => groups.includes(x.group))) {
    const found = stories.filter((n) => matchesNewsTarget(n, t));
    if (found.length === 1) news.push({ target: t, story: found[0] });
    else if (found.length === 0) problems.push(`${t.group}: no live generated story of ${t.day} cited to ${t.hosts.join(", ")} titled ${t.title} — nothing to do (already fixed, or re-written by a refresh?)`);
    else problems.push(`${t.group}: ${found.length} stories match (${found.map((n) => n.id).join(", ")}) — skipped, never guessed`);
  }
  return { dates, news, problems };
}

/** apr30's evidence on the tracker: the 2026 notification row on 7 Sep cited
 *  to SSC's CHSL 2026 notice (any provenance — the citation is what shows the
 *  30 Apr rows wrong; its text was read above). */
export function notificationEvidenceRow(rows: readonly Row[]): Row | null {
  return rows.find((r) => !r.archivedAt && kindOf(r) === "NOTIFICATION" && isoDay(r.date) === "2026-09-07" && rowCitation(r) === EVIDENCE.notice.url) ?? null;
}

/** mar20's twin: the live 19 Mar final-key row that stays (unless keys25
 *  archives it too). */
export function finalKeyTwin(rows: readonly Row[]): Row | null {
  return rows.find((r) => !r.archivedAt && kindOf(r) === "ANSWER_KEY" && isoDay(r.date) === "2026-03-19" && /final answer key/i.test(r.label)) ?? null;
}

/** Days between SSC's schedule read and `now`. */
export function scheduleReadAgeDays(now: Date): number {
  return (now.getTime() - new Date(EVIDENCE.schedule.readAt).getTime()) / 86_400_000;
}

/** Reasons --apply refuses the chosen groups (empty = go). */
export function applyRefusals(rows: readonly Row[], groups: readonly Group[], now: Date): string[] {
  const out: string[] = [];
  for (const g of ["apr30", "keys25"] as const)
    if (groups.includes(g) && !notificationEvidenceRow(rows))
      out.push(`${g}: no live NOTIFICATION row on 2026-09-07 cited to ${EVIDENCE.notice.url} — the tracker does not show the 2026 cycle the rows are wrong or stale for; read the rows by hand`);
  if (groups.includes("mar20") && !finalKeyTwin(rows) && !groups.includes("keys25"))
    out.push("mar20: no live 19 Mar 2026 final-answer-key row — archiving the 20 Mar copy alone would lose the fact; read the rows by hand (or run it with keys25)");
  const age = scheduleReadAgeDays(now);
  for (const g of ["nov30", "news1"] as const)
    if (groups.includes(g) && age > READ_MAX_DAYS)
      out.push(`${g}: SSC's schedule notice was read ${Math.floor(age)} days ago (limit ${READ_MAX_DAYS}) — proposed dates can move; re-read ${EVIDENCE.schedule.url} and update EVIDENCE.schedule.readAt`);
  return out;
}

// ── Fields, plan, simulate ───────────────────────────────────────────────

export interface DateFields {
  label: string;
  kind: string | null;
  isExamDay: boolean;
  source: string | null;
  notes: string | null;
  confidence: string | null;
  url: string | null;
  archivedAt: string | null;
}
export interface NewsFields {
  title: string;
  body: string;
  source: string | null;
  url: string | null;
  publishedAt: string;
  archivedAt: string | null;
}
export const dateFieldsOf = (r: Row): DateFields => ({
  label: r.label,
  kind: r.kind,
  isExamDay: r.isExamDay,
  source: r.source,
  notes: r.notes,
  confidence: r.confidence,
  url: r.url,
  archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
});
export const newsFieldsOf = (n: Story): NewsFields => ({
  title: n.title,
  body: n.body,
  source: n.source,
  url: n.url,
  publishedAt: n.publishedAt.toISOString(),
  archivedAt: n.archivedAt ? n.archivedAt.toISOString() : null,
});
const dateUpdateData = (f: DateFields) => ({ ...f, archivedAt: f.archivedAt ? new Date(f.archivedAt) : null });
const newsUpdateData = (f: NewsFields) => ({ ...f, publishedAt: new Date(f.publishedAt), archivedAt: f.archivedAt ? new Date(f.archivedAt) : null });
export function sameFields<T extends object>(a: T, b: T): boolean {
  return (Object.keys(a) as (keyof T)[]).every((k) => a[k] === b[k]);
}

/** nov30's notes: the notice's words, plus the generator's no-key line when
 *  the row carried it (the tracker still says no key is out for the stage). */
export function nov30Notes(prev: string | null): string {
  return (prev ?? "").toLowerCase().includes(NO_KEY_PUBLISHED_NOTE) ? `${NOV30_NOTES} · ${NO_KEY_PUBLISHED_NOTE}` : NOV30_NOTES;
}

export type Planned =
  | { table: "date"; group: Group; action: DateTarget["action"]; rowId: string; before: DateFields; after: DateFields; why: string; evidence: EvidenceKey }
  | { table: "news"; group: Group; action: "edit"; rowId: string; before: NewsFields; after: NewsFields; why: string; evidence: EvidenceKey };

export function plan(picks: { dates: readonly DatePick[]; news: readonly NewsPick[] }, now: Date): Planned[] {
  const out: Planned[] = [];
  for (const { target: t, row } of picks.dates) {
    const before = dateFieldsOf(row);
    const after: DateFields =
      t.action === "archive-suppress"
        ? { ...before, archivedAt: now.toISOString(), source: SUPPRESSED_SOURCE }
        : { ...before, ...t.edit?.(row) };
    out.push({ table: "date", group: t.group, action: t.action, rowId: row.id, before, after, why: t.why, evidence: t.evidence });
  }
  for (const { target: t, story } of picks.news) {
    const before = newsFieldsOf(story);
    out.push({ table: "news", group: t.group, action: "edit", rowId: story.id, before, after: { ...before, ...t.edit }, why: t.why, evidence: t.evidence });
  }
  return out;
}

/** The rows as they would be after the plan (for the page preview). */
export function simulate(rows: readonly Row[], planned: readonly Planned[]): Row[] {
  const by = new Map(planned.filter((p) => p.table === "date").map((p) => [p.rowId, p.after as DateFields]));
  return rows.map((r) => {
    const a = by.get(r.id);
    return a ? { ...r, ...a, archivedAt: a.archivedAt ? new Date(a.archivedAt) : null } : r;
  });
}

/** The tracker's list as /exams/SSC_CHSL/updates prints it: one line a row,
 *  with the tier word the page shows (dateRowTier via buildTimeline). */
export function trackerLines(rows: readonly Row[], now: Date, officialUrl: string | null): string[] {
  const tl: TimelineRow[] = buildTimeline(rows.filter((r) => !r.archivedAt), now, officialUrl);
  return tl.map((t) => `${fmtDay(t.date)} · ${t.label} · ${t.tier} · ${t.status === "done" ? "Done" : t.status === "today" ? "Today" : `in ${t.daysFromToday} days`}`);
}

/** The key-dates strip card for `kind` (upcoming, else latest). */
export function stripCard(rows: readonly Row[], kind: string, now: Date, officialUrl: string | null): string {
  const tl = buildTimeline(rows.filter((r) => !r.archivedAt), now, officialUrl);
  const c = upcomingOfKind(tl, kind as TimelineRow["kind"]) ?? latestOfKind(tl, kind as TimelineRow["kind"]);
  return c ? `${fmtDay(c.date)} · ${c.tier} · "${c.label}"` : "not announced yet";
}

export function indexNowUrls(planned: readonly Planned[]): string[] {
  const urls = [
    `${SITE}/exams/${EXAM}`,
    `${SITE}/exams/${EXAM}/updates`,
    `${SITE}/hi/exams/${EXAM}`,
    `${SITE}/te/exams/${EXAM}`,
    `${SITE}/hi/exams/${EXAM}/updates`,
    `${SITE}/te/exams/${EXAM}/updates`,
    `${SITE}/exams/${EXAM}/context.md`,
  ];
  for (const p of planned) if (p.table === "news") urls.push(`${SITE}/exams/${EXAM}/news/${p.rowId}`);
  return urls;
}

// ── CLI ──────────────────────────────────────────────────────────────────

export interface Cli {
  apply: boolean;
  groups: Group[];
  only: string;
  undoFile: string | null;
  log: string | null;
}

/** Parse argv (without node and the script). Refuses unknown flags, unknown
 *  groups and --apply without --only. */
export function parseCli(argv: readonly string[]): Cli {
  const known = new Set(["--apply", "--only", "--undo", "--log"]);
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
    if (values["--only"]) throw new Error("--undo takes the log file only (the log says which rows it changed)");
    return { apply, groups: [], only: "all", undoFile, log: null };
  }
  const raw = values["--only"] ?? (apply ? "" : "all");
  if (!raw) throw new Error(`--apply needs --only ${[...GROUPS, "all"].join(" | ")} (comma list allowed; say which rows)`);
  const parts = raw.split(",").map((s) => s.trim());
  const groups: Group[] = [];
  for (const p of parts) {
    if (p === "all") groups.push(...GROUPS);
    else if ((GROUPS as readonly string[]).includes(p)) groups.push(p as Group);
    else throw new Error(`--only ${JSON.stringify(p)}: not a group — use ${[...GROUPS, "all"].join(" | ")}`);
  }
  const unique = GROUPS.filter((g) => groups.includes(g));
  return { apply, groups: unique, only: unique.length === GROUPS.length ? "all" : unique.join(","), undoFile: null, log: values["--log"] ?? null };
}

// ── Write ────────────────────────────────────────────────────────────────

export type LogEntry = Planned & { exam: string };
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

interface Table {
  findMany(args: unknown): Promise<unknown[]>;
  findUnique(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
}
/** The part of the Prisma client this script uses (no delete, no create). */
export interface TxDb {
  examImportantDate: Table;
  examNewsItem: Table;
}
export interface Db extends TxDb {
  exam: { findUnique(args: unknown): Promise<unknown> };
  $transaction<T>(fn: (tx: TxDb) => Promise<T>, opts?: { timeout?: number }): Promise<T>;
}

export function writeLog(path: string, log: LogFile) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(log, null, 1));
}

/** The row's current fields, or null when it is gone. */
async function currentFields(db: TxDb, e: Pick<Planned, "table" | "rowId">): Promise<DateFields | NewsFields | null> {
  if (e.table === "date") {
    const r = (await db.examImportantDate.findUnique({ where: { id: e.rowId }, select: ROW_SELECT })) as Row | null;
    return r ? dateFieldsOf(r) : null;
  }
  const n = (await db.examNewsItem.findUnique({ where: { id: e.rowId }, select: STORY_SELECT })) as Story | null;
  return n ? newsFieldsOf(n) : null;
}
async function writeFields(db: TxDb, table: Planned["table"], rowId: string, f: DateFields | NewsFields) {
  if (table === "date") await db.examImportantDate.update({ where: { id: rowId }, data: dateUpdateData(f as DateFields) });
  else await db.examNewsItem.update({ where: { id: rowId }, data: newsUpdateData(f as NewsFields) });
}
const same = (a: DateFields | NewsFields | null, b: DateFields | NewsFields) => !!a && sameFields(a as unknown as Record<string, unknown>, b as unknown as Record<string, unknown>);

/** Writes the plan in one transaction. The log (status "pending") is on disk
 *  before the first write; a write error marks it "failed" and rethrows. */
export async function applyPlanned(db: Db, planned: readonly Planned[], logPath: string, only: string, say: (s: string) => void = console.log) {
  const entries: LogEntry[] = planned.map((p) => ({ ...p, exam: EXAM }));
  const log: LogFile = { script: LOG_STEM, kind: "apply", startedAt: new Date().toISOString(), status: "pending", only, entries };
  writeLog(logPath, log); // before any write: if this throws, nothing is written
  try {
    await db.$transaction(
      async (tx) => {
        for (const p of planned) {
          if (!same(await currentFields(tx, p), p.before)) throw new Error(`${p.table} row ${p.rowId} changed since the plan — nothing written; re-run the dry run`);
          await writeFields(tx, p.table, p.rowId, p.after);
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

/** Puts an applied log back (each row to its `before`). Rows changed since
 *  the apply are skipped. Dry run unless `apply`; the undo writes its own log
 *  first. */
export async function undo(db: Db, file: string, apply: boolean, logDir: string = LOG_DIR, say: (s: string) => void = console.log): Promise<{ restored: number; problems: string[] }> {
  const log = JSON.parse(readFileSync(file, "utf8")) as LogFile;
  // "pending": the run stopped between its commit and the log's last write.
  // Safe to undo — each row is restored only if it still holds `after`.
  if (log.script !== LOG_STEM || log.kind !== "apply" || (log.status !== "applied" && log.status !== "pending")) throw new Error(`${file} is not an applied log of ${LOG_STEM}`);
  say(`UNDO of ${file} (${log.entries.length} entries, ${log.status} ${log.startedAt}). ${apply ? "APPLY" : "DRY RUN"}\n`);
  if (log.status === "pending") say("  (the log says pending: the run may have stopped after its commit; only rows that still hold the logged change are restored)\n");
  const steps: { entry: LogEntry; current: DateFields | NewsFields }[] = [];
  const problems: string[] = [];
  for (const e of [...log.entries].reverse()) {
    const current = await currentFields(db, e);
    if (!current) {
      problems.push(`${e.table} ${e.rowId}: not found — skipped`);
      continue;
    }
    if (!same(current, e.after)) {
      problems.push(`${e.table} ${e.rowId}: changed since this script wrote it — skipped, check by hand`);
      continue;
    }
    steps.push({ entry: e, current });
  }
  for (const s of steps) {
    say(`  RESTORE ${s.entry.exam} ${s.entry.table} ${s.entry.rowId} [${s.entry.group}]`);
    const before = s.entry.before as unknown as Record<string, unknown>;
    const cur = s.current as unknown as Record<string, unknown>;
    for (const k of Object.keys(cur)) if (cur[k] !== before[k]) say(`      ${k}: ${JSON.stringify(cur[k])} → ${JSON.stringify(before[k])}`);
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
    entries: steps.map((s) => ({ ...s.entry, before: s.current, after: s.entry.before, why: `undo of ${file}` }) as LogEntry),
  };
  writeLog(logPath, undoLog);
  try {
    await db.$transaction(
      async (tx) => {
        for (const s of steps) {
          if (!same(await currentFields(tx, s.entry), s.current)) throw new Error(`${s.entry.table} row ${s.entry.rowId} changed during the undo — nothing written`);
          await writeFields(tx, s.entry.table, s.entry.rowId, s.entry.before);
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

// ── Run ──────────────────────────────────────────────────────────────────

/** What a row's tier on the page is, said plainly: an AI-made row whose
 *  citation is the body's site is never called "official" here (founder
 *  rule: nothing is official unless a person matched it to the notice). */
export function tierWord(r: Pick<Row, "confidence" | "url" | "source">, officialUrl: string | null): string {
  return dateRowTier(r.confidence, rowCitation(r), officialUrl, r.source);
}

function showRow(r: Row, officialUrl: string | null): string {
  return `${isoDay(r.date)} ${kindOf(r).padEnd(17)} ${tierWord(r, officialUrl).padEnd(8)} "${r.label}" ${rowCitation(r) ?? ""} [${r.source ?? "no source"}] ${r.id}`;
}

export interface RunOpts {
  now?: Date;
  say?: (s: string) => void;
  logDir?: string;
}

export async function run(argv: readonly string[], db: Db, opts: RunOpts = {}): Promise<{ planned: Planned[]; problems: string[]; applied: boolean }> {
  const cli = parseCli(argv);
  const say = opts.say ?? console.log;
  const logDir = opts.logDir ?? LOG_DIR;
  if (cli.undoFile) {
    if (!existsSync(cli.undoFile)) throw new Error(`no such log: ${cli.undoFile}`);
    await undo(db, cli.undoFile, cli.apply, logDir, say);
    return { planned: [], problems: [], applied: cli.apply };
  }
  const now = opts.now ?? new Date();
  const exam = (await db.exam.findUnique({ where: { code: EXAM }, select: { id: true, shortName: true, eligibility: { select: { officialUrl: true } } } })) as {
    id: string;
    shortName: string;
    eligibility: { officialUrl: string | null } | null;
  } | null;
  if (!exam) throw new Error(`no exam ${EXAM}`);
  const officialUrl = exam.eligibility?.officialUrl ?? null;
  const live = (await db.examImportantDate.findMany({ where: { examId: exam.id, archivedAt: null }, orderBy: [{ date: "asc" }, { id: "asc" }], select: ROW_SELECT })) as Row[];
  const stories = (await db.examNewsItem.findMany({ where: { examId: exam.id, archivedAt: null }, orderBy: [{ publishedAt: "desc" }, { id: "asc" }], select: STORY_SELECT })) as Story[];

  const picks = selectTargets(live, stories, cli.groups);
  const planned = plan(picks, now);
  const { problems } = picks;

  say(`${EXAM} tracker fixes — groups: ${cli.only}. ${cli.apply ? "APPLY" : "DRY RUN (nothing is written)"}`);
  say(`Portal ${officialUrl ?? "(none)"}; ${live.length} live rows, ${stories.length} live stories; planned ${planned.length}; problems ${problems.length}.\n`);
  const ev = notificationEvidenceRow(live);
  say(`apr30 / keys25 evidence:      ${ev ? showRow(ev, officialUrl) : "NONE — no live 7 Sep 2026 notification row cited to SSC's CHSL 2026 notice"}`);
  const twin = finalKeyTwin(live);
  say(`mar20 twin that stays:         ${twin ? showRow(twin, officialUrl) : "NONE — no live 19 Mar 2026 final-key row"}`);
  say(`SSC schedule notice read ${scheduleReadAgeDays(now).toFixed(1)} days ago (limit ${READ_MAX_DAYS} for nov30 / news1).`);

  say("\nLive rows (tier = what the page prints):");
  for (const r of live) say(`  ${planned.some((p) => p.rowId === r.id) ? "*" : " "} ${showRow(r, officialUrl)}`);
  say("\nLive stories:");
  for (const n of stories) say(`  ${planned.some((p) => p.rowId === n.id) ? "*" : " "} ${isoDay(n.publishedAt)} "${n.title}" ${n.url ?? ""} [${n.source ?? "no source"}] ${n.id}`);

  if (planned.length) {
    say("\nCHANGES (before → after):");
    for (const p of planned) {
      say(`  - ${p.action === "edit" ? "EDIT" : "ARCHIVE + SUPPRESS"} ${p.table} [${p.group}] ${p.rowId}`);
      const b = p.before as unknown as Record<string, unknown>;
      const a = p.after as unknown as Record<string, unknown>;
      for (const k of Object.keys(b)) if (b[k] !== a[k]) say(`      ${k}: ${JSON.stringify(b[k])} → ${JSON.stringify(a[k])}`);
      say(`      why: ${p.why}`);
      const e = EVIDENCE[p.evidence];
      say(`      SSC: "${e.quote}" — ${e.doc}, ${e.url} (read ${e.readAt})`);
    }
  }
  for (const p of problems) say(`  ! ${p}`);

  const after = simulate(live, planned);
  const nowLines = trackerLines(live, now, officialUrl);
  const afterLines = trackerLines(after, now, officialUrl);
  say("\nTRACKER LIST (/exams/SSC_CHSL/updates), lines that change:");
  for (const l of nowLines) if (!afterLines.includes(l)) say(`  - ${l}`);
  for (const l of afterLines) if (!nowLines.includes(l)) say(`  + ${l}`);
  say("\nKEY-DATES STRIP (upcoming, else latest), now → after:");
  for (const k of ["NOTIFICATION", "APPLICATION_START", "APPLICATION_END", "EXAM", "ANSWER_KEY"]) say(`  ${k.padEnd(17)} ${stripCard(live, k, now, officialUrl)}  →  ${stripCard(after, k, now, officialUrl)}`);
  if (planned.some((p) => p.group === "nov30"))
    say(
      "\nNOTE nov30: apply-official-date-checks-2026-10.ts (decision 2, --include-tentative) matches this row by its old label \"Tier 1 exam\". If the founder takes decision 2, run that INSTEAD of --only nov30; after nov30 it skips the row.",
    );

  const urls = indexNowUrls(planned);
  say(`\nINDEXNOW after the apply (${urls.length} URLs):`);
  for (const u of urls) say(`  ${u}`);
  say("");

  if (!cli.apply) {
    say(`Dry run — nothing written. Write with --apply --only ${[...GROUPS, "all"].join(" | ")} (comma list allowed).`);
    return { planned, problems, applied: false };
  }
  const refusals = applyRefusals(live, cli.groups, now);
  if (refusals.length) throw new Error(`REFUSED —\n  ${refusals.join("\n  ")}`);
  if (planned.length === 0) {
    say("Nothing to write.");
    return { planned, problems, applied: false };
  }
  const logPath = cli.log ?? join(logDir, `${LOG_STEM}.${cli.only.replace(/,/g, "+")}.${now.toISOString().replace(/[:.]/g, "-")}.json`);
  await applyPlanned(db, planned, logPath, cli.only, say);
  return { planned, problems, applied: true };
}

async function main() {
  const { prisma } = await import("../src/lib/db/prisma");
  try {
    await run(process.argv.slice(2), prisma as unknown as Db);
  } finally {
    await prisma.$disconnect();
  }
}

if (/fix-ssc-chsl-dates-10-2026\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
