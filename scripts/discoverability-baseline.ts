// scripts/discoverability-baseline.ts
//
// Weekly discoverability read (26 Sep 2026). READ-ONLY: every statement
// below is a SELECT. No writes, no cron, no external calls, no AI calls.
//
// Why: on 26 Sep 2026 Shishya became one free place to study with
// independent sections (school, entrance exams, government exams, colleges
// and scholarships, careers). The founder's question: "is every section
// searchable and coming up for live users on Google, ChatGPT, Gemini and
// the other agents?" Rankings are not ours to control; what we can see is
// (1) whether crawlers fetch each section, (2) whether people asking an AI
// assistant get a Shishya page opened for them, and (3) where real people
// land from each source. This prints those three reads for the last N days
// against the N days before, with the section split the site uses
// (src/lib/exam-kind.ts decides entrance vs government for exam pages).
//
// It reuses the crawler-reality lens of 26 Sep 2026 (scripts/tmp-disc-crawl.ts):
// the same probe-burst filter, the same first-landing definition and the
// same source rules.
//
// Measurement notes (read before comparing weeks):
// - BotVisit rows exist only for paths the middleware matcher covers
//   (src/middleware.ts). Until the 26 Sep 2026 discoverability deploy the
//   matcher skipped every sub-page of /schooling, /colleges, /scholarships,
//   /careers, /career-map, /for, /worldwide, /insights and /jobs, and
//   /context.md. A 0 for those families before that deploy means "not
//   measured", not "not fetched" — see the "first logged" column.
// - BotVisit paths are locale-stripped (/hi and /te twins count as English).
// - Probe bursts (>= 3 distinct bot names on the same path in the same
//   minute) are our own curl checks and are excluded.
// - A human landing = the first PAGE_VIEW of an anonymous id (client is not
//   'bot'), looked up 31 days before the window so a returning visitor is
//   not counted again. Direct first hits with no cookie, referrer or utm
//   carry no anonId and are not counted (same blind spot as the lens).
// - ChatGPT arrivals carry utm_source=chatgpt.com and no referrer; "Bing
//   family" = Bing, Yahoo and DuckDuckGo (all on Bing's index).
//
// USAGE (from the repo root):
//   npx tsx --env-file=.env.local scripts/discoverability-baseline.ts
//   npx tsx --env-file=.env.local scripts/discoverability-baseline.ts --days 7 --end 2026-10-03T12:00:00Z
//
// --days N   window length in days (default 7, max 60): last N days vs the N before.
// --end ISO  end of the window (default: the DB's NOW()).

import { PrismaClient } from "@prisma/client";
import { examKind } from "../src/lib/exam-kind";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

// ── Families ─────────────────────────────────────────────────────────────

/** SQL: a fine family for a (locale-stripped) path. 'exam' rows are split
 *  into entrance / government in JS with the exam code. */
const fam = (col: string) => `CASE
  WHEN ${col} = '/robots.txt' THEN 'm:robots.txt'
  WHEN ${col} = '/sitemap.xml' THEN 'm:sitemap.xml'
  WHEN ${col} IN ('/llms.txt', '/llms-full.txt') THEN 'm:llms'
  WHEN ${col} ~ '^/exams/[^/]+/context\\.md$' THEN 'm:context.md exam'
  WHEN ${col} ~ '/context\\.md$' THEN 'm:context.md other'
  WHEN ${col} = '/' THEN 'home'
  WHEN ${col} ~ '^/exams/entrance/?$' THEN 'entrance:landing'
  WHEN ${col} ~ '^/exams/state(/|$)' THEN 'gov:state'
  WHEN ${col} ~ '^/exams/browse' THEN 'exam-index'
  WHEN ${col} ~ '^/exams/[^/]+' THEN 'exam'
  WHEN ${col} ~ '^/current-affairs' THEN 'current-affairs'
  WHEN ${col} ~ '^/(exam-calendar|results|live-test|jobs-map|find-your-exam|typing|descriptive|revision|coach|mentors)(/|$)' THEN 'exam-index'
  WHEN ${col} ~ '^/schooling(/|$)' THEN 'school'
  WHEN ${col} ~ '^/(colleges|scholarships|distance-learning|worldwide)(/|$)' THEN 'colleges'
  WHEN ${col} ~ '^/(careers|career-map|jobs|post-graduation)(/|$)' THEN 'careers'
  WHEN ${col} ~ '^/(for|insights|alumni-stories|soft-skills)(/|$)' THEN 'guides'
  WHEN ${col} ~ '^/ask(/|$)' THEN 'ask'
  WHEN ${col} ~ '^/(about|pricing|educators|editorial-policy|contact|terms|privacy|refunds|verification|recognition|ideas)(/|$)' THEN 'about'
  WHEN ${col} ~ '^/(mocks|c|g|share)/' THEN 'share'
  WHEN ${col} ~ '^/(login|logout|dashboard|me|today|onboarding|chat|attempts|mentor)(/|$)' THEN 'app'
  ELSE 'other' END`;
