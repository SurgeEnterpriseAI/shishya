// TS LAWCET (Telangana State Law Common Entrance Test) — full syllabus tree.
// Conducting body: TSCHE / Osmania University (lawcet.tsche.ac.in).
// Pattern: 120 MCQs in 90 minutes — Aptitude for Study of Law (60 Qs), GK & Mental Ability (30 Qs),
// Current Affairs (30 Qs). 1 mark each. No negative marking.
// For 3-yr LLB and 5-yr LLB courses (UG entry).
//
// Run after seedExams: npx tsx seed/exams/ts-lawcet-syllabus.ts

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

export const tsLawcetSyllabus: SubjectSeed[] = [
  // ── LEGAL APTITUDE — APTITUDE FOR THE STUDY OF LAW ───────────────────
  {
    code: "LEGAL_APTITUDE",
    name: "Aptitude for the Study of Law",
    weight: 1,
    topics: [
      { code: "legal.constitution_india", name: "Constitution of India", description: "Preamble, key provisions, structure of government, federalism." },
      { code: "legal.fundamental_rights", name: "Fundamental Rights", description: "Articles 12-35, writs, restrictions, enforcement mechanisms." },
      { code: "legal.dpsp_duties", name: "DPSP and Fundamental Duties", description: "Articles 36-51A, classification of DPSP, harmonious construction." },
      { code: "legal.parliament", name: "Parliament and Legislature", description: "Lok Sabha, Rajya Sabha, lawmaking process, parliamentary committees." },
      { code: "legal.executive", name: "Executive — Union and State", description: "President, Vice-President, Governor, PM, CM, Council of Ministers." },
      { code: "legal.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, judicial review, PIL, judicial precedent." },
      { code: "legal.contract_act", name: "Indian Contract Act, 1872", description: "Formation, performance, breach, void/voidable, quasi-contracts." },
      { code: "legal.tort_law", name: "Law of Torts — General Principles", description: "Negligence, nuisance, defamation, vicarious liability, defences." },
      { code: "legal.specific_torts", name: "Specific Torts and Defences", description: "Trespass, conversion, deceit, conspiracy, defences like volenti non fit injuria." },
      { code: "legal.criminal_law_ipc", name: "Criminal Law — IPC", description: "General principles, mens rea, key offences, general exceptions." },
      { code: "legal.bharatiya_nyaya", name: "Bharatiya Nyaya Sanhita, 2023", description: "Replacement of IPC, structural changes, new offences." },
      { code: "legal.interpretation_statutes", name: "Interpretation of Statutes", description: "Literal, golden, mischief, purposive rules of interpretation." },
      { code: "legal.legal_documents", name: "Interpretation of Legal Documents", description: "Reading and analysing legal text, contracts and statutes." },
      { code: "legal.stare_decisis", name: "Stare Decisis", description: "Doctrine of precedent, binding and persuasive authority." },
      { code: "legal.ratio_decidendi", name: "Ratio Decidendi and Obiter Dicta", description: "Distinguishing legal reasoning from passing remarks in judgments." },
      { code: "legal.legal_maxims", name: "Legal Maxims", description: "Common Latin maxims used in Indian jurisprudence." },
      { code: "legal.case_analysis", name: "Case Analysis", description: "Reading judgments, identifying facts, issues, decision and ratio." },
      { code: "legal.legal_resources", name: "Legal Resources", description: "Use of statutes, case law, legal dictionaries and commentaries." },
      { code: "legal.public_intl_law", name: "Public International Law — Basics", description: "Sources, UN, treaties, sovereignty, jurisdiction." },
      { code: "legal.application_principles", name: "Application of Legal Principles to Facts", description: "Applying given legal rules to hypothetical scenarios." },
    ],
  },

  // ── GENERAL KNOWLEDGE AND MENTAL ABILITY ─────────────────────────────
  {
    code: "GENERAL_KNOWLEDGE",
    name: "General Knowledge and Mental Ability",
    weight: 1,
    topics: [
      { code: "gk.history_national", name: "National and World History", description: "Ancient, medieval, modern Indian history; major world events." },
      { code: "gk.geography", name: "Indian and World Geography", description: "Physical and political geography, climate, resources." },
      { code: "gk.economics_basics", name: "Basic Economics", description: "GDP, inflation, fiscal and monetary policy basics." },
      { code: "gk.indian_polity", name: "Indian Polity", description: "Constitution, government structure, elections." },
      { code: "gk.science_tech", name: "Science and Technology", description: "Major scientific developments, ISRO, defence and biotech." },
      { code: "mental.logical_reasoning", name: "Logical Reasoning", description: "Verbal and non-verbal logical problems, arguments, conclusions." },
      { code: "mental.analytical_thinking", name: "Analytical Thinking", description: "Critical thinking, structured analysis of given information." },
      { code: "mental.problem_solving", name: "Problem Solving", description: "Multi-step reasoning problems, case-style scenarios." },
      { code: "mental.syllogisms", name: "Syllogisms", description: "Categorical premises and valid conclusions." },
      { code: "mental.number_series", name: "Number Series", description: "Identifying patterns in numerical sequences." },
      { code: "mental.puzzles", name: "Puzzles", description: "Mixed condition-based logical puzzles." },
      { code: "mental.data_interpretation", name: "Data Interpretation", description: "Bar graphs, line charts, pie charts and tables." },
      { code: "mental.coding_decoding", name: "Coding and Decoding", description: "Letter, number and symbol-based coding." },
      { code: "mental.blood_relations", name: "Blood Relations", description: "Family relationship problems." },
      { code: "mental.direction_sense", name: "Direction Sense", description: "Direction and distance-based problems." },
    ],
  },

  // ── CURRENT AFFAIRS ──────────────────────────────────────────────────
  {
    code: "CURRENT_AFFAIRS",
    name: "Current Affairs",
    weight: 1,
    topics: [
      { code: "ca.national_news", name: "Significant National News", description: "Major political, social, economic events in India." },
      { code: "ca.international_news", name: "Significant International News", description: "Global political and economic events, summits." },
      { code: "ca.sports_events", name: "Sports Events", description: "Major tournaments, records, awards." },
      { code: "ca.honours_awards", name: "Honours and Awards", description: "National and international civilian, sports, literary awards." },
      { code: "ca.govt_policies", name: "Government Policies", description: "Recent schemes, programmes, key cabinet decisions." },
      { code: "ca.legal_news", name: "Legal Current Affairs", description: "Landmark Supreme Court and High Court judgments, new bills, amendments." },
      { code: "ca.science_tech_recent", name: "Recent Science and Tech", description: "ISRO missions, AI, space, defence developments." },
      { code: "ca.books_authors", name: "Books and Authors", description: "Recent books, biographies, autobiographies, literary recognition." },
    ],
  },
];

export async function seedTsLawcetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "TS_LAWCET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — TS_LAWCET exam not found.");
  }
  console.log(`Seeding TS LAWCET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < tsLawcetSyllabus.length; sIdx++) {
    const s = tsLawcetSyllabus[sIdx];
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
    console.log(`  ${s.code} — ${s.topics.length} topics`);
  }
  console.log(`Seeded TS LAWCET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedTsLawcetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
