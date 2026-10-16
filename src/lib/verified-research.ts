// Verified exam dates from the nightly research on Surge's server (14 Oct
// 2026, founder: "go ahead"). The research runner (02:00 and 04:30 IST, 8
// exams) reads each conducting body's own site and keeps a date only when the
// official page prints it; every date carries the sentence it was quoted from.
// The tools gateway serves the latest runs (POST /tools/research {code}).
//
// For an exam in VERIFIED_RESEARCH_EXAMS the exam-info refresh uses these
// dates instead of asking Claude — only when they are fresh and settled:
//   - the latest run started in the last 36 hours,
//   - it holds at least 2 verified official dates,
//   - the run before it (within 72 hours) holds the same official dates.
// Anything else returns null and the refresh asks Claude as before. Rows go
// through the same writer as Claude's (exam-data-writer.ts), so the site's
// labels do not change; the quote is kept in each row's notes.

import { localKey, localToolsBase } from "@/lib/ai/local-llm";
import { DATE_KINDS, enforceAnswerKeyRule, enforceQuestionPaperRule, type ExamInfoResult, type ImportantDate, type NewsItem } from "@/lib/ai/exam-info";

export const VERIFIED_RESEARCH_EXAMS = new Set(
  (process.env.VERIFIED_RESEARCH_EXAMS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export interface ResearchRun {
  run: string;
  startedAt: string | null;
  manual: boolean;
  items: Array<{ kind: string | null; label: string | null; date: string | null; evidence: string | null; sourceUrl: string | null; official: boolean | null; verified: boolean | null }>;
  news: Array<{ title: string | null; date: string | null; evidence: string | null; sourceUrl: string | null; official: boolean | null; verified: boolean | null }>;
}

const FRESH_MS = 36 * 3600_000;
const PREV_MS = 72 * 3600_000;
const DAY = 86_400_000;

const officialRows = (r: ResearchRun) =>
  r.items.filter(
    (i) => i.official && i.verified && i.date && /^\d{4}-\d{2}-\d{2}$/.test(i.date) && !!i.kind && (DATE_KINDS as string[]).includes(i.kind) && !!i.sourceUrl,
  );
const key = (r: ResearchRun) =>
  officialRows(r)
    .map((i) => `${i.kind}|${i.date}`)
    .sort()
    .join(",");

const MONTH = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE_MENTION = new RegExp(String.raw`\b\d{1,2}\s?(?:st|nd|rd|th)?\s*(?:of\s+)?${MONTH}\b|\b\d{1,2}[./-]\d{1,2}[./-]\d{2,4}\b`, "gi");

/**
 * The quote gives an exam WINDOW ("30th November to 31st December"), not a day
 * (16 Oct 2026: SSC CHSL Tier-I was kept as "31 December" alone). One date of
 * a range would mislead a student, so such an exam stays with Claude.
 */
export function quotesDateRange(evidence: string): boolean {
  const mentions = evidence.match(DATE_MENTION)?.length ?? 0;
  return mentions >= 2 && /\b(?:to|till|until)\b|[–—]/i.test(evidence);
}

/**
 * The runs → an ExamInfoResult, or null when they are not fresh and settled
 * (see the file header). Pure: the caller fetches the runs.
 */
export function pickVerified(runs: ResearchRun[], officialUrl: string | null | undefined, now: Date = new Date()): ExamInfoResult | null {
  const scheduled = runs.filter((r) => !r.manual && r.startedAt);
  const [latest, prev] = scheduled;
  if (!latest || now.getTime() - Date.parse(latest.startedAt!) > FRESH_MS) return null;
  const rows = officialRows(latest);
  if (rows.length < 2) return null;
  if (rows.some((i) => i.kind === "EXAM" && quotesDateRange(i.evidence ?? ""))) return null;
  if (!prev || Date.parse(latest.startedAt!) - Date.parse(prev.startedAt!) > PREV_MS || key(prev) !== key(latest)) return null;
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const dates: ImportantDate[] = rows.map((i) => ({
    label: String(i.label ?? i.kind).slice(0, 120),
    daysFromNow: Math.round((Date.parse(`${i.date}T00:00:00Z`) - today) / DAY),
    isExamDay: i.kind === "EXAM",
    notes: i.evidence ? `Official notice: "${i.evidence.replace(/\s+/g, " ").trim().slice(0, 560)}"` : null,
    kind: i.kind as ImportantDate["kind"],
    date: i.date,
    confidence: "official",
    source: i.sourceUrl,
  }));
  const news: NewsItem[] = latest.news
    .filter((n) => n.official && n.verified && n.title && n.sourceUrl)
    .map((n) => ({
      title: String(n.title).slice(0, 160),
      body: String(n.evidence ?? n.title).replace(/\s+/g, " ").trim().slice(0, 1200),
      daysAgo: n.date ? Math.min(60, Math.max(0, Math.round((today - Date.parse(`${n.date}T00:00:00Z`)) / DAY))) : 0,
      source: n.sourceUrl,
    }))
    .filter((n) => n.daysAgo <= 60);
  return { news, dates: enforceQuestionPaperRule(enforceAnswerKeyRule(dates), officialUrl), inputTokens: 0, outputTokens: 0 };
}

/** Fetch the latest runs for one exam from the tools gateway; null on any failure. */
export async function verifiedExamInfo(code: string, officialUrl: string | null | undefined, now: Date = new Date()): Promise<ExamInfoResult | null> {
  if (!VERIFIED_RESEARCH_EXAMS.has(code) || !localToolsBase() || !localKey()) return null;
  try {
    const res = await fetch(`${localToolsBase()}/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localKey()}` },
      body: JSON.stringify({ code }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { runs?: ResearchRun[] };
    return pickVerified(data.runs ?? [], officialUrl, now);
  } catch {
    return null;
  }
}
