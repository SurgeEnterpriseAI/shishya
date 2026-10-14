// scripts/clear-stale-translations-10-2026b.ts — cached translations older
// than their question's latest recorded key / solution change, from the
// writers the 13 Oct clear did not cover (14 Oct 2026).
//
// What is wrong (read 14 Oct 2026, SELECT only): until today no writer of a
// question's key or solution touched its cached translations
// (QuestionTranslation). scripts/clear-stale-translations-10-2026.ts (applied
// 13 Oct, 1,199 rows) cleared the ones left by the answer check's key
// corrections. Still served on 14 Oct:
//   • the student-report sweep (src/lib/question-sweep.ts: the instant
//     adjudication of a report and the weekly cron) and its CLI twin
//     scripts/fix-reported-questions.ts re-keyed 40 questions and appended a
//     "[Correction <day>: answer key corrected to X after student report …]"
//     note to the English solution. 34 cache rows on 26 questions (26 of the
//     rows on questions still served) were written before that fix: the
//     translated solution is the old working, without the note. 3 of the 8
//     such rows in the dry run's samples end on another answer than the key
//     — e.g. a KA Police row keyed C "4/9" whose Hindi solution ends "4/9 is
//     not among the options … 5/18" (hi 26, kn 4, ta 2, mr 1, te 1);
//   • the answer check (scripts/verify-question-bank.ts) replaced the
//     solution of 12 questions while keeping their key ("keyCorrected" with
//     the same key, so outside the 13 Oct rule): 13 cache rows on 9 of them
//     still translate the replaced solution. The key is the same, so these
//     matter less (both rows in the dry run's samples conclude on it); --only
//     report-sweep leaves them;
//   • the admin editor (src/app/api/admin/questions/[id]/route.ts) records
//     no edit at all (no time, no field, no audit row), so an admin edit of
//     the past cannot be timed. Not selected; the dry run says so.
// From today every one of those writers clears the question's cache in the
// same transaction as the write (src/lib/question-translation-cache.ts;
// tests/unit/question-translation-cache-writers.test.ts), so this is a
// one-off for what they left before.
//
// THE RULE (pure, correctionsOf / selectStale below). A cached translation is
// selected exactly when it was written (createdAt) before a recorded change
// of its question's key or solution that still stands:
//   report-sweep — a "[Correction YYYY-MM-DD: answer key corrected to X after
//     student report" note in the current solution. Its time is the resolve
//     of the question's reports by the sweep (resolvedBy cron:key-sweep,
//     claude:instant-report or claude:key-sweep) on the note's UTC day: the
//     sweep writes the key, then resolves the reports in the next statement,
//     so that resolvedAt follows the write by milliseconds. One resolve on
//     that day (≤ 2 min spread) = the time; several = the earliest (a lower
//     bound); none = the day's start (UTC, a lower bound).
//   answer-check — metadata.factoryVerify.keyCorrected with the key moved
//     (prevKey ≠ key now) or the solution replaced (prevSolution ≠ the
//     solution now). Time: validatedAt when it is that same write (validatedBy
//     factory:verify-v1, within 2 h after factoryVerify.at), else
//     factoryVerify.at (a lower bound) — the 13 Oct rule.
//   bank-fix — metadata.bankFix.at (scripts/fix-bank-items-10-2026.ts and
//     its follow-ups take it just before their transaction: a lower bound).
//   hand-rekey — metadata.rekeyedBy + rekeyedFrom ≠ key now, not made by a
//     bank fix: the start (IST) of the day its tag names, from a closed table
//     (HAND_REKEY_DAY); a re-key with no known time is reported, never guessed.
// A row older than ANY standing change translates text that is gone, so it is
// selected (and attributed to the latest change it predates). A row inside a
// lower bound's uncertainty (the rest of the note's day, 2 h after
// factoryVerify.at, 30 min after bankFix.at, the re-key's day) is NOT
// selected: it is printed as "ambiguous" for a person to read.
// Why it is exact: every cache writer goes through upsertTranslation
// (src/lib/db/questionTranslations.ts), which sets createdAt = NOW() on insert
// and on update, so createdAt is when the row's text was last written; both
// clocks are the DB's UTC. The dry run prints the margin (nearest row on
// either side of an exactly-timed change; 14 Oct: 6.8 h before, 3.2 h after,
// 0 ambiguous, 0 untimed — 47 rows on 35 questions, 39 on served ones).
//
// What happens after the clear: the question shows in English in that
// language until the cache is filled again: on demand by the mock player and
// the results page (Claude Haiku, ≤ 8 per request), or by the night
// pre-translation on Surge's server (src/lib/pretranslate.ts); the guest quiz
// and the topic pages read the cache only.
//
// The write: one transaction, the only statement a DELETE of these cache rows
// (a question is never touched). The undo log — every FULL row (id, question,
// locale, body, options, solution, hints, generator, createdAt) — is on disk
// with status "pending" before the transaction; inside it the rows are
// re-read, each delete is conditional on the logged createdAt (every write
// moves it), and the run stops with nothing written if any row changed or
// vanished since the plan. --apply needs --max <n> (the first n candidates,
// served questions first); --only <source,…> narrows to some sources;
// unknown flags are refused.
//
// Undo: --undo <log> is a dry run; --undo <log> --apply re-creates every
// logged row with its own id and createdAt, except where the question already
// has a translation in that language again (the fresh one is kept) or the
// question is gone. The undo writes its own log first.
//
// USAGE (from the repo root; .env.local is PRODUCTION):
//   npx tsx --env-file=.env.local scripts/clear-stale-translations-10-2026b.ts                          # dry run
//   npx tsx --env-file=.env.local scripts/clear-stale-translations-10-2026b.ts --apply --max 100        # all of them
//   npx tsx --env-file=.env.local scripts/clear-stale-translations-10-2026b.ts --apply --max 100 --only report-sweep
//   npx tsx --env-file=.env.local scripts/clear-stale-translations-10-2026b.ts --undo <log> [--apply]
//   (--log-dir <dir> overrides where the logs go; default D:/CodexProjects/shishya/data/fix-logs
//    when that folder exists, else data/fix-logs)
//
// Tests: tests/unit/clear-stale-translations-10-2026b.test.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Prisma } from "@prisma/client";

