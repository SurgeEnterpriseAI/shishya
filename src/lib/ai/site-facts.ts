// What Shishya actually offers — the tutor's only map of the site
// (24 Sep 2026).
//
// The September read of 1,160 signed-in tutor messages found the tutor
// inventing the product: asked "how do I remove an exam", it described
// "Settings → Exams", "Profile → My Exams" and a Shishya Android/iOS app —
// none of which exist — across 8 replies to one student. It also never
// pointed anyone to "Build my own mock", the PYQ year sets, the cutoff page,
// the tracker, the coach plan or the language picker inside a mock, though
// students asked for exactly those. The tutor had no list of real features,
// so it guessed.
//
// SITE_FEATURES is that list, read off src/app (every path is a real route;
// tests/unit/tutor-site-facts.test.ts checks each against the file system)
// and the pages' own labels. It is exam-agnostic ({CODE} is a placeholder
// the syllabus block fills), so the rendered block sits in the tutor's
// shared 1-hour cached prefix and stays byte-identical for every student and
// exam. Per-exam truth — which gated pages render, the pattern, the dates —
// lives in src/lib/ai/exam-facts.ts, in the per-exam block after the
// syllabus.
//
// Review fix (24 Sep 2026): the first cut called the list "the ONLY
// features" and told the tutor to say Shishya "doesn't have" anything
// unlisted — but it left out live features (typing test, descriptive
// evaluation, discussions, Ask Shishya, scholarships, the jobs map,
// Challenge a friend, study groups, study rooms, phone alerts), so the tutor
// would have denied them. They are listed now, and only what NOT_ON_SHISHYA
// names may be denied outright; anything else unlisted is "I don't know of
// that on Shishya", never "Shishya doesn't have it".
//
// Change this list when a feature ships or goes; never add a feature that
// is only planned. Editing it re-writes the shared cache once, which is fine.

