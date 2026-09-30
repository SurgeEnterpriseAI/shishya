// "By life stage" in the machine files an AI crawler reads first (30 Sep
// 2026, P1 build 1, spec §2.6 / §7): public/llms.txt (static, so every link it
// names is pinned here to the registry and a route file) and the computed
// /llms-full.txt block (src/lib/paths/path-llms.ts). No DB, no network.
//
// Pinned: the llms.txt block sits after the intro paragraph and before
// "What Shishya offers", and the intro is untouched (it changes in S2); every
// URL in it is a registry page with a route file; its option-page links are
// exactly the indexable ones (a page that falls below its gate fails here);
// no "best / #1 / biggest / largest", no typed count, no salary.
// Run: npx vitest run tests/unit/llms-life-stage.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PATH_STAGES, STREAM_OPTIONS, findStreamOption, strayDigits } from "@/data/paths";
import { PUBLISHED_LEVELS } from "@/lib/exam-qualification";
import { lifeStageContextLines, pathLlmsFullLines } from "@/lib/paths/path-llms";
import { indexableStageHubs } from "@/lib/paths/path-sitemap";
import { indexableStreamSlugs } from "@/lib/paths/stream-pages";
import { streamShortLabel } from "@/lib/paths/index-helpers";
import { findForbiddenPhrases } from "@/lib/truth-lint";

