// AI-driven exam-info generator. Produces news bullets + important date
// rows for any Indian entrance exam, given the exam code + canonical name.
//
// Used by:
//   - scripts/seed-news-dates-all.ts (one-off seed across 163 exams)
//   - scripts/backfill-exam-timeline.ts (23 Aug 2026 — tracker backfill)
//   - /api/cron/refresh-exam-data (daily refresh of a rotating subset)
//
// IMPORTANT: this is a web-search-assisted approximation — not scraped
// live from official sites by a deterministic parser. We mark generated
// rows with source = "ai-generated:claude" so the UI can flag them and an
// admin can override with verified entries.
//
// 23 Aug 2026 (exam tracker): every date now also carries
//   kind        — NOTIFICATION | APPLICATION_START | APPLICATION_END |
//                 CORRECTION_WINDOW | ADMIT_CARD | EXAM | ANSWER_KEY |
//                 RESULT | INTERVIEW | OTHER
//   date        — absolute YYYY-MM-DD when the model found/knows it
//                 (daysFromNow is derived from it so older callers work)
//   confidence  — "official" ONLY when dated by an official/reliable
//                 notice the model cites in `source`; otherwise
//                 "expected" (typical-cycle estimate) — the tracker page
//                 renders the two very differently, so the model must
//                 never upgrade a guess to official.
//   source      — URL of the notice when found.
// and news items carry `source` (URL) which the writers now persist in
// ExamNewsItem.url.

import Anthropic from "@anthropic-ai/sdk";
import { anthropic, MODEL } from "./client";

export interface ExamInfoInput {
  examCode: string;
  examName: string;
  examShortName: string;
  category: string;
}

export interface NewsItem {
  title: string;
  body: string;
  daysAgo: number;
  source?: string | null;
}

export type DateKind =
  | "NOTIFICATION"
  | "APPLICATION_START"
  | "APPLICATION_END"
  | "CORRECTION_WINDOW"
  | "ADMIT_CARD"
  | "EXAM"
  | "ANSWER_KEY"
  | "RESULT"
  | "INTERVIEW"
  | "OTHER";

export const DATE_KINDS: DateKind[] = [
  "NOTIFICATION",
  "APPLICATION_START",
  "APPLICATION_END",
  "CORRECTION_WINDOW",
  "ADMIT_CARD",
  "EXAM",
  "ANSWER_KEY",
  "RESULT",
  "INTERVIEW",
  "OTHER",
];

export interface ImportantDate {
  label: string;
  daysFromNow: number;
  isExamDay: boolean;
  notes?: string | null;
  kind: DateKind;
  /** Absolute calendar date (YYYY-MM-DD) when known; null = offset only. */
  date: string | null;
  confidence: "official" | "expected";
  source?: string | null;
}

export interface ExamInfoResult {
  news: NewsItem[];
  dates: ImportantDate[];
  inputTokens: number;
  outputTokens: number;
}

