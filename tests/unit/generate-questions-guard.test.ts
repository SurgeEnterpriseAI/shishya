// Tests for the spend guard, ledger and journal of scripts/generate-questions.ts
// (30 Sep 2026, src/lib/ai/question-gen-run.ts): the flag refusals (--verify,
// --no-ai without --dry-run, no --max-usd), the worst-case price of a call,
// --skip-subjects, the journal, and the run loop driven by a fake model.
// The loop must stop before the call that would cross the ceiling, count
// spend from each reply's usage (unusable replies too), resume with only
// what is missing, and stop the whole run on an API error. After the
// 30 Sep 2026 review, two cases do not stop it: a 429/529 (not billed) is
// called again after a wait, and a 400 about one topic's request gives up
// that topic unless the next topic is refused the same way. Nothing here
// touches the network or the database.

import { describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type Anthropic from "@anthropic-ai/sdk";

vi.mock("@/lib/db/prisma", () => ({ prisma: { aiUsage: { create: () => Promise.resolve({}) } } }));
vi.mock("next/server", () => ({
  after: () => {
    throw new Error("after() called outside a request scope");
  },
}));

import { estimateRequestTokens } from "@/lib/ai/batch";
import {
  DEFAULT_DIFFICULTY,
  GEN_JOURNAL_DIR,
  GEN_LEDGER_FEATURE,
  GEN_MAX_TOKENS,
  GEN_PROMPT_TOKEN_MARGIN,
  GEN_TRANSIENT_WAITS_MS,
  assertGenSettings,
  batchDifficulty,
  dedupeKey,
  genCrashResumeHint,
  genJournalPath,
  genModelTier,
  genPromptTokens,
  genResumeCommand,
  genRunId,
  isTopicRequestError,
  isTransientApiError,
  loadGenJournal,
  newGenJournal,
  offlineStub,
  openGenJournals,
  parseDifficultyMix,
  parseGenArgs,
  parseGeneratedReply,
  parseSkipSubjects,
  planSummary,
  reconcileSaved,
  resolveGenRunMode,
  runGeneration,
  saveGenJournal,
  selectTargets,
  settingsFromArgs,
  topicRemaining,
  validateGenerated,
  worstCaseCallUsd,
  type GenDriverDeps,
  type GenJournal,
  type GenRunMode,
  type GenSettings,
  type GenTopicInput,
} from "@/lib/ai/question-gen-run";

const SONNET = "claude-sonnet-4-5-20250929";

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

describe("parseGenArgs", () => {
  it("reads the flags and records which settings were given", () => {
    const a = parseGenArgs(["--exam", "TS_TET", "--all", "--skip-subjects", "LANG1, LANG2", "--count", "2", "--max-usd", "2.5", "--allow-shared-key"]);
    expect(a).toMatchObject({ exam: "TS_TET", all: true, skipSubjects: ["LANG1", "LANG2"], count: 2, batchSize: 10, maxUsd: "2.5", allowSharedKey: true, dryRun: false, noAi: false });
    expect(a.given).toEqual(["--exam", "--all", "--skip-subjects", "--count"]);
    expect(a.difficulty).toEqual(DEFAULT_DIFFICULTY);
  });

  it("refuses an unknown flag or a stray argument instead of ignoring it (a typo must not let a language paper through)", () => {
    expect(() => parseGenArgs(["--exam", "TS_TET", "--all", "--skip-subject", "LANG1"])).toThrow(/unknown flag: --skip-subject/);
    expect(() => parseGenArgs(["--exam", "TS_TET", "--all", "--per-topic", "2"])).toThrow(/unknown flag: --per-topic/);
    expect(() => parseGenArgs(["--count", "5", "10"])).toThrow(/unexpected argument "10"/);
  });

  it("refuses a language the generator cannot write, and an empty --skip-subjects", () => {
    expect(() => parseGenArgs(["--language", "TE"])).toThrow(/--language must be EN or HI/);
    expect(parseGenArgs(["--language", "HI"]).language).toBe("HI");
    expect(() => parseGenArgs(["--skip-subjects"])).toThrow(/--skip-subjects needs subject codes/);
    expect(() => parseGenArgs(["--skip-subjects", " , "])).toThrow(/--skip-subjects needs subject codes/);
  });

  it("a --max-usd given last without a value reads as malformed", () => {
    expect(parseGenArgs(["--exam", "X", "--all", "--max-usd"]).maxUsd).toBe("");
  });

  it("parseSkipSubjects trims and de-duplicates", () => {
    expect(parseSkipSubjects(undefined)).toEqual([]);
    expect(parseSkipSubjects("LANG,PUNJABI,,LANG ")).toEqual(["LANG", "PUNJABI"]);
  });

  it("parseDifficultyMix keeps its rules and refuses a mix that does not add up (NaN included)", () => {
    expect(parseDifficultyMix("EASY:0.2,MEDIUM:0.5,HARD:0.3")).toEqual({ EASY: 0.2, MEDIUM: 0.5, HARD: 0.3 });
    expect(() => parseDifficultyMix("EASY:0.2,MEDIUM:0.2")).toThrow(/must sum to 1.0/);
    expect(() => parseDifficultyMix("EASY:x,MEDIUM:0.5,HARD:0.5")).toThrow(/must sum to 1.0/);
    expect(() => parseDifficultyMix("TRIVIAL:1")).toThrow(/bad difficulty key/);
  });
});

describe("resolveGenRunMode — refusals before anything is read", () => {
  const base = (over: Partial<ReturnType<typeof parseGenArgs>> = {}) => ({ ...parseGenArgs(["--exam", "TS_ICET", "--all"]), ...over });

  it("an ordinary run calls the API, writes, and carries its ceiling", () => {
    expect(resolveGenRunMode(base({ maxUsd: "3" }))).toEqual({ callsApi: true, maxUsd: 3, writes: true });
  });

  it("refuses --verify (full-price checking on the shared key) and points at the batch answer check", () => {
    expect(() => resolveGenRunMode(base({ verify: true, maxUsd: "3" }))).toThrow(/--verify was removed on 30 Sep 2026/);
    expect(() => resolveGenRunMode(base({ verify: true, maxUsd: "3" }))).toThrow(/verify-question-bank\.ts --exams <CODE> --scope unvalidated/);
    expect(() => resolveGenRunMode(base({ autoValidate: true, maxUsd: "3" }))).toThrow(/--auto-validate was removed/);
  });

  it("requires --max-usd for every run that calls the API, dry runs included", () => {
    expect(() => resolveGenRunMode(base())).toThrow(/needs --max-usd <usd>/);
    expect(() => resolveGenRunMode(base({ dryRun: true }))).toThrow(/needs --max-usd <usd>/);
    expect(resolveGenRunMode(base({ dryRun: true, maxUsd: "0.5" }))).toEqual({ callsApi: true, maxUsd: 0.5, writes: false });
  });

  it("refuses a --max-usd that is not a positive number", () => {
    for (const bad of ["", "0", "-1", "abc", "Infinity", " "]) {
      expect(() => resolveGenRunMode(base({ maxUsd: bad })), JSON.stringify(bad)).toThrow(/--max-usd must be a positive number/);
    }
  });

  it("--no-ai runs only as a dry run (it would write stub rows to the production database), and then needs no ceiling", () => {
    expect(() => resolveGenRunMode(base({ noAi: true }))).toThrow(/run --no-ai only with --dry-run/);
    expect(resolveGenRunMode(base({ noAi: true, dryRun: true }))).toEqual({ callsApi: false, maxUsd: null, writes: false });
    expect(resolveGenRunMode(base({ noAi: true, dryRun: true, maxUsd: "2" })).maxUsd).toBeNull();
  });

  it("a fresh run needs --exam and a selection", () => {
    expect(() => resolveGenRunMode({ ...parseGenArgs(["--all"]), maxUsd: "1" })).toThrow(/--exam is required/);
    expect(() => resolveGenRunMode({ ...parseGenArgs(["--exam", "X"]), maxUsd: "1" })).toThrow(/must pass --topic, --subject, or --all/);
  });

  it("a resume keeps its journal's settings: settings flags are refused, --exam is allowed, --dry-run is refused", () => {
    const r = parseGenArgs(["--resume", "20260930-120000-gen-TS_ICET", "--max-usd", "4"]);
    expect(resolveGenRunMode(r)).toEqual({ callsApi: true, maxUsd: 4, writes: true });
    expect(resolveGenRunMode(parseGenArgs(["--resume", "r1", "--exam", "TS_ICET", "--max-usd", "4"])).writes).toBe(true);
    expect(() => resolveGenRunMode(parseGenArgs(["--resume", "r1", "--count", "9", "--max-usd", "4"]))).toThrow(/drop --count/);
    expect(() => resolveGenRunMode(parseGenArgs(["--resume", "r1", "--dry-run", "--max-usd", "4"]))).toThrow(/Drop --dry-run/);
    expect(() => resolveGenRunMode(parseGenArgs(["--resume", "r1"]))).toThrow(/needs --max-usd/);
  });
});

describe("assertGenSettings", () => {
  const s = (over: Partial<GenSettings> = {}): GenSettings => ({ ...settingsFromArgs(parseGenArgs(["--all"]), SONNET), ...over });
  it("accepts the defaults and refuses counts that would end a topic silently", () => {
    expect(() => assertGenSettings(s())).not.toThrow();
    expect(() => assertGenSettings(s({ count: 0 }))).toThrow(/--count/);
    expect(() => assertGenSettings(s({ count: Number.NaN }))).toThrow(/--count/);
    expect(() => assertGenSettings(s({ batchSize: 26 }))).toThrow(/--batch-size/);
    expect(() => assertGenSettings(s({ retry: 4 }))).toThrow(/--retry/);
    expect(() => assertGenSettings(s({ avoidRecent: -1 }))).toThrow(/--avoid-recent/);
  });
  it("settingsFromArgs records the model a resume will keep", () => {
    expect(settingsFromArgs(parseGenArgs(["--exam", "X", "--topic", "q.a"]), SONNET)).toMatchObject({ topic: "q.a", all: false, model: SONNET, count: 20 });
  });
});

// ---------------------------------------------------------------------------
// Price
// ---------------------------------------------------------------------------

describe("worst case of one call", () => {
  it("prices prompt tokens at the dearer of input and cache write, and a reply filling max_tokens", () => {
    // Sonnet: cache write $3.75/M (dearer than input $3/M), output $15/M.
    expect(worstCaseCallUsd(SONNET, 2000, 8000)).toBeCloseTo(2000 * 3.75e-6 + 8000 * 15e-6, 10);
    expect(worstCaseCallUsd(SONNET, 0, GEN_MAX_TOKENS)).toBeCloseTo(0.12, 10);
    expect(worstCaseCallUsd("claude-haiku-4-5-20251001", 1000, 1000)).toBeCloseTo(1000 * 1.25e-6 + 1000 * 5e-6, 10);
    expect(worstCaseCallUsd("claude-opus-4-8", 1000, 1000)).toBeCloseTo(1000 * 6.25e-6 + 1000 * 25e-6, 10);
  });
  it("refuses a model it cannot price instead of guessing", () => {
    expect(genModelTier("claude-sonnet-4-5-20250929")).toBe("sonnet");
    expect(genModelTier("mystery-model")).toBeNull();
    expect(() => worstCaseCallUsd("mystery-model", 1, 1)).toThrow(/no price for model "mystery-model"/);
  });
  it("prices the prompt with a 30% margin over the 4-characters-a-token estimate (the syllabus block tokenizes nearer 3)", () => {
    expect(GEN_PROMPT_TOKEN_MARGIN).toBe(1.3);
    const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
      model: SONNET,
      max_tokens: GEN_MAX_TOKENS,
      system: [{ type: "text", text: "- **Percentage** [`quant.percentage`]\n".repeat(200) }],
      messages: [{ role: "user", content: "Generate exactly 10 questions." }],
    };
    const est = estimateRequestTokens(params);
    expect(genPromptTokens(params)).toBe(Math.ceil(est * 1.3));
    expect(genPromptTokens(params)).toBeGreaterThan(est);
  });
});

