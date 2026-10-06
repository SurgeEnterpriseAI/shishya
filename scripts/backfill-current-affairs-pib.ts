// scripts/backfill-current-affairs-pib.ts — fill past current-affairs days
// that have no rows from PIB's own list of that day's releases (6 Oct 2026,
// build B2). No AI: nothing here calls a model, and nothing is written from
// model memory. Rules and guards: src/lib/current-affairs-pib.ts.
//
// For each day in the window with no CurrentAffair rows:
//   1. read PIB Delhi's English "All releases" page for that date (a GET for
//      the page's state, then its own postback with the day / month / year);
//      the page must show that date and its own count must match what was read;
//   2. read every listed release's page; keep it only when it was posted on
//      that date and its headline is the listed one;
//   3. at least MIN_BACKFILL_ITEMS kept → the day is filled with them
//      (headline, a summary line that only restates who issued and posted it
//      and when, category "PIB releases", the release link); otherwise the day
//      is left empty and the reason printed.
// Today (IST) and later are never touched: the daily cron writes today. Nor
// is a day on or after the newest day the daily digest has stored (the
// /current-affairs hub shows the newest day as "the day's most exam-relevant
// current affairs").
//
// Dry run by default (reads the DB and PIB, writes nothing; --out saves the
// plan). --apply writes only a plan file (--plan <the --out file>), so what is
// written is exactly what a person read: the file is re-checked row by row
// (checkPibPlanFile) and PIB is not read again. It writes the undo log
// data/fix-logs/backfill-current-affairs-pib.<time>.json (status "pending")
// BEFORE the first insert; each day is written in its own transaction under
// the same per-day lock the cron's writer takes, and only while the day still
// has no rows (all of the day's rows or none). --undo <log> lists every
// logged row still present exactly as written (a crash can commit a day
// before its result is logged); add --apply to delete exactly those rows (and
// log the undo). The script reads only www.pib.gov.in; a redirect to another
// host is refused.
//
// The next /api/cron/indexnow run (02:00 UTC) sends every day whose rows were
// written in its window, so filled days reach Bing without a separate ping;
// /sitemap.xml lists them with lastmod = the write time.
//
// Usage (DB reads through the lock, from D:/CodexProjects/shishya):
//   npx tsx --env-file=.env.local scripts/backfill-current-affairs-pib.ts [--from 2026-09-10] [--to 2026-10-05] [--dates d1,d2] [--out plan.json]
//   npx tsx --env-file=.env.local scripts/backfill-current-affairs-pib.ts --plan plan.json            (checks the file; writes nothing)
//   npx tsx --env-file=.env.local scripts/backfill-current-affairs-pib.ts --plan plan.json --apply
//   npx tsx --env-file=.env.local scripts/backfill-current-affairs-pib.ts --undo data/fix-logs/<log>.json [--apply]

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import {
  PIB_ALL_RELEASES_URL,
  PIB_CATEGORY,
  PIB_HOST,
  PIB_UA,
  checkPibPlanFile,
  listingProblem,
  newestDigestProblem,
  parsePibListing,
  parsePibRelease,
  pibPostbackForm,
  pibReleaseUrl,
  planPibDay,
  type PibDayPlan,
  type PibListing,
  type PibRelease,
} from "../src/lib/current-affairs-pib";
import { istDateStr } from "../src/lib/current-affairs-run";

export const DEFAULT_FROM = "2026-09-10";
export const LOG_DIR = "data/fix-logs";
const LOG_STEM = "backfill-current-affairs-pib";
const FETCH_TIMEOUT_MS = 45_000;

/** The subset of the Prisma client this script uses (raw SQL only). */
export interface Db {
  $queryRaw<T = unknown>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRawUnsafe(sql: string, ...values: unknown[]): Promise<number>;
  $transaction<T>(fn: (tx: Db) => Promise<T>, opts?: { maxWait?: number; timeout?: number }): Promise<T>;
}

export type Fetch = (url: string, init?: RequestInit) => Promise<Response>;

