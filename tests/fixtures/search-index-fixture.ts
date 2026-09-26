// Builds the search index from the committed 26 Sep 2026 snapshot
// (search-inputs-2026-09-26.json) — the same pure builder the server uses,
// over real exam gates / PYQ years and the real school spine. No DB.

import fs from "node:fs";
import path from "node:path";
import { buildSearchIndex, type SearchIndexInputs } from "@/lib/search/index-core";
import type { SearchIndex } from "@/lib/search/types";

type Fixture = {
  builtAt: string;
  exams: [string, string, string, string, string | null, number | null, 0 | 1][];
  gates: Record<string, string>;
  pyqYears: Record<string, number[]>;
  topicNoteExams: string[];
  topics: [string, string, string][];
  school: [string, number, [string, string, string, [string, string, number, string, 0 | 1, number][]][]][];
};

const kebab = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

let cached: SearchIndexInputs | null = null;

export function fixtureInputs(): SearchIndexInputs {
  if (cached) return cached;
  const f = JSON.parse(fs.readFileSync(path.join(__dirname, "search-inputs-2026-09-26.json"), "utf8")) as Fixture;
  cached = {
    builtAt: f.builtAt,
    exams: f.exams.map(([code, name, shortName, category, state, candidatesPerYear, live]) => ({ code, name, shortName, category, state, candidatesPerYear, live: live === 1 })),
    gates: Object.fromEntries(
      Object.entries(f.gates).map(([code, g]) => [code, { cutoff: g[0] === "1", syllabus: g[1] === "1", tricks: g[2] === "1", guide: g[3] === "1", buildMock: g[4] === "1" }]),
    ),
    pyqYears: f.pyqYears,
    topicNoteExams: f.topicNoteExams,
    topics: f.topics.map(([examCode, code, name]) => ({ examCode, code, name })),
    school: {
      classes: f.school.map(([boardSlug, cls, subjects]) => ({
        boardSlug,
        cls,
        subjects: subjects.map(([code, name, slug, chapters]) => ({
          code,
          name,
          slug,
          chapters: chapters.map(([ccode, cname, orderIdx, cslug, notes, vq]) => ({
            code: ccode,
            name: cname,
            orderIdx,
            slug: cslug || kebab(cname),
            hasNotes: notes === 1,
            validatedQuestions: vq,
            indexable: notes === 1 || vq >= 5,
          })),
        })),
      })),
    },
  };
  return cached;
}

const indexes: Partial<Record<"lite" | "deep", SearchIndex>> = {};
export function fixtureIndex(tier: "lite" | "deep" = "deep"): SearchIndex {
  return (indexes[tier] ??= buildSearchIndex(fixtureInputs(), tier));
}
