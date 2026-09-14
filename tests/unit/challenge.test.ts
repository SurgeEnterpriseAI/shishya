import { describe, expect, it } from "vitest";
import {
  CHALLENGE_KEY_RE,
  CHALLENGE_PUSH_GAP_MS,
  CHALLENGE_TOKEN_RE,
  canNotifyAgain,
  challengeCompareLine,
  challengeExpiresAt,
  challengeHeadline,
  challengePlayEmail,
  challengePlayPushPayload,
  challengeShareText,
  gradeChoices,
  isChallengeExpired,
  mockSlice,
  newChallengeKey,
  newChallengeToken,
  randomChallengeString,
  sanitizeChallengeName,
} from "@/lib/challenge";

describe("challenge tokens and keys", () => {
  it("match their patterns and don't repeat", () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 300; i++) {
      const t = newChallengeToken();
      expect(t).toMatch(CHALLENGE_TOKEN_RE);
      expect(newChallengeKey()).toMatch(CHALLENGE_KEY_RE);
      tokens.add(t);
    }
    expect(tokens.size).toBe(300);
  });

  it("rejects bytes that would bias the alphabet", () => {
    const seq = [230, 0, 56, 57];
    let i = 0;
    const bytes = (n: number) => Uint8Array.from({ length: n }, () => seq[i++ % seq.length]);
    // 230 is rejected; 0 → "A"; 56 → "9"; 57 wraps to "A".
    expect(randomChallengeString(3, bytes)).toBe("A9A");
  });
});

describe("sanitizeChallengeName", () => {
  it("keeps names in any script and tidies spacing", () => {
    expect(sanitizeChallengeName("  Ravi   Kumar ")).toBe("Ravi Kumar");
    expect(sanitizeChallengeName("रवि")).toBe("रवि");
    expect(sanitizeChallengeName("O'Brien-Smith")).toBe("O'Brien-Smith");
  });

  it("drops digits, symbols and emoji, and caps the length", () => {
    expect(sanitizeChallengeName("Anu 😀 99")).toBe("Anu");
    expect(sanitizeChallengeName("A".repeat(40))).toBe("A".repeat(24));
  });

  it("returns null when no letter is left", () => {
    expect(sanitizeChallengeName("12345")).toBeNull();
    expect(sanitizeChallengeName("   ")).toBeNull();
    expect(sanitizeChallengeName(undefined)).toBeNull();
    expect(sanitizeChallengeName(42)).toBeNull();
  });
});

describe("gradeChoices", () => {
  it("counts matching keys; skips and missing choices are not correct", () => {
    expect(gradeChoices(["A", "B", "C"], ["A", null, "C"])).toBe(2);
    expect(gradeChoices(["A", "B", "C"], ["A"])).toBe(1);
    expect(gradeChoices(["A", "B"], ["A", "B", "C", "D"])).toBe(2);
    expect(gradeChoices(["A", "B"], ["a", "b"])).toBe(0);
  });
});

describe("mockSlice", () => {
  const range = (n: number) => Array.from({ length: n }, (_, i) => i);

  it("needs at least 5 eligible questions", () => {
    expect(mockSlice(range(4))).toBeNull();
  });

  it("uses every question when there are 10 or fewer", () => {
    expect(mockSlice(range(7))).toEqual(range(7));
    expect(mockSlice(range(10))).toEqual(range(10));
  });

  it("spreads 10 picks evenly across the mock, in order", () => {
    expect(mockSlice(range(100))).toEqual([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]);
    expect(mockSlice(range(19))).toEqual([0, 1, 3, 5, 7, 9, 11, 13, 15, 17]);
  });
});

describe("expiry and notification caps", () => {
  it("expires 30 days after creation", () => {
    const created = new Date("2026-09-14T00:00:00Z");
    const exp = challengeExpiresAt(created);
    expect(exp.toISOString()).toBe("2026-10-14T00:00:00.000Z");
    expect(isChallengeExpired(exp, new Date("2026-10-13T23:59:59Z"))).toBe(false);
    expect(isChallengeExpired(exp, new Date("2026-10-14T00:00:00Z"))).toBe(true);
  });

  it("allows a notification when none was sent or the gap has passed", () => {
    const now = new Date("2026-09-14T12:00:00Z");
    expect(canNotifyAgain(null, now, CHALLENGE_PUSH_GAP_MS)).toBe(true);
    expect(canNotifyAgain(new Date(now.getTime() - 5 * 60_000), now, CHALLENGE_PUSH_GAP_MS)).toBe(false);
    expect(canNotifyAgain(new Date(now.getTime() - 20 * 60_000), now, CHALLENGE_PUSH_GAP_MS)).toBe(true);
  });
});

describe("copy", () => {
  it("states the comparison plainly", () => {
    expect(challengeCompareLine({ mine: 8, theirs: 7, total: 10, name: "Ravi" })).toBe(
      "You're ahead of Ravi by 1 on the same 10 questions.",
    );
    expect(challengeCompareLine({ mine: 7, theirs: 7, total: 10, name: null })).toBe(
      "You and your friend tied on the same 10 questions.",
    );
    expect(challengeCompareLine({ mine: 5, theirs: 8, total: 10, name: null })).toBe(
      "Your friend is ahead by 3 on the same 10 questions.",
    );
  });

  it("says when the questions came from a mock", () => {
    expect(challengeHeadline({ name: null, correct: 6, total: 10, examShort: "SSC GD", fromMock: true })).toBe(
      "Your friend scored 6/10 on 10 questions from a SSC GD mock",
    );
    const text = challengeShareText({ correct: 4, total: 5, examShort: "CTET", fromMock: false, url: "https://shishya.in/c/Ab3dE5fG7h" });
    expect(text).toBe("I got 4/5 on these 5 CTET questions. Can you beat that? Same questions, free, no sign-in:\nhttps://shishya.in/c/Ab3dE5fG7h");
  });

  it("builds a same-origin phone notification", () => {
    const p = challengePlayPushPayload({ token: "Ab3dE5fG7h", examShort: "SSC GD", playerName: null, playerCorrect: 8, creatorCorrect: 7, total: 10 });
    expect(p.url.startsWith("/c/Ab3dE5fG7h")).toBe(true);
    expect(p.tag).toBe("challenge-Ab3dE5fG7h");
    expect(p.title).toBe("A friend played your SSC GD challenge");
    expect(p.body).toBe("A friend: 8/10 · you: 7/10. Tap to see every score.");
  });

  it("escapes typed names in the email and lists at most 10 plays", () => {
    const plays = [{ name: "O'Neil", correct: 9 }, ...Array.from({ length: 11 }, () => ({ name: null, correct: 5 }))];
    const mail = challengePlayEmail({ token: "Ab3dE5fG7h", examShort: "SSC GD", creatorCorrect: 7, total: 10, plays });
    expect(mail.subject).toBe("O'Neil took your SSC GD challenge: 9/10 (you: 7/10)");
    expect(mail.html).toContain("O&#39;Neil");
    expect(mail.html).not.toContain("O'Neil");
    expect(mail.text).toContain("12 friends have played");
    expect(mail.text).toContain("…and 2 more on the page.");
    expect(mail.html).toContain("https://shishya.in/c/Ab3dE5fG7h");
  });
});
