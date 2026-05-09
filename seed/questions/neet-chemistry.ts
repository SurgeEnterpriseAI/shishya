// NEET UG — Chemistry — 50 sample questions covering Class 11 + 12.
// AI-drafted, awaiting SME validation. Numerics double-checked at authoring.
//
// Run after seedNeetUgSyllabus(): npx tsx seed/questions/neet-chemistry.ts

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

export const neetChemistryQuestions: QuestionSeed[] = [
  // ── Basic Concepts (4) ──────────────────────────────────────────────
  {
    topicCode: "neet.chem.basic_concepts",
    difficulty: "EASY",
    body: "How many atoms are present in 24 g of magnesium (atomic mass = 24)?",
    options: [
      { key: "A", text: "3.011 × 10²³" },
      { key: "B", text: "6.022 × 10²³" },
      { key: "C", text: "12.044 × 10²³" },
      { key: "D", text: "6.022 × 10²²" },
    ],
    answerKey: "B",
    solution: "24 g of Mg = 24/24 = 1 mole. 1 mole contains Avogadro's number of atoms = 6.022 × 10²³.",
    tags: ["mole-concept"],
  },
  {
    topicCode: "neet.chem.basic_concepts",
    difficulty: "MEDIUM",
    body: "Mass of CO₂ produced by complete combustion of 12 g of carbon (C + O₂ → CO₂):",
    options: [
      { key: "A", text: "12 g" },
      { key: "B", text: "28 g" },
      { key: "C", text: "44 g" },
      { key: "D", text: "32 g" },
    ],
    answerKey: "C",
    solution: "12 g C = 1 mol. 1 mol C produces 1 mol CO₂ (M = 12 + 2×16 = 44 g/mol). Mass of CO₂ = 44 g.",
    tags: ["stoichiometry"],
  },
  {
    topicCode: "neet.chem.basic_concepts",
    difficulty: "MEDIUM",
    body: "A compound contains 40% C, 6.67% H and 53.33% O by mass. Its empirical formula is:",
    options: [
      { key: "A", text: "C₂H₄O" },
      { key: "B", text: "CHO" },
      { key: "C", text: "CH₂O" },
      { key: "D", text: "C₂H₄O₂" },
    ],
    answerKey: "C",
    solution: "Mole ratio: C 40/12 = 3.33, H 6.67/1 = 6.67, O 53.33/16 = 3.33. Divide by smallest (3.33): 1 : 2 : 1 → CH₂O.",
    tags: ["empirical-formula"],
  },
  {
    topicCode: "neet.chem.basic_concepts",
    difficulty: "EASY",
    body: "Molarity of a solution containing 0.5 mol of NaOH in 250 mL of solution is:",
    options: [
      { key: "A", text: "0.5 M" },
      { key: "B", text: "1 M" },
      { key: "C", text: "2 M" },
      { key: "D", text: "0.25 M" },
    ],
    answerKey: "C",
    solution: "M = moles / volume(L) = 0.5 / 0.250 = 2 M.",
    tags: ["molarity"],
  },

  // ── Atomic Structure (3) ────────────────────────────────────────────
  {
    topicCode: "neet.chem.atomic_structure",
    difficulty: "EASY",
    body: "The maximum number of electrons that can occupy a d-subshell is:",
    options: [
      { key: "A", text: "2" },
      { key: "B", text: "6" },
      { key: "C", text: "10" },
      { key: "D", text: "14" },
    ],
    answerKey: "C",
    solution: "A d-subshell has 5 orbitals (m_l = −2, −1, 0, +1, +2). Each orbital holds 2 electrons. Total = 10.",
    tags: ["quantum-numbers"],
  },
  {
    topicCode: "neet.chem.atomic_structure",
    difficulty: "MEDIUM",
    body: "Energy of an electron in the n = 2 orbit of a hydrogen atom (in eV) is:",
    options: [
      { key: "A", text: "−13.6" },
      { key: "B", text: "−6.8" },
      { key: "C", text: "−3.4" },
      { key: "D", text: "−1.51" },
    ],
    answerKey: "C",
    solution: "Bohr's energy formula: E_n = −13.6/n² eV. For n = 2: E = −13.6/4 = −3.4 eV.",
    tags: ["bohr"],
  },
  {
    topicCode: "neet.chem.atomic_structure",
    difficulty: "MEDIUM",
    body: "The maximum number of electrons in the third shell (n = 3) of an atom is:",
    options: [
      { key: "A", text: "8" },
      { key: "B", text: "16" },
      { key: "C", text: "18" },
      { key: "D", text: "32" },
    ],
    answerKey: "C",
    solution: "Maximum electrons in shell n = 2n². For n = 3: 2(9) = 18.",
    tags: ["shells"],
  },

  // ── Periodic Classification (3) ─────────────────────────────────────
  {
    topicCode: "neet.chem.classification",
    difficulty: "EASY",
    body: "Down a group in the periodic table, the first ionisation energy generally:",
    options: [
      { key: "A", text: "Increases" },
      { key: "B", text: "Decreases" },
      { key: "C", text: "Remains constant" },
      { key: "D", text: "First increases, then decreases" },
    ],
    answerKey: "B",
    solution: "Atomic size increases down the group, so the outermost electron is farther from the nucleus and easier to remove. Ionisation energy decreases.",
    tags: ["periodic-trends"],
  },
  {
    topicCode: "neet.chem.classification",
    difficulty: "MEDIUM",
    body: "Across a period from left to right, atomic radius:",
    options: [
      { key: "A", text: "Increases" },
      { key: "B", text: "Decreases" },
      { key: "C", text: "Remains constant" },
      { key: "D", text: "First increases, then decreases" },
    ],
    answerKey: "B",
    solution: "Effective nuclear charge increases across a period while electrons are added to the same shell. Net effect: outer electrons are pulled in tighter; radius decreases.",
    tags: ["periodic-trends"],
  },
  {
    topicCode: "neet.chem.classification",
    difficulty: "HARD",
    body: "Among the following, the element with the highest electron affinity is:",
    options: [
      { key: "A", text: "F" },
      { key: "B", text: "Cl" },
      { key: "C", text: "Br" },
      { key: "D", text: "I" },
    ],
    answerKey: "B",
    solution: "Although F is more electronegative, Cl has the highest electron affinity in the halogen series. F's small size increases inter-electronic repulsion when an electron is added, lowering its EA below Cl's.",
    tags: ["electron-affinity"],
  },

  // ── Chemical Bonding (3) ────────────────────────────────────────────
  {
    topicCode: "neet.chem.bonding",
    difficulty: "EASY",
    body: "The hybridisation of carbon in methane (CH₄) is:",
    options: [
      { key: "A", text: "sp" },
      { key: "B", text: "sp²" },
      { key: "C", text: "sp³" },
      { key: "D", text: "sp³d" },
    ],
    answerKey: "C",
    solution: "Carbon in CH₄ is bonded to four equivalent H atoms in a tetrahedral arrangement, requiring four sp³ hybrid orbitals.",
    tags: ["hybridisation"],
  },
  {
    topicCode: "neet.chem.bonding",
    difficulty: "EASY",
    body: "The H–O–H bond angle in a water molecule is approximately:",
    options: [
      { key: "A", text: "90°" },
      { key: "B", text: "104.5°" },
      { key: "C", text: "109.5°" },
      { key: "D", text: "120°" },
    ],
    answerKey: "B",
    solution: "Oxygen in water is sp³-hybridised, but the two lone pairs compress the H–O–H angle from the ideal 109.5° to about 104.5°.",
    tags: ["vsepr"],
  },
  {
    topicCode: "neet.chem.bonding",
    difficulty: "MEDIUM",
    body: "The shape of the ammonia (NH₃) molecule is:",
    options: [
      { key: "A", text: "Tetrahedral" },
      { key: "B", text: "Trigonal planar" },
      { key: "C", text: "Trigonal pyramidal" },
      { key: "D", text: "Bent" },
    ],
    answerKey: "C",
    solution: "Nitrogen in NH₃ has 3 bonding pairs + 1 lone pair → sp³ hybridised. The molecular shape (ignoring the lone pair) is trigonal pyramidal.",
    tags: ["vsepr", "molecular-shape"],
  },

  // ── States of Matter (2) ────────────────────────────────────────────
  {
    topicCode: "neet.chem.states",
    difficulty: "EASY",
    body: "According to Boyle's law, at constant temperature, when the pressure of a gas is doubled, its volume:",
    options: [
      { key: "A", text: "Doubles" },
      { key: "B", text: "Remains the same" },
      { key: "C", text: "Halves" },
      { key: "D", text: "Becomes one-quarter" },
    ],
    answerKey: "C",
    solution: "Boyle's law: PV = constant at constant T. Doubling P halves V.",
    tags: ["boyle"],
  },
  {
    topicCode: "neet.chem.states",
    difficulty: "MEDIUM",
    body: "At constant pressure, the volume of a fixed mass of an ideal gas at 27 °C will become twice when the temperature is raised to:",
    options: [
      { key: "A", text: "54 °C" },
      { key: "B", text: "327 °C" },
      { key: "C", text: "300 °C" },
      { key: "D", text: "600 °C" },
    ],
    answerKey: "B",
    solution:
      "Charles's law: V/T = constant (T in Kelvin). T₁ = 300 K. For V₂ = 2V₁, T₂ = 2 × 300 = 600 K = 327 °C.",
    tags: ["charles-law"],
  },

  // ── Thermodynamics (3) ──────────────────────────────────────────────
  {
    topicCode: "neet.chem.thermo",
    difficulty: "EASY",
    body: "For an exothermic reaction, the change in enthalpy (ΔH) is:",
    options: [
      { key: "A", text: "Positive" },
      { key: "B", text: "Negative" },
      { key: "C", text: "Zero" },
      { key: "D", text: "Always equal to zero" },
    ],
    answerKey: "B",
    solution: "Exothermic reactions release heat to the surroundings, so the enthalpy of the system decreases ⇒ ΔH < 0 (negative).",
    tags: ["enthalpy"],
  },
  {
    topicCode: "neet.chem.thermo",
    difficulty: "MEDIUM",
    body: "For the reactions A → B (ΔH = +50 kJ) and B → C (ΔH = −80 kJ), the enthalpy change for A → C is:",
    options: [
      { key: "A", text: "+30 kJ" },
      { key: "B", text: "−30 kJ" },
      { key: "C", text: "+130 kJ" },
      { key: "D", text: "−130 kJ" },
    ],
    answerKey: "B",
    solution: "By Hess's law, ΔH(A → C) = ΔH(A → B) + ΔH(B → C) = +50 + (−80) = −30 kJ.",
    tags: ["hess-law"],
  },
  {
    topicCode: "neet.chem.thermo",
    difficulty: "MEDIUM",
    body: "A reaction is spontaneous at all temperatures if:",
    options: [
      { key: "A", text: "ΔH < 0 and ΔS < 0" },
      { key: "B", text: "ΔH > 0 and ΔS > 0" },
      { key: "C", text: "ΔH < 0 and ΔS > 0" },
      { key: "D", text: "ΔH > 0 and ΔS < 0" },
    ],
    answerKey: "C",
    solution:
      "ΔG = ΔH − TΔS. For spontaneity at all T, ΔG must always be negative — guaranteed when ΔH is negative AND ΔS is positive.",
    tags: ["spontaneity", "gibbs"],
  },

  // ── Equilibrium (3) ─────────────────────────────────────────────────
  {
    topicCode: "neet.chem.equilibrium",
    difficulty: "MEDIUM",
    body: "For the reaction N₂ + 3H₂ ⇌ 2NH₃, increasing the pressure on the system at equilibrium will:",
    options: [
      { key: "A", text: "Shift the equilibrium to the left" },
      { key: "B", text: "Shift the equilibrium to the right" },
      { key: "C", text: "Have no effect" },
      { key: "D", text: "Decrease the value of K" },
    ],
    answerKey: "B",
    solution:
      "By Le Chatelier's principle, an increase in pressure shifts equilibrium to the side with fewer moles of gas. RHS has 2 moles vs LHS's 4 moles ⇒ shift right.",
    tags: ["le-chatelier"],
  },
  {
    topicCode: "neet.chem.equilibrium",
    difficulty: "EASY",
    body: "The pH of a 0.01 M aqueous HCl solution is:",
    options: [
      { key: "A", text: "1" },
      { key: "B", text: "2" },
      { key: "C", text: "12" },
      { key: "D", text: "0" },
    ],
    answerKey: "B",
    solution: "HCl is a strong acid that fully dissociates. [H⁺] = 0.01 M = 10⁻². pH = −log(10⁻²) = 2.",
    tags: ["pH"],
  },
  {
    topicCode: "neet.chem.equilibrium",
    difficulty: "MEDIUM",
    body: "If the solubility of AgCl in water is 1.0 × 10⁻⁵ mol/L, its solubility product (Ksp) is:",
    options: [
      { key: "A", text: "1.0 × 10⁻⁵" },
      { key: "B", text: "1.0 × 10⁻¹⁰" },
      { key: "C", text: "1.0 × 10⁻¹⁵" },
      { key: "D", text: "2.0 × 10⁻⁵" },
    ],
    answerKey: "B",
    solution: "AgCl ⇌ Ag⁺ + Cl⁻. [Ag⁺] = [Cl⁻] = s = 10⁻⁵. Ksp = s² = (10⁻⁵)² = 10⁻¹⁰.",
    tags: ["ksp"],
  },

  // ── Redox (2) ───────────────────────────────────────────────────────
  {
    topicCode: "neet.chem.redox",
    difficulty: "EASY",
    body: "The oxidation number of sulphur in H₂SO₄ is:",
    options: [
      { key: "A", text: "+4" },
      { key: "B", text: "+5" },
      { key: "C", text: "+6" },
      { key: "D", text: "+8" },
    ],
    answerKey: "C",
    solution: "Let S = x. 2(+1) + x + 4(−2) = 0 ⇒ 2 + x − 8 = 0 ⇒ x = +6.",
    tags: ["oxidation-state"],
  },
  {
    topicCode: "neet.chem.redox",
    difficulty: "MEDIUM",
    body: "In the reaction 2KMnO₄ + 16HCl → 2KCl + 2MnCl₂ + 5Cl₂ + 8H₂O, the oxidising agent is:",
    options: [
      { key: "A", text: "HCl" },
      { key: "B", text: "KMnO₄" },
      { key: "C", text: "MnCl₂" },
      { key: "D", text: "Cl₂" },
    ],
    answerKey: "B",
    solution: "Mn changes from +7 (in KMnO₄) to +2 (in MnCl₂) — it is reduced. The species being reduced is the oxidising agent: KMnO₄.",
    tags: ["oxidising-agent"],
  },

  // ── Hydrogen + s-Block (2) ──────────────────────────────────────────
  {
    topicCode: "neet.chem.h_s_block",
    difficulty: "EASY",
    body: "The most reactive metal in the alkali metal group is (excluding the radioactive Fr):",
    options: [
      { key: "A", text: "Li" },
      { key: "B", text: "Na" },
      { key: "C", text: "K" },
      { key: "D", text: "Cs" },
    ],
    answerKey: "D",
    solution: "Reactivity of alkali metals increases down the group as ionisation energy decreases. Cs (excluding Fr) is the most reactive.",
    tags: ["alkali-metals"],
  },
  {
    topicCode: "neet.chem.h_s_block",
    difficulty: "MEDIUM",
    body: "The two main allotropic forms of dihydrogen differ in the relative orientation of nuclear spins. They are called:",
    options: [
      { key: "A", text: "Alpha and beta" },
      { key: "B", text: "Ortho and para" },
      { key: "C", text: "Cis and trans" },
      { key: "D", text: "L and D" },
    ],
    answerKey: "B",
    solution: "Ortho-hydrogen has parallel nuclear spins; para-hydrogen has antiparallel spins. Para is more stable at low temperatures.",
    tags: ["hydrogen-forms"],
  },

  // ── Solutions (3) ───────────────────────────────────────────────────
  {
    topicCode: "neet.chem.solutions",
    difficulty: "EASY",
    body: "Which of the following statements correctly describes Raoult's law for an ideal solution?",
    options: [
      { key: "A", text: "P_solution = X_solute · P°_solute" },
      { key: "B", text: "P_solution = X_solvent · P°_solvent" },
      { key: "C", text: "P_solution = P°_solvent only" },
      { key: "D", text: "P_solution = X_solvent · X_solute · P°_solvent" },
    ],
    answerKey: "B",
    solution:
      "Raoult's law for an ideal dilute solution: vapour pressure of the solvent above the solution = mole fraction of solvent × vapour pressure of pure solvent.",
    tags: ["raoult"],
  },
  {
    topicCode: "neet.chem.solutions",
    difficulty: "EASY",
    body: "Which of the following is NOT a colligative property?",
    options: [
      { key: "A", text: "Lowering of vapour pressure" },
      { key: "B", text: "Boiling-point elevation" },
      { key: "C", text: "Freezing-point depression" },
      { key: "D", text: "Optical rotation" },
    ],
    answerKey: "D",
    solution:
      "Colligative properties depend on the number of solute particles, not their identity. Optical rotation depends on the chirality / identity of the solute, so it is NOT colligative.",
    tags: ["colligative"],
  },
  {
    topicCode: "neet.chem.solutions",
    difficulty: "MEDIUM",
    body: "Which of the following concentration units is independent of temperature?",
    options: [
      { key: "A", text: "Molarity (M)" },
      { key: "B", text: "Molality (m)" },
      { key: "C", text: "Normality (N)" },
      { key: "D", text: "Mass percentage divided by volume" },
    ],
    answerKey: "B",
    solution:
      "Molality uses solvent MASS in the denominator, which doesn't change with temperature. Molarity / normality use volume, which expands when heated, so they are temperature-dependent.",
    tags: ["concentration-units"],
  },

  // ── Electrochemistry (2) ────────────────────────────────────────────
  {
    topicCode: "neet.chem.electrochem",
    difficulty: "MEDIUM",
    body: "The number of Faradays of electricity required to deposit 1 mole of copper from a Cu²⁺ solution is:",
    options: [
      { key: "A", text: "1" },
      { key: "B", text: "2" },
      { key: "C", text: "0.5" },
      { key: "D", text: "4" },
    ],
    answerKey: "B",
    solution: "Cu²⁺ + 2e⁻ → Cu. Two moles of electrons (2 Faradays) are required to deposit 1 mole of Cu.",
    tags: ["faraday"],
  },
  {
    topicCode: "neet.chem.electrochem",
    difficulty: "EASY",
    body: "The function of a salt bridge in a galvanic cell is to:",
    options: [
      { key: "A", text: "Increase cell potential" },
      { key: "B", text: "Maintain electrical neutrality of half-cells" },
      { key: "C", text: "Conduct electrons between electrodes" },
      { key: "D", text: "Catalyse the reaction" },
    ],
    answerKey: "B",
    solution: "Ions flow through the salt bridge to balance the charge that builds up in each half-cell as the reaction proceeds, maintaining electrical neutrality.",
    tags: ["galvanic-cell"],
  },

  // ── Kinetics (3) ────────────────────────────────────────────────────
  {
    topicCode: "neet.chem.kinetics",
    difficulty: "EASY",
    body: "The order of a chemical reaction is:",
    options: [
      { key: "A", text: "The number of reactants" },
      { key: "B", text: "The sum of the powers of concentration terms in the rate law" },
      { key: "C", text: "The number of moles of products" },
      { key: "D", text: "Always equal to the molecularity" },
    ],
    answerKey: "B",
    solution: "Order is defined experimentally as the sum of exponents on the concentration terms in the rate equation, not the stoichiometric coefficients.",
    tags: ["order"],
  },
  {
    topicCode: "neet.chem.kinetics",
    difficulty: "MEDIUM",
    body: "The half-life of a first-order reaction is:",
    options: [
      { key: "A", text: "Directly proportional to [A]₀" },
      { key: "B", text: "Inversely proportional to [A]₀" },
      { key: "C", text: "Independent of [A]₀" },
      { key: "D", text: "Equal to [A]₀ / k" },
    ],
    answerKey: "C",
    solution: "For a first-order reaction, t½ = 0.693/k. It does not contain the initial concentration term, so it is independent of [A]₀.",
    tags: ["first-order"],
  },
  {
    topicCode: "neet.chem.kinetics",
    difficulty: "EASY",
    body: "According to the Arrhenius equation, increasing temperature will:",
    options: [
      { key: "A", text: "Decrease the rate constant" },
      { key: "B", text: "Increase the rate constant" },
      { key: "C", text: "Have no effect" },
      { key: "D", text: "Halt the reaction" },
    ],
    answerKey: "B",
    solution:
      "k = A · e^(−Ea/RT). As T increases, the negative exponent becomes less negative, so k increases. Higher T → faster reaction.",
    tags: ["arrhenius"],
  },

  // ── Surface Chemistry (1) ───────────────────────────────────────────
  {
    topicCode: "neet.chem.surface",
    difficulty: "MEDIUM",
    body: "Adsorption that involves only weak van der Waals forces between adsorbate and adsorbent is termed:",
    options: [
      { key: "A", text: "Chemisorption" },
      { key: "B", text: "Physisorption" },
      { key: "C", text: "Absorption" },
      { key: "D", text: "Sorption" },
    ],
    answerKey: "B",
    solution:
      "Physical adsorption (physisorption) is reversible and involves weak van der Waals forces. Chemisorption involves chemical bonds and an activation energy.",
    tags: ["physisorption"],
  },

  // ── Metallurgy (1) ──────────────────────────────────────────────────
  {
    topicCode: "neet.chem.metallurgy",
    difficulty: "MEDIUM",
    body: "In the extraction of iron from haematite (Fe₂O₃) in a blast furnace, the principal reducing agent is:",
    options: [
      { key: "A", text: "C (carbon, coke)" },
      { key: "B", text: "CO" },
      { key: "C", text: "H₂" },
      { key: "D", text: "Al" },
    ],
    answerKey: "B",
    solution:
      "Fe₂O₃ is reduced by carbon monoxide (CO) generated in situ from coke + O₂ → CO₂ → CO. The principal reducing agent in the upper part of the furnace is CO.",
    tags: ["blast-furnace"],
  },

  // ── p-Block (2) ─────────────────────────────────────────────────────
  {
    topicCode: "neet.chem.p_block",
    difficulty: "EASY",
    body: "The most electronegative element in the periodic table is:",
    options: [
      { key: "A", text: "O" },
      { key: "B", text: "F" },
      { key: "C", text: "Cl" },
      { key: "D", text: "N" },
    ],
    answerKey: "B",
    solution: "Fluorine has the highest electronegativity (≈ 4.0 on the Pauling scale) of any element.",
    tags: ["electronegativity"],
  },
  {
    topicCode: "neet.chem.p_block",
    difficulty: "MEDIUM",
    body: "Among the following noble gases, which has the lowest first ionisation energy?",
    options: [
      { key: "A", text: "He" },
      { key: "B", text: "Ne" },
      { key: "C", text: "Ar" },
      { key: "D", text: "Xe" },
    ],
    answerKey: "D",
    solution: "Ionisation energy decreases down a group. Among the choices, Xe is lowest in the group, so it has the lowest first ionisation energy.",
    tags: ["noble-gases"],
  },

  // ── d & f Block (2) ─────────────────────────────────────────────────
  {
    topicCode: "neet.chem.d_f_block",
    difficulty: "MEDIUM",
    body: "Which of these is NOT considered a typical transition metal because its d-subshell is completely filled?",
    options: [
      { key: "A", text: "Fe" },
      { key: "B", text: "Cu" },
      { key: "C", text: "Zn" },
      { key: "D", text: "Mn" },
    ],
    answerKey: "C",
    solution: "Zn has the configuration [Ar] 3d¹⁰ 4s². Its d-subshell is fully filled in both elemental and common +2 states, so by definition it is not a transition metal in many treatments.",
    tags: ["transition-metals"],
  },
  {
    topicCode: "neet.chem.d_f_block",
    difficulty: "EASY",
    body: "Lanthanoids show a gradual decrease in atomic and ionic radii with increase in atomic number. This phenomenon is called:",
    options: [
      { key: "A", text: "Lanthanoid contraction" },
      { key: "B", text: "Actinoid contraction" },
      { key: "C", text: "Periodic contraction" },
      { key: "D", text: "Atomic shrinkage" },
    ],
    answerKey: "A",
    solution: "Poor shielding by 4f electrons leads to a steady decrease in atomic and ionic radii across the lanthanoid series — known as the lanthanoid contraction.",
    tags: ["lanthanoid"],
  },

  // ── Coordination (3) ────────────────────────────────────────────────
  {
    topicCode: "neet.chem.coordination",
    difficulty: "EASY",
    body: "The oxidation state of iron in [Fe(CN)₆]³⁻ is:",
    options: [
      { key: "A", text: "+2" },
      { key: "B", text: "+3" },
      { key: "C", text: "+4" },
      { key: "D", text: "+6" },
    ],
    answerKey: "B",
    solution: "Each CN⁻ has charge −1. Let Fe = x. x + 6(−1) = −3 ⇒ x = +3.",
    tags: ["oxidation-state"],
  },
  {
    topicCode: "neet.chem.coordination",
    difficulty: "MEDIUM",
    body: "The hybridisation of nickel in [Ni(CO)₄] is:",
    options: [
      { key: "A", text: "sp" },
      { key: "B", text: "sp³" },
      { key: "C", text: "dsp²" },
      { key: "D", text: "d²sp³" },
    ],
    answerKey: "B",
    solution:
      "In [Ni(CO)₄], Ni is in the 0 oxidation state with electron configuration [Ar] 3d¹⁰. Strong-field CO causes electron pairing, leaving the 4s + 4p orbitals to form four sp³ hybrids → tetrahedral.",
    tags: ["hybridisation"],
  },
  {
    topicCode: "neet.chem.coordination",
    difficulty: "MEDIUM",
    body: "How many geometrical isomers are possible for the square-planar complex [Pt(NH₃)₂Cl₂]?",
    options: [
      { key: "A", text: "1" },
      { key: "B", text: "2" },
      { key: "C", text: "3" },
      { key: "D", text: "4" },
    ],
    answerKey: "B",
    solution:
      "Two isomers: cis-[Pt(NH₃)₂Cl₂] (the like ligands adjacent — anti-cancer drug cisplatin) and trans-[Pt(NH₃)₂Cl₂] (the like ligands opposite).",
    tags: ["isomerism"],
  },

  // ── Haloalkanes (2) ─────────────────────────────────────────────────
  {
    topicCode: "neet.chem.haloalkanes",
    difficulty: "MEDIUM",
    body: "An SN1 reaction is favoured when the substrate is:",
    options: [
      { key: "A", text: "Primary" },
      { key: "B", text: "Secondary" },
      { key: "C", text: "Tertiary" },
      { key: "D", text: "Methyl" },
    ],
    answerKey: "C",
    solution:
      "SN1 proceeds via a carbocation intermediate. Tertiary carbocations are most stable (alkyl groups donate via hyperconjugation + induction), so tertiary substrates favour SN1.",
    tags: ["sn1"],
  },
  {
    topicCode: "neet.chem.haloalkanes",
    difficulty: "EASY",
    body: "The product of the Williamson ether synthesis (R–O–Na⁺ + R'–X) is:",
    options: [
      { key: "A", text: "An alcohol" },
      { key: "B", text: "An ether (R–O–R')" },
      { key: "C", text: "An ester" },
      { key: "D", text: "An aldehyde" },
    ],
    answerKey: "B",
    solution:
      "Williamson ether synthesis: an alkoxide attacks an alkyl halide via SN2, forming an ether R–O–R' with displacement of the halide.",
    tags: ["williamson"],
  },

  // ── Alcohols (2) ────────────────────────────────────────────────────
  {
    topicCode: "neet.chem.alcohols_phenols",
    difficulty: "MEDIUM",
    body: "Lucas reagent (concentrated HCl + ZnCl₂) reacts FASTEST with which type of alcohol?",
    options: [
      { key: "A", text: "Primary" },
      { key: "B", text: "Secondary" },
      { key: "C", text: "Tertiary" },
      { key: "D", text: "Methyl" },
    ],
    answerKey: "C",
    solution: "Lucas test goes via a carbocation. Tertiary alcohols form the most stable carbocation and react immediately (turbidity within seconds).",
    tags: ["lucas-test"],
  },
  {
    topicCode: "neet.chem.alcohols_phenols",
    difficulty: "EASY",
    body: "Phenol turns blue litmus to red because phenol is:",
    options: [
      { key: "A", text: "Basic" },
      { key: "B", text: "Weakly acidic" },
      { key: "C", text: "Neutral" },
      { key: "D", text: "Strongly acidic" },
    ],
    answerKey: "B",
    solution: "Phenol is weakly acidic (pKa ≈ 10) due to resonance stabilisation of the phenoxide ion by the aromatic ring. Blue litmus turns red on contact.",
    tags: ["phenol-acidity"],
  },

  // ── Aldehydes / Ketones / Acids (2) ─────────────────────────────────
  {
    topicCode: "neet.chem.aldehydes_acids",
    difficulty: "EASY",
    body: "Tollens' reagent (ammoniacal silver nitrate) is used to distinguish:",
    options: [
      { key: "A", text: "Alcohols from ethers" },
      { key: "B", text: "Aldehydes from ketones" },
      { key: "C", text: "Esters from carboxylic acids" },
      { key: "D", text: "Amines from amides" },
    ],
    answerKey: "B",
    solution: "Aldehydes reduce Tollens' reagent to silver metal (the 'silver-mirror test'), giving a shiny silver coating. Ketones do not react.",
    tags: ["tollens"],
  },
  {
    topicCode: "neet.chem.aldehydes_acids",
    difficulty: "MEDIUM",
    body: "Among the following, the strongest carboxylic acid is:",
    options: [
      { key: "A", text: "CH₃COOH" },
      { key: "B", text: "CH₂ClCOOH" },
      { key: "C", text: "CHCl₂COOH" },
      { key: "D", text: "CCl₃COOH" },
    ],
    answerKey: "D",
    solution:
      "Electron-withdrawing chlorine atoms stabilise the carboxylate anion via the inductive effect, increasing acid strength. More chlorines = stronger acid. CCl₃COOH (pKa ≈ 0.7) is the strongest.",
    tags: ["acid-strength"],
  },

  // ── Amines (1) ──────────────────────────────────────────────────────
  {
    topicCode: "neet.chem.amines",
    difficulty: "HARD",
    body: "In aqueous solution, the basicity of methylamines follows the order:",
    options: [
      { key: "A", text: "(CH₃)₃N > (CH₃)₂NH > CH₃NH₂ > NH₃" },
      { key: "B", text: "(CH₃)₂NH > CH₃NH₂ > (CH₃)₃N > NH₃" },
      { key: "C", text: "CH₃NH₂ > NH₃ > (CH₃)₂NH > (CH₃)₃N" },
      { key: "D", text: "NH₃ > CH₃NH₂ > (CH₃)₂NH > (CH₃)₃N" },
    ],
    answerKey: "B",
    solution:
      "In water, basicity is a balance between alkyl-group +I effect (donates electrons) and solvation of the protonated amine. Methyl groups boost +I but bulk reduces solvation. Net order: 2° > 1° > 3° > NH₃.",
    tags: ["amine-basicity"],
  },

  // ── Biomolecules (1) ────────────────────────────────────────────────
  {
    topicCode: "neet.chem.biomolecules",
    difficulty: "EASY",
    body: "The number of essential amino acids in adult humans is approximately:",
    options: [
      { key: "A", text: "5" },
      { key: "B", text: "9" },
      { key: "C", text: "12" },
      { key: "D", text: "20" },
    ],
    answerKey: "B",
    solution:
      "Of the 20 standard amino acids, 9 cannot be synthesised by the adult human body and must come from diet — these are the 'essential' amino acids (e.g., lysine, methionine, valine, leucine, isoleucine, phenylalanine, threonine, tryptophan, histidine).",
    tags: ["amino-acids"],
  },

  // ── Everyday Chemistry (1) ──────────────────────────────────────────
  {
    topicCode: "neet.chem.everyday",
    difficulty: "EASY",
    body: "Aspirin (acetylsalicylic acid) belongs to which class of drugs?",
    options: [
      { key: "A", text: "Antibiotic" },
      { key: "B", text: "Antacid" },
      { key: "C", text: "Analgesic / antipyretic" },
      { key: "D", text: "Antihistamine" },
    ],
    answerKey: "C",
    solution:
      "Aspirin is a non-steroidal analgesic (pain reliever) and antipyretic (fever reducer). It also has anti-inflammatory and anti-platelet effects.",
    tags: ["drugs"],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────
export async function seedNeetChemistryQuestions() {
  const exam = await prisma.exam.findUnique({ where: { code: "NEET_UG" } });
  if (!exam) throw new Error("Run seedExams() first.");

  const subject = await prisma.subject.findUnique({
    where: { examId_code: { examId: exam.id, code: "CHEMISTRY" } },
  });
  if (!subject) throw new Error("Run seedNeetUgSyllabus() first — CHEMISTRY subject not found.");

  const topics = await prisma.topic.findMany({ where: { subjectId: subject.id } });
  const topicMap = new Map(topics.map((t) => [t.code, t.id]));

  console.log(`Seeding ${neetChemistryQuestions.length} NEET Chemistry questions...`);
  let created = 0,
    skipped = 0;
  for (const q of neetChemistryQuestions) {
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
        metadata: { generator: "claude-sonnet-4-5", batch: "neet-chemistry-v1" },
      },
    });
    created++;
  }
  console.log(`Done. Created ${created}, skipped ${skipped}.`);
  console.log("All questions are flagged validated:false — SME review required before going live.");
}

if (require.main === module) {
  seedNeetChemistryQuestions()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
