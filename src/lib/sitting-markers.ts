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
// 1 Oct 2026 (the dry crawl of 30 Sep: MHT-CET's PCB second-attempt result
// was labelled "PCM Group Second Attempt", and its "siblings" were the PCM
// first-attempt press note, the PCB first-attempt notification and the
// Nursing and DPN/PHN CET results, all on the State CET Cell's one page):
//   group    the PCM / PCB subject group ("PCM Group", "(PCB)") — never a
//            numbered "Group 2" / "Group-IV", which names an exam or a post
//   attempt  "First Attempt", "2nd-Attempt", "Attempt-II"
//   cet      which CET of a body that runs several on one page: MHT-CET,
//            Nursing CET, DPN/PHN CET, B.Ed / M.Ed / B.P.Ed CET, LL.B / Law
//            CET, MBA/MMS CET, MCA CET … and the AP / TS EAPCET, ECET, ICET,
//            EdCET, PGECET, PECET, LAWCET, PGLCET
// 1 Oct 2026 (the review of a326ddb left two pairs of sittings the gate could
// not tell apart — it only kept the wrong LABEL off them, and let the release
// through):
//   postgroup  the post group a recruitment runs a sitting for, a letter A–D:
//            "Group C", "Group-D", "Group 'C'", "Grp. D", "ग्रुप-डी", "समूह ग"
//            (HSSC holds one CET for Group C and another for Group D; PSSSB
//            names its keys "…for Group-D Post…") — never the PCM / PCB
//            subject group, never a numbered "Group 2" / "Group-IV", never
//            "GRP" without its dot (the Government Railway Police of UP /
//            Bihar police notices: "GRP B Company" is no post group)
//   gender   the sex an event is held for: "Male PE&MT" / "Female PE&MT"
//            (Delhi Police), "Males" / "Females", "Men" / "Women", "Mahila",
//            पुरुष / महिला — never "Ex-Service Men", never the Women and Child
//            Development department ("महिला एवं बाल विकास विभाग")
// In these two families a value named on its own outranks a list of them:
// SSC's row "Constable (Executive) Male and Female in Delhi Police
// Examination, 2026 - Male PE&MT result" is the male result — the list is the
// exam's own name. A text that names only a list ("Male & Female PE&MT",
// "Group C and D") names every value in it, as a numbered list does.
// Parts of ONE sitting (paper, day, shift, set, level, slot, a numbered
// group) and test types (PET, typing, interview) are never compared: a
// "Paper-I key" belongs to the sitting whose last day held Paper 2, and
// "qualified for the skill test" is still that stage's result.

import { asciiDigits } from "@/lib/official-papers";

export type MarkerFamily =
  | "pm"
  | "tier"
  | "phase"
  | "cbt"
  | "stage"
  | "session"
  | "sitting"
  | "cen"
  | "group"
  | "attempt"
  | "cet"
  | "postgroup"
  | "gender";

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

