import { describe, expect, it } from "vitest";
import { detectLanguageRequest } from "@/lib/preferred-lang";

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
