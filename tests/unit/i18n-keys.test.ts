// Waves 2-3 language-first pass (13 Sep 2026): every student-facing string
// added in waves 2-3 now lives in src/lib/i18n.ts. No DB, no network.
// Run with: npx vitest run tests/unit/i18n-keys.test.ts
//
// What this pins:
//   • every new key exists in en + hi + te (and the nav / results / player
//     keys in mr ta kn gu bn ml pa, which already carry those families);
//   • each translation keeps EXACTLY the English {placeholders} — a dropped
//     {kept} or a renamed {n} would print a raw brace to a student;
//   • numbers are untouched ("around 9 AM", the 8:30 reminder, 30 seconds,
//     Today's 5) — a translation must never move the promised time;
//   • product tokens survive (Shishya, shishya.in/today, .ics, WhatsApp);
//   • honesty variants never collapse: "answers kept on this device" and
//     "this device could not keep a copy" stay different strings in every
//     locale;
//   • the English assembled lines are byte-identical to the pre-i18n copy.

import { describe, it, expect } from "vitest";
import { dict, fillTemplate, locales, type Locale, type StringKey } from "@/lib/i18n";
import {
  NAV_TODAY,
  NAV_TODAY_BY_LOCALE,
  NAV_TODAY_TITLE,
  STUDY_DAY_I18N_KEYS,
  resultsStudyDayCopy,
  todayBuildingSub,
  todayLabels,
} from "@/lib/study-day-copy";
import { CHALLENGE_I18N_KEYS, CHALLENGE_PUSH_I18N_KEYS, QUIZ_I18N_KEYS } from "@/lib/challenge-copy";
import { RESULT_CARD_I18N_KEYS } from "@/lib/result-card";
import { STUDY_GROUP_I18N_KEYS } from "@/lib/study-group";

const NAV = ["nav.today", "nav.today.title"] as const satisfies readonly StringKey[];

const TODAY = [
  "today.title",
  "today.eyebrow",
  "today.building",
  "today.building.sub.topic",
  "today.building.sub.baseline",
  "today.failed",
  "today.failed.network",
  "today.goDashboard",
] as const satisfies readonly StringKey[];

const RESULTS = [
  "results.streak.kept",
  "results.streak.milestone",
  "results.streak.started",
  "results.streak.atRisk",
  "results.streak.none",
  "results.tomorrow.topic",
  "results.tomorrow.baseline",
  "results.tomorrow.mail",
  "results.tomorrow.self",
  "results.tomorrow.open",
  "results.tomorrow.ics",
] as const satisfies readonly StringKey[];

const PLAYER = [
  "player.save.saving",
  "player.save.saved",
  "player.save.offline",
  "player.save.retrying",
  "player.save.error",
  "player.save.noMirror.offline",
  "player.save.noMirror.retrying",
  "player.save.noMirror.error",
  "player.save.unconfirmed",
  "player.save.notWritable",
  "player.save.signinExpired",
  "player.save.failed",
  "player.kept",
  "player.kept.noMirror",
  "player.kept.sentence",
  "player.kept.sentence.noMirror",
  "player.submit.offline",
  "player.submit.offline.noMirror",
  "player.submit.signinExpired",
  "player.submit.failed",
  "player.submit.retrying",
  "player.submit.retryingSlow",
  "player.submit.waiting",
  "player.submit.retryNow",
] as const satisfies readonly StringKey[];

const BUILD = [
  "build.seen.line",
  "build.seen.short",
  "build.seen.exhausted",
  "build.seen.examPage",
  "build.topic.seenTitle",
  "build.topic.newOf",
  "build.built.repeats",
  "build.built.start",
  "build.built.change",
  "build.questions",
  "build.difficulty",
  "build.diff.mixed",
  "build.diff.easy",
  "build.diff.hard",
  "build.available.one",
  "build.available.many",
  "build.fewer",
  "build.pickOne",
  "build.failed",
  "build.building",
  "build.start",
  "build.signin",
  "build.footer",
] as const satisfies readonly StringKey[];

const FOUND_VIA = [
  "foundVia.title",
  "foundVia.sub",
  "foundVia.thanks",
  "foundVia.skip",
  "foundVia.whatsapp",
  "foundVia.other",
] as const satisfies readonly StringKey[];

// Challenge a friend + the anonymous quiz player (14 Sep 2026): en + hi + te.
const CHALLENGE: readonly StringKey[] = [...CHALLENGE_I18N_KEYS, ...CHALLENGE_PUSH_I18N_KEYS, ...QUIZ_I18N_KEYS];

