// Site landings the search can open (26 Sep 2026): the section and tool pages
// of the sitemap's sectionLandings list plus the home, school and sign-in
// entry points, each with the words students use for it in English, Hindi
// and Telugu. Pure data. Every path is a page.tsx under src/app (checked by
// tests/unit/search-resolver.test.ts). Deliberately absent: /for/* (persona
// pages are list rows only), /aptitude (noindex, nofollow), /today,
// /dashboard, /me, /chat, /api — private or retired surfaces.
//
// Titles and one-line subs describe the page as it is; no counts are typed.

import type { SearchSection } from "./types";

export interface SearchLanding {
  path: string;
  section: SearchSection;
  title: string;
  sub: string;
  /** Names and phrases, any script; normalised when the index is built. */
  terms: readonly string[];
}

export const SEARCH_LANDINGS: readonly SearchLanding[] = [
  { path: "/", section: "more", title: "Shishya home", sub: "Every section in one place", terms: ["home", "homepage", "shishya", "shishya home", "शिष्य"] },
  {
    path: "/schooling", section: "school", title: "School", sub: "CBSE (NCERT) and ICSE / ISC classes, subjects and chapters",
    terms: ["school", "schooling", "school classes", "ncert books", "school study", "स्कूल", "स्कूली पढ़ाई", "పాఠశాల", "స్కూల్"],
  },
  {
    path: "/schooling/streams", section: "school", title: "Streams after Class 10", sub: "Science, commerce and humanities, and what each leads to",
    terms: ["streams", "stream selection", "streams after 10th", "which stream", "science commerce arts", "stream after class 10", "कौन सा स्ट्रीम", "స్ట్రీమ్"],
  },
  {
    path: "/exams/browse", section: "government", title: "All exams", sub: "Browse every exam on Shishya by category",
    terms: ["all exams", "exam list", "browse exams", "list of exams", "exams list", "सभी परीक्षाएं", "अन्य परीक्षाएं", "అన్ని పరీక్షలు"],
  },
  // 26 Sep 2026 (G2): the Entrance section's own hub (src/app/exams/entrance, live since Wave 1) —
  // also the section fallback for entrance searches (resolve.ts SECTION_FALLBACK).
  {
    path: "/exams/entrance", section: "entrance", title: "Entrance exams", sub: "National entrance exams, olympiads and state CETs",
    terms: ["entrance exams", "entrance exam", "entrance exams in india", "all entrance exams", "list of entrance exams", "entrance tests", "प्रवेश परीक्षाएं", "ప్రవేశ పరీక్షలు"],
  },
  {
    path: "/exams/state", section: "government", title: "Exams by state", sub: "Government and entrance exams, state by state",
    terms: ["exams by state", "state exams", "state wise exams", "state government exams", "state psc", "राज्य परीक्षाएं", "రాష్ట్ర పరీక్షలు"],
  },
  {
    path: "/current-affairs", section: "government", title: "Current affairs", sub: "Daily current affairs and monthly capsules",
    terms: ["current affairs", "current affair", "daily current affairs", "monthly current affairs", "gk current affairs", "samsamayiki", "करंट अफेयर्स", "करेंट अफेयर्स", "समसामयिकी", "కరెంట్ అఫైర్స్", "వర్తమాన వ్యవహారాలు"],
  },
  {
    path: "/find-your-exam", section: "government", title: "Find your exam", sub: "Exams that fit your age, education and state",
    terms: ["find your exam", "find my exam", "which exam", "which exam should i give", "exam finder", "eligible exams", "exams i can write", "कौन सी परीक्षा", "ఏ పరీక్ష"],
  },
  { path: "/typing", section: "government", title: "Typing test", sub: "Typing practice for skill tests", terms: ["typing", "typing test", "typing practice", "typing speed", "typing skill test", "टाइपिंग", "टाइपिंग टेस्ट"] },
  {
    path: "/descriptive", section: "government", title: "Descriptive writing", sub: "Essay and letter practice for descriptive papers",
    terms: ["descriptive", "descriptive writing", "descriptive paper", "essay writing", "letter writing", "precis writing", "निबंध लेखन"],
  },
  { path: "/live-test", section: "government", title: "Live tests", sub: "Scheduled all-India live tests", terms: ["live test", "live tests", "sunday live test", "all india live test", "all india mock", "लाइव टेस्ट", "లైవ్ టెస్ట్"] },
  {
    path: "/exam-calendar", section: "government", title: "Exam calendar", sub: "Upcoming exam dates, admit cards and results",
    terms: ["exam calendar", "exams calendar", "upcoming exams", "exam schedule", "upcoming exam dates", "परीक्षा कैलेंडर", "परीक्षा तिथियां", "పరీక్షల క్యాలెండర్"],
  },
  { path: "/results", section: "government", title: "Results", sub: "Declared exam results", terms: ["results", "exam results", "sarkari result", "सरकारी रिजल्ट", "परिणाम", "ఫలితాలు"] },
  { path: "/coach", section: "government", title: "Study coach", sub: "A day-by-day study plan", terms: ["study coach", "coach", "personal coach", "study plan", "daily plan", "study timetable", "time table", "timetable"] },
  { path: "/ask", section: "more", title: "Search or ask Shishya", sub: "Search every section; ask when no page fits", terms: ["ask shishya", "search shishya", "ask"] },
  {
    path: "/jobs-map", section: "careers", title: "Jobs map", sub: "Which government jobs your education opens",
    terms: ["jobs map", "job map", "which job can i get", "government jobs map", "sarkari naukri map", "नौकरी मानचित्र"],
  },
  // 26 Sep 2026 (integrator): /mentors recruits people who cleared an exam;
  // it offers no sessions, so it is named for what it is and no longer
  // matches "mentorship" / "guidance session" searches.
  { path: "/mentors", section: "more", title: "Become a Shishya mentor", sub: "For people who cleared an exam — guide the students preparing for it", terms: ["become a mentor", "be a mentor", "mentor apply", "mentor", "mentors"] },
  { path: "/ideas", section: "more", title: "Ideas board", sub: "Student feature requests and what was built", terms: ["ideas", "feature request", "suggest a feature", "suggestion", "feedback"] },
  { path: "/educators", section: "more", title: "For educators", sub: "Teachers and institutes on Shishya", terms: ["educators", "for teachers", "coaching institute", "teach on shishya", "institute"] },
  { path: "/about", section: "more", title: "About Shishya", sub: "Who builds Shishya and why", terms: ["about shishya", "about", "who made shishya", "shishya kya hai", "शिष्य क्या है"] },
  { path: "/pricing", section: "more", title: "Pricing", sub: "What is free on Shishya", terms: ["pricing", "price", "is shishya free", "free or paid", "cost", "plans", "subscription", "kya ye free hai"] },
  { path: "/contact", section: "more", title: "Contact", sub: "Write to the Shishya team", terms: ["contact", "contact us", "support", "help", "email shishya"] },
  { path: "/revision", section: "government", title: "Revision", sub: "Quick revision of what you practised", terms: ["revision", "revise", "quick revision", "रिवीजन"] },
  {
    path: "/post-graduation", section: "college", title: "After graduation — PG options", sub: "PG entrance exams and paths after a degree",
    terms: ["post graduation", "postgraduation", "pg options", "masters", "after graduation", "pg entrance", "पीजी", "पोस्ट ग्रेजुएशन", "పీజీ"],
  },
  { path: "/jobs", section: "careers", title: "Jobs", sub: "Government jobs, internships, resumes and skill careers", terms: ["jobs", "job options", "jobs hub", "नौकरियां", "ఉద్యోగాలు"] },
  {
    path: "/worldwide", section: "more", title: "Study abroad", sub: "Countries, universities, tests and loans for Indian students",
    terms: ["study abroad", "abroad", "videsh", "foreign study", "study overseas", "abroad study", "विदेश में पढ़ाई", "విదేశాల్లో చదువు"],
  },
  { path: "/insights", section: "more", title: "Insights", sub: "Data-led articles on exams, colleges and careers", terms: ["insights", "articles", "blog"] },
  { path: "/careers", section: "careers", title: "Careers", sub: "Career paths with entry routes and salary bands", terms: ["careers", "career", "career options", "career guidance", "करियर", "कैरियर", "కెరీర్"] },
  { path: "/jobs/govt-jobs", section: "careers", title: "Government jobs list", sub: "Government jobs by type, with the exam for each", terms: ["government jobs list", "govt jobs list", "list of government jobs", "types of government jobs"] },
  { path: "/jobs/internships", section: "careers", title: "Internships", sub: "Where students find genuine internships", terms: ["internship", "internships", "summer internship", "इंटर्नशिप", "ఇంటర్న్‌షిప్"] },
  { path: "/jobs/resume", section: "careers", title: "Resume help", sub: "How to write a first resume", terms: ["resume", "cv", "biodata", "resume format", "रिज्यूमे"] },
  { path: "/jobs/skill-careers", section: "careers", title: "Skill careers", sub: "Careers built on skills rather than a degree", terms: ["skill careers", "skill jobs", "jobs without degree", "skill based jobs"] },
  {
    path: "/colleges", section: "college", title: "Colleges", sub: "NIRF-ranked colleges by stream and state",
    terms: ["colleges", "college", "top colleges", "best colleges", "nirf ranking", "nirf", "कॉलेज", "కాలేజీలు", "కళాశాలలు"],
  },
  { path: "/colleges/cutoffs", section: "college", title: "College cutoffs", sub: "Closing ranks by college and branch", terms: ["college cutoffs", "college cutoff", "josaa cutoff", "closing rank", "closing ranks"] },
  { path: "/colleges/placements", section: "college", title: "College placements", sub: "Placement numbers by college and branch", terms: ["college placements", "placement records", "placement statistics", "placement report"] },
  {
    path: "/colleges/iti-diploma", section: "college", title: "ITI and diploma", sub: "ITI trades, diploma programmes and polytechnic entrance",
    terms: ["iti", "diploma", "iti trades", "iti courses", "polytechnic courses", "diploma courses", "आईटीआई", "డిప్లొమా"],
  },
  { path: "/scholarships", section: "college", title: "Scholarships", sub: "Central, state and private scholarships", terms: ["scholarships", "scholarship", "छात्रवृत्ति", "स्कॉलरशिप", "స్కాలర్‌షిప్స్", "ఉపకార వేతనాలు"] },
  {
    path: "/scholarships/match", section: "college", title: "Find your scholarships", sub: "Scholarships that fit your class, category and state",
    terms: ["scholarship match", "scholarship finder", "which scholarship can i get", "find scholarship", "scholarships for me", "eligible scholarships"],
  },
  { path: "/worldwide/compare", section: "more", title: "Compare study-abroad countries", sub: "Costs, work permits and visas side by side", terms: ["compare countries", "compare study abroad", "which country to study"] },
  { path: "/worldwide/loans", section: "more", title: "Education loans", sub: "Lenders and terms for study loans", terms: ["education loan", "study loan", "student loan", "abroad loan", "एजुकेशन लोन", "ఎడ్యుకేషన్ లోన్"] },
  {
    path: "/distance-learning", section: "college", title: "Distance learning", sub: "Recognised distance and open-university programmes",
    terms: ["distance learning", "distance education", "ignou", "open university", "correspondence course", "online degree"],
  },
  // 26 Sep 2026 (search fixer): the page is composite, anonymised career-journey examples
  // (src/lib/alumni-stories-copy.ts) — not testimonials and not about using Shishya; no
  // "success stories" / "toppers stories" terms that would promise real people.
  {
    path: "/alumni-stories", section: "careers", title: "Career journey examples", sub: "Composite examples of students' paths — not real individuals' stories",
    terms: ["career journey examples", "career journeys", "career journey", "alumni stories"],
  },
  { path: "/soft-skills", section: "careers", title: "Soft skills", sub: "Communication and interview skills", terms: ["soft skills", "communication skills", "interview skills", "english speaking", "personality development"] },
  { path: "/career-map", section: "careers", title: "Career map", sub: "How careers connect, from school onwards", terms: ["career map", "career paths", "career tree", "career roadmap"] },
  { path: "/login", section: "more", title: "Sign in", sub: "Sign in or create a free account", terms: ["sign in", "sign up", "login", "log in", "register", "create account", "signup", "साइन अप"] },
  { path: "/discussions", section: "more", title: "Discussions", sub: "Student discussion threads", terms: ["discussions", "discussion", "discussion forum", "forum", "doubts forum"] },
  { path: "/editorial-policy", section: "more", title: "Editorial policy", sub: "How Shishya sources and checks its data", terms: ["editorial policy", "how shishya verifies", "data sources", "sources"] },
  { path: "/verification", section: "more", title: "Verification", sub: "How facts on Shishya are verified", terms: ["verification", "verified data"] },
  { path: "/terms", section: "more", title: "Terms of use", sub: "Terms of using Shishya", terms: ["terms", "terms of use", "terms and conditions"] },
  { path: "/privacy", section: "more", title: "Privacy", sub: "What Shishya stores and why", terms: ["privacy", "privacy policy", "data privacy"] },
  { path: "/refunds", section: "more", title: "Refunds", sub: "Refund policy", terms: ["refund", "refunds", "refund policy"] },
];