// ---------------------------------------------------------------------------
// API errors
// ---------------------------------------------------------------------------

/** An error shaped like the SDK's APIError: status plus the API's JSON body. */
const apiError = (status: number | undefined, type: string, message: string) =>
  Object.assign(new Error(`${status ?? ""} ${message}`), { status, error: { type: "error", error: { type, message } } });
const BILLING_400 = () =>
  apiError(400, "invalid_request_error", "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.");
const SPEND_LIMIT_400 = () => apiError(400, "invalid_request_error", "You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC.");
const PROMPT_400 = () => apiError(400, "invalid_request_error", "messages.0.content.0.text: text content blocks must contain non-whitespace text");
const RATE_429 = () => apiError(429, "rate_limit_error", "Number of request tokens has exceeded your per-minute rate limit");
const OVERLOADED_529 = () => apiError(529, "overloaded_error", "Overloaded");

describe("API error classes (30 Sep 2026 review)", () => {
  it("a 429 or 529 is transient (refused before any work, not billed); nothing else is", () => {
    expect(isTransientApiError(RATE_429())).toBe(true);
    expect(isTransientApiError(OVERLOADED_529())).toBe(true);
    for (const e of [BILLING_400(), SPEND_LIMIT_400(), PROMPT_400(), apiError(500, "api_error", "Internal server error"), apiError(401, "authentication_error", "invalid x-api-key"), new Error("Connection error.")]) {
      expect(isTransientApiError(e), e.message).toBe(false);
    }
  });

  it("only a 400 invalid_request_error about the request itself is one topic's problem", () => {
    expect(isTopicRequestError(PROMPT_400())).toBe(true);
    expect(isTopicRequestError(apiError(400, "invalid_request_error", "prompt is too long: 213000 tokens > 200000 maximum"))).toBe(true);
  });

  it("an empty balance, a spend limit, a rate or model problem, auth, 5xx, 404, network, or a 400 with no body message stop the run", () => {
    for (const e of [
      BILLING_400(),
      SPEND_LIMIT_400(),
      apiError(400, "invalid_request_error", "This organization has been disabled."),
      apiError(400, "invalid_request_error", "model: claude-x is not available on this workspace"),
      RATE_429(),
      OVERLOADED_529(),
      apiError(500, "api_error", "Internal server error"),
      apiError(404, "not_found_error", "model: claude-x"),
      apiError(401, "authentication_error", "invalid x-api-key"),
      new Error("Connection error."),
      Object.assign(new Error("400 Bad Request"), { status: 400 }),
    ]) {
      expect(isTopicRequestError(e), e.message).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// Targets
// ---------------------------------------------------------------------------

const t = (id: string, code = id): GenTopicInput => ({ id, code, name: `Topic ${code}` });
const SUBJECTS = [
  { code: "QUANT", topics: [t("q1", "quant.a"), t("q2", "quant.b")] },
  { code: "LANG1", topics: [t("l1", "lang.telugu")] },
  { code: "LANG2", topics: [t("l2", "lang.english")] },
  { code: "GK", topics: [t("g1", "gk.a")] },
];

describe("selectTargets (--skip-subjects)", () => {
  it("--all minus the skipped subjects, matched case-insensitively", () => {
    expect(selectTargets("TS_TET", SUBJECTS, { all: true, skipSubjects: ["LANG1", "lang2"] }).map((x) => x.id)).toEqual(["q1", "q2", "g1"]);
    expect(selectTargets("TS_TET", SUBJECTS, { all: true }).map((x) => x.id)).toEqual(["q1", "q2", "l1", "l2", "g1"]);
  });
  it("refuses a skip code the exam does not have, listing the real ones", () => {
    expect(() => selectTargets("TS_TET", SUBJECTS, { all: true, skipSubjects: ["LANG3"] })).toThrow(/TS_TET has no subject "LANG3" \(its subjects: QUANT, LANG1, LANG2, GK\)/);
  });
  it("refuses a --topic or --subject that is also skipped", () => {
    expect(() => selectTargets("TS_TET", SUBJECTS, { topic: "lang.telugu", skipSubjects: ["LANG1"] })).toThrow(/belongs to a subject in --skip-subjects/);
    expect(() => selectTargets("TS_TET", SUBJECTS, { subject: "LANG1", skipSubjects: ["LANG1"] })).toThrow(/also in --skip-subjects/);
  });
  it("--topic and --subject as before", () => {
    expect(selectTargets("X", SUBJECTS, { topic: "gk.a" }).map((x) => x.id)).toEqual(["g1"]);
    expect(selectTargets("X", SUBJECTS, { subject: "QUANT" }).map((x) => x.id)).toEqual(["q1", "q2"]);
    expect(() => selectTargets("X", SUBJECTS, { topic: "nope" })).toThrow(/Topic nope not found in X/);
    expect(() => selectTargets("X", SUBJECTS, { subject: "NOPE" })).toThrow(/Subject NOPE not found in X/);
    expect(() => selectTargets("X", SUBJECTS, {})).toThrow(/No target topics resolved/);
  });
});

// ---------------------------------------------------------------------------
// Replies (moved from the script; same rules as tests/unit/generator-validation.test.ts)
// ---------------------------------------------------------------------------

const q = (body: string) => ({
  body,
  options: [
    { key: "A", text: "3" },
    { key: "B", text: "4" },
    { key: "C", text: "5" },
    { key: "D", text: "22" },
  ],
  answerKey: "B",
  solution: "Addition of the two numbers gives four; this is a basic fact.",
  difficulty: "EASY",
  tags: ["arithmetic"],
});

describe("replies", () => {
  it("validateGenerated keeps its rules", () => {
    expect(validateGenerated(q("What is 2 + 2 in basic arithmetic?")).ok).toBe(true);
    expect(validateGenerated({ ...q("What is 2 + 2 here?"), answerKey: "E" })).toEqual({ ok: false, reason: "answerKey must be A/B/C/D, got E" });
    expect(validateGenerated({ ...q("2+2?") })).toEqual({ ok: false, reason: "body too short" });
    expect(validateGenerated({ ...q("What is 2 + 2 here?"), difficulty: "easy" }).ok).toBe(false);
  });
  it("parseGeneratedReply strips code fences and wants an array", () => {
    expect(parseGeneratedReply("```json\n[1,2]\n```")).toEqual({ ok: true, items: [1, 2] });
    expect(parseGeneratedReply("{}")).toEqual({ ok: false, error: "the reply must be a JSON array of questions" });
    const bad = parseGeneratedReply("not json");
    expect(bad.ok).toBe(false);
  });
  it("dedupeKey, batchDifficulty and the stub", () => {
    expect(dedupeKey("  What   IS 2+2 ")).toBe(" what is 2+2 ");
    expect(batchDifficulty(10, DEFAULT_DIFFICULTY)).toEqual({ EASY: 0.3, MEDIUM: 0.5, HARD: expect.closeTo(0.2, 10) });
    const stub = offlineStub(4, "quant.a", DEFAULT_DIFFICULTY);
    expect(stub).toHaveLength(4);
    expect(stub.every((x) => validateGenerated(x).ok)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Journal
// ---------------------------------------------------------------------------

const settings = (over: Partial<GenSettings> = {}): GenSettings => ({
  all: true,
  skipSubjects: [],
  count: 30,
  batchSize: 10,
  difficulty: DEFAULT_DIFFICULTY,
  avoidRecent: 50,
  retry: 1,
  language: "EN",
  model: SONNET,
  ...over,
});

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "gen-journal-"));

describe("journal", () => {
  it("round-trips through a write-then-rename save and refuses other files", () => {
    const dir = tmpDir();
    const j = newGenJournal("20260930-120000-gen-TS_ICET", "TS_ICET", settings(), [t("q1", "quant.a"), t("g1", "gk.a")], new Date("2026-09-30T06:30:00Z"));
    expect(j).toMatchObject({ version: 1, kind: "generate-questions", status: "running", spentUsd: 0, calls: 0 });
    expect(j.topics[0]).toEqual({ id: "q1", code: "quant.a", target: 30, saved: 0, rejected: 0, calls: 0, status: "pending", questionIds: [] });
    const file = genJournalPath(dir, j.runId);
    saveGenJournal(file, j);
    expect(fs.existsSync(`${file}.tmp`)).toBe(false);
    expect(loadGenJournal(file)).toEqual(j);
    // a batch-runner journal (verify-question-bank) is not a generator journal
    const other = path.join(dir, "batch.json");
    fs.writeFileSync(other, JSON.stringify({ version: 1, runId: "x", requests: {}, batches: [] }));
    expect(() => loadGenJournal(other)).toThrow(/not a generate-questions v1 journal/);
    expect(() => genJournalPath(dir, "../evil")).toThrow(/plain file-name token/);
  });

  it("genRunId is a plain file-name token that names the exam", () => {
    const id = genRunId("TS_ICET", new Date(2026, 8, 30, 9, 5, 7));
    expect(id).toBe("20260930-090507-gen-TS_ICET");
    expect(() => genJournalPath(GEN_JOURNAL_DIR, id)).not.toThrow();
  });

  it("reconcileSaved takes the database's count when the journal is short (a kill between insert and journal save)", () => {
    const j = newGenJournal("r", "X", settings({ count: 10 }), [t("q1"), t("q2"), t("q3")]);
    j.topics[0].saved = 5;
    j.topics[1].saved = 4;
    const fixed = reconcileSaved(j, { q1: 10, q2: 3 });
    expect(fixed).toEqual(["q1"]);
    expect(j.topics[0]).toMatchObject({ saved: 10, status: "done" });
    expect(j.topics[1]).toMatchObject({ saved: 4, status: "pending" });
    expect(j.topics[2]).toMatchObject({ saved: 0, status: "pending" });
  });

  it("planSummary and topicRemaining count only pending topics", () => {
    const j = newGenJournal("r", "X", settings({ count: 25, batchSize: 10 }), [t("q1"), t("q2"), t("q3")]);
    j.topics[0].saved = 20;
    j.topics[1].status = "gave-up";
    expect(topicRemaining(j.topics[1])).toBe(0);
    expect(planSummary(j)).toEqual({ topics: 2, questions: 5 + 25, calls: 1 + 3 });
  });

  it("openGenJournals lists unfinished runs over the same exam only", () => {
    const dir = tmpDir();
    const a = newGenJournal("a", "TS_ICET", settings(), [t("q1")]);
    const b = newGenJournal("b", "TS_ICET", settings(), [t("q1")]);
    b.status = "done";
    const c = newGenJournal("c", "KL_KEAM", settings(), [t("q1")]);
    a.status = "stopped";
    a.spentUsd = 1.5;
    for (const j of [a, b, c]) saveGenJournal(genJournalPath(dir, j.runId), j);
    fs.writeFileSync(path.join(dir, "broken.json"), "{");
    const warnings: string[] = [];
    expect(openGenJournals(dir, "TS_ICET", (l) => warnings.push(l))).toEqual([{ runId: "a", file: "a", status: "stopped", spentUsd: 1.5, questions: 30 }]);
    expect(warnings.join("\n")).toMatch(/skipping unreadable journal broken\.json/);
    expect(openGenJournals(path.join(dir, "missing"), "TS_ICET")).toEqual([]);
  });

  it("genResumeCommand carries the ceiling, --journal outside the default folder, and --allow-shared-key when it was used", () => {
    const inDir = path.join(GEN_JOURNAL_DIR, "20260930-120000-gen-TS_ICET.json");
    expect(genResumeCommand(inDir, { maxUsd: 4 })).toBe("npx tsx --env-file=.env.local scripts/generate-questions.ts --resume 20260930-120000-gen-TS_ICET --max-usd 4");
    expect(genResumeCommand("C:/elsewhere/r1.json", { maxUsd: 2, allowSharedKey: true })).toBe(
      'npx tsx --env-file=.env.local scripts/generate-questions.ts --resume r1 --journal "C:/elsewhere/r1.json" --max-usd 2 --allow-shared-key',
    );
  });
});

// ---------------------------------------------------------------------------
// The run loop
// ---------------------------------------------------------------------------

/** A reply shaped like the SDK's Message; usage drives the price. */
function reply(text: string, usage: { input: number; output: number } = { input: 1000, output: 2000 }): Anthropic.Messages.Message {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: SONNET,
    content: [{ type: "text", text, citations: null }],
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: { input_tokens: usage.input, output_tokens: usage.output, cache_creation_input_tokens: null, cache_read_input_tokens: null },
  } as unknown as Anthropic.Messages.Message;
}
/** One call at 1,000 in / 2,000 out on Sonnet. */
const CALL_USD = 1000 * 3e-6 + 2000 * 15e-6; // 0.033

let stemSeq = 0;
const questions = (n: number) => JSON.stringify(Array.from({ length: n }, () => q(`Question number ${++stemSeq}: what is two plus two?`)));

const PARAMS: Anthropic.Messages.MessageCreateParamsNonStreaming = {
  model: SONNET,
  max_tokens: GEN_MAX_TOKENS,
  system: [{ type: "text", text: "persona" }],
  messages: [{ role: "user", content: "x".repeat(400) }],
};
const WORST = worstCaseCallUsd(SONNET, genPromptTokens(PARAMS), GEN_MAX_TOKENS);

interface Harness {
  deps: GenDriverDeps;
  events: string[];
  wants: number[];
  saved: Array<{ topic: string; n: number }>;
  spentAtCall: number[];
  ledgered: number;
  persisted: number;
  /** The waits the run asked for after a 429/529 (the harness returns at once). */
  waits: number[];
}

/**
 * A driver with a scripted model: `replies` is consumed one per call; a
 * function entry sees the batch size asked for. `journal` is read by the
 * fake call so the test can check what the run had spent at each call.
 */
function harness(journal: GenJournal, mode: GenRunMode, replies: Array<string | Error | ((want: number) => string)>, over: Partial<GenDriverDeps> = {}): Harness {
  const h: Harness = { events: [], wants: [], saved: [], spentAtCall: [], ledgered: 0, persisted: 0, waits: [], deps: undefined as unknown as GenDriverDeps };
  let lastWant = 0;
  let ids = 0;
  h.deps = {
    examCode: "TS_ICET",
    mode,
    buildParams: (_topic, want) => {
      lastWant = want;
      h.wants.push(want);
      return PARAMS;
    },
    context: async () => ({ fewShotBlock: "", avoidBlock: "", recentBodies: [] }),
    call: async () => {
      h.spentAtCall.push(journal.spentUsd);
      h.events.push("call");
      const next = replies.shift();
      if (next === undefined) throw new Error("test: no scripted reply left");
      if (next instanceof Error) throw next;
      return reply(typeof next === "function" ? next(lastWant) : next);
    },
    ledger: async () => {
      h.ledgered += 1;
      h.events.push("ledger");
    },
    save: async (topic, qs) => {
      h.saved.push({ topic: topic.code, n: qs.length });
      h.events.push("save");
      return qs.map(() => `id${++ids}`);
    },
    persist: mode.writes
      ? () => {
          h.persisted += 1;
          h.events.push("persist");
        }
      : undefined,
    log: () => {},
    warn: () => {},
    now: () => new Date("2026-09-30T06:30:00Z"),
    sleep: async (ms) => {
      h.waits.push(ms);
      h.events.push("wait");
    },
    ...over,
  };
  return h;
}

const topicMap = (...ts: GenTopicInput[]) => new Map(ts.map((x) => [x.id, x]));
const WRITE = (maxUsd: number): GenRunMode => ({ callsApi: true, maxUsd, writes: true });

describe("runGeneration — the ceiling", () => {
  it("stops BEFORE the call whose worst case would cross --max-usd; spend comes from each reply's usage", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 30 }), [t("q1", "quant.a")]);
    // call 1: 0 + WORST fits; call 2: CALL_USD + WORST fits; call 3: 2*CALL_USD + WORST does not.
    const maxUsd = 2 * CALL_USD + WORST - 0.001;
    const h = harness(j, WRITE(maxUsd), [questions(10), questions(10), questions(10)]);
    const r = await runGeneration(j, topicMap(t("q1", "quant.a")), h.deps);
    expect(h.spentAtCall).toHaveLength(2);
    for (const spent of h.spentAtCall) expect(spent + WORST).toBeLessThanOrEqual(maxUsd);
    expect(r.calls).toBe(2);
    expect(r.spentUsd).toBeCloseTo(2 * CALL_USD, 10);
    expect(j.spentUsd).toBeCloseTo(2 * CALL_USD, 10);
    expect(h.ledgered).toBe(2);
    expect(r.saved).toBe(20);
    expect(j.topics[0]).toMatchObject({ saved: 20, status: "pending", calls: 2 });
    expect(j.status).toBe("stopped");
    expect(j.lastStop?.reason).toBe("ceiling");
    expect(r.stop).toMatchObject({ reason: "ceiling", topicCode: "quant.a", remainingQuestions: 10, remainingCalls: 1, suggestedMaxUsd: 1 });
    expect(r.stop!.worstUsd).toBeCloseTo(WORST, 10);
    expect(r.stop!.message).toMatch(/the next call was NOT made/);
    expect(r.stop!.message).toMatch(/pass --max-usd 1 or more/);
  });

  it("a first call whose worst case alone is over the ceiling is never made", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 10 }), [t("q1")]);
    const h = harness(j, WRITE(WORST / 2), [questions(10)]);
    const r = await runGeneration(j, topicMap(t("q1")), h.deps);
    expect(h.spentAtCall).toHaveLength(0);
    expect(r.stop?.reason).toBe("ceiling");
    expect(j.spentUsd).toBe(0);
  });

  it("the ceiling reads the journal's spend across invocations, and retries are checked like any call", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 10, retry: 1 }), [t("q1")]);
    j.spentUsd = 0.5; // an earlier invocation
    // call 1 fits (0.5 + WORST); it is unusable and billed, so the retry (0.5 + CALL_USD + WORST) no longer fits.
    const h = harness(j, WRITE(0.5 + WORST + 0.001), ["not json at all"]);
    const r = await runGeneration(j, topicMap(t("q1")), h.deps);
    expect(r.calls).toBe(1);
    expect(h.ledgered).toBe(1);
    expect(j.spentUsd).toBeCloseTo(0.5 + CALL_USD, 10);
    expect(r.stop?.reason).toBe("ceiling");
    expect(j.topics[0].status).toBe("pending");
  });

  it("puts the spend on the journal and saves it before the ledger insert and before parsing", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 10 }), [t("q1")]);
    const h = harness(j, WRITE(5), [questions(10)]);
    await runGeneration(j, topicMap(t("q1")), h.deps);
    expect(h.events).toEqual(["call", "persist", "ledger", "save", "persist", "persist"]);
  });

  it("a failed ledger insert is not fatal and the spend still counts", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 10 }), [t("q1")]);
    const h = harness(j, WRITE(5), [questions(10)], {
      ledger: async () => {
        throw new Error("db down");
      },
    });
    const r = await runGeneration(j, topicMap(t("q1")), h.deps);
    expect(r.saved).toBe(10);
    expect(j.spentUsd).toBeCloseTo(CALL_USD, 10);
  });
});

