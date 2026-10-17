import { describe, expect, it } from "vitest";
import { bareLanguageRequest, detectLanguageRequest, tutorMessageFor } from "@/lib/preferred-lang";

describe("detectLanguageRequest — a language the student asks the tutor for", () => {
  it("bare names and short directives", () => {
    expect(detectLanguageRequest("Marathi")).toBe("mr");
    expect(detectLanguageRequest("marathi please")).toBe("mr");
    expect(detectLanguageRequest("in hindi")).toBe("hi");
    expect(detectLanguageRequest("Hindi me")).toBe("hi");
    expect(detectLanguageRequest("తెలుగులో")).toBe("te");
    expect(detectLanguageRequest("मराठीत")).toBe("mr");
    expect(detectLanguageRequest("English.")).toBe("en");
  });

  it("a reply verb aimed at a language", () => {
    expect(detectLanguageRequest("can you explain in marathi")).toBe("mr");
    expect(detectLanguageRequest("Please reply in Telugu from now on")).toBe("te");
    expect(detectLanguageRequest("switch to english")).toBe("en");
    expect(detectLanguageRequest("Explain this question in Tamil")).toBe("ta");
    expect(detectLanguageRequest("Explain Article 32 in Telugu, briefly")).toBe("te");
    expect(detectLanguageRequest("answer in hindi, please")).toBe("hi");
  });

  it("mixed-language asks", () => {
    expect(detectLanguageRequest("Hindi me btao")).toBe("hi");
    expect(detectLanguageRequest("telugu lo cheppandi")).toBe("te");
    expect(detectLanguageRequest("हिंदी में समझाओ")).toBe("hi");
    expect(detectLanguageRequest("in hindi and bhakti to koi ras hai hi nhi 10 ras me")).toBe("hi");
  });

  // 17 Oct 2026: "give me in maratgi" got "Reply language: EN" and a reply,
  // in Marathi, that the tutor could not answer in Marathi. Over the last 60
  // days of student messages (6,482) the change reads exactly two more asks:
  // that one and "Marathit".
  it("a language name one typo off (6+ letters, one language only)", () => {
    expect(detectLanguageRequest("give me in maratgi ")).toBe("mr");
    expect(detectLanguageRequest("Marathit")).toBe("mr");
    expect(detectLanguageRequest("explain in marahti")).toBe("mr");
    expect(detectLanguageRequest("telgu lo cheppandi")).toBe("te");
    expect(detectLanguageRequest("reply in gujrati")).toBe("gu");
    expect(detectLanguageRequest("answer in panjabi please")).toBe("pa");
    expect(detectLanguageRequest("in inglish")).toBe("en");
  });

  it("a place, a real word, a 5-letter name or a word near two languages is not read as a typo", () => {
    expect(detectLanguageRequest("Explain the role of the Peshwas in Maratha")).toBeNull();
    expect(detectLanguageRequest("explain partition in bengal")).toBeNull();
    expect(detectLanguageRequest("tell me about farmers in punjab")).toBeNull();
    expect(detectLanguageRequest("explain floods in gujarat")).toBeNull();
    expect(detectLanguageRequest("explain article 370 in kashmir")).toBeNull();
    expect(detectLanguageRequest("explain in hindu")).toBeNull();
    expect(detectLanguageRequest("explain in hindhi")).toBeNull();
    expect(bareLanguageRequest("Marathit")).toBe("mr");
    expect(tutorMessageFor("maratgi", true)).toBe("Please give your previous answer again, in full, in Marathi.");
  });

  it("a question about a language is not a request", () => {
    expect(detectLanguageRequest("Hindi sandhi ke bhed")).toBeNull();
    expect(detectLanguageRequest("Is Marathi compulsory for MPSC?")).toBeNull();
    expect(detectLanguageRequest("Explain Hindi grammar ras")).toBeNull();
    expect(detectLanguageRequest("What is Hindi Diwas?")).toBeNull();
    expect(detectLanguageRequest("Muje division ke short trick shikho")).toBeNull();
    expect(detectLanguageRequest("")).toBeNull();
    expect(detectLanguageRequest(null)).toBeNull();
  });
});

describe("bareLanguageRequest / tutorMessageFor — a bare language name after an answer", () => {
  it("only a whole-message language is bare", () => {
    expect(bareLanguageRequest("Marathi")).toBe("mr");
    expect(bareLanguageRequest("hindi me")).toBe("hi");
    expect(bareLanguageRequest("Explain Article 32 in Telugu")).toBeNull();
    expect(bareLanguageRequest("Hindi me btao")).toBeNull();
  });

  it("rewrites only when there is an answer to repeat", () => {
    expect(tutorMessageFor("Marathi", true)).toBe("Please give your previous answer again, in full, in Marathi.");
    expect(tutorMessageFor("Marathi", false)).toBe("Marathi");
    expect(tutorMessageFor("Explain Article 32 in Telugu", true)).toBe("Explain Article 32 in Telugu");
  });
});
