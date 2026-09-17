// Local / production check (14 Sep 2026) for study groups against BASE. Exercises the storage rules directly
// (create, join, rejoin, leave, caps, the weekly board) and the public surfaces (invite page for a visitor who is
// not signed in, 404s, attribution cookie, 401s). Members are the founder's own account (looked up by email)
// plus made-up user ids that have no User row; every group this script makes is deleted at the end and the
// tables must end where they started.
import { prisma } from "@/lib/db/prisma";
import { createGroup, findGroup, isMember, joinGroup, leaveGroup, loadStudyGroupBoards } from "@/lib/study-group-db";
import { GROUP_MAX_MEMBERS, USER_MAX_GROUPS } from "@/lib/study-group";

const BASE = process.env.BASE ?? "http://localhost:3007";
const FOUNDER_EMAIL = "venumuvva@gmail.com";
const UA = { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0 shishya-study-group-check" };
const made: string[] = []; // tokens
let failures = 0;
const check = (ok: boolean, what: string) => {
  console.log(`${ok ? "  ok  " : "  FAIL"} ${what}`);
  if (!ok) failures++;
};
const counts = async () =>
  (
    await prisma.$queryRaw<{ g: number; m: number }[]>`
      SELECT (SELECT COUNT(*)::int FROM "StudyGroup") AS g, (SELECT COUNT(*)::int FROM "StudyGroupMember") AS m`
  )[0];

async function main() {
  const before = await counts();
  console.log(`before: StudyGroup ${before.g}, StudyGroupMember ${before.m}`);
  const founder = (await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "User" WHERE email = ${FOUNDER_EMAIL} LIMIT 1`)[0];
  if (!founder) throw new Error("founder account not found");

  // Storage rules
  check((await createGroup(founder.id, "🎯 !!!")).ok === false, "a name with no letters or digits is refused");
  const g = await createGroup(founder.id, "  Shishya   check group 🎯 ");
  if (!g.ok) throw new Error(`create failed: ${JSON.stringify(g)}`);
  made.push(g.token);
  const found = await findGroup(g.token);
  check(found?.name === "Shishya check group" && found.members === 1, "created with a clean name and its maker as the only member");
  check((await joinGroup(founder.id, g.token)).ok && (await findGroup(g.token))?.members === 1, "joining again as a member changes nothing");
  const ghost = "sg-check-no-user-1";
  check((await joinGroup(ghost, g.token)).ok && (await findGroup(g.token))?.members === 2, "a second member joins");
  const boards = await loadStudyGroupBoards(founder.id);
  const board = boards.find((b) => b.token === g.token);
  console.log(`  board rows: ${JSON.stringify(board?.rows.map((r) => ({ rank: r.rank, named: !!r.name, days: r.days, questions: r.questions, you: r.isYou, new: r.isNew })))}`);
  check(!!board && board.rows.length === 1 && board.rows[0].isYou && board.rows[0].isNew, "board lists the founder (new, you); a member with no account row is not shown");
  check((await leaveGroup(ghost, g.token)).ok && !(await isMember(found!.id, ghost)) && (await findGroup(g.token))?.members === 1, "leaving removes the member");
  check((await joinGroup(ghost, g.token)).ok && (await findGroup(g.token))?.members === 2, "rejoining after leaving works");
  check((await joinGroup(founder.id, "AAAAAAAAAA")).ok === false, "unknown token → not found");

  // Caps (made-up users only)
  const capUser = "sg-check-no-user-cap";
  for (let i = 0; i < USER_MAX_GROUPS; i++) {
    const r = await createGroup(capUser, `Cap check ${i + 1}`);
    if (r.ok) made.push(r.token);
  }
  const over = await createGroup(capUser, "One too many");
  if (over.ok) made.push(over.token);
  check(!over.ok && over.error === "limit", `an ${USER_MAX_GROUPS + 1}th group for one student → limit`);
  check((await joinGroup(capUser, g.token)).ok === false, "joining past the per-student cap → refused");
  const fullGroup = made[1];
  const fullRow = (await findGroup(fullGroup))!;
  for (let i = 0; i < GROUP_MAX_MEMBERS - 1; i++) {
    await prisma.$executeRaw`INSERT INTO "StudyGroupMember" (id, "groupId", "userId", "joinedAt") VALUES (${`sg-check-m-${i}`}, ${fullRow.id}, ${`sg-check-no-user-m${i}`}, NOW())`;
  }
  check((await findGroup(fullGroup))?.members === GROUP_MAX_MEMBERS, `a group can hold ${GROUP_MAX_MEMBERS}`);
  const late = await joinGroup("sg-check-no-user-late", fullGroup);
  check(!late.ok && late.error === "full", "joining a full group → full");

  // Public surfaces
  const page = await fetch(`${BASE}/g/${g.token}`, { headers: UA });
  const html = await page.text();
  check(page.status === 200, `invite page → 200 (got ${page.status})`);
  check(html.includes("Shishya check group") && html.includes("Members: 2"), "invite page shows the group's name and member count");
  check(html.includes(`/login?callbackUrl=${encodeURIComponent(`/g/${g.token}`)}`), "not signed in → sign-in link that returns to the invite");
  check(/<meta name="robots" content="noindex, ?nofollow"/.test(html), "invite page is noindex, nofollow");
  check(!html.includes("sg-check-no-user"), "no member id leaks into the page");
  check((await fetch(`${BASE}/g/AAAAAAAAAA`, { headers: UA })).status === 404, "unknown token → 404");
  check((await fetch(`${BASE}/g/not-a-token`, { headers: UA })).status === 404, "malformed token → 404");
  const tagged = await fetch(`${BASE}/g/${g.token}?utm_source=whatsapp&utm_medium=share&utm_campaign=study-group`, { headers: UA, redirect: "manual" });
  const setCookie = tagged.headers.get("set-cookie") ?? "";
  console.log(`  set-cookie on a tagged invite landing: ${setCookie.slice(0, 160) || "(none)"}`);
  check(/whatsapp/.test(decodeURIComponent(setCookie)), "a tagged invite landing records the attribution cookie");
  for (const p of ["/api/study-groups", `/api/study-groups/${g.token}/join`, `/api/study-groups/${g.token}/leave`]) {
    const r = await fetch(`${BASE}${p}`, { method: "POST", headers: { "content-type": "application/json", ...UA }, body: JSON.stringify({ name: "x" }) });
    check(r.status === 401, `POST ${p} without a session → 401 (got ${r.status})`);
  }
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`, { headers: UA })).text();
  check(!sitemap.includes("/g/"), "sitemap has no /g/ URLs");
}

main()
  .catch((e) => {
    console.error(e);
    failures++;
  })
  .finally(async () => {
    const ids = (await prisma.$queryRaw<{ id: string }[]>`SELECT id FROM "StudyGroup" WHERE token = ANY(${made})`).map((r) => r.id);
    const m = ids.length ? await prisma.$executeRaw`DELETE FROM "StudyGroupMember" WHERE "groupId" = ANY(${ids})` : 0;
    const g = ids.length ? await prisma.$executeRaw`DELETE FROM "StudyGroup" WHERE id = ANY(${ids})` : 0;
    const after = await counts();
    console.log(`cleanup: deleted ${g} groups, ${m} memberships; after: StudyGroup ${after.g}, StudyGroupMember ${after.m}`);
    console.log(failures ? `${failures} FAILED` : "all checks passed");
    await prisma.$disconnect();
  });
