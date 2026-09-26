// public/llms.txt names the wave's new page families (27 Sep 2026,
// integration). A static file can go stale, so every link it names is pinned
// here to the family's own definitions: a category slug EXAM_CATEGORIES
// defines, a published qualification level, a CBSE board-exam hub the data
// file holds, a defined subject hub, and a route file that serves it. The
// lists are editorial (the families with a margin over their data floor on
// 27 Sep 2026 — law-entrance, exactly at its floor of 5, is left out, as in
// src/lib/ai/site-facts.ts); a slug that stops being defined fails here.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { EXAM_CATEGORIES } from "@/lib/exam-categories";
import { PUBLISHED_LEVELS } from "@/lib/exam-qualification";
import { findBoardExamHub } from "@/data/board-exams";
import { SUBJECT_HUBS } from "@/lib/subject-hubs";
import { MOCK_TESTS_PATH } from "@/lib/mock-catalogue";

const ROOT = process.cwd();
const txt = fs.readFileSync(path.join(ROOT, "public/llms.txt"), "utf8");
const links = (re: RegExp) => [...txt.matchAll(re)].map((m) => m[1]);
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));

describe("public/llms.txt — the new families", () => {
  it("category hubs: defined slugs only, never law-entrance or an under-floor one", () => {
    const slugs = links(/\(https:\/\/shishya\.in\/exams\/category\/([a-z-]+)\)/g);
    expect(slugs.sort()).toEqual(["banking", "engineering-entrance", "police", "state-psc", "teaching"]);
    for (const s of slugs) expect(EXAM_CATEGORIES.some((c) => c.slug === s), s).toBe(true);
    expect(exists("src/app/exams/category/[slug]/page.tsx")).toBe(true);
  });

  it("qualification pages: published levels only (postgraduation is held, diploma-iti is below its floor)", () => {
    const slugs = links(/\(https:\/\/shishya\.in\/exams\/after\/([a-z0-9-]+)\)/g);
    expect(slugs).toEqual(["10th", "12th", "graduation"]);
    for (const s of slugs) expect(PUBLISHED_LEVELS.some((l) => l.slug === s), s).toBe(true);
    expect(exists("src/app/exams/after/[level]/page.tsx")).toBe(true);
  });

  it("CBSE board-exam hubs: Class 10 and 12, both held by the data file", () => {
    const classes = links(/\(https:\/\/shishya\.in\/schooling\/cbse\/class-(\d+)\/board-exam\)/g).map(Number);
    expect(classes).toEqual([10, 12]);
    for (const c of classes) expect(findBoardExamHub("cbse", c), String(c)).toBeDefined();
    expect(exists("src/app/schooling/[slug]/[classSlug]/board-exam/page.tsx")).toBe(true);
  });

  it("subject hubs: defined slugs only", () => {
    const slugs = links(/\(https:\/\/shishya\.in\/subjects\/([a-z-]+)\)/g);
    expect(slugs).toEqual(["reasoning", "quantitative-aptitude", "english", "general-awareness", "child-development-pedagogy"]);
    for (const s of slugs) expect(SUBJECT_HUBS.some((h) => h.slug === s), s).toBe(true);
    expect(exists("src/app/subjects/[slug]/page.tsx")).toBe(true);
  });

  it("the mock-test catalogue", () => {
    expect(txt).toContain(`(https://shishya.in${MOCK_TESTS_PATH})`);
    expect(exists("src/app/mock-tests/page.tsx")).toBe(true);
  });
});
