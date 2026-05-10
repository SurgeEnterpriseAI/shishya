// TNPSC Group I Prelims — full syllabus tree.
// Single GS paper, 200 MCQs (300 marks). Covers General Studies (Degree Std)
// + Tamil Nadu specific topics + Aptitude & Mental Ability (SSLC Std).
// Source: tnpsc.gov.in official syllabus PDF (Group-I CCSE-I).
//
// Run after seedExams: npx tsx seed/exams/tnpsc-group1-syllabus.ts

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

export const tnpscGroup1Syllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES (Degree Standard) ────────────────────────────────
  {
    code: "GS",
    name: "General Studies",
    weight: 1,
    topics: [
      {
        code: "gs.science",
        name: "General Science",
        description: "Scientific knowledge, scientific temper, applications of science.",
        subtopics: [
          { code: "gs.science.physics", name: "Physics", description: "Mechanics, force and motion, heat, light, sound, electricity, magnetism." },
          { code: "gs.science.chemistry", name: "Chemistry", description: "Elements and compounds, acids/bases/salts, fertilizers, pesticides." },
          { code: "gs.science.biology", name: "Botany and Zoology", description: "Plants, animals, classification, evolution, genetics, physiology." },
          { code: "gs.science.human_body", name: "Human Body, Health and Nutrition", description: "Human body systems, nutrition, communicable and non-communicable diseases." },
          { code: "gs.science.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change, pollution, conservation." },
          { code: "gs.science.tech", name: "Science & Technology", description: "Inventions, IT, biotechnology, space, defence and nuclear technology in India." },
        ],
      },
      {
        code: "gs.current_affairs",
        name: "Current Events",
        description: "National and international current affairs of the last 12-18 months.",
        subtopics: [
          { code: "gs.current_affairs.political", name: "Political Events", description: "Elections, government policies, constitutional amendments, schemes." },
          { code: "gs.current_affairs.economic", name: "Economic Events", description: "Budget, RBI policy, GDP, inflation, trade and economic indicators." },
          { code: "gs.current_affairs.sports", name: "Sports", description: "International and national sports events, awards, tournaments." },
          { code: "gs.current_affairs.awards", name: "Awards and Honours", description: "National and international awards — Padma, Nobel, Gallantry awards." },
          { code: "gs.current_affairs.intl", name: "International Relations", description: "India's bilateral and multilateral relations, summits, treaties." },
          { code: "gs.current_affairs.books", name: "Books and Authors", description: "Recent notable books and their authors." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography of India",
        description: "Indian geography with focus on physical, social, and economic aspects.",
        subtopics: [
          { code: "gs.geography.physical", name: "Physical Features of India", description: "Mountains, plains, plateaus, coasts, islands and locations." },
          { code: "gs.geography.climate", name: "Climate, Monsoon and Rainfall", description: "Indian monsoon system, climate types, regional variation." },
          { code: "gs.geography.rivers", name: "Rivers and Water Resources", description: "Major rivers, tributaries, multipurpose projects, irrigation." },
          { code: "gs.geography.natural_resources", name: "Natural Resources", description: "Minerals, forests, wildlife and conservation efforts." },
          { code: "gs.geography.agriculture", name: "Agriculture", description: "Cropping pattern, Green Revolution, agricultural regions, soil types." },
          { code: "gs.geography.transport", name: "Transport and Communication", description: "Roadways, railways, airways, ports and telecom networks." },
          { code: "gs.geography.disasters", name: "Natural Calamities and Disaster Management", description: "Earthquakes, cyclones, floods, droughts, NDMA." },
          { code: "gs.geography.environment", name: "Environmental Issues", description: "Climate change, green energy, pollution control measures." },
        ],
      },
      {
        code: "gs.history",
        name: "History and Culture of India",
        description: "Indian history from Indus Valley to post-independence; cultural heritage.",
        subtopics: [
          { code: "gs.history.ivc", name: "Indus Valley Civilization", description: "Harappan civilization — sites, society, economy, art." },
          { code: "gs.history.vedic", name: "Vedic Age", description: "Early and Later Vedic society, religion and polity." },
          { code: "gs.history.mauryan", name: "Mauryan Empire", description: "Chandragupta, Ashoka, Mauryan administration and edicts." },
          { code: "gs.history.gupta", name: "Gupta and Post-Gupta Period", description: "Gupta golden age, Harshavardhana, regional kingdoms." },
          { code: "gs.history.medieval", name: "Delhi Sultanate and Mughals", description: "Slave to Lodi dynasties, Mughal empire, art and architecture." },
          { code: "gs.history.maratha", name: "Marathas and Regional Powers", description: "Shivaji, Peshwas, Sikhs, Rajputs, regional empires." },
          { code: "gs.history.bhakti_sufi", name: "Bhakti and Sufi Movements", description: "Saints, philosophy and social impact of religious reform." },
          { code: "gs.history.culture", name: "Indian Culture and Heritage", description: "Art, architecture, music, dance, literature and festivals." },
          { code: "gs.history.unity", name: "Unity in Diversity", description: "Race, language, religion, custom — Indian secular fabric." },
        ],
      },
      {
        code: "gs.freedom",
        name: "Indian National Movement",
        description: "British colonialism and Indian struggle for independence.",
        subtopics: [
          { code: "gs.freedom.early", name: "Early Resistance and 1857", description: "Causes and consequences of the Revolt of 1857." },
          { code: "gs.freedom.congress", name: "Indian National Congress and Moderates", description: "Foundation of INC, moderate phase, Surat split." },
          { code: "gs.freedom.extremist", name: "Extremist and Revolutionary Phase", description: "Lal-Bal-Pal, Bhagat Singh, Subhas Bose and revolutionaries." },
          { code: "gs.freedom.gandhi", name: "Gandhian Era", description: "Non-cooperation, Civil Disobedience and Quit India movements." },
          { code: "gs.freedom.partition", name: "Communalism and Partition", description: "Two-nation theory, partition, integration of states." },
          { code: "gs.freedom.leaders", name: "National Leaders", description: "Nehru, Patel, Ambedkar, Gandhi, Bose and contemporaries." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity",
        description: "Constitution of India, governance structures and institutions.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, salient features, sources and historical evolution." },
          { code: "gs.polity.fr_dpsp", name: "Fundamental Rights, Duties and DPSPs", description: "Articles 12-51A — rights, duties, directive principles." },
          { code: "gs.polity.union", name: "Union Government", description: "President, Prime Minister, Council of Ministers, Parliament." },
          { code: "gs.polity.state", name: "State Government", description: "Governor, Chief Minister, State Legislature, High Courts." },
          { code: "gs.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, judicial review, PIL." },
          { code: "gs.polity.local", name: "Local Self Government", description: "Panchayati Raj, urban local bodies — 73rd & 74th Amendments." },
          { code: "gs.polity.federalism", name: "Federalism and Centre-State Relations", description: "Distribution of powers, finance commission, inter-state councils." },
          { code: "gs.polity.elections", name: "Election Commission and Elections", description: "ECI, electoral reforms, anti-defection law, political parties." },
          { code: "gs.polity.anti_corruption", name: "Anti-corruption Measures", description: "Lokpal, Lokayukta, CVC, RTI, whistle-blower protection." },
          { code: "gs.polity.rights_bodies", name: "Statutory & Constitutional Bodies", description: "NHRC, NCW, SC/ST/OBC Commissions, CAG, UPSC." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy",
        description: "Indian economy structure, planning, financial system and reforms.",
        subtopics: [
          { code: "gs.economy.nature", name: "Nature of Indian Economy", description: "Sectoral composition, mixed economy, recent trends." },
          { code: "gs.economy.planning", name: "Five-Year Plans and NITI Aayog", description: "Planning Commission, NITI Aayog, plan objectives." },
          { code: "gs.economy.banking", name: "Banking System", description: "RBI, commercial banks, NABARD, financial inclusion." },
          { code: "gs.economy.fiscal", name: "Fiscal and Monetary Policy", description: "Budget, taxation, GST, fiscal deficit, monetary policy tools." },
          { code: "gs.economy.agriculture", name: "Agricultural Economy", description: "MSP, PDS, agricultural reforms, food security." },
          { code: "gs.economy.industry", name: "Industrial Growth", description: "Industrial policy, MSMEs, Make in India, PLI scheme." },
          { code: "gs.economy.poverty", name: "Poverty, Unemployment and Inclusion", description: "Poverty alleviation schemes, employment, MNREGA." },
          { code: "gs.economy.external", name: "External Sector", description: "Foreign trade, balance of payments, FDI, WTO." },
          { code: "gs.economy.development", name: "Development Indicators", description: "HDI, sustainable development goals, demography." },
        ],
      },
    ],
  },

  // ── TAMIL NADU SPECIFIC ──────────────────────────────────────────────
  {
    code: "TN_SPECIFIC",
    name: "Tamil Nadu — History, Culture, Society & Administration",
    weight: 1.4,
    topics: [
      {
        code: "tn.history",
        name: "History of Tamil Nadu",
        description: "Ancient to modern history of the Tamil region.",
        subtopics: [
          { code: "tn.history.sangam", name: "Sangam Age", description: "Cheras, Cholas, Pandyas — Sangam society, economy and literature." },
          { code: "tn.history.pallavas", name: "Pallavas of Kanchi", description: "Mahendravarman, Narasimhavarman, Pallava art and architecture." },
          { code: "tn.history.imperial_cholas", name: "Imperial Cholas", description: "Rajaraja I, Rajendra I, naval expeditions, temple architecture." },
          { code: "tn.history.later_pandyas", name: "Later Pandyas and Vijayanagar", description: "Pandya revival, Vijayanagar rule, Nayak kingdoms." },
          { code: "tn.history.european", name: "European Powers in Tamil Nadu", description: "Portuguese, Dutch, French, English — Carnatic Wars." },
          { code: "tn.history.archaeology", name: "Archaeological Discoveries", description: "Keezhadi, Adichanallur, Arikamedu and other major sites." },
        ],
      },
      {
        code: "tn.literature",
        name: "Tamil Language and Literature",
        description: "Classical to modern Tamil literature.",
        subtopics: [
          { code: "tn.literature.sangam", name: "Sangam Literature", description: "Tolkappiyam, Ettuthogai, Pathupattu — themes and society." },
          { code: "tn.literature.thirukkural", name: "Thirukkural", description: "Thiruvalluvar's Kural — secular ethics and global relevance." },
          { code: "tn.literature.bhakti", name: "Bhakti Literature", description: "Alvars, Nayanars, Periyapuranam, Divya Prabandham." },
          { code: "tn.literature.epics", name: "Tamil Epics", description: "Silappathikaram, Manimekalai, Cheevaka Chinthamani." },
          { code: "tn.literature.modern", name: "Modern Tamil Literature", description: "Bharathiyar, Bharathidasan and contemporary writers." },
        ],
      },
      {
        code: "tn.freedom",
        name: "Freedom Struggle in Tamil Nadu",
        description: "Tamil Nadu's contribution to the Indian National Movement.",
        subtopics: [
          { code: "tn.freedom.early_uprisings", name: "Early Uprisings", description: "Polygar Wars, Veerapandiya Kattabomman, Marudhu brothers, Vellore Mutiny." },
          { code: "tn.freedom.congress", name: "Tamil Nadu and INC", description: "Madras Mahajana Sabha, Tamil leaders in early Congress." },
          { code: "tn.freedom.gandhian", name: "Gandhian Movement in TN", description: "Non-cooperation, Salt Satyagraha (Vedaranyam), Quit India." },
          { code: "tn.freedom.leaders", name: "Tamil Nadu Freedom Leaders", description: "Subramania Bharathi, V.O. Chidambaram Pillai, Rajaji, Kamaraj." },
        ],
      },
      {
        code: "tn.movements",
        name: "Socio-Political Movements in Tamil Nadu",
        description: "Reform, rationalist and Dravidian movements.",
        subtopics: [
          { code: "tn.movements.justice", name: "Justice Party", description: "Origin, ideology, achievements of the South Indian Liberal Federation." },
          { code: "tn.movements.self_respect", name: "Self-Respect Movement", description: "Periyar E.V. Ramasamy — rationalism, social equality." },
          { code: "tn.movements.dravidian", name: "Dravidian Movement", description: "DK, DMK, AIADMK — ideology and political evolution." },
          { code: "tn.movements.reformers", name: "Social Reformers of TN", description: "Vaikunda Swami, Iyothee Thass, Ayyankali, Ramalinga Adigalar." },
          { code: "tn.movements.women", name: "Women's Movements", description: "Moovalur Ramamirtham, Dr. Muthulakshmi Reddy and women's rights." },
        ],
      },
      {
        code: "tn.culture",
        name: "Art, Culture and Heritage of Tamil Nadu",
        description: "Tamil cultural heritage — temples, music, dance and traditions.",
        subtopics: [
          { code: "tn.culture.temples", name: "Temple Architecture", description: "Dravidian style, Chola/Pallava/Nayak temples, UNESCO sites." },
          { code: "tn.culture.dance", name: "Bharatanatyam and Folk Dances", description: "Classical Bharatanatyam, Karagattam, Oyilattam, Therukoothu." },
          { code: "tn.culture.music", name: "Carnatic Music", description: "Trinity of Carnatic music, Tamil Isai movement." },
          { code: "tn.culture.festivals", name: "Festivals and Customs", description: "Pongal, Tamil New Year, regional festivals and traditions." },
        ],
      },
      {
        code: "tn.administration",
        name: "Tamil Nadu Administration and Development",
        description: "Administrative structure and welfare schemes of Tamil Nadu.",
        subtopics: [
          { code: "tn.administration.structure", name: "TN Administrative Structure", description: "Governor, CM, Secretariat, districts and revenue divisions." },
          { code: "tn.administration.welfare", name: "Welfare Schemes", description: "Mid-day meal, free schemes, Amma scheme series and impact." },
          { code: "tn.administration.industry", name: "Industrial Development in TN", description: "Industrial corridors, automobile/textile/IT industries." },
          { code: "tn.administration.agriculture", name: "Agriculture and Irrigation", description: "Cauvery delta, dam projects, cropping pattern." },
          { code: "tn.administration.e_gov", name: "e-Governance in Tamil Nadu", description: "Digital initiatives — e-Sevai, TN e-District, citizen services." },
          { code: "tn.administration.human_dev", name: "Human Development Indicators", description: "Education, health, literacy, sex ratio in Tamil Nadu." },
        ],
      },
    ],
  },

  // ── APTITUDE & MENTAL ABILITY (SSLC standard) ────────────────────────
  {
    code: "APTITUDE",
    name: "Aptitude and Mental Ability",
    weight: 1,
    topics: [
      { code: "apt.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, square and cube roots." },
      { code: "apt.percentage", name: "Percentage", description: "Percentage calculations and applications." },
      { code: "apt.hcf_lcm", name: "HCF and LCM", description: "Highest common factor, lowest common multiple — basic problems." },
      { code: "apt.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse and compound ratio, proportion." },
      { code: "apt.si_ci", name: "Simple and Compound Interest", description: "SI, CI and applied interest calculations." },
      { code: "apt.area_volume", name: "Area and Volume", description: "Mensuration of 2D and 3D figures." },
      { code: "apt.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns, group work." },
      { code: "apt.time_speed", name: "Time and Distance", description: "Trains, boats, average speed and relative speed." },
      { code: "apt.logical_reasoning", name: "Logical Reasoning", description: "Statement-conclusion, syllogism, cause-effect, assumption." },
      { code: "apt.puzzles", name: "Puzzles", description: "Seating arrangement, scheduling and grouping puzzles." },
      { code: "apt.dice", name: "Dice", description: "Dice problems — opposite faces, position, surface counting." },
      { code: "apt.visual_reasoning", name: "Visual Reasoning", description: "Mirror image, water image, paper folding/cutting, embedded figures." },
      { code: "apt.alphanumeric", name: "Alphanumeric Reasoning", description: "Coding-decoding, alphabet test, alphanumeric series." },
      { code: "apt.number_series", name: "Number Series", description: "Find next term, find missing/wrong term, pattern series." },
      { code: "apt.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
    ],
  },
];

export async function seedTnpscGroup1Syllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TN_TNPSC_GROUP1" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TN_TNPSC_GROUP1 exam not found.");
  }
  console.log(`Seeding TNPSC Group I syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tnpscGroup1Syllabus.length; sIdx++) {
    const s = tnpscGroup1Syllabus[sIdx];
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
  seedTnpscGroup1Syllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
