// The life-stage pages' machine files (30 Sep 2026, P1 build 1, spec §7):
// context.md for /after-10th, /after-12th and the nine
// /schooling/streams/{option} pages (src/lib/paths/path-context.ts), their
// JSON-LD (path-jsonld.ts), and the "By life stage" block of /context.md plus
// the new context files it lists (src/lib/section-context.ts).
//
// The builders run as they are, over the real registry and a live-exam
// fixture — no DB, no network. What is pinned (the standing honesty rules):
// every URL is absolute; every printed rule carries its source and read day;
// nothing unconfirmed is printed (an unconfirmed board is only a "check
// {board}'s official site" link); no forbidden claim, no salary, no /chat;
// counts are the lengths of the lists printed.
// Run: npx vitest run tests/unit/paths-context-md.test.ts

import { describe, expect, it } from "vitest";
import {
  BOARD_CHECK_LINKS,
  BOARD_STREAM_COMBINATIONS,
  LABEL_ONLY_EXAM_CODES,
  PATH_EXAMS,
  STAGE_HUB_FACTS,
  STREAM_OPTIONS,
  STREAM_OPTION_SLUGS,
  combinationsFor,
  type PathFact,
} from "@/data/paths";
import { factLine, sourceText, stageHubContextMarkdown, streamOptionContextMarkdown } from "@/lib/paths/path-context";
import {
  PATH_ORG_REF,
  faqPageLd,
  pathBreadcrumbLd,
  pathCollectionPageLd,
  stageHubFaq,
  stageHubItemListLd,
  stageHubJsonLd,
  streamPageJsonLd,
  streamPrerequisite,
  streamProgramLd,
} from "@/lib/paths/path-jsonld";
import { SITE_ORG_ID } from "@/lib/site-description";
import fs from "node:fs";
import path from "node:path";
import { indexableStageHubs } from "@/lib/paths/path-sitemap";
import { afterTenthModel, afterTwelfthModel, type StageHubModel } from "@/lib/paths/stage-pages";
import { allStreamPageModels, streamDurationIso, streamPageModel, type StreamPageModel } from "@/lib/paths/stream-pages";
import { findForbiddenPhrases } from "@/lib/truth-lint";
import {
  CONTEXT_FILE_PATTERNS,
  SECTION_CONTEXT_FILES,
  contextFileLines,
  languagesLine,
  platformContextMarkdown,
  scholarshipLine,
} from "@/lib/section-context";
import { locales } from "@/lib/i18n";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { ALL_STREAMS, COLLEGES, NIRF_SOURCE_YEAR } from "@/lib/colleges-data";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { CAREERS } from "@/data/careers";
import { TEST_PREP, WORLDWIDE_COUNTRIES } from "@/lib/worldwide-data";
import { PERSONAS } from "@/data/personas";
import { INSIGHTS_ARTICLES } from "@/data/insights-articles";

const SITE = "https://shishya.in";
const AS_OF = "2026-09-30";
/** Every code with an Exam row on 26 Sep 2026 is "live" here; CLAT, BITSAT and IPMAT have none. */
const LIVE: ReadonlySet<string> = new Set(PATH_EXAMS.map((e) => e.code).filter((c) => !LABEL_ONLY_EXAM_CODES.includes(c)));

const HUBS: StageHubModel[] = [afterTenthModel(LIVE, { examsAfterTotal: 23 }), afterTwelfthModel(LIVE, { examsAfterTotal: 71 })];
const STREAMS: StreamPageModel[] = allStreamPageModels(LIVE);
const hubMd = HUBS.map((m) => stageHubContextMarkdown(m, AS_OF));
const streamMd = STREAMS.map((m) => streamOptionContextMarkdown(m, AS_OF));
const ALL_MD = [...hubMd, ...streamMd];

/** Every rule the registry keeps but may not print (unconfirmed). */
const UNCONFIRMED_TEXTS: string[] = [
  ...STREAM_OPTIONS.flatMap((o) => [o.duration, ...o.facts]),
  ...Object.values(STAGE_HUB_FACTS).flatMap((f) => [...(f ?? [])]),
]
  .filter((f: PathFact) => f.status === "unconfirmed")
  .map((f) => f.text);

