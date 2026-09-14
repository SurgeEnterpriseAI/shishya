// Field page speed from the web-vitals beacon (src/components/WebVitals.tsx).
// Read-only. p75 of LCP, INP, CLS and TTFB for touch-screen devices (phones,
// tablets) vs mouse devices, then per route template and per connection type
// for touch devices. "Good" per web.dev: LCP <= 2500 ms, INP <= 200 ms,
// CLS <= 0.1, TTFB <= 800 ms.
// Run: npx dotenv-cli -e .env.local -- npx tsx scripts/web-vitals-report.ts [days, default 7]
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const days = Math.max(1, Math.min(90, Number(process.argv[2] ?? 7) || 7));

const p75 = (metric: string) =>
  `percentile_cont(0.75) WITHIN GROUP (ORDER BY ("props"->>'${metric}')::numeric) FILTER (WHERE "props"->>'${metric}' IS NOT NULL)`;
const METRICS = `COUNT(*)::int AS n, ${p75("lcp")} AS lcp, ${p75("inp")} AS inp, ${p75("cls")} AS cls, ${p75("ttfb")} AS ttfb`;
const FROM = `FROM "AnalyticsEvent"
  WHERE "kind" = 'CTA_CLICKED' AND "props"->>'cta' = 'web-vitals' AND "client" = 'browser'
    AND "createdAt" >= NOW() - make_interval(days => $1::int)`;
const DEVICE = `CASE "props"->>'coarse' WHEN 'true' THEN 'touch screen' WHEN 'false' THEN 'mouse' ELSE 'unknown' END`;

interface Row {
  key: string;
  n: number;
  lcp: number | null;
  inp: number | null;
  cls: number | null;
  ttfb: number | null;
}

function print(title: string, rows: Row[]) {
  console.log(`\n${title}`);
  console.log(`  ${"".padEnd(36)}${"loads".padStart(7)}${"LCP ms".padStart(9)}${"INP ms".padStart(9)}${"CLS".padStart(8)}${"TTFB ms".padStart(9)}`);
  const fmt = (v: number | null, digits = 0) => (v == null ? "—" : Number(v).toFixed(digits));
  if (rows.length === 0) console.log("  no rows");
  for (const r of rows) {
    console.log(
      `  ${String(r.key).slice(0, 36).padEnd(36)}${String(r.n).padStart(7)}${fmt(r.lcp).padStart(9)}${fmt(r.inp).padStart(9)}${fmt(r.cls, 3).padStart(8)}${fmt(r.ttfb).padStart(9)}`,
    );
  }
}

async function main() {
  console.log(`Page speed, last ${days} day(s), p75 per metric (good: LCP <= 2500 ms, INP <= 200 ms, CLS <= 0.1, TTFB <= 800 ms)`);
  print("By device", await prisma.$queryRawUnsafe<Row[]>(`SELECT ${DEVICE} AS key, ${METRICS} ${FROM} GROUP BY 1 ORDER BY 2 DESC`, days));
  print(
    "Touch screens, busiest routes",
    await prisma.$queryRawUnsafe<Row[]>(`SELECT COALESCE("path", '?') AS key, ${METRICS} ${FROM} AND "props"->>'coarse' = 'true' GROUP BY 1 ORDER BY 2 DESC LIMIT 15`, days),
  );
  print(
    "Touch screens, by connection",
    await prisma.$queryRawUnsafe<Row[]>(`SELECT COALESCE("props"->>'conn', 'unknown') AS key, ${METRICS} ${FROM} AND "props"->>'coarse' = 'true' GROUP BY 1 ORDER BY 2 DESC`, days),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
