// Result-day window (30 Sep 2026), src/lib/result-day-trigger.ts.
//
// The result-day mail had sent 0 mails: it needed an official RESULT row
// DATED today-2..today, and 189 of 201 such rows were written more than 2
// days after their date. It now fires when the official-tier row FIRST
// appears, for a result within 14 days: once for a row that appears late, on
// the day itself for a pre-announced date, never for a copy the refresh
// writer re-created (its archived twin is older), never for reported /
// expected / future / >14-day rows. No DB.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));

import { FIRE_WITHIN_DAYS, RESULT_WINDOW_DAYS, resultDayFires, type ResultTriggerRow } from "@/lib/result-day-trigger";
import { OFFICIAL_WATCH_SOURCE, SUPPRESSED_SOURCE } from "@/lib/exam-timeline";

const at = (iso: string) => new Date(`${iso}T04:15:00Z`); // 09:45 IST, the cron's run
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);
const PORTAL = "https://ssc.gov.in";
let n = 0;
function row(date: string, createdAt: string, over: Partial<ResultTriggerRow> = {}): ResultTriggerRow {
  return {
    id: `r${++n}`,
    label: "Tier 1 result",
    date: day(date),
    isExamDay: false,
    kind: "RESULT",
    confidence: "official",
    url: "https://ssc.gov.in/result-t1.pdf",
    source: "ai-generated:claude",
    createdAt: new Date(`${createdAt}T08:00:00Z`),
    archivedAt: null,
    ...over,
  };
}

