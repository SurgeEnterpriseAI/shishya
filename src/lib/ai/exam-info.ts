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
//                 QUESTION_PAPER | RESULT | INTERVIEW | OTHER
//                 (QUESTION_PAPER, 13 Sep 2026: the conducting body's own
//                 published paper / booklet for a stage already held —
//                 stored ONLY when cited on the body's own host, so it is
//                 official-tier by construction; never reported/expected —
//                 see enforceQuestionPaperRule)
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
import { recordAiUsage } from "@/lib/ai/usage";
import { isOfficialSource } from "@/lib/official-source";
import { anthropic, MODEL } from "./client";
import { isOwnSiteUrl, webSearchTool } from "./web-search";
import { localResearch, localResearchOn, normUrl, type ResearchResult } from "./local-research";

export interface ExamInfoInput {
  examCode: string;
  examName: string;
  examShortName: string;
  category: string;
  /** The conducting body's portal (ExamEligibility.officialUrl). When
   *  present the prompt pushes the model to cite THIS domain for
   *  official dates — the platform's gold source tier. */
  officialUrl?: string | null;
  officialName?: string | null;
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
  | "QUESTION_PAPER"
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
  "QUESTION_PAPER",
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
   - "official" ONLY when the conducting body has ANNOUNCED this exact date THIS cycle and you can cite a URL in "source". If you cannot cite it, it is NOT official.
   - "expected" for everything else: typical-cycle estimates ("Tier 1 usually runs June–July"), tentative calendar entries, or dates inferred from last year. Use the label to say so ("Tier 1 exam (expected)").
   Never present an estimate as official. Never invent vacancy counts or cut-off marks.
1b. SOURCE QUALITY: for every "official" date, work hardest to cite the CONDUCTING BODY'S OWN website (their notice/PDF/press page — gov.in / nic.in / the official portal given in the input). Search it directly (e.g. site:ssc.gov.in). The platform labels conducting-body citations "OFFICIAL" and everything else (newspapers, testbook/adda247-style coaching portals) merely "reported" — so a coaching-site URL is strictly weaker evidence even for the same fact. Cite a secondary source only when the official page genuinely cannot be found, and prefer national newspapers over coaching portals.
2. Prefer ABSOLUTE dates ("date": "YYYY-MM-DD") whenever you know them (official or expected). If only a rough window is known, still give your best single date and say "(expected)" in the label; put the window in "notes" ("usually mid-June to early July").
3. Give each date a "kind" from exactly this list: NOTIFICATION, APPLICATION_START, APPLICATION_END, CORRECTION_WINDOW, ADMIT_CARD, EXAM, ANSWER_KEY, QUESTION_PAPER, RESULT, INTERVIEW, OTHER. Set "isExamDay": true only on EXAM rows. Multi-stage exams (Tier 1/2, Prelims/Mains) get one EXAM row per stage with the stage in the label.
3b. ANSWER_KEY rows are the strictest of all: emit an ANSWER_KEY row ONLY when the conducting body has actually announced or published the answer key (provisional or final) for that stage and you can cite the URL in "source" with "confidence": "official". NEVER estimate an answer-key date from previous cycles, coaching-site guesses or "usually within a week" patterns — an estimated key date is worse than no row. When no key has been published for a stage, emit NO ANSWER_KEY row for it and instead append the exact line "no key published for this stage" to that EXAM row's "notes".
3c. QUESTION_PAPER rows are equally strict: emit one ONLY when the conducting body has itself published the question paper / booklet for a stage that has ALREADY been held, on its OWN website (e.g. upsc.gov.in "Question Papers", the SSC / state PSC portal). "source" = that exact URL, "confidence": "official", "date" = the day it was published (the exam day when the page carries no date), label "Question paper — {stage}", "isExamDay": false. Never from coaching / news sites, never estimated, never for a stage not yet held. When the body has not published the paper, emit no row — the platform drops any QUESTION_PAPER row not cited on the body's own host.
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
  // usageFeature (7 Oct 2026): the AiUsage label. The refresh cron writes
  // exam-week exams as "exam-info" (must-run) and the rest as
  // "exam-info-other" (can-wait), so the background spend guard
  // (src/lib/ai/spend-guard.ts) can cap the two apart.
  opts: { useWebSearch?: boolean; usageFeature?: string } = {},
): Promise<ExamInfoResult> {
  const today = new Date();
  const todayIso = today.toISOString().slice(0, 10);
  const officialLine = input.officialUrl
    ? `Official portal: ${input.officialUrl}${input.officialName ? ` (${input.officialName})` : ""}\n`
    : "";
  const officialDomain = (() => {
    try {
      return input.officialUrl ? new URL(input.officialUrl).hostname.replace(/^www\./, "") : null;
    } catch {
      return null;
    }
  })();
  const userPrompt = `Generate news + the important-dates timeline for this Indian exam.

Exam code:   ${input.examCode}
Exam name:   ${input.examName}
Short name:  ${input.examShortName}
Category:    ${input.category}
${officialLine}
Today's date: ${todayIso}.

${opts.useWebSearch ? `IMPORTANT: use your web_search tool to look up the LATEST notification, application window, admit-card, exam-date, answer-key and result announcements for this exam. Search the conducting body's OWN site first${officialDomain ? ` (try "site:${officialDomain} ..." queries)` : " (e.g. ssc.gov.in, upsc.gov.in, ibps.in, rrbcdg.gov.in, the state PSC/board site)"} — its URLs are the only ones the platform can label OFFICIAL. Fall back to reliable national news only when the official page can't be found. Cite the real URL in "source" for every "official" date and every news item you found.\n\n` : ""}Return 2-5 news items and 5-10 timeline dates as STRICT JSON per the schema in the system prompt.`;

  // The web_search server-side tool lets Claude fetch live pages during
  // generation so news items reference real, recent notifications rather
  // than training-knowledge approximations. Falls back gracefully on
  // older SDK versions or when the tool fails — the underlying call still
  // returns text and our JSON parser handles either path. 13 Oct 2026: the
  // shared tool (./web-search.ts); our own exam page is never kept as a
  // source for a date we then show as "official" (isOwnSiteUrl below).
  const tools: any[] | undefined = opts.useWebSearch ? [webSearchTool(5)] : undefined;
  const feature = opts.usageFeature ?? "exam-info";

  // 14 Oct 2026 (founder: local server first): with the feature in
  // LOCAL_LLM_RESEARCH_FEATURES, Surge's server researches first. Fail
  // closed: an "official" date survives only when its cited page was opened
  // and the date is printed on it, a news item only when its page was
  // opened. Fewer than 2 dates left, or any error → the Claude call below.
  if (opts.useWebSearch && localResearchOn(feature)) {
    try {
      const r = await localResearch({
        system: SYSTEM.replace(/web_search tool/g, "web_search and fetch_page tools"),
        prompt: `${userPrompt}
Open each notice or page with fetch_page before you cite it: an "official" date must be printed on the page you cite.`,
        allowedDomains: undefined,
        maxSearches: 5,
        maxFetches: 6,
        maxTokens: 3500,
        deadlineMs: 170_000,
        pageChars: 9_000,
        expectJson: true,
      });
      recordAiUsage(feature, { usage: r.usage, model: r.model }, { model: r.model, ref: input.examCode, latencyMs: r.latencyMs });
      const local = parseExamInfoText(r.text, input, today);
      if (local) {
        const checked = checkAgainstPages(local, r);
        // At least 2 page-verified OFFICIAL dates (14 Oct truth-set eval: with
        // "any 2 rows" the local answer was accepted on exams where it had only
        // estimates, and the site showed 42 of 94 true dates against Claude's 54).
        if (checked.dates.filter((d) => d.confidence === "official").length >= 2) {
          return { ...checked, dates: enforceQuestionPaperRule(enforceAnswerKeyRule(checked.dates), input.officialUrl), inputTokens: r.usage.input_tokens, outputTokens: r.usage.output_tokens };
        }
        console.warn(`[exam-info] ${input.examCode}: local kept ${checked.dates.filter((d) => d.confidence === "official").length} official date(s) after the page check → Claude`);
      } else console.warn(`[exam-info] ${input.examCode}: local reply did not parse → Claude`);
    } catch (err) {
      console.warn(`[exam-info] ${input.examCode}: local research failed → Claude: ${String((err as Error)?.message ?? err).slice(0, 160)}`);
    }
  }

  const startedAt = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    // 4500 (13 Oct 2026): NDA's reply hit 3000 mid-JSON in the harness eval, the
    // parse failed and the exam was not refreshed. Billed only when used.
    max_tokens: 4500,
    // No cache_control (13 Oct 2026). Any cache marker makes the API add its
    // own breakpoint after the web_search results. This call sends all its
    // searches in one go, so the loop runs twice and the second pass writes
    // the whole prefix, search results included (~33k tokens), to the cache
    // at 1.25x the input price — and nothing ever reads it back. Without a
    // marker those tokens bill once at the plain price; the ~3k system prefix
    // the cache used to save is re-billed instead. About $0.009 a call
    // cheaper on 96 calls of AiUsage (-$0.12 to -0.16/day). Caching never
    // changes what the model reads, so the reply is the same.
    system: SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
    ...(tools ? { tools } : {}),
  } as any);
  recordAiUsage(feature, response, { model: MODEL, ref: input.examCode, latencyMs: Date.now() - startedAt });

  const text = response.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();

  const parsedInfo = parseExamInfoText(text, input, today);
  if (!parsedInfo) {
    throw new Error(`exam-info JSON parse failed for ${input.examCode}: ${text.slice(0, 200)}`);
  }
  const { news, dates } = parsedInfo;

  return {
    news,
    dates: enforceQuestionPaperRule(enforceAnswerKeyRule(dates), input.officialUrl),
    inputTokens: response.usage.input_tokens,
    outputTokens: response.usage.output_tokens,
  };
}

