// Truth-lint — the honesty rules as pure, testable checks over the text
// that actually leaves the server (13 Sep 2026).
//
// Why: the 11 Sep 2026 audit found five honesty debts LIVE on prod — an
// unbacked "verified by students" line, a passed estimate rendered
// "Done", a hub title leading with an expected date, an expected
// answer-key date on a page, and a score page that printed a marking
// scheme next to its own refusal. All five were found by hand. This file
// makes each of them a machine check so they cannot return silently:
//   * scripts/truth-lint.ts (CLI) and /api/cron/truth-lint (nightly) run
//     the fetch-based checks over prod / a local server;
//   * tests/unit/truth-lint.test.ts runs the phrase check over the source
//     tree in CI (string literals + JSX text only, never comments).
//
// Rules of this file: NO imports (vitest, tsx and the cron route all load
// it as-is; it must never pull prisma or the i18n dictionary into a
// script). Every check is a pure function over strings + `now`; the only
// I/O is `runTruthLint`, which takes fetch as a parameter.
//
// The wire grammars the parsers rely on (verified against prod on 13 Sep
// 2026 — if a surface changes its markup the parser must emit a "parse"
// warning, never a silent pass):
//   context.md key-dates line (src/app/exams/[code]/context.md/route.ts):
//     "- YYYY-MM-DD — {label}[ (exam day)] — OFFICIAL, notice: …"
//     "- YYYY-MM-DD — {label} — REPORTED (announced; via host): …"
//     "- YYYY-MM-DD — {label} — expected[ — was expected — not confirmed][ — in N days| — today]"
//   hub <title> (src/app/exams/[code]/page.tsx generateMetadata):
//     "… — Exam Date 25 Sept 2026, …" | "… — Exam Date 3 May 2026 (reported), …" |
//     "… — Exam Date Not Announced Yet, …"   (hi: "परीक्षा तिथि …", te: "పరీక్ష తేదీ …")
//   updates table row (src/app/exams/[code]/updates/page.tsx):
//     <td>label…</td><td><span class="font-medium">Fri, 25 Sept, 2026</span>
//       <span class="ml-2"><span class="… bg-amber-100 …">Expected</span></span></td>
//     <td …>Done | was expected — not confirmed | in 7 days | Today</td>
//     tier is classified by CSS class (emerald = official, sky = reported,
//     amber = expected) so the hi/te twins parse identically.
//   hub Important Dates <li>: <p class="text-sm font-medium text-ink-900">label</p>
//     … <p class="mt-1 text-xs text-ink-500">Fri, 25 Sept, 2026</p>  (no tier!)
//   score-estimate: "Marking: +2 per correct, …" (ew.score.marking) versus the
//     refusal sentences of src/lib/marking-scheme.ts / ew.score.mixed.title.

// ── Types ────────────────────────────────────────────────────────────────

export type CheckId =
  | "phrase"
  | "stale-count"
  | "language-count"
  | "passed-expected"
  | "title-date"
  | "answer-key"
  | "score-scheme"
  | "faq-cutoff"
  | "fetch"
  | "parse";

export type Severity = "fail" | "warn";

export interface Finding {
  check: CheckId;
  severity: Severity;
  /** Absolute URL (or a file path for the static scan). */
  url: string;
  detail: string;
  /** ≤ 120 chars of the offending text. */
  snippet?: string;
  line?: number;
}

export type Tier = "official" | "reported" | "expected";

export interface ContextRow {
  day: string; // YYYY-MM-DD
  label: string;
  examDay: boolean;
  tier: Tier;
  /** "was expected — not confirmed" — the estimate passed, nothing announced. */
  passed: boolean;
  line: number;
  raw: string;
}

export interface ContextScheme {
  /** "Marks per question: N" → N; "not stated" → null. */
  marksPerQ: number | null;
  /** "Marks per question: not stated" present. */
  notStated: boolean;
  /** "- Marking scheme: not stated — …" (pattern block reason). */
  hasReason: boolean;
  /** "- Score estimator (marking-scheme arithmetic …" (exam-week block). */
  hasEstimatorLine: boolean;
  /** "- Marking scheme for this sitting: not stated — …" (exam-week block). */
  hasSittingNotStated: boolean;
}

export interface TitleParse {
  kind: "date" | "not-announced" | "unknown";
  /** YYYY-MM-DD when kind === "date". */
  date?: string;
  /** Tier word printed with the date (null = bare). */
  tier?: Tier | null;
  raw: string;
}

export interface UpdatesRow {
  label: string;
  dateText: string;
  /** YYYY-MM-DD, or null when the printed date did not parse. */
  date: string | null;
  tier: Tier | null;
  status: string;
}

export interface HubDateItem {
  label: string;
  dateText: string;
  date: string | null;
}

// ── Forbidden phrases (check a) ──────────────────────────────────────────

/** Every entry is matched case-insensitively as a plain substring. The
 *  list is the 11 Sep 2026 audit's exact findings plus the stale counts
 *  it removed; never add a phrase that has a legitimate use on a page. */
export const FORBIDDEN_PHRASES: readonly string[] = [
  "verified by students",
  "cleared the same",
  "expert-curated",
  "community-verified",
  "student-verified",
  "real questions from",
  "real pyq",
  "163 exams",
  "177 exams",
  "12 languages",
  "19 indian languages",
  "22 indian languages",
  "fresh set weekly",
];

export interface PhraseOptions {
  /** Return true to ignore a hit (the static scan's allowlist). */
  allow?: (phrase: string, lineText: string, line: number) => boolean;
  /** Override the phrase list (tests). */
  phrases?: readonly string[];
}

/** Every forbidden phrase in `text`, one finding per phrase (first line +
 *  hit count). Case-insensitive; the whole text counts — a claim hidden
 *  in an RSC payload or a JSON-LD block is still a claim to a crawler. */
