// Shishya Pulse rules (27 Sep 2026) — src/lib/pulse-rules.ts.
//   1. IST ISO weeks: bounds, labels, slugs, year edges, the IST midnight edge;
//   2. which weeks are published (invalid, before the first, current and
//      future weeks answer 404) and the archive list;
//   3. the privacy gates: no printed count under 20, exam and tutor rows
//      need 10 different people, merging, the differencing guard;
//   4. the exam-kind SQL twin agrees with examKind(); the landing-path map.
// Pure: no DB. Run: npx vitest run tests/unit/pulse-rules.test.ts

import { describe, expect, it } from "vitest";
import { ENTRANCE_EXCEPTION_CODES, STATE_CET_CODES, examKind } from "@/lib/exam-kind";
import {
  ENTRANCE_CATEGORY_VALUES,
  PULSE_FIRST_WEEK,
  PULSE_HARD_MIN_TOPICS,
  PULSE_K,
  examKindSqlCase,
  gateExamMocks,
  gateHardestTopics,
  gatePractisedTopics,
  gateSignupSections,
  gateTutorByExam,
  gatedCount,
  guardResiduals,
  keySetId,
  labelSaysExpected,
  lastCompletePulseWeek,
  mergeSmallGroups,
  parsePulseSlug,
  pulseArchiveWeeks,
  pulseKindOf,
  pulseSectionOfPath,
  pulseSitemapEntries,
  pulseWeekFromParts,
  pulseWeekOf,
  pulseWeeksLabel,
  resolvePulseWeek,
  shiftPulseWeek,
  type TopicRaw,
} from "@/lib/pulse-rules";

const at = (iso: string) => new Date(iso);

describe("IST ISO weeks", () => {
  it("week 39 of 2026 is Monday 21 to Sunday 27 Sep, starting 18:30Z on the Sunday before", () => {
    const w = pulseWeekOf(at("2026-09-27T12:00:00Z"));
    expect(w).toEqual({
      year: 2026,
      week: 39,
      slug: "2026-w39",
      startIso: "2026-09-20T18:30:00.000Z",
      endIso: "2026-09-27T18:30:00.000Z",
      startDay: "2026-09-21",
      endDay: "2026-09-27",
      label: "21–27 Sep 2026",
    });
  });

  it("turns over at 00:00 IST on Monday, not at UTC midnight", () => {
    expect(pulseWeekOf(at("2026-09-20T18:29:59.999Z")).slug).toBe("2026-w38");
    expect(pulseWeekOf(at("2026-09-20T18:30:00.000Z")).slug).toBe("2026-w39");
    // 23:00 UTC Sunday is already Monday 04:30 IST.
    expect(pulseWeekOf(at("2026-09-27T23:00:00Z")).slug).toBe("2026-w40");
  });

  it("labels weeks that cross a month or a year", () => {
    expect(PULSE_FIRST_WEEK.label).toBe("14–20 Sep 2026");
    expect(pulseWeekFromParts(2026, 40)!.label).toBe("28 Sep–4 Oct 2026");
    expect(pulseWeekFromParts(2026, 53)!.label).toBe("28 Dec 2026–3 Jan 2027");
  });

  it("follows ISO years (the week of 4 January is week 1)", () => {
    expect(pulseWeekOf(at("2027-01-01T06:00:00Z")).slug).toBe("2026-w53");
    expect(pulseWeekOf(at("2024-12-30T06:00:00Z")).slug).toBe("2025-w01");
    expect(pulseWeekFromParts(2026, 53)).not.toBeNull(); // 1 Jan 2026 was a Thursday
    expect(pulseWeekFromParts(2025, 53)).toBeNull();
    expect(pulseWeekFromParts(2027, 53)).toBeNull();
    expect(pulseWeekFromParts(2026, 0)).toBeNull();
  });

  it("shifts by whole weeks across years and months", () => {
    expect(shiftPulseWeek(PULSE_FIRST_WEEK, 1).slug).toBe("2026-w39");
    expect(shiftPulseWeek(PULSE_FIRST_WEEK, -38).slug).toBe("2025-w52");
    expect(shiftPulseWeek(pulseWeekFromParts(2026, 53)!, 1).slug).toBe("2027-w01");
  });

  it("parses only the canonical slug", () => {
    expect(parsePulseSlug("2026-w38")?.startDay).toBe("2026-09-14");
    for (const bad of ["2026-W38", "2026-w5", "2026w38", "2026-w038", "2026-w54", "2026-w00", "1999-w10", "../2026-w38", "2026-w38 ", "", "context.md"]) {
      expect(parsePulseSlug(bad), bad).toBeNull();
    }
  });

  it("labels a span of weeks from the first Monday to the last Sunday", () => {
    const w = pulseWeekFromParts(2026, 38)!;
    expect(pulseWeeksLabel(shiftPulseWeek(w, -3), w)).toBe("24 Aug–20 Sep 2026");
  });
});

