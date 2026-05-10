// TS POLYCET (Telangana State Polytechnic Common Entrance Test) — full syllabus tree.
// Conducting body: State Board of Technical Education and Training, Telangana (polycet.sbtet.telangana.gov.in).
// Pattern: 150 MCQs in 2 hours. Mathematics 60 + Physics 30 + Chemistry 30 + Biology 30 (BIPC stream).
// MPC stream takes only Math/Phy/Chem (120 Qs effective), but full paper has 150. +1 / 0 (no negative).
// Syllabus level: Telangana SSC (Class 10) curriculum.
//
// Run after seedExams: npx tsx seed/exams/ts-polycet-syllabus.ts

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

export const tsPolycetSyllabus: SubjectSeed[] = [
  // ── MATHEMATICS (60 Qs) ──────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.real_numbers", name: "Real Numbers", description: "Euclid's division lemma, fundamental theorem of arithmetic, rational and irrational numbers." },
      { code: "math.sets", name: "Sets", description: "Set operations, types of sets, Venn diagrams, set-builder notation." },
      { code: "math.polynomials", name: "Polynomials", description: "Zeroes, division algorithm, relationship between zeroes and coefficients." },
      { code: "math.linear_equations_two", name: "Pair of Linear Equations in Two Variables", description: "Substitution, elimination, cross-multiplication, graphical interpretation." },
      { code: "math.quadratic_equations", name: "Quadratic Equations", description: "Factorisation, completing the square, quadratic formula, nature of roots." },
      { code: "math.progressions", name: "Progressions", description: "Arithmetic and geometric progressions, sum to n terms, applications." },
      { code: "math.coordinate_geometry", name: "Coordinate Geometry", description: "Distance, section, mid-point formulas, area of triangle, slope of line." },
      { code: "math.similar_triangles", name: "Similar Triangles", description: "BPT, criteria for similarity, areas of similar triangles, Pythagoras theorem." },
      { code: "math.tangents_secants", name: "Tangents and Secants to a Circle", description: "Tangent length, properties, sectors and segments." },
      { code: "math.mensuration", name: "Mensuration", description: "Surface area and volume — cuboid, cylinder, cone, sphere, frustum, combinations." },
      { code: "math.trigonometry", name: "Trigonometry", description: "Trigonometric ratios, identities, complementary angles, specific angles." },
      { code: "math.applications_trig", name: "Applications of Trigonometry", description: "Heights and distances using elevation and depression angles." },
      { code: "math.probability", name: "Probability", description: "Classical probability, simple events, problems on coins, dice, cards." },
      { code: "math.statistics", name: "Statistics", description: "Mean, median, mode of grouped data, cumulative frequency curves." },
      { code: "math.mathematical_modelling", name: "Mathematical Modelling", description: "Translating real situations into mathematical equations, solving and interpreting." },
    ],
  },

  // ── PHYSICS (30 Qs) ──────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.heat", name: "Heat", description: "Thermal equilibrium, specific heat capacity, latent heat, humidity, dew point." },
      { code: "phy.reflection_light", name: "Reflection of Light by Different Surfaces", description: "Plane and spherical mirrors, image formation, mirror formula, magnification." },
      { code: "phy.refraction_plane", name: "Refraction of Light at Plane Surfaces", description: "Snell's law, refractive index, total internal reflection, applications." },
      { code: "phy.refraction_curved", name: "Refraction of Light at Curved Surfaces", description: "Lens formula, image formation, magnification, lens combinations." },
      { code: "phy.human_eye", name: "Human Eye and Colourful World", description: "Vision defects, prism dispersion, scattering, rainbow, atmospheric refraction." },
      { code: "phy.electric_current", name: "Electric Current", description: "Ohm's law, resistivity, series and parallel resistors, electric power and energy." },
      { code: "phy.electromagnetism", name: "Electromagnetism", description: "Magnetic effects of current, electromagnetic induction, motor and generator principles." },
    ],
  },

  // ── CHEMISTRY (30 Qs) ─────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.acids_bases_salts", name: "Acids, Bases and Salts", description: "Properties, indicators, pH scale, common salts and their preparation." },
      { code: "chem.chemical_equations", name: "Chemical Equations and Reactions", description: "Balancing equations, types of reactions, redox reactions." },
      { code: "chem.metallurgy", name: "Principles of Metallurgy", description: "Concentration of ores, reduction techniques, refining processes." },
      { code: "chem.atomic_structure", name: "Structure of Atom", description: "Atomic models, Bohr's model, quantum numbers, electronic configuration." },
      { code: "chem.classification_elements", name: "Classification of Elements — Periodic Table", description: "Modern periodic law, trends in periodic table." },
      { code: "chem.chemical_bonding", name: "Chemical Bonding", description: "Ionic, covalent, coordinate bonds, Lewis structures, polarity." },
      { code: "chem.carbon_compounds", name: "Carbon and its Compounds", description: "Allotropes, hydrocarbons, functional groups, ethanol, ethanoic acid, soaps." },
    ],
  },

  // ── BIOLOGY (30 Qs) — for BIPC stream ────────────────────────────────
  {
    code: "BIOLOGY",
    name: "Biology",
    weight: 1,
    topics: [
      { code: "bio.nutrition", name: "Nutrition — Food Supplying System", description: "Modes of nutrition, photosynthesis in plants, human digestive system." },
      { code: "bio.respiration", name: "Respiration — Gas Exchange", description: "Aerobic and anaerobic respiration, gas exchange in plants and humans." },
      { code: "bio.transportation", name: "Transportation — Circulation in Living Beings", description: "Transport in plants — xylem and phloem; human circulatory system, heart, blood." },
      { code: "bio.excretion", name: "Excretion — Waste Disposal", description: "Excretion in plants and humans, structure of nephron, urine formation." },
      { code: "bio.coordination", name: "Coordination — Life Process", description: "Nervous and hormonal control, plant tropisms, reflex action, brain structure." },
      { code: "bio.reproduction", name: "Reproduction — Continuation of Species", description: "Asexual and sexual reproduction in plants and humans, reproductive health." },
      { code: "bio.heredity", name: "Heredity — From Parents to Progeny", description: "Mendel's laws, sex determination, variations and evolution basics." },
      { code: "bio.natural_resources", name: "Our Environment — Our Concern", description: "Ecosystems, food chains, biogeochemical cycles, biodiversity, conservation." },
      { code: "bio.cell_biology", name: "Cell — Structural and Functional Unit of Life", description: "Cell theory, prokaryotic vs eukaryotic, organelles, cell division." },
      { code: "bio.classification", name: "Diversity of Living Organisms", description: "Five-kingdom classification, plant and animal kingdom basics." },
    ],
  },
];

export async function seedTsPolycetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TS_POLYCET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TS_POLYCET exam not found.");
  }
  console.log(`Seeding TS POLYCET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tsPolycetSyllabus.length; sIdx++) {
    const s = tsPolycetSyllabus[sIdx];
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
    console.log(`  ${s.code} — ${s.topics.length} topics`);
  }
  console.log(`Seeded TS POLYCET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedTsPolycetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