/** Claims the founder forbids on any machine file. */
const CLAIMS = [/#1\b/, /\bbest\b/i, /\bbiggest\b/i, /\blargest\b/i, /\btrusted\b/i, /\bsalar(y|ies)\b/i, /starting salary/i, /\bLPA\b/];

describe("context.md builders run as they are", () => {
  it("every hub and every option page builds, headed by its own H1 and the as-of day", () => {
    expect(HUBS).toHaveLength(2);
    expect(STREAMS.map((m) => m.slug)).toEqual([...STREAM_OPTION_SLUGS]);
    for (const [i, md] of hubMd.entries()) {
      expect(md.startsWith(`# ${HUBS[i].h1} — Shishya life-stage context`)).toBe(true);
      expect(md).toContain(`> Page: ${HUBS[i].canonical} · data as of ${AS_OF} (IST)`);
    }
    for (const [i, md] of streamMd.entries()) {
      expect(md.startsWith(`# ${STREAMS[i].h1} — Shishya stream context`)).toBe(true);
      expect(md).toContain(`> Page: ${STREAMS[i].canonical} · all options after Class 10: ${SITE}/after-10th`);
    }
  });

  it("every line with a URL is absolute — no site-relative path anywhere", () => {
    for (const md of ALL_MD) {
      for (const line of md.split("\n")) {
        expect(line, line).not.toMatch(/(^|[\s(:])\/[a-z0-9]/i);
        for (const u of line.match(/https?:\/\/\S+/g) ?? []) expect(u, line).toMatch(/^https:\/\//);
      }
    }
  });

  it("no forbidden phrase, claim, salary or chat link (the tutor is robots-disallowed; the page carries it)", () => {
    for (const md of ALL_MD) {
      expect(findForbiddenPhrases(md, "context.md")).toEqual([]);
      for (const re of CLAIMS) expect(md, String(re)).not.toMatch(re);
      expect(md).not.toContain("/chat");
    }
  });

  it("nothing unconfirmed is ever printed", () => {
    expect(UNCONFIRMED_TEXTS.length).toBeGreaterThan(0);
    for (const md of ALL_MD) for (const t of UNCONFIRMED_TEXTS) expect(md, t).not.toContain(t);
  });
});

describe("hub context: options, rules with sources, scholarships", () => {
  it("one line per option (name · aliases · URL · leads to), the count computed", () => {
    for (const [i, m] of HUBS.entries()) {
      const md = hubMd[i];
      expect(md).toContain(`## Your options, side by side (${m.options.length})`);
      for (const o of m.options) {
        const line = md.split("\n").find((l) => l.startsWith(`- ${o.name} — `));
        expect(line, o.name).toBeTruthy();
        if (o.href) expect(line).toContain(`${SITE}${o.href}`);
        if (o.aliases.length) expect(line).toContain(`also called ${o.aliases.join(", ")}`);
        for (const l of o.leadsTo) expect(line).toContain(`${l.label} ${SITE}${l.href}`);
      }
    }
  });

  // 30 Sep 2026 (review fix): the course rows' "from" list names only what
  // each sourced rule covers — the diploma keeps B.Arch open (not
  // B.Planning), and without Mathematics only the NDA Army wing — and the
  // column label keeps "Class 10" capitalised.
  it("/after-12th's 'from these options after Class 10' lists carry each option's narrowing label", () => {
    const lines = hubMd[1].split("\n");
    const arch = lines.find((l) => l.startsWith("- Architecture and planning"))!;
    expect(arch).toContain(`from these options after Class 10: MPC / PCM ${SITE}/schooling/streams/mpc-pcm · PCMB ${SITE}/schooling/streams/pcmb · Polytechnic diploma (B.Arch, with Mathematics in the diploma) ${SITE}/schooling/streams/diploma-polytechnic`);
    const def = lines.find((l) => l.startsWith("- Defence officer entry"))!;
    expect(def).toContain(`BiPC / PCB (NDA Army wing only) ${SITE}/schooling/streams/bipc-pcb`);
    expect(def).toContain(`leads to: Armed Forces Officer ${SITE}/careers/armed-forces-officer`);
    expect(def).not.toMatch(/merchant-navy-officer|police-constable|commercial-pilot/);
  });

  it("an exam links its hub only while live; a label-only exam says it has no page yet", () => {
    const md12 = hubMd[1];
    expect(md12).toContain(`JEE Main ${SITE}/exams/JEE_MAIN`);
    expect(md12).toContain("CLAT (no Shishya page yet)");
    expect(md12).not.toContain(`${SITE}/exams/CLAT`);
    const none = stageHubContextMarkdown(afterTwelfthModel(new Set()), AS_OF);
    expect(none).not.toMatch(/https:\/\/shishya\.in\/exams\/[A-Z]/);
  });

  it("every decision fact printed with its source and read day (confirmed only)", () => {
    for (const [i, m] of HUBS.entries()) {
      const md = hubMd[i];
      expect(md).toContain(`## Rules to know before you choose (${m.facts.length})`);
      expect(m.facts.length).toBeGreaterThan(0);
      for (const f of m.facts) {
        expect(f.status).toBe("confirmed");
        expect(md).toContain(factLine(f));
        expect(factLine(f)).toContain(`read on ${f.source!.checkedOn}`);
        expect(factLine(f)).toContain(f.source!.url);
      }
    }
  });

  it("the scholarship lines are /scholarships/context.md's own, open schemes only", () => {
    for (const [i, m] of HUBS.entries()) {
      const md = hubMd[i];
      expect(md).toContain(`## Scholarships open at this stage (${m.scholarships.length})`);
      for (const s of m.scholarships) {
        expect(s.closed ?? null).toBeNull();
        expect(md).toContain(scholarshipLine(s, SITE));
      }
    }
  });

  it("the exams-after line carries the level total only when it was read, and 'Not on Shishya yet' names no URL", () => {
    expect(hubMd[0]).toContain(`- ${SITE}/exams/after/10th (23 exams)`);
    const noTotal = stageHubContextMarkdown(afterTenthModel(LIVE), AS_OF);
    expect(noTotal).toContain(`- ${SITE}/exams/after/10th — `);
    const notYet = hubMd[0].slice(hubMd[0].indexOf("## Not on Shishya yet"));
    expect(notYet.split("\n")[1]).not.toMatch(/https?:|\/courses/);
  });

  it("the sources block lists every source the model prints, each with its read day", () => {
    for (const [i, m] of HUBS.entries()) {
      expect(hubMd[i]).toContain(`## Sources and last checked (${m.sources.length})`);
      for (const s of m.sources) expect(hubMd[i]).toContain(`- ${sourceText(s)}`);
    }
  });
});

describe("stream context: board rows confirmed only, each with its source", () => {
  it("prints every confirmed row of the option and no other option's row", () => {
    for (const [i, m] of STREAMS.entries()) {
      const md = streamMd[i];
      const confirmed = combinationsFor(m.slug, { confirmedOnly: true });
      if (!m.boardTable.applies) {
        expect(md).not.toContain("## Subjects, board by board");
        continue;
      }
      const boards = new Set(confirmed.map((r) => r.board)).size;
      expect(md).toContain(`## Subjects, board by board (${confirmed.length} ${confirmed.length === 1 ? "list" : "lists"} from ${boards} ${boards === 1 ? "board" : "boards"})`);
      for (const r of confirmed) {
        expect(md).toContain(`- ${r.boardName} — ${r.localName}${r.groupCode ? ` (group code ${r.groupCode})` : ""} — subjects as printed: ${r.subjects.join(", ")} — source: ${r.source.url}, read on ${r.source.checkedOn}`);
      }
    }
  });

  it("a board that could not be read appears only as a link to its own site, never with subjects or the reason", () => {
    for (const b of BOARD_CHECK_LINKS) {
      for (const slug of b.options) {
        const i = STREAMS.findIndex((m) => m.slug === slug);
        if (!STREAMS[i].boardTable.applies) continue;
        const md = streamMd[i];
        expect(md).toContain(`- Check ${b.boardName}'s official site: ${b.url}`);
        expect(md).not.toContain(b.reason);
        expect(md).not.toMatch(new RegExp(`- ${b.boardName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} — `));
      }
    }
  });

  it("with no confirmed row the table says it is being checked and lists nothing", () => {
    const m = streamPageModel("mpc-pcm", LIVE)!;
    const md = streamOptionContextMarkdown(m.option, [], AS_OF);
    expect(md).toContain("- Board-wise subject lists are being checked against each board's own documents.");
    expect(md).not.toMatch(/subjects as printed:/);
  });

  it("the spec's (option, rows) form prints only the CONFIRMED rows passed", () => {
    const rows = combinationsFor("bipc-pcb");
    const fake = { ...rows[0], status: "unconfirmed" as const, localName: "NOT A REAL GROUP" };
    const md = streamOptionContextMarkdown({ slug: "bipc-pcb" }, [fake, ...rows.slice(1)], AS_OF);
    expect(md).not.toContain("NOT A REAL GROUP");
    const r = rows[1];
    expect(md).toContain(`- ${r.boardName} — ${r.localName}${r.groupCode ? ` (group code ${r.groupCode})` : ""} — subjects as printed: ${r.subjects.join(", ")}`);
    expect(() => streamOptionContextMarkdown({ slug: "no-such-option" as never }, [], AS_OF)).toThrow();
  });

  it("keeps-open / closes lines carry the rule's source; decision facts and the sources list carry read days", () => {
    for (const [i, m] of STREAMS.entries()) {
      const md = streamMd[i];
      for (const e of [...m.keepsOpen, ...m.closes]) {
        const line = md.split("\n").find((l) => l.startsWith(`- ${e.label}`) && (!e.source || l.includes(e.source.url)));
        expect(line, `${m.slug} → ${e.label}`).toBeTruthy();
      }
      for (const f of m.facts) expect(md).toContain(factLine(f));
      for (const s of m.sources) expect(md).toContain(`- ${sourceText(s)}`);
      expect(md).toContain(`## Sources and last checked (${m.sources.length})`);
    }
  });

  it("every board row the registry marks confirmed has an allowed source (the file prints only those)", () => {
    const printed = BOARD_STREAM_COMBINATIONS.filter((r) => r.status === "confirmed");
    expect(printed.length).toBeGreaterThan(0);
    for (const r of printed) expect(r.source.checkedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("JSON-LD (path-jsonld.ts)", () => {
  const json = (x: unknown) => JSON.stringify(x);

  it("the BreadcrumbList, CollectionPage and publisher mirror src/components/JsonLd.tsx (a .tsx these tests cannot load)", () => {
    expect(pathBreadcrumbLd([["Schooling", "/schooling"], ["Streams", "/schooling/streams"]])).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SITE },
        { "@type": "ListItem", position: 2, name: "Schooling", item: `${SITE}/schooling` },
        { "@type": "ListItem", position: 3, name: "Streams", item: `${SITE}/schooling/streams` },
      ],
    });
    const cp = pathCollectionPageLd({ name: "N", description: "D", path: "/after-10th" }) as Record<string, unknown>;
    expect(cp).toMatchObject({ "@type": "CollectionPage", url: `${SITE}/after-10th`, inLanguage: "en-IN", isAccessibleForFree: true, publisher: PATH_ORG_REF });
    expect(PATH_ORG_REF["@id"]).toBe(SITE_ORG_ID);
    const src = fs.readFileSync(path.join(process.cwd(), "src/components/JsonLd.tsx"), "utf8");
    const body = src.slice(src.indexOf("export function collectionPageLd"));
    for (const k of Object.keys(cp)) expect(body, k).toContain(k.startsWith("@") ? `"${k}"` : `${k}:`);
    expect(src).toContain('export const SHISHYA_ORG_REF = { "@type": "EducationalOrganization", "@id": SITE_ORG_ID, name: "Shishya", url: SITE } as const;');
  });

  it("hub: CollectionPage, ItemList #options (one ListItem per option, absolute URLs), BreadcrumbList; no programme", () => {
    for (const m of HUBS) {
      const ld = stageHubJsonLd(m) as Array<Record<string, unknown>>;
      expect(ld.map((x) => x["@type"])).toEqual(["CollectionPage", "ItemList", "BreadcrumbList"]);
      const list = stageHubItemListLd(m) as { "@id": string; numberOfItems: number; itemListElement: Array<{ position: number; name: string; url?: string }> };
      expect(list["@id"]).toBe(`${m.canonical}#options`);
      expect(list.numberOfItems).toBe(m.options.length);
      expect(list.itemListElement.map((x) => x.name)).toEqual(m.options.map((o) => o.name));
      for (const x of list.itemListElement) if (x.url) expect(x.url).toMatch(/^https:\/\/shishya\.in\//);
      expect(json(ld)).not.toContain("EducationalOccupationalProgram");
    }
  });

  it("FAQPage only when the page passes the Q&A it prints; the answer is built from the options", () => {
    const m = HUBS[0];
    const faq = stageHubFaq(m);
    expect(faq.q).toBe(m.h1);
    expect(faq.a).toContain(`${m.options.length} options`);
    for (const o of m.options) expect(faq.a).toContain(o.shortName);
    const ld = stageHubJsonLd(m, faq) as Array<Record<string, unknown>>;
    expect(ld.map((x) => x["@type"])).toEqual(["CollectionPage", "ItemList", "BreadcrumbList", "FAQPage"]);
    expect(ld[3]).toEqual(faqPageLd([faq]));
    for (const re of CLAIMS) expect(faq.a, String(re)).not.toMatch(re);
  });

  it("stream page: WebPage → EducationalOccupationalProgram, timeToComplete only for a confirmed duration, no provider / offers / salary", () => {
    for (const m of STREAMS) {
      const [page, crumbs] = streamPageJsonLd(m) as Array<Record<string, unknown>>;
      expect(page["@type"]).toBe("WebPage");
      expect(page.url).toBe(m.canonical);
      expect(crumbs["@type"]).toBe("BreadcrumbList");
      const prog = streamProgramLd(m) as Record<string, unknown>;
      expect(page.mainEntity).toEqual(prog);
      expect(prog["@type"]).toBe("EducationalOccupationalProgram");
      expect(prog.alternateName).toEqual([...m.option.aliases]);
      const iso = streamDurationIso(m.option);
      if (iso) expect(prog.timeToComplete).toBe(iso);
      else expect(prog).not.toHaveProperty("timeToComplete");
      for (const k of ["provider", "offers", "salaryUponCompletion", "occupationalCredentialAwarded", "estimatedSalary"]) expect(prog, `${m.slug} ${k}`).not.toHaveProperty(k);
      expect(json(prog)).not.toMatch(/salary|₹|LPA/i);
    }
  });

  it("the entry qualification is stated only where a confirmed fact says it (ITI by trade; NIOS none)", () => {
    expect(streamPrerequisite({ kind: "class-11-12" })).toBe("Class 10 pass");
    expect(streamPrerequisite({ kind: "diploma" })).toBe("Class 10 pass");
    expect(streamPrerequisite({ kind: "iti" })).toBe("Class 8 or Class 10 pass, depending on the trade");
    expect(streamPrerequisite({ kind: "open-school" })).toBeNull();
    const nios = streamProgramLd(STREAMS.find((m) => m.slug === "nios")!);
    expect(nios).not.toHaveProperty("programPrerequisites");
    // NIOS's course length was not read: no timeToComplete either.
    expect(nios).not.toHaveProperty("timeToComplete");
  });
});

describe("/context.md and the context-file lists (section-context.ts)", () => {
  const input = {
    counts: null,
    indianLanguages: INDIAN_LANGUAGE_COUNT,
    exams: null,
    school: null,
    colleges: COLLEGES,
    streams: ALL_STREAMS,
    nirfYear: NIRF_SOURCE_YEAR,
    scholarships: SCHOLARSHIPS,
    careers: CAREERS,
    countries: WORLDWIDE_COUNTRIES,
    testPrep: TEST_PREP,
    personas: PERSONAS,
    insights: INSIGHTS_ARTICLES,
    languages: languagesLine(locales),
  };
  const md = platformContextMarkdown(input, AS_OF);

  it("the hubs' context files are listed exactly while the hubs are indexable; the option-page pattern is listed", () => {
    const hubFiles = SECTION_CONTEXT_FILES.filter((f) => f.path.startsWith("/after-")).map((f) => f.path);
    expect(hubFiles).toEqual(indexableStageHubs().map((m) => `${m.path}/context.md`));
    expect(CONTEXT_FILE_PATTERNS.map((p) => p.pattern)).toContain("/schooling/streams/{option}/context.md");
    for (const l of contextFileLines(SITE)) expect(l).toMatch(/^- https:\/\/shishya\.in\//);
  });

  it("'By life stage' comes after the description and before the School block, with no chat link", () => {
    const at = md.indexOf("## By life stage");
    expect(at).toBeGreaterThan(md.indexOf("> "));
    expect(at).toBeLessThan(md.indexOf("## School"));
    const block = md.slice(at, md.indexOf("\n## ", at + 1));
    for (const m of indexableStageHubs()) {
      expect(block).toContain(`${SITE}${m.path} (context: ${SITE}${m.path}/context.md) — ${m.options.length} `);
    }
    expect(block).toContain(`${SITE}/career-map`);
    expect(md).not.toContain("/chat");
    for (const re of CLAIMS) expect(block, String(re)).not.toMatch(re);
  });
});
