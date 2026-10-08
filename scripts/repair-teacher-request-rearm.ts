// scripts/repair-teacher-request-rearm.ts — teacher requests a student
// reopened BEFORE the re-arm fix, which the 24h SLA net never saw again
// (inbox fix B5, 7 Oct 2026).
//
// The gap: a student who reads the written answer and taps "I need more
// help" (NEED_MORE_HELP) reopens the request — status back to PENDING.
// Since 582b5f8 (18 Aug 2026) that tap also clears escalatedAt, the SLA
// cron's "needs an AI answer" flag (src/app/api/cron/teacher-request-sla/
// route.ts picks only escalatedAt IS NULL). A reopen BEFORE that commit
// kept the escalatedAt of the first AI answer, so the cron skipped the
// request for good: the student asked again and nobody answered. Known
// case: asked 15 Aug 20:59 IST, AI answer 16 Aug 22:10, reopened 17 Aug 05:12.
//
// What it does: finds every request rated NEED_MORE_HELP LATER than its
// escalatedAt (the reopen came after the last AI answer and the flag was
// never cleared) and re-arms the ones still waiting — status PENDING and
// nothing answered since the reopen (answeredAt before ratedAt: the cron's
// own rule, an AI answer never overwrites a teacher's fresh one) — by
// clearing escalatedAt, exactly what the feedback route does on a reopen
// today. Every other match is printed with the reason it is left alone.
//
// After --apply: the next SLA cron run (every 2 hours, at most 8 a run)
// writes a deeper AI answer on each re-armed request (one model call each),
// moves it to CONTACTED and emails the student the answer
// (src/lib/teacher-request-notify.ts); the team gets that run's summary mail.
//
// Never deletes and touches no other column (updatedAt included). The apply
// runs in one transaction; each row is re-read there and must still be a
// stuck reopen with the values the plan read, or nothing is written.
//
// Undo: --apply writes data/fix-logs/repair-teacher-request-rearm.<time>.json
// (status "pending" before the transaction, "applied" after; ids and
// timestamps only, no names). --undo <log> puts each row's escalatedAt back
// while the row is still waiting (escalatedAt still NULL, not answered
// since); a row the cron has answered in the meantime keeps its answer.
//
// Usage (repo root; .env.local is PRODUCTION):
//   npx tsx --env-file=.env.local scripts/repair-teacher-request-rearm.ts                    dry run
//   npx tsx --env-file=.env.local scripts/repair-teacher-request-rearm.ts --apply            re-arm + undo log
//   npx tsx --env-file=.env.local scripts/repair-teacher-request-rearm.ts --undo <log> [--apply]
// No model call and no email from this script.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const LOG_DIR = "data/fix-logs";
const LOG_STEM = "repair-teacher-request-rearm";
const IST_MS = 330 * 60_000;

/** The subset of the Prisma client this script uses (raw SQL only). */
export interface Db {
  $queryRaw<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
  $transaction<T>(fn: (tx: Db) => Promise<T>, opts?: { maxWait?: number; timeout?: number }): Promise<T>;
}

/** One TeacherRequest rated NEED_MORE_HELP after its escalatedAt. */
export interface Candidate {
  id: string;
  status: string;
  studentRating: string | null;
  createdAt: Date;
  escalatedAt: Date | null;
  ratedAt: Date | null;
  answeredAt: Date | null;
  answeredBy: string | null;
  examCode: string | null;
  surface: string;
  contactName: string | null;
  userName: string | null;
}

export interface LogEntry {
  id: string;
  examCode: string | null;
  status: string;
  /** ISO times as read before the write; escalatedAt is what --undo restores. */
  escalatedAt: string;
  ratedAt: string;
  answeredAt: string | null;
}

export interface LogFile {
  script: string;
  kind: "apply" | "undo";
  startedAt: string;
  status: "pending" | "applied" | "failed";
  undoOf?: string;
  entries: LogEntry[];
  error?: string;
}

/** Null = re-arm this request; else why it is left alone. */
export function leaveAloneReason(r: Candidate): string | null {
  if (r.studentRating !== "NEED_MORE_HELP" || !r.ratedAt || !r.escalatedAt || r.ratedAt.getTime() <= r.escalatedAt.getTime()) {
    return "not a reopen after the last AI answer";
  }
  if (r.status !== "PENDING") return `status ${r.status} (moved by the team after the reopen)`;
  if (r.answeredAt && r.answeredAt.getTime() >= r.ratedAt.getTime()) return `answered again since the reopen (${r.answeredBy ?? "unknown"})`;
  return null;
}

/** First name only — the dry run never prints a full name. */
export function firstName(r: Pick<Candidate, "contactName" | "userName">): string {
  const n = (r.contactName ?? "").trim() || (r.userName ?? "").trim();
  return n.split(/\s+/)[0] || "(no name)";
}

