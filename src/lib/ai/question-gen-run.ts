// The testable core of scripts/generate-questions.ts (30 Sep 2026).
//
// Why: the state-exam depth plan (30 Sep 2026) sends ~3,750 new questions
// through scripts/generate-questions.ts. That script had no spend ceiling
// and wrote no AiUsage rows, so its spend never reached the ledger. It
// spends from the credit balance the live tutor draws on, which bulk runs
// emptied on 15, 25, 26 and 28 Sep 2026. The founder's rule since 30 Sep
// 2026: bulk runs may use the existing key, but every AI run has a hard
// --max-usd cap and records what it spends. Everything that decides whether
// a call is made, what it cost and where a stopped run picks up lives here,
// so tests drive it with a fake model and no database. The script is glue.
//
//   • --max-usd <usd> is required for any run that calls the API, dry runs
//     included (a dry run still pays for one batch per topic). Before EVERY
//     call, retries included, the call's worst case is added to what the run
//     has spent: prompt tokens at the dearer of the input and cache-write
//     price, plus a reply that fills max_tokens. If that is over the
//     ceiling, the call is not made. Spend is priced from each reply's own
//     usage (usageCostUsd). Each reply is ledgered as one AiUsage row,
//     feature "state-depth-gen", ref = exam code.
//   • A journal (one JSON file per run) records the spend and, per topic,
//     the target and the ids of the questions saved. A stopped run continues
//     with --resume <runId> and generates only what is missing. The ceiling
//     reads the journal's spend, so it covers every invocation of the run.
//   • An API error stops the whole run: an empty balance or a spend limit
//     fails every topic alike. A reply that cannot be parsed gives up on its
//     topic. Two more cases (30 Sep 2026 review): a 429 or 529 is refused
//     before any work, so it is not billed, and is called again after 20 s
//     and then 60 s (the script's client has SDK retries off, see
//     GEN_TRANSIENT_WAITS_MS). A 400 invalid_request_error about the request
//     itself, not credit, limits or rate, gives up on that topic, because
//     every resume would hit it first. If the next topic is refused the same
//     way with no reply in between, the refusal is about every request: the
//     run stops and both topics are pending again.
//   • --verify is refused. It checked at full price on the shared key with no
//     ceiling; scripts/verify-question-bank.ts is the answer check.
//   • --no-ai writes placeholder rows, and .env.local points at the
//     production database, so --no-ai runs only with --dry-run.

import fs from "node:fs";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";
import { ALLOW_SHARED_KEY_FLAG, classifyProbeError, describeProbe, estimateRequestTokens } from "./batch";
import type { Difficulty } from "./types";
import { PRICING, usageCostUsd } from "./usage";

/** AiUsage.feature for every generation call of this script (30 Sep 2026 plan: size future runs from the ledger). */
export const GEN_LEDGER_FEATURE = "state-depth-gen";
/** max_tokens of one generation call (10 questions); the worst case prices a reply that fills it. */
export const GEN_MAX_TOKENS = 8000;
/**
 * The worst case prices the prompt at this multiple of estimateRequestTokens
 * (30 Sep 2026 review). That estimate assumes 4 ASCII characters a token;
 * the syllabus block (backticks, dotted topic codes, markdown) runs nearer
 * 3, so without a margin the prompt part could come out 25-30% low.
 */
export const GEN_PROMPT_TOKEN_MARGIN = 1.3;
/**
 * Waits before calling again after a 429 (rate limit) or 529 (overloaded),
 * which the API refuses before doing any work, so nothing is billed. The
 * script builds its client with maxRetries 0 (30 Sep 2026 review): the SDK
 * also retries a call that timed out or lost its connection, which the
 * server may have finished and billed, so that call would be paid twice and
 * counted once. These waits are the only retries left. Each one goes through
 * the guard, and after the last one the run stops.
 */
export const GEN_TRANSIENT_WAITS_MS: readonly number[] = [20_000, 60_000];
/** Topics in a row that the API refuses with a 400 (no reply in between) before the refusal counts as one about every request, which stops the run. */
export const GEN_REFUSED_TOPICS_BEFORE_STOP = 2;
export const GEN_JOURNAL_DIR = "D:/CodexProjects/shishya-data/generate-question-runs";
export const GEN_SCRIPT = "npx tsx --env-file=.env.local scripts/generate-questions.ts";
export const VERIFY_SCRIPT = "npx tsx --env-file=.env.local scripts/verify-question-bank.ts";

const fmtUsd = (n: number) => `$${n.toFixed(2)}`;

// ---------------------------------------------------------------------------
// Replies: parse, validate, dedupe (moved from the script unchanged)
// ---------------------------------------------------------------------------

export interface GeneratedQuestion {
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  difficulty: Difficulty;
  tags: string[];
}

