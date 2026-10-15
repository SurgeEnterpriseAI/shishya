// Which tutor turns Surge's local model may answer, and the check its answer
// must pass (13 Oct 2026, founder: "local server first; Claude only where the
// server cannot do it or errors; quality not compromised").
//
// Evidence (13 Oct audit, scratchpad/llm-audit tutor-anon / tutor-signedin):
// Qwen loses on recalled facts ("104th = women's reservation", invented state
// schemes, a wrong series key, grading a right pick wrong) and on very short,
// Hinglish and quiz-review turns. It ties or wins on explanations, plans and
// how-to. So a turn is sorted four ways:
//   • "claude"  — kinds the audit says Qwen cannot do as well: Hinglish,
//                 ≤ 3 words, a quiz to review, a number series / puzzle,
//                 and general-knowledge TEACHING (history, culture, polity,
//                 geography, current affairs…) with no student data behind it:
//                 the router eval round 2 (13 Oct) had Qwen invent Shivaji's
//                 ministers and the Samyukta Maharashtra leaders — names the
//                 fact check cannot verify.
//   • "fact"    — a short fact question: answered locally ONLY with verified
//                 bank entries in the prompt (ai/grounding.ts), the reply held
//                 back until unsupportedFacts() finds nothing.
//   • "check"   — a mistake review or practice flow (the tools supply the
//                 questions, keys and solutions): local, but held back and
//                 checked whole; anything unsupported → Claude. No sentence
//                 dropping here — that left empty headings in round 2.
//   • "general" — explanation, plan, method, motivation: local, streamed.
// Pure: no DB, no network.

export type TurnRoute = "claude" | "fact" | "check" | "general";

export interface TurnDecision {
  route: TurnRoute;
  reasons: string[];
}

// Romanized Hindi function words (a Hinglish turn: Claude, audit 2/139 guest turns, one critical).
const HINGLISH = /\b(bta|btao|krna|kro|mai|mein|hota|hoti|kya|hai|hain|kaise|kaisa|kyu|kyun|kitna|kitne|kaun|kab|kahan|mujhe|mera|meri|batao|bataye|samjhao|karo|kare|karna|nahi|nahin|aur|bhi|wala|wali|ke liye|ho gaya|chahiye)\b/gi;

const FACT_CUES = new RegExp(
  [
    "\\barticles?\\s+\\d", "\\bamendments?\\b", "\\bschedules?\\b", "\\bact\\b", "\\bacts\\b", "\\bschemes?\\b", "\\byojana\\b",
    "\\bmission\\b", "\\bpolicy\\b", "\\bdynast", "\\bking\\b", "\\bruler", "\\bempire\\b", "\\btemple\\b", "\\bfort\\b",
    "\\bbattle\\b", "\\btreaty\\b", "\\bfounded\\b", "\\bestablished\\b", "\\binaugurat", "\\bcapital of\\b",
    "\\bwho (?:was|is|were|wrote|founded|built|discovered|invented|won)\\b", "\\bwhen (?:was|were|did)\\b",
    "\\bwhich (?:state|year|dynasty|river|article|amendment|country|city|district|ruler|king|act|scheme)\\b",
    "\\b(?:first|largest|longest|highest|smallest|oldest)\\b", "\\b(?:1[5-9]|20)\\d{2}\\b", "\\bcensus\\b",
    "\\bgovernor\\b", "\\bchief minister\\b", "\\bprime minister\\b", "\\bpresident\\b", "\\bcommission\\b",
    "\\bconstitution", "\\bpanchayat", "\\bfundamental (?:rights?|duties)\\b", "\\bdirective principles?\\b",
  ].join("|"),
  "i",
);

const SERIES = /\b(next (?:number|term)|missing (?:number|term)|find the (?:next|missing)|series)\b|(?:\b\d+\s*,\s*){3,}\d+/i;
// Pasted options or "explain these questions". A bare "I got 0/3 on Current
// Affairs" is a signed-in weak-topic request the tools answer (router eval 13 Oct).
const QUIZ_REVIEW = /(^|\n)\s*\(?[A-D]\)[\s\S]*\n\s*\(?[B-D]\)|\bexplain (?:these|the) questions\b/i;
// "next", "next mistake": a short turn that continues a tool flow, not a guess at intent.
const CONTINUE_FLOW = /^(?:next|next (?:mistake|one|question|topic)|show (?:the )?next(?: mistake)?|continue|go on|one more)[.!]?$/i;

