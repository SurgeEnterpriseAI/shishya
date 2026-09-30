// Official releases on the surfaces (30 Sep 2026), src/lib/official-release.ts
// + src/components/OfficialReleaseLine.tsx and its mounts.
//
// "Released" / "published" is said ONLY for a row the official watch wrote
// (source official-watch, official tier, citable link) — never for an
// AI-cited official date — and only for 30 days after the release, whatever
// the exam-week phase. A row first seen without a printed date says "first
// seen". The same change carries the searchability: the /updates title names
// the key only while such a row exists, context.md / llms-full.txt / llms.txt
// carry the line, IndexNow gets the pages that print it. en / hi / te parity.
// No DB (prisma mocked), no network.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/db/prisma", () => ({ prisma: {} }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

import { dict, type StringKey } from "@/lib/i18n";
import {
  FIRST_SEEN_NOTE_PREFIX,
  RELEASE_SHOWN_DAYS,
  isVerifiedRelease,
  officialReleases,
  releaseLineKey,
  releaseLineParts,
  releaseLineText,
  releaseMachineLine,
  titleRelease,
  type ReleaseRowInput,
} from "@/lib/official-release";
import { OFFICIAL_WATCH_SOURCE, buildTimeline } from "@/lib/exam-timeline";
import { officialReleaseUrls } from "@/lib/indexnow";

const NOW = new Date("2026-09-30T06:00:00Z");
const PORTAL = "https://upsc.gov.in";
let n = 0;
function row(over: Partial<ReleaseRowInput> & { date: Date | string }): ReleaseRowInput {
  return {
    id: `r${++n}`,
    label: "Answer key (provisional) — NDA & NA (II) 2026 exam",
    isExamDay: false,
    kind: "ANSWER_KEY",
    confidence: "official",
    url: "https://upsc.gov.in/sites/default/files/AnsKey-NDA-II-2026.pdf",
    source: OFFICIAL_WATCH_SOURCE,
    notes: "date printed beside the link on upsc.gov.in",
    ...over,
  };
}
const day = (iso: string) => new Date(`${iso}T00:00:00Z`);

describe("officialReleases — only what the watch saw on the official page", () => {
  it("an official-watch answer key within 30 days is a release, with its host and year", () => {
    const r = officialReleases([row({ date: day("2026-09-22") })], PORTAL, NOW);
    expect(r.answerKey).toMatchObject({ kind: "ANSWER_KEY", day: "2026-09-22", host: "upsc.gov.in", firstSeen: false, year: 2026 });
    expect(r.result).toBeNull();
  });
  it("an AI-cited official date is never called released", () => {
    const ai = row({ date: day("2026-09-22"), source: "ai-generated:claude" });
    expect(isVerifiedRelease(ai, PORTAL)).toBe(false);
    expect(officialReleases([ai], PORTAL, NOW).answerKey).toBeNull();
  });
  it("an official-watch row cited off the official host (reported tier) or uncited is not a release", () => {
    expect(officialReleases([row({ date: day("2026-09-22"), url: "https://www.adda247.com/nda-key.pdf" })], PORTAL, NOW).answerKey).toBeNull();
    expect(officialReleases([row({ date: day("2026-09-22"), url: null })], PORTAL, NOW).answerKey).toBeNull();
    expect(officialReleases([row({ date: day("2026-09-22"), confidence: "expected" })], PORTAL, NOW).answerKey).toBeNull();
  });
  it("shown for RELEASE_SHOWN_DAYS days, never for a future date", () => {
    expect(RELEASE_SHOWN_DAYS).toBe(30);
    expect(officialReleases([row({ date: day("2026-08-31") })], PORTAL, NOW).answerKey).not.toBeNull();
    expect(officialReleases([row({ date: day("2026-08-30") })], PORTAL, NOW).answerKey).toBeNull();
    expect(officialReleases([row({ date: day("2026-10-01") })], PORTAL, NOW).answerKey).toBeNull();
  });
  it("cached rows (ISO-string dates) work; the newest release of each kind wins", () => {
    const r = officialReleases(
      [
        row({ date: "2026-09-15T00:00:00.000Z" }),
        row({ date: "2026-09-25T00:00:00.000Z", label: "Answer key (final) — NDA 2026" }),
        row({ date: day("2026-09-28"), kind: "RESULT", label: "Result — NDA & NA (II) 2026", url: "https://upsc.gov.in/results/nda-2026.pdf" }),
      ],
      PORTAL,
      NOW,
    );
    expect(r.answerKey?.day).toBe("2026-09-25");
    expect(r.result?.day).toBe("2026-09-28");
    expect(titleRelease(r)?.kind).toBe("RESULT");
  });
  it("a row first seen without a printed date is worded 'first seen'", () => {
    const r = officialReleases([row({ date: day("2026-09-29"), notes: `${FIRST_SEEN_NOTE_PREFIX}upsc.gov.in 2026-09-29; the body printed no date` })], PORTAL, NOW);
    expect(r.answerKey?.firstSeen).toBe(true);
    expect(releaseLineKey(r.answerKey!)).toBe("release.akFirstSeen");
    expect(releaseMachineLine(r.answerKey!)).toBe(
      "Official answer key released — first seen 2026-09-29 on upsc.gov.in (no single release date printed beside the link): https://upsc.gov.in/sites/default/files/AnsKey-NDA-II-2026.pdf",
    );
  });
  it("the gate's 'outside' note (only a future / exam-day date printed) is also first seen", () => {
    const notes = `${FIRST_SEEN_NOTE_PREFIX}upsc.gov.in 2026-09-29; no date printed beside the link falls between the exam and today (2026-10-12)`;
    expect(officialReleases([row({ date: day("2026-09-29"), notes })], PORTAL, NOW).answerKey?.firstSeen).toBe(true);
  });
  it("the machine line (context.md / llms-full.txt)", () => {
    const r = officialReleases([row({ date: day("2026-09-28"), kind: "RESULT", label: "Result — NDA 2026", url: "https://upsc.gov.in/r.pdf" })], PORTAL, NOW);
    expect(releaseMachineLine(r.result!)).toBe("Official result published — 2026-09-28 — upsc.gov.in: https://upsc.gov.in/r.pdf");
  });
});

