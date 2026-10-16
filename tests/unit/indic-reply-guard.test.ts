// Run: npx vitest run tests/unit/indic-reply-guard.test.ts
import { describe, expect, it } from "vitest";
import { devanagariLetterShare, hasRepeatedParagraph, indicReplyProblem } from "@/lib/ai/indic-reply-guard";

const hindi = "प्रतिशत का मतलब है सौ में से हिस्सा। उदाहरण: 200 का 25% = 50। अब एक सवाल हल करते हैं।";

describe("indicReplyProblem", () => {
  it("a plain Hindi explanation passes", () => {
    expect(indicReplyProblem(hindi, "")).toBeNull();
  });
  it("rejects foreign letters (the 16 Oct Tamil reply had Korean in it)", () => {
    expect(indicReplyProblem(hindi + " 이는", "")).toBe("foreign script in the reply");
    expect(indicReplyProblem(hindi + " தமிழ்", "")).toBe("foreign script in the reply");
  });
  it("rejects a reply mostly in English", () => {
    expect(indicReplyProblem("Percentage means per hundred. Example: 25% of 200 = 50. " + "थोड़ा", "")).toBe("not written in Devanagari");
  });
  it("rejects question options when no tool returned a question", () => {
    const quiz = `${hindi}\nप्रश्न 1: भारत की राजधानी?\nA) दिल्ली\nB) मुंबई\nC) कोलकाता\nD) चेन्नई`;
    expect(indicReplyProblem(quiz, '{"attempts":[]}')).toBe("shows question options no tool returned");
    expect(indicReplyProblem(quiz, '[{"id":"q1","options":[{"key":"A"}]}]')).toBeNull();
  });
  it("rejects the same paragraph printed twice", () => {
    const p = "यह एक लंबा पैराग्राफ है जिसमें प्रतिशत के नियम समझाए गए हैं ताकि छात्र परीक्षा में जल्दी हल कर सके।";
    expect(hasRepeatedParagraph(`${p}\n\n${p}`)).toBe(true);
    expect(indicReplyProblem(`${p}\n\n${p}`, "")).toBe("a paragraph printed twice");
  });
  it("devanagariLetterShare counts letters only", () => {
    expect(devanagariLetterShare("123 + 456 = 579")).toBe(0);
    expect(devanagariLetterShare("हिंदी")).toBeGreaterThan(0.9);
  });
});
