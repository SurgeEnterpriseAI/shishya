// scripts/run-answer-key-watch-local.ts
//
// The daily answer-key / result check (mode "check": HTML only, no AI, $0),
// run from THIS machine for named exams (2 Oct 2026).
//
// Why: some official sites refuse every data-centre address, Indian ones
// included. From Vercel's Mumbai region (bom1) the 12:00 IST check of 2 Oct
// still got "fetch failed" from esb.mp.gov.in (MP_MPESB, MP_RAEO) and
// gsssb.gujarat.gov.in (GJ_GSSSB); the same fetcher on an Indian home
// connection read both in under half a second. This runs the SAME logic as
// /api/cron/answer-key-watch (src/lib/answer-key-watch-run.ts) with the same
// five-condition release gate, so what it writes is what the cron would.
//
// Dry by default: reports and writes nothing. --apply writes releases and
// marks the watches checked (and submits IndexNow for changed pages).
//
//   npx tsx --env-file=.env.local scripts/run-answer-key-watch-local.ts --only MP_MPESB,MP_RAEO,GJ_GSSSB
//   npx tsx --env-file=.env.local scripts/run-answer-key-watch-local.ts --only MP_MPESB,MP_RAEO,GJ_GSSSB --apply

import { CookieJar, fetchForWatch, runAnswerKeyWatch } from "../src/lib/answer-key-watch-run";
import * as db from "../src/lib/answer-key-watch-db";
import { prisma } from "../src/lib/db/prisma";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const only = (arg("--only") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (only.length === 0) throw new Error("--only CODE[,CODE…] is required: this runner is for the hosts the cron cannot reach");
  const apply = process.argv.includes("--apply");
  const now = new Date();
  const jar = new CookieJar();
  const report = await runAnswerKeyWatch(
    { mode: "check", dry: !apply, ai: false, maxUsd: 0 },
    {
      now,
      loadDue: () => db.loadDueInputs(prisma, now, only),
      loadWatches: (ids) => db.loadWatches(prisma, ids),
      loadKnown: (ids, watches) => db.loadKnownLinks(prisma, ids, watches),
      fetchUrl: (url, o) => fetchForWatch(url, { ...o, jar }),
      aiCheck: null, // mode "check" never calls AI; none is offered
      isStopError: () => false,
      ensureTables: () => db.ensureOfficialWatchTables(prisma),
      writeRelease: (args) => db.writeRelease(prisma, args),
      markChecked: (id, status) => db.markWatchChecked(prisma, id, status, now),
    },
  );
  console.log(JSON.stringify(report, null, 1));
  console.log(apply ? "APPLIED" : "dry run: nothing written (add --apply)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
