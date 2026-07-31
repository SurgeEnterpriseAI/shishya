// Ask Shishya — the AI answer engine behind /ask.
//
// Architecture (deliberate): Claude + DATABASE TOOLS, not a chatbot and
// not vector RAG. The model never invents an exam fact — it looks it up
// in our tables and explains contextually. Web search is a clearly-
// labelled FALLBACK for what Shishya doesn't track (city-level counts,
// brand-new notices), restricted toward official sources.
//
// Answer contract (enforced in the system prompt):
//   • Shishya data first; web only when internal tools can't answer.
//   • Web findings go in a separate final section marked tentative.
//   • Every answer ends with Shishya links as next steps.
//   • Honest about granularity (state-level, not city-level) and about
//     anything indicative (salaries → "verify in the notification").

import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/db/prisma";
import { anthropic, MODEL, cachedSystem } from "@/lib/ai/client";

// ── Tool definitions ─────────────────────────────────────────────────

const TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "search_exams",
    description:
      "Search Shishya's 177 Indian government & entrance exams. Filter by state code (e.g. BR, MH, KA — omit for national), category (GOVT_JOBS, BANKING, CIVIL_SERVICES, TEACHING, STATE_LEVEL, ENGINEERING, MEDICAL), and/or a free-text keyword against exam names. Returns pattern, eligibility, approximate annual vacancies and Shishya links.",
    input_schema: {
      type: "object",
      properties: {
        state: { type: "string", description: "2-letter Indian state code, e.g. BR for Bihar, MH for Maharashtra" },
        category: { type: "string" },
        keyword: { type: "string" },
      },
    },
  },
  {
    name: "get_exam_details",
    description:
      "Full detail for ONE exam by its Shishya code (from search_exams): pattern, eligibility, vacancies, upcoming dates, declared results, cutoff guidance.",
    input_schema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
    },
  },
  {
    name: "search_content",
    description:
      "Full-text search over Shishya's guides (which include SALARY and career-growth sections per exam), study notes and news. Use for salary questions, 'how to crack', notifications and preparation topics.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "get_vacancy_stats",
    description:
      "Aggregate live government-job vacancy counts tracked by Shishya — total and per-exam, optionally filtered by state code. Data is at STATE level, not city level.",
    input_schema: {
      type: "object",
      properties: { state: { type: "string" } },
    },
  },
];

// ── Tool executors (raw SQL — grounded, no generation) ───────────────

async function searchExams(input: { state?: string; category?: string; keyword?: string }) {
  const state = input.state?.toUpperCase() || null;
  const cat = input.category?.toUpperCase() || null;
  const kw = input.keyword ? `%${input.keyword}%` : null;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT e.code, e.name, e."shortName", e.category::text AS category, e.state,
           e."totalQuestions", e."totalMarks", e."durationMin", e."negativeMark",
           el."minAge", el."maxAge", el."educationNote", el."vacanciesApprox", el."officialName"
    FROM "Exam" e
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE e.active = TRUE
      AND (${state}::text IS NULL OR e.state = ${state})
      AND (${cat}::text IS NULL OR e.category::text = ${cat})
      AND (${kw}::text IS NULL OR e.name ILIKE ${kw} OR e."shortName" ILIKE ${kw})
    ORDER BY el."vacanciesApprox" DESC NULLS LAST
    LIMIT 15`;
  return rows.map((r) => ({
    code: r.code,
    name: r.name,
    short: r.shortName,
    category: r.category,
    state: r.state ?? "national",
    pattern: `${r.totalQuestions}Q/${r.totalMarks}marks/${r.durationMin}min`,
    age: r.minAge != null ? `${r.minAge}-${r.maxAge}` : null,
    education: r.educationNote,
    vacanciesApprox: r.vacanciesApprox,
    officialBody: r.officialName,
    link: `https://shishya.in/exams/${r.code}`,
  }));
}

