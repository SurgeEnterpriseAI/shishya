// Per-chapter mastery quiz data.
//
// Each quiz is keyed by (boardSlug:classNum:subjectSlug:chapterSlug).
// 5 multiple-choice questions per chapter with explanations.
//
// Day-1 coverage: a handful of representative chapters from the highest-
// stakes subjects (Class 10 Math + Science, Class 12 Physics + Chemistry
// + Math + Biology). Other chapters render the honest "quiz being
// authored" stub on their chapter page. This grows organically as
// content is authored.
//
// Questions are written by hand (not LLM-generated) to ensure NCERT
// alignment. Future versions will use the AI generator (lib/ai/notes.ts)
// to draft, then human-review against the NCERT chapter PDF.

export interface QuizQuestion {
  id: string;
  prompt: string;
  /** 4 options. Index 0..3. */
  options: string[];
  /** Index of the correct option. */
  correctIndex: number;
  /** One-paragraph explanation shown after the user picks. */
  explanation: string;
}

export interface ChapterQuiz {
  key: string;          // "cbse:10:mathematics:real-numbers"
  questions: QuizQuestion[];
}

export function quizKey(boardSlug: string, classNum: number, subjectSlug: string, chapterSlug: string): string {
  return `${boardSlug}:${classNum}:${subjectSlug}:${chapterSlug}`;
}

