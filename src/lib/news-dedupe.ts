// News story identity (13 Sep 2026 — index shape that protects the
// Bing → ChatGPT channel).
//
// Audit (11 Sep 2026): the exam-data writer archived every live generated
// news row and inserted 2-5 fresh ones on every run — 5,518 news
// permalinks (39% of the sitemap, +907 in 14 days), ~84% of them
// restatements ("Tier 1 dates awaited" one day, "Tier 1 announcement
// expected soon" the next), each a NEW indexable URL that IndexNow then
// pushed to Bing, the index ChatGPT grounds its answers on.
//
// This module decides — deterministically, no model call, no I/O — when
// two headlines tell the SAME story, so that:
//   • the writer updates the existing permalink in place instead of
//     archiving it and minting a new one (planNewsWrites)
//   • IndexNow only ever hears about a genuinely new story
//     (selectFreshStories)
//
// Same story (sameStory):
//   1. compatible event status — "postponed", "released", "declared" are
//      EVENTS; an event is never a restatement of "expected soon", and a
//      postponement is never a restatement of a release
//   2. no conflicting cycle year (2025 ≠ 2026) and no conflicting stage
//      (Tier 1 ≠ Tier 2)
//   3. EVENTS are the same story only when they say the same thing
//      (review fix, 13 Sep 2026 — "answer key released" had absorbed
//      "answer key objection window closed", keeping the key's date and URL
//      on the new event): the exact stage, no conflicting dates / numbers,
//      the same verb family (opened ≠ closed, released ≠ concluded) and the
//      same content words once status words, dates, numbers and filler are
//      removed ("city slip" ≠ "admit card", "Southern Region" ≠ "Northern
//      Region"; "released on regional websites" = "released")
//   4. then the same TOPIC key (the tracker's kind vocabulary — ADMIT_CARD,
//      RESULT, EXAM… plus VACANCY / SYLLABUS / ELIGIBILITY / CUTOFF), or,
//      when either headline has no topic, trigram title similarity ≥ 0.8
//
// What a match may keep (planNewsWrites): publishedAt and the stored
// citation survive only a WORDING-ONLY restatement — same status, same
// stated facts (every year, number and month in title + body). A match
// whose status or facts changed ("expected in March" → "expected in June",
// "14,582 posts" → "17,727") keeps its permalink but is re-dated exactly as
// a new row would be, and carries only the new item's own citation — the
// date and the source link next to a sentence are the ones that sentence
// was stated with.
//
// Unit-tested in tests/unit/index-shape-news-dedupe.test.ts.

import type { NewsItem } from "@/lib/ai/exam-info";

/** Title similarity (Dice over character trigrams) at or above which two
 *  topic-less headlines are the same story. */
export const SAME_STORY_SIMILARITY = 0.8;
/** Body similarity at or above which a "new" row is a near-duplicate of an
 *  earlier one (IndexNow selection only). */
export const NEAR_DUPLICATE_BODY_SIMILARITY = 0.8;
/** How far back an archived row can still be recognised as the same story
 *  (the writer revives it instead of creating a new permalink; IndexNow
 *  treats a new row matching it as a restatement). */
export const STORY_LOOKBACK_DAYS = 45;

const DAY_MS = 86_400_000;
const BODY_COMPARE_CHARS = 600;

export type StoryStatus = "changed" | "pending" | "done" | "none";

/** Lowercase, punctuation → space (keeps Devanagari / Telugu letters). */
export function normaliseHeadline(s: string): string {
  return (s ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9ऀ-ॿఀ-౿]+/g, " ")
    .trim();
}

function trigramSet(s: string): Set<string> {
  const t = ` ${normaliseHeadline(s)} `;
  const out = new Set<string>();
  for (let i = 0; i + 3 <= t.length; i++) out.add(t.slice(i, i + 3));
  return out;
}

function dice(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, big] = a.size <= b.size ? [a, b] : [b, a];
  let shared = 0;
  for (const g of small) if (big.has(g)) shared++;
  return (2 * shared) / (a.size + b.size);
}

/** Dice coefficient over character trigrams of the normalised text, 0..1. */
export function textSimilarity(a: string, b: string): number {
  return dice(trigramSet(a), trigramSet(b));
}

// All regexes run on normaliseHeadline() output (lowercase, no punctuation).
const CHANGED_RE =
  /\b(postpon\w*|reschedul\w*|cancel\w*|extend\w*|extension|revis\w*|withdrawn?|withdraws|defer\w*|delay\w*|chang\w*|new dates?|re exam)\b/;
