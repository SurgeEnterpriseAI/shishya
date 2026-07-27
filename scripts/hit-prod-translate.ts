// Hit the prod /api/mocks/[id]/translate endpoint directly to see what it
// actually returns. We use the EXACT mock from the user's screenshot URL
// so this probe matches the player's first translate request 1:1.

import { prisma } from "../src/lib/db/prisma";

const PROD = "https://shishya.in";
const MOCK_ID = "cmp04hkgk00klwf3z19qavq1n"; // TNPSC Group IV — Full Mock 3

async function probe(label: string, batch: string[]) {
  console.log(`\n--- ${label}: ${batch.length} questionIds ---`);
  const t0 = Date.now();
  let res: Response;
  try {
    res = await fetch(`${PROD}/api/mocks/${MOCK_ID}/translate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale: "hi", questionIds: batch }),
    });
  } catch (e: any) {
    console.log(`  FETCH FAILED after ${Date.now() - t0}ms:`, e.message);
    return;
  }
  const latency = Date.now() - t0;
  const text = await res.text();
  let body: any = text;
  try {
    body = JSON.parse(text);
  } catch {}
  console.log(`  HTTP ${res.status} in ${latency}ms`);
  if (typeof body === "object" && body.questions) {
    console.log(`  questions returned: ${body.questions.length}`);
    if (body.questions[0]) {
      console.log(`  first body: ${String(body.questions[0].body).slice(0, 80)}...`);
    }
  } else {
    console.log(`  body:`, JSON.stringify(body).slice(0, 400));
  }
}

async function main() {
  const mock = await prisma.mock.findUnique({
    where: { id: MOCK_ID },
    select: { questionIds: true },
  });
  if (!mock) {
    console.log("mock not found");
    return;
  }
  // Pick a fresh chunk past the ones already cached (5 from earlier probe)
  // so we measure cold-path latency, not cache hits.
  const fresh = mock.questionIds.slice(50, 58); // 8 cold IDs
  await probe("player default batch (8 cold)", fresh);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
