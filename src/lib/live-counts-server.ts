// Server-side live activity counts.
//
// REAL NUMBERS ONLY (no synthetic floor). Until 27 May 2026 these
// counters carried a +1000 fixed floor so the strip didn't read
// "3 students helped till now" on day 1. Founder call: that's
// dishonest social proof and will burn trust faster than the floor
// helps. We display what's actually true and let the metric grow.
//
// 26 Sep 2026: the strip grew from seven numbers to the whole platform
// (founder brief: "keep as many stats as possible — AI tutor usage,
// sign-ups, everything across the website, not just exam stats; say
// 'mock exams taken', and a plain word for the people counter"). Rules:
//   • every number is computed from the DB, never typed;
//   • every field's public definition is in LIVE_COUNT_DEFINITIONS below —
//     the label the strip prints must describe exactly that (tests pin
//     that the two lists match);
//   • bots stay out wherever the analytics ingest tagged them
//     (client = 'bot'); "today" is the IST calendar day.
// Two speeds (costs measured on prod, 26 Sep 2026, EXPLAIN ANALYZE):
//   • LIVE counts — recomputed on every uncached call. The API is edge-cached
//     30 s (s-maxage) so 1,000 concurrent visitors cost one DB round per
//     30 s per region. ~240 ms of Postgres time per round, ~225 of which
//     were already there (the page-view and visitor scans).
//   • SUPPLY / all-time SCAN counts (exams, practice questions, topic notes,
//     school chapters, questions answered) — a module-level memo refreshed
//     every SUPPLY_TTL_MS (10 min). They move slowly, and their queries are
//     the expensive ones (~250 ms together). One refresh per 10 min per
//     server instance.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_SQL, REAL_EXAM_WHERE, NOT_SCHOOL_WHERE, SCHOOL_CATEGORY } from "@/lib/db/exam-scope";
import { LANGUAGE_COUNT } from "@/lib/languages";
import { WITHDRAWN_TAG } from "@/lib/question-withdrawn";
import { usableNotesSql } from "@/lib/topic-notes";
import { loadSchoolSurface, schoolSurfaceCounts } from "@/lib/school/surface";
import { SECTION_TTL_MS, foldSectionRows, learnerSectionsSql, type LearnerSectionCounts } from "@/lib/learner-sections";
import { SIGNUP_LINK_CTE, landingKeySql, personKeySql, signupJoinSql, walkInWhereSql } from "@/lib/learner-count";

