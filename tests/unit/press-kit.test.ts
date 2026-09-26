// /press — the press kit (27 Sep 2026). No DB, no network, no render: the
// builders are fed a PublicNumbers fixture shaped like the 27 Sep 2026 prod
// read (test input, not page copy), and the page is checked at source level.
//
// Pins:
//   • company facts are only the ones /about and the root layout's
//     Organization JSON-LD already publish — no founder name, no phone;
//   • the "free" facts match /about, /pricing and /editorial-policy;
//   • no statistic is typed: the page has no number literal, press-kit.ts
//     none but the brand files' real sizes, and no copy string carries one;
//   • every key fact comes from the numbers loaders with their gate and links
//     to a definition that exists on /shishya-in-numbers;
//   • no ranking, trust, superlative or valuation claim, and none of the
//     truth-lint phrases;
//   • every brand asset is a real file (public/ or the /opengraph-image
//     route) with the size the page states; every internal link has a page;
//   • the page stays static (hourly ISR, no request state).

import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import type { CounterRow, CoverageGroup, PublicNumbers } from "@/lib/public-numbers";
import { findForbiddenPhrases } from "@/lib/truth-lint";
import { MENTOR_SESSION_FEE_PAISE } from "@/lib/razorpay";
import { SUPPRESSED } from "@/lib/public-stats";
import {
  buildActives30,
  buildAnswerCheck,
  buildCohortReturns,
  buildReports,
  buildSignupSources,
  buildWeeklyUsage,
  numbersWindows,
  type CohortRow,
  type PublicNumber,
} from "@/lib/public-numbers-rules";
import { PULSE_HARD_MIN_TOPICS, PULSE_HARD_ROWS, parsePulseSlug } from "@/lib/pulse-rules";
import {
  BRAND_ASSETS,
  BRAND_COLOURS,
  BRAND_NAMES,
  BRAND_RULE,
  COMPANY,
  FREE_FACTS,
  MENTOR_FEE,
  NOT_LIST,
  NUMBERS_ANCHORS,
  PRESS_DESCRIPTION,
  PRESS_HARDEST_MIN_TOPICS,
  PRESS_MAILTO,
  PRESS_TITLE,
  PRESS_URL,
  WHO_RUNS_IT,
  answerCheckShort,
  answerCheckSummary,
  keyFacts,
  methodBlocks,
  pressPageLd,
  pulseCitationLine,
  pulseFinding,
  storyAngles,
  type PressPulse,
} from "@/lib/press-kit";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8").replace(/\r\n/g, "\n");
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));

const PAGE = "src/app/press/page.tsx";
const LIB = "src/lib/press-kit.ts";
const COPY = "src/components/press/CopyText.tsx";
const PRESS_FILES = [PAGE, LIB, COPY];