describe("published weeks", () => {
  const sunNoon = at("2026-09-27T06:30:00Z"); // Sun 27 Sep, 12:00 IST

  it("the last complete week is the week before the current one", () => {
    expect(lastCompletePulseWeek(sunNoon).slug).toBe("2026-w38");
    expect(lastCompletePulseWeek(at("2026-09-27T18:30:00Z")).slug).toBe("2026-w39");
  });

  it("resolves published weeks and refuses the rest (the page answers 404)", () => {
    expect(resolvePulseWeek("2026-w38", sunNoon)?.label).toBe("14–20 Sep 2026");
    expect(resolvePulseWeek("2026-w39", sunNoon)).toBeNull(); // current week, not complete
    expect(resolvePulseWeek("2026-w39", at("2026-09-27T18:29:59Z"))).toBeNull();
    expect(resolvePulseWeek("2026-w39", at("2026-09-27T18:30:00Z"))?.slug).toBe("2026-w39");
    expect(resolvePulseWeek("2026-w40", sunNoon)).toBeNull(); // future
    expect(resolvePulseWeek("2027-w05", sunNoon)).toBeNull();
    expect(resolvePulseWeek("2026-w37", sunNoon)).toBeNull(); // before the first week
    expect(resolvePulseWeek("2026-W38", sunNoon)).toBeNull(); // malformed
    expect(resolvePulseWeek("latest", sunNoon)).toBeNull();
  });

  it("lists every published week, newest first", () => {
    expect(pulseArchiveWeeks(at("2026-09-20T12:00:00Z"))).toEqual([]);
    expect(pulseArchiveWeeks(sunNoon).map((w) => w.slug)).toEqual(["2026-w38"]);
    expect(pulseArchiveWeeks(at("2026-10-05T12:00:00Z")).map((w) => w.slug)).toEqual(["2026-w40", "2026-w39", "2026-w38"]);
    // The sitemap patch reads slug and endDay.
    expect(pulseArchiveWeeks(sunNoon)[0].endDay).toBe("2026-09-20");
  });

  // 27 Sep 2026 (integrator): src/app/sitemap.ts spreads these rows; the
  // clock only decides which weeks exist, lastModified is the publish moment.
  it("sitemap rows: one per published week, lastModified = Monday 00:00 IST after the week", () => {
    expect(pulseSitemapEntries("https://shishya.in", at("2026-09-20T12:00:00Z"))).toEqual([]);
    const rows = pulseSitemapEntries("https://shishya.in", at("2026-10-05T12:00:00Z"));
    expect(rows.map((r) => r.url)).toEqual([
      "https://shishya.in/pulse/2026-w40",
      "https://shishya.in/pulse/2026-w39",
      "https://shishya.in/pulse/2026-w38",
    ]);
    expect(rows[2].lastModified.toISOString()).toBe("2026-09-20T18:30:00.000Z"); // Mon 21 Sep 00:00 IST
    for (const r of rows) {
      expect(r.changeFrequency).toBe("yearly");
      expect(r.lastModified.getTime()).toBeLessThanOrEqual(at("2026-10-05T12:00:00Z").getTime());
    }
  });
});

