// Ask Shishya — the AI answer engine behind /ask.
//
// Architecture (deliberate): Claude + Shishya's own DATA TOOLS, not a chatbot
// and not vector RAG. The model never invents a fact — it looks it up in our
// tables and static data and explains contextually. Web search is a clearly
// labelled FALLBACK for what Shishya does not track, restricted toward
// official sources.
//
// 26 Sep 2026 — the whole platform (founder brief: "every search takes them to
// the page we already have; if nothing is there, the AI tutor automatically
// comes up, answers the query and recommends a page we already have"):
//   * Scope: school, entrance and government exams, colleges and
//     scholarships, careers, study abroad — not only government exams. The
//     page tools (src/lib/search/ask-tools.ts) read the same site-wide search
//     index the strip and /ask use; the exam tools below still read the exam
//     tables (REAL_EXAM_SQL: a school class container is never an exam).
//   * Pre-pass: the search resolution (the pages Shishya already has for the
//     question) and, when one page is a confident match, its facts go into the
//     first user turn — most answers need one or two turns, not three.
//   * Prompt: src/lib/ask-prompt.ts — honesty, date tiers, school route-only,
//     no typed counts, and every answer ends with 1-3 real pages + "Open next".
//   * Links: every link of the answer is checked against the index
//     (src/lib/ask-links.ts) — a guessed page becomes its real parent or plain
//     text; an outside link survives only if this run saw it.
//   * Class 1-7: no model call at all (the route refuses first; runAsk
//     refuses too, for any other caller).
//   * Observability: latency per turn in AiUsage, and turns, latency and cost
//     per question in the result.
// runAsk(question) with no options still works — the teacher-request-sla cron
// calls it that way — and returns a superset of the old {answer, usedWeb,
// toolsUsed}.

import type Anthropic from "@anthropic-ai/sdk";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_SQL, REAL_EXAM_SQL } from "@/lib/db/exam-scope";
import { SUPPRESSED_SOURCE } from "@/lib/exam-timeline";
import { anthropic, MODEL, cachedSystem } from "@/lib/ai/client";
import { recordAiUsage } from "@/lib/ai/usage";
import { resolveAliases } from "@/lib/exam-aliases";
import { GATES_CLOSED, examPageGates } from "@/lib/exam-page-gates";
import { askAgeSummary } from "@/lib/page-gates-copy";
import { sourceTier } from "@/lib/official-source";
import { resolveQuery } from "@/lib/search/resolve";
import { DIRECT_MIN, type PageLink, type Resolution, type SearchIndex, type SearchNotice } from "@/lib/search/types";
import { PAGE_TOOLS, examPages, findPages, looseMatches, pageFacts, searchTopics } from "@/lib/search/ask-tools";
import { localeTarget } from "@/lib/search/targets";
import { ASK_MAX_TOKENS, ASK_TIME_BUDGET_MS, ASK_TURN_CAP, ASK_WEB_MAX_USES, askFirstTurn, askSystemPrompt, isRouteOnly, prePassHits } from "@/lib/ask-prompt";
import { NEXT_MARK, PAGES_MARK, SITE, normUrl, urlsIn, validateAnswerLinks, type WebSource } from "@/lib/ask-links";

type Locale = "en" | "hi" | "te";

// ── Exam tool definitions ────────────────────────────────────────────

const EXAM_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "search_exams",
    description:
      "Search Shishya's catalogue of Indian government and entrance exams. Filter by state code (e.g. BR, MH, KA — omit for national), category (GOVT_JOBS, BANKING, CIVIL_SERVICES, TEACHING, STATE_LEVEL, ENGINEERING, MEDICAL, LAW, MBA, UNIVERSITY, OLYMPIAD), and/or a free-text keyword. The keyword matches CONTEXTUALLY, not just literally — colloquial and vernacular role words work (daroga, sipahi, steno, babu, fauj, shikshak, दरोगा, रेलवे), so pass the person's OWN words rather than translating them. Returns pattern, eligibility, approximate annual vacancies and the exam page link.",
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
      "Full detail for ONE exam by its Shishya code (from search_exams / find_pages): pattern, eligibility with the exam's own age relaxation, vacancies, upcoming dates (each tagged OFFICIAL / REPORTED / EXPECTED), declared results, cutoff guidance, the official portal, and links to the exam pages that exist.",
    input_schema: {
      type: "object",
      properties: { code: { type: "string" } },
      required: ["code"],
    },
  },
  {
    name: "search_content",
    description:
      "Text search over Shishya's exam guides (which include SALARY and career-growth sections per exam) and exam news. Use for salary questions, 'how to crack', notifications and preparation questions. Matches a phrase as typed — use one or two key words.",
    input_schema: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "get_vacancy_stats",
    description:
      "Approximate annual government-job vacancy counts tracked by Shishya — total and per exam, optionally filtered by state code. Data is at STATE level, not city level.",
    input_schema: {
      type: "object",
      properties: { state: { type: "string" } },
    },
  },
];

