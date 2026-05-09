// Seed sample discussion threads — so the home-page community panel isn't
// an empty box on day one. Real students will replace these as the platform
// gets traffic; until then, the threads simulate plausible aspirant chatter
// that gives visitors social proof.
//
// Run: DATABASE_URL=… npx tsx seed/discussions.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ThreadSeed {
  title: string;
  examCode?: string;            // attaches the thread to an exam
  authorName: string;
  pinned?: boolean;
  hoursAgo: number;             // controls "x hours ago" feel on home
  messages: Array<{ authorName: string; content: string; minutesAfterStart: number }>;
}

const SEEDS: ThreadSeed[] = [
  {
    title: "SSC CGL Tier 1 — what's the realistic cutoff this year?",
    examCode: "SSC_CGL",
    authorName: "Rakesh K.",
    hoursAgo: 1.5,
    messages: [
      { authorName: "Rakesh K.", content: "Looking at the past 5 years' trends, GA-heavy years pushed cutoffs to 138-142 for general. With this year's pattern unchanged, do you think 145+ is safe?", minutesAfterStart: 0 },
      { authorName: "Pooja S.", content: "I'd target 150+ for safety. Vacancies are down ~12% from last year per the latest notification. Buffer up.", minutesAfterStart: 22 },
      { authorName: "Imran A.", content: "Agree with Pooja. My coaching notes from Adda projected 148 for general. Better to over-prepare than scrape.", minutesAfterStart: 47 },
    ],
  },
  {
    title: "Aspirants from Telangana — let's connect for daily practice",
    authorName: "Shravya R.",
    hoursAgo: 4,
    pinned: false,
    messages: [
      { authorName: "Shravya R.", content: "Hyderabad-based, preparing for SSC CGL + IBPS PO simultaneously. Looking for 2-3 study buddies for daily 1-hour Quant + Reasoning sessions on Discord/Meet.", minutesAfterStart: 0 },
      { authorName: "Vikram T.", content: "I'm in. Warangal here. 6-7 PM works for me daily.", minutesAfterStart: 35 },
      { authorName: "Asha N.", content: "Karimnagar, also interested. Let's start tomorrow?", minutesAfterStart: 110 },
    ],
  },
  {
    title: "Reasoning section is killing me — Blood Relations + Syllogism tips?",
    examCode: "SSC_CGL",
    authorName: "Manish P.",
    hoursAgo: 6,
    messages: [
      { authorName: "Manish P.", content: "I get 14-16/25 in Quant consistently but Reasoning crashes to 11-12. Blood relations and syllogisms eat too much time. Anyone cracked these in <30s/Q?", minutesAfterStart: 0 },
      { authorName: "Kavya M.", content: "Draw the family tree IMMEDIATELY for blood relations — even before reading the Q twice. For syllogism, learn the Venn shortcut method, forget verbal logic for these.", minutesAfterStart: 18 },
      { authorName: "Shishya AI", content: "Try the AI tutor — paste 5 of your wrong Qs and ask for pattern analysis. The system can spot whether it's a 'reading too slow' problem or 'method too slow' problem. Different fix each.", minutesAfterStart: 90 },
    ],
  },
  {
    title: "Daily schedule — working professional preparing for SSC CGL",
    authorName: "Anita G.",
    hoursAgo: 9,
    messages: [
      { authorName: "Anita G.", content: "9-6 corporate job, 1.5hr commute. How are other working pros structuring their day? Currently doing 1hr morning + 2hr post-dinner. Feels insufficient.", minutesAfterStart: 0 },
      { authorName: "Rohit V.", content: "Same boat, IT ops. I do 30 mins lunch break (current affairs only) + 6 AM to 8 AM (Quant + Reasoning) + Sundays full mock. Took me 6 months to hit 90% in mocks.", minutesAfterStart: 65 },
      { authorName: "Anita G.", content: "Sunday full mock is the missing piece for me. Will start this week.", minutesAfterStart: 240 },
    ],
  },
  {
    title: "NEET UG 2026 — pattern changes? Anyone heard officially?",
    examCode: "NEET_UG",
    authorName: "Dr. (aspiring) Suresh",
    hoursAgo: 14,
    messages: [
      { authorName: "Dr. (aspiring) Suresh", content: "Rumours about NTA changing the negative-marking scheme this year. Has anyone seen anything official from NTA? Don't want to base prep on coaching gossip.", minutesAfterStart: 0 },
      { authorName: "Priya M.", content: "Nothing on nta.ac.in or the official notification yet. As of last week, the pattern was unchanged. I'd ignore the noise until NTA confirms.", minutesAfterStart: 30 },
    ],
  },
  {
    title: "JEE Main April attempt — switching to dropper strategy after Jan?",
    examCode: "JEE_MAIN",
    authorName: "Karthik N.",
    hoursAgo: 22,
    messages: [
      { authorName: "Karthik N.", content: "Got 89 percentile in January attempt. Targeting NIT but realistic cutoff for my category is 96+. April attempt or drop? Family pushing for drop.", minutesAfterStart: 0 },
      { authorName: "Aisha B.", content: "If you're already at 89, April CAN take you to 96 with focused prep. Don't drop yet. Drop after April if April also lands <94.", minutesAfterStart: 15 },
    ],
  },
  {
    title: "Free vs paid mock platforms — honest comparison",
    authorName: "Vikash D.",
    hoursAgo: 30,
    messages: [
      { authorName: "Vikash D.", content: "I've used Testbook (paid), Adda247 (paid), Oliveboard, and now trying Shishya. Testbook has the largest question bank but their mocks feel formulaic. Anyone else compared?", minutesAfterStart: 0 },
      { authorName: "Neha P.", content: "Shishya's adaptive feature is genuinely different — last 3 mocks were all on my weak topics. Testbook's mocks feel like they're sampled from the same pool every time.", minutesAfterStart: 75 },
    ],
  },
  {
    title: "Form filling for SSC CGL — known issues and workarounds",
    examCode: "SSC_CGL",
    authorName: "Mohammed F.",
    hoursAgo: 48,
    messages: [
      { authorName: "Mohammed F.", content: "Getting 'transaction failed' on the SSC portal payment step (UPI). Net banking works. Posting in case anyone else stuck.", minutesAfterStart: 0 },
      { authorName: "Sneha R.", content: "Same issue last week. Used SBI net banking instead — went through immediately. Avoid the UPI gateway for now.", minutesAfterStart: 12 },
      { authorName: "Mohammed F.", content: "Confirmed working with HDFC net banking. Thanks!", minutesAfterStart: 95 },
    ],
  },
];

