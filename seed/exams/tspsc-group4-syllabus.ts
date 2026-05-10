// TSPSC Group IV Services — full syllabus tree.
// Conducted by Telangana State Public Service Commission for Junior Assistant /
// Junior Accountant / Bill Collector and other Group IV cadres.
// Single objective paper (Stage I): Paper-I General Studies & General Abilities (150 marks)
// + Paper-II Secretarial Abilities (150 marks). 150 MCQs each, 1/3 negative mark.
// We model the public-facing 150-question primary paper (GS + Telangana + Math + Reasoning).
// Source: tspsc.gov.in official syllabus & notification (Group-IV).
//
// Run after seedExams: npx tsx seed/exams/tspsc-group4-syllabus.ts

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

export const tspscGroup4Syllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES ──────────────────────────────────────────────────
  {
    code: "GS",
    name: "General Studies and General Abilities",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Affairs",
        description: "National, international and regional events of the last 12-18 months.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Current Affairs", description: "Indian political, economic and social events of national importance." },
          { code: "gs.current_affairs.intl", name: "International Affairs", description: "Major international events, summits, organisations and bilateral relations." },
          { code: "gs.current_affairs.sports", name: "Sports and Games", description: "Major national and international tournaments, awards and records." },
          { code: "gs.current_affairs.awards", name: "Awards and Honours", description: "Civilian, gallantry, literary and international awards." },
          { code: "gs.current_affairs.books", name: "Books and Authors", description: "Notable recent books and their authors." },
          { code: "gs.current_affairs.persons", name: "Personalities in News", description: "Eminent persons, appointments and obituaries." },
        ],
      },
      {
        code: "gs.science",
        name: "General Science and its Applications",
        description: "Everyday science, contemporary developments and their applications.",
        subtopics: [
          { code: "gs.science.physics", name: "Physics in Daily Life", description: "Mechanics, light, sound, heat, electricity in everyday phenomena." },
          { code: "gs.science.chemistry", name: "Chemistry in Daily Life", description: "Chemicals in food, medicines, fuels, fertilizers and pollution." },
          { code: "gs.science.biology", name: "Biology and Health", description: "Human body, nutrition, communicable diseases and basic medical sciences." },
          { code: "gs.science.tech", name: "Modern Science and Technology", description: "Information technology, biotechnology, nano-tech, defence and space." },
          { code: "gs.science.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, conservation, climate change and pollution." },
        ],
      },
      {
        code: "gs.history",
        name: "History and Cultural Heritage of India",
        description: "Outline of Indian history with special focus on freedom movement.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Vijayanagara and Bahmani kingdoms." },
          { code: "gs.history.modern", name: "Modern India and Freedom Movement", description: "Advent of Europeans, 1857 revolt, INC, Gandhian era and partition." },
          { code: "gs.history.culture", name: "Indian Culture and Heritage", description: "Art, architecture, music, dance, literature and festivals of India." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography of India",
        description: "Physical, social and economic geography of India.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Features", description: "Mountains, plains, plateaus, coasts, rivers and climate of India." },
          { code: "gs.geography.resources", name: "Natural Resources", description: "Minerals, forests, energy resources and conservation." },
          { code: "gs.geography.agriculture", name: "Agriculture and Industry", description: "Cropping pattern, agro-climatic zones and major industries." },
          { code: "gs.geography.population", name: "Population and Urbanisation", description: "Demographic features, migration, urbanisation trends." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and Governance",
        description: "Indian Constitution, governance, public administration and policy.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Salient features, Preamble, fundamental rights, duties and DPSPs." },
          { code: "gs.polity.union", name: "Union Government", description: "President, Prime Minister, Council of Ministers and Parliament." },
          { code: "gs.polity.state", name: "State Government", description: "Governor, Chief Minister, State Legislature and High Courts." },
          { code: "gs.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, judicial review and PIL." },
          { code: "gs.polity.local", name: "Local Self-Government", description: "Panchayati Raj and urban local bodies, 73rd & 74th Amendments." },
          { code: "gs.polity.policies", name: "Public Policies and Reforms", description: "Recent administrative, electoral and governance reforms." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy",
        description: "Indian economy structure, planning and recent reforms.",
        subtopics: [
          { code: "gs.economy.structure", name: "Structure of Indian Economy", description: "Sectoral composition, mixed economy, recent trends." },
          { code: "gs.economy.planning", name: "Planning and NITI Aayog", description: "Planning Commission to NITI Aayog, five-year plans, flagship schemes." },
          { code: "gs.economy.banking", name: "Banking and Finance", description: "RBI, banking system, financial inclusion." },
          { code: "gs.economy.budget", name: "Budget and Taxation", description: "Union budget, GST, fiscal and monetary policy." },
          { code: "gs.economy.poverty", name: "Poverty, Unemployment and Welfare", description: "Poverty alleviation schemes, MNREGA, social security." },
        ],
      },
      {
        code: "gs.logical_reasoning",
        name: "Logical Reasoning, Analytical Ability and Data Interpretation",
        description: "Reasoning section under General Abilities of TSPSC Group IV.",
        subtopics: [
          { code: "gs.logical_reasoning.analytical", name: "Analytical Ability", description: "Statement-conclusion, assumption-inference, cause and effect." },
          { code: "gs.logical_reasoning.data", name: "Data Interpretation", description: "Tables, bar/pie/line graphs and combined data sets." },
          { code: "gs.logical_reasoning.sufficiency", name: "Data Sufficiency", description: "Determining adequacy of statements to answer a question." },
          { code: "gs.logical_reasoning.puzzles", name: "Puzzles and Seating Arrangement", description: "Linear, circular and cross arrangements; family-tree puzzles." },
        ],
      },
      {
        code: "gs.disaster",
        name: "Disaster Management",
        description: "Vulnerability, preparedness and mitigation of natural and man-made disasters.",
      },
      {
        code: "gs.sustainable_dev",
        name: "Sustainable Development and Environmental Protection",
        description: "Sustainable Development Goals, climate-change conventions, protected areas.",
      },
    ],
  },

  // ── TELANGANA-SPECIFIC ───────────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Telangana — History, Movement, Geography and Policies",
    weight: 1.4,
    topics: [
      {
        code: "ts.history",
        name: "History and Cultural Heritage of Telangana",
        description: "Telangana from Satavahanas to formation of the state.",
        subtopics: [
          { code: "ts.history.satavahana", name: "Satavahanas of Pratisthana", description: "Origin, polity, society and trade under the Satavahanas." },
          { code: "ts.history.kakatiya", name: "Kakatiyas of Warangal", description: "Ganapatideva, Rudramadevi, Prataparudra, art and architecture." },
          { code: "ts.history.qutb_shahi", name: "Qutb Shahis of Golconda", description: "Founding of Hyderabad, Charminar, language and culture." },
          { code: "ts.history.asaf_jahi", name: "Asaf Jahi Nizams", description: "Hyderabad State, administration, education, Salar Jung reforms." },
          { code: "ts.history.culture", name: "Telangana Art and Culture", description: "Bathukamma, Bonalu, Perini, kalamkari, folk arts and literature." },
        ],
      },
      {
        code: "ts.movement",
        name: "Telangana Statehood Movement (1948-2014)",
        description: "Socio-political movements that led to formation of Telangana state.",
        subtopics: [
          { code: "ts.movement.armed", name: "Telangana Armed Struggle (1946-51)", description: "Peasant struggle against Nizam, Communist-led movement." },
          { code: "ts.movement.merger", name: "Merger with Andhra (1956)", description: "Gentlemen's Agreement, States Reorganisation, Andhra Pradesh formation." },
          { code: "ts.movement.1969", name: "1969 Telangana Agitation", description: "Mulki Rules, students' movement and the Jai Telangana agitation." },
          { code: "ts.movement.trs", name: "TRS and Movement (2001-2014)", description: "Formation of TRS, KCR's leadership, Sakala Janula Samme." },
          { code: "ts.movement.formation", name: "Formation of Telangana (2014)", description: "AP Reorganisation Act 2014, bifurcation issues, transition." },
        ],
      },
      {
        code: "ts.geography",
        name: "Geography and Resources of Telangana",
        description: "Physical, climatic and economic geography of Telangana.",
        subtopics: [
          { code: "ts.geography.physical", name: "Physical Features and Climate", description: "Plateau, river systems (Godavari, Krishna), monsoon and soil types." },
          { code: "ts.geography.minerals", name: "Mineral Resources", description: "Coal (Singareni), limestone, granite and other minerals." },
          { code: "ts.geography.agriculture", name: "Agriculture and Irrigation", description: "Major crops, irrigation projects — Kaleshwaram, Mission Kakatiya." },
          { code: "ts.geography.industries", name: "Industries", description: "IT, pharma, textiles, MSMEs and industrial corridors." },
        ],
      },
      {
        code: "ts.economy",
        name: "Telangana Economy and Development",
        description: "State economy, sectoral growth and development indicators.",
        subtopics: [
          { code: "ts.economy.gsdp", name: "Gross State Domestic Product", description: "Sectoral composition, growth trajectory, per-capita income." },
          { code: "ts.economy.budget", name: "State Budget and Finances", description: "Revenue, expenditure, debt position, finance commission share." },
          { code: "ts.economy.demography", name: "Population and Demography", description: "Census 2011 data — sex ratio, literacy, urbanisation." },
        ],
      },
      {
        code: "ts.policies",
        name: "Policies and Welfare Schemes of Telangana",
        description: "Flagship schemes and policies of the Telangana government.",
        subtopics: [
          { code: "ts.policies.rythu_bandhu", name: "Rythu Bandhu and Bima", description: "Investment support and life insurance for farmers." },
          { code: "ts.policies.kcr_kit", name: "KCR Kit and Aasara", description: "Maternity benefits and pension schemes." },
          { code: "ts.policies.mission_kakatiya", name: "Mission Kakatiya and Bhagiratha", description: "Tank restoration and rural drinking water schemes." },
          { code: "ts.policies.education", name: "Education and Gurukulams", description: "Telangana residential schools, KGBV and gurukulams." },
          { code: "ts.policies.industrial", name: "TS-iPASS and Industrial Policy", description: "Single-window industrial clearance and incentives." },
        ],
      },
    ],
  },

  // ── ARITHMETIC / SECRETARIAL ABILITIES ────────────────────────────────
  {
    code: "MATH",
    name: "Arithmetic and Numerical Ability",
    weight: 1,
    topics: [
      { code: "math.simplification", name: "Number System and Simplification", description: "BODMAS, fractions, decimals, square and cube roots." },
      { code: "math.percentage", name: "Percentage", description: "Percentage calculations and applications." },
      { code: "math.profit_loss", name: "Profit and Loss", description: "Cost price, selling price, discount and successive percentages." },
      { code: "math.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse and compound ratio, proportion and partnership." },
      { code: "math.average", name: "Average", description: "Average of numbers, weighted average and applications." },
      { code: "math.si_ci", name: "Simple and Compound Interest", description: "SI, CI, EMI and applied interest calculations." },
      { code: "math.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns, group work." },
      { code: "math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average and relative speed." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of 2D and 3D figures." },
      { code: "math.algebra", name: "Elementary Algebra", description: "Linear and quadratic equations, polynomials, identities." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode, range and basic data interpretation." },
    ],
  },

  // ── REASONING (Mental Ability) ────────────────────────────────────────
  {
    code: "REASONING",
    name: "Mental Ability and Reasoning",
    weight: 1,
    topics: [
      { code: "reasoning.series", name: "Number and Letter Series", description: "Find next/missing/wrong term in numerical and alphabet series." },
      { code: "reasoning.coding", name: "Coding-Decoding", description: "Letter, number and symbol-based coding patterns." },
      { code: "reasoning.directions", name: "Directions and Distances", description: "Direction sense, shortest distance, displacement." },
      { code: "reasoning.blood_relations", name: "Blood Relations", description: "Family-tree puzzles, generations and relationships." },
      { code: "reasoning.analogy", name: "Analogy and Classification", description: "Word, number and figure analogy; odd-one-out." },
      { code: "reasoning.syllogism", name: "Syllogism", description: "Statement-conclusion using Venn diagrams and rules." },
      { code: "reasoning.statement_arguments", name: "Statement and Arguments", description: "Strong/weak arguments, courses of action, assumptions." },
      { code: "reasoning.calendar_clock", name: "Calendar and Clock", description: "Day calculation, leap years, angle between hands." },
      { code: "reasoning.visual", name: "Non-Verbal Reasoning", description: "Mirror image, water image, paper folding and embedded figures." },
    ],
  },
];

export async function seedTspscGroup4Syllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TS_TSPSC_GROUP4" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TS_TSPSC_GROUP4 exam not found.");
  }
  console.log(`Seeding TSPSC Group IV syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tspscGroup4Syllabus.length; sIdx++) {
    const s = tspscGroup4Syllabus[sIdx];
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
  seedTspscGroup4Syllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
