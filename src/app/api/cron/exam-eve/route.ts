// GET /api/cron/exam-eve — "all the best" the evening before the exam.
//
// Founder call (6 Aug 2026): students registered for an exam should
// hear from Shishya just before they sit it — wishes, a calm checklist,
// and a motivational quote that holds up whatever the outcome.
// Runs daily 6:30 PM IST (13:00 UTC); finds exams happening TOMORROW
// (IST) and emails every actively-enrolled student.
//
// DATA-CONFIDENCE GUARD, rewritten for Exam Week Mode (6 Sep 2026).
// The old guard skipped an exam when ANY other exam-day row 2–90 days out
// had "exam" in its label — which silenced every multi-day / multi-shift
// exam (SSC CGL 12–25 Sep, MPESB 17 & 22 Sep, SBI Clerk 16/26 Sep, RRB
// NTPC 17/24 Sep). Now the decision is the shared state machine
// (src/lib/exam-week.ts) via examEveDecision():
//   • send only when phase === "eve" (the window's first exam day is
//     tomorrow, IST) and that row is an ANNOUNCED date (official /
//     reported) — never an "expected" estimate;
//   • a contradiction is ONLY another TYPED exam row (kind = 'EXAM') of a
//     strictly HIGHER tier within ±30 days that names a different date;
//     untyped legacy rows are ignored, same-tier rows on other days are
//     the window itself.
//
// SHIFT DAYS (wave 2): Enrollment.shiftDate is the student's OWN day
// inside a multi-day window. A student with a shiftDate gets this mail on
// the evening before THAT day (and only then) — on the window's first-day
// eve they are skipped unless their shift IS the first day. Students
// without a shiftDate keep the window-first-day behaviour. The shift path
// requires tomorrow to lie inside an ANNOUNCED window (official / reported
// first row); the date line reads "{date} (your shift day, window
// official)" so the tier still travels with the date, and it carries NO
// window-end (it is one day — the student's — not the window opening).
//
// A shiftDate only removes a student from another day's mail when it is
// one of THIS window's announced days (review fix, 7 Sep). A stale value
// left by an earlier cycle is ignored here exactly as the hub ignores it
// (applyShiftDay, src/lib/exam-week-student.ts), so mail and hub agree and
// the student still hears from us. The coach-plan path obeys the same rule
// — it used to ignore shiftDate entirely and send a second eve mail.
//
// Every date in the mail carries its tier word. Anti-duplicate: EmailTouch
// tag 'exam-eve' per user per day PLUS the exam-scoped tag
// 'exam-eve-{CODE}' (wave 2) which the day-after cron requires, so a
// student who got "all the best for SSC CGL" is never asked about another
// exam. (The send log also writes 'sent:exam-eve'.) Opt-outs are excluded
// here AND at the send layer. ?dry=1 returns the would-send list (code,
// users, reason) and the skips, and sends nothing.
// Auth: Bearer ${CRON_SECRET}.

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { sendExamEveEmail } from "@/lib/email";
import { getDailyQuote } from "@/data/motivational-quotes";
import { computeExamWeekState, istDay } from "@/lib/exam-week";
import { shiftDayIso, shiftableDays } from "@/lib/exam-week-student";
import { buildTimeline, latestOfKind, type TimelineRow } from "@/lib/exam-timeline";
import {
  checklistLink,
  acceptedPlanDays,
  announcedExamDays,
  examEveDecision,
  loadExamBundles,
  nextTrackerRows,
  plainDay,
  shiftTierWord,
  tierWord,
  whenWithTier,
  windowContainsDay,
  type ExamBundle,
} from "@/lib/exam-week-mail";

const MAX_SENDS = 400;
const DAY_MS = 86_400_000;

type Student = { id: string; email: string; name: string | null };

/** Everything the template needs for one exam, computed once per exam. */
interface EveContent {
  examCode: string;
  examShort: string;
  examDate: string;
  tier: string;
  windowEnd: { date: string; tier: string } | null;
  checklistUrl: string;
  checklistIsArticle: boolean;
  admitCard: { label: string; when: string; url: string | null; notes: string | null } | null;
  nextDates: { label: string; when: string }[];
}

