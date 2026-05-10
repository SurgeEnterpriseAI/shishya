// KPSC Group C Recruitment — full syllabus tree.
// Conducted by Karnataka Public Service Commission for Group C non-gazetted /
// clerical / assistant posts (FDA, SDA and equivalent).
// Two papers: Paper-I General Knowledge (100 marks, 100 Qs, 90 min) +
// Paper-II General Kannada / General English / Computer Knowledge (100 marks, 100 Qs, 120 min).
// Total 200 MCQs in 3.5 hrs. 0.25 negative mark per wrong answer.
// Source: kpsc.kar.nic.in official syllabus PDFs (FDA/SDA scheme).
//
// Run after seedExams: npx tsx seed/exams/kpsc-group-c-syllabus.ts

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

export const kpscGroupCSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES (Paper I) ─────────────────────────────────────────
  {
    code: "GS",
    name: "General Studies / General Knowledge",
    weight: 1,
    topics: [
      {
        code: "gs.current_affairs",
        name: "Current Events",
        description: "Current events of state, national and international importance.",
        subtopics: [
          { code: "gs.current_affairs.state", name: "Karnataka Current Affairs", description: "Recent developments, schemes and events in Karnataka." },
          { code: "gs.current_affairs.national", name: "National Current Affairs", description: "Indian political, economic and social events of national importance." },
          { code: "gs.current_affairs.intl", name: "International Affairs", description: "Major international events, summits and bilateral relations." },
          { code: "gs.current_affairs.sports", name: "Sports", description: "International and national sports events, awards and tournaments." },
          { code: "gs.current_affairs.awards", name: "Awards and Honours", description: "Civilian, gallantry, literary and international awards." },
          { code: "gs.current_affairs.books", name: "Books and Authors", description: "Notable recent books and their authors." },
        ],
      },
      {
        code: "gs.history",
        name: "Modern History of India and Indian Culture",
        description: "Outline of modern Indian history, freedom movement and culture.",
        subtopics: [
          { code: "gs.history.advent", name: "Advent of Europeans", description: "Portuguese, Dutch, French and English in India; Carnatic wars." },
          { code: "gs.history.british", name: "British Rule and Reforms", description: "Expansion of British power, administrative and social reforms." },
          { code: "gs.history.1857", name: "1857 Revolt and Aftermath", description: "Causes, course and consequences of the Revolt of 1857." },
          { code: "gs.history.congress", name: "Indian National Congress", description: "Foundation of INC, moderate phase, Surat split." },
          { code: "gs.history.gandhi", name: "Gandhian Era", description: "Non-cooperation, Civil Disobedience and Quit India movements." },
          { code: "gs.history.partition", name: "Partition and Independence", description: "Two-nation theory, partition, integration of states." },
          { code: "gs.history.culture", name: "Indian Culture and Heritage", description: "Art, architecture, music, dance, literature and festivals." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity",
        description: "Constitution and governance with special reference to Karnataka.",
        subtopics: [
          { code: "gs.polity.constitution", name: "Constitution of India", description: "Preamble, salient features and historical evolution." },
          { code: "gs.polity.fr_dpsp", name: "Fundamental Rights, Duties and DPSPs", description: "Articles 12-51A — rights, duties, directive principles." },
          { code: "gs.polity.union", name: "Union Government", description: "President, Prime Minister, Council of Ministers and Parliament." },
          { code: "gs.polity.state", name: "State Government — Karnataka", description: "Governor, Chief Minister, State Legislature and High Court of Karnataka." },
          { code: "gs.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, judicial review and PIL." },
          { code: "gs.polity.local", name: "Local Self Government", description: "Panchayati Raj, urban local bodies, 73rd & 74th Amendments." },
          { code: "gs.polity.elections", name: "Elections and Statutory Bodies", description: "ECI, electoral reforms, anti-defection law, NHRC, CAG." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy",
        description: "Indian economy with reference to Karnataka economy.",
        subtopics: [
          { code: "gs.economy.structure", name: "Structure of Indian Economy", description: "Sectoral composition, mixed economy, recent trends." },
          { code: "gs.economy.planning", name: "Planning and NITI Aayog", description: "Five-year plans, flagship schemes." },
          { code: "gs.economy.banking", name: "Banking and Finance", description: "RBI, banking system, financial inclusion." },
          { code: "gs.economy.budget", name: "Budget and Taxation", description: "Union budget, GST, fiscal and monetary policy." },
          { code: "gs.economy.karnataka", name: "Karnataka Economy", description: "GSDP, sectoral composition, IT-BT, agriculture and industry in Karnataka." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography of India and Karnataka",
        description: "Physical, social and economic geography.",
        subtopics: [
          { code: "gs.geography.physical_india", name: "Physical Features of India", description: "Mountains, plains, plateaus, coasts and rivers." },
          { code: "gs.geography.climate_india", name: "Climate, Monsoon and Rainfall", description: "Indian monsoon system and regional variations." },
          { code: "gs.geography.resources_india", name: "Natural Resources of India", description: "Minerals, forests, energy and conservation." },
          { code: "gs.geography.karnataka_physical", name: "Physical Features of Karnataka", description: "Western Ghats, Deccan plateau, coastal Karnataka, river systems." },
          { code: "gs.geography.karnataka_economic", name: "Economic Geography of Karnataka", description: "Agriculture, mining, industries, tourism and transport in Karnataka." },
        ],
      },
      {
        code: "gs.science",
        name: "General Science",
        description: "Basic science and recent science & technology developments.",
        subtopics: [
          { code: "gs.science.physics", name: "Physics", description: "Mechanics, force, motion, heat, light, sound, electricity, magnetism." },
          { code: "gs.science.chemistry", name: "Chemistry", description: "Elements, compounds, acids, bases, fertilizers, pesticides." },
          { code: "gs.science.biology", name: "Biology", description: "Plants, animals, human body, nutrition and diseases." },
          { code: "gs.science.tech", name: "Science and Technology", description: "IT, space, defence, biotech and nano-technology in India." },
          { code: "gs.science.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change and pollution." },
        ],
      },
    ],
  },

  // ── KARNATAKA SPECIFIC ───────────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Karnataka — History, Culture and Administration",
    weight: 1.4,
    topics: [
      {
        code: "ka.history",
        name: "History of Karnataka",
        description: "Ancient to modern history of Karnataka.",
        subtopics: [
          { code: "ka.history.kadamba", name: "Kadambas of Banavasi", description: "Origin and rule of Kadambas, the first Kannada dynasty." },
          { code: "ka.history.gangas", name: "Western Gangas of Talakad", description: "Polity, society and Jainism under the Gangas." },
          { code: "ka.history.chalukyas", name: "Chalukyas of Badami and Kalyani", description: "Pulakeshin II, Vikramaditya VI, art and architecture." },
          { code: "ka.history.rashtrakutas", name: "Rashtrakutas of Manyakheta", description: "Amoghavarsha, Ellora caves, literary patronage." },
          { code: "ka.history.hoysalas", name: "Hoysalas of Dwarasamudra", description: "Belur, Halebidu, Somanathapura — Hoysala temple architecture." },
          { code: "ka.history.vijayanagara", name: "Vijayanagara Empire", description: "Hampi, Krishnadevaraya, administration and economy." },
          { code: "ka.history.bahmani", name: "Bahmani Sultanate and Bijapur", description: "Bidar, Bijapur Adil Shahis, Indo-Islamic architecture." },
          { code: "ka.history.mysore", name: "Mysore Wodeyars and Tipu Sultan", description: "Wodeyar dynasty, Hyder Ali, Tipu Sultan and Anglo-Mysore wars." },
        ],
      },
      {
        code: "ka.unification",
        name: "Karnataka Unification Movement",
        description: "Movement for the unification of Kannada-speaking regions.",
        subtopics: [
          { code: "ka.unification.early", name: "Early Movements", description: "Karnataka Vidyavardhaka Sangha and early unification efforts." },
          { code: "ka.unification.leaders", name: "Unification Leaders", description: "Aluru Venkata Rao, Huilgol Narayana Rao, S. Nijalingappa." },
          { code: "ka.unification.formation", name: "Formation of Mysore State (1956)", description: "States Reorganisation Act 1956, formation of unified state." },
          { code: "ka.unification.rename", name: "Renaming as Karnataka (1973)", description: "Renaming of Mysore State to Karnataka under D. Devaraj Urs." },
        ],
      },
      {
        code: "ka.culture",
        name: "Karnataka Art, Culture and Literature",
        description: "Cultural heritage, literature and arts of Karnataka.",
        subtopics: [
          { code: "ka.culture.kannada_lit", name: "Kannada Literature", description: "Pampa, Ranna, Kuvempu, Bendre and Jnanpith awardees." },
          { code: "ka.culture.bhakti", name: "Vachana and Dasa Sahitya", description: "Basavanna, Akka Mahadevi, Purandara Dasa, Kanaka Dasa." },
          { code: "ka.culture.dance", name: "Dance and Music of Karnataka", description: "Yakshagana, Dollu Kunitha, Carnatic music tradition." },
          { code: "ka.culture.architecture", name: "Architecture", description: "Hoysala, Chalukya and Vijayanagara architectural styles." },
          { code: "ka.culture.festivals", name: "Festivals and Customs", description: "Mysore Dasara, Kambala, Hampi Utsav and other festivals." },
        ],
      },
      {
        code: "ka.administration",
        name: "Karnataka Administration and Welfare",
        description: "Administrative structure and welfare schemes of Karnataka.",
        subtopics: [
          { code: "ka.administration.structure", name: "Administrative Structure", description: "Divisions, districts, taluks of Karnataka." },
          { code: "ka.administration.welfare", name: "Welfare Schemes", description: "Anna Bhagya, Ksheera Bhagya, Vidyasiri and other Bhagya schemes." },
          { code: "ka.administration.industrial", name: "Industrial Policy", description: "Karnataka Industrial Policy, Bengaluru as IT hub, KIADB." },
          { code: "ka.administration.e_gov", name: "e-Governance", description: "Bhoomi, Sakala, Seva Sindhu — Karnataka digital initiatives." },
        ],
      },
    ],
  },

  // ── ARITHMETIC ─────────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Quantitative Aptitude",
    weight: 1,
    topics: [
      { code: "math.simplification", name: "Number System and Simplification", description: "BODMAS, fractions, decimals, square and cube roots." },
      { code: "math.percentage", name: "Percentage", description: "Percentage calculations and applications." },
      { code: "math.profit_loss", name: "Profit and Loss", description: "Cost price, selling price and discount." },
      { code: "math.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse and compound ratio, proportion and partnership." },
      { code: "math.average", name: "Average", description: "Average of numbers, weighted average and applications." },
      { code: "math.si_ci", name: "Simple and Compound Interest", description: "SI and CI calculations." },
      { code: "math.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns." },
      { code: "math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average and relative speed." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume." },
      { code: "math.algebra", name: "Elementary Algebra", description: "Linear and quadratic equations." },
    ],
  },

  // ── REASONING ──────────────────────────────────────────────────────────
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
      { code: "reasoning.calendar_clock", name: "Calendar and Clock", description: "Day calculation, leap years, angle between hands." },
      { code: "reasoning.visual", name: "Non-Verbal Reasoning", description: "Mirror image, water image, paper folding and embedded figures." },
      { code: "reasoning.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
    ],
  },

  // ── LANGUAGE & COMPUTER (Paper II) ────────────────────────────────────
  {
    code: "LANG",
    name: "General Kannada, General English and Computer Knowledge",
    weight: 1,
    topics: [
      {
        code: "lang.kannada",
        name: "General Kannada",
        description: "Kannada grammar, comprehension and vocabulary.",
        subtopics: [
          { code: "lang.kannada.grammar", name: "Kannada Vyakarana", description: "Sandhi, samasa, vibhakti, kaala, vachana and lingatva." },
          { code: "lang.kannada.vocab", name: "Vocabulary and Synonyms", description: "Paryaya pada, virodha pada, naanaartha and idioms." },
          { code: "lang.kannada.comprehension", name: "Reading Comprehension", description: "Unseen passage, summary writing, paragraph questions." },
          { code: "lang.kannada.translation", name: "Translation", description: "Translation from English to Kannada and Kannada to English." },
          { code: "lang.kannada.literature", name: "Kannada Literature Basics", description: "Notable poets, writers and major works of Kannada literature." },
        ],
      },
      {
        code: "lang.english",
        name: "General English",
        description: "English grammar, vocabulary and comprehension.",
        subtopics: [
          { code: "lang.english.grammar", name: "Grammar", description: "Tenses, articles, prepositions, voice, narration." },
          { code: "lang.english.vocab", name: "Vocabulary", description: "Synonyms, antonyms, one-word substitution, idioms and phrases." },
          { code: "lang.english.comprehension", name: "Reading Comprehension", description: "Unseen passage with comprehension and inference questions." },
          { code: "lang.english.error", name: "Error Detection and Sentence Improvement", description: "Spotting errors, sentence correction and rearrangement." },
          { code: "lang.english.cloze", name: "Cloze Test and Para-Jumbles", description: "Fill in the blanks and rearrangement of sentences." },
        ],
      },
      {
        code: "lang.computer",
        name: "Computer Knowledge",
        description: "Basics of computers, internet and applications.",
        subtopics: [
          { code: "lang.computer.fundamentals", name: "Computer Fundamentals", description: "Generations, hardware, software, input/output devices." },
          { code: "lang.computer.os", name: "Operating Systems", description: "Windows, Linux — basics, file management, shortcuts." },
          { code: "lang.computer.ms_office", name: "MS Office", description: "MS Word, Excel, PowerPoint — basic operations." },
          { code: "lang.computer.internet", name: "Internet and Email", description: "Browsers, search engines, email basics, e-governance." },
          { code: "lang.computer.security", name: "Cyber Security and Awareness", description: "Viruses, antivirus, password hygiene, IT Act basics." },
        ],
      },
    ],
  },
];

export async function seedKpscGroupCSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "KA_KPSC_GROUP_C" } });
  if (!exam) {
    throw new Error("Run seedExams() first — KA_KPSC_GROUP_C exam not found.");
  }
  console.log(`Seeding KPSC Group C syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < kpscGroupCSyllabus.length; sIdx++) {
    const s = kpscGroupCSyllabus[sIdx];
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
  seedKpscGroupCSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