// 1 Oct 2026. "PCM Group", "(PCB )", "PCB-Group" — never "PCMB".
const GROUP_RE = /(?<![\p{L}\p{N}])(pcm|pcb)(?![\p{L}\p{N}])/giu;
const ATTEMPT_WORD: Readonly<Record<string, string>> = { first: "1", second: "2", third: "3", fourth: "4", "1st": "1", "2nd": "2", "3rd": "3", "4th": "4" };
// "Second Attempt", "2nd-Attempt", "1st Attempt"; "Attempt-2", "Attempt II".
const ATTEMPT_BEFORE_RE = /(?<![\p{L}\p{N}])(first|second|third|fourth|1st|2nd|3rd|4th)[\s\-–_]*attempt(?![\p{L}])/giu;
const ATTEMPT_AFTER_RE = /(?<![\p{L}])attempt[\s\-–:_]*(iv|i{1,3}|[1-4])(?![\p{L}\p{N}])/giu;
// Which CET of a body that runs several (the State CET Cell of Maharashtra
// lists them all on one page; AP / TS councils name theirs as one word).
const SEP = "[\\s\\-–_]*";
const CET_FAMILIES: readonly (readonly [string, RegExp])[] = [
  ["mht", new RegExp(`(?<![\\p{L}])mht${SEP}cet(?![\\p{L}])`, "iu")],
  ["nursing", new RegExp(`(?<![\\p{L}])nursing${SEP}cet(?![\\p{L}])`, "iu")],
  ["dpn-phn", new RegExp(`(?<![\\p{L}])(?:dpn|phn)(?:\\s*[/&]\\s*(?:dpn|phn))?${SEP}cet(?![\\p{L}])`, "iu")],
  ["bped", new RegExp(`(?<![\\p{L}])b\\.?\\s*p\\.?\\s*ed\\.?${SEP}cet(?![\\p{L}])`, "iu")],
  ["mped", new RegExp(`(?<![\\p{L}])m\\.?\\s*p\\.?\\s*ed\\.?${SEP}cet(?![\\p{L}])`, "iu")],
  // "B.Ed CET", "B.Ed-M.Ed (Integrated) CET", "B.A./B.Sc.-B.Ed CET".
  ["bed", new RegExp(`(?<![\\p{L}])b\\.?\\s*ed\\.?(?:\\s*[-–/]\\s*m\\.?\\s*ed\\.?)?(?:\\s*\\([^)]{0,40}\\))?${SEP}cet(?![\\p{L}])`, "iu")],
  ["med", new RegExp(`(?<![\\p{L}])m\\.?\\s*ed\\.?${SEP}cet(?![\\p{L}])`, "iu")],
  // "MAH-LL.B.(3 Yrs.)-CET", "LLB 5 Yrs CET", "Law CET", "LAWCET".
  ["law", new RegExp(`(?<![\\p{L}])(?:ll\\.?\\s*b\\.?(?:\\s*\\([^)]{0,20}\\)|\\s*\\d\\s*yrs?\\.?)?|law)${SEP}cet(?![\\p{L}])`, "iu")],
  ["mba", new RegExp(`(?<![\\p{L}])(?:mba|mms)(?:\\s*/\\s*(?:mba|mms))?${SEP}cet(?![\\p{L}])`, "iu")],
  ["mca", new RegExp(`(?<![\\p{L}])mca${SEP}cet(?![\\p{L}])`, "iu")],
  ["bhmct", new RegExp(`(?<![\\p{L}])b\\.?\\s*hmct${SEP}cet(?![\\p{L}])`, "iu")],
  ["march", new RegExp(`(?<![\\p{L}])m\\.?\\s*arch\\.?${SEP}cet(?![\\p{L}])`, "iu")],
  ["bdesign", new RegExp(`(?<![\\p{L}])b\\.?\\s*design${SEP}cet(?![\\p{L}])`, "iu")],
  ["bplanning", new RegExp(`(?<![\\p{L}])b\\.?\\s*planning${SEP}cet(?![\\p{L}])`, "iu")],
  ["eapcet", /(?<![\p{L}])(?:eapcet|eamcet)(?![\p{L}])/iu],
  ["ecet", /(?<![\p{L}])ecet(?![\p{L}])/iu],
  ["icet", /(?<![\p{L}])icet(?![\p{L}])/iu],
  ["edcet", /(?<![\p{L}])edcet(?![\p{L}])/iu],
  ["pgecet", /(?<![\p{L}])pgecet(?![\p{L}])/iu],
  ["pecet", /(?<![\p{L}])pecet(?![\p{L}])/iu],
  ["law", /(?<![\p{L}])lawcet(?![\p{L}])/iu],
  ["pglcet", /(?<![\p{L}])pglcet(?![\p{L}])/iu],
];

// 1 Oct 2026. Post groups and genders (see the header): each hit is one value
// on its own, or a list of values ("Group C & D", "Male and Female").
interface FamilyHit {
  values: string[];
  at: number;
  end: number;
}

const GROUP_LETTER: Readonly<Record<string, string>> = {
  a: "a", b: "b", c: "c", d: "d", ए: "a", बी: "b", सी: "c", डी: "d", क: "a", ख: "b", ग: "c", घ: "d",
};
// 1 Oct 2026 (review): "grp" only with its dot — a bare "GRP" is the
// Government Railway Police ("GRP B Company", "Constable GRP a list").
const GROUP_WORD = "(?:group|grp\\.|ग्रुप|समूह)\\s*[-–:]?\\s*";
const QUOTE_OPEN = "[\"'‘’“”(]?\\s*";
const QUOTE_CLOSE = "\\s*[\"'‘’“”)]?";
const NOT_WORD_AFTER = "(?![\\p{L}\\p{M}\\p{N}])";
/** A list's later letter: never a bare "a" before a word ("Group C or a
 *  higher post") — only an "a" that ends the text or a clause. */
