// One-shot seed for AP Assistant Motor Vehicle Inspector (AMVI).
//
// Conducted by APPSC for the AP Transport Department. Two papers:
//   Paper-I: General Studies & Mental Ability (150 Qs, 150 marks, 150 min)
//   Paper-II: Automobile / Mechanical Engineering Diploma syllabus
//             (150 Qs, 300 marks, 150 min)
//
// We model Paper-I + Paper-II as ONE Exam with combined subjects
// (the platform doesn't yet have a "paper" concept; mocks are scoped
// to the exam and topics nest underneath). Total: 300 Qs / 450 marks /
// 300 min real time. Negative marking: 1/3 per wrong.
//
// Idempotent — re-running upserts the exam and replaces subjects/
// topics in one transaction.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/seed-ap-amvi.ts

import { prisma } from "../src/lib/db/prisma";

const EXAM_CODE = "AP_AMVI";

const EXAM_INFO = {
  code: EXAM_CODE,
  name: "AP Assistant Motor Vehicle Inspector",
  shortName: "AP AMVI",
  category: "STATE_LEVEL" as const,
  state: "AP",
  description:
    "Andhra Pradesh Public Service Commission (APPSC) Assistant Motor Vehicle Inspector. Conducted for the AP Transport Department. Two-paper exam — Paper-I tests General Studies & Mental Ability across AP-specific GK, Indian polity, history, geography, science & current affairs (150 Qs, 150 marks); Paper-II tests Automobile / Mechanical Engineering Diploma-level concepts (150 Qs, 300 marks). Eligibility requires a Diploma in Automobile / Mechanical Engineering and a valid driving licence (HMV). Negative marking: 1/3 mark per wrong answer.",
  durationMin: 300, // 150 (P-I) + 150 (P-II)
  totalQuestions: 300, // 150 + 150
  totalMarks: 450, // 150 + 300
  marksPerQ: 1.5, // weighted average
  negativeMark: 1 / 3,
  candidatesPerYear: 8_000, // typical APPSC AMVI annual applicants
  languages: ["EN", "TE"] as Array<"EN" | "TE">,
  active: true,
};

interface SubjectSpec {
  code: string;
  name: string;
  weight: number;
  topics: Array<{ code: string; name: string; description: string }>;
}

