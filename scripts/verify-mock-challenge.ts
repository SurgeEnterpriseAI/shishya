// Production check for mock challenges (16 Sep 2026). WRITES TO PRODUCTION
// (.env.local = the production database) — run only with the founder's
// approval. Never uses another user's attempt: it takes the founder
// account's newest finished attempt that can make a challenge (and that has
// no challenge yet, so every row it touches is its own).
//
//   npx dotenv-cli -e .env.local -- npx tsx scripts/verify-mock-challenge.ts
//       create → the same link on a second tap (reused, no key, the name
//       that tap sent; a cleared name clears it) → a direct library call
//       without reuseExisting gets its own row → the maker's view by session
//       → one anonymous friend play (10 skips) → a self-play refusal. No
//       email: notifyChallengeCreator is not called.
//   ... verify-mock-challenge.ts --email
//       also runs notifyChallengeCreator: claims lastEmailAt and sends ONE
//       'challenge-play' email to the founder (sendEmail needs RESEND_API_KEY;
//       without it the send is a logged STUB and no EmailTouch row is written).
//       The first send of the tag in this process may also send a
//       '[wave: challenge-play]' copy to any other FOUNDER_BCC address.
//   ... verify-mock-challenge.ts --cleanup-touches <ISO start printed by the --email run>
//       the next day, after Resend's webhook has settled: deletes the
//       founder's sent:/delivered:/open:/click:challenge-play EmailTouch rows
//       from that start on.
//
// Cleanup at the end of every run (also on failure): the Challenge rows it
// made (guarded by source 'mock', the attempt id and the founder's id), their
// ChallengePlay / ChallengeWatch rows, and — with --email — the
// 'sent:challenge-play' EmailTouch rows written during the run. It makes no
// HTTP requests, so no AnalyticsEvent or rate-limit rows. Not deletable:
// Resend's own send log.

import { prisma } from "../src/lib/db/prisma";
import { CHALLENGE_TOKEN_RE, mockChallengeEligible, mockSlice, newChallengeKey, playableMockIds } from "../src/lib/challenge";
import { challengeCreatorView, createChallenge, notifyChallengeCreator, recordChallengePlay } from "../src/lib/challenge-db";

const FOUNDER_EMAIL = process.env.FOUNDER_EMAIL ?? "venumuvva@gmail.com";
const TOUCH_TAGS = ["sent:challenge-play", "delivered:challenge-play", "open:challenge-play", "click:challenge-play"];

const args = process.argv.slice(2);
const withEmail = args.includes("--email");
const cleanupIdx = args.indexOf("--cleanup-touches");

