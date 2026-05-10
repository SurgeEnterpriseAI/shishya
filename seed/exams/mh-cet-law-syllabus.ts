// MH-CET Law (Maharashtra Common Entrance Test for Law — 3-yr & 5-yr LLB) — full syllabus tree.
// Conducting body: State Common Entrance Test Cell, Maharashtra (cetcell.mahacet.org).
// Pattern: 150 MCQs in 2 hours. Sections: Legal Aptitude & Legal Reasoning (40 Qs), Logical & Analytical
// Reasoning (40 Qs), General Knowledge & Current Affairs (30 Qs), English (30 Qs),
// Mathematical Aptitude (10 Qs — only for 5-yr LLB). No negative marking.
//
// Run after seedExams: npx tsx seed/exams/mh-cet-law-syllabus.ts

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

export const mhCetLawSyllabus: SubjectSeed[] = [
  // ── LEGAL APTITUDE & LEGAL REASONING ─────────────────────────────────
  {
    code: "LEGAL_APTITUDE",
    name: "Legal Aptitude and Legal Reasoning",
    weight: 1,
    topics: [
      { code: "legal.constitutional_law", name: "Indian Constitutional Law — Basics", description: "Preamble, fundamental rights, directive principles, fundamental duties." },
      { code: "legal.union_state", name: "Union and State — Structure", description: "Parliament, executive, judiciary, centre-state relations, federal structure." },
      { code: "legal.judiciary", name: "Indian Judiciary", description: "Supreme Court, High Courts, subordinate judiciary, judicial review, PIL." },
      { code: "legal.contract_law", name: "Indian Contract Act, 1872", description: "Offer, acceptance, consideration, capacity, consent, void and voidable contracts." },
      { code: "legal.tort_law", name: "Law of Torts", description: "General principles, negligence, nuisance, defamation, trespass, defences." },
      { code: "legal.criminal_law_ipc", name: "Criminal Law — Indian Penal Code, 1860", description: "Key IPC sections — offences against person, property, state; mens rea and actus reus." },
      { code: "legal.bharatiya_nyaya", name: "Bharatiya Nyaya Sanhita, 2023", description: "Replacement of IPC, key changes, new offences and definitions." },
      { code: "legal.ipr", name: "Intellectual Property Rights", description: "Copyright, trademark, patent — basic principles and Indian framework." },
      { code: "legal.legal_maxims", name: "Legal Maxims and Terms", description: "Common Latin legal maxims (e.g., audi alteram partem, ratio decidendi, obiter dicta)." },
      { code: "legal.legal_propositions", name: "Application of Legal Propositions to Facts", description: "Reading legal principles and applying to factual situations to derive conclusions." },
      { code: "legal.public_intl_law", name: "Public International Law — Basics", description: "Sources, UN, treaties, sovereignty, jurisdiction." },
      { code: "legal.legal_current_affairs", name: "Legal Current Affairs", description: "Recent landmark Supreme Court judgments, new bills, legal news." },
      { code: "legal.consumer_law", name: "Consumer Protection Law", description: "Consumer Protection Act 2019, consumer rights, redressal forums." },
      { code: "legal.family_law", name: "Family Law — Basics", description: "Hindu Marriage Act, Special Marriage Act, succession laws basics." },
      { code: "legal.environmental_law", name: "Environmental Law — Basics", description: "Environment Protection Act, Air & Water Acts, NGT, public trust doctrine." },
    ],
  },

  // ── LOGICAL AND ANALYTICAL REASONING ─────────────────────────────────
  {
    code: "LOGICAL_REASONING",
    name: "Logical and Analytical Reasoning",
    weight: 1,
    topics: [
      { code: "lr.syllogisms", name: "Syllogisms", description: "Deductive reasoning from given premises using categorical statements." },
      { code: "lr.seating_arrangement", name: "Seating Arrangements", description: "Linear, circular, double-row arrangements with conditions." },
      { code: "lr.blood_relations", name: "Blood Relations", description: "Family relationship problems, coded relations." },
      { code: "lr.coding_decoding", name: "Coding-Decoding", description: "Letter, number and symbol-based coding patterns." },
      { code: "lr.direction_sense", name: "Direction Sense", description: "Direction and distance problems, shortest path." },
      { code: "lr.series", name: "Number and Letter Series", description: "Identifying patterns, missing terms, analogies." },
      { code: "lr.analogies", name: "Analogies", description: "Word, number and figure analogies, relationship-based reasoning." },
      { code: "lr.statement_assumption", name: "Statement and Assumption / Conclusion", description: "Critical reasoning — hidden assumptions, valid conclusions." },
      { code: "lr.data_interpretation", name: "Data Interpretation", description: "Tables, bar graphs, line graphs, pie charts." },
      { code: "lr.data_sufficiency", name: "Data Sufficiency", description: "Identifying minimum data required to answer questions." },
      { code: "lr.calendar_clocks", name: "Calendar and Clocks", description: "Day calculations, leap years, angle between hands of a clock." },
      { code: "lr.puzzles", name: "Puzzles", description: "Mixed condition-based logical puzzles." },
    ],
  },

  // ── GENERAL KNOWLEDGE WITH CURRENT AFFAIRS ───────────────────────────
  {
    code: "GENERAL_KNOWLEDGE",
    name: "General Knowledge with Current Affairs",
    weight: 1,
    topics: [
      { code: "gk.indian_history", name: "Indian History", description: "Ancient, medieval, modern India; freedom struggle, post-independence India." },
      { code: "gk.indian_geography", name: "Indian and World Geography", description: "Physical, political, economic geography of India and world." },
      { code: "gk.indian_polity", name: "Indian Polity", description: "Constitution, government structure, elections, recent amendments." },
      { code: "gk.indian_economy", name: "Indian Economy", description: "Budget, GDP, banking, fiscal and monetary policy, schemes." },
      { code: "gk.science_tech", name: "Science and Technology", description: "Major scientific developments, ISRO, defence tech, biotech." },
      { code: "gk.sports", name: "Sports", description: "National and international tournaments, awards, records." },
      { code: "gk.awards_honours", name: "Awards and Honours", description: "Nobel, Padma, Bharat Ratna, national and international recognitions." },
      { code: "gk.books_authors", name: "Books and Authors", description: "Recent and classic books, autobiographies, literary awards." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events of the last 6-12 months." },
      { code: "gk.international_orgs", name: "International Organisations", description: "UN, WHO, WTO, IMF, World Bank, BRICS, G20." },
    ],
  },

  // ── ENGLISH ──────────────────────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "English",
    weight: 1,
    topics: [
      { code: "eng.reading_comprehension", name: "Reading Comprehension", description: "Understanding passages, inference, vocabulary in context." },
      { code: "eng.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution, idioms and phrases." },
      { code: "eng.grammar", name: "Grammar", description: "Tenses, articles, prepositions, subject-verb agreement, sentence correction." },
      { code: "eng.fill_blanks", name: "Fill in the Blanks", description: "Single and double blanks based on grammar and vocabulary." },
      { code: "eng.error_spotting", name: "Error Spotting", description: "Identifying grammatical errors in sentences." },
      { code: "eng.para_jumbles", name: "Para Jumbles", description: "Rearranging sentences to form a coherent paragraph." },
      { code: "eng.cloze_test", name: "Cloze Test", description: "Filling blanks in a passage with appropriate words." },
    ],
  },

  // ── MATHEMATICAL APTITUDE ────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematical Aptitude (5-yr LLB only)",
    weight: 1,
    topics: [
      { code: "math.arithmetic", name: "Arithmetic", description: "Percentages, profit and loss, simple and compound interest, ratio and proportion." },
      { code: "math.algebra", name: "Algebra", description: "Linear and quadratic equations, simplification of expressions." },
      { code: "math.time_work", name: "Time and Work", description: "Work-time problems, pipes and cisterns." },
      { code: "math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats and streams, average speed." },
      { code: "math.mensuration", name: "Mensuration", description: "Areas and perimeters of plane figures, volumes of solids." },
      { code: "math.statistics", name: "Statistics and Data", description: "Mean, median, mode, basic data interpretation." },
    ],
  },
];

export async function seedMhCetLawSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MH_MAHCET_LAW" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MH_MAHCET_LAW exam not found.");
  }
  console.log(`Seeding MH-CET Law syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mhCetLawSyllabus.length; sIdx++) {
    const s = mhCetLawSyllabus[sIdx];
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
    console.log(`  ${s.code} — ${s.topics.length} topics`);
  }
  console.log(`Seeded MH-CET Law syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedMhCetLawSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
