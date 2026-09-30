// The P1 page models: /after-10th, /after-12th and /schooling/streams/{option}
// (30 Sep 2026, P1 build 1, spec §2 and §7). No DB, no network.
// Run: npx vitest run tests/unit/paths-pages.test.ts
//
// What this pins:
//   1. hub models list their options in registry order, with a computed count
//      in the lead, titles that fit, and the index gate (≥ 5 options that open
//      a page);
//   2. the stream index gate: a Class 11-12 group needs confirmed rows from
//      at least two boards; vocational, diploma, ITI and NIOS need one
//      confirmed official fact; an empty chip fails it;
//   3. nothing unconfirmed is ever in a model — no unconfirmed fact text, no
//      board row for a board not read, which appears only as a link to its
//      own site;
//   4. exam chips link only live codes (a fixture live set);
//   5. every printed fact's source is in the model's source list;
//   6. /schooling/streams keeps its five section ids and links all nine
//      children (source scan; the children nav is agent B's edit);
//   7. the copy carries no salary and no "best / #1 / biggest / largest".

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  BOARD_CHECK_LINKS,
  COURSE_FAMILIES,
  STREAM_OPTIONS,
  STREAM_OPTION_SLUGS,
  careersForFamily,
  confirmedBoardCount,
  courseFamiliesAfter,
  isAllowedSourceUrl,
  type PathFact,
} from "@/data/paths";
import { CAREERS } from "@/data/careers";
import {
  STREAM_INDEX_MIN_CONFIRMED,
  allStreamPageModels,
  indexableStreamSlugs,
  isStreamPageIndexable,
  streamDurationIso,
  streamIndexVerdict,
  streamPageModel,
} from "@/lib/paths/stream-pages";
import {
  STAGE_HUB_MIN_LIVE_OPTIONS,
  afterTenthModel,
  afterTwelfthModel,
  isStageHubIndexable,
  type StageHubModel,
} from "@/lib/paths/stage-pages";
import { examChips } from "@/lib/paths/index-helpers";
import { pathCopy } from "@/lib/paths/copy";
import { strayDigits } from "@/data/paths";
import { TITLE_MAX, DESCRIPTION_MAX } from "@/lib/section-seo";

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const FIXTURE_CODES: ReadonlySet<string> = new Set(
  (JSON.parse(read("tests/fixtures/search-inputs-2026-09-26.json")) as { exams: [string, ...unknown[]][] }).exams.map((e) => e[0]),
);
const NONE: ReadonlySet<string> = new Set();

/** Every unconfirmed text in the registry (must never reach a model). */
function unconfirmedTexts(): string[] {
  const facts: PathFact[] = STREAM_OPTIONS.flatMap((o) => [o.duration, ...o.facts]);
  return facts.filter((f) => f.status === "unconfirmed").map((f) => f.text);
}

function printedFacts(m: { facts: PathFact[] }): PathFact[] {
  return m.facts;
}

/** A page.tsx route for `href` (no backtracking: a static segment beats a
 *  dynamic sibling, as in Next's app router; route groups are transparent). */
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

