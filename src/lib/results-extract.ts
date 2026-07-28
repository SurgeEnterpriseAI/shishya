// Results extraction — turns result-flavored rows in the daily exam
// news stream into structured ExamResult rows (stage, declared date,
// official link, cutoff expectation, candidate's next steps).
//
// Accuracy rules (result announcements are trust-critical):
//   • officialUrl is COPIED from the source text or news source field —
//     the model is forbidden from inventing URLs, and we drop anything
//     that isn't http(s).
//   • Items that aren't actually a declared result (admit cards, "result
//     soon" speculation) are classified out.
// Idempotent: news rows already extracted (sourceNewsId) are skipped,
// and (examId, headline) is unique.

import { prisma } from "@/lib/db/prisma";
import { callClaude, cachedSystem, parseJson, MODEL } from "@/lib/ai/client";

const RESULT_KEYWORDS =
  "%result%|%merit list%|%scorecard%|%score card%|%selection list%|%shortlist%|%qualified%";

// IndexNow instant ping — results are the most time-sensitive pages on
// the site; Bing (which feeds ChatGPT search) should know within
// minutes of extraction, not at the weekly re-submission. The key is
// public by design (it lives at /<key>.txt).
const INDEXNOW_HOST = "shishya.in";
const INDEXNOW_KEY = "7e0b8421fc95cdb98187e2b89a6e2437";
async function pingIndexNow(urls: string[]): Promise<void> {
  if (!urls.length) return;
  try {
    await fetch("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: INDEXNOW_HOST,
        key: INDEXNOW_KEY,
        keyLocation: `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`,
        urlList: urls,
      }),
    });
  } catch {
    /* best-effort — the weekly cron re-submits everything anyway */
  }
}

interface Extraction {
  isDeclaredResult: boolean;
  stage: string;
  declaredOn: string | null;
  officialUrl: string | null;
  officialName: string | null;
  cutoffNote: string | null;
  nextSteps: { step: string; note: string }[];
}

export async function extractResults(opts?: { days?: number; cap?: number }): Promise<{
  scanned: number;
  inserted: number;
  skipped: number;
}> {
  const days = opts?.days ?? 3;
  const cap = opts?.cap ?? 20;

  const candidates = await prisma.$queryRaw<
    { id: string; examId: string; title: string; body: string; source: string | null; publishedAt: Date; examName: string; short: string; examCode: string }[]
  >`
    SELECT n.id, n."examId", n.title, n.body, n.source, n."publishedAt",
           e.name AS "examName", e."shortName" AS short, e.code AS "examCode"
    FROM "ExamNewsItem" n
    JOIN "Exam" e ON e.id = n."examId"
    WHERE n."publishedAt" > NOW() - (${days} || ' days')::interval
      AND (n.title ILIKE ANY(string_to_array(${RESULT_KEYWORDS}, '|')))
      AND NOT EXISTS (SELECT 1 FROM "ExamResult" er WHERE er."sourceNewsId" = n.id)
    ORDER BY n."publishedAt" DESC
    LIMIT ${cap}`;

  let inserted = 0;
  let skipped = 0;
  const newUrls: string[] = [];

  for (const c of candidates) {
    let ex: Extraction;
    try {
      const res = await callClaude({
        system: cachedSystem(
          `You classify and structure Indian exam-result announcements for Shishya (a free exam-prep platform). Given a news item about an exam, respond with ONLY JSON:
{
  "isDeclaredResult": boolean,  // true ONLY if a result/merit list/scorecard has actually been DECLARED (not "expected soon", not admit cards, not answer keys)
  "stage": string,              // which stage this result belongs to, e.g. "Tier 1", "Prelims", "Mains", "Interview", "Final merit list", "Seat allotment". Short.
  "declaredOn": "YYYY-MM-DD" | null,  // declaration date from the text; null if not stated
  "officialUrl": string | null, // ONLY a URL that literally appears in the provided text/source. NEVER construct or guess a URL. null if none present.
  "officialName": string | null, // the official body/portal name, e.g. "ssc.gov.in", "Kerala PSC"
  "cutoffNote": string | null,  // 1-2 honest sentences on cutoff expectation IF the text supports it (difficulty, category numbers); null if the text gives no basis
  "nextSteps": [{"step": string, "note": string}]  // 3-5 concrete next steps for a candidate in this exam's official selection process AFTER this stage (next stage + typical timeline, documents to keep ready, what qualified vs not-qualified candidates should do). Grounded in how this exam's process actually works.
}`,
        ),
        messages: [
          {
            role: "user",
            content: `Exam: ${c.examName} (${c.short})\nNews title: ${c.title}\nPublished: ${c.publishedAt.toISOString().slice(0, 10)}\nSource field: ${c.source ?? "(none)"}\n\nNews body:\n${c.body.slice(0, 3000)}`,
          },
        ],
        maxTokens: 900,
        model: MODEL,
      });
      const text = res.response.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      ex = parseJson<Extraction>(text);
    } catch {
      skipped++;
      continue;
    }

    if (!ex.isDeclaredResult) {
      // Remember the classification so we never re-scan this row: store a
      // tombstone keyed by sourceNewsId with a sentinel stage.
      await prisma.$executeRaw`
        INSERT INTO "ExamResult" (id, "examId", stage, headline, "declaredOn", "sourceNewsId", "createdAt")
        VALUES (gen_random_uuid()::text, ${c.examId}, ${"__not_a_result__"}, ${c.title}, ${c.publishedAt}, ${c.id}, NOW())
        ON CONFLICT ("examId", headline) DO NOTHING`;
      skipped++;
      continue;
    }

    const officialUrl =
      ex.officialUrl && /^https?:\/\//i.test(ex.officialUrl) ? ex.officialUrl : null;
    const declaredOn = ex.declaredOn ? new Date(ex.declaredOn + "T00:00:00Z") : c.publishedAt;

    const rows = await prisma.$queryRaw<{ id: string }[]>`
      INSERT INTO "ExamResult"
        (id, "examId", stage, headline, "declaredOn", "officialUrl", "officialName",
         "cutoffNote", "nextSteps", "sourceNewsId", "createdAt")
      VALUES
        (gen_random_uuid()::text, ${c.examId}, ${ex.stage || "Result"}, ${c.title},
         ${declaredOn}, ${officialUrl}, ${ex.officialName},
         ${ex.cutoffNote}, ${JSON.stringify(ex.nextSteps ?? [])}::jsonb, ${c.id}, NOW())
      ON CONFLICT ("examId", headline) DO NOTHING
      RETURNING id`;
    if (rows[0]) {
      inserted++;
      newUrls.push(`https://shishya.in/exams/${c.examCode}/results/${rows[0].id}`);
    }
  }

  // Tell Bing/ChatGPT about fresh result pages immediately, plus the
  // hub (its listing changed too).
  if (newUrls.length) await pingIndexNow([...newUrls, "https://shishya.in/results"]);

  return { scanned: candidates.length, inserted, skipped };
}
