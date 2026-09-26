// The whole-platform live stats strip (26 Sep 2026). No DB, no network:
// Prisma is mocked with a SQL-shape router so the read's arithmetic and
// memo are exercised on fixed numbers.
// Run with: npx vitest run tests/unit/live-counters-strip.test.ts
//
// What this pins:
//   1. LABEL / DEFINITION TABLE — every counter the strip renders has a
//      definition in LIVE_COUNT_DEFINITIONS, the English label is the one
//      agreed with the founder ("learners", "mock exams taken", "AI tutor
//      questions" …), order and phone subset are fixed, counters that read
//      wrong at 0 are hidden only then;
//   2. en / hi / te parity for every live.* key (own script, no third
//      script, same {n} placeholder, hi/te not English copies) and the
//      honesty words that must never appear ("trusted", "helped", "rating");
//   3. FORMATTING — Indian grouping, the "+N today" pill;
//   4. THE API SHAPE — getLiveCounts returns every key with the arithmetic
//      the definitions describe (visitors = engaged + landers − overlap;
//      tutor = member turns excl. guest-import copies + guest turns),
//      the supply memo re-reads only after SUPPLY_TTL_MS, the route fails
//      with a 503 (never a 200 of zeros the strip would show), the
//      client's key list equals the server's, and the strip's labels on
//      the home page come from i18n live.* keys;
//   5. the SQL keeps the honesty gates: bots out of page views and active
//      now, the nightly cron's ABANDONED flips out of active now,
//      cookie-less guest calls out of tutor questions, withdrawn questions
//      out of practice questions, the exam scope helper on every Exam
//      join, guest-import copies out of tutor turns;
//   6. the LAYOUT BUDGET (26 Sep 2026 review): phones are a 2 × 2 grid of
//      four counters (two lines), sm+ is two single-line rows, and the
//      measured widths fit the rows whole at the stated screen widths.

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Prisma mock: a router keyed on distinctive fragments of each query ──
const fixed = vi.hoisted(() => ({
  engaged: 9043,
  walkIns: 6504,
  overlap: 1110,
  totalPageViews: 86630,
  pageViewsToday: 918,
  activeNow: 10,
  tutor: 4159,
  tutorToday: 54,
  answered: 72907,
  answeredToday: 888,
  liveTests: 84,
  practiceQuestions: 34700,
  topicNotes: 4350,
  exams: 180,
  mocksTaken: 5230,
  mocksToday: 72,
  users: 1900,
  users7d: 170,
  usersToday: 14,
  examGoals: 1795,
  schoolChapters: 5,
}));

const sqlLog = vi.hoisted(() => [] as string[]);
const calls = vi.hoisted(() => ({ exam: [] as unknown[], attempt: [] as unknown[], user: [] as unknown[], enrollment: [] as unknown[] }));

const DAY_START = vi.hoisted(() => new Date("2026-09-25T18:30:00.000Z")); // 00:00 IST 26 Sep
const NOW = vi.hoisted(() => new Date("2026-09-26T10:21:01.900Z"));

vi.mock("@/lib/db/prisma", () => {
  const route = (sql: string): number => {
    const f = fixed;
    if (sql.includes(") humans")) return f.engaged;
    if (sql.includes(") gap_era_engaged")) return f.overlap;
    if (sql.includes(") phantoms")) return f.totalPageViews;
    if (sql.includes(`"client" = 'browser'`)) return f.walkIns;
    if (sql.includes("COUNT(DISTINCT k)")) return f.activeNow;
    if (sql.includes(`WHERE "anonId" IS NOT NULL AND "createdAt" >=`)) return f.tutorToday;
    if (sql.includes(`FROM "AnonTutorLog" WHERE "anonId" IS NOT NULL)`)) return f.tutor;
    if (sql.includes("jsonb_array_elements") && sql.includes(`"finishedAt"`)) return f.answeredToday;
    if (sql.includes("jsonb_array_elements")) return f.answered;
    if (sql.includes(`JOIN "LiveTest"`)) return f.liveTests;
    if (sql.includes(`FROM "Question" q`)) return f.practiceQuestions;
    if (sql.includes(`FROM "TopicTeachingNote"`)) return f.topicNotes;
    if (sql.includes(`kind = 'PAGE_VIEW' AND "createdAt" >=`)) return f.pageViewsToday;
    throw new Error(`unrouted SQL in test: ${sql.slice(0, 120)}`);
  };
  return {
    prisma: {
      $queryRaw: async (strings: TemplateStringsArray | { sql?: string }, ...values: unknown[]) => {
        // Tagged-template call: reassemble with the bound values' shape so the
        // router can see nested Prisma.sql fragments (they come as values).
        const parts = Array.isArray(strings) ? [...strings] : [String((strings as { sql?: string }).sql ?? "")];
        let sql = "";
        parts.forEach((p, i) => {
          sql += p;
          const v = values[i];
          if (v && typeof v === "object" && "sql" in (v as object)) sql += String((v as { sql: string }).sql);
          else if (i < values.length) sql += "?";
        });
        sqlLog.push(sql);
        return [{ count: BigInt(route(sql)) }];
      },
      exam: { count: async (args: unknown) => (calls.exam.push(args), fixed.exams) },
      attempt: {
        count: async (args: { where?: { finishedAt?: unknown } }) => (calls.attempt.push(args), args?.where?.finishedAt ? fixed.mocksToday : fixed.mocksTaken),
      },
      user: {
        count: async (args?: { where?: { createdAt?: { gte?: Date } } }) => {
          calls.user.push(args);
          const gte = args?.where?.createdAt?.gte;
          if (!gte) return fixed.users;
          return gte.getTime() === DAY_START.getTime() ? fixed.usersToday : fixed.users7d;
        },
      },
      enrollment: { count: async (args: unknown) => (calls.enrollment.push(args), fixed.examGoals) },
    },
  };
});
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));
vi.mock("@/lib/school/surface", () => ({
  loadSchoolSurface: async () => ({ classes: [], readAt: NOW.toISOString() }),
  schoolSurfaceCounts: () => ({ boards: 1, classes: 1, subjects: 2, chapters: 40, chaptersWithNotes: 5, chaptersWithPractice: 0, indexableChapters: fixed.schoolChapters }),
}));

