// JPSC CCE Prelims — full syllabus tree.
// Two papers: Paper 1 (GS, 100 Qs, 200 marks) + Paper 2 (Jharkhand-specific GK, 100 Qs, 200 marks).
// Source: jpsc.gov.in revised CCE syllabus PDF + Drishti IAS state-pcs page.
//
// Run after seedExams: npx tsx seed/exams/jpsc-cce-syllabus.ts

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

export const jpscCceSyllabus: SubjectSeed[] = [
  // ── PAPER 1: GENERAL STUDIES ───────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies (Paper I)",
    weight: 1,
    topics: [
      { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mahajanapadas, Mauryas, Guptas, Buddhism and Jainism." },
      { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughal empire, Bhakti and Sufi movements, Vijayanagar." },
      { code: "gs.history.modern", name: "Modern India and freedom struggle", description: "British colonial rule, social reform, INC, Gandhian phase, partition." },
      { code: "gs.history.world", name: "World history", description: "Renaissance, Industrial Revolution, World Wars, Russian and French revolutions." },
      { code: "gs.geog.physical", name: "Physical geography of India and World", description: "Earth's structure, landforms, atmosphere, climate, oceans." },
      { code: "gs.geog.indian", name: "Indian geography", description: "Himalayas, plateaus, rivers, monsoon, soil, agriculture, mineral belts." },
      { code: "gs.polity.constitution", name: "Indian Constitution and Polity", description: "Preamble, FRs, DPSPs, Union and State governments, judiciary, panchayati raj." },
      { code: "gs.polity.governance", name: "Public administration and governance", description: "RTI, e-governance, citizen charter, civil services, anti-corruption." },
      { code: "gs.eco.basics", name: "Indian economy basics", description: "GDP, inflation, fiscal policy, banking, RBI, GST, Union Budget." },
      { code: "gs.eco.development", name: "Economic and social development", description: "Sustainable development, poverty, inclusion, demographics, social sector." },
      { code: "gs.env.ecology", name: "Environment and ecology", description: "Ecosystems, biodiversity hotspots, conservation, environmental laws." },
      { code: "gs.env.climate", name: "Climate change", description: "UNFCCC, Kyoto, Paris Agreement, IPCC, India's NDCs, Net Zero." },
      { code: "gs.science.physics", name: "Physics in everyday life", description: "Force, motion, electricity, light, sound, modern physics applications." },
      { code: "gs.science.chemistry", name: "Chemistry basics", description: "Periodic table, acids/bases, polymers, drugs, fertilizers." },
      { code: "gs.science.biology", name: "Biology and human body", description: "Cells, organ systems, nutrition, communicable and lifestyle diseases." },
      { code: "gs.science.tech", name: "Science and technology", description: "ISRO missions, AI, biotech, defence — applications and recent advances." },
      { code: "gs.ca.national", name: "National current affairs", description: "Government schemes, appointments, awards, sports — last 12-18 months." },
      { code: "gs.ca.international", name: "International affairs", description: "India's foreign relations, UN, BRICS, G20, climate summits." },
      { code: "gs.reasoning.logical", name: "Logical reasoning and mental ability", description: "Series, coding-decoding, syllogism, blood relations, analogy." },
      { code: "gs.reasoning.numeracy", name: "Basic numeracy and data interpretation", description: "Numbers, percentages, ratios, graphs, charts — Class X level." },
    ],
  },

  // ── PAPER 2: JHARKHAND-SPECIFIC GENERAL KNOWLEDGE ──────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "Jharkhand-specific General Knowledge (Paper II)",
    weight: 1,
    topics: [
      { code: "jh.history.ancient", name: "Ancient and medieval Jharkhand", description: "Asur, Munda and Oraon settlements; Magadhan and Mughal influence on Chhotanagpur plateau." },
      { code: "jh.history.tilka_manjhi", name: "Tilka Manjhi rebellion (1784)", description: "Earliest tribal armed revolt in Santhal Parganas against British and zamindars." },
      { code: "jh.history.kol_revolt", name: "Kol rebellion (1831-32)", description: "Buddho Bhagat-led uprising of Mundas and Hos in Chhotanagpur against dikus." },
      { code: "jh.history.santhal_hul", name: "Santhal Hul (1855-56)", description: "Sidhu and Kanhu Murmu-led armed rebellion against moneylenders, zamindars and the British." },
      { code: "jh.history.birsa_munda", name: "Birsa Munda Ulgulan (1899-1900)", description: "'Dharti Aba' Birsa Munda's movement for Munda Raj against landlords and missionaries." },
      { code: "jh.history.tana_bhagat", name: "Tana Bhagat movement", description: "Jatra Bhagat-led Oraon religious-political movement; non-violent satyagraha against British." },
      { code: "jh.history.sardari_larai", name: "Sardari Larai (1858-95)", description: "Munda Sardar's legal-political agitation for restoration of khuntkatti rights." },
      { code: "jh.history.1857_revolt", name: "1857 in Jharkhand", description: "Hazaribagh, Ranchi, Chaibasa uprisings; Pandey Ganpat Rai, Vishwanath Shahdeo, Tikait Umrao Singh." },
      { code: "jh.history.cnt_act", name: "Chhotanagpur Tenancy Act 1908", description: "Protection of tribal land rights from alienation; bedrock of Jharkhandi land law." },
      { code: "jh.history.spt_act", name: "Santhal Pargana Tenancy Act 1949", description: "Protects Santhal Pargana lands from non-tribal transfer." },
      { code: "jh.history.statehood", name: "Jharkhand statehood movement", description: "All India Jharkhand Party, JMM, Ram Dayal Munda, Shibu Soren; statehood achieved 15 Nov 2000." },
      { code: "jh.geog.location", name: "Location and physiography of Jharkhand", description: "Chhotanagpur plateau; bordered by Bihar, Bengal, Odisha, Chhattisgarh, UP." },
      { code: "jh.geog.rivers", name: "Rivers of Jharkhand", description: "Damodar (sorrow of Bengal), Subarnarekha, North Koel, South Koel, Sankh, Brahmani." },
      { code: "jh.geog.minerals", name: "Mineral wealth of Jharkhand", description: "40% of India's mineral wealth — coal (Jharia, Bokaro), iron ore (Noamundi), copper (Singhbhum), uranium (Jaduguda)." },
      { code: "jh.geog.climate", name: "Climate and forests", description: "Tropical monsoon; ~30% forest cover; Sal-dominated forests; Saranda — Asia's densest sal forest." },
      { code: "jh.geog.parks", name: "National parks and wildlife", description: "Betla NP, Hazaribagh WLS, Dalma WLS, Palamau Tiger Reserve." },
      { code: "jh.tribes.major", name: "Major tribes of Jharkhand", description: "Santhal, Munda, Oraon, Ho, Bhumij — largest tribal population state in India." },
      { code: "jh.tribes.pvtg", name: "Particularly Vulnerable Tribal Groups", description: "Asur, Birhor, Birjia, Korwa, Mal Paharia, Parhaiya, Sauria Paharia, Savar." },
      { code: "jh.tribes.languages", name: "Tribal languages of Jharkhand", description: "Santhali (8th Schedule), Mundari, Ho, Kurukh, Kharia, Khortha, Nagpuri, Panchpargania." },
      { code: "jh.culture.dances", name: "Folk dances and music", description: "Chhau (Seraikella), Jhumar, Paika, Domkach, Mardana Jhumar, Karma." },
      { code: "jh.culture.festivals", name: "Festivals of Jharkhand", description: "Sarhul, Karma, Sohrai, Tusu, Jitiya, Mage Parab — agrarian and tribal festivals." },
      { code: "jh.culture.art", name: "Art forms — Sohrai and Khovar", description: "Sohrai harvest paintings and Khovar marriage paintings of Hazaribagh — GI tag." },
      { code: "jh.eco.industries", name: "Industries of Jharkhand", description: "Tata Steel (Jamshedpur), Bokaro Steel, HEC Ranchi, IISCO, Tisco — India's industrial heartland." },
      { code: "jh.eco.schemes", name: "Jharkhand state schemes", description: "Mukhyamantri Kanya Suraksha Yojana, Sona Sobran Dhoti-Saree Yojana, Mukhyamantri Krishi Ashirvad." },
      { code: "jh.polity.assembly", name: "Jharkhand Legislative Assembly", description: "81-seat unicameral assembly; CM, Council of Ministers; Jharkhand HC at Ranchi." },
      { code: "jh.polity.local", name: "Panchayati raj and 5th Schedule", description: "PESA 1996; Gram Sabha powers; Scheduled areas under 5th Schedule of Constitution." },
    ],
  },
];

export async function seedJpscCceSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "JH_JPSC_CCE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — JH_JPSC_CCE exam not found.");
  }
  console.log(`Seeding JPSC CCE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < jpscCceSyllabus.length; sIdx++) {
    const s = jpscCceSyllabus[sIdx];
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
  seedJpscCceSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
