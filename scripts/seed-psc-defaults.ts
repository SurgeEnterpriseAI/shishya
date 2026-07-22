// Insert standard state-PSC eligibility defaults for the 2 tiny UT PSCs
// (Puducherry, Chandigarh) where the generator kept returning prose
// instead of JSON. Standard PSC eligibility: graduate any-stream, ~21-32
// with category relaxation, state domicile. Traceable via generatedBy.
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const rows = await p.$queryRawUnsafe<{ id: string; code: string }[]>(
    `SELECT id, code FROM "Exam" WHERE code IN ('PY_PPSC','CH_CHANDIGARH_PCS')`,
  );
  for (const ex of rows) {
    const st = ex.code === "PY_PPSC" ? "PY" : "CH";
    await p.$executeRawUnsafe(
      `INSERT INTO "ExamEligibility" (id,"examId","minAge","maxAge","ageRelaxation","educationTags","educationNote","domicileState","vacanciesApprox","vacanciesNote","skillProfile","eligibilityNote","generatedAt","generatedBy")
       VALUES (gen_random_uuid()::text,$1,21,32,$2,$3::text[],$4,$5,$6,$7,$8::jsonb,$9,NOW(),$10)
       ON CONFLICT ("examId") DO NOTHING`,
      ex.id,
      "OBC +3, SC/ST +5, PwD +10",
      ["GRADUATE", "ANY_STREAM"],
      "Bachelor's degree in any discipline from a recognised university",
      st,
      100,
      "Indicative — confirm exact posts in the official notification",
      JSON.stringify({ quant: 3, reasoning: 4, gk: 5, english: 4, technical: 0 }),
      "State Public Service Commission — general administrative posts; state domicile typically required.",
      "manual-default:standard-psc",
    );
    console.log("seeded", ex.code);
  }
  const [m] = await p.$queryRawUnsafe<{ n: number }[]>(
    `SELECT COUNT(*)::int n FROM "Exam" e WHERE e.active AND NOT EXISTS(SELECT 1 FROM "ExamEligibility" x WHERE x."examId"=e.id)`,
  );
  console.log("still missing:", m.n);
  await p.$disconnect();
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
