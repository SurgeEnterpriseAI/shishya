// Web research on Surge's own server (13 Oct 2026): the replacement for
// Claude's web_search server tool. Founder: "local server first; Claude only
// where it cannot do it; quality not compromised" → "do all the plumbing as a
// harness, use the web search tooling, build it into our code".
//
// Qwen 27B (vLLM, tool calling) runs a small loop with two tools served by the
// tools gateway on the same machine (scratchpad surge-tools, systemd
// surge-tools.service, Funnel path /tools, same key as the model):
//   web_search(query)  → SearXNG, only hits on allowedDomains when given;
//   fetch_page(url)    → the page or PDF as text, plus its links (private,
//                        loopback and Tailscale addresses refused by the
//                        gateway; allowedDomains enforced there too).
// Budgets: maxSearches, maxFetches, a deadline; after the budget the model
// must answer with what it has. The result carries every URL the loop really
// saw (search hits, fetched pages, links printed on fetched pages), so each
// caller can drop any URL the model wrote but never saw — the local answer is
// then checked by the caller's own gate, and anything wrong goes to Claude.
//
// On for a feature only when it is in LOCAL_LLM_RESEARCH_FEATURES.

import { localChatCompletion, localKey, localToolsBase, LOCAL_MODEL } from "./local-llm";

