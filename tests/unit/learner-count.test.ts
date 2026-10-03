// Who counts as ONE learner on the live strip (3 Oct 2026,
// src/lib/learner-count.ts): a new account and its pre-sign-in browser id are
// one person; identity-less landings are devices per IST day, not page views;
// tagged bots never count; the groups' "today" numbers still add up to "+N
// today". No DB: the rules' JS mirror (countLearners) runs on synthetic rows,
// and the SQL the strip runs is pinned to the same fragments.
// scripts/tmp-strip-5.ts checked the real SQL on production (3 Oct 2026,
// 12:02 IST): getLiveCounts 14,902 / +97 = the decomposition, and the section
// groups summed to 14,902 / +97.
// Run: npx vitest run tests/unit/learner-count.test.ts

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  CHILD_PATH_RE,
  GAP_ERA_FROM,
  SIGNUP_LINK_CTE,
  countLearners,
  landingKey,
  landingKeySql,
  personKeySql,
  signupLinks,
  walkInWhereSql,
  type LearnerRow,
} from "@/lib/learner-count";
import { isUnder13SchoolPath } from "@/lib/school/student-classes";
import { foldSectionRows, learnerSectionsSql, LEARNER_SECTIONS } from "@/lib/learner-sections";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const squash = (s: string) => s.replace(/\s+/g, " ");

let seq = 0;
/** IST wall time on day d of Oct 2026 → UTC instant. */
const ist = (d: number, h: number, m = 0) => new Date(Date.UTC(2026, 9, d, h, m) - 5.5 * 3600_000);
const DAY3 = ist(3, 0); // 00:00 IST 3 Oct 2026
function pv(over: Partial<LearnerRow> & { createdAt: Date }): LearnerRow {
  return {
    id: `e${++seq}`,
    kind: "PAGE_VIEW",
    userId: null,
    anonId: null,
    refHost: null,
    utmSource: null,
    uaHash: null,
    ipHash: null,
    client: "browser",
    path: "/exams/SSC_CGL/pyq",
    ...over,
  };
}
const signup = (anonId: string, userId: string, at: Date): LearnerRow => pv({ kind: "SIGNUP", anonId, userId, createdAt: at, client: null, path: "/login" });
/** A device's first, identity-less view (fingerprinted era). */
const land = (ip: string, at: Date, extra: Partial<LearnerRow> = {}) => pv({ ipHash: ip, uaHash: "ua-1", createdAt: at, ...extra });

describe("one person, one key: a new account merges with its pre-sign-in browser id", () => {
  it("a guest who signs up is one learner, not two", () => {
    const rows = [
      pv({ anonId: "a1", refHost: "chatgpt.com", createdAt: ist(3, 9) }),
      pv({ anonId: "a1", createdAt: ist(3, 9, 2) }),
      signup("a1", "u1", ist(3, 9, 5)),
      pv({ userId: "u1", createdAt: ist(3, 9, 6) }),
      pv({ userId: "u1", createdAt: ist(3, 9, 7) }),
    ];
    const c = countLearners(rows, DAY3);
    expect(c.total).toBe(1);
    expect(c.today).toBe(1);
    // The old rule (no merge) saw two.
    const old = countLearners(rows.filter((r) => r.kind !== "SIGNUP"), DAY3);
    expect(old.total).toBe(2);
  });

  it("a guest already counted before midnight who signs up today adds nothing today", () => {
    const rows = [
      pv({ anonId: "a2", refHost: "www.google.com", createdAt: ist(2, 20) }),
      signup("a2", "u2", ist(3, 10)),
      pv({ userId: "u2", createdAt: ist(3, 10, 1) }),
      pv({ userId: "u2", createdAt: ist(3, 10, 2) }),
    ];
    expect(countLearners(rows, DAY3)).toMatchObject({ total: 1, today: 0 });
  });

  it("the first account a browser made wins (the stats scripts' DISTINCT ON rule)", () => {
    const rows = [signup("a3", "u-late", ist(3, 12)), signup("a3", "u-first", ist(3, 11))];
    expect(signupLinks(rows).get("a3")).toBe("u-first");
    expect(SIGNUP_LINK_CTE).toMatch(/SELECT DISTINCT ON \(s\."anonId"\) s\."anonId", s\."userId"/);
    expect(squash(SIGNUP_LINK_CTE)).toContain(`WHERE s.kind = 'SIGNUP' AND s."anonId" IS NOT NULL AND s."userId" IS NOT NULL ORDER BY s."anonId", s."createdAt")`);
  });

  it("an account that signed in later on a browser id it did not sign up from is not merged (no SIGNUP link)", () => {
    const rows = [pv({ anonId: "a4", refHost: "bing.com", createdAt: ist(3, 9) }), pv({ userId: "u4", refHost: "bing.com", createdAt: ist(3, 9, 30) })];
    expect(countLearners(rows, DAY3).total).toBe(2);
  });

  it("a SIGNUP row without a browser id (every one before 11 Sep 2026) cannot merge — and the header says so", () => {
    const aug = (d: number, m: number) => new Date(Date.UTC(2026, 7, d, 6, m));
    const rows = [
      pv({ anonId: "a5", refHost: "www.google.com", createdAt: aug(20, 0) }),
      pv({ anonId: "a5", createdAt: aug(20, 1) }),
      pv({ kind: "SIGNUP", anonId: null, userId: "u5", createdAt: aug(20, 2), client: null, path: "/login" }),
      pv({ userId: "u5", createdAt: aug(20, 3) }),
      pv({ userId: "u5", createdAt: aug(20, 4) }),
    ];
    expect(signupLinks(rows).size).toBe(0);
    expect(countLearners(rows, DAY3).total).toBe(2); // the residual double count, stated, not hidden
    const header = squash(read("src/lib/learner-count.ts"));
    expect(header).toContain("ONLY FOR ACCOUNTS MADE SINCE 11 SEP 2026");
    expect(header).toContain("an estimated 660 to 1,030 people counted");
  });
});

