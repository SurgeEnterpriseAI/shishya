import { prisma } from "../src/lib/db/prisma";

async function main() {
  const tables = await prisma.$queryRaw<Array<{table_name: string}>>`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('Fact', 'Verification', 'AiCheck', 'VerificationAudit')
    ORDER BY table_name
  `;
  console.log("new tables present:", tables.map(t => t.table_name).join(", "));

  const userCols = await prisma.$queryRaw<Array<{column_name: string; data_type: string}>>`
    SELECT column_name, data_type FROM information_schema.columns
    WHERE table_name = 'User'
      AND column_name IN ('contributionScore', 'verificationCount', 'flagCount',
        'flagValidatedCount', 'suggestionAcceptedCount', 'badgeLevel',
        'badgeEarnedAt', 'domainExpertCredentials')
    ORDER BY column_name
  `;
  console.log("\nnew User columns:");
  for (const c of userCols) console.log(`  ${c.column_name}: ${c.data_type}`);

  const enums = await prisma.$queryRaw<Array<{typname: string}>>`
    SELECT typname FROM pg_type
    WHERE typname IN ('FactSection', 'AICheckResult', 'AiMatchType', 'FactStatus',
                      'VerificationActionType', 'VerificationResolution',
                      'AuditResult', 'BadgeLevel')
    ORDER BY typname
  `;
  console.log("\nnew enums:", enums.map(e => e.typname).join(", "));

  // Existing data unchanged?
  const userCount = await prisma.user.count();
  console.log("\nuser count (should be unchanged):", userCount);
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