export function validateGenerated(q: any): { ok: true; q: GeneratedQuestion } | { ok: false; reason: string } {
  if (!q || typeof q !== "object") return { ok: false, reason: "not an object" };
  if (typeof q.body !== "string" || q.body.trim().length < 10) return { ok: false, reason: "body too short" };
  if (!Array.isArray(q.options) || q.options.length !== 4) return { ok: false, reason: "must have 4 options" };
  const keys = q.options.map((o: any) => o?.key);
  const expected = ["A", "B", "C", "D"];
  if (JSON.stringify(keys) !== JSON.stringify(expected)) return { ok: false, reason: "options must be keyed A/B/C/D in order" };
  for (const o of q.options) {
    if (typeof o.text !== "string" || o.text.trim().length === 0) return { ok: false, reason: "empty option text" };
  }
  if (!expected.includes(q.answerKey)) return { ok: false, reason: `answerKey must be A/B/C/D, got ${q.answerKey}` };
  if (typeof q.solution !== "string" || q.solution.trim().length < 20) return { ok: false, reason: "solution too short" };
  if (!["EASY", "MEDIUM", "HARD"].includes(q.difficulty)) return { ok: false, reason: `invalid difficulty: ${q.difficulty}` };
  const tags = Array.isArray(q.tags) ? q.tags.filter((t: any) => typeof t === "string") : [];
  return {
    ok: true,
    q: {
      body: q.body.trim(),
      options: q.options.map((o: any) => ({ key: o.key, text: o.text.trim() })),
      answerKey: q.answerKey,
      solution: q.solution.trim(),
      difficulty: q.difficulty,
      tags,
    },
  };
}

/** The key two stems are compared by: lower-case, whitespace collapsed, first 120 characters. */
export function dedupeKey(body: string): string {
  return body.toLowerCase().replace(/\s+/g, " ").slice(0, 120);
}

/** The model's reply as a JSON array (code fences stripped), or why it is not one. */
export function parseGeneratedReply(text: string): { ok: true; items: unknown[] } | { ok: false; error: string } {
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch (err) {
    return { ok: false, error: `invalid JSON: ${(err as Error).message}; raw: ${cleaned.slice(0, 200)}` };
  }
  if (!Array.isArray(parsed)) return { ok: false, error: "the reply must be a JSON array of questions" };
  return { ok: true, items: parsed };
}

/** Difficulty shares for one batch of `want` questions, rounded to whole questions (as before). */
export function batchDifficulty(want: number, mix: Record<Difficulty, number>): Record<Difficulty, number> {
  const easy = Math.round(want * mix.EASY) / want;
  const medium = Math.round(want * mix.MEDIUM) / want;
  return { EASY: easy, MEDIUM: medium, HARD: 1 - easy - medium };
}

/** Placeholder questions for --no-ai --dry-run plumbing tests: no API call, never saved. */
export function offlineStub(count: number, topicCode: string, mix: Record<Difficulty, number>): GeneratedQuestion[] {
  const diffs: Difficulty[] = [];
  diffs.push(...Array<Difficulty>(Math.round(count * mix.EASY)).fill("EASY"));
  diffs.push(...Array<Difficulty>(Math.round(count * mix.MEDIUM)).fill("MEDIUM"));
  while (diffs.length < count) diffs.push("HARD");
  return diffs.slice(0, count).map((d, i) => ({
    body: `[STUB ${topicCode} #${i + 1}] What is 2 + 2?`,
    options: [
      { key: "A", text: "3" },
      { key: "B", text: "4" },
      { key: "C", text: "5" },
      { key: "D", text: "22" },
    ],
    answerKey: "B",
    solution: "Two plus two equals four. This is a placeholder generated in --no-ai mode for plumbing tests.",
    difficulty: d,
    tags: ["stub"],
  }));
}

// ---------------------------------------------------------------------------
// Flags → what the run may do
// ---------------------------------------------------------------------------

export interface GenFlags {
  exam?: string;
  topic?: string;
  subject?: string;
  all: boolean;
  /** Raw --max-usd value: undefined when absent, "" when given without a value. */
  maxUsd?: string;
  dryRun: boolean;
  noAi: boolean;
  verify: boolean;
  autoValidate: boolean;
  resume?: string;
  /** Selection and settings flags present on the command line (e.g. "--count"), so a resume can refuse them. */
  given: string[];
}

export interface GenRunMode {
  /** false only for --no-ai --dry-run. */
  callsApi: boolean;
  /** The ceiling; null only when no API call can happen. */
  maxUsd: number | null;
  /** Question rows and the journal are written (not a dry run). */
  writes: boolean;
}

/** Refusals come first and in this order, before any key or row is read. */
export function resolveGenRunMode(f: GenFlags): GenRunMode {
  if (f.verify) {
    throw new Error(
      `--verify was removed on 30 Sep 2026: it ran the factory's blind solves and examiner per call at full price on the shared key, with no ceiling and no ledger. Generate without it, then answer-check with the batch runner: ${VERIFY_SCRIPT} --exams <CODE> --scope unvalidated (a free dry run that prints a runId), then --resume <runId> --apply --max-usd <usd> --chunk <n> and its acknowledgement flag.`,
    );
  }
  if (f.autoValidate) throw new Error(`--auto-validate was removed with --verify on 30 Sep 2026: a generated question becomes validated only through ${VERIFY_SCRIPT}.`);
  let maxUsd: number | null = null;
  if (f.maxUsd !== undefined) {
    const n = Number(f.maxUsd);
    if (!(f.maxUsd.trim() && Number.isFinite(n) && n > 0)) throw new Error(`--max-usd must be a positive number of US dollars (got "${f.maxUsd}")`);
    maxUsd = n;
  }
  if (f.noAi && !f.dryRun) {
    throw new Error(`--no-ai writes placeholder "[STUB …] What is 2 + 2?" questions, and .env.local points at the production database: run --no-ai only with --dry-run.`);
  }
  if (f.resume) {
    if (f.dryRun) throw new Error("--resume continues a journaled run and writes to it; a dry run never touches a journal. Drop --dry-run.");
    const extra = f.given.filter((g) => g !== "--exam");
    if (extra.length) throw new Error(`a resumed run keeps the settings it started with (they are in its journal): drop ${extra.join(", ")}`);
  } else {
    if (!f.exam) throw new Error("--exam is required (or --resume <runId>)");
    if (!f.topic && !f.subject && !f.all) throw new Error("must pass --topic, --subject, or --all");
  }
  const callsApi = !f.noAi;
  if (callsApi && maxUsd == null) {
    throw new Error(
      `every run that calls the API needs --max-usd <usd>: a hard ceiling on the run's spend, checked before every call against that call's worst case (a reply filling ${GEN_MAX_TOKENS} tokens). Dry runs too: they pay for one batch per topic. There is no default; name the number. (--no-ai --dry-run tests the plumbing for free.)`,
    );
  }
  return { callsApi, maxUsd: callsApi ? maxUsd : null, writes: !f.dryRun };
}

