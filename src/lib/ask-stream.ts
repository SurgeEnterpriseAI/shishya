// Ask Shishya's streamed answer (26 Sep 2026, founder: "yes show them word by
// word"). PURE and client-safe — no DB, no model, no server-only imports — so
// the route, the engine and the /ask panel share one wire format and the
// tests cover it without a browser (tests/unit/ask-stream.test.ts).
//
// The wire: POST /api/ask with `Accept: text/event-stream` (or {stream:true})
// answers Server-Sent Events in the tutor's convention (src/app/api/chat/
// route.ts: `event: <name>\ndata: <JSON>\n\n`, the same three anti-buffering
// headers):
//   meta   {locale, outcome, pages, next}  — the pages Shishya already has for
//          the question (the resolver's, before any model call)
//   status {key, text, subject?}           — what the engine is doing, in the
//          asker's language ("Reading Shishya's SSC CGL page…")
//   delta  "<text>"                         — answer text as the model writes
//          it (a JSON string, appended — exactly the tutor's delta)
//   reset  {text}                           — the draft so far is replaced by
//          `text` (usually ""): the model wrote words and then called a tool,
//          so those words were narration, not the answer. Rare by design (the
//          prompt says "call tools silently" and the engine holds back a
//          first paragraph that looks like narration).
//   done   {answer, usedWeb, pages, links, next, webSources, notice?} — the
//          validated answer, byte-for-byte the JSON path's body
//   error  {error, code}                    — a localised line; Retry fits
// Links in delta text are NOT validated yet — the panel shows them as plain
// words until `done` swaps in the checked answer (src/lib/ask-links.ts).

import type { PageLink } from "@/lib/search/types";

// ── Engine → route events ────────────────────────────────────────────

/** A plain-words status line (copy: src/lib/search-copy.ts `stream.status`). */
export type AskStatusKey = "question" | "page" | "examPages" | "exams" | "pages" | "topics" | "guides" | "vacancies" | "web" | "thinking";
export const ASK_STATUS_KEYS: readonly AskStatusKey[] = ["question", "page", "examPages", "exams", "pages", "topics", "guides", "vacancies", "web", "thinking"];

/** What runAsk tells a streaming caller while it works (src/lib/ask-engine.ts, opts.onEvent). */
export type AskStreamEvent =
  | { type: "status"; key: AskStatusKey; subject?: string }
  | { type: "delta"; text: string }
  | { type: "reset"; text: string };