/** News + dates from a model reply (Claude's or Surge's server's); null when it holds no JSON. */
function parseExamInfoText(text: string, input: ExamInfoInput, today: Date): { news: NewsItem[]; dates: ImportantDate[] } | null {
  const parsed = extractJson(text);
  if (!parsed) return null;

  // Our own page is never a source (13 Oct 2026): a news item that cites
  // shishya.in is our earlier generation coming back, so it is dropped; a
  // date citing it loses the source and so can only be "expected" (below).
  // Free, and it also catches a URL the model writes from memory, which no
  // search filter can stop (blocked_domains is off: ./web-search.ts).
  const news: NewsItem[] = Array.isArray(parsed.news)
    ? parsed.news
        .filter((n: any) => typeof n?.title === "string" && typeof n?.body === "string" && !isOwnSiteUrl(httpUrl(n.source)))
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
          const cited = httpUrl(d.source);
          const source = isOwnSiteUrl(cited) ? null : cited;
          const kind = normaliseKind(d.kind, String(d.label), Boolean(d.isExamDay));
          // A row can only be official if it can be cited AND carries an
          // absolute calendar date — an "official" offset would be stored
          // as now+N (drifting each refresh) and re-alerted as new.
          const confidence: "official" | "expected" =
            d.confidence === "official" && source && iso ? "official" : "expected";
          return {
            label: String(d.label).slice(0, 120),
            daysFromNow,
            // Only EXAM rows are exam days (normaliseKind already folds a
            // true isExamDay into EXAM when the kind was missing/unknown).
            isExamDay: kind === "EXAM",
            notes: typeof d.notes === "string" ? d.notes.slice(0, 600) : null,
            kind,
            date: iso,
            confidence,
            source,
          };
        })
        .filter((d: ImportantDate) => Number.isFinite(d.daysFromNow) && d.daysFromNow >= -400 && d.daysFromNow <= 600)
    : [];
  return { news, dates };
}

