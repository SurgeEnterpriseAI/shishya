// Maharashtra Police Constable Bharti — full syllabus tree.
// 100 MCQs in 90 minutes, 100 marks (no negative marking, exam in Marathi).
// Four sections of 25 marks each: Marathi, Mathematics, General Knowledge & Current Affairs,
//                                  Intellectual Test (Reasoning).
// Source: mahapolice.gov.in / Maharashtra Police Bharti recruitment notification + Adda247 cross-check.
//
// Run after seedExams: npx tsx seed/exams/mh-police-bharti-syllabus.ts

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

export const mhPoliceBhartiSyllabus: SubjectSeed[] = [
  // ── MARATHI LANGUAGE (25 Qs) ───────────────────────────────────────────
  {
    code: "LANG",
    name: "Marathi Language (मराठी)",
    weight: 0.25,
    topics: [
      { code: "marathi.varnamala", name: "Marathi Varnamala", description: "Marathi alphabet, vowels and consonants." },
      { code: "marathi.shabd_jaati", name: "Shabd Jaati (Parts of Speech)", description: "Noun, pronoun, adjective, verb and adverb in Marathi." },
      { code: "marathi.sandhi", name: "Sandhi", description: "Marathi sandhi rules — swar and vyanjan sandhi." },
      { code: "marathi.samas", name: "Samas", description: "Compound words in Marathi grammar." },
      { code: "marathi.synonyms", name: "Samanarthi Shabd (Synonyms)", description: "Marathi synonyms for common words." },
      { code: "marathi.antonyms", name: "Virudharthi Shabd (Antonyms)", description: "Marathi antonyms for common words." },
      { code: "marathi.idioms", name: "Vakprachar & Mhani", description: "Marathi idioms and proverbs with meanings." },
      { code: "marathi.ling_vachan", name: "Ling & Vachan", description: "Gender and number in Marathi grammar." },
      { code: "marathi.kaal", name: "Kaal (Tenses)", description: "Past, present, future tenses." },
      { code: "marathi.vakya_rachna", name: "Vakya Rachna", description: "Sentence construction and grammatical correction." },
      { code: "marathi.alankar_chhand", name: "Alankar & Chhand", description: "Figures of speech and metres in Marathi." },
      { code: "marathi.shabd_siddhi", name: "Shabd Siddhi (Word Formation)", description: "Tatsam, tadbhav, deshi, videshi word categorisation." },
      { code: "marathi.gadyansh", name: "Gadyansh / Comprehension", description: "Unseen passage with comprehension questions." },
    ],
  },

  // ── MATHEMATICS (25 Qs) ────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 0.25,
    topics: [
      { code: "math.number_system", name: "Number System", description: "Natural, whole, integer, rational numbers and properties." },
      { code: "math.lcm_hcf", name: "LCM & HCF", description: "Highest common factor and lowest common multiple problems." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS and computation tricks." },
      { code: "math.percentage", name: "Percentage", description: "Percentage applications and discounts." },
      { code: "math.profit_loss", name: "Profit & Loss", description: "CP, SP, MP and discount problems." },
      { code: "math.ratio_proportion", name: "Ratio & Proportion", description: "Direct/inverse ratios and partnership." },
      { code: "math.average", name: "Average", description: "Mean and weighted average questions." },
      { code: "math.si_ci", name: "Simple & Compound Interest", description: "SI, CI for various compounding periods." },
      { code: "math.time_work", name: "Time & Work", description: "Work, wages, pipes and cisterns." },
      { code: "math.time_distance", name: "Time & Distance", description: "Speed, trains, boats and streams." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter, volume of 2-D and 3-D figures." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles, triangles and circles basics." },
      { code: "math.area_volume", name: "Area & Volume", description: "Surface area and volume of cube, cuboid, sphere, cylinder." },
      { code: "math.algebra", name: "Algebra", description: "Linear equations and basic identities." },
    ],
  },

  // ── GENERAL KNOWLEDGE & CURRENT AFFAIRS (25 Qs) ────────────────────────
  {
    code: "GK",
    name: "General Knowledge & Current Affairs",
    weight: 0.25,
    topics: [
      { code: "gk.history_india", name: "Indian History", description: "Ancient, medieval, modern history of India." },
      { code: "gk.freedom_struggle", name: "Indian Freedom Struggle", description: "1857, INC, Gandhian movements, partition." },
      { code: "gk.geography_india", name: "Indian Geography", description: "Physical, economic and political geography of India." },
      { code: "gk.polity", name: "Indian Polity & Constitution", description: "Constitution, Parliament and judiciary basics." },
      { code: "gk.economy", name: "Indian Economy", description: "Banking, GDP, inflation, agriculture and budget." },
      { code: "gk.science", name: "General Science", description: "Physics, chemistry, biology basics and applications." },
      { code: "gk.tech", name: "Science & Technology", description: "Space, IT, biotech and recent inventions." },
      { code: "gk.sports", name: "Sports", description: "National and international sports events and players." },
      { code: "gk.awards", name: "Awards & Honours", description: "Padma awards, Nobel, gallantry and recent honours." },
      { code: "gk.literature_culture", name: "Literature & Culture", description: "Indian literature, traditions and cultural heritage." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events of last 12-18 months." },
      { code: "gk.computer", name: "Computer Knowledge", description: "Hardware, software, MS Office and internet basics." },
      { code: "gk.mh_history", name: "Maharashtra History", description: "Maratha empire, Shivaji, Peshwas and freedom struggle in Maharashtra." },
      { code: "gk.mh_freedom", name: "Maharashtra & Freedom Movement", description: "Lokmanya Tilak, Savarkar, Phule, Ambedkar — Maharashtra contribution." },
      { code: "gk.mh_geography", name: "Maharashtra Geography", description: "Sahyadri, rivers, climate, districts and crops of Maharashtra." },
      { code: "gk.mh_polity", name: "Maharashtra Polity & Administration", description: "State government structure, schemes and welfare programmes." },
      { code: "gk.mh_culture", name: "Maharashtra Culture & Festivals", description: "Lavani, Tamasha, Ganesh Utsav, warkari sampraday." },
      { code: "gk.mh_personalities", name: "Prominent Maharashtra Personalities", description: "Saints, social reformers, sportspersons and leaders of Maharashtra." },
    ],
  },

  // ── INTELLECTUAL TEST / REASONING (25 Qs) ──────────────────────────────
  {
    code: "REASONING",
    name: "Intellectual Test (Reasoning)",
    weight: 0.25,
    topics: [
      { code: "reason.verbal", name: "Verbal Reasoning", description: "Statement-conclusion, syllogism, assumption-based questions." },
      { code: "reason.non_verbal", name: "Non-Verbal Reasoning", description: "Figural series, mirror image, paper folding and embedded figures." },
      { code: "reason.coding", name: "Coding-Decoding", description: "Letter, number and symbol coding patterns." },
      { code: "reason.syllogism", name: "Syllogism", description: "Logical conclusions from given premises." },
      { code: "reason.blood_relation", name: "Blood Relations", description: "Family-tree puzzles." },
      { code: "reason.classification", name: "Classification", description: "Odd one out — verbal, numerical and figural." },
      { code: "reason.analogy", name: "Analogies", description: "Word, number and figural analogies." },
      { code: "reason.alphabet_series", name: "Alphabet Series", description: "Letter sequences and alphabet position." },
      { code: "reason.word_arrangement", name: "Word Arrangement", description: "Dictionary order and meaningful word formation." },
      { code: "reason.sentence_arrangement", name: "Sentence Arrangement", description: "Para-jumbles and logical sentence ordering." },
      { code: "reason.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs." },
      { code: "reason.assertion_reason", name: "Assertion & Reason", description: "Cause-effect verification problems." },
      { code: "reason.problem_solving", name: "Problem Solving", description: "Seating, ordering and grouping puzzles." },
      { code: "reason.direction_test", name: "Direction Test", description: "Cardinal directions and final-position problems." },
      { code: "reason.number_series", name: "Number Series", description: "Find next/wrong/missing term." },
    ],
  },
];

export async function seedMhPoliceBhartiSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MH_POLICE_BHARTI" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MH_POLICE_BHARTI exam not found.");
  }
  console.log(`Seeding Maharashtra Police Bharti syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mhPoliceBhartiSyllabus.length; sIdx++) {
    const s = mhPoliceBhartiSyllabus[sIdx];
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
  seedMhPoliceBhartiSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