const PENDING_RE =
  /\b(expected|awaited|awaiting|await|likely|soon|tentative\w*|upcoming|anticipated|to be|will be|yet to|not yet|pending|shortly|probable)\b/;
const DONE_RE =
  /\b(released|out|declared|announced|published|issued|available|live|opens|opened|started|starts|begins|began|begun|closed|concluded|held|conducted|activated|uploaded|notified|confirmed|scheduled)\b/;

/** Event status of a headline. Checked in this order: a change beats a
 *  pending word ("postponed, new date awaited" is a change), a pending
 *  word beats a done word ("admit card to be released soon" is pending). */
export function storyStatus(title: string): StoryStatus {
  const t = normaliseHeadline(title);
  if (CHANGED_RE.test(t)) return "changed";
  if (PENDING_RE.test(t)) return "pending";
  if (DONE_RE.test(t)) return "done";
  return "none";
}

/** Verb families of the status words (every CHANGED_RE / DONE_RE word
 *  belongs to exactly one). Two events are the same story only with the
 *  same set: a window that OPENED is not the window that CLOSED. */
const EVENT_FAMILIES: ReadonlyArray<readonly [string, RegExp]> = [
  ["POSTPONE", /\b(postpon\w*|reschedul\w*|defer\w*|delay\w*)\b/],
  ["CANCEL", /\b(cancel\w*|withdrawn?|withdraws)\b/],
  ["EXTEND", /\b(extend\w*|extension)\b/],
  ["REVISE", /\b(revis\w*|chang\w*|new dates?)\b/],
  ["REEXAM", /\bre exam\b/],
  ["START", /\b(opens|opened|started|starts|begins|began|begun|live|activated)\b/],
  ["END", /\b(closed|concluded)\b/],
  ["HELD", /\b(held|conducted)\b/],
  ["PUBLISH", /\b(released|out|declared|announced|published|issued|available|uploaded|notified)\b/],
  ["CONFIRM", /\b(confirmed|scheduled)\b/],
];

export function eventFamilies(title: string): Set<string> {
  const t = normaliseHeadline(title);
  return new Set(EVENT_FAMILIES.filter(([, re]) => re.test(t)).map(([f]) => f));
}

// Order matters: the first match wins.
const TOPICS: ReadonlyArray<readonly [string, RegExp]> = [
  ["ANSWER_KEY", /\b(answer keys?|response sheets?|objections?)\b/],
  ["QUESTION_PAPER", /\b(question papers?|question booklets?|test booklets?)\b/],
  ["ADMIT_CARD", /\b(admit cards?|hall tickets?|call letters?|e admit|city slips?|intimation slips?|exam city)\b/],
  ["RESULT", /\b(results?|merit lists?|score ?cards?|final lists?|selection lists?|shortlist\w*)\b/],
  ["CUTOFF", /\bcut ?offs?\b/],
  ["INTERVIEW", /\b(interviews?|document verification|dv|pet|pst|medical examination|skill tests?|typing tests?)\b/],
  ["CORRECTION_WINDOW", /\b(correction|edit window|modification window)\b/],
  ["NOTIFICATION", /\b(notifications?|advertisements?|advt|recruitment notice)\b/],
  ["APPLICATION_END", /\b(last dates?|deadline|closing date)\b/],
  ["APPLICATION_START", /\b(applications?|registrations?|apply|online form)\b/],
  ["VACANCY", /\b(vacancy|vacancies|posts)\b/],
  ["SYLLABUS", /\b(syllabus|exam pattern|marking scheme)\b/],
  ["ELIGIBILITY", /\b(eligibility|age limit|qualifications?)\b/],
  ["EXAM", /\b(exams?|tier|papers?|prelims?|preliminary|mains?|phase|stage|cbt|test dates?|written|dates?|schedule|calendar|timetable|time table)\b/],
  ["NOTIFICATION", /\bannouncement\b/],
];

/** Topic key of a headline (the tracker's kind vocabulary), or null. */
export function storyTopic(title: string): string | null {
  const t = normaliseHeadline(title);
  for (const [topic, re] of TOPICS) if (re.test(t)) return topic;
  return null;
}

const ROMAN: Record<string, string> = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6" };
const STAGE_NUM_SRC = String.raw`\b(tier|phase|paper|stage|cbt|shift|round|part|level)\s?(\d{1,2}|iv|vi|v|i{1,3})\b`;
const STAGE_NUM_RE = new RegExp(STAGE_NUM_SRC);
const STAGE_NUM_RE_G = new RegExp(STAGE_NUM_SRC, "g");
const STAGE_WORD_RE =
  /\b(prelims?|preliminary|mains?|final|provisional|skill test|typing test|interview|dv|document verification|pet|pst)\b/;