/** Day / month forms a page prints a date in: 12-10-2026, 12.10.2026, 12/10/2026, 2026-10-12, 12 October 2026, October 12, 2026, 12th Oct 2026… */
export function dateOnPage(iso: string, page: string): boolean {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return false;
  const months = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const mon = months[m - 1];
  const dd = String(d).padStart(2, "0");
  const mm = String(m).padStart(2, "0");
  const text = page.toLowerCase().replace(/\s+/g, " ");
  const numeric = new RegExp(`(^|[^0-9])0?${d}[-./ ]0?${m}[-./ ](${y}|${String(y).slice(2)})([^0-9]|$)`);
  if (numeric.test(text) || text.includes(`${y}-${mm}-${dd}`)) return true;
  const word = `(${mon}|${mon.slice(0, 3)}\\.?|${mon.slice(0, 4)}\\.?)`;
  const dayWord = `0?${d}(st|nd|rd|th)?`;
  return new RegExp(`(^|[^0-9])${dayWord}[ ,-]*(of )?${word}[ ,-]*${y}`).test(text) || new RegExp(`${word}[ ,-]*${dayWord}[ ,-]+${y}`).test(text);
}

/**
 * The page check on Surge's server's reply (fail closed): an "official" date
 * stays only when its cited page was opened and prints the date; a news item
 * only when its page was opened. "expected" rows without a source stay
 * (typical-cycle estimates, shown as such), as on the Claude path.
 */
