// Wave 3 (16 Sep 2026) — the core i18n families added to src/lib/i18n.ts in
// one pass: the last-minute checklist (chk.*), the marking-scheme refusals
// (mark.*), the exam-day / after-paper body copy (phase.*, ew.night.*),
// /login and /onboarding (login.*, onb.crumb.* / onb.h1 / onb.intro* /
// onb.step), the mock player's last English lines, and the dict-free
// InstallOffer map. No DB, no network.
// Run with: npx vitest run tests/unit/i18n-a-core.test.ts
//
// What it guards:
//   • every key of these families exists in en, hi AND te as a real
//     translation (own script, not an English copy), with the same
//     {placeholders}, the same numbers and the product tokens kept;
//   • the honesty qualifiers survive translation with the same force —
//     "not official", "not a prediction", "not an announcement", "not
//     announced yet", "PYQ-pattern … modelled on";
//   • English is unchanged where a literal moved into the dictionary
//     (login.body.noCount is exactly what the old regex strip produced);
//   • the install bar speaks en / hi / te from a dict-free map, picks the
//     language the way the server does (URL prefix, then cookie), and no
//     language adds a number or urgency to it.

import { describe, it, expect } from "vitest";
import { dict, fillTemplate, type Locale, type StringKey } from "@/lib/i18n";
import { INSTALL_OFFER_BY_LOCALE, INSTALL_OFFER_COPY, installOfferLocale } from "@/lib/install-offer";

const PREFIXES = ["chk.", "mark.", "phase.", "ew.night.", "login.bullets.", "login.intent.", "login.escape."];
const SINGLES = [
  "login.body",
  "login.body.noCount",
  "login.freeLine",
  "login.tryFirst",
  "login.firstTime",
  "onb.crumb.home",
  "onb.crumb.welcome",
  "onb.h1",
  "onb.intro",
  "onb.intro.settings",
  "onb.step",
  "player.submit.again",
  "player.confirm.unsynced.one",
  "player.confirm.unsynced.many",
];
const KEYS = (Object.keys(dict.en) as StringKey[]).filter(
  (k) => PREFIXES.some((p) => k.startsWith(p)) || SINGLES.includes(k),
);

const raw = (locale: Locale, key: StringKey): string | undefined => (dict[locale] as Record<string, string>)[key];
const placeholders = (s: string) => [...new Set(s.match(/\{\w+\}/g) ?? [])].sort();
const numbers = (s: string) => [...new Set(s.replace(/\{\w+\}/g, "").match(/\d+(?::\d+)?/g) ?? [])].sort();
const hasLetters = (s: string) => /[A-Za-z]/.test(s.replace(/\{\w+\}/g, ""));
const SCRIPT: Record<"hi" | "te", RegExp> = { hi: /[ऀ-ॿ]/, te: /[ఀ-౿]/ };
const TOKENS = ["Shishya", "WhatsApp", "PYQ", "→", "↗", "🎯", "🎒", "🎫", "📝", "🔑", "🔗", "🗓️", "📚", "🧠", "📋", "🔴", "📊", "✅", "🔎", "👋"];