const URL_BASE = process.env.LOCAL_LLM_URL?.replace(/\/+$/, "") ?? "";
const RESEARCH_FEATURES = new Set(
  (process.env.LOCAL_LLM_RESEARCH_FEATURES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
);

export interface SearchHit {
  url: string;
  title: string;
  snippet: string;
}

export interface FetchedPage {
  url: string;
  final_url: string;
  status: number;
  content_type: string;
  title: string;
  text: string;
  links: Array<{ text: string; url: string }>;
  truncated: boolean;
  error?: string;
}

export interface ResearchResult {
  text: string;
  /** Normalised URLs the loop saw: search hits, fetched pages, links on fetched pages. */
  seen: Set<string>;
  searches: Array<{ query: string; hits: number }>;
  fetches: Array<{ url: string; status: number; chars: number; error?: string }>;
  usage: { input_tokens: number; output_tokens: number };
  model: string;
  latencyMs: number;
}

/** Whether `feature` may run its web research on Surge's server. */
export function localResearchOn(feature: string): boolean {
  return RESEARCH_FEATURES.has(feature) && !!URL_BASE && !!localKey() && !!localToolsBase();
}

/** One form of a URL for "did the loop see it": no scheme case, no www., no fragment, no trailing slash. */
export function normUrl(u: string): string {
  try {
    const x = new URL(u.trim());
    const host = x.hostname.toLowerCase().replace(/^www\./, "");
    const path = x.pathname.replace(/\/+$/, "");
    return `${host}${path}${x.search}`;
  } catch {
    return u.trim().toLowerCase();
  }
}

async function gateway<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
  const res = await fetch(`${localToolsBase()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localKey()}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(`tools ${path} ${res.status}: ${String(data?.error ?? "").slice(0, 160)}`);
  return data;
}

export function searchWeb(query: string, opts: { allowedDomains?: readonly string[]; n?: number; timeoutMs?: number } = {}): Promise<{ results: SearchHit[] }> {
  return gateway("/search", { q: query, n: opts.n ?? 8, allowed_domains: opts.allowedDomains ?? [] }, opts.timeoutMs ?? 45_000);
}

export function fetchPage(url: string, opts: { allowedDomains?: readonly string[]; maxChars?: number; timeoutMs?: number } = {}): Promise<FetchedPage> {
  return gateway("/fetch", { url, max_chars: opts.maxChars ?? 60_000, allowed_domains: opts.allowedDomains ?? [] }, opts.timeoutMs ?? 45_000);
}

const TOOLS = [
  {
    type: "function",
    function: {
      name: "web_search",
      description: "Search the web. Returns titles, URLs and short snippets. Snippets are not proof: open the page with fetch_page before relying on it.",
      parameters: { type: "object", properties: { query: { type: "string", description: "The search query, e.g. 'site:ssc.gov.in CGL 2026 answer key'" } }, required: ["query"] },
    },
  },
  {
    type: "function",
    function: {
      name: "fetch_page",
      description: "Open a web page or PDF and read its text and the links printed on it.",
      parameters: { type: "object", properties: { url: { type: "string", description: "An http(s) URL you saw in search results or on a fetched page." } }, required: ["url"] },
    },
  },
];

const RULES = (o: { maxSearches: number; maxFetches: number; allowedDomains?: readonly string[] }) =>
  `RESEARCH TOOLS: you have web_search (up to ${o.maxSearches} searches) and fetch_page (up to ${o.maxFetches} pages).${
    o.allowedDomains?.length ? ` Both only work on these sites: ${o.allowedDomains.join(", ")}.` : ""
  }
- Search first, then OPEN the most relevant official page or PDF with fetch_page and read it before you rely on it. A search snippet alone is not proof.
- Many government sites are built by scripts: their pages can come back almost empty. Then open the PDFs and notice links your searches found instead of re-opening home pages.
- Every URL you write in your answer must be one you saw: a search result, a page you fetched, or a link printed on a fetched page. Never build or guess a URL.
- State a fact only if a page you fetched says it; otherwise say it is not found.
- When you have enough, stop calling tools and give the final answer in exactly the format the task asks.`;

/**
 * Run the research loop on Surge's server. Throws when the server or the
 * gateway fails, the deadline passes or no final answer comes back; the
 * caller then runs its Claude path.
 */
export async function localResearch(opts: {
  system: string;
  prompt: string;
  allowedDomains?: readonly string[];
  maxSearches?: number;
  maxFetches?: number;
  maxTokens?: number;
  deadlineMs?: number;
  pageChars?: number;
  /** The task wants a JSON object: a prose answer is asked again once for JSON only. */
  expectJson?: boolean;
}): Promise<ResearchResult> {
  const maxSearches = opts.maxSearches ?? 3;
  const maxFetches = opts.maxFetches ?? 4;
  const pageChars = opts.pageChars ?? 12_000;
  const started = Date.now();
  const deadline = started + (opts.deadlineMs ?? 150_000);
  const seen = new Set<string>();
  const searches: ResearchResult["searches"] = [];
  const fetches: ResearchResult["fetches"] = [];
  const usage = { input_tokens: 0, output_tokens: 0 };
  const messages: any[] = [
    { role: "system", content: `${opts.system}\n\n${RULES({ maxSearches, maxFetches, allowedDomains: opts.allowedDomains })}` },
    { role: "user", content: opts.prompt },
  ];
  const left = () => deadline - Date.now();

  let nudged = false;
  let jsonAsked = false;
  const hasJsonObject = (t: string) => {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a < 0 || b <= a) return false;
    try {
      JSON.parse(t.slice(a, b + 1));
      return true;
    } catch {
      return false;
    }
  };
  for (let turn = 0; turn < maxSearches + maxFetches + 4; turn++) {
    if (left() < 5_000) throw new Error("local research: deadline");
    // Out of budget (or the last answer was empty): no tools at all, and an
    // explicit ask. With tools still offered and tool_choice "none", Qwen
    // answered with nothing (13 Oct, SSC CGL check).
    const budgetLeft = !nudged && (searches.length < maxSearches || fetches.length < maxFetches);
    if (!budgetLeft && !nudged) {
      messages.push({ role: "user", content: "The research budget is used up. Give your final answer now, in exactly the format the task asks, using only what you saw." });
      nudged = true;
    }
    // Offer only the tools that still have budget (13 Oct, SSC CHSL: the model
    // kept asking for searches after its 3, and ran out of turns).
    const offered = TOOLS.filter((t) => (t.function.name === "web_search" ? searches.length < maxSearches : fetches.length < maxFetches));
    const r = await localChatCompletion(
      { messages, tools: budgetLeft && offered.length ? offered : undefined, maxTokens: opts.maxTokens ?? 1500 },
      { url: URL_BASE, timeoutMs: Math.max(5_000, Math.min(left(), 120_000)) },
    );
    usage.input_tokens += r.usage.in;
    usage.output_tokens += r.usage.out;
    const calls = r.message.tool_calls ?? [];
    if (process.env.LOCAL_RESEARCH_DEBUG === "1") {
      console.log(`[research] turn ${turn} finish=${r.finish} in=${r.usage.in} out=${r.usage.out} calls=${calls.map((c) => `${c.function.name}(${c.function.arguments.slice(0, 80)})`).join("; ")} text=${JSON.stringify((r.message.content ?? "").slice(0, 200))}`);
    }
    if (!calls.length) {
      const text = (r.message.content ?? "").trim();
      if (!text && !nudged) {
        messages.push({ role: "user", content: "Give your final answer now, in exactly the format the task asks, using only what you saw." });
        nudged = true;
        continue;
      }
      if (!text) throw new Error("local research: empty answer");
      if (r.finish === "length") throw new Error("local research: answer cut off");
      if (opts.expectJson && !hasJsonObject(text)) {
        if (jsonAsked) throw new Error("local research: no JSON in the answer");
        messages.push({ role: "assistant", content: text });
        messages.push({ role: "user", content: "Now return ONLY the strict JSON the task asks for: no prose, no markdown fences." });
        jsonAsked = true;
        nudged = true;
        continue;
      }
      return { text, seen, searches, fetches, usage, model: `local:${LOCAL_MODEL}`, latencyMs: Date.now() - started };
    }
    messages.push({ role: "assistant", content: r.message.content ?? "", tool_calls: calls });
    for (const c of calls) {
      let args: any = {};
      try {
        args = JSON.parse(c.function.arguments || "{}");
      } catch {
        /* answered below as an error */
      }
      let out: string;
      if (c.function.name === "web_search" && searches.length < maxSearches && typeof args.query === "string") {
        try {
          const { results } = await searchWeb(args.query, { allowedDomains: opts.allowedDomains, timeoutMs: Math.min(45_000, left()) });
          searches.push({ query: args.query, hits: results.length });
          for (const h of results) seen.add(normUrl(h.url));
          out = results.length
            ? results.map((h, i) => `${i + 1}. ${h.title}\n   ${h.url}\n   ${h.snippet}`).join("\n")
            : "No results. Try a different query.";
        } catch (e) {
          searches.push({ query: args.query, hits: 0 });
          out = `Search failed: ${String((e as Error).message).slice(0, 120)}`;
        }
      } else if (c.function.name === "fetch_page" && fetches.length < maxFetches && typeof args.url === "string") {
        try {
          const p = await fetchPage(args.url, { allowedDomains: opts.allowedDomains, maxChars: pageChars, timeoutMs: Math.min(45_000, left()) });
          fetches.push({ url: args.url, status: p.status, chars: p.text.length, error: p.error });
          seen.add(normUrl(p.url));
          seen.add(normUrl(p.final_url));
          const links = (p.links ?? []).filter((l) => /^https?:/i.test(l.url));
          for (const l of links) seen.add(normUrl(l.url));
          out = p.error
            ? `Could not open the page: ${p.error}`
            : `TITLE: ${p.title}\nURL: ${p.final_url}\n\n${p.text}${p.truncated ? "\n[…page truncated]" : ""}${
                links.length ? `\n\nLINKS ON THIS PAGE:\n${links.slice(0, 80).map((l) => `- ${l.text || "(no text)"} → ${l.url}`).join("\n")}` : ""
              }`;
        } catch (e) {
          fetches.push({ url: args.url, status: 0, chars: 0, error: String((e as Error).message).slice(0, 120) });
          out = `Could not open the page: ${String((e as Error).message).slice(0, 120)}`;
        }
      } else {
        out = "Tool budget used up (or a bad call). Answer now with what you have.";
      }
      messages.push({ role: "tool", tool_call_id: c.id, content: out });
    }
  }
  throw new Error("local research: no final answer");
}