import { OTHER_INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { PERSONAS } from "@/data/personas";
// 26 Sep 2026 (entry points, after G4): the scholarship lists and the
// closing-soon window come from the module that renders those pages, so the
// tutor names every list that exists and the window's real length.
import { CLOSING_SOON_DAYS, SCHOLARSHIP_FILTERS } from "@/lib/scholarship-lists";

/** /exams/category/{slug} hubs the tutor may name (26 Sep 2026). A hub with
 *  fewer than EXAM_CATEGORY_MIN active exams is a 404
 *  (src/lib/exam-categories.ts), and which ones clear it needs the DB, which
 *  this cached, argument-free block cannot read. Read-only probe 26 Sep 2026
 *  (scripts/tmp-w2-entry-category-live.ts): state-psc 43, teaching 23,
 *  police 19, engineering-entrance 18 and banking 6 open; law-entrance sits
 *  exactly on the floor (5) and is left out so that one retired exam cannot
 *  turn a tutor link into a 404; railway, ssc, defence, upsc-civil-services,
 *  medical, management and design entrance had fewer than 5 and 404.
 *  tests/unit/tutor-site-facts.test.ts pins each slug to EXAM_CATEGORIES.
 *  Re-run the probe and edit this list when a hub opens or closes. */
export const TUTOR_EXAM_CATEGORY_SLUGS: readonly string[] = ["banking", "police", "teaching", "state-psc", "engineering-entrance"];

/** /exams/after/{level} pages the tutor may name (26 Sep 2026). Same probe:
 *  10th 23, 12th 71 and graduation 64 exams (indexable); diploma-iti holds 1
 *  exam (noindex) and is left out; postgraduation is held — a 404 — until
 *  UGC NET, CSIR NET, CUET PG and IIT JAM have live rows
 *  (src/lib/exam-qualification.ts). Pinned to PUBLISHED_LEVELS by the test. */
export const TUTOR_QUALIFICATION_LEVELS: readonly string[] = ["10th", "12th", "graduation"];

export interface SiteFeature {
  /** Path on https://shishya.in. {CODE} = exam code, {TOPIC} = topic code,
   *  {YEAR} = a year that has a set. A query string is part of the link. */
  path: string;
  /** The name the student sees on the page (heading, pill or button). */
  name: string;
  /** What it does — only what the page does today. */
  what: string;
  /** Needs a free Google sign-in (the page itself may still open). */
  signIn?: boolean;
}

export const SITE_FEATURES: readonly SiteFeature[] = [
  // ── One exam ───────────────────────────────────────────────────────
  {
    path: "/exams/{CODE}",
    name: "Exam page",
    what: `the pattern and next dates, then these sections: "Mock tests" (full mocks and 25-question subject tests, plus "All my attempts"), "Previous year papers" (PYQ-pattern practice sets by year, and an "Official papers" block with the conducting body's own papers where Shishya has them), "Build my own mock" (type what to be tested on — topics, size, difficulty — or leave it blank to target weak topics), the syllabus with a notes page per topic, and "Talk to Shishya"`,
  },
  {
    path: "/exams/{CODE}/build-mock",
    name: "Mock builder",
    what: "pick syllabus topics, then size and difficulty; timed, scored, with solutions. ?topics=CODE1,CODE2 pre-fills topics; ?pyq=1 is PYQ-pattern mode — a topic's PYQ-pattern questions from every year (offered only when a topic has 3 or more)",
    signIn: true,
  },
  {
    path: "/exams/{CODE}/pyq/{YEAR}",
    name: "PYQ year set",
    what: "questions modelled on that year's paper — NOT the actual paper, and usually far fewer questions than it; timed, with negative marking",
    signIn: true,
  },
  { path: "/exams/{CODE}/syllabus", name: "Full syllabus", what: "subjects and topics, each linked to its notes page" },
  {
    path: "/exams/{CODE}/topics/{TOPIC}",
    name: "Topic page",
    what: `study notes and practice for one topic (not every topic has notes yet). Under the notes, "Study this together": "Invite to study" (a WhatsApp link to the notes) and "Open study room" (the topic's shared discussion thread)`,
  },
  { path: "/exams/{CODE}/topics/{TOPIC}/hi", name: "हिंदी में पढ़ें", what: "the topic's notes in Hindi — only where a Hindi translation exists (the topic page then shows this link)" },
  { path: "/exams/{CODE}/topics/{TOPIC}/quiz", name: "Topic quiz", what: "a short quiz on one topic, no sign-in needed" },
  { path: "/exams/{CODE}/quiz", name: "Free 5-question quiz", what: "a quick taste of the exam, no sign-in needed" },
  {
    path: "/exams/{CODE}/updates",
    name: "Dates & updates",
    what: `the exam tracker — every date labelled official, reported or expected — and "Get alerted": email alerts (no account needed) and "Alert me on this phone" (browser notifications, where the phone's browser supports them)`,
  },
  { path: "/exams/{CODE}/archive", name: "Older updates", what: "earlier cycles' dates and news for the exam" },
  { path: "/exams/{CODE}/live", name: "Exam day page", what: "on an announced exam day, a one-tap poll on how the paper went; answer-key and result status, papers and the cutoff estimate" },
  { path: "/exams/{CODE}/reactions", name: "After the paper", what: "the same answer-key and result status after the exam, plus a summary of public reactions once one is ready" },
  {
    path: "/exams/{CODE}/cutoff",
    name: "Expected cutoff",
    what: "estimated score-to-rank bands (estimates, not official cutoffs), plus official cutoff tables where Shishya holds the published document",
  },
  { path: "/exams/{CODE}/tricks", name: "Tricks & mnemonics", what: "memory tricks by subject" },
  { path: "/exams/{CODE}/guide", name: "How to crack it", what: "a preparation guide for the exam" },
  { path: "/exams/{CODE}/checklist", name: "Exam checklist", what: "last-minute checklist: exam day, admit card, what to carry, the pattern" },
  { path: "/exams/{CODE}/attempts", name: "All my attempts", what: "every mock taken on this exam, each linked to its results page", signIn: true },
  {
    path: "/exams/{CODE}/score-estimate",
    name: "Score calculator",
    what: "marks from the answer key under the exam's marking scheme; the exam page links it only around answer-key time and only when one marking scheme can be stated",
  },
  // ── Across exams ───────────────────────────────────────────────────
  {
    path: "/dashboard",
    name: "Dashboard",
    what: `"Your exams", Daily 5, streak, topics due for revision, other exams to explore, and "Study group" (make a group, share its invite link, see each member's study days and questions practised this week — no scores; the maker can be told on their phone when a friend joins)`,
    signIn: true,
  },
  { path: "/today", name: "Daily 5", what: "today's 5-question practice set", signIn: true },
  {
    path: "/revision",
    name: "Mistake Notebook",
    what: "every wrong answer from the student's mocks plus starred questions; one tap re-tests them",
    signIn: true,
  },
  { path: "/coach", name: "Personal coach", what: "a free day-by-day study plan after a 30-second intake", signIn: true },
  {
    path: "/live-test",
    name: "All-India Live Test",
    what: "Sunday papers — the same paper across India, rank shown on submit — and exam-week rehearsals; the page lists which exams have one",
    signIn: true,
  },
  { path: "/exam-calendar", name: "Exam calendar", what: "upcoming dates across all exams, labelled official or expected" },
  { path: "/results", name: "Results", what: "declared exam results with the official link" },
  { path: "/find-your-exam", name: "Find your exam", what: "matches age, education and state to the government exams the student can apply for" },
  { path: "/exams/browse", name: "All exams", what: "search every exam on Shishya by name, state, language or category" },
  // 26 Sep 2026: the Entrance exams section landing (src/app/exams/entrance/page.tsx).
  { path: "/exams/entrance", name: "Entrance exams", what: "the admission tests on Shishya grouped by kind: engineering, medical, university and design, law, management, defence (NDA), olympiads and state CETs" },
  { path: "/exams/state", name: "Exams by state", what: "government exams grouped by state and union territory" },
  // 26 Sep 2026 (entry points, after G4): the comparison lists — the value
  // lists above say which slugs open and why.
  {
    path: "/exams/category/{CATEGORY}",
    name: "Compare exams by category",
    what: `the exams of one kind on Shishya in one table: next exam day marked official, reported or expected; age limit and qualification (marked checked, or an indicative summary to confirm on the official site); official site; practice on Shishya. {CATEGORY} is one of ${TUTOR_EXAM_CATEGORY_SLUGS.join(", ")}; for any other kind use All exams`,
  },
  {
    path: "/exams/after/{LEVEL}",
    name: "Exams after 10th, 12th or graduation",
    what: `government and entrance exams listed under the lowest qualification each one accepts (each exam appears once, so a 12th-pass student should also look at the exams after 10th), in the same table; {LEVEL} is one of ${TUTOR_QUALIFICATION_LEVELS.join(", ")}. There is no list of exams after postgraduation yet`,
  },
  { path: "/jobs-map", name: "India's Govt Jobs Map", what: "central and state government jobs (Group A to C, banking, defence, police, teaching) with indicative pay bands and the exams Shishya tracks" },
  { path: "/current-affairs", name: "Current affairs", what: "daily digest and monthly capsules" },
  {
    path: "/typing",
    name: "Typing skill test practice",
    what: "free typing test in English and Hindi for SSC CHSL/CGL (DEST), RRB NTPC and typist posts — net WPM, accuracy and key depressions per hour; no sign-in needed",
  },
  {
    path: "/descriptive",
    name: "Descriptive answer evaluation",
    what: "write an essay, formal letter, précis or UPSC Mains answer and get an instant AI evaluation out of 25 with improvements and grammar fixes; free, 3 a day",
    signIn: true,
  },
  { path: "/discussions", name: "Discussions", what: "threads with other aspirants — doubts, strategy, exam-day experiences; reading is open, posting needs sign-in" },
  // 26 Sep 2026 (entry points): /ask became the whole-platform search in
  // 60d3bb6, but this line still said "questions about government jobs", so
  // the tutor never sent a school, college or career question there. Named as
  // the page's H1; what it does is read off src/app/ask/page.tsx (its FAQ).
  {
    path: "/ask",
    name: "Search or ask Shishya",
    what: "one search box for the whole site, in any language or script (English, Hindi, Telugu, romanised Hindi): a school class, subject or chapter; an exam and its dates, syllabus, cutoff or previous-year-pattern page; a college, scholarship, career or study-abroad page. A clear match opens its page, several matches give a short list, and when no page fits Shishya's AI answers from Shishya's own data and links the closest pages — for school subjects it points to the class, subject and chapter pages instead of teaching from the textbook, and Class 1-7 searches get pages only; no login",
  },
  { path: "/scholarships", name: "Scholarships", what: "central, state and private scholarships, filterable by state, category and level" },
  { path: "/scholarships/match", name: "Scholarship match", what: "5 questions, then the scholarships the student qualifies for" },
  // 26 Sep 2026 (entry points, after G4): the ready-made lists
  // (src/lib/scholarship-lists.ts), every one of which renders.
  {
    path: "/scholarships/for/{GROUP}",
    name: "Scholarship lists",
    what: `one list per student group — amount, family income limit, this year's last date where Shishya read it on the official portal (otherwise the usual window) and where to apply; {GROUP} is one of ${SCHOLARSHIP_FILTERS.map((f) => f.slug).join(", ")}`,
  },
  {
    path: "/scholarships/closing-soon",
    name: "Scholarships closing soon",
    what: `schemes whose last date, read on the official portal, falls in the next ${CLOSING_SOON_DAYS} days; the page says so when none does`,
  },
  {
    path: "/me/report",
    name: "My report",
    what: "the student's own progress report; a human mentor session can be requested here (first free, then ₹9 — a mentor must accept first)",
    signIn: true,
  },
  { path: "/me/settings", name: "Profile settings", what: "public profile on/off (off by default) and its URL handle, plus a link to re-run onboarding", signIn: true },
  { path: "/chat", name: "Shishya tutor (this chat)", what: "the exam dropdown in the chat changes which exam it is about" },
  {
    path: "/onboarding?rerun=1",
    name: "Re-run onboarding wizard",
    what: "updates stage, state, language and prep exams (also linked from /me/settings); it only ADDS exams, it never removes one",
    signIn: true,
  },
  { path: "/ideas", name: "Ideas board", what: `feature requests sent through "Suggest a feature", with what has been built; signed-in students can upvote` },
  // 27 Sep 2026: the public transparency pages (the press kit is left out: the tutor serves students).
  { path: "/shishya-in-numbers", name: "Shishya in numbers", what: "public numbers about Shishya, each with its definition and date: sign-ups, mocks and tutor questions by week, how many new accounts come back, where sign-ups arrive from, and what the answer check found" },
  { path: "/pulse", name: "Shishya Pulse", what: "a weekly data note: the exams students took the most mocks for, the most-practised topics of the last four weeks, the week's official exam dates and which exams students asked the AI tutor about (every group at least 20)" },
  { path: "/mentors", name: "Mentors", what: "for people who have cleared a government exam: apply to guide current aspirants" },
  { path: "/pricing", name: "Pricing", what: "everything is free; the only paid service is the optional ₹9 mentor session" },
  // ── Other sections ─────────────────────────────────────────────────
  // 26 Sep 2026 (whole-education identity): Shishya is one free place to
  // study, not only exam prep — the school, college, careers and guidance
  // sections are listed so the tutor can send a student there instead of
  // saying it does not know of them.
  { path: "/jobs", name: "Jobs & careers", what: "government job catalogue, internships, resume and interview prep — information, not a job board" },
  { path: "/colleges", name: "Colleges", what: "NIRF-ranked colleges by stream and state" },
  { path: "/careers", name: "Careers", what: "career paths with entry routes and salary bands" },
  { path: "/career-map", name: "Career Map", what: "one map from Class 9 to the first job: stream choice, Class 11-12 and entrance exams, college and the first career decision" },
  // 26 Sep 2026: the school section is live — class and subject pages for
  // CBSE (NCERT books) and CISCE, chapter pages that link the official NCERT
  // PDF, and Shishya's own notes and checked practice only on the chapters
  // that have them (no typed count: it grows chapter by chapter). Board
  // links: 14 of the 20 boards link only their website; syllabus links exist
  // for 6 and sample-paper links for 3 (src/lib/schooling-data.ts).
  {
    path: "/schooling",
    name: "School",
    what: "school section: CBSE (NCERT textbooks) and CISCE class pages for Classes 1-12 — each NCERT chapter linked to its official book PDF, with Shishya's own chapter notes and checked practice questions on the chapters that have them (not every chapter yet) — and each school board's official website, with syllabus links for CBSE, CISCE, NIOS, IB, Cambridge and Tamil Nadu and sample-paper links for CBSE, CISCE and NIOS. On Class 8-12 pages a student aged 13 or above can sign in to ask the AI tutor about their class; Class 1-7 pages have no sign-in and no chat tutor",
  },
  {
    path: "/schooling/{BOARD}/class-{N}",
    name: "Class page",
    what: "one class's subjects, each with its NCERT book or CISCE syllabus documents linked and a count of its chapters that have Shishya's notes or practice; on Class 8-12 pages, the sign-in for the class tutor (students 13 and above)",
  },
  // 26 Sep 2026 (entry points, after G4): the CBSE board-exam pages
  // (src/data/board-exams.ts) — CBSE's own links only, never a copy.
  ...([10, 12] as const).map(
    (n): SiteFeature => ({
      path: `/schooling/cbse/class-${n}/board-exam`,
      name: `CBSE Class ${n} board exam`,
      what: `links to CBSE's own site for this session's board exam: sample question papers and marking schemes, the curriculum, CBSE's past-papers page, the result portals, notices, and whether the date sheet is out yet — no paper is copied onto Shishya; plus the Class ${n} chapters that have Shishya's notes and checked practice`,
    }),
  ),
  { path: "/distance-learning", name: "Distance learning", what: "open and distance learning in India: IGNOU, NIOS and state open universities, and how to judge them" },
  { path: "/post-graduation", name: "Post-graduation", what: "options after a degree: PG entrance exams (GATE, CAT, NEET-PG, UGC-NET and more), research, fellowships, civil services or a job" },
  { path: "/insights", name: "Insights", what: "essays on Indian education decisions, with their sources" },
  {
    path: "/for/{PERSONA}",
    name: "Guides by student type",
    what: `a starting page for one kind of student — the exams, articles and next steps that fit them; {PERSONA} is one of ${PERSONAS.map((p) => p.slug).join(", ")}`,
  },
  { path: "/worldwide", name: "Study abroad", what: "countries, universities, test prep and loans" },
  {
    path: "/aptitude",
    name: "Aptitude Test",
    what: "the Surge admission aptitude test (30 questions, 30 minutes) — a screening test, not a mock for any government exam",
  },
];

/** Things with no URL of their own, named as the page names them. */
export const IN_PAGE_FEATURES: readonly string[] = [
  `Language picker inside every mock: switches the questions to Hindi or ${OTHER_INDIAN_LANGUAGE_COUNT} other Indian languages (translated on demand).`,
  `Results page after every mock (reached from the mock or "All my attempts"): score, each question with its solution, and a "Report this question" button for a wrong key or a broken question.`,
  `"Challenge a friend" card on a mock's results page and on a quiz result: makes a link to the same questions with the student's score to beat, to share on WhatsApp or copy; friends play free with no sign-in, and the student can be told on their phone when a friend plays.`,
  `"Suggest a feature" button at the bottom-right of pages for signed-in students (not inside a mock); the ideas board shows open requests and what has been built.`,
  `Language switcher in the site header: changes the site's interface language.`,
  `Pricing: every preparation feature is free, no premium tier; the only optional paid service is the human mentor session above.`,
];

/** Things students have been told exist and do NOT — stated so the tutor
 *  can say so plainly instead of inventing a path to them. */
export const NOT_ON_SHISHYA: readonly string[] = [
  `No Shishya app in the Play Store or App Store. On Android the browser can add the site to the home screen ("Install app" / "Add to Home screen" in the browser menu).`,
  `No way to remove or deactivate an exam, and no "Settings → Exams" or "My Exams" page. An exam joins "Your exams" on the dashboard when the student chats about it, opens a mock on it or picks it in the onboarding wizard, and stays there. To study another exam they just open that exam's page. Shishya's reminder and practice emails carry an unsubscribe link.`,
  `No video lectures or live classes.`,
];

/** Render one feature as a prompt line. */
function featureLine(f: SiteFeature): string {
  return `- ${f.name} — https://shishya.in${f.path}${f.signIn ? " (free sign-in)" : ""}: ${f.what}.`;
}

/**
 * The static block for the tutor's shared cached prefix. Pure and
 * argument-free: the same bytes for every student, exam and mode.
 */
export function siteFeaturesBlock(): string {
  return [
    `What Shishya offers — the features, pages, buttons and settings you may describe:`,
    `({CODE} = the exam's code from the syllabus block, e.g. SSC_GD; {TOPIC} = a topic code from it. With no exam picked, send the student to https://shishya.in to pick one first. Some exam pages exist only for some exams — the exam facts block says which. {BOARD} = cbse (NCERT books) or icse-cisce; {N} = a class from 1 to 12; {PERSONA} = one of the slugs listed on that line; {CATEGORY}, {LEVEL} and {GROUP} likewise = one of the values listed on their own line — never any other.)`,
    ...SITE_FEATURES.map(featureLine),
    ...IN_PAGE_FEATURES.map((s) => `- ${s}`),
    ``,
    `Does NOT exist:`,
    ...NOT_ON_SHISHYA.map((s) => `- ${s}`),
    ``,
    `Rules: when you mention a page, button, setting or app, it must be in the lists above, with its real link. Never invent a menu, setting, app, button or page, or the steps to reach one. Only what is under "Does NOT exist" may be denied outright — say plainly that Shishya doesn't have it. For anything else a student asks about that is not listed, do not say Shishya lacks it and do not describe it: say you don't know of that feature on Shishya, offer the nearest listed thing, and mention the "Suggest a feature" button.`,
  ].join("\n");
}

/** Every path in the list, for tests and audits. */
export const SITE_FEATURE_PATHS: readonly string[] = SITE_FEATURES.map((f) => f.path);
