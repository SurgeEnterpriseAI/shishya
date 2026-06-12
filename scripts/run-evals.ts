// Eval harness — regression tests for the AI system against golden datasets.
//
//   npm run evals                # run the factory firewall suite (needs ANTHROPIC_API_KEY)
//   npm run evals -- --list     # list golden items without calling the API
//
// Run this after ANY change to factory prompts, gate thresholds, or model
// routing. The trap items (BAD_KEY / BROKEN) are the safety net: if even one
// slips through as ACCEPT, the firewall has regressed and the run fails.
//
// Pass criteria:
//   BAD_KEY  → must NOT be accepted with the wrong key. Pass = REJECT, or
//              REVIEW with the key corrected to the known right answer.
//   BROKEN   → must NOT be accepted. Pass = REJECT or REVIEW.
//   SOUND    → should survive (ACCEPT or REVIEW) with its key intact.
//              Threshold: ≥75% (an over-strict firewall is also a bug —
//              it wastes SME time and blocks the content pipeline).

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { verifyCandidates } from "../src/lib/ai/factory";
import type { CandidateQuestion, GateDecision } from "../src/lib/ai/factory";

interface GoldenItem {
  id: string;
  expect: "SOUND" | "BAD_KEY" | "BROKEN";
  correctKey?: string;
  candidate: CandidateQuestion;
}

interface GoldenFile {
  description: string;
  items: GoldenItem[];
}

const SOUND_PASS_THRESHOLD = 0.75;

async function main() {
  const listOnly = process.argv.includes("--list");
  const goldenPath = join(__dirname, "..", "evals", "golden", "factory-golden.json");
  const golden = JSON.parse(readFileSync(goldenPath, "utf8")) as GoldenFile;

  console.log(`Factory firewall eval — ${golden.items.length} golden items`);
  if (listOnly) {
    for (const item of golden.items) console.log(`  [${item.expect}] ${item.id}`);
    return;
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not set. Use --list to inspect goldens without spending.");
  }

  const result = await verifyCandidates(
    golden.items.map((g) => g.candidate),
    ["eval:factory-golden"],
  );

  // decisions[] is in input order; map back to golden items.
  let trapsCaught = 0;
  let trapsTotal = 0;
  let soundPassed = 0;
  let soundTotal = 0;
  const failures: string[] = [];

  for (let i = 0; i < golden.items.length; i++) {
    const g = golden.items[i];
    const d = result.decisions[i];
    const decision = d.decision as GateDecision | "REJECT";
    const finalKey = d.question?.finalAnswerKey ?? null;

    let pass: boolean;
    if (g.expect === "SOUND") {
      soundTotal++;
      pass = decision !== "REJECT" && finalKey === g.candidate.answerKey;
      if (pass) soundPassed++;
    } else if (g.expect === "BAD_KEY") {
      trapsTotal++;
      const caught =
        decision === "REJECT" ||
        (decision === "REVIEW" && g.correctKey != null && finalKey === g.correctKey);
      pass = caught;
      if (caught) trapsCaught++;
    } else {
      // BROKEN
      trapsTotal++;
      const caught = decision !== "ACCEPT";
      pass = caught;
      if (caught) trapsCaught++;
    }

    const verdict = d.question?.provenance.verify.verdict ?? "—";
    console.log(
      `  ${pass ? "✓" : "✗"} [${g.expect}] ${g.id} → ${decision} (verdict ${verdict}${finalKey ? `, key ${finalKey}` : ""})`,
    );
    if (!pass) failures.push(g.id);
  }

  const soundRate = soundTotal ? soundPassed / soundTotal : 1;
  const trapRate = trapsTotal ? trapsCaught / trapsTotal : 1;

  console.log("\n──────── Summary ────────");
  console.log(`  Traps caught:  ${trapsCaught}/${trapsTotal} (${(trapRate * 100).toFixed(0)}%) — must be 100%`);
  console.log(`  Sound passed:  ${soundPassed}/${soundTotal} (${(soundRate * 100).toFixed(0)}%) — must be ≥${SOUND_PASS_THRESHOLD * 100}%`);
  console.log(`  Eval cost:     ~$${result.stats.costUsd.toFixed(4)}`);

  const ok = trapRate === 1 && soundRate >= SOUND_PASS_THRESHOLD;
  if (!ok) {
    console.error(`\n❌ EVAL FAILED. Failing items: ${failures.join(", ")}`);
    process.exit(1);
  }
  console.log("\n✓ Firewall eval passed.");
}

main().catch((err) => {
  console.error("❌ eval run failed:", err.message ?? err);
  process.exit(1);
});
