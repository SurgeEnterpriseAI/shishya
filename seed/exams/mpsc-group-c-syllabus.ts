// MPSC Group C Combined Services — full syllabus tree.
// Conducted by Maharashtra Public Service Commission for Tax Assistant /
// Sub-Registrar / Industries Inspector / Excise Sub-Inspector / Clerk-Typist.
// Prelims: 100 MCQs × 1 mark in 60 min, 0.5 negative mark.
// Mains: separate paper-II per post; we model the prelims (common) + cross-post mains topics.
// Source: mpsc.gov.in official syllabus PDF (Group-C Combined Services).
//
// Run after seedExams: npx tsx seed/exams/mpsc-group-c-syllabus.ts

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

export const mpscGroupCSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES ──────────────────────────────────────────────────
  {
    code: "GS",
    name: "General Studies",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Affairs",
        description: "Current affairs of state, national and international importance.",
        subtopics: [
          { code: "gs.current_affairs.maharashtra", name: "Maharashtra Current Affairs", description: "Recent developments, schemes and events in Maharashtra." },
          { code: "gs.current_affairs.national", name: "National Current Affairs", description: "Indian political, economic and social events of national importance." },
          { code: "gs.current_affairs.intl", name: "International Affairs", description: "Major international events, summits and bilateral relations." },
          { code: "gs.current_affairs.sports", name: "Sports", description: "Major national and international tournaments and awards." },
          { code: "gs.current_affairs.awards", name: "Awards and Honours", description: "Civilian, gallantry, literary and international awards." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India and Maharashtra",
        description: "Modern Indian history with focus on Maharashtra.",
        subtopics: [
          { code: "gs.history.modern_india", name: "Modern India", description: "Advent of Europeans, British rule, 1857 revolt, freedom struggle." },
          { code: "gs.history.gandhian", name: "Gandhian Era", description: "Non-cooperation, Civil Disobedience and Quit India movements." },
          { code: "gs.history.maharashtra_freedom", name: "Maharashtra in Freedom Movement", description: "Tilak, Gokhale, Savarkar, Tilak's role and Maharashtra's contribution." },
          { code: "gs.history.maharashtra_history", name: "History of Maharashtra", description: "Satavahanas, Yadavas, Shivaji and Marathas, Peshwas." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography of India and Maharashtra",
        description: "Physical, social and economic geography.",
        subtopics: [
          { code: "gs.geography.physical_india", name: "Physical Features of India", description: "Mountains, plains, plateaus, coasts and rivers." },
          { code: "gs.geography.climate_india", name: "Climate, Monsoon and Rainfall", description: "Indian monsoon system and regional variations." },
          { code: "gs.geography.maharashtra_physical", name: "Physical Features of Maharashtra", description: "Sahyadri, Konkan, Deccan plateau, river systems and climate." },
          { code: "gs.geography.maharashtra_economic", name: "Economic Geography of Maharashtra", description: "Agriculture, industries, transport and tourism in Maharashtra." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity",
        description: "Indian Constitution and governance with reference to Maharashtra.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, salient features and historical evolution." },
          { code: "gs.polity.fr_dpsp", name: "Fundamental Rights, Duties and DPSPs", description: "Articles 12-51A — rights, duties, directive principles." },
          { code: "gs.polity.union", name: "Union Government", description: "President, Prime Minister, Council of Ministers and Parliament." },
          { code: "gs.polity.state_mh", name: "State Government — Maharashtra", description: "Governor, CM, Vidhan Sabha & Vidhan Parishad, Bombay High Court." },
          { code: "gs.polity.local", name: "Local Self Government", description: "Panchayati Raj, urban local bodies, BMC and municipal corporations." },
          { code: "gs.polity.elections", name: "Elections and Statutory Bodies", description: "ECI, electoral reforms, NHRC, CAG and UPSC." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy",
        description: "Indian economy with reference to Maharashtra.",
        subtopics: [
          { code: "gs.economy.structure", name: "Structure of Indian Economy", description: "Sectoral composition, mixed economy, recent trends." },
          { code: "gs.economy.planning", name: "Planning and NITI Aayog", description: "Five-year plans, flagship schemes." },
          { code: "gs.economy.budget", name: "Budget and Taxation", description: "Union budget, GST, fiscal and monetary policy." },
          { code: "gs.economy.banking", name: "Banking and Finance", description: "RBI, banking system, financial inclusion." },
          { code: "gs.economy.maharashtra", name: "Economy of Maharashtra", description: "GSDP, sectoral composition, IT, manufacturing and agriculture in Maharashtra." },
          { code: "gs.economy.reforms", name: "Economic Reforms and Laws", description: "1991 reforms, FEMA, Companies Act, GST Act and recent reforms." },
        ],
      },
      {
        code: "gs.science",
        name: "General Science",
        description: "General science and recent science & technology developments.",
        subtopics: [
          { code: "gs.science.physics", name: "Physics", description: "Mechanics, force, motion, heat, light, sound, electricity, magnetism." },
          { code: "gs.science.chemistry", name: "Chemistry", description: "Elements, compounds, acids, bases, fertilizers, pesticides." },
          { code: "gs.science.biology", name: "Biology", description: "Plants, animals, human body, nutrition and diseases." },
          { code: "gs.science.tech", name: "Science and Technology", description: "IT, space, defence, biotechnology and computer awareness." },
          { code: "gs.science.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change and pollution." },
        ],
      },
    ],
  },

  // ── MAHARASHTRA-SPECIFIC ──────────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Maharashtra — History, Culture and Administration",
    weight: 1.4,
    topics: [
      {
        code: "mh.history",
        name: "History of Maharashtra",
        description: "Maharashtra's history from ancient times to formation of the state.",
        subtopics: [
          { code: "mh.history.ancient", name: "Ancient Maharashtra", description: "Satavahanas, Vakatakas, Rashtrakutas in Maharashtra." },
          { code: "mh.history.yadavas", name: "Yadavas of Devagiri", description: "Origin, polity and culture under the Yadavas." },
          { code: "mh.history.bahamani", name: "Bahmani Sultanate and Deccan Sultanates", description: "Bahmani, Ahmadnagar and Bijapur in the Deccan." },
          { code: "mh.history.shivaji", name: "Chhatrapati Shivaji Maharaj", description: "Founding of the Maratha empire, administration, naval power." },
          { code: "mh.history.peshwas", name: "Peshwa Era", description: "Bajirao I, Madhav Rao, Maratha confederacy and decline." },
          { code: "mh.history.british", name: "Maharashtra under British Rule", description: "Anglo-Maratha wars, social reforms, Bombay Presidency." },
        ],
      },
      {
        code: "mh.reformers",
        name: "Social Reformers of Maharashtra",
        description: "Pioneers of social reform in 19th and 20th century Maharashtra.",
        subtopics: [
          { code: "mh.reformers.phule", name: "Mahatma Jyotiba Phule and Savitribai Phule", description: "Satyashodhak Samaj, women's education and caste reform." },
          { code: "mh.reformers.ranade", name: "Mahadev Govind Ranade", description: "Prarthana Samaj, social reform and economic ideas." },
          { code: "mh.reformers.agarkar", name: "Gopal Ganesh Agarkar", description: "Rationalism and social reform in Maharashtra." },
          { code: "mh.reformers.shahu", name: "Rajarshi Shahu Maharaj of Kolhapur", description: "Reservation, education and social justice initiatives." },
          { code: "mh.reformers.ambedkar", name: "Dr. B. R. Ambedkar", description: "Dalit emancipation, Constitution drafting and Buddhist movement." },
          { code: "mh.reformers.karve", name: "Maharshi Karve", description: "Women's education and SNDT University." },
        ],
      },
      {
        code: "mh.unification",
        name: "Samyukta Maharashtra Movement",
        description: "Movement for a Marathi-speaking state of Maharashtra.",
        subtopics: [
          { code: "mh.unification.movement", name: "Samyukta Maharashtra Samiti", description: "Origin, leaders and demands of the movement." },
          { code: "mh.unification.formation", name: "Formation of Maharashtra (1960)", description: "Bombay reorganisation, Maharashtra-Gujarat division." },
          { code: "mh.unification.belgaum", name: "Belgaum Border Dispute", description: "Maharashtra-Karnataka border issue, Mahajan Commission." },
        ],
      },
      {
        code: "mh.culture",
        name: "Art, Culture and Literature of Maharashtra",
        description: "Marathi literature, performing arts and cultural heritage.",
        subtopics: [
          { code: "mh.culture.literature", name: "Marathi Literature", description: "Dnyaneshwar, Tukaram, P.L. Deshpande, Jnanpith awardees." },
          { code: "mh.culture.bhakti", name: "Varkari and Bhakti Tradition", description: "Sant Dnyaneshwar, Tukaram, Eknath, Namdev — Bhakti saints." },
          { code: "mh.culture.theatre", name: "Marathi Theatre and Cinema", description: "Sangeet Natak, Marathi cinema and Dadasaheb Phalke." },
          { code: "mh.culture.dance", name: "Folk Arts of Maharashtra", description: "Lavani, Tamasha, Powada and folk traditions." },
          { code: "mh.culture.festivals", name: "Festivals", description: "Ganeshotsav, Gudi Padwa, Pandharpur Wari and other festivals." },
        ],
      },
      {
        code: "mh.administration",
        name: "Maharashtra Administration and Welfare",
        description: "Administrative structure and key welfare schemes of Maharashtra.",
        subtopics: [
          { code: "mh.administration.structure", name: "Administrative Structure", description: "Divisions, districts, talukas of Maharashtra." },
          { code: "mh.administration.industrial", name: "Industrial Policy", description: "MIDC, Maharashtra Industrial Policy, MMR industrial corridors." },
          { code: "mh.administration.welfare", name: "Welfare Schemes", description: "Mahatma Phule Jan Aarogya Yojana, Shiv Bhojan, Rojgar Hami Yojana." },
          { code: "mh.administration.urban", name: "Urban Maharashtra", description: "Mumbai, Pune, Nagpur, Nashik — urbanisation and infrastructure." },
        ],
      },
    ],
  },

  // ── ARITHMETIC ─────────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Arithmetic and Numerical Skills",
    weight: 1,
    topics: [
      { code: "math.simplification", name: "Number System and Simplification", description: "BODMAS, fractions, decimals, square and cube roots." },
      { code: "math.percentage", name: "Percentage", description: "Percentage calculations and applications." },
      { code: "math.profit_loss", name: "Profit and Loss", description: "Cost price, selling price and discount." },
      { code: "math.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse, compound ratio and partnership." },
      { code: "math.average", name: "Average", description: "Average and weighted average." },
      { code: "math.si_ci", name: "Simple and Compound Interest", description: "SI and CI calculations." },
      { code: "math.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns." },
      { code: "math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average and relative speed." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume." },
      { code: "math.algebra", name: "Elementary Algebra", description: "Linear and quadratic equations." },
      { code: "math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs." },
    ],
  },

  // ── REASONING (Intelligence Test) ──────────────────────────────────────
  {
    code: "REASONING",
    name: "Intelligence Test and Reasoning",
    weight: 1,
    topics: [
      { code: "reasoning.series", name: "Number and Letter Series", description: "Find next/missing/wrong term in numerical and alphabet series." },
      { code: "reasoning.coding", name: "Coding-Decoding", description: "Letter, number and symbol-based coding patterns." },
      { code: "reasoning.directions", name: "Directions and Distances", description: "Direction sense, shortest distance, displacement." },
      { code: "reasoning.blood_relations", name: "Blood Relations", description: "Family-tree puzzles." },
      { code: "reasoning.analogy", name: "Analogy and Classification", description: "Word, number and figure analogy; odd-one-out." },
      { code: "reasoning.syllogism", name: "Syllogism", description: "Statement-conclusion using Venn diagrams." },
      { code: "reasoning.calendar_clock", name: "Calendar and Clock", description: "Day calculation, leap years, angle between hands." },
      { code: "reasoning.visual", name: "Non-Verbal Reasoning", description: "Mirror image, water image and embedded figures." },
    ],
  },

  // ── LANGUAGE (Marathi & English) ──────────────────────────────────────
  {
    code: "LANG",
    name: "Marathi and English Language",
    weight: 1,
    topics: [
      {
        code: "lang.marathi",
        name: "Marathi Vyakaran",
        description: "Marathi grammar and comprehension.",
        subtopics: [
          { code: "lang.marathi.grammar", name: "Vyakaran", description: "Sandhi, samasa, vibhakti, kaal, vachan." },
          { code: "lang.marathi.vocab", name: "Shabda Bhandar", description: "Synonyms, antonyms and idioms in Marathi." },
          { code: "lang.marathi.comprehension", name: "Reading Comprehension", description: "Unseen passage and inference questions." },
          { code: "lang.marathi.translation", name: "Translation", description: "Translation between Marathi and English." },
        ],
      },
      {
        code: "lang.english",
        name: "English Grammar",
        description: "English grammar, vocabulary and comprehension.",
        subtopics: [
          { code: "lang.english.grammar", name: "Grammar", description: "Tenses, articles, prepositions, voice, narration." },
          { code: "lang.english.vocab", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution, idioms and phrases." },
          { code: "lang.english.comprehension", name: "Reading Comprehension", description: "Unseen passage and inference questions." },
          { code: "lang.english.error", name: "Error Detection and Sentence Improvement", description: "Spotting errors and sentence correction." },
        ],
      },
    ],
  },
];

export async function seedMpscGroupCSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MH_MPSC_GROUP_C" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MH_MPSC_GROUP_C exam not found.");
  }
  console.log(`Seeding MPSC Group C syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mpscGroupCSyllabus.length; sIdx++) {
    const s = mpscGroupCSyllabus[sIdx];
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
  seedMpscGroupCSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
