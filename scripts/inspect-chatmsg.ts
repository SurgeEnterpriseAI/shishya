import { prisma } from "../src/lib/db/prisma";
async function main() {
  const cols = await prisma.$queryRaw<Array<{column_name: string}>>`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'ChatMessage' ORDER BY column_name
  `;
  console.log("ChatMessage columns:", cols.map(c => c.column_name).join(", "));
}
main().then(() => process.exit(0));
