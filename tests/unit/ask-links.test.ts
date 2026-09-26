// Ask Shishya's link check (26 Sep 2026) — src/lib/ask-links.ts as tests.
//
// Every link an AI answer carries is checked against the site-wide search
// index before it reaches a student: a real page stays (made absolute), a
// guessed page becomes its nearest real parent or plain text, an outside link
// survives only when this run saw it. Built over the committed fixture index
// (tests/fixtures/search-index-fixture.ts). No DB, no network, no model.
// Run: npx vitest run tests/unit/ask-links.test.ts

import { describe, expect, it } from "vitest";
import { fixtureIndex } from "../fixtures/search-index-fixture";
import { knownPath, nearestKnownPath, normUrl, urlsIn, validateAnswerLinks } from "@/lib/ask-links";
import { knownUrl } from "@/lib/search/targets";

const idx = fixtureIndex("deep");
const NONE: ReadonlySet<string> = new Set();
const check = (md: string, seen: ReadonlySet<string> = NONE) => validateAnswerLinks(md, idx, seen);

/** Every link left in a checked answer: a markdown link or a bare URL. */
function linksOf(md: string): string[] {
  const out: string[] = [];
  for (const m of md.matchAll(/\[[^\]\n]*\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()[\]"'`]+)/g)) out.push((m[1] ?? m[2]).replace(/[.,;:!?]+$/, ""));
  return out;
}

describe("Shishya links", () => {
  it("keeps a real page, made absolute, with the exam code upper-cased", () => {
    const r = check("See the [cutoff](/exams/ssc_cgl/cutoff) and https://shishya.in/exams/SSC_CGL/updates.");
    expect(r.answer).toContain("[cutoff](https://shishya.in/exams/SSC_CGL/cutoff)");
    expect(r.answer).toContain("https://shishya.in/exams/SSC_CGL/updates.");
    expect(r.pages.map((p) => p.url)).toEqual(["/exams/SSC_CGL/cutoff", "/exams/SSC_CGL/updates"]);
    expect(r.pages[0]).toMatchObject({ label: "SSC CGL · Cutoff", section: "government" });
  });

  it("rewrites a guessed page to its nearest real parent", () => {
    const r = check("Notes: [Percentage](https://shishya.in/exams/SSC_CGL/topics/NOT_A_TOPIC) · [2019 paper](https://shishya.in/exams/SSC_CGL/pyq/2019)");
    expect(r.answer).toContain("[Percentage](https://shishya.in/exams/SSC_CGL/topics)");
    expect(r.answer).toContain("[2019 paper](https://shishya.in/exams/SSC_CGL/pyq)");
    expect(r.answer).not.toMatch(/NOT_A_TOPIC|pyq\/2019/);
  });

  it("keeps a real PYQ year and a real topic-note page", () => {
    const topic = idx.docs.find((d) => d.kind === "topic-note")!;
    const r = check(`[2024](https://shishya.in/exams/SSC_CGL/pyq/2024) and [notes](https://shishya.in${topic.path})`);
    expect(r.pages.map((p) => p.url)).toEqual(["/exams/SSC_CGL/pyq/2024", topic.path]);
    expect(r.pages[0].label).toBe("SSC CGL · PYQ 2024");
    expect(r.pages[1].label).toBe(topic.title);
  });

  it("unlinks a Shishya link with no real page or parent, keeping the words", () => {
    const r = check("Try the [NOPE exam](https://shishya.in/exams/NOT_AN_EXAM/cutoff) or [this](https://shishya.in/made-up/page).\n- https://shishya.in/exams/{CODE}");
    expect(r.answer).toContain("Try the NOPE exam or this.");
    expect(r.answer).not.toContain("shishya.in/exams/NOT_AN_EXAM");
    expect(r.answer).not.toContain("{CODE}");
    expect(r.pages).toEqual([]);
  });

  it("never falls back to the home page as a parent", () => {
    expect(nearestKnownPath("/made-up", idx)).toBeNull();
    expect(nearestKnownPath("https://shishya.in/", idx)).toEqual({ canon: "/", exact: true });
  });

  it("keeps a /hi twin only where the page has one", () => {
    const r = check("[hi](https://shishya.in/hi/exams/SSC_CGL/updates) [college](https://shishya.in/hi/colleges/iit-madras)");
    expect(r.pages.map((p) => p.url)).toEqual(["/hi/exams/SSC_CGL/updates", "/colleges/iit-madras"]);
  });

  it("keeps real anchors on an exam page and labels them", () => {
    const r = check("[mocks](https://shishya.in/exams/SSC_CGL#mocks)");
    expect(r.pages[0]).toMatchObject({ url: "/exams/SSC_CGL#mocks", label: "SSC CGL · Mock tests" });
  });

  it("knows the exam-area landings (state pages, browse)", () => {
    // 26 Sep 2026 (search fixer): knownUrl itself now knows them (the gap knownPath once covered).
    expect(knownUrl("/exams/state/bihar", idx)).toBe("/exams/state/bihar");
    expect(knownPath("/exams/state/bihar", idx)).toBe("/exams/state/bihar");
    const cat = idx.docs.find((d) => d.kind === "exam-category")!;
    expect(knownPath(`https://shishya.in${cat.path}`, idx)).toBe(cat.path);
    expect(check("[Bihar](https://shishya.in/exams/state/bihar)").pages[0]).toMatchObject({ url: "/exams/state/bihar", section: "government" });
  });

  it("school chapter pages carry their data status", () => {
    const ready = idx.docs.find((d) => d.kind === "school-chapter" && d.status === "ready")!;
    const book = idx.docs.find((d) => d.kind === "school-chapter" && d.status === "book-only")!;
    const r = check(`[a](https://shishya.in${ready.path}) [b](https://shishya.in${book.path})`);
    expect(r.pages.map((p) => p.status)).toEqual(["ready", "book-only"]);
    expect(r.pages.every((p) => p.section === "school")).toBe(true);
  });
});

describe("outside links", () => {
  const seen = new Set(["https://ssc.gov.in/notice", "https://www.education.gov.in/scholarships/"]);

  it("keeps an outside link this run saw and unlinks one it did not", () => {
    const r = check("Official: [SSC](https://ssc.gov.in/notice/). Also [spam](https://jobs-alert.example.com/x) and https://random.example.org/y.", seen);
    expect(r.answer).toContain("[SSC](https://ssc.gov.in/notice/)");
    expect(r.answer).toContain("Also spam and random.example.org.");
    expect(r.answer).not.toContain("jobs-alert.example.com");
  });

  it("lifts the web section's sources", () => {
    const md = [
      "Answer from Shishya's data.",
      "",
      "🌐 From the web (tentative — verify before acting):",
      "- A notice on [education.gov.in](https://education.gov.in/scholarships)",
      "",
      "📌 Pages on Shishya for this:",
      "- [SSC CGL](https://shishya.in/exams/SSC_CGL)",
      "➡️ Open next: [SSC CGL · Dates](https://shishya.in/exams/SSC_CGL/updates)",
    ].join("\n");
    const r = check(md, seen);
    expect(r.webSources).toEqual([{ title: "education.gov.in", url: "https://education.gov.in/scholarships" }]);
    expect(r.next).toMatchObject({ url: "/exams/SSC_CGL/updates", label: "SSC CGL · Dates & updates" });
    expect(r.pages.map((p) => p.url)).toEqual(["/exams/SSC_CGL", "/exams/SSC_CGL/updates"]);
  });

  it("drops javascript: and other non-http links", () => {
    const r = check("[click](javascript:alert(1)) [mail](mailto:a@b.c)");
    expect(r.answer).not.toMatch(/javascript:|mailto:/);
  });
});

describe("next page", () => {
  it("is the Open next link, else the first page, else the fallback", () => {
    expect(check("[a](https://shishya.in/exams/SSC_CGL) and more").next?.url).toBe("/exams/SSC_CGL");
    const fb = { url: "/colleges", label: "Colleges", section: "college" as const };
    expect(validateAnswerLinks("No links here.", idx, NONE, { fallback: fb }).next).toEqual(fb);
    expect(validateAnswerLinks("No links here.", idx, NONE).next).toBeNull();
  });

  it("a guessed Open next link becomes its parent page", () => {
    const r = check("➡️ Open next: [topic](https://shishya.in/exams/SSC_CGL/topics/BAD_CODE)");
    expect(r.next?.url).toBe("/exams/SSC_CGL/topics");
  });
});

describe("link absoluteness (property)", () => {
  // A messy answer with every kind of link the model has written.
  const topic = idx.docs.find((d) => d.kind === "topic-note")!;
  const messy = [
    "[rel](/exams/ssc_cgl) [abs](https://shishya.in/colleges/iit-madras) [www](https://www.shishya.in/careers)",
    `[topic](https://shishya.in${topic.path}) [bad topic](https://shishya.in/exams/CTET/topics/zzz) [year](https://shishya.in/exams/SSC_CGL/pyq/1999)`,
    "https://shishya.in/exams/SSC_CGL/cutoff, https://shishya.in/nope/nope and [x](https://evil.example.com)",
    "[ok](https://ssc.gov.in/notice) [proto](//evil.example.com/x) [js](javascript:void(0))",
  ].join("\n");
  const seen = new Set(["https://ssc.gov.in/notice"]);

  it("every link left is https://shishya.in/… on a real page, or an outside link this run saw", () => {
    const r = check(messy, seen);
    const links = linksOf(r.answer);
    expect(links.length).toBeGreaterThan(4);
    for (const l of links) {
      if (l.startsWith("https://shishya.in")) {
        expect(knownPath(l, idx), l).not.toBeNull();
      } else {
        expect(l.startsWith("https://"), l).toBe(true);
        expect([...seen].map(normUrl)).toContain(normUrl(l));
      }
    }
    for (const p of r.pages) {
      expect(p.url.startsWith("/") && !p.url.startsWith("//"), p.url).toBe(true);
      expect(knownPath(p.url, idx), p.url).not.toBeNull();
    }
  });

  it("urlsIn finds every URL in a tool result", () => {
    expect(urlsIn(JSON.stringify({ a: "https://ssc.gov.in/x.", b: ["see https://shishya.in/exams/SSC_CGL"] }))).toEqual(["https://ssc.gov.in/x", "https://shishya.in/exams/SSC_CGL"]);
  });
});
