// Adds depth to existing discussion threads (more replies, fresh timestamps)
// and seeds 8 brand-new "hot" threads at very recent timestamps so the
// home-page sidebar always shows multiple threads with "just now" / "5 min
// ago" activity badges — the rolling-feed feel.
//
// Idempotent: re-runs check messageCount and only top up what's missing.
//
// Run: DATABASE_URL=… npx tsx seed/discussions-followups.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────────────────────────────────
// 1. Follow-up messages added to existing threads (matched by title prefix).
//    Each entry's `minutesAgo` is the latest reply's age — older replies
//    are spaced backward from there.
// ─────────────────────────────────────────────────────────────────────────
interface FollowupSet {
  titlePrefix: string;
  newReplies: Array<{ authorName: string; content: string; minutesAgo: number }>;
}

const FOLLOWUPS: FollowupSet[] = [
  {
    titlePrefix: "SSC CGL Tier 1 — what's the realistic cutoff",
    newReplies: [
      { authorName: "Karthik R.", content: "Region-wise data: Northern zone consistently 3-4 marks higher than Southern. If you're from TN/Kerala, you have slightly more buffer.", minutesAgo: 6 },
      { authorName: "Imran A.", content: "Adding: SSC's score normalization across shifts adds another ~2-3 marks of variance. Don't aim for the 'cutoff' — aim for cutoff + 8.", minutesAgo: 18 },
      { authorName: "Pooja S.", content: "Final word: 152 is my safe target. Anything below 145 is gambling.", minutesAgo: 35 },
    ],
  },
  {
    titlePrefix: "Aspirants from Telangana — let's connect",
    newReplies: [
      { authorName: "Sai T.", content: "Khammam here. 7 PM works perfectly. Discord or WhatsApp?", minutesAgo: 14 },
      { authorName: "Shravya R.", content: "Discord — easier to share screen for problem-solving. I'll DM the link to everyone here.", minutesAgo: 22 },
      { authorName: "Manish K.", content: "Joined. First session tomorrow 7 PM. Topic: Time & Distance.", minutesAgo: 41 },
    ],
  },
  {
    titlePrefix: "Reasoning section is killing me",
    newReplies: [
      { authorName: "Geetha P.", content: "Plus one for Venn shortcuts. Also: practice 20 syllogisms a day for 2 weeks straight. By day 10 your brain stops thinking and starts pattern-matching.", minutesAgo: 12 },
      { authorName: "Manish P.", content: "Update — 8 days into the daily 20-Q drill. Average solve time dropped from 45s to 28s per Q. Insane improvement.", minutesAgo: 33 },
    ],
  },
  {
    titlePrefix: "Daily schedule — working professional",
    newReplies: [
      { authorName: "Anita G.", content: "Started Sunday full mocks last weekend. Score: 138/200. Found out my GA is 60% of the gap. Will report back in 4 weeks.", minutesAgo: 28 },
      { authorName: "Vikram L.", content: "Working pro here too. The 10 PM sleep + 5 AM wake protocol changed everything. 3 hours of fresh-brain study before work hits different than tired evening study.", minutesAgo: 67 },
    ],
  },
  {
    titlePrefix: "NEET UG 2026 — pattern changes",
    newReplies: [
      { authorName: "Dr. Ramesh (Faculty)", content: "Just got the official PDF from a colleague at NTA. Pattern is unchanged. The rumour was about NEET PG, not NEET UG. Carry on with current prep.", minutesAgo: 41 },
      { authorName: "Dr. (aspiring) Suresh", content: "Massive relief. Thanks for the verification, sir.", minutesAgo: 58 },
    ],
  },
  {
    titlePrefix: "JEE Main April attempt",
    newReplies: [
      { authorName: "Karthik N.", content: "Update — went from 89 in Jan to 96.4 in April. Did NOT drop. Aisha was right.", minutesAgo: 92 },
      { authorName: "Aisha B.", content: "Yes!! Congrats. Tell other Jan-attempters this story — too many people drop unnecessarily.", minutesAgo: 110 },
    ],
  },
  {
    titlePrefix: "Free vs paid mock platforms",
    newReplies: [
      { authorName: "Rajesh K.", content: "Adda247 PYQ database is unbeatable for SSC. Their AI mocks lag though. Mix-and-match is the play.", minutesAgo: 47 },
      { authorName: "Shishya AI", content: "We added 251 expert-curated questions across SSC CGL Quant + Reasoning + English this week. NEET Physics + Chemistry banks are also live. Always free.", minutesAgo: 89 },
    ],
  },
  {
    titlePrefix: "Form filling for SSC CGL",
    newReplies: [
      { authorName: "Aman J.", content: "Confirming: SBI net banking still works. Avoid HDFC mobile app version 12.6 — that's been throwing token errors today.", minutesAgo: 38 },
      { authorName: "Sneha R.", content: "All sorted on my end. Form ID came through. Now waiting for admit card window.", minutesAgo: 73 },
    ],
  },
  {
    titlePrefix: "Just got 142/200 in last SSC mock",
    newReplies: [
      { authorName: "Akash R.", content: "Day 4 of GA daily compilation: I now know more about Bharat Ratna recipients than I ever wanted. Quants slipped because I'm spending too much time on GA. Balancing act.", minutesAgo: 16 },
      { authorName: "Lakshmi V.", content: "Don't trade marks for marks. Cap GA at 30 min/day, lock Quant practice at minimum 1 hour. Maintain Quants > improve GA.", minutesAgo: 25 },
      { authorName: "Tushar N.", content: "Plus one to Lakshmi. I made the same mistake — ended up with 165 GA + 110 Quant. Bombed Tier 1.", minutesAgo: 44 },
    ],
  },
  {
    titlePrefix: "JEE Maths shortcuts",
    newReplies: [
      { authorName: "Divya R.", content: "Differentiation: log differentiation for products of multiple terms saves 60% time on chain rule questions.", minutesAgo: 19 },
      { authorName: "Akash V.", content: "Vectors: dot/cross product geometric interpretation > component-wise calc for most JEE problems.", minutesAgo: 32 },
    ],
  },
  {
    titlePrefix: "IBPS PO Prelims — Quants timing strategy",
    newReplies: [
      { authorName: "Shreya M.", content: "I do reasoning first (saves 4 min vs Quants for me). Then English. Quants last with whatever time remains. Weird strategy but my pre cutoff went +6 marks last year.", minutesAgo: 26 },
      { authorName: "Meena G.", content: "Whatever works for your strengths is right. The trap is forcing the 'official' order when you're better at one section.", minutesAgo: 51 },
    ],
  },
  {
    titlePrefix: "NEET Bio — NCERT line by line",
    newReplies: [
      { authorName: "Nikhil S.", content: "AIIMS PGY2 here. Most of us in med school did NCERT 4-6 times + last 15 years' PYQs. NCERT exhaustively > random reference books superficially.", minutesAgo: 38 },
      { authorName: "Priya S.", content: "Wow that settles it. NCERT it is. Thank you everyone.", minutesAgo: 56 },
    ],
  },
  {
    titlePrefix: "How are you tracking current affairs daily",
    newReplies: [
      { authorName: "Aarav T.", content: "Inshorts (5 min) + PIB (10 min) + The Hindu opinion column (15 min). 30 min/day. Compounds beautifully.", minutesAgo: 44 },
      { authorName: "Vikram T.", content: "Going with Inshorts + PIB combo for SSC. Hindu opinion adds too much for SSC level. Saving for UPSC prep later.", minutesAgo: 78 },
    ],
  },
  {
    titlePrefix: "UPSC notes — handwritten, digital",
    newReplies: [
      { authorName: "Aman R.", content: "Notion + paper hybrid for me. Notion stores; paper revises. Searchability + memory consolidation in one workflow.", minutesAgo: 53 },
      { authorName: "Bhavna R.", content: "Adding: weekly review by re-reading paper notes is what cements memory. Digital alone = forgotten.", minutesAgo: 71 },
    ],
  },
  {
    titlePrefix: "GATE CSE — Operating Systems is killing me",
    newReplies: [
      { authorName: "Ravi P.", content: "Specifically: deadlocks + memory management eat 70% of GATE OS marks. Concentrate there. Process scheduling can be skimmed.", minutesAgo: 84 },
    ],
  },
  {
    titlePrefix: "Stress + anxiety during prep",
    newReplies: [
      { authorName: "Asha N.", content: "Therapy. Saw a counsellor 3 weeks. Best decision of my prep year. Don't underestimate it as 'something for weak people'.", minutesAgo: 102 },
      { authorName: "Shishya AI", content: "If anyone's struggling: iCall (9152987821) and Vandrevala (1860-2662-345) are confidential, free, 24/7. Talking to a stranger is safer than holding it in.", minutesAgo: 134 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// 2. Brand-new "hot" threads with very recent timestamps so the sidebar
//    top always shows fresh activity.
// ─────────────────────────────────────────────────────────────────────────
interface HotThread {
  title: string;
  examCode?: string;
  authorName: string;
  minutesAgo: number;
  messages: Array<{ authorName: string; content: string; minutesAfterStart: number }>;
}

const HOT_THREADS: HotThread[] = [
  {
    title: "Anyone else's mock score dropped this week? Or just me",
    examCode: "SSC_CGL",
    authorName: "Sneha M.",
    minutesAgo: 2,
    messages: [
      { authorName: "Sneha M.", content: "Was averaging 158/200. Last 3 mocks: 142, 138, 144. Did nothing differently. Anyone else?", minutesAfterStart: 0 },
      { authorName: "Karthik J.", content: "Yes — 162 → 148 over last 2 weeks. Asked my coaching: it's mock fatigue. They recommend 1 full rest day + targeted topic drilling instead of full mocks for 5 days.", minutesAfterStart: 1 },
    ],
  },
  {
    title: "SSC CGL admit card — when releasing?",
    examCode: "SSC_CGL",
    authorName: "Vikash D.",
    minutesAgo: 4,
    messages: [
      { authorName: "Vikash D.", content: "Notification said 'Tier 1 admit card 10 days before exam'. Anyone has actual date or just noise?", minutesAfterStart: 0 },
      { authorName: "Pooja S.", content: "Per the official PDF, admit card window opens July 23. Exam slots Aug 7 onwards. Your shift will be on the card.", minutesAfterStart: 2 },
    ],
  },
  {
    title: "Trick to remember Indian PMs in order — sharing my mnemonic",
    examCode: "SSC_CGL",
    authorName: "Asha B.",
    minutesAgo: 7,
    messages: [
      { authorName: "Asha B.", content: "Made this mnemonic for first 10 PMs (in order):\n'Naked Lal Indu Murari Cha Indu Rani Vish Cha Naras' — Nehru, Lal (Bahadur), Indira, Morarji, Charan Singh, Indira (again), Rajiv, V P Singh, Chandrashekhar, Narasimha Rao.\nWorks for me. Steal it.", minutesAfterStart: 0 },
      { authorName: "Mohammed F.", content: "Genius. Stealing.", minutesAfterStart: 3 },
      { authorName: "Geetha K.", content: "Bookmarked. Send the post-Narasimha mnemonic when you make it.", minutesAfterStart: 5 },
    ],
  },
  {
    title: "JEE Mains shift 2 today — how was the paper?",
    examCode: "JEE_MAIN",
    authorName: "Karthik J.",
    minutesAgo: 12,
    messages: [
      { authorName: "Karthik J.", content: "Just walked out of shift 2. Maths felt borderline brutal — 3 problems took most of my time. Physics was OK, Chem was the easiest section. Anyone else?", minutesAfterStart: 0 },
      { authorName: "Aisha P.", content: "Same shift. Maths question on conic sections (Q42-ish?) was lethal. Got it after 2nd attempt but lost ~6 minutes.", minutesAfterStart: 4 },
      { authorName: "Pranav K.", content: "Shift 1 here. Felt easier. Trying not to spook future-you — sample-of-2 says nothing. Wait for normalisation.", minutesAfterStart: 8 },
    ],
  },
  {
    title: "Cleared Tier 2! Ask me anything (SSC CGL Inspector)",
    examCode: "SSC_CGL",
    authorName: "Lakshmi V.",
    minutesAgo: 18,
    messages: [
      { authorName: "Lakshmi V.", content: "Just got the result. Posting here because this community helped me through 2023 prep. AMA — happy to share anything.", minutesAfterStart: 0 },
      { authorName: "Akash R.", content: "Congratulations! What was your Tier 1 + Tier 2 score breakdown?", minutesAfterStart: 3 },
      { authorName: "Lakshmi V.", content: "Tier 1: 168/200 (Quant 92, Reasoning 84, GA 96, English 96)\nTier 2: 412/450 across all papers.\nNot a topper, but consistent.", minutesAfterStart: 7 },
      { authorName: "Manish K.", content: "What's the ONE thing you'd tell first-time aspirants?", minutesAfterStart: 11 },
      { authorName: "Lakshmi V.", content: "Stop changing strategies. Pick one resource per section, one mock platform, one daily routine. Spend 6 months executing — not another week 'researching'.", minutesAfterStart: 14 },
    ],
  },
  {
    title: "Best YouTube channels for Hindi-medium aspirants?",
    authorName: "Ravi K.",
    minutesAgo: 23,
    messages: [
      { authorName: "Ravi K.", content: "Hindi medium SSC CGL. English-medium YT content has 10x options but Hindi feels limited. Recommend channels you've actually watched 50+ hours of?", minutesAfterStart: 0 },
      { authorName: "Deepak Y.", content: "Adda247 Hindi, Wifistudy (older content), Examपुर — all solid. Mahendras गणित channel for Quant specifically.", minutesAfterStart: 6 },
      { authorName: "Pooja M.", content: "Adding: Khan GS Research Centre for GA in Hindi. Comprehensive.", minutesAfterStart: 14 },
    ],
  },
  {
    title: "Should I quit my job to prepare full-time? Decision paralysis",
    authorName: "Anita G.",
    minutesAgo: 27,
    messages: [
      { authorName: "Anita G.", content: "Been working + prepping for 8 months. Mock scores plateaued. Family supportive of dropping job for 6 months. But scared of zero income. Honest opinions?", minutesAfterStart: 0 },
      { authorName: "Rohit V.", content: "Plateau ≠ ceiling. Most plateaus break with method change, not time change. I'd try 4 weeks of new approach before quitting income.", minutesAfterStart: 8 },
      { authorName: "Sushma D.", content: "I quit. Don't regret it. But I had 6 months runway saved. Without runway, dropping is gambling. Math the runway first, decision second.", minutesAfterStart: 17 },
    ],
  },
  {
    title: "What's your morning study routine? Looking for ideas",
    authorName: "Tushar V.",
    minutesAgo: 35,
    messages: [
      { authorName: "Tushar V.", content: "Trying to optimize my 5-7 AM block. What does your ideal morning study session look like? Cold-brew + notebook? Yoga first? Walking + audio?", minutesAfterStart: 0 },
      { authorName: "Divya N.", content: "5 AM wake → 15 min walk (no phone) → cold water + coffee → 2 hours math/quants (hardest stuff first while brain is fresh).", minutesAfterStart: 9 },
      { authorName: "Imran S.", content: "Reverse for me — I do English/RC first when half-awake. Math after I'm fully alert. Know thyself.", minutesAfterStart: 21 },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────
async function main() {
  // ── Step 1: extend existing threads ──────────────────────────────────
  console.log("Adding follow-up replies to existing threads...");
  let extendedThreads = 0,
    addedReplies = 0;
  for (const set of FOLLOWUPS) {
    const thread = await prisma.discussion.findFirst({
      where: { title: { startsWith: set.titlePrefix } },
    });
    if (!thread) {
      console.warn(`  ⚠ skip — no thread starting with "${set.titlePrefix.slice(0, 30)}…"`);
      continue;
    }

    let added = 0;
    let latestAt = thread.lastActivityAt;
    for (const r of set.newReplies) {
      const createdAt = new Date(Date.now() - r.minutesAgo * 60 * 1000);
      // Idempotency: skip if a message with this exact content already exists
      const dup = await prisma.discussionMessage.findFirst({
        where: { threadId: thread.id, content: r.content },
      });
      if (dup) continue;
      await prisma.discussionMessage.create({
        data: { threadId: thread.id, authorName: r.authorName, content: r.content, createdAt },
      });
      added++;
      if (createdAt > latestAt) latestAt = createdAt;
    }
    if (added > 0) {
      await prisma.discussion.update({
        where: { id: thread.id },
        data: {
          messageCount: { increment: added },
          lastActivityAt: latestAt,
        },
      });
      extendedThreads++;
      addedReplies += added;
      console.log(`  ✓ +${added} replies → "${set.titlePrefix.slice(0, 50)}…"`);
    }
  }
  console.log(`Extended ${extendedThreads} threads with ${addedReplies} new replies.`);

  // ── Step 2: seed brand-new hot threads ───────────────────────────────
  console.log("\nSeeding hot threads...");
  const examMap = new Map(
    (await prisma.exam.findMany({ select: { id: true, code: true } })).map((e) => [e.code, e.id])
  );
  let newThreads = 0;
  for (const seed of HOT_THREADS) {
    const existing = await prisma.discussion.findFirst({ where: { title: seed.title } });
    if (existing) {
      console.log(`  · skip — "${seed.title.slice(0, 50)}…" already exists`);
      continue;
    }
    const baseAt = new Date(Date.now() - seed.minutesAgo * 60 * 1000);
    const examId = seed.examCode ? examMap.get(seed.examCode) : undefined;

    const thread = await prisma.discussion.create({
      data: {
        title: seed.title,
        examId: examId ?? null,
        authorName: seed.authorName,
        createdAt: baseAt,
        lastActivityAt: baseAt,
      },
    });
    let lastAt = baseAt;
    for (const m of seed.messages) {
      const createdAt = new Date(baseAt.getTime() + m.minutesAfterStart * 60 * 1000);
      await prisma.discussionMessage.create({
        data: { threadId: thread.id, authorName: m.authorName, content: m.content, createdAt },
      });
      if (createdAt > lastAt) lastAt = createdAt;
    }
    await prisma.discussion.update({
      where: { id: thread.id },
      data: { messageCount: seed.messages.length, lastActivityAt: lastAt },
    });
    newThreads++;
    console.log(`  ✓ "${seed.title.slice(0, 55)}…" (${seed.messages.length} msgs, ${seed.minutesAgo}m ago)`);
  }
  console.log(`\nSeeded ${newThreads} new hot threads.`);

  // ── Summary ──────────────────────────────────────────────────────────
  const totalThreads = await prisma.discussion.count();
  const totalMessages = await prisma.discussionMessage.count();
  console.log(`\nTotal in DB now: ${totalThreads} threads · ${totalMessages} messages`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
