// scripts/fix-ka-police-pc-facts.ts — KSP Civil Police Constable facts that
// disagree with the 2026 official notifications (found 15 Sep 2026 while
// onboarding KSRP; notifications read on ksp.karnataka.gov.in and KEA):
//
//   • negative marking: the 2026 Civil PC, CAR/DAR and KSRP notifications all
//     deduct 0.25 per wrong answer (Civil PC also needs 30 of 100). The exam
//     row said 0, so every KSP Constable mock scored without it.
//   • age: 18–33 (35 for SC/ST/Category-1/2A/2B/3A/3B, 38 forest tribals),
//     limits including the one-time 5-year relaxation. The row said 27 with
//     "+8 years" for reserved categories.
//   • official URL: recruitment.ksp.gov.in serves an empty template page; the
//     KSP recruitment page on ksp.karnataka.gov.in lists the notifications.
//   • KSRP dates filed under this exam: KSRP is a separate recruitment with
//     its own exam page now (KA_KSRP). They are archived here, not deleted.
//
// Dry run by default; --apply writes.
//   npx dotenv-cli -e .env.local -- npx tsx scripts/fix-ka-police-pc-facts.ts [--apply]

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

const DESCRIPTION =
  "Karnataka State Police Civil Police Constable recruitment. Written test (2026 notification): 100 objective questions, 100 marks, 90 minutes, 0.25 deducted for each wrong answer, minimum 30 marks. The notification's syllabus is general studies: general knowledge, science, geography, history, the Indian Constitution, the national freedom movement, mental ability and moral education. Non-exempt candidates also take a separate qualifying Kannada language test; Shishya's practice bank includes Kannada language questions for it.";

async function main() {
  const exam = await prisma.exam.findUniqueOrThrow({
    where: { code: "KA_POLICE_PC" },
    select: { id: true, negativeMark: true, description: true, eligibility: { select: { maxAge: true, ageRelaxation: true, officialUrl: true, officialName: true } } },
  });
  const ksrpRows = await prisma.examImportantDate.findMany({
    where: { examId: exam.id, archivedAt: null, label: { contains: "KSRP", mode: "insensitive" } },
    select: { id: true, label: true, date: true },
  });

  console.log("negativeMark:", exam.negativeMark, "→ 0.25");
  console.log("description:", JSON.stringify(exam.description), "→", JSON.stringify(DESCRIPTION));
  console.log("eligibility:", JSON.stringify(exam.eligibility));
  console.log(`KSRP date rows to archive: ${ksrpRows.length}`);
  for (const r of ksrpRows) console.log(`   ${r.date.toISOString().slice(0, 10)} ${r.label}`);
  if (!APPLY) {
    console.log("dry run — re-run with --apply to write");
    return;
  }

  await prisma.exam.update({ where: { id: exam.id }, data: { negativeMark: 0.25, description: DESCRIPTION } });
  if (exam.eligibility) {
    await prisma.examEligibility.update({
      where: { examId: exam.id },
      data: {
        maxAge: 33,
        ageRelaxation:
          "35 for SC/ST/Category-1/2A/2B/3A/3B; 38 for forest tribals; in-service candidates 38 (40 reserved). The limits include the one-time 5-year relaxation (2026 notification).",
        officialUrl: "https://ksp.karnataka.gov.in/info-3/Recruitment/en",
        officialName: "Karnataka State Police — Recruitment",
      },
    });
  }
  const archived = await prisma.examImportantDate.updateMany({
    where: { id: { in: ksrpRows.map((r) => r.id) } },
    data: { archivedAt: new Date() },
  });
  console.log(`applied: negative marking 0.25, description, eligibility; archived ${archived.count} KSRP date rows`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
