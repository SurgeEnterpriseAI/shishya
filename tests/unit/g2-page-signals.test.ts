// Discoverability G2 page signals (26 Sep 2026): the small page-level fixes
// that ride with the URL work, pinned at source level (no DB, no render).
//
//   1. /hi and /te exam-calendar links point at a twin only when its verdict
//      says localised (else the English page) — no link to an English-bodied
//      twin that canonicalises elsewhere;
//   2. the header's primary-row links are 24 px+ tap targets (py-1), with the
//      row's one-line contract unchanged;
//   3. every attributed motivational quote names a documented source;
//   4. markdown alternates: the schooling class / subject context.md files
//      send the HTML page as rel="canonical", and the home page advertises
//      /context.md like the section and exam pages.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { QUOTES } from "@/data/motivational-quotes";

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8").replace(/\r\n/g, "\n");

describe("exam calendar: twin links only where the twin is localised", () => {
  const src = read("src/app/exam-calendar/page.tsx");

  it("no exam hub / updates link goes through the blanket locale prefixer", () => {
    expect(src).not.toMatch(/href=\{p\(`\/exams\//);
    expect(src).toMatch(/href=\{ep\(r\.examCode, "updates"\)\}/);
    expect(src).toMatch(/href=\{ep\(r\.examCode, "hub"\)\}/);
    expect(src).toMatch(/href=\{ep\(n\.exam\.code, "updates"\)\}/);
  });

  it("ep() links the twin only on a true verdict for that surface and locale, and English otherwise (a failed read included)", () => {
    expect(src).toMatch(/linkTwins\?\.\[code\]\?\.\[surface\]\?\.\[urlLocale\] === true \? localizedPath\(rel, urlLocale\) : rel/);
    expect(src).toMatch(/\.catch\(\(\) => null\)/);
    expect(src).toMatch(/urlLocale === "en"\s*\? null/);
  });
});

describe("header: 24 px tap targets on the primary row", () => {
  const src = read("src/components/Header.tsx");
  it("section and utility links carry py-1; the Ask chip too; the row stays one 36 px line", () => {
    expect(src).toMatch(/const SECTION_LINK = "py-1 /);
    expect(src).toMatch(/const UTILITY_LINK = "py-1 /);
    expect(src).toMatch(/rounded-md bg-white px-2\.5 py-1 text-saffron-700/);
    expect(src).toMatch(/flex h-9 items-center/);
  });
});

describe("motivational quotes: no attribution by popular repute", () => {
  // Names whose words the list quotes from a documented source (see the file's header).
  const DOCUMENTED = new Set(["Swami Vivekananda", "Hitopadesha", "Bhagavad Gita 2.47", "अनाम", "Steve Jobs", "Robert H. Schuller", "Japanese proverb"]);

  it("every author is a documented source", () => {
    for (const q of QUOTES) if (q.author) expect(DOCUMENTED.has(q.author), `${q.author}: ${q.text}`).toBe(true);
  });

  it("the known misattributions are gone, and 2.47 is the verse itself", () => {
    const all = QUOTES.map((q) => `${q.text} ${q.author ?? ""}`).join("\n");
    expect(all).not.toMatch(/Churchill|Mandela|always seems impossible|Success is not final|Whatever happened, happened/);
    expect(all).not.toMatch(/Failure will never overtake me/);
    const gita = QUOTES.find((q) => q.author === "Bhagavad Gita 2.47");
    expect(gita?.text).toMatch(/कर्मण्येवाधिकारस्ते/);
  });

  it("no invented number in an aspirant line", () => {
    for (const q of QUOTES) if (!q.author) expect(q.text, q.text).not.toMatch(/\d+ marks/);
    expect(QUOTES.length).toBeGreaterThanOrEqual(15);
  });
});

describe("markdown alternates", () => {
  it("the schooling class and subject context.md send their HTML page as rel=canonical", () => {
    const cls = read("src/app/schooling/[slug]/[classSlug]/context.md/route.ts");
    expect(cls).toMatch(/link: `<https:\/\/shishya\.in\$\{schoolClassPath\(slug, c\.cls\)\}>; rel="canonical"`/);
    const sub = read("src/app/schooling/[slug]/[classSlug]/[subject]/context.md/route.ts");
    expect(sub).toMatch(/link: `<https:\/\/shishya\.in\$\{schoolSubjectPath\(slug, c\.cls, s\.slug\)\}>; rel="canonical"`/);
    // Same header name and form as the exam file.
    expect(read("src/app/exams/[code]/context.md/route.ts")).toMatch(/link: `<\$\{SITE\}\/exams\/\$\{exam\.code\}>; rel="canonical"`/);
  });

  it("the home page advertises /context.md as its markdown alternate", () => {
    const home = read("src/app/page.tsx");
    expect(home).toMatch(/alternates: \{ canonical: "https:\/\/shishya\.in\/", types: \{ "text\/markdown": "https:\/\/shishya\.in\/context\.md" \} \}/);
    expect(fs.existsSync(path.join(process.cwd(), "src/app/context.md/route.ts"))).toBe(true);
  });
});