const SYSTEM = `You are a research assistant generating up-to-date exam-prep context for a free Indian entrance-exam tutoring platform (Shishya).

Your output: STRICT JSON describing recent news items + the important-dates timeline for ONE Indian entrance/recruitment exam — the rows behind an "exam tracker" page students rely on for exam date, notification, admit card, answer key and result.

RULES:
1. HONESTY ABOUT CERTAINTY is the whole job. Every date row carries "confidence":
   - "official" ONLY when you found the exact date in an official notice / the conducting body's site / a reliable national news report from THIS cycle — and you MUST put that URL in "source". If you cannot cite it, it is NOT official.
   - "expected" for everything else: typical-cycle estimates ("Tier 1 usually runs June–July"), tentative calendar entries, or dates inferred from last year. Use the label to say so ("Tier 1 exam (expected)").
   Never present an estimate as official. Never invent vacancy counts or cut-off marks.
2. Prefer ABSOLUTE dates ("date": "YYYY-MM-DD") whenever you know them (official or expected). If only a rough window is known, still give your best single date and say "(expected)" in the label; put the window in "notes" ("usually mid-June to early July").
3. Give each date a "kind" from exactly this list: NOTIFICATION, APPLICATION_START, APPLICATION_END, CORRECTION_WINDOW, ADMIT_CARD, EXAM, ANSWER_KEY, RESULT, INTERVIEW, OTHER. Set "isExamDay": true only on EXAM rows. Multi-stage exams (Tier 1/2, Prelims/Mains) get one EXAM row per stage with the stage in the label.
4. Cover the CURRENT cycle end to end: notification → application window → admit card → exam day(s) → answer key → result. Include recent past milestones (up to ~120 days back) so the tracker shows "done" steps, and upcoming ones up to ~18 months ahead when the next cycle's notification is expected.
5. News: each item title MUST be exam-specific ("Tier 1 admit card window confirmed by SSC"), body 1-3 sentences, and "source" = the real URL when you found one (null otherwise). Recent (last 60 days) news only. If nothing genuinely new happened, return fewer items — never filler.
6. If the exam is low-coverage and you don't have confident detail, return shorter arrays (1-2 news, 3-5 expected dates) rather than padding.
7. Output STRICTLY this JSON shape — no markdown fences, no preamble:

{
  "news": [
    { "title": "...", "body": "...", "daysAgo": 3, "source": "https://..." | null }
  ],
  "dates": [
    { "label": "...", "kind": "EXAM", "date": "2026-09-14" | null, "daysFromNow": 22, "isExamDay": true, "confidence": "official" | "expected", "source": "https://..." | null, "notes": "..." | null }
  ]
}

daysAgo: positive integer = how many days ago a news bullet was published. 0-60.
daysFromNow: integer offset of the date from today (negative = past). −120 to 540. Must agree with "date" when both are given.`;

export async function generateExamInfo(
  input: ExamInfoInput,
  opts: { useWebSearch?: boolean } = {},
): Promise<ExamInfoResult> {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const userPrompt = `Generate news + the important-dates timeline for this Indian exam.

Exam code:   ${input.examCode}
Exam name:   ${input.examName}
Short name:  ${input.examShortName}
Category:    ${input.category}

Today's date: ${todayIso}.

${opts.useWebSearch ? `IMPORTANT: use your web_search tool to look up the LATEST notification, application window, admit-card, exam-date, answer-key and result announcements for this exam from the official conducting body's website (e.g. ssc.gov.in, upsc.gov.in, ibps.in, rrbcdg.gov.in, the state PSC/board site) and reliable national news. Cite the real URL in "source" for every "official" date and every news item you found.\n\n` : ""}Return 2-5 news items and 5-10 timeline dates as STRICT JSON per the schema in the system prompt.`;

  // The web_search server-side tool lets Claude fetch live pages during
  // generation so news items reference real, recent notifications rather
  // than training-knowledge approximations. Falls back gracefully on
  // older SDK versions or when the tool fails — the underlying call still
  // returns text and our JSON parser handles either path.
  const tools: any[] | undefined = opts.useWebSearch
    ? [{ type: "web_search_20250305", name: "web_search", max_uses: 5 }]
    : undefined;

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userPrompt }],
    ...(tools ? { tools } : {}),
  } as any);

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const parsed = extractJson(text);
  if (!parsed) {
    throw new Error(`exam-info JSON parse failed for ${input.examCode}: ${text.slice(0, 200)}`);
  }

  const news: NewsItem[] = Array.isArray(parsed.news)
    ? parsed.news
        .filter((n: any) => typeof n?.title === "string" && typeof n?.body === "string")
        .map((n: any) => ({
          title: String(n.title).slice(0, 160),
          body: String(n.body).slice(0, 1200),
          daysAgo: clampInt(n.daysAgo, 0, 60),
          source: httpUrl(n.source),
        }))
    : [];

  const todayMs = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const dates: ImportantDate[] = Array.isArray(parsed.dates)
    ? parsed.dates
        .filter((d: any) => typeof d?.label === "string")
        .map((d: any) => {
          const iso = isoDate(d.date);
          // Absolute date wins; the offset is derived from it so the two
          // can never disagree in storage.
          let daysFromNow: number;
          if (iso) {
            daysFromNow = Math.round((Date.parse(iso + "T00:00:00Z") - todayMs) / 86_400_000);
          } else if (Number.isFinite(d.daysFromNow)) {
            daysFromNow = clampInt(d.daysFromNow, -120, 540);
          } else {
            daysFromNow = NaN;
          }
          const source = httpUrl(d.source);
          const kind = normaliseKind(d.kind, String(d.label), Boolean(d.isExamDay));
          // A row can only be official if it can be cited.
          const confidence: "official" | "expected" =
            d.confidence === "official" && source ? "official" : "expected";
          return {
            label: String(d.label).slice(0, 120),
            daysFromNow,
            isExamDay: kind === "EXAM" || Boolean(d.isExamDay),
            notes: typeof d.notes === "string" ? d.notes.slice(0, 600) : null,
            kind,
            date: iso,
            confidence,
            source,
          };
        })
        .filter((d: ImportantDate) => Number.isFinite(d.daysFromNow) && d.daysFromNow >= -400 && d.daysFromNow <= 600)
    : [];

  return {
    news,
    dates,
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

function clampInt(v: any, lo: number, hi: number): number {
  const n = Number.isFinite(v) ? Math.round(Number(v)) : 0;
  return Math.max(lo, Math.min(hi, n));
}

function httpUrl(v: any): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!/^https?:\/\/[^\s]+$/i.test(s) || s.length > 500) return null;
  return s;
}

