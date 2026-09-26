// GET /subjects/{slug}/context.md — a subject hub's machine brief (27 Sep
// 2026, discoverability wave 2, group "subject-hubs"): the hub's lead, every
// listed topic with each exam's own topic page, and every exam with the
// section — the same rows and rules as the HTML page
// (src/lib/subject-hubs.ts subjectHubContextMarkdown). Served only for hubs
// above the data floor; a hub below it (noindex on the page) or an unknown
// slug is a 404, so answer engines are never handed a thin hub. Headers as
// the other context files, with an HTTP canonical link to the page.

import { istDay } from "@/lib/exam-week";
import { loadSubjectHubs } from "@/lib/db/subject-hubs-db";
import { PLATFORM_ONE_LINE, contextMarkdownHeaders } from "@/lib/section-context";
import {
  SITE,
  subjectHubContextMarkdown,
  subjectHubDef,
  subjectHubIndexable,
  subjectHubPath,
  subjectHubRenderable,
} from "@/lib/subject-hubs";

export const revalidate = 3600;

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const def = subjectHubDef(slug);
  if (!def) return new Response("Not found", { status: 404 });
  const hub = (await loadSubjectHubs()).get(def.slug);
  if (!hub || !subjectHubRenderable(hub.totals) || !subjectHubIndexable(hub.totals)) {
    return new Response("Not found", { status: 404 });
  }
  return new Response(subjectHubContextMarkdown(hub, istDay(new Date()), PLATFORM_ONE_LINE), {
    headers: contextMarkdownHeaders(`${SITE}${subjectHubPath(def.slug)}`),
  });
}
