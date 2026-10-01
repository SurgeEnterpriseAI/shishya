// Answer keys and results: the official watch (30 Sep 2026). PURE — no DB,
// no network, no model.
//
// Why: answer keys and results are the biggest search moments of an exam,
// and Shishya held the official link for 4 of the 52 exams held in the last
// 90 days (19 answer-key rows, 15 of them cited to coaching sites; a key's
// first row appeared a median 4 days after the key itself). Founder, 30 Sep
// 2026: crawl the official pages once, then a weekly process checks them and
// publishes ONLY what the official site shows.
//
// This file is every rule that decides "released", so it can be tested
// without a network:
//   • selectDue — which (exam, kind) pairs the plan / daily check look at:
//       ANSWER_KEY  an announced exam day in the last AK_DUE_DAYS days and no
//                   official-watch answer-key row since it;
//       RESULT      an announced exam day in the last RESULT_DUE_EXAM_DAYS
//                   days and a result expected in today±RESULT_EXPECTED_DAYS
//                   (a reported / expected tracker row, or exam day + the last
//                   cycle's lag), with no official-watch result row since it;
//       any ANSWER_KEY / RESULT tracker row dated today-21..today+7 that is
//       not official-watch.
//     "hot" (the only pairs the evening check may spend AI on): an answer key
//     whose exam day was 1..10 days ago; a result expected within ±7 days.
//   • extractLinks / classifyLink / examNamed / parsePrintedDates — reading an
//     official listing page as plain HTML.
//   • releaseGate — the five conditions. A row is written only when ALL hold:
//       1. the link (and its listing page, and where a redirect landed) is on
//          an official host (isOfficialSource with the exam's portal; a
//          denylisted host never is);
//       2. OUR fetch of the link in this run answered HTTP 200, and a PDF
//          begins with %PDF;
//       3. the anchor text or its row names an answer-key / result term (en,
//          hi, te), the exam, and the cycle year — and does not announce a
//          FUTURE release ("will be released", "schedule"); and (review, 30
//          Sep 2026) names no OTHER sitting or stage than the due one
//          (src/lib/sitting-markers.ts: "(I)" while (II) is due, "Tier-I"
//          while Tier 2 is due, prelims while mains is due);
//       4. the link is not in the page's baseline (the links it carried when
//          the crawl first read it) nor any earlier hit, so an old cycle is
//          never taken for a new one;
//       5. the date is the ONE date printed beside the link after the
//          sitting's exam days and by today; with none printed, several, or
//          only dates outside that window, the day we first saw it, with a
//          note that says which ("first seen on {host} {date}; the body
//          printed no date" / "…more than one date…" / "…no date printed
//          beside the link falls between the exam and today"). Review, 30 Sep
//          2026: when every printed date is BEFORE the sitting, the link is an
//          older release — rejected, never "first seen today"; and a page
//          with no stored baseline (the crawl's first read, a blocked or
//          script-built page, a page only the AI named) needs the printed
//          date: an undated link there cannot be told from an older cycle's.
//     AI output never writes by itself: its URLs go through the same gate.
//     1 Oct 2026 (the dry crawl of 30 Sep: 6 current releases, 1 right): the
//     exam is named only by a PHRASE (examNamed — a term's words in order and
//     adjacent; a class / stage / place / body word is never a term's only
//     distinctive word); the exam's own CET ("MHT-CET") joins the due
//     sitting's markers.
//   • verifiedStage / releaseLabel — a label names only what the body printed
//     (a sitting label whose markers and words the body's text names, else
//     the body's own title), never our tracker's latest sitting unverified.
//   • groupReleases — a sibling names the exam on its own row, no other
//     stage / group / attempt / CET than the release, and shares its printed
//     day or row; another own-named release is its own; the rest are held.
//   • AiBudget — the per-run hard cap, charged BEFORE each call (the
//     exam-refresh-run pattern) and trued up to the recorded cost after it.
//
// The date / tier rules of every surface are unchanged: a release row is an
// ordinary ExamImportantDate row (confidence 'official', url = the body's
// file, source OFFICIAL_WATCH_SOURCE), so the tracker, the mails and the
// exam-week block read it like any other official row; only rows with this
// source may be called "released" (src/lib/official-release.ts).

import { asciiDigits, yearPrinted } from "@/lib/official-papers";
import { isOfficialSource } from "@/lib/official-source";
import { OFFICIAL_BODIES } from "@/lib/official-domains";
import { istDayNumber } from "@/lib/exam-phase";
import { examFamilyMarkers, familyOf, hasFamily, markerConflict, markerSpans, sittingMarkers, sittingMarkersOf, type MarkerFamily } from "@/lib/sitting-markers";
import {
  FIRST_SEEN_NOTE_PREFIX,
  OFFICIAL_WATCH_SOURCE,
  SUPPRESSED_SOURCE,
  buildTimeline,
  resolveKind,
  type TimelineInput,
  type TimelineRow,
} from "@/lib/exam-timeline";

export { OFFICIAL_WATCH_SOURCE };

export type WatchKind = "ANSWER_KEY" | "RESULT";
export const WATCH_KINDS: readonly WatchKind[] = ["ANSWER_KEY", "RESULT"];

/** How the crawl could read a listing page: "html" readable — as plain HTML
 *  or through the body's own machine-readable source (src/lib/
 *  official-listings.ts: ssc.gov.in's SPA is read through SSC's records
 *  endpoint); "browser-only" only in a browser (a script-built page with no
 *  machine-readable source known — the report says "browser-needed"); "blocked"
 *  not at all (timeouts, 403, a firewall page); "empty" (30 Sep 2026) readable
 *  but listing nothing of the kind (IBPS prints no answer keys) — never
 *  called browser-only. The daily check fetches "html" and "empty" pages
 *  (review, 30 Sep 2026: an "empty" page — a new cycle's page before its
 *  first key — is readable and must not wait for the next crawl). */
export type FetchMode = "html" | "browser-only" | "blocked" | "empty";

// ── windows (plan of 30 Sep 2026, measured on the live tracker) ─────────
/** Keys come a median 3 days after the exam; 45 days covers the late ones. */
export const AK_DUE_DAYS = 45;
/** Results come a median 25 days after the exam, the slow ones months later. */
export const RESULT_DUE_EXAM_DAYS = 180;
export const RESULT_EXPECTED_DAYS = 7;
/** Tracker rows of these kinds this close to today are re-checked. */
export const ROW_DUE_BACK_DAYS = 21;
export const ROW_DUE_AHEAD_DAYS = 7;
/** Hot answer key: exam day this many days ago (inclusive). */
export const HOT_AK_MIN_DAYS = 1;
export const HOT_AK_MAX_DAYS = 10;
/** An upgrade archives the generated rows of the same kind this close. */
export const TWIN_ARCHIVE_DAYS = 30;
/** Exam days this far apart are one sitting (the exam-week window rule). */
const CLUSTER_GAP_DAYS = 14;

// ── per-run limits (vercel.json schedules; plan of 30 Sep 2026) ─────────
/** Estimated cost of one AI check (Sonnet + ≤3 searches): the measured
 *  exam-info call ($0.20 average, 5 searches, 2,069 output tokens) less 2
 *  searches and ~1.4k output tokens. Charged BEFORE each call. */
export const AI_CHECK_COST_USD = 0.15;
export type WatchMode = "plan" | "check" | "evening";
/** Hard AI caps per run: the Monday plan $3.00, the 12:00 IST check $0
 *  (HTML only), the 21:00 IST check $0.90 for at most 6 hot exams. */
/** 1 Oct 2026: the scheduled runs REPORT ONLY (dry) while this is true. The
 *  dry crawl of 30 Sep found 6 current releases and only 1 was right: labels
 *  came from the latest sitting on our tracker, not the body's row ("PET"
 *  for a final selection result, "PCM" for a PCB result), and word-bag exam
 *  naming let "Gujarat Administrative Service, Class-I" match another GPSC
 *  recruitment's row. Both are fixed (verifiedStage, phrase examNamed,
 *  groupReleases). 1 Oct 2026: the re-verified dry report (crawl-2026-09-30-
 *  reverify2: 4 releases, each checked by hand against the body's row — RRB ALP
 *  CBT-2 key, SSC CHSL FRTA shortlist, UP SI final selection, MHT-CET PCB 2nd
 *  attempt; GPSC refused) was read, so writes are back on. Set true again to
 *  make every scheduled run report-only. */
export const WATCH_WRITES_PAUSED = false;

export const RUN_AI_CAP_USD: Readonly<Record<WatchMode, number>> = { plan: 3.0, check: 0, evening: 0.9 };
export const RUN_AI_MAX_EXAMS: Readonly<Record<WatchMode, number>> = { plan: 20, check: 0, evening: 6 };
export const FETCH_TIMEOUT_MS = 12_000;
export const FETCH_CONCURRENCY = 6;
export const TIME_GUARD_MS = 240_000;
/** Review, 30 Sep 2026: an AI check runs a median 33 s (the SDK's default
 *  timeout is 10 min), so none STARTS after this — a call begun at 239 s ran
 *  past maxDuration 300 and lost its AiUsage row. Start by 165 s + the 60 s
 *  request timeout + one guarded candidate (≤ 36 s of fetches) + the write
 *  stays under 300 s. */
export const AI_START_GUARD_MS = TIME_GUARD_MS - 75_000;
/** Per-request timeout of the AI check (no SDK retries — see answer-key-check). */
export const AI_CHECK_TIMEOUT_MS = 60_000;