/** "2026-08-15 20:59 IST". */
export function ist(d: Date | null): string {
  if (!d) return "—";
  const s = new Date(d.getTime() + IST_MS).toISOString();
  return `${s.slice(0, 10)} ${s.slice(11, 16)} IST`;
}

const sameTime = (a: Date | null, b: Date | null) => (a?.getTime() ?? null) === (b?.getTime() ?? null);

async function readMatches(db: Db): Promise<Candidate[]> {
  return db.$queryRaw<Candidate[]>`
    SELECT tr.id, tr.status::text AS status, tr."studentRating", tr."createdAt", tr."escalatedAt",
           tr."ratedAt", tr."answeredAt", tr."answeredBy", tr."examCode", tr.surface,
           tr."contactName", u.name AS "userName"
    FROM "TeacherRequest" tr LEFT JOIN "User" u ON u.id = tr."userId"
    WHERE tr."studentRating" = 'NEED_MORE_HELP'
      AND tr."escalatedAt" IS NOT NULL AND tr."ratedAt" IS NOT NULL
      AND tr."ratedAt" > tr."escalatedAt"
    ORDER BY tr."createdAt" ASC`;
}

function describe(r: Candidate): string {
  return (
    `${r.id}  ${firstName(r)} · ${r.examCode ?? "no exam"} · from ${r.surface}\n` +
    `      asked ${ist(r.createdAt)} · AI answer ${ist(r.escalatedAt)} · reopened ${ist(r.ratedAt)} · status ${r.status}` +
    (r.answeredAt && !sameTime(r.answeredAt, r.escalatedAt) ? ` · last answer ${ist(r.answeredAt)} (${r.answeredBy ?? "?"})` : "")
  );
}

interface Deps {
  db: Db;
  now: () => Date;
  log: (s: string) => void;
  logDir?: string;
  writeFile?: (p: string, s: string) => void;
  readFile?: (p: string) => string;
}

function writer(deps: Deps) {
  return (
    deps.writeFile ??
    ((p: string, s: string) => {
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, s, "utf8");
    })
  );
}

const stamp = (d: Date) => d.toISOString().replace(/[:.]/g, "-");

async function apply(rearm: Candidate[], deps: Deps): Promise<string> {
  const write = writer(deps);
  const logPath = join(deps.logDir ?? LOG_DIR, `${LOG_STEM}.${stamp(deps.now())}.json`);
  const log: LogFile = {
    script: LOG_STEM,
    kind: "apply",
    startedAt: deps.now().toISOString(),
    status: "pending",
    entries: rearm.map((r) => ({
      id: r.id,
      examCode: r.examCode,
      status: r.status,
      escalatedAt: r.escalatedAt!.toISOString(),
      ratedAt: r.ratedAt!.toISOString(),
      answeredAt: r.answeredAt?.toISOString() ?? null,
    })),
  };
  write(logPath, JSON.stringify(log, null, 1) + "\n");
  try {
    await deps.db.$transaction(
      async (tx) => {
        for (const r of rearm) {
          const [now] = await tx.$queryRaw<Candidate[]>`
            SELECT tr.id, tr.status::text AS status, tr."studentRating", tr."createdAt", tr."escalatedAt",
                   tr."ratedAt", tr."answeredAt", tr."answeredBy", tr."examCode", tr.surface,
                   tr."contactName", NULL::text AS "userName"
            FROM "TeacherRequest" tr WHERE tr.id = ${r.id} FOR UPDATE`;
          const unchanged =
            !!now && leaveAloneReason(now) === null && now.status === r.status &&
            sameTime(now.escalatedAt, r.escalatedAt) && sameTime(now.ratedAt, r.ratedAt) && sameTime(now.answeredAt, r.answeredAt);
          if (!unchanged) throw new Error(`request ${r.id} changed while this run read it — nothing written; run the dry run again`);
          const n = await tx.$executeRaw`
            UPDATE "TeacherRequest" SET "escalatedAt" = NULL
            WHERE id = ${r.id} AND status = 'PENDING' AND "studentRating" = 'NEED_MORE_HELP' AND "escalatedAt" IS NOT NULL`;
          if (n !== 1) throw new Error(`request ${r.id}: expected 1 row updated, got ${n} — nothing written`);
        }
      },
      { maxWait: 10_000, timeout: 60_000 },
    );
    log.status = "applied";
  } catch (e) {
    log.status = "failed";
    log.error = (e as Error).message;
  }
  write(logPath, JSON.stringify(log, null, 1) + "\n");
  if (log.status === "failed") throw new Error(log.error);
  return logPath;
}

