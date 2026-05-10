// RRB Group D (Level 1) CBT — full syllabus tree.
// 100 questions in 90 minutes, 1 mark each, −1/3 negative marking.
// Sections: Mathematics (25), General Intelligence & Reasoning (30),
//           General Science (25), General Awareness & Current Affairs (20).
// Source: RRB CEN-08/2024 Level 1 notification (rrbcdg.gov.in) + Adda247 cross-check.
//
// Run after seedExams: npx tsx seed/exams/rrb-group-d-syllabus.ts

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

export const rrbGroupDSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS (25 Qs) ───────────────────────────────────────────────
  {
    code: "MATH",
    name: "Mathematics",
    weight: 0.25,
    topics: [
      { code: "rrbd.math.number_system", name: "Number System", description: "Natural, whole, integers, rationals; divisibility tests and number properties." },
      { code: "rrbd.math.bodmas", name: "BODMAS", description: "Order of operations for simplification of expressions." },
      { code: "rrbd.math.decimals_fractions", name: "Decimals and Fractions", description: "Operations on and conversions between decimals and fractions." },
      { code: "rrbd.math.lcm_hcf", name: "LCM and HCF", description: "LCM/HCF of numbers, fractions and decimals; word problems." },
      { code: "rrbd.math.ratio_proportion", name: "Ratio and Proportion", description: "Compound ratio, partnership and proportion-based problems." },
      { code: "rrbd.math.percentage", name: "Percentage", description: "Conversion and applied percentage change problems." },
      { code: "rrbd.math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of 2-D and 3-D figures." },
      { code: "rrbd.math.time_work", name: "Time and Work", description: "Work efficiency, pipes and cisterns, joint work." },
      { code: "rrbd.math.time_distance", name: "Time and Distance", description: "Trains, boats and streams, relative and average speed." },
      { code: "rrbd.math.si_ci", name: "Simple and Compound Interest", description: "SI, CI annual/half-yearly compounding, instalments." },
      { code: "rrbd.math.profit_loss", name: "Profit and Loss", description: "CP/SP/MP, discount, successive discount and profit/loss %." },
      { code: "rrbd.math.algebra", name: "Algebra", description: "Linear equations, simultaneous equations and basic identities." },
      { code: "rrbd.math.geometry", name: "Geometry", description: "Lines, angles, triangles, circles — basic theorems." },
      { code: "rrbd.math.trigonometry", name: "Trigonometry", description: "Trigonometric ratios, identities and heights and distances." },
      { code: "rrbd.math.elementary_statistics", name: "Elementary Statistics", description: "Mean, median, mode, range and basic data interpretation." },
      { code: "rrbd.math.square_root", name: "Square Root", description: "Square roots of numbers, decimals and surds." },
      { code: "rrbd.math.age", name: "Age Calculations", description: "Past, present and future age-relation problems." },
      { code: "rrbd.math.calendar_clock", name: "Calendar and Clock", description: "Day of the week, odd days; clock angles, hands meeting." },
      { code: "rrbd.math.pipes_cisterns", name: "Pipes and Cisterns", description: "Inlet/outlet pipes filling or emptying tanks." },
    ],
  },

  // ── GENERAL INTELLIGENCE & REASONING (30 Qs) ──────────────────────────
  {
    code: "REASONING",
    name: "General Intelligence and Reasoning",
    weight: 0.30,
    topics: [
      { code: "rrbd.reason.analogies", name: "Analogies", description: "Word, number and figural analogy pairs." },
      { code: "rrbd.reason.series", name: "Alphabetical and Number Series", description: "Find the next term in a letter, number or alphanumeric series." },
      { code: "rrbd.reason.coding_decoding", name: "Coding and Decoding", description: "Letter, number and conditional coding patterns." },
      { code: "rrbd.reason.math_operations", name: "Mathematical Operations", description: "Symbol substitution and balancing of arithmetic equations." },
      { code: "rrbd.reason.relationships", name: "Relationships", description: "Blood-relation problems and family-tree diagrams." },
      { code: "rrbd.reason.syllogism", name: "Syllogism", description: "Two/three-statement deductions using all/some/no quantifiers." },
      { code: "rrbd.reason.jumbling", name: "Jumbling", description: "Rearranging letters or words to form meaningful order." },
      { code: "rrbd.reason.venn", name: "Venn Diagram", description: "Set relationships between two to four overlapping categories." },
      { code: "rrbd.reason.di_sufficiency", name: "Data Interpretation and Sufficiency", description: "Tables and graphs plus identifying minimum data needed." },
      { code: "rrbd.reason.conclusions", name: "Conclusions and Decision Making", description: "Logical conclusion-drawing and best-decision selection." },
      { code: "rrbd.reason.similarities_differences", name: "Similarities and Differences", description: "Identify common and odd elements between items." },
      { code: "rrbd.reason.analytical", name: "Analytical Reasoning", description: "Cause-effect, course-of-action and assumption-based problems." },
      { code: "rrbd.reason.classification", name: "Classification", description: "Pick the odd word, number or figure from a group." },
      { code: "rrbd.reason.directions", name: "Directions", description: "Compass-based movement, shortest distance, final direction." },
      { code: "rrbd.reason.statement_args", name: "Statements – Arguments and Assumptions", description: "Strong vs weak arguments and implicit assumptions." },
    ],
  },

  // ── GENERAL SCIENCE (25 Qs) ───────────────────────────────────────────
  {
    code: "GENERAL_SCIENCE",
    name: "General Science",
    weight: 0.25,
    topics: [
      { code: "rrbd.gs.physics", name: "Physics",
        subtopics: [
          { code: "rrbd.gs.physics.units", name: "Units and Measurements", description: "SI units, fundamental and derived quantities." },
          { code: "rrbd.gs.physics.motion", name: "Motion, Force and Laws of Motion", description: "Newton's laws, momentum and applications." },
          { code: "rrbd.gs.physics.gravitation", name: "Gravitation", description: "Universal gravitation, weight, free fall, satellites." },
          { code: "rrbd.gs.physics.work_energy", name: "Work, Energy and Power", description: "Forms of energy and energy conversions." },
          { code: "rrbd.gs.physics.pressure", name: "Pressure", description: "Atmospheric, fluid and solid pressure; Pascal's law." },
          { code: "rrbd.gs.physics.heat", name: "Heat and Thermodynamics", description: "Temperature, specific heat, latent heat, transfer modes." },
          { code: "rrbd.gs.physics.sound_waves", name: "Sound and Waves", description: "Reflection, refraction of sound; wave properties." },
          { code: "rrbd.gs.physics.light", name: "Light – Reflection and Refraction", description: "Mirrors, lenses, prism, dispersion and human eye." },
          { code: "rrbd.gs.physics.electricity", name: "Current Electricity", description: "Ohm's law, resistance, circuits, household electricity." },
          { code: "rrbd.gs.physics.magnetism", name: "Magnetism and Magnetic Effects", description: "Magnetic field, electromagnets, electromagnetic induction." },
          { code: "rrbd.gs.physics.energy_sources", name: "Energy Sources", description: "Conventional and non-conventional energy sources." },
          { code: "rrbd.gs.physics.instruments", name: "Scientific Instruments and Inventions", description: "Common instruments, units and major physics inventors." },
        ],
      },
      { code: "rrbd.gs.chemistry", name: "Chemistry",
        subtopics: [
          { code: "rrbd.gs.chemistry.matter", name: "Matter and Its States", description: "Solid, liquid, gas, plasma; physical and chemical changes." },
          { code: "rrbd.gs.chemistry.atomic", name: "Atomic Structure", description: "Atoms, molecules, isotopes, isobars and atomic models." },
          { code: "rrbd.gs.chemistry.periodic", name: "Periodic Classification", description: "Modern periodic table and periodic properties." },
          { code: "rrbd.gs.chemistry.bonding", name: "Chemical Bonding", description: "Ionic, covalent and metallic bonding." },
          { code: "rrbd.gs.chemistry.reactions", name: "Chemical Reactions and Equations", description: "Types of reactions, balancing equations, redox." },
          { code: "rrbd.gs.chemistry.acids_bases", name: "Acids, Bases and Salts", description: "pH scale, neutralisation, common salts." },
          { code: "rrbd.gs.chemistry.metals", name: "Metals and Non-Metals", description: "Properties, reactivity series and metallurgy basics." },
          { code: "rrbd.gs.chemistry.carbon", name: "Carbon and Its Compounds", description: "Allotropes of carbon, hydrocarbons, functional groups." },
          { code: "rrbd.gs.chemistry.fuels_combustion", name: "Combustion and Fuels", description: "Types of combustion, calorific value, common fuels." },
          { code: "rrbd.gs.chemistry.synthetic", name: "Synthetic Fibres and Plastics", description: "Polymers, types of plastics and their uses." },
          { code: "rrbd.gs.chemistry.electrolysis", name: "Electrolysis", description: "Electrolytic cell, Faraday's laws, electroplating." },
        ],
      },
      { code: "rrbd.gs.biology", name: "Life Sciences (Biology)",
        subtopics: [
          { code: "rrbd.gs.biology.cells", name: "Cell Biology", description: "Cell structure, organelles, cell division." },
          { code: "rrbd.gs.biology.classification", name: "Classification of Organisms", description: "Five-kingdom classification and major taxa." },
          { code: "rrbd.gs.biology.heredity", name: "Heredity and Evolution", description: "Mendelian genetics, DNA, theory of evolution." },
          { code: "rrbd.gs.biology.zoology", name: "Zoology", description: "Animal kingdom, tissues, blood and human organ systems." },
          { code: "rrbd.gs.biology.botany", name: "Botany", description: "Plant kingdom, morphology, photosynthesis and plant hormones." },
          { code: "rrbd.gs.biology.diseases", name: "Human Diseases", description: "Communicable and non-communicable diseases and prevention." },
          { code: "rrbd.gs.biology.nutrition", name: "Nutrition and Nutrients", description: "Vitamins, minerals, deficiency diseases and balanced diet." },
          { code: "rrbd.gs.biology.ecology", name: "Ecology and Natural Resources", description: "Ecosystems, food chains, conservation of resources." },
        ],
      },
    ],
  },

  // ── GENERAL AWARENESS & CURRENT AFFAIRS (20 Qs) ───────────────────────
  {
    code: "GA",
    name: "General Awareness and Current Affairs",
    weight: 0.20,
    topics: [
      { code: "rrbd.ga.science_tech", name: "Science and Technology", description: "Recent developments in science, technology and space (ISRO/DRDO)." },
      { code: "rrbd.ga.sports", name: "Sports", description: "Cups, trophies, players and recent national/international winners." },
      { code: "rrbd.ga.culture", name: "Culture", description: "Indian festivals, dances, music and monuments." },
      { code: "rrbd.ga.personalities", name: "Personalities", description: "Notable people in news — politics, science, arts." },
      { code: "rrbd.ga.economics", name: "Economics", description: "Banking, RBI, Union Budget, schemes and economic indicators." },
      { code: "rrbd.ga.politics", name: "Politics", description: "Indian polity, recent legislation and key political events." },
      { code: "rrbd.ga.history", name: "Indian History", description: "Important events from ancient, medieval and modern India." },
      { code: "rrbd.ga.geography", name: "Indian and World Geography", description: "Physical features, rivers, capitals and economic geography." },
      { code: "rrbd.ga.awards", name: "Awards and Honours", description: "Padma awards, Bharat Ratna, Nobel and other major honours." },
      { code: "rrbd.ga.current_affairs", name: "Current Affairs", description: "National and international events of the last 12 months." },
      { code: "rrbd.ga.railways", name: "Railway General Awareness", description: "Indian Railways zones, headquarters, trains and milestones." },
    ],
  },
];

export async function seedRrbGroupDSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "RRB_GROUP_D" } });
  if (!exam) {
    throw new Error("Run seedExams() first — RRB_GROUP_D exam not found.");
  }
  console.log(`Seeding RRB Group D syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < rrbGroupDSyllabus.length; sIdx++) {
    const s = rrbGroupDSyllabus[sIdx];
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
  seedRrbGroupDSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
