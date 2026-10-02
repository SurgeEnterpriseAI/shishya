// One-row repair (2 Oct 2026, resilience plan D8(a)) — the one "saved, we'll
// answer it here" promise the late-answer run could not keep.
//
// What happened. A member's question first asked 26 Sep 2026 about 12:03 IST
// failed. The student sent it again on 1 Oct 2026 about 11:19 IST, while the
// AI was unavailable. The chat reused the stored row (a re-send keeps the
// row's first date) and told the student the question was saved and would be
// answered here. The late-answer run counted its 72 hours from the row's
// first date, so the row was already outside the window when the promise was
// made, and it has never been picked.
//
// What this does. It finds that ONE row — by those two times and its failed /
// promised marks, nothing else — and, with --apply, writes
// metadata.sentAt = the re-send time (the row's own failedAt, which the chat
// route wrote at that send). The late-answer run (GET
// /api/cron/tutor-answer-later, every 15 minutes) then counts the 72 hours
// from that send and answers the question through the chat's own pipeline,
// with its "Answered later" note, and its email when the account can receive
// one. This script calls no model, sends no mail and starts no run.
//
// Two conditions, both printed by the dry run:
//   • The 2 Oct 2026 window change must be live (src/lib/tutor-late-answer.ts
//     lateWindowOpen). Before that deploy the live run does not read sentAt
//     and the row stays outside the window.
//   • The run never picks a row first stored more than 7 days ago
//     (LATE_HARD_STOP_MS). For this row that is 3 Oct 2026 about 12:03 IST.
//     After it, sentAt changes nothing: the script says so and writes nothing.
//
// Dry by default: prints what it found — row id and times, never the question
// text, a name or an email address — and what --apply would write.
//   npx dotenv-cli -e .env.local -- npx tsx scripts/repair-late-answer-row.ts
//   npx dotenv-cli -e .env.local -- npx tsx scripts/repair-late-answer-row.ts --apply
// .env.local is the PRODUCTION database. --apply is one conditional UPDATE of
// one row; run twice, the second run finds sentAt already there and writes
// nothing.

import { PrismaClient } from "@prisma/client";
import { LATE_HARD_STOP_MS, LATE_WINDOW_MS, lateCandidateVerdict, lateTurnMeta, type LateCandidateRow } from "../src/lib/tutor-late-answer";

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