/** The status line for a key: `{x}` is a Shishya page or exam name taken from the index (never the question's words). */
export function askStatusText(lines: Readonly<Record<AskStatusKey, string>>, key: AskStatusKey, subject?: string): string {
  const line = lines[key] ?? lines.pages;
  if (!line.includes("{x}")) return line;
  const x = (subject ?? "").replace(/[\u0000-\u001f<>*_`[\]()#|]/g, "").trim().slice(0, 60);
  // A "{x}" line without a name falls back to the generic page line.
  return x ? line.replace("{x}", x) : lines.pages;
}

// ── SSE frames ───────────────────────────────────────────────────────

/** The headers that stop Vercel / proxies from buffering the stream (the chat route's set). */
export const ASK_SSE_HEADERS: Readonly<Record<string, string>> = {
  "content-type": "text/event-stream; charset=utf-8",
  "cache-control": "no-cache, no-transform",
  "x-accel-buffering": "no",
};

export type AskFrameName = "meta" | "status" | "delta" | "reset" | "done" | "error";

/** One SSE frame. JSON.stringify never emits a raw newline, so the data is always one line. */
export function sseFrame(event: AskFrameName, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export interface SseFrame {
  event: string;
  data: string;
}

function parseBlock(block: string): SseFrame | null {
  let event = "message";
  const data: string[] = [];
  for (const line of block.split("\n")) {
    if (!line || line.startsWith(":")) continue; // comment / keep-alive
    const colon = line.indexOf(":");
    const field = colon < 0 ? line : line.slice(0, colon);
    let value = colon < 0 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);
    if (field === "event") event = value.trim() || "message";
    else if (field === "data") data.push(value);
  }
  return data.length ? { event, data: data.join("\n") } : null;
}

/**
 * An incremental SSE parser: push() decoded text as it arrives (frames may be
 * split anywhere, CRLF or LF), get back the complete frames; flush() at the
 * end of the body for a last frame without its blank line.
 */
export function createSseParser() {
  let buf = "";
  return {
    push(chunk: string): SseFrame[] {
      buf += chunk;
      // A CR at the very end may be the first half of a CRLF: keep it for the next chunk.
      const tail = buf.endsWith("\r") ? "\r" : "";
      if (tail) buf = buf.slice(0, -1);
      buf = buf.replace(/\r\n?/g, "\n");
      const parts = buf.split("\n\n");
      buf = (parts.pop() ?? "") + tail;
      return parts.map(parseBlock).filter((f): f is SseFrame => f !== null);
    },
    flush(): SseFrame[] {
      const rest = buf.replace(/\r\n?/g, "\n").trim();
      buf = "";
      const f = rest ? parseBlock(rest) : null;
      return f ? [f] : [];
    },
  };
}

// ── The /ask panel's state (src/app/ask/AskAnswer.tsx) ───────────────

export interface AskWebSource {
  title: string;
  url: string;
  /** On the conducting body's own site or a gov.in / nic.in / ac.in / edu.in domain (src/lib/official-source.ts). */
  official?: boolean;
  /** The body's name ("Staff Selection Commission (SSC)") or the bare host, when the server gives one. */
  source?: string;
}

/** The answer body: the JSON path's response and the stream's `done` frame are the same object. */
export interface AskAnswerPayload {
  answer: string | null;
  usedWeb?: boolean;
  pages?: PageLink[];
  links?: { url: string; title?: string; label?: string }[];
  next?: PageLink | null;
  webSources?: AskWebSource[];
  notice?: string;
}

export type AskPhase = "idle" | "busy" | "streaming" | "done" | "error" | "stopped";

export interface AskView {
  phase: AskPhase;
  /** The latest status line (already in the asker's language). */
  status: string | null;
  /** The answer as streamed so far — unvalidated; shown with links as plain words. */
  draft: string;
  /** The resolver's pages (the meta frame): the fallback link when the answer fails. */
  metaPages: PageLink[];
  data: AskAnswerPayload | null;
  error: string | null;
  /** Whether a "try again" button fits this error (not for rate limits or a refused browser). */
  canRetry: boolean;
}

export const ASK_VIEW_IDLE: AskView = { phase: "idle", status: null, draft: "", metaPages: [], data: null, error: null, canRetry: false };

export type AskAction =
  | { type: "start" }
  | { type: "meta"; pages: PageLink[] }
  | { type: "status"; text: string }
  | { type: "delta"; text: string }
  | { type: "reset"; text: string }
  | { type: "done"; data: AskAnswerPayload }
  | { type: "error"; message: string; canRetry: boolean }
  | { type: "stop" };

const live = (p: AskPhase) => p === "busy" || p === "streaming";

export function askReducer(s: AskView, a: AskAction): AskView {
  switch (a.type) {
    case "start":
      return { ...ASK_VIEW_IDLE, phase: "busy" };
    case "meta":
      return live(s.phase) ? { ...s, metaPages: a.pages } : s;
    case "status":
      return live(s.phase) ? { ...s, status: a.text } : s;
    case "delta":
      return live(s.phase) && a.text ? { ...s, phase: "streaming", draft: s.draft + a.text } : s;
    case "reset":
      return live(s.phase) ? { ...s, phase: a.text ? "streaming" : "busy", draft: a.text } : s;
    case "done":
      // A stopped answer stays stopped: the person asked for it to end.
      return s.phase === "stopped" ? s : { ...s, phase: "done", status: null, data: a.data, error: null };
    case "error":
      return s.phase === "done" || s.phase === "stopped" ? s : { ...s, phase: "error", status: null, error: a.message, canRetry: a.canRetry };
    case "stop":
      return live(s.phase) ? { ...s, phase: "stopped", status: null } : s;
  }
}

const isPage = (p: unknown): p is PageLink =>
  !!p && typeof p === "object" && typeof (p as PageLink).url === "string" && typeof (p as PageLink).label === "string";

/** One wire frame → the panel's action (null for anything unknown or malformed). */
export function frameToAction(f: SseFrame, failed: string): AskAction | null {
  let d: unknown;
  try {
    d = JSON.parse(f.data);
  } catch {
    return null;
  }
  const o = (d && typeof d === "object" ? d : {}) as Record<string, unknown>;
  switch (f.event) {
    case "meta":
      return { type: "meta", pages: Array.isArray(o.pages) ? o.pages.filter(isPage) : [] };
    case "status":
      return typeof o.text === "string" ? { type: "status", text: o.text } : null;
    case "delta":
      return typeof d === "string" ? { type: "delta", text: d } : null;
    case "reset":
      return { type: "reset", text: typeof o.text === "string" ? o.text : "" };
    case "done":
      return "answer" in o ? { type: "done", data: o as unknown as AskAnswerPayload } : null;
    case "error":
      return { type: "error", message: typeof o.error === "string" && o.error ? o.error : failed, canRetry: true };
    default:
      return null;
  }
}

// ── Showing a draft ──────────────────────────────────────────────────

const MD_LINK = /\[([^\]\n]*)\]\(\s*<?(?:[^()\s<>]|\([^()\s<>]*\))+>?\s*\)/g;
// 26 Sep 2026 (integrator): the panel renders the draft with ChatMarkdown,
// whose tokenizer also links `[label] (url)` (up to 3 whitespace characters
// before the "(", the href up to the first ")", spaces allowed) and `./url`
// — so an unchecked Shishya path written that way was live in the draft, and
// stayed live after Stop. The same grammar is neutralised here.
const MD_LINK_LOOSE = /\[([^\]]*)\]\s{0,3}\(([^)]*)\)/g;
const LINKABLE = /^(?:https?:\/\/|\.{0,2}\/)/i;
const BARE_URL = /https?:\/\/[^\s<>()[\]"'`]+/g;

function hostOf(u: string): string {
  const m = /^https?:\/\/(?:www\.)?([^/?#\s]+)/i.exec(u);
  return m ? m[1] : "";
}

/**
 * The streamed draft as the panel shows it: every link is plain words until
 * the validated answer arrives (a checked link can differ from the one the
 * model wrote) — [label](url) shows its label, an unfinished link at the end
 * shows only its label, a bare URL shows only its host — and a half-written
 * markdown marker on the last line (an unclosed **, `, a trailing * or a
 * half-typed table rule) is hidden until it closes.
 */
export function draftForDisplay(text: string): string {
  let t = text.replace(MD_LINK, "$1");
  t = t.replace(MD_LINK_LOOSE, (m, label: string, href: string) => (LINKABLE.test(href.trim()) ? label : m));
  t = t.replace(/\[([^\]\n]*)\]\s{0,3}\([^)]*$/, "$1"); // [label](https://shish…  or  [label] (/exa…
  t = t.replace(/\[([^\]\n]*)\]?\s{0,3}$/, "$1"); // [label  or  [label]  or  [label]␠
  t = t.replace(BARE_URL, (u) => hostOf(u));
  const nl = t.lastIndexOf("\n");
  let last = t.slice(nl + 1);
  if (/^\s*\|[\s|:-]*$/.test(last) && last.includes("-")) last = "";
  if ((last.match(/\*\*/g) ?? []).length % 2 === 1) {
    const i = last.lastIndexOf("**");
    last = last.slice(0, i) + last.slice(i + 2);
  }
  last = last.replace(/(^|[^*])\*+$/, "$1");
  if ((last.match(/`/g) ?? []).length % 2 === 1) {
    const i = last.lastIndexOf("`");
    last = last.slice(0, i) + last.slice(i + 1);
  }
  return t.slice(0, nl + 1) + last;
}

/**
 * Word-by-word reveal: how much of `target` to show after one tick (~33 ms)
 * when `shown` characters are showing. One word a tick while the stream keeps
 * pace; more when it runs ahead, so the text never lags far behind the model;
 * `hurry` (the answer is complete) catches up within a few ticks. Cuts only at
 * whitespace — never inside a word or an emoji.
 */
export function revealNext(target: string, shown: number, hurry = false): number {
  const len = target.length;
  if (shown >= len) return len;
  const backlog = len - shown;
  const words = hurry ? Math.max(6, Math.ceil(backlog / 12)) : Math.max(1, Math.ceil(backlog / 60));
  let i = Math.max(0, shown);
  for (let w = 0; w < words && i < len; w++) {
    while (i < len && /\s/.test(target[i])) i++;
    while (i < len && !/\s/.test(target[i])) i++;
  }
  return i;
}

/** Characters two drafts share from the start (a reset keeps what is already on screen when it can). */
export function commonPrefixLength(a: string, b: string): number {
  const n = Math.min(a.length, b.length);
  let i = 0;
  while (i < n && a.charCodeAt(i) === b.charCodeAt(i)) i++;
  return i;
}

// ── The engine's visible-text gate ───────────────────────────────────

/** Openings finalText (src/lib/ask-engine.ts) drops as narration when a real paragraph follows. */
const NARRATION_HEADS = ["let me", "i'll", "i’ll", "i will", "searching", "checking", "first, let", "first let"];

/**
 * Whether a turn's first words could still turn out to be narration ("Let me
 * check…"): a single short paragraph that starts like one — or could still
 * become one ("Le…"). Held back until a paragraph break, 200 characters or
 * the end of the turn decides it.
 */
export function mayBeNarration(text: string): boolean {
  const t = text.trimStart();
  if (t.includes("\n\n") || t.length >= 200) return false;
  const h = t.toLowerCase();
  return NARRATION_HEADS.some((s) => s.startsWith(h) || h.startsWith(s));
}

/**
 * Turns the text a turn would show (recomputed after every stream event) into
 * delta / reset events. Only growth is sent as a delta; a change that is not
 * growth (narration dropped, a tool call after words) is a reset carrying the
 * new text. A new turn clears what an earlier turn sent: the answer is the
 * last response's text only.
 */
export function createTextGate(emit: (e: AskStreamEvent) => void) {
  let sent = "";
  return {
    newTurn() {
      if (sent) emit({ type: "reset", text: "" });
      sent = "";
    },
    update(visible: string, turnOver = false) {
      if (visible === sent) return;
      if (!sent && !turnOver && mayBeNarration(visible)) return;
      if (visible.startsWith(sent)) emit({ type: "delta", text: visible.slice(sent.length) });
      else emit({ type: "reset", text: visible });
      sent = visible;
    },
    get sent() {
      return sent;
    },
  };
}
