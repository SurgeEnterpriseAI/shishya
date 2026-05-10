// UPSC Civil Services Preliminary Examination — General Studies Paper I.
// 100 questions, 200 marks, 2 hours. Only GS Paper I counts towards merit
// (CSAT Paper II is qualifying at 33%). Source: UPSC official notification
// (upsc.gov.in) — syllabus has been stable since 2011.
//
// Run after seedExams: npx tsx seed/exams/upsc-prelims-syllabus.ts

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

// Per UPSC notification, GS Paper I covers seven broad areas:
//   1. Current events of national and international importance
//   2. History of India and Indian National Movement
//   3. Indian and World Geography — physical, social, economic
//   4. Indian Polity and Governance — Constitution, Political System,
//      Panchayati Raj, Public Policy, Rights Issues
//   5. Economic and Social Development — Sustainable Development,
//      Poverty, Inclusion, Demographics, Social Sector Initiatives
//   6. General Issues on Environmental Ecology, Biodiversity and
//      Climate Change — that do not require subject specialisation
//   7. General Science
export const upscPrelimsSyllabus: SubjectSeed[] = [
  {
    code: "GS_PAPER1",
    name: "General Studies Paper I",
    weight: 1,
    topics: [
      // 1. CURRENT AFFAIRS
      {
        code: "gs.current_affairs",
        name: "Current Events of National and International Importance",
        description: "National and international news of the last 12-18 months including government schemes, summits, awards, sports, science, defence and international relations.",
        subtopics: [
          { code: "gs.current.national", name: "National Affairs", description: "Government schemes, policy decisions, parliamentary developments, judicial pronouncements and national events." },
          { code: "gs.current.international", name: "International Affairs", description: "Bilateral and multilateral relations, summits, treaties, UN bodies and global events affecting India." },
          { code: "gs.current.economic", name: "Economic News", description: "Reports of RBI, NITI Aayog, World Bank, IMF, WTO; economic indicators; budgetary and fiscal news." },
          { code: "gs.current.science_tech", name: "Science and Technology News", description: "Recent advances in space (ISRO, NASA missions), defence, biotech, IT and indigenous technologies." },
          { code: "gs.current.awards_sports", name: "Awards, Honours and Sports", description: "National and international awards, civilian honours, sports championships and personalities in news." },
          { code: "gs.current.reports_indices", name: "Reports and Indices", description: "Major global indices (HDI, Global Hunger Index, Ease of Doing Business, etc.) and reports of UN, WEF, OECD." },
        ],
      },

      // 2. HISTORY
      {
        code: "gs.history",
        name: "History of India and Indian National Movement",
        description: "Indian history covering ancient, medieval and modern periods with special emphasis on the Indian freedom struggle from 1857 to 1947.",
        subtopics: [
          { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley Civilisation; Vedic period; Mahajanapadas; Mauryas; post-Mauryan kingdoms; Guptas; post-Gupta period; ancient art, architecture, literature, religion and philosophy." },
          { code: "gs.history.medieval", name: "Medieval India", description: "Early medieval kingdoms (Rajputs, Cholas, Rashtrakutas); Delhi Sultanate; Mughal Empire; Vijayanagara and Bahmani; Bhakti and Sufi movements; medieval architecture and culture." },
          { code: "gs.history.modern_advent", name: "Advent of Europeans and British Conquest", description: "Coming of the Portuguese, Dutch, French and English; Battle of Plassey, Buxar; expansion of British rule; Anglo-Mysore, Anglo-Maratha and Anglo-Sikh wars." },
          { code: "gs.history.modern_admin", name: "British Administration and Economic Impact", description: "Land revenue systems (Permanent Settlement, Ryotwari, Mahalwari); de-industrialisation; drain of wealth; railways and education policies." },
          { code: "gs.history.revolt_1857", name: "Revolt of 1857", description: "Causes, course, leaders, suppression and consequences of the First War of Indian Independence." },
          { code: "gs.history.socio_religious", name: "Socio-Religious Reform Movements", description: "Brahmo Samaj, Arya Samaj, Aligarh Movement, Ramakrishna Mission, Theosophical Society, reforms among Sikhs, Parsis and other communities." },
          { code: "gs.history.freedom_moderate", name: "Indian National Movement (Moderate Phase)", description: "Foundation of INC (1885); moderate phase; partition of Bengal; Swadeshi movement; rise of extremism; Surat split." },
          { code: "gs.history.freedom_gandhian", name: "Gandhian Era", description: "Champaran, Kheda, Ahmedabad; Rowlatt Act, Jallianwala Bagh; Non-Cooperation, Civil Disobedience and Quit India Movements; Round Table Conferences." },
          { code: "gs.history.freedom_revolutionary", name: "Revolutionary Movements", description: "Anushilan Samiti, Ghadar Party, HSRA; Bhagat Singh, Chandrasekhar Azad; INA and Subhas Chandra Bose." },
          { code: "gs.history.partition_independence", name: "Partition and Independence", description: "Cripps Mission, Cabinet Mission, Mountbatten Plan, partition, integration of princely states." },
          { code: "gs.history.art_culture", name: "Indian Art and Culture", description: "Classical dances, music, paintings, architecture (temple, Indo-Islamic, colonial); literature, festivals, theatre and UNESCO heritage sites." },
        ],
      },

      // 3. GEOGRAPHY
      {
        code: "gs.geography",
        name: "Indian and World Geography — Physical, Social, Economic",
        description: "Physical, social and economic geography of India and the world.",
        subtopics: [
          { code: "gs.geo.physical_world", name: "Physical Geography of the World", description: "Earth's interior; geomorphology; landforms; oceans and continents; atmosphere — composition, structure, weather and climate; climatology; soils; biomes." },
          { code: "gs.geo.physical_india", name: "Physical Geography of India", description: "Physiographic divisions; drainage system; climate; soils and natural vegetation; wildlife and biosphere reserves." },
          { code: "gs.geo.economic_india", name: "Economic Geography of India", description: "Mineral and energy resources; agriculture (cropping patterns, Green Revolution, irrigation); industries; transport and communication; trade." },
          { code: "gs.geo.human_india", name: "Human and Social Geography of India", description: "Population — distribution, density, growth, composition; tribes; urbanisation; migration." },
          { code: "gs.geo.economic_world", name: "Economic Geography of the World", description: "Major industrial regions; global trade patterns; major minerals and energy resources; agricultural regions." },
          { code: "gs.geo.maps_locations", name: "Important Locations", description: "Important rivers, mountain passes, straits, ports, national parks, cities and current geographical hotspots in news." },
          { code: "gs.geo.disasters", name: "Natural Disasters and Phenomena", description: "Earthquakes, volcanoes, cyclones, tsunamis, droughts, floods; El Niño, La Niña; ocean currents." },
        ],
      },

      // 4. POLITY
      {
        code: "gs.polity",
        name: "Indian Polity and Governance — Constitution, Political System, Panchayati Raj, Public Policy, Rights Issues",
        description: "Indian Constitution, governance structures, political system, local government and rights issues.",
        subtopics: [
          { code: "gs.polity.constitution_making", name: "Making of the Constitution", description: "Constituent Assembly; sources and salient features; preamble." },
          { code: "gs.polity.fundamental_rights", name: "Fundamental Rights, DPSP and Duties", description: "Articles 12-35 (Fundamental Rights), DPSP (36-51), Fundamental Duties (51A); writs and remedies." },
          { code: "gs.polity.union_executive", name: "Union Executive", description: "President, Vice-President, Prime Minister and Council of Ministers, Attorney General; powers and functions." },
          { code: "gs.polity.parliament", name: "Parliament", description: "Lok Sabha, Rajya Sabha; sessions; legislative procedures; budgetary process; parliamentary committees and privileges." },
          { code: "gs.polity.judiciary", name: "Judiciary", description: "Supreme Court, High Courts, subordinate courts; judicial review; PIL; tribunals; judicial activism." },
          { code: "gs.polity.federalism", name: "Federalism and Centre-State Relations", description: "Legislative, administrative and financial relations; Inter-State Council; Finance Commission; recent issues in federalism." },
          { code: "gs.polity.state_govt", name: "State Government", description: "Governor, Chief Minister, State Legislature, State Judiciary; special provisions for certain states (Articles 370, 371)." },
          { code: "gs.polity.local_govt", name: "Panchayati Raj and Urban Local Bodies", description: "73rd and 74th Constitutional Amendments; PRIs; municipalities; finance commissions." },
          { code: "gs.polity.constitutional_bodies", name: "Constitutional Bodies", description: "ECI, UPSC, CAG, Finance Commission, NCSC, NCST, NCBC, AGI." },
          { code: "gs.polity.statutory_bodies", name: "Statutory and Regulatory Bodies", description: "NHRC, CIC, CVC, Lokpal, NITI Aayog, NGT, RBI, SEBI, TRAI, CCI." },
          { code: "gs.polity.amendments", name: "Constitutional Amendments", description: "Important amendments and basic structure doctrine; Kesavananda Bharati case." },
          { code: "gs.polity.elections", name: "Elections and Political Parties", description: "Election Commission; electoral reforms; anti-defection law; representation of people; political parties and pressure groups." },
          { code: "gs.polity.rights_issues", name: "Rights Issues", description: "Human rights, women's rights, child rights, minority rights, disability rights and related legislations." },
          { code: "gs.polity.governance", name: "Governance and Public Policy", description: "Good governance, e-governance, citizen charters, RTI Act, transparency and accountability mechanisms." },
        ],
      },

      // 5. ECONOMICS
      {
        code: "gs.economy",
        name: "Economic and Social Development",
        description: "Sustainable development, poverty, inclusion, demographics, social sector initiatives, and the broader Indian economy.",
        subtopics: [
          { code: "gs.eco.basics", name: "Basics of Economy and National Income", description: "Concepts of GDP, GNP, NNP, NDP; methods of measuring national income; inflation (WPI, CPI); business cycles." },
          { code: "gs.eco.planning", name: "Indian Economy and Planning", description: "Five Year Plans; NITI Aayog; sectoral composition of economy; Green Revolution, White Revolution and other initiatives." },
          { code: "gs.eco.fiscal_policy", name: "Public Finance and Fiscal Policy", description: "Union Budget; taxation (direct and indirect, GST); FRBM Act; deficit financing; Finance Commission." },
          { code: "gs.eco.monetary_policy", name: "Money, Banking and Monetary Policy", description: "RBI functions; monetary policy tools (CRR, SLR, repo rate); banking sector reforms; NPAs; financial inclusion." },
          { code: "gs.eco.external_sector", name: "External Sector", description: "Balance of payments; exchange rate; FDI and FPI; trade policy; WTO; rupee convertibility." },
          { code: "gs.eco.agriculture", name: "Agriculture", description: "Cropping patterns; MSP and procurement; PDS; food security; agricultural credit; reforms in agricultural marketing." },
          { code: "gs.eco.industry", name: "Industry and Services", description: "Industrial policy; MSMEs; PLI scheme; Make in India; services sector — IT, tourism, banking." },
          { code: "gs.eco.poverty_employment", name: "Poverty, Unemployment and Inclusion", description: "Measurement of poverty; types of unemployment; flagship schemes — MGNREGA, PMGKY; financial and social inclusion." },
          { code: "gs.eco.demographics", name: "Demographics and Human Development", description: "Census, population growth; demographic dividend; Human Development Index; social sector indicators." },
          { code: "gs.eco.sustainable", name: "Sustainable Development", description: "SDGs; green economy; circular economy; sustainable agriculture; renewable energy." },
          { code: "gs.eco.social_schemes", name: "Social Sector Initiatives", description: "Health, education, women and child welfare, SC/ST/OBC welfare schemes; flagship missions like Ayushman Bharat, PMJDY, Swachh Bharat." },
          { code: "gs.eco.infrastructure", name: "Infrastructure", description: "Roads, railways, ports, airports; energy; PPPs; urban infrastructure and Smart Cities Mission." },
        ],
      },

      // 6. ENVIRONMENT
      {
        code: "gs.environment",
        name: "Environmental Ecology, Biodiversity and Climate Change",
        description: "General issues on environmental ecology, biodiversity and climate change that do not require subject specialisation.",
        subtopics: [
          { code: "gs.env.ecology", name: "Ecology and Ecosystems", description: "Ecological principles; ecosystems — forest, grassland, desert, aquatic; food chains, food webs, energy flow; ecological pyramids; ecological succession." },
          { code: "gs.env.biodiversity", name: "Biodiversity and Conservation", description: "Levels of biodiversity; biodiversity hotspots in India; in-situ and ex-situ conservation; protected areas — national parks, wildlife sanctuaries, biosphere reserves; tiger and elephant reserves." },
          { code: "gs.env.species", name: "Flora, Fauna and IUCN Status", description: "Important plant and animal species; IUCN Red List categories; CITES; species in news." },
          { code: "gs.env.climate_change", name: "Climate Change", description: "Greenhouse effect; global warming; ocean acidification; UNFCCC; Kyoto Protocol; Paris Agreement; IPCC reports; India's NDCs and Panchamrit." },
          { code: "gs.env.pollution", name: "Pollution and Waste Management", description: "Air, water, soil, noise pollution; e-waste; plastic waste; bio-medical waste; pollution control boards; waste-to-energy." },
          { code: "gs.env.acts_orgs", name: "Environmental Laws and Organisations", description: "Environmental Protection Act; Wildlife Protection Act; Forest Conservation Act; CPCB, NGT, MoEFCC; international bodies — UNEP, IUCN, WWF." },
          { code: "gs.env.intl_conventions", name: "International Conventions", description: "Convention on Biological Diversity, Cartagena and Nagoya Protocols, Ramsar, Stockholm, Basel, Rotterdam, Minamata Conventions; Montreal Protocol." },
          { code: "gs.env.renewable_energy", name: "Renewable Energy and Sustainability", description: "Solar, wind, hydro, biomass, geothermal energy; International Solar Alliance; energy efficiency programmes." },
        ],
      },

      // 7. SCIENCE
      {
        code: "gs.science",
        name: "General Science",
        description: "General awareness in science covering physics, chemistry, biology and modern technological developments — without requiring subject specialisation.",
        subtopics: [
          { code: "gs.sci.physics", name: "Physics — General Awareness", description: "Basic principles of mechanics, heat, light, sound, electricity, magnetism, modern physics; everyday applications." },
          { code: "gs.sci.chemistry", name: "Chemistry — General Awareness", description: "Atomic structure, periodic table, acids/bases, chemical reactions; everyday chemistry — fuels, polymers, food chemistry." },
          { code: "gs.sci.biology", name: "Biology — Human Body and Health", description: "Human anatomy, physiology, genetics, nutrition, vaccines, common diseases (communicable and non-communicable)." },
          { code: "gs.sci.botany_zoology", name: "Plants, Animals and Microbiology", description: "Cell biology, classification, plant and animal physiology, microorganisms and their role." },
          { code: "gs.sci.biotech", name: "Biotechnology and Genetic Engineering", description: "DNA technology; GM crops; cloning; stem cells; CRISPR; biotechnology applications in medicine and agriculture." },
          { code: "gs.sci.space", name: "Space Technology", description: "ISRO missions (Chandrayaan, Mangalyaan, Gaganyaan, Aditya-L1); satellites; launch vehicles; international space programs." },
          { code: "gs.sci.defence", name: "Defence Technology", description: "Indigenous missiles (Agni, Prithvi, BrahMos), aircraft (Tejas), naval ships, DRDO projects; nuclear and space-based defence." },
          { code: "gs.sci.it_emerging", name: "IT and Emerging Technologies", description: "Internet, AI, machine learning, blockchain, 5G, quantum computing, cybersecurity, IoT and Web 3.0." },
          { code: "gs.sci.health", name: "Health and Medicine", description: "Public health programmes; outbreaks and pandemics; antimicrobial resistance; mental health; recent advances in medicine." },
          { code: "gs.sci.nuclear", name: "Nuclear Technology", description: "Nuclear reactors; uranium and thorium fuel cycles; India's three-stage nuclear programme; nuclear safety and IAEA." },
        ],
      },
    ],
  },
];

export async function seedUpscPrelimsSyllabus() {
  const exam = await prisma.exam.findUnique({ where: { code: "UPSC_PRELIMS" } });
  if (!exam) {
    throw new Error("Run seedExams() first — UPSC_PRELIMS exam not found.");
  }
  console.log(`Seeding UPSC Prelims syllabus into exam ${exam.id}...`);

  let topicCount = 0;
  for (let sIdx = 0; sIdx < upscPrelimsSyllabus.length; sIdx++) {
    const s = upscPrelimsSyllabus[sIdx];
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
  seedUpscPrelimsSyllabus()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(() => prisma.$disconnect());
}