export function findForbiddenPhrases(text: string, url: string, opts: PhraseOptions = {}): Finding[] {
  const phrases = opts.phrases ?? FORBIDDEN_PHRASES;
  const lines = text.split(/\r?\n/);
  const out: Finding[] = [];
  for (const phrase of phrases) {
    const needle = phrase.toLowerCase();
    let count = 0;
    let first: { line: number; snippet: string } | null = null;
    for (let i = 0; i < lines.length; i++) {
      const lower = lines[i].toLowerCase();
      let at = lower.indexOf(needle);
      while (at >= 0) {
        if (!opts.allow || !opts.allow(phrase, lines[i], i + 1)) {
          count++;
          if (!first) first = { line: i + 1, snippet: snippetAround(lines[i], at, needle.length) };
        }
        at = lower.indexOf(needle, at + needle.length);
      }
    }
    if (first) {
      out.push({
        check: "phrase",
        severity: "fail",
        url,
        line: first.line,
        detail: `forbidden phrase "${phrase}" (${count} hit${count === 1 ? "" : "s"})`,
        snippet: first.snippet,
      });
    }
  }
  return out;
}

function snippetAround(line: string, at: number, len: number, width = 80): string {
  const start = Math.max(0, at - Math.floor((width - len) / 2));
  const s = line.slice(start, start + Math.max(width, len)).trim();
  return (start > 0 ? "…" : "") + s + (start + width < line.length ? "…" : "");
}

/** "N exams" / "N Indian government & entrance exams" with a three-digit N
 *  that is not the live active count. "170+"-style counts are skipped (the
 *  homepage and llms.txt legitimately say 170+). Warn only — the live
 *  count changes with every exam activation. */
export function findStaleExamCount(text: string, url: string, liveCount: number): Finding[] {
  const re = /\b(\d{3})(\+?)\s+(?:Indian\s+)?(?:(?:government|govt)(?:\s+(?:&|&amp;|and)\s+entrance)?\s+|entrance\s+)?exams\b/gi;
  const seen = new Set<number>();
  const out: Finding[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m[2] === "+") continue;
    const n = Number(m[1]);
    if (n === liveCount || seen.has(n)) continue;
    seen.add(n);
    out.push({
      check: "stale-count",
      severity: "warn",
      url,
      line: lineOfIndex(text, m.index),
      detail: `says "${m[0]}" but the live active count is ${liveCount}`,
      snippet: text.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40).replace(/\s+/g, " ").trim(),
    });
  }
  return out;
}

export interface LanguageClaim {
  /** "indian" = "N Indian languages"; "other" = "N other Indian languages" / "Hindi + N languages". */
  form: "indian" | "other";
  n: number;
  line: number;
  snippet: string;
}

/** Shishya's own language-count claims. Bare "N languages" is NOT
 *  collected — "NEET is held in 13 languages" is an exam fact, not a
 *  platform claim. */
export function findLanguageCountClaims(text: string): LanguageClaim[] {
  const out: LanguageClaim[] = [];
  const push = (form: LanguageClaim["form"], n: number, index: number, matched: string) => {
    out.push({
      form,
      n,
      line: lineOfIndex(text, index),
      snippet: text.slice(Math.max(0, index - 30), index + matched.length + 30).replace(/\s+/g, " ").trim(),
    });
  };
  let m: RegExpExecArray | null;
  const other = /\b(\d{1,2})\s+other\s+Indian\s+languages\b/gi;
  while ((m = other.exec(text))) push("other", Number(m[1]), m.index, m[0]);
  const indian = /(?<!other\s)\b(\d{1,2})\s+Indian\s+languages\b/gi;
  while ((m = indian.exec(text))) push("indian", Number(m[1]), m.index, m[0]);
  const plus = /(?:Hindi|हिंदी|हिन्दी|తెలుగు|Telugu)\s*\+\s*(\d{1,2})\s+(?:other\s+)?(?:Indian\s+)?languages\b/gi;
  while ((m = plus.exec(text))) push("other", Number(m[1]), m.index, m[0]);
  return out;
}

export interface LanguageCounts {
  indian: number;
  other: number;
}

/** Fail on any Shishya language-count claim that disagrees with the live
 *  constants (src/lib/languages.ts). */