/** Stage of a headline: "tier1", "paper2", "prelims", "mains", "final"…, or "". */
export function stageToken(title: string): string {
  const t = normaliseHeadline(title);
  const n = t.match(STAGE_NUM_RE);
  if (n) return `${n[1]}${ROMAN[n[2]] ?? String(Number(n[2]))}`;
  const w = t.match(STAGE_WORD_RE);
  if (!w) return "";
  if (w[1].startsWith("prelim")) return "prelims";
  if (w[1].startsWith("main")) return "mains";
  return w[1].replace(/\s+/g, "-");
}

const MONTH_RE =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/g;
const MONTH_TOKEN_RE =
  /^(jan(uary)?|feb(ruary)?|mar(ch)?|apr(il)?|may|jun(e)?|jul(y)?|aug(ust)?|sep(t|tember)?|oct(ober)?|nov(ember)?|dec(ember)?)$/;

/** Words that never change what an event headline says. */
const FILLER = new Set([
  "a", "an", "the", "of", "for", "on", "in", "at", "to", "by", "from", "with", "and", "or", "via", "as",
  "is", "are", "was", "were", "be", "been", "being", "has", "have", "had", "it", "its", "this", "that",
  "now", "today", "tonight", "here", "check", "download", "direct", "link", "links", "official", "officially",
  "website", "websites", "site", "sites", "portal", "portals", "online", "regional", "candidates", "students",
  "aspirants", "details", "all", "new", "re", "will", "yet", "not", "how", "steps", "exam", "exams", "examination",
]);

/** Content words of a headline: status words, years, numbers, months and
 *  filler removed, plurals folded ("cards" → "card"). */
export function contentTokens(title: string): Set<string> {
  const out = new Set<string>();
  for (const tok of normaliseHeadline(title).split(" ")) {
    if (!tok || /^\d+$/.test(tok) || MONTH_TOKEN_RE.test(tok) || FILLER.has(tok)) continue;
    if (CHANGED_RE.test(tok) || PENDING_RE.test(tok) || DONE_RE.test(tok)) continue;
    out.add(tok.length > 3 && tok.endsWith("s") && !tok.endsWith("ss") ? tok.slice(0, -1) : tok);
  }
  return out;
}

/** Every year, number and month a text states (stage numbers excluded) —
 *  what a wording-only restatement must leave unchanged. */
export function statedFacts(text: string): Set<string> {
  const t = normaliseHeadline(text).replace(STAGE_NUM_RE_G, " ");
  const out = new Set<string>(t.match(/\b\d+\b/g) ?? []);
  for (const m of t.matchAll(MONTH_RE)) out.add(m[1].slice(0, 3));
  // "may" is a month only next to a day number ("12 may", "may 12").
  if (/\b\d{1,2} may\b|\bmay \d{1,2}\b/.test(t)) out.add("may");
  return out;
}

export interface StoryFeatures {
  status: StoryStatus;
  topic: string | null;
  stage: string;
  /** 20xx years named in the headline. */
  years: Set<string>;
  /** Other numbers + month names (dates, counts), stage numbers excluded. */
  details: Set<string>;
  /** Verb families of the status words (events). */
  families: Set<string>;
  /** Content words (events). */
  tokens: Set<string>;
  grams: Set<string>;
}

export function storyFeatures(title: string): StoryFeatures {
  const t = normaliseHeadline(title);
  const years = new Set(t.match(/\b20\d{2}\b/g) ?? []);
  const rest = t.replace(/\b20\d{2}\b/g, " ").replace(STAGE_NUM_RE, " ");
  const details = new Set<string>(rest.match(/\b\d+\b/g) ?? []);
  for (const m of rest.matchAll(MONTH_RE)) details.add(m[1].slice(0, 3));
  // "may" is a month only next to a day number ("12 may", "may 12").
  if (/\b\d{1,2} may\b|\bmay \d{1,2}\b/.test(rest)) details.add("may");
  return {
    status: storyStatus(t),
    topic: storyTopic(t),
    stage: stageToken(t),
    years,
    details,
    families: eventFamilies(t),
    tokens: contentTokens(t),
    grams: trigramSet(t),
  };
}

const isEvent = (s: StoryStatus) => s === "done" || s === "changed";

function disjoint(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (b.has(x)) return false;
  return true;
}

function subset(a: Set<string>, b: Set<string>): boolean {
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && subset(a, b);
}

