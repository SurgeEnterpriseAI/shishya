// Phase 0.3: random-sample 25 facts from the seeded set, check each
// source URL resolves. Manual claim-value spot-check is reported as
// "needs human review" since I can't read PDFs/HTML and judge content
// accuracy from a script.

import { prisma } from "../src/lib/db/prisma";

async function checkUrl(url: string): Promise<{ status: number; finalUrl: string; ok: boolean; redirected: boolean }> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      headers: {
        // Some govt portals serve different content to non-browser UAs
        "user-agent": "Mozilla/5.0 (compatible; ShishyaAudit/1.0)",
      },
    });
    return { status: res.status, finalUrl: res.url, ok: res.ok, redirected: res.url !== url };
  } catch (e: any) {
    return { status: 0, finalUrl: "", ok: false, redirected: false };
  }
}

async function main() {
  const sample = await prisma.$queryRaw<Array<{
    id: string;
    section: string;
    pageId: string;
    claimText: string;
    claimValue: string;
    sourceUrl: string;
    sourceName: string;
  }>>`
    SELECT "id", "section"::text AS section, "pageId", "claimText", "claimValue", "sourceUrl", "sourceName"
    FROM "Fact"
    ORDER BY RANDOM()
    LIMIT 25
  `;
  console.log(`audit sample: ${sample.length} facts\n`);

  // Group by section for breakdown
  const bySection: Record<string, { total: number; ok: number; bad: number; redir: number }> = {};

  for (const f of sample) {
    const r = await checkUrl(f.sourceUrl);
    const verdict = r.status === 0 ? "UNREACHABLE" : r.ok ? (r.redirected ? "REDIRECT" : "OK") : `HTTP ${r.status}`;
    console.log(`[${verdict}] ${f.section} :: ${f.claimText}`);
    console.log(`    page=${f.pageId}`);
    console.log(`    src=${f.sourceUrl}`);
    if (r.redirected) console.log(`    → ${r.finalUrl}`);
    console.log(`    value=${f.claimValue.slice(0, 80)}`);

    bySection[f.section] = bySection[f.section] ?? { total: 0, ok: 0, bad: 0, redir: 0 };
    bySection[f.section].total++;
    if (r.status === 0 || !r.ok) bySection[f.section].bad++;
    else if (r.redirected) bySection[f.section].redir++;
    else bySection[f.section].ok++;
  }

  console.log(`\n--- breakdown by section ---`);
  for (const [s, b] of Object.entries(bySection)) {
    console.log(`${s.padEnd(15)} total=${b.total}  ok=${b.ok}  redirected=${b.redir}  unreachable=${b.bad}`);
  }
  const totalOk = Object.values(bySection).reduce((s, b) => s + b.ok + b.redir, 0);
  console.log(`\nsource-URL resolves: ${totalOk}/${sample.length} (${Math.round((totalOk * 100) / sample.length)}%)`);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