async function buildContent(
  bundle: ExamBundle,
  timeline: TimelineRow[],
  eve: { date: string; tier: string; day: string; windowIds: string[]; windowEnd: TimelineRow | null },
): Promise<EveContent> {
  const { meta } = bundle;
  const checklist = await checklistLink(meta.examId, meta.code);
  const admit = latestOfKind(timeline, "ADMIT_CARD");
  // Reporting instructions live in the row's notes; without them the line
  // describes the admit-card RELEASE date ("Admit card: 5 Sep (official)")
  // — the template picks ew.eve.admit vs ew.eve.admitCard exactly like
  // ExamWeekBlock does.
  const admitCard =
    admit && admit.tier === "official"
      ? { label: admit.label, when: whenWithTier(admit), url: admit.url, notes: admit.notes?.trim() || null }
      : null;
  const nextDates = nextTrackerRows(timeline, eve.day, eve.windowIds, 2).map((r) => ({
    label: r.label,
    when: whenWithTier(r),
  }));
  return {
    examCode: meta.code,
    examShort: meta.short,
    examDate: eve.date,
    tier: eve.tier,
    windowEnd: eve.windowEnd ? { date: plainDay(eve.windowEnd.date), tier: tierWord(eve.windowEnd.tier) } : null,
    checklistUrl: checklist.url,
    checklistIsArticle: checklist.isArticle,
    admitCard,
    nextDates,
  };
}

