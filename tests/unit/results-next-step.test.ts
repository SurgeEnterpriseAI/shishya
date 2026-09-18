// Pure unit tests for src/lib/results-next-step.ts and its copy module
// (18 Sep 2026) — what sits under the score on a results page: the setup card,
// the AI-tutor offer, and where the challenge / invite cards go on a student's
// first-ever attempt. Also the wizard's way back to the result.
// No DB. Run with: npx vitest run tests/unit/results-next-step.test.ts

import { describe, it, expect } from "vitest";

import {
  SETUP_CARD_MAX_ATTEMPTS,
  resultsNextStep,
  resultsReturnPath,
  setupHref,
} from "@/lib/results-next-step";
import { askTutorText, resultsNextStepCopy } from "@/lib/results-next-step-copy";
import { dict } from "@/lib/i18n";

const base = {
  setupDone: false as boolean | null,
  submittedAttempts: 1,
  earlierAttempts: 0 as number | null,
  wrongCount: 4,
  challengeFirst: true,
};

describe("resultsNextStep — first-ever attempt", () => {
  it("puts the tutor card before the challenge and invite cards", () => {
    const n = resultsNextStep(base);
    expect(n.firstEver).toBe(true);
    expect(n.tutor).toBe("mistakes");
    expect(n.challengeSlot).toBe("after-tutor");
    expect(n.inviteBelowTutor).toBe(true);
    expect(n.showSetupCard).toBe(true);
  });

  it("stays first-ever when the page is re-opened after more attempts", () => {
    // earlierAttempts counts attempts finished BEFORE this one, so it is
    // still 0 for the first result however many came after it.
    const n = resultsNextStep({ ...base, submittedAttempts: 7, earlierAttempts: 0 });
    expect(n.firstEver).toBe(true);
    expect(n.challengeSlot).toBe("after-tutor");
    expect(n.showSetupCard).toBe(false); // past the first 3 results
  });

  it("offers the ask-the-tutor line when nothing was wrong", () => {
    expect(resultsNextStep({ ...base, wrongCount: 0 }).tutor).toBe("ask");
  });

  it("has no leading challenge card to place when the page would not lead with one", () => {
    expect(resultsNextStep({ ...base, challengeFirst: false }).challengeSlot).toBe("none");
  });
});

describe("resultsNextStep — later attempts keep the 18 Sep order", () => {
  it("challenge card first, invite card left above the score", () => {
    const n = resultsNextStep({ ...base, submittedAttempts: 2, earlierAttempts: 1 });
    expect(n.firstEver).toBe(false);
    expect(n.challengeSlot).toBe("before-tutor");
    expect(n.inviteBelowTutor).toBe(false);
  });

  it("an unreadable account row changes nothing and shows no setup card", () => {
    const n = resultsNextStep({ ...base, setupDone: null, submittedAttempts: Number.NaN, earlierAttempts: null });
    expect(n.firstEver).toBe(false);
    expect(n.challengeSlot).toBe("before-tutor");
    expect(n.inviteBelowTutor).toBe(false);
    expect(n.showSetupCard).toBe(false);
  });
});

describe("resultsNextStep — setup card", () => {
  it("only while the wizard is not finished", () => {
    expect(resultsNextStep({ ...base, setupDone: true }).showSetupCard).toBe(false);
    expect(resultsNextStep({ ...base, setupDone: null }).showSetupCard).toBe(false);
  });

  it("only on the first few results", () => {
    expect(resultsNextStep({ ...base, submittedAttempts: SETUP_CARD_MAX_ATTEMPTS, earlierAttempts: 2 }).showSetupCard).toBe(true);
    expect(resultsNextStep({ ...base, submittedAttempts: SETUP_CARD_MAX_ATTEMPTS + 1, earlierAttempts: 3 }).showSetupCard).toBe(false);
  });

  it("does not depend on the score, the wrong count or the challenge rule", () => {
    expect(resultsNextStep({ ...base, wrongCount: 0, challengeFirst: false }).showSetupCard).toBe(true);
  });
});

