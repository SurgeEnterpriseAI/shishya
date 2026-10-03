// The hourly bot scrub (src/lib/bot-scrub.ts) — the deep-reader rule added
// 3 Oct 2026 after one automated reader made 176 of 2 Oct's "+336 learners
// today". No DB: the rule's JS mirror (readerVerdict) is run on synthetic
// rows, the SQL is pinned to the same thresholds, and runBotScrub is driven
// through a recording mock client. scripts/tmp-strip-4.ts checked the SQL and
// the mirror give the same rows on production (505 = 505, 3 Oct 2026). The
// review the same day added the distinct-page condition and the agent memory
// (scripts/tmp-strip-8.ts: SQL and JS both 6 days, 1 agent; 833 rows tagged).
// Run: npx vitest run tests/unit/bot-scrub.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ENTRY_HUB_RE,
  ENTRY_PATHS,
  READER_MEMORY_MIN_DAYS,
  READER_MIN_DEEP_PER_IP,
  READER_MIN_DISTINCT_PAGE_SHARE,
  READER_MIN_HOURS,
  READER_MIN_IPS,
  READER_TAG_PREFIX,
  entryPathSql,
  isEntryPath,
  readerDaysCountSql,
  readerQualifyingIdsSql,
  readerVerdict,
  runBotScrub,
  type ReaderRow,
} from "@/lib/bot-scrub";

const SRC = fs.readFileSync(path.resolve(__dirname, "../../src/lib/bot-scrub.ts"), "utf8");

// ── synthetic rows ─────────────────────────────────────────────────────
let seq = 0;
/** 2 Oct 2026, IST hour h, minute m → the UTC instant. */
const ist = (day: number, h: number, m = 0) => new Date(Date.UTC(2026, 9, day, h, m) - 5.5 * 3600_000);
function row(over: Partial<ReaderRow> & { createdAt: Date }): ReaderRow {
  return {
    id: `r${++seq}`,
    kind: "PAGE_VIEW",
    userId: null,
    anonId: null,
    refHost: null,
    utmSource: null,
    uaHash: "ua-reader",
    ipHash: "ip-0",
    client: "browser",
    retroTag: null,
    path: "/exams/SSC_CGL/topics/algebra",
    ...over,
  };
}
/** A reader-shaped day: `ips` addresses, spread over `hours` IST hours, `deep` deep views in all
 *  (each on a different page unless `pages` caps the number of different pages). */
function cluster(o: { ua?: string; day?: number; ips: number; hours: number; deep: number; entry?: number; pages?: number }): ReaderRow[] {
  const out: ReaderRow[] = [];
  const day = o.day ?? 2;
  for (let i = 0; i < o.deep; i++) {
    const page = o.pages ? i % o.pages : i;
    out.push(row({ uaHash: o.ua ?? "ua-reader", ipHash: `ip-${i % o.ips}`, createdAt: ist(day, i % o.hours, i % 60), path: `/exams/SSC_CGL/pyq/${page}` }));
  }
  for (let i = 0; i < (o.entry ?? 0); i++) out.push(row({ uaHash: o.ua ?? "ua-reader", ipHash: `ip-${i % o.ips}`, createdAt: ist(day, i % o.hours), path: "/" }));
  return out;
}