/** EmailTouch tags must match [A-Za-z0-9_-]; exam codes are A-Z0-9_ already. */
function scopedTag(code: string): string {
  return `exam-eve-${code.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

/** `en."shiftDate" IN (…)` over the window's OTHER announced days — the
 *  student sits one of them, so tonight's mail is not theirs. FALSE when
 *  the window has no other day, which leaves the caller's guard a no-op.
 *  Days are compared as dates (Enrollment.shiftDate is @db.Date). */
function onAnotherShiftDay(days: string[]): Prisma.Sql {
  if (days.length === 0) return Prisma.sql`FALSE`;
  return Prisma.sql`en."shiftDate" IN (${Prisma.join(days.map((d) => Prisma.sql`${d}::date`))})`;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  if ((req.headers.get("authorization") ?? "") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  const started = Date.now();
  const now = new Date();
  const tomorrow = istDay(new Date(now.getTime() + DAY_MS));
  const tomorrowDate = new Date(tomorrow + "T00:00:00Z");
  const outOfTime = () => Date.now() - started > (maxDuration - 30) * 1000;

  // 1) Exams with ANY live exam-day row dated tomorrow (IST). The shared
  //    state machine then decides, per exam, whether tonight is its eve.
  const tomorrowExams = await prisma.$queryRaw<{ examId: string }[]>`
    SELECT DISTINCT d."examId"
    FROM "ExamImportantDate" d
    JOIN "Exam" e ON e.id = d."examId" AND e.active = TRUE
    WHERE d."archivedAt" IS NULL
      AND (d."isExamDay" = TRUE OR d.kind = 'EXAM')
      AND (d.date + INTERVAL '5.5 hours')::date = (NOW() + INTERVAL '5.5 hours' + INTERVAL '1 day')::date
  `.catch((err) => {
    console.error("[exam-eve] selection failed", err);
    return [] as { examId: string }[];
  });

  // 2) Coach-plan holders whose OWN confirmed exam date is tomorrow (IST)
  //    — the one date the student personally set, which the global exam
  //    calendar may not carry (audit 18 Aug 2026). Deduped via the same
  //    'exam-eve' EmailTouch tag so nobody is emailed twice. Their
  //    enrollment's shiftDate rides along: a student who booked a shift day
  //    of this exam's window is mailed on THAT eve by the shift path below,
  //    never twice (review fix, 7 Sep — the window is decided per exam once
  //    the bundles are loaded, so the filter itself lives in the loop).
  const coachStudents = await prisma.$queryRaw<(Student & { examId: string; planDate: Date; shiftDate: Date | null })[]>`
    SELECT DISTINCT ON (u.id) u.id, u.email, u.name, cp."examId", cp."examDate" AS "planDate", en."shiftDate"
    FROM "CoachPlan" cp
    JOIN "User" u ON u.id = cp."userId"
    JOIN "Exam" e ON e.id = cp."examId" AND e.active = TRUE
    LEFT JOIN "Enrollment" en ON en."userId" = u.id AND en."examId" = cp."examId" AND en.active = TRUE
    WHERE u.email <> '' AND u."emailOptOut" = FALSE
      AND (cp."examDate" + INTERVAL '5.5 hours')::date
        BETWEEN (NOW() + INTERVAL '5.5 hours' - INTERVAL '2 days')::date AND (NOW() + INTERVAL '5.5 hours' + INTERVAL '4 days')::date
      AND NOT EXISTS (
        SELECT 1 FROM "EmailTouch" t
        WHERE t."userId" = u.id AND t.tag = 'exam-eve'
          AND t."sentAt" > NOW() - INTERVAL '20 hours'
      )
    LIMIT ${MAX_SENDS}
  `.catch((err) => {
    console.error("[exam-eve] coach-plan selection failed", err);
    return [] as (Student & { examId: string; planDate: Date; shiftDate: Date | null })[];
  });

  // 3) Exams where some active enrollment names TOMORROW as the student's
  //    shift day (wave 2). Verified per exam against the window below.
  const shiftExams = await prisma.$queryRaw<{ examId: string }[]>`
    SELECT DISTINCT en."examId"
    FROM "Enrollment" en
    JOIN "Exam" e ON e.id = en."examId" AND e.active = TRUE
    WHERE en.active = TRUE AND en."shiftDate" = ${tomorrow}::date
  `.catch((err) => {
    console.error("[exam-eve] shift-day selection failed", err);
    return [] as { examId: string }[];
  });

  const bundles = await loadExamBundles([
    ...tomorrowExams.map((x) => x.examId),
    ...coachStudents.map((s) => s.examId),
    ...shiftExams.map((x) => x.examId),
  ]);

  const quote = getDailyQuote();
  const wouldSend: { code: string; users: number; reason: string }[] = [];
  const skipped: { code: string; reason: string }[] = [];
  const report: { exam: string; students: number; sent: number }[] = [];
  let totalSent = 0;
  // Users mailed in THIS run (the EmailTouch guard only sees committed rows).
  const mailed = new Set<string>();
  const contentCache = new Map<string, EveContent>();

  async function deliver(s: Student, content: EveContent): Promise<boolean> {
    if (mailed.has(s.id)) return false;
    const ok = await sendExamEveEmail({
      to: s.email,
      userId: s.id,
      name: s.name,
      ...content,
      quote: { text: quote.text, author: quote.author },
    }).catch(() => false);
    if (ok) {
      mailed.add(s.id);
      totalSent++;
      // Generic per-day guard + the exam-scoped tag the day-after cron requires.
      await prisma
        .$executeRaw`INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${crypto.randomUUID()}, ${s.id}, 'exam-eve'), (${crypto.randomUUID()}, ${s.id}, ${scopedTag(content.examCode)})`
        .catch(() => {});
    }
    return ok;
  }

  // ── Enrollment path (window's first day is tomorrow) ───────────────
  for (const { examId } of tomorrowExams) {
    const bundle = bundles.get(examId);
    if (!bundle) continue;
    const { meta } = bundle;
    const decision = examEveDecision(bundle.rows, meta.officialUrl, now);
    if (!decision.ok) {
      skipped.push({ code: meta.code, reason: decision.reason });
      continue;
    }
    const { eveRow, state, timeline } = decision;
    const eveDay = istDay(eveRow.date);
    const windowEnd = state.windowEnd && state.windowEnd.id !== eveRow.id ? state.windowEnd : null;
    const content = await buildContent(bundle, timeline, {
      date: plainDay(eveRow.date),
      tier: tierWord(eveRow.tier),
      day: eveDay,
      windowIds: state.windowDays.map((r) => r.id),
      windowEnd,
    });
    contentCache.set(examId, content);
    const reason = `eve: ${whenWithTier(eveRow)}${windowEnd ? ` → window to ${whenWithTier(windowEnd)}` : ""}`;

    // Students with a shift day elsewhere in the window get their own eve
    // (the shift path below, on the evening before THEIR day). Only THIS
    // window's announced days count as "elsewhere": a stale shiftDate from
    // an earlier cycle used to drop the student out of every eve mail while
    // the hub still showed them the window's first day (applyShiftDay
    // ignores stale values) — mail and hub now agree (review fix, 7 Sep).
    const otherShiftDays = shiftableDays(state)
      .map((r) => istDay(r.date))
      .filter((d) => d !== tomorrow);
    const students = await prisma.$queryRaw<Student[]>`
      SELECT u.id, u.email, u.name
      FROM "Enrollment" en JOIN "User" u ON u.id = en."userId"
      WHERE en."examId" = ${examId} AND en.active = TRUE AND u.email <> '' AND u."emailOptOut" = FALSE
        AND (en."shiftDate" IS NULL OR NOT (${onAnotherShiftDay(otherShiftDays)}))
        AND NOT EXISTS (
          SELECT 1 FROM "EmailTouch" t
          WHERE t."userId" = u.id AND t.tag = 'exam-eve'
            AND t."sentAt" > NOW() - INTERVAL '20 hours'
        )
      LIMIT ${MAX_SENDS}
    `.catch(() => [] as Student[]);

    wouldSend.push({ code: meta.code, users: students.length, reason });
    if (dry) {
      report.push({ exam: meta.short, students: students.length, sent: 0 });
      continue;
    }
    let sent = 0;
    for (const s of students) {
      if (totalSent >= MAX_SENDS || outOfTime()) break;
      if (await deliver(s, content)) sent++;
    }
    report.push({ exam: meta.short, students: students.length, sent });
  }

  // ── Shift-day path (tomorrow is the student's own day inside the window) ──
  let shiftCount = 0;
  let shiftSent = 0;
  for (const { examId } of shiftExams) {
    const bundle = bundles.get(examId);
    if (!bundle) continue;
    const { meta } = bundle;
    // First-day exams already mailed their shiftDate = tomorrow students above.
    if (contentCache.has(examId)) continue;
    const state = computeExamWeekState(bundle.rows, meta.officialUrl, now);
    if (!windowContainsDay(state, tomorrow)) {
      skipped.push({ code: `${meta.code} (shift-day)`, reason: `tomorrow is not inside an announced exam window (phase:${state.phase})` });
      continue;
    }
    const days = state.windowDays.map((r) => istDay(r.date)).sort();
    const firstRow = state.windowDays.find((r) => istDay(r.date) === days[0]) ?? state.windowDays[0];
    // When tomorrow IS the window's first day this is the same mail the
    // enrollment path sends, so it owes the same honesty guard: reuse
    // examEveDecision (higher-tier contradiction, expected-tier estimate).
    // contentCache is only set when that decision said "send", so without
    // this a REFUSED exam still reached students through their shiftDate
    // (review fix, 7 Sep).
    if (tomorrow === days[0]) {
      const decision = examEveDecision(bundle.rows, meta.officialUrl, now);
      if (!decision.ok) {
        skipped.push({ code: `${meta.code} (shift-day)`, reason: `eve refused for the window's first day (${decision.reason})` });
        continue;
      }
    }
    const timeline = buildTimeline(bundle.rows, now, meta.officialUrl);
    // windowEnd stays NULL here: this mail is about ONE day — the student's
    // own — and the window-range line would claim the window opens on it
    // ("Exam window: 15 Sep to 25 Sep" when it opened on the 12th). null
    // falls through to the single-day opener in sendExamEveEmail.
    const content = await buildContent(bundle, timeline, {
      date: plainDay(tomorrowDate),
      tier: shiftTierWord(firstRow.tier),
      day: tomorrow,
      windowIds: state.windowDays.map((r) => r.id),
      windowEnd: null,
    });
    const students = await prisma.$queryRaw<Student[]>`
      SELECT u.id, u.email, u.name
      FROM "Enrollment" en JOIN "User" u ON u.id = en."userId"
      WHERE en."examId" = ${examId} AND en.active = TRUE AND en."shiftDate" = ${tomorrow}::date
        AND u.email <> '' AND u."emailOptOut" = FALSE
        AND NOT EXISTS (
          SELECT 1 FROM "EmailTouch" t
          WHERE t."userId" = u.id AND t.tag = 'exam-eve'
            AND t."sentAt" > NOW() - INTERVAL '20 hours'
        )
      LIMIT ${MAX_SENDS}
    `.catch(() => [] as Student[]);
    const pending = students.filter((s) => !mailed.has(s.id));
    shiftCount += pending.length;
    wouldSend.push({
      code: `${meta.code} (shift-day)`,
      users: pending.length,
      reason: `shift day ${tomorrow} inside window ${days[0]}…${days[days.length - 1]} (${firstRow.tier})`,
    });
    if (dry) continue;
    for (const s of pending) {
      if (totalSent >= MAX_SENDS || outOfTime()) break;
      if (await deliver(s, content)) shiftSent++;
    }
  }
  if (shiftExams.length > 0) report.push({ exam: "(shift days)", students: shiftCount, sent: shiftSent });

  // ── Coach-plan path ────────────────────────────────────────────────
  // The student's own date is authoritative for them. When the tracker
  // agrees (its eve decision is "send"), the mail carries the tracker's
  // tier word; otherwise the date is labelled as the student's plan date.
  const coachByExam = new Map<string, (typeof coachStudents)[number][]>();
  for (const s of coachStudents) {
    const list = coachByExam.get(s.examId) ?? [];
    list.push(s);
    coachByExam.set(s.examId, list);
  }
  let coachSent = 0;
  let coachCount = 0;
  for (const [examId, list] of coachByExam) {
    const bundle = bundles.get(examId);
    if (!bundle) continue;
    const { meta } = bundle;
    // A coach-plan holder who booked a shift day of THIS exam's announced
    // window hears from the shift path on their own eve — this path used to
    // ignore shiftDate entirely and mail them a second time (a student on
    // shift 15 Sep got 11 Sep from here AND 14 Sep from the shift path).
    // A shiftDate outside the window is stale: ignored, like the hub does.
    const coachState = computeExamWeekState(bundle.rows, meta.officialUrl, now);
    const bookedDays = new Set(shiftableDays(coachState).map((r) => istDay(r.date)));
    // An OFFICIAL/REPORTED exam day beats a typed plan date (11 Sep 2026):
    // every coach plan within three days of an announced day was EARLY, and
    // this path mailed "exam tomorrow" a night early. A plan date now maps to
    // the nearest announced day within three days of it and the student is
    // mailed on THAT eve; the plan date stands only when nothing is announced
    // nearby. The SQL above pulls plans within a few days so this can decide.
    const decisionForDays = examEveDecision(bundle.rows, meta.officialUrl, now);
    const announced = announcedExamDays(decisionForDays.timeline);
    const accepted = new Set(acceptedPlanDays(announced, tomorrow));
    const rerouted = list.filter((s) => !accepted.has(istDay(s.planDate)));
    if (rerouted.length > 0) {
      const days = [...new Set(rerouted.map((s) => istDay(s.planDate)))].sort().join(", ");
      skipped.push({
        code: `${meta.code} (coach-plan)`,
        reason: `${rerouted.length} plan date(s) ${days} are not tonight's eve — an announced exam day within three days wins${announced.length ? " (announced: " + announced.join("/") + ")" : ""}, otherwise the plan date is its own eve`,
      });
    }
    const eligible = list.filter((s) => {
      if (!accepted.has(istDay(s.planDate))) return false;
      const day = shiftDayIso(s.shiftDate);
      return !(day && day !== tomorrow && bookedDays.has(day));
    });
    const onOwnShift = list.filter((s) => accepted.has(istDay(s.planDate))).length - eligible.length;
    if (onOwnShift > 0) {
      skipped.push({
        code: `${meta.code} (coach-plan)`,
        reason: `${onOwnShift} student(s) hold a shift day in this window — mailed on their own eve instead`,
      });
    }
    if (eligible.length === 0) continue;
    let content = contentCache.get(examId) ?? null;
    let reason = "coach-plan date agrees with the tracker";
    if (!content) {
      const decision = decisionForDays;
      const announcedRow =
        decision.timeline.find((r) => r.kind === "EXAM" && r.tier !== "expected" && istDay(r.date) === tomorrow) ?? null;
      // Tomorrow IS an announced day → its date and tier word. The plan date
      // mapped onto it, so it is wrong by construction and must not be
      // printed as though it were the exam date.
      content = await buildContent(bundle, decision.timeline, {
        date: announcedRow ? plainDay(announcedRow.date) : plainDay(tomorrowDate),
        tier: announcedRow ? tierWord(announcedRow.tier) : "the date you set in your coach plan",
        day: tomorrow,
        windowIds: decision.state.windowDays.map((r) => r.id),
        windowEnd: null,
      });
      reason = announcedRow
        ? `announced exam day ${tomorrow} (${announcedRow.tier}) — plan dates mapped onto it`
        : `coach-plan date ${tomorrow} (tracker: ${decision.ok ? "eve" : decision.reason})`;
    }
    const pending = eligible.filter((s) => !mailed.has(s.id));
    coachCount += pending.length;
    wouldSend.push({ code: `${meta.code} (coach-plan)`, users: pending.length, reason });
    if (dry) continue;
    for (const s of pending) {
      if (totalSent >= MAX_SENDS || outOfTime()) break;
      if (await deliver(s, content)) coachSent++;
    }
  }
  report.push({ exam: "(coach-plan dates)", students: coachCount, sent: coachSent });

  return Response.json({
    ok: true,
    dry,
    tomorrow,
    exams: tomorrowExams.length,
    shiftExams: shiftExams.length,
    sent: totalSent,
    wouldSend,
    skipped,
    report,
    elapsedMs: Date.now() - started,
  });
}
