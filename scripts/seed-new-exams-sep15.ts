// scripts/seed-new-exams-sep15.ts
//
// Two exams students searched for and did not find (search misses, 11–12 Sep
// 2026):
//   • MP_RAEO — "mpreao", "reao", "mpre": MPESB's Group-2 Sub Group-1 Krishi
//     Vistar Adhikari (Agriculture Extension Officer, formerly Rural
//     Agriculture Extension Officer) Recruitment Test 2026, online from
//     17 Sep 2026.
//   • KA_KSRP — "ksrp": Karnataka Special Reserve Police Constable, written
//     test 20 Sep 2026.
// Every fact comes from the conducting bodies' own documents, read on 15 Sep
// 2026 (esb.mp.gov.in rule book + corrigenda; KEA / KSP notifications). Where
// the official text is silent — KSRP's topic list, the per-subject question
// split of either paper — the description says so instead of guessing.
//
// Additive and idempotent: upserts the exam, subjects (examId+code), topics
// (subjectId+code) and eligibility; inserts only dates missing by
// (label, day). Never deletes — unlike seed-ts-police-si.ts, whose
// subject.deleteMany cascades into questions. Exams are created INACTIVE:
// activate them once the verified bank and the full-length paper exist.
//
// Dry run by default; --apply writes.
//   npx dotenv-cli -e .env.local -- npx tsx scripts/seed-new-exams-sep15.ts [--apply] [--only MP_RAEO]

import { PrismaClient, type Language, type Prisma } from "@prisma/client";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const onlyIdx = process.argv.indexOf("--only");
const ONLY = onlyIdx >= 0 ? new Set(process.argv[onlyIdx + 1].split(",")) : null;
const PROVENANCE = "official-research:2026-09-15";

interface TopicSpec {
  code: string;
  name: string;
  description: string;
}
interface SubjectSpec {
  code: string;
  name: string;
  weight: number;
  topics: TopicSpec[];
}
interface DateSpec {
  label: string;
  date: string;
  kind: string;
  url: string;
  isExamDay?: boolean;
}
interface ExamSpec {
  exam: {
    code: string;
    name: string;
    shortName: string;
    category: "STATE_LEVEL";
    state: string;
    description: string;
    durationMin: number;
    totalQuestions: number;
    totalMarks: number;
    marksPerQ: number;
    negativeMark: number;
    languages: Language[];
  };
  subjects: SubjectSpec[];
  eligibility: Omit<Prisma.ExamEligibilityUncheckedCreateInput, "examId" | "id">;
  dates: DateSpec[];
}

// ── MP RAEO ────────────────────────────────────────────────────────────
const MPESB_RULEBOOK = "https://esb.mp.gov.in/rulebooks/RB_2026/Group2_SG1_RuleBook_2026_02072026.pdf";
const MPESB_DATE_31JUL = "https://esb.mp.gov.in/rulebooks/RB_2026/Group2_SG1_2026_ExamDateExtended_Rulebookpage_1_28__31072026.pdf";

