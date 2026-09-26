// Pins the evidence rules of scripts/import-annual-calendars.ts
// (scripts/annual-calendar-evidence.ts, 27 Sep 2026): struck-through and
// commented-out dates never match, merged-cell / header lookups pick the
// right column, and a PDF is hashed as served unless a server appended its
// HTML page after %%EOF.

import { describe, expect, it } from "vitest";
import { checkEvidence, htmlDoc, norm, pdfBytes, readHtml, type EvidenceDoc } from "../../scripts/annual-calendar-evidence";

// Shaped like gate2027.iitm.ac.in/important_dates on 27 Sep 2026.
const GATE_HTML = `<table><thead><tr><th>Activity</th><th>Date*</th><th>Day</th></tr></thead><tbody>
<tr><td><span> Opening Date of <a href="/guideline/"> GATE Online Application Processing System (GOAPS) </a></span></td>
<td><del><span>14<sup>th</sup> August 2026</span></del><br><del><span>27<sup>th</sup> August 2026</span></del> <br><span>2<sup>nd</sup> September 2026</span></td>
<td><del><span>Friday</span></del><br><del><span>Thursday</span></del><br><span>Wednesday</span></td></tr>
<tr><td><span> Closing Date of EXTENDED online registration (with late fee) </span></td>
<td><del> <span>30<sup>th</sup> September 2026</span></del><br><span>5<sup>th</sup> October 2026</span></td><td><span>Monday</span></td></tr>
</tbody></table>`;

// Shaped like tnpsc.gov.in/english/annual_planner.html: an old row kept in a comment.
const TNPSC_HTML = `<table>
<tr><th>S.No.</th><th>Name of the Examination</th><th>Date of Notification</th><th>Date of Commencement of Examination</th><th>No. of Days of Examination</th></tr>
<tr><td>6</td><td>Combined Civil Services Examination &ndash; IV (Group IV Services)</td><td>06.10.2026</td><td>20.12.2026</td><td>1</td></tr>
<!-- <tr><td>7</td><td>Combined Civil Services Examination - Group VA Services</td><td>07.10.2025</td><td>21.12.2025</td><td>1</td></tr> -->
</table>`;

describe("readHtml", () => {
  it("drops struck-through dates and keeps superscript ordinals attached", () => {
    const { text } = readHtml(GATE_HTML);
    expect(text).toContain("Opening Date of GATE Online Application Processing System (GOAPS) 2nd September 2026 Wednesday");
    expect(text).not.toContain("27th August 2026");
    expect(text).not.toContain("Thursday");
  });

  it("drops commented-out rows", () => {
    const { tables } = readHtml(TNPSC_HTML);
    expect(tables[0]).toHaveLength(2);
    expect(tables[0].flat().join(" ")).not.toContain("Group VA");
  });
});

describe("checkEvidence", () => {
  it("phrase: matches only the live date", () => {
    const doc = htmlDoc(GATE_HTML);
    expect(checkEvidence(doc, { type: "phrase", text: "Closing Date of EXTENDED online registration (with late fee) 5th October 2026 Monday" })).toBeNull();
    expect(checkEvidence(doc, { type: "phrase", text: "(with late fee) 30th September 2026" })).toMatch(/phrase not in document/);
  });

  it("cell: row + header column + value, dashes normalised", () => {
    const doc = htmlDoc(TNPSC_HTML);
    expect(checkEvidence(doc, { type: "cell", row: "Examination - IV (Group IV Services)", col: "Date of Notification", value: "06.10.2026" })).toBeNull();
    expect(checkEvidence(doc, { type: "cell", row: "(Group IV Services)", col: "Date of Commencement of Examination", value: "20.12.2026" })).toBeNull();
    // a value from another column is refused, and says what the cell holds
    expect(checkEvidence(doc, { type: "cell", row: "(Group IV Services)", col: "Date of Notification", value: "20.12.2026" })).toMatch(/reads "06\.10\.2026"/);
    expect(checkEvidence(doc, { type: "cell", row: "Group VA", col: "Date of Notification", value: "07.10.2025" })).toMatch(/no table row/);
  });

  it("cell: the first header column that names it, left to right (Scale I before Scale II and III)", () => {
    const doc: EvidenceDoc = {
      text: "",
      lines: [],
      tables: [
        [
          ["", "officer scale i", "officer scale ii and iii", "office assistants"],
          ["preliminary examination", "21st and 22nd november 2026", "na", "6th, 12th and 13th december 2026"],
          ["main/ single examination", "20th december 2026", "20th december 2026", "30th january 2027"],
        ],
      ],
    };
    expect(checkEvidence(doc, { type: "cell", row: "Preliminary Examination", col: "Officer Scale I", value: "21st and 22nd November 2026" })).toBeNull();
    expect(checkEvidence(doc, { type: "cell", row: "Preliminary Examination", col: "Officer Scale II and III", value: "21st" })).not.toBeNull();
    expect(checkEvidence(doc, { type: "cell", row: "Main/ Single Examination", col: "Office Assistants", value: "30th January 2027" })).toBeNull();
  });

  it("cell: a merged date cell repeated over the rows it covers (UPSC NDA (I) / CDS (I))", () => {
    const doc: EvidenceDoc = {
      text: "",
      lines: [],
      tables: [
        [
          ["sl. no.", "name of examination", "date of notification", "last date for receipt of applications", "date of commencement of exam"],
          ["7.", "n.d.a. & n.a. examination (i), 2027", "02.12.2026", "22.12.2026", "11.04.2027 (sunday)"],
          ["8.", "c.d.s. examination (i), 2027", "02.12.2026", "22.12.2026", "11.04.2027 (sunday)"],
          ["20.", "n.d.a. & n.a. examination (ii), 2027", "12.05.2027", "01.06.2027", "19.09.2027 (sunday)"],
        ],
      ],
    };
    expect(checkEvidence(doc, { type: "cell", row: "C.D.S. Examination (I), 2027", col: "Date of commencement of Exam", value: "11.04.2027" })).toBeNull();
    // "(I), 2027" is not "(II), 2027"
    expect(checkEvidence(doc, { type: "cell", row: "N.D.A. & N.A. Examination (I), 2027", col: "Date of Notification", value: "12.05.2027" })).not.toBeNull();
  });

  it("line: all tokens on one printed line", () => {
    const doc: EvidenceDoc = { text: "", tables: [], lines: ["76. i-li1c1 (f4) -1't-2026 06.12.2026", "77. something 16.12.2026"].map(norm) };
    expect(checkEvidence(doc, { type: "line", tokens: ["76.", "06.12.2026"] })).toBeNull();
    expect(checkEvidence(doc, { type: "line", tokens: ["77.", "06.12.2026"] })).toMatch(/no printed line/);
  });
});

describe("pdfBytes", () => {
  it("keeps a file that ends in %%EOF and a line break whole", () => {
    const buf = Buffer.from("%PDF-1.5\n...\n%%EOF\n", "latin1");
    expect(pdfBytes(buf).equals(buf)).toBe(true);
  });

  it("cuts an HTML page a server appended after the final %%EOF", () => {
    const pdf = "%PDF-1.7\n...\n%%EOF";
    const buf = Buffer.from(`${pdf}\r\n<!DOCTYPE html><html>…</html>`, "utf8");
    expect(pdfBytes(buf).toString("latin1")).toBe(pdf);
  });
});
