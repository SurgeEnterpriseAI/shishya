// SSC CGL Tier 1 — General Intelligence and Reasoning — 50 sample questions.
// AI-generated, awaiting SME validation. Same pipeline pattern as ssc-cgl-quant.ts.
//
// Run after seedSscCglSyllabus(): npx tsx seed/questions/ssc-cgl-reasoning.ts

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

export const sscCglReasoningQuestions: QuestionSeed[] = [
  // ── Analogy (6) ──────────────────────────────────────────────────────
  {
    topicCode: "reason.analogy",
    difficulty: "EASY",
    body: "Doctor : Hospital :: Teacher : ?",
    options: [
      { key: "A", text: "School" },
      { key: "B", text: "Class" },
      { key: "C", text: "Book" },
      { key: "D", text: "Education" },
    ],
    answerKey: "A",
    solution: "A doctor's primary workplace is a hospital. A teacher's primary workplace is a school.",
    tags: ["word-analogy"],
  },
  {
    topicCode: "reason.analogy",
    difficulty: "EASY",
    body: "CAT : DBU :: DOG : ?",
    options: [
      { key: "A", text: "EPH" },
      { key: "B", text: "FPH" },
      { key: "C", text: "EQH" },
      { key: "D", text: "FQI" },
    ],
    answerKey: "A",
    solution:
      "Each letter shifts +1: C→D, A→B, T→U. Apply to DOG: D→E, O→P, G→H, giving EPH.",
    tags: ["letter-analogy"],
  },
  {
    topicCode: "reason.analogy",
    difficulty: "EASY",
    body: "4 : 16 :: 5 : ?",
    options: [
      { key: "A", text: "25" },
      { key: "B", text: "20" },
      { key: "C", text: "30" },
      { key: "D", text: "35" },
    ],
    answerKey: "A",
    solution: "Pattern is x : x². 4² = 16, so 5² = 25.",
    tags: ["number-analogy"],
  },
  {
    topicCode: "reason.analogy",
    difficulty: "EASY",
    body: "Pen : Write :: Knife : ?",
    options: [
      { key: "A", text: "Sharp" },
      { key: "B", text: "Cut" },
      { key: "C", text: "Steel" },
      { key: "D", text: "Kitchen" },
    ],
    answerKey: "B",
    solution: "A pen's primary function is to write; a knife's primary function is to cut.",
    tags: ["function"],
  },
  {
    topicCode: "reason.analogy",
    difficulty: "MEDIUM",
    body: "7 : 50 :: 9 : ?",
    options: [
      { key: "A", text: "80" },
      { key: "B", text: "82" },
      { key: "C", text: "90" },
      { key: "D", text: "84" },
    ],
    answerKey: "B",
    solution: "Pattern: x² + 1. 7² + 1 = 50; 9² + 1 = 82.",
    tags: ["number-analogy"],
  },
  {
    topicCode: "reason.analogy",
    difficulty: "EASY",
    body: "India : Rupee :: Japan : ?",
    options: [
      { key: "A", text: "Yen" },
      { key: "B", text: "Dollar" },
      { key: "C", text: "Pound" },
      { key: "D", text: "Euro" },
    ],
    answerKey: "A",
    solution: "Country to its national currency: India → Rupee, Japan → Yen.",
    tags: ["country-currency"],
  },

  // ── Classification — Odd one out (4) ─────────────────────────────────
  {
    topicCode: "reason.classification",
    difficulty: "EASY",
    body: "Find the odd one out: Apple, Mango, Orange, Carrot.",
    options: [
      { key: "A", text: "Apple" },
      { key: "B", text: "Mango" },
      { key: "C", text: "Orange" },
      { key: "D", text: "Carrot" },
    ],
    answerKey: "D",
    solution: "Apple, Mango and Orange are fruits. Carrot is a vegetable — the odd one.",
    tags: ["category"],
  },
  {
    topicCode: "reason.classification",
    difficulty: "MEDIUM",
    body: "Find the odd one: 8, 27, 64, 100.",
    options: [
      { key: "A", text: "8" },
      { key: "B", text: "27" },
      { key: "C", text: "64" },
      { key: "D", text: "100" },
    ],
    answerKey: "D",
    solution: "8 = 2³, 27 = 3³, 64 = 4³ are perfect cubes. 100 is a perfect square but not a cube.",
    tags: ["number-property"],
  },
  {
    topicCode: "reason.classification",
    difficulty: "EASY",
    body: "Find the odd one: Cat, Lion, Dog, Crow.",
    options: [
      { key: "A", text: "Cat" },
      { key: "B", text: "Lion" },
      { key: "C", text: "Dog" },
      { key: "D", text: "Crow" },
    ],
    answerKey: "D",
    solution: "Cat, Lion and Dog are mammals. Crow is a bird.",
    tags: ["category"],
  },
  {
    topicCode: "reason.classification",
    difficulty: "EASY",
    body: "Find the odd one: Triangle, Square, Rectangle, Circle.",
    options: [
      { key: "A", text: "Triangle" },
      { key: "B", text: "Square" },
      { key: "C", text: "Rectangle" },
      { key: "D", text: "Circle" },
    ],
    answerKey: "D",
    solution: "Triangle, Square and Rectangle are bounded by straight sides. A circle has no straight sides.",
    tags: ["geometry"],
  },

  // ── Series (6) ───────────────────────────────────────────────────────
  {
    topicCode: "reason.series",
    difficulty: "MEDIUM",
    body: "Find the next term: 2, 6, 12, 20, 30, ?",
    options: [
      { key: "A", text: "42" },
      { key: "B", text: "40" },
      { key: "C", text: "38" },
      { key: "D", text: "44" },
    ],
    answerKey: "A",
    solution:
      "Differences are 4, 6, 8, 10 — increasing by 2. Next difference is 12. So 30 + 12 = 42.",
    tags: ["number-series"],
  },
  {
    topicCode: "reason.series",
    difficulty: "EASY",
    body: "Find the next term: 1, 4, 9, 16, 25, ?",
    options: [
      { key: "A", text: "36" },
      { key: "B", text: "35" },
      { key: "C", text: "30" },
      { key: "D", text: "49" },
    ],
    answerKey: "A",
    solution: "These are squares of natural numbers. Next is 6² = 36.",
    tags: ["squares"],
  },
  {
    topicCode: "reason.series",
    difficulty: "MEDIUM",
    body: "Find the next term: A, C, F, J, O, ?",
    options: [
      { key: "A", text: "U" },
      { key: "B", text: "T" },
      { key: "C", text: "V" },
      { key: "D", text: "S" },
    ],
    answerKey: "A",
    solution:
      "Letter positions advance by +2, +3, +4, +5 — i.e., A(1) → C(3) → F(6) → J(10) → O(15). Next +6: O(15) → U(21).",
    tags: ["letter-series"],
  },
  {
    topicCode: "reason.series",
    difficulty: "MEDIUM",
    body: "Find the next term: 2, 3, 5, 7, 11, 13, ?",
    options: [
      { key: "A", text: "15" },
      { key: "B", text: "17" },
      { key: "C", text: "19" },
      { key: "D", text: "21" },
    ],
    answerKey: "B",
    solution: "Successive prime numbers. After 13 the next prime is 17.",
    tags: ["primes"],
  },
  {
    topicCode: "reason.series",
    difficulty: "MEDIUM",
    body: "Find the next term: 5, 11, 23, 47, ?",
    options: [
      { key: "A", text: "95" },
      { key: "B", text: "93" },
      { key: "C", text: "94" },
      { key: "D", text: "97" },
    ],
    answerKey: "A",
    solution: "Pattern: ×2 + 1. 5×2+1=11, 11×2+1=23, 23×2+1=47, 47×2+1=95.",
    tags: ["number-series"],
  },
  {
    topicCode: "reason.series",
    difficulty: "MEDIUM",
    body: "Find the next pair: AZ, BY, CX, DW, ?",
    options: [
      { key: "A", text: "EV" },
      { key: "B", text: "EU" },
      { key: "C", text: "FV" },
      { key: "D", text: "FW" },
    ],
    answerKey: "A",
    solution:
      "First letter advances forward (A,B,C,D,E); second letter goes backward from end (Z,Y,X,W,V). So next pair is EV.",
    tags: ["alphanumeric-series"],
  },

  // ── Coding-Decoding (6) ──────────────────────────────────────────────
  {
    topicCode: "reason.coding",
    difficulty: "MEDIUM",
    body: "If CAT = 24 and DOG = 26 (sum of letter positions), then PIG = ?",
    options: [
      { key: "A", text: "32" },
      { key: "B", text: "30" },
      { key: "C", text: "33" },
      { key: "D", text: "28" },
    ],
    answerKey: "A",
    solution: "P=16, I=9, G=7. Sum = 16 + 9 + 7 = 32.",
    tags: ["letter-position"],
  },
  {
    topicCode: "reason.coding",
    difficulty: "EASY",
    body: "If APPLE is coded as BQQMF, how is MANGO coded?",
    options: [
      { key: "A", text: "NBOHP" },
      { key: "B", text: "NBOHN" },
      { key: "C", text: "MBOHP" },
      { key: "D", text: "NCOIP" },
    ],
    answerKey: "A",
    solution: "Each letter shifts +1. M→N, A→B, N→O, G→H, O→P, giving NBOHP.",
    tags: ["shift-cipher"],
  },
  {
    topicCode: "reason.coding",
    difficulty: "EASY",
    body: "In a code, RUN is written as 18-21-14. How is BAT written?",
    options: [
      { key: "A", text: "2-1-20" },
      { key: "B", text: "1-2-20" },
      { key: "C", text: "2-1-19" },
      { key: "D", text: "3-2-21" },
    ],
    answerKey: "A",
    solution: "Each letter is replaced by its position in the alphabet. B=2, A=1, T=20.",
    tags: ["letter-position"],
  },
  {
    topicCode: "reason.coding",
    difficulty: "MEDIUM",
    body: "If MUSIC is coded as PXVLF, then HOUSE is coded as:",
    options: [
      { key: "A", text: "KRXVH" },
      { key: "B", text: "KRXTH" },
      { key: "C", text: "JNXVH" },
      { key: "D", text: "KSXVH" },
    ],
    answerKey: "A",
    solution: "Each letter shifts +3. H→K, O→R, U→X, S→V, E→H, giving KRXVH.",
    tags: ["shift-cipher"],
  },
  {
    topicCode: "reason.coding",
    difficulty: "MEDIUM",
    body:
      "In a certain code, '+' means '×' and '×' means '+'. Then 5 + 3 × 2 evaluates to:",
    options: [
      { key: "A", text: "16" },
      { key: "B", text: "17" },
      { key: "C", text: "13" },
      { key: "D", text: "10" },
    ],
    answerKey: "B",
    solution:
      "Substitute the operators per the code: '+' → '×' and '×' → '+'. So 5 + 3 × 2 becomes 5 × 3 + 2. Apply BODMAS: 5 × 3 = 15; then 15 + 2 = 17.",
    tags: ["operator-substitution"],
  },
  {
    topicCode: "reason.coding",
    difficulty: "EASY",
    body: "If A = 1, B = 2, …, Z = 26, the sum of the letters in 'CAB' is:",
    options: [
      { key: "A", text: "5" },
      { key: "B", text: "6" },
      { key: "C", text: "7" },
      { key: "D", text: "4" },
    ],
    answerKey: "B",
    solution: "C + A + B = 3 + 1 + 2 = 6.",
    tags: ["letter-position"],
  },

  // ── Ranking and Order (4) ────────────────────────────────────────────
  {
    topicCode: "reason.ranking",
    difficulty: "EASY",
    body: "In a row of 40 students, Ravi is 12th from the left. His position from the right is:",
    options: [
      { key: "A", text: "28" },
      { key: "B", text: "29" },
      { key: "C", text: "30" },
      { key: "D", text: "27" },
    ],
    answerKey: "B",
    solution: "Position from right = Total − Position from left + 1 = 40 − 12 + 1 = 29.",
    tags: ["row-position"],
  },
  {
    topicCode: "reason.ranking",
    difficulty: "MEDIUM",
    body:
      "In a row of 25, A is 7th from the left and B is 9th from the right. The number of students between A and B is:",
    options: [
      { key: "A", text: "8" },
      { key: "B", text: "9" },
      { key: "C", text: "10" },
      { key: "D", text: "7" },
    ],
    answerKey: "B",
    solution:
      "B's position from the left = 25 − 9 + 1 = 17. Students between A (7th) and B (17th) = 17 − 7 − 1 = 9.",
    tags: ["row-between"],
  },
  {
    topicCode: "reason.ranking",
    difficulty: "EASY",
    body: "In a class, Rahul ranks 7th from the top and 23rd from the bottom. Total students:",
    options: [
      { key: "A", text: "28" },
      { key: "B", text: "29" },
      { key: "C", text: "30" },
      { key: "D", text: "31" },
    ],
    answerKey: "B",
    solution: "Total = (rank from top) + (rank from bottom) − 1 = 7 + 23 − 1 = 29.",
    tags: ["rank-total"],
  },
  {
    topicCode: "reason.ranking",
    difficulty: "MEDIUM",
    body:
      "Five friends sit in a row. A is to the left of B. C is to the right of B but to the left of D. E is to the right of D. The person at the extreme right is:",
    options: [
      { key: "A", text: "A" },
      { key: "B", text: "C" },
      { key: "C", text: "D" },
      { key: "D", text: "E" },
    ],
    answerKey: "D",
    solution:
      "From the constraints, the order left → right is A, B, C, D, E. So E sits at the extreme right.",
    tags: ["seating"],
  },

  // ── Directions (4) ───────────────────────────────────────────────────
  {
    topicCode: "reason.directions",
    difficulty: "MEDIUM",
    body:
      "A man walks 5 km east, turns left and walks 3 km, turns left again and walks 5 km. From the starting point, he is now in the direction:",
    options: [
      { key: "A", text: "North" },
      { key: "B", text: "South" },
      { key: "C", text: "East" },
      { key: "D", text: "West" },
    ],
    answerKey: "A",
    solution:
      "Start at origin. East 5 → (5, 0). Turn left = North, walk 3 → (5, 3). Turn left = West, walk 5 → (0, 3). From the start (0, 0), he is 3 km due North.",
    tags: ["distance-direction"],
  },
  {
    topicCode: "reason.directions",
    difficulty: "MEDIUM",
    body: "Ravi walks 10 m North, then 6 m East, then 10 m South. His distance from the starting point is:",
    options: [
      { key: "A", text: "6 m" },
      { key: "B", text: "10 m" },
      { key: "C", text: "16 m" },
      { key: "D", text: "26 m" },
    ],
    answerKey: "A",
    solution:
      "Net displacement: north 10 − south 10 = 0; east 6. So he is 6 m east of start, distance 6 m.",
    tags: ["distance-direction"],
  },
  {
    topicCode: "reason.directions",
    difficulty: "EASY",
    body: "Facing north, you turn 270° clockwise. You are now facing:",
    options: [
      { key: "A", text: "East" },
      { key: "B", text: "South" },
      { key: "C", text: "West" },
      { key: "D", text: "North" },
    ],
    answerKey: "C",
    solution: "Clockwise: N → E (90°) → S (180°) → W (270°).",
    tags: ["rotation"],
  },
  {
    topicCode: "reason.directions",
    difficulty: "EASY",
    body: "From a point, a man walks 3 m north, then 4 m east. The shortest distance from the start is:",
    options: [
      { key: "A", text: "5 m" },
      { key: "B", text: "7 m" },
      { key: "C", text: "6 m" },
      { key: "D", text: "4 m" },
    ],
    answerKey: "A",
    solution: "Use Pythagoras: √(3² + 4²) = √25 = 5 m.",
    tags: ["pythagoras"],
  },

  // ── Blood Relations (5) ──────────────────────────────────────────────
  {
    topicCode: "reason.blood_relations",
    difficulty: "MEDIUM",
    body:
      "Pointing to a man, Ramesh said, 'He is the son of my father's only son.' How is the man related to Ramesh?",
    options: [
      { key: "A", text: "Brother" },
      { key: "B", text: "Son" },
      { key: "C", text: "Father" },
      { key: "D", text: "Cousin" },
    ],
    answerKey: "B",
    solution:
      "'My father's only son' = Ramesh himself. So 'son of myself' = Ramesh's son.",
    tags: ["pointing"],
  },
  {
    topicCode: "reason.blood_relations",
    difficulty: "HARD",
    body:
      "A is B's brother. C is B's mother. D is C's father. How is A related to D?",
    options: [
      { key: "A", text: "Grandson" },
      { key: "B", text: "Father" },
      { key: "C", text: "Uncle" },
      { key: "D", text: "Brother" },
    ],
    answerKey: "A",
    solution:
      "C is B's (and A's) mother. D is C's father, so D is the maternal grandfather of A. Therefore A is D's grandson.",
    tags: ["family-tree"],
  },
  {
    topicCode: "reason.blood_relations",
    difficulty: "EASY",
    body: "P is the brother of Q. R is the sister of Q. S is the father of P. How is S related to R?",
    options: [
      { key: "A", text: "Father" },
      { key: "B", text: "Brother" },
      { key: "C", text: "Uncle" },
      { key: "D", text: "Grandfather" },
    ],
    answerKey: "A",
    solution:
      "P, Q, R are siblings (P brother of Q, R sister of Q). S is father of P, so S is the father of all three siblings — including R.",
    tags: ["siblings"],
  },
  {
    topicCode: "reason.blood_relations",
    difficulty: "HARD",
    body:
      "Pointing to a photo, a woman said, 'She is my mother's only daughter's son's wife's mother-in-law.' Whose photo is it?",
    options: [
      { key: "A", text: "Herself" },
      { key: "B", text: "Sister" },
      { key: "C", text: "Mother" },
      { key: "D", text: "Daughter" },
    ],
    answerKey: "A",
    solution:
      "'Mother's only daughter' = the woman herself. Her son's wife = her daughter-in-law. The mother-in-law of her daughter-in-law = the woman herself.",
    tags: ["pointing"],
  },
  {
    topicCode: "reason.blood_relations",
    difficulty: "HARD",
    body: "X's father is Y's son. Y's mother is Z. How is Z related to X?",
    options: [
      { key: "A", text: "Mother" },
      { key: "B", text: "Grandmother" },
      { key: "C", text: "Great-grandmother" },
      { key: "D", text: "Aunt" },
    ],
    answerKey: "C",
    solution:
      "X's father is Y's son ⇒ Y is X's grandfather. Y's mother Z is therefore X's great-grandmother.",
    tags: ["generations"],
  },

  // ── Syllogism (4) ────────────────────────────────────────────────────
  {
    topicCode: "reason.syllogism",
    difficulty: "EASY",
    body:
      "Statements: All cats are dogs. All dogs are animals.\nConclusions: I. All cats are animals. II. Some animals are cats.",
    options: [
      { key: "A", text: "Only I follows" },
      { key: "B", text: "Only II follows" },
      { key: "C", text: "Both follow" },
      { key: "D", text: "Neither follows" },
    ],
    answerKey: "C",
    solution:
      "Cats ⊂ Dogs ⊂ Animals, so Cats ⊂ Animals → I follows. Since cats are animals (and assuming non-empty), some animals are cats → II follows.",
    tags: ["categorical"],
  },
  {
    topicCode: "reason.syllogism",
    difficulty: "MEDIUM",
    body:
      "Statements: Some pens are pencils. All pencils are erasers.\nConclusions: I. Some pens are erasers. II. All erasers are pens.",
    options: [
      { key: "A", text: "Only I follows" },
      { key: "B", text: "Only II follows" },
      { key: "C", text: "Both follow" },
      { key: "D", text: "Neither follows" },
    ],
    answerKey: "A",
    solution:
      "Some pens are pencils, and all pencils are erasers ⇒ at least those pens are erasers, so I follows. II requires reverse inclusion which is not given.",
    tags: ["particular"],
  },
  {
    topicCode: "reason.syllogism",
    difficulty: "MEDIUM",
    body:
      "Statements: No man is a woman. All women are humans.\nConclusions: I. Some humans are not men. II. All men are humans.",
    options: [
      { key: "A", text: "Only I follows" },
      { key: "B", text: "Only II follows" },
      { key: "C", text: "Both follow" },
      { key: "D", text: "Neither follows" },
    ],
    answerKey: "A",
    solution:
      "Women are humans and no man is a woman ⇒ those women (humans) are not men, so 'some humans are not men' follows. II is not stated; men are not declared to be humans.",
    tags: ["universal-particular"],
  },
  {
    topicCode: "reason.syllogism",
    difficulty: "MEDIUM",
    body:
      "Statements: All books are notebooks. Some notebooks are diaries.\nConclusions: I. Some books are diaries. II. Some diaries are notebooks.",
    options: [
      { key: "A", text: "Only I follows" },
      { key: "B", text: "Only II follows" },
      { key: "C", text: "Both follow" },
      { key: "D", text: "Neither follows" },
    ],
    answerKey: "B",
    solution:
      "I does not follow — the diary-notebook overlap may not include any books. II is the simple converse of 'some notebooks are diaries' which is valid: 'some diaries are notebooks'.",
    tags: ["conversion"],
  },

  // ── Statement and Conclusion (3) ─────────────────────────────────────
  {
    topicCode: "reason.statement_conclusion",
    difficulty: "EASY",
    body:
      "Statement: Smoking causes cancer.\nConclusions: I. People should not smoke. II. Smoking is dangerous.",
    options: [
      { key: "A", text: "Only I follows" },
      { key: "B", text: "Only II follows" },
      { key: "C", text: "Both follow" },
      { key: "D", text: "Neither follows" },
    ],
    answerKey: "C",
    solution:
      "If smoking causes cancer, advising against it (I) and calling it dangerous (II) are reasonable direct conclusions.",
    tags: ["practical-conclusion"],
  },
  {
    topicCode: "reason.statement_conclusion",
    difficulty: "MEDIUM",
    body:
      "Statement: To improve health, exercise daily.\nConclusions: I. Exercise improves health. II. Without exercise, health declines.",
    options: [
      { key: "A", text: "Only I follows" },
      { key: "B", text: "Only II follows" },
      { key: "C", text: "Both follow" },
      { key: "D", text: "Neither follows" },
    ],
    answerKey: "A",
    solution:
      "I follows directly. II is a stronger inverse claim — the original says exercise improves health, not that the absence of exercise causes decline.",
    tags: ["necessary-sufficient"],
  },
  {
    topicCode: "reason.statement_conclusion",
    difficulty: "MEDIUM",
    body:
      "Statement: All competitive exams require dedication.\nConclusions: I. Dedication helps in competitive exams. II. Anyone can clear competitive exams without dedication.",
    options: [
      { key: "A", text: "Only I follows" },
      { key: "B", text: "Only II follows" },
      { key: "C", text: "Both follow" },
      { key: "D", text: "Neither follows" },
    ],
    answerKey: "A",
    solution:
      "If exams require dedication, dedication helps — I follows. II contradicts the statement and does not follow.",
    tags: ["practical-conclusion"],
  },

  // ── Venn Diagrams (3) ────────────────────────────────────────────────
  {
    topicCode: "reason.venn",
    difficulty: "EASY",
    body: "Which Venn relationship best represents Vegetables, Carrots and Onions?",
    options: [
      { key: "A", text: "Three intersecting circles" },
      { key: "B", text: "Carrots and Onions are separate circles, both inside Vegetables" },
      { key: "C", text: "Three concentric circles" },
      { key: "D", text: "Three completely separate circles" },
    ],
    answerKey: "B",
    solution:
      "Carrots ⊂ Vegetables and Onions ⊂ Vegetables. Carrots and Onions are disjoint from each other.",
    tags: ["set-relation"],
  },
  {
    topicCode: "reason.venn",
    difficulty: "EASY",
    body: "Which relationship best represents India, Asia and the World?",
    options: [
      { key: "A", text: "Three concentric (India ⊂ Asia ⊂ World)" },
      { key: "B", text: "Three separate" },
      { key: "C", text: "Three intersecting" },
      { key: "D", text: "India and World separate; Asia in middle" },
    ],
    answerKey: "A",
    solution: "India is part of Asia, which is part of the World — strictly nested.",
    tags: ["nested"],
  },
  {
    topicCode: "reason.venn",
    difficulty: "EASY",
    body: "Which relationship best represents Pen, Pencil and Stationery?",
    options: [
      { key: "A", text: "Three intersecting" },
      { key: "B", text: "Pen and Pencil separate, both inside Stationery" },
      { key: "C", text: "Concentric" },
      { key: "D", text: "All three separate" },
    ],
    answerKey: "B",
    solution:
      "Pen ⊂ Stationery, Pencil ⊂ Stationery, but Pen and Pencil are disjoint from each other.",
    tags: ["set-relation"],
  },

  // ── Cubes and Dice (3) ───────────────────────────────────────────────
  {
    topicCode: "reason.cubes_dice",
    difficulty: "MEDIUM",
    body:
      "A cube of side 4 cm is painted on all faces and cut into 1 cm cubes. The number of small cubes with no face painted is:",
    options: [
      { key: "A", text: "8" },
      { key: "B", text: "16" },
      { key: "C", text: "24" },
      { key: "D", text: "27" },
    ],
    answerKey: "A",
    solution:
      "Inner unpainted cubes form a (4 − 2)³ = 2³ = 8 cube core.",
    tags: ["painted-cube"],
  },
  {
    topicCode: "reason.cubes_dice",
    difficulty: "HARD",
    body:
      "A cube of side 5 cm is painted on all faces and cut into 1 cm cubes. The number of small cubes with exactly two faces painted is:",
    options: [
      { key: "A", text: "36" },
      { key: "B", text: "24" },
      { key: "C", text: "27" },
      { key: "D", text: "12" },
    ],
    answerKey: "A",
    solution:
      "Edges of the cube (excluding corners): 12 edges × (5 − 2) = 12 × 3 = 36 cubes have exactly two painted faces.",
    tags: ["painted-cube"],
  },
  {
    topicCode: "reason.cubes_dice",
    difficulty: "MEDIUM",
    body:
      "On a standard die where opposite faces sum to 7, if 1 is on top and 2 is in front, what number is on the right face?",
    options: [
      { key: "A", text: "3" },
      { key: "B", text: "4" },
      { key: "C", text: "5" },
      { key: "D", text: "6" },
    ],
    answerKey: "A",
    solution:
      "Opposite of 1 is 6 (bottom); opposite of 2 is 5 (back). The remaining pair {3, 4} occupies left/right. By the standard die's right-hand orientation with 1-up, 2-front, 3 lies on the right.",
    tags: ["dice"],
  },

  // ── Mirror Images (2) ────────────────────────────────────────────────
  {
    topicCode: "reason.mirror_water",
    difficulty: "MEDIUM",
    body: "An ordinary clock shows 4:30 in a mirror placed alongside. The actual time on the clock is:",
    options: [
      { key: "A", text: "7:30" },
      { key: "B", text: "8:30" },
      { key: "C", text: "6:30" },
      { key: "D", text: "11:30" },
    ],
    answerKey: "A",
    solution:
      "For mirror-image clock problems: Actual time = 12:00 − Mirror time (when mirror time is between 1 and 11). 12:00 − 4:30 = 7:30.",
    tags: ["clock-mirror"],
  },
  {
    topicCode: "reason.mirror_water",
    difficulty: "EASY",
    body: "If the word 'EXAM' is held up in front of a vertical mirror, the mirror shows the letters in reverse order. The mirror order (ignoring letter flip) reads:",
    options: [
      { key: "A", text: "MAXE" },
      { key: "B", text: "EXAM" },
      { key: "C", text: "MEXA" },
      { key: "D", text: "AMXE" },
    ],
    answerKey: "A",
    solution: "A vertical mirror reverses left-to-right order. EXAM reversed is MAXE.",
    tags: ["letter-mirror"],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────
export async function seedSscCglReasoningQuestions() {
  const exam = await prisma.exam.findUnique({ where: { code: "SSC_CGL" } });
  if (!exam) throw new Error("Run seedExams() first.");

  const subject = await prisma.subject.findUnique({
    where: { examId_code: { examId: exam.id, code: "REASONING" } },
  });
  if (!subject)
    throw new Error("Run seedSscCglSyllabus() first — REASONING subject not found.");

  const topics = await prisma.topic.findMany({ where: { subjectId: subject.id } });
  const topicMap = new Map(topics.map((t) => [t.code, t.id]));

  console.log(`Seeding ${sscCglReasoningQuestions.length} SSC CGL Reasoning questions...`);
  let created = 0,
    skipped = 0;
  for (const q of sscCglReasoningQuestions) {
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
        metadata: { generator: "claude-sonnet-4-5", batch: "ssc-cgl-reasoning-v1" },
      },
    });
    created++;
  }
  console.log(`Done. Created ${created}, skipped ${skipped}.`);
  console.log("All questions are flagged validated:false — SME review required before going live.");
}

if (require.main === module) {
  seedSscCglReasoningQuestions()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