export function checkLanguageCounts(text: string, url: string, counts: LanguageCounts): Finding[] {
  const out: Finding[] = [];
  const seen = new Set<string>();
  for (const c of findLanguageCountClaims(text)) {
    const want = c.form === "indian" ? counts.indian : counts.other;
    if (c.n === want) continue;
    const key = `${c.form}:${c.n}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      check: "language-count",
      severity: "fail",
      url,
      line: c.line,
      detail: `says ${c.n} ${c.form === "indian" ? "Indian" : "other Indian"} languages; live count is ${want}`,
      snippet: c.snippet,
    });
  }
  return out;
}

function lineOfIndex(text: string, index: number): number {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

// ── HTML helpers ─────────────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    const named = NAMED_ENTITIES[body.toLowerCase()];
    return named ?? whole;
  });
}

/** Visible text of an HTML fragment: tags out, entities decoded, whitespace collapsed. */
export function textOf(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** The <title> text of a page, decoded; null when absent. */
export function parseTitle(html: string): string | null {
  const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  return m ? textOf(m[1]) : null;
}

/** Every application/ld+json block parsed; unparsable blocks become a warn. */
export function extractJsonLd(html: string, url: string): { blocks: unknown[]; findings: Finding[] } {
  const blocks: unknown[] = [];
  const findings: Finding[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1]));
    } catch {
      findings.push({
        check: "parse",
        severity: "warn",
        url,
        line: lineOfIndex(html, m.index),
        detail: "JSON-LD block does not parse",
        snippet: m[1].slice(0, 100).replace(/\s+/g, " "),
      });
    }
  }
  return { blocks, findings };
}

// ── Dates ────────────────────────────────────────────────────────────────

const EN_MONTHS: Record<string, number> = {
  jan: 1, january: 1,
  feb: 2, february: 2,
  mar: 3, march: 3,
  apr: 4, april: 4,
  may: 5,
  jun: 6, june: 6,
  jul: 7, july: 7,
  aug: 8, august: 8,
  sep: 9, sept: 9, september: 9,
  oct: 10, october: 10,
  nov: 11, november: 11,
  dec: 12, december: 12,
};

let monthMap: Map<string, number> | null = null;

/** Month name → 1..12 for the three UI locales. English is hard-coded
 *  (ICU prints "Sept" on Node ≥ 20 and "Sep" before that — both live on
 *  the wire depending on which runtime rendered the page); hi-IN / te-IN
 *  names come from this runtime's Intl, with the abbreviation mark "॰"
 *  and trailing dots stripped on both sides of the comparison. */
function months(): Map<string, number> {
  if (monthMap) return monthMap;
  const map = new Map<string, number>();
  for (const [k, v] of Object.entries(EN_MONTHS)) map.set(k, v);
  for (const tag of ["hi-IN", "te-IN"]) {
    for (const style of ["short", "long"] as const) {
      for (let m = 0; m < 12; m++) {
        try {
          const name = new Date(Date.UTC(2026, m, 15)).toLocaleDateString(tag, { month: style, timeZone: "UTC" });
          map.set(normMonth(name), m + 1);
        } catch {
          /* ICU without that locale — the English map still works */
        }
      }
    }
  }
  monthMap = map;
  return map;
}

function normMonth(s: string): string {
  return s.replace(/[.॰,]/g, "").trim().toLowerCase();
}

/** "25 Sept 2026" · "Fri, 25 Sept, 2026" · "3 May 2026" · "25 सित॰ 2026" ·
 *  "25 సెప్టెం 2026" → "2026-09-25"; null when no month is recognised. */
export function parseLooseDate(s: string): string | null {
  const m = /(\d{1,2})\s+([^\s\d,()]+?)[.,]?\s+(\d{4})\b/u.exec(s);
  if (!m) return null;
  const mon = months().get(normMonth(m[2]));
  if (!mon) return null;
  const d = Number(m[1]);
  if (d < 1 || d > 31) return null;
  return `${m[3]}-${String(mon).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** YYYY-MM-DD of an instant in IST (UTC+5:30). */
export function istDayOf(d: Date): string {
  return new Date(d.getTime() + 330 * 60_000).toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
  const t = Date.parse(day + "T00:00:00Z");
  return new Date(t + n * 86_400_000).toISOString().slice(0, 10);
}

const TIER_WORDS: Record<string, Tier> = {
  official: "official",
  आधिकारिक: "official",
  అధికారిక: "official",
  reported: "reported",
  रिपोर्टेड: "reported",
  నివేదిత: "reported",
  expected: "expected",
  अनुमानित: "expected",
  అంచనా: "expected",
};

function tierFromWord(w: string | undefined | null): Tier | null {
  if (!w) return null;
  return TIER_WORDS[w.trim().toLowerCase()] ?? null;
}

// ── context.md parsers ───────────────────────────────────────────────────

const CONTEXT_ROW_RE = /^- (\d{4}-\d{2}-\d{2}) — (.+?) — (OFFICIAL|REPORTED|expected)(?=[,\s]|$)(.*)$/;

export function parseContextTimeline(md: string): ContextRow[] {
  const out: ContextRow[] = [];
  const lines = md.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const m = CONTEXT_ROW_RE.exec(lines[i]);
    if (!m) continue;
    const label = m[2].trim();
    out.push({
      day: m[1],
      label: label.replace(/\s*\(exam day\)$/, ""),
      examDay: /\(exam day\)$/.test(label),
      tier: m[3].toLowerCase() as Tier,
      passed: m[4].includes("was expected — not confirmed"),
      line: i + 1,
      raw: lines[i],
    });
  }
  return out;
}

export function parseContextScheme(md: string): ContextScheme {
  const mpq = /Marks per question: (\d+(?:\.\d+)?|not stated)/.exec(md);
  return {
    marksPerQ: mpq && mpq[1] !== "not stated" ? Number(mpq[1]) : null,
    notStated: !!mpq && mpq[1] === "not stated",
    hasReason: /^- Marking scheme: not stated/m.test(md),
    hasEstimatorLine: /^- Score estimator \(marking-scheme arithmetic/m.test(md),
    hasSittingNotStated: /^- Marking scheme for this sitting: not stated/m.test(md),
  };
}

// ── Page parsers ─────────────────────────────────────────────────────────

/** Hub <title> → the exam-date claim it makes. */
export function parseHubTitle(title: string): TitleParse {
  const en = /Exam Date (Not Announced Yet|[^,|]+?),/i.exec(title);
  const hi = /परीक्षा तिथि ([^,|]+?),/.exec(title);
  const te = /పరీక్ష తేదీ ([^,|]+?),/.exec(title);
  const m = en ?? hi ?? te;
  if (!m) return { kind: "unknown", raw: title };
  const body = m[1].trim();
  if (/not announced yet|अभी घोषित नहीं|ఇంకా ప్రకటించలేదు/i.test(body)) return { kind: "not-announced", raw: title };
  const date = parseLooseDate(body);
  if (!date) return { kind: "unknown", raw: title };
  const tw = /\(([^)]+)\)/.exec(body);
  return { kind: "date", date, tier: tierFromWord(tw?.[1]) ?? null, raw: title };
}

/** Updates <title> → the exam-day claim it makes (null = no date lead). */
export function parseUpdatesTitle(title: string): TitleParse | null {
  const m = /(?:Exam day|परीक्षा का दिन|పరీక్ష రోజు)\s+(\d{1,2}\s+\S+\s+\d{4})(?:\s+\(([^)]+)\))?/.exec(title);
  if (!m) return null;
  const date = parseLooseDate(m[1]);
  if (!date) return { kind: "unknown", raw: title };
  return { kind: "date", date, tier: tierFromWord(m[2]) ?? null, raw: title };
}

function tierFromClass(html: string): Tier | null {
  if (/bg-emerald-100/.test(html)) return "official";
  if (/bg-sky-100/.test(html)) return "reported";
  if (/bg-amber-100/.test(html)) return "expected";
  return null;
}

function labelText(cellHtml: string): string {
  return textOf(
    cellHtml
      .replace(/<span[^>]*aria-hidden[^>]*>[\s\S]*?<\/span>/g, " ")
      .replace(/<p[^>]*>[\s\S]*?<\/p>/g, " ")
      .replace(/<a[^>]*>[\s\S]*?<\/a>/g, " "),
  );
}

/** The tracker's full-timeline table rows + its key-date cards. */
export function parseUpdatesRows(html: string): { rows: UpdatesRow[]; cards: UpdatesRow[]; hasTable: boolean } {
  const rows: UpdatesRow[] = [];
  const tbody = /<tbody[^>]*>([\s\S]*?)<\/tbody>/i.exec(html);
  if (tbody) {
    const trs = tbody[1].split(/<tr\b/).slice(1);
    for (const tr of trs) {
      const cells = [...tr.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]);
      if (cells.length < 3) continue;
      const dateSpan = /<span class="font-medium">([\s\S]*?)<\/span>/.exec(cells[1]);
      const dateText = textOf(dateSpan ? dateSpan[1] : cells[1]);
      rows.push({
        label: labelText(cells[0]),
        dateText,
        date: parseLooseDate(dateText),
        tier: tierFromClass(cells[1]),
        status: textOf(cells[2]),
      });
    }
  }
  const cards: UpdatesRow[] = [];
  const cardRe = /<div class="rounded-xl border p-3[^"]*"[^>]*>([\s\S]*?)<\/div>/g;
  let m: RegExpExecArray | null;
  while ((m = cardRe.exec(html))) {
    const body = m[1];
    const ps = [...body.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)].map((p) => p[1]);
    if (ps.length < 3) continue;
    const st = /bg-(?:emerald|sky|amber)-100[^>]*>[^<]*<\/span>\s*<span>([^<]*)<\/span>/.exec(body);
    const dateText = textOf(ps[1]);
    cards.push({
      label: labelText(ps[0]),
      dateText,
      date: parseLooseDate(dateText),
      tier: tierFromClass(body),
      status: st ? textOf(st[1]) : "",
    });
  }
  return { rows, cards, hasTable: !!tbody };
}

