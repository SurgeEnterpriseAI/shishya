// Compact wire form of the search index (26 Sep 2026) — what GET
// /api/search/index sends and the home strip decodes on first focus. Pure.
//
// The lite index holds ~2,350 pages; as plain JSON that is ~880 KB, mostly the
// 1,146 school chapters, 325 subjects and 208 scholarships. The wire form
// nests each subject's chapters as [name, ±orderIdx, slug?] and rebuilds their
// id, path, title, sub and match key on decode (the /schooling/{board}/
// class-{n}/{subject}/{chapter} scheme of src/lib/school/surface.ts); it drops
// the match keys a row can rebuild (its normalised title, the head of its sub
// line, its key as words), rebuilds a scholarship's sub line from its own
// facts, and derives the paths every kind builds from one key.
// decodeIndex(encodeIndex(x)) equals x (tests/unit/search-resolver.test.ts),
// and the lite wire stays under 200 KB raw / 47 KB gzipped (same test; 27 Sep
// 2026: measured with the capsule months production adds, index-core.ts
// LITE_CAPSULE_MONTHS).

import type { DocKind, ExamFacts, PageStatus, SearchDoc, SearchIndex } from "./types";
import { SEARCH_SECTIONS } from "./types";
import { normaliseTerm } from "./normalize";
import { scholarshipSub } from "./labels";
import { STATES } from "@/lib/state-info";

const KINDS: readonly DocKind[] = [
  "exam", "exam-state", "exam-category", "school-board", "school-class", "school-subject", "school-chapter", "topic-note", "college",
  "college-branch", "college-state", "college-stream", "scholarship", "career", "persona", "abroad-country", "abroad-university",
  "abroad-test", "insight", "landing",
];
const STATUSES: readonly PageStatus[] = ["ready", "book-only", "coming", "sign-in"];
const LEVEL_CODE: Readonly<Record<string, string>> = { CLASS_9_10: "9", CLASS_11_12: "11", DIPLOMA: "d", UG: "u", PG: "p", PHD: "h" };
const LEVEL_FROM: Readonly<Record<string, string>> = Object.fromEntries(Object.entries(LEVEL_CODE).map(([k, v]) => [v, k]));
const BOARD_LABEL: Readonly<Record<string, string>> = { cbse: "CBSE (NCERT)", "icse-cisce": "CISCE (ICSE / ISC)" };

/** Paths a kind builds from its key alone (the key is the id after "kind:"). */
function defaultPath(kind: DocKind, key: string): string | null {
  switch (kind) {
    case "exam":
      return `/exams/${key}`;
    case "college":
      return `/colleges/${key}`;
    case "scholarship":
      return `/scholarships/${key}`;
    case "career":
      return `/careers/${key}`;
    case "persona":
      return `/for/${key}`;
    case "insight":
      return `/insights/${key}`;
    case "abroad-test":
      return `/worldwide/test-prep/${key}`;
    case "landing":
      return key;
    default:
      return null;
  }
}

/** Match keys a row can rebuild instead of sending: its normalised title, the
 *  head of its sub line (an exam's full name), its key as words (an exam code
 *  "SSC_CGL" → "ssc cgl"), and the title and sub head without their brackets.
 *  A bitmask says which of them the page has. */
function derivable(title: string, sub: string, key: string): string[] {
  const head = sub.split(" · ")[0] ?? "";
  const outer = (s: string) => normaliseTerm(s.replace(/\([^)]*\)/g, " "));
  return [normaliseTerm(title), normaliseTerm(head), normaliseTerm(key.replace(/[_:/-]+/g, " ")), outer(title), outer(head)];
}

type Row = [
  kind: number,
  key: string,
  title: string,
  sub: string,
  path: string | 0,
  terms: string[] | 0,
  derived: number,
  soft: string[] | 0,
  weight: number,
  section: number,
  state: string | 0,
  status: number,
  extra: unknown[] | 0,
];
type ClassRow = [board: string, cls: number];
/** A chapter: [name, orderIdx, slug when it is not the kebab of the name].
 *  orderIdx is 0 when it is the previous chapter's + 1, and is negated (-1 for
 *  the "+1" case) when the chapter has Shishya's notes or checked practice. */
