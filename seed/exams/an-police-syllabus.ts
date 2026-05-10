// Andaman & Nicobar Islands Police Constable — full syllabus tree.
// 100 MCQs, 100 marks. Negative marking: 0.25.
// Sections: General Awareness, Reasoning/General Intelligence,
// Numerical Aptitude/Quantitative Aptitude, English/Hindi.
// Sources: police.andaman.gov.in, andamanpolice.in.
//
// Run after seedExams: npx tsx seed/exams/an-police-syllabus.ts

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

export const anPoliceSyllabus: SubjectSeed[] = [
  // ── GENERAL AWARENESS ──────────────────────────────────────────────────
  {
    code: "GA",
    name: "General Awareness",
    weight: 1.2,
    topics: [
      {
        code: "ga.history",
        name: "History",
        description: "Ancient, medieval, modern Indian history with A&N context.",
        subtopics: [
          { code: "ga.hist.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas." },
          { code: "ga.hist.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and regional kingdoms." },
          { code: "ga.hist.modern", name: "Modern India and Freedom Struggle", description: "1857, INC, Gandhian movements and partition." },
          { code: "ga.hist.cellular", name: "Cellular Jail and A&N History", description: "Kala Pani, Cellular Jail, Veer Savarkar and A&N's role in freedom struggle." },
          { code: "ga.hist.azad_hind", name: "Azad Hind and Netaji", description: "INA hoisting tricolour at Port Blair (1943) under Subhas Chandra Bose." },
        ],
      },
      {
        code: "ga.geography",
        name: "Geography",
        description: "Indian geography with focus on A&N.",
        subtopics: [
          { code: "ga.geo.physical", name: "Physical Geography of India", description: "Mountains, plains, rivers and climate of India." },
          { code: "ga.geo.an", name: "Geography of A&N Islands", description: "572 islands, North/Middle/South Andaman, Nicobar group, Saddle Peak." },
          { code: "ga.geo.tribes", name: "Tribes of A&N", description: "Particularly Vulnerable Tribal Groups — Sentinelese, Jarawa, Onge, Great Andamanese, Shompen." },
          { code: "ga.geo.world", name: "World Geography", description: "Continents, oceans, climate zones and countries." },
        ],
      },
      {
        code: "ga.polity",
        name: "Indian Polity and Constitution",
        description: "Constitution, governance and UT administration.",
        subtopics: [
          { code: "ga.pol.constitution", name: "Constitution of India", description: "Preamble, salient features and historical evolution." },
          { code: "ga.pol.fr", name: "Fundamental Rights and DPSP", description: "Articles 12-51A — rights, duties and DPSP." },
          { code: "ga.pol.union", name: "Union Government", description: "President, PM, Parliament and Council of Ministers." },
          { code: "ga.pol.ut", name: "UT Administration of A&N", description: "Lieutenant Governor, no legislature, district administration." },
        ],
      },
      {
        code: "ga.economy",
        name: "Indian Economy",
        description: "Indian economy basics and welfare schemes.",
        subtopics: [
          { code: "ga.eco.basics", name: "Economic Basics", description: "Sectoral composition, GDP, inflation, fiscal/monetary policy." },
          { code: "ga.eco.banking", name: "Banking and Finance", description: "RBI, commercial banks, GST and budget." },
          { code: "ga.eco.schemes", name: "Welfare Schemes", description: "Major Central schemes — PMAY, PMJDY, MNREGA, Ayushman Bharat." },
        ],
      },
      {
        code: "ga.science",
        name: "General Science",
        description: "Science of everyday observation and current S&T.",
        subtopics: [
          { code: "ga.sci.physics", name: "Physics", description: "Force, motion, heat, light, sound, electricity." },
          { code: "ga.sci.chemistry", name: "Chemistry", description: "Elements, compounds, acids, bases, salts." },
          { code: "ga.sci.biology", name: "Biology", description: "Plants, animals, human body and diseases." },
          { code: "ga.sci.tech", name: "Science & Technology", description: "Space, defence, IT and biotechnology." },
        ],
      },
      {
        code: "ga.current",
        name: "Current Affairs",
        description: "Recent national, international and A&N events.",
        subtopics: [
          { code: "ga.cur.national", name: "National", description: "Government schemes, polity, economy and major events." },
          { code: "ga.cur.intl", name: "International", description: "Summits, organisations and Indian Ocean affairs." },
          { code: "ga.cur.an", name: "A&N Current Affairs", description: "UT administration developments, port and tourism news." },
          { code: "ga.cur.sports", name: "Sports and Awards", description: "International and national sports events and major awards." },
        ],
      },
      {
        code: "ga.computer",
        name: "Computer Knowledge",
        description: "Basic computer applications and concepts.",
        subtopics: [
          { code: "ga.comp.fundamentals", name: "Computer Fundamentals", description: "Hardware, software, input/output devices, memory." },
          { code: "ga.comp.os", name: "Operating Systems", description: "Windows, Linux basics and file management." },
          { code: "ga.comp.office", name: "MS Office", description: "Word, Excel, PowerPoint shortcuts and applications." },
          { code: "ga.comp.internet", name: "Internet and Email", description: "Browsers, search engines, email and basic networking." },
        ],
      },
    ],
  },

  // ── REASONING ──────────────────────────────────────────────────────────
  {
    code: "REASONING",
    name: "General Intelligence and Reasoning",
    weight: 1,
    topics: [
      { code: "reas.series", name: "Number and Alphabet Series", description: "Find next/missing term in series." },
      { code: "reas.coding", name: "Coding-Decoding", description: "Letter, number and pattern coding-decoding." },
      { code: "reas.analogy", name: "Analogy", description: "Verbal, number and figure analogy." },
      { code: "reas.classification", name: "Classification", description: "Odd-one-out for words, numbers and figures." },
      { code: "reas.blood", name: "Blood Relations", description: "Family tree based puzzles." },
      { code: "reas.direction", name: "Direction Sense", description: "Direction-distance puzzles." },
      { code: "reas.ranking", name: "Ranking and Order", description: "Linear, circular ranking and arrangement." },
      { code: "reas.calendar", name: "Clocks and Calendars", description: "Day-finding and clock-angle problems." },
      { code: "reas.syllogism", name: "Syllogism", description: "Categorical syllogism using Venn diagrams." },
      { code: "reas.statement", name: "Statement and Arguments", description: "Strong/weak arguments and course of action." },
      { code: "reas.statement_concl", name: "Statement and Conclusions", description: "Conclusions drawn from given statements." },
      { code: "reas.dm", name: "Decision Making", description: "Situational judgement and selection criteria problems." },
      { code: "reas.non_verbal", name: "Non-Verbal Series", description: "Figure series and pattern completion." },
      { code: "reas.mirror", name: "Mirror and Water Image", description: "Mirror and water reflection problems." },
      { code: "reas.embedded", name: "Embedded Figures", description: "Find hidden figure within a complex shape." },
      { code: "reas.cubes_dice", name: "Cubes and Dice", description: "Dice opposite faces, cube counting and painting." },
      { code: "reas.arithmetic", name: "Arithmetical Reasoning", description: "Word problems with arithmetic logic." },
      { code: "reas.di", name: "Data Interpretation", description: "Tables, bar, pie and line graph based questions." },
    ],
  },

  // ── NUMERICAL APTITUDE ─────────────────────────────────────────────────
  {
    code: "NUMERICAL",
    name: "Numerical Aptitude",
    weight: 1,
    topics: [
      { code: "num.numbers", name: "Number System", description: "Place value, divisibility, factors and multiples." },
      { code: "num.simplification", name: "Simplification", description: "BODMAS, fractions, decimals and approximations." },
      { code: "num.percentage", name: "Percentage", description: "Percentage, profit, loss and discount." },
      { code: "num.ratio", name: "Ratio and Proportion", description: "Direct, inverse and compound ratio." },
      { code: "num.average", name: "Average", description: "Average of numbers, ages, marks and money." },
      { code: "num.si_ci", name: "Simple and Compound Interest", description: "Interest, principal, rate and time problems." },
      { code: "num.time_work", name: "Time and Work", description: "Pipes, cisterns and combined work problems." },
      { code: "num.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average and relative speed." },
      { code: "num.mensuration", name: "Mensuration", description: "Area, perimeter and volume of basic shapes." },
      { code: "num.algebra", name: "Algebra", description: "Linear and quadratic equations of Class X level." },
      { code: "num.lcm_hcf", name: "LCM and HCF", description: "LCM, HCF and applications." },
    ],
  },

  // ── ENGLISH / HINDI ────────────────────────────────────────────────────
  {
    code: "LANGUAGE",
    name: "English / Hindi Language",
    weight: 1,
    topics: [
      {
        code: "lang.english",
        name: "English Language",
        description: "Grammar, vocabulary and comprehension at Class X level.",
        subtopics: [
          { code: "lang.eng.grammar", name: "Grammar", description: "Tenses, articles, prepositions, voice, narration." },
          { code: "lang.eng.vocab", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution." },
          { code: "lang.eng.idioms", name: "Idioms and Phrases", description: "Common idioms and phrases meanings." },
          { code: "lang.eng.error", name: "Error Spotting and Sentence Improvement", description: "Spot errors and improve sentence construction." },
          { code: "lang.eng.comprehension", name: "Reading Comprehension", description: "Unseen passage based questions." },
        ],
      },
      {
        code: "lang.hindi",
        name: "Hindi Language",
        description: "Hindi vyakaran and sahitya at Class X level.",
        subtopics: [
          { code: "lang.hin.grammar", name: "Hindi Grammar", description: "Sangya, sarvanam, kriya, kaal, vachya and sandhi." },
          { code: "lang.hin.vocab", name: "Hindi Vocabulary", description: "Paryayvachi, vilom, muhavare and lokoktiyan." },
          { code: "lang.hin.comprehension", name: "Hindi Comprehension", description: "Unseen Hindi passage based questions." },
        ],
      },
    ],
  },
];

export async function seedAnPoliceSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "AN_ANIIPS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — AN_ANIIPS exam not found.");
  }
  console.log(`Seeding Andaman Police syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < anPoliceSyllabus.length; sIdx++) {
    const s = anPoliceSyllabus[sIdx];
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
  seedAnPoliceSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
