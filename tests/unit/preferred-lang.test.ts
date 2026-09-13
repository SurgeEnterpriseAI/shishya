// Pure unit tests for the student's-language helpers (src/lib/preferred-lang.ts).
// No DB. No network. Run with: npx vitest run tests/unit/preferred-lang.test.ts
//
// Why these exist (audit 11 Sep 2026): all 1,565 users sat on the default
// preferredLang=EN because nothing wrote the column, so a stored EN cannot
// mean "chose English". The resolution order below is the one rule every
// caller (onboarding, /mocks/[id], /api/chat, the anonymous quiz) follows;
// a wrong suggestion sends a Maharashtra aspirant Hindi papers, a wrong
// order overrides a student who explicitly chose English.

import { describe, it, expect } from "vitest";
import {
  LANGUAGE_CODES,
  isLanguageCode,
  langToReplyLanguage,
  languageToLocale,
  localeToLanguage,
  looksNativelyIn,
  resolvePreferredLocale,
  suggestLangForState,
} from "@/lib/preferred-lang";
import { STATES } from "@/lib/state-info";

describe("suggestLangForState — state → medium", () => {
  it("Hindi belt → HI", () => {
    for (const s of ["UP", "BR", "MP", "RJ", "DL", "HR", "HP", "UK", "JH", "CG", "JK"]) {
      expect(suggestLangForState(s)).toBe("HI");
    }
  });
  it("Maharashtra → MR (the #2 state; MPSC Group C is the #1 enrolled exam)", () => {
    expect(suggestLangForState("MH")).toBe("MR");
  });
  it("AP / TS → TE, TN / PY → TA, KA → KN, GJ / DN → GU, KL / LD → ML, PB / CH → PA, WB / AS / TR → BN", () => {
    expect(suggestLangForState("AP")).toBe("TE");
    expect(suggestLangForState("TS")).toBe("TE");
    expect(suggestLangForState("TN")).toBe("TA");
    expect(suggestLangForState("PY")).toBe("TA");
    expect(suggestLangForState("KA")).toBe("KN");
    expect(suggestLangForState("GJ")).toBe("GU");
    expect(suggestLangForState("DN")).toBe("GU");
    expect(suggestLangForState("KL")).toBe("ML");
    expect(suggestLangForState("LD")).toBe("ML");
    expect(suggestLangForState("PB")).toBe("PA");
    expect(suggestLangForState("CH")).toBe("PA");
    expect(suggestLangForState("WB")).toBe("BN");
    expect(suggestLangForState("AS")).toBe("BN");
    expect(suggestLangForState("TR")).toBe("BN");
  });
  it("Odisha → EN (Odia has no Language enum value yet — do NOT 'fix' this into HI)", () => {
    expect(suggestLangForState("OD")).toBe("EN");
  });
  it("English-first states, unknown, empty and null → EN", () => {
    for (const s of ["GA", "AR", "MZ", "NL", "ML", "MN", "SK", "AN", "LA"]) {
      expect(suggestLangForState(s)).toBe("EN");
    }
    expect(suggestLangForState("XX")).toBe("EN");
    expect(suggestLangForState("")).toBe("EN");
    expect(suggestLangForState(null)).toBe("EN");
    expect(suggestLangForState(undefined)).toBe("EN");
  });
  it("every state in STATES yields a value the Language enum can store", () => {
    for (const code of Object.keys(STATES)) {
      expect(LANGUAGE_CODES).toContain(suggestLangForState(code));
    }
  });
});

describe("resolvePreferredLocale — explicit > preferredLang (non-EN) > cookie > en", () => {
  it("an explicit choice beats everything", () => {
    expect(resolvePreferredLocale({ explicit: "te", preferredLang: "HI", cookie: "hi" })).toBe("te");
    expect(resolvePreferredLocale({ explicit: "en", preferredLang: "HI", cookie: "hi" })).toBe("en");
  });
  it("explicit garbage is ignored, not trusted", () => {
    expect(resolvePreferredLocale({ explicit: "xx", preferredLang: "HI", cookie: "te" })).toBe("hi");
    expect(resolvePreferredLocale({ explicit: "", cookie: "te" })).toBe("te");
  });
  it("a stored non-EN preferredLang beats the cookie", () => {
    expect(resolvePreferredLocale({ preferredLang: "HI", cookie: "te" })).toBe("hi");
    expect(resolvePreferredLocale({ preferredLang: "MR" })).toBe("mr");
  });
  it("the default EN is read as UNSET — it must NOT beat a cookie (documented rule)", () => {
    expect(resolvePreferredLocale({ preferredLang: "EN", cookie: "hi" })).toBe("hi");
    expect(resolvePreferredLocale({ preferredLang: "EN" })).toBe("en");
  });
  it("cookie only — any of the 19 locales, including ones outside the enum", () => {
    expect(resolvePreferredLocale({ cookie: "kok" })).toBe("kok");
    expect(resolvePreferredLocale({ cookie: "hi" })).toBe("hi");
  });
  it("nothing or garbage → en", () => {
    expect(resolvePreferredLocale({})).toBe("en");
    expect(resolvePreferredLocale({ cookie: "zz", preferredLang: "ZZ", explicit: null })).toBe("en");
  });
});

describe("locale ↔ enum mapping", () => {
  it("localeToLanguage", () => {
    expect(localeToLanguage("hi")).toBe("HI");
    expect(localeToLanguage("HI")).toBe("HI");
    expect(localeToLanguage(" mr ")).toBe("MR");
    expect(localeToLanguage("kok")).toBeNull();
    expect(localeToLanguage("ur")).toBeNull();
    expect(localeToLanguage("")).toBeNull();
    expect(localeToLanguage(null)).toBeNull();
  });
  it("languageToLocale", () => {
    expect(languageToLocale("MR")).toBe("mr");
    expect(languageToLocale("en")).toBe("en");
    expect(languageToLocale("XX")).toBeNull();
    expect(languageToLocale(undefined)).toBeNull();
  });
  it("isLanguageCode", () => {
    expect(isLanguageCode("TE")).toBe(true);
    expect(isLanguageCode("te")).toBe(false);
    expect(isLanguageCode(42)).toBe(false);
  });
  it("langToReplyLanguage — enum code when mappable, else the locale itself", () => {
    expect(langToReplyLanguage("hi")).toBe("HI");
    expect(langToReplyLanguage("en")).toBe("EN");
    expect(langToReplyLanguage("kok")).toBe("kok");
  });
});

describe("looksNativelyIn — never double-translate a paper authored in the medium", () => {
  it("a Devanagari question is native Hindi even with a Latin acronym", () => {
    expect(looksNativelyIn("भारत का GDP किस वर्ष सबसे अधिक था?", "hi")).toBe(true);
  });
  it("an English question with one Hindi word is NOT native Hindi", () => {
    expect(looksNativelyIn("What does the word 'धर्म' mean in the Gita?", "hi")).toBe(false);
  });
  it("plain English is not native in any script; en is never native", () => {
    expect(looksNativelyIn("Which article of the Constitution abolishes untouchability?", "te")).toBe(false);
    expect(looksNativelyIn("भारत", "en")).toBe(false);
    expect(looksNativelyIn("", "hi")).toBe(false);
  });
  it("Telugu script is native for te, not for hi", () => {
    expect(looksNativelyIn("భారత రాజ్యాంగం ఏ సంవత్సరంలో అమలులోకి వచ్చింది?", "te")).toBe(true);
    expect(looksNativelyIn("భారత రాజ్యాంగం ఏ సంవత్సరంలో అమలులోకి వచ్చింది?", "hi")).toBe(false);
  });
});