/** The hub's Important Dates column — label + printed date, NO tier. */
export function parseHubDates(html: string): HubDateItem[] {
  const out: HubDateItem[] = [];
  const re = /<li[^>]*class="rounded-md border[^"]*"[^>]*>([\s\S]*?)<\/li>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const label = /<p class="text-sm font-medium text-ink-900">([\s\S]*?)<\/p>/.exec(m[1]);
    const date = /<p class="mt-1 text-xs text-ink-500">([\s\S]*?)<\/p>/.exec(m[1]);
    if (!label || !date) continue;
    const dateText = textOf(date[1]);
    const parsed = parseLooseDate(dateText);
    if (!parsed) continue;
    out.push({ label: labelText(label[1]), dateText, date: parsed });
  }
  return out;
}

// ── Checks (b)–(f) ───────────────────────────────────────────────────────

/** Exact status texts that assert a milestone happened. Row-scoped only:
 *  never grep a whole page for these — llms.txt legitimately says
 *  "just-concluded". */
export const DONE_WORDS: readonly string[] = ["Done", "Concluded", "हो चुका", "పూర్తయింది"];

/** (b) an expected-tier row must never read "Done". */
export function checkPassedExpected(rows: UpdatesRow[], url: string, where = "row"): Finding[] {
  const out: Finding[] = [];
  for (const r of rows) {
    if (r.tier !== "expected") continue;
    if (!DONE_WORDS.includes(r.status.trim())) continue;
    out.push({
      check: "passed-expected",
      severity: "fail",
      url,
      detail: `${where} "${r.label}" (${r.dateText}) has an Expected badge but reads "${r.status}"`,
    });
  }
  return out;
}

export interface TitleDateInput {
  title: TitleParse;
  contextRows: ContextRow[];
  todayIst: string;
  url: string;
  page: "hub" | "updates";
}

/** (c) the title's exam date must be an announced exam-day row of the same
 *  exam (context.md is the machine-readable twin of the same DB rows);
 *  "Not Announced" must be true; a bare date must be official. */
export function checkTitleDate(input: TitleDateInput): Finding[] {
  const { title, contextRows, todayIst, url, page } = input;
  const out: Finding[] = [];
  const examRows = contextRows.filter((r) => r.examDay);
  const announcedFuture = examRows.filter((r) => r.tier !== "expected" && r.day >= todayIst);
  if (title.kind === "unknown") {
    out.push({ check: "parse", severity: "warn", url, detail: `${page} title did not match the date grammar`, snippet: title.raw });
    return out;
  }
  if (title.kind === "not-announced") {
    if (announcedFuture.length) {
      out.push({
        check: "title-date",
        severity: "fail",
        url,
        detail: `title says Not Announced but context.md lists an announced exam day ${announcedFuture[0].day} (${announcedFuture[0].tier}: "${announcedFuture[0].label}")`,
        snippet: title.raw,
      });
    }
    return out;
  }
  const date = title.date!;
  const sameDay = examRows.filter((r) => r.day === date);
  const announcedSameDay = sameDay.filter((r) => r.tier !== "expected");
  if (page === "updates" && title.tier === "expected") {
    // The tracker title may lead with an estimate as long as it says so.
    if (!sameDay.length) {
      out.push({ check: "title-date", severity: "warn", url, detail: `title leads with expected exam day ${date} but context.md has no exam-day row that day (cache skew?)`, snippet: title.raw });
    } else if (announcedSameDay.length) {
      out.push({ check: "title-date", severity: "fail", url, detail: `title calls ${date} expected but context.md has it ${announcedSameDay[0].tier}`, snippet: title.raw });
    }
    return out;
  }
  if (!announcedSameDay.length) {
    if (date > addDays(todayIst, 365)) {
      out.push({ check: "title-date", severity: "warn", url, detail: `title date ${date} is outside context.md's +365-day window — unverifiable`, snippet: title.raw });
    } else if (sameDay.length) {
      out.push({
        check: "title-date",
        severity: "fail",
        url,
        detail: `title leads with ${date} as announced but context.md has that exam day as EXPECTED ("${sameDay[0].label}")`,
        snippet: title.raw,
      });
    } else if (date < todayIst) {
      out.push({ check: "title-date", severity: "fail", url, detail: `title leads with a past exam date ${date} (today ${todayIst})`, snippet: title.raw });
    } else {
      const alt = announcedFuture.map((r) => `${r.day} (${r.tier})`).join(", ") || "none";
      out.push({
        check: "title-date",
        severity: "fail",
        url,
        detail: `title date ${date} is not an announced exam-day row in context.md (announced rows: ${alt})`,
        snippet: title.raw,
      });
    }
    return out;
  }
  // Tier word: bare → official; "(reported)" → reported.
  const rowTier = announcedSameDay.some((r) => r.tier === "official") ? "official" : "reported";
  const claimed = title.tier ?? "official";
  if (claimed !== rowTier) {
    out.push({
      check: "title-date",
      severity: "fail",
      url,
      detail: `title prints ${date} ${title.tier ? `(${title.tier})` : "bare (= official)"} but context.md has it ${rowTier}`,
      snippet: title.raw,
    });
  }
  return out;
}

