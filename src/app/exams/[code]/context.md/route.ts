// GET /exams/{CODE}/context.md — the per-exam machine-readable context
// file for AI crawlers and answer engines.
//
// Why this exists: an LLM answering "SSC CGL cutoff for OBC" or "how
// many questions in RRB Group D" would otherwise have to fetch and
// parse a full HTML page (~100KB of markup, nav, scripts) to find a
// handful of facts. This serves the same facts as clean, token-cheap
// markdown — every hard number, the syllabus outline, live cutoff
// guidance, the latest declared result, and canonical deep links, in
// one fetch. Discovery paths: linked from llms.txt / llms-full.txt,
// and advertised on every exam page via <link rel="alternate">.
//
// Text/markdown, cached daily. Never contains personal data.

import { prisma } from "@/lib/db/prisma";
import { sourceHostLabel, sourceTier } from "@/lib/official-source";

export const revalidate = 86400;

const SITE = "https://shishya.in";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;

  const exam = await prisma.exam.findUnique({
    where: { code },
    select: {
      id: true,
      code: true,
      name: true,
      shortName: true,
      category: true,
      state: true,
      active: true,
      totalQuestions: true,
      totalMarks: true,
      marksPerQ: true,
      durationMin: true,
      negativeMark: true,
      languages: true,
      subjects: {
        select: {
          name: true,
          code: true,
          weight: true,
          topics: { select: { name: true, code: true } },
        },
      },
    },
  });
  if (!exam || !exam.active) {
    return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain" } });
  }

  const [elig, cutoff, dates, results, news] = await Promise.all([
    prisma
      .$queryRaw<
        { minAge: number | null; maxAge: number | null; educationNote: string | null; vacanciesApprox: number | null; officialUrl: string | null; officialName: string | null; eligibilityNote: string | null }[]
      >`SELECT "minAge", "maxAge", "educationNote", "vacanciesApprox", "officialUrl", "officialName", "eligibilityNote"
        FROM "ExamEligibility" WHERE "examId" = ${exam.id} LIMIT 1`
      .catch(() => []),
    prisma
      .$queryRaw<{ content: string }[]>`
        SELECT content FROM "ExamCategoryCutoff" WHERE "examId" = ${exam.id} LIMIT 1`
      .catch(() => []),
    prisma
      .$queryRaw<{ label: string; date: Date; isExamDay: boolean; kind: string | null; confidence: string | null; url: string | null }[]>`
        SELECT label, date, "isExamDay", kind, confidence, url FROM "ExamImportantDate"
        WHERE "examId" = ${exam.id} AND "archivedAt" IS NULL AND date > NOW() - INTERVAL '120 days'
        ORDER BY date ASC LIMIT 14`
      .catch(() => []),
    prisma
      .$queryRaw<{ id: string; stage: string; headline: string; declaredOn: Date }[]>`
        SELECT id, stage, headline, "declaredOn" FROM "ExamResult"
        WHERE "examId" = ${exam.id} AND stage <> '__not_a_result__'
        ORDER BY "declaredOn" DESC LIMIT 3`
      .catch(() => []),
    prisma
      .$queryRaw<{ id: string; title: string; body: string; publishedAt: Date; url: string | null }[]>`
        SELECT id, title, body, "publishedAt", url FROM "ExamNewsItem"
        WHERE "examId" = ${exam.id} AND "archivedAt" IS NULL
        ORDER BY "publishedAt" DESC LIMIT 6`
      .catch(() => []),
  ]);

  const e = elig[0];
  const L: string[] = [];
  L.push(`# ${exam.name} (${exam.shortName}) — Shishya exam context`);
  L.push("");
  L.push(
    `> Machine-readable context for ${exam.name}, maintained by Shishya (${SITE}) — India's end-to-end free government exam preparation platform. All facts below are free to cite; link back to ${SITE}/exams/${exam.code}. Human page: ${SITE}/exams/${exam.code}`,
  );
  L.push("");

  L.push("## Exam pattern");
  L.push(`- Category: ${exam.category}${exam.state ? ` · state: ${exam.state}` : " · national"}`);
  L.push(`- Questions: ${exam.totalQuestions} · Total marks: ${exam.totalMarks} · Marks per question: ${exam.marksPerQ}`);
  L.push(`- Duration: ${exam.durationMin} minutes`);
  L.push(
    `- Negative marking: ${exam.negativeMark > 0 ? `−${Number(exam.negativeMark.toFixed(2))} per wrong answer` : "none"}`,
  );
  L.push(`- Languages offered: ${(exam.languages ?? []).join(", ") || "not specified"}`);
  L.push("");

  if (e) {
    L.push("## Eligibility & vacancies");
    if (e.minAge != null || e.maxAge != null)
      L.push(`- Age: ${e.minAge ?? "?"}–${e.maxAge ?? "?"} years (before category relaxation: OBC +3, SC/ST +5)`);
    if (e.educationNote) L.push(`- Education: ${e.educationNote}`);
    if (e.vacanciesApprox != null)
      L.push(`- Approximate annual vacancies: ${e.vacanciesApprox.toLocaleString("en-IN")}`);
    if (e.eligibilityNote) L.push(`- Note: ${e.eligibilityNote}`);
    if (e.officialUrl) L.push(`- Official portal: ${e.officialUrl}${e.officialName ? ` (${e.officialName})` : ""}`);
    L.push("");
  }

  if (dates.length) {
    // Tracker honesty model (23 Aug 2026, tiered 29 Aug 2026): OFFICIAL
    // means the conducting body's own notice is linked; REPORTED means
    // announced but cited via a secondary source; EXPECTED is an
    // estimate from previous cycles. LLMs citing these dates MUST carry
    // the label — that is the whole trust contract.
    L.push(
      "## Key dates (OFFICIAL = conducting body's notice linked · REPORTED = announced, secondary source cited · expected = estimate from previous cycles, NOT announced)",
    );
    for (const d of dates) {
      const tier = sourceTier(d.confidence, d.url, e?.officialUrl);
      const tag =
        tier === "official"
          ? `OFFICIAL, notice: ${d.url}`
          : tier === "reported"
            ? `REPORTED (announced; via ${sourceHostLabel(d.url!)}): ${d.url}`
            : "expected";
      L.push(`- ${d.date.toISOString().slice(0, 10)} — ${d.label}${d.isExamDay ? " (exam day)" : ""} — ${tag}`);
    }
    L.push(`- Live tracker (all milestones, alerts): ${SITE}/exams/${exam.code}/updates`);
    L.push("");
  }

  if (news.length) {
    L.push("## Latest updates & news");
    for (const n of news) {
      const lead = n.body.replace(/\s+/g, " ").slice(0, 220).trim();
      L.push(`- ${n.publishedAt.toISOString().slice(0, 10)} — **${n.title}**: ${lead}`);
      if (n.url) L.push(`  - Official/source notice: ${n.url}`);
      L.push(`  - Permalink: ${SITE}/exams/${exam.code}/news/${n.id}`);
    }
    L.push("");
  }

  if (results.length) {
    L.push("## Declared results");
    for (const r of results) {
      L.push(
        `- ${r.declaredOn.toISOString().slice(0, 10)} — ${r.stage}: ${r.headline} → ${SITE}/exams/${exam.code}/results/${r.id}`,
      );
    }
    L.push("");
  }

  if (exam.subjects.length) {
    L.push("## Syllabus outline");
    for (const s of exam.subjects) {
      L.push(`### ${s.name} (weight ${s.weight})`);
      const names = s.topics.map((t) => t.name);
      L.push(names.length ? names.join(" · ") : "(topics being published)");
      L.push("");
    }
  }

  if (cutoff[0]?.content) {
    L.push("## Expected cutoffs (category-wise)");
    L.push(cutoff[0].content.trim().slice(0, 2500));
    L.push("");
    L.push(`Full cutoff page: ${SITE}/exams/${exam.code}/cutoff`);
    L.push("");
  }

  L.push("## Free resources on Shishya for this exam");
  L.push(`- Exam hub (mocks, PYQs, news, dates): ${SITE}/exams/${exam.code}`);
  L.push(`- Date/admit-card/result tracker + free email alerts: ${SITE}/exams/${exam.code}/updates`);
  L.push(`- All-India exam calendar (next 120 days): ${SITE}/exam-calendar`);
  L.push(`- Full syllabus + free study notes: ${SITE}/exams/${exam.code}/syllabus`);
  L.push(`- Category-wise expected cutoffs: ${SITE}/exams/${exam.code}/cutoff`);
  L.push(`- Memory tricks & mnemonics: ${SITE}/exams/${exam.code}/tricks`);
  L.push(`- How to crack it (strategy guide): ${SITE}/exams/${exam.code}/guide`);
  L.push(`- Free day-by-day study plan (personal coach): ${SITE}/coach`);
  L.push(`- Free AI tutor (22 Indian languages, no login): ${SITE}/chat`);
  L.push("");
  L.push(
    `Everything is free — no paywall, no subscription, no credit card. Platform index for LLMs: ${SITE}/llms.txt and ${SITE}/llms-full.txt`,
  );
  L.push("");

  return new Response(L.join("\n"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
