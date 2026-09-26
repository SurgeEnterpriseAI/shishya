// Shishya's public numbers (27 Sep 2026): the rules the /shishya-in-numbers
// page, its context.md and /press share. No DB, no network — the builders
// are fed rows shaped like the prod reads of 27 Sep 2026.
//
// Pins:
//   • the weekly "people who came" column uses the all-time counter's human
//     rule word for word (src/lib/live-counts-server.ts);
//   • only complete ISO weeks and closed cohorts are reported;
//   • every PublicNumber carries a definition and an IST as-of day;
//   • no printed cell under K_MIN; a failed read prints "could not be
//     computed right now", never 0; the team-free account total is never
//     printed (it would reveal how many team accounts there are);
//   • the answer-check method is built from the check's own config;
//   • none of the copy makes a ranking, trust or valuation claim.

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CounterRow, CoverageGroup, PublicNumbers } from "@/lib/public-numbers";
import { DEFAULT_CONFIG } from "@/lib/ai/factory/types";
import { SUPPRESSED } from "@/lib/public-stats";
import {
  DEFINITIONS,
  HUMAN_RULE_HAVING,
  PEOPLE_FIRST_WEEK,
  SIGNUP_SOURCE_FIRST_WEEK,
  aiSourceCount,
  answerCheckMethod,
  buildActives30,
  buildAnswerCheck,
  buildCohortReturns,
  buildNewPeopleSources,
  buildReports,
  buildSignupSources,
  buildWeeklyUsage,
  citationLine,
  humanRuleMissesTaggedSinglePage,
  lastClosedCohortWeek,
  namedSourceCount,
  numbersFaq,
  numbersWindows,
  solvesNeeded,
  type CohortRow,
  type PublicNumber,
} from "@/lib/public-numbers-rules";
import { NOT_COMPUTED_TEXT, cohortTable, headlineTiles, numbersDatasetLd, numbersMarkdown, sourceView, weeklyView } from "@/lib/public-numbers-view";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/** 27 Sep 2026, 00:09 IST — the moment the design's values were read. */
const NOW = new Date("2026-09-26T18:39:27Z");
const WIN = numbersWindows(NOW);

const MONDAYS = ["2026-07-20", "2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07"];
const COHORTS: CohortRow[] = [
  { wk: MONDAYS[0], cohort: 97, ret7: 22, ret30: 17 },
  { wk: MONDAYS[1], cohort: 118, ret7: 31, ret30: 12 },
  { wk: MONDAYS[2], cohort: 124, ret7: 41, ret30: 17 },
  { wk: MONDAYS[3], cohort: 165, ret7: 44, ret30: 27 },
  { wk: MONDAYS[4], cohort: 212, ret7: 60, ret30: 23 },
  { wk: MONDAYS[5], cohort: 157, ret7: 48, ret30: 29 },
  { wk: MONDAYS[6], cohort: 211, ret7: 64, ret30: 29 },
  { wk: MONDAYS[7], cohort: 162, ret7: 41, ret30: 17 },
];

const USAGE_MONDAYS = ["2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14"];
const wkn = (ns: number[]) => ns.map((n, i) => ({ wk: USAGE_MONDAYS[i], n }));

