// ITI / Polytechnic / Diploma pathway data — the parallel education
// track that ~6.5M Indian students follow. Almost entirely missing from
// the typical Indian education discourse despite being a real,
// employable path.

export interface ITITrade {
  slug: string;
  name: string;
  duration: string;
  /** Career outcomes after this trade */
  outcomes: string[];
  /** Typical starting salary band */
  startingSalary: string;
  /** Why this trade — when it makes sense */
  whyThis: string;
}

export const ITI_TRADES: ITITrade[] = [
  {
    slug: "electrician",
    name: "Electrician",
    duration: "2 years",
    outcomes: ["Railway electrician", "Plant maintenance", "Building wireman", "Self-employed contractor"],
    startingSalary: "₹1.8 - ₹4 LPA fresh",
    whyThis: "Highest-demand trade. Electrification + smart city + EV-charging build-out keeps demand consistent. Self-employment scales.",
  },
  {
    slug: "fitter",
    name: "Fitter",
    duration: "2 years",
    outcomes: ["Manufacturing plant", "Railway workshop", "Heavy industry", "Shipyard"],
    startingSalary: "₹2 - ₹4 LPA fresh",
    whyThis: "Manufacturing PLI schemes growing demand. Strong PSU + auto sector hiring (Maruti, Tata, Mahindra).",
  },
  {
    slug: "turner",
    name: "Turner / Machinist",
    duration: "2 years",
    outcomes: ["CNC operator", "Tool room", "Heavy engineering plants"],
    startingSalary: "₹2 - ₹4 LPA",
    whyThis: "CNC + precision machining shortage in defence + aerospace manufacturing. Specialisation pays.",
  },
  {
    slug: "welder",
    name: "Welder",
    duration: "1 year",
    outcomes: ["Construction", "Shipyard", "Pipeline industry", "Oil & gas"],
    startingSalary: "₹2 - ₹4 LPA. Offshore welders ₹6-12 LPA",
    whyThis: "Quick entry (1 year). Offshore + Gulf welder roles can be lucrative.",
  },
  {
    slug: "plumber",
    name: "Plumber",
    duration: "1 year",
    outcomes: ["Building construction", "Maintenance contracting", "Industrial piping"],
    startingSalary: "₹1.5 - ₹3.5 LPA",
    whyThis: "Real-estate boom creates demand. Self-employment scaleable in metros.",
  },
  {
    slug: "carpenter",
    name: "Carpenter",
    duration: "1 year",
    outcomes: ["Construction trim work", "Furniture manufacturing", "Custom carpentry"],
    startingSalary: "₹1.5 - ₹3 LPA",
    whyThis: "Custom furniture + premium carpentry pays substantially more than mass-produced work.",
  },
  {
    slug: "mechanic-motor-vehicle",
    name: "Mechanic (Motor Vehicle)",
    duration: "2 years",
    outcomes: ["Auto service centres", "Authorised dealers (Maruti, Hero, Honda)", "Own garage"],
    startingSalary: "₹2 - ₹4 LPA",
    whyThis: "EV transition creating new specialist roles. Authorised dealer roles offer training + steady growth.",
  },
  {
    slug: "computer-operator-programming",
    name: "Computer Operator + Programming Assistant",
    duration: "1 year",
    outcomes: ["Office computer ops", "Data entry + admin", "Basic IT support"],
    startingSalary: "₹1.8 - ₹3 LPA",
    whyThis: "Lowest qualification entry into office work. Pivot to better IT roles via further upskilling.",
  },
  {
    slug: "draughtsman-civil",
    name: "Draughtsman (Civil)",
    duration: "2 years",
    outcomes: ["Architecture firms", "Construction sites", "Government engineering depts"],
    startingSalary: "₹2 - ₹4 LPA",
    whyThis: "AutoCAD + Revit competency. Pathway to civil supervision after 5+ years.",
  },
  {
    slug: "stenographer",
    name: "Stenographer",
    duration: "1 year",
    outcomes: ["SSC Stenographer roles", "Court stenographer", "Office secretarial"],
    startingSalary: "₹2.5 - ₹4 LPA",
    whyThis: "SSC Stenographer recruitment via SSC. Court roles via state High Courts. Govt job entry route.",
  },
];