const DAY_MS = 86_400_000;

// ── small helpers ────────────────────────────────────────────────────────

function hostOf(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return null;
  }
}

/** One spelling per link: lower-case host without www, no fragment, no
 *  trailing slash. Query strings stay (they name files on many portals). */
export function normLink(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname.toLowerCase().replace(/^www\./, "")}${u.port ? `:${u.port}` : ""}${path}${u.search}`;
  } catch {
    return url.trim();
  }
}

/** Midnight UTC of an IST day number — the repo-wide stored-date convention. */
export function dayToDate(day: number): Date {
  return new Date(day * DAY_MS);
}

export function isoOfDay(day: number): string {
  return dayToDate(day).toISOString().slice(0, 10);
}

function dayOf(d: Date | string): number {
  return istDayNumber(d instanceof Date ? d : new Date(d));
}

// ── official hosts (for the AI's web_search allowed_domains) ─────────────

/** The exam portal's host plus the other hosts of the same body in
 *  OFFICIAL_BODIES (ssc.gov.in → ssc.nic.in; the RRB portals). The AI may
 *  search only these; its answers still go through releaseGate. */
export function officialHostsFor(portalUrl: string | null | undefined, extra: readonly string[] = []): string[] {
  const out = new Set<string>();
  const h = hostOf(portalUrl ?? null);
  if (h) {
    out.add(h);
    let bodyName: string | null = null;
    let bestLen = 0;
    for (const [k, name] of Object.entries(OFFICIAL_BODIES)) {
      if ((h === k || h.endsWith(`.${k}`)) && k.length > bestLen) {
        bodyName = name;
        bestLen = k.length;
      }
    }
    if (bodyName) for (const [k, name] of Object.entries(OFFICIAL_BODIES)) if (name === bodyName) out.add(k);
  }
  for (const e of extra) {
    const x = hostOf(/^https?:\/\//i.test(e) ? e : `https://${e}`);
    if (x && isOfficialSource(`https://${x}/`, portalUrl ?? null)) out.add(x);
  }
  return [...out].sort();
}

// ── terms ─────────────────────────────────────────────────────────────────

/** Answer-key words as bodies print them (en / hi / mr / te). "Preliminary
 *  / Initial Key" (TSPSC, APPSC — review, 30 Sep 2026) is a provisional key. */
export const AK_TERM_RE =
  /answer[\s-]*keys?|(?:provisional|tentative|final|revised|model|preliminary|initial)\s+(?:answer\s+)?keys?\b|response\s+sheets?|model\s+answers?|उत्तर[\s-]*(?:कुंजी|कुंजिका|तालिका)|आंसर[\s-]*की|ఆన్సర్[\s-]*కీ|సమాధాన[\s-]*కీ|జవాబు[\s-]*కీ|(?:ప్రాథమిక|తుది|ప్రారంభ)[\s-]*కీ/i;
/** Result words (en / hi / te). */
export const RESULT_TERM_RE =
  /\bresults?\b|merit[\s-]+lists?|select(?:ion|ed)[\s-]+(?:list|candidates)|final\s+selection|score[\s-]*cards?|marks\s+(?:of|secured\s+by)\s+(?:the\s+)?(?:candidates|qualified)|qualified\s+candidates|परिणाम|रिज़ल्ट|रिजल्ट|परीक्षाफल|चयन\s*सूची|ఫలితాలు|ఫలితం|రిజల్ట్|ఎంపిక\s*జాబితా/i;
/** A notice ABOUT a future release is not a release (gate 3). */
export const NOT_RELEASED_RE =
  /\b(?:will|shall)\s+be\s+(?:released|published|uploaded|displayed|declared|available)|\bto\s+be\s+(?:released|published|uploaded|declared)|\bexpected\s+(?:to\s+be\s+)?(?:released|out)|\bschedule\b|\btentative\s+(?:date|dates|calendar)|जारी\s+(?:किया|की)\s+जाएगा|జారీ\s+చేయబడుతుంది|విడుదల\s+చేయనున్నారు/i;

export interface LinkClass {
  ak: boolean;
  result: boolean;
  /** The text announces a future release. */
  future: boolean;
}

export function classifyLink(text: string): LinkClass {
  const t = (text ?? "").replace(/\s+/g, " ");
  return { ak: AK_TERM_RE.test(t), result: RESULT_TERM_RE.test(t), future: NOT_RELEASED_RE.test(t) };
}

export function kindMatches(kind: WatchKind, c: LinkClass): boolean {
  return kind === "ANSWER_KEY" ? c.ak : c.result;
}

/** Words that name no exam by themselves — skipped on both sides when a
 *  term is matched ("Gujarat Administrative Service, Class-I" reads as
 *  "gujarat administrative class 1"). */
const GENERIC_TERMS = new Set([
  "exam", "exams", "examination", "examinations", "test", "tests", "recruitment", "result", "results", "answer", "key",
  "keys", "notice", "notices", "provisional", "final", "board", "commission", "service", "services", "public", "staff",
  "selection", "india", "indian", "state", "level", "post", "posts", "paper", "the", "and", "of", "for", "cbt", "online",
  // 1 Oct 2026 (review of the gate fix): RRB prints "CEN No. 01/2025" as
  // often as "CEN 01/2025" — "no" broke the phrase; "Advt. No." likewise.
  "no", "advt",
]);

/** 1 Oct 2026 (the dry crawl of 30 Sep): words that say which class / stage /
 *  level / group / attempt of an exam — or where, or who conducts it — but
 *  never WHICH exam. They stay in a term's phrase (in order, adjacent) but are
 *  never its only distinctive words: "Gujarat Administrative Service,
 *  Class-I" matched a District Education Officer row (Gujarat …, Class-1,
 *  (Administrative Branch)) as a bag of words, and "GPSC Class 1-2" matched a
 *  Law Officer row (… in GPSC | Class-2 | … 1 [vacancy]). */
const STAGE_WORDS = new Set([
  "class", "prelim", "prelims", "preliminary", "mains", "main", "tier", "phase", "stage", "group", "grade", "paper", "written",
  "interview", "attempt", "first", "second", "third",
]);
const PLACE_WORDS = new Set([
  "andhra", "pradesh", "telangana", "karnataka", "kerala", "tamil", "nadu", "tamilnadu", "maharashtra", "gujarat", "rajasthan",
  "uttar", "madhya", "bihar", "jharkhand", "odisha", "orissa", "west", "bengal", "assam", "punjab", "haryana", "himachal",
  "uttarakhand", "chhattisgarh", "goa", "delhi", "jammu", "kashmir", "ladakh", "manipur", "meghalaya", "mizoram", "nagaland",
  "sikkim", "tripura", "arunachal", "puducherry", "pondicherry", "chandigarh", "up", "mp", "ap", "hp", "uk", "tn", "wb", "jk",
  "cg", "ts", "tg", "mh", "gj", "rj", "ka", "kl", "hr", "pb", "od", "br", "jh", "उत्तर", "प्रदेश", "मध्य", "बिहार", "राजस्थान",
  "गुजरात", "महाराष्ट्र", "हरियाणा", "झारखंड", "छत्तीसगढ़", "ఆంధ్ర", "ప్రదేశ్", "తెలంగాణ",
]);
/** Conducting bodies named by acronym (the commissions / boards / agencies
 *  that run many exams). Plus every "…psc" and "…ssc" / "…ssb" / "…sssb". */
const BODY_WORDS = new Set([
  "rrb", "rrc", "ibps", "nta", "nbe", "nbems", "cbse", "sbi", "rbi", "lic", "nabard", "epfo", "esic", "uppbpb", "upprpb",
  "mpesb", "vyapam", "kea", "tnusrb", "cetcell",
]);
function isBodyWord(w: string): boolean {
  return BODY_WORDS.has(w) || /^[a-z]{0,5}psc$/.test(w) || /^[a-z]{0,5}ss[bc]$/.test(w);
}
/** A word that tells one exam from another: not generic, not a stage /
 *  place / body word, not a number. */
function isDistinctive(w: string): boolean {
  return !!w && !GENERIC_TERMS.has(w) && !STAGE_WORDS.has(w) && !PLACE_WORDS.has(w) && !isBodyWord(w) && !/^\d+$/.test(w);
}

const ROMAN: Record<string, string> = { i: "1", ii: "2", iii: "3", iv: "4", v: "5", vi: "6", vii: "7", viii: "8", ix: "9", x: "10" };

/** Lower case, Indic digits → ASCII, punctuation → spaces, stand-alone
 *  Roman numerals → digits ("Tier-I" and "Tier 1", "Group-IV" and "Group 4"
 *  read alike), padded with spaces for whole-word search. */
function normText(s: string): string {
  const words = asciiDigits(s ?? "")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, " ")
    .trim()
    .split(" ")
    .map((w) => ROMAN[w] ?? w);
  return ` ${words.join(" ")} `;
}

/** The words of a term (or a text) in order, generic words dropped. */
function keyWords(term: string): string[] {
  return term.split(" ").filter((w) => w && !GENERIC_TERMS.has(w));
}

/** May the exam's OWN name stand as a term? With a distinctive word, yes;
 *  with none, only as a body / place word plus its class / stage words and
 *  numbers, matched as a whole phrase ("GPSC Class 1-2", "TNPSC Group 4") —
 *  never class / stage words alone ("Class 1-2 Prelims", "Group 4"). */
