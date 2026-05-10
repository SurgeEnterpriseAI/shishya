// GUJCET 2026 — full syllabus tree as published by GSEB on gseb.org / gujcet.gseb.org.
// Pattern: Physics + Chemistry + Mathematics, 40 questions each (engineering track) — 120 MCQs total, 3 hours.
// Curriculum basis: GSEB Class 12 Science (HSC) syllabus.
// Source: GSEB GUJCET 2026 Information Bulletin / Subject-wise syllabus PDF.
//
// Run after seedExams: npx tsx seed/exams/gujcet-syllabus.ts

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

export const gujcetSyllabus: SubjectSeed[] = [
  // ── PHYSICS ───────────────────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "phy.electric_charge_field", name: "Electric Charge and Electric Field", description: "Conservation and quantisation of charge, Coulomb's law, electric field due to point charges and dipoles, Gauss's law and applications." },
      { code: "phy.electrostatic_potential", name: "Electrostatic Potential and Capacitance", description: "Potential due to point charge and dipole, equipotential surfaces, capacitors in series and parallel, dielectrics, energy stored in a capacitor." },
      { code: "phy.current_electricity", name: "Current Electricity", description: "Drift velocity, Ohm's law, resistivity, temperature dependence, Kirchhoff's laws, Wheatstone bridge, potentiometer, internal resistance." },
      { code: "phy.magnetic_effect", name: "Magnetic Effect of Electric Current", description: "Biot-Savart law, magnetic field due to current loops and solenoids, Ampere's law, force on a moving charge, moving coil galvanometer." },
      { code: "phy.magnetism_matter", name: "Magnetism and Matter", description: "Bar magnet as an equivalent solenoid, magnetic dipole, Earth's magnetism, dia-, para- and ferromagnetism, hysteresis." },
      { code: "phy.em_induction", name: "Electromagnetic Induction", description: "Faraday's and Lenz's laws, motional EMF, eddy currents, self and mutual inductance, AC generator." },
      { code: "phy.alternating_current", name: "Alternating Current", description: "AC voltage applied to resistor, inductor and capacitor; LCR series circuit; resonance; power in AC circuits; transformers." },
      { code: "phy.em_waves", name: "Electromagnetic Waves", description: "Displacement current, Maxwell's equations qualitatively, properties of EM waves, electromagnetic spectrum and uses." },
      { code: "phy.ray_optics", name: "Ray Optics and Optical Instruments", description: "Reflection and refraction, total internal reflection, refraction at spherical surfaces, lenses, optical instruments — microscope and telescope." },
      { code: "phy.wave_optics", name: "Wave Optics", description: "Huygens' principle, interference and Young's double-slit experiment, diffraction at single slit, polarisation by reflection." },
      { code: "phy.dual_nature", name: "Dual Nature of Radiation and Matter", description: "Photoelectric effect, Einstein's photoelectric equation, particle nature of light, de Broglie wavelength, Davisson-Germer experiment." },
      { code: "phy.atoms", name: "Atoms", description: "Alpha-particle scattering, Rutherford and Bohr models of atom, hydrogen spectrum, energy level diagrams." },
      { code: "phy.nucleus", name: "Nucleus", description: "Composition and size of nucleus, mass-energy relation, mass defect, binding energy per nucleon, radioactivity, nuclear fission and fusion." },
      { code: "phy.semiconductor", name: "Semiconductor Electronics", description: "Energy bands in solids, intrinsic and extrinsic semiconductors, p-n junction, diodes, rectifier action, special-purpose diodes, transistors and logic gates." },
      { code: "phy.communication", name: "Communication System", description: "Elements of a communication system, bandwidth, propagation of EM waves in atmosphere, modulation — amplitude and frequency." },
    ],
  },

  // ── CHEMISTRY ─────────────────────────────────────────────────────────
  {
    code: "CHEMISTRY",
    name: "Chemistry",
    weight: 1,
    topics: [
      { code: "chem.solid_state", name: "Solid State", description: "Classification of solids, unit cells in two and three dimensional lattices, packing efficiency, density of cubic crystals, defects, electrical and magnetic properties." },
      { code: "chem.solutions", name: "Solutions", description: "Types of solutions, expression of concentration, solubility, vapour pressure, Raoult's law, colligative properties, abnormal molar mass, van't Hoff factor." },
      { code: "chem.electrochemistry", name: "Electrochemistry", description: "Redox reactions, conductance in electrolytic solutions, electrochemical cells, EMF, Nernst equation, Kohlrausch's law, batteries, fuel cells, corrosion." },
      { code: "chem.kinetics", name: "Chemical Kinetics", description: "Rate of reaction, factors affecting rate, order and molecularity, integrated rate equations, half-life, Arrhenius equation, collision theory." },
      { code: "chem.surface", name: "Surface Chemistry", description: "Adsorption and absorption, types of adsorption, catalysis, colloids, emulsions, micelles, properties of colloids." },
      { code: "chem.metallurgy", name: "General Principles and Processes of Isolation of Elements", description: "Occurrence and principles of extraction of metals, refining methods, metallurgy of aluminium, copper, zinc and iron." },
      { code: "chem.p_block_2", name: "p-Block Elements (Group 15-18)", description: "Group 15 (nitrogen family), 16 (oxygen family), 17 (halogens) and 18 (noble gases) — properties, anomalous behaviour, important compounds." },
      { code: "chem.d_f_block", name: "d- and f-Block Elements", description: "Transition elements, oxidation states, magnetic and catalytic properties, lanthanoid contraction, actinoids, important compounds." },
      { code: "chem.coordination", name: "Coordination Compounds (Complex Salts)", description: "Werner's theory, ligands, coordination number, IUPAC nomenclature, isomerism, valence bond and crystal field theories, importance in biology and industry." },
      { code: "chem.haloalkanes", name: "Haloalkanes and Haloarenes", description: "Nomenclature, methods of preparation, physical and chemical properties, mechanisms of nucleophilic substitution and elimination, polyhalogen compounds." },
      { code: "chem.alcohol_phenol_ether", name: "Alcohols, Phenols and Ethers", description: "Preparation and properties of alcohols, phenols and ethers; commercially important alcohols and phenols." },
      { code: "chem.aldehyde_ketone", name: "Aldehydes and Ketones", description: "Nomenclature, preparation, physical and chemical properties of aldehydes and ketones; nucleophilic addition reactions." },
      { code: "chem.carboxylic", name: "Ketones and Carboxylic Acids", description: "Acidity of carboxylic acids, methods of preparation, properties, important reactions and uses." },
      { code: "chem.nitrogen_organic", name: "Organic Compounds Containing Nitrogen", description: "Amines, classification, structure, preparation, properties; diazonium salts and their uses; cyanides and isocyanides." },
      { code: "chem.biomolecules", name: "Biomolecules", description: "Carbohydrates, proteins, enzymes, vitamins, nucleic acids — structure and biological importance." },
      { code: "chem.polymers", name: "Polymers", description: "Classification of polymers, methods of polymerisation, important natural and synthetic polymers, biodegradable polymers." },
      { code: "chem.everyday_life", name: "Chemistry in Everyday Life", description: "Drugs and their classification, chemicals in food, cleansing agents — soaps and detergents." },
    ],
  },

  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.complex", name: "Complex Numbers", description: "Algebra of complex numbers, modulus, argument, polar form, square roots and properties, geometric representation." },
      { code: "math.theory_equations", name: "Theory of Equations", description: "Polynomial equations, relation between roots and coefficients, nature of roots, transformation of equations." },
      { code: "math.sets_relations", name: "Sets, Relations and Functions", description: "Types of relations and functions, equivalence relations, composition and inverse of functions, binary operations." },
      { code: "math.permutation", name: "Permutation and Combination", description: "Fundamental principle of counting, factorial, nPr and nCr, applications in selection and arrangement problems." },
      { code: "math.matrices_det", name: "Matrices and Determinants", description: "Types of matrices, operations, transpose, determinants up to order 3, properties, adjoint and inverse, system of linear equations by matrix method." },
      { code: "math.limit", name: "Limit", description: "Limit of a function, algebra of limits, standard limits, limits at infinity and infinite limits." },
      { code: "math.indef_integration", name: "Indefinite Integration", description: "Integration as inverse of differentiation, methods of substitution, by parts and partial fractions, standard integrals." },
      { code: "math.def_integration", name: "Definite Integration", description: "Definite integral as a limit of a sum, fundamental theorem of calculus, properties, evaluation and area as definite integral." },
      { code: "math.vectors", name: "Vectors", description: "Vectors and scalars, addition, scalar and vector products, scalar triple product, applications to geometry." },
      { code: "math.three_d", name: "Three Dimensional Geometry", description: "Direction cosines and ratios, equations of a line and a plane, angle between lines, distance from a point to a plane." },
      { code: "math.probability", name: "Probability", description: "Conditional probability, multiplication theorem, independent events, Bayes' theorem, random variables and Bernoulli trials." },
    ],
  },
];

export async function seedGujcetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "GJ_GUJCET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — GJ_GUJCET exam not found.");
  }
  console.log(`Seeding GUJCET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < gujcetSyllabus.length; sIdx++) {
    const s = gujcetSyllabus[sIdx];
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
  seedGujcetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
