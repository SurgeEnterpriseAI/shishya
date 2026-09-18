// Cache pilot (16 Sep 2026): /exams/[code]/guide and /tricks render
// statically with the language taken from the URL. Two things are pinned:
//   1. the pure path helpers in src/lib/cache-pilot-routes.ts, shared by the
//      middleware and the two page families;
//   2. the four route files stay free of every request-scoped call (getT /
//      cookies / headers / auth …), and so does every server component in
//      their render tree — the root layout's included. With
//      generateStaticParams() returning [] nothing is rendered at build
//      time, so neither `next dev` nor `next build` notices such a call; in
//      production an ISR route that turns dynamic throws "Page changed from
//      static to dynamic at runtime" (HTTP 500). The routes export
//      dynamic = "force-static" as the safety net (the call reads empty
//      values instead), and this test is what fails first — run it after
//      every other partition's edits;
//   3. what a CACHED render must not do: swallow a failed content read into
//      notFound() (the 404 would be stored for the URL), or link sibling
//      pages that do not render (src/lib/exam-page-gates.ts).

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import { CACHE_PILOT_FAMILIES, cachePilotFamily, isCachePilotTwin, pilotPageLocale } from "@/lib/cache-pilot-routes";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const PAGES = {
  guide: "src/app/exams/[code]/guide/page.tsx",
  tricks: "src/app/exams/[code]/tricks/page.tsx",
  guideTwin: "src/app/(cache-pilot)/[lang]/exams/[code]/guide/page.tsx",
  tricksTwin: "src/app/(cache-pilot)/[lang]/exams/[code]/tricks/page.tsx",
};

/** Source without comments, so a comment that names cookies() is not a call. */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
}

// Anything that opts a route into per-request rendering, or reads the
// visitor instead of the URL.
const DYNAMIC_CALLS = [
  "getT(",
  "getLocale(",
  "getUrlLocale(",
  "cookies(",
  "headers(",
  "auth(",
  "getServerSession(",
  "draftMode(",
  "noStore(",
  "unstable_noStore",
  "connection(",
  "searchParams",
  "force-dynamic",
  "no-store",
];

describe("cache-pilot-routes helpers", () => {
  it("names the two pilot families", () => {
    expect([...CACHE_PILOT_FAMILIES]).toEqual(["guide", "tricks"]);
  });

  it("cachePilotFamily: only /exams/{code}/guide and /exams/{code}/tricks", () => {
    expect(cachePilotFamily("/exams/SSC_GD/guide")).toBe("guide");
    expect(cachePilotFamily("/exams/SSC_GD/tricks")).toBe("tricks");
    expect(cachePilotFamily("/exams/SSC_GD/tricks/")).toBe("tricks");
    expect(cachePilotFamily("/exams/SSC_GD")).toBeNull();
    expect(cachePilotFamily("/exams/SSC_GD/cutoff")).toBeNull();
    expect(cachePilotFamily("/exams/SSC_GD/guide/extra")).toBeNull();
    expect(cachePilotFamily("/exams/SSC_GD/topics/ga.history/hi")).toBeNull();
    expect(cachePilotFamily("/exams/state/karnataka")).toBeNull();
    expect(cachePilotFamily("/guide")).toBeNull();
    expect(cachePilotFamily("/hi/exams/SSC_GD/guide")).toBeNull(); // un-prefixed paths only
  });

  it("isCachePilotTwin: the /hi and /te URLs of a pilot page, nothing else", () => {
    expect(isCachePilotTwin("/hi/exams/SSC_GD/guide")).toBe(true);
    expect(isCachePilotTwin("/te/exams/SSC_GD/tricks")).toBe(true);
    expect(isCachePilotTwin("/hi/exams/SSC_GD/tricks/")).toBe(true);
    expect(isCachePilotTwin("/exams/SSC_GD/guide")).toBe(false);
    expect(isCachePilotTwin("/hi/exams/SSC_GD")).toBe(false);
    expect(isCachePilotTwin("/hi/exams/SSC_GD/cutoff")).toBe(false);
    expect(isCachePilotTwin("/hi/exams/SSC_GD/updates")).toBe(false);
    expect(isCachePilotTwin("/kn/exams/SSC_GD/guide")).toBe(false);
    expect(isCachePilotTwin("/hi")).toBe(false);
    expect(isCachePilotTwin("/hindi/exams/SSC_GD/guide")).toBe(false);
  });

  it("pilotPageLocale: English without a segment, hi/te for the twins, null otherwise", () => {
    expect(pilotPageLocale(undefined)).toBe("en");
    expect(pilotPageLocale("hi")).toBe("hi");
    expect(pilotPageLocale("te")).toBe("te");
    expect(pilotPageLocale("en")).toBeNull(); // /en/… is not a twin prefix
    expect(pilotPageLocale("kn")).toBeNull();
    expect(pilotPageLocale("")).toBeNull();
    expect(pilotPageLocale("HI")).toBeNull();
  });
});