async function main() {
  // Pick up SSC_CGL etc. by code so we can attach examId where applicable
  const exams = await prisma.exam.findMany({ select: { id: true, code: true } });
  const examByCode = new Map(exams.map((e) => [e.code, e.id]));

  console.log(`Seeding ${SEEDS.length} discussion threads...`);
  for (const seed of SEEDS) {
    const baseAt = new Date(Date.now() - seed.hoursAgo * 60 * 60 * 1000);

    // Idempotent: if a thread with the same title exists, skip
    const existing = await prisma.discussion.findFirst({ where: { title: seed.title } });
    if (existing) {
      console.log(`  · skip: "${seed.title.slice(0, 40)}…" already exists`);
      continue;
    }

    const examId = seed.examCode ? examByCode.get(seed.examCode) : undefined;

    const thread = await prisma.discussion.create({
      data: {
        title: seed.title,
        examId: examId ?? null,
        authorName: seed.authorName,
        pinned: seed.pinned ?? false,
        createdAt: baseAt,
        lastActivityAt: baseAt,
      },
    });

    let lastMessageAt = baseAt;
    for (const m of seed.messages) {
      const createdAt = new Date(baseAt.getTime() + m.minutesAfterStart * 60 * 1000);
      await prisma.discussionMessage.create({
        data: {
          threadId: thread.id,
          authorName: m.authorName,
          content: m.content,
          createdAt,
        },
      });
      if (createdAt > lastMessageAt) lastMessageAt = createdAt;
    }

    await prisma.discussion.update({
      where: { id: thread.id },
      data: {
        messageCount: seed.messages.length,
        lastActivityAt: lastMessageAt,
      },
    });

    console.log(`  ✓ "${seed.title.slice(0, 50)}…" (${seed.messages.length} messages)`);
  }
  console.log("Done.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
