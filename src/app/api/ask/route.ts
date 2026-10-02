// POST /api/ask {question, via?, locale?, stream?} → the AI answer for /ask.
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
//      minors decision; the resolver and the /ask page refuse too). Always
//      JSON, even when a stream was asked for: there is nothing to stream;
//   5. runAsk (src/lib/ask-engine.ts) with the resolution → 200 {answer,
//      usedWeb, pages, links, next, webSources}. A closed tab aborts the call.
// Anonymous allowed (zero friction). The analytics row now carries the client
// verdict and the anon id, so the share of /ask that is people is measurable;
// a web fallback still marks a content gap for the content factory.
//
// 26 Sep 2026 — streaming (founder: "yes show them word by word"): a request
// with `Accept: text/event-stream` or {stream: true} gets step 5 as
// Server-Sent Events (src/lib/ask-stream.ts: meta → status… → delta… → done,
// or error) — the answer's words as the model writes them, and a `done` frame
// whose body is byte-for-byte the JSON answer below (answerBody). Steps 1-4
// are unchanged and answer as before (403 / 429 / 400 / the Class 1-7 JSON).
// The stream sets the headers that stop Vercel buffering it, and a closed tab
// or the panel's Stop button (the request's signal, or the stream's cancel)
// aborts the model call. Every other caller gets the JSON answer, unchanged.
// Each web source now says whether it is official (src/lib/official-domains.ts
// — the founder's "keep as many official sources as possible", 26 Sep).
//
// 26 Sep 2026 (fixer — founder: "anonymous teenager answers is fine as we
// will be showing only study related content for them"): step 2b, right after
// the body check and before the index load — src/lib/ask-scope.ts askScopeOf.
// An obvious off-topic question gets one study-only line + 3 section pages,
// a distress question the helplines (Tele-MANAS 14416, Childline 1098, a
// trusted adult, 112) and no pages — JSON, no model call, for every class
// (a Class 1-7 child in distress gets the helplines too). The analytics row
// of a distress question never stores its text. Web sources are labelled with
// the wide official list (src/lib/official-domains.ts) when the engine has not.
//
// 2 Oct 2026 (honest words): a failed answer said "The answer engine
// hiccuped — try again" whatever the cause, and the failure was logged
// nowhere. On an empty Anthropic credit "try again" sends the student back
// into a dry account. Now every engine failure is logged, and when the
// classifier (src/lib/ai/tutor-failure.ts) says the AI itself was unavailable
// the reply carries code "ai-unavailable" and a line in the asker's language
// that says so (src/lib/search-copy.ts aiUnavailable / aiUnavailableNoPage:
// pages matched, or none) — JSON: 503 {code, error}; stream: the error frame
// {error, code}. One analytics row per such failure (props.surface
// "ai-unavailable"; a school search carries no anon id; a Class 1-7 search
// never reaches this point). Any other failure gets the plain "could not be
// answered this time" line (search-copy `failed`; review, 2 Oct 2026: it said
// "hiccuped"), in the asker's language on both paths. A reader who left gets
// no line and no row.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

import { z } from "zod";
import { runAsk, type AskResult } from "@/lib/ask-engine";
import { recordEvent } from "@/lib/analytics";
import { askGuard } from "@/lib/search/ask-guard";
import { loadSearchIndex } from "@/lib/search/index-build";
import { resolveQuery } from "@/lib/search/resolve";
import { prePassHits } from "@/lib/ask-prompt";
import { isOfficialUrl } from "@/lib/official-domains";
import { askScopeOf, offTopicReply } from "@/lib/ask-scope";
import { searchCopy } from "@/lib/search-copy";
import { ASK_SSE_HEADERS, askStatusText, sseFrame, type AskFrameName } from "@/lib/ask-stream";
import { aiUnavailableBody, aiUnavailableReason, recordAiUnavailable } from "@/lib/ai/unavailable-reply";
import type { TutorFailReason } from "@/lib/tutor-unavailable";
import type { PageLink, Resolution, SearchIndex } from "@/lib/search/types";

