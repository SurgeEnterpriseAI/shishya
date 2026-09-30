// One-time research for the official answer-key / result crawl (30 Sep 2026,
// scripts/crawl-official-answer-keys.ts).
//
// Per exam, the model searches ONLY the exam's official hosts (web_search
// allowed_domains) and PROPOSES: the body's answer-key listing page, its
// result listing page, how the body names the exam, the latest cycle's key /
// result links, and the previous cycle's (for the release lag). Nothing it
// says is stored as it says it: the crawl's deterministic verifier fetches
// every proposed URL itself, keeps only official hosts, reads the dates the
// body printed, and writes through the same release gate as the weekly
// watch (src/lib/answer-key-watch.ts). Spend: feature 'akr-crawl'.

import Anthropic from "@anthropic-ai/sdk";
import { recordAiUsageAwaited } from "@/lib/ai/usage";
import { anthropic, MODEL } from "./client";

export type ResearchKind = "ANSWER_KEY" | "RESULT";

export interface AnswerKeyResearchInput {
  examCode: string;
  examName: string;
  shortName: string;
  officialHosts: readonly string[];
  portalUrl: string | null;
  /** Recent sittings from the tracker: "2026-09-14 — Tier 1 exam". */
  sittings: readonly string[];
}

export interface ProposedLink {
  kind: ResearchKind;
  url: string;
  listingUrl: string | null;
  /** The model's reading of the date — never stored as a release date. */
  date: string | null;
  stage: string | null;
}

export interface ProposedLastCycle {
  examDay: string | null;
  releasedOn: string | null;
  url: string | null;
  listingUrl: string | null;
}

export interface AnswerKeyResearch {
  answerKeyListing: string | null;
  resultListing: string | null;
  examTerms: string[];
  current: ProposedLink[];
  lastCycle: Partial<Record<ResearchKind, ProposedLastCycle>>;
}

export interface AnswerKeyResearchResult {
  research: AnswerKeyResearch;
  costUsd: number;
  raw: string;
}

const SYSTEM = `You map where an Indian conducting body publishes answer keys and results on its OWN website.

Rules:
1. Search ONLY the allowed official domains. Never return a URL on any other site.
2. Return only URLs you saw on the official site. Never guess or construct one. Unknown = null.
3. "answerKeyListing" / "resultListing": the official page that LISTS answer keys / results for this exam (a notices or answer-keys page), not a single PDF.
4. "examTerms": up to 4 short phrases the body's own pages use to name this exam (e.g. "Combined Graduate Level Examination"), copied as printed.
5. "current": the latest cycle's answer key / result links for this exam, if the body has published them — with the official page that lists each ("listingUrl"), the date printed beside it ("date", YYYY-MM-DD, or null), and the stage ("Tier 1", "Prelims").
6. "lastCycle": the PREVIOUS cycle's answer key and result: the exam day, the release day printed by the body, the link and the page listing it. null where unknown.
7. Output STRICT JSON only:
{"answerKeyListing":"https://..."|null,"resultListing":"https://..."|null,"examTerms":["..."],"current":[{"kind":"ANSWER_KEY"|"RESULT","url":"https://...","listingUrl":"https://..."|null,"date":"YYYY-MM-DD"|null,"stage":"..."|null}],"lastCycle":{"ANSWER_KEY":{"examDay":"YYYY-MM-DD"|null,"releasedOn":"YYYY-MM-DD"|null,"url":"https://..."|null,"listingUrl":"https://..."|null}|null,"RESULT":{...}|null}}`;

function httpUrl(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return /^https?:\/\/[^\s]+$/i.test(s) && s.length <= 600 ? s : null;
}

