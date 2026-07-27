import { prisma } from "../src/lib/db/prisma";

async function main() {
  const rows = await prisma.exam.findMany({
    where: { active: true, state: { not: null } },
    select: { code: true, shortName: true, state: true, category: true, languages: true },
    orderBy: { state: "asc" },
  });
  const byState: Record<string, string[]> = {};
  for (const e of rows) {
    if (!e.state) continue;
    byState[e.state] = byState[e.state] || [];
    byState[e.state].push(`${e.shortName} (${e.code})`);
  }
  for (const [st, list] of Object.entries(byState)) {
    console.log(`${st}: ${list.length} exams — ${list.slice(0, 3).join(", ")}${list.length > 3 ? "..." : ""}`);
  }
  console.log("---");
  console.log("total stateful exams:", rows.length);
  const totalActive = await prisma.exam.count({ where: { active: true } });
  console.log("total active exams:", totalActive);
  console.log("national/central:", totalActive - rows.length);
}

main().then(() => process.exit(0));
