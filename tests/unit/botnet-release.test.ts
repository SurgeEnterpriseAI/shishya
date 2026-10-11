// People-shaped agents are not sure bots (src/lib/botnet-release.ts, 11 Oct
// 2026). No DB: the JS mirror on synthetic agents shaped like the 11 Oct read,
// and the SQL pinned to the same thresholds. The wiring into the botnet rule
// is a patch (growth-oct10/oct11/measure-untagged/patches) with its own test in
// tests/unit/bot-scrub.test.ts.
// Run: npx vitest run tests/unit/botnet-release.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { READER_TAG_PREFIX, entryPathSql, isEntryPath } from "@/lib/bot-scrub";
import {
  BOTNET_MAX_VIEWS_PER_IP,
  BOTNET_MIN_IPS,
  NIGHT_END_HOUR_IST,
  RELEASE_MAX_NIGHT_SHARE,
  RELEASE_MIN_ENTRY_SHARE,
  botnetAgentsSql,
  isPeopleShaped,
  peopleShapedHavingSql,
  readerAgentsSql,
} from "@/lib/botnet-release";

/** 11 Oct 2026, IST hour h → the UTC instant. */
const ist = (h: number, m = 0) => new Date(Date.UTC(2026, 9, 11, h, m) - 5.5 * 3600_000);
/** An agent's pool: `entry` rows on hub roots and `deep` rows on deep pages, `night` of all rows at 02:00 IST, the rest at 14:00. */
function agent(o: { entry: number; deep: number; night: number }) {
  const rows: { path: string; createdAt: Date }[] = [];
  for (let i = 0; i < o.entry; i++) rows.push({ path: `/exams/EXAM_${i}`, createdAt: ist(14) });
  for (let i = 0; i < o.deep; i++) rows.push({ path: `/exams/EXAM_${i}/build-mock`, createdAt: ist(14) });
  for (let i = 0; i < o.night; i++) rows[i].createdAt = ist(2);
  return rows;
}

describe("thresholds", () => {
  it("are where the 11 Oct 2026 read put them", () => {
    expect(RELEASE_MIN_ENTRY_SHARE).toBe(0.4);
    expect(RELEASE_MAX_NIGHT_SHARE).toBe(0.2);
    expect(NIGHT_END_HOUR_IST).toBe(6);
  });
});

describe("isPeopleShaped (JS mirror)", () => {
  it("releases a phone build shaped like Android Chrome 154 (66% entry pages, 2% at night)", () => {
    expect(isPeopleShaped(agent({ entry: 95, deep: 49, night: 3 }), isEntryPath)).toBe(true);
  });

  it("keeps the crawlers: the six-agent desktop sweep (5-10% entry, 24-31% night) and the /chat crawler (2%, 26%)", () => {
    expect(isPeopleShaped(agent({ entry: 10, deep: 208, night: 66 }), isEntryPath)).toBe(false);
    expect(isPeopleShaped(agent({ entry: 25, deep: 1173, night: 311 }), isEntryPath)).toBe(false);
  });

  it("keeps an agent that lands on entry pages but runs round the clock (Windows Chrome 144: 45%, 29%)", () => {
    expect(isPeopleShaped(agent({ entry: 31, deep: 38, night: 20 }), isEntryPath)).toBe(false);
  });

  it("keeps an agent that sleeps but sweeps deep pages (Linux Chrome 154: 33% entry, 7% night)", () => {
    expect(isPeopleShaped(agent({ entry: 5, deep: 10, night: 1 }), isEntryPath)).toBe(false);
  });

  it("edges: exactly 40% entry is released, exactly 20% at night is not", () => {
    expect(isPeopleShaped(agent({ entry: 40, deep: 60, night: 19 }), isEntryPath)).toBe(true);
    expect(isPeopleShaped(agent({ entry: 39, deep: 61, night: 0 }), isEntryPath)).toBe(false);
    expect(isPeopleShaped(agent({ entry: 50, deep: 50, night: 20 }), isEntryPath)).toBe(false);
  });

  it("night is IST hours 0-5: 05:59 IST is night, 06:00 IST is not, 23:59 IST is not", () => {
    // 9 hub rows at 14:00 IST + 3 deep rows at h:m → 3 of 12 rows (25%) are night rows only when h:m is before 06:00 IST.
    const three = (h: number, m: number) => [
      ...agent({ entry: 9, deep: 0, night: 0 }),
      ...[1, 2, 3].map((i) => ({ path: `/exams/X_${i}/pyq`, createdAt: ist(h, m) })),
    ];
    expect(isPeopleShaped(three(0, 0), isEntryPath)).toBe(false);
    expect(isPeopleShaped(three(5, 59), isEntryPath)).toBe(false);
    expect(isPeopleShaped(three(6, 0), isEntryPath)).toBe(true);
    expect(isPeopleShaped(three(23, 59), isEntryPath)).toBe(true);
  });

  it("an empty pool is never people-shaped", () => {
    expect(isPeopleShaped([], isEntryPath)).toBe(false);
  });
});

