// Link check for Ask Shishya's AI answers (26 Sep 2026, founder brief: "if
// nothing is there, the AI tutor answers the query and recommends a page we
// already have"). PURE — no DB, no model; tests/unit/ask-links.test.ts.
//
// The model writes markdown with links. Before an answer leaves the server,
// every link in it is checked against the site-wide search index (the same
// pages the sitemap lists, the same exam gates / PYQ years / topic notes):
//   * a Shishya link to a page that renders is kept, made absolute
//     (https://shishya.in/…, so it also works in the teacher-request email),
//     its exam code upper-cased, its /hi or /te prefix kept only where the
//     page has that twin;
//   * a Shishya link to a page that does NOT exist (a guessed topic code, a
//     PYQ year with no set, a gated /cutoff) is rewritten to its nearest real
//     parent (/exams/X/topics/BAD → /exams/X/topics, /pyq/2019 → /pyq), or
//     unlinked when there is none — the words stay, the link goes;
//   * an outside link is kept only when this run saw it (a web-search result,
//     a citation, or an official URL a tool returned); otherwise unlinked.
// From the checked text it lifts the structured fields the /ask panel shows:
// the Shishya pages in order (pages), the one "➡️ Open next" page (next) and
// the outside sources under the "🌐 From the web" section (webSources).

import type { ExamIntent, PageLink, PageStatus, SearchDoc, SearchIndex, SearchSection } from "@/lib/search/types";
import { INTENT_LABEL, isSafePath, knownUrl, localeTarget } from "@/lib/search/targets";

export const SITE = "https://shishya.in";
/** Heading marks the prompt asks for (src/lib/ask-prompt.ts) — the emoji carry the structure in any language. */
export const WEB_MARK = "🌐";
export const PAGES_MARK = "📌";
export const NEXT_MARK = "➡️";

export interface WebSource {
  title: string;
  url: string;
}
export interface CheckedAnswer {
  answer: string;
  pages: PageLink[];
  next: PageLink | null;
  webSources: WebSource[];
}
export interface CheckOptions {
  /** Used as `next` when the answer names no Shishya page at all. */
  fallback?: PageLink | null;
  /** At most this many pages are returned (default 8). */
  maxPages?: number;
}