const Via = z.enum(["strip", "page", "ask-page", "button"]);
const Body = z.object({
  question: z.string().trim().min(3).max(800),
  via: Via.optional().catch(undefined),
  from: Via.optional().catch(undefined),
  locale: z.enum(["en", "hi", "te"]).optional().catch(undefined),
  stream: z.boolean().optional().catch(undefined),
});

type Locale = "en" | "hi" | "te";

/** The answer body — the JSON response and the stream's `done` frame are this same object.
 *  (Not exported: a route module may export only its handlers and config.) */
function answerBody(result: AskResult) {
  return {
    answer: result.answer,
    usedWeb: result.usedWeb,
    pages: result.pages,
    links: result.links,
    next: result.next,
    // A flag the engine already set wins (it knows this run's tool portals);
    // otherwise the wide official list decides (26 Sep 2026, fixer: the
    // tracker's narrower isOfficialSource called CISCE, ICAI or ETS "other").
    webSources: result.webSources.map((w) => {
      const own = (w as { official?: unknown }).official;
      return { ...w, official: typeof own === "boolean" ? own : isOfficialUrl(w.url) };
    }),
    ...(result.notice ? { notice: result.notice } : {}),
  };
}

/** The analytics props of an answered question (the content-gap flywheel reads webFallback). */
function answerProps(result: AskResult) {
  return {
    webFallback: result.usedWeb,
    tools: result.toolsUsed.join(","),
    turns: result.turns,
    latencyMs: result.latencyMs,
    next: result.next?.url ?? null,
  };
}

const toPage = (h: { url: string; label: string; section: PageLink["section"]; status?: PageLink["status"] }): PageLink => ({
  url: h.url,
  label: h.label,
  section: h.section,
  ...(h.status ? { status: h.status } : {}),
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
  const wantsStream = parsed.data.stream === true || /\btext\/event-stream\b/i.test(req.headers.get("accept") ?? "");

  // 26 Sep 2026 (fixer): study only — an obvious off-topic or distress question
  // never reaches the model (or the index). Always JSON: the panel shows a JSON
  // reply to a stream request as the finished answer. A distress row keeps no text.
  const scope = askScopeOf(question);
  if (!scope.inScope) {
    void recordEvent({
      kind: "CTA_CLICKED",
      userId,
      anonId,
      client,
      path: "/ask",
      props: { surface: "ask", via, notice: scope.distress ? "distress" : "off-topic", scope: scope.reason ?? null, q: scope.distress ? null : question.slice(0, 200) },
    });
    return Response.json(offTopicReply(locale, { question, distress: scope.distress }));
  }

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
    const pages: PageLink[] = prePassHits(resolution).slice(0, 3).map(toPage);
    event({ notice: "no-ai-young-class" });
    return Response.json({ answer: null, usedWeb: false, pages, links: pages, next: pages[0] ?? null, webSources: [], notice: "no-ai-young-class" });
  }

  // 2 Oct 2026: the row of an answer that failed because the AI was
  // unavailable. A school search (Class 8-12 here; Class 1-7 returned above)
  // carries no anon id.
  const unavailableEvent = (reason: TutorFailReason, hasPages: boolean) =>
    recordAiUnavailable({
      feature: "ask",
      reason,
      userId,
      anonId,
      client,
      path: "/ask",
      alt: hasPages ? "pages" : null,
      school: resolution.schoolScope === "none" ? "none" : "student",
    });

  if (wantsStream) return streamAnswer({ req, question, resolution, index, locale, via, event, unavailableEvent });

  try {
    const result = await runAsk(question, { resolution, index, locale, via, signal: req.signal });

    // Content-gap flywheel: a web fallback means Shishya's own data could not
    // answer — the question is logged so the factory can close it.
    event(answerProps(result));

    return Response.json(answerBody(result));
  } catch (err) {
    // 2 Oct 2026: logged (it was swallowed), and classified. A caller who
    // left is not a failed answer.
    const gone = req.signal.aborted;
    if (!gone) console.error("[ask] answer failed:", (err as { status?: unknown })?.status ?? "", String((err as Error)?.message ?? err).slice(0, 200));
    const reason = gone ? null : aiUnavailableReason(err);
    if (reason) {
      const hasPages = prePassHits(resolution).length > 0;
      unavailableEvent(reason, hasPages);
      const copy = searchCopy(locale);
      return Response.json(aiUnavailableBody("ask", hasPages ? copy.aiUnavailable : copy.aiUnavailableNoPage), { status: 503 });
    }
    // Review, 2 Oct 2026: this said "The answer engine hiccuped" in English
    // whatever the asker's language; now the same plain line the stream sends.
    return Response.json({ error: searchCopy(locale).failed }, { status: 502 });
  }
}

