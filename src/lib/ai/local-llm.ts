// Local model route (12 Oct 2026) — Surge's own GPU server (Qwen on vLLM).
//
// Founder decision: English → local Qwen; Hindi, Telugu and every other
// Indian language → Claude. A 300-question English test on the validated
// bank scored Qwen3.5-9B 92.7% and Qwen3.8-27B 94.3% (both under Claude's
// verified key), so plain English text work can run on our own hardware.
//
// The route is opt-in per feature and never the only path:
//   LOCAL_LLM_URL       OpenAI-compatible base, e.g. https://surgeai.<tailnet>.ts.net/v1
//   LOCAL_LLM_KEY       bearer key the vLLM server was started with
//   LOCAL_LLM_MODEL     served model name (default "qwen3.5-9b")
//   LOCAL_LLM_FEATURES  comma list of ledger features allowed to go local, e.g. "explain,tutor-anon"
//   LOCAL_LLM_BULK_URL / LOCAL_LLM_BULK_FEATURES (12 Oct 2026): background and
//     bulk jobs (mocks, question generation, bank solving, coach, briefs) go to
//     a second copy of the model on the other GPU, so a 5,000-question run
//     never queues ahead of a student. Bulk calls wait longer
//     (LOCAL_LLM_BULK_TIMEOUT_MS, default 120 s) before falling back.
// A call goes local only when its feature is listed, it carries no tools,
// and nothing in it is in an Indian-language script or asks for a non-English
// reply. Any local failure (down, slow, empty) falls back to Claude, so the
// student never sees the home server's state.

import type Anthropic from "@anthropic-ai/sdk";

const URL_BASE = process.env.LOCAL_LLM_URL?.replace(/\/+$/, "") ?? "";
const KEY = process.env.LOCAL_LLM_KEY ?? "";
export const LOCAL_MODEL = process.env.LOCAL_LLM_MODEL ?? "qwen3.5-9b";
const list = (v: string | undefined) => new Set((v ?? "").split(",").map((s) => s.trim()).filter(Boolean));
const FEATURES = list(process.env.LOCAL_LLM_FEATURES);
const BULK_FEATURES = list(process.env.LOCAL_LLM_BULK_FEATURES);
const BULK_URL = process.env.LOCAL_LLM_BULK_URL?.replace(/\/+$/, "") || URL_BASE;
const TIMEOUT_MS = Number(process.env.LOCAL_LLM_TIMEOUT_MS ?? 25_000);
const BULK_TIMEOUT_MS = Number(process.env.LOCAL_LLM_BULK_TIMEOUT_MS ?? 120_000);

/** Which local endpoint serves this feature, or null when it stays on Claude. */
function routeFor(feature: string | undefined): { url: string; timeoutMs: number } | null {
  if (!KEY || !feature) return null;
  if (FEATURES.has(feature) && URL_BASE) return { url: URL_BASE, timeoutMs: TIMEOUT_MS };
  if (BULK_FEATURES.has(feature) && BULK_URL) return { url: BULK_URL, timeoutMs: BULK_TIMEOUT_MS };
  return null;
}

// Devanagari, Bengali, Gurmukhi, Gujarati, Oriya, Tamil, Telugu, Kannada,
// Malayalam (U+0900–U+0D7F) and Urdu/Arabic.
const INDIC = /[ऀ-ൿ؀-ۿ]/;
// "Reply language: HI" / "Reply language: Hindi" — the line every Shishya prompt carries.
const REPLY_LANG = /Reply language:\s*([A-Za-z]+)/g;

type Block = Anthropic.Messages.TextBlockParam;
type Msg = Anthropic.Messages.MessageParam;

/**
 * Readable text of a message for the language check, tool calls and tool
 * results included (12 Oct 2026, the signed-in tutor's tool loop). Null for
 * anything the local route cannot carry (images, documents).
 */
function convoTextOf(content: Msg["content"]): string | null {
  if (typeof content === "string") return content;
  const parts: string[] = [];
  for (const b of content) {
    if (b.type === "text") parts.push(b.text);
    else if (b.type === "tool_use") parts.push(JSON.stringify(b.input ?? {}));
    else if (b.type === "tool_result") {
      const c = b.content;
      if (typeof c === "string") parts.push(c);
      else if (Array.isArray(c)) for (const x of c) if (x.type === "text") parts.push(x.text);
    } else return null;
  }
  return parts.join("\n");
}

/**
 * True when the conversation is English and asks for an English reply. The
 * script check reads the conversation only: Shishya's own system prompt
 * carries a Hindi link label ("हिंदी में पढ़ें", ai/site-facts.ts), which
 * kept every guest turn off the local route on the first deploy (12 Oct 2026).
 * The "Reply language" line is read everywhere, system prompt included.
 */
