// The options after Class 10 (30 Sep 2026, P1 build 1, spec §1.2 / §1.3).
//
// Nine options, in the order /after-10th lists them: the five Class 11-12
// groups /schooling/streams already explains (its section ids pcm, pcb, pcmb,
// commerce, humanities are kept and joined through `legacyAnchor`), then the
// vocational Class 11-12 route, the polytechnic diploma, ITI and NIOS open
// schooling (the parallel tracks of src/data/iti-diploma.ts and
// /distance-learning).
//
// Copy rules (tests/unit/paths-registry.test.ts): `title`, `whatItIs` and
// `suits` are our own words with no numbers other than class numbers, no
// salary and no "best". Every eligibility rule is a PathFact with its source:
// the documents read on 30 Sep 2026 (PATH_SOURCES; the stream researcher's
// p1/stream-facts.json). A rule the researcher could not read on an official
// page is kept below as `unconfirmed` (audit trail) and never printed —
// AP BIE, Karnataka PUE and Maharashtra HSC subject lists, the state
// engineering CETs' eligibility pages, ICAI's CA Foundation rule, BCI's rules,
// lateral entry to B.Tech, and whether NIOS counts for NEET, JEE Advanced or
// NDA.
//
// Pure data: no DB, clock or React.

import type { PathFact, StreamOption } from "./types";
import { PATH_SOURCES as S } from "./sources";

const confirmed = (text: string, source: PathFact["source"]): PathFact => ({ text, status: "confirmed", source });
const unconfirmed = (text: string): PathFact => ({ text, status: "unconfirmed", source: null });

// ── Facts shared by several options (one constant each, so they cannot drift) ──

/** Class 11-12 is one two-year course (CBSE: "Class XI and XII is a composite course"). */
const DURATION_CLASS_11_12 = confirmed("2 years (Class 11 and Class 12)", S.cbseScheme);

const F_CBSE_NO_STREAMS = confirmed(
  "CBSE has no fixed streams: after two languages (Hindi or English must be one), a student takes electives from Group A, and may add a sixth subject from Group A or from the skill subjects of Group S.",
  S.cbseScheme,
);
const F_CBSE_MATHS = confirmed(
  "CBSE: Mathematics (041) and Applied Mathematics (241) cannot be taken together.",
  S.cbseScheme,
);
const F_JEE_MAIN_SUBJECTS = confirmed(
  "B.E./B.Tech seats at NITs, IIITs and other central institutes through JEE (Main) Paper 1 need Class XII with Physics, Mathematics, a language, one of Chemistry, Biotechnology, Biology or a Technical Vocational subject, and one more subject.",
  S.jeeMainBulletin,
);
const F_JEE_MAIN_MARKS = confirmed(
  "Those NIT-system seats also need at least 75% aggregate in five Class XII subjects (65% for SC, ST and PwD), or a place in the category-wise top 20 percentile of the student's board.",
  S.jeeMainBulletin,
);
const F_JEE_ADVANCED = confirmed(
  "JEE (Advanced) 2026 needs Physics, Chemistry and Mathematics as compulsory subjects in Class XII, and a rank among the top 2,50,000 in the JEE (Main) B.E./B.Tech paper.",
  S.jeeAdvancedEligibility,
);
const F_NDA_WINGS = confirmed(
  "NDA and NA (II) 2026: the Air Force and Naval wings need Class 12 with Physics, Chemistry and Mathematics; for the Army wing the notice asks for a Class 12 pass of the 10+2 pattern and names no subjects.",
  S.ndaNotice,
);
const F_BARCH = confirmed(
  "B.Arch (Council of Architecture rule, quoted in the JEE (Main) 2026 bulletin): Physics and Mathematics compulsory plus one of Chemistry, Biology, a Technical Vocational subject, Computer Science, IT, Informatics Practices, Engineering Graphics or Business Studies, with at least 45% aggregate; or a 10+3 diploma with Mathematics and at least 45%.",
  S.jeeMainBulletin,
);
const F_BPLAN = confirmed(
  "B.Planning through JEE (Main): at least 50% in Mathematics and 50% aggregate in the qualifying examination, so it stays open only with Mathematics.",
  S.jeeMainBulletin,
);
const F_NEET_SUBJECTS = confirmed(
  "NEET (UG) 2026 asks for Physics, Chemistry, Biology or Biotechnology (with practicals) and English. Under NMC's public notice of 22.11.2023, these may be passed as additional subjects after Class 12 from a recognised board.",
  S.neetBulletin,
);
const F_CUET = confirmed(
  "CUET (UG) 2026 lets a candidate choose up to five test subjects irrespective of the subjects taken in Class XII; each university sets its own programme rules.",
  S.cuetBulletin,
);
const F_CLAT = confirmed(
  "CLAT 2027 (UG) asks for 10+2 or an equivalent examination with at least 45% marks (40% for SC, ST and PwD); the page names no stream and no upper age limit.",
  S.clatEligibility,
);
const F_MHT_CET = confirmed(
  "MHT-CET 2026 has separate PCM and PCB group papers; a candidate may take either or both.",
  S.mhtCetBrochure,
);
const F_WB_SETS = confirmed(
  "WBCHSE: three compulsory electives and one optional elective, all from one Set (I, II or III), plus a first and a second language.",
  S.wbSubjects,
);
const F_UP_NO_FIXED = confirmed(
  "UP Board's subject directory lists Class 11 subjects by group (Humanities, Science, Commerce, Agriculture, Vocational) and publishes no fixed combinations.",
  S.upSubjects,
);
const F_AICTE_DIPLOMA = confirmed(
  "AICTE diplomas in Engineering and Technology, Applied Arts and Crafts, and Design take 3 years and need a pass in Class 10 (10th Std./SSC).",
  S.aicteAph,
);
const F_AICTE_DIPLOMA_LATERAL = confirmed(
  "AICTE: Class 10 plus a 2-year ITI course makes a student eligible for the second year of a diploma in any branch of Engineering and Technology; bridge courses are offered.",
  S.aicteAph,
);
const F_JEE_MAIN_ROUTES = confirmed(
  "JEE (Main) 2026 lists, among its qualifying examinations, the Higher Secondary Certificate Vocational Examination, the NIOS Senior Secondary examination with at least five subjects, and an AICTE or State-board diploma of at least 3 years.",
  S.jeeMainBulletin,
);
const F_CUET_ROUTES = confirmed(
  "CUET (UG) 2026 lists the same routes as qualifying examinations: HSC Vocational, NIOS Senior Secondary with at least five subjects, and a diploma of at least 3 years.",
  S.cuetBulletin,
);