async function getExamDetails(input: { code: string }) {
  const rows = await prisma.$queryRaw<any[]>`
    SELECT e.id, e.code, e.name, e."shortName", e.category::text AS category, e.state,
           e."totalQuestions", e."totalMarks", e."marksPerQ", e."durationMin", e."negativeMark",
           el."minAge", el."maxAge", el."educationNote", el."vacanciesApprox",
           el."eligibilityNote", el."officialUrl", el."officialName",
           cc.content AS cutoff
    FROM "Exam" e
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    LEFT JOIN "ExamCategoryCutoff" cc ON cc."examId" = e.id
    WHERE e.code = ${input.code.toUpperCase()} AND e.active = TRUE LIMIT 1`;
  const e = rows[0];
  if (!e) return { error: "exam not found — use search_exams first" };
  const [dates, results] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT label, date FROM "ExamImportantDate"
      WHERE "examId" = ${e.id} AND date > NOW() - INTERVAL '30 days'
      ORDER BY date ASC LIMIT 6`,
    prisma.$queryRaw<any[]>`
      SELECT stage, headline, "declaredOn" FROM "ExamResult"
      WHERE "examId" = ${e.id} AND stage <> '__not_a_result__'
      ORDER BY "declaredOn" DESC LIMIT 3`,
  ]);
  return {
    ...{
      code: e.code, name: e.name, short: e.shortName, category: e.category,
      state: e.state ?? "national",
      pattern: `${e.totalQuestions} questions, ${e.totalMarks} marks, ${e.durationMin} min, negative ${e.negativeMark}/wrong`,
      age: e.minAge != null ? `${e.minAge}-${e.maxAge} (OBC +3, SC/ST +5)` : null,
      education: e.educationNote,
      vacanciesApprox: e.vacanciesApprox,
      eligibilityNote: e.eligibilityNote,
      official: e.officialUrl ? `${e.officialName ?? ""} ${e.officialUrl}` : e.officialName,
      cutoffGuidance: e.cutoff ? String(e.cutoff).slice(0, 1200) : null,
    },
    upcomingDates: dates.map((d) => `${d.date.toISOString().slice(0, 10)}: ${d.label}`),
    recentResults: results.map((r) => `${r.declaredOn.toISOString().slice(0, 10)}: ${r.stage} — ${r.headline}`),
    links: {
      hub: `https://shishya.in/exams/${e.code}`,
      syllabus: `https://shishya.in/exams/${e.code}/syllabus`,
      cutoff: `https://shishya.in/exams/${e.code}/cutoff`,
      guide: `https://shishya.in/exams/${e.code}/guide`,
    },
  };
}

async function searchContent(input: { query: string }) {
  const q = `%${input.query}%`;
  const [guides, news] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT e.code, e."shortName", LEFT(g.content, 1500) AS excerpt
      FROM "ExamGuide" g JOIN "Exam" e ON e.id = g."examId"
      WHERE g.content ILIKE ${q} AND e.active = TRUE LIMIT 4`,
    prisma.$queryRaw<any[]>`
      SELECT e.code, n.title, LEFT(n.body, 400) AS excerpt, n."publishedAt"
      FROM "ExamNewsItem" n JOIN "Exam" e ON e.id = n."examId"
      WHERE (n.title ILIKE ${q} OR n.body ILIKE ${q})
      ORDER BY n."publishedAt" DESC LIMIT 4`,
  ]);
  return {
    guides: guides.map((g) => ({
      exam: g.shortName,
      excerpt: g.excerpt,
      link: `https://shishya.in/exams/${g.code}/guide`,
    })),
    news: news.map((n) => ({
      exam: n.code,
      title: n.title,
      date: n.publishedAt.toISOString().slice(0, 10),
      excerpt: n.excerpt,
    })),
  };
}

async function getVacancyStats(input: { state?: string }) {
  const state = input.state?.toUpperCase() || null;
  const rows = await prisma.$queryRaw<any[]>`
    SELECT e.code, e."shortName", e.state, el."vacanciesApprox"
    FROM "Exam" e JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE e.active = TRUE AND el."vacanciesApprox" IS NOT NULL
      AND (${state}::text IS NULL OR e.state = ${state} OR e.state IS NULL)
    ORDER BY el."vacanciesApprox" DESC LIMIT 20`;
  const total = rows.reduce((s, r) => s + (r.vacanciesApprox ?? 0), 0);
  return {
    note: state
      ? `Vacancies are tracked at STATE level. Showing ${state}-specific exams plus national exams open to ${state} candidates.`
      : "Approximate annual vacancies across tracked exams.",
    totalApprox: total,
    exams: rows.map((r) => ({
      exam: r.shortName,
      state: r.state ?? "national",
      vacanciesApprox: r.vacanciesApprox,
      link: `https://shishya.in/exams/${r.code}`,
    })),
  };
}