type ChapterWire = [name: string, order: number, slug?: string];
type SubjectRow = [cls: number, slug: string, name: string, terms: string[] | 0, chapters: ChapterWire[]];
type ExamRow = [gates: string, pyqYears: string, topicNotes: 0 | 1, eligibility: 0 | 1, salary: 0 | 1, live: 0 | 1, category: string];

export interface WireIndex {
  v: 1;
  w: 2;
  builtAt: string;
  tier: "lite" | "deep";
  exams: Record<string, ExamRow>;
  d: Row[];
  sc: ClassRow[];
  ss: SubjectRow[];
}

const bit = (b: boolean): 0 | 1 => (b ? 1 : 0);
const kebab = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** [2021, 2022, 2023, 2024, 2025] → "2021-2025"; gaps → "2021,2023". */
function yearsWire(ys: readonly number[]): string {
  if (ys.length === 0) return "";
  const contiguous = ys.every((y, i) => i === 0 || y === ys[i - 1] + 1);
  return contiguous && ys.length > 1 ? `${ys[0]}-${ys[ys.length - 1]}` : ys.join(",");
}
function yearsFromWire(s: string): number[] {
  if (!s) return [];
  const m = /^(\d{4})-(\d{4})$/.exec(s);
  if (m) {
    const out: number[] = [];
    for (let y = Number(m[1]); y <= Number(m[2]); y++) out.push(y);
    return out;
  }
  return s.split(",").map(Number);
}

export function encodeIndex(index: SearchIndex): WireIndex {
  const exams: Record<string, ExamRow> = {};
  for (const [code, f] of Object.entries(index.exams)) {
    const g = f.gates;
    exams[code] = [
      [g.cutoff, g.syllabus, g.tricks, g.guide, g.buildMock].map((x) => (x ? "1" : "0")).join(""),
      yearsWire(f.pyqYears),
      bit(f.topicNotes),
      bit(f.deep.eligibility),
      bit(f.deep.salary),
      bit(f.live),
      f.category ?? "",
    ];
  }
  const d: Row[] = [];
  const sc: ClassRow[] = [];
  const ss: SubjectRow[] = [];
  const classRef = new Map<string, number>();
  const subjectRef = new Map<string, number>();
  const lastOrder = new Map<number, number>();
  for (const doc of index.docs) {
    const key = doc.id.slice(doc.kind.length + 1);
    if (doc.kind === "school-class") {
      classRef.set(`${doc.board}:${doc.cls}`, sc.length);
      sc.push([doc.board ?? "cbse", doc.cls ?? 0]);
      continue;
    }
    if (doc.kind === "school-subject") {
      const ci = classRef.get(`${doc.board}:${doc.cls}`);
      if (ci != null) {
        subjectRef.set(`${doc.board}:${doc.cls}:${doc.subjectSlug}`, ss.length);
        const plain = doc.terms.length === 1 && doc.terms[0] === normaliseTerm(doc.title);
        ss.push([ci, doc.subjectSlug ?? "", doc.title, plain ? 0 : doc.terms, []]);
        continue;
      }
    }
    if (doc.kind === "school-chapter") {
      const si = subjectRef.get(`${doc.board}:${doc.cls}:${doc.subjectSlug}`);
      const slug = doc.path.split("/").pop() ?? "";
      if (si != null && doc.terms.length === 1 && doc.terms[0] === normaliseTerm(doc.title) && (doc.status === "ready" || doc.status === "book-only")) {
        const order = (doc.book ?? 1) * 100 + (doc.chapterNo ?? 0);
        const prev = lastOrder.get(si);
        lastOrder.set(si, order);
        const stored = prev != null && order === prev + 1 ? 0 : order;
        const row: ChapterWire = [doc.title, doc.status === "ready" ? (stored === 0 ? -1 : -stored) : stored];
        if (slug !== kebab(doc.title)) row.push(slug);
        ss[si][4].push(row);
        continue;
      }
    }
    const cands = derivable(doc.title, doc.sub, key);
    let derived = 0;
    cands.forEach((t, k) => {
      if (t && doc.terms.includes(t)) derived |= 1 << k;
    });
    const drop = new Set(cands.filter((t, k) => t && derived & (1 << k)));
    const terms = doc.terms.filter((t) => !drop.has(t));
    const extra: unknown[] = [];
    let sub = doc.sub;
    if (doc.examCode && doc.kind !== "exam") extra.push(["e", doc.examCode]);
    if (doc.board) extra.push(["b", doc.board]);
    if (doc.cls != null) extra.push(["c", doc.cls]);
    if (doc.subjectSlug) extra.push(["s", doc.subjectSlug]);
    if (doc.chapterNo != null) extra.push(["n", doc.chapterNo, doc.book ?? 1]);
    if (doc.listOnly) extra.push(["l"]);
    if (doc.scholarship) {
      const h = doc.scholarship;
      const rebuilt = h.type ? scholarshipSub(h.type, h.state ? (STATES[h.state]?.name ?? null) : null, h.levels, h.gender) : null;
      if (rebuilt === sub) sub = "";
      extra.push(["h", h.gender ?? 0, h.levels.map((l) => LEVEL_CODE[l] ?? l).join(","), h.categories.join(","), h.type ?? 0]);
    }
    d.push([
      KINDS.indexOf(doc.kind),
      key,
      doc.title,
      sub,
      defaultPath(doc.kind, key) === doc.path ? 0 : doc.path,
      terms.length ? terms : 0,
      derived,
      doc.soft?.length ? doc.soft : 0,
      Math.round(doc.weight * 100),
      SEARCH_SECTIONS.indexOf(doc.section),
      doc.state ?? 0,
      doc.status ? STATUSES.indexOf(doc.status) : -1,
      extra.length ? extra : 0,
    ]);
  }
  return { v: 1, w: 2, builtAt: index.builtAt, tier: index.tier, exams, d, sc, ss };
}

