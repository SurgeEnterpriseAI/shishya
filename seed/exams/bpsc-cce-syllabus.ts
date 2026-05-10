// BPSC CCE Prelims — Bihar Combined Competitive Examination.
// Single GS paper: 150 MCQs × 150 marks in 2 hours. 1/3 negative marking.
// Source: bpsc.bih.nic.in official notification, cross-verified with Adda247 / Testbook.
//
// Run after seedExams: npx tsx seed/exams/bpsc-cce-syllabus.ts

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

export const bpscCceSyllabus: SubjectSeed[] = [
  // ── GENERAL STUDIES ───────────────────────────────────────────────────
  {
    code: "GENERAL_STUDIES",
    name: "General Studies",
    weight: 1,
    topics: [
      { code: "gs.current_events", name: "Current Events of National & International Importance",
        subtopics: [
          { code: "gs.current_events.national", name: "National Current Affairs", description: "Government schemes, appointments, awards, summits — last 12 months." },
          { code: "gs.current_events.international", name: "International Current Affairs", description: "World summits, treaties, geopolitical events." },
          { code: "gs.current_events.sports", name: "Sports, Books & Awards", description: "Recent sports events, sportspersons, books, authors, national/international awards." },
        ],
      },
      { code: "gs.general_science", name: "General Science",
        subtopics: [
          { code: "gs.general_science.physics", name: "Physics in Daily Life", description: "Work, force, pressure, laws of gravitation, laws of motion, heat, light, sound, electricity." },
          { code: "gs.general_science.chemistry", name: "Atoms, Molecules & Everyday Chemistry", description: "Atomic structure, periodic table basics, acids/bases, common chemicals." },
          { code: "gs.general_science.biology", name: "Human & Plant Biology", description: "Cell structure, human anatomy, plant physiology, common diseases." },
          { code: "gs.general_science.tech", name: "Science & Technology in India", description: "ISRO, DRDO, biotechnology, IT advances, recent S&T missions." },
          { code: "gs.general_science.environment", name: "Environmental Science", description: "Ecology basics, biodiversity, pollution, climate change." },
        ],
      },
      { code: "gs.indian_history", name: "History of India",
        subtopics: [
          { code: "gs.indian_history.ancient", name: "Ancient India", description: "Indus Valley, Vedic, Mauryan, Gupta periods; emphasis on Magadha and Bihar." },
          { code: "gs.indian_history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas, Bhakti and Sufi movements." },
          { code: "gs.indian_history.modern", name: "Modern India", description: "British conquest, 1857 revolt, social-religious reforms." },
        ],
      },
      { code: "gs.indian_national_movement", name: "Indian National Movement",
        subtopics: [
          { code: "gs.inm.19th_century", name: "19th-Century Resurgence & Growth of Nationalism", description: "INC 1885, moderates vs extremists, partition of Bengal, Swadeshi." },
          { code: "gs.inm.gandhi_era", name: "Gandhian Era", description: "Non-cooperation, Civil Disobedience, Quit India movements." },
          { code: "gs.inm.nature", name: "Nature & Character of Movement", description: "Mass mobilisation, peasant/labour participation, ideological currents." },
          { code: "gs.inm.independence", name: "Achievement of Independence", description: "Cabinet Mission, partition, integration of princely states." },
        ],
      },
      { code: "gs.indian_geography", name: "Geography of India",
        subtopics: [
          { code: "gs.indian_geography.physical", name: "Physical Geography", description: "Physiography, drainage, climate, soils, vegetation." },
          { code: "gs.indian_geography.economic", name: "Economic Geography", description: "Agriculture, mineral resources, industries, transport." },
          { code: "gs.indian_geography.social", name: "Social Geography", description: "Population, urbanisation, migration, tribes." },
          { code: "gs.indian_geography.major_rivers", name: "Major River Systems & Districts", description: "Ganga, Brahmaputra, peninsular rivers; major districts of India." },
        ],
      },
      { code: "gs.indian_polity", name: "Indian Polity",
        subtopics: [
          { code: "gs.indian_polity.constitution", name: "Indian Political System & Constitution", description: "Preamble, fundamental rights, DPSPs, parliamentary system." },
          { code: "gs.indian_polity.panchayati_raj", name: "Panchayati Raj & Community Development", description: "73rd amendment, three-tier panchayat system, gram sabha role." },
          { code: "gs.indian_polity.planning", name: "Planning in India and Bihar", description: "Planning Commission, NITI Aayog, state planning boards." },
        ],
      },
      { code: "gs.indian_economy", name: "Indian Economy",
        subtopics: [
          { code: "gs.indian_economy.post_independence", name: "Post-Independence Indian Economy", description: "Five-Year Plans, public sector, mixed economy, LPG reforms 1991." },
          { code: "gs.indian_economy.indices", name: "Economic Indices & Reports", description: "GDP, inflation, HDI, World Bank/IMF reports, Economic Survey." },
          { code: "gs.indian_economy.banking", name: "Banking & Finance", description: "RBI, monetary policy, financial inclusion, recent reforms." },
        ],
      },
      { code: "gs.general_mental_ability", name: "General Mental Ability",
        subtopics: [
          { code: "gs.gma.logical_reasoning", name: "Logical Reasoning", description: "Statement-conclusion, syllogism, analogy, classification, series." },
          { code: "gs.gma.analytical", name: "Analytical Ability", description: "Data sufficiency, decision making, problem-solving scenarios." },
          { code: "gs.gma.numerical", name: "Numerical Reasoning", description: "Number system, percentages, ratio-proportion, average, basic algebra." },
          { code: "gs.gma.data_interp", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
        ],
      },
    ],
  },

  // ── BIHAR SPECIFIC ────────────────────────────────────────────────────
  {
    code: "BIHAR_SPECIFIC",
    name: "Bihar — Special Knowledge",
    weight: 1,
    topics: [
      { code: "bihar.ancient_history", name: "Ancient History of Bihar", description: "Magadha empire, Pataliputra (Patna), Nalanda and Vikramshila universities, Bimbisara, Ajatashatru, Chandragupta Maurya, Ashoka, Gupta links." },
      { code: "bihar.medieval_history", name: "Medieval History of Bihar", description: "Sher Shah Suri (Sasaram), Mughal-era Bihar, Patna as Azimabad." },
      { code: "bihar.1857_revolt", name: "1857 in Bihar", description: "Kunwar Singh of Jagdishpur, Veer Kunwar Singh's leadership, role of Bihar zamindars." },
      { code: "bihar.champaran", name: "Champaran Satyagraha", description: "1917 indigo planters issue, Gandhi's first satyagraha in India, Rajendra Prasad's role." },
      { code: "bihar.freedom_struggle", name: "Bihar's Role in Freedom Struggle", description: "Quit India 1942 in Bihar, Jayaprakash Narayan, Anugrah Narayan Sinha, Sri Krishna Sinha." },
      { code: "bihar.geography_physical", name: "Physical Geography of Bihar", description: "North Bihar plains, South Bihar plains, Chhotanagpur foothills; climate; soil types." },
      { code: "bihar.rivers", name: "Rivers of Bihar", description: "Ganga, Kosi (sorrow of Bihar), Gandak, Sone, Bagmati, Burhi Gandak, Falgu, Punpun." },
      { code: "bihar.administrative_geography", name: "Administrative Geography & Districts", description: "38 districts, 9 divisions; major cities — Patna, Gaya, Muzaffarpur, Bhagalpur, Darbhanga." },
      { code: "bihar.agriculture", name: "Bihar Agriculture", description: "Rice, wheat, maize, makhana (foxnut), litchi (Muzaffarpur), sugarcane; flood-prone agriculture." },
      { code: "bihar.economy", name: "Economy of Bihar", description: "GSDP, sectoral composition, low per-capita income, special category status demand, migration." },
      { code: "bihar.industries", name: "Industries of Bihar", description: "Sugar mills, leather, handloom, IT corridors at Patna; Barauni refinery; Bhagalpur silk." },
      { code: "bihar.tribes", name: "Tribes of Bihar", description: "Santhal, Oraon, Munda, Ho, Kharia (post-Jharkhand bifurcation, residual tribal groups in Bihar)." },
      { code: "bihar.art_culture", name: "Art & Culture of Bihar", description: "Madhubani painting, Manjusha art, Tikuli art, Chhath puja, Sonepur Mela, Mauryan art." },
      { code: "bihar.tourism", name: "Tourism & Heritage Sites", description: "Bodh Gaya, Nalanda ruins, Vaishali, Rajgir, Vikramshila, Pawapuri, Patna Sahib gurdwara." },
      { code: "bihar.personalities", name: "Famous Personalities of Bihar", description: "Rajendra Prasad, JP Narayan, Ram Manohar Lohia, Karpoori Thakur, Kunwar Singh, Vidyapati." },
      { code: "bihar.polity", name: "Bihar Polity", description: "Governor, CM, Vidhan Sabha & Vidhan Parishad, Bihar Public Service Commission." },
      { code: "bihar.schemes", name: "Bihar-specific Schemes", description: "Mukhyamantri Kanya Utthan Yojana, Saat Nischay programme, Bihar Student Credit Card, Bal Hriday Yojana." },
      { code: "bihar.current_affairs", name: "Bihar Current Affairs", description: "Recent state policies, infrastructure (expressways, metro), elections, awards specific to Bihar." },
    ],
  },
];

export async function seedBpscCceSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "BR_BPSC_CCE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — BR_BPSC_CCE exam not found.");
  }
  console.log(`Seeding BPSC CCE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < bpscCceSyllabus.length; sIdx++) {
    const s = bpscCceSyllabus[sIdx];
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
  seedBpscCceSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
