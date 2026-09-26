// The cutoff page's year label (26 Sep 2026): the newest cycle shown, never
// the calendar year, never an advertisement number's year.

import { describe, it, expect } from "vitest";
import { cutoffCycleLabelYear, newestCutoffLabelYear } from "@/lib/cutoff-label-year";

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
