// State directory helpers (15 Sep 2026, SEO/AEO waves 1–2). Pure — no DB.
// Run with: npx vitest run tests/unit/state-exams.test.ts

import { describe, expect, it } from "vitest";
import { examTypeOf, formatDay, stateContextMarkdown, stateFaq, statePortals, type StateDate, type StateExam } from "@/lib/state-exams";

const exam = (code: string, shortName: string, name: string, officialUrl: string | null = null, officialName: string | null = null): StateExam => ({
  code,
  shortName,
  name,
  type: examTypeOf({ code, shortName, name }),
  updatedAt: "2026-09-15T00:00:00.000Z",
  officialUrl,
  officialName,
});

describe("examTypeOf", () => {
  const cases: Array<[string, string, string, string]> = [
    ["KA_POLICE_PC", "KSP Constable", "Karnataka State Police Constable (KSP)", "Police"],
    ["KA_KSRP", "KSRP Constable", "Karnataka KSRP Special Reserve Police Constable (SRPC)", "Police"],
    ["TS_POLICE_SI", "TS Police SI", "Telangana Police Sub-Inspector (Preliminary)", "Police"],
    ["KA_KARTET", "KAR TET", "Karnataka Teacher Eligibility Test (KAR TET)", "Teaching"],
    ["UP_UPTET", "UPTET", "Uttar Pradesh Teacher Eligibility Test", "Teaching"],
    ["KA_KPSC_KAS", "KPSC KAS", "Karnataka Administrative Service (KAS) Prelims", "PSC"],
    ["AP_APPSC_GROUP2", "APPSC Group 2", "APPSC Group II Services", "PSC"],
    ["MP_MPESB", "MPESB", "MP Employees Selection Board Group 4", "Staff selection"],
    ["HR_HSSC_CET", "HSSC CET", "Haryana Common Eligibility Test (HSSC CET)", "Staff selection"],
    ["UK_UKSSSC", "UKSSSC", "Uttarakhand Subordinate Service Selection Commission", "Staff selection"],
    ["KA_KCET", "KCET", "Karnataka Common Entrance Test (KCET)", "Entrance"],
    ["KA_COMEDK", "COMEDK UGET", "COMEDK UGET Karnataka", "Entrance"],
  ];
  for (const [code, shortName, name, type] of cases) {
    it(`${code} → ${type}`, () => {
      expect(examTypeOf({ code, shortName, name })).toBe(type);
    });
  }
});