export const DEFAULT_DIFFICULTY: Record<Difficulty, number> = { EASY: 0.3, MEDIUM: 0.5, HARD: 0.2 };

export function parseDifficultyMix(spec: string): Record<Difficulty, number> {
  const out: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const part of spec.split(",")) {
    const [k, v] = part.split(":").map((s) => s.trim());
    if (k !== "EASY" && k !== "MEDIUM" && k !== "HARD") throw new Error(`bad difficulty key: ${k}`);
    out[k] = parseFloat(v);
  }
  const sum = out.EASY + out.MEDIUM + out.HARD;
  if (!(Math.abs(sum - 1) <= 0.05)) throw new Error(`difficulty mix must sum to 1.0 (got ${sum})`);
  return out;
}

export interface GenCliArgs extends GenFlags {
  skipSubjects: string[];
  count: number;
  batchSize: number;
  difficulty: Record<Difficulty, number>;
  avoidRecent: number;
  retry: number;
  language: "EN" | "HI";
  journal?: string;
  force: boolean;
  allowSharedKey: boolean;
  help: boolean;
}

/**
 * The command line (without node and the script path). 30 Sep 2026: an
 * unknown flag is refused, not warned about. A run that spends money must
 * not go ahead on a typo: "--skip-subject LANG" used to be ignored and the
 * language paper generated anyway.
 */
export function parseGenArgs(argv: readonly string[]): GenCliArgs {
  const a: GenCliArgs = {
    all: false,
    count: 20,
    batchSize: 10,
    avoidRecent: 50,
    retry: 1,
    difficulty: DEFAULT_DIFFICULTY,
    language: "EN",
    skipSubjects: [],
    dryRun: false,
    noAi: false,
    verify: false,
    autoValidate: false,
    force: false,
    allowSharedKey: false,
    help: false,
    given: [],
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    // A flag given last, without its value, reads as "" and is refused by whatever checks that value.
    const value = () => argv[++i] ?? "";
    const setting = () => a.given.push(flag);
    switch (flag) {
      case "--exam": setting(); a.exam = value(); break;
      case "--topic": setting(); a.topic = value(); break;
      case "--subject": setting(); a.subject = value(); break;
      case "--all": setting(); a.all = true; break;
      case "--skip-subjects": setting(); a.skipSubjects = parseSkipSubjects(value()); break;
      case "--count": setting(); a.count = parseInt(value(), 10); break;
      case "--batch-size": setting(); a.batchSize = parseInt(value(), 10); break;
      case "--avoid-recent": setting(); a.avoidRecent = parseInt(value(), 10); break;
      case "--difficulty": setting(); a.difficulty = parseDifficultyMix(value()); break;
      case "--retry": setting(); a.retry = parseInt(value(), 10); break;
      case "--language": {
        setting();
        const v = value();
        if (v !== "EN" && v !== "HI") throw new Error(`--language must be EN or HI (got "${v}"); this generator writes no other language`);
        a.language = v;
        break;
      }
      case "--max-usd": a.maxUsd = value(); break;
      case "--dry-run": a.dryRun = true; break;
      case "--no-ai": a.noAi = true; break;
      case "--verify": a.verify = true; break;
      case "--auto-validate": a.autoValidate = true; break;
      case "--resume": a.resume = value(); break;
      case "--journal": a.journal = value(); break;
      case "--force": a.force = true; break;
      case ALLOW_SHARED_KEY_FLAG: a.allowSharedKey = true; break;
      case "--help": case "-h": a.help = true; break;
      default:
        throw new Error(flag.startsWith("-") ? `unknown flag: ${flag} (see --help)` : `unexpected argument "${flag}" (see --help)`);
    }
  }
  return a;
}

/** A fresh run's settings, from the flags; a resumed run reads its journal's instead. */
export function settingsFromArgs(a: GenCliArgs, model: string): GenSettings {
  const s: GenSettings = {
    all: a.all,
    skipSubjects: a.skipSubjects,
    count: a.count,
    batchSize: a.batchSize,
    difficulty: a.difficulty,
    avoidRecent: a.avoidRecent,
    retry: a.retry,
    language: a.language,
    model,
  };
  if (a.topic) s.topic = a.topic;
  if (a.subject) s.subject = a.subject;
  return s;
}

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

export type GenTier = "haiku" | "sonnet" | "opus";

/** The PRICING row a model bills at; null for an id that names no known tier (the guard refuses to price it). */
export function genModelTier(model: string): GenTier | null {
  const m = model.toLowerCase();
  if (m.includes("haiku")) return "haiku";
  if (m.includes("opus")) return "opus";
  if (m.includes("sonnet")) return "sonnet";
  return null;
}

/**
 * One call's worst case before it is made: every prompt token billed at the
 * dearer of the input and the cache-write price (the system blocks carry
 * cache_control, and a first call writes them), and the reply filling
 * max_tokens. List price: generation calls are synchronous, not batched.
 */
