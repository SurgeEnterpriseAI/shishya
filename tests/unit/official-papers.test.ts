// Official previous-year papers (14 Sep 2026): which hosts count as official,
// how a listing page proves it links a file and prints its year, and how the
// pages order and describe the files. Pure — no DB, no network.
// Run: npx vitest run tests/unit/official-papers.test.ts

import { describe, it, expect } from "vitest";
import {
  asciiDigits,
  baseDomain,
  checkListing,
  formatPdfSize,
  groupPapersByYear,
  hostOf,
  isOfficialHost,
  paperContextLines,
  papersForYear,
  paperYear,
  yearPrinted,
  type OfficialPaperRow,
} from "@/lib/official-papers";

const paper = (over: Partial<OfficialPaperRow>): OfficialPaperRow => ({
  year: "2024",
  paper: "General Studies Paper I",
  kind: "question paper",
  language: "English",
  url: "https://rpsc.rajasthan.gov.in/Static/PreviousQuestionPaper/ABC.pdf",
  listingUrl: "https://rpsc.rajasthan.gov.in/quespapers",
  publisher: "Rajasthan Public Service Commission",
  bytes: 2_779_675,
  pages: 24,
  scan: true,
  ...over,
});

describe("official hosts", () => {
  it("accepts government and public academic domains", () => {
    expect(isOfficialHost("rpsc.rajasthan.gov.in", null)).toBe(true);
    expect(isOfficialHost("kpsc.kar.nic.in", null)).toBe(true);
    expect(isOfficialHost("gate2026.iitg.ac.in", null)).toBe(true);
  });

  it("accepts a body's own non-government domain only through the exam's official portal", () => {
    expect(isOfficialHost("www.tslprb.in", null)).toBe(false);
    expect(isOfficialHost("www.tslprb.in", "tslprb.in")).toBe(true);
    expect(isOfficialHost("tslprb.in.example.com", "tslprb.in")).toBe(false);
  });

  it("rejects everything else", () => {
    expect(isOfficialHost("www.examcoaching.com", "upsc.gov.in")).toBe(false);
    expect(isOfficialHost("drive.google.com", null)).toBe(false);
    expect(isOfficialHost(null, "upsc.gov.in")).toBe(false);
    expect(hostOf("javascript:alert(1)")).toBeNull();
  });

  it("reads the registrable domain under Indian two-part suffixes", () => {
    expect(baseDomain("rpsc.rajasthan.gov.in")).toBe("rajasthan.gov.in");
    expect(baseDomain("www.tslprb.in")).toBe("tslprb.in");
  });
});

describe("years", () => {
  it("reads the calendar year a label names, in any Indian digits", () => {
    expect(paperYear("2024")).toBe("2024");
    expect(paperYear("CCE 2024-25")).toBe("2024");
    expect(paperYear("परीक्षा २०२३")).toBe("2023");
    expect(paperYear("Paper I")).toBeNull();
    expect(asciiDigits("౨౦౨౫")).toBe("2025");
  });

  it("matches a year only as a whole number", () => {
    expect(yearPrinted("RAS (Pre) Exam - 2024", "2024")).toBe(true);
    expect(yearPrinted("Advt. No. 12024/2023", "2024")).toBe(false);
  });
});

