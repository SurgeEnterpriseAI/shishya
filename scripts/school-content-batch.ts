// scripts/school-content-batch.ts
//
// Writes Shishya's OWN study notes and practice MCQs for NCERT chapters
// (26 Sep 2026: the first school slice — Classes 6-10, Mathematics and
// Science, 124 chapters seeded by scripts/seed-school-spine.ts), through the
// Message Batches API at half price, modelled on scripts/verify-question-bank.ts.
//
//   Phase N  one notes request per chapter        custom_id notes_<topicId>
//            → TopicTeachingNote (generatedBy "school-batch:<model>", a
//              provenance comment in the markdown)
//   Phase G  four 10-question MCQ requests per     custom_id gen_<topicId>_<set>
//            chapter (16 EASY / 16 MEDIUM / 8 HARD over the four sets),
//            grounded in the chapter identity + OUR notes from Phase N
//            → Question rows, validated:false, source AI_GENERATED, tags
//              [<chapter code>, "school", "gen:<date>"], metadata.provenance
//   Phase V  NOT here. The answer-check firewall is scripts/verify-question-bank.ts
//            (--exams NCERT_C06 --scope unvalidated, ONE exam per run): it
//            selects rows by exam code alone (rowsForExam: `x.code = …`, no
//            REAL_EXAM_SQL — checked 26 Sep 2026), so it needs no school
//            flag. One exam per run because its run id joins several codes
//            with "+", which journalPath() refuses (that script is mid-run on
//            the full bank and is not touched; 26 Sep 2026 review). Only its
//            ACCEPT flips validated; the exam rows stay inactive regardless.
//
// The founder's rules for school content are applied here and in
// src/lib/school/content-prompts.ts / content-parse.ts / content-plan.ts:
//   (1) the official textbook is LINKED, never copied: the model gets the
//       chapter identity (class, subject, book, chapter number and title,
//       the official PDF URL) and nothing from the book; the copyright rule
//       is in every prompt; a reply that looks copied (copySuspects) is
//       rejected; (2) every question is answer-checked before it can be
//       served (rows land validated:false; Phase V is the only door);
//       (3) class-appropriate personas; (4) honest labels; (5) nothing
//       child-facing — content only, the SCHOOL_BOARD exams stay inactive
//       and --apply refuses an active one.
//
// Journal: D:/CodexProjects/shishya-data/school-content-batches/<runId>.json
// (a sibling of the bank verifier's folder, never that folder). It records
// every request, its status and parsed output, and what was written, so a
// killed run continues with --resume <runId> --apply without resubmitting or
// re-writing. Notes are written to the DB as soon as Phase N is collected,
// before Phase G is submitted, so a crash in Phase G never loses them.
//
// !! Batches run on ANTHROPIC_BULK_API_KEY only, never on the shared key
// !! (src/lib/ai/batch.ts). Without --apply the script is a dry run: it
// !! lists the chapters, builds every request, prints the estimate at batch
// !! prices, writes the journal and submits nothing.
//
//   npx tsx --env-file=.env.local scripts/school-content-batch.ts \
//     --exams NCERT_C06,NCERT_C07,NCERT_C08,NCERT_C09,NCERT_C10 \
//     [--subjects Mathematics,Science] [--topics fegp1.ch01,…] [--limit N] \
//     [--phase notes|generate|all] [--target 40] [--force] [--model <id>] \
//     [--apply] [--resume <runId>] [--journal <path>] [--poll-seconds 60] [--force-journal]
//
//   --model ID        notes + MCQ model (default: the factory's generate tier,
//                     i.e. ANTHROPIC_MODEL); Phase V stays on the strong tier
//   --phase notes     Phase N only (write notes, stop)
//   --phase generate  Phase G only (needs notes: from this journal or the DB)
//   --phase all       both, in order (default)
//   --force           regenerate notes that exist / the full 40 even when
//                     questions exist (default: skip chapters with notes /
//                     ≥ target questions)
//   --apply           submit the batches and write rows (default: dry run)
//   --resume ID       continue a journaled run
//   --force-journal   start a fresh run (or resume a never-submitted journal)
//                     although another journal has submitted batches over
//                     the same chapters — pays for them again

