// SSC CGL Tier 1 — English Comprehension — 50 sample questions.
// AI-generated, awaiting SME validation.
//
// Run after seedSscCglSyllabus(): npx tsx seed/questions/ssc-cgl-english.ts

import { PrismaClient, Difficulty, QuestionType, Language, QuestionSource } from "@prisma/client";
const prisma = new PrismaClient();

interface QuestionSeed {
  topicCode: string;
  difficulty: Difficulty;
  type?: QuestionType;
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  language?: Language;
  tags?: string[];
}

export const sscCglEnglishQuestions: QuestionSeed[] = [
  // ── Synonyms (5) ─────────────────────────────────────────────────────
  {
    topicCode: "eng.synonyms",
    difficulty: "EASY",
    body: "Choose the word most nearly similar in meaning to: ABUNDANT",
    options: [
      { key: "A", text: "Scarce" },
      { key: "B", text: "Plentiful" },
      { key: "C", text: "Tiny" },
      { key: "D", text: "Hidden" },
    ],
    answerKey: "B",
    solution: "'Abundant' means existing or available in large quantities — i.e., 'plentiful'.",
    tags: ["vocabulary"],
  },
  {
    topicCode: "eng.synonyms",
    difficulty: "EASY",
    body: "Choose the word most nearly similar in meaning to: COURAGEOUS",
    options: [
      { key: "A", text: "Timid" },
      { key: "B", text: "Brave" },
      { key: "C", text: "Cruel" },
      { key: "D", text: "Honest" },
    ],
    answerKey: "B",
    solution: "'Courageous' means showing courage; the closest synonym is 'brave'.",
    tags: ["vocabulary"],
  },
  {
    topicCode: "eng.synonyms",
    difficulty: "MEDIUM",
    body: "Choose the word most nearly similar in meaning to: ENORMOUS",
    options: [
      { key: "A", text: "Difficult" },
      { key: "B", text: "Strange" },
      { key: "C", text: "Huge" },
      { key: "D", text: "Famous" },
    ],
    answerKey: "C",
    solution: "'Enormous' means very large in size or amount — synonymous with 'huge'.",
    tags: ["vocabulary"],
  },
  {
    topicCode: "eng.synonyms",
    difficulty: "MEDIUM",
    body: "Choose the word most nearly similar in meaning to: DILIGENT",
    options: [
      { key: "A", text: "Lazy" },
      { key: "B", text: "Hardworking" },
      { key: "C", text: "Careless" },
      { key: "D", text: "Quick" },
    ],
    answerKey: "B",
    solution: "'Diligent' means showing care and effort in one's work — i.e., 'hardworking'.",
    tags: ["vocabulary"],
  },
  {
    topicCode: "eng.synonyms",
    difficulty: "HARD",
    body: "Choose the word most nearly similar in meaning to: BENEVOLENT",
    options: [
      { key: "A", text: "Wicked" },
      { key: "B", text: "Kind" },
      { key: "C", text: "Stingy" },
      { key: "D", text: "Greedy" },
    ],
    answerKey: "B",
    solution: "'Benevolent' means well-meaning and kindly. The closest synonym is 'kind'.",
    tags: ["vocabulary"],
  },

  // ── Antonyms (5) ─────────────────────────────────────────────────────
  {
    topicCode: "eng.antonyms",
    difficulty: "EASY",
    body: "Choose the word most opposite in meaning to: ANCIENT",
    options: [
      { key: "A", text: "Old" },
      { key: "B", text: "Modern" },
      { key: "C", text: "Decayed" },
      { key: "D", text: "Antique" },
    ],
    answerKey: "B",
    solution: "'Ancient' means very old. Its antonym is 'modern' (recent, current).",
    tags: ["vocabulary"],
  },
  {
    topicCode: "eng.antonyms",
    difficulty: "EASY",
    body: "Choose the word most opposite in meaning to: VICTORY",
    options: [
      { key: "A", text: "Defeat" },
      { key: "B", text: "Triumph" },
      { key: "C", text: "Glory" },
      { key: "D", text: "Honour" },
    ],
    answerKey: "A",
    solution: "'Victory' means winning. Its opposite is 'defeat' (losing).",
    tags: ["vocabulary"],
  },
  {
    topicCode: "eng.antonyms",
    difficulty: "MEDIUM",
    body: "Choose the word most opposite in meaning to: TRANSPARENT",
    options: [
      { key: "A", text: "Clear" },
      { key: "B", text: "Opaque" },
      { key: "C", text: "Visible" },
      { key: "D", text: "Plain" },
    ],
    answerKey: "B",
    solution: "'Transparent' means see-through. Its antonym is 'opaque' — not allowing light through.",
    tags: ["vocabulary"],
  },
  {
    topicCode: "eng.antonyms",
    difficulty: "MEDIUM",
    body: "Choose the word most opposite in meaning to: GENUINE",
    options: [
      { key: "A", text: "Real" },
      { key: "B", text: "Authentic" },
      { key: "C", text: "Fake" },
      { key: "D", text: "Honest" },
    ],
    answerKey: "C",
    solution: "'Genuine' means real or authentic. Its antonym is 'fake' (not real).",
    tags: ["vocabulary"],
  },
  {
    topicCode: "eng.antonyms",
    difficulty: "HARD",
    body: "Choose the word most opposite in meaning to: FRUGAL",
    options: [
      { key: "A", text: "Thrifty" },
      { key: "B", text: "Wasteful" },
      { key: "C", text: "Careful" },
      { key: "D", text: "Modest" },
    ],
    answerKey: "B",
    solution: "'Frugal' means economical and careful with money. Its antonym is 'wasteful'.",
    tags: ["vocabulary"],
  },

  // ── Spelling (4) ─────────────────────────────────────────────────────
  {
    topicCode: "eng.spellings",
    difficulty: "EASY",
    body: "Choose the correctly spelt word:",
    options: [
      { key: "A", text: "Recieve" },
      { key: "B", text: "Receive" },
      { key: "C", text: "Receeve" },
      { key: "D", text: "Receve" },
    ],
    answerKey: "B",
    solution: "Rule: 'i' before 'e' except after 'c' — so 'receive' (e-i after c) is correct.",
    tags: ["spelling"],
  },
  {
    topicCode: "eng.spellings",
    difficulty: "EASY",
    body: "Choose the correctly spelt word:",
    options: [
      { key: "A", text: "Accomodate" },
      { key: "B", text: "Acommodate" },
      { key: "C", text: "Accommodate" },
      { key: "D", text: "Acomodate" },
    ],
    answerKey: "C",
    solution: "'Accommodate' has double 'c' and double 'm' — both are doubled.",
    tags: ["spelling"],
  },
  {
    topicCode: "eng.spellings",
    difficulty: "MEDIUM",
    body: "Choose the correctly spelt word:",
    options: [
      { key: "A", text: "Embarrass" },
      { key: "B", text: "Embarass" },
      { key: "C", text: "Embaras" },
      { key: "D", text: "Embarras" },
    ],
    answerKey: "A",
    solution: "'Embarrass' has double 'r' and double 's'.",
    tags: ["spelling"],
  },
  {
    topicCode: "eng.spellings",
    difficulty: "MEDIUM",
    body: "Choose the correctly spelt word:",
    options: [
      { key: "A", text: "Occured" },
      { key: "B", text: "Ocurred" },
      { key: "C", text: "Occurred" },
      { key: "D", text: "Ocurred" },
    ],
    answerKey: "C",
    solution: "Past tense of 'occur' doubles the final 'r' before -ed: 'occurred' (double c, double r).",
    tags: ["spelling"],
  },

  // ── Idioms (5) ───────────────────────────────────────────────────────
  {
    topicCode: "eng.idioms",
    difficulty: "EASY",
    body: "What does the idiom 'a piece of cake' mean?",
    options: [
      { key: "A", text: "Something delicious" },
      { key: "B", text: "Something very easy" },
      { key: "C", text: "A small portion" },
      { key: "D", text: "A reward" },
    ],
    answerKey: "B",
    solution: "'A piece of cake' is an idiom meaning something very easy to do.",
    tags: ["idiom"],
  },
  {
    topicCode: "eng.idioms",
    difficulty: "EASY",
    body: "What does the idiom 'to break the ice' mean?",
    options: [
      { key: "A", text: "To start a quarrel" },
      { key: "B", text: "To begin a conversation in a tense or formal situation" },
      { key: "C", text: "To make ice cubes" },
      { key: "D", text: "To end a relationship" },
    ],
    answerKey: "B",
    solution:
      "'To break the ice' means to do or say something to relieve tension and start a conversation.",
    tags: ["idiom"],
  },
  {
    topicCode: "eng.idioms",
    difficulty: "MEDIUM",
    body: "What does the idiom 'to bite the bullet' mean?",
    options: [
      { key: "A", text: "To eat quickly" },
      { key: "B", text: "To accept something difficult and face it bravely" },
      { key: "C", text: "To shoot someone" },
      { key: "D", text: "To remain silent" },
    ],
    answerKey: "B",
    solution:
      "'To bite the bullet' means to endure a painful or difficult situation with courage.",
    tags: ["idiom"],
  },
  {
    topicCode: "eng.idioms",
    difficulty: "MEDIUM",
    body: "What does 'to let the cat out of the bag' mean?",
    options: [
      { key: "A", text: "To free an animal" },
      { key: "B", text: "To reveal a secret" },
      { key: "C", text: "To make a mistake" },
      { key: "D", text: "To win an argument" },
    ],
    answerKey: "B",
    solution: "'To let the cat out of the bag' means to disclose a secret carelessly or by mistake.",
    tags: ["idiom"],
  },
  {
    topicCode: "eng.idioms",
    difficulty: "HARD",
    body: "What does the idiom 'to burn the midnight oil' mean?",
    options: [
      { key: "A", text: "To waste resources" },
      { key: "B", text: "To work or study late into the night" },
      { key: "C", text: "To celebrate a festival" },
      { key: "D", text: "To take a break" },
    ],
    answerKey: "B",
    solution: "'To burn the midnight oil' means to stay up late working or studying.",
    tags: ["idiom"],
  },

  // ── One Word Substitution (5) ────────────────────────────────────────
  {
    topicCode: "eng.one_word",
    difficulty: "EASY",
    body: "One who cannot read or write:",
    options: [
      { key: "A", text: "Ignorant" },
      { key: "B", text: "Illiterate" },
      { key: "C", text: "Innocent" },
      { key: "D", text: "Indifferent" },
    ],
    answerKey: "B",
    solution: "'Illiterate' specifically means unable to read or write.",
    tags: ["one-word"],
  },
  {
    topicCode: "eng.one_word",
    difficulty: "EASY",
    body: "A speech delivered without preparation:",
    options: [
      { key: "A", text: "Lecture" },
      { key: "B", text: "Address" },
      { key: "C", text: "Extempore" },
      { key: "D", text: "Recital" },
    ],
    answerKey: "C",
    solution: "'Extempore' means spoken without preparation, on the spur of the moment.",
    tags: ["one-word"],
  },
  {
    topicCode: "eng.one_word",
    difficulty: "MEDIUM",
    body: "A person who walks on foot:",
    options: [
      { key: "A", text: "Driver" },
      { key: "B", text: "Pedestrian" },
      { key: "C", text: "Traveller" },
      { key: "D", text: "Pilgrim" },
    ],
    answerKey: "B",
    solution: "'Pedestrian' is the specific word for a person who walks (especially on a road).",
    tags: ["one-word"],
  },
  {
    topicCode: "eng.one_word",
    difficulty: "MEDIUM",
    body: "A government by the people, for the people, of the people:",
    options: [
      { key: "A", text: "Monarchy" },
      { key: "B", text: "Aristocracy" },
      { key: "C", text: "Democracy" },
      { key: "D", text: "Oligarchy" },
    ],
    answerKey: "C",
    solution:
      "Democracy literally means 'rule by the people' — Lincoln's famous definition matches.",
    tags: ["one-word"],
  },
  {
    topicCode: "eng.one_word",
    difficulty: "HARD",
    body: "A medicine that brings about insensitivity to pain:",
    options: [
      { key: "A", text: "Antidote" },
      { key: "B", text: "Anaesthetic" },
      { key: "C", text: "Antibiotic" },
      { key: "D", text: "Analgesic" },
    ],
    answerKey: "B",
    solution:
      "'Anaesthetic' produces full insensitivity to pain (often loss of consciousness). 'Analgesic' relieves pain but is narrower.",
    tags: ["one-word"],
  },

  // ── Error Spotting (5) ───────────────────────────────────────────────
  {
    topicCode: "eng.error_spotting",
    difficulty: "EASY",
    body: "Identify the part with an error: 'He don't / know / the answer / to this question.'",
    options: [
      { key: "A", text: "He don't" },
      { key: "B", text: "know" },
      { key: "C", text: "the answer" },
      { key: "D", text: "to this question" },
    ],
    answerKey: "A",
    solution: "Subject 'He' is third-person singular; the correct form is 'He doesn't', not 'He don't'.",
    tags: ["subject-verb-agreement"],
  },
  {
    topicCode: "eng.error_spotting",
    difficulty: "MEDIUM",
    body:
      "Identify the part with an error: 'Each of the students / have submitted / their assignments / on time.'",
    options: [
      { key: "A", text: "Each of the students" },
      { key: "B", text: "have submitted" },
      { key: "C", text: "their assignments" },
      { key: "D", text: "on time" },
    ],
    answerKey: "B",
    solution:
      "'Each' is singular and takes a singular verb. The correct form is 'has submitted', not 'have submitted'.",
    tags: ["subject-verb-agreement"],
  },
  {
    topicCode: "eng.error_spotting",
    difficulty: "MEDIUM",
    body:
      "Identify the part with an error: 'The teacher gave / the prize / to my brother and I / for our hard work.'",
    options: [
      { key: "A", text: "The teacher gave" },
      { key: "B", text: "the prize" },
      { key: "C", text: "to my brother and I" },
      { key: "D", text: "for our hard work" },
    ],
    answerKey: "C",
    solution:
      "After the preposition 'to', the object pronoun is needed: 'to my brother and me' (not 'I').",
    tags: ["pronoun-case"],
  },
  {
    topicCode: "eng.error_spotting",
    difficulty: "MEDIUM",
    body:
      "Identify the part with an error: 'She is / one of the / most intelligent girl / in the class.'",
    options: [
      { key: "A", text: "She is" },
      { key: "B", text: "one of the" },
      { key: "C", text: "most intelligent girl" },
      { key: "D", text: "in the class" },
    ],
    answerKey: "C",
    solution:
      "After 'one of the' a plural noun is required: 'most intelligent girls' (not 'girl').",
    tags: ["plural-after-one-of"],
  },
  {
    topicCode: "eng.error_spotting",
    difficulty: "HARD",
    body:
      "Identify the part with an error: 'The committee are / divided in / their opinions / about the new proposal.'",
    options: [
      { key: "A", text: "The committee are" },
      { key: "B", text: "divided in" },
      { key: "C", text: "their opinions" },
      { key: "D", text: "about the new proposal" },
    ],
    answerKey: "B",
    solution:
      "The correct preposition is 'divided over' or 'divided on' (their opinions). 'Divided in' is non-idiomatic in this sense.",
    tags: ["preposition"],
  },

  // ── Sentence Improvement (4) ─────────────────────────────────────────
  {
    topicCode: "eng.sentence_improvement",
    difficulty: "EASY",
    body:
      "Choose the best alternative to the underlined part: 'He <u>have been</u> working here since 2010.'",
    options: [
      { key: "A", text: "have been" },
      { key: "B", text: "has been" },
      { key: "C", text: "is" },
      { key: "D", text: "had been" },
    ],
    answerKey: "B",
    solution:
      "Subject 'He' is third-person singular and the action continues from 2010 to now (present perfect continuous): 'has been'.",
    tags: ["tense"],
  },
  {
    topicCode: "eng.sentence_improvement",
    difficulty: "MEDIUM",
    body:
      "Choose the best alternative to the underlined part: 'I prefer tea <u>than</u> coffee.'",
    options: [
      { key: "A", text: "than" },
      { key: "B", text: "to" },
      { key: "C", text: "over" },
      { key: "D", text: "from" },
    ],
    answerKey: "B",
    solution: "'Prefer' takes 'to' for comparison: 'prefer X to Y'.",
    tags: ["preposition"],
  },
  {
    topicCode: "eng.sentence_improvement",
    difficulty: "MEDIUM",
    body:
      "Choose the best alternative to the underlined part: 'If I <u>was</u> you, I would apologise.'",
    options: [
      { key: "A", text: "was" },
      { key: "B", text: "were" },
      { key: "C", text: "am" },
      { key: "D", text: "had been" },
    ],
    answerKey: "B",
    solution:
      "Subjunctive mood for hypothetical situations uses 'were' for all subjects: 'If I were you'.",
    tags: ["subjunctive"],
  },
  {
    topicCode: "eng.sentence_improvement",
    difficulty: "EASY",
    body:
      "Choose the best alternative to the underlined part: 'She <u>don't</u> like spicy food.'",
    options: [
      { key: "A", text: "don't" },
      { key: "B", text: "doesn't" },
      { key: "C", text: "didn't" },
      { key: "D", text: "isn't" },
    ],
    answerKey: "B",
    solution: "Third-person singular 'She' takes 'doesn't' (does + not).",
    tags: ["subject-verb-agreement"],
  },

  // ── Fill in the Blanks (5) ───────────────────────────────────────────
  {
    topicCode: "eng.fill_blanks",
    difficulty: "EASY",
    body: "Fill in the blank: 'The book ____ on the table is mine.'",
    options: [
      { key: "A", text: "lies" },
      { key: "B", text: "lying" },
      { key: "C", text: "lay" },
      { key: "D", text: "laid" },
    ],
    answerKey: "B",
    solution:
      "A reduced relative clause uses the present participle: 'lying' (= 'which is lying').",
    tags: ["participle"],
  },
  {
    topicCode: "eng.fill_blanks",
    difficulty: "EASY",
    body: "Fill in the blank: 'He has been waiting ____ two hours.'",
    options: [
      { key: "A", text: "since" },
      { key: "B", text: "for" },
      { key: "C", text: "from" },
      { key: "D", text: "by" },
    ],
    answerKey: "B",
    solution: "'For' is used with periods of time; 'since' is used with points in time.",
    tags: ["preposition-time"],
  },
  {
    topicCode: "eng.fill_blanks",
    difficulty: "MEDIUM",
    body: "Fill in the blank: 'She is good ____ painting.'",
    options: [
      { key: "A", text: "in" },
      { key: "B", text: "at" },
      { key: "C", text: "with" },
      { key: "D", text: "on" },
    ],
    answerKey: "B",
    solution: "'Good at' is the standard collocation when expressing skill.",
    tags: ["preposition"],
  },
  {
    topicCode: "eng.fill_blanks",
    difficulty: "MEDIUM",
    body: "Fill in the blank: 'I can't help ____ when I see this film.'",
    options: [
      { key: "A", text: "to laugh" },
      { key: "B", text: "laughing" },
      { key: "C", text: "laugh" },
      { key: "D", text: "laughed" },
    ],
    answerKey: "B",
    solution: "'Can't help' is followed by a gerund: 'can't help laughing'.",
    tags: ["gerund"],
  },
  {
    topicCode: "eng.fill_blanks",
    difficulty: "MEDIUM",
    body: "Fill in the blank: 'Neither the teacher nor the students ____ aware of the change.'",
    options: [
      { key: "A", text: "is" },
      { key: "B", text: "was" },
      { key: "C", text: "are" },
      { key: "D", text: "has" },
    ],
    answerKey: "C",
    solution:
      "With 'neither … nor', the verb agrees with the noun closest to it. 'Students' is plural ⇒ 'are'.",
    tags: ["proximity-rule"],
  },

  // ── Active and Passive Voice (3) ─────────────────────────────────────
  {
    topicCode: "eng.active_passive",
    difficulty: "EASY",
    body: "Convert to passive voice: 'The teacher praised the student.'",
    options: [
      { key: "A", text: "The student is praised by the teacher." },
      { key: "B", text: "The student was praised by the teacher." },
      { key: "C", text: "The student has been praised by the teacher." },
      { key: "D", text: "The student is being praised by the teacher." },
    ],
    answerKey: "B",
    solution:
      "The verb 'praised' is simple past. Passive form keeps the same tense: 'was praised by the teacher'.",
    tags: ["voice-conversion"],
  },
  {
    topicCode: "eng.active_passive",
    difficulty: "MEDIUM",
    body: "Convert to passive voice: 'Someone has stolen my bicycle.'",
    options: [
      { key: "A", text: "My bicycle was stolen." },
      { key: "B", text: "My bicycle has been stolen." },
      { key: "C", text: "My bicycle is stolen." },
      { key: "D", text: "My bicycle had been stolen." },
    ],
    answerKey: "B",
    solution:
      "Present perfect 'has stolen' becomes 'has been stolen'. The agent ('someone') is usually dropped.",
    tags: ["voice-conversion"],
  },
  {
    topicCode: "eng.active_passive",
    difficulty: "MEDIUM",
    body: "Convert to active voice: 'The letter is being written by Sita.'",
    options: [
      { key: "A", text: "Sita writes the letter." },
      { key: "B", text: "Sita is writing the letter." },
      { key: "C", text: "Sita has written the letter." },
      { key: "D", text: "Sita wrote the letter." },
    ],
    answerKey: "B",
    solution:
      "Present continuous passive ('is being written') becomes present continuous active ('is writing').",
    tags: ["voice-conversion"],
  },

  // ── Direct and Indirect Speech (3) ───────────────────────────────────
  {
    topicCode: "eng.direct_indirect",
    difficulty: "EASY",
    body: "Convert to indirect speech: She said, 'I am happy.'",
    options: [
      { key: "A", text: "She said that she is happy." },
      { key: "B", text: "She said that she was happy." },
      { key: "C", text: "She said that I am happy." },
      { key: "D", text: "She told that she is happy." },
    ],
    answerKey: "B",
    solution:
      "Reporting verb in past tense → present tense in direct speech shifts back to past: 'am' → 'was'. Pronoun 'I' becomes 'she'.",
    tags: ["reported-speech"],
  },
  {
    topicCode: "eng.direct_indirect",
    difficulty: "MEDIUM",
    body: "Convert to indirect speech: He said, 'I will go to Delhi tomorrow.'",
    options: [
      { key: "A", text: "He said that he will go to Delhi tomorrow." },
      { key: "B", text: "He said that he would go to Delhi the next day." },
      { key: "C", text: "He says that he would go to Delhi tomorrow." },
      { key: "D", text: "He told that he will go to Delhi tomorrow." },
    ],
    answerKey: "B",
    solution:
      "'will' → 'would'; 'tomorrow' → 'the next day'; 'I' → 'he'. Reporting verb is past, so future in past.",
    tags: ["reported-speech"],
  },
  {
    topicCode: "eng.direct_indirect",
    difficulty: "MEDIUM",
    body: "Convert to indirect speech: The teacher said to the student, 'Where do you live?'",
    options: [
      { key: "A", text: "The teacher asked the student where he lived." },
      { key: "B", text: "The teacher said to the student where did he live." },
      { key: "C", text: "The teacher told the student where do you live." },
      { key: "D", text: "The teacher asked the student where did he live." },
    ],
    answerKey: "A",
    solution:
      "Wh-question becomes a noun-clause statement: 'where he lived' (no inversion). Reporting verb shifts present → past.",
    tags: ["reported-speech"],
  },

  // ── Cloze Test (2 — passage with two questions) ──────────────────────
  {
    topicCode: "eng.cloze",
    difficulty: "MEDIUM",
    body:
      "Cloze passage: 'Reading is one of the (1)____ habits a student can develop. It (2)____ vocabulary, improves comprehension and broadens the mind.' \nFill blank (1):",
    options: [
      { key: "A", text: "worst" },
      { key: "B", text: "best" },
      { key: "C", text: "old" },
      { key: "D", text: "rare" },
    ],
    answerKey: "B",
    solution:
      "Context praises reading ('improves vocabulary, broadens the mind'). Positive adjective fits: 'best'.",
    tags: ["cloze"],
  },
  {
    topicCode: "eng.cloze",
    difficulty: "MEDIUM",
    body:
      "Cloze passage: 'Reading is one of the best habits a student can develop. It (2)____ vocabulary, improves comprehension and broadens the mind.' \nFill blank (2):",
    options: [
      { key: "A", text: "destroys" },
      { key: "B", text: "expands" },
      { key: "C", text: "ignores" },
      { key: "D", text: "removes" },
    ],
    answerKey: "B",
    solution:
      "Parallel positive verbs ('improves', 'broadens') require a positive verb here. 'Expands vocabulary' fits.",
    tags: ["cloze"],
  },

  // ── Reading Comprehension (3 — same passage) ─────────────────────────
  {
    topicCode: "eng.comprehension",
    difficulty: "MEDIUM",
    body:
      "Passage: 'Mahatma Gandhi led India's independence movement against British rule. He believed firmly in non-violence and civil disobedience. His campaign of Satyagraha inspired movements for civil rights and freedom across the world.' \n\nQ: What was Gandhi's primary belief in his fight against British rule?",
    options: [
      { key: "A", text: "Armed revolution" },
      { key: "B", text: "Non-violence and civil disobedience" },
      { key: "C", text: "Economic boycott alone" },
      { key: "D", text: "Negotiation with the British monarchy" },
    ],
    answerKey: "B",
    solution: "The passage states clearly that Gandhi 'believed firmly in non-violence and civil disobedience.'",
    tags: ["rc"],
  },
  {
    topicCode: "eng.comprehension",
    difficulty: "EASY",
    body:
      "Passage (same as previous): 'Mahatma Gandhi led India's independence movement against British rule. He believed firmly in non-violence and civil disobedience. His campaign of Satyagraha inspired movements for civil rights and freedom across the world.' \n\nQ: What does the word 'Satyagraha' refer to in the passage?",
    options: [
      { key: "A", text: "An armed campaign" },
      { key: "B", text: "Gandhi's movement based on non-violent resistance" },
      { key: "C", text: "A school he founded" },
      { key: "D", text: "A British policy" },
    ],
    answerKey: "B",
    solution:
      "From context, Satyagraha is described as Gandhi's campaign — i.e., his non-violent resistance movement.",
    tags: ["rc"],
  },
  {
    topicCode: "eng.comprehension",
    difficulty: "MEDIUM",
    body:
      "Passage (same as previous): 'Mahatma Gandhi led India's independence movement against British rule. He believed firmly in non-violence and civil disobedience. His campaign of Satyagraha inspired movements for civil rights and freedom across the world.' \n\nQ: According to the passage, Gandhi's influence was:",
    options: [
      { key: "A", text: "Limited to India" },
      { key: "B", text: "Felt across the world" },
      { key: "C", text: "Restricted to Asia" },
      { key: "D", text: "Confined to British colonies" },
    ],
    answerKey: "B",
    solution:
      "The passage says his Satyagraha inspired movements 'across the world' — i.e., global influence.",
    tags: ["rc"],
  },

  // ── Para Jumbles (2) ─────────────────────────────────────────────────
  {
    topicCode: "eng.para_jumble",
    difficulty: "MEDIUM",
    body:
      "Arrange the sentences in the correct order:\n(P) He decided to take an umbrella.\n(Q) Ravi looked out of the window.\n(R) It was raining heavily.\n(S) He didn't want to get wet on the way to school.",
    options: [
      { key: "A", text: "Q R S P" },
      { key: "B", text: "Q R P S" },
      { key: "C", text: "R Q P S" },
      { key: "D", text: "P Q R S" },
    ],
    answerKey: "A",
    solution:
      "Q (he looks out) → R (sees rain) → S (he doesn't want to get wet) → P (so he takes an umbrella).",
    tags: ["sequencing"],
  },
  {
    topicCode: "eng.para_jumble",
    difficulty: "MEDIUM",
    body:
      "Arrange the sentences in the correct order:\n(P) The phone rang loudly.\n(Q) Maya was reading a book in her room.\n(R) She quickly picked it up.\n(S) The voice on the other end was her mother's.",
    options: [
      { key: "A", text: "Q P R S" },
      { key: "B", text: "P Q R S" },
      { key: "C", text: "Q R P S" },
      { key: "D", text: "P R Q S" },
    ],
    answerKey: "A",
    solution:
      "Q (she's reading) → P (the phone rings) → R (she picks up) → S (it's her mother). Standard cause-effect chain.",
    tags: ["sequencing"],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────
export async function seedSscCglEnglishQuestions() {
  const exam = await prisma.exam.findUnique({ where: { code: "SSC_CGL" } });
  if (!exam) throw new Error("Run seedExams() first.");

  const subject = await prisma.subject.findUnique({
    where: { examId_code: { examId: exam.id, code: "ENGLISH" } },
  });
  if (!subject)
    throw new Error("Run seedSscCglSyllabus() first — ENGLISH subject not found.");

  const topics = await prisma.topic.findMany({ where: { subjectId: subject.id } });
  const topicMap = new Map(topics.map((t) => [t.code, t.id]));

  console.log(`Seeding ${sscCglEnglishQuestions.length} SSC CGL English questions...`);
  let created = 0,
    skipped = 0;
  for (const q of sscCglEnglishQuestions) {
    const topicId = topicMap.get(q.topicCode);
    if (!topicId) {
      console.warn(`  ⚠ Skipping question for unknown topic ${q.topicCode}`);
      skipped++;
      continue;
    }
    await prisma.question.create({
      data: {
        examId: exam.id,
        topicId,
        type: q.type ?? "MCQ",
        difficulty: q.difficulty,
        body: q.body,
        options: q.options,
        answerKey: q.answerKey,
        solution: q.solution,
        language: q.language ?? "EN",
        source: "AI_GENERATED" as QuestionSource,
        validated: false,
        tags: q.tags ?? [],
        metadata: { generator: "claude-sonnet-4-5", batch: "ssc-cgl-english-v1" },
      },
    });
    created++;
  }
  console.log(`Done. Created ${created}, skipped ${skipped}.`);
  console.log("All questions are flagged validated:false — SME review required before going live.");
}

if (require.main === module) {
  seedSscCglEnglishQuestions()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
