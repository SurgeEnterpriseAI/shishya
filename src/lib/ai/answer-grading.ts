// Quiz answers graded in code (16 Oct 2026, founder: "complete building the
// code-graded answers"). A student who answers a question the tutor showed
// from the verified bank ("b", "1.b 2.c", "option C") is marked against the
// bank's answer key by this file, not by a model: in the 13 Oct audit Qwen
// graded a right pick wrong, and the short "b" turns (about a third of the
// signed-in tutor's turns) all went to Claude for that reason.
//
// Flow: the tutor reports the ids of the bank questions it showed
// (find_questions_on_topic → tool event `shown`, stored on the ASSISTANT
// row's metadata.toolCalls — ids only, never keys: that metadata reaches the
// chat page). On the next turn the ids come back as pendingQuestionIds, the
// keys are read from the database, and gradingBlock() tells whichever model
// answers exactly what is right and wrong; gradingConsistent() rejects a
// local reply that contradicts it. Pure, except loadGradedQuestions.

export interface GradableQuestion {
  id: string;
  body: string;
  options: Array<{ key: string; text: string }>;
  answerKey: string;
  solution: string | null;
}

export interface StudentAnswer {
  /** 0-based position among the questions shown. */
  index: number;
  letter: string;
}

export interface GradedAnswer {
  question: GradableQuestion;
  chosen: string;
  correct: boolean;
}

/** Ids of the bank questions a tool result showed the student (only find_questions_on_topic). */
export function shownQuestionIds(toolName: string, result: { ok: boolean; data?: any }): string[] | undefined {
  if (toolName !== "find_questions_on_topic" || !result.ok) return undefined;
  const ids = (result.data?.questions ?? []).map((q: any) => q?.id).filter((x: unknown): x is string => typeof x === "string");
  return ids.length ? ids : undefined;
}

/** The question ids the last assistant turn showed (from its stored tool calls), newest tool call last. */
export function pendingQuestionIdsFromMetadata(metadata: unknown): string[] {
  const calls = ((metadata as { toolCalls?: Array<{ shown?: unknown }> } | null)?.toolCalls ?? []) as Array<{ shown?: unknown }>;
  for (let i = calls.length - 1; i >= 0; i--) {
    const s = calls[i]?.shown;
    if (Array.isArray(s) && s.length && s.every((x) => typeof x === "string")) return s as string[];
  }
  return [];
}

const L = "([A-Da-d])";

/**
 * The student's answers when the message is ONLY an answer to the shown
 * questions: "b", "(B)", "option c", "ans: d", "b is the answer", "1.b 2.c",
 * "1) b / 2) c". Null for anything else (a question, a number, prose), and
 * for a bare letter when more than one question was shown (which one?).
 */
export function parseAnswerTurn(message: string, shownCount: number): StudentAnswer[] | null {
  if (shownCount < 1) return null;
  const t = message.trim().replace(/[.!]+$/, "");
  if (t.length > 60) return null;
  const single =
    new RegExp(`^\\(?${L}\\)?$`).exec(t) ??
    new RegExp(`^(?:my\\s+)?(?:option|ans(?:wer)?|choice)\\s*(?:is|:|-)?\\s*\\(?${L}\\)?$`, "i").exec(t) ??
    new RegExp(`^\\(?${L}\\)?\\s+(?:is\\s+)?(?:the\\s+)?(?:ans(?:wer)?|correct|right)$`, "i").exec(t);
  if (single) return shownCount === 1 ? [{ index: 0, letter: single[1].toUpperCase() }] : null;
  const pairs = [...t.matchAll(new RegExp(`(\\d{1,2})\\s*[.):\\-]\\s*\\(?${L}\\)?`, "g"))];
  if (!pairs.length) return null;
  // Everything in the message must be numbered answers and separators.
  if (t.replace(new RegExp(`(\\d{1,2})\\s*[.):\\-]\\s*\\(?${L}\\)?`, "g"), "").replace(/[\s,/;|&]|and/gi, "") !== "") return null;
  const out: StudentAnswer[] = [];
  for (const p of pairs) {
    const index = Number(p[1]) - 1;
    if (index < 0 || index >= shownCount || out.some((a) => a.index === index)) return null;
    out.push({ index, letter: p[2].toUpperCase() });
  }
  return out;
}