const SUBJECTS: SubjectSpec[] = [
  // ─────────────────────────────────────────────────────────────────
  // PAPER-I (General Studies & Mental Ability — 150 Qs / 150 marks)
  // ─────────────────────────────────────────────────────────────────
  {
    code: "GS_HISTORY",
    name: "History — India & AP",
    weight: 1,
    topics: [
      { code: "gs.history.ancient", name: "Ancient India", description: "Indus Valley, Vedic period, Mauryan and Gupta empires, Buddhism and Jainism." },
      { code: "gs.history.medieval", name: "Medieval India", description: "Delhi Sultanate, Mughal Empire, Vijayanagara and Bahmani kingdoms, Bhakti and Sufi movements." },
      { code: "gs.history.modern", name: "Modern India & Freedom Struggle", description: "British rule, 1857 revolt, INC founding, Gandhian era, Independence and Partition." },
      { code: "gs.history.ap", name: "Andhra Pradesh History", description: "Satavahanas, Ikshvakus, Eastern Chalukyas, Kakatiyas, Reddy and Vijayanagara rule, AP statehood, bifurcation 2014." },
    ],
  },
  {
    code: "GS_GEOGRAPHY",
    name: "Geography — India & AP",
    weight: 1,
    topics: [
      { code: "gs.geo.physical", name: "Physical Geography of India", description: "Relief, drainage, climate, soils, natural vegetation, monsoon system." },
      { code: "gs.geo.economic", name: "Economic Geography of India", description: "Agriculture, minerals, industries, energy resources, transport." },
      { code: "gs.geo.ap", name: "Geography of Andhra Pradesh", description: "Districts, rivers (Godavari, Krishna, Penna), coastline, climate zones, crops, mineral resources, ports." },
      { code: "gs.geo.world", name: "World Geography Basics", description: "Continents, latitudes/longitudes, time zones, major mountain ranges and rivers." },
    ],
  },
  {
    code: "GS_POLITY",
    name: "Indian Polity & Governance",
    weight: 1,
    topics: [
      { code: "gs.polity.constitution", name: "Indian Constitution", description: "Preamble, fundamental rights and duties, DPSP, amendments, schedules." },
      { code: "gs.polity.union", name: "Union Government", description: "President, Prime Minister, Council of Ministers, Parliament, Supreme Court." },
      { code: "gs.polity.state", name: "State Government", description: "Governor, Chief Minister, State Legislature, High Court." },
      { code: "gs.polity.local", name: "Local Government & Panchayati Raj", description: "73rd and 74th amendments, gram panchayats, municipalities, ZP." },
      { code: "gs.polity.ap", name: "AP Polity & Administration", description: "AP Legislative Assembly, AP High Court, district administration, AP Reorganisation Act 2014." },
    ],
  },
  {
    code: "GS_ECONOMY",
    name: "Indian Economy",
    weight: 1,
    topics: [
      { code: "gs.econ.basics", name: "Economy Basics", description: "GDP, GNP, inflation, fiscal and monetary policy, banking, RBI." },
      { code: "gs.econ.planning", name: "Planning & Development", description: "Five Year Plans, NITI Aayog, poverty alleviation, employment schemes." },
      { code: "gs.econ.budget", name: "Budget & Taxation", description: "Union Budget, GST, direct vs indirect taxes, fiscal deficit." },
      { code: "gs.econ.ap", name: "AP Economy", description: "AP state budget, agriculture and industries in AP, special economic zones, AP investment policies." },
    ],
  },
  {
    code: "GS_SCIENCE",
    name: "General Science",
    weight: 1,
    topics: [
      { code: "gs.sci.physics", name: "Physics Basics", description: "Motion, force, energy, electricity, magnetism, light, sound." },
      { code: "gs.sci.chemistry", name: "Chemistry Basics", description: "Atoms, periodic table, acids, bases, salts, everyday chemistry." },
      { code: "gs.sci.biology", name: "Biology Basics", description: "Human body systems, diseases, nutrition, plant biology, ecology." },
      { code: "gs.sci.tech", name: "Science & Technology", description: "Space programs (ISRO), defence technology, IT, biotechnology, recent developments." },
    ],
  },
  {
    code: "GS_CURRENT",
    name: "Current Affairs",
    weight: 1,
    topics: [
      { code: "gs.cur.national", name: "National Affairs", description: "Major events, policies, schemes, appointments, awards in India (last 12 months)." },
      { code: "gs.cur.international", name: "International Affairs", description: "Global events, summits, organisations, international relations." },
      { code: "gs.cur.ap", name: "AP Current Affairs", description: "Recent developments in AP state — policies, schemes, sports, awards, events." },
      { code: "gs.cur.sports", name: "Sports & Awards", description: "Major sporting events, Olympic medals, national awards (Padma, Bharat Ratna), Nobel and other international awards." },
    ],
  },
  {
    code: "MENTAL_ABILITY",
    name: "Mental Ability & Reasoning",
    weight: 1,
    topics: [
      { code: "ma.numerical", name: "Numerical Ability", description: "Number series, simplification, percentages, ratio-proportion, profit-loss, time-speed-distance." },
      { code: "ma.logical", name: "Logical Reasoning", description: "Analogies, classifications, coding-decoding, blood relations, direction sense." },
      { code: "ma.verbal", name: "Verbal Reasoning", description: "Statement-conclusion, syllogisms, assertion-reason, cause-effect." },
      { code: "ma.nonverbal", name: "Non-Verbal Reasoning", description: "Series completion, mirror images, paper folding, figure analysis." },
      { code: "ma.di", name: "Data Interpretation", description: "Tables, bar charts, pie charts, line graphs, caselets." },
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // PAPER-II (Automobile / Mechanical — 150 Qs / 300 marks)
  // ─────────────────────────────────────────────────────────────────
  {
    code: "AUTO_ENGINE",
    name: "IC Engines & Automobile Fundamentals",
    weight: 1.5,
    topics: [
      { code: "auto.engine.ic", name: "IC Engine Classification", description: "Petrol vs diesel, 2-stroke vs 4-stroke, SI vs CI engines, working principles." },
      { code: "auto.engine.components", name: "Engine Components", description: "Cylinder block, head, piston, crankshaft, camshaft, valves, gaskets." },
      { code: "auto.engine.cycles", name: "Thermodynamic Cycles", description: "Otto cycle, Diesel cycle, Dual cycle, indicated and brake power, efficiency calculations." },
      { code: "auto.engine.fuel", name: "Fuel Systems", description: "Carburettor, MPFI, common rail diesel injection (CRDi), turbocharger, supercharger." },
      { code: "auto.engine.cooling", name: "Cooling & Lubrication", description: "Air vs water cooling, radiator, thermostat, lubricants, oil pump." },
      { code: "auto.engine.emissions", name: "Emission Control", description: "Pollutants from IC engines, catalytic converter, EGR, BS-VI norms, AFR." },
    ],
  },
  {
    code: "AUTO_TRANSMISSION",
    name: "Transmission & Drivetrain",
    weight: 1.5,
    topics: [
      { code: "auto.trans.clutch", name: "Clutch", description: "Single-plate, multi-plate, fluid coupling, dry vs wet clutch." },
      { code: "auto.trans.gearbox", name: "Gearbox", description: "Sliding mesh, constant mesh, synchromesh, automatic transmissions, CVT, gear ratios." },
      { code: "auto.trans.differential", name: "Differential & Final Drive", description: "Open and limited slip differentials, propeller shaft, universal joints, rear axle." },
      { code: "auto.trans.4wd", name: "4WD & AWD Systems", description: "Transfer case, full-time vs part-time 4WD, AWD operation." },
    ],
  },
  {
    code: "AUTO_CHASSIS",
    name: "Chassis, Suspension & Brakes",
    weight: 1.5,
    topics: [
      { code: "auto.chassis.frame", name: "Chassis Frame", description: "Conventional vs unitary construction, frame types, materials, stresses." },
      { code: "auto.chassis.steering", name: "Steering System", description: "Rack-and-pinion, recirculating ball, power steering, ackerman geometry, alignment angles." },
      { code: "auto.chassis.suspension", name: "Suspension", description: "Leaf spring, coil spring, MacPherson strut, double wishbone, shock absorbers, dampers." },
      { code: "auto.chassis.brakes", name: "Braking System", description: "Drum, disc, hydraulic, mechanical, ABS, EBD, regenerative braking." },
      { code: "auto.chassis.tyres", name: "Wheels & Tyres", description: "Wheel types, tyre construction (radial vs bias), tyre markings, inflation, tread patterns." },
    ],
  },
  {
    code: "AUTO_ELECTRICAL",
    name: "Automobile Electrical & Electronics",
    weight: 1,
    topics: [
      { code: "auto.elec.battery", name: "Battery & Charging", description: "Lead-acid battery, alternator, regulator, starter motor, battery testing." },
      { code: "auto.elec.ignition", name: "Ignition Systems", description: "Battery and magneto ignition, electronic ignition, distributor, spark plugs." },
      { code: "auto.elec.lighting", name: "Lighting & Accessories", description: "Headlamps (halogen, HID, LED), tail lamps, indicators, horn, wiper." },
      { code: "auto.elec.ecu", name: "ECU & Modern Electronics", description: "Engine Control Unit, sensors (MAP, MAF, O2, knock), actuators, OBD-II, CAN bus." },
    ],
  },
  {
    code: "MV_ACT",
    name: "Motor Vehicles Act & Rules",
    weight: 1.5,
    topics: [
      { code: "mv.act.1988", name: "Motor Vehicles Act, 1988", description: "Definitions, licensing of drivers and conductors, registration of vehicles, control of permits." },
      { code: "mv.act.amendments", name: "MV (Amendment) Act, 2019", description: "Enhanced penalties, third-party insurance, road safety board, taxi aggregators." },
      { code: "mv.cmv.rules", name: "Central Motor Vehicle Rules, 1989", description: "Driving licence procedure, conductor licence, vehicle registration, fitness, construction and maintenance." },
      { code: "mv.ap.rules", name: "AP Motor Vehicle Rules", description: "AP-specific rules — RTA process, road tax, permit conditions, special provisions for AP." },
      { code: "mv.inspection", name: "Vehicle Inspection & Fitness", description: "Fitness certificate, PUC, inspection procedures, RTO functions, defective vehicle classifications." },
      { code: "mv.permits", name: "Permits & Taxes", description: "Stage carriage, contract carriage, goods carriage, all-India tourist permits, national permit, road tax structure." },
      { code: "mv.offences", name: "Offences & Penalties", description: "Section-wise offences, fines, suspension and cancellation of licence, compounding of offences." },
      { code: "mv.insurance", name: "Insurance & Compensation", description: "Mandatory third-party insurance, hit-and-run compensation, MACT, no-fault liability." },
    ],
  },
  {
    code: "ENG_DRAWING",
    name: "Engineering Drawing & Workshop",
    weight: 0.7,
    topics: [
      { code: "ed.projections", name: "Orthographic Projections", description: "First and third angle projections, plan, elevation, side views, sectional views." },
      { code: "ed.measuring", name: "Measuring Instruments", description: "Vernier calliper, micrometer, dial gauge, feeler gauge, surface plate." },
      { code: "ed.workshop", name: "Workshop Tools & Processes", description: "Fitting tools, drilling, grinding, welding, lathe operations, milling basics." },
    ],
  },
];

async function main() {
  console.log(`Seeding ${EXAM_CODE}...`);

  await prisma.$transaction(async (tx) => {
    // Upsert the exam itself
    const exam = await tx.exam.upsert({
      where: { code: EXAM_CODE },
      create: EXAM_INFO,
      update: EXAM_INFO,
    });
    console.log(`  exam upserted: ${exam.id}`);

    // Replace subjects + topics atomically. Subject onDelete: Cascade
    // means topic rows go with them — clean re-seed every run.
    await tx.subject.deleteMany({ where: { examId: exam.id } });
    console.log(`  cleared existing subjects/topics`);

    for (let i = 0; i < SUBJECTS.length; i++) {
      const s = SUBJECTS[i];
      const subj = await tx.subject.create({
        data: {
          examId: exam.id,
          code: s.code,
          name: s.name,
          weight: s.weight,
          orderIdx: i,
        },
      });
      for (let j = 0; j < s.topics.length; j++) {
        const t = s.topics[j];
        await tx.topic.create({
          data: {
            subjectId: subj.id,
            code: t.code,
            name: t.name,
            description: t.description,
            orderIdx: j,
          },
        });
      }
      console.log(`  + ${s.code}  (${s.topics.length} topics)`);
    }
  });

  console.log("\n✅ Done. View it live at https://shishya.in/exams/AP_AMVI");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