import { PrismaClient, Prisma } from "@prisma/client";
import type Anthropic from "@anthropic-ai/sdk";
import {
  BULK_KEY_ENV,
  assertBulkKey,
  chunk,
  estimateRequestTokens,
  journalPath,
  loadJournal,
  makeCustomId,
  newJournal,
  openJournalsCovering,
  runJournalPhase,
  saveJournal,
  tokensUsd,
  type BatchJournal,
  type JournalRequest,
} from "../src/lib/ai/batch";
import type { MessageParams } from "../src/lib/ai/client";
import { DEFAULT_CONFIG } from "../src/lib/ai/factory";
import type { CandidateQuestion } from "../src/lib/ai/factory/types";
import { modelFor } from "../src/lib/ai/router";
import { isSchoolCategory } from "../src/lib/db/exam-scope";
import { WITHDRAWN_TAG } from "../src/lib/question-withdrawn";
import { displayTitle, ncertChapterByTopicCode } from "../src/lib/school/spine";
import {
  MCQ_PROMPT_VERSION,
  MCQ_SET_SIZE,
  MCQ_SETS_PER_CHAPTER,
  NOTES_PROMPT_VERSION,
  SCHOOL_CLASSES_SUPPORTED,
  buildSchoolMcqRequest,
  buildSchoolNotesRequest,
  placeholderNotes,
  type DifficultyMix,
  type SchoolChapter,
} from "../src/lib/school/content-prompts";
import { dedupeCandidates, parseSchoolMcqSet, parseSchoolNotes, replyText } from "../src/lib/school/content-parse";
import { mixForSet, planNoteWrite, planQuestionRows, pruneBuiltRequests, setsNeeded, stripProvenanceComment } from "../src/lib/school/content-plan";

const prisma = new PrismaClient();

/** Ledger labels (src/lib/ai/usage.ts): separable from the factory's and the bank verifier's rows. */
const NOTES_FEATURE = "school-notes";
const GEN_FEATURE = "school-gen";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const csv = (s: string | undefined) => (s ?? "").split(",").map((x) => x.trim()).filter(Boolean);
const EXAMS = csv(arg("--exams"));
const SUBJECTS = csv(arg("--subjects") ?? "Mathematics,Science");
const TOPICS = csv(arg("--topics"));
const LIMIT = arg("--limit") ? Math.max(1, Number(arg("--limit"))) : null;
// --phase / --target / --force / --model: from the command line on a fresh run;
// on --resume the journal's own values apply unless given again (set in main).
let PHASE = (arg("--phase") ?? "all") as "notes" | "generate" | "all";
let TARGET = Math.max(MCQ_SET_SIZE, Number(arg("--target") ?? MCQ_SET_SIZE * MCQ_SETS_PER_CHAPTER));
let FORCE = process.argv.includes("--force");
// Dry run unless --apply is given; --dry-run always wins (as the bank verifier).
const DRY = !process.argv.includes("--apply") || process.argv.includes("--dry-run");
const FORCE_JOURNAL = process.argv.includes("--force-journal");
const RESUME = arg("--resume") ?? null;
const JOURNAL_DIR = "D:/CodexProjects/shishya-data/school-content-batches";
const JOURNAL_FILE = arg("--journal") ?? null;
const POLL_MS = Math.max(5, Number(arg("--poll-seconds") ?? 60)) * 1000;

/**
 * Expected output tokens per request, for the dry-run estimate (26 Sep 2026):
 * notes — TopicTeachingNote averages 1,023 words / 6,848 chars (~1,700 tokens);
 * gen — the fresh-questions ledger averages 2,434 output tokens for a set of
 * this size. No school run has happened yet; the first pilot replaces these.
 */
const OBSERVED_OUT = { notes: 1700, gen: 2450 };
/** Phase V per-request averages from the bank verifier's batch rows (AiUsage, 25 Sep 2026): bank-solve 388 in / 140 out, bank-verify 577 in / 144 out. */
const VERIFY_OBSERVED = { solve: { in: 388, out: 140 }, verify: { in: 577, out: 144 } };

type Row = {
  topicId: string;
  examId: string;
  examCode: string;
  examActive: boolean;
  examCategory: string;
  subject: string;
  topicCode: string;
  topicName: string;
  officialUrl: string | null;
  noteChars: number | null;
  noteBy: string | null;
  noteContent: string | null;
  questions: number;
};

type Outputs = {
  /** custom_id → why our checker rejected its last reply; the one retry carries this in its prompt (26 Sep 2026 review). Absent in journals built before it. */
  feedback?: Record<string, string>;
  /** topicId → validated notes (markdown without the provenance comment). */
  notes: Record<string, { content: string; words: number; model: string; promptVersion: string }>;
  /** topicId → the TopicTeachingNote write that landed. */
  notesWritten: Record<string, { at: string; chars: number }>;
  /** topicId → set index → clean candidates. */
  gen: Record<string, Record<string, { candidates: CandidateQuestion[]; mix: DifficultyMix; dropped: number; model: string }>>;
  /** topicId → set index → the Question rows that landed. */
  written: Record<string, Record<string, { at: string; ids: string[]; duplicates: number }>>;
};
type Journal = BatchJournal<Outputs>;

const NOTES = "notes";
const GEN = "gen";
/** Notes + MCQ model: the factory's generate tier (ANTHROPIC_MODEL, Sonnet 4.5 by default) unless --model pins one, or the journal's on --resume; Phase V always runs on the strong tier. */
let MODEL = arg("--model") ?? modelFor("generate");

const totals = { notesWritten: 0, questionsWritten: 0, duplicates: 0, errors: 0, costUsd: 0 };

