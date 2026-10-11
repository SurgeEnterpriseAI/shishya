// scripts/restore-people-shaped-agents-2026-10.ts — put back to human the rows
// the hourly bot scrub's botnet rule tagged on PEOPLE-SHAPED user agents since
// the ChatGPT tag loss (11 Oct 2026, measurement build "after ChatGPT dropped
// link tags"; the rule, the evidence and the numbers: src/lib/botnet-release.ts).
//
// What it touches: AnalyticsEvent rows with client = 'bot' and a ua-sweep-*
// retroTag (the botnet rule's own tag — never a deep-reader, login-redirect or
// ingest-time bot row), created on or after --since (IST day, default
// 2026-10-09), whose user agent meets the botnet bar today AND is people-shaped
// (peopleShapedHavingSql: 40%+ of its pool rows on entry pages and under 20% at
// night). The write is the scrub's own restore: client = 'browser' and the
// retroTag key removed. Nothing is deleted or inserted.
//
// ORDER MATTERS. Apply only AFTER the patched scrub (patches/bot-scrub.patch of
// the build) is live. While the unpatched scrub runs hourly it still convicts
// these agents and re-tags every one of these rows within the hour. Once the
// patched scrub is live its own restore step flips these rows (and the same
// agents' older rows: 451 page views and 153 beacons back to 18 Aug, read 11
// Oct 2026) on its first run — so --apply is only for
// putting the 9 Oct+ rows back sooner, and the dry run is the audit of what the
// patch will move in the window (run it just before the deploy and keep --log).
//
// Undo: revert the bot-scrub patch — the next hourly run convicts these agents
// again and re-tags exactly these rows (ua-sweep-<that day>). The log keeps each
// row's id, kind and prior tag to check that.
//
// Guards: dry run by default (SELECT only); unknown flags are refused; --apply
// is refused without --after-scrub-patch; the undo log is written (status
// "pending") BEFORE the write; the write runs in one transaction and re-checks
// each row is still a ua-sweep bot row.
//
// USAGE (cwd = repo; via the heavy lock on this laptop):
//   npx tsx --env-file=.env.local scripts/restore-people-shaped-agents-2026-10.ts                       # dry run
//   npx tsx --env-file=.env.local scripts/restore-people-shaped-agents-2026-10.ts --log=<file.json>     # dry run + plan file
//   npx tsx --env-file=.env.local scripts/restore-people-shaped-agents-2026-10.ts --apply --after-scrub-patch   # write (never before the patch is live)
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { PrismaClient } from "@prisma/client";
import { entryPathSql } from "../src/lib/bot-scrub";
import { botnetAgentsSql } from "../src/lib/botnet-release";

interface Args {
  since: string;
  apply: boolean;
  afterPatch: boolean;
  log: string | null;
}

function parseArgs(argv: readonly string[]): Args {
  const out: Args = { since: "2026-10-09", apply: false, afterPatch: false, log: null };
  for (const a of argv) {
    if (a === "--apply") out.apply = true;
    else if (a === "--after-scrub-patch") out.afterPatch = true;
    else if (a.startsWith("--since=")) out.since = a.slice(8);
    else if (a.startsWith("--log=")) out.log = a.slice(6);
    else throw new Error(`unknown flag ${a}`);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out.since)) throw new Error("--since=YYYY-MM-DD (IST day)");
  if (out.apply && !out.afterPatch) {
    throw new Error("--apply needs --after-scrub-patch: before the patched scrub is live, the hourly scrub re-tags these rows within the hour");
  }
  return out;
}

