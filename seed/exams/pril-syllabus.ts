// PRIL — Panini Linguistics Olympiad (Round 1) (HBCSE / IIIT-H / Microsoft Research).
// Pen-and-paper exam (~4 hrs, 5-6 self-contained problems).
// No prior linguistics knowledge required — problems are puzzles in unfamiliar languages.
// Source: ltrc.iiit.ac.in/plo and IOL training resources.
//
// Run after seedExams: npx tsx seed/exams/pril-syllabus.ts

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

export const prilSyllabus: SubjectSeed[] = [
  // ── PHONOLOGY & PHONETICS PUZZLES ────────────────────────────────────
  {
    code: "PHONOLOGY",
    name: "Phonology and Phonetics",
    weight: 0.18,
    topics: [
      { code: "ling.phon.sounds", name: "Sound Inventories", description: "Identifying the inventory of vowels and consonants in an unfamiliar language sample." },
      { code: "ling.phon.alternations", name: "Phonological Alternations", description: "Spotting rules where sounds change across forms (assimilation, deletion, vowel harmony)." },
      { code: "ling.phon.transcription", name: "Phonetic Transcription", description: "Mapping IPA-like symbols to spoken forms using puzzle-given keys." },
      { code: "ling.phon.stress_tone", name: "Stress and Tone", description: "Predicting stress patterns or lexical tones from given paradigm data." },
    ],
  },

  // ── MORPHOLOGY PUZZLES ────────────────────────────────────────────────
  {
    code: "MORPHOLOGY",
    name: "Morphology",
    weight: 0.22,
    topics: [
      { code: "ling.morph.affixes", name: "Affixation Patterns", description: "Identifying prefixes, suffixes and infixes from word-translation pairs." },
      { code: "ling.morph.agglutination", name: "Agglutinative Morphology", description: "Decomposing long words into stem + many morphemes (Turkish, Swahili-style)." },
      { code: "ling.morph.fusion", name: "Fusional and Templatic Morphology", description: "Untangling overlapping case/number/gender markers; root-and-pattern (Semitic-style) morphology." },
      { code: "ling.morph.case_agreement", name: "Case and Agreement", description: "Working out case-marking and noun-verb agreement systems from examples." },
      { code: "ling.morph.verb_paradigms", name: "Verb Paradigms", description: "Filling in tense, aspect, mood, person and number cells in a conjugation table." },
      { code: "ling.morph.kinship", name: "Kinship Systems", description: "Decoding kin terms — paternal/maternal, generation, gender, marriage relations." },
    ],
  },

  // ── SYNTAX PUZZLES ────────────────────────────────────────────────────
  {
    code: "SYNTAX",
    name: "Syntax",
    weight: 0.18,
    topics: [
      { code: "ling.syn.word_order", name: "Word Order", description: "Inferring SVO/SOV/VSO and modifier-order rules from translated sentences." },
      { code: "ling.syn.alignment", name: "Alignment Systems", description: "Distinguishing nominative-accusative vs ergative-absolutive marking from data." },
      { code: "ling.syn.questions_negation", name: "Questions and Negation", description: "Identifying how questions and negation are formed across sentences." },
      { code: "ling.syn.embedding", name: "Embedded Clauses", description: "Spotting how relative, complement and adverbial clauses are introduced and marked." },
      { code: "ling.syn.translate_match", name: "Sentence-Translation Matching", description: "Matching unfamiliar sentences to English translations and explaining each pairing." },
    ],
  },

  // ── SEMANTICS & PRAGMATICS ────────────────────────────────────────────
  {
    code: "SEMANTICS",
    name: "Semantics and Pragmatics",
    weight: 0.1,
    topics: [
      { code: "ling.sem.lexical", name: "Lexical Semantics", description: "Word-meaning puzzles — polysemy, semantic fields, colour/body-part terms across languages." },
      { code: "ling.sem.deixis", name: "Deixis and Reference", description: "Demonstratives, here/there, this/that and complex deictic systems." },
      { code: "ling.sem.compositional", name: "Compositional Meaning", description: "Building sentence meaning from component parts in unfamiliar languages." },
    ],
  },

  // ── NUMERAL SYSTEMS ───────────────────────────────────────────────────
  {
    code: "NUMERALS",
    name: "Numeral Systems",
    weight: 0.1,
    topics: [
      { code: "ling.num.base", name: "Bases (Decimal, Vigesimal, etc.)", description: "Cracking number words built on bases other than 10 — base-20, base-12, mixed bases." },
      { code: "ling.num.composition", name: "Numeral Composition Rules", description: "Working out additive, multiplicative and subtractive numeral construction." },
      { code: "ling.num.large_numbers", name: "Large Numbers and Counting", description: "Extending a numeral system to write/decode numbers beyond the given examples." },
    ],
  },

  // ── WRITING SYSTEMS & TRANSLITERATION ────────────────────────────────
  {
    code: "SCRIPTS",
    name: "Writing Systems and Transliteration",
    weight: 0.1,
    topics: [
      { code: "ling.script.alphabet", name: "Alphabets and Abjads", description: "Decoding alphabetic and consonantal scripts from glyph-to-sound mappings." },
      { code: "ling.script.abugida", name: "Abugidas and Syllabaries", description: "Working out syllable-based scripts (Brahmic, Ethiopic) and inherent-vowel rules." },
      { code: "ling.script.logographic", name: "Logographic Scripts", description: "Reasoning over character composition — radicals, semantic and phonetic components." },
      { code: "ling.script.transliteration", name: "Transliteration Tasks", description: "Converting between scripts using mapping tables from the puzzle." },
    ],
  },

  // ── HISTORICAL & COMPARATIVE ─────────────────────────────────────────
  {
    code: "HISTORICAL",
    name: "Historical and Comparative Linguistics",
    weight: 0.06,
    topics: [
      { code: "ling.hist.cognates", name: "Cognate Identification", description: "Finding related words across languages and inferring sound-correspondence rules." },
      { code: "ling.hist.sound_change", name: "Regular Sound Change", description: "Reconstructing or applying a regular historical sound change to data." },
    ],
  },

  // ── COMPUTATIONAL & FORMAL LINGUISTICS ───────────────────────────────
  {
    code: "COMPUTATIONAL",
    name: "Computational and Formal Linguistics",
    weight: 0.06,
    topics: [
      { code: "ling.comp.formal_rules", name: "Formal Rule Inference", description: "Inferring formal rewrite or substitution rules from input/output language pairs." },
      { code: "ling.comp.ambiguity", name: "Ambiguity and Parsing", description: "Spotting structural ambiguities and choosing the parse compatible with given translations." },
    ],
  },
];

export async function seedPrilSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "PRIL" } });
  if (!exam) {
    throw new Error("Run seedExams() first — PRIL exam not found.");
  }
  console.log(`Seeding PRIL syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < prilSyllabus.length; sIdx++) {
    const s = prilSyllabus[sIdx];
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
  seedPrilSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
