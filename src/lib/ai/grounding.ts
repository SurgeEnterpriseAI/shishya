// Grounding for the local model (13 Oct 2026, founder: "local server first,
// quality not compromised — build the harness"). Before Surge's Qwen answers
// a tutor turn that leans on facts (articles, amendments, schemes, dynasties,
// dates), the turn is matched against Shishya's VERIFIED question bank —
// every answer key there was checked by Claude solvers and an Opus verifier —
// and the closest questions, with their keys and solutions, are handed to the
// model as the only facts it may state. The audit (scratchpad/llm-audit,
// 13 Oct) showed Qwen's tutor mistakes are recalled facts: "104th =
// women's reservation", invented state schemes, "IIT via CUET".
//
// Why the bank and not the knowledge base: KnowledgeChunk holds 32 passages
// (1,315 sources registered, none loaded); topic notes are AI-written and
// not validated (0 of 3,718). The bank is 54k checked questions.
//
// Search: Postgres full-text over body + solution, OR of the turn's content
// words, ranked by ts_rank_cd, kept only when a hit shares at least two of
// those words. Read-only.

import type { PrismaClient } from "@prisma/client";

export interface GroundItem {
  id: string;
  question: string;
  answer: string;
  solution: string;
  rank: number;
  shared: number;
}

export interface Grounding {
  items: GroundItem[];
  terms: string[];
  ms: number;
}

const STOP = new Set(
  (
    "about above after again against all also although always among and another any are aren around because been before " +
    "being below between both but can cannot could did does doing done down during each either else even ever every " +
    "explain few for from further give given gives had has have having here how however into its itself just know " +
    "least less like made make many may me might more most much must my myself need never not now off often once only " +
    "other our out over own please question questions quite rather really same say should show since some such tell " +
    "than that the their them then there these they thing things this those though through too under until upon very " +
    "want was way well were what when where whether which while who whom whose why will with within without would " +
    "you your yours shishya exam exams answer answers mean means meaning example examples detail detailed briefly " +
    "short simple simply important topic topics study notes help"
  ).split(" "),
);

/** The turn's content words: letters or digits, 3+ chars (numbers 1+), no stop words, at most 8. */
export function contentTerms(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.toLowerCase().match(/[a-z][a-z'-]{2,}|\d+(?:st|nd|rd|th)?/g) ?? []) {
    const w = raw.replace(/'s$/, "").replace(/^-+|-+$/g, "");
    if (!w || STOP.has(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= 8) break;
  }
  return out;
}

/** An OR tsquery over the terms, each quoted so no operator in a word can leak in. */
export function orTsQuery(terms: string[]): string {
  return terms.map((t) => `'${t.replace(/'/g, "")}'`).join(" | ");
}

function optionText(options: unknown, key: string): string {
  if (!Array.isArray(options)) return "";
  const o = (options as { key?: string; text?: string }[]).find((x) => x?.key === key);
  return o?.text ?? "";
}

/**
 * The closest verified bank questions for a tutor turn (English bank only).
 * `minShared` content words must appear in a hit (default 2).
 */
export async function groundFromBank(
  prisma: PrismaClient,
  turn: string,
  opts: { limit?: number; minShared?: number } = {},
): Promise<Grounding> {
  const t0 = Date.now();
  const terms = contentTerms(turn);
  if (terms.length < 2) return { items: [], terms, ms: Date.now() - t0 };
  const limit = Math.min(opts.limit ?? 4, 8);
  const rows = await prisma.$queryRawUnsafe<
    { id: string; body: string; options: unknown; answerKey: string; solution: string | null; rank: number }[]
  >(
    `SELECT id, body, options, "answerKey", solution,
            ts_rank_cd(to_tsvector('english', body || ' ' || coalesce(solution, '')), to_tsquery('english', $1)) AS rank
       FROM "Question"
      WHERE validated AND language = 'EN'
        AND to_tsvector('english', body || ' ' || coalesce(solution, '')) @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT $2`,
    orTsQuery(terms),
    limit * 4,
  );
  const minShared = opts.minShared ?? 2;
  const items: GroundItem[] = [];
  for (const r of rows) {
    const hay = `${r.body} ${r.solution ?? ""}`.toLowerCase();
    const shared = terms.filter((t) => hay.includes(t)).length;
    if (shared < minShared) continue;
    items.push({
      id: r.id,
      question: r.body.trim(),
      answer: `${r.answerKey}) ${optionText(r.options, r.answerKey)}`.trim(),
      solution: (r.solution ?? "").trim().slice(0, 600),
      rank: Number(r.rank),
      shared,
    });
    if (items.length >= limit) break;
  }
  return { items, terms, ms: Date.now() - t0 };
}

/** The block the local model gets: the only specific facts it may state. */
export function groundingBlock(g: Grounding): string {
  if (!g.items.length) return "";
  const lines = g.items.map(
    (it, i) => `${i + 1}. Q: ${it.question.replace(/\s+/g, " ")}\n   Verified answer: ${it.answer}${it.solution ? `\n   Solution: ${it.solution.replace(/\s+/g, " ")}` : ""}`,
  );
  return (
    "VERIFIED FACTS (Shishya's checked question bank). For any specific fact — an article, amendment, act, " +
    "schedule or scheme number or name, a date or year, a ruler, dynasty, founder or place — state it only if it " +
    "appears in these entries, in the exam facts or syllabus above, in a tool result or in the student's own words. " +
    "If the fact you would need is not there, say plainly that you are not sure of it and point the student to the " +
    "topic's notes or practice instead of guessing.\n" +
    lines.join("\n")
  );
}