let fails = 0;
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail && !ok ? ` — ${detail}` : ""}`);
  if (!ok) fails++;
}

async function counts() {
  const r = await prisma.$queryRaw<{ c: number; p: number; w: number }[]>`
    SELECT (SELECT COUNT(*) FROM "Challenge")::int AS c,
           (SELECT COUNT(*) FROM "ChallengePlay")::int AS p,
           (SELECT COUNT(*) FROM "ChallengeWatch")::int AS w`;
  return { challenge: Number(r[0].c), play: Number(r[0].p), watch: Number(r[0].w) };
}

async function founderId(): Promise<string> {
  const u = await prisma.user.findUnique({ where: { email: FOUNDER_EMAIL }, select: { id: true } });
  if (!u) throw new Error("founder account not found (FOUNDER_EMAIL)");
  return u.id;
}

async function cleanupTouches(startIso: string) {
  const start = new Date(startIso);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(startIso) || !Number.isFinite(start.getTime())) throw new Error("--cleanup-touches needs the ISO start the --email run printed");
  const founder = await founderId();
  const n = await prisma.$executeRaw`
    DELETE FROM "EmailTouch"
    WHERE "userId" = ${founder} AND tag = ANY(${TOUCH_TAGS}) AND "sentAt" >= ${start}`;
  console.log(`deleted ${n} EmailTouch rows (${TOUCH_TAGS.join(", ")}) for the founder since ${start.toISOString()}`);
}

const made: string[] = [];
const sentTouchIds: string[] = [];
let attemptId: string | null = null;
let founder: string | null = null;
let before: Awaited<ReturnType<typeof counts>> | null = null;

async function main() {
  const me = await founderId();
  founder = me;
  console.log(`founder account: ${me.slice(0, 6)}…`);

  // The founder's newest finished attempt that can make a challenge and has none yet.
  const attempts = await prisma.attempt.findMany({
    where: { userId: me, status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
    take: 20,
    select: {
      id: true,
      finishedAt: true,
      answers: true,
      mock: { select: { examId: true, questionIds: true, exam: { select: { code: true, active: true } } } },
    },
  });
  let pick: (typeof attempts)[number] | null = null;
  let playable: string[] = [];
  for (const a of attempts) {
    if (!a.mock) continue;
    const qs = await prisma.question.findMany({
      where: { id: { in: a.mock.questionIds } },
      select: { id: true, examId: true, validated: true, type: true },
    });
    const byId = new Map(qs.map((q) => [q.id, q]));
    if (!mockChallengeEligible({ examActive: a.mock.exam.active, examId: a.mock.examId, questionIds: a.mock.questionIds, byId })) continue;
    const existing = await prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM "Challenge" WHERE source = 'mock' AND "sourceRef" = ${a.id} AND "creatorUserId" = ${me}`;
    if (Number(existing[0]?.n ?? 0) > 0) continue;
    pick = a;
    playable = playableMockIds(a.mock.questionIds, byId, a.mock.examId);
    break;
  }
  if (!pick?.mock) throw new Error("no eligible founder attempt without a challenge in the newest 20");
  attemptId = pick.id;
  const slice = mockSlice(playable) ?? [];
  const answers = new Map(((pick.answers as { questionId?: string; correct?: boolean }[] | null) ?? []).map((a) => [a?.questionId, a]));
  const expectedCorrect = slice.filter((id) => answers.get(id)?.correct === true).length;
  console.log(
    `attempt ${pick.id}: ${pick.mock.exam.code}, ${pick.mock.questionIds.length} questions, ${playable.length} playable → slice of ${slice.length}, finished ${pick.finishedAt?.toISOString()}`,
  );

  before = await counts();
  const startRow = await prisma.$queryRaw<{ now: Date }[]>`SELECT NOW() AS now`;
  const start = new Date(startRow[0].now);
  console.log(`before: Challenge ${before.challenge}, ChallengePlay ${before.play}, ChallengeWatch ${before.watch}`);
  console.log(`start (for --cleanup-touches): ${start.toISOString()}`);

  // 1. Make the link, as the results card does for the signed-in maker.
  const who = { userId: me, anonId: null };
  const c1 = await createChallenge({ source: "mock", attemptId: pick.id, name: null, locale: "en", reuseExisting: true }, who);
  if (c1.ok) made.push(c1.token);
  console.log(
    "created:",
    JSON.stringify(c1.ok ? { ...c1, creatorKey: c1.creatorKey ? `<${c1.creatorKey.length} chars, not printed>` : null } : c1),
  );
  if (!c1.ok) throw new Error("create failed");
  check("token shape", CHALLENGE_TOKEN_RE.test(c1.token));
  check("a new link with a creator key", c1.reused === false && typeof c1.creatorKey === "string" && c1.creatorKey.length === 32);
  check(`question count = slice (${slice.length})`, c1.questionCount === slice.length, String(c1.questionCount));
  const row = await prisma.$queryRaw<
    { source: string; sourceRef: string | null; creatorUserId: string | null; questionIds: string[]; creatorCorrect: number; locale: string | null; createdAt: Date; expiresAt: Date }[]
  >`
    SELECT source, "sourceRef", "creatorUserId", "questionIds", "creatorCorrect", locale, "createdAt", "expiresAt"
    FROM "Challenge" WHERE id = ${c1.token}`;
  const r = row[0];
  console.log(
    "row:",
    JSON.stringify(r ? { ...r, creatorUserId: r.creatorUserId ? `${r.creatorUserId.slice(0, 6)}…` : null, questionIds: `${r.questionIds.length} ids` } : null),
  );
  check("row: source mock, points at the attempt, made by the founder", r?.source === "mock" && r?.sourceRef === pick.id && r?.creatorUserId === me);
  check("row: evenly spaced playable questions in mock order", JSON.stringify(r?.questionIds) === JSON.stringify(slice));
  check(`row: maker score = correct answers on the slice (${expectedCorrect})`, Number(r?.creatorCorrect) === expectedCorrect, String(r?.creatorCorrect));
  check("row: locale en", r?.locale === "en");
  const days = r ? (new Date(r.expiresAt).getTime() - new Date(r.createdAt).getTime()) / 86_400_000 : 0;
  check("row: expires 30 days after creation", Math.abs(days - 30) < 0.001, String(days));

  // 2. A second tap on the same results page gets the same link back, with
  //    the name exactly as that tap sent it (a fixed test word, not a person).
  const nameOf = async (token: string) =>
    (await prisma.$queryRaw<{ n: string | null }[]>`SELECT "creatorName" AS n FROM "Challenge" WHERE id = ${token}`)[0]?.n ?? null;
  const c2 = await createChallenge({ source: "mock", attemptId: pick.id, name: "Check", locale: "en", reuseExisting: true }, who);
  if (c2.ok && !made.includes(c2.token)) made.push(c2.token);
  check("second tap → same token, reused, no key", c2.ok && c2.token === c1.token && c2.reused && c2.creatorKey === null, JSON.stringify(c2));
  check("second tap's typed name is stored", (await nameOf(c1.token)) === "Check");
  const c3 = await createChallenge({ source: "mock", attemptId: pick.id, name: null, locale: "en", reuseExisting: true }, who);
  if (c3.ok && !made.includes(c3.token)) made.push(c3.token);
  check("third tap with the name cleared → same link, name cleared", c3.ok && c3.token === c1.token && (await nameOf(c1.token)) === null, JSON.stringify(c3));
  const perAttempt = await prisma.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM "Challenge" WHERE source = 'mock' AND "sourceRef" = ${pick.id} AND "creatorUserId" = ${me}`;
  check("one Challenge row for the attempt", Number(perAttempt[0]?.n) === 1, String(perAttempt[0]?.n));
  // A direct library call (no reuseExisting) never hands back an existing
  // link — a script's cleanup can't delete a student's real one.
  const c4 = await createChallenge({ source: "mock", attemptId: pick.id, name: null, locale: "en" }, who);
  if (c4.ok && !made.includes(c4.token)) made.push(c4.token);
  check("without reuseExisting → its own new row with a key", c4.ok && c4.token !== c1.token && !c4.reused && typeof c4.creatorKey === "string", JSON.stringify(c4.ok ? { ...c4, creatorKey: "<not printed>" } : c4));

  // 3. The maker's view by session, without the key.
  const v1 = await challengeCreatorView(c1.token, { key: null, userId: me });
  check("maker view by session: ok, 0 scores", v1.ok && v1.plays.length === 0 && v1.fromMock, JSON.stringify(v1));

  // 4. A friend plays (anonymous, all skipped) — graded on the server.
  const play = await recordChallengePlay(
    c1.token,
    { playerKey: newChallengeKey(), choices: slice.map(() => null), name: null },
    { userId: null, anonId: null },
  );
  check(`friend play stored: 0/${slice.length}`, play.ok && play.stored && play.correct === 0 && play.total === slice.length, JSON.stringify(play));
  const self = await recordChallengePlay(c1.token, { playerKey: newChallengeKey(), choices: [], name: null }, { userId: me, anonId: null });
  check("the maker can't play their own link → 409", !self.ok && self.status === 409, JSON.stringify(self));
  const v2 = await challengeCreatorView(c1.token, { key: null, userId: me });
  check("maker view lists the one score", v2.ok && v2.plays.length === 1 && v2.plays[0].correct === 0, JSON.stringify(v2));

  // 5. Optional: the 6-hour email to a signed-in maker.
  if (withEmail) {
    await notifyChallengeCreator(c1.token);
    const after = await prisma.$queryRaw<{ lastEmailAt: Date | null }[]>`SELECT "lastEmailAt" FROM "Challenge" WHERE id = ${c1.token}`;
    check("lastEmailAt claimed", after[0]?.lastEmailAt != null);
    const touches = await prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM "EmailTouch" WHERE "userId" = ${me} AND tag = 'sent:challenge-play' AND "sentAt" >= ${start}`;
    sentTouchIds.push(...touches.map((t) => t.id));
    console.log(
      touches.length > 0
        ? `email sent: ${touches.length} 'sent:challenge-play' row(s). Tomorrow run: --cleanup-touches ${start.toISOString()}`
        : "no 'sent:challenge-play' row — without RESEND_API_KEY sendEmail is a STUB (see the log line above)",
    );
    await notifyChallengeCreator(c1.token);
    const again = await prisma.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM "EmailTouch" WHERE "userId" = ${me} AND tag = 'sent:challenge-play' AND "sentAt" >= ${start}`;
    check("a second notify within 6 h sends nothing", Number(again[0]?.n) === touches.length, String(again[0]?.n));
  }
}

async function cleanup() {
  if (made.length > 0 && founder && attemptId) {
    const plays = await prisma.$executeRaw`DELETE FROM "ChallengePlay" WHERE "challengeId" = ANY(${made})`;
    const watches = await prisma.$executeRaw`DELETE FROM "ChallengeWatch" WHERE "challengeId" = ANY(${made})`;
    const challenges = await prisma.$executeRaw`
      DELETE FROM "Challenge"
      WHERE id = ANY(${made}) AND source = 'mock' AND "sourceRef" = ${attemptId} AND "creatorUserId" = ${founder}`;
    console.log(`cleanup: deleted ${challenges} Challenge, ${plays} ChallengePlay, ${watches} ChallengeWatch`);
  }
  if (sentTouchIds.length > 0 && founder) {
    const touches = await prisma.$executeRaw`
      DELETE FROM "EmailTouch" WHERE id = ANY(${sentTouchIds}) AND "userId" = ${founder} AND tag = 'sent:challenge-play'`;
    console.log(`cleanup: deleted ${touches} EmailTouch 'sent:challenge-play' (webhook rows: --cleanup-touches tomorrow)`);
  }
  if (before) {
    const now = await counts();
    console.log(`after: Challenge ${now.challenge}, ChallengePlay ${now.play}, ChallengeWatch ${now.watch}`);
    check("row counts back to before", now.challenge === before.challenge && now.play === before.play && now.watch === before.watch, JSON.stringify({ before, now }));
  }
}

(cleanupIdx >= 0
  ? cleanupTouches(args[cleanupIdx + 1] ?? "")
  : main().finally(async () => {
      await cleanup();
      console.log(fails === 0 ? "ALL CHECKS PASSED" : `${fails} CHECK(S) FAILED`);
    }))
  .catch((e) => {
    console.error("ERROR", (e as Error)?.message ?? e);
    fails++;
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(fails === 0 ? 0 : 1);
  });
