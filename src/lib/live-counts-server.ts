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
  /** Distinct people who came to Shishya — engaged identities (2+ page
   *  views, or one referred view) PLUS identity-less browser landings,
   *  overlap-corrected. The strip calls this "learners" (founder's
   *  word, 26 Sep 2026): everyone who came to Shishya to study. */
  uniqueVisitors: number;
  /** Walk-ins: page views by verified BROWSERS that carry no identity —
   *  the single-page landers. They're humans too (a crawler can't be
   *  classified 'browser' AND they reached us somehow), we just don't
   *  know their seriousness yet. Countable only since the 31 Jul 2026
   *  classification cutover, so it starts small and grows honestly.
   *  Includes each future-visitor's very first page view (identity
   *  starts on their second view) — i.e. this is "human first-touch
   *  landings", which is exactly what a walk-in is. The internal split
   *  of uniqueVisitors; not shown on the strip. */
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
  /** Exam goals set: active enrolments (a member's chosen target exam),
   *  real exams only — a school class is not an exam goal. */
  examGoals: number;
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
    "Distinct people who came to Shishya: identities on 2+ page views, or one view that arrived from another site or a tagged link (for example utm_source=chatgpt.com — 27 Sep 2026: these were being missed), plus identity-less browser landings, overlap-corrected. Proves a visit, not learning.",
  walkIns: "Identity-less browser page views (single-page landers) — the internal split of uniqueVisitors; not shown.",
  mocksTaken: "Attempt rows with status SUBMITTED or AUTO_SUBMITTED — mocks a student finished, any exam or school chapter.",
  mocksToday: "Attempts submitted since 00:00 IST today.",
  totalSignups: "User rows (accounts).",
  signupsLast7Days: "Accounts created in the last 7 days (rolling).",
  signupsToday: "Accounts created since 00:00 IST today.",
  tutorQuestions:
    "ChatMessage rows with role USER (guest-import copies excluded) plus AnonTutorLog rows with a shishya_anon cookie — questions people sent to the AI tutor, site-wide; cookie-less guest calls (not provably a person) left out.",
  tutorQuestionsToday: "The same since 00:00 IST today.",
  questionsAnswered: "Answer entries with a chosen option inside submitted attempts (unanswered questions not counted); refreshed every 10 minutes.",
  questionsAnsweredToday: "The same inside attempts submitted since 00:00 IST today (live).",
  liveTestsTaken: "Submitted attempts on a live-test mock that started inside the test's window.",
  examGoals: "Active enrolments in real exams (a member's chosen target exam).",
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
  examGoals: 0,
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
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT COALESCE("userId", "anonId") AS k
        FROM "AnalyticsEvent"
        WHERE kind = 'PAGE_VIEW' AND COALESCE("userId", "anonId") IS NOT NULL
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
    // Walk-ins: ALL identity-less browser page views — founder call
    // (16 Aug 2026): "no genuine visit should miss." This includes the
    // no-referrer landings (WhatsApp-app opens, privacy browsers, typed
    // URLs) at the cost of counting any cookie-less crawler that spoofs
    // a browser UA and sends no referrer. Known crawlers stay excluded
    // (ingest-tagged bots never enter; July's phantom-id sweeps are
    // scrubbed elsewhere). Public number: complete over pristine.
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count FROM "AnalyticsEvent"
      WHERE kind = 'PAGE_VIEW' AND "client" = 'browser'
        AND "userId" IS NULL AND "anonId" IS NULL
    `,
    // Overlap correction: an identity that BEGAN in the gap era (between
    // the 30 Jul cutover and the 16 Aug referred-first-hit fix) left its
    // first landing as an identity-less event before the cookie kicked
    // in — subtract so those people aren't counted twice. Identities
    // born after the fix carry their id from the first event, so they
    // leave no orphan landing and need no correction.
    prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT COALESCE("userId", "anonId") AS k
        FROM "AnalyticsEvent"
        WHERE kind = 'PAGE_VIEW' AND COALESCE("userId", "anonId") IS NOT NULL
        GROUP BY 1
        HAVING COUNT(*) >= 2
          AND MIN("createdAt") >= '2026-07-30T20:00:00Z'
          AND MIN("createdAt") < '2026-08-16T17:00:00Z'
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
  ]);

  // Combined "visitors" (founder call, 31 Jul; relabelled 26 Sep 2026):
  // engaged visitors PLUS verified-browser single-page landers — they
  // reached Shishya somehow and are provably not a tagged crawler, we
  // just can't say what they did. Overlap-corrected so a lander who
  // later engages counts once.
  const engaged = n(uniqueVisitorsRows);
  const landers = n(walkInsRows);
  const overlap = n(overlapRows);

  return {
    activeNow: n(activeNowRows),
    totalPageViews: n(totalPageViewsRows),
    pageViewsToday: n(pageViewsTodayRows),
    uniqueVisitors: engaged + Math.max(0, landers - overlap),
    walkIns: landers,
    mocksTaken,
    mocksToday,
    totalSignups,
    signupsLast7Days,
    signupsToday,
    tutorQuestions: n(tutorRows),
    tutorQuestionsToday: n(tutorTodayRows),
    questionsAnswered: supply.questionsAnswered,
    questionsAnsweredToday: n(answeredTodayRows),
    liveTestsTaken: n(liveTestRows),
    examGoals,
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
