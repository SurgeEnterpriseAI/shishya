// The page tools of Ask Shishya's AI (26 Sep 2026, founder brief: the AI
// "answers the query and recommends a page we already have").
//
// Until today /ask could see only the government-exam tables: nothing about
// school, colleges, scholarships or careers, and every topic / PYQ link it
// wrote was a guess. These tools hand the model the site itself, from the
// same search index the strip and /ask use (src/lib/search, built from the
// sitemap's own loaders and the static data):
//   find_pages       — the search resolver over the deep index: real pages
//                      with their labels, sections and status;
//   page_facts       — structured facts for one page the index knows
//                      (college, branch, scholarship, career, study abroad,
//                      school class / subject / chapter, state, landing);
//   search_topics    — an exam's topic-note pages by name (never guessed codes);
//   exam_page_facts  — which of an exam's pages exist (the DB half — full-
//                      pattern mock, official papers — is read in
//                      src/lib/ask-engine.ts).
// Every result is names, paths, flags and facts — never page body text, and
// never a word of a school textbook (school facts are the board, class,
// subject, chapter name, status and the OFFICIAL book / syllabus links).
// No DB read and no model call in this file.

import type Anthropic from "@anthropic-ai/sdk";
import { LIST_MIN, type PageStatus, type SearchDoc, type SearchIndex, type SearchSection } from "./types";
import { resolveQuery } from "./resolve";
import { examIntentUrl, localeTarget } from "./targets";
import { normaliseTerm } from "./normalize";
import type { ExamIntent } from "./types";
import { STATES, stateCodeFromSlug } from "@/lib/state-info";
import { COLLEGES, findCollege, formatNirfRanks, NIRF_SOURCE_YEAR } from "@/lib/colleges-data";
import { findCollegeDetail, findBranch } from "@/data/college-details";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { CAREER_CATEGORIES, findCareer } from "@/data/careers";
import { TEST_PREP, findCountry, findUniversity } from "@/lib/worldwide-data";
import { ncertSubjectsForClass, ncertTopicCode } from "@/lib/school/spine";
import { SCHOOL_BOARDS, findSchoolChapterBySlug, schoolSubjectCodeFromSlug } from "@/lib/school/surface";
import { schoolClassIdentity } from "@/lib/school/context";
import { knownPath } from "@/lib/ask-links";

const SITE = "https://shishya.in";
type Locale = "en" | "hi" | "te";
const abs = (path: string, locale: Locale = "en") => `${SITE}${localeTarget(path, locale)}`;

/** What a page's status means, in words the model repeats to the student. */
export const STATUS_WORDS: Readonly<Record<PageStatus, string>> = {
  ready: "Shishya's own notes and answer-checked practice are ready",
  "book-only": "official book link only — Shishya's notes and practice for it are not written yet",
  coming: "coming — not live yet",
  "sign-in": "needs a free sign-in",
};

const SECTIONS: readonly SearchSection[] = ["school", "entrance", "government", "college", "careers", "more"];

// ── Tool definitions ─────────────────────────────────────────────────

export const PAGE_TOOLS: Anthropic.Messages.Tool[] = [
  {
    name: "find_pages",
    description:
      "Find the pages Shishya really has for any words — a class, subject or chapter, an exam and its page (dates, syllabus, cutoff, previous papers, mocks), a college or branch, a scholarship, a career, a state, study abroad, a site tool. Any language or script. Returns real links with a label, section and status. Use it for EVERY Shishya page you want to link that you were not already given — never build a path yourself.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The words to look up, e.g. 'class 10 science electricity', 'ssc cgl cutoff', 'iit bombay cse', 'scholarship for girls in karnataka'." },
        section: { type: "string", enum: [...SECTIONS], description: "Optional: keep only pages of one section." },
      },
      required: ["query"],
    },
  },
  {
    name: "page_facts",
    description:
      "Structured facts for ONE Shishya page (give its https://shishya.in/… link from find_pages or the verified list): a college (NIRF 2024 ranks, type, streams, entry exam, placements and closing ranks with their year and source), a scholarship (awarding body, levels, eligibility, amount and deadline as listed, official link), a career (entry routes, qualifications, indicative salary bands), a study-abroad country / university / test, a school board / class / subject / chapter (status, official book or syllabus link, whether a chat tutor exists for that class), a state's exam list. Never returns page text.",
    input_schema: {
      type: "object",
      properties: { url: { type: "string", description: "A Shishya link, e.g. https://shishya.in/colleges/iit-madras" } },
      required: ["url"],
    },
  },
  {
    name: "exam_page_facts",
    description:
      "Which pages ONE exam has on Shishya (by its code from search_exams / find_pages): dates & updates, syllabus, cutoff, previous-paper practice sets and their years, topic notes, mocks, checklist, guide, tricks, the mock builder — plus whether a full-pattern mock and the conducting body's official papers (and their years) are held.",
    input_schema: { type: "object", properties: { code: { type: "string" } }, required: ["code"] },
  },
  {
    name: "search_topics",
    description:
      "An exam's topic-note pages by topic name (e.g. exam_code SSC_CGL, query 'percentage'). Returns real topic links — use these instead of ever writing a topic code yourself.",
    input_schema: {
      type: "object",
      properties: { exam_code: { type: "string" }, query: { type: "string" } },
      required: ["exam_code", "query"],
    },
  },
];