async function runTool(name: string, input: any): Promise<unknown> {
  try {
    if (name === "search_exams") return await searchExams(input ?? {});
    if (name === "get_exam_details") return await getExamDetails(input ?? {});
    if (name === "search_content") return await searchContent(input ?? {});
    if (name === "get_vacancy_stats") return await getVacancyStats(input ?? {});
    return { error: "unknown tool" };
  } catch (e) {
    return { error: "tool failed — answer with what you have" };
  }
}

// ── The engine ───────────────────────────────────────────────────────

const SYSTEM = `You are Ask Shishya — the answer engine of shishya.in, India's end-to-end free government-exam preparation platform. Aspirants ask anything about government jobs, exams, eligibility, vacancies, salaries, dates, results and preparation, in any language; MIRROR the language of the question exactly — an English question gets an English answer, a Hindi question gets Hindi, Hinglish gets Hinglish. Never switch languages on the asker.

RULES (non-negotiable):
1. SHISHYA FIRST. Always try the database tools before anything else. Never state an exam fact (vacancy count, age limit, pattern, date, cutoff, salary) that didn't come from a tool result or a web search result.
2. WEB SEARCH is a FALLBACK only — use it when Shishya's data genuinely cannot answer (city-level detail, very fresh notifications, exams we don't track). Prefer official sources (.gov.in, .nic.in, commission portals) and reputable news. NEVER cite job-alert spam sites.
3. STRUCTURE: answer from Shishya's data first. If (and only if) you used web search, add a final section titled exactly "🌐 From the web (tentative — verify before acting):" containing those findings with source names. Never mix web numbers into the Shishya section.
4. BE HONEST about granularity and freshness: our vacancy data is state-level and approximate-annual ("~X"); salaries from guides are indicative pay-band figures — say "verify in the official notification".
5. ALWAYS end with 1-3 Shishya next steps as markdown links (exam hub, /find-your-exam for eligibility matching, /coach for a free day-by-day plan). Shishya is 100% free — no fees ever.
6. Format: concise markdown. Bold the key numbers. Lists over paragraphs. No preamble — answer directly.`;

export interface AskResult {
  answer: string;
  usedWeb: boolean;
  toolsUsed: string[];
}

export async function runAsk(question: string): Promise<AskResult> {
  const messages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: question.slice(0, 800) },
  ];
  // any[]: the installed SDK's Tool union predates the server-side
  // web_search tool type (same workaround as exam-info.ts) — the API
  // itself accepts and executes it.
  const allTools: any[] = [
    ...TOOLS,
    { type: "web_search_20250305", name: "web_search", max_uses: 3 },
  ];
  const toolsUsed: string[] = [];
  let usedWeb = false;

  for (let turn = 0; turn < 6; turn++) {
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1800,
      system: cachedSystem(SYSTEM),
      messages,
      tools: allTools,
    });

    // Track server-side web search (executed by the API itself).
    if (res.content.some((b: any) => b.type === "server_tool_use" || b.type === "web_search_tool_result")) {
      usedWeb = true;
      if (!toolsUsed.includes("web_search")) toolsUsed.push("web_search");
    }

    const toolCalls = res.content.filter(
      (b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use",
    );
    if (toolCalls.length === 0 || res.stop_reason !== "tool_use") {
      const answer = res.content
        .map((b) => (b.type === "text" ? b.text : ""))
        .join("")
        .trim();
      return { answer, usedWeb, toolsUsed };
    }

    messages.push({ role: "assistant", content: res.content });
    const results: Anthropic.Messages.ToolResultBlockParam[] = [];
    for (const tc of toolCalls) {
      if (!toolsUsed.includes(tc.name)) toolsUsed.push(tc.name);
      const out = await runTool(tc.name, tc.input);
      results.push({
        type: "tool_result",
        tool_use_id: tc.id,
        content: JSON.stringify(out).slice(0, 12_000),
      });
    }
    messages.push({ role: "user", content: results });
  }

  return {
    answer:
      "That took more digging than expected — try asking a slightly more specific question (mention the state or exam name).",
    usedWeb,
    toolsUsed,
  };
}
