// Shishya Pulse view (27 Sep 2026) — src/lib/pulse-view.ts, plus source
// scans of the Pulse loader, components and routes:
//   1. JSON-LD shape (Article in a CreativeWorkSeries, CollectionPage with an
//      ItemList; dates only, never times; publisher is the site Organization);
//   2. the markdown twin prints only gated rows, with definitions;
//   3. privacy: no people counts leave the gates, no count under 20 in any
//      table, the loader never selects what a student wrote;
//   4. the routes stay static (no cookies / headers / getT), revalidate
//      hourly, and a week that is not published is notFound();
//   5. banned claims: no "#1", best, largest, trusted, leading, testimonial,
//      valuation, crore users, AI-generated in any Pulse file.
// Pure: no DB. Run: npx vitest run tests/unit/pulse-view.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SITE_ORG_ID } from "@/lib/site-description";
import {
  gateExamMocks,
  gateHardestTopics,
  gatePractisedTopics,
  gateSignupSections,
  gateTutorByExam,
  mergeSmallGroups,
  parsePulseSlug,
  pulseArchiveWeeks,
  shiftPulseWeek,
  pulseWeeksLabel,
  type TopicRaw,
} from "@/lib/pulse-rules";
import {
  PULSE_DEFINITIONS,
  PULSE_SERIES_ID,
  countText,
  joinLabels,
  pulseCitation,
  pulseHubLd,
  pulseHubTitle,
  pulseMarkdown,
  pulsePublishedDay,
  pulseWeekLd,
  pulseWeekTitle,
  sparklinePath,
  sparklinePoints,
  type PulseView,
} from "@/lib/pulse-view";

const ROOT = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), "utf8");
const W38 = parsePulseSlug("2026-w38")!;

const topic = (p: Partial<TopicRaw>): TopicRaw => ({ examCode: "TS_POLICE_PC", examName: "TS Police PC", topicCode: "t", topicName: "T", answers: 300, correct: 150, people: 25, ...p });

/** A view built the way the loader builds it — raw rows through the gates —
 *  with small cells that must never surface. */
function sampleView(): PulseView {
  return {
    week: W38,
    windowLabel: pulseWeeksLabel(shiftPulseWeek(W38, -3), W38),
    computedDay: "2026-09-27",
    weekLine: {
      mocks: 485,
      tutor: 267,
      signups: 143,
      prevMocks: 644,
      prevTutor: 416,
      prevSignups: 162,
      series: [
        { slug: "2026-w37", label: "7–13 Sep 2026", mocks: 644, tutor: 416, signups: 162 },
        { slug: "2026-w38", label: "14–20 Sep 2026", mocks: 485, tutor: 267, signups: 143 },
      ],
    },
    examMocks: gateExamMocks([
      { code: "TS_POLICE_PC", name: "TS Police PC", mocks: 116, people: 15, prevMocks: 111, prevPeople: 17 },
      { code: "KA_KPSC_KAS", name: "KA KPSC KAS", mocks: 56, people: 3, prevMocks: 0, prevPeople: 0 },
      { code: "JK_JKSSB", name: "JK JKSSB", mocks: 18, people: 1, prevMocks: 0, prevPeople: 0 },
    ]),
    kindMocks: mergeSmallGroups(
      [
        { key: "government", label: "Government recruitment exams", n: 426, people: 123 },
        { key: "olympiad", label: "Olympiads", n: 35, people: 2 },
        { key: "entrance", label: "Entrance exams", n: 24, people: 10 },
      ],
      20,
      10,
    ),
    practisedTopics: gatePractisedTopics([topic({ topicCode: "analogies", topicName: "Analogies", answers: 362, people: 24 }), topic({ topicCode: "tiny", topicName: "Tiny topic", answers: 40, people: 3 })]),
    // 27 Sep 2026 (fixer review): the table needs PULSE_HARD_MIN_TOPICS (3)
    // qualifying topics, so the fixture carries three.
    hardestTopics: gateHardestTopics([
      topic({ topicCode: "percent", topicName: "Percentage", answers: 243, correct: 104, people: 21 }),
      topic({ topicCode: "analogies", topicName: "Analogies", answers: 362, correct: 182, people: 24 }),
      topic({ topicCode: "geo", topicName: "Geography of India", answers: 246, correct: 195, people: 26 }),
    ]),
    officialDates: [{ day: "2026-09-15", examCode: "SSC_CGL", examName: "SSC CGL", label: "Tier 1 exam begins", url: "https://ssc.gov.in/notice" }],
    tutorByExam: gateTutorByExam([
      { bucket: "TS_POLICE_PC", name: "TS Police PC", questions: 211, people: 46 },
      { bucket: "NDA", name: "NDA", questions: 52, people: 8 },
    ]),
    signupSections: {
      rows: gateSignupSections([
        { section: "government", n: 92 },
        { section: "other", n: 46 },
        { section: "school", n: 5 },
      ]),
      onlySection: null,
    },
  };
}

