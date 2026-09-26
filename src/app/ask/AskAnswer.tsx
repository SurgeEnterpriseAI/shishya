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

import { useEffect, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import type { SearchCopy } from "@/lib/search-copy";
import type { Outcome, PageLink } from "@/lib/search/types";
import { ASK_ANSWER_KEY, ASK_INTENT_KEY, ASK_INTENT_TTL_MS } from "@/lib/search/types";

interface AnswerPayload {
  answer: string | null;
  usedWeb?: boolean;
  pages?: PageLink[];
  links?: { url: string; title?: string; label?: string }[];
  next?: PageLink | null;
  webSources?: { title: string; url: string }[];
  notice?: string;
}

type State = { kind: "idle" } | { kind: "busy" } | { kind: "done"; data: AnswerPayload } | { kind: "error"; message: string };

const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();
const sameQ = (a: string, b: string) => norm(a) === norm(b);

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
  const [state, setState] = useState<State>({ kind: "idle" });
  const [stage, setStage] = useState(0);
  const started = useRef(false);

  async function ask(via: "strip" | "button") {
    if (started.current) return;
    started.current = true;
    setState({ kind: "busy" });
    setStage(0);
    const stager = setInterval(() => setStage((s) => Math.min(s + 1, copy.stages.length - 1)), 3500);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q, via, locale }),
      });
      const data = (await res.json().catch(() => ({}))) as AnswerPayload & { error?: string; message?: string };
      if (res.status === 403) setState({ kind: "error", message: copy.unavailable });
      else if (res.status === 429) setState({ kind: "error", message: copy.rateLimited });
      else if (!res.ok) {
        started.current = false; // a failed call may be retried by hand
        setState({ kind: "error", message: copy.failed });
      } else {
        setState({ kind: "done", data });
        try {
          sessionStorage.setItem(ASK_ANSWER_KEY + norm(q), JSON.stringify(data));
        } catch {
          /* storage off: the answer still shows */
        }
      }
    } catch {
      started.current = false;
      setState({ kind: "error", message: copy.failed });
    } finally {
      clearInterval(stager);
    }
  }

  useEffect(() => {
    // Back / forward: show the answer this tab already received.
    try {
      const cached = sessionStorage.getItem(ASK_ANSWER_KEY + norm(q));
      if (cached) {
        started.current = true;
        setState({ kind: "done", data: JSON.parse(cached) as AnswerPayload });
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

  const pages: PageLink[] = (() => {
    if (state.kind !== "done") return [];
    const d = state.data;
    if (d.pages?.length) return d.pages;
    return (d.links ?? []).map((l) => ({ url: l.url, label: l.label ?? l.title ?? l.url, section: "more" as const }));
  })();

  return (
    <section className="mt-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-4 sm:p-5" aria-live="polite" data-ask-answer>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-bold text-ink-900">✨ {copy.answerTitle}</h2>
        <p className="text-[11px] text-ink-500">{copy.answerTag}</p>
      </div>

      {state.kind === "idle" && (
        <button
          type="button"
          onClick={() => void ask("button")}
          className="mt-3 rounded-xl bg-saffron-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
        >
          {outcome === "ai" || forceAi ? copy.getAnswer : copy.askMore}
        </button>
      )}

      {state.kind === "busy" && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-saffron-500" aria-hidden />
          <p className="text-sm text-ink-600">{copy.stages[stage]}</p>
        </div>
      )}

      {state.kind === "error" && (
        <div className="mt-3">
          <p className="text-sm text-rose-700">
            {state.message}
            {best && (
              <>
                {" "}
                <a href={best.url} className="font-medium underline">
                  {best.label}
                </a>
              </>
            )}
          </p>
          {state.message === copy.failed && (
            <button
              type="button"
              onClick={() => void ask("button")}
              className="mt-2 rounded-xl border border-saffron-300 bg-white px-3 py-1.5 text-xs font-semibold text-saffron-800 hover:border-saffron-500"
            >
              {copy.getAnswer}
            </button>
          )}
        </div>
      )}

      {state.kind === "done" && (
        <div className="mt-3 rounded-xl border border-ink-200 bg-white p-4">
          {state.data.answer ? <ChatMarkdown text={state.data.answer} /> : <p className="text-sm text-ink-600">{copy.unavailable}</p>}
          {/* 26 Sep 2026 (AI builder): the one checked page to open now — /api/ask validates it against the index. */}
          {state.data.next && state.data.next.url.startsWith("/") && !state.data.next.url.startsWith("//") && (
            <a
              href={state.data.next.url}
              className="mt-4 inline-flex max-w-full items-center gap-1.5 rounded-xl bg-saffron-500 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
            >
              <span className="truncate">
                {copy.openNext}: {state.data.next.label}
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
          {state.data.webSources && state.data.webSources.length > 0 && (
            <div className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-500">
              <p className="font-semibold">{copy.web}</p>
              <ul className="mt-1 space-y-0.5">
                {state.data.webSources.map((w) => (
                  <li key={w.url}>
                    <a href={w.url} target="_blank" rel="noopener noreferrer" className="underline">
                      {w.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="mt-4 border-t border-ink-100 pt-3 text-[11px] text-ink-400">{copy.footnote}</p>
        </div>
      )}
    </section>
  );
}