describe("peopleShapedHavingSql (the SQL says the same)", () => {
  it("entry share from the scrub's own entry list, night share in IST hours, the constants inline", () => {
    const sql = peopleShapedHavingSql(entryPathSql("path"));
    expect(sql).toBe(
      `(COUNT(*) FILTER (WHERE ${entryPathSql("path")}) >= 0.4 * COUNT(*) AND COUNT(*) FILTER (WHERE EXTRACT(HOUR FROM "createdAt" + interval '330 minutes') < 6) < 0.2 * COUNT(*))`,
    );
  });
});

describe("botnetAgentsSql / readerAgentsSql (read-only scripts)", () => {
  const SCRUB = fs.readFileSync(path.resolve(__dirname, "../../src/lib/bot-scrub.ts"), "utf8");
  const BAR = `HAVING COUNT(DISTINCT "ipHash") >= 15 AND COUNT(*) FILTER (WHERE "refHost" IS NOT NULL) = 0 AND COUNT(*)::numeric / GREATEST(COUNT(DISTINCT "ipHash"), 1) <= 1.5 AND`;

  it("the bar and the deep-reader tag are bot-scrub's own", () => {
    expect(SCRUB).toContain(`const MIN_IPS = ${BOTNET_MIN_IPS};`);
    expect(SCRUB).toContain(`const MAX_VIEWS_PER_IP = ${BOTNET_MAX_VIEWS_PER_IP};`);
    expect(READER_TAG_PREFIX).toBe("deep-reader");
  });

  it("same pool and bar as runBotScrub's conviction query; released = AND the release, convicted = AND NOT", () => {
    for (const which of ["released", "convicted"] as const) {
      const sql = botnetAgentsSql(entryPathSql("path"), which).replace(/\s+/g, " ");
      expect(sql.startsWith(`SELECT "uaHash" AS ua FROM "AnalyticsEvent"`)).toBe(true);
      expect(sql).toContain(
        `WHERE kind = 'PAGE_VIEW' AND "userId" IS NULL AND "anonId" IS NULL AND "uaHash" IS NOT NULL AND (client = 'browser' OR (client = 'bot' AND (props->>'retroTag' LIKE 'ua-sweep%' OR props->>'retroTag' LIKE 'deep-reader%'))) GROUP BY "uaHash"`,
      );
      expect(sql).not.toMatch(/\b(UPDATE|DELETE|INSERT)\b/);
    }
    const release = peopleShapedHavingSql(entryPathSql("path"));
    expect(botnetAgentsSql(entryPathSql("path"), "released").replace(/\s+/g, " ")).toContain(`${BAR} ${release}`);
    expect(botnetAgentsSql(entryPathSql("path"), "convicted").replace(/\s+/g, " ")).toContain(`${BAR} NOT ${release}`);
  });

  it("reader agents: any agent with a deep-reader tag", () => {
    expect(readerAgentsSql()).toBe(
      `SELECT DISTINCT "uaHash" AS ua FROM "AnalyticsEvent" WHERE client = 'bot' AND props->>'retroTag' LIKE 'deep-reader%' AND "uaHash" IS NOT NULL`,
    );
  });
});