describe("resultDayFires", () => {
  it("window constants", () => {
    expect(RESULT_WINDOW_DAYS).toBe(14);
    expect(FIRE_WITHIN_DAYS).toBe(2);
  });

  it("a pre-announced official date fires on the day itself", () => {
    const r = row("2026-09-30", "2026-09-10");
    expect(resultDayFires([r], PORTAL, at("2026-09-30"))).toEqual([{ day: "2026-09-30", rowId: r.id, firstSeenDay: "2026-09-10", verified: false, coversDays: [] }]);
    // …and for 2 days after, as before (the 09:45 and 10:30 IST runs + a missed day)
    expect(resultDayFires([r], PORTAL, at("2026-10-02"))).toHaveLength(1);
    expect(resultDayFires([r], PORTAL, at("2026-10-03"))).toEqual([]);
  });

  it("a row that first appears late (within 14 days of the result) fires once, from the day it appears", () => {
    const r = row("2026-09-20", "2026-09-29");
    expect(resultDayFires([r], PORTAL, at("2026-09-29"))).toHaveLength(1);
    expect(resultDayFires([r], PORTAL, at("2026-09-30"))[0]).toMatchObject({ day: "2026-09-20", firstSeenDay: "2026-09-29" });
    expect(resultDayFires([r], PORTAL, at("2026-10-02"))).toEqual([]); // not again
  });

  it("the old 2-day window could not fire for it (the regression this fixes)", () => {
    const r = row("2026-09-20", "2026-09-29");
    const oldWindow = (now: Date) => Math.round((now.getTime() - r.date.getTime()) / 86_400_000) <= 2;
    expect(oldWindow(at("2026-09-29"))).toBe(false);
    expect(resultDayFires([r], PORTAL, at("2026-09-29"))).toHaveLength(1);
  });

  it("a copy the refresh re-created does not fire: its archived twin was seen first", () => {
    const archived = row("2026-09-20", "2026-09-15", { archivedAt: new Date("2026-09-29T07:00:00Z") });
    const live = row("2026-09-20", "2026-09-29");
    expect(resultDayFires([archived, live], PORTAL, at("2026-09-30"))).toEqual([]);
  });

  it("an archived-only day (nothing live) never fires", () => {
    expect(resultDayFires([row("2026-09-28", "2026-09-29", { archivedAt: new Date("2026-09-30T01:00:00Z") })], PORTAL, at("2026-09-30"))).toEqual([]);
  });

  it("reported, expected, uncited, future and older-than-14-day rows never fire", () => {
    const now = at("2026-09-30");
    expect(resultDayFires([row("2026-09-29", "2026-09-29", { url: "https://testbook.com/ssc-result" })], PORTAL, now)).toEqual([]);
    expect(resultDayFires([row("2026-09-29", "2026-09-29", { confidence: "expected" })], PORTAL, now)).toEqual([]);
    expect(resultDayFires([row("2026-09-29", "2026-09-29", { url: null })], PORTAL, now)).toEqual([]);
    expect(resultDayFires([row("2026-10-03", "2026-09-29")], PORTAL, now)).toEqual([]);
    expect(resultDayFires([row("2026-09-10", "2026-09-29")], PORTAL, now)).toEqual([]);
    expect(resultDayFires([row("2026-09-29", "2026-09-29", { kind: "ANSWER_KEY", label: "Answer key" })], PORTAL, now)).toEqual([]);
  });

  it("the exam's own portal widens the official tier, as on every surface", () => {
    const r = row("2026-09-29", "2026-09-29", { url: "https://www.comedk.org/result.pdf" });
    expect(resultDayFires([r], "https://www.comedk.org", at("2026-09-30"))).toHaveLength(1);
    expect(resultDayFires([r], null, at("2026-09-30"))).toEqual([]);
  });

  it("a human-suppressed row does not count as first seen", () => {
    const suppressed = row("2026-09-25", "2026-09-01", { source: SUPPRESSED_SOURCE, archivedAt: new Date("2026-09-02T00:00:00Z") });
    const live = row("2026-09-25", "2026-09-29");
    expect(resultDayFires([suppressed, live], PORTAL, at("2026-09-30"))[0]).toMatchObject({ firstSeenDay: "2026-09-29", rowId: live.id });
  });

  it("the official-watch row is the one mailed about, and marks the mail verified", () => {
    const gen = row("2026-09-29", "2026-09-29");
    const watch = row("2026-09-29", "2026-09-29", { source: OFFICIAL_WATCH_SOURCE, url: "https://ssc.gov.in/results/t1-2026.pdf" });
    expect(resultDayFires([gen, watch], PORTAL, at("2026-09-30"))[0]).toMatchObject({ rowId: watch.id, verified: true });
  });

  it("the route selects live AND archived rows in the 14-day window, and says 'published' only for a verified row", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/cron/result-day/route.ts"), "utf8");
    expect(route).toMatch(/resultDayFires\(rowsByExam\.get\(examId\) \?\? \[\], meta\.officialUrl, now, \[meta\.short\]\)\[0\]/);
    expect(route).toMatch(/- \$\{RESULT_WINDOW_DAYS\}::int/);
    expect(route).not.toMatch(/WHERE d\."archivedAt" IS NULL AND d\.kind = 'RESULT'/);
    expect(route).toMatch(/const publishedHost = fire\.verified && result\.verified \? sourceHostLabel\(result\.url\) : null;/);
    const email = fs.readFileSync(path.join(process.cwd(), "src/lib/email.ts"), "utf8");
    expect(email).toMatch(/const published = p\.publishedHost \? p\.publishedHost : null;/);
    expect(email).toMatch(/That date is what the conducting body announced — it is not a promise the list is already on screen\./);
  });

  // Review, 30 Sep 2026 (should-fix 4): a first-seen watch row was dated in
  // the mail as if the body released it that day.
  it("a first-seen verified row reads 'first seen {date} on {host}' in the mail, never a result day we did not read", () => {
    const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/cron/result-day/route.ts"), "utf8");
    expect(route).toMatch(
      /const resultWhen = publishedHost && result\.firstSeen \? `first seen \$\{plainDay\(result\.date\)\} on \$\{publishedHost\}` : whenWithTier\(result\);/,
    );
  });

  // Review, 30 Sep 2026 (nice-to-have 7): one result, two mails.
  describe("coversDays — the same result under an earlier date is never mailed twice", () => {
    it("an AI row dated X-3 (mailed then) and the watch's first-seen row on X: X covers X-3", () => {
      const ai = row("2026-09-26", "2026-09-26", { label: "NDA 2 2026 written result", archivedAt: new Date("2026-09-29T15:40:00Z") });
      const watch = row("2026-09-29", "2026-09-29", { label: "Result — NDA 2 2026 exam", source: OFFICIAL_WATCH_SOURCE, url: "https://ssc.gov.in/r/nda-2.pdf" });
      const f = resultDayFires([ai, watch], PORTAL, at("2026-09-30"), ["NDA"]);
      expect(f[0]).toMatchObject({ day: "2026-09-29", verified: true, coversDays: ["2026-09-26"] });
    });
    it("another stage or sitting, or a written vs a final result, never covers", () => {
      const now = at("2026-09-30");
      const t1 = row("2026-09-22", "2026-09-22", { label: "Tier 1 result" });
      const t2 = row("2026-09-29", "2026-09-29", { label: "Tier 2 result" });
      expect(resultDayFires([t1, t2], PORTAL, now)[0].coversDays).toEqual([]);
      const n1 = row("2026-09-22", "2026-09-22", { label: "NDA 1 2026 final result" });
      const n2 = row("2026-09-29", "2026-09-29", { label: "NDA 2 2026 final result" });
      expect(resultDayFires([n1, n2], PORTAL, now, ["NDA"])[0].coversDays).toEqual([]);
      const w = row("2026-09-22", "2026-09-22", { label: "Written result" });
      const fin = row("2026-09-29", "2026-09-29", { label: "Final result" });
      expect(resultDayFires([w, fin], PORTAL, now)[0].coversDays).toEqual([]);
    });
    it("the route skips a student already mailed for any covered day", () => {
      const route = fs.readFileSync(path.join(process.cwd(), "src/app/api/cron/result-day/route.ts"), "utf8");
      expect(route).toMatch(/const guardTags = \[tag, \.\.\.fire\.coversDays\.map\(\(d\) => guardTag\(meta\.code, d\)\)\]\.flatMap\(\(g\) => \[g, `sent:\$\{g\}`\]\);/);
      expect(route).toMatch(/t\.tag IN \(\$\{Prisma\.join\(guardTags\)\}\)/);
    });
  });

  it("newest result day first", () => {
    const a = row("2026-09-22", "2026-09-29");
    const b = row("2026-09-29", "2026-09-29", { label: "Tier 2 result" });
    expect(resultDayFires([a, b], PORTAL, at("2026-09-30")).map((f) => f.day)).toEqual(["2026-09-29", "2026-09-22"]);
  });
});