export interface DiplomaProgram {
  slug: string;
  name: string;
  duration: string;
  entryAfter: string;
  outcomes: string[];
  startingSalary: string;
  pathToBTech: string;
  whyThis: string;
}

export const DIPLOMA_PROGRAMS: DiplomaProgram[] = [
  {
    slug: "diploma-civil",
    name: "Diploma in Civil Engineering",
    duration: "3 years",
    entryAfter: "Class 10",
    outcomes: ["Junior Engineer at govt depts (PWD, CPWD, NHAI, Railways)", "Site supervisor at L&T, Shapoorji", "Building construction supervisor"],
    startingSalary: "₹2.5 - ₹5 LPA",
    pathToBTech: "Lateral entry to BTech Civil 2nd year via state Polytechnic Lateral Entry Exam (most states allow this).",
    whyThis: "Fast entry to engineering work. Junior Engineer in govt PWD/CPWD via SSC JE exam — strong govt path. Pay below BTech-Civil but earning-years gained.",
  },
  {
    slug: "diploma-mechanical",
    name: "Diploma in Mechanical Engineering",
    duration: "3 years",
    entryAfter: "Class 10",
    outcomes: ["Production supervisor at manufacturing plants", "Maintenance technician at PSUs (NTPC, BHEL)", "Auto manufacturer workshops"],
    startingSalary: "₹2.5 - ₹5 LPA",
    pathToBTech: "Lateral entry to BTech Mech 2nd year.",
    whyThis: "Same as civil — fast entry, lateral to BTech possible, govt PSU + manufacturing route.",
  },
  {
    slug: "diploma-electrical",
    name: "Diploma in Electrical Engineering",
    duration: "3 years",
    entryAfter: "Class 10",
    outcomes: ["DISCOM Junior Engineer", "Industrial electrical maintenance", "Solar + renewables technician"],
    startingSalary: "₹3 - ₹5 LPA",
    pathToBTech: "Lateral entry to BTech EE.",
    whyThis: "DISCOM (state electricity board) JE roles via state exams. Solar + renewables creating new openings.",
  },
  {
    slug: "diploma-computer-science",
    name: "Diploma in Computer Science / IT",
    duration: "3 years",
    entryAfter: "Class 10",
    outcomes: ["Junior software developer", "Network admin", "IT support at SMEs"],
    startingSalary: "₹2 - ₹4 LPA (lower than BTech CSE)",
    pathToBTech: "Lateral entry to BTech CSE / IT.",
    whyThis: "Realistic for those who can't crack JEE / CET. Pay materially below BTech-CSE; many do lateral-entry BTech + then enter SDE roles.",
  },
  {
    slug: "diploma-electronics",
    name: "Diploma in Electronics + Communication",
    duration: "3 years",
    entryAfter: "Class 10",
    outcomes: ["Telecom field technician", "Electronics manufacturing (PCB assembly)", "Service engineer"],
    startingSalary: "₹2.5 - ₹4 LPA",
    pathToBTech: "Lateral entry to BTech ECE.",
    whyThis: "PLI for electronics manufacturing creating new demand. EV manufacturing also pulling diploma electronics.",
  },
  {
    slug: "diploma-pharmacy",
    name: "Diploma in Pharmacy (DPharm)",
    duration: "2 years",
    entryAfter: "Class 12 (PCB/PCM)",
    outcomes: ["Retail pharmacy", "Hospital pharmacy", "Pharma manufacturing"],
    startingSalary: "₹1.5 - ₹3 LPA",
    pathToBTech: "Lateral entry to BPharm.",
    whyThis: "Quick path to pharmacist role; lateral to BPharm if you want full pharmacist scope.",
  },
];

/** State Polytechnic entrance exam codes — references our /exams catalogue. */
export const POLYTECHNIC_ENTRY_EXAMS = [
  { code: "UP_JEECUP", name: "UP Polytechnic — JEECUP" },
  { code: "AP_POLYCET", name: "AP Polytechnic — POLYCET" },
  { code: "TS_POLYCET", name: "TS Polytechnic — POLYCET" },
  { code: "BR_DCECE", name: "Bihar Polytechnic — DCECE" },
  { code: "UK_POLYTECHNIC", name: "Uttarakhand Polytechnic" },
  { code: "HP_POLYTECHNIC", name: "HP Polytechnic" },
];