// The rows, re-derived from the data at run time (never from a saved id list).
const PLAN_SQL = `
  WITH released AS (${botnetAgentsSql(entryPathSql("path"), "released")})
  SELECT e.id, e.kind::text AS kind, e.props->>'retroTag' AS tag, e."createdAt" AS at,
    ((e."createdAt" + interval '330 minutes')::date)::text AS day,
    CASE
      WHEN COALESCE(e.path,'') ~ '^(/(hi|te))?/exams/[A-Z][A-Z0-9_]*/?$' THEN 'hub'
      WHEN COALESCE(e.path,'') ~ '^(/(hi|te))?/exams/[A-Z][A-Z0-9_]*/pyq' THEN 'pyq'
      WHEN COALESCE(e.path,'') ~ '^(/(hi|te))?/exams/[A-Z][A-Z0-9_]*/(build-mock|quiz|mocks?)(/|$)' THEN 'practice'
      WHEN COALESCE(e.path,'') ~ '^(/(hi|te))?/exams/[A-Z][A-Z0-9_]*/topics/' THEN 'topic'
      ELSE 'other' END AS family,
    e."uaHash" AS ua
  FROM "AnalyticsEvent" e JOIN released r ON r.ua = e."uaHash"
  WHERE e.client = 'bot' AND e.props->>'retroTag' LIKE 'ua-sweep%'
    AND e."createdAt" >= ($1::date::timestamp - interval '330 minutes')
  ORDER BY e."createdAt"`;

interface PlanRow {
  id: string;
  kind: string;
  tag: string;
  at: Date;
  day: string;
  family: string;
  ua: string;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const p = new PrismaClient();
  try {
    const rows = await p.$queryRawUnsafe<PlanRow[]>(PLAN_SQL, args.since);
    const agents = new Set(rows.map((r) => r.ua));
    console.log(`${args.apply ? "APPLY" : "DRY RUN (SELECT only)"} — ua-sweep rows on people-shaped agents since ${args.since} IST`);
    console.log(`rows ${rows.length} (page views ${rows.filter((r) => r.kind === "PAGE_VIEW").length}, beacons ${rows.filter((r) => r.kind !== "PAGE_VIEW").length}) on ${agents.size} user agent(s)`);
    const byDay = new Map<string, Record<string, number>>();
    for (const r of rows) {
      const k = r.kind === "PAGE_VIEW" ? r.family : "beacon";
      const d = byDay.get(r.day) ?? {};
      d[k] = (d[k] ?? 0) + 1;
      byDay.set(r.day, d);
    }
    console.log("| IST day | hub | pyq | practice | topic | other page | beacons |");
    console.log("|---|---|---|---|---|---|---|");
    for (const [d, c] of [...byDay].sort()) {
      console.log(`| ${d} | ${c.hub ?? 0} | ${c.pyq ?? 0} | ${c.practice ?? 0} | ${c.topic ?? 0} | ${c.other ?? 0} | ${c.beacon ?? 0} |`);
    }
    const log = {
      script: "restore-people-shaped-agents-2026-10",
      kind: args.apply ? "apply" : "plan",
      since: args.since,
      at: new Date().toISOString(),
      status: args.apply ? "pending" : "dry-run",
      // Undo = revert the bot-scrub patch (see the header); these are the rows it re-tags.
      entries: rows.map((r) => ({ id: r.id, kind: r.kind, before: { client: "bot", retroTag: r.tag }, after: { client: "browser", retroTag: null } })),
    };
    const write = (path: string) => {
      if (!existsSync(dirname(path))) mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, JSON.stringify(log, null, 1));
    };
    if (!args.apply) {
      if (args.log) {
        write(args.log);
        console.log(`plan written: ${args.log}`);
      }
      console.log("Nothing written to the database.");
      return;
    }
    const logPath = args.log ?? `data/fix-logs/restore-people-shaped-agents-2026-10.${log.at.replace(/[:.]/g, "-")}.json`;
    write(logPath); // undo log BEFORE the write
    const ids = rows.map((r) => r.id);
    const n = await p.$transaction(async (tx) =>
      tx.$executeRawUnsafe(
        `UPDATE "AnalyticsEvent" SET client = 'browser', props = props - 'retroTag'
         WHERE id = ANY($1::text[]) AND client = 'bot' AND props->>'retroTag' LIKE 'ua-sweep%'`,
        ids,
      ),
    );
    log.status = n === ids.length ? "done" : `done (${n} of ${ids.length}; the rest changed since the plan)`;
    write(logPath);
    console.log(`restored ${n} of ${ids.length} rows; undo log ${logPath}`);
  } finally {
    await p.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