function fullNumbers(): PublicNumbers {
  const counters: PublicNumber<CounterRow[]> = {
    id: "all-time-counters",
    label: "All-time counters",
    value: [
      { key: "totalSignups", label: "Accounts", value: 1909, definition: "User rows (accounts).", people: true },
      { key: "uniqueVisitors", label: "People who came", value: 14527, definition: "Distinct people who came to Shishya.", people: true },
      { key: "liveTestsTaken", label: "Live tests taken", value: 12, definition: "Submitted live-test attempts.", people: true },
      { key: "languages", label: "Languages", value: 19, definition: "Locales the UI serves.", people: false },
    ],
    definition: "The site's live counters.",
    asOf: WIN.today,
    period: "all time",
    source: "getLiveCounts",
  };
  const coverage: PublicNumber<CoverageGroup[]> = {
    id: "coverage",
    label: "What Shishya covers",
    value: [{ title: "Exams and practice", rows: [{ id: "exams", label: "Exams covered", value: 180, definition: "Active real exams." }] }],
    definition: "Counts of what Shishya holds.",
    asOf: WIN.today,
    period: "today",
    source: "Exam",
  };
  return {
    today: WIN.today,
    cohorts: buildCohortReturns(COHORTS, WIN),
    actives: buildActives30({ accounts: 1908, active30: 821, active30After: 312 }, WIN),
    weekly: buildWeeklyUsage(
      {
        signups: wkn([118, 124, 165, 212, 157, 211, 162, 143]),
        mocks: wkn([396, 247, 526, 589, 426, 660, 644, 485]).map((r) => ({ ...r, takers: 133 })),
        tutor: wkn([288, 254, 512, 538, 384, 497, 416, 267]),
        actives: wkn([141, 165, 216, 268, 213, 288, 257, 217]),
        people: wkn([0, 0, 0, 2009, 1233, 1650, 1640, 1464]),
      },
      WIN,
    ),
    signupSources: buildSignupSources(
      [
        { fam: "ai", n: 106 },
        { fam: "search", n: 21 },
        { fam: "direct", n: 15 },
        { fam: "other", n: 1 },
      ],
      WIN,
    ),
    newPeople: buildNewPeopleSources(
      [
        { fam: "ai", n: 1598 },
        { fam: "search", n: 1626 },
        { fam: "direct", n: 339 },
        { fam: "email", n: 24 },
        { fam: "social", n: 21 },
        { fam: "other", n: 2 },
      ],
      WIN,
    ),
    answerCheck: buildAnswerCheck(
      {
        checked: 37849,
        accepted: 33347,
        keyCorrected: 1196,
        withdrawn: 3306,
        liveBefore: 36690,
        liveKept: 32322,
        liveCorrected: 1172,
        liveWithdrawn: 3196,
        lastCheckDay: "2026-09-26",
        uncheckedLive: 157,
        uncheckedExams: 55,
      },
      WIN.today,
    ),
    reports: buildReports(72, 72, WIN.today),
    counters,
    coverage,
  };
}

const EMPTY: PublicNumbers = {
  today: WIN.today,
  cohorts: null,
  actives: null,
  weekly: null,
  signupSources: null,
  newPeople: null,
  answerCheck: null,
  reports: null,
  counters: null,
  coverage: null,
};

