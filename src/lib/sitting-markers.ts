// Sitting / stage markers of a label or of the text beside an official link
// (30 Sep 2026, official-watch review). PURE — no DB, no network.
//
// Why: the release gate (src/lib/answer-key-watch.ts) checked only the
// exam's name and the cycle year. With NDA-II 2026 due (held 14 Sep), UPSC's
// row "Answer Key: National Defence Academy and Naval Academy Examination
// (I), 2026 03/10/2026" passed all five gates and would have been written as
// the NDA-II key (UPSC posts the (I) key after the (I) final result, inside
// the (II) window); with a Tier 2 sitting due, "Final Answer Key of Combined
// Graduate Level Examination 2026 (Tier-I)" passed too. Results have the same
// gap (NDA-I final result vs NDA-II written result, prelims vs mains).
//
// A text and the due sitting CONFLICT when, in one family, both name a value
// and share none:
//   pm       prelims / mains ("Preliminary Key" is a provisional KEY, not
//            the prelims — never counted)
//   tier / phase / cbt / stage / session   a numbered stage; a list
//            ("Tier-I & II", "CBT 1 and 2") names every number in it
//   sitting  the exam's own ordinal: "(I)", "(II)", "Examination-II",
//            "NDA 2", "CDS II", "AFCAT 01/2026"
//   cen      a railway recruitment's own number, "CEN 06/2025" / "CEN No.
//            07/2025" (30 Sep 2026, official listing adapters): RRB lists
//            every notice by CEN, and one exam (RRB NTPC) runs two CENs at
//            once — graduate 06/2025 and undergraduate 07/2025 — whose stages
//            carry the same names ("CBT-2")
// Parts of ONE sitting (paper, day, shift, set, group, level, slot) and test
// types (PET, typing, interview) are never compared: a "Paper-I key" belongs
// to the sitting whose last day held Paper 2, and "qualified for the skill
// test" is still that stage's result.

import { asciiDigits } from "@/lib/official-papers";

export type MarkerFamily = "pm" | "tier" | "phase" | "cbt" | "stage" | "session" | "sitting" | "cen";

const ROMAN: Record<string, number> = { i: 1, ii: 2, iii: 3, iv: 4, v: 5 };

function ordinal(s: string): string | null {
  const t = s.toLowerCase().trim();
  if (ROMAN[t]) return String(ROMAN[t]);
  const n = Number(t);
  return Number.isInteger(n) && n > 0 && n < 20 ? String(n) : null;
}

const NUM = "(?:\\d{1,2}|iv|v|i{1,3})";
const NUMBERED_RE = new RegExp(
  `(?<![\\p{L}\\p{N}])(tier|phase|cbt|stage|session)s?\\s*[-–:]?\\s*(${NUM}(?:\\s*(?:,|&|/|and|or)\\s*${NUM})*)(?![\\p{L}\\p{N}])`,
  "giu",
);
// "Preliminary Key" / "Preliminary Answer Key" (TSPSC's / APPSC's word for a
// provisional key) is not the prelims stage; "Prelims Answer Key" and
// "Preliminary Examination" are.
const PRELIMS_RE = /(?<![\p{L}])prelims?(?![\p{L}])|(?<![\p{L}])preliminary(?![\p{L}])(?!\s*(?:answer\s*)?keys?(?![\p{L}]))|प्रारंभिक\s*परीक्षा|ప్రిలిమ్స్|ప్రాథమిక\s*పరీక్ష/iu;
// "JEE Main 2026" names the exam, not a mains stage: bare "main" counts only
// as "(Main)" or before exam / examination / written.
const MAINS_RE = /(?<![\p{L}])mains(?![\p{L}])|(?<![\p{L}])main\s*(?:exam|examination|written)(?![\p{L}])|\(\s*main\s*\)|मुख्य\s*परीक्षा|మెయిన్స్|ప్రధాన\s*పరీక్ష/iu;

// "CEN 06/2025", "CEN No. 06/2025", "CEN-06/2025", "CEN No 6/2025".
const CEN_RE = /(?<![\p{L}\p{N}])cen\s*(?:no\.?\s*)?[-–:]?\s*(\d{1,2})\s*\/\s*(20\d{2})(?!\d)/giu;

/** Words before a bracketed numeral that make it a part of one sitting
 *  ("Paper (I)", "Annexure (2)"), not the exam's ordinal. */
