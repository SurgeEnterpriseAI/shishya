// UPPSC RO/ARO (Review Officer / Assistant Review Officer) — full syllabus tree.
// Conducted by Uttar Pradesh Public Service Commission (UPPSC), Prayagraj.
// Prelims: 200 MCQs in 3 hours — Paper 1 General Studies (140 Qs / 140 marks, 2 hrs)
// + Paper 2 General Hindi (60 Qs / 60 marks, 1 hr). Negative marking 1/3.
// Source: official UPPSC RO/ARO notification & syllabus (uppsc.up.nic.in),
// cross-checked with UPPSC RO/ARO advertisement.
//
// Run after seedExams: npx tsx seed/exams/uppsc-ro-aro-syllabus.ts

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

export const uppscRoAroSyllabus: SubjectSeed[] = [
  // ── GK / GENERAL STUDIES (Paper 1) ───────────────────────────────────
  {
    code: "GK",
    name: "General Studies (Paper 1)",
    weight: 1,
    topics: [
      {
        code: "gk.history",
        name: "History of India and Indian National Movement",
        description: "Indian history with focus on the freedom struggle.",
        subtopics: [
          { code: "gk.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan and Gupta empires." },
          { code: "gk.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, bhakti and sufi movements." },
          { code: "gk.history.modern", name: "Modern India", description: "British conquest, colonial rule and freedom struggle." },
          { code: "gk.history.freedom", name: "Indian National Movement", description: "1857 revolt, INC, Gandhian phase, Quit India and partition." },
          { code: "gk.history.up", name: "History of Uttar Pradesh", description: "Awadh, Maratha, British rule in UP and freedom struggle in UP." },
        ],
      },
      {
        code: "gk.geography",
        name: "Indian and World Geography",
        description: "Physical, social and economic geography.",
        subtopics: [
          { code: "gk.geography.physical_india", name: "Physical Geography of India", description: "Mountains, plains, plateaus, rivers and climate." },
          { code: "gk.geography.economic_india", name: "Economic Geography of India", description: "Agriculture, industry, minerals, transport and trade." },
          { code: "gk.geography.up", name: "Geography of Uttar Pradesh", description: "Rivers (Ganga, Yamuna, Saryu), agro-climatic zones and resources of UP." },
          { code: "gk.geography.world", name: "World Geography", description: "Continents, oceans, major countries and physical features." },
          { code: "gk.geography.environment", name: "Environment and Ecology", description: "Climate change, biodiversity, pollution and conservation." },
        ],
      },
      {
        code: "gk.polity",
        name: "Indian Polity and Constitution",
        description: "Indian constitution and governance.",
        subtopics: [
          { code: "gk.polity.constitution", name: "Indian Constitution", description: "Preamble, salient features and historical evolution." },
          { code: "gk.polity.fr_dpsp", name: "Fundamental Rights, Duties and DPSPs", description: "Articles 12-51A and their significance." },
          { code: "gk.polity.union", name: "Union Government", description: "President, Prime Minister, Council of Ministers, Parliament." },
          { code: "gk.polity.state", name: "State Government", description: "Governor, Chief Minister, State Legislature and High Courts." },
          { code: "gk.polity.local", name: "Panchayati Raj and Urban Bodies", description: "73rd & 74th Amendments and their implementation." },
          { code: "gk.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, judicial review and PIL." },
        ],
      },
      {
        code: "gk.economy",
        name: "Indian Economy",
        description: "Economy, planning and current schemes.",
        subtopics: [
          { code: "gk.economy.basics", name: "Basics of Indian Economy", description: "Sectoral composition, mixed economy and recent trends." },
          { code: "gk.economy.planning", name: "Planning and NITI Aayog", description: "Planning Commission, NITI Aayog and plan objectives." },
          { code: "gk.economy.banking", name: "Banking and Finance", description: "RBI, commercial banks, monetary policy and financial inclusion." },
          { code: "gk.economy.budget", name: "Budget and Taxation", description: "Union Budget, GST, fiscal deficit and tax structure." },
          { code: "gk.economy.up", name: "Economy of Uttar Pradesh", description: "UP's economy, agriculture, industry and welfare schemes." },
        ],
      },
      {
        code: "gk.science",
        name: "General Science",
        description: "Physics, chemistry, biology and applied science.",
        subtopics: [
          { code: "gk.science.physics", name: "Physics", description: "Mechanics, heat, light, sound, electricity and magnetism." },
          { code: "gk.science.chemistry", name: "Chemistry", description: "Elements, compounds, acids, bases, salts and chemicals in daily life." },
          { code: "gk.science.biology", name: "Biology", description: "Plants, animals, classification, human body and diseases." },
          { code: "gk.science.health", name: "Human Health and Diseases", description: "Communicable and non-communicable diseases; nutrition." },
          { code: "gk.science.tech", name: "Science and Technology", description: "Inventions, IT, biotechnology, space and defence technology." },
        ],
      },
      {
        code: "gk.current",
        name: "Current Affairs",
        description: "National and international current events.",
        subtopics: [
          { code: "gk.current.national", name: "National Current Events", description: "Major national events, schemes and policies of the last 12-18 months." },
          { code: "gk.current.international", name: "International Current Events", description: "Major international events, summits and treaties." },
          { code: "gk.current.up", name: "UP Current Events", description: "Recent state-level developments, schemes and personalities of UP." },
          { code: "gk.current.sports", name: "Sports", description: "Major sports events, awards and tournaments." },
          { code: "gk.current.awards", name: "Awards and Honours", description: "National and international awards." },
          { code: "gk.current.books", name: "Books and Authors", description: "Recent notable books and their authors." },
        ],
      },
      {
        code: "gk.up_specific",
        name: "Uttar Pradesh — Specific",
        description: "UP-specific facts, schemes and culture.",
        subtopics: [
          { code: "gk.up_specific.welfare", name: "Welfare Schemes of UP", description: "State government schemes, programmes and their beneficiaries." },
          { code: "gk.up_specific.culture", name: "Art and Culture of UP", description: "Kathak dance, Awadhi cuisine, Banaras silk, festivals and heritage." },
          { code: "gk.up_specific.industry", name: "Industries of UP", description: "Sugar, textile, leather, electronics and food-processing industries." },
          { code: "gk.up_specific.tourism", name: "Tourism of UP", description: "Taj Mahal, Varanasi, Ayodhya, Mathura and other tourist places." },
        ],
      },
    ],
  },

  // ── LANGUAGE — General Hindi (Paper 2) ────────────────────────────────
  {
    code: "LANG",
    name: "General Hindi (Paper 2)",
    weight: 1,
    topics: [
      { code: "lang.synonyms", name: "Paryayvachi Shabd", description: "Synonyms in Hindi — common words and their alternatives." },
      { code: "lang.antonyms", name: "Vilom Shabd", description: "Antonyms in Hindi — opposites of common words." },
      { code: "lang.one_word", name: "Anek Shabdon ke liye Ek Shabd", description: "One-word substitutions in Hindi." },
      { code: "lang.spelling", name: "Shabd Shudhi (Spelling)", description: "Identifying correctly spelled Hindi words." },
      { code: "lang.sentence_correction", name: "Vakya Shudhi (Sentence Correction)", description: "Correcting grammatically wrong Hindi sentences." },
      { code: "lang.grammar", name: "Hindi Vyakaran", description: "Sangya, sarvanaam, visheshan, kriya, kriya-visheshan, samuchchaya, vismayadi." },
      { code: "lang.tense", name: "Kaal", description: "Verb tense — vartman, bhutkaal, bhavishyat." },
      { code: "lang.gender_number", name: "Ling aur Vachan", description: "Gender and number changes in Hindi nouns and verbs." },
      { code: "lang.case", name: "Karak", description: "Eight karaks and their forms." },
      { code: "lang.sandhi", name: "Sandhi", description: "Swar sandhi, vyanjan sandhi and visarg sandhi." },
      { code: "lang.samas", name: "Samas", description: "Six types of samas in Hindi." },
      { code: "lang.upsarg_pratyay", name: "Upsarg aur Pratyay", description: "Prefixes and suffixes in Hindi." },
      { code: "lang.idioms", name: "Muhavare aur Lokoktiyan", description: "Idioms and proverbs and their meanings." },
      { code: "lang.alankar", name: "Alankar", description: "Figures of speech in Hindi." },
      { code: "lang.tatsam_tadbhav", name: "Tatsam aur Tadbhav", description: "Sanskrit-derived (tatsam) and modified (tadbhav) words." },
      { code: "lang.literature", name: "Hindi Literature — Major Writers", description: "Tulsidas, Surdas, Kabir, Premchand, Mahadevi Verma, Jaishankar Prasad." },
      { code: "lang.eng_to_hindi", name: "English to Hindi Translation", description: "Translation of common English words into Hindi (vocabulary)." },
      { code: "lang.hindi_to_eng", name: "Hindi to English Translation", description: "Translation of common Hindi words into English." },
    ],
  },

  // ── DRAFTING — Mains Paper 2 (Hindi & Drafting) ──────────────────────
  {
    code: "DRAFTING",
    name: "Drafting and Official Correspondence (Mains)",
    weight: 1,
    topics: [
      { code: "drafting.summary", name: "Summary Writing (Saransh)", description: "Writing a concise summary of a Hindi passage retaining key ideas." },
      { code: "drafting.passage", name: "Passage Writing (Gadyansh)", description: "Composing a passage on a given topic in formal Hindi." },
      { code: "drafting.essay", name: "Hindi Essay (Nibandh Lekhan)", description: "Three compulsory essays in Hindi (max 600 words each) on social, political or cultural topics." },
      { code: "drafting.translation_eng_hindi", name: "English to Hindi Translation", description: "Translating a short English paragraph into Hindi." },
      { code: "drafting.translation_hindi_eng", name: "Hindi to English Translation", description: "Translating a short Hindi paragraph into English." },
      { code: "drafting.official_letter", name: "Official / Demi-Official Letter (Sarkari Patra)", description: "Writing official and demi-official letters in Hindi (Sarkari/Ardh-Sarkari Patra)." },
      { code: "drafting.memo", name: "Office Memorandum / Karyalaya Adesh", description: "Drafting office memos, memorandums and circulars in Hindi." },
      { code: "drafting.communique", name: "Communiqué (Vigyapti) and Annotation (Tippan)", description: "Drafting press communiqués and noting/annotation on files." },
      { code: "drafting.report", name: "Report Writing (Pratyaved)", description: "Writing reports on inquiries, events and programmes in Hindi." },
      { code: "drafting.notice", name: "Notice and Press Release (Suchana / Pratyaved)", description: "Drafting public notices and press releases." },
      { code: "drafting.application", name: "Application (Aavedan Patra)", description: "Drafting formal applications in Hindi." },
      { code: "drafting.computer_basics", name: "Computer Knowledge (Hindi)", description: "Basic computer knowledge questions asked in Hindi — hardware, software, internet, MS Office." },
    ],
  },
];

export async function seedUppscRoAroSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UP_UPPSC_RO_ARO" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UP_UPPSC_RO_ARO exam not found.");
  }
  console.log(`Seeding UPPSC RO/ARO syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < uppscRoAroSyllabus.length; sIdx++) {
    const s = uppscRoAroSyllabus[sIdx];
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
  seedUppscRoAroSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
