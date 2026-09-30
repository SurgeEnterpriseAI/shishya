// GET /after-10th/context.md — the /after-10th hub's machine brief (30 Sep
// 2026, P1 build 1, spec §2.2 — agent B). The same model the page renders
// (src/lib/paths/stage-pages.ts afterTenthModel over the live-exam map and
// the level total), written by src/lib/paths/path-context.ts: one line per
// option with its URL, the confirmed rules with source and read day, the open
// scholarships, and the sources. Markdown headers plus an HTTP canonical link
// to the HTML page (section-context.ts contextMarkdownHeaders). Hourly.

import { loadStageHubInputs } from "@/components/paths/stage-hub-data";
import { istDay } from "@/lib/exam-week";
import { stageHubContextMarkdown } from "@/lib/paths/path-context";
import { afterTenthModel } from "@/lib/paths/stage-pages";
import { contextMarkdownHeaders } from "@/lib/section-context";

export const revalidate = 3600;

export async function GET() {
  const { live, examsAfterTotal } = await loadStageHubInputs("10th");
  const model = afterTenthModel(live, { examsAfterTotal });
  return new Response(stageHubContextMarkdown(model, istDay(new Date())), { headers: contextMarkdownHeaders(model.canonical) });
}
