// scripts/build-official-readings.ts
//
// Turns the official readings (one folder per exam, each holding the first
// reader's reading.json and the second reader's confirm.json) into
// src/data/official-readings.ts. No network, no database, no AI.
//
// An exam's pattern is written only when ALL of these hold:
//   • the second reading says the host is the conducting body's own site and
//     the document opened again;
//   • questions, marks and duration are numbers the second reading saw printed;
//   • the rule for a wrong answer was either seen printed, or both readings
//     agree the notice prints none (then the page says the notice is silent).
// Sections, the paper's language, the answer format, the spread of marks and
// the document's date are each written only when the second reading
// confirmed them; otherwise that one field is left out.
// A topic's place is written only when the second reading downloaded the
// documents itself, confirmed the place, and the page is a stage-1 topic page.
//
// USAGE
//   npx tsx scripts/build-official-readings.ts --from <folder>           # report only
//   npx tsx scripts/build-official-readings.ts --from <folder> --write   # also write the data file
//   … --stored <file.json>   # optional: [{code, stored:{totalQuestions,totalMarks,durationMin,negativeMark}}] to report agreement
//   … --journal <journal.jsonl>   # repeatable: read the readers' STRUCTURED results from a workflow journal
//                                 # (preferred: the files an agent writes by hand may not follow the schema)
//
// Wording: a field longer than its limit is left out (and reported), never
// cut mid-sentence; OVERRIDES below carry wording written by hand from the
// notice's own line (quoted in the comment), and may exclude a document.

import fs from "node:fs";
import path from "node:path";
import { TOPIC_PAGES_STAGE1 } from "../src/lib/topic-pages-stage1";
import { patternSentence, type VerifiedPattern, type VerifiedSection } from "../src/lib/pattern-verified";
import type { SyllabusDocument } from "../src/lib/official-syllabus-lines";

const arg = (name: string) => { const i = process.argv.indexOf(name); return i >= 0 ? process.argv[i + 1] : undefined; };
const args = (name: string) => process.argv.flatMap((a, i) => (a === name && process.argv[i + 1] ? [process.argv[i + 1]] : []));
const FROM = arg("--from");
const STORED = arg("--stored");
const WRITE = process.argv.includes("--write");
if (!FROM) { console.error("usage: --from <folder> [--stored <file>] [--write]"); process.exit(2); }

const HAND_READ = new Set(["SSC_CGL", "TN_TNPSC_GROUP1", "UP_UPSSSC_PET", "AP_APPSC_GROUP2", "IOQM"]);
const OUT = path.resolve(__dirname, "../src/data/official-readings.ts");

type Verdict = { verdict: string; whatThePageSays: string };
const ok = (v: Verdict | undefined) => v?.verdict === "confirmed";
const clean = (s: unknown, max = 200) => String(s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const dropped: string[] = [];
/** The whole text when it fits, or nothing (never a cut sentence); meta remarks in brackets are removed. */
function fit(code: string, field: string, s: unknown, max: number): string {
  const t = String(s ?? "")
    .replace(/\s+/g, " ")
    .replace(/\s*\((?:[^()]*\b(?:verbatim|condensed|paraphras\w*|not printed|Note \d|para(?:graph)? \d)[^()]*)\)/gi, "")
    .trim()
    .replace(/[.;]+$/, "");
  if (!t) return "";
  if (t.length > max) {
    dropped.push(`${code}.${field} (${t.length} chars): ${t.slice(0, 90)}…`);
    return "";
  }
  return t;
}

/** A reader's remark in brackets ("advertisement prints 'Quantitive'", "condensed") — not page text. */
const META = /\s*\((?:[^()]*\b(?:prints?|printed|spelt|spelled|sic|verbatim|condensed|paraphras\w*|translated|rendering|reader)\b[^()]*)\)/gi;

/** A citation part (title, name, paragraph): whole when it fits; a paragraph may drop its later clauses
 *  (split at "; " only — "No. 07" must never end a title); then cut at a word with "…", never mid-word. */
function brief(t: unknown, max: number, clauses = false): string {
  let x = String(t ?? "").replace(/\s+/g, " ").replace(META, "").trim();
  if (x.length > max && clauses) x = x.split(/;\s|(?<=[)\d])\.\s+(?=[A-Z])/)[0].trim();
  if (x.length > max) x = x.replace(/\s*\([^()]*\)\s*$/, "").trim();
  if (x.length > max) x = `${x.slice(0, max).replace(/\s+\S*$/, "")}…`;
  return x.replace(/[.;,]+$/, "");
}