export function worstCaseCallUsd(model: string, promptTokens: number, maxTokens: number): number {
  const tier = genModelTier(model);
  if (!tier) throw new Error(`the spend guard has no price for model "${model}" (expected a haiku, sonnet or opus id); set ANTHROPIC_MODEL to one`);
  const p = PRICING[tier];
  return (promptTokens / 1e6) * Math.max(p.in, p.cacheW) + (maxTokens / 1e6) * p.out;
}

/** The prompt tokens the worst case prices: the character estimate plus GEN_PROMPT_TOKEN_MARGIN. */
export function genPromptTokens(params: Anthropic.Messages.MessageCreateParamsNonStreaming): number {
  return Math.ceil(estimateRequestTokens(params) * GEN_PROMPT_TOKEN_MARGIN);
}

// ---------------------------------------------------------------------------
// API errors: wait and call again, give up the topic, or stop the run
// ---------------------------------------------------------------------------

function apiErrorBody(e: unknown): { type: string; message: string | null } {
  const body = (e as { error?: { error?: { type?: unknown; message?: unknown } } })?.error?.error;
  return { type: typeof body?.type === "string" ? body.type : "", message: typeof body?.message === "string" ? body.message : null };
}

/** A 429 or 529: refused before any work (not billed), so worth calling again after a wait. */
export function isTransientApiError(e: unknown): boolean {
  if (classifyProbeError(e).kind !== "error") return false; // an empty balance or a bad key never clears by waiting
  const status = (e as { status?: unknown })?.status;
  const { type } = apiErrorBody(e);
  return status === 429 || status === 529 || type === "rate_limit_error" || type === "overloaded_error";
}

/**
 * Words that mark a 400 as being about the account, the key or the model,
 * which every topic shares, rather than about this one request. A spend
 * limit arrives as a 400 invalid_request_error ("You have reached your
 * specified API usage limits"), and so does an empty balance. Such a 400
 * must stop the run, not give up every topic in turn. A false match only
 * stops the run, which is the safe side.
 */
const ACCOUNT_WIDE_400 = /limit|credit|billing|balance|quota|rate|model|organi[sz]ation|workspace|api key/i;

/**
 * A 400 invalid_request_error about this call's own request, for example a
 * prompt the API will not take (30 Sep 2026 review). Calling again with the
 * same prompt gets the same answer, and a resume would hit that topic first
 * every time, so the run gives up on that topic and goes on. Everything
 * else stops the run: billing, auth, spend or rate limits, 404, 5xx, network
 * errors, and a 400 whose body names no message.
 */
export function isTopicRequestError(e: unknown): boolean {
  const p = classifyProbeError(e);
  if (p.kind !== "error" || p.status !== 400) return false;
  const { type, message } = apiErrorBody(e);
  return type === "invalid_request_error" && message != null && !ACCOUNT_WIDE_400.test(message);
}

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

export interface GenTopicInput {
  id: string;
  code: string;
  name: string;
  description?: string | null;
}

export interface GenSelection {
  topic?: string;
  subject?: string;
  all?: boolean;
  skipSubjects?: string[];
}

/** "LANG1, LANG2,,LANG1" → ["LANG1", "LANG2"]; a flag given without a value is malformed. */
export function parseSkipSubjects(raw: string | undefined): string[] {
  if (raw === undefined) return [];
  const codes = [...new Set(raw.split(",").map((s) => s.trim()).filter(Boolean))];
  if (!codes.length) throw new Error(`--skip-subjects needs subject codes, comma-separated (got "${raw}")`);
  return codes;
}

/**
 * The topics a run generates for: --topic, else --subject, else --all (as
 * before), minus --skip-subjects (30 Sep 2026: language papers, which this
 * generator cannot write). A skip code the exam does not have is refused
 * (matched case-insensitively) rather than ignored, so a typo cannot let a
 * language paper through.
 */
export function selectTargets<T extends GenTopicInput>(examCode: string, subjects: ReadonlyArray<{ code: string; topics: T[] }>, sel: GenSelection): T[] {
  const byCode = new Map(subjects.map((s) => [s.code.toUpperCase(), s]));
  const skip = new Set<string>();
  for (const raw of sel.skipSubjects ?? []) {
    const s = byCode.get(raw.toUpperCase());
    if (!s) throw new Error(`--skip-subjects: ${examCode} has no subject "${raw}" (its subjects: ${subjects.map((x) => x.code).join(", ")})`);
    skip.add(s.code);
  }
  const kept = subjects.filter((s) => !skip.has(s.code));
  let targets: T[] = [];
  if (sel.topic) {
    const t = kept.flatMap((s) => s.topics).find((x) => x.code === sel.topic);
    if (!t) {
      const skipped = subjects.some((s) => skip.has(s.code) && s.topics.some((x) => x.code === sel.topic));
      throw new Error(skipped ? `Topic ${sel.topic} belongs to a subject in --skip-subjects.` : `Topic ${sel.topic} not found in ${examCode}.`);
    }
    targets = [t];
  } else if (sel.subject) {
    const s = subjects.find((x) => x.code === sel.subject);
    if (!s) throw new Error(`Subject ${sel.subject} not found in ${examCode}.`);
    if (skip.has(s.code)) throw new Error(`Subject ${sel.subject} is also in --skip-subjects.`);
    targets = s.topics;
  } else if (sel.all) {
    targets = kept.flatMap((s) => s.topics);
  }
  if (!targets.length) throw new Error("No target topics resolved.");
  return targets;
}

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

