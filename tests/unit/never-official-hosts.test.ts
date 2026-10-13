// Never official: coaching companies on academic domains and our own site
// (13 Oct 2026) — src/lib/never-official-hosts.ts, read by every official-host
// rule: official-source.ts (date tiers, news wording, crawlers, answer-key
// watch), official-domains.ts (Ask Shishya's labels, the research fetcher's
// robots.txt choice) and official-papers.ts (the paper importer).
// The research review of 13 Oct 2026 found aakash.ac.in, motion.ac.in and
// allen.ac.in passing as official, so dates cited to them could be labelled
// OFFICIAL and their robots.txt was skipped.

import { describe, it, expect } from "vitest";
import { isNeverOfficial, isSelfSource, NEVER_OFFICIAL_HOSTS, SELF_HOSTS } from "@/lib/never-official-hosts";
import { citableSourceUrl, dateRowTier, isOfficialSource, isUntrustedSource, SOURCE_DENYLIST, sourceTier } from "@/lib/official-source";
import { isOfficialUrl, rankSources, relabelOfficialClaims } from "@/lib/official-domains";
import { isOfficialHost } from "@/lib/official-papers";
import { newsProvenance } from "@/lib/news-provenance";

const COACHING = [
  "https://www.aakash.ac.in/olympiad/nsejs-national-standard-examination-in-junior-science",
  "https://aakash.ac.in/x",
  "https://anthe.aakash.ac.in/",
  "https://www.allen.ac.in/x",
  "https://allen.ac.in/kota/notice.pdf",
  "https://ALLEN.AC.IN/Upper",
  "https://motion.ac.in/examinfo/sof-olympiad-results/",
  "https://cdn.motion.ac.in/a.pdf",
  "https://www.resonance.ac.in/",
  "https://www.careerpoint.ac.in/",
  "https://www.bansal.ac.in/",
  "https://www.srichaitanya.ac.in/",
  "https://iimtu.edu.in/blog/neet-pg-2026/",
  "https://www.kccitm.edu.in/cuet-result",
  "https://www.krmangalam.edu.in/blog/ctet-exam-date",
  "https://allen.ac.in./trailing-dot",
];

const SELF = ["https://shishya.in/exams/CDS/updates", "https://www.shishya.in/exams/SSC_CGL", "http://shishya.in", "https://shishya-6trr.vercel.app/exams/X"];

// Real conducting bodies on the same suffixes — they stay official.
const BODIES = [
  "https://nta.ac.in/notice.pdf",
  "https://exams.nta.ac.in/JEE-MAIN/",
  "https://jeeadv.ac.in/",
  "https://gate2027.iitm.ac.in/",
  "https://www.iitb.ac.in/",
  "https://iimcat.ac.in/",
  "https://consortiumofnlus.ac.in/",
  "https://jam.iitkgp.ac.in/",
  "https://ltrc.iiit.ac.in/plo/",
  "https://admission.isical.ac.in/",
  "https://www.mbm.ac.in/article/internal-sliding-reap-leep-2026",
  "https://natboard.edu.in/",
  "https://olympiads.hbcse.tifr.res.in/",
  "https://ssc.gov.in/notice.pdf",
];

