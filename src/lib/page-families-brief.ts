// The wave 2 page families in the machine briefs (27 Sep 2026, wave 2
// search): /llms-full.txt and /context.md list the pages organic wave 2 built
// (a685688) — the free mock-test catalogue, the exam category hubs, "exams
// after {level}", CBSE's board-exam hubs, the subject hubs and the scholarship
// lists.
//
// The list is computed, never typed: the sitemap's own providers
// (src/lib/sitemap-sections.ts EXTRA_SITEMAP_PROVIDERS, each already limited
// to the pages whose own robots let Google index them — the scholarship lists
// are noindex until every row is reviewed, so none is named today), and each
// label comes from the family's own data (the category heading, the level's
// title, the hub's class and year, the subject's name, the list's audience).
// A URL no family knows is dropped. familyLinks and familyBriefLines are pure
// (tests/unit/page-families-brief.test.ts); loadFamilyLinks never throws.

import { extraSitemapEntries } from "@/lib/sitemap-sections";
import { findExamCategory } from "@/lib/exam-categories";
import { findQualificationLevel } from "@/lib/exam-qualification";
import { findBoardExamHub } from "@/data/board-exams";
import { subjectHubDef } from "@/lib/subject-hubs";
import { findScholarshipFilter } from "@/lib/scholarship-lists";
import { MOCK_TESTS_PATH } from "@/lib/mock-catalogue";

export type FamilyKey = "mock-tests" | "category" | "after" | "board-exam" | "subject" | "scholarship-list";

export interface FamilyLink {
  family: FamilyKey;
  url: string;
  label: string;
}

export const FAMILY_ORDER: readonly FamilyKey[] = ["mock-tests", "category", "after", "board-exam", "subject", "scholarship-list"];

/** What each family's pages hold — said for every page of the family. */
const FAMILY_LINE: Readonly<Record<FamilyKey, string>> = {
  "mock-tests": "Free mock tests — the free mocks of every exam that has them, on one page, by category and state",
  category: "Exam categories compared in one table — conducting body, next exam day with its source tier, age limit, qualification and official site",
  after: "Exams after a qualification — government and entrance exams grouped by the lowest qualification each lists",
  "board-exam":
    "CBSE board exams — links to CBSE's own pages: sample papers and marking schemes where CBSE has published them, previous papers, results, and whether the date sheet is out (no copies)",
  subject: "Subjects across exams — each subject's topics mapped to the exams that test them, linked to each exam's topic page",
  "scholarship-list": "Scholarship lists — amounts and apply links for one group of students, or the official last dates coming up",
};

/** The labelled link for one page URL, or null when no family knows it. */
function linkFor(url: string, base: string): FamilyLink | null {
  if (!url.startsWith(`${base}/`)) return null;
  const p = url.slice(base.length);
  let m: RegExpExecArray | null;
  if (p === MOCK_TESTS_PATH) return { family: "mock-tests", url, label: "Free mock tests" };
  if ((m = /^\/exams\/category\/([a-z-]+)$/.exec(p))) {
    const c = findExamCategory(m[1]);
    return c ? { family: "category", url, label: c.heading } : null;
  }
  if ((m = /^\/exams\/after\/([a-z0-9-]+)$/.exec(p))) {
    const l = findQualificationLevel(m[1]);
    return l && !l.held ? { family: "after", url, label: `Exams after ${l.afterTitle}` } : null;
  }
  if ((m = /^\/schooling\/([a-z-]+)\/class-(\d{1,2})\/board-exam$/.exec(p))) {
    const h = findBoardExamHub(m[1], Number(m[2]));
    return h ? { family: "board-exam", url, label: `${h.board.toUpperCase()} Class ${h.cls} board exam ${h.examYear}` } : null;
  }
  if ((m = /^\/subjects\/([a-z-]+)$/.exec(p))) {
    const d = subjectHubDef(m[1]);
    return d ? { family: "subject", url, label: d.name } : null;
  }
  if ((m = /^\/scholarships\/for\/([a-z0-9-]+)$/.exec(p))) {
    const f = findScholarshipFilter(m[1]);
    return f ? { family: "scholarship-list", url, label: `Scholarships for ${f.audienceTitle}` } : null;
  }
  if (p === "/scholarships/closing-soon") return { family: "scholarship-list", url, label: "Scholarships closing soon" };
  return null;
}

/** Pure: sitemap entries → the families' labelled links, family order, each URL once. */
export function familyLinks(entries: readonly { url: string }[], base: string): FamilyLink[] {
  const seen = new Set<string>();
  const out: FamilyLink[] = [];
  for (const e of entries) {
    const l = linkFor(e.url, base);
    if (!l || seen.has(l.url)) continue;
    seen.add(l.url);
    out.push(l);
  }
  return FAMILY_ORDER.flatMap((f) => out.filter((l) => l.family === f));
}

/** Pure: one markdown line per family that has a page; nothing when none has. */
export function familyBriefLines(links: readonly FamilyLink[], heading = "## Lists across exams, subjects and boards"): string[] {
  if (links.length === 0) return [];
  const lines = [heading, "> Each page below is listed while its own robots let search engines index it (the sitemap's rule).", ""];
  for (const f of FAMILY_ORDER) {
    const xs = links.filter((l) => l.family === f);
    if (xs.length === 0) continue;
    lines.push(`- ${FAMILY_LINE[f]}: ${xs.map((l) => `[${l.label}](${l.url})`).join(" · ")}`);
  }
  lines.push("");
  return lines;
}

/** Server: the families' pages from the sitemap's own providers. Never throws. */
export async function loadFamilyLinks(base: string): Promise<FamilyLink[]> {
  try {
    return familyLinks(await extraSitemapEntries(base), base);
  } catch {
    return [];
  }
}
