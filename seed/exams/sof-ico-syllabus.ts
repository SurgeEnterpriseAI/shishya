// SOF ICO — International Commerce Olympiad (Class 11-12 canonical syllabus).
// 4 sections × ~50 questions: Logical Reasoning, Commerce, Achievers.
// Source: sofworld.org official Class 11-12 ICO syllabus.
//
// Run after seedExams: npx tsx seed/exams/sof-ico-syllabus.ts

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

export const sofIcoSyllabus: SubjectSeed[] = [
  // ── LOGICAL REASONING ─────────────────────────────────────────────────
  {
    code: "LOGICAL_REASONING",
    name: "Logical Reasoning",
    weight: 1,
    topics: [
      { code: "lr.series", name: "Series and Sequences", description: "Number, alphabet and figural series — find the next/missing term." },
      { code: "lr.analogy_classification", name: "Analogy and Classification", description: "Identify the matching pair or odd one out." },
      { code: "lr.coding_decoding", name: "Coding-Decoding", description: "Encrypt or decode words and numbers using a given rule." },
      { code: "lr.blood_relations", name: "Blood Relations", description: "Family-tree and pointing-style relationship problems." },
      { code: "lr.direction_sense", name: "Direction Sense", description: "Compass-based movement, distance and final-direction problems." },
      { code: "lr.ranking", name: "Ranking and Arrangement", description: "Linear and circular seating arrangements and rank problems." },
      { code: "lr.syllogism", name: "Syllogism", description: "Two/three statement deductions using all/some/no quantifiers." },
      { code: "lr.data_sufficiency", name: "Data Sufficiency", description: "Decide if the given data is sufficient to answer a question." },
      { code: "lr.statement_conclusion", name: "Statements and Conclusions", description: "Logical conclusion-drawing from given statements." },
      { code: "lr.venn", name: "Venn Diagrams", description: "Set relationships among 2–4 categories." },
      { code: "lr.di_charts", name: "Data Interpretation", description: "Tables, bar/pie/line graphs — calculation-based questions." },
    ],
  },

  // ── COMMERCE ──────────────────────────────────────────────────────────
  {
    code: "COMMERCE",
    name: "Commerce",
    weight: 1,
    topics: [
      { code: "commerce.business_intro", name: "Business, Trade and Commerce", description: "Concept and characteristics of business, trade and commerce as economic activities." },
      { code: "commerce.business_objectives", name: "Nature and Purpose of Business", description: "Objectives, classification of business activities and profession vs employment." },
      { code: "commerce.forms_of_organization", name: "Forms of Business Organization",
        description: "Sole proprietorship, partnership, HUF, cooperative, joint stock company.",
        subtopics: [
          { code: "commerce.forms_of_organization.sole", name: "Sole Proprietorship", description: "Features, merits and limitations of sole proprietorship." },
          { code: "commerce.forms_of_organization.partnership", name: "Partnership", description: "Types of partners, partnership deed, registration and merits/limitations." },
          { code: "commerce.forms_of_organization.company", name: "Joint Stock Company", description: "Private vs public company, formation, merits and limitations." },
          { code: "commerce.forms_of_organization.cooperative", name: "Cooperative Society", description: "Features, types and merits of cooperative societies." },
        ],
      },
      { code: "commerce.public_private_global", name: "Public, Private and Global Enterprises", description: "Departmental undertakings, statutory corporations, government companies and MNCs." },
      { code: "commerce.business_services", name: "Business Services", description: "Banking, insurance, transport, communication and warehousing services." },
      { code: "commerce.emerging_business", name: "Emerging Modes of Business", description: "E-business, outsourcing, BPO, KPO and online security concerns." },
      { code: "commerce.social_responsibility", name: "Social Responsibility and Business Ethics", description: "Concept of CSR, business ethics and stakeholders." },
      { code: "commerce.sources_of_finance", name: "Sources of Business Finance", description: "Owned vs borrowed funds, shares, debentures, retained earnings and trade credit." },
      { code: "commerce.small_business", name: "Small Business and Entrepreneurship", description: "MSMEs, role and government schemes for small enterprises." },
      { code: "commerce.internal_trade", name: "Internal Trade", description: "Wholesale and retail trade, types of retailers and chambers of commerce." },
      { code: "commerce.international_business", name: "International Business", description: "Export-import procedure, foreign trade benefits and trade documents." },
      { code: "commerce.partnership_accounts", name: "Partnership Accounts (Basics)", description: "Profit-sharing ratio, fixed/fluctuating capital and basic partnership adjustments." },
      { code: "commerce.accounting_basics", name: "Accounting Basics", description: "Accounting concepts, principles, journal, ledger and trial balance." },
      { code: "commerce.financial_statements", name: "Financial Statements", description: "Trading, profit and loss account, balance sheet and adjustments." },
    ],
  },

  // ── ECONOMICS ─────────────────────────────────────────────────────────
  {
    code: "ECONOMICS",
    name: "Economics",
    weight: 1,
    topics: [
      { code: "econ.intro", name: "Introduction to Economics", description: "Meaning, scope, central problems and types of economies." },
      { code: "econ.consumer_equilibrium", name: "Consumer's Equilibrium and Demand", description: "Utility analysis, indifference curves and law of demand." },
      { code: "econ.producer_supply", name: "Producer Behaviour and Supply", description: "Production function, costs, revenue and law of supply." },
      { code: "econ.market_forms", name: "Forms of Market and Price Determination", description: "Perfect competition, monopoly, monopolistic competition and oligopoly." },
      { code: "econ.national_income", name: "National Income and Aggregates", description: "GDP, GNP, NNP, methods of measurement and real vs nominal." },
      { code: "econ.money_banking", name: "Money and Banking", description: "Functions of money, commercial banks and central bank functions." },
      { code: "econ.govt_budget", name: "Government Budget and the Economy", description: "Components of budget, types of deficit and revenue/capital account." },
      { code: "econ.balance_of_payments", name: "Balance of Payments and Foreign Exchange", description: "BoP components, exchange rate determination and currency depreciation." },
      { code: "econ.statistics_intro", name: "Statistics for Economics — Introduction", description: "Meaning, scope and importance of statistics in economics." },
      { code: "econ.collection_organisation", name: "Collection, Organisation and Presentation of Data", description: "Sources of data, classification, tabulation and graphical presentation." },
      { code: "econ.measures_central_tendency", name: "Measures of Central Tendency", description: "Mean, median, mode for grouped and ungrouped data." },
      { code: "econ.measures_dispersion", name: "Measures of Dispersion", description: "Range, mean deviation, standard deviation and coefficient of variation." },
      { code: "econ.correlation_index", name: "Correlation and Index Numbers", description: "Karl Pearson's correlation, rank correlation and consumer price index." },
    ],
  },

  // ── ACHIEVERS SECTION ─────────────────────────────────────────────────
  {
    code: "ACHIEVERS",
    name: "Achievers Section",
    weight: 1,
    topics: [
      { code: "ach.higher_order_commerce", name: "Higher Order Commerce Application", description: "HOTS questions on advanced business and accounting scenarios." },
      { code: "ach.case_studies", name: "Case Studies", description: "Real-world business or economic case studies with multi-part questions." },
      { code: "ach.problem_solving", name: "Problem Solving", description: "Multi-step numerical and conceptual problems combining commerce and economics." },
      { code: "ach.current_business", name: "Current Business and Economic Affairs", description: "Recent business news, market trends and economic policy updates." },
    ],
  },
];

export async function seedSofIcoSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "SOF_ICO" } });
  if (!exam) {
    throw new Error("Run seedExams() first — SOF_ICO exam not found.");
  }
  console.log(`Seeding SOF ICO syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < sofIcoSyllabus.length; sIdx++) {
    const s = sofIcoSyllabus[sIdx];
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
  seedSofIcoSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
