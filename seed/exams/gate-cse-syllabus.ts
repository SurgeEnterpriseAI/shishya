// GATE 2026 — Computer Science and Information Technology (CS) syllabus.
// Conducting institute: IIT Guwahati. Each paper = 100 marks
// (15 GA + 85 CS). Source: gate2026.iitg.ac.in/doc/GATE2026_Syllabus/CS_2026_Syllabus.pdf
// and the corresponding GA_2026_Syllabus.pdf.
//
// Run after seedExams: npx tsx seed/exams/gate-cse-syllabus.ts

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

export const gateCseSyllabus: SubjectSeed[] = [
  // ── GENERAL APTITUDE (15 marks, common to all papers) ─────────────────
  {
    code: "GENERAL_APTITUDE",
    name: "General Aptitude",
    weight: 0.15,
    topics: [
      {
        code: "ga.verbal",
        name: "Verbal Aptitude",
        description: "Basic English grammar, vocabulary, reading comprehension and narrative sequencing.",
        subtopics: [
          { code: "ga.verbal.grammar", name: "Basic English Grammar", description: "Tenses, articles, adjectives, prepositions, conjunctions, verb-noun agreement and other parts of speech." },
          { code: "ga.verbal.vocabulary", name: "Basic Vocabulary", description: "Words, idioms and phrases in context." },
          { code: "ga.verbal.comprehension", name: "Reading and Comprehension", description: "Reading comprehension and narrative sequencing." },
        ],
      },
      {
        code: "ga.quantitative",
        name: "Quantitative Aptitude",
        description: "Data interpretation, numerical computation, mensuration, geometry and elementary probability/statistics.",
        subtopics: [
          { code: "ga.quant.data_interp", name: "Data Interpretation", description: "Bar graphs, pie charts and other graphs representing data; 2D and 3D plots, maps and tables." },
          { code: "ga.quant.numerical", name: "Numerical Computation and Estimation", description: "Ratios, percentages, powers, exponents and logarithms; permutations and combinations; series." },
          { code: "ga.quant.geometry", name: "Mensuration and Geometry", description: "Plane and solid geometry; mensuration of standard 2D and 3D shapes." },
          { code: "ga.quant.statistics_probability", name: "Elementary Statistics and Probability", description: "Mean, median, mode, standard deviation; basic probability." },
        ],
      },
      {
        code: "ga.analytical",
        name: "Analytical Aptitude",
        description: "Logical reasoning — deduction, induction, analogy and numerical relations.",
        subtopics: [
          { code: "ga.analytical.logic", name: "Logic", description: "Deduction and induction." },
          { code: "ga.analytical.analogy", name: "Analogy", description: "Verbal and figural analogy problems." },
          { code: "ga.analytical.reasoning", name: "Numerical Relations and Reasoning", description: "Quantitative comparisons, sequences and arrangements." },
        ],
      },
      {
        code: "ga.spatial",
        name: "Spatial Aptitude",
        description: "Transformation of shapes — translation, rotation, scaling, mirroring, assembling, grouping; paper folding, cutting and patterns in 2D and 3D.",
        subtopics: [
          { code: "ga.spatial.transformation", name: "Transformation of Shapes", description: "Translation, rotation, scaling, mirroring, assembling and grouping." },
          { code: "ga.spatial.paper", name: "Paper Folding, Cutting and Patterns", description: "Paper folding and cutting; 2D and 3D patterns." },
        ],
      },
    ],
  },

  // ── CS CORE (85 marks) ────────────────────────────────────────────────
  {
    code: "CS_CORE",
    name: "Computer Science and Information Technology",
    weight: 0.85,
    topics: [
      // Section 1: Engineering Mathematics
      {
        code: "cs.engg_math",
        name: "Engineering Mathematics",
        description: "Discrete Mathematics, Linear Algebra, Calculus, Probability and Statistics — foundational mathematics for computer science.",
        subtopics: [
          { code: "cs.em.discrete.logic", name: "Propositional and First-Order Logic", description: "Propositional calculus; predicates and quantifiers; rules of inference and proofs." },
          { code: "cs.em.discrete.sets", name: "Sets, Relations and Functions", description: "Sets, relations, functions; partial orders and lattices." },
          { code: "cs.em.discrete.algebra", name: "Monoids and Groups", description: "Algebraic structures — monoids and groups; basic properties." },
          { code: "cs.em.discrete.graphs", name: "Graphs", description: "Connectivity, matching and graph colouring." },
          { code: "cs.em.discrete.combinatorics", name: "Combinatorics", description: "Counting, recurrence relations and generating functions." },
          { code: "cs.em.linalg", name: "Linear Algebra", description: "Matrices, determinants, system of linear equations, eigenvalues and eigenvectors, LU decomposition." },
          { code: "cs.em.calculus", name: "Calculus", description: "Limits, continuity and differentiability; maxima and minima; Mean Value Theorem; integration." },
          { code: "cs.em.probstat", name: "Probability and Statistics", description: "Random variables; uniform, normal, exponential, Poisson and binomial distributions; mean, median, mode, standard deviation; conditional probability and Bayes' theorem." },
        ],
      },

      // Section 2: Digital Logic
      {
        code: "cs.digital_logic",
        name: "Digital Logic",
        description: "Boolean algebra; combinational and sequential circuits; minimisation; number representations and computer arithmetic.",
        subtopics: [
          { code: "cs.dl.boolean", name: "Boolean Algebra", description: "Boolean functions, postulates, theorems, simplification." },
          { code: "cs.dl.combinational", name: "Combinational Circuits", description: "Multiplexers, decoders, encoders, adders; minimisation using K-maps and Quine-McCluskey." },
          { code: "cs.dl.sequential", name: "Sequential Circuits", description: "Latches, flip-flops, counters, registers; finite state machines." },
          { code: "cs.dl.number_rep", name: "Number Representation and Arithmetic", description: "Fixed and floating point representations; IEEE 754; computer arithmetic." },
        ],
      },

      // Section 3: Computer Organization and Architecture
      {
        code: "cs.coa",
        name: "Computer Organization and Architecture",
        description: "Machine instructions; ALU and control unit; pipelining; memory hierarchy; I/O.",
        subtopics: [
          { code: "cs.coa.instructions", name: "Machine Instructions and Addressing Modes", description: "Instruction formats; addressing modes; instruction set design." },
          { code: "cs.coa.alu_datapath", name: "ALU, Data-path and Control Unit", description: "Arithmetic and logic unit; data-path; hardwired and microprogrammed control." },
          { code: "cs.coa.pipelining", name: "Instruction Pipelining", description: "Pipelining concepts; pipeline hazards (data, control, structural) and resolution." },
          { code: "cs.coa.memory", name: "Memory Hierarchy", description: "Cache memory, main memory and secondary storage; mapping techniques; replacement policies." },
          { code: "cs.coa.io", name: "I/O Interface", description: "I/O techniques — interrupt-driven and DMA modes." },
        ],
      },

      // Section 4: Programming and Data Structures
      {
        code: "cs.pds",
        name: "Programming and Data Structures",
        description: "C programming; recursion; arrays, stacks, queues, linked lists, trees, BSTs, heaps and graphs.",
        subtopics: [
          { code: "cs.pds.c_programming", name: "Programming in C", description: "Pointers, structures, dynamic memory, file handling, parameter passing." },
          { code: "cs.pds.recursion", name: "Recursion", description: "Recursive function design and analysis." },
          { code: "cs.pds.linear_ds", name: "Linear Data Structures", description: "Arrays, stacks, queues, linked lists (singly, doubly, circular)." },
          { code: "cs.pds.trees", name: "Trees", description: "Binary trees, binary search trees, traversals; balanced trees." },
          { code: "cs.pds.heaps", name: "Binary Heaps", description: "Min-heap, max-heap; heap operations; priority queues." },
          { code: "cs.pds.graphs", name: "Graphs (as a Data Structure)", description: "Graph representations — adjacency matrix and lists." },
        ],
      },

      // Section 5: Algorithms
      {
        code: "cs.algorithms",
        name: "Algorithms",
        description: "Searching, sorting, hashing; complexity analysis; algorithm design techniques; graph algorithms.",
        subtopics: [
          { code: "cs.algo.searching", name: "Searching, Sorting and Hashing", description: "Linear and binary search; quick, merge, heap, insertion, selection, bubble sort; hashing techniques and collision handling." },
          { code: "cs.algo.complexity", name: "Asymptotic Complexity", description: "Worst case time and space complexity; Big-O, Omega, Theta notations; recurrence solving." },
          { code: "cs.algo.greedy", name: "Greedy Algorithms", description: "Activity selection, Huffman coding, fractional knapsack." },
          { code: "cs.algo.dp", name: "Dynamic Programming", description: "Optimal substructure and overlapping subproblems; classic DP problems." },
          { code: "cs.algo.divide_conquer", name: "Divide and Conquer", description: "Master theorem; merge sort, binary search, Strassen's algorithm." },
          { code: "cs.algo.graph", name: "Graph Algorithms", description: "BFS, DFS, topological sort; minimum spanning trees (Prim, Kruskal); shortest paths (Dijkstra, Bellman-Ford, Floyd-Warshall)." },
        ],
      },

      // Section 6: Theory of Computation
      {
        code: "cs.toc",
        name: "Theory of Computation",
        description: "Regular and context-free languages; automata; Turing machines and undecidability.",
        subtopics: [
          { code: "cs.toc.regular", name: "Regular Languages", description: "Regular expressions and finite automata (DFA, NFA, epsilon-NFA); equivalences and conversions." },
          { code: "cs.toc.cfg", name: "Context-Free Grammars and PDA", description: "Context-free grammars; pushdown automata; CFG simplification." },
          { code: "cs.toc.pumping", name: "Pumping Lemma", description: "Pumping lemma for regular and context-free languages; proving non-regularity/non-CFness." },
          { code: "cs.toc.turing", name: "Turing Machines and Undecidability", description: "Turing machines; recursively enumerable and recursive languages; halting problem; Rice's theorem." },
        ],
      },

      // Section 7: Compiler Design
      {
        code: "cs.compilers",
        name: "Compiler Design",
        description: "Lexical analysis, parsing, syntax-directed translation; runtime environments; intermediate code generation; local optimisations and data flow analyses.",
        subtopics: [
          { code: "cs.cd.lexical", name: "Lexical Analysis", description: "Tokens; regular expressions; finite automata in lexical analysis." },
          { code: "cs.cd.parsing", name: "Parsing", description: "Top-down (LL) and bottom-up (LR, SLR, LALR) parsing; ambiguity handling." },
          { code: "cs.cd.sdt", name: "Syntax-Directed Translation", description: "Synthesised and inherited attributes; SDTs; syntax-directed definitions." },
          { code: "cs.cd.runtime", name: "Runtime Environments", description: "Activation records; storage allocation; scope and binding." },
          { code: "cs.cd.intermediate", name: "Intermediate Code Generation", description: "Three-address code; quadruples and triples." },
          { code: "cs.cd.optimization", name: "Local Optimisation and Data Flow", description: "Local optimisation; data flow analyses — constant propagation, liveness analysis, common sub-expression elimination." },
        ],
      },

      // Section 8: Operating Systems
      {
        code: "cs.os",
        name: "Operating System",
        description: "Processes, threads, synchronisation, deadlocks; CPU and I/O scheduling; memory management and virtual memory; file systems.",
        subtopics: [
          { code: "cs.os.processes", name: "System Calls, Processes and Threads", description: "Process and thread management; system calls; inter-process communication." },
          { code: "cs.os.synchronization", name: "Concurrency and Synchronisation", description: "Mutual exclusion; semaphores, monitors; classical synchronisation problems." },
          { code: "cs.os.deadlock", name: "Deadlock", description: "Deadlock characterisation, prevention, avoidance (banker's algorithm), detection and recovery." },
          { code: "cs.os.scheduling", name: "CPU and I/O Scheduling", description: "FCFS, SJF, priority, round-robin, multilevel scheduling; I/O scheduling." },
          { code: "cs.os.memory", name: "Memory Management and Virtual Memory", description: "Paging, segmentation, virtual memory; page replacement algorithms; thrashing." },
          { code: "cs.os.filesystem", name: "File Systems", description: "File concepts, allocation methods, directory structures, free-space management." },
        ],
      },

      // Section 9: Databases
      {
        code: "cs.databases",
        name: "Databases",
        description: "ER model and relational model; integrity constraints and normal forms; file organisation and indexing; transactions and concurrency control.",
        subtopics: [
          { code: "cs.db.er_model", name: "ER Model", description: "Entity-relationship diagrams; specialisation, generalisation, aggregation; ER to relational mapping." },
          { code: "cs.db.relational", name: "Relational Model", description: "Relational algebra, tuple calculus, SQL queries." },
          { code: "cs.db.constraints", name: "Integrity Constraints and Normalisation", description: "Functional dependencies; normal forms — 1NF, 2NF, 3NF, BCNF; lossless decomposition." },
          { code: "cs.db.indexing", name: "File Organisation and Indexing", description: "Heap, sequential, hash files; B and B+ trees; primary and secondary indexes." },
          { code: "cs.db.transactions", name: "Transactions and Concurrency Control", description: "ACID properties; serialisability; concurrency control protocols (locking, timestamping); recovery." },
        ],
      },

      // Section 10: Computer Networks
      {
        code: "cs.networks",
        name: "Computer Networks",
        description: "Layering models; data link, network, transport and application layers; routing protocols; IP addressing and support protocols.",
        subtopics: [
          { code: "cs.net.layering", name: "Concept of Layering", description: "OSI and TCP/IP protocol stacks; basics of packet, circuit and virtual circuit switching." },
          { code: "cs.net.datalink", name: "Data Link Layer", description: "Framing, error detection, Medium Access Control, Ethernet bridging." },
          { code: "cs.net.routing", name: "Routing Protocols", description: "Shortest path, flooding, distance vector and link state routing." },
          { code: "cs.net.ip_addressing", name: "IP Addressing and Fragmentation", description: "IPv4, CIDR notation; fragmentation; basics of ARP, DHCP, ICMP; Network Address Translation (NAT)." },
          { code: "cs.net.transport", name: "Transport Layer", description: "Flow control and congestion control; UDP, TCP; sockets." },
          { code: "cs.net.application", name: "Application Layer Protocols", description: "DNS, SMTP, HTTP, FTP, Email." },
        ],
      },
    ],
  },
];

export async function seedGateCseSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "GATE_CSE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — GATE_CSE exam not found.");
  }
  console.log(`Seeding GATE CSE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < gateCseSyllabus.length; sIdx++) {
    const s = gateCseSyllabus[sIdx];
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
  seedGateCseSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