export const LOG_STEM = "clear-stale-translations-10-2026b";
export const MAIN_LOG_DIR = "D:/CodexProjects/shishya/data/fix-logs";
export const FALLBACK_LOG_DIR = "data/fix-logs";
export const WITHDRAWN_TAG = "rejected"; // src/lib/question-withdrawn.ts
export const FACTORY_VALIDATED_BY = "factory:verify-v1"; // scripts/verify-question-bank.ts applyVerdict
/** The resolvedBy tags of the report sweep's three callers. */
export const SWEEP_RESOLVERS = ["cron:key-sweep", "claude:instant-report", "claude:key-sweep"] as const;
/** The note src/lib/question-sweep.ts keyFixSolution (and scripts/fix-reported-questions.ts) appends. */
export const SWEEP_NOTE_RE = /\[Correction (\d{4}-\d{2}-\d{2}): answer key corrected to ([A-Z](?:\s*,\s*[A-Z])*) after student report/g;
/** Resolves of one sweep run land within this of each other (the reports are resolved in one statement). */
export const RESOLVE_CLUSTER_MS = 2 * 60 * 1000;
/** A resolve up to this long after the note's UTC day still belongs to it. */
export const NOTE_DAY_SLACK_MS = 5 * 60 * 1000;
/** validatedAt is the answer check's own write when it lands this soon after factoryVerify.at (13 Oct: max 30 min). */
export const SAME_WRITE_MS = 2 * 60 * 60 * 1000;
/** bankFix.at is taken just before the bank fix's transaction (its timeout is ≤ 2 min). */
export const BANK_FIX_WINDOW_MS = 30 * 60 * 1000;
/** Hand re-keys whose script recorded no time: the start (IST) of the day the tag names — a lower bound. */
export const HAND_REKEY_DAY: Readonly<Record<string, string>> = {
  "datafix:sbi-q-fix-sep24": "2026-09-24T00:00:00+05:30", // scripts/tmp-datafix-sbi-q-fix-sep24.ts
};
export const DAY_MS = 24 * 60 * 60 * 1000;
export const CHUNK = 300;
export const SOURCES = ["report-sweep", "answer-check", "bank-fix", "hand-rekey"] as const;
export type CorrectionSource = (typeof SOURCES)[number];

// ── Rule (pure) ──────────────────────────────────────────────────────────

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** A key as a comparable value: "b" → "B", "C, A" → "A,C". */
export function normKey(k: unknown): string {
  if (typeof k !== "string") return "";
  return k
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(",");
}

export function toDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v !== "string" || !v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface QuestionForRule {
  id: string;
  answerKey: string;
  solution: string | null;
  validatedBy: string | null;
  validatedAt: Date | string | null;
  metadata: unknown;
}

/** A sweep resolve of one of the question's reports. */
export interface ResolveEvent {
  questionId: string;
  resolvedBy: string | null;
  resolvedAt: Date | string | null;
}

export type AtFrom = "report resolvedAt" | "earliest resolve that day" | "note day (UTC)" | "validatedAt" | "factoryVerify.at" | "bankFix.at" | "tag day";
export interface Correction {
  source: CorrectionSource;
  /** What changed: "key" (moved), "solution" (replaced, same key), "key+note" (the sweep). */
  kind: string;
  /** When it was written, or a lower bound of it. */
  at: Date;
  atFrom: AtFrom;
  /** How long after `at` the write may have landed (0 = `at` is the write). */
  windowMs: number;
  oldKey: string | null;
  newKey: string;
}
export interface CorrectionRead {
  corrections: Correction[];
  /** A recorded change this rule cannot time (reported, never guessed). */
  untimed: string[];
}

/** The sweep's correction notes in a solution, in order. */
export function sweepNotes(solution: string | null): { day: string; key: string }[] {
  if (!solution) return [];
  return [...solution.matchAll(SWEEP_NOTE_RE)].map((m) => ({ day: m[1], key: normKey(m[2]) }));
}

/** When the sweep wrote the note of `day`: from the question's sweep resolves on that UTC day. */
export function sweepTime(day: string, events: readonly ResolveEvent[]): { at: Date; atFrom: AtFrom; windowMs: number } | null {
  const d0 = toDate(`${day}T00:00:00Z`);
  if (!d0) return null;
  const lo = d0.getTime();
  const hi = lo + DAY_MS + NOTE_DAY_SLACK_MS;
  const times = events
    .filter((e) => e.resolvedBy && (SWEEP_RESOLVERS as readonly string[]).includes(e.resolvedBy))
    .map((e) => toDate(e.resolvedAt)?.getTime() ?? NaN)
    .filter((t) => Number.isFinite(t) && t >= lo && t < hi)
    .sort((a, b) => a - b);
  if (times.length === 0) return { at: d0, atFrom: "note day (UTC)", windowMs: DAY_MS + NOTE_DAY_SLACK_MS };
  const spread = times[times.length - 1] - times[0];
  if (spread <= RESOLVE_CLUSTER_MS) return { at: new Date(times[0]), atFrom: "report resolvedAt", windowMs: 0 };
  return { at: new Date(times[0]), atFrom: "earliest resolve that day", windowMs: spread };
}

/** Every recorded change of the question's key or solution that still stands. */
export function correctionsOf(q: QuestionForRule, events: readonly ResolveEvent[] = []): CorrectionRead {
  const out: CorrectionRead = { corrections: [], untimed: [] };
  const now = normKey(q.answerKey);

  // report sweep: the note is in the solution now, so the change stands.
  const notes = sweepNotes(q.solution);
  notes.forEach((n, i) => {
    const t = sweepTime(n.day, events);
    if (!t) out.untimed.push(`report sweep note "${n.day}": not a date`);
    // The key a note set stands only if no later note moved it again; the solution change stands regardless.
    else out.corrections.push({ source: "report-sweep", kind: "key+note", ...t, oldKey: i > 0 ? notes[i - 1].key : null, newKey: n.key });
  });

  const meta = isObj(q.metadata) ? q.metadata : null;
  if (!meta) return out;

  // answer check: key moved, or solution replaced with the same key.
  const fv = isObj(meta.factoryVerify) ? meta.factoryVerify : null;
  if (fv && fv.keyCorrected === true) {
    const prev = normKey(fv.prevKey);
    const at = toDate(fv.at);
    const prevSolution = typeof fv.prevSolution === "string" ? fv.prevSolution : null;
    const keyMoved = !!prev && prev !== now;
    const solutionReplaced = prevSolution !== null && (q.solution ?? "").slice(0, 2000) !== prevSolution;
    if (!at) out.untimed.push("answer check: keyCorrected without at");
    else if (keyMoved || solutionReplaced) {
      const va = toDate(q.validatedAt);
      const sameWrite = !!va && q.validatedBy === FACTORY_VALIDATED_BY && va.getTime() >= at.getTime() && va.getTime() - at.getTime() <= SAME_WRITE_MS;
      out.corrections.push({
        source: "answer-check",
        kind: keyMoved ? "key" : "solution",
        at: sameWrite ? va! : at,
        atFrom: sameWrite ? "validatedAt" : "factoryVerify.at",
        windowMs: sameWrite ? 0 : SAME_WRITE_MS,
        oldKey: prev || null,
        newKey: now,
      });
    }
  }

  // bank fix (any of stem, options, key, solution).
  const bf = isObj(meta.bankFix) ? meta.bankFix : null;
  const bfAt = bf ? toDate(bf.at) : null;
  if (bf && bfAt) out.corrections.push({ source: "bank-fix", kind: "text", at: bfAt, atFrom: "bankFix.at", windowMs: BANK_FIX_WINDOW_MS, oldKey: normKey(bf.prevAnswerKey) || null, newKey: now });
  else if (bf) out.untimed.push("bank fix: no at");

  // hand re-key not made by a bank fix.
  if (typeof meta.rekeyedBy === "string" && typeof meta.rekeyedFrom === "string") {
    const by = meta.rekeyedBy;
    const prev = normKey(meta.rekeyedFrom);
    const byBankFix = !!bf && bf.by === by;
    if (prev && prev !== now && !byBankFix) {
      const day = HAND_REKEY_DAY[by] ? toDate(HAND_REKEY_DAY[by]) : null;
      if (day) out.corrections.push({ source: "hand-rekey", kind: "key", at: day, atFrom: "tag day", windowMs: DAY_MS, oldKey: prev, newKey: now });
      else out.untimed.push(`hand re-key ${by}: no recorded time`);
    }
  }
  return out;
}

export type RowVerdict = { stale: Correction } | { ambiguous: Correction } | null;

/** The latest standing change the translation predates (stale), else one whose
 *  uncertainty window holds it (ambiguous), else null (written after every change). */
export function judgeRow(corrections: readonly Correction[], trCreatedAt: Date | string): RowVerdict {
  const created = toDate(trCreatedAt);
  if (!created || corrections.length === 0) return null;
  const t = created.getTime();
  const before = corrections.filter((c) => t < c.at.getTime());
  if (before.length) return { stale: before.reduce((a, b) => (b.at.getTime() > a.at.getTime() ? b : a)) };
  const inWindow = corrections.filter((c) => c.windowMs > 0 && t < c.at.getTime() + c.windowMs);
  if (inWindow.length) return { ambiguous: inWindow.reduce((a, b) => (b.at.getTime() > a.at.getTime() ? b : a)) };
  return null;
}

// ── Rows ─────────────────────────────────────────────────────────────────

export interface QRow extends QuestionForRule {
  validated: boolean;
  tags: string[];
  options: unknown;
  exam: { code: string };
}
export const Q_SELECT = {
  id: true,
  answerKey: true,
  solution: true,
  validated: true,
  validatedBy: true,
  validatedAt: true,
  tags: true,
  metadata: true,
  options: true,
  exam: { select: { code: true } },
} as const;

export interface TrMeta {
  id: string;
  questionId: string;
  locale: string;
  generator: string | null;
  createdAt: Date | string;
}
export const TR_META_SELECT = { id: true, questionId: true, locale: true, generator: true, createdAt: true } as const;

/** A full cache row as the undo log keeps it. */
export interface TrRow {
  id: string;
  questionId: string;
  locale: string;
  body: string;
  options: unknown;
  solution: string;
  hints: unknown;
  generator: string | null;
  createdAt: string; // ISO, UTC
}
export const TR_SELECT = { id: true, questionId: true, locale: true, body: true, options: true, solution: true, hints: true, generator: true, createdAt: true } as const;
export const trOf = (r: Omit<TrRow, "createdAt"> & { createdAt: Date | string }): TrRow => ({
  id: r.id,
  questionId: r.questionId,
  locale: r.locale,
  body: r.body,
  options: r.options,
  solution: r.solution,
  hints: r.hints ?? null,
  generator: r.generator ?? null,
  createdAt: new Date(r.createdAt).toISOString(),
});
export function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (isObj(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));
}
export const sameTr = (a: TrRow, b: TrRow) => canonical(a) === canonical(b);