describe("isNeverOfficial / isSelfSource", () => {
  it("the lists", () => {
    expect(NEVER_OFFICIAL_HOSTS).toEqual(expect.arrayContaining(["aakash.ac.in", "allen.ac.in", "motion.ac.in"]));
    expect(SELF_HOSTS).toEqual(["shishya.in"]);
    // Only hosts, never a whole suffix.
    for (const h of NEVER_OFFICIAL_HOSTS) expect(h.split(".").length).toBeGreaterThanOrEqual(3);
    expect(SOURCE_DENYLIST).toContain("shishya.in");
  });

  it.each(COACHING)("%s is never official", (u) => {
    expect(isNeverOfficial(u)).toBe(true);
    expect(isSelfSource(u)).toBe(false);
  });

  it.each(SELF)("%s is our own site", (u) => {
    expect(isSelfSource(u)).toBe(true);
    expect(isNeverOfficial(u)).toBe(true);
  });

  it.each(BODIES)("%s is not on the list", (u) => {
    expect(isNeverOfficial(u)).toBe(false);
    expect(isSelfSource(u)).toBe(false);
  });

  it("look-alikes are matched on whole labels only", () => {
    expect(isNeverOfficial("https://notallen.ac.in/")).toBe(false); // another .ac.in name
    expect(isNeverOfficial("https://myshishya.in/")).toBe(false);
    expect(isNeverOfficial("https://allen.ac.in.example.com/")).toBe(false); // not on .ac.in at all
    expect(isSelfSource("https://shishya.in.evil.com/")).toBe(false);
    expect(isSelfSource("https://notshishya.vercel.app/")).toBe(false);
    expect(isNeverOfficial(null)).toBe(false);
    expect(isNeverOfficial("ai-generated:claude")).toBe(false);
    expect(isNeverOfficial("ftp://allen.ac.in/x")).toBe(false);
  });
});

describe("isOfficialSource (date tiers, news wording, crawlers, answer-key watch)", () => {
  it.each([...COACHING, ...SELF])("%s is not official, not even as the exam's own portal", (u) => {
    expect(isOfficialSource(u)).toBe(false);
    expect(isOfficialSource(u, u)).toBe(false);
  });

  it.each(BODIES)("%s stays official", (u) => {
    expect(isOfficialSource(u)).toBe(true);
  });

  it("look-alikes of a coaching host keep the plain suffix rule", () => {
    expect(isOfficialSource("https://notallen.ac.in/")).toBe(true); // an .ac.in name nobody listed
    expect(isOfficialSource("https://allen.ac.in.example.com/")).toBe(false);
    expect(isOfficialSource("https://allen-ac.in/")).toBe(false);
  });
});

describe("tiers: a coaching citation is reported, our own site is never a source", () => {
  it("sourceTier", () => {
    expect(sourceTier("official", "https://www.aakash.ac.in/nsejs-exam-dates")).toBe("reported");
    expect(sourceTier("official", "https://motion.ac.in/examinfo/nsea", "https://motion.ac.in")).toBe("reported");
    expect(sourceTier("official", "https://shishya.in/exams/CDS/updates")).toBe("expected");
    expect(sourceTier("official", "https://nta.ac.in/notice.pdf")).toBe("official");
    expect(sourceTier("expected", "https://www.allen.ac.in/x")).toBe("expected");
  });

  it("dateRowTier: a person-checked row cited to a coaching page is still only reported", () => {
    expect(dateRowTier("official", "https://www.allen.ac.in/x", null, "official-research:2026-10-13")).toBe("reported");
    expect(dateRowTier("official", "https://iimtu.edu.in/blog/neet-pg-2026/", "https://natboard.edu.in", "official-research:2026-10-13")).toBe("reported");
    expect(dateRowTier("official", "https://natboard.edu.in/n.pdf", "https://natboard.edu.in", "official-research:2026-10-13")).toBe("official");
  });

  it("citableSourceUrl: a coaching page stays a citable source; our own page does not", () => {
    expect(citableSourceUrl("https://www.aakash.ac.in/x")).toBe("https://www.aakash.ac.in/x");
    expect(isUntrustedSource("https://www.aakash.ac.in/x")).toBe(false);
    expect(citableSourceUrl("https://shishya.in/exams/CDS/updates")).toBeNull();
    expect(isUntrustedSource("https://www.shishya.in/exams/CDS/updates")).toBe(true);
  });

  it("news wording: a coaching link is a secondary source, never 'from official notifications'", () => {
    const coaching = newsProvenance({ source: "ai-generated:claude", url: "https://motion.ac.in/examinfo/nsea" }, "https://iapt.org.in");
    expect(coaching.kind).toBe("secondary");
    expect(coaching.link).toBe("https://motion.ac.in/examinfo/nsea");
    expect(coaching.line).not.toMatch(/official notifications/);
    const own = newsProvenance({ source: "ai-generated:claude", url: "https://shishya.in/exams/CDS/updates" }, null);
    expect(own.link).toBeNull();
    expect(own.kind).toBe("denylisted");
    const body = newsProvenance({ source: "ai-generated:claude", url: "https://nta.ac.in/notice.pdf" }, null);
    expect(body.kind).toBe("official");
  });
});

