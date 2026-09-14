import { describe, expect, it } from "vitest";
import { dict, type Locale, type StringKey } from "@/lib/i18n";
import { challengeCompareLine, challengeHeadline, challengeShareText } from "@/lib/challenge";
import {
  challengeAgo,
  challengeCompareText,
  challengeHeadlineText,
  challengeLabels,
  challengeShareMessage,
  quizDifficultyLabel,
  quizLabels,
} from "@/lib/challenge-copy";

/** The raw dictionary for a locale, falling back to English like tk(). */
const tr =
  (locale: Locale) =>
  (key: StringKey): string =>
    (dict as unknown as Record<string, Record<string, string>>)[locale]?.[key] ?? dict.en[key];

describe("challenge copy — English is byte-identical to the English-only builders", () => {
  const L = challengeLabels(tr("en"));

  it("compare lines, with and without a name", () => {
    for (const [mine, theirs] of [
      [8, 7],
      [7, 7],
      [5, 8],
    ] as const) {
      for (const name of ["Ravi", null]) {
        expect(challengeCompareText(L, { mine, theirs, total: 10, name })).toBe(challengeCompareLine({ mine, theirs, total: 10, name }));
      }
    }
  });

  it("landing headline", () => {
    for (const fromMock of [false, true]) {
      for (const name of ["Ravi", null]) {
        expect(challengeHeadlineText(L, { name, correct: 6, total: 10, exam: "SSC GD", fromMock })).toBe(
          `${challengeHeadline({ name, correct: 6, total: 10, examShort: "SSC GD", fromMock })} — can you beat it?`,
        );
      }
    }
  });

  it("share message", () => {
    const url = "https://shishya.in/c/Ab3dE5fG7h?utm_source=whatsapp";
    for (const fromMock of [false, true]) {
      expect(challengeShareMessage(L, { correct: 4, total: 5, exam: "CTET", fromMock, url })).toBe(
        challengeShareText({ correct: 4, total: 5, examShort: "CTET", fromMock, url }),
      );
    }
  });

  it("how long ago a score arrived", () => {
    const now = Date.parse("2026-09-14T12:00:00Z");
    expect(challengeAgo(L, "2026-09-14T11:59:40Z", now)).toBe("just now");
    expect(challengeAgo(L, "2026-09-14T11:48:00Z", now)).toBe("12 min ago");
    expect(challengeAgo(L, "2026-09-14T09:00:00Z", now)).toBe("3 h ago");
    expect(challengeAgo(L, "2026-09-13T12:00:00Z", now)).toBe("1 day ago");
    expect(challengeAgo(L, "2026-09-11T12:00:00Z", now)).toBe("3 days ago");
  });

  it("difficulty chip, falling back to the raw value", () => {
    const Q = quizLabels(tr("en"));
    expect(quizDifficultyLabel(Q, "MEDIUM")).toBe("Medium");
    expect(quizDifficultyLabel(Q, "EXPERT")).toBe("EXPERT");
  });
});

describe("challenge copy — Hindi and Telugu fill every placeholder", () => {
  const url = "https://shishya.in/c/Ab3dE5fG7h";
  for (const locale of ["hi", "te"] as const) {
    it(locale, () => {
      const L = challengeLabels(tr(locale));
      const lines = [
        challengeCompareText(L, { mine: 8, theirs: 7, total: 10, name: "Ravi" }),
        challengeCompareText(L, { mine: 7, theirs: 7, total: 10, name: null }),
        challengeCompareText(L, { mine: 5, theirs: 8, total: 10, name: null }),
        challengeHeadlineText(L, { name: "Ravi", correct: 6, total: 10, exam: "SSC GD", fromMock: false }),
        challengeHeadlineText(L, { name: null, correct: 6, total: 10, exam: "SSC GD", fromMock: true }),
        challengeShareMessage(L, { correct: 4, total: 5, exam: "CTET", fromMock: false, url }),
        challengeAgo(L, "2026-09-14T11:48:00Z", Date.parse("2026-09-14T12:00:00Z")),
      ];
      for (const line of lines) expect(line, `${locale}: ${line}`).not.toMatch(/\{\w+\}/);
      expect(lines[0]).toContain("Ravi");
      expect(lines[3]).toContain("6/10");
      expect(lines[5]).toContain(url);
      expect(lines[5]).not.toBe(challengeShareMessage(challengeLabels(tr("en")), { correct: 4, total: 5, exam: "CTET", fromMock: false, url }));
    });
  }
});
