// A streamed local reply, checked one sentence at a time before the student
// sees it (13 Oct 2026). The local model streams (first words in a few
// seconds instead of a 20-40 s spinner), but nothing reaches the screen until
// its sentence has passed the same checks as a held-back reply
// (ai/tutor-router.ts unsupportedFacts):
//   • a Shishya link or topic code the context does not hold is replaced:
//     a link by the exam's hub (when the context names the exam) or removed,
//     a topic code by plain text — the sentence stays;
//   • a sentence with a specific fact (article, amendment, year, amount) or a
//     marking claim the context does not support is DROPPED — a wrong fact is
//     never shown, and the rest of the answer still reads.
// The <<ACTIONS>> block is not shown at all (ReplyStreamFilter holds it back);
// its topic codes are checked separately (cleanActions).
// Pure: no DB, no network.

import { unsupportedLinks, unsupportedFacts } from "@/lib/ai/tutor-router";

export interface GateStats {
  sentences: number;
  dropped: string[];
  repairedLinks: number;
}

/** Split off every complete sentence/line at the front of `buf`; the rest waits. */
export function takeSentences(buf: string): { done: string[]; rest: string } {
  const done: string[] = [];
  let start = 0;
  // A unit ends at a newline, or at . ! ? followed by whitespace — not inside
  // a decimal ("2.5") or an abbreviation followed by a digit ("No. 5").
  const re = /\n|[.!?](?=\s)(?<!\d\.(?=\d))/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(buf))) {
    const end = m.index + m[0].length;
    done.push(buf.slice(start, end));
    start = end;
  }
  return { done, rest: buf.slice(start) };
}

/** Replace links the context does not hold; plain-text topic codes it does not hold. */
export function repairLinks(unit: string, context: string, examCode: string | null): { text: string; repaired: number } {
  let repaired = 0;
  let text = unit;
  for (const bad of unsupportedLinks(unit, context)) {
    repaired++;
    if (bad.startsWith("`")) {
      text = text.replace(bad, bad.slice(1, -1).split(".").pop()!.replace(/_/g, " "));
    } else {
      const hub = examCode && context.includes(examCode) ? `https://shishya.in/exams/${examCode}` : "";
      text = hub ? text.replace(bad, hub) : text.replace(bad, "").replace(/\(\s*\)|\[\s*\]/g, "");
    }
  }
  return { text, repaired };
}

/** One sentence through the gate: the text to show ("" = dropped). */
export function gateUnit(unit: string, context: string, examCode: string | null, stats: GateStats): string {
  if (!unit.trim()) return unit;
  stats.sentences++;
  const { text, repaired } = repairLinks(unit, context, examCode);
  stats.repairedLinks += repaired;
  const bad = unsupportedFacts(text, context);
  if (bad.length) {
    stats.dropped.push(unit.trim().slice(0, 160));
    // Keep the line break a dropped line carried, so lists and paragraphs stay apart.
    return unit.endsWith("\n") ? "\n" : "";
  }
  return text;
}

/** Topic codes in suggested actions must exist in the context; others are removed. */
export function cleanActions<T extends { topicCode?: string | null }>(actions: T[] | undefined, context: string): T[] | undefined {
  if (!actions) return actions;
  return actions.filter((a) => !a.topicCode || context.includes(a.topicCode));
}
