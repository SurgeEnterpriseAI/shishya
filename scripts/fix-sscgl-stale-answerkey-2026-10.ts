// scripts/fix-sscgl-stale-answerkey-2026-10.ts — the stale answer-key row on
// the SSC CGL tracker (Release 1, 12 Oct 2026; growth plan of 10 Oct, rank 1).
//
// What is wrong (read 10 Oct 2026, SELECT only, and on the live page):
// /exams/SSC_CGL/updates is the 2026 cycle's tracker (notification 21 May
// 2026, Tier 1 30 Sep – 30 Oct 2026, cited to ssc.gov.in). Its key-dates
// strip shows "🔑 Answer key 17 Jun 2026 · Reported · Done" (and the hi
// twin "आंसर की 17 जून 2026 · रिपोर्टेड · हो चुका"); context.md lists it too.
// A student reads that as this cycle's key being out. It is not: the row is
// "SSC CGL 2025 Tier 2 Final Answer Key", the PREVIOUS cycle's key, written
// by the refresh generator on 10 Sep 2026 (source "ai-generated:claude")
// and cited only to an aggregator (mysarkarinaukri.com). The strip shows it
// because it picks the upcoming answer-key row, else the LATEST one
// (src/lib/exam-timeline.ts latestOfKind), and the refresh writer keeps it
// live on every run (a prior "official"-confidence row with a URL is kept
// unless re-confirmed: src/lib/exam-data-writer.ts).
//
// Two groups, each one row, found at run time by exam, kind, IST day, cited
// host and exact label — never by id alone:
//   jun17 — the row above (cmtuu72gt001cckp1f74mds7j on 10 Oct).
//   jan09 — "SSC CGL 2025 Tier 1 final answer key released", 9 Jan 2026,
//           cited to ssc.gov.in's HOME page (so its tier reads "official").
//           Also the previous cycle's key, and the next one the strip would
//           show once jun17 is gone: "Answer key 9 Jan 2026 · Official ·
//           Done". With both archived the strip says the 2026 key is not
//           announced yet, which is true. Founder's choice: --only jun17
//           archives only the row the plan named; --only both archives the
//           two (recommended; the dry run prints the strip for each).
// Every other SSC CGL row is left as it is (the 2025 cycle's result, Tier 2
// exam, FRTA and final result rows stay in the list as history; no strip
// card falls back to them).
//
// The write — archive + suppress, never delete: archivedAt = now and source =
// SUPPRESSED_SOURCE, so the refresh writer never re-creates an ANSWER_KEY row
// on that day (its suppressedKeys) and the hub's /archive page leaves it
// off. Kind, label, date, url, notes and confidence are kept; the undo log
// keeps the original source.
//
// Guards: dry run by default; --apply needs --only jun17|jan09|both; unknown
// flags are refused; --apply is refused unless the tracker still holds a
// 2026 Tier 1 EXAM row cited to an ssc.gov.in page — the reason the 2025
// keys are stale. On 10 Oct that row (cmuy4ttew002pgeszdyaeedm4, 30 Sep) is
// AI-made; its PDF, SSC's Important Notice of 12.09.2026, was read in the
// Release 1 review (by an agent, not a person): "Combined Graduate Level
// Examination, 2026 — Tier-I (CBE) — 30th September, 2026 to 30th October,
// 2026". The dry run never calls an AI-made row "official": it prints
// "cites the body's site; AI-made, unchecked" (citationWord), because nothing
// is official unless a person matched it to the notice. The strip preview
// prints the tier word the PAGE shows today.
// A row that is missing (already archived) or found twice is printed and
// skipped, never guessed; the undo log is written
// (status "pending") BEFORE the first write; the writes run in one
// transaction, each row re-read inside it, and the run stops if any row
// changed since the plan. No delete call anywhere.
//
// Undo: --apply writes data/fix-logs/fix-sscgl-stale-answerkey-2026-10.<group>.<time>.json
// with every row's fields before and after; --undo <that file> is a dry run
// of the undo, --undo <file> --apply puts the rows back and logs the undo.
// The tracker reads the change within 30 minutes (ISR), context.md within
// its cache.
//
// IndexNow after the apply (the dry run prints the list):
// /exams/SSC_CGL/updates, /hi/exams/SSC_CGL/updates, /te/exams/SSC_CGL/updates
// and /exams/SSC_CGL/context.md. The hub (/exams/SSC_CGL) does not print
// either row (checked on the live page, 10 Oct); the exam-week pages show
// "Answer key: not announced yet" already (they read the upcoming key only).
//
// USAGE (from D:\CodexProjects\shishya; .env.local is PRODUCTION):
//   npx tsx --env-file=.env.local scripts/fix-sscgl-stale-answerkey-2026-10.ts                      # dry run, both groups
//   npx tsx --env-file=.env.local scripts/fix-sscgl-stale-answerkey-2026-10.ts --apply --only both  # write (or --only jun17)
//   npx tsx --env-file=.env.local scripts/fix-sscgl-stale-answerkey-2026-10.ts --undo data/fix-logs/<file>.json [--apply]

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SUPPRESSED_SOURCE, buildTimeline, fmtDay, isoDay, latestOfKind, resolveKind, rowCitation, upcomingOfKind, type TimelineRow } from "../src/lib/exam-timeline";
import { sourceTier } from "../src/lib/official-source";

