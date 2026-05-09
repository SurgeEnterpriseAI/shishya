// Seed sample news items + important dates for SSC CGL.
// Indicative content used until the platform integrates a real news scraper
// or admin posts the genuine official notifications.
//
// Run: DATABASE_URL=… npx tsx seed/exams/ssc-cgl-news-dates.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SSC_CGL_NEWS = [
  {
    title: "Tier 1 exam pattern unchanged for 2026 cycle",
    body: "SSC has confirmed via the latest notification that the Tier 1 paper structure stays at 100 questions across 4 sections (25 each in Reasoning, GA, Quant, English) with 60 minutes total time. Marking remains +2 per correct, −0.5 negative.",
    daysAgo: 2,
    source: "https://ssc.gov.in",
  },
  {
    title: "SSC CGL 2026 application portal opens June 1",
    body: "The application window for the 2026 cycle opens on June 1 and closes June 30. Candidates from ST/SC/PwD categories receive fee exemption. Payment through net banking, debit card, or UPI.",
    daysAgo: 5,
    source: "https://ssc.gov.in",
  },
  {
    title: "Vacancy projection: ~17,000 posts across CGL groups",
    body: "Internal projections place this year's CGL vacancies at approximately 17,000 — a slight reduction from last year's 17,727. Bulk of openings remain in Inspector (Income Tax/Examiner) and Assistant Section Officer roles.",
    daysAgo: 10,
    source: null,
  },
];

const SSC_CGL_DATES = [
  { label: "Application portal opens",      daysFromNow: 7,   isExamDay: false, notes: "Form available on ssc.gov.in. Have your category certificate, photo (4.5×3.5 cm), and signature ready before starting." },
  { label: "Application portal closes",     daysFromNow: 37,  isExamDay: false, notes: "Last date including fee payment. Don't wait for the last day — portal slows down with traffic." },
  { label: "Tier 1 admit card release",     daysFromNow: 75,  isExamDay: false, notes: "Approximately 10 days before the exam." },
  { label: "Tier 1 exam (computer-based)",  daysFromNow: 90,  isExamDay: true,  notes: "Conducted across multiple shifts and dates. Your slot is on the admit card." },
  { label: "Tier 1 result announcement",    daysFromNow: 130, isExamDay: false, notes: "Provisional answer key released first; final answer key + result follows ~2 weeks later." },
  { label: "Tier 2 exam (descriptive + technical)", daysFromNow: 165, isExamDay: true, notes: "Only Tier 1 qualifiers appear. Pattern: Paper-1 (200 marks Quant + 200 English) + Paper-2 if applicable." },
];

async function main() {
  const exam = await prisma.exam.findUnique({ where: { code: "SSC_CGL" } });
  if (!exam) throw new Error("SSC_CGL exam not seeded yet — run seed:exams first.");

  console.log("Seeding SSC CGL news items...");
  for (const n of SSC_CGL_NEWS) {
    const publishedAt = new Date(Date.now() - n.daysAgo * 24 * 60 * 60 * 1000);
    const existing = await prisma.examNewsItem.findFirst({
      where: { examId: exam.id, title: n.title },
    });
    if (existing) {
      console.log(`  · skip: "${n.title.slice(0, 40)}…"`);
      continue;
    }
    await prisma.examNewsItem.create({
      data: {
        examId: exam.id,
        title: n.title,
        body: n.body,
        source: n.source,
        publishedAt,
      },
    });
    console.log(`  ✓ news: ${n.title.slice(0, 50)}…`);
  }

  console.log("\nSeeding SSC CGL important dates...");
  for (const d of SSC_CGL_DATES) {
    const date = new Date(Date.now() + d.daysFromNow * 24 * 60 * 60 * 1000);
    const existing = await prisma.examImportantDate.findFirst({
      where: { examId: exam.id, label: d.label },
    });
    if (existing) {
      console.log(`  · skip: "${d.label}"`);
      continue;
    }
    await prisma.examImportantDate.create({
      data: {
        examId: exam.id,
        label: d.label,
        date,
        isExamDay: d.isExamDay,
        notes: d.notes,
      },
    });
    console.log(`  ✓ date: ${d.label} (${date.toDateString()})`);
  }

  console.log("\nDone.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