const LATER_LETTER = "(?:[b-d]|a(?=\\s*(?:$|[^\\p{L}\\p{M}\\s]))|ए|बी|सी|डी|क|ख|ग|घ)";
const LIST_SEP = "\\s*(?:,|&|/|\\+|and|or|एवं|व|तथा|और|या)\\s*";
const POSTGROUP_RE = new RegExp(
  `(?<![\\p{L}\\p{M}\\p{N}])${GROUP_WORD}${QUOTE_OPEN}([a-d]|ए|बी|सी|डी|क|ख|ग|घ)${QUOTE_CLOSE}${NOT_WORD_AFTER}` +
    `((?:${LIST_SEP}(?:${GROUP_WORD})?${QUOTE_OPEN}${LATER_LETTER}${QUOTE_CLOSE}${NOT_WORD_AFTER})*)`,
  "gu",
);
const LATER_LETTER_ALL = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])${LATER_LETTER}${NOT_WORD_AFTER}`, "gu");

/** "Female(s)", "Women", "Mahila", महिला(ओं) | "Male(s)", "Men", पुरुष(ों).
 *  1 Oct 2026 (review): plurals read ("List of Females qualified…"); the
 *  Women and Child Development department is no sex ("Women and Child
 *  Development Department", "महिला एवं बाल विकास विभाग"). */
const GENDER_RE =
  /(?<![\p{L}\p{M}])(?:((?:females?|women|mahila|महिला(?:ओं|एं|ए|ओ)?)(?![\p{L}\p{M}])(?!\s*(?:and|&|एवं|और|व|तथा)\s*(?:child|बाल)))|(males?|(?<!service[\s\-–]?)men|पुरुष(?:ों|ो)?))(?![\p{L}\p{M}])/gu;
const GENDER_LIST_SEP = new RegExp(`^${LIST_SEP}$`, "u");

/** A value named on its own outranks a list (see the header); only lists →
 *  every value of every list. */
function countedHits(hits: FamilyHit[]): FamilyHit[] {
  const single = hits.filter((h) => h.values.length === 1);
  return single.length ? single : hits;
}

function postGroupHits(lower: string): FamilyHit[] {
  const hits: FamilyHit[] = [];
  for (const m of lower.matchAll(POSTGROUP_RE)) {
    const values = new Set([GROUP_LETTER[m[1]]]);
    for (const l of (m[2] ?? "").replace(new RegExp(GROUP_WORD, "gu"), " ").matchAll(LATER_LETTER_ALL)) values.add(GROUP_LETTER[l[0]]);
    const at = m.index ?? 0;
    hits.push({ values: [...values].filter(Boolean), at, end: at + m[0].length });
  }
  return hits.filter((h) => h.values.length > 0);
}

function genderHits(lower: string): FamilyHit[] {
  const words = [...lower.matchAll(GENDER_RE)].map((m) => ({ value: m[1] ? "female" : "male", at: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  const hits: FamilyHit[] = [];
  for (let i = 0; i < words.length; i++) {
    const a = words[i];
    const b = words[i + 1];
    // "Male and Female", "Men & Women", "पुरुष एवं महिला": one list.
    if (b && b.value !== a.value && GENDER_LIST_SEP.test(lower.slice(a.end, b.at))) {
      hits.push({ values: [a.value, b.value], at: a.at, end: b.end });
      i++;
    } else hits.push({ values: [a.value], at: a.at, end: a.end });
  }
  return hits;
}

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

/** The text every marker regex reads: Indic digits → ASCII, lower case, runs
 *  of white space → one space. */
function markerText(text: string): string {
  return asciiDigits(text ?? "").toLowerCase().replace(/\s+/g, " ");
}

/** The markers of one text, as "family:value" ("tier:1", "pm:prelims",
 *  "sitting:2"). */
export function sittingMarkers(text: string, names: readonly string[] = []): Set<string> {
  const lower = markerText(text);
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
  for (const m of lower.matchAll(GROUP_RE)) out.add(`group:${m[1]}`);
  for (const m of lower.matchAll(ATTEMPT_BEFORE_RE)) out.add(`attempt:${ATTEMPT_WORD[m[1]]}`);
  for (const m of lower.matchAll(ATTEMPT_AFTER_RE)) {
    const o = ordinal(m[1]);
    if (o) out.add(`attempt:${o}`);
  }
  for (const [value, re] of CET_FAMILIES) if (re.test(lower)) out.add(`cet:${value}`);
  for (const h of countedHits(postGroupHits(lower))) for (const v of h.values) out.add(`postgroup:${v}`);
  for (const h of countedHits(genderHits(lower))) for (const v of h.values) out.add(`gender:${v}`);
  return out;
}

const PRELIMS_ALL = new RegExp(PRELIMS_RE.source, "giu");
const MAINS_ALL = new RegExp(MAINS_RE.source, "giu");
const CET_ALL: readonly RegExp[] = CET_FAMILIES.map(([, re]) => new RegExp(re.source, "giu"));

/** 1 Oct 2026 (independent review of the gate fix). The spans of a text that
 *  make a marker — exactly the matches sittingMarkers reads (a post-group /
 *  gender list it outranks included), on the same normalised text (`text` in the result: Indic digits → ASCII, lower case,
 *  one space per run of white space). A bracketed sitting numeral's span is
 *  the bracket only ("Varg (2)" keeps "varg"); a "(I)" after "Paper" is no
 *  marker and no span. Why: the verified stage dropped every word a marker
 *  regex COULD read ("first", "second", "phase", "nursing", "law" …) and every
 *  number, so "Second Phase" was verified on a "First Phase" row and "Paper
 *  2" on a "Paper-I" row. Now only a marker's own span is compared as a
 *  marker; every other word of a label is a claim the body must print. */
export function markerSpans(text: string, names: readonly string[] = []): { text: string; spans: [number, number][] } {
  const lower = markerText(text);
  const spans: [number, number][] = [];
  const add = (m: RegExpMatchArray, from = 0) => {
    const at = m.index ?? 0;
    spans.push([at + from, at + m[0].length]);
  };
  for (const m of lower.matchAll(PRELIMS_ALL)) add(m);
  for (const m of lower.matchAll(MAINS_ALL)) add(m);
  for (const m of lower.matchAll(NUMBERED_RE)) if (m[2].split(/\s*(?:,|&|\/|and|or)\s*/).some((p) => ordinal(p))) add(m);
  for (const m of lower.matchAll(BRACKET_RE)) {
    if (m[1] && NOT_SITTING_WORDS.has(m[1])) continue;
    if (ordinal(m[2])) add(m, m[0].indexOf("("));
  }
  const heads = ["examination", "exam", ...names.map((n) => n.toLowerCase().replace(/_/g, " ").trim()).filter((n) => n.length >= 2)];
  for (const h of heads) {
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRe(h)}s?[\\s\\-–]*(iv|i{1,3}|0?[1-4])(?![\\p{L}\\p{N}])`, "giu");
    for (const m of lower.matchAll(re)) if (ordinal(m[1])) add(m);
  }
  for (const m of lower.matchAll(CEN_RE)) add(m);
  for (const m of lower.matchAll(GROUP_RE)) add(m);
  for (const m of lower.matchAll(ATTEMPT_BEFORE_RE)) add(m);
  for (const m of lower.matchAll(ATTEMPT_AFTER_RE)) if (ordinal(m[1])) add(m);
  for (const re of CET_ALL) for (const m of lower.matchAll(re)) add(m);
  // Every post-group / gender hit, an outranked list too ("Male and Female"
  // in the exam's own name): its words are marker words, never a claim.
  for (const h of [...postGroupHits(lower), ...genderHits(lower)]) spans.push([h.at, h.end]);
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: [number, number][] = [];
  for (const s of spans) {
    const last = merged[merged.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else merged.push([s[0], s[1]]);
  }
  return { text: lower, spans: merged };
}