export interface LiveCounts {
  /** Distinct people with ANY activity in the last 30 minutes: a human
   *  page view, a mock answer saved, an AI-tutor question or a sign-up.
   *  Members by account id, guests by their shishya_anon cookie (the same
   *  cookie backs the analytics anonId and AnonTutorLog.anonId, so a guest
   *  is one key). Tagged bots and identity-less views are excluded — a
   *  cookie-less crawler cannot appear here. Until 26 Sep 2026 this
   *  counted signed-in mock/tutor/sign-up activity only. An attempt row
   *  touched only because the nightly abandon-ghost-attempts cron flipped
   *  it to ABANDONED is not activity (26 Sep 2026 review: a minute after
   *  that 08:15 IST run on 24–26 Sep the strip showed 13 / 11 / 15
   *  "active now", of whom 13 / 11 / 11 were cron-only). */
  activeNow: number;
  /** Total PAGE_VIEW rows, ingest-tagged bots and the pre-30-Jul-2026
   *  phantom ids (one view, no referrer, server-minted) excluded. */
  totalPageViews: number;
  /** PAGE_VIEW rows TODAY (since IST midnight), tagged bots excluded.
   *  Calendar-day number, not a rolling 24 h window. */
  pageViewsToday: number;
  /** Distinct people who came to Shishya — engaged persons (2+ page
   *  views, or one referred / tagged view; a new account and its
   *  pre-sign-in anonymous id are ONE person, 3 Oct 2026 — for accounts
   *  made since 11 Sep 2026 only: earlier SIGNUP rows carry no browser
   *  id, so an estimated 660 to 1,030 people of 30 Jul – 11 Sep still
   *  count twice, see src/lib/learner-count.ts) PLUS
   *  identity-less browser landings counted as people (one per device per
   *  IST day, 3 Oct 2026 — src/lib/learner-count.ts), overlap-corrected.
   *  The strip calls this "learners" (founder's word, 26 Sep 2026):
   *  everyone who came to Shishya to study. */
  uniqueVisitors: number;
  /** Learners added TODAY (since IST midnight): uniqueVisitors now minus
   *  uniqueVisitors as it stood at midnight — persons that first met
   *  the learner rule today (a second page view, or a first view from
   *  another site or a tagged link), plus today's identity-less landings
   *  (devices), less the gap-era overlap that closed today. 30 Sep 2026
   *  (founder: "how many learners increased today"). */
  uniqueVisitorsToday: number;
  // The 14 learners-by-section fields are OPTIONAL (30 Sep 2026 review): a
  // reply without them (no same-day read yet, or the read failed) leaves the
  // strip's last-known groups on screen — never a fake 0 (mergeCounts).
  /** Learners in one group (src/lib/learner-sections.ts) — govt exam aspirants: government recruitment exam pages, current affairs, jobs map, exam calendar, results, live tests. Each learner
   *  counts in one group; the groups add up to uniqueVisitors (memoised
   *  SECTION_TTL_MS, so they can trail it by minutes). */
  learnersGovt?: number;
  /** The same group's learners added since IST midnight. */
  learnersGovtToday?: number;
  /** Learners in one group (src/lib/learner-sections.ts) — school students: /schooling pages and olympiads. Each learner
   *  counts in one group; the groups add up to uniqueVisitors (memoised
   *  SECTION_TTL_MS, so they can trail it by minutes). */
  learnersSchool?: number;
  /** The same group's learners added since IST midnight. */
  learnersSchoolToday?: number;
  /** Learners in one group (src/lib/learner-sections.ts) — entrance aspirants: admission tests after Class 12 (engineering, medical, law, management, university, NDA, state CETs, CA / CS foundation). Each learner
   *  counts in one group; the groups add up to uniqueVisitors (memoised
   *  SECTION_TTL_MS, so they can trail it by minutes). */
  learnersEntrance?: number;
  /** The same group's learners added since IST midnight. */
  learnersEntranceToday?: number;
  /** Learners in one group (src/lib/learner-sections.ts) — scholarship & college seekers: scholarships, colleges, distance learning, study abroad, careers, jobs, soft skills. Each learner
   *  counts in one group; the groups add up to uniqueVisitors (memoised
   *  SECTION_TTL_MS, so they can trail it by minutes). */
  learnersCollege?: number;
  /** The same group's learners added since IST midnight. */
  learnersCollegeToday?: number;
  /** Learners in one group (src/lib/learner-sections.ts) — PG entrance aspirants: CAT, NEET PG, CUET PG, IIT JAM, every GATE paper, AP / TS ICET, MAH-CET MBA and /post-graduation. Each learner
   *  counts in one group; the groups add up to uniqueVisitors (memoised
   *  SECTION_TTL_MS, so they can trail it by minutes). */
  learnersGraduate?: number;
  /** The same group's learners added since IST midnight. */
  learnersGraduateToday?: number;
  /** Learners in one group (src/lib/learner-sections.ts) — NET aspirants: UGC NET and CSIR NET (lectureship, JRF, PhD admission). Each learner
   *  counts in one group; the groups add up to uniqueVisitors (memoised
   *  SECTION_TTL_MS, so they can trail it by minutes). */
  learnersPostgraduate?: number;
  /** The same group's learners added since IST midnight. */
  learnersPostgraduateToday?: number;
  /** Learners in one group (src/lib/learner-sections.ts) — general pages only: no page in any section so far (home, Ask, sign-in, dashboard, pages listing every kind of exam). Each learner
   *  counts in one group; the groups add up to uniqueVisitors (memoised
   *  SECTION_TTL_MS, so they can trail it by minutes). */
  learnersExploring?: number;
  /** The same group's learners added since IST midnight. */
  learnersExploringToday?: number;
  /** Walk-ins: landings by browsers that carry no identity — the
   *  single-page landers — counted as PEOPLE (3 Oct 2026): one per device
   *  (ipHash + uaHash) per IST day; a Class 1-7 page one per class page per
   *  IST day; a pre-fingerprint row (before 18 Aug 2026) one per row, only
   *  with a referrer, a tag or an entry page (src/lib/learner-count.ts).
   *  Rows the ingest or the hourly bot scrub tagged are out. Includes each
   *  future-visitor's very first page view when it had no referrer and no
   *  tag (identity starts on their second view). The internal split of
   *  uniqueVisitors; not shown on the strip. Until 3 Oct 2026 it was every
   *  identity-less browser page view. */
  walkIns: number;
  /** Mock exams TAKEN: Attempt rows with status SUBMITTED or
   *  AUTO_SUBMITTED — a mock the student finished, on any exam or school
   *  chapter. Until 26 Sep 2026 the strip showed every Attempt row
   *  (in-progress and abandoned included) as "mocks attempted". */
  mocksTaken: number;
  /** Mocks submitted TODAY (finishedAt since IST midnight). */
  mocksToday: number;
  /** Total User rows. */
  totalSignups: number;
  /** User rows created in the last 7 days (rolling). Momentum signal —
   *  reads as "1,900 signed up · +170 this week". */
  signupsLast7Days: number;
  /** User rows created TODAY (since IST midnight). */
  signupsToday: number;
  /** Questions students sent to the AI tutor, whole site: ChatMessage
   *  rows with role USER (member chats, exam and school tutor alike; the
   *  copies /api/chat/import makes of a guest chat are excluded so a turn
   *  is never counted twice) PLUS AnonTutorLog rows that carry a
   *  shishya_anon cookie (guest turns). Cookie-less guest rows are left
   *  out (26 Sep 2026): an identity-less caller is not provably a person —
   *  the same rule as the visitor and active-now counters — and 3,072 of
   *  the 3,286 cookie-less rows are one 16–26 Aug 2026 machine run (flat
   *  around the clock, suggestion-chip templates, stops dead on 26 Aug;
   *  the chat route only started refusing bot user-agents on 24 Sep). */
  tutorQuestions: number;
  /** The same, since IST midnight. */
  tutorQuestionsToday: number;
  /** Answer entries with a chosen option inside submitted attempts —
   *  questions a student actually answered, not questions served
   *  (unanswered ones in a submitted mock are not counted). Refreshed
   *  every SUPPLY_TTL_MS: the JSON scan costs ~80 ms. */
  questionsAnswered: number;
  /** The same for attempts submitted since IST midnight (live). */
  questionsAnsweredToday: number;
  /** Live tests taken: submitted attempts on a live-test mock that were
   *  started inside that test's window (the ranked ones). */
  liveTestsTaken: number;
  /** The same, submitted since IST midnight (30 Sep 2026). */
  liveTestsToday: number;
  /** Exam goals set: active enrolments (a member's chosen target exam),
   *  real exams only — a school class is not an exam goal. */
  examGoals: number;
  /** Exam goals set since IST midnight that are still active (30 Sep 2026). */
  examGoalsToday: number;
  /** Exams covered: active real exams (REAL_EXAM_WHERE) — the same count
   *  the home finder's "Browse all" link shows. Memoised. */
  exams: number;
  /** Practice questions available: validated, not withdrawn, on a live
   *  real exam or a school chapter (school containers are read by
   *  category — they are inactive by design). Memoised. */
  practiceQuestions: number;
  /** Topic notes available: TopicTeachingNote rows with non-empty
   *  content (the topic page's own rule, src/lib/topic-notes.ts) on a
   *  live real exam or a school chapter. Memoised. */
  topicNotes: number;
  /** School chapters with notes or a practice quiz — the school
   *  surface's indexable chapters (src/lib/school/surface.ts). Memoised. */
  schoolChapters: number;
  /** Languages the UI serves — `locales` in i18n.ts, English included.
   *  A constant, derived, never typed. */
  languages: number;
}

