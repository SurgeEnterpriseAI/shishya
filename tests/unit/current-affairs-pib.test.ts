// Past current-affairs days filled only from PIB's own list of that day's
// releases (6 Oct 2026, B2): src/lib/current-affairs-pib.ts and
// scripts/backfill-current-affairs-pib.ts. The list must show the date asked
// for and match its own count; every release is read on its page and kept
// only when posted that day under the listed headline; fewer than
// MIN_BACKFILL_ITEMS kept leaves the day empty; today and later, and any day
// on or after the newest daily-digest day, are never touched; only
// www.pib.gov.in is read; a dry run writes nothing; --apply writes only a
// plan file a dry run saved (re-checked row by row, PIB not read again), the
// undo log before the first insert and each day in its own locked
// transaction, only while it has no rows; --undo tries every logged row. No
// AI module is loaded. No network, no DB: fetch and the DB are fakes.

import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  MIN_BACKFILL_ITEMS,
  PIB_ALL_RELEASES_URL,
  PIB_CATEGORY,
  checkPibPlanFile,
  isPibBackfillDay,
  listingProblem,
  newestDigestProblem,
  parsePibListing,
  parsePibRelease,
  pibReleaseUrl,
  pibSummary,
  planPibDay,
  releaseProblem,
  sameHeadline,
  type PibListing,
  type PibRelease,
} from "@/lib/current-affairs-pib";
import { daysBetween, parseArgs, run, type Db } from "../../scripts/backfill-current-affairs-pib";

type Group = [ministry: string, releases: [prid: string, title: string][]];

/** PIB's "All releases" page as served on 6 Oct 2026, cut down to what is read. */
function listingHtml(shows: string, groups: Group[], displayed?: number): string {
  const [y, m, d] = shows.split("-").map(Number);
  const n = displayed ?? groups.reduce((s, g) => s + g[1].length, 0);
  const body = groups
    .map(
      ([ministry, rs]) =>
        `<ul><li><h3 class='font104'>${ministry}</h3><ul class='num'>` +
        rs.map(([prid, t]) => `<li><a title='${t}' href='/PressReleaseDetail.aspx?PRID=${prid}' target="_blank">${t.replace(/<[^>]+>/g, "")} </a></li>`).join("") +
        `</ul></li></ul>`,
    )
    .join("");
  return `<form><input type="hidden" name="__VIEWSTATE" id="__VIEWSTATE" value="vs+/=1" />
<input type="hidden" name="__EVENTVALIDATION" id="__EVENTVALIDATION" value="ev2" />
<select name="ctl00$ContentPlaceHolder1$ddlday" id="ContentPlaceHolder1_ddlday"><option value="1">1</option>
	<option selected="selected" value="${d}">${d}</option></select>
<select name="ctl00$ContentPlaceHolder1$ddlMonth" id="ContentPlaceHolder1_ddlMonth"><option selected="selected" value="${m}">Month</option></select>
<select name="ctl00$ContentPlaceHolder1$ddlYear" id="ContentPlaceHolder1_ddlYear"><option selected="selected" value="${y}">${y}</option></select>
<div class="search_box_result" aria-level="2" role="heading">Displaying  ${n} Press Releases  <span id="ContentPlaceHolder1_lblDate"></span>  </div>
<div class="content-area">${body}</div></form>`;
}

/** A release page: og:title and the "Posted On" line as PIB prints them. */
function releaseHtml(title: string, posted: string): string {
  return `<html><head><meta property="og:title" content="${title.replace(/"/g, "&quot;")}" /></head><body>
<div class="ReleaseDateSubHeaddateTime text-center pt20">Posted On:
                ${posted}
                        </div></body></html>`;
}

const DAY = "2026-09-11";
const TODAY = "2026-10-06";
/** The newest day the daily digest has stored (5 Oct 2026 when this was written). */
const NEWEST = "2026-10-05";
const three: Group[] = [
  ["Prime Minister's Office", [["101", "Prime Minister meets with UN Secretary-General on the sidelines of the BRICS Summit"]]],
  ["Ministry of Coal", [["102", "Facts on Auction of Tara (Revised) Coal Block"], ["103", "Monsoon Resilience: Captive Mines Delivering Growth"]]],
];
const pagesFor = (groups: Group[], posted = "11 SEP 2026 5:31PM by PIB Delhi") =>
  new Map<string, PibRelease | { error: string }>(groups.flatMap(([, rs]) => rs.map(([p, t]) => [p, parsePibRelease(releaseHtml(t, posted))] as const)));

