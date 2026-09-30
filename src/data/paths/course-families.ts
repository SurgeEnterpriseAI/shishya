// Course families (30 Sep 2026, P1 build 1, spec §1.2).
//
// What /after-12th lists (the families after "12th"), what the stream pages
// point to next, and the bridge from a stream option to the college-stream
// and career pages Shishya already has. P1 links existing pages only —
// /courses/* pages are P4.
//
// `fromStreams` names only the options a sourced rule keeps open (edges.ts
// FAMILY_RULES carries the rule and its source), plus two navigation-only
// families with no rule read yet: commerce-pro (ICAI's CA Foundation rule was
// not read) and design (no design entrance rule was read). Their edges are
// "leads-to" (a path, not a rule), never "keeps-open".
//
// Exam codes are linked only while live; CLAT, BITSAT and IPMAT had no Exam
// row on 26 Sep 2026 and are examLabels. CA Foundation DID have a row
// (CA_FOUNDATION in the 26 Sep search snapshot), so it is an exam code, not a
// label as spec §1.2 assumed.
//
// COURSE_FAMILY_DETAILS: "what it is" (our words, no numbers) and a duration
// fact — confirmed only where AICTE's handbook states it (B.E./B.Tech and
// B.Planning: 4 years); every other duration is unconfirmed and not printed.
//
// 30 Sep 2026 (review fix): `careerSlugs` where a careers.ts category is too
// broad for the family. The "defence" category also holds merchant navy,
// commercial pilot and police constable — none of them NDA officer entry, and
// careers.ts gives the pilot and merchant-navy routes as Class 12 PCM, which
// the BiPC, Commerce and Arts pages must not list. "design" holds the
// architect, whose careers.ts route is PCM → NATA (the Arts page closes
// B.Arch). "engineering" careers all go through a B.Tech, which the diploma
// and ITI pages cannot promise (lateral entry to B.Tech is unconfirmed). So
// defence → the armed forces officer, architecture → the architect, design →
// the design category without the architect, the engineering diploma → the
// skilled-trade careers.
//
// 30 Sep 2026 (review fix): law.fromStreams no longer names vocational. CLAT's
// page asks for "10+2 or an equivalent examination" and names neither the HSC
// Vocational examination nor NIOS; NIOS was already left out on that
// evidence, so vocational is treated the same way (paths-registry pins it).
//
// Pure data.

import { CAREERS } from "@/data/careers";
import type { CourseFamily, CourseFamilyDetail, PathFact } from "./types";
import { PATH_SOURCES as S } from "./sources";

