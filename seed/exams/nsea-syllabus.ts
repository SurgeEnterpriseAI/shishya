// NSEA (National Standard Examination in Astronomy) — full syllabus tree.
// Stage-1 Astronomy Olympiad. 80 MCQs, 3 hours.
// Scope: Class 11+12 physics & mathematics + observational/elementary astronomy.
// HBCSE notes: NSEA syllabus = NSEP physics scope + Class 12 mathematics + Elementary Astronomical Notions.
// Calculus-level math is not expected; emphasis on physics, mathematics and elementary astronomy.
// Source: HBCSE olympiads.hbcse.tifr.res.in/how-to-prepare/syllabus/ + IAPT NSEA brochure.
//
// Run after seedExams: npx tsx seed/exams/nsea-syllabus.ts

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

export const nseaSyllabus: SubjectSeed[] = [
  // ── PHYSICS (NSEP-aligned) ─────────────────────────────────────────────
  {
    code: "PHYSICS",
    name: "Physics",
    weight: 1,
    topics: [
      { code: "astro.phy.units_measurement", name: "Units and Measurements",
        description: "SI units, dimensional analysis, error analysis used heavily in astronomy estimation problems." },
      { code: "astro.phy.kinematics", name: "Kinematics",
        description: "Motion in 1D and 2D, projectile motion and relative motion." },
      { code: "astro.phy.laws_of_motion", name: "Laws of Motion",
        description: "Newton's laws, friction and circular dynamics." },
      { code: "astro.phy.work_energy_power", name: "Work, Energy and Power",
        description: "Work-energy theorem, conservation laws and elastic/inelastic collisions." },
      { code: "astro.phy.rotational_motion", name: "Rotational Motion",
        description: "Centre of mass, torque, angular momentum and moment of inertia." },
      { code: "astro.phy.gravitation", name: "Gravitation",
        description: "Newton's law of gravitation, gravitational potential, Kepler's laws and orbital mechanics — central to NSEA." },
      { code: "astro.phy.fluids", name: "Mechanical Properties of Solids and Fluids",
        description: "Elasticity, pressure, buoyancy, viscosity and Bernoulli's principle." },
      { code: "astro.phy.thermal_thermo", name: "Thermal Physics and Thermodynamics",
        description: "Heat transfer (conduction, convection, radiation), blackbody radiation and laws of thermodynamics." },
      { code: "astro.phy.kinetic_theory", name: "Kinetic Theory of Gases",
        description: "Ideal gas law, equipartition and mean free path — used in stellar atmosphere problems." },
      { code: "astro.phy.oscillations_waves", name: "Oscillations and Waves",
        description: "SHM, sound, superposition, beats and Doppler effect (used for radial-velocity problems)." },
      { code: "astro.phy.electrostatics", name: "Electrostatics",
        description: "Coulomb's law, electric field/potential, Gauss's law and capacitance." },
      { code: "astro.phy.current_electricity", name: "Current Electricity",
        description: "Ohm's law, Kirchhoff's laws, Wheatstone bridge and circuits." },
      { code: "astro.phy.magnetism_emi", name: "Magnetism and Electromagnetic Induction",
        description: "Magnetic effects of current, Faraday's law, AC circuits and electromagnetic waves." },
      { code: "astro.phy.optics", name: "Optics",
        description: "Reflection, refraction, lenses, telescopes, interference, diffraction and polarisation." },
      { code: "astro.phy.modern_physics", name: "Modern Physics",
        description: "Photoelectric effect, atoms, nuclei, radioactivity and elementary particle ideas." },
    ],
  },

  // ── MATHEMATICS (Class 12, calculus not expected) ─────────────────────
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "astro.math.sets_functions", name: "Sets, Relations and Functions",
        description: "Sets, relations, types of functions and inverse trigonometric functions." },
      { code: "astro.math.algebra", name: "Algebra",
        description: "Mathematical induction, complex numbers, quadratic equations, sequences and series." },
      { code: "astro.math.permutations_combinations", name: "Permutations and Combinations",
        description: "Counting principles, nPr/nCr and elementary combinatorial reasoning." },
      { code: "astro.math.binomial", name: "Binomial Theorem",
        description: "Binomial expansion, general term and applications." },
      { code: "astro.math.matrices_determinants", name: "Matrices and Determinants",
        description: "Matrix operations, determinants and solution of linear systems." },
      { code: "astro.math.coordinate_geometry", name: "Coordinate Geometry",
        description: "Straight lines, circles and conic sections." },
      { code: "astro.math.trigonometry", name: "Trigonometry",
        description: "Trigonometric ratios, identities, equations and inverse trig — heavily used in astronomy." },
      { code: "astro.math.three_d_geometry", name: "Three Dimensional Geometry",
        description: "Direction cosines, lines and planes in 3D." },
      { code: "astro.math.vectors", name: "Vectors",
        description: "Vector algebra, dot and cross products and applications." },
      { code: "astro.math.probability", name: "Probability and Statistics",
        description: "Probability rules, conditional probability, mean, variance and standard deviation." },
      { code: "astro.math.reasoning", name: "Mathematical Reasoning",
        description: "Logical statements, validity of arguments and elementary proof techniques." },
    ],
  },

  // ── ASTRONOMY (Elementary Astronomical Notions) ────────────────────────
  {
    code: "ASTRONOMY",
    name: "Elementary Astronomy",
    weight: 1,
    topics: [
      { code: "astro.astro.celestial_sphere", name: "Celestial Sphere and Coordinate Systems",
        description: "Celestial sphere, horizon, equatorial and ecliptic coordinate systems and conversions.",
        subtopics: [
          { code: "astro.astro.celestial_sphere.horizon", name: "Horizon System", description: "Altitude and azimuth, zenith, nadir and meridian." },
          { code: "astro.astro.celestial_sphere.equatorial", name: "Equatorial System", description: "Right ascension, declination, hour angle and sidereal time." },
          { code: "astro.astro.celestial_sphere.ecliptic", name: "Ecliptic System", description: "Ecliptic latitude/longitude, obliquity and equinoxes." },
        ],
      },
      { code: "astro.astro.spherical_trig", name: "Spherical Trigonometry",
        description: "Sine and cosine rules on a sphere — used for converting between coordinate systems." },
      { code: "astro.astro.time_systems", name: "Time and Calendars",
        description: "Solar and sidereal time, time zones, equation of time, Julian date and calendar systems." },
      { code: "astro.astro.diurnal_annual", name: "Diurnal and Annual Motion",
        description: "Daily rising/setting of stars, seasons, solstices, equinoxes and circumpolar stars." },
      { code: "astro.astro.solar_system", name: "Solar System",
        description: "Sun, planets, moons, asteroids, comets, meteors and dwarf planets — basic structure and properties.",
        subtopics: [
          { code: "astro.astro.solar_system.sun", name: "The Sun", description: "Solar structure, sunspots, solar activity and basic solar parameters." },
          { code: "astro.astro.solar_system.planets", name: "Planets and Moons", description: "Inner and outer planets, planetary atmospheres and major moons." },
          { code: "astro.astro.solar_system.minor", name: "Minor Bodies", description: "Asteroids, comets, meteors, meteorites and Kuiper-belt objects." },
        ],
      },
      { code: "astro.astro.celestial_mechanics", name: "Celestial Mechanics",
        description: "Kepler's laws, orbital elements, two-body problem and basic perturbations." },
      { code: "astro.astro.lunar_phenomena", name: "Lunar Phases, Eclipses and Tides",
        description: "Phases of the Moon, solar/lunar eclipses, occultations, transits and ocean tides." },
      { code: "astro.astro.stellar_basics", name: "Stellar Astronomy Basics",
        description: "Stellar magnitudes, spectral classification, HR diagram and stellar evolution overview.",
        subtopics: [
          { code: "astro.astro.stellar_basics.magnitudes", name: "Magnitudes and Distances", description: "Apparent and absolute magnitude, distance modulus and parallax." },
          { code: "astro.astro.stellar_basics.spectra", name: "Stellar Spectra", description: "Spectral types O-M, blackbody temperature and Wien's law." },
          { code: "astro.astro.stellar_basics.hr_diagram", name: "HR Diagram and Evolution", description: "Main sequence, giants, white dwarfs and qualitative stellar evolution." },
        ],
      },
      { code: "astro.astro.photometry", name: "Photometry and Spectroscopy",
        description: "Flux, luminosity, inverse-square law, photometric systems and spectral lines." },
      { code: "astro.astro.galaxies_cosmology", name: "Galaxies and Cosmology",
        description: "Milky Way structure, galaxy types, redshift, Hubble's law and basic cosmological ideas." },
      { code: "astro.astro.night_sky", name: "Night Sky and Constellations",
        description: "Familiar constellations, bright stars, asterisms and naked-eye object identification." },
      { code: "astro.astro.telescopes", name: "Telescopes and Instruments",
        description: "Refracting/reflecting telescopes, magnification, resolving power and modern observatories." },
      { code: "astro.astro.history", name: "History of Astronomy",
        description: "Major astronomers and milestones from ancient observations to modern astrophysics." },
    ],
  },
];

export async function seedNseaSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "NSEA" } });
  if (!exam) {
    throw new Error("Run seedExams() first — NSEA exam not found.");
  }
  console.log(`Seeding NSEA syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < nseaSyllabus.length; sIdx++) {
    const s = nseaSyllabus[sIdx];
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
  seedNseaSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
