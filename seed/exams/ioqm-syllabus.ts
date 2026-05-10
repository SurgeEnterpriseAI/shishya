// IOQM (Indian Olympiad Qualifier in Mathematics) — full syllabus tree.
// Stage-1 Mathematical Olympiad. 30 questions, 3 hours. Pre-college level — calculus excluded.
// Source: HBCSE Mathematical Olympiad Cell + Allen / FIITJEE published IOQM scope.
//
// Run after seedExams: npx tsx seed/exams/ioqm-syllabus.ts

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

export const ioqmSyllabus: SubjectSeed[] = [
  {
    code: "MATHEMATICS",
    name: "Mathematics",
    weight: 1,
    topics: [
      // ── BASIC PRELIMINARIES ────────────────────────────────────────────
      {
        code: "math.basics",
        name: "Basic Preliminaries",
        description: "Foundational tools used across the paper: number system, modulus, logs, greatest integer.",
        subtopics: [
          { code: "math.basics.number_system", name: "Number System", description: "Naturals, integers, rationals, irrationals, reals — properties and basic identities." },
          { code: "math.basics.modulus", name: "Modulus / Absolute Value", description: "|x| properties, equations and inequalities involving |.|." },
          { code: "math.basics.logarithm", name: "Logarithms", description: "Log laws, change of base, log inequalities — pre-calculus level." },
          { code: "math.basics.greatest_integer", name: "Greatest Integer Function", description: "Floor and fractional-part identities, classic [.]-based olympiad problems." },
          { code: "math.basics.basic_inequality", name: "Basic Inequalities", description: "Triangle inequality, simple AM-GM, two-variable inequality manipulations." },
        ],
      },

      // ── NUMBER THEORY ──────────────────────────────────────────────────
      {
        code: "math.number_theory",
        name: "Number Theory",
        description: "Divisibility, primes, modular arithmetic, Diophantine equations and arithmetic functions.",
        subtopics: [
          { code: "math.number_theory.divisibility", name: "Divisibility", description: "Divisibility rules, GCD, LCM, Euclidean algorithm and Bezout's identity." },
          { code: "math.number_theory.primes", name: "Prime Numbers", description: "Prime factorization, infinitude of primes, sieve of Eratosthenes, prime counting." },
          { code: "math.number_theory.modular", name: "Modular Arithmetic", description: "Congruences, residue classes, linear congruences and Chinese Remainder Theorem." },
          { code: "math.number_theory.fermat_euler", name: "Fermat's Little and Euler's Theorems", description: "a^p ≡ a (mod p), Euler's totient theorem and applications to last-digit problems." },
          { code: "math.number_theory.diophantine", name: "Diophantine Equations", description: "Linear Diophantine equations, Pythagorean triples, Pell's equation introduction." },
          { code: "math.number_theory.bases", name: "Number Bases", description: "Representation in base b, base conversion and base-related digit problems." },
          { code: "math.number_theory.arith_functions", name: "Arithmetic Functions", description: "Number of divisors, sum of divisors, Euler's phi and Möbius function basics." },
          { code: "math.number_theory.lifting_exponent", name: "p-adic Valuation and LTE", description: "v_p(n!), Legendre's formula and lifting-the-exponent lemma at olympiad level." },
        ],
      },

      // ── ALGEBRA ────────────────────────────────────────────────────────
      {
        code: "math.algebra",
        name: "Algebra",
        description: "Polynomials, inequalities, complex numbers, sequences and functional equations.",
        subtopics: [
          { code: "math.algebra.manipulation", name: "Algebraic Manipulation", description: "Symmetric expressions, factorisation tricks, Sophie Germain identity, telescoping." },
          { code: "math.algebra.polynomials", name: "Polynomials", description: "Roots and coefficients (Vieta), remainder/factor theorems, integer-root theorem, FTA at school level." },
          { code: "math.algebra.inequalities", name: "Inequalities", description: "AM-GM, Cauchy-Schwarz, rearrangement, Jensen, power-mean and Schur — non-calculus proofs." },
          { code: "math.algebra.complex", name: "Complex Numbers", description: "Polar form, De Moivre's theorem, roots of unity and geometric uses." },
          { code: "math.algebra.sequences", name: "Sequences and Series", description: "AP, GP, HP, AGP, telescoping sums, recursive sequences and closed forms." },
          { code: "math.algebra.functional", name: "Functional Equations", description: "Cauchy, Jensen and substitution-based functional equations on Z, Q, R." },
          { code: "math.algebra.binomial", name: "Binomial and Multinomial Theorems", description: "Binomial expansion, multinomial coefficients and combinatorial identities." },
          { code: "math.algebra.equations", name: "Equations and Systems", description: "Quadratic, cubic, biquadratic and reciprocal equations; symmetric systems." },
        ],
      },

      // ── COMBINATORICS ──────────────────────────────────────────────────
      {
        code: "math.combinatorics",
        name: "Combinatorics",
        description: "Counting techniques, pigeonhole, recurrences and elementary graph theory.",
        subtopics: [
          { code: "math.combinatorics.counting", name: "Counting Principles", description: "Addition and multiplication principles, bijective counting and double counting." },
          { code: "math.combinatorics.permutations", name: "Permutations and Combinations", description: "nPr, nCr, restricted arrangements, circular permutations and grouping." },
          { code: "math.combinatorics.pigeonhole", name: "Pigeonhole Principle", description: "Simple and generalized pigeonhole and classical olympiad applications." },
          { code: "math.combinatorics.induction", name: "Mathematical Induction", description: "Weak, strong and structural induction in algebra/combinatorics proofs." },
          { code: "math.combinatorics.inclusion_exclusion", name: "Inclusion-Exclusion", description: "PIE for unions of finite sets, derangements and surjection counts." },
          { code: "math.combinatorics.recurrence", name: "Recurrence Relations", description: "Linear recurrences, characteristic equations and tile/path counting." },
          { code: "math.combinatorics.generating", name: "Generating Functions (Basics)", description: "Polynomial and series generating functions for elementary counting." },
          { code: "math.combinatorics.identities", name: "Combinatorial Identities", description: "Pascal, Vandermonde, hockey-stick and basic Catalan-number identities." },
          { code: "math.combinatorics.graph_theory", name: "Elementary Graph Theory", description: "Graphs, trees, colouring, Eulerian and Hamiltonian paths at olympiad level." },
        ],
      },

      // ── GEOMETRY ───────────────────────────────────────────────────────
      {
        code: "math.geometry",
        name: "Geometry",
        description: "Plane Euclidean geometry — triangles, circles, transformations and coordinate methods.",
        subtopics: [
          { code: "math.geometry.triangles", name: "Triangles", description: "Congruence, similarity, special centres (centroid, incentre, circumcentre, orthocentre)." },
          { code: "math.geometry.circles", name: "Circles", description: "Chord-tangent properties, cyclic quadrilaterals, Ptolemy and power of a point." },
          { code: "math.geometry.quadrilaterals", name: "Quadrilaterals and Polygons", description: "Properties of special quadrilaterals, regular polygons and tilings." },
          { code: "math.geometry.area", name: "Areas and Lengths", description: "Heron's formula, area ratios, mass-point and barycentric ideas at school level." },
          { code: "math.geometry.transformations", name: "Geometric Transformations", description: "Reflection, rotation, translation, dilation/spiral similarity in proofs." },
          { code: "math.geometry.theorems", name: "Classical Theorems", description: "Menelaus, Ceva, Stewart, Euler line, nine-point circle and Simson line." },
          { code: "math.geometry.coordinate", name: "Coordinate Geometry", description: "Distance, section, locus, lines, circles and basic conics in olympiad use." },
          { code: "math.geometry.combinatorial", name: "Combinatorial Geometry", description: "Counting points, lines, regions and convex-position arguments." },
        ],
      },

      // ── TRIGONOMETRY ───────────────────────────────────────────────────
      {
        code: "math.trigonometry",
        name: "Trigonometry",
        description: "Trigonometric ratios, identities and applications to geometry and equations.",
        subtopics: [
          { code: "math.trigonometry.ratios", name: "Ratios and Identities", description: "Standard ratios, Pythagorean and sum-product identities." },
          { code: "math.trigonometry.equations", name: "Trigonometric Equations", description: "General solutions of standard trigonometric equations." },
          { code: "math.trigonometry.triangle", name: "Triangle Trigonometry", description: "Sine rule, cosine rule, projection formulas and area = (1/2)ab sin C." },
          { code: "math.trigonometry.applications", name: "Geometric Applications", description: "Use of trig identities to prove geometric and algebraic olympiad results." },
        ],
      },
    ],
  },
];

export async function seedIoqmSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "IOQM" } });
  if (!exam) {
    throw new Error("Run seedExams() first — IOQM exam not found.");
  }
  console.log(`Seeding IOQM syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < ioqmSyllabus.length; sIdx++) {
    const s = ioqmSyllabus[sIdx];
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
  seedIoqmSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