export function isEnglishOnly(system: Block[], messages: Msg[]): boolean {
  const convo: string[] = [];
  for (const m of messages) {
    const t = convoTextOf(m.content);
    if (t == null) return false;
    convo.push(t);
  }
  if (INDIC.test(convo.join("\n"))) return false;
  const all = [...system.map((b) => b.text), ...convo].join("\n");
  for (const m of all.matchAll(REPLY_LANG)) {
    const lang = m[1].toUpperCase();
    if (lang !== "EN" && lang !== "ENGLISH") return false;
  }
  return true;
}

// Features that may also go local for a HINDI reply (13 Oct 2026, the Indian-
// language eval, blind Opus judge vs Claude: Hindi-script explanations 6 of 9
// won, criticals 1 vs Claude 1; Marathi lost 3 of 3, so only Hindi). The
// caller must reject a local reply that is not in Devanagari (Qwen answered
// in English or romanised Hindi 3 of 8 times) — explainer.ts does.
const HINDI_FEATURES = list(process.env.LOCAL_LLM_HINDI_FEATURES);
const OTHER_INDIC = /[ঀ-ൿ؀-ۿ]/;

/**
 * True when every "Reply language" line asks for Hindi and the conversation
 * holds no Indian script other than Devanagari.
 */
export function isHindiOnly(system: Block[], messages: Msg[]): boolean {
  const convo: string[] = [];
  for (const m of messages) {
    const t = convoTextOf(m.content);
    if (t == null) return false;
    convo.push(t);
  }
  if (OTHER_INDIC.test(convo.join("\n"))) return false;
  const all = [...system.map((b) => b.text), ...convo].join("\n");
  let langs = 0;
  for (const m of all.matchAll(REPLY_LANG)) {
    const lang = m[1].toUpperCase();
    if (lang !== "HI" && lang !== "HINDI") return false;
    langs++;
  }
  return langs > 0;
}

/** Share of the letters in `text` that are Devanagari (0..1). */
export function devanagariShare(text: string): number {
  const letters = text.replace(/[\s\d\p{P}\p{S}]/gu, "");
  if (!letters.length) return 0;
  return (letters.match(/[ऀ-ॿ]/g) ?? []).length / letters.length;
}

/** Whether this call may try the local server first. */
export function localEligible(
  feature: string | undefined,
  req: { system: Block[]; messages: Msg[]; tools?: unknown },
  opts: { allowTools?: boolean } = {},
): boolean {
  if (!routeFor(feature)) return false;
  if (req.tools && !opts.allowTools) return false;
  if (isEnglishOnly(req.system, req.messages)) return true;
  return !!feature && HINDI_FEATURES.has(feature) && isHindiOnly(req.system, req.messages);
}

/**
 * One chat call to the local server, returned in the Anthropic Message shape
 * so extractText / recordAiUsage work unchanged. Throws on any failure; the
 * caller falls back to Claude.
 */