export const isServed = (q: Pick<QRow, "validated" | "tags">) => q.validated && !(q.tags ?? []).includes(WITHDRAWN_TAG);

export interface Candidate {
  tr: TrMeta;
  q: QRow;
  correction: Correction;
  served: boolean;
}
export interface Selection {
  candidates: Candidate[];
  ambiguous: Candidate[];
  /** Questions read, and those with at least one standing change, by source. */
  questionsRead: number;
  questionsWithChange: Record<CorrectionSource, number>;
  translationsOfThem: number;
  afterChange: number;
  untimed: { questionId: string; note: string; rows: number }[];
  /** Nearest translation to an exactly-timed change, in seconds (the rule's margin). */
  nearestBeforeSec: number | null;
  nearestAfterSec: number | null;
}

/** Applies the rule to every cache row of the given questions. Order: served first, then question id, then locale. */
export function selectStale(questions: readonly QRow[], translations: readonly TrMeta[], events: readonly ResolveEvent[] = []): Selection {
  const evBy = new Map<string, ResolveEvent[]>();
  for (const e of events) evBy.set(e.questionId, [...(evBy.get(e.questionId) ?? []), e]);
  const byId = new Map(questions.map((q) => [q.id, q]));
  const reads = new Map(questions.map((q) => [q.id, correctionsOf(q, evBy.get(q.id) ?? [])]));
  const withChange = Object.fromEntries(SOURCES.map((s) => [s, 0])) as Record<CorrectionSource, number>;
  for (const r of reads.values()) for (const s of new Set(r.corrections.map((c) => c.source))) withChange[s]++;
  const sel: Selection = {
    candidates: [],
    ambiguous: [],
    questionsRead: questions.length,
    questionsWithChange: withChange,
    translationsOfThem: 0,
    afterChange: 0,
    untimed: [],
    nearestBeforeSec: null,
    nearestAfterSec: null,
  };
  const untimedRows = new Map<string, number>();
  for (const t of translations) {
    const q = byId.get(t.questionId);
    if (!q) continue;
    const read = reads.get(q.id)!;
    if (read.untimed.length) untimedRows.set(q.id, (untimedRows.get(q.id) ?? 0) + 1);
    if (read.corrections.length === 0) continue;
    sel.translationsOfThem++;
    const created = toDate(t.createdAt);
    if (!created) continue;
    for (const c of read.corrections) {
      if (c.windowMs !== 0) continue;
      const d = (created.getTime() - c.at.getTime()) / 1000;
      if (d < 0) sel.nearestBeforeSec = sel.nearestBeforeSec === null ? -d : Math.min(sel.nearestBeforeSec, -d);
      else sel.nearestAfterSec = sel.nearestAfterSec === null ? d : Math.min(sel.nearestAfterSec, d);
    }
    const v = judgeRow(read.corrections, t.createdAt);
    if (v && "stale" in v) sel.candidates.push({ tr: t, q, correction: v.stale, served: isServed(q) });
    else if (v && "ambiguous" in v) sel.ambiguous.push({ tr: t, q, correction: v.ambiguous, served: isServed(q) });
    else sel.afterChange++;
  }
  for (const q of questions) for (const note of reads.get(q.id)!.untimed) sel.untimed.push({ questionId: q.id, note, rows: untimedRows.get(q.id) ?? 0 });
  const order = (a: Candidate, b: Candidate) => Number(b.served) - Number(a.served) || a.q.id.localeCompare(b.q.id) || a.tr.locale.localeCompare(b.tr.locale);
  sel.candidates.sort(order);
  sel.ambiguous.sort(order);
  return sel;
}

