// GET /exams/state/{slug}/context.md — a state's machine-readable brief for
// AI crawlers and answer engines (15 Sep 2026, SEO/AEO wave 2).
//
// The per-exam context files (/exams/{CODE}/context.md) are fetched by GPTBot,
// Bingbot, Amazonbot and OAI-SearchBot; a "{state} government exams" question
// had no equivalent. Same facts as the state page, as token-cheap markdown:
// exams by type with their URLs, only announced dates (official / reported),
// the official application portals, and the page's FAQ. Advertised on the
// state page via <link rel="alternate" type="text/markdown"> and listed in
// llms.txt / llms-full.txt.

import { stateCodeFromSlug } from "@/lib/state-info";
import { getStateDirectory, loadStateUpcoming, stateContextMarkdown } from "@/lib/state-exams";
import { istDay } from "@/lib/exam-week";

export const revalidate = 3600;

const HORIZON_DAYS = 120;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const code = stateCodeFromSlug(slug);
  const entry = code ? (await getStateDirectory().catch(() => [])).find((s) => s.code === code) : undefined;
  if (!entry || entry.exams.length === 0) {
    return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain" } });
  }
  const upcoming = await loadStateUpcoming(entry.exams, HORIZON_DAYS).catch(() => []);
  return new Response(stateContextMarkdown(entry, upcoming, HORIZON_DAYS, istDay(new Date())), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=900, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
