// GET /after-12th/context.md — the /after-12th hub's machine brief (30 Sep
// 2026, P1 build 1, spec §2.2 — agent B). The same model the page renders
// (src/lib/paths/stage-pages.ts afterTwelfthModel over the live-exam map and
// the level total), written by src/lib/paths/path-context.ts: one line per
// course family or path with its URL, the confirmed rules with source and
// read day, the open scholarships, and the sources. Markdown headers plus an
// HTTP canonical link to the HTML page. Hourly.

import { loadStageHubInputs } from "@/components/paths/stage-hub-data";
import { istDay } from "@/lib/exam-week";
import { stageHubContextMarkdown } from "@/lib/paths/path-context";
import { afterTwelfthModel } from "@/lib/paths/stage-pages";
import { contextMarkdownHeaders } from "@/lib/section-context";

export const revalidate = 3600;

export async function GET() {
  const { live, examsAfterTotal } = await loadStageHubInputs("12th");
  const model = afterTwelfthModel(live, { examsAfterTotal });
  return new Response(stageHubContextMarkdown(model, istDay(new Date())), { headers: contextMarkdownHeaders(model.canonical) });
}
