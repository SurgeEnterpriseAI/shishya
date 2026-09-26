// 27 Sep 2026 — national / PG exams students search for and Shishya had no
// exam row for (organic wave 2 search misses: "cuet pg" opened UP_UPCET,
// "ugc net", "clat 2027", "gate me", "ssc cpo" … found nothing).
//
// Adds, from data/national-exams-2026.json: UGC_NET, CSIR_NET, CUET_PG, CLAT,
// IIT_JAM, GATE_ME, GATE_EE, GATE_ECE, GATE_CE, GATE_DA (separate codes, as
// GATE_CSE is modelled), SSC_JE, SSC_CPO, BITSAT and JNVST — the Exam row,
// its ExamEligibility row and the official tracker dates. Every fact was read
// on the conducting body's own host on 27 Sep 2026; the JSON carries the URL
// and the exact words for each. RRB JE, the three Agniveer entries, AFCAT and
// AILET's dates are NOT added — the JSON's `leftOut` says why (no readable
// official source for the pattern).
//
// Rows are created INACTIVE. src/app/exams/[code]/page.tsx 404s an inactive
// exam; an active one with no questions still renders, on 27 Sep 2026:
//   • ExamFaq's first answer (src/lib/exam-hub-copy.ts faqFreeA, also in the
//     FAQPage JSON-LD): "Every {short} mock test, PYQ-pattern paper and study
//     tool on Shishya is completely free" — a claim that mock tests exist;
//   • the action panel: "We're seeding questions for this exam. Check back
//     soon." (i18n exam.no.content);
//   • meta keywords "{short} mock test", "{short} free mocks", "{short} PYQ";
//   • the pattern chips (totalQuestions / marks / minutes / negative) raw from
//     the Exam row — for CSIR_NET that is the Life Sciences paper's count.
// The hub title / description / Course JSON-LD are already honest (wave 2
// hubPracticeSuffix: "Exam Dates & Updates"). Once those four are gated on
// "no questions and no shared mock", --active creates the rows live (it never
// flips an existing row). JNVST should stay inactive regardless: its
// candidates are 9–11 years old (minors sign-off pending).
//
// Also note before activating: /api/cron/refresh-vacancies re-writes
// vacanciesApprox / vacanciesNote of ACTIVE exams from a web search and does
// not skip rows written here (generatedBy "official-research:2026-09-27").
//
// Idempotent: the exam and eligibility are written only when a column differs;
// dates are inserted only when no live row has the same label and IST day;
// nothing is ever deleted or archived. Dates are stored at midnight UTC of the
// Asia/Kolkata calendar day (repo convention).
//
// Dry run by default — prints every row before and after. Flags:
//   --apply              write
//   --only CODE[,CODE]   limit to these codes
//   --active             create NEW rows active (existing rows keep their flag)
//   --indexnow           with --apply: submit the English hub + tracker URLs of
//                        ACTIVE rows that were written, and /exam-calendar
//
// Run: npx tsx --env-file=.env.local scripts/add-national-exams.ts [--apply] [--only CLAT,SSC_CPO] [--active] [--indexnow]

import { readFileSync } from "node:fs";
import path from "node:path";
import { prisma } from "../src/lib/db/prisma";
import { submitIndexNow } from "../src/lib/indexnow";
import {
  PROVENANCE,
  changedKeys,
  dayToDate,
  eligibilityColumns,
  examColumns,
  expandSpecs,
  planDates,
  validateSpec,
  type NationalExamsFile,
} from "./national-exams-plan";

const DATA = path.resolve(__dirname, "..", "data", "national-exams-2026.json");

function arg(name: string): string | null {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] ?? null : null;
}

// Full values, never truncated: the main session reads the dry run before --apply.
const fmt = (v: unknown): string => {
  if (v === null || v === undefined) return "(null)";
  if (Array.isArray(v)) return `[${v.join(", ")}]`;
  if (typeof v === "number") return String(Math.round(v * 10000) / 10000);
  return String(v);
};