export const EXAM = "SSC_CGL";
export const LOG_DIR = "data/fix-logs";
export const LOG_STEM = "fix-sscgl-stale-answerkey-2026-10";
/** The refresh writer's provenance tag (src/lib/exam-data-writer.ts GEN_SOURCE;
 *  not imported, so this script does not load the IndexNow module). */
export const GEN_SOURCE = "ai-generated:claude";
/** The cycle the tracker is on (notification 21 May 2026, Tier 1 30 Sep – 30 Oct 2026). */
export const CURRENT_CYCLE_YEAR = 2026;
export const SITE = "https://shishya.in";

export const GROUPS = ["jun17", "jan09"] as const;
export type Group = (typeof GROUPS)[number];

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

export interface Target {
  group: Group;
  /** IST calendar day, YYYY-MM-DD. */
  day: string;
  /** Cited hosts (no www.) the row may carry. */
  hosts: readonly string[];
  /** The row's whole label. */
  label: RegExp;
  why: string;
}

export const TARGETS: readonly Target[] = [
  {
    group: "jun17",
    day: "2026-06-17",
    hosts: ["mysarkarinaukri.com"],
    label: /^SSC CGL 2025 Tier 2 Final Answer Key$/i,
    why: "The 2025 cycle's Tier 2 final answer key, cited only to an aggregator. On the 2026 tracker the key-dates strip shows it as \"Answer key 17 Jun 2026 · Reported · Done\" while Tier 1 2026 runs 30 Sep – 30 Oct and its key is not out.",
  },
  {
    group: "jan09",
    day: "2026-01-09",
    hosts: ["ssc.gov.in"],
    label: /^SSC CGL 2025 Tier 1 final answer key released$/i,
    why: "The 2025 cycle's Tier 1 final answer key (cited to ssc.gov.in's home page). With jun17 archived, the strip would show it instead: \"Answer key 9 Jan 2026 · Official · Done\" — the same wrong answer for the 2026 cycle.",
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
const kindOf = (r: Pick<Row, "kind" | "label" | "isExamDay">) => resolveKind({ kind: r.kind, label: r.label, isExamDay: r.isExamDay });

/** The SSC CGL cycle years a label names ("SSC CGL 2025 Tier 2 …" → [2025]). */
export function labelCycleYears(label: string): number[] {
  return [...label.matchAll(/\bCGL\s*(?:-\s*)?(20\d{2})\b/gi)].map((m) => Number(m[1]));
}

/** A live, generated answer-key row whose label names only SSC CGL cycles
 *  before `cycleYear` — a previous cycle's key on this cycle's tracker. */
export function isPreviousCycleKey(r: Row, cycleYear: number = CURRENT_CYCLE_YEAR): boolean {
  if (r.archivedAt) return false;
  if (kindOf(r) !== "ANSWER_KEY") return false;
  // Only the generator's rows: a curated or official-watch row is a person's
  // or our own fetch's reading, never this script's to archive.
  if (r.source !== GEN_SOURCE) return false;
  const years = labelCycleYears(r.label);
  return years.length > 0 && years.every((y) => y < cycleYear);
}

export function matchesTarget(r: Row, t: Target): boolean {
  return isPreviousCycleKey(r) && isoDay(r.date) === t.day && t.hosts.includes(hostOf(rowCitation(r))) && t.label.test(r.label);
}

export interface TargetPick {
  target: Target;
  row: Row;
}

/** One row per target, or a problem line: none found (already archived?) or
 *  more than one (never guessed). */
export function selectTargets(rows: readonly Row[], groups: readonly Group[]): { picks: TargetPick[]; problems: string[] } {
  const picks: TargetPick[] = [];
  const problems: string[] = [];
  for (const t of TARGETS.filter((x) => groups.includes(x.group))) {
    const found = rows.filter((r) => matchesTarget(r, t));
    if (found.length === 1) picks.push({ target: t, row: found[0] });
    else if (found.length === 0) problems.push(`${t.group}: no live generated ANSWER_KEY row on ${t.day} cited to ${t.hosts.join(", ")} with label ${t.label} — nothing to do (already archived?)`);
    else problems.push(`${t.group}: ${found.length} rows match (${found.map((r) => r.id).join(", ")}) — skipped, never guessed`);
  }
  return { picks, problems };
}

/** Live previous-cycle keys that no target names (printed, never written). */
export function otherPreviousCycleKeys(rows: readonly Row[]): Row[] {
  return rows.filter((r) => isPreviousCycleKey(r) && !TARGETS.some((t) => matchesTarget(r, t)));
}

/** The 2026 cycle's evidence: a live EXAM row whose citation is on
 *  ssc.gov.in (citation tier "official" — the citation only; the row may be
 *  AI-made, see citationWord), whose label names no cycle before
 *  CURRENT_CYCLE_YEAR, and which is dated in that year AFTER every target's
 *  day — an exam held after the key, so the key cannot be its key. (The
 *  2025 cycle's Tier 2 exam, 18 Jan 2026, is dated in 2026 but names 2025.)
 *  Without it the 2025 keys are not shown to be stale, and --apply is
 *  refused. */
export function currentCycleExamRow(rows: readonly Row[], officialUrl: string | null): Row | null {
  const lastTargetDay = TARGETS.map((t) => t.day).reduce((a, b) => (a > b ? a : b));
  return (
    rows.find(
      (r) =>
        !r.archivedAt &&
        kindOf(r) === "EXAM" &&
        r.date.getUTCFullYear() === CURRENT_CYCLE_YEAR &&
        isoDay(r.date) > lastTargetDay &&
        labelCycleYears(r.label).every((y) => y >= CURRENT_CYCLE_YEAR) &&
        hostOf(rowCitation(r)) === "ssc.gov.in" &&
        sourceTier(r.confidence, rowCitation(r), officialUrl) === "official",
    ) ?? null
  );
}

/** The tracker's answer-key card, as /exams/{code}/updates picks it
 *  (upcoming, else latest). */
export function answerKeyCard(rows: readonly Row[], now: Date, officialUrl: string | null): string {
  const tl: TimelineRow[] = buildTimeline(rows.filter((r) => !r.archivedAt), now, officialUrl);
  const card = upcomingOfKind(tl, "ANSWER_KEY") ?? latestOfKind(tl, "ANSWER_KEY");
  if (!card) return "Answer key: not announced yet";
  const status = card.status === "done" ? "Done" : card.status === "today" ? "Today" : `in ${card.daysFromToday} days`;
  return `Answer key ${fmtDay(card.date)} · ${card.tier} · ${status}  ("${card.label}")`;
}

// ── Fields, plan, simulate ───────────────────────────────────────────────

export interface Fields {
  label: string;
  kind: string | null;
  isExamDay: boolean;
  source: string | null;
  notes: string | null;
  confidence: string | null;
  url: string | null;
  archivedAt: string | null;
}
export const fieldsOf = (r: Row): Fields => ({
  label: r.label,
  kind: r.kind,
  isExamDay: r.isExamDay,
  source: r.source,
  notes: r.notes,
  confidence: r.confidence,
  url: r.url,
  archivedAt: r.archivedAt ? r.archivedAt.toISOString() : null,
});
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
export const sameFields = (a: Fields, b: Fields) => (Object.keys(a) as (keyof Fields)[]).every((k) => a[k] === b[k]);

export interface Planned {
  group: Group;
  rowId: string;
  before: Fields;
  after: Fields;
  why: string;
}

export function plan(picks: readonly TargetPick[], now: Date): Planned[] {
  return picks.map(({ target, row }) => {
    const before = fieldsOf(row);
    return { group: target.group, rowId: row.id, before, after: { ...before, archivedAt: now.toISOString(), source: SUPPRESSED_SOURCE }, why: target.why };
  });
}

/** The rows as they would be after the plan (for the card preview). */
export function simulate(rows: readonly Row[], planned: readonly Planned[], now: Date): Row[] {
  const ids = new Set(planned.map((p) => p.rowId));
  return rows.map((r) => (ids.has(r.id) ? { ...r, archivedAt: now, source: SUPPRESSED_SOURCE } : r));
}

export function indexNowUrls(): string[] {
  return [
    `${SITE}/exams/${EXAM}/updates`,
    `${SITE}/hi/exams/${EXAM}/updates`,
    `${SITE}/te/exams/${EXAM}/updates`,
    `${SITE}/exams/${EXAM}/context.md`,
  ];
}

// ── CLI ──────────────────────────────────────────────────────────────────

export interface Cli {
  apply: boolean;
  groups: Group[];
  only: Group | "both";
  undoFile: string | null;
  log: string | null;
}

/** Parse argv (without node and the script). Refuses unknown flags and
 *  --apply without --only. */
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
    if (values["--only"]) throw new Error("--undo takes the log file only (the log says which rows it archived)");
    return { apply, groups: [], only: "both", undoFile, log: null };
  }
  const raw = values["--only"] ?? (apply ? "" : "both");
  if (!["both", ...GROUPS].includes(raw)) throw new Error(`--apply needs --only ${[...GROUPS, "both"].join(" | ")} (say which rows)`);
  const only = raw as Group | "both";
  return { apply, groups: only === "both" ? [...GROUPS] : [only], only, undoFile: null, log: values["--log"] ?? null };
}

