// Tamil Nadu Police Constable (TNUSRB Grade II) — full syllabus tree.
// 100 MCQs in 90 minutes (after Tamil Eligibility Test of Part-I).
// Part II main exam: General Knowledge (45 Qs), Psychology (25 Qs),
// plus Math/Mental Ability, Tamil/English language elements (Part-I 80 Qs / Part-II 70 Qs).
// Source: tnusrb.tn.gov.in syllabus PDF + Verandarace / Recruitment.guru cross-check.
//
// Run after seedExams: npx tsx seed/exams/tn-police-pc-syllabus.ts

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface TopicSeed {
  code: string;
  name: string;
  description?: string;
  weight?: number;
  subtopics?: TopicSeed[];
}

interface SubjectSeed {
  code: string;
  name: string;
  weight: number;
  topics: TopicSeed[];
}

export const tnPolicePcSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE (45 Qs) ──────────────────────────────────────────
  {
    code: "GK",
    name: "General Knowledge",
    weight: 0.45,
    topics: [
      { code: "gk.history_india", name: "Indian History", description: "Ancient, medieval and modern Indian history; key dynasties and events." },
      { code: "gk.freedom_struggle", name: "Indian Freedom Struggle", description: "1857, INC, Gandhian movements, partition and integration." },
      { code: "gk.geography_india", name: "Indian Geography", description: "Physical, economic and political geography of India." },
      { code: "gk.geography_world", name: "World Geography", description: "Continents, oceans, climate and major countries." },
      { code: "gk.polity", name: "Indian Polity & Constitution", description: "Constitution, Parliament, judiciary and governance." },
      { code: "gk.economy", name: "Indian Economy", description: "Five-year plans, banking, budget and economic indicators." },
      { code: "gk.science", name: "General Science", description: "Physics, chemistry, biology and applications." },
      { code: "gk.tech", name: "Science & Technology", description: "Space, IT, biotech and recent scientific developments." },
      { code: "gk.sports", name: "Sports", description: "National and international sports events and players." },
      { code: "gk.awards", name: "Awards & Honours", description: "Padma, Nobel, Bharat Ratna and recent recipients." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events of last 12-18 months." },
      { code: "gk.computer", name: "Computer Knowledge", description: "Hardware, software, MS Office and internet basics." },
      { code: "gk.tn_history", name: "Tamil Nadu History", description: "Sangam age, Cholas, Pallavas, Pandyas, Vijayanagar and Nayaks." },
      { code: "gk.tn_freedom", name: "TN Freedom Struggle", description: "Polygar wars, Bharathi, V.O.C., Vedaranyam Salt Satyagraha." },
      { code: "gk.tn_geography", name: "Tamil Nadu Geography", description: "Districts, rivers, mountains, climate and crops of TN." },
      { code: "gk.tn_culture", name: "Tamil Nadu Culture", description: "Bharatanatyam, Carnatic music, festivals, temples and traditions." },
      { code: "gk.tn_polity", name: "Tamil Nadu Government & Schemes", description: "TN administration and welfare schemes — Amma series, mid-day meal." },
      { code: "gk.tn_personalities", name: "Tamil Nadu Personalities", description: "Periyar, Anna, Kamaraj, MGR, Jayalalithaa and contemporary leaders." },
    ],
  },

  // ── PSYCHOLOGY (25 Qs) ─────────────────────────────────────────────────
  {
    code: "PSYCHOLOGY",
    name: "Psychology / Mental Ability",
    weight: 0.25,
    topics: [
      { code: "psy.logical_reasoning", name: "Logical Reasoning", description: "Statement-conclusion, assumption and argument analysis." },
      { code: "psy.numerical_analogy", name: "Numerical Analogy", description: "Number-pair analogies and odd one out." },
      { code: "psy.figural_analogy", name: "Figural Analogy", description: "Pattern-matching analogies between figures." },
      { code: "psy.classification", name: "Classification", description: "Odd one out across verbal, numerical and figural sets." },
      { code: "psy.coding_decoding", name: "Coding-Decoding", description: "Letter/number/symbol coding patterns." },
      { code: "psy.series", name: "Series", description: "Letter, number and figural series — next/missing term." },
      { code: "psy.blood_relation", name: "Blood Relations", description: "Family-tree puzzles and statement-based relations." },
      { code: "psy.direction", name: "Direction Sense", description: "Cardinal directions and final-position problems." },
      { code: "psy.problem_solving", name: "Problem Solving", description: "Seating, ordering and matching puzzles." },
      { code: "psy.visual_memory", name: "Visual Memory & Discrimination", description: "Retention and differentiation of visual stimuli." },
      { code: "psy.observation", name: "Observation", description: "Counting figures and detail observation tasks." },
      { code: "psy.decision_making", name: "Decision Making", description: "Eligibility-based decision problems." },
      { code: "psy.judgement", name: "Judgement", description: "Situational judgement and moral reasoning." },
    ],
  },

  // ── MATHEMATICS / NUMERICAL ABILITY ────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics & Numerical Ability",
    weight: 0.15,
    topics: [
      { code: "math.simplification", name: "Simplification", description: "BODMAS and arithmetic simplification." },
      { code: "math.percentage", name: "Percentage", description: "Percentage applications." },
      { code: "math.profit_loss", name: "Profit & Loss", description: "CP, SP, MP, discount and profit/loss percent." },
      { code: "math.ratio_proportion", name: "Ratio & Proportion", description: "Compound ratio and partnership." },
      { code: "math.average", name: "Average", description: "Mean and weighted average problems." },
      { code: "math.si_ci", name: "Simple & Compound Interest", description: "SI and CI calculations." },
      { code: "math.time_work", name: "Time & Work", description: "Work efficiency and pipes/cisterns." },
      { code: "math.time_distance", name: "Time & Distance", description: "Trains, boats and streams." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter and volume." },
      { code: "math.algebra", name: "Algebra", description: "Linear equations and basic identities." },
      { code: "math.number_system", name: "Number System", description: "Number properties and divisibility." },
      { code: "math.lcm_hcf", name: "LCM & HCF", description: "Highest common factor and lowest common multiple." },
    ],
  },

  // ── TAMIL / ENGLISH LANGUAGE (Part I qualifying — 80 Qs) ───────────────
  {
    code: "LANG",
    name: "Tamil / English Language",
    weight: 0.15,
    topics: [
      { code: "lang.tamil_grammar", name: "Tamil Grammar", description: "Eluthu, sol, porul — basic Tamil grammar." },
      { code: "lang.tamil_literature", name: "Tamil Literature", description: "Sangam, bhakti, modern Tamil literature and authors." },
      { code: "lang.tamil_synonyms", name: "Tamil Synonyms & Antonyms", description: "Word meaning, opposites and one-word substitutes." },
      { code: "lang.tamil_idioms", name: "Tamil Idioms & Proverbs", description: "Common Tamil idioms and proverbs." },
      { code: "lang.tamil_comprehension", name: "Tamil Comprehension", description: "Unseen Tamil passage with questions." },
      { code: "lang.english_grammar", name: "English Grammar", description: "Tenses, articles, prepositions, voice and narration." },
      { code: "lang.english_vocab", name: "English Vocabulary", description: "Synonyms, antonyms and one-word substitution." },
      { code: "lang.english_idioms", name: "English Idioms & Phrases", description: "Common English idioms in context." },
      { code: "lang.english_comprehension", name: "English Comprehension", description: "Unseen passage and reading comprehension." },
      { code: "lang.translation", name: "Tamil-English Translation", description: "Basic translation between Tamil and English." },
    ],
  },
];