describe("the line in en / hi / te", () => {
  const KEYS = [
    "release.ak",
    "release.akFirstSeen",
    "release.result",
    "release.resultFirstSeen",
    "release.title.ak",
    "release.title.result",
    "ew.post.released",
    "ew.post.published",
    "ew.post.releasedFirstSeen",
    "ew.post.publishedFirstSeen",
  ] as const satisfies readonly StringKey[];
  const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  it("every key exists in en, hi and te with exactly the English placeholders, in its own script", () => {
    for (const k of KEYS) {
      const en = dict.en[k];
      expect(en, k).toBeTruthy();
      for (const [lc, re] of [["hi", /[ऀ-ॿ]/], ["te", /[ఀ-౿]/]] as const) {
        const v = (dict[lc] as Record<string, string>)[k];
        expect(v, `${lc} ${k}`).toBeTruthy();
        expect(ph(v), `${lc} ${k}`).toEqual(ph(en));
        expect(re.test(v), `${lc} ${k}`).toBe(true);
      }
    }
  });
  it("the hub / tracker wording", () => {
    expect(dict.en["release.ak"]).toBe("Official answer key released — {date} — {host}");
    expect(dict.en["release.result"]).toBe("Official result published — {date} — {host}");
    expect(dict.en["release.title.ak"]).toBe("{exam} answer key {year} (official)");
  });
  it("releaseLineParts splits around {host} (the link) and fills the date", () => {
    const r = officialReleases([row({ date: day("2026-09-22") })], PORTAL, NOW).answerKey!;
    const p = releaseLineParts(dict.en["release.ak"], r, "en");
    expect(p.before).toMatch(/^Official answer key released — 22 Sept? 2026 — $/);
    expect(p.host).toBe("upsc.gov.in");
    expect(p.after).toBe("");
    for (const lc of ["hi", "te"] as const) {
      const text = releaseLineText((dict[lc] as Record<string, string>)["release.ak"], r, lc);
      expect(text).toContain("upsc.gov.in");
      expect(text).not.toMatch(/\{(date|host)\}/);
    }
  });
});

describe("TimelineRow.verified", () => {
  it("true only for an official-tier official-watch row", () => {
    const rows = [
      { ...row({ date: day("2026-09-22") }), id: "a" },
      { ...row({ date: day("2026-09-22"), source: "ai-generated:claude" }), id: "b" },
      { ...row({ date: day("2026-09-22"), url: "https://testbook.com/nda-key" }), id: "c" },
    ].map((r) => ({ ...r, date: r.date as Date }));
    const t = buildTimeline(rows, NOW, PORTAL);
    expect(Object.fromEntries(t.map((r) => [r.id, r.verified]))).toEqual({ a: true, b: false, c: false });
  });
  // Review, 30 Sep 2026 (should-fix 4): the exam-week block and the result
  // mail need to know a verified row's date is the day it was first seen.
  it("firstSeen: only a verified row whose notes start 'first seen on '", () => {
    const seen = `${FIRST_SEEN_NOTE_PREFIX}upsc.gov.in 2026-09-22; the body printed no date`;
    const rows = [
      { ...row({ date: day("2026-09-22"), notes: seen }), id: "a" },
      { ...row({ date: day("2026-09-22") }), id: "b" },
      { ...row({ date: day("2026-09-22"), notes: seen, source: "ai-generated:claude" }), id: "c" },
    ].map((r) => ({ ...r, date: r.date as Date }));
    const t = buildTimeline(rows, NOW, PORTAL);
    expect(Object.fromEntries(t.map((r) => [r.id, r.firstSeen]))).toEqual({ a: true, b: false, c: false });
  });
  it("the exam-week wording: 'released — first seen {date} on {host}'", () => {
    expect(dict.en["ew.post.releasedFirstSeen"]).toBe("released — first seen {date} on {host}");
    expect(dict.en["ew.post.publishedFirstSeen"]).toBe("published — first seen {date} on {host}");
  });
});

