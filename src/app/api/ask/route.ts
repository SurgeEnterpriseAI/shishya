// POST /api/ask {question, via?, locale?} → the AI answer for /ask.
//
// 26 Sep 2026 (one search for the whole platform): the search strip and /ask
// open the page Shishya already has; this route runs only when a person asks
// the AI (the /ask panel: a click, or the strip's intent token). Order — every
// refusal comes before the model:
//   1. askGuard: signed-out + bot user-agent → 403 {error:"BOT"} before the
//      rate limit, the DB and the model (the chat route's 24 Sep rule); then
//      the "ask" rate limit → 429 with retry-after;
//   2. body check → 400;
//   3. the search resolver over the deep index (no model): the pages Shishya
//      already has for the question;
//   4. a Class 1-7 school question → 200 {answer: null, notice:
//      "no-ai-young-class", pages} — pages only, never a model call (the 25 Sep
//      minors decision; the resolver and the /ask page refuse too);
//   5. runAsk (src/lib/ask-engine.ts) with the resolution → 200 {answer,
//      usedWeb, pages, links, next, webSources}. A closed tab aborts the call.
// Anonymous allowed (zero friction). The analytics row now carries the client
// verdict and the anon id, so the share of /ask that is people is measurable;
// a web fallback still marks a content gap for the content factory.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { z } from "zod";
import { runAsk } from "@/lib/ask-engine";
import { recordEvent } from "@/lib/analytics";
import { askGuard } from "@/lib/search/ask-guard";
import { loadSearchIndex } from "@/lib/search/index-build";
import { resolveQuery } from "@/lib/search/resolve";
import { prePassHits } from "@/lib/ask-prompt";
import type { PageLink } from "@/lib/search/types";

const Via = z.enum(["strip", "page", "ask-page", "button"]);
const Body = z.object({
  question: z.string().trim().min(3).max(800),
  via: Via.optional().catch(undefined),
  from: Via.optional().catch(undefined),
  locale: z.enum(["en", "hi", "te"]).optional().catch(undefined),
});

export async function POST(req: Request) {
  const gate = await askGuard(req);
  if (!gate.ok) return gate.res;
  const { userId, anonId, client } = gate;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Ask a real question (3+ characters)." }, { status: 400 });
  const { question } = parsed.data;
  const via = parsed.data.via ?? parsed.data.from ?? "page";
  const locale = parsed.data.locale ?? "en";

  const index = await loadSearchIndex("deep");
  const resolution = resolveQuery(question, index, { pageLocale: locale });
  const best = resolution.best ?? resolution.hits[0] ?? null;
  const event = (props: Record<string, unknown>) =>
    void recordEvent({
      kind: "CTA_CLICKED",
      userId,
      anonId,
      client,
      path: "/ask",
      props: { surface: "ask", via, outcome: resolution.outcome, best: best?.url ?? null, q: question.slice(0, 200), ...props },
    });

  // Class 1-7: the pages, never the model.
  if (resolution.schoolScope === "class1to7") {
    const pages: PageLink[] = prePassHits(resolution)
      .slice(0, 3)
      .map((h) => ({ url: h.url, label: h.label, section: h.section, ...(h.status ? { status: h.status } : {}) }));
    event({ notice: "no-ai-young-class" });
    return Response.json({ answer: null, usedWeb: false, pages, links: pages, next: pages[0] ?? null, webSources: [], notice: "no-ai-young-class" });
  }

  try {
    const result = await runAsk(question, { resolution, index, locale, via, signal: req.signal });

    // Content-gap flywheel: a web fallback means Shishya's own data could not
    // answer — the question is logged so the factory can close it.
    event({
      webFallback: result.usedWeb,
      tools: result.toolsUsed.join(","),
      turns: result.turns,
      latencyMs: result.latencyMs,
      next: result.next?.url ?? null,
    });

    return Response.json({
      answer: result.answer,
      usedWeb: result.usedWeb,
      pages: result.pages,
      links: result.links,
      next: result.next,
      webSources: result.webSources,
      ...(result.notice ? { notice: result.notice } : {}),
    });
  } catch {
    return Response.json({ error: "The answer engine hiccuped — please try again." }, { status: 502 });
  }
}