describe("identity-less landings count as devices, one per IST day", () => {
  it("five pages from one device in a day are one learner; the next IST day is another", () => {
    const rows = [0, 1, 2, 3, 4].map((i) => land("ip-1", ist(3, 9, i)));
    expect(countLearners(rows, DAY3)).toMatchObject({ total: 1, today: 1, walkIns: 1 });
    const two = [...rows, land("ip-1", ist(4, 9))];
    expect(countLearners(two, DAY3).total).toBe(2);
  });

  it("a device is address + user agent: two agents behind one address are two", () => {
    const rows = [land("ip-1", ist(3, 9)), land("ip-1", ist(3, 9, 1), { uaHash: "ua-2" })];
    expect(countLearners(rows, DAY3).walkIns).toBe(2);
  });

  it("the day is the IST day: 23:59 and 00:01 IST are two days", () => {
    const rows = [land("ip-1", new Date("2026-10-02T18:29:00Z")), land("ip-1", new Date("2026-10-02T18:31:00Z"))];
    const c = countLearners(rows, DAY3);
    expect(c.walkIns).toBe(2);
    expect(c.walkInsToday).toBe(1);
    expect(landingKey(rows[0])).toBe("d20261002:ip-1:ua-1");
    expect(landingKey(rows[1])).toBe("d20261003:ip-1:ua-1");
  });

  it("tagged bots never count (ingest-tagged or scrub-tagged)", () => {
    const rows = [land("ip-1", ist(3, 9), { client: "bot" }), land("ip-2", ist(3, 9))];
    expect(countLearners(rows, DAY3).walkIns).toBe(1);
  });

  it("Class 1-7 pages (no fingerprint by design): one per class page per IST day", () => {
    const c3 = (h: number, m: number, p = "/schooling/cbse/class-3/maths") => pv({ path: p, createdAt: ist(3, h, m) });
    const rows = [c3(9, 0), c3(9, 1, "/schooling/cbse/class-3/evs"), c3(15, 0), c3(9, 2, "/schooling/cbse/class-4"), pv({ path: "/schooling/cbse/class-3", createdAt: ist(4, 9) })];
    const c = countLearners(rows, DAY3);
    expect(c.walkIns).toBe(3); // cbse class-3 on 3 Oct, cbse class-4 on 3 Oct, cbse class-3 on 4 Oct
    expect(c.walkInsToday).toBe(3); // dayStart is 3 Oct 00:00 IST, so 4 Oct counts as "since midnight" here too
  });

  it("CHILD_PATH_RE agrees with the ingest's isUnder13SchoolPath", () => {
    const paths = ["/schooling/cbse/class-1", "/schooling/cbse/class-7/maths", "/schooling/x/class-7?y=1", "/schooling/cbse/class-8", "/schooling/cbse/class-10", "/schooling/cbse/class-1x", "/schooling/cbse", "/hi/schooling/cbse/class-3", "/schooling/a/class-3#t"];
    for (const p of paths) expect(new RegExp(CHILD_PATH_RE).test(p), p).toBe(isUnder13SchoolPath(p));
  });

  it("pre-fingerprint rows: one per row with a referrer, a tag or an entry page; a direct deep page is not counted", () => {
    const aug = (h: number) => new Date(Date.UTC(2026, 7, 10, h));
    const rows = [
      pv({ refHost: "www.google.com", createdAt: aug(5) }),
      pv({ refHost: "www.google.com", createdAt: aug(5) }),
      pv({ utmSource: "chatgpt.com", createdAt: aug(6) }),
      pv({ path: "/exams/SSC_CGL", createdAt: aug(7) }),
      pv({ path: "/", createdAt: aug(7) }),
      pv({ path: "/exams/SSC_CGL/topics/algebra", createdAt: aug(8) }),
    ];
    expect(countLearners(rows, DAY3).walkIns).toBe(5);
    expect(landingKey(rows[5])).toBeNull();
  });

  it("the gap-era overlap is still subtracted, on the merged person", () => {
    const rows = [
      pv({ refHost: "google.com", createdAt: new Date(Date.UTC(2026, 7, 5, 6)) }), // the gap-era landing (no id then)
      pv({ anonId: "g1", createdAt: new Date(Date.UTC(2026, 7, 5, 6, 1)) }),
      pv({ anonId: "g1", createdAt: new Date(Date.UTC(2026, 7, 5, 6, 2)) }),
    ];
    expect(Date.parse(GAP_ERA_FROM)).toBeLessThan(rows[1].createdAt.getTime());
    expect(countLearners(rows, DAY3)).toMatchObject({ engaged: 1, walkIns: 1, overlap: 1, total: 1 });
  });
});