describe("isOfficialUrl (Ask Shishya labels; the research fetcher reads robots.txt when this is false)", () => {
  it.each([...COACHING, ...SELF])("%s is not official, even as this run's tool portal", (u) => {
    expect(isOfficialUrl(u)).toBe(false);
    expect(isOfficialUrl(u, [u])).toBe(false);
  });

  it.each([...BODIES, "https://cisce.org/x.pdf", "https://www.ets.org/gre", "https://admissions.nid.edu/"])("%s stays official", (u) => {
    expect(isOfficialUrl(u)).toBe(true);
  });

  it("copycats on the source denylist are not official either", () => {
    expect(isOfficialUrl("https://sarkariresult.com.cm/x", ["https://sarkariresult.com.cm/"])).toBe(false);
  });

  it("rankSources files a coaching page under other sources, after the official ones", () => {
    const ranked = rankSources([
      { title: "Aakash", url: "https://www.aakash.ac.in/nsejs-exam-dates" },
      { title: "HBCSE", url: "https://olympiads.hbcse.tifr.res.in/how-to-prepare/" },
    ]);
    expect(ranked.map((s) => [s.source, s.official])).toEqual([
      ["olympiads.hbcse.tifr.res.in", true],
      ["aakash.ac.in", false],
    ]);
  });

  it("relabelOfficialClaims: a coaching page called Official becomes Other source", () => {
    expect(relabelOfficialClaims("[Official — Aakash](https://www.aakash.ac.in/nsejs)")).toBe("[Other source — aakash.ac.in](https://www.aakash.ac.in/nsejs)");
    expect(relabelOfficialClaims("[आधिकारिक — ALLEN](https://www.allen.ac.in/x)", ["https://www.allen.ac.in/"])).toBe("[अन्य स्रोत — allen.ac.in](https://www.allen.ac.in/x)");
    expect(relabelOfficialClaims("[Official — NTA](https://nta.ac.in/n.pdf)")).toBe("[Official — NTA](https://nta.ac.in/n.pdf)");
  });

  it("relabelOfficialClaims: a Shishya link keeps its link and loses the Official claim", () => {
    expect(relabelOfficialClaims("[Official — SSC CGL page](https://shishya.in/exams/SSC_CGL)")).toBe("[SSC CGL page](https://shishya.in/exams/SSC_CGL)");
    expect(relabelOfficialClaims("[Official source: CDS tracker](https://www.shishya.in/exams/CDS/updates)")).toBe("[CDS tracker](https://www.shishya.in/exams/CDS/updates)");
    expect(relabelOfficialClaims("[Official](https://shishya.in/exams/CDS)")).toBe("[Shishya](https://shishya.in/exams/CDS)");
    expect(relabelOfficialClaims("[అధికారిక — CDS](https://shishya.in/exams/CDS)")).toBe("[CDS](https://shishya.in/exams/CDS)");
    // Other Shishya labels are untouched.
    expect(relabelOfficialClaims("[SSC CGL mocks](https://shishya.in/exams/SSC_CGL)")).toBe("[SSC CGL mocks](https://shishya.in/exams/SSC_CGL)");
  });
});

describe("official-papers isOfficialHost (the paper importer)", () => {
  it("a coaching host or our own site is never an official paper host, even as the portal", () => {
    expect(isOfficialHost("www.aakash.ac.in", null)).toBe(false);
    expect(isOfficialHost("cdn.motion.ac.in", "motion.ac.in")).toBe(false);
    expect(isOfficialHost("shishya.in", "shishya.in")).toBe(false);
  });
  it("real bodies and an exam portal on its own .in still pass", () => {
    expect(isOfficialHost("gate2026.iitg.ac.in", null)).toBe(true);
    expect(isOfficialHost("olympiads.hbcse.tifr.res.in", null)).toBe(true);
    expect(isOfficialHost("www.iapt.org.in", "iapt.org.in")).toBe(true);
  });
});
