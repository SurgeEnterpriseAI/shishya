// /alumni-stories head copy (26 Sep 2026): the title, meta description and
// CollectionPage JSON-LD said "real career journeys from real Indian
// students" while the code and the page's own disclaimer say the stories are
// composites. Snippets and LLM answers quote the head, not the disclaimer, so
// the head now says "composite" plainly. This pins:
//   1. the copy in src/lib/alumni-stories-copy.ts (exact title, the plain
//      "composite, anonymised examples built from several students' paths"
//      wording, no "real"/"honest" claim, no forbidden phrase);
//   2. that src/app/alumni-stories/page.tsx renders its <title>, description,
//      openGraph/twitter, JSON-LD, H1, subline and breadcrumb from that copy
//      and no longer carries the old wording anywhere outside comments;
//   3. that the disclaimer box is kept and counts the stories from STORIES
//      instead of a typed number;
//   4. that every in-site link to /alumni-stories#<slug> still lands on a
//      story, and the page is still in the sitemap.

import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ALUMNI_STORIES_COPY as COPY } from "@/lib/alumni-stories-copy";
import { FORBIDDEN_PHRASES, findForbiddenPhrases } from "@/lib/truth-lint";

const ROOT = path.resolve(__dirname, "..", "..");
const PAGE = path.join(ROOT, "src", "app", "alumni-stories", "page.tsx");
const read = (p: string) => fs.readFileSync(p, "utf8");

/** Blank out comments (keeps line numbers) so only rendered text is checked. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/.*$/gm, (_m, lead: string) => lead);
}

const COPY_TEXT = [COPY.title, COPY.heading, COPY.description, COPY.subline, COPY.breadcrumb, ...COPY.keywords];

// The phrases this fix retires; they are being added to FORBIDDEN_PHRASES by
// the truth-lint owner, and are checked here directly so this file does not
// depend on that landing first.
const RETIRED = ["real career journeys", "real indian students", "real student stories", "honest career journey", "alumni stories —"];

describe("alumni-stories copy — composites, said plainly", () => {
  it("title is the agreed wording and the heading is the title without the brand", () => {
    expect(COPY.title).toBe("Career journey examples — composite stories from Indian students | Shishya");
    expect(COPY.heading).toBe("Career journey examples — composite stories from Indian students");
    expect(COPY.title).toBe(`${COPY.heading} | Shishya`);
  });

  it("description and subline say 'composite, anonymised examples built from several students' paths'", () => {
    const needle = "composite, anonymised examples built from several students' paths";
    expect(COPY.description.toLowerCase()).toContain(needle);
    expect(COPY.subline.toLowerCase()).toContain(needle);
  });

  it("no 'real', 'honest', 'alumni' or 'success' claim in any head string or keyword", () => {
    for (const s of COPY_TEXT) {
      expect(s, s).not.toMatch(/\breal\b/i);
      expect(s, s).not.toMatch(/\bhonest/i);
      expect(s, s).not.toMatch(/\balumni\b/i);
      expect(s, s).not.toMatch(/\bsuccess\b/i);
    }
    expect(COPY.keywords as readonly string[]).not.toContain("real student stories india");
  });

  it("no forbidden phrase (current list plus the retired 'real …' phrases) and no typed count", () => {
    const text = COPY_TEXT.join("\n");
    expect(findForbiddenPhrases(text, "alumni-stories-copy")).toEqual([]);
    expect(findForbiddenPhrases(text, "alumni-stories-copy", { phrases: [...FORBIDDEN_PHRASES, ...RETIRED] })).toEqual([]);
    // Counts are STORIES.length in the page, never typed in the copy.
    expect(COPY.description).not.toMatch(/\b\d+\s+(?:stories|examples|journeys)\b/i);
    expect(COPY.subline).not.toMatch(/\b\d+\s+(?:stories|examples|journeys)\b/i);
  });

  it("meta description stays snippet-sized", () => {
    expect(COPY.description.length).toBeGreaterThan(80);
    expect(COPY.description.length).toBeLessThanOrEqual(230);
  });
});

describe("alumni-stories page — renders the head from the copy", () => {
  const src = read(PAGE);
  const code = stripComments(src);

  it("imports the shared copy", () => {
    expect(src).toMatch(/import \{ ALUMNI_STORIES_COPY as COPY \} from "@\/lib\/alumni-stories-copy";/);
  });

  it("metadata title/description, openGraph and twitter all use the copy", () => {
    const meta = code.slice(code.indexOf("export const metadata"), code.indexOf("export const revalidate"));
    expect(meta).toContain("title: COPY.title,");
    expect(meta).toContain("description: COPY.description,");
    expect(meta).toContain("keywords: [...COPY.keywords],");
    expect(meta).toMatch(/openGraph: \{\s*title: COPY\.title,\s*description: COPY\.description,\s*url: PAGE_URL,/);
    expect(meta).toMatch(/twitter: \{[\s\S]*title: COPY\.title,\s*description: COPY\.description,/);
    expect(code).toContain('const PAGE_URL = "https://shishya.in/alumni-stories";');
    expect(meta).toContain("alternates: { canonical: PAGE_URL },");
  });

  it("CollectionPage JSON-LD, breadcrumb, H1 and subline use the copy", () => {
    expect(code).toMatch(/collectionPageLd\(\{\s*name: COPY\.heading,\s*description: COPY\.description,\s*path: "\/alumni-stories",/);
    expect(code).toContain('breadcrumbLd([[COPY.breadcrumb, "/alumni-stories"]])');
    expect(code).toMatch(/<h1[^>]*>\s*\{COPY\.heading\}\s*<\/h1>/);
    expect(code).toMatch(/<p className="mt-2 max-w-3xl text-base text-ink-700">\s*\{COPY\.subline\}\s*<\/p>/);
    expect(code).toContain("· {COPY.breadcrumb}");
  });

  it("the old 'real … from real Indian students' wording is gone from everything that renders", () => {
    for (const old of [
      "Alumni Stories — Real career journeys",
      "Honest career journey stories",
      "real timelines + real setbacks",
      "Real career journeys — honest, not curated",
      "Real Indian students' career paths",
      "real student stories india",
    ]) {
      expect(code.toLowerCase(), old).not.toContain(old.toLowerCase());
    }
    expect(findForbiddenPhrases(code, "src/app/alumni-stories/page.tsx", { phrases: [...FORBIDDEN_PHRASES, ...RETIRED] })).toEqual([]);
  });

  it("keeps the disclaimer box and counts the stories from STORIES, not a typed number", () => {
    expect(code).toContain("A note on these stories");
    expect(code).toContain("These {STORIES.length} launch stories are composites");
    expect(code).not.toMatch(/These \d+ launch stories/);
  });

  it("every in-site link to /alumni-stories#<slug> lands on a story", () => {
    const slugs = new Set([...src.matchAll(/^\s*slug: "([a-z0-9-]+)",$/gm)].map((m) => m[1]));
    expect(slugs.size).toBeGreaterThan(0);
    const anchors: string[] = [];
    const walk = (dir: string) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|tsx|md|txt)$/.test(e.name)) {
          for (const m of read(p).matchAll(/\/alumni-stories#([a-z0-9-]+)/g)) anchors.push(m[1]);
        }
      }
    };
    walk(path.join(ROOT, "src"));
    expect(anchors.length).toBeGreaterThan(0);
    for (const a of anchors) expect(slugs.has(a), a).toBe(true);
  });

  it("the page is still listed in the sitemap", () => {
    expect(read(path.join(ROOT, "src", "app", "sitemap.ts"))).toContain('"/alumni-stories"');
  });
});