const NOT_SITTING_WORDS = new Set([
  "paper", "part", "section", "tier", "phase", "stage", "session", "set", "group", "level", "shift", "day", "cbt", "slot",
  "question", "questions", "q", "no", "annexure", "appendix", "schedule", "para", "clause", "rule", "item", "sl", "s", "batch",
  "download", "file", "pdf", "link", "click", "here", "view",
]);
const BRACKET_RE = /(?<![\p{L}\p{N}])(\p{L}+)?[\s.\-–]*\(\s*(iv|i{1,3}|0?[1-4])\s*\)/gu;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** The exam's ordinal as printed: "(II)", "Examination-II", "Exam 2",
 *  "{shortName} 2" / "{shortName}-II" / "{shortName} 01/2026". `names` =
 *  the exam's short names (e.g. ["NDA"]). */
function sittingOrdinals(lower: string, names: readonly string[]): string[] {
  const out: string[] = [];
  for (const m of lower.matchAll(BRACKET_RE)) {
    if (m[1] && NOT_SITTING_WORDS.has(m[1])) continue;
    const o = ordinal(m[2]);
    if (o) out.push(o);
  }
  const heads = ["examination", "exam", ...names.map((n) => n.toLowerCase().replace(/_/g, " ").trim()).filter((n) => n.length >= 2)];
  for (const h of heads) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(h)}s?[\\s\\-–]*(iv|i{1,3}|0?[1-4])(?![\\p{L}\\p{N}])`, "giu");
    for (const m of lower.matchAll(re)) {
      const o = ordinal(m[1]);
      if (o) out.push(o);
    }
  }
  return out;
}

/** The markers of one text, as "family:value" ("tier:1", "pm:prelims",
 *  "sitting:2"). */
export function sittingMarkers(text: string, names: readonly string[] = []): Set<string> {
  const lower = asciiDigits(text ?? "").toLowerCase().replace(/\s+/g, " ");
  const out = new Set<string>();
  if (PRELIMS_RE.test(lower)) out.add("pm:prelims");
  if (MAINS_RE.test(lower)) out.add("pm:mains");
  for (const m of lower.matchAll(NUMBERED_RE)) {
    for (const part of m[2].split(/\s*(?:,|&|\/|and|or)\s*/)) {
      const o = ordinal(part);
      if (o) out.add(`${m[1]}:${o}`);
    }
  }
  for (const o of sittingOrdinals(lower, names)) out.add(`sitting:${o}`);
  for (const m of lower.matchAll(CEN_RE)) out.add(`cen:${m[1].padStart(2, "0")}/${m[2]}`);
  return out;
}

/** The union of the markers of several labels (a sitting's exam days). */
export function sittingMarkersOf(labels: readonly string[], names: readonly string[] = []): Set<string> {
  const out = new Set<string>();
  for (const l of labels) for (const m of sittingMarkers(l, names)) out.add(m);
  return out;
}

export function familyOf(marker: string): MarkerFamily {
  return marker.slice(0, marker.indexOf(":")) as MarkerFamily;
}

export function hasFamily(markers: ReadonlySet<string>, family: MarkerFamily): boolean {
  for (const m of markers) if (familyOf(m) === family) return true;
  return false;
}

/** The first family in which both sides name a value and share none; null
 *  when they agree or one side is silent. */
export function markerConflict(a: ReadonlySet<string>, b: ReadonlySet<string>): MarkerFamily | null {
  const fams = new Set([...a].map(familyOf));
  for (const f of fams) {
    const bf = [...b].filter((m) => familyOf(m) === f);
    if (bf.length === 0) continue;
    if (!bf.some((m) => a.has(m))) return f;
  }
  return null;
}

/** "provisional" / "final" for an answer key, "final" / "written" for a
 *  result — null when the text says neither (or both). Two rows whose
 *  versions differ are different events (a provisional key never replaces
 *  the "final key (expected)" row). */
export function releaseVersion(kind: "ANSWER_KEY" | "RESULT", text: string): string | null {
  const t = (text ?? "").toLowerCase();
  const fin = /(?<![\p{L}])final(?![\p{L}])|अंतिम|తుది/u.test(t);
  const other =
    kind === "ANSWER_KEY"
      ? /provisional|tentative|(?:preliminary|initial)\s*(?:answer\s*)?key|model\s+answer|अनंतिम|ప్రాథమిక|ప్రారంభ/u.test(t)
      : /(?<![\p{L}])written(?![\p{L}])|लिखित|రాత/u.test(t);
  if (fin === other) return null;
  return fin ? "final" : kind === "ANSWER_KEY" ? "provisional" : "written";
}