/** The text (normalised as markerSpans) with every marker span replaced by
 *  `by` — what a label says beyond its markers. */
export function stripMarkerSpans(text: string, names: readonly string[] = [], by = " "): string {
  const { text: lower, spans } = markerSpans(text, names);
  let out = "";
  let at = 0;
  for (const [a, b] of spans) {
    out += `${lower.slice(at, a)}${by}`;
    at = b;
  }
  return out + lower.slice(at);
}

/** The markers an exam's own names carry that hold for every row of it: only
 *  the "cet" family (MHT-CET is never the Nursing CET). A name's tier /
 *  stage ("SSC CHSL (Tier 1)") is the tracker's first stage, not the exam's —
 *  never taken from a name. */
export function examFamilyMarkers(names: readonly string[]): Set<string> {
  const out = new Set<string>();
  for (const n of names) for (const m of sittingMarkers(n)) if (familyOf(m) === "cet") out.add(m);
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
  // 1 Oct 2026: "अन्तिम" is how UPPRPB spells "final" ("अन्तिम चयन परिणाम").
  const fin = /(?<![\p{L}])final(?![\p{L}])|अंतिम|अन्तिम|తుది/u.test(t);
  const other =
    kind === "ANSWER_KEY"
      ? /provisional|tentative|(?:preliminary|initial)\s*(?:answer\s*)?key|model\s+answer|अनंतिम|अनन्तिम|ప్రాథమిక|ప్రారంభ/u.test(t)
      : /(?<![\p{L}])written(?![\p{L}])|लिखित|రాత/u.test(t);
  if (fin === other) return null;
  return fin ? "final" : kind === "ANSWER_KEY" ? "provisional" : "written";
}
