// RRB NTPC Tier 1 (CBT 1) — full syllabus tree.
// 100 questions in 90 minutes, 1 mark each, −1/3 negative marking.
// Three sections: Mathematics (30), General Intelligence & Reasoning (30),
// General Awareness (40).
//
// Run after seedExams: npx tsx seed/exams/rrb-ntpc-syllabus.ts

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

export const rrbNtpcSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS (30 Qs) ───────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 0.30,
    topics: [
      { code: "rrb.math.number_system", name: "Number System", description: "Natural, whole, integers, rationals, divisibility tests, factors and multiples." },
      { code: "rrb.math.decimals_fractions", name: "Decimals and Fractions", description: "Conversion, addition/subtraction/multiplication/division of decimals and fractions." },
      { code: "rrb.math.lcm_hcf", name: "LCM and HCF", description: "LCM/HCF of numbers, fractions and decimals; word problems." },
      { code: "rrb.math.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership, mean proportion, applied problems." },
      { code: "rrb.math.percentage", name: "Percentage", description: "Conversion, percentage change, applied problems on percentage." },
      { code: "rrb.math.mensuration", name: "Mensuration", description: "Areas of 2-D figures and surface area/volume of cubes, cuboids, cylinders, cones, spheres." },
      { code: "rrb.math.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns, combined work, days/men relationships." },
      { code: "rrb.math.time_distance", name: "Time, Distance and Speed", description: "Trains, boats and streams, relative speed, average speed." },
      { code: "rrb.math.si_ci", name: "Simple and Compound Interest", description: "SI, CI annual/half-yearly compounding, instalments, applied problems." },
      { code: "rrb.math.profit_loss", name: "Profit and Loss", description: "CP/SP/MP, discount, successive discount, profit-loss percentages." },
      { code: "rrb.math.elementary_algebra", name: "Elementary Algebra", description: "Linear equations, simultaneous equations, polynomial identities, basic factorisation." },
      { code: "rrb.math.geometry_trigonometry", name: "Geometry and Trigonometry", description: "Lines, angles, triangles, circles; trigonometric ratios, identities, heights and distances." },
      { code: "rrb.math.statistics", name: "Elementary Statistics", description: "Mean, median, mode, range and basic data interpretation." },
    ],
  },

  // ── GENERAL INTELLIGENCE AND REASONING (30 Qs) ────────────────────────
  {
    code: "REASONING",
    name: "General Intelligence and Reasoning",
    weight: 0.30,
    topics: [
      { code: "rrb.reason.analogy", name: "Analogies", description: "Word, number and letter analogies." },
      { code: "rrb.reason.series", name: "Completion of Number and Alphabetical Series", description: "Number, letter, alphanumeric series." },
      { code: "rrb.reason.coding", name: "Coding and Decoding", description: "Letter, number, conditional and substitution coding." },
      { code: "rrb.reason.math_operations", name: "Mathematical Operations", description: "BODMAS, sign substitution, missing operator problems." },
      { code: "rrb.reason.similarities_differences", name: "Similarities and Differences", description: "Find odd one out, classification problems." },
      { code: "rrb.reason.relationships", name: "Relationships", description: "Blood relations, family-tree puzzles." },
      { code: "rrb.reason.analytical_reasoning", name: "Analytical Reasoning", description: "Seating arrangements, ranking, ordering puzzles." },
      { code: "rrb.reason.syllogism", name: "Syllogism", description: "Two/three statement syllogisms with all/some/no quantifiers." },
      { code: "rrb.reason.jumbling", name: "Jumbling", description: "Sentence and word rearrangement." },
      { code: "rrb.reason.venn", name: "Venn Diagrams", description: "Set relationships and counting from Venn diagrams." },
      { code: "rrb.reason.puzzle", name: "Puzzle", description: "Mixed logical puzzles — seating, ranking, scheduling." },
      { code: "rrb.reason.data_sufficiency", name: "Data Sufficiency", description: "Decide whether given data is sufficient to answer a question." },
      { code: "rrb.reason.statement_conclusion", name: "Statement and Conclusion", description: "Drawing logical conclusions from given statements." },
      { code: "rrb.reason.statement_courses", name: "Statement and Courses of Action", description: "Identifying appropriate actions for given problem statements." },
      { code: "rrb.reason.decision_making", name: "Decision Making", description: "Eligibility-criteria style problems with multiple conditions." },
      { code: "rrb.reason.maps_graphs", name: "Maps and Graphs", description: "Direction sense, distance from a point; reading bar/line/pie graphs." },
    ],
  },

  // ── GENERAL AWARENESS (40 Qs) ─────────────────────────────────────────
  {
    code: "GA",
    name: "General Awareness",
    weight: 0.40,
    topics: [
      { code: "rrb.ga.current_events", name: "Current Events of National and International Importance", description: "National and international news, awards, appointments — last 12 months." },
      { code: "rrb.ga.games_sports", name: "Games and Sports", description: "Major tournaments, winners, cups, sporting events from India and abroad." },
      { code: "rrb.ga.art_culture", name: "Art and Culture of India", description: "Classical dance, music, festivals, painting and sculpture traditions." },
      { code: "rrb.ga.literature", name: "Indian Literature", description: "Major Indian writers, works, languages and literary awards." },
      { code: "rrb.ga.monuments_places", name: "Monuments and Places of India", description: "Historic monuments, UNESCO sites, important places and their significance." },
      { code: "rrb.ga.history", name: "General Science and Life Science (up to 10th CBSE)",
        description: "Note: this is the 'General Science' bucket per RRB syllabus; covers Class-10 level Physics/Chemistry/Biology.",
        subtopics: [
          { code: "rrb.ga.science.physics", name: "Physics (Class 10)" },
          { code: "rrb.ga.science.chemistry", name: "Chemistry (Class 10)" },
          { code: "rrb.ga.science.biology", name: "Biology / Life Science (Class 10)" },
        ],
      },
      { code: "rrb.ga.history_india", name: "History of India and Freedom Struggle", description: "Ancient, medieval and modern India; freedom movement; key personalities and dates." },
      { code: "rrb.ga.geography", name: "Physical, Social and Economic Geography of India and World",
        description: "Physical features, climate, rivers, agriculture; economic geography of India.",
      },
      { code: "rrb.ga.polity", name: "Indian Polity and Governance — Constitution and Political System",
        description: "Constitution, fundamental rights, Parliament, judiciary, panchayati raj.",
      },
      { code: "rrb.ga.economy", name: "General Scientific and Technological Developments including Space and Nuclear Programs of India",
        description: "ISRO missions, DRDO, atomic energy programmes; major Indian scientific milestones.",
      },
      { code: "rrb.ga.un_orgs", name: "UN and Other Important World Organisations", description: "UN bodies, IMF, World Bank, WTO, WHO and similar international organisations." },
      { code: "rrb.ga.environment", name: "Environmental Issues Concerning India and the World", description: "Climate change, pollution, biodiversity, environmental treaties." },
      { code: "rrb.ga.basic_computer", name: "Basics of Computers and Computer Applications", description: "Hardware, software, internet, MS Office, basic networking." },
      { code: "rrb.ga.abbreviations", name: "Common Abbreviations", description: "Frequently encountered abbreviations across science, finance, technology and government." },
      { code: "rrb.ga.transport", name: "Transport Systems in India", description: "Indian Railways, road network, ports and aviation — facts and history." },
      { code: "rrb.ga.indian_economy", name: "Indian Economy", description: "Banking, taxation, RBI, budget, economic indicators." },
      { code: "rrb.ga.flagship", name: "Famous Personalities of India and World",
        description: "Leaders, scientists, artists, sportspersons of national and international repute.",
      },
      { code: "rrb.ga.flora_fauna", name: "Flora and Fauna of India", description: "National parks, wildlife sanctuaries, endangered species, key flora and fauna." },
      { code: "rrb.ga.govt_schemes", name: "Important Government Programmes and Schemes of India", description: "Flagship welfare and development schemes — eligibility, ministry, year." },
      { code: "rrb.ga.awards_honours", name: "Awards and Honours", description: "Civilian, gallantry, sports and literary awards (Bharat Ratna, Padma, Arjuna, Jnanpith etc.)." },
    ],
  },
];

export async function seedRrbNtpcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "RRB_NTPC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — RRB_NTPC exam not found.");
  }
  console.log(`Seeding RRB NTPC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < rrbNtpcSyllabus.length; sIdx++) {
    const s = rrbNtpcSyllabus[sIdx];
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
  seedRrbNtpcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
