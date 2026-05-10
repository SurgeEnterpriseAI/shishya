// Lakshadweep UT Civil Services / Combined Recruitment — full syllabus tree.
// Note: Lakshadweep does not have a state PSC; UT-level recruitment is via the
// UT Administration (lakshadweep.gov.in) and through DANICS via UPSC for higher
// civil services. This seed models the GS-style single-paper UT recruitment
// exam (GS + Lakshadweep specific + general aptitude) commonly used.
// Lakshadweep-specific content: atolls, Mahl culture, fishing, tourism.
// Sources: lakshadweep.gov.in, lakshadweeppolice.nic.in.
//
// Run after seedExams: npx tsx seed/exams/lakshadweep-psc-syllabus.ts

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

export const lakshadweepPscSyllabus: SubjectSeed[] = [
  {
    code: "GS",
    name: "General Studies",
    weight: 1.2,
    topics: [
      {
        code: "gs.science",
        name: "General Science",
        description: "Everyday science at SSLC standard.",
        subtopics: [
          { code: "gs.sci.physics", name: "Physics", description: "Force, motion, heat, light, sound, electricity, magnetism." },
          { code: "gs.sci.chemistry", name: "Chemistry", description: "Elements, compounds, acids, bases, salts and reactions." },
          { code: "gs.sci.biology", name: "Biology", description: "Plants, animals, human body and diseases." },
          { code: "gs.sci.marine", name: "Marine Science", description: "Coral reefs, marine biodiversity, ocean currents and atoll formation." },
          { code: "gs.sci.environment", name: "Environment", description: "Ecosystems, climate change and pollution." },
        ],
      },
      {
        code: "gs.current",
        name: "Current Events",
        description: "National, international and Lakshadweep current affairs.",
        subtopics: [
          { code: "gs.cur.national", name: "National Current Affairs", description: "Schemes, polity, economy and major events." },
          { code: "gs.cur.intl", name: "International Affairs", description: "Summits, organisations and Indian Ocean affairs." },
          { code: "gs.cur.local", name: "Lakshadweep Current Affairs", description: "Administration, recent regulations, tourism and connectivity." },
        ],
      },
      {
        code: "gs.history",
        name: "History — India and Lakshadweep",
        description: "History of India with focus on Lakshadweep.",
        subtopics: [
          { code: "gs.hist.ancient_india", name: "Ancient and Medieval India", description: "Indus Valley to Mughals — outline." },
          { code: "gs.hist.modern_india", name: "Modern India", description: "British rule and freedom struggle." },
          { code: "gs.hist.cheraman", name: "Cheraman Perumal Legend", description: "Traditional account of conversion of king and arrival of Islam in Lakshadweep." },
          { code: "gs.hist.medieval_lakshadweep", name: "Medieval Lakshadweep", description: "Chola, Kolathiri (Kannur) and Arakkal Bibi rule over the islands." },
          { code: "gs.hist.colonial_lakshadweep", name: "Colonial Lakshadweep", description: "Portuguese encounters, Tipu Sultan, British annexation and Amindivi takeover." },
          { code: "gs.hist.formation_ut", name: "Formation of UT", description: "Reorganisation as UT in 1956 and 1973 renaming as Lakshadweep." },
        ],
      },
      {
        code: "gs.geography",
        name: "Geography — India and Lakshadweep",
        description: "Geography with focus on the islands.",
        subtopics: [
          { code: "gs.geo.india", name: "Geography of India", description: "Physical features, climate and resources." },
          { code: "gs.geo.atolls", name: "Atolls and Islands", description: "36 islands across Amindivi, Laccadive and Minicoy groups; coral atoll formation." },
          { code: "gs.geo.climate", name: "Climate and Monsoon", description: "Tropical climate, monsoon pattern and cyclones over the Arabian Sea." },
          { code: "gs.geo.coral", name: "Coral Reefs and Lagoons", description: "Coral diversity, lagoons, mangroves and reef ecology." },
          { code: "gs.geo.ocean", name: "Oceanography", description: "Indian Ocean currents, EEZ and Lakshadweep Sea." },
        ],
      },
      {
        code: "gs.polity",
        name: "Indian Polity and UT Administration",
        description: "Constitution and Lakshadweep UT administration.",
        subtopics: [
          { code: "gs.pol.constitution", name: "Constitution of India", description: "Preamble, salient features and historical evolution." },
          { code: "gs.pol.fr_dpsp", name: "Fundamental Rights and DPSP", description: "Articles 12-51A — rights, duties and directive principles." },
          { code: "gs.pol.ut", name: "UT Administration of Lakshadweep", description: "Administrator under President, no legislature, district panchayat and village dweep panchayats." },
          { code: "gs.pol.tribal", name: "Tribal Status", description: "Scheduled Tribe status of islanders, land alienation regulations." },
        ],
      },
      {
        code: "gs.economy",
        name: "Indian Economy and Lakshadweep Economy",
        description: "Indian economy with focus on the island economy.",
        subtopics: [
          { code: "gs.eco.india", name: "Indian Economy", description: "Sectoral composition, banking, fiscal policy and welfare schemes." },
          { code: "gs.eco.fisheries", name: "Fisheries", description: "Tuna pole-and-line fishing, mass-fishing co-operatives and processing." },
          { code: "gs.eco.coconut", name: "Coconut and Coir", description: "Coconut cultivation, copra, coir and value addition." },
          { code: "gs.eco.tourism", name: "Tourism", description: "Eco-tourism, water sports, Bangaram and Agatti tourism economy." },
        ],
      },
      {
        code: "gs.lakshadweep_culture",
        name: "Society and Culture of Lakshadweep",
        description: "Cultural heritage and social life of the islands.",
        subtopics: [
          { code: "gs.cul.mahl", name: "Mahl Language and Minicoy", description: "Mahl (Dhivehi) speakers of Minicoy with Maldivian cultural ties." },
          { code: "gs.cul.languages", name: "Languages of Lakshadweep", description: "Malayalam in northern islands, Mahl in Minicoy and Jeseri dialect." },
          { code: "gs.cul.islam", name: "Islam in Lakshadweep", description: "Sunni Shafi'i tradition and role of mosques in island society." },
          { code: "gs.cul.dance", name: "Folk Arts", description: "Lava dance of Minicoy, Kolkali, Parichakali and Oppana." },
          { code: "gs.cul.cuisine", name: "Cuisine", description: "Tuna-based cuisine, mas-mirus, coconut-based dishes." },
        ],
      },
      {
        code: "gs.aptitude",
        name: "General Aptitude and Reasoning",
        description: "Class X level reasoning and numerical aptitude.",
        subtopics: [
          { code: "gs.apt.numerical", name: "Numerical Aptitude", description: "Percentage, ratio, average, time-work, time-distance." },
          { code: "gs.apt.reasoning", name: "Logical Reasoning", description: "Series, coding-decoding, blood relation, direction sense." },
          { code: "gs.apt.di", name: "Data Interpretation", description: "Tables, bar, pie and line graph based questions." },
        ],
      },
    ],
  },
];

export async function seedLakshadweepPscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "LD_LAKSHADWEEP" } });
  if (!exam) {
    throw new Error("Run seedExams() first — LD_LAKSHADWEEP exam not found.");
  }
  console.log(`Seeding Lakshadweep UT syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < lakshadweepPscSyllabus.length; sIdx++) {
    const s = lakshadweepPscSyllabus[sIdx];
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
  seedLakshadweepPscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
