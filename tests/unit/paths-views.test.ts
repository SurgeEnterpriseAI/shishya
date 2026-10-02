// The life-stage pages as rendered HTML (30 Sep 2026, P1 build 1, spec §2 /
// §5 / §7 — agent B's pages). No DB, no network, no browser: every TSX file
// (the views in src/components/paths, the route pages, /schooling/streams
// and /career-map) is transpiled with TypeScript and rendered with
// renderToStaticMarkup; the DB reads (loadLiveExams, the exam rows) and the
// site header are stubbed; the registry and the page models are the real
// ones. Run: npx vitest run tests/unit/paths-views.test.ts
//
// What this pins:
//   1. the view helpers and the view copy (no digits, no salary / ranking word);
//   2. the tutor entry: a seeded /chat?general=1&seed=… link, never for a
//      stage that may include children or a Class 1-7 context;
//   3. /after-10th and /after-12th: body order, the computed counts, every
//      option linked, nothing unconfirmed printed, every confirmed rule with
//      its source and read day, exam links only for live exams, the FAQ the
//      JSON-LD carries printed visibly, index gate and canonical;
//   4. the nine stream pages: confirmed board rows only, unread boards only as
//      "check the official site", the pending line with no rows, sources,
//      tutor, robots = schoolRobots(isStreamPageIndexable), 404 for any
//      other slug, the context.md route wiring, and one item per fact in
//      "What it keeps open" (1 Oct 2026: CLAT and NDA once, on the family line
//      with the exam's chip);
//   5. /schooling/streams keeps its sections and links all nine pages;
//   6. /career-map: Class 1-8 and working rows, stage ids, hub links, tutor
//      only from after-10th on.

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as reactDom from "react-dom";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("@/lib/exam-list-rows", () => ({ getExamListRows: vi.fn(async () => []) }));
vi.mock("@/lib/live-exam-codes", () => ({ loadLiveExams: vi.fn(async () => new Map()) }));
// section-context (context.md headers) reaches the school surface loader,
// which makes a Prisma client and an unstable_cache wrapper on import.
vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import * as dataPaths from "@/data/paths";
import * as copyMod from "@/lib/paths/copy";
import * as helpersMod from "@/lib/paths/index-helpers";
import * as stagePagesMod from "@/lib/paths/stage-pages";
import * as streamPagesMod from "@/lib/paths/stream-pages";
import * as stageTutorMod from "@/lib/paths/stage-tutor";
import * as sectionSeo from "@/lib/section-seo";
import * as schoolingData from "@/lib/schooling-data";
import * as careersMod from "@/data/careers";
import * as siteDescription from "@/lib/site-description";
import * as viewCopyMod from "@/components/paths/view-copy";
import * as viewHelpersMod from "@/components/paths/view-helpers";
import * as pathContextMod from "@/lib/paths/path-context";
import * as sectionContextMod from "@/lib/section-context";
import { getExamListRows } from "@/lib/exam-list-rows";
import { examsAfterTotal } from "@/components/paths/stage-hub-data";

const {
  BOARD_CHECK_LINKS,
  BOARD_STREAM_COMBINATIONS,
  PATH_STAGES,
  STREAM_OPTIONS,
  STREAM_OPTION_SLUGS,
  findStage,
  strayDigits,
} = dataPaths;
const { afterTenthModel, afterTwelfthModel } = stagePagesMod;
const { isStreamPageIndexable, streamPageModel } = streamPagesMod;
const { stageTutorHref } = stageTutorMod;
const { pathViewCopy } = viewCopyMod;
const { factCellText, groupRowsByBoard, previewSplit, readOnText, scholarshipsAllHref, visibleAliases, SCHOLARSHIP_PREVIEW_MAX, BOARD_OPEN_MAX } = viewHelpersMod;

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");

// ── The live-exam fixture (26 Sep 2026 catalogue) ─────────────────────────

const FIXTURE_CODES: ReadonlySet<string> = new Set(
  (JSON.parse(read("tests/fixtures/search-inputs-2026-09-26.json")) as { exams: [string, ...unknown[]][] }).exams.map((e) => e[0]),
);
const NONE: ReadonlySet<string> = new Set();

// ── A TSX loader: transpile, stub the DB / header / Next modules, reuse the
//    real registry modules this file imported ─────────────────────────────

let stubLive: ReadonlyMap<string, string> = new Map();
let stubTotal: number | null = null;

function LinkStub({ href, prefetch, children, ...rest }: { href: string; prefetch?: boolean; children?: React.ReactNode } & Record<string, unknown>) {
  return React.createElement("a", { href, "data-prefetch": prefetch === false ? "off" : "on", ...rest }, children);
}

const NOT_FOUND = "NEXT_NOT_FOUND";
const STUBS: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  // 2 Oct 2026: the shared sign-up button (the views mount SignupInline)
  // imports createPortal for its top-layer tooltip — never called in a static
  // render (the copy mounts only while the tooltip is open).
  "react-dom": reactDom,
  "next/link": { __esModule: true, default: LinkStub },
  "next/navigation": {
    notFound: () => {
      throw new Error(NOT_FOUND);
    },
  },
  "@/components/Header": { Header: () => React.createElement("header", { "data-stub": "header" }) },
  "@/lib/live-exam-codes": { loadLiveExams: async () => stubLive },
  "@/components/paths/stage-hub-data": { loadStageHubInputs: async () => ({ live: stubLive, examsAfterTotal: stubTotal }) },
  "@/lib/exam-week": { istDay: () => "2026-09-30" },
};