/**
 * Wording written by hand from the notice's own line, where the reader's
 * field would print badly. Every entry quotes its source line.
 */
const OVERRIDES: Record<string, {
  negativeText?: string;
  languages?: string;
  noPlaces?: string;
  noPattern?: string;
  negativeSilent?: boolean;
  stage?: string;
  syllabusCaveat?: string;
  syllabusScanned?: boolean;
  marksNote?: string;
  /** The body's short name for the citation, when the reader's would not be recognised. */
  short?: string;
  /** Keep only these section names (the reader listed sections of more than one paper). */
  sectionsOnly?: string[];
}> = {
  // ── Batch 2 (29 Sep 2026) ──
  // REAP admits through JEE (Main); the reading's documents are NTA's JEE (Main) bulletin and syllabus. A REAP
  // topic page cannot cite them without a line that explains the link, so none is placed yet.
  RJ_REAP: { noPlaces: "the documents are NTA's JEE (Main) bulletin and syllabus, not REAP's own" },
  // JAC, JTET Rules 2026, Rule 11: papers in Hindi and English, medium Hindi or English; language subjects in
  // their own language.
  JH_TET: { languages: "Hindi and English (medium Hindi or English); the language papers in their own language" },
  // Department of School Education, Karnataka (its Centralised Admission Cell), KARTET-2025 notification, para 9:
  // non-language questions in Kannada, English, Urdu, Tamil, Telugu, Hindi and Marathi.
  KA_KARTET: {
    short: "Karnataka School Education Dept",
    // Para 8.2: Paper-1 is Language-1, Language-2, Child Development and Pedagogy, Mathematics and Environmental
    // Studies, 30 each (150). Social Studies (60) is a Paper-2 section.
    sectionsOnly: ["Language-1 (compulsory)", "Language-2 (compulsory)", "Child Development and Pedagogy (compulsory)", "Mathematics", "Environmental Studies"],
    languages: "Kannada, English, Urdu, Tamil, Telugu, Hindi and Marathi, except the language papers",
  },
  // RPSC, Scheme & Syllabus 09-01-2026, Note 2: "1/3 mark will be deducted for each wrong answer"; advertisement
  // p.5/8, OMR instruction 3: if none of the five circles is darkened, "one third (1/3) part of the marks of
  // question shall be deducted".
  RJ_RPSC_RAS: { negativeText: "1/3 mark is deducted for each wrong answer, and 1/3 of the question's marks if none of the five circles is darkened" },
  // UPPRPB written-examination notice 05-02-2026, para 16: all questions except General Hindi in Hindi and
  // English; the English version prevails in case of doubt. No wrong-answer rule is printed.
  UP_POLICE_CONSTABLE: { languages: "Hindi and English, except General Hindi; the English version prevails in case of doubt" },
  // IBPS CRP PO/MT notification, clause E: "one fourth or 0.25 of the marks assigned to that question" is
  // deducted for a wrong answer; a blank answer has no penalty.
  IBPS_PO: { negativeText: "one fourth (0.25) of the marks assigned to a question is deducted for each wrong answer; a blank answer has no penalty" },
  // TSLPRB SI notification (Rc. No. 225), page 20, Note 3 and Note 4 — same rule and versions as the constable notice.
  TS_POLICE_SI: {
    negativeText: "a wrong answer, or more than one bubble darkened, is marked minus 20% of the question's full marks; a question left blank gets zero",
    languages: "English-Telugu and English-Urdu versions",
  },
  // IAPT home page, block "NSE-2026-27": links this file as the syllabus; the file itself is named and titled 2022-2023.
  NSEJS: { syllabusCaveat: "The file is titled 2022-2023; IAPT's site links it as the syllabus for NSE 2026-27." },
  // UBSE's UTET list links eight scanned pages with no printed date (Appendix Six of an earlier brochure).
  UK_TET: { syllabusScanned: true, syllabusCaveat: "The pages print no date; UBSE's site lists them for UTET." },
  // UPSC notices CDS-II and NDA-II 2026: the syllabus is printed inside the notice.
  CDS: { syllabusCaveat: "The syllabus is printed inside the examination notice." },
  NDA: { syllabusCaveat: "The syllabus is printed inside the examination notice." },
  // CBSE, Information Bulletin CTET-September 2026, para 8: "Main question paper shall be Bilingual
  // (Hindi/English)"; para 7: Language I and Language II are chosen from the 27 listed languages.
  CTET: {
    languages: "bilingual (Hindi/English); Language I and II in the two languages the candidate chooses",
  },
  // Boards that run many different examinations: the reading found one post's advertisement and syllabus
  // (JKSSB Advt 03 of 2026, Veterinary Pharmacist; UKSSSC Advt 80/2026, Junior Assistant). It cannot describe
  // the board's exam page or its topic pages.
  JK_JKSSB: {
    noPattern: "the board runs many examinations; the reading describes one post (Veterinary Pharmacist, Advt 03 of 2026)",
    noPlaces: "the syllabus is one post's (Advt 03 of 2026), not the board's",
  },
  UK_UKSSSC: {
    noPattern: "the board runs many examinations; the reading describes one (Junior Assistant, Advt 80/2026)",
    noPlaces: "the syllabus is one examination's (Junior Assistant, Advt 80/2026), not the board's",
  },
  // TNPSC Notification 07/2025 (Group IV), Annexure IV: "(i.e., if left blank) 0.5 mark will be deducted from the
  // total marks"; no rule for a wrong answer is printed (second reading: none in the notice or Addenda 7A-7D).
  TN_TNPSC_GROUP4: {
    stage: "Written Examination",
    // Para 6: Part A 100 questions, 150 marks; Parts B and C one maximum of 150 for 75 + 25 questions.
    marksNote: "Part A has 100 questions for 150 marks; Parts B and C (75 + 25 questions) share one maximum of 150",
    negativeSilent: true,
    negativeText: "no deduction printed for a wrong answer; 0.5 mark is deducted if a question is left blank",
  },
  // TSLPRB notification 29 Jul 2026, para 16-A Note 3 (page 26): "full marks … if he / she darkened only one
  // bubble that corresponds to the correct answer. In case the Candidate has not darkened any bubble … zero mark
  // … In all other cases, 20% of full marks shall be awarded as negative mark". Note 4: "set in English-Telugu &
  // English Urdu".
  TS_POLICE_PC: {
    negativeText: "a wrong answer, or more than one bubble darkened, is marked minus 20% of the question's full marks; a question left blank gets zero",
    languages: "English-Telugu and English-Urdu versions",
  },
  // TNPSC Notification 07/2026, Annexure IV para 1.12.3.2: "If none of the respective answer bubble is darkened
  // … (i.e., if left blank) 0.5 mark will be deducted"; no rule for a wrong answer is printed. Para 6.4: General
  // Studies questions in Tamil and English; Part C is General Tamil or General English.
  TN_TNPSC_GROUP2: {
    negativeText: "no deduction printed for a wrong answer; 0.5 mark is deducted if a question is left blank",
    languages: "General Studies in Tamil and English; the language part is General Tamil or General English",
  },
  // SBI advertisement CRPD/CR/2026-27/17, para 4: "1/4th of mark assigned for question will be deducted for each
  // wrong answer". The "syllabus" is the Acquaint Yourself booklet of sample questions, not a syllabus.
  SBI_CLERK: {
    negativeText: "1/4th of the mark assigned to a question is deducted for each wrong answer",
    languages: "English Language test in English; the other two tests in English, Hindi and, in some States/UTs, a regional language",
    noPlaces: "the only document is a booklet of sample questions, not a syllabus",
  },
  // IBPS CRP CSA-XVI notification, clause E: "one fourth or 0.25 of the marks assigned to that question will be
  // deducted"; medium list printed page 15.
  IBPS_CLERK: {
    negativeText: "one fourth (0.25) of the marks assigned to a question is deducted for each wrong answer",
    languages: "English Language test in English; the other two tests in English, Hindi and, in some States/UTs, a regional language",
  },
};
const isDay = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
const posInt = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n > 0 && Math.round(n) === n;
/** The IST day a file was written. */
const istDay = (file: string) => new Date(fs.statSync(file).mtimeMs + 330 * 60_000).toISOString().slice(0, 10);

