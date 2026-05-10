// CGPSC State Service Prelims — full syllabus tree.
// Two papers: Paper 1 (GS, 100 Qs, 200 marks) + Paper 2 (Aptitude/CSAT, 100 Qs, 200 marks).
// Source: psc.cg.gov.in SSE notification + Drishti IAS state-pcs page.
//
// Run after seedExams: npx tsx seed/exams/cgpsc-sse-syllabus.ts

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

export const cgpscSseSyllabus: SubjectSeed[] = [
  // ── PAPER 1: GENERAL STUDIES ───────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies (Paper I)",
    weight: 1,
    topics: [
      { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic civilization, Mauryan and Gupta empires, Buddhism and Jainism." },
      { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughal empire, Bhakti and Sufi movements." },
      { code: "gs.history.modern", name: "Modern India and freedom struggle", description: "1857 revolt, INC, Gandhian movements, partition and independence." },
      { code: "cg.history.ancient", name: "Ancient Chhattisgarh — Dakshin Kosala", description: "Sarabhpuriyas, Panduvanshis of Mekala and Sirpur; Lakshmana temple at Sirpur." },
      { code: "cg.history.medieval", name: "Medieval Chhattisgarh", description: "Kalachuris of Ratanpur, Haihayas; Maratha rule under Bhonsle dynasty of Nagpur." },
      { code: "cg.history.halba_revolt", name: "Halba rebellion (1774-79)", description: "Bastar uprising under Ajmer Singh against Maratha and Company forces." },
      { code: "cg.history.bastar_movements", name: "Bastar tribal uprisings", description: "Bhumkal rebellion 1910 under Gunda Dhur against British and forest laws." },
      { code: "cg.history.1857", name: "1857 in Chhattisgarh", description: "Veer Narayan Singh of Sonakhan — first martyr of Chhattisgarh, hanged at Raipur 1857." },
      { code: "cg.history.freedom", name: "Chhattisgarh in freedom movement", description: "Pt. Sundarlal Sharma — 'Father of Chhattisgarh freedom movement'; Thakur Pyarelal Singh; Khoob Chand Baghel." },
      { code: "cg.history.statehood", name: "Statehood movement", description: "Chhattisgarh Mahasabha; separation from MP on 1 November 2000 as 26th state." },
      { code: "gs.geog.physical", name: "Physical geography of India and World", description: "Earth's structure, landforms, climate, oceans, monsoon system." },
      { code: "gs.geog.indian", name: "Indian geography", description: "Himalayas, peninsular plateau, rivers, agriculture, mineral belts." },
      { code: "cg.geog.location", name: "Location and physiography of Chhattisgarh", description: "Central Indian plateau; Mahanadi basin; bordered by 7 states." },
      { code: "cg.geog.rivers", name: "Rivers of Chhattisgarh", description: "Mahanadi (lifeline), Shivnath, Hasdeo, Indravati, Arpa, Mand, Pairi." },
      { code: "cg.geog.forests", name: "Forests of Chhattisgarh", description: "Over 44% forest cover — third highest in India; sal, teak and bamboo forests." },
      { code: "cg.geog.minerals", name: "Mineral resources of Chhattisgarh", description: "Coal (Korba), iron ore (Bailadila — highest grade), bauxite, limestone, dolomite, tin." },
      { code: "cg.geog.parks", name: "Wildlife and protected areas", description: "Indravati TR, Achanakmar TR, Udanti-Sitanadi TR, Kanger Valley NP, Guru Ghasidas NP." },
      { code: "gs.polity.constitution", name: "Indian Constitution", description: "Preamble, Fundamental Rights, DPSPs, basic structure, amendments." },
      { code: "gs.polity.governance", name: "Indian polity and governance", description: "Union, state and local government; panchayati raj; constitutional bodies." },
      { code: "cg.polity.assembly", name: "Chhattisgarh Legislative Assembly", description: "90-seat unicameral assembly; CM, Council of Ministers; Chhattisgarh HC at Bilaspur." },
      { code: "cg.polity.panchayat", name: "Panchayati raj and PESA", description: "PESA 1996 in Scheduled Areas — Bastar, Surguja; Gram Sabha autonomy on minor forest produce." },
      { code: "gs.eco.basics", name: "Indian economy", description: "GDP, banking, fiscal policy, GST, Union Budget, RBI, NITI Aayog." },
      { code: "cg.eco.economy", name: "Chhattisgarh economy", description: "Mineral and forest-based economy; rice bowl of central India; surplus power state." },
      { code: "cg.eco.industries", name: "Industries of Chhattisgarh", description: "Bhilai Steel Plant, NTPC Korba, NMDC Bailadila, BALCO; SECL coal mining." },
      { code: "cg.eco.schemes", name: "Chhattisgarh state schemes", description: "Rajiv Gandhi Kisan Nyay Yojana, Godhan Nyay Yojana, Suraji Gaon Yojana, Narwa-Garwa-Ghurwa-Bari." },
      { code: "gs.env.ecology", name: "Environment and ecology", description: "Ecosystems, biodiversity, conservation, environmental laws." },
      { code: "gs.env.climate", name: "Climate change", description: "UNFCCC, Paris Agreement, IPCC, India's NDCs and Net Zero target." },
      { code: "gs.science.physics", name: "Physics in everyday life", description: "Force, motion, electricity, light, sound." },
      { code: "gs.science.chemistry", name: "Chemistry basics", description: "Periodic table, acids/bases, polymers, fertilizers." },
      { code: "gs.science.biology", name: "Biology and human body", description: "Cells, organ systems, nutrition, diseases." },
      { code: "gs.science.tech", name: "Science and technology", description: "ISRO, AI, biotechnology, IT — recent advances and applications." },
      { code: "gs.ca.national", name: "National current affairs", description: "Government schemes, awards, sports, appointments — last 12-18 months." },
      { code: "cg.ca.state", name: "Chhattisgarh current affairs", description: "State schemes, budget, sports, awards, tribal welfare initiatives." },
      { code: "cg.tribes.major", name: "Major tribes of Chhattisgarh", description: "Gond (largest), Baiga, Halba, Kamar, Maria, Muria, Oraon — distribution and culture." },
      { code: "cg.tribes.pvtg", name: "PVTGs of Chhattisgarh", description: "Abujhmaria, Baiga, Birhor, Hill Korwa, Kamar, Pahari Korwa, Pando." },
      { code: "cg.culture.dance", name: "Folk dances of Chhattisgarh", description: "Panthi (Satnamis), Raut Nacha, Karma, Suwa, Pandwani, Saila, Gendi." },
      { code: "cg.culture.festivals", name: "Festivals and Teej of Chhattisgarh", description: "Hareli, Pola, Teeja, Bastar Dussehra (75-day longest), Madai, Goncha festival." },
      { code: "cg.culture.languages", name: "Languages and literature", description: "Chhattisgarhi (state language), Halbi, Bhatri, Gondi; Pandavani by Teejan Bai." },
    ],
  },

  // ── PAPER 2: APTITUDE TEST ─────────────────────────────────────────────
  {
    code: "CSAT",
    name: "Aptitude Test (Paper II)",
    weight: 1,
    topics: [
      { code: "csat.comprehension", name: "Reading comprehension", description: "Passage-based questions on inference, vocabulary, main idea." },
      { code: "csat.interpersonal", name: "Interpersonal and communication skills", description: "Effective communication and group behaviour." },
      { code: "csat.logical", name: "Logical reasoning and analytical ability", description: "Statement-conclusion, syllogism, deductive reasoning." },
      { code: "csat.decision", name: "Decision-making and problem-solving", description: "Ethical and managerial decision-making situations." },
      { code: "csat.mental", name: "General mental ability", description: "Series, analogy, coding-decoding, blood relations, directions." },
      { code: "csat.numeracy", name: "Basic numeracy", description: "Numbers and orders of magnitude — Class X level." },
      { code: "csat.data", name: "Data interpretation", description: "Charts, graphs, tables — Class X level." },
      { code: "csat.hindi_chh", name: "Hindi and Chhattisgarhi language ability", description: "Comprehension, grammar and basic usage of Hindi and Chhattisgarhi." },
    ],
  },
];

export async function seedCgpscSseSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "CG_CGPSC_SSE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — CG_CGPSC_SSE exam not found.");
  }
  console.log(`Seeding CGPSC SSE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < cgpscSseSyllabus.length; sIdx++) {
    const s = cgpscSseSyllabus[sIdx];
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
  seedCgpscSseSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