// Score calculator: share, "where do I stand?", published cutoffs (14 Sep 2026): en + hi + te.
const SCORE = [
  "ew.score.share.button",
  "ew.score.share.text",
  "ew.score.stand.title",
  "ew.score.stand.body",
  "ew.score.stand.fine",
  "ew.score.stand.add",
  "ew.score.stand.adding",
  "ew.score.stand.added",
  "ew.score.stand.count",
  "ew.score.stand.position",
  "ew.score.stand.caveat",
  "ew.score.stand.already",
  "ew.score.stand.error",
  "ew.score.published.title",
  "ew.score.published.note",
  "ew.score.published.more",
] as const satisfies readonly StringKey[];

const EVERY: readonly StringKey[] = [...NAV, ...TODAY, ...RESULTS, ...PLAYER, ...BUILD, ...FOUND_VIA, ...CHALLENGE, ...SCORE, ...RESULT_CARD_I18N_KEYS, ...STUDY_GROUP_I18N_KEYS];
const REQUIRED_LOCALES: Locale[] = ["en", "hi", "te"];
const REGIONAL_LOCALES: Locale[] = ["mr", "ta", "kn", "gu", "bn", "ml", "pa"];
const REGIONAL_KEYS: readonly StringKey[] = [...NAV, ...RESULTS, ...PLAYER];