describe("checkListing", () => {
  const url = "https://rpsc.rajasthan.gov.in/Static/PreviousQuestionPaper/8554F13A-94F1.pdf";

  it("finds a relative link and the year in the same table row", () => {
    const html = `<table><tr><td>2023</td><td>RAS Pre</td><td><a href="/Static/PreviousQuestionPaper/OLD.pdf">Download</a></td></tr>
      <tr><td>2024</td><td>RAS Pre</td><td><a href="../Static/PreviousQuestionPaper/8554F13A-94F1.pdf">Download</a></td></tr></table>`;
    const r = checkListing(html, url, "2024");
    expect(r.linked).toBe(true);
    expect(r.yearBeside).toBe(true);
    expect(r.evidence).toContain("2024");
  });

  it("does not credit a neighbouring row's year", () => {
    const html = `<table><tr><td>2023</td><td><a href="/Static/PreviousQuestionPaper/8554F13A-94F1.pdf">Download</a></td></tr>
      <tr><td>2024</td><td>RAS Pre</td></tr></table>`;
    expect(checkListing(html, url, "2024")).toMatchObject({ linked: true, yearBeside: false });
  });

  it("reports a file the page does not link", () => {
    expect(checkListing("<ul><li>2024 <a href='/other.pdf'>x</a></li></ul>", url, "2024").linked).toBe(false);
  });

  it("matches a percent-encoded file name", () => {
    const spaced = "https://ssc.gov.in/uploads/Answer Key 2024 Tier I.pdf";
    const html = `<li>Tier I answer key, 2024: <a href="https://ssc.gov.in/uploads/Answer%20Key%202024%20Tier%20I.pdf">PDF</a></li>`;
    expect(checkListing(html, spaced, "2024")).toMatchObject({ linked: true, yearBeside: true });
  });

  it("credits the heading that introduces a short list of links", () => {
    const key = "https://psc.ap.gov.in/Documents/KEYS/Group-II/Group%20-%20II%20Revised%20key_new.pdf";
    const html = `<span><b>Screening Test For NOTIFICATION NO.25/2018 (Published on 05/07/2019): </b></span>
      <table style="width: 100%"><tr><td><ul type="square">
        <li><a href="https://psc.ap.gov.in/Documents/KEYS/Group-II/Group%20-%20II%20Revised%20key_new.pdf" target="_blank"><span>Revised Key</span></a></li>
        <li><a href="https://psc.ap.gov.in/Documents/KEYS/Group-II/Question-Paper-2019.pdf">Question Paper</a></li>
      </ul></td></tr></table>`;
    expect(checkListing(html, key, "2019")).toMatchObject({ linked: true, yearBeside: true });
  });

  it("reads a JSON listing's record, but never a year that only a file name carries", () => {
    const json = JSON.stringify([
      { title: "CET-2022 (Group C) Final Answer Key", file: "/uploads/notice/cet-final-key.pdf" },
      { title: "Answer key, Group C", file: "/uploads/notice/CET-2025-shift-1-key.pdf" },
    ]);
    expect(checkListing(json, "https://hssc.gov.in/uploads/notice/cet-final-key.pdf", "2022")).toMatchObject({ linked: true, yearBeside: true });
    expect(checkListing(json, "https://hssc.gov.in/uploads/notice/CET-2025-shift-1-key.pdf", "2025")).toMatchObject({
      linked: true,
      yearBeside: false,
    });
  });

  it("never credits a long table's heading to the rows in it", () => {
    const rows = Array.from({ length: 8 }, (_, i) => `<tr><td>Paper ${i}</td><td><a href="/Static/PreviousQuestionPaper/P${i}-LONGNAME.pdf">Download</a></td></tr>`).join("");
    const html = `<h2>Question papers 2024</h2><table>${rows}</table>`;
    for (const i of [0, 3]) {
      expect(checkListing(html, `https://rpsc.rajasthan.gov.in/Static/PreviousQuestionPaper/P${i}-LONGNAME.pdf`, "2024")).toMatchObject({
        linked: true,
        yearBeside: false,
      });
    }
  });
});

describe("display", () => {
  const rows = [
    paper({ year: "2021", url: "https://rpsc.rajasthan.gov.in/a.pdf" }),
    paper({ year: "2024", kind: "answer key", paper: "Final Answer Key", url: "https://rpsc.rajasthan.gov.in/b.pdf" }),
    paper({ year: "2024", url: "https://rpsc.rajasthan.gov.in/c.pdf" }),
    paper({ year: "", kind: "listing page", paper: "Group C question papers", url: "https://mpsc.gov.in/papers", bytes: 0 }),
  ];

  it("orders years newest first and question papers before keys, without listing pages", () => {
    const groups = groupPapersByYear(rows);
    expect(groups.map((g) => g.year)).toEqual(["2024", "2021"]);
    expect(groups[0].rows.map((r) => r.kind)).toEqual(["question paper", "answer key"]);
    expect(papersForYear(rows, 2024)).toHaveLength(2);
    expect(papersForYear(rows, 2019)).toHaveLength(0);
  });

  it("describes each file for answer engines, with the publisher and the link", () => {
    const lines = paperContextLines(rows);
    expect(lines[0]).toBe(
      "- 2024 · General Studies Paper I (question paper, English, scanned PDF, 2.8 MB) — published by Rajasthan Public Service Commission: https://rpsc.rajasthan.gov.in/c.pdf",
    );
    expect(lines.at(-1)).toBe(
      "- Rajasthan Public Service Commission lists its Group C question papers on its own site (files open from that page): https://mpsc.gov.in/papers",
    );
    expect(formatPdfSize(640_000)).toBe("640 KB");
    expect(formatPdfSize(0)).toBe("");
  });
});