/** A stable spread of `n` items: the ones whose id hashes lowest (FNV-1a), so a re-run shows the same rows. */
export function sampleOf<T>(items: readonly T[], n: number, idOf: (t: T) => string): T[] {
  const h = (s: string) => {
    let x = 0x811c9dc5;
    for (const ch of s) {
      x ^= ch.charCodeAt(0);
      x = Math.imul(x, 0x01000193) >>> 0;
    }
    return x;
  };
  return [...items].sort((a, b) => h(idOf(a)) - h(idOf(b))).slice(0, n);
}

// ── CLI ──────────────────────────────────────────────────────────────────

export interface Cli {
  apply: boolean;
  max: number | null;
  only: CorrectionSource[] | null;
  undoFile: string | null;
  logDir: string | null;
}

/** Parse argv (without node and the script). Refuses unknown flags, a flag without its value,
 *  --apply without --max, a --max that is not a positive whole number, an unknown source in
 *  --only, and --max / --only with --undo. */
export function parseCli(argv: readonly string[]): Cli {
  const known = new Set(["--apply", "--max", "--only", "--undo", "--log-dir"]);
  const takesValue = new Set(["--max", "--only", "--undo", "--log-dir"]);
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
  const logDir = values["--log-dir"] ?? null;
  if (undoFile) {
    if (values["--max"] !== undefined || values["--only"] !== undefined) throw new Error("--undo takes the log file only (the log says which rows it removed)");
    return { apply, max: null, only: null, undoFile, logDir };
  }
  let max: number | null = null;
  if (values["--max"] !== undefined) {
    if (!/^[1-9]\d*$/.test(values["--max"])) throw new Error(`--max needs a positive whole number, got ${JSON.stringify(values["--max"])}`);
    max = Number(values["--max"]);
  }
  let only: CorrectionSource[] | null = null;
  if (values["--only"] !== undefined) {
    const list = values["--only"].split(",").map((s) => s.trim()).filter(Boolean);
    const bad = list.filter((s) => !(SOURCES as readonly string[]).includes(s));
    if (bad.length || list.length === 0) throw new Error(`--only takes ${SOURCES.join(", ")} (comma-separated), got ${JSON.stringify(values["--only"])}`);
    only = [...new Set(list)] as CorrectionSource[];
  }
  if (apply && max === null) throw new Error("--apply needs --max <n> (how many cache rows to remove in this run)");
  return { apply, max, only, undoFile: null, logDir };
}

