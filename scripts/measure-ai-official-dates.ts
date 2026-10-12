// scripts/measure-ai-official-dates.ts — Release 2 (14 Oct 2026) before/after
// read. SELECT only: never writes, never calls an AI provider.
//
// Part A: live tracker rows (ExamImportantDate, archivedAt NULL, real exams)
// dated today … today+180 days. For each row the tier is computed twice, the
// way the pages do it:
//   before — sourceTier(confidence, citation, exam portal): the citation alone
//            (what every surface printed until Release 2);
//   after  — dateRowTier(…, source): an AI-made row ("ai-generated…") is never
//            "official" (src/lib/official-source.ts).
// Prints: AI-made rows labelled official before → after (the release's
// target: 0), every official row before → after, the same over all dates, and
// the exams whose rows changed, with each row's day and kind (no text, no
// personal data).
//
// Part B: the kids' exams (src/lib/signin-cta.ts under13ExamGuard) that are in
// the catalogue, and how many existing email / phone alert subscriptions they
// hold (counts only — nothing is changed; the APIs refuse new ones).
//
// Run: npx tsx --env-file=.env.local scripts/measure-ai-official-dates.ts [--days=180]

import { PrismaClient } from "@prisma/client";
import { dateRowTier, isAiMadeProvenance, sourceTier } from "@/lib/official-source";
import { rowCitation } from "@/lib/exam-timeline";
import { under13ExamGuard } from "@/lib/signin-cta";

const prisma = new PrismaClient();
const DAY_MS = 86_400_000;

function arg(name: string, fallback: number): number {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`));
  const n = a ? Number(a.split("=")[1]) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

interface Row {
  id: string;
  code: string;
  date: Date;
  kind: string | null;
  confidence: string | null;
  url: string | null;
  source: string | null;
  officialUrl: string | null;
}

function tally(rows: Row[]) {
  // AI-made rows whose stored confidence is "official" (any citation) — the
  // count the 10 Oct read used; the page tier also needs the body's own host.
  const aiStoredOfficial = rows.filter((r) => isAiMadeProvenance(r.source) && (r.confidence ?? "").toLowerCase() === "official").length;
  let aiBefore = 0;
  let aiAfter = 0;
  let allBefore = 0;
  let allAfter = 0;
  const changed: Row[] = [];
  for (const r of rows) {
    const cite = rowCitation(r);
    const before = sourceTier(r.confidence, cite, r.officialUrl);
    const after = dateRowTier(r.confidence, cite, r.officialUrl, r.source);
    const ai = isAiMadeProvenance(r.source);
    if (before === "official") allBefore++;
    if (after === "official") allAfter++;
    if (ai && before === "official") aiBefore++;
    if (ai && after === "official") aiAfter++;
    if (before !== after) changed.push(r);
  }
  return { rows: rows.length, aiStoredOfficial, aiBefore, aiAfter, allBefore, allAfter, changed };
}

async function main() {
  const days = arg("days", 180);
  const now = new Date();
  const from = new Date(`${new Date(now.getTime() + 5.5 * 3_600_000).toISOString().slice(0, 10)}T00:00:00.000Z`);
  const to = new Date(from.getTime() + days * DAY_MS);
  console.log(`now ${now.toISOString()} · window ${from.toISOString().slice(0, 10)} … ${to.toISOString().slice(0, 10)} (${days} days)`);

  const all = await prisma.$queryRaw<Row[]>`
    SELECT d.id, e.code, d.date, d.kind, d.confidence, d.url, d.source, el."officialUrl"
    FROM "ExamImportantDate" d
    JOIN "Exam" e ON e.id = d."examId"
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE d."archivedAt" IS NULL AND e.category::text <> 'SCHOOL_BOARD'`;
  const inWindow = all.filter((r) => r.date >= from && r.date < to);

  const w = tally(inWindow);
  const a = tally(all);
  console.log("\n== Part A — AI-made rows labelled official");
  console.log(JSON.stringify({ window: { rows: w.rows, aiStoredOfficial: w.aiStoredOfficial, aiOfficialBefore: w.aiBefore, aiOfficialAfter: w.aiAfter, officialBefore: w.allBefore, officialAfter: w.allAfter } }));
  console.log(JSON.stringify({ allDates: { rows: a.rows, aiStoredOfficial: a.aiStoredOfficial, aiOfficialBefore: a.aiBefore, aiOfficialAfter: a.aiAfter, officialBefore: a.allBefore, officialAfter: a.allAfter } }));
  const w2 = tally(all.filter((r) => r.date >= from && r.date < new Date("2027-04-01T00:00:00Z")));
  console.log(JSON.stringify({ to31Mar: { rows: w2.rows, aiStoredOfficial: w2.aiStoredOfficial, aiOfficialBefore: w2.aiBefore, aiOfficialAfter: w2.aiAfter } }));

  const byExam = new Map<string, Row[]>();
  for (const r of w.changed) byExam.set(r.code, [...(byExam.get(r.code) ?? []), r]);
  const list = [...byExam.entries()].sort((x, y) => y[1].length - x[1].length || x[0].localeCompare(y[0]));
  console.log(`\n== Rows official → reported in the window, by exam (${w.changed.length} rows, ${list.length} exams)`);
  for (const [code, rs] of list) {
    const events = rs
      .sort((x, y) => x.date.getTime() - y.date.getTime())
      .map((r) => `${r.date.toISOString().slice(5, 10)} ${r.kind ?? "?"}`)
      .join("; ");
    console.log(`${code}${under13ExamGuard(code) ? " (kids)" : ""}: ${rs.length} — ${events}`);
  }

  console.log("\n== Part B — kids' exams in the catalogue (under13ExamGuard) and their existing alert subscriptions (counts)");
  const exams = await prisma.$queryRaw<{ id: string; code: string; active: boolean }[]>`
    SELECT id, code, active FROM "Exam" WHERE category::text <> 'SCHOOL_BOARD' ORDER BY code`;
  const kids = exams.filter((e) => under13ExamGuard(e.code));
  const ids = kids.map((e) => e.id);
  const email = ids.length
    ? await prisma.$queryRaw<{ examId: string; n: bigint }[]>`
        SELECT "examId", COUNT(*) AS n FROM "ExamAlert" WHERE "examId" = ANY(${ids}::text[]) GROUP BY 1`.catch(() => [] as { examId: string; n: bigint }[])
    : [];
  const push = ids.length
    ? await prisma.$queryRaw<{ examId: string; n: bigint }[]>`
        SELECT "examId", COUNT(*) AS n FROM "ExamPushAlert" WHERE "examId" = ANY(${ids}::text[]) GROUP BY 1`.catch(() => [] as { examId: string; n: bigint }[])
    : [];
  const count = (rows: { examId: string; n: bigint }[], id: string) => Number(rows.find((r) => r.examId === id)?.n ?? 0);
  for (const e of kids) console.log(`${e.code}${e.active ? "" : " (inactive)"}: email ${count(email, e.id)} · push ${count(push, e.id)}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