const STATE_KINDS: ReadonlySet<DocKind> = new Set(["exam", "topic-note", "scholarship", "school-board", "college", "college-branch"]);

export function decodeIndex(wire: unknown): SearchIndex {
  const w = wire as WireIndex;
  if (!w || w.v !== 1 || w.w !== 2 || !Array.isArray(w.d)) throw new Error("search index: unknown wire format");
  const exams: Record<string, ExamFacts> = {};
  for (const [code, r] of Object.entries(w.exams ?? {})) {
    const g = r[0];
    exams[code] = {
      gates: { cutoff: g[0] === "1", syllabus: g[1] === "1", tricks: g[2] === "1", guide: g[3] === "1", buildMock: g[4] === "1" },
      pyqYears: yearsFromWire(r[1]),
      topicNotes: r[2] === 1,
      deep: { eligibility: r[3] === 1, salary: r[4] === 1 },
      live: r[5] === 1,
      ...(r[6] ? { category: r[6] } : {}),
    };
  }
  const docs: SearchDoc[] = [];
  for (const r of w.d) {
    const kind = KINDS[r[0]];
    const key = r[1];
    const doc: SearchDoc = {
      id: `${kind}:${key}`,
      kind,
      section: SEARCH_SECTIONS[r[9]] ?? "more",
      title: r[2],
      sub: r[3],
      path: r[4] === 0 ? (defaultPath(kind, key) ?? "/") : r[4],
      terms: [],
      weight: r[8] / 100,
    };
    if (r[7] !== 0) doc.soft = r[7];
    if (r[10] !== 0) doc.state = r[10];
    else if (STATE_KINDS.has(kind)) doc.state = null;
    if (r[11] >= 0) doc.status = STATUSES[r[11]];
    if (kind === "exam") doc.examCode = key;
    for (const x of (r[12] === 0 ? [] : r[12]) as unknown[][]) {
      switch (x[0]) {
        case "e":
          doc.examCode = x[1] as string;
          break;
        case "b":
          doc.board = x[1] as string;
          break;
        case "c":
          doc.cls = x[1] as number;
          break;
        case "s":
          doc.subjectSlug = x[1] as string;
          break;
        case "n":
          doc.chapterNo = x[1] as number;
          doc.book = x[2] as number;
          break;
        case "l":
          doc.listOnly = true;
          break;
        case "h": {
          const gender = (x[1] || null) as "F" | "M" | null;
          const levels = x[2] ? String(x[2]).split(",").map((l) => LEVEL_FROM[l] ?? l) : [];
          const categories = x[3] ? String(x[3]).split(",") : [];
          const type = x[4] ? String(x[4]) : undefined;
          const state = doc.state ?? null;
          doc.scholarship = { gender, state, levels, categories, ...(type ? { type } : {}) };
          if (!doc.sub && type) doc.sub = scholarshipSub(type, state ? (STATES[state]?.name ?? null) : null, levels, gender);
          break;
        }
      }
    }
    doc.terms = [...new Set([...derivable(doc.title, doc.sub, key).filter((t, k) => t && r[6] & (1 << k)), ...(r[5] === 0 ? [] : r[5])])];
    docs.push(doc);
  }
  // School: classes, then each class's subjects with their chapters.
  const classDocs: SearchDoc[] = (w.sc ?? []).map(([board, cls]) => ({
    id: `school-class:${board}:${cls}`,
    kind: "school-class",
    section: "school",
    title: `Class ${cls}`,
    sub: BOARD_LABEL[board] ?? board,
    path: `/schooling/${board}/class-${cls}`,
    terms: [...new Set([`class ${cls}`, `${board === "cbse" ? "ncert" : "icse"} class ${cls}`])],
    weight: board === "cbse" ? 0.4 : 0.3,
    board,
    cls,
  }));
  const subjectDocs: SearchDoc[] = [];
  const chapterDocs: SearchDoc[] = [];
  for (const [ci, slug, name, terms, chapters] of w.ss ?? []) {
    const c = classDocs[ci];
    const s: SearchDoc = {
      id: `school-subject:${c.board}:${c.cls}:${slug}`,
      kind: "school-subject",
      section: "school",
      title: name,
      sub: `Class ${c.cls} · ${BOARD_LABEL[c.board ?? ""] ?? c.board}`,
      path: `${c.path}/${slug}`,
      terms: terms === 0 ? [normaliseTerm(name)] : terms,
      weight: c.board === "cbse" ? 0.2 : 0.15,
      board: c.board,
      cls: c.cls,
      subjectSlug: slug,
    };
    subjectDocs.push(s);
    let prev = 0;
    for (const [cname, order, cslug] of chapters) {
      const stored = Math.abs(order) === 1 ? 0 : Math.abs(order);
      const orderIdx = stored === 0 ? prev + 1 : stored;
      prev = orderIdx;
      const chapterSlug = cslug || kebab(cname);
      const chapterNo = orderIdx % 100;
      chapterDocs.push({
        id: `school-chapter:${s.board}:${s.cls}:${slug}:${chapterSlug}`,
        kind: "school-chapter",
        section: "school",
        title: cname,
        sub: `Class ${s.cls} ${name} · Chapter ${chapterNo}`,
        path: `${s.path}/${chapterSlug}`,
        terms: [normaliseTerm(cname)],
        weight: 0.1,
        status: order < 0 ? "ready" : "book-only",
        board: s.board,
        cls: s.cls,
        subjectSlug: slug,
        chapterNo,
        book: Math.floor(orderIdx / 100),
      });
    }
  }
  return { v: 1, builtAt: w.builtAt, tier: w.tier, docs: [...docs, ...classDocs, ...subjectDocs, ...chapterDocs], exams };
}
