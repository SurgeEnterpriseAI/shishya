// RRB ALP (Assistant Loco Pilot) CBT Stage 1 — full syllabus tree.
// 75 questions in 60 minutes, 1 mark each, −1/3 negative marking.
// Sections: Mathematics (20), General Intelligence & Reasoning (25),
//           General Science (20), General Awareness & Current Affairs (10).
// Difficulty: 10th standard (matriculation).
// Source: RRB ALP CEN-01/2024 notification (rrbcdg.gov.in) + Adda247 cross-check.
//
// Run after seedExams: npx tsx seed/exams/rrb-alp-syllabus.ts

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

export const rrbAlpSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS (20 Qs) ───────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 0.27,
    topics: [
      { code: "alp.math.number_system", name: "Number System", description: "Natural, whole, integers, rationals; divisibility and number properties." },
      { code: "alp.math.bodmas", name: "BODMAS / Simplification", description: "Order of operations, surds and simplification of expressions." },
      { code: "alp.math.decimals_fractions", name: "Decimals and Fractions", description: "Operations on and conversions between decimals and fractions." },
      { code: "alp.math.lcm_hcf", name: "LCM and HCF", description: "LCM/HCF of numbers, fractions and decimals; word problems." },
      { code: "alp.math.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership and proportion-based problems." },
      { code: "alp.math.percentage", name: "Percentage", description: "Conversion and applied percentage change problems." },
      { code: "alp.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of 2-D and 3-D figures." },
      { code: "alp.math.time_work", name: "Time and Work", description: "Work efficiency, joint work and combined-output problems." },
      { code: "alp.math.time_distance", name: "Time and Distance", description: "Trains, boats and streams, relative and average speed." },
      { code: "alp.math.si_ci", name: "Simple and Compound Interest", description: "SI, CI annual/half-yearly compounding, instalments." },
      { code: "alp.math.profit_loss", name: "Profit and Loss", description: "CP/SP, marked price, discount and profit/loss percentage." },
      { code: "alp.math.algebra", name: "Algebra", description: "Linear equations, simultaneous equations and basic identities." },
      { code: "alp.math.trigonometry", name: "Trigonometry", description: "Trigonometric ratios, identities and basic angle calculations." },
      { code: "alp.math.height_distance", name: "Height and Distance", description: "Application of trigonometry to find heights and distances." },
      { code: "alp.math.statistics", name: "Elementary Statistics", description: "Mean, median, mode, range and basic data tables." },
      { code: "alp.math.di", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
      { code: "alp.math.mixture", name: "Mixture and Allegation", description: "Two-component mixtures, replacement and allegation rule." },
      { code: "alp.math.pipes_cisterns", name: "Pipes and Cisterns", description: "Inlet/outlet pipes filling or emptying tanks." },
      { code: "alp.math.age", name: "Age Calculations", description: "Past, present and future age-relation problems." },
      { code: "alp.math.calendar_clock", name: "Calendar and Clock", description: "Day of the week, odd days; clock angles and hands meeting." },
      { code: "alp.math.square_root", name: "Square Root", description: "Square roots of numbers, decimals and surds." },
    ],
  },

  // ── GENERAL INTELLIGENCE & REASONING (25 Qs) ──────────────────────────
  {
    code: "REASONING",
    name: "General Intelligence and Reasoning",
    weight: 0.33,
    topics: [
      { code: "alp.reason.analogies", name: "Analogies", description: "Word, number and figural analogy pairs." },
      { code: "alp.reason.series", name: "Alphabetical and Number Series", description: "Find the next term in a letter, number or alphanumeric series." },
      { code: "alp.reason.coding_decoding", name: "Coding and Decoding", description: "Letter, number and conditional coding patterns." },
      { code: "alp.reason.math_operations", name: "Mathematical Operations", description: "Symbol substitution and balancing of arithmetic equations." },
      { code: "alp.reason.relationships", name: "Relationships", description: "Blood-relation problems and family-tree diagrams." },
      { code: "alp.reason.syllogism", name: "Syllogism", description: "Two/three-statement deductions using all/some/no quantifiers." },
      { code: "alp.reason.jumbling", name: "Jumbling", description: "Rearranging letters or words to form meaningful order." },
      { code: "alp.reason.venn", name: "Venn Diagram", description: "Set relationships between two to four overlapping categories." },
      { code: "alp.reason.di_sufficiency", name: "Data Interpretation and Sufficiency", description: "Tables/graphs and identifying minimum data needed." },
      { code: "alp.reason.conclusions", name: "Conclusions and Decision Making", description: "Logical conclusion-drawing and best-decision selection." },
      { code: "alp.reason.similarities_differences", name: "Similarities and Differences", description: "Identify common and odd elements between items." },
      { code: "alp.reason.analytical", name: "Analytical Reasoning", description: "Cause-effect, course-of-action and assumption-based problems." },
      { code: "alp.reason.classification", name: "Classification", description: "Pick the odd word, number or figure from a group." },
      { code: "alp.reason.directions", name: "Directions", description: "Compass-based movement, shortest distance and final direction." },
      { code: "alp.reason.statement_args", name: "Statements – Arguments and Assumptions", description: "Strong vs weak arguments and implicit assumptions." },
      { code: "alp.reason.figure_completion", name: "Figure Completion", description: "Choose the option that completes a missing part of a pattern." },
      { code: "alp.reason.counting_figures", name: "Counting of Figures", description: "Count triangles, squares or rectangles in a complex figure." },
      { code: "alp.reason.non_verbal", name: "Non-Verbal Reasoning", description: "Mirror image, water image, paper folding and embedded figures." },
    ],
  },

  // ── GENERAL SCIENCE (20 Qs) — 10th std level ─────────────────────────
  {
    code: "GENERAL_SCIENCE",
    name: "General Science",
    weight: 0.27,
    topics: [
      { code: "alp.gs.physics", name: "Physics",
        subtopics: [
          { code: "alp.gs.physics.units", name: "Units and Measurements", description: "SI units, fundamental and derived quantities." },
          { code: "alp.gs.physics.motion", name: "Force and Laws of Motion", description: "Newton's laws, momentum, friction and applications." },
          { code: "alp.gs.physics.gravitation", name: "Gravitation", description: "Universal gravitation, weight, free fall and satellites." },
          { code: "alp.gs.physics.work_energy", name: "Work, Energy and Power", description: "Forms of energy and energy conversions." },
          { code: "alp.gs.physics.heat", name: "Heat", description: "Temperature, specific heat, latent heat and heat transfer." },
          { code: "alp.gs.physics.light", name: "Light", description: "Reflection, refraction; mirrors, lenses and human eye." },
          { code: "alp.gs.physics.electricity", name: "Current Electricity", description: "Ohm's law, resistance, circuits and household electricity." },
          { code: "alp.gs.physics.magnetism", name: "Magnetism", description: "Magnetic field, electromagnets and electromagnetic induction." },
          { code: "alp.gs.physics.sound", name: "Sound", description: "Reflection of sound, echoes, audible range and SONAR." },
        ],
      },
      { code: "alp.gs.chemistry", name: "Chemistry",
        subtopics: [
          { code: "alp.gs.chemistry.matter", name: "Matter and Its States", description: "Solid, liquid, gas; physical and chemical changes." },
          { code: "alp.gs.chemistry.atomic", name: "Atomic Structure", description: "Atoms, molecules and basic atomic models." },
          { code: "alp.gs.chemistry.periodic", name: "Periodic Classification", description: "Modern periodic table and periodic properties." },
          { code: "alp.gs.chemistry.reactions", name: "Chemical Reactions", description: "Types of reactions, balancing equations and redox." },
          { code: "alp.gs.chemistry.acids_bases", name: "Acids, Bases and Salts", description: "pH scale, neutralisation and common salts." },
          { code: "alp.gs.chemistry.metals", name: "Metals and Non-Metals", description: "Properties, reactivity series and basic metallurgy." },
          { code: "alp.gs.chemistry.carbon", name: "Carbon and Its Compounds", description: "Allotropes, hydrocarbons and functional groups." },
        ],
      },
      { code: "alp.gs.biology", name: "Life Sciences (Biology)",
        subtopics: [
          { code: "alp.gs.biology.cells", name: "Cell Biology", description: "Cell structure, organelles and cell division." },
          { code: "alp.gs.biology.heredity", name: "Heredity and Evolution", description: "Mendelian genetics and basics of evolution." },
          { code: "alp.gs.biology.zoology", name: "Human Body and Zoology", description: "Animal tissues, blood and human organ systems." },
          { code: "alp.gs.biology.botany", name: "Botany", description: "Plant tissues, photosynthesis and plant hormones." },
          { code: "alp.gs.biology.diseases", name: "Human Diseases and Health", description: "Common communicable and non-communicable diseases." },
          { code: "alp.gs.biology.nutrients", name: "Nutrition", description: "Vitamins, minerals, deficiency diseases and balanced diet." },
          { code: "alp.gs.biology.ecology", name: "Ecology and Natural Resources", description: "Ecosystems, food chains and conservation." },
        ],
      },
    ],
  },

  // ── GENERAL AWARENESS & CURRENT AFFAIRS (10 Qs) ───────────────────────
  {
    code: "GA",
    name: "General Awareness and Current Affairs",
    weight: 0.13,
    topics: [
      { code: "alp.ga.current_affairs", name: "Current Affairs", description: "National and international events of the last 12 months." },
      { code: "alp.ga.science_tech", name: "Science and Technology", description: "Recent developments in science, IT and space (ISRO/DRDO)." },
      { code: "alp.ga.sports", name: "Sports", description: "Cups, trophies, players and recent national/international winners." },
      { code: "alp.ga.culture", name: "Art and Culture", description: "Indian festivals, dances, music and monuments." },
      { code: "alp.ga.personalities", name: "Personalities", description: "Notable people in news — politics, science, arts." },
      { code: "alp.ga.economy", name: "Economy", description: "Banking, RBI, Union Budget, schemes and economic indicators." },
      { code: "alp.ga.polity", name: "Polity", description: "Indian Constitution, Parliament, judiciary and key institutions." },
      { code: "alp.ga.awards", name: "Awards and Honours", description: "Padma awards, Bharat Ratna, Nobel and other major honours." },
      { code: "alp.ga.static_gk", name: "Static GK", description: "Important days, national symbols, capitals and currencies." },
      { code: "alp.ga.railways", name: "Railway General Awareness", description: "Indian Railways zones, headquarters, trains and milestones." },
    ],
  },
];

export async function seedRrbAlpSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "RRB_ALP" } });
  if (!exam) {
    throw new Error("Run seedExams() first — RRB_ALP exam not found.");
  }
  console.log(`Seeding RRB ALP syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < rrbAlpSyllabus.length; sIdx++) {
    const s = rrbAlpSyllabus[sIdx];
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
  seedRrbAlpSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