function ownTermOk(words: readonly string[]): boolean {
  if (words.some(isDistinctive)) return true;
  return words.length >= 2 && words.some((w) => isBodyWord(w) || PLACE_WORDS.has(w)) && words.some((w) => !isBodyWord(w) && !PLACE_WORDS.has(w));
}

/** The ways a page may name the exam: its short name, its name (with and
 *  without the bracketed stage, and without a leading body acronym — SSC's
 *  own pages say "Combined Graduate Level Examination", not "SSC Combined
 *  …"), and the crawl's recorded terms — each normalised, words kept in
 *  order. 1 Oct 2026: a recorded (research) term needs a distinctive word
 *  ("Preliminary Examination" names no exam: dropped); the body acronym is
 *  never stripped when what remains is only class / stage words ("GPSC Class
 *  1-2 Prelims" stays whole, never "class 1 2 prelims"). */
export function examTermsFor(exam: { shortName: string; name: string }, extra: readonly string[] = []): string[] {
  const noStage = exam.name.replace(/\([^)]*\)/g, " ");
  const noBody = noStage.replace(/^\s*[A-Z]{2,6}\s+(?=\S)/, "");
  const out = new Set<string>();
  const add = (r: string, ok: (words: readonly string[]) => boolean) => {
    const words = keyWords(normText(r).trim());
    if (words.length === 0 || words.every((w) => /^\d+$/.test(w)) || !ok(words)) return;
    out.add(words.join(" "));
  };
  for (const r of [exam.shortName, exam.name, noStage]) add(r, ownTermOk);
  if (noBody !== noStage) add(noBody, (w) => w.some(isDistinctive));
  for (const r of extra) add(r, (w) => w.some(isDistinctive));
  return [...out];
}

/** True when the text names the exam: one of its terms appears as a PHRASE
 *  — its words in order and adjacent, generic words skipped on both sides
 *  ("National Defence Academy", "NDA", "Combined Higher Secondary (10+2)
 *  Level Examination" for "combined higher secondary"). 1 Oct 2026: it was a
 *  bag of words, so "gujarat administrative class 1" matched "Gujarat
 *  Educational Service, Class-1, (Administrative Branch)". */
export function examNamed(text: string, terms: readonly string[]): boolean {
  const seq = ` ${keyWords(normText(text).trim()).join(" ")} `;
  return terms.some((term) => {
    const words = keyWords(normText(term).trim());
    return words.length > 0 && words.some((w) => !/^\d+$/.test(w)) && seq.includes(` ${words.join(" ")} `);
  });
}

/** The recorded (research) terms a listing itself prints, as a phrase: in
 *  its text, or in one of its rows as its adapter read them. 1 Oct 2026: RRB's
 *  tables print "01/2025" under the column header "CEN Number" — the page's
 *  text never holds "CEN 01/2025" as a phrase, the adapter's row ("CEN 01/2025
 *  · …", the column named by its header) does. Rows never join into one
 *  phrase. */
export function termsPrinted(terms: readonly string[], page: { pageText: string; links: readonly { anchorText: string; rowText: string }[] }): string[] {
  const seq = (t: string) => keyWords(normText(t).trim()).join(" ");
  const hay = ` ${[seq(page.pageText), ...new Set(page.links.map((l) => seq(`${l.anchorText} ${l.rowText}`)))].join(" # ")} `;
  return terms.filter((t) =>
    examTermsFor({ shortName: t, name: t }).some((term) => {
      const words = keyWords(normText(term).trim());
      return words.some((w) => !/^\d+$/.test(w)) && hay.includes(` ${words.join(" ")} `);
    }),
  );
}

/** The years a sitting may be named by: the exam day's year and every year
 *  its tracker label names ("SSC CGL 2025 Tier 1" held in 2026; "CLAT 2027"
 *  held in December 2026). */
export function cycleYearsFor(examDay: Date, examLabel: string | null | undefined): string[] {
  const out = new Set<string>([String(new Date(examDay.getTime() + 330 * 60_000).getUTCFullYear())]);
  for (const m of asciiDigits(examLabel ?? "").matchAll(/(?<!\d)(20\d{2})(?!\d)/g)) out.add(m[1]);
  return [...out].sort();
}

// ── printed dates ────────────────────────────────────────────────────────

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  जनवरी: 1, फ़रवरी: 2, फरवरी: 2, मार्च: 3, अप्रैल: 4, मई: 5, जून: 6, जुलाई: 7, अगस्त: 8, सितंबर: 9, सितम्बर: 9,
  अक्टूबर: 10, अक्तूबर: 10, नवंबर: 11, नवम्बर: 11, दिसंबर: 12, दिसम्बर: 12,
  జనవరి: 1, ఫిబ్రవరి: 2, మార్చి: 3, ఏప్రిల్: 4, మే: 5, జూన్: 6, జూలై: 7, ఆగస్టు: 8, సెప్టెంబర్: 9, సెప్టెంబరు: 9,
  అక్టోబర్: 10, అక్టోబరు: 10, నవంబర్: 11, నవంబరు: 11, డిసెంబర్: 12, డిసెంబరు: 12,
};
const MONTH_ALT = Object.keys(MONTHS)
  .sort((a, b) => b.length - a.length)
  .join("|");

function validIso(y: number, m: number, d: number): string | null {
  if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === iso ? iso : null;
}

/** Every calendar date printed in the text (Indian day-first numerals,
 *  ISO, "12 Sep 2026", "September 12, 2026", Hindi / Telugu month names,
 *  Indic digits), as ISO days in order of appearance, de-duplicated. */
export function parsePrintedDates(text: string): string[] {
  const s = asciiDigits(text ?? "");
  const found: { at: number; iso: string }[] = [];
  const push = (at: number, iso: string | null) => {
    if (iso) found.push({ at, iso });
  };
  for (const m of s.matchAll(/(?<!\d)(\d{4})-(\d{1,2})-(\d{1,2})(?!\d)/g)) push(m.index ?? 0, validIso(+m[1], +m[2], +m[3]));
  for (const m of s.matchAll(/(?<![\d-])(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?!\d)/g)) push(m.index ?? 0, validIso(+m[3], +m[2], +m[1]));
  const dm = new RegExp(`(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?[\\s.-]*(${MONTH_ALT})\\.?,?[\\s.-]*(\\d{4})(?!\\d)`, "giu");
  for (const m of s.matchAll(dm)) push(m.index ?? 0, validIso(+m[3], MONTHS[m[2].toLowerCase()] ?? 0, +m[1]));
  const md = new RegExp(`(?:^|[^\\p{L}])(${MONTH_ALT})\\.?[\\s.-]*(\\d{1,2})(?:st|nd|rd|th)?,?[\\s.-]*(\\d{4})(?!\\d)`, "giu");
  for (const m of s.matchAll(md)) push(m.index ?? 0, validIso(+m[3], MONTHS[m[1].toLowerCase()] ?? 0, +m[2]));
  found.sort((a, b) => a.at - b.at);
  return [...new Set(found.map((f) => f.iso))];
}

/** Why a release day is the day we first saw the link:
 *    none      nothing printed beside it;
 *    several   more than one date in the window (never a guess);
 *    outside   dates printed, none in the window (a future "objections
 *              till" date, or only the exam's own days);
 *    before    every printed date is BEFORE the sitting — an older release:
 *              the gate REJECTS it (review, 30 Sep 2026: it was written as
 *              "first seen today; the body printed no date", both false). */
export type FirstSeenWhy = "none" | "several" | "outside" | "before";

export type DatePick =
  | { source: "printed"; day: number; printed: string[] }
  | { source: "first-seen"; day: number; printed: string[]; why: FirstSeenWhy };

/** Gate 5. The release day is the ONE printed date after the sitting's exam
 *  days and by today (IST). None printed, or several, → the day we first saw
 *  the link: a guess between two printed dates ("key 15/09, objections till
 *  20/09") is exactly what this pipeline must not make. A date ON the
 *  sitting's exam days (notBefore..lastExamDay) is the exam's date, not a
 *  release date (review, 30 Sep 2026: a listing's "Date of examination"
 *  column would otherwise date every key the exam day). Without
 *  lastExamDay the window starts at notBefore, as before. */
export function pickReleaseDay(text: string, notBefore: Date, now: Date, lastExamDay?: Date | null): DatePick {
  const printed = parsePrintedDates(text);
  const lo = dayOf(notBefore);
  const today = dayOf(now);
  const examEnd = lastExamDay ? Math.max(lo, dayOf(lastExamDay)) : lo - 1;
  const days = [...new Set(printed.map((iso) => dayOf(new Date(`${iso}T00:00:00Z`))))];
  const inRange = days.filter((d) => d >= lo && d > examEnd && d <= today);
  if (inRange.length === 1) return { source: "printed", day: inRange[0], printed };
  if (inRange.length > 1) return { source: "first-seen", day: today, printed, why: "several" };
  if (days.length === 0) return { source: "first-seen", day: today, printed, why: "none" };
  return { source: "first-seen", day: today, printed, why: days.every((d) => d < lo) ? "before" : "outside" };
}

// ── link extraction ─────────────────────────────────────────────────────

export interface PageLink {
  url: string;
  anchorText: string;
  /** Text of the table row / list item / small paragraph holding the link. */
  rowText: string;
}