import { dict, locales, type Locale, type StringKey } from "@/lib/i18n";
import { LANGUAGE_COUNT } from "@/lib/languages";
import { formatCount } from "@/lib/live-counters";
import {
  GUEST_IMPORT_SOURCE,
  LIVE_COUNT_DEFINITIONS,
  SUPPLY_TTL_MS,
  ZERO_LIVE_COUNTS,
  getLiveCounts,
  istDayStart,
  resetLiveCountsMemo,
  type LiveCounts,
} from "@/lib/live-counts-server";
// The strip's pure logic lives in a .ts module beside the island (vitest
// runs with jsx: preserve, so the .tsx file itself cannot be imported here).
import {
  HIDDEN_WHEN_ZERO,
  LIVE_COUNT_KEYS,
  PHONE_KEYS,
  STRIP_DEFAULT_LABELS,
  buildStripItems,
  fillN,
  mergeCounts,
  type StripLabels,
} from "@/components/live-counters-strip";
import { REAL_EXAM_SQL } from "@/lib/db/exam-scope";

const ROOT = path.resolve(__dirname, "../..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** The numbers getLiveCounts must return from the mocked rows. */
const EXPECTED: LiveCounts = {
  activeNow: fixed.activeNow,
  totalPageViews: fixed.totalPageViews,
  pageViewsToday: fixed.pageViewsToday,
  uniqueVisitors: fixed.engaged + (fixed.walkIns - fixed.overlap), // 14,437
  walkIns: fixed.walkIns,
  mocksTaken: fixed.mocksTaken,
  mocksToday: fixed.mocksToday,
  totalSignups: fixed.users,
  signupsLast7Days: fixed.users7d,
  signupsToday: fixed.usersToday,
  tutorQuestions: fixed.tutor,
  tutorQuestionsToday: fixed.tutorToday,
  questionsAnswered: fixed.answered,
  questionsAnsweredToday: fixed.answeredToday,
  liveTestsTaken: fixed.liveTests,
  examGoals: fixed.examGoals,
  exams: fixed.exams,
  practiceQuestions: fixed.practiceQuestions,
  topicNotes: fixed.topicNotes,
  schoolChapters: fixed.schoolChapters,
  languages: LANGUAGE_COUNT,
};

// ── 1. The label / definition table ────────────────────────────────────

/** key → English label, in strip order (phone = shown on phones). This is
 *  the table agreed on 26 Sep 2026; change it only with the founder. */
const TABLE: Array<{ key: keyof LiveCounts; label: string; row: 1 | 2; phone: boolean }> = [
  { key: "activeNow", label: "active now", row: 1, phone: false },
  { key: "uniqueVisitors", label: "learners", row: 1, phone: true },
  { key: "mocksTaken", label: "mock exams taken", row: 1, phone: true },
  { key: "tutorQuestions", label: "AI tutor questions", row: 1, phone: true },
  { key: "totalSignups", label: "signed up", row: 1, phone: true },
  { key: "totalPageViews", label: "page views", row: 1, phone: false },
  { key: "questionsAnswered", label: "questions answered", row: 2, phone: false },
  { key: "liveTestsTaken", label: "live tests taken", row: 2, phone: false },
  { key: "examGoals", label: "exam goals set", row: 2, phone: false },
  { key: "exams", label: "exams", row: 2, phone: false },
  { key: "practiceQuestions", label: "practice questions", row: 2, phone: false },
  { key: "topicNotes", label: "topic notes", row: 2, phone: false },
  { key: "schoolChapters", label: "school chapters", row: 2, phone: false },
  { key: "languages", label: "languages", row: 2, phone: false },
];

describe("label / definition table", () => {
  const items = buildStripItems(EXPECTED);

  it("renders exactly the agreed counters, in order, with the agreed English labels", () => {
    expect(items.map((it) => ({ key: it.key, label: it.label, row: it.row, phone: it.phone }))).toEqual(TABLE);
  });

  it("every rendered counter has a definition and its value is the field it names", () => {
    for (const it of items) {
      expect(LIVE_COUNT_DEFINITIONS[it.key], it.key).toMatch(/\S/);
      expect(it.value, it.key).toBe(EXPECTED[it.key]);
    }
  });

  it("the definitions say what the labels claim", () => {
    expect(LIVE_COUNT_DEFINITIONS.uniqueVisitors).toMatch(/Proves a visit, not learning/);
    expect(LIVE_COUNT_DEFINITIONS.mocksTaken).toMatch(/SUBMITTED or AUTO_SUBMITTED/);
    expect(LIVE_COUNT_DEFINITIONS.tutorQuestions).toMatch(/guest-import copies excluded/);
    expect(LIVE_COUNT_DEFINITIONS.tutorQuestions).toMatch(/with a shishya_anon cookie/);
    expect(LIVE_COUNT_DEFINITIONS.tutorQuestions).toMatch(/cookie-less guest calls \(not provably a person\) left out/);
    expect(LIVE_COUNT_DEFINITIONS.activeNow).toMatch(/nightly cron's ABANDONED flips excluded/);
    expect(LIVE_COUNT_DEFINITIONS.questionsAnswered).toMatch(/unanswered questions not counted/);
    expect(LIVE_COUNT_DEFINITIONS.liveTestsTaken).toMatch(/inside the test's window/);
    expect(LIVE_COUNT_DEFINITIONS.practiceQuestions).toMatch(/not-withdrawn/);
    expect(LIVE_COUNT_DEFINITIONS.activeNow).toMatch(/last 30 minutes/);
    for (const k of ["pageViewsToday", "mocksToday", "signupsToday", "tutorQuestionsToday", "questionsAnsweredToday"] as const) {
      expect(LIVE_COUNT_DEFINITIONS[k], k).toMatch(/00:00 IST/);
    }
  });

  it("phones see exactly four counters — a full 2 × 2 grid, so always two lines", () => {
    const phone = items.filter((it) => it.phone).map((it) => it.key);
    expect(phone).toEqual(["uniqueVisitors", "mocksTaken", "tutorQuestions", "totalSignups"]);
    expect([...PHONE_KEYS]).toEqual(phone);
    // None of them can drop out at 0, so the grid never has a hole or a
    // fifth cell (a third line) — whatever the numbers are.
    for (const k of PHONE_KEYS) expect(HIDDEN_WHEN_ZERO.has(k), k).toBe(false);
    const early = buildStripItems({ ...ZERO_LIVE_COUNTS });
    expect(early.filter((it) => it.phone).map((it) => it.key)).toEqual(phone);
    expect(items.filter((it) => it.row === 2).every((it) => !it.phone)).toBe(true);
  });

  it("today / this-week pills sit on the counter they belong to and only when positive", () => {
    const pill = (k: keyof LiveCounts) => items.find((it) => it.key === k)?.pill;
    expect(pill("totalPageViews")).toBe("+918 today");
    expect(pill("mocksTaken")).toBe("+72 today");
    expect(pill("questionsAnswered")).toBe("+888 today");
    expect(pill("tutorQuestions")).toBe("+54 today");
    expect(pill("totalSignups")).toBe("+170 this week");
    expect(pill("uniqueVisitors")).toBeUndefined();
    const quiet = buildStripItems({ ...EXPECTED, pageViewsToday: 0, mocksToday: 0, questionsAnsweredToday: 0, tutorQuestionsToday: 0, signupsLast7Days: 0 });
    expect(quiet.every((it) => it.pill === undefined)).toBe(true);
  });

  it("only the counters that read wrong at 0 are hidden at 0 — and only then", () => {
    expect([...HIDDEN_WHEN_ZERO].sort()).toEqual(["activeNow", "examGoals", "liveTestsTaken", "schoolChapters"]);
    const zeros = buildStripItems({ ...EXPECTED, activeNow: 0, liveTestsTaken: 0, examGoals: 0, schoolChapters: 0 });
    expect(zeros.map((it) => it.key)).toEqual(TABLE.map((t) => t.key).filter((k) => !HIDDEN_WHEN_ZERO.has(k)));
    // A genuine 0 elsewhere stays on screen — never hidden, never padded.
    const early = buildStripItems({ ...ZERO_LIVE_COUNTS });
    expect(early.find((it) => it.key === "mocksTaken")?.value).toBe(0);
    expect(early.find((it) => it.key === "totalSignups")?.value).toBe(0);
  });

  it("caller labels override the English defaults; blank ones do not; legacy fields are ignored", () => {
    const labels: StripLabels = { visitors: "लोग आए", mocksTaken: "  ", preparingNow: "preparing now", inMockNow: "in a mock right now", totalEver: "helped till now" };
    const withLabels = buildStripItems(EXPECTED, labels);
    expect(withLabels.find((it) => it.key === "uniqueVisitors")?.label).toBe("लोग आए");
    expect(withLabels.find((it) => it.key === "mocksTaken")?.label).toBe("mock exams taken");
    const rendered = withLabels.map((it) => it.label).join(" | ");
    expect(rendered).not.toMatch(/preparing now|in a mock right now|helped till now/);
  });

  it("the English defaults are the en dictionary's live.* words", () => {
    const en = dict.en as Record<string, string>;
    const pairs: Array<[keyof typeof STRIP_DEFAULT_LABELS, StringKey]> = [
      ["activeNow", "live.activeNow"],
      ["pageViews", "live.pageViews"],
      ["visitors", "live.visitors"],
      ["mocksTaken", "live.mocksTaken"],
      ["signedUp", "live.signedUp"],
      ["tutorQuestions", "live.tutorQuestions"],
      ["questionsAnswered", "live.questionsAnswered"],
      ["liveTests", "live.liveTests"],
      ["examGoals", "live.examGoals"],
      ["exams", "live.exams"],
      ["questions", "live.questions"],
      ["notes", "live.notes"],
      ["schoolChapters", "live.schoolChapters"],
      ["languages", "live.languages"],
      ["today", "live.today"],
      ["thisWeek", "live.thisWeek"],
    ];
    expect(pairs.length).toBe(Object.keys(STRIP_DEFAULT_LABELS).length);
    for (const [field, key] of pairs) expect(STRIP_DEFAULT_LABELS[field], key).toBe(en[key]);
  });
});

// ── 2. en / hi / te parity ─────────────────────────────────────────────

const LIVE_KEYS = (Object.keys(dict.en) as StringKey[]).filter((k) => k.startsWith("live."));
const raw = (locale: Locale, key: StringKey): string | undefined => (dict[locale] as Record<string, string>)[key];
const placeholders = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
const SCRIPT: Record<"hi" | "te", RegExp> = { hi: /[ऀ-ॿ]/, te: /[ఀ-౿]/ };
// Letters of any other Indic / SE-Asian script are a typo, never a choice
// (16 Sep 2026: a Thai letter once sat inside a Telugu word). Each locale's
// own block is left out of its "other" set.
const OTHER_SCRIPTS: Record<"hi" | "te", RegExp> = {
  hi: /[ঀ-෿฀-໿ༀ-࿿က-႟]/,
  te: /[ऀ-௿ಀ-෿฀-໿ༀ-࿿က-႟]/,
};
const hasLetters = (s: string) => /[A-Za-z]/.test(s.replace(/\{\w+\}/g, ""));

describe("i18n live.* — en, hi, te", () => {
  it("the family has the strip's 16 keys plus the 7 pre-existing ones", () => {
    expect(LIVE_KEYS.length).toBe(23);
    expect(LIVE_KEYS).toContain("live.visitors");
    expect(LIVE_KEYS).toContain("live.mocksTaken");
    expect(LIVE_KEYS).toContain("live.tutorQuestions");
  });

  for (const locale of ["hi", "te"] as const) {
    it(`${locale}: every live.* key present, in its own script, not an English copy, same {n}`, () => {
      const missing = LIVE_KEYS.filter((k) => !raw(locale, k)?.trim());
      expect(missing).toEqual([]);
      const lettered = LIVE_KEYS.filter((k) => hasLetters(dict.en[k]));
      expect(lettered.filter((k) => raw(locale, k) === dict.en[k])).toEqual([]);
      expect(lettered.filter((k) => !SCRIPT[locale].test(raw(locale, k) ?? ""))).toEqual([]);
      expect(LIVE_KEYS.filter((k) => OTHER_SCRIPTS[locale].test(raw(locale, k) ?? ""))).toEqual([]);
      for (const k of LIVE_KEYS) expect(placeholders(raw(locale, k) ?? ""), k).toEqual(placeholders(dict.en[k]));
    });
  }

  it("every other locale falls back to English for the new keys (no half-translated strip)", () => {
    for (const locale of locales.filter((l) => !["en", "hi", "te"].includes(l))) {
      expect(raw(locale, "live.visitors"), locale).toBeUndefined();
      expect(raw(locale, "live.mocksTaken"), locale).toBeUndefined();
    }
  });

  it("no label claims what the data cannot back, in any locale that has it", () => {
    const banned = /trusted|helped|rating|rated|toppers?|selected|guarantee|#1|best/i;
    for (const locale of locales) {
      for (const k of LIVE_KEYS) {
        const v = raw(locale, k);
        if (v !== undefined) expect(v, `${locale} ${k}`).not.toMatch(banned);
      }
    }
    // The legacy keys carry the honest words too (en/hi/te).
    expect(dict.en["live.preparingNow"]).toBe("learners");
    expect(dict.en["live.inMockNow"]).toBe("mock exams taken");
    expect(dict.en["live.block.inMock"]).toBe("mock exams taken");
    expect(raw("hi", "live.totalEver")).toBe(raw("hi", "live.signedUp"));
    expect(raw("te", "live.totalEver")).toBe(raw("te", "live.signedUp"));
  });
});

// ── 3. Formatting ──────────────────────────────────────────────────────

describe("formatting", () => {
  it("Indian grouping", () => {
    expect(formatCount(72907)).toBe("72,907");
    expect(formatCount(1234567)).toBe("12,34,567");
    expect(formatCount(0)).toBe("0");
  });
  it("pills fill {n} with the grouped number, in every locale's template", () => {
    expect(fillN("+{n} today", 54)).toBe("+54 today");
    expect(fillN(dict.en["live.thisWeek"], 170)).toBe("+170 this week");
    expect(fillN(raw("hi", "live.today")!, 1234)).toBe("+1,234 आज");
    expect(fillN(raw("te", "live.thisWeek")!, 7)).toBe("+7 ఈ వారం");
  });
});

// ── 4. The API shape ───────────────────────────────────────────────────

describe("getLiveCounts — the read", () => {
  beforeEach(() => {
    resetLiveCountsMemo();
    sqlLog.length = 0;
    calls.exam.length = 0;
    calls.attempt.length = 0;
    calls.user.length = 0;
    calls.enrollment.length = 0;
  });

  it("returns every field with the arithmetic the definitions describe", async () => {
    const counts = await getLiveCounts(NOW);
    expect(counts).toEqual(EXPECTED);
    expect(Object.keys(counts).sort()).toEqual(Object.keys(LIVE_COUNT_DEFINITIONS).sort());
  });

  it("today = 00:00 IST, applied to page views, mocks, sign-ups, tutor and answers", async () => {
    expect(istDayStart(NOW).toISOString()).toBe(DAY_START.toISOString());
    // 23:59 IST and 00:01 IST fall on different days.
    expect(istDayStart(new Date("2026-09-26T18:29:00Z")).toISOString()).toBe("2026-09-25T18:30:00.000Z");
    expect(istDayStart(new Date("2026-09-26T18:31:00Z")).toISOString()).toBe("2026-09-26T18:30:00.000Z");
    await getLiveCounts(NOW);
    expect(calls.attempt).toContainEqual({ where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] }, finishedAt: { gte: DAY_START } } });
    expect(calls.user).toContainEqual({ where: { createdAt: { gte: DAY_START } } });
  });

  it("memoises the supply / scan counts for SUPPLY_TTL_MS and re-reads after", async () => {
    const supplySql = () => sqlLog.filter((s) => s.includes(`FROM "Question" q`)).length;
    await getLiveCounts(NOW);
    await getLiveCounts(new Date(NOW.getTime() + SUPPLY_TTL_MS - 1));
    expect(supplySql()).toBe(1);
    expect(calls.exam.length).toBe(1);
    // The live counts are still read every call.
    expect(sqlLog.filter((s) => s.includes("COUNT(DISTINCT k)")).length).toBe(2);
    await getLiveCounts(new Date(NOW.getTime() + SUPPLY_TTL_MS + 1));
    expect(supplySql()).toBe(2);
    expect(calls.exam.length).toBe(2);
  });

  it("keeps the honesty gates in the SQL", async () => {
    await getLiveCounts(NOW);
    const find = (frag: string) => sqlLog.find((s) => s.includes(frag)) ?? "";
    expect(find(") phantoms")).toContain(`"client" <> 'bot'`);
    expect(find(`kind = 'PAGE_VIEW' AND "createdAt" >=`)).toContain(`"client" <> 'bot'`);
    expect(find("COUNT(DISTINCT k)")).toContain(`"client" <> 'bot'`);
    expect(find("COUNT(DISTINCT k)")).toContain(`FROM "AnonTutorLog"`);
    // The abandon-ghost cron's ABANDONED flips are not activity.
    expect(find("COUNT(DISTINCT k)")).toMatch(/FROM "Attempt"\s+WHERE "updatedAt" >= \? AND status <> 'ABANDONED'/);
    // Guest tutor turns count only with a cookie — all-time and today.
    const tutorAll = find(`FROM "AnonTutorLog" WHERE "anonId" IS NOT NULL)`);
    expect(tutorAll).toContain(`<> ?`);
    expect(tutorAll).not.toMatch(/FROM "AnonTutorLog"\s*\)/);
    const tutorToday = find(`WHERE "anonId" IS NOT NULL AND "createdAt" >=`);
    expect(tutorToday).toContain(`FROM "AnonTutorLog"`);
    expect(tutorToday).toContain(`<> ?`);
    for (const q of sqlLog.filter((x) => x.includes(`"AnonTutorLog"`))) expect(q).toContain(`"anonId" IS NOT NULL`);
    expect(find(`FROM "Question" q`)).toContain("= ANY(q.tags)");
    for (const s of sqlLog.filter((x) => /JOIN "Exam"/.test(x))) expect(s).toContain(REAL_EXAM_SQL.sql);
    expect(calls.exam[0]).toEqual({ where: { active: true, category: { not: "SCHOOL_BOARD" } } });
    expect(calls.enrollment[0]).toEqual({ where: { active: true, exam: { category: { not: "SCHOOL_BOARD" } } } });
    expect(calls.attempt).toContainEqual({ where: { status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] } } });
  });

  it("the guest-import marker is the one /api/chat/import writes", () => {
    const src = read("src/app/api/chat/import/route.ts");
    expect(src).toContain(`const IMPORT_SOURCE = "${GUEST_IMPORT_SOURCE}";`);
    expect(src).toMatch(/source: IMPORT_SOURCE/);
  });
});