describe("cache-pilot route files stay statically renderable", () => {
  for (const [name, rel] of Object.entries(PAGES)) {
    it(`${name}: revalidate + generateStaticParams, no dynamic call`, () => {
      const src = read(rel);
      const body = code(src);
      expect(body).toMatch(/export const revalidate = 3600;/);
      expect(body).toMatch(/export function generateStaticParams\(\)/);
      // Safety net: a request-scoped call that slips in reads empty values
      // instead of turning the ISR route into a production 500.
      expect(body).toMatch(/export const dynamic = "force-static";/);
      for (const call of DYNAMIC_CALLS) {
        expect(body, `${rel} contains ${call}`).not.toContain(call);
      }
    });
  }

  it("the English pages take the language from the URL param, not the visitor", () => {
    for (const rel of [PAGES.guide, PAGES.tricks]) {
      const body = code(read(rel));
      expect(body).toContain('import { tFor } from "@/lib/i18n-server";');
      expect(body).toContain("pilotPageLocale(lang)");
      expect(body).toMatch(/params: Promise<\{ code: string; lang\?: string \}>/);
    }
  });

  it("the [lang] twins wrap the English page component and 404 other prefixes", () => {
    for (const [rel, family] of [
      [PAGES.guideTwin, "guide"],
      [PAGES.tricksTwin, "tricks"],
    ] as const) {
      const body = code(read(rel));
      expect(body).toContain(`from "@/app/exams/[code]/${family}/page"`);
      expect(body).toContain("if (!isUrlLocale(lang)) notFound();");
      expect(body).toContain("if (!isUrlLocale(lang)) return {};");
    }
  });

  it("every server component in the render tree — root layout included — is free of dynamic calls", () => {
    const ROOT_LAYOUT = "src/app/layout.tsx";
    const isClient = (s: string) => /^\s*(\/\/.*\r?\n|\/\*[\s\S]*?\*\/\s*)*["']use client["']/.test(s);
    const resolveComponent = (name: string): string | null => {
      for (const ext of [".tsx", ".ts"]) {
        const rel = `src/components/${name}${ext}`;
        if (fs.existsSync(path.join(ROOT, rel))) return rel;
      }
      return null;
    };
    const seen = new Set<string>();
    const clientIslands = new Set<string>();
    // Walk @/components imports (and ./relative ones between components) from
    // the two English pages and the root layout; stop at client islands.
    const queue: string[] = [PAGES.guide, PAGES.tricks, ROOT_LAYOUT];
    while (queue.length) {
      const rel = queue.shift()!;
      if (seen.has(rel)) continue;
      seen.add(rel);
      const src = read(rel);
      if (isClient(src)) {
        clientIslands.add(rel);
        continue;
      }
      const body = code(src);
      for (const call of DYNAMIC_CALLS) {
        expect(body, `${rel} contains ${call}`).not.toContain(call);
      }
      const names: string[] = [];
      for (const m of src.matchAll(/from "@\/components\/([A-Za-z0-9_/-]+)"/g)) names.push(m[1]);
      if (rel.startsWith("src/components/")) {
        for (const m of src.matchAll(/from "\.\/([A-Za-z0-9_-]+)"/g)) names.push(m[1]);
      }
      for (const name of names) {
        const comp = resolveComponent(name);
        expect(comp, `${rel} imports @/components/${name}, which was not found`).not.toBeNull();
        queue.push(comp!);
      }
    }
    // Sanity: the shared chrome was actually walked, relative imports too.
    expect(seen.has("src/components/Header.tsx")).toBe(true);
    expect(seen.has("src/components/StateExamsLink.tsx")).toBe(true);
    expect(seen.has("src/components/SiteFooter.tsx")).toBe(true);
    expect(seen.has("src/components/HeaderAuthControls.tsx")).toBe(true);
    expect(clientIslands.has("src/components/HeaderAuthControls.tsx")).toBe(true);
    expect(clientIslands.has("src/components/SiteFooter.tsx")).toBe(false);
  });

  it("the libs the pilot render calls read the URL and the database only", () => {
    for (const rel of [
      "src/lib/cache-pilot-routes.ts",
      "src/lib/exam-page-gates.ts",
      "src/lib/seo-locale.ts",
      "src/lib/state-info.ts",
    ]) {
      const body = code(read(rel));
      for (const call of DYNAMIC_CALLS) {
        expect(body, `${rel} contains ${call}`).not.toContain(call);
      }
    }
  });

  it("the only thing the pages take from i18n-server is the pure tFor()", () => {
    for (const rel of [PAGES.guide, PAGES.tricks]) {
      const body = code(read(rel));
      const imports = [...body.matchAll(/import \{([^}]*)\} from "@\/lib\/i18n-server";/g)].map((m) => m[1].trim());
      expect(imports).toEqual(["tFor"]);
    }
  });
});

