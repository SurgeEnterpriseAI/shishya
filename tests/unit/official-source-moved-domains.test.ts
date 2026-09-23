import { describe, expect, it } from "vitest";
import { isOfficialSource, sourceTier } from "@/lib/official-source";

// 23 Sep 2026: SBI (sbi.co.in -> sbi.bank.in) and the Telangana police board
// (tslprb.in -> tgprb.in) moved; notices on the new domains are official.
describe("moved official domains", () => {
  it("treats sbi.bank.in and tgprb.in notices as official", () => {
    expect(isOfficialSource("https://sbi.bank.in/web/careers/current-openings")).toBe(true);
    expect(isOfficialSource("https://www.tgprb.in/SI_PC_2026/Press%20Note%20dated%2017-09-2026.pdf")).toBe(true);
    expect(isOfficialSource("https://doc.tgprb.in/x.pdf")).toBe(true);
    expect(sourceTier("official", "https://www.tgprb.in/a.pdf", "https://www.tslprb.in")).toBe("official");
  });
  it("still refuses coaching sites and look-alikes", () => {
    expect(isOfficialSource("https://www.adda247.com/exams/telangana/")).toBe(false);
    expect(isOfficialSource("https://tgprb.in.example.com/")).toBe(false);
    expect(isOfficialSource("https://notsbi.bank.in.evil.com/")).toBe(false);
  });
});
