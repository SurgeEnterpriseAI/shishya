"use client";

// The AI answer panel on /ask?q= (26 Sep 2026) — INTEGRATION POINT for the AI
// builder (POST /api/ask, src/lib/ask-engine.ts runAsk).
//
// The resolver has already rendered the pages Shishya has (SearchResults,
// server-side). This panel asks the AI only:
//   * on a click of "Get Shishya's answer" (a human action), or
//   * automatically when ALL hold: the resolver said outcome "ai" (or the
//     search row asked for the AI: ?ai=1), sessionStorage[ASK_INTENT_KEY] holds
//     this same q from under ASK_INTENT_TTL_MS ago (set only by a human submit
//     in the search strip), and the page is visible. The token is deleted on
//     use, so a reload, a shared link, the back button, a SearchAction or
//     llms.txt deep link, or a JS crawler never fires a model call.
// An answer is kept in sessionStorage (ASK_ANSWER_KEY + q) so back / forward
// shows it again without a second call.
//
// Request: POST /api/ask {question, via, locale}. Response: {answer, usedWeb,
// pages, links, next, webSources, notice?} (src/app/api/ask/route.ts) — every
// page link already checked against the search index; `next` is the one page
// to open now ("Open next" button). A Class 1-7 question comes back with
// answer null and notice "no-ai-young-class". 403 (bot) and 429 (rate limit)
// get plain messages.
//
// 26 Sep 2026 — word by word (founder: "yes show them word by word"): the
// panel asks for the streamed answer (Accept: text/event-stream, {stream:
// true}; frames in src/lib/ask-stream.ts) and shows it as it is written:
//   * a status line ("Reading Shishya's SSC CGL page…") and a Stop button
//     while the engine works — alone before the first word, then as the
//     answer card's footer, below the words (fixer: nothing above the reading
//     point moves when it goes); Stop aborts the request, which aborts the
//     model call on the server;
//   * the draft revealed word by word (revealNext, ~33 ms a word, faster when
//     the model runs ahead), markdown rendered as it grows, with a blinking
//     caret — and every link as plain words (draftForDisplay): the links are
//     checked only when the answer is complete;
//   * on `done` the same card swaps to the validated answer (links live), and
//     the Open next button, the page chips and the web sources (official ones
//     first and marked) appear below it;
//   * reduced motion: no word-by-word pacing and no blinking — the text shows
//     as it arrives;
//   * an error keeps the resolver's page as the way forward and offers Retry;
//     a JSON reply (Class 1-7, or a server without streaming) still works.

import { useEffect, useReducer, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import type { SearchCopy } from "@/lib/search-copy";
import type { Outcome, PageLink } from "@/lib/search/types";
import { ASK_ANSWER_KEY, ASK_INTENT_KEY, ASK_INTENT_TTL_MS } from "@/lib/search/types";
import {
  ASK_VIEW_IDLE,
  askReducer,
  commonPrefixLength,
  createSseParser,
  draftForDisplay,
  frameToAction,
  revealNext,
  type AskAnswerPayload,
  type SseFrame,
} from "@/lib/ask-stream";

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const sameQ = (a: string, b: string) => norm(a) === norm(b);
/** One word per tick of this length (revealNext paces the rest). */
const REVEAL_TICK_MS = 33;

/** Whether the search strip's intent token says a person just asked this q (and removes it). */
function takeIntentToken(q: string): boolean {
  try {
    const raw = sessionStorage.getItem(ASK_INTENT_KEY);
    if (!raw) return false;
    const t = JSON.parse(raw) as { q?: string; at?: number };
    const fresh = typeof t.at === "number" && Date.now() - t.at >= 0 && Date.now() - t.at < ASK_INTENT_TTL_MS;
    const ok = fresh && typeof t.q === "string" && sameQ(t.q, q);
    if (ok) sessionStorage.removeItem(ASK_INTENT_KEY);
    return ok;
  } catch {
    return false;
  }
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const m = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    if (!m) return;
    setReduced(m.matches);
    const on = () => setReduced(m.matches);
    m.addEventListener?.("change", on);
    return () => m.removeEventListener?.("change", on);
  }, []);
  return reduced;
}

