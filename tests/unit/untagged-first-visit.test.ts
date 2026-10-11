// Untagged first visits (src/lib/untagged-first-visit.ts, 11 Oct 2026): the
// rule scripts/tmp-latest-stats.ts adds to walk-ins after ChatGPT's links lost
// their tag and referrer. No DB: the JS mirror on synthetic rows, and the SQL
// pinned to the same pattern and person key.
// Run: npx vitest run tests/unit/untagged-first-visit.test.ts

import { describe, expect, it } from "vitest";
import {
  FIRST_VISIT_DEEP_RE,
  FIRST_VISIT_HUB_RE,
  countUntaggedFirstVisitPeople,
  firstVisitPathSql,
  firstVisitPersonKey,
  firstVisitPersonKeySql,
  isFirstVisitPath,
  isUntaggedFirstVisit,
  notOnAgentsSql,
  untaggedFirstVisitWhereSql,
  walkInsWithUntagged,
  type FirstVisitRow,
} from "@/lib/untagged-first-visit";

let seq = 0;
function row(over: Partial<FirstVisitRow> = {}): FirstVisitRow {
  return {
    id: `r${++seq}`,
    kind: "PAGE_VIEW",
    client: "browser",
    userId: null,
    anonId: null,
    utmSource: null,
    refHost: null,
    uaHash: "ua-1",
    ipHash: `ip-${seq}`,
    path: "/exams/SSC_CGL",
    ...over,
  };
}

describe("first-visit pages", () => {
  it("hub roots and their /hi, /te twins; PYQ, practice and topic pages under an exam", () => {
    for (const p of [
      "/exams/SSC_CGL",
      "/exams/SSC_CGL/",
      "/hi/exams/UP_UPSSSC_PET",
      "/te/exams/TS_TSPSC_GROUP2",
      "/exams/SSC_CGL/pyq",
      "/exams/SSC_CGL/pyq/2024",
      "/exams/SSC_CGL/build-mock",
      "/exams/SSC_CGL/quiz",
      "/exams/SSC_CGL/mock",
      "/exams/SSC_CGL/mocks",
      "/exams/SSC_CGL/topics/math.algebra",
      "/exams/AP_APTET/topics/aptet.cdp.learning_theories/hi",
      "/exams/SSC_CGL?src=x",
      "/exams/SSC_CGL/build-mock?topic=algebra",
    ]) {
      expect(isFirstVisitPath(p), p).toBe(true);
    }
  });

  it("not other exam pages, other sections, school pages, lowercase codes or near misses", () => {
    for (const p of [
      "/",
      "/chat",
      "/login",
      "/exams/SSC_CGL/cutoff",
      "/exams/SSC_CGL/syllabus",
      "/exams/SSC_CGL/updates",
      "/exams/SSC_CGL/news/123",
      "/exams/ssc_cgl",
      "/exams/SSC_CGL/pyqs-old",
      "/exams/SSC_CGL/quizzes",
      "/ta/exams/TN_TNPSC_GROUP4",
      "/current-affairs/2026-10-11",
      "/schooling/cbse/class-9/science",
      "/schooling/cbse/class-5",
      null,
      undefined,
    ]) {
      expect(isFirstVisitPath(p), String(p)).toBe(false);
    }
  });

  it("the SQL uses the same two patterns and drops the query string", () => {
    const sql = firstVisitPathSql("e.path");
    expect(sql).toBe(
      `(split_part(COALESCE(e.path,''),'?',1) ~ '${FIRST_VISIT_HUB_RE}' OR split_part(COALESCE(e.path,''),'?',1) ~ '${FIRST_VISIT_DEEP_RE}')`,
    );
    // The frozen ChatGPT landing pattern (definitions.md; scripts/tmp-weekly-read.ts PATTERN) plus topic pages.
    expect(FIRST_VISIT_HUB_RE).toBe("^(/(hi|te))?/exams/[A-Z][A-Z0-9_]*/?$");
    expect(FIRST_VISIT_DEEP_RE).toBe("^(/(hi|te))?/exams/[A-Z][A-Z0-9_]*/(pyq|build-mock|quiz|mocks?|topics)(/|$)");
  });
});

