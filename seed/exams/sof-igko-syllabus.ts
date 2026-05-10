// SOF IGKO — International General Knowledge Olympiad (Class 9-10 canonical syllabus).
// 4 sections × ~50 questions: General Awareness, Current Affairs, Life Skills, Achievers.
// Source: sofworld.org official Class 9-10 IGKO syllabus.
//
// Run after seedExams: npx tsx seed/exams/sof-igko-syllabus.ts

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

export const sofIgkoSyllabus: SubjectSeed[] = [
  // ── GENERAL AWARENESS ─────────────────────────────────────────────────
  {
    code: "GK",
    name: "General Awareness",
    weight: 1,
    topics: [
      { code: "gk.india_world", name: "India and the World",
        description: "Geography, polity and economy of India and the broader world.",
        subtopics: [
          { code: "gk.india_world.geography", name: "Geography of India and World", description: "Continents, countries, capitals, rivers, mountains and climate zones." },
          { code: "gk.india_world.polity", name: "Polity and Governance", description: "Indian Constitution, Parliament, judiciary and major international organizations." },
          { code: "gk.india_world.economy", name: "Economy and Finance", description: "Indian economy basics, banking, currencies and global economic bodies." },
        ],
      },
      { code: "gk.history_culture", name: "History and Culture", description: "Indian and world history, cultural heritage, monuments and traditions." },
      { code: "gk.science_technology", name: "Science and Technology", description: "Major scientific discoveries, inventors, space missions and recent tech advances." },
      { code: "gk.computers", name: "Computers and IT Basics", description: "Computer fundamentals, internet, cybersecurity and common applications." },
      { code: "gk.sports", name: "Sports", description: "Major sporting events, championships, players, trophies and recent winners." },
      { code: "gk.books_authors", name: "Books and Authors", description: "Famous books, their authors and recent literary awards." },
      { code: "gk.awards_honours", name: "Awards and Honours", description: "Nobel, Bharat Ratna, Padma awards, Oscars and other major recognitions." },
      { code: "gk.environment", name: "Environment and Ecology", description: "Climate change, biodiversity, protected areas and environmental treaties." },
      { code: "gk.entertainment", name: "Entertainment and Media", description: "Films, music, TV, streaming and influential personalities." },
      { code: "gk.defence_space", name: "Defence and Space", description: "Indian armed forces, ISRO and global defence/space programmes." },
      { code: "gk.logos_mascots", name: "Logos, Mascots and Symbols", description: "Brand logos, national symbols and event mascots." },
      { code: "gk.personalities", name: "Famous Personalities", description: "Leaders, scientists, sportspersons and changemakers from India and the world." },
    ],
  },

  // ── CURRENT AFFAIRS ───────────────────────────────────────────────────
  {
    code: "CURRENT_AFFAIRS",
    name: "Current Affairs",
    weight: 1,
    topics: [
      { code: "ca.national", name: "National Current Affairs", description: "Recent national-level news on politics, policy and major events." },
      { code: "ca.international", name: "International Current Affairs", description: "Global news, summits, conflicts and bilateral relations." },
      { code: "ca.economy_business", name: "Economy and Business News", description: "Recent budgets, GDP figures, mergers and major business stories." },
      { code: "ca.sports_news", name: "Sports News", description: "Recent winners, tournament results and sports headlines." },
      { code: "ca.science_news", name: "Science and Technology News", description: "Recent discoveries, launches, AI, space and health-tech updates." },
      { code: "ca.appointments", name: "Appointments and Resignations", description: "Recent appointments to important national and international posts." },
      { code: "ca.obituaries", name: "Obituaries", description: "Notable personalities who passed away recently." },
    ],
  },

  // ── LIFE SKILLS ───────────────────────────────────────────────────────
  {
    code: "LIFE_SKILLS",
    name: "Life Skills",
    weight: 1,
    topics: [
      { code: "ls.everyday_situations", name: "Everyday Life Situations", description: "Practical decision-making in real-world scenarios." },
      { code: "ls.health_hygiene", name: "Health and Hygiene", description: "Personal hygiene, balanced diet, common diseases and prevention." },
      { code: "ls.social_etiquette", name: "Social Etiquette and Values", description: "Polite behaviour, civic sense and values like honesty and empathy." },
      { code: "ls.safety", name: "Safety and First Aid", description: "Road safety, fire safety, basic first-aid and emergency contacts." },
      { code: "ls.environmental_awareness", name: "Environmental Awareness", description: "Conservation, waste management and individual responsibility." },
      { code: "ls.financial_literacy", name: "Financial Literacy", description: "Saving, budgeting, banking basics and digital payments." },
      { code: "ls.career_awareness", name: "Career and Education Awareness", description: "Streams after Class 10/12 and career-path basics." },
    ],
  },

  // ── ACHIEVERS SECTION ─────────────────────────────────────────────────
  {
    code: "ACHIEVERS",
    name: "Achievers Section",
    weight: 1,
    topics: [
      { code: "ach.higher_order_gk", name: "Higher Order General Knowledge", description: "HOTS questions blending multiple GK areas in one prompt." },
      { code: "ach.case_studies", name: "Case Studies and Inferences", description: "Read a short case and infer the right answer from given data." },
      { code: "ach.connecting_facts", name: "Connecting Facts", description: "Match clues across history, geography and current affairs to identify the answer." },
      { code: "ach.problem_solving", name: "Practical Problem Solving", description: "Apply life-skills and GK knowledge to multi-step real-world problems." },
    ],
  },
];

export async function seedSofIgkoSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SOF_IGKO" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SOF_IGKO exam not found.");
  }
  console.log(`Seeding SOF IGKO syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sofIgkoSyllabus.length; sIdx++) {
    const s = sofIgkoSyllabus[sIdx];
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
  seedSofIgkoSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
