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

function textOf(content: Msg["content"]): string | null {
  if (typeof content === "string") return content;
  const parts: string[] = [];
  for (const b of content) {
    if (b.type !== "text") return null; // images, tool blocks → not for the local route
    parts.push(b.text);
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
    const t = textOf(m.content);
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

/** Whether this call may try the local server first. */
export function localEligible(feature: string | undefined, req: { system: Block[]; messages: Msg[]; tools?: unknown }): boolean {
  if (!routeFor(feature)) return false;
  if (req.tools) return false;
  return isEnglishOnly(req.system, req.messages);
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
    messages: [
      { role: "system", content: req.system.map((b) => b.text).join("\n\n") },
      ...req.messages.map((m) => ({ role: m.role, content: textOf(m.content) ?? "" })),
    ],
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
 * Try the local server when eligible; on any failure log one line and run
 * the Claude path. Returns which path served the call.
 */
export async function localFirst<T extends Anthropic.Messages.Message>(
  feature: string | undefined,
  req: { system: Block[]; messages: Msg[]; maxTokens: number; temperature?: number; tools?: unknown },
  claude: () => Promise<T>,
): Promise<{ value: Anthropic.Messages.Message; local: boolean }> {
  const route = routeFor(feature);
  if (route && localEligible(feature, req)) {
    try {
      return { value: await callLocal(req, route), local: true };
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
): Promise<Anthropic.Messages.Message> {
  const system: Block[] =
    typeof params.system === "string" ? [{ type: "text", text: params.system }] : (params.system ?? []);
  const { value } = await localFirst(
    feature,
    { system, messages: params.messages, maxTokens: params.max_tokens, temperature: params.temperature, tools: params.tools },
    () => client.messages.create(params),
  );
  return value;
}

/** The model name for the spend ledger: the local label when the local server answered. */
export function ledgerModel(response: { model?: string }, claudeModel: string): string {
  return response.model?.startsWith("local:") ? response.model : claudeModel;
}