// A turn that asks for the answer in an Indian language ("Hindi m trick bta do",
// "explain in Telugu"): the reply must switch language, which Qwen missed in the
// router eval (13 Oct, i2feqj — answered in English).
const ASKS_INDIAN_LANGUAGE = /\b(?:in|me|mein|m|mai|lo)\s+(?:hindi|telugu|tamil|kannada|marathi|bengali|bangla|gujarati|malayalam|odia|punjabi|urdu)\b|\b(?:hindi|telugu|tamil|kannada|marathi|bengali|bangla|gujarati|malayalam|odia|punjabi|urdu)\s+(?:m|me|mein|mai|lo|mo|madhe)\b/i;

// Subjects whose answers are mostly names, dates and places Qwen recalls badly.
const GK_SUBJECT =
  /\b(?:history|historical|ancient|medieval|dynast\w*|empire|kingdom|movement|freedom|struggle|revolt|uprising|culture|cultural|heritage|arts?|architecture|literature|poets?|saints?|festivals?|tribes?|tribal|geography|rivers?|mountains?|national parks?|wildlife|polity|constitution\w*|current affairs|static gk|gk|general (?:knowledge|awareness|studies)|economy of|schemes?|yojana|personalit(?:y|ies)|awards?|sports|important days)\b/i;
// The student's own data or the bank supplies the content: a mistake review, "next
// mistake", a practice / quiz request answered with find_questions_on_topic.
const DATA_FLOW =
  /\bgot \d+ questions? wrong\b|\bgo through (?:my|the|these) mistakes\b|\bmistakes?\b.*\b(?:mock|quiz|test)\b|^(?:next|next (?:mistake|one|question)|show (?:the )?next(?: mistake)?)[.!]?$|\bquiz me\b|\b(?:practice|mcqs?)\b|\b(?:give|show) me (?:\d+ |some |more |in ?\w* )?(?:full |detailed )*questions\b/i;
// A short, direct fact question ("Who founded the Kakatiya dynasty?").
const FACT_QUESTION = /^(?:who|when|which|what|where|name)\b|\?\s*$/i;

/** Sort one tutor turn. `message` is the student's text as sent. */
export function routeTutorTurn(message: string): TurnDecision {
  const text = message.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const reasons: string[] = [];
  if (words.length <= 3 && !CONTINUE_FLOW.test(text)) reasons.push("very short turn");
  if ((text.match(HINGLISH) ?? []).length >= 2) reasons.push("Hinglish");
  if (ASKS_INDIAN_LANGUAGE.test(text)) reasons.push("asks for an Indian language");
  if (QUIZ_REVIEW.test(text)) reasons.push("quiz to review");
  if (SERIES.test(text)) reasons.push("number series / puzzle");
  if (reasons.length) return { route: "claude", reasons };
  if (DATA_FLOW.test(text)) return { route: "check", reasons: ["mistake review / practice: held and checked whole"] };
  const shortQuestion = words.length <= 25 && FACT_QUESTION.test(text);
  if (GK_SUBJECT.test(text) && !shortQuestion) return { route: "claude", reasons: ["general-knowledge teaching"] };
  if (FACT_CUES.test(text) || GK_SUBJECT.test(text)) return { route: "fact", reasons: ["leans on a specific fact"] };
  return { route: "general", reasons: [] };
}

// ── The check on a local reply ─────────────────────────────────────────

/** Specific facts in a reply that must be found in the context: the token, and the number it turns on. */
const MONEY_FACT =
  /\b(?:fees?|salary|salaries|pay scale|pay level|stipend|scholarships?|grants?|prize|award|scheme|yojana|assistance|subsidy|pension|allowance|per (?:month|annum|year)|annual(?:ly)?|monthly|budget|allocation|outlay|income limit|family income|cost of (?:the )?(?:form|application))\b/i;
