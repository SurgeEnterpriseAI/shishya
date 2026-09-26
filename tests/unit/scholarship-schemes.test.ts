// The scholarship schemes vs the raw catalogue (26 Sep 2026, repair).
//
// src/data/scholarships.ts holds one outside aggregator (Buddy4Study, tag
// "aggregator"). It was counted in every computed scholarship number, listed
// as a card and a MonetaryGrant detail page, and printed under "never an
// aggregator" on /scholarships/context.md. Every count, list, sitemap row
// and related block now reads SCHOLARSHIP_SCHEMES; its old URL redirects.
// 27 Sep 2026 (fixer): SCHOLARSHIP_SCHEMES also leaves out the rows marked
// Scholarship.unlisted (not a scholarship, not found on any official page,
// or in doubt) — they were still in the sitemap, the browser, the match
// wizard, search, llms-full.txt, context.md and every count. Their pages
// answer, noindexed, with the reason and no Apply button.
// No DB, no network.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { OFFERED_SCHEMES, SCHOLARSHIP_SCHEMES, isAggregatorListing, isOfferedScheme, isPresentedScheme, unlistedKind } from "@/lib/scholarship-schemes";

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), "utf8");
/** Source with line and block comments removed (comments may name the old identifier). */
const code = (rel: string) => read(rel).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("SCHOLARSHIP_SCHEMES", () => {
  it("is the catalogue minus its aggregator listings and unlisted rows, in catalogue order (27 Sep 2026 fixer)", () => {
    const aggregators = SCHOLARSHIPS.filter((s) => s.tags.includes("aggregator"));
    const unlisted = SCHOLARSHIPS.filter((s) => !!s.unlisted && !isAggregatorListing(s));
    expect(aggregators.map((s) => s.id)).toContain("buddy4study-aggregator");
    expect(unlisted.length).toBeGreaterThan(0);
    expect(SCHOLARSHIP_SCHEMES.length).toBe(SCHOLARSHIPS.length - aggregators.length - unlisted.length);
    expect(SCHOLARSHIP_SCHEMES.some(isAggregatorListing)).toBe(false);
    expect(SCHOLARSHIP_SCHEMES.some((s) => !!s.unlisted)).toBe(false);
    expect(SCHOLARSHIP_SCHEMES.map((s) => s.id)).toEqual(SCHOLARSHIPS.filter((s) => !isAggregatorListing(s) && !s.unlisted).map((s) => s.id));
    expect(SCHOLARSHIP_SCHEMES.every(isPresentedScheme)).toBe(true);
    // Offered = presented and still taking applications (closed schemes keep their page, not a recommendation).
    expect(OFFERED_SCHEMES.map((s) => s.id)).toEqual(SCHOLARSHIP_SCHEMES.filter((s) => !s.closed).map((s) => s.id));
    expect(OFFERED_SCHEMES.every(isOfferedScheme)).toBe(true);
    expect(OFFERED_SCHEMES.some((s) => s.id === "maulana-azad-fellowship")).toBe(false);
  });

  it("every unlisted reason is one of three kinds; the 'Not found' rows are presented nowhere", () => {
    for (const s of SCHOLARSHIPS.filter((x) => x.unlisted)) {
      expect(s.unlisted, s.id).toMatch(/^(Not a scholarship|Status in doubt|Not found|Not one verifiable scheme)\b/);
      expect(unlistedKind(s), s.id).not.toBeNull();
    }
    const notFound = ["rgvn-women-startups", "pb-puniti-tagore-pb", "ka-cipriani", "uk-mukhyamantri-uk", "tn-puratchi-mt", "kl-sajeshmt-women", "ap-cbpetbg-mt"];
    for (const id of notFound) {
      const s = SCHOLARSHIPS.find((x) => x.id === id);
      expect(s, id).toBeDefined();
      expect(s!.unlisted, id).toMatch(/^Not found \(27 Sep 2026\)/);
      expect(unlistedKind(s!), id).toBe("not-found");
      expect(SCHOLARSHIP_SCHEMES.some((x) => x.id === id), id).toBe(false);
    }
    expect(unlistedKind(SCHOLARSHIPS.find((x) => x.id === "bihar-mukhyamantri-cycle")!)).toBe("not-scholarship");
    expect(unlistedKind(SCHOLARSHIPS.find((x) => x.id === "tata-football-academy")!)).toBe("not-scholarship");
    expect(unlistedKind(SCHOLARSHIPS.find((x) => x.id === "begum-hazrat-mahal")!)).toBe("in-doubt");
    expect(unlistedKind({ unlisted: "Not one verifiable scheme (27 Sep 2026): x" })).toBe("not-found");
    expect(unlistedKind({})).toBeNull();
  });

  it("isAggregatorListing reads the tag", () => {
    expect(isAggregatorListing({ tags: ["aggregator", "discovery"] })).toBe(true);
    expect(isAggregatorListing({ tags: ["merit"] })).toBe(false);
  });
});

