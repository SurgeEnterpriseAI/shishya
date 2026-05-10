// JKSSB (Jammu & Kashmir Services Selection Board) — Junior Assistant / VLW / Panchayat Secretary syllabus tree.
// CBT 80 marks objective + 20 marks Typing/Skill test (for Junior Assistant). 80 minutes duration.
// Four units: English, General Awareness (with J&K focus), Reasoning & Numeracy, Computers.
// Source: jkssb.nic.in official syllabus PDFs (Advt. 08/2025 Junior Assistant; reused across cadre exams).
//
// Run after seedExams: npx tsx seed/exams/jkssb-syllabus.ts

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

export const jkssbSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE / GENERAL AWARENESS ────────────────────────────
  {
    code: "GK",
    name: "General Awareness",
    weight: 1,
    topics: [
      { code: "gk.history_india", name: "History of India", description: "Ancient, medieval and modern Indian history; freedom struggle." },
      { code: "gk.geography_india", name: "Geography of India", description: "Physical, economic and social geography of India." },
      { code: "gk.indian_polity", name: "Indian Polity", description: "Constitution, Parliament, judiciary, federalism, fundamental rights." },
      { code: "gk.indian_economy", name: "Indian Economy", description: "Banking, GST, Five-Year Plans, NITI Aayog, fiscal and monetary policy." },
      { code: "gk.science_general", name: "General Science", description: "Physics, chemistry, biology fundamentals at matriculate standard." },
      { code: "gk.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, climate change, conservation laws." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events, awards, sports, books, summits." },
      { code: "gk.sports_awards", name: "Sports, Awards and Honours", description: "Major awards (Padma, Nobel, gallantry), trophies and tournaments." },
      { code: "gk.books_authors", name: "Books and Authors", description: "Notable books, authors, prize-winning literature." },
      { code: "gk.intl_orgs", name: "International Organizations", description: "UN, WHO, World Bank, IMF, SAARC, BRICS, G20." },
    ],
  },

  // ── J&K SPECIFIC ─────────────────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Jammu & Kashmir UT Specific",
    weight: 1.4,
    topics: [
      { code: "jk.history", name: "History of Jammu & Kashmir", description: "Ancient to modern history of J&K — Dogra rule, accession, post-1947." },
      { code: "jk.geography", name: "Geography of J&K", description: "Physical features, climate, rivers (Jhelum, Chenab, Indus), lakes, valleys." },
      { code: "jk.flora_fauna", name: "Flora and Fauna of J&K", description: "Native species, national parks (Dachigam, Hemis), wildlife sanctuaries." },
      { code: "jk.economy", name: "Economy of J&K", description: "Agriculture (apple, saffron), handicrafts, tourism, horticulture." },
      { code: "jk.culture_heritage", name: "Culture and Heritage", description: "Kashmiri, Dogri, Ladakhi traditions; festivals; languages." },
      { code: "jk.tourist_destinations", name: "Tourist Destinations", description: "Srinagar, Gulmarg, Pahalgam, Sonamarg, Vaishno Devi, Patnitop, Mughal Gardens." },
      { code: "jk.administration", name: "Administration of J&K UT", description: "UT structure post-Article 370 abrogation, Lt. Governor, districts, divisions." },
      { code: "jk.reorganization", name: "J&K Reorganisation Act 2019", description: "Bifurcation into J&K and Ladakh UTs, applicable laws and changes." },
      { code: "jk.languages", name: "Languages of J&K", description: "Kashmiri, Dogri, Urdu, Hindi, English, Ladakhi as official languages." },
      { code: "jk.govt_schemes", name: "Government Schemes in J&K", description: "Back to Village, PMDP, livelihood and welfare schemes for UT." },
      { code: "jk.current_affairs_jk", name: "Current Affairs of J&K", description: "Recent appointments, projects, events specific to J&K UT." },
    ],
  },

  // ── ENGLISH LANGUAGE ─────────────────────────────────────────────────
  {
    code: "LANG",
    name: "English Language",
    weight: 1,
    topics: [
      { code: "eng.comprehension", name: "Reading Comprehension", description: "Unseen passage with inference and vocabulary questions." },
      { code: "eng.editing_proofreading", name: "Editing and Proofreading", description: "Spotting errors and correcting grammar, spelling, punctuation." },
      { code: "eng.jumbled_sentences", name: "Rearranging Jumbled Sentences", description: "Para-jumble — restoring logical order of sentences." },
      { code: "eng.narration", name: "Direct and Indirect Narration", description: "Conversion between direct and reported speech." },
      { code: "eng.modals", name: "Modals", description: "Use of can, could, may, might, should, must in context." },
      { code: "eng.articles", name: "Articles", description: "Use of a, an, the — definite and indefinite article rules." },
      { code: "eng.paragraph_writing", name: "Paragraph Writing", description: "Coherent paragraph composition on a given topic." },
      { code: "eng.phrases", name: "Phrases and Phrasal Verbs", description: "Common English phrases and phrasal verb usage." },
      { code: "eng.pronouns", name: "Pronouns", description: "Personal, reflexive, relative, demonstrative pronoun usage." },
      { code: "eng.homonyms", name: "Homonyms and Homophones", description: "Words that sound or are spelt alike but differ in meaning." },
      { code: "eng.clauses", name: "Clauses", description: "Independent, dependent, noun, adjective and adverb clauses." },
      { code: "eng.punctuation", name: "Punctuation", description: "Full stop, comma, semicolon, colon, apostrophe and quotation marks." },
      { code: "eng.synonyms_antonyms", name: "Synonyms and Antonyms", description: "Word meanings and opposites." },
      { code: "eng.idioms", name: "Idioms and Phrases", description: "Common English idiomatic expressions." },
      { code: "eng.prepositions", name: "Prepositions", description: "Use of prepositions of time, place, direction and manner." },
      { code: "eng.tenses", name: "Tenses", description: "Twelve tense forms and rules of tense usage." },
      { code: "eng.subject_verb", name: "Subject-Verb Agreement", description: "Concord between subject and verb in number and person." },
      { code: "eng.voice", name: "Active and Passive Voice", description: "Conversion between active and passive voice." },
    ],
  },

  // ── REASONING AND NUMERACY ───────────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning and Numeracy",
    weight: 1,
    topics: [
      { code: "rn.number_system", name: "Number System", description: "Whole, rational, irrational numbers; divisibility; LCM and HCF." },
      { code: "rn.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, surds and indices." },
      { code: "rn.percentage", name: "Percentage", description: "Percentage calculation and applications." },
      { code: "rn.average", name: "Average", description: "Simple and weighted averages." },
      { code: "rn.profit_loss", name: "Profit and Loss", description: "Cost price, selling price, discount and marked price problems." },
      { code: "rn.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse and compound ratios." },
      { code: "rn.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns." },
      { code: "rn.time_distance", name: "Time and Distance", description: "Trains, boats and average speed problems." },
      { code: "rn.si_ci", name: "Simple and Compound Interest", description: "Interest formulas and applied problems." },
      { code: "rn.mensuration", name: "Mensuration", description: "Area and volume of 2D and 3D figures." },
      { code: "rn.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs and calculation-based questions." },
      { code: "rn.coding_decoding", name: "Coding-Decoding", description: "Letter and number coding, substitution coding." },
      { code: "rn.blood_relations", name: "Blood Relations", description: "Family tree and relationship-based problems." },
      { code: "rn.directions", name: "Direction Sense", description: "Direction-based reasoning and shortest path." },
      { code: "rn.series", name: "Number and Letter Series", description: "Find next/missing/wrong term in a series." },
      { code: "rn.analogy", name: "Analogy", description: "Word, number and figure analogy." },
      { code: "rn.classification", name: "Classification (Odd One Out)", description: "Identifying the term not belonging to a group." },
      { code: "rn.syllogism", name: "Syllogism", description: "Statement-conclusion and Venn-diagram-based reasoning." },
      { code: "rn.seating_arrangement", name: "Seating Arrangement", description: "Linear, circular and square seating puzzles." },
      { code: "rn.calendar_clock", name: "Calendar and Clock", description: "Day-of-week, leap year and clock-angle problems." },
    ],
  },

  // ── COMPUTERS ────────────────────────────────────────────────────────
  {
    code: "COMPUTER",
    name: "Computer Knowledge",
    weight: 1,
    topics: [
      { code: "comp.fundamentals", name: "Fundamentals of Computer Science", description: "Computer generations, classification, characteristics, components." },
      { code: "comp.hardware_software", name: "Hardware and Software", description: "CPU, memory, storage, system and application software." },
      { code: "comp.io_devices", name: "Input and Output Devices", description: "Keyboard, mouse, scanner, printer, monitor, speakers." },
      { code: "comp.os", name: "Operating System", description: "Windows basics, file management, common OS commands." },
      { code: "comp.ms_word", name: "MS Word", description: "Document creation, formatting, mail merge, tables, templates." },
      { code: "comp.ms_excel", name: "MS Excel", description: "Spreadsheets, formulas, functions, charts, sorting and filtering." },
      { code: "comp.ms_access", name: "MS Access", description: "Database creation, tables, queries, forms and reports." },
      { code: "comp.ms_powerpoint", name: "MS PowerPoint", description: "Slide design, transitions, animations, presentation tools." },
      { code: "comp.email_internet", name: "E-mail and Internet", description: "Browsers, search engines, e-mail clients, attachments and security." },
      { code: "comp.networking", name: "Computer Networking", description: "LAN, WAN, MAN, internet protocols, IP addressing basics." },
      { code: "comp.cyber_security", name: "Cyber Security", description: "Viruses, firewalls, antivirus, phishing, password hygiene." },
      { code: "comp.shortcuts", name: "Keyboard Shortcuts", description: "Windows and Office shortcut keys." },
    ],
  },
];

export async function seedJkssbSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "JK_JKSSB" } });
  if (!exam) {
    throw new Error("Run seedExams() first — JK_JKSSB exam not found.");
  }
  console.log(`Seeding JKSSB syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < jkssbSyllabus.length; sIdx++) {
    const s = jkssbSyllabus[sIdx];
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
  console.log(`✓ Seeded JKSSB syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedJkssbSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