const MONEY_SUM =
  /\b(?:cost price|selling price|marked price|list price|c\.?p\.?|s\.?p\.?|m\.?p\.?|profit|loss|discount|interest|principal|amount after|sold|bought|buys|sells|invest(?:s|ed)?|spent|spends|earns? (?:a|an)? ?(?:profit|loss)|find|calculate|what is the|how much)\b|[=×÷+]/i;

export function factTokens(reply: string): { token: string; key: string }[] {
  const out: { token: string; key: string }[] = [];
  const add = (token: string, key: string) => {
    if (!out.some((o) => o.key === key)) out.push({ token, key });
  };
  for (const m of reply.matchAll(/\b(\d{1,3})(?:st|nd|rd|th)\s+(?:Constitutional\s+)?Amendment/gi)) add(m[0], `amendment ${m[1]}`);
  for (const m of reply.matchAll(/\bAmendment\s+(?:Act\s+)?(?:No\.?\s*)?(\d{1,3})\b/gi)) add(m[0], `amendment ${m[1]}`);
  for (const m of reply.matchAll(/\bArticles?\s+(\d{1,3}[A-Z]?)\b/g)) add(m[0], `article ${m[1].toUpperCase()}`);
  for (const m of reply.matchAll(/\b(\d{1,2})(?:st|nd|rd|th)\s+Schedule\b|\bSchedule\s+([IVX]{1,5}|\d{1,2})\b/gi)) add(m[0], `schedule ${m[1] ?? m[2]}`);
  for (const m of reply.matchAll(/\b(1[5-9]\d{2}|20\d{2})\b/g)) add(m[0], `year ${m[1]}`);
  // Money is a fact only in a real-world sentence (a fee, salary, scholarship,
  // scheme amount) — never in a worked sum: round 3 (13 Oct) dropped the steps of
  // a Profit & Loss example and refused a practice question over "₹4,000".
  for (const m of reply.matchAll(/(?:₹|Rs\.?\s?|INR\s?)\s?(\d[\d,]*(?:\.\d+)?)\s*(lakh|crore|thousand)?/gi)) {
    const at = m.index ?? 0;
    const start = Math.max(reply.lastIndexOf("\n", at), reply.lastIndexOf(". ", at)) + 1;
    const endDot = reply.indexOf(". ", at);
    const endNl = reply.indexOf("\n", at);
    const end = Math.min(...[endDot, endNl, reply.length].filter((i) => i >= 0));
    const sentence = reply.slice(start, end);
    if (MONEY_FACT.test(sentence) && !MONEY_SUM.test(sentence)) add(m[0], `money ${m[1].replace(/,/g, "")}`);
  }
  return out;
}

/** Is this fact's number present in the context (prompt, grounding, tool results, the student's words)? */
function factInContext(key: string, ctx: string): boolean {
  const [kind, value] = key.split(" ");
  const v = value.toLowerCase();
  switch (kind) {
    case "amendment":
      return new RegExp(`\\b${v}(?:st|nd|rd|th)?\\s+(?:constitutional\\s+)?amendment|amendment\\s+(?:act\\s+)?(?:no\\.?\\s*)?${v}\\b`, "i").test(ctx);
    case "article":
      return new RegExp(`\\barticles?\\s+(?:\\d{1,3}[a-z]?\\s*(?:,|and|to|-)\\s*)*${v}\\b`, "i").test(ctx);
    case "schedule":
      return new RegExp(`\\b${v}(?:st|nd|rd|th)?\\s+schedule|schedule\\s+${v}\\b`, "i").test(ctx);
    case "year":
      return ctx.includes(v);
    case "money":
      return ctx.replace(/,/g, "").includes(v);
    default:
      return true;
  }
}

/** Shishya links and topic codes a reply names that the context does not
 *  hold (router eval 13 Oct: the local model built /exams/IOQM/topics/
 *  math.number_theory.modular from memory). A link passes when it appears in
 *  the context as written, or is an exam or topic page built from an exam
 *  code and a topic code that both appear there. */
