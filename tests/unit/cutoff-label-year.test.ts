// The cutoff page's year label (26 Sep 2026): the newest cycle shown, never
// the calendar year, never an advertisement number's year.

import { describe, it, expect } from "vitest";
import { cutoffCycleLabelYear, newestCutoffLabelYear } from "@/lib/cutoff-label-year";
import { dict } from "@/lib/i18n";

describe("cutoffCycleLabelYear — cycle strings from the prod OfficialCutoff table", () => {
  it.each([
    ["2024", 2024],
    ["2025", 2025],
    ["CEN 01/2024", 2024],
    ["CEN RRC 01/2019", 2019],
    ["Notification No. 25/2018", 2018],
    ["GP-2017-18", 2018],
    ["Advt. No. 014/2026 - Maharashtra Group-C Services Main Examination 2025", 2025],
    ["Advt. No. 124/2025 - Maharashtra Group-C Services Combined Preliminary Examination 2025", 2025],
    ["Clerkship Examination, 2023 (Advertisement No. 13/2023)", 2023],
    ["सीधी भर्ती-2023 (Direct Recruitment-2023, 60,244 posts)", 2023],
    ["Advt. No. 212/202324", 0],
    ["Advertisement No. GPRB/202324/1 (Lokrakshak Cadre)", 0],
  ])("%s → %d", (cycle, year) => {
    expect(cutoffCycleLabelYear(cycle)).toBe(year);
  });
});

describe("newestCutoffLabelYear", () => {
  it("the newest year among the shown cycles; none when no cycle names one", () => {
    expect(
      newestCutoffLabelYear([
        "Advt. No. 014/2026 - Maharashtra Group-C Services Main Examination 2025",
        "Advt. No. 049/2024 - Maharashtra Group-C Services Combined Preliminary Examination 2024",
      ]),
    ).toBe(2025);
    expect(newestCutoffLabelYear(["Advt. No. 212/202324"])).toBeNull();
    expect(newestCutoffLabelYear([])).toBeNull();
  });
});

// 26 Sep 2026 (discoverability wave 2 G3): the official title keys carry the
// same {year} slot, filled the way the page fills it (fillYear: no year → the
// slot and its space go), and a {noun} from the figures' scoreType. The
// indicative keys never say "Official" in any language.
describe("cutoff title keys — the year label and the official wording", () => {
  const fillYear = (s: string, vars: Record<string, string>, year: number | null) => {
    const t = year === null ? s.replace(/\s*\{year\}/g, "") : s.replace(/\{year\}/g, String(year));
    return t.replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? `{${k}}`);
  };
  const raw = (lc: "en" | "hi" | "te", key: string) => (dict[lc] as Record<string, string>)[key];

  it("en: '{exam} Cutoff {year} (Official) — Category-wise {noun}', with and without a year", () => {
    const k = raw("en", "cutoff.metaTitleOfficial");
    expect(fillYear(k, { exam: "SSC CGL", noun: raw("en", "cutoff.noun.marks") }, 2025)).toBe("SSC CGL Cutoff 2025 (Official) — Category-wise Marks");
    expect(fillYear(k, { exam: "GJ GSSSB", noun: raw("en", "cutoff.noun.marks") }, null)).toBe("GJ GSSSB Cutoff (Official) — Category-wise Marks");
    expect(fillYear(k, { exam: "RRB Group D", noun: raw("en", "cutoff.noun.score") }, 2019)).toBe("RRB Group D Cutoff 2019 (Official) — Category-wise Scores");
  });

  it("hi and te: every official key exists with the same placeholders; the nouns are translated", () => {
    const keys = ["cutoff.metaTitleOfficial", "cutoff.h1Official", "cutoff.metaDescriptionOfficial", "cutoff.checkedOn", "cutoff.noun.marks", "cutoff.noun.percentile", "cutoff.noun.rank", "cutoff.noun.score"];
    const ph = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
    for (const key of keys) {
      const en = raw("en", key);
      expect(en, key).toBeTruthy();
      for (const lc of ["hi", "te"] as const) {
        const v = raw(lc, key);
        expect(v, `${lc} ${key}`).toBeTruthy();
        expect(ph(v), `${lc} ${key}`).toEqual(ph(en));
        expect(v, `${lc} ${key}`).not.toBe(en);
      }
    }
  });

  it("the indicative title, H1 and description never say 'Official'", () => {
    for (const lc of ["en", "hi", "te"] as const) {
      for (const key of ["cutoff.metaTitle", "cutoff.h1", "cutoff.metaDescription"]) {
        expect(raw(lc, key), `${lc} ${key}`).not.toMatch(/official|आधिकारिक|అధికారిక/i);
      }
    }
    // The bands heading says "indicative" in English; the hi/te pages carry it
    // in cutoff.disclaimer (their heading text is pinned by TWIN_CHROME).
    expect(raw("en", "cutoff.bands")).toContain("(indicative)");
    for (const lc of ["hi", "te"] as const) expect(raw(lc, "cutoff.disclaimer"), lc).toMatch(/सांकेतिक|సూచనాత్మకం/);
  });
});
