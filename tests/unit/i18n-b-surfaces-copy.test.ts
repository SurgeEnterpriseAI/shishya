// Per-locale copy for the state pages, the PYQ year page, the exam hub / FAQ
// and the home-page strips (16 Sep 2026 i18n wave).
//
// These four modules are the NAV_TODAY_BY_LOCALE pattern: plain en / hi / te
// maps, no dictionary import. This file is their parity + honesty guard —
// the job tests/unit/i18n-keys.test.ts does for src/lib/i18n.ts.
//
// What it pins:
//   1. en, hi and te carry exactly the same keys (nested maps included);
//   2. every {placeholder} appears in all three locales, so no translation
//      can silently drop a number, a name or a URL;
//   3. hi and te are actually translated (native script present) except for
//      the entries that are proper nouns or file types by design;
//   4. the English strings are byte-identical to the pages they replaced;
//   5. the honesty qualifiers survive translation: source tiers, "not the
//      original questions", "(expected)" / "was expected — not confirmed",
//      the N-of-M depth placeholders, and the AI-drafted disclosure;
//   6. the review fixes: no claim added in translation (TETs are not
//      "recruitment"), no count the page does not show, the tutor seed stays
//      a prompt demand mining recognises, and the state pages stay static.

import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import { CALENDAR_RAIL_EN } from "@/lib/calendar-rail-copy";
import { STATE_COPY, fillState, stateCopy, stateDisplayName, stateOtherNames } from "@/lib/state-exams-copy";
import { PYQ_YEAR_COPY, fillPyq, pyqYearCopy } from "@/lib/pyq-year-copy";
import { EXAM_HUB_COPY, examHubCopy, fillHub, hubDuration } from "@/lib/exam-hub-copy";
import { HOME_STRIP_COPY, calendarRailLabels, fillHome, homeStripCopy } from "@/lib/home-strip-copy";
import { pyqYearH1 } from "@/lib/pyq-naming";
import { formatDay, stateFaq, type StateDate, type StateExam } from "@/lib/state-exams";
import { isOurTutorPrompt } from "@/lib/tutor-templates";

type AnyCopy = Record<string, unknown>;
const LOCALES = ["en", "hi", "te"] as const;