// The caret sits at the end of the last paragraph, heading or list item of
// the draft (ChatMarkdown's blocks); none after a table or a rule.
const CARET_CSS = `
.ask-caret > div > :not(ul):not(ol):not(div):not(hr):last-child::after,
.ask-caret > div > :is(ul, ol):last-child > li:last-child::after {
  content: ""; display: inline-block; width: 0.45em; height: 1.05em; margin-left: 0.15em;
  vertical-align: -0.18em; border-radius: 1px; background: currentColor; opacity: 0.5;
  animation: ask-caret-blink 1.05s step-end infinite;
}
@keyframes ask-caret-blink { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .ask-caret > div > :not(ul):not(ol):not(div):not(hr):last-child::after,
  .ask-caret > div > :is(ul, ol):last-child > li:last-child::after { animation: none; }
}`;

export function AskAnswer({
  q,
  outcome,
  forceAi = false,
  copy,
  locale = "en",
  best = null,
}: {
  q: string;
  outcome: Outcome;
  forceAi?: boolean;
  copy: SearchCopy;
  locale?: "en" | "hi" | "te";
  best?: PageLink | null;
}) {
  const [view, dispatch] = useReducer(askReducer, ASK_VIEW_IDLE);
  const [shown, setShown] = useState(0); // characters of the draft on screen
  const started = useRef(false);
  const ctrl = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const reduced = usePrefersReducedMotion();

  // The reveal loop reads the latest draft without restarting on every word.
  const draftRef = useRef("");
  const hurryRef = useRef(false);
  const prevDraft = useRef("");
  draftRef.current = view.draft;
  hurryRef.current = !(view.phase === "busy" || view.phase === "streaming");

  // A reset keeps on screen whatever the new draft shares with the old one.
  useEffect(() => {
    const prev = prevDraft.current;
    if (!view.draft.startsWith(prev)) setShown((s) => Math.min(s, commonPrefixLength(prev, view.draft)));
    prevDraft.current = view.draft;
  }, [view.draft]);

  const behind = !reduced && shown < view.draft.length;
  useEffect(() => {
    if (!behind) return;
    const id = setInterval(() => setShown((s) => revealNext(draftRef.current, s, hurryRef.current)), REVEAL_TICK_MS);
    return () => clearInterval(id);
  }, [behind]);

  // Leaving the page (a new search remounts this panel) stops the answer. The
  // abort waits a tick, so React's development double-mount does not stop it.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      setTimeout(() => {
        if (!mounted.current) ctrl.current?.abort();
      }, 0);
    };
  }, []);

  function save(data: AskAnswerPayload) {
    try {
      sessionStorage.setItem(ASK_ANSWER_KEY + norm(q), JSON.stringify(data));
    } catch {
      /* storage off: the answer still shows */
    }
  }

  async function ask(via: "strip" | "button") {
    if (started.current) return;
    started.current = true;
    const ac = new AbortController();
    ctrl.current = ac;
    prevDraft.current = "";
    setShown(0);
    dispatch({ type: "start" });
    let settled = false; // a done or error frame arrived
    const fail = (message: string, canRetry: boolean) => {
      settled = true;
      if (canRetry) started.current = false; // a failed call may be retried by hand
      dispatch({ type: "error", message, canRetry });
    };
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json", accept: "text/event-stream" },
        body: JSON.stringify({ question: q, via, locale, stream: true }),
        signal: ac.signal,
      });
      if (res.status === 403) return fail(copy.unavailable, false);
      if (res.status === 429) return fail(copy.rateLimited, false);
      if (!res.ok) return fail(copy.failed, true);
      if (!(res.headers.get("content-type") ?? "").includes("text/event-stream") || !res.body) {
        // A JSON answer: Class 1-7 (pages only), or a server that does not stream.
        const data = (await res.json().catch(() => null)) as AskAnswerPayload | null;
        if (!data || !("answer" in data)) return fail(copy.failed, true);
        settled = true;
        dispatch({ type: "done", data });
        save(data);
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const parser = createSseParser();
      const handle = (frames: SseFrame[]) => {
        for (const f of frames) {
          const a = frameToAction(f, copy.failed);
          if (!a) continue;
          if (a.type === "done") {
            settled = true;
            save(a.data);
          } else if (a.type === "error") {
            settled = true;
            started.current = false;
          }
          dispatch(a);
        }
      };
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        handle(parser.push(decoder.decode(value, { stream: true })));
      }
      handle(parser.push(decoder.decode()));
      handle(parser.flush());
      // The stream ended with neither an answer nor an error: a dropped connection.
      if (!settled) fail(copy.failed, true);
    } catch {
      // Stop (or leaving) aborted the request: the view already says so.
      if (!ac.signal.aborted && !settled) fail(copy.failed, true);
    } finally {
      if (ctrl.current === ac) ctrl.current = null;
    }
  }

  function stop() {
    ctrl.current?.abort();
    ctrl.current = null;
    started.current = false; // "Try again" may ask once more
    dispatch({ type: "stop" });
  }

  useEffect(() => {
    // Back / forward: show the answer this tab already received.
    try {
      const cached = sessionStorage.getItem(ASK_ANSWER_KEY + norm(q));
      if (cached) {
        started.current = true;
        dispatch({ type: "done", data: JSON.parse(cached) as AskAnswerPayload });
        return;
      }
    } catch {
      /* ignore */
    }
    if (!(outcome === "ai" || forceAi)) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    if (takeIntentToken(q)) void ask("strip");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const live = view.phase === "busy" || view.phase === "streaming";
  // The validated answer replaces the draft once the draft has caught up (at once with reduced motion).
  const showFinal = view.phase === "done" && (reduced || !behind);
  const typing = !showFinal && (live || view.phase === "done") && view.draft.length > 0;
  const showDraft = typing || (view.phase === "stopped" && view.draft.length > 0);
  const draftOnScreen = draftForDisplay(reduced ? view.draft : view.draft.slice(0, shown));
  const statusLine = view.phase === "streaming" ? copy.stream.writing : (view.status ?? copy.stages[0]);
  const fallbackPage = best ?? view.metaPages[0] ?? null;

  const data = showFinal ? view.data : null;
  const pages: PageLink[] = (() => {
    if (!data) return [];
    if (data.pages?.length) return data.pages;
    return (data.links ?? []).map((l) => ({ url: l.url, label: l.label ?? l.title ?? l.url, section: "more" as const }));
  })();
  // Official sources first (the server orders them too; an answer cached before 26 Sep 2026 may not be).
  const webSources = [...(data?.webSources ?? [])].sort((a, b) => Number(b.official === true) - Number(a.official === true));

  // 26 Sep 2026 (fixer): the status line and Stop. Before the first word they
  // stand alone; once words arrive they are the card's FOOTER, below the text
  // being read — so when the answer completes and the row goes, nothing above
  // the reading point moves (as a row above the card, it jumped the text 59 px
  // at 360 px wide).
  const statusRow = (
    <div className="flex items-start justify-between gap-3">
      <p className="flex min-w-0 items-center gap-2.5 text-sm leading-snug text-ink-600">
        <span className="inline-block h-2 w-2 shrink-0 rounded-full bg-saffron-500 motion-safe:animate-pulse" aria-hidden />
        <span>{statusLine}</span>
      </p>
      <button
        type="button"
        onClick={stop}
        className="shrink-0 rounded-lg border border-ink-300 bg-white px-3 py-1 text-xs font-semibold text-ink-700 transition-colors hover:border-ink-500"
      >
        <span aria-hidden>■ </span>
        {copy.stream.stop}
      </button>
    </div>
  );

  return (
    // 26 Sep 2026 (fixer): the live region is the section, mounted from the first render, as before
    // streaming — so a status line, an error (429, failed) and an answer that arrives whole (Class 1-7,
    // off-topic, the distress helplines) are all announced. aria-busy holds it while words are typed,
    // so a screen reader reads the finished answer once, not token by token.
    <section className="mt-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-4 sm:p-5" data-ask-answer aria-live="polite" aria-busy={typing}>
      <style>{CARET_CSS}</style>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-ink-900">✨ {copy.answerTitle}</h2>
        <p className="text-[11px] text-ink-500">{copy.answerTag}</p>
      </div>

      {view.phase === "idle" && (
        <button
          type="button"
          onClick={() => void ask("button")}
          className="mt-3 rounded-xl bg-saffron-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
        >
          {outcome === "ai" || forceAi ? copy.getAnswer : copy.askMore}
        </button>
      )}

      {live && !showDraft && <div className="mt-3 rounded-xl border border-ink-200 bg-white px-4 py-3">{statusRow}</div>}

      {view.phase === "error" && (
        <div className="mt-3">
          <p className="text-sm text-rose-700">
            {view.error}
            {fallbackPage && (
              <>
                {" "}
                <a href={fallbackPage.url} className="font-medium underline">
                  {fallbackPage.label}
                </a>
              </>
            )}
          </p>
          {view.canRetry && (
            <button
              type="button"
              onClick={() => void ask("button")}
              className="mt-2 rounded-xl border border-saffron-300 bg-white px-3 py-1.5 text-xs font-semibold text-saffron-800 hover:border-saffron-500"
            >
              {copy.stream.retry}
            </button>
          )}
        </div>
      )}

      {(showDraft || showFinal) && (
        <div className="mt-3 break-words rounded-xl border border-ink-200 bg-white p-4">
          {showFinal && data ? (
            <>
              {data.answer ? <ChatMarkdown text={data.answer} /> : <p className="text-sm text-ink-600">{copy.unavailable}</p>}
              {/* 26 Sep 2026 (AI builder): the one checked page to open now — /api/ask validates it against the index. */}
              {data.next && data.next.url.startsWith("/") && !data.next.url.startsWith("//") && (
                <a
                  href={data.next.url}
                  className="mt-4 inline-flex max-w-full items-center gap-1.5 rounded-xl bg-saffron-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
                >
                  <span className="truncate">
                    {copy.openNext}: {data.next.label}
                  </span>
                  <span aria-hidden>→</span>
                </a>
              )}
              {pages.length > 0 && (
                <div className="mt-4 border-t border-ink-100 pt-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">{copy.pagesUsed}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {pages.map((p) => (
                      <li key={p.url}>
                        <a href={p.url} className="rounded-full border border-ink-200 px-3 py-1 text-xs font-medium text-ink-700 hover:border-saffron-400">
                          {p.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {webSources.length > 0 && (
                <div className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-500">
                  <p className="font-semibold">{copy.web}</p>
                  <ul className="mt-1 space-y-1">
                    {webSources.map((w) => (
                      <li key={w.url} className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                        {w.official === true && (
                          <span className="rounded bg-emerald-50 px-1.5 py-px text-[10px] font-semibold text-emerald-800 ring-1 ring-emerald-200">
                            {copy.stream.official}
                          </span>
                        )}
                        {/* 26 Sep 2026 (integrator): a flex item keeps min-width:auto, so a long file-name
                            title (official PDF notices, now listed first) overflowed the card at 360 px. */}
                        <a href={w.url} target="_blank" rel="noopener noreferrer" className="min-w-0 underline [overflow-wrap:anywhere]">
                          {w.title}
                        </a>
                        {w.source && w.source !== w.title && <span className="text-[10px] text-ink-400">· {w.source}</span>}
                        {w.official === false && <span className="text-[10px] text-ink-400">· {copy.stream.otherSite}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <p className="mt-4 border-t border-ink-100 pt-3 text-[11px] text-ink-400">{copy.footnote}</p>
            </>
          ) : (
            <>
              <div className={typing ? "ask-caret" : undefined}>
                <ChatMarkdown text={draftOnScreen} />
              </div>
              {live && <div className="mt-3 border-t border-ink-100 pt-3">{statusRow}</div>}
              {typing && <p className="mt-2 text-[11px] text-ink-400">{copy.stream.linksSoon}</p>}
              {view.phase === "stopped" && (
                <div className="mt-3 border-t border-ink-100 pt-3">
                  <p className="text-xs text-ink-500">{copy.stream.stopped}</p>
                  <button
                    type="button"
                    onClick={() => void ask("button")}
                    className="mt-2 rounded-xl border border-saffron-300 bg-white px-3 py-1.5 text-xs font-semibold text-saffron-800 hover:border-saffron-500"
                  >
                    {copy.stream.retry}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Stopped before a word arrived: nothing to show but asking again. */}
      {view.phase === "stopped" && view.draft.length === 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void ask("button")}
            className="mt-2 rounded-xl border border-saffron-300 bg-white px-3 py-1.5 text-xs font-semibold text-saffron-800 hover:border-saffron-500"
          >
            {copy.stream.retry}
          </button>
        </div>
      )}
    </section>
  );
}