export function htmlText(html: string): string {
  return (html ?? "")
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** The page's own title and first headings — what a single-exam page (or a
 *  notice page the AI proposed) says it is about. */
export function pageHeading(html: string): string {
  const parts: string[] = [];
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html ?? "");
  if (title) parts.push(htmlText(title[1]));
  for (const m of (html ?? "").matchAll(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/gi)) {
    parts.push(htmlText(m[1]));
    if (parts.length >= 4) break;
  }
  return parts.filter(Boolean).join(" · ").slice(0, 600);
}

const MAX_LINKS_IN_ENTRY = 6;

function enclosingSpan(lower: string, at: number, tag: string, maxSpan: number): [number, number] | null {
  const open = Math.max(lower.lastIndexOf(`<${tag}>`, at), lower.lastIndexOf(`<${tag} `, at));
  if (open === -1 || at - open > maxSpan) return null;
  const closedBefore = lower.indexOf(`</${tag}>`, open);
  if (closedBefore !== -1 && closedBefore < at) return null;
  const close = lower.indexOf(`</${tag}>`, at);
  return close === -1 || close - open > maxSpan ? null : [open, close];
}

function entryAround(html: string, lower: string, at: number): string {
  for (const tag of ["tr", "li", "p", "div"]) {
    const span = enclosingSpan(lower, at, tag, 6000);
    if (!span) continue;
    const links = (lower.slice(span[0], span[1]).match(/<a\s/g) ?? []).length;
    if ((tag === "p" || tag === "div") && links > MAX_LINKS_IN_ENTRY) continue;
    return htmlText(html.slice(span[0], span[1])).slice(0, 1200);
  }
  return "";
}

/** Every http(s) link on the page with its anchor text and row text,
 *  resolved against the page URL. javascript:, mailto:, tel: and in-page
 *  anchors are skipped; at most `max` links. */
