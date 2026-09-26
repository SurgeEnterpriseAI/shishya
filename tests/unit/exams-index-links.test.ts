// No link or breadcrumb points at the bare /exams (26 Sep 2026).
//
// https://shishya.in/exams 308-redirects to the home page, yet about 10,600
// sitemapped pages (news permalinks, topic notes, checklists, live /
// reactions articles) sent their BreadcrumbList "Exams" item there, and the
// browse page and the calendar rail linked it. The exam index is
// /exams/browse ("All exams"), as on the hub.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

const FILES = [
  "src/app/exams/[code]/checklist/page.tsx",
  "src/app/exams/[code]/news/[id]/page.tsx",
  "src/app/exams/[code]/topics/[topicCode]/page.tsx",
  "src/components/exam-phase/PhaseArticleView.tsx",
  "src/components/UpcomingExamsSidebar.tsx",
  "src/app/exams/browse/page.tsx",
  "src/app/exams/entrance/page.tsx",
  "src/app/exams/[code]/page.tsx",
  "src/app/exams/state/page.tsx",
  "src/app/exams/state/[slug]/page.tsx",
];

/** Source without comments, so a comment that names /exams is not a link. */
const code = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("the bare /exams (a redirect to /) is never a link or a breadcrumb item", () => {
  for (const rel of FILES) {
    it(rel, () => {
      const src = code(fs.readFileSync(path.join(process.cwd(), rel), "utf8"));
      expect(src).not.toMatch(/["'`]https:\/\/shishya\.in\/exams["'`]/);
      expect(src).not.toMatch(/href=["'{`]*\/exams["'`}]/);
      expect(src).not.toMatch(/item:\s*["'`]https:\/\/shishya\.in\/exams["'`]/);
    });
  }

  it("the four JSON-LD breadcrumbs name the exam index 'All exams' at /exams/browse", () => {
    for (const rel of FILES.slice(0, 4)) {
      const src = fs.readFileSync(path.join(process.cwd(), rel), "utf8");
      expect(src, rel).toContain('name: "All exams", item: "https://shishya.in/exams/browse"');
    }
  });
});
