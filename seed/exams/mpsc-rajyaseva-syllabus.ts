// MPSC Rajyaseva (State Service) Prelims — full syllabus tree.
// Two papers: GS Paper 1 (100 Q, 200 marks) and CSAT Paper 2 (80 Q, 200 marks).
// CSAT is qualifying (33% minimum); merit on Paper 1 only.
// Source: mpsc.gov.in official notification and prospectus.
//
// Run after seedExams: npx tsx seed/exams/mpsc-rajyaseva-syllabus.ts

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

export const mpscRajyasevaSyllabus: SubjectSeed[] = [
  // ── PAPER 1 — GENERAL STUDIES ────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies (Paper 1)",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Events",
        description: "Current events of state, national and international importance.",
        subtopics: [
          { code: "gs.current_affairs.state", name: "Maharashtra Current Events", description: "Maharashtra government schemes, political developments, news." },
          { code: "gs.current_affairs.national", name: "National Current Events", description: "Central government policies, schemes, national news of last 12 months." },
          { code: "gs.current_affairs.international", name: "International Current Events", description: "Bilateral relations, summits, treaties, world events." },
          { code: "gs.current_affairs.awards", name: "Awards, Honours and Sports", description: "National/international awards, sports events and personalities." },
        ],
      },
      {
        code: "gs.history",
        name: "History of India and Indian National Movement",
        description: "Indian history with specific weightage to Maharashtra.",
        subtopics: [
          { code: "gs.history.modern", name: "Modern Indian History", description: "Mid-18th century onwards — British rule, reforms, governance." },
          { code: "gs.history.ina", name: "Indian National Movement", description: "1857 revolt to 1947 — Congress, Gandhian phase, partition." },
          { code: "gs.history.social_reform", name: "Social and Religious Reform Movements", description: "Brahmo Samaj, Arya Samaj, Prarthana Samaj, Satyashodhak Samaj." },
          { code: "gs.history.maharashtra_freedom", name: "Maharashtra in Freedom Struggle", description: "Tilak, Gokhale, Ranade, Savarkar, Vinoba Bhave's contributions." },
          { code: "gs.history.maharashtra_history", name: "History of Maharashtra", description: "Marathas, Shivaji's empire, Peshwas, princely states, post-1947." },
          { code: "gs.history.constitutional_dev", name: "Constitutional Development", description: "Acts of 1858-1947 leading to the Indian Constitution." },
        ],
      },
      {
        code: "gs.geography",
        name: "Maharashtra, India and World Geography",
        description: "Physical, social and economic geography.",
        subtopics: [
          { code: "gs.geography.physical_world", name: "World Physical Geography", description: "Earth, atmosphere, oceans, climate zones, landforms." },
          { code: "gs.geography.physical_india", name: "Physical Geography of India", description: "Mountains, rivers, climate, monsoon, soils, vegetation." },
          { code: "gs.geography.physical_maharashtra", name: "Physical Geography of Maharashtra", description: "Western Ghats, Konkan, Deccan plateau, rivers, climate." },
          { code: "gs.geography.economic", name: "Economic Geography", description: "Agriculture, mineral resources, industries, transport networks." },
          { code: "gs.geography.social", name: "Social Geography", description: "Population distribution, density, migration, demography." },
          { code: "gs.geography.dams_rivers", name: "Dams and Rivers in Maharashtra", description: "Major dams, river systems, irrigation projects, water disputes." },
          { code: "gs.geography.water_treaties", name: "Inter-state Water Treaties", description: "Krishna, Godavari water disputes and tribunal awards." },
          { code: "gs.geography.resources", name: "Distribution of Natural Resources", description: "Mineral, forest and energy resource distribution globally." },
        ],
      },
      {
        code: "gs.polity",
        name: "Maharashtra and India — Polity and Governance",
        description: "Constitution, political system and governance structures.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights, duties, DPSPs, amendments." },
          { code: "gs.polity.political_system", name: "Political System in India", description: "Union and state executive, legislature, judiciary." },
          { code: "gs.polity.federalism", name: "Federalism and Centre-State Relations", description: "Distribution of powers, finance commission, inter-state councils." },
          { code: "gs.polity.panchayati_raj", name: "Panchayati Raj", description: "73rd Amendment, three-tier system, gram sabha, finances." },
          { code: "gs.polity.urban_governance", name: "Urban Governance", description: "74th Amendment, municipalities, urban local bodies." },
          { code: "gs.polity.public_policy", name: "Public Policy and Rights Issues", description: "Policy formulation, RTI, RTE and rights-based legislation." },
          { code: "gs.polity.elections", name: "Elections and Political Parties", description: "ECI, electoral reforms, party system, anti-defection." },
          { code: "gs.polity.maharashtra_admin", name: "Maharashtra Administration", description: "State government structure, district administration, divisions." },
          { code: "gs.polity.rpa", name: "Representation of People's Act", description: "Provisions of RPA 1950 and 1951, electoral law." },
        ],
      },
      {
        code: "gs.economy",
        name: "Economic and Social Development",
        description: "Indian and Maharashtra economy with focus on social development.",
        subtopics: [
          { code: "gs.economy.sustainable", name: "Sustainable Development and SDGs", description: "UN SDGs, sustainable development principles and India's progress." },
          { code: "gs.economy.poverty", name: "Poverty and Inclusion", description: "Poverty estimation, measurement, alleviation programmes." },
          { code: "gs.economy.demography", name: "Demography", description: "Population, sex ratio, literacy, age structure, census data." },
          { code: "gs.economy.social_initiatives", name: "Social Sector Initiatives", description: "Education, health, women & child welfare, nutrition schemes." },
          { code: "gs.economy.maharashtra_econ", name: "Economy of Maharashtra", description: "Sectoral composition, industries, agriculture, services in Maharashtra." },
          { code: "gs.economy.indian_econ", name: "Indian Economic Issues", description: "Inflation, fiscal policy, monetary policy, banking, trade." },
          { code: "gs.economy.agriculture", name: "Agriculture and Rural Economy", description: "Cropping pattern, MSP, agricultural reforms, rural credit." },
          { code: "gs.economy.industry", name: "Industry and Services", description: "Industrial policy, MSMEs, IT services, Make in India." },
        ],
      },
      {
        code: "gs.environment",
        name: "Environmental Ecology, Biodiversity and Climate Change",
        description: "Environmental issues, ecology and global climate frameworks.",
        subtopics: [
          { code: "gs.environment.basic", name: "Basic Principles of Ecology", description: "Ecosystems, food chains, ecological pyramids, biomes." },
          { code: "gs.environment.biodiversity", name: "Biodiversity", description: "Hotspots, conservation, IUCN Red List, endemic species." },
          { code: "gs.environment.climate", name: "Climate Change", description: "Global warming, IPCC, carbon cycle, mitigation strategies." },
          { code: "gs.environment.laws", name: "Environmental Laws", description: "Environment Protection Act, Forest Act, Wildlife Protection Act." },
          { code: "gs.environment.conventions", name: "International Conventions", description: "Kyoto Protocol, Basel, Montreal, Paris, Ramsar conventions." },
          { code: "gs.environment.protected", name: "Wildlife Sanctuaries and National Parks", description: "Major sanctuaries, tiger reserves, biosphere reserves of India." },
          { code: "gs.environment.pollution", name: "Pollution and Conservation", description: "Air, water, soil, noise pollution and conservation strategies." },
        ],
      },
      {
        code: "gs.science_tech",
        name: "General Science and Technology",
        description: "General science and technology — no specialization required.",
        subtopics: [
          { code: "gs.science.physics", name: "Physics Basics", description: "Mechanics, electricity, optics, modern physics fundamentals." },
          { code: "gs.science.chemistry", name: "Chemistry Basics", description: "Periodic table, acids/bases, organic chemistry, daily-life chemistry." },
          { code: "gs.science.biology", name: "Biology Basics", description: "Cells, human body, plant biology, communicable diseases." },
          { code: "gs.science.it", name: "Information Technology", description: "Computers, internet, AI, cyber security, digital governance." },
          { code: "gs.science.biotech", name: "Biotechnology", description: "Genetic engineering, GM crops, vaccines, applications." },
          { code: "gs.science.space", name: "Space and Defence Technology", description: "ISRO missions, satellites, defence systems, nuclear technology." },
        ],
      },
    ],
  },

  // ── MAHARASHTRA-SPECIFIC ─────────────────────────────────────────────
  {
    code: "MH_SPECIFIC",
    name: "Maharashtra — Society, Culture, Heritage",
    weight: 1.2,
    topics: [
      {
        code: "mh.history",
        name: "History of Maharashtra",
        description: "Maharashtra history from ancient to modern times.",
        subtopics: [
          { code: "mh.history.ancient", name: "Ancient Maharashtra", description: "Satavahanas, Vakatakas, Rashtrakutas in Maharashtra region." },
          { code: "mh.history.medieval", name: "Medieval Maharashtra", description: "Yadavas of Devagiri, Bahmani Sultanate, Deccan Sultanates." },
          { code: "mh.history.maratha", name: "Maratha Empire", description: "Shivaji's rise, Maratha administration, Peshwa period, decline." },
          { code: "mh.history.british", name: "Maharashtra under British", description: "Bombay Presidency, social reform context, modernization." },
        ],
      },
      {
        code: "mh.society",
        name: "Society and Social Reform in Maharashtra",
        description: "Social structure, reformers and movements.",
        subtopics: [
          { code: "mh.society.reformers", name: "Maharashtra Social Reformers", description: "Phule, Gopal Hari Deshmukh, Ranade, Karve, Agarkar." },
          { code: "mh.society.dalits", name: "Dalit Movement", description: "B.R. Ambedkar, Dalit rights movement and Buddhism conversion." },
          { code: "mh.society.satyashodhak", name: "Satyashodhak Samaj", description: "Mahatma Phule's Satyashodhak Samaj — anti-caste reform." },
          { code: "mh.society.women", name: "Women's Movement in Maharashtra", description: "Savitribai Phule, Pandita Ramabai, Tarabai Shinde." },
          { code: "mh.society.tribes", name: "Tribes of Maharashtra", description: "Major tribes — Warli, Gond, Bhil, Korku and welfare measures." },
        ],
      },
      {
        code: "mh.culture",
        name: "Art, Culture and Heritage of Maharashtra",
        description: "Maharashtra art, culture, festivals and monuments.",
        subtopics: [
          { code: "mh.culture.monuments", name: "Monuments and Heritage", description: "Ajanta, Ellora, Elephanta, Bibi Ka Maqbara, Shivaji forts." },
          { code: "mh.culture.saints", name: "Saints of Maharashtra", description: "Dnyaneshwar, Tukaram, Eknath, Namdev, Ramdas — Bhakti tradition." },
          { code: "mh.culture.poets", name: "Poets and Writers", description: "Marathi literature, modern poets, Sahitya Akademi laureates." },
          { code: "mh.culture.folk", name: "Folk Traditions and Festivals", description: "Lavani, Powada, Tamasha, Ganesh Chaturthi, Gudi Padwa." },
          { code: "mh.culture.theatre", name: "Marathi Theatre and Cinema", description: "Sangeet Natak tradition, modern Marathi theatre and cinema." },
        ],
      },
      {
        code: "mh.geography",
        name: "Geography and Resources of Maharashtra",
        description: "Physical, agricultural and resource profile of Maharashtra.",
        subtopics: [
          { code: "mh.geography.physical", name: "Physical Features", description: "Western Ghats (Sahyadri), Konkan coast, Deccan plateau." },
          { code: "mh.geography.rivers", name: "Rivers of Maharashtra", description: "Godavari, Krishna, Bhima, Tapi — basins and irrigation." },
          { code: "mh.geography.climate", name: "Climate and Soils", description: "Climate zones, regur soils, rainfall distribution." },
          { code: "mh.geography.agriculture", name: "Agriculture in Maharashtra", description: "Major crops — sugarcane, cotton, jowar, oilseeds, horticulture." },
          { code: "mh.geography.minerals", name: "Mineral Resources", description: "Coal, iron ore, manganese, bauxite distribution and mining." },
          { code: "mh.geography.industries", name: "Industries of Maharashtra", description: "Mumbai-Pune corridor, textiles, automobile, IT, sugar industry." },
        ],
      },
      {
        code: "mh.economy",
        name: "Maharashtra Economy and Welfare",
        description: "Maharashtra economic indicators and welfare programmes.",
        subtopics: [
          { code: "mh.economy.indicators", name: "Economic Indicators", description: "GSDP, sectoral composition, per capita income trends." },
          { code: "mh.economy.schemes", name: "State Welfare Schemes", description: "Jal Jeevan, Mahatma Phule Jan Arogya, agricultural schemes." },
          { code: "mh.economy.urbanization", name: "Urbanization", description: "Mumbai metropolitan region, smart cities, urban issues." },
          { code: "mh.economy.cooperatives", name: "Cooperative Movement", description: "Cooperative banks, dairy, sugar cooperatives in Maharashtra." },
        ],
      },
    ],
  },

  // ── PAPER 2 — CSAT (Qualifying) ──────────────────────────────────────
  {
    code: "CSAT",
    name: "CSAT (Paper 2 — Qualifying)",
    weight: 0.5,
    topics: [
      {
        code: "csat.comprehension",
        name: "Comprehension",
        description: "Reading comprehension passages in Marathi and English.",
        subtopics: [
          { code: "csat.comprehension.marathi", name: "Marathi Comprehension", description: "Marathi passages with question on inference, vocabulary, theme." },
          { code: "csat.comprehension.english", name: "English Comprehension", description: "English passages on main idea, inference, tone." },
          { code: "csat.comprehension.vocabulary", name: "Vocabulary and Usage", description: "Word meanings, usage in context, sentence-level interpretation." },
        ],
      },
      {
        code: "csat.interpersonal",
        name: "Interpersonal and Communication Skills",
        description: "Communication, leadership and people-skill scenarios.",
      },
      {
        code: "csat.logical_reasoning",
        name: "Logical Reasoning and Analytical Ability",
        description: "Reasoning, analytical and critical thinking.",
        subtopics: [
          { code: "csat.reasoning.syllogism", name: "Syllogism", description: "Statement-conclusion deduction with quantifiers." },
          { code: "csat.reasoning.statement_assumption", name: "Statement and Assumption/Argument", description: "Identifying implicit assumptions and strong arguments." },
          { code: "csat.reasoning.coding", name: "Coding-Decoding", description: "Letter, number and conditional coding." },
          { code: "csat.reasoning.series", name: "Series and Analogy", description: "Number, letter, alphanumeric series and analogy." },
          { code: "csat.reasoning.blood_relations", name: "Blood Relations", description: "Family-tree problems and relation-based puzzles." },
          { code: "csat.reasoning.directions", name: "Directions and Distance", description: "Compass-based movement and final position problems." },
          { code: "csat.reasoning.seating", name: "Seating Arrangement and Puzzles", description: "Linear, circular arrangement and box puzzles." },
        ],
      },
      {
        code: "csat.decision_making",
        name: "Decision-Making and Problem Solving",
        description: "Real-life situational decision-making scenarios.",
      },
      {
        code: "csat.numeracy",
        name: "Basic Numeracy",
        description: "Numbers and their relations of Class X level.",
        subtopics: [
          { code: "csat.numeracy.number_system", name: "Number System", description: "Divisibility, factors, HCF/LCM, fractions." },
          { code: "csat.numeracy.percentage", name: "Percentage and Ratio", description: "Percentage, ratio, proportion and applications." },
          { code: "csat.numeracy.average", name: "Average", description: "Average, weighted average and applications." },
          { code: "csat.numeracy.si_ci", name: "Simple and Compound Interest", description: "SI, CI and applied interest problems." },
          { code: "csat.numeracy.profit_loss", name: "Profit and Loss", description: "CP/SP/MP, discount and profit percentage." },
          { code: "csat.numeracy.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns." },
          { code: "csat.numeracy.time_distance", name: "Time, Speed, Distance", description: "Trains, boats, relative speed problems." },
          { code: "csat.numeracy.geometry", name: "Geometry and Mensuration", description: "Lines, triangles, area and volume of basic figures." },
          { code: "csat.numeracy.age", name: "Age-related Problems", description: "Age problems with linear-equation framing." },
        ],
      },
      {
        code: "csat.di",
        name: "Data Interpretation",
        description: "Interpretation of data presented graphically and tabular.",
        subtopics: [
          { code: "csat.di.tables", name: "Tables", description: "Tabular data — extraction and computation." },
          { code: "csat.di.bar_graph", name: "Bar and Pie Graphs", description: "Bar graph, pie chart-based DI questions." },
          { code: "csat.di.line_graph", name: "Line Graph", description: "Line graph trend analysis and computations." },
          { code: "csat.di.caselet", name: "Caselet DI", description: "Paragraph-based DI questions." },
          { code: "csat.di.data_sufficiency", name: "Data Sufficiency", description: "Determining whether given data is sufficient to answer." },
        ],
      },
    ],
  },
];

export async function seedMpscRajyasevaSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MH_MPSC_RAJYASEVA" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MH_MPSC_RAJYASEVA exam not found.");
  }
  console.log(`Seeding MPSC Rajyaseva syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mpscRajyasevaSyllabus.length; sIdx++) {
    const s = mpscRajyasevaSyllabus[sIdx];
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
  seedMpscRajyasevaSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
