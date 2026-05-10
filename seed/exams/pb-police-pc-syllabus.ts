// Punjab Police Constable — full syllabus tree.
// Conducted by Punjab Police Recruitment Board (PPRB) / PSSSB.
// Paper 1: 100 MCQs in 90 mins covering GA, Quant, Reasoning, English, Digital
// Literacy. Paper 2: Punjabi qualifying paper (50 Qs, 60 mins).
// Source: punjabpolice.gov.in / pprb.in advertisement,
// cross-checked with Oliveboard / Karmasandhan / Adda247 syllabus pages.
//
// Run after seedExams: npx tsx seed/exams/pb-police-pc-syllabus.ts

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

export const pbPolicePcSyllabus: SubjectSeed[] = [
  // ── GENERAL AWARENESS ─────────────────────────────────────────────────
  {
    code: "GK",
    name: "General Awareness",
    weight: 1,
    topics: [
      { code: "pb.gk.indian_constitution", name: "Indian Constitution",
        description: "Salient features and constitutional framework of India.",
        subtopics: [
          { code: "pb.gk.indian_constitution.features", name: "Features of the Constitution", description: "Preamble, fundamental rights, duties and DPSPs." },
          { code: "pb.gk.indian_constitution.legislature", name: "Central and State Legislature", description: "Parliament, State Legislatures and law-making procedures." },
          { code: "pb.gk.indian_constitution.executive", name: "Executive", description: "President, Prime Minister, Governor and Chief Minister." },
          { code: "pb.gk.indian_constitution.judiciary", name: "Judicial Institutions", description: "Supreme Court, High Courts and judicial review." },
          { code: "pb.gk.indian_constitution.local", name: "Local Government Institutions", description: "Panchayati Raj and urban local bodies." },
        ],
      },
      { code: "pb.gk.history", name: "History",
        description: "Ancient, medieval and modern Indian history.",
        subtopics: [
          { code: "pb.gk.history.ancient", name: "Ancient and Medieval History", description: "Indus Valley, Vedic age, Mauryas, Guptas, Sultanate and Mughals." },
          { code: "pb.gk.history.modern", name: "Modern History and Freedom Struggle", description: "British rule, 1857 revolt, INC, Gandhian era and partition." },
        ],
      },
      { code: "pb.gk.geography", name: "Geography of India and World", description: "Physical, political, economic and Indian geography essentials." },
      { code: "pb.gk.culture_economy_punjab", name: "Culture and Economy of Punjab", description: "Cultural heritage, festivals, agriculture and economy of Punjab." },
      { code: "pb.gk.science_tech", name: "Basics of Science and Technology", description: "Day-to-day science, ISRO, IT and recent technology developments." },
      { code: "pb.gk.current_affairs", name: "Current Affairs", description: "National and international events of the last 6-12 months." },
      { code: "pb.gk.sports", name: "Sports", description: "National/international tournaments and Punjab sportspersons." },
      { code: "pb.gk.awards", name: "Awards and Honours", description: "Padma awards, gallantry awards and major international awards." },
      { code: "pb.gk.static_gk", name: "Static GK", description: "Important days, national symbols, capitals and currencies." },
    ],
  },

  // ── QUANTITATIVE APTITUDE ─────────────────────────────────────────────
  {
    code: "MATH",
    name: "Quantitative Aptitude and Numerical Skills",
    weight: 1,
    topics: [
      { code: "pb.math.simplification", name: "Simplification", description: "BODMAS, fractions, decimals and surds." },
      { code: "pb.math.average", name: "Average", description: "Mean of numbers, weighted averages and age-related averages." },
      { code: "pb.math.decimal_fractions", name: "Decimals and Fractions", description: "Operations on and conversions between decimals and fractions." },
      { code: "pb.math.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership and proportion problems." },
      { code: "pb.math.percentage", name: "Percentage", description: "Percentage conversion and applied percentage problems." },
      { code: "pb.math.profit_loss", name: "Profit and Loss", description: "CP/SP, marked price, discount and profit/loss percentage." },
      { code: "pb.math.simple_interest", name: "Simple Interest", description: "SI calculations and applied SI problems." },
      { code: "pb.math.compound_interest", name: "Compound Interest", description: "Annual, half-yearly and quarterly CI calculations." },
      { code: "pb.math.time_work", name: "Time and Work", description: "Work efficiency, joint work and pipes-and-cisterns." },
      { code: "pb.math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average and relative speed problems." },
      { code: "pb.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of standard figures." },
      { code: "pb.math.bar_line_graphs", name: "Bar Graphs and Line Graphs", description: "Reading and interpreting bar and line graphs." },
      { code: "pb.math.number_system", name: "Number System", description: "Whole numbers, integers, divisibility, HCF and LCM." },
    ],
  },

  // ── REASONING ─────────────────────────────────────────────────────────
  {
    code: "REASONING",
    name: "Mental Ability and Logical Reasoning",
    weight: 1,
    topics: [
      { code: "pb.reason.number_letter_series", name: "Number and Letter Series", description: "Find next/missing term in numeric, alphabet and alphanumeric series." },
      { code: "pb.reason.sequencing", name: "Sequencing", description: "Logical and event-based sequencing problems." },
      { code: "pb.reason.statement_conclusion", name: "Statements and Conclusions", description: "Identify which conclusion logically follows from given statements." },
      { code: "pb.reason.pattern_completion", name: "Pattern Completion", description: "Complete the missing piece in a figural or numeric pattern." },
      { code: "pb.reason.ranking", name: "Order and Ranking", description: "Linear arrangement and rank-from-top/bottom problems." },
      { code: "pb.reason.directions", name: "Direction and Distance", description: "Compass-direction and shortest-distance problems." },
      { code: "pb.reason.relationships", name: "Relationship Problems", description: "Blood relations and pointing-style family-tree questions." },
      { code: "pb.reason.coding", name: "Coding and Decoding", description: "Letter-shift, number and symbol-based coding problems." },
      { code: "pb.reason.analogy", name: "Analogies and Classification", description: "Word, number and figural analogy plus odd-one-out." },
      { code: "pb.reason.syllogism", name: "Syllogism", description: "Two-statement deductions using all/some/no quantifiers." },
      { code: "pb.reason.venn", name: "Venn Diagrams", description: "Two- and three-set logical relationships and inferences." },
      { code: "pb.reason.non_verbal", name: "Non-Verbal Reasoning", description: "Mirror image, water image, paper folding/cutting and embedded figures." },
    ],
  },

  // ── ENGLISH LANGUAGE SKILLS ───────────────────────────────────────────
  {
    code: "LANG",
    name: "English Language Skills",
    weight: 1,
    topics: [
      { code: "pb.eng.comprehension", name: "Reading Comprehension", description: "Unseen passages with inference, vocabulary and grammar questions." },
      { code: "pb.eng.translation", name: "Punjabi to English Translation", description: "Translate sentences and short passages from Punjabi to English." },
      { code: "pb.eng.rearrangement", name: "Sentence Rearrangement", description: "Arrange jumbled sentences into a coherent paragraph." },
      { code: "pb.eng.correction", name: "Sentence Correction", description: "Identify and correct grammatical errors in given sentences." },
      { code: "pb.eng.error_spotting", name: "Error Spotting", description: "Spot the segment containing a grammatical error." },
      { code: "pb.eng.fill_blanks", name: "Fill in the Blanks", description: "Fill blanks with appropriate words, prepositions or articles." },
      { code: "pb.eng.spelling", name: "Spelling Correction", description: "Identify the correctly or incorrectly spelt word." },
      { code: "pb.eng.synonyms_antonyms", name: "Synonyms and Antonyms", description: "Vocabulary — synonyms, antonyms and word meanings." },
      { code: "pb.eng.one_word", name: "One-Word Substitution", description: "Single word for a given group of words." },
    ],
  },

  // ── PUNJABI LANGUAGE (Mandatory Qualifying Paper) ─────────────────────
  {
    code: "PUNJABI",
    name: "Punjabi Language (Qualifying Paper)",
    weight: 0.5,
    topics: [
      { code: "pb.pun.grammar", name: "Punjabi Grammar (Vyakaran)", description: "Sandhi, samas, alankar, chand and grammatical rules in Punjabi." },
      { code: "pb.pun.vocabulary", name: "Vocabulary", description: "Synonyms, antonyms and one-word substitution in Punjabi." },
      { code: "pb.pun.idioms", name: "Idioms and Proverbs", description: "Common Punjabi idioms (muhavare) and proverbs (akhan) with meanings." },
      { code: "pb.pun.translation", name: "Translation", description: "Translate sentences from English/Hindi to Punjabi." },
      { code: "pb.pun.correction", name: "Sentence Correction", description: "Spot and correct errors in Punjabi sentences." },
      { code: "pb.pun.comprehension", name: "Comprehension", description: "Unseen Punjabi passages with comprehension questions." },
      { code: "pb.pun.literature", name: "Punjabi Literature", description: "Famous Punjabi writers and their notable works." },
    ],
  },

  // ── DIGITAL LITERACY ──────────────────────────────────────────────────
  {
    code: "COMPUTER",
    name: "Digital Literacy and Awareness",
    weight: 1,
    topics: [
      { code: "pb.dig.fundamentals", name: "Fundamentals of Computers", description: "Generations, classification and basic concepts of computers." },
      { code: "pb.dig.ms_office", name: "MS Office", description: "MS Word, Excel and PowerPoint — basic operations and shortcuts." },
      { code: "pb.dig.internet", name: "Internet and Web Search", description: "Web browsing, search engines and basic web concepts." },
      { code: "pb.dig.email", name: "Email Communication", description: "Composing, sending, receiving emails and email etiquette." },
      { code: "pb.dig.mobile", name: "Mobile Phone Basics", description: "Smartphone usage, mobile apps and digital payments." },
      { code: "pb.dig.cyber_security", name: "Cyber Security", description: "Online safety, password practices and protection from cybercrime." },
      { code: "pb.dig.digital_india", name: "Digital India and e-Governance", description: "DigiLocker, UPI, Aadhaar and Punjab e-services." },
    ],
  },

  // ── PUNJAB-SPECIFIC ────────────────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Punjab State Specific",
    weight: 1.4,
    topics: [
      { code: "pb.state.history", name: "History of Punjab", description: "Ancient Punjab, Sikh Gurus, Maharaja Ranjit Singh and Anglo-Sikh wars." },
      { code: "pb.state.geography", name: "Geography of Punjab", description: "Districts, rivers (Five Rivers), climate, soils and agriculture zones." },
      { code: "pb.state.economy", name: "Economy of Punjab", description: "Agriculture, Green Revolution, industries and economic profile." },
      { code: "pb.state.administration", name: "Punjab Administration", description: "CM, Council of Ministers, divisions, districts and panchayati raj." },
      { code: "pb.state.culture", name: "Punjabi Culture and Festivals", description: "Bhangra, Giddha, Lohri, Baisakhi, Punjabi food and crafts." },
      { code: "pb.state.freedom_movement", name: "Punjab in Freedom Movement", description: "Bhagat Singh, Lala Lajpat Rai, Jallianwala Bagh and Ghadar movement." },
      { code: "pb.state.sikhism", name: "Sikhism and Sikh History", description: "Ten Sikh Gurus, Guru Granth Sahib and major Sikh institutions." },
      { code: "pb.state.tourism", name: "Tourism in Punjab", description: "Golden Temple, Wagah, Anandpur Sahib, Jallianwala Bagh and other sites." },
      { code: "pb.state.schemes", name: "Welfare Schemes of Punjab", description: "Aam Aadmi Clinics, Smart Ration Card and other Punjab government schemes." },
      { code: "pb.state.current", name: "Current Affairs of Punjab", description: "Recent events, awards, sports and political developments in Punjab." },
    ],
  },
];

export async function seedPbPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "PB_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — PB_POLICE_PC exam not found.");
  }
  console.log(`Seeding Punjab Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < pbPolicePcSyllabus.length; sIdx++) {
    const s = pbPolicePcSyllabus[sIdx];
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
  seedPbPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