/** NIC's S3WaaS platform: the content store behind many government sites (cdnbbsr.s3waas.gov.in …). */
const GOV_CDN = /(^|\.)s3waas\.gov\.in$/;

function hostOk(url: string, bodyHost: string, secondSaysOfficial = false): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    const h = u.hostname.replace(/^www\./, "");
    if (secondSaysOfficial && GOV_CDN.test(h)) return true;
    const b = bodyHost.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").split(/[ ,;(]/)[0];
    return h === b || h.endsWith(`.${b}`) || b.endsWith(`.${h}`);
  } catch { return false; }
}

const patterns: Record<string, VerifiedPattern> = {};
const documents: Record<string, SyllabusDocument> = {};
const places: Record<string, { doc: string; where: string }> = {};
const report: string[] = [];
const stored: Record<string, { totalQuestions: number; totalMarks: number; durationMin: number; negativeMark: number }> = {};
if (STORED) for (const e of JSON.parse(fs.readFileSync(STORED, "utf8"))) stored[e.code] = e.stored;

// Structured results from workflow journals: the last reading and the last second reading per exam win.
const fromJournal = new Map<string, { r?: any; c?: any; at?: string }>();
for (const j of args("--journal")) {
  for (const line of fs.readFileSync(j, "utf8").split("\n")) {
    let e: any;
    try { e = JSON.parse(line); } catch { continue; }
    if (e?.type !== "result") continue;
    const v = e.result ?? e.value;
    if (!v?.examCode) continue;
    const slot = fromJournal.get(v.examCode) ?? {};
    if (v.stage && v.document) slot.r = v;
    if (v.pattern && "documentOpens" in v) { slot.c = v; slot.at = e.at ?? e.ts ?? e.time ?? slot.at; }
    fromJournal.set(v.examCode, slot);
  }
}