describe("a cached render: no swallowed read, no link to a page that does not render", () => {
  it("a failed ExamGuide / ExamTricks read throws — it is never turned into a cached 404", () => {
    for (const [rel, table] of [
      [PAGES.guide, "ExamGuide"],
      [PAGES.tricks, "ExamTricks"],
    ] as const) {
      const body = code(read(rel));
      expect(body).toContain(`FROM "${table}"`);
      // No promise in the page swallows its error: the only reads are the
      // exam lookup, the content SELECT and the gates (which fall back to
      // OPEN inside src/lib/exam-page-gates.ts, never to a 404).
      expect(body, `${rel} swallows a read`).not.toContain(".catch(");
      expect(body, `${rel} swallows a read`).not.toMatch(/\bcatch\s*[({]/);
    }
  });

  it("guide: the /syllabus button and the mock line follow the page gates", () => {
    const body = code(read(PAGES.guide));
    expect(body).toContain('import { examPageGates } from "@/lib/exam-page-gates";');
    expect(body).toContain("examPageGates(exam.code)");
    // The only /syllabus link sits inside the gate.
    expect(body.split("/syllabus`").length - 1).toBe(1);
    expect(body).toMatch(/\{gates\.syllabus && \(\s*<Link\s+href=\{`\/exams\/\$\{exam\.code\}\/syllabus`\}/);
    // The mock sentence is the open-gate branch; the closed one claims no
    // mock and no daily plan — those exams have no questions and no topics,
    // so the coach has nothing to plan from (src/lib/coach-plan.ts).
    expect(body).toMatch(
      /gates\.buildMock\s*\? "Take a free mock, get your weak topics, and follow a daily plan\. No coaching fees, in your language\."\s*: "No coaching fees\."/,
    );
    expect(body.split("free mock").length - 1).toBe(1);
    expect(body.split("daily plan").length - 1).toBe(1);
  });

  it("guide: the coach (daily plan) entry renders only where the exam has topics to plan from", () => {
    const body = code(read(PAGES.guide));
    expect(body.split("<CoachEntry").length - 1).toBe(1);
    expect(body).toMatch(/\{gates\.syllabus && <CoachEntry examCode=\{exam\.code\} examShort=\{exam\.shortName\} variant="guide" \/>\}/);
  });

  it("tricks: the free-mock sentence, the quiz button and the description line follow the page gates", () => {
    const body = code(read(PAGES.tricks));
    expect(body).toContain('import { examPageGates } from "@/lib/exam-page-gates";');
    // One /quiz link, inside the gate.
    expect(body.split("/quiz`").length - 1).toBe(1);
    expect(body).toMatch(/\{gates\.buildMock && \(\s*<Link\s+href=\{`\/exams\/\$\{exam\.code\}\/quiz`\}/);
    // The body sentence, inside the gate.
    expect(body).toMatch(/\{gates\.buildMock && \(\s*<p className="mt-1 text-sm text-ink-600">\s*Take a free \{exam\.shortName\} mock right now/);
    // The meta description keeps its sentence only behind the gate.
    expect(body).toContain('exam-tested, free.${gates.buildMock ? " Practice each trick immediately with a free mock." : ""}');
    // Every "free mock" / "free … mock" mention is one of the above.
    expect(body.split("free mock").length - 1).toBe(1);
    expect(body.split("Take a free").length - 1).toBe(1);
  });

  it("search surface: titles, canonicals and JSON-LD headlines are the pre-pilot strings", () => {
    const guide = code(read(PAGES.guide));
    expect(guide).toContain("`How to Prepare for ${exam.shortName} ${YEAR} — Without Coaching | Study Plan, Difficulty, Salary | Shishya`");
    expect(guide).toContain("const url = `https://shishya.in/exams/${exam.code}/guide`;");
    expect(guide).toContain("alternates: { canonical: url },");
    expect(guide).toContain("headline: `How to prepare for ${exam.shortName} ${YEAR} — with or without coaching`,");
    const tricks = code(read(PAGES.tricks));
    expect(tricks).toContain("`${exam.shortName} Tricks & Mnemonics ${YEAR} — Short Tricks That Save Minutes | Shishya`");
    expect(tricks).toContain("const url = `https://shishya.in/exams/${exam.code}/tricks`;");
    expect(tricks).toContain("alternates: { canonical: url },");
    expect(tricks).toContain("headline: `${exam.shortName} Tricks & Mnemonics — subject-wise short tricks`,");
    // Twins never declare themselves: no hreflang block, no localised canonical.
    for (const body of [guide, tricks, code(read(PAGES.guideTwin)), code(read(PAGES.tricksTwin))]) {
      expect(body).not.toContain("languageAlternates(");
      expect(body).not.toContain("twinCanonical(");
      expect(body).not.toContain("languages:");
    }
  });
});
