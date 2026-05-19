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

  // ═══════════════════════════════════════════════════════════════════
  // EXPANSION BATCH — 20 more quizzes covering high-value chapters
  // ═══════════════════════════════════════════════════════════════════

  // ── CBSE Class 10 Math (remaining) ──────────────────────────────
  {
    key: "cbse:10:mathematics:quadratic-equations",
    questions: [
      { id: "q1", prompt: "The roots of x² + 7x + 10 = 0 are:", options: ["−2 and −5", "2 and 5", "−2 and 5", "2 and −5"], correctIndex: 0, explanation: "Factorise: (x+2)(x+5) = 0 → x = −2, −5." },
      { id: "q2", prompt: "If the discriminant of ax² + bx + c = 0 is zero, the roots are:", options: ["Distinct real", "Equal real", "Complex", "No real roots"], correctIndex: 1, explanation: "D = b² − 4ac = 0 means roots are equal (and real)." },
      { id: "q3", prompt: "The discriminant of 2x² − 4x + 3 = 0 is:", options: ["−8", "16", "8", "−16"], correctIndex: 0, explanation: "D = b² − 4ac = (−4)² − 4(2)(3) = 16 − 24 = −8." },
      { id: "q4", prompt: "Sum + product of roots of 3x² + 5x − 2 = 0:", options: ["Sum −5/3, Product −2/3", "Sum 5/3, Product 2/3", "Sum 5/3, Product −2/3", "Sum −5/3, Product 2/3"], correctIndex: 0, explanation: "Sum = −b/a = −5/3. Product = c/a = −2/3." },
      { id: "q5", prompt: "Which quadratic has roots 3 and −1?", options: ["x² − 2x − 3 = 0", "x² + 2x − 3 = 0", "x² − 2x + 3 = 0", "x² + 2x + 3 = 0"], correctIndex: 0, explanation: "Sum = 2, Product = −3 → x² − 2x − 3 = 0." },
    ],
  },
  {
    key: "cbse:10:mathematics:arithmetic-progressions",
    questions: [
      { id: "q1", prompt: "Which sequence is an AP?", options: ["1, 3, 9, 27, ...", "2, 5, 8, 11, ...", "1, 4, 9, 16, ...", "1, 1, 2, 3, 5, ..."], correctIndex: 1, explanation: "Common difference 3 throughout." },
      { id: "q2", prompt: "The 10th term of the AP 2, 5, 8, 11, ... is:", options: ["29", "32", "27", "26"], correctIndex: 0, explanation: "a + 9d = 2 + 9(3) = 29." },
      { id: "q3", prompt: "Sum of first n natural numbers is:", options: ["n(n+1)", "n(n+1)/2", "n²", "n(n−1)/2"], correctIndex: 1, explanation: "Standard result S_n = n(n+1)/2." },
      { id: "q4", prompt: "If 7th term = 32 and 13th term = 62, then common difference is:", options: ["5", "6", "4", "7"], correctIndex: 0, explanation: "(13th − 7th) / (13−7) = 30/6 = 5." },
      { id: "q5", prompt: "Sum of first 20 terms of AP 1, 4, 7, 10, ...:", options: ["570", "590", "620", "640"], correctIndex: 1, explanation: "S_20 = 20/2 × [2(1) + 19(3)] = 10 × 59 = 590." },
    ],
  },
  {
    key: "cbse:10:mathematics:coordinate-geometry",
    questions: [
      { id: "q1", prompt: "Distance between (3, 4) and (0, 0):", options: ["5", "7", "25", "12"], correctIndex: 0, explanation: "√(3² + 4²) = √25 = 5." },
      { id: "q2", prompt: "Mid-point of (2, 4) and (6, 8):", options: ["(4, 6)", "(8, 12)", "(3, 5)", "(2, 4)"], correctIndex: 0, explanation: "Average: ((2+6)/2, (4+8)/2) = (4, 6)." },
      { id: "q3", prompt: "Point that divides (1, 2) and (4, 5) in ratio 1:2 (internal):", options: ["(2, 3)", "(3, 4)", "(2.5, 3.5)", "(1.5, 2.5)"], correctIndex: 0, explanation: "(1×4 + 2×1)/3, (1×5 + 2×2)/3 = (6/3, 9/3) = (2, 3)." },
      { id: "q4", prompt: "Area of triangle with vertices (0,0), (4,0), (0,3):", options: ["6", "12", "24", "5"], correctIndex: 0, explanation: "Right triangle: (1/2)(4)(3) = 6." },
      { id: "q5", prompt: "Slope of line joining (2, 3) and (4, 7):", options: ["2", "1/2", "4", "1/4"], correctIndex: 0, explanation: "(7−3)/(4−2) = 4/2 = 2." },
    ],
  },
  {
    key: "cbse:10:mathematics:triangles",
    questions: [
      { id: "q1", prompt: "Two triangles are similar if their corresponding sides are:", options: ["Equal", "Proportional + equal angles", "Just proportional", "Just equal angles"], correctIndex: 1, explanation: "Similar triangles need both: proportional sides AND equal corresponding angles." },
      { id: "q2", prompt: "By AA similarity, two triangles are similar if:", options: ["Two angles equal", "Three sides proportional", "Two sides equal", "One angle equal"], correctIndex: 0, explanation: "AA similarity: two pairs of equal angles → triangles similar (third angle auto-equal)." },
      { id: "q3", prompt: "Pythagoras theorem applies to:", options: ["Any triangle", "Right-angled triangle only", "Equilateral only", "Isoceles only"], correctIndex: 1, explanation: "Pythagoras: a² + b² = c² holds in right-angled triangles only." },
      { id: "q4", prompt: "Ratio of areas of two similar triangles is:", options: ["Ratio of sides", "Square of ratio of sides", "Cube of ratio of sides", "Equal"], correctIndex: 1, explanation: "Ratio of areas = (ratio of corresponding sides)²." },
      { id: "q5", prompt: "In ΔABC, AD is median. If AB=6, AC=8, BC=10, then ΔABD and ΔACD:", options: ["Are congruent", "Are similar", "Have equal areas", "Have equal perimeters"], correctIndex: 2, explanation: "Median divides triangle into two equal-area triangles (not congruent)." },
    ],
  },
  {
    key: "cbse:10:mathematics:circles",
    questions: [
      { id: "q1", prompt: "The tangent at any point of a circle is _____ to the radius at the point of contact.", options: ["Parallel", "Perpendicular", "At 45°", "Equal"], correctIndex: 1, explanation: "Tangent ⊥ radius at point of contact — standard theorem." },
      { id: "q2", prompt: "Length of tangent from external point to circle of radius r at distance d:", options: ["√(d² + r²)", "√(d² − r²)", "d − r", "d + r"], correctIndex: 1, explanation: "Using Pythagoras: tangent² + r² = d² → tangent = √(d² − r²)." },
      { id: "q3", prompt: "Number of tangents from a point ON a circle:", options: ["1", "2", "0", "Infinite"], correctIndex: 0, explanation: "One unique tangent at any point on the circle." },
      { id: "q4", prompt: "Two tangents from external point to a circle are:", options: ["Equal in length", "Unequal", "Always perpendicular", "Always at 60°"], correctIndex: 0, explanation: "Tangents drawn from an external point to a circle are equal in length." },
      { id: "q5", prompt: "If radii of two concentric circles are 3 and 5, length of chord of larger circle that touches smaller:", options: ["6", "8", "4", "10"], correctIndex: 1, explanation: "Chord of larger circle tangent to smaller; half-chord = √(5² − 3²) = 4, so chord = 8." },
    ],
  },

  // ── CBSE Class 10 Science (more) ────────────────────────────────
  {
    key: "cbse:10:science:metals-and-non-metals",
    questions: [
      { id: "q1", prompt: "Most reactive metal in the reactivity series:", options: ["K (Potassium)", "Cu (Copper)", "Au (Gold)", "Fe (Iron)"], correctIndex: 0, explanation: "Potassium is at top of reactivity series — most reactive." },
      { id: "q2", prompt: "Process of extracting metal from ore is called:", options: ["Roasting", "Calcination", "Metallurgy", "Reduction"], correctIndex: 2, explanation: "Metallurgy is the umbrella term; roasting + calcination + reduction are stages." },
      { id: "q3", prompt: "Which is a non-metal?", options: ["Iron", "Carbon", "Aluminium", "Sodium"], correctIndex: 1, explanation: "Carbon is a non-metal (though graphite is a non-metallic conductor)." },
      { id: "q4", prompt: "Galvanisation is coating iron with:", options: ["Tin", "Zinc", "Aluminium", "Chromium"], correctIndex: 1, explanation: "Galvanisation prevents rust by coating with zinc." },
      { id: "q5", prompt: "Which is amphoteric?", options: ["NaOH", "HCl", "Al2O3", "CaO"], correctIndex: 2, explanation: "Aluminium oxide reacts with both acids and bases — amphoteric." },
    ],
  },
  {
    key: "cbse:10:science:carbon-and-its-compounds",
    questions: [
      { id: "q1", prompt: "Catenation is the ability of:", options: ["Carbon to form rings + chains", "Carbon to ionise", "Carbon to react with water", "Carbon to conduct"], correctIndex: 0, explanation: "Catenation: ability of an element to link with own atoms in chains/rings. Carbon's strongest catenator." },
      { id: "q2", prompt: "Functional group in ethanol (CH3CH2OH):", options: ["−COOH", "−OH", "−CHO", "−O−"], correctIndex: 1, explanation: "Ethanol has −OH (hydroxyl) functional group." },
      { id: "q3", prompt: "Saturated hydrocarbon contains:", options: ["Only single bonds", "At least one double bond", "Only triple bonds", "Aromatic ring"], correctIndex: 0, explanation: "Alkanes (saturated) have only single bonds." },
      { id: "q4", prompt: "Soap molecules have:", options: ["Hydrophilic head + hydrophobic tail", "Only hydrophobic head", "Only hydrophilic head", "No specific structure"], correctIndex: 0, explanation: "Soap = sodium salt of fatty acid: hydrophilic head (−COONa) + hydrophobic tail." },
      { id: "q5", prompt: "Conversion of ethanol → ethanoic acid is:", options: ["Reduction", "Oxidation", "Hydration", "Substitution"], correctIndex: 1, explanation: "Adding oxygen / losing H = oxidation. CH3CH2OH → CH3COOH adds O." },
    ],
  },
  {
    key: "cbse:10:science:life-processes",
    questions: [
      { id: "q1", prompt: "Photosynthesis takes place in:", options: ["Mitochondria", "Chloroplast", "Nucleus", "Ribosomes"], correctIndex: 1, explanation: "Chlorophyll (in chloroplasts) is the site of photosynthesis." },
      { id: "q2", prompt: "Human respiration is:", options: ["Anaerobic", "Aerobic + anaerobic when needed", "Always anaerobic", "Photosynthesis"], correctIndex: 1, explanation: "Humans normally aerobic; muscle cells can switch to anaerobic during heavy exercise." },
      { id: "q3", prompt: "Excretory unit of kidney is:", options: ["Neuron", "Nephron", "Alveoli", "Villus"], correctIndex: 1, explanation: "Nephron is the functional unit of the kidney." },
      { id: "q4", prompt: "Function of valves in heart:", options: ["Pump blood", "Prevent back-flow of blood", "Filter waste", "Carry oxygen"], correctIndex: 1, explanation: "Heart valves ensure one-way blood flow." },
      { id: "q5", prompt: "In plants, transport of food is via:", options: ["Xylem", "Phloem", "Stomata", "Roots only"], correctIndex: 1, explanation: "Phloem transports food (sugars) made in leaves." },
    ],
  },

  // ── CBSE Class 12 Physics (more) ────────────────────────────────
  {
    key: "cbse:12:physics:moving-charges-and-magnetism",
    questions: [
      { id: "q1", prompt: "Force on a charged particle moving with velocity v in magnetic field B:", options: ["F = qE", "F = qvB sinθ", "F = ma", "F = qB"], correctIndex: 1, explanation: "Lorentz force from magnetic field: F = qv × B = qvB sinθ." },
      { id: "q2", prompt: "Biot-Savart law gives:", options: ["Force on a moving charge", "Magnetic field of a current element", "Voltage across a resistor", "Power dissipated"], correctIndex: 1, explanation: "Biot-Savart: dB = (μ₀/4π)(I dL × r̂)/r²." },
      { id: "q3", prompt: "Magnetic field at centre of circular coil with N turns, current I, radius r:", options: ["μ₀I/(2r)", "μ₀NI/(2r)", "μ₀NI/r", "μ₀I/r"], correctIndex: 1, explanation: "B = μ₀NI/(2r) at the centre of a circular coil." },
      { id: "q4", prompt: "Ampere's law states the line integral of B around a closed loop equals:", options: ["μ₀ × enclosed current", "Force on the loop", "Field at the centre", "0"], correctIndex: 0, explanation: "∮B·dl = μ₀I_enc." },
      { id: "q5", prompt: "A galvanometer can be converted to ammeter by connecting:", options: ["High resistance in series", "Low resistance in parallel (shunt)", "Capacitor in parallel", "Voltmeter in series"], correctIndex: 1, explanation: "Ammeter = galvanometer + low-resistance shunt in parallel (allows large currents)." },
    ],
  },
  {
    key: "cbse:12:physics:electromagnetic-induction",
    questions: [
      { id: "q1", prompt: "Faraday's law states EMF = ", options: ["dV/dt", "−dΦ/dt", "I × R", "B × A"], correctIndex: 1, explanation: "ε = −dΦ/dt (Faraday's law of electromagnetic induction)." },
      { id: "q2", prompt: "Lenz's law arises from:", options: ["Conservation of momentum", "Conservation of energy", "Newton's first law", "Coulomb's law"], correctIndex: 1, explanation: "Lenz's law: induced EMF opposes the change — required by energy conservation." },
      { id: "q3", prompt: "Self-inductance unit is:", options: ["Volt", "Ampere", "Henry", "Tesla"], correctIndex: 2, explanation: "Henry (H) = 1 V/(A/s) — unit of inductance." },
      { id: "q4", prompt: "Motional EMF in a rod of length L moving with velocity v in field B (all perpendicular):", options: ["BvL", "B/(vL)", "B × v", "B + v + L"], correctIndex: 0, explanation: "EMF = BvL (motional EMF when v, L, B are mutually perpendicular)." },
      { id: "q5", prompt: "Transformer works on principle of:", options: ["Self induction", "Mutual induction", "Electrostatic induction", "Lenz's law alone"], correctIndex: 1, explanation: "Transformer uses mutual induction between primary + secondary coils via shared flux." },
    ],
  },
  {
    key: "cbse:12:physics:ray-optics-and-optical-instruments",
    questions: [
      { id: "q1", prompt: "Snell's law: n1 sin θ1 = n2 sin θ2. If light goes from rarer to denser, the ray:", options: ["Bends away from normal", "Bends towards normal", "Doesn't bend", "Reflects fully"], correctIndex: 1, explanation: "Rarer → denser: ray bends towards normal." },
      { id: "q2", prompt: "Critical angle for total internal reflection of light from glass (n=1.5) to air:", options: ["41.8°", "45°", "60°", "30°"], correctIndex: 0, explanation: "sin θ_c = 1/n = 1/1.5 = 0.667 → θ_c ≈ 41.8°." },
      { id: "q3", prompt: "Power of lens with focal length 50 cm:", options: ["+0.5 D", "+2 D", "−2 D", "+5 D"], correctIndex: 1, explanation: "P = 1/f = 1/0.5 = 2 D (positive for convex lens of 50 cm focal length)." },
      { id: "q4", prompt: "Compound microscope produces final image that is:", options: ["Real + inverted", "Virtual + inverted", "Real + erect", "Virtual + erect"], correctIndex: 1, explanation: "Compound microscope: virtual, inverted, magnified final image." },
      { id: "q5", prompt: "Refractive index of medium depends on:", options: ["Wavelength of light", "Density only", "Temperature only", "Mass of medium"], correctIndex: 0, explanation: "Refractive index varies with wavelength — causes dispersion (rainbow effect)." },
    ],
  },

  // ── CBSE Class 12 Chemistry (more) ──────────────────────────────
  {
    key: "cbse:12:chemistry:electrochemistry",
    questions: [
      { id: "q1", prompt: "Nernst equation gives EMF of cell at:", options: ["Standard conditions only", "Non-standard conditions", "Equilibrium only", "Zero current"], correctIndex: 1, explanation: "Nernst eq. extends standard EMF to non-standard concentration/temperature: E = E° − (0.0591/n) log Q." },
      { id: "q2", prompt: "In a galvanic cell, oxidation occurs at:", options: ["Cathode", "Anode", "Both electrodes", "Neither"], correctIndex: 1, explanation: "Galvanic cell: oxidation at anode (loses electrons), reduction at cathode." },
      { id: "q3", prompt: "Standard hydrogen electrode (SHE) has EMF:", options: ["1.0 V", "0 V", "−0.5 V", "Variable"], correctIndex: 1, explanation: "SHE is defined as 0 V (reference for all electrode potentials)." },
      { id: "q4", prompt: "Conductivity unit is:", options: ["Ω (ohm)", "S m⁻¹ (siemens per metre)", "S (siemens)", "F (farad)"], correctIndex: 1, explanation: "Conductivity κ has unit S m⁻¹ (siemens per metre). Conductance is S; resistance is Ω." },
      { id: "q5", prompt: "Faraday's first law of electrolysis:", options: ["Mass deposited ∝ Q (charge)", "Mass deposited ∝ time only", "Mass deposited ∝ V (voltage)", "Mass deposited = current × ρ"], correctIndex: 0, explanation: "First law: m ∝ Q (charge passed). m = ZQ where Z is electrochemical equivalent." },
    ],
  },
  {
    key: "cbse:12:chemistry:chemical-kinetics",
    questions: [
      { id: "q1", prompt: "Rate of a first-order reaction depends on:", options: ["Just one reactant's concentration", "All reactants' concentrations", "Time only", "Temperature only"], correctIndex: 0, explanation: "First-order: rate = k[A]^1; only one reactant's concentration." },
      { id: "q2", prompt: "Half-life of first-order reaction:", options: ["t₁/₂ = ln2/k", "t₁/₂ = 1/k", "t₁/₂ = k/ln2", "t₁/₂ = 1/(2k)"], correctIndex: 0, explanation: "First-order half-life: t₁/₂ = ln2/k (independent of [A]₀)." },
      { id: "q3", prompt: "Arrhenius equation: k = A · e^(−Ea/RT). What does Ea represent?", options: ["Activation energy", "Internal energy", "Free energy", "Bond energy"], correctIndex: 0, explanation: "Ea is the activation energy — minimum energy reactants need to react." },
      { id: "q4", prompt: "If temperature increases by 10°C, rate roughly:", options: ["Doubles or triples", "Halves", "Stays same", "Decreases"], correctIndex: 0, explanation: "Rule of thumb: rate doubles or triples per 10°C rise (depends on Ea)." },
      { id: "q5", prompt: "Order of reaction is determined by:", options: ["Stoichiometry of balanced equation", "Experimentally", "Pressure of system", "Always 1"], correctIndex: 1, explanation: "Order is determined experimentally — NOT by balanced equation coefficients." },
    ],
  },
  {
    key: "cbse:12:chemistry:coordination-compounds",
    questions: [
      { id: "q1", prompt: "Ligand donates:", options: ["Proton", "Electron pair", "Electron only", "Photon"], correctIndex: 1, explanation: "Ligand is a Lewis base — donates an electron pair to the central metal atom." },
      { id: "q2", prompt: "Coordination number of central metal in [Co(NH₃)₆]³⁺:", options: ["3", "4", "6", "8"], correctIndex: 2, explanation: "6 ammonia ligands coordinated to Co — coordination number 6." },
      { id: "q3", prompt: "Geometry of [Co(NH₃)₆]³⁺ is:", options: ["Octahedral", "Tetrahedral", "Square planar", "Linear"], correctIndex: 0, explanation: "Coordination number 6 typically gives octahedral geometry." },
      { id: "q4", prompt: "Bidentate ligand has _____ donor atoms.", options: ["1", "2", "3", "6"], correctIndex: 1, explanation: "Bidentate = 2 donor atoms (e.g., ethylenediamine)." },
      { id: "q5", prompt: "Cisplatin [PtCl₂(NH₃)₂] geometry:", options: ["Tetrahedral", "Square planar", "Octahedral", "Linear"], correctIndex: 1, explanation: "Pt(II) with coordination number 4 has square-planar geometry — drug uses cis-isomer." },
    ],
  },

  // ── CBSE Class 12 Biology (more) ────────────────────────────────
  {
    key: "cbse:12:biology:principles-of-inheritance",
    questions: [
      { id: "q1", prompt: "Mendel's law of segregation:", options: ["Alleles separate during gamete formation", "All genes inherited together", "Dominant allele suppresses recessive", "Mutations are random"], correctIndex: 0, explanation: "Law of segregation: each parent contributes one of two alleles per gene to offspring." },
      { id: "q2", prompt: "F2 generation ratio in monohybrid cross is:", options: ["1:1", "3:1", "9:3:3:1", "9:1"], correctIndex: 1, explanation: "Monohybrid F2: 3 dominant : 1 recessive phenotype." },
      { id: "q3", prompt: "Down's syndrome is caused by:", options: ["Trisomy 21", "Trisomy 18", "X-linked recessive", "Mitochondrial disease"], correctIndex: 0, explanation: "Down's syndrome = trisomy of chromosome 21." },
      { id: "q4", prompt: "Sex determination in humans is XY-XX type, meaning male is:", options: ["XX", "XY", "XYY", "X0"], correctIndex: 1, explanation: "Human males are XY (heterogametic); females are XX." },
      { id: "q5", prompt: "Haemophilia is:", options: ["X-linked recessive", "Y-linked dominant", "Autosomal dominant", "Mitochondrial"], correctIndex: 0, explanation: "Haemophilia is X-linked recessive — affects males more often than females." },
    ],
  },
  {
    key: "cbse:12:biology:molecular-basis-of-inheritance",
    questions: [
      { id: "q1", prompt: "Genetic material in most organisms is:", options: ["RNA", "DNA", "Protein", "Lipid"], correctIndex: 1, explanation: "DNA is the genetic material in most organisms; some viruses use RNA." },
      { id: "q2", prompt: "DNA double helix discovered by:", options: ["Watson + Crick", "Mendel", "Darwin", "Pasteur"], correctIndex: 0, explanation: "Watson + Crick, 1953, based on Rosalind Franklin's X-ray data." },
      { id: "q3", prompt: "Central Dogma flow:", options: ["DNA → RNA → Protein", "Protein → RNA → DNA", "DNA → Protein → RNA", "RNA → DNA → Protein"], correctIndex: 0, explanation: "Central Dogma: DNA → (transcription) → RNA → (translation) → Protein." },
      { id: "q4", prompt: "Process of mRNA synthesis from DNA template is:", options: ["Replication", "Transcription", "Translation", "Translocation"], correctIndex: 1, explanation: "Transcription: DNA → mRNA (template is DNA antisense strand)." },
      { id: "q5", prompt: "Number of nucleotides for 1 amino acid:", options: ["1", "2", "3", "6"], correctIndex: 2, explanation: "Genetic code: each amino acid coded by triplet (3 nucleotides). 64 possible codons total." },
    ],
  },

  // ── CBSE Class 11 Physics ────────────────────────────────────────
  {
    key: "cbse:11:physics:laws-of-motion",
    questions: [
      { id: "q1", prompt: "Newton's first law states an object will:", options: ["Always accelerate", "Continue motion or rest unless acted upon by force", "Slow down when in motion", "Increase speed"], correctIndex: 1, explanation: "First law (law of inertia): object continues at rest or uniform motion unless acted upon by external force." },
      { id: "q2", prompt: "F = ma is:", options: ["Newton's first law", "Newton's second law", "Newton's third law", "Conservation of momentum"], correctIndex: 1, explanation: "F = ma is Newton's second law (force = rate of change of momentum)." },
      { id: "q3", prompt: "Action-reaction pair acts:", options: ["On same body", "On different bodies", "Always cancel out", "Always at 60°"], correctIndex: 1, explanation: "Action-reaction (Newton's 3rd law) act on DIFFERENT bodies — they don't cancel each other." },
      { id: "q4", prompt: "Friction is independent of:", options: ["Normal force", "Surface area (approximately)", "Surface texture", "Material"], correctIndex: 1, explanation: "Coulomb friction: independent of contact area; depends on normal force, surface texture, materials." },
      { id: "q5", prompt: "An object in uniform circular motion experiences:", options: ["No net force", "Centripetal force pointing inward", "Force pointing outward", "Force along motion"], correctIndex: 1, explanation: "Uniform circular motion requires net inward (centripetal) force — F = mv²/r." },
    ],
  },
  {
    key: "cbse:11:physics:thermodynamics",
    questions: [
      { id: "q1", prompt: "First law of thermodynamics: ΔU = ", options: ["Q + W", "Q − W", "Q × W", "Q / W"], correctIndex: 0, explanation: "ΔU = Q + W where Q is heat absorbed BY system and W is work done ON system (some textbooks use W as work BY system — be careful)." },
      { id: "q2", prompt: "In isothermal process, change in internal energy is:", options: ["Positive", "Negative", "Zero", "Variable"], correctIndex: 2, explanation: "Isothermal: temperature constant, so for ideal gas ΔU = 0." },
      { id: "q3", prompt: "Adiabatic process means:", options: ["No heat transfer", "No work done", "Constant pressure", "Constant volume"], correctIndex: 0, explanation: "Adiabatic: Q = 0 (no heat exchange with surroundings)." },
      { id: "q4", prompt: "Carnot engine has efficiency:", options: ["η = 1 − T_cold/T_hot", "η = T_cold/T_hot", "η = T_hot/T_cold", "η = 1"], correctIndex: 0, explanation: "Carnot efficiency: η = 1 − T_c/T_h (temperatures in Kelvin)." },
      { id: "q5", prompt: "Second law of thermodynamics is about:", options: ["Conservation of energy", "Entropy increase", "Heat = work", "Mass conservation"], correctIndex: 1, explanation: "Second law: total entropy of isolated system increases (or stays constant) over time." },
    ],
  },

  // ── CBSE Class 11 Chemistry ──────────────────────────────────────
  {
    key: "cbse:11:chemistry:structure-of-atom",
    questions: [
      { id: "q1", prompt: "Number of protons in ²³₁₁Na is:", options: ["11", "23", "12", "10"], correctIndex: 0, explanation: "Atomic number 11 = number of protons (also electrons in neutral atom)." },
      { id: "q2", prompt: "Quantum number that describes orbital shape:", options: ["n (principal)", "l (azimuthal)", "m (magnetic)", "s (spin)"], correctIndex: 1, explanation: "l (azimuthal): 0=s, 1=p, 2=d, 3=f — defines shape." },
      { id: "q3", prompt: "Aufbau principle:", options: ["Fill orbitals in increasing energy order", "Pauli exclusion", "Hund's rule", "Heisenberg principle"], correctIndex: 0, explanation: "Aufbau: fill lowest-energy orbital first (1s before 2s, etc.)." },
      { id: "q4", prompt: "Maximum electrons in 3d orbital:", options: ["6", "10", "14", "2"], correctIndex: 1, explanation: "d-orbital has 5 sub-orbitals × 2 (spin) = 10 electrons." },
      { id: "q5", prompt: "Hund's rule:", options: ["Single fill orbitals first before pairing", "All electrons pair first", "Spins must be opposite", "Energy is constant"], correctIndex: 0, explanation: "Hund's rule: electrons singly occupy orbitals of same energy before pairing." },
    ],
  },
  {
    key: "cbse:11:chemistry:chemical-bonding-molecular-structure",
    questions: [
      { id: "q1", prompt: "Type of bond in NaCl:", options: ["Covalent", "Ionic", "Metallic", "Hydrogen"], correctIndex: 1, explanation: "Na (electropositive) + Cl (electronegative) → ionic bond." },
      { id: "q2", prompt: "Hybridisation of carbon in methane (CH4):", options: ["sp", "sp²", "sp³", "sp³d"], correctIndex: 2, explanation: "Methane: tetrahedral, 4 equivalent bonds → sp³ hybridisation." },
      { id: "q3", prompt: "VSEPR theory predicts molecular geometry based on:", options: ["Electron pair repulsion", "Bond strength", "Atomic mass", "Electronegativity"], correctIndex: 0, explanation: "VSEPR: valence shell electron pair repulsion determines geometry." },
      { id: "q4", prompt: "H₂O has bent geometry due to:", options: ["No lone pairs", "Two lone pairs on O", "sp hybridisation", "Linear arrangement"], correctIndex: 1, explanation: "Oxygen has 2 lone pairs + 2 bonding pairs → sp³ → bent (104.5°) geometry." },
      { id: "q5", prompt: "Bond order in O₂ (molecular orbital theory):", options: ["1", "2", "3", "0"], correctIndex: 1, explanation: "Bond order = (bonding − antibonding)/2 = (10−6)/2 = 2." },
    ],
  },

  // ── CBSE Class 11 Math ─────────────────────────────────────────
  {
    key: "cbse:11:mathematics:trigonometric-functions",
    questions: [
      { id: "q1", prompt: "sin(π/6) = ", options: ["1/2", "√3/2", "1", "0"], correctIndex: 0, explanation: "π/6 = 30°. sin 30° = 1/2." },
      { id: "q2", prompt: "cos(π) = ", options: ["1", "−1", "0", "1/2"], correctIndex: 1, explanation: "cos 180° = cos π = −1." },
      { id: "q3", prompt: "sin²θ + cos²θ = ", options: ["0", "1", "sin(2θ)", "2"], correctIndex: 1, explanation: "Pythagorean identity: sin²θ + cos²θ = 1." },
      { id: "q4", prompt: "Period of sin function:", options: ["π", "2π", "π/2", "4π"], correctIndex: 1, explanation: "sin x has period 2π." },
      { id: "q5", prompt: "Principal value of arcsin(1/2):", options: ["π/6", "π/4", "π/3", "π/2"], correctIndex: 0, explanation: "arcsin(1/2) = π/6 (30°), within principal range [−π/2, π/2]." },
    ],
  },
  {
    key: "cbse:11:mathematics:limits-and-derivatives",
    questions: [
      { id: "q1", prompt: "lim x→0 of (sin x / x) = ", options: ["0", "1", "∞", "Doesn't exist"], correctIndex: 1, explanation: "Standard limit: lim x→0 sin x / x = 1." },
      { id: "q2", prompt: "Derivative of x³ is:", options: ["x²", "3x²", "3x", "x⁴/4"], correctIndex: 1, explanation: "Power rule: d/dx (x^n) = n·x^(n-1). So d/dx (x³) = 3x²." },
      { id: "q3", prompt: "Derivative of constant c is:", options: ["c", "0", "1", "−c"], correctIndex: 1, explanation: "Constant has zero rate of change → derivative is 0." },
      { id: "q4", prompt: "d/dx (sin x) = ", options: ["−sin x", "cos x", "−cos x", "tan x"], correctIndex: 1, explanation: "d/dx (sin x) = cos x." },
      { id: "q5", prompt: "Derivative as instantaneous rate of change is:", options: ["f(x+h) − f(x)", "lim h→0 [f(x+h) − f(x)] / h", "Just slope", "Always zero"], correctIndex: 1, explanation: "Derivative = lim h→0 of average rate of change → instantaneous rate." },
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