describe("parsePibListing / listingProblem: the list must be the day asked for, complete", () => {
  it("reads the day shown, PIB's own count, and each release with its ministry", () => {
    const l = parsePibListing(listingHtml(DAY, three));
    expect(l.shows).toBe(DAY);
    expect(l.displayed).toBe(3);
    expect(l.releases).toEqual([
      { prid: "101", ministry: "Prime Minister's Office", title: "Prime Minister meets with UN Secretary-General on the sidelines of the BRICS Summit" },
      { prid: "102", ministry: "Ministry of Coal", title: "Facts on Auction of Tara (Revised) Coal Block" },
      { prid: "103", ministry: "Ministry of Coal", title: "Monsoon Resilience: Captive Mines Delivering Growth" },
    ]);
    expect(listingProblem(DAY, l)).toBeNull();
  });

  it("reads a release whose title attribute holds markup (15 and 25 Sep: <i>suo motu</i>)", () => {
    const l = parsePibListing(listingHtml(DAY, [["National Human Rights Commission", [["201", "NHRC, India takes <i>suo motu</i> cognizance of a report"]]]]));
    expect(l.releases).toEqual([{ prid: "201", ministry: "National Human Rights Commission", title: "NHRC, India takes suo motu cognizance of a report" }]);
    expect(listingProblem(DAY, l)).toBeNull();
  });

  it("PIB ignored the postback and showed today → the day is not used", () => {
    expect(listingProblem(DAY, parsePibListing(listingHtml(TODAY, three)))).toBe(`PIB's page showed ${TODAY}, not ${DAY}`);
  });

  it("PIB's count differs from the releases read → the day is not used", () => {
    expect(listingProblem(DAY, parsePibListing(listingHtml(DAY, three, 4)))).toBe("PIB's page counts 4 releases but 3 were read");
  });

  it("no count, no date or no release → the day is not used", () => {
    expect(listingProblem(DAY, { shows: DAY, displayed: null, releases: [] })).toBe("PIB's page gave no release count");
    expect(listingProblem(DAY, parsePibListing("<html></html>"))).toBe(`PIB's page showed no readable date, not ${DAY}`);
    expect(listingProblem(DAY, { shows: DAY, displayed: 0, releases: [] })).toBe("PIB lists no release for the day");
  });
});

describe("parsePibRelease / releaseProblem: each release read on its own page", () => {
  it("reads 'Posted On' (date, time, who) and og:title", () => {
    expect(parsePibRelease(releaseHtml("A “quoted” headline & more", "11 SEP 2026 5:31PM by PIB Delhi"))).toEqual({
      postedOn: "2026-09-11",
      postedTime: "5:31 PM",
      postedBy: "PIB Delhi",
      title: "A “quoted” headline & more",
    });
    expect(parsePibRelease("<html>nothing</html>")).toEqual({ postedOn: null, postedTime: null, postedBy: null, title: null });
  });

  const listed = { prid: "101", ministry: "Prime Minister's Office", title: three[0][1][0][1] };
  it("kept: posted that day under the listed headline", () => {
    expect(releaseProblem(DAY, listed, parsePibRelease(releaseHtml(listed.title, "11 SEP 2026 5:31PM by PIB Delhi")))).toBeNull();
  });
  it("dropped: posted on another day", () => {
    expect(releaseProblem(DAY, listed, parsePibRelease(releaseHtml(listed.title, "10 SEP 2026 11:02PM by PIB Delhi")))).toBe("posted on 2026-09-10");
  });
  it("dropped: the page's headline is another one", () => {
    expect(releaseProblem(DAY, listed, parsePibRelease(releaseHtml("Something else entirely", "11 SEP 2026 5:31PM by PIB Delhi")))).toBe(
      "release page headline differs from the list",
    );
  });
  it("dropped: a generic headline, or a page that was not read", () => {
    const generic = { ...listed, title: "PRESS RELEASE" };
    expect(releaseProblem(DAY, generic, parsePibRelease(releaseHtml("PRESS RELEASE", "11 SEP 2026 5:31PM by PIB Delhi")))).toBe("generic headline");
    expect(releaseProblem(DAY, listed, { error: "HTTP 503" })).toBe("release page not read (HTTP 503)");
  });
  it("a headline the list cut short with '...' (3 Oct) matches the page's full headline; a short or wrong prefix does not", () => {
    const full = "Central Bureau of Narcotics observes National Anti-Drug Addiction Day on the birth anniversary of the Father of the Nation";
    expect(sameHeadline(full, "Central Bureau of Narcotics observes National Anti-Drug Addiction Day on the birth anniversary of the Father of the ...")).toBe(true);
    expect(sameHeadline(full, "Central ...")).toBe(false);
    expect(sameHeadline(full, "Central Bureau of Narcotics observes Something Else ...")).toBe(false);
    expect(sameHeadline("India’s coast.", "india's   coast")).toBe(true);
  });
});