describe("entry pages (the human-safety list)", () => {
  it("the botnet rule's inline SQL lists exactly ENTRY_PATHS and the hub pattern", () => {
    const inline = [...SRC.matchAll(/split_part\(COALESCE\(path,''\),'\?',1\) IN \(([^)]*)\)/g)].map((m) => m[1]);
    expect(inline.length).toBe(2); // the restore and the tag of the botnet rule
    for (const list of inline) expect(list.split(",").map((s) => s.trim().replace(/'/g, ""))).toEqual([...ENTRY_PATHS]);
    expect(SRC.match(/~ '\^\/exams\/\[\^\/\]\+\/\?\$'/g)?.length).toBe(2);
    expect(ENTRY_HUB_RE).toBe("^/exams/[^/]+/?$");
    expect(entryPathSql("path")).toContain(`IN ('/', '/ask', '/jobs-map', '/live-test', '/current-affairs', '/aptitude', '/find-your-exam')`);
  });

  it("isEntryPath: home, hubs and entry pages yes; deep pages no; the query string is ignored", () => {
    for (const p of ["/", "/ask", "/exams/SSC_CGL", "/exams/SSC_CGL/", "/current-affairs?x=1"]) expect(isEntryPath(p), p).toBe(true);
    for (const p of ["/exams/SSC_CGL/pyq", "/schooling/cbse/class-9", "/chat", null]) expect(isEntryPath(p), String(p)).toBe(false);
  });
});

describe("deep-reader rule — thresholds on synthetic rows", () => {
  it("is set where the 3 Oct 2026 data put it", () => {
    expect(READER_MIN_IPS).toBe(10);
    expect(READER_MIN_HOURS).toBe(12);
    expect(READER_MIN_DEEP_PER_IP).toBe(1.5);
    expect(READER_MIN_DISTINCT_PAGE_SHARE).toBe(0.9);
    expect(READER_MEMORY_MIN_DAYS).toBe(3);
    expect(READER_TAG_PREFIX).toBe("deep-reader");
  });

  it("convicts a day at the bar (10 addresses, 12 hours, 15 deep pages) and tags its deep pages only", () => {
    const rows = cluster({ ips: 10, hours: 12, deep: 15, entry: 3 });
    const v = readerVerdict(rows);
    expect([...v.days]).toEqual(["ua-reader|2026-10-02"]);
    expect(v.ids.size).toBe(15);
    for (const r of rows) expect(v.ids.has(r.id), r.path ?? "").toBe(!isEntryPath(r.path));
  });

  it("does not convict just under any one bar", () => {
    expect(readerVerdict(cluster({ ips: 9, hours: 12, deep: 15 })).days.size).toBe(0); // 9 addresses
    expect(readerVerdict(cluster({ ips: 10, hours: 11, deep: 15 })).days.size).toBe(0); // 11 hours
    expect(readerVerdict(cluster({ ips: 10, hours: 12, deep: 14 })).days.size).toBe(0); // 1.4 deep pages per address
    // Entry pages do not count towards "deep pages per address".
    expect(readerVerdict(cluster({ ips: 10, hours: 12, deep: 14, entry: 10 })).days.size).toBe(0);
  });

  it("people are not caught: many addresses all day, one page each (the cookie comes back from the 2nd page)", () => {
    expect(readerVerdict(cluster({ ua: "ua-chrome", ips: 60, hours: 24, deep: 60 })).days.size).toBe(0);
    // …nor a botnet of one page per address (the older rule's job).
    expect(readerVerdict(cluster({ ua: "ua-botnet", ips: 150, hours: 24, deep: 158 })).days.size).toBe(0);
  });

  it("the 2 Oct reader is caught (52 addresses, 24 hours, 184 deep pages)", () => {
    const v = readerVerdict(cluster({ ips: 52, hours: 24, deep: 184, entry: 5 }));
    expect(v.days.has("ua-reader|2026-10-02")).toBe(true);
    expect(v.ids.size).toBe(184);
  });

  it("never looks at a row with an identity, a referrer, a tag, another kind, or another rule's tag", () => {
    const base = cluster({ ips: 10, hours: 12, deep: 15 });
    const others = [
      row({ createdAt: ist(2, 3), userId: "u1" }),
      row({ createdAt: ist(2, 3), anonId: "a1" }),
      row({ createdAt: ist(2, 3), refHost: "www.google.com" }),
      row({ createdAt: ist(2, 3), utmSource: "chatgpt.com" }),
      row({ createdAt: ist(2, 3), kind: "SIGNUP" }),
      row({ createdAt: ist(2, 3), kind: "CTA_CLICKED" }),
      row({ createdAt: ist(2, 3), client: "bot", retroTag: "ua-sweep-2026-10-02" }),
      row({ createdAt: ist(2, 3), client: "bot" }), // ingest-tagged
      row({ createdAt: ist(2, 3), ipHash: null }),
    ];
    const v = readerVerdict([...base, ...others]);
    expect(v.days.size).toBe(1);
    for (const o of others) expect(v.ids.has(o.id)).toBe(false);
    // Those rows also never help a day over the bar: 9 good addresses + identified rows on a 10th stay under.
    const nine = cluster({ ips: 9, hours: 12, deep: 15 });
    const extra = [row({ createdAt: ist(2, 1), ipHash: "ip-x", refHost: "bing.com" }), row({ createdAt: ist(2, 1), ipHash: "ip-y", utmSource: "x" })];
    expect(readerVerdict([...nine, ...extra]).days.size).toBe(0);
  });

  it("rows it tagged before still count (a verdict never flips on its own tags)", () => {
    const rows = cluster({ ips: 10, hours: 12, deep: 15 }).map((r) => ({ ...r, client: "bot", retroTag: "deep-reader-2026-10-02" }));
    expect(readerVerdict(rows).ids.size).toBe(15);
  });

  it("carries to the next IST day only — not the day after that, not the day before", () => {
    const d2 = cluster({ ips: 10, hours: 12, deep: 15 });
    const d1 = [row({ createdAt: ist(1, 23, 50) })];
    const d3 = [row({ createdAt: ist(3, 0, 5) }), row({ createdAt: ist(3, 9) }), row({ createdAt: ist(3, 9), path: "/exams/SSC_CGL" })];
    const d4 = [row({ createdAt: ist(4, 0, 5) })];
    const other = [row({ createdAt: ist(3, 1), uaHash: "ua-other" })];
    const v = readerVerdict([...d1, ...d2, ...d3, ...d4, ...other]);
    expect(v.ids.has(d1[0].id)).toBe(false);
    expect(v.ids.has(d3[0].id)).toBe(true);
    expect(v.ids.has(d3[1].id)).toBe(true);
    expect(v.ids.has(d3[2].id)).toBe(false); // an entry page, never
    expect(v.ids.has(d4[0].id)).toBe(false);
    expect(v.ids.has(other[0].id)).toBe(false);
  });

  it("days are IST days: 23:59 and 00:01 IST fall on different days", () => {
    const late = new Date("2026-10-02T18:29:00Z"); // 23:59 IST 2 Oct
    const early = new Date("2026-10-02T18:31:00Z"); // 00:01 IST 3 Oct
    const rows = [...cluster({ day: 2, ips: 10, hours: 12, deep: 14 }), row({ createdAt: late, ipHash: "ip-3" })];
    expect(readerVerdict(rows).days.has("ua-reader|2026-10-02")).toBe(true); // 15th deep page lands on 2 Oct
    const rows2 = [...cluster({ day: 2, ips: 10, hours: 12, deep: 14 }), row({ createdAt: early, ipHash: "ip-3" })];
    expect(readerVerdict(rows2).days.size).toBe(0);
  });

  it("4th condition: the day's deep pages are 90%+ different pages (a cookie-dropping browser of real people is not)", () => {
    expect(readerVerdict(cluster({ ips: 10, hours: 12, deep: 20, pages: 18 })).days.size).toBe(1); // 18 of 20 = 90%
    expect(readerVerdict(cluster({ ips: 10, hours: 12, deep: 20, pages: 17 })).days.size).toBe(0); // 85%
    // People cluster on popular pages: 60 addresses, 3 pages each, the same 12 pages — not convicted.
    expect(readerVerdict(cluster({ ua: "ua-privacy", ips: 60, hours: 24, deep: 180, pages: 12 })).days.size).toBe(0);
    // The query string does not make a page different.
    const q = cluster({ ips: 10, hours: 12, deep: 20 }).map((r, i) => ({ ...r, path: `/exams/SSC_CGL/pyq/${i % 10}?v=${i}` }));
    expect(readerVerdict(q).days.size).toBe(0);
  });
});

describe("deep-reader rule — agent memory (review, 3 Oct 2026)", () => {
  /** Three heavy days of the same agent: 22, 24 and 25 Sep 2026. */
  const sep = (day: number, h: number, m = 0) => new Date(Date.UTC(2026, 8, day, h, m) - 5.5 * 3600_000);
  const heavyDay = (day: number) =>
    Array.from({ length: 15 }, (_, i) => row({ ipHash: `ip-${i % 10}`, createdAt: sep(day, i % 12, i), path: `/exams/SSC_CGL/pyq/${day}-${i}` }));
  const light = (day: number, h: number, path = `/exams/SSC_CGL/topics/${day}-${h}`) => row({ ipHash: `ip-l${day}`, createdAt: sep(day, h), path });

  it("an agent convicted on 3+ days is tagged on every day: lighter days before, between and after, from a new day's first row", () => {
    const heavy = [...heavyDay(22), ...heavyDay(24), ...heavyDay(25)];
    const lightRows = [light(5, 10), light(17, 3), light(23, 9), light(27, 0), light(28, 23)];
    const firstOfNewDay = row({ ipHash: "ip-new", createdAt: ist(1, 0, 5), path: "/exams/SSC_CGL/pyq/new" }); // 1 Oct 00:05 IST
    const v = readerVerdict([...heavy, ...lightRows, firstOfNewDay]);
    expect(v.days.size).toBe(3);
    expect([...v.agents]).toEqual(["ua-reader"]);
    for (const r of [...lightRows, firstOfNewDay]) expect(v.ids.has(r.id), r.createdAt.toISOString()).toBe(true);
  });

  it("not before the 3rd convicted day: 2 days convict only themselves and the day after", () => {
    const heavy = [...heavyDay(22), ...heavyDay(24)];
    const lightRows = [light(5, 10), light(23, 9), light(27, 0)];
    const v = readerVerdict([...heavy, ...lightRows]);
    expect(v.days.size).toBe(2);
    expect(v.agents.size).toBe(0);
    expect(v.ids.has(lightRows[0].id)).toBe(false); // 5 Sep
    expect(v.ids.has(lightRows[1].id)).toBe(true); // 23 Sep, the day after 22 Sep
    expect(v.ids.has(lightRows[2].id)).toBe(false); // 27 Sep
  });

  it("memory never reaches entry pages, other agents, or rows with an identity, a referrer or a tag", () => {
    const heavy = [...heavyDay(22), ...heavyDay(24), ...heavyDay(25)];
    const keep = [
      light(10, 9, "/"),
      light(10, 9, "/exams/SSC_CGL"),
      row({ createdAt: sep(10, 9), uaHash: "ua-other" }),
      row({ createdAt: sep(10, 9), anonId: "a1" }),
      row({ createdAt: sep(10, 9), userId: "u1" }),
      row({ createdAt: sep(10, 9), refHost: "www.google.com" }),
      row({ createdAt: sep(10, 9), utmSource: "chatgpt.com" }),
      row({ createdAt: sep(10, 9), kind: "CTA_CLICKED" }),
      row({ createdAt: sep(10, 9), ipHash: null }),
      row({ createdAt: sep(10, 9), client: "bot", retroTag: "ua-sweep-2026-09-10" }),
    ];
    const v = readerVerdict([...heavy, ...keep]);
    expect(v.agents.size).toBe(1);
    for (const r of keep) expect(v.ids.has(r.id), JSON.stringify({ p: r.path, ua: r.uaHash, k: r.kind })).toBe(false);
  });

  it("its own tags keep the memory (a verdict never flips on its own tags)", () => {
    const rows = [...heavyDay(22), ...heavyDay(24), ...heavyDay(25), light(5, 10)].map((r) => ({ ...r, client: "bot", retroTag: "deep-reader-2026-10-03" }));
    const v = readerVerdict(rows);
    expect(v.agents.size).toBe(1);
    expect(v.ids.size).toBe(rows.length);
  });
});

describe("deep-reader rule — the SQL says the same", () => {
  const ids = readerQualifyingIdsSql();
  const sql = ids.sql.replace(/\s+/g, " ");

  it("pool: identity-less page views with no referrer and no tag, browser rows or its own tags", () => {
    expect(sql).toContain(`WHERE kind = 'PAGE_VIEW' AND "userId" IS NULL AND "anonId" IS NULL AND "refHost" IS NULL AND "utmSource" IS NULL AND "uaHash" IS NOT NULL AND "ipHash" IS NOT NULL`);
    expect(sql).toContain(`(client = 'browser' OR (client = 'bot' AND props->>'retroTag' LIKE ?))`);
    expect(ids.values).toEqual(["deep-reader%"]);
    expect(sql).toContain(`NOT ${entryPathSql("path")} AS deep, split_part(COALESCE(path,''),'?',1) AS page`);
  });

  it("days and hours are IST; the thresholds are the constants", () => {
    expect(sql).toContain(`("createdAt" + interval '330 minutes')::date AS d`);
    expect(sql).toContain(`EXTRACT(HOUR FROM "createdAt" + interval '330 minutes') AS h`);
    expect(sql).toContain(
      `HAVING COUNT(DISTINCT ip) >= ${READER_MIN_IPS} AND COUNT(DISTINCT h) >= ${READER_MIN_HOURS} AND COUNT(*) FILTER (WHERE deep) >= ${READER_MIN_DEEP_PER_IP} * COUNT(DISTINCT ip) AND COUNT(DISTINCT page) FILTER (WHERE deep) >= ${READER_MIN_DISTINCT_PAGE_SHARE} * COUNT(*) FILTER (WHERE deep)`,
    );
    expect(sql).toContain(`reader_agents AS ( SELECT ua FROM reader_days GROUP BY ua HAVING COUNT(*) >= ${READER_MEMORY_MIN_DAYS} )`);
  });

  it("tags deep pages of a remembered agent on any day, of a convicted day, and of the next day", () => {
    expect(sql).toContain(
      "WHERE rp.deep AND ( rp.ua IN (SELECT ua FROM reader_agents) OR EXISTS (SELECT 1 FROM reader_days rd WHERE rd.ua = rp.ua AND (rd.d = rp.d OR rd.d = rp.d - 1)) )",
    );
    expect(readerDaysCountSql().sql.replace(/\s+/g, " ")).toContain("SELECT (SELECT COUNT(*) FROM reader_days)::int AS n, (SELECT COUNT(*) FROM reader_agents)::int AS agents");
  });
});

// ── runBotScrub through a recording client ─────────────────────────────

function recorder(convicted: string[] = []) {
  const log: { op: "query" | "execute"; sql: string; values: unknown[] }[] = [];
  const assemble = (q: TemplateStringsArray, v: unknown[]) => {
    let sql = "";
    const values: unknown[] = [];
    q.forEach((s, i) => {
      sql += s;
      if (i >= v.length) return;
      const x = v[i] as { sql?: string; values?: unknown[] } | unknown;
      if (x && typeof x === "object" && "sql" in (x as object)) {
        sql += (x as { sql: string }).sql;
        values.push(...((x as { values?: unknown[] }).values ?? []));
      } else {
        sql += "?";
        values.push(x);
      }
    });
    return { sql, values };
  };
  const client = {
    $queryRaw: async <T,>(q: TemplateStringsArray, ...v: unknown[]): Promise<T> => {
      const a = assemble(q, v);
      log.push({ op: "query", ...a });
      if (a.sql.includes("FROM reader_days")) return [{ n: 2, agents: 1 }] as T;
      return convicted.map((uaHash) => ({ uaHash })) as T;
    },
    $executeRaw: async (q: TemplateStringsArray, ...v: unknown[]): Promise<number> => {
      const a = assemble(q, v);
      log.push({ op: "execute", ...a });
      return a.sql.includes("deep-reader") || a.values.some((x) => typeof x === "string" && x.startsWith("deep-reader")) ? 7 : 1;
    },
  };
  return { client, log };
}

describe("runBotScrub", () => {
  it("runs the reader rule every time — restore, then tag — after the botnet tagging and before the redirects", async () => {
    const { client, log } = recorder(["ua-botnet"]);
    const r = await runBotScrub(client);
    const execs = log.filter((l) => l.op === "execute").map((l) => l.sql.replace(/\s+/g, " "));
    const at = (pred: (s: string) => boolean) => execs.findIndex(pred);
    const botnetTag = at((s) => s.includes(`WHERE kind = 'PAGE_VIEW' AND client = 'browser' AND "userId" IS NULL AND "anonId" IS NULL AND "refHost" IS NULL AND "uaHash" = ANY(`));
    const readerRestore = at((s) => s.includes("SET client = 'browser'") && s.includes("id NOT IN ("));
    const readerTag = at((s) => s.includes("SET client = 'bot'") && s.includes("WHERE client = 'browser' AND id IN ("));
    const redirectTag = at((s) => s.includes(`l.client = 'browser' AND split_part(COALESCE(l.path,''),'?',1) = '/login'`));
    expect(botnetTag).toBeGreaterThan(-1);
    expect(readerRestore).toBeGreaterThan(botnetTag);
    expect(readerTag).toBeGreaterThan(readerRestore);
    expect(redirectTag).toBeGreaterThan(readerTag);
    expect(r).toMatchObject({ readerDays: 2, readerAgents: 1, readerTagged: 7, readerRestored: 7, convicted: 1 });
    // The reader tag is deep-reader-<UTC date>; the restore only touches its own tags.
    const tagValues = log[log.findIndex((l) => l.op === "execute" && l.sql.includes("WHERE client = 'browser' AND id IN ("))].values;
    expect(tagValues.some((v) => typeof v === "string" && /^deep-reader-\d{4}-\d{2}-\d{2}$/.test(v))).toBe(true);
    expect(execs[readerRestore]).toContain("props->>'retroTag' LIKE ?");
  });

  it("the botnet rule's verdict ignores the reader rule: its pool keeps rows the reader rule tagged", async () => {
    const { client, log } = recorder([]);
    await runBotScrub(client);
    const conviction = log.find((l) => l.op === "query" && l.sql.includes(`GROUP BY "uaHash"`))!;
    expect(conviction.sql.replace(/\s+/g, " ")).toContain(`(client = 'browser' OR (client = 'bot' AND (props->>'retroTag' LIKE 'ua-sweep%' OR props->>'retroTag' LIKE ?)))`);
    expect(conviction.values).toContain("deep-reader%");
  });

  it("with no botnet convicted, the reader rule still runs and nothing else tags", async () => {
    const { client, log } = recorder([]);
    const r = await runBotScrub(client);
    expect(r).toMatchObject({ convicted: 0, tagged: 0, beacons: 0, redirects: 0, readerDays: 2, readerTagged: 7 });
    expect(log.some((l) => l.sql.includes("WHERE client = 'browser' AND id IN ("))).toBe(true);
  });

  it("only tags and restores: no DELETE, no INSERT, and every UPDATE keeps an audit tag", async () => {
    const { client, log } = recorder(["ua-botnet"]);
    await runBotScrub(client);
    for (const l of log) expect(l.sql).not.toMatch(/\bDELETE\b|\bINSERT\b|\bTRUNCATE\b/i);
    for (const l of log.filter((x) => x.op === "execute" && x.sql.includes("SET client = 'bot'"))) expect(l.sql).toContain("jsonb_build_object('retroTag'");
  });
});
