// TNPSC Group IV (CCSE-IV) — full syllabus tree.
// 200 MCQs, 300 marks, 3 hours. Three parts:
//   Part A — Tamil Eligibility-cum-Scoring Test (100 Qs, 150 marks)
//   Part B — General Studies (75 Qs)  ─┐ together 100 Qs / 150 marks
//   Part C — Aptitude & Mental Ability (25 Qs) ─┘
// Standard: SSLC. No negative marking. Source: tnpsc.gov.in Group IV syllabus PDF.
//
// Run after seedExams: npx tsx seed/exams/tnpsc-group4-syllabus.ts

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

export const tnpscGroup4Syllabus: SubjectSeed[] = [
  // ── PART A — GENERAL TAMIL (Eligibility-cum-Scoring) ───────────────────
  {
    code: "GENERAL_TAMIL",
    name: "General Tamil — Eligibility-cum-Scoring Test",
    weight: 1.5,
    topics: [
      {
        code: "tamil.grammar",
        name: "Tamil Grammar (Ilakkanam)",
        description: "Foundations of Tamil grammar tested at SSLC standard.",
        subtopics: [
          { code: "tamil.grammar.eluthu", name: "Eluthu (Letters)", description: "Vowels, consonants, compound letters and pronunciation rules." },
          { code: "tamil.grammar.sol", name: "Sol (Words)", description: "Word classes, parts of speech, classification of Tamil words." },
          { code: "tamil.grammar.porul", name: "Porul (Meaning)", description: "Aham and puram, classical themes and meaning categories." },
          { code: "tamil.grammar.yappu", name: "Yappu (Prosody)", description: "Tamil metres, syllabic structure and verse forms." },
          { code: "tamil.grammar.ani", name: "Ani (Figures of Speech)", description: "Similes, metaphors and rhetorical devices in Tamil literature." },
          { code: "tamil.grammar.punarchi", name: "Punarchi (Sandhi)", description: "Rules for joining of letters and words in Tamil." },
        ],
      },
      {
        code: "tamil.sangam",
        name: "Sangam Literature",
        description: "Classical Tamil works — Tholkappiyam, Ettuthogai, Pathupattu.",
        subtopics: [
          { code: "tamil.sangam.tholkappiyam", name: "Tholkappiyam", description: "Oldest Tamil grammar text — eluthu, sol and porul adhikarams." },
          { code: "tamil.sangam.ettuthogai", name: "Ettuthogai", description: "The eight anthologies — themes of love and war." },
          { code: "tamil.sangam.pathupattu", name: "Pathupattu", description: "Ten idylls — long poems of the Sangam corpus." },
          { code: "tamil.sangam.pathinen_keezhkanakku", name: "Pathinen Keezhkanakku", description: "Eighteen minor works including Thirukkural and Naladiyar." },
        ],
      },
      {
        code: "tamil.epics",
        name: "Tamil Epics and Bhakti Literature",
        description: "Five great epics and devotional Tamil literature.",
        subtopics: [
          { code: "tamil.epics.silappathikaram", name: "Silappathikaram", description: "Ilango Adigal's epic of Kannagi — anklet of justice." },
          { code: "tamil.epics.manimekalai", name: "Manimekalai", description: "Buddhist epic by Sathanar — sequel to Silappathikaram." },
          { code: "tamil.epics.civaka", name: "Cheevaka Chinthamani", description: "Jain epic of Tirutakkadevar on prince Civakan." },
          { code: "tamil.epics.bhakti", name: "Bhakti Literature", description: "Thevaram, Thiruvasagam, Nalayira Divya Prabandham." },
        ],
      },
      {
        code: "tamil.modern",
        name: "Modern Tamil Literature",
        description: "Tamil writing from the 19th century to the present.",
        subtopics: [
          { code: "tamil.modern.bharathi", name: "Subramania Bharathi", description: "National poet — patriotic and reform poetry." },
          { code: "tamil.modern.bharathidasan", name: "Bharathidasan", description: "Revolutionary poet of the Dravidian movement." },
          { code: "tamil.modern.novelists", name: "Tamil Novelists", description: "Kalki, Akilan, Jayakanthan and modern prose writers." },
          { code: "tamil.modern.short_story", name: "Short Story and Essay", description: "Pudumaipithan, Ku.Pa. Rajagopalan and contemporary essayists." },
        ],
      },
      {
        code: "tamil.comprehension",
        name: "Reading Comprehension and Vocabulary",
        description: "Unseen passage, synonyms, antonyms, idioms and proverbs.",
        subtopics: [
          { code: "tamil.comprehension.passage", name: "Unseen Passage (Patrudai Vinakkal)", description: "Reading comprehension based on prose passages." },
          { code: "tamil.comprehension.synonyms", name: "Synonyms and Antonyms", description: "Otrumai chol and ethirchol vocabulary questions." },
          { code: "tamil.comprehension.idioms", name: "Idioms and Proverbs", description: "Palamozhi and marabu thodar usage." },
          { code: "tamil.comprehension.singular_plural", name: "Singular, Plural and Gender", description: "Orumai-pannmai and aanpaal-pennpaal forms." },
        ],
      },
    ],
  },

  // ── PART B — GENERAL STUDIES ───────────────────────────────────────────
  {
    code: "GS",
    name: "General Studies (SSLC standard)",
    weight: 1.2,
    topics: [
      {
        code: "gs.science",
        name: "General Science",
        description: "Scientific knowledge and observation at SSLC standard.",
        subtopics: [
          { code: "gs.science.physics", name: "Physics", description: "Measurements, force, motion, heat, light, sound, electricity." },
          { code: "gs.science.chemistry", name: "Chemistry", description: "Elements, compounds, acids, bases, salts and chemical reactions." },
          { code: "gs.science.botany", name: "Botany", description: "Plant kingdom, photosynthesis, plant physiology and economic botany." },
          { code: "gs.science.zoology", name: "Zoology", description: "Animal kingdom, human anatomy and physiology, nutrition, diseases." },
        ],
      },
      {
        code: "gs.current_events",
        name: "Current Events",
        description: "National and international current affairs of the recent year.",
        subtopics: [
          { code: "gs.current.history", name: "History", description: "Latest diary of events, anniversaries and historical commemorations." },
          { code: "gs.current.political", name: "Political Science", description: "Polity events — elections, schemes and constitutional amendments." },
          { code: "gs.current.geography", name: "Geographical Landmarks", description: "Recently created districts, states and geographical changes." },
          { code: "gs.current.economic", name: "Economic Scenario", description: "Budget, economic indicators, schemes and welfare policies." },
          { code: "gs.current.scientific", name: "Scientific Knowledge", description: "Science, space, IT and recent technological developments." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography",
        description: "Earth, Indian and Tamil Nadu geography at SSLC standard.",
        subtopics: [
          { code: "gs.geography.earth", name: "Earth and Universe", description: "Solar system, latitudes, longitudes and atmosphere." },
          { code: "gs.geography.india", name: "Geography of India", description: "Physical features, climate, soil, rivers, vegetation and resources." },
          { code: "gs.geography.tn", name: "Geography of Tamil Nadu", description: "Districts, rivers, agriculture, industries and ports of Tamil Nadu." },
          { code: "gs.geography.disaster", name: "Natural Disasters", description: "Cyclones, earthquakes, floods, tsunami and disaster management." },
        ],
      },
      {
        code: "gs.history",
        name: "History and Culture of India",
        description: "Indian history from Indus Valley to Independence and Indian culture.",
        subtopics: [
          { code: "gs.history.ivc", name: "Indus Valley Civilization", description: "Harappan sites, town planning, society and trade." },
          { code: "gs.history.vedic", name: "Vedic and Mauryan Period", description: "Vedic culture, Buddhism, Jainism and Mauryan empire." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and Bhakti-Sufi movements." },
          { code: "gs.history.modern", name: "Modern India and Freedom Struggle", description: "British rule, 1857 Revolt and Indian National Movement." },
          { code: "gs.history.culture", name: "Indian Culture", description: "Art, architecture, literature, dance, music and festivals." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity",
        description: "Constitution and political institutions of India.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, salient features and historical evolution." },
          { code: "gs.polity.fr_dpsp", name: "Fundamental Rights, Duties and DPSP", description: "Articles 12-51A — rights, duties and directive principles." },
          { code: "gs.polity.union", name: "Union and State Government", description: "Parliament, executive, judiciary and state legislature." },
          { code: "gs.polity.local", name: "Local Government", description: "Panchayati Raj, urban local bodies, 73rd & 74th amendments." },
          { code: "gs.polity.elections", name: "Elections and Public Services", description: "Election Commission, UPSC, TNPSC, civil services." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy",
        description: "Indian economic structure, planning and policies.",
        subtopics: [
          { code: "gs.economy.nature", name: "Nature of Indian Economy", description: "Mixed economy, sectoral composition, trends." },
          { code: "gs.economy.planning", name: "Planning and NITI Aayog", description: "Five-year plans, NITI Aayog and development priorities." },
          { code: "gs.economy.banking", name: "Banking and Finance", description: "RBI, commercial banks, GST and fiscal policy." },
          { code: "gs.economy.welfare", name: "Welfare Schemes", description: "Central and state schemes for poverty, employment and rural development." },
        ],
      },
      {
        code: "gs.freedom",
        name: "Indian National Movement",
        description: "India's freedom struggle and role of Tamil Nadu.",
        subtopics: [
          { code: "gs.freedom.early", name: "Early Resistance and 1857", description: "Causes and outcomes of the Revolt of 1857." },
          { code: "gs.freedom.gandhian", name: "Gandhian Era", description: "Non-cooperation, Civil Disobedience and Quit India movements." },
          { code: "gs.freedom.tn_freedom", name: "Tamil Nadu Freedom Fighters", description: "VOC, Bharathi, Subramania Siva, Kamaraj, Rajaji and others." },
        ],
      },
      {
        code: "gs.tn",
        name: "History, Culture, Heritage and Socio-Political Movements of Tamil Nadu",
        description: "Tamil Nadu specific history, society and administration.",
        subtopics: [
          { code: "gs.tn.history", name: "History of Tamil Nadu", description: "Sangam age, Pallavas, Cholas, Pandyas, Vijayanagar, Nayaks." },
          { code: "gs.tn.movements", name: "Socio-Political Movements", description: "Self-Respect, Justice Party, Dravidian movement and reformers." },
          { code: "gs.tn.administration", name: "Administration of Tamil Nadu", description: "Government structure, welfare schemes and e-governance in TN." },
          { code: "gs.tn.contribution", name: "Contribution of TN to Freedom Struggle", description: "Polygar wars, Vellore Mutiny, Vedaranyam Salt March." },
        ],
      },
    ],
  },

  // ── PART C — APTITUDE & MENTAL ABILITY ─────────────────────────────────
  {
    code: "APTITUDE",
    name: "Aptitude and Mental Ability Test",
    weight: 1,
    topics: [
      { code: "apt.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, square and cube roots." },
      { code: "apt.percentage", name: "Percentage", description: "Percentage calculations and applications." },
      { code: "apt.hcf_lcm", name: "HCF and LCM", description: "Highest common factor and lowest common multiple problems." },
      { code: "apt.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse and compound ratio." },
      { code: "apt.si_ci", name: "Simple and Compound Interest", description: "Interest, principal, rate and time problems." },
      { code: "apt.area_volume", name: "Area and Volume", description: "Mensuration of 2D and 3D figures." },
      { code: "apt.time_work", name: "Time and Work", description: "Pipes, cisterns and combined work problems." },
      { code: "apt.time_distance", name: "Time and Distance", description: "Trains, boats, average and relative speed." },
      { code: "apt.logical_reasoning", name: "Logical Reasoning", description: "Statement-conclusion, syllogism, cause-effect." },
      { code: "apt.puzzles", name: "Puzzles", description: "Seating, scheduling and grouping puzzles." },
      { code: "apt.dice", name: "Dice and Cubes", description: "Dice problems — opposite faces and cube counting." },
      { code: "apt.visual_reasoning", name: "Visual Reasoning", description: "Mirror image, water image and paper folding." },
      { code: "apt.alphanumeric", name: "Alphanumeric Reasoning", description: "Coding-decoding and alphabet test." },
      { code: "apt.number_series", name: "Number Series", description: "Find next term and missing/wrong term in series." },
      { code: "apt.data_interpretation", name: "Data Interpretation", description: "Tables, bar, pie and line graph based questions." },
    ],
  },
];

export async function seedTnpscGroup4Syllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TN_TNPSC_GROUP4" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TN_TNPSC_GROUP4 exam not found.");
  }
  console.log(`Seeding TNPSC Group IV syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tnpscGroup4Syllabus.length; sIdx++) {
    const s = tnpscGroup4Syllabus[sIdx];
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
  seedTnpscGroup4Syllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
