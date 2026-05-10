// UPPSC PCS Prelims — full syllabus tree.
// Paper 1 (GS): 150 MCQs × 200 marks in 2 hours (counted for Mains qualification).
// Paper 2 (CSAT): 100 MCQs × 200 marks in 2 hours (qualifying — 33% required).
// Source: uppsc.up.nic.in official notification, cross-verified with Adda247 / StudyIQ.
//
// Run after seedExams: npx tsx seed/exams/uppsc-pcs-syllabus.ts

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

export const uppscPcsSyllabus: SubjectSeed[] = [
  // ── PAPER 1: GENERAL STUDIES ──────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies Paper 1",
    weight: 1,
    topics: [
      { code: "gs.current_events", name: "Current Events of National & International Importance", description: "Recent national/international news, awards, summits, sports, books — last 12-18 months." },
      { code: "gs.indian_history", name: "History of India",
        subtopics: [
          { code: "gs.indian_history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mahajanapadas, Mauryan, Gupta, Harsha, post-Gupta dynasties." },
          { code: "gs.indian_history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughal empire, Vijayanagara, Bahmani, Marathas, Bhakti and Sufi movements." },
          { code: "gs.indian_history.modern", name: "Modern India", description: "British conquest, 1857 revolt, social-religious reforms, freedom movement to 1947." },
        ],
      },
      { code: "gs.indian_national_movement", name: "Indian National Movement", description: "INC sessions, Gandhian movements, revolutionary activities, partition, integration of states." },
      { code: "gs.indian_geography", name: "Indian Geography",
        subtopics: [
          { code: "gs.indian_geography.physical", name: "Physical Geography of India", description: "Physiography, drainage system, climate, soils, vegetation, monsoons." },
          { code: "gs.indian_geography.economic", name: "Economic Geography", description: "Agriculture, mineral resources, industries, transport, trade." },
          { code: "gs.indian_geography.social", name: "Social Geography", description: "Population, urbanization, migration, tribes, demographic features." },
        ],
      },
      { code: "gs.world_geography", name: "World Geography", description: "Continents, oceans, climatic regions, major physical features, world economic resources." },
      { code: "gs.indian_polity", name: "Indian Polity & Governance",
        subtopics: [
          { code: "gs.indian_polity.constitution", name: "Constitution of India", description: "Preamble, schedules, fundamental rights/duties, DPSPs, amendment procedure." },
          { code: "gs.indian_polity.union_executive", name: "Union Executive", description: "President, Vice-President, PM, Council of Ministers, Cabinet Secretariat." },
          { code: "gs.indian_polity.parliament", name: "Parliament", description: "Lok Sabha, Rajya Sabha, parliamentary committees, legislative procedure." },
          { code: "gs.indian_polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, judicial review, PIL, tribunals." },
          { code: "gs.indian_polity.federal", name: "Federal Structure & State Govt", description: "Centre-state relations, governor, state legislature, Inter-State Council." },
          { code: "gs.indian_polity.local_govt", name: "Panchayati Raj & Local Bodies", description: "73rd & 74th amendments, three-tier panchayat, urban local bodies." },
          { code: "gs.indian_polity.const_bodies", name: "Constitutional & Statutory Bodies", description: "ECI, UPSC, CAG, Finance Commission, NHRC, NITI Aayog, CIC." },
        ],
      },
      { code: "gs.indian_economy", name: "Economic & Social Development",
        subtopics: [
          { code: "gs.indian_economy.basics", name: "Indian Economy — Basics", description: "GDP, GVA, sectors, planning history, Five-Year Plans, NITI Aayog." },
          { code: "gs.indian_economy.agriculture", name: "Agriculture", description: "Cropping patterns, MSP, PDS, food security, agricultural reforms." },
          { code: "gs.indian_economy.industry", name: "Industry & Services", description: "Industrial policy, MSME, services sector, FDI, Make in India." },
          { code: "gs.indian_economy.banking", name: "Banking & Finance", description: "RBI, monetary policy, banking reforms, capital markets, financial inclusion." },
          { code: "gs.indian_economy.budget", name: "Budget & Fiscal Policy", description: "Budget process, taxation, GST, fiscal deficit, FRBM Act." },
          { code: "gs.indian_economy.social_sector", name: "Social Sector & Inclusion", description: "Poverty, employment, health, education, demographic dividend, sustainable development." },
        ],
      },
      { code: "gs.environment", name: "Environment & Ecology",
        subtopics: [
          { code: "gs.environment.ecology", name: "Ecology & Biodiversity", description: "Ecosystems, food chains, biodiversity hotspots, IUCN red list, Indian wildlife." },
          { code: "gs.environment.climate_change", name: "Climate Change", description: "UNFCCC, Kyoto, Paris Agreement, IPCC, India's NDCs, mitigation/adaptation." },
          { code: "gs.environment.pollution", name: "Pollution & Conservation", description: "Air/water/soil pollution, NGT, conservation projects, EIA." },
          { code: "gs.environment.protected_areas", name: "Protected Areas", description: "National parks, sanctuaries, biosphere reserves, Ramsar sites of India and UP." },
        ],
      },
      { code: "gs.general_science", name: "General Science",
        subtopics: [
          { code: "gs.general_science.physics", name: "Physics", description: "Mechanics, heat, light, sound, electricity, magnetism, modern physics basics." },
          { code: "gs.general_science.chemistry", name: "Chemistry", description: "Atomic structure, periodic table, acids-bases, everyday chemistry." },
          { code: "gs.general_science.biology", name: "Biology", description: "Cell biology, human physiology, genetics, plant biology, diseases." },
          { code: "gs.general_science.tech", name: "Science & Technology", description: "ISRO missions, defence tech, IT, biotechnology, nanotech, AI basics." },
        ],
      },
    ],
  },

  // ── UTTAR PRADESH SPECIFIC ────────────────────────────────────────────
  {
    code: "UP_SPECIFIC",
    name: "Uttar Pradesh — Special Knowledge",
    weight: 1,
    topics: [
      { code: "up.history", name: "History of Uttar Pradesh", description: "Kosala, Magadha-era influence, Awadh, Mughal heritage in UP, 1857 revolt centres (Meerut, Lucknow, Kanpur, Jhansi)." },
      { code: "up.freedom_struggle", name: "UP in Freedom Struggle", description: "Chauri Chaura, Kakori conspiracy, Lucknow Pact, role of UP leaders (Nehru, Patel ties, Rani Lakshmibai)." },
      { code: "up.geography", name: "Geography of Uttar Pradesh", description: "Bhabar, Tarai, Ganga plain, Bundelkhand plateau, Vindhyan region; rivers Ganga, Yamuna, Ghaghara, Gomti, Betwa, Ken." },
      { code: "up.climate_soil", name: "UP Climate, Soil & Agriculture", description: "Agro-climatic zones, alluvial soils, sugarcane, wheat, rice, pulses; major irrigation projects (Sarda Sahayak, Ramganga)." },
      { code: "up.demographics", name: "UP Demographics", description: "Population distribution, district-wise density, urbanization, SC/ST/OBC composition, languages." },
      { code: "up.administration", name: "UP Administration", description: "Governor, CM, state legislature (Vidhan Sabha & Vidhan Parishad), divisions, districts, blocks, panchayats." },
      { code: "up.economy", name: "UP Economy", description: "GSDP composition, agriculture share, sugar industry, leather (Kanpur), handloom, ODOP scheme." },
      { code: "up.industries", name: "UP Industries", description: "Sugar mills, brassware (Moradabad), glass (Firozabad), carpet (Bhadohi), chikankari (Lucknow), Noida-Greater Noida IT/auto." },
      { code: "up.schemes", name: "UP-specific Schemes", description: "Mukhyamantri Awas Yojana, Kanya Sumangala, Yuva Swarozgar, ODOP, UP Investors Summit, e-Sangini." },
      { code: "up.culture", name: "UP Art & Culture", description: "Kathak (Lucknow gharana), thumri, dadra, Ramnami, Ramleela, Ayodhya/Mathura/Varanasi/Sarnath heritage." },
      { code: "up.tourism", name: "UP Tourism & Heritage Sites", description: "Taj Mahal (Agra), Fatehpur Sikri, Varanasi ghats, Ayodhya, Sarnath, Kushinagar, Vrindavan, Jhansi fort." },
      { code: "up.personalities", name: "UP Famous Personalities", description: "Tulsidas, Kabir, Premchand, Mahadevi Verma, Atal Bihari Vajpayee, Indira Gandhi, Lakshmibai, Mayawati, Yogi Adityanath." },
      { code: "up.current_affairs", name: "UP Current Affairs", description: "Recent state schemes, infrastructure (Purvanchal/Bundelkhand expressways), Kumbh Mela, defence corridor, awards." },
    ],
  },

  // ── PAPER 2: CSAT (QUALIFYING) ────────────────────────────────────────
  {
    code: "CSAT",
    name: "Civil Services Aptitude Test (Paper 2)",
    weight: 1,
    topics: [
      { code: "csat.comprehension", name: "Comprehension", description: "English and Hindi passage-based questions on main idea, vocabulary, inference." },
      { code: "csat.interpersonal", name: "Interpersonal Skills incl. Communication", description: "Communication, empathy, conflict-resolution scenario questions." },
      { code: "csat.logical_reasoning", name: "Logical Reasoning & Analytical Ability", description: "Syllogism, statement-conclusion, seating arrangement, blood relations, coding-decoding." },
      { code: "csat.decision_making", name: "Decision Making & Problem Solving", description: "Administrative scenario judgement; non-negative-marked in past UPPSC papers." },
      { code: "csat.mental_ability", name: "General Mental Ability", description: "Analogy, classification, series, direction sense, Venn diagrams, alphabet test." },
      { code: "csat.numeracy", name: "Basic Numeracy (Class X level)",
        subtopics: [
          { code: "csat.numeracy.arithmetic", name: "Arithmetic", description: "Number system, percentage, ratio-proportion, average, profit-loss, SI/CI." },
          { code: "csat.numeracy.algebra", name: "Algebra", description: "Linear and quadratic equations, polynomials, identities." },
          { code: "csat.numeracy.geometry", name: "Geometry & Mensuration", description: "Triangles, circles, area/volume of standard shapes." },
          { code: "csat.numeracy.tsd_work", name: "Time, Speed, Work", description: "Time-distance, time-work, pipes-cisterns, trains, boats." },
        ],
      },
      { code: "csat.data_interp", name: "Data Interpretation (Class X level)", description: "Tables, bar/pie/line graphs — calculation-based questions." },
      { code: "csat.general_english", name: "General English (Class X level)", description: "Grammar, fill-in-the-blanks, error spotting, synonyms/antonyms, sentence improvement." },
      { code: "csat.general_hindi", name: "General Hindi (Class X level)", description: "संधि, समास, विलोम, पर्यायवाची, मुहावरे, लोकोक्तियाँ, अशुद्धि-शोधन, अपठित गद्यांश।" },
    ],
  },
];

export async function seedUppscPcsSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UP_UPPSC_PCS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UP_UPPSC_PCS exam not found.");
  }
  console.log(`Seeding UPPSC PCS syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < uppscPcsSyllabus.length; sIdx++) {
    const s = uppscPcsSyllabus[sIdx];
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
  seedUppscPcsSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