const MP_RAEO: ExamSpec = {
  exam: {
    code: "MP_RAEO",
    name: "MP RAEO — Krishi Vistar Adhikari (Agriculture Extension Officer) Recruitment Test (MPESB)",
    shortName: "MP RAEO",
    category: "STATE_LEVEL",
    state: "MP",
    description:
      "MPESB's Group-2 Sub Group-1 Krishi Vistar Adhikari (Agriculture Extension Officer, earlier Rural Agriculture Extension Officer / RAEO) Recruitment Test 2026 for the Directorate of Farmer Welfare and Agriculture Development, Madhya Pradesh — 2,377 posts (revised rule-book page 16, 27 July 2026). One online test in Hindi and English from 17 September 2026, in two shifts (09:00–12:00 and 14:30–17:30): 200 marks in 3 hours, 1 mark per question, 0.25 deducted for each wrong answer. Part A (100 marks): general knowledge, general Hindi, general English, general mathematics, general logical ability, general science and general computer knowledge — the rule book lists these subjects without topics or a per-subject split. Part B (100 marks): agriculture — general agriculture, agronomy, soil science, soil and water conservation, plant physiology, crop improvement, horticulture, plant protection, agricultural economics and agricultural extension education. Qualifying marks: 50% (40% for SC, ST, OBC, PwD and EWS). Eligibility: a bachelor's degree in agriculture or horticulture; age 18–40 on 1 January 2026 (45 for MP-domicile SC/ST/OBC, women, PwD and government employees; no relaxation for EWS); live registration with an MP employment office.",
    durationMin: 180,
    totalQuestions: 200,
    totalMarks: 200,
    marksPerQ: 1,
    negativeMark: 0.25,
    languages: ["HI", "EN"],
  },
  subjects: [
    {
      code: "GK",
      name: "General Knowledge (India & Madhya Pradesh)",
      weight: 0.07,
      topics: [
        { code: "gk.india", name: "Indian General Knowledge", description: "Indian history, polity, geography, economy, awards, sports and national current affairs at graduate-level general-knowledge depth." },
        { code: "gk.mp", name: "Madhya Pradesh General Knowledge", description: "Madhya Pradesh history, geography (rivers, districts, soils, forests, minerals), culture, tribes, festivals, economy, agriculture and state government schemes." },
      ],
    },
    {
      code: "HINDI",
      name: "General Hindi (सामान्य हिन्दी)",
      weight: 0.075,
      topics: [
        { code: "hindi.grammar", name: "हिन्दी व्याकरण (Hindi Grammar)", description: "Questions written in Hindi: संधि, समास, कारक, वचन, लिंग, काल, वाक्य शुद्धि, उपसर्ग-प्रत्यय." },
        { code: "hindi.vocabulary", name: "शब्द भंडार (Hindi Vocabulary)", description: "Questions written in Hindi: पर्यायवाची, विलोम, अनेक शब्दों के लिए एक शब्द, मुहावरे और लोकोक्तियाँ, तत्सम-तद्भव." },
        { code: "hindi.literature", name: "हिन्दी साहित्य (Hindi Literature)", description: "Questions written in Hindi: प्रमुख कवि-लेखक और उनकी रचनाएँ, हिन्दी साहित्य के काल, विधाएँ." },
      ],
    },
    {
      code: "ENGLISH",
      name: "General English",
      weight: 0.075,
      topics: [
        { code: "eng.grammar", name: "English Grammar", description: "Tenses, articles, prepositions, subject-verb agreement, voice, narration, sentence correction." },
        { code: "eng.vocabulary", name: "English Vocabulary", description: "Synonyms, antonyms, one-word substitution, idioms and phrases, spelling." },
        { code: "eng.literature", name: "English Literature & Comprehension", description: "Well-known English writers and works, literary terms, short comprehension passages." },
      ],
    },
    {
      code: "MATH",
      name: "General Mathematics",
      weight: 0.07,
      topics: [
        { code: "math.arithmetic", name: "Arithmetic", description: "Percentage, ratio and proportion, profit and loss, simple and compound interest, time and work, speed and distance, averages." },
        { code: "math.algebra_geometry", name: "Algebra, Geometry & Trigonometry", description: "Linear and quadratic equations, identities, basic geometry, mensuration, trigonometric ratios, elementary calculus ideas." },
        { code: "math.statistics", name: "Statistics & Data Interpretation", description: "Mean, median, mode, standard deviation, probability basics, tables and charts." },
      ],
    },
    {
      code: "REASONING",
      name: "General Logical Ability",
      weight: 0.07,
      topics: [
        { code: "reason.verbal", name: "Series, Analogy, Coding & Blood Relations", description: "Number and letter series, analogies, classification, coding-decoding, blood relations." },
        { code: "reason.analytical", name: "Direction, Ranking, Syllogism & Statements", description: "Direction sense, ranking and ordering, seating arrangement, syllogisms, statement-conclusion." },
        { code: "reason.nonverbal", name: "Non-verbal Reasoning", description: "Figure series, mirror and water images, paper folding, embedded figures, counting figures." },
      ],
    },
    {
      code: "SCIENCE",
      name: "General Science",
      weight: 0.07,
      topics: [
        { code: "sci.physics", name: "Physics", description: "Motion, force, work and energy, light, sound, electricity, magnetism — everyday applications." },
        { code: "sci.chemistry", name: "Chemistry", description: "Matter, atoms and molecules, acids, bases and salts, metals and non-metals, chemical reactions, chemistry in agriculture." },
        { code: "sci.biology", name: "Biology", description: "Cell, plant and animal systems, nutrition, human health and disease, genetics basics, ecology." },
      ],
    },
    {
      code: "COMPUTER",
      name: "General Computer Knowledge",
      weight: 0.07,
      topics: [
        { code: "comp.fundamentals", name: "Computer Fundamentals", description: "Hardware, software, memory, input/output devices, operating systems, number systems." },
        { code: "comp.office_internet", name: "MS Office, Internet & Cyber Security", description: "Word, Excel, PowerPoint, e-mail, internet and networking terms, shortcuts, cyber security basics." },
      ],
    },
    {
      code: "AGRI_GEN",
      name: "General Agriculture",
      weight: 0.05,
      topics: [
        { code: "agri.importance", name: "Agriculture in the National Economy", description: "Agriculture and its importance in the national economy: share in GDP and employment, food security, agricultural statistics, national agriculture schemes and institutions." },
      ],
    },
    {
      code: "AGRONOMY",
      name: "Agronomy",
      weight: 0.05,
      topics: [
        { code: "agron.crops_mp", name: "Major Crops of MP & Their Agro-techniques", description: "Soybean, wheat, gram, maize, paddy, mustard, cotton and other major field crops of Madhya Pradesh: seasons, varieties, sowing, seed rate, fertiliser, irrigation, harvest." },
        { code: "agron.farming_systems", name: "Farming Systems & Sustainable Agriculture", description: "Cropping and farming systems, intercropping, crop rotation, organic and natural farming, conservation agriculture." },
        { code: "agron.agromet", name: "Agro-meteorology & Agro-climatic Zones", description: "Introductory agro-meteorology, weather and crops, agro-climatic and agro-ecological zones of India and MP." },
      ],
    },
    {
      code: "SOIL",
      name: "Soil Science",
      weight: 0.05,
      topics: [
        { code: "soil.properties", name: "Soil Composition & Properties", description: "Soil and its composition, its role in crop production; physical, chemical and biological properties of soil." },
        { code: "soil.nutrients", name: "Essential Plant Nutrients", description: "Essential plant nutrients, their functions, deficiency symptoms and dynamics in soil." },
        { code: "soil.inm_problem", name: "Integrated Nutrient Management & Problem Soils", description: "Integrated nutrient management, fertilisers and manures, acid, saline and sodic soils and their management." },
      ],
    },
    {
      code: "SWC",
      name: "Soil & Water Conservation, Watershed Management",
      weight: 0.05,
      topics: [
        { code: "swc.conservation", name: "Soil & Water Conservation", description: "Soil erosion types and control, conservation practices, water harvesting, irrigation efficiency." },
        { code: "swc.watershed", name: "Watershed Management", description: "Watershed concept, planning and development, watershed programmes in India and MP." },
      ],
    },
    {
      code: "PHYSIOLOGY",
      name: "Plant Physiology",
      weight: 0.05,
      topics: [
        { code: "physio.nutrients", name: "Absorption, Translocation & Metabolism of Nutrients", description: "Water and nutrient absorption, translocation and metabolism of nutrients in plants." },
        { code: "physio.photosynthesis", name: "Photosynthesis & Respiration", description: "Light and dark reactions, C3/C4/CAM plants, respiration, photorespiration." },
        { code: "physio.growth", name: "Growth, Development & Growth Regulators", description: "Plant growth and development, flowering, dormancy, auxins, gibberellins, cytokinins, ethylene, ABA." },
      ],
    },
    {
      code: "CROP_IMP",
      name: "Crop Improvement",
      weight: 0.05,
      topics: [
        { code: "cropimp.genetics_breeding", name: "Genetics & Plant Breeding", description: "Elements of genetics (Mendel's laws, linkage, mutation) and plant breeding methods applied to crop improvement: selection, hybridisation, heterosis, seed production." },
      ],
    },
    {
      code: "HORTICULTURE",
      name: "Horticulture",
      weight: 0.05,
      topics: [
        { code: "horti.package", name: "Package of Practices — Fruits, Vegetables, Spices, Flowers", description: "Package of practices of important fruits, vegetables, spices and economically important flowering plants." },
        { code: "horti.nursery", name: "Nursery Management & Propagation", description: "Nursery management and propagation methods of horticultural crops: seed, cutting, layering, grafting, budding." },
        { code: "horti.disorders", name: "Unfruitfulness, Fruit Drop & Physiological Disorders", description: "Unfruitfulness, alternate bearing, fruit drop and physiological disorders of horticultural crops and their management." },
        { code: "horti.postharvest", name: "Post-harvest Management & Value Addition", description: "Post-harvest handling, storage and value addition of fruits and vegetables." },
      ],
    },
    {
      code: "PLANT_PROTECTION",
      name: "Plant Protection",
      weight: 0.05,
      topics: [
        { code: "pp.pests_diseases", name: "Insect Pests & Diseases of Important Crops", description: "Important insect pests and diseases of major crops, their symptoms and management." },
        { code: "pp.ipm", name: "Integrated Pest & Disease Management", description: "Components of integrated pest and disease management: cultural, mechanical, biological and chemical control." },
        { code: "pp.equipment_safety", name: "Spray Equipment, Rodent Management & Safe Pesticide Use", description: "Spray equipment, their selection and maintenance; rodent management; safety precautions during pesticide use." },
      ],
    },
    {
      code: "AG_ECON",
      name: "Agricultural Economics",
      weight: 0.05,
      topics: [
        { code: "agecon.principles", name: "Principles of Agricultural Economics", description: "Meaning and principles of economics as applied to agriculture: demand, supply, production function, costs." },
        { code: "agecon.farm_planning", name: "Farm Planning & Resource Management", description: "Farm planning and resource management for optimal production; farming systems and their economic role." },
        { code: "agecon.marketing_prices", name: "Agricultural Marketing & Prices", description: "Marketing of agricultural produce, regulated markets in MP including initiatives like e-Choupal, prices of agricultural produce and their role in production." },
      ],
    },
    {
      code: "EXTENSION",
      name: "Agricultural Extension Education",
      weight: 0.05,
      topics: [
        { code: "ext.principles", name: "Philosophy & Principles of Extension", description: "Philosophy, objectives and principles of extension education." },
        { code: "ext.organisations", name: "Extension Organisations", description: "Extension organisations at state, district and block levels: structure, functions and responsibilities (ATMA, KVK, department)." },
        { code: "ext.communication_training", name: "Communication, Farmer Organisations & Training", description: "Methods of communication, the role of farmers' organisations in extension services, the role and importance of training." },
        { code: "ext.rural_programmes", name: "Rural Development Programmes in India", description: "Important rural development programmes in India and their objectives." },
      ],
    },
  ],
  eligibility: {
    minAge: 18,
    maxAge: 40,
    ageRelaxation:
      "Up to 45 for MP-domicile SC/ST/OBC, women, PwD, Home Guards and employees of MP government bodies; no age relaxation for EWS; contract employees by their contract service up to 55 (rule book rules 9.3–9.6, 16). Age counted on 1 January 2026.",
    educationTags: ["GRADUATE", "SPECIFIC_DEGREE"],
    educationNote: "Bachelor's degree in Agriculture or Horticulture, held on the application date.",
    domicileState: null,
    vacanciesApprox: 2377,
    vacanciesNote:
      "2026 test: 2,377 posts (UR 1,126, EWS 37, SC 316, ST 122, OBC 776) per the revised rule-book page 16 of 27 July 2026; the rule book as first published said 2,784.",
    skillProfile: { gk: 2, quant: 2, english: 2, reasoning: 2, technical: 5 },
    eligibilityNote:
      "Live registration with an MP employment office and Aadhaar are mandatory. Candidates from outside Madhya Pradesh may apply only for unreserved posts, without reservation or age relaxation.",
    officialUrl: "https://esb.mp.gov.in/",
    officialName: "Madhya Pradesh Employees Selection Board (MPESB), Bhopal",
    generatedBy: PROVENANCE,
  },
  dates: [
    { label: "Rule book published — Krishi Vistar Adhikari Recruitment Test 2026", date: "2026-07-02", kind: "NOTIFICATION", url: MPESB_RULEBOOK },
    { label: "Online application opens", date: "2026-07-03", kind: "APPLICATION_START", url: MPESB_RULEBOOK },
    { label: "Corrigendum: exam date changed to 5 August 2026 (later superseded)", date: "2026-07-16", kind: "NOTIFICATION", url: "https://esb.mp.gov.in/rulebooks/RB_2026/Group2_SG1_2026_Kisan_Revised_16072026.pdf" },
    { label: "Online application closes (corrections until 22 July 2026)", date: "2026-07-17", kind: "APPLICATION_END", url: MPESB_RULEBOOK },
    { label: "Corrigendum: posts revised to 2,377", date: "2026-07-27", kind: "NOTIFICATION", url: "https://esb.mp.gov.in/rulebooks/RB_2026/Group2_SG1_2026_RevisedRulebook_Page16_27072026.pdf" },
    { label: "Corrigendum: exam moved to 17 September 2026", date: "2026-07-31", kind: "NOTIFICATION", url: MPESB_DATE_31JUL },
    { label: "Online exam begins — shifts 09:00–12:00 and 14:30–17:30 (end date not announced)", date: "2026-09-17", kind: "EXAM", url: MPESB_DATE_31JUL, isExamDay: true },
  ],
};

