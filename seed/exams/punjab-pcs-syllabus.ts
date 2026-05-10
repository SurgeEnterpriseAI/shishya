// Punjab Civil Services (PPSC PCS) Prelims — full syllabus tree.
// Two papers: Paper I — General Studies (100 Qs, 200 marks)
//             Paper II — Civil Services Aptitude Test/CSAT (80 Qs, 200 marks; qualifying 40%)
// Punjab-specific content: Sikh history, Punjab geography, agriculture, Punjabi.
// Source: ppsc.gov.in PCS notification + Punjab Civil Services Rules 2009 syllabus annex.
//
// Run after seedExams: npx tsx seed/exams/punjab-pcs-syllabus.ts

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

export const punjabPcsSyllabus: SubjectSeed[] = [
  // ── PAPER I — GENERAL STUDIES ───────────────────────────────────────────
  {
    code: "GS",
    name: "General Studies (Paper I)",
    weight: 1.2,
    topics: [
      {
        code: "gs.everyday_science",
        name: "Everyday Science",
        description: "General appreciation of science from observation and experience.",
        subtopics: [
          { code: "gs.science.matter", name: "States of Matter and Atom", description: "Solid, liquid, gas, plasma; structure of atom and bonding." },
          { code: "gs.science.carbon", name: "Versatile Nature of Carbon", description: "Carbon compounds, hydrocarbons, polymers and applications." },
          { code: "gs.science.acid_base", name: "Acids, Bases and Salts", description: "pH, indicators, neutralisation, common salts and uses." },
          { code: "gs.science.metals", name: "Metals and Corrosion", description: "Metallurgy, alloys, corrosion of metals and prevention." },
          { code: "gs.science.life", name: "Life on Earth and Evolution", description: "Origin of life, marine and terrestrial life, biodiversity." },
          { code: "gs.science.body", name: "Human Body and Life Processes", description: "Nutrition, respiration, circulation and excretion." },
          { code: "gs.science.disease", name: "Disease and Public Health", description: "Infectious diseases, lifestyle diseases and public health initiatives." },
        ],
      },
      {
        code: "gs.environment",
        name: "Environmental Studies",
        description: "Environment, ecology and sustainable development.",
        subtopics: [
          { code: "gs.env.ecosystem", name: "Ecosystem and Biodiversity", description: "Components, food chain, biomes and biodiversity hotspots." },
          { code: "gs.env.climate", name: "Climate Change", description: "Greenhouse effect, global warming and international climate accords." },
          { code: "gs.env.pollution", name: "Pollution and Conservation", description: "Air, water, soil pollution and conservation strategies." },
          { code: "gs.env.disaster", name: "Disaster Management", description: "Natural and man-made disasters and NDMA framework." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity",
        description: "Political theory, Constitution and governance of India.",
        subtopics: [
          { code: "gs.polity.theory", name: "Political Theory and International Order", description: "Liberty, equality, justice, state and global governance." },
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, salient features and historical evolution." },
          { code: "gs.polity.fr_dpsp", name: "Fundamental Rights, Duties and DPSP", description: "Articles 12-51A — rights, duties, directive principles." },
          { code: "gs.polity.union", name: "Union Government", description: "President, PM, Council of Ministers, Parliament." },
          { code: "gs.polity.state", name: "State Government", description: "Governor, CM, State Legislature, High Courts." },
          { code: "gs.polity.local", name: "Local Self Government", description: "Panchayati Raj, urban local bodies, 73rd-74th amendments." },
          { code: "gs.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts and judicial review." },
          { code: "gs.polity.bodies", name: "Constitutional and Statutory Bodies", description: "ECI, UPSC, CAG, Finance Commission, NHRC and others." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India",
        description: "Indian history with emphasis on social, economic, political aspects.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic Age, Mauryan, Gupta empires." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals and regional kingdoms." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, social reforms, freedom struggle." },
          { code: "gs.history.gandhian", name: "Gandhian Era and Independence", description: "Non-cooperation, Civil Disobedience, Quit India and partition." },
          { code: "gs.history.culture", name: "Indian Culture", description: "Art, architecture, literature, music, dance and festivals." },
        ],
      },
      {
        code: "gs.geography",
        name: "Indian and Punjab Geography",
        description: "Physical, social and economic geography of India and Punjab.",
        subtopics: [
          { code: "gs.geo.physical", name: "Physical Features of India", description: "Mountains, plains, rivers, climate, monsoon and natural vegetation." },
          { code: "gs.geo.economic", name: "Economic Geography", description: "Agriculture, industries, transport and resources of India." },
          { code: "gs.geo.punjab", name: "Geography of Punjab", description: "Doabs, rivers, soils, climate and agro-climatic zones." },
          { code: "gs.geo.world", name: "World Geography", description: "Continents, oceans, major countries and global resources." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy",
        description: "Indian and Punjab economy structure, planning and reforms.",
        subtopics: [
          { code: "gs.eco.nature", name: "Nature of Indian Economy", description: "Sectoral composition, mixed economy, recent trends." },
          { code: "gs.eco.planning", name: "Planning and NITI Aayog", description: "Five-year plans, NITI Aayog and national priorities." },
          { code: "gs.eco.banking", name: "Banking and Monetary System", description: "RBI, commercial banks, monetary policy and financial inclusion." },
          { code: "gs.eco.fiscal", name: "Fiscal Policy", description: "Budget, taxation, GST and fiscal deficit." },
          { code: "gs.eco.punjab", name: "Punjab Economy", description: "Green Revolution, agriculture economy and industries of Punjab." },
        ],
      },
      {
        code: "gs.current",
        name: "Current Events",
        description: "Current affairs of national and international importance.",
        subtopics: [
          { code: "gs.cur.national", name: "National Current Affairs", description: "Schemes, policies, summits and major events in India." },
          { code: "gs.cur.intl", name: "International Affairs", description: "Global summits, organisations and India's foreign policy." },
          { code: "gs.cur.punjab", name: "Punjab Current Affairs", description: "State schemes, political and developmental events of Punjab." },
        ],
      },
      {
        code: "gs.punjab_specific",
        name: "Punjab — History, Society and Culture",
        description: "Punjab specific history, Sikh history, society and culture.",
        subtopics: [
          { code: "gs.pb.ancient", name: "Ancient and Medieval Punjab", description: "Indus Valley sites, Punjab under Mauryas, Sultanate and Mughals." },
          { code: "gs.pb.sikh_gurus", name: "Sikh Gurus", description: "Guru Nanak to Guru Gobind Singh — teachings, institutions, Khalsa." },
          { code: "gs.pb.sikh_misls", name: "Sikh Misls and Maharaja Ranjit Singh", description: "Misl confederacies, rise of Ranjit Singh and Sikh empire." },
          { code: "gs.pb.anglo_sikh", name: "Anglo-Sikh Wars and British Punjab", description: "Annexation, Lahore Durbar and colonial Punjab administration." },
          { code: "gs.pb.freedom", name: "Freedom Struggle in Punjab", description: "Ghadar, Komagata Maru, Jallianwala Bagh, Akali movement and Bhagat Singh." },
          { code: "gs.pb.partition", name: "Partition and Reorganisation", description: "1947 partition, refugee resettlement, Punjabi Suba and 1966 reorganisation." },
          { code: "gs.pb.culture", name: "Punjabi Culture and Literature", description: "Bhangra, Giddha, Punjabi poets, Heer-Ranjha, gurbani and modern literature." },
          { code: "gs.pb.agriculture", name: "Punjab Agriculture", description: "Wheat-paddy cycle, Green Revolution, MSP and farm crisis." },
        ],
      },
    ],
  },

  // ── PAPER II — CSAT ─────────────────────────────────────────────────────
  {
    code: "CSAT",
    name: "Civil Services Aptitude Test (Paper II)",
    weight: 1,
    topics: [
      {
        code: "csat.comprehension",
        name: "Reading Comprehension",
        description: "Understanding and analysing English and Punjabi passages.",
        subtopics: [
          { code: "csat.rc.eng", name: "English Comprehension", description: "Inference, theme and vocabulary from English passages." },
          { code: "csat.rc.punjabi", name: "Punjabi Comprehension", description: "Comprehension of Punjabi prose and poetry passages." },
        ],
      },
      {
        code: "csat.interpersonal",
        name: "Interpersonal and Communication Skills",
        description: "Communication, collaboration and interpersonal effectiveness.",
      },
      {
        code: "csat.logical",
        name: "Logical Reasoning and Analytical Ability",
        description: "Statement-conclusion, syllogism, assumption, course of action.",
        subtopics: [
          { code: "csat.log.syllogism", name: "Syllogism", description: "Categorical syllogism and Venn-diagram methods." },
          { code: "csat.log.statement", name: "Statement-Argument", description: "Strong/weak arguments, course of action, assumption." },
          { code: "csat.log.coding", name: "Coding-Decoding", description: "Letter, number and pattern coding-decoding." },
          { code: "csat.log.series", name: "Series and Analogy", description: "Number, alphabet series and analogy questions." },
        ],
      },
      {
        code: "csat.dm",
        name: "Decision Making and Problem Solving",
        description: "Situational judgement, prioritisation and ethical decisions.",
      },
      {
        code: "csat.mental",
        name: "General Mental Ability",
        description: "Direction, blood relation, ranking and general mental ability.",
        subtopics: [
          { code: "csat.mental.direction", name: "Direction Sense", description: "Direction-distance puzzles." },
          { code: "csat.mental.blood", name: "Blood Relations", description: "Family tree puzzles." },
          { code: "csat.mental.ranking", name: "Order and Ranking", description: "Linear and circular arrangement, ranking puzzles." },
        ],
      },
      {
        code: "csat.numerical",
        name: "Basic Numeracy",
        description: "Numbers and their relations — Class X level.",
        subtopics: [
          { code: "csat.num.numbers", name: "Numbers and Magnitudes", description: "Order of magnitude, percentages and proportions." },
          { code: "csat.num.percent", name: "Percentages and Ratio", description: "Percentage, ratio and proportion problems." },
          { code: "csat.num.relation", name: "Numerical Relations", description: "Numerical relation appreciation and comparisons." },
        ],
      },
      {
        code: "csat.di",
        name: "Data Interpretation",
        description: "Charts, graphs, tables and data sufficiency.",
        subtopics: [
          { code: "csat.di.tables", name: "Tables and Bar Charts", description: "Tabular and bar-graph based data interpretation." },
          { code: "csat.di.pie", name: "Pie Charts and Line Graphs", description: "Pie and line graph based questions." },
          { code: "csat.di.suff", name: "Data Sufficiency", description: "Data sufficiency from two or three statements." },
        ],
      },
      {
        code: "csat.lang",
        name: "Punjabi and English Language",
        description: "Basic language skills — grammar and usage.",
        subtopics: [
          { code: "csat.lang.eng_grammar", name: "English Grammar and Usage", description: "Tenses, articles, prepositions, voice, narration." },
          { code: "csat.lang.punjabi_grammar", name: "Punjabi Grammar", description: "Punjabi vyakaran — letters, words, sentences and idioms." },
        ],
      },
    ],
  },
];

export async function seedPunjabPcsSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "PB_PCS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — PB_PCS exam not found.");
  }
  console.log(`Seeding Punjab PCS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < punjabPcsSyllabus.length; sIdx++) {
    const s = punjabPcsSyllabus[sIdx];
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
  seedPunjabPcsSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
