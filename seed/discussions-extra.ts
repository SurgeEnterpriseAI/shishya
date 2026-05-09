// Adds 18 more synthetic discussion threads on top of the original 8.
// All timestamped in the recent past (3 min – 18 h ago) so the right-side
// sidebar feels actively populated when a first visitor lands.
//
// Idempotent: skips any thread whose title already exists.
//
// Run: DATABASE_URL=… npx tsx seed/discussions-extra.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface ThreadSeed {
  title: string;
  examCode?: string;
  authorName: string;
  minutesAgo: number;
  messages: Array<{ authorName: string; content: string; minutesAfterStart: number }>;
}

// Threads ordered roughly by recency so when the sidebar polls, the top
// few feel "just now" / "5 min ago" — exactly the rolling-feed feel.
const SEEDS: ThreadSeed[] = [
  {
    title: "Just got 142/200 in last SSC mock — worried about cutoff",
    examCode: "SSC_CGL",
    authorName: "Akash R.",
    minutesAgo: 3,
    messages: [
      { authorName: "Akash R.", content: "Quants 60/100, Reasoning 58/100, GA 52/100, English 78/100. Improvement plan?", minutesAfterStart: 0 },
      { authorName: "Lakshmi V.", content: "GA is your weakest. Switch to a daily 30-min current-affairs habit + last 6 months' compilation. You'll add 15-20 marks easily in 4 weeks.", minutesAfterStart: 2 },
    ],
  },
  {
    title: "JEE Maths shortcuts — share what actually saved you in the exam",
    examCode: "JEE_MAIN",
    authorName: "Rohan T.",
    minutesAgo: 8,
    messages: [
      { authorName: "Rohan T.", content: "Cracking JEE Main this year. What's one shortcut you actually used in the exam (not just learned)?", minutesAfterStart: 0 },
      { authorName: "Pranav K.", content: "For complex numbers: rotation as multiplication by e^iθ — saves 90s on geometry questions. Game changer.", minutesAfterStart: 4 },
      { authorName: "Sneha M.", content: "Coordinate geometry: parametric form for parabola. Most JEE-style integration with parabola becomes 2 lines.", minutesAfterStart: 6 },
    ],
  },
  {
    title: "IBPS PO Prelims — Quants timing strategy that worked for me",
    examCode: "IBPS_PO",
    authorName: "Meena G.",
    minutesAgo: 14,
    messages: [
      { authorName: "Meena G.", content: "Cleared Pre last year (44/35 cutoff): I split 20 min Quants into 'easy 12 → hard 8'. Always nail simplification + DI first, leave Quad equations + DS for review pass.", minutesAfterStart: 0 },
      { authorName: "Aman J.", content: "Same approach. Wrong answers in DS hurt more than skips. I leave whole DS section for last 2 minutes.", minutesAfterStart: 5 },
    ],
  },
  {
    title: "NEET Bio — NCERT line by line really enough?",
    examCode: "NEET_UG",
    authorName: "Priya S.",
    minutesAgo: 22,
    messages: [
      { authorName: "Priya S.", content: "Coachings tell us NCERT is enough for Bio but every PYQ has 4-5 outside-NCERT facts. What's your honest take?", minutesAfterStart: 0 },
      { authorName: "Dr. Imran (PG)", content: "NCERT covers ~80% reliably. The remaining 20% is lottery — even toppers miss those. Don't chase exhaustive prep there; secure your 80% first.", minutesAfterStart: 8 },
      { authorName: "Sushma N.", content: "Agree. NCERT 3 reads + last 10 years' PYQs. Anything beyond that is diminishing returns.", minutesAfterStart: 12 },
    ],
  },
  {
    title: "How are you tracking current affairs daily? Sources?",
    authorName: "Vikram T.",
    minutesAgo: 31,
    messages: [
      { authorName: "Vikram T.", content: "PIB + The Hindu editorial + monthly compilation? Or is just monthly compilation enough?", minutesAfterStart: 0 },
      { authorName: "Geetha K.", content: "Monthly compilations alone won't cover bills, schemes, S&T announcements. Daily PIB skim (10 min) + Hindu editorial (15 min) is the minimum for UPSC. For SSC just monthly is fine.", minutesAfterStart: 14 },
    ],
  },
  {
    title: "UPSC notes — handwritten, digital, or both?",
    examCode: "UPSC_PRELIMS",
    authorName: "Nikhil P.",
    minutesAgo: 47,
    messages: [
      { authorName: "Nikhil P.", content: "Year 1 of prep. Started with paper. Considering switching to OneNote / Notion for searchability. What worked for you?", minutesAfterStart: 0 },
      { authorName: "Bhavna R.", content: "Hybrid. Paper for first reading + diagrams (memory link). Digital for revision + cross-linking topics. Don't pick one — let the medium serve the purpose.", minutesAfterStart: 22 },
    ],
  },
  {
    title: "GATE CSE — Operating Systems is killing me, deep dive worth it?",
    examCode: "GATE_CSE",
    authorName: "Aditya M.",
    minutesAgo: 65,
    messages: [
      { authorName: "Aditya M.", content: "OS is 8-10 marks in GATE. Spending 3 weeks vs 1 week — worth the trade-off?", minutesAfterStart: 0 },
      { authorName: "Karthik R.", content: "If your DBMS + Algos are already solid, do 3 weeks. If not, go 1 week deep + revise. Marginal value of OS depth depends on what else is shaky.", minutesAfterStart: 30 },
    ],
  },
  {
    title: "CTET 2026 syllabus — anyone tracking the changes?",
    examCode: "CTET",
    authorName: "Kavya N.",
    minutesAgo: 89,
    messages: [
      { authorName: "Kavya N.", content: "CBSE notification mentioned 'minor updates'. Has anyone seen the official changed-syllabus PDF?", minutesAfterStart: 0 },
      { authorName: "Mohammed A.", content: "No official PDF yet — only the notification. Last year 'minor updates' meant new EVS topics. Watch the official site weekly until April.", minutesAfterStart: 25 },
    ],
  },
  {
    title: "RRB NTPC GA — best monthly compilation for 2026?",
    examCode: "RRB_NTPC",
    authorName: "Suresh L.",
    minutesAgo: 112,
    messages: [
      { authorName: "Suresh L.", content: "Last year I used Adda247's compilation. Was decent but missed some niche awards. What are you all using?", minutesAfterStart: 0 },
      { authorName: "Asha B.", content: "Cross-reference 2 sources. Adda + GradeUp covers ~95% reliably. Anything missing across both is exam-day lottery.", minutesAfterStart: 40 },
    ],
  },
  {
    title: "Stress + anxiety during prep — how are you managing?",
    authorName: "Anita G.",
    minutesAgo: 145,
    messages: [
      { authorName: "Anita G.", content: "Mock scores plateaued for 3 weeks. Sleep is bad. Anyone else hitting this wall?", minutesAfterStart: 0 },
      { authorName: "Sneha P.", content: "Hard part. What helped me: 30-min walk daily (no phone), one full rest day per week, talking to a friend who's also prepping. The plateau usually breaks if you pause and re-attack.", minutesAfterStart: 18 },
      { authorName: "Manish K.", content: "Cut social media for 21 days. Sleep returned in 5 days. Mock scores +12% in week 3. Try it — worst case you lose nothing.", minutesAfterStart: 50 },
    ],
  },
  {
    title: "CAT VARC — reading habit tips that actually moved my percentile",
    examCode: "CAT",
    authorName: "Tushar V.",
    minutesAgo: 187,
    messages: [
      { authorName: "Tushar V.", content: "Stuck at 75 percentile in VARC. What rebuilt your reading speed?", minutesAfterStart: 0 },
      { authorName: "Divya N.", content: "Read 2 long-form articles a day from The Atlantic / Aeon (not news). Track main argument + 3 supporting points without re-reading. After 6 weeks my VARC went 78 → 92.", minutesAfterStart: 35 },
    ],
  },
  {
    title: "Hindi-medium aspirants for SSC CGL — let's connect",
    examCode: "SSC_CGL",
    authorName: "Deepak Y.",
    minutesAgo: 234,
    messages: [
      { authorName: "Deepak Y.", content: "Hindi medium SSC aspirant. Looking for a 4-5 person group for daily 1-hour practice — Quants + Reasoning. Anyone?", minutesAfterStart: 0 },
      { authorName: "Ravi K.", content: "मैं हूँ। 7-8 PM works. Telegram group बना सकते हैं?", minutesAfterStart: 20 },
      { authorName: "Pooja M.", content: "Add me too. Working professional, 8 PM onwards.", minutesAfterStart: 90 },
    ],
  },
  {
    title: "First-timer dropper — 10-month JEE strategy. Reality check?",
    examCode: "JEE_MAIN",
    authorName: "Karthik J.",
    minutesAgo: 320,
    messages: [
      { authorName: "Karthik J.", content: "Took a drop. 10 months. Plan: 4 hr Phy + 4 hr Chem + 4 hr Math daily. Sundays full mock. Reality check?", minutesAfterStart: 0 },
      { authorName: "Aisha P.", content: "12 hours of solo study daily is brutal and unsustainable past month 3. Realistic version: 8 focused hours + 1 hour mock review + 3 hours active rest (walk, read non-prep). You'll outperform 12-hour zombies.", minutesAfterStart: 60 },
    ],
  },
  {
    title: "SBI Clerk last 5 years — pattern observations",
    examCode: "SBI_PO",
    authorName: "Neha P.",
    minutesAgo: 412,
    messages: [
      { authorName: "Neha P.", content: "Pulled SBI Clerk Pre cutoffs across 5 years: GA section weight has been creeping up steadily. Reasoning got slightly easier too. Anyone else noticed?", minutesAfterStart: 0 },
      { authorName: "Mohammed F.", content: "Yes. Banking + financial awareness specifically — more questions year over year. Make a separate note for RBI circulars + budget lines.", minutesAfterStart: 50 },
    ],
  },
  {
    title: "MPSC Maharashtra aspirants — connect here",
    examCode: "STATE_PSC",
    authorName: "Rajesh G.",
    minutesAgo: 488,
    messages: [
      { authorName: "Rajesh G.", content: "Pune-based, MPSC State Service prep. Looking for 2-3 study buddies for current affairs + answer writing exchange. Marathi medium.", minutesAfterStart: 0 },
      { authorName: "Sushma D.", content: "Aurangabad here. Marathi medium. Daily 1 essay exchange?", minutesAfterStart: 100 },
    ],
  },
  {
    title: "Late nights vs early mornings — what actually works?",
    authorName: "Shishya AI",
    minutesAgo: 590,
    messages: [
      { authorName: "Shishya AI", content: "Aspirants — share your honest sleep pattern + how it correlates with mock scores. Genuine question, no judgement. Patterns help newer students plan.", minutesAfterStart: 0 },
      { authorName: "Arjun B.", content: "5:30 AM start, sleep by 10:30 PM. Mock scores best on days I didn't break this. Late nights gave me 8% drop the next day, every time.", minutesAfterStart: 25 },
      { authorName: "Imran S.", content: "Opposite — I'm a 11 PM to 2 AM person. Sleep till 9 AM. Mock scores fine. Knowing your chronotype matters more than 'best practices'.", minutesAfterStart: 75 },
    ],
  },
  {
    title: "Switching from CA to Govt jobs — anyone made this transition?",
    authorName: "Sneha B.",
    minutesAgo: 720,
    messages: [
      { authorName: "Sneha B.", content: "CA Inter cleared, but burnt out. Looking at SSC CGL Inspector roles. Anyone made this switch? How was the prep transition?", minutesAfterStart: 0 },
      { authorName: "Vikash D.", content: "Did this in 2024. CA quants is overkill for SSC — you'll find Quants easy. Reasoning + GA are the new things to learn. Took me 6 months from CA Inter to SSC Tier 1 selection.", minutesAfterStart: 90 },
    ],
  },
  {
    title: "UPSC optional — PSIR vs Sociology, scoring trends 2024-2025",
    examCode: "UPSC_PRELIMS",
    authorName: "Aman R.",
    minutesAgo: 1080,
    messages: [
      { authorName: "Aman R.", content: "Both interest me equally. Looking purely at scoring + content load + overlap with GS, what's been the recent trend?", minutesAfterStart: 0 },
      { authorName: "Manish K.", content: "PSIR has more GS overlap (especially polity + IR). Sociology scores slightly higher on average but content load is higher too. PSIR is the safer choice if you're balancing prelims + mains.", minutesAfterStart: 100 },
    ],
  },
];

async function main() {
  const exams = await prisma.exam.findMany({ select: { id: true, code: true } });
  const examByCode = new Map(exams.map((e) => [e.code, e.id]));

  console.log(`Seeding ${SEEDS.length} extra discussion threads (rolling-feed enrichment)...`);
  let created = 0, skipped = 0;
  for (const seed of SEEDS) {
    const existing = await prisma.discussion.findFirst({ where: { title: seed.title } });
    if (existing) { skipped++; continue; }

    const baseAt = new Date(Date.now() - seed.minutesAgo * 60 * 1000);
    const examId = seed.examCode ? examByCode.get(seed.examCode) : undefined;

    const thread = await prisma.discussion.create({
      data: {
        title: seed.title,
        examId: examId ?? null,
        authorName: seed.authorName,
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
      data: { messageCount: seed.messages.length, lastActivityAt: lastMessageAt },
    });
    created++;
    console.log(`  ✓ "${seed.title.slice(0, 55)}…" (${seed.messages.length} msgs, ${seed.minutesAgo}m ago)`);
  }
  console.log(`\nDone — ${created} created, ${skipped} skipped (already present).`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