const HOST_RE = /^https?:\/\/(www\.)?shishya\.in(?=[/?#]|$)/i;
// A markdown link [text](url) (one level of brackets allowed inside the url) — or a bare http(s) URL.
const LINK_RE = /\[([^\]\n]*)\]\(\s*<?((?:[^()\s<>]|\([^()\s<>]*\))+)>?\s*\)|(https?:\/\/[^\s<>()[\]"'`]+)/g;
const TRAILING_PUNCT = /[.,;:!?'"»”’]+$/;

/** A comparable form of an outside URL: host without www, path without a trailing slash, query kept, fragment dropped. */
export function normUrl(u: string): string {
  try {
    const x = new URL(u);
    return `${x.hostname.replace(/^www\./, "")}${x.pathname.replace(/\/+$/, "")}${x.search}`.toLowerCase();
  } catch {
    return u.trim().toLowerCase();
  }
}

/** Every http(s) URL inside a piece of text (tool results, the first turn). */
export function urlsIn(text: string): string[] {
  return [...text.matchAll(/https?:\/\/[^\s"'<>\\)\]]+/g)].map((m) => m[0].replace(TRAILING_PUNCT, ""));
}

const isShishya = (u: string) => HOST_RE.test(u) || (u.startsWith("/") && !u.startsWith("//"));

const docCache = new WeakMap<SearchIndex, Map<string, SearchDoc>>();
function docsByPath(index: SearchIndex): Map<string, SearchDoc> {
  let m = docCache.get(index);
  if (!m) {
    m = new Map();
    for (const d of index.docs) {
      const p = d.path.split("#")[0];
      if (!m.has(p)) m.set(p, d);
    }
    docCache.set(index, m);
  }
  return m;
}

/** The site path of a Shishya URL with its host, query and fragment removed; the /hi or /te prefix reported separately. */
function splitShishya(url: string): { path: string; locale: "en" | "hi" | "te"; anchor: string } | null {
  let u = url.trim();
  if (HOST_RE.test(u)) u = u.replace(HOST_RE, "") || "/";
  if (!u.startsWith("/")) u = `/${u}`;
  if (!isSafePath(u)) return null;
  const hashAt = u.indexOf("#");
  const anchor = hashAt >= 0 ? u.slice(hashAt) : "";
  const noHash = hashAt >= 0 ? u.slice(0, hashAt) : u;
  const lm = /^\/(hi|te)(?=\/|$)/.exec(noHash);
  const locale = (lm?.[1] as "hi" | "te" | undefined) ?? "en";
  const path = (lm ? noHash.slice(3) : noHash).split("?")[0].replace(/\/+$/, "") || "/";
  return { path, locale, anchor: /^#[A-Za-z0-9_-]{1,40}$/.test(anchor) ? anchor : "" };
}

/**
 * knownUrl, plus the two exam-area landings it misses: it reads every
 * /exams/{x} path as an exam code, so /exams/state/{slug}, /exams/state and
 * /exams/browse(?category=) came back unknown (26 Sep 2026, flagged to the
 * resolver's owner). Those are looked up here as plain index paths.
 *
 * 27 Sep 2026 (wave 2 search): the wave's page families are known the same
 * way as every other page — as index documents built from each family's own
 * route list (src/lib/search/index-core.ts): /mock-tests, the live
 * /exams/category/{slug} hubs, /exams/after/{level}, CBSE's
 * /schooling/cbse/class-{10,12}/board-exam, the /subjects hubs that render,
 * /scholarships/for/{slug} and /scholarships/closing-soon. A hub that does
 * not render (a category under its floor) is in no list, so a link to it is
 * unlinked; nothing is typed here.
 */
export function knownPath(url: string, index: SearchIndex): string | null {
  const k = knownUrl(url, index);
  if (k) return k;
  const parts = splitShishya(url);
  if (!parts || !/^\/exams\/(state|browse)(\/|$)/.test(parts.path)) return null;
  const docs = docsByPath(index);
  if (parts.path === "/exams/browse") {
    const cat = /[?&]category=([A-Z_]+)(&|#|$)/.exec(url)?.[1];
    if (cat && docs.has(`/exams/browse?category=${cat}`)) return `/exams/browse?category=${cat}`;
  }
  return docs.has(parts.path) ? parts.path : null;
}

/**
 * The canonical path for a Shishya URL: itself when the page exists, else its
 * nearest existing parent (never the home page unless the URL was the home
 * page), else null. `exact` says whether it was the page itself.
 */
export function nearestKnownPath(url: string, index: SearchIndex): { canon: string; exact: boolean } | null {
  const exact = knownPath(url, index);
  if (exact) return { canon: exact, exact: true };
  const parts = splitShishya(url);
  if (!parts) return null;
  const segs = parts.path.split("/").filter(Boolean);
  while (segs.length > 1) {
    segs.pop();
    const c = knownPath(`/${segs.join("/")}`, index);
    if (c && c !== "/") return { canon: c, exact: false };
  }
  return null;
}

const SUB_INTENT: Readonly<Record<string, ExamIntent>> = {
  updates: "dates",
  syllabus: "syllabus",
  cutoff: "cutoff",
  pyq: "pyq",
  topics: "topics",
  checklist: "checklist",
  guide: "guide",
  tricks: "tricks",
  "build-mock": "build-mock",
  "score-estimate": "score",
  live: "live",
  reactions: "reactions",
};
const ANCHOR_INTENT: Readonly<Record<string, ExamIntent>> = {
  mocks: "mocks",
  "subject-tests": "subject-tests",
  "custom-mock": "build-mock",
  eligibility: "eligibility",
  salary: "salary",
  syllabus: "syllabus",
  pyqs: "pyq",
};

const cleanLabel = (s: string) => s.replace(/[*_`[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 80);

/** The PageLink for a checked canonical path — label and section from the index, never from the model. */
export function pageLinkFor(index: SearchIndex, canon: string, anchor: string, locale: "en" | "hi" | "te", text = ""): PageLink {
  const docs = docsByPath(index);
  const url = `${localeTarget(canon, locale)}${anchor}`;
  const doc = docs.get(canon);
  const exam = /^\/exams\/([A-Z0-9_]+)(?:\/(.+))?$/.exec(canon.split("?")[0]);
  if (doc && !(doc.kind === "exam" && anchor)) {
    return { url, label: doc.title, section: doc.section, ...(doc.status ? { status: doc.status } : {}) };
  }
  if (exam && index.exams[exam[1]]) {
    const hub = docs.get(`/exams/${exam[1]}`);
    const title = hub?.title ?? exam[1];
    const section: SearchSection = hub?.section ?? "government";
    const sub = exam[2] ?? "";
    let part: string | null = null;
    let status: PageStatus | undefined;
    if (/^pyq\/\d{4}$/.test(sub)) part = `PYQ ${sub.slice(4)}`;
    else if (sub === "archive") part = "Archive";
    else if (SUB_INTENT[sub]) part = INTENT_LABEL[SUB_INTENT[sub]];
    else if (!sub && anchor && ANCHOR_INTENT[anchor.slice(1)]) part = INTENT_LABEL[ANCHOR_INTENT[anchor.slice(1)]];
    if (sub === "build-mock") status = "sign-in";
    return { url, label: part ? `${title} · ${part}` : title, section, ...(status ? { status } : {}) };
  }
  return { url, label: cleanLabel(text) || canon, section: "more" };
}

const EMPTY_LINE = /^\s*(?:[-*•]|\d+[.)])?\s*(?:[:—–-]\s*)?$/;

/**
 * Check every link of an AI answer (see the header). `seen` = outside URLs
 * this run met (web results, citations, tool results); only those survive.
 */
export function validateAnswerLinks(md: string, index: SearchIndex, seen: ReadonlySet<string>, opts: CheckOptions = {}): CheckedAnswer {
  const seenNorm = new Set([...seen].map(normUrl));
  const maxPages = opts.maxPages ?? 8;
  const pages: PageLink[] = [];
  const pageUrls = new Set<string>();
  const webSources: WebSource[] = [];
  const webUrls = new Set<string>();
  let next: PageLink | null = null;
  let inWeb = false;

  const outLines: string[] = [];
  for (const line of String(md ?? "").split(/\r?\n/)) {
    const startsPages = line.includes(PAGES_MARK) || line.includes(NEXT_MARK) || /open next/i.test(line);
    if (line.includes(WEB_MARK)) inWeb = true;
    else if (inWeb && (startsPages || /^\s*#{1,6}\s/.test(line))) inWeb = false;
    const isNextLine = line.includes(NEXT_MARK) || /open next/i.test(line);
    let changed = false;

    const rewritten = line.replace(LINK_RE, (whole: string, text: string | undefined, mdUrl: string | undefined, bare: string | undefined) => {
      const isMd = mdUrl !== undefined;
      let url = (isMd ? mdUrl : bare) ?? "";
      let tail = "";
      if (!isMd) {
        const t = TRAILING_PUNCT.exec(url);
        if (t) {
          tail = t[0];
          url = url.slice(0, -tail.length);
        }
      }
      const label = isMd ? (text ?? "") : "";
      const textIsUrl = /^https?:\/\//i.test(label.trim()) || /^\/\S*$/.test(label.trim());
      const unlink = (keepHost?: string) => {
        changed = true;
        if (isMd) return textIsUrl ? (keepHost ?? "") : label;
        return (keepHost ?? "") + tail;
      };

      if (isShishya(url)) {
        const parts = splitShishya(url);
        const hit = parts ? nearestKnownPath(url, index) : null;
        if (!parts || !hit) return unlink();
        const anchor = hit.exact ? parts.anchor : "";
        const page = pageLinkFor(index, hit.canon, anchor, parts.locale, label);
        if (!pageUrls.has(page.url) && pages.length < maxPages) {
          pageUrls.add(page.url);
          pages.push(page);
        }
        if (isNextLine && !next) next = page;
        const abs = `${SITE}${page.url}`;
        if (abs !== url) changed = true;
        if (isMd) return `[${textIsUrl || !label.trim() ? page.label : label}](${abs})`;
        return `${abs}${tail}`;
      }

      if (/^https?:\/\//i.test(url)) {
        let host = "";
        try {
          host = new URL(url).hostname.replace(/^www\./, "");
        } catch {
          return unlink();
        }
        if (!seenNorm.has(normUrl(url))) return unlink(host);
        if (inWeb && !webUrls.has(normUrl(url))) {
          webUrls.add(normUrl(url));
          webSources.push({ title: cleanLabel(isMd && !textIsUrl ? label : "") || host, url });
        }
        return whole;
      }
      // mailto:, javascript:, a bare word — never a link.
      return unlink();
    });

    if (changed && EMPTY_LINE.test(rewritten) && !EMPTY_LINE.test(line)) continue; // a line that was only a dead link
    outLines.push(changed ? rewritten.replace(/(\S)[ \t]{2,}/g, "$1 ").replace(/(\S)[ \t]+([,.;])/g, "$1$2") : rewritten);
  }

  const answer = outLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { answer, pages, next: next ?? pages[0] ?? opts.fallback ?? null, webSources };
}
