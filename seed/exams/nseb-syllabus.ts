// NSEB (National Standard Examination in Biology) — full syllabus tree.
// Stage-1 Biology Olympiad. 80 MCQs, 3 hours.
// Scope: Class 11+12 NCERT biology + supplementary olympiad topics with biochem/ecology emphasis.
// Source: HBCSE olympiads.hbcse.tifr.res.in/how-to-prepare/syllabus/ + IAPT NSEB brochure.
//
// Run after seedExams: npx tsx seed/exams/nseb-syllabus.ts

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

export const nsebSyllabus: SubjectSeed[] = [
  {
    code: "BIOLOGY",
    name: "Biology",
    weight: 1,
    topics: [
      // ── DIVERSITY OF LIVING ORGANISMS ──────────────────────────────────
      { code: "bio.diversity", name: "Diversity of Living Organisms",
        description: "Classification systems, taxonomic hierarchy, three domains and five kingdoms.",
        subtopics: [
          { code: "bio.diversity.living_world", name: "The Living World", description: "Characteristics of living things, taxonomic categories and binomial nomenclature." },
          { code: "bio.diversity.kingdoms", name: "Kingdom-level Classification", description: "Monera, Protista, Fungi, Plantae and Animalia — distinguishing features." },
          { code: "bio.diversity.plant_kingdom", name: "Plant Kingdom", description: "Algae, bryophytes, pteridophytes, gymnosperms and angiosperms." },
          { code: "bio.diversity.animal_kingdom", name: "Animal Kingdom", description: "Major phyla up to chordates with key diagnostic features." },
        ],
      },

      // ── STRUCTURAL ORGANIZATION ────────────────────────────────────────
      { code: "bio.structural_organization", name: "Structural Organization in Plants and Animals",
        description: "Morphology of flowering plants, plant anatomy and animal tissues with frog/cockroach as examples.",
        subtopics: [
          { code: "bio.structural_organization.plant_morph", name: "Plant Morphology", description: "Root, stem, leaf, flower, fruit and seed morphology." },
          { code: "bio.structural_organization.plant_anatomy", name: "Plant Anatomy", description: "Tissues, tissue systems and anatomy of dicot/monocot organs." },
          { code: "bio.structural_organization.animal_tissues", name: "Animal Tissues", description: "Epithelial, connective, muscular and nervous tissues with examples." },
        ],
      },

      // ── CELL ─────────────────────────────────────────────────────────────
      { code: "bio.cell", name: "Cell — Structure and Function",
        description: "Cell theory, prokaryote vs eukaryote, organelles, cell cycle, mitosis and meiosis.",
        subtopics: [
          { code: "bio.cell.unit", name: "Cell — The Unit of Life", description: "Cell theory, prokaryotic and eukaryotic cells, organelle structure and function." },
          { code: "bio.cell.biomolecules", name: "Biomolecules", description: "Carbohydrates, lipids, proteins, nucleic acids, enzymes and metabolism basics." },
          { code: "bio.cell.cell_cycle", name: "Cell Cycle and Division", description: "Phases of cell cycle, mitosis, meiosis and significance of meiosis." },
        ],
      },

      // ── PLANT PHYSIOLOGY ────────────────────────────────────────────────
      { code: "bio.plant_physiology", name: "Plant Physiology",
        description: "Transport, mineral nutrition, photosynthesis, respiration, growth and development in plants.",
        subtopics: [
          { code: "bio.plant_physiology.transport", name: "Transport in Plants", description: "Water absorption, ascent of sap, transpiration and phloem transport." },
          { code: "bio.plant_physiology.mineral_nutrition", name: "Mineral Nutrition", description: "Essential elements, deficiency symptoms and nitrogen cycle in plants." },
          { code: "bio.plant_physiology.photosynthesis", name: "Photosynthesis", description: "Light and dark reactions, C3, C4 and CAM pathways and photorespiration." },
          { code: "bio.plant_physiology.respiration", name: "Respiration in Plants", description: "Glycolysis, Krebs cycle, electron transport chain and energy yield." },
          { code: "bio.plant_physiology.growth", name: "Plant Growth and Development", description: "Plant hormones, photoperiodism, vernalisation and seed dormancy." },
        ],
      },

      // ── HUMAN PHYSIOLOGY ───────────────────────────────────────────────
      { code: "bio.human_physiology", name: "Human Physiology",
        description: "Digestion, breathing, body fluids, excretion, locomotion, neural and chemical coordination.",
        subtopics: [
          { code: "bio.human_physiology.digestion", name: "Digestion and Absorption", description: "Alimentary canal, digestive enzymes, absorption and disorders." },
          { code: "bio.human_physiology.breathing", name: "Breathing and Exchange of Gases", description: "Respiratory organs, pulmonary ventilation, gas transport and disorders." },
          { code: "bio.human_physiology.circulation", name: "Body Fluids and Circulation", description: "Blood composition, heart structure, cardiac cycle, ECG and circulation disorders." },
          { code: "bio.human_physiology.excretion", name: "Excretory Products and Their Elimination", description: "Nephron structure, urine formation, regulation and dialysis." },
          { code: "bio.human_physiology.locomotion", name: "Locomotion and Movement", description: "Muscle contraction (sliding-filament theory), skeletal system and joints." },
          { code: "bio.human_physiology.neural", name: "Neural Control and Coordination", description: "Neuron structure, nerve impulse, central and peripheral nervous systems." },
          { code: "bio.human_physiology.endocrine", name: "Chemical Coordination and Integration", description: "Endocrine glands, hormones and feedback regulation." },
        ],
      },

      // ── REPRODUCTION ───────────────────────────────────────────────────
      { code: "bio.reproduction", name: "Reproduction",
        description: "Reproduction in organisms, sexual reproduction in flowering plants, human reproduction, reproductive health.",
        subtopics: [
          { code: "bio.reproduction.flowering", name: "Sexual Reproduction in Flowering Plants", description: "Flower structure, microsporogenesis, megasporogenesis, double fertilisation and seed development." },
          { code: "bio.reproduction.human", name: "Human Reproduction", description: "Male and female reproductive systems, gametogenesis, menstrual cycle, embryogenesis and parturition." },
          { code: "bio.reproduction.health", name: "Reproductive Health", description: "Reproductive health concerns, contraception, STIs and assisted reproductive technologies." },
        ],
      },

      // ── GENETICS AND EVOLUTION ─────────────────────────────────────────
      { code: "bio.genetics", name: "Genetics and Evolution",
        description: "Mendelian and post-Mendelian genetics, molecular basis of inheritance, evolution.",
        subtopics: [
          { code: "bio.genetics.mendelian", name: "Principles of Inheritance", description: "Mendel's laws, incomplete dominance, codominance, multiple alleles and pedigree analysis." },
          { code: "bio.genetics.molecular", name: "Molecular Basis of Inheritance", description: "DNA structure, replication, transcription, translation, gene regulation and Human Genome Project." },
          { code: "bio.genetics.evolution", name: "Evolution", description: "Origin of life, evidences, theories of evolution, Hardy-Weinberg principle and human evolution." },
        ],
      },

      // ── BIOLOGY AND HUMAN WELFARE ──────────────────────────────────────
      { code: "bio.human_welfare", name: "Biology and Human Welfare",
        description: "Health and disease, immunology, microbes, plant and animal husbandry.",
        subtopics: [
          { code: "bio.human_welfare.health", name: "Human Health and Disease", description: "Common diseases, immunity, AIDS, cancer and drug/alcohol abuse." },
          { code: "bio.human_welfare.food_production", name: "Strategies for Food Production", description: "Animal husbandry, plant breeding, single-cell protein and tissue culture." },
          { code: "bio.human_welfare.microbes", name: "Microbes in Human Welfare", description: "Microbes in household, industry, sewage, biogas and biocontrol." },
        ],
      },

      // ── BIOTECHNOLOGY ──────────────────────────────────────────────────
      { code: "bio.biotechnology", name: "Biotechnology",
        description: "Principles, processes and applications of biotechnology including rDNA technology.",
        subtopics: [
          { code: "bio.biotechnology.principles", name: "Principles and Processes", description: "Restriction enzymes, vectors, PCR, gel electrophoresis and bioreactors." },
          { code: "bio.biotechnology.applications", name: "Applications", description: "Genetically modified organisms, gene therapy, transgenic plants/animals and biosafety issues." },
        ],
      },

      // ── ECOLOGY ────────────────────────────────────────────────────────
      { code: "bio.ecology", name: "Ecology and Environment",
        description: "Organisms and populations, ecosystems, biodiversity and environmental issues.",
        subtopics: [
          { code: "bio.ecology.organisms_populations", name: "Organisms and Populations", description: "Adaptations, population growth models and population interactions." },
          { code: "bio.ecology.ecosystem", name: "Ecosystem", description: "Productivity, decomposition, energy flow, food chains/webs and biogeochemical cycles." },
          { code: "bio.ecology.biodiversity", name: "Biodiversity and Conservation", description: "Levels of biodiversity, hotspots, threats, conservation strategies and protected areas." },
          { code: "bio.ecology.env_issues", name: "Environmental Issues", description: "Air, water, soil pollution, global warming, ozone depletion and waste management." },
        ],
      },

      // ── OLYMPIAD-STYLE EXTENSION ───────────────────────────────────────
      { code: "bio.problem_solving", name: "Olympiad-style Reasoning",
        description: "Data interpretation, experimental design and concept-application questions typical of NSEB." },
    ],
  },
];

export async function seedNsebSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "NSEB" } });
  if (!exam) {
    throw new Error("Run seedExams() first — NSEB exam not found.");
  }
  console.log(`Seeding NSEB syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < nsebSyllabus.length; sIdx++) {
    const s = nsebSyllabus[sIdx];
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
  seedNsebSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