/** Every key anywhere in a value. */
function keysDeep(v: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(v)) v.forEach((x) => keysDeep(x, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) (out.add(k), keysDeep(x, out));
  return out;
}

/** Every number anywhere in a value, with its key. */
function numbersDeep(v: unknown, key = "", out: [string, number][] = []): [string, number][] {
  if (typeof v === "number") out.push([key, v]);
  else if (Array.isArray(v)) v.forEach((x) => numbersDeep(x, key, out));
  else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) numbersDeep(x, k, out);
  return out;
}

describe("the gated view", () => {
  it("carries no people counts and no count under 20 (week numbers and shares aside)", () => {
    const v = sampleView();
    expect(keysDeep(v).has("people")).toBe(false);
    for (const [k, n] of numbersDeep(v)) {
      if (["year", "week", "sharePct"].includes(k)) continue;
      expect(n, k).toBeGreaterThanOrEqual(20);
    }
  });

  it("small rows never reach the markdown twin", () => {
    const md = pulseMarkdown(sampleView(), pulseArchiveWeeks(new Date("2026-09-27T06:30:00Z")));
    expect(md).toContain("TS Police PC");
    expect(md).not.toContain("KA KPSC KAS");
    expect(md).not.toContain("JK JKSSB");
    expect(md).not.toContain("Tiny topic");
    expect(md).not.toMatch(/\bNDA\b/);
    expect(md).toContain("Olympiads and entrance exams");
    expect(md).toContain("| TS Police PC | Percentage | 243 | 42.8% |");
    // Definitions and the caveat travel with the numbers.
    expect(md).toContain("not a difficulty rating");
    expect(md).toContain("The text of questions is never read for this page.");
    expect(md).toContain("Shishya Pulse, week 38 of 2026 (14–20 Sep 2026), https://shishya.in/pulse/2026-w38, computed 27 Sep 2026.");
    expect(md).toContain("- Shishya Pulse, week 38 of 2026 (14–20 Sep 2026): https://shishya.in/pulse/2026-w38");
    // Dates only: no timestamps (the method's "Monday 00:00 to Sunday 23:59" is the week rule, not a time of anything).
    expect(md).not.toMatch(/T\d{2}:\d{2}|\d{1,2}:\d{2}\s?(am|pm|IST)/i);
  });

  it("a section that could not be read says so; it never prints 0", () => {
    const md = pulseMarkdown({ ...sampleView(), examMocks: null, weekLine: null }, []);
    expect(md).toContain("This could not be computed right now.");
    expect(md).not.toMatch(/\|\s*0\s*\|/);
  });

  it("countText and joinLabels", () => {
    expect(countText(null)).toBe("fewer than 20");
    expect(countText(1464)).toBe("1,464");
    expect(joinLabels(["Olympiads"])).toBe("Olympiads");
    expect(joinLabels(["Olympiads", "Entrance exams"])).toBe("Olympiads and entrance exams");
    expect(joinLabels(["A", "B", "C"])).toBe("A, b and c");
    expect(joinLabels(["Exam lists, calendar and mock-test pages", "Entrance exam and olympiad pages"])).toBe(
      "Exam lists, calendar and mock-test pages; entrance exam and olympiad pages",
    );
  });
});

