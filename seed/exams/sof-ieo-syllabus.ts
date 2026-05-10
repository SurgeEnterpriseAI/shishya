// SOF IEO — International English Olympiad (Class 9-10 canonical syllabus).
// 4 sections × ~50 questions: Word & Structure Knowledge, Reading, Spoken & Written Expression, Achievers.
// Source: sofworld.org official Class 9-10 IEO syllabus.
//
// Run after seedExams: npx tsx seed/exams/sof-ieo-syllabus.ts

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

export const sofIeoSyllabus: SubjectSeed[] = [
  // ── WORD AND STRUCTURE KNOWLEDGE ──────────────────────────────────────
  {
    code: "ENGLISH",
    name: "Word and Structure Knowledge",
    weight: 1,
    topics: [
      { code: "eng.parts_of_speech", name: "Parts of Speech",
        description: "Nouns, pronouns, verbs, adjectives, adverbs, prepositions, conjunctions and interjections.",
        subtopics: [
          { code: "eng.parts_of_speech.nouns", name: "Nouns and Pronouns", description: "Types of nouns, pronoun-antecedent agreement and case." },
          { code: "eng.parts_of_speech.verbs", name: "Verbs and Tenses", description: "Main, auxiliary and modal verbs across all tenses." },
          { code: "eng.parts_of_speech.modifiers", name: "Adjectives and Adverbs", description: "Comparison degrees and correct placement of modifiers." },
          { code: "eng.parts_of_speech.prep_conj", name: "Prepositions and Conjunctions", description: "Use of prepositions, coordinating and subordinating conjunctions." },
        ],
      },
      { code: "eng.tenses", name: "Tenses", description: "Twelve tense forms and their correct usage in context." },
      { code: "eng.subject_verb_agreement", name: "Subject-Verb Agreement", description: "Agreement rules for singular/plural subjects and collective nouns." },
      { code: "eng.articles_determiners", name: "Articles and Determiners", description: "Use of a, an, the and quantifiers like much, many, few, little." },
      { code: "eng.voices", name: "Active and Passive Voice", description: "Convert sentences between active and passive voice." },
      { code: "eng.narration", name: "Direct and Indirect Speech (Narration)", description: "Convert statements, questions, commands and exclamations." },
      { code: "eng.sentence_formation", name: "Sentence Formation", description: "Construct grammatically correct sentences from given words." },
      { code: "eng.sentence_types", name: "Types of Sentences", description: "Simple, compound and complex sentences and their conversion." },
      { code: "eng.synonyms", name: "Synonyms", description: "Identify the closest meaning to a given word." },
      { code: "eng.antonyms", name: "Antonyms", description: "Identify the opposite meaning of a given word." },
      { code: "eng.collocations", name: "Collocations", description: "Common word combinations that occur naturally together in English." },
      { code: "eng.spellings", name: "Spellings", description: "Identify the correctly or incorrectly spelt word." },
      { code: "eng.homophones", name: "Homophones and Homonyms", description: "Distinguish between similar-sounding words with different meanings." },
      { code: "eng.idioms", name: "Idioms and Phrases", description: "Meanings and usage of common English idioms." },
      { code: "eng.phrasal_verbs", name: "Phrasal Verbs", description: "Common phrasal verbs and their meanings." },
      { code: "eng.one_word_substitution", name: "One-word Substitution", description: "Replace a phrase with a single appropriate word." },
      { code: "eng.punctuation", name: "Punctuation", description: "Correct use of full stops, commas, semicolons, apostrophes and quotation marks." },
    ],
  },

  // ── READING ───────────────────────────────────────────────────────────
  {
    code: "READING",
    name: "Reading",
    weight: 1,
    topics: [
      { code: "read.comprehension", name: "Reading Comprehension", description: "Passage-based questions on main idea, details, vocabulary and inference." },
      { code: "read.search_information", name: "Search for and Retrieve Information", description: "Locate specific information from notices, advertisements and brochures." },
      { code: "read.poems", name: "Poetry Comprehension", description: "Understand theme, imagery and figures of speech in unseen poems." },
      { code: "read.author_purpose", name: "Author's Purpose and Tone", description: "Identify writer's intent, attitude and tone in passages." },
      { code: "read.cloze_test", name: "Cloze Test", description: "Fill multiple blanks within a passage with the most suitable words." },
    ],
  },

  // ── SPOKEN AND WRITTEN EXPRESSION ─────────────────────────────────────
  {
    code: "EXPRESSION",
    name: "Spoken and Written Expression",
    weight: 1,
    topics: [
      { code: "exp.speech_pronunciation", name: "Speech and Pronunciation", description: "Word stress, syllables and correct pronunciation in everyday English." },
      { code: "exp.conversation", name: "Conversation Skills", description: "Appropriate responses, formal vs informal expressions in dialogue." },
      { code: "exp.writing_skills", name: "Writing Skills", description: "Formal and informal letters, notices, messages and short paragraphs." },
      { code: "exp.para_jumbles", name: "Para Jumbles", description: "Reorder jumbled sentences to form a coherent paragraph." },
      { code: "exp.editing_omission", name: "Editing and Omission", description: "Spot grammatical errors and supply missing words in passages." },
    ],
  },

  // ── ACHIEVERS SECTION ─────────────────────────────────────────────────
  {
    code: "ACHIEVERS",
    name: "Achievers Section",
    weight: 1,
    topics: [
      { code: "ach.higher_order_english", name: "Higher Order English Application", description: "HOTS questions on advanced grammar and vocabulary in context." },
      { code: "ach.advanced_comprehension", name: "Advanced Reading Comprehension", description: "Inference, critical analysis and tone identification in complex passages." },
      { code: "ach.figures_of_speech", name: "Figures of Speech", description: "Simile, metaphor, personification, alliteration and oxymoron." },
      { code: "ach.contextual_usage", name: "Contextual Word Usage", description: "Choose the right word based on subtle differences in meaning and usage." },
    ],
  },
];

export async function seedSofIeoSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SOF_IEO" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SOF_IEO exam not found.");
  }
  console.log(`Seeding SOF IEO syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sofIeoSyllabus.length; sIdx++) {
    const s = sofIeoSyllabus[sIdx];
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
  seedSofIeoSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