/** The raw entry for a locale — no English fallback. */
function raw(locale: Locale, key: StringKey): string | undefined {
  return (dict as unknown as Record<string, Record<string, string>>)[locale]?.[key];
}
function tr(locale: Locale) {
  return (key: StringKey): string => raw(locale, key) ?? dict.en[key];
}
function placeholders(s: string): string[] {
  return [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();
}
function numbers(s: string): string[] {
  return [...new Set(s.replace(/\{\w+\}/g, "").match(/\d+(?::\d+)?/g) ?? [])].sort();
}
const TOKENS = ["Shishya", "shishya.in/today", ".ics", "WhatsApp", "🔥", "🎉", "☀️", "→"];

describe("waves 2-3 keys — presence", () => {
  it("the key lists have no duplicates", () => {
    expect(new Set(EVERY).size).toBe(EVERY.length);
  });

  for (const locale of REQUIRED_LOCALES) {
    it(`every key exists in ${locale}`, () => {
      const missing = EVERY.filter((k) => !raw(locale, k)?.trim());
      expect(missing).toEqual([]);
    });
  }

  for (const locale of REGIONAL_LOCALES) {
    it(`nav / results / player keys exist in ${locale}`, () => {
      const missing = REGIONAL_KEYS.filter((k) => !raw(locale, k)?.trim());
      expect(missing).toEqual([]);
    });
  }

  it("hi and te are real translations, not English copies", () => {
    for (const locale of ["hi", "te"] as const) {
      // Brand-only / symbol-only strings may legitimately match; none of ours do.
      const copied = EVERY.filter((k) => raw(locale, k) === dict.en[k]);
      expect(copied, locale).toEqual([]);
    }
  });

  it("study-day-copy's key list is covered, and its English nav constants match the dict", () => {
    expect(STUDY_DAY_I18N_KEYS.filter((k) => !EVERY.includes(k))).toEqual([]);
    expect(NAV_TODAY).toBe(dict.en["nav.today"]);
    expect(NAV_TODAY_TITLE).toBe(dict.en["nav.today.title"]);
  });

  it("the dict-free header map matches the dictionary byte-for-byte", () => {
    const entries = Object.entries(NAV_TODAY_BY_LOCALE) as [Locale, { label: string; title: string }][];
    expect(entries.map(([l]) => l).sort()).toEqual([...REQUIRED_LOCALES, ...REGIONAL_LOCALES].sort());
    for (const [locale, v] of entries) {
      expect(v.label, locale).toBe(raw(locale, "nav.today"));
      expect(v.title, locale).toBe(raw(locale, "nav.today.title"));
    }
  });
});

describe("waves 2-3 keys — every translation keeps the English shape", () => {
  for (const locale of locales.filter((l) => l !== "en")) {
    it(`${locale}: same {placeholders}, same numbers, product tokens kept`, () => {
      const bad: string[] = [];
      for (const k of EVERY) {
        const v = raw(locale, k);
        if (v === undefined) continue; // falls back to English — nothing to compare
        const en = dict.en[k];
        if (placeholders(v).join() !== placeholders(en).join()) {
          bad.push(`${k}: placeholders {${placeholders(v)}} vs en {${placeholders(en)}}`);
        }
        if (numbers(v).join() !== numbers(en).join()) {
          bad.push(`${k}: numbers [${numbers(v)}] vs en [${numbers(en)}]`);
        }
        for (const tok of TOKENS) {
          if (en.includes(tok) && !v.includes(tok)) bad.push(`${k}: lost "${tok}"`);
        }
      }
      expect(bad).toEqual([]);
    });
  }
});

describe("honesty variants stay distinct in every locale", () => {
  const PAIRS: [StringKey, StringKey][] = [
    ["player.kept", "player.kept.noMirror"],
    ["player.kept.sentence", "player.kept.sentence.noMirror"],
    ["player.save.offline", "player.save.noMirror.offline"],
    ["player.save.retrying", "player.save.noMirror.retrying"],
    ["player.save.error", "player.save.noMirror.error"],
    ["player.submit.offline", "player.submit.offline.noMirror"],
    ["build.available.one", "build.available.many"],
  ];
  for (const locale of [...REQUIRED_LOCALES, ...REGIONAL_LOCALES]) {
    it(locale, () => {
      for (const [kept, notKept] of PAIRS) {
        const a = raw(locale, kept);
        const b = raw(locale, notKept);
        if (a === undefined || b === undefined) continue;
        // Plural pairs may coincide in languages without a plural form.
        if (kept === "build.available.one" && locale !== "en") continue;
        expect(a, `${locale} ${kept}`).not.toBe(b);
      }
    });
  }
});

describe("assembled copy", () => {
  const en = tr("en");

  it("English results lines are byte-identical to the pre-i18n constants", () => {
    const c = resultsStudyDayCopy(en);
    expect(c.streak.kept(3)).toBe("🔥 3-day streak — today counts.");
    expect(c.streak.milestone(7)).toBe("🎉 7-day streak — milestone reached today.");
    expect(c.streak.started).toBe("Day 1 of your streak — today counts.");
    expect(c.streak.atRisk(4)).toBe("🔥 4-day streak — nothing yet today. Today's 5 keeps it.");
    expect(c.streak.none).toBe("Start your streak — today's 5 is one tap away.");
    expect(c.tomorrowTopic("Polity")).toBe("Tomorrow's 5 is on Polity — your weakest topic right now.");
    expect(c.tomorrowBaseline).toBe("Tomorrow's 5 is a 5-question baseline set.");
    expect(c.tomorrowMail).toBe(
      "Open shishya.in/today any time — we'll also email you around 9 AM, unless you've already opened Shishya by then.",
    );
    expect(c.tomorrowSelf).toBe("Ready any time at shishya.in/today.");
    expect(c.openToday).toBe("Open today's 5 →");
    expect(c.ics).toBe("Add an 8:30 AM reminder (.ics)");
  });

  it("English /today lines are byte-identical to the pre-i18n constants", () => {
    const l = todayLabels(en);
    expect(todayBuildingSub(l, "SSC CGL", "Polity")).toBe("5 questions on Polity (SSC CGL) — about 3 minutes.");
    expect(todayBuildingSub(l, "SSC CGL", null)).toBe("A 5-question baseline set for SSC CGL — about 3 minutes.");
    expect(l.building).toBe("Building today's 5…");
    expect(l.failed).toBe("Couldn't build today's 5 — start it from your dashboard instead.");
    expect(l.failedNetwork).toBe("Network hiccup — reload to try again, or start from your dashboard.");
    expect(l.goDashboard).toBe("Go to your dashboard →");
    expect(en("today.title")).toBe("Today's 5 — Shishya");
  });

  it("English build-mock seen lines match the shipped wording", () => {
    expect(fillTemplate(en("build.seen.line"), { seen: 12, total: 40, days: 90 })).toBe(
      "You have seen 12 of the 40 validated questions in this selection (any mock you opened in the last 90 days counts).",
    );
    expect(fillTemplate(en("build.built.repeats"), { count: 25, repeats: 3, days: 90, seen: 30, size: 32 })).toBe(
      "Built: 25 questions — 3 of them you have seen in the last 90 days (30 of the 32 questions in this bank seen).",
    );
  });

  it("hi and te lines fill every placeholder with the real numbers", () => {
    for (const locale of ["hi", "te"] as const) {
      const t = tr(locale);
      const c = resultsStudyDayCopy(t);
      for (const line of [
        c.streak.kept(12),
        c.streak.atRisk(12),
        c.tomorrowTopic("Polity"),
        todayBuildingSub(todayLabels(t), "RRB NTPC", "Polity"),
        fillTemplate(t("build.seen.short"), { unseen: 4, size: 25, repeats: 21 }),
        fillTemplate(t("player.submit.failed"), { code: "HTTP 400", kept: t("player.kept.sentence") }),
      ]) {
        expect(line, `${locale}: ${line}`).not.toMatch(/\{\w+\}/);
      }
      expect(c.streak.kept(12)).toContain("12");
      expect(c.tomorrowTopic("Polity")).toContain("Polity");
    }
  });
});

describe("fillTemplate", () => {
  it("fills every occurrence and leaves unknown placeholders visible", () => {
    expect(fillTemplate("{n} of {n} · {x}", { n: 3 })).toBe("3 of 3 · {x}");
  });
  it("never re-expands a value that itself looks like a placeholder", () => {
    expect(fillTemplate("on {topic}", { topic: "{n}", n: 5 })).toBe("on {n}");
  });
  it("prints 0, never blank", () => {
    expect(fillTemplate("{n} not yet confirmed", { n: 0 })).toBe("0 not yet confirmed");
  });
});