function journalFileFor(runId: string): string {
  return JOURNAL_FILE ?? journalPath(JOURNAL_DIR, runId);
}

function newRunId(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  const stamp = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
  // journalPath() takes [A-Za-z0-9_.-] only (no "+"): NCERT_C06,NCERT_C07 → school-C06-C07
  const slug = `school-${EXAMS.map((e) => e.replace(/^NCERT_/, "")).join("-")}`.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 56);
  return `${stamp}-${slug}`;
}

// ---------------------------------------------------------------------------
// Row loading (school rows on purpose: this runner writes school content only)
// ---------------------------------------------------------------------------

const ROW_SELECT = Prisma.sql`SELECT t.id AS "topicId", e.id AS "examId", e.code AS "examCode", e.active AS "examActive", e.category::text AS "examCategory",
       s.name AS subject, t.code AS "topicCode", t.name AS "topicName",
       (SELECT k.url FROM "KnowledgeSource" k WHERE k."examCode" = e.code AND k."topicCode" = t.code AND k.publisher = 'NCERT' AND k."archivedAt" IS NULL ORDER BY k."ingestedAt" ASC LIMIT 1) AS "officialUrl",
       LENGTH(tn.content)::int AS "noteChars", tn."generatedBy" AS "noteBy", tn.content AS "noteContent",
       (SELECT COUNT(*)::int FROM "Question" q WHERE q."topicId" = t.id AND NOT (${WITHDRAWN_TAG} = ANY(q.tags))) AS questions
     FROM "Topic" t JOIN "Subject" s ON s.id = t."subjectId" JOIN "Exam" e ON e.id = s."examId"
     LEFT JOIN "TopicTeachingNote" tn ON tn."topicId" = t.id`;

async function rowsForSelection(): Promise<Row[]> {
  return prisma.$queryRaw<Row[]>(
    Prisma.sql`${ROW_SELECT}
     WHERE e.code IN (${Prisma.join(EXAMS)}) AND s.name IN (${Prisma.join(SUBJECTS)}) AND t."parentId" IS NULL
       ${TOPICS.length ? Prisma.sql`AND t.code IN (${Prisma.join(TOPICS)})` : Prisma.empty}
     ORDER BY e.code ASC, s."orderIdx" ASC, t."orderIdx" ASC ${Prisma.raw(LIMIT ? `LIMIT ${LIMIT}` : "")}`,
  );
}

async function rowsByIds(ids: string[]): Promise<Row[]> {
  const out: Row[] = [];
  for (const part of chunk(ids, 200)) {
    out.push(...(await prisma.$queryRaw<Row[]>(Prisma.sql`${ROW_SELECT} WHERE t.id IN (${Prisma.join(part)}) ORDER BY e.code ASC, s."orderIdx" ASC, t."orderIdx" ASC`)));
  }
  return out;
}

/** Existing stems on a chapter, for the duplicate check at write time. */
async function existingStems(topicId: string): Promise<string[]> {
  const rows = await prisma.question.findMany({ where: { topicId }, select: { body: true } });
  return rows.map((r) => r.body);
}

// ---------------------------------------------------------------------------
// Chapter identity: DB row + spine (book, chapter number) + the link row
// ---------------------------------------------------------------------------

function classOf(examCode: string): number | null {
  const m = /^NCERT_C(\d{2})$/.exec(examCode);
  return m ? Number(m[1]) : null;
}

function resolveChapter(r: Row): { chapter: SchoolChapter | null; skip?: string } {
  const cls = classOf(r.examCode);
  if (cls == null) return { chapter: null, skip: `${r.examCode} is not an NCERT class container (CISCE has no chapters)` };
  if (!SCHOOL_CLASSES_SUPPORTED.includes(cls)) return { chapter: null, skip: `Class ${cls} has no persona yet (supported: ${SCHOOL_CLASSES_SUPPORTED.join(", ")})` };
  const found = ncertChapterByTopicCode(cls, r.topicCode);
  if (!found) return { chapter: null, skip: `no chapter ${r.topicCode} in data/curriculum for Class ${cls}` };
  if (!r.officialUrl) return { chapter: null, skip: `no official link row (KnowledgeSource NCERT, ${r.examCode} ${r.topicCode}) — seed it first` };
  if (r.officialUrl !== found.chapter.pdfUrl) return { chapter: null, skip: `link row URL ${r.officialUrl} ≠ spine PDF ${found.chapter.pdfUrl} — resolve before generating` };
  const spineTitle = displayTitle(found.chapter.title);
  if (spineTitle !== r.topicName) console.warn(`   ! ${r.examCode} ${r.topicCode}: DB name "${r.topicName}" ≠ spine "${spineTitle}" (using the DB name)`);
  return {
    chapter: {
      topicId: r.topicId,
      examCode: r.examCode,
      cls,
      subject: r.subject,
      bookCode: found.book.code,
      bookTitle: found.book.title,
      chapterNumber: found.chapter.number,
      chapterKind: found.chapter.kind,
      topicCode: r.topicCode,
      title: r.topicName,
      officialUrl: r.officialUrl,
    },
  };
}

