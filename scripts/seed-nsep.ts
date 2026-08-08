// One-shot seed for NSEP — National Standard Examination in Physics.
//
// Demand signal (Ask log): "NSEP" ×3 and "I need question generator
// for NSEP". We had NSEA (astronomy) but not NSEP. NSEP is the first
// stage of the International Physics Olympiad selection in India,
// conducted by IAPT (usually late November): ~60 questions in 120
// minutes (Part A1 single-correct ~48, A2 multi-correct ~12) at
// CBSE Class 11-12 + first-year-college depth.
//
// Idempotent — same pattern as seed-ap-amvi.ts.
// Usage: npx tsx --env-file=.env.local scripts/seed-nsep.ts

import { prisma } from "../src/lib/db/prisma";

const EXAM_CODE = "NSEP";

const EXAM_INFO = {
  code: EXAM_CODE,
  name: "National Standard Examination in Physics (NSEP)",
  shortName: "NSEP",
  category: "OLYMPIAD" as const,
  state: null as string | null,
  description:
    "National Standard Examination in Physics, conducted by the Indian Association of Physics Teachers (IAPT) — the first stage of India's selection for the International Physics Olympiad (IPhO). Roughly 60 questions in 120 minutes at Class 11-12 and early-college depth: mechanics, electromagnetism, thermodynamics, optics, waves and modern physics, with multi-concept problems and negative marking. Top performers qualify for INPhO. Open to students up to Class 12.",
  durationMin: 120,
  totalQuestions: 60,
  totalMarks: 216,
  marksPerQ: 3.6,
  negativeMark: 1,
  candidatesPerYear: 60_000,
  languages: ["EN"] as Array<"EN">,
  active: true,
};

interface SubjectSpec {
  code: string;
  name: string;
  weight: number;
  topics: Array<{ code: string; name: string; description: string }>;
}

const SUBJECTS: SubjectSpec[] = [
  {
    code: "mechanics",
    name: "Mechanics",
    weight: 0.3,
    topics: [
      { code: "mech.kinematics", name: "Kinematics & Projectiles", description: "1D/2D motion, relative velocity, projectile motion, graphs." },
      { code: "mech.dynamics", name: "Newton's Laws & Friction", description: "Force analysis, constraint relations, friction, pseudo-forces." },
      { code: "mech.energy", name: "Work, Energy & Momentum", description: "Work-energy theorem, conservation laws, collisions, centre of mass." },
      { code: "mech.rotation", name: "Rotational Mechanics", description: "Torque, angular momentum, moment of inertia, rolling motion." },
      { code: "mech.gravitation", name: "Gravitation & SHM", description: "Orbits, Kepler's laws, gravitational potential, oscillations, springs, pendulums." },
      { code: "mech.fluids", name: "Fluids & Elasticity", description: "Pressure, buoyancy, Bernoulli's theorem, viscosity, surface tension, stress-strain." },
    ],
  },
  {
    code: "em",
    name: "Electricity & Magnetism",
    weight: 0.25,
    topics: [
      { code: "em.electrostatics", name: "Electrostatics", description: "Coulomb's law, field, potential, Gauss's law, capacitors, dielectrics." },
      { code: "em.circuits", name: "Current Electricity & Circuits", description: "Kirchhoff's laws, RC circuits, bridges, instruments, EMF and internal resistance." },
      { code: "em.magnetism", name: "Magnetic Effects & Materials", description: "Biot-Savart, Ampere's law, forces on charges/currents, magnetic materials." },
      { code: "em.induction", name: "Electromagnetic Induction & AC", description: "Faraday's law, inductance, LCR circuits, resonance, transformers, EM waves." },
    ],
  },
  {
    code: "thermo",
    name: "Thermal Physics",
    weight: 0.15,
    topics: [
      { code: "thermo.heat", name: "Heat Transfer & Calorimetry", description: "Conduction, convection, radiation, Stefan's law, Newton's cooling, calorimetry." },
      { code: "thermo.ktg", name: "Kinetic Theory & Thermodynamics", description: "Ideal gas, kinetic theory, first/second law, heat engines, entropy, thermodynamic processes." },
    ],
  },
  {
    code: "optics",
    name: "Waves & Optics",
    weight: 0.15,
    topics: [
      { code: "optics.waves", name: "Waves & Sound", description: "Wave equation, superposition, standing waves, beats, Doppler effect." },
      { code: "optics.ray", name: "Ray Optics", description: "Mirrors, lenses, prisms, optical instruments, dispersion." },
      { code: "optics.wave", name: "Wave Optics", description: "Interference, Young's double slit, diffraction, polarisation." },
    ],
  },
  {
    code: "modern",
    name: "Modern Physics",
    weight: 0.15,
    topics: [
      { code: "modern.photoelectric", name: "Photoelectric Effect & Dual Nature", description: "Photons, de Broglie wavelength, photoelectric equations." },
      { code: "modern.atomic", name: "Atomic & Nuclear Physics", description: "Bohr model, spectra, radioactivity, nuclear reactions, binding energy." },
      { code: "modern.semiconductors", name: "Semiconductors & Electronics", description: "Diodes, transistors, logic gates, basic device physics." },
    ],
  },
];

async function main() {
  console.log(`Seeding ${EXAM_CODE}...`);
  await prisma.$transaction(async (tx) => {
    const exam = await tx.exam.upsert({ where: { code: EXAM_CODE }, create: EXAM_INFO, update: EXAM_INFO });
    console.log(`  exam upserted: ${exam.id}`);
    await tx.subject.deleteMany({ where: { examId: exam.id } });
    for (let i = 0; i < SUBJECTS.length; i++) {
      const s = SUBJECTS[i];
      const subj = await tx.subject.create({
        data: { examId: exam.id, code: s.code, name: s.name, weight: s.weight, orderIdx: i },
      });
      for (let j = 0; j < s.topics.length; j++) {
        const t = s.topics[j];
        await tx.topic.create({
          data: { subjectId: subj.id, code: t.code, name: t.name, description: t.description, orderIdx: j },
        });
      }
      console.log(`  + ${s.code} (${s.topics.length} topics)`);
    }
  });
  console.log("\nDone. Live at https://shishya.in/exams/NSEP");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