describe("stateFaq — every answer is a fact from the rows", () => {
  const exams = [
    exam("KA_POLICE_PC", "KSP Constable", "Karnataka State Police Constable (KSP)", "https://ksp.karnataka.gov.in/info-3/Recruitment/en", "Karnataka State Police — Recruitment"),
    exam("KA_KPSC_KAS", "KPSC KAS", "Karnataka Administrative Service (KAS) Prelims", "https://kpsc.kar.nic.in", "Karnataka Public Service Commission"),
    exam("KA_KPSC_GROUP_C", "KPSC Group C", "KPSC Group C Recruitment", "https://www.kpsc.kar.nic.in/notifications", "Karnataka Public Service Commission"),
  ];
  const state = { name: "Karnataka", slug: "karnataka" };

  it("with no announced exam date it says so, and never invents one", () => {
    const faq = stateFaq(state, exams, [], 120);
    const next = faq.find((f) => f.q.startsWith("When is the next"))!;
    expect(next.a).toBe("No Karnataka exam date on Shishya's tracker has been announced for the next 120 days. Each exam's tracker page lists its expected dates, marked as estimates.");
  });

  it("names an announced exam day with its tier", () => {
    const upcoming: StateDate[] = [
      { examCode: "KA_KSRP", examShort: "KSRP Constable", label: "Written test", kind: "EXAM", day: "2026-09-20", tier: "official", url: "https://cetonline.karnataka.gov.in/kea/kisrpc2026" },
      { examCode: "KA_POLICE_PC", examShort: "KSP Constable", label: "Admit card", kind: "ADMIT_CARD", day: "2026-09-18", tier: "reported", url: null },
    ];
    const next = stateFaq(state, exams, upcoming, 120).find((f) => f.q.startsWith("When is the next"))!;
    expect(next.a).toContain("KSRP Constable: Written test on 20 Sept 2026 (official");
    expect(next.a).not.toContain("Admit card");
  });

  it("counts exam pages and links the state page", () => {
    const first = stateFaq(state, exams, [], 120)[0];
    expect(first.a).toMatch(/^Shishya has 3 Karnataka exam pages: /);
    expect(first.a).toContain("https://shishya.in/exams/state/karnataka");
  });

  it("lists each official portal host once, and leaves the item out when there is none", () => {
    expect(statePortals(exams).map((p) => p.host)).toEqual(["ksp.karnataka.gov.in", "kpsc.kar.nic.in"]);
    const noPortals = stateFaq(state, exams.map((e) => ({ ...e, officialUrl: null })), [], 120);
    expect(noPortals.some((f) => f.q.startsWith("Where do I apply"))).toBe(false);
  });

  it("lists one portal per body even when the body has two sites", () => {
    const twoSites = [
      exam("KA_KPSC_KAS", "KPSC KAS", "Karnataka Administrative Service (KAS) Prelims", "https://kpsconline.karnataka.gov.in", "Karnataka Public Service Commission (KPSC)"),
      exam("KA_KPSC_GROUP_C", "KPSC Group C", "KPSC Group C Recruitment", "https://kpsc.kar.nic.in", "Karnataka Public Service Commission (KPSC)"),
    ];
    expect(statePortals(twoSites).map((p) => p.host)).toEqual(["kpsconline.karnataka.gov.in"]);
  });

  it("formats the calendar day itself", () => {
    expect(formatDay("2026-09-17")).toBe("17 Sept 2026");
  });
});

describe("stateContextMarkdown — the state's brief for AI crawlers", () => {
  const exams = [
    exam("KA_POLICE_PC", "KSP Constable", "Karnataka State Police Constable (KSP)", "https://ksp.karnataka.gov.in/info-3/Recruitment/en", "Karnataka State Police — Recruitment"),
    exam("KA_KPSC_KAS", "KPSC KAS", "Karnataka Administrative Service (KAS) Prelims", "https://kpsc.kar.nic.in", "Karnataka Public Service Commission"),
  ];
  const entry = { code: "KA", slug: "karnataka", name: "Karnataka", nativeName: "ಕರ್ನಾಟಕ", hindiName: "कर्नाटक", exams };

  it("lists exams by type with their URLs, announced dates with source, portals and the FAQ", () => {
    const md = stateContextMarkdown(
      entry,
      [{ examCode: "KA_KPSC_KAS", examShort: "KPSC KAS", label: "Prelims", kind: "EXAM", day: "2026-11-15", tier: "reported", url: "https://example.org/kas" }],
      120,
      "2026-09-15",
    );
    expect(md.startsWith("# Karnataka government exams — Shishya context file")).toBe(true);
    expect(md).toContain("data as of 2026-09-15 (IST)");
    expect(md).toContain("### PSC\n- KPSC KAS — Karnataka Administrative Service (KAS) Prelims: https://shishya.in/exams/KA_KPSC_KAS (context: https://shishya.in/exams/KA_KPSC_KAS/context.md)");
    expect(md).toContain("### Police\n- KSP Constable");
    expect(md).toContain("- 2026-11-15 — KPSC KAS: Prelims (reported, source: https://example.org/kas)");
    expect(md).toContain("## Where to apply (official websites)\n- Karnataka State Police — Recruitment: https://ksp.karnataka.gov.in/info-3/Recruitment/en");
    expect(md).toContain("### When is the next Karnataka government exam?\nKPSC KAS: Prelims on 15 Nov 2026 (reported");
  });

  it("says no date is announced rather than inventing one", () => {
    const md = stateContextMarkdown(entry, [], 120, "2026-09-15");
    expect(md).toContain("- None announced on Shishya's tracker for the next 120 days.");
  });
});
