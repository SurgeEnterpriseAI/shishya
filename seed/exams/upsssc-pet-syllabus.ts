// UPSSSC PET — Preliminary Eligibility Test (common Prelim for UP Group C posts).
// 100 MCQs × 100 marks in 2 hours. ¼ negative marking.
// Source: upsssc.gov.in official notification, cross-verified with Careerpower / Testbook.
// Section weights (per official 2021 onwards pattern):
//   History 5, INM 5, Geography 5, Economy 5, Constitution 5, Science 5,
//   Math 5, Hindi 5, English 5, Reasoning 5, Current Affairs 10,
//   GK 10, Hindi passage 10, Graph 10, Table 10.
//
// Run after seedExams: npx tsx seed/exams/upsssc-pet-syllabus.ts

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

export const upssscPetSyllabus: SubjectSeed[] = [
  // ── INDIAN HISTORY (5 questions) ──────────────────────────────────────
  {
    code: "INDIAN_HISTORY",
    name: "Indian History",
    weight: 1,
    topics: [
      { code: "history.indus_valley", name: "Indus Valley Civilisation", description: "Harappa, Mohenjodaro, town planning, seals, decline." },
      { code: "history.vedic", name: "Vedic Civilisation", description: "Early and later Vedic society, four Vedas, Aryan settlement." },
      { code: "history.buddhism_jainism", name: "Buddhism & Jainism", description: "Gautama Buddha, Mahavira, Sangha, doctrines, councils." },
      { code: "history.mauryan", name: "Mauryan Empire", description: "Chandragupta, Ashoka, Kautilya's Arthashastra, edicts." },
      { code: "history.gupta", name: "Gupta Empire", description: "Samudragupta, Chandragupta II, golden age, science and literature." },
      { code: "history.harshavardhan", name: "Harshavardhana", description: "Pushyabhuti dynasty, Hiuen Tsang's account, Kannauj." },
      { code: "history.rajput", name: "Rajput Era", description: "Major Rajput clans, Prithviraj Chauhan, Battle of Tarain." },
      { code: "history.sultanate", name: "Delhi Sultanate", description: "Slave, Khilji, Tughlaq, Sayyid, Lodi dynasties; iqta system." },
      { code: "history.mughal", name: "Mughal Empire", description: "Babur to Aurangzeb, Mansabdari, Din-i-Ilahi, Mughal architecture." },
      { code: "history.maratha", name: "Maratha Empire", description: "Shivaji, Peshwas, Maratha confederacy, third battle of Panipat." },
      { code: "history.british_rule", name: "British Rule & 1857 Revolt", description: "EIC expansion, Plassey, Buxar, 1857 first war of independence." },
      { code: "history.british_impact", name: "Social & Economic Impact of British Rule", description: "Drain of wealth, deindustrialisation, land revenue systems." },
    ],
  },

  // ── INDIAN NATIONAL MOVEMENT (5 questions) ────────────────────────────
  {
    code: "INDIAN_NATIONAL_MOVEMENT",
    name: "Indian National Movement",
    weight: 1,
    topics: [
      { code: "inm.early_phase", name: "Early Phase of Freedom Movement", description: "Foundation of INC 1885, moderates vs extremists, partition of Bengal 1905." },
      { code: "inm.swadeshi_civil_disobedience", name: "Swadeshi & Civil Disobedience", description: "Swadeshi 1905, Non-Cooperation 1920, Civil Disobedience 1930, Dandi March." },
      { code: "inm.gandhi_leaders", name: "Mahatma Gandhi & Leaders", description: "Gandhi's satyagrahas (Champaran, Kheda, Bardoli), Tilak, Lala Lajpat Rai, Bipin Chandra Pal." },
      { code: "inm.revolutionary", name: "Revolutionary Movement", description: "Bhagat Singh, Chandrashekhar Azad, Ramprasad Bismil (Kakori), HSRA." },
      { code: "inm.govt_of_india_act", name: "Government of India Act 1935", description: "Federal structure, provincial autonomy, separate electorates." },
      { code: "inm.quit_india", name: "Quit India Movement", description: "August Kranti 1942, Do or Die, leadership absence, public uprising." },
      { code: "inm.azad_hind", name: "Azad Hind Fauj & Subhash Chandra Bose", description: "Forward Bloc, INA, Rani Jhansi Regiment, INA trials." },
    ],
  },

  // ── GEOGRAPHY (5 questions) ───────────────────────────────────────────
  {
    code: "GEOGRAPHY",
    name: "Geography",
    weight: 1,
    topics: [
      { code: "geo.rivers_water", name: "Rivers & Water Resources", description: "Major Indian river systems, dams, lakes; world rivers." },
      { code: "geo.mountains_glaciers", name: "Mountains & Glaciers", description: "Himalayas, peninsular ranges, world mountain ranges, major glaciers." },
      { code: "geo.deserts", name: "Deserts & Dry Areas", description: "Thar desert, world deserts, characteristics." },
      { code: "geo.forest_resources", name: "Forest Resources", description: "Forest types in India, biosphere reserves, social forestry." },
      { code: "geo.minerals", name: "Mineral Resources", description: "Coal, iron, bauxite, copper distribution; world mineral belts." },
      { code: "geo.political", name: "Political Geography (India & World)", description: "States, capitals, neighbouring countries, world political map." },
      { code: "geo.climate_weather", name: "Climate & Weather", description: "Monsoons, climatic regions, El Niño/La Niña, world climate types." },
      { code: "geo.time_zones", name: "Time Zones", description: "Standard meridians, IST, GMT, world time-zone calculation." },
      { code: "geo.demographics", name: "Demographics & Migration", description: "Census, growth rate, sex ratio, internal migration patterns." },
    ],
  },

  // ── INDIAN ECONOMY (5 questions) ──────────────────────────────────────
  {
    code: "INDIAN_ECONOMY",
    name: "Indian Economy",
    weight: 1,
    topics: [
      { code: "econ.planning", name: "Planning Commission & Five-Year Plans (1947-1991)", description: "Mahalanobis model, plan objectives & achievements." },
      { code: "econ.mixed_economy", name: "Mixed Economy Development", description: "Public/private sector roles, IPR 1956, PSU growth." },
      { code: "econ.green_revolution", name: "Green Revolution", description: "HYV seeds, Norman Borlaug, MS Swaminathan, regional impact." },
      { code: "econ.white_revolution", name: "White Revolution & Operation Flood", description: "Verghese Kurien, AMUL, NDDB, dairy growth." },
      { code: "econ.bank_nationalisation", name: "Banking Nationalisation", description: "1969 and 1980 nationalisations, regional rural banks." },
      { code: "econ.lpg_1991", name: "LPG Reforms 1991", description: "Liberalisation, privatisation, globalisation; Manmohan Singh budget." },
      { code: "econ.recent_reforms", name: "Post-2014 Economic Reforms", description: "GST, IBC, demonetisation, farm laws, labour codes, Make in India." },
    ],
  },

  // ── INDIAN CONSTITUTION & PUBLIC ADMINISTRATION (5 questions) ────────
  {
    code: "CONSTITUTION_ADMIN",
    name: "Indian Constitution & Public Administration",
    weight: 1,
    topics: [
      { code: "const.salient_features", name: "Salient Features of Constitution", description: "Sources, Preamble, schedules, parts, type of polity." },
      { code: "const.dpsp", name: "Directive Principles of State Policy", description: "Articles 36-51, classification, enforceability, implementation." },
      { code: "const.fr_fd", name: "Fundamental Rights & Duties", description: "Articles 12-35, Article 51A, 86th amendment, relevant SC cases." },
      { code: "const.parliamentary_system", name: "Parliamentary System", description: "Lok Sabha, Rajya Sabha, sessions, motions, committees, anti-defection." },
      { code: "const.federal_system", name: "Federal System & Centre-State Relations", description: "Lists (Union/State/Concurrent), legislative/administrative/financial relations." },
      { code: "const.judiciary", name: "Judicial Framework", description: "Supreme Court, High Courts, judicial review, basic structure doctrine." },
      { code: "const.district_admin", name: "District Administration", description: "DM/Collector role, divisional commissioner, revenue administration." },
      { code: "const.local_bodies", name: "Local Bodies & Panchayati Raj", description: "73rd & 74th amendments, gram sabha, ULB structures." },
    ],
  },

  // ── GENERAL SCIENCE (5 questions) ─────────────────────────────────────
  {
    code: "GENERAL_SCIENCE",
    name: "General Science",
    weight: 1,
    topics: [
      { code: "sci.physics", name: "Basic Physics", description: "Motion, force, gravitation, work-energy, heat, light, electricity, magnetism." },
      { code: "sci.chemistry", name: "Basic Chemistry", description: "Atomic structure, chemical bonding, acids/bases, common compounds." },
      { code: "sci.biology", name: "Basic Biology", description: "Cell, plant/animal kingdoms, human body systems, common diseases." },
    ],
  },

  // ── ELEMENTARY ARITHMETIC (5 questions) ───────────────────────────────
  {
    code: "ELEMENTARY_MATH",
    name: "Elementary Arithmetic",
    weight: 1,
    topics: [
      { code: "math.whole_fractions", name: "Whole Numbers, Fractions & Decimals", description: "Operations, conversion, ordering, place value." },
      { code: "math.percentage", name: "Percentage", description: "Percentage conversion, percent change, applied problems." },
      { code: "math.equations", name: "Simple Arithmetic Equations", description: "Single-variable linear equations, word problems." },
      { code: "math.squares_roots", name: "Square & Square Roots", description: "Perfect squares, square root by long division and prime factorisation." },
      { code: "math.exponents", name: "Exponents & Powers", description: "Laws of exponents, scientific notation." },
      { code: "math.average", name: "Average", description: "Simple and weighted average, average of consecutive numbers." },
    ],
  },

  // ── GENERAL HINDI (5 questions) ───────────────────────────────────────
  {
    code: "GENERAL_HINDI",
    name: "General Hindi (सामान्य हिन्दी)",
    weight: 1,
    topics: [
      { code: "hindi.sandhi", name: "संधि", description: "स्वर, व्यंजन, विसर्ग संधि के नियम।" },
      { code: "hindi.vilom", name: "विलोम शब्द", description: "विपरीतार्थक शब्दों की पहचान।" },
      { code: "hindi.paryayvachi", name: "पर्यायवाची शब्द", description: "समानार्थक शब्दों की पहचान।" },
      { code: "hindi.ling", name: "लिंग", description: "स्त्रीलिंग व पुल्लिंग नियम।" },
      { code: "hindi.samshrut", name: "समश्रुत भिन्नार्थक शब्द", description: "उच्चारण समान किन्तु अर्थ भिन्न शब्द।" },
      { code: "hindi.muhavare", name: "मुहावरे व लोकोक्तियाँ", description: "प्रचलित मुहावरों और लोकोक्तियों के अर्थ।" },
      { code: "hindi.ashuddhi", name: "सामान्य अशुद्धियाँ", description: "वर्तनी, वाक्य, व्याकरण की अशुद्धियाँ।" },
      { code: "hindi.lekhak_rachana", name: "लेखक और रचनाएँ", description: "प्रसिद्ध हिंदी लेखक एवं उनकी रचनाएँ।" },
    ],
  },

  // ── GENERAL ENGLISH (5 questions) ─────────────────────────────────────
  {
    code: "GENERAL_ENGLISH",
    name: "General English",
    weight: 1,
    topics: [
      { code: "eng.grammar", name: "English Grammar Fundamentals", description: "Tenses, articles, prepositions, voice, narration, agreement." },
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Short passages with vocabulary and inference questions." },
    ],
  },

  // ── LOGIC & REASONING (5 questions) ───────────────────────────────────
  {
    code: "REASONING",
    name: "Logic & Reasoning",
    weight: 1,
    topics: [
      { code: "reasoning.order_ranking", name: "Order & Ranking", description: "Linear arrangement, ranks from top/bottom." },
      { code: "reasoning.blood_relations", name: "Blood Relations", description: "Family tree, generation problems, pointing-style questions." },
      { code: "reasoning.calendar_clock", name: "Calendar & Clock", description: "Day of week, odd days, angle between hands, clock-mirror." },
      { code: "reasoning.cause_effect", name: "Cause & Effect", description: "Identify cause-effect relation between paired statements." },
      { code: "reasoning.coding_decoding", name: "Coding-Decoding", description: "Letter-letter, letter-number, conditional coding." },
      { code: "reasoning.conclusive", name: "Conclusive Reasoning", description: "Statement-conclusion, syllogism, assumption-based questions." },
    ],
  },

  // ── CURRENT AFFAIRS (10 questions) ────────────────────────────────────
  {
    code: "CURRENT_AFFAIRS",
    name: "Current Affairs",
    weight: 2,
    topics: [
      { code: "ca.national", name: "National Current Affairs", description: "Government schemes, appointments, policies, awards — last 12 months." },
      { code: "ca.international", name: "International Current Affairs", description: "Summits, treaties, geopolitical events, world bodies — last 12 months." },
    ],
  },

  // ── GENERAL AWARENESS (10 questions) ──────────────────────────────────
  {
    code: "GENERAL_AWARENESS",
    name: "General Awareness",
    weight: 2,
    topics: [
      { code: "ga.neighbours", name: "India's Neighbouring Countries", description: "Nepal, Pakistan, China, Bangladesh, Myanmar, Bhutan, Sri Lanka — basic facts." },
      { code: "ga.countries_capitals", name: "Countries, Capitals & Currencies", description: "Major world countries, capitals, currencies." },
      { code: "ga.states_uts", name: "Indian States & UTs", description: "28 states, 8 UTs, capitals, formation dates, languages." },
      { code: "ga.parliament", name: "Indian Parliament Structure", description: "Lok Sabha, Rajya Sabha composition, terms, elections." },
      { code: "ga.days", name: "National & International Observance Days", description: "Important days throughout the year." },
      { code: "ga.world_orgs", name: "World Organisations & HQs", description: "UN, WHO, IMF, World Bank, WTO, ASEAN, SAARC headquarters." },
      { code: "ga.tourism", name: "Indian Tourism Destinations", description: "UNESCO sites, hill stations, beaches, religious centres." },
      { code: "ga.art_culture", name: "Indian Art & Culture", description: "Classical dances, music gharanas, paintings, handicrafts, festivals." },
      { code: "ga.sports", name: "Indian & International Sports", description: "Olympics, Asian Games, cricket, sports awards (Khel Ratna, Arjuna)." },
      { code: "ga.research_institutes", name: "Indian Research Institutes", description: "ISRO, DRDO, CSIR, ICAR, IITs, AIIMS — locations and roles." },
      { code: "ga.books_authors", name: "Books & Authors", description: "Recent and classic Indian and international authors." },
      { code: "ga.awards", name: "Awards & Honours", description: "Bharat Ratna, Padma awards, Nobel, Booker, Jnanpith." },
      { code: "ga.environment", name: "Climate Change & Environment Topics", description: "Climate summits, environmental days, conservation projects." },
    ],
  },

  // ── HINDI UNREAD PASSAGE ANALYSIS (10 questions) ──────────────────────
  {
    code: "HINDI_PASSAGE",
    name: "Hindi Unread Passage Analysis (हिन्दी अपठित गद्यांश)",
    weight: 2,
    topics: [
      { code: "hpa.passage1", name: "अपठित गद्यांश 1 (5 प्रश्न)", description: "गद्यांश पढ़कर मुख्य विचार, शब्दार्थ, अनुमान आधारित प्रश्न।" },
      { code: "hpa.passage2", name: "अपठित गद्यांश 2 (5 प्रश्न)", description: "दूसरे गद्यांश पर आधारित बोधन व विश्लेषण।" },
    ],
  },

  // ── GRAPH INTERPRETATION (10 questions) ───────────────────────────────
  {
    code: "GRAPH_INTERPRETATION",
    name: "Graph Interpretation",
    weight: 2,
    topics: [
      { code: "graph.bar_line", name: "Bar & Line Graphs", description: "Reading bar/line charts; calculation of percentages, ratios, growth." },
      { code: "graph.pie_charts", name: "Pie Charts & Combined Graphs", description: "Pie charts and mixed/combination data charts — interpretation questions." },
    ],
  },

  // ── TABLE INTERPRETATION (10 questions) ───────────────────────────────
  {
    code: "TABLE_INTERPRETATION",
    name: "Table Interpretation & Analysis",
    weight: 2,
    topics: [
      { code: "table.simple", name: "Simple Tables (5 questions)", description: "Single-table data extraction and basic computation." },
      { code: "table.comparative", name: "Comparative Tables (5 questions)", description: "Multi-row/column comparative analysis questions." },
    ],
  },

  // ── UTTAR PRADESH SPECIFIC GK (overlay) ───────────────────────────────
  {
    code: "UP_SPECIFIC",
    name: "Uttar Pradesh — Special GK",
    weight: 1,
    topics: [
      { code: "up.history", name: "UP History", description: "Awadh nawabs, Mughal heritage in UP, 1857 centres (Meerut, Lucknow, Kanpur, Jhansi)." },
      { code: "up.geography", name: "UP Geography", description: "Ganga plain, Bundelkhand, Vindhyan; rivers Ganga, Yamuna, Ghaghara, Gomti, Betwa." },
      { code: "up.economy", name: "UP Economy & Industries", description: "Sugarcane belt, leather (Kanpur), brassware (Moradabad), glass (Firozabad), ODOP." },
      { code: "up.administration", name: "UP Administration", description: "Governor, CM, Vidhan Sabha & Vidhan Parishad, divisions, districts." },
      { code: "up.schemes", name: "UP-specific Schemes", description: "Mukhyamantri Awas Yojana, Kanya Sumangala, Yuva Swarozgar, ODOP." },
      { code: "up.culture", name: "UP Culture & Tourism", description: "Lucknow Kathak, thumri, Taj Mahal, Varanasi, Ayodhya, Sarnath, Kushinagar." },
      { code: "up.personalities", name: "UP Famous Personalities", description: "Tulsidas, Kabir, Premchand, Mahadevi Verma, Atal Bihari Vajpayee, Indira Gandhi." },
    ],
  },
];

export async function seedUpssscPetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UP_UPSSSC_PET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UP_UPSSSC_PET exam not found.");
  }
  console.log(`Seeding UPSSSC PET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < upssscPetSyllabus.length; sIdx++) {
    const s = upssscPetSyllabus[sIdx];
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
  seedUpssscPetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
