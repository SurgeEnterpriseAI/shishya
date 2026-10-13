// Local-first tutor (13 Oct 2026): which turns the local model may answer,
// the bank grounding's search words, and the fact check on a local reply.
// Pure: no DB, no network.
// Run: npx vitest run tests/unit/tutor-router.test.ts

import { describe, expect, it } from "vitest";
import { factTokens, routeTutorTurn, unsupportedFacts } from "@/lib/ai/tutor-router";
import { unsupportedCounts } from "@/lib/ai/tutor-router";
import { contentTerms, groundingBlock, orTsQuery } from "@/lib/ai/grounding";

describe("routeTutorTurn", () => {
  it("sends the kinds the audit says the local model cannot match to Claude", () => {
    expect(routeTutorTurn("Mock test").route).toBe("claude"); // ≤ 3 words
    expect(routeTutorTurn("Yeh jo history mai click kiya yeh hindi kyu nahi aa raha hai").route).toBe("claude"); // Hinglish
    expect(routeTutorTurn("Find the next number: 3, 5, 9, 17, 33, ?").route).toBe("claude"); // series
    expect(routeTutorTurn("I scored 1/5 on the quiz, explain these questions:\nA) 12\nB) 14").route).toBe("claude"); // quiz review
  });
  it("marks fact-leaning turns 'fact' (grounded + checked before serving)", () => {
    for (const q of [
      "Which article of the constitution abolishes untouchability?",
      "What did the 104th amendment change?",
      "Who built the Thousand Pillar Temple in Warangal?",
      "Which scheme gives Telangana farmers money per acre?",
      "When was the Planning Commission established?",
    ]) expect(routeTutorTurn(q).route, q).toBe("fact");
  });
  it("leaves explanations, plans and methods 'general' (local, streamed)", () => {
    for (const q of [
      "How should I prepare for SSC CGL quant in 3 months?",
      "Explain how to solve percentage word problems step by step",
      "Make me a weekly study plan for banking reasoning",
    ]) expect(routeTutorTurn(q).route, q).toBe("general");
  });
});

describe("fact check", () => {
  it("finds amendment, article, schedule, year and money facts", () => {
    const keys = factTokens("The 104th Amendment (2020) ended Anglo-Indian seats; Article 334 and the 10th Schedule; the scheme gives ₹6 lakh.").map((f) => f.key);
    expect(keys).toEqual(expect.arrayContaining(["amendment 104", "article 334", "schedule 10", "year 2020", "money 6"]));
  });
  it("passes a reply whose facts are all in the context, and rejects invented ones", () => {
    const ctx = "Verified answer: B) Article 17. Solution: Article 17 abolishes untouchability (1950).";
    expect(unsupportedFacts("Article 17 abolishes untouchability; it came into force in 1950.", ctx)).toEqual([]);
    expect(unsupportedFacts("The 104th Amendment brought women's reservation.", ctx)).toEqual(["104th Amendment"]);
    expect(unsupportedFacts("See Article 21 too.", ctx)).toEqual(["Article 21"]);
  });
  it("reads ranges and lists of articles in the context", () => {
    expect(unsupportedFacts("Article 15 forbids discrimination.", "Articles 14, 15 and 16 deal with equality")).toEqual([]);
  });
  it("a reply with no specific facts passes", () => {
    expect(unsupportedFacts("Practise ten questions a day and revise your mistakes every Sunday.", "")).toEqual([]);
  });
});

describe("grounding search words", () => {
  it("keeps content words, drops stop words, at most 8", () => {
    expect(contentTerms("Which article of the Indian Constitution abolishes untouchability?")).toEqual(["article", "indian", "constitution", "abolishes", "untouchability"]);
    expect(contentTerms("What did the 104th amendment change")).toEqual(["104th", "amendment", "change"]);
    expect(contentTerms("a b c")).toEqual([]);
  });
  it("builds a safe OR query", () => {
    expect(orTsQuery(["article", "o'neil"])).toBe("'article' | 'oneil'");
  });
  it("the block tells the model to state only listed facts", () => {
    const b = groundingBlock({ items: [{ id: "q", question: "Which Article abolishes untouchability?", answer: "B) Article 17", solution: "Article 17.", rank: 1, shared: 2 }], terms: [], ms: 1 });
    expect(b).toContain("VERIFIED FACTS");
    expect(b).toContain("Verified answer: B) Article 17");
    expect(groundingBlock({ items: [], terms: [], ms: 0 })).toBe("");
  });
});

