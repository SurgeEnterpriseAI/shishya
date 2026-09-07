// Exam-week calendar file — GET /exams/{code}/exam-week.ics (6 Sep 2026,
// wave 2). Pure builder; the route handler feeds it the cached tracker
// rows (src/lib/exam-week-inputs.ts).
//
// What goes in: the exam day(s), answer key and result rows the tracker
// HOLDS — typed rows only, one all-day VEVENT each. Inside exam week that
// is the state machine's window days + answer key + result (+ the next
// stage); outside it, the upcoming typed EXAM / ANSWER_KEY / RESULT rows.
// Missing rows are simply absent — no invented dates, ever.
//
// Honesty in the file itself: every SUMMARY ends with the row's tier word
// ("SSC CGL Tier 1 (expected)"), expected rows are STATUS:TENTATIVE, and
// the DESCRIPTION carries the cited source URL (or says the date is an
// estimate) plus the tracker and hub links.

import { computeExamWeekState } from "@/lib/exam-week";
import { buildTimeline, type TimelineInput, type TimelineRow } from "@/lib/exam-timeline";
import { sourceHostLabel, type SourceTier } from "@/lib/official-source";
import { tk, type StringKey } from "@/lib/i18n";

const TIER_KEY: Record<SourceTier, StringKey> = {
  official: "ew.tier.official",
  reported: "ew.tier.reported",
  expected: "ew.tier.expected",
};

export interface IcsExam {
  code: string;
  shortName: string;
  name: string;
}

const SITE = "https://shishya.in";
const DAY_MS = 86_400_000;
const CAL_KINDS: ReadonlySet<TimelineRow["kind"]> = new Set(["EXAM", "ANSWER_KEY", "RESULT"]);

/** Rows worth a calendar entry, earliest first. */
export function examWeekCalendarRows(rows: TimelineInput[], officialUrl: string | null, now: Date = new Date()): TimelineRow[] {
  const typed = rows.filter((r) => typeof r.kind === "string" && r.kind.length > 0);
  const state = computeExamWeekState(typed, officialUrl, now);
  const out = new Map<string, TimelineRow>();
  if (state.phase !== "none") {
    for (const r of state.windowDays) out.set(r.id, r);
    for (const r of [state.answerKey, state.result, state.nextStage]) if (r) out.set(r.id, r);
  } else {
    for (const r of buildTimeline(typed, now, officialUrl)) {
      if (CAL_KINDS.has(r.kind) && r.daysFromToday >= 0) out.set(r.id, r);
    }
  }
  return [...out.values()].sort((a, b) => a.date.getTime() - b.date.getTime());
}

// ── RFC 5545 plumbing ──────────────────────────────────────────────────

/** TEXT value escaping: backslash, semicolon, comma, newline. */
export function icsEscape(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

const enc = new TextEncoder();

/** Fold one content line at 75 octets (continuation lines start with a space). */
export function icsFold(line: string): string {
  const parts: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = parts.length === 0 ? 75 : 74; // continuation lines carry the leading space
    if (bytes + b > limit) {
      parts.push(cur);
      cur = ch;
      bytes = b;
    } else {
      cur += ch;
      bytes += b;
    }
  }
  parts.push(cur);
  return parts.map((p, i) => (i === 0 ? p : ` ${p}`)).join("\r\n");
}

function icsDate(day: string): string {
  return day.replace(/-/g, "");
}

function icsStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function nextDay(day: string): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + DAY_MS).toISOString().slice(0, 10);
}

function summaryOf(exam: IcsExam, row: TimelineRow): string {
  const tier = tk(TIER_KEY[row.tier]);
  const label = row.label.trim();
  const short = exam.shortName.trim();
  const withExam = label.toLowerCase().startsWith(short.toLowerCase()) ? label : `${short} ${label}`;
  return `${withExam} (${tier})`;
}

function descriptionOf(exam: IcsExam, row: TimelineRow): string {
  const source =
    row.tier === "official"
      ? `Official — conducting body's notice: ${row.url ?? ""}`
      : row.tier === "reported"
        ? `Reported — announced, cited via ${sourceHostLabel(row.url ?? "")}: ${row.url ?? ""}`
        : "Expected — estimate from previous cycles, not announced. Confirm on the official website.";
  return [
    `${exam.name}: ${row.label}`,
    source,
    `Tracker (every date with its source tier, free alerts): ${SITE}/exams/${exam.code}/updates`,
    `Shishya exam hub: ${SITE}/exams/${exam.code}`,
  ].join("\n");
}

/** Build the text/calendar body. A calendar with no rows is still valid. */
export function buildExamWeekIcs(exam: IcsExam, rows: TimelineRow[], now: Date = new Date()): string {
  const L: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Shishya//Exam Week//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${icsEscape(`${exam.shortName} — exam dates (Shishya)`)}`,
    "X-WR-TIMEZONE:Asia/Kolkata",
  ];
  const stamp = icsStamp(now);
  for (const r of rows) {
    // The row's IST calendar day is stored as midnight UTC (repo convention);
    // TimelineRow.day is that ISO day, so the event lands on the right date
    // in any calendar app without a timezone conversion.
    L.push(
      "BEGIN:VEVENT",
      `UID:${r.id}@shishya.in`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${icsDate(r.day)}`,
      `DTEND;VALUE=DATE:${icsDate(nextDay(r.day))}`,
      `SUMMARY:${icsEscape(summaryOf(exam, r))}`,
      `DESCRIPTION:${icsEscape(descriptionOf(exam, r))}`,
      `URL:${SITE}/exams/${exam.code}/updates`,
      `STATUS:${r.tier === "expected" ? "TENTATIVE" : "CONFIRMED"}`,
      "TRANSP:TRANSPARENT",
      `CATEGORIES:${icsEscape(r.kind === "EXAM" ? "Exam day" : r.kind === "ANSWER_KEY" ? "Answer key" : "Result")}`,
      "END:VEVENT",
    );
  }
  L.push("END:VCALENDAR");
  return L.map(icsFold).join("\r\n") + "\r\n";
}