describe("wave-3 core families — presence and shape", () => {
  it("the families are the size this wave built (a dropped block would shrink them)", () => {
    expect(KEYS.filter((k) => k.startsWith("chk.")).length).toBeGreaterThanOrEqual(90);
    expect(KEYS.filter((k) => k.startsWith("mark.")).length).toBeGreaterThanOrEqual(13);
    expect(KEYS.filter((k) => k.startsWith("phase.")).length).toBeGreaterThanOrEqual(55);
    expect(KEYS.filter((k) => k.startsWith("ew.night.")).length).toBe(9);
    expect(KEYS.filter((k) => k.startsWith("login.")).length).toBe(19);
  });

  for (const locale of ["hi", "te"] as const) {
    it(`${locale}: every key is present, in its own script, and not an English copy`, () => {
      const missing = KEYS.filter((k) => !raw(locale, k)?.trim());
      expect(missing).toEqual([]);
      // Symbol-only strings ("." as a sentence end) may equal English.
      const lettered = KEYS.filter((k) => hasLetters(dict.en[k]));
      expect(lettered.filter((k) => raw(locale, k) === dict.en[k])).toEqual([]);
      expect(lettered.filter((k) => !SCRIPT[locale].test(raw(locale, k) ?? ""))).toEqual([]);
    });

    // 16 Sep 2026: a Thai "ร" (U+0E23) sat inside the Telugu word "పేపర్" and
    // the check above passed, because the rest of the string was Telugu. A
    // letter or vowel sign from any third script is a typo, never a choice:
    // only the locale's own script and Latin (exam names, Shishya) may appear.
    it(`${locale}: no letter from a third script`, () => {
      const foreign = (s: string) =>
        [...s.replace(/\{\w+\}/g, "")].filter(
          (ch) => /[\p{L}\p{Mn}\p{Mc}]/u.test(ch) && !/[A-Za-z‌‍️]/.test(ch) && !SCRIPT[locale].test(ch),
        );
      const bad = KEYS.map((k) => [k, foreign(raw(locale, k) ?? "")] as const)
        .filter(([, chars]) => chars.length > 0)
        .map(([k, chars]) => `${k}: ${chars.map((c) => "U+" + c.codePointAt(0)!.toString(16).toUpperCase()).join(" ")}`);
      expect(bad).toEqual([]);
    });

    it(`${locale}: same {placeholders}, same numbers, product tokens kept`, () => {
      const bad: string[] = [];
      for (const k of KEYS) {
        const v = raw(locale, k) ?? "";
        const en = dict.en[k];
        if (placeholders(v).join() !== placeholders(en).join()) bad.push(`${k}: placeholders {${placeholders(v)}} vs en {${placeholders(en)}}`);
        if (numbers(v).join() !== numbers(en).join()) bad.push(`${k}: numbers [${numbers(v)}] vs en [${numbers(en)}]`);
        for (const tok of TOKENS) if (en.includes(tok) && !v.includes(tok)) bad.push(`${k}: lost "${tok}"`);
      }
      expect(bad).toEqual([]);
    });
  }
});

describe("te: no case suffix glued onto a bracketed date", () => {
  // {d} / {dated} always end in a bracketed tier word — "20 సెప్టెం (అధికారిక)" —
  // so a suffix written straight after the placeholder lands on ")":
  // "(అధికారిక)న" (16 Sep 2026). The sentence must stand without one.
  it("no Telugu letter directly follows {d} or {dated}", () => {
    const glued = KEYS.filter((k) => /\{(?:d|dated)\}[ఀ-౿]/.test(raw("te", k) ?? ""));
    expect(glued).toEqual([]);
  });
  it("the rendered exam-day line ends the date with its tier bracket", () => {
    const line = fillTemplate(raw("te", "chk.day.week" as StringKey)!, { d: "20 సెప్టెం (అధికారిక)", n: 4 });
    expect(line).toContain("(అధికారిక) —");
    expect(line).not.toMatch(/\)[ఀ-౿]/);
  });
});

describe("honesty qualifiers keep their force in hi and te", () => {
  // key → the negation / hedge each language must carry.
  const MUST: [StringKey, { hi: RegExp; te: RegExp }][] = [
    ["phase.holds.cutoff", { hi: /आधिकारिक नहीं/, te: /అధికారికం కాదు/ }],
    ["ew.night.hardest", { hi: /भविष्यवाणी नहीं/, te: /కాదు/ }],
    ["chk.intro.expected", { hi: /अनुमान.*घोषणा नहीं/, te: /అంచనా.*కాదు/ }],
    ["chk.intro.reported", { hi: /जाँच/, te: /సరిచూ|ధృవీకరించ|నిర్ధారించ/ }],
    ["chk.notAnnounced", { hi: /घोषित नहीं/, te: /ప్రకటించ/ }],
    ["chk.admit.none", { hi: /घोषित नहीं/, te: /ప్రకటించ/ }],
    ["chk.day.passed", { hi: /घोषित नहीं/, te: /ప్రకటించ/ }],
    ["chk.day.openWindow", { hi: /घोषित नहीं/, te: /ప్రకటించ/ }],
    ["ew.night.openEnded", { hi: /घोषित नहीं/, te: /ప్రకటించ/ }],
    ["chk.marking.noNeg", { hi: /हमारे रिकॉर्ड.*पुष्टि/, te: /మా రికార్డు/ }],
    ["chk.languages.none", { hi: /हमारे रिकॉर्ड में नहीं/, te: /మా రికార్డు/ }],
    ["mark.none", { hi: /हमारे रिकॉर्ड में नहीं/, te: /మా రికార్డులో లేదు/ }],
    ["phase.live.empty", { hi: /दो से कम/, te: /రెండు/ }],
    ["phase.react.empty", { hi: /कम से कम दो/, te: /రెండు/ }],
  ];
  for (const [key, want] of MUST) {
    it(key, () => {
      expect(raw("hi", key)).toMatch(want.hi);
      expect(raw("te", key)).toMatch(want.te);
    });
  }

  it("the PYQ-pattern name is never shortened to plain 'PYQ' or 'previous year questions'", () => {
    for (const key of ["phase.holds.pyq", "ew.night.pyqFallback", "login.bullets.3"] as StringKey[]) {
      expect(dict.en[key]).toMatch(/PYQ-pattern/);
      expect(raw("hi", key)).toMatch(/PYQ-पैटर्न/);
      expect(raw("te", key)).toMatch(/PYQ-ప్యాటర్న్/);
    }
  });

  it("'not announced yet' is one wording per language on the checklist", () => {
    expect(dict.en["chk.notAnnounced"]).toBe("not announced yet");
  });
});