describe("the API route and the client shape", () => {
  it("ZERO_LIVE_COUNTS, the definitions and the client's key list agree", () => {
    const keys = Object.keys(ZERO_LIVE_COUNTS).sort();
    expect(keys).toEqual(Object.keys(LIVE_COUNT_DEFINITIONS).sort());
    expect([...LIVE_COUNT_KEYS].sort()).toEqual(keys);
    expect(ZERO_LIVE_COUNTS.languages).toBe(LANGUAGE_COUNT);
    for (const k of LIVE_COUNT_KEYS) if (k !== "languages") expect(ZERO_LIVE_COUNTS[k], k).toBe(0);
  });

  it("the route serves the read with the 30 s edge cache, and a failure is an uncached 503 — never a 200 of zeros", async () => {
    vi.resetModules();
    vi.doMock("@/lib/live-counts-server", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/live-counts-server")>();
      let fail = false;
      return {
        ...actual,
        getLiveCounts: async () => {
          fail = !fail;
          if (fail) throw new Error("neon stutter");
          return EXPECTED;
        },
      };
    });
    const { GET } = await import("@/app/api/live-counts/route");
    const failed = await GET();
    expect(failed.status).toBe(503);
    expect(failed.ok).toBe(false);
    expect(failed.headers.get("cache-control")).toBe("no-store");
    const body = (await failed.json()) as Record<string, unknown>;
    expect(Object.keys(body).filter((k) => (LIVE_COUNT_KEYS as string[]).includes(k))).toEqual([]);
    const ok = await GET();
    expect(ok.status).toBe(200);
    expect(ok.headers.get("cache-control")).toBe("public, s-maxage=30, stale-while-revalidate=60");
    expect(await ok.json()).toEqual(EXPECTED);
    vi.doUnmock("@/lib/live-counts-server");
    // The poll only merges an ok reply — a 503 leaves the strip as it was.
    const island = read("src/components/LiveCounters.tsx");
    expect(island).toMatch(/if \(!res\.ok\) return;[\s\S]*setCounts\(\(prev\) => mergeCounts\(prev, data\)\)/);
  });

  it("mergeCounts keeps last-known values for a field a reply lacks, 0 before any reply", () => {
    expect(mergeCounts(null, {})).toEqual({ ...ZERO_LIVE_COUNTS, languages: 0 });
    const merged = mergeCounts(EXPECTED, { activeNow: 3, tutorQuestions: Number.NaN });
    expect(merged.activeNow).toBe(3);
    expect(merged.tutorQuestions).toBe(EXPECTED.tutorQuestions);
    expect(merged.exams).toBe(EXPECTED.exams);
  });

  it("the home page passes every strip label from an i18n live.* key, none typed", () => {
    const src = read("src/app/page.tsx");
    const band = src.slice(src.indexOf("<LiveCountersStrip"), src.indexOf("/>", src.indexOf("<LiveCountersStrip")));
    for (const field of Object.keys(STRIP_DEFAULT_LABELS)) {
      const key = ({ questions: "live.questions", notes: "live.notes" } as Record<string, string>)[field] ?? `live.${field}`;
      expect(band, field).toMatch(new RegExp(`${field}: t\\("${key.replace(".", "\\.")}"\\)`));
    }
    expect(band).not.toMatch(/preparingNow|inMockNow|totalEver|activeDiscussions/);
    expect(band).not.toMatch(/:\s*"[^"]+"/);
  });

  it("the strip ships no typed number: no SSR placeholder values, a shell until the first reply", () => {
    const island = read("src/components/LiveCounters.tsx");
    const logic = read("src/components/live-counters-strip.ts");
    for (const src of [island, logic]) {
      expect(src).not.toMatch(/SSR_SAFE_INITIAL/);
      expect(src).not.toMatch(/uniqueVisitors:\s*\d/);
      // Prisma never enters the client bundle, nor does the i18n dictionary.
      expect(src).toMatch(/import type \{ LiveCounts \} from "@\/lib\/live-counts-server"/);
      expect(src).not.toMatch(/^import \{[^}]*\} from "@\/lib\/live-counts-server"/m);
      expect(src).not.toMatch(/from "@\/lib\/i18n"/);
    }
    expect(island).toMatch(/useState<LiveCounts \| null>\(null\)/);
    expect(island).toMatch(/from "\.\/live-counters-strip"/);
  });
});