describe("runGeneration — resume", () => {
  it("a resumed journal generates only what is missing, and finishes the run", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 30 }), [t("q1", "quant.a"), t("q2", "quant.b")]);
    j.status = "stopped";
    j.spentUsd = 0.066;
    j.topics[0].saved = 25; // stopped mid-topic
    j.topics[1].saved = 30;
    j.topics[1].status = "done";
    const h = harness(j, WRITE(1), [(want) => questions(want)]);
    const r = await runGeneration(j, topicMap(t("q1", "quant.a"), t("q2", "quant.b")), h.deps);
    expect(h.wants).toEqual([5]);
    expect(r.calls).toBe(1);
    expect(j.topics[0]).toMatchObject({ saved: 30, status: "done" });
    expect(j.topics[0].questionIds).toHaveLength(5);
    expect(j.status).toBe("done");
    expect(j.spentUsd).toBeCloseTo(0.066 + CALL_USD, 10);
    expect(r.stop).toBeUndefined();
  });

  it("a topic that left the exam is given up, not generated", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 10 }), [t("gone"), t("q1")]);
    const h = harness(j, WRITE(5), [questions(10)]);
    const r = await runGeneration(j, topicMap(t("q1")), h.deps);
    expect(j.topics[0]).toMatchObject({ status: "gave-up", note: "the topic is no longer in the exam" });
    expect(r.gaveUp).toEqual(["gone"]);
    expect(j.topics[1].status).toBe("done");
  });
});

