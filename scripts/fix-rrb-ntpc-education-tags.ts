// 27 Sep 2026 (repair, adversarial review of the /exams/after pages):
// RRB NTPC's ExamEligibility lists GRADUATE only ("Bachelor's degree in any
// discipline"), but NTPC also recruits undergraduate-level posts open to
// Class 12 pass candidates — the hand-checked row in
// src/data/exam-deep-content.ts reads "Class 12 pass for under-graduate-level
// posts. Bachelor's degree for graduate-level posts."
// The level pages now leave an exam out while its checked rule and its tags
// name different levels (src/lib/exam-qualification.ts levelVerdict), so
// NTPC — the largest 12th-pass government exam — is on no level page until
// this runs; afterwards it lists on /exams/after/12th, and /find-your-exam
// matches it for 12th-pass readers.
//
// Adds "12TH" to RRB_NTPC's educationTags and sets its educationNote to the
// hand-checked line (read from exam-deep-content, so the two cannot drift).
// Nothing else is changed. Dry run by default (prints the row before and
// after); --apply writes it. Idempotent: a second run writes nothing.
//
// Run: npx tsx --env-file=.env.local scripts/fix-rrb-ntpc-education-tags.ts [--apply]

import { prisma } from "../src/lib/db/prisma";
import { findDeepContent } from "../src/data/exam-deep-content";

const CODE = "RRB_NTPC";
const ADD = "12TH";

async function main() {
  const apply = process.argv.includes("--apply");
  const checked = findDeepContent(CODE)?.eligibility?.education;
  if (!checked) throw new Error(`${CODE}: no hand-checked eligibility line in exam-deep-content — stop.`);
  const row = await prisma.examEligibility.findFirst({
    where: { exam: { code: CODE } },
    select: { id: true, educationTags: true, educationNote: true },
  });
  if (!row) {
    console.log(`${CODE}: no ExamEligibility row — nothing to do.`);
    return;
  }
  console.log(`${CODE} before: tags [${row.educationTags.join(", ")}] — note: ${row.educationNote ?? "(none)"}`);
  const tags = row.educationTags.includes(ADD) ? row.educationTags : [ADD, ...row.educationTags];
  if (tags === row.educationTags && row.educationNote === checked) {
    console.log(`${CODE}: already up to date — nothing to write.`);
    return;
  }
  console.log(`${CODE} after:  tags [${tags.join(", ")}] — note: ${checked}`);
  if (!apply) {
    console.log("Dry run — pass --apply to write this one row.");
    return;
  }
  await prisma.examEligibility.update({ where: { id: row.id }, data: { educationTags: tags, educationNote: checked } });
  console.log(`${CODE}: written. The /exams/after pages pick it up within the hour (exam-list-rows cache).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
