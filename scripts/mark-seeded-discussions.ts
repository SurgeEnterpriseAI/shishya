// Marks the 34 discussion threads written by seed/discussions*.ts (7–9 May 2026) as Shishya's own:
// isSeed = TRUE. UPDATE only. Deletes nothing; changes no title, name, text, count or date.
// Dry run:  npx tsx --env-file=.env.local scripts/mark-seeded-discussions.ts
// Write:    npx tsx --env-file=.env.local scripts/mark-seeded-discussions.ts --apply
// Undo:     UPDATE "Discussion" SET "isSeed" = FALSE WHERE id = ANY(<the 34 ids>);
import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
export {};
const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");
const IDS: string[] = [
  "cmoyhvg41001fklilx9f83ywu",
  "cmoyhvfx60019kliltuzpkenq",
  "cmoyhvfr30013klilbj76nuoa",
  "cmoyj7sgt003510lt8znri1yk",
  "cmoyhvfku000xklil4mbwzk2y",
  "cmoyj7saj002z10ltgk2c8dqe",
  "cmoyj7s35002r10lt7or6wu6e",
  "cmoyhvfdf000pkliln0e9vavp",
  "cmoyj7rx2002l10ltj97l1ss9",
  "cmoyj7rqz002f10ltea2ku25u",
  "cmoyhvf5s000hklilma2ld38p",
  "cmoyj7rkr002910ltejifituq",
  "cmoyhveyj0009klil9fpzqzsy",
  "cmoyj7rcq002110ltq9xisztr",
  "cmoyj7r6l001v10ltmkal6btj",
  "cmoyj7qzb001n10ltp9wtr1f9",
  "cmoyhven60001klilvfihsoi3",
  "cmoyj7qt6001h10lte25d2560",
  "cmoyj7qmy001b10ltu6ulxjde",
  "cmoyj7qgc001510ltldjju17h",
  "cmoyj7qa3000z10lt5wb8w4o2",
  "cmoyj7q3n000t10ltlsyl8wg5",
  "cmoyj7pw3000l10ltppq9kgrg",
  "cmoyj7ppu000f10ltqa4pyj59",
  "cmoyj7pi3000710ltg6zdx6jq",
  "cmoyj7p79000110ltdhsem2fg",
  "cmoykr5wz003hrxwbllbgve2c",
  "cmoykr5pe0039rxwbn0308u2k",
  "cmoykr5hq0031rxwbaqupknay",
  "cmoykr55l002prxwb9gxeeukt",
  "cmoykr4xv002hrxwbhr7evw5x",
  "cmoykr4q80029rxwbvd2kijph",
  "cmoykr4jw0023rxwbnuai7m3p",
  "cmoykr4b2001xrxwbf1ayufyh",
];
const BEFORE = new Date("2026-05-10T00:00:00.000Z");

async function main() {
  if (IDS.length !== 34 || new Set(IDS).size !== 34) throw new Error("the id list must hold 34 distinct ids");
  const rows = await prisma.$queryRaw<Array<{ id: string; title: string; isSeed: boolean; authorId: string | null; topicCode: string | null; createdAt: Date; msgs: number; userMsgs: number }>>`
    SELECT d.id, d.title, d."isSeed", d."authorId", d."topicCode", d."createdAt",
           (SELECT COUNT(*)::int FROM "DiscussionMessage" m WHERE m."threadId" = d.id) AS msgs,
           (SELECT COUNT(*)::int FROM "DiscussionMessage" m WHERE m."threadId" = d.id AND m."authorId" IS NOT NULL) AS "userMsgs"
    FROM "Discussion" d WHERE d.id = ANY(${IDS}::text[])`;
  const stray = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id FROM "Discussion"
    WHERE "authorId" IS NULL AND "isSeed" = FALSE AND "topicCode" IS NULL AND NOT (id = ANY(${IDS}::text[]))`;
  const problems: string[] = [];
  if (rows.length !== 34) problems.push(`found ${rows.length} of 34 rows`);
  for (const r of rows) {
    if (r.authorId !== null) problems.push(`${r.id}: has a user account`);
    if (r.topicCode !== null) problems.push(`${r.id}: is a study room`);
    if (r.createdAt >= BEFORE) problems.push(`${r.id}: created ${r.createdAt.toISOString()}, not in May`);
    if (r.userMsgs > 0) problems.push(`${r.id}: holds ${r.userMsgs} message(s) from a real account`);
  }
  if (stray.length) problems.push(`platform-written, unmarked rows outside the list: ${stray.map((s) => s.id).join(", ")}`);
  const todo = rows.filter((r) => !r.isSeed);
  for (const r of rows) console.log(`${r.isSeed ? "already" : "to mark"}  ${r.id}  ${r.msgs} msgs  ${r.title}`);
  console.log(`rows ${rows.length} · messages ${rows.reduce((a, r) => a + r.msgs, 0)} · to mark ${todo.length}`);
  if (problems.length) { console.error("STOP — nothing written:\n  " + problems.join("\n  ")); process.exit(1); }
  if (!APPLY) { console.log("DRY RUN — nothing written. Add --apply to write."); return; }
  fs.writeFileSync(`${process.env.SEED_BACKUP_DIR ?? require("node:os").tmpdir()}/seeded-discussions-before-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(rows, null, 2));
  const n = await prisma.$executeRaw`
    UPDATE "Discussion" SET "isSeed" = TRUE
    WHERE id = ANY(${IDS}::text[]) AND "authorId" IS NULL AND "topicCode" IS NULL AND "isSeed" = FALSE`;
  console.log(`updated ${n} row(s)`);
  if (n !== todo.length) throw new Error(`expected ${todo.length}`);
  const after = await prisma.$queryRaw<Array<{ seeded: number; total: number }>>`
    SELECT COUNT(*) FILTER (WHERE "isSeed")::int AS seeded, COUNT(*)::int AS total FROM "Discussion"`;
  console.log("after:", after[0]); // expected today: { seeded: 42, total: 42 }
}
main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
