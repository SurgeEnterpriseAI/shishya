// 27 Sep 2026 — make the national / PG exams added tonight live, but only
// those whose hub can stand on official facts alone.
//
// scripts/add-national-exams.ts created UGC_NET, CSIR_NET, CUET_PG, CLAT,
// IIT_JAM, GATE_ME/EE/ECE/CE/DA, SSC_JE, SSC_CPO, BITSAT and JNVST INACTIVE
// (src/app/exams/[code]/page.tsx 404s an inactive exam): none has a practice
// question, and a hub without practice used to promise mock tests, PYQs and a
// coach plan. The hub now follows src/lib/exam-practice-state.ts — no
// practice → the official-facts panel, one plain "no practice questions yet" line, the
// AI tutor and related exams with practice — so an exam may go live once the
// checks in scripts/activation-readiness.ts pass: an https official site, the
// stored pattern agreeing with the official research, and an official-tier
// tracker date or an official syllabus link. CSIR_NET and JNVST are never
// activated here (see NEVER_ACTIVATE there).
//
// Writes ONLY Exam.active = true, only for a row that passes and is inactive.
// Never deactivates, never touches any other column or table. Dry run by
// default — prints every code, pass or fail, and why.
//
// Before --apply, know what goes live with the flag (27 Sep 2026 read):
//   • /api/cron/refresh-vacancies web-searches ACTIVE exams and rewrites
//     ExamEligibility.vacanciesApprox / vacanciesNote. 27 Sep 2026 (fixer):
//     it now skips the rows the official research wrote (generatedBy
//     "official-research:…", e.g. GATE's "there is no vacancy count") — that
//     skip must be DEPLOYED before --apply, with the no-practice hub code;
//   • /api/cron/refresh-rank-bands and /api/cron/refresh-exam-data write
//     AI rank bands, news and tracker rows for ACTIVE exams;
//   • the sitemap, llms-full.txt, the search index and the exam catalogue
//     list ACTIVE exams (the hub, /updates, /context.md).
//
// Flags:
//   --apply              write active = true for the codes that pass
//   --only CODE[,CODE]   limit to these codes
//
// Run: npx tsx --env-file=.env.local scripts/activate-national-exams.ts [--apply] [--only CLAT,SSC_CPO]

import { prisma } from "../src/lib/db/prisma";
import { sourceTier } from "../src/lib/official-source";
import { officialFactCodes } from "../src/lib/official-exam-facts";
import { practiceStateFromCounts } from "../src/lib/exam-practice-state";
import { activationReadiness, NEVER_ACTIVATE, type ReadinessVerdict } from "./activation-readiness";

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] ?? null : null;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const only = arg("--only") ? new Set(arg("--only")!.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean)) : null;
  const all = officialFactCodes();
  const codes = all.filter((c) => !only || only.has(c));
  if (only) for (const c of only) if (!all.includes(c)) console.log(`--only ${c}: not in data/national-exams-2026.json — skipped`);
  console.log(apply ? "APPLY: Exam.active = true for the codes that pass." : "DRY RUN: nothing is written (pass --apply to write).");
  console.log(`Never activated here: ${Object.keys(NEVER_ACTIVATE).join(", ")}.\n`);

  const verdicts: (ReadinessVerdict & { id: string | null })[] = [];
  for (const code of codes) {
    const row = await prisma.exam.findUnique({
      where: { code },
      select: {
        id: true,
        active: true,
        category: true,
        totalQuestions: true,
        totalMarks: true,
        durationMin: true,
        marksPerQ: true,
        negativeMark: true,
        eligibility: { select: { officialUrl: true } },
        importantDates: { where: { archivedAt: null }, select: { confidence: true, url: true } },
        _count: { select: { questions: { where: { validated: true } }, mocks: { where: { userId: null, generatedBy: { not: "live-test" } } } } },
      },
    });
    const officialUrl = row?.eligibility?.officialUrl ?? null;
    const officialDates = (row?.importantDates ?? []).filter((d) => sourceTier(d.confidence, d.url, officialUrl) === "official").length;
    const v = activationReadiness({
      code,
      row: row ? { ...row, category: String(row.category) } : null,
      officialUrl,
      officialDates,
    });
    verdicts.push({ ...v, id: row?.id ?? null });
    const practice = row ? practiceStateFromCounts({ questions: row._count.questions, systemMocks: row._count.mocks }) : null;
    const state = v.alreadyActive ? "ALREADY ACTIVE" : v.ready ? "PASS → activate" : "FAIL — stays inactive";
    console.log(`== ${code.padEnd(9)} ${state}`);
    for (const p of v.passes) console.log(`   ✓ ${p}`);
    for (const f of v.fails) console.log(`   ✗ ${f}`);
    if (practice) {
      console.log(
        `   · practice: ${practice.questions} checked questions, ${practice.systemMocks} shared mocks → ${
          practice.hasPractice ? "practice sections" : "no-practice hub (official facts, \"no practice questions yet\" line, AI tutor, related exams)"
        }`,
      );
    }
  }

  const ready = verdicts.filter((v) => v.ready && v.id);
  console.log(`\nPass: ${ready.map((v) => v.code).join(", ") || "none"}`);
  console.log(`Already active: ${verdicts.filter((v) => v.alreadyActive).map((v) => v.code).join(", ") || "none"}`);
  console.log(`Stay inactive: ${verdicts.filter((v) => !v.ready && !v.alreadyActive).map((v) => v.code).join(", ") || "none"}`);
  if (!apply) {
    console.log("\nDry run — pass --apply to write.");
    return;
  }
  for (const v of ready) {
    // Guarded: only a row that is still inactive flips.
    const r = await prisma.exam.updateMany({ where: { id: v.id!, active: false }, data: { active: true } });
    console.log(`   ${v.code}: ${r.count === 1 ? "activated" : "not changed (already active?)"}`);
  }
  console.log(
    "\nThe hub, sitemap and search read cached data (10 minutes; the search index 1 hour) — new hubs appear within that window. " +
      "Hubs: " +
      ready.map((v) => `https://shishya.in/exams/${v.code}`).join(" "),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