describe("titles, citation and JSON-LD", () => {
  it("titles say what the page counts", () => {
    expect(pulseWeekTitle(W38)).toBe("Shishya Pulse, week 38 of 2026 (14–20 Sep 2026) — mocks, topics and exam dates");
    expect(pulseHubTitle(W38)).toBe("Shishya Pulse — what students practised in the week of 14–20 Sep 2026");
    expect(pulseCitation(W38, "2026-09-27")).toBe("Shishya Pulse, week 38 of 2026 (14–20 Sep 2026), https://shishya.in/pulse/2026-w38, computed 27 Sep 2026.");
  });

  it("a week is an Article in the Pulse series, published the Monday after it, dates only", () => {
    const ld = pulseWeekLd(W38, "2026-09-27") as Record<string, any>;
    expect(ld["@type"]).toBe("Article");
    expect(ld["@id"]).toBe("https://shishya.in/pulse/2026-w38#article");
    expect(ld.url).toBe("https://shishya.in/pulse/2026-w38");
    expect(ld.mainEntityOfPage).toBe(ld.url);
    expect(ld.datePublished).toBe("2026-09-21");
    expect(pulsePublishedDay(W38)).toBe("2026-09-21");
    expect(ld.dateModified).toBe("2026-09-27");
    expect(ld.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ld.dateModified).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ld.isPartOf).toEqual({ "@id": PULSE_SERIES_ID });
    expect(ld.publisher["@id"]).toBe(SITE_ORG_ID);
    expect(ld.author["@id"]).toBe(SITE_ORG_ID);
    expect(ld.isAccessibleForFree).toBe(true);
    expect(ld.inLanguage).toBe("en-IN");
    // dateModified never precedes datePublished.
    expect((pulseWeekLd(W38, "2026-09-20") as Record<string, any>).dateModified).toBe("2026-09-21");
  });

  it("/pulse is a CollectionPage listing every week, plus the series node", () => {
    const archive = pulseArchiveWeeks(new Date("2026-10-05T12:00:00Z"));
    const [series, page] = pulseHubLd(archive[0], archive) as Record<string, any>[];
    expect(series["@type"]).toBe("CreativeWorkSeries");
    expect(series["@id"]).toBe("https://shishya.in/pulse#series");
    expect(series.publisher["@id"]).toBe(SITE_ORG_ID);
    expect(page["@type"]).toBe("CollectionPage");
    expect(page.url).toBe("https://shishya.in/pulse");
    expect(page.mainEntity["@type"]).toBe("ItemList");
    expect(page.mainEntity.itemListElement.map((i: any) => i.url)).toEqual([
      "https://shishya.in/pulse/2026-w40",
      "https://shishya.in/pulse/2026-w39",
      "https://shishya.in/pulse/2026-w38",
    ]);
    expect(page.mainEntity.itemListElement.map((i: any) => i.position)).toEqual([1, 2, 3]);
    expect(JSON.stringify([series, page])).not.toMatch(/T\d{2}:\d{2}/);
  });
});

describe("sparkline", () => {
  it("draws inside the 120×28 box with the last point last", () => {
    const pts = sparklinePoints([118, 124, 165, 212, 157, 211, 162, 143])!;
    expect(pts).toHaveLength(8);
    for (const p of pts) {
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(120);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(28);
    }
    expect(pts[0].x).toBe(2);
    expect(pts[7].x).toBe(118);
    expect(sparklinePath(pts)).toMatch(/^M2 [\d.]+ L/);
  });

  it("draws nothing when a value was gated or there is one point", () => {
    expect(sparklinePoints([118, null, 165])).toBeNull();
    expect(sparklinePoints([118])).toBeNull();
    expect(sparklinePoints([50, 50, 50])!.every((p) => p.y === 14)).toBe(true);
  });

  it("the component titles itself and hides nothing it draws", () => {
    const src = read("src/components/pulse/PulseSparkline.tsx");
    expect(src).toContain("<title>");
    expect(src).toContain('role="img"');
    expect(src).toContain("aria-label={text}");
  });
});

// ── Source scans ──────────────────────────────────────────────────────

const PULSE_FILES = [
  "src/lib/pulse.ts",
  "src/lib/pulse-rules.ts",
  "src/lib/pulse-view.ts",
  "src/components/pulse/PulseReport.tsx",
  "src/components/pulse/PulseSparkline.tsx",
  "src/app/pulse/page.tsx",
  "src/app/pulse/[week]/page.tsx",
  "src/app/pulse/context.md/route.ts",
];

