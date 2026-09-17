// Local release check for Challenge a friend (14 Sep 2026). Needs the production build served on :3007
// (.env.local = production database). Takes a real validated question set, exercises the API and pages over
// HTTP the way a phone would, checks the mock slice through the library (the route needs a signed-in session),
// then deletes every Challenge / ChallengePlay / ChallengeWatch row it made. Server-side fetches run no page JS,
// so no analytics rows are written. Nothing here plays a challenge whose creator is a real account, so no
// email or push goes to anyone.
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const BASE = process.env.BASE ?? "http://127.0.0.1:3007";
const made: string[] = [];
let fails = 0;

function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail && !ok ? ` — ${detail}` : ""}`);
  if (!ok) fails++;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const key = () => Array.from({ length: 32 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join("");

async function post(path: string, body: unknown, headers: Record<string, string> = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json().catch(() => ({}))) as any };
}

async function main() {
  const exam = await prisma.exam.findUnique({ where: { code: "SSC_GD" }, select: { id: true, code: true, shortName: true, active: true } });
  if (!exam?.active) throw new Error("SSC_GD is not active");
  const qs = await prisma.question.findMany({
    where: { examId: exam.id, validated: true, type: "MCQ" },
    select: { id: true, answerKey: true, options: true },
    take: 5,
  });
  if (qs.length < 5) throw new Error("not enough questions");
  const ids = qs.map((q) => q.id);
  const wrong = (q: (typeof qs)[number]) => (q.options as { key: string }[]).find((o) => o.key !== q.answerKey)?.key ?? null;
  const creatorChoices = [qs[0].answerKey, qs[1].answerKey, qs[2].answerKey, wrong(qs[3]), null];
  const friendChoices = [qs[0].answerKey, qs[1].answerKey, qs[2].answerKey, qs[3].answerKey, wrong(qs[4])];

  // 1. A challenge from a quiz result.
  const c1 = await post("/api/challenge", { source: "quiz", examCode: exam.code, questionIds: ids, choices: creatorChoices, name: "  Ravi " });
  const token = c1.json.token as string;
  const creatorKey = c1.json.creatorKey as string;
  if (token) made.push(token);
  check("create from a quiz → 200", c1.status === 200, JSON.stringify(c1.json).slice(0, 200));
  check("creator score graded on the server (3/5)", c1.json.creatorCorrect === 3 && c1.json.questionCount === 5, JSON.stringify(c1.json));
  check("token and key shapes", /^[A-HJ-NP-Za-km-z2-9]{10}$/.test(token ?? "") && /^[A-HJ-NP-Za-km-z2-9]{32}$/.test(creatorKey ?? ""));
  const row = await prisma.$queryRaw<{ creatorName: string | null; creatorKeyHash: string; questionIds: string[]; expiresAt: Date; createdAt: Date }[]>`
    SELECT "creatorName", "creatorKeyHash", "questionIds", "expiresAt", "createdAt" FROM "Challenge" WHERE id = ${token}`;
  check("name trimmed", row[0]?.creatorName === "Ravi", JSON.stringify(row[0]?.creatorName));
  check("creator key stored only as a hash", !!row[0] && row[0].creatorKeyHash.length === 64 && row[0].creatorKeyHash !== creatorKey);
  check("question ids stored in order (text[] parameter)", JSON.stringify(row[0]?.questionIds) === JSON.stringify(ids), JSON.stringify(row[0]?.questionIds));
  const days = row[0] ? (new Date(row[0].expiresAt).getTime() - new Date(row[0].createdAt).getTime()) / 86_400_000 : 0;
  check("expires 30 days after creation", Math.abs(days - 30) < 0.001, String(days));

  // 2. The landing page and its preview card.
  const page = await fetch(`${BASE}/c/${token}`);
  const html = await page.text();
  check("landing → 200", page.status === 200, String(page.status));
  check("landing is noindex, nofollow", /<meta name="robots" content="noindex, nofollow"/.test(html));
  check("title carries the score to beat", html.includes(`<title>Ravi scored 3/5 on 5 ${exam.shortName} questions — can you beat it? | Shishya</title>`));
  check("headline rendered", html.includes(`Ravi scored 3/5 on 5 ${exam.shortName} questions`));
  check("og:image is the challenge card", new RegExp(`property="og:image" content="[^"]*/c/${token}/opengraph-image`).test(html));
  const og = await fetch(`${BASE}/c/${token}/opengraph-image`);
  const ogBytes = Buffer.from(await og.arrayBuffer()).length;
  check("preview card renders as PNG", og.status === 200 && (og.headers.get("content-type") ?? "").includes("image/png") && ogBytes > 5000, `${og.status} ${og.headers.get("content-type")} ${ogBytes} B`);

  // 2b. Language: a challenge made on a Hindi page opens in Hindi for a friend with no language cookie.
  const hiC = await post("/api/challenge", { source: "quiz", examCode: exam.code, questionIds: ids, choices: creatorChoices, name: "Ravi", locale: "hi" });
  if (hiC.json.token) made.push(hiC.json.token);
  const hiRow = await prisma.$queryRaw<{ locale: string | null }[]>`SELECT locale FROM "Challenge" WHERE id = ${hiC.json.token ?? ""}`;
  check("page language stored on the challenge", hiRow[0]?.locale === "hi", JSON.stringify(hiRow[0]));
  const hiHtml = await (await fetch(`${BASE}/c/${hiC.json.token}`)).text();
  check(
    "Hindi challenge renders in Hindi without a cookie (title + headline)",
    hiHtml.includes(`<title>Ravi ने 5 ${exam.shortName} सवालों में 3/5 सही किए — क्या आप इससे ज़्यादा ला सकते हैं? | Shishya</title>`) &&
      hiHtml.includes("क्या आप इससे ज़्यादा ला सकते हैं?") &&
      hiHtml.includes("5 सवाल शुरू करें"),
  );
  const cookieHtml = await (await fetch(`${BASE}/c/${hiC.json.token}`, { headers: { cookie: "shishya-lang=te" } })).text();
  check("a visitor's own language cookie wins (Telugu)", cookieHtml.includes("మీరు మించగలరా?"));
  const xx = await post("/api/challenge", { source: "quiz", examCode: exam.code, questionIds: ids, choices: creatorChoices, locale: "xx" });
  if (xx.json.token) made.push(xx.json.token);
  const xxRow = await prisma.$queryRaw<{ locale: string | null }[]>`SELECT locale FROM "Challenge" WHERE id = ${xx.json.token ?? ""}`;
  check("an unknown language is not stored", xx.status === 200 && xxRow[0]?.locale === null, JSON.stringify(xxRow[0]));

  // 3. Who can see the scores.
  const noKey = await fetch(`${BASE}/api/challenge/${token}/plays`);
  check("scores without the creator key → 403", noKey.status === 403, String(noKey.status));
  const badKey = await fetch(`${BASE}/api/challenge/${token}/plays`, { headers: { "x-challenge-key": key() } });
  check("scores with a wrong key → 403", badKey.status === 403, String(badKey.status));
  const v0 = await fetch(`${BASE}/api/challenge/${token}/plays`, { headers: { "x-challenge-key": creatorKey } });
  const v0j = (await v0.json().catch(() => ({}))) as any;
  check("scores with the key → 200, none yet", v0.status === 200 && Array.isArray(v0j.plays) && v0j.plays.length === 0, JSON.stringify(v0j).slice(0, 200));

  // 4. A friend plays (4/5) and sends the score.
  const friendKey = key();
  const p1 = await post(`/api/challenge/${token}/play`, { playerKey: friendKey, choices: friendChoices, name: "Anu" });
  check("friend's play stored, graded 4/5 vs 3/5", p1.status === 200 && p1.json.stored === true && p1.json.correct === 4 && p1.json.creatorCorrect === 3 && p1.json.total === 5, JSON.stringify(p1.json));
  const again = await post(`/api/challenge/${token}/play`, { playerKey: friendKey, choices: [null, null, null, null, null], name: "Anu" });
  check("same browser again → first score kept", again.status === 200 && again.json.stored === false && again.json.correct === 4, JSON.stringify(again.json));
  const inflated = await post(`/api/challenge/${token}/play`, { playerKey: key(), choices: ["Z", "Z", "Z", "Z", "Z"] });
  check("a made-up tally scores what the key says (0/5)", inflated.status === 200 && inflated.json.correct === 0, JSON.stringify(inflated.json));
  const v1 = await fetch(`${BASE}/api/challenge/${token}/plays`, { headers: { "x-challenge-key": creatorKey } });
  const v1j = (await v1.json().catch(() => ({}))) as any;
  check("scores list both plays, newest first", v1.status === 200 && v1j.plays?.length === 2 && v1j.plays[1]?.name === "Anu" && v1j.plays[1]?.correct === 4 && v1j.plays[0]?.name === null, JSON.stringify(v1j.plays));
  const stamps = await prisma.$queryRaw<{ lastPushAt: Date | null; lastEmailAt: Date | null }[]>`
    SELECT "lastPushAt", "lastEmailAt" FROM "Challenge" WHERE id = ${token}`;
  check("anonymous challenger with no phone on → no notification slot taken", stamps[0]?.lastPushAt === null && stamps[0]?.lastEmailAt === null, JSON.stringify(stamps[0]));

  // 5. The chain: the friend challenges their own friends with the same questions.
  const c2 = await post("/api/challenge", { source: "challenge", parentToken: token, choices: friendChoices, name: "Anu" });
  if (c2.json.token) made.push(c2.json.token);
  check("chain → a new link with the friend's 4/5", c2.status === 200 && c2.json.creatorCorrect === 4 && c2.json.token !== token, JSON.stringify(c2.json).slice(0, 200));
  const chain = await prisma.$queryRaw<{ source: string; sourceRef: string | null; questionIds: string[] }[]>`
    SELECT source, "sourceRef", "questionIds" FROM "Challenge" WHERE id = ${c2.json.token ?? ""}`;
  check("chain keeps the questions and points at its parent", chain[0]?.source === "challenge" && chain[0]?.sourceRef === token && JSON.stringify(chain[0]?.questionIds) === JSON.stringify(ids));

  // 6. Refusals.
  const foreign = await prisma.question.findFirst({ where: { examId: { not: exam.id }, validated: true, type: "MCQ" }, select: { id: true } });
  const r1 = await post("/api/challenge", { source: "quiz", examCode: exam.code, questionIds: [...ids.slice(0, 4), foreign?.id ?? "x".repeat(25)], choices: creatorChoices });
  check("a question from another exam → 422", r1.status === 422, String(r1.status));
  const r2 = await post("/api/challenge", { source: "quiz", examCode: exam.code, questionIds: ids.slice(0, 3), choices: [] });
  check("fewer than 5 questions → 400", r2.status === 400, String(r2.status));
  const r3 = await post("/api/challenge", { source: "mock", attemptId: "cmaaaaaaaaaaaaaaaaaaaaaaa" });
  check("mock challenge without sign-in → 401", r3.status === 401, String(r3.status));
  const r4 = await fetch(`${BASE}/c/Zz23456789`);
  check("unknown token → 404", r4.status === 404, String(r4.status));
  const r5 = await fetch(`${BASE}/c/not-a-token`);
  check("malformed token → 404", r5.status === 404, String(r5.status));
  const sub = (endpoint: string) => ({ subscription: { endpoint, keys: { p256dh: "x".repeat(40), auth: "y".repeat(16) } } });
  const w1 = await post(`/api/challenge/${token}/watch`, sub("https://fcm.googleapis.com/fcm/send/verify-only"));
  check("phone notifications without the creator key → refused", [403, 503].includes(w1.status), String(w1.status));
  const w2 = await post(`/api/challenge/${token}/watch`, sub("https://push.example.com/verify-only"), { "x-challenge-key": creatorKey });
  check("push endpoint outside the allowed services → refused", [400, 503].includes(w2.status), String(w2.status));

  // 7. Mock slice through the library.
  const attempt = await prisma.attempt.findFirst({
    where: { status: "SUBMITTED", finishedAt: { not: null } },
    orderBy: { finishedAt: "desc" },
    select: { id: true, userId: true, answers: true, mock: { select: { questionIds: true, examId: true } } },
  });
  if (attempt?.mock) {
    const { createChallenge } = await import("../src/lib/challenge-db");
    const m = await createChallenge({ source: "mock", attemptId: attempt.id, name: null, locale: null }, { userId: attempt.userId, anonId: null });
    if (m.ok) made.push(m.token);
    const eligible = await prisma.question.findMany({
      where: { id: { in: attempt.mock.questionIds }, examId: attempt.mock.examId, validated: true, type: "MCQ" },
      select: { id: true },
    });
    const set = new Set(eligible.map((e) => e.id));
    const ordered = attempt.mock.questionIds.filter((id) => set.has(id));
    if (ordered.length < 5) {
      check("mock with too few playable questions → refused", !m.ok, JSON.stringify(m));
    } else if (m.ok) {
      const expected = ordered.length <= 10 ? ordered : Array.from({ length: 10 }, (_, i) => ordered[Math.floor((i * ordered.length) / 10)]);
      const mr = await prisma.$queryRaw<{ questionIds: string[]; creatorCorrect: number; source: string; sourceRef: string | null }[]>`
        SELECT "questionIds", "creatorCorrect", source, "sourceRef" FROM "Challenge" WHERE id = ${m.token}`;
      const answers = new Map(((attempt.answers as { questionId?: string; correct?: boolean }[]) ?? []).map((a) => [a?.questionId, a]));
      check(`mock slice: ${expected.length} evenly spaced of ${ordered.length} playable, in mock order`, JSON.stringify(mr[0]?.questionIds) === JSON.stringify(expected));
      check("mock score = correct answers on the slice (skips not correct)", mr[0]?.creatorCorrect === expected.filter((id) => answers.get(id)?.correct === true).length, `${mr[0]?.creatorCorrect}`);
      check("mock row points at the attempt", mr[0]?.source === "mock" && mr[0]?.sourceRef === attempt.id);
    } else {
      check("mock challenge created", false, JSON.stringify(m));
    }
    const other = await createChallenge({ source: "mock", attemptId: attempt.id, name: null, locale: null }, { userId: "not-the-owner", anonId: null });
    check("someone else's attempt → 404", !other.ok && other.status === 404, JSON.stringify(other));
  } else {
    console.log("SKIP  no submitted attempt found for the mock slice check");
  }
}

main()
  .catch((e) => {
    console.error("ERROR", e);
    fails++;
  })
  .finally(async () => {
    if (made.length > 0) {
      const plays = await prisma.$executeRaw`DELETE FROM "ChallengePlay" WHERE "challengeId" = ANY(${made})`;
      const watches = await prisma.$executeRaw`DELETE FROM "ChallengeWatch" WHERE "challengeId" = ANY(${made})`;
      const challenges = await prisma.$executeRaw`DELETE FROM "Challenge" WHERE id = ANY(${made})`;
      console.log(`cleanup: deleted ${challenges} challenges, ${plays} plays, ${watches} watches`);
    }
    const left = await prisma.$queryRaw<{ c: number; p: number; w: number }[]>`
      SELECT (SELECT COUNT(*) FROM "Challenge")::int AS c, (SELECT COUNT(*) FROM "ChallengePlay")::int AS p, (SELECT COUNT(*) FROM "ChallengeWatch")::int AS w`;
    console.log(`rows left: Challenge ${left[0].c}, ChallengePlay ${left[0].p}, ChallengeWatch ${left[0].w}`);
    console.log(fails === 0 ? "ALL CHECKS PASSED" : `${fails} CHECK(S) FAILED`);
    await prisma.$disconnect();
    process.exit(fails === 0 ? 0 : 1);
  });
