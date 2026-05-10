// NSEP (National Standard Examination in Physics) — full syllabus tree.
// Stage-1 Physics Olympiad. 80 MCQs (60 single + 20 multiple-correct), 3 hours.
// Scope: Class 11+12 NCERT physics + selected olympiad topics (no calculus depth beyond Class 12).
// Source: HBCSE olympiads.hbcse.tifr.res.in/how-to-prepare/syllabus/ + IAPT NSEP brochure.
//
// Run after seedExams: npx tsx seed/exams/nsep-syllabus.ts

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

export const nsepSyllabus: SubjectSeed[] = [
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      // ── MEASUREMENT AND MATHEMATICAL TOOLS ─────────────────────────────
      { code: "phy.units_measurement", name: "Units and Measurements",
        description: "SI units, dimensional analysis, significant figures and error analysis.",
        subtopics: [
          { code: "phy.units_measurement.dimensions", name: "Dimensional Analysis", description: "Use of dimensions to check equations and derive relations." },
          { code: "phy.units_measurement.errors", name: "Errors and Uncertainty", description: "Absolute, relative, percentage errors and propagation of errors." },
        ],
      },

      // ── KINEMATICS ─────────────────────────────────────────────────────
      { code: "phy.kinematics", name: "Kinematics",
        description: "Motion in 1D and 2D — velocity, acceleration, projectile and relative motion.",
        subtopics: [
          { code: "phy.kinematics.straight_line", name: "Motion in a Straight Line", description: "Position-time and velocity-time analysis with uniform and variable acceleration." },
          { code: "phy.kinematics.plane", name: "Motion in a Plane", description: "Vectors, projectile motion, uniform circular motion and relative velocity in 2D." },
        ],
      },

      // ── LAWS OF MOTION & DYNAMICS ──────────────────────────────────────
      { code: "phy.laws_of_motion", name: "Laws of Motion",
        description: "Newton's laws, friction, circular dynamics and dynamics of connected systems." },
      { code: "phy.work_energy_power", name: "Work, Energy and Power",
        description: "Work-energy theorem, conservative forces, potential energy and elastic/inelastic collisions." },
      { code: "phy.rotational_motion", name: "System of Particles and Rotational Motion",
        description: "Centre of mass, torque, angular momentum, moment of inertia, rolling motion." },
      { code: "phy.gravitation", name: "Gravitation",
        description: "Newton's law of gravitation, gravitational potential, orbital motion, Kepler's laws and escape velocity." },

      // ── PROPERTIES OF MATTER ───────────────────────────────────────────
      { code: "phy.solids", name: "Mechanical Properties of Solids",
        description: "Stress, strain, elastic moduli and Poisson ratio." },
      { code: "phy.fluids", name: "Mechanical Properties of Fluids",
        description: "Pressure, Pascal's law, buoyancy, surface tension, viscosity and Bernoulli's principle." },

      // ── HEAT AND THERMODYNAMICS ────────────────────────────────────────
      { code: "phy.thermal", name: "Thermal Properties of Matter",
        description: "Temperature, thermal expansion, calorimetry, heat transfer (conduction, convection, radiation) and blackbody laws." },
      { code: "phy.thermodynamics", name: "Thermodynamics",
        description: "Zeroth, first and second laws, isothermal/adiabatic processes, heat engines, refrigerators and entropy at school level.",
        subtopics: [
          { code: "phy.thermodynamics.first_law", name: "First Law and Processes", description: "Internal energy, work done by gases, P-V diagrams and cyclic processes." },
          { code: "phy.thermodynamics.second_law", name: "Second Law and Engines", description: "Carnot cycle, efficiency, refrigerator coefficient of performance." },
        ],
      },
      { code: "phy.kinetic_theory", name: "Kinetic Theory of Gases",
        description: "Ideal gas law, pressure of ideal gas, equipartition of energy and mean free path." },

      // ── OSCILLATIONS AND WAVES ─────────────────────────────────────────
      { code: "phy.oscillations", name: "Oscillations",
        description: "Simple harmonic motion, energy in SHM, simple/compound pendulum, damped and forced oscillations.",
        subtopics: [
          { code: "phy.oscillations.shm", name: "Simple Harmonic Motion", description: "Equation of SHM, springs, pendulums and superposition of SHMs." },
          { code: "phy.oscillations.damped_forced", name: "Damped and Forced Oscillations", description: "Damping, resonance and quality factor at qualitative level." },
        ],
      },
      { code: "phy.waves", name: "Waves",
        description: "Transverse and longitudinal waves, superposition, beats, standing waves, sound, Doppler effect.",
        subtopics: [
          { code: "phy.waves.travelling", name: "Travelling Waves", description: "Wave equation, speed in strings and gases, intensity." },
          { code: "phy.waves.standing", name: "Standing Waves and Resonance", description: "Strings fixed/free, organ pipes and resonance columns." },
          { code: "phy.waves.doppler", name: "Doppler Effect", description: "Doppler shift for sound for moving source/observer." },
        ],
      },

      // ── ELECTROSTATICS ─────────────────────────────────────────────────
      { code: "phy.electrostatics", name: "Electrostatics",
        description: "Coulomb's law, electric field, potential, Gauss's law and capacitance.",
        subtopics: [
          { code: "phy.electrostatics.field_potential", name: "Electric Field and Potential", description: "Field/potential due to point charges, dipoles and continuous distributions." },
          { code: "phy.electrostatics.gauss", name: "Gauss's Law", description: "Flux, applications to spherical, cylindrical and planar symmetries." },
          { code: "phy.electrostatics.capacitance", name: "Capacitance", description: "Parallel-plate capacitor, dielectrics, energy stored and combinations." },
        ],
      },

      // ── CURRENT ELECTRICITY ────────────────────────────────────────────
      { code: "phy.current_electricity", name: "Current Electricity",
        description: "Ohm's law, drift velocity, Kirchhoff's laws, Wheatstone bridge, potentiometer and meter bridge." },

      // ── MAGNETISM AND EMI ──────────────────────────────────────────────
      { code: "phy.magnetic_effects", name: "Magnetic Effects of Current and Magnetism",
        description: "Biot-Savart and Ampere's laws, force on a current-carrying conductor, moving-coil galvanometer, magnetic materials." },
      { code: "phy.emi", name: "Electromagnetic Induction",
        description: "Faraday's and Lenz's laws, motional EMF, self/mutual inductance, eddy currents." },
      { code: "phy.alternating_current", name: "Alternating Current",
        description: "RMS values, LCR circuits, resonance, power factor and transformers." },
      { code: "phy.em_waves", name: "Electromagnetic Waves",
        description: "Maxwell's equations qualitative, displacement current, EM spectrum and wave properties." },

      // ── OPTICS ─────────────────────────────────────────────────────────
      { code: "phy.ray_optics", name: "Ray Optics and Optical Instruments",
        description: "Reflection, refraction, total internal reflection, lenses, mirrors, microscope and telescope." },
      { code: "phy.wave_optics", name: "Wave Optics",
        description: "Huygens principle, interference (Young's double slit), diffraction at single slit and polarisation." },

      // ── MODERN PHYSICS ─────────────────────────────────────────────────
      { code: "phy.dual_nature", name: "Dual Nature of Radiation and Matter",
        description: "Photoelectric effect, Einstein's equation, de Broglie waves and Davisson-Germer experiment." },
      { code: "phy.atoms_nuclei", name: "Atoms and Nuclei",
        description: "Rutherford and Bohr models, hydrogen spectrum, nuclear binding energy, radioactivity and decay laws.",
        subtopics: [
          { code: "phy.atoms_nuclei.bohr", name: "Bohr Atom and Spectra", description: "Bohr postulates, energy levels and hydrogen spectral series." },
          { code: "phy.atoms_nuclei.nucleus", name: "Nuclei and Radioactivity", description: "Mass defect, binding energy, alpha/beta/gamma decay and half-life." },
        ],
      },
      { code: "phy.electronic_devices", name: "Electronic Devices",
        description: "Semiconductors, p-n junction, diode rectifiers and transistor basics as in NCERT Class 12." },

      // ── OLYMPIAD-STYLE EXTENSIONS ──────────────────────────────────────
      { code: "phy.problem_solving", name: "Olympiad-style Problem Solving",
        description: "Multi-concept problems, dimensional reasoning and order-of-magnitude estimation typical of NSEP." },
    ],
  },
];

export async function seedNsepSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "NSEP" } });
  if (!exam) {
    throw new Error("Run seedExams() first — NSEP exam not found.");
  }
  console.log(`Seeding NSEP syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < nsepSyllabus.length; sIdx++) {
    const s = nsepSyllabus[sIdx];
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
  seedNsepSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