export function extractLinks(html: string, pageUrl: string, max = 3000): PageLink[] {
  const out: PageLink[] = [];
  const lower = (html ?? "").toLowerCase();
  const re = /<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi;
  for (const m of (html ?? "").matchAll(re)) {
    if (out.length >= max) break;
    const attrs = m[1];
    const href = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(attrs);
    const raw = (href?.[1] ?? href?.[2] ?? href?.[3] ?? "").trim().replace(/&amp;/gi, "&");
    if (!raw || raw.startsWith("#") || /^(?:javascript|mailto|tel|data):/i.test(raw)) continue;
    let url: string;
    try {
      url = new URL(raw, pageUrl).toString();
    } catch {
      continue;
    }
    if (!/^https?:\/\//i.test(url)) continue;
    const title = /\btitle\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(attrs);
    const anchorText = [htmlText(m[2]), title ? htmlText(title[1] ?? title[2] ?? "") : ""].filter(Boolean).join(" ").slice(0, 400);
    out.push({ url, anchorText, rowText: entryAround(html, lower, m.index ?? 0) });
  }
  return out;
}

// ── the release gate ────────────────────────────────────────────────────

export interface ReleaseCandidate {
  kind: WatchKind;
  url: string;
  /** The official page the link was read on; null only for a notice page
   *  the AI proposed that is itself the notice (its heading is its row). */
  listingUrl: string | null;
  anchorText: string;
  rowText: string;
  via: "html" | "ai";
}

export interface GateContext {
  /** ExamEligibility.officialUrl. */
  portalUrl: string | null;
  /** examTermsFor(...) of the exam. */
  examTerms: readonly string[];
  cycleYears: readonly string[];
  /** Lower bound of a release day: the sitting's first exam day. */
  notBefore: Date;
  /** The sitting's last exam day: a date printed on notBefore..lastExamDay
   *  is the exam's, never the release day. Null → notBefore only bounds it. */
  lastExamDay: Date | null;
  /** The due sitting's exam-day labels ("NDA 2 2026 exam", "Tier 2 exam"):
   *  their stage / sitting markers must not conflict with the text's. */
  sittingLabels: readonly string[];
  /** The exam's short names, for its printed ordinal ("NDA 2", "CDS-II"). */
  ordinalNames: readonly string[];
  /** The exam's full names (Exam.name). 1 Oct 2026: with the short names,
   *  their "cet" markers (sitting-markers examFamilyMarkers: MHT-CET, never
   *  the Nursing CET) join the due sitting's; they also tell the verified
   *  stage which label words are only the exam's name. */
  examNames?: readonly string[];
  /** Another announced sitting of the exam falls in the same calendar year:
   *  a text naming a sitting number ("(I)") is then refused while the due
   *  sitting's labels name none — the tracker cannot say which it is. */
  otherSittingThisYear: boolean;
  /** Baseline links of the exam's watch pages + earlier hits + the URLs of
   *  live official-watch and human-suppressed rows (normLink'd). */
  known: ReadonlySet<string>;
  /** The page the link was read on has a stored baseline (a watch page the
   *  crawl read before). False — the crawl's first read, a page only the AI
   *  named, a notice page, a blocked / script-built page — → gate 5 needs a
   *  printed date: an undated link there cannot be told from an older
   *  cycle's (review, 30 Sep 2026). */
  baselined: boolean;
  /** The listing page is about this exam alone (the crawl checked its
   *  heading): the row need not repeat the exam's name when the heading
   *  names it — and the heading's sitting / stage markers ("(I)", "Tier-II")
   *  are checked against the due sitting's as the row's own are. Only a
   *  heading the body printed (never an adapter's). */
  singleExamHeading?: string | null;
  now: Date;
}

/** Our own fetch of the candidate link in this run. */
export interface LinkFetch {
  status: number;
  contentType: string | null;
  /** First bytes of the body, latin1 ("%PDF-" for a PDF). */
  head: string;
  /** Where redirects ended. */
  finalUrl: string | null;
}

export interface VerifiedRelease {
  kind: WatchKind;
  url: string;
  listingUrl: string | null;
  host: string;
  /** Midnight UTC of the IST release day. */
  releasedOn: Date;
  dateSource: "printed" | "first-seen";
  note: string;
  anchorText: string;
  /** Anchor + row text as read (≤ 400 chars): the label's provisional /
   *  final word and the importer's paper name come from here. */
  text: string;
  isPdf: boolean;
  via: "html" | "ai";
  /** 1 Oct 2026. The row text alone (≤ 400 chars): two links in one row are
   *  one release (groupReleases). */
  row?: string;
  /** The stage the label and the twin filter may name — only what the body
   *  printed (verifiedStage): a sitting label of ours whose markers and
   *  words the body's text names, else the body's own title; "" when
   *  neither. */
  stage?: string;
  stageFrom?: StageFrom;
}

export type GateVerdict = { ok: true; release: VerifiedRelease } | { ok: false; gate: 1 | 2 | 3 | 4 | 5; reason: string };

export function looksLikePdf(url: string, contentType: string | null | undefined): boolean {
  if (/application\/pdf/i.test(contentType ?? "")) return true;
  try {
    return /\.pdf$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

/** The five conditions (see the file header). Pure: the caller fetched. */
export function releaseGate(c: ReleaseCandidate, ctx: GateContext, fetched: LinkFetch | null): GateVerdict {
  // 1. official hosts — the link, the page it was read on, and where it landed
  if (!isOfficialSource(c.url, ctx.portalUrl)) return { ok: false, gate: 1, reason: `link host not official (${hostOf(c.url) ?? "bad URL"})` };
  if (c.listingUrl && !isOfficialSource(c.listingUrl, ctx.portalUrl)) {
    return { ok: false, gate: 1, reason: `listing host not official (${hostOf(c.listingUrl) ?? "bad URL"})` };
  }
  if (fetched?.finalUrl && !isOfficialSource(fetched.finalUrl, ctx.portalUrl)) {
    return { ok: false, gate: 1, reason: `redirected off the official host (${hostOf(fetched.finalUrl) ?? "bad URL"})` };
  }
  // 2. our own fetch, this run
  if (!fetched) return { ok: false, gate: 2, reason: "not fetched in this run" };
  if (fetched.status !== 200) return { ok: false, gate: 2, reason: `HTTP ${fetched.status}` };
  const isPdf = looksLikePdf(c.url, fetched.contentType);
  if (isPdf && !fetched.head.startsWith("%PDF")) {
    return { ok: false, gate: 2, reason: `not a PDF now (starts "${fetched.head.slice(0, 12).replace(/\s+/g, " ")}")` };
  }
  // 3. what the body printed beside the link
  const text = `${c.anchorText} ${c.rowText}`;
  const cls = classifyLink(text);
  if (!kindMatches(c.kind, cls)) return { ok: false, gate: 3, reason: `no ${c.kind === "ANSWER_KEY" ? "answer-key" : "result"} term beside the link` };
  if (cls.future) return { ok: false, gate: 3, reason: "the text announces a future release, not a release" };
  const named = examNamed(text, ctx.examTerms) || (!!ctx.singleExamHeading && examNamed(ctx.singleExamHeading, ctx.examTerms));
  if (!named) return { ok: false, gate: 3, reason: "the exam is not named beside the link" };
  if (!ctx.cycleYears.some((y) => yearPrinted(text, y))) {
    return { ok: false, gate: 3, reason: `cycle year ${ctx.cycleYears.join("/")} not printed beside the link` };
  }
  // 3b. the due sitting / stage, not another one of the same exam and year
  // (review, 30 Sep 2026: "(I)" passed while (II) was due; "Tier-I" while
  // Tier 2 was due). A single-exam page's heading speaks for every row on it,
  // so its markers count too (review of the listing adapters, 30 Sep 2026:
  // UPSC's page headed "National Defence Academy … Examination (I), 2026"
  // prints rows with no sitting marker, and the year inside a row's date
  // passes the year check — its (I) result must never pass as the (II) one).
  // 1 Oct 2026: the exam's own CET ("MHT-CET") is due too — a row on the
  // State CET Cell's page naming only the Nursing CET is another exam's.
  const want = sittingMarkersOf(ctx.sittingLabels, ctx.ordinalNames);
  for (const m of examFamilyMarkers([...ctx.ordinalNames, ...(ctx.examNames ?? [])])) want.add(m);
  // 1 Oct 2026 (review of the gate fix): the link's file name is the body's
  // words here too, as in verifiedStage and siblingRefusal — a row silent on
  // the CBT whose file says "CBT-1" is not the due CBT-2's.
  const got = sittingMarkers(`${text} ${fileWords(c.url)}`, ctx.ordinalNames);
  // 1 Oct 2026: the heading speaks only for the families the row is silent
  // on — a "Nursing CET" row on a page headed "MHT-CET", or a "(I)" row on a
  // page headed "(II)", is the row's own, never the union of both.
  if (ctx.singleExamHeading) {
    const rowFamilies = new Set([...got].map(familyOf));
    for (const m of sittingMarkers(ctx.singleExamHeading, ctx.ordinalNames)) if (!rowFamilies.has(familyOf(m))) got.add(m);
  }
  const clash = markerConflict(want, got);
  if (clash) {
    return {
      ok: false,
      gate: 3,
      reason: `the text names another sitting/stage (${clash}: ${[...got].join(", ")}; due: ${[...want].join(", ")})`,
    };
  }
  if (!hasFamily(want, "sitting") && hasFamily(got, "sitting") && ctx.otherSittingThisYear) {
    return { ok: false, gate: 3, reason: "the text names a sitting number, the exam has another sitting this year, and the due sitting's labels name none" };
  }
  // 4. new — never an old cycle's link
  if (ctx.known.has(normLink(c.url))) return { ok: false, gate: 4, reason: "already on the page when it was first read, or an earlier hit" };
  // 5. the date
  const host = hostOf(c.url) ?? "";
  const pick = pickReleaseDay(text, ctx.notBefore, ctx.now, ctx.lastExamDay);
  if (pick.source === "first-seen" && pick.why === "before") {
    return { ok: false, gate: 5, reason: `the only date printed beside the link (${pick.printed.slice(0, 4).join(", ")}) is before the sitting — an older release` };
  }
  if (pick.source === "first-seen" && !ctx.baselined) {
    return { ok: false, gate: 5, reason: "no baseline for this page: an undated link cannot be told from an older cycle's (printed date required)" };
  }
  const iso = isoOfDay(pick.day);
  const seen = `${FIRST_SEEN_NOTE_PREFIX}${host} ${iso}`;
  const note =
    pick.source === "printed"
      ? `date printed beside the link on ${host}`
      : pick.why === "none"
        ? `${seen}; the body printed no date`
        : pick.why === "several"
          ? `${seen}; the body printed more than one date beside the link (${pick.printed.slice(0, 4).join(", ")})`
          : `${seen}; no date printed beside the link falls between the exam and today (${pick.printed.slice(0, 4).join(", ")})`;
  const textRead = [c.anchorText, c.rowText].filter(Boolean).join(" · ").replace(/\s+/g, " ").slice(0, 400);
  const st = verifiedStage({ url: c.url, anchorText: c.anchorText, rowText: c.rowText }, ctx);
  return {
    ok: true,
    release: {
      kind: c.kind,
      url: c.url,
      listingUrl: c.listingUrl,
      host,
      releasedOn: dayToDate(pick.day),
      dateSource: pick.source,
      note,
      anchorText: c.anchorText.slice(0, 300),
      text: textRead,
      isPdf,
      via: c.via,
      row: c.rowText.replace(/\s+/g, " ").trim().slice(0, 400),
      stage: st.stage,
      stageFrom: st.from,
    },
  };
}

// ── the verified stage (1 Oct 2026) ─────────────────────────────────────
//
// Why: the dry crawl of 30 Sep labelled every release with the LATEST
// sitting on our tracker, whatever the body's row said — "Result — PET
// conducted (SI Civil Police)" on UP Police's final selection result, "Result
// — PCM Group Second Attempt exam" on MHT-CET's PCB press note, "Result — SSC
// CHSL 2025 Typing Test" on SSC's allocation shortlist. A label may name only
// what the body printed: one of the sitting's labels when the body's text
// names every marker it carries (sitting-markers) and every other word of it
// that is not the exam's own name, a year it printed, or a date word ("Tier 1
// exam begins"); else the body's own title, trimmed; else nothing. 1 Oct
// 2026, independent review: "every other word" is read as phrases and pairs
// (labelClaims) — a number, a letter, "first" / "second", "nursing" are
// claims like any word unless a marker regex compared them.

export type StageFrom = "sitting" | "body" | "none";

/** Most characters of a stage (a label is "Answer key (provisional) — " +
 *  the stage). */
export const STAGE_MAX = 140;
const LABEL_MAX = 170;

/** Tracker-label words that name no stage: when a sitting was held, not
 *  which one it was. */
const LABEL_FILLER = new Set([
  "begin", "begins", "start", "starts", "started", "end", "ends", "conclude", "concludes", "concluded", "conducted", "held",
  "commence", "commences", "day", "days", "date", "dates", "window", "last", "onwards", "from", "to", "on", "at", "in", "by",
  "all", "expected", "tentative", "scheduled", "slot", "slots", "shift", "shifts",
]);

/** The words of a link's own file name — the body named its file
 *  ("…Objection_CEN_No._01_2025(ALP)_CBT-2__English.pdf": RRB's row prints
 *  only "CEN 01/2025", its file says CBT-2). Only path segments ending in a
 *  document extension; "_" and "+" read as spaces. */
export function fileWords(url: string): string {
  let path: string;
  try {
    path = new URL(url).pathname;
  } catch {
    return "";
  }
  const out: string[] = [];
  for (const seg of path.split("/")) {
    if (!/\.(?:pdf|docx?|xlsx?|html?)$/i.test(seg)) continue;
    let s = seg;
    try {
      s = decodeURIComponent(seg);
    } catch {
      /* keep the raw segment */
    }
    // " (1)" before the extension is a re-downloaded copy's suffix, not a
    // sitting "(I)" (1 Oct 2026: the gate now reads file names too).
    out.push(s.replace(/\.[a-z0-9]+$/i, "").replace(/[_+]+/g, " ").replace(/\s\(\d{1,2}\)$/, ""));
  }
  return out.join(" ").slice(0, 300);
}

const bodyText = (r: { anchorText: string; rowText: string; url: string }) => `${r.anchorText} ${r.rowText} ${fileWords(r.url)}`;

/** What a tracker label asserts beyond its markers (1 Oct 2026, independent
 *  review of the gate fix — the first version dropped every marker-ish word,
 *  every number and every word of the research terms, so "CTET Paper 2" was
 *  verified on a "Paper-I" row, "Second Phase" on a "First Phase" row, "Female
 *  PE&MT" on a "Male PE&MT" row and "HSSC CET Group D" on a "Group C" row):
 *    runs   the label's words between markers (markerSpans: compared as
 *           markers), the exam's OWN name (its short name / name as phrases,
 *           never a research term), date words and years — each run must be
 *           printed in the body as a phrase (generic words skipped on both
 *           sides, as examNamed): "female pe mt", "primary school tet";
 *    years  printed somewhere in the body;
 *    pairs  every other number or single letter with the label word before
 *           it (generic words count: "paper 2", "varg 3", "group d") — printed
 *           side by side in the body. */
interface LabelClaims {
  runs: string[];
  years: string[];
  pairs: string[];
}

function labelClaims(label: string, ownTerms: readonly string[], names: readonly string[]): LabelClaims {
  const { text, spans } = markerSpans(label, names);
  const toks = [...text.matchAll(/[\p{L}\p{M}\p{N}]+/gu)].map((m) => ({ w: ROMAN[m[0]] ?? m[0], at: m.index ?? 0, end: (m.index ?? 0) + m[0].length }));
  const removed = toks.map((t) => spans.some(([a, b]) => t.at < b && t.end > a));
  // The exam's own name, as a phrase over the label's non-generic words
  // (marker words included: "UPSC Prelims" is the name, its marker is
  // compared as a marker).
  const idx = toks.map((_, i) => i).filter((i) => !GENERIC_TERMS.has(toks[i].w));
  for (const term of [...ownTerms].sort((a, b) => b.split(" ").length - a.split(" ").length)) {
    const tw = term.split(" ");
    for (let k = 0; k + tw.length <= idx.length; k++) {
      if (!tw.every((w, j) => toks[idx[k + j]].w === w)) continue;
      for (let i = idx[k]; i <= idx[k + tw.length - 1]; i++) removed[i] = true;
    }
  }
  const out: LabelClaims = { runs: [], years: [], pairs: [] };
  let run: string[] = [];
  const flush = () => {
    const kw = run.filter((w) => !GENERIC_TERMS.has(w));
    if (kw.length) out.runs.push(kw.join(" "));
    run = [];
  };
  toks.forEach((t, i) => {
    if (removed[i] || LABEL_FILLER.has(t.w)) return flush();
    if (/^(?:19|20)\d{2}$/.test(t.w)) {
      out.years.push(t.w);
      return flush();
    }
    run.push(t.w);
    if (/^\d+$/.test(t.w) || /^\p{L}$/u.test(t.w)) {
      const prev = toks[i - 1]?.w;
      const next = toks[i + 1]?.w;
      out.pairs.push(prev ? `${prev} ${t.w}` : next ? `${t.w} ${next}` : t.w);
    }
  });
  flush();
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&#(\d{1,6});/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]{1,6});/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

/** A listing's own furniture beside a title: "[ Notice Board ]", "Click to
 *  view more", "Download", file sizes, times, "Date :". */
const FURNITURE_RES: readonly RegExp[] = [
  /\[[^\]]{0,40}\]/g,
  /\bclick\s+(?:here\s+)?(?:to\s+)?(?:view|download|open|see)(?:\s+more)?\b/gi,
  /\bclick\s+here\b/gi,
  /\b(?:view|read)\s+more\b/gi,
  /\bdownload\b/gi,
  /\(\s*\d+(?:\.\d+)?\s*[kmg]b\s*\)/gi,
  /\b\d+(?:\.\d+)?\s*[kmg]b\b/gi,
  /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\b/gi,
];

function stripDates(s: string): string {
  return s
    .replace(/(?<!\d)\d{4}-\d{1,2}-\d{1,2}(?!\d)/g, " ")
    .replace(/(?<![\d/-])\d{1,2}[./-]\d{1,2}[./-]\d{4}(?!\d)/g, " ")
    .replace(new RegExp(`(?<!\\d)\\d{1,2}(?:st|nd|rd|th)?[\\s.-]*(?:${MONTH_ALT})\\.?,?[\\s.-]*\\d{4}(?!\\d)`, "giu"), " ")
    .replace(new RegExp(`(?:^|(?<=[^\\p{L}]))(?:${MONTH_ALT})\\.?[\\s.-]*\\d{1,2}(?:st|nd|rd|th)?,?[\\s.-]*\\d{4}(?!\\d)`, "giu"), " ");
}

/** One segment of a row, cleaned to the body's title words. */
function cleanSegment(seg: string): string {
  let s = asciiDigits(decodeEntities(seg ?? ""));
  s = stripDates(s);
  for (const re of FURNITURE_RES) s = s.replace(re, " ");
  s = s
    .replace(/\b(?:date|dated|uploaded\s+on|published\s+on)\s*[:\-–]?\s*(?=$|[|·])/gi, " ")
    .replace(/\b(?:date|dated)\s*:\s*/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/\s+([:,;)])/g, "$1")
    .replace(/:(?=\S)/g, ": ")
    .trim();
  s = s.replace(/^\d{1,3}\s+(?=\p{L})/u, "");
  return s.replace(/^[\s|:;,.\-–·]+|[\s|:;,.\-–·।]+$/gu, "").trim();
}

/** Has the segment any word beyond the kind's own words ("Result", "Write
 *  Up", "Answer Key")? */
const AK_TERM_ALL = new RegExp(AK_TERM_RE.source, "gi");
const RESULT_TERM_ALL = new RegExp(RESULT_TERM_RE.source, "gi");
function saysMore(seg: string): boolean {
  return keyWords(normText(seg.replace(AK_TERM_ALL, " ").replace(RESULT_TERM_ALL, " ")).trim()).some((w) => /\p{L}/u.test(w));
}

const kindNamedIn = (s: string) => AK_TERM_RE.test(s) || RESULT_TERM_RE.test(s);

/** The body's own title for the link: the anchor / row segment that names
 *  the exam (else the longest that says more than "Result"), cleaned; its
 *  part after the first colon kept only when it adds something (no kind word
 *  — "…: List of Candidates … shortlisted for First Round …" — or a stage
 *  marker). Over STAGE_MAX: format phrases dropped ("in Roll Number Order",
 *  "the post of", "Uploading of"), then the exam's printed name before the
 *  colon shortened to our short name + its year, then cut at a word with "…". */
export function bodyTitle(r: { anchorText: string; rowText: string }, ctx: Pick<GateContext, "examTerms" | "ordinalNames">): string {
  const segs = [...`${r.anchorText ?? ""} · ${r.rowText ?? ""}`.split(/\s·\s/)].map(cleanSegment).filter((s) => s && saysMore(s));
  if (segs.length === 0) return "";
  const named = segs.filter((s) => examNamed(s, ctx.examTerms));
  const pool = named.length ? named : segs;
  let title = pool.reduce((a, b) => (b.length > a.length ? b : a));
  // A dash-set clause that only restates the kind ("EX1 2026 exam —
  // Provisional Answer Key") adds nothing to the stage.
  for (;;) {
    const dashes = [...title.matchAll(/\s[—–-]\s/g)];
    if (dashes.length === 0) break;
    const first = dashes[0];
    const last = dashes[dashes.length - 1];
    const lastAt = last.index ?? 0;
    const firstEnd = (first.index ?? 0) + first[0].length;
    if (!saysMore(title.slice(lastAt + last[0].length))) title = title.slice(0, lastAt).trim();
    else if (!saysMore(title.slice(0, first.index ?? 0))) title = title.slice(firstEnd).trim();
    else break;
  }
  const colon = title.indexOf(":");
  let head = colon === -1 ? title : title.slice(0, colon).trim();
  const tail = colon === -1 ? "" : title.slice(colon + 1).trim();
  const headSays = head && saysMore(head);
  if (!headSays && tail) head = "";
  const tailAdds = !!tail && (!kindNamedIn(tail) || sittingMarkers(tail, ctx.ordinalNames).size > 0);
  const join = (h: string, t: string) => (h && t ? `${h}: ${t}` : h || t);
  let stage = tailAdds || !head ? join(head, tail) : head;
  if (stage.length > STAGE_MAX) {
    const trim = (s: string) =>
      s
        .replace(/\s+in\s+(?:roll\s+(?:number|no\.?)|alphabetical)\s+order\b/gi, "")
        .replace(/\bfor\s+the\s+posts?\s+of\b/gi, "for")
        .replace(/\buploading\s+of\s+/gi, "")
        .replace(/\s+/g, " ")
        .trim();
    stage = tailAdds || !head ? join(trim(head), trim(tail)) : trim(head);
    const short = (ctx.ordinalNames[0] ?? "").trim();
    // 1 Oct 2026 (review): only a short name that adds no stage — "UPSC
    // Prelims" would turn a Civil Services final-result row into a prelims one.
    const shortAddsNoStage = !!short && sittingMarkers(short, ctx.ordinalNames).size === 0 && !keyWords(normText(short).trim()).some((w) => STAGE_WORDS.has(w));
    if (stage.length > STAGE_MAX && tailAdds && head && shortAddsNoStage && examNamed(head, ctx.examTerms) && sittingMarkers(head, ctx.ordinalNames).size === 0) {
      const year = /(?<!\d)(?:19|20)\d{2}(?!\d)/.exec(head)?.[0];
      stage = join(year ? `${short} ${year}` : short, trim(tail));
    }
  }
  return capStage(stage);
}

function capStage(s: string): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= STAGE_MAX) return t;
  const cut = t.slice(0, STAGE_MAX - 1);
  const at = cut.lastIndexOf(" ");
  return `${(at > STAGE_MAX / 2 ? cut.slice(0, at) : cut).replace(/[\s,;:(\-–/]+$/, "")}…`;
}