const strip = (col: string) => `regexp_replace(${col}, '^/(hi|te)(/|$)', '/')`;
const codeOf = (col: string) => `upper(substring(${col} from '^/exams/([A-Za-z0-9_]+)'))`;

const SECTION_ORDER = [
  "Home /",
  "School",
  "Entrance exams",
  "Government exams",
  "Other exams (CA/CS Foundation)",
  "Exam pages, unknown code",
  "Current affairs",
  "Exam indexes & tools",
  "Colleges & scholarships",
  "Careers",
  "Guides (/for, /insights)",
  "Ask Shishya",
  "About & trust pages",
  "robots.txt",
  "sitemap.xml",
  "llms.txt + llms-full.txt",
  "context.md (exam)",
  "context.md (platform, sections, school)",
  "Share / challenge links",
  "App & sign-in",
  "Other",
];

function section(f: string, code: string | null, kinds: Map<string, string>): string {
  switch (f) {
    case "home": return "Home /";
    case "school": return "School";
    case "entrance:landing": return "Entrance exams";
    case "gov:state": return "Government exams";
    case "exam": {
      const k = code ? kinds.get(code) : undefined;
      if (k === "entrance" || k === "olympiad") return "Entrance exams";
      if (k === "government") return "Government exams";
      if (k === "professional") return "Other exams (CA/CS Foundation)";
      return "Exam pages, unknown code";
    }
    case "current-affairs": return "Current affairs";
    case "exam-index": return "Exam indexes & tools";
    case "colleges": return "Colleges & scholarships";
    case "careers": return "Careers";
    case "guides": return "Guides (/for, /insights)";
    case "ask": return "Ask Shishya";
    case "about": return "About & trust pages";
    case "m:robots.txt": return "robots.txt";
    case "m:sitemap.xml": return "sitemap.xml";
    case "m:llms": return "llms.txt + llms-full.txt";
    case "m:context.md exam": return "context.md (exam)";
    case "m:context.md other": return "context.md (platform, sections, school)";
    case "share": return "Share / challenge links";
    case "app": return "App & sign-in";
    default: return "Other";
  }
}

const CRAWLER_FAMILY: Record<string, string> = {
  Googlebot: "Google", GoogleOther: "Google", "Google-Extended": "Google",
  Bingbot: "Bing",
  "OAI-SearchBot": "OpenAI search",
  GPTBot: "OpenAI training",
  ClaudeBot: "Anthropic", "Claude-SearchBot": "Anthropic",
  PerplexityBot: "Perplexity",
  Applebot: "Apple",
  Meta: "Meta",
  Amazonbot: "Amazon",
};
const CRAWLER_COLS = ["Google", "Bing", "OpenAI search", "OpenAI training", "Anthropic", "Perplexity", "Apple", "Meta", "Amazon", "other"];
/** Fetches a person triggered by asking an AI assistant (not crawls). */
const USER_AGENTS = ["ChatGPT-User", "Perplexity-User", "Claude-User", "MistralAI-User"];

const SRC = `CASE
  WHEN utm ~* 'chatgpt|openai' OR ref ~* 'chatgpt\\.com|openai\\.com' THEN 'ChatGPT'
  WHEN utm ~* 'gemini|bard' OR ref ~* 'gemini\\.google|bard\\.google' THEN 'Gemini'
  WHEN utm ~* 'perplexity' OR ref ~* 'perplexity' THEN 'Perplexity'
  WHEN utm ~* 'copilot|claude' OR ref ~* 'copilot|claude\\.ai' THEN 'Copilot/Claude'
  WHEN ref ~* 'bing\\.|duckduckgo|yahoo' THEN 'Bing family'
  WHEN ref ~* '(^|\\.)google\\.|googlequicksearchbox' THEN 'Google'
  WHEN ref ~* 'yandex|ecosia|brave|search\\.' THEN 'other search'
  WHEN utm ~* 'whatsapp|telegram|youtube|facebook|instagram|twitter|reddit|linkedin' OR ref ~* 'whatsapp|telegram|t\\.me|youtube|facebook|instagram|x\\.com|twitter|t\\.co|reddit|linkedin' THEN 'social/share'
  WHEN utm IS NOT NULL OR ref IS NOT NULL OR med IS NOT NULL THEN 'other'
  ELSE 'direct/none' END`;