export function gradeAnswers(questions: GradableQuestion[], answers: StudentAnswer[]): GradedAnswer[] | null {
  const out: GradedAnswer[] = [];
  for (const a of answers) {
    const q = questions[a.index];
    if (!q || !/^[A-F]$/.test(q.answerKey) || !q.options.some((o) => o.key.toUpperCase() === a.letter)) return null;
    out.push({ question: q, chosen: a.letter, correct: a.letter === q.answerKey.toUpperCase() });
  }
  return out;
}

const optText = (q: GradableQuestion, k: string) => q.options.find((o) => o.key.toUpperCase() === k)?.text ?? "";
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** The system block every model gets for a graded turn. */
export function gradingBlock(graded: GradedAnswer[]): string {
  const lines = graded.map((g, i) => {
    const q = g.question;
    return [
      `Q${graded.length > 1 ? i + 1 : ""}: ${clip(q.body.replace(/\s+/g, " "), 400)}`,
      `   Options: ${q.options.map((o) => `${o.key}) ${clip(o.text, 80)}`).join("  ")}`,
      `   Student chose ${g.chosen} (${clip(optText(q, g.chosen), 80)}) — ${g.correct ? "CORRECT" : "WRONG"}.${g.correct ? "" : ` Correct answer: ${q.answerKey} (${clip(optText(q, q.answerKey), 80)}).`}`,
      q.solution ? `   Verified solution: ${clip(q.solution.replace(/\s+/g, " "), 700)}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });
  return `GRADING — done by Shishya's code against the VERIFIED answer key of these bank questions. It is final: never contradict it, never re-grade, never call a wrong pick right or a right pick wrong.
${lines.join("\n")}
In your reply: say plainly for each question whether the student is right or wrong, exactly as graded above; explain step by step why the correct option is right (use the verified solution); if the student was wrong, say in one or two sentences why their choice is wrong; end with one short next step.`;
}

/**
 * A local reply that contradicts the code's grading → null = fine, else a
 * reason (the turn then runs on Claude, which gets the same block).
 */
export function gradingConsistent(reply: string, graded: GradedAnswer[]): string | null {
  const text = reply.replace(/\*\*|__|`/g, "");
  for (const g of graded) {
    const key = g.question.answerKey.toUpperCase();
    if (!new RegExp(`(?:^|[^A-Za-z])\\(?${key}\\)?(?:[^A-Za-z]|$)`).test(text)) return `does not name the correct option ${key}`;
    if (!g.correct) {
      const praise = new RegExp(`(?:option\\s*)?\\(?${g.chosen}\\)?\\s*(?:is|was)\\s+(?:the\\s+)?(?:correct|right)(?!\\s+answer\\s+is\\s+not)`, "i");
      if (praise.test(text)) return `calls the wrong pick ${g.chosen} correct`;
    } else if (/\b(?:incorrect|not correct|is wrong|that's wrong)\b/i.test(text) && !/\bcorrect\b/i.test(text)) {
      return `calls the right pick ${g.chosen} wrong`;
    }
  }
  if (graded.length === 1) {
    const g = graded[0];
    if (g.correct && !/\b(?:correct|right|well done|great|exactly|spot on)\b/i.test(text)) return "does not say the answer is right";
    if (!g.correct && !/\b(?:incorrect|not correct|wrong|not right|isn't right|is not the answer|not quite)\b/i.test(text)) return "does not say the answer is wrong";
  }
  return null;
}

/** The shown questions, in the order shown, from the verified bank (null if any is missing). */
export async function loadGradedQuestions(
  prisma: { question: { findMany: (args: any) => Promise<any[]> } },
  ids: string[],
): Promise<GradableQuestion[] | null> {
  const rows = await prisma.question.findMany({
    where: { id: { in: ids } },
    select: { id: true, body: true, options: true, answerKey: true, solution: true },
  });
  const byId = new Map(rows.map((r: any) => [r.id, r]));
  const out: GradableQuestion[] = [];
  for (const id of ids) {
    const r: any = byId.get(id);
    if (!r || !Array.isArray(r.options)) return null;
    out.push({ id, body: String(r.body), options: r.options.map((o: any) => ({ key: String(o.key).toUpperCase(), text: String(o.text ?? "") })), answerKey: String(r.answerKey).toUpperCase(), solution: r.solution ?? null });
  }
  return out;
}