/** Every leaf string, keyed by its dotted path. */
function leaves(o: AnyCopy, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else if (v && typeof v === "object") Object.assign(out, leaves(v as unknown as AnyCopy, key));
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
const devanagari = (s: string) => /[ऀ-ॿ]/.test(s);
const telugu = (s: string) => /[ఀ-౿]/.test(s);

const MODULES = {
  "state-exams-copy": STATE_COPY,
  "pyq-year-copy": PYQ_YEAR_COPY,
  "exam-hub-copy": EXAM_HUB_COPY,
  "home-strip-copy": HOME_STRIP_COPY,
} as const;

/** Entries that stay Latin on purpose: acronyms, file types, proper nouns,
 *  the pure-placeholder joiners, the full stop, and the tutor seed (English
 *  in every locale — see "the tutor seed" test below). */
const LATIN_BY_DESIGN = new Set([
  "pyq-year-copy.crumb",
  "pyq-year-copy.pdf",
  "pyq-year-copy.tutorSeed",
  "state-exams-copy.sentenceEnd",
  "exam-hub-copy.durJoin",
  "home-strip-copy.shishyaAi",
  "state-exams-copy.types.PSC",
  "state-exams-copy.typeShort.PSC",
]);

describe("i18n-b surface copy: en / hi / te parity", () => {
  for (const [name, mod] of Object.entries(MODULES)) {
    it(`${name}: the three locales carry the same keys`, () => {
      const en = Object.keys(leaves(mod.en as unknown as AnyCopy)).sort();
      for (const lc of ["hi", "te"] as const) {
        expect(Object.keys(leaves(mod[lc] as unknown as AnyCopy)).sort(), `${name}.${lc}`).toEqual(en);
      }
    });

    it(`${name}: every {placeholder} survives translation`, () => {
      const en = leaves(mod.en as unknown as AnyCopy);
      for (const lc of ["hi", "te"] as const) {
        const other = leaves(mod[lc] as unknown as AnyCopy);
        for (const [key, value] of Object.entries(en)) {
          expect(placeholders(other[key]), `${name}.${lc}.${key}`).toEqual(placeholders(value));
        }
      }
    });

    it(`${name}: hi is Devanagari and te is Telugu, except where Latin is the point`, () => {
      const en = leaves(mod.en as unknown as AnyCopy);
      for (const key of Object.keys(en)) {
        if (LATIN_BY_DESIGN.has(`${name}.${key}`)) continue;
        const hi = leaves(mod.hi as unknown as AnyCopy)[key];
        const te = leaves(mod.te as unknown as AnyCopy)[key];
        expect(hi.length, `${name}.hi.${key}`).toBeGreaterThan(0);
        expect(te.length, `${name}.te.${key}`).toBeGreaterThan(0);
        expect(devanagari(hi), `${name}.hi.${key} = ${hi}`).toBe(true);
        expect(telugu(te), `${name}.te.${key} = ${te}`).toBe(true);
      }
    });

    it(`${name}: a missing or unknown locale falls back to English`, () => {
      const pick = {
        "state-exams-copy": stateCopy,
        "pyq-year-copy": pyqYearCopy,
        "exam-hub-copy": examHubCopy,
        "home-strip-copy": homeStripCopy,
      }[name as keyof typeof MODULES];
      for (const lc of [undefined, null, "", "en", "mr", "fr"]) expect(pick(lc)).toBe(mod.en);
      expect(pick("hi")).toBe(mod.hi);
      expect(pick("te")).toBe(mod.te);
    });
  }
});

describe("English output is unchanged", () => {
  it("state pages: intro, tier legend and the FAQ read exactly as they did on 15 Sep", () => {
    const C = STATE_COPY.en;
    expect(
      fillState(C.intro, { n: 5, state: "Maharashtra", pageWord: C.examPageMany, types: " — PSC, Police", lang: "Hindi" }),
    ).toBe(
      "Shishya has 5 Maharashtra exam pages — PSC, Police. Each is free: mock tests in the real pattern, the syllabus, cutoffs and an exam tracker that labels every date official, reported or expected. Questions are in English and can be read in Hindi and other Indian languages inside any test.",
    );
    expect(C.tierLegend).toBe("Official = the conducting body's own notice · reported = announced, cited via a secondary source.");
    expect(C.types.Other).toBe("Other exams");
    expect(C.types["Staff selection"]).toBe("Staff selection exams");
    expect(fillState(C.cardMeta, { n: 100, min: 90, langs: "English" })).toBe("100 questions · 90 min · English");
    // PersonalisedHub's state card (16 Sep 2026).
    expect(fillState(C.hubPinned, { state: "Maharashtra" })).toBe("Pinned for Maharashtra");
    expect(fillState(C.hubStateLine, { state: "Maharashtra" })).toBe("Government exams for Maharashtra on Shishya.");
    expect(fillState(C.hubCardTitle, { state: "Maharashtra" })).toBe("Maharashtra government exams");
    expect(fillState(C.hubCardBody, { state: "Maharashtra" })).toBe(
      "Every Maharashtra exam on Shishya, with announced dates and free mock tests.",
    );
  });

  it("stateFaq: English is the default, so the context file is untouched", () => {
    const exams: StateExam[] = [
      { code: "MH_MPSC", name: "Maharashtra Public Service Commission", shortName: "MPSC", type: "PSC", updatedAt: "", officialUrl: "https://mpsc.gov.in", officialName: "MPSC" },
    ];
    const faq = stateFaq({ name: "Maharashtra", slug: "maharashtra" }, exams, [], 120);
    expect(faq[0].q).toBe("Which Maharashtra government exams can I prepare for on Shishya?");
    expect(faq[0].a).toBe(
      "Shishya has 1 Maharashtra exam page: MPSC (Maharashtra Public Service Commission). Each is free, with mock tests, the syllabus, cutoffs and an exam tracker: https://shishya.in/exams/state/maharashtra",
    );
    expect(faq[1].a).toBe(
      "No Maharashtra exam date on Shishya's tracker has been announced for the next 120 days. Each exam's tracker page lists its expected dates, marked as estimates.",
    );
    expect(faq[2].a).toBe("Apply only on the conducting body's own website: MPSC (https://mpsc.gov.in).");
    // Hindi keeps the same facts, the same URL and the same count.
    const hi = stateFaq({ name: "महाराष्ट्र", slug: "maharashtra" }, exams, [], 120, "hi");
    expect(hi).toHaveLength(3);
    expect(hi[0].a).toContain("https://shishya.in/exams/state/maharashtra");
    expect(hi[1].a).toContain("120");
    expect(hi[2].a).toContain("https://mpsc.gov.in");
  });

  it("pyq year page: the honesty sentences are the 15 Sep ones", () => {
    const P = PYQ_YEAR_COPY.en;
    expect(fillPyq(P.modelled, { n: 23, year: 2024, m: 100 })).toBe(
      "23 PYQ-pattern questions modelled on the 2024 paper (which had 100)",
    );
    expect(fillPyq(P.freshNote, { year: 2024 })).toBe(
      "Every question here is freshly worded in the pattern of the 2024 paper — same topics, style and difficulty — not the original questions, which Shishya does not reproduce.",
    );
    expect(fillPyq(P.officialHeading, { year: 2024, publisher: "UPSC" })).toBe("The original 2024 paper, as UPSC published it");
    expect(pyqYearH1("SSC CGL", 2024, true)).toBe("SSC CGL 2024 previous year paper · official paper and PYQ-pattern practice");
    expect(pyqYearH1("SSC CGL", 2024, false)).toBe("SSC CGL 2024 previous year paper practice · PYQ-pattern set");
  });

  it("exam hub: the FAQ answers and the CTA read as before", () => {
    const H = EXAM_HUB_COPY.en;
    expect(fillHub(H.pyqSet, { held: 23, paper: fillHub(H.pyqPaperYear, { year: 2024 }), total: 100 })).toBe(
      "23 PYQ-pattern questions modelled on the 2024 paper (which had 100)",
    );
    expect(fillHub(H.pyqSetNoTotal, { held: 23, paper: H.pyqPaperThat })).toBe(
      "23 PYQ-pattern questions modelled on that year's paper",
    );
    expect(fillHub(H.faqLengthA, { name: "SSC Combined Graduate Level", short: "SSC CGL", dur: hubDuration(H, 60) })).toBe(
      "The SSC Combined Graduate Level (SSC CGL) runs for 1 hour. Shishya's mock tests mirror this duration so you can practise under real exam-time pressure.",
    );
    expect(hubDuration(H, 150)).toBe("2 hours 30 minutes");
    expect(hubDuration(H, 45)).toBe("45 minutes");
    expect(fillHub(H.coachTitle, { short: "SSC CGL" })).toBe(
      "Free SSC CGL mock tests and previous year paper practice — start now.",
    );
    expect(H.coachBodyA + "Shishya " + H.coachBodyB).toBe(
      "Full-length mocks with instant scoring and solutions, PYQ-pattern papers, topic-wise tests and Ask Shishya when you're stuck. Your scores, rank and a free day-by-day plan are saved to your account. All free, no credit card. Content is AI-drafted and checked against the official notification.",
    );
    expect(fillHub(H.langLine, { n: 9 })).toBe("· every mock readable in हिंदी + 9 languages inside the test");
  });

  it("home strips: the announced-dates line and the expected labels are unchanged", () => {
    const C = HOME_STRIP_COPY.en;
    expect(C.announcedOnly).toBe("Announced dates only · every date with its source tier");
    expect(C.rail.wasExpected).toBe("was expected — not confirmed");
    expect(C.rail.expected).toBe("(expected)");
    expect(C.starterQuestion).toBe("Starter question · Shishya");
    expect(C.aiReply).toBe("AI reply · not a student");
    expect(fillHome(C.inDays, { n: 3 })).toBe("in 3 days");
    expect(fillHome(C.moreOnCalendar, { n: 4 })).toBe("+4 more on the exam calendar →");
    expect(fillHome(C.datesCount, { n: 12 })).toBe("12 dates");
    expect(calendarRailLabels("en")).toBe(C.rail);
  });

  it("the feature-cards heading states no count (it said six over five cards)", () => {
    expect(HOME_STRIP_COPY.en.featHeading).toBe("The tools you'll actually use");
    for (const lc of LOCALES) {
      expect(HOME_STRIP_COPY[lc].featHeading).not.toMatch(/\d|six|five|छह|पाँच|पांच|ఆరు|ఐదు/i);
    }
  });

  it("the calendar rail (a client island) imports only its English default, never the three-locale map", () => {
    expect(HOME_STRIP_COPY.en.rail).toBe(CALENDAR_RAIL_EN);
    const src = readFileSync("src/components/UpcomingExamsSidebar.tsx", "utf8");
    expect(src).toContain('from "@/lib/calendar-rail-copy"');
    expect(src).not.toContain("home-strip-copy\"");
  });
});

describe("honesty survives translation", () => {
  it("state pages keep both source tiers in every language", () => {
    expect(STATE_COPY.hi.tierLegend).toContain("आधिकारिक");
    expect(STATE_COPY.hi.tierLegend).toContain("रिपोर्टेड");
    expect(STATE_COPY.te.tierLegend).toContain("అధికారిక");
    expect(STATE_COPY.te.tierLegend).toContain("నివేదిత");
    expect(STATE_COPY.hi.tierOfficialLong).toContain("आधिकारिक");
    expect(STATE_COPY.te.tierReportedLong).toContain("నివేదిత");
    // "No date announced" still says the tracker's own dates are estimates.
    expect(STATE_COPY.hi.noneAnnounced).toContain("अनुमान");
    expect(STATE_COPY.te.noneAnnounced).toContain("అంచనా");
  });

  it("PYQ copy never claims the paper, in any language", () => {
    for (const lc of LOCALES) {
      const P = PYQ_YEAR_COPY[lc];
      // "PYQ-pattern" is kept as the label in every script.
      expect(P.modelled).toContain("PYQ");
      expect(P.h1Practice).toContain("PYQ");
      expect(P.tutorSeed).toContain("PYQ");
    }
    expect(PYQ_YEAR_COPY.hi.freshNote).toContain("नहीं");
    expect(PYQ_YEAR_COPY.te.freshNote).toContain("కాదు");
    // The N-of-M depth is carried by placeholders, checked above; the sentence
    // must still mention the real paper's count.
    expect(placeholders(PYQ_YEAR_COPY.hi.modelled)).toEqual(["m", "n", "year"]);
    expect(placeholders(PYQ_YEAR_COPY.te.modelled)).toEqual(["m", "n", "year"]);
  });

  it("hub FAQ keeps the AI-drafted disclosure and the PYQ qualifier", () => {
    for (const lc of LOCALES) {
      const H = EXAM_HUB_COPY[lc];
      expect(H.faqFreeA).toContain("AI");
      expect(H.faqCountA).toContain("AI");
      expect(H.faqPyqA).toContain("PYQ");
      expect(H.faqPyqOfficialA).toContain("PYQ");
      expect(H.coachBodyB).toContain("AI");
      expect(H.pyqNote).toContain("PYQ");
    }
    expect(EXAM_HUB_COPY.hi.faqPyqA).toContain("पेपर खुद नहीं");
    expect(EXAM_HUB_COPY.te.faqPyqA).toContain("పేపర్ మాత్రం కాదు");
  });

  it("the calendar rail still separates an estimate from a date", () => {
    for (const lc of LOCALES) {
      const L = HOME_STRIP_COPY[lc].rail;
      expect(L.expected).not.toBe(L.wasExpected);
      expect(L.expected.length).toBeGreaterThan(0);
      expect(L.wasExpected.length).toBeGreaterThan(0);
    }
    expect(HOME_STRIP_COPY.hi.rail.wasExpected).toContain("नहीं");
    expect(HOME_STRIP_COPY.te.rail.wasExpected).toContain("లేదు");
    // The seed-thread disclosure names Shishya in every language.
    for (const lc of LOCALES) expect(HOME_STRIP_COPY[lc].starterQuestion).toContain("Shishya");
  });
});

describe("review fixes (16 Sep 2026)", () => {
  it("the Teaching group is never called recruitment: it holds the TETs, which are eligibility tests", () => {
    for (const lc of ["hi", "te"] as const) {
      for (const label of [STATE_COPY[lc].types.Teaching, STATE_COPY[lc].typeShort.Teaching]) {
        expect(label, `${lc}: ${label}`).not.toMatch(/भर्ती|नियुक्ति|నియామక|భర్తీ/);
      }
    }
  });

  it("the Hindi 'next exam' answer ends its rows with the danda; English and Telugu keep the full stop", () => {
    const exams: StateExam[] = [
      { code: "MH_MPSC", name: "MPSC", shortName: "MPSC", type: "PSC", updatedAt: "", officialUrl: null, officialName: null },
    ];
    const upcoming: StateDate[] = [
      { examCode: "MH_MPSC", examShort: "MPSC", label: "Prelims", kind: "EXAM", day: "2026-09-20", tier: "official", url: null },
      { examCode: "MH_MPSC", examShort: "MPSC", label: "Mains", kind: "EXAM", day: "2026-11-08", tier: "reported", url: null },
    ];
    const next = (lc: "en" | "hi" | "te") => stateFaq({ name: "Maharashtra", slug: "maharashtra" }, exams, upcoming, 120, lc)[1].a;
    expect(next("en")).toBe(
      `MPSC: Prelims on ${formatDay("2026-09-20")} (official — the conducting body's notice). MPSC: Mains on ${formatDay("2026-11-08")} (reported — announced, cited via a secondary source).`,
    );
    expect(next("hi")).toContain(")। MPSC: ");
    expect(next("hi").endsWith(")।")).toBe(true);
    expect(next("hi")).not.toContain(").");
    expect(next("te").endsWith(").")).toBe(true);
  });

  it("the tutor seed is a prompt demand mining recognises as Shishya's own, in every locale", () => {
    for (const lc of LOCALES) {
      const seed = fillPyq(PYQ_YEAR_COPY[lc].tutorSeed, { short: "SSC CGL", year: 2023 });
      expect(isOurTutorPrompt(seed), `${lc}: ${seed}`).toBe(true);
    }
  });

  it("the state pages stay prerendered: the language comes from the URL, never from cookies or headers", () => {
    for (const file of ["src/app/exams/state/page.tsx", "src/app/exams/state/[slug]/page.tsx"]) {
      const code = readFileSync(file, "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");
      expect(code, file).not.toMatch(/\bgetT\s*\(|\bgetLocale\s*\(|\bgetUrlLocale\s*\(|\bcookies\s*\(|\bheaders\s*\(|\bauth\s*\(|searchParams/);
      expect(code, file).toContain("export const revalidate = 3600");
    }
  });
});

describe("state names follow the reader's script only where Shishya holds them", () => {
  const mh = { name: "Maharashtra", hindiName: "महाराष्ट्र", nativeName: "महाराष्ट्र", languages: ["MR", "EN"] };
  const ts = { name: "Telangana", hindiName: "तेलंगाना", nativeName: "తెలంగాణ", languages: ["TE", "EN"] };

  it("Hindi uses hindiName for every state", () => {
    expect(stateDisplayName(mh, "hi")).toBe("महाराष्ट्र");
    expect(stateDisplayName(ts, "hi")).toBe("तेलंगाना");
  });

  it("Telugu uses nativeName only for a Telugu-speaking state", () => {
    expect(stateDisplayName(ts, "te")).toBe("తెలంగాణ");
    expect(stateDisplayName(mh, "te")).toBe("Maharashtra");
  });

  it("English, and any other locale, keep the English name", () => {
    expect(stateDisplayName(ts, "en")).toBe("Telangana");
    expect(stateDisplayName(ts, undefined)).toBe("Telangana");
    expect(stateDisplayName(ts, "mr")).toBe("Telangana");
  });

  it("the line under the heading never repeats the heading; English is as it was", () => {
    const an = { name: "Andaman and Nicobar Islands", hindiName: "अंडमान और निकोबार द्वीप समूह", nativeName: "Andaman and Nicobar Islands", languages: ["EN", "HI"] };
    // English heading: "native · Hindi", one name when they are the same (15 Sep).
    expect(stateOtherNames(mh, "en")).toBe("महाराष्ट्र");
    expect(stateOtherNames(ts, "en")).toBe("తెలంగాణ · तेलंगाना");
    expect(stateOtherNames(an, "en")).toBe("Andaman and Nicobar Islands · अंडमान और निकोबार द्वीप समूह");
    // A Telugu reader of a non-Telugu state gets the English heading, so the English line.
    expect(stateOtherNames(mh, "te")).toBe("महाराष्ट्र");
    // Hindi / Telugu heading: the names it did not use.
    expect(stateOtherNames(mh, "hi")).toBe("Maharashtra");
    expect(stateOtherNames(ts, "hi")).toBe("Telangana · తెలంగాణ");
    expect(stateOtherNames(ts, "te")).toBe("Telangana · तेलंगाना");
    expect(stateOtherNames(an, "hi")).toBe("Andaman and Nicobar Islands");
  });
});