/** Source with comments, string literals and template literals removed. */
function code(src: string): string {
  let out = "";
  let i = 0;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && n === "*") {
      i = src.indexOf("*/", i + 2);
      i = i < 0 ? src.length : i + 2;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      i++;
      while (i < src.length && src[i] !== c) i += src[i] === "\\" ? 2 : 1;
      i++;
      out += '""';
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

/** Source without comments (strings, JSX text and code stay). */
const noComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

// ── Fixture: the 27 Sep 2026 prod read ────────────────────────────────

const NOW = new Date("2026-09-26T18:39:27Z");
const WIN = numbersWindows(NOW);
const MONDAYS = ["2026-07-20", "2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07"];
const COHORTS: CohortRow[] = [
  { wk: MONDAYS[0], cohort: 97, ret7: 22, ret30: 17 },
  { wk: MONDAYS[1], cohort: 118, ret7: 31, ret30: 12 },
  { wk: MONDAYS[2], cohort: 124, ret7: 41, ret30: 17 },
  { wk: MONDAYS[3], cohort: 165, ret7: 44, ret30: 27 },
  { wk: MONDAYS[4], cohort: 212, ret7: 60, ret30: 23 },
  { wk: MONDAYS[5], cohort: 157, ret7: 48, ret30: 29 },
  { wk: MONDAYS[6], cohort: 211, ret7: 64, ret30: 29 },
  { wk: MONDAYS[7], cohort: 162, ret7: 41, ret30: 17 },
];
const USAGE_MONDAYS = ["2026-07-27", "2026-08-03", "2026-08-10", "2026-08-17", "2026-08-24", "2026-08-31", "2026-09-07", "2026-09-14"];
const wkn = (ns: number[]) => ns.map((n, i) => ({ wk: USAGE_MONDAYS[i], n }));

function coverageFixture(): PublicNumber<CoverageGroup[]> {
  const row = (id: string, label: string, value: number, detail?: string) => ({ id, label, value, definition: `Definition of ${id}.`, ...(detail ? { detail } : {}) });
  return {
    id: "coverage",
    label: "What Shishya covers",
    value: [
      {
        title: "Exams and practice",
        rows: [row("exams", "Exams covered", 180), row("checked-questions", "Practice questions that passed the answer check", 34543)],
      },
      {
        title: "School",
        rows: [
          row("ncert-chapters", "NCERT chapters listed, each linking the official book", 1146),
          row("chapters-with-notes", "School chapters with Shishya's own notes", 124),
          row("chapters-with-practice", "School chapters with checked practice", 5),
          row("school-questions-awaiting-check", "School questions written, not yet through the answer check", 4611),
        ],
      },
      {
        title: "Official sources",
        rows: [
          row("official-papers", "Official previous-year papers linked", 193, "on 31 exams"),
          row("official-cutoffs", "Official cutoff rows", 7845, "on 15 exams"),
          row("dates-official", "Exam dates in the next 90 days marked Official", 90, "on 40 exams"),
          row("dates-reported", "Exam dates in the next 90 days marked Reported", 32, "on 12 exams"),
          row("dates-expected", "Exam dates in the next 90 days marked Expected", 195, "on 80 exams"),
        ],
      },
      {
        title: "Colleges, scholarships, careers and languages",
        rows: [row("languages", "Languages", 19, "English and 18 Indian languages")],
      },
    ],
    definition: "Counts of what Shishya holds.",
    asOf: WIN.today,
    period: "today",
    source: "Exam",
  };
}

function fullNumbers(overrides: Partial<PublicNumbers> = {}): PublicNumbers {
  const counters: PublicNumber<CounterRow[]> = {
    id: "all-time-counters",
    label: "All-time counters",
    value: [{ key: "totalSignups", label: "Accounts", value: 1909, definition: "User rows (accounts).", people: true }],
    definition: "The site's live counters.",
    asOf: WIN.today,
    period: "all time",
    source: "getLiveCounts",
  };
  return {
    today: WIN.today,
    cohorts: buildCohortReturns(COHORTS, WIN),
    actives: buildActives30({ accounts: 1908, active30: 821, active30After: 312 }, WIN),
    weekly: buildWeeklyUsage(
      {
        signups: wkn([118, 124, 165, 212, 157, 211, 162, 143]),
        mocks: wkn([396, 247, 526, 589, 426, 660, 644, 485]).map((r) => ({ ...r, takers: 133 })),
        tutor: wkn([288, 254, 512, 538, 384, 497, 416, 267]),
        actives: wkn([141, 165, 216, 268, 213, 288, 257, 217]),
        people: wkn([0, 0, 0, 2009, 1233, 1650, 1640, 1464]),
      },
      WIN,
    ),
    signupSources: buildSignupSources(
      [
        { fam: "ai", n: 106 },
        { fam: "search", n: 21 },
        { fam: "direct", n: 15 },
        { fam: "other", n: 1 },
      ],
      WIN,
    ),
    newPeople: null,
    answerCheck: buildAnswerCheck(
      {
        checked: 37849,
        accepted: 33347,
        keyCorrected: 1196,
        withdrawn: 3306,
        liveBefore: 36690,
        liveKept: 32322,
        liveCorrected: 1172,
        liveWithdrawn: 3196,
        lastCheckDay: "2026-09-26",
        uncheckedLive: 157,
        uncheckedExams: 55,
      },
      WIN.today,
    ),
    reports: buildReports(72, 72, WIN.today),
    counters,
    coverage: coverageFixture(),
    ...overrides,
  };
}

const EMPTY: PublicNumbers = {
  today: WIN.today,
  cohorts: null,
  actives: null,
  weekly: null,
  signupSources: null,
  newPeople: null,
  answerCheck: null,
  reports: null,
  counters: null,
  coverage: null,
};

const topic = (examName: string, topicName: string, answers: number, sharePct: number | null) => ({
  examCode: examName.replace(/\W+/g, "_").toUpperCase(),
  examName,
  topicCode: topicName.toLowerCase().replace(/\W+/g, "-"),
  topicName,
  answers,
  sharePct,
});

/** Pulse rows shaped like the rolling 28 days to 27 Sep 2026 (test input). */
const PULSE: PressPulse = {
  week: parsePulseSlug("2026-w38")!,
  windowLabel: "24 Aug–20 Sep 2026",
  computedDay: "2026-09-27",
  hardest: [
    topic("TS Police PC", "Percentage", 243, 42.8),
    topic("TS Police PC", "Analogies", 362, 50.3),
    topic("AP APPSC Group 2", "Modern India and Freedom Movement", 205, 50.7),
  ],
  practised: [topic("TS Police PC", "Analogies", 362, null), topic("UK UKSSSC", "Geography of India", 246, null)],
};

/** Every string the page can print, built from the fixture. */
function allCopy(p: PublicNumbers, pulse: PressPulse | null): string {
  const facts = keyFacts(p).flatMap((f) => [f.label, f.value ?? "", f.sub ?? "", f.definition, f.period ?? ""]);
  const methods = methodBlocks(p, { upcomingDays: 90 }).flatMap((m) => [m.title, ...m.body, ...m.links.map((l) => l.label)]);
  const angles = storyAngles(p, pulse).flatMap((a) => [a.title, a.body, a.linkLabel]);
  return [
    PRESS_TITLE,
    PRESS_DESCRIPTION,
    WHO_RUNS_IT,
    ...FREE_FACTS,
    ...NOT_LIST.flatMap((n) => [n.title, n.body]),
    ...BRAND_ASSETS.flatMap((a) => [a.use, a.note ?? ""]),
    ...BRAND_COLOURS.flatMap((c) => [c.name, c.where]),
    BRAND_RULE,
    ...facts,
    ...methods,
    ...angles,
    pulseCitationLine(pulse, p.today) ?? "",
  ].join("\n");
}

// ── Company facts ─────────────────────────────────────────────────────

describe("only company facts that are already public", () => {
  const layout = read("src/app/layout.tsx");
  const about = read("src/app/about/page.tsx");

  it("the operator's name, website, email and place are the root layout's Organization facts", () => {
    expect(layout).toContain(`name: "${COMPANY.name}"`);
    expect(layout).toContain(`url: "${COMPANY.url}"`);
    expect(layout).toContain(`email: "${COMPANY.email}"`);
    expect(layout).toContain(`addressLocality: "${COMPANY.locality}"`);
    expect(layout).toContain(`addressRegion: "${COMPANY.region}"`);
  });

  it("'who runs it' is /about's sentence, word for word", () => {
    expect(about).toContain(WHO_RUNS_IT);
  });

  it("no founder name and no phone number anywhere in the press files", () => {
    for (const f of PRESS_FILES) {
      // Comments may explain the rule; what the page ships may not break it.
      const src = noComments(read(f));
      expect(src, f).not.toMatch(/venu|muvva|gopal|reddy/i);
      expect(src, f).not.toMatch(/\+91|91600|57000|\b[6-9]\d{9}\b/);
      expect(src, f).not.toMatch(/founder/i);
    }
  });

  it("the only email is the company's, and the only outside website is the company's", () => {
    for (const f of PRESS_FILES) {
      const src = noComments(read(f));
      const emails = src.match(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g) ?? [];
      for (const e of emails) expect(e, f).toBe(COMPANY.email);
      const hosts = (src.match(/https?:\/\/[^\s"'`)<>]+/g) ?? []).map((u) => new URL(u.replace(/[.,;]+$/, "")).host);
      // schema.org is the JSON-LD vocabulary, not a website the page names.
      for (const h of hosts) expect(["shishya.in", "surgesoftware.co.in", "schema.org"], `${f}: ${h}`).toContain(h);
    }
    expect(PRESS_MAILTO).toBe(`mailto:${COMPANY.email}?subject=Press`);
  });

  it("the free facts are the ones /about, /pricing and /editorial-policy publish", () => {
    const pricing = read("src/app/pricing/page.tsx");
    const editorial = read("src/app/editorial-policy/page.tsx");
    expect(MENTOR_FEE).toBe(`₹${MENTOR_SESSION_FEE_PAISE / 100}`);
    expect(about).toContain("free with no paywall and no premium tier");
    expect(FREE_FACTS[0]).toContain("no paywall and no premium tier");
    expect(FREE_FACTS[1]).toContain(`later ones are ${MENTOR_FEE} each, inclusive of GST, paid only after a mentor accepts the request.`);
    expect(about).toContain("later ones are ${MENTOR_FEE} each, inclusive of GST, paid only after a mentor accepts the request.");
    expect(pricing).toContain("first session free");
    expect(editorial).toMatch(/No ads, no affiliate links, no selling of aspirant data/);
    expect(FREE_FACTS[2]).toMatch(/No ads, no affiliate links and no selling of student data/);
  });
});

// ── Key facts ─────────────────────────────────────────────────────────

describe("key facts come from the numbers loaders, gated, each with its definition", () => {
  it("prints the eight facts from the 27 Sep 2026 read", () => {
    const f = keyFacts(fullNumbers());
    expect(f.map((x) => x.id)).toEqual([
      "fact-exams",
      "fact-checked-questions",
      "fact-chapters-with-notes",
      "fact-languages",
      "fact-accounts",
      "fact-came-back-7-days",
      "fact-ai-assistants",
      "fact-mocks-per-active-account",
    ]);
    const v = Object.fromEntries(f.map((x) => [x.id, x.value]));
    expect(v["fact-exams"]).toBe("180");
    expect(v["fact-checked-questions"]).toBe("34,543");
    expect(v["fact-chapters-with-notes"]).toBe("124");
    expect(v["fact-languages"]).toBe("19");
    expect(v["fact-accounts"]).toBe("1,909");
    expect(v["fact-came-back-7-days"]).toBe("28.7%");
    expect(v["fact-ai-assistants"]).toBe("74.1%");
    expect(v["fact-mocks-per-active-account"]).toBe("2.24");
    expect(f.find((x) => x.id === "fact-ai-assistants")?.sub).toBe("106 of 143 new accounts");
    expect(f.find((x) => x.id === "fact-languages")?.sub).toBe("English and 18 Indian languages");
    for (const x of f) {
      expect(x.definition.length, x.id).toBeGreaterThan(10);
      expect(x.asOf, x.id).toBe(WIN.today);
      expect(x.href, x.id).toMatch(/^\/shishya-in-numbers#[A-Za-z0-9-]+$/);
    }
  });

  it("never prints a people count or share under 20", () => {
    const counters: PublicNumber<CounterRow[]> = {
      ...fullNumbers().counters!,
      value: [{ key: "totalSignups", label: "Accounts", value: 12, definition: "User rows (accounts).", people: true }],
    };
    const small = fullNumbers({
      counters,
      signupSources: buildSignupSources(
        [
          { fam: "ai", n: 15 },
          { fam: "search", n: 40 },
        ],
        WIN,
      ),
    });
    const f = keyFacts(small);
    expect(f.find((x) => x.id === "fact-accounts")?.value).toBe(SUPPRESSED);
    expect(f.find((x) => x.id === "fact-ai-assistants")?.value).toBe(SUPPRESSED);
    expect(f.find((x) => x.id === "fact-ai-assistants")?.sub).toMatch(/fewer than 20/);
    expect(allCopy(small, null)).not.toMatch(/\b1[25] of\b/);
    // The AI-assistant story angle drops its number too.
    expect(storyAngles(small, null).find((a) => a.id === "angle-ai-assistants")?.body).not.toMatch(/%/);
  });

  it("a failed read prints 'could not be computed' (null), never 0", () => {
    const f = keyFacts(EMPTY);
    expect(f).toHaveLength(8);
    for (const x of f) expect(x.value, x.id).toBeNull();
    const copy = allCopy(EMPTY, null);
    expect(copy).not.toMatch(/\bundefined\b|\bNaN\b|\bnull\b/);
    expect(copy).not.toMatch(/\b0 (answer keys|questions|chapters|exams)\b/);
  });

  // 27 Sep 2026 (fixer review): AI assistants 25 merged with Direct 5 on the
  // numbers page — printing "25 of 80" would give the 5 back by subtraction.
  it("withholds the AI share when AI assistants are merged with a small group", () => {
    const merged = fullNumbers({
      signupSources: buildSignupSources(
        [
          { fam: "ai", n: 25 },
          { fam: "direct", n: 5 },
          { fam: "search", n: 50 },
        ],
        WIN,
      ),
    });
    const fact = keyFacts(merged).find((x) => x.id === "fact-ai-assistants")!;
    expect(fact.value).toBe(SUPPRESSED);
    expect(fact.sub).toMatch(/fewer than 20/);
    expect(allCopy(merged, null)).not.toMatch(/\b25 of 80\b|31\.3%/);
    expect(storyAngles(merged, null).find((a) => a.id === "angle-ai-assistants")?.body).not.toMatch(/%/);
  });

  it("the team-free account total from the 30-day actives is never printed", () => {
    expect(allCopy(fullNumbers(), PULSE)).not.toContain("1,908");
  });
});

// ── How it is built ───────────────────────────────────────────────────

describe("method blocks", () => {
  it("state the answer-check totals and the official-source counts from the loaders", () => {
    const m = methodBlocks(fullNumbers(), { upcomingDays: 90 });
    expect(m.map((b) => b.id)).toEqual(["official-sources", "answer-checked", "ai-plainly", "school-linked"]);
    const text = m.flatMap((b) => b.body).join(" ");
    expect(text).toContain("193 official previous-year papers and answer keys are linked on 31 exams");
    expect(text).toContain("7,845 official cutoff rows on 15 exams");
    expect(text).toContain("Of the tracker dates in the next 90 days, 90 are marked Official, 32 Reported and 195 Expected.");
    expect(text).toContain("37,849 questions had been checked: 33,347 accepted as written, 1,196 with a corrected key and 3,306 withdrawn.");
    expect(text).toContain("Of the 36,690 questions that were already live when checked, 3.2% had their key corrected and 8.7% were withdrawn.");
    expect(text).toContain("157 live questions on 55 exams have not been through the check yet");
    expect(text).toContain("1,146 NCERT chapters are listed");
    expect(text).toContain("Shishya's own chapter notes are on 124 school chapters so far, and checked practice on 5.");
    expect(text).toContain("The check is automated, not a human audit");
    expect(answerCheckSummary(fullNumbers())).toBe(
      "1,172 answer keys corrected and 3,196 questions withdrawn, of the 36,690 questions that were already live when checked",
    );
  });

  it("drop every numeric sentence when the loaders failed, keeping the method", () => {
    const m = methodBlocks(EMPTY, { upcomingDays: 90 });
    const text = m.flatMap((b) => b.body).join(" ");
    expect(text).toContain("marked Official only when it is cited from the conducting body's own site");
    expect(text).toContain("The check is automated, not a human audit");
    // Only the config's own numbers (3 solves, 80%) and the language constant remain.
    expect(text).not.toMatch(/\d,\d{3}/);
    for (const gone of ["questions had been checked", "are listed", "official cutoff rows", "tracker dates in the next", "chapter notes are on"]) {
      expect(text).not.toContain(gone);
    }
    expect(answerCheckSummary(EMPTY)).toBeNull();
  });

  it("the answer-check method is built from the check's own config", () => {
    const s = answerCheckShort({ solveRuns: 5, minAgreement: 0.6, minVerifyConfidence: 0.9 }).join(" ");
    expect(s).toContain("solved 5 times");
    expect(s).toContain("at least 90% confidence and at least 3 of the 5 solves");
    const d = answerCheckShort().join(" ");
    expect(d).toContain("solved 3 times");
    expect(d).toContain("at least 80% confidence and at least 2 of the 3 solves");
  });

  it("never says reports are reviewed by a person (every closed report so far was closed by automation)", () => {
    expect(allCopy(fullNumbers(), PULSE)).not.toMatch(/reviewed by (a )?(human|person)|human review/i);
  });
});

// ── Story angles ──────────────────────────────────────────────────────

describe("story angles are data, with students as the subject", () => {
  it("quote the hardest topic from the latest Pulse, with its gate and caveat, and link its table", () => {
    const a = storyAngles(fullNumbers(), PULSE);
    const pulse = a.find((x) => x.id === "angle-pulse")!;
    expect(pulse.body).toContain(
      "Over 24 Aug–20 Sep 2026, of the 3 topics with at least 200 answers from at least 20 students, the one with the lowest share of correct answers was Percentage (TS Police PC): 42.8% of 243 answers were correct.",
    );
    expect(pulse.body).toContain("not a difficulty rating");
    expect(pulse.href).toBe("/pulse/2026-w38#hardest");
    expect(a.find((x) => x.id === "angle-ai-assistants")?.body).toContain("74.1% of the new accounts created in 14–20 Sep 2026");
    // 27 Sep 2026 (integrator): the angle quotes the live-before-the-check
    // change, never the all-checked totals (which include never-live rows).
    const keysAngle = a.find((x) => x.id === "angle-answer-keys")?.body ?? "";
    expect(keysAngle).toContain("1,172 answer keys corrected and 3,196 questions withdrawn, of the 36,690 questions that were already live when checked");
    expect(keysAngle).not.toContain("1,196");
    expect(keysAngle).not.toContain("3,306");
  });

  it(`says "lowest" only when at least ${PRESS_HARDEST_MIN_TOPICS} topics passed the gate; otherwise quotes the most-practised topic`, () => {
    // 27 Sep 2026 probe: week 38's window had a single topic past the gate.
    const one = { ...PULSE, hardest: [topic("UK UKSSSC", "Geography of India", 225, 78.7)] };
    const f = pulseFinding(one)!;
    expect(f.anchor).toBe("topics");
    expect(f.sentence).toBe("Over 24 Aug–20 Sep 2026, the topic students on Shishya practised most was Analogies (TS Police PC), with 362 answers.");
    const angle = storyAngles(fullNumbers(), one).find((x) => x.id === "angle-pulse")!;
    expect(angle.body).not.toMatch(/lowest|hardest topic was/);
    expect(angle.href).toBe("/pulse/2026-w38#topics");
  });

  // 27 Sep 2026 (fixer review): Pulse keeps at most PULSE_HARD_ROWS rows, so a
  // full table's length is not the number of topics that qualified.
  it("names the qualifying-topic count only when Pulse's table is not full", () => {
    const eight = { ...PULSE, hardest: Array.from({ length: PULSE_HARD_ROWS }, (_, i) => topic("TS Police PC", `Topic ${i}`, 300, 40 + i)) };
    const f = pulseFinding(eight)!;
    expect(f.anchor).toBe("hardest");
    expect(f.sentence).toContain("of the topics with at least 200 answers");
    expect(f.sentence).not.toMatch(/of the \d+ topics/);
    expect(PRESS_HARDEST_MIN_TOPICS).toBe(PULSE_HARD_MIN_TOPICS);
  });

  it("fall back to the hub and to number-free lines without data", () => {
    const a = storyAngles(EMPTY, null);
    expect(a.find((x) => x.id === "angle-pulse")?.href).toBe("/pulse");
    const none = storyAngles(fullNumbers(), { ...PULSE, hardest: null, practised: null }).find((x) => x.id === "angle-pulse")!;
    expect(none.href).toBe("/pulse/2026-w38");
    expect(none.body).not.toContain("lowest share");
    expect(pulseFinding(null)).toBeNull();
    expect(pulseCitationLine(null, WIN.today)).toBeNull();
    expect(pulseCitationLine(PULSE, WIN.today)).toContain("https://shishya.in/pulse/2026-w38");
  });
});

// ── Claims ────────────────────────────────────────────────────────────

describe("no ranking, trust, superlative or valuation claim", () => {
  const BANNED: RegExp[] = [
    /#1\b/,
    /\bbest\b/i,
    /\blargest\b/i,
    /\btrusted\b/i,
    /\bleading\b(?!-)/i,
    /\bfastest\b/i,
    /\bnumber one\b/i,
    /India's (biggest|top)/i,
    /testimonial/i,
    /valuation/i,
    /\bfunding\b/i,
    /crore users/i,
    /AI-generated/i,
    /\bexpert/i,
  ];

  for (const f of PRESS_FILES) {
    it(f, () => {
      const src = noComments(read(f));
      for (const re of BANNED) expect(src, String(re)).not.toMatch(re);
    });
  }

  it("the built copy passes the banned list and the truth-lint phrases", () => {
    for (const copy of [allCopy(fullNumbers(), PULSE), allCopy(EMPTY, null)]) {
      for (const re of BANNED) expect(copy, String(re)).not.toMatch(re);
      expect(findForbiddenPhrases(copy, PRESS_URL)).toEqual([]);
    }
  });
});

// ── Brand assets ──────────────────────────────────────────────────────

function pngSize(rel: string): { width: number; height: number } {
  const b = fs.readFileSync(path.join(ROOT, rel));
  expect(b.subarray(1, 4).toString("ascii"), rel).toBe("PNG");
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

describe("brand assets are existing files with the sizes the page states", () => {
  it.each(BRAND_ASSETS.map((a) => [a.path, a] as const))("%s", (_p, a) => {
    expect(exists(a.origin.file), a.origin.file).toBe(true);
    if (a.origin.kind === "public") {
      expect(a.origin.file).toBe(`public${a.path}`);
      if (a.format === "PNG") expect(pngSize(a.origin.file)).toEqual({ width: a.width, height: a.height });
      if (a.format === "SVG") {
        const svg = read(a.origin.file);
        expect(svg).toContain(`width="${a.width}"`);
        expect(svg).toContain(`height="${a.height}"`);
      }
    } else {
      // A Next route file: /opengraph-image is src/app/opengraph-image.tsx.
      expect(a.origin.file).toBe(`src/app${a.path}.tsx`);
      const src = read(a.origin.file);
      expect(src).toContain(`size = { width: ${a.width}, height: ${a.height} }`);
      expect(src).toContain(`contentType = "image/${a.format.toLowerCase()}"`);
    }
  });

  it("no new mark: only the manifest icons, the SVG marks and the social card", () => {
    expect(BRAND_ASSETS.map((a) => a.path).sort()).toEqual(
      ["/apple-icon.svg", "/icon.svg", "/icons/icon-192.png", "/icons/icon-512.png", "/icons/icon-maskable-512.png", "/opengraph-image"].sort(),
    );
    const manifest = read("src/app/manifest.ts");
    for (const a of BRAND_ASSETS.filter((x) => x.path.startsWith("/icons/"))) expect(manifest).toContain(`src: "${a.path}"`);
  });

  it("the colours and names are the ones the files and the layout use", () => {
    expect(read("public/icon.svg")).toContain(`fill="${BRAND_COLOURS[0].hex}"`);
    expect(read("src/app/manifest.ts")).toContain(`background_color: "${BRAND_COLOURS[1].hex}"`);
    const layout = read("src/app/layout.tsx");
    expect(layout).toContain(`name: "${BRAND_NAMES[0]}"`);
    expect(layout).toContain(`"${BRAND_NAMES[1]}"`);
  });
});

// ── Links ─────────────────────────────────────────────────────────────

/** True when an internal path has a page.tsx (route groups looked through). */
function hasPage(p: string): boolean {
  const segs = p.split("#")[0].split("?")[0].split("/").filter(Boolean);
  const expand = (dir: string): string[] => {
    const out = [dir];
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory() && /^\(.+\)$/.test(e.name)) out.push(...expand(path.join(dir, e.name)));
    return out;
  };
  let dirs = expand(path.join(ROOT, "src/app"));
  for (const seg of segs) {
    const next: string[] = [];
    for (const d of dirs) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (e.isDirectory() && (e.name === seg || /^\[[^.].*\]$/.test(e.name))) next.push(...expand(path.join(d, e.name)));
      }
    }
    dirs = next;
    if (!dirs.length) return false;
  }
  return dirs.some((d) => fs.existsSync(path.join(d, "page.tsx")));
}

describe("every internal link lands on a page, and every definition anchor exists", () => {
  it("builder links and the page's own links have a page.tsx", () => {
    const hrefs = [
      ...keyFacts(fullNumbers()).map((f) => f.href),
      ...methodBlocks(fullNumbers(), { upcomingDays: 90 }).flatMap((m) => m.links.map((l) => l.href)),
      ...storyAngles(fullNumbers(), PULSE).map((a) => a.href),
      ...storyAngles(fullNumbers(), { ...PULSE, hardest: [] }).map((a) => a.href),
      ...[...read(PAGE).matchAll(/href="(\/[^"#]*)[^"]*"/g)].map((m) => m[1]),
    ];
    expect(hrefs.length).toBeGreaterThan(15);
    for (const h of hrefs) expect(hasPage(h), h).toBe(true);
  });

  it("each /shishya-in-numbers anchor is an element id that page renders", () => {
    const numbersSrc = [read("src/lib/public-numbers.ts"), read("src/lib/public-numbers-rules.ts"), read("src/app/shishya-in-numbers/page.tsx")].join("\n");
    for (const a of Object.values(NUMBERS_ANCHORS)) {
      if (a.startsWith("counter-")) {
        expect(read("src/app/shishya-in-numbers/page.tsx")).toContain("id={`counter-${c.key}`}");
        expect(read("src/lib/public-numbers.ts")).toContain(`key: "${a.slice("counter-".length)}"`);
      } else {
        expect(numbersSrc, a).toMatch(new RegExp(`id: "${a}"|id="${a}"|\\["${a}",`));
      }
    }
  });

  it("the Pulse links' #hardest and #topics anchors are section ids in the Pulse report", () => {
    const report = read("src/components/pulse/PulseReport.tsx");
    expect(report).toMatch(/id="hardest"/);
    expect(report).toMatch(/id="topics"/);
  });
});

// ── Page shape ────────────────────────────────────────────────────────

describe("/press stays static and computed", () => {
  it("revalidates hourly and reads no request state", () => {
    const src = read(PAGE);
    expect(src).toMatch(/export const revalidate = 3600;/);
    const c = code(src);
    for (const re of [/\bcookies\s*\(/, /\bheaders\s*\(/, /\bgetT\b/, /\bgetUrlLocale\b/, /\bauth\s*\(/, /["']use client["']/]) expect(c).not.toMatch(re);
  });

  it("the page types no statistic", () => {
    const c = code(read(PAGE)).replace(/export const revalidate = 3600;/, "");
    expect(c.match(/\b\d{3,}\b/g) ?? []).toEqual([]);
  });

  it("press-kit.ts types no number but the brand files' sizes and the paise divisor", () => {
    const allowed = new Set(["100", ...BRAND_ASSETS.flatMap((a) => [String(a.width), String(a.height)])]);
    const c = code(read(LIB));
    for (const d of c.match(/\b\d{2,}\b/g) ?? []) expect(allowed.has(d), d).toBe(true);
    // …and no copy string carries a typed count or share.
    const strings = read(LIB).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
    expect(strings).not.toMatch(/\b\d{1,3}(,\d{2,3})+\b/);
    expect(strings).not.toMatch(/\b\d+(\.\d+)?%/);
  });

  it("the Copy button is the only client code and reads nothing about the visitor", () => {
    const src = code(read(COPY));
    for (const re of [/document\.cookie/, /localStorage/, /sessionStorage/, /\bfetch\s*\(/, /sendBeacon/]) expect(src).not.toMatch(re);
    expect(read(COPY)).toMatch(/^"use client";/);
  });

  it("JSON-LD is a WebPage about the one Organization node, dated by IST day", () => {
    const ld = pressPageLd("2026-09-27") as Record<string, unknown>;
    expect(ld["@type"]).toBe("WebPage");
    expect(ld["@id"]).toBe("https://shishya.in/press#page");
    expect(ld.mainEntity).toEqual({ "@id": "https://shishya.in/#organization" });
    expect(ld.about).toEqual({ "@id": "https://shishya.in/#organization" });
    expect(ld.dateModified).toBe("2026-09-27");
    expect(JSON.stringify(ld)).not.toMatch(/T\d{2}:\d{2}/);
  });
});