export async function callLocal(
  req: {
    system: Block[];
    messages: Msg[];
    maxTokens: number;
    temperature?: number;
  },
  route: { url: string; timeoutMs: number } = { url: URL_BASE, timeoutMs: TIMEOUT_MS },
): Promise<Anthropic.Messages.Message> {
  const body = {
    model: LOCAL_MODEL,
    max_tokens: req.maxTokens,
    temperature: req.temperature ?? 0.3,
    messages: toOpenAiMessages(req.system, req.messages),
    // Qwen hybrid models: answer directly, no hidden reasoning pass.
    chat_template_kwargs: { enable_thinking: false },
  };
  const res = await fetch(`${route.url}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(route.timeoutMs),
  });
  if (!res.ok) throw new Error(`local-llm ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const choice = data?.choices?.[0];
  const text: string = choice?.message?.content ?? "";
  if (!text.trim()) throw new Error("local-llm: empty reply");
  return {
    id: data.id ?? "local",
    type: "message",
    role: "assistant",
    model: `local:${LOCAL_MODEL}`,
    content: [{ type: "text", text, citations: null }],
    stop_reason: choice?.finish_reason === "length" ? "max_tokens" : "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: data?.usage?.prompt_tokens ?? 0,
      output_tokens: data?.usage?.completion_tokens ?? 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  } as unknown as Anthropic.Messages.Message;
}

/**
 * A feature's own check on a LOCAL reply (13 Oct 2026, from the Qwen-vs-Claude
 * audit): null serves it; a short reason discards it and runs the Claude path.
 * Never applied to Claude's reply. A check that throws counts as a failure.
 */
export type LocalAccept = (msg: Anthropic.Messages.Message) => string | null;

/**
 * Try the local server when eligible; on any failure log one line and run
 * the Claude path. Returns which path served the call.
 */
export async function localFirst<T extends Anthropic.Messages.Message>(
  feature: string | undefined,
  req: { system: Block[]; messages: Msg[]; maxTokens: number; temperature?: number; tools?: unknown },
  claude: () => Promise<T>,
  accept?: LocalAccept,
): Promise<{ value: Anthropic.Messages.Message; local: boolean }> {
  const route = routeFor(feature);
  if (route && localEligible(feature, req)) {
    try {
      const value = await callLocal(req, route);
      const rejected = accept ? accept(value) : null;
      if (rejected == null) return { value, local: true };
      console.warn(`[local-llm] ${feature}: rejected (${rejected.slice(0, 160)}), Claude`);
    } catch (err) {
      console.warn(`[local-llm] ${feature}: fell back to Claude (${String((err as Error)?.message ?? err).slice(0, 160)})`);
    }
  }
  return { value: await claude(), local: false };
}

/**
 * localFirst for the call sites that use client.messages.create directly
 * (daily brief, rank bands, demand mining, discussion replies): takes the
 * same request body, accepts a string system prompt, and runs the Claude
 * call unchanged when the local route is off or fails.
 */
export async function createLocalFirst(
  feature: string,
  client: Anthropic,
  params: Anthropic.Messages.MessageCreateParamsNonStreaming,
  opts: { acceptLocal?: LocalAccept } = {},
): Promise<Anthropic.Messages.Message> {
  const system: Block[] =
    typeof params.system === "string" ? [{ type: "text", text: params.system }] : (params.system ?? []);
  const { value } = await localFirst(
    feature,
    { system, messages: params.messages, maxTokens: params.max_tokens, temperature: params.temperature, tools: params.tools },
    () => client.messages.create(params),
    opts.acceptLocal,
  );
  return value;
}

/** The model name for the spend ledger: the local label when the local server answered. */
export function ledgerModel(response: { model?: string }, claudeModel: string): string {
  return response.model?.startsWith("local:") ? response.model : claudeModel;
}

/**
 * The local endpoint for this call when it may go local (listed feature,
 * no tools, English conversation), else null. For callers that stream.
 */
export function localRouteFor(
  feature: string | undefined,
  req: { system: Block[]; messages: Msg[]; tools?: unknown },
  opts: { allowTools?: boolean } = {},
): { url: string; timeoutMs: number } | null {
  return localEligible(feature, req, opts) ? routeFor(feature) : null;
}

type OpenAiToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type OpenAiMsg =
  | { role: "system" | "user"; content: string }
  | { role: "assistant"; content: string; tool_calls?: OpenAiToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

/**
 * Anthropic messages -> OpenAI chat messages (12 Oct 2026). An assistant
 * turn's tool_use blocks become tool_calls; a user turn's tool_result blocks
 * become one "tool" message each, followed by any text in that turn.
 */
export function toOpenAiMessages(system: Block[], messages: Msg[]): OpenAiMsg[] {
  const out: OpenAiMsg[] = [{ role: "system", content: system.map((b) => b.text).join("\n\n") }];
  for (const m of messages) {
    if (typeof m.content === "string") {
      out.push({ role: m.role, content: m.content });
      continue;
    }
    const text: string[] = [];
    if (m.role === "assistant") {
      const calls: OpenAiToolCall[] = [];
      for (const b of m.content) {
        if (b.type === "text") text.push(b.text);
        else if (b.type === "tool_use") calls.push({ id: b.id, type: "function", function: { name: b.name, arguments: JSON.stringify(b.input ?? {}) } });
      }
      out.push({ role: "assistant", content: text.join("\n"), ...(calls.length ? { tool_calls: calls } : {}) });
      continue;
    }
    for (const b of m.content) {
      if (b.type === "text") text.push(b.text);
      else if (b.type === "tool_result") {
        const c = b.content;
        const body = typeof c === "string" ? c : Array.isArray(c) ? c.map((x) => (x.type === "text" ? x.text : "")).join("\n") : "";
        out.push({ role: "tool", tool_call_id: b.tool_use_id, content: b.is_error ? `ERROR: ${body}` : body });
      }
    }
    if (text.length) out.push({ role: "user", content: text.join("\n") });
  }
  return out;
}

/** Anthropic tool definitions -> OpenAI function tools. */
export function toOpenAiTools(tools: Anthropic.Messages.Tool[]) {
  return tools.map((t) => ({ type: "function" as const, function: { name: t.name, description: t.description ?? "", parameters: t.input_schema } }));
}

export interface LocalToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/** Longest silence allowed between two streamed pieces once the answer has started. */
const STREAM_IDLE_MS = Number(process.env.LOCAL_LLM_STREAM_IDLE_MS ?? 30_000);

/**
 * Stream one chat from the local server (12 Oct 2026): yields text pieces as
 * the model writes them, then one { usage } at the end. route.timeoutMs bounds
 * the wait for the FIRST piece only, so a long answer is never cut off by its
 * length — Qwen 27B writes ~20 tokens/s and a full explanation runs ~70 s.
 * Throws on any failure; the caller falls back to Claude only when nothing
 * has been shown yet.
 */
export async function* streamLocal(
  req: {
    system: Block[];
    messages: Msg[];
    maxTokens: number;
    temperature?: number;
    tools?: Anthropic.Messages.Tool[];
    toolChoice?: "auto" | "none";
  },
  route: { url: string; timeoutMs: number },
): AsyncGenerator<
  { delta: string } | { usage: { input_tokens: number; output_tokens: number } } | { toolCalls: LocalToolCall[] }
> {
  const ctrl = new AbortController();
  let timer = setTimeout(() => ctrl.abort(new Error("local-llm: no first token in time")), route.timeoutMs);
  const idle = () => {
    clearTimeout(timer);
    timer = setTimeout(() => ctrl.abort(new Error("local-llm: stream went silent")), STREAM_IDLE_MS);
  };
  try {
    const res = await fetch(`${route.url}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
      body: JSON.stringify({
        model: LOCAL_MODEL,
        max_tokens: req.maxTokens,
        temperature: req.temperature ?? 0.3,
        stream: true,
        stream_options: { include_usage: true },
        messages: toOpenAiMessages(req.system, req.messages),
        ...(req.tools?.length ? { tools: toOpenAiTools(req.tools), tool_choice: req.toolChoice ?? "auto" } : {}),
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) throw new Error(`local-llm ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let pending = "";
    // Tool calls arrive in pieces keyed by index: id and name first, then
    // the JSON arguments a fragment at a time. They are handed over whole
    // when the stream ends.
    const calls: { id: string; name: string; args: string }[] = [];
    const whole = (): { toolCalls: LocalToolCall[] } | null =>
      calls.length
        ? { toolCalls: calls.map((c, i) => ({ id: c.id || `local_call_${i}`, name: c.name, input: c.args.trim() ? JSON.parse(c.args) : {} })) }
        : null;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) {
        const tc = whole();
        if (tc) yield tc;
        break;
      }
      pending += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, nl).trim();
        pending = pending.slice(nl + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") {
          const tc = whole();
          if (tc) yield tc;
          return;
        }
        const data = JSON.parse(payload);
        const delta = data?.choices?.[0]?.delta;
        const piece: string | undefined = delta?.content;
        if (piece) {
          idle();
          yield { delta: piece };
        }
        for (const tc of delta?.tool_calls ?? []) {
          idle();
          const c = (calls[tc.index ?? 0] ??= { id: "", name: "", args: "" });
          if (tc.id) c.id = tc.id;
          if (tc.function?.name) c.name += tc.function.name;
          if (tc.function?.arguments) c.args += tc.function.arguments;
        }
        if (data?.usage) {
          yield { usage: { input_tokens: data.usage.prompt_tokens ?? 0, output_tokens: data.usage.completion_tokens ?? 0 } };
        }
      }
    }
  } finally {
    clearTimeout(timer);
  }
}