function resolveFile(spec: string, fromDir: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(ROOT, "src", spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(fromDir, spec);
  else return null;
  for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx"]) {
    const f = base + ext;
    if (fs.existsSync(f) && fs.statSync(f).isFile()) return path.normalize(f);
  }
  throw new Error(`cannot resolve ${spec} from ${fromDir}`);
}

const PRELOADED = new Map<string, unknown>(
  (
    [
      ["@/data/paths", dataPaths],
      ["@/lib/paths/copy", copyMod],
      ["@/lib/paths/index-helpers", helpersMod],
      ["@/lib/paths/stage-pages", stagePagesMod],
      ["@/lib/paths/stream-pages", streamPagesMod],
      ["@/lib/paths/stage-tutor", stageTutorMod],
      ["@/lib/section-seo", sectionSeo],
      ["@/lib/schooling-data", schoolingData],
      ["@/data/careers", careersMod],
      ["@/lib/site-description", siteDescription],
      ["@/components/paths/view-copy", viewCopyMod],
      ["@/components/paths/view-helpers", viewHelpersMod],
      ["@/lib/paths/path-context", pathContextMod],
      ["@/lib/section-context", sectionContextMod],
    ] as const
  ).map(([spec, mod]) => [resolveFile(spec, ROOT)!, mod]),
);

const loaded = new Map<string, { exports: Record<string, unknown> }>();

function loadFile(file: string): Record<string, unknown> {
  const hit = loaded.get(file);
  if (hit) return hit.exports;
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  loaded.set(file, mod);
  const dir = path.dirname(file);
  const req = (spec: string): unknown => {
    if (spec in STUBS) return STUBS[spec];
    const f = resolveFile(spec, dir);
    if (!f) throw new Error(`${path.relative(ROOT, file)} imports an unexpected package: ${spec}`);
    return PRELOADED.get(f) ?? loadFile(f);
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports;
}

const load = (rel: string) => loadFile(path.normalize(path.join(ROOT, rel)));
type FC<P> = (p: P) => React.ReactElement | null;
const html = (el: React.ReactElement | null) => (el ? renderToStaticMarkup(el) : "");
const render = <P extends object>(C: FC<P>, props: P) => renderToStaticMarkup(React.createElement(C as React.FC<P>, props));

/** Visible text: tags and JSON-LD scripts out, entities decoded. */
function textOf(markup: string): string {
  return markup
    .replace(/<script[\s\S]*?<\/script>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ");
}

function jsonLdBlocks(markup: string): Array<Record<string, unknown>> {
  return [...markup.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]) as Record<string, unknown>);
}