// ── Shared helpers ───────────────────────────────────────────────────

const docMemo = new WeakMap<SearchIndex, Map<string, SearchDoc>>();
function docsByPath(index: SearchIndex): Map<string, SearchDoc> {
  let m = docMemo.get(index);
  if (!m) {
    m = new Map();
    for (const d of index.docs) {
      const p = d.path.split("#")[0];
      if (!m.has(p)) m.set(p, d);
    }
    docMemo.set(index, m);
  }
  return m;
}

/** The exam intents offered as an exam's page list, in this order. */
const EXAM_PAGE_INTENTS: readonly ExamIntent[] = ["hub", "dates", "syllabus", "cutoff", "pyq", "topics", "mocks", "subject-tests", "build-mock", "guide", "tricks", "eligibility", "salary", "checklist"];

export interface ExamPage {
  key: ExamIntent;
  label: string;
  url: string; // absolute
}

/** The pages one exam really has (gates, PYQ years, topic notes, deep blocks), as absolute links. */
export function examPages(index: SearchIndex, code: string, locale: Locale = "en"): ExamPage[] {
  const facts = index.exams[code];
  if (!facts) return [];
  const title = docsByPath(index).get(`/exams/${code}`)?.title ?? code;
  const out: ExamPage[] = [];
  const seen = new Set<string>();
  for (const intent of EXAM_PAGE_INTENTS) {
    if ((intent === "mocks" || intent === "subject-tests") && !facts.live) continue;
    const t = examIntentUrl(code, intent, facts);
    if (t.downgraded || t.applied !== intent) continue;
    const url = abs(t.url, locale);
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ key: intent, label: intent === "hub" ? title : `${title} · ${t.label}`, url });
  }
  return out;
}

// ── Loose name match ─────────────────────────────────────────────────

// Words that name a kind of page or a question, not a page: they never make a loose match on their own.
const LOOSE_STOP = new Set([
  "the", "and", "for", "with", "what", "how", "which", "who", "when", "where", "why", "does", "can", "about", "details", "info",
  "scholarship", "scholarships", "college", "colleges", "exam", "exams", "career", "careers", "page", "pages", "job", "jobs",
  "eligibility", "amount", "salary", "fees", "fee", "cutoff", "syllabus", "date", "dates", "notes", "mock", "mocks", "test",
  "apply", "last", "kya", "hai", "kaise", "kab", "kitna", "ka", "ki", "ke", "liye",
]);

/**
 * Pages whose name shares a distinctive word with the search, word-prefix
 * included ("nmms" → the NMMSS page) — the safety net when the resolver finds
 * nothing (26 Sep 2026: the proof run's "NMMS scholarship" found no page
 * although /scholarships/nmmss exists, and the AI fell back to the web). The
 * rows are labelled as loose matches so the model checks they fit.
 */
export function looseMatches(index: SearchIndex, query: string, limit = 5): SearchDoc[] {
  const words = [...new Set(normaliseTerm(query).split(" ").filter((w) => w.length >= 3 && !LOOSE_STOP.has(w)))];
  if (words.length === 0) return [];
  const need = words.length === 1 ? 1 : 0.5;
  const scored: { d: SearchDoc; s: number }[] = [];
  for (const d of index.docs) {
    const toks = new Set(
      [...d.terms, ...(d.soft ?? []), d.id.slice(d.id.indexOf(":") + 1).replace(/[-_:]+/g, " ")].flatMap((t) => normaliseTerm(t).split(" ")).filter((t) => t.length >= 3),
    );
    let hit = 0;
    for (const w of words) if (toks.has(w) || [...toks].some((t) => t.startsWith(w))) hit++;
    const s = hit / words.length;
    if (s >= need) scored.push({ d, s });
  }
  return scored
    .sort((a, b) => b.s - a.s || b.d.weight - a.d.weight || a.d.title.localeCompare(b.d.title))
    .slice(0, limit)
    .map((x) => x.d);
}