// ── KSRP ───────────────────────────────────────────────────────────────
const KSRP_RPC_PDF = "https://cetonline.karnataka.gov.in/keawebentry456/kisrpc2026/ksrpnkkkannada.pdf";
const KSRP_KK_TIMING_PDF = "https://cetonline.karnataka.gov.in/keawebentry456/kiskk2026/KSRP_KK_3-5_SCHDkannada.pdf";
const KEA_KANNADA_NOTICE = "https://cetonline.karnataka.gov.in/keawebentry456/apcrpc/CAR_KSLSA_KREIS_LS_VAO_KSRP_11082026english.pdf";

const KA_KSRP: ExamSpec = {
  exam: {
    code: "KA_KSRP",
    name: "Karnataka KSRP Special Reserve Police Constable (SRPC)",
    shortName: "KSRP Constable",
    category: "STATE_LEVEL",
    state: "KA",
    description:
      "Karnataka State Reserve Police (KSRP) Special Reserve Police Constable recruitment 2026: 1,455 posts outside Kalyana Karnataka (1,382 men, 73 women), plus 859 Kalyana Karnataka posts filled through one combined test (KSRP 334, KSISF 364, IRB 161). Applications and the written test are run by the Karnataka Examinations Authority. Written test on 20 September 2026 (non-Kalyana Karnataka 10:30–12:00; Kalyana Karnataka 15:00–16:30, revised): 100 objective questions, 100 marks, 90 minutes on OMR, 0.25 deducted per wrong answer. The notifications do not state the question paper's language. The notification names the paper 'General Studies and Mental Ability' and gives no topic list; Shishya's practice follows the topics listed by the 2026 Civil and CAR/DAR constable notifications (general knowledge, science, geography, history, Indian Constitution, national freedom movement, mental ability and moral education). Then physical standard and endurance tests at 1:5 (qualifying), a 1:2 shortlist on written marks and a medical examination. Non-exempt candidates must pass a separate Kannada language test (held 22 August 2026). Eligibility: 2nd PUC or equivalent; age 18–33 (35 for SC/ST/Category-1/2A/2B/3A/3B, 38 for forest tribals).",
    durationMin: 90,
    totalQuestions: 100,
    totalMarks: 100,
    marksPerQ: 1,
    negativeMark: 0.25,
    // Empty = not stated: neither KSRP notification, the 2026 Civil / CAR-DAR
    // notifications nor the official keys name the paper's language (checked
    // 15 Sep 2026). The hub then makes no "offered in" claim.
    languages: [],
  },
  subjects: [
    {
      code: "GS",
      name: "General Studies",
      weight: 0.65,
      topics: [
        { code: "gs.current_affairs", name: "Current Affairs & General Knowledge", description: "National and Karnataka current events, awards, sports, important days, government schemes, books and authors." },
        { code: "gs.science", name: "General Science", description: "Physics, chemistry and biology basics, science in daily life, health, environment and technology." },
        { code: "gs.geography", name: "Geography — India & Karnataka", description: "Physical and economic geography of India and Karnataka: rivers, dams, soils, crops, minerals, forests, districts." },
        { code: "gs.history", name: "History — India & Karnataka", description: "Ancient, medieval and modern Indian history; Karnataka's dynasties (Kadambas, Gangas, Chalukyas, Rashtrakutas, Hoysalas, Vijayanagara, Mysore Wodeyars)." },
        { code: "gs.constitution", name: "Indian Constitution & Polity", description: "Preamble, fundamental rights and duties, directive principles, Parliament, state legislature, judiciary, panchayati raj, emergency provisions." },
        { code: "gs.freedom_movement", name: "National Freedom Movement", description: "The freedom struggle from 1857 to 1947, national leaders, Karnataka's role in the freedom movement, Karnataka unification." },
        { code: "gs.moral_education", name: "Moral Education", description: "Values, ethics, civic sense, public-service conduct, empathy and integrity in everyday situations." },
      ],
    },
    {
      code: "MA",
      name: "Mental Ability",
      weight: 0.35,
      topics: [
        { code: "ma.series_analogy", name: "Series, Analogy & Classification", description: "Number and letter series, analogies, odd one out." },
        { code: "ma.coding", name: "Coding-Decoding", description: "Letter, number and symbol coding." },
        { code: "ma.relations_direction", name: "Blood Relations & Direction Sense", description: "Family-tree problems and direction-distance problems." },
        { code: "ma.ranking_arrangement", name: "Ranking, Order & Arrangement", description: "Ranking, ordering, linear and circular seating arrangements." },
        { code: "ma.logic", name: "Syllogism, Statements & Venn Diagrams", description: "Syllogisms, statement-conclusion, Venn diagram reasoning." },
        { code: "ma.arithmetic_reasoning", name: "Arithmetical Reasoning", description: "Number puzzles, percentages, ratio, averages, ages, time and work, speed and distance posed as reasoning problems." },
        { code: "ma.nonverbal", name: "Non-verbal Reasoning", description: "Figure series, mirror and water images, paper folding, embedded figures." },
      ],
    },
  ],
  eligibility: {
    minAge: 18,
    maxAge: 33,
    ageRelaxation:
      "35 for SC/ST/Category-1/2A/2B/3A/3B; 38 for forest tribals. These limits already include the one-time 5-year relaxation (GO DPAR 262 SENENI 2025, 29 January 2026). Ex-servicemen: service period plus up to 3 years. Age counted on the last date for applications (10 August 2026).",
    educationTags: ["12TH", "ANY_STREAM"],
    educationNote:
      "2nd PUC or equivalent: CBSE/ICSE Class 12, other boards' Class 12, NIOS senior secondary, or a 2-year ITI with an NIOS/PU pass in one language and one subject. Candidates awaiting results are not eligible.",
    domicileState: null,
    vacanciesApprox: 2314,
    vacanciesNote:
      "2026: 1,455 KSRP posts outside Kalyana Karnataka (1,382 men, 73 women) and 859 Kalyana Karnataka posts in one combined test (KSRP 334, KSISF 364, IRB 161 — IRB men only).",
    skillProfile: { gk: 4, quant: 2, english: 0, reasoning: 3, technical: 0 },
    eligibilityNote:
      "Non-exempt candidates must pass the qualifying Kannada language test (minimum 50 of 150). Physical standards: men 168 cm with 86 cm chest (5 cm expansion); women 158 cm and 45 kg; forest-tribal candidates 155 cm (men) and 150 cm (women). The endurance test is qualifying only. Kalyana Karnataka posts need the Article 371(J) eligibility certificate. Non-Kalyana Karnataka applicants choose one battalion.",
    officialUrl: "https://cetonline.karnataka.gov.in/kea/kisrpc2026",
    officialName: "Karnataka State Police — KSRP recruitment (applications and written test by the Karnataka Examinations Authority)",
    generatedBy: PROVENANCE,
  },
  dates: [
    { label: "KSRP notifications published — 1,455 posts outside Kalyana Karnataka and 859 Kalyana Karnataka posts", date: "2026-07-10", kind: "NOTIFICATION", url: KSRP_RPC_PDF },
    { label: "Online application opens", date: "2026-07-13", kind: "APPLICATION_START", url: KSRP_RPC_PDF },
    { label: "Online application closes", date: "2026-08-10", kind: "APPLICATION_END", url: KSRP_RPC_PDF },
    { label: "Last date for fee payment", date: "2026-08-11", kind: "APPLICATION_END", url: KSRP_RPC_PDF },
    { label: "Qualifying Kannada language test (non-exempt candidates only)", date: "2026-08-22", kind: "OTHER", url: KEA_KANNADA_NOTICE },
    { label: "Kalyana Karnataka written-test timing revised to 15:00–16:30", date: "2026-09-10", kind: "NOTIFICATION", url: KSRP_KK_TIMING_PDF },
    { label: "Written test — outside Kalyana Karnataka (1,455 posts), 10:30–12:00", date: "2026-09-20", kind: "EXAM", url: KSRP_RPC_PDF, isExamDay: true },
    { label: "Written test — Kalyana Karnataka (KSRP, KSISF, IRB; 859 posts), 15:00–16:30", date: "2026-09-20", kind: "EXAM", url: KSRP_KK_TIMING_PDF, isExamDay: true },
  ],
};

