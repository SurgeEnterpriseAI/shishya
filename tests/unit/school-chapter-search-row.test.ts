// Site search and an empty school chapter (3 Oct 2026, school growth; review
// finding: search still listed all 916 empty chapters with their own page
// path, so students were still sent to empty pages from search).
//
// The rule (src/lib/school/chapter-row.ts): a chapter with Shishya's notes or
// checked practice opens its own page; a chapter with neither ("book-only";
// noindex, "not ready yet") opens its ROW on the subject page, where its
// official PDF is linked — id "ch-{slug}" on the subject page's chapter list.
// The search wire (src/lib/search/index-codec.ts) carries either form exactly.
// The index builder (src/lib/search/index-core.ts) takes the rule through the
// lead's patch; this file builds both forms from the committed fixture itself,
// so it holds before and after that patch.
// No DB, no network. Run: npx vitest run tests/unit/school-chapter-search-row.test.ts

import zlib from "node:zlib";
import { describe, expect, it } from "vitest";
import { fixtureIndex } from "../fixtures/search-index-fixture";
import { schoolChapterRowId, schoolChapterSearchPath } from "@/lib/school/chapter-row";
import { decodeIndex, encodeIndex } from "@/lib/search/index-codec";
import { resolveQuery } from "@/lib/search/resolve";
import { knownUrl } from "@/lib/search/targets";
import type { SearchDoc, SearchIndex } from "@/lib/search/types";

const subjectOf = (d: SearchDoc) => `/schooling/${d.board}/class-${d.cls}/${d.subjectSlug}`;
const slugOf = (d: SearchDoc) => d.id.split(":").pop() ?? "";

/** Every book-only chapter in one form: its subject page row (true) or its own page (false). */
function bookOnlyAt(idx: SearchIndex, row: boolean): SearchIndex {
  return {
    ...idx,
    docs: idx.docs.map((d) =>
      d.kind === "school-chapter" && d.status === "book-only" ? { ...d, path: schoolChapterSearchPath(subjectOf(d), slugOf(d), !row) } : d,
    ),
  };
}

const canon = (i: SearchIndex) =>
  [...i.docs]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((d) => JSON.stringify(Object.fromEntries(Object.entries({ ...d, terms: [...d.terms].sort() }).sort())));
const roundTrip = (i: SearchIndex) => decodeIndex(JSON.parse(JSON.stringify(encodeIndex(i))));

const deep = fixtureIndex("deep");
const lite = fixtureIndex("lite");

describe("the rule", () => {
  it("a chapter with content: its own page; an empty one: its row on the subject page", () => {
    expect(schoolChapterRowId("life-processes")).toBe("ch-life-processes");
    expect(schoolChapterSearchPath("/schooling/cbse/class-10/science", "life-processes", true)).toBe("/schooling/cbse/class-10/science/life-processes");
    expect(schoolChapterSearchPath("/schooling/cbse/class-10/science", "carbon-and-its-compounds", false)).toBe("/schooling/cbse/class-10/science#ch-carbon-and-its-compounds");
  });

  it("the fixture has both kinds (5 chapters with content, the rest book-only)", () => {
    const chapters = deep.docs.filter((d) => d.kind === "school-chapter");
    expect(chapters.filter((d) => d.status === "ready").length).toBe(5);
    expect(chapters.filter((d) => d.status === "book-only").length).toBe(chapters.length - 5);
    // Ready chapters keep their own page in either form.
    for (const d of chapters.filter((x) => x.status === "ready")) expect(d.path).toBe(`${subjectOf(d)}/${slugOf(d)}`);
  });
});

describe("the search wire carries either form exactly", () => {
  it.each([
    ["row", true],
    ["own page", false],
  ] as const)("book-only chapters at their %s: decode(encode(x)) is x, both tiers", (_name, row) => {
    for (const base of [lite, deep]) {
      const idx = bookOnlyAt(base, row);
      const wire = encodeIndex(idx);
      expect(wire.bs).toBe(row ? 1 : undefined);
      // Every chapter still travels in its subject's compact list, none as a full row.
      expect(wire.d.filter((r) => r[0] === 6).length).toBe(0);
      expect(canon(roundTrip(idx))).toEqual(canon(idx));
    }
  });

  it("the row form costs the strip a few bytes, not a row per chapter", () => {
    const own = JSON.stringify(encodeIndex(bookOnlyAt(lite, false)));
    const row = JSON.stringify(encodeIndex(bookOnlyAt(lite, true)));
    expect(row.length - own.length).toBeLessThanOrEqual(8);
    expect(zlib.gzipSync(row).length - zlib.gzipSync(own).length).toBeLessThanOrEqual(16);
  });

  it("a chapter in the other form travels as a full row, so a mixed index still round-trips", () => {
    const idx = bookOnlyAt(lite, true);
    const odd = idx.docs.findIndex((d) => d.kind === "school-chapter" && d.status === "book-only");
    const mixed: SearchIndex = { ...idx, docs: idx.docs.map((d, i) => (i === odd ? { ...d, path: `${subjectOf(d)}/${slugOf(d)}` } : d)) };
    const wire = encodeIndex(mixed);
    expect(wire.bs).toBe(1);
    expect(wire.d.filter((r) => r[0] === 6).length).toBe(1);
    expect(canon(roundTrip(mixed))).toEqual(canon(mixed));
  });
});

describe("search with book-only chapters at their rows", () => {
  const server = bookOnlyAt(deep, true);
  const client = roundTrip(bookOnlyAt(lite, true));

  it("an empty chapter opens its row on the subject page, with its status — on the server and on the client", () => {
    for (const idx of [server, client]) {
      const r = resolveQuery("class 9 science chapter 3", idx);
      expect(r.outcome).toBe("direct");
      expect(r.best?.url).toBe("/schooling/cbse/class-9/science#ch-tissues-in-action");
      expect(r.best?.status).toBe("book-only");
      expect(r.best?.kind).toBe("school-chapter");
    }
  });

  it("a chapter with content still opens its own page", () => {
    const ready = server.docs.find((d) => d.kind === "school-chapter" && d.status === "ready" && slugOf(d) === "prime-time")!;
    expect(ready.path).toBe("/schooling/cbse/class-6/mathematics/prime-time");
    for (const idx of [server, client]) expect(resolveQuery("prime time class 6", idx).hits.map((h) => h.url)).toContain(ready.path);
  });

  it("no hit, anywhere in the index, is an empty chapter's own page", () => {
    const own = new Set(server.docs.filter((d) => d.kind === "school-chapter" && d.status === "book-only").map((d) => `${subjectOf(d)}/${slugOf(d)}`));
    for (const q of ["class 10 science", "class 9 science chapter 3", "class 10 english chapter 1", "photosynthesis class 11", "class 7 science light"]) {
      for (const h of resolveQuery(q, server).hits) expect(own.has(h.url.split("#")[0]), `${q}: ${h.url}`).toBe(false);
    }
    // A pasted link to an empty chapter page is not a page search vouches for; its row is.
    expect(knownUrl("/schooling/cbse/class-9/science/tissues-in-action", server)).toBeNull();
    expect(knownUrl("/schooling/cbse/class-9/science#ch-tissues-in-action", server)).toBe("/schooling/cbse/class-9/science");
  });
});
