// TNPSC Group II/IIA Prelims — full syllabus tree.
// Single objective paper, 200 MCQs (300 marks).
// Covers GS (75 Q), Aptitude & Mental Ability (25 Q) and Tamil/English language (100 Q).
// Source: tnpsc.gov.in official syllabus PDF (CCSE-II Group-II/IIA).
//
// Run after seedExams: npx tsx seed/exams/tnpsc-group2-syllabus.ts

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

export const tnpscGroup2Syllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES (Degree Standard) ────────────────────────────────
  {
    code: "GS",
    name: "General Studies",
    weight: 1,
    topics: [
      {
        code: "gs.science",
        name: "General Science",
        description: "Scientific knowledge, scientific temper and applications.",
        subtopics: [
          { code: "gs.science.physics", name: "Physics", description: "Mechanics, electricity, magnetism, heat, light, sound — basic principles." },
          { code: "gs.science.chemistry", name: "Chemistry", description: "Elements and compounds, acids, bases, salts, fertilizers, pesticides." },
          { code: "gs.science.botany", name: "Botany", description: "Classification, plant physiology, agriculture-related botany." },
          { code: "gs.science.zoology", name: "Zoology", description: "Animal classification, evolution, genetics, human physiology." },
          { code: "gs.science.health", name: "Health and Nutrition", description: "Communicable and non-communicable diseases, nutrition, public health." },
          { code: "gs.science.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change, pollution." },
          { code: "gs.science.tech", name: "Science & Technology Advances", description: "IT, biotech, space, defence and contemporary scientific developments." },
        ],
      },
      {
        code: "gs.current_affairs",
        name: "Current Events",
        description: "National and international current affairs of the last 12-18 months.",
        subtopics: [
          { code: "gs.current_affairs.political", name: "Political Events", description: "Elections, schemes, government decisions and constitutional events." },
          { code: "gs.current_affairs.economic", name: "Economic Events", description: "Budget, RBI policy, indicators, trade and economic news." },
          { code: "gs.current_affairs.intl", name: "International Events", description: "Geopolitics, summits, treaties and India's foreign policy events." },
          { code: "gs.current_affairs.sports", name: "Sports", description: "International and national sporting events, awards, results." },
          { code: "gs.current_affairs.awards", name: "Awards and Honours", description: "Padma awards, Nobel, Bharat Ratna, Gallantry awards." },
          { code: "gs.current_affairs.books", name: "Books and Authors", description: "Recent prominent books and their authors." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography of India",
        description: "Indian geography — physical, social and economic aspects.",
        subtopics: [
          { code: "gs.geography.location", name: "Location and Physical Features", description: "Location, mountains, plateaus, plains, coastline and islands." },
          { code: "gs.geography.monsoon", name: "Monsoon, Rainfall and Climate", description: "Monsoon mechanism, climate types and regional variation." },
          { code: "gs.geography.water", name: "Water Resources and Rivers", description: "Major rivers, multipurpose projects, irrigation systems." },
          { code: "gs.geography.soils", name: "Soils, Minerals and Forests", description: "Soil types, mineral distribution, forest ecosystems." },
          { code: "gs.geography.population", name: "Population and Urbanization", description: "Census data, density, migration, urban-rural distribution." },
          { code: "gs.geography.transport", name: "Transport and Communication", description: "Road, rail, water, air transport networks and telecom." },
          { code: "gs.geography.disasters", name: "Natural Calamities and Disaster Management", description: "Floods, droughts, earthquakes, cyclones — NDMA framework." },
          { code: "gs.geography.environment", name: "Environmental Issues and Green Energy", description: "Pollution, climate change, renewable energy, sustainability." },
        ],
      },
      {
        code: "gs.history",
        name: "History and Culture of India",
        description: "Indian history from Indus Valley to post-independence.",
        subtopics: [
          { code: "gs.history.ivc", name: "Indus Valley Civilization", description: "Harappan culture — sites, town planning, society and decline." },
          { code: "gs.history.guptas", name: "Guptas and Post-Guptas", description: "Gupta age, golden age, art and post-Gupta regional kingdoms." },
          { code: "gs.history.delhi_sultanate", name: "Delhi Sultanate", description: "Slave, Khilji, Tughlaq, Sayyid, Lodi dynasties." },
          { code: "gs.history.mughals", name: "Mughals", description: "Babur to Aurangzeb, Mughal administration and culture." },
          { code: "gs.history.marathas", name: "Marathas", description: "Shivaji, Peshwas, Maratha Confederacy and decline." },
          { code: "gs.history.bhakti_sufi", name: "Bhakti and Sufi Movements", description: "Saints, philosophy and the social reform impact." },
          { code: "gs.history.unity", name: "Unity in Diversity", description: "Race, language, religion, custom — secularism and harmony." },
          { code: "gs.history.personalities", name: "Personalities and Symbols", description: "National leaders, national symbols, scientists, sportspersons." },
        ],
      },
      {
        code: "gs.freedom",
        name: "Indian National Movement",
        description: "Freedom struggle from 1857 to 1947.",
        subtopics: [
          { code: "gs.freedom.1857", name: "Revolt of 1857", description: "Causes, course and consequences of the First War of Independence." },
          { code: "gs.freedom.early", name: "Early Phase of Congress", description: "INC formation, moderates, extremists and Surat split." },
          { code: "gs.freedom.satyagraha", name: "Satyagraha and Mass Movements", description: "Non-cooperation, Civil Disobedience, Quit India movement." },
          { code: "gs.freedom.militant", name: "Militant and Revolutionary Activities", description: "Bhagat Singh, Subhas Bose, INA and revolutionary groups." },
          { code: "gs.freedom.partition", name: "Communalism and Partition", description: "Two-nation theory, partition and integration of states." },
          { code: "gs.freedom.leaders", name: "Major Leaders", description: "Gandhi, Nehru, Patel, Ambedkar, Bose, Tilak and contemporaries." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity",
        description: "Constitution and governance of India.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, salient features, sources, historical background." },
          { code: "gs.polity.union_state", name: "Union, State and Union Territory", description: "Federal structure, distribution of powers, UT administration." },
          { code: "gs.polity.fr_dpsp", name: "Fundamental Rights, Duties, DPSPs", description: "Articles 12-51A and their landmark interpretations." },
          { code: "gs.polity.executive", name: "Executive", description: "President, Governor, Council of Ministers — powers and functions." },
          { code: "gs.polity.legislature", name: "Legislature", description: "Parliament, State Legislature, law-making process." },
          { code: "gs.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, judicial review and PIL." },
          { code: "gs.polity.local", name: "Local Self Government", description: "Panchayati Raj and urban local bodies — 73rd & 74th Amendments." },
          { code: "gs.polity.elections", name: "Elections", description: "ECI, electoral system, anti-defection law, electoral reforms." },
          { code: "gs.polity.anti_corruption", name: "Lokpal and Lok Ayukta", description: "Anti-corruption institutions, RTI Act, CVC and ombudsman." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy and Development Administration in Tamil Nadu",
        description: "Indian economy structure and Tamil Nadu development administration.",
        subtopics: [
          { code: "gs.economy.nature", name: "Nature of Indian Economy", description: "Sectors, mixed economy, recent reforms and trends." },
          { code: "gs.economy.planning", name: "Five-Year Plans and NITI Aayog", description: "Planning history and NITI Aayog framework." },
          { code: "gs.economy.tax", name: "Taxation and Public Finance", description: "Direct/indirect taxes, GST, fiscal/monetary policy." },
          { code: "gs.economy.banking", name: "Banking and Financial Markets", description: "RBI, banks, SEBI, financial inclusion programmes." },
          { code: "gs.economy.agriculture", name: "Agriculture and Rural Development", description: "Green revolution, MSP, PDS, MNREGA and rural schemes." },
          { code: "gs.economy.industry", name: "Industry and Service Sector", description: "Industrial policy, MSMEs, IT/services growth, Make in India." },
          { code: "gs.economy.welfare", name: "Welfare and Social Sector", description: "Health, education, food security and social inclusion." },
          { code: "gs.economy.tn_dev_admin", name: "TN Development Administration", description: "TN economic indicators, schemes and e-Governance initiatives." },
          { code: "gs.economy.public_awareness", name: "Public Awareness and General Administration", description: "Citizen charters, RTI, e-Sevai and public service delivery." },
        ],
      },
    ],
  },

  // ── TAMIL NADU SPECIFIC ──────────────────────────────────────────────
  {
    code: "TN_SPECIFIC",
    name: "History, Culture, Heritage & Socio-Political Movements in Tamil Nadu",
    weight: 1.4,
    topics: [
      {
        code: "tn.history",
        name: "History of Tamil Society",
        description: "Tamil history from prehistoric to modern times.",
        subtopics: [
          { code: "tn.history.prehistoric", name: "Prehistoric Tamil Nadu", description: "Stone Age sites, megalithic cultures, Adichanallur, Keezhadi." },
          { code: "tn.history.sangam", name: "Sangam Age", description: "Cheras, Cholas, Pandyas — society, economy and trade." },
          { code: "tn.history.pallavas", name: "Pallavas of Kanchi", description: "Pallava administration, art, architecture and contributions." },
          { code: "tn.history.cholas", name: "Imperial Cholas", description: "Rajaraja I, Rajendra I — administration, navy and art." },
          { code: "tn.history.pandyas", name: "Later Pandyas and Vijayanagar", description: "Pandya revival, Vijayanagar rule and Nayak kingdoms." },
          { code: "tn.history.archaeology", name: "Archaeological Discoveries", description: "Major sites — Keezhadi, Adichanallur, Arikamedu and recent finds." },
        ],
      },
      {
        code: "tn.literature",
        name: "Tamil Literature",
        description: "Tamil literature from Sangam age to contemporary times.",
        subtopics: [
          { code: "tn.literature.sangam", name: "Sangam Literature", description: "Tolkappiyam, Ettuthogai, Pathupattu — themes and society." },
          { code: "tn.literature.thirukkural", name: "Thirukkural", description: "Significance of Thirukkural as secular literature." },
          { code: "tn.literature.epics", name: "Twin Epics and Bhakti Literature", description: "Silappathikaram, Manimekalai; Alvars and Nayanars." },
          { code: "tn.literature.medieval", name: "Medieval Tamil Literature", description: "Kamba Ramayanam, Periyapuranam and devotional works." },
          { code: "tn.literature.modern", name: "Modern Tamil Literature", description: "Bharathiyar, Bharathidasan, Pudhumaipithan and contemporaries." },
        ],
      },
      {
        code: "tn.freedom",
        name: "Role of Tamil Nadu in Freedom Struggle",
        description: "Tamil Nadu's contribution to the Indian freedom movement.",
        subtopics: [
          { code: "tn.freedom.early", name: "Early Resistance", description: "Polygar Wars, Veerapandiya Kattabomman, Vellore Mutiny 1806." },
          { code: "tn.freedom.gandhian", name: "Gandhian Phase in TN", description: "Salt Satyagraha at Vedaranyam, anti-Hindi agitation, Quit India." },
          { code: "tn.freedom.leaders", name: "Tamil Nadu Freedom Leaders", description: "Bharathi, V.O.C. Pillai, Subramania Siva, Thiruppur Kumaran, Rajaji." },
        ],
      },
      {
        code: "tn.movements",
        name: "Socio-Political Movements in Tamil Nadu",
        description: "Reform, rationalist and Dravidian movements.",
        subtopics: [
          { code: "tn.movements.justice", name: "Justice Party", description: "South Indian Liberal Federation — origin, ideology, achievements." },
          { code: "tn.movements.rationalism", name: "Rationalism", description: "Periyar's rationalist ideas and reform agenda." },
          { code: "tn.movements.self_respect", name: "Self-Respect Movement", description: "Periyar E.V.R. — social equality and anti-caste agenda." },
          { code: "tn.movements.dravidian", name: "Dravidian Movement", description: "DK, DMK, AIADMK — political evolution and ideology." },
          { code: "tn.movements.periyar_anna", name: "Periyar and Anna", description: "Contributions of Thanthai Periyar and Peraringar Anna." },
          { code: "tn.movements.reformers", name: "Other Social Reformers", description: "Vaikunda Swami, Iyothee Thass, Ramalinga Adigalar, Ayyankali." },
        ],
      },
      {
        code: "tn.culture",
        name: "Tamil Nadu Culture and Heritage",
        description: "Cultural heritage, art forms and traditions.",
        subtopics: [
          { code: "tn.culture.architecture", name: "Temple Architecture", description: "Dravidian temple style, Chola/Pallava/Nayak temples." },
          { code: "tn.culture.dance", name: "Dance Forms", description: "Bharatanatyam, Karagattam, Therukoothu, Oyilattam and folk arts." },
          { code: "tn.culture.music", name: "Carnatic Music", description: "Trinity, Tamil Isai movement, classical music heritage." },
          { code: "tn.culture.festivals", name: "Festivals and Customs", description: "Pongal, Tamil New Year, regional fairs and traditions." },
          { code: "tn.culture.welfare", name: "Welfare Initiatives in TN", description: "Mid-day meal, free schemes, Amma scheme series." },
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
      { code: "apt.simplification", name: "Simplification", description: "BODMAS, fractions, decimals and roots." },
      { code: "apt.percentage", name: "Percentage", description: "Percentage calculations and applications." },
      { code: "apt.hcf_lcm", name: "HCF and LCM", description: "Highest common factor, lowest common multiple problems." },
      { code: "apt.ratio_proportion", name: "Ratio and Proportion", description: "Ratio, proportion, partnership and mixtures." },
      { code: "apt.si_ci", name: "Simple and Compound Interest", description: "Interest calculations, EMIs, compounding." },
      { code: "apt.area_volume", name: "Area and Volume", description: "Mensuration of triangles, circles, cubes, cylinders, cones." },
      { code: "apt.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns." },
      { code: "apt.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, relative speed and average speed." },
      { code: "apt.logical_reasoning", name: "Logical Reasoning", description: "Statement-conclusion, syllogism, cause-effect." },
      { code: "apt.puzzles", name: "Puzzles", description: "Seating arrangement, scheduling and grouping puzzles." },
      { code: "apt.dice", name: "Dice", description: "Dice problems — opposite faces, surfaces, position." },
      { code: "apt.visual_reasoning", name: "Visual Reasoning", description: "Mirror image, water image, paper folding/cutting, embedded figures." },
      { code: "apt.alphanumeric", name: "Alphanumeric Reasoning", description: "Coding-decoding, alphabet test, alphanumeric series." },
      { code: "apt.number_series", name: "Number Series", description: "Find next/missing/wrong term in number series." },
      { code: "apt.di", name: "Data Interpretation", description: "Tables, bar/pie/line graphs and calculation-based questions." },
    ],
  },
];

export async function seedTnpscGroup2Syllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TN_TNPSC_GROUP2" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TN_TNPSC_GROUP2 exam not found.");
  }
  console.log(`Seeding TNPSC Group II syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tnpscGroup2Syllabus.length; sIdx++) {
    const s = tnpscGroup2Syllabus[sIdx];
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
  seedTnpscGroup2Syllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