// Unconfirmed on 30 Sep 2026 (never printed; kept so the gap is visible).
const U_AP = unconfirmed("AP BIE group subject lists (bie.ap.gov.in and the Jan 2025 reform note were not readable).");
const U_KA = unconfirmed("Karnataka PUE combination codes (the 2026-27 guidelines PDF is scanned Kannada text).");
const U_MH = unconfirmed("Maharashtra HSC subject scheme (the board's subjects page is script-only).");
const U_BR_SCIENCE = unconfirmed("Bihar BSEB science faculty subjects for 2026-28 (form not read).");

export const STREAM_OPTIONS: readonly StreamOption[] = [
  {
    slug: "mpc-pcm",
    kind: "class-11-12",
    title: "MPC or PCM: Maths, Physics and Chemistry in Class 11-12",
    aliases: ["MPC", "PCM", "M.P.C.", "P.C.M.", "Science with Maths", "Maths group", "Physics Chemistry Maths", "Non-medical", "एमपीसी", "पीसीएम", "ఎంపీసీ"],
    whatItIs: "Class 11 and 12 with Mathematics, Physics and Chemistry as the main subjects, beside your languages.",
    duration: DURATION_CLASS_11_12,
    suits: "Students who enjoy maths and physics problem-solving and are curious about engineering, architecture, the physical sciences or technical roles in defence.",
    legacyAnchor: "pcm",
    existingPages: [
      { href: "/schooling/streams#pcm", label: "Stream guide: Science (PCM)" },
      { href: "/exams/after/12th", label: "Exams after Class 12" },
      { href: "/colleges/stream/engineering", label: "Engineering colleges" },
      { href: "/exams/entrance#entrance-state-cet", label: "State entrance tests (CETs)" },
    ],
    facts: [
      F_JEE_MAIN_SUBJECTS,
      F_JEE_MAIN_MARKS,
      F_JEE_ADVANCED,
      F_NDA_WINGS,
      F_BARCH,
      F_BPLAN,
      F_MHT_CET,
      F_CUET,
      F_NEET_SUBJECTS,
      F_CBSE_MATHS,
      U_AP,
      U_KA,
      U_MH,
      U_BR_SCIENCE,
      unconfirmed("Engineering eligibility on the TNEA, KCET, TS EAPCET and AP EAPCET pages (not read)."),
      unconfirmed("Whether NIOS Senior Secondary is accepted for JEE (Advanced) and NDA (the pages read do not say)."),
    ],
  },
  {
    slug: "bipc-pcb",
    kind: "class-11-12",
    title: "BiPC or PCB: Biology, Physics and Chemistry in Class 11-12",
    aliases: ["BiPC", "PCB", "Bi.P.C.", "P.C.B.", "Science with Biology", "Medical group", "Biology group", "पीसीबी", "బైపీసీ"],
    whatItIs: "Class 11 and 12 with Biology (or Botany and Zoology), Physics and Chemistry as the main subjects, beside your languages.",
    duration: DURATION_CLASS_11_12,
    suits: "Students drawn to living things, health and the life sciences, including those thinking about medicine, pharmacy, nursing or agriculture.",
    legacyAnchor: "pcb",
    existingPages: [
      { href: "/schooling/streams#pcb", label: "Stream guide: Science (PCB)" },
      { href: "/exams/after/12th", label: "Exams after Class 12" },
      { href: "/colleges/stream/medical", label: "Medical colleges" },
      { href: "/colleges/stream/pharmacy", label: "Pharmacy colleges" },
    ],
    facts: [
      F_NEET_SUBJECTS,
      confirmed(
        "NEET (UG) 2026 for AYUSH courses (BAMS, BSMS, BUMS, BHMS): 10+2 with Physics, Chemistry and Biology or Biotechnology, and age 17 by 31 December of the admission year.",
        S.neetBulletin,
      ),
      F_MHT_CET,
      confirmed(
        "AP EAPCET 2025: B.Pharm and B.Tech (Biotechnology) take intermediate with Biology, Physics and Chemistry; B.Sc. (Ag), B.Sc. (Hort), B.V.Sc & A.H, B.F.Sc and B.Tech (FS&T) take any two of Physical Science, Biological or Natural Sciences, Agriculture and a relevant vocational course, with age 17 to 22 (25 for SC/ST).",
        S.apEapcetAgriPharma,
      ),
      F_NDA_WINGS,
      F_JEE_ADVANCED,
      F_JEE_MAIN_SUBJECTS,
      // 30 Sep 2026 (review fix): the "closes" line now names B.Arch only, so
      // B.Planning's closure (no Mathematics) is stated here with its source.
      F_BPLAN,
      F_CUET,
      U_AP,
      U_KA,
      U_MH,
      U_BR_SCIENCE,
      unconfirmed("PCI rule for B.Pharm (pci.nic.in not read)."),
      unconfirmed("INC rule for B.Sc Nursing (not read)."),
      unconfirmed("Whether NIOS Senior Secondary counts for NEET (UG): the bulletin says 'duly recognized boards' and does not name NIOS."),
    ],
  },
  {
    slug: "pcmb",
    kind: "class-11-12",
    title: "PCMB: Physics, Chemistry, Maths and Biology in Class 11-12",
    aliases: ["PCMB", "P.C.M.B.", "MBiPC", "Science with Maths and Biology", "Physics Chemistry Maths Biology", "पीसीएमबी"],
    whatItIs: "Class 11 and 12 with Physics, Chemistry, Mathematics and Biology together, beside your languages.",
    duration: DURATION_CLASS_11_12,
    suits: "Students who want both engineering and medicine in view and are ready to carry four demanding subjects at once.",
    legacyAnchor: "pcmb",
    existingPages: [
      { href: "/schooling/streams#pcmb", label: "Stream guide: Science (PCMB)" },
      { href: "/exams/after/12th", label: "Exams after Class 12" },
      { href: "/colleges/stream/engineering", label: "Engineering colleges" },
      { href: "/colleges/stream/medical", label: "Medical colleges" },
    ],
    facts: [
      confirmed(
        "CBSE: Mathematics and Biology can both be taken as Group A electives.",
        S.cbseScheme,
      ),
      confirmed(
        "Telangana: SCERT's list of intermediate courses shows two science groups, Mathematics-Physics-Chemistry and Botany-Zoology-Physics-Chemistry, and no group with both Mathematics and Biology.",
        S.tsIntermediate,
      ),
      F_JEE_MAIN_SUBJECTS,
      F_NEET_SUBJECTS,
      F_JEE_ADVANCED,
      F_NDA_WINGS,
      // 30 Sep 2026 (review fix): the page keeps "Architecture and planning"
      // open, so both halves are stated with their source, as on MPC.
      F_BARCH,
      F_BPLAN,
      unconfirmed("Karnataka PCMB combination code."),
      unconfirmed("AP: whether a combination with both Mathematics and Biology is allowed after the 2025-26 reforms."),
      unconfirmed("Maharashtra and Bihar PCMB availability."),
    ],
  },
  {
    slug: "commerce-cec-mec",
    kind: "class-11-12",
    title: "Commerce (CEC or MEC): Accountancy, Business and Economics in Class 11-12",
    aliases: ["Commerce", "CEC", "MEC", "C.E.C.", "M.E.C.", "Commerce with Maths", "Commerce without Maths", "I.Com", "कॉमर्स", "కామర్స్"],
    whatItIs: "Class 11 and 12 built around accountancy, business studies, commerce and economics, with or without Mathematics.",
    duration: DURATION_CLASS_11_12,
    suits: "Students interested in business, accounts, economics and finance, including those thinking about B.Com, BBA, CA, CS or CMA.",
    legacyAnchor: "commerce",
    existingPages: [
      { href: "/schooling/streams#commerce", label: "Stream guide: Commerce" },
      { href: "/exams/after/12th", label: "Exams after Class 12" },
      { href: "/colleges/stream/management", label: "Management colleges" },
    ],
    facts: [
      confirmed(
        "CBSE commerce is a choice of electives, for example Accountancy, Business Studies (054) and Economics (030), with Mathematics (041) or Applied Mathematics (241) as an option but not both.",
        S.cbseScheme,
      ),
      F_WB_SETS,
      confirmed(
        "Bihar BSEB (2026-28 registration form): two compulsory languages, three electives chosen from Business Studies, Entrepreneurship, Economics and Accountancy, and an optional additional subject.",
        S.brArtsCommerce,
      ),
      confirmed(
        "Telangana: SCERT's list places the commerce combinations (such as Mathematics-Economics-Commerce and Commerce-Economics-Civics) under Humanities.",
        S.tsIntermediate,
      ),
      F_CUET,
      F_CLAT,
      F_NDA_WINGS,
      F_BPLAN,
      F_JEE_MAIN_SUBJECTS,
      F_NEET_SUBJECTS,
      unconfirmed("ICAI's entry rule for CA Foundation (icai.org not read)."),
      unconfirmed("Whether CBSE Applied Mathematics (241) counts as 'Mathematics' for B.Planning or B.Arch (the bulletin does not say)."),
      U_AP,
      unconfirmed("Karnataka commerce combination codes."),
      U_MH,
    ],
  },
  {
    slug: "arts-hec-humanities",
    kind: "class-11-12",
    title: "Arts or Humanities (HEC): History, Economics, Civics and more in Class 11-12",
    aliases: ["Arts", "Humanities", "HEC", "H.E.C.", "Arts stream", "I.A.", "आर्ट्स", "ఆర్ట్స్"],
    whatItIs: "Class 11 and 12 built around subjects such as history, political science or civics, economics, geography, sociology, psychology and languages.",
    duration: DURATION_CLASS_11_12,
    suits: "Students who enjoy reading, writing and debating about people, society and ideas, including those thinking about law, civil services, journalism, teaching or design.",
    legacyAnchor: "humanities",
    existingPages: [
      { href: "/schooling/streams#humanities", label: "Stream guide: Humanities" },
      { href: "/exams/after/12th", label: "Exams after Class 12" },
      { href: "/colleges/stream/law", label: "Law colleges" },
      { href: "/colleges/stream/university", label: "Universities" },
    ],
    facts: [
      F_CLAT,
      F_CUET,
      F_NDA_WINGS,
      F_BPLAN,
      confirmed(
        "Bihar BSEB (2026-28 registration form): two compulsory languages, three electives chosen from Music, Home Science, Philosophy, History, Political Science, Geography, Psychology, Sociology, Economics and Mathematics, and an optional additional subject.",
        S.brArtsCommerce,
      ),
      F_UP_NO_FIXED,
      F_WB_SETS,
      F_CBSE_NO_STREAMS,
      F_JEE_MAIN_SUBJECTS,
      F_NEET_SUBJECTS,
      unconfirmed("Bar Council of India Legal Education Rules text (the pages returned stubs); CLAT's rule is printed instead."),
      U_AP,
      unconfirmed("Karnataka arts combination codes."),
      U_MH,
      unconfirmed("Bihar arts elective code-to-subject mapping (PDF columns garbled)."),
    ],
  },
  {
    slug: "vocational",
    kind: "vocational-11-12",
    title: "Vocational Class 11-12: a trade or skill subject alongside your Class 12",
    aliases: ["Vocational", "Intermediate Vocational", "HSC Vocational", "Vocational course after 10th", "Skill subjects", "VHSE", "वोकेशनल"],
    whatItIs: "Class 11 and 12 in which one or more subjects is a job skill, such as IT, health care, agriculture, automobile or retail, taught with theory and practicals.",
    duration: DURATION_CLASS_11_12,
    suits: "Students who like learning by doing and want a job skill by the end of Class 12 while still earning a Class 12 certificate.",
    legacyAnchor: null,
    existingPages: [
      { href: "/colleges/iti-diploma", label: "ITI and diploma courses" },
      { href: "/exams/after/12th", label: "Exams after Class 12" },
    ],
    facts: [
      F_JEE_MAIN_ROUTES,
      confirmed(
        "For NIT-system B.E./B.Tech seats, a Technical Vocational subject can be the third subject beside Physics and Mathematics.",
        S.jeeMainBulletin,
      ),
      F_CUET_ROUTES,
      confirmed(
        "AICTE's B.E./B.Tech rule lists a Technical Vocational subject among the Class 12 subjects it accepts, and also accepts a D.Voc. in the same or an allied sector.",
        S.aicteAph,
      ),
      confirmed(
        "AP EAPCET 2025: a vocational course in Agriculture, Veterinary or Fishery Sciences counts toward the 'any two subjects' rule for the agriculture, veterinary and fishery degrees.",
        S.apEapcetAgriPharma,
      ),
      confirmed("CBSE: skill electives (Group S) can be taken along with any subject.", S.cbseScheme),
      confirmed(
        "WBCHSE: sixteen vocational subjects are offered in approved schools; a student who takes one cannot take Physical Education, Music, Visual Arts or Economics as an elective.",
        S.wbSubjects,
      ),
      unconfirmed("Kerala VHSE course list (vhseportal.kerala.gov.in not read)."),
      unconfirmed("AP BIE vocational course list."),
      unconfirmed("Maharashtra HSC vocational scheme (mahahsscboard.in not read)."),
      unconfirmed("Karnataka NSQF vocational subjects in PU."),
      unconfirmed("Inference, not a rule read: a vocational group without Physics does not meet the NIT-system or COA subject rules; check per board."),
    ],
  },
  {
    slug: "diploma-polytechnic",
    kind: "diploma",
    title: "Polytechnic diploma after Class 10",
    aliases: ["Polytechnic", "Diploma", "Diploma in Engineering", "Polytechnic after 10th", "Diploma after 10th", "POLYCET", "पॉलिटेक्निक", "పాలిటెక్నిక్"],
    whatItIs: "A technical diploma course at a polytechnic, taken after Class 10 in place of Class 11 and 12, in branches such as civil, mechanical, electrical, electronics or computer engineering.",
    duration: confirmed(
      "3 years after Class 10 (Engineering and Technology, Applied Arts and Crafts, Design)",
      S.aicteAph,
    ),
    suits: "Students who want hands-on technical training and an engineering qualification sooner, with the choice of studying further later.",
    legacyAnchor: null,
    existingPages: [
      { href: "/colleges/iti-diploma", label: "ITI and diploma courses" },
      { href: "/exams/entrance#entrance-state-cet", label: "State entrance tests, including polytechnic tests" },
      { href: "/exams/after/diploma-iti", label: "Exams after a diploma or ITI" },
    ],
    facts: [
      F_AICTE_DIPLOMA,
      F_JEE_MAIN_ROUTES,
      F_CUET_ROUTES,
      confirmed(
        "B.Arch (Council of Architecture rule, quoted in the JEE (Main) 2026 bulletin) also accepts a 10+3 diploma with Mathematics as a compulsory subject and at least 45% aggregate.",
        S.jeeMainBulletin,
      ),
      confirmed(
        "AICTE post-diploma courses in Engineering and Technology take 18 months or 2 years after a diploma passed with at least 50% (45% for reserved categories).",
        S.aicteAph,
      ),
      F_AICTE_DIPLOMA_LATERAL,
      unconfirmed("AICTE's rule for lateral entry of diploma holders to the second year of B.Tech (not read in this pass)."),
      unconfirmed("AP/TS POLYCET, Karnataka DCET and TN DOTE admission pages (not read)."),
      unconfirmed("Whether a 3-year diploma counts as 10+2 for NEET or NDA (the pages read do not say)."),
    ],
  },
  {
    slug: "iti",
    kind: "iti",
    title: "ITI: trade training after Class 10 (some trades after Class 8)",
    aliases: ["ITI", "Industrial Training Institute", "ITI trades", "ITI after 10th", "ITI after 8th", "NCVT", "Craftsmen Training Scheme", "आईटीआई", "ఐటీఐ"],
    whatItIs: "Hands-on training in a trade, such as electrician or fitter, at an Industrial Training Institute under the Craftsmen Training Scheme.",
    duration: confirmed("1 or 2 years, depending on the trade", S.dgtNiosFaq),
    suits: "Students who want to start skilled work early and would rather learn in a workshop than a classroom.",
    legacyAnchor: null,
    existingPages: [
      { href: "/colleges/iti-diploma", label: "ITI and diploma courses" },
      { href: "/careers/iti-electrician", label: "Career: ITI electrician" },
      { href: "/careers/iti-fitter", label: "Career: ITI fitter" },
      { href: "/exams/after/diploma-iti", label: "Exams after a diploma or ITI" },
    ],
    facts: [
      confirmed(
        "ITI trades under the Craftsmen Training Scheme take one or two years and are entered after Class VIII or Class X, depending on the trade.",
        S.dgtNiosFaq,
      ),
      confirmed(
        "Under the NIOS-DGT scheme, ITI learners can also earn NIOS Secondary (Class 10) or Senior Secondary (Class 12) certification, with ITI trade subjects counted by credit transfer.",
        S.dgtNiosFaq,
      ),
      confirmed(
        "Under the same scheme, a learner in a 1-year trade taken after Class X gets the Class 12 certificate only after a gap of at least 2 years from passing Class 10.",
        S.dgtNiosFaq,
      ),
      F_AICTE_DIPLOMA_LATERAL,
      unconfirmed("Entry qualification per trade (Class 8 or Class 10) and the minimum age: seen only in search summaries of NSTI pages, not read on dgt.gov.in."),
      unconfirmed("Which trades accept a Class 8 pass."),
      unconfirmed("State ITI admission rules."),
    ],
  },
  {
    slug: "nios",
    kind: "open-school",
    title: "NIOS Senior Secondary: open schooling for Class 12",
    aliases: ["NIOS", "NIOS 12th", "NIOS Senior Secondary", "Open school", "Open schooling", "एनआईओएस", "ఎన్ఐఓఎస్"],
    whatItIs: "The Class 12 level course of the National Institute of Open Schooling, studied through open and distance learning with subjects you choose.",
    duration: unconfirmed("Course length and the admission window were not read on nios.ac.in."),
    suits: "Students who need flexibility: those studying while working, returning after a break, or unable to attend a regular school.",
    legacyAnchor: null,
    existingPages: [
      { href: "/distance-learning", label: "Open and distance learning (NIOS, IGNOU)" },
      { href: "/exams/after/12th", label: "Exams after Class 12" },
    ],
    facts: [
      confirmed(
        "NIOS Senior Secondary needs a pass in at least five subjects: one or two languages from Group A and three or four subjects from the other groups, with up to two additional subjects (seven at most). The subjects of one group (B to F) are examined on the same day and at the same time.",
        S.niosSeniorSecondary,
      ),
      F_JEE_MAIN_ROUTES,
      F_CUET_ROUTES,
      unconfirmed("CLAT 2027 (UG) asks for '10+2 or an equivalent examination'; the page does not name NIOS."),
      unconfirmed("NEET (UG): the bulletin requires 'duly recognized boards' and English, and does not name NIOS."),
      unconfirmed("JEE (Advanced) and NDA pages do not mention NIOS."),
      unconfirmed("NIOS 2026-27 prospectus (not read; the regional-centre page carries older notices)."),
    ],
  },
];