// ── find_pages ───────────────────────────────────────────────────────

export function findPages(index: SearchIndex, input: { query?: unknown; section?: unknown }, locale: Locale = "en") {
  const query = String(input?.query ?? "").replace(/\s+/g, " ").trim().slice(0, 200);
  if (!query) return { error: "give the words to look up" };
  const r = resolveQuery(query, index, { pageLocale: locale });
  const section = SECTIONS.includes(input?.section as SearchSection) ? (input.section as SearchSection) : null;
  type Row = { label: string; url: string; section: SearchSection; sub: string; status?: PageStatus; loose?: boolean };
  const hits = [...(r.best ? [r.best] : []), ...r.hits, ...r.quick, ...r.recommended];
  let rows: Row[] = hits;
  // Nothing solid from the resolver: add the loose name matches.
  if (!hits.some((h) => h.score >= LIST_MIN)) {
    rows = [...rows, ...looseMatches(index, query).map((d) => ({ label: d.title, url: localeTarget(d.path, locale), section: d.section, sub: d.sub, status: d.status, loose: true }))];
  }
  if (section) {
    const only = rows.filter((h) => h.section === section);
    if (only.length) rows = only;
  }
  const seen = new Set<string>();
  const pages = rows
    .filter((h) => (seen.has(h.url) ? false : (seen.add(h.url), true)))
    .slice(0, 10)
    .map((h) => ({
      label: h.label,
      url: `${SITE}${h.url}`,
      section: h.section,
      about: h.sub,
      ...(h.status ? { status: STATUS_WORDS[h.status] } : {}),
      ...(h.loose ? { match: "loose name match — check it fits before linking" } : {}),
    }));
  return {
    understood: r.understood.map((u) => u.label),
    oneClearPage: r.outcome === "direct",
    notices: r.notices,
    pages,
    ...(pages.length === 0 ? { closestSection: { label: r.fallback.label, url: `${SITE}${r.fallback.url}` } } : {}),
  };
}

// ── search_topics ────────────────────────────────────────────────────

