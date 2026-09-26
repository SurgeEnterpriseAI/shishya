// Official vs other sources for Ask Shishya (26 Sep 2026) —
// src/lib/official-domains.ts as tests.
//
// Founder decision, 26 Sep 2026: "no need to block, keep as many official
// sources whatever you get as possible". Pinned: regulated Indian and foreign
// government / academic domains and the listed bodies on commercial domains
// are official; a tool's own official portal counts; every host
// official-source.ts calls official is official here too (the two never
// disagree); aggregators are kept and labelled "Other source", never
// dropped; ranking puts official first, keeps order within each group,
// removes duplicates and, under a cap, drops other sources before any
// official one.
// Pure. Run: npx vitest run tests/unit/official-domains.test.ts

import { describe, expect, it } from "vitest";
import { OFFICIAL_BODIES, isOfficialUrl, labelSource, officialUrlsIn, rankSources, relabelOfficialClaims, sourceName, sourceTag } from "@/lib/official-domains";
import { isOfficialSource } from "@/lib/official-source";

describe("isOfficialUrl", () => {
  it.each([
    "https://ssc.gov.in/notices/cgl-2026.pdf",
    "https://upsc.gov.in/examinations/active-exams",
    "https://www.ncert.nic.in/textbook.php",
    "https://exams.nta.ac.in/NEET/",
    "https://jeemain.nta.nic.in/",
    "https://www.iitb.ac.in/admissions",
    "https://upmsp.edu.in/",
    "https://www.ibps.in/crp-po-mt-xvi/",
    "https://sbi.bank.in/web/careers",
    "https://cisce.org/regulations",
    "https://www.icai.org/post/ca-foundation",
    "https://www.icsi.edu/students/",
    "https://www.nirfindia.org/Rankings/2024/EngineeringRanking.html",
    "https://www.aicte-india.org/schemes",
    "https://nmc.org.in/information-desk/",
    "https://cetcell.mahacet.org/",
    "https://www.ets.org/toefl.html",
    "https://www.ielts.org/",
    "https://englishtest.duolingo.com/applicants",
    "https://www.harvard.edu/admissions",
    "https://www.gov.uk/student-visa",
    "https://www.ox.ac.uk/admissions",
    "https://www.studyinaustralia.gov.au/",
    "https://studyinthestates.dhs.gov/",
  ])("official: %s", (u) => {
    expect(isOfficialUrl(u)).toBe(true);
  });

  it.each([
    "https://www.jagranjosh.com/articles/ssc-cgl-2026",
    "https://testbook.com/ssc-cgl",
    "https://www.sarkariresult.com/ssc/cgl",
    "https://www.freejobalert.com/",
    "https://timesofindia.indiatimes.com/education/news",
    "https://www.shiksha.com/engineering",
    "https://collegedunia.com/",
    "https://www.duolingo.com/", // only the English Test subdomain is the test owner
    "https://notgov.in.example.com/", // suffix match is on the host's end, not inside it
    "https://sets.org/", // "ets.org" must not match a longer name
    "ftp://ssc.gov.in/file",
    "not a url",
    "",
  ])("other: %s", (u) => {
    expect(isOfficialUrl(u)).toBe(false);
  });

  it("a tool's own official portal counts (the exam's officialUrl on a commercial domain)", () => {
    expect(isOfficialUrl("https://www.bitsadmission.com/bitsat/")).toBe(true);
    expect(isOfficialUrl("https://recruit.somepsu.co.in/notice.pdf")).toBe(false);
    expect(isOfficialUrl("https://recruit.somepsu.co.in/notice.pdf", ["https://somepsu.co.in/careers"])).toBe(true);
  });

  it("agrees with official-source.ts on every host it knows (the date tiers)", () => {
    for (const u of ["https://ssc.gov.in/x", "https://ibps.in/x", "https://rbi.org.in/x", "https://sbi.co.in/x", "https://tgprb.in/x", "https://afcat.cdac.in/x", "https://isro.gov.in/x", "https://www.res.in/x"]) {
      expect(isOfficialSource(u)).toBe(true);
      expect(isOfficialUrl(u)).toBe(true);
    }
  });

  it("every listed body is on a domain it calls official", () => {
    for (const host of Object.keys(OFFICIAL_BODIES)) expect(isOfficialUrl(`https://${host}/`), host).toBe(true);
  });
});

describe("sourceName and sourceTag", () => {
  it("names a listed body (the longest match wins) and falls back to the bare host", () => {
    expect(sourceName("https://ssc.gov.in/notices")).toBe("Staff Selection Commission (SSC)");
    expect(sourceName("https://exams.nta.ac.in/NEET/")).toBe("National Testing Agency (NTA)");
    expect(sourceName("https://englishtest.duolingo.com/")).toBe("Duolingo English Test");
    expect(sourceName("https://www.tspsc.gov.in/")).toBe("tspsc.gov.in");
    expect(sourceName("https://www.jagranjosh.com/a")).toBe("jagranjosh.com");
  });
  it("labels in the answer's language", () => {
    expect(sourceTag(true)).toBe("Official");
    expect(sourceTag(false)).toBe("Other source");
    expect(sourceTag(true, "hi")).toBe("आधिकारिक");
    expect(sourceTag(false, "te")).toBe("ఇతర మూలం");
  });
  it("labelSource keeps title and url, adds the flag and the name", () => {
    expect(labelSource({ title: "Official — SSC", url: "https://ssc.gov.in/n" })).toEqual({ title: "Official — SSC", url: "https://ssc.gov.in/n", official: true, source: "Staff Selection Commission (SSC)" });
    expect(labelSource({ title: "Josh", url: "https://jagranjosh.com/a" })).toMatchObject({ official: false, source: "jagranjosh.com" });
  });
});

