import { prisma } from "../src/lib/db/prisma";

async function main() {
  const total = await prisma.discussion.count();
  console.log(`Discussion rows total: ${total}`);

  if (total === 0) {
    console.log("table is empty → that's why the home rail shows 'No active discussions yet.'");
    return;
  }

  const recent = await prisma.discussion.findMany({
    orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
    take: 10,
    include: { exam: { select: { code: true, shortName: true } } },
  });
  console.log(`\nTop ${recent.length} threads by lastActivityAt:`);
  for (const d of recent) {
    console.log(`  ${d.lastActivityAt.toISOString()}  pinned=${d.pinned}  ${d.exam?.shortName ?? '-'}  ${d.messageCount} msgs  "${d.title.slice(0, 60)}"  by ${d.authorName}`);
  }

  const msgs = await prisma.discussionMessage.count();
  console.log(`\nDiscussionMessage rows total: ${msgs}`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