const codes = new Set<string>([...fromJournal.keys(), ...fs.readdirSync(FROM).filter((d) => fs.statSync(path.join(FROM, d)).isDirectory())]);
for (const code of [...codes].sort()) {
  if (HAND_READ.has(code)) continue;
  const dir = path.join(FROM, code);
  const rf = path.join(dir, "reading.json");
  const cf = path.join(dir, "confirm.json");
  let r: any = fromJournal.get(code)?.r;
  let c: any = fromJournal.get(code)?.c;
  try {
    if (!r && fs.existsSync(rf)) r = JSON.parse(fs.readFileSync(rf, "utf8"));
    if (!c && fs.existsSync(cf)) c = JSON.parse(fs.readFileSync(cf, "utf8"));
  } catch { report.push(`${code}: unreadable JSON — skipped`); continue; }
  if (!r || !c) { report.push(`${code}: ${r ? "no second reading yet" : "no reading"} — skipped`); continue; }
  if (!r?.stage || !c?.pattern) { report.push(`${code}: older reading shape — skipped`); continue; }
  const why: string[] = [];
  const s = r.stage;
  const p = c.pattern;
  const o = OVERRIDES[code] ?? {};
  const readOn = fs.existsSync(cf) ? istDay(cf) : new Date(Date.now() + 330 * 60_000).toISOString().slice(0, 10);

  if (c.hostIsOfficial !== true) why.push("host not confirmed as the body's own");
  if (c.documentOpens !== true) why.push("document did not open on the second reading");
  if (!hostOk(r.document?.url ?? "", r.body?.host ?? "", c.hostIsOfficial === true)) why.push(`document URL is not on ${r.body?.host}`);
  if (o.noPattern) why.push(o.noPattern);
  if (!posInt(s.questions) || !ok(p.questions)) why.push("questions not confirmed");
  if (!posInt(s.marks) || !ok(p.marks)) why.push("marks not confirmed");
  if (!posInt(s.durationMin) || !ok(p.durationMin)) why.push("duration not confirmed");
  const negNumber = typeof s.negativePerWrong === "number" && s.negativePerWrong >= 0 && ok(p.negative);
  const negSilent =
    (s.negativePerWrong === null && !clean(s.negativeAsPrinted) && (p.negative?.verdict === "not-printed" || ok(p.negative))) ||
    (o.negativeSilent === true && s.negativePerWrong === null && p.negative?.verdict === "not-printed");
  const negWorded = !negSilent && s.negativePerWrong === null && !!clean(s.negativeAsPrinted) && ok(p.negative);
  if (!negNumber && !negSilent && !negWorded) why.push("rule for a wrong answer not confirmed");
  if (!clean(r.body?.short) || !clean(r.document?.title) || !clean(s.para) || !clean(s.name)) why.push("citation incomplete");

  if (why.length === 0) {
    const sections: VerifiedSection[] = ok(p.sections)
      ? (s.sections ?? [])
          .map((x: any) => ({ name: brief(x.name, 90), questions: posInt(x.questions) ? x.questions : null, marks: posInt(x.marks) ? x.marks : null }))
          .filter((x: VerifiedSection) => x.name && (x.questions !== null || x.marks !== null))
          .filter((x: VerifiedSection) => !o.sectionsOnly || o.sectionsOnly.includes(x.name))
      : [];
    const fraction = negNumber && (Math.abs(s.negativePerWrong * 3 - Math.round(s.negativePerWrong * 3)) < 1e-3) && Math.abs(s.negativePerWrong * 100 - Math.round(s.negativePerWrong * 100)) > 1e-3;
    const v: VerifiedPattern = {
      code,
      stage: o.stage ?? brief(String(s.name ?? "").replace(/\s*\([^()]{12,}\)/g, ""), 60),
      questions: s.questions,
      marks: s.marks,
      durationMin: s.durationMin,
      negativePerWrong: negNumber ? s.negativePerWrong : 0,
      ...(negSilent ? { negativeNotPrinted: true } : {}),
      // A third or two-thirds, or a rule one number cannot say: the notice's own words.
      ...(o.negativeText
        ? { negativeText: o.negativeText }
        : (negWorded || fraction) && fit(code, "negativeText", s.negativeAsPrinted, 170)
          ? { negativeText: fit(code, "negativeText", s.negativeAsPrinted, 170) }
          : {}),
      ...(s.answerFormat && s.answerFormat !== "options" && s.answerFormat !== "not stated" && ok(p.answerFormat) && fit(code, "answerFormat", s.answerFormatAsPrinted, 170)
        ? { answerFormat: fit(code, "answerFormat", s.answerFormatAsPrinted, 170), practiceFormatDiffers: true }
        : {}),
      ...(o.marksNote ? { marksNote: o.marksNote } : ok(p.marksNote) && fit(code, "marksNote", s.marksNote, 170) ? { marksNote: fit(code, "marksNote", s.marksNote, 170) } : {}),
      sections,
      languages: o.languages ?? (ok(p.languages) ? fit(code, "languages", s.languages, 110) : ""),
      source: {
        url: r.document.url,
        publisher: clean(r.body.name, 120),
        publisherShort: o.short ?? clean(r.body.short, 32),
        title: brief(r.document.title, 120),
        publishedOn: ok(p.documentDate) && isDay(r.document.publishedOn) ? r.document.publishedOn : "",
        para: brief(s.para, 110, true),
        ...(r.document.kind && r.document.kind !== "notice" ? { kind: r.document.kind } : {}),
        ...(r.document.scanned === true ? { scanned: true } : {}),
      },
      checkedOn: readOn,
    };
    // A worded rule has no number to compare with the stored row. If its words could not be printed,
    // the pattern is not published (it would otherwise read as "the notice prints no rule").
    if (negWorded) v.negativeNotPrinted = true;
    if (negWorded && !v.negativeText) {
      report.push(`${code}: no pattern — the wrong-answer rule is worded and too long to print as it stands; add an override`);
      continue;
    }
    patterns[code] = v;
    const st = stored[code];
    const agree = st
      ? st.totalQuestions === v.questions && st.totalMarks === v.marks && st.durationMin === v.durationMin && (v.negativeNotPrinted || Math.abs(st.negativeMark - v.negativePerWrong) < 0.005)
      : null;
    report.push(`${code}: PATTERN ${patternSentence(v)}${c.noticeIsLatest !== "yes" ? ` [latest notice: ${c.noticeIsLatest}]` : ""}${agree === null ? "" : agree ? " [stored row agrees — will print]" : ` [STORED ROW DIFFERS: ${st.totalQuestions}/${st.totalMarks}/${st.durationMin}/${st.negativeMark} — will NOT print until the row is corrected]`}`);
  } else {
    report.push(`${code}: no pattern — ${why.join("; ")}`);
  }

  // Syllabus places.
  const sy = r.syllabus;
  const topicOk = new Map<string, string>((c.topics ?? []).map((t: any) => [t.topicCode, t.verdict]));
  const found = (r.topics ?? []).filter((t: any) => t.found && clean(t.where) && topicOk.get(t.topicCode) === "confirmed" && TOPIC_PAGES_STAGE1.has(`${code}/${t.topicCode}`));
  if (o.noPlaces) { report.push(`${code}: topics placed 0 — ${o.noPlaces}`); continue; }
  if (found.length && c.hostIsOfficial === true && c.documentOpens === true && sy?.url && hostOk(sy.url, r.body?.host ?? "", true) && clean(sy.title) && clean(r.body?.short)) {
    documents[code] = {
      publisherShort: o.short ?? clean(r.body.short, 32),
      name: brief(sy.title, 110),
      url: sy.url,
      readOn,
      ...(sy.scanned === true || o.syllabusScanned ? { scanned: true } : {}),
      ...(o.syllabusCaveat ? { caveat: o.syllabusCaveat } : {}),
    };
    for (const t of found) places[`${code}/${t.topicCode}`] = { doc: code, where: brief(t.where, 130, true) };
    report.push(`${code}: topics placed ${found.length} of ${(r.topics ?? []).length}`);
  } else {
    report.push(`${code}: topics placed 0 of ${(r.topics ?? []).length}${found.length ? " (document gate)" : ""}`);
  }
}

