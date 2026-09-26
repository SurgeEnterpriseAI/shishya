// Shishya's one shared self-description (src/lib/site-description.ts) and
// the surfaces that print it (26 Sep 2026). No DB, no network.
//
// Pins the founder's honesty rules for every place the site describes
// itself: no typed counts, no "#1 / best / trusted / expert / verified by /
// admin" claims, never "all" exams of a kind, the computed form prints only
// the numbers it is given — and the root layout, manifest, OG card, footer,
// /about, /pricing and README actually use the shared wording.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { locales } from "@/lib/i18n";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import {
  SECTION_LINKS,
  SITE_CLAUSE,
  SITE_LANGUAGE_CODES,
  SITE_NAME,
  SITE_ORG_ID,
  SITE_SHORT,
  SITE_TITLE_DEFAULT,
  SITE_URL,
  flooredPlus,
  siteDescription,
  siteDescriptionStatic,
  type SiteDescriptionCounts,
} from "@/lib/site-description";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Phrases no self-description may carry (case-insensitive substrings). */
const BANNED = ["170+", "175+", "#1", "best", "trusted", "expert", "verified by", "admin", "all TETs", "every Indian", "end-to-end"];

function bannedIn(text: string): string[] {
  const lower = text.toLowerCase();
  const hits = BANNED.filter((b) => lower.includes(b.toLowerCase()));
  // "all" as a word — never "all exams", "all state PSCs".
  if (/\ball\b/i.test(text)) hits.push("all");
  return hits;
}

/** Every run of digits in `text`. */
const numbersIn = (text: string) => [...text.matchAll(/\d[\d,]*/g)].map((m) => m[0]);

const COUNTS: SiteDescriptionCounts = {
  exams: 180,
  checkedQuestions: 34_543,
  chapters: 1_146,
  chaptersWithNotes: 5,
  colleges: 77,
  scholarships: 208,
  careers: 94,
  indianLanguages: 18,
  collegeRankYear: 2024,
};

describe("the short form", () => {
  it("is at most 160 characters (a meta description that is not cut)", () => {
    expect(SITE_SHORT.length).toBeLessThanOrEqual(160);
    expect(SITE_TITLE_DEFAULT.length).toBeLessThanOrEqual(90);
  });

  it("names every section and no count", () => {
    for (const w of ["school", "CBSE", "CISCE", "entrance", "government exams", "colleges", "scholarships", "careers"]) {
      expect(SITE_SHORT).toContain(w);
    }
    expect(numbersIn(SITE_SHORT)).toEqual([]);
    expect(numbersIn(SITE_TITLE_DEFAULT)).toEqual([]);
    expect(numbersIn(SITE_CLAUSE)).toEqual([]);
  });
});

describe("the static form", () => {
  const s = siteDescriptionStatic();

  it("has no digits except 'Classes 1-12' and the derived language count", () => {
    const rest = s.replace("Classes 1-12", "").replace(`English and ${INDIAN_LANGUAGE_COUNT} Indian languages`, "");
    expect(numbersIn(rest)).toEqual([]);
    expect(s).toContain(`English and ${INDIAN_LANGUAGE_COUNT} Indian languages`);
    // The count is derived from the locales list, not typed.
    expect(INDIAN_LANGUAGE_COUNT).toBe(locales.length - 1);
  });

  it("follows the injected language count", () => {
    expect(siteDescriptionStatic(7)).toContain("English and 7 Indian languages");
  });

  it("names every section and the honesty facts", () => {
    for (const w of ["school (CBSE/NCERT and CISCE, Classes 1-12)", "entrance exams (JEE, NEET, CUET, NDA, olympiads)", "government exams (UPSC, SSC", "colleges and scholarships", "careers"]) {
      expect(s).toContain(w);
    }
    expect(s).toContain("official, reported or expected");
    expect(s).toContain("link the official books instead of copying them");
    expect(s).toContain("no paywall");
  });

  it("leaves out CLAT (no exam row) and Graduation/PG/PhD (only ever 'being built')", () => {
    for (const text of [s, siteDescription(COUNTS), SITE_SHORT]) {
      expect(text).not.toMatch(/CLAT/);
      expect(text).not.toMatch(/graduation|PhD|being built/i);
    }
  });
});

describe("no banned claim in any form", () => {
  it.each([
    ["SITE_SHORT", SITE_SHORT],
    ["SITE_TITLE_DEFAULT", SITE_TITLE_DEFAULT],
    ["SITE_CLAUSE", SITE_CLAUSE],
    ["static", siteDescriptionStatic()],
    ["computed", siteDescription(COUNTS)],
    ["section blurbs", SECTION_LINKS.map((l) => `${l.label} ${l.blurb}`).join("\n")],
  ])("%s", (_name, text) => {
    expect(bannedIn(text)).toEqual([]);
  });
});