describe("runGeneration — failures", () => {
  it("an API error stops the whole run with the topic still pending (an empty balance fails every topic alike)", async () => {
    const billing = Object.assign(new Error("400 credit balance"), {
      status: 400,
      error: { error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits." } },
    });
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 10 }), [t("q1", "quant.a"), t("q2", "quant.b")]);
    const contexts: string[] = [];
    const h = harness(j, WRITE(5), [billing], {
      context: async (topic) => {
        contexts.push(topic.code);
        return { fewShotBlock: "", avoidBlock: "", recentBodies: [] };
      },
    });
    const r = await runGeneration(j, topicMap(t("q1", "quant.a"), t("q2", "quant.b")), h.deps);
    expect(r.stop).toMatchObject({ reason: "api-error", topicCode: "quant.a", suggestedMaxUsd: 5, remainingQuestions: 20 });
    expect(r.stop!.message).toMatch(/BILLING ERROR/);
    expect(r.stop!.message).toMatch(/add credit first/);
    expect(contexts).toEqual(["quant.a"]);
    expect(j.topics.map((x) => x.status)).toEqual(["pending", "pending"]);
    expect(j.status).toBe("stopped");
    expect(h.ledgered).toBe(0);
  });

  it("a reply that stays unusable after its retries gives up on that topic only; every try is billed", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 10, retry: 1 }), [t("q1", "quant.a"), t("q2", "quant.b")]);
    const h = harness(j, WRITE(5), ["garbage", "{\"not\":\"array\"}", questions(10)]);
    const r = await runGeneration(j, topicMap(t("q1", "quant.a"), t("q2", "quant.b")), h.deps);
    expect(j.topics[0].status).toBe("gave-up");
    expect(j.topics[0].note).toMatch(/reply unusable after 2 tries/);
    expect(j.topics[1]).toMatchObject({ status: "done", saved: 10 });
    expect(r.gaveUp).toEqual(["quant.a"]);
    expect(r.calls).toBe(3);
    expect(h.ledgered).toBe(3);
    expect(j.spentUsd).toBeCloseTo(3 * CALL_USD, 10);
    expect(j.status).toBe("done");
  });

  it("drops invalid and duplicate stems (already on the topic, or twice in the run) and asks only for the shortfall", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 4, batchSize: 4 }), [t("q1")]);
    const dup = q("An old stem that is already on this topic?");
    const first = JSON.stringify([dup, q("A fresh stem number one here?"), { ...q("Broken stem without a key?"), answerKey: "Z" }, q("A fresh stem number one here?")]);
    const h = harness(j, WRITE(5), [first, (want) => questions(want)], {
      context: async () => ({ fewShotBlock: "", avoidBlock: "", recentBodies: [dup.body] }),
    });
    const r = await runGeneration(j, topicMap(t("q1")), h.deps);
    expect(h.wants).toEqual([4, 3]);
    expect(r.rejected).toBe(3);
    expect(j.topics[0]).toMatchObject({ saved: 4, rejected: 3, status: "done" });
    expect(h.saved).toEqual([{ topic: "q1", n: 1 }, { topic: "q1", n: 3 }]);
  });

  it("a batch with no usable question gives up on the topic", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 10 }), [t("q1")]);
    const h = harness(j, WRITE(5), [JSON.stringify([{ body: "short" }])]);
    const r = await runGeneration(j, topicMap(t("q1")), h.deps);
    expect(j.topics[0]).toMatchObject({ status: "gave-up", note: "a batch produced no usable question" });
    expect(r.saved).toBe(0);
  });
});