/** An attribute value as React escapes it (& and '). */
const attr = (v: string) => v.replace(/&/g, "&amp;").replace(/'/g, "&#x27;");

/** /exams/{CODE} hrefs (exam hubs, not /exams/after|entrance|browse). */
function examHubCodes(markup: string): string[] {
  return [...markup.matchAll(/href="\/exams\/([A-Z0-9_]+)"/g)].map((m) => m[1]);
}

/** Every unconfirmed text in the registry (must never reach a page). */
function unconfirmedTexts(): string[] {
  return STREAM_OPTIONS.flatMap((o) => [o.duration, ...o.facts]).filter((f) => f.status === "unconfirmed").map((f) => f.text);
}

const FORBIDDEN = /salary|\bLPA\b|\bbest\b|#1\b|\bbiggest\b|\blargest\b|number one|starting salary/i;

/** A page.tsx route for `href` (static segment beats a dynamic sibling; groups transparent). */
function routeExists(href: string): boolean {
  const withGroups = (dir: string): string[] => [
    dir,
    ...fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isDirectory() && /^\(.+\)$/.test(e.name)).flatMap((e) => withGroups(path.join(dir, e.name))),
  ];
  const segs = href.split(/[?#]/)[0].split("/").filter(Boolean);
  let dirs = withGroups(path.join(ROOT, "src/app"));
  for (const seg of segs) {
    const exact = dirs.map((d) => path.join(d, seg)).filter((p) => fs.existsSync(p) && fs.statSync(p).isDirectory()).flatMap(withGroups);
    const dynamic = dirs.flatMap((d) =>
      fs.readdirSync(d, { withFileTypes: true }).filter((e) => e.isDirectory() && /^\[.+\]$/.test(e.name)).flatMap((e) => withGroups(path.join(d, e.name))),
    );
    dirs = exact.length > 0 ? exact : dynamic;
    if (dirs.length === 0) return false;
  }
  return dirs.some((d) => fs.existsSync(path.join(d, "page.tsx")));
}

beforeEach(() => {
  stubLive = new Map([...FIXTURE_CODES].map((c) => [c, c]));
  stubTotal = null;
});

// ── 1. view helpers and copy ─────────────────────────────────────────────

describe("view helpers", () => {
  const src = { url: "https://cbseacademic.nic.in/x.pdf", publisher: "CBSE", title: "T", checkedOn: "2026-09-30", tier: "official" as const };

  it("a duration cell prints a confirmed fact with a source, an estimate with the word, never an unconfirmed one", () => {
    expect(factCellText({ text: "2 years", status: "confirmed", source: src })).toBe("2 years");
    expect(factCellText({ text: "2 years", status: "confirmed", source: null })).toBeNull();
    expect(factCellText({ text: "about 2 years", status: "estimate", source: null })).toBe("about 2 years (estimate)");
    expect(factCellText({ text: "not read", status: "unconfirmed", source: null })).toBeNull();
    expect(factCellText(null)).toBeNull();
  });

  it("the read-on line names the day in words", () => {
    expect(readOnText(src)).toBe("read on 30 Sep 2026");
  });

  it("the scholarship preview keeps every row (shown + rest)", () => {
    const list = Array.from({ length: SCHOLARSHIP_PREVIEW_MAX + 3 }, (_, i) => i);
    const { shown, rest } = previewSplit(list);
    expect(shown.length).toBe(SCHOLARSHIP_PREVIEW_MAX);
    expect([...shown, ...rest]).toEqual(list);
    expect(previewSplit([1, 2]).rest).toEqual([]);
  });

  it("the full scholarship lists the hubs link exist", () => {
    expect(routeExists(scholarshipsAllHref("after-10th"))).toBe(true);
    expect(routeExists(scholarshipsAllHref("after-12th"))).toBe(true);
    expect(scholarshipsAllHref("after-10th")).toBe("/scholarships/for/class-11-12");
  });

  it("visible aliases are Latin-script, not already in the short name, and capped", () => {
    const mpc = STREAM_OPTIONS.find((o) => o.slug === "mpc-pcm")!;
    const a = visibleAliases(mpc.aliases, "MPC / PCM");
    expect(a).not.toContain("MPC");
    expect(a).not.toContain("PCM");
    expect(a.every((x) => /^[\x20-\x7e]+$/.test(x))).toBe(true);
    expect(a.length).toBeLessThanOrEqual(4);
    expect(a.length).toBeGreaterThan(0);
  });

  it("board rows group by board in registry order and drop an unconfirmed row", () => {
    const rows = BOARD_STREAM_COMBINATIONS.filter((r) => r.option === "mpc-pcm");
    const fake = { ...rows[0], board: "fake-board", boardName: "Fake", status: "unconfirmed" as const };
    const groups = groupRowsByBoard([...rows, fake]);
    expect(groups.map((g) => g.board)).toEqual([...new Set(rows.map((r) => r.board))]);
    expect(groups.some((g) => g.board === "fake-board")).toBe(false);
    expect(groups.reduce((n, g) => n + g.rows.length, 0)).toBe(rows.length);
    for (const g of groups) expect(new Set(g.sources.map((s) => s.url)).size).toBe(g.sources.length);
  });

  it("view copy: no digits but class numbers, no salary or ranking word; hi / te fall back to English", () => {
    const strings = Object.values(pathViewCopy("en"));
    expect(strings.filter((t) => strayDigits(t) !== "")).toEqual([]);
    expect(JSON.stringify(strings)).not.toMatch(FORBIDDEN);
    expect(pathViewCopy("hi")).toEqual(pathViewCopy("en"));
    expect(pathViewCopy("te")).toEqual(pathViewCopy("en"));
  });

  it("the exams-after total comes from the level counts, and a failed read prints none", async () => {
    vi.mocked(getExamListRows).mockResolvedValueOnce([] as never);
    expect(await examsAfterTotal("10th")).toBe(0);
    vi.mocked(getExamListRows).mockRejectedValueOnce(new Error("db down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await examsAfterTotal("12th")).toBeNull();
    err.mockRestore();
  });
});

// ── 2. the tutor entry ───────────────────────────────────────────────────

describe("StageTutorEntry", () => {
  const { StageTutorEntry, STAGE_TUTOR_HREF_PREFIX } = load("src/components/paths/StageTutorEntry.tsx") as {
    StageTutorEntry: FC<{ stage: unknown; href: string | null; heading?: boolean }>;
    STAGE_TUTOR_HREF_PREFIX: string;
  };
  const after10 = findStage("after-10th")!;
  const school = findStage("school")!;
  const seeded = stageTutorHref("stage:after-10th")!;

  it("renders the seeded general-tutor link with the button text and the line under it", () => {
    const out = render(StageTutorEntry, { stage: after10, href: seeded });
    expect(seeded.startsWith(STAGE_TUTOR_HREF_PREFIX)).toBe(true);
    expect(out).toContain(`href="${attr(seeded)}"`);
    expect(textOf(out)).toContain("Ask about your options");
    expect(textOf(out)).toContain("AI tutor. It explains; confirm dates and rules on the official site.");
    expect(out).toContain('data-prefetch="off"');
  });

  it("renders nothing for a stage that may include children, a Class 1-7 context, no href or another link shape", () => {
    expect(render(StageTutorEntry, { stage: school, href: seeded })).toBe("");
    expect(stageTutorHref("stage:school")).toBeNull();
    expect(stageTutorHref("stage:after-10th", { fromClass: 7 })).toBeNull();
    expect(render(StageTutorEntry, { stage: after10, href: stageTutorHref("stage:after-10th", { fromClass: 7 }) })).toBe("");
    expect(render(StageTutorEntry, { stage: after10, href: null })).toBe("");
    expect(render(StageTutorEntry, { stage: after10, href: "/chat?examCode=NEET_UG&seed=x" })).toBe("");
    expect(render(StageTutorEntry, { stage: null, href: seeded })).toBe("");
  });

  it("has a compact form for /career-map rows", () => {
    const out = render(StageTutorEntry, { stage: after10, href: seeded, heading: false });
    expect(out).toContain('data-stage-tutor="compact"');
    expect(textOf(out)).toContain("Ask about your options");
  });
});

// ── 3. the hubs ──────────────────────────────────────────────────────────

describe("StageHubView", () => {
  const { StageHubView } = load("src/components/paths/StageHubView.tsx") as {
    StageHubView: FC<{ model: stagePagesMod.StageHubModel; faq?: { q: string; a: string } | null }>;
  };

  it("/after-10th: the blocks in spec order, the computed count, all nine options linked", () => {
    const model = afterTenthModel(FIXTURE_CODES, { examsAfterTotal: 22 });
    const out = render(StageHubView, { model, faq: { q: "Q?", a: "A." } });
    const text = textOf(out);
    expect(text).toContain(model.h1);
    expect(text).toContain(`${STREAM_OPTIONS.length} options after Class 10`);
    for (const s of STREAM_OPTION_SLUGS) expect(out, s).toContain(`href="/schooling/streams/${s}"`);
    const order = ['id="options"', 'id="rules"', 'id="next"', 'data-stage-tutor="box"', 'id="scholarships"', 'id="exams-after"', 'id="in-short"', 'id="sources"'].map((m) => out.indexOf(m));
    expect(order.every((i) => i >= 0), JSON.stringify(order)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    expect(text).toContain("22 listed on Shishya");
    expect(out).toContain('href="/exams/after/10th"');
  });

  it("prints no count beside the exams-after link when the rows were not read", () => {
    const out = render(StageHubView, { model: afterTenthModel(FIXTURE_CODES, { examsAfterTotal: null }) });
    expect(textOf(out)).not.toMatch(/listed on Shishya/);
  });

  it("prints every confirmed rule with its source link and read day, and nothing unconfirmed", () => {
    for (const model of [afterTenthModel(FIXTURE_CODES), afterTwelfthModel(FIXTURE_CODES)]) {
      const out = render(StageHubView, { model });
      const text = textOf(out);
      for (const f of model.facts) {
        expect(text, f.text).toContain(f.text);
        if (f.status === "confirmed") expect(out).toContain(`href="${attr(f.source!.url)}"`);
      }
      for (const s of model.sources) {
        expect(text, s.url).toContain(s.publisher);
        expect(text, s.url).toContain(s.title);
        expect(out, s.url).toContain(`href="${attr(s.url)}"`);
      }
      expect(text.match(/read on 30 Sep 2026/g)!.length).toBeGreaterThanOrEqual(model.sources.length);
      for (const u of unconfirmedTexts()) expect(text, u).not.toContain(u);
    }
  });

  it("exam chips link only live exams; with no live exam every chip is a plain label", () => {
    const live = render(StageHubView, { model: afterTwelfthModel(FIXTURE_CODES) });
    const codes = examHubCodes(live);
    expect(codes.length).toBeGreaterThan(0);
    expect(codes.filter((c) => !FIXTURE_CODES.has(c))).toEqual([]);
    const none = render(StageHubView, { model: afterTwelfthModel(NONE) });
    expect(examHubCodes(none)).toEqual([]);
    expect(textOf(none)).toContain("no Shishya page yet");
  });

  it("scholarships: the computed count, the first rows shown and the rest in <details> in the same HTML", () => {
    const model = afterTwelfthModel(FIXTURE_CODES);
    const out = render(StageHubView, { model });
    const n = model.scholarships.length;
    expect(n).toBeGreaterThan(SCHOLARSHIP_PREVIEW_MAX);
    expect(textOf(out)).toContain(`${n} schemes open at this stage`);
    for (const s of model.scholarships) expect(out).toContain(`href="/scholarships/${s.id}"`);
    expect(textOf(out)).toContain(`Show the other ${n - SCHOLARSHIP_PREVIEW_MAX}`);
    expect(out).toContain('href="/scholarships"');
  });

  it("/after-12th: course rows say which options keep them open; jobs, open learning and abroad rows link their pages", () => {
    const model = afterTwelfthModel(FIXTURE_CODES);
    const out = render(StageHubView, { model });
    // 30 Sep 2026 (review fix): the column also lists the diploma, which is not a Class 11-12 option.
    expect(textOf(out)).toContain("From these options after Class 10");
    expect(textOf(out)).not.toContain("From these Class 11-12 options");
    for (const h of ["/exams/after/12th", "/distance-learning", "/worldwide", "/schooling/streams/mpc-pcm"]) expect(out, h).toContain(`href="${h}"`);
    expect(textOf(out)).toContain(`${model.options.length} paths after Class 12`);
  });

  // 30 Sep 2026 (review fix): a confirmed duration printed in the options
  // table carries its own source link and read day in the cell, as the stream
  // pages do — not only in the Sources list at the foot of the page.
  it("every 'How long' cell with a confirmed duration carries its source link and 'read on 30 Sep 2026'; no other cell says 'read on'", () => {
    for (const model of [afterTenthModel(FIXTURE_CODES), afterTwelfthModel(FIXTURE_CODES)]) {
      const out = render(StageHubView, { model });
      let withSource = 0;
      for (const o of model.options) {
        const row = out.match(new RegExp(`<tr[^>]*data-option="${o.id}"[^>]*>([\\s\\S]*?)</tr>`))?.[1];
        expect(row, `${model.path} ${o.id}`).toBeTruthy();
        if (o.duration?.status === "confirmed" && o.duration.source) {
          withSource++;
          expect(row, `${model.path} ${o.id}`).toContain(`href="${o.duration.source.url.replace(/&/g, "&amp;")}"`);
          expect(textOf(row!).replace(/ ,/g, ","), `${model.path} ${o.id}`).toContain(`${o.duration.source.publisher}, read on 30 Sep 2026`);
        } else {
          expect(textOf(row!), `${model.path} ${o.id}`).not.toContain("read on");
        }
      }
      expect(withSource, model.path).toBeGreaterThan(0);
    }
  });

  it("every link a hub renders opens a page", () => {
    for (const model of [afterTenthModel(FIXTURE_CODES), afterTwelfthModel(FIXTURE_CODES)]) {
      const hrefs = [...render(StageHubView, { model }).matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
      const bad = hrefs.filter((h) => !h.startsWith("/chat?") && !routeExists(h));
      expect(bad).toEqual([]);
    }
  });

  it("carries no salary, ranking word or typed count in its own copy", () => {
    for (const model of [afterTenthModel(FIXTURE_CODES), afterTwelfthModel(FIXTURE_CODES)]) {
      const out = render(StageHubView, { model: { ...model, scholarships: [] } });
      expect(textOf(out)).not.toMatch(FORBIDDEN);
    }
  });
});

describe("/after-10th and /after-12th routes", () => {
  const pages = [
    ["src/app/after-10th/page.tsx", "https://shishya.in/after-10th", "10th"],
    ["src/app/after-12th/page.tsx", "https://shishya.in/after-12th", "12th"],
  ] as const;

  it.each(pages)("%s: metadata (canonical, context.md alternate, indexable, title fits)", (file, canonical) => {
    const page = load(file) as { metadata: Record<string, unknown>; revalidate: number };
    const meta = page.metadata as { title: string; robots?: unknown; alternates: { canonical: string; types: Record<string, string> } };
    expect(meta.alternates.canonical).toBe(canonical);
    expect(meta.alternates.types["text/markdown"]).toBe(`${canonical}/context.md`);
    expect(meta.robots).toBeUndefined(); // indexable today (at least five options open a page)
    expect(meta.title.length).toBeLessThanOrEqual(sectionSeo.TITLE_MAX);
    expect(meta.title).toMatch(/\| Shishya$/);
    expect(page.revalidate).toBe(3600);
  });

  it.each(pages)("%s: renders the view, the JSON-LD and the FAQ it carries, printed visibly", async (file, canonical) => {
    stubTotal = 17;
    const page = load(file) as { default: () => Promise<React.ReactElement> };
    const out = html(await page.default());
    const ld = jsonLdBlocks(out);
    const types = ld.map((d) => d["@type"]);
    expect(types).toEqual(["CollectionPage", "ItemList", "BreadcrumbList", "FAQPage"]);
    expect(ld[1]["@id"]).toBe(`${canonical}#options`);
    const faq = (ld[3] as { mainEntity: Array<{ name: string; acceptedAnswer: { text: string } }> }).mainEntity[0];
    const text = textOf(out);
    expect(text).toContain(faq.name);
    expect(text).toContain(faq.acceptedAnswer.text);
    expect(text).toContain("17 listed on Shishya");
    expect(out).toContain('data-stub="header"');
    expect(JSON.stringify(ld)).not.toMatch(/EducationalOccupationalProgram|salary/i);
  });

  it("the context.md routes serve the page's model with the markdown headers and an HTTP canonical", () => {
    for (const [dir, fn] of [
      ["src/app/after-10th/context.md/route.ts", "afterTenthModel"],
      ["src/app/after-12th/context.md/route.ts", "afterTwelfthModel"],
    ] as const) {
      const src = read(dir);
      expect(src).toContain(`const model = ${fn}(live, { examsAfterTotal });`);
      expect(src).toContain("stageHubContextMarkdown(model, istDay(new Date()))");
      expect(src).toContain("contextMarkdownHeaders(model.canonical)");
      expect(src).toContain("export const revalidate = 3600;");
    }
  });
});

// ── 4. the stream pages ──────────────────────────────────────────────────

describe("StreamOptionView", () => {
  const { StreamOptionView } = load("src/components/paths/StreamOptionView.tsx") as {
    StreamOptionView: FC<{ model: streamPagesMod.StreamPageModel }>;
  };

  it.each(STREAM_OPTION_SLUGS.map((s) => [s]))("%s: H1, confirmed rows only, sources, tutor, siblings", (slug) => {
    const model = streamPageModel(slug, FIXTURE_CODES)!;
    const out = render(StreamOptionView, { model });
    const text = textOf(out);
    expect(text).toContain(model.h1);
    expect(text).toContain(model.lead.whatItIs);
    // Board rows: every confirmed row's subjects, each board's source with its read day.
    for (const r of model.boardTable.rows) expect(text, `${r.board} ${r.localName}`).toContain(r.subjects.join(", "));
    for (const s of model.sources) expect(out, s.url).toContain(attr(s.url));
    // Unconfirmed never printed; unread boards only as "check the official site".
    for (const u of unconfirmedTexts()) expect(text, u).not.toContain(u);
    for (const b of model.boardTable.checks) {
      expect(text).toContain(`Check ${b.boardName}'s official site`);
      expect(out).toContain(`href="${b.url}"`);
    }
    // Tutor: the seeded link for this option; the other eight options and the hub.
    expect(model.tutorHref).not.toBeNull();
    expect(out).toContain(`href="${attr(model.tutorHref!)}"`);
    for (const o of STREAM_OPTION_SLUGS.filter((s) => s !== slug)) expect(out).toContain(`href="/schooling/streams/${o}"`);
    expect(out).toContain('href="/after-10th"');
    // Exams: linked only while live.
    expect(examHubCodes(out).filter((c) => !FIXTURE_CODES.has(c))).toEqual([]);
    expect(text).not.toMatch(FORBIDDEN);
  });

  it("a Class 11-12 option prints the board table; the diploma and ITI have none", () => {
    expect(render(StreamOptionView, { model: streamPageModel("mpc-pcm", FIXTURE_CODES)! })).toContain('id="boards"');
    expect(render(StreamOptionView, { model: streamPageModel("diploma-polytechnic", FIXTURE_CODES)! })).not.toContain('id="boards"');
    expect(render(StreamOptionView, { model: streamPageModel("iti", FIXTURE_CODES)! })).not.toContain('id="boards"');
  });

  it("with no confirmed row the board block prints the pending line and lists nothing", () => {
    const m = streamPageModel("bipc-pcb", FIXTURE_CODES)!;
    const pending = copyMod.pathCopy().boards.pending;
    const out = render(StreamOptionView, { model: { ...m, boardTable: { ...m.boardTable, rows: [], pendingMessage: pending } } });
    expect(textOf(out)).toContain(pending);
    expect(out).not.toContain("data-board=");
    expect(textOf(out)).toContain("Check Andhra Pradesh Board of Intermediate Education's official site");
  });

  it("an unread board appears only as a link to its own site, never beside subjects", () => {
    const m = streamPageModel("mpc-pcm", FIXTURE_CODES)!;
    const out = render(StreamOptionView, { model: m });
    for (const b of BOARD_CHECK_LINKS.filter((x) => x.options.includes("mpc-pcm"))) {
      expect(out).not.toContain(`data-board="${b.board}"`);
      expect(textOf(out).split(b.boardName).length - 1, b.boardName).toBe(1);
    }
  });

  it("a board with many rows starts folded; a short one starts open", () => {
    const out = render(StreamOptionView, { model: streamPageModel("arts-hec-humanities", FIXTURE_CODES)! });
    const groups = groupRowsByBoard(streamPageModel("arts-hec-humanities", FIXTURE_CODES)!.boardTable.rows);
    const long = groups.find((g) => g.rows.length > BOARD_OPEN_MAX)!;
    const short = groups.find((g) => g.rows.length <= BOARD_OPEN_MAX)!;
    expect(out).toMatch(new RegExp(`<details data-board="${long.board}"|<details class="[^"]*" data-board="${long.board}"`));
    expect(out).toMatch(new RegExp(`<details open="" class="[^"]*" data-board="${short.board}"`));
  });

  it("keeps-open and closes lines carry the rule's source", () => {
    const m = streamPageModel("bipc-pcb", FIXTURE_CODES)!;
    const out = render(StreamOptionView, { model: m });
    expect(out).toContain('id="keeps-open"');
    expect(out).toContain('id="closes"');
    for (const l of [...m.keepsOpen, ...m.closes]) if (l.note) expect(textOf(out)).toContain(l.note);
  });

  // 1 Oct 2026 (fix): "What it keeps open" printed CLAT and NDA twice (the
  // exam's line and the course family's line, same rule and source). One
  // item each now: the family line, with the exam as its chip.
  it.each(STREAM_OPTION_SLUGS.map((s) => [s]))("%s: 'What it keeps open' names CLAT and NDA once, on the law and defence lines, with the exam's chip", (slug) => {
    const m = streamPageModel(slug, FIXTURE_CODES)!;
    const out = render(StreamOptionView, { model: m });
    const section = out.match(/<section id="keeps-open"[\s\S]*?<\/section>/)?.[0] ?? "";
    const items = section.split('<li class="text-sm text-ink-800">').slice(1).map(textOf);
    expect(items.length).toBe(m.keepsOpen.length);
    expect(new Set(items).size).toBe(items.length);
    for (const [label, family] of [["CLAT", "course:law"], ["NDA", "course:defence"]] as const) {
      const naming = items.filter((t) => new RegExp(`\\b${label}\\b`).test(t));
      expect(naming.length, `${slug} ${label}`).toBe(m.keepsOpen.some((l) => l.to === family) ? 1 : 0);
    }
    for (const l of m.keepsOpen.filter((x) => x.exams.length > 0)) {
      const item = items.find((t) => t.includes(l.label));
      expect(item, `${slug} ${l.label}`).toBeTruthy();
      for (const c of l.exams) {
        expect(item, `${slug} ${l.label}`).toContain(c.label);
        if (c.href) expect(section).toContain(`href="${c.href}"`);
      }
    }
    if (m.keepsOpen.some((l) => l.to === "course:law")) expect(textOf(section)).toContain("CLAT · no Shishya page yet");
  });
});

describe("/schooling/streams/{option} route", () => {
  const page = load("src/app/schooling/streams/[option]/page.tsx") as {
    generateStaticParams: () => Array<{ option: string }>;
    generateMetadata: (a: { params: Promise<{ option: string }> }) => Promise<Record<string, unknown>>;
    default: (a: { params: Promise<{ option: string }> }) => Promise<React.ReactElement>;
    dynamicParams: boolean;
    revalidate: number;
  };

  it("nine static params, no other segment, hourly", () => {
    expect(page.generateStaticParams()).toEqual(STREAM_OPTION_SLUGS.map((option) => ({ option })));
    expect(page.dynamicParams).toBe(false);
    expect(page.revalidate).toBe(3600);
  });

  it.each(STREAM_OPTION_SLUGS.map((s) => [s]))("%s: robots = schoolRobots(isStreamPageIndexable), canonical, title fits", async (slug) => {
    const meta = (await page.generateMetadata({ params: Promise.resolve({ option: slug }) })) as {
      title: string;
      robots: unknown;
      alternates: { canonical: string; types: Record<string, string> };
    };
    expect(meta.robots).toBe(schoolingData.schoolRobots(isStreamPageIndexable(slug)));
    expect(meta.alternates.canonical).toBe(`https://shishya.in/schooling/streams/${slug}`);
    expect(meta.alternates.types["text/markdown"]).toBe(`https://shishya.in/schooling/streams/${slug}/context.md`);
    expect(meta.title.length).toBeLessThanOrEqual(sectionSeo.TITLE_MAX);
  });

  it("an unknown option is a 404 in the metadata and the page", async () => {
    await expect(page.generateMetadata({ params: Promise.resolve({ option: "science" }) })).rejects.toThrow(NOT_FOUND);
    await expect(page.default({ params: Promise.resolve({ option: "science" }) })).rejects.toThrow(NOT_FOUND);
  });

  it("renders WebPage + EducationalOccupationalProgram (no provider, offers or salary) + BreadcrumbList", async () => {
    const out = html(await page.default({ params: Promise.resolve({ option: "mpc-pcm" }) }));
    const ld = jsonLdBlocks(out);
    expect(ld.map((d) => d["@type"])).toEqual(["WebPage", "BreadcrumbList"]);
    const program = (ld[0] as { mainEntity: Record<string, unknown> }).mainEntity;
    expect(program["@type"]).toBe("EducationalOccupationalProgram");
    expect(program.timeToComplete).toBe("P2Y");
    expect(JSON.stringify(ld)).not.toMatch(/"provider"|"offers"|salary/i);
    expect(textOf(out)).toContain(streamPageModel("mpc-pcm", FIXTURE_CODES)!.h1);
  });

  it("the page file itself names no tutor, sign-in or storage route (the tutor link comes from the registry)", () => {
    const src = read("src/app/schooling/streams/[option]/page.tsx").replace(/^\s*\/\/.*$/gm, "");
    expect(src).not.toMatch(/["'`]\/chat\b|["'`]\/login\b|localStorage|sessionStorage|document\.cookie/);
    expect(src).toMatch(/robots: schoolRobots\(isStreamPageIndexable\(m\.slug\)\)/);
  });

  it("the context.md route: the page's model, confirmed rows only, a plain 404 for another slug", async () => {
    const route = load("src/app/schooling/streams/[option]/context.md/route.ts") as {
      GET: (r: Request, a: { params: Promise<{ option: string }> }) => Promise<Response>;
      generateStaticParams: () => Array<{ option: string }>;
    };
    expect(route.generateStaticParams()).toEqual(STREAM_OPTION_SLUGS.map((option) => ({ option })));
    const miss = await route.GET(new Request("https://shishya.in/x"), { params: Promise.resolve({ option: "science" }) });
    expect(miss.status).toBe(404);
    const hit = await route.GET(new Request("https://shishya.in/x"), { params: Promise.resolve({ option: "commerce-cec-mec" }) });
    expect(hit.status).toBe(200);
    expect(hit.headers.get("content-type")).toMatch(/^text\/markdown/);
    expect(hit.headers.get("link")).toBe('<https://shishya.in/schooling/streams/commerce-cec-mec>; rel="canonical"');
    const md = await hit.text();
    for (const u of unconfirmedTexts()) expect(md, u).not.toContain(u);
    expect(md).toContain("https://shishya.in/schooling/streams/commerce-cec-mec");
  });
});

// ── 5. /schooling/streams stays the parent ───────────────────────────────

describe("/schooling/streams (rendered)", () => {
  const page = load("src/app/schooling/streams/page.tsx") as { default: () => React.ReactElement };
  const out = html(page.default());

  it("keeps its five section ids and adds the nine-option nav under the TL;DR", () => {
    for (const id of ["pcm", "pcb", "pcmb", "commerce", "humanities"]) expect(out).toContain(`id="${id}"`);
    const nav = out.slice(out.indexOf('aria-label="All options after Class 10"'));
    expect(out.indexOf("TL;DR")).toBeLessThan(out.indexOf('aria-label="All options after Class 10"'));
    for (const s of STREAM_OPTION_SLUGS) expect(nav, s).toContain(`href="/schooling/streams/${s}"`);
    expect(textOf(nav)).toContain("MPC / PCM");
    expect(textOf(nav)).toContain("BiPC / PCB");
  });

  it("each section links its own full page (legacy anchor join)", () => {
    for (const o of STREAM_OPTIONS.filter((x) => x.legacyAnchor)) {
      const start = out.indexOf(`id="${o.legacyAnchor}"`);
      const next = out.indexOf("<section", start + 1);
      const section = out.slice(start, next === -1 ? undefined : next);
      expect(section, o.slug).toContain(`href="/schooling/streams/${o.slug}"`);
      expect(textOf(section)).toContain("Full page:");
    }
  });

  it("adds an ItemList of the nine children beside the CollectionPage", () => {
    const ld = jsonLdBlocks(out);
    expect(ld.map((d) => d["@type"])).toEqual(["CollectionPage", "BreadcrumbList", "ItemList"]);
    const items = (ld[2] as { itemListElement: Array<{ url: string }> }).itemListElement;
    expect(items.map((i) => i.url)).toEqual(STREAM_OPTION_SLUGS.map((s) => `https://shishya.in/schooling/streams/${s}`));
  });
});

// ── 6. /career-map ───────────────────────────────────────────────────────

describe("/career-map (rendered)", () => {
  const page = load("src/app/career-map/page.tsx") as { default: () => Promise<React.ReactElement>; metadata: { title: string; description: string } };

  async function rows(): Promise<Map<string, string>> {
    const out = html(await page.default());
    const map = new Map<string, string>();
    const re = /<li id="([a-z0-9-]+)" class="relative/g;
    const starts = [...out.matchAll(re)].map((m) => ({ id: m[1], at: m.index! }));
    starts.forEach((s, i) => map.set(s.id, out.slice(s.at, starts[i + 1]?.at ?? out.indexOf("</ol>", s.at))));
    return map;
  }

  it("runs from Class 1-8 to working life; stage rows use the registry ids", async () => {
    const r = await rows();
    expect([...r.keys()]).toEqual(["school", "class-9-10", "after-10th", "after-12th", "college", "after-graduation", "early-career", "mid-career", "working"]);
    for (const id of PATH_STAGES.map((s) => s.id).filter((id) => id !== "govt-job-prep")) expect(r.has(id), id).toBe(true);
    const out = html(await page.default());
    expect(textOf(out)).toContain(`The full lifecycle — ${r.size} stages`);
    expect(page.metadata.title).toMatch(/Class 1 to Working Life/);
    expect(page.metadata.description).toMatch(/from Class 1 to working life/);
  });

  it("the Class 10 and Class 11-12 rows link the new hubs", async () => {
    const r = await rows();
    expect(r.get("after-10th")).toContain('href="/after-10th"');
    expect(r.get("after-12th")).toContain('href="/after-12th"');
  });

  it("the tutor link sits on the stage rows from after-10th on, never on the Class 1-8 or Class 9-10 rows", async () => {
    const r = await rows();
    for (const id of ["school", "class-9-10", "early-career", "mid-career"]) expect(r.get(id), id).not.toContain("data-stage-tutor");
    for (const id of ["after-10th", "after-12th", "college", "after-graduation", "working"]) {
      expect(r.get(id), id).toContain('data-stage-tutor="compact"');
      expect(r.get(id)).toContain(`href="${attr(stageTutorHref(`stage:${id}`)!)}"`);
    }
    expect(r.get("school")).not.toMatch(/\/chat/);
  });

  it("the Class 1-8 row is content links only; the dropped unsourced hints stay gone", async () => {
    const r = await rows();
    const school = r.get("school")!;
    expect([...school.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual(["/schooling"]);
    const out = html(await page.default());
    expect(textOf(out)).not.toMatch(/lateral entry to BTech|Class 10 entry; trade/i);
  });

  it("every link it renders opens a page (exam hubs only while live)", async () => {
    const out = html(await page.default());
    const hrefs = [...out.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, "&"));
    expect(hrefs.filter((h) => !h.startsWith("/chat?") && !routeExists(h))).toEqual([]);
    expect(examHubCodes(out).filter((c) => !FIXTURE_CODES.has(c))).toEqual([]);
  });
});