const SRC_COLS = ["ChatGPT", "Gemini", "Perplexity", "Copilot/Claude", "Bing family", "Google", "other search", "social/share", "other", "direct/none"];

// ── Output ───────────────────────────────────────────────────────────────

type Win = "last" | "prior";
type Cell = { last: number; prior: number };
type Row = { r: string; c: string; w: Win; n: number };

const add = (a: Cell, b: Cell): Cell => ({ last: a.last + b.last, prior: a.prior + b.prior });
const ZERO: Cell = { last: 0, prior: 0 };
const fmt = (v: Cell) => (v.last === 0 && v.prior === 0 ? "·" : `${v.last.toLocaleString("en-IN")} / ${v.prior.toLocaleString("en-IN")}`);

function table(title: string, rows: Row[], cols: string[], rowOrder: string[], extra?: Map<string, string>, extraHead?: string) {
  const cell = new Map<string, Cell>();
  const get = (k: string): Cell => cell.get(k) ?? ZERO;
  for (const x of rows) {
    const k = `${x.r}|${x.c}`;
    const v = { ...get(k) };
    v[x.w] += x.n;
    cell.set(k, v);
  }
  const sum = (keys: string[]): Cell => keys.reduce((a, k) => add(a, get(k)), ZERO);
  const present = new Set(rows.map((x) => x.r));
  const order = [...rowOrder.filter((r) => present.has(r) || extra?.has(r)), ...[...present].filter((r) => !rowOrder.includes(r))];
  console.log(`\n### ${title}`);
  console.log("Cells: last window / the window before. '·' = none in either.");
  console.log(`| family | ${cols.join(" | ")} | total |${extraHead ? ` ${extraHead} |` : ""}`);
  console.log(`|---|${cols.map(() => "---:").join("|")}|---:|${extraHead ? "---|" : ""}`);
  for (const r of order) {
    const tot = sum(cols.map((c) => `${r}|${c}`));
    console.log(`| ${r} | ${cols.map((c) => fmt(get(`${r}|${c}`))).join(" | ")} | ${fmt(tot)} |${extraHead ? ` ${extra?.get(r) ?? "never"} |` : ""}`);
  }
  const colTot = cols.map((c) => sum(order.map((r) => `${r}|${c}`)));
  console.log(`| **total** | ${colTot.map(fmt).join(" | ")} | ${fmt(colTot.reduce(add, ZERO))} |${extraHead ? " |" : ""}`);
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const days = Math.max(1, Math.min(60, Number(arg("days") ?? 7) || 7));
  const [{ now }] = await prisma.$queryRawUnsafe<{ now: Date }[]>(`SELECT NOW() AS now`);
  const endArg = arg("end");
  const end = endArg ? new Date(endArg) : new Date(now);
  if (Number.isNaN(end.getTime())) throw new Error(`--end is not a date: ${endArg}`);
  const DAY = 24 * 60 * 60 * 1000;
  const lastStart = new Date(end.getTime() - days * DAY);
  const priorStart = new Date(end.getTime() - 2 * days * DAY);
  const iso = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

  console.log(`# Shishya discoverability read (read-only)`);
  console.log(`DB now ${iso(new Date(now))} UTC. Last window: ${iso(lastStart)} → ${iso(end)} UTC (${days} days). Window before: ${iso(priorStart)} → ${iso(lastStart)} UTC.`);

  // Exam kinds (entrance vs government) — the site's own rule.
  const exams = await prisma.$queryRawUnsafe<{ code: string; category: string }[]>(
    `SELECT code, category::text AS category FROM "Exam" WHERE category::text <> 'SCHOOL_BOARD'`,
  );
  const kinds = new Map(exams.map((e) => [e.code.toUpperCase(), examKind(e)]));

  // 1 + 2. BotVisit in both windows, probe bursts excluded.
  const bv = await prisma.$queryRawUnsafe<{ w: Win; bot: string; f: string; code: string | null; n: number }[]>(`
    WITH v AS (SELECT bot, path, at FROM "BotVisit" WHERE at >= $1::timestamptz AND at < $3::timestamptz),
    burst AS (SELECT path, date_trunc('minute', at) AS m FROM v GROUP BY 1, 2 HAVING COUNT(DISTINCT bot) >= 3)
    SELECT CASE WHEN v.at >= $2::timestamptz THEN 'last' ELSE 'prior' END AS w, v.bot, ${fam("v.path")} AS f, ${codeOf("v.path")} AS code, COUNT(*)::int AS n
    FROM v LEFT JOIN burst b ON b.path = v.path AND b.m = date_trunc('minute', v.at)
    WHERE b.path IS NULL
    GROUP BY 1, 2, 3, 4`, priorStart, lastStart, end);
  const bursts = await prisma.$queryRawUnsafe<{ w: Win; n: number }[]>(`
    WITH v AS (SELECT bot, path, at FROM "BotVisit" WHERE at >= $1::timestamptz AND at < $3::timestamptz),
    burst AS (SELECT path, date_trunc('minute', at) AS m, COUNT(*)::int AS n FROM v GROUP BY 1, 2 HAVING COUNT(DISTINCT bot) >= 3)
    SELECT CASE WHEN m >= $2::timestamptz THEN 'last' ELSE 'prior' END AS w, SUM(n)::int AS n FROM burst GROUP BY 1`, priorStart, lastStart, end);
  // When each section first appears in BotVisit at all (measurement start).
  const first = await prisma.$queryRawUnsafe<{ f: string; code: string | null; first: Date }[]>(`
    SELECT ${fam("path")} AS f, ${codeOf("path")} AS code, MIN(at) AS first FROM "BotVisit" WHERE at < $1::timestamptz GROUP BY 1, 2`, end);
  const firstBySection = new Map<string, Date>();
  for (const x of first) {
    const s = section(x.f, x.code, kinds);
    const d = new Date(x.first);
    const cur = firstBySection.get(s);
    if (!cur || d < cur) firstBySection.set(s, d);
  }
  const firstCol = new Map([...firstBySection].map(([s, d]) => [s, d.toISOString().slice(0, 10)]));

  const crawlRows: Row[] = [];
  const userRows: Row[] = [];
  const perBot = new Map<string, Cell>();
  for (const x of bv) {
    const s = section(x.f, x.code, kinds);
    const pb = { ...(perBot.get(x.bot) ?? ZERO) };
    pb[x.w] += x.n;
    perBot.set(x.bot, pb);
    if (USER_AGENTS.includes(x.bot)) userRows.push({ r: s, c: x.bot, w: x.w, n: x.n });
    else crawlRows.push({ r: s, c: CRAWLER_FAMILY[x.bot] ?? "other", w: x.w, n: x.n });
  }

  console.log(`\n## 1. Crawler fetches by section × crawler family (BotVisit)`);
  const bl = bursts.find((b) => b.w === "last")?.n ?? 0;
  const bp = bursts.find((b) => b.w === "prior")?.n ?? 0;
  console.log(`Probe-burst rows excluded (our own curl checks): ${bl} / ${bp}. 'first logged' = the first BotVisit row ever for that section; before it the section was not measured.`);
  const otherBots = [...perBot.keys()].filter((b) => !CRAWLER_FAMILY[b] && !USER_AGENTS.includes(b)).sort();
  console.log(`Crawler families: Google = Googlebot, GoogleOther, Google-Extended · Anthropic = ClaudeBot, Claude-SearchBot · other = ${otherBots.join(", ") || "none"}.`);
  table("Crawler fetches", crawlRows, CRAWLER_COLS, SECTION_ORDER, firstCol, "first logged");
  console.log(`\nPer bot (last / before): ${[...perBot].sort((a, b) => b[1].last - a[1].last).map(([b, v]) => `${b} ${v.last}/${v.prior}`).join(" · ")}`);

  console.log(`\n## 2. AI-assistant user fetches by section (a person asked the assistant and it opened a Shishya page)`);
  table("AI-assistant user fetches", userRows, USER_AGENTS, SECTION_ORDER);
  const topUser = await prisma.$queryRawUnsafe<{ path: string; bot: string; n: number }[]>(`
    SELECT path, bot, COUNT(*)::int AS n FROM "BotVisit"
    WHERE at >= $1::timestamptz AND at < $2::timestamptz AND bot IN (${USER_AGENTS.map((b) => `'${b}'`).join(", ")})
      AND path !~ '^/exams/[^/]+(/|$)' AND path !~ '^/current-affairs'
    GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 15`, lastStart, end);
  console.log(`Pages outside the exam and current-affairs pages opened for users, last window (top 15): ${topUser.map((x) => `${x.path} [${x.bot}] ${x.n}`).join(" · ") || "none"}`);

  // 3. Human first landings. The first PAGE_VIEW of an anonId is looked up
  // 31 days before the window (the anon cookie lives <= 30 days).
  const LAND = (from: number, to: number, lookback: number) => `
    WITH firstv AS (
      SELECT DISTINCT ON ("anonId") "anonId", "createdAt", path, "utmSource" AS utm, "utmMedium" AS med, "refHost" AS ref
      FROM "AnalyticsEvent"
      WHERE kind = 'PAGE_VIEW' AND "anonId" IS NOT NULL AND client IS DISTINCT FROM 'bot' AND path IS NOT NULL
        AND "createdAt" >= $${lookback}::timestamptz AND "createdAt" < $${to}::timestamptz
      ORDER BY "anonId", "createdAt" ASC),
    land AS (SELECT *, ${SRC} AS src, ${strip("path")} AS spath FROM firstv WHERE "createdAt" >= $${from}::timestamptz)`;
  const land = await prisma.$queryRawUnsafe<{ w: Win; src: string; f: string; code: string | null; n: number }[]>(`${LAND(1, 3, 4)}
    SELECT CASE WHEN "createdAt" >= $2::timestamptz THEN 'last' ELSE 'prior' END AS w, src, ${fam("spath")} AS f, ${codeOf("spath")} AS code, COUNT(*)::int AS n
    FROM land GROUP BY 1, 2, 3, 4`, priorStart, lastStart, end, new Date(priorStart.getTime() - 31 * DAY));
  const landRows: Row[] = land.map((x) => ({ r: section(x.f, x.code, kinds), c: x.src, w: x.w, n: x.n }));
  console.log(`\n## 3. Human first landings by landing section × source (AnalyticsEvent, first PAGE_VIEW of an anonymous id)`);
  table("Human first landings", landRows, SRC_COLS, SECTION_ORDER);
  const topLand = await prisma.$queryRawUnsafe<{ path: string; src: string; n: number }[]>(`${LAND(1, 2, 3)}
    SELECT path, src, COUNT(*)::int AS n FROM land
    WHERE spath ~ '^/(schooling|colleges|scholarships|careers|career-map|jobs|distance-learning|worldwide|post-graduation|for|insights)(/|$)'
    GROUP BY 1, 2 ORDER BY 3 DESC LIMIT 20`, lastStart, end, new Date(lastStart.getTime() - 31 * DAY));
  console.log(`Landings outside the exam side, last window (top 20): ${topLand.map((x) => `${x.path} [${x.src}] ${x.n}`).join(" · ") || "none"}`);

  // 4. Sign-ups by recorded source (context for the standing rule: search
  // surface changes are the first suspect for a sign-up dip).
  const su = await prisma.$queryRawUnsafe<{ w: Win; src: string; n: number }[]>(`
    SELECT CASE WHEN "createdAt" >= $2::timestamptz THEN 'last' ELSE 'prior' END AS w,
      CASE WHEN "signupReferrerHost" ~* 'chatgpt|openai' THEN 'ChatGPT' WHEN "signupReferrerHost" ~* 'gemini' THEN 'Gemini'
           WHEN "signupReferrerHost" ~* 'perplexity' THEN 'Perplexity' WHEN "signupReferrerHost" ~* 'copilot|claude' THEN 'Copilot/Claude'
           WHEN "signupReferrerHost" ~* 'bing|duckduckgo|yahoo' THEN 'Bing family' WHEN "signupReferrerHost" ~* 'google' THEN 'Google'
           WHEN "signupReferrerHost" ~* 'shishya\\.in' THEN 'shishya.in (source lost)'
           WHEN "signupReferrerHost" = 'direct' THEN 'direct' WHEN "signupReferrerHost" IS NULL THEN 'unknown' ELSE 'other' END AS src,
      COUNT(*)::int AS n
    FROM "User" WHERE "createdAt" >= $1::timestamptz AND "createdAt" < $3::timestamptz GROUP BY 1, 2`, priorStart, lastStart, end);
  const suBy = new Map<string, Cell>();
  for (const x of su) {
    const v = { ...(suBy.get(x.src) ?? ZERO) };
    v[x.w] += x.n;
    suBy.set(x.src, v);
  }
  console.log(`\n## 4. Sign-ups by recorded source (User.signupReferrerHost)`);
  console.log(`| source | last / before |\n|---|---:|`);
  for (const [s, v] of [...suBy].sort((a, b) => b[1].last - a[1].last)) console.log(`| ${s} | ${fmt(v)} |`);
  console.log(`| **total** | ${fmt([...suBy.values()].reduce(add, ZERO))} |`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