export interface GenSettings {
  topic?: string;
  subject?: string;
  all: boolean;
  skipSubjects: string[];
  /** Questions per topic (--count). */
  count: number;
  /** Questions per call (--batch-size). */
  batchSize: number;
  difficulty: Record<Difficulty, number>;
  avoidRecent: number;
  /** Extra calls per batch when a reply cannot be parsed. */
  retry: number;
  language: "EN" | "HI";
  /** The model the run started on; a resume keeps it, whatever ANTHROPIC_MODEL says by then. */
  model: string;
}

/** Numbers that would otherwise loop oddly (NaN counts end a topic silently) are refused up front. */
export function assertGenSettings(s: GenSettings): void {
  if (!Number.isInteger(s.count) || s.count < 1) throw new Error(`--count must be a whole number of questions per topic, 1 or more (got ${s.count})`);
  if (!Number.isInteger(s.batchSize) || s.batchSize < 1 || s.batchSize > 25) throw new Error(`--batch-size must be a whole number from 1 to 25 (got ${s.batchSize})`);
  if (!Number.isInteger(s.retry) || s.retry < 0 || s.retry > 3) throw new Error(`--retry must be 0 to 3 (got ${s.retry})`);
  if (!Number.isInteger(s.avoidRecent) || s.avoidRecent < 0) throw new Error(`--avoid-recent must be 0 or more (got ${s.avoidRecent})`);
}

export type GenTopicStatus = "pending" | "done" | "gave-up";

export interface GenJournalTopic {
  /** Topic id: topic codes are unique per subject only, not per exam. */
  id: string;
  code: string;
  target: number;
  saved: number;
  rejected: number;
  calls: number;
  status: GenTopicStatus;
  note?: string;
  /** Ids of the rows this run saved, so a run can be audited or withdrawn as a whole. */
  questionIds: string[];
}

export type GenStopReason = "ceiling" | "api-error";

export interface GenJournal {
  version: 1;
  kind: "generate-questions";
  runId: string;
  createdAt: string;
  updatedAt: string;
  status: "running" | "stopped" | "done";
  exam: string;
  settings: GenSettings;
  /** USD priced from every reply of this run, across invocations: what --max-usd is checked against. */
  spentUsd: number;
  calls: number;
  topics: GenJournalTopic[];
  lastStop?: { at: string; reason: GenStopReason; message: string };
}