export const ANSWER_KEY_RE = /answer[\s-]*key|उत्तर[\s-]*कुंजी|आंसर[\s-]*की|ఆన్సర్[\s-]*కీ/i;

export interface AnswerKeyInput {
  url: string;
  contextRows: ContextRow[];
  updatesRows: UpdatesRow[];
  updatesCards: UpdatesRow[];
  hubDates: HubDateItem[];
  /** Every fetched text of the exam, for the "Answer key: … (expected)" wire forms. */
  texts: { url: string; text: string }[];
  todayIst: string;
  updatesUrl?: string;
  hubUrl?: string;
}

/** (d) an expected-tier ANSWER_KEY row must never render anywhere. */
export function checkAnswerKey(input: AnswerKeyInput): Finding[] {
  const out: Finding[] = [];
  for (const r of input.contextRows) {
    if (r.tier === "expected" && ANSWER_KEY_RE.test(r.label)) {
      out.push({ check: "answer-key", severity: "fail", url: input.url, line: r.line, detail: `context.md lists an expected answer key "${r.label}" on ${r.day}`, snippet: r.raw });
    }
  }
  const updatesUrl = input.updatesUrl ?? input.url;
  for (const r of input.updatesRows) {
    if (r.tier === "expected" && ANSWER_KEY_RE.test(r.label)) {
      out.push({ check: "answer-key", severity: "fail", url: updatesUrl, detail: `tracker row "${r.label}" (${r.dateText}) is an answer key with an Expected badge` });
    }
  }
  for (const r of input.updatesCards) {
    if (r.tier === "expected" && ANSWER_KEY_RE.test(r.label)) {
      out.push({ check: "answer-key", severity: "fail", url: updatesUrl, detail: `key-date card "${r.label}" (${r.dateText}) shows an expected answer key` });
    }
  }
  // Wire forms: ExamWeekBlock "Answer key: 17 Sept (expected)" (en/hi/te) and
  // the AEO line "- Answer key: {label} — YYYY-MM-DD (expected — …".
  const wire = [
    // The span stops at "·" / "|" so a later row's tier ("Answer key: not
    // announced yet · Result: 15 Oct (expected)") is never read as the key's.
    /(?:Answer key|आंसर की|ఆన్సర్ కీ): [^\n<"·|]{0,60}?\((?:expected|अनुमानित|అంచనా)\)/,
    /- Answer key: [^\n]* — \d{4}-\d{2}-\d{2} \(expected/,
  ];
  for (const t of input.texts) {
    for (const re of wire) {
      const m = re.exec(t.text);
      if (m) {
        out.push({ check: "answer-key", severity: "fail", url: t.url, line: lineOfIndex(t.text, m.index), detail: "answer key printed with an expected date", snippet: m[0].slice(0, 120) });
        break;
      }
    }
  }
  // Hub Important Dates column carries no tier — cross-check with context.md.
  const hubUrl = input.hubUrl ?? input.url;
  const from = addDays(input.todayIst, -120);
  const to = addDays(input.todayIst, 365);
  for (const d of input.hubDates) {
    if (!ANSWER_KEY_RE.test(d.label)) continue;
    if (/\((?:expected|अनुमानित|అంచనా)\)/i.test(d.label)) {
      out.push({ check: "answer-key", severity: "fail", url: hubUrl, detail: `hub Important Dates shows "${d.label}" (${d.dateText})` });
      continue;
    }
    if (!d.date || d.date < from || d.date > to) {
      out.push({ check: "answer-key", severity: "warn", url: hubUrl, detail: `hub answer-key row "${d.label}" (${d.dateText}) is outside context.md's window — tier unverifiable` });
      continue;
    }
    const backed = input.contextRows.some((r) => r.day === d.date && r.tier !== "expected" && ANSWER_KEY_RE.test(r.label));
    if (!backed) {
      out.push({
        check: "answer-key",
        severity: "fail",
        url: hubUrl,
        detail: `hub Important Dates shows answer key "${d.label}" on ${d.date} but context.md has no announced answer-key row that day (an expected key, or cache skew)`,
      });
    }
  }
  return out;
}

export interface ScoreSchemeInput {
  scoreUrl: string | null;
  scoreHtml: string | null;
  contextUrl: string;
  contextMd: string | null;
}

const REFUSAL_RE =
  /can(?:'|’|&#x27;|&#39;|&apos;)t state one marking scheme|मार्किंग स्कीम नहीं बताई जा सकती|మార్కింగ్ స్కీమ్ చెప్పలేము|cannot be stated\.|not on our records|score differently\.|do not score alike/i;
const MARKING_LINE_RE = /Marking: \+|मार्किंग: सही पर \+|మార్కింగ్: సరైనదానికి \+/;
const ESTIMATOR_TITLE_RE = /Estimate your .* score|अपना .* स्कोर अनुमानित करें|మీ .* స్కోరును అంచనా వేయండి/;

/** (e) a page must not print a per-question scheme next to its own refusal. */
export function checkScoreScheme(input: ScoreSchemeInput): Finding[] {
  const out: Finding[] = [];
  if (input.scoreHtml && input.scoreUrl) {
    const html = input.scoreHtml;
    const refusal = REFUSAL_RE.test(html);
    const marking = MARKING_LINE_RE.test(html);
    const title = parseTitle(html) ?? "";
    if (refusal && marking) {
      out.push({ check: "score-scheme", severity: "fail", url: input.scoreUrl, detail: "page prints a marking line AND its own refusal reason (contradiction)", snippet: (MARKING_LINE_RE.exec(html)?.[0] ?? "") + " … " + (REFUSAL_RE.exec(html)?.[0] ?? "") });
    }
    if (refusal && ESTIMATOR_TITLE_RE.test(title)) {
      out.push({ check: "score-scheme", severity: "fail", url: input.scoreUrl, detail: "title promises an estimator while the body refuses to state a scheme", snippet: title });
    }
    if (!refusal && !marking && !/\(expected\)|not stated/i.test(html) && !title) {
      out.push({ check: "parse", severity: "warn", url: input.scoreUrl, detail: "score-estimate page has neither a marking line nor a refusal (markup changed?)" });
    }
  }
  if (input.contextMd) {
    const s = parseContextScheme(input.contextMd);
    const refuses = s.hasReason || s.hasSittingNotStated;
    const states = s.hasEstimatorLine || s.marksPerQ != null;
    if (refuses && states) {
      out.push({
        check: "score-scheme",
        severity: "fail",
        url: input.contextUrl,
        detail: `context.md refuses a scheme (${s.hasReason ? "pattern block" : "exam-week block"}) yet ${s.marksPerQ != null ? `prints "Marks per question: ${s.marksPerQ}"` : "prints the score-estimator line"}`,
      });
    }
    if (s.notStated && !s.hasReason) {
      out.push({ check: "score-scheme", severity: "fail", url: input.contextUrl, detail: `context.md says "Marks per question: not stated" without the reason line` });
    }
  }
  return out;
}

/** (f) FAQPage answers about cutoffs must not print a bare number without
 *  "indicative" / "estimate". */
export function checkFaqCutoff(blocks: unknown[], url: string): Finding[] {
  const out: Finding[] = [];
  const visit = (b: unknown) => {
    if (!b || typeof b !== "object") return;
    const o = b as Record<string, unknown>;
    if (Array.isArray(o["@graph"])) for (const g of o["@graph"] as unknown[]) visit(g);
    if (Array.isArray(b)) {
      for (const x of b as unknown[]) visit(x);
      return;
    }
    const type = o["@type"];
    const isFaq = type === "FAQPage" || (Array.isArray(type) && type.includes("FAQPage"));
    if (!isFaq) return;
    const entities = Array.isArray(o.mainEntity) ? (o.mainEntity as unknown[]) : [];
    for (const q of entities) {
      if (!q || typeof q !== "object") continue;
      const qo = q as Record<string, unknown>;
      const ans = qo.acceptedAnswer as Record<string, unknown> | undefined;
      const text = typeof ans?.text === "string" ? (ans.text as string) : "";
      if (!text || !/cut-?off/i.test(text)) continue;
      if (/indicative|estimate/i.test(text)) continue;
      const stripped = text
        .replace(/https?:\/\/\S+/g, " ")
        .replace(/\b\d{4}-\d{2}-\d{2}\b/g, " ")
        .replace(/\b\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+\d{4}\b/g, " ")
        .replace(/\b(?:19|20)\d{2}\b/g, " ")
        .replace(/\b\d{2,3}\s*(?:questions|minutes|mins|hours|days|weeks|months|years)\b/gi, " ");
      const num = /\b\d{2,3}(?:\.\d+)?\b/.exec(stripped);
      if (!num) continue;
      out.push({
        check: "faq-cutoff",
        severity: "fail",
        url,
        detail: `FAQ answer to "${String(qo.name ?? "").slice(0, 80)}" states a cutoff number (${num[0]}) without "indicative" or "estimate"`,
        snippet: text.slice(0, 120),
      });
    }
  };
  for (const b of blocks) visit(b);
  return out;
}

// ── Composition ──────────────────────────────────────────────────────────

export interface ExamBundle {
  code: string;
  hubUrl: string;
  hub: string | null;
  updatesUrl: string;
  updates: string | null;
  cutoffUrl: string;
  cutoff: string | null;
  scoreUrl: string;
  score: string | null;
  contextUrl: string;
  context: string | null;
  /** Optional /hi and /te twins of hub + updates. */
  twins?: { url: string; kind: "hub" | "updates"; html: string }[];
}

export interface CheckContext {
  now: Date;
  liveExamCount: number | null;
  languageCounts?: LanguageCounts | null;
}

function commonTextChecks(text: string, url: string, ctx: CheckContext): Finding[] {
  const out = findForbiddenPhrases(text, url);
  if (ctx.liveExamCount != null) out.push(...findStaleExamCount(text, url, ctx.liveExamCount));
  if (ctx.languageCounts) out.push(...checkLanguageCounts(text, url, ctx.languageCounts));
  return out;
}

export function runChecksForExam(b: ExamBundle, ctx: CheckContext): Finding[] {
  const out: Finding[] = [];
  const todayIst = istDayOf(ctx.now);
  const texts: { url: string; text: string }[] = [];
  const pages: [string, string | null][] = [
    [b.hubUrl, b.hub],
    [b.updatesUrl, b.updates],
    [b.cutoffUrl, b.cutoff],
    [b.scoreUrl, b.score],
    [b.contextUrl, b.context],
  ];
  for (const t of b.twins ?? []) pages.push([t.url, t.html]);
  for (const [url, text] of pages) {
    if (text == null) continue;
    texts.push({ url, text });
    out.push(...commonTextChecks(text, url, ctx));
  }

  const contextRows = b.context ? parseContextTimeline(b.context) : [];
  if (b.context && /^## Key dates/m.test(b.context) && contextRows.length === 0) {
    out.push({ check: "parse", severity: "warn", url: b.contextUrl, detail: "context.md has a Key dates section but no row parsed (line grammar changed?)" });
  }

  // (c) titles
  const hubPages: { url: string; html: string }[] = b.hub ? [{ url: b.hubUrl, html: b.hub }] : [];
  const updPages: { url: string; html: string }[] = b.updates ? [{ url: b.updatesUrl, html: b.updates }] : [];
  for (const t of b.twins ?? []) (t.kind === "hub" ? hubPages : updPages).push({ url: t.url, html: t.html });
  for (const p of hubPages) {
    const title = parseTitle(p.html);
    if (!title) {
      out.push({ check: "parse", severity: "warn", url: p.url, detail: "hub page has no <title>" });
      continue;
    }
    if (b.context) out.push(...checkTitleDate({ title: parseHubTitle(title), contextRows, todayIst, url: p.url, page: "hub" }));
  }
  for (const p of updPages) {
    const title = parseTitle(p.html);
    if (title && b.context) {
      const parsed = parseUpdatesTitle(title);
      if (parsed) out.push(...checkTitleDate({ title: parsed, contextRows, todayIst, url: p.url, page: "updates" }));
    }
  }

  // (b) + (d) rows
  let updatesRows: UpdatesRow[] = [];
  let updatesCards: UpdatesRow[] = [];
  for (const p of updPages) {
    const parsed = parseUpdatesRows(p.html);
    if (parsed.hasTable && parsed.rows.length === 0) {
      out.push({ check: "parse", severity: "warn", url: p.url, detail: "tracker table present but no row parsed (markup changed?)" });
    }
    out.push(...checkPassedExpected(parsed.rows, p.url, "tracker row"));
    out.push(...checkPassedExpected(parsed.cards, p.url, "key-date card"));
    if (p.url === b.updatesUrl) {
      updatesRows = parsed.rows;
      updatesCards = parsed.cards;
    }
  }
  const hubDates = b.hub ? parseHubDates(b.hub) : [];
  out.push(
    ...checkAnswerKey({
      url: b.contextUrl,
      contextRows,
      updatesRows,
      updatesCards,
      hubDates,
      texts,
      todayIst,
      updatesUrl: b.updatesUrl,
      hubUrl: b.hubUrl,
    }),
  );

  // (e)
  out.push(...checkScoreScheme({ scoreUrl: b.scoreUrl, scoreHtml: b.score, contextUrl: b.contextUrl, contextMd: b.context }));

  // (f) every FAQPage on the HTML pages
  for (const [url, html] of pages) {
    if (!html || url === b.contextUrl) continue;
    const { blocks, findings } = extractJsonLd(html, url);
    out.push(...findings);
    out.push(...checkFaqCutoff(blocks, url));
  }
  return out;
}

export interface SiteBundle {
  homeUrl: string;
  home: string | null;
  llmsUrl: string;
  llms: string | null;
  llmsFullUrl: string;
  llmsFull: string | null;
}

export function runChecksForSite(s: SiteBundle, ctx: CheckContext): Finding[] {
  const out: Finding[] = [];
  for (const [url, text] of [
    [s.homeUrl, s.home],
    [s.llmsUrl, s.llms],
    [s.llmsFullUrl, s.llmsFull],
  ] as [string, string | null][]) {
    if (text == null) continue;
    out.push(...commonTextChecks(text, url, ctx));
  }
  if (s.home) {
    const { blocks, findings } = extractJsonLd(s.home, s.homeUrl);
    out.push(...findings);
    out.push(...checkFaqCutoff(blocks, s.homeUrl));
  }
  if (s.llmsFull) {
    // The AEO exam-week block lives here too.
    out.push(...checkAnswerKey({ url: s.llmsFullUrl, contextRows: [], updatesRows: [], updatesCards: [], hubDates: [], texts: [{ url: s.llmsFullUrl, text: s.llmsFull }], todayIst: istDayOf(ctx.now) }));
  }
  return out;
}

/** "(178 Indian government & entrance exams)" in the llms-full header. */
export function liveExamCountFromLlmsFull(text: string): number | null {
  const m = /\((\d+) Indian government & entrance exams\)/.exec(text);
  return m ? Number(m[1]) : null;
}

/** Every exam code advertised in llms-full.txt — the "--all" list; no DB. */
export function examCodesFromLlmsFull(text: string): string[] {
  const seen = new Set<string>();
  const re = /\/exams\/([A-Z0-9_]+)\/context\.md/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) seen.add(m[1]);
  return [...seen];
}

// ── Runner (the only I/O) ────────────────────────────────────────────────

export type FetchLike = (
  url: string,
  init?: { headers?: Record<string, string>; signal?: AbortSignal },
) => Promise<{ status: number; text(): Promise<string> }>;

export interface RunOptions {
  base: string;
  codes: string[];
  concurrency?: number;
  fetchImpl?: FetchLike;
  now?: Date;
  /** Per-request timeout. */
  timeoutMs?: number;
  /** Soft budget for the whole run; exams not started by then are skipped. */
  budgetMs?: number;
  /** Also fetch the /hi and /te twins of hub + updates. */
  twins?: boolean;
  languageCounts?: LanguageCounts | null;
  log?: (line: string) => void;
}

export interface RunReport {
  findings: Finding[];
  fails: number;
  warns: number;
  /** Pages attempted. */
  pages: number;
  /** Pages that returned 200. */
  fetched: number;
  /** URLs that failed (non-200 other than a legitimate 404, or a network error). */
  failed: string[];
  codes: string[];
  skippedCodes: string[];
  liveExamCount: number | null;
  durationMs: number;
  truncated: boolean;
}

export const LINT_USER_AGENT = "ShishyaTruthLint/1.0 (+https://shishya.in; bot)";

async function fetchText(
  fetchImpl: FetchLike,
  url: string,
  timeoutMs: number,
): Promise<{ status: number; text: string | null; error?: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { headers: { "user-agent": LINT_USER_AGENT, "accept-language": "en" }, signal: ctrl.signal });
    if (res.status !== 200) return { status: res.status, text: null };
    return { status: 200, text: await res.text() };
  } catch (e) {
    return { status: 0, text: null, error: e instanceof Error ? e.message : String(e) };
  } finally {
    clearTimeout(timer);
  }
}

