// ZIO — Zonal Informatics Olympiad (HBCSE / IARCS).
// Pen-and-paper exam (3 hrs, ~4-5 ad-hoc problems). NO coding required.
// Knowledge of any programming language is NOT a prerequisite.
// Source: iarcs.org.in/inoi and IARCS Online Study Material.
//
// Run after seedExams: npx tsx seed/exams/zio-syllabus.ts

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

export const zioSyllabus: SubjectSeed[] = [
  // ── ALGORITHMIC PROBLEM-SOLVING ───────────────────────────────────────
  {
    code: "INFORMATICS",
    name: "Algorithmic Problem Solving",
    weight: 0.7,
    topics: [
      { code: "cs.algorithms.intro", name: "Introduction to Algorithms", description: "What an algorithm is, step-wise problem decomposition, pseudocode reading." },
      { code: "cs.algorithms.efficiency", name: "Measuring Algorithm Efficiency", description: "Time and space complexity intuition, big-picture growth rates without formal Big-O." },
      { code: "cs.searching", name: "Searching", description: "Linear search, binary search and variants over sorted/unsorted data." },
      { code: "cs.sorting", name: "Sorting", description: "Selection, insertion, merge and quick sort intuition; stability and order properties." },
      { code: "cs.recursion", name: "Recursion", description: "Recursive thinking, base/recursive cases, recursion tree, divide-and-conquer." },
      { code: "cs.dp.intuition", name: "Dynamic Programming Intuition", description: "Overlapping subproblems, memoisation, tabulation on small input sizes." },
      { code: "cs.greedy", name: "Greedy Algorithms", description: "Local optimal choices, interval scheduling, coin-change-style ad-hoc greedy." },
      { code: "cs.graphs.basic", name: "Basic Graph Concepts", description: "Vertices, edges, directed/undirected graphs, paths, cycles, connectivity." },
      { code: "cs.graphs.traversal", name: "Graph Traversal", description: "Breadth-first and depth-first traversal as conceptual exploration strategies." },
      { code: "cs.graphs.shortest_path", name: "Shortest Paths", description: "Shortest-path intuition on grids and small graphs without formal algorithms." },
      { code: "cs.trees", name: "Trees", description: "Rooted trees, binary trees, parent/child traversal, tree counting puzzles." },
      { code: "cs.data_structures", name: "Basic Data Structures", description: "Arrays, lists, stacks, queues — used as tools for problem modelling." },
      { code: "cs.simulation", name: "Simulation", description: "Mentally or on paper simulating a process or rule on small concrete inputs." },
      { code: "cs.invariants", name: "Invariants and Monovariants", description: "Quantities preserved or strictly changing across steps — proving outcomes." },
      { code: "cs.case_analysis", name: "Case Analysis", description: "Splitting a problem into exhaustive cases and resolving each." },
    ],
  },

  // ── COMBINATORICS & DISCRETE MATH ────────────────────────────────────
  {
    code: "DISCRETE",
    name: "Combinatorics and Discrete Mathematics",
    weight: 0.2,
    topics: [
      { code: "math.counting", name: "Counting Principles", description: "Sum and product rules, permutations, combinations applied to small enumerations." },
      { code: "math.pigeonhole", name: "Pigeonhole Principle", description: "Existence arguments via pigeons/holes — colourings, residues, pairs." },
      { code: "math.parity", name: "Parity and Modular Reasoning", description: "Even/odd reasoning, basic modular arithmetic for invariants." },
      { code: "math.number_theory_basic", name: "Elementary Number Theory", description: "Divisibility, gcd/lcm reasoning, prime factorisation puzzles." },
      { code: "math.game_theory", name: "Combinatorial Games", description: "Winning/losing positions, Nim-like games, strategy stealing." },
      { code: "math.set_logic", name: "Sets and Logic", description: "Inclusion-exclusion, propositional logic, truth tables in puzzles." },
    ],
  },

  // ── AD-HOC PROBLEM PATTERNS ───────────────────────────────────────────
  {
    code: "ADHOC",
    name: "Ad-Hoc Problem Patterns",
    weight: 0.1,
    topics: [
      { code: "adhoc.constructive", name: "Constructive Problems", description: "Building an explicit example/configuration that satisfies given rules." },
      { code: "adhoc.optimisation", name: "Optimisation Puzzles", description: "Finding minimum/maximum of a quantity under given constraints." },
      { code: "adhoc.scheduling", name: "Scheduling and Ordering", description: "Sequencing tasks, jobs or moves to satisfy precedence/deadline rules." },
      { code: "adhoc.grid_puzzles", name: "Grid and Geometry Puzzles", description: "Reasoning on 2D grids — paths, colourings, tilings, distance puzzles." },
      { code: "adhoc.three_inputs", name: "Three Concrete Inputs Format", description: "ZIO-style problems — solve three increasingly large concrete inputs by spotting an efficient method." },
    ],
  },
];

export async function seedZioSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "ZIO" } });
  if (!exam) {
    throw new Error("Run seedExams() first — ZIO exam not found.");
  }
  console.log(`Seeding ZIO syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < zioSyllabus.length; sIdx++) {
    const s = zioSyllabus[sIdx];
    const subject = await prisma.subject.upsert({
      where: { examId_code: { examId: exam.id, code: s.code } },
      update: { name: s.name, weight: s.weight, orderIdx: sIdx },
      create: { examId: exam.id, code: s.code, name: s.name, weight: s.weight, orderIdx: sIdx },
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
  seedZioSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