/** Routes build 1 adds in agent B's files (checked in paths-registry). */
const isBuildOneRoute = (href: string) => /^\/(after-1[02]th|schooling\/streams\/[a-z0-9-]+)$/.test(href.split(/[?#]/)[0]);

// ── 1. hubs ──────────────────────────────────────────────────────────────

describe("stage hub models", () => {
  const ten = afterTenthModel(FIXTURE_CODES, { examsAfterTotal: 22 });
  const twelve = afterTwelfthModel(FIXTURE_CODES);

  it("/after-10th lists the nine options in registry order, each opening its stream page", () => {
    expect(ten.options.map((o) => o.id)).toEqual([...STREAM_OPTION_SLUGS]);
    expect(ten.options.map((o) => o.href)).toEqual(STREAM_OPTION_SLUGS.map((s) => `/schooling/streams/${s}`));
    expect(ten.path).toBe("/after-10th");
    expect(ten.canonical).toBe("https://shishya.in/after-10th");
    expect(ten.h1).toBe("What can I do after Class 10?");
  });

  it("/after-12th lists the course families after Class 12, then government jobs, open learning and study abroad", () => {
    expect(twelve.options.map((o) => o.id)).toEqual([
      ...courseFamiliesAfter("12th").map((f) => f.id),
      "govt-jobs-after-12th",
      "open-learning",
      "study-abroad",
    ]);
    const hrefs = twelve.options.map((o) => o.href);
    expect(hrefs).toContain("/exams/after/12th");
    expect(hrefs).toContain("/distance-learning");
    expect(hrefs).toContain("/worldwide");
    expect(twelve.canonical).toBe("https://shishya.in/after-12th");
    expect(twelve.h1).toBe("What can I do after Class 12?");
  });

  it("course rows name only the options a sourced rule keeps them open from", () => {
    const eng = twelve.options.find((o) => o.id === "engineering")!;
    expect(eng.from.map((f) => f.href).sort()).toEqual(["/schooling/streams/mpc-pcm", "/schooling/streams/pcmb"]);
    // Commerce-pro and design have no rule read: a path, never "from these options".
    expect(twelve.options.find((o) => o.id === "commerce-pro")!.from).toEqual([]);
    expect(twelve.options.find((o) => o.id === "design")!.from).toEqual([]);
  });

  it("the lead carries the computed count; title and description fit", () => {
    for (const m of [ten, twelve]) {
      expect(m.lead.startsWith(`${m.options.length} `)).toBe(true);
      expect(m.description.startsWith(`${m.options.length} `)).toBe(true);
      expect(m.title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(m.title.endsWith(" | Shishya")).toBe(true);
      expect(m.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
    }
    expect(ten.title).toBe("After 10th: Streams, Diploma, ITI and NIOS Options Compared | Shishya");
    expect(twelve.title).toBe("After 12th: Courses, Entrance Exams and Government Jobs | Shishya");
  });

  it("index gate: at least five options that open a page", () => {
    expect(STAGE_HUB_MIN_LIVE_OPTIONS).toBe(5);
    expect(ten.indexable).toBe(true);
    expect(twelve.indexable).toBe(true);
    const cut = (m: StageHubModel, n: number) => ({ options: m.options.map((o, i) => ({ ...o, href: i < n ? o.href : null })) });
    expect(isStageHubIndexable(cut(ten, 4))).toBe(false);
    expect(isStageHubIndexable(cut(ten, 5))).toBe(true);
  });

  it("every link a hub model prints opens a page (build 1's own new routes are pinned in paths-registry)", () => {
    const hrefs = [ten, twelve].flatMap((m) => [
      ...m.options.flatMap((o) => [o.href, ...o.from.map((f) => f.href), ...o.leadsTo.map((l) => l.href)]),
      ...m.next.map((l) => l.href),
      m.examsAfter.href,
    ]).filter((h): h is string => !!h);
    expect(hrefs.filter((h) => !isBuildOneRoute(h) && !routeExists(h))).toEqual([]);
  });

  it("'Exams after' carries the passed-in total, never a typed one", () => {
    expect(ten.examsAfter).toEqual({ href: "/exams/after/10th", label: "Exams you can take after Class 10", total: 22 });
    expect(twelve.examsAfter.total).toBeNull();
    expect(twelve.examsAfter.href).toBe("/exams/after/12th");
  });

  it("each hub has a tutor entry and open scholarships for its stage", () => {
    expect(ten.tutorHref).toMatch(/^\/chat\?general=1&seed=/);
    expect(twelve.tutorHref).toMatch(/^\/chat\?general=1&seed=/);
    for (const s of ten.scholarships) {
      expect(s.closed, s.id).toBeFalsy();
      expect(s.levels.some((l) => l === "CLASS_11_12" || l === "DIPLOMA"), s.id).toBe(true);
    }
    for (const s of twelve.scholarships) expect(s.levels.includes("UG"), s.id).toBe(true);
  });

  it("hub facts are confirmed only, and every one's source is in the source list", () => {
    for (const m of [ten, twelve]) {
      expect(m.facts.length).toBeGreaterThan(0);
      const urls = new Set(m.sources.map((s) => s.url));
      for (const f of printedFacts(m)) {
        expect(f.status).toBe("confirmed");
        expect(urls.has(f.source!.url)).toBe(true);
      }
      for (const s of m.sources) expect(isAllowedSourceUrl(s.url), s.url).toBe(true);
      for (const o of m.options) if (o.duration) expect(o.duration.status).not.toBe("unconfirmed");
    }
  });
});

// ── 2. stream index gate ─────────────────────────────────────────────────

describe("stream page index gate", () => {
  const group = { kind: "class-11-12" as const };

  it("a Class 11-12 group needs confirmed rows from at least two boards", () => {
    expect(STREAM_INDEX_MIN_CONFIRMED).toBe(2);
    expect(streamIndexVerdict({ option: group, confirmedBoards: 0, officialFacts: 9, unlabelledChips: 0 })).toBe(false);
    expect(streamIndexVerdict({ option: group, confirmedBoards: 1, officialFacts: 9, unlabelledChips: 0 })).toBe(false);
    expect(streamIndexVerdict({ option: group, confirmedBoards: 2, officialFacts: 0, unlabelledChips: 0 })).toBe(true);
  });

  it("vocational, diploma, ITI and NIOS need one confirmed official fact", () => {
    for (const kind of ["vocational-11-12", "diploma", "iti", "open-school"] as const) {
      expect(streamIndexVerdict({ option: { kind }, confirmedBoards: 5, officialFacts: 0, unlabelledChips: 0 }), kind).toBe(false);
      expect(streamIndexVerdict({ option: { kind }, confirmedBoards: 0, officialFacts: 1, unlabelledChips: 0 }), kind).toBe(true);
    }
  });

  it("an exam chip with no label fails the gate", () => {
    expect(streamIndexVerdict({ option: group, confirmedBoards: 6, officialFacts: 9, unlabelledChips: 1 })).toBe(false);
  });

  it("the registry's verdicts: the gate as computed, and the sitemap list is the same set", () => {
    for (const o of STREAM_OPTIONS) {
      if (o.kind === "class-11-12") expect(isStreamPageIndexable(o.slug), o.slug).toBe(confirmedBoardCount(o.slug) >= 2);
    }
    expect(indexableStreamSlugs()).toEqual(STREAM_OPTION_SLUGS.filter((s) => isStreamPageIndexable(s)));
    expect(isStreamPageIndexable("not-an-option")).toBe(false);
    expect(streamPageModel("not-an-option", NONE)).toBeNull();
  });
});

// ── 3. nothing unconfirmed ───────────────────────────────────────────────

describe("stream page models — only confirmed facts", () => {
  const models = allStreamPageModels(FIXTURE_CODES);

  it("there is one model per option, in order, with the page's own path and canonical", () => {
    expect(models.map((m) => m.slug)).toEqual([...STREAM_OPTION_SLUGS]);
    for (const m of models) {
      expect(m.path).toBe(`/schooling/streams/${m.slug}`);
      expect(m.canonical).toBe(`https://shishya.in/schooling/streams/${m.slug}`);
      expect(m.h1).toBe(m.option.title);
      expect(m.title.endsWith(" | Shishya") || m.title.length <= TITLE_MAX).toBe(true);
      expect(m.title.length).toBeLessThanOrEqual(TITLE_MAX);
      expect(m.description.length).toBeLessThanOrEqual(DESCRIPTION_MAX);
      expect(m.breadcrumb.map((b) => b[1])).toEqual(["/schooling", "/schooling/streams", m.path]);
      expect(m.indexable).toBe(isStreamPageIndexable(m.slug));
    }
  });

  it("no unconfirmed text appears anywhere in any model (the option inside it included)", () => {
    const texts = unconfirmedTexts();
    expect(texts.length).toBeGreaterThan(0);
    for (const m of models) {
      const json = JSON.stringify(m);
      for (const t of texts) expect(json.includes(t), `${m.slug}: ${t}`).toBe(false);
      expect(m.facts.every((f) => f.status !== "unconfirmed")).toBe(true);
      expect(m.boardTable.rows.every((r) => r.status === "confirmed")).toBe(true);
      if (m.lead.duration) expect(m.lead.duration.status).not.toBe("unconfirmed");
    }
    expect(models.find((m) => m.slug === "nios")!.lead.duration).toBeNull();
  });

  it("an unconfirmed board is only a 'check {board}'s official site' link, never a row", () => {
    const mpc = models.find((m) => m.slug === "mpc-pcm")!;
    const rowBoards = new Set(mpc.boardTable.rows.map((r) => r.board));
    for (const c of mpc.boardTable.checks) {
      expect(rowBoards.has(c.board), c.board).toBe(false);
      expect(c.linkText).toBe(`Check ${c.boardName}'s official site`);
      expect(isAllowedSourceUrl(c.url)).toBe(true);
    }
    expect(mpc.boardTable.checks.map((c) => c.board).sort()).toEqual(["ap-bie", "bihar-bseb", "ka-puc", "mh-ssc-hsc"]);
    for (const b of BOARD_CHECK_LINKS) {
      for (const m of models) expect(m.boardTable.rows.some((r) => r.board === b.board && b.options.includes(m.slug)), `${b.board} ${m.slug}`).toBe(false);
    }
  });

  it("the board table applies to Class 11-12, vocational and NIOS; diploma and ITI have none; pending text only when nothing is confirmed", () => {
    for (const m of models) {
      const applies = !["diploma-polytechnic", "iti"].includes(m.slug);
      expect(m.boardTable.applies, m.slug).toBe(applies);
      expect(m.boardTable.pendingMessage, m.slug).toBe(applies && m.boardTable.rows.length === 0 ? pathCopy("en").boards.pending : null);
      if (!applies) expect(m.boardTable.rows).toEqual([]);
    }
  });

  it("keeps-open and closes lines carry their rule's source; BiPC closes JEE Advanced, B.Tech (NIT system) and B.Arch", () => {
    for (const m of models) {
      for (const l of [...m.keepsOpen, ...m.closes]) {
        if (l.note) expect(l.source && isAllowedSourceUrl(l.source.url), `${m.slug} ${l.to}`).toBe(true);
      }
    }
    const bipc = models.find((m) => m.slug === "bipc-pcb")!;
    expect(bipc.closes.map((l) => l.to).sort()).toEqual(["course:architecture", "course:engineering", "exam:JEE_ADVANCED"]);
    // 30 Sep 2026 (review fix): the lines name what their note covers, not the whole family.
    const label = (to: string) => bipc.closes.find((l) => l.to === to)!.label;
    expect(label("course:engineering")).toBe("B.E./B.Tech at NITs, IIITs and other central institutes (JEE Main)");
    expect(label("course:architecture")).toBe("B.Arch (Council of Architecture rule)");
    expect(models.find((m) => m.slug === "mpc-pcm")!.closes).toEqual([]);
  });

  // 30 Sep 2026 (review fix): a "closes" / "keeps open" line printed the whole
  // course family's name ("Engineering (B.E. / B.Tech)", "Architecture and
  // planning (B.Arch, B.Planning)") while its sourced note covered only part
  // of it, and three pages printed a confirmed fact contradicting their own
  // heading. These pins keep every line within its note.
  describe("edge lines claim no more than their note (review fix)", () => {
    const hasMathsRow = (m: (typeof models)[number]) => m.boardTable.rows.some((r) => r.subjects.some((s) => /\bMathematics\b/.test(s)));
    const prints = (m: (typeof models)[number], re: RegExp) => m.facts.some((f) => re.test(f.text));
    const BPLAN_RULE = /B\.Planning through JEE \(Main\).*stays open only with Mathematics/;

    it("every closes line to a course family carries a narrowing label, never the family's own name", () => {
      for (const m of models) {
        for (const l of m.closes.filter((x) => x.to.startsWith("course:"))) {
          const fam = COURSE_FAMILIES.find((f) => `course:${f.id}` === l.to)!;
          expect(l.label, `${m.slug} ${l.to}`).not.toBe(fam.name);
        }
      }
    });

    it("no closes line names B.Planning on an option with a confirmed row containing Mathematics (MEC, Kerala 36, UP 131, Bihar arts)", () => {
      const withMaths = models.filter(hasMathsRow).map((m) => m.slug);
      // Not vacuous: Commerce and Arts both have such rows and both print the B.Planning rule.
      expect(withMaths).toEqual(expect.arrayContaining(["commerce-cec-mec", "arts-hec-humanities"]));
      for (const m of models) {
        if (!hasMathsRow(m)) continue;
        for (const l of m.closes) expect(l.label, `${m.slug} ${l.to}`).not.toMatch(/Planning/i);
      }
      for (const slug of ["commerce-cec-mec", "arts-hec-humanities"]) expect(prints(models.find((m) => m.slug === slug)!, BPLAN_RULE), slug).toBe(true);
    });

    it("no line names a course the page's own printed facts say is open: BiPC closes only the NIT-system B.Tech (AP EAPCET takes BiPC for B.Tech Biotechnology)", () => {
      const bipc = models.find((m) => m.slug === "bipc-pcb")!;
      expect(prints(bipc, /B\.Tech \(Biotechnology\) take intermediate with Biology, Physics and Chemistry/)).toBe(true);
      for (const l of bipc.closes.filter((x) => /B\.?\s?Tech/i.test(x.label))) expect(l.label).toMatch(/NITs/);
      // B.Planning's closure on BiPC is stated as its sourced rule, not as a heading.
      expect(prints(bipc, BPLAN_RULE)).toBe(true);
      for (const l of [...bipc.closes, ...bipc.keepsOpen]) expect(l.label).not.toMatch(/Planning/i);
    });

    it("a keeps-open line names B.Planning only where the page prints the B.Planning rule and a row has Mathematics", () => {
      for (const m of models) {
        for (const l of m.keepsOpen.filter((x) => /Planning/i.test(x.label))) {
          expect(prints(m, BPLAN_RULE), `${m.slug} prints the B.Planning rule`).toBe(true);
          expect(hasMathsRow(m), `${m.slug} has a Mathematics row`).toBe(true);
        }
      }
    });

    it("the diploma keeps B.Arch open (the COA rule read for it), never 'architecture and planning'", () => {
      const dip = models.find((m) => m.slug === "diploma-polytechnic")!;
      const arch = dip.keepsOpen.find((l) => l.to === "course:architecture")!;
      expect(arch.label).toBe("B.Arch, with Mathematics in the diploma");
      expect(dip.next.families.find((f) => f.id === "architecture")!.name).toBe(arch.label);
      for (const l of dip.keepsOpen) expect(l.label).not.toMatch(/Planning/i);
    });

    it("without Mathematics, defence is the NDA Army wing only — on the line, in the courses list and in the hubs", () => {
      const ten = afterTenthModel(FIXTURE_CODES);
      const twelve = afterTwelfthModel(FIXTURE_CODES);
      const defenceFrom = twelve.options.find((o) => o.id === "defence")!.from.map((f) => f.label);
      for (const slug of ["bipc-pcb", "commerce-cec-mec", "arts-hec-humanities"] as const) {
        const m = models.find((x) => x.slug === slug)!;
        expect(m.keepsOpen.find((l) => l.to === "course:defence")!.label, slug).toBe("NDA Army wing only");
        expect(m.next.families.find((f) => f.id === "defence")!.name, slug).toBe("NDA Army wing only");
        expect(ten.options.find((o) => o.id === slug)!.leadsTo.map((l) => l.label), slug).toContain("NDA Army wing only");
        expect(defenceFrom.find((x) => x.startsWith(pathCopy("en").stream.short[slug])), slug).toBe(`${pathCopy("en").stream.short[slug]} (NDA Army wing only)`);
      }
      expect(defenceFrom).toContain("MPC / PCM");
      expect(defenceFrom).toContain("PCMB");
    });

    it("/after-12th's architecture row names the diploma with its B.Arch-only rule; /after-10th's diploma row never promises B.Planning", () => {
      const twelve = afterTwelfthModel(FIXTURE_CODES);
      const from = twelve.options.find((o) => o.id === "architecture")!.from.map((f) => f.label);
      expect(from).toEqual(["MPC / PCM", "PCMB", "Polytechnic diploma (B.Arch, with Mathematics in the diploma)"]);
      const ten = afterTenthModel(FIXTURE_CODES);
      for (const l of ten.options.find((o) => o.id === "diploma-polytechnic")!.leadsTo) expect(l.label).not.toMatch(/Planning/i);
    });
  });

  // 30 Sep 2026 (review fix): career lists came from whole careers.ts
  // categories — the Arts page listed the architect beside "closes B.Arch",
  // BiPC / Commerce / Arts listed the commercial pilot and merchant navy
  // officer (careers.ts routes: Class 12 PCM), and /after-12th's Design row
  // led to the architect, its Defence row to the merchant navy and police.
  describe("career lists stay inside what the page keeps open (review fix)", () => {
    const careerSlugs = (m: (typeof models)[number]) => m.next.careers.map((c) => c.href.replace("/careers/", ""));

    it("BiPC, Commerce, Arts and vocational never list the commercial pilot, the merchant navy officer or the architect", () => {
      for (const slug of ["bipc-pcb", "commerce-cec-mec", "arts-hec-humanities", "vocational"]) {
        const list = careerSlugs(models.find((m) => m.slug === slug)!);
        expect(list.length, slug).toBeGreaterThan(0);
        for (const bad of ["commercial-pilot", "merchant-navy-officer", "architect"]) expect(list, `${slug} lists ${bad}`).not.toContain(bad);
      }
      // MPC and PCMB keep B.Arch open, so the architect stays there.
      expect(careerSlugs(models.find((m) => m.slug === "mpc-pcm")!)).toContain("architect");
    });

    it("no page lists a career of a course family it closes", () => {
      for (const m of models) {
        const list = new Set(careerSlugs(m));
        for (const l of m.closes.filter((x) => x.to.startsWith("course:"))) {
          const fam = COURSE_FAMILIES.find((f) => `course:${f.id}` === l.to)!;
          for (const c of careersForFamily(fam)) expect(list.has(c.slug), `${m.slug} lists ${c.slug} from closed ${fam.id}`).toBe(false);
        }
      }
    });

    it("the diploma and ITI pages list no B.Tech career (lateral entry to B.Tech is unconfirmed): the diploma family leads to the trade careers", () => {
      const engineering = new Set(CAREERS.filter((c) => c.category === "engineering").map((c) => c.slug));
      for (const slug of ["diploma-polytechnic", "iti"]) {
        for (const c of careerSlugs(models.find((m) => m.slug === slug)!)) expect(engineering.has(c), `${slug} lists ${c}`).toBe(false);
      }
      expect(careerSlugs(models.find((m) => m.slug === "iti")!)).toEqual(CAREERS.filter((c) => c.category === "skilled-trade").map((c) => c.slug));
    });

    it("/after-12th: Design and Defence never lead to the architect, the merchant navy officer or the police constable; Architecture leads to the architect", () => {
      const twelve = afterTwelfthModel(FIXTURE_CODES);
      const leads = (id: string) => twelve.options.find((o) => o.id === id)!.leadsTo.map((l) => l.href);
      for (const id of ["design", "defence"]) {
        for (const bad of ["architect", "merchant-navy-officer", "police-constable", "commercial-pilot"]) expect(leads(id), `${id} → ${bad}`).not.toContain(`/careers/${bad}`);
      }
      expect(leads("defence")).toContain("/careers/armed-forces-officer");
      expect(leads("architecture").filter((h) => h.startsWith("/careers/"))).toEqual(["/careers/architect"]);
    });
  });

  it("a page with no board subject table does not promise 'Subjects' in its title (diploma, ITI)", () => {
    for (const m of models) {
      if (m.boardTable.applies) expect(m.title, m.slug).toMatch(/After 10th — Subjects/);
      else {
        expect(m.title, m.slug).not.toMatch(/Subjects/);
        expect(m.title, m.slug).toMatch(/After 10th — Exams/);
      }
    }
    expect(models.find((m) => m.slug === "iti")!.title).toBe("ITI After 10th — Exams and Careers | Shishya");
    expect(models.find((m) => m.slug === "diploma-polytechnic")!.title).toBe("Polytechnic diploma After 10th — Exams and Careers | Shishya");
  });

  it("every printed fact, board row and edge source is in the page's source list, once", () => {
    for (const m of models) {
      const urls = m.sources.map((s) => s.url);
      expect(new Set(urls).size).toBe(urls.length);
      const need = [
        ...m.facts.map((f) => f.source?.url),
        ...m.boardTable.rows.map((r) => r.source.url),
        ...m.keepsOpen.map((l) => l.source?.url),
        ...m.closes.map((l) => l.source?.url),
        m.lead.duration?.source?.url,
      ].filter((u): u is string => !!u);
      for (const u of need) expect(urls, `${m.slug} ${u}`).toContain(u);
    }
  });

  it("next links run option → course families → college streams → careers, all computed", () => {
    const mpc = models.find((m) => m.slug === "mpc-pcm")!;
    expect(mpc.next.families.map((f) => f.id)).toEqual(COURSE_FAMILIES.filter((f) => f.fromStreams.includes("mpc-pcm")).map((f) => f.id));
    expect(mpc.next.collegeStreams.map((c) => c.href)).toContain("/colleges/stream/engineering");
    expect(mpc.next.careers.length).toBeGreaterThan(0);
    for (const c of mpc.next.careers) expect(c.href).toMatch(/^\/careers\/[a-z0-9-]+$/);
  });

  it("timeToComplete only for a confirmed, fixed duration: P2Y for Class 11-12, P3Y for the diploma, none for ITI and NIOS", () => {
    const iso = Object.fromEntries(STREAM_OPTIONS.map((o) => [o.slug, streamDurationIso(o)]));
    expect(iso).toEqual({
      "mpc-pcm": "P2Y",
      "bipc-pcb": "P2Y",
      pcmb: "P2Y",
      "commerce-cec-mec": "P2Y",
      "arts-hec-humanities": "P2Y",
      vocational: "P2Y",
      "diploma-polytechnic": "P3Y",
      iti: null,
      nios: null,
    });
    expect(streamDurationIso({ kind: "class-11-12", duration: { text: "2 years", status: "unconfirmed", source: null } })).toBeNull();
  });

  it("every stream page has a tutor entry", () => {
    for (const m of models) expect(m.tutorHref, m.slug).toMatch(/^\/chat\?general=1&seed=/);
  });
});

// ── 4. exam chips ────────────────────────────────────────────────────────

describe("exam chips link only live codes", () => {
  it("a code links /exams/{code} only while it is in the live set", () => {
    const chips = examChips(["JEE_MAIN", "CLAT", "NEET_UG"], ["BITSAT"], new Set(["JEE_MAIN"]));
    expect(chips).toEqual([
      { code: "JEE_MAIN", label: "JEE Main", href: "/exams/JEE_MAIN" },
      { code: "CLAT", label: "CLAT", href: null },
      { code: "NEET_UG", label: "NEET UG", href: null },
      { code: null, label: "BITSAT", href: null },
    ]);
  });

  it("with no live exams every chip on every page is a plain label", () => {
    for (const m of allStreamPageModels(NONE)) for (const c of m.exams) expect(c.href, `${m.slug} ${c.label}`).toBeNull();
    for (const o of afterTwelfthModel(NONE).options) for (const c of o.exams) expect(c.href).toBeNull();
  });

  it("with the 26 Sep live set, CLAT / BITSAT / IPMAT stay labels and every link is a live code", () => {
    for (const m of allStreamPageModels(FIXTURE_CODES)) {
      for (const c of m.exams) {
        if (c.href) expect(FIXTURE_CODES.has(c.code!), c.label).toBe(true);
        if (["CLAT", "BITSAT", "IPMAT"].includes(c.label)) expect(c.href).toBeNull();
      }
    }
  });

  it("chips are de-duplicated by label", () => {
    const chips = examChips(["JEE_MAIN", "JEE_MAIN"], ["JEE Main"], NONE);
    expect(chips.length).toBe(1);
  });
});

// ── 5. /schooling/streams stays the parent ───────────────────────────────

describe("/schooling/streams (source scan)", () => {
  const src = read("src/app/schooling/streams/page.tsx");

  it("keeps its five section ids", () => {
    expect(src).toMatch(/id=\{s\.slug\}/);
    for (const id of ["pcm", "pcb", "pcmb", "commerce", "humanities"]) expect(src).toContain(`slug: "${id}"`);
  });

  it("every stream model link opens a page (the nine new option pages are pinned in paths-registry)", () => {
    const hrefs = allStreamPageModels(FIXTURE_CODES).flatMap((m) => [
      ...m.existingPages.map((p) => p.href),
      ...m.next.families.map((f) => f.href),
      ...m.next.collegeStreams.map((c) => c.href),
      ...m.next.careers.map((c) => c.href),
      ...m.keepsOpen.map((l) => l.href),
      ...m.closes.map((l) => l.href),
      ...m.exams.map((c) => c.href),
      ...m.breadcrumb.map((b) => b[1]),
    ]).filter((h): h is string => !!h);
    expect(hrefs.filter((h) => !isBuildOneRoute(h) && !routeExists(h))).toEqual([]);
  });

  it("links all nine option pages from a nav under the TL;DR (agent B's edit, build 1)", () => {
    const why = "agent B (build 1) adds the children nav to src/app/schooling/streams/page.tsx";
    expect(src.includes('aria-label="All options after Class 10"'), why).toBe(true);
    expect(/STREAM_OPTIONS|STREAM_OPTION_SLUGS/.test(src), why).toBe(true);
    expect(/streamPagePath\(|\/schooling\/streams\/\$\{/.test(src), why).toBe(true);
  });
});

// ── 6. copy honesty ──────────────────────────────────────────────────────

describe("path copy", () => {
  const FORBIDDEN = /salary|\bLPA\b|\bbest\b|#1\b|\bbiggest\b|\blargest\b|number one/i;

  it("English copy has no salary and no 'best / #1 / biggest / largest'", () => {
    expect(JSON.stringify(pathCopy("en"))).not.toMatch(FORBIDDEN);
  });

  it("English copy has no digits other than class numbers (every count is {n}, filled from a computed length)", () => {
    const strings: string[] = [];
    const collect = (v: unknown) => {
      if (typeof v === "string") strings.push(v);
      else if (Array.isArray(v)) v.forEach(collect);
      else if (v && typeof v === "object") Object.values(v).forEach(collect);
    };
    collect(pathCopy("en"));
    expect(strings.filter((t) => strayDigits(t) !== "")).toEqual([]);
  });

  it("Hindi and Telugu fall back to English key by key (typed, empty in P1)", () => {
    expect(pathCopy("hi")).toEqual(pathCopy("en"));
    expect(pathCopy("te")).toEqual(pathCopy("en"));
    expect(pathCopy(null)).toEqual(pathCopy("en"));
  });

  it("every stream option has a short name in both vocabularies where it has two", () => {
    const short = pathCopy("en").stream.short;
    for (const s of STREAM_OPTION_SLUGS) expect(short[s].trim().length, s).toBeGreaterThan(0);
    expect(short["mpc-pcm"]).toBe("MPC / PCM");
    expect(short["bipc-pcb"]).toBe("BiPC / PCB");
  });

  it("no page model says salary or 'best'", () => {
    // Scholarship rows carry their own catalogue text; the hubs' own copy is what is checked here.
    const json = JSON.stringify({
      ten: { ...afterTenthModel(NONE), scholarships: [] },
      twelve: { ...afterTwelfthModel(NONE), scholarships: [] },
      streams: allStreamPageModels(NONE),
    });
    expect(json).not.toMatch(FORBIDDEN);
  });
});