export function searchTopics(index: SearchIndex, input: { exam_code?: unknown; query?: unknown }, locale: Locale = "en") {
  const code = String(input?.exam_code ?? "").toUpperCase().replace(/[^A-Z0-9_]/g, "");
  const facts = index.exams[code];
  if (!facts) return { error: "unknown exam code — get it from search_exams or find_pages first" };
  const words = normaliseTerm(String(input?.query ?? "").slice(0, 120)).split(" ").filter((w) => w.length > 1);
  const topicsIndex = facts.topicNotes ? abs(`/exams/${code}/topics`, locale) : null;
  if (words.length === 0) return { topics: [], topicsIndex };
  const scored = index.docs
    .filter((d) => d.kind === "topic-note" && d.examCode === code)
    .map((d) => {
      const toks = new Set(d.terms.flatMap((t) => t.split(" ")));
      const hit = words.filter((w) => toks.has(w) || [...toks].some((t) => t.length >= 4 && w.length >= 4 && (t.startsWith(w) || w.startsWith(t)))).length;
      return { d, score: hit / words.length };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.d.title.localeCompare(b.d.title))
    .slice(0, 8);
  return {
    topics: scored.map(({ d }) => ({ title: d.title, url: `${SITE}${d.path}` })),
    topicsIndex,
    ...(scored.length === 0 ? { note: topicsIndex ? "No topic of that name has notes; the topics page lists every topic that does." : "This exam has no topic-note pages yet." } : {}),
  };
}

// ── page_facts ───────────────────────────────────────────────────────

const lpa = (n: number | undefined) => (typeof n === "number" ? `₹${n} LPA` : null);

/**
 * The tutor / practice line for a school page, from the page's own status
 * (26 Sep 2026, search fixer). The old line promised "practise a chapter with
 * Shishya's own answer-checked questions" on every Class 8-12 page — but a
 * chapter has account practice only with ≥ 5 checked questions (the
 * SchoolStudentEntry rule), and on 26 Sep no Class 8-12 chapter had any. So:
 * practice is named only for a chapter marked ready; a book-only chapter says
 * its notes and practice are not written yet; a class / subject page counts
 * its ready chapters from the index. The tutor lives on CBSE (NCERT) chapter
 * pages only.
 */
function schoolTutor(index: SearchIndex, doc: SearchDoc): { tutor: string | null; readyChapters?: number; chapters?: number } {
  const cls = doc.cls;
  if (cls == null) return { tutor: null };
  if (cls <= 7) {
    return {
      tutor:
        doc.kind === "school-chapter" && doc.status !== "ready"
          ? "Class 1-7 pages have no chat tutor and no sign-in. Shishya's own notes and practice for this chapter are not written yet — do not promise practice for it."
          : "Class 1-7 pages have no chat tutor and no sign-in. A chapter marked ready has Shishya's own notes or a short practice that needs no account — describe only what its page shows.",
    };
  }
  if (doc.board !== "cbse") {
    return { tutor: "Shishya's AI tutor and account practice are on CBSE (NCERT) Class 8-12 chapter pages, not on this board's pages — do not promise them here." };
  }
  const TUTOR = "A student aged 13 or above can sign in on a Class 8-12 chapter page to ask Shishya's AI tutor about that chapter.";
  if (doc.kind === "school-chapter") {
    return {
      tutor:
        doc.status === "ready"
          ? `${TUTOR} This chapter is marked ready: its page has Shishya's own notes or answer-checked practice — describe only what the page shows (account practice needs at least 5 checked questions).`
          : `${TUTOR} Shishya's own notes and practice for this chapter are not written yet — do not promise practice for it.`,
    };
  }
  const under = index.docs.filter((d) => d.kind === "school-chapter" && d.board === doc.board && d.cls === cls && (!doc.subjectSlug || d.subjectSlug === doc.subjectSlug));
  const ready = under.filter((d) => d.status === "ready").length;
  return {
    tutor:
      ready === 0
        ? `${TUTOR} No chapter under this page has Shishya's own notes or practice yet — do not promise practice.`
        : `${TUTOR} Practice exists only on the chapters marked ready — never promise it for the others.`,
    readyChapters: ready,
    chapters: under.length,
  };
}

function schoolFacts(index: SearchIndex, doc: SearchDoc, path: string) {
  const board = SCHOOL_BOARDS.find((b) => b.slug === doc.board);
  const cls = doc.cls ?? null;
  const { tutor, readyChapters, chapters } = schoolTutor(index, doc);
  const out: Record<string, unknown> = {
    kind: doc.kind,
    url: `${SITE}${path}`,
    board: board?.label ?? doc.board ?? null,
    class: cls,
    title: doc.title,
    ...(doc.status ? { status: STATUS_WORDS[doc.status] } : {}),
    ...(tutor ? { tutor } : {}),
    ...(chapters != null ? { chaptersListed: chapters, chaptersWithShishyaNotesOrPractice: readyChapters } : {}),
    rule: "Shishya never reproduces, summarises or translates textbook text; point to the official book and to Shishya's own chapter page.",
  };
  if (!board || cls == null) return out;
  const identity = schoolClassIdentity(board.curriculum, cls);
  if (doc.subjectSlug) {
    const code = schoolSubjectCodeFromSlug(doc.subjectSlug);
    const sid = identity?.subjects.get(code);
    if (board.curriculum === "NCERT") {
      if (sid?.books.length) out.officialBooks = sid.books.map((b) => ({ title: b.title, url: b.url }));
      if (doc.kind === "school-chapter") {
        out.chapterNumber = doc.chapterNo ?? null;
        const chapterSlug = path.split("/").pop() ?? "";
        const spineSubject = ncertSubjectsForClass(cls).find((s) => s.code === code);
        const list = (spineSubject?.books ?? []).flatMap((b) => b.chapters.map((ch) => ({ code: ncertTopicCode(b.code, ch.pdfSeq), name: ch.title, pdfUrl: ch.pdfUrl, book: b.title })));
        const ch = findSchoolChapterBySlug(list, chapterSlug);
        if (ch) out.officialChapterPdf = { book: ch.book, url: ch.pdfUrl };
      }
    } else if (sid?.syllabusUrls.length) {
      out.officialSyllabus = sid.syllabusUrls;
    } else if (identity?.levelDocument) {
      out.officialCurriculumDocument = identity.levelDocument;
    }
  } else if (identity) {
    out.officialSource = identity.source;
  }
  return out;
}

function collegeList(filter: (c: (typeof COLLEGES)[number]) => boolean) {
  return COLLEGES.filter(filter)
    .slice(0, 25)
    .map((c) => ({ name: c.shortName, url: `${SITE}/colleges/${c.slug}`, nirf: formatNirfRanks(c.nirf) || null }));
}

/** Structured facts for one page of the index (see the header). */
export function pageFacts(index: SearchIndex, input: { url?: unknown }, locale: Locale = "en"): Record<string, unknown> {
  const canon = knownPath(String(input?.url ?? ""), index);
  if (!canon) return { error: "not a page Shishya has — use find_pages to get real links" };
  const path = canon.split("?")[0];
  const doc = docsByPath(index).get(canon) ?? docsByPath(index).get(path);
  const segs = path.split("/").filter(Boolean);

  const exam = /^\/exams\/([A-Z0-9_]+)(\/|$)/.exec(path);
  if (exam && index.exams[exam[1]]) {
    const code = exam[1];
    return {
      kind: "exam",
      code,
      title: docsByPath(index).get(`/exams/${code}`)?.title ?? code,
      pagesThatExist: examPages(index, code, locale),
      note: "For dates, pattern, eligibility and results call get_exam_details; for PYQ years and official papers call exam_page_facts.",
    };
  }
  if (!doc) return { kind: "page", url: `${SITE}${canon}` };

  switch (doc.kind) {
    case "school-board":
    case "school-class":
    case "school-subject":
    case "school-chapter":
      return schoolFacts(index, doc, path);

    case "college": {
      const c = findCollege(segs[1] ?? "");
      if (!c) break;
      const d = findCollegeDetail(c.slug);
      return {
        kind: "college",
        url: `${SITE}${path}`,
        name: c.name,
        shortName: c.shortName,
        city: c.city,
        state: STATES[c.state]?.name ?? c.state,
        type: c.type,
        established: c.established,
        streams: c.streams,
        nirf: formatNirfRanks(c.nirf) || `not in the NIRF ${NIRF_SOURCE_YEAR} lists Shishya holds`,
        officialWebsite: c.website,
        about: c.blurb,
        ...(d?.entryExamCode
          ? { entryExam: { code: d.entryExamCode, ...(index.exams[d.entryExamCode] ? { page: abs(`/exams/${d.entryExamCode}`, locale) } : {}) } }
          : {}),
        ...(d?.overallPlacements
          ? { overallPlacements: { median: lpa(d.overallPlacements.medianLpa), placementPct: d.overallPlacements.placementPct ?? null, year: d.overallPlacements.year, source: d.overallPlacements.source, note: d.overallPlacements.notes ?? null } }
          : {}),
        ...(d?.branches.length ? { branchPages: d.branches.map((b) => ({ name: `${b.degree} ${b.name}`, url: `${SITE}/colleges/${c.slug}/${b.slug}` })) } : {}),
      };
    }

    case "college-branch": {
      const c = findCollege(segs[1] ?? "");
      const b = findBranch(segs[1] ?? "", segs[2] ?? "");
      if (!c || !b) break;
      const latest = Math.max(0, ...b.cutoffs.map((x) => x.year));
      return {
        kind: "college-branch",
        url: `${SITE}${path}`,
        college: c.name,
        branch: `${b.degree} ${b.name}`,
        durationYears: b.durationYears,
        seats: b.seats ?? null,
        about: b.blurb,
        placements: b.placements.map((p) => ({ year: p.year, median: lpa(p.medianLpa), top: lpa(p.topLpa), placementPct: p.placementPct ?? null, source: p.source })),
        closingRanks: b.cutoffs
          .filter((x) => x.year === latest)
          .slice(0, 10)
          .map((x) => ({ year: x.year, category: x.category, closingRank: x.closingRank, seats: x.gender === "female" ? "female-only" : "gender-neutral" })),
        closingRankNote: "Closing ranks as Shishya stores them (JoSAA final round for IITs / NITs, MCC for medical) — year shown; they change every year.",
        ...(b.careerSlugs?.length ? { careerPages: b.careerSlugs.filter((s) => findCareer(s)).map((s) => `${SITE}/careers/${s}`) } : {}),
      };
    }

    case "college-state": {
      const code = stateCodeFromSlug(segs[2] ?? "");
      if (!code) break;
      return { kind: "college-state", url: `${SITE}${path}`, state: STATES[code]?.name ?? code, colleges: collegeList((c) => c.state === code), note: `NIRF ${NIRF_SOURCE_YEAR} ranks.` };
    }

    case "college-stream": {
      const stream = segs[2] ?? "";
      return { kind: "college-stream", url: `${SITE}${path}`, stream, colleges: collegeList((c) => (c.streams as string[]).includes(stream)), note: `NIRF ${NIRF_SOURCE_YEAR} ranks.` };
    }

    case "scholarship": {
      const s = SCHOLARSHIPS.find((x) => x.id === segs[1]);
      if (!s) break;
      return {
        kind: "scholarship",
        url: `${SITE}${path}`,
        name: s.name,
        awardingBody: s.awardingBody,
        type: s.type,
        state: s.state ? (STATES[s.state]?.name ?? s.state) : "all-India",
        levels: s.levels,
        eligibility: {
          categories: s.eligibility.categories ?? "any",
          gender: s.eligibility.gender === "F" ? "girls only" : s.eligibility.gender === "M" ? "boys only" : "any",
          incomeMaxLakhs: s.eligibility.incomeMaxLakhs ?? null,
          minMarksPct: s.eligibility.minMarksPct ?? null,
          requiresExam: s.eligibility.requiresExam ?? [],
          note: s.eligibility.note ?? null,
        },
        amount: `${s.amount} (as listed — confirm on the official portal)`,
        deadline: `${s.deadline} (as listed — confirm on the official portal)`,
        applyUrl: s.applyUrl,
        officialSite: s.officialSite ?? null,
        about: s.description,
        matcher: `${SITE}/scholarships/match`,
      };
    }

    case "career": {
      const c = findCareer(segs[1] ?? "");
      if (!c) break;
      return {
        kind: "career",
        url: `${SITE}${path}`,
        name: c.name,
        category: CAREER_CATEGORIES.find((k) => k.slug === c.category)?.label ?? c.category,
        summary: c.dek,
        qualifications: c.qualifications,
        entryRoutes: c.entryRoutes.map((r) => ({ title: r.title, how: r.body })),
        salaryBands: c.salaryBands,
        salaryNote:
          "Indicative bands, wide on purpose — real pay varies by city, employer and year. Sources named on Shishya's careers pages: NASSCOM, Naukri JobSpeak, 7th Pay Commission, PayScale aggregates, official ministry salary structures.",
        examPages: (c.examCodes ?? []).filter((x) => index.exams[x]).map((x) => abs(`/exams/${x}`, locale)),
        relatedCareers: (c.related ?? []).filter((s) => findCareer(s)).map((s) => `${SITE}/careers/${s}`),
      };
    }

    case "abroad-country": {
      const c = findCountry(segs[1] ?? "");
      if (!c) break;
      return {
        kind: "abroad-country",
        url: `${SITE}${path}`,
        country: c.name,
        costs: c.costSummary,
        applicationTimeline: c.applicationTimeline,
        postStudyWork: c.postStudyWork,
        visa: { type: c.visaType, officialUrl: c.visaUrl },
        englishTests: c.englishTest,
        universityPages: c.universities.map((u) => ({ name: u.name, url: `${SITE}/worldwide/${c.slug}/${u.slug}` })),
      };
    }

    case "abroad-university": {
      const u = findUniversity(segs[1] ?? "", segs[2] ?? "");
      if (!u) break;
      return {
        kind: "abroad-university",
        url: `${SITE}${path}`,
        name: u.name,
        location: u.location,
        qsRank: u.qsRank ?? null,
        timesRank: u.timesRank ?? null,
        tuition: u.tuitionRange,
        strongPrograms: u.strongPrograms,
        admissionsUrl: u.admissionsUrl,
        officialSite: u.officialSite,
        note: "Ranks and fees as Shishya stores them — check the university's site for this year's figures.",
      };
    }

    case "abroad-test": {
      const t = TEST_PREP.find((x) => x.slug === segs[2]);
      if (!t) break;
      return { kind: "abroad-test", url: `${SITE}${path}`, name: t.name, fullName: t.fullName, acceptedFor: t.acceptedFor, format: t.format, feeInr: t.feeInr, validity: t.validity, officialSite: t.officialSite };
    }

    case "exam-state": {
      const code = doc.state ?? null;
      const exams = index.docs.filter((d) => d.kind === "exam" && d.state === code).slice(0, 40).map((d) => ({ name: d.title, url: abs(d.path, locale) }));
      return { kind: "exam-state", url: abs(path, locale), state: code ? (STATES[code]?.name ?? code) : null, exams };
    }

    default:
      break;
  }
  return { kind: doc.kind, url: `${SITE}${canon}`, title: doc.title, about: doc.sub, ...(doc.status ? { status: STATUS_WORDS[doc.status] } : {}) };
}