// ── 6. The layout budget ──────────────────────────────────────────────
//
// 26 Sep 2026 review: the first cut let every row wrap, so the sticky band
// was 113 px on a desktop, 165–193 px on tablets and 3 lines on phones,
// and the shell was shorter than the loaded strip. Height is now fixed by
// construction (a 2 × 2 phone grid; two single-line rows from sm that
// scroll sideways instead of wrapping). What remains to pin is WIDTH: at
// which screen widths every counter is visible without that sideways
// scroll. The widths below were MEASURED, not estimated: rendered in a
// browser on shishya.in with the site's own font stack (Inter, Noto Sans
// Devanagari / Telugu), the strip's classes applied inline, read with
// getBoundingClientRect — and with every growing counter at 10x today's
// value (1,44,600 visitors, 8,66,570 page views "+9,450 today", 19,000
// signed up "+1,700 this week" …) so the budget has growth headroom.
// Re-measure when a label, the font or the strip's classes change; a new
// counter fails here until it has measured widths.

/** sm+ item widths in px at 12 px (sm:text-xs), pill included, the
 *  trailing "·" separator NOT included (SEP_PX each, all but the last). */
const MEASURED_SM: Record<"en" | "hi" | "te", Partial<Record<keyof LiveCounts, number>>> = {
  en: { activeNow: 83, uniqueVisitors: 100, totalPageViews: 210, mocksTaken: 231, questionsAnswered: 260, tutorQuestions: 226, liveTestsTaken: 114, totalSignups: 207, examGoals: 134, exams: 67, practiceQuestions: 153, topicNotes: 104, schoolChapters: 120, languages: 81 },
  hi: { activeNow: 74, uniqueVisitors: 100, totalPageViews: 167, mocksTaken: 185, questionsAnswered: 227, tutorQuestions: 196, liveTestsTaken: 93, totalSignups: 196, examGoals: 117, exams: 63, practiceQuestions: 100, topicNotes: 96, schoolChapters: 86, languages: 50 },
  te: { activeNow: 107, uniqueVisitors: 142, totalPageViews: 212, mocksTaken: 240, questionsAnswered: 307, tutorQuestions: 236, liveTestsTaken: 138, totalSignups: 247, examGoals: 209, exams: 74, practiceQuestions: 130, topicNotes: 107, schoolChapters: 107, languages: 61 },
};
/** Phone cell widths in px at 11 px (number + label, no pill). */
const MEASURED_PHONE: Record<"en" | "hi" | "te", Partial<Record<keyof LiveCounts, number>>> = {
  en: { uniqueVisitors: 91, mocksTaken: 140, tutorQuestions: 135, totalSignups: 94 },
  hi: { uniqueVisitors: 90, mocksTaken: 106, tutorQuestions: 115, totalSignups: 98 },
  te: { uniqueVisitors: 128, mocksTaken: 146, tutorQuestions: 141, totalSignups: 137 },
};
const SEP_PX = 13; // "·" with pl-1, 12 px
const LIVE_PX = 38; // the dot + "LIVE" lead on row 1
const ROW_GAP_PX = 16; // gap-x-4 between row elements
const PHONE_LEAD_PX = 12; // the dot + gap-1 in the first phone cell
const PHONE_GAP_PX = 12; // gap-x-3 between the two grid columns
/** Content width of the strip at a viewport width: px-4 / sm:px-6 / lg:px-8. */
const contentWidth = (viewport: number) => viewport - 2 * (viewport >= 1024 ? 32 : viewport >= 640 ? 24 : 16);