/** The stage a release may be labelled with (see the section header). The
 *  due sitting's labels are tried latest first. */
export function verifiedStage(
  r: { url: string; anchorText: string; rowText: string },
  ctx: Pick<GateContext, "sittingLabels" | "examTerms" | "ordinalNames" | "examNames">,
): { stage: string; from: StageFrom } {
  const names = ctx.ordinalNames;
  const body = bodyText(r);
  const got = sittingMarkers(body, names);
  const norm = normText(body);
  const words = new Set(norm.trim().split(" "));
  const seq = ` ${keyWords(norm.trim()).join(" ")} `;
  // The exam's OWN names only (1 Oct 2026 review): a research term such as
  // "Constable (Executive) Male and Female in Delhi Police Examination" made
  // "female" part of "the exam's name", so "Female PE&MT" passed on a Male row.
  const own = examTermsFor({ shortName: names[0] ?? "", name: ctx.examNames?.[0] ?? names[0] ?? "" });
  for (const label of [...ctx.sittingLabels].reverse()) {
    const lm = sittingMarkers(label, names);
    if (![...lm].every((m) => got.has(m))) continue;
    const c = labelClaims(label, own, names);
    if (!c.years.every((y) => words.has(y))) continue;
    if (!c.runs.every((run) => seq.includes(` ${run} `))) continue;
    if (!c.pairs.every((p) => norm.includes(` ${p} `))) continue;
    return { stage: capStage(label), from: "sitting" };
  }
  const title = bodyTitle(r, ctx);
  return title ? { stage: title, from: "body" } : { stage: "", from: "none" };
}

/** The tracker label of a release row. Every label names "answer key" or
 *  "result", so resolveKind and the tracker's answer-key rules read it.
 *  `text` = what the body printed at the link (VerifiedRelease.text);
 *  `stage` = VerifiedRelease.stage (1 Oct 2026: never the tracker's latest
 *  sitting unverified). */