export function defaultLogDir(): string {
  return existsSync(MAIN_LOG_DIR) ? MAIN_LOG_DIR : FALLBACK_LOG_DIR;
}

// ── Write ────────────────────────────────────────────────────────────────

export interface LogEntry {
  row: TrRow;
  exam: string;
  served: boolean;
  source: CorrectionSource;
  kind: string;
  correctionAt: string;
  correctionAtFrom: AtFrom;
  oldKey: string | null;
  newKey: string;
}
export interface LogFile {
  script: string;
  kind: "apply" | "undo";
  startedAt: string;
  status: "pending" | "applied" | "failed";
  rule: string;
  max?: number;
  only?: CorrectionSource[] | null;
  undoOf?: string;
  entries: LogEntry[];
  error?: string;
}
export const RULE_TEXT =
  "cached translation written (createdAt) before a standing recorded change of its question's key or solution: a report-sweep correction note (time = the sweep's report resolve that day), an answer-check key move or solution replacement (validatedAt of that write, else factoryVerify.at), a bank fix (bankFix.at) or a hand re-key (its tag's day)";

/** The part of the Prisma client this script uses. The only write is on the translation cache. */
export interface TxDb {
  questionTranslation: {
    findMany(args: unknown): Promise<unknown[]>;
    deleteMany(args: unknown): Promise<{ count: number }>;
    createMany(args: unknown): Promise<{ count: number }>;
  };
}
export interface Db {
  question: { findMany(args: unknown): Promise<unknown[]> };
  questionReport: { findMany(args: unknown): Promise<unknown[]> };
  questionTranslation: TxDb["questionTranslation"];
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]): Promise<T>;
  $transaction<T>(fn: (tx: TxDb) => Promise<T>, opts?: { timeout?: number; maxWait?: number }): Promise<T>;
}

export function writeLog(path: string, log: LogFile) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(log, null, 1));
}

const chunks = <T>(xs: readonly T[], n = CHUNK): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += n) out.push(xs.slice(i, i + n));
  return out;
};
const jsonOrDbNull = (v: unknown) => (v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue));

async function readFull(db: Pick<TxDb, "questionTranslation">, ids: readonly string[]): Promise<Map<string, TrRow>> {
  const out = new Map<string, TrRow>();
  for (const part of chunks(ids)) {
    const rows = (await db.questionTranslation.findMany({ where: { id: { in: part } }, select: TR_SELECT })) as (Omit<TrRow, "createdAt"> & { createdAt: Date | string })[];
    for (const r of rows) out.set(r.id, trOf(r));
  }
  return out;
}

/** Removes the logged rows in one transaction. The log (status "pending") is on disk before it;
 *  a row changed or gone since the plan, or a delete that does not hit exactly the logged rows,
 *  marks the log "failed" and rethrows (nothing is written). */
