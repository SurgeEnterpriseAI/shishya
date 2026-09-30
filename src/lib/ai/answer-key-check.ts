// AI fallback of the answer-key / result watch (30 Sep 2026).
//
// Used ONLY by src/lib/answer-key-watch-run.ts, only for a HOT due (exam,
// kind) — answer key 1–10 days after the exam, result expected within ±7
// days — that the plain-HTML check could not settle (no readable official
// listing, or new links it could not tie to the exam / year), only within the
// run's hard cap (RUN_AI_CAP_USD, charged before the call), and only in the
// Monday plan ($3.00) and the 21:00 IST evening check ($0.90, ≤ 6 exams).
//
// The model searches ONLY the exam's official hosts (web_search
// allowed_domains; subdomains are covered) and returns CANDIDATE URLs — it
// never writes anything. Every URL then goes through releaseGate
// (src/lib/answer-key-watch.ts): our own fetch, the official host, the text
// the body printed beside the link. Spend is recorded as feature
// 'akr-check' (AiUsage).

import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsage, recordAiUsageAwaited } from "@/lib/ai/usage";
import { AI_CHECK_TIMEOUT_MS } from "@/lib/answer-key-watch";
import { anthropic, MODEL } from "./client";

export type CheckKind = "ANSWER_KEY" | "RESULT";

export interface AnswerKeyCheckInput {
  examCode: string;
  examName: string;
  shortName: string;
  kind: CheckKind;
  /** The sitting's tracker label ("Tier 1 exam", "NDA & NA (II) 2026"). */
  stage: string;
  cycleYears: readonly string[];
  /** ISO day of the sitting's first exam day. */
  examDay: string;
  /** web_search allowed_domains — official hosts only (officialHostsFor). */
  officialHosts: readonly string[];
  /** Listing pages already known for this kind (may be script-built). */
  listingUrls: readonly string[];
}

export interface AiCandidate {
  kind: CheckKind;
  url: string;
  /** The official page that links it, when the model saw one. */
  listingUrl: string | null;
}

export interface AnswerKeyCheckResult {
  candidates: AiCandidate[];
  costUsd: number;
}

const SYSTEM = `You locate official answer-key and result links for Indian exams on the conducting body's OWN website.

Rules:
1. Search ONLY the allowed official domains. Never return a URL on any other site (no news, coaching or aggregator sites).
2. Return a URL only when the official site itself shows it as the answer key (provisional/final, response sheet) or the result (result, merit/selection list) of THIS exam's sitting named in the request, for the cycle year given. If you did not see it on the official site, return nothing.
3. Never infer, guess or construct a URL. Never report a release that is only announced for the future ("will be released on ...").
4. For each URL give the official page that links it ("listingUrl") when you saw one, else null.
5. Output STRICT JSON only, no prose: {"candidates":[{"kind":"ANSWER_KEY"|"RESULT","url":"https://...","listingUrl":"https://..."|null}]}. An empty list is a correct answer when nothing is published.`;

function httpUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return /^https?:\/\/[^\s]+$/i.test(s) && s.length <= 600 ? s : null;
}

/** Parse the model's JSON; anything malformed yields no candidates. */
export function parseCheckCandidates(text: string, kind: CheckKind): AiCandidate[] {
  let body = (text ?? "").trim();
  if (body.startsWith("```")) body = body.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first === -1 || last <= first) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.slice(first, last + 1));
  } catch {
    return [];
  }
  const list = (parsed as { candidates?: unknown })?.candidates;
  if (!Array.isArray(list)) return [];
  const out: AiCandidate[] = [];
  for (const c of list.slice(0, 8)) {
    const url = httpUrl((c as { url?: unknown })?.url);
    if (!url) continue;
    const k = (c as { kind?: unknown })?.kind;
    out.push({ kind: k === "RESULT" || k === "ANSWER_KEY" ? k : kind, url, listingUrl: httpUrl((c as { listingUrl?: unknown })?.listingUrl) });
  }
  return out;
}

export async function checkAnswerKeyWithAi(
  input: AnswerKeyCheckInput,
  opts: { awaitUsage?: boolean } = {},
): Promise<AnswerKeyCheckResult> {
  if (input.officialHosts.length === 0) return { candidates: [], costUsd: 0 };
  const what = input.kind === "ANSWER_KEY" ? "answer key (provisional or final) / response sheet" : "result / merit list / selection list";
  const prompt = `Exam: ${input.examName} (${input.shortName}, code ${input.examCode})
Sitting: ${input.stage} — first exam day ${input.examDay}; cycle year ${input.cycleYears.join(" or ")}
Find: the official ${what} for this sitting, if the conducting body has published it.
Official domains you may search: ${input.officialHosts.join(", ")}
${input.listingUrls.length ? `Known official listing pages: ${input.listingUrls.join(" , ")}\n` : ""}Return STRICT JSON per the system rules.`;
  // Server-side web search restricted to the official hosts (subdomains are
  // covered). The installed SDK types predate allowed_domains, hence the cast.
  const tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 3, allowed_domains: [...input.officialHosts] }];
  const startedAt = Date.now();
  // Review, 30 Sep 2026: a hard per-request timeout (the SDK default is 10
  // min; the cron has 300 s) and no SDK retries — a retried call is a second
  // charge the run's budget never saw. A timeout is an ordinary failure: the
  // run logs it and moves on (its estimate stays charged).
  const response = await anthropic.messages.create(
    {
      model: MODEL,
      max_tokens: 1200,
      system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
      tools,
    } as any,
    { timeout: AI_CHECK_TIMEOUT_MS, maxRetries: 0 },
  );
  const usageOpts = { model: MODEL, ref: `${input.examCode}:${input.kind}`, latencyMs: Date.now() - startedAt };
  const costUsd = opts.awaitUsage
    ? await recordAiUsageAwaited("akr-check", response, usageOpts)
    : recordAiUsage("akr-check", response, usageOpts);
  const text = (response.content as Anthropic.Messages.ContentBlock[])
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return { candidates: parseCheckCandidates(text, input.kind), costUsd };
}

/** A 4xx from the API (credit balance, auth, permission, rate limit): the run
 *  stops spending — never retries into an empty or refused key. */
export function isStopError(err: unknown): boolean {
  const status = (err as { status?: unknown })?.status;
  return err instanceof Anthropic.APIError && typeof status === "number" && status >= 400 && status < 500;
}