describe("planPibDay: a past empty day is filled only with what PIB states", () => {
  const listing = parsePibListing(listingHtml(DAY, three));
  const plan = (o: Partial<Parameters<typeof planPibDay>[0]> = {}) =>
    planPibDay({ date: DAY, todayIst: TODAY, existingRows: 0, newestDigestDay: NEWEST, listing, pages: pagesFor(three), ...o });

  it("fills: PIB's headline, a summary that only restates the release page, no tags, the release link", () => {
    const p = plan();
    expect(p.action).toBe("fill");
    expect(p.rows).toHaveLength(3);
    expect(p.rows[0]).toEqual({
      date: DAY,
      title: "Prime Minister meets with UN Secretary-General on the sidelines of the BRICS Summit",
      summary:
        "Prime Minister's Office: press release posted by PIB Delhi on 11 Sep 2026 at 5:31 PM. Headline as PIB gives it; Shishya has not summarised it. Full text at the source link.",
      category: PIB_CATEGORY,
      examTags: [],
      whyItMatters: null,
      source: "https://www.pib.gov.in/PressReleasePage.aspx?PRID=101&reg=3&lang=1",
    });
    expect(isPibBackfillDay(p.rows)).toBe(true);
  });

  it("stores the release page's full headline when the list cut it short", () => {
    const full = "Central Bureau of Narcotics observes National Anti-Drug Addiction Day on the birth anniversary of the Father of the Nation";
    const g: Group[] = [...three, ["Ministry of Finance", [["104", "Central Bureau of Narcotics observes National Anti-Drug Addiction Day on the birth anniversary of the Father of the ..."]]]];
    const pages = pagesFor(three);
    pages.set("104", parsePibRelease(releaseHtml(full, "11 SEP 2026 6:00PM by PIB Delhi")));
    const p = planPibDay({ date: DAY, todayIst: TODAY, existingRows: 0, newestDigestDay: NEWEST, listing: parsePibListing(listingHtml(DAY, g)), pages });
    expect(p.rows.map((r) => r.title)).toContain(full);
  });

  it("never today or a later day (the cron writes today)", () => {
    expect(plan({ date: TODAY })).toMatchObject({ action: "leave-empty", rows: [] });
    expect(plan({ date: "2026-10-07" }).reason).toMatch(/not a past day/);
  });

  it("never a day that already has rows", () => {
    expect(plan({ existingRows: 12 })).toMatchObject({ action: "leave-empty", reason: "the day already has 12 row(s)" });
  });

  it("no readable list → left empty, saying why", () => {
    expect(plan({ listing: null, listingError: "list page GET answered HTTP 403" })).toMatchObject({
      action: "leave-empty",
      reason: "PIB's list was not read (list page GET answered HTTP 403)",
    });
  });

  it(`fewer than ${MIN_BACKFILL_ITEMS} releases kept → left empty`, () => {
    const pages = pagesFor(three, "10 SEP 2026 9:00PM by PIB Delhi"); // every page says another day
    pages.set("101", parsePibRelease(releaseHtml(three[0][1][0][1], "11 SEP 2026 5:31PM by PIB Delhi")));
    const p = plan({ pages });
    expect(p.action).toBe("leave-empty");
    expect(p.reason).toBe(`1 release(s) kept of 3; at least ${MIN_BACKFILL_ITEMS} are needed`);
    expect(p.dropped).toHaveLength(2);
  });

  it("a repeated headline is kept once", () => {
    const g: Group[] = [...three, ["Ministry of Culture", [["105", "Facts on Auction of Tara (Revised) Coal Block"]]]];
    const p = planPibDay({ date: DAY, todayIst: TODAY, existingRows: 0, newestDigestDay: NEWEST, listing: parsePibListing(listingHtml(DAY, g)), pages: pagesFor(g) });
    expect(p.rows).toHaveLength(3);
    expect(p.dropped).toEqual([{ prid: "105", title: "Facts on Auction of Tara (Revised) Coal Block", reason: "same headline as an earlier release that day" }]);
  });

  it("the summary names no time or poster PIB did not print", () => {
    expect(pibSummary("AYUSH", { postedOn: DAY, postedTime: null, postedBy: null, title: "x" })).toBe(
      "AYUSH: press release on 11 Sep 2026. Headline as PIB gives it; Shishya has not summarised it. Full text at the source link.",
    );
  });
});
describe("the newest stored day stays a daily-digest day", () => {
  it("newestDigestProblem: only days before the newest digest day may be filled", () => {
    expect(newestDigestProblem("2026-10-03", NEWEST)).toBeNull();
    expect(newestDigestProblem(NEWEST, NEWEST)).toMatch(/^not before the newest digest day \(2026-10-05\)/);
    expect(newestDigestProblem("2026-10-06", NEWEST)).toMatch(/not before the newest digest day/);
    expect(newestDigestProblem("2026-09-11", null)).toBe("the daily digest has stored no day yet");
  });

  it("planPibDay leaves a day on or after the newest digest day empty, whatever PIB lists", () => {
    const listing = parsePibListing(listingHtml(DAY, three));
    const p = planPibDay({ date: DAY, todayIst: TODAY, existingRows: 0, newestDigestDay: "2026-09-10", listing, pages: pagesFor(three) });
    expect(p).toMatchObject({ action: "leave-empty", rows: [] });
    expect(p.reason).toMatch(/not before the newest digest day \(2026-09-10\)/);
  });
});

