// CTET Paper 1 (Class 1–5) — full syllabus tree.
// 5 subjects × 30 questions each = 150 questions × 1 mark = 150 marks in 150 minutes.
// No negative marking. Source: official CBSE/CTET syllabus PDF (ctet.nic.in).
// Cross-checked against the official CTET Information Bulletin and Adda247/BYJU's.
// Subjects: Child Development & Pedagogy, Language I, Language II, Mathematics, EVS.
//
// Run after seedExams: npx tsx seed/exams/ctet-syllabus.ts

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

export const ctetSyllabus: SubjectSeed[] = [
  // ── CHILD DEVELOPMENT & PEDAGOGY ──────────────────────────────────────
  {
    code: "CHILD_DEV",
    name: "Child Development and Pedagogy",
    weight: 1,
    topics: [
      { code: "cdp.child_development", name: "Child Development (Primary School Child)",
        description: "Concepts, principles and dimensions of child development relevant to ages 6–11.",
        subtopics: [
          { code: "cdp.child_development.concept", name: "Concept of Development & Relationship with Learning", description: "Definition of development, its principles, and how it influences learning at the primary stage." },
          { code: "cdp.child_development.principles", name: "Principles of Development of Children", description: "Continuous, sequential, individual-difference and cephalocaudal/proximodistal principles." },
          { code: "cdp.child_development.heredity_environment", name: "Influence of Heredity and Environment", description: "Nature vs nurture, role of family, school, peers, culture in shaping development." },
          { code: "cdp.child_development.socialization", name: "Socialisation Processes", description: "Social world and children — teachers, parents, peers and their roles." },
          { code: "cdp.child_development.piaget_kohlberg_vygotsky", name: "Piaget, Kohlberg and Vygotsky", description: "Constructs and critical perspectives on the cognitive (Piaget), moral (Kohlberg) and socio-cultural (Vygotsky) theories." },
          { code: "cdp.child_development.child_centred", name: "Concepts of Child-centred and Progressive Education", description: "NCF-aligned child-centred pedagogy and progressive-school philosophy." },
          { code: "cdp.child_development.intelligence", name: "Critical Perspective on Construct of Intelligence", description: "Single vs multiple intelligence, IQ critique." },
          { code: "cdp.child_development.multidim_intelligence", name: "Multi-Dimensional Intelligence", description: "Gardner's theory of multiple intelligences and classroom implications." },
          { code: "cdp.child_development.language_thought", name: "Language and Thought", description: "Relationship between language acquisition and cognitive development." },
          { code: "cdp.child_development.gender", name: "Gender as a Social Construct", description: "Gender roles, gender bias and educational practice." },
          { code: "cdp.child_development.individual_differences", name: "Individual Differences among Learners", description: "Differences based on language, caste, gender, community, religion and ability." },
          { code: "cdp.child_development.assessment", name: "Distinction between Assessment for Learning and Assessment of Learning", description: "Formative vs summative assessment in primary classrooms." },
          { code: "cdp.child_development.cce", name: "School-based Assessment & Continuous Comprehensive Evaluation", description: "CCE perspective, practice and tools." },
          { code: "cdp.child_development.questioning", name: "Formulating Appropriate Questions", description: "Questions to assess readiness, enhance learning and develop critical thinking." },
        ],
      },
      { code: "cdp.inclusive_education", name: "Concept of Inclusive Education and Understanding Children with Special Needs",
        description: "Addressing diverse learners and ensuring inclusive classrooms.",
        subtopics: [
          { code: "cdp.inclusive_education.disadvantaged", name: "Addressing Learners from Diverse Backgrounds", description: "Children from disadvantaged and deprived backgrounds, including SC/ST/minority/migrant learners." },
          { code: "cdp.inclusive_education.learning_difficulties", name: "Addressing Learners with Difficulties / Disabilities / Impairment", description: "Identifying and supporting children with learning difficulties such as dyslexia, dysgraphia, ADHD." },
          { code: "cdp.inclusive_education.talented", name: "Addressing the Talented, Creative & Specially-abled Learners", description: "Differentiated strategies for gifted and creative children." },
        ],
      },
      { code: "cdp.learning_pedagogy", name: "Learning and Pedagogy",
        description: "How children think and learn, and the implications for teaching.",
        subtopics: [
          { code: "cdp.learning_pedagogy.how_children_think", name: "How Children Think and Learn", description: "Why and how children fail to achieve success at school." },
          { code: "cdp.learning_pedagogy.basic_processes", name: "Basic Processes of Teaching and Learning", description: "Children's strategies of learning, learning as a social activity." },
          { code: "cdp.learning_pedagogy.child_problem_solver", name: "Child as a Problem Solver and Scientific Investigator", description: "View of child as constructor of knowledge." },
          { code: "cdp.learning_pedagogy.alternative_concepts", name: "Alternative Conceptions of Learning", description: "Children's errors as significant steps in the learning process." },
          { code: "cdp.learning_pedagogy.cognition_emotion", name: "Cognition and Emotion", description: "Role of emotion in cognition and learning." },
          { code: "cdp.learning_pedagogy.motivation", name: "Motivation and Learning", description: "Intrinsic and extrinsic motivation; theories of motivation." },
          { code: "cdp.learning_pedagogy.factors", name: "Factors Contributing to Learning – Personal & Environmental", description: "Heredity, attitude, attention, environment and their effect on learning." },
        ],
      },
    ],
  },

  // ── LANGUAGE I ────────────────────────────────────────────────────────
  {
    code: "LANG1",
    name: "Language I",
    weight: 1,
    topics: [
      { code: "lang1.comprehension", name: "Language Comprehension",
        description: "Two unseen passages — one prose/drama and one poem — with comprehension, inference, grammar and vocabulary questions.",
        subtopics: [
          { code: "lang1.comprehension.prose", name: "Unseen Prose / Drama Passage", description: "Comprehension and inference from a prose or drama excerpt." },
          { code: "lang1.comprehension.poem", name: "Unseen Poem", description: "Comprehension, literary devices and inference from a poem." },
          { code: "lang1.comprehension.grammar", name: "Grammar and Verbal Ability", description: "Grammar, vocabulary and verbal-ability questions tied to the passages." },
        ],
      },
      { code: "lang1.pedagogy", name: "Pedagogy of Language Development",
        description: "Pedagogical concepts for teaching the chosen Language I at the primary stage.",
        subtopics: [
          { code: "lang1.pedagogy.learning_acquisition", name: "Learning and Acquisition", description: "Difference between language acquisition and learning; Krashen's principles." },
          { code: "lang1.pedagogy.principles", name: "Principles of Language Teaching", description: "Key principles guiding primary-level language instruction." },
          { code: "lang1.pedagogy.listening_speaking", name: "Role of Listening and Speaking", description: "Function of language and how children use it as a tool of thought." },
          { code: "lang1.pedagogy.grammar_role", name: "Critical Perspective on the Role of Grammar", description: "How grammar is acquired in spoken and written communication." },
          { code: "lang1.pedagogy.diverse_classroom", name: "Challenges of Teaching in a Diverse Classroom", description: "Language difficulties, errors and disorders in multilingual classrooms." },
          { code: "lang1.pedagogy.skills", name: "Language Skills", description: "Listening, speaking, reading and writing — integration in the primary classroom." },
          { code: "lang1.pedagogy.assessment", name: "Evaluating Language Comprehension and Proficiency", description: "Speaking, listening, reading and writing assessment techniques." },
          { code: "lang1.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbook, multimedia materials, multilingual resource of the classroom." },
          { code: "lang1.pedagogy.remedial", name: "Remedial Teaching", description: "Identifying language-learning gaps and remedial strategies." },
        ],
      },
    ],
  },

  // ── LANGUAGE II ───────────────────────────────────────────────────────
  {
    code: "LANG2",
    name: "Language II",
    weight: 1,
    topics: [
      { code: "lang2.comprehension", name: "Comprehension",
        description: "Two unseen prose passages (discursive or literary or narrative or scientific) with comprehension, grammar and verbal-ability questions.",
        subtopics: [
          { code: "lang2.comprehension.passage1", name: "Unseen Passage – Discursive / Literary", description: "Comprehension and inference of the first passage." },
          { code: "lang2.comprehension.passage2", name: "Unseen Passage – Narrative / Scientific", description: "Comprehension and inference of the second passage." },
          { code: "lang2.comprehension.grammar", name: "Grammar and Verbal Ability", description: "Grammar, vocabulary and verbal-ability items based on the passages." },
        ],
      },
      { code: "lang2.pedagogy", name: "Pedagogy of Language Development",
        description: "Same pedagogical framework as Language I but applied to Language II at primary level.",
        subtopics: [
          { code: "lang2.pedagogy.learning_acquisition", name: "Learning and Acquisition", description: "Distinction between acquisition and learning; second-language pedagogy." },
          { code: "lang2.pedagogy.principles", name: "Principles of Second-Language Teaching", description: "Principles guiding the teaching of Language II." },
          { code: "lang2.pedagogy.listening_speaking", name: "Role of Listening and Speaking", description: "Listening and speaking as foundation of Language II." },
          { code: "lang2.pedagogy.grammar_role", name: "Role of Grammar in Learning a Language", description: "Function of grammar in communication." },
          { code: "lang2.pedagogy.diverse_classroom", name: "Challenges of Teaching Language in a Diverse Classroom", description: "Errors, disorders and difficulties in second-language acquisition." },
          { code: "lang2.pedagogy.skills", name: "Language Skills (LSRW)", description: "Listening, speaking, reading and writing for Language II." },
          { code: "lang2.pedagogy.assessment", name: "Evaluating Language Comprehension and Proficiency", description: "Assessment of LSRW skills in Language II." },
          { code: "lang2.pedagogy.materials", name: "Teaching-Learning Materials", description: "Textbook, multi-media materials, multilingual resource of the classroom." },
          { code: "lang2.pedagogy.remedial", name: "Remedial Teaching", description: "Strategies to address gaps in second-language learning." },
        ],
      },
    ],
  },

  // ── MATHEMATICS ───────────────────────────────────────────────────────
  {
    code: "MATHS",
    name: "Mathematics",
    weight: 1,
    topics: [
      { code: "math.content", name: "Content",
        description: "Mathematics content from NCERT Classes I–V.",
        subtopics: [
          { code: "math.content.geometry", name: "Geometry", description: "Basic geometry — points, lines, angles in primary mathematics." },
          { code: "math.content.shapes_spatial", name: "Shapes and Spatial Understanding", description: "2D and 3D shapes, position, direction, spatial relationships." },
          { code: "math.content.solids", name: "Solids around Us", description: "3D objects like cube, cuboid, cylinder, cone, sphere in everyday life." },
          { code: "math.content.numbers", name: "Numbers", description: "Numbers up to 6 digits, place value, comparison, operations." },
          { code: "math.content.add_sub", name: "Addition and Subtraction", description: "Addition and subtraction with regrouping; word problems." },
          { code: "math.content.multiplication", name: "Multiplication", description: "Multiplication tables, multi-digit multiplication and word problems." },
          { code: "math.content.division", name: "Division", description: "Division with and without remainder; word problems." },
          { code: "math.content.measurement", name: "Measurement", description: "Length, distance and standard units of measurement." },
          { code: "math.content.weight", name: "Weight", description: "Mass / weight measurement using grams and kilograms." },
          { code: "math.content.time", name: "Time", description: "Reading clocks, calendar, durations, time-table problems." },
          { code: "math.content.volume", name: "Volume / Capacity", description: "Capacity in litres and millilitres; comparison of volumes." },
          { code: "math.content.data_handling", name: "Data Handling", description: "Pictographs, bar graphs and tables — collecting and reading data." },
          { code: "math.content.patterns", name: "Patterns", description: "Number, shape and growing patterns; symmetry." },
          { code: "math.content.money", name: "Money", description: "Indian currency, conversions, simple word problems on money." },
          { code: "math.content.fractions", name: "Fractions", description: "Concept of fractions, equivalent fractions and basic operations." },
        ],
      },
      { code: "math.pedagogy", name: "Pedagogical Issues",
        description: "Pedagogy of teaching mathematics at the primary stage.",
        subtopics: [
          { code: "math.pedagogy.nature", name: "Nature of Mathematics / Logical Thinking", description: "Understanding children's thinking and reasoning patterns; how to make meaning of and understand mathematics." },
          { code: "math.pedagogy.curriculum", name: "Place of Mathematics in Curriculum", description: "Role and importance of mathematics in the primary curriculum." },
          { code: "math.pedagogy.language", name: "Language of Mathematics", description: "Use of mathematical vocabulary, symbols and discourse." },
          { code: "math.pedagogy.community", name: "Community Mathematics", description: "Drawing upon children's everyday and community experiences." },
          { code: "math.pedagogy.evaluation", name: "Evaluation through Formal and Informal Methods", description: "Tools and approaches for evaluating mathematical learning." },
          { code: "math.pedagogy.problems_teaching", name: "Problems of Teaching", description: "Common difficulties faced while teaching mathematics at the primary level." },
          { code: "math.pedagogy.error_analysis", name: "Error Analysis", description: "Analysing children's errors and using them as opportunities for learning." },
          { code: "math.pedagogy.diagnostic", name: "Diagnostic and Remedial Teaching", description: "Identifying and addressing learning gaps in mathematics." },
        ],
      },
    ],
  },

  // ── ENVIRONMENTAL STUDIES ─────────────────────────────────────────────
  {
    code: "EVS",
    name: "Environmental Studies",
    weight: 1,
    topics: [
      { code: "evs.content", name: "Content",
        description: "EVS content from NCERT Classes III–V — six themes.",
        subtopics: [
          { code: "evs.content.family_friends", name: "Family and Friends", description: "Relationships, work and play, animals and plants in everyday life." },
          { code: "evs.content.relationships", name: "Relationships", description: "Family relations, friends, neighbours and community." },
          { code: "evs.content.work_play", name: "Work and Play", description: "Different occupations, sports, games children encounter." },
          { code: "evs.content.animals_plants", name: "Animals and Plants", description: "Diversity of animals and plants in immediate environment." },
          { code: "evs.content.food", name: "Food", description: "Sources of food, cooking, nutrition, food habits across regions." },
          { code: "evs.content.shelter", name: "Shelter", description: "Types of houses, building materials, animal shelters." },
          { code: "evs.content.water", name: "Water", description: "Sources, uses and conservation of water." },
          { code: "evs.content.travel", name: "Travel", description: "Modes of travel, journeys, transport in different regions." },
          { code: "evs.content.things_we_make", name: "Things We Make and Do", description: "Crafts, tools, technology in daily life." },
        ],
      },
      { code: "evs.pedagogy", name: "Pedagogical Issues",
        description: "Pedagogy of teaching Environmental Studies at the primary stage.",
        subtopics: [
          { code: "evs.pedagogy.concept_scope", name: "Concept and Scope of EVS", description: "Definition, importance and scope of environmental studies." },
          { code: "evs.pedagogy.significance", name: "Significance of EVS / Integrated EVS", description: "Why EVS is taught as an integrated subject combining science and social science." },
          { code: "evs.pedagogy.environmental_studies_education", name: "Environmental Studies & Environmental Education", description: "Distinction between environmental studies and environmental education." },
          { code: "evs.pedagogy.learning_principles", name: "Learning Principles", description: "Constructivist learning principles applied to EVS." },
          { code: "evs.pedagogy.science_social_relation", name: "Scope and Relation to Science and Social Science", description: "Integrated approach drawing from natural and social sciences." },
          { code: "evs.pedagogy.approaches", name: "Approaches of Presenting Concepts", description: "Theme-based, activity-based and inquiry approaches." },
          { code: "evs.pedagogy.activities", name: "Activities", description: "Hands-on activities, projects and field work." },
          { code: "evs.pedagogy.experimentation", name: "Experimentation / Practical Work", description: "Simple experiments and observations in EVS." },
          { code: "evs.pedagogy.discussion", name: "Discussion", description: "Use of discussion as a teaching method in EVS." },
          { code: "evs.pedagogy.cce", name: "CCE in EVS", description: "Continuous and Comprehensive Evaluation in EVS." },
          { code: "evs.pedagogy.teaching_aids", name: "Teaching Material / Aids", description: "Use of charts, models, videos and field trips." },
          { code: "evs.pedagogy.problems", name: "Problems of Teaching EVS", description: "Common challenges in EVS instruction at the primary level." },
        ],
      },
    ],
  },
];

export async function seedCtetSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "CTET" } });
  if (!exam) {
    throw new Error("Run seedExams() first — CTET exam not found.");
  }
  console.log(`Seeding CTET (Paper 1) syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < ctetSyllabus.length; sIdx++) {
    const s = ctetSyllabus[sIdx];
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
    console.log(`  ✓ ${s.code} — ${s.topics.length} top-level topics`);
  }
  console.log(`Done. Total topics: ${topicCount}`);
}

if (require.main === module) {
  seedCtetSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
