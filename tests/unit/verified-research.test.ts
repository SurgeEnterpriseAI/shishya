// Verified exam dates from the nightly research (14 Oct 2026): used only when the latest
// scheduled run is fresh, has >= 2 verified official dates, and the run before agrees.
// Run: npx vitest run tests/unit/verified-research.test.ts

import { describe, expect, it } from "vitest";
import { pickVerified, type ResearchRun } from "@/lib/verified-research";

const NOW = new Date("2026-10-15T03:00:00Z");
const item = (kind: string, date: string, extra: object = {}) => ({
  kind, label: `${kind} label`, date, evidence: `${kind} on ${date} as printed`, sourceUrl: "https://tnpsc.gov.in/notice.pdf", official: true, verified: true, ...extra,
});
const run = (startedAt: string, items: any[], o: Partial<ResearchRun> = {}): ResearchRun => ({ run: startedAt, startedAt, manual: false, items, news: [], ...o });
const A = [item("APPLICATION_END", "2026-11-05"), item("EXAM", "2027-01-10")];

describe("pickVerified", () => {
  it("uses two fresh scheduled runs that agree, with the quote in notes", () => {
    const r = pickVerified([run("2026-10-14T23:00:00Z", A), run("2026-10-14T20:30:00Z", A)], null, NOW)!;
    expect(r.dates.map((d) => `${d.kind} ${d.date} ${d.confidence}`)).toEqual(["APPLICATION_END 2026-11-05 official", "EXAM 2027-01-10 official"]);
    expect(r.dates[1].isExamDay).toBe(true);
    expect(r.dates[0].notes).toContain("as printed");
    expect(r.dates[0].source).toBe("https://tnpsc.gov.in/notice.pdf");
  });
  it("returns null when stale, thin, unsettled, alone, or manual-only", () => {
    expect(pickVerified([run("2026-10-13T00:00:00Z", A), run("2026-10-12T20:00:00Z", A)], null, NOW)).toBeNull(); // > 36 h
    expect(pickVerified([run("2026-10-14T23:00:00Z", A.slice(0, 1)), run("2026-10-14T20:30:00Z", A.slice(0, 1))], null, NOW)).toBeNull(); // < 2
    expect(pickVerified([run("2026-10-14T23:00:00Z", A), run("2026-10-14T20:30:00Z", [A[0], item("EXAM", "2027-01-11")])], null, NOW)).toBeNull(); // disagree
    expect(pickVerified([run("2026-10-14T23:00:00Z", A)], null, NOW)).toBeNull(); // one run
    expect(pickVerified([run("2026-10-14T23:00:00Z", A, { manual: true }), run("2026-10-14T20:30:00Z", A, { manual: true })], null, NOW)).toBeNull();
  });
  it("ignores unverified, non-official and unknown-kind rows", () => {
    const noisy = [...A, item("EXAM", "2027-02-01", { verified: false }), item("RESULT", "2027-03-01", { official: false }), item("WEIRD", "2027-04-01")];
    const r = pickVerified([run("2026-10-14T23:00:00Z", noisy), run("2026-10-14T20:30:00Z", A)], null, NOW)!;
    expect(r.dates).toHaveLength(2);
  });
});