export const COURSE_FAMILIES: readonly CourseFamily[] = [
  {
    id: "engineering",
    name: "Engineering (B.E. / B.Tech)",
    aliases: ["BTech", "B.Tech", "B.E.", "Engineering after 12th", "Engineering degree"],
    after: "12th",
    links: [
      { href: "/colleges/stream/engineering", label: "Engineering colleges" },
      { href: "/exams/entrance#entrance-engineering", label: "Engineering entrance exams" },
    ],
    examCodes: ["JEE_MAIN", "JEE_ADVANCED", "MH_MHTCET", "KA_KCET", "KA_COMEDK", "AP_EAMCET", "TS_EAMCET", "WB_WBJEE", "KL_KEAM"],
    examLabels: ["BITSAT"],
    collegeStream: "engineering",
    careerCategories: ["engineering"],
    fromStreams: ["mpc-pcm", "pcmb"],
  },
  {
    id: "medical",
    name: "Medicine and health (MBBS, BDS, AYUSH)",
    aliases: ["MBBS", "BDS", "BAMS", "BHMS", "Medical after 12th", "Doctor"],
    after: "12th",
    links: [
      { href: "/colleges/stream/medical", label: "Medical colleges" },
      { href: "/exams/entrance#entrance-medical", label: "Medical entrance exams" },
    ],
    examCodes: ["NEET_UG"],
    examLabels: [],
    collegeStream: "medical",
    careerCategories: ["medicine"],
    fromStreams: ["bipc-pcb", "pcmb"],
  },
  {
    id: "law",
    name: "Law (integrated LL.B after Class 12)",
    aliases: ["Law after 12th", "BA LLB", "BBA LLB", "LLB", "Integrated law"],
    after: "12th",
    links: [
      { href: "/colleges/stream/law", label: "Law colleges" },
      { href: "/exams/entrance#entrance-law", label: "Law entrance exams" },
    ],
    examCodes: ["AILET"],
    examLabels: ["CLAT"],
    collegeStream: "law",
    careerCategories: ["law"],
    fromStreams: ["mpc-pcm", "bipc-pcb", "pcmb", "commerce-cec-mec", "arts-hec-humanities"],
  },
  {
    id: "design",
    name: "Design (B.Des)",
    aliases: ["B.Des", "BDes", "Design after 12th", "Fashion design"],
    after: "12th",
    links: [{ href: "/exams/entrance#entrance-university", label: "University and design entrance exams" }],
    examCodes: ["UCEED", "NID_DAT", "NIFT"],
    examLabels: [],
    collegeStream: null,
    careerCategories: ["design"],
    fromStreams: ["arts-hec-humanities"],
  },
  {
    id: "commerce-pro",
    name: "Commerce and finance (B.Com, BBA, CA, CS, CMA)",
    aliases: ["B.Com", "BCom", "BBA", "CA", "Chartered Accountancy", "CS", "CMA", "Commerce after 12th"],
    after: "12th",
    links: [
      { href: "/colleges/stream/management", label: "Management colleges" },
      { href: "/exams/entrance#entrance-management", label: "Management entrance exams" },
    ],
    examCodes: ["CUET_UG", "CA_FOUNDATION"],
    examLabels: ["IPMAT"],
    collegeStream: "management",
    careerCategories: ["finance", "business-mgmt"],
    fromStreams: ["commerce-cec-mec"],
  },
  {
    id: "university",
    name: "University degrees (B.A., B.Sc., B.Com through CUET UG)",
    aliases: ["BA", "B.A.", "BSc", "B.Sc.", "Central university admission", "CUET"],
    after: "12th",
    links: [
      { href: "/colleges/stream/university", label: "Universities" },
      { href: "/exams/entrance#entrance-university", label: "University and design entrance exams" },
    ],
    examCodes: ["CUET_UG"],
    examLabels: [],
    collegeStream: "university",
    careerCategories: ["education-research"],
    fromStreams: ["mpc-pcm", "bipc-pcb", "pcmb", "commerce-cec-mec", "arts-hec-humanities", "vocational", "diploma-polytechnic", "nios"],
  },
  {
    id: "defence",
    name: "Defence officer entry after Class 12 (NDA)",
    aliases: ["NDA", "Army after 12th", "Navy after 12th", "Air Force after 12th", "Defence after 12th"],
    after: "12th",
    links: [
      { href: "/careers/armed-forces-officer", label: "Career: armed forces officer" },
      { href: "/exams/entrance#entrance-defence", label: "Defence entrance (NDA)" },
    ],
    examCodes: ["NDA"],
    examLabels: [],
    collegeStream: null,
    careerCategories: ["defence"],
    fromStreams: ["mpc-pcm", "bipc-pcb", "pcmb", "commerce-cec-mec", "arts-hec-humanities"],
  },
  {
    id: "architecture",
    name: "Architecture and planning (B.Arch, B.Planning)",
    aliases: ["B.Arch", "BArch", "B.Planning", "B.Plan", "Architecture after 12th"],
    after: "12th",
    links: [{ href: "/colleges/stream/architecture", label: "Architecture colleges" }],
    examCodes: ["NATA", "JEE_MAIN"],
    examLabels: [],
    collegeStream: "architecture",
    careerCategories: ["design"],
    fromStreams: ["mpc-pcm", "pcmb", "diploma-polytechnic"],
  },
  {
    id: "diploma-lateral",
    name: "Engineering diploma, including lateral entry to its second year",
    aliases: ["Polytechnic", "Diploma in Engineering", "Lateral entry diploma", "Diploma after ITI"],
    after: "10th",
    links: [
      { href: "/colleges/iti-diploma", label: "ITI and diploma courses" },
      { href: "/exams/entrance#entrance-state-cet", label: "State entrance tests, including polytechnic tests" },
    ],
    examCodes: ["UP_JEECUP", "AP_POLYCET", "TS_POLYCET", "BR_DCECE", "UK_POLYTECHNIC", "HP_POLYTECHNIC"],
    examLabels: [],
    collegeStream: null,
    careerCategories: ["engineering", "skilled-trade"],
    fromStreams: ["diploma-polytechnic", "iti"],
  },
];

