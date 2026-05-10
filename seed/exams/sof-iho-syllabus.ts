// SOF IHO — International Hindi Olympiad (Class 9-10 canonical syllabus).
// 4 sections × ~50 questions: Shabd Gyaan (Vyakaran), Padhna (Reading), Likhit & Mauakhik Abhivyakti, Achievers.
// Source: sofworld.org official Class 9-10 IHO syllabus.
//
// Run after seedExams: npx tsx seed/exams/sof-iho-syllabus.ts

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

export const sofIhoSyllabus: SubjectSeed[] = [
  // ── HINDI VYAKARAN ────────────────────────────────────────────────────
  {
    code: "HINDI",
    name: "Hindi Vyakaran (Grammar and Word Knowledge)",
    weight: 1,
    topics: [
      { code: "hindi.varnamala", name: "Varnamala (Alphabet)", description: "Swar, vyanjan, ucharan-sthan and matrayein." },
      { code: "hindi.sangya", name: "Sangya (Noun)",
        description: "Definition and types of sangya — vyaktivachak, jativachak, bhaavvachak, samuhvachak, dravyavachak.",
        subtopics: [
          { code: "hindi.sangya.types", name: "Sangya ke Bhed", description: "Five types of nouns with examples." },
          { code: "hindi.sangya.ling_vachan", name: "Ling and Vachan", description: "Gender and number rules for nouns in Hindi." },
        ],
      },
      { code: "hindi.sarvanam", name: "Sarvanam (Pronoun)", description: "Definition and types — purushvachak, nishchayvachak, anishchayvachak, sambandhvachak, prashnvachak, nijvachak." },
      { code: "hindi.visheshan", name: "Visheshan (Adjective)", description: "Definition and types — gunvachak, sankhyavachak, parimanvachak, sarvanaamik visheshan." },
      { code: "hindi.kriya", name: "Kriya (Verb)", description: "Definition and types — sakarmak, akarmak, sahayak and prerna-arthak kriya." },
      { code: "hindi.kaal", name: "Kaal (Tense)", description: "Vartmaan, bhoot and bhavishya kaal with their sub-types." },
      { code: "hindi.kaarak", name: "Kaarak", description: "Eight kaaraks with their vibhakti chinh and usage." },
      { code: "hindi.sandhi", name: "Sandhi", description: "Swar, vyanjan and visarg sandhi with rules and examples." },
      { code: "hindi.samaas", name: "Samaas", description: "Tatpurush, karmadharaya, dwigu, dwandva, bahuvrihi and avyayibhav samaas." },
      { code: "hindi.upsarg_pratyay", name: "Upsarg aur Pratyay", description: "Prefixes and suffixes used in Hindi word formation." },
      { code: "hindi.alankar", name: "Alankar", description: "Anupras, yamak, shlesh, upama, rupak and utpreksha alankar." },
      { code: "hindi.ras", name: "Ras", description: "Nine ras — shringar, hasya, karuna, raudra, veer, bhayanak, beebhats, adbhut, shant." },
      { code: "hindi.chhand", name: "Chhand", description: "Doha, chaupai, sortha, savaiya and basic chhand identification." },
      { code: "hindi.shabd_bhandar", name: "Shabd-Bhandar (Vocabulary)", description: "Tatsam, tadbhav, deshaj and videshaj shabd." },
      { code: "hindi.paryayvachi", name: "Paryayvachi Shabd (Synonyms)", description: "Words with similar meanings in Hindi." },
      { code: "hindi.vilom", name: "Vilom Shabd (Antonyms)", description: "Words with opposite meanings in Hindi." },
      { code: "hindi.anekarthi", name: "Anekarthi Shabd", description: "Hindi words that carry multiple meanings depending on context." },
      { code: "hindi.shrutisamabhinnarthak", name: "Shruti-samabhinnarthak Shabd", description: "Similar-sounding words with different meanings (homophones)." },
      { code: "hindi.muhavare", name: "Muhavare (Idioms)", description: "Common Hindi idioms and their meanings." },
      { code: "hindi.lokokti", name: "Lokokti (Proverbs)", description: "Common Hindi proverbs and their applied meanings." },
      { code: "hindi.vakya_shuddhi", name: "Vakya Shuddhi", description: "Identify and correct grammatical errors in Hindi sentences." },
      { code: "hindi.viram_chinh", name: "Viram Chinh (Punctuation)", description: "Correct usage of Hindi punctuation marks." },
    ],
  },

  // ── READING (PADHNA) ──────────────────────────────────────────────────
  {
    code: "READING",
    name: "Padhna (Reading)",
    weight: 1,
    topics: [
      { code: "read.gadyansh", name: "Apathit Gadyansh (Unseen Prose Comprehension)", description: "Read an unseen Hindi passage and answer comprehension questions." },
      { code: "read.padyansh", name: "Apathit Padyansh (Unseen Poem Comprehension)", description: "Read an unseen Hindi poem and answer questions on theme and meaning." },
      { code: "read.gadya_sahitya", name: "Gadya Sahitya (Prose Literature)", description: "Major Hindi prose works, authors and themes from the textbook." },
      { code: "read.padya_sahitya", name: "Padya Sahitya (Poetry Literature)", description: "Major Hindi poems, poets and their themes from the textbook." },
      { code: "read.lekhak_kavi", name: "Lekhak aur Kavi Parichay", description: "Brief introduction to important Hindi prose writers and poets." },
    ],
  },

  // ── LIKHIT AUR MAUKHIK ABHIVYAKTI ─────────────────────────────────────
  {
    code: "EXPRESSION",
    name: "Likhit aur Maukhik Abhivyakti (Written and Oral Expression)",
    weight: 1,
    topics: [
      { code: "exp.patra_lekhan", name: "Patra Lekhan (Letter Writing)", description: "Aupcharik (formal) and anaupcharik (informal) letter writing." },
      { code: "exp.nibandh", name: "Nibandh Lekhan (Essay Writing)", description: "Structure and writing of essays on common topics in Hindi." },
      { code: "exp.anuched", name: "Anuched Lekhan (Paragraph Writing)", description: "Short paragraph writing on given topics." },
      { code: "exp.samvad", name: "Samvad Lekhan (Dialogue Writing)", description: "Write a dialogue between two people on a given situation." },
      { code: "exp.suchna", name: "Suchna aur Vigyapan Lekhan", description: "Write notices and advertisements in Hindi." },
      { code: "exp.vakya_rachna", name: "Vakya Rachna", description: "Construct grammatically correct Hindi sentences from given words." },
    ],
  },

  // ── ACHIEVERS SECTION ─────────────────────────────────────────────────
  {
    code: "ACHIEVERS",
    name: "Achievers Section",
    weight: 1,
    topics: [
      { code: "ach.higher_order_hindi", name: "Higher Order Hindi Application", description: "HOTS questions on advanced grammar and vocabulary in Hindi." },
      { code: "ach.advanced_comprehension", name: "Advanced Hindi Comprehension", description: "Inference and critical analysis on complex Hindi passages and poems." },
      { code: "ach.alankar_ras_advanced", name: "Advanced Alankar and Ras", description: "Tougher identification questions on alankar and ras in given lines." },
      { code: "ach.sahitya_gyaan", name: "Sahitya Gyaan (Literary Knowledge)", description: "Higher-order questions on Hindi literature, eras and important works." },
    ],
  },
];

export async function seedSofIhoSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SOF_IHO" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SOF_IHO exam not found.");
  }
  console.log(`Seeding SOF IHO syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sofIhoSyllabus.length; sIdx++) {
    const s = sofIhoSyllabus[sIdx];
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
  seedSofIhoSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