describe("resultsReturnPath — the wizard's way back is built, never taken from the URL", () => {
  const ID = "cmfk3x9p20001l504abcd1234"; // cuid shape

  it("builds the results path for a plain attempt id", () => {
    expect(resultsReturnPath("results", ID)).toBe(`/attempts/${ID}/results`);
  });

  it("needs from=results", () => {
    expect(resultsReturnPath(undefined, ID)).toBeNull();
    expect(resultsReturnPath("dashboard", ID)).toBeNull();
    expect(resultsReturnPath(["results"], ID)).toBeNull();
  });

  it("refuses anything that is not a plain id", () => {
    for (const bad of [
      "",
      "abc", // too short
      "a".repeat(41),
      "//evil.example",
      "/attempts/x/results",
      "https://evil.example",
      "..%2F..%2Fadmin",
      "../admin",
      "abc123456/../../x",
      "abc12345?next=//evil.example",
      "abc12345#x",
      "abc12345\\evil",
      "abc 12345678",
      "abc12345\n",
      "javascript:alert(1)",
      ["cmfk3x9p20001l504abcd1234"],
      null,
      undefined,
      42,
    ]) {
      expect(resultsReturnPath("results", bad)).toBeNull();
    }
  });

  it("always returns a same-origin relative path", () => {
    const p = resultsReturnPath("results", ID)!;
    expect(p.startsWith("/")).toBe(true);
    expect(p.startsWith("//")).toBe(false);
    expect(p).not.toMatch(/[?#\\:@]/);
    expect(new URL(p, "https://shishya.in").origin).toBe("https://shishya.in");
  });
});

describe("setupHref", () => {
  it("round-trips through resultsReturnPath", () => {
    const id = "cmfk3x9p20001l504abcd1234";
    const u = new URL(setupHref(id), "https://shishya.in");
    expect(u.pathname).toBe("/onboarding");
    expect(resultsReturnPath(u.searchParams.get("from"), u.searchParams.get("attempt"))).toBe(`/attempts/${id}/results`);
  });

  it("drops an id it would not accept back", () => {
    expect(setupHref("../x")).toBe("/onboarding?from=results");
  });
});

describe("wizard step sub-lines — the room behind the setup card's door", () => {
  const SUBS = ["onb.step1.sub", "onb.step2.sub", "onb.step4.sub"] as const;

  it("exist in en, hi and te, each in its own script", () => {
    for (const k of SUBS) {
      expect(dict.en[k].trim().length).toBeGreaterThan(0);
      expect((dict.hi as Record<string, string>)[k]).toMatch(/[ऀ-ॿ]/);
      expect((dict.te as Record<string, string>)[k]).toMatch(/[ఀ-౿]/);
    }
  });

  it("promise nothing the code does not do (no state scholarships, no personalised dashboard)", () => {
    const all = SUBS.map((k) => dict.en[k]).join(" ");
    expect(all).not.toMatch(/scholarship|board exam|state-level|personalis|right kind of content/i);
    expect(all).not.toMatch(/\bseconds?\b|\bminutes?\b/i);
  });
});

describe("copy — en / hi / te, and only what is true", () => {
  const locales = ["en", "hi", "te"] as const;
  const keys = ["setupHeading", "setupBody", "setupButton", "setupNote", "setupSaved", "askText", "askLink"] as const;

  it("every key is present and non-empty in all three languages", () => {
    for (const l of locales) {
      const c = resultsNextStepCopy(l);
      for (const k of keys) expect(c[k].trim().length).toBeGreaterThan(0);
    }
  });

  it("Hindi and Telugu are really translated", () => {
    const hi = resultsNextStepCopy("hi"), te = resultsNextStepCopy("te"), en = resultsNextStepCopy("en");
    for (const k of keys) {
      expect(hi[k]).toMatch(/[ऀ-ॿ]/);
      expect(te[k]).toMatch(/[ఀ-౿]/);
      expect(hi[k]).not.toBe(en[k]);
      expect(te[k]).not.toBe(en[k]);
    }
  });

  it("an unknown locale reads English", () => {
    expect(resultsNextStepCopy("bn")).toEqual(resultsNextStepCopy("en"));
    expect(resultsNextStepCopy(null)).toEqual(resultsNextStepCopy("en"));
  });

  it("the tutor is called an AI tutor in every language", () => {
    for (const l of locales) expect(resultsNextStepCopy(l).askLink).toContain("AI");
  });

  it("fills the exam name and leaves no placeholder behind", () => {
    for (const l of locales) {
      const s = askTutorText(l, "SSC CGL");
      expect(s).toContain("SSC CGL");
      expect(s).not.toMatch(/[{}]/);
    }
  });

  it("makes no time claim, no urgency, no peer claim, and no promise the code does not keep", () => {
    const en = resultsNextStepCopy("en");
    const all = keys.map((k) => en[k]).join(" ");
    expect(all).not.toMatch(/\bseconds?\b|\bminutes?\b/i);
    expect(all).not.toMatch(/hurry|last chance|only \d|left today|expires|now or/i);
    expect(all).not.toMatch(/students like you|other students|most students|toppers|verified by|expert/i);
    // onbState has no reader yet and the personalised hub is not mounted:
    expect(all).not.toMatch(/state exams|your hub|personalis/i);
    // Settings re-runs the wizard and can ADD exams; nothing removes an
    // Enrollment, so the card must not say everything can be changed.
    expect(all).not.toMatch(/change any of it|change it anytime/i);
    expect(en.setupBody).toMatch(/add exams/i);
  });
});
