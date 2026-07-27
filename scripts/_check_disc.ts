import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
(async () => {
  const count = await p.discussion.count();
  const top = await p.discussion.findMany({ orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }], take: 5, select: { title: true, messageCount: true, lastActivityAt: true, pinned: true } });
  console.log(JSON.stringify({ count, top }, null, 2));
  await p.$disconnect();
})();