/** One honest sentence per field — what the number counts. The strip's
 *  labels are pinned against these keys in tests/unit/live-counters-strip.test.ts. */
export const LIVE_COUNT_DEFINITIONS: Record<keyof LiveCounts, string> = {
  activeNow:
    "Distinct people with a page view, a mock answer, an AI-tutor question or a sign-up in the last 30 minutes (members by account, guests by cookie; tagged bots, identity-less views and the nightly cron's ABANDONED flips excluded).",
  totalPageViews: "PAGE_VIEW events all-time, ingest-tagged bots and pre-30-Jul-2026 phantom ids excluded.",
  pageViewsToday: "PAGE_VIEW events since 00:00 IST today, tagged bots excluded.",
  uniqueVisitors:
    "Distinct people who came to Shishya: people (an account, or a browser id) on 2+ page views, or on one view that arrived from another site or a tagged link (for example utm_source=chatgpt.com — 27 Sep 2026: these were being missed), plus browsers that came without an identity, one per device per IST day (tagged bots excluded), overlap-corrected. A new account and the browser id it signed up from are one person for accounts made since 11 Sep 2026; for the 1,033 accounts made between 30 Jul and 11 Sep 2026 the sign-up record does not carry the browser id, so most of those people (an estimated 660 to 1,030) are counted twice. Proves a visit, not learning.",
  uniqueVisitorsToday:
    "Learners added since 00:00 IST today: the learners count now minus the same count at midnight — people who first met the learner rule today (a second page view, or a first view from another site or a tagged link; a new account is not a new person if its browser already counted) plus today's devices that came without an identity, one per device.",
  learnersGovt:
    "Learners whose most-viewed section is government recruitment and eligibility exams (SSC, banking, railways, police, state PSCs, UPSC, TET / CTET), current affairs, jobs map, typing, descriptive and the government-exam finder (pages outside every section — home, Ask, the AI tutor chat, sign-in, dashboard, and pages listing every kind of exam — do not count; one view is enough; a tie goes to the section viewed last). Each learner is in one group, so the groups add up to learners as of the last refresh (every 5 minutes); a group under 20 people is not shown.",
  learnersGovtToday: "Learners who first counted today (since 00:00 IST) and whose group is this one; the groups' today numbers add up to the learners' +N today.",
  learnersSchool:
    "Learners whose most-viewed section is school pages (/schooling) and olympiads (pages outside every section — home, Ask, the AI tutor chat, sign-in, dashboard, and pages listing every kind of exam — do not count; one view is enough; a tie goes to the section viewed last). Each learner is in one group, so the groups add up to learners as of the last refresh (every 5 minutes); a group under 20 people is not shown.",
  learnersSchoolToday: "Learners who first counted today (since 00:00 IST) and whose group is this one; the groups' today numbers add up to the learners' +N today.",
  learnersEntrance:
    "Learners whose most-viewed section is admission tests after Class 12 — engineering, medical, law, management, university, NDA, the state CETs, CA / CS foundation (pages outside every section — home, Ask, the AI tutor chat, sign-in, dashboard, and pages listing every kind of exam — do not count; one view is enough; a tie goes to the section viewed last). Each learner is in one group, so the groups add up to learners as of the last refresh (every 5 minutes); a group under 20 people is not shown.",
  learnersEntranceToday: "Learners who first counted today (since 00:00 IST) and whose group is this one; the groups' today numbers add up to the learners' +N today.",
  learnersCollege:
    "Learners whose most-viewed section is scholarships, colleges, distance learning, study abroad, careers, jobs and soft skills (pages outside every section — home, Ask, the AI tutor chat, sign-in, dashboard, and pages listing every kind of exam — do not count; one view is enough; a tie goes to the section viewed last). Each learner is in one group, so the groups add up to learners as of the last refresh (every 5 minutes); a group under 20 people is not shown.",
  learnersCollegeToday: "Learners who first counted today (since 00:00 IST) and whose group is this one; the groups' today numbers add up to the learners' +N today.",
  learnersGraduate:
    "Learners whose most-viewed section is PG entrance tests — CAT, NEET PG, CUET PG, IIT JAM, every GATE paper, AP ICET, TS ICET, MAH-CET MBA — and /post-graduation (pages outside every section — home, Ask, the AI tutor chat, sign-in, dashboard, and pages listing every kind of exam — do not count; one view is enough; a tie goes to the section viewed last). Each learner is in one group, so the groups add up to learners as of the last refresh (every 5 minutes); a group under 20 people is not shown.",
  learnersGraduateToday: "Learners who first counted today (since 00:00 IST) and whose group is this one; the groups' today numbers add up to the learners' +N today.",
  learnersPostgraduate:
    "Learners whose most-viewed section is UGC NET and CSIR NET (lectureship, JRF, PhD admission) (pages outside every section — home, Ask, the AI tutor chat, sign-in, dashboard, and pages listing every kind of exam — do not count; one view is enough; a tie goes to the section viewed last). Each learner is in one group, so the groups add up to learners as of the last refresh (every 5 minutes); a group under 20 people is not shown.",
  learnersPostgraduateToday: "Learners who first counted today (since 00:00 IST) and whose group is this one; the groups' today numbers add up to the learners' +N today.",
  learnersExploring:
    "Learners whose page views are all outside every section so far — home, Ask, the AI tutor chat, sign-in, dashboard, coach, and pages listing every kind of exam (browse, calendar, results, alerts, live tests). Refreshed every 5 minutes; under 20 people not shown.",
  learnersExploringToday: "Learners who first counted today (since 00:00 IST) and whose page views are all outside every section.",
  walkIns:
    "Browsers that came without an identity, counted as people: one per device (address + user agent fingerprint) per IST day, a Class 1-7 page one per class page per day, a row from before 18 Aug 2026 one per row only with a referrer, a tag or an entry page; tagged bots excluded — the internal split of uniqueVisitors; not shown.",
  mocksTaken: "Attempt rows with status SUBMITTED or AUTO_SUBMITTED — mocks a student finished, any exam or school chapter — plus whole papers guests finished without an account (counted when the server grades one with at least one answer; from 27 Sep 2026, founder call).",
  mocksToday: "Attempts submitted since 00:00 IST today, plus guest papers graded since then.",
  totalSignups: "User rows (accounts).",
  signupsLast7Days: "Accounts created in the last 7 days (rolling).",
  signupsToday: "Accounts created since 00:00 IST today.",
  tutorQuestions:
    "ChatMessage rows with role USER (guest-import copies excluded) plus AnonTutorLog rows with a shishya_anon cookie — questions people sent to the AI tutor, site-wide; cookie-less guest calls (not provably a person) left out.",
  tutorQuestionsToday: "The same since 00:00 IST today.",
  questionsAnswered: "Answer entries with a chosen option inside submitted attempts (unanswered questions not counted); refreshed every 10 minutes.",
  questionsAnsweredToday: "The same inside attempts submitted since 00:00 IST today (live).",
  liveTestsTaken: "Submitted attempts on a live-test mock that started inside the test's window.",
  liveTestsToday: "The same, submitted since 00:00 IST today.",
  examGoals: "Active enrolments in real exams (a member's chosen target exam).",
  examGoalsToday: "Active enrolments in real exams created since 00:00 IST today.",
  exams: "Active real exams (REAL_EXAM_WHERE) — the finder's 'Browse all' count; refreshed every 10 minutes.",
  practiceQuestions: "Validated, not-withdrawn questions on live real exams and school chapters; refreshed every 10 minutes.",
  topicNotes: "TopicTeachingNote rows with non-empty content on live real exams and school chapters; refreshed every 10 minutes.",
  schoolChapters: "School chapters with notes or a practice quiz (the school surface's indexable chapters); refreshed every 10 minutes.",
  languages: "Locales the UI serves (locales in i18n.ts), English included — a derived constant.",
};

