// Baseline (15 Sep 2026) for the "both names" PYQ change: people who landed
// on PYQ surfaces, by channel, per IST day. Read-only.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const human = `(e.client IS NULL OR e.client = 'browser')`;
const ist = (c: string) => `(${c} + interval '330 minutes')`;
const since = `('2026-09-01'::date::timestamp - interval '330 minutes')`;
const isPyq = (p: string) => `(${p} ~ '/pyq(/|$)' OR ${p} ~ '/papers(/|$)')`;

async function main() {
  const rows = await prisma.$queryRawUnsafe<any[]>(`
    WITH firsts AS (
      SELECT DISTINCT ON (COALESCE(e."userId", e."anonId")) COALESCE(e."userId", e."anonId") AS who, e."createdAt" AS at, e.path,
             COALESCE(e."utmSource",'') AS utm, COALESCE(e."refHost",'') AS ref
      FROM "AnalyticsEvent" e
      WHERE e.kind = 'PAGE_VIEW' AND ${human} AND e."createdAt" >= ${since} AND COALESCE(e."userId", e."anonId") IS NOT NULL
      ORDER BY COALESCE(e."userId", e."anonId"), e."createdAt"
    )
    SELECT to_char(${ist('f.at')}::date,'MM-DD Dy') AS d,
      COUNT(*) FILTER (WHERE ${isPyq('f.path')})::int AS pyq_landers_all,
      COUNT(*) FILTER (WHERE ${isPyq('f.path')} AND (f.utm ~* '^(chatgpt|openai)' OR f.ref ~* 'chatgpt|openai'))::int AS gpt,
      COUNT(*) FILTER (WHERE ${isPyq('f.path')} AND f.ref ~* 'bing')::int AS bing,
      COUNT(*) FILTER (WHERE ${isPyq('f.path')} AND f.ref ~* 'google' AND f.ref !~* 'accounts[.]google')::int AS google,
      COUNT(*) FILTER (WHERE ${isPyq('f.path')} AND f.ref ~* 'perplexity|duckduckgo|yahoo|brave|ecosia')::int AS other_search,
      COUNT(*) FILTER (WHERE ${ist('f.at')}::time <= (NOW() + interval '330 minutes')::time AND ${isPyq('f.path')})::int AS pyq_same_time
    FROM firsts f
    GROUP BY 1 ORDER BY 1`);
  const views = await prisma.$queryRawUnsafe<any[]>(`
    SELECT to_char(${ist('e."createdAt"')}::date,'MM-DD') AS d, COUNT(*)::int AS pyq_views, COUNT(DISTINCT COALESCE(e."userId", e."anonId"))::int AS pyq_people
    FROM "AnalyticsEvent" e
    WHERE e.kind = 'PAGE_VIEW' AND ${human} AND e."createdAt" >= ${since} AND ${isPyq('e.path')}
    GROUP BY 1 ORDER BY 1`);
  const bots = await prisma.$queryRawUnsafe<any[]>(`
    SELECT to_char(${ist('b.at')}::date,'MM-DD') AS d,
      COUNT(*) FILTER (WHERE b.bot IN ('ChatGPT-User','OAI-SearchBot'))::int AS openai,
      COUNT(*) FILTER (WHERE b.bot = 'Bingbot')::int AS bing
    FROM "BotVisit" b WHERE b.at >= ${since} AND (b.path ~ '/pyq(/|$)' OR b.path ~ '/papers(/|$)')
    GROUP BY 1 ORDER BY 1`);
  console.log("day        first-landing on PYQ surfaces: all  ChatGPT Bing Google otherSearch  sameTime | PYQ page views/people | OpenAI bots Bingbot on PYQ");
  for (const r of rows) {
    const v = views.find((x) => x.d === r.d.slice(0, 5)) ?? {};
    const b = bots.find((x) => x.d === r.d.slice(0, 5)) ?? {};
    console.log(`${r.d} ${String(r.pyq_landers_all).padStart(34)} ${String(r.gpt).padStart(8)} ${String(r.bing).padStart(4)} ${String(r.google).padStart(6)} ${String(r.other_search).padStart(11)} ${String(r.pyq_same_time).padStart(9)} | ${String(v.pyq_views ?? 0).padStart(5)}/${String(v.pyq_people ?? 0).padEnd(5)} | ${String(b.openai ?? 0).padStart(11)} ${String(b.bing ?? 0).padStart(7)}`);
  }
}
main().finally(() => prisma.$disconnect());