// ── Write ────────────────────────────────────────────────────────────────

export interface LogEntry {
  group: Group;
  exam: string;
  rowId: string;
  before: Fields;
  after: Fields;
  why: string;
}
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

/** The part of the Prisma client this script uses (no delete). */
export interface TxDb {
  examImportantDate: {
    findMany(args: unknown): Promise<unknown[]>;
    findUnique(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
}
export interface Db extends TxDb {
  exam: { findUnique(args: unknown): Promise<unknown> };
  $transaction<T>(fn: (tx: TxDb) => Promise<T>, opts?: { timeout?: number }): Promise<T>;
}

export function writeLog(path: string, log: LogFile) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(log, null, 1));
}

/** Writes the plan in one transaction. The log (status "pending") is on disk
 *  before the first write; a write error marks it "failed" and rethrows. */
export async function applyPlanned(db: Db, planned: readonly Planned[], logPath: string, only: string, say: (s: string) => void = console.log) {
  const entries: LogEntry[] = planned.map((p) => ({ group: p.group, exam: EXAM, rowId: p.rowId, before: p.before, after: p.after, why: p.why }));
  const log: LogFile = { script: LOG_STEM, kind: "apply", startedAt: new Date().toISOString(), status: "pending", only, entries };
  writeLog(logPath, log); // before any write: if this throws, nothing is written
  try {
    await db.$transaction(
      async (tx) => {
        for (const p of planned) {
          const now = (await tx.examImportantDate.findUnique({ where: { id: p.rowId }, select: ROW_SELECT })) as Row | null;
          if (!now || !sameFields(fieldsOf(now), p.before)) throw new Error(`row ${p.rowId} changed since the plan — nothing written; re-run the dry run`);
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
  const steps: { entry: LogEntry; current: Fields }[] = [];
  const problems: string[] = [];
  for (const e of [...log.entries].reverse()) {
    const r = (await db.examImportantDate.findUnique({ where: { id: e.rowId }, select: ROW_SELECT })) as Row | null;
    if (!r) {
      problems.push(`${e.rowId}: row not found — skipped`);
      continue;
    }
    const current = fieldsOf(r);
    if (!sameFields(current, e.after)) {
      problems.push(`${e.rowId}: changed since this script wrote it — skipped, check by hand`);
      continue;
    }
    steps.push({ entry: e, current });
  }
  for (const s of steps) {
    say(`  RESTORE ${s.entry.exam} ${s.entry.rowId} [${s.entry.group}]`);
    for (const k of Object.keys(s.current) as (keyof Fields)[]) {
      if (s.current[k] !== s.entry.before[k]) say(`      ${k}: ${JSON.stringify(s.current[k])} → ${JSON.stringify(s.entry.before[k])}`);
    }
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
    entries: steps.map((s) => ({ group: s.entry.group, exam: s.entry.exam, rowId: s.entry.rowId, before: s.current, after: s.entry.before, why: `undo of ${file}` })),
  };
  writeLog(logPath, undoLog);
  try {
    await db.$transaction(
      async (tx) => {
        for (const s of steps) {
          const r = (await tx.examImportantDate.findUnique({ where: { id: s.entry.rowId }, select: ROW_SELECT })) as Row | null;
          if (!r || !sameFields(fieldsOf(r), s.current)) throw new Error(`row ${s.entry.rowId} changed during the undo — nothing written`);
          await tx.examImportantDate.update({ where: { id: s.entry.rowId }, data: updateData(s.entry.before) });
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

/** What a row's citation supports, said plainly. An AI-made row
 *  ("ai-generated…" source) whose citation is the body's site is never called
 *  "official" here: nothing is official unless a person matched it to the
 *  notice (founder rule). Other rows keep their citation tier. */
export function citationWord(r: Pick<Row, "confidence" | "url" | "source">, officialUrl: string | null): string {
  const tier = sourceTier(r.confidence, rowCitation(r), officialUrl);
  if (tier === "official" && /^ai-generated(?::|$)/i.test((r.source ?? "").trim())) return "cites the body's site; AI-made, unchecked";
  return tier;
}

function showRow(r: Row, officialUrl: string | null): string {
  return `${isoDay(r.date)} ${kindOf(r).padEnd(17)} ${citationWord(r, officialUrl).padEnd(8)} "${r.label}" ${rowCitation(r) ?? ""} [${r.source ?? "no source"}] ${r.id}`;
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

  const { picks, problems } = selectTargets(live, cli.groups);
  const planned = plan(picks, now);
  const cycleRow = currentCycleExamRow(live, officialUrl);

  say(`${EXAM} stale answer-key rows — groups: ${cli.only}. ${cli.apply ? "APPLY" : "DRY RUN (nothing is written)"}`);
  say(`Portal ${officialUrl ?? "(none)"}; ${live.length} live rows; planned ${planned.length}; problems ${problems.length}.\n`);
  say(`2026 cycle evidence: ${cycleRow ? showRow(cycleRow, officialUrl) : "NONE — no live 2026 Tier 1 EXAM row cited to ssc.gov.in"}`);
  say("\nLive ANSWER_KEY rows:");
  for (const r of live.filter((x) => kindOf(x) === "ANSWER_KEY")) say(`  ${planned.some((p) => p.rowId === r.id) ? "*" : " "} ${showRow(r, officialUrl)}`);
  if (planned.length) {
    say("\nCHANGES (before → after):");
    for (const p of planned) {
      say(`  - ARCHIVE + SUPPRESS [${p.group}] ${p.rowId}`);
      for (const k of Object.keys(p.before) as (keyof Fields)[]) if (p.before[k] !== p.after[k]) say(`      ${k}: ${JSON.stringify(p.before[k])} → ${JSON.stringify(p.after[k])}`);
      say(`      why: ${p.why}`);
    }
  }
  for (const p of problems) say(`  ! ${p}`);
  const others = otherPreviousCycleKeys(live);
  if (others.length) {
    say("\nOther live previous-cycle answer-key rows (NOT touched by this script):");
    for (const r of others) say(`  = ${showRow(r, officialUrl)}`);
  }

  // The strip's answer-key card for each choice.
  const all = plan(selectTargets(live, [...GROUPS]).picks, now);
  const juneOnly = all.filter((p) => p.group === "jun17");
  say("\nTRACKER KEY-DATES STRIP, answer-key card (/exams/SSC_CGL/updates), with the tier word the page prints:");
  say(`  now:                 ${answerKeyCard(live, now, officialUrl)}`);
  say(`  after --only jun17:  ${answerKeyCard(simulate(live, juneOnly, now), now, officialUrl)}`);
  say(`  after --only both:   ${answerKeyCard(simulate(live, all, now), now, officialUrl)}`);
  say(`  after this run:      ${answerKeyCard(simulate(live, planned, now), now, officialUrl)}`);

  say(`\nINDEXNOW after the apply (${indexNowUrls().length} URLs):`);
  for (const u of indexNowUrls()) say(`  ${u}`);
  say("");

  if (!cli.apply) {
    say(`Dry run — nothing written. Write with --apply --only ${[...GROUPS, "both"].join(" | ")}.`);
    return { planned, problems, applied: false };
  }
  if (!cycleRow) throw new Error("REFUSED — the tracker holds no live 2026 EXAM row cited to ssc.gov.in, so the 2025 keys are not shown to be stale; read the rows by hand.");
  if (planned.length === 0) {
    say("Nothing to write.");
    return { planned, problems, applied: false };
  }
  const logPath = cli.log ?? join(logDir, `${LOG_STEM}.${cli.only}.${now.toISOString().replace(/[:.]/g, "-")}.json`);
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

if (/fix-sscgl-stale-answerkey-2026-10\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
