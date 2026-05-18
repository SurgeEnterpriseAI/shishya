// Phase 0.4: per the brief — verify 5 specific exam pages cross-link
// to the right NIRF colleges (or correctly DON'T cross-link).
//
// The mapping logic lives in src/components/CollegesForExamSection.tsx.
// This script reproduces that decision and reports what would be
// rendered for each test case.

import { prisma } from "../src/lib/db/prisma";
import { COLLEGES, type CollegeStream } from "../src/lib/colleges-data";

const EXAM_TO_STREAM: Record<string, CollegeStream> = {
  ENGINEERING: "engineering",
  MEDICAL: "medical",
  MBA: "management",
  LAW: "law",
  UNIVERSITY: "university",
};
const EXAM_CODE_OVERRIDES: Record<string, CollegeStream> = {
  GATE: "engineering",
  CAT: "management",
  XAT: "management",
  CMAT: "management",
  SNAP: "management",
  CLAT: "law",
  AILET: "law",
  CLAT_PG: "law",
  NEET_PG: "medical",
  NEET_SS: "medical",
  JEE_MAIN: "engineering",
  JEE_ADVANCED: "engineering",
  BITSAT: "engineering",
  VITEEE: "engineering",
  KCET: "engineering",
  WBJEE: "engineering",
  MHT_CET: "engineering",
  AP_EAPCET: "engineering",
  TS_EAMCET: "engineering",
  IPMAT: "management",
};

const TARGETS = ["JEE_MAIN", "NEET_UG", "CLAT", "TN_TNPSC_GROUP1", "GATE"];

async function main() {
  for (const code of TARGETS) {
    const exam = await prisma.exam.findUnique({
      where: { code },
      select: { code: true, shortName: true, category: true, name: true },
    });
    if (!exam) {
      console.log(`\n[${code}] NOT FOUND in exam table`);
      continue;
    }
    const stream =
      EXAM_CODE_OVERRIDES[exam.code] ?? EXAM_TO_STREAM[exam.category] ?? null;
    console.log(`\n=== ${exam.shortName} (${exam.code}) ===`);
    console.log(`  category=${exam.category}   →   stream=${stream ?? "<no cross-link>"}`);

    if (!stream) {
      console.log(`  Result: NO college cross-links (correct for ${exam.category})`);
      continue;
    }

    const matches = COLLEGES.filter((c) => c.streams.includes(stream))
      .sort((a, b) => {
        const ar = (a.nirf as any)[stream] ?? a.nirf.overall ?? 999;
        const br = (b.nirf as any)[stream] ?? b.nirf.overall ?? 999;
        return ar - br;
      })
      .slice(0, 5);
    console.log(`  Top 5 colleges that would render:`);
    for (const c of matches) {
      const rank = (c.nirf as any)[stream] ?? c.nirf.overall ?? "—";
      console.log(`    NIRF ${stream} #${rank}  ${c.shortName}  (${c.city})`);
    }
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
