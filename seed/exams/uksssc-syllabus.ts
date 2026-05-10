// UKSSSC (Uttarakhand Subordinate Services Selection Commission) Group C syllabus tree.
// 100 MCQs / 100 marks, 2 hours, offline pen-and-paper. 0.25 negative marking.
// Three sections: General Hindi (20 Qs), General Studies (40 Qs), General Knowledge of Uttarakhand (40 Qs).
// Source: sssc.uk.gov.in official Group C notifications — Inter-level recruitment scheme.
//
// Run after seedExams: npx tsx seed/exams/uksssc-syllabus.ts

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

export const uksssсSyllabus: SubjectSeed[] = [
  // ── GENERAL KNOWLEDGE (NATIONAL/INTERNATIONAL) ───────────────────────
  {
    code: "GK",
    name: "General Studies",
    weight: 1,
    topics: [
      { code: "gs.history_india", name: "History of India", description: "Ancient (Indus, Vedic, Maurya, Gupta), medieval, modern India and freedom struggle." },
      { code: "gs.geography_india", name: "Geography of India", description: "Physical features, climate, soils, rivers, agriculture and natural resources." },
      { code: "gs.geography_world", name: "World Geography", description: "Continents, oceans, latitudes, longitudes, important geographical phenomena." },
      { code: "gs.indian_polity", name: "Indian Polity and Constitution", description: "Preamble, fundamental rights, DPSPs, Parliament, judiciary, federalism." },
      { code: "gs.indian_economy", name: "Indian Economy", description: "Planning, banking, taxation, GST, public finance, budget, inflation." },
      { code: "gs.general_science", name: "General Science", description: "Physics, chemistry, biology fundamentals at HS standard." },
      { code: "gs.environment", name: "Environment and Ecology", description: "Ecosystems, biodiversity, pollution, climate change and conservation." },
      { code: "gs.science_tech", name: "Science and Technology", description: "Recent advances in IT, biotech, space and defence." },
      { code: "gs.current_affairs_natl", name: "National Current Affairs", description: "Government schemes, appointments, awards, important events." },
      { code: "gs.current_affairs_intl", name: "International Current Affairs", description: "Global summits, treaties, organisations and conflicts." },
      { code: "gs.sports", name: "Sports", description: "National and international tournaments, players, awards." },
      { code: "gs.awards", name: "Awards and Honours", description: "Padma awards, gallantry awards, Nobel, Dadasaheb Phalke." },
      { code: "gs.books_authors", name: "Books and Authors", description: "Recent and classic notable books and their authors." },
      { code: "gs.intl_orgs", name: "International Organisations", description: "UN, WHO, IMF, World Bank, SAARC, BRICS, G20, ASEAN." },
    ],
  },

  // ── UTTARAKHAND SPECIFIC ─────────────────────────────────────────────
  {
    code: "STATE_SPECIFIC",
    name: "General Knowledge of Uttarakhand",
    weight: 1.4,
    topics: [
      { code: "uk.history", name: "History of Uttarakhand", description: "Ancient Kumaon-Garhwal kingdoms, Katyuri, Chand, Parmar, Gorkha rule, British era." },
      { code: "uk.formation", name: "Formation of Uttarakhand State", description: "Statehood movement, leaders, key martyrs, formation in 2000." },
      { code: "uk.geography", name: "Geography of Uttarakhand", description: "Himalayan ranges, valleys, glaciers, climate and physical divisions." },
      { code: "uk.rivers", name: "Rivers of Uttarakhand", description: "Ganga, Yamuna, Bhagirathi, Alaknanda, Kali, Pindar — origin and tributaries." },
      { code: "uk.glaciers", name: "Glaciers of Uttarakhand", description: "Gangotri, Pindari, Milam, Khatling and other major glaciers." },
      { code: "uk.flora_fauna", name: "Flora and Fauna of Uttarakhand", description: "Forests, wildlife, alpine flora, state animal, bird and flower." },
      { code: "uk.np_sanctuaries", name: "National Parks and Sanctuaries", description: "Jim Corbett, Nanda Devi, Valley of Flowers, Govind, Rajaji." },
      { code: "uk.economy", name: "Economy of Uttarakhand", description: "Agriculture, horticulture, hydropower, tourism, industries." },
      { code: "uk.culture", name: "Culture and Festivals", description: "Folk culture of Garhwal and Kumaon — fairs, festivals, dance, music." },
      { code: "uk.languages", name: "Languages and Dialects", description: "Hindi, Garhwali, Kumaoni, Jaunsari, Bhotiya — script and scope." },
      { code: "uk.literature", name: "Literature of Uttarakhand", description: "Poets and writers — Sumitranandan Pant, Manohar Shyam Joshi, Shivani." },
      { code: "uk.administration", name: "Administration of Uttarakhand", description: "Districts, divisions, Governor, CM, secretariat structure." },
      { code: "uk.tourism", name: "Tourism in Uttarakhand", description: "Char Dham, Hill stations (Mussoorie, Nainital), Auli, Hemkund." },
      { code: "uk.govt_schemes", name: "Schemes of Uttarakhand Government", description: "Welfare schemes, Devbhoomi initiatives, women and youth programmes." },
      { code: "uk.current_affairs_uk", name: "Current Affairs of Uttarakhand", description: "Recent events, appointments and developments in the state." },
      { code: "uk.personalities", name: "Notable Personalities", description: "Freedom fighters, social reformers, sportspersons of Uttarakhand." },
    ],
  },

  // ── GENERAL HINDI ────────────────────────────────────────────────────
  {
    code: "LANG",
    name: "General Hindi",
    weight: 1,
    topics: [
      { code: "hin.varnamala", name: "Varnamala (वर्णमाला)", description: "Hindi alphabet — swar and vyanjan, classification." },
      { code: "hin.shabd_bhandar", name: "Shabd Bhandar (शब्द भण्डार)", description: "Tatsam, tadbhav, deshaj, videshaj shabd." },
      { code: "hin.sandhi", name: "Sandhi (सन्धि)", description: "Swar, vyanjan and visarg sandhi rules." },
      { code: "hin.samas", name: "Samas (समास)", description: "Tatpurush, dvandva, bahuvrihi, karmadharaya samas." },
      { code: "hin.upsarg_pratyay", name: "Upsarg and Pratyay (उपसर्ग एवं प्रत्यय)", description: "Prefixes and suffixes in Hindi." },
      { code: "hin.paryayvachi", name: "Paryayvachi Shabd (पर्यायवाची शब्द)", description: "Synonyms in Hindi." },
      { code: "hin.vilom", name: "Vilom Shabd (विलोम शब्द)", description: "Antonyms in Hindi." },
      { code: "hin.muhavare", name: "Muhavare aur Lokoktiyan (मुहावरे एवं लोकोक्तियाँ)", description: "Idioms and proverbs in Hindi." },
      { code: "hin.vakya_shudhi", name: "Vakya Shudhi (वाक्य शुद्धि)", description: "Sentence correction — grammatical errors." },
      { code: "hin.alankar", name: "Alankar (अलंकार)", description: "Shabd alankar and arth alankar — anuprasa, upma, rupak." },
      { code: "hin.ras_chhand", name: "Ras and Chhand (रस एवं छन्द)", description: "Nine rasas and Hindi metres." },
      { code: "hin.uk_languages", name: "Languages and Dialects of Uttarakhand", description: "Garhwali, Kumaoni and Jaunsari — features and literature." },
      { code: "hin.lipi", name: "Lipi (लिपि)", description: "Devanagari script — characteristics and origin." },
      { code: "hin.sahitya_intro", name: "Hindi Sahitya Parichay (हिन्दी साहित्य परिचय)", description: "Periods and major Hindi literary movements." },
      { code: "hin.apathit_gadyansh", name: "Apathit Gadyansh (अपठित गद्यांश)", description: "Unseen prose passage with comprehension questions." },
      { code: "hin.spelling", name: "Hindi Spelling (हिन्दी वर्तनी)", description: "Correct spelling rules in Hindi." },
    ],
  },

  // ── REASONING (PART OF GENERAL STUDIES IN UKSSSC) ────────────────────
  {
    code: "REASONING",
    name: "Reasoning and Mental Ability",
    weight: 1,
    topics: [
      { code: "rea.number_series", name: "Number Series", description: "Find the next or missing term in a number series." },
      { code: "rea.coding_decoding", name: "Coding-Decoding", description: "Letter and number coding-decoding patterns." },
      { code: "rea.blood_relations", name: "Blood Relations", description: "Family tree problems and relationship-based questions." },
      { code: "rea.direction_sense", name: "Direction Sense", description: "Direction-based path problems and shortest path." },
      { code: "rea.analogy", name: "Analogy", description: "Word, number and figure analogy." },
      { code: "rea.classification", name: "Classification", description: "Identifying the odd one out from a group." },
      { code: "rea.syllogism", name: "Syllogism", description: "Statement-conclusion logic and Venn diagrams." },
      { code: "rea.calendar_clock", name: "Calendar and Clock", description: "Day-of-week, leap year and clock-angle problems." },
      { code: "rea.arithmetic", name: "Arithmetic Problems", description: "Percentage, ratio, average, profit-loss, time-work, SI/CI." },
    ],
  },
];

export async function seedUkssscSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UK_UKSSSC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UK_UKSSSC exam not found.");
  }
  console.log(`Seeding UKSSSC syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < uksssсSyllabus.length; sIdx++) {
    const s = uksssсSyllabus[sIdx];
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
  console.log(`✓ Seeded UKSSSC syllabus. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedUkssscSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