async function undo(file: string, doApply: boolean, deps: Deps): Promise<number> {
  const log = JSON.parse((deps.readFile ?? ((p: string) => readFileSync(p, "utf8")))(file)) as LogFile;
  if (log.script !== LOG_STEM || log.kind !== "apply" || log.status !== "applied") throw new Error(`${file} is not an applied log of ${LOG_STEM}`);
  deps.log(`UNDO of ${file} (${log.entries.length} request(s), applied ${log.startedAt}). ${doApply ? "APPLY" : "DRY RUN"}\n`);
  const steps: LogEntry[] = [];
  for (const e of log.entries) {
    const [row] = await deps.db.$queryRaw<Candidate[]>`
      SELECT tr.id, tr.status::text AS status, tr."studentRating", tr."createdAt", tr."escalatedAt",
             tr."ratedAt", tr."answeredAt", tr."answeredBy", tr."examCode", tr.surface,
             tr."contactName", NULL::text AS "userName"
      FROM "TeacherRequest" tr WHERE tr.id = ${e.id}`;
    if (!row) deps.log(`  ! ${e.id}: not found — skipped`);
    else if (row.escalatedAt) deps.log(`  ! ${e.id}: the SLA net has answered it since (escalatedAt ${ist(row.escalatedAt)}) — its answer stands, skipped`);
    else if (row.ratedAt?.toISOString() !== e.ratedAt || (row.answeredAt?.toISOString() ?? null) !== e.answeredAt) {
      deps.log(`  ! ${e.id}: rated or answered again since — skipped, check by hand`);
    } else {
      deps.log(`  RESTORE ${e.id}: escalatedAt NULL → ${e.escalatedAt}`);
      steps.push(e);
    }
  }
  if (!doApply) {
    deps.log(`\nDry run — ${steps.length} to restore. Add --apply to write.`);
    return 0;
  }
  if (steps.length === 0) {
    deps.log("\nNothing to restore.");
    return 0;
  }
  const write = writer(deps);
  const logPath = join(deps.logDir ?? LOG_DIR, `${LOG_STEM}.undo.${stamp(deps.now())}.json`);
  const undoLog: LogFile = { script: LOG_STEM, kind: "undo", startedAt: deps.now().toISOString(), status: "pending", undoOf: file, entries: steps };
  write(logPath, JSON.stringify(undoLog, null, 1) + "\n");
  // The ISO string cast to timestamp keeps its UTC wall time (the zone in
  // the literal is ignored for timestamp without time zone) — how Prisma stores it.
  const restored = await deps.db.$transaction(
    async (tx) => {
      let n = 0;
      for (const e of steps) {
        n += await tx.$executeRaw`
          UPDATE "TeacherRequest" SET "escalatedAt" = ${e.escalatedAt}::timestamp(3)
          WHERE id = ${e.id} AND "escalatedAt" IS NULL`;
      }
      return n;
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
  undoLog.status = "applied";
  write(logPath, JSON.stringify(undoLog, null, 1) + "\n");
  deps.log(`\nRestored ${restored} request(s). Log: ${logPath}`);
  return restored;
}

function argAfter(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

/** The whole run, every outside effect passed in (tests use fakes). */
export async function run(argv: readonly string[], deps: Deps): Promise<{ rearm: Candidate[]; left: Candidate[]; logPath: string | null }> {
  const doApply = argv.includes("--apply");
  const undoFile = argAfter(argv, "--undo");
  if (undoFile) {
    await undo(undoFile, doApply, deps);
    return { rearm: [], left: [], logPath: null };
  }
  const matches = await readMatches(deps.db);
  const rearm = matches.filter((r) => leaveAloneReason(r) === null);
  const left = matches.filter((r) => leaveAloneReason(r) !== null);
  deps.log(`Teacher requests rated NEED_MORE_HELP after their last AI answer, never re-armed: ${matches.length}\n`);
  deps.log(`RE-ARM (${rearm.length}) — clears escalatedAt; the next SLA cron run answers each again and emails the student:`);
  for (const r of rearm) deps.log(`  ${describe(r)}`);
  if (left.length) {
    deps.log(`\nLEFT ALONE (${left.length}):`);
    for (const r of left) deps.log(`  ${describe(r)}\n      → ${leaveAloneReason(r)}`);
  }
  if (!doApply) {
    deps.log(`\nDry run — nothing written. Add --apply to re-arm ${rearm.length} request(s) (undo log in ${deps.logDir ?? LOG_DIR}/).`);
    return { rearm, left, logPath: null };
  }
  if (rearm.length === 0) {
    deps.log("\nNothing to write.");
    return { rearm, left, logPath: null };
  }
  const logPath = await apply(rearm, deps);
  deps.log(`\nRE-ARMED ${rearm.length} request(s). Undo log: ${logPath}`);
  deps.log(`Undo: npx tsx --env-file=.env.local scripts/${LOG_STEM}.ts --undo ${logPath.replace(/\\/g, "/")} --apply`);
  return { rearm, left, logPath };
}

async function main() {
  const { prisma } = await import("../src/lib/db/prisma");
  try {
    await run(process.argv.slice(2), {
      db: prisma as unknown as Db,
      now: () => new Date(),
      log: (s) => console.log(s),
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (/repair-teacher-request-rearm\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