const unconfirmedDuration = (what: string): PathFact => ({
  text: `${what}: course length not read on the regulator's own page.`,
  status: "unconfirmed",
  source: null,
});

export const COURSE_FAMILY_DETAILS: Readonly<Record<string, CourseFamilyDetail>> = {
  engineering: {
    whatItIs: "A bachelor's degree in an engineering or technology branch, such as computer science, civil, mechanical or electrical engineering.",
    duration: { text: "4 years (AICTE, Engineering and Technology)", status: "confirmed", source: S.aicteAph },
  },
  medical: {
    whatItIs: "Degrees in medicine (MBBS), dentistry (BDS) and the AYUSH systems (BAMS, BSMS, BUMS, BHMS).",
    duration: unconfirmedDuration("MBBS, BDS and AYUSH"),
  },
  law: {
    whatItIs: "An integrated law degree that combines a first degree (such as B.A. or BBA) with the LL.B.",
    duration: unconfirmedDuration("Integrated LL.B"),
  },
  design: {
    whatItIs: "A bachelor's degree in design, such as product, communication or fashion design.",
    duration: unconfirmedDuration("B.Des"),
    // Computed, so a design career added to careers.ts joins by itself.
    careerSlugs: CAREERS.filter((c) => c.category === "design" && c.slug !== "architect").map((c) => c.slug),
  },
  "commerce-pro": {
    whatItIs: "Commerce and business degrees, and the professional routes of chartered accountancy, company secretaryship and cost accountancy.",
    duration: unconfirmedDuration("B.Com, BBA, CA, CS and CMA"),
  },
  university: {
    whatItIs: "Arts, science and commerce degrees (B.A., B.Sc., B.Com) at universities and their colleges.",
    duration: unconfirmedDuration("B.A., B.Sc. and B.Com"),
  },
  defence: {
    whatItIs: "Officer training for the Army, Navy and Air Force through the National Defence Academy and Naval Academy exam.",
    duration: unconfirmedDuration("NDA training"),
    careerSlugs: ["armed-forces-officer"],
  },
  architecture: {
    whatItIs: "Degrees in architecture (B.Arch) and in planning (B.Planning).",
    duration: unconfirmedDuration("B.Arch"),
    careerSlugs: ["architect"],
  },
  "diploma-lateral": {
    whatItIs: "A polytechnic diploma in an engineering or technology branch; AICTE also allows entry to its second year (lateral entry).",
    duration: { text: "3 years after Class 10; 2 years from the second-year (lateral) entry (AICTE)", status: "confirmed", source: S.aicteAph },
    // Every "engineering" career in careers.ts is reached through a B.Tech,
    // and lateral entry from a diploma to B.Tech was not read (unconfirmed),
    // so this family lists the trade careers only (computed).
    careerSlugs: CAREERS.filter((c) => c.category === "skilled-trade").map((c) => c.slug),
  },
};
