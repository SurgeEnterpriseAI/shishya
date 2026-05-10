// Dadra & Nagar Haveli + Daman & Diu UT Recruitment — full syllabus tree.
// 100 MCQs covering General Awareness, Reasoning, Numerical Aptitude, English.
// (Pattern aligns with UT Staff Selection Board recruitment for Group C/B
//  posts; teaching posts have an additional subject-specific paper.)
// Sources: ddd.gov.in, daman.nic.in/ojas.
//
// Run after seedExams: npx tsx seed/exams/dn-recruitment-syllabus.ts

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

export const dnRecruitmentSyllabus: SubjectSeed[] = [
  // ── GENERAL AWARENESS ──────────────────────────────────────────────────
  {
    code: "GA",
    name: "General Awareness",
    weight: 1.2,
    topics: [
      {
        code: "ga.history",
        name: "History of India",
        description: "Indian history with focus on UT history.",
        subtopics: [
          { code: "ga.hist.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryas, Guptas." },
          { code: "ga.hist.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and regional kingdoms." },
          { code: "ga.hist.modern", name: "Modern India and Freedom Struggle", description: "British rule, INC, Gandhian movements and partition." },
          { code: "ga.hist.portuguese", name: "Portuguese in DNH and DD", description: "Portuguese rule over Goa, Daman, Diu, Dadra & Nagar Haveli (1535-1961)." },
          { code: "ga.hist.liberation", name: "Liberation 1954-1961", description: "Goa Liberation, 1954 freeing of Dadra & Nagar Haveli, 1961 Operation Vijay." },
          { code: "ga.hist.merger_2020", name: "Merger 2020", description: "Merger of DNH and DD into a single UT effective 26 January 2020." },
        ],
      },
      {
        code: "ga.geography",
        name: "Geography",
        description: "Indian and UT geography.",
        subtopics: [
          { code: "ga.geo.india", name: "Geography of India", description: "Physical, climatic and economic features of India." },
          { code: "ga.geo.dnh", name: "Geography of DNH and DD", description: "Silvassa, Daman, Diu locations; Damanganga, Kalai rivers; Sahyadri foothills." },
          { code: "ga.geo.tribes", name: "Tribes of DNH", description: "Warli, Dhodia, Kokna and Kathodi tribal communities." },
          { code: "ga.geo.world", name: "World Geography", description: "Continents, oceans, climate and major countries." },
        ],
      },
      {
        code: "ga.polity",
        name: "Indian Polity and UT Administration",
        description: "Constitution and merged UT governance.",
        subtopics: [
          { code: "ga.pol.constitution", name: "Constitution of India", description: "Preamble, salient features and amendments." },
          { code: "ga.pol.fr", name: "Fundamental Rights and DPSP", description: "Articles 12-51A — rights, duties and directive principles." },
          { code: "ga.pol.ut_act", name: "DNH and DD (Merger of UTs) Act 2019", description: "Statute that merged the two UTs into a single UT." },
          { code: "ga.pol.administration", name: "Administration", description: "Administrator, district administration and local self-government." },
        ],
      },
      {
        code: "ga.economy",
        name: "Indian Economy",
        description: "Indian economy and UT economy.",
        subtopics: [
          { code: "ga.eco.basics", name: "Economic Basics", description: "Sectoral composition, GDP, fiscal-monetary policy." },
          { code: "ga.eco.banking", name: "Banking and Finance", description: "RBI, banks, GST and budget." },
          { code: "ga.eco.industries", name: "Industries of DNH and DD", description: "Textile, plastics, electronics and silver units; Silvassa industrial base." },
          { code: "ga.eco.tourism", name: "Tourism", description: "Daman, Diu beaches and Silvassa tourism." },
        ],
      },
      {
        code: "ga.science",
        name: "General Science",
        description: "Everyday science and current S&T.",
        subtopics: [
          { code: "ga.sci.physics", name: "Physics", description: "Force, motion, heat, light, sound, electricity." },
          { code: "ga.sci.chemistry", name: "Chemistry", description: "Elements, compounds, acids, bases, salts." },
          { code: "ga.sci.biology", name: "Biology", description: "Plants, animals, human body and diseases." },
          { code: "ga.sci.environment", name: "Environment", description: "Ecosystems, biodiversity, climate change and pollution." },
        ],
      },
      {
        code: "ga.current",
        name: "Current Affairs",
        description: "Recent national, international and UT events.",
        subtopics: [
          { code: "ga.cur.national", name: "National", description: "Schemes, polity, economy and major events." },
          { code: "ga.cur.intl", name: "International", description: "Summits, organisations and India's relations." },
          { code: "ga.cur.ut", name: "DNH and DD Current Affairs", description: "Administrative decisions, infrastructure projects and welfare schemes." },
          { code: "ga.cur.sports", name: "Sports and Awards", description: "Sports events and national/international awards." },
        ],
      },
      {
        code: "ga.culture",
        name: "Culture and Society of DNH and DD",
        description: "Cultural heritage of the merged UT.",
        subtopics: [
          { code: "ga.cul.warli_art", name: "Warli Art", description: "Traditional tribal painting style of the Warli community." },
          { code: "ga.cul.festivals", name: "Festivals", description: "Tarpa Festival, Nariyal Poornima, Diwali and Christmas across the UT." },
          { code: "ga.cul.languages", name: "Languages", description: "Gujarati, Hindi, Marathi, Konkani, Portuguese influence and tribal dialects." },
          { code: "ga.cul.cuisine", name: "Cuisine", description: "Coastal seafood, rotla, undhiyu and Portuguese-influenced dishes." },
        ],
      },
    ],
  },

  // ── REASONING ──────────────────────────────────────────────────────────
  {
    code: "REASONING",
    name: "Logical Reasoning and General Intelligence",
    weight: 1,
    topics: [
      { code: "reas.series", name: "Number and Alphabet Series", description: "Find next/missing term in series." },
      { code: "reas.coding", name: "Coding-Decoding", description: "Letter, number and pattern coding-decoding." },
      { code: "reas.analogy", name: "Analogy", description: "Verbal, number and figure analogy." },
      { code: "reas.classification", name: "Classification", description: "Odd-one-out for words, numbers and figures." },
      { code: "reas.blood", name: "Blood Relations", description: "Family tree based puzzles." },
      { code: "reas.direction", name: "Direction Sense", description: "Direction-distance puzzles." },
      { code: "reas.ranking", name: "Ranking and Order", description: "Linear, circular ranking and arrangement." },
      { code: "reas.syllogism", name: "Syllogism", description: "Categorical syllogism using Venn diagrams." },
      { code: "reas.statement", name: "Statement and Conclusions", description: "Conclusions drawn from given statements." },
      { code: "reas.dm", name: "Decision Making", description: "Situational judgement and selection criteria problems." },
      { code: "reas.non_verbal", name: "Non-Verbal Series", description: "Figure series and pattern completion." },
      { code: "reas.mirror", name: "Mirror and Water Image", description: "Mirror and water reflection problems." },
      { code: "reas.cubes_dice", name: "Cubes and Dice", description: "Dice opposite faces, cube counting and painting." },
      { code: "reas.di", name: "Data Interpretation", description: "Tables, bar, pie and line graph based questions." },
    ],
  },

  // ── QUANTITATIVE APTITUDE ──────────────────────────────────────────────
  {
    code: "QUANT",
    name: "Quantitative Aptitude",
    weight: 1,
    topics: [
      { code: "qa.numbers", name: "Number System", description: "Place value, divisibility, factors and multiples." },
      { code: "qa.simplification", name: "Simplification", description: "BODMAS, fractions, decimals." },
      { code: "qa.percentage", name: "Percentage", description: "Percentage, profit, loss and discount." },
      { code: "qa.ratio", name: "Ratio and Proportion", description: "Direct, inverse and compound ratio." },
      { code: "qa.average", name: "Average", description: "Average of numbers, ages, marks." },
      { code: "qa.si_ci", name: "Simple and Compound Interest", description: "Interest, principal, rate and time." },
      { code: "qa.time_work", name: "Time and Work", description: "Pipes, cisterns and combined work problems." },
      { code: "qa.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average and relative speed." },
      { code: "qa.mensuration", name: "Mensuration", description: "Area, perimeter and volume of basic shapes." },
      { code: "qa.algebra", name: "Algebra", description: "Linear and quadratic equations of Class X level." },
      { code: "qa.lcm_hcf", name: "LCM and HCF", description: "LCM, HCF and applications." },
      { code: "qa.partnership", name: "Partnership", description: "Partnership profit/loss sharing problems." },
    ],
  },

  // ── ENGLISH ────────────────────────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "English Language",
    weight: 1,
    topics: [
      { code: "eng.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, voice, narration." },
      { code: "eng.vocab", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution." },
      { code: "eng.idioms", name: "Idioms and Phrases", description: "Common idioms and phrases meanings." },
      { code: "eng.error", name: "Error Spotting", description: "Spot errors in given sentences." },
      { code: "eng.improvement", name: "Sentence Improvement", description: "Improve sentence construction and grammar." },
      { code: "eng.fillers", name: "Fill in the Blanks", description: "Cloze-test style word and phrase fillers." },
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Unseen passage based questions." },
      { code: "eng.spelling", name: "Spellings", description: "Identification of correctly/wrongly spelt words." },
    ],
  },
];

export async function seedDnRecruitmentSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "DN_DDPSC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — DN_DDPSC exam not found.");
  }
  console.log(`Seeding DNH-DD UT recruitment syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < dnRecruitmentSyllabus.length; sIdx++) {
    const s = dnRecruitmentSyllabus[sIdx];
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
  seedDnRecruitmentSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