const ACTIONS_MARK = "<<ACTIONS>>";

/**
 * Turns the model's raw text pieces into what the student may see while it
 * is still writing (12 Oct 2026): nothing from the <<ACTIONS>> block on, no
 * leading whitespace, and trailing whitespace only once more text follows —
 * so the pieces add up to the same reply splitActions() keeps at the end.
 */
export class ReplyStreamFilter {
  private buf = "";
  private start = -1; // index of the first non-space character
  private end = 0; // everything in buf[start, end) has been shown
  private stopped = false;

  push(piece: string): string {
    if (this.stopped) return "";
    this.buf += piece;
    let safe = this.buf.length;
    const mark = this.buf.indexOf(ACTIONS_MARK);
    if (mark >= 0) {
      this.stopped = true;
      safe = mark;
    } else {
      // Hold back a tail that could be the start of the marker.
      for (let k = Math.min(ACTIONS_MARK.length - 1, this.buf.length); k > 0; k--) {
        if (ACTIONS_MARK.startsWith(this.buf.slice(-k))) {
          safe = this.buf.length - k;
          break;
        }
      }
    }
    if (this.start < 0) {
      const first = this.buf.slice(0, safe).search(/\S/);
      if (first < 0) return "";
      this.start = first;
      this.end = first;
    }
    const upto = this.start + this.buf.slice(this.start, safe).replace(/\s+$/, "").length;
    if (upto <= this.end) return "";
    const out = this.buf.slice(this.end, upto);
    this.end = upto;
    return out;
  }

  /** What is left to show once the final reply is known (normally the empty string). */
  finish(reply: string): string {
    const shown = this.start < 0 ? "" : this.buf.slice(this.start, this.end);
    return reply.startsWith(shown) ? reply.slice(shown.length) : "";
  }
}
