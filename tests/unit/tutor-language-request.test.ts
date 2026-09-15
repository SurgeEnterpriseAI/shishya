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