export interface Args {
  apply: boolean;
  from: string;
  to: string;
  dates: string[] | null;
  out: string | null;
  undo: string | null;
  /** A dry run's --out file: checked, and with --apply written exactly. */
  plan: string | null;
  concurrency: number;
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Parse the flags. Unknown flags, bad dates, a window reaching today, and
 *  --apply without a plan file (or with window flags beside one) are refused. */
export function parseArgs(argv: readonly string[], todayIst: string): Args {
  const yesterday = new Date(Date.parse(`${todayIst}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
  const a: Args = { apply: false, from: DEFAULT_FROM, to: yesterday, dates: null, out: null, undo: null, plan: null, concurrency: 3 };
  let windowFlag = false;
  const value = (i: number, flag: string) => {
    const v = argv[i + 1];
    if (!v || v.startsWith("--")) throw new Error(`${flag} needs a value`);
    return v;
  };
  for (let i = 0; i < argv.length; i++) {
    const f = argv[i];
    if (f === "--apply") a.apply = true;
    else if (f === "--from") {
      a.from = value(i++, f);
      windowFlag = true;
    } else if (f === "--to") {
      a.to = value(i++, f);
      windowFlag = true;
    } else if (f === "--dates") {
      a.dates = value(i++, f).split(",").map((s) => s.trim()).filter(Boolean);
      windowFlag = true;
    } else if (f === "--out") a.out = value(i++, f);
    else if (f === "--undo") a.undo = value(i++, f);
    else if (f === "--plan") a.plan = value(i++, f);
    else if (f === "--concurrency") a.concurrency = Number(value(i++, f));
    else throw new Error(`unknown flag ${f}`);
  }
  for (const d of [a.from, a.to, ...(a.dates ?? [])]) {
    if (!DAY_RE.test(d) || Number.isNaN(Date.parse(`${d}T00:00:00Z`))) throw new Error(`not a YYYY-MM-DD date: ${d}`);
  }
  if (a.to >= todayIst || (a.dates ?? []).some((d) => d >= todayIst)) {
    throw new Error(`only past days: today in IST is ${todayIst} and the daily cron writes it`);
  }
  if (a.from > a.to) throw new Error(`--from ${a.from} is after --to ${a.to}`);
  if (!Number.isInteger(a.concurrency) || a.concurrency < 1 || a.concurrency > 4) throw new Error("--concurrency is 1 to 4");
  if (a.plan && (windowFlag || a.out || a.undo)) throw new Error("--plan carries its own days: drop --from, --to, --dates, --out and --undo");
  if (a.apply && !a.undo && !a.plan) {
    throw new Error("--apply writes only a plan a person has read: run a dry run with --out plan.json, read it, then --plan plan.json --apply");
  }
  return a;
}

/** Every day from `from` to `to`, inclusive. */
export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let t = Date.parse(`${from}T00:00:00Z`); t <= Date.parse(`${to}T00:00:00Z`); t += 86_400_000) {
    out.push(new Date(t).toISOString().slice(0, 10));
  }
  return out;
}

/** A read that ended on another host than PIB's (a redirect): never retried, never used. */
class OffHostError extends Error {}

async function fetchText(fetchFn: Fetch, url: string, init: RequestInit = {}): Promise<{ status: number; text: string; cookies: string[] }> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchFn(url, { ...init, redirect: "follow", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
      // res.url is where the redirects ended ("" from a fake fetch in tests).
      const host = res.url ? new URL(res.url).hostname : new URL(url).hostname;
      if (host !== PIB_HOST) throw new OffHostError(`redirected off ${PIB_HOST} to ${host}`);
      const text = await res.text();
      if (res.status >= 500 && attempt === 0) {
        lastErr = new Error(`HTTP ${res.status}`);
      } else {
        const cookies = (res.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]);
        return { status: res.status, text, cookies };
      }
    } catch (err) {
      if (err instanceof OffHostError) throw err;
      lastErr = err;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

/** PIB's list for one past day: GET the page (its state and cookie), then post the day back. */
export async function readPibListing(fetchFn: Fetch, date: string): Promise<PibListing> {
  const get = await fetchText(fetchFn, PIB_ALL_RELEASES_URL, { headers: { "user-agent": PIB_UA } });
  if (get.status !== 200) throw new Error(`list page GET answered HTTP ${get.status}`);
  const post = await fetchText(fetchFn, PIB_ALL_RELEASES_URL, {
    method: "POST",
    headers: {
      "user-agent": PIB_UA,
      "content-type": "application/x-www-form-urlencoded",
      referer: PIB_ALL_RELEASES_URL,
      ...(get.cookies.length ? { cookie: get.cookies.join("; ") } : {}),
    },
    body: pibPostbackForm(get.text, date).toString(),
  });
  if (post.status !== 200) throw new Error(`list page postback answered HTTP ${post.status}`);
  return parsePibListing(post.text);
}

/** One release page, read and parsed; a failed read is kept as its error. */
async function readPibRelease(fetchFn: Fetch, prid: string): Promise<PibRelease | { error: string }> {
  try {
    const r = await fetchText(fetchFn, pibReleaseUrl(prid), { headers: { "user-agent": PIB_UA } });
    if (r.status !== 200) return { error: `HTTP ${r.status}` };
    return parsePibRelease(r.text);
  } catch (err) {
    return { error: String((err as Error)?.message ?? err).slice(0, 120) };
  }
}

/** Run `fn` over `items`, at most `n` at a time, in order of results. */
async function mapLimit<T, R>(items: readonly T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (next < items.length) {
        const i = next++;
        out[i] = await fn(items[i]);
      }
    }),
  );
  return out;
}

/** The newest date with a daily-digest (non-PIB) row; null when there is none. */
async function newestDigestDay(db: Db): Promise<string | null> {
  const [{ d }] = await db.$queryRaw<{ d: string | null }[]>`
    SELECT MAX(date)::text AS d FROM "CurrentAffair" WHERE category <> ${PIB_CATEGORY}`;
  return d ?? null;
}

/** Rows already stored per day in the window (days with none are absent). */
async function rowsPerDay(db: Db, from: string, to: string): Promise<Map<string, number>> {
  const rows = await db.$queryRaw<{ d: string; n: number }[]>`
    SELECT date::text AS d, COUNT(*)::int AS n FROM "CurrentAffair"
    WHERE date BETWEEN ${from}::date AND ${to}::date GROUP BY date`;
  return new Map(rows.map((r) => [r.d, Number(r.n)]));
}

/** Plan every missing day of the window (reads the DB and PIB; writes nothing). */
export async function planWindow(args: Args, deps: { db: Db; fetch: Fetch; todayIst: string; log: (s: string) => void }): Promise<PibDayPlan[]> {
  const window = args.dates ? [...new Set(args.dates)].sort() : daysBetween(args.from, args.to);
  const from = window[0];
  const to = window[window.length - 1];
  const existing = await rowsPerDay(deps.db, from, to);
  const newest = await newestDigestDay(deps.db);
  const missing = window.filter((d) => !existing.has(d));
  deps.log(`Window ${from} to ${to}: ${window.length} day(s), ${missing.length} with no rows: ${missing.join(", ") || "none"}`);
  deps.log(`Newest daily-digest day: ${newest ?? "none"} (no day on or after it is filled)`);
  const plans: PibDayPlan[] = [];
  for (const date of missing) {
    let listing: PibListing | null = null;
    let listingError: string | undefined;
    // A day the rules refuse whatever PIB says is not read at all.
    const refused = date >= deps.todayIst || newestDigestProblem(date, newest) !== null;
    if (!refused) {
      try {
        listing = await readPibListing(deps.fetch, date);
      } catch (err) {
        listingError = String((err as Error)?.message ?? err).slice(0, 160);
      }
    }
    const pages = new Map<string, PibRelease | { error: string }>();
    // Release pages are read only for a list that passed its own checks.
    if (listing && listingProblem(date, listing) === null) {
      const read = await mapLimit(listing.releases, args.concurrency, (r) => readPibRelease(deps.fetch, r.prid));
      listing.releases.forEach((r, i) => pages.set(r.prid, read[i]));
    }
    const plan = planPibDay({ date, todayIst: deps.todayIst, existingRows: existing.get(date) ?? 0, newestDigestDay: newest, listing, listingError, pages });
    plans.push(plan);
    deps.log(
      `${date}: ${plan.action === "fill" ? `FILL ${plan.rows.length} of ${plan.listed} PIB releases` : `LEAVE EMPTY (${plan.reason})`}` +
        (plan.dropped.length ? `; dropped ${plan.dropped.length}: ${summariseDrops(plan.dropped)}` : ""),
    );
  }
  return plans;
}

function summariseDrops(dropped: PibDayPlan["dropped"]): string {
  const by = new Map<string, number>();
  for (const d of dropped) by.set(d.reason, (by.get(d.reason) ?? 0) + 1);
  return [...by.entries()].map(([r, n]) => `${n} × ${r}`).join("; ");
}

interface LogRow {
  id: string;
  date: string;
  title: string;
  source: string;
}

interface ApplyLog {
  script: string;
  kind: "apply" | "undo";
  status: "pending" | "applied" | "failed";
  startedAt: string;
  finishedAt: string | null;
  source: string;
  /** The plan file this apply wrote. */
  plan?: string;
  undoOf?: string;
  days: { date: string; rows: LogRow[]; result: string | null }[];
}

const INSERT_SQL = `INSERT INTO "CurrentAffair" (id, date, title, summary, category, "examTags", "whyItMatters", source, "generatedAt")
  VALUES ($1, $2::date, $3, $4, $5, $6::text[], $7, $8, NOW())
  ON CONFLICT (date, title) DO NOTHING`;

/** Write the planned days: undo log first, then one transaction per day. */
export async function applyPlans(
  plans: readonly PibDayPlan[],
  deps: { db: Db; log: (s: string) => void; logDir: string; now: () => Date; writeFile?: (p: string, s: string) => void; planFile?: string },
): Promise<{ logPath: string | null; inserted: number }> {
  const fills = plans.filter((p) => p.action === "fill");
  if (fills.length === 0) {
    deps.log("Nothing to write: no day has a usable PIB list.");
    return { logPath: null, inserted: 0 };
  }
  const write =
    deps.writeFile ??
    ((p: string, s: string) => {
      mkdirSync(dirname(p), { recursive: true });
      writeFileSync(p, s, "utf8");
    });
  const startedAt = deps.now().toISOString();
  const logPath = join(deps.logDir, `${LOG_STEM}.${startedAt.replace(/[:.]/g, "-")}.json`);
  const withIds = fills.map((p) => ({ plan: p, rows: p.rows.map((r) => ({ ...r, id: randomUUID() })) }));
  const log: ApplyLog = {
    script: "scripts/backfill-current-affairs-pib.ts",
    kind: "apply",
    status: "pending",
    startedAt,
    finishedAt: null,
    source: PIB_ALL_RELEASES_URL,
    ...(deps.planFile ? { plan: deps.planFile } : {}),
    days: withIds.map(({ plan, rows }) => ({ date: plan.date, rows: rows.map((r) => ({ id: r.id, date: r.date, title: r.title, source: r.source })), result: null })),
  };
  const save = () => write(logPath, JSON.stringify(log, null, 2) + "\n");
  save(); // before the first insert
  let inserted = 0;
  try {
    for (const [i, { plan, rows }] of withIds.entries()) {
      const result = await deps.db.$transaction(
        async (tx) => {
          await tx.$queryRaw`SELECT 1 AS ok FROM (SELECT pg_advisory_xact_lock(hashtext(${`current-affairs-day:${plan.date}`}))) AS l`;
          const [{ n }] = await tx.$queryRaw<{ n: number }[]>`SELECT COUNT(*)::int AS n FROM "CurrentAffair" WHERE date = ${plan.date}::date`;
          if (Number(n) > 0) return { written: 0, note: `skipped: the day has ${n} row(s) now` };
          let written = 0;
          for (const r of rows) {
            written += await tx.$executeRawUnsafe(INSERT_SQL, r.id, r.date, r.title, r.summary, r.category, r.examTags, r.whyItMatters, r.source);
          }
          return { written, note: `inserted ${written}` };
        },
        { maxWait: 10_000, timeout: 60_000 },
      );
      inserted += result.written;
      log.days[i].result = result.note;
      save();
      deps.log(`${plan.date}: ${result.note}`);
    }
    log.status = "applied";
  } catch (err) {
    log.status = "failed";
    throw err;
  } finally {
    log.finishedAt = deps.now().toISOString();
    save();
  }
  return { logPath, inserted };
}

/** Undo an apply log: every logged row still present exactly as written; deleted only with --apply.
 *  Every row the log names is tried, whatever its day's result says: a crash
 *  can commit a day before its result is saved, and a row that was never
 *  inserted matches nothing (its id is this script's own random UUID). */
export async function undo(
  file: string,
  apply: boolean,
  deps: { db: Db; log: (s: string) => void; now: () => Date; readFile?: (p: string) => string; writeFile?: (p: string, s: string) => void },
): Promise<number> {
  const read = deps.readFile ?? ((p: string) => readFileSync(p, "utf8"));
  const write = deps.writeFile ?? ((p: string, s: string) => writeFileSync(p, s, "utf8"));
  const log = JSON.parse(read(file)) as ApplyLog;
  if (log.kind !== "apply" || log.script !== "scripts/backfill-current-affairs-pib.ts") throw new Error(`${file} is not an apply log of this script`);
  const rows = log.days.flatMap((d) => d.rows);
  deps.log(`UNDO of ${file}: ${rows.length} logged row(s). ${apply ? "APPLY" : "DRY RUN"}`);
  if (!apply) {
    let present = 0;
    for (const r of rows) {
      const [{ n }] = await deps.db.$queryRaw<{ n: number }[]>`
        SELECT COUNT(*)::int AS n FROM "CurrentAffair"
        WHERE id = ${r.id} AND date = ${r.date}::date AND title = ${r.title} AND source = ${r.source} AND category = ${PIB_CATEGORY}`;
      present += Number(n);
    }
    deps.log(`${present} of ${rows.length} are still present exactly as written. Add --apply to delete them.`);
    return 0;
  }
  const deleted = await deps.db.$transaction(
    async (tx) => {
      let n = 0;
      for (const r of rows) {
        n += await tx.$executeRawUnsafe(
          `DELETE FROM "CurrentAffair" WHERE id = $1 AND date = $2::date AND title = $3 AND source = $4 AND category = $5`,
          r.id,
          r.date,
          r.title,
          r.source,
          PIB_CATEGORY,
        );
      }
      return n;
    },
    { maxWait: 10_000, timeout: 60_000 },
  );
  const undone: ApplyLog = { ...log, kind: "undo", status: "applied", undoOf: file, startedAt: deps.now().toISOString(), finishedAt: deps.now().toISOString() };
  write(file.replace(/\.json$/, `.undone.${deps.now().toISOString().replace(/[:.]/g, "-")}.json`), JSON.stringify({ ...undone, deleted }, null, 2) + "\n");
  deps.log(`Deleted ${deleted} row(s).`);
  return deleted;
}

/** The whole run, with every outside effect passed in (tests use fakes). */
export async function run(
  argv: readonly string[],
  deps: { db: Db; fetch: Fetch; now: () => Date; log: (s: string) => void; logDir?: string; writeFile?: (p: string, s: string) => void; readFile?: (p: string) => string },
): Promise<{ plans: PibDayPlan[]; inserted: number; logPath: string | null }> {
  const todayIst = istDateStr(deps.now());
  const args = parseArgs(argv, todayIst);
  if (args.undo) {
    const n = await undo(args.undo, args.apply, deps);
    return { plans: [], inserted: -n, logPath: null };
  }
  if (args.plan) {
    // Write exactly the plan a person read: re-checked here, PIB not read again.
    const fills = checkPibPlanFile(JSON.parse((deps.readFile ?? ((p: string) => readFileSync(p, "utf8")))(args.plan)), {
      todayIst,
      newestDigestDay: await newestDigestDay(deps.db),
    });
    for (const p of fills) deps.log(`${p.date}: ${p.rows.length} row(s) in the plan file`);
    deps.log(`\nPlan file ${args.plan}: ${fills.length} day(s) to fill (${fills.reduce((s, p) => s + p.rows.length, 0)} rows); every row checked.`);
    if (!args.apply) {
      deps.log("Checked only: nothing written. Add --apply to write these rows and the undo log.");
      return { plans: fills, inserted: 0, logPath: null };
    }
    const r = await applyPlans(fills, { db: deps.db, log: deps.log, logDir: deps.logDir ?? LOG_DIR, now: deps.now, writeFile: deps.writeFile, planFile: args.plan });
    if (r.logPath) deps.log(`Undo: npx tsx --env-file=.env.local scripts/backfill-current-affairs-pib.ts --undo ${r.logPath.replace(/\\/g, "/")} --apply`);
    return { plans: fills, inserted: r.inserted, logPath: r.logPath };
  }
  const plans = await planWindow(args, { db: deps.db, fetch: deps.fetch, todayIst, log: deps.log });
  const fill = plans.filter((p) => p.action === "fill");
  deps.log(
    `\nPlan: ${fill.length} day(s) to fill (${fill.reduce((s, p) => s + p.rows.length, 0)} rows), ${plans.length - fill.length} left empty.`,
  );
  if (args.out) (deps.writeFile ?? ((p, s) => writeFileSync(p, s, "utf8")))(args.out, JSON.stringify({ todayIst, plans }, null, 2) + "\n");
  deps.log("Dry run: nothing written. Save the plan with --out plan.json, read it, then write it with --plan plan.json --apply.");
  return { plans, inserted: 0, logPath: null };
}

async function main() {
  const { prisma } = await import("../src/lib/db/prisma");
  try {
    await run(process.argv.slice(2), {
      db: prisma as unknown as Db,
      fetch: (url, init) => fetch(url, init),
      now: () => new Date(),
      log: (s) => console.log(s),
    });
  } finally {
    await prisma.$disconnect();
  }
}

if (/backfill-current-affairs-pib\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