const QUIZZES: ChapterQuiz[] = [
  // ── CBSE Class 10 Math ───────────────────────────────────────────
  {
    key: "cbse:10:mathematics:real-numbers",
    questions: [
      {
        id: "q1",
        prompt: "The HCF of two numbers is 23 and their LCM is 1449. If one number is 161, what is the other?",
        options: ["207", "203", "1449 / 23", "23 × 1449"],
        correctIndex: 0,
        explanation: "HCF × LCM = product of the two numbers. So 23 × 1449 = 161 × x, giving x = (23 × 1449) / 161 = 207.",
      },
      {
        id: "q2",
        prompt: "Which of the following is irrational?",
        options: ["√16", "√(9/25)", "√2", "0.121212..."],
        correctIndex: 2,
        explanation: "√2 cannot be expressed as p/q where p, q are integers and q ≠ 0. The other options simplify to rational numbers.",
      },
      {
        id: "q3",
        prompt: "By the Fundamental Theorem of Arithmetic, every composite number can be expressed as:",
        options: ["A sum of primes", "A product of primes (unique apart from order)", "A product of two integers", "An even number"],
        correctIndex: 1,
        explanation: "FTA guarantees a unique prime factorisation (up to order of factors) for every composite number.",
      },
      {
        id: "q4",
        prompt: "The decimal expansion of 13/3125 is:",
        options: ["Terminating", "Non-terminating recurring", "Non-terminating non-recurring", "Cannot be determined"],
        correctIndex: 0,
        explanation: "3125 = 5⁵. A rational p/q in lowest form has a terminating decimal iff q has only 2s and 5s as prime factors.",
      },
      {
        id: "q5",
        prompt: "If p and q are positive integers, then their HCF × LCM equals:",
        options: ["p + q", "p × q", "p − q", "p / q"],
        correctIndex: 1,
        explanation: "HCF(p, q) × LCM(p, q) = p × q. This is one of the most-used identities in problems on factors.",
      },
    ],
  },
  {
    key: "cbse:10:mathematics:polynomials",
    questions: [
      {
        id: "q1",
        prompt: "If α and β are zeroes of p(x) = x² − 5x + 6, then α + β equals:",
        options: ["−5", "5", "6", "−6"],
        correctIndex: 1,
        explanation: "For ax² + bx + c, sum of zeroes = −b/a = −(−5)/1 = 5. (Product would be c/a = 6.)",
      },
      {
        id: "q2",
        prompt: "The number of zeroes of the polynomial whose graph cuts the x-axis at 3 points is:",
        options: ["1", "2", "3", "0"],
        correctIndex: 2,
        explanation: "Each x-intercept corresponds to a zero (real root) of the polynomial.",
      },
      {
        id: "q3",
        prompt: "A cubic polynomial has at most:",
        options: ["1 zero", "2 zeroes", "3 zeroes", "4 zeroes"],
        correctIndex: 2,
        explanation: "A polynomial of degree n has at most n real zeroes.",
      },
      {
        id: "q4",
        prompt: "The zeroes of x² − 3 are:",
        options: ["3 and −3", "√3 and −√3", "9 and −9", "3 and 0"],
        correctIndex: 1,
        explanation: "x² − 3 = 0 ⇒ x² = 3 ⇒ x = ±√3.",
      },
      {
        id: "q5",
        prompt: "If 2 is a zero of p(x) = x³ − 4x² + 5x − 2, then on dividing p(x) by (x − 2), the quotient is:",
        options: ["x² − 2x + 1", "x² + 2x + 1", "x² − 4x + 1", "x² − 1"],
        correctIndex: 0,
        explanation: "Polynomial division gives quotient x² − 2x + 1 with remainder 0, confirming 2 is a zero.",
      },
    ],
  },

  // ── CBSE Class 10 Science ────────────────────────────────────────
  {
    key: "cbse:10:science:chemical-reactions-and-equations",
    questions: [
      {
        id: "q1",
        prompt: "A balanced chemical equation has equal:",
        options: ["Atoms on each side of each element", "Molecules on each side", "Reactants and products by count", "States of matter"],
        correctIndex: 0,
        explanation: "The law of conservation of mass requires equal atoms of each element on both sides.",
      },
      {
        id: "q2",
        prompt: "Rusting of iron is an example of:",
        options: ["Combustion", "Reduction", "Oxidation (corrosion)", "Decomposition"],
        correctIndex: 2,
        explanation: "Iron oxidises slowly in the presence of oxygen and water, forming hydrated iron oxide (rust). This is a slow oxidation/corrosion reaction.",
      },
      {
        id: "q3",
        prompt: "The reaction 2H₂O → 2H₂ + O₂ (electrolysis) is a:",
        options: ["Combination reaction", "Decomposition reaction", "Displacement reaction", "Double-displacement reaction"],
        correctIndex: 1,
        explanation: "A single reactant breaks down into simpler products — the definition of decomposition.",
      },
      {
        id: "q4",
        prompt: "Which one of the following is a redox reaction?",
        options: ["NaOH + HCl → NaCl + H₂O", "BaCl₂ + Na₂SO₄ → BaSO₄ + 2NaCl", "Zn + 2HCl → ZnCl₂ + H₂", "CaO + H₂O → Ca(OH)₂"],
        correctIndex: 2,
        explanation: "Zn → Zn²⁺ (oxidation, loses electrons) and H⁺ → H₂ (reduction, gains electrons). Both processes happen together — redox.",
      },
      {
        id: "q5",
        prompt: "Antioxidants are added to packaged food to prevent:",
        options: ["Bacterial growth", "Rancidity caused by oxidation of oils", "Loss of flavour", "Loss of colour"],
        correctIndex: 1,
        explanation: "Oils + fats in food oxidise on storage, producing the smell + taste of rancidity. Antioxidants slow this oxidation.",
      },
    ],
  },
  {
    key: "cbse:10:science:light-reflection-and-refraction",
    questions: [
      {
        id: "q1",
        prompt: "A concave mirror produces a virtual, erect and magnified image when the object is placed:",
        options: ["At the centre of curvature", "Between the pole and the focus", "Beyond the centre of curvature", "At infinity"],
        correctIndex: 1,
        explanation: "When the object is between the pole (P) and the focus (F), the reflected rays diverge and appear to come from behind the mirror, forming a virtual, erect, magnified image.",
      },
      {
        id: "q2",
        prompt: "The refractive index of a medium with respect to vacuum is:",
        options: ["Speed of light in vacuum / speed in the medium", "Speed in medium / speed in vacuum", "Frequency in medium / frequency in vacuum", "Always less than 1"],
        correctIndex: 0,
        explanation: "Absolute refractive index n = c / v, where c is the speed of light in vacuum and v in the medium.",
      },
      {
        id: "q3",
        prompt: "The power of a lens is +2 D. Its focal length is:",
        options: ["+50 cm (convex)", "−50 cm (concave)", "+200 cm (convex)", "−200 cm (concave)"],
        correctIndex: 0,
        explanation: "Power P = 1/f (in metres). f = 1/2 = 0.5 m = 50 cm. Positive sign means convex lens.",
      },
      {
        id: "q4",
        prompt: "The image formed by a convex mirror is always:",
        options: ["Real, inverted, magnified", "Virtual, erect, diminished", "Real, erect, same size", "Virtual, inverted, magnified"],
        correctIndex: 1,
        explanation: "A convex (diverging) mirror always forms a virtual, erect, diminished image — useful in rear-view mirrors for wide angle.",
      },
      {
        id: "q5",
        prompt: "Snell's law states that:",
        options: ["sin i / sin r = constant (refractive index)", "i × r = constant", "i + r = 90°", "i / r = c (speed of light)"],
        correctIndex: 0,
        explanation: "Snell's law: sin(angle of incidence) / sin(angle of refraction) = refractive index of medium 2 w.r.t. medium 1.",
      },
    ],
  },
  {
    key: "cbse:10:science:electricity",
    questions: [
      {
        id: "q1",
        prompt: "Ohm's law states that:",
        options: ["V = I/R", "V = IR (when temperature is constant)", "V = R/I", "V = I² R"],
        correctIndex: 1,
        explanation: "Ohm's law: V = IR, valid for ohmic conductors at constant temperature.",
      },
      {
        id: "q2",
        prompt: "Three resistors of 2 Ω, 3 Ω and 6 Ω are connected in parallel. The effective resistance is:",
        options: ["11 Ω", "1 Ω", "6 Ω", "0.5 Ω"],
        correctIndex: 1,
        explanation: "1/R = 1/2 + 1/3 + 1/6 = 3/6 + 2/6 + 1/6 = 6/6 = 1. So R = 1 Ω.",
      },
      {
        id: "q3",
        prompt: "The SI unit of electric charge is:",
        options: ["Volt", "Ampere", "Coulomb", "Watt"],
        correctIndex: 2,
        explanation: "Charge is measured in coulombs (C). 1 ampere = 1 coulomb per second.",
      },
      {
        id: "q4",
        prompt: "An electric iron of resistance 22 Ω draws a current of 5 A. The heat developed in 30 s is:",
        options: ["3300 J", "16500 J", "550 J", "275 J"],
        correctIndex: 1,
        explanation: "Heat H = I²Rt = 5² × 22 × 30 = 25 × 22 × 30 = 16,500 J.",
      },
      {
        id: "q5",
        prompt: "The resistance of a conductor depends on:",
        options: ["Length only", "Cross-sectional area only", "Material only", "Length, cross-sectional area, material, and temperature"],
        correctIndex: 3,
        explanation: "R = ρL/A, where ρ is resistivity (depends on material + temperature), L is length, A is cross-sectional area.",
      },
    ],
  },

  // ── CBSE Class 12 Physics ────────────────────────────────────────
  {
    key: "cbse:12:physics:electric-charges-and-fields",
    questions: [
      {
        id: "q1",
        prompt: "Coulomb's law states that the electrostatic force between two point charges is:",
        options: [
          "Directly proportional to the product of charges, inversely to the distance",
          "Directly proportional to the product of charges, inversely to the square of distance",
          "Inversely proportional to the product of charges, directly to the distance",
          "Inversely proportional to the product of charges, directly to the square of distance",
        ],
        correctIndex: 1,
        explanation: "F = kq₁q₂/r², where r is the distance. The square dependence is what makes long-range electric forces interesting.",
      },
      {
        id: "q2",
        prompt: "The SI unit of electric field is:",
        options: ["N/C (equivalent to V/m)", "C/N", "N·C", "V·m"],
        correctIndex: 0,
        explanation: "E = F/q, so units are N/C. Equivalent to V/m since E = −dV/dr.",
      },
      {
        id: "q3",
        prompt: "Gauss's law in integral form is:",
        options: ["∮E·dA = q/ε₀", "∮E·dA = q·ε₀", "∮E·dA = q²/ε₀", "∮E·dA = ε₀/q"],
        correctIndex: 0,
        explanation: "Total flux through a closed surface = enclosed charge / ε₀. Foundational for electrostatics in vacuum.",
      },
      {
        id: "q4",
        prompt: "The electric field inside a conductor in electrostatic equilibrium is:",
        options: ["Maximum", "Equal to that outside", "Zero", "Depends on the conductor's shape"],
        correctIndex: 2,
        explanation: "In electrostatic equilibrium, charges redistribute so the net field inside the conductor is zero — otherwise charges would still be moving.",
      },
      {
        id: "q5",
        prompt: "Two parallel plates carry equal and opposite charges. The electric field between them:",
        options: ["Increases linearly with distance from one plate", "Decreases with distance", "Is uniform", "Is zero"],
        correctIndex: 2,
        explanation: "For an ideal parallel-plate capacitor, the field between the plates is uniform (E = σ/ε₀) and ~zero outside.",
      },
    ],
  },
  {
    key: "cbse:12:physics:current-electricity",
    questions: [
      {
        id: "q1",
        prompt: "Drift velocity of electrons in a conductor is typically of the order:",
        options: ["10⁻⁴ m/s", "10⁻² m/s", "10⁶ m/s", "Speed of light"],
        correctIndex: 0,
        explanation: "Despite the electrical signal traveling near-instantaneously, individual electron drift is very slow — about 10⁻⁴ m/s for typical currents.",
      },
      {
        id: "q2",
        prompt: "Kirchhoff's voltage law states that:",
        options: ["The sum of currents at a junction is zero", "The sum of EMFs around a closed loop equals zero (after accounting for drops)", "Resistance is proportional to length", "Power = V²/R"],
        correctIndex: 1,
        explanation: "KVL is conservation of energy around a closed circuit loop: Σ(EMFs) = Σ(IR drops).",
      },
      {
        id: "q3",
        prompt: "A potentiometer is most useful for measuring:",
        options: ["Very small EMFs accurately", "Very large currents", "Resistance directly", "Capacitance"],
        correctIndex: 0,
        explanation: "Potentiometer measures EMF without drawing any current from the source — perfect for unknown EMFs and comparing cells.",
      },
      {
        id: "q4",
        prompt: "Wheatstone bridge is balanced when:",
        options: ["I through galvanometer is maximum", "P/Q = R/S", "P × S = Q × R only when all four are equal", "Voltage is zero across the source"],
        correctIndex: 1,
        explanation: "Balanced condition: P/Q = R/S (no current through galvanometer). Used to find unknown resistance precisely.",
      },
      {
        id: "q5",
        prompt: "If a wire of resistance R is stretched to twice its length, its new resistance is:",
        options: ["R", "2R", "4R", "R/2"],
        correctIndex: 2,
        explanation: "Stretching doubles length, halves cross-section (volume constant). R = ρL/A. New R = ρ(2L)/(A/2) = 4R.",
      },
    ],
  },

  // ── CBSE Class 12 Chemistry ──────────────────────────────────────
  {
    key: "cbse:12:chemistry:solutions",
    questions: [
      {
        id: "q1",
        prompt: "Molality is defined as:",
        options: [
          "Moles of solute per litre of solution",
          "Moles of solute per kilogram of solvent",
          "Mass of solute per litre of solvent",
          "Moles of solute per litre of solvent",
        ],
        correctIndex: 1,
        explanation: "Molality = moles of solute / mass of solvent (in kg). Unlike molarity, molality doesn't change with temperature.",
      },
      {
        id: "q2",
        prompt: "Raoult's law for an ideal binary solution states:",
        options: ["P_total = P°_A + P°_B", "P_total = x_A P°_A + x_B P°_B", "P_total = (x_A + x_B) P°_A", "P_total = P°_A · P°_B"],
        correctIndex: 1,
        explanation: "Total vapour pressure equals the sum of partial pressures, each being mole fraction times pure-component vapour pressure.",
      },
      {
        id: "q3",
        prompt: "Which of the following is a colligative property?",
        options: ["Density", "Refractive index", "Osmotic pressure", "Viscosity"],
        correctIndex: 2,
        explanation: "Colligative properties depend only on the number of solute particles, not their identity. Osmotic pressure is one of the four (along with vapour pressure lowering, BP elevation, FP depression).",
      },
      {
        id: "q4",
        prompt: "The van't Hoff factor (i) for NaCl (assumed fully dissociated) is:",
        options: ["1", "2", "0.5", "3"],
        correctIndex: 1,
        explanation: "NaCl → Na⁺ + Cl⁻ gives 2 particles per formula unit. For full dissociation, i = 2.",
      },
      {
        id: "q5",
        prompt: "Boiling point elevation ΔT_b is given by:",
        options: ["ΔT_b = K_b × m", "ΔT_b = K_b × M", "ΔT_b = K_f × m", "ΔT_b = R × T × m"],
        correctIndex: 0,
        explanation: "ΔT_b = K_b × m, where K_b is the molal boiling-point elevation constant and m is molality.",
      },
    ],
  },

  // ── CBSE Class 12 Math ───────────────────────────────────────────
  {
    key: "cbse:12:mathematics:matrices",
    questions: [
      {
        id: "q1",
        prompt: "If A is a square matrix of order 3, then |3A| equals:",
        options: ["3|A|", "9|A|", "27|A|", "|A|"],
        correctIndex: 2,
        explanation: "|kA| = kⁿ |A| for an n × n matrix. Here n = 3 and k = 3, so |3A| = 27|A|.",
      },
      {
        id: "q2",
        prompt: "A matrix A is symmetric if:",
        options: ["A = −A", "A = Aᵀ", "A² = I", "A = A⁻¹"],
        correctIndex: 1,
        explanation: "A symmetric matrix equals its transpose (entries are symmetric about the main diagonal).",
      },
      {
        id: "q3",
        prompt: "If A is invertible, then (Aᵀ)⁻¹ equals:",
        options: ["(A⁻¹)ᵀ", "Aᵀ", "A⁻¹", "−A"],
        correctIndex: 0,
        explanation: "For an invertible A, (Aᵀ)⁻¹ = (A⁻¹)ᵀ. Both transpose and inverse commute.",
      },
      {
        id: "q4",
        prompt: "The matrix [[2, 3], [1, 4]] has determinant:",
        options: ["5", "8 − 3 = 5", "11", "−5"],
        correctIndex: 0,
        explanation: "Determinant of a 2×2 matrix [[a, b], [c, d]] is ad − bc = 2×4 − 3×1 = 8 − 3 = 5.",
      },
      {
        id: "q5",
        prompt: "If A is a 2×3 matrix and B is a 3×2 matrix, then AB is of order:",
        options: ["2×2", "3×3", "2×3", "Undefined"],
        correctIndex: 0,
        explanation: "(m × n)(n × p) = (m × p). Here (2 × 3)(3 × 2) = (2 × 2).",
      },
    ],
  },
  {
    key: "cbse:12:mathematics:continuity-and-differentiability",
    questions: [
      {
        id: "q1",
        prompt: "A function f is continuous at x = a if:",
        options: ["lim_{x→a} f(x) = f(a) (and both exist)", "f(a) is defined only", "lim_{x→a} f(x) exists only", "f is differentiable at a"],
        correctIndex: 0,
        explanation: "Continuity requires the limit to exist, f(a) to be defined, and the two to be equal.",
      },
      {
        id: "q2",
        prompt: "The derivative of sin x with respect to x is:",
        options: ["cos x", "−cos x", "−sin x", "tan x"],
        correctIndex: 0,
        explanation: "d/dx (sin x) = cos x. Foundational standard derivative.",
      },
      {
        id: "q3",
        prompt: "If f(x) = e^(2x), then f'(x) is:",
        options: ["e^(2x)", "2e^(2x)", "2x e^(2x)", "e^x"],
        correctIndex: 1,
        explanation: "Chain rule: d/dx e^(g(x)) = e^(g(x)) · g'(x). Here g(x) = 2x, g'(x) = 2.",
      },
      {
        id: "q4",
        prompt: "Differentiability implies:",
        options: ["Continuity, but not conversely", "Continuity, and conversely", "Neither implies the other", "Continuity at all points except corners"],
        correctIndex: 0,
        explanation: "Every differentiable function is continuous, but not every continuous function is differentiable (e.g., |x| at x = 0).",
      },
      {
        id: "q5",
        prompt: "The derivative of x^n (where n is a real number) is:",
        options: ["n · x^(n−1)", "n · x^n", "x^(n−1)", "n^(x−1)"],
        correctIndex: 0,
        explanation: "Power rule: d/dx (xⁿ) = n · x^(n−1). Works for any real n.",
      },
    ],
  },

  // ── CBSE Class 12 Biology ────────────────────────────────────────
  {
    key: "cbse:12:biology:human-reproduction",
    questions: [
      {
        id: "q1",
        prompt: "Spermatogenesis takes place in:",
        options: ["Epididymis", "Seminiferous tubules of the testes", "Prostate gland", "Vas deferens"],
        correctIndex: 1,
        explanation: "Sperm cells are produced in the seminiferous tubules within the testes, then mature in the epididymis.",
      },
      {
        id: "q2",
        prompt: "The hormone that triggers ovulation is:",
        options: ["FSH surge", "LH surge", "Estrogen drop", "Progesterone surge"],
        correctIndex: 1,
        explanation: "A surge of luteinizing hormone (LH) on roughly day 14 of the menstrual cycle causes the mature follicle to rupture and release the ovum.",
      },
      {
        id: "q3",
        prompt: "Implantation of the embryo occurs in the:",
        options: ["Cervix", "Endometrium of the uterus", "Fallopian tube", "Ovary"],
        correctIndex: 1,
        explanation: "After fertilisation in the fallopian tube, the blastocyst migrates and implants into the thickened endometrium lining the uterus.",
      },
      {
        id: "q4",
        prompt: "The corpus luteum secretes mainly:",
        options: ["Estrogen", "Progesterone", "FSH", "Oxytocin"],
        correctIndex: 1,
        explanation: "Corpus luteum (formed from the ruptured follicle) secretes progesterone, which maintains the uterine lining for pregnancy.",
      },
      {
        id: "q5",
        prompt: "Fertilisation in humans typically occurs in the:",
        options: ["Ovary", "Ampulla of the fallopian tube", "Uterus", "Cervix"],
        correctIndex: 1,
        explanation: "Sperm meets ovum in the ampulla — the wider middle section of the fallopian tube.",
      },
    ],
  },
];

const QUIZ_INDEX = new Map(QUIZZES.map((q) => [q.key, q]));

export function findQuiz(boardSlug: string, classNum: number, subjectSlug: string, chapterSlug: string): ChapterQuiz | undefined {
  return QUIZ_INDEX.get(quizKey(boardSlug, classNum, subjectSlug, chapterSlug));
}

export function hasQuiz(boardSlug: string, classNum: number, subjectSlug: string, chapterSlug: string): boolean {
  return QUIZ_INDEX.has(quizKey(boardSlug, classNum, subjectSlug, chapterSlug));
}
