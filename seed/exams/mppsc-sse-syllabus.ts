// MPPSC State Service Examination (SSE) Prelims — Madhya Pradesh PSC.
// Paper 1 (GS): 100 MCQs × 200 marks in 2 hours (counted for Mains qualification).
// Paper 2 (CSAT/General Aptitude Test): 100 MCQs × 200 marks in 2 hours (qualifying — 33%).
// 1/3 negative marking. Source: mppsc.mp.gov.in official notification, cross-verified with Careerpower / Drishti IAS.
//
// Run after seedExams: npx tsx seed/exams/mppsc-sse-syllabus.ts

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

export const mppscSseSyllabus: SubjectSeed[] = [
  // ── PAPER 1: GENERAL STUDIES ──────────────────────────────────────────
  {
    code: "GS_PAPER1",
    name: "General Studies Paper 1",
    weight: 1,
    topics: [
      { code: "gs.general_science_env", name: "General Science & Environment",
        subtopics: [
          { code: "gs.general_science_env.physics", name: "Physics", description: "Mechanics, heat, light, sound, electricity, magnetism, modern physics basics." },
          { code: "gs.general_science_env.chemistry", name: "Chemistry", description: "Atomic structure, periodic table, acids/bases, everyday chemistry." },
          { code: "gs.general_science_env.biology", name: "Biology", description: "Cell biology, human physiology, genetics, plant biology, diseases, nutrition." },
          { code: "gs.general_science_env.research_inst", name: "Indian Scientific Research Institutions", description: "ISRO, DRDO, CSIR, ICAR, IITs, AIIMS — locations and roles." },
          { code: "gs.general_science_env.satellite_space", name: "Satellite & Space Technology", description: "PSLV, GSLV, Chandrayaan, Mangalyaan, Gaganyaan, communication satellites." },
          { code: "gs.general_science_env.environment", name: "Environment & Biodiversity", description: "Ecosystems, food chains, biodiversity hotspots, IUCN red list." },
          { code: "gs.general_science_env.pollution", name: "Pollution, Disasters & Management", description: "Air/water/soil pollution, NGT, NDMA, disaster preparedness." },
          { code: "gs.general_science_env.health_policy", name: "Health Policy & Programmes", description: "National Health Mission, vaccination programmes, Ayushman Bharat." },
          { code: "gs.general_science_env.agritech", name: "Agricultural Technology & Food Processing", description: "Crop science, food preservation, dairy/meat processing, MP relevance." },
        ],
      },
      { code: "gs.current_events", name: "Current Events of National & International Importance",
        subtopics: [
          { code: "gs.current_events.national", name: "National Current Affairs", description: "Govt schemes, appointments, summits, awards — last 12 months." },
          { code: "gs.current_events.international", name: "International Current Affairs", description: "World summits, treaties, geopolitical events, world bodies." },
          { code: "gs.current_events.sports", name: "Sports Institutes, Competitions & Awards (India & MP)", description: "SAI, NIS Patiala, Khel Ratna, Arjuna, MP State sports awards, MP sportspersons." },
          { code: "gs.current_events.personalities", name: "Important Personalities & Places", description: "Recent national/international personalities, places in news." },
        ],
      },
      { code: "gs.indian_history", name: "History of India",
        subtopics: [
          { code: "gs.indian_history.ancient", name: "Ancient India", description: "Indus Valley, Vedic age, Mauryan, Gupta period, ancient features and systems." },
          { code: "gs.indian_history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughals, Marathas, Bhakti and Sufi movements." },
          { code: "gs.indian_history.reform_movements", name: "19th-20th Century Social & Religious Reform Movements", description: "Brahmo Samaj, Arya Samaj, Aligarh, Singh Sabha, women's reform." },
          { code: "gs.indian_history.freedom_movement", name: "Independence Struggle & National Movement", description: "INC, Gandhian movements, revolutionary activities, Quit India." },
          { code: "gs.indian_history.post_independence", name: "Post-Independence Integration & Reorganisation", description: "Princely states integration, States Reorganisation Act 1956, formation of MP." },
        ],
      },
      { code: "gs.indian_polity", name: "Polity of India",
        subtopics: [
          { code: "gs.indian_polity.gov_acts", name: "Government of India Act 1919 & 1935", description: "Diarchy, provincial autonomy, federal scheme proposals." },
          { code: "gs.indian_polity.constituent_assembly", name: "Constituent Assembly", description: "Drafting committee, Ambedkar, debates, adoption of Constitution." },
          { code: "gs.indian_polity.union_executive", name: "Union Executive — President & Parliament", description: "President, Vice-President, PM, Lok Sabha, Rajya Sabha." },
          { code: "gs.indian_polity.fr_fd_dpsp", name: "Fundamental Rights, Duties & DPSPs", description: "Articles 14-32, Article 51A, Articles 36-51, recent SC interpretations." },
          { code: "gs.indian_polity.amendments", name: "Constitutional Amendments", description: "Major amendments — 42nd, 44th, 73rd, 74th, 86th, 101st (GST)." },
          { code: "gs.indian_polity.judiciary", name: "Supreme Court & Judicial System", description: "SC, HCs, judicial review, PIL, basic structure doctrine." },
          { code: "gs.indian_polity.const_bodies", name: "Constitutional & Statutory Bodies", description: "ECI, UPSC, MPPSC, CAG, NITI Aayog, NHRC, State Election Commission." },
        ],
      },
      { code: "gs.indian_economy", name: "Economy of India",
        subtopics: [
          { code: "gs.indian_economy.basics", name: "Indian Economy — Structure", description: "GDP, sectors, planning history, NITI Aayog, Five-Year Plans." },
          { code: "gs.indian_economy.industry_trade", name: "Industrial Development & Foreign Trade", description: "Industrial policy, MSME, FDI, BoP, import-export, FTAs." },
          { code: "gs.indian_economy.banking", name: "Financial Institutions", description: "RBI, nationalised banks, SEBI, NSE, BSE, recent banking reforms." },
          { code: "gs.indian_economy.nbfi", name: "Non-Banking Financial Institutions", description: "NBFCs, mutual funds, insurance sector, IRDAI." },
        ],
      },
      { code: "gs.indian_geography", name: "Geography of India",
        subtopics: [
          { code: "gs.indian_geography.physical", name: "Physical Features & Natural Regions", description: "Himalayas, plains, plateau, coasts, islands, drainage system." },
          { code: "gs.indian_geography.forest_minerals", name: "Forest & Mineral Resources", description: "Forest types, distribution; coal, iron, bauxite, copper belts." },
          { code: "gs.indian_geography.water", name: "Water Resources & Wildlife", description: "River systems, dams, irrigation projects, wildlife distribution." },
          { code: "gs.indian_geography.parks", name: "National Parks & Sanctuaries", description: "Major NPs, tiger reserves, biosphere reserves, Ramsar sites." },
          { code: "gs.indian_geography.demographics", name: "Population Demographics", description: "Census data, growth rate, age, sex ratio, literacy." },
          { code: "gs.indian_geography.industry_transport", name: "Industrial & Transport Infrastructure", description: "Industrial regions, railways, roads, ports, airports, golden quadrilateral." },
          { code: "gs.indian_geography.energy", name: "Energy Resources", description: "Conventional (coal, oil, gas, hydro, nuclear) and non-conventional (solar, wind, biomass)." },
        ],
      },
      { code: "gs.ict", name: "Information & Communication Technology",
        subtopics: [
          { code: "gs.ict.electronics", name: "Electronics & ICT", description: "Computer basics, hardware/software, networking, internet." },
          { code: "gs.ict.emerging_tech", name: "Robotics, AI & Cyber Security", description: "AI/ML basics, robotics, cyber threats, IT Act provisions." },
          { code: "gs.ict.egov", name: "E-Governance", description: "DigiLocker, UMANG, Digital India, MP MPOnline, e-District." },
          { code: "gs.ict.internet_social", name: "Internet & Social Networking", description: "Web technologies, social media platforms, digital footprint." },
          { code: "gs.ict.ecommerce", name: "E-Commerce", description: "Models (B2B, B2C, C2C), payment gateways, UPI, ONDC." },
        ],
      },
    ],
  },

  // ── MADHYA PRADESH SPECIFIC ───────────────────────────────────────────
  {
    code: "MP_SPECIFIC",
    name: "Madhya Pradesh — Special Knowledge",
    weight: 1,
    topics: [
      { code: "mp.history", name: "History of Madhya Pradesh", description: "Mauryan/Gupta links, Avanti, Ujjain, Bundelkhand kingdoms, Malwa Sultanate, Gond kingdoms (Garha-Mandla, Deogarh)." },
      { code: "mp.medieval_history", name: "Medieval & Maratha-era MP", description: "Mughal Malwa, Holkars (Indore), Scindias (Gwalior), Bhonsles, Peshwa influence." },
      { code: "mp.freedom_movement", name: "MP's Contribution to Freedom Movement", description: "Tatya Tope, Rani Lakshmibai (Jhansi-Gwalior), Tantya Bhil, Chandrashekhar Azad, Shankar Shah-Raghunath Shah." },
      { code: "mp.dynasties", name: "Major Events & Dynasties of MP", description: "Paramaras (Dhar), Chandelas (Khajuraho), Kalachuris, Bagheli rulers, formation of MP 1956 and 2000 split (Chhattisgarh)." },
      { code: "mp.arts_sculpture", name: "Arts & Sculpture of MP", description: "Khajuraho temples, Bhimbetka rock paintings, Sanchi stupa, Bagh caves, Gwalior fort sculpture." },
      { code: "mp.tribes", name: "Tribes of Madhya Pradesh", description: "Bhil, Gond, Baiga, Korku, Sahariya, Bharia — distribution, customs, PVTGs." },
      { code: "mp.dialects", name: "Dialects of MP", description: "Bundeli, Bagheli, Malvi, Nimadi, Chhattisgarhi (historical), Gondi tribal language." },
      { code: "mp.festivals_folk", name: "Festivals, Folk Music & Literature", description: "Lokrang, Tansen Samaroh, Khajuraho Dance Festival; folk forms — Maanch, Gangaur, Pandwani; literature." },
      { code: "mp.tribal_personalities", name: "Important Tribal Personalities", description: "Birsa Munda links, Tantya Bhil, Shankar Shah, Raghunath Shah, Bhima Naik." },
      { code: "mp.geography_physical", name: "Physical Geography of MP", description: "Malwa plateau, Bundelkhand, Vindhyan range, Satpura range, Chambal ravines; major peaks (Dhupgarh)." },
      { code: "mp.rivers", name: "Rivers of MP", description: "Narmada (lifeline), Tapi, Chambal, Betwa, Ken, Sone, Mahanadi origin, Godavari tributaries." },
      { code: "mp.forests_wildlife", name: "MP Forests & Wildlife", description: "MP has India's largest forest cover; tiger reserves — Kanha, Bandhavgarh, Pench, Panna, Satpura; Ratapani." },
      { code: "mp.climate_minerals", name: "MP Climate & Mineral Resources", description: "Tropical climate, monsoon patterns; diamond (Panna), coal (Singrauli), bauxite, manganese, limestone." },
      { code: "mp.transport", name: "MP Transport Systems", description: "Major highways, railways, airports (Bhopal, Indore, Jabalpur, Gwalior), Bhopal-Indore metros." },
      { code: "mp.irrigation_power", name: "Irrigation & Power Projects of MP", description: "Sardar Sarovar (Narmada), Indira Sagar, Bargi, Rani Avantibai Lodhi Sagar; thermal/hydel/solar projects." },
      { code: "mp.agriculture", name: "MP Agriculture & Animal Husbandry", description: "Soybean (largest producer), wheat, gram, paddy; Malwa wheat, mustard; livestock and dairy." },
      { code: "mp.polity", name: "Polity of MP", description: "Governor, CM, Vidhan Sabha (230 seats), MPPSC, State Election Commission, Lokayukta." },
      { code: "mp.economy", name: "Economy of Madhya Pradesh", description: "GSDP, sectoral composition, agriculture-led economy, industrial corridors (Pithampur, Mandideep, Malanpur)." },
      { code: "mp.schemes", name: "MP-specific Schemes", description: "Ladli Behna Yojana, Ladli Laxmi Yojana, Mukhyamantri Jan Kalyan, Mukhyamantri Tirth Darshan, Sambal Yojana." },
      { code: "mp.tourism", name: "MP Tourism & Heritage Sites", description: "Khajuraho, Sanchi, Bhimbetka, Mandu, Orchha, Ujjain (Mahakal), Omkareshwar, Gwalior fort, Pachmarhi." },
      { code: "mp.personalities", name: "Famous Personalities of MP", description: "Tansen, Raja Bhoj, Rani Durgavati, Atal Bihari Vajpayee, Shankar Dayal Sharma, Kumar Gandharva, Lata Mangeshkar (Indore-born)." },
      { code: "mp.current_affairs", name: "MP Current Affairs", description: "Recent state policies, Global Investors Summit, Simhastha Kumbh (Ujjain), elections, awards specific to MP." },
    ],
  },

  // ── PAPER 2: GENERAL APTITUDE TEST (CSAT — QUALIFYING) ────────────────
  {
    code: "CSAT",
    name: "General Aptitude Test (Paper 2)",
    weight: 1,
    topics: [
      { code: "csat.comprehension", name: "Comprehension", description: "English passage-based questions on main idea, vocabulary, inference." },
      { code: "csat.interpersonal", name: "Communication & Interpersonal Skills", description: "Communication, empathy, etiquette, conflict-resolution scenarios." },
      { code: "csat.logical_reasoning", name: "Logical Reasoning & Analytical Ability", description: "Syllogism, statement-conclusion, seating arrangement, blood relations, coding-decoding, pattern recognition." },
      { code: "csat.decision_making", name: "Decision Making & Problem Solving", description: "Administrative scenario judgement, evaluating options, practical solutions." },
      { code: "csat.mental_ability", name: "General Mental Ability", description: "Analogy, classification, series, direction sense, Venn diagrams, alphabet test." },
      { code: "csat.numeracy", name: "Basic Numeracy",
        subtopics: [
          { code: "csat.numeracy.arithmetic", name: "Arithmetic", description: "Number system, percentage, ratio-proportion, average, profit-loss, SI/CI." },
          { code: "csat.numeracy.algebra", name: "Algebra", description: "Linear and quadratic equations, polynomials, identities." },
          { code: "csat.numeracy.geometry", name: "Geometry & Mensuration", description: "Triangles, circles, area/volume of standard shapes." },
          { code: "csat.numeracy.tsd_work", name: "Time, Speed, Work", description: "Time-distance, time-work, pipes-cisterns, trains, boats." },
        ],
      },
      { code: "csat.data_interp", name: "Data Interpretation", description: "Tables, bar/pie/line graphs, statistical information — calculation-based questions." },
      { code: "csat.hindi_comprehension", name: "Hindi Language Comprehension (Class X level)", description: "हिन्दी अपठित गद्यांश, व्याकरण, शब्द-ज्ञान, मुहावरे, अशुद्धि-शोधन।" },
    ],
  },
];

export async function seedMppscSseSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "MP_MPPSC_SSE" } });
  if (!exam) {
    throw new Error("Run seedExams() first — MP_MPPSC_SSE exam not found.");
  }
  console.log(`Seeding MPPSC SSE syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < mppscSseSyllabus.length; sIdx++) {
    const s = mppscSseSyllabus[sIdx];
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
  seedMppscSseSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