export function releaseLabel(kind: WatchKind, text: string, stage: string | null | undefined): string {
  const st = capStage(stage ?? "");
  if (kind === "RESULT") return (st ? `Result — ${st}` : "Result").slice(0, LABEL_MAX);
  const which = /\bfinal\b/i.test(text) ? "final" : /provisional|tentative|(?:preliminary|initial)\s+(?:answer\s+)?key/i.test(text) ? "provisional" : null;
  return `Answer key${which ? ` (${which})` : ""}${st ? ` — ${st}` : ""}`.slice(0, LABEL_MAX);
}

// ── one release and its siblings (1 Oct 2026) ───────────────────────────
//
// Why: the first verified link was "the release" and EVERY other verified
// link of the run its sibling — MHT-CET's PCB second-attempt result carried
// the PCM first-attempt press note, the PCB first-attempt notification and the
// Nursing and DPN/PHN CET results. A sibling must (a) name the exam on its
// OWN row / anchor (a page heading is not enough), (b) name no other stage /
// sitting / group / attempt / CET than the release (sitting-markers, the file
// names included; 1 Oct 2026: a sex / post group that differs between two
// links of the SAME row is no refusal — one row is one release), and (c)
// share the release's printed day or its row. A
// verified link that is no sibling but names the exam on its own row is a
// release of its own; one named only by the page heading is held (reported,
// not written).

function sameRow(a: string | undefined, b: string | undefined): boolean {
  const n = (s: string | undefined) => (s ?? "").replace(/\s+/g, " ").trim().toLowerCase();
  return !!n(a) && n(a) === n(b);
}

/** Marker families that name a PART of one record row when the row's links
 *  differ only in them (1 Oct 2026, review of the postgroup / gender
 *  families): SSC's one result record links "List-I (Female)", "List-II
 *  (Male)" and a write-up; HSSC can post Group C's and Group D's lists under
 *  one notice. */
const ROW_PART_FAMILIES: ReadonlySet<MarkerFamily> = new Set<MarkerFamily>(["gender", "postgroup"]);

/** Why `v` is not a sibling of `release` — null when it is. */
export function siblingRefusal(release: VerifiedRelease, v: VerifiedRelease, ctx: Pick<GateContext, "examTerms" | "ordinalNames">): string | null {
  if (!examNamed(v.text, ctx.examTerms)) return "its own row does not name the exam (only the page heading does)";
  let mine = sittingMarkers(`${release.text} ${fileWords(release.url)}`, ctx.ordinalNames);
  let its = sittingMarkers(`${v.text} ${fileWords(v.url)}`, ctx.ordinalNames);
  // 1 Oct 2026 (review): one record row is one release. A gender / post-group
  // clash between two links of the SAME row is two lists of one release, not
  // two releases — before, the order the links were read decided it (Female
  // list first → two "Result — SSC GD 2026 CBT exam" rows for one day; the
  // write-up first → one). Every other family still splits a row (a CBT-1
  // file beside a CBT-2 file is another stage's).
  if (sameRow(release.row, v.row)) {
    const keep = (s: Set<string>) => new Set([...s].filter((m) => !ROW_PART_FAMILIES.has(familyOf(m))));
    mine = keep(mine);
    its = keep(its);
  }
  const clash = markerConflict(mine, its);
  if (clash) return `it names another ${clash} (${[...its].join(", ")}; the release: ${[...mine].join(", ")})`;
  const sameDay = release.dateSource === "printed" && v.dateSource === "printed" && release.releasedOn.getTime() === v.releasedOn.getTime();
  if (!sameDay && !sameRow(release.row, v.row)) {
    return `another day and another row (${isoOfDay(dayOf(v.releasedOn))} ${v.dateSource}; the release: ${isoOfDay(dayOf(release.releasedOn))} ${release.dateSource})`;
  }
  return null;
}

export interface ReleaseGroup<T> {
  release: T;
  siblings: T[];
}

/** Verified links (in the order read) → releases, each with its siblings,
 *  and the held ones with the reason. */
export function groupReleases<T>(
  items: readonly T[],
  get: (x: T) => VerifiedRelease,
  ctx: Pick<GateContext, "examTerms" | "ordinalNames">,
): { groups: ReleaseGroup<T>[]; held: { item: T; reason: string }[] } {
  const groups: ReleaseGroup<T>[] = [];
  const held: { item: T; reason: string }[] = [];
  for (const x of items) {
    const v = get(x);
    if (groups.length === 0) {
      groups.push({ release: x, siblings: [] });
      continue;
    }
    const g = groups.find((gr) => siblingRefusal(get(gr.release), v, ctx) === null);
    if (g) {
      g.siblings.push(x);
      continue;
    }
    if (examNamed(v.text, ctx.examTerms)) {
      groups.push({ release: x, siblings: [] });
      continue;
    }
    held.push({ item: x, reason: `not the same release as ${get(groups[0].release).url}: ${siblingRefusal(get(groups[0].release), v, ctx)}` });
  }
  return { groups, held };
}

// ── due set ──────────────────────────────────────────────────────────────

export interface TrackerRowLite extends TimelineInput {
  source?: string | null;
}

export interface DueExamInput {
  examId: string;
  code: string;
  shortName: string;
  name: string;
  portalUrl: string | null;
  /** Live tracker rows (archived excluded), any window the caller loaded. */
  rows: TrackerRowLite[];
  /** OfficialWatch.lagDays per kind, from the last cycle the crawl read. */
  lagDays?: Partial<Record<WatchKind, number | null>>;
}

export interface DueItem {
  examId: string;
  code: string;
  kind: WatchKind;
  /** First exam day of the sitting (the lower bound of a release day). */
  notBefore: Date;
  /** Last exam day of the sitting (= notBefore when no sitting is known). */
  lastExamDay: Date;
  /** The exam row the release belongs to — its label names the stage. */
  stage: string;
  /** Every exam-day label of the sitting (its stage / sitting markers). */
  sittingLabels: string[];
  /** Another announced sitting falls in the same calendar year. */
  otherSittingThisYear: boolean;
  cycleYears: string[];
  /** Why it is due (joined when several rules agree). */
  reasons: string[];
  hot: boolean;
  /** Result only: the day it is expected (reported / expected row, or lag). */
  expectedOn: Date | null;
}

interface Sitting {
  first: TimelineRow;
  last: TimelineRow;
  /** The announced exam-day rows of the sitting; [] for a sitting the
   *  due set had to assume (a key / result row with no exam day before it). */
  rows: TimelineRow[];
}

/** Announced exam days already held, grouped into sittings (days ≤ 14 apart). */
function heldSittings(timeline: readonly TimelineRow[], today: number): Sitting[] {
  const days = timeline.filter((r) => r.kind === "EXAM" && r.tier !== "expected" && dayOf(r.date) <= today);
  const out: Sitting[] = [];
  for (const r of days) {
    const cur = out[out.length - 1];
    if (cur && dayOf(r.date) - dayOf(cur.last.date) <= CLUSTER_GAP_DAYS) {
      cur.last = r;
      cur.rows.push(r);
    } else out.push({ first: r, last: r, rows: [r] });
  }
  return out;
}

const istYear = (d: Date) => new Date(d.getTime() + 330 * 60_000).getUTCFullYear();

/** Is another announced exam day (held or ahead) of the exam in the same
 *  calendar year as the sitting, outside it? (NDA-I in April, NDA-II in
 *  September.) */
function otherSittingInYear(timeline: readonly TimelineRow[], s: Sitting): boolean {
  const y = istYear(s.first.date);
  const lo = dayOf(s.first.date);
  const hi = dayOf(s.rows.length ? s.last.date : s.first.date);
  return timeline.some((r) => r.kind === "EXAM" && r.tier !== "expected" && istYear(r.date) === y && (dayOf(r.date) < lo || dayOf(r.date) > hi));
}

const isWatchRow = (r: { source?: string | null }) => (r.source ?? "") === OFFICIAL_WATCH_SOURCE;

export interface SittingRef {
  /** First exam day of the sitting (midnight UTC of the IST day). */
  notBefore: Date;
  lastDay: Date;
  stage: string;
  sittingLabels: string[];
  otherSittingThisYear: boolean;
  cycleYears: string[];
}

/** The latest announced sitting held within `maxAgeDays` (the crawl's
 *  "current cycle"), or null. */
export function latestHeldSitting(input: Pick<DueExamInput, "rows" | "portalUrl">, now: Date, maxAgeDays: number): SittingRef | null {
  const today = dayOf(now);
  const rows = input.rows.filter((r) => (r.source ?? "") !== SUPPRESSED_SOURCE);
  const timeline = buildTimeline(rows, now, input.portalUrl);
  const s = heldSittings(timeline, today).pop();
  if (!s || today - dayOf(s.last.date) > maxAgeDays) return null;
  return {
    notBefore: dayToDate(dayOf(s.first.date)),
    lastDay: dayToDate(dayOf(s.last.date)),
    stage: s.last.label,
    sittingLabels: s.rows.map((r) => r.label),
    otherSittingThisYear: otherSittingInYear(timeline, s),
    cycleYears: cycleYearsFor(s.first.date, `${s.first.label} ${s.last.label}`),
  };
}