/** Every key, all zero (languages stays the constant — it is not a DB
 *  read). The typed reference shape for tests and the client's key list —
 *  NEVER served: 26 Sep 2026 review, a 200 with these zeros replaced the
 *  strip's real numbers with "0 visitors · 0 signed up" on one Neon
 *  stutter. The API answers 503 on failure instead, and the strip keeps
 *  its last-known numbers (or its shell before the first reply). */
export const ZERO_LIVE_COUNTS: LiveCounts = {
  activeNow: 0,
  totalPageViews: 0,
  pageViewsToday: 0,
  uniqueVisitors: 0,
  uniqueVisitorsToday: 0,
  learnersGovt: 0,
  learnersGovtToday: 0,
  learnersSchool: 0,
  learnersSchoolToday: 0,
  learnersEntrance: 0,
  learnersEntranceToday: 0,
  learnersCollege: 0,
  learnersCollegeToday: 0,
  learnersGraduate: 0,
  learnersGraduateToday: 0,
  learnersPostgraduate: 0,
  learnersPostgraduateToday: 0,
  learnersExploring: 0,
  learnersExploringToday: 0,
  walkIns: 0,
  mocksTaken: 0,
  mocksToday: 0,
  totalSignups: 0,
  signupsLast7Days: 0,
  signupsToday: 0,
  tutorQuestions: 0,
  tutorQuestionsToday: 0,
  questionsAnswered: 0,
  questionsAnsweredToday: 0,
  liveTestsTaken: 0,
  liveTestsToday: 0,
  examGoals: 0,
  examGoalsToday: 0,
  exams: 0,
  practiceQuestions: 0,
  topicNotes: 0,
  schoolChapters: 0,
  languages: LANGUAGE_COUNT,
};

/** How long the memoised supply / all-time scan counts are served before
 *  a re-read (per server instance). */
export const SUPPLY_TTL_MS = 10 * 60_000;

/** /api/chat/import stamps the copies it makes of a guest conversation
 *  with this contextSnapshot.source (IMPORT_SOURCE there) — those USER
 *  rows duplicate AnonTutorLog rows and are left out of tutorQuestions.
 *  tests/unit/live-counters-strip.test.ts pins the two strings equal. */
export const GUEST_IMPORT_SOURCE = "guest-import";

const IST_MS = 5.5 * 3600_000;

/** Start of TODAY in IST (the audience is Indian) — "today's numbers"
 *  reset at IST midnight instead of sliding on a rolling 24 h window. */
export function istDayStart(now: Date): Date {
  const istMidnightMs = Math.floor((now.getTime() + IST_MS) / 86_400_000) * 86_400_000;
  return new Date(istMidnightMs - IST_MS);
}

type CountRow = { count: bigint | number | null };
const n = (rows: CountRow[]): number => Number(rows[0]?.count ?? 0);

const SUBMITTED_SQL = Prisma.sql`('SUBMITTED', 'AUTO_SUBMITTED')`;

// ── Supply / all-time scan counts (memoised) ──────────────────────────

interface SupplyCounts {
  questionsAnswered: number;
  exams: number;
  practiceQuestions: number;
  topicNotes: number;
  schoolChapters: number;
}

let supplyMemo: { readAt: number; counts: SupplyCounts } | null = null;
let supplyPending: Promise<SupplyCounts> | null = null;

/** Tests only: forget the memoised supply counts. */
export function resetLiveCountsMemo(): void {
  supplyMemo = null;
  supplyPending = null;
  resetSectionMemo();
}