describe("the computed form", () => {
  it("prints exactly the injected numbers (questions floored to hundreds with '+')", () => {
    const s = siteDescription(COUNTS);
    expect(s).toContain("It covers 180 entrance and government exams with 34,500+ practice questions answer-checked by AI");
    expect(s).toContain("1,146 NCERT chapters linked to the official books, 5 of them with Shishya's own notes and checked practice");
    expect(s).toContain("77 colleges from NIRF 2024 rankings, 208 scholarships and 94 career guides");
    expect(s).toContain("an AI tutor in English and 18 Indian languages");
    const rest = s.replace("Classes 1-12", "");
    expect(numbersIn(rest).sort()).toEqual(["180", "34,500", "1,146", "5", "77", "2024", "208", "94", "18"].sort());
  });

  it("changes every number when the inputs change — nothing is typed", () => {
    const s = siteDescription({
      exams: 201,
      checkedQuestions: 40_099,
      chapters: 1_200,
      chaptersWithNotes: 12,
      colleges: 81,
      scholarships: 210,
      careers: 95,
      indianLanguages: 19,
      collegeRankYear: 2025,
    });
    const rest = s.replace("Classes 1-12", "");
    expect(numbersIn(rest).sort()).toEqual(["201", "40,000", "1,200", "12", "81", "2025", "210", "95", "19"].sort());
  });

  it("drops the notes clause at zero and the year when it is unknown", () => {
    const s = siteDescription({ ...COUNTS, chaptersWithNotes: 0, collegeRankYear: undefined });
    expect(s).toContain("1,146 NCERT chapters linked to the official books;");
    expect(s).not.toContain("of them with");
    expect(s).toContain("colleges from NIRF rankings");
  });

  it("floors to hundreds and uses Indian digit grouping", () => {
    expect(flooredPlus(34_543)).toBe("34,500+");
    expect(flooredPlus(100)).toBe("100+");
    expect(flooredPlus(99)).toBe("99");
    expect(flooredPlus(123_456)).toBe("1,23,400+");
  });
});

describe("identity constants", () => {
  it("one Organization id on the canonical host", () => {
    expect(SITE_NAME).toBe("Shishya");
    expect(SITE_URL).toBe("https://shishya.in");
    expect(SITE_ORG_ID).toBe("https://shishya.in/#organization");
  });

  it("language codes are the locales list (BCP-47), English first", () => {
    expect([...SITE_LANGUAGE_CODES]).toEqual([...locales]);
    expect(SITE_LANGUAGE_CODES[0]).toBe("en");
    for (const c of SITE_LANGUAGE_CODES) expect(c).toMatch(/^[a-z]{2,3}$/);
  });

  it("SECTION_LINKS: the six doors, each to a real route", () => {
    expect(SECTION_LINKS.map((l) => [l.label, l.href])).toEqual([
      ["School", "/schooling"],
      ["Entrance exams", "/exams/entrance"],
      ["Government exams", "/exams/browse"],
      ["Colleges", "/colleges"],
      ["Scholarships", "/scholarships"],
      ["Careers", "/careers"],
    ]);
    for (const l of SECTION_LINKS) {
      expect(fs.existsSync(path.join(ROOT, "src/app", l.href, "page.tsx")), l.href).toBe(true);
    }
  });
});

