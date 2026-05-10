// GPSC Class 1-2 Prelims — full syllabus tree.
// Two GS papers: GS-1 (200 MCQs, 200 marks, 3 hrs) + GS-2 (200 MCQs, 200 marks, 3 hrs).
// Source: gpsc.gujarat.gov.in syllabus PDF + Drishti IAS / BYJU's state-pcs page.
//
// Run after seedExams: npx tsx seed/exams/gpsc-class12-syllabus.ts

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

export const gpscClass12Syllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES PAPER 1 ────────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies (Paper I)",
    weight: 1,
    topics: [
      { code: "gs.history.ivc", name: "Indus Valley Civilization", description: "Harappa, Mohenjo-daro, Lothal (Gujarat), Dholavira (Gujarat — UNESCO 2021), Surkotada." },
      { code: "gs.history.ancient", name: "Ancient India", description: "Vedic age, Mahajanapadas, Mauryan, Gupta and post-Gupta empires." },
      { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Bhakti and Sufi movements, Vijayanagar." },
      { code: "gs.history.modern", name: "Modern India and freedom struggle", description: "1857, INC, Gandhian phase, partition and independence." },
      { code: "gj.history.mauryan", name: "Mauryan rule in Gujarat", description: "Junagadh rock edicts of Ashoka; Chandragupta governor Pushyagupta; Sudarshan lake at Girnar." },
      { code: "gj.history.kshatrapas", name: "Western Kshatrapas and Maitrakas", description: "Rudradaman I — Junagadh Sanskrit inscription; Maitrakas of Vallabhi (475-776 CE)." },
      { code: "gj.history.solanki", name: "Solanki / Chaulukya dynasty (940-1244 CE)", description: "Mulraj I, Bhima I, Siddhraj Jaysinh, Kumarapal; capital Anhilwara (Patan); golden age of Gujarat." },
      { code: "gj.history.somnath", name: "Somnath temple and Mahmud of Ghazni", description: "Mahmud of Ghazni's raid 1026 CE; repeated rebuilding; Sardar Patel's reconstruction 1951." },
      { code: "gj.history.delhi_mughal", name: "Delhi Sultanate and Mughal rule in Gujarat", description: "Alauddin Khilji conquest 1297; Gujarat Sultanate (Ahmad Shah I — Ahmedabad 1411); Akbar's annexation 1573." },
      { code: "gj.history.maratha", name: "Maratha rule and British advent", description: "Gaekwads of Baroda; East India Company foothold at Surat 1612; Treaty of Bassein 1802." },
      { code: "gj.history.gandhi", name: "Mahatma Gandhi and Gujarat", description: "Born Porbandar 1869; Sabarmati Ashram 1917; Kheda satyagraha 1918; Bardoli satyagraha 1928; Dandi March 1930." },
      { code: "gj.history.patel", name: "Sardar Vallabhbhai Patel", description: "Born Nadiad; Bardoli leader; integration of 562 princely states; Statue of Unity, Kevadia." },
      { code: "gj.history.statehood", name: "Statehood of Gujarat", description: "Mahagujarat Movement under Indulal Yagnik; bifurcation of Bombay state on 1 May 1960." },
      { code: "gs.geog.world", name: "World geography", description: "Continents, oceans, climatic zones, world physical features." },
      { code: "gs.geog.india", name: "Indian geography", description: "Himalayas, peninsular plateau, rivers, monsoon, agriculture." },
      { code: "gj.geog.location", name: "Location and physiography of Gujarat", description: "Westernmost state; longest coastline (~1600 km) in India; Saurashtra peninsula and Kachchh." },
      { code: "gj.geog.kachchh", name: "Rann of Kachchh", description: "Great Rann (salt marsh, Indo-Pak border) and Little Rann; Wild Ass Sanctuary; flamingo nesting." },
      { code: "gj.geog.rivers", name: "Rivers of Gujarat", description: "Sabarmati, Mahi, Narmada, Tapi, Banas; Sardar Sarovar dam on Narmada." },
      { code: "gj.geog.parks", name: "Wildlife and protected areas", description: "Gir NP (Asiatic lions, only home), Marine NP Gulf of Kachchh, Velavadar (blackbuck), Nal Sarovar." },
      { code: "gj.geog.minerals", name: "Mineral and energy resources", description: "Lignite (Kutch), bauxite, oil and gas (Bombay High, Ankleshwar); largest salt producer." },
      { code: "gs.science.physics", name: "Physics in everyday life", description: "Force, motion, electricity, light, sound." },
      { code: "gs.science.chemistry", name: "Chemistry basics", description: "Periodic table, acids/bases, polymers, fertilizers." },
      { code: "gs.science.biology", name: "Biology and human body", description: "Cells, organ systems, nutrition, diseases." },
      { code: "gs.science.tech", name: "Science and technology", description: "ISRO, AI, biotechnology, IT — recent advances and applications." },
      { code: "gs.env.ecology", name: "Environment and ecology", description: "Ecosystems, biodiversity, conservation, environmental laws." },
      { code: "gs.env.climate", name: "Climate change", description: "UNFCCC, Paris Agreement, IPCC, India's NDCs and Net Zero by 2070." },
    ],
  },

  // ── GENERAL STUDIES PAPER 2 ────────────────────────────────────────────
  {
    code: "GS_PAPER2",
    name: "General Studies (Paper II)",
    weight: 1,
    topics: [
      { code: "gs.polity.constitution", name: "Indian Constitution", description: "Preamble, Fundamental Rights, DPSPs, basic structure, amendments." },
      { code: "gs.polity.union", name: "Union Government", description: "President, PM, Parliament, Supreme Court." },
      { code: "gs.polity.state", name: "State Government and Panchayati Raj", description: "Governor, CM, State Legislature, 73rd-74th amendments." },
      { code: "gs.polity.bodies", name: "Constitutional and statutory bodies", description: "ECI, UPSC, CAG, Finance Commission, NHRC, Lokpal." },
      { code: "gj.polity.assembly", name: "Gujarat Legislative Assembly", description: "182-seat unicameral assembly; CM, Council of Ministers; Gujarat HC at Ahmedabad." },
      { code: "gj.polity.gpsc", name: "Gujarat Public Service Commission", description: "Composition, role under Article 315 in state recruitment." },
      { code: "gs.eco.basics", name: "Indian economy basics", description: "GDP, inflation, banking, RBI, GST, Union Budget, NITI Aayog." },
      { code: "gs.eco.development", name: "Economic and social development", description: "Sustainable development, poverty, inclusion, demographics." },
      { code: "gj.eco.economy", name: "Gujarat economy overview", description: "Largest manufacturing GSDP among states; high industrial growth; Vibrant Gujarat summits." },
      { code: "gj.eco.industries", name: "Industrial hubs of Gujarat", description: "Petrochemicals (Jamnagar — world's largest refinery complex), diamonds (Surat — 90% world cutting), textiles, pharma." },
      { code: "gj.eco.gift_city", name: "GIFT City and IFSC", description: "Gujarat International Finance Tec-City at Gandhinagar; first IFSC in India regulated by IFSCA." },
      { code: "gj.eco.ports", name: "Ports and trade", description: "Mundra (largest private port), Kandla/Deendayal, Pipavav, Hazira, Sikka — 40+ minor ports." },
      { code: "gj.eco.dairy", name: "Dairy and Amul", description: "Anand Pattern, Tribhuvandas Patel and Verghese Kurien; GCMMF (Amul) — world's largest farmer cooperative." },
      { code: "gj.eco.schemes", name: "Gujarat state schemes", description: "Mukhyamantri Mahila Utkarsh Yojana, Suposhit Gujarat Mission, Vahli Dikri Yojana, NAMO Saraswati Yojana." },
      { code: "gs.env.coastal", name: "Coastal and marine ecology", description: "Mangroves, coral reefs in Gulf of Kachchh, ship-breaking at Alang (largest in world)." },
      { code: "gj.env.dholavira", name: "Heritage and tourism", description: "UNESCO sites — Champaner-Pavagadh, Rani-ki-Vav (Patan), Ahmedabad (first Heritage City of India), Dholavira." },
      { code: "gj.culture.dance", name: "Folk dances of Gujarat", description: "Garba, Dandiya Raas, Bhavai, Tippani, Padhar, Hudo — Navratri tradition." },
      { code: "gj.culture.fairs", name: "Fairs and festivals", description: "Navratri, Uttarayan (kite festival), Rann Utsav, Tarnetar fair, Madhavpur fair, Bhavnath Mela." },
      { code: "gj.culture.crafts", name: "Crafts and textiles", description: "Patola of Patan (double ikat, GI), Bandhani, Rogan art (Kutch), Kutch embroidery, Mata-ni-Pachedi." },
      { code: "gj.culture.literature", name: "Gujarati literature and personalities", description: "Narsinh Mehta (Adi Kavi), Premanand, Narmad, K.M. Munshi, Umashankar Joshi (Jnanpith)." },
      { code: "gs.ca.national", name: "National current affairs", description: "Government schemes, awards, sports, appointments — last 12-18 months." },
      { code: "gj.ca.state", name: "Gujarat current affairs", description: "State schemes, budget, sports, awards, recent appointments and policies." },
      { code: "gs.reasoning.logical", name: "Logical reasoning and mental ability", description: "Series, analogy, coding-decoding, syllogism, blood relations." },
      { code: "gs.reasoning.numeracy", name: "Basic numeracy", description: "Numbers, percentages, ratios — Class X level." },
      { code: "gs.reasoning.data", name: "Data interpretation", description: "Tables, bar/pie/line graphs — Class X level." },
    ],
  },
];

export async function seedGpscClass12Syllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "GJ_GPSC_CLASS12" } });
  if (!exam) {
    throw new Error("Run seedExams() first — GJ_GPSC_CLASS12 exam not found.");
  }
  console.log(`Seeding GPSC Class 1-2 syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < gpscClass12Syllabus.length; sIdx++) {
    const s = gpscClass12Syllabus[sIdx];
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
  seedGpscClass12Syllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