describe("every scholarship count, list and sitemap row uses the schemes", () => {
  it.each([
    "src/app/sitemap.ts",
    "src/app/colleges/page.tsx",
    "src/app/context.md/route.ts",
    "src/app/llms-full.txt/route.ts",
    "src/app/scholarships/context.md/route.ts",
    "src/lib/site-description-counts.ts",
    "src/app/scholarships/page.tsx",
  ])("%s", (rel) => {
    const src = code(rel);
    expect(src).toContain("SCHOLARSHIP_SCHEMES");
    expect(src).not.toMatch(/\bSCHOLARSHIPS\b/);
  });

  it("the detail route: static params and related blocks from the schemes; an aggregator URL redirects", () => {
    const src = code("src/app/scholarships/[id]/page.tsx");
    expect(src).toMatch(/SCHOLARSHIP_SCHEMES\.map\(\(s\) => \(\{ id: s\.id \}\)\)/);
    // 26 Sep 2026 (G4): related blocks never offer a discontinued scheme.
    expect(src).toContain("relatedScholarships(s, SCHOLARSHIP_SCHEMES, 8).filter(isOpenScheme).slice(0, 6)");
    expect(src).toContain('if (isAggregatorListing(s)) permanentRedirect("/scholarships");');
  });

  it("27 Sep 2026 (fixer): search, the match wizard, the tutor's tool, the exam sidebar and the state pages read the presented / offered schemes", () => {
    const index = code("src/lib/search/index-core.ts");
    expect(index).toContain("for (const s of SCHOLARSHIP_SCHEMES) {");
    expect(index).not.toMatch(/\bSCHOLARSHIPS\b/);
    const match = code("src/app/scholarships/match/page.tsx");
    expect(match).toContain("<MatchWizard scholarships={[...OFFERED_SCHEMES]} />");
    expect(match).not.toMatch(/\bSCHOLARSHIPS\b/);
    const tools = code("src/lib/ai/tools.ts");
    expect(tools).not.toMatch(/\bSCHOLARSHIPS\b/);
    expect(tools).toContain('scholarshipsForExam(ctx.examCode, "").filter(isOfferedScheme)');
    expect(tools).toContain("if (pool.length === 0) pool = [...OFFERED_SCHEMES];");
    expect(tools).toContain("filtered = [...OFFERED_SCHEMES].filter((s) => {");
    expect(code("src/components/ScholarshipsForExamSection.tsx")).toContain("matched = matched.filter(isOfferedScheme);");
    const state = code("src/lib/state-exam-sections.ts");
    expect(state).toContain("OFFERED_SCHEMES.filter((s) => s.state === stateCode)");
    expect(state).not.toMatch(/\bSCHOLARSHIPS\b/);
    // The Ask engine's page facts say whether the scheme is listed at all.
    expect(code("src/lib/search/ask-tools.ts")).toContain("? `Not listed on Shishya: ${s.unlisted} Do not present it as an available scholarship.`");
  });

  it("27 Sep 2026 (fixer): an unlisted row's page answers, noindexed, with the reason — no Apply, no grant or FAQ markup", () => {
    const src = code("src/app/scholarships/[id]/page.tsx");
    expect(src).toMatch(/const unlisted = unlistedKind\(s\);\s*if \(unlisted\) \{\s*return \{\s*title: `\$\{s\.name\} — \$\{UNLISTED_TITLE\[unlisted\]\} \| Shishya`,/);
    expect(src).toMatch(/if \(unlisted\) \{[\s\S]{0,400}robots: \{ index: false, follow: true \},/);
    expect(src).toContain("Not listed on Shishya. {s.unlisted}");
    expect(src).toContain("{!s.closed && !unlisted && (");
    expect(src).toContain("{!unlisted && <script type=\"application/ld+json\" dangerouslySetInnerHTML={{ __html: JSON.stringify(grantJsonLd) }} />}");
    expect(src).toContain("{!unlisted && <script type=\"application/ld+json\" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />}");
    expect(src).toContain("{!unlisted && <SaveScholarshipButton");
    // A "not found" row prints none of its own claims.
    expect(src).toContain('const vouched = unlisted !== "not-found";');
    expect(src).toMatch(/\{vouched && \(\s*<dl className="mt-6 grid/);
    expect(src).toContain("{vouched && <p className=\"mt-4 max-w-3xl text-sm text-ink-700\">{s.description}</p>}");
    expect(code("src/app/scholarships/[id]/opengraph-image.tsx")).toContain('const amount = s && !s.unlisted ? s.amount : "";');
  });

  it("no page promises links 'never' reach an aggregator while one is linked", () => {
    expect(read("src/app/editorial-policy/page.tsx")).not.toMatch(/never to a third-party\s+aggregator/);
    expect(read("src/app/editorial-policy/page.tsx")).toMatch(/is labelled as an\s+aggregator and is not counted among the scholarships/);
    expect(read("src/lib/section-context.ts")).not.toContain("never an aggregator");
  });
});