export async function seedTnPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TN_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TN_POLICE_PC exam not found.");
  }
  console.log(`Seeding Tamil Nadu Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tnPolicePcSyllabus.length; sIdx++) {
    const s = tnPolicePcSyllabus[sIdx];
    const subject = await prisma.subject.upsert({
      where: { examId_code: { examId: exam.id, code: s.code } },
      update: { name: s.name, weight: s.weight, orderIdx: sIdx },
      create: {
        examId: exam.id,
        code: s.code,
        name: s.name,
        weight: s.weight,
        orderIdx: sIdx,
      },
    });

    for (let tIdx = 0; tIdx < s.topics.length; tIdx++) {
      const t = s.topics[tIdx];
      const topic = await prisma.topic.upsert({
        where: { subjectId_code: { subjectId: subject.id, code: t.code } },
        update: {
          name: t.name,
          description: t.description ?? null,
          syllabusText: t.description ?? null,
          weight: t.weight ?? 1,
          orderIdx: tIdx,
          parentId: null,
        },
        create: {
          subjectId: subject.id,
          code: t.code,
          name: t.name,
          description: t.description ?? null,
          syllabusText: t.description ?? null,
          weight: t.weight ?? 1,
          orderIdx: tIdx,
        },
      });
      topicCount++;

      if (t.subtopics?.length) {
        for (let stIdx = 0; stIdx < t.subtopics.length; stIdx++) {
          const st = t.subtopics[stIdx];
          await prisma.topic.upsert({
            where: { subjectId_code: { subjectId: subject.id, code: st.code } },
            update: {
              name: st.name,
              description: st.description ?? null,
              syllabusText: st.description ?? null,
              parentId: topic.id,
              orderIdx: stIdx,
            },
            create: {
              subjectId: subject.id,
              parentId: topic.id,
              code: st.code,
              name: st.name,
              description: st.description ?? null,
              syllabusText: st.description ?? null,
              orderIdx: stIdx,
            },
          });
          topicCount++;
        }
      }
    }
    console.log(`  ✓ ${s.code} — ${s.topics.length} topics`);
  }
  console.log(`Done. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedTnPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
