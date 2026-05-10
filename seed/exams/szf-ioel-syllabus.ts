// Silverzone International Olympiad of English Language (iOEL) — Class 9-10 syllabus.
// Source: silverzone.org/ioel and Silverzone iOEL sample papers.
// Sections: General English, Grammar, Vocabulary, Comprehension & Composition,
// Speech & Pronunciation (Silverzone-distinctive), and Scholar (Achievers) section.
//
// Run after seedExams: npx tsx seed/exams/szf-ioel-syllabus.ts

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

export const szfIoelSyllabus: SubjectSeed[] = [
  // ── GRAMMAR ───────────────────────────────────────────────────────────
  {
    code: "GRAMMAR",
    name: "Grammar",
    weight: 0.3,
    topics: [
      { code: "eng.gram.tenses", name: "Tenses", description: "All twelve tenses, their formation and contextual use, sequence of tenses." },
      { code: "eng.gram.parts_of_speech", name: "Parts of Speech", description: "Noun, pronoun, verb, adjective, adverb, preposition, conjunction, interjection." },
      { code: "eng.gram.subject_verb", name: "Subject-Verb Agreement", description: "Concord rules with collective, indefinite and compound subjects." },
      { code: "eng.gram.modals", name: "Modal Auxiliaries", description: "Can, could, may, might, shall, should, will, would, must, ought to — usage." },
      { code: "eng.gram.articles_determiners", name: "Articles and Determiners", description: "Definite/indefinite articles, demonstratives, quantifiers, possessives." },
      { code: "eng.gram.voice", name: "Active and Passive Voice", description: "Conversion across tenses including imperatives and interrogatives." },
      { code: "eng.gram.narration", name: "Direct and Indirect Speech", description: "Reporting statements, questions, commands, exclamations, time/place changes." },
      { code: "eng.gram.conditionals", name: "Conditional Sentences", description: "Zero, first, second and third conditionals — form and meaning." },
      { code: "eng.gram.clauses", name: "Clauses and Sentences", description: "Independent and dependent clauses, noun/adjective/adverb clauses, sentence types." },
      { code: "eng.gram.transformation", name: "Transformation of Sentences", description: "Affirmative ↔ negative, simple ↔ complex ↔ compound, degrees of comparison." },
      { code: "eng.gram.error_correction", name: "Error Correction", description: "Spotting and correcting common grammatical errors in sentences." },
      { code: "eng.gram.punctuation", name: "Punctuation", description: "Use of comma, semicolon, colon, apostrophe, quotation marks, hyphen." },
    ],
  },

  // ── VOCABULARY ────────────────────────────────────────────────────────
  {
    code: "VOCABULARY",
    name: "Vocabulary",
    weight: 0.2,
    topics: [
      { code: "eng.vocab.synonyms", name: "Synonyms", description: "Words closest in meaning, contextual synonym selection." },
      { code: "eng.vocab.antonyms", name: "Antonyms", description: "Words opposite in meaning, contextual antonym selection." },
      { code: "eng.vocab.homophones", name: "Homophones and Homographs", description: "Words alike in sound or spelling but different in meaning." },
      { code: "eng.vocab.idioms", name: "Idioms and Phrases", description: "Common English idiomatic expressions and their meanings." },
      { code: "eng.vocab.proverbs", name: "Proverbs", description: "Meaning and usage of common English proverbs." },
      { code: "eng.vocab.one_word", name: "One-Word Substitution", description: "Single word replacement for descriptive phrases." },
      { code: "eng.vocab.collocations", name: "Collocations", description: "Words that habitually go together (e.g. heavy rain, fast food)." },
      { code: "eng.vocab.phrasal_verbs", name: "Phrasal Verbs", description: "Verb-particle combinations and their figurative meanings." },
      { code: "eng.vocab.word_formation", name: "Word Formation", description: "Prefixes, suffixes, root words, derivations across parts of speech." },
      { code: "eng.vocab.spellings", name: "Spelling Rules", description: "Common misspellings, ie/ei, doubling consonants, silent letters." },
    ],
  },

  // ── COMPREHENSION & COMPOSITION ───────────────────────────────────────
  {
    code: "COMPREHENSION",
    name: "Comprehension and Composition",
    weight: 0.2,
    topics: [
      { code: "eng.comp.reading", name: "Reading Comprehension", description: "Passage-based questions on main idea, vocabulary in context, inference." },
      { code: "eng.comp.poem", name: "Poetry Comprehension", description: "Tone, theme, figures of speech and meaning of lines from poems." },
      { code: "eng.comp.cloze", name: "Cloze Test", description: "Fill multiple blanks within a passage to test grammar and vocabulary." },
      { code: "eng.comp.para_jumble", name: "Para Jumbles", description: "Reorder jumbled sentences into a coherent paragraph." },
      { code: "eng.comp.sentence_completion", name: "Sentence Completion", description: "Fill blanks with the most appropriate word/phrase." },
      { code: "eng.comp.letter_writing", name: "Letter and Notice Writing", description: "Format and tone of formal/informal letters, notices, messages." },
      { code: "eng.comp.essay_paragraph", name: "Essay and Paragraph Skills", description: "Coherence, cohesion, topic sentences, introduction-body-conclusion." },
    ],
  },

  // ── SPEECH AND PRONUNCIATION (Silverzone signature) ───────────────────
  {
    code: "SPEECH",
    name: "Speech and Pronunciation",
    weight: 0.15,
    topics: [
      { code: "eng.speech.phonetics", name: "Phonetics and Sound Recognition", description: "Vowel/consonant sounds, IPA basics, identifying sounds in words." },
      { code: "eng.speech.stress", name: "Word Stress and Syllables", description: "Identifying stressed syllables and dividing words into syllables." },
      { code: "eng.speech.pronunciation", name: "Pronunciation Patterns", description: "Common pronunciation rules and exceptions, silent letters." },
      { code: "eng.speech.functions", name: "Situational Functions of English", description: "Greeting, requesting, agreeing/disagreeing, giving and accepting compliments." },
      { code: "eng.speech.intonation", name: "Intonation and Rhythm", description: "Rising/falling tones in statements vs questions, sentence rhythm." },
      { code: "eng.speech.everyday_english", name: "Everyday Spoken English", description: "Polite expressions, conversational fillers, situation-based responses." },
    ],
  },

  // ── SCHOLAR / ACHIEVERS ───────────────────────────────────────────────
  {
    code: "ACHIEVERS",
    name: "Scholar Section",
    weight: 0.15,
    topics: [
      { code: "ach.literature", name: "Literary Reference", description: "Authors, famous works, characters from English literature for general awareness." },
      { code: "ach.figures_of_speech", name: "Figures of Speech", description: "Simile, metaphor, personification, alliteration, hyperbole, irony." },
      { code: "ach.advanced_comp", name: "Advanced Comprehension", description: "Inference-heavy, multi-passage and tone-analysis questions." },
      { code: "ach.advanced_grammar", name: "Advanced Grammar", description: "Inversion, ellipsis, subjunctives, complex transformations." },
    ],
  },
];

export async function seedSzfIoelSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SZF_IOEL" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SZF_IOEL exam not found.");
  }
  console.log(`Seeding SZF iOEL syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < szfIoelSyllabus.length; sIdx++) {
    const s = szfIoelSyllabus[sIdx];
    const subject = await prisma.subject.upsert({
      where: { examId_code: { examId: exam.id, code: s.code } },
      update: { name: s.name, weight: s.weight, orderIdx: sIdx },
      create: { examId: exam.id, code: s.code, name: s.name, weight: s.weight, orderIdx: sIdx },
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
  seedSzfIoelSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
