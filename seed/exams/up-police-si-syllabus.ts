// UP Police Sub-Inspector (SI) — full syllabus tree.
// 160 MCQs in 2 hours, 400 marks (CBT). Four sections of 40 Qs / 100 marks each:
//   General Hindi, General Knowledge & Constitution/Law, Numerical & Mental Ability, Reasoning.
// Source: UPPBPB official notification (uppbpb.gov.in) + Adda247 / Khan Global Studies cross-check.
//
// Run after seedExams: npx tsx seed/exams/up-police-si-syllabus.ts

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

export const upPoliceSiSyllabus: SubjectSeed[] = [
  // ── GENERAL HINDI (40 Qs) ──────────────────────────────────────────────
  {
    code: "HINDI",
    name: "General Hindi (सामान्य हिंदी)",
    weight: 0.25,
    topics: [
      { code: "hindi.varnamala", name: "Varnamala (वर्णमाला)", description: "Hindi alphabet, vowels and consonants." },
      { code: "hindi.sandhi_samas", name: "Sandhi & Samas", description: "Sandhi types and compound word formation." },
      { code: "hindi.upsarg_pratyay", name: "Upsarg & Pratyay", description: "Prefixes and suffixes — formation and rules." },
      { code: "hindi.paryayvachi", name: "Paryayvachi (Synonyms)", description: "Synonymous words in Hindi." },
      { code: "hindi.vilom", name: "Vilom (Antonyms)", description: "Opposite words in Hindi." },
      { code: "hindi.anekarthi", name: "Anekarthi Shabd", description: "Words bearing multiple meanings." },
      { code: "hindi.tatsam_tadbhav", name: "Tatsam-Tadbhav", description: "Pure Sanskrit and derived Hindi word pairs." },
      { code: "hindi.muhavare", name: "Muhavare & Lokoktiyan", description: "Hindi idioms and proverbs with meanings." },
      { code: "hindi.shabd_shuddhi", name: "Shabd Shuddhi", description: "Spelling correction in Hindi words." },
      { code: "hindi.vakya_shuddhi", name: "Vakya Shuddhi", description: "Sentence correction — grammar and syntax." },
      { code: "hindi.ling_vachan_karak", name: "Ling, Vachan, Karak", description: "Gender, number and case in Hindi grammar." },
      { code: "hindi.kriya_kaal_vachya", name: "Kriya, Kaal, Vachya", description: "Verbs, tenses, voice (active/passive)." },
      { code: "hindi.ras_chhand_alankar", name: "Ras, Chhand, Alankar", description: "Sentiments, metres and figures of speech." },
      { code: "hindi.gadyansh", name: "Gadyansh / Comprehension", description: "Unseen passage and comprehension." },
      { code: "hindi.lekhak", name: "Lekhak & Krityan", description: "Famous Hindi authors and their works." },
      { code: "hindi.purasakar", name: "Hindi Bhasha Purasakar", description: "Hindi literary awards — Jnanpith, Vyas Samman, Sahitya Akademi." },
      { code: "hindi.one_word", name: "One Word Substitution", description: "Single-word substitution for phrases." },
      { code: "hindi.vakya_padon", name: "Vakya & Padon", description: "Sentence types and grammatical components." },
    ],
  },

  // ── GENERAL KNOWLEDGE & CONSTITUTION/LAW (40 Qs) ───────────────────────
  {
    code: "GK_CONSTITUTION",
    name: "General Knowledge & Basic Law / Constitution",
    weight: 0.25,
    topics: [
      { code: "gk.history", name: "Indian History", description: "Ancient, medieval, modern Indian history including freedom struggle." },
      { code: "gk.geography", name: "Indian & World Geography", description: "Physical, political, economic geography of India and world." },
      { code: "gk.economy", name: "Indian Economy", description: "Five-year plans, banking, GDP, inflation, budget and trade." },
      { code: "gk.science", name: "General Science", description: "Basic physics, chemistry, biology and applications." },
      { code: "gk.tech", name: "Science & Technology", description: "Space, defence, IT, biotech and recent developments." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events of last 12-18 months." },
      { code: "gk.up_specific", name: "Uttar Pradesh GK", description: "UP geography, history, schemes, festivals and prominent personalities." },
      { code: "gk.constitution", name: "Constitution of India", description: "Preamble, salient features, sources and historical evolution." },
      { code: "gk.fr_dpsp", name: "Fundamental Rights, Duties & DPSPs", description: "Articles 12-51A — rights, duties, directive principles." },
      { code: "gk.union_govt", name: "Union Government", description: "President, PM, Parliament, Council of Ministers." },
      { code: "gk.state_govt", name: "State Government", description: "Governor, CM, State Legislature, High Courts." },
      { code: "gk.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, judicial review and PIL." },
      { code: "gk.local_govt", name: "Local Self Government", description: "Panchayati Raj, urban local bodies — 73rd & 74th Amendments." },
      { code: "gk.elections", name: "Elections & ECI", description: "Election Commission, electoral reforms, anti-defection." },
      { code: "gk.all_india_services", name: "All India Services", description: "IAS, IPS, IFS — origin, structure, role." },
      { code: "gk.bns_bnss", name: "BNS, BNSS, BSA Basics", description: "Bharatiya Nyaya/Nagarik Suraksha/Sakshya — successors to IPC, CrPC, IEA." },
      { code: "gk.women_child_law", name: "Laws Protecting Women & Children", description: "POCSO, Domestic Violence Act, Dowry Prohibition, JJ Act." },
      { code: "gk.sc_st_act", name: "SC/ST Protection Laws", description: "SC/ST Prevention of Atrocities Act and key provisions." },
      { code: "gk.cyber_it", name: "Cyber Law & IT Act", description: "IT Act 2000, cyber crimes and digital privacy basics." },
      { code: "gk.environment_law", name: "Environment & Wildlife Laws", description: "Environment Protection Act, Wildlife Protection Act, Forest Acts." },
      { code: "gk.rti", name: "Right to Information", description: "RTI Act 2005 — rights, exemptions and procedures." },
      { code: "gk.human_rights", name: "Human Rights", description: "NHRC, UDHR and human rights framework in India." },
      { code: "gk.computer_basics", name: "Computer Fundamentals", description: "Hardware, software, MS Office, internet, email." },
    ],
  },

  // ── NUMERICAL & MENTAL ABILITY (40 Qs) ─────────────────────────────────
  {
    code: "MATH",
    name: "Numerical & Mental Ability",
    weight: 0.25,
    topics: [
      { code: "math.number_system", name: "Number System", description: "Natural, whole, integers, rationals; divisibility tests." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, surds." },
      { code: "math.percentage", name: "Percentage", description: "Percentage and applied problems." },
      { code: "math.ratio_proportion", name: "Ratio & Proportion", description: "Direct, inverse, compound ratio, partnership." },
      { code: "math.average", name: "Average", description: "Mean and weighted average problems." },
      { code: "math.profit_loss", name: "Profit & Loss", description: "CP/SP/MP, discount and successive discount." },
      { code: "math.si_ci", name: "Simple & Compound Interest", description: "SI, CI annual/half-yearly compounding." },
      { code: "math.time_work", name: "Time & Work", description: "Work efficiency, pipes & cisterns." },
      { code: "math.time_distance", name: "Time, Speed & Distance", description: "Trains, boats and streams, relative speed." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume." },
      { code: "math.algebra", name: "Algebra", description: "Linear and quadratic equations, identities." },
      { code: "math.data_interpretation", name: "Data Interpretation", description: "Bar, pie, line graphs and tabular data." },
      { code: "math.tabulation", name: "Tabulation", description: "Tabular data analysis and missing values." },
      { code: "math.relation_test", name: "Symbol-Relationship Test", description: "Mathematical operators and relations." },
      { code: "math.series", name: "Number Series", description: "Find next/wrong/missing term." },
      { code: "math.analogy", name: "Numerical Analogy", description: "Number-pair analogies and odd one out." },
      { code: "math.perception", name: "Perception Test", description: "Quick visual and numerical perception." },
      { code: "math.word_formation", name: "Word Formation", description: "Forming words from given letter sets." },
      { code: "math.logical_diagram", name: "Logical Diagrams", description: "Flow and process diagrams interpretation." },
    ],
  },

  // ── REASONING (40 Qs) ──────────────────────────────────────────────────
  {
    code: "REASONING",
    name: "Mental Aptitude & Reasoning",
    weight: 0.25,
    topics: [
      { code: "reason.analogy", name: "Analogy Test", description: "Word, number and figural analogies." },
      { code: "reason.classification", name: "Classification", description: "Odd one out across categories." },
      { code: "reason.series", name: "Series Completion", description: "Letter, number and figure series." },
      { code: "reason.coding", name: "Coding & Decoding", description: "Letter/number/symbol coding patterns." },
      { code: "reason.blood_relation", name: "Blood Relations", description: "Family-tree puzzles." },
      { code: "reason.direction", name: "Direction Sense", description: "Cardinal directions and final positions." },
      { code: "reason.ranking", name: "Ranking & Order", description: "Top/bottom rank, age and seating order." },
      { code: "reason.alphabet", name: "Alphabet Test", description: "Alphabet position, dictionary order." },
      { code: "reason.venn", name: "Venn Diagram", description: "Set relationships visualised." },
      { code: "reason.syllogism", name: "Syllogism", description: "Logical conclusions from premises." },
      { code: "reason.statement_conclusion", name: "Statement & Conclusion", description: "Inference and assumption analysis." },
      { code: "reason.statement_argument", name: "Statement & Argument", description: "Strong/weak argument evaluation." },
      { code: "reason.assertion_reason", name: "Assertion & Reason", description: "Cause-effect verification problems." },
      { code: "reason.cause_effect", name: "Cause & Effect", description: "Identification of cause-effect from events." },
      { code: "reason.decision_making", name: "Decision Making", description: "Eligibility-based decision problems." },
      { code: "reason.problem_solving", name: "Problem Solving", description: "Seating, ordering and matching puzzles." },
      { code: "reason.mirror_water", name: "Mirror & Water Image", description: "Reflection-based visual reasoning." },
      { code: "reason.paper_folding", name: "Paper Folding & Cutting", description: "Visualisation of folded paper." },
      { code: "reason.embedded_figures", name: "Embedded Figures", description: "Hidden figure detection." },
      { code: "reason.figure_completion", name: "Figure Completion", description: "Completing visual patterns." },
      { code: "reason.cube_dice", name: "Cube & Dice", description: "Dice rotation and cube counting." },
      { code: "reason.visual_memory", name: "Visual Memory & Discrimination", description: "Recall and differentiation of visual stimuli." },
    ],
  },
];

export async function seedUpPoliceSiSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UP_POLICE_SI" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UP_POLICE_SI exam not found.");
  }
  console.log(`Seeding UP Police SI syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < upPoliceSiSyllabus.length; sIdx++) {
    const s = upPoliceSiSyllabus[sIdx];
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
  seedUpPoliceSiSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
