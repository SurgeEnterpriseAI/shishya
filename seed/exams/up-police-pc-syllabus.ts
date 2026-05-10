// UP Police Constable — full syllabus tree.
// 150 MCQs in 2 hours, 300 marks, 0.5 negative marking.
// Sections: General Knowledge (38 Qs), General Hindi (37 Qs),
//           Numerical & Mental Ability (38 Qs), Mental Aptitude/IQ/Reasoning (37 Qs).
// Source: UPPBPB official notification (uppbpb.gov.in) + Adda247 / Career Power cross-check.
//
// Run after seedExams: npx tsx seed/exams/up-police-pc-syllabus.ts

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

export const upPolicePcSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE (38 Qs) ──────────────────────────────────────────
  {
    code: "GK",
    name: "General Knowledge",
    weight: 0.253,
    topics: [
      { code: "gk.history", name: "Indian History", description: "Ancient, medieval and modern Indian history; major dynasties and events." },
      { code: "gk.freedom_struggle", name: "Indian Freedom Struggle", description: "1857 revolt, INC, Gandhian movements, partition and integration." },
      { code: "gk.geography", name: "Indian Geography", description: "Physical, economic and political geography of India and the world." },
      { code: "gk.polity", name: "Indian Polity & Constitution", description: "Constitution, Parliament, judiciary, Fundamental Rights, DPSPs." },
      { code: "gk.economy", name: "Indian Economy", description: "Five-year plans, banking, GDP, inflation, agriculture, industry, budget." },
      { code: "gk.science", name: "General Science", description: "Basic physics, chemistry, biology and everyday applications of science." },
      { code: "gk.tech", name: "Science & Technology", description: "Space, defence, IT, biotech and recent scientific developments in India." },
      { code: "gk.sports", name: "Sports", description: "National and international sports, tournaments, players and recent winners." },
      { code: "gk.awards", name: "Awards & Honours", description: "Padma awards, Nobel Prize, Bharat Ratna, gallantry awards and recent recipients." },
      { code: "gk.books", name: "Books & Authors", description: "Notable books, authors and recent literary releases." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events of the last 12-18 months." },
      { code: "gk.up_specific", name: "Uttar Pradesh Specific GK", description: "UP geography, history, culture, schemes, prominent personalities and Mahakumbh/festivals." },
      { code: "gk.census", name: "Census, Population & Demography", description: "Census data, sex ratio, literacy and demographic indicators of India and UP." },
      { code: "gk.cyber", name: "Cyber Crime & Internet Awareness", description: "Cyber crime types, IT Act basics, online safety and digital literacy." },
      { code: "gk.evidence_act", name: "Indian Evidence & Penal Acts", description: "Basic awareness of BNS, BNSS and BSA — successors to IPC, CrPC and IEA." },
      { code: "gk.environment", name: "Environment & Ecology", description: "Climate change, pollution, biodiversity, national parks and conservation." },
      { code: "gk.misc", name: "Miscellaneous GK", description: "Important days, capitals, currencies, abbreviations, first/largest/longest in India." },
    ],
  },

  // ── GENERAL HINDI (37 Qs) ──────────────────────────────────────────────
  {
    code: "HINDI",
    name: "General Hindi (सामान्य हिंदी)",
    weight: 0.247,
    topics: [
      { code: "hindi.varnamala", name: "Varnamala (वर्णमाला)", description: "Hindi alphabet — vowels, consonants and classification." },
      { code: "hindi.sandhi", name: "Sandhi (संधि)", description: "Swar, vyanjan and visarg sandhi rules and examples." },
      { code: "hindi.samas", name: "Samas (समास)", description: "Compound words — tatpurush, dvandva, bahuvrihi and other types." },
      { code: "hindi.upsarg_pratyay", name: "Upsarg & Pratyay (उपसर्ग-प्रत्यय)", description: "Prefixes and suffixes — formation and meaning." },
      { code: "hindi.paryayvachi", name: "Paryayvachi (पर्यायवाची)", description: "Synonyms in Hindi — common word lists." },
      { code: "hindi.vilom", name: "Vilom (विलोम शब्द)", description: "Antonyms in Hindi — opposites of common words." },
      { code: "hindi.anekarthi", name: "Anekarthi Shabd (अनेकार्थी शब्द)", description: "Words with multiple meanings depending on context." },
      { code: "hindi.tatsam_tadbhav", name: "Tatsam-Tadbhav (तत्सम-तद्भव)", description: "Sanskrit-origin and derived word pairs." },
      { code: "hindi.ling_vachan", name: "Ling, Vachan, Karak (लिंग, वचन, कारक)", description: "Gender, number and case usage in Hindi grammar." },
      { code: "hindi.sangya_sarvanam", name: "Sangya & Sarvanam (संज्ञा-सर्वनाम)", description: "Nouns and pronouns — types and usage." },
      { code: "hindi.kriya_visheshan", name: "Kriya & Visheshan (क्रिया-विशेषण)", description: "Verbs, adverbs and adjectives — forms and usage." },
      { code: "hindi.kaal_vachya", name: "Kaal & Vachya (काल-वाच्य)", description: "Tenses and active/passive voice (kartri/karm/bhav vachya)." },
      { code: "hindi.muhavare", name: "Muhavare (मुहावरे)", description: "Hindi idioms and their contextual meanings." },
      { code: "hindi.lokoktiyan", name: "Lokoktiyan (लोकोक्तियाँ)", description: "Hindi proverbs and their applications." },
      { code: "hindi.ras_chhand_alankar", name: "Ras, Chhand, Alankar", description: "Sentiments, meters and figures of speech in Hindi poetics." },
      { code: "hindi.shabd_rachna", name: "Shabd Rachna (शब्द रचना)", description: "Word formation and structural analysis." },
      { code: "hindi.vakya_shuddhi", name: "Vakya Shuddhi (वाक्य शुद्धि)", description: "Sentence correction — grammatical errors and rectification." },
      { code: "hindi.gadyansh", name: "Gadyansh / Comprehension", description: "Unseen passage with comprehension questions." },
      { code: "hindi.lekhak_rachnayen", name: "Lekhak & Rachnayen", description: "Famous Hindi authors, their works and literary awards." },
      { code: "hindi.purasakar", name: "Hindi Bhasha Purasakar", description: "Major Hindi awards — Jnanpith, Sahitya Akademi, Vyas Samman." },
    ],
  },

  // ── NUMERICAL & MENTAL ABILITY (38 Qs) ─────────────────────────────────
  {
    code: "MATH",
    name: "Numerical & Mental Ability",
    weight: 0.253,
    topics: [
      { code: "math.number_system", name: "Number System", description: "Natural, whole, integer, rational numbers; divisibility and number properties." },
      { code: "math.simplification", name: "Simplification", description: "BODMAS, fractions, decimals, square and cube roots." },
      { code: "math.percentage", name: "Percentage", description: "Percentage calculations and applied problems." },
      { code: "math.average", name: "Average", description: "Mean, weighted average and applied averaging problems." },
      { code: "math.ratio_proportion", name: "Ratio and Proportion", description: "Direct, inverse, compound ratio and partnership." },
      { code: "math.profit_loss", name: "Profit and Loss", description: "CP, SP, MP, discount, successive discount and profit/loss percent." },
      { code: "math.discount", name: "Discount", description: "True discount, banker's discount and successive discounts." },
      { code: "math.si_ci", name: "Simple and Compound Interest", description: "SI, CI compounded annually/half-yearly, instalments." },
      { code: "math.time_work", name: "Time and Work", description: "Work efficiency, pipes & cisterns, joint work and wages." },
      { code: "math.time_distance", name: "Time and Distance", description: "Trains, boats and streams, relative speed and average speed." },
      { code: "math.mensuration", name: "Mensuration", description: "Area, perimeter, surface area and volume of 2-D and 3-D figures." },
      { code: "math.algebra", name: "Algebra", description: "Linear equations, quadratic equations and basic identities." },
      { code: "math.data_interpretation", name: "Data Interpretation", description: "Tables, bar/line/pie charts — calculation-based questions." },
      { code: "math.relation", name: "Symbol & Relationship Test", description: "Symbol-based relations, mathematical operators and arithmetic puzzles." },
      { code: "math.perception", name: "Perception Test", description: "Common sense, perceptual reasoning and judgment questions." },
      { code: "math.word_formation", name: "Word Formation", description: "Forming meaningful words from given letters." },
      { code: "math.series", name: "Number Series", description: "Find next/wrong/missing term in arithmetic and geometric series." },
      { code: "math.analogy_test", name: "Analogy Test", description: "Numerical and figural analogies — odd one out and pattern matching." },
    ],
  },

  // ── MENTAL APTITUDE / IQ / REASONING (37 Qs) ───────────────────────────
  {
    code: "REASONING",
    name: "Mental Aptitude / IQ / Reasoning",
    weight: 0.247,
    topics: [
      { code: "reason.analogy", name: "Analogy", description: "Word, number and figural analogies — relationship matching." },
      { code: "reason.classification", name: "Classification", description: "Odd one out — verbal, alphabetical, numerical and figural." },
      { code: "reason.coding_decoding", name: "Coding-Decoding", description: "Letter, number and symbol coding patterns." },
      { code: "reason.series_completion", name: "Series Completion", description: "Letter, number and figure series — missing or next term." },
      { code: "reason.blood_relation", name: "Blood Relations", description: "Family-tree puzzles based on relationships and statements." },
      { code: "reason.direction", name: "Direction Sense", description: "Cardinal directions, distances and final position problems." },
      { code: "reason.ranking", name: "Ranking & Order", description: "Ranking from top/bottom, age order and seating sequences." },
      { code: "reason.alphabet_test", name: "Alphabet Test", description: "Alphabet position, letter rearrangement and dictionary order." },
      { code: "reason.venn", name: "Venn Diagrams", description: "Set relations represented through Venn diagrams." },
      { code: "reason.syllogism", name: "Syllogism", description: "Logical conclusions from given statements (all/some/no)." },
      { code: "reason.statement_conclusion", name: "Statement & Conclusion", description: "Inference and decision-making from statements." },
      { code: "reason.mirror_water", name: "Mirror & Water Image", description: "Reflection of letters, numbers and figures in mirror/water." },
      { code: "reason.paper_folding", name: "Paper Folding & Cutting", description: "Visualisation of folded/cut paper outcomes." },
      { code: "reason.embedded_figures", name: "Embedded Figures", description: "Identifying a hidden figure within a larger pattern." },
      { code: "reason.figure_completion", name: "Figure Completion", description: "Choosing the figure that completes a given pattern." },
      { code: "reason.dice_cube", name: "Dice & Cube", description: "Dice rotation, opposite faces and cube counting/colouring." },
      { code: "reason.problem_solving", name: "Problem Solving", description: "Seating arrangements, scheduling and logical puzzles." },
      { code: "reason.decision_making", name: "Decision Making", description: "Selection criteria, eligibility and decision-based reasoning." },
      { code: "reason.visual_memory", name: "Visual Memory & Discrimination", description: "Retention of visual stimuli and discrimination among similar shapes." },
      { code: "reason.observation", name: "Observation", description: "Counting figures, hidden numbers and detail observation tasks." },
    ],
  },
];

export async function seedUpPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UP_POLICE_CONSTABLE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UP_POLICE_CONSTABLE exam not found.");
  }
  console.log(`Seeding UP Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < upPolicePcSyllabus.length; sIdx++) {
    const s = upPolicePcSyllabus[sIdx];
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
  seedUpPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