async function readSupplyCounts(): Promise<SupplyCounts> {
  const [answeredRows, exams, questionRows, noteRows, schoolChapters] = await Promise.all([
    // Answered = an entry with a chosen option in a SUBMITTED attempt's
    // answers JSON. WeaknessMap.attemptsCount would be 4 ms but counts
    // questions SERVED (97,773 vs 72,907 answered on 26 Sep 2026) — the
    // honest number is the ~80 ms scan, hence the memo.
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Attempt" a, jsonb_array_elements(a."answers") e
      WHERE a.status IN ${SUBMITTED_SQL} AND jsonb_typeof(a."answers") = 'array'
        AND e->>'chosen' IS NOT NULL AND e->>'chosen' <> ''
    `,
    prisma.exam.count({ where: REAL_EXAM_WHERE }),
    // Whole site: a live real exam OR a school container (read by
    // category — every container is inactive by design, see
    // src/lib/school/scope.ts). Same validity rule as every practice
    // surface: validated and not withdrawn.
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Question" q
      JOIN "Exam" e ON e.id = q."examId"
      WHERE q.validated = TRUE AND NOT (${WITHDRAWN_TAG} = ANY(q.tags))
        AND (${REAL_EXAM_SQL} OR e."category"::text = ${SCHOOL_CATEGORY})
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "TopicTeachingNote" tn
      JOIN "Topic" t ON t.id = tn."topicId"
      JOIN "Subject" s ON s.id = t."subjectId"
      JOIN "Exam" e ON e.id = s."examId"
      WHERE ${usableNotesSql(Prisma.sql`tn.content`)}
        AND (${REAL_EXAM_SQL} OR e."category"::text = ${SCHOOL_CATEGORY})
    `,
    // The school surface's own cached read (SCHOOL_REVALIDATE) and its own
    // rule for "a chapter with something to study" — never a second
    // definition here. 0 when the surface cannot be read.
    loadSchoolSurface()
      .then((surface) => schoolSurfaceCounts(surface).indexableChapters)
      .catch((err) => {
        console.error("[live-counts] school surface unavailable — schoolChapters=0", err);
        return 0;
      }),
  ]);
  return {
    questionsAnswered: n(answeredRows),
    exams,
    practiceQuestions: n(questionRows),
    topicNotes: n(noteRows),
    schoolChapters,
  };
}

async function getSupplyCounts(now: Date): Promise<SupplyCounts> {
  if (supplyMemo && now.getTime() - supplyMemo.readAt < SUPPLY_TTL_MS) return supplyMemo.counts;
  if (!supplyPending) {
    const stale = supplyMemo;
    supplyPending = readSupplyCounts()
      .then((counts) => {
        supplyMemo = { readAt: now.getTime(), counts };
        return counts;
      })
      .catch((err) => {
        // A stale memo beats a failure; with no memo at all the caller's
        // failure path (the API's 503 — the strip keeps what it has) runs.
        if (stale) {
          console.error("[live-counts] supply refresh failed — serving the memo", err);
          return stale.counts;
        }
        throw err;
      })
      .finally(() => {
        supplyPending = null;
      });
  }
  return supplyPending;
}

// ── Learners by section (memoised) ────────────────────────────────────
// 30 Sep 2026: the learners counter split by the section each person
// studies in (src/lib/learner-sections.ts). The read scans every page view
// (1.6–3.6 s), so (review, same day):
//   • a same-day memo is served AT ONCE; past SECTION_TTL_MS it is refreshed
//     in the background, never on the reply's clock;
//   • with no same-day memo the read is awaited for at most
//     SECTION_FIRST_READ_MS, then the reply goes out WITHOUT the fields — the
//     strip keeps its last-known groups (mergeCounts) instead of a fake 0;
//   • a read belongs to its IST day: one started before midnight never
//     answers after it; a failure is remembered for SECTION_RETRY_MS so a
//     broken read is not re-run on every poll.

const SECTION_FIRST_READ_MS = 4_000;
const SECTION_RETRY_MS = 60_000;

let sectionMemo: { readAt: number; dayStart: number; counts: LearnerSectionCounts } | null = null;
let sectionPending: { dayStart: number; p: Promise<LearnerSectionCounts | null> } | null = null;
let sectionFailedAt = 0;

export function resetSectionMemo(): void {
  sectionMemo = null;
  sectionPending = null;
  sectionFailedAt = 0;
}

function startSectionRead(now: Date, dayStart: Date): Promise<LearnerSectionCounts | null> {
  const day = dayStart.getTime();
  if (sectionPending && sectionPending.dayStart === day) return sectionPending.p;
  const p = prisma
    .$queryRaw<{ sec: string; part: string; n: number; today: number }[]>(learnerSectionsSql(dayStart))
    .then((rows) => {
      const counts = foldSectionRows(rows);
      sectionMemo = { readAt: now.getTime(), dayStart: day, counts };
      return counts;
    })
    .catch((err) => {
      sectionFailedAt = Date.now();
      console.error("[live-counts] learner sections unavailable", err);
      return null;
    })
    .finally(() => {
      if (sectionPending?.p === p) sectionPending = null;
    });
  sectionPending = { dayStart: day, p };
  return p;
}

