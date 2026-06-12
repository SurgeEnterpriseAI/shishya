# Content factory — verified question generation

The factory is the **reliability spine** of Shishya's domain AI system. Its job:
turn raw candidate questions into *trustworthy* ones before any student sees
them, and record **provenance** on every question so a student (and an SME) can
trust the bank.

A plain LLM wrapper does this:

```
generate → save (unverified)
```

The factory does this:

```
generate (grounded) → solve BLIND ×N (self-consistency) → adjudicate (strong model) → gate → persist with provenance
```

## Why each stage exists

| Stage | Model tier | What it guards against |
|-------|-----------|------------------------|
| **Generate** | standard (Sonnet) | Off-syllabus or low-quality items — prompt is *grounded* in the topic's `syllabusText` + curated `notes`, not the model's memory |
| **Solve blind** | strong (Opus) | A confidently-wrong answer key. The solver never sees the claimed key; it reasons the problem independently, N times. Disagreement across runs = shaky item |
| **Adjudicate** | strong (Opus) | Ambiguous / flawed / mis-keyed items. The verifier sees the candidate + the author's claim + the blind-solve distribution and rules CORRECT / MISMATCH / AMBIGUOUS / FLAWED, and re-estimates difficulty |
| **Gate** | pure code | Inconsistent acceptance. Deterministic, unit-tested decision: ACCEPT / REVIEW / REJECT |

This is the **verification firewall**: a stronger model independently checks a
standard model's work, and a human only sees what survives.

## Gate policy (`gate.ts`, pure + tested)

- `FLAWED` → **REJECT** (always)
- `AMBIGUOUS` → **REVIEW** (humans make judgement calls, not the machine)
- `MISMATCH` → **REVIEW** if solver+verifier agree on the real key (we store the
  corrected key for a human to confirm), else **REJECT**
- `CORRECT` → **ACCEPT** only if solver agreement ≥ `minAgreement` (0.66),
  verifier confidence ≥ `minVerifyConfidence` (0.8), and the blind solver
  independently landed on the verified key; otherwise **REVIEW**

By default even `ACCEPT` is written `validated: false` (SME queue) — the machine
*narrows* the human queue. Flip `autoValidateOnAccept` per-exam by stakes.

## Provenance

Every persisted question carries a `QuestionProvenance` blob in
`Question.metadata`: the models used, the blind-solve distribution + agreement,
the verifier's verdict/confidence/rationale/issues, the gate decision + reasons,
and the authoritative sources the generation was grounded in. This is what makes
the bank auditable and feeds the eval/flywheel layer later.

## Usage

```ts
import { runFactory, verifyCandidates } from "@/lib/ai/factory";

// generate grounded + verify in one shot
const result = await runFactory(genArgs, { minVerifyConfidence: 0.85 });

// or verify candidates from any source (PYQ ingestion, SME drafts, etc.)
const result = await verifyCandidates(candidates, ["pyq:SSC_CGL:2023"]);

result.questions; // ACCEPT + REVIEW items, each with provenance
result.stats;     // generated / accepted / needsReview / rejected / costUsd / byVerdict
```

`scripts/generate-questions.ts --verify` runs the full factory instead of the
legacy single-pass path.

## Where this fits

This is **Phase 1** of the domain AI architecture. It is reused by:
- **Knowledge base (RAG)** — same grounding pattern, extended to external
  authoritative sources via pgvector.
- **Student model / adaptive engine** — the verifier's re-estimated difficulty
  seeds item calibration; real attempt data refines it.
- **Eval harness** — rejected/disputed items become regression cases; student
  flags re-enter here as the data flywheel.