describe("links, topic codes and marking claims (router eval 13 Oct)", () => {
  const ctx = "Exam: SSC_CGL. Pages: /exams/{CODE}/quiz, /exams/{CODE}/pyq. Topics: `quant.percentage` quant.percentage";
  it("passes Shishya links and topic codes built from what the context holds", () => {
    expect(unsupportedFacts("Practise at https://shishya.in/exams/SSC_CGL/quiz and read `quant.percentage`.", ctx)).toEqual([]);
    expect(unsupportedFacts("See https://shishya.in/exams/SSC_CGL/topics/quant.percentage", ctx)).toEqual([]);
  });
  it("rejects invented pages and topic codes", () => {
    expect(unsupportedFacts("Go to https://shishya.in/exams/IOQM/topics/math.number_theory.modular", ctx).length).toBeGreaterThan(0);
    expect(unsupportedFacts("Revise `math.number_theory.modular` today.", ctx)).toEqual(["`math.number_theory.modular`"]);
  });
  it("rejects a marking claim the exam facts do not state, passes one they do", () => {
    expect(unsupportedFacts("Paper 1 has −1 mark for every wrong answer.", ctx).length).toBe(1);
    expect(unsupportedFacts("Paper 1 has −0.5 marks for every wrong answer.", "Marking: +2 per correct, negative marking −0.5 marks per wrong.")).toEqual([]);
  });
  it("Hinglish like 'trick bta do' goes to Claude", () => {
    expect(routeTutorTurn("Hindi m trick bta do pet ka kaise karna hai").route).toBe("claude");
  });

  it("sends a turn that asks for Hindi (or another Indian language) to Claude", () => {
    expect(routeTutorTurn("Hindi m trick bta do pet ka").route).toBe("claude");
    expect(routeTutorTurn("Can you explain the Preamble in Telugu please").route).toBe("claude");
    expect(routeTutorTurn("Explain the Hindi grammar topic sandhi with examples").route).not.toBe("claude");
  });

  it("keeps signed-in tool flows local: a weak-topic score and 'next mistake'", () => {
    expect(routeTutorTurn("On my last TNPSC Group IV mock I got 0/4 on Reading Comprehension. Help me fix it").route).not.toBe("claude");
    expect(routeTutorTurn("Next mistake").route).toBe("check");
    expect(routeTutorTurn("next").route).toBe("check");
    expect(routeTutorTurn("B, D, A").route).toBe("claude"); // grading a pick stays on Claude
    expect(routeTutorTurn("Ok").route).toBe("claude");
  });

  it("round 2: GK teaching goes to Claude; mistake reviews and practice are held and checked", () => {
    expect(routeTutorTurn("Go deeper on History of Maharashtra for MPSC Group C — examples and edge cases I should know").route).toBe("claude");
    expect(routeTutorTurn("On my last MPSC Group C mock I got 0/1 on Samyukta Maharashtra Movement. Help me improve on it").route).toBe("claude");
    expect(routeTutorTurn("I just took a TS Police PC mock and got 5 questions wrong — weakest: History of Telangana. Go through my mistakes").route).toBe("check");
    expect(routeTutorTurn("Quiz me on my weakest NSEA topic — start easy and get harder").route).toBe("check");
    expect(routeTutorTurn("Next mistake").route).toBe("check");
    expect(routeTutorTurn("Who founded the Kakatiya dynasty?").route).toBe("fact");
    expect(routeTutorTurn("Go deeper on Percentage for SSC CGL — examples and edge cases I should know").route).toBe("general");
  });

  it("flags a per-topic question / marks count the context does not hold", () => {
    expect(unsupportedCounts("In CAT, expect 2–4 questions from this area.", "QA is about 22 questions")).toHaveLength(1);
    expect(unsupportedCounts("Current affairs typically carries 10-15 marks.", "no split")).toHaveLength(1);
    expect(unsupportedCounts("Here are 3 questions on Tissues.", "no numbers")).toHaveLength(0);
    expect(unsupportedCounts("You got 5 questions wrong in this mock.", "wrong: 5")).toHaveLength(0);
    expect(unsupportedCounts("Expect 25 questions from this section.", "Section B: 25 questions")).toHaveLength(0);
    expect(unsupportedCounts("These tend to be quick 15–20 second questions.", "240 questions in 300 minutes")).toHaveLength(1);
  });

  it("treats ₹ as a fact in a fee/scholarship sentence, never in a worked sum", () => {
    expect(factTokens("The scholarship gives ₹50,000 per year.").map((f) => f.key)).toContain("money 50000");
    expect(factTokens("Application fee is ₹100 for general candidates.").map((f) => f.key)).toContain("money 100");
    expect(factTokens("CP = ₹800, so SP = ₹880 at a 10% profit.")).toHaveLength(0);
    expect(factTokens("A shopkeeper sells a watch for ₹4,000 at a discount of 20%. Find the marked price.")).toHaveLength(0);
  });
});