/** Every custom tool the model gets, in a fixed order (part of the cached prefix). */
export const ASK_TOOLS: Anthropic.Messages.Tool[] = [...EXAM_TOOLS, ...PAGE_TOOLS];

interface ToolCtx {
  index: SearchIndex;
  locale: Locale;
}

// ── Exam tool executors (raw SQL — grounded, no generation) ──────────

async function searchExams(input: { state?: string; category?: string; keyword?: string }) {
  // Contextual layer: resolve colloquial/vernacular words ("daroga",
  // "steno", "sipahi bharti") into exam codes, name fragments, a
  // category hint and a STATE ("punjab clerk", "ਪੰਜਾਬ", "meghalaya
  // psc"), OR-ed into the lexical match — the query's MEANING reaches
  // the catalog even when its words never appear in a name.
  const alias = resolveAliases(input.keyword ?? "");
  const state = input.state?.toUpperCase() || alias.state;
  const cat = input.category?.toUpperCase() || null;
  const kw = input.keyword ? `%${input.keyword}%` : null;
  const codePats = [...alias.codes].map((c) => `${c}%`);
  const namePats = [...alias.expands].map((e) => `%${e}%`);
  const aliasParts: Prisma.Sql[] = [
    ...(codePats.length ? [Prisma.sql`e.code LIKE ANY(${codePats})`] : []),
    ...(namePats.length ? [Prisma.sql`e.name ILIKE ANY(${namePats})`] : []),
    ...(alias.category ? [Prisma.sql`e.category::text = ${alias.category}`] : []),
    ...(alias.state ? [Prisma.sql`e.state = ${alias.state}`] : []),
  ];
  const aliasSql = aliasParts.length ? Prisma.join(aliasParts, " OR ") : Prisma.sql`FALSE`;
  // Alias-code hits are the most intentional matches — rank them first.
  const codeRank = codePats.length
    ? Prisma.sql`CASE WHEN e.code LIKE ANY(${codePats}) THEN 0 ELSE 1 END,`
    : Prisma.empty;

  // 25 Sep 2026: every /ask tool reads real exams only (src/lib/db/exam-scope.ts)
  // — a school class container is never offered or described as an exam.
  const rows = await prisma.$queryRaw<any[]>`
    SELECT e.code, e.name, e."shortName", e.category::text AS category, e.state,
           e."totalQuestions", e."totalMarks", e."durationMin", e."negativeMark",
           el."minAge", el."maxAge", el."educationNote", el."vacanciesApprox", el."officialName"
    FROM "Exam" e
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE ${REAL_EXAM_SQL}
      AND (${state}::text IS NULL OR e.state = ${state})
      AND (${cat}::text IS NULL OR e.category::text = ${cat})
      AND (${kw}::text IS NULL OR e.name ILIKE ${kw} OR e."shortName" ILIKE ${kw} OR (${aliasSql}))
    ORDER BY ${codeRank} el."vacanciesApprox" DESC NULLS LAST
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
    link: `${SITE}/exams/${r.code}`,
  }));
}

/** The exam's page links: from the search index's facts (the sitemap's own gates, PYQ years, notes) when present, else the gate loader. */
async function examLinks(code: string, ctx: ToolCtx | null): Promise<Record<string, string>> {
  if (ctx?.index.exams[code]) return Object.fromEntries(examPages(ctx.index, code, ctx.locale).map((p) => [p.key, p.url]));
  // Links only to pages that render; a failed gate read links none of them (16 Sep 2026).
  const gates = await examPageGates(code, GATES_CLOSED);
  return {
    hub: `${SITE}/exams/${code}`,
    dates: `${SITE}/exams/${code}/updates`,
    checklist: `${SITE}/exams/${code}/checklist`,
    ...(gates.syllabus ? { syllabus: `${SITE}/exams/${code}/syllabus` } : {}),
    ...(gates.cutoff ? { cutoff: `${SITE}/exams/${code}/cutoff` } : {}),
    ...(gates.tricks ? { tricks: `${SITE}/exams/${code}/tricks` } : {}),
    ...(gates.guide ? { guide: `${SITE}/exams/${code}/guide` } : {}),
    ...(gates.buildMock ? { "build-mock": `${SITE}/exams/${code}/build-mock` } : {}),
  };
}

async function getExamDetails(input: { code: string }, ctx: ToolCtx | null) {
  const code = String(input?.code ?? "").toUpperCase();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT e.id, e.code, e.name, e."shortName", e.category::text AS category, e.state,
           e."totalQuestions", e."totalMarks", e."marksPerQ", e."durationMin", e."negativeMark",
           el."minAge", el."maxAge", el."ageRelaxation", el."educationNote", el."vacanciesApprox",
           el."eligibilityNote", el."officialUrl", el."officialName",
           cc.content AS cutoff
    FROM "Exam" e
    LEFT JOIN "ExamEligibility" el ON el."examId" = e.id
    LEFT JOIN "ExamCategoryCutoff" cc ON cc."examId" = e.id
    WHERE e.code = ${code} AND ${REAL_EXAM_SQL} LIMIT 1`;
  const e = rows[0];
  if (!e) return { error: "exam not found — use search_exams or find_pages first" };
  const [dates, results, links] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT label, date, confidence, url FROM "ExamImportantDate"
      WHERE "examId" = ${e.id} AND "archivedAt" IS NULL AND date > NOW() - INTERVAL '30 days'
      ORDER BY date ASC LIMIT 6`,
    prisma.$queryRaw<any[]>`
      SELECT stage, headline, "declaredOn" FROM "ExamResult"
      WHERE "examId" = ${e.id} AND stage <> '__not_a_result__'
      ORDER BY "declaredOn" DESC LIMIT 3`,
    examLinks(e.code, ctx),
  ]);
  return {
    code: e.code,
    name: e.name,
    short: e.shortName,
    category: e.category,
    state: e.state ?? "national",
    pattern: `${e.totalQuestions} questions, ${e.totalMarks} marks, ${e.durationMin} min, negative ${e.negativeMark}/wrong`,
    // The exam's own stored relaxation (16 Sep 2026) — the hard-coded central
    // "OBC +3, SC/ST +5" was printed for every exam, 112 state exams among them.
    age: askAgeSummary(e.minAge, e.maxAge, e.ageRelaxation),
    education: e.educationNote,
    vacanciesApprox: e.vacanciesApprox,
    eligibilityNote: e.eligibilityNote,
    official: e.officialUrl ? `${e.officialName ?? ""} ${e.officialUrl}` : e.officialName,
    cutoffGuidance: e.cutoff ? String(e.cutoff).slice(0, 1200) : null,
    // 24 Sep 2026: each date carries its tier (same rule as the tracker), and a
    // passed estimate is dropped — it was never announced and its day is gone.
    upcomingDates: dates.flatMap((d) => {
      const tier = sourceTier(d.confidence, d.url, e.officialUrl);
      if (tier === "expected" && d.date.getTime() < Date.now()) return [];
      const tag =
        tier === "official"
          ? "OFFICIAL (announced by the conducting body)"
          : tier === "reported"
            ? "REPORTED by a secondary source, not yet on the official site"
            : "EXPECTED — Shishya's estimate, NOT announced; never state it as the date";
      return [`${d.date.toISOString().slice(0, 10)}: ${d.label} [${tag}]`];
    }),
    recentResults: results.map((r) => `${r.declaredOn.toISOString().slice(0, 10)}: ${r.stage} — ${r.headline}`),
    links,
  };
}

async function searchContent(input: { query: string }, ctx: ToolCtx | null) {
  const q = `%${String(input?.query ?? "").slice(0, 120)}%`;
  const [guides, news] = await Promise.all([
    prisma.$queryRaw<any[]>`
      SELECT e.code, e."shortName", LEFT(g.content, 1500) AS excerpt
      FROM "ExamGuide" g JOIN "Exam" e ON e.id = g."examId"
      WHERE g.content ILIKE ${q} AND ${REAL_EXAM_SQL} LIMIT 4`,
    prisma.$queryRaw<any[]>`
      SELECT e.code, n.title, LEFT(n.body, 400) AS excerpt, n."publishedAt"
      FROM "ExamNewsItem" n JOIN "Exam" e ON e.id = n."examId"
      WHERE (n.title ILIKE ${q} OR n.body ILIKE ${q}) AND n.source IS DISTINCT FROM ${SUPPRESSED_SOURCE} AND ${NOT_SCHOOL_SQL}
      ORDER BY n."publishedAt" DESC LIMIT 4`,
  ]);
  // The guide page renders only behind its gate; the hub otherwise.
  const guideLink = (code: string) => (ctx && ctx.index.exams[code] && !ctx.index.exams[code].gates.guide ? `${SITE}/exams/${code}` : `${SITE}/exams/${code}/guide`);
  return {
    guides: guides.map((g) => ({ exam: g.shortName, excerpt: g.excerpt, link: guideLink(g.code) })),
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
    WHERE ${REAL_EXAM_SQL} AND el."vacanciesApprox" IS NOT NULL
      AND (${state}::text IS NULL OR e.state = ${state} OR e.state IS NULL)
    ORDER BY el."vacanciesApprox" DESC LIMIT 20`;
  // 26 Sep 2026 (integrator): totalApprox was the sum of the 20 rows above,
  // described as the total across tracked exams — an undercount the model
  // then stated as grounded. The total and the count now cover every row.
  const [agg] = await prisma.$queryRaw<{ n: bigint | number; total: bigint | number | null }[]>`
    SELECT COUNT(*) AS n, SUM(el."vacanciesApprox") AS total
    FROM "Exam" e JOIN "ExamEligibility" el ON el."examId" = e.id
    WHERE ${REAL_EXAM_SQL} AND el."vacanciesApprox" IS NOT NULL
      AND (${state}::text IS NULL OR e.state = ${state} OR e.state IS NULL)`;
  const examsWithFigure = Number(agg?.n ?? 0);
  const total = Number(agg?.total ?? 0);
  const scope = state
    ? `Vacancies are tracked at STATE level. Counting ${state}-specific exams plus national exams open to ${state} candidates.`
    : "Approximate annual vacancies across tracked exams.";
  return {
    note: `${scope} totalApprox sums all ${examsWithFigure} exams with a vacancy figure; the list shows the ${rows.length} largest.`,
    totalApprox: total,
    examsWithFigure,
    exams: rows.map((r) => ({
      exam: r.shortName,
      state: r.state ?? "national",
      vacanciesApprox: r.vacanciesApprox,
      link: `${SITE}/exams/${r.code}`,
    })),
  };
}