function isoDay(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v.trim());
  if (!m) return null;
  const s = `${m[1]}-${m[2]}-${m[3]}`;
  const t = Date.parse(`${s}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === s ? s : null;
}

function kindOf(v: unknown): ResearchKind | null {
  return v === "ANSWER_KEY" || v === "RESULT" ? v : null;
}

/** Parse the model's JSON defensively; a malformed answer yields an empty research. */
export function parseResearch(text: string): AnswerKeyResearch {
  const empty: AnswerKeyResearch = { answerKeyListing: null, resultListing: null, examTerms: [], current: [], lastCycle: {} };
  let body = (text ?? "").trim();
  if (body.startsWith("```")) body = body.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const first = body.indexOf("{");
  const last = body.lastIndexOf("}");
  if (first === -1 || last <= first) return empty;
  let p: any;
  try {
    p = JSON.parse(body.slice(first, last + 1));
  } catch {
    return empty;
  }
  const current: ProposedLink[] = [];
  for (const c of Array.isArray(p?.current) ? p.current.slice(0, 10) : []) {
    const kind = kindOf(c?.kind);
    const url = httpUrl(c?.url);
    if (!kind || !url) continue;
    current.push({ kind, url, listingUrl: httpUrl(c?.listingUrl), date: isoDay(c?.date), stage: typeof c?.stage === "string" ? c.stage.slice(0, 80) : null });
  }
  const lastCycle: Partial<Record<ResearchKind, ProposedLastCycle>> = {};
  for (const k of ["ANSWER_KEY", "RESULT"] as const) {
    const x = p?.lastCycle?.[k];
    if (!x || typeof x !== "object") continue;
    lastCycle[k] = { examDay: isoDay(x.examDay), releasedOn: isoDay(x.releasedOn), url: httpUrl(x.url), listingUrl: httpUrl(x.listingUrl) };
  }
  return {
    answerKeyListing: httpUrl(p?.answerKeyListing),
    resultListing: httpUrl(p?.resultListing),
    examTerms: (Array.isArray(p?.examTerms) ? p.examTerms : [])
      .filter((t: unknown): t is string => typeof t === "string" && t.trim().length >= 3)
      .map((t: string) => t.trim().slice(0, 80))
      .slice(0, 4),
    current,
    lastCycle,
  };
}

export async function researchAnswerKeys(input: AnswerKeyResearchInput): Promise<AnswerKeyResearchResult> {
  const empty: AnswerKeyResearch = { answerKeyListing: null, resultListing: null, examTerms: [], current: [], lastCycle: {} };
  if (input.officialHosts.length === 0) return { research: empty, costUsd: 0, raw: "" };
  const prompt = `Exam: ${input.examName} (${input.shortName}, code ${input.examCode})
Official portal: ${input.portalUrl ?? "unknown"}
Official domains you may search: ${input.officialHosts.join(", ")}
Recent sittings on our tracker: ${input.sittings.length ? input.sittings.join("; ") : "none recorded"}
Today: ${new Date().toISOString().slice(0, 10)}
Return STRICT JSON per the system rules.`;
  const tools = [{ type: "web_search_20250305", name: "web_search", max_uses: 5, allowed_domains: [...input.officialHosts] }];
  const startedAt = Date.now();
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2500,
    system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: prompt }],
    tools,
  } as any);
  // Awaited: the crawl is a script, and a fire-and-forget insert can be lost
  // when it disconnects Prisma at the end.
  const costUsd = await recordAiUsageAwaited("akr-crawl", response, { model: MODEL, ref: input.examCode, latencyMs: Date.now() - startedAt });
  const raw = (response.content as Anthropic.Messages.ContentBlock[])
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  return { research: parseResearch(raw), costUsd, raw: raw.slice(0, 4000) };
}

/** Key probe between crawl chunks: the smallest possible call (1 output
 *  token on the fast model), recorded like any other. A 4xx here — credit
 *  balance, auth, permission, rate limit — stops the crawl. */
export async function probeKey(): Promise<number> {
  const model = process.env.ANTHROPIC_MODEL_FAST ?? "claude-haiku-4-5-20251001";
  const response = await anthropic.messages.create({ model, max_tokens: 1, messages: [{ role: "user", content: "ok" }] });
  return recordAiUsageAwaited("akr-crawl", response, { model, ref: "key-probe" });
}