/** The section counts for this IST day, or null — never zeros standing in for a failure. */
async function getSectionCounts(now: Date, dayStart: Date): Promise<LearnerSectionCounts | null> {
  const day = dayStart.getTime();
  const memo = sectionMemo && sectionMemo.dayStart === day ? sectionMemo : null;
  const mayRead = now.getTime() - sectionFailedAt >= SECTION_RETRY_MS;
  if (memo) {
    if (now.getTime() - memo.readAt >= SECTION_TTL_MS && mayRead) void startSectionRead(now, dayStart);
    return memo.counts;
  }
  if (!mayRead) return null;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<null>((resolve) => {
    timer = setTimeout(() => resolve(null), SECTION_FIRST_READ_MS);
  });
  try {
    return await Promise.race([startSectionRead(now, dayStart), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** The LiveCounts fields of the section counts — spelled out so the compiler checks each one. */
function sectionFields(c: LearnerSectionCounts) {
  return {
    learnersGovt: c.govt.total,
    learnersGovtToday: c.govt.today,
    learnersSchool: c.school.total,
    learnersSchoolToday: c.school.today,
    learnersEntrance: c.entrance.total,
    learnersEntranceToday: c.entrance.today,
    learnersCollege: c.college.total,
    learnersCollegeToday: c.college.today,
    learnersGraduate: c.graduate.total,
    learnersGraduateToday: c.graduate.today,
    learnersPostgraduate: c.postgraduate.total,
    learnersPostgraduateToday: c.postgraduate.today,
    learnersExploring: c.exploring.total,
    learnersExploringToday: c.exploring.today,
  } satisfies Partial<LiveCounts>;
}

// ── The read ──────────────────────────────────────────────────────────

export async function getLiveCounts(now: Date = new Date()): Promise<LiveCounts> {
  const cutoff30m = new Date(now.getTime() - 30 * 60 * 1000);
  const cutoff7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dayStart = istDayStart(now);

  const [
    supply,
    uniqueVisitorsRows,
    totalPageViewsRows,
    pageViewsTodayRows,
    mocksTaken,
    totalSignups,
    signupsLast7Days,
    signupsToday,
    activeNowRows,
    mocksToday,
    walkInsRows,
    overlapRows,
    tutorRows,
    tutorTodayRows,
    answeredTodayRows,
    liveTestRows,
    examGoals,
    guestPapersRows,
    guestPapersTodayRows,
    learnersTodayRows,
    walkInsTodayRows,
    liveTestTodayRows,
    examGoalsToday,
    sections,
  ] = await Promise.all([
    getSupplyCounts(now),
    // Distinct HUMAN visitors all-time — definitions audited 16 Aug 2026
    // after the founder caught a 17-day undercount (~80-130 real
    // humans/day invisible). Three provable-human classes:
    //   (a) engaged — id seen on 2+ page views (cookie came back; a
    //       cookie-less crawler can never reach 2 views on one id);
    //   (b) referred bouncers WITH id — single-view ids whose view
    //       carries a real external referrer (post-16-Aug ingest stamps
    //       the id on referred first-hits; crawlers don't send
    //       Referer, so these are humans who bounced);
    //   (c) gap-era referred landers — identity-less browser PVs with a
    //       referrer (31 Jul → 16 Aug, when first-hits carried no id).
    // Overlap: engaged visitors whose identity began in the gap era
    // left exactly one identity-less landing each — subtracted below.
    // Pre-cutover crawler-minted ids (1 view, no referrer) stay out of
    // every class. We'd still rather understate than inflate.
    // 3 Oct 2026: one person, one key — a new account's pre-sign-in
    // anonymous id is merged into the account through its SIGNUP row
    // (src/lib/learner-count.ts; 18 of 2 Oct's 19 new accounts were
    // counted twice before this). SIGNUP rows carry that id only since
    // 11 Sep 2026, so accounts made 30 Jul – 11 Sep stay split.
    prisma.$queryRaw<CountRow[]>`
      WITH ${Prisma.raw(SIGNUP_LINK_CTE)}
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT ${Prisma.raw(personKeySql("e"))} AS k
        FROM "AnalyticsEvent" e ${Prisma.raw(signupJoinSql("e"))}
        WHERE e.kind = 'PAGE_VIEW' AND COALESCE(e."userId", e."anonId") IS NOT NULL
        GROUP BY 1
        HAVING COUNT(*) >= 2 OR (bool_or("refHost" IS NOT NULL) AND COUNT(*) = 1) OR (COUNT(*) = 1 AND bool_or("utmSource" IS NOT NULL))
      ) humans
    `,
    // Total PAGE_VIEW rows: ingest-tagged bot fetches excluded, and the
    // pre-tagging crawler era cleaned by excluding views from phantom
    // ids (single view, no referrer, minted before the 30 Jul cutover —
    // the server minted ids for every fetch back then, so one crawler
    // sweep = hundreds of one-view ids).
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count FROM "AnalyticsEvent" e
      WHERE e.kind = 'PAGE_VIEW' AND (e."client" IS NULL OR e."client" <> 'bot')
        AND (COALESCE(e."userId", e."anonId") IS NULL
          OR COALESCE(e."userId", e."anonId") NOT IN (
          SELECT k FROM (
            SELECT COALESCE("userId", "anonId") AS k
            FROM "AnalyticsEvent"
            WHERE kind = 'PAGE_VIEW' AND "anonId" IS NOT NULL
              AND "createdAt" < '2026-07-30T20:00:00Z'
            GROUP BY 1
            HAVING COUNT(*) = 1 AND bool_or("refHost" IS NOT NULL) = FALSE
          ) phantoms
        ))
    `,
    // PAGE_VIEW rows TODAY, bots excluded.
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count FROM "AnalyticsEvent"
      WHERE kind = 'PAGE_VIEW' AND "createdAt" >= ${dayStart}
        AND ("client" IS NULL OR "client" <> 'bot')
    `,
    // 26 Sep 2026: "mock exams taken" = finished attempts only (status
    // index, ~2.5 ms). Every Attempt row used to be counted here.
    prisma.attempt.count({ where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } } }),
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: cutoff7d } } }),
    prisma.user.count({ where: { createdAt: { gte: dayStart } } }),
    // Active now (26 Sep 2026): any activity in the last 30 min, members
    // and guests alike — human page views (identified, untagged), mock
    // saves, tutor questions (member and guest logs) and sign-ups. One
    // key per person: userId for members, the shishya_anon cookie for
    // guests (analytics and AnonTutorLog share that cookie). ~3 ms.
    // 26 Sep 2026 review: the abandon-ghost-attempts cron (08:15 IST
    // daily) flips 10–24 stale attempts to ABANDONED and Prisma bumps
    // their updatedAt — 11–13 people "active" who did nothing (24–26 Sep).
    // ABANDONED rows are left out of the Attempt member (a student's own
    // discard or restart also writes ABANDONED, but that student is on
    // the page doing it, so their page view still counts them).
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(DISTINCT k)::bigint AS count FROM (
        SELECT COALESCE("userId", "anonId") AS k FROM "AnalyticsEvent"
          WHERE kind = 'PAGE_VIEW' AND "createdAt" >= ${cutoff30m}
            AND ("client" IS NULL OR "client" <> 'bot')
            AND COALESCE("userId", "anonId") IS NOT NULL
        UNION
        SELECT "userId" FROM "Attempt"
          WHERE "updatedAt" >= ${cutoff30m} AND status <> 'ABANDONED'
        UNION
        SELECT cs."userId" FROM "ChatMessage" cm
          JOIN "ChatSession" cs ON cs.id = cm."sessionId"
          WHERE cm."createdAt" >= ${cutoff30m}
        UNION
        SELECT "anonId" FROM "AnonTutorLog"
          WHERE "createdAt" >= ${cutoff30m} AND "anonId" IS NOT NULL
        UNION
        SELECT id FROM "User" WHERE "createdAt" >= ${cutoff30m}
      ) AS s
    `,
    prisma.attempt.count({
      where: {
        status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
        finishedAt: { gte: dayStart },
      },
    }),
    // Walk-ins: identity-less browser landings — founder call (16 Aug
    // 2026): "no genuine visit should miss" (WhatsApp-app opens, privacy
    // browsers, typed URLs). 3 Oct 2026: counted as PEOPLE, not page views
    // — one per device (ipHash + uaHash) per IST day; a Class 1-7 page
    // (no fingerprint by design) one per class page per IST day; a
    // pre-fingerprint row (before 18 Aug 2026) one per row, only with a
    // referrer, a tag or an entry page (landingKeySql, src/lib/learner-count.ts,
    // explains each from the data). Bots stay out: ingest-tagged rows and
    // rows the hourly scrub tags (src/lib/bot-scrub.ts) are client = 'bot'.
    // Until 3 Oct every row counted: on 2 Oct one reader's 176 page views
    // were 176 "learners".
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(DISTINCT ${Prisma.raw(landingKeySql("a"))})::bigint AS count
      FROM "AnalyticsEvent" a
      WHERE ${Prisma.raw(walkInWhereSql("a"))}
    `,
    // Overlap correction: an identity that BEGAN in the gap era (between
    // the 30 Jul cutover and the 16 Aug referred-first-hit fix) left its
    // first landing as an identity-less event before the cookie kicked
    // in — subtract so those people aren't counted twice. Identities
    // born after the fix with a referrer or a tag carry their id from the
    // first event and leave no orphan landing. (A direct first hit — no
    // referrer, no tag — still leaves one; that overlap is not corrected:
    // see the 3 Oct 2026 note in src/lib/learner-count.ts.) Merged person
    // key as above.
    prisma.$queryRaw<CountRow[]>`
      WITH ${Prisma.raw(SIGNUP_LINK_CTE)}
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT ${Prisma.raw(personKeySql("e"))} AS k
        FROM "AnalyticsEvent" e ${Prisma.raw(signupJoinSql("e"))}
        WHERE e.kind = 'PAGE_VIEW' AND COALESCE(e."userId", e."anonId") IS NOT NULL
        GROUP BY 1
        HAVING COUNT(*) >= 2
          AND MIN(e."createdAt") >= '2026-07-30T20:00:00Z'
          AND MIN(e."createdAt") < '2026-08-16T17:00:00Z'
      ) gap_era_engaged
    `,
    // AI tutor questions, whole site (26 Sep 2026): member turns (every
    // ChatMessage a student wrote — exam tutor, school tutor, results
    // "explain") plus guest turns (AnonTutorLog). The copies
    // /api/chat/import makes of a guest chat at sign-in carry
    // contextSnapshot.source = guest-import and are left out, so a turn
    // asked as a guest and kept as a member counts once. Guest turns
    // count only with a shishya_anon cookie (26 Sep 2026 review: 3,072
    // cookie-less rows are one 16–26 Aug 2026 machine run — flat
    // round-the-clock volume, peak at 4 AM IST, every message a
    // suggestion-chip template; AnonTutorLog has no client column to tell
    // a script from a student). Index-only scan on (anonId, createdAt).
    // ~3 ms.
    prisma.$queryRaw<CountRow[]>`
      SELECT (
        (SELECT COUNT(*) FROM "ChatMessage" cm
           JOIN "ChatSession" cs ON cs.id = cm."sessionId"
           WHERE cm.role = 'USER'
             AND COALESCE(cs."contextSnapshot"->>'source', '') <> ${GUEST_IMPORT_SOURCE})
        + (SELECT COUNT(*) FROM "AnonTutorLog" WHERE "anonId" IS NOT NULL)
      )::bigint AS count
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT (
        (SELECT COUNT(*) FROM "ChatMessage" cm
           JOIN "ChatSession" cs ON cs.id = cm."sessionId"
           WHERE cm.role = 'USER' AND cm."createdAt" >= ${dayStart}
             AND COALESCE(cs."contextSnapshot"->>'source', '') <> ${GUEST_IMPORT_SOURCE})
        + (SELECT COUNT(*) FROM "AnonTutorLog"
             WHERE "anonId" IS NOT NULL AND "createdAt" >= ${dayStart})
      )::bigint AS count
    `,
    // Questions answered TODAY — the same rule as the memoised all-time
    // count, on today's submitted attempts only (~3 ms).
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Attempt" a, jsonb_array_elements(a."answers") e
      WHERE a.status IN ${SUBMITTED_SQL} AND a."finishedAt" >= ${dayStart}
        AND jsonb_typeof(a."answers") = 'array'
        AND e->>'chosen' IS NOT NULL AND e->>'chosen' <> ''
    `,
    // Live tests taken: the ranked attempts — submitted, and started
    // inside the test's window (src/lib/live-test.ts liveTestRank). ~3 ms.
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Attempt" a
      JOIN "LiveTest" lt ON lt."mockId" = a."mockId"
      WHERE a.status IN ${SUBMITTED_SQL}
        AND a."startedAt" >= lt."opensAt" AND a."startedAt" <= lt."closesAt"
    `,
    // Exam goals set: active enrolments in real exams (a school class
    // enrolment is not an exam goal).
    prisma.enrollment.count({ where: { active: true, exam: NOT_SCHOOL_WHERE } }),
    // Guest whole papers (27 Sep 2026, founder: they count as mock exams
    // taken). One anonymous row per paper the grade route graded with at
    // least one answer (src/app/api/guest-paper/grade/route.ts) — no id,
    // so no person is counted twice by accident or tracked. The feature
    // started 27 Sep 2026; the literal lets the createdAt index do the work.
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count FROM "AnalyticsEvent"
      WHERE kind = 'CTA_CLICKED' AND "createdAt" >= '2026-09-27T00:00:00Z'::timestamptz AND props->>'cta' = 'guest-paper-graded'
    `,
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count FROM "AnalyticsEvent"
      WHERE kind = 'CTA_CLICKED' AND "createdAt" >= ${dayStart} AND props->>'cta' = 'guest-paper-graded'
    `,
    // Learners added today, identity part (30 Sep 2026): of the identities
    // seen today, those that meet the "humans" rule above on all their
    // views but did not on their views before midnight — the engaged
    // count's rise since midnight — less the gap-era overlap that closed
    // today (a gap-era identity whose second view came today). Only
    // today's identities are aggregated, so this reads a day's rows plus
    // their history, not the whole table. walkInsTodayRows adds today's
    // identity-less landings: together, uniqueVisitors now minus at midnight.
    // 3 Oct 2026: on the merged person key (a new account is one person —
    // a guest who was already a learner before midnight and signs up today
    // is not new today; before, the account counted as a second learner).
    prisma.$queryRaw<CountRow[]>`
      WITH ${Prisma.raw(SIGNUP_LINK_CTE)}
      SELECT (
        COUNT(*) FILTER (WHERE (c >= 2 OR (c = 1 AND (r OR u))) AND NOT (cb >= 2 OR (cb = 1 AND (rb OR ub))))
        - COUNT(*) FILTER (WHERE c >= 2 AND cb < 2 AND first_at >= '2026-07-30T20:00:00Z' AND first_at < '2026-08-16T17:00:00Z')
      )::bigint AS count
      FROM (
        SELECT ${Prisma.raw(personKeySql("e"))} AS k,
          COUNT(*) AS c,
          bool_or(e."refHost" IS NOT NULL) AS r,
          bool_or(e."utmSource" IS NOT NULL) AS u,
          COUNT(*) FILTER (WHERE e."createdAt" < ${dayStart}) AS cb,
          COALESCE(bool_or(e."refHost" IS NOT NULL) FILTER (WHERE e."createdAt" < ${dayStart}), FALSE) AS rb,
          COALESCE(bool_or(e."utmSource" IS NOT NULL) FILTER (WHERE e."createdAt" < ${dayStart}), FALSE) AS ub,
          MIN(e."createdAt") AS first_at
        FROM "AnalyticsEvent" e ${Prisma.raw(signupJoinSql("e"))}
        WHERE e.kind = 'PAGE_VIEW' AND COALESCE(e."userId", e."anonId") IS NOT NULL
          AND ${Prisma.raw(personKeySql("e"))} IN (
            SELECT DISTINCT ${Prisma.raw(personKeySql("t"))} FROM "AnalyticsEvent" t ${Prisma.raw(signupJoinSql("t"))}
            WHERE t.kind = 'PAGE_VIEW' AND t."createdAt" >= ${dayStart} AND COALESCE(t."userId", t."anonId") IS NOT NULL
          )
        GROUP BY 1
      ) learners_today
    `,
    // Today's identity-less browser landings — the walk-in rule above, since
    // midnight. A landing key carries its IST date, so every key seen since
    // midnight is new today.
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(DISTINCT ${Prisma.raw(landingKeySql("a"))})::bigint AS count
      FROM "AnalyticsEvent" a
      WHERE ${Prisma.raw(walkInWhereSql("a"))} AND a."createdAt" >= ${dayStart}
    `,
    // Live tests taken today: the ranked rule above, submitted since midnight.
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "Attempt" a
      JOIN "LiveTest" lt ON lt."mockId" = a."mockId"
      WHERE a.status IN ${SUBMITTED_SQL} AND a."finishedAt" >= ${dayStart}
        AND a."startedAt" >= lt."opensAt" AND a."startedAt" <= lt."closesAt"
    `,
    // Exam goals set today that are still active, real exams only.
    prisma.enrollment.count({ where: { active: true, createdAt: { gte: dayStart }, exam: NOT_SCHOOL_WHERE } }),
    // Learners by section (memoised, never throws; null → the fields are left out).
    getSectionCounts(now, dayStart),
  ]);

  // Combined "visitors" (founder call, 31 Jul; relabelled 26 Sep 2026):
  // engaged persons PLUS verified-browser single-page landers (one per
  // device per IST day since 3 Oct 2026) — they reached Shishya somehow
  // and are not a tagged crawler, we just can't say what they did.
  // Overlap-corrected so a gap-era lander who later engaged counts once.
  const engaged = n(uniqueVisitorsRows);
  const landers = n(walkInsRows);
  const overlap = n(overlapRows);

  return {
    activeNow: n(activeNowRows),
    totalPageViews: n(totalPageViewsRows),
    pageViewsToday: n(pageViewsTodayRows),
    uniqueVisitors: engaged + Math.max(0, landers - overlap),
    uniqueVisitorsToday: Math.max(0, n(learnersTodayRows) + n(walkInsTodayRows)),
    ...(sections ? sectionFields(sections) : {}),
    walkIns: landers,
    mocksTaken: mocksTaken + n(guestPapersRows),
    mocksToday: mocksToday + n(guestPapersTodayRows),
    totalSignups,
    signupsLast7Days,
    signupsToday,
    tutorQuestions: n(tutorRows),
    tutorQuestionsToday: n(tutorTodayRows),
    questionsAnswered: supply.questionsAnswered,
    questionsAnsweredToday: n(answeredTodayRows),
    liveTestsTaken: n(liveTestRows),
    liveTestsToday: n(liveTestTodayRows),
    examGoals,
    examGoalsToday,
    exams: supply.exams,
    practiceQuestions: supply.practiceQuestions,
    topicNotes: supply.topicNotes,
    schoolChapters: supply.schoolChapters,
    languages: LANGUAGE_COUNT,
  };
}

// Backwards-compat re-export kept so any older import path keeps
// working through one deploy cycle. Drop after a week if no callers
// reach for the old name.
export const getBlendedLiveCounts = getLiveCounts;
export type BlendedLiveCounts = LiveCounts;
