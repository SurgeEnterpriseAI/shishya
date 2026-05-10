// Odisha Police Constable (OSSC) — full syllabus tree.
// Conducted by Odisha Police / Odisha SSC.
// CBT: 100 MCQs in 2 hours, 100 marks. Negative marking 0.25 per wrong answer.
// Subjects: Odia, English, Arithmetic, Reasoning & Aptitude, GK, Computer.
// Source: ossc.gov.in / odishapolice.gov.in advertisement,
// cross-checked with Adda247 / Testbook / Careerpower coverage.
//
// Run after seedExams: npx tsx seed/exams/od-police-pc-syllabus.ts

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

export const odPolicePcSyllabus: SubjectSeed[] = [
  // ── ODIA LANGUAGE ─────────────────────────────────────────────────────
  {
    code: "LANG",
    name: "Odia Language",
    weight: 1,
    topics: [
      { code: "od.odia.grammar", name: "Odia Grammar (Vyakarana)", description: "Sandhi, samasa, alankara, chhanda and grammatical rules in Odia." },
      { code: "od.odia.vocabulary", name: "Vocabulary", description: "Synonyms (paryayabachi), antonyms (vipritarthi) and one-word substitution." },
      { code: "od.odia.idioms", name: "Idioms and Proverbs", description: "Common Odia idioms (bagdhara) and proverbs (dhagadhamali)." },
      { code: "od.odia.translation", name: "Translation", description: "Translate sentences from English to Odia and vice versa." },
      { code: "od.odia.fill_blanks", name: "Fill in the Blanks", description: "Complete sentences with appropriate Odia words." },
      { code: "od.odia.comprehension", name: "Reading Comprehension", description: "Unseen Odia passages with comprehension questions." },
      { code: "od.odia.literature", name: "Odia Literature", description: "Famous Odia writers — Sarala Das, Fakir Mohan Senapati, Gopabandhu and modern poets." },
    ],
  },

  // ── ENGLISH LANGUAGE ──────────────────────────────────────────────────
  {
    code: "ENGLISH",
    name: "English Language",
    weight: 1,
    topics: [
      { code: "od.eng.synonyms", name: "Synonyms", description: "Choose the word with similar meaning." },
      { code: "od.eng.antonyms", name: "Antonyms", description: "Choose the word with opposite meaning." },
      { code: "od.eng.error_spotting", name: "Error Spotting", description: "Spot the segment containing a grammatical error." },
      { code: "od.eng.cloze_test", name: "Cloze Test", description: "Fill blanks in a passage with appropriate words." },
      { code: "od.eng.comprehension", name: "Reading Comprehension", description: "Unseen passages with inference and vocabulary questions." },
      { code: "od.eng.sentence_completion", name: "Sentence Completion", description: "Complete the sentence with the appropriate word/phrase." },
      { code: "od.eng.rearrangement", name: "Sentence Rearrangement", description: "Arrange jumbled sentences into a coherent paragraph." },
      { code: "od.eng.idioms", name: "Idioms and Phrases", description: "Common English idioms, phrases and their meanings." },
      { code: "od.eng.fill_blanks", name: "Fill in the Blanks", description: "Fill blanks with appropriate words, prepositions or articles." },
    ],
  },

  // ── ARITHMETIC ────────────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Arithmetic",
    weight: 1,
    topics: [
      { code: "od.math.number_system", name: "Number System", description: "Whole numbers, integers, divisibility, HCF and LCM." },
      { code: "od.math.simplification", name: "Simplification", description: "BODMAS, fractions and decimals." },
      { code: "od.math.decimal_fractions", name: "Decimal Fractions", description: "Operations on decimals and conversions." },
      { code: "od.math.percentage", name: "Percentage", description: "Percentage conversion and applied percentage problems." },
      { code: "od.math.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership and proportion problems." },
      { code: "od.math.average", name: "Average", description: "Mean of numbers, weighted averages and age-related averages." },
      { code: "od.math.profit_loss", name: "Profit and Loss", description: "CP/SP, marked price, discount and profit/loss percentage." },
      { code: "od.math.simple_interest", name: "Simple Interest", description: "SI calculations and applied SI problems." },
      { code: "od.math.compound_interest", name: "Compound Interest", description: "Annual, half-yearly and quarterly CI calculations." },
      { code: "od.math.time_work", name: "Time and Work", description: "Work efficiency, joint work and pipes-and-cisterns." },
      { code: "od.math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average and relative speed problems." },
      { code: "od.math.pipes_cisterns", name: "Pipes and Cisterns", description: "Inlet/outlet pipes filling/emptying tank problems." },
      { code: "od.math.ages", name: "Problems on Ages", description: "Age-related word problems involving past, present, future." },
      { code: "od.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of standard figures." },
      { code: "od.math.probability", name: "Probability", description: "Basic probability of events with dice, cards and coins." },
      { code: "od.math.number_series", name: "Number Series", description: "Find next/missing/wrong term in a numeric series." },
    ],
  },

  // ── REASONING & APTITUDE ──────────────────────────────────────────────
  {
    code: "REASONING",
    name: "Logical Reasoning and Aptitude",
    weight: 1,
    topics: [
      { code: "od.reason.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
      { code: "od.reason.blood_relations", name: "Blood Relations", description: "Family-tree problems and pointing-style questions." },
      { code: "od.reason.syllogism", name: "Syllogism", description: "Two-statement deductions using all/some/no quantifiers." },
      { code: "od.reason.directions", name: "Direction Sense", description: "Compass-direction and shortest-distance problems." },
      { code: "od.reason.coding", name: "Coding and Decoding", description: "Letter-shift, number and symbol-based coding problems." },
      { code: "od.reason.cubes_dice", name: "Cubes and Dice", description: "Surface counting on cubes and dice opposite-face problems." },
      { code: "od.reason.mirror_image", name: "Mirror and Water Images", description: "Identify mirror image and water image of a given figure." },
      { code: "od.reason.series", name: "Series Completion", description: "Number, letter and figural series problems." },
      { code: "od.reason.clock_calendar", name: "Clock and Calendar", description: "Angle between clock hands and day-finding problems." },
      { code: "od.reason.analogy", name: "Logical Analogies", description: "Word, number, letter and figural analogy pairs." },
      { code: "od.reason.classification", name: "Classification", description: "Odd-one-out among words, numbers and figures." },
      { code: "od.reason.ranking", name: "Order and Ranking", description: "Linear arrangement and rank-from-top/bottom problems." },
      { code: "od.reason.statement_argument", name: "Statement and Argument", description: "Strong vs weak arguments based on a given statement." },
    ],
  },

  // ── GENERAL KNOWLEDGE ─────────────────────────────────────────────────
  {
    code: "GK",
    name: "General Knowledge and Awareness",
    weight: 1,
    topics: [
      { code: "od.gk.indian_parliament", name: "Indian Parliament and Civics", description: "Parliament, fundamental rights, governance and constitutional bodies." },
      { code: "od.gk.economy", name: "Indian Economy", description: "Banking, RBI, GST, schemes and key economic indicators." },
      { code: "od.gk.heritage", name: "Indian Heritage and Culture", description: "Art, architecture, music, dance, festivals and monuments." },
      { code: "od.gk.geography", name: "Indian Geography", description: "Physical, social and economic geography of India." },
      { code: "od.gk.history", name: "Indian History",
        description: "Ancient, medieval, modern Indian history and freedom struggle.",
        subtopics: [
          { code: "od.gk.history.ancient", name: "Ancient and Medieval India", description: "Indus Valley, Vedic age, Mauryas, Guptas, Sultanate and Mughals." },
          { code: "od.gk.history.modern", name: "Modern India and Freedom Struggle", description: "British rule, INC, Gandhian movement and partition." },
        ],
      },
      { code: "od.gk.science", name: "General Science", description: "Day-to-day physics, chemistry and biology applicable in general awareness." },
      { code: "od.gk.current_affairs", name: "Current Affairs", description: "National and international events of the last 6-12 months." },
      { code: "od.gk.literature", name: "Literature", description: "Indian literature — notable writers, books and awards." },
      { code: "od.gk.sports", name: "Sports", description: "National/international tournaments and Odisha sportspersons (hockey)." },
      { code: "od.gk.inventions", name: "Inventions and Discoveries", description: "Major scientific inventions, discoveries and inventors." },
      { code: "od.gk.landmarks", name: "Famous Landmarks and Static GK", description: "Important monuments, days, national symbols and capitals." },
    ],
  },

  // ── COMPUTER AWARENESS ────────────────────────────────────────────────
  {
    code: "COMPUTER",
    name: "Basic Computer Knowledge",
    weight: 0.8,
    topics: [
      { code: "od.comp.fundamentals", name: "Computer Fundamentals", description: "Basics of computer, generations and history of computers." },
      { code: "od.comp.hardware", name: "Hardware and I/O Devices", description: "CPU, memory, keyboard, mouse, printer, scanner and storage." },
      { code: "od.comp.software", name: "Software and Operating Systems", description: "System vs application software and basic OS functions." },
      { code: "od.comp.programming", name: "Programming Languages", description: "High-level/low-level languages and common programming concepts." },
      { code: "od.comp.networking", name: "Networking Fundamentals", description: "LAN/WAN, Internet, IP, protocols and basic network concepts." },
      { code: "od.comp.ms_office", name: "MS Office", description: "MS Word, Excel, PowerPoint — basic operations and shortcuts." },
      { code: "od.comp.security", name: "Computer Security", description: "Viruses, antivirus, firewalls and safe browsing practices." },
    ],
  },

  // ── ODISHA-SPECIFIC ───────────────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Odisha State Specific",
    weight: 1.4,
    topics: [
      { code: "od.state.history", name: "History of Odisha",
        description: "Ancient, medieval and modern history of Odisha (Kalinga).",
        subtopics: [
          { code: "od.state.history.kalinga", name: "Kalinga Empire and Ashoka", description: "Kalinga War (261 BC), Ashoka's edicts and ancient Kalinga." },
          { code: "od.state.history.gangas", name: "Eastern Gangas and Suryavanshis", description: "Anantavarman Chodaganga, Konark Sun Temple and Suryavansha rule." },
          { code: "od.state.history.modern", name: "Modern Odisha", description: "British rule, formation of Odisha province (1936) and integration of states." },
        ],
      },
      { code: "od.state.geography", name: "Geography of Odisha", description: "Districts, rivers (Mahanadi), Chilika lake, coastline and minerals." },
      { code: "od.state.economy", name: "Economy of Odisha", description: "Mining, steel, agriculture, ports and major industries." },
      { code: "od.state.administration", name: "Odisha Administration", description: "CM, Council of Ministers, divisions, districts (30) and panchayati raj." },
      { code: "od.state.culture", name: "Culture and Festivals of Odisha", description: "Odissi dance, Rath Yatra, Konark dance festival and Pattachitra art." },
      { code: "od.state.literature", name: "Odia Literature and Saints", description: "Sarala Das, Fakir Mohan Senapati, Madhusudan Das and Bhakti saints." },
      { code: "od.state.tourism", name: "Tourism and Heritage", description: "Konark Sun Temple, Jagannath Puri, Lingaraj, Udayagiri and Chilika." },
      { code: "od.state.schemes", name: "Welfare Schemes of Odisha", description: "KALIA, Biju Swasthya Kalyan Yojana, Mission Shakti and other state schemes." },
      { code: "od.state.current", name: "Current Affairs of Odisha", description: "Recent events, awards, sports and political developments in Odisha." },
    ],
  },
];

export async function seedOdPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "OD_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — OD_POLICE_PC exam not found.");
  }
  console.log(`Seeding Odisha Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < odPolicePcSyllabus.length; sIdx++) {
    const s = odPolicePcSyllabus[sIdx];
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
  seedOdPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
