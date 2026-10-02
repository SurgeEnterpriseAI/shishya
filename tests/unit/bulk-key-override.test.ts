// Tests for the founder's 30 Sep 2026 decisions in src/lib/ai/batch.ts,
// which scripts/verify-question-bank.ts (and scripts/generate-questions.ts
// for the key) now use:
//   • resolveBulkKey: the separate ANTHROPIC_BULK_API_KEY when set, else the
//     shared ANTHROPIC_API_KEY ONLY with an explicit --allow-shared-key.
//     Without the flag the shared key is still refused, as since 15 Sep 2026.
//   • --founder-manages-credits: a runner that opts in accepts it in place of
//     --i-confirm-auto-reload, with a statement that says auto-reload was NOT
//     checked. --max-usd stays required, and passing both flags is refused.
//   • 2 Oct 2026 (review): scripts/school-content-batch.ts opts in too. The
//     founder does not use auto-reload, so its only way to run or resume was
//     to print "auto-reload is ON" (false) above the pre-flight's "not
//     reloaded automatically". Pinned from the script's source.
// No network, no database.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: { aiUsage: { create: () => Promise.resolve({}) } } }));
vi.mock("next/server", () => ({
  after: () => {
    throw new Error("after() called outside a request scope");
  },
}));

import {
  ALLOW_SHARED_KEY_FLAG,
  BULK_KEY_ENV,
  CONFIRM_AUTO_RELOAD_FLAG,
  CONFIRM_AUTO_RELOAD_STATEMENT,
  DEFAULT_CHUNK,
  FOUNDER_CREDITS_FLAG,
  FOUNDER_CREDITS_STATEMENT,
  PRODUCTION_KEY_ENV,
  ackFlag,
  assertBulkKey,
  batchesApiFor,
  guardFlags,
  guardStatement,
  resolveBulkKey,
} from "@/lib/ai/batch";

const BULK = "test-bulk-not-a-real-key";
const SHARED = "test-shared-not-a-real-key";

describe("resolveBulkKey", () => {
  it("uses the separate bulk key whenever it is set, flag or no flag", () => {
    const env = { [BULK_KEY_ENV]: BULK, [PRODUCTION_KEY_ENV]: SHARED };
    expect(resolveBulkKey(env, false)).toEqual({ key: BULK, env: BULK_KEY_ENV, shared: false });
    expect(resolveBulkKey(env, true)).toEqual({ key: BULK, env: BULK_KEY_ENV, shared: false });
  });

  it("still refuses the shared key without the flag, and names the flag", () => {
    const env = { [PRODUCTION_KEY_ENV]: SHARED };
    expect(() => resolveBulkKey(env, false)).toThrow(/ANTHROPIC_BULK_API_KEY is not set: bulk jobs must not run on the shared ANTHROPIC_API_KEY/);
    expect(() => resolveBulkKey(env, false)).toThrow(/pass --allow-shared-key/);
    expect(() => resolveBulkKey({ [BULK_KEY_ENV]: "" , [PRODUCTION_KEY_ENV]: SHARED }, false)).toThrow(/is not set/);
  });

  it("with --allow-shared-key, runs on the shared key and says so", () => {
    expect(ALLOW_SHARED_KEY_FLAG).toBe("--allow-shared-key");
    expect(resolveBulkKey({ [PRODUCTION_KEY_ENV]: SHARED }, true)).toEqual({ key: SHARED, env: PRODUCTION_KEY_ENV, shared: true });
    expect(() => resolveBulkKey({}, true)).toThrow(/--allow-shared-key was passed, but neither ANTHROPIC_BULK_API_KEY nor ANTHROPIC_API_KEY is set/);
  });

  it("assertBulkKey reads process.env the same way; its default still refuses the shared key", () => {
    const saved = { bulk: process.env[BULK_KEY_ENV], shared: process.env[PRODUCTION_KEY_ENV] };
    try {
      delete process.env[BULK_KEY_ENV];
      process.env[PRODUCTION_KEY_ENV] = SHARED;
      expect(() => assertBulkKey()).toThrow(/ANTHROPIC_BULK_API_KEY is not set/);
      expect(assertBulkKey({ allowSharedKey: true })).toBe(SHARED);
      process.env[BULK_KEY_ENV] = BULK;
      expect(assertBulkKey({ allowSharedKey: true })).toBe(BULK);
    } finally {
      if (saved.bulk === undefined) delete process.env[BULK_KEY_ENV];
      else process.env[BULK_KEY_ENV] = saved.bulk;
      if (saved.shared === undefined) delete process.env[PRODUCTION_KEY_ENV];
      else process.env[PRODUCTION_KEY_ENV] = saved.shared;
    }
  });

  it("batchesApiFor builds the Batches client on the resolved key without calling the network", () => {
    const api = batchesApiFor(SHARED);
    for (const m of ["create", "retrieve", "results", "list"] as const) expect(typeof api[m]).toBe("function");
  });
});

