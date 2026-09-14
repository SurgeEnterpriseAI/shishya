import { describe, expect, it } from "vitest";
import { cardFirstName, printableRank, RESULT_CARD_MIN_COHORT, resultCardCopy, type ResultCardInput } from "@/lib/result-card";
import { formatDisplayScorePct } from "@/lib/scoring";

const base: ResultCardInput = {
  firstName: "Asha",
  examShort: "SSC CGL",
  paper: "shared",
  scoreRaw: 120,
  scoreMax: 200,
  scorePct: 60,
  correct: 64,
  total: 100,
  personalBest: false,
  rank: null,
};

describe("printableRank", () => {
  const r = { rank: 4, of: RESULT_CARD_MIN_COHORT, rankedAttemptId: "a1" };
  it("prints the rank of the ranked attempt in a big enough cohort", () => {
    expect(printableRank("shared", r, "a1")).toEqual(r);
    expect(printableRank("live", r, "a1")).toEqual(r);
  });
  it("never for a cohort under the minimum", () => {
    expect(printableRank("live", { ...r, of: RESULT_CARD_MIN_COHORT - 1, rank: 1 }, "a1")).toBeNull();
    expect(printableRank("live", { rank: 1, of: 2, rankedAttemptId: "a1" }, "a1")).toBeNull();
  });
  it("never on a later attempt of the same paper", () => {
    expect(printableRank("shared", r, "a2")).toBeNull();
  });
  it("never on a personal mock, and never an impossible rank", () => {
    expect(printableRank("personal", r, "a1")).toBeNull();
    expect(printableRank("shared", { ...r, rank: 0 }, "a1")).toBeNull();
    expect(printableRank("shared", { ...r, rank: r.of + 1 }, "a1")).toBeNull();
    expect(printableRank("shared", null, "a1")).toBeNull();
  });
});

describe("cardFirstName", () => {
  it("first Latin word only", () => {
    expect(cardFirstName("Asha Rani")).toBe("Asha");
    expect(cardFirstName("  D'Souza  ")).toBe("D'Souza");
  });
  it("no name when the card font could not draw it or it does not fit", () => {
    expect(cardFirstName("वेणु गोपाल")).toBeNull();
    expect(cardFirstName("వేణు")).toBeNull();
    expect(cardFirstName("Abcdefghijklmnopqrst")).toBeNull();
    expect(cardFirstName("")).toBeNull();
    expect(cardFirstName(null)).toBeNull();
  });
});

describe("resultCardCopy", () => {
  it("score uses the results page's display rule", () => {
    for (const p of [72.44, 0, -16.7, 100]) expect(resultCardCopy({ ...base, scorePct: p }).score).toBe(formatDisplayScorePct(p));
    expect(resultCardCopy({ ...base, scorePct: null }).score).toBe(formatDisplayScorePct(null));
  });
  it("marks and correct count", () => {
    expect(resultCardCopy(base).detail).toBe("120 / 200 marks · 64 of 100 correct");
    expect(resultCardCopy({ ...base, scoreRaw: 37.5, scoreMax: 50 }).detail).toBe("37.5 / 50 marks · 64 of 100 correct");
    expect(resultCardCopy({ ...base, scoreRaw: -5 }).detail).toBe("0 / 200 marks · 64 of 100 correct");
    expect(resultCardCopy({ ...base, scoreRaw: null }).detail).toBe("64 of 100 correct");
  });
  it("All-India only on the Sunday live test", () => {
    const rank = { rank: 12, of: 1340, rankedAttemptId: "a1" };
    const live = resultCardCopy({ ...base, paper: "live", rank });
    expect(live.kicker).toBe("SSC CGL · All-India Live Test");
    expect(live.rankLine).toBe("All-India Rank 12 of 1,340");
    const reh = resultCardCopy({ ...base, paper: "rehearsal", rank });
    expect(`${reh.kicker} ${reh.rankLine}`).not.toMatch(/All-India/);
    expect(reh.rankLine).toBe("Rank 12 of 1,340 who took this rehearsal");
    expect(resultCardCopy({ ...base, paper: "shared", rank }).rankLine).toBe("Rank 12 of 1,340 who took this mock");
    expect(resultCardCopy({ ...base, paper: "personal", rank }).rankLine).toBeNull();
    expect(resultCardCopy({ ...base, paper: "live" }).rankLine).toBeNull();
  });
  it("name, badge", () => {
    expect(resultCardCopy(base).headline).toBe("Asha scored");
    expect(resultCardCopy({ ...base, firstName: null }).headline).toBe("My score");
    expect(resultCardCopy(base).badge).toBeNull();
    expect(resultCardCopy({ ...base, personalBest: true }).badge).toBe("Personal best");
  });
});