const BANNED: RegExp[] = [/#1\b/, /\bbest\b/i, /\blargest\b/i, /\btrusted\b/i, /\bleading\b(?!-)/i, /testimonial/i, /valuation/i, /crore users/i, /AI-generated/i, /\bexpert/i];

describe("the human rule is the counter's, word for word", () => {
  it("live-counts-server.ts carries HUMAN_RULE_HAVING (whitespace aside)", () => {
    expect(squash(read("src/lib/live-counts-server.ts"))).toContain(squash(HUMAN_RULE_HAVING));
  });

  it("the tagged-link footnote shows exactly while the rule has no utm clause", () => {
    expect(humanRuleMissesTaggedSinglePage(HUMAN_RULE_HAVING)).toBe(!HUMAN_RULE_HAVING.includes("utmSource"));
    expect(humanRuleMissesTaggedSinglePage(`HAVING COUNT(*) >= 2 OR (COUNT(*) = 1 AND bool_or("utmSource" IS NOT NULL))`)).toBe(false);
  });
});

describe("windows", () => {
  it("reports complete weeks and closed cohorts only (27 Sep 2026, 00:09 IST)", () => {
    expect(WIN.today).toBe("2026-09-27");
    expect(WIN.usageWeeks.map((w) => w.slug)).toEqual(["2026-w31", "2026-w32", "2026-w33", "2026-w34", "2026-w35", "2026-w36", "2026-w37", "2026-w38"]);
    expect(WIN.cohortWeeks[0].slug).toBe("2026-w30");
    expect(WIN.cohortWeeks[WIN.cohortWeeks.length - 1].slug).toBe("2026-w37");
    expect(WIN.pooled7Weeks.map((w) => w.slug)).toEqual(["2026-w34", "2026-w35", "2026-w36", "2026-w37"]);
    expect(WIN.pooled30Weeks.map((w) => w.slug)).toEqual(["2026-w31", "2026-w32", "2026-w33", "2026-w34"]);
    expect(WIN.signupSourceWeeks.map((w) => w.slug)).toEqual([SIGNUP_SOURCE_FIRST_WEEK]);
    expect(WIN.newPeopleWeeks.map((w) => w.slug)).toEqual(["2026-w35", "2026-w36", "2026-w37", "2026-w38"]);
  });

  it("a cohort closes only after its last member's window has passed", () => {
    // Week 38 (14–20 Sep): its last sign-up's 7 days run to 27 Sep — not closed on 27 Sep.
    expect(lastClosedCohortWeek(NOW, 7).slug).toBe("2026-w37");
    expect(lastClosedCohortWeek(new Date("2026-09-27T18:30:00Z"), 7).slug).toBe("2026-w38");
    expect(lastClosedCohortWeek(NOW, 30).slug).toBe("2026-w34");
  });

  it("never reports sign-up sources or people before their first comparable week", () => {
    const early = numbersWindows(new Date("2026-09-10T06:00:00Z"));
    expect(early.signupSourceWeeks).toEqual([]);
    expect(buildSignupSources([{ fam: "ai", n: 50 }], early)).toBeNull();
    const w = numbersWindows(new Date("2026-08-26T06:00:00Z"));
    expect(w.newPeopleWeeks.map((x) => x.slug)).toEqual([PEOPLE_FIRST_WEEK]);
  });
});

describe("builders", () => {
  const p = fullNumbers();

  it("reproduce the design's pooled values", () => {
    expect(p.cohorts?.within7.value).toMatchObject({ num: 213, den: 742 });
    expect(p.cohorts?.days8to30.value).toMatchObject({ num: 79, den: 619 });
    expect(p.cohorts?.within7.period).toBe("sign-up weeks 17 Aug–13 Sep 2026");
    expect(p.signupSources?.value).toMatchObject({ total: 143, named: 128, ai: 106 });
    expect(p.signupSources?.value.groups.map((g) => g.n)).toEqual([106, 37]);
  });

  it("every PublicNumber has a definition and an IST as-of day", () => {
    const all: PublicNumber<unknown>[] = [
      p.cohorts!.within7,
      p.cohorts!.days8to30,
      p.cohorts!.weekly,
      p.actives!.all,
      p.actives!.afterSignupDay,
      p.weekly!.weeks,
      p.weekly!.mocksPerActive,
      p.signupSources!,
      p.newPeople!,
      p.answerCheck!,
      p.reports!,
    ];
    for (const n of all) {
      expect(n.definition.length, n.id).toBeGreaterThan(20);
      expect(n.asOf, n.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(n.period.length, n.id).toBeGreaterThan(0);
      expect(n.id).toMatch(/^[a-z0-9-]+$/);
    }
    expect(new Set(all.map((n) => n.id)).size).toBe(all.length);
  });

  it("the weekly table hides people-who-came before its first comparable week", () => {
    const rows = p.weekly!.weeks.value;
    expect(rows.slice(0, 3).map((r) => r.peopleWhoCame)).toEqual([null, null, null]);
    expect(rows[3].peopleWhoCame).toBe(2009);
    const v = weeklyView(p.weekly!);
    expect(v.rows[0].cells.peopleWhoCame).toBe(SUPPRESSED);
    expect(v.rows[7].cells.mocksPerActive).toBe("2.24");
    expect(v.series.peopleWhoCame.slice(0, 3)).toEqual([null, null, null]);
    expect(p.weekly!.mocksPerActive.value).toMatchObject({ week: "2026-w38", mocks: 485, actives: 217 });
  });

  it("suppresses small groups everywhere they are printed", () => {
    const small = buildCohortReturns(
      [{ wk: "2026-08-17", cohort: 30, ret7: 5, ret30: 2 }],
      WIN,
    );
    const tiles = headlineTiles({ ...EMPTY, cohorts: small });
    expect(tiles[0].value).toBe(SUPPRESSED);
    expect(tiles[0].sub).not.toMatch(/\b5\b/);
    const md = numbersMarkdown({ ...EMPTY, cohorts: small });
    expect(md).not.toMatch(/\| 5 \|/);
  });

  it("the answer-check method comes from the check's own config", () => {
    expect(solvesNeeded()).toBe(2);
    const m = answerCheckMethod();
    expect(m).toContain(`solved ${DEFAULT_CONFIG.solveRuns} times`);
    expect(m).toContain(`at least ${Math.round(DEFAULT_CONFIG.minVerifyConfidence * 100)}% confidence`);
    expect(m).toContain("2 of the 3 solves");
    expect(m).toContain("automated, not a human audit");
    expect(answerCheckMethod({ solveRuns: 5, minAgreement: 0.6, minVerifyConfidence: 0.9 })).toContain("3 of the 5 solves");
  });
});

describe("printed output", () => {
  const p = fullNumbers();
  const md = numbersMarkdown(p);

  it("prints every headline with its definition, period and the citation line", () => {
    expect(md).toContain("28.7%");
    expect(md).toContain("213 of 742 accounts");
    expect(md).toContain("12.8%");
    expect(md).toContain(DEFINITIONS.cameBack7);
    expect(md).toContain(DEFINITIONS.signupSources);
    expect(md).toContain(citationLine(WIN.today));
    expect(citationLine(WIN.today)).toBe("Shishya, “Shishya in numbers”, https://shishya.in/shishya-in-numbers, as of 27 Sep 2026.");
    expect(md).toContain("Search engines + Direct or unknown + Other websites");
  });

  it("never prints the team-free account total (it would reveal the team's size)", () => {
    expect(md).not.toContain("1,908");
    const faq = numbersFaq({ today: WIN.today, accounts: 1909, cohorts: p.cohorts, actives: p.actives, signupSources: p.signupSources, answerCheck: p.answerCheck });
    expect(faq.map(([, a]) => a).join(" ")).not.toContain("1,908");
    expect(JSON.stringify(numbersDatasetLd(p))).not.toContain("1908");
  });

  it("gates people counters at K_MIN but prints supply counters as they are", () => {
    expect(md).toContain("- Live tests taken: —.");
    expect(md).toContain("- Languages: 19.");
    expect(JSON.stringify(numbersDatasetLd(p))).not.toContain("Live tests taken");
  });

  it("prints 'could not be computed right now' for a failed read, never a zero", () => {
    const e = numbersMarkdown(EMPTY);
    expect(e).toContain(NOT_COMPUTED_TEXT);
    expect(e).not.toMatch(/: 0\b/);
    const faq = numbersFaq({ today: WIN.today, accounts: null, cohorts: null, actives: null, signupSources: null, answerCheck: null });
    expect(faq).toHaveLength(3);
    expect(faq[2][1]).toContain("could not be computed right now");
  });

  it("the Dataset JSON-LD names the organisation, the date and a markdown download", () => {
    const ld = numbersDatasetLd(p) as Record<string, unknown>;
    expect(ld["@type"]).toBe("Dataset");
    expect(ld.dateModified).toBe("2026-09-27");
    expect(ld.temporalCoverage).toBe("2026-07-20/2026-09-20");
    expect(ld).not.toHaveProperty("license");
    expect(JSON.stringify(ld)).toContain("https://shishya.in/shishya-in-numbers/context.md");
    expect((ld.variableMeasured as unknown[]).length).toBeGreaterThan(5);
  });

  it("makes no ranking, trust or valuation claim", () => {
    const faq = numbersFaq({ today: WIN.today, accounts: 1909, cohorts: p.cohorts, actives: p.actives, signupSources: p.signupSources, answerCheck: p.answerCheck });
    const text = [md, ...faq.flat(), JSON.stringify(numbersDatasetLd(p)), ...Object.values(DEFINITIONS)].join("\n");
    for (const re of BANNED) expect(text, String(re)).not.toMatch(re);
    expect(text).not.toMatch(/reviewed by a (human|person)/i);
    expect(text).not.toMatch(/error rate/i);
  });
});

// 27 Sep 2026 (fixer review): a subset printed beside its total must not give
// back a merged-away group by subtraction, and the 30-day headline must not
// count an account as active just for signing up.
describe("no small group comes back by subtraction", () => {
  const p = fullNumbers();
  const ss = p.signupSources!;

  it("week 38: Direct or unknown (15) is merged, so 'Named source' is not printed anywhere", () => {
    expect(ss.value.groups.map((g) => g.label)).toEqual(["AI assistants", "Search engines + Direct or unknown + Other websites"]);
    expect(namedSourceCount(ss.value)).toBeNull();
    expect(sourceView(ss).named).toBeNull();
    const md = numbersMarkdown(p);
    const faq = numbersFaq({ today: WIN.today, accounts: 1909, cohorts: p.cohorts, actives: p.actives, signupSources: ss, answerCheck: p.answerCheck });
    const text = [md, ...faq.flat(), JSON.stringify(numbersDatasetLd(p))].join("\n");
    expect(text).not.toMatch(/\b128 of 143\b/);
    expect(text).not.toContain("89.5%");
    expect(text).not.toMatch(/named its source/);
  });

  it("the AI line is printed when AI assistants are a group of their own, and never when merged", () => {
    expect(aiSourceCount(ss.value)).toBe(106);
    expect(sourceView(ss).ai).toBe("106 of 143 (74.1%)");
    const merged = buildSignupSources(
      [
        { fam: "ai", n: 25 },
        { fam: "direct", n: 5 },
        { fam: "search", n: 50 },
      ],
      WIN,
    )!;
    expect(merged.value.groups.map((g) => [g.label, g.n])).toEqual([
      ["Search engines", 50],
      ["AI assistants + Direct or unknown", 30],
    ]);
    expect(aiSourceCount(merged.value)).toBeNull();
    expect(sourceView(merged).ai).toBeNull();
    expect(JSON.stringify(numbersDatasetLd({ ...p, signupSources: merged }))).not.toContain("Sign-ups arriving from AI assistants");
    expect(JSON.stringify(numbersDatasetLd(p))).toContain("Sign-ups arriving from AI assistants");
  });

  it("'Named source' prints when Direct or unknown is its own group of 20+, or empty", () => {
    const big = buildSignupSources(
      [
        { fam: "ai", n: 106 },
        { fam: "search", n: 21 },
        { fam: "direct", n: 22 },
      ],
      WIN,
    )!;
    expect(sourceView(big).named).toBe("127 of 149 (85.2%)");
    const none = buildSignupSources([{ fam: "ai", n: 60 }, { fam: "search", n: 40 }], WIN)!;
    expect(sourceView(none).named).toBe("100 of 100 (100.0%)");
  });

  it("randomised: no subset line lets total − subset fall in 1..19, or split a merged group", () => {
    let seed = 7;
    const rnd = (n: number) => {
      seed = (seed * 48271) % 2147483647;
      return seed % n;
    };
    const fams = ["ai", "search", "social", "email", "other", "direct"] as const;
    for (let t = 0; t < 500; t++) {
      const rows = fams.map((fam) => ({ fam, n: rnd(4) === 0 ? 0 : rnd(60) }));
      const s = buildSignupSources(rows, WIN)!;
      const total = s.value.total;
      for (const n of [namedSourceCount(s.value), aiSourceCount(s.value)]) {
        if (n === null) continue;
        const rest = total - n;
        expect(rest === 0 || rest >= 20, JSON.stringify(rows)).toBe(true);
        expect(n, JSON.stringify(rows)).toBeGreaterThanOrEqual(20);
      }
      const ai = aiSourceCount(s.value);
      if (ai !== null) expect(s.value.groups.some((g) => g.keys.length === 1 && g.keys[0] === "ai")).toBe(true);
    }
  });

  it("the cohort table hides 'came back' when the ones who did not are under 20", () => {
    const c = buildCohortReturns([{ wk: "2026-09-07", cohort: 40, ret7: 30, ret30: 0 }], WIN);
    const row = cohortTable(c).find((r) => r.week === "2026-w37")!;
    expect(row.signups).toBe("40");
    expect(row.returned).toBe(SUPPRESSED);
    expect(row.share).toBe(SUPPRESSED);
  });

  it("the 30-day headline is activity after the sign-up day; the sign-up-day figure is a labelled share only", () => {
    const tile = headlineTiles(p).find((t) => t.id === "active-30-days")!;
    expect(tile.label).toBe("Active in the last 30 days, on a day after signing up");
    expect(tile.value).toBe("16.4%");
    expect(tile.sub).toContain("312 accounts");
    expect(tile.sub).toContain("counting the sign-up day too");
    expect(tile.sub).toContain("43.0%");
    expect(tile.sub).not.toContain("821");
    expect(tile.definition).toContain("Signing up alone does not count.");
    expect(DEFINITIONS.active30).toContain("counts here just for signing up");
    const faq = numbersFaq({ today: WIN.today, accounts: 1909, cohorts: p.cohorts, actives: p.actives, signupSources: ss, answerCheck: p.answerCheck });
    const usage = faq[0][1];
    expect(usage).toContain("312 accounts (16.4% of all accounts)");
    expect(usage).not.toMatch(/821 accounts/);
    expect(usage.indexOf("16.4%")).toBeLessThan(usage.indexOf("43.0%"));
    const ld = JSON.stringify(numbersDatasetLd(p));
    expect(ld).toContain("Active in the last 30 days, on a day after signing up");
    expect(ld).toContain('"value":16.4');
  });
});