describe("--founder-manages-credits (opt-in per runner)", () => {
  const FOUNDER = { founderCreditsAck: true };

  it("a runner that has not opted in still needs --i-confirm-auto-reload (the default of guardFlags is unchanged)", () => {
    expect(() => guardFlags(["--apply", "--max-usd", "5", FOUNDER_CREDITS_FLAG], true)).toThrow(/--apply needs --i-confirm-auto-reload\./);
    expect(guardFlags(["--max-usd", "5", FOUNDER_CREDITS_FLAG], false).confirmed).toBe(false);
    expect(guardStatement([FOUNDER_CREDITS_FLAG])).toBeNull();
    expect(ackFlag([FOUNDER_CREDITS_FLAG])).toBe(CONFIRM_AUTO_RELOAD_FLAG);
  });

  it("an opted-in runner accepts it in place of the auto-reload flag; the ceiling is still required", () => {
    expect(guardFlags(["--apply", "--max-usd", "5", FOUNDER_CREDITS_FLAG], true, FOUNDER)).toEqual({ maxUsd: 5, chunkSize: DEFAULT_CHUNK, confirmed: true });
    expect(guardFlags(["--apply", "--max-usd", "5", CONFIRM_AUTO_RELOAD_FLAG], true, FOUNDER)).toEqual({ maxUsd: 5, chunkSize: DEFAULT_CHUNK, confirmed: true });
    expect(() => guardFlags(["--apply", FOUNDER_CREDITS_FLAG], true, FOUNDER)).toThrow(/--apply needs --max-usd/);
    expect(() => guardFlags(["--apply", "--max-usd", "5"], true, FOUNDER)).toThrow(/--apply needs --i-confirm-auto-reload or --founder-manages-credits/);
  });

  it("refuses both flags together: one says auto-reload is ON, the other that nobody checked", () => {
    expect(() => guardFlags(["--max-usd", "5", CONFIRM_AUTO_RELOAD_FLAG, FOUNDER_CREDITS_FLAG], true, FOUNDER)).toThrow(/not both/);
    expect(() => guardFlags([CONFIRM_AUTO_RELOAD_FLAG, FOUNDER_CREDITS_FLAG], false, FOUNDER)).toThrow(/not both/);
  });

  it("prints the statement that matches the flag, and never claims auto-reload for the founder flag", () => {
    expect(guardStatement([CONFIRM_AUTO_RELOAD_FLAG], FOUNDER)).toBe(CONFIRM_AUTO_RELOAD_STATEMENT);
    expect(guardStatement([FOUNDER_CREDITS_FLAG], FOUNDER)).toBe(FOUNDER_CREDITS_STATEMENT);
    expect(FOUNDER_CREDITS_STATEMENT).toMatch(/auto-reload was NOT checked/);
    expect(FOUNDER_CREDITS_STATEMENT).not.toMatch(/auto-reload is ON/);
    expect(guardStatement([], FOUNDER)).toBeNull();
  });

  it("the printed continue command echoes the flag the operator passed", () => {
    expect(ackFlag([FOUNDER_CREDITS_FLAG], FOUNDER)).toBe(FOUNDER_CREDITS_FLAG);
    expect(ackFlag([CONFIRM_AUTO_RELOAD_FLAG], FOUNDER)).toBe(CONFIRM_AUTO_RELOAD_FLAG);
  });

  it("a dry run (neither flag) prints the founder flag on an opted-in runner, never the auto-reload claim", () => {
    // 30 Sep 2026: dry run → paste the printed continue command is the
    // plan's flow; defaulting to --i-confirm-auto-reload there made the
    // operator print "auto-reload is ON", which nobody checks any more.
    expect(ackFlag([], FOUNDER)).toBe(FOUNDER_CREDITS_FLAG);
    expect(ackFlag(["--exams", "TS_ICET", "--dry-run"], FOUNDER)).toBe(FOUNDER_CREDITS_FLAG);
    expect(ackFlag([])).toBe(CONFIRM_AUTO_RELOAD_FLAG);
    expect(ackFlag([], { founderCreditsAck: false })).toBe(CONFIRM_AUTO_RELOAD_FLAG);
  });
});

