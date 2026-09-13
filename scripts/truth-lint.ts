// scripts/truth-lint.ts — scan public pages for claims the founder's
// honesty rules forbid (13 Sep 2026). Read-only: it only fetches pages.
//
// Checks live in src/lib/truth-lint.ts (forbidden trust phrases, stale
// exam / language counts, passed estimates shown as Done, hub titles that
// lead with a date the timeline does not announce, expected answer-key
// rows, estimator schemes printed beside their own refusal, bare cutoff
// numbers in FAQ JSON-LD).
//
// USAGE
//   npx tsx scripts/truth-lint.ts                                  # prod, top-40 exams
//   npx tsx scripts/truth-lint.ts --base http://localhost:3021
//   npx tsx scripts/truth-lint.ts --exams SSC_CGL,NDA,CDS
//   npx tsx scripts/truth-lint.ts --all --twins --concurrency 4
//
// Exit code 1 when any "fail" finding exists, so it can gate a deploy.

import {
  examCodesFromLlmsFull,
  formatTable,
  runTruthLint,
  summarizeReport,
} from "../src/lib/truth-lint";
import { INDIAN_LANGUAGE_COUNT, OTHER_INDIAN_LANGUAGE_COUNT } from "../src/lib/languages";

// Top exams by 30-day people + 2 x enrolments (measured 11 Sep 2026).
const TOP_40 = [
  "MH_MPSC_GROUP_C", "IOQM", "TS_POLICE_PC", "AP_APPSC_GROUP2", "SSC_CGL", "UK_UKSSSC", "MP_MPESB", "MP_TET",
  "CTET", "SBI_CLERK", "IBPS_CLERK", "KA_POLICE_PC", "CDS", "KA_KPSC_KAS", "SSC_GD", "TN_TNPSC_GROUP2",
  "NDA", "GJ_GSSSB", "HR_HSSC_CET", "IBPS_PO", "RRB_NTPC", "TN_TNPSC_GROUP4", "AP_TET", "UP_UPSSSC_PET",
  "TN_TNPSC_GROUP1", "ML_MPSC", "SOF_IMO", "PB_PSSSB", "UPSC_PRELIMS", "NSEP", "RRB_GROUP_D", "JK_JKSSB",
  "MH_POLICE_BHARTI", "UP_UPTET", "TN_TNUSRB_SI", "AP_AMVI", "GATE_CSE", "SSC_CHSL", "GJ_GPSC_CLASS12", "AP_APPSC_GROUP1",
];

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const base = (arg("--base") ?? "https://shishya.in").replace(/\/+$/, "");
  const concurrency = Math.max(1, Number(arg("--concurrency") ?? 3));
  const twins = process.argv.includes("--twins");

  let codes: string[];
  if (process.argv.includes("--all")) {
    const res = await fetch(`${base}/llms-full.txt`);
    if (res.status !== 200) throw new Error(`llms-full.txt returned ${res.status}`);
    codes = examCodesFromLlmsFull(await res.text());
  } else if (arg("--exams")) {
    codes = arg("--exams")!.split(",").map((s) => s.trim()).filter(Boolean);
  } else {
    codes = TOP_40;
  }

  const report = await runTruthLint({
    base,
    codes,
    concurrency,
    twins,
    languageCounts: { indian: INDIAN_LANGUAGE_COUNT, other: OTHER_INDIAN_LANGUAGE_COUNT },
    log: (line) => process.stderr.write(line + "\n"),
  });

  if (report.findings.length > 0) console.log(formatTable(report.findings, { stripBase: base, maxDetail: 160 }));
  console.log(summarizeReport(report));
  process.exit(report.fails > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("[truth-lint] crashed:", err);
  process.exit(2);
});
