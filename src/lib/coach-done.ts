// Which of today's coach tasks are done — ONE definition (16 Sep 2026) for
// /api/coach/today (the CoachNextTask breadcrumb), the full plan on /coach
// and the dashboard strip. Before this only the breadcrumb knew, so it could
// say "Today's plan complete" while /coach showed "Start →" on every task.
//
// Honest completion signals only:
//   • a topic task ("read the notes, then test yourself", "Revise weak
//     topic") is done on TopicStudyState.completedAt today (the student
//     pressed "Mark topic done"), or a submitted topic quiz / coach drill
//     today on that topic. readAt is NOT a signal: the notes page stamps it
//     on every signed-in open (TopicMasteryPanel), so "Start →" and back
//     used to tick the task (42 readAt rows vs 0 completedAt among plan
//     holders, 14 days to 16 Sep).
//   • a coach drill: a submitted drill assigned for that topic, or any
//     submitted set today that covered it (unchanged).
//   • the full mock: a submitted FULL mock today that is not a live test;
//     the live test: a submitted live-test attempt today (unchanged).
//   • Daily 5 and a topic-less "test": any submitted attempt today —
//     lenient on purpose, it is the keep-the-habit task (unchanged).
//   • the exam-day and post-exam "read" tasks have no completion signal and
//     never tick — so no N/M counter is shown in those phases
//     (showsDoneCount).

import { prisma } from "@/lib/db/prisma";
import { DRILL_HREF_PREFIX, type CoachTask, type ComputedPlan } from "@/lib/coach-plan";

const DAY_MS = 86_400_000;
const IST_OFFSET_MS = 5.5 * 3600_000;

/** A submitted attempt started today (IST), with what its set covered. */
export interface DayAttempt {
  type: string;
  generatedBy: string | null;
  /** Mock.config.coachTopic — the topic a coach drill was assigned for. */
  coachTopic: string | null;
  /** Exam code of the attempt's mock (null if unreadable). */
  examCode: string | null;
  /** Topic codes of the set's questions. */
  topics: string[];
  /** Parent topic codes of those questions (a topic quiz draws from the
   *  topic and its sub-topics). */
  parents: string[];
}

export interface DayActivity {
  /** `${examCode}:${topicCode}` pairs marked done (completedAt) today. */
  completedTopics: ReadonlySet<string>;
  attempts: DayAttempt[];
}

/** The UTC instant today's IST day began. */
export function istDayStart(now: Date = new Date()): Date {
  return new Date(Math.floor((now.getTime() + IST_OFFSET_MS) / DAY_MS) * DAY_MS - IST_OFFSET_MS);
}