describe("privacy in the loader", () => {
  const src = read("src/lib/pulse.ts");

  it("never selects what a student wrote (message text, guest messages, replies)", () => {
    expect(src).not.toMatch(/\bcm\.content\b|"content"|\bcontent:/);
    expect(src).not.toMatch(/userMessage|"reply"|\breply\b/);
    expect(src).not.toMatch(/\bprops\b/); // analytics payloads (search text) are never read
  });

  it("reads team accounts by id only, and gates every table before returning", () => {
    expect(src).toContain('SELECT id FROM "User" WHERE lower(email) = ANY(');
    for (const gate of ["gateExamMocks(", "gatePractisedTopics(", "gateHardestTopics(", "gateTutorByExam(", "gateSignupSections(", "mergeSmallGroups(", "guardResiduals(", "gatedCount("]) {
      expect(src, gate).toContain(gate);
    }
    // Only submitted mocks: the nightly cron's ABANDONED rows are never activity.
    expect(src).toContain("('SUBMITTED', 'AUTO_SUBMITTED')");
    expect(src).not.toMatch(/ABANDONED'/);
  });

  it("every exam join is scoped to real exams", () => {
    const joins = src.match(/JOIN "Exam"/g) ?? [];
    expect(joins.length).toBeGreaterThan(0);
    expect((src.match(/\$\{REAL_EXAM_SQL\}/g) ?? []).length).toBeGreaterThanOrEqual(4);
  });
});

describe("routes stay static and refuse unpublished weeks", () => {
  it.each(["src/app/pulse/page.tsx", "src/app/pulse/[week]/page.tsx", "src/app/pulse/context.md/route.ts"])("%s", (file) => {
    const src = read(file);
    expect(src).toMatch(/export const revalidate = 3600;/);
    expect(src).not.toMatch(/\bcookies\(|\bheaders\(\)|\bgetT\(|getUrlLocale\(|\bauth\(\)/);
  });

  // 27 Sep 2026 (fixer review): without generateStaticParams a dynamic
  // segment renders on every request (Cache-Control: private, no-store) and
  // `revalidate` never applies — the exams guide page's 16 Sep finding.
  it("/pulse/[week] is served from the ISR cache: empty generateStaticParams + force-static", () => {
    const src = read("src/app/pulse/[week]/page.tsx");
    expect(src).toMatch(/export function generateStaticParams\(\) \{\s*return \[\];\s*\}/);
    expect(src).toMatch(/export const dynamic = "force-static";/);
  });

  it("a single qualifying topic is never printed as 'the hardest' (table and markdown)", () => {
    const one = { ...sampleView(), hardestTopics: gateHardestTopics([topic({ topicCode: "geo", topicName: "Geography of India", answers: 225, correct: 177, people: 26 })]) };
    expect(one.hardestTopics).toEqual([]);
    const md = pulseMarkdown(one, pulseArchiveWeeks(new Date("2026-09-27T06:30:00Z")));
    expect(md).toContain(PULSE_DEFINITIONS.hardestEmpty);
    expect(md).not.toContain("| Geography of India |");
  });

  it("/pulse/[week] resolves the slug and calls notFound() for anything unpublished", () => {
    const src = read("src/app/pulse/[week]/page.tsx");
    expect(src).toMatch(/const w = resolvePulseWeek\(week, now\);\s*if \(!w\) notFound\(\);/);
  });

  it("the static context.md segment sits beside [week] (Next serves static segments first)", () => {
    expect(fs.existsSync(path.join(ROOT, "src/app/pulse/context.md/route.ts"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "src/app/pulse/[week]/page.tsx"))).toBe(true);
  });
});

describe("no ranking, superlative or boasting claims in any Pulse file", () => {
  const BANNED: [string, RegExp][] = [
    ["#1", /#\s?1\b/],
    ["best", /\bbest\b/i],
    ["largest", /\blargest\b/i],
    ["biggest", /\bbiggest\b/i],
    ["trusted", /\btrusted\b/i],
    // Tailwind's leading-* (line height) is not the word.
    ["leading", /\bleading\b(?![-\w])/i],
    ["testimonial", /testimonial/i],
    ["valuation", /valuation/i],
    ["crore users", /crore\s+(users|students|learners)/i],
    ["AI-generated", /ai[\s-]generated/i],
    ["fastest", /\bfastest\b/i],
  ];
  it.each(PULSE_FILES)("%s", (file) => {
    const src = read(file);
    for (const [name, re] of BANNED) expect(re.test(src), `${file} contains "${name}"`).toBe(false);
  });

  it("the page copy never calls the sample all of India", () => {
    for (const file of PULSE_FILES) expect(read(file), file).not.toMatch(/what India (is )?practis/i);
  });
});
