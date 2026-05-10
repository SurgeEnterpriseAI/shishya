// AP LAWCET (Andhra Pradesh Law Common Entrance Test) — full syllabus tree.
// Conducting body: APSCHE (sche.ap.gov.in/lawcet); on behalf of state universities.
// Pattern: 120 MCQs in 90 minutes — Aptitude for Study of Law (60 Qs), GK & Mental Ability (30 Qs),
// Current Affairs (30 Qs). 1 mark each. No negative marking.
// For 3-yr LLB and 5-yr LLB courses.
//
// Run after seedExams: npx tsx seed/exams/ap-lawcet-syllabus.ts

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

export const apLawcetSyllabus: SubjectSeed[] = [
  // ── LEGAL APTITUDE — APTITUDE FOR THE STUDY OF LAW ───────────────────
  {
    code: "LEGAL_APTITUDE",
    name: "Aptitude for the Study of Law",
    weight: 1,
    topics: [
      { code: "legal.constitution_india", name: "Constitution of India", description: "Preamble, fundamental rights, DPSP, fundamental duties, structure of government." },
      { code: "legal.fundamental_rights", name: "Fundamental Rights and Duties", description: "Articles 12-35, writs (habeas corpus, mandamus, certiorari, quo warranto, prohibition)." },
      { code: "legal.dpsp", name: "Directive Principles of State Policy", description: "Articles 36-51, classification, relationship with fundamental rights." },
      { code: "legal.parliament_executive", name: "Parliament and Executive", description: "Lok Sabha, Rajya Sabha, President, PM, Council of Ministers." },
      { code: "legal.judiciary", name: "Indian Judiciary", description: "Supreme Court, High Courts, judicial review, judicial activism, PIL." },
      { code: "legal.law_torts", name: "Law of Torts", description: "Negligence, defamation, nuisance, trespass, vicarious liability, defences." },
      { code: "legal.contract_law", name: "Indian Contract Act, 1872", description: "Offer, acceptance, consideration, free consent, performance, breach, remedies." },
      { code: "legal.criminal_ipc", name: "Criminal Law — IPC / Bharatiya Nyaya Sanhita", description: "Key sections, mens rea, actus reus, general exceptions, offences against person and property." },
      { code: "legal.public_intl_law", name: "Public International Law", description: "Sources, UN, treaties, jurisdiction, diplomatic immunity." },
      { code: "legal.labour_law", name: "Labour Law", description: "Industrial Disputes Act, Factories Act, minimum wages — basic principles." },
      { code: "legal.ipr", name: "Intellectual Property Rights", description: "Copyright, trademark, patent — basic Indian framework." },
      { code: "legal.environmental_law", name: "Environmental Law", description: "Environment Protection Act, NGT, public trust, polluter pays principle." },
      { code: "legal.consumer_law", name: "Consumer Protection Law", description: "Consumer Protection Act 2019, redressal forums, consumer rights." },
      { code: "legal.legal_maxims", name: "Legal Maxims", description: "Common Latin maxims — audi alteram partem, ratio decidendi, ignorantia juris non excusat." },
      { code: "legal.legal_terms", name: "Legal Terminology", description: "Common legal terms — plaintiff, defendant, ex parte, locus standi, prima facie." },
      { code: "legal.application_principles", name: "Application of Legal Principles", description: "Applying given legal propositions to factual scenarios to derive conclusions." },
    ],
  },

  // ── GENERAL KNOWLEDGE AND MENTAL ABILITY ─────────────────────────────
  {
    code: "GENERAL_KNOWLEDGE",
    name: "General Knowledge and Mental Ability",
    weight: 1,
    topics: [
      { code: "gk.indian_constitution", name: "Indian Constitution and Polity", description: "Preamble, structure, organs of government." },
      { code: "gk.history", name: "Indian History", description: "Ancient, medieval, modern; freedom struggle." },
      { code: "gk.geography", name: "Indian and World Geography", description: "Physical and political features, climate, resources." },
      { code: "gk.economy", name: "Indian Economy", description: "Budget, GDP, banking, fiscal and monetary basics." },
      { code: "gk.general_science", name: "General Science", description: "Everyday physics, chemistry, biology, scientific developments." },
      { code: "mental.direction_distance", name: "Direction and Distances", description: "Direction sense problems and distance calculations." },
      { code: "mental.linear_arrangement", name: "Linear Arrangements", description: "Arranging persons or objects in a line based on conditions." },
      { code: "mental.complex_arrangement", name: "Complex Arrangements", description: "Multi-condition seating, table or matrix arrangements." },
      { code: "mental.analogies", name: "Analogies", description: "Word, number, and figural analogies." },
      { code: "mental.analytical_reasoning", name: "Analytical Reasoning", description: "Logical deductions from given premises." },
      { code: "mental.syllogism", name: "Syllogism", description: "Categorical statements and conclusions." },
      { code: "mental.ordering_sequencing", name: "Ordering and Sequencing", description: "Ranking and ordering problems based on conditions." },
      { code: "mental.verbal_series", name: "Verbal Series", description: "Letter and word-based series problems." },
      { code: "mental.non_verbal_series", name: "Non-Verbal Series", description: "Figure-based series and pattern recognition." },
      { code: "mental.coding_decoding", name: "Coding and Decoding", description: "Letter, number, and symbol coding schemes." },
      { code: "mental.blood_relations", name: "Blood Relationships", description: "Family relationship-based reasoning problems." },
      { code: "mental.visual_ability", name: "Problems Based on Visual Ability", description: "Mirror images, water images, paper folding and cutting." },
      { code: "mental.data_sufficiency", name: "Data Sufficiency", description: "Identifying sufficient data to answer a question." },
      { code: "mental.data_interpretation", name: "Data Interpretation", description: "Tables, bar charts, line graphs, pie charts." },
      { code: "mental.arithmetic_reasoning", name: "Arithmetic Reasoning", description: "Number-based reasoning, age problems, simple arithmetic puzzles." },
    ],
  },

  // ── CURRENT AFFAIRS ──────────────────────────────────────────────────
  {
    code: "CURRENT_AFFAIRS",
    name: "Current Affairs",
    weight: 1,
    topics: [
      { code: "ca.national_events", name: "National Events", description: "Major political, social and economic developments in India." },
      { code: "ca.international_events", name: "International Events", description: "Significant world events, conflicts, summits, diplomatic developments." },
      { code: "ca.awards_honours", name: "Awards and Honours", description: "Nobel, Padma, Bharat Ratna, sports awards, civilian and military honours." },
      { code: "ca.political_developments", name: "Political Developments", description: "Elections, government schemes, policy changes, key bills." },
      { code: "ca.legal_current_affairs", name: "Legal Current Affairs", description: "Landmark Supreme Court judgments, new laws and amendments." },
      { code: "ca.sports", name: "Sports", description: "National and international sports events, tournaments, records." },
      { code: "ca.science_tech", name: "Science and Technology", description: "ISRO, defence, biotech, space and IT sector developments." },
      { code: "ca.books_authors", name: "Books and Authors", description: "Recent books, biographies, literary awards." },
    ],
  },
];

export async function seedApLawcetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "AP_LAWCET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — AP_LAWCET exam not found.");
  }
  console.log(`Seeding AP LAWCET syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < apLawcetSyllabus.length; sIdx++) {
    const s = apLawcetSyllabus[sIdx];
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
  console.log(`Seeded AP LAWCET syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedApLawcetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