function decode(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** A set built to test one topic: the notes page's "Test me" / quiz and the
 *  Daily 5 (TOPIC mocks) or a coach drill. A full mock or an adaptive set
 *  that happens to include a question on the topic is not. */
function isTopicPractice(a: DayAttempt): boolean {
  return a.type === "TOPIC" || a.generatedBy === "coach-drill";
}

/** Pure: is this task done, given today's activity? */
export function taskDone(task: CoachTask, act: DayActivity): boolean {
  const drill = task.href.startsWith(DRILL_HREF_PREFIX)
    ? new URLSearchParams(task.href.slice(DRILL_HREF_PREFIX.length)).get("topic")
    : null;
  if (drill) {
    return act.attempts.some((a) => a.coachTopic === drill || (a.topics ?? []).includes(drill));
  }
  const m = task.href.match(/^\/exams\/([^/?#]+)\/topics\/([^/?#]+)/) ?? task.href.match(/\/topics\/([^/?#]+)/);
  if (m) {
    const examCode = m.length === 3 ? decode(m[1]) : null;
    const code = decode(m[m.length - 1]);
    const sameExam = (e: string | null) => examCode == null || e == null || e === examCode;
    if (examCode != null && act.completedTopics.has(`${examCode}:${code}`)) return true;
    if (examCode == null && [...act.completedTopics].some((k) => k.endsWith(`:${code}`))) return true;
    return act.attempts.some(
      (a) =>
        sameExam(a.examCode) &&
        isTopicPractice(a) &&
        (a.coachTopic === code || (a.topics ?? []).includes(code) || (a.parents ?? []).includes(code)),
    );
  }
  if (task.kind === "mock") return act.attempts.some((a) => a.type === "FULL" && a.generatedBy !== "live-test");
  if (task.kind === "livetest") return act.attempts.some((a) => a.generatedBy === "live-test");
  if (task.kind === "daily5" || task.kind === "test") return act.attempts.length > 0;
  // "read" tasks without a topic page (exam day, post-exam) have no
  // completion signal.
  return false;
}

/** Pure: done flags for a task list. */
export function doneFlags(tasks: CoachTask[], act: DayActivity): boolean[] {
  return tasks.map((t) => taskDone(t, act));
}

/** False in the phases whose only task can never tick — a "0/1 done"
 *  there would read as an audit, which the coach never is. */
export function showsDoneCount(phase: ComputedPlan["phase"]): boolean {
  return phase !== "exam-day" && phase !== "post-exam";
}

/** Today's activity for one student: two small reads. A failed read
 *  REJECTS (review, 16 Sep 2026): counting it as no activity printed "0/3
 *  done" and "Start →" over tasks the student had finished. Callers decide —
 *  /coach and the dashboard show no ticks and no count (done = null), the
 *  breadcrumb route falls back to all-open. */
export async function loadDayActivity(userId: string, now: Date = new Date()): Promise<DayActivity> {
  const dayStart = istDayStart(now);
  const [completed, attempts] = await Promise.all([
    prisma.$queryRaw<{ exam: string; code: string }[]>`
      SELECT e.code AS exam, t.code
      FROM "TopicStudyState" ts
      JOIN "Topic" t ON t.id = ts."topicId"
      JOIN "Subject" s ON s.id = t."subjectId"
      JOIN "Exam" e ON e.id = s."examId"
      WHERE ts."userId" = ${userId} AND ts."completedAt" >= ${dayStart}`,
    // coachTopic = the topic a coach drill (/api/coach/today/drill) was
    // assigned for — set even when the questions came from the subject
    // or exam pool; topics / parents = what the set's questions sat on.
    prisma.$queryRaw<DayAttempt[]>`
      SELECT m.type::text AS type, m."generatedBy",
             m.config->>'coachTopic' AS "coachTopic",
             e.code AS "examCode",
             ARRAY(SELECT DISTINCT t.code FROM "Question" q JOIN "Topic" t ON t.id = q."topicId"
                    WHERE q.id = ANY(m."questionIds")) AS topics,
             ARRAY(SELECT DISTINCT p.code FROM "Question" q JOIN "Topic" t ON t.id = q."topicId"
                    JOIN "Topic" p ON p.id = t."parentId"
                    WHERE q.id = ANY(m."questionIds")) AS parents
      FROM "Attempt" a
      JOIN "Mock" m ON m.id = a."mockId"
      LEFT JOIN "Exam" e ON e.id = m."examId"
      WHERE a."userId" = ${userId} AND a."startedAt" >= ${dayStart}
        AND a.status IN ('SUBMITTED','AUTO_SUBMITTED')`,
  ]);
  return {
    completedTopics: new Set(completed.map((c) => `${c.exam}:${c.code}`)),
    attempts,
  };
}

/** Done flags for today's tasks (same order as `tasks`). Rejects when
 *  today's activity can't be read. */
export async function coachTaskDoneFlags(userId: string, tasks: CoachTask[], now: Date = new Date()): Promise<boolean[]> {
  if (tasks.length === 0) return [];
  return doneFlags(tasks, await loadDayActivity(userId, now));
}