describe("rankSources — keep everything, official first", () => {
  const src = [
    { title: "Josh", url: "https://www.jagranjosh.com/a" },
    { title: "SSC notice", url: "https://ssc.gov.in/n1" },
    { title: "Testbook", url: "https://testbook.com/b" },
    { title: "SSC notice again", url: "https://www.ssc.gov.in/n1/" },
    { title: "NTA", url: "https://exams.nta.ac.in/x" },
    { title: "bad", url: "javascript:alert(1)" },
  ];

  it("never drops an aggregator without a cap, removes duplicates, official first in given order", () => {
    const r = rankSources(src);
    expect(r.map((s) => s.url)).toEqual(["https://ssc.gov.in/n1", "https://exams.nta.ac.in/x", "https://www.jagranjosh.com/a", "https://testbook.com/b"]);
    expect(r.map((s) => s.official)).toEqual([true, true, false, false]);
  });

  it("under a cap, other sources go before any official one", () => {
    expect(rankSources(src, { max: 2 }).map((s) => s.official)).toEqual([true, true]);
    expect(rankSources(src, { max: 3 }).map((s) => s.url)).toEqual(["https://ssc.gov.in/n1", "https://exams.nta.ac.in/x", "https://www.jagranjosh.com/a"]);
  });

  it("a tool's official portal lifts its source into the official group", () => {
    const r = rankSources([{ title: "PSU", url: "https://jobs.somepsu.co.in/a" }, { title: "Josh", url: "https://jagranjosh.com/a" }], { toolOfficial: ["https://somepsu.co.in"] });
    expect(r[0]).toMatchObject({ url: "https://jobs.somepsu.co.in/a", official: true });
  });
});

// 26 Sep 2026 (fixer): the tool portals and the model's "Official" labels.
describe("officialUrlsIn", () => {
  it("collects every URL under an official* key of a tool result, nothing else", () => {
    const exam = { code: "X", official: "Some PSU Recruitment https://careers.somepsu.co.in/notice", links: { hub: "https://shishya.in/exams/X" } };
    const chapter = { officialBooks: [{ title: "Book", url: "https://ncert.nic.in/textbook.php?jesc1=0-13" }], officialChapterPdf: { url: "https://ncert.nic.in/textbook/pdf/jesc101.pdf" }, page: "https://shishya.in/schooling" };
    const abroad = { visa: { type: "F-1", officialUrl: "https://travel.state.gov/f1" }, officialSite: "https://www.ets.org/toefl" };
    expect(officialUrlsIn(exam)).toEqual(["https://careers.somepsu.co.in/notice"]);
    expect(officialUrlsIn(chapter)).toEqual(["https://ncert.nic.in/textbook.php?jesc1=0-13", "https://ncert.nic.in/textbook/pdf/jesc101.pdf"]);
    expect(officialUrlsIn(abroad).sort()).toEqual(["https://travel.state.gov/f1", "https://www.ets.org/toefl"]);
    expect(officialUrlsIn(null)).toEqual([]);
    expect(officialUrlsIn("https://x.example")).toEqual([]);
  });
});

describe("relabelOfficialClaims", () => {
  it("a false 'Official — …' label on another site becomes 'Other source — <site>' in the label's language; the link stays", () => {
    expect(relabelOfficialClaims("- [Official — Staff Selection Commission](https://www.sarkariresult.com/ssc/cgl) says so.")).toBe(
      "- [Other source — sarkariresult.com](https://www.sarkariresult.com/ssc/cgl) says so.",
    );
    expect(relabelOfficialClaims("[आधिकारिक — कर्मचारी चयन आयोग](https://testbook.com/ssc)")).toBe("[अन्य स्रोत — testbook.com](https://testbook.com/ssc)");
    expect(relabelOfficialClaims("[అధికారిక: SSC](https://jagranjosh.com/a)")).toBe("[ఇతర మూలం — jagranjosh.com](https://jagranjosh.com/a)");
    expect(relabelOfficialClaims("[Official source — SSC](https://jagranjosh.com/a)")).toBe("[Other source — jagranjosh.com](https://jagranjosh.com/a)");
  });

  it("keeps official links, this run's tool portals, other labels and Shishya links exactly as written", () => {
    const same = [
      "[Official — Staff Selection Commission](https://ssc.gov.in/notice)",
      "[Official — CISCE](https://cisce.org/x)",
      "[Official notification PDF](https://www.sarkariresult.com/ssc/cgl)",
      "[Other source — jagranjosh.com](https://jagranjosh.com/a)",
      "[Official — SSC CGL page](https://shishya.in/exams/SSC_CGL)",
      "Official — SSC at https://www.sarkariresult.com/ssc (a bare URL is not a label)",
    ];
    for (const md of same) expect(relabelOfficialClaims(md)).toBe(md);
    expect(relabelOfficialClaims("[Official — Some PSU](https://careers.somepsu.co.in/n)", ["https://somepsu.co.in/"])).toBe("[Official — Some PSU](https://careers.somepsu.co.in/n)");
  });
});