async function main() {
  const apply = process.argv.includes("--apply");
  const createActive = process.argv.includes("--active");
  const indexNow = apply && process.argv.includes("--indexnow");
  if (process.argv.includes("--indexnow") && !apply) console.log("--indexnow ignored without --apply (dry run: nothing is written or submitted)");
  const only = arg("--only") ? new Set(arg("--only")!.split(",").map((s) => s.trim().toUpperCase())) : null;

  const file = JSON.parse(readFileSync(DATA, "utf8")) as NationalExamsFile;
  const specs = expandSpecs(file).filter((s) => !only || only.has(s.code));
  if (only) for (const c of only) if (!specs.some((s) => s.code === c)) console.log(`--only ${c}: not in ${path.basename(DATA)}`);

  // Validate everything first: one bad citation stops the whole run.
  const problems = specs.flatMap(validateSpec);
  if (problems.length) {
    console.error(`Refusing to write — ${problems.length} problem(s):\n  ${problems.join("\n  ")}`);
    process.exitCode = 1;
    return;
  }
  console.log(`${specs.length} exams from ${path.relative(process.cwd(), DATA)} — every date cites an official-tier URL (validated).`);
  console.log(apply ? `APPLY: writing (new rows ${createActive ? "ACTIVE" : "INACTIVE"}).` : "DRY RUN: nothing is written.");

  const written: string[] = [];
  for (const s of specs) {
    const cols = examColumns(s);
    const elig = eligibilityColumns(s);
    const row = await prisma.exam.findUnique({
      where: { code: s.code },
      select: {
        id: true,
        active: true,
        category: true,
        name: true,
        shortName: true,
        description: true,
        durationMin: true,
        totalQuestions: true,
        scoredQuestions: true,
        totalMarks: true,
        marksPerQ: true,
        negativeMark: true,
        languages: true,
        state: true,
        _count: { select: { questions: true, mocks: true } },
        eligibility: true,
        importantDates: { where: { archivedAt: null }, select: { label: true, date: true, kind: true }, orderBy: { date: "asc" } },
      },
    });

    console.log(`\n== ${s.code} — ${row ? `EXISTS (active=${row.active}, ${row._count.questions} questions, ${row._count.mocks} mocks)` : `NEW → created ${createActive ? "ACTIVE" : "INACTIVE"}`}`);
    // Exam columns
    const colsRec = cols as unknown as Record<string, unknown>;
    const eligRec = elig as unknown as Record<string, unknown>;
    const examDiff = changedKeys(row as Record<string, unknown> | null, colsRec);
    if (!row) {
      console.log(`   exam before: (no row)`);
      console.log(`   exam after:  ${cols.shortName} | ${cols.name} | ${cols.category}`);
      console.log(`                ${cols.totalQuestions} Q${cols.scoredQuestions ? ` (${cols.scoredQuestions} scored)` : ""} · ${cols.totalMarks} marks · ${cols.durationMin} min · +${fmt(cols.marksPerQ)} / −${fmt(cols.negativeMark)} · languages ${fmt(cols.languages)}`);
      console.log(`                pattern: ${s.pattern.stage} — ${s.pattern.url}`);
      console.log(`                description: ${fmt(cols.description)}`);
    } else if (examDiff.length === 0) {
      console.log(`   exam: unchanged`);
    } else {
      for (const k of examDiff) console.log(`   exam.${String(k)}: ${fmt((row as Record<string, unknown>)[k as string])}  →  ${fmt(colsRec[k as string])}`);
    }
    // Eligibility columns
    const eligDiff = changedKeys(row?.eligibility as Record<string, unknown> | null, eligRec);
    if (!row?.eligibility) {
      console.log(`   eligibility before: (no row)`);
      console.log(`   eligibility after:  age ${fmt(elig.minAge)}–${fmt(elig.maxAge)} · tags ${fmt(elig.educationTags)} · vacancies ${fmt(elig.vacanciesApprox)} · domicile ${fmt(elig.domicileState)} · generatedBy ${elig.generatedBy}`);
      console.log(`                       educationNote: ${fmt(elig.educationNote)}`);
      console.log(`                       ageRelaxation: ${fmt(elig.ageRelaxation)}`);
      console.log(`                       vacanciesNote: ${fmt(elig.vacanciesNote)}`);
      console.log(`                       eligibilityNote: ${fmt(elig.eligibilityNote)}`);
      console.log(`                       official: ${elig.officialName} — ${elig.officialUrl}`);
    } else if (eligDiff.length === 0) {
      console.log(`   eligibility: unchanged`);
    } else {
      for (const k of eligDiff) console.log(`   eligibility.${String(k)}: ${fmt((row.eligibility as Record<string, unknown>)[k as string])}  →  ${fmt(eligRec[k as string])}`);
    }
    // Dates
    const plan = planDates(row?.importantDates ?? [], s.dates);
    console.log(`   dates: ${row?.importantDates.length ?? 0} live before · +${plan.add.length} to add · ${plan.present.length} already present`);
    for (const d of plan.add) console.log(`     + ${d.date} ${d.kind.padEnd(17)} ${d.label}  [${new URL(d.url).hostname}]`);
    for (const w of plan.sameKindDay) console.log(`     ! same kind+day: ${w}`);
    for (const n of s.notAnnounced ?? []) console.log(`     · not announced: ${n}`);
    console.log(`   syllabus: ${s.syllabus.url}`);
    if (s.activeRecommendation) console.log(`   active? ${s.activeRecommendation}`);

    if (!apply) continue;
    let changed = false;
    let examId = row?.id;
    if (!row) {
      const created = await prisma.exam.create({ data: { code: s.code, ...cols, active: createActive }, select: { id: true } });
      examId = created.id;
      changed = true;
    } else if (examDiff.length) {
      await prisma.exam.update({ where: { id: row.id }, data: cols });
      changed = true;
    }
    if (!row?.eligibility) {
      await prisma.examEligibility.create({ data: { examId: examId!, ...elig } });
      changed = true;
    } else if (eligDiff.length) {
      await prisma.examEligibility.update({ where: { examId: examId! }, data: { ...elig, generatedAt: new Date() } });
      changed = true;
    }
    for (const d of plan.add) {
      await prisma.examImportantDate.create({
        data: {
          examId: examId!,
          label: d.label,
          date: dayToDate(d.date),
          isExamDay: !!d.isExamDay,
          kind: d.kind,
          confidence: "official",
          url: d.url,
          source: PROVENANCE,
        },
      });
      changed = true;
    }
    console.log(`   written: ${changed ? "yes" : "nothing to write"}`);
    if (changed) written.push(s.code);
  }

  console.log(`\nNot added (see leftOut in the JSON): ${file.leftOut.map((l) => l.code).join(", ")}`);
  if (!apply) {
    console.log("Dry run — pass --apply to write.");
    return;
  }
  console.log(`Written: ${written.length ? written.join(", ") : "nothing (already up to date)"}`);
  if (indexNow && written.length) {
    const live = await prisma.exam.findMany({ where: { code: { in: written }, active: true }, select: { code: true } });
    // English hub + tracker only: factUrlsForExam adds the /hi and /te twins,
    // which must pass gateTwinUrls first — a brand-new hub's twins are not
    // localised, so they canonicalise to English and are never submitted.
    // 27 Sep 2026 fix (verifier): /exam-calendar only rides along when an active
    // exam was written — inactive rows add nothing to the calendar, and the
    // "nothing submitted" branch below was unreachable before.
    const urls = live.length
      ? [...live.flatMap((e) => [`https://shishya.in/exams/${e.code}`, `https://shishya.in/exams/${e.code}/updates`]), "https://shishya.in/exam-calendar"]
      : [];
    if (!urls.length) {
      console.log("IndexNow: no written exam is active — nothing submitted.");
    } else {
      const accepted = await submitIndexNow(urls);
      console.log(`IndexNow: ${urls.length} URLs for ${live.length} exams — ${accepted > 0 ? "accepted" : "not accepted (the weekly sitemap submission will carry them)"}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