/**
 * The streamed answer (26 Sep 2026). Frames: meta first (before any model
 * call), then status / delta / reset as runAsk reports them, then done with
 * the validated answer — or error, in the asker's language. Nothing is sent
 * after the reader has gone, and its going aborts the model call.
 */
function streamAnswer(a: {
  req: Request;
  question: string;
  resolution: Resolution;
  index: SearchIndex;
  locale: Locale;
  via: "strip" | "page" | "ask-page" | "button";
  event: (props: Record<string, unknown>) => void;
  unavailableEvent: (reason: TutorFailReason, hasPages: boolean) => void;
}): Response {
  const copy = searchCopy(a.locale);
  const abort = new AbortController();
  const onGone = () => abort.abort();
  if (a.req.signal.aborted) abort.abort();
  else a.req.signal.addEventListener("abort", onGone, { once: true });
  const encoder = new TextEncoder();
  let open = true;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (name: AskFrameName, data: unknown) => {
        if (!open || abort.signal.aborted) return;
        try {
          controller.enqueue(encoder.encode(sseFrame(name, data)));
        } catch {
          open = false; // reader gone
        }
      };
      const pages = prePassHits(a.resolution).slice(0, 3).map(toPage);
      emit("meta", { locale: a.locale, outcome: a.resolution.outcome, pages, next: pages[0] ?? null });
      try {
        const result = await runAsk(a.question, {
          resolution: a.resolution,
          index: a.index,
          locale: a.locale,
          via: a.via,
          signal: abort.signal,
          onEvent: (e) => {
            if (e.type === "status") emit("status", { key: e.key, text: askStatusText(copy.stream.status, e.key, e.subject), ...(e.subject ? { subject: e.subject } : {}) });
            else if (e.type === "delta") emit("delta", e.text);
            else emit("reset", { text: e.text });
          },
        });
        // 26 Sep 2026 (fixer): a reader who left never received the answer — no answered-question row.
        if (abort.signal.aborted) return;
        a.event({ ...answerProps(result), stream: true });
        emit("done", answerBody(result));
      } catch (err) {
        // A reader that left needs no error line (and is not a failed answer);
        // anyone still reading gets one, with Retry.
        if (abort.signal.aborted) return;
        // 2 Oct 2026: logged (it was swallowed), and classified — the AI
        // unavailable gets its own line and code, and one analytics row.
        console.error("[ask] streamed answer failed:", (err as { status?: unknown })?.status ?? "", String((err as Error)?.message ?? err).slice(0, 200));
        const reason = aiUnavailableReason(err);
        if (reason) {
          a.unavailableEvent(reason, pages.length > 0);
          emit("error", aiUnavailableBody("ask", pages.length > 0 ? copy.aiUnavailable : copy.aiUnavailableNoPage));
        } else {
          emit("error", { error: copy.failed, code: "failed" });
        }
      } finally {
        a.req.signal.removeEventListener("abort", onGone);
        open = false;
        try {
          controller.close();
        } catch {
          /* already closed by a reader that left */
        }
      }
    },
    cancel() {
      open = false;
      abort.abort();
    },
  });

  return new Response(stream, { headers: { ...ASK_SSE_HEADERS } });
}