describe("checkPibPlanFile: --apply writes only a plan file whose every row is the shape planPibDay makes", () => {
  const listing = parsePibListing(listingHtml(DAY, three));
  const good = () => ({
    todayIst: TODAY,
    plans: [
      planPibDay({ date: DAY, todayIst: TODAY, existingRows: 0, newestDigestDay: NEWEST, listing, pages: pagesFor(three) }),
      { date: "2026-09-12", action: "leave-empty", reason: "x", listed: 1, rows: [], dropped: [] },
    ],
  });
  const opts = { todayIst: TODAY, newestDigestDay: NEWEST };
  const tamper = (f: (row: Record<string, unknown>) => void) => {
    const g = good();
    f(g.plans[0].rows[1] as unknown as Record<string, unknown>);
    return g;
  };

  it("accepts a dry run's plan and returns only the days to fill", () => {
    const fills = checkPibPlanFile(JSON.parse(JSON.stringify(good())), opts);
    expect(fills.map((p) => [p.date, p.rows.length])).toEqual([[DAY, 3]]);
  });

  it("refuses a row with another category, tags, a 'why it matters', a non-PIB link, another summary, another date or no headline", () => {
    const cases: [(r: Record<string, unknown>) => void, RegExp][] = [
      [(r) => (r.category = "Economy"), /has category "Economy"/],
      [(r) => (r.examTags = ["UPSC"]), /has exam tags/],
      [(r) => (r.whyItMatters = "for prelims"), /has a "why it matters"/],
      [(r) => (r.source = "https://example.com/PressReleasePage.aspx?PRID=102&reg=3&lang=1"), /does not link a PIB release/],
      [(r) => (r.source = "https://www.pib.gov.in/PressReleasePage.aspx?PRID=102&reg=3&lang=1&x=1"), /does not link a PIB release/],
      [(r) => (r.summary = "Coal auction raises revenue for states."), /has another summary/],
      [(r) => (r.date = "2026-09-12"), /is dated 2026-09-12/],
      [(r) => (r.title = "  "), /has no usable headline/],
    ];
    for (const [f, why] of cases) expect(() => checkPibPlanFile(tamper(f), opts)).toThrow(why);
  });

  it("refuses a repeated headline or link, too few rows, a day twice, today, or a day not before the newest digest day", () => {
    const rep = good();
    rep.plans[0].rows[2] = { ...rep.plans[0].rows[2], title: rep.plans[0].rows[0].title.toUpperCase() };
    expect(() => checkPibPlanFile(rep, opts)).toThrow(/repeats a headline/);
    const link = good();
    link.plans[0].rows[2] = { ...link.plans[0].rows[2], source: link.plans[0].rows[0].source };
    expect(() => checkPibPlanFile(link, opts)).toThrow(/repeats a link/);
    const few = good();
    few.plans[0].rows = few.plans[0].rows.slice(0, 2);
    expect(() => checkPibPlanFile(few, opts)).toThrow(/2 row\(s\), at least 3 are needed/);
    const twice = good();
    twice.plans.push(twice.plans[0]);
    expect(() => checkPibPlanFile(twice, opts)).toThrow(/appears twice/);
    expect(() => checkPibPlanFile(good(), { todayIst: DAY, newestDigestDay: NEWEST })).toThrow(/not a past day/);
    expect(() => checkPibPlanFile(good(), { todayIst: TODAY, newestDigestDay: DAY })).toThrow(/not before the newest digest day/);
    expect(() => checkPibPlanFile({}, opts)).toThrow(/no plans array/);
  });
});

