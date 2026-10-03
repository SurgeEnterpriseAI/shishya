// Learners by section (30 Sep 2026): the group rules and the fold that turns
// the section query's rows into one number per group. Pure — no DB.
// Run: npx vitest run tests/unit/learner-sections.test.ts

import { describe, expect, it } from "vitest";
import { LEARNER_SECTIONS, PG_ENTRANCE_EXTRA_CODES, POSTGRAD_CODES, foldSectionRows, learnerSectionsSql, sectionCaseSql, zeroSectionCounts } from "@/lib/learner-sections";
import { PG_ENTRANCE_CODES } from "@/lib/pg-entrances";
import { SIGNUP_LINK_CTE, landingKeySql, personKeySql, walkInWhereSql } from "@/lib/learner-count";
import { STATE_CET_CODES } from "@/lib/exam-kind";

describe("the groups", () => {
  it("are the seven the strip shows, just exploring last", () => {
    expect([...LEARNER_SECTIONS]).toEqual(["govt", "school", "entrance", "college", "graduate", "postgraduate", "exploring"]);
  });

  it("the CASE names every group and nothing else", () => {
    const sql = sectionCaseSql();
    const named = [...new Set([...sql.matchAll(/(?:THEN|ELSE) '([a-z]+)'/g)].map((m) => m[1]))].sort();
    expect(named).toEqual([...LEARNER_SECTIONS].sort());
    expect(sql).toMatch(/ELSE 'exploring' END$/);
  });

  it("files NET before PG entrance before olympiads before entrance, and the rest of the exams as govt", () => {
    const sql = sectionCaseSql();
    const at = (s: string) => sql.indexOf(s);
    // Inside the exam CASE: the NET codes are tested before the PG entrance codes.
    expect(at("THEN 'postgraduate'")).toBeLessThan(at(`'${PG_ENTRANCE_CODES[0]}'`));
    for (const c of POSTGRAD_CODES) expect(sql).toContain(`'${c}'`);
    for (const c of PG_ENTRANCE_CODES) expect(sql).toContain(`'${c}'`);
    for (const c of STATE_CET_CODES) expect(sql).toContain(`'${c}'`);
    expect(sql).toContain("'NDA'");
    expect(sql).toMatch(/ecat IN \('OLYMPIAD', 'SCHOOL_BOARD'\) THEN 'school'/);
    expect(sql).toMatch(/ELSE 'govt' END\s+WHEN sp ~ '\^\/exams\/entrance/);
    // UGC NET / CSIR NET need a master's already: never a PG entrance test.
    for (const c of POSTGRAD_CODES) expect(PG_ENTRANCE_CODES as readonly string[]).not.toContain(c);
  });

  it("every GATE paper and the state MBA / MCA tests are PG entrance (review, 30 Sep 2026)", () => {
    const sql = sectionCaseSql();
    expect(sql).toContain("WHEN ecode ~ '^GATE_' OR ecode IN (");
    for (const c of PG_ENTRANCE_EXTRA_CODES) expect(sql).toContain(`'${c}'`);
    // …and the graduate branch comes before the entrance branch (GATE_EE is ENGINEERING in the DB).
    expect(sql.indexOf("WHEN ecode ~ '^GATE_'")).toBeLessThan(sql.indexOf("OR ecat IN ('ENGINEERING'"));
  });

  it("pages that list every kind of exam do not vote (review, 30 Sep 2026)", () => {
    const sql = sectionCaseSql();
    const noVote = sql.indexOf("THEN 'exploring'");
    expect(noVote).toBeGreaterThan(-1);
    expect(noVote).toBeLessThan(sql.indexOf("WHEN ecode IS NOT NULL"));
    expect(sql).toContain("WHEN sp ~ '^/exams/?$' OR sp ~ '^/exams/(browse|state|category|after)(/|$)'");
    expect(sql).toContain("OR sp ~ '^/(exam-calendar|results|exam-alerts|live-test)(/|$)' THEN 'exploring'");
    // …and they are gone from the govt path rule.
    expect(sql).toMatch(/WHEN sp ~ '\^\/\(exams\|current-affairs\|jobs-map\|find-your-exam\|typing\|descriptive\)\(\/\|\$\)' THEN 'govt'/);
  });

  it("a mock or result page counts for its exam", () => {
    const sql = learnerSectionsSql(new Date("2026-09-29T18:30:00Z")).sql;
    expect(sql).toContain(`pv.sp LIKE '/mocks/%' AND m.id = substring(pv.sp from '^/mocks/([a-z0-9]+)')`);
    expect(sql).toContain(`pv.sp LIKE '/attempts/%' AND at.id = substring(pv.sp from '^/attempts/([a-z0-9]+)')`);
    expect(sql).toContain(", pv AS MATERIALIZED (");
  });

  it("uses the learners counter's own rule, keys and overlap window (3 Oct 2026: merged person, device-day landings)", () => {
    const sql = learnerSectionsSql(new Date("2026-09-29T18:30:00Z")).sql;
    expect(sql).toContain("WHERE i.c >= 2 OR (i.c = 1 AND (i.r OR i.u))");
    expect(sql).toContain("first_at >= '2026-07-30T20:00:00Z' AND first_at < '2026-08-16T17:00:00Z'");
    // Persons merge through the SIGNUP link; landings are keyed (src/lib/learner-count.ts), never one per row.
    expect(sql).toContain(`WITH ${SIGNUP_LINK_CTE}, pv AS MATERIALIZED (`);
    expect(sql).toContain(`SELECT ${personKeySql("a")} AS k,`);
    expect(sql).toContain(`CASE WHEN ${walkInWhereSql("a")} THEN ${landingKeySql("a")} END AS lk`);
    expect(sql).not.toContain(`FROM s WHERE "client" = 'browser' AND "userId" IS NULL AND "anonId" IS NULL`);
    // One group per identity: the section with the most views, a tie to the latest — and the same for a device.
    expect(sql).toContain("SELECT DISTINCT ON (k) k, sec FROM secs ORDER BY k, n DESC, last_at DESC");
    expect(sql).toContain("SELECT DISTINCT ON (lk) lk, sec FROM wsecs ORDER BY lk, n DESC, last_at DESC");
  });
});

describe("foldSectionRows", () => {
  it("engaged + walk-ins − overlap per group, all-time and today", () => {
    const out = foldSectionRows([
      { sec: "govt", part: "engaged", n: 100, today: 5 },
      { sec: "govt", part: "walkin", n: 40, today: 2 },
      { sec: "govt", part: "overlap", n: 10, today: 1 },
      { sec: "school", part: "engaged", n: BigInt(7), today: BigInt(1) },
    ]);
    expect(out.govt).toEqual({ total: 130, today: 6 });
    expect(out.school).toEqual({ total: 7, today: 1 });
    expect(out.postgraduate).toEqual({ total: 0, today: 0 });
  });

  it("never guesses an unknown section into a group; totals never below 0, today left as is", () => {
    const out = foldSectionRows([
      { sec: "general", part: "engaged", n: 50, today: 5 },
      { sec: "entrance", part: "overlap", n: 3, today: 1 },
      { sec: "entrance", part: "mystery", n: 99, today: 9 },
    ]);
    // An overlap that closed today takes 1 off its group's today: kept, so the
    // seven todays still add up to the learners' +N today (the strip hides <= 0).
    expect(out).toEqual({ ...zeroSectionCounts(), entrance: { total: 0, today: -1 } });
  });
});