describe("runGeneration — which API errors stop the run (30 Sep 2026 review)", () => {
  const two = () => newGenJournal("r1", "TS_ICET", settings({ count: 10 }), [t("q1", "quant.a"), t("q2", "quant.b")]);
  const twoTopics = () => topicMap(t("q1", "quant.a"), t("q2", "quant.b"));

  it("a 429 or 529 is called again after 20 s, then 60 s; nothing billed or ledgered for the refusals", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 10 }), [t("q1")]);
    const h = harness(j, WRITE(5), [RATE_429(), OVERLOADED_529(), questions(10)]);
    const r = await runGeneration(j, topicMap(t("q1")), h.deps);
    expect(h.waits).toEqual([...GEN_TRANSIENT_WAITS_MS]);
    expect(h.waits).toEqual([20_000, 60_000]);
    expect(h.events.slice(0, 5)).toEqual(["call", "wait", "call", "wait", "call"]);
    expect(r.calls).toBe(1);
    expect(h.ledgered).toBe(1);
    expect(j.spentUsd).toBeCloseTo(CALL_USD, 10);
    expect(j.topics[0]).toMatchObject({ status: "done", saved: 10 });
    expect(r.stop).toBeUndefined();
  });

  it("a third 429/529 in a row stops the run like any API error, the topic still pending", async () => {
    const j = two();
    const h = harness(j, WRITE(5), [OVERLOADED_529(), OVERLOADED_529(), OVERLOADED_529()]);
    const r = await runGeneration(j, twoTopics(), h.deps);
    expect(h.spentAtCall).toHaveLength(3);
    expect(h.waits).toEqual([20_000, 60_000]);
    expect(r.stop).toMatchObject({ reason: "api-error", topicCode: "quant.a", suggestedMaxUsd: 5 });
    expect(j.topics.map((x) => x.status)).toEqual(["pending", "pending"]);
    expect(h.ledgered).toBe(0);
  });

  it("a 400 about one topic's request gives up that topic (no retry, nothing billed) and the run goes on", async () => {
    const j = two();
    const h = harness(j, WRITE(5), [PROMPT_400(), questions(10)]);
    const r = await runGeneration(j, twoTopics(), h.deps);
    expect(h.spentAtCall).toHaveLength(2); // one refused call for quant.a (retry 1 not used), one for quant.b
    expect(j.topics[0].status).toBe("gave-up");
    expect(j.topics[0].note).toMatch(/^the API refused this topic's request \(not billed\): FAILED · HTTP 400 · invalid_request_error: messages\.0\.content/);
    expect(j.topics[1]).toMatchObject({ status: "done", saved: 10 });
    expect(r.gaveUp).toEqual(["quant.a"]);
    expect(r.calls).toBe(1);
    expect(h.ledgered).toBe(1);
    expect(j.spentUsd).toBeCloseTo(CALL_USD, 10);
    expect(j.status).toBe("done");
    expect(r.stop).toBeUndefined();
  });

  it("a spend-limit 400 stops the run instead of giving up every topic in turn", async () => {
    const j = two();
    const h = harness(j, WRITE(5), [SPEND_LIMIT_400()]);
    const r = await runGeneration(j, twoTopics(), h.deps);
    expect(h.spentAtCall).toHaveLength(1);
    expect(r.stop).toMatchObject({ reason: "api-error", topicCode: "quant.a" });
    expect(r.stop!.message).toMatch(/usage limits/);
    expect(r.gaveUp).toEqual([]);
    expect(j.topics.map((x) => x.status)).toEqual(["pending", "pending"]);
    expect(j.status).toBe("stopped");
  });

  it("the same 400 on the next topic with no reply in between is about every request: stop, and both topics are pending again", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 10 }), [t("q1", "quant.a"), t("q2", "quant.b"), t("q3", "quant.c")]);
    j.topics[0].note = "saved count taken from the database (0) on resume";
    const h = harness(j, WRITE(5), [PROMPT_400(), PROMPT_400()]);
    const r = await runGeneration(j, topicMap(t("q1", "quant.a"), t("q2", "quant.b"), t("q3", "quant.c")), h.deps);
    expect(h.spentAtCall).toHaveLength(2);
    expect(r.stop).toMatchObject({ reason: "api-error", topicCode: "quant.b", remainingQuestions: 30, suggestedMaxUsd: 5 });
    expect(r.stop!.message).toMatch(/right after refusing quant\.a the same way/);
    expect(r.stop!.message).toMatch(/quant\.a is pending again/);
    expect(r.gaveUp).toEqual([]);
    expect(j.topics.map((x) => x.status)).toEqual(["pending", "pending", "pending"]);
    expect(j.topics[0].note).toBe("saved count taken from the database (0) on resume");
    expect(j.status).toBe("stopped");
  });

  it("a reply in between resets the count: refused, answered, refused gives up two topics and finishes", async () => {
    const j = newGenJournal("r1", "TS_ICET", settings({ count: 10 }), [t("q1", "quant.a"), t("q2", "quant.b"), t("q3", "quant.c")]);
    const h = harness(j, WRITE(5), [PROMPT_400(), questions(10), PROMPT_400()]);
    const r = await runGeneration(j, topicMap(t("q1", "quant.a"), t("q2", "quant.b"), t("q3", "quant.c")), h.deps);
    expect(r.stop).toBeUndefined();
    expect(r.gaveUp).toEqual(["quant.a", "quant.c"]);
    expect(j.topics.map((x) => x.status)).toEqual(["gave-up", "done", "gave-up"]);
    expect(j.status).toBe("done");
  });

  it("genCrashResumeHint: a writing run that dies on a database error prints its resume command", () => {
    const file = path.join(GEN_JOURNAL_DIR, "20260930-120000-gen-TS_ICET.json");
    const hint = genCrashResumeHint(WRITE(4), file, true);
    expect(hint).toMatch(/holds the spend and every batch saved so far/);
    expect(hint).toContain("scripts/generate-questions.ts --resume 20260930-120000-gen-TS_ICET --max-usd 4 --allow-shared-key");
    expect(genCrashResumeHint({ callsApi: true, maxUsd: 1, writes: false }, null, false)).toBeNull();
    expect(genCrashResumeHint(WRITE(4), null, false)).toBeNull();
  });
});

