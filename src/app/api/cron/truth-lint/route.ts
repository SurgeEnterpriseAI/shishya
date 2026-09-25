// GET /api/cron/truth-lint — on-demand honesty scan of the public site
// (13 Sep 2026). Runs src/lib/truth-lint.ts over every active exam's hub,
// tracker, cutoff, score-estimate and context.md plus /, /llms.txt and
// /llms-full.txt, and notifies the admins in-app when anything fails:
// forbidden trust phrases, stale counts, passed estimates shown as Done,
// title dates without their tier word, hub titles saying "Not Announced
// Yet" after an announced exam held in the last 60 days, expected answer
// keys, estimator schemes beside their own refusal, bare cutoff numbers in
// FAQ JSON-LD.
//
// It scans the LIVE site (TRUTH_LINT_BASE, default https://shishya.in) —
// never NEXT_PUBLIC_APP_URL, which is localhost in development. A scan
// that reaches fewer than half its pages is itself a failure: a silent
// "0 findings" on an unreachable site would read as a clean bill.
//
// Read-only against the site (plain GETs with the ShishyaTruthLint UA);
// the only write is one Notification per admin per IST day when it fails.
// `?dry=1` returns the report without notifying.
// Auth: Bearer ${CRON_SECRET}. NOT scheduled: vercel.json has no entry for
// this route (f1f8e4b; founder rule, 13 Sep 2026: no monitoring crons), so
// it runs only when called — curl with the Bearer header (add ?dry=1), or
// run the same checks locally: npx tsx scripts/truth-lint.ts --all.
// (Comment corrected 16 Sep 2026; it used to claim a 03:00 IST schedule.)

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { createNotification } from "@/lib/db/notifications";
import { examCodesFromLlmsFull, runTruthLint } from "@/lib/truth-lint";
import { INDIAN_LANGUAGE_COUNT, OTHER_INDIAN_LANGUAGE_COUNT } from "@/lib/languages";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return json({ error: "CRON_SECRET not configured" }, 500);
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) return json({ error: "unauthorized" }, 401);

  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const base = (process.env.TRUTH_LINT_BASE ?? "https://shishya.in").replace(/\/+$/, "");

  // Every active exam, in the order llms-full lists them; fall back to the DB.
  let codes: string[] = [];
  try {
    const res = await fetch(`${base}/llms-full.txt`, { headers: { "user-agent": "ShishyaTruthLint/1.0 (+https://shishya.in; bot)" } });
    if (res.status === 200) codes = examCodesFromLlmsFull(await res.text());
  } catch {
    /* fall back below */
  }
  if (codes.length === 0) {
    // 25 Sep 2026: real exams only — school class containers have no exam pages to lint.
    const rows = await prisma.exam.findMany({ where: REAL_EXAM_WHERE, select: { code: true }, orderBy: { candidatesPerYear: "desc" } });
    codes = rows.map((r) => r.code);
  }

  const report = await runTruthLint({
    base,
    codes,
    concurrency: 6,
    timeoutMs: 20_000,
    // Leave headroom under maxDuration; exams not started by then are
    // reported as skipped (truncated: true) — scan them with the CLI.
    budgetMs: 230_000,
    languageCounts: { indian: INDIAN_LANGUAGE_COUNT, other: OTHER_INDIAN_LANGUAGE_COUNT },
  });

  const fails = report.findings.filter((f) => f.severity === "fail");
  const unreachable = report.pages > 0 && report.fetched < report.pages / 2;
  const problems: string[] = [];
  if (unreachable) problems.push(`• the scan reached only ${report.fetched} of ${report.pages} pages on ${base} — the check did not run`);
  for (const f of fails.slice(0, 5)) problems.push(`• ${f.check}: ${f.url.replace(base, "")} — ${f.detail}`.slice(0, 220));

  let notified = 0;
  if (!dry && problems.length > 0) {
    const emails = (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    if (emails.length > 0) {
      const admins = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "User" WHERE lower(email) = ANY(${emails}::text[])`;
      const istDay = new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);
      const title = unreachable
        ? "Truth-lint could not reach the site"
        : `Truth-lint: ${fails.length} honesty failure${fails.length === 1 ? "" : "s"} on public pages`;
      for (const a of admins) {
        await createNotification({
          userId: a.id,
          type: "ADMIN_MESSAGE",
          title,
          body: `${problems.join("\n")}${fails.length > 5 ? `\n…and ${fails.length - 5} more` : ""}\nRun: npx tsx scripts/truth-lint.ts --all`,
          dedupKey: `truth-lint:${istDay}`,
        });
        notified++;
      }
    }
  }

  if (problems.length > 0) console.error(`[truth-lint] ${fails.length} fail(s), unreachable=${unreachable}`, fails.slice(0, 20));

  return json({
    ok: !unreachable,
    dry,
    base,
    exams: report.codes.length,
    skippedExams: report.skippedCodes.length,
    truncated: report.truncated,
    pages: report.pages,
    fetched: report.fetched,
    unreachable,
    fails: report.fails,
    warns: report.warns,
    notified,
    durationMs: report.durationMs,
    findings: report.findings.slice(0, 50),
    fetchFailures: report.failed.slice(0, 20),
  });
}