console.log(report.join("\n"));
if (dropped.length) console.log(`\nfields left out (too long to print whole):\n  ${dropped.join("\n  ")}`);
console.log(`\npatterns ${Object.keys(patterns).length} · documents ${Object.keys(documents).length} · topic places ${Object.keys(places).length}`);

if (WRITE) {
  const body = `// GENERATED by scripts/build-official-readings.ts — do not edit by hand.
//
// Exam patterns and syllabus places read from the conducting bodies' own
// documents, each read twice (the second reading re-opened every document).
// Only what both readings found is here. Hand-read entries live in
// src/lib/pattern-verified.ts and src/lib/official-syllabus-lines.ts and win
// over an entry of the same key here.

import type { VerifiedPattern } from "@/lib/pattern-verified";
import type { SyllabusDocument } from "@/lib/official-syllabus-lines";

export const READ_PATTERNS: Readonly<Record<string, VerifiedPattern>> = ${JSON.stringify(patterns, null, 2)};

export const READ_DOCUMENTS: Readonly<Record<string, SyllabusDocument>> = ${JSON.stringify(documents, null, 2)};

/** "{EXAM}/{topic.code}" → the document's key and the place in it. */
export const READ_PLACES: Readonly<Record<string, { doc: string; where: string }>> = ${JSON.stringify(places, null, 2)};
`;
  fs.writeFileSync(OUT, body);
  console.log("written", OUT);
}
