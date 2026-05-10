// Rajasthan Police Constable — full syllabus tree.
// 150 MCQs in 2 hours, 150 marks. 1/4 negative marking.
// Sections: A) Reasoning, Logic & Computers (60 Qs);
//           B) GK, Social Studies & Current Affairs (45 Qs);
//           C) Laws regarding Crimes against Women & Children;
//           D) Rajasthan History, Geography, Culture, Economy & Polity (45 Qs).
// Source: police.rajasthan.gov.in notification + SSCAdda / Testbook cross-check.
//
// Run after seedExams: npx tsx seed/exams/rj-police-pc-syllabus.ts

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

export const rjPolicePcSyllabus: SubjectSeed[] = [
  // ── REASONING, LOGIC & COMPUTER (60 Qs — Section A) ────────────────────
  {
    code: "REASONING",
    name: "Reasoning, Logic & Computer Knowledge",
    weight: 0.4,
    topics: [
      { code: "reason.analogy", name: "Analogies", description: "Word, number and figural analogies." },
      { code: "reason.classification", name: "Classification", description: "Odd one out across categories." },
      { code: "reason.series", name: "Series Completion", description: "Letter, number and figural series." },
      { code: "reason.coding", name: "Coding-Decoding", description: "Letter/number/symbol coding patterns." },
      { code: "reason.blood_relation", name: "Blood Relations", description: "Family-tree puzzles." },
      { code: "reason.direction", name: "Direction Sense", description: "Cardinal directions and final-position." },
      { code: "reason.clock_calendar", name: "Clock & Calendar", description: "Clock angles, calendar days and date problems." },
      { code: "reason.ranking", name: "Ranking & Order", description: "Top/bottom rank and seating order." },
      { code: "reason.syllogism", name: "Syllogism", description: "Logical conclusions from premises." },
      { code: "reason.venn", name: "Venn Diagrams", description: "Set relationships visualised." },
      { code: "reason.statement_conclusion", name: "Statement & Conclusion", description: "Inference and assumption analysis." },
      { code: "reason.problem_solving", name: "Problem Solving", description: "Seating, ordering and grouping puzzles." },
      { code: "reason.mirror_water", name: "Mirror & Water Image", description: "Reflection-based visual reasoning." },
      { code: "reason.paper_folding", name: "Paper Folding & Cutting", description: "Visualisation of folded paper." },
      { code: "reason.embedded_figures", name: "Embedded Figures", description: "Hidden figure detection." },
      { code: "comp.fundamentals", name: "Computer Fundamentals", description: "Hardware, software and operating system basics." },
      { code: "comp.ms_office", name: "MS Office", description: "Word, Excel, PowerPoint basics." },
      { code: "comp.internet", name: "Internet & Email", description: "Web browsing, email and search engines." },
      { code: "comp.cyber_security", name: "Cyber Security", description: "Cyber crime, viruses and online safety." },
      { code: "comp.networking", name: "Networking", description: "LAN/WAN, IP, network basics." },
    ],
  },

  // ── GK, SOCIAL STUDIES & CURRENT AFFAIRS (45 Qs — Section B) ───────────
  {
    code: "GK",
    name: "General Knowledge, Social Studies & Current Affairs",
    weight: 0.3,
    topics: [
      { code: "gk.history_india", name: "Indian History", description: "Ancient, medieval and modern Indian history." },
      { code: "gk.freedom_struggle", name: "Indian Freedom Struggle", description: "1857, INC, Gandhian movements, partition." },
      { code: "gk.geography_india", name: "Indian Geography", description: "Physical, economic and political geography." },
      { code: "gk.geography_world", name: "World Geography", description: "Continents, oceans, climate and countries." },
      { code: "gk.polity", name: "Indian Polity & Constitution", description: "Constitution, Parliament and judiciary." },
      { code: "gk.economy", name: "Indian Economy", description: "Plans, banking, GDP and budget." },
      { code: "gk.science", name: "General Science", description: "Physics, chemistry, biology basics." },
      { code: "gk.tech", name: "Science & Technology", description: "Space, defence, IT and biotech." },
      { code: "gk.sports", name: "Sports", description: "National and international sports events and players." },
      { code: "gk.awards", name: "Awards & Honours", description: "Padma, Nobel, gallantry and recent honours." },
      { code: "gk.books", name: "Books & Authors", description: "Notable books and authors." },
      { code: "gk.current_affairs", name: "Current Affairs", description: "National and international events of last 12-18 months." },
      { code: "gk.environment", name: "Environment & Ecology", description: "Climate change, biodiversity and conservation." },
    ],
  },

  // ── LAWS REGARDING CRIMES AGAINST WOMEN & CHILDREN (Section C) ─────────
  {
    code: "LAW",
    name: "Laws Regarding Crimes Against Women & Children",
    weight: 0.1,
    topics: [
      { code: "law.women_protection", name: "Crimes Against Women — Awareness", description: "Awareness of major crimes against women and societal context." },
      { code: "law.dowry", name: "Dowry Prohibition Act", description: "Provisions of the Dowry Prohibition Act 1961." },
      { code: "law.domestic_violence", name: "Protection of Women from Domestic Violence Act", description: "PWDV Act 2005 — definitions, rights and reliefs." },
      { code: "law.workplace_harassment", name: "Sexual Harassment at Workplace Act", description: "POSH Act 2013 — definitions and complaint procedure." },
      { code: "law.pocso", name: "POCSO Act", description: "Protection of Children from Sexual Offences Act 2012." },
      { code: "law.child_marriage", name: "Prohibition of Child Marriage Act", description: "PCMA 2006 — provisions and penalties." },
      { code: "law.juvenile_justice", name: "Juvenile Justice Act", description: "JJ (Care & Protection of Children) Act 2015." },
      { code: "law.child_labour", name: "Child Labour Prohibition Act", description: "Child labour laws and amendments." },
      { code: "law.trafficking", name: "Anti-Trafficking Provisions", description: "ITPA and laws against trafficking of women and children." },
      { code: "law.bns_provisions", name: "BNS Provisions on Women & Children", description: "Bharatiya Nyaya Sanhita sections on women and child protection." },
      { code: "law.safety_measures", name: "Safety Measures & Helplines", description: "Women helplines, child helpline and safety apps in Rajasthan." },
    ],
  },

  // ── RAJASTHAN HISTORY, GEOGRAPHY, CULTURE, ECONOMY, POLITY (45 Qs — Section D) ──
  {
    code: "STATE_SPECIFIC",
    name: "Rajasthan — History, Geography, Culture, Economy, Polity",
    weight: 0.2,
    topics: [
      { code: "rj.history", name: "Rajasthan History", description: "Rajput dynasties — Chauhans, Sisodias, Rathores, Kachwahas." },
      { code: "rj.medieval", name: "Medieval Rajasthan", description: "Mewar, Marwar, Hadoti, relations with Mughals and Marathas." },
      { code: "rj.freedom_struggle", name: "Rajasthan in Freedom Struggle", description: "1857 in Rajasthan, peasant and tribal movements, integration." },
      { code: "rj.unification", name: "Unification of Rajasthan", description: "Stages of integration of princely states into Rajasthan." },
      { code: "rj.geography_physical", name: "Rajasthan Physical Geography", description: "Aravallis, Thar desert, climate, drainage and soils." },
      { code: "rj.geography_districts", name: "Rajasthan Districts & Divisions", description: "Districts, divisions and demographics of Rajasthan." },
      { code: "rj.rivers_water", name: "Rajasthan Rivers & Water Resources", description: "Banas, Chambal, Luni and Indira Gandhi Canal." },
      { code: "rj.minerals_industries", name: "Minerals & Industries", description: "Marble, copper, zinc; major industries and SEZs." },
      { code: "rj.agriculture", name: "Rajasthan Agriculture", description: "Cropping pattern, irrigation and Rajasthan farming practices." },
      { code: "rj.economy", name: "Rajasthan Economy", description: "State GDP, schemes, tourism, handicrafts and exports." },
      { code: "rj.polity", name: "Rajasthan Polity & Administration", description: "State legislature, CM, Governor and key institutions." },
      { code: "rj.schemes", name: "Rajasthan Welfare Schemes", description: "State welfare schemes for women, children, farmers and youth." },
      { code: "rj.culture", name: "Rajasthan Culture & Folk Arts", description: "Ghoomar, Kalbelia, music, miniature painting, fairs and festivals." },
      { code: "rj.literature", name: "Rajasthani Literature", description: "Dingal/Pingal poetry, Chand Bardai, Suryamal Mishran and modern writers." },
      { code: "rj.personalities", name: "Famous Personalities of Rajasthan", description: "Maharana Pratap, Prithviraj Chauhan, Mirabai, Rani Padmini and reformers." },
      { code: "rj.places", name: "Important Places & Monuments", description: "Forts, palaces, temples and tourist sites of Rajasthan." },
      { code: "rj.events", name: "Famous Events & Battles", description: "Haldighati, Khanwa, Chittor sieges and historical events." },
    ],
  },
];

export async function seedRjPolicePcSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "RJ_POLICE_PC" } });
  if (!exam) {
    throw new Error("Run seedExams() first — RJ_POLICE_PC exam not found.");
  }
  console.log(`Seeding Rajasthan Police Constable syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < rjPolicePcSyllabus.length; sIdx++) {
    const s = rjPolicePcSyllabus[sIdx];
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
  seedRjPolicePcSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