describe("scripts/backfill-current-affairs-pib.ts", () => {
  it("parseArgs: dry run by default, from 10 Sep to yesterday; refuses today, unknown flags and bad dates", () => {
    expect(parseArgs([], TODAY)).toEqual({ apply: false, from: "2026-09-10", to: "2026-10-05", dates: null, out: null, undo: null, plan: null, concurrency: 3 });
    expect(() => parseArgs(["--to", TODAY], TODAY)).toThrow(/only past days/);
    expect(() => parseArgs(["--dates", "2026-09-11,2026-10-06"], TODAY)).toThrow(/only past days/);
    expect(() => parseArgs(["--force"], TODAY)).toThrow(/unknown flag --force/);
    expect(() => parseArgs(["--from", "11-09-2026"], TODAY)).toThrow(/not a YYYY-MM-DD date/);
    expect(() => parseArgs(["--from"], TODAY)).toThrow(/--from needs a value/);
    expect(() => parseArgs(["--concurrency", "9"], TODAY)).toThrow(/--concurrency/);
    expect(daysBetween("2026-09-29", "2026-10-02")).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  });

  it("parseArgs: --apply only with a plan file, and a plan file carries its own days", () => {
    expect(() => parseArgs(["--apply"], TODAY)).toThrow(/--apply writes only a plan a person has read/);
    expect(() => parseArgs(["--dates", "2026-09-11", "--apply"], TODAY)).toThrow(/--apply writes only a plan/);
    expect(() => parseArgs(["--plan", "p.json", "--from", "2026-09-11"], TODAY)).toThrow(/--plan carries its own days/);
    expect(parseArgs(["--plan", "p.json", "--apply"], TODAY)).toMatchObject({ plan: "p.json", apply: true });
    expect(parseArgs(["--undo", "l.json", "--apply"], TODAY)).toMatchObject({ undo: "l.json", apply: true, plan: null });
  });

  /** A fake PIB: GET → today's page with its state; POST → the posted day's list; release pages by PRID. */
  function fakePib(lists: Record<string, Group[]>, posted: Record<string, string>, o: { postLandsOn?: string } = {}) {
    const seen: { url: string; method: string; body: string }[] = [];
    const fetchFn = async (url: string, init?: RequestInit) => {
      const method = init?.method ?? "GET";
      const body = String(init?.body ?? "");
      seen.push({ url, method, body });
      if (url === PIB_ALL_RELEASES_URL && method === "GET") {
        return new Response(listingHtml(TODAY, []), { status: 200, headers: { "set-cookie": "ASP.NET_SessionId=s1; path=/" } });
      }
      if (url === PIB_ALL_RELEASES_URL && method === "POST") {
        const f = new URLSearchParams(body);
        const d = `${f.get("ctl00$ContentPlaceHolder1$ddlYear")}-${String(f.get("ctl00$ContentPlaceHolder1$ddlMonth")).padStart(2, "0")}-${String(f.get("ctl00$ContentPlaceHolder1$ddlday")).padStart(2, "0")}`;
        const res = new Response(listingHtml(d, lists[d] ?? []), { status: 200 });
        // A redirect that ended on another host (fetch follows redirects; res.url is where it ended).
        if (o.postLandsOn) Object.defineProperty(res, "url", { value: o.postLandsOn });
        return res;
      }
      const prid = new URL(url).searchParams.get("PRID") ?? "";
      for (const [d, groups] of Object.entries(lists)) {
        for (const [, rs] of groups) for (const [p, t] of rs) if (p === prid) return new Response(releaseHtml(t, posted[d]), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    };
    return { fetchFn, seen };
  }

  /** A fake DB: the window read returns `stored`, the newest digest day `newest`; transactions and writes are recorded in `events`. */
  function fakeDb(stored: Record<string, number>, rowsAtWrite: Record<string, number> = {}, newest: string | null = NEWEST) {
    const events: string[] = [];
    const inserts: unknown[][] = [];
    const tx: Db = {
      $queryRaw: (async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const sql = strings.join("?");
        if (sql.includes("pg_advisory_xact_lock")) {
          events.push(`lock ${values[0]}`);
          return [{ ok: 1 }];
        }
        return [{ n: rowsAtWrite[String(values[0])] ?? 0 }];
      }) as Db["$queryRaw"],
      $executeRawUnsafe: async (_sql: string, ...values: unknown[]) => {
        events.push(`insert ${values[1]}`);
        inserts.push(values);
        return 1;
      },
      $transaction: async () => {
        throw new Error("nested");
      },
    };
    const db: Db = {
      $queryRaw: (async (strings: TemplateStringsArray, ...values: unknown[]) => {
        const sql = strings.join("?");
        if (sql.includes("GROUP BY date")) return Object.entries(stored).map(([d, n]) => ({ d, n }));
        if (sql.includes("MAX(date)")) {
          expect(values).toEqual([PIB_CATEGORY]); // the newest day of the digest, PIB rows left out
          return [{ d: newest }];
        }
        throw new Error(`unexpected read: ${sql}`);
      }) as Db["$queryRaw"],
      $executeRawUnsafe: async () => {
        throw new Error("write outside a transaction");
      },
      $transaction: async <T,>(fn: (t: Db) => Promise<T>) => {
        events.push("tx");
        return fn(tx);
      },
    };
    return { db, events, inserts };
  }

  const lists = { "2026-09-11": three, "2026-09-12": [["Ministry of Coal", [["301", "Only one release that day"]]]] as Group[] };
  const posted = { "2026-09-11": "11 SEP 2026 5:31PM by PIB Delhi", "2026-09-12": "12 SEP 2026 1:00PM by PIB Delhi" };
  const now = () => new Date("2026-10-06T08:00:00Z");

  /** A dry run with --out, returning the plan file it wrote. */
  async function dryRunPlanFile(stored: Record<string, number> = { "2026-09-10": 12 }) {
    const { fetchFn } = fakePib(lists, posted);
    const { db } = fakeDb(stored);
    let file = "";
    await run(["--from", "2026-09-10", "--to", "2026-09-12", "--out", "plan.json"], {
      db,
      fetch: fetchFn,
      now,
      log: vi.fn(),
      writeFile: (_p, s) => (file = s),
      logDir: "x",
    });
    return file;
  }

  it("a dry run reads the DB and PIB and writes nothing (but the plan file asked for)", async () => {
    const { fetchFn, seen } = fakePib(lists, posted);
    const { db, events } = fakeDb({ "2026-09-10": 12 });
    const writeFile = vi.fn();
    const log = vi.fn();
    const r = await run(["--from", "2026-09-10", "--to", "2026-09-12"], { db, fetch: fetchFn, now, log, writeFile, logDir: "x" });
    expect(r.plans.map((p) => [p.date, p.action])).toEqual([
      ["2026-09-11", "fill"],
      ["2026-09-12", "leave-empty"],
    ]);
    expect(events).toEqual([]);
    expect(writeFile).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith("Dry run: nothing written. Save the plan with --out plan.json, read it, then write it with --plan plan.json --apply.");
    expect(seen.every((s) => new URL(s.url).hostname === "www.pib.gov.in")).toBe(true);
    // The postback carries the page's own state and the day asked for.
    const post = new URLSearchParams(seen.find((s) => s.method === "POST")!.body);
    expect([post.get("__VIEWSTATE"), post.get("__EVENTVALIDATION"), post.get("ctl00$ContentPlaceHolder1$ddlday"), post.get("ctl00$ContentPlaceHolder1$ddlMonth")]).toEqual(["vs+/=1", "ev2", "11", "9"]);
  });

  it("a read that a redirect took off www.pib.gov.in is refused: the day is left empty", async () => {
    const { fetchFn } = fakePib(lists, posted, { postLandsOn: "https://pib-mirror.example/allRel.aspx" });
    const { db } = fakeDb({});
    const r = await run(["--dates", "2026-09-11"], { db, fetch: fetchFn, now, log: vi.fn(), logDir: "x" });
    expect(r.plans[0]).toMatchObject({ action: "leave-empty", reason: "PIB's list was not read (redirected off www.pib.gov.in to pib-mirror.example)" });
  });

  it("a day on or after the newest digest day is not read from PIB and not filled", async () => {
    const { fetchFn, seen } = fakePib(lists, posted);
    const { db } = fakeDb({}, {}, "2026-09-11");
    const r = await run(["--dates", "2026-09-11"], { db, fetch: fetchFn, now, log: vi.fn(), logDir: "x" });
    expect(r.plans[0]).toMatchObject({ action: "leave-empty" });
    expect(r.plans[0].reason).toMatch(/not before the newest digest day \(2026-09-11\)/);
    expect(seen).toEqual([]);
  });

  it("--plan alone checks the file and writes nothing", async () => {
    const file = await dryRunPlanFile();
    const { db, events } = fakeDb({});
    const fetchFn = vi.fn();
    const writeFile = vi.fn();
    const r = await run(["--plan", "plan.json"], { db, fetch: fetchFn, now, log: vi.fn(), readFile: () => file, writeFile, logDir: "x" });
    expect(r.plans.map((p) => p.date)).toEqual(["2026-09-11"]);
    expect(events).toEqual([]);
    expect(writeFile).not.toHaveBeenCalled();
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("--plan --apply writes exactly the plan file (PIB not read again): undo log (pending) first, one locked transaction per day", async () => {
    const file = await dryRunPlanFile();
    const { db, events, inserts } = fakeDb({});
    const fetchFn = vi.fn();
    const order: string[] = [];
    const writeFile = vi.fn((p: string, s: string) => {
      order.push(`log ${JSON.parse(s).status}`);
      events.push(`log ${JSON.parse(s).status}`);
      void p;
    });
    const r = await run(["--plan", "plan.json", "--apply"], { db, fetch: fetchFn, now, log: vi.fn(), readFile: () => file, writeFile, logDir: "data/fix-logs" });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(r.inserted).toBe(3);
    expect(events.slice(0, 3)).toEqual(["log pending", "tx", "lock current-affairs-day:2026-09-11"]);
    expect(events.filter((e) => e.startsWith("insert"))).toEqual(["insert 2026-09-11", "insert 2026-09-11", "insert 2026-09-11"]);
    expect(order.at(-1)).toBe("log applied");
    expect(r.logPath?.replace(/\\/g, "/")).toMatch(/^data\/fix-logs\/backfill-current-affairs-pib\.2026-10-06T08-00-00-000Z\.json$/);
    // id, date, title, summary, category, tags, whyItMatters, source — as the plan file holds them
    const planned = (JSON.parse(file) as { plans: { rows: unknown[] }[] }).plans[0].rows[0] as Record<string, unknown>;
    expect(inserts[0].slice(1)).toEqual([planned.date, planned.title, planned.summary, PIB_CATEGORY, [], null, pibReleaseUrl("101")]);
    const lastLog = JSON.parse(writeFile.mock.calls.at(-1)![1] as string);
    expect(lastLog).toMatchObject({ plan: "plan.json", status: "applied" });
    expect(lastLog.days[0]).toMatchObject({ date: "2026-09-11", result: "inserted 3" });
    expect(lastLog.days[0].rows[0].id).toBe(inserts[0][0]);
  });

  it("--plan --apply skips a day that got rows after the plan (re-counted under the lock)", async () => {
    const file = await dryRunPlanFile();
    const { db, events } = fakeDb({}, { "2026-09-11": 12 });
    const r = await run(["--plan", "plan.json", "--apply"], { db, fetch: vi.fn(), now, log: vi.fn(), readFile: () => file, writeFile: vi.fn(), logDir: "x" });
    expect(r.inserted).toBe(0);
    expect(events.some((e) => e.startsWith("insert"))).toBe(false);
  });

  it("--plan --apply refuses a tampered plan file before any write", async () => {
    const plan = JSON.parse(await dryRunPlanFile()) as { plans: { rows: { summary: string }[] }[] };
    plan.plans[0].rows[0].summary = "RBI cuts the repo rate.";
    const { db, events } = fakeDb({});
    const writeFile = vi.fn();
    await expect(
      run(["--plan", "plan.json", "--apply"], { db, fetch: vi.fn(), now, log: vi.fn(), readFile: () => JSON.stringify(plan), writeFile, logDir: "x" }),
    ).rejects.toThrow(/plan file refused: .*has another summary/);
    expect(events).toEqual([]);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("--plan --apply with nothing to fill writes no log and opens no transaction", async () => {
    const file = await dryRunPlanFile({ "2026-09-10": 12, "2026-09-11": 9 });
    const { db, events } = fakeDb({});
    const writeFile = vi.fn();
    const r = await run(["--plan", "plan.json", "--apply"], { db, fetch: vi.fn(), now, log: vi.fn(), readFile: () => file, writeFile, logDir: "x" });
    expect(r).toMatchObject({ inserted: 0, logPath: null });
    expect(events).toEqual([]);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("--undo is a dry run unless --apply, and tries every logged row (a day's result may be unsaved), deleting only rows exactly as written", async () => {
    const log = {
      script: "scripts/backfill-current-affairs-pib.ts",
      kind: "apply",
      status: "failed",
      startedAt: "t",
      finishedAt: "t",
      source: PIB_ALL_RELEASES_URL,
      days: [
        { date: "2026-09-11", rows: [{ id: "id1", date: "2026-09-11", title: "T1", source: pibReleaseUrl("101") }], result: "inserted 1" },
        // Committed, then the run stopped before the result was saved.
        { date: "2026-09-12", rows: [{ id: "id5", date: "2026-09-12", title: "T5", source: pibReleaseUrl("105") }], result: null },
        // Skipped: its ids were never inserted, so they match nothing.
        { date: "2026-09-13", rows: [{ id: "id9", date: "2026-09-13", title: "T9", source: pibReleaseUrl("109") }], result: "skipped: the day has 3 row(s) now" },
      ],
    };
    const inDb = new Set(["id1", "id5"]);
    const deletes: unknown[][] = [];
    const reads: unknown[][] = [];
    const db: Db = {
      $queryRaw: (async (_s: TemplateStringsArray, ...v: unknown[]) => {
        reads.push(v);
        return [{ n: inDb.has(String(v[0])) ? 1 : 0 }];
      }) as Db["$queryRaw"],
      $executeRawUnsafe: async () => 0,
      $transaction: async <T,>(fn: (t: Db) => Promise<T>) =>
        fn({ ...db, $executeRawUnsafe: async (_sql: string, ...v: unknown[]) => (deletes.push(v), inDb.has(String(v[0])) ? 1 : 0) }),
    };
    const readFile = () => JSON.stringify(log);
    const writeFile = vi.fn();
    const msgs: string[] = [];
    await run(["--undo", "data/fix-logs/x.json"], { db, fetch: vi.fn(), now, log: (s) => msgs.push(s), readFile, writeFile });
    expect(deletes).toEqual([]);
    expect(reads.map((v) => v[0])).toEqual(["id1", "id5", "id9"]);
    expect(reads[0]).toEqual(["id1", "2026-09-11", "T1", pibReleaseUrl("101"), PIB_CATEGORY]);
    expect(msgs).toContain("2 of 3 are still present exactly as written. Add --apply to delete them.");
    const r = await run(["--undo", "data/fix-logs/x.json", "--apply"], { db, fetch: vi.fn(), now, log: vi.fn(), readFile, writeFile });
    expect(r.inserted).toBe(-2);
    expect(deletes.map((v) => v[0])).toEqual(["id1", "id5", "id9"]);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it("no AI: every module the rules, the run rule and the script load is on a short list (no model client)", () => {
    // Every specifier in the whole text: `from "…"` (one-line or multi-line
    // imports), bare `import "…"`, `import("…")` and `require("…")`.
    const specifiers = (f: string) =>
      [...readFileSync(f, "utf8").matchAll(/\bfrom\s+["']([^"']+)["']|\bimport\s+["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)|\brequire\s*\(\s*["']([^"']+)["']\s*\)/g)].map(
        (m) => m[1] ?? m[2] ?? m[3] ?? m[4],
      );
    expect(specifiers("src/lib/current-affairs-pib.ts")).toEqual([]);
    expect(specifiers("src/lib/current-affairs-run.ts")).toEqual([]);
    expect(new Set(specifiers("scripts/backfill-current-affairs-pib.ts"))).toEqual(
      new Set(["node:fs", "node:path", "node:crypto", "../src/lib/current-affairs-pib", "../src/lib/current-affairs-run", "../src/lib/db/prisma"]),
    );
    // The check itself sees a multi-line import's specifier.
    expect("import {\n  a,\n  b,\n} from \"@anthropic-ai/sdk\";".match(/\bfrom\s+["']([^"']+)["']/)?.[1]).toBe("@anthropic-ai/sdk");
  });
});

/** Shapes the day page's patch relies on. */
describe("isPibBackfillDay", () => {
  it("is true only when every row of the day is a PIB backfill row", () => {
    expect(isPibBackfillDay([{ category: PIB_CATEGORY }, { category: PIB_CATEGORY }])).toBe(true);
    expect(isPibBackfillDay([{ category: PIB_CATEGORY }, { category: "Economy" }])).toBe(false);
    expect(isPibBackfillDay([])).toBe(false);
  });
});

// Keeps the PibListing type import used (a listing literal the guards accept).
const _shape: PibListing = { shows: DAY, displayed: 1, releases: [{ prid: "1", ministry: "m", title: "t t t" }] };
void _shape;
