// GET /pulse/context.md — the latest Shishya Pulse week as markdown, for AI
// assistants and crawlers (27 Sep 2026): the same gated tables as /pulse,
// each with its definition, the citation line and every week's URL. This
// static segment wins over /pulse/[week]. ISR hourly; no cookie or header
// read. A failed read answers 503 (retry), never a page of zeros.

import { loadPulseView } from "@/lib/pulse";
import { PULSE_FIRST_WEEK, istDayLabel, pulseArchiveWeeks } from "@/lib/pulse-rules";
import { PULSE_INTRO, PULSE_NAME, PULSE_URL, pulseMarkdown, pulsePublishedDay } from "@/lib/pulse-view";
import { contextMarkdownHeaders } from "@/lib/section-context";

export const revalidate = 3600;

export async function GET() {
  const archive = pulseArchiveWeeks(new Date());
  const latest = archive[0];
  if (!latest) {
    const md = [
      `# ${PULSE_NAME}`,
      "",
      PULSE_INTRO,
      "",
      `The first week covers ${PULSE_FIRST_WEEK.label} and appears on ${istDayLabel(pulsePublishedDay(PULSE_FIRST_WEEK))}: ${PULSE_URL}`,
      "",
    ].join("\n");
    return new Response(md, { headers: contextMarkdownHeaders(PULSE_URL) });
  }
  const view = await loadPulseView(latest);
  if (!view) {
    return new Response(`# ${PULSE_NAME}\n\nThe numbers could not be computed right now. Try again later: ${PULSE_URL}\n`, {
      status: 503,
      headers: { "content-type": "text/markdown; charset=utf-8", "cache-control": "no-store", "retry-after": "600" },
    });
  }
  return new Response(pulseMarkdown(view, archive), { headers: contextMarkdownHeaders(PULSE_URL) });
}