describe("gates — no printed count under 20", () => {
  it("gatedCount", () => {
    expect(gatedCount(20)).toBe(20);
    expect(gatedCount(19)).toBeNull();
    expect(gatedCount(0)).toBeNull();
    expect(gatedCount(null)).toBeNull();
    expect(gatedCount(Number.NaN)).toBeNull();
  });

  it("exam rows need 20 mocks from 10 people; the week before prints only when it passed too", () => {
    const rows = gateExamMocks([
      { code: "TS_POLICE_PC", name: "TS Police PC", mocks: 116, people: 15, prevMocks: 111, prevPeople: 17 },
      { code: "IBPS_CLERK", name: "IBPS Clerk", mocks: 31, people: 11, prevMocks: 15, prevPeople: 8 },
      { code: "AP_APPSC_GROUP2", name: "AP APPSC Group 2", mocks: 24, people: 14, prevMocks: 108, prevPeople: 12 },
      { code: "KA_KPSC_KAS", name: "KA KPSC KAS", mocks: 56, people: 3, prevMocks: 0, prevPeople: 0 },
      { code: "SOF_IEO", name: "SOF IEO", mocks: 35, people: 2, prevMocks: 0, prevPeople: 0 },
      { code: "X", name: "X", mocks: 19, people: 19, prevMocks: 0, prevPeople: 0 },
      { code: "Y", name: "Y", mocks: 20, people: 10, prevMocks: 56, prevPeople: 3 },
    ]);
    expect(rows).toEqual([
      { code: "TS_POLICE_PC", name: "TS Police PC", mocks: 116, prevMocks: 111 },
      { code: "IBPS_CLERK", name: "IBPS Clerk", mocks: 31, prevMocks: null },
      { code: "AP_APPSC_GROUP2", name: "AP APPSC Group 2", mocks: 24, prevMocks: 108 },
      { code: "Y", name: "Y", mocks: 20, prevMocks: null },
    ]);
    for (const r of rows) expect(r).not.toHaveProperty("people");
  });

  it("mergeSmallGroups merges the smallest into the next smallest until all are 20+", () => {
    const out = mergeSmallGroups([
      { key: "a", label: "A", n: 92 },
      { key: "b", label: "B", n: 36 },
      { key: "c", label: "C", n: 10 },
      { key: "d", label: "D", n: 3 },
      { key: "e", label: "E", n: 2 },
    ]);
    expect(out).toEqual([
      { keys: ["a"], labels: ["A"], n: 92, merged: false },
      { keys: ["b", "c", "d", "e"], labels: ["B", "C", "D", "E"], n: 51, merged: true },
    ]);
  });

  it("mergeSmallGroups drops a lone group under the floor and ignores empty groups", () => {
    expect(mergeSmallGroups([{ key: "a", label: "A", n: 19 }])).toEqual([]);
    expect(mergeSmallGroups([{ key: "a", label: "A", n: 5 }, { key: "b", label: "B", n: 6 }])).toEqual([]);
    expect(mergeSmallGroups([{ key: "a", label: "A", n: 25 }, { key: "z", label: "Z", n: 0 }])).toEqual([{ keys: ["a"], labels: ["A"], n: 25, merged: false }]);
  });

  it("mergeSmallGroups also merges a group with too few people (people never printed)", () => {
    const out = mergeSmallGroups(
      [
        { key: "government", label: "Government", n: 426, people: 123 },
        { key: "olympiad", label: "Olympiads", n: 35, people: 2 },
        { key: "entrance", label: "Entrance", n: 24, people: 10 },
      ],
      20,
      10,
    );
    expect(out).toEqual([
      { keys: ["government"], labels: ["Government"], n: 426, merged: false },
      { keys: ["olympiad", "entrance"], labels: ["Olympiads", "Entrance"], n: 59, merged: true },
    ]);
    expect(JSON.stringify(out)).not.toContain("people");
  });

  it("mergeSmallGroups uses the exact people of a merged set when the caller counted it", () => {
    const groups = [
      { key: "government", label: "G", n: 426, people: 123 },
      { key: "olympiad", label: "O", n: 51, people: 7 },
      { key: "entrance", label: "E", n: 8, people: 5 },
    ];
    // Lower bound max(7, 5) = 7 < 10: everything merges into one group.
    expect(mergeSmallGroups(groups, 20, 10)).toHaveLength(1);
    const exact = mergeSmallGroups(groups, 20, 10, (keys) => (keySetId(keys) === "entrance+olympiad" ? 12 : undefined));
    expect(exact.map((g) => [g.keys, g.n])).toEqual([
      [["government"], 426],
      [["olympiad", "entrance"], 59],
    ]);
    // An exact count under the floor merges on; when even the whole set is
    // under it, nothing is printed.
    expect(mergeSmallGroups(groups, 20, 10, () => 9)).toEqual([]);
  });

  it("mergeSmallGroups: every output group is 20+ for any input (randomised)", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    for (let t = 0; t < 300; t++) {
      const groups = Array.from({ length: 1 + Math.floor(rnd() * 7) }, (_, i) => ({ key: `k${i}`, label: `L${i}`, n: Math.floor(rnd() * 60), people: Math.floor(rnd() * 25) }));
      const out = mergeSmallGroups(groups, 20, 10);
      const total = groups.reduce((s, g) => s + g.n, 0);
      for (const g of out) expect(g.n).toBeGreaterThanOrEqual(PULSE_K);
      if (out.length) expect(out.reduce((s, g) => s + g.n, 0)).toBe(total);
      const keys = out.flatMap((g) => g.keys);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it("guardResiduals merges a group whose unprinted remainder would be under 20", () => {
    const groups = mergeSmallGroups([
      { key: "government", label: "Government", n: 426 },
      { key: "olympiad", label: "Olympiads", n: 35 },
      { key: "entrance", label: "Entrance", n: 24 },
    ]);
    // Nothing printed inside: unchanged.
    expect(guardResiduals(groups, {})).toEqual(groups);
    // An olympiad exam row of 30 is printed: 35 - 30 = 5 left in "Olympiads".
    const guarded = guardResiduals(groups, { government: 171, olympiad: 30 }, { government: 426, olympiad: 35, entrance: 24 });
    expect(guarded).toEqual([
      { keys: ["government"], labels: ["Government"], n: 426, merged: false },
      { keys: ["olympiad", "entrance"], labels: ["Olympiads", "Entrance"], n: 59, merged: true },
    ]);
    // A remainder of exactly 0 is fine (the rows are the whole group).
    expect(guardResiduals(groups, { government: 426 })).toEqual(groups);
    // One group left: the table is dropped.
    expect(guardResiduals([{ keys: ["a"], labels: ["A"], n: 30, merged: false }, { keys: ["b"], labels: ["B"], n: 25, merged: false }], { a: 25, b: 20 })).toEqual([]);
  });

  const topic = (p: Partial<TopicRaw>): TopicRaw => ({ examCode: "TS_POLICE_PC", examName: "TS Police PC", topicCode: "t", topicName: "T", answers: 300, correct: 150, people: 25, ...p });

  it("most-practised topics need 20 different people; ranked by answers", () => {
    const rows = gatePractisedTopics([
      topic({ topicCode: "analogies", topicName: "Analogies", answers: 362, people: 24 }),
      topic({ topicCode: "few", topicName: "Few people", answers: 900, people: 19 }),
      topic({ topicCode: "percent", topicName: "Percentage", answers: 243, people: 21 }),
    ]);
    expect(rows.map((r) => r.topicCode)).toEqual(["analogies", "percent"]);
    expect(rows.every((r) => r.sharePct === null)).toBe(true);
    expect(JSON.stringify(rows)).not.toContain("people");
  });

  it("hardest topics need 200 answers from 20 people; lowest share correct first, one decimal", () => {
    const rows = gateHardestTopics([
      topic({ topicCode: "analogies", answers: 362, correct: 182, people: 24 }),
      topic({ topicCode: "percent", answers: 243, correct: 104, people: 21 }),
      topic({ topicCode: "small", answers: 199, correct: 10, people: 40 }),
      topic({ topicCode: "fewpeople", answers: 500, correct: 10, people: 19 }),
      topic({ topicCode: "geo", answers: 246, correct: 195, people: 26 }),
    ]);
    expect(rows.map((r) => [r.topicCode, r.sharePct])).toEqual([
      ["percent", 42.8],
      ["analogies", 50.3],
      ["geo", 79.3],
    ]);
  });

  // 27 Sep 2026 (fixer review): week 38's window had one qualifying topic
  // (78.7% correct); printing it as "the hardest" on a permanent page is a
  // claim the data does not support.
  it(`hardest topics print nothing unless at least ${PULSE_HARD_MIN_TOPICS} topics qualify`, () => {
    expect(PULSE_HARD_MIN_TOPICS).toBe(3);
    const geo = topic({ topicCode: "geo", answers: 225, correct: 177, people: 26 });
    const pct = topic({ topicCode: "percent", answers: 243, correct: 104, people: 21 });
    const small = topic({ topicCode: "small", answers: 175, correct: 74, people: 19 });
    expect(gateHardestTopics([geo])).toEqual([]);
    expect(gateHardestTopics([geo, pct, small])).toEqual([]);
    expect(gateHardestTopics([geo, pct, topic({ topicCode: "ana", answers: 362, correct: 182, people: 24 })]).map((r) => r.topicCode)).toEqual(["percent", "ana", "geo"]);
  });

  it("tutor rows need 20 questions from 10 people; the (other) bucket never prints", () => {
    const rows = gateTutorByExam([
      { bucket: "TS_POLICE_PC", name: "TS Police PC", questions: 211, people: 46 },
      { bucket: "NDA", name: "NDA", questions: 52, people: 8 },
      { bucket: "(general)", name: null, questions: 28, people: 8 },
      { bucket: "(school)", name: null, questions: 40, people: 12 },
      { bucket: "(other)", name: null, questions: 90, people: 30 },
      { bucket: "SSC_CGL", name: "SSC CGL", questions: 19, people: 14 },
    ]);
    expect(rows).toEqual([
      { code: "TS_POLICE_PC", label: "TS Police PC", questions: 211 },
      { code: null, label: "School chapters (all classes)", questions: 40 },
    ]);
  });

  it("sign-up sections merge to 20+ (the 14-20 Sep 2026 shape)", () => {
    const rows = gateSignupSections([
      { section: "government", n: 92 },
      { section: "other", n: 36 },
      { section: "other", n: 10 },
      { section: "exams-general", n: 3 },
      { section: "school", n: 0 },
    ]);
    expect(rows.map((r) => r.n)).toEqual([92, 49]);
    for (const r of rows) expect(r.n).toBeGreaterThanOrEqual(20);
  });
});

describe("exam kinds", () => {
  const ALL_CATEGORIES = ["BANKING", "CIVIL_SERVICES", "ENGINEERING", "GOVT_JOBS", "LAW", "MBA", "MEDICAL", "OLYMPIAD", "OTHER", "STATE_LEVEL", "TEACHING", "UNIVERSITY"];

  it("ENTRANCE_CATEGORY_VALUES is exactly what examKind files as entrance", () => {
    for (const category of ALL_CATEGORIES) {
      expect(examKind({ code: "ZZ_TEST", category }) === "entrance", category).toBe(ENTRANCE_CATEGORY_VALUES.includes(category));
    }
  });

  /** A tiny evaluator of the generated CASE, so the SQL cannot drift from examKind. */
  function evalCase(sql: string, code: string, category: string): string {
    const whens = [...sql.matchAll(/WHEN (.+?) THEN '([a-z]+)'/g)];
    for (const [, cond, kind] of whens) {
      const inList = /^(e\."code"|e\."category"::text) IN \((.+)\)$/.exec(cond);
      const eq = /^e\."category"::text = '([A-Z_]+)'$/.exec(cond);
      if (inList) {
        const vals = [...inList[2].matchAll(/'([A-Z0-9_]+)'/g)].map((m) => m[1]);
        if (vals.includes(inList[1] === 'e."code"' ? code : category)) return kind;
      } else if (eq) {
        if (category === eq[1]) return kind;
      } else throw new Error(`unparsed WHEN ${cond}`);
    }
    const other = /ELSE '([a-z]+)' END$/.exec(sql);
    return other![1];
  }

  it("the SQL CASE and pulseKindOf agree with examKind for every category and listed code", () => {
    const sql = examKindSqlCase("e");
    const samples: [string, string][] = [
      ...ALL_CATEGORIES.map((c) => ["ZZ_TEST", c] as [string, string]),
      ...ENTRANCE_EXCEPTION_CODES.map((c) => [c, "GOVT_JOBS"] as [string, string]),
      ...STATE_CET_CODES.map((c) => [c, "STATE_LEVEL"] as [string, string]),
      ["HR_HSSC_CET", "STATE_LEVEL"],
    ];
    for (const [code, category] of samples) {
      const want = examKind({ code, category });
      expect(evalCase(sql, code, category), `${code}/${category}`).toBe(want);
      expect(pulseKindOf({ code, category }), `${code}/${category}`).toBe(want);
    }
    expect(evalCase(sql, "NCERT_C09", "SCHOOL_BOARD")).toBe("school");
    expect(pulseKindOf({ code: "NCERT_C09", category: "SCHOOL_BOARD" })).toBe("school");
  });

  it("refuses an alias that is not a bare identifier", () => {
    expect(() => examKindSqlCase("e; DROP")).toThrow(/bad alias/);
  });
});

describe("landing path → section", () => {
  const cats = new Map<string, string>([
    ["TS_POLICE_PC", "STATE_LEVEL"],
    ["JEE_MAIN", "ENGINEERING"],
    ["SOF_IMO", "OLYMPIAD"],
    ["NDA", "GOVT_JOBS"],
    ["CA_FOUNDATION", "OTHER"],
    ["KA_KCET", "STATE_LEVEL"],
  ]);
  const cases: [string | null, string][] = [
    ["/schooling/cbse/class-9", "school"],
    ["/hi/exams/TS_POLICE_PC/mocks", "government"],
    ["/exams/JEE_MAIN", "entrance"],
    ["/exams/SOF_IMO/topics/x", "entrance"],
    ["/exams/NDA", "entrance"],
    ["/exams/KA_KCET/updates", "entrance"],
    ["/exams/CA_FOUNDATION", "exams-general"],
    ["/exams/UNKNOWN_CODE", "exams-general"],
    ["/exams/entrance", "entrance"],
    ["/exams/state/telangana", "government"],
    ["/exams/browse", "exams-general"],
    ["/exam-calendar", "exams-general"],
    ["/current-affairs/2026-09-20", "government"],
    ["/colleges/iit-madras", "colleges"],
    ["/te/scholarships", "colleges"],
    ["/careers/data-scientist", "careers"],
    ["/jobs", "careers"],
    ["/", "other"],
    ["/hi", "other"],
    ["/login?next=/dashboard", "other"],
    ["/chat", "other"],
    [null, "other"],
  ];
  it.each(cases)("%s → %s", (path, section) => {
    expect(pulseSectionOfPath(path, cats)).toBe(section);
  });
});

describe("official dates", () => {
  it("a label that says expected is never printed as official", () => {
    expect(labelSaysExpected("NTPC Graduate CBTST exam (CEN 06/2025, expected)")).toBe(true);
    expect(labelSaysExpected("UCEED 2027 Notification (expected)")).toBe(true);
    expect(labelSaysExpected("Result — tentative")).toBe(true);
    expect(labelSaysExpected("Prelims exam — Day 2 (Regular vacancies)")).toBe(false);
    expect(labelSaysExpected("Unexpected change")).toBe(false);
  });
});