describe("the surfaces use the shared wording", () => {
  const code = (rel: string) =>
    read(rel)
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^[ \t]*\/\/.*$/gm, "");

  it("root layout: default title/description, Organization @id + static description, no typed count", () => {
    const src = code("src/app/layout.tsx");
    expect(src).toMatch(/title: SITE_TITLE_DEFAULT,/);
    expect(src).toMatch(/description: SITE_SHORT,/);
    expect(src).toMatch(/"@id": SITE_ORG_ID,/);
    expect(src).toContain("siteDescriptionStatic()");
    expect(src).toContain("knowsLanguage: [...SITE_LANGUAGE_CODES]");
    expect(src).toContain('areaServed: { "@type": "Country", name: "India" }');
    expect(src).toContain("/icons/icon-512.png");
    expect(fs.existsSync(path.join(ROOT, "public/icons/icon-512.png"))).toBe(true);
    // The site-wide defaults no longer claim every page is the home page.
    const og = src.slice(src.indexOf("openGraph: {"), src.indexOf("},", src.indexOf("openGraph: {")));
    expect(og).not.toMatch(/url:|title:|description:/);
    const tw = src.slice(src.indexOf("twitter: {"), src.indexOf("},", src.indexOf("twitter: {")));
    expect(tw).not.toMatch(/title:|description:/);
    expect(bannedIn(src.slice(src.indexOf("export const metadata"), src.indexOf("export default function RootLayout")))).toEqual([]);
    // The SearchAction block belongs to the search workflow and stays.
    expect(src).toContain("/ask?q={search_term_string}");
  });

  it("JsonLd.tsx publisher nodes carry the Organization @id", () => {
    const src = code("src/components/JsonLd.tsx");
    expect(src).toContain('"@id": SITE_ORG_ID');
    expect(src).toContain("publisher: SHISHYA_ORG_REF");
  });

  it("manifest, OG card and footer", () => {
    const manifest = code("src/app/manifest.ts");
    expect(manifest).toContain("description: SITE_SHORT");
    expect(manifest).toContain("Shishya — ${SITE_SLOGAN}");
    const og = code("src/app/opengraph-image.tsx");
    expect(og).toContain("One smart place");
    expect(og).toContain("School · Entrance exams · Government exams · Colleges & scholarships · Careers");
    expect(og).toContain("${INDIAN_LANGUAGE_COUNT} Indian languages");
    expect(og).not.toMatch(/Every Indian entrance exam/);
    // Satori cannot shape Indic scripts: the card's text stays Latin (the
    // शि logo tile is the one pre-existing exception).
    const ogText = og.replace("शि", "");
    expect(ogText).not.toMatch(/[ऀ-෿]/);
    const footer = code("src/components/SiteFooter.tsx");
    expect(footer).toContain("SECTION_LINKS.map");
    expect(footer).toContain("one smart, free place");
    expect(footer).not.toContain("free for");
  });

  it("/about computes its numbers and falls back to the static form", () => {
    const src = code("src/app/about/page.tsx");
    expect(src).toContain("siteDescription(await loadSiteDescriptionCounts())");
    expect(src).toContain("return siteDescriptionStatic();");
    expect(src).toContain('"@type": "AboutPage"');
    expect(src).toContain("mainEntity: { \"@id\": SITE_ORG_ID }");
    expect(src).toContain('"@type": "FAQPage"');
    for (const q of ["What is Shishya?", "Is Shishya free?", "Who runs Shishya?"]) expect(src).toContain(q);
    expect(src).toContain("Surge Software Solutions Pvt Ltd");
    expect(src).toContain("Bengaluru");
    expect(src).toContain("url: ABOUT_URL");
    expect(src).not.toMatch(/\d{3}\+/);
  });

  it("no typed '170+' / '175+' / '3,700+' left on the entity pages", () => {
    for (const rel of [
      "src/app/layout.tsx",
      "src/app/manifest.ts",
      "src/app/opengraph-image.tsx",
      "src/app/about/page.tsx",
      "src/app/editorial-policy/page.tsx",
      "src/app/pricing/page.tsx",
      "src/app/educators/page.tsx",
      "src/components/SiteFooter.tsx",
      "src/components/OnboardingTour.tsx",
      "src/app/api/telegram/webhook/route.ts",
    ]) {
      const src = code(rel);
      expect(src, rel).not.toMatch(/\b1[67]\d\+/);
      expect(src, rel).not.toContain("3,700+");
    }
  });

  it("/pricing states the mentor fee the payment code charges", () => {
    const src = code("src/app/pricing/page.tsx");
    expect(src).toContain("MENTOR_SESSION_FEE_PAISE / 100");
    expect(src).toContain("Every study feature is free with no paywall; the only paid item is an optional ${MENTOR_FEE} session with a human mentor (first session free).");
    expect(src).toContain("openGraph: {");
  });

  it("/editorial-policy covers the school pages and the data sources", () => {
    const src = code("src/app/editorial-policy/page.tsx");
    expect(src).toContain("School pages");
    expect(src).toContain("never copy, summarise or translate textbook");
    expect(src).toContain("Colleges, scholarships and careers data");
    expect(src).toContain("NIRF_SOURCE_YEAR");
    expect(src).toContain("openGraph: {");
  });

  it("README opens with the static description and the site link", () => {
    const readme = read("README.md").replace(/\r\n/g, "\n");
    // The top block: the quoted lines under the title.
    const top = readme.slice(0, readme.indexOf("\nShishya means"));
    expect(top).toContain(siteDescriptionStatic().split(", and the AI tutor works in English and")[0]);
    expect(top).toContain("https://shishya.in");
    expect(numbersIn(top.replace("Classes 1-12", "").replace("26 Sep 2026", "").replace(/i18n/g, ""))).toEqual([]);
    expect(bannedIn(top)).toEqual([]);
  });
});