/** exam_page_facts: the index's view of an exam's pages, plus the two DB facts it does not carry. */
async function examPageFacts(input: { code?: unknown }, ctx: ToolCtx) {
  const code = String(input?.code ?? "").toUpperCase().replace(/[^A-Z0-9_]/g, "");
  const facts = ctx.index.exams[code];
  if (!facts) return { error: "unknown exam code — get it from search_exams or find_pages first" };
  const rows = await prisma.$queryRaw<{ fullPattern: boolean; paperYears: string[] | null }[]>`
    SELECT
      EXISTS (SELECT 1 FROM "Mock" m WHERE m."examId" = e.id AND m."userId" IS NULL AND m."generatedBy" = 'system:full-pattern-v1') AS "fullPattern",
      ARRAY(
        SELECT DISTINCT p.year FROM "OfficialPaper" p
        WHERE p."examId" = e.id AND p."archivedAt" IS NULL AND p.kind NOT IN ('answer key', 'listing page')
        ORDER BY p.year DESC
      ) AS "paperYears"
    FROM "Exam" e
    WHERE e.code = ${code} AND ${REAL_EXAM_SQL}
    LIMIT 1`;
  const r = rows[0];
  return {
    code,
    pages: examPages(ctx.index, code, ctx.locale),
    pyqPracticeYears: facts.pyqYears,
    pyqNote: "PYQ-pattern practice sets are freshly worded in that year's pattern — never call one the original paper.",
    officialPaperYears: r?.paperYears ?? [],
    officialPapersWhere: r?.paperYears?.length ? `the "Official papers" block on ${SITE}/exams/${code}` : null,
    fullPatternMock: r?.fullPattern ?? null,
    topicNotes: facts.topicNotes,
  };
}