export async function runTruthLint(opts: RunOptions): Promise<RunReport> {
  const started = Date.now();
  const fetchImpl: FetchLike = opts.fetchImpl ?? ((url, init) => fetch(url, init));
  const base = opts.base.replace(/\/+$/, "");
  const now = opts.now ?? new Date();
  const timeoutMs = opts.timeoutMs ?? 20_000;
  const concurrency = Math.max(1, opts.concurrency ?? 4);
  const deadline = opts.budgetMs ? started + opts.budgetMs : Infinity;
  const log = opts.log ?? (() => {});
  const findings: Finding[] = [];
  const failed: string[] = [];
  let pages = 0;
  let fetched = 0;
  let truncated = false;

  const get = async (path: string, opt: { optional404?: boolean } = {}): Promise<string | null> => {
    const url = base + path;
    pages++;
    const r = await fetchText(fetchImpl, url, timeoutMs);
    if (r.text != null) {
      fetched++;
      return r.text;
    }
    if (r.status === 404 && opt.optional404) return null;
    failed.push(url);
    findings.push({
      check: "fetch",
      severity: "warn",
      url,
      detail: r.status ? `HTTP ${r.status}` : `fetch failed: ${r.error ?? "unknown"}`,
    });
    return null;
  };

  // Site-wide pages first — llms-full carries the live exam count.
  const [home, llms, llmsFull] = await Promise.all([get("/"), get("/llms.txt"), get("/llms-full.txt")]);
  const liveExamCount = llmsFull ? liveExamCountFromLlmsFull(llmsFull) : null;
  const ctx: CheckContext = { now, liveExamCount, languageCounts: opts.languageCounts ?? null };
  findings.push(
    ...runChecksForSite(
      { homeUrl: base + "/", home, llmsUrl: base + "/llms.txt", llms, llmsFullUrl: base + "/llms-full.txt", llmsFull },
      ctx,
    ),
  );

  const codes = [...new Set(opts.codes.map((c) => c.trim()).filter(Boolean))];
  const skippedCodes: string[] = [];
  let next = 0;
  const worker = async () => {
    while (next < codes.length) {
      const code = codes[next++];
      if (Date.now() > deadline) {
        truncated = true;
        skippedCodes.push(code);
        continue;
      }
      const p = `/exams/${code}`;
      const bundle: ExamBundle = {
        code,
        hubUrl: base + p,
        hub: await get(p),
        updatesUrl: base + p + "/updates",
        updates: await get(p + "/updates"),
        cutoffUrl: base + p + "/cutoff",
        cutoff: await get(p + "/cutoff"),
        scoreUrl: base + p + "/score-estimate",
        score: await get(p + "/score-estimate", { optional404: true }),
        contextUrl: base + p + "/context.md",
        context: await get(p + "/context.md"),
      };
      if (opts.twins) {
        bundle.twins = [];
        for (const loc of ["hi", "te"]) {
          for (const kind of ["hub", "updates"] as const) {
            const tp = `/${loc}${p}${kind === "updates" ? "/updates" : ""}`;
            const html = await get(tp);
            if (html) bundle.twins.push({ url: base + tp, kind, html });
          }
        }
      }
      const f = runChecksForExam(bundle, ctx);
      findings.push(...f);
      log(`${code}: ${f.filter((x) => x.severity === "fail").length} fail · ${f.filter((x) => x.severity === "warn").length} warn`);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, codes.length || 1) }, worker));

  return {
    findings,
    fails: findings.filter((f) => f.severity === "fail").length,
    warns: findings.filter((f) => f.severity === "warn").length,
    pages,
    fetched,
    failed,
    codes,
    skippedCodes,
    liveExamCount,
    durationMs: Date.now() - started,
    truncated,
  };
}

