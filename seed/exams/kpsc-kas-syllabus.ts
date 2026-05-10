// KPSC KAS (Karnataka Administrative Service) Prelims — full syllabus tree.
// Two papers (200 marks each, 100 Q × 2 marks, 0.25 negative).
// Paper 1: GS — Indian History/Polity/Economy/Geography with Karnataka emphasis.
// Paper 2: CSAT — State affairs, Science & Tech, Environment, Mental Ability.
// Source: kpsc.kar.nic.in official notification and prospectus.
//
// Run after seedExams: npx tsx seed/exams/kpsc-kas-syllabus.ts

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

export const kpscKasSyllabus: SubjectSeed[] = [
  // ── PAPER 1 — GENERAL STUDIES (40 GS + 60 Humanities) ────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies (Paper 1)",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Events",
        description: "Current events of national and international importance.",
        subtopics: [
          { code: "gs.current_affairs.national", name: "National Current Events", description: "Government policies, schemes, national news of the last 12 months." },
          { code: "gs.current_affairs.international", name: "International Current Events", description: "Geopolitics, treaties, international organizations and summits." },
          { code: "gs.current_affairs.awards", name: "Awards, Sports and Honours", description: "National and international awards, sports events and personalities." },
          { code: "gs.current_affairs.appointments", name: "Appointments and Persons in News", description: "Important appointments, obituaries and persons in news." },
        ],
      },
      {
        code: "gs.history",
        name: "Indian History and National Movement",
        description: "Cultural, social, political and economic aspects of Indian history.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley to Gupta period — society, religion and culture." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Bhakti and Sufi movements." },
          { code: "gs.history.modern", name: "Modern India", description: "British rule, social reform and modern political developments." },
          { code: "gs.history.national_movement", name: "Indian National Movement", description: "1857 to 1947 — Congress, Gandhian phase, partition, integration." },
          { code: "gs.history.cultural", name: "Cultural Aspects", description: "Art, architecture, music, dance, literature and Indian heritage." },
          { code: "gs.history.social", name: "Social Aspects", description: "Caste system, social reforms, women's movement, social structure." },
          { code: "gs.history.economic", name: "Economic Aspects", description: "Pre-colonial economy, colonial drain, industrialization, agrarian impact." },
        ],
      },
      {
        code: "gs.geography",
        name: "Indian and World Geography",
        description: "Geography of India and the world with focus on Karnataka.",
        subtopics: [
          { code: "gs.geography.world_physical", name: "World Physical Geography", description: "Earth, atmosphere, oceans, climate zones, landforms." },
          { code: "gs.geography.india_physical", name: "Physical Geography of India", description: "Mountains, plateaus, plains, rivers, climate, monsoon." },
          { code: "gs.geography.india_economic", name: "Economic Geography of India", description: "Agriculture, mineral resources, industries, transport networks." },
          { code: "gs.geography.population", name: "Population and Settlement", description: "Demographic patterns, urbanization, migration." },
          { code: "gs.geography.environment", name: "Environmental Geography", description: "Ecosystems, biodiversity, climate change, sustainable development." },
          { code: "gs.geography.disaster", name: "Disaster Management", description: "Floods, droughts, earthquakes, cyclones, NDMA framework." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and Political System",
        description: "Constitution, governance and political institutions of India.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Indian Constitution", description: "Preamble, salient features, sources, historical evolution." },
          { code: "gs.polity.fr_dpsp", name: "Fundamental Rights, Duties, DPSPs", description: "Articles 12-51A and key judicial interpretations." },
          { code: "gs.polity.executive", name: "Union and State Executive", description: "President, Governor, Council of Ministers — powers and functions." },
          { code: "gs.polity.legislature", name: "Parliament and State Legislature", description: "Lok Sabha, Rajya Sabha, state legislatures, law-making." },
          { code: "gs.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, judicial review, PIL." },
          { code: "gs.polity.federalism", name: "Federalism", description: "Centre-state relations, finance commission, GST council." },
          { code: "gs.polity.local", name: "Panchayati Raj and Urban Governance", description: "73rd & 74th Amendments, three-tier system, urban local bodies." },
          { code: "gs.polity.elections", name: "Elections and Reforms", description: "ECI, electoral system, anti-defection, electoral reforms." },
          { code: "gs.polity.bodies", name: "Constitutional and Statutory Bodies", description: "UPSC, CAG, NHRC, Finance Commission, NITI Aayog." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy and Reforms",
        description: "Indian economy, planning, reforms and rural development.",
        subtopics: [
          { code: "gs.economy.structure", name: "Structure of Indian Economy", description: "Sectoral composition, mixed economy, post-liberalisation trends." },
          { code: "gs.economy.planning", name: "Planning in India", description: "Five-Year Plans, NITI Aayog, planning objectives." },
          { code: "gs.economy.reforms", name: "Economic Reforms", description: "1991 LPG reforms, second-generation reforms, recent measures." },
          { code: "gs.economy.banking", name: "Banking and Financial System", description: "RBI, commercial banks, SEBI, financial inclusion." },
          { code: "gs.economy.budget_tax", name: "Budget and Taxation", description: "Union budget, fiscal policy, GST, direct/indirect taxes." },
          { code: "gs.economy.poverty", name: "Poverty Alleviation", description: "Poverty estimation, MNREGA, food security, PMAY, PDS." },
          { code: "gs.economy.rural", name: "Rural Development", description: "Rural credit, integrated rural development, rural infrastructure." },
          { code: "gs.economy.social", name: "Social Sector Initiatives", description: "Education, health, women & child welfare, nutrition schemes." },
          { code: "gs.economy.external", name: "External Sector", description: "Foreign trade, balance of payments, FDI, WTO, exchange rate." },
        ],
      },
    ],
  },

  // ── KARNATAKA SPECIFIC ────────────────────────────────────────────────
  {
    code: "KA_SPECIFIC",
    name: "Karnataka — History, Culture, Geography & Administration",
    weight: 1.4,
    topics: [
      {
        code: "ka.history",
        name: "History of Karnataka",
        description: "Karnataka history from ancient dynasties to unification.",
        subtopics: [
          { code: "ka.history.early", name: "Early Dynasties", description: "Mauryas in Karnataka, Satavahanas, Kadambas of Banavasi, Gangas." },
          { code: "ka.history.chalukyas", name: "Chalukyas of Badami and Kalyana", description: "Badami Chalukyas, Pulakesin II, Western Chalukyas." },
          { code: "ka.history.rashtrakutas", name: "Rashtrakutas", description: "Rashtrakuta empire, Amoghavarsha, art and literature." },
          { code: "ka.history.hoysalas", name: "Hoysalas", description: "Hoysala dynasty — temple architecture, Belur, Halebidu." },
          { code: "ka.history.vijayanagar", name: "Vijayanagara Empire", description: "1336-1565 — Krishnadevaraya, administration, society and decline." },
          { code: "ka.history.bahmani", name: "Bahmani and Bijapur Sultanates", description: "Bahmani Shahis and Adil Shahis of Bijapur — Indo-Islamic culture." },
          { code: "ka.history.haider_tipu", name: "Hyder Ali and Tipu Sultan", description: "Mysore under Hyder Ali and Tipu Sultan — Anglo-Mysore wars." },
          { code: "ka.history.wodeyars", name: "Modern Mysore — Wodeyars and Dewans", description: "Mysore princely state, Krishna Raja Wadiyar, Diwan Visvesvaraya." },
          { code: "ka.history.freedom", name: "Freedom Movement in Karnataka", description: "Karnataka in INC, 1885-1947 — Karnataka's role in freedom struggle." },
          { code: "ka.history.unification", name: "Unification of Karnataka", description: "1947-1956 unification movement, States Reorganisation Act 1956." },
        ],
      },
      {
        code: "ka.culture",
        name: "Karnataka Culture and Heritage",
        description: "Karnataka cultural heritage — architecture, literature, art.",
        subtopics: [
          { code: "ka.culture.architecture", name: "Architectural Heritage", description: "Hampi, Pattadakal, Aihole, Badami, Belur, Halebidu, Mysore palace." },
          { code: "ka.culture.literature", name: "Kannada Literature", description: "Pampa, Ranna, Ponna; Vachana literature; Jnanpith awardees." },
          { code: "ka.culture.music_dance", name: "Music and Dance", description: "Carnatic music tradition, Yakshagana, Bhuta Kola, folk dances." },
          { code: "ka.culture.religion", name: "Religious Movements", description: "Jainism in Karnataka, Veerashaiva movement, Basavanna, Sufism." },
          { code: "ka.culture.festivals", name: "Festivals and Traditions", description: "Mysore Dasara, Ugadi, Hampi Utsav, Karaga, regional festivals." },
          { code: "ka.culture.cinema", name: "Kannada Cinema and Theatre", description: "Kannada film industry, Rangabhoomi theatre, modern cinema." },
        ],
      },
      {
        code: "ka.geography",
        name: "Geography of Karnataka",
        description: "Physical, agricultural and resource profile of Karnataka.",
        subtopics: [
          { code: "ka.geography.physical", name: "Physical Features", description: "Western Ghats, Karnataka plateau, coastal Karnataka, Malnad region." },
          { code: "ka.geography.rivers", name: "Rivers of Karnataka", description: "Krishna, Cauvery, Tungabhadra, Sharavathi, Kali — basins and dams." },
          { code: "ka.geography.climate", name: "Climate and Soils", description: "Climate zones, red soil, black soil, laterite, agro-climatic zones." },
          { code: "ka.geography.agriculture", name: "Agriculture in Karnataka", description: "Major crops — coffee, ragi, sugarcane, cotton, horticulture." },
          { code: "ka.geography.forests", name: "Forests and Wildlife", description: "Bandipur, Nagarhole, Bhadra, Western Ghats biodiversity." },
          { code: "ka.geography.minerals", name: "Mineral Resources", description: "Iron ore (Kudremukh, Bellary), gold (KGF), manganese, granite." },
          { code: "ka.geography.industries", name: "Industries of Karnataka", description: "Bengaluru IT, textiles, biotechnology, aerospace, sugar industry." },
        ],
      },
      {
        code: "ka.economy",
        name: "Karnataka Economy and Administration",
        description: "Karnataka economic indicators and state administration.",
        subtopics: [
          { code: "ka.economy.indicators", name: "Economic Indicators", description: "GSDP, sectoral composition, per capita income trends in Karnataka." },
          { code: "ka.economy.schemes", name: "State Government Schemes", description: "Anna Bhagya, Ksheera Bhagya, Vidya Shakti and welfare schemes." },
          { code: "ka.economy.it", name: "Karnataka IT and Innovation", description: "Bengaluru IT cluster, startups, biotech and aerospace policy." },
          { code: "ka.economy.administration", name: "Karnataka Administration", description: "State government structure, districts, divisions and revenue admin." },
          { code: "ka.economy.local_bodies", name: "Local Self-Government in Karnataka", description: "Gram panchayats, ZP, taluk panchayat, municipalities." },
        ],
      },
    ],
  },

  // ── PAPER 2 — CSAT / GENERAL STUDIES II ──────────────────────────────
  {
    code: "CSAT",
    name: "General Studies II / CSAT (Paper 2)",
    weight: 1,
    topics: [
      {
        code: "csat.state_current",
        name: "Current Events of State Importance",
        description: "Karnataka-specific current affairs and government schemes.",
        subtopics: [
          { code: "csat.state_current.affairs", name: "Karnataka Current Affairs", description: "Recent developments, news, political events in Karnataka." },
          { code: "csat.state_current.schemes", name: "State Government Schemes", description: "Important state government programmes and welfare initiatives." },
          { code: "csat.state_current.budget", name: "Karnataka State Budget", description: "Budget priorities, sectoral allocations, fiscal performance." },
        ],
      },
      {
        code: "csat.science_tech",
        name: "General Science and Technology",
        description: "Contemporary science and technology developments.",
        subtopics: [
          { code: "csat.science.physics", name: "Physics Basics", description: "Mechanics, electricity, optics, modern physics fundamentals." },
          { code: "csat.science.chemistry", name: "Chemistry Basics", description: "Periodic table, acids/bases, organic chemistry, daily-life chemistry." },
          { code: "csat.science.biology", name: "Biology Basics", description: "Cells, human body, plant biology, communicable diseases." },
          { code: "csat.science.it", name: "Information Technology", description: "Computers, internet, AI/ML, cyber security." },
          { code: "csat.science.biotech", name: "Biotechnology", description: "Genetic engineering, GM crops, vaccines, applications." },
          { code: "csat.science.space", name: "Space and Defence", description: "ISRO missions, satellites, defence systems, nuclear technology." },
          { code: "csat.science.health", name: "Public Health", description: "Diseases, immunization, health programmes, nutrition." },
        ],
      },
      {
        code: "csat.environment",
        name: "Environment and Ecology",
        description: "Environmental issues, biodiversity and climate change.",
        subtopics: [
          { code: "csat.environment.ecology", name: "Basic Ecology", description: "Ecosystems, food chains, biomes, ecological pyramids." },
          { code: "csat.environment.biodiversity", name: "Biodiversity", description: "Hotspots, conservation, endangered species, IUCN Red List." },
          { code: "csat.environment.climate", name: "Climate Change", description: "Global warming, IPCC, carbon cycle, mitigation strategies." },
          { code: "csat.environment.laws", name: "Environmental Laws and Conventions", description: "Environment Protection Act, Forest Act, Paris/Kyoto/Ramsar." },
          { code: "csat.environment.pollution", name: "Pollution Control", description: "Air, water, soil, noise pollution and control measures." },
          { code: "csat.environment.protected", name: "Protected Areas", description: "National parks, sanctuaries, biosphere reserves of India." },
          { code: "csat.environment.health_issues", name: "General Health Issues", description: "Public health, lifestyle diseases, sanitation issues." },
        ],
      },
      {
        code: "csat.comprehension",
        name: "Comprehension",
        description: "Reading comprehension passages with inferential questions.",
      },
      {
        code: "csat.reasoning",
        name: "Logical Reasoning and Analytical Ability",
        description: "Reasoning, analytical and decision-making problems.",
        subtopics: [
          { code: "csat.reasoning.syllogism", name: "Syllogism", description: "Statement-conclusion deduction with quantifiers." },
          { code: "csat.reasoning.statement", name: "Statement and Argument", description: "Identifying assumptions and strong arguments." },
          { code: "csat.reasoning.coding", name: "Coding-Decoding", description: "Letter, number and conditional coding patterns." },
          { code: "csat.reasoning.series", name: "Series and Analogy", description: "Number, letter, alphanumeric series and analogy." },
          { code: "csat.reasoning.relations", name: "Blood Relations", description: "Family-tree problems and relation puzzles." },
          { code: "csat.reasoning.directions", name: "Directions and Distance", description: "Compass-based movement and final position." },
          { code: "csat.reasoning.seating", name: "Seating Arrangement and Puzzles", description: "Linear, circular arrangement and box puzzles." },
          { code: "csat.reasoning.decision", name: "Decision Making", description: "Real-life situational decision-making scenarios." },
        ],
      },
      {
        code: "csat.numeracy",
        name: "Basic Numeracy and Number Relations",
        description: "Mathematical problems at SSLC (Class X) level.",
        subtopics: [
          { code: "csat.numeracy.number_system", name: "Number System", description: "Divisibility, factors, HCF/LCM, fractions, decimals." },
          { code: "csat.numeracy.percentage", name: "Percentage", description: "Percentage calculations and applications." },
          { code: "csat.numeracy.ratio", name: "Ratio and Proportion", description: "Ratio, proportion, partnership and mixtures." },
          { code: "csat.numeracy.average", name: "Average", description: "Average, weighted average and applications." },
          { code: "csat.numeracy.si_ci", name: "Simple and Compound Interest", description: "SI, CI and applied interest problems." },
          { code: "csat.numeracy.profit_loss", name: "Profit and Loss", description: "CP/SP/MP, discount and profit calculations." },
          { code: "csat.numeracy.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns problems." },
          { code: "csat.numeracy.time_distance", name: "Time, Speed, Distance", description: "Trains, boats, relative speed problems." },
          { code: "csat.numeracy.mensuration", name: "Mensuration", description: "Area and volume of triangles, circles, cubes, cylinders." },
          { code: "csat.numeracy.probability", name: "Probability and Combinatorics", description: "Basic probability, permutations and combinations." },
        ],
      },
      {
        code: "csat.di",
        name: "Data Interpretation",
        description: "Charts, graphs, tables and data sufficiency.",
        subtopics: [
          { code: "csat.di.tables", name: "Tables", description: "Tabular data — extraction and computation." },
          { code: "csat.di.bar_pie", name: "Bar and Pie Graphs", description: "Bar graph and pie chart-based DI questions." },
          { code: "csat.di.line", name: "Line Graphs", description: "Line graph trend analysis and computation." },
          { code: "csat.di.data_sufficiency", name: "Data Sufficiency", description: "Determine whether given data suffices to answer." },
        ],
      },
      {
        code: "csat.english",
        name: "English Language",
        description: "Basic English language skills at high-school level.",
        subtopics: [
          { code: "csat.english.grammar", name: "Grammar", description: "Tenses, articles, prepositions, parts of speech and sentence structure." },
          { code: "csat.english.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms, idioms, one-word substitution." },
          { code: "csat.english.error_spotting", name: "Error Spotting", description: "Identify grammatical errors in sentences." },
          { code: "csat.english.fill_blanks", name: "Fill in the Blanks", description: "Single and double-blank sentence completion." },
        ],
      },
    ],
  },
];

export async function seedKpscKasSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "KA_KPSC_KAS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — KA_KPSC_KAS exam not found.");
  }
  console.log(`Seeding KPSC KAS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < kpscKasSyllabus.length; sIdx++) {
    const s = kpscKasSyllabus[sIdx];
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
  seedKpscKasSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