describe("the groups' today numbers add up to +N today", () => {
  const SECTION = (p: string | null): string => {
    const s = p ?? "";
    if (s.startsWith("/schooling")) return "school";
    if (s.startsWith("/exams/NEET")) return "entrance";
    if (s.startsWith("/exams/")) return "govt";
    if (s.startsWith("/colleges")) return "college";
    return "exploring";
  };
  const PATHS = ["/", "/ask", "/exams/SSC_CGL", "/exams/SSC_CGL/pyq", "/exams/NEET_UG/mocks", "/schooling/cbse/class-9", "/schooling/cbse/class-3", "/colleges/iit", "/login"];

  it("on hand-made rows", () => {
    const rows = [
      pv({ anonId: "a1", refHost: "chatgpt.com", path: "/exams/SSC_CGL", createdAt: ist(3, 9) }),
      pv({ anonId: "a1", path: "/exams/NEET_UG/mocks", createdAt: ist(3, 9, 1) }),
      pv({ anonId: "a1", path: "/exams/NEET_UG/mocks", createdAt: ist(3, 9, 2) }),
      signup("a1", "u1", ist(3, 9, 3)),
      pv({ userId: "u1", path: "/schooling/cbse/class-9", createdAt: ist(3, 9, 4) }),
      land("ip-1", ist(3, 10), { path: "/colleges/iit" }),
      land("ip-1", ist(3, 10, 5), { path: "/colleges/iit/cutoffs" }),
      land("ip-1", ist(3, 10, 9), { path: "/exams/SSC_CGL/pyq" }),
      land("ip-2", ist(2, 10), { path: "/" }),
    ];
    const c = countLearners(rows, DAY3, SECTION);
    expect(c.today).toBe(2);
    const s = c.sections!;
    expect(s.entrance).toEqual({ total: 1, today: 1 }); // the merged person: 2 NEET views beat 1 govt + 1 school
    expect(s.college).toEqual({ total: 1, today: 1 }); // the device: 2 college pages beat 1 govt
    expect(s.exploring).toEqual({ total: 1, today: 0 }); // yesterday's device, home page only
    expect(Object.values(s).reduce((a, b) => a + b.today, 0)).toBe(c.today);
    expect(Object.values(s).reduce((a, b) => a + b.total, 0)).toBe(c.total);
  });

  it("randomised: 300 synthetic days, the sections always sum to the totals and to +today", () => {
    let seed = 11;
    const rnd = (n: number) => {
      seed = (seed * 48271) % 2147483647;
      return seed % n;
    };
    for (let t = 0; t < 300; t++) {
      const rows: LearnerRow[] = [];
      const n = 5 + rnd(60);
      for (let i = 0; i < n; i++) {
        const day = 1 + rnd(3); // 1–3 Oct; dayStart = 3 Oct
        const at = ist(day, rnd(24), rnd(60));
        const p = PATHS[rnd(PATHS.length)];
        const kind = rnd(10);
        if (kind < 3) rows.push(pv({ anonId: `a${rnd(8)}`, refHost: rnd(3) === 0 ? "google.com" : null, utmSource: rnd(5) === 0 ? "chatgpt.com" : null, path: p, createdAt: at }));
        else if (kind < 5) rows.push(pv({ userId: `u${rnd(5)}`, path: p, createdAt: at }));
        else if (kind < 6) rows.push(signup(`a${rnd(8)}`, `u${rnd(5)}`, at));
        else if (kind < 9) rows.push(land(`ip-${rnd(6)}`, at, { path: p, uaHash: `ua-${rnd(2)}`, client: rnd(8) === 0 ? "bot" : "browser" }));
        else rows.push(pv({ path: rnd(2) ? "/schooling/cbse/class-3" : p, createdAt: at })); // no fingerprint
      }
      const c = countLearners(rows, DAY3, SECTION);
      const s = Object.values(c.sections!);
      expect(s.reduce((a, b) => a + b.today, 0), `case ${t}`).toBe(c.engagedToday - c.overlapToday + c.walkInsToday);
      expect(s.reduce((a, b) => a + b.total, 0), `case ${t}`).toBe(c.engaged - c.overlap + c.walkIns);
      expect(c.today).toBe(Math.max(0, c.engagedToday - c.overlapToday + c.walkInsToday));
    }
  });

  it("foldSectionRows keeps the walk-in part keyed on devices (engaged + walk-ins − overlap per group)", () => {
    const out = foldSectionRows([
      { sec: "govt", part: "engaged", n: 10, today: 2 },
      { sec: "govt", part: "walkin", n: 4, today: 1 },
      { sec: "govt", part: "overlap", n: 1, today: 0 },
    ]);
    expect(out.govt).toEqual({ total: 13, today: 3 });
    expect(LEARNER_SECTIONS.length).toBe(7);
  });
});