// ---------------------------------------------------------------------------
// Estimate
// ---------------------------------------------------------------------------

function printEstimate(notesReqs: MessageParams[], genReqs: MessageParams[], chaptersWithoutNotes: number) {
  const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
  const nIn = sum(notesReqs.map(estimateRequestTokens));
  const gIn = sum(genReqs.map(estimateRequestTokens));
  const nMax = sum(notesReqs.map((p) => p.max_tokens));
  const gMax = sum(genReqs.map((p) => p.max_tokens));
  const nOut = notesReqs.length * OBSERVED_OUT.notes;
  const gOut = genReqs.length * OBSERVED_OUT.gen;
  const model = notesReqs[0]?.model ?? genReqs[0]?.model ?? MODEL;
  const expected = tokensUsd(model, { input: nIn, output: nOut }, { batch: true }) + tokensUsd(model, { input: gIn, output: gOut }, { batch: true });
  // Every request is submitted at most twice (runJournalPhase retries a
  // rejected or errored reply once), and a reply that fills max_tokens is a
  // truncated, unparseable one — so the ceiling is one full retry of every
  // request on top of every reply filling max_tokens (26 Sep 2026 review).
  const worstOnce = tokensUsd(model, { input: nIn, output: nMax }, { batch: true }) + tokensUsd(model, { input: gIn, output: gMax }, { batch: true });
  const worst = worstOnce * 2;
  // Phase V: the bank verifier's three blind solves + one verdict per question on the strong tier.
  const questions = genReqs.length * MCQ_SET_SIZE;
  const vModel = modelFor("verify");
  const vIn = questions * (DEFAULT_CONFIG.solveRuns * VERIFY_OBSERVED.solve.in + VERIFY_OBSERVED.verify.in);
  const vOut = questions * (DEFAULT_CONFIG.solveRuns * VERIFY_OBSERVED.solve.out + VERIFY_OBSERVED.verify.out);
  const vUsd = tokensUsd(vModel, { input: vIn, output: vOut }, { batch: true });
  console.log(`\nESTIMATE (no request submitted)`);
  console.log(`   Phase N notes : ${notesReqs.length} requests · ~${nIn.toLocaleString()} prompt tokens · max_tokens ${nMax.toLocaleString()} (expected output ~${nOut.toLocaleString()} at ${OBSERVED_OUT.notes}/req, TopicTeachingNote avg 26 Sep) · ${model}`);
  console.log(`   Phase G mcq   : ${genReqs.length} requests of ${MCQ_SET_SIZE} · ~${gIn.toLocaleString()} prompt tokens${chaptersWithoutNotes ? ` (${chaptersWithoutNotes} chapters priced with placeholder notes of ~1,000 words; real prompts carry the chapter's own Phase N notes)` : ""} · max_tokens ${gMax.toLocaleString()} (expected output ~${gOut.toLocaleString()} at ${OBSERVED_OUT.gen}/set, fresh-questions avg) · ${model}`);
  console.log(`   Batch price   : expected ~$${expected.toFixed(2)} · worst case $${worst.toFixed(2)} (every reply fills max_tokens = $${worstOnce.toFixed(2)}, then every request is retried once) · the same calls live would be ~$${(expected * 2).toFixed(2)}`);
  console.log(`   Phase V verify: ${questions.toLocaleString()} questions × (${DEFAULT_CONFIG.solveRuns} solves + 1 verdict) on ${vModel} ≈ $${vUsd.toFixed(2)} at batch prices (bank-solve/bank-verify ledger averages, 25 Sep) — run scripts/verify-question-bank.ts separately, see below`);
  console.log(`   Prompt tokens are a character-count estimate (no count_tokens call was made).`);
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

async function writeNotes(journal: Journal, file: string, chapters: Map<string, SchoolChapter>) {
  for (const [topicId, note] of Object.entries(journal.outputs.notes)) {
    if (journal.outputs.notesWritten[topicId]) continue;
    const ch = chapters.get(topicId);
    if (!ch) continue;
    const plan = planNoteWrite(ch, note.content, { model: note.model, runId: journal.runId, now: new Date() });
    try {
      await prisma.topicTeachingNote.upsert({ where: plan.where, create: plan.create, update: plan.update });
      journal.outputs.notesWritten[topicId] = { at: new Date().toISOString(), chars: plan.create.content.length };
      totals.notesWritten += 1;
      saveJournal(file, journal);
      console.log(`   ✓ notes ${ch.examCode} ${ch.topicCode} · ${note.words} words`);
    } catch (e) {
      totals.errors += 1;
      console.warn(`   ! notes ${ch.examCode} ${ch.topicCode} write failed: ${String((e as Error)?.message ?? e).split("\n")[0].slice(0, 160)}`);
    }
  }
}

async function writeQuestions(journal: Journal, file: string, chapters: Map<string, SchoolChapter>, rows: Map<string, Row>) {
  for (const [topicId, sets] of Object.entries(journal.outputs.gen)) {
    const ch = chapters.get(topicId);
    const row = rows.get(topicId);
    if (!ch || !row) continue;
    const written = (journal.outputs.written[topicId] ??= {});
    const indexes = Object.keys(sets).map(Number).sort((a, b) => a - b);
    if (indexes.every((i) => written[String(i)])) continue;
    // Stems already on the chapter + the sets of this chapter written before this one.
    const stems = await existingStems(topicId);
    for (const i of indexes) {
      if (written[String(i)]) continue;
      const set = sets[String(i)];
      const { kept, dropped } = dedupeCandidates(set.candidates, stems);
      const plans = planQuestionRows(ch, row.examId, kept, { model: set.model, runId: journal.runId, setIndex: i, now: new Date() });
      try {
        const created = await prisma.$transaction(
          plans.map((p) => prisma.question.create({ data: { ...p, metadata: p.metadata as unknown as Prisma.InputJsonValue }, select: { id: true } })),
        );
        written[String(i)] = { at: new Date().toISOString(), ids: created.map((c) => c.id), duplicates: dropped.length };
        for (const k of kept) stems.push(k.body);
        totals.questionsWritten += created.length;
        totals.duplicates += dropped.length;
        saveJournal(file, journal);
        console.log(`   ✓ ${ch.examCode} ${ch.topicCode} set ${i + 1}: ${created.length} questions (${set.mix.EASY}/${set.mix.MEDIUM}/${set.mix.HARD})${dropped.length ? ` · ${dropped.length} duplicate stems dropped` : ""}`);
      } catch (e) {
        totals.errors += 1;
        console.warn(`   ! ${ch.examCode} ${ch.topicCode} set ${i + 1} write failed (nothing of it written): ${String((e as Error)?.message ?? e).split("\n")[0].slice(0, 160)}`);
      }
    }
  }
}

// ---------------------------------------------------------------------------

async function main() {
  if (!EXAMS.length && !RESUME) throw new Error("--exams NCERT_C06[,NCERT_C07…] is required (or --resume <runId>)");
  if (!["notes", "generate", "all"].includes(PHASE)) throw new Error(`--phase must be notes, generate or all (got ${PHASE})`);
  // Spend gate: nothing that can bill starts while the bulk key is absent, before the first database read.
  if (!DRY) assertBulkKey();

  // 1. journal
  let journal: Journal;
  let file: string;
  if (RESUME) {
    file = journalFileFor(RESUME);
    journal = loadJournal<Outputs>(file);
    // The journal's run arguments apply unless given again on this command line.
    const a = journal.args as { phaseArg?: string; target?: number; force?: boolean; model?: string; notesPromptVersion?: string; mcqPromptVersion?: string };
    if (!arg("--phase") && a.phaseArg) PHASE = a.phaseArg as typeof PHASE;
    if (!arg("--target") && a.target) TARGET = a.target;
    if (!process.argv.includes("--force") && a.force) FORCE = true;
    if (!arg("--model") && a.model) MODEL = a.model;
    journal.outputs.feedback ??= {};
    console.log(`\n=== resuming ${journal.runId} from ${file} (phase ${journal.phase}, ${Object.keys(journal.requests).length} requests, ${journal.batches.length} batches · --phase ${PHASE} · target ${TARGET}${FORCE ? " · force" : ""} · ${MODEL})`);
    // Requests are rebuilt from the current prompts at submit time; a journal
    // built under older prompt text says so once and records the versions it
    // will actually submit under (26 Sep 2026: v1 → v2 after the review).
    if (a.notesPromptVersion !== NOTES_PROMPT_VERSION || a.mcqPromptVersion !== MCQ_PROMPT_VERSION) {
      console.log(`   note: journal built under prompts ${a.notesPromptVersion ?? "?"} / ${a.mcqPromptVersion ?? "?"}; still-unsubmitted requests go out under ${NOTES_PROMPT_VERSION} / ${MCQ_PROMPT_VERSION}`);
      journal.args.notesPromptVersion = NOTES_PROMPT_VERSION;
      journal.args.mcqPromptVersion = MCQ_PROMPT_VERSION;
    }
  } else {
    const runId = newRunId();
    file = journalFileFor(runId);
    journal = newJournal<Outputs>(
      runId,
      { exams: EXAMS, subjects: SUBJECTS, topics: TOPICS, limit: LIMIT, phaseArg: PHASE, target: TARGET, force: FORCE, model: MODEL, notesPromptVersion: NOTES_PROMPT_VERSION, mcqPromptVersion: MCQ_PROMPT_VERSION, mode: "batch", startedDry: DRY },
      { feedback: {}, notes: {}, notesWritten: {}, gen: {}, written: {} },
    );
    console.log(`\n=== run ${runId} → ${file}`);
  }

  // 2. rows
  const fetched = RESUME ? await rowsByIds(Object.keys(journal.questions)) : await rowsForSelection();
  if (RESUME) {
    const gone = Object.keys(journal.questions).length - fetched.length;
    if (gone) console.log(`   ${gone} journaled chapters no longer exist — dropped`);
  }
  for (const r of fetched) {
    if (!isSchoolCategory(r.examCategory)) throw new Error(`${r.examCode} is ${r.examCategory}, not SCHOOL_BOARD — this runner writes school content only`);
    if (r.examActive && !DRY) throw new Error(`${r.examCode} is ACTIVE: school content must stay hidden (founder rule 5); nothing written`);
    if (r.examActive) console.warn(`   ! ${r.examCode} is ACTIVE — an --apply run would refuse it`);
  }

  // 3. chapters + what each still needs
  const rows = new Map<string, Row>();
  const chapters = new Map<string, SchoolChapter>();
  const needNotes = new Set<string>();
  const needSets = new Map<string, number[]>();
  console.log(`   ${fetched.length} chapter topics (${EXAMS.join(", ") || "journaled"} · ${SUBJECTS.join(", ")}${TOPICS.length ? ` · topics ${TOPICS.join(", ")}` : ""}${LIMIT ? ` · limit ${LIMIT}` : ""})`);
  for (const r of fetched) {
    const { chapter, skip } = resolveChapter(r);
    if (!chapter) {
      console.warn(`   – ${r.examCode} ${r.topicCode} skipped: ${skip}`);
      continue;
    }
    rows.set(r.topicId, r);
    chapters.set(r.topicId, chapter);
    journal.questions[r.topicId] = { code: r.examCode };
    const hasNotes = (r.noteChars ?? 0) > 0;
    const wantNotes = PHASE !== "generate" && (FORCE || !hasNotes);
    const sets = PHASE !== "notes" ? setsNeeded(r.questions, { target: TARGET, force: FORCE }) : [];
    if (wantNotes) needNotes.add(r.topicId);
    if (sets.length) needSets.set(r.topicId, sets);
    const plan = [wantNotes ? "notes" : hasNotes ? "" : PHASE === "generate" ? "(no notes!)" : "", sets.length ? `${sets.length} set${sets.length > 1 ? "s" : ""}` : ""].filter(Boolean).join(" + ") || "nothing";
    const num = chapter.chapterNumber ? `${chapter.chapterKind[0].toUpperCase()}${chapter.chapterKind.slice(1)} ${chapter.chapterNumber}` : chapter.chapterKind;
    console.log(
      `   ${chapter.examCode} ${chapter.subject.padEnd(11)} ${chapter.topicCode.padEnd(11)} ${chapter.bookTitle} · ${num}: ${chapter.title} · notes ${hasNotes ? `${r.noteChars} chars (${r.noteBy ?? "?"})` : "none"} · q ${r.questions}/${TARGET} → ${plan} · ${chapter.officialUrl}`,
    );
  }
  // journaled chapters that were not fetched (resume) leave the run
  for (const id of Object.keys(journal.questions)) if (!rows.has(id)) delete journal.questions[id];
  for (const [id, r] of Object.entries(journal.requests)) {
    if (rows.has(r.questionId)) continue;
    const b = journal.batches.find((x) => x.id === r.batchId);
    if (b && !b.collected) r.status = "stale";
    else delete journal.requests[id];
  }
  // built requests a resume must not submit: already produced by this run, or
  // (a journal that never submitted anything) no longer needed by the chapter
  if (RESUME) {
    const drop = pruneBuiltRequests(
      { requests: journal.requests, outputs: journal.outputs, neverSubmitted: journal.batches.length === 0 && !journal.pendingSubmit },
      { notes: needNotes, sets: needSets },
      { notes: NOTES, gen: GEN },
    );
    for (const id of drop) delete journal.requests[id];
    if (drop.length) console.log(`   ${drop.length} journaled requests dropped (already produced by this run, or the chapter no longer needs them)`);
  }

  // 3b. chapters an unfinished journal already paid for: a fresh run, or a
  //     resumed journal that has never submitted anything (a dry-run journal;
  //     26 Sep 2026 review — resuming the second of two overlapping dry-run
  //     journals while the first is polling used to resubmit every request,
  //     because the DB holds nothing until a run finishes). A journal that
  //     has submitted is mid-run: its own writes are the ones that matter.
  const neverSubmitted = journal.batches.length === 0 && !journal.pendingSubmit;
  if (!RESUME || neverSubmitted) {
    const dryTwins: string[] = [];
    for (const o of openJournalsCovering(JOURNAL_DIR, new Set(rows.keys()))) {
      if (o.runId === journal.runId) continue;
      if (o.submitted) {
        const msg = `run ${o.runId} (phase ${o.phase}) has submitted batches covering ${o.overlap} of these chapters; continue it with --resume ${o.runId} --apply${DRY ? "" : ", or pass --force-journal to pay for them again"}`;
        if (!DRY && !FORCE_JOURNAL) throw new Error(msg);
        console.warn(`   ! ${msg}`);
      } else {
        dryTwins.push(o.runId);
        console.log(`   note: dry-run journal ${o.runId} covers ${o.overlap} of these chapters${RESUME ? "" : `; --resume ${o.runId} --apply submits exactly those`}`);
      }
    }
    if (dryTwins.length) console.log(`   resume ONE journal only; the dry-run journals you will not resume can be deleted (nothing was submitted from them)`);
  }

  // 4. requests
  for (const topicId of needNotes) {
    const customId = makeCustomId(NOTES, topicId);
    if (!journal.requests[customId] && !journal.outputs.notes[topicId]) journal.requests[customId] = { customId, phase: NOTES, questionId: topicId, code: chapters.get(topicId)!.examCode, attempt: 1, status: "built" };
  }
  for (const [topicId, sets] of needSets) {
    for (const i of sets) {
      const customId = makeCustomId(GEN, topicId, i);
      if (!journal.requests[customId] && !journal.outputs.gen[topicId]?.[String(i)]) journal.requests[customId] = { customId, phase: GEN, questionId: topicId, code: chapters.get(topicId)!.examCode, runIndex: i, attempt: 1, status: "built" };
    }
  }
  // Grounding for Phase G: this run's validated notes, else the chapter's stored notes (without their provenance comment).
  const notesTextFor = (topicId: string): string | null => {
    const stored = rows.get(topicId)?.noteContent;
    return journal.outputs.notes[topicId]?.content ?? (stored ? stripProvenanceComment(stored) : null);
  };
  // The one retry of a rejected reply carries our checker's reasons (26 Sep 2026 review); an API-error retry (no feedback recorded) goes out unchanged.
  const feedbackFor = (r: JournalRequest): string | undefined => (r.attempt > 1 ? journal.outputs.feedback?.[r.customId] : undefined);
  const rejected = (r: JournalRequest, reasons: string) => {
    r.error = reasons.slice(0, 300);
    (journal.outputs.feedback ??= {})[r.customId] = reasons.slice(0, 600);
    return false;
  };
  const accepted = (r: JournalRequest) => {
    delete r.error; // a retry that succeeded no longer carries attempt 1's reasons
    return true;
  };
  const buildNotes = (r: JournalRequest) => buildSchoolNotesRequest(chapters.get(r.questionId)!, { model: MODEL, retryFeedback: feedbackFor(r) });
  const buildGen = (r: JournalRequest) =>
    buildSchoolMcqRequest(chapters.get(r.questionId)!, notesTextFor(r.questionId) ?? placeholderNotes(chapters.get(r.questionId)!), r.runIndex ?? 0, { model: MODEL, mix: mixForSet(r.runIndex ?? 0), retryFeedback: feedbackFor(r) });

  if (DRY) {
    const notesReqs = Object.values(journal.requests).filter((r) => r.phase === NOTES && r.status === "built").map(buildNotes);
    const genBuilt = Object.values(journal.requests).filter((r) => r.phase === GEN && r.status === "built");
    const genReqs = genBuilt.map(buildGen);
    const placeholders = new Set(genBuilt.filter((r) => !notesTextFor(r.questionId)).map((r) => r.questionId)).size;
    printEstimate(notesReqs, genReqs, placeholders);
    console.log(`   Chapters: ${rows.size} selected · ${needNotes.size} need notes · ${needSets.size} need questions (${[...needSets.values()].reduce((a, s) => a + s.length, 0)} sets) · ${rows.size - new Set([...needNotes, ...needSets.keys()]).size} nothing to do`);
    if (RESUME) {
      console.log(`\nJournal untouched: ${file} (phase ${journal.phase})`);
      console.log(`To continue it (needs the founder's go-ahead + ${BULK_KEY_ENV}):\n   --resume ${journal.runId} --apply`);
    } else {
      journal.phase = "built";
      saveJournal(file, journal);
      console.log(`\nJournal written: ${file}`);
      console.log(`To submit exactly these requests (needs the founder's go-ahead + ${BULK_KEY_ENV}):\n   --resume ${journal.runId} --apply`);
    }
    printVerifyCommand(journal);
    return;
  }

  // 5. Phase N
  const notesPending = Object.values(journal.requests).some((r) => r.phase === NOTES && (r.status === "built" || r.status === "submitted"));
  if (PHASE !== "generate" && (notesPending || journal.batches.some((b) => b.phase === NOTES && !b.collected))) {
    if (journal.phase === "new" || journal.phase === "built") {
      journal.phase = NOTES;
      saveJournal(file, journal);
    }
    const out = await runJournalPhase(
      journal,
      file,
      NOTES,
      NOTES_FEATURE,
      buildNotes,
      (r, message) => {
        const check = parseSchoolNotes(replyText(message), chapters.get(r.questionId)!);
        if (!check.ok) return rejected(r, check.reasons.join("; "));
        journal.outputs.notes[r.questionId] = { content: check.content, words: check.words, model: message.model, promptVersion: NOTES_PROMPT_VERSION };
        return accepted(r);
      },
      // A reply that fails validation (length, headings, copy suspect) gets one more try, with the reasons in its prompt.
      true,
      { pollIntervalMs: POLL_MS },
    );
    totals.costUsd += out.costUsd;
  }
  if (PHASE !== "generate") {
    journal.phase = "notes-writing";
    saveJournal(file, journal);
    await writeNotes(journal, file, chapters);
    journal.phase = "notes-written";
    saveJournal(file, journal);
  }
  if (PHASE === "notes") {
    finish(journal, file);
    return;
  }

  // 6. Phase G — a chapter with no notes (Phase N failed for it, or --phase generate on a chapter without notes) is not generated
  for (const r of Object.values(journal.requests)) {
    if (r.phase === GEN && r.status === "built" && !notesTextFor(r.questionId)) {
      r.status = "failed";
      r.error = "no notes for this chapter (Phase N produced none) — questions are grounded in our notes, so none generated";
    }
  }
  if (journal.phase === "new" || journal.phase === "built" || journal.phase.startsWith("notes")) {
    journal.phase = GEN;
    saveJournal(file, journal);
  }
  const out = await runJournalPhase(
    journal,
    file,
    GEN,
    GEN_FEATURE,
    buildGen,
    (r, message) => {
      // Attempt 1 wants the exact 4/4/2; attempt 2 keeps any clean set of ≥ 6 so a one-off label never costs a set twice.
      const check = parseSchoolMcqSet(replyText(message), { expectedMix: mixForSet(r.runIndex ?? 0), strictMix: r.attempt === 1 });
      if (!check.ok) {
        // the retry prompt names the dropped questions and why (1-based, as the model counts them)
        const dropped = check.dropped.slice(0, 4).map((d) => `question ${d.index + 1}: ${d.reason}`);
        return rejected(r, [...check.reasons, ...dropped].join("; "));
      }
      (journal.outputs.gen[r.questionId] ??= {})[String(r.runIndex ?? 0)] = { candidates: check.candidates, mix: check.mix, dropped: check.dropped.length, model: message.model };
      return accepted(r);
    },
    true,
    { pollIntervalMs: POLL_MS },
  );
  totals.costUsd += out.costUsd;

  // 7. write question rows
  journal.phase = "gen-writing";
  saveJournal(file, journal);
  await writeQuestions(journal, file, chapters, rows);
  finish(journal, file);
}

function finish(journal: Journal, file: string) {
  journal.phase = "done";
  journal.args.finishedAt = new Date().toISOString();
  journal.args.totals = { ...totals, costUsd: Number(totals.costUsd.toFixed(4)) };
  saveJournal(file, journal);
  const notesOk = Object.keys(journal.outputs.notesWritten).length;
  const unusable = Object.values(journal.requests).filter((r) => r.status === "unusable").length;
  const failed = Object.values(journal.requests).filter((r) => r.status === "failed").length;
  console.log(
    `\n=== batch run ${journal.runId} done: notes written ${totals.notesWritten} (journal total ${notesOk}) · questions written ${totals.questionsWritten} (validated:false) · duplicate stems dropped ${totals.duplicates} · replies unusable ${unusable} · requests failed ${failed} · write errors ${totals.errors} · ledger $${totals.costUsd.toFixed(2)} at batch prices`,
  );
  printVerifyCommand(journal);
}

/** Exam codes whose chapters this run actually holds (a --limit 5 pilot over five exams holds Class 6 only); the command line or the journal's args when no chapter resolved. */
function examsCovered(journal: Journal): string[] {
  const held = [...new Set(Object.values(journal.questions).map((q) => q.code))].sort();
  if (held.length) return held;
  if (EXAMS.length) return EXAMS;
  return Array.isArray(journal.args.exams) ? (journal.args.exams as string[]) : [];
}

function printVerifyCommand(journal: Journal) {
  const exams = examsCovered(journal);
  console.log(`\nPhase V (the firewall; nothing is served before it) — the bank verifier selects by exam code and needs no school flag.`);
  console.log(`   ONE exam per run: its run id joins several codes with "+", which its journal path refuses (26 Sep 2026); each run prints its own runId.`);
  for (const code of exams) {
    console.log(`   npx tsx --env-file=.env.local scripts/verify-question-bank.ts --exams ${code} --scope unvalidated            # dry run: journal + estimate`);
  }
  console.log(`   npx tsx --env-file=.env.local scripts/verify-question-bank.ts --resume <runId-it-prints> --apply                 # submit + write verdicts (per run)`);
  console.log(`   Its ACCEPT sets validated:true (source → AI_VALIDATED); the SCHOOL_BOARD exam rows stay inactive, so nothing is served either way.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