export async function applyEntries(
  db: Db,
  entries: readonly LogEntry[],
  logPath: string,
  max: number,
  only: CorrectionSource[] | null,
  say: (s: string) => void = console.log,
): Promise<number> {
  const log: LogFile = { script: LOG_STEM, kind: "apply", startedAt: new Date().toISOString(), status: "pending", rule: RULE_TEXT, max, only, entries: [...entries] };
  writeLog(logPath, log); // before any write: if this throws, nothing is written
  let removed = 0;
  try {
    removed = await db.$transaction(
      async (tx) => {
        const now = await readFull(tx, entries.map((e) => e.row.id));
        for (const e of entries) {
          const cur = now.get(e.row.id);
          if (!cur || !sameTr(cur, e.row)) throw new Error(`translation ${e.row.id} (${e.row.locale}) of ${e.row.questionId} ${cur ? "changed" : "is gone"} since the plan — nothing written; re-run the dry run`);
        }
        let n = 0;
        for (const part of chunks(entries)) {
          // Conditional on the logged createdAt: every write of a cache row moves it.
          const r = await tx.questionTranslation.deleteMany({ where: { OR: part.map((e) => ({ id: e.row.id, createdAt: new Date(e.row.createdAt) })) } });
          if (r.count !== part.length) throw new Error(`a delete hit ${r.count} of ${part.length} logged rows — nothing written; re-run the dry run`);
          n += r.count;
        }
        return n;
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
    log.status = "applied";
  } catch (e) {
    log.status = "failed";
    log.error = (e as Error).message;
  }
  try {
    writeLog(logPath, log);
  } catch (e) {
    say(`Could not write the final log (${(e as Error).message}); the pending log at ${logPath} holds every row.`);
  }
  if (log.status === "failed") throw new Error(log.error);
  say(`\nAPPLIED: ${removed} cached translation(s) removed. Undo log: ${logPath}`);
  say(`Undo: npx tsx --env-file=.env.local scripts/${LOG_STEM}.ts --undo ${logPath.replace(/\\/g, "/")} --apply`);
  return removed;
}

/** Re-creates the rows of an applied (or pending) log. Dry run unless `apply`; the undo writes its own log first. */
export async function undo(db: Db, file: string, apply: boolean, logDir: string, say: (s: string) => void = console.log): Promise<{ recreated: number; kept: number; problems: string[] }> {
  const log = JSON.parse(readFileSync(file, "utf8")) as LogFile;
  // "pending": the run stopped between its commit and the log's last write — or before its commit.
  // Safe either way: a row is re-created only where the question has no translation in that language.
  if (log.script !== LOG_STEM || log.kind !== "apply" || (log.status !== "applied" && log.status !== "pending")) throw new Error(`${file} is not an applied log of ${LOG_STEM}`);
  say(`UNDO of ${file} (${log.entries.length} rows, ${log.status} ${log.startedAt}). ${apply ? "APPLY" : "DRY RUN"}\n`);
  const problems: string[] = [];
  const qIds = [...new Set(log.entries.map((e) => e.row.questionId))];
  const existingQ = new Set<string>();
  for (const part of chunks(qIds)) for (const q of (await db.question.findMany({ where: { id: { in: part } }, select: { id: true } })) as { id: string }[]) existingQ.add(q.id);
  const taken = new Set<string>();
  for (const part of chunks(qIds)) {
    for (const t of (await db.questionTranslation.findMany({ where: { questionId: { in: part } }, select: { questionId: true, locale: true, id: true } })) as { questionId: string; locale: string; id: string }[]) {
      taken.add(`${t.questionId}|${t.locale}`);
      taken.add(`id:${t.id}`);
    }
  }
  const recreate: LogEntry[] = [];
  let kept = 0;
  for (const e of log.entries) {
    if (!existingQ.has(e.row.questionId)) problems.push(`${e.row.questionId} ${e.row.locale}: question gone — not re-created`);
    else if (taken.has(`${e.row.questionId}|${e.row.locale}`) || taken.has(`id:${e.row.id}`)) {
      kept++;
      problems.push(`${e.row.questionId} ${e.row.locale}: translated again since the clear — the new translation is kept`);
    } else recreate.push(e);
  }
  say(`  re-create ${recreate.length} row(s); keep ${kept} newer translation(s); ${problems.length - kept} question(s) gone`);
  for (const p of problems.slice(0, 30)) say(`  ! ${p}`);
  if (problems.length > 30) say(`  ! … ${problems.length - 30} more`);
  if (!apply) {
    say("\nDry run — re-run with --apply to write.");
    return { recreated: 0, kept, problems };
  }
  const logPath = join(logDir, `${LOG_STEM}.undo.${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const undoLog: LogFile = { script: LOG_STEM, kind: "undo", startedAt: new Date().toISOString(), status: "pending", rule: RULE_TEXT, undoOf: file, entries: recreate };
  writeLog(logPath, undoLog);
  let recreated = 0;
  try {
    recreated = await db.$transaction(
      async (tx) => {
        let n = 0;
        for (const part of chunks(recreate)) {
          const r = await tx.questionTranslation.createMany({
            data: part.map((e) => ({
              id: e.row.id,
              questionId: e.row.questionId,
              locale: e.row.locale,
              body: e.row.body,
              options: e.row.options as Prisma.InputJsonValue,
              solution: e.row.solution,
              hints: jsonOrDbNull(e.row.hints),
              generator: e.row.generator,
              createdAt: new Date(e.row.createdAt),
            })),
          });
          if (r.count !== part.length) throw new Error(`created ${r.count} of ${part.length} — nothing written`);
          n += r.count;
        }
        return n;
      },
      { timeout: 120_000, maxWait: 20_000 },
    );
    undoLog.status = "applied";
  } catch (e) {
    undoLog.status = "failed";
    undoLog.error = (e as Error).message;
  }
  writeLog(logPath, undoLog);
  if (undoLog.status === "failed") throw new Error(undoLog.error);
  say(`\nUNDONE: ${recreated} translation(s) re-created. Log: ${logPath}`);
  return { recreated, kept, problems };
}

// ── Run ──────────────────────────────────────────────────────────────────

const oneLine = (s: string, max: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
};
const tail = (s: string, max: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > max ? `…${t.slice(t.length - max)}` : t;
};
const tally = <T>(xs: readonly T[], f: (x: T) => string) => {
  const m = new Map<string, number>();
  for (const x of xs) m.set(f(x), (m.get(f(x)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
};
const fmtTally = (t: [string, number][]) => (t.length ? t.map(([k, n]) => `${k} ${n.toLocaleString("en-IN")}`).join(" · ") : "—");
const fmtSec = (s: number | null) => (s === null ? "—" : s < 120 ? `${s.toFixed(1)} s` : s < 7200 ? `${(s / 60).toFixed(1)} min` : `${(s / 3600).toFixed(1)} h`);
const asOptions = (v: unknown): { key: string; text: string }[] =>
  Array.isArray(v) ? v.filter((o): o is { key: string; text: string } => isObj(o) && typeof o.key === "string" && typeof o.text === "string") : [];

export interface RunOpts {
  say?: (s: string) => void;
  logDir?: string;
}
export interface RunResult {
  selection: Selection | null;
  /** The rows this run removes (apply) or every selected row in --only's sources (dry run). */
  planned: number;
  applied: number;
}

export async function run(argv: readonly string[], db: Db, opts: RunOpts = {}): Promise<RunResult> {
  const cli = parseCli(argv);
  const say = opts.say ?? console.log;
  const logDir = cli.logDir ?? opts.logDir ?? defaultLogDir();
  if (cli.undoFile) {
    if (!existsSync(cli.undoFile)) throw new Error(`no such log: ${cli.undoFile}`);
    await undo(db, cli.undoFile, cli.apply, logDir, say);
    return { selection: null, planned: 0, applied: 0 };
  }

  // 1. Questions with a recorded key / solution change that still have cache rows (the pure rule re-checks every condition).
  const ids = (
    await db.$queryRaw<{ id: string }[]>(
      Prisma.sql`SELECT q.id FROM "Question" q
                  WHERE (q.solution LIKE '%[Correction 20%answer key corrected to%after student report%'
                         OR q.metadata->'factoryVerify'->>'keyCorrected' = 'true'
                         OR (q.metadata ? 'bankFix')
                         OR (q.metadata ? 'rekeyedBy'))
                    AND EXISTS (SELECT 1 FROM "QuestionTranslation" t WHERE t."questionId" = q.id)
                  ORDER BY q.id`,
    )
  ).map((r) => r.id);
  const questions: QRow[] = [];
  for (const part of chunks(ids)) questions.push(...((await db.question.findMany({ where: { id: { in: part } }, select: Q_SELECT })) as QRow[]));
  // 2. The sweep's resolves of their reports (time only: no reporter, no reason).
  const events: ResolveEvent[] = [];
  const swept = questions.filter((q) => sweepNotes(q.solution).length > 0).map((q) => q.id);
  for (const part of chunks(swept)) {
    events.push(
      ...((await db.questionReport.findMany({
        where: { questionId: { in: part }, resolvedBy: { in: [...SWEEP_RESOLVERS] } },
        select: { questionId: true, resolvedBy: true, resolvedAt: true },
      })) as ResolveEvent[]),
    );
  }
  // 3. Their cache rows (no text yet).
  const trs: TrMeta[] = [];
  for (const part of chunks(ids)) trs.push(...((await db.questionTranslation.findMany({ where: { questionId: { in: part } }, select: TR_META_SELECT })) as TrMeta[]));
  const sel = selectStale(questions, trs, events);
  const inScope = (x: Candidate) => !cli.only || cli.only.includes(x.correction.source);
  const c = sel.candidates;

  say(`Stale cached translations, other writers (14 Oct 2026) — ${cli.apply ? `APPLY, at most ${cli.max}${cli.only ? `, only ${cli.only.join(",")}` : ""}` : "DRY RUN (nothing is written)"}`);
  say(`Rule: ${RULE_TEXT}.\n`);
  say(`Questions read (a recorded change and at least one cache row): ${sel.questionsRead.toLocaleString("en-IN")}; with a standing change: ${fmtTally(Object.entries(sel.questionsWithChange).filter(([, n]) => n > 0) as [string, number][])}.`);
  say(`Their cache rows: ${sel.translationsOfThem.toLocaleString("en-IN")} — written AFTER every change (kept): ${sel.afterChange.toLocaleString("en-IN")}; BEFORE one (selected): ${c.length.toLocaleString("en-IN")}; ambiguous (inside a lower bound's window, not selected): ${sel.ambiguous.length}.`);
  say(`Selected: ${c.length.toLocaleString("en-IN")} rows on ${new Set(c.map((x) => x.q.id)).size.toLocaleString("en-IN")} questions; on served questions ${c.filter((x) => x.served).length.toLocaleString("en-IN")} rows (validated, not withdrawn).`);
  say(`  by source: ${fmtTally(tally(c, (x) => `${x.correction.source}/${x.correction.kind} (${x.correction.atFrom})`))}`);
  for (const s of SOURCES) {
    const xs = c.filter((x) => x.correction.source === s);
    if (xs.length) say(`  ${s}: ${xs.length} rows on ${new Set(xs.map((x) => x.q.id)).size} questions (${xs.filter((x) => x.served).length} rows served)`);
  }
  say(`  margin: nearest row BEFORE an exactly-timed change ${fmtSec(sel.nearestBeforeSec)}; nearest AFTER ${fmtSec(sel.nearestAfterSec)}.`);
  for (const a of sel.ambiguous) say(`  ? ${a.tr.id} ${a.tr.locale} q ${a.q.id}: written ${new Date(a.tr.createdAt).toISOString()}, ${a.correction.source} at ≥ ${a.correction.at.toISOString()} (${a.correction.atFrom}, window ${fmtSec(a.correction.windowMs / 1000)}) — read by hand`);
  for (const u of sel.untimed) say(`  ! ${u.questionId}: ${u.note} (${u.rows} cache row(s)) — not selected`);
  say(`Not selected: admin-editor edits (src/app/api/admin/questions/[id]/route.ts) — it recorded no edit time, field or audit row before 14 Oct, so a past edit cannot be timed; from 14 Oct it clears the cache itself.`);

  say(`\nBy language: ${fmtTally(tally(c, (x) => x.tr.locale))}`);
  say(`By generator: ${fmtTally(tally(c, (x) => x.tr.generator ?? "(none)"))}`);
  say(`By month written: ${fmtTally(tally(c, (x) => new Date(x.tr.createdAt).toISOString().slice(0, 7)))}`);
  say(`By change day: ${fmtTally(tally(c, (x) => x.correction.at.toISOString().slice(0, 10)))}`);
  const exams = tally(c, (x) => x.q.exam.code);
  say(`By exam (${exams.length} exams):`);
  for (let i = 0; i < exams.length; i += 6) say(`  ${exams.slice(i, i + 6).map(([k, n]) => `${k} ${n}`).join(" · ")}`);

  // 4. Full rows of the selection (the samples and the log need the text).
  const full = await readFull(db, c.map((x) => x.tr.id));
  say(`\n10 sample rows (stable pick):`);
  for (const x of sampleOf(c, 10, (y) => y.tr.id)) {
    const row = full.get(x.tr.id);
    const opts = asOptions(x.q.options);
    const optText = (k: string | null) => (k ? oneLine(opts.find((o) => o.key.toUpperCase() === k)?.text ?? "?", 40) : "?");
    say(`  ${x.tr.id} ${x.tr.locale} ${x.q.exam.code} q ${x.q.id}${x.served ? "" : " (not served)"}`);
    say(
      `     written ${new Date(x.tr.createdAt).toISOString().slice(0, 16)} · ${x.correction.source}/${x.correction.kind} ${x.correction.at.toISOString().slice(0, 16)} (${x.correction.atFrom}) · key ${x.correction.oldKey ? `${x.correction.oldKey} "${optText(x.correction.oldKey)}" → ` : ""}${x.correction.newKey} "${optText(x.correction.newKey)}"`,
    );
    if (row) say(`     translated solution ends: ${tail(row.solution, 160)}`);
    say(`     English solution now ends: ${tail(x.q.solution ?? "", 160)}`);
  }

  const eligible = c.filter(inScope);
  say(`\nCleared rows show English until the mock player / results page re-translate them on demand or the night pre-translation fills them; guest quiz and topic pages read the cache only.`);
  if (!cli.apply) {
    say(`\nDry run — nothing written. --apply --max <n> removes the first n of the ${eligible.length}${cli.only ? ` (only ${cli.only.join(",")})` : ""} (served first). Undo log goes to ${logDir}.`);
    return { selection: sel, planned: eligible.length, applied: 0 };
  }
  const take = eligible.slice(0, cli.max!);
  if (take.length === 0) {
    say("Nothing to remove.");
    return { selection: sel, planned: 0, applied: 0 };
  }
  const entries: LogEntry[] = [];
  for (const x of take) {
    const row = full.get(x.tr.id);
    if (!row) throw new Error(`translation ${x.tr.id} vanished between the read and the plan — nothing written; re-run`);
    entries.push({
      row,
      exam: x.q.exam.code,
      served: x.served,
      source: x.correction.source,
      kind: x.correction.kind,
      correctionAt: x.correction.at.toISOString(),
      correctionAtFrom: x.correction.atFrom,
      oldKey: x.correction.oldKey,
      newKey: x.correction.newKey,
    });
  }
  say(`\nRemoving ${entries.length} row(s).`);
  const logPath = join(logDir, `${LOG_STEM}.apply.${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const applied = await applyEntries(db, entries, logPath, cli.max!, cli.only, say);
  return { selection: sel, planned: entries.length, applied };
}

async function main() {
  const { prisma } = await import("../src/lib/db/prisma");
  try {
    await run(process.argv.slice(2), prisma as unknown as Db);
  } finally {
    await prisma.$disconnect();
  }
}

if (/clear-stale-translations-10-2026b\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