/** Three minutes either side of the minute the plan's read printed. */
const SLACK_MS = 3 * 60_000;
/** First asked 26 Sep 2026 12:03 IST (06:33 UTC). */
const ASKED_MS = Date.parse("2026-09-26T06:33:00Z");
/** Sent again 1 Oct 2026 11:19 IST (05:49 UTC). */
const RESENT_MS = Date.parse("2026-10-01T05:49:00Z");

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function ist(ms: number): string {
  const d = new Date(ms + 330 * 60_000);
  const two = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()} ${two(d.getUTCHours())}:${two(d.getUTCMinutes())}:${two(d.getUTCSeconds())} IST`;
}

type Found = {
  id: string;
  sessionId: string;
  createdAt: Date;
  metadata: unknown;
  chars: number;
  hasAccount: boolean;
  examCode: string | null;
  examCategory: string | null;
  laterAssistant: boolean;
  reAsked: boolean;
};

/** Read-only. The two "answered since" tests are the late-answer run's own (src/lib/db/tutor-late-answer.ts loadRows). */
async function find(): Promise<Found[]> {
  return prisma.$queryRaw<Found[]>`
    SELECT m.id, m."sessionId", m."createdAt", m.metadata, length(m.content)::int AS chars,
      (u.id IS NOT NULL) AS "hasAccount",
      e.code AS "examCode", e.category::text AS "examCategory",
      EXISTS (
        SELECT 1 FROM "ChatMessage" r
        WHERE r."sessionId" = m."sessionId" AND r.role = 'ASSISTANT' AND r."createdAt" > m."createdAt"
      ) AS "laterAssistant",
      EXISTS (
        SELECT 1 FROM "ChatMessage" q2
        JOIN "ChatSession" s2 ON s2.id = q2."sessionId"
        WHERE s2."userId" = s."userId" AND q2.role = 'USER' AND q2."createdAt" > m."createdAt"
          AND btrim(q2.content) = btrim(m.content)
          AND EXISTS (
            SELECT 1 FROM "ChatMessage" a2
            WHERE a2."sessionId" = q2."sessionId" AND a2.role = 'ASSISTANT' AND a2."createdAt" > q2."createdAt"
          )
      ) AS "reAsked"
    FROM "ChatMessage" m
    JOIN "ChatSession" s ON s.id = m."sessionId"
    LEFT JOIN "User" u ON u.id = s."userId"
    LEFT JOIN "Exam" e ON e.id = s."examId"
    WHERE m.role = 'USER'
      AND m."createdAt" >= ${new Date(ASKED_MS - SLACK_MS)} AND m."createdAt" <= ${new Date(ASKED_MS + SLACK_MS)}
      AND m.metadata->>'latePromised' = 'true'
      AND m.metadata->>'lateAnsweredAt' IS NULL
      AND CASE WHEN jsonb_typeof(m.metadata->'failedAt') = 'number'
        THEN (m.metadata->>'failedAt')::numeric >= ${String(RESENT_MS - SLACK_MS)}::numeric
          AND (m.metadata->>'failedAt')::numeric <= ${String(RESENT_MS + SLACK_MS)}::numeric
        ELSE FALSE END
    ORDER BY m."createdAt" ASC`;
}

function asCandidate(f: Found, metadata: unknown): LateCandidateRow {
  return {
    id: f.id,
    sessionId: f.sessionId,
    // Only its presence is judged; the account's id is never read or printed here.
    userId: f.hasAccount ? "member" : null,
    content: "",
    createdAt: new Date(f.createdAt),
    metadata,
    laterAssistant: f.laterAssistant === true,
    reAsked: f.reAsked === true,
    examCode: f.examCode ?? null,
    examCategory: f.examCategory ?? null,
  };
}

async function main() {
  const nowMs = Date.now();
  console.log(`repair-late-answer-row — ${APPLY ? "APPLY" : "dry run"} — now ${ist(nowMs)}`);
  console.log(`looking for: a member question first stored ${ist(ASKED_MS)} (±3 min), promised a late answer, not answered, last failed ${ist(RESENT_MS)} (±3 min)`);

  const found = await find();
  console.log(`rows found: ${found.length}`);
  for (const f of found) {
    const m = lateTurnMeta(f.metadata);
    console.log(
      `  row ${f.id}: stored ${ist(new Date(f.createdAt).getTime())}; failedAt ${m.failedAt != null ? ist(m.failedAt) : "none"}; ` +
        `reason ${m.failedReason ?? "none"}; promised ${m.latePromised === true}; email promised ${m.emailPromised === true}; ` +
        `late tries ${m.lateTries ?? "none"}; late claim ${m.lateClaimAt != null ? "yes" : "no"}; sentAt ${m.sentAt != null ? ist(m.sentAt) : "none"}; ` +
        `chat ${f.examCode ?? "general"}; question ${f.chars} characters; account ${f.hasAccount ? "present" : "gone"}; ` +
        `a reply after it ${f.laterAssistant ? "yes" : "no"}; asked again and answered elsewhere ${f.reAsked ? "yes" : "no"}`,
    );
  }
  if (found.length !== 1) {
    console.log(`expected exactly 1 row, found ${found.length}: nothing written.`);
    if (APPLY) process.exitCode = 1;
    return;
  }

  const f = found[0];
  const meta = lateTurnMeta(f.metadata);
  const storedMs = new Date(f.createdAt).getTime();
  const hardStopMs = storedMs + LATE_HARD_STOP_MS;
  console.log(`verdict as the row stands: ${lateCandidateVerdict(asCandidate(f, f.metadata), nowMs) ?? "candidate"}`);

  if (meta.sentAt != null) {
    console.log(`sentAt is already set (${ist(meta.sentAt)}): repaired earlier, nothing written.`);
    return;
  }
  // The re-send time is the failedAt the chat route wrote at that send. The
  // late-answer run rewrites failedAt when it gives a row back, so the value
  // is trusted only on a row the run has never held.
  const raw = f.metadata && typeof f.metadata === "object" ? (f.metadata as Record<string, unknown>) : {};
  const resentMs = meta.failedAt;
  if (resentMs == null || !Number.isSafeInteger(resentMs)) {
    console.log("failedAt is not a whole number of milliseconds: nothing written.");
    if (APPLY) process.exitCode = 1;
    return;
  }
  if (meta.lateClaimAt != null || meta.lateTries != null || raw.lateFailedReason != null) {
    console.log("the late-answer run has held this row (a claim, a try or a late failure is recorded), so failedAt may be the run's own time, not the student's send: nothing written.");
    if (APPLY) process.exitCode = 1;
    return;
  }

  const windowEndMs = Math.min(resentMs + LATE_WINDOW_MS, hardStopMs);
  const after = lateCandidateVerdict(asCandidate(f, { ...raw, sentAt: resentMs }), nowMs);
  console.log(`would write: metadata.sentAt = ${resentMs} (${ist(resentMs)}), nothing else`);
  console.log(`verdict with that sentAt: ${after ?? "candidate"}`);
  console.log(`the run would pick it until ${ist(windowEndMs)} (72 hours after the re-send, or 7 days after the row was stored — ${ist(hardStopMs)} — whichever is first)`);
  if (after !== null) {
    console.log(
      after === "outside-window"
        ? "the 7-day hard stop has passed: sentAt would not make this row a candidate. Nothing written. Answering it now needs a founder decision, not this script."
        : `with sentAt the row would still be skipped (${after}): nothing written.`,
    );
    if (APPLY) process.exitCode = 1;
    return;
  }
  console.log("the live run reads sentAt only once the 2 Oct 2026 window change is deployed; until then the row stays outside the window.");
  if (!APPLY) {
    console.log("dry run — re-run with --apply to write that one field.");
    return;
  }

  // One conditional write: only while the row is still exactly as it was read.
  const n = await prisma.$executeRaw`
    UPDATE "ChatMessage"
    SET metadata = metadata || jsonb_build_object('sentAt', ${String(resentMs)}::bigint)
    WHERE id = ${f.id} AND role = 'USER'
      AND metadata->>'sentAt' IS NULL
      AND metadata->>'lateAnsweredAt' IS NULL
      AND metadata->>'lateClaimAt' IS NULL
      AND metadata->>'lateTries' IS NULL
      AND metadata->>'latePromised' = 'true'
      AND metadata->>'failedAt' = ${String(resentMs)}`;
  if (n === 1) {
    console.log(`updated 1 row: ${f.id} now carries sentAt. It is a candidate for the late-answer run from its next pass (with the window change live) until ${ist(windowEndMs)}; this script asked no model.`);
  } else {
    console.log(`updated ${n} rows: the row changed after it was read. Nothing else was written; run the dry run again.`);
    process.exitCode = 1;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
