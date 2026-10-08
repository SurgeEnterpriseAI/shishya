// Every scheduled AI call asks the background spend guard; no student path
// does (7 Oct 2026, src/lib/ai/spend-guard.ts).
//
// The guard only helps if the crons use it, with the right label, and stop at
// the first empty-balance failure. Checked here: the wiring in each cron
// (source), the labels a call writes, and two loops that used to keep calling
// a dry account (demand mining split a failed batch down to single items:
// 2N - 1 calls; the exam-week page writer booked an empty balance as "no
// real article" and backed the page off for days). No DB, no model call.

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ create: vi.fn(), recordAiUsage: vi.fn(() => 0) }));
vi.mock("@/lib/ai/client", () => ({ anthropic: { messages: { create: h.create } }, MODEL: "claude-sonnet-4-5" }));
vi.mock("@/lib/ai/usage", () => ({ recordAiUsage: h.recordAiUsage, recordAiUsageAwaited: vi.fn(async () => 0), pendingUsageUsd: () => 0 }));
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import Anthropic from "@anthropic-ai/sdk";
import { BACKGROUND_CAPS } from "@/lib/ai/spend-guard";
import { mineDemand, type MineGate } from "@/lib/demand-mine";
import { summarisePhase } from "@/lib/ai/phase-summariser";
import { classifyTutorFailure } from "@/lib/ai/tutor-failure";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");

const creditError = () =>
  Anthropic.APIError.generate(
    400,
    { type: "error", error: { type: "invalid_request_error", message: "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits." } },
    "credit",
    {} as any,
  );
const overloaded = () => Anthropic.APIError.generate(529, { type: "error", error: { type: "overloaded_error", message: "Overloaded" } }, "Overloaded", {} as any);

describe("each cron asks the guard before its model calls, with its own label", () => {
  // [file that holds the call, labels it asks for, file that creates the guard]
  const WIRED: Array<[string, string[], string]> = [
    ["src/lib/exam-refresh-run.ts", ["exam-info", "exam-info-other"], "src/app/api/cron/refresh-exam-data/route.ts"],
    ["src/lib/exam-refresh-run.ts", ["exam-info"], "src/app/api/cron/refresh-exam-data/today-pm/route.ts"],
    ["src/lib/refresh-phase-articles.ts", ["phase-article-today", "phase-article"], "src/app/api/cron/refresh-phase-articles/route.ts"],
    ["src/app/api/cron/daily-brief/route.ts", ["daily-brief"], "src/app/api/cron/daily-brief/route.ts"],
    ["src/app/api/cron/coach-day/route.ts", ["coach-day"], "src/app/api/cron/coach-day/route.ts"],
    ["src/app/api/cron/daily-current-affairs/route.ts", ["current-affairs"], "src/app/api/cron/daily-current-affairs/route.ts"],
    ["src/app/api/cron/refresh-vacancies/route.ts", ["vacancies"], "src/app/api/cron/refresh-vacancies/route.ts"],
    ["src/app/api/cron/refresh-rank-bands/route.ts", ["rank-bands"], "src/app/api/cron/refresh-rank-bands/route.ts"],
    ["src/lib/answer-key-watch-run.ts", ["akr-plan", "akr-check"], "src/lib/answer-key-watch-run.ts"],
    ["src/app/api/cron/demand-mine/route.ts", ["demand-mine"], "src/app/api/cron/demand-mine/route.ts"],
    ["src/lib/results-extract.ts", ["results-extract"], "src/app/api/cron/extract-results/route.ts"],
    ["src/lib/question-sweep.ts", ["question-adjudicate"], "src/app/api/cron/sweep-question-reports/route.ts"],
  ];

  it.each(WIRED)("%s asks for %j (guard made in %s)", (file, labels, maker) => {
    const src = read(file);
    for (const l of labels) {
      expect(src, l).toContain(`"${l}"`);
      expect(BACKGROUND_CAPS[l], l).toBeDefined();
    }
    expect(src).toMatch(/\.allow\(/);
    expect(src).toMatch(/noteFailure\(|failed: \(err\) => guard\.noteFailure/);
    expect(read(maker)).toContain("createSpendGuard()");
  });

  it("every label a cron passes to guard.allow is a background job", () => {
    const files = WIRED.map(([f]) => f);
    for (const f of files) {
      for (const m of read(f).matchAll(/\.allow\("([a-z-]+)"\)/g)) expect(BACKGROUND_CAPS[m[1]], `${f}: ${m[1]}`).toBeDefined();
    }
  });

  it("the labels reach the ledger: exam news and exam-week pages write the label the guard caps", () => {
    expect(read("src/lib/exam-refresh-run.ts")).toContain("{ useWebSearch: true, usageFeature: feature }");
    expect(read("src/lib/ai/exam-info.ts")).toContain('recordAiUsage(opts.usageFeature ?? "exam-info"');
    expect(read("src/lib/refresh-phase-articles.ts")).toMatch(/usageFeature,\n\s+\}\);/);
    expect(read("src/lib/ai/answer-key-check.ts")).toContain('opts.usageFeature ?? "akr-check"');
  });
});