/** Same story? (feature form — precompute features in loops). */
export function sameStory(a: StoryFeatures, b: StoryFeatures): boolean {
  if (a.status !== b.status && (isEvent(a.status) || isEvent(b.status))) return false;
  if (a.years.size > 0 && b.years.size > 0 && disjoint(a.years, b.years)) return false;
  if (isEvent(a.status)) {
    if (a.stage !== b.stage) return false;
    if (a.details.size > 0 && b.details.size > 0 && !subset(a.details, b.details) && !subset(b.details, a.details)) return false;
    if (!sameSet(a.families, b.families)) return false;
    if (!sameSet(a.tokens, b.tokens)) return false;
  } else if (a.stage && b.stage && a.stage !== b.stage) {
    return false;
  }
  if (a.topic && b.topic) return a.topic === b.topic;
  return dice(a.grams, b.grams) >= SAME_STORY_SIMILARITY;
}

/** Same story? (string form). */
export function isSameStory(a: string, b: string): boolean {
  return sameStory(storyFeatures(a), storyFeatures(b));
}

/** A match that changes neither the status nor any stated fact (title +
 *  body) — the only kind that may keep publishedAt and the stored citation. */
export function isWordingOnly(stored: { title: string; body: string }, incoming: { title: string; body: string }): boolean {
  return (
    storyStatus(stored.title) === storyStatus(incoming.title) &&
    sameSet(statedFacts(`${stored.title} ${stored.body}`), statedFacts(`${incoming.title} ${incoming.body}`))
  );
}

// ── writer plan ─────────────────────────────────────────────────────────

/** A generated news row already stored for the exam: live, or archived
 *  within STORY_LOOKBACK_DAYS. */
export interface StoredNewsRow {
  id: string;
  title: string;
  body: string;
  url: string | null;
  archivedAt: Date | null;
}

export interface NewsCreate {
  title: string;
  body: string;
  url: string | null;
  publishedAt: Date;
}

export interface NewsUpdate {
  id: string;
  /** publishedAt is present only when the status or a stated fact changed
   *  (then it is dated exactly like a new row); a wording-only restatement
   *  keeps the date it first appeared. archivedAt: null only when an
   *  archived row is revived. */
  data: { title: string; body: string; url: string | null; archivedAt?: null; publishedAt?: Date };
}

export interface NewsWritePlan {
  /** Genuinely new stories → new permalinks. */
  create: NewsCreate[];
  /** Matched stories → the existing permalink, updated in place. */
  update: NewsUpdate[];
  /** Restated word for word → no write at all. */
  unchanged: string[];
  /** Live rows the new generation no longer carries. */
  archive: string[];
  /** Incoming items that restated an earlier item of the same run. */
  collapsed: number;
  /** Archived rows brought back because the story is live again. */
  revived: number;
  /** Updates whose status or stated facts changed — re-dated, new citation only. */
  refreshed: number;
}

type Pooled = { row: StoredNewsRow; f: StoryFeatures };

function bestMatch(pool: Pooled[], f: StoryFeatures, claimed: Set<string>): StoredNewsRow | null {
  let best: StoredNewsRow | null = null;
  let bestScore = -1;
  for (const c of pool) {
    if (claimed.has(c.row.id) || !sameStory(c.f, f)) continue;
    const score = dice(c.f.grams, f.grams);
    if (score > bestScore) {
      best = c.row;
      bestScore = score;
    }
  }
  return best;
}

/**
 * Decide how a new generation of news lands on the stored rows.
 * Each incoming item (in order) claims at most one stored row — the most
 * similar same-story LIVE row, else the most similar same-story row
 * archived within the lookback — and each stored row is claimed at most
 * once. Unclaimed live rows are archived (never deleted). The caller keeps
 * the "empty generation never wipes the timeline" rule by not calling this
 * with an empty `incoming`.
 *
 * A claimed row keeps its publishedAt and (when the item cites nothing) its
 * stored url only for a wording-only restatement (isWordingOnly). Otherwise
 * the row is re-dated like a create (now − daysAgo) and its url becomes the
 * item's own citation or null — an old source never vouches for new text.
 */