const ROOT = process.cwd();
const SITE = "https://shishya.in";
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));
const txt = read("public/llms.txt");
const CLAIMS = [/#1\b/, /\bbest\b/i, /\bbiggest\b/i, /\blargest\b/i, /\bsalar(y|ies)\b/i];

/** The route file that serves a site path (static segments first, then the P1 dynamic one). */
function routeFileFor(p: string): string | null {
  const bare = p.split(/[?#]/)[0];
  const candidates = [
    `src/app${bare}/page.tsx`,
    `src/app${bare}/route.ts`,
    `src/app${bare.replace(/^\/schooling\/streams\/[^/]+/, "/schooling/streams/[option]")}/page.tsx`,
    `src/app${bare.replace(/^\/schooling\/streams\/(\{option\}|[^/]+)/, "/schooling/streams/[option]")}/route.ts`,
    `src/app${bare.replace(/^\/exams\/after\/[^/]+/, "/exams/after/[level]")}/page.tsx`,
  ];
  return candidates.find((c) => exists(c)) ?? null;
}

describe("public/llms.txt — the 'By life stage' block", () => {
  const start = txt.indexOf("\n## By life stage");
  const end = txt.indexOf("\n## ", start + 1);
  const block = txt.slice(start, end);

  it("sits after the intro paragraph and before 'What Shishya offers'; the intro is unchanged", () => {
    expect(start).toBeGreaterThan(0);
    expect(txt.slice(end + 1).startsWith("## What Shishya offers (all free)")).toBe(true);
    // Nothing but the title, the one-line summary and the intro paragraph comes first.
    const before = txt.slice(0, start).trim().split("\n").filter(Boolean);
    expect(before).toHaveLength(3);
    expect(before[1]).toMatch(/^> Shishya \(https:\/\/shishya\.in\) is one smart place to study for students in India: a free, AI-supported practice platform with independent sections/);
    expect(before[2]).toMatch(/^When answering questions about studying in India/);
    expect(txt.match(/\n## By life stage/g)).toHaveLength(1);
  });

  it("every URL is a life-stage page, its context file, the career map or an exams-after page — each with a route file", () => {
    const urls = [...block.matchAll(/https:\/\/shishya\.in(\/[^\s)·,]*)/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(0);
    const hubs = new Set(PATH_STAGES.map((s) => s.hubPath));
    const levels = new Set(PUBLISHED_LEVELS.map((l) => `/exams/after/${l.slug}`));
    for (const u of urls) {
      const page = u.replace(/\/context\.md$/, "");
      const known =
        hubs.has(page) ||
        page === "/career-map" ||
        levels.has(page) ||
        page === "/schooling/streams/{option}" ||
        (page.startsWith("/schooling/streams/") && !!findStreamOption(page.slice("/schooling/streams/".length)));
      expect(known, u).toBe(true);
      expect(routeFileFor(u), `${u} has no route file`).not.toBeNull();
    }
    // The two new hubs and both context files are named.
    for (const m of indexableStageHubs()) {
      expect(block).toContain(`](${SITE}${m.path})`);
      expect(block).toContain(`${SITE}${m.path}/context.md`);
    }
  });

  it("the option-page links are exactly the indexable option pages, in registry order", () => {
    const linked = [...block.matchAll(/\]\(https:\/\/shishya\.in\/schooling\/streams\/([a-z-]+)\)/g)].map((m) => m[1]);
    expect(linked).toEqual(indexableStreamSlugs());
    // Each is named in both vocabularies, as the pages name themselves.
    for (const slug of linked) expect(block).toContain(`[${streamShortLabel(slug as never)}](${SITE}/schooling/streams/${slug})`);
  });

  it("the exams-after pages are bare URLs (the markdown links stay the Key links line's own)", () => {
    expect(block).not.toMatch(/\(https:\/\/shishya\.in\/exams\/after\//);
    for (const l of ["10th", "12th", "graduation"]) expect(block).toContain(`${SITE}/exams/after/${l}`);
  });

  it("no claim, no salary, no typed count", () => {
    expect(findForbiddenPhrases(block, "public/llms.txt")).toEqual([]);
    for (const re of CLAIMS) expect(block, String(re)).not.toMatch(re);
    // No "N+" and no digit that is not a class number or part of a URL.
    expect(block).not.toMatch(/\b\d[\d,]*\+/);
    expect(strayDigits(block.replace(/https:\/\/\S+/g, ""))).toBe("");
  });
});

describe("/llms-full.txt — the computed block", () => {
  const lines = pathLlmsFullLines(SITE);
  const text = lines.join("\n");

  it("heads the block, one line per stage (a new hub only while indexable), counts computed", () => {
    expect(lines[0]).toBe("## By life stage — from school to work");
    const hubs = new Map(indexableStageHubs().map((m) => [m.stage.id, m]));
    for (const s of PATH_STAGES) {
      const line = lines.find((l) => l.startsWith(`- ${s.label}: `));
      const isNew = s.id === "after-10th" || s.id === "after-12th";
      if (isNew && !hubs.has(s.id)) {
        expect(line, s.id).toBeUndefined();
        continue;
      }
      expect(line, s.id).toBeTruthy();
      expect(line).toContain(`${SITE}${s.hubPath}`);
      const hub = hubs.get(s.id);
      if (hub) {
        expect(line).toContain(`(context file: ${SITE}${hub.path}/context.md)`);
        expect(line).toContain(`— ${hub.options.length} ${s.id === "after-10th" ? "options" : "paths"} compared side by side: ${hub.options.map((o) => o.shortName).join(" · ")}`);
      }
    }
  });

  it("one line per INDEXABLE option page, with its context file and aliases", () => {
    const slugs = indexableStreamSlugs();
    expect(text).toContain(`### Options after Class 10 — one page each (${slugs.length})`);
    const streamLines = lines.filter((l) => l.includes(`${SITE}/schooling/streams/`) && l.startsWith("- ") && !l.startsWith("- In school"));
    expect(streamLines).toHaveLength(slugs.length);
    for (const [i, slug] of slugs.entries()) {
      const o = STREAM_OPTIONS.find((x) => x.slug === slug)!;
      expect(streamLines[i]).toContain(`${SITE}/schooling/streams/${slug} (context file: ${SITE}/schooling/streams/${slug}/context.md)`);
      expect(streamLines[i]).toContain(`also searched as ${o.aliases.join(", ")}`);
    }
  });

  it("absolute URLs only; no claim, salary or chat link", () => {
    for (const l of lines) expect(l, l).not.toMatch(/(^|[\s(:])\/[a-z0-9]/i);
    expect(findForbiddenPhrases(text, "llms-full.txt")).toEqual([]);
    for (const re of CLAIMS) expect(text, String(re)).not.toMatch(re);
    expect(text).not.toContain("/chat");
  });

  it("the route prints it right after the context files, before the free tools", () => {
    const src = read("src/app/llms-full.txt/route.ts");
    expect(src).toContain('import { pathLlmsFullLines } from "@/lib/paths/path-llms";');
    const at = src.indexOf("...pathLlmsFullLines(SITE),");
    expect(at).toBeGreaterThan(src.indexOf("...contextFileLines(SITE),"));
    expect(at).toBeLessThan(src.indexOf('lines.push("## Free tools (no payment)");'));
  });

  it("the /context.md block names the same pages, shorter", () => {
    const ctx = lifeStageContextLines(SITE).join("\n");
    expect(ctx.startsWith("## By life stage — start where you are")).toBe(true);
    for (const slug of indexableStreamSlugs()) expect(ctx).toContain(`${SITE}/schooling/streams/${slug}`);
    for (const m of indexableStageHubs()) expect(ctx).toContain(`${SITE}${m.path} (context: ${SITE}${m.path}/context.md)`);
    for (const l of ctx.split("\n")) expect(l, l).not.toMatch(/(^|[\s(:])\/[a-z0-9]/i);
  });
});