describe("/login and /onboarding", () => {
  it("login.body.noCount is exactly the old English sentence with the count clause stripped", () => {
    expect(dict.en["login.body.noCount"]).toBe(dict.en["login.body"].replace(/\s*—\s*for any of \{n\} exams/, ""));
  });

  it("hi and te login.body carry the 11 Sep offer (plan, scores, result email) and the {n} clause", () => {
    for (const locale of ["hi", "te"] as const) {
      const body = raw(locale, "login.body") ?? "";
      expect(body).toContain("{n}");
      expect(body).toContain("Google");
      expect(raw(locale, "login.body.noCount")).not.toContain("{n}");
      // The sentence without the count is the same sentence, minus the clause.
      expect(body.length).toBeGreaterThan((raw(locale, "login.body.noCount") ?? "").length);
      expect(fillTemplate(body, { n: 178 })).toContain("178");
    }
  });

  it("English literals that moved into the dictionary are unchanged", () => {
    expect(dict.en["login.freeLine"]).toBe("Free · No credit card · {n} Indian languages");
    expect(dict.en["login.bullets.3"]).toBe("PYQ-pattern papers — questions modelled on each year's paper, by topic");
    expect(dict.en["login.intent.return.h1"]).toBe("Welcome back");
    expect(fillTemplate(dict.en["login.tryFirst"], { exam: "SSC CGL" })).toBe(
      "Not ready to sign in? Try 5 SSC CGL questions first — no login →",
    );
    expect(dict.en["onb.step"]).toBe("Step {n} of 4");
    const [before, after] = dict.en["onb.intro"].split("{settings}");
    expect(`${before}${dict.en["onb.intro.settings"]}${after}`).toBe(
      "Four quick questions so we can show you the right content. Takes about 30 seconds. You can skip and pick later from profile settings.",
    );
  });

  it("every language places the settings link exactly once", () => {
    for (const locale of ["en", "hi", "te"] as const) {
      expect((raw(locale, "onb.intro") ?? "").split("{settings}").length).toBe(2);
    }
  });
});

describe("InstallOffer — dict-free copy", () => {
  it("English is the shipped sentence; hi and te are translations in their own script", () => {
    expect(INSTALL_OFFER_BY_LOCALE.en).toEqual({ body: INSTALL_OFFER_COPY, aria: "Install Shishya", add: "Add", dismiss: "No thanks" });
    for (const locale of ["hi", "te"] as const) {
      const c = INSTALL_OFFER_BY_LOCALE[locale];
      for (const v of [c.body, c.aria, c.add, c.dismiss]) {
        expect(v, locale).toMatch(SCRIPT[locale]);
        expect(v, locale).not.toMatch(/\d/); // no counter, no deadline, in any language
      }
      expect(c.body).toContain("Shishya");
      expect(c.aria).toContain("Shishya");
      expect(c.body).not.toBe(INSTALL_OFFER_COPY);
    }
  });

  it("URL prefix beats the cookie; anything else is English", () => {
    expect(installOfferLocale("/hi/exams/SSC_CGL", "shishya-lang=te")).toBe("hi");
    expect(installOfferLocale("/te", "")).toBe("te");
    expect(installOfferLocale("/exams/SSC_CGL", "a=1; shishya-lang=te; b=2")).toBe("te");
    expect(installOfferLocale("/exams/SSC_CGL", "shishya-lang=hi")).toBe("hi");
    expect(installOfferLocale("/history", "shishya-lang=mr")).toBe("en");
    expect(installOfferLocale("/hindi-medium", "")).toBe("en");
    expect(installOfferLocale(null, null)).toBe("en");
    expect(installOfferLocale("/", "xshishya-lang=hi")).toBe("en");
  });
});