export function planNewsWrites(stored: readonly StoredNewsRow[], incoming: readonly NewsItem[], now: Date): NewsWritePlan {
  const plan: NewsWritePlan = { create: [], update: [], unchanged: [], archive: [], collapsed: 0, revived: 0, refreshed: 0 };
  const live: Pooled[] = [];
  const archived: Pooled[] = [];
  for (const row of stored) (row.archivedAt === null ? live : archived).push({ row, f: storyFeatures(row.title) });

  const claimed = new Set<string>();
  const runStories: StoryFeatures[] = [];
  for (const n of incoming) {
    const f = storyFeatures(n.title);
    if (runStories.some((k) => sameStory(k, f))) {
      plan.collapsed++;
      continue;
    }
    runStories.push(f);

    const cited = n.source ?? null;
    const publishedAt = new Date(now.getTime() - n.daysAgo * DAY_MS);
    const match = bestMatch(live, f, claimed) ?? bestMatch(archived, f, claimed);
    if (!match) {
      plan.create.push({ title: n.title, body: n.body, url: cited, publishedAt });
      continue;
    }
    claimed.add(match.id);
    const wordingOnly = isWordingOnly(match, n);
    const url = wordingOnly ? (cited ?? match.url) : cited;
    const data: NewsUpdate["data"] = { title: n.title, body: n.body, url };
    if (!wordingOnly) {
      data.publishedAt = publishedAt;
      plan.refreshed++;
    }
    if (match.archivedAt !== null) {
      data.archivedAt = null;
      plan.update.push({ id: match.id, data });
      plan.revived++;
    } else if (wordingOnly && match.title === n.title && match.body === n.body && match.url === url) {
      plan.unchanged.push(match.id);
    } else {
      plan.update.push({ id: match.id, data });
    }
  }
  plan.archive = live.filter((l) => !claimed.has(l.row.id)).map((l) => l.row.id);
  return plan;
}

// ── IndexNow selection ──────────────────────────────────────────────────
// No table remembers what was submitted (prisma/schema.prisma has no
// per-URL store and a schema change is out of scope), so the news scope of
// /api/cron/indexnow submits rows CREATED since the previous scheduled run
// that are not a near-duplicate of an earlier row of the same exam.

export interface StoryRow {
  id: string;
  examId: string;
  title: string;
  body: string;
  createdAt: Date;
}

/**
 * Split rows created in the submission window into genuinely new stories
 * and near-duplicates. A fresh row is a near-duplicate when ANY earlier row
 * of the same exam (created before the window, live or archived, or an
 * earlier fresh row) is the same story by headline, or its body is
 * ≥ NEAR_DUPLICATE_BODY_SIMILARITY similar.
 */
export function selectFreshStories(
  fresh: readonly StoryRow[],
  earlier: readonly StoryRow[],
): { keep: string[]; nearDuplicate: string[] } {
  const byExam = new Map<string, { f: StoryFeatures; body: Set<string> }[]>();
  const remember = (examId: string, f: StoryFeatures, body: Set<string>) => {
    const list = byExam.get(examId);
    if (list) list.push({ f, body });
    else byExam.set(examId, [{ f, body }]);
  };
  for (const r of earlier) remember(r.examId, storyFeatures(r.title), trigramSet(r.body.slice(0, BODY_COMPARE_CHARS)));

  const keep: string[] = [];
  const nearDuplicate: string[] = [];
  const ordered = [...fresh].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  for (const r of ordered) {
    const f = storyFeatures(r.title);
    const body = trigramSet(r.body.slice(0, BODY_COMPARE_CHARS));
    const prior = byExam.get(r.examId) ?? [];
    const dup = prior.some((p) => sameStory(p.f, f) || dice(p.body, body) >= NEAR_DUPLICATE_BODY_SIMILARITY);
    (dup ? nearDuplicate : keep).push(r.id);
    remember(r.examId, f, body);
  }
  return { keep, nearDuplicate };
}

/**
 * The news-scope submission window: the interval of the cron expression
 * that triggered the run (Vercel sends it in x-vercel-cron-schedule) plus
 * 25% overlap, so a late run never leaves a gap. A day-of-week schedule is
 * weekly, a day-of-month schedule monthly, anything else daily. A manual
 * ?sinceHours= wins (clamped to 1 h – 14 d).
 */
export function indexNowWindowMs(schedule: string | null | undefined, sinceHours?: string | null): number {
  const h = Number(sinceHours);
  if (sinceHours != null && sinceHours !== "" && Number.isFinite(h) && h > 0) {
    return Math.round(Math.min(Math.max(h, 1), 24 * 14) * 3_600_000);
  }
  const fields = (schedule ?? "").trim().split(/\s+/);
  let interval = DAY_MS;
  if (fields.length === 5) {
    if (fields[4] !== "*") interval = 7 * DAY_MS;
    else if (fields[2] !== "*") interval = 31 * DAY_MS;
  }
  return Math.round(interval * 1.25);
}