async function seed(spec: ExamSpec) {
  const { code } = spec.exam;
  const existing = await prisma.exam.findUnique({ where: { code }, select: { id: true, active: true } });
  const topicCount = spec.subjects.reduce((a, s) => a + s.topics.length, 0);
  console.log(`\n== ${code} (${existing ? `exists, active=${existing.active}` : "new"})`);
  console.log(`   ${spec.subjects.length} subjects · ${topicCount} topics · ${spec.dates.length} dates · weights sum ${spec.subjects.reduce((a, s) => a + s.weight, 0).toFixed(3)}`);
  if (!APPLY) return;

  // New exams start inactive; an existing row keeps its active flag.
  const exam = await prisma.exam.upsert({
    where: { code },
    create: { ...spec.exam, active: false },
    update: spec.exam,
  });
  for (const [i, s] of spec.subjects.entries()) {
    const subject = await prisma.subject.upsert({
      where: { examId_code: { examId: exam.id, code: s.code } },
      create: { examId: exam.id, code: s.code, name: s.name, weight: s.weight, orderIdx: i },
      update: { name: s.name, weight: s.weight, orderIdx: i },
    });
    for (const [j, t] of s.topics.entries()) {
      await prisma.topic.upsert({
        where: { subjectId_code: { subjectId: subject.id, code: t.code } },
        create: { subjectId: subject.id, code: t.code, name: t.name, description: t.description, orderIdx: j },
        update: { name: t.name, description: t.description, orderIdx: j },
      });
    }
  }
  await prisma.examEligibility.upsert({
    where: { examId: exam.id },
    create: { examId: exam.id, ...spec.eligibility },
    update: spec.eligibility,
  });
  const have = await prisma.examImportantDate.findMany({ where: { examId: exam.id, archivedAt: null }, select: { label: true, date: true } });
  const key = (label: string, d: Date) => `${label}|${d.toISOString().slice(0, 10)}`;
  const haveKeys = new Set(have.map((h) => key(h.label, h.date)));
  let added = 0;
  for (const d of spec.dates) {
    const date = new Date(`${d.date}T00:00:00.000Z`);
    if (haveKeys.has(key(d.label, date))) continue;
    await prisma.examImportantDate.create({
      data: { examId: exam.id, label: d.label, date, isExamDay: !!d.isExamDay, kind: d.kind, confidence: "official", url: d.url, source: PROVENANCE },
    });
    added++;
  }
  console.log(`   applied: exam ${exam.id} (active=${exam.active}), dates added ${added}`);
}

async function main() {
  for (const spec of [MP_RAEO, KA_KSRP]) {
    if (ONLY && !ONLY.has(spec.exam.code)) continue;
    await seed(spec);
  }
  if (!APPLY) console.log("\ndry run — re-run with --apply to write");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