describe("untagged first visit (one row)", () => {
  it("a browser page view with no account, no browser id, no tag and no referrer, on a first-visit page", () => {
    expect(isUntaggedFirstVisit(row())).toBe(true);
    expect(isUntaggedFirstVisit(row({ utmSource: "", refHost: "" }))).toBe(true);
  });

  it("never a row with an id, a tag, a referrer, another kind, a bot or legacy client, or another page", () => {
    expect(isUntaggedFirstVisit(row({ anonId: "a1" }))).toBe(false);
    expect(isUntaggedFirstVisit(row({ userId: "u1" }))).toBe(false);
    expect(isUntaggedFirstVisit(row({ utmSource: "chatgpt.com" }))).toBe(false);
    expect(isUntaggedFirstVisit(row({ refHost: "www.google.com" }))).toBe(false);
    expect(isUntaggedFirstVisit(row({ kind: "CTA_CLICKED" }))).toBe(false);
    expect(isUntaggedFirstVisit(row({ client: "bot" }))).toBe(false);
    expect(isUntaggedFirstVisit(row({ client: null }))).toBe(false);
    expect(isUntaggedFirstVisit(row({ path: "/exams/SSC_CGL/cutoff" }))).toBe(false);
  });

  it("the SQL predicate names the same conditions", () => {
    expect(untaggedFirstVisitWhereSql("e")).toBe(
      `(e.kind = 'PAGE_VIEW' AND e.client = 'browser' AND e."userId" IS NULL AND e."anonId" IS NULL AND COALESCE(e."utmSource",'') = '' AND COALESCE(e."refHost",'') = '' AND ${firstVisitPathSql("e.path")})`,
    );
  });
});

describe("people-level count", () => {
  it("one device on one connection is one person; another address is another person", () => {
    const rows = [
      row({ uaHash: "ua-a", ipHash: "ip-1", path: "/exams/SSC_CGL" }),
      row({ uaHash: "ua-a", ipHash: "ip-1", path: "/exams/SSC_CGL/pyq" }), // cookie-blocking browser: one row per page
      row({ uaHash: "ua-a", ipHash: "ip-2" }),
      row({ uaHash: "ua-b", ipHash: "ip-1" }),
    ];
    expect(countUntaggedFirstVisitPeople(rows)).toBe(3);
  });

  it("a row missing a fingerprint counts on its own; rows that are not untagged first visits are left out", () => {
    const rows = [row({ uaHash: null, ipHash: "ip-9" }), row({ uaHash: "ua-c", ipHash: null }), row({ anonId: "a1" }), row({ path: "/chat" })];
    expect(countUntaggedFirstVisitPeople(rows)).toBe(2);
    expect(firstVisitPersonKey({ id: "x1", uaHash: null, ipHash: "ip-9" })).toBe("row:x1");
    expect(firstVisitPersonKey({ id: "x2", uaHash: "ua", ipHash: "ip" })).toBe("ua|ip");
  });

  it("the SQL key matches the JS key", () => {
    expect(firstVisitPersonKeySql("e")).toBe(
      `(CASE WHEN e."uaHash" IS NOT NULL AND e."ipHash" IS NOT NULL THEN e."uaHash" || '|' || e."ipHash" ELSE 'row:' || e.id END)`,
    );
  });

  it("an empty day counts nobody", () => {
    expect(countUntaggedFirstVisitPeople([])).toBe(0);
  });

  it("rows on a sure-bot agent are left out, hub rows included; a row with no user-agent hash stays", () => {
    const rows = [
      row({ uaHash: "ua-crawler", ipHash: "ip-1", path: "/exams/SSC_CGL" }),
      row({ uaHash: "ua-crawler", ipHash: "ip-2", path: "/exams/SSC_CGL/pyq" }),
      row({ uaHash: "ua-phone", ipHash: "ip-3", path: "/exams/SSC_CGL" }),
      row({ uaHash: null, ipHash: "ip-4" }),
    ];
    expect(countUntaggedFirstVisitPeople(rows)).toBe(4);
    expect(countUntaggedFirstVisitPeople(rows, new Set(["ua-crawler"]))).toBe(2);
  });

  it("the SQL exclusion keeps rows with no user-agent hash", () => {
    expect(notOnAgentsSql("e", "SELECT 'x' AS ua")).toBe(`(e."uaHash" IS NULL OR e."uaHash" NOT IN (SELECT 'x' AS ua))`);
  });
});

describe("walk-ins with untagged first visits", () => {
  it("adds the untagged first-visit people to the old walk-ins, one-page visitors included", () => {
    expect(walkInsWithUntagged(64, 41)).toBe(105);
    expect(walkInsWithUntagged(0, 0)).toBe(0);
  });
});
