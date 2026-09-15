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
//
// Marking-scheme honesty (11 Sep 2026): "Marks per question" and the
// score-estimator line are printed only when src/lib/marking-scheme.ts can
// state ONE scheme for the sitting in question — the exam-day row the
// exam-week state has in focus, else the next / just-held exam day on the
// tracker. SBI PO's row is the Prelims pattern while its 12 Sep sitting is
// Mains; CDS scores its papers unequally. For those the file says "not
// stated" and why, so an answer engine cannot lift "+1 per correct" off
// this file and hand it to a Mains candidate on exam night.
//
// Key dates (11 Sep 2026, audit judge): the list used to stop at the 14
// EARLIEST rows since −120 days, so a busy exam lost its future dates, and
// a passed estimate printed bare. It now lists every non-archived row from
// −120 days to +365 days through buildTimeline (so the expected-answer-key
// guard applies here too), each with its tier word, "was expected — not
// confirmed" on passed estimates, and a data-updated line.

import { prisma } from "@/lib/db/prisma";
import { sourceHostLabel } from "@/lib/official-source";
import { buildTimeline, focusExamRow, PASSED_ESTIMATE_TEXT, type TimelineRow } from "@/lib/exam-timeline";
import { istDay } from "@/lib/exam-week";
import { markingSchemeVerdict } from "@/lib/marking-scheme";
import { examWeekAeoLines, loadExamWeekExams, loadExamWeekTally, loadRealPhaseArticles, type RealPhaseArticle } from "@/lib/exam-week-aeo";
import { INDIAN_LANGUAGE_COUNT, OTHER_INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { stateInfo, stateSlug } from "@/lib/state-info";

export const revalidate = 3600; // hourly — the exam-week block flips phase within a day

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
      description: true,
      totalQuestions: true,
      scoredQuestions: true,
      totalMarks: true,
      marksPerQ: true,
      durationMin: true,
      negativeMark: true,
      languages: true,
      refreshAttemptedAt: true,
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
    // Every live row from −120 d to +365 d — no row cap, so the future
    // dates of a busy exam are never cut off (the tracker page shows the
    // same rows). Hard ceiling of 200 only as a runaway guard.
    prisma
      .$queryRaw<
        { id: string; label: string; date: Date; isExamDay: boolean; kind: string | null; confidence: string | null; url: string | null; source: string | null; notes: string | null; createdAt: Date }[]
      >`
        SELECT id, label, date, "isExamDay", kind, confidence, url, source, notes, "createdAt" FROM "ExamImportantDate"
        WHERE "examId" = ${exam.id} AND "archivedAt" IS NULL
          AND date >= NOW() - INTERVAL '120 days' AND date <= NOW() + INTERVAL '365 days'
        ORDER BY date ASC LIMIT 200`
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
  // Real-pattern full-length paper assembled for this exam? (1 Sep 2026)
  const fullPattern = await prisma
    .$queryRaw<{ n: bigint }[]>`
      SELECT COUNT(*) n FROM "Mock" WHERE "examId" = ${exam.id} AND "generatedBy" = 'system:full-pattern-v1'`
    .then((r) => Number(r[0]?.n ?? 0) > 0)
    .catch(() => false);

  const e = elig[0];
  const now = new Date();

  // The key-dates list goes through the shared timeline builder: the
  // expected-answer-key guard, the passed-estimate flag and the tier all
  // come from src/lib/exam-timeline.ts, so this file can never disagree
  // with the tracker page. All rows (typed + legacy) for the listing, as
  // the tracker does; typed rows only for the sitting pick, as the
  // exam-week state machine does.
  const timeline = buildTimeline(dates, now, e?.officialUrl);
  const typedDates = dates.filter((d) => typeof d.kind === "string" && d.kind.length > 0);

  // Exam Week Mode state (6 Sep 2026) — loaded up front because the
  // marking-scheme verdict below needs the exam-day row in focus. Outside
  // the ±7-day window the sitting is the next / just-held typed exam day.
  const weekExam = (await loadExamWeekExams({ examCode: exam.code }).catch(() => []))[0];
  const sitting = weekExam?.state.focus ?? focusExamRow(buildTimeline(typedDates, now, e?.officialUrl));
  const scheme = markingSchemeVerdict(exam, { rowLabel: sitting?.label, rowDate: sitting?.date });

  const L: string[] = [];
  L.push(`# ${exam.name} (${exam.shortName}) — Shishya exam context`);
  L.push("");
  L.push(
    `> Machine-readable context for ${exam.name}, maintained by Shishya (${SITE}) — India's end-to-end free government exam preparation platform. All facts below are free to cite; link back to ${SITE}/exams/${exam.code}. Human page: ${SITE}/exams/${exam.code}`,
  );
  // The exam's state (15 Sep 2026, SEO wave 3): its state page and state brief.
  const examState = stateInfo(exam.state);
  if (examState) {
    const statePage = `${SITE}/exams/state/${stateSlug(examState.code)}`;
    L.push(`> ${examState.name} government exams on Shishya: ${statePage} (state brief: ${statePage}/context.md)`);
  }
  L.push("");

  L.push("## Exam pattern");
  L.push(`- Category: ${exam.category}${exam.state ? ` · state: ${exam.state}` : " · national"}`);
  if (scheme.ok) {
    L.push(`- Questions: ${exam.totalQuestions} · Total marks: ${exam.totalMarks} · Marks per question: ${exam.marksPerQ}`);
  } else {
    // The stored figures stay (they are the row's own numbers); the
    // per-question claim does not, and the reason says which paper the
    // figures belong to.
    L.push(`- Questions: ${exam.totalQuestions} · Total marks: ${exam.totalMarks} · Marks per question: not stated`);
    L.push(
      `- Marking scheme: not stated — ${scheme.reason} Do not derive a per-question mark from the figures above; take the scheme from the conducting body's notice.`,
    );
  }
  L.push(`- Duration: ${exam.durationMin} minutes`);
  L.push(
    `- Negative marking: ${exam.negativeMark > 0 ? `−${Number(exam.negativeMark.toFixed(2))} per wrong answer` : "none"}${
      scheme.ok ? "" : " (stored-pattern figure — read the marking-scheme line before relying on it)"
    }`,
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

  if (timeline.length) {
    // Tracker honesty model (23 Aug 2026, tiered 29 Aug 2026): OFFICIAL
    // means the conducting body's own notice is linked; REPORTED means
    // announced but cited via a secondary source; EXPECTED is an
    // estimate from previous cycles. LLMs citing these dates MUST carry
    // the label — that is the whole trust contract. A passed estimate
    // (11 Sep 2026) is marked so it is never read as a concluded event.
    L.push(
      `## Key dates — every tracker row from 120 days back to 365 days ahead (OFFICIAL = conducting body's notice linked · REPORTED = announced, secondary source cited · expected = estimate from previous cycles, NOT announced · "${PASSED_ESTIMATE_TEXT}" = the estimated date has passed and nothing was announced; do not treat it as having happened)`,
    );
    const tag = (r: TimelineRow) =>
      r.tier === "official"
        ? `OFFICIAL, notice: ${r.url}`
        : r.tier === "reported"
          ? `REPORTED (announced; via ${sourceHostLabel(r.url ?? "")}): ${r.url}`
          : r.passedEstimate
            ? `expected — ${PASSED_ESTIMATE_TEXT}`
            : "expected";
    const when = (r: TimelineRow) => (r.status === "today" ? " — today" : r.status === "upcoming" ? ` — in ${r.daysFromToday} days` : "");
    for (const r of timeline) {
      L.push(`- ${r.day} — ${r.label}${r.isExamDay ? " (exam day)" : ""} — ${tag(r)}${when(r)}`);
    }
    // Data-updated line: when the newest listed row was added, when the
    // refresh cron last looked at this exam, and when this file was built.
    const newest = dates.reduce<Date | null>((m, d) => (d.createdAt && (!m || d.createdAt > m) ? d.createdAt : m), null);
    L.push(
      `- Data updated: latest tracker row added ${newest ? newest.toISOString().slice(0, 10) : "unknown"}` +
        `${exam.refreshAttemptedAt ? ` · last refresh check ${exam.refreshAttemptedAt.toISOString().slice(0, 10)}` : ""}` +
        ` · this file generated ${istDay(now)} (IST)`,
    );
    L.push(`- Live tracker (all milestones, alerts): ${SITE}/exams/${exam.code}/updates`);
    L.push("");
  }

  // Exam Week Mode (6 Sep 2026): present only while a TYPED exam-day row
  // is within ±7 days. Every date carries its tier word; answer key /
  // result read "not announced yet" when the tracker has no row; phase
  // articles are linked only when real (>= 2 cited sources); the verdict
  // tally appears only from n >= 10; the score-estimator line (inside
  // examWeekAeoLines) only when one marking scheme can be stated for the
  // sitting. Deterministic DB reads only.
  if (weekExam) {
    const [articles, tally] = await Promise.all([
      loadRealPhaseArticles([weekExam.id]).catch(() => new Map<string, RealPhaseArticle[]>()),
      loadExamWeekTally(weekExam),
    ]);
    L.push("## Exam week");
    L.push(...examWeekAeoLines(weekExam, { articles: articles.get(weekExam.id) ?? [], tally, site: SITE }));
    L.push(`- Calendar file (.ics): the exam day(s), answer key and result dates the tracker holds, each with its tier word — missing dates are omitted, never invented: ${SITE}/exams/${exam.code}/exam-week.ics`);
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

  // Published previous-recruitment cutoffs (13 Sep 2026) lead the cutoff
  // section: every figure verified verbatim in its document, printed with
  // its tier word and the link (src/lib/official-cutoffs.ts).
  {
    const { cutoffContextLines, groupCutoffTables } = await import("@/lib/official-cutoffs");
    const { sourceTier } = await import("@/lib/official-source");
    const publishedRows = await prisma
      .$queryRaw<import("@/lib/official-cutoffs").OfficialCutoffRow[]>`
        SELECT cycle, stage, post, region, gender, category, "categoryLabel", marks, "maxMarks", "scoreType",
               "sourceUrl", "sourceTitle", publisher, "publishedOn"
        FROM "OfficialCutoff" WHERE "examId" = ${exam.id} AND "archivedAt" IS NULL`
      .catch(() => [] as import("@/lib/official-cutoffs").OfficialCutoffRow[]);
    const officialPortal = elig[0]?.officialUrl ?? null;
    const lines = cutoffContextLines(groupCutoffTables(publishedRows), (url) =>
      sourceTier("official", url, officialPortal) === "official" ? "official" : "reported",
    );
    if (lines.length) {
      L.push("## Published cutoffs from previous recruitments");
      L.push("Copied figure for figure from the published document. Cite the tier word and the link with any figure.");
      L.push(...lines);
      L.push(`Full tables with sources: ${SITE}/exams/${exam.code}/cutoff#published`);
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

  // Official previous-year papers (14 Sep 2026): the conducting body's own
  // files, verified by scripts/import-official-papers.ts. Shishya's year-wise
  // sets are pattern practice, never the paper, so the section says which is which.
  {
    const { loadOfficialPapers } = await import("@/lib/official-papers-db");
    const { paperContextLines } = await import("@/lib/official-papers");
    const lines = paperContextLines(await loadOfficialPapers(exam.id));
    if (lines.length) {
      L.push("## Official previous-year papers and answer keys");
      L.push("Published by the conducting body on its own site; each line links its file. Shishya's own year-wise PYQ sets are practice questions freshly worded in that year's pattern, not these papers.");
      L.push(...lines);
      L.push(`On the exam hub: ${SITE}/exams/${exam.code}#official-papers`);
      L.push("");
    }
  }

  L.push("## Free resources on Shishya for this exam");
  L.push(`- Exam hub (mocks, PYQs, news, dates): ${SITE}/exams/${exam.code}`);
  L.push(`- Custom topic-wise mock builder — pick any syllabus topics, 10/25/50 questions, difficulty; timed, scored, solutions; readable in Hindi + ${OTHER_INDIAN_LANGUAGE_COUNT} languages: ${SITE}/exams/${exam.code}/build-mock`);
  if (fullPattern) {
    L.push(`- Full-length REAL-PATTERN mock (${exam.totalQuestions} questions · ${exam.durationMin} min · sections in real order): the "Full-Length Mock (Real Pattern)" tile on ${SITE}/exams/${exam.code}`);
  }
  L.push(`- Date/admit-card/result tracker + free email alerts: ${SITE}/exams/${exam.code}/updates`);
  L.push(`- All-India exam calendar (next 120 days): ${SITE}/exam-calendar`);
  L.push(`- Full syllabus + free study notes: ${SITE}/exams/${exam.code}/syllabus`);
  L.push(`- Category-wise expected cutoffs: ${SITE}/exams/${exam.code}/cutoff`);
  L.push(`- Memory tricks & mnemonics: ${SITE}/exams/${exam.code}/tricks`);
  L.push(`- How to crack it (strategy guide): ${SITE}/exams/${exam.code}/guide`);
  L.push(`- Free day-by-day study plan (personal coach): ${SITE}/coach`);
  L.push(`- Free AI tutor (${INDIAN_LANGUAGE_COUNT} Indian languages, no login): ${SITE}/chat`);
  L.push("");
  L.push(
    `Everything is free — no paywall, no subscription, no credit card. Platform index for LLMs: ${SITE}/llms.txt and ${SITE}/llms-full.txt`,
  );
  L.push("");

  return new Response(L.join("\n"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