async function runTool(name: string, input: any, ctx: ToolCtx): Promise<unknown> {
  try {
    switch (name) {
      case "search_exams":
        return await searchExams(input ?? {});
      case "get_exam_details":
        return await getExamDetails(input ?? {}, ctx);
      case "search_content":
        return await searchContent(input ?? {}, ctx);
      case "get_vacancy_stats":
        return await getVacancyStats(input ?? {});
      case "find_pages":
        return findPages(ctx.index, input ?? {}, ctx.locale);
      case "page_facts":
        return pageFacts(ctx.index, input ?? {}, ctx.locale);
      case "exam_page_facts":
        return await examPageFacts(input ?? {}, ctx);
      case "search_topics":
        return searchTopics(ctx.index, input ?? {}, ctx.locale);
      default:
        return { error: "unknown tool" };
    }
  } catch {
    return { error: "tool failed — answer with what you have" };
  }
}

// ── The engine ───────────────────────────────────────────────────────

export type AskVia = "strip" | "page" | "ask-page" | "button" | "cron";

export interface AskOptions {
  /** The search resolution of this question (deep index). Computed here when absent. */
  resolution?: Resolution;
  /** The deep search index. Loaded here when absent. */
  index?: SearchIndex;
  /** The page the search started on (/hi/ask → "hi"): twin links keep the prefix. */
  locale?: Locale;
  via?: AskVia;
  /** The request's signal: a closed tab stops the model call. */
  signal?: AbortSignal;
}