// 2 Oct 2026 (review). The founder tops the credit up by hand and does not
// use auto-reload. school-content-batch.ts required --i-confirm-auto-reload
// and printed "auto-reload is ON" directly above the pre-flight line that
// says the balance "is not reloaded automatically" — so a run or a resume
// could only start by printing a statement that is false.
describe("both batch runners take --founder-manages-credits (2 Oct 2026)", () => {
  const read = (name: string) => fs.readFileSync(path.join(process.cwd(), "scripts", name), "utf8");
  const RUNNERS = ["verify-question-bank.ts", "school-content-batch.ts"];

  it("each opts in, and reads its flags, its printed statement and its continue commands through the opt-in", () => {
    for (const name of RUNNERS) {
      const src = read(name);
      expect(src, name).toContain("const GUARD_OPTS: GuardFlagOpts = { founderCreditsAck: true };");
      expect(src, name).toContain("const flags = guardFlags(process.argv, !DRY, GUARD_OPTS);");
      expect(src, name).not.toMatch(/guardFlags\(process\.argv, !DRY\)/);
      expect(src, name).toContain("console.log(`   ${guardStatement(process.argv, GUARD_OPTS)}`);");
      expect(src, name).toContain("${ackFlag(process.argv, GUARD_OPTS)}");
    }
  });

  it("school-content-batch.ts never prints the auto-reload claim or flag by itself any more", () => {
    const src = read("school-content-batch.ts");
    const code = src
      .split(/\r?\n/)
      .filter((l) => !l.trim().startsWith("//"))
      .join("\n");
    expect(code).not.toContain("CONFIRM_AUTO_RELOAD_STATEMENT");
    expect(code).not.toContain("CONFIRM_AUTO_RELOAD_FLAG");
    // The statement is printed before the pre-flight line and the probe, as before.
    const at = src.indexOf("console.log(`   ${guardStatement(process.argv, GUARD_OPTS)}`);");
    expect(at).toBeGreaterThan(-1);
    expect(at).toBeLessThan(src.indexOf('bulkPreflight({ script: "school-content-batch.ts", maxUsd });'));
  });

  it("what an opted-in run prints: the true statement with the founder flag, the claim only when the operator made it", () => {
    const FOUNDER = { founderCreditsAck: true };
    const founderRun = ["--resume", "r1", "--apply", "--max-usd", "25", FOUNDER_CREDITS_FLAG];
    expect(guardFlags(founderRun, true, FOUNDER)).toEqual({ maxUsd: 25, chunkSize: DEFAULT_CHUNK, confirmed: true });
    expect(guardStatement(founderRun, FOUNDER)).toBe(FOUNDER_CREDITS_STATEMENT);
    expect(guardStatement(founderRun, FOUNDER)).not.toMatch(/auto-reload is ON/);
    // A dry run's printed continue command carries the founder flag.
    expect(ackFlag(["--exams", "NCERT_C09"], FOUNDER)).toBe(FOUNDER_CREDITS_FLAG);
    // The cap is still required with it.
    expect(() => guardFlags(["--apply", FOUNDER_CREDITS_FLAG], true, FOUNDER)).toThrow(/--apply needs --max-usd/);
    // An operator who did check may still say so.
    expect(guardStatement(["--apply", "--max-usd", "25", CONFIRM_AUTO_RELOAD_FLAG], FOUNDER)).toBe(CONFIRM_AUTO_RELOAD_STATEMENT);
  });
});
