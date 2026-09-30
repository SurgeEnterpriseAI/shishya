// GET /schooling/streams/{option}/context.md — a stream page's machine brief
// (30 Sep 2026, P1 build 1, spec §2.3 — agent B). The same model the page
// renders (src/lib/paths/stream-pages.ts over the live-exam map), written by
// src/lib/paths/path-context.ts streamOptionContextMarkdown: confirmed board
// rows only, each with its source and read day; what it keeps open or
// closes with each rule's source; exams; where it leads; the sources. An
// unknown option is a plain 404. Markdown headers plus an HTTP canonical link
// to the HTML page. Hourly.

import { STREAM_OPTION_SLUGS } from "@/data/paths";
import { istDay } from "@/lib/exam-week";
import { loadLiveExams } from "@/lib/live-exam-codes";
import { streamOptionContextMarkdown } from "@/lib/paths/path-context";
import { streamPageModel } from "@/lib/paths/stream-pages";
import { contextMarkdownHeaders } from "@/lib/section-context";

export const revalidate = 3600;
export const dynamicParams = false;

export function generateStaticParams() {
  return STREAM_OPTION_SLUGS.map((option) => ({ option }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ option: string }> }) {
  const { option } = await params;
  const live = await loadLiveExams();
  const model = streamPageModel(option, live);
  if (!model) return new Response("Not found\n", { status: 404, headers: { "content-type": "text/plain" } });
  return new Response(streamOptionContextMarkdown(model, istDay(new Date())), { headers: contextMarkdownHeaders(model.canonical) });
}