/** True when an official-watch row of this kind is dated on/after `from`. */
export function releasedSince(rows: readonly TrackerRowLite[], kind: WatchKind, from: Date): boolean {
  const f = dayOf(from);
  return rows.some((r) => isWatchRow(r) && resolveKind(r) === kind && dayOf(r.date) >= f);
}

/** The due (exam, kind) pairs for one exam — see the file header. */
export function selectDue(input: DueExamInput, now: Date): DueItem[] {
  const today = dayOf(now);
  const rows = input.rows.filter((r) => (r.source ?? "") !== SUPPRESSED_SOURCE);
  const timeline = buildTimeline(rows, now, input.portalUrl);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const watchSince = (kind: WatchKind, from: number) => releasedSince(rows, kind, dayToDate(from));
  const sittings = heldSittings(timeline, today);
  const due = new Map<WatchKind, DueItem>();
  const add = (kind: WatchKind, s: Sitting, reason: string, hot: boolean, expectedOn: Date | null) => {
    const prev = due.get(kind);
    if (prev) {
      prev.reasons.push(reason);
      prev.hot = prev.hot || hot;
      prev.expectedOn = prev.expectedOn ?? expectedOn;
      return;
    }
    due.set(kind, {
      examId: input.examId,
      code: input.code,
      kind,
      notBefore: dayToDate(dayOf(s.first.date)),
      lastExamDay: dayToDate(dayOf(s.rows.length ? s.last.date : s.first.date)),
      stage: s.last.label,
      sittingLabels: s.rows.map((r) => r.label),
      otherSittingThisYear: otherSittingInYear(timeline, s),
      cycleYears: cycleYearsFor(s.first.date, `${s.first.label} ${s.last.label}`),
      reasons: [reason],
      hot,
      expectedOn,
    });
  };

  const latest = sittings[sittings.length - 1] ?? null;
  // Answer key: the latest sitting held in the last AK_DUE_DAYS days.
  if (latest && today - dayOf(latest.last.date) <= AK_DUE_DAYS && !watchSince("ANSWER_KEY", dayOf(latest.first.date))) {
    const ago = today - dayOf(latest.last.date);
    add("ANSWER_KEY", latest, `exam held ${ago} day(s) ago, no official answer key yet`, ago >= HOT_AK_MIN_DAYS && ago <= HOT_AK_MAX_DAYS, null);
  }
  // Result: the latest sitting held in the last RESULT_DUE_EXAM_DAYS days,
  // with a result expected within ±RESULT_EXPECTED_DAYS.
  if (latest && today - dayOf(latest.last.date) <= RESULT_DUE_EXAM_DAYS && !watchSince("RESULT", dayOf(latest.first.date))) {
    const from = dayOf(latest.first.date);
    const tracked = timeline
      .filter((r) => r.kind === "RESULT" && !isWatchRow(byId.get(r.id) ?? {}) && dayOf(r.date) >= from)
      .map((r) => dayOf(r.date))
      .filter((d) => Math.abs(d - today) <= RESULT_EXPECTED_DAYS);
    const lag = input.lagDays?.RESULT;
    const byLag = typeof lag === "number" && lag >= 0 ? dayOf(latest.last.date) + lag : null;
    const expected = tracked[0] ?? (byLag !== null && Math.abs(byLag - today) <= RESULT_EXPECTED_DAYS ? byLag : null);
    if (expected !== null) {
      add("RESULT", latest, tracked.length ? "a result is on the tracker for ±7 days" : "last cycle's lag puts the result within ±7 days", true, dayToDate(expected));
    }
  }
  // Any answer-key / result row near today that is not official-watch yet.
  for (const r of timeline) {
    if (r.kind !== "ANSWER_KEY" && r.kind !== "RESULT") continue;
    const src = byId.get(r.id);
    if (src && isWatchRow(src)) continue;
    const d = dayOf(r.date);
    if (d < today - ROW_DUE_BACK_DAYS || d > today + ROW_DUE_AHEAD_DAYS) continue;
    const kind = r.kind as WatchKind;
    // The sitting it belongs to: the last one held on or before it; none
    // known → the row's own date bounds the release (90 days before it).
    const s: Sitting = [...sittings].reverse().find((x) => dayOf(x.first.date) <= d) ?? {
      first: { ...r, date: dayToDate(d - 90), label: input.shortName },
      last: { ...r, label: input.shortName },
      rows: [],
    };
    if (watchSince(kind, dayOf(s.first.date))) continue;
    const ago = today - dayOf(s.last.date);
    const hot =
      kind === "RESULT"
        ? Math.abs(d - today) <= RESULT_EXPECTED_DAYS
        : sittings.includes(s) && ago >= HOT_AK_MIN_DAYS && ago <= HOT_AK_MAX_DAYS;
    add(kind, s, `${kind === "ANSWER_KEY" ? "answer-key" : "result"} row dated ${isoOfDay(d)} is not official-watch`, hot, kind === "RESULT" ? dayToDate(d) : null);
  }
  return [...due.values()];
}

/** Hot first, then the nearest expectation / most recent sitting. */
export function orderDue(items: readonly DueItem[], now: Date): DueItem[] {
  const today = dayOf(now);
  const score = (i: DueItem) => (i.expectedOn ? Math.abs(dayOf(i.expectedOn) - today) : today - dayOf(i.notBefore));
  return [...items].sort((a, b) => Number(b.hot) - Number(a.hot) || score(a) - score(b) || a.code.localeCompare(b.code) || a.kind.localeCompare(b.kind));
}

/** May this run spend AI on this pair? Never in the noon check; in the
 *  Monday plan ($3.00) and the evening check ($0.90, ≤ 6) only for HOT pairs
 *  (answer key: exam 1–10 days ago; result: expected within ±7 days) — and
 *  only when the HTML check could not settle it: no readable watch page for
 *  the kind (none found by the crawl, browser-only, blocked, empty, or down now),
 *  or new links that named the kind but failed the exam / year check
 *  (ambiguous). */
export function needsAi(mode: WatchMode, item: Pick<DueItem, "hot">, html: { readablePages: number; ambiguous: boolean; found: number }): boolean {
  if (mode === "check" || !item.hot) return false;
  if (html.found > 0) return false;
  return html.readablePages === 0 || html.ambiguous;
}

// ── budget ───────────────────────────────────────────────────────────────

/** Per-run hard cap. Charge the estimate BEFORE the call (a failed call
 *  costs the same tokens); true up to the recorded cost after it when that
 *  was higher. Never spends past `capUsd` on an estimate basis. */
export class AiBudget {
  spent = 0;
  calls = 0;
  constructor(
    readonly capUsd: number,
    readonly perCallUsd: number = AI_CHECK_COST_USD,
    readonly maxCalls: number = Number.POSITIVE_INFINITY,
  ) {}
  canSpend(): boolean {
    return this.calls < this.maxCalls && this.spent + this.perCallUsd <= this.capUsd + 1e-9;
  }
  /** Charge one call's estimate; false (nothing charged) when the cap would be passed. */
  charge(): boolean {
    if (!this.canSpend()) return false;
    this.spent += this.perCallUsd;
    this.calls++;
    return true;
  }
  /** After the call: the recorded cost replaces the estimate when higher. */
  trueUp(actualUsd: number): void {
    if (Number.isFinite(actualUsd) && actualUsd > this.perCallUsd) this.spent += actualUsd - this.perCallUsd;
  }
}

// ── the crawl's research step (scripts/crawl-official-answer-keys.ts) ────

/** --no-ai, or --max-usd 0: no new AI in this crawl (journal only). */
export function crawlAiOff(noAi: boolean, maxUsd: number | null): boolean {
  return noAi || maxUsd === 0;
}

export type CrawlStep = "journal" | "research" | "skip-no-ai" | "skip-cap";

/** One exam's research step. Review, 30 Sep 2026: `--resume … --max-usd 0
 *  --apply` charged the budget for the first exam with no journal entry, hit
 *  "cap reached" and BROKE both loops — every later exam silently not
 *  applied. A skip is now per exam; the caller continues. Charges the budget
 *  only when it returns "research". */
export function crawlResearchStep(inJournal: boolean, aiOff: boolean, budget: AiBudget): CrawlStep {
  if (inJournal) return "journal";
  if (aiOff) return "skip-no-ai";
  return budget.charge() ? "research" : "skip-cap";
}

/** Probe the key before a chunk only when research can actually run in it
 *  (the probe is itself an API call). */
export function crawlNeedsProbe(aiOff: boolean, budget: AiBudget, chunkHasUnresearched: boolean): boolean {
  return !aiOff && budget.canSpend() && chunkHasUnresearched;
}

// ── the crawl's current-cycle scan ──────────────────────────────────────

export interface ListingScan {
  /** Every link on the page, normLink'd — the watch's baseline. */
  baseline: string[];
  /** New links that name the kind (terms only, no future-release wording) —
   *  what the gate is then asked about. */
  kindLinks: PageLink[];
}

/** Split a listing page's links for one kind: every link is baseline; the
 *  kind-named ones that are new (not in `known`) are candidates. */
export function scanListing(links: readonly PageLink[], kind: WatchKind, known: ReadonlySet<string>): ListingScan {
  const baseline = [...new Set(links.map((l) => normLink(l.url)))];
  const kindLinks = links.filter((l) => {
    if (known.has(normLink(l.url))) return false;
    const c = classifyLink(`${l.anchorText} ${l.rowText}`);
    return kindMatches(kind, c) && !c.future;
  });
  return { baseline, kindLinks };
}
