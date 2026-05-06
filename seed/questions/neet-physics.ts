// NEET UG — Physics — 50 sample questions covering Class 11 + 12.
// AI-drafted, awaiting SME validation. Numerics double-checked at authoring time.
//
// Run after seedNeetUgSyllabus(): npx tsx seed/questions/neet-physics.ts

import { PrismaClient, Difficulty, QuestionType, Language, QuestionSource } from "@prisma/client";
const prisma = new PrismaClient();

interface QuestionSeed {
  topicCode: string;
  difficulty: Difficulty;
  type?: QuestionType;
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  language?: Language;
  tags?: string[];
}

export const neetPhysicsQuestions: QuestionSeed[] = [
  // ── Kinematics (4) ───────────────────────────────────────────────────
  {
    topicCode: "neet.phy.kinematics",
    difficulty: "MEDIUM",
    body: "A particle moves along the x-axis with position x(t) = 3t² − 2t + 1 (in metres, t in seconds). Its velocity at t = 2 s is:",
    options: [
      { key: "A", text: "8 m/s" },
      { key: "B", text: "10 m/s" },
      { key: "C", text: "12 m/s" },
      { key: "D", text: "6 m/s" },
    ],
    answerKey: "B",
    solution: "v(t) = dx/dt = 6t − 2. At t = 2 s, v = 12 − 2 = 10 m/s.",
    tags: ["differentiation"],
  },
  {
    topicCode: "neet.phy.kinematics",
    difficulty: "EASY",
    body: "A stone is dropped from a tower of height 80 m (g = 10 m/s²). Time to reach the ground is:",
    options: [
      { key: "A", text: "2 s" },
      { key: "B", text: "3 s" },
      { key: "C", text: "4 s" },
      { key: "D", text: "5 s" },
    ],
    answerKey: "C",
    solution: "Using h = ½gt²: 80 = ½ × 10 × t² ⇒ t² = 16 ⇒ t = 4 s.",
    tags: ["free-fall"],
  },
  {
    topicCode: "neet.phy.kinematics",
    difficulty: "EASY",
    body: "A car accelerates from rest at 4 m/s² for 5 s. Distance covered is:",
    options: [
      { key: "A", text: "25 m" },
      { key: "B", text: "50 m" },
      { key: "C", text: "100 m" },
      { key: "D", text: "200 m" },
    ],
    answerKey: "B",
    solution: "s = ut + ½at² = 0 + ½ × 4 × 25 = 50 m.",
    tags: ["uniform-acceleration"],
  },
  {
    topicCode: "neet.phy.kinematics",
    difficulty: "MEDIUM",
    body: "A body is projected at 30° above horizontal with initial speed 20 m/s (g = 10 m/s²). Total time of flight is:",
    options: [
      { key: "A", text: "1 s" },
      { key: "B", text: "2 s" },
      { key: "C", text: "√3 s" },
      { key: "D", text: "4 s" },
    ],
    answerKey: "B",
    solution: "T = 2u sinθ / g = 2 × 20 × sin30° / 10 = 2 × 20 × 0.5 / 10 = 2 s.",
    tags: ["projectile"],
  },

  // ── Laws of Motion (4) ───────────────────────────────────────────────
  {
    topicCode: "neet.phy.laws_motion",
    difficulty: "EASY",
    body: "A 5 kg block experiences a net force of 20 N. Its acceleration is:",
    options: [
      { key: "A", text: "2 m/s²" },
      { key: "B", text: "4 m/s²" },
      { key: "C", text: "5 m/s²" },
      { key: "D", text: "100 m/s²" },
    ],
    answerKey: "B",
    solution: "Newton's second law: a = F/m = 20/5 = 4 m/s².",
    tags: ["newton-second"],
  },
  {
    topicCode: "neet.phy.laws_motion",
    difficulty: "MEDIUM",
    body: "A 10 kg block rests on a horizontal surface with coefficient of friction μ = 0.3 (g = 10 m/s²). The minimum force needed to start the block sliding is:",
    options: [
      { key: "A", text: "30 N" },
      { key: "B", text: "100 N" },
      { key: "C", text: "50 N" },
      { key: "D", text: "10 N" },
    ],
    answerKey: "A",
    solution: "Limiting friction = μmg = 0.3 × 10 × 10 = 30 N. Force must just exceed this.",
    tags: ["static-friction"],
  },
  {
    topicCode: "neet.phy.laws_motion",
    difficulty: "EASY",
    body: "A particle moves in a circle of radius 2 m at constant speed 4 m/s. Its centripetal acceleration is:",
    options: [
      { key: "A", text: "4 m/s²" },
      { key: "B", text: "8 m/s²" },
      { key: "C", text: "16 m/s²" },
      { key: "D", text: "32 m/s²" },
    ],
    answerKey: "B",
    solution: "a_c = v² / r = 16 / 2 = 8 m/s².",
    tags: ["circular-motion"],
  },
  {
    topicCode: "neet.phy.laws_motion",
    difficulty: "EASY",
    body: "A 2 kg mass hangs at rest from a string (g = 10 m/s²). The tension in the string is:",
    options: [
      { key: "A", text: "5 N" },
      { key: "B", text: "10 N" },
      { key: "C", text: "20 N" },
      { key: "D", text: "40 N" },
    ],
    answerKey: "C",
    solution: "Body in equilibrium: T = mg = 2 × 10 = 20 N.",
    tags: ["tension"],
  },

  // ── Work, Energy, Power (3) ──────────────────────────────────────────
  {
    topicCode: "neet.phy.work_energy",
    difficulty: "EASY",
    body: "Kinetic energy of a 4 kg body moving at 5 m/s is:",
    options: [
      { key: "A", text: "25 J" },
      { key: "B", text: "50 J" },
      { key: "C", text: "100 J" },
      { key: "D", text: "200 J" },
    ],
    answerKey: "B",
    solution: "KE = ½mv² = 0.5 × 4 × 25 = 50 J.",
    tags: ["kinetic-energy"],
  },
  {
    topicCode: "neet.phy.work_energy",
    difficulty: "MEDIUM",
    body: "A 50 N force displaces a body by 4 m. The angle between force and displacement is 60°. Work done is:",
    options: [
      { key: "A", text: "50 J" },
      { key: "B", text: "100 J" },
      { key: "C", text: "200 J" },
      { key: "D", text: "173 J" },
    ],
    answerKey: "B",
    solution: "W = F·d·cosθ = 50 × 4 × cos60° = 50 × 4 × 0.5 = 100 J.",
    tags: ["work"],
  },
  {
    topicCode: "neet.phy.work_energy",
    difficulty: "MEDIUM",
    body: "A pump lifts 100 kg of water per second to a height of 10 m (g = 10 m/s²). The minimum power required is:",
    options: [
      { key: "A", text: "1 kW" },
      { key: "B", text: "5 kW" },
      { key: "C", text: "10 kW" },
      { key: "D", text: "100 kW" },
    ],
    answerKey: "C",
    solution: "P = (mgh)/t = (100 × 10 × 10)/1 = 10 000 W = 10 kW.",
    tags: ["power"],
  },

  // ── Rotational (3) ───────────────────────────────────────────────────
  {
    topicCode: "neet.phy.rotational",
    difficulty: "EASY",
    body: "Moment of inertia of a uniform solid sphere of mass M and radius R about its diameter is:",
    options: [
      { key: "A", text: "(1/2) M R²" },
      { key: "B", text: "(2/5) M R²" },
      { key: "C", text: "(2/3) M R²" },
      { key: "D", text: "M R²" },
    ],
    answerKey: "B",
    solution: "Standard result for a solid sphere about a diameter: I = (2/5) M R².",
    tags: ["moment-of-inertia"],
  },
  {
    topicCode: "neet.phy.rotational",
    difficulty: "EASY",
    body: "A disc of moment of inertia 2 kg·m² rotates at 4 rad/s. Its angular momentum is:",
    options: [
      { key: "A", text: "4 kg·m²/s" },
      { key: "B", text: "6 kg·m²/s" },
      { key: "C", text: "8 kg·m²/s" },
      { key: "D", text: "16 kg·m²/s" },
    ],
    answerKey: "C",
    solution: "L = Iω = 2 × 4 = 8 kg·m²/s.",
    tags: ["angular-momentum"],
  },
  {
    topicCode: "neet.phy.rotational",
    difficulty: "EASY",
    body: "A wheel with moment of inertia 5 kg·m² has angular acceleration 3 rad/s². The torque on it is:",
    options: [
      { key: "A", text: "8 N·m" },
      { key: "B", text: "15 N·m" },
      { key: "C", text: "1.67 N·m" },
      { key: "D", text: "12 N·m" },
    ],
    answerKey: "B",
    solution: "Newton's second law for rotation: τ = Iα = 5 × 3 = 15 N·m.",
    tags: ["torque"],
  },

  // ── Gravitation (2) ──────────────────────────────────────────────────
  {
    topicCode: "neet.phy.gravitation",
    difficulty: "MEDIUM",
    body: "Approximate escape velocity from Earth's surface (g = 9.8 m/s², R = 6400 km) is:",
    options: [
      { key: "A", text: "7.9 km/s" },
      { key: "B", text: "9.8 km/s" },
      { key: "C", text: "11.2 km/s" },
      { key: "D", text: "22.4 km/s" },
    ],
    answerKey: "C",
    solution: "v_e = √(2gR) = √(2 × 9.8 × 6.4 × 10⁶) ≈ √(1.25 × 10⁸) ≈ 1.12 × 10⁴ m/s = 11.2 km/s.",
    tags: ["escape-velocity"],
  },
  {
    topicCode: "neet.phy.gravitation",
    difficulty: "EASY",
    body: "Orbital speed of a satellite in a circular orbit of radius r around a planet of mass M is:",
    options: [
      { key: "A", text: "√(GM/r)" },
      { key: "B", text: "√(2GM/r)" },
      { key: "C", text: "GM/r" },
      { key: "D", text: "GM/r²" },
    ],
    answerKey: "A",
    solution: "Gravitational pull provides centripetal force: GMm/r² = mv²/r ⇒ v = √(GM/r).",
    tags: ["orbital"],
  },

  // ── Properties of Bulk Matter (2) ────────────────────────────────────
  {
    topicCode: "neet.phy.solids_fluids",
    difficulty: "HARD",
    body: "A wire 2 m long with cross-section 1 mm² stretches by 1 mm under a 100 N load. Young's modulus of the material is:",
    options: [
      { key: "A", text: "1 × 10¹¹ N/m²" },
      { key: "B", text: "2 × 10¹¹ N/m²" },
      { key: "C", text: "5 × 10¹⁰ N/m²" },
      { key: "D", text: "1 × 10⁹ N/m²" },
    ],
    answerKey: "B",
    solution:
      "Y = (F/A) / (ΔL/L) = (100 / 1×10⁻⁶) / (1×10⁻³ / 2) = 10⁸ × 2000 = 2 × 10¹¹ N/m².",
    tags: ["young-modulus"],
  },
  {
    topicCode: "neet.phy.solids_fluids",
    difficulty: "EASY",
    body: "Surface tension has the same dimensions as:",
    options: [
      { key: "A", text: "Force per unit length" },
      { key: "B", text: "Force per unit area" },
      { key: "C", text: "Pressure" },
      { key: "D", text: "Energy per unit length" },
    ],
    answerKey: "A",
    solution:
      "Surface tension = force / length = N/m, equivalently energy per unit area = J/m². The first option is the standard definition.",
    tags: ["dimensions"],
  },

  // ── Thermodynamics (3) ───────────────────────────────────────────────
  {
    topicCode: "neet.phy.thermodynamics",
    difficulty: "EASY",
    body: "A system absorbs 200 J of heat and does 80 J of work. The change in internal energy is:",
    options: [
      { key: "A", text: "120 J" },
      { key: "B", text: "280 J" },
      { key: "C", text: "80 J" },
      { key: "D", text: "200 J" },
    ],
    answerKey: "A",
    solution: "First law: ΔU = Q − W = 200 − 80 = 120 J.",
    tags: ["first-law"],
  },
  {
    topicCode: "neet.phy.thermodynamics",
    difficulty: "EASY",
    body: "A Carnot engine operates between 500 K and 300 K. Its efficiency is:",
    options: [
      { key: "A", text: "40%" },
      { key: "B", text: "60%" },
      { key: "C", text: "30%" },
      { key: "D", text: "20%" },
    ],
    answerKey: "A",
    solution: "η = 1 − T_cold/T_hot = 1 − 300/500 = 0.4 = 40%.",
    tags: ["carnot"],
  },
  {
    topicCode: "neet.phy.thermodynamics",
    difficulty: "MEDIUM",
    body: "For an ideal gas undergoing an isothermal process:",
    options: [
      { key: "A", text: "Internal energy increases" },
      { key: "B", text: "Internal energy decreases" },
      { key: "C", text: "Internal energy remains constant" },
      { key: "D", text: "Internal energy first rises, then falls" },
    ],
    answerKey: "C",
    solution:
      "Internal energy of an ideal gas depends only on temperature. In an isothermal process, T is constant ⇒ ΔU = 0.",
    tags: ["isothermal"],
  },

  // ── Kinetic Theory (2) ───────────────────────────────────────────────
  {
    topicCode: "neet.phy.kinetic_theory",
    difficulty: "MEDIUM",
    body:
      "If the molecular mass of a gas is doubled at constant temperature, its rms speed becomes:",
    options: [
      { key: "A", text: "√2 times" },
      { key: "B", text: "1/√2 times" },
      { key: "C", text: "2 times" },
      { key: "D", text: "1/2 times" },
    ],
    answerKey: "B",
    solution:
      "v_rms = √(3RT/M). If M is doubled, v_rms is multiplied by √(M/(2M)) = 1/√2.",
    tags: ["rms-speed"],
  },
  {
    topicCode: "neet.phy.kinetic_theory",
    difficulty: "EASY",
    body: "Number of degrees of freedom of a rigid diatomic gas molecule (at moderate temperature) is:",
    options: [
      { key: "A", text: "3" },
      { key: "B", text: "5" },
      { key: "C", text: "6" },
      { key: "D", text: "7" },
    ],
    answerKey: "B",
    solution:
      "3 translational + 2 rotational (rotation about the molecular axis is negligible). Total = 5.",
    tags: ["degrees-of-freedom"],
  },

  // ── Oscillations (2) ─────────────────────────────────────────────────
  {
    topicCode: "neet.phy.oscillations",
    difficulty: "MEDIUM",
    body: "A 2 kg mass attached to a spring of stiffness 200 N/m. Period of SHM is:",
    options: [
      { key: "A", text: "0.628 s" },
      { key: "B", text: "1.0 s" },
      { key: "C", text: "6.28 s" },
      { key: "D", text: "0.1 s" },
    ],
    answerKey: "A",
    solution:
      "T = 2π√(m/k) = 2π√(2/200) = 2π√(0.01) = 2π × 0.1 ≈ 0.628 s.",
    tags: ["spring-shm"],
  },
  {
    topicCode: "neet.phy.oscillations",
    difficulty: "MEDIUM",
    body: "A simple pendulum of length 1 m is at a place where g = π² m/s². Its time period is:",
    options: [
      { key: "A", text: "1 s" },
      { key: "B", text: "2 s" },
      { key: "C", text: "π s" },
      { key: "D", text: "2π s" },
    ],
    answerKey: "B",
    solution:
      "T = 2π√(L/g) = 2π√(1/π²) = 2π × (1/π) = 2 s.",
    tags: ["simple-pendulum"],
  },

  // ── Waves (2) ────────────────────────────────────────────────────────
  {
    topicCode: "neet.phy.waves",
    difficulty: "EASY",
    body: "For a travelling wave y = A sin(ωt − kx), the wave speed is:",
    options: [
      { key: "A", text: "ω/k" },
      { key: "B", text: "ωk" },
      { key: "C", text: "k/ω" },
      { key: "D", text: "Aω" },
    ],
    answerKey: "A",
    solution: "Phase velocity v = ω / k.",
    tags: ["wave-speed"],
  },
  {
    topicCode: "neet.phy.waves",
    difficulty: "EASY",
    body: "Two tuning forks of frequencies 256 Hz and 260 Hz are sounded together. The number of beats per second heard is:",
    options: [
      { key: "A", text: "2" },
      { key: "B", text: "4" },
      { key: "C", text: "8" },
      { key: "D", text: "516" },
    ],
    answerKey: "B",
    solution: "Beat frequency = |f₁ − f₂| = |256 − 260| = 4 beats/s.",
    tags: ["beats"],
  },

  // ── Electrostatics (4) ───────────────────────────────────────────────
  {
    topicCode: "neet.phy.electrostatics",
    difficulty: "MEDIUM",
    body: "Two point charges 2 μC and 3 μC are 6 cm apart in vacuum. The force between them (k = 9 × 10⁹ N·m²/C²) is:",
    options: [
      { key: "A", text: "15 N" },
      { key: "B", text: "1.5 N" },
      { key: "C", text: "0.15 N" },
      { key: "D", text: "150 N" },
    ],
    answerKey: "A",
    solution:
      "F = k q₁ q₂ / r² = 9 × 10⁹ × (2 × 10⁻⁶)(3 × 10⁻⁶) / (0.06)² = (54 × 10⁻³) / (3.6 × 10⁻³) = 15 N.",
    tags: ["coulomb"],
  },
  {
    topicCode: "neet.phy.electrostatics",
    difficulty: "EASY",
    body: "Energy stored in a 10 μF capacitor at 200 V is:",
    options: [
      { key: "A", text: "0.1 J" },
      { key: "B", text: "0.2 J" },
      { key: "C", text: "0.4 J" },
      { key: "D", text: "1 J" },
    ],
    answerKey: "B",
    solution:
      "U = ½CV² = 0.5 × 10 × 10⁻⁶ × (200)² = 0.5 × 10⁻⁵ × 4 × 10⁴ = 0.2 J.",
    tags: ["capacitor-energy"],
  },
  {
    topicCode: "neet.phy.electrostatics",
    difficulty: "MEDIUM",
    body: "Electric field at a distance of 10 cm from a 1 μC point charge in vacuum (k = 9 × 10⁹) is:",
    options: [
      { key: "A", text: "9 × 10³ N/C" },
      { key: "B", text: "9 × 10⁵ N/C" },
      { key: "C", text: "9 × 10⁷ N/C" },
      { key: "D", text: "9 × 10⁹ N/C" },
    ],
    answerKey: "B",
    solution:
      "E = k q / r² = 9 × 10⁹ × 10⁻⁶ / (0.1)² = 9 × 10³ / 0.01 = 9 × 10⁵ N/C.",
    tags: ["electric-field"],
  },
  {
    topicCode: "neet.phy.electrostatics",
    difficulty: "EASY",
    body: "If the separation between the plates of a parallel plate capacitor is doubled while area remains the same, capacitance becomes:",
    options: [
      { key: "A", text: "Half" },
      { key: "B", text: "One-fourth" },
      { key: "C", text: "Twice" },
      { key: "D", text: "Four times" },
    ],
    answerKey: "A",
    solution: "C = ε₀A/d ∝ 1/d. Doubling d halves the capacitance.",
    tags: ["parallel-plate"],
  },

  // ── Current Electricity (4) ──────────────────────────────────────────
  {
    topicCode: "neet.phy.current",
    difficulty: "EASY",
    body: "A 4 Ω resistor is connected to a 20 V battery (negligible internal resistance). The current is:",
    options: [
      { key: "A", text: "5 A" },
      { key: "B", text: "10 A" },
      { key: "C", text: "80 A" },
      { key: "D", text: "0.2 A" },
    ],
    answerKey: "A",
    solution: "Ohm's law: I = V/R = 20/4 = 5 A.",
    tags: ["ohms-law"],
  },
  {
    topicCode: "neet.phy.current",
    difficulty: "MEDIUM",
    body: "A bulb is rated 60 W at 220 V. Its resistance is approximately:",
    options: [
      { key: "A", text: "807 Ω" },
      { key: "B", text: "100 Ω" },
      { key: "C", text: "220 Ω" },
      { key: "D", text: "13 200 Ω" },
    ],
    answerKey: "A",
    solution: "R = V² / P = 220² / 60 = 48400 / 60 ≈ 807 Ω.",
    tags: ["bulb-resistance"],
  },
  {
    topicCode: "neet.phy.current",
    difficulty: "EASY",
    body: "Three identical 6 Ω resistors are connected in parallel. The equivalent resistance is:",
    options: [
      { key: "A", text: "2 Ω" },
      { key: "B", text: "3 Ω" },
      { key: "C", text: "6 Ω" },
      { key: "D", text: "18 Ω" },
    ],
    answerKey: "A",
    solution: "1/R = 1/6 + 1/6 + 1/6 = 3/6 ⇒ R = 2 Ω.",
    tags: ["parallel"],
  },
  {
    topicCode: "neet.phy.current",
    difficulty: "MEDIUM",
    body: "A cell of EMF 2 V and internal resistance 0.5 Ω is connected across an external resistance of 1.5 Ω. The current is:",
    options: [
      { key: "A", text: "0.5 A" },
      { key: "B", text: "1 A" },
      { key: "C", text: "1.5 A" },
      { key: "D", text: "2 A" },
    ],
    answerKey: "B",
    solution: "I = ε / (R + r) = 2 / (1.5 + 0.5) = 1 A.",
    tags: ["internal-resistance"],
  },

  // ── Magnetism (3) ────────────────────────────────────────────────────
  {
    topicCode: "neet.phy.magnetism",
    difficulty: "EASY",
    body: "A 2 C charge moves at 10 m/s perpendicular to a uniform magnetic field of 0.5 T. The magnetic force on it is:",
    options: [
      { key: "A", text: "5 N" },
      { key: "B", text: "10 N" },
      { key: "C", text: "20 N" },
      { key: "D", text: "1 N" },
    ],
    answerKey: "B",
    solution: "F = qvB sinθ = 2 × 10 × 0.5 × sin90° = 10 N.",
    tags: ["lorentz"],
  },
  {
    topicCode: "neet.phy.magnetism",
    difficulty: "EASY",
    body: "Magnetic field at a perpendicular distance r from a long, straight wire carrying current I is:",
    options: [
      { key: "A", text: "μ₀I / (2πr)" },
      { key: "B", text: "μ₀I / (2r)" },
      { key: "C", text: "μ₀Ir² / 2" },
      { key: "D", text: "μ₀I R / (2π)" },
    ],
    answerKey: "A",
    solution: "By Ampère's law for an infinite straight wire: B = μ₀ I / (2πr).",
    tags: ["amperes-law"],
  },
  {
    topicCode: "neet.phy.magnetism",
    difficulty: "EASY",
    body: "A current loop of area A carries current I. Its magnetic dipole moment is:",
    options: [
      { key: "A", text: "I A" },
      { key: "B", text: "I / A" },
      { key: "C", text: "I² A" },
      { key: "D", text: "A / I" },
    ],
    answerKey: "A",
    solution: "Magnetic dipole moment m = NIA. For a single loop (N = 1), m = IA.",
    tags: ["magnetic-moment"],
  },

  // ── Electromagnetic Induction & AC (3) ───────────────────────────────
  {
    topicCode: "neet.phy.induction",
    difficulty: "EASY",
    body: "Faraday's law of electromagnetic induction states that the induced EMF in a circuit equals:",
    options: [
      { key: "A", text: "−dΦ/dt" },
      { key: "B", text: "Φ · t" },
      { key: "C", text: "Φ / t²" },
      { key: "D", text: "+dt/dΦ" },
    ],
    answerKey: "A",
    solution:
      "Faraday's law: ε = −dΦ/dt. The minus sign embodies Lenz's law (opposing the change).",
    tags: ["faraday"],
  },
  {
    topicCode: "neet.phy.induction",
    difficulty: "MEDIUM",
    body: "Through an inductor of inductance 2 H, current changes from 1 A to 5 A in 2 s. The magnitude of induced EMF is:",
    options: [
      { key: "A", text: "2 V" },
      { key: "B", text: "4 V" },
      { key: "C", text: "8 V" },
      { key: "D", text: "10 V" },
    ],
    answerKey: "B",
    solution:
      "|ε| = L · |dI/dt| = 2 × (5 − 1)/2 = 2 × 2 = 4 V.",
    tags: ["self-inductance"],
  },
  {
    topicCode: "neet.phy.induction",
    difficulty: "EASY",
    body: "An AC source has peak voltage 220 V. Its rms voltage is approximately:",
    options: [
      { key: "A", text: "110 V" },
      { key: "B", text: "156 V" },
      { key: "C", text: "220 V" },
      { key: "D", text: "311 V" },
    ],
    answerKey: "B",
    solution: "V_rms = V_peak / √2 = 220 / 1.414 ≈ 155.6 V ≈ 156 V.",
    tags: ["rms"],
  },

  // ── EM Waves (1) ─────────────────────────────────────────────────────
  {
    topicCode: "neet.phy.em_waves",
    difficulty: "EASY",
    body: "The speed of electromagnetic waves in vacuum is:",
    options: [
      { key: "A", text: "3 × 10⁶ m/s" },
      { key: "B", text: "3 × 10⁸ m/s" },
      { key: "C", text: "3 × 10¹⁰ m/s" },
      { key: "D", text: "Depends on frequency" },
    ],
    answerKey: "B",
    solution:
      "All EM waves travel at the same speed in vacuum: c = 1/√(μ₀ε₀) ≈ 3 × 10⁸ m/s.",
    tags: ["speed-of-light"],
  },

  // ── Optics (4) ───────────────────────────────────────────────────────
  {
    topicCode: "neet.phy.optics.ray",
    difficulty: "MEDIUM",
    body: "A thin convex lens of focal length 20 cm forms an image of an object placed 30 cm in front of it. The image distance is:",
    options: [
      { key: "A", text: "60 cm" },
      { key: "B", text: "12 cm" },
      { key: "C", text: "−60 cm" },
      { key: "D", text: "30 cm" },
    ],
    answerKey: "A",
    solution:
      "Using 1/v − 1/u = 1/f with u = −30, f = +20: 1/v = 1/20 − 1/30 = (3 − 2)/60 = 1/60 ⇒ v = 60 cm.",
    tags: ["lens-formula"],
  },
  {
    topicCode: "neet.phy.optics.ray",
    difficulty: "MEDIUM",
    body: "The critical angle for total internal reflection in a medium of refractive index 1.5 (with respect to air) is approximately:",
    options: [
      { key: "A", text: "30°" },
      { key: "B", text: "41.8°" },
      { key: "C", text: "60°" },
      { key: "D", text: "45°" },
    ],
    answerKey: "B",
    solution: "sin C = 1/μ = 1/1.5 = 0.667. C = sin⁻¹(0.667) ≈ 41.8°.",
    tags: ["critical-angle", "tir"],
  },
  {
    topicCode: "neet.phy.optics.ray",
    difficulty: "EASY",
    body: "For a convex lens, an object of height 2 cm produces an image of height 6 cm. The magnification is:",
    options: [
      { key: "A", text: "1/3" },
      { key: "B", text: "2" },
      { key: "C", text: "3" },
      { key: "D", text: "6" },
    ],
    answerKey: "C",
    solution: "m = h_image / h_object = 6 / 2 = 3.",
    tags: ["magnification"],
  },
  {
    topicCode: "neet.phy.optics.wave",
    difficulty: "EASY",
    body:
      "In a Young's double-slit experiment the fringe width is β = λD/d. If the slit separation d is doubled (λ and D unchanged), the fringe width becomes:",
    options: [
      { key: "A", text: "Half" },
      { key: "B", text: "One-quarter" },
      { key: "C", text: "Twice" },
      { key: "D", text: "Unchanged" },
    ],
    answerKey: "A",
    solution: "β ∝ 1/d. Doubling d halves the fringe width.",
    tags: ["youngs-slit"],
  },

  // ── Dual Nature (1) ──────────────────────────────────────────────────
  {
    topicCode: "neet.phy.dual_nature",
    difficulty: "MEDIUM",
    body:
      "A photon of energy 5 eV strikes a metal surface whose work function is 2 eV. The maximum kinetic energy of the emitted photoelectron is:",
    options: [
      { key: "A", text: "2 eV" },
      { key: "B", text: "3 eV" },
      { key: "C", text: "5 eV" },
      { key: "D", text: "7 eV" },
    ],
    answerKey: "B",
    solution:
      "Einstein's photoelectric equation: KE_max = hν − W = 5 − 2 = 3 eV.",
    tags: ["photoelectric"],
  },

  // ── Atoms and Nuclei (2) ─────────────────────────────────────────────
  {
    topicCode: "neet.phy.atoms_nuclei",
    difficulty: "EASY",
    body: "In Bohr's model, the radius of the nth orbit in a hydrogen atom is r_n = n² r_0 (where r_0 is the Bohr radius). For n = 3, the orbital radius is:",
    options: [
      { key: "A", text: "3 r_0" },
      { key: "B", text: "6 r_0" },
      { key: "C", text: "9 r_0" },
      { key: "D", text: "27 r_0" },
    ],
    answerKey: "C",
    solution: "r_n = n² r_0. For n = 3: r_3 = 9 r_0.",
    tags: ["bohr"],
  },
  {
    topicCode: "neet.phy.atoms_nuclei",
    difficulty: "EASY",
    body: "A radioactive sample has a half-life of 10 days. The fraction of the original sample remaining after 30 days is:",
    options: [
      { key: "A", text: "1/2" },
      { key: "B", text: "1/4" },
      { key: "C", text: "1/8" },
      { key: "D", text: "1/16" },
    ],
    answerKey: "C",
    solution:
      "30 days = 3 half-lives. Remaining fraction = (1/2)³ = 1/8.",
    tags: ["half-life"],
  },

  // ── Semiconductors (1) ───────────────────────────────────────────────
  {
    topicCode: "neet.phy.semiconductors",
    difficulty: "EASY",
    body: "The approximate band gap of silicon at room temperature is:",
    options: [
      { key: "A", text: "0.7 eV" },
      { key: "B", text: "1.1 eV" },
      { key: "C", text: "3.0 eV" },
      { key: "D", text: "5.0 eV" },
    ],
    answerKey: "B",
    solution: "Standard value for Si is ≈ 1.1 eV (Ge ≈ 0.7 eV, GaAs ≈ 1.4 eV, diamond ≈ 5.5 eV).",
    tags: ["band-gap"],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────
export async function seedNeetPhysicsQuestions() {
  const exam = await prisma.exam.findUnique({ where: { code: "NEET_UG" } });
  if (!exam) throw new Error("Run seedExams() first.");

  const subject = await prisma.subject.findUnique({
    where: { examId_code: { examId: exam.id, code: "PHYSICS" } },
  });
  if (!subject)
    throw new Error("Run seedNeetUgSyllabus() first — PHYSICS subject not found.");

  const topics = await prisma.topic.findMany({ where: { subjectId: subject.id } });
  const topicMap = new Map(topics.map((t) => [t.code, t.id]));

  console.log(`Seeding ${neetPhysicsQuestions.length} NEET Physics questions...`);
  let created = 0,
    skipped = 0;
  for (const q of neetPhysicsQuestions) {
    const topicId = topicMap.get(q.topicCode);
    if (!topicId) {
      console.warn(`  ⚠ Skipping question for unknown topic ${q.topicCode}`);
      skipped++;
      continue;
    }
    await prisma.question.create({
      data: {
        examId: exam.id,
        topicId,
        type: q.type ?? "MCQ",
        difficulty: q.difficulty,
        body: q.body,
        options: q.options,
        answerKey: q.answerKey,
        solution: q.solution,
        language: q.language ?? "EN",
        source: "AI_GENERATED" as QuestionSource,
        validated: false,
        tags: q.tags ?? [],
        metadata: { generator: "claude-sonnet-4-5", batch: "neet-physics-v1" },
      },
    });
    created++;
  }
  console.log(`Done. Created ${created}, skipped ${skipped}.`);
  console.log("All questions are flagged validated:false — SME review required before going live.");
}

if (require.main === module) {
  seedNeetPhysicsQuestions()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