describe("runGeneration — dry runs and refusals", () => {
  it("an AI dry run makes one billed call per topic, saves nothing and persists nothing", async () => {
    const j = newGenJournal("dry", "TS_ICET", settings({ count: 30 }), [t("q1"), t("q2")]);
    const h = harness(j, { callsApi: true, maxUsd: 1, writes: false }, [questions(10), questions(10)]);
    const r = await runGeneration(j, topicMap(t("q1"), t("q2")), h.deps);
    expect(r.calls).toBe(2);
    expect(h.ledgered).toBe(2);
    expect(h.saved).toEqual([]);
    expect(h.persisted).toBe(0);
    expect(j.topics.map((x) => x.status)).toEqual(["pending", "pending"]);
    expect(j.status).toBe("running");
  });

  it("--no-ai --dry-run never calls the model", async () => {
    const j = newGenJournal("dry", "TS_ICET", settings({ count: 3 }), [t("q1")]);
    const h = harness(j, { callsApi: false, maxUsd: null, writes: false }, []);
    const r = await runGeneration(j, topicMap(t("q1")), h.deps);
    expect(h.spentAtCall).toHaveLength(0);
    expect(r.accepted).toBe(3);
    expect(r.spentUsd).toBe(0);
  });

  it("refuses to run without a ceiling, a stub run that writes, or a writing run without a journal", async () => {
    const j = newGenJournal("r", "X", settings(), [t("q1")]);
    await expect(runGeneration(j, topicMap(t("q1")), harness(j, { callsApi: true, maxUsd: null, writes: true }, []).deps)).rejects.toThrow(/needs a finite --max-usd/);
    await expect(runGeneration(j, topicMap(t("q1")), harness(j, { callsApi: true, maxUsd: 0, writes: true }, []).deps)).rejects.toThrow(/needs a finite --max-usd/);
    await expect(runGeneration(j, topicMap(t("q1")), harness(j, { callsApi: false, maxUsd: null, writes: true }, []).deps)).rejects.toThrow(/--no-ai needs --dry-run/);
    await expect(runGeneration(j, topicMap(t("q1")), harness(j, WRITE(1), [], { persist: undefined }).deps)).rejects.toThrow(/needs its journal saved/);
  });

  it("ledgers under the state-depth feature name", () => {
    expect(GEN_LEDGER_FEATURE).toBe("state-depth-gen");
  });
});
