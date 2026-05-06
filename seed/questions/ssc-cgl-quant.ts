// SSC CGL Tier 1 — Quantitative Aptitude — 50 sample questions.
//
// SOURCE: AI-generated for proof-of-concept. Each question is marked
// `validated: false` and source `AI_GENERATED`. Before any of these go live
// to students, an SME must validate them and flip the flag (or reject).
//
// This file is the "seed of the seed" — it demonstrates the AI-first content
// pipeline (Option B from the plan): Claude generates → SME validates →
// goes live. With this loop, content cost drops 5–10x vs pure SME authorship.
//
// Run after seedSscCglSyllabus(): npx tsx seed/questions/ssc-cgl-quant.ts

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

export const sscCglQuantQuestions: QuestionSeed[] = [
  // ── Number System (4) ────────────────────────────────────────────────
  {
    topicCode: "quant.number_system",
    difficulty: "EASY",
    body: "The HCF of 144, 180 and 192 is:",
    options: [
      { key: "A", text: "4" },
      { key: "B", text: "8" },
      { key: "C", text: "12" },
      { key: "D", text: "16" },
    ],
    answerKey: "C",
    solution:
      "144 = 2^4 × 3^2; 180 = 2^2 × 3^2 × 5; 192 = 2^6 × 3. HCF = product of common primes with lowest powers = 2^2 × 3 = 12.",
    tags: ["hcf", "factorisation"],
  },
  {
    topicCode: "quant.number_system",
    difficulty: "MEDIUM",
    body: "The smallest number which, when divided by 8, 9 or 10, leaves a remainder of 3 in each case, is:",
    options: [
      { key: "A", text: "363" },
      { key: "B", text: "723" },
      { key: "C", text: "1083" },
      { key: "D", text: "1443" },
    ],
    answerKey: "A",
    solution:
      "Required number = LCM(8, 9, 10) + 3. LCM(8, 9, 10) = 360. Hence 360 + 3 = 363.",
    tags: ["lcm", "remainders"],
  },
  {
    topicCode: "quant.number_system",
    difficulty: "MEDIUM",
    body: "The unit digit of 7^105 is:",
    options: [
      { key: "A", text: "1" },
      { key: "B", text: "3" },
      { key: "C", text: "7" },
      { key: "D", text: "9" },
    ],
    answerKey: "C",
    solution:
      "Powers of 7 cycle every 4: 7, 9, 3, 1. 105 mod 4 = 1 (since 104 is divisible by 4). The 1st term in the cycle is 7. Hence the unit digit is 7.",
    tags: ["cyclicity", "unit-digit"],
  },
  {
    topicCode: "quant.number_system",
    difficulty: "EASY",
    body: "The sum of the first 50 natural numbers is:",
    options: [
      { key: "A", text: "1225" },
      { key: "B", text: "1275" },
      { key: "C", text: "2550" },
      { key: "D", text: "1250" },
    ],
    answerKey: "B",
    solution: "Sum = n(n+1)/2 = 50 × 51 / 2 = 1275.",
    tags: ["arithmetic-progression"],
  },

  // ── Simplification (3) ───────────────────────────────────────────────
  {
    topicCode: "quant.simplification",
    difficulty: "EASY",
    body: "Simplify: (3.5 × 1.4 + 2.1 × 0.3) ÷ 0.7",
    options: [
      { key: "A", text: "7.9" },
      { key: "B", text: "8.0" },
      { key: "C", text: "7.5" },
      { key: "D", text: "7.0" },
    ],
    answerKey: "A",
    solution:
      "Numerator: 3.5 × 1.4 = 4.9; 2.1 × 0.3 = 0.63; sum = 5.53. Then 5.53 ÷ 0.7 = 7.9.",
    tags: ["bodmas", "decimals"],
  },
  {
    topicCode: "quant.simplification",
    difficulty: "EASY",
    body: "√144 + √169 − √121 = ?",
    options: [
      { key: "A", text: "14" },
      { key: "B", text: "16" },
      { key: "C", text: "12" },
      { key: "D", text: "18" },
    ],
    answerKey: "A",
    solution: "12 + 13 − 11 = 14.",
    tags: ["square-roots"],
  },
  {
    topicCode: "quant.simplification",
    difficulty: "MEDIUM",
    body: "The value of (0.9² − 0.7²) / (0.9 − 0.7) is:",
    options: [
      { key: "A", text: "1.6" },
      { key: "B", text: "0.16" },
      { key: "C", text: "16" },
      { key: "D", text: "0.2" },
    ],
    answerKey: "A",
    solution:
      "Use a² − b² = (a + b)(a − b). The expression simplifies to (a + b) = 0.9 + 0.7 = 1.6.",
    tags: ["algebraic-identity"],
  },

  // ── Percentage (4) ───────────────────────────────────────────────────
  {
    topicCode: "quant.percentage",
    difficulty: "EASY",
    body: "If A is 25% more than B, then B is what percent less than A?",
    options: [
      { key: "A", text: "20%" },
      { key: "B", text: "25%" },
      { key: "C", text: "16.67%" },
      { key: "D", text: "33.33%" },
    ],
    answerKey: "A",
    solution:
      "Let B = 100. Then A = 125. B is less than A by 25, which is (25/125) × 100 = 20%.",
    tags: ["successive-percent"],
  },
  {
    topicCode: "quant.percentage",
    difficulty: "MEDIUM",
    body: "The price of an item is increased by 20% and then decreased by 20%. The net change is:",
    options: [
      { key: "A", text: "No change" },
      { key: "B", text: "4% decrease" },
      { key: "C", text: "4% increase" },
      { key: "D", text: "2% decrease" },
    ],
    answerKey: "B",
    solution:
      "Net multiplier = 1.20 × 0.80 = 0.96, i.e. final price is 96% of original — a 4% decrease.",
    tags: ["successive-percent"],
  },
  {
    topicCode: "quant.percentage",
    difficulty: "MEDIUM",
    body:
      "In an exam, 35% of students failed in Mathematics, 25% failed in English, and 10% failed in both. The percentage of students who passed in both subjects is:",
    options: [
      { key: "A", text: "30%" },
      { key: "B", text: "40%" },
      { key: "C", text: "50%" },
      { key: "D", text: "60%" },
    ],
    answerKey: "C",
    solution:
      "Failed in at least one = 35 + 25 − 10 = 50%. Therefore passed in both = 100% − 50% = 50%.",
    tags: ["set-theory", "percentage"],
  },
  {
    topicCode: "quant.percentage",
    difficulty: "MEDIUM",
    body: "A man's salary is increased by 30% and then decreased by 30%. His current salary, compared to original, is:",
    options: [
      { key: "A", text: "Same" },
      { key: "B", text: "9% less" },
      { key: "C", text: "9% more" },
      { key: "D", text: "6% less" },
    ],
    answerKey: "B",
    solution: "Net multiplier = 1.3 × 0.7 = 0.91, i.e. 9% less than original.",
    tags: ["successive-percent"],
  },

  // ── Profit, Loss & Discount (4) ──────────────────────────────────────
  {
    topicCode: "quant.profit_loss",
    difficulty: "EASY",
    body: "An article was bought for ₹800 and sold for ₹920. The profit % is:",
    options: [
      { key: "A", text: "12%" },
      { key: "B", text: "15%" },
      { key: "C", text: "18%" },
      { key: "D", text: "20%" },
    ],
    answerKey: "B",
    solution: "Profit = 920 − 800 = 120. Profit % = (120 / 800) × 100 = 15%.",
    tags: ["profit-percent"],
  },
  {
    topicCode: "quant.profit_loss",
    difficulty: "EASY",
    body: "If the selling price of an article is 4/5 of its cost price, the loss percent is:",
    options: [
      { key: "A", text: "20%" },
      { key: "B", text: "25%" },
      { key: "C", text: "80%" },
      { key: "D", text: "4%" },
    ],
    answerKey: "A",
    solution:
      "Loss = CP − SP = CP − (4/5)CP = (1/5)CP. Loss % = (1/5) × 100 = 20%.",
    tags: ["loss-percent"],
  },
  {
    topicCode: "quant.profit_loss",
    difficulty: "MEDIUM",
    body:
      "A trader marks his goods 25% above cost and offers a 10% discount. His profit percent is:",
    options: [
      { key: "A", text: "10%" },
      { key: "B", text: "12.5%" },
      { key: "C", text: "15%" },
      { key: "D", text: "12%" },
    ],
    answerKey: "B",
    solution:
      "SP = 1.25 × 0.90 × CP = 1.125 × CP. Profit = 0.125 × CP, i.e. 12.5%.",
    tags: ["mark-up", "discount"],
  },
  {
    topicCode: "quant.profit_loss",
    difficulty: "MEDIUM",
    body: "By selling 12 articles for ₹100, a man gains 25%. The cost price of one article is:",
    options: [
      { key: "A", text: "₹6.00" },
      { key: "B", text: "₹6.67" },
      { key: "C", text: "₹7.50" },
      { key: "D", text: "₹8.00" },
    ],
    answerKey: "B",
    solution:
      "SP per article = 100 / 12. CP = SP / 1.25 = 100 / (12 × 1.25) = 100 / 15 ≈ 6.67.",
    tags: ["unitary"],
  },

  // ── Ratio & Proportion (3) ───────────────────────────────────────────
  {
    topicCode: "quant.ratio_proportion",
    difficulty: "EASY",
    body: "If A : B = 2 : 3 and B : C = 4 : 5, then A : B : C is:",
    options: [
      { key: "A", text: "2 : 3 : 5" },
      { key: "B", text: "8 : 12 : 15" },
      { key: "C", text: "6 : 8 : 15" },
      { key: "D", text: "4 : 6 : 5" },
    ],
    answerKey: "B",
    solution:
      "Make B common: A:B = 2:3 = 8:12; B:C = 4:5 = 12:15. So A:B:C = 8:12:15.",
    tags: ["compound-ratio"],
  },
  {
    topicCode: "quant.ratio_proportion",
    difficulty: "EASY",
    body: "₹540 is divided between A and B in the ratio 4 : 5. A's share is:",
    options: [
      { key: "A", text: "₹240" },
      { key: "B", text: "₹260" },
      { key: "C", text: "₹220" },
      { key: "D", text: "₹300" },
    ],
    answerKey: "A",
    solution: "A's share = (4 / 9) × 540 = ₹240.",
    tags: ["partition"],
  },
  {
    topicCode: "quant.ratio_proportion",
    difficulty: "EASY",
    body: "The mean proportional between 4 and 25 is:",
    options: [
      { key: "A", text: "10" },
      { key: "B", text: "14.5" },
      { key: "C", text: "50" },
      { key: "D", text: "100" },
    ],
    answerKey: "A",
    solution: "Mean proportional = √(4 × 25) = √100 = 10.",
    tags: ["mean-proportional"],
  },

  // ── Average (3) ──────────────────────────────────────────────────────
  {
    topicCode: "quant.average",
    difficulty: "EASY",
    body: "The average of the first 10 odd natural numbers is:",
    options: [
      { key: "A", text: "9" },
      { key: "B", text: "10" },
      { key: "C", text: "11" },
      { key: "D", text: "19" },
    ],
    answerKey: "B",
    solution:
      "Sum of first n odd numbers = n². So sum of first 10 odd numbers = 100. Average = 100 / 10 = 10.",
    tags: ["sequences"],
  },
  {
    topicCode: "quant.average",
    difficulty: "MEDIUM",
    body:
      "The average age of 5 students is 12 years. When a 6th student joins the group, the new average becomes 13 years. The age of the new student is:",
    options: [
      { key: "A", text: "16 years" },
      { key: "B", text: "17 years" },
      { key: "C", text: "18 years" },
      { key: "D", text: "19 years" },
    ],
    answerKey: "C",
    solution:
      "New total age = 6 × 13 = 78; old total = 5 × 12 = 60. New student's age = 78 − 60 = 18.",
    tags: ["age-average"],
  },
  {
    topicCode: "quant.average",
    difficulty: "EASY",
    body: "The average of 7 numbers is 25. If each number is multiplied by 4, the new average is:",
    options: [
      { key: "A", text: "25" },
      { key: "B", text: "50" },
      { key: "C", text: "100" },
      { key: "D", text: "175" },
    ],
    answerKey: "C",
    solution: "Multiplying every term by 4 multiplies the average by 4: 4 × 25 = 100.",
    tags: ["scaling"],
  },

  // ── SI / CI (4) ──────────────────────────────────────────────────────
  {
    topicCode: "quant.si_ci",
    difficulty: "EASY",
    body: "The simple interest on ₹2000 at 10% per annum for 3 years is:",
    options: [
      { key: "A", text: "₹500" },
      { key: "B", text: "₹600" },
      { key: "C", text: "₹700" },
      { key: "D", text: "₹660" },
    ],
    answerKey: "B",
    solution: "SI = (P × R × T) / 100 = (2000 × 10 × 3) / 100 = ₹600.",
    tags: ["simple-interest"],
  },
  {
    topicCode: "quant.si_ci",
    difficulty: "MEDIUM",
    body: "The compound interest on ₹5000 at 10% per annum for 2 years (compounded annually) is:",
    options: [
      { key: "A", text: "₹1000" },
      { key: "B", text: "₹1050" },
      { key: "C", text: "₹1100" },
      { key: "D", text: "₹1200" },
    ],
    answerKey: "B",
    solution:
      "Amount = 5000 × (1.1)² = 5000 × 1.21 = 6050. CI = 6050 − 5000 = ₹1050.",
    tags: ["compound-interest"],
  },
  {
    topicCode: "quant.si_ci",
    difficulty: "MEDIUM",
    body: "A sum of money doubles itself in 8 years at simple interest. The rate of interest per annum is:",
    options: [
      { key: "A", text: "10%" },
      { key: "B", text: "12%" },
      { key: "C", text: "12.5%" },
      { key: "D", text: "15%" },
    ],
    answerKey: "C",
    solution:
      "If P doubles, SI = P. So P = (P × R × 8) / 100, giving R = 100 / 8 = 12.5%.",
    tags: ["doubling-time"],
  },
  {
    topicCode: "quant.si_ci",
    difficulty: "MEDIUM",
    body:
      "The difference between compound interest and simple interest on ₹10000 at 10% per annum for 2 years is:",
    options: [
      { key: "A", text: "₹50" },
      { key: "B", text: "₹100" },
      { key: "C", text: "₹150" },
      { key: "D", text: "₹200" },
    ],
    answerKey: "B",
    solution:
      "For 2 years, CI − SI = P × (R/100)². = 10000 × (0.1)² = 10000 × 0.01 = ₹100.",
    tags: ["ci-si-difference"],
  },

  // ── Time and Work (4) ────────────────────────────────────────────────
  {
    topicCode: "quant.time_work",
    difficulty: "MEDIUM",
    body: "A can do a piece of work in 12 days, B in 15 days. Working together, they finish it in:",
    options: [
      { key: "A", text: "6 2/3 days" },
      { key: "B", text: "6 days" },
      { key: "C", text: "7 days" },
      { key: "D", text: "5 days" },
    ],
    answerKey: "A",
    solution:
      "Combined rate = 1/12 + 1/15 = 5/60 + 4/60 = 9/60 = 3/20. Time = 20/3 days = 6 2/3 days.",
    tags: ["combined-rate"],
  },
  {
    topicCode: "quant.time_work",
    difficulty: "MEDIUM",
    body:
      "Pipe A fills a tank in 6 hours; pipe B can empty it in 8 hours. If both are opened together when the tank is empty, time to fill is:",
    options: [
      { key: "A", text: "12 hours" },
      { key: "B", text: "24 hours" },
      { key: "C", text: "14 hours" },
      { key: "D", text: "18 hours" },
    ],
    answerKey: "B",
    solution:
      "Net rate = 1/6 − 1/8 = 4/24 − 3/24 = 1/24 per hour. Time = 24 hours.",
    tags: ["pipes-cisterns"],
  },
  {
    topicCode: "quant.time_work",
    difficulty: "MEDIUM",
    body: "A and B together can do a work in 8 days. A alone can do it in 12 days. B alone can do it in:",
    options: [
      { key: "A", text: "16 days" },
      { key: "B", text: "20 days" },
      { key: "C", text: "24 days" },
      { key: "D", text: "30 days" },
    ],
    answerKey: "C",
    solution: "B's rate = 1/8 − 1/12 = 3/24 − 2/24 = 1/24. Hence 24 days alone.",
    tags: ["individual-rate"],
  },
  {
    topicCode: "quant.time_work",
    difficulty: "EASY",
    body: "If 6 men can finish a work in 10 days, how many days will 8 men take to finish the same work?",
    options: [
      { key: "A", text: "7 days" },
      { key: "B", text: "7.5 days" },
      { key: "C", text: "8 days" },
      { key: "D", text: "8.5 days" },
    ],
    answerKey: "B",
    solution:
      "Total work = 6 × 10 = 60 man-days. With 8 men: 60 / 8 = 7.5 days.",
    tags: ["man-days"],
  },

  // ── Time, Speed & Distance (4) ───────────────────────────────────────
  {
    topicCode: "quant.time_speed_distance",
    difficulty: "EASY",
    body: "A car covers 240 km in 4 hours. Its average speed is:",
    options: [
      { key: "A", text: "50 km/h" },
      { key: "B", text: "55 km/h" },
      { key: "C", text: "60 km/h" },
      { key: "D", text: "65 km/h" },
    ],
    answerKey: "C",
    solution: "Speed = Distance / Time = 240 / 4 = 60 km/h.",
    tags: ["basic-tsd"],
  },
  {
    topicCode: "quant.time_speed_distance",
    difficulty: "MEDIUM",
    body: "A train 150 m long passes a pole in 10 seconds. Its speed in km/h is:",
    options: [
      { key: "A", text: "45 km/h" },
      { key: "B", text: "54 km/h" },
      { key: "C", text: "60 km/h" },
      { key: "D", text: "50 km/h" },
    ],
    answerKey: "B",
    solution:
      "Speed = 150 / 10 = 15 m/s. Convert: 15 × 18/5 = 54 km/h.",
    tags: ["trains"],
  },
  {
    topicCode: "quant.time_speed_distance",
    difficulty: "MEDIUM",
    body:
      "A boat's speed in still water is 10 km/h and the stream's speed is 2 km/h. The total time to go 24 km downstream and return is:",
    options: [
      { key: "A", text: "4 hours" },
      { key: "B", text: "4.5 hours" },
      { key: "C", text: "5 hours" },
      { key: "D", text: "5.5 hours" },
    ],
    answerKey: "C",
    solution:
      "Downstream speed = 12, time = 24/12 = 2h. Upstream speed = 8, time = 24/8 = 3h. Total = 5 hours.",
    tags: ["boats-streams"],
  },
  {
    topicCode: "quant.time_speed_distance",
    difficulty: "MEDIUM",
    body: "A train 120 m long crosses a platform of 80 m in 10 seconds. The train's speed is:",
    options: [
      { key: "A", text: "36 km/h" },
      { key: "B", text: "54 km/h" },
      { key: "C", text: "72 km/h" },
      { key: "D", text: "90 km/h" },
    ],
    answerKey: "C",
    solution:
      "Total distance to cross = 120 + 80 = 200 m in 10 s = 20 m/s = 20 × 18/5 = 72 km/h.",
    tags: ["trains-platform"],
  },

  // ── Mixture & Alligation (2) ─────────────────────────────────────────
  {
    topicCode: "quant.mixture",
    difficulty: "HARD",
    body:
      "A milkman wants to sell a milk-water mixture at ₹16 per litre and earn 25% profit. The cost price of milk is ₹16 per litre and water is free. In what ratio must water be mixed with milk?",
    options: [
      { key: "A", text: "1 : 5" },
      { key: "B", text: "1 : 4" },
      { key: "C", text: "4 : 1" },
      { key: "D", text: "5 : 1" },
    ],
    answerKey: "B",
    solution:
      "Required CP per litre = 16 / 1.25 = ₹12.80. By alligation: water (CP 0) and milk (CP 16). Ratio = (16 − 12.80) : (12.80 − 0) = 3.20 : 12.80 = 1 : 4 (water : milk).",
    tags: ["alligation"],
  },
  {
    topicCode: "quant.mixture",
    difficulty: "MEDIUM",
    body: "A 60-litre mixture has 40% water. How much water should be added to make it a 50% water mixture?",
    options: [
      { key: "A", text: "10 L" },
      { key: "B", text: "12 L" },
      { key: "C", text: "15 L" },
      { key: "D", text: "20 L" },
    ],
    answerKey: "B",
    solution:
      "Water = 24 L; non-water = 36 L. Let x L water be added. (24 + x) / (60 + x) = 0.5 ⇒ 24 + x = 30 + 0.5x ⇒ 0.5x = 6 ⇒ x = 12.",
    tags: ["mixture-add"],
  },

  // ── Algebra (4) ──────────────────────────────────────────────────────
  {
    topicCode: "quant.algebra",
    difficulty: "MEDIUM",
    body: "If x + 1/x = 3, then x² + 1/x² is:",
    options: [
      { key: "A", text: "5" },
      { key: "B", text: "7" },
      { key: "C", text: "9" },
      { key: "D", text: "11" },
    ],
    answerKey: "B",
    solution:
      "(x + 1/x)² = x² + 2 + 1/x² = 9. Hence x² + 1/x² = 9 − 2 = 7.",
    tags: ["identity"],
  },
  {
    topicCode: "quant.algebra",
    difficulty: "EASY",
    body: "If a + b = 5 and ab = 6, then a² + b² is:",
    options: [
      { key: "A", text: "11" },
      { key: "B", text: "12" },
      { key: "C", text: "13" },
      { key: "D", text: "14" },
    ],
    answerKey: "C",
    solution:
      "(a + b)² = a² + 2ab + b² = 25. So a² + b² = 25 − 2ab = 25 − 12 = 13.",
    tags: ["identity"],
  },
  {
    topicCode: "quant.algebra",
    difficulty: "MEDIUM",
    body: "If x = 2 + √3, then x + 1/x is:",
    options: [
      { key: "A", text: "4" },
      { key: "B", text: "2√3" },
      { key: "C", text: "2" },
      { key: "D", text: "6" },
    ],
    answerKey: "A",
    solution:
      "Rationalise: 1/(2 + √3) × (2 − √3)/(2 − √3) = (2 − √3) / (4 − 3) = 2 − √3. Hence x + 1/x = (2 + √3) + (2 − √3) = 4.",
    tags: ["surds"],
  },
  {
    topicCode: "quant.algebra",
    difficulty: "EASY",
    body: "Solve for x: 3x − 2 = 7",
    options: [
      { key: "A", text: "3" },
      { key: "B", text: "4" },
      { key: "C", text: "2" },
      { key: "D", text: "5" },
    ],
    answerKey: "A",
    solution: "3x = 9, so x = 3.",
    tags: ["linear-equation"],
  },

  // ── Mensuration 2D (3) ───────────────────────────────────────────────
  {
    topicCode: "quant.mensuration_2d",
    difficulty: "EASY",
    body: "The area of a rectangle 12 m × 8 m is:",
    options: [
      { key: "A", text: "84 m²" },
      { key: "B", text: "96 m²" },
      { key: "C", text: "108 m²" },
      { key: "D", text: "120 m²" },
    ],
    answerKey: "B",
    solution: "Area = length × breadth = 12 × 8 = 96 m².",
    tags: ["rectangle"],
  },
  {
    topicCode: "quant.mensuration_2d",
    difficulty: "EASY",
    body: "The circumference of a circle whose radius is 14 cm (take π = 22/7) is:",
    options: [
      { key: "A", text: "44 cm" },
      { key: "B", text: "88 cm" },
      { key: "C", text: "22 cm" },
      { key: "D", text: "56 cm" },
    ],
    answerKey: "B",
    solution: "C = 2πr = 2 × 22/7 × 14 = 88 cm.",
    tags: ["circle"],
  },
  {
    topicCode: "quant.mensuration_2d",
    difficulty: "EASY",
    body: "The area of a triangle with base 10 cm and height 6 cm is:",
    options: [
      { key: "A", text: "30 cm²" },
      { key: "B", text: "60 cm²" },
      { key: "C", text: "50 cm²" },
      { key: "D", text: "25 cm²" },
    ],
    answerKey: "A",
    solution: "Area = (1/2) × base × height = (1/2) × 10 × 6 = 30 cm².",
    tags: ["triangle"],
  },

  // ── Mensuration 3D (2) ───────────────────────────────────────────────
  {
    topicCode: "quant.mensuration_3d",
    difficulty: "EASY",
    body: "The volume of a cube whose edge is 6 cm is:",
    options: [
      { key: "A", text: "36 cm³" },
      { key: "B", text: "144 cm³" },
      { key: "C", text: "216 cm³" },
      { key: "D", text: "108 cm³" },
    ],
    answerKey: "C",
    solution: "Volume = a³ = 6³ = 216 cm³.",
    tags: ["cube"],
  },
  {
    topicCode: "quant.mensuration_3d",
    difficulty: "MEDIUM",
    body:
      "The total surface area of a closed cylinder with radius 7 cm and height 10 cm (π = 22/7) is:",
    options: [
      { key: "A", text: "660 cm²" },
      { key: "B", text: "748 cm²" },
      { key: "C", text: "880 cm²" },
      { key: "D", text: "462 cm²" },
    ],
    answerKey: "B",
    solution:
      "TSA = 2πr(r + h) = 2 × 22/7 × 7 × (7 + 10) = 44 × 17 = 748 cm².",
    tags: ["cylinder"],
  },

  // ── Geometry (3) ─────────────────────────────────────────────────────
  {
    topicCode: "quant.geometry",
    difficulty: "EASY",
    body: "The angles of a triangle are in the ratio 2 : 3 : 4. The largest angle is:",
    options: [
      { key: "A", text: "60°" },
      { key: "B", text: "70°" },
      { key: "C", text: "80°" },
      { key: "D", text: "90°" },
    ],
    answerKey: "C",
    solution:
      "Sum = 180°. Let angles be 2x, 3x, 4x. 9x = 180 ⇒ x = 20. Largest = 4x = 80°.",
    tags: ["triangle-angles"],
  },
  {
    topicCode: "quant.geometry",
    difficulty: "EASY",
    body: "In a right-angled triangle, the hypotenuse is 13 cm and one leg is 5 cm. The other leg is:",
    options: [
      { key: "A", text: "8 cm" },
      { key: "B", text: "10 cm" },
      { key: "C", text: "12 cm" },
      { key: "D", text: "14 cm" },
    ],
    answerKey: "C",
    solution: "By Pythagoras: √(13² − 5²) = √(169 − 25) = √144 = 12 cm.",
    tags: ["pythagoras"],
  },
  {
    topicCode: "quant.geometry",
    difficulty: "MEDIUM",
    body: "Each exterior angle of a regular polygon is 36°. The number of sides is:",
    options: [
      { key: "A", text: "8" },
      { key: "B", text: "10" },
      { key: "C", text: "12" },
      { key: "D", text: "9" },
    ],
    answerKey: "B",
    solution: "Sum of exterior angles = 360°. Number of sides = 360 / 36 = 10.",
    tags: ["polygon"],
  },

  // ── Trigonometry (2) ─────────────────────────────────────────────────
  {
    topicCode: "quant.trigonometry",
    difficulty: "EASY",
    body: "sin 30° + cos 60° equals:",
    options: [
      { key: "A", text: "1" },
      { key: "B", text: "1/2" },
      { key: "C", text: "√3/2" },
      { key: "D", text: "0" },
    ],
    answerKey: "A",
    solution: "sin 30° = 1/2; cos 60° = 1/2; sum = 1.",
    tags: ["std-angles"],
  },
  {
    topicCode: "quant.trigonometry",
    difficulty: "MEDIUM",
    body: "If tan θ = 4/3, then sin θ equals:",
    options: [
      { key: "A", text: "3/5" },
      { key: "B", text: "4/5" },
      { key: "C", text: "3/4" },
      { key: "D", text: "5/4" },
    ],
    answerKey: "B",
    solution:
      "Opposite = 4, adjacent = 3, hypotenuse = √(4² + 3²) = 5. sin θ = opposite/hypotenuse = 4/5.",
    tags: ["ratios"],
  },

  // ── Data Interpretation / Set Logic (1) ──────────────────────────────
  {
    topicCode: "quant.data_interpretation",
    difficulty: "MEDIUM",
    body:
      "In a class of 50 students, 30 like cricket, 25 like football and 10 like both. The number of students who like neither is:",
    options: [
      { key: "A", text: "5" },
      { key: "B", text: "10" },
      { key: "C", text: "15" },
      { key: "D", text: "20" },
    ],
    answerKey: "A",
    solution:
      "Like at least one = 30 + 25 − 10 = 45. Therefore neither = 50 − 45 = 5.",
    tags: ["set-theory", "venn"],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────
export async function seedSscCglQuantQuestions() {
  const exam = await prisma.exam.findUnique({ where: { code: "SSC_CGL" } });
  if (!exam) throw new Error("Run seedExams() first.");

  const subject = await prisma.subject.findUnique({
    where: { examId_code: { examId: exam.id, code: "QUANT" } },
  });
  if (!subject) throw new Error("Run seedSscCglSyllabus() first — QUANT subject not found.");

  // Build a topicCode → topicId map for O(1) lookups.
  const topics = await prisma.topic.findMany({ where: { subjectId: subject.id } });
  const topicMap = new Map(topics.map((t) => [t.code, t.id]));

  console.log(`Seeding ${sscCglQuantQuestions.length} SSC CGL Quant questions...`);
  let created = 0,
    skipped = 0;
  for (const q of sscCglQuantQuestions) {
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
        metadata: { generator: "claude-sonnet-4-5", batch: "ssc-cgl-quant-v1" },
      },
    });
    created++;
  }
  console.log(`Done. Created ${created}, skipped ${skipped}.`);
  console.log("All questions are flagged validated:false — SME review required before going live.");
}

if (require.main === module) {
  seedSscCglQuantQuestions()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