export function genRunId(exam: string, now: Date = new Date()): string {
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}${p(now.getMonth() + 1)}${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}${p(now.getSeconds())}`;
  return `${stamp}-gen-${exam.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || "run"}`;
}

export function genJournalPath(dir: string, runId: string): string {
  if (!/^[A-Za-z0-9_.-]{1,80}$/.test(runId)) throw new Error(`journal: runId "${runId}" must be a plain file-name token`);
  return path.join(dir, `${runId}.json`);
}

export function newGenJournal(
  runId: string,
  exam: string,
  settings: GenSettings,
  topics: ReadonlyArray<{ id: string; code: string }>,
  now: Date = new Date(),
): GenJournal {
  const at = now.toISOString();
  return {
    version: 1,
    kind: "generate-questions",
    runId,
    createdAt: at,
    updatedAt: at,
    status: "running",
    exam,
    settings,
    spentUsd: 0,
    calls: 0,
    topics: topics.map((t) => ({ id: t.id, code: t.code, target: settings.count, saved: 0, rejected: 0, calls: 0, status: "pending", questionIds: [] })),
  };
}

/** Write-then-rename, so a kill mid-write never leaves a half-written journal. */
export function saveGenJournal(file: string, journal: GenJournal, now: Date = new Date()): void {
  journal.updatedAt = now.toISOString();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(journal, null, 1));
  fs.renameSync(tmp, file);
}

export function loadGenJournal(file: string): GenJournal {
  const j = JSON.parse(fs.readFileSync(file, "utf8")) as GenJournal;
  if (j?.version !== 1 || j.kind !== "generate-questions" || typeof j.runId !== "string" || !Array.isArray(j.topics) || !j.settings) {
    throw new Error(`journal: ${file} is not a generate-questions v1 journal`);
  }
  return j;
}

/** Questions a topic still needs; 0 once it is done or given up. */
export function topicRemaining(t: GenJournalTopic): number {
  return t.status === "pending" ? Math.max(0, t.target - t.saved) : 0;
}

/**
 * The database is the truth for what a run saved: a kill between a batch's
 * insert and the journal save leaves the journal short, and a plain resume
 * would pay for that batch again. `dbCounts` is rows per topic id carrying
 * metadata.genRun = runId. Returns the codes of the topics it corrected.
 */
export function reconcileSaved(journal: GenJournal, dbCounts: Readonly<Record<string, number>>): string[] {
  const fixed: string[] = [];
  for (const t of journal.topics) {
    const n = dbCounts[t.id] ?? 0;
    if (n > t.saved) {
      t.saved = n;
      t.note = `saved count taken from the database (${n}) on resume`;
      fixed.push(t.code);
    }
    if (t.status === "pending" && t.saved >= t.target) t.status = "done";
  }
  return fixed;
}

/** What is still to generate, and in about how many calls. */
export function planSummary(journal: GenJournal): { topics: number; questions: number; calls: number } {
  let topics = 0;
  let questions = 0;
  let calls = 0;
  for (const t of journal.topics) {
    const r = topicRemaining(t);
    if (!r) continue;
    topics += 1;
    questions += r;
    calls += Math.ceil(r / journal.settings.batchSize);
  }
  return { topics, questions, calls };
}

/** Unfinished runs over this exam under `dir`: a fresh run over the same exam would pay for their topics again. Unreadable files are reported and skipped. */
export function openGenJournals(
  dir: string,
  exam: string,
  warn: (line: string) => void = (line) => console.warn(line),
): Array<{ runId: string; file: string; status: string; spentUsd: number; questions: number }> {
  let names: string[];
  try {
    names = fs.readdirSync(dir).filter((n) => n.endsWith(".json"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw e;
  }
  const out: Array<{ runId: string; file: string; status: string; spentUsd: number; questions: number }> = [];
  for (const name of names) {
    let j: GenJournal;
    try {
      j = loadGenJournal(path.join(dir, name));
    } catch (e) {
      warn(`   ! skipping unreadable journal ${name}: ${String((e as Error)?.message ?? e).split("\n")[0].slice(0, 120)}`);
      continue;
    }
    if (j.exam !== exam || j.status === "done") continue;
    out.push({ runId: j.runId, file: name.replace(/\.json$/, ""), status: j.status, spentUsd: j.spentUsd, questions: planSummary(j).questions });
  }
  return out;
}

/** The command that continues a journal. --resume takes the file's own name; a journal outside the default folder needs --journal as well. */
export function genResumeCommand(file: string, opts: { maxUsd: number | string; allowSharedKey?: boolean; dir?: string }): string {
  const token = path.basename(file, ".json");
  const inDir = path.resolve(path.dirname(file)) === path.resolve(opts.dir ?? GEN_JOURNAL_DIR);
  return `${GEN_SCRIPT} --resume ${token}${inDir ? "" : ` --journal "${file}"`} --max-usd ${opts.maxUsd}${opts.allowSharedKey ? " --allow-shared-key" : ""}`;
}

/**
 * What to print when a writing run dies on an error the loop does not
 * handle, such as a database error in save or context (30 Sep 2026 review).
 * The journal stays "running", and a fresh run over the exam is refused
 * until it is resumed, so the operator needs the resume command. null when
 * there is no journal to resume (a dry run, or a failure before it existed).
 */
export function genCrashResumeHint(mode: GenRunMode, journalFile: string | null, allowSharedKey: boolean): string | null {
  if (!mode.writes || !journalFile || mode.maxUsd == null) return null;
  return `The journal ${journalFile} holds the spend and every batch saved so far. To continue once the cause is fixed:\n   ${genResumeCommand(journalFile, { maxUsd: mode.maxUsd, allowSharedKey })}`;
}

// ---------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------

export interface GenTopicContext {
  fewShotBlock: string;
  avoidBlock: string;
  /** Recent stems on the topic; a new question whose dedupeKey matches one is dropped. */
  recentBodies: string[];
}

export interface GenDriverDeps {
  examCode: string;
  mode: GenRunMode;
  /** One call's params (the script's prompts). params.model and params.max_tokens are what the worst case prices. */
  buildParams(topic: GenTopicInput, want: number, ctx: GenTopicContext, mix: Record<Difficulty, number>): Anthropic.Messages.MessageCreateParamsNonStreaming;
  context(topic: GenTopicInput): Promise<GenTopicContext>;
  /** The API call; throws on an API error. Never called when mode.callsApi is false. */
  call(params: Anthropic.Messages.MessageCreateParamsNonStreaming): Promise<Anthropic.Messages.Message>;
  /** Writes the AiUsage row for one reply (recordAiUsageAwaited in the script). A failure is logged, never fatal. */
  ledger(message: Anthropic.Messages.Message, latencyMs: number): Promise<unknown>;
  /** Inserts one batch; returns the new ids. Only called when mode.writes. */
  save(topic: GenTopicInput, qs: GeneratedQuestion[]): Promise<string[]>;
  /** Saves the journal; absent on a dry run, whose journal lives in memory only. */
  persist?: (journal: GenJournal) => void;
  log?: (line: string) => void;
  warn?: (line: string) => void;
  now?: () => Date;
  /** The waits after a 429 or 529 (GEN_TRANSIENT_WAITS_MS); tests pass one that returns at once. */
  sleep?: (ms: number) => Promise<void>;
}

export interface GenStop {
  reason: GenStopReason;
  topicCode: string;
  spentUsd: number;
  maxUsd: number;
  /** ceiling: the refused call's worst case. */
  worstUsd?: number;
  remainingQuestions: number;
  remainingCalls: number;
  /** What to pass as --max-usd to continue: enough for the refused call (ceiling), or the same cap (api-error). */
  suggestedMaxUsd: number;
  message: string;
}

export interface GenRunResult {
  /** This invocation only; the journal carries the run's totals. */
  calls: number;
  spentUsd: number;
  accepted: number;
  rejected: number;
  saved: number;
  tokens: { input: number; output: number; cacheWrite: number; cacheRead: number };
  gaveUp: string[];
  stop?: GenStop;
}

function replyText(message: Anthropic.Messages.Message): string {
  return message.content
    .filter((b): b is Anthropic.Messages.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}

/**
 * Generates what the journal still needs, topic by topic, batch by batch,
 * under the ceiling. A dry run passes an in-memory journal and no persist:
 * it makes one batch per topic and saves nothing. The loop returns early,
 * with the journal "stopped" and saved, when the next call's worst case
 * would cross --max-usd or the API refuses a call; what is still to do
 * stays "pending" for --resume.
 */
export async function runGeneration(journal: GenJournal, topics: ReadonlyMap<string, GenTopicInput>, deps: GenDriverDeps): Promise<GenRunResult> {
  const { mode } = deps;
  if (!mode.callsApi && mode.writes) throw new Error("runGeneration: a run without the API writes nothing (--no-ai needs --dry-run)");
  if (mode.callsApi && !(mode.maxUsd != null && Number.isFinite(mode.maxUsd) && mode.maxUsd > 0)) {
    throw new Error("runGeneration: a run that calls the API needs a finite --max-usd above zero; there is no default");
  }
  if (mode.writes && !deps.persist) throw new Error("runGeneration: a writing run needs its journal saved (persist)");
  const s = journal.settings;
  const log = deps.log ?? ((line: string) => console.log(line));
  const warn = deps.warn ?? ((line: string) => console.warn(line));
  const now = deps.now ?? (() => new Date());
  const persist = () => deps.persist?.(journal);
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const result: GenRunResult = { calls: 0, spentUsd: 0, accepted: 0, rejected: 0, saved: 0, tokens: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 }, gaveUp: [] };
  /** Topics given up on a 400 since the last reply, with the note each had before; GEN_REFUSED_TOPICS_BEFORE_STOP in a row stops the run. */
  let refusedInARow: Array<{ topic: GenJournalTopic; note?: string }> = [];

  /** One call, called again after the GEN_TRANSIENT_WAITS_MS waits on a 429 or 529; any other error comes back as `error`. */
  const callApi = async (
    params: Anthropic.Messages.MessageCreateParamsNonStreaming,
    code: string,
  ): Promise<{ message: Anthropic.Messages.Message; latencyMs: number } | { error: unknown }> => {
    for (let i = 0; ; i++) {
      const startedAt = Date.now();
      try {
        const message = await deps.call(params);
        return { message, latencyMs: Date.now() - startedAt };
      } catch (e) {
        if (i >= GEN_TRANSIENT_WAITS_MS.length || !isTransientApiError(e)) return { error: e };
        warn(`   ⏳ ${code}: ${describeProbe(classifyProbeError(e))}. Refused before any work, so not billed; calling again in ${GEN_TRANSIENT_WAITS_MS[i] / 1000}s`);
        await sleep(GEN_TRANSIENT_WAITS_MS[i]);
      }
    }
  };

  const stopWith = (reason: GenStopReason, topicCode: string, message: (left: { questions: number; calls: number }) => string, extra: { worstUsd?: number; suggestedMaxUsd: number }): GenRunResult => {
    const left = planSummary(journal);
    const text = message(left);
    journal.status = "stopped";
    journal.lastStop = { at: now().toISOString(), reason, message: text };
    persist();
    warn(`   ✋ ${text}`);
    result.stop = {
      reason,
      topicCode,
      spentUsd: journal.spentUsd,
      maxUsd: mode.maxUsd ?? 0,
      remainingQuestions: left.questions,
      remainingCalls: left.calls,
      message: text,
      ...extra,
    };
    return result;
  };

  for (const jt of journal.topics) {
    if (jt.status !== "pending") continue;
    const topic = topics.get(jt.id);
    if (!topic) {
      jt.status = "gave-up";
      jt.note = "the topic is no longer in the exam";
      result.gaveUp.push(jt.code);
      persist();
      warn(`   ! ${jt.code}: no longer in ${deps.examCode}; skipped`);
      continue;
    }
    if (topicRemaining(jt) === 0) {
      jt.status = "done";
      persist();
      continue;
    }
    log(`\n→ ${topic.code} — ${topic.name} (${topicRemaining(jt)} of ${jt.target} to go)`);
    const ctx = await deps.context(topic);
    const seen = new Set(ctx.recentBodies.map(dedupeKey));

    while (topicRemaining(jt) > 0) {
      const want = Math.min(topicRemaining(jt), s.batchSize);
      const mix = batchDifficulty(want, s.difficulty);
      let batch: unknown[] | null = null;
      if (!mode.callsApi) {
        batch = offlineStub(want, topic.code, s.difficulty);
      } else {
        const params = deps.buildParams(topic, want, ctx, mix);
        const promptTokens = genPromptTokens(params);
        let lastError = "";
        /** Set when the API refused this topic's request itself (isTopicRequestError). */
        let refused: string | null = null;
        for (let attempt = 0; attempt <= s.retry; attempt++) {
          // The guard: this call's worst case on top of everything the run has spent so far.
          const worst = worstCaseCallUsd(params.model, promptTokens, params.max_tokens);
          const maxUsd = mode.maxUsd!;
          if (journal.spentUsd + worst > maxUsd) {
            const spent = journal.spentUsd;
            return stopWith(
              "ceiling",
              topic.code,
              (left) =>
                `${topic.code}: the next call was NOT made. Spent ${fmtUsd(spent)} so far in this run + worst case ${fmtUsd(worst)} for the call (~${promptTokens.toLocaleString()} prompt tokens, a reply filling ${params.max_tokens}) is over --max-usd ${fmtUsd(maxUsd)}. ` +
                `${left.questions} questions in ~${left.calls} calls still to go. To continue, pass --max-usd ${Math.max(1, Math.ceil(spent + worst))} or more (${fmtUsd(spent + left.calls * worst)} covers everything left at worst).`,
              { worstUsd: worst, suggestedMaxUsd: Math.max(1, Math.ceil(spent + worst)) },
            );
          }
          const outcome = await callApi(params, topic.code);
          if ("error" in outcome) {
            const p = classifyProbeError(outcome.error);
            if (isTopicRequestError(outcome.error)) {
              // No reply, so nothing billed. The same prompt would be refused again: no retry.
              refused = describeProbe(p);
              break;
            }
            const spent = journal.spentUsd;
            return stopWith(
              "api-error",
              topic.code,
              (left) =>
                `${topic.code}: the API refused the call (${describeProbe(p)}); nothing more is sent.${p.kind === "billing" ? " The balance the live tutor shares is empty: add credit first." : ""} ` +
                `Spent ${fmtUsd(spent)} so far in this run; ${left.questions} questions in ~${left.calls} calls still to go. Resume once the key answers again.`,
              { suggestedMaxUsd: maxUsd },
            );
          }
          const { message, latencyMs } = outcome;
          refusedInARow = [];
          // Priced from the reply's own usage and on the journal (saved) BEFORE the ledger insert
          // and before the reply is parsed: an unusable reply is billed all the same.
          const cost = usageCostUsd(message.model || params.model, message.usage).cost;
          journal.spentUsd += cost;
          journal.calls += 1;
          jt.calls += 1;
          result.calls += 1;
          result.spentUsd += cost;
          result.tokens.input += message.usage.input_tokens ?? 0;
          result.tokens.output += message.usage.output_tokens ?? 0;
          result.tokens.cacheWrite += message.usage.cache_creation_input_tokens ?? 0;
          result.tokens.cacheRead += message.usage.cache_read_input_tokens ?? 0;
          persist();
          try {
            await deps.ledger(message, latencyMs);
          } catch (e) {
            warn(`   ! ledger row not written for ${topic.code}: ${String((e as Error)?.message ?? e).slice(0, 120)}`);
          }
          const parsed = parseGeneratedReply(replyText(message));
          if (parsed.ok) {
            batch = parsed.items;
            break;
          }
          lastError = parsed.error;
          const left = s.retry - attempt;
          if (left > 0) warn(`   ⚠ unusable reply (${lastError.slice(0, 100)}), retrying… (${left} attempt${left === 1 ? "" : "s"} left)`);
        }
        if (!batch) {
          if (refused) {
            if (refusedInARow.length + 1 >= GEN_REFUSED_TOPICS_BEFORE_STOP) {
              // Refused again with no reply in between: that is about every request (a parameter,
              // the account), not one topic. Stop, and put the earlier topics back to pending so a
              // resume tries them once the request is fixed, instead of the run finishing "done".
              const earlier = refusedInARow.map((r) => r.topic.code);
              for (const r of refusedInARow) {
                r.topic.status = "pending";
                if (r.note === undefined) delete r.topic.note;
                else r.topic.note = r.note;
              }
              result.gaveUp = result.gaveUp.filter((c) => !earlier.includes(c));
              refusedInARow = [];
              const spent = journal.spentUsd;
              const why = refused;
              return stopWith(
                "api-error",
                topic.code,
                (left) =>
                  `${topic.code}: the API refused the request (${why}) right after refusing ${earlier.join(", ")} the same way, with no reply in between. That is about every request, not one topic: nothing more is sent, and ${earlier.join(", ")} ${earlier.length === 1 ? "is" : "are"} pending again. ` +
                  `Spent ${fmtUsd(spent)} so far in this run; ${left.questions} questions in ~${left.calls} calls still to go. Resume once the request is fixed.`,
                { suggestedMaxUsd: mode.maxUsd! },
              );
            }
            refusedInARow.push({ topic: jt, note: jt.note });
            jt.status = "gave-up";
            jt.note = `the API refused this topic's request (not billed): ${refused.slice(0, 200)}`;
          } else {
            jt.status = "gave-up";
            jt.note = `reply unusable after ${s.retry + 1} tries: ${lastError.slice(0, 160)}`;
          }
          result.gaveUp.push(jt.code);
          persist();
          warn(`   ✗ ${topic.code}: ${jt.note}`);
          break;
        }
      }

      const accepted: GeneratedQuestion[] = [];
      let rejected = 0;
      for (const raw of batch) {
        const v = validateGenerated(raw);
        if (!v.ok) {
          warn(`  ⚠ rejected: ${v.reason}`);
          rejected += 1;
          continue;
        }
        const key = dedupeKey(v.q.body);
        if (seen.has(key)) {
          warn("  ⚠ rejected: duplicate body");
          rejected += 1;
          continue;
        }
        seen.add(key);
        accepted.push(v.q);
      }
      jt.rejected += rejected;
      result.accepted += accepted.length;
      result.rejected += rejected;
      log(`   batch: ${accepted.length} ok / ${rejected} rejected`);

      if (!mode.writes) {
        if (accepted.length) log(`\n[DRY RUN] First accepted question for this topic:\n${JSON.stringify(accepted[0], null, 2)}`);
        break; // one batch per topic in a dry run
      }
      if (!accepted.length) {
        jt.status = "gave-up";
        jt.note = "a batch produced no usable question";
        result.gaveUp.push(jt.code);
        persist();
        warn(`   no accepts in last batch — stopping for ${topic.code}`);
        break;
      }
      const ids = await deps.save(topic, accepted);
      jt.saved += ids.length;
      jt.questionIds.push(...ids);
      result.saved += ids.length;
      if (jt.saved >= jt.target) jt.status = "done";
      persist();
      log(`   saved ${ids.length} (validated:false, source:AI_GENERATED) · ${jt.saved}/${jt.target} · spent ${fmtUsd(journal.spentUsd)} of ${fmtUsd(mode.maxUsd ?? 0)}`);
    }
  }

  // Every topic is done or given up here; lastStop stays as the record of an earlier stop.
  if (mode.writes) {
    journal.status = "done";
    persist();
  }
  return result;
}
