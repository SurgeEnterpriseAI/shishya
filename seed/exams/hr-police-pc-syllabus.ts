// Haryana Police Constable (HSSC) — full syllabus tree.
// Conducted by Haryana Staff Selection Commission.
// 100 MCQs in 90 minutes. No negative marking.
// Per HSSC notification: 20% of questions on Haryana-specific GK and 10% on
// basic computer knowledge. Other sections per advertised pattern: General
// Studies, General Science, Current Affairs, Reasoning, Mental Aptitude,
// Numerical Ability and Agriculture/Animal Husbandry/Other relevant fields.
// Source: hssc.gov.in advertisement + Adda247/Careerpower cross-check.
//
// Run after seedExams: npx tsx seed/exams/hr-police-pc-syllabus.ts

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

export const hrPolicePcSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES & GENERAL AWARENESS ───────────────────────────────
  {
    code: "GK",
    name: "General Studies and General Awareness",
    weight: 1,
    topics: [
      { code: "hr.gk.history", name: "Indian History",
        description: "Ancient, medieval, modern history and freedom struggle.",
        subtopics: [
          { code: "hr.gk.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Buddhism, Jainism and Mauryan/Gupta empires." },
          { code: "hr.gk.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas and Sikh empire." },
          { code: "hr.gk.history.modern", name: "Modern India and Freedom Struggle", description: "British rule, 1857, INC, Gandhian movement and partition." },
        ],
      },
      { code: "hr.gk.geography", name: "Geography", description: "Physical and political geography of India and the world." },
      { code: "hr.gk.polity", name: "Indian Polity and Constitution", description: "Constitution, fundamental rights, governance and constitutional bodies." },
      { code: "hr.gk.economy", name: "Indian Economy", description: "Banking, RBI, GST, schemes and key economic indicators." },
      { code: "hr.gk.current_affairs", name: "Current Affairs", description: "National and international events of the last 6-12 months." },
      { code: "hr.gk.sports", name: "Sports", description: "National/international tournaments and Haryana sportspersons." },
      { code: "hr.gk.awards", name: "Awards and Honours", description: "Padma awards, gallantry awards and Nobel Prize." },
      { code: "hr.gk.books_authors", name: "Books and Authors", description: "Notable books and their authors." },
      { code: "hr.gk.static", name: "Static GK", description: "Important days, national symbols, capitals and currencies." },
    ],
  },

  // ── GENERAL SCIENCE ───────────────────────────────────────────────────
  {
    code: "SCIENCE",
    name: "General Science",
    weight: 1,
    topics: [
      { code: "hr.sci.physics", name: "Physics", description: "Mechanics, heat, light, sound, electricity and magnetism." },
      { code: "hr.sci.chemistry", name: "Chemistry", description: "Elements, compounds, periodic table, acids/bases and chemical reactions." },
      { code: "hr.sci.biology", name: "Biology", description: "Cell biology, plants, animals, human body and diseases." },
      { code: "hr.sci.environment", name: "Environmental Science", description: "Ecosystems, biodiversity, climate change and pollution." },
      { code: "hr.sci.scientific_method", name: "Scientific Methodology", description: "Observation, hypothesis, experiment and basic scientific approach." },
      { code: "hr.sci.tech", name: "Technology and Space Science", description: "ISRO missions, IT, biotech, defence and space programmes." },
    ],
  },

  // ── REASONING & MENTAL APTITUDE ───────────────────────────────────────
  {
    code: "REASONING",
    name: "General Reasoning and Mental Aptitude",
    weight: 1,
    topics: [
      { code: "hr.reason.series", name: "Alphanumeric Series", description: "Number, letter and alphanumeric series problems." },
      { code: "hr.reason.coding", name: "Coding and Decoding", description: "Letter-shift, number and symbol-based coding problems." },
      { code: "hr.reason.blood_relations", name: "Blood Relations", description: "Family-tree problems and pointing-style questions." },
      { code: "hr.reason.directions", name: "Direction Test", description: "Compass-direction and shortest-distance problems." },
      { code: "hr.reason.classification", name: "Classification", description: "Odd-one-out among words, numbers and figures." },
      { code: "hr.reason.analogy", name: "Analogies", description: "Word, number, letter and figural analogy." },
      { code: "hr.reason.puzzles", name: "Puzzles and Seating Arrangement", description: "Linear and circular seating, scheduling puzzles." },
      { code: "hr.reason.alphabet_test", name: "Alphabet Test", description: "Position-based and rearrangement alphabet questions." },
      { code: "hr.reason.syllogism", name: "Syllogism", description: "Two-statement deductions using all/some/no quantifiers." },
      { code: "hr.reason.statement_arguments", name: "Statement and Arguments", description: "Strong vs weak arguments based on a given statement." },
      { code: "hr.reason.non_verbal", name: "Non-Verbal Reasoning", description: "Mirror image, water image, paper folding and embedded figures." },
    ],
  },

  // ── NUMERICAL ABILITY ─────────────────────────────────────────────────
  {
    code: "MATH",
    name: "Numerical Ability and Quantitative Aptitude",
    weight: 1,
    topics: [
      { code: "hr.math.number_system", name: "Number System", description: "Whole numbers, integers, divisibility, HCF and LCM." },
      { code: "hr.math.simplification", name: "Simplification", description: "BODMAS, fractions and decimals." },
      { code: "hr.math.percentage", name: "Percentage", description: "Percentage conversion and applied percentage problems." },
      { code: "hr.math.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership and proportion problems." },
      { code: "hr.math.average", name: "Average", description: "Mean of numbers, weighted averages and age-related averages." },
      { code: "hr.math.profit_loss", name: "Profit and Loss", description: "CP/SP, marked price, discount and profit/loss percentage." },
      { code: "hr.math.interest", name: "Simple and Compound Interest", description: "SI, CI and applied interest calculations." },
      { code: "hr.math.time_work", name: "Time and Work", description: "Work efficiency, joint work and pipes-and-cisterns." },
      { code: "hr.math.time_distance", name: "Time, Speed and Distance", description: "Trains, boats, average and relative speed problems." },
      { code: "hr.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of standard figures." },
      { code: "hr.math.geometry", name: "Geometry", description: "Triangles, circles, polygons and angle properties." },
      { code: "hr.math.algebra", name: "Elementary Algebra", description: "Linear equations, identities and basic algebraic manipulation." },
      { code: "hr.math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
    ],
  },

  // ── COMPUTER KNOWLEDGE (≥10% of paper per HSSC) ───────────────────────
  {
    code: "COMPUTER",
    name: "Computer Knowledge",
    weight: 1,
    topics: [
      { code: "hr.comp.fundamentals", name: "Computer Fundamentals", description: "Generations, classification, history and basic concepts of computers." },
      { code: "hr.comp.hardware", name: "Hardware and Input/Output Devices", description: "CPU, memory, keyboard, mouse, printer, scanner and storage devices." },
      { code: "hr.comp.software", name: "Software and Operating Systems", description: "System vs application software, Windows, Linux and basic OS functions." },
      { code: "hr.comp.ms_office", name: "MS Office", description: "MS Word, Excel, PowerPoint — basic operations and shortcuts." },
      { code: "hr.comp.internet", name: "Internet and Email", description: "Web browsing, search engines, email and basic web concepts." },
      { code: "hr.comp.security", name: "Computer Security", description: "Viruses, antivirus, firewalls and safe browsing." },
      { code: "hr.comp.applications", name: "Applications of Computers", description: "Use of computers in policing, governance and daily life." },
      { code: "hr.comp.it_terms", name: "IT Terminology", description: "Common computer abbreviations, acronyms and recent IT developments." },
    ],
  },

  // ── HARYANA GENERAL KNOWLEDGE (≥20% of paper per HSSC) ───────────────
  {
    code: "STATE_SPECIFIC",
    name: "Haryana General Knowledge",
    weight: 1.6,
    topics: [
      { code: "hr.state.history", name: "History of Haryana", description: "Ancient sites (Rakhigarhi), Kuru kingdom, Battles of Panipat, Tarain and Karnal." },
      { code: "hr.state.geography", name: "Geography of Haryana", description: "Districts, rivers, climate, soils, Aravalli range and agro-climatic zones." },
      { code: "hr.state.economy", name: "Economy of Haryana", description: "Agriculture, dairying, industries, IT corridor and major sectors." },
      { code: "hr.state.administration", name: "Haryana Administration", description: "CM, Council of Ministers, divisions, districts and panchayati raj." },
      { code: "hr.state.culture", name: "Art, Culture and Heritage", description: "Folk dances (Saang, Chaupaiya), music, festivals and traditional crafts." },
      { code: "hr.state.language_literature", name: "Haryanvi Language and Literature", description: "Haryanvi dialects, folk literature and notable Haryanvi writers." },
      { code: "hr.state.freedom_movement", name: "Haryana in Freedom Movement", description: "Lala Lajpat Rai, Pt. Neki Ram Sharma and other Haryana freedom fighters." },
      { code: "hr.state.sports", name: "Sports in Haryana", description: "Wrestling, boxing, kabaddi tradition and Haryana Olympians/medalists." },
      { code: "hr.state.tourism", name: "Tourism in Haryana", description: "Kurukshetra, Pinjore Gardens, Sultanpur, Surajkund and Morni Hills." },
      { code: "hr.state.schemes", name: "Welfare Schemes of Haryana", description: "Mukhyamantri Parivar Samriddhi Yojana, Saksham Yuva and other state schemes." },
      { code: "hr.state.current", name: "Current Affairs of Haryana", description: "Recent events, awards, policies and political developments in Haryana." },
    ],
  },

  // ── AGRICULTURE & ANIMAL HUSBANDRY (per HSSC advt clauses) ───────────
  {
    code: "AGRICULTURE",
    name: "Agriculture and Animal Husbandry",
    weight: 0.8,
    topics: [
      { code: "hr.agri.basics", name: "Basics of Agriculture", description: "Soil types, crops, cropping patterns and seasons (Kharif/Rabi)." },
      { code: "hr.agri.haryana_agri", name: "Agriculture of Haryana", description: "Major crops, irrigation, Green Revolution and HAU Hisar." },
      { code: "hr.agri.horticulture", name: "Horticulture", description: "Fruits, vegetables, spices and flower crops grown in Haryana." },
      { code: "hr.agri.animal_husbandry", name: "Animal Husbandry", description: "Livestock breeds, animal nutrition, production and management." },
      { code: "hr.agri.dairy", name: "Dairy Farming", description: "Milk production, breeds (Murrah buffalo) and dairy cooperatives." },
      { code: "hr.agri.diseases", name: "Animal Diseases and Health Care", description: "Common livestock diseases, symptoms and basic veterinary care." },
      { code: "hr.agri.farm_management", name: "Farm Management", description: "Farm machinery, fertilizers, pesticides and modern practices." },
    ],
  },
];

export async function seedHrPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "HR_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — HR_POLICE_PC exam not found.");
  }
  console.log(`Seeding Haryana Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < hrPolicePcSyllabus.length; sIdx++) {
    const s = hrPolicePcSyllabus[sIdx];
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
  seedHrPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
