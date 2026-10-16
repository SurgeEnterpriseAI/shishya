// Checks on a LOCAL tutor reply written in Hindi or Marathi (16 Oct 2026,
// founder: "use the model for the intelligence; the harness makes sure the
// quality is what the student needs"). From the 16 Oct language evals, the
// local model's real failures were not the language itself:
//   - it presented "your mock questions" with options when no tool had
//     returned any question — invented exam content;
//   - foreign letters slipped in (Korean in a Tamil reply);
//   - it printed the same answer twice.
// Any one of these sends the turn to Claude. Pure: no model, no DB.

const DEVANAGARI = /(?=\p{L})[ऀ-ॿ]/gu; // letters only: vowel signs are marks, not letters
const LETTER = /\p{L}/gu;
// Scripts that never belong in a Hindi/Marathi reply: other Indic scripts,
// Arabic, Cyrillic, Greek letters used as text, CJK, Hangul, Thai.
const FOREIGN = /[ঀ-෿؀-ۿЀ-ӿ฀-๿぀-ヿ㐀-鿿가-힯]/;
// An option line: "A) …", "(B) …", "C. …", "विकल्प A …".
const OPTION_LINE = /^\s*(?:[-*•]\s*)?(?:\(?[A-D]\)|[A-D][.)]|विकल्प\s*[A-D])\s+\S/gm;

/** Share of letters that are Devanagari (0..1); Latin exam terms and formulas count against it. */
export function devanagariLetterShare(text: string): number {
  const letters = text.match(LETTER)?.length ?? 0;
  if (!letters) return 0;
  return (text.match(DEVANAGARI)?.length ?? 0) / letters;
}

/** Same paragraph (≥ 80 chars) printed twice. */
export function hasRepeatedParagraph(text: string): boolean {
  const seen = new Set<string>();
  for (const p of text.split(/\n\s*\n/)) {
    const k = p.replace(/\s+/g, " ").trim();
    if (k.length < 80) continue;
    if (seen.has(k)) return true;
    seen.add(k);
  }
  return false;
}

/**
 * Why this local Hindi/Marathi reply must not be shown, or null.
 * `toolText` = everything the tools returned this turn (JSON as text).
 */
export function indicReplyProblem(reply: string, toolText: string): string | null {
  if (FOREIGN.test(reply)) return "foreign script in the reply";
  if (devanagariLetterShare(reply) < 0.5) return "not written in Devanagari";
  if (hasRepeatedParagraph(reply)) return "a paragraph printed twice";
  const options = reply.match(OPTION_LINE)?.length ?? 0;
  if (options >= 3 && !/"options"\s*:/.test(toolText)) return "shows question options no tool returned";
  return null;
}

const LANG_NAME: Record<string, string> = { HI: "Hindi", HINDI: "Hindi", MR: "Marathi", MARATHI: "Marathi" };

/**
 * The local model's own rule for a Hindi/Marathi turn (16 Oct 2026 eval: with
 * only the prompt's "Reply language: HI" line it answered 10 of 18 such turns
 * in English). Null when the prompt asks for neither language.
 */
export function indicLanguageRule(systemText: string): string | null {
  const m = /Reply language:\s*([A-Za-z]+)/.exec(systemText);
  const name = m ? LANG_NAME[m[1].toUpperCase()] : undefined;
  if (!name) return null;
  return (
    `Language rule: write your ENTIRE reply in ${name}, in Devanagari script — every heading, sentence and explanation. ` +
    `Keep exam names, formulas, numbers, option letters and links exactly as they are. ` +
    `Talk about the student's own mistakes or questions only when a tool returned them; if none came back, say so and offer to fetch them — never write questions yourself.`
  );
}