export interface AskResult {
  answer: string;
  usedWeb: boolean;
  toolsUsed: string[];
  /** Checked Shishya pages the answer links, in order (the /ask panel's "Pages on Shishya"). */
  pages: PageLink[];
  /** The same list (the contract's older name). */
  links: PageLink[];
  /** The one page to open now. */
  next: PageLink | null;
  webSources: WebSource[];
  turns: number;
  latencyMs: number;
  costUsd: number;
  notice?: SearchNotice;
}

const CANNED_LONG =
  "That took more digging than expected — the pages below are the closest Shishya has. Try a slightly more specific question (the class, exam or state).";

function toPageLink(h: { url: string; label: string; section: PageLink["section"]; status?: PageLink["status"] }): PageLink {
  return { url: h.url, label: h.label, section: h.section, ...(h.status ? { status: h.status } : {}) };
}

/** The answer text of the final response: what follows the last web-search block (earlier text is narration). */
export function finalText(content: readonly any[]): string {
  let lastServer = -1;
  content.forEach((b, i) => {
    if (b?.type === "server_tool_use" || b?.type === "web_search_tool_result") lastServer = i;
  });
  let blocks = content.slice(lastServer + 1).filter((b) => b?.type === "text" && typeof b.text === "string");
  if (blocks.length === 0) blocks = content.filter((b) => b?.type === "text" && typeof b.text === "string");
  // Cited fragments of one sentence arrive as separate blocks: they join as
  // written. Separate plain blocks are separate paragraphs.
  let out = "";
  let prevCited = false;
  for (const b of blocks) {
    const cited = Array.isArray(b.citations) && b.citations.length > 0;
    if (!out) out = b.text;
    else if (cited || prevCited || /\s$/.test(out) || /^[\s,.;:!?)]/.test(b.text)) out += b.text;
    else out += `\n\n${b.text}`;
    prevCited = cited;
  }
  out = out.trim();
  // Leading narration that slipped through ("Let me search…").
  const paras = out.split(/\n{2,}/);
  while (paras.length > 1 && paras[0].length < 200 && /^(let me|i['’]ll|i will|searching|checking|first,? let)/i.test(paras[0].trim())) paras.shift();
  return paras.join("\n\n").trim();
}

/** Web sources the model cited (text-block citations of the server web search). */
function citationsOf(content: readonly any[]): WebSource[] {
  const out: WebSource[] = [];
  for (const b of content) {
    if (b?.type !== "text" || !Array.isArray(b.citations)) continue;
    for (const c of b.citations) {
      if (typeof c?.url === "string" && /^https?:\/\//.test(c.url)) out.push({ title: String(c.title ?? "").slice(0, 120) || new URL(c.url).hostname, url: c.url });
    }
  }
  return out;
}

async function loadDeepIndex(): Promise<SearchIndex> {
  // Imported on demand: the loader is server-only (next/cache), and callers
  // that already hold an index (the route, scripts) never load it.
  const { loadSearchIndex } = await import("@/lib/search/index-build");
  return loadSearchIndex("deep");
}

/**
 * The facts of the confident top page, looked up before the first turn. A
 * route-only school answer gets its chapter page's facts (status, official
 * book and chapter PDF) whatever the score — they are static and they are
 * the whole answer.
 */
async function prefetchFor(r: Resolution, ctx: ToolCtx, routeOnly: boolean): Promise<unknown> {
  const chapter = routeOnly ? prePassHits(r).find((h) => h.kind === "school-chapter") : undefined;
  if (chapter) return runTool("page_facts", { url: `${SITE}${chapter.url}` }, ctx);
  const top = r.best ?? r.hits[0];
  if (!top || top.score < DIRECT_MIN) return undefined;
  const code = /^\/(?:(?:hi|te)\/)?exams\/([A-Z0-9_]+)(?:[/#?]|$)/.exec(top.url)?.[1];
  if (top.kind === "exam" && code) return runTool("get_exam_details", { code }, ctx);
  if (top.kind === "topic-note") return undefined;
  return runTool("page_facts", { url: `${SITE}${top.url}` }, ctx);
}

export async function runAsk(question: string, opts: AskOptions = {}): Promise<AskResult> {
  const t0 = Date.now();
  const q = String(question ?? "").slice(0, 800);
  const locale: Locale = opts.locale ?? "en";
  const index = opts.index ?? (await loadDeepIndex());
  const resolution = opts.resolution ?? resolveQuery(q, index, { pageLocale: locale });
  const pre = prePassHits(resolution).map(toPageLink);
  // Nothing from the resolver: pages whose name shares a word with the question (ask-tools looseMatches).
  const loose = pre.length === 0 ? looseMatches(index, q).map((d) => ({ label: d.title, url: localeTarget(d.path, locale), section: d.section, sub: d.sub })) : [];
  const closest: PageLink[] = pre.length ? pre : loose.map(toPageLink);
  const fallback = closest[0] ?? toPageLink(resolution.fallback);
  const toolsUsed: string[] = [];
  let usedWeb = false;
  let turns = 0;
  let costUsd = 0;

  const done = (answer: string, extra: Partial<AskResult> = {}): AskResult => {
    const pages = extra.pages ?? closest.slice(0, 3);
    return {
      answer,
      usedWeb,
      toolsUsed,
      pages,
      links: pages,
      next: extra.next !== undefined ? extra.next : (pages[0] ?? fallback),
      webSources: extra.webSources ?? [],
      turns,
      latencyMs: Date.now() - t0,
      costUsd: Math.round(costUsd * 10000) / 10000,
      ...(extra.notice ? { notice: extra.notice } : {}),
    };
  };

  // Class 1-7: pages only, never a model call (the 25 Sep minors decision).
  if (resolution.schoolScope === "class1to7") return done("", { notice: "no-ai-young-class" });

  const ctx: ToolCtx = { index, locale };
  const routeOnly = isRouteOnly(resolution);
  const prefetch = await prefetchFor(resolution, ctx, routeOnly);
  const first = askFirstTurn(q, resolution, { routeOnly, prefetch, loose });

  // Outside URLs this run met (tool results, web results, citations): the only
  // outside links the answer may keep. 26 Sep 2026 (search fixer): seeded from
  // the prefetched facts only — never from the first turn, which carries the
  // typed question, so a link the person pasted ("is https://fake.example/form
  // the real form?") is not "seen" and never survives as a live link.
  const seen = new Set<string>(prefetch === undefined ? [] : urlsIn(JSON.stringify(prefetch)));
  const cited: WebSource[] = [];

  const messages: Anthropic.Messages.MessageParam[] = [{ role: "user", content: first }];
  // any[]: the installed SDK's Tool union predates the server-side
  // web_search tool type (same workaround as exam-info.ts) — the API
  // itself accepts and executes it.
  const tools: any[] = [...ASK_TOOLS, { type: "web_search_20250305", name: "web_search", max_uses: ASK_WEB_MAX_USES }];
  const system = cachedSystem(askSystemPrompt());
  let final: Anthropic.Messages.Message | null = null;

  for (let turn = 0; turn < ASK_TURN_CAP; turn++) {
    // The last turn — by count, or by the time budget — must answer with what it has.
    const lastTurn = turn === ASK_TURN_CAP - 1 || Date.now() - t0 > ASK_TIME_BUDGET_MS;
    const t = Date.now();
    const res = await anthropic.messages.create(
      {
        model: MODEL,
        max_tokens: ASK_MAX_TOKENS,
        system,
        messages,
        tools,
        ...(lastTurn ? { tool_choice: { type: "none" as const } } : {}),
      },
      { signal: opts.signal },
    );
    turns++;
    costUsd += recordAiUsage("ask", res, { model: MODEL, latencyMs: Date.now() - t });

    for (const b of res.content as any[]) {
      if (b?.type === "server_tool_use" || b?.type === "web_search_tool_result") {
        usedWeb = true;
        if (!toolsUsed.includes("web_search")) toolsUsed.push("web_search");
      }
      // A search result list (an error result is an object, not a list).
      if (b?.type === "web_search_tool_result" && Array.isArray(b.content)) {
        for (const w of b.content) if (typeof w?.url === "string") seen.add(w.url);
      }
    }
    for (const c of citationsOf(res.content)) {
      seen.add(c.url);
      cited.push(c);
    }

    // The server paused its own web-search loop: send the turn back as is and it
    // resumes. (The installed SDK's StopReason union predates "pause_turn".)
    if ((res.stop_reason as string | null) === "pause_turn") {
      messages.push({ role: "assistant", content: res.content });
      continue;
    }
    const toolCalls = res.content.filter((b): b is Anthropic.Messages.ToolUseBlock => b.type === "tool_use");
    if (toolCalls.length === 0 || res.stop_reason !== "tool_use") {
      final = res;
      break;
    }

    messages.push({ role: "assistant", content: res.content });
    const results = await Promise.all(
      toolCalls.map(async (tc) => {
        if (!toolsUsed.includes(tc.name)) toolsUsed.push(tc.name);
        const text = JSON.stringify(await runTool(tc.name, tc.input, ctx)) ?? "null";
        for (const u of urlsIn(text)) seen.add(u);
        return { type: "tool_result" as const, tool_use_id: tc.id, content: text.slice(0, 12_000) };
      }),
    );
    messages.push({ role: "user", content: results });
  }

  const raw = final ? finalText(final.content) : "";
  if (!raw) return done(CANNED_LONG);

  const checked = validateAnswerLinks(raw, index, seen, { fallback });
  let answer = checked.answer;
  let pages = checked.pages;
  let next = checked.next;
  // The prompt asks for 1-3 pages; when the model named none, the resolver's
  // closest pages are added as the block (labels are page names, so the block
  // needs no language of its own).
  if (pages.length === 0 && closest.length > 0) {
    pages = closest.slice(0, 3);
    next = pages[0];
    answer = `${answer}\n\n${PAGES_MARK}\n${pages.map((p) => `- [${p.label}](${SITE}${p.url})`).join("\n")}\n${NEXT_MARK} [${next.label}](${SITE}${next.url})`;
  }
  const webSeen = new Set(checked.webSources.map((w) => normUrl(w.url)));
  const webSources = [...checked.webSources];
  for (const c of cited) {
    if (webSources.length >= 6) break;
    if (webSeen.has(normUrl(c.url))) continue;
    webSeen.add(normUrl(c.url));
    webSources.push(c);
  }
  return done(answer, { pages, next, webSources });
}