// ── Output ───────────────────────────────────────────────────────────────

/** Aligned text table: check | sev | url | detail — fails first. */
export function formatTable(findings: Finding[], opts: { maxDetail?: number; stripBase?: string } = {}): string {
  if (!findings.length) return "(no findings)";
  const maxDetail = opts.maxDetail ?? 140;
  const sorted = [...findings].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === "fail" ? -1 : 1));
  const rows = sorted.map((f) => {
    let url = f.url;
    if (opts.stripBase && url.startsWith(opts.stripBase)) url = url.slice(opts.stripBase.length) || "/";
    if (f.line) url += `:${f.line}`;
    const detail = (f.detail + (f.snippet ? ` — ${f.snippet}` : "")).replace(/\s+/g, " ");
    return [f.check, f.severity.toUpperCase(), url, detail.length > maxDetail ? detail.slice(0, maxDetail - 1) + "…" : detail];
  });
  const widths = [0, 0, 0].map((_, i) => Math.max(...rows.map((r) => r[i].length)));
  return rows.map((r) => `${r[0].padEnd(widths[0])}  ${r[1].padEnd(widths[1])}  ${r[2].padEnd(widths[2])}  ${r[3]}`).join("\n");
}

export function summarizeReport(r: RunReport): string {
  return `${r.fails} fail · ${r.warns} warn · ${r.fetched}/${r.pages} pages · ${r.failed.length} fetch errors · ${r.codes.length - r.skippedCodes.length}/${r.codes.length} exams · ${Math.round(r.durationMs / 1000)}s${r.truncated ? " · TRUNCATED (budget)" : ""}`;
}