function isoDate(v: any): string | null {
  if (typeof v !== "string") return null;
  const m = v.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  const t = Date.parse(`${m[1]}-${m[2]}-${m[3]}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/** Accept the model's kind when valid; otherwise infer from the label. */
export function normaliseKind(kind: any, label: string, isExamDay: boolean): DateKind {
  if (typeof kind === "string" && (DATE_KINDS as string[]).includes(kind.toUpperCase())) {
    return kind.toUpperCase() as DateKind;
  }
  return kindFromLabel(label, isExamDay);
}

/** Label-based classification — used for rows written before `kind`
 *  existed and as the fallback when the model returns an unknown kind. */
export function kindFromLabel(label: string, isExamDay = false): DateKind {
  const l = label.toLowerCase();
  if (isExamDay) return "EXAM";
  if (/answer key|response sheet|objection/.test(l)) return "ANSWER_KEY";
  if (/admit card|hall ticket|call letter|e-admit/.test(l)) return "ADMIT_CARD";
  if (/result|merit list|scorecard|score card|final list|selection list|shortlist/.test(l)) return "RESULT";
  if (/interview|document verification|dv\b|pet\b|pst\b|medical|skill test|typing test|cpt\b|dest\b/.test(l)) return "INTERVIEW";
  if (/correction|edit window|modification/.test(l)) return "CORRECTION_WINDOW";
  if (/last date|closes|deadline|ends|end of application|fee payment/.test(l)) return "APPLICATION_END";
  if (/application|registration|apply|portal opens|form/.test(l)) return "APPLICATION_START";
  if (/notification|advertisement|advt|notice/.test(l)) return "NOTIFICATION";
  if (/exam|tier|paper|prelim|mains|phase|stage|cbt|test date|written/.test(l)) return "EXAM";
  return "OTHER";
}

function extractJson(text: string): any | null {
  let body = text.trim();
  if (body.startsWith("```")) {
    body = body.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  try {
    return JSON.parse(body);
  } catch {
    const first = body.indexOf("{");
    const last = body.lastIndexOf("}");
    if (first === -1 || last === -1 || last <= first) return null;
    try {
      return JSON.parse(body.slice(first, last + 1));
    } catch {
      return null;
    }
  }
}