export function checkAgainstPages(
  info: { news: NewsItem[]; dates: ImportantDate[] },
  r: Pick<ResearchResult, "opened" | "pages">,
): { news: NewsItem[]; dates: ImportantDate[] } {
  const pageOf = (u: string | null | undefined) => (u ? r.pages.get(normUrl(u)) : undefined);
  const dates = info.dates.filter((d) => {
    if (d.confidence !== "official") return !d.source || !!pageOf(d.source);
    const page = pageOf(d.source);
    return !!page && !!d.date && dateOnPage(d.date, page);
  });
  const news = info.news.filter((n) => !n.source || r.opened.has(normUrl(n.source)));
  return { news, dates };
}

/**
 * Rule 3c, enforced in code (13 Sep 2026, exam-week machine): a
 * QUESTION_PAPER row survives ONLY when it is "official" AND its cited
 * URL sits on the conducting body's own host (src/lib/official-source.ts:
 * the regulated gov.in / nic.in / ac.in families, the known commercial-TLD
 * bodies, or the exam's own portal `officialUrl`). Everything else —
 * coaching-site paper PDFs, news reports, estimates — is dropped, so a
 * stored paper row is official-tier by construction and the tracker can
 * label it "Question paper (official)" without a second check. Kept rows
 * are never exam days and always say "question paper" in the label.
 */
export function enforceQuestionPaperRule(dates: ImportantDate[], officialUrl?: string | null): ImportantDate[] {
  const out: ImportantDate[] = [];
  for (const d of dates) {
    if (d.kind !== "QUESTION_PAPER") {
      out.push(d);
      continue;
    }
    if (d.confidence !== "official" || !d.source || !isOfficialSource(d.source, officialUrl)) continue;
    const label = /question paper/i.test(d.label) ? d.label : `Question paper — ${d.label}`;
    out.push({ ...d, isExamDay: false, label: label.slice(0, 120) });
  }
  return out;
}

/** The notes line an EXAM row carries when no answer key has been
 *  published for that stage (rule 3b). Exported so the tracker / exam-week
 *  surfaces can recognise it. */
export const NO_KEY_PUBLISHED_NOTE = "no key published for this stage";

// An EXAM row this far in the past normally HAS a published key the model
// merely failed to cite; stamping "no key published" on it would be a
// false statement, so the note is only added to recent / upcoming stages.
const NO_KEY_NOTE_MAX_DAYS_AGO = 45;

/**
 * Rule 3b, enforced in code so the tracker can never carry an estimated
 * answer-key date even if the model disobeys (6 Sep 2026, Exam Week Mode):
 *   • ANSWER_KEY rows survive only when "official" (which the parser above
 *     already ties to a citable URL + absolute date); every "expected"
 *     ANSWER_KEY row is dropped — the tracker prints "not announced yet".
 *   • Each recent / upcoming EXAM stage with no surviving key row between
 *     it and the next stage gets the "no key published for this stage"
 *     notes line (once).
 */
export function enforceAnswerKeyRule(dates: ImportantDate[]): ImportantDate[] {
  const kept = dates.filter((d) => d.kind !== "ANSWER_KEY" || (d.confidence === "official" && !!d.source));
  const keyOffsets = kept.filter((d) => d.kind === "ANSWER_KEY").map((d) => d.daysFromNow);
  const stages = kept.filter((d) => d.kind === "EXAM").sort((a, b) => a.daysFromNow - b.daysFromNow);
  for (let i = 0; i < stages.length; i++) {
    const stage = stages[i];
    if (stage.daysFromNow < -NO_KEY_NOTE_MAX_DAYS_AGO) continue;
    const next = stages[i + 1];
    const hasKey = keyOffsets.some((k) => k >= stage.daysFromNow && (!next || k < next.daysFromNow));
    if (hasKey) continue;
    const notes = (stage.notes ?? "").trim();
    if (notes.toLowerCase().includes(NO_KEY_PUBLISHED_NOTE)) continue;
    stage.notes = (notes ? `${notes} · ${NO_KEY_PUBLISHED_NOTE}` : NO_KEY_PUBLISHED_NOTE).slice(0, 600);
  }
  return kept;
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
  const s = `${m[1]}-${m[2]}-${m[3]}`;
  const t = Date.parse(`${s}T00:00:00Z`);
  if (!Number.isFinite(t)) return null;
  // Reject impossible dates (2026-02-30) instead of letting JS roll them over.
  if (new Date(t).toISOString().slice(0, 10) !== s) return null;
  return s;
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
  // Before the EXAM line below: "Question paper — Tier 1" contains "paper"
  // and "tier" and would otherwise become an exam day (13 Sep 2026).
  if (/question paper|question booklet|test booklet/.test(l)) return "QUESTION_PAPER";
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
