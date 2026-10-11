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
// A call goes local only when its feature is listed, it carries no tools,
// and nothing in it is in an Indian-language script or asks for a non-English
// reply. Any local failure (down, slow, empty) falls back to Claude, so the
// student never sees the home server's state.

import type Anthropic from "@anthropic-ai/sdk";

const URL_BASE = process.env.LOCAL_LLM_URL?.replace(/\/+$/, "") ?? "";
const KEY = process.env.LOCAL_LLM_KEY ?? "";
export const LOCAL_MODEL = process.env.LOCAL_LLM_MODEL ?? "qwen3.5-9b";
const FEATURES = new Set(
  (process.env.LOCAL_LLM_FEATURES ?? "").split(",").map((s) => s.trim()).filter(Boolean),
);
const TIMEOUT_MS = Number(process.env.LOCAL_LLM_TIMEOUT_MS ?? 25_000);

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
  if (!URL_BASE || !KEY || !feature || !FEATURES.has(feature)) return false;
  if (req.tools) return false;
  return isEnglishOnly(req.system, req.messages);
}

/**
 * One chat call to the local server, returned in the Anthropic Message shape
 * so extractText / recordAiUsage work unchanged. Throws on any failure; the
 * caller falls back to Claude.
 */
export async function callLocal(req: {
  system: Block[];
  messages: Msg[];
  maxTokens: number;
  temperature?: number;
}): Promise<Anthropic.Messages.Message> {
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
  const res = await fetch(`${URL_BASE}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${KEY}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
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
  if (localEligible(feature, req)) {
    try {
      return { value: await callLocal(req), local: true };
    } catch (err) {
      console.warn(`[local-llm] ${feature}: fell back to Claude (${String((err as Error)?.message ?? err).slice(0, 160)})`);
    }
  }
  return { value: await claude(), local: false };
}