describe("student paths never touch the guard", () => {
  const STUDENT = [
    "src/app/api/chat/route.ts",
    "src/app/api/explain/route.ts",
    "src/app/api/ask/route.ts",
    "src/app/api/mocks/route.ts",
    "src/app/api/mocks/fresh/route.ts",
    "src/app/api/mocks/[id]/translate/route.ts",
    "src/app/api/attempts/[id]/translate/route.ts",
    "src/app/api/descriptive/route.ts",
    "src/app/api/coach/rebuild/route.ts",
    "src/app/api/cron/tutor-answer-later/route.ts",
    "src/lib/tutor-late-answer.ts",
    "src/lib/ai/tutor.ts",
    "src/lib/ai/translator.ts",
    "src/lib/ai/explainer.ts",
    "src/lib/ask-engine.ts",
  ];
  it.each(STUDENT)("%s does not import the spend guard", (f) => {
    expect(read(f)).not.toContain('from "@/lib/ai/spend-guard"');
  });

  it("the teacher-request SLA answer is a reply a student is owed: never held, but it stops at an empty balance", () => {
    const src = read("src/app/api/cron/teacher-request-sla/route.ts");
    expect(src).not.toContain('from "@/lib/ai/spend-guard"');
    expect(src).toContain('if (classifyTutorFailure(e) === "credit") break;');
  });
});

describe("demand mining stops at the first empty-balance failure", () => {
  const ITEMS = ["please add marathi mocks", "need pyq pdf for tnpsc", "telugu notes please", "more bank mocks", "app is slow on my phone", "add a dark mode"];
  const db = {
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) =>
      strings.join("?").includes('"ChatMessage"')
        ? ITEMS.map((content, i) => ({ id: `m${i}`, content, createdAt: new Date("2026-10-06T10:00:00Z"), examCode: null }))
        : [],
    ),
    $executeRaw: vi.fn(async () => 1),
  };
  const since = new Date("2026-10-05T18:30:00Z");
  const until = new Date("2026-10-06T20:30:00Z");

  beforeEach(() => {
    h.create.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("without the guard (a script) a dry account still gets the old split-and-retry", async () => {
    h.create.mockRejectedValue(creditError());
    const out = await mineDemand(db as any, since, until);
    expect(h.create).toHaveBeenCalledTimes(2 * ITEMS.length - 1);
    expect(out.errors).toBe(ITEMS.length);
  });

  it("with the cron's gate: one call, then stop — no split, no item counted as a classifier failure", async () => {
    h.create.mockRejectedValue(creditError());
    const failed = vi.fn(async (err: unknown) => classifyTutorFailure(err) === "credit");
    const gate: MineGate = { allow: vi.fn(async () => true), failed };
    const out = await mineDemand(db as any, since, until, gate);
    expect(h.create).toHaveBeenCalledTimes(1);
    expect(failed).toHaveBeenCalledTimes(1);
    expect(out).toMatchObject({ scanned: ITEMS.length, errors: 0, stopped: "credit" });
  });

  it("a held night makes no call", async () => {
    const gate: MineGate = { allow: vi.fn(async () => false), failed: vi.fn(async () => false) };
    const out = await mineDemand(db as any, since, until, gate);
    expect(h.create).not.toHaveBeenCalled();
    expect(out.stopped).toBe("held");
  });

  it("a non-credit failure still splits and retries (an overloaded API is not an empty balance)", async () => {
    h.create.mockRejectedValue(overloaded());
    const gate: MineGate = { allow: vi.fn(async () => true), failed: vi.fn(async (err: unknown) => classifyTutorFailure(err) === "credit") };
    await mineDemand(db as any, since, until, gate);
    expect(h.create).toHaveBeenCalledTimes(2 * ITEMS.length - 1);
  });
});

describe("exam-week pages: an empty balance is not 'no real article'", () => {
  const input = { examShortName: "SSC CGL", examName: "SSC Combined Graduate Level", examCode: "SSC_CGL", phase: "REACTIONS" as const, snippets: [] };

  beforeEach(() => {
    h.create.mockReset();
    h.recordAiUsage.mockClear();
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "info").mockImplementation(() => {});
  });

  it("the summariser rethrows an empty balance (the caller books no failed attempt and stops)", async () => {
    h.create.mockRejectedValue(creditError());
    await expect(summarisePhase(input)).rejects.toMatchObject({ status: 400 });
  });

  it("any other failure is still a null article", async () => {
    h.create.mockRejectedValue(overloaded());
    await expect(summarisePhase(input)).resolves.toBeNull();
  });

  it("an exam sitting today writes the must-run label; any other page the old one", async () => {
    h.create.mockResolvedValue({ content: [{ type: "text", text: "nothing found" }], usage: { input_tokens: 1, output_tokens: 1 } });
    await summarisePhase({ ...input, usageFeature: "phase-article-today" });
    await summarisePhase(input);
    expect(h.recordAiUsage.mock.calls.map((c) => (c as unknown[])[0])).toEqual(["phase-article-today-web", "phase-article-web"]);
  });
});