describe("the SQL the strip runs uses these rules", () => {
  it("the landing key: device-day first, then the class page, then a pre-fingerprint row with a referrer, a tag or an entry page", () => {
    const sql = squash(landingKeySql("a"));
    const d = sql.indexOf(`WHEN a."ipHash" IS NOT NULL THEN 'd' || to_char(a."createdAt" + interval '330 minutes', 'YYYYMMDD') || ':' || a."ipHash" || ':' || COALESCE(a."uaHash", '')`);
    const c = sql.indexOf(`WHEN COALESCE(a.path, '') ~ '${CHILD_PATH_RE}' THEN 'c'`);
    const r = sql.indexOf(`WHEN a."refHost" IS NOT NULL OR a."utmSource" IS NOT NULL OR (split_part(COALESCE(a.path,''),'?',1) IN (`);
    expect(d).toBeGreaterThan(-1);
    expect(c).toBeGreaterThan(d);
    expect(r).toBeGreaterThan(c);
    expect(sql).not.toMatch(/ELSE/); // anything else: NULL, not counted
    expect(walkInWhereSql("a")).toBe(`a.kind = 'PAGE_VIEW' AND a."client" = 'browser' AND a."userId" IS NULL AND a."anonId" IS NULL`);
    expect(personKeySql("e")).toBe(`COALESCE(e."userId", sig."userId", e."anonId")`);
  });

  it("live-counts-server.ts: walk-ins count DISTINCT landing keys, never rows; every person query merges through sig", () => {
    const src = squash(read("src/lib/live-counts-server.ts"));
    expect(src.match(/SELECT COUNT\(DISTINCT \$\{Prisma\.raw\(landingKeySql\("a"\)\)\}\)::bigint AS count FROM "AnalyticsEvent" a WHERE \$\{Prisma\.raw\(walkInWhereSql\("a"\)\)\}/g)?.length).toBe(2);
    expect(src).not.toMatch(/SELECT COUNT\(\*\)::bigint AS count FROM "AnalyticsEvent" WHERE kind = 'PAGE_VIEW' AND "client" = 'browser'/);
    expect(src.match(/WITH \$\{Prisma\.raw\(SIGNUP_LINK_CTE\)\}/g)?.length).toBe(3); // humans, gap-era overlap, learners today
    expect(src).toContain(") humans");
    expect(src).toContain(") gap_era_engaged");
    expect(src).toContain(") learners_today");
  });

  it("public-numbers.ts: the weekly 'People who came' column counts the strip's keys, never page views (review, 3 Oct 2026)", () => {
    const src = squash(read("src/lib/public-numbers.ts"));
    const start = src.indexOf("export function weeklyPeopleSql(");
    const fn = src.slice(start, src.indexOf("/** ADMIN_EMAILS", start));
    expect(start).toBeGreaterThan(-1);
    expect(fn).toContain("WITH ${Prisma.raw(SIGNUP_LINK_CTE)}, human AS (${HUMAN_PERSONS}),");
    expect(fn).toContain('SELECT ${istWeek(`e."createdAt"`)} AS wk, ${Prisma.raw(personKeySql("e"))} AS k FROM "AnalyticsEvent" e ${Prisma.raw(signupJoinSql("e"))}');
    expect(fn).toContain(`WHERE e.kind = 'PAGE_VIEW' AND (e."client" IS NULL OR e."client" <> 'bot')`);
    expect(fn).toContain('COUNT(DISTINCT ${Prisma.raw(landingKeySql("a"))}) AS n FROM "AnalyticsEvent" a WHERE ${Prisma.raw(walkInWhereSql("a"))}');
    expect(fn).not.toMatch(/COUNT\(\*\) AS n FROM "AnalyticsEvent"/);
    // HUMAN_PERSONS is the counter's own HAVING on the merged person.
    expect(src).toContain('const HUMAN_PERSONS = Prisma.sql` SELECT ${Prisma.raw(personKeySql("e"))} AS k FROM "AnalyticsEvent" e ${Prisma.raw(signupJoinSql("e"))} WHERE e.kind = \'PAGE_VIEW\' AND COALESCE(e."userId", e."anonId") IS NOT NULL GROUP BY 1 ${Prisma.raw(HUMAN_RULE_HAVING)}`;');
    // The weekly read runs it; the old inline row count is gone.
    expect(src).toContain("prisma.$queryRaw<WkN[]>(weeklyPeopleSql(from, to, team))");
    expect(src).not.toContain(`walk AS ( SELECT \${istWeek(\`"createdAt"\`)} AS wk, COUNT(*) AS n`);
  });

  it("the weekly column's public definition states the same keys", async () => {
    const { WEEKLY_COLUMNS } = await import("@/lib/public-numbers-rules");
    const def = WEEKLY_COLUMNS.find((c) => c.key === "peopleWhoCame")!.definition;
    expect(def).toContain("a new account and the browser id it signed up from are one person for accounts made since 11 Sep 2026");
    expect(def).toContain("counted once per device per IST day");
    expect(def).toContain("The home page strip calls this counter 'learners'.");
    expect(def).not.toContain("page views by verified browsers");
  });

  it("learner-sections.ts: the same person key and landing key; a device goes to its most-viewed section", () => {
    const sql = squash(learnerSectionsSql(new Date("2026-10-02T18:30:00Z")).sql);
    expect(sql).toContain(`WITH ${squash(SIGNUP_LINK_CTE)}, pv AS MATERIALIZED (`);
    expect(sql).toContain(`SELECT ${personKeySql("a")} AS k, CASE WHEN ${walkInWhereSql("a")} THEN ${squash(landingKeySql("a"))} END AS lk`);
    expect(sql).toContain(`FROM "AnalyticsEvent" a LEFT JOIN sig ON sig."anonId" = a."anonId" WHERE a.kind = 'PAGE_VIEW'`);
    expect(sql).toContain("SELECT DISTINCT ON (lk) lk, sec FROM wsecs ORDER BY lk, n DESC, last_at DESC");
    expect(sql).toContain("SELECT sec, 'walkin', COUNT(*)::int, COUNT(*) FILTER (WHERE today)::int FROM walkins GROUP BY sec");
  });
});