describe("layout budget (measured widths)", () => {
  // Everything that can render, at its widest (no counter hidden at 0).
  const all = buildStripItems({ ...EXPECTED, activeNow: 99, liveTestsTaken: 840, examGoals: 17950, schoolChapters: 500 });
  const rowWidth = (locale: "en" | "hi" | "te", row: 1 | 2) => {
    const keys = all.filter((it) => it.row === row).map((it) => it.key);
    const items = keys.map((k) => {
      const w = MEASURED_SM[locale][k];
      if (w === undefined) throw new Error(`no measured width for ${k} (${locale}) — measure it before adding it to the strip`);
      return w;
    });
    const elements = items.length + (row === 1 ? 1 : 0);
    return items.reduce((a, b) => a + b, 0) + SEP_PX * (items.length - 1) + (row === 1 ? LIVE_PX : 0) + ROW_GAP_PX * (elements - 1);
  };

  it("sm+: both rows fit whole at 1366 px in en and hi, and at 1536 px in te (10x headroom)", () => {
    for (const locale of ["en", "hi"] as const) {
      for (const row of [1, 2] as const) expect(rowWidth(locale, row), `${locale} row ${row}`).toBeLessThanOrEqual(contentWidth(1366));
    }
    for (const row of [1, 2] as const) expect(rowWidth("te", row), `te row ${row}`).toBeLessThanOrEqual(contentWidth(1536));
    // Sanity: the rows really are too wide for a tablet — that is what the
    // sideways scroll inside a fixed-height line is for.
    expect(rowWidth("en", 1)).toBeGreaterThan(contentWidth(768));
  });

  it("phones: every cell fits its half of a 360 px screen in en, hi and te", () => {
    const cell = (contentWidth(360) - PHONE_GAP_PX) / 2; // 158 px
    for (const locale of ["en", "hi", "te"] as const) {
      all
        .filter((it) => it.phone)
        .forEach((it, i) => {
          const w = MEASURED_PHONE[locale][it.key];
          expect(w, `${locale} ${it.key} measured`).toBeDefined();
          expect((w ?? Infinity) + (i === 0 ? PHONE_LEAD_PX : 0), `${locale} ${it.key}`).toBeLessThanOrEqual(cell);
        });
    }
  });

  it("the island uses the classes the budget was measured with, and one fixed-height frame for shell and strip", () => {
    const island = read("src/components/LiveCounters.tsx");
    const strip = island.slice(island.indexOf("export function LiveCountersStrip"), island.indexOf("interface BlockLabels"));
    // Font sizes, paddings and gaps behind MEASURED_* and contentWidth().
    expect(strip).toContain(`"px-4 py-1.5 text-[11px] text-emerald-900 sm:px-6 sm:text-xs lg:px-8"`);
    expect(strip).toContain("gap-x-4 whitespace-nowrap");
    // Phones: a 2 × 2 grid of fixed height → exactly two lines.
    expect(strip).toMatch(/grid h-9 grid-cols-\[minmax\(0,1fr\)_minmax\(0,1fr\)\] grid-rows-2 items-center gap-x-3 sm:hidden/);
    // sm+: two rows of fixed height that never wrap (they scroll sideways).
    expect(strip.match(/<StripRow[\s>]/g)?.length).toBe(2);
    expect(strip).toMatch(/h-\[22px\] overflow-x-auto overflow-y-hidden/);
    expect(strip).not.toMatch(/flex-wrap/);
    // The shell is the same frame (one return, no guessed min-height), so
    // the page below does not move when the first numbers land.
    const body = strip.slice(0, strip.indexOf("const ROW_SCROLL_STYLE"));
    expect(body.match(/\breturn \(/g)?.length).toBe(1);
    expect(strip).not.toMatch(/min-h-\[/);
    expect(body).toContain(`data-live-strip={counts ? "live" : "shell"}`);
  });
});
