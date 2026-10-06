// /scholarships/context.md, the line under "2026-27 last dates read on the
// official portal" (6 Oct 2026, scholarships release). It said "Every other
// scheme: no 2026-27 date checked yet; its page gives the usual window" for
// every scheme outside the dated block, although after the release some of
// those pages show open now (no last date), rolling, closed for 2026-27, no
// 2026-27 date yet, discontinued, or NSP's per-state dates. The route now
// counts what each of those pages shows (lastDateOf, src/lib/scholarship-lists
// .ts) and src/lib/section-context.ts prints the counts
// (scholarshipOthersLine). The checks below hold for the catalogue before and
// after the step 2 data, so they never pin a count that a data edit moves.

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";
import { lastDateOf } from "@/lib/scholarship-lists";
import { nspLevelForScholarship } from "@/lib/nsp-windows";
import { scholarshipOthersLine, scholarshipsContextMarkdown, type ScholarshipOthers } from "@/lib/section-context";

const OLD_LINE = "- Every other scheme: no 2026-27 date checked yet; its page gives the usual window. Confirm on the official link.";
const zero: ScholarshipOthers = { nspByState: 0, openNow: 0, openWhenChecked: 0, rolling: 0, closed: 0, noDate: 0, discontinued: 0, usualOnly: 0 };

describe("scholarshipOthersLine", () => {
  it("names each state with its count, only when above 0, singular and plural", () => {
    expect(scholarshipOthersLine({ ...zero, nspByState: 2, openNow: 2, rolling: 1, closed: 4, noDate: 3, discontinued: 2, usualOnly: 160 }, 12)).toBe(
      "- The other 174 schemes, by what each page shows: 2 NSP pages list the 2026-27 last date of each state on NSP's list, read on NSP; 2 are open now on the official page, with no last date given; 1 takes applications at any time (rolling); 4 closed for 2026-27 (the official last date has passed); 3 have no 2026-27 date on the official portal yet; 2 are discontinued (no new applications); 160 have no 2026-27 date checked yet: their page gives the usual window. Confirm on the official link.",
    );
    expect(scholarshipOthersLine({ ...zero, openWhenChecked: 1, noDate: 1, usualOnly: 1 }, 3)).toBe(
      "- The other 3 schemes, by what each page shows: 1 was open when Shishya last checked, with no last date given; 1 has no 2026-27 date on the official portal yet; 1 has no 2026-27 date checked yet: its page gives the usual window. Confirm on the official link.",
    );
  });
  it("says All when no scheme is dated, and nothing when there is no other scheme", () => {
    expect(scholarshipOthersLine({ ...zero, rolling: 1 }, 0)).toBe("- All 1 scheme, by what each page shows: 1 takes applications at any time (rolling). Confirm on the official link.");
    expect(scholarshipOthersLine(zero, 5)).toBe("");
  });
});

describe("scholarshipsContextMarkdown with and without the counts", () => {
  const list = SCHOLARSHIP_SCHEMES.slice(0, 3);
  const dated = [{ id: "x", name: "X", closesOn: "2026-10-31", tier: "official", host: "example.gov.in", checkedOn: "2026-10-03" }];
  it("with counts: the counted line, never the old one", () => {
    const md = scholarshipsContextMarkdown(list, "2026-10-06", undefined, { lists: [], dated, others: { ...zero, closed: 1, usualOnly: 1 } });
    expect(md).not.toContain(OLD_LINE);
    expect(md).toContain("- The other 2 schemes, by what each page shows: 1 closed for 2026-27 (the official last date has passed); 1 has no 2026-27 date checked yet: its page gives the usual window. Confirm on the official link.");
  });
  it("with counts and no dated row: 'None still ahead.' and no usual-window claim for every page", () => {
    const md = scholarshipsContextMarkdown(list, "2026-11-01", undefined, { lists: [], dated: [], others: { ...zero, closed: 2, openWhenChecked: 1 } });
    expect(md).toContain("- None still ahead.\n- All 3 schemes, by what each page shows:");
    expect(md).not.toContain("Every other scheme's page shows its usual window");
  });
  it("without counts (an older caller): the old lines, unchanged", () => {
    expect(scholarshipsContextMarkdown(list, "2026-10-06", undefined, { lists: [], dated })).toContain(OLD_LINE);
  });
});

describe("GET /scholarships/context.md on 6 Oct 2026", () => {
  beforeAll(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-06T06:30:00Z"));
  });
  afterAll(() => {
    vi.useRealTimers();
  });

  it("counts every scheme outside the dated block by what its page shows; the old line is gone", async () => {
    const { GET } = (await import("@/app/scholarships/context.md/route")) as { GET: () => Promise<Response> };
    const md = await (await GET()).text();
    const today = "2026-10-06";
    expect(md).not.toContain("no 2026-27 date checked yet; its page gives the usual window");
    // An independent recount from the data.
    const o: ScholarshipOthers = { ...zero };
    let dated = 0;
    for (const s of SCHOLARSHIP_SCHEMES) {
      const d = lastDateOf(s, today);
      if (d.kind === "upcoming") dated++;
      else if (!s.closed && nspLevelForScholarship(s.id)) o.nspByState++;
      else if (d.kind === "open-now" && d.fresh) o.openNow++;
      else if (d.kind === "open-now") o.openWhenChecked++;
      else if (d.kind === "rolling") o.rolling++;
      else if (d.kind === "passed") o.closed++;
      else if (d.kind === "no-date") o.noDate++;
      else if (d.kind === "discontinued") o.discontinued++;
      else o.usualOnly++;
    }
    expect(md).toContain(`## 2026-27 last dates read on the official portal (${dated})`);
    const line = scholarshipOthersLine(o, dated);
    expect(line).not.toBe("");
    expect(md).toContain(`\n${line}\n`);
    expect(Object.values(o).reduce((a, b) => a + b, 0) + dated).toBe(SCHOLARSHIP_SCHEMES.length);
    // Both NSP pages print NSP's per-state dates, never "the usual window".
    expect(o.nspByState).toBe(2);
    // A status the data holds is named: after the step 2 data, Siemens and
    // ePASS are open now and ICAI is rolling on 6 Oct.
    for (const s of SCHOLARSHIP_SCHEMES) {
      const d = lastDateOf(s, today);
      if (d.kind === "open-now" && d.fresh) expect(line).toContain("open now on the official page, with no last date given");
      if (d.kind === "rolling") expect(line).toMatch(/applications at any time \(rolling\)/);
    }
  });
});