export function unsupportedLinks(reply: string, context: string): string[] {
  const bad: string[] = [];
  const has = (x: string) => context.includes(x);
  for (const m of reply.matchAll(/(?:https?:\/\/)?(?:www\.)?shishya\.in(\/[^\s)\]>"'`,]*)?/gi)) {
    const path = (m[1] ?? "/").replace(/[.;:!?]+$/, "");
    if (path === "/" || has(path)) continue;
    const exam = path.match(/^\/exams\/([A-Z0-9_]+)(\/.*)?$/);
    if (exam && has(exam[1])) {
      const rest = exam[2] ?? "";
      const topic = rest.match(/^\/topics\/([a-z0-9_.-]+)\/?$/);
      if (!rest || rest === "/" || (topic && has(topic[1]))) continue;
      if (/^\/(?:quiz|pyq|mocks?|syllabus|build-mock|cutoff|notes)\/?(?:\?.*)?$/.test(rest) && has(`/exams/{CODE}${rest.split("?")[0].replace(/\/$/, "")}`)) continue;
    }
    bad.push(m[0]);
  }
  for (const m of reply.matchAll(/`([a-z]+(?:\.[a-z0-9_]+){1,4})`/g)) if (!has(m[1])) bad.push(m[0]);
  return bad;
}

/** A marking-scheme claim (negative marking, marks per question) the context
 *  does not state (router eval 13 Oct: "−1 mark for every wrong answer" for
 *  SSC MTS Paper 1, which has none). */
export function unsupportedMarking(reply: string, context: string): string[] {
  const claims =
    reply.match(
      /[^.\n]*(?:negative marking|marks? (?:will be |is |are )?(?:deducted|cut)|[−-]\s?\d+(?:\.\d+)?\s*marks?\b|\d+(?:\.\d+)?\s*marks? (?:for|per) (?:each|every) (?:correct|wrong|right|incorrect))[^.\n]*/gi,
    ) ?? [];
  if (!claims.length) return [];
  const ctxStates = /negative marking|marks? (?:deducted|per question)|[−-]\s?\d+(?:\.\d+)?\s*marks?|marking scheme/i.test(context);
  return ctxStates ? [] : claims.map((c) => c.trim().slice(0, 120));
}

/** A question / marks count for a topic or section ("expect 2–4 questions from
 *  this area", "carries 10-15 marks") whose numbers the context does not hold.
 *  The exam-facts block forbids per-topic splits it does not list (router eval
 *  round 2, 13 Oct: CAT "2–4 questions"). */
export function unsupportedCounts(reply: string, context: string): string[] {
  const bad: string[] = [];
  const re =
    /\b(?:expect|carr(?:y|ies)|around|about|typically|usually|roughly|nearly)\s+(?:~\s*)?(\d+(?:\s*(?:[-–—]|to)\s*\d+)?)\+?\s*(?:questions?|qs|marks?)\b|\b(\d+(?:\s*(?:[-–—]|to)\s*\d+)?)\+?\s*(?:questions?|qs|marks?)\s+(?:usually |typically |generally )?(?:come |are asked |appear )?(?:from|in) (?:this|the) (?:area|topic|section|chapter|unit|part)\b|\b(\d+(?:\s*(?:[-–—]|to)\s*\d+)?)[\s-]*(?:seconds?|secs?|minutes?|mins?)\s+(?:per question|questions?|each)\b/gi;
  for (const m of reply.matchAll(re)) {
    const nums = (m[1] ?? m[2] ?? m[3] ?? "").match(/\d+/g) ?? [];
    if (nums.length && !nums.every((n) => new RegExp(`\\b${n}\\b`).test(context))) bad.push(m[0].trim().slice(0, 100));
  }
  return bad;
}

/**
 * Everything in a local reply that nothing in the context supports: specific
 * facts, Shishya links / topic codes, marking-scheme claims. Any → the reply
 * is not served; the turn runs on Claude.
 */
export function unsupportedFacts(reply: string, context: string): string[] {
  return [
    ...factTokens(reply).filter((f) => !factInContext(f.key, context)).map((f) => f.token),
    ...unsupportedLinks(reply, context),
    ...unsupportedMarking(reply, context),
    ...unsupportedCounts(reply, context),
  ];
}
