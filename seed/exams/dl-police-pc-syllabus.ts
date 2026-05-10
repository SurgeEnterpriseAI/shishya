// Delhi Police Constable (SSC) — full syllabus tree.
// 100 MCQs in 90 minutes, 100 marks. 0.25 negative marking. Matriculation level.
// Sections: Reasoning Ability (25), General Awareness (50),
//           Quantitative Aptitude (15), Computer Knowledge (10).
// Source: ssc.nic.in Delhi Police Constable notification + Career Power / Adda247 cross-check.
//
// Run after seedExams: npx tsx seed/exams/dl-police-pc-syllabus.ts

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

export const dlPolicePcSyllabus: SubjectSeed[] = [
  // ── REASONING ABILITY (25 Qs) ──────────────────────────────────────────
  {
    code: "REASONING",
    name: "Reasoning Ability",
    weight: 0.25,
    topics: [
      { code: "reason.analogy", name: "Analogies", description: "Semantic, symbolic/number and figural analogies." },
      { code: "reason.similarity_diff", name: "Similarities & Differences", description: "Comparing words, numbers and figures." },
      { code: "reason.spatial_visualization", name: "Spatial Visualization", description: "3-D figure manipulation and rotation." },
      { code: "reason.spatial_orientation", name: "Spatial Orientation", description: "Sense of direction and positional reasoning." },
      { code: "reason.visual_memory", name: "Visual Memory", description: "Recall of visual stimuli." },
      { code: "reason.discrimination", name: "Discrimination", description: "Distinguishing similar but distinct items." },
      { code: "reason.observations", name: "Observations", description: "Detail observation and pattern detection." },
      { code: "reason.relationship", name: "Relationship Concepts", description: "Logical relationships and blood relations." },
      { code: "reason.arithmetic_reasoning", name: "Arithmetical Reasoning", description: "Reasoning with arithmetic operations." },
      { code: "reason.figural_classification", name: "Figural Classification", description: "Odd figure out from visual sets." },
      { code: "reason.arithmetic_series", name: "Arithmetic Number Series", description: "Find next/missing term in number series." },
      { code: "reason.non_verbal_series", name: "Non-Verbal Series", description: "Figure series and pattern continuation." },
      { code: "reason.coding", name: "Coding & Decoding", description: "Letter/number/symbol coding patterns." },
      { code: "reason.classification", name: "Classification", description: "Odd one out across categories." },
      { code: "reason.direction", name: "Direction Sense", description: "Cardinal directions and final-position." },
      { code: "reason.blood_relation", name: "Blood Relations", description: "Family-tree puzzles." },
      { code: "reason.syllogism", name: "Syllogism", description: "Logical conclusions from premises." },
    ],
  },

  // ── GENERAL AWARENESS (50 Qs) ──────────────────────────────────────────
  {
    code: "GK",
    name: "General Awareness",
    weight: 0.5,
    topics: [
      { code: "gk.current_events", name: "Current Events", description: "National and international events of last 12-18 months." },
      { code: "gk.india_neighbours", name: "India & Neighbouring Countries", description: "Geo-political relations with neighbours." },
      { code: "gk.history_india", name: "Indian History", description: "Ancient, medieval and modern history of India." },
      { code: "gk.freedom_struggle", name: "Indian Freedom Struggle", description: "1857, INC, Gandhian and revolutionary phase." },
      { code: "gk.geography_india", name: "Indian Geography", description: "Physical, economic and political geography of India." },
      { code: "gk.geography_world", name: "World Geography", description: "Continents, oceans and major countries." },
      { code: "gk.polity", name: "Indian Polity & Constitution", description: "Constitution, Parliament, judiciary, FRs and DPSPs." },
      { code: "gk.economy", name: "Indian Economy", description: "Plans, banking, GDP and budget." },
      { code: "gk.science", name: "General Science", description: "Physics, chemistry, biology basics and applications." },
      { code: "gk.tech", name: "Science & Technology", description: "Space, defence, IT and biotech." },
      { code: "gk.sports", name: "Sports", description: "National and international sports events and players." },
      { code: "gk.awards", name: "Awards & Honours", description: "Padma, Nobel and recent honours." },
      { code: "gk.books", name: "Books & Authors", description: "Notable books and their authors." },
      { code: "gk.culture", name: "Indian Culture & Heritage", description: "Art, architecture, music, dance and festivals." },
      { code: "gk.environment", name: "Environment & Ecology", description: "Climate change, biodiversity and conservation." },
      { code: "gk.delhi_history", name: "Delhi History", description: "Delhi Sultanate, Mughal Delhi, British Delhi and modern Delhi." },
      { code: "gk.delhi_admin", name: "Delhi Administration", description: "NCT structure, Delhi Police, MCD and Lt. Governor's role." },
      { code: "gk.delhi_geography", name: "Delhi Geography & Demography", description: "Yamuna, Ridge, climate and population of Delhi NCT." },
      { code: "gk.delhi_landmarks", name: "Delhi Landmarks", description: "Red Fort, Qutub Minar, India Gate, Jama Masjid and other monuments." },
      { code: "gk.policy_schemes", name: "Government Policies & Schemes", description: "Major Union and Delhi state schemes." },
    ],
  },

  // ── QUANTITATIVE APTITUDE (15 Qs) ──────────────────────────────────────
  {
    code: "MATH",
    name: "Quantitative Aptitude",
    weight: 0.15,
    topics: [
      { code: "math.number_system", name: "Number System", description: "Number properties, divisibility and rationals." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS and arithmetic." },
      { code: "math.percentage", name: "Percentage", description: "Percentage applications and changes." },
      { code: "math.profit_loss", name: "Profit & Loss", description: "CP, SP, MP and discount." },
      { code: "math.ratio_proportion", name: "Ratio & Proportion", description: "Compound ratio and partnership." },
      { code: "math.average", name: "Average", description: "Mean and weighted average." },
      { code: "math.si_ci", name: "Simple & Compound Interest", description: "SI and CI calculations." },
      { code: "math.time_work", name: "Time & Work", description: "Work efficiency and pipes/cisterns." },
      { code: "math.time_distance", name: "Time & Distance", description: "Speed, trains, boats." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter and volume of 2-D and 3-D figures." },
      { code: "math.algebra", name: "Algebra", description: "Linear equations and identities." },
      { code: "math.geometry", name: "Geometry", description: "Lines, angles, triangles and circles." },
      { code: "math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/pie/line graphs." },
    ],
  },

  // ── COMPUTER KNOWLEDGE (10 Qs) ─────────────────────────────────────────
  {
    code: "COMPUTER",
    name: "Computer Knowledge",
    weight: 0.1,
    topics: [
      { code: "comp.fundamentals", name: "Computer Fundamentals", description: "Hardware, software and operating system basics." },
      { code: "comp.word_processing", name: "Word Processing (MS Word)", description: "Word documents, formatting and printing." },
      { code: "comp.spreadsheet", name: "Spreadsheet (MS Excel)", description: "Cells, formulas, charts and basic functions." },
      { code: "comp.email", name: "Email & Communication", description: "Email composition, attachments and protocols." },
      { code: "comp.internet", name: "Internet & Web Browsers", description: "Browsing, search engines, URL and HTTP." },
      { code: "comp.network", name: "Networking Concepts", description: "LAN/WAN, IP basics and connectivity." },
      { code: "comp.cyber_security", name: "Cyber Security", description: "Cyber crime, viruses and online safety." },
      { code: "comp.input_output", name: "Input & Output Devices", description: "Keyboard, mouse, printer, scanner and monitor." },
      { code: "comp.storage", name: "Storage Devices", description: "RAM, ROM, hard disk, SSD and cloud storage." },
    ],
  },
];

export async function seedDlPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "DL_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — DL_POLICE_PC exam not found.");
  }
  console.log(`Seeding Delhi Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < dlPolicePcSyllabus.length; sIdx++) {
    const s = dlPolicePcSyllabus[sIdx];
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
  seedDlPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