describe("IndexNow set for a release", () => {
  it("hub, tracker, calendar, state page, exam-week pages, context.md and the twins; /cutoff only when it renders", () => {
    const urls = officialReleaseUrls("TN_TNPSC_GROUP4", "tamil-nadu", { cutoff: false });
    const S = "https://shishya.in";
    for (const u of [
      `${S}/exams/TN_TNPSC_GROUP4`,
      `${S}/exams/TN_TNPSC_GROUP4/updates`,
      `${S}/exam-calendar`,
      `${S}/exams/state/tamil-nadu`,
      `${S}/exams/TN_TNPSC_GROUP4/context.md`,
      `${S}/exams/TN_TNPSC_GROUP4/checklist`,
      `${S}/hi/exams/TN_TNPSC_GROUP4/updates`,
      `${S}/te/exams/TN_TNPSC_GROUP4`,
    ])
      expect(urls).toContain(u);
    expect(urls).not.toContain(`${S}/exams/TN_TNPSC_GROUP4/cutoff`);
    expect(new Set(urls).size).toBe(urls.length);
    expect(officialReleaseUrls("NDA", null, { cutoff: true })).toContain(`${S}/exams/NDA/cutoff`);
  });
});

describe("mounted where searchers land, in the same change as the searchability", () => {
  const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
  it("the hub mounts the line right under the answer lead, from every live row (titleDates)", () => {
    const hub = read("src/app/exams/[code]/page.tsx");
    expect(hub).toMatch(/<OfficialReleaseLine rows=\{shared\.titleDates\.length > 0 \? shared\.titleDates : importantDates\}/);
    expect(hub.indexOf("<OfficialReleaseLine")).toBeLessThan(hub.indexOf("<ExamWeekBlock"));
  });
  it("/updates mounts it under the status strip, before the sign-up line and outside the soft wall; the title names the key only via titleRelease", () => {
    const upd = read("src/app/exams/[code]/updates/page.tsx");
    const at = upd.indexOf("<OfficialReleaseLine");
    expect(at).toBeGreaterThan(0);
    expect(at).toBeLessThan(upd.indexOf("<SignupInline"));
    expect(at).toBeLessThan(upd.indexOf("<SoftWall>"));
    expect(upd).toMatch(/const metaRelease = titleRelease\(officialReleases\(metaReleaseRows, metaOfficialUrl\)\)/);
    expect(upd).toMatch(/source: OFFICIAL_WATCH_SOURCE/);
  });
  it("the component words only verified rows, the host as the link", () => {
    const c = read("src/components/OfficialReleaseLine.tsx");
    expect(c).toMatch(/officialReleases\(rows, officialUrl, now\)/);
    expect(c).toMatch(/releaseLineParts\(/);
    expect(c).toMatch(/href=\{r\.url\}/);
  });
  it("the exam-week block says released / published only for verified rows, 'first seen' for a first-seen one", () => {
    const b = read("src/components/ExamWeekBlock.tsx");
    expect(b).toMatch(/state\.answerKey\.verified && state\.answerKey\.url\s*\?\s*releasedText\(state\.answerKey, "released"\)/);
    expect(b).toMatch(/resultRow\.verified && resultRow\.url\s*\?\s*releasedText\(resultRow, "published"\)/);
    expect(b).toMatch(/r\.firstSeen\s*\?\s*"ew\.post\.releasedFirstSeen"\s*:\s*"ew\.post\.released"/);
    expect(b).toMatch(/r\.firstSeen\s*\?\s*"ew\.post\.publishedFirstSeen"\s*:\s*"ew\.post\.published"/);
  });
  it("context.md, llms-full.txt and llms.txt carry the line", () => {
    expect(read("src/app/exams/[code]/context.md/route.ts")).toMatch(/## Official release — seen on the conducting body's own site/);
    const full = read("src/app/llms-full.txt/route.ts");
    expect(full).toMatch(/## Official answer keys and results — seen on the conducting body's own site \(last 30 days\)/);
    expect(full).toMatch(/d\.source = \$\{OFFICIAL_WATCH_SOURCE\}/);
    // Review, 30 Sep 2026: "first seen" also covers only-outside-window dates.
    expect(full).toMatch(/A "first seen" date is the day Shishya first saw the link \(no single release date was printed beside it\)\./);
    expect(read("public/llms.txt")).toMatch(/Official answer key released — \{date\} — \{site\}/);
  });
});
