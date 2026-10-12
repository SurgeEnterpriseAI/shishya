// A kids' exam NAMED in a guest's question (12 Oct 2026, src/lib/kids-tutor.ts
// kidsExamNamedIn): the general chat answered and logged "Quiz me on my
// weakest SOF NSO topic" at 12:22 IST. What counts as naming one, what never
// does (exams for older students, ordinary words), and the chat client's
// side: after the kids' line the chat offers no sign-up and keeps nothing.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { kidsExamNamedIn, kidsExamNamedInConversation } from "@/lib/kids-tutor";
import { under13ExamGuard } from "@/lib/signin-cta";

describe("kidsExamNamedIn — names one kids' exam", () => {
  const cases: Array<[string, string]> = [
    ["Quiz me on my weakest SOF NSO topic", "SOF_NSO"],
    ["sof imo class 5 sample paper", "SOF_IMO"],
    ["SOF_IEO level 2 cut off", "SOF_IEO"],
    ["What is SOF-IGKO?", "SOF_IGKO"],
    ["SOF ICO preparation", "SOF_ICO"],
    ["SOF IHO kya hai", "SOF_IHO"],
    ["Silverzone IOM syllabus for class 3", "SZF_IOM"],
    ["silver zone ios result", "SZF_IOS"],
    ["SZF IOEL practice", "SZF_IOEL"],
    ["National Science Olympiad tips", "SOF_NSO"],
    ["international english olympiad level 1", "SOF_IEO"],
    ["International Mathematics Olympiad for class 4", "SOF_IMO"],
    ["International General Knowledge Olympiad", "SOF_IGKO"],
    ["International Olympiad of Mathematics", "SZF_IOM"],
    ["International Olympiad of Science", "SZF_IOS"],
    ["International Olympiad of English Language", "SZF_IOEL"],
    ["nstse 2026 syllabus", "NSTSE"],
    ["National Level Science Talent Search Examination", "NSTSE"],
    ["Unified Council exam date", "NSTSE"],
    ["PRIL registration", "PRIL"],
    ["Panini Linguistics Olympiad", "PRIL"],
    ["ZIO 2026 problems", "ZIO"],
    ["Zonal Informatics Olympiad", "ZIO"],
    ["navodaya entrance exam class 6", "JNVST"],
    ["Navodaya admission form 2027", "JNVST"],
    ["JNVST result", "JNVST"],
    ["Explain NSO level 2", "SOF_NSO"],
    ["IEO grammar questions for class 4", "SOF_IEO"],
    ["IGKO current affairs", "SOF_IGKO"],
    // children type lower case and bare short names (review, 12 Oct 2026)
    ["nso class 2 syllabus", "SOF_NSO"],
    ["ieo level 2 questions", "SOF_IEO"],
    ["imo class 4 sample paper", "SOF_IMO"],
    ["Nso olympiad", "SOF_NSO"],
    ["jnv entrance class 6", "JNVST"],
    ["IOS olympiad class 2", "SZF_IOS"],
    ["iom olympiad for 3rd class", "SZF_IOM"],
  ];
  for (const [msg, code] of cases) {
    it(`"${msg}" → ${code}`, () => {
      expect(kidsExamNamedIn(msg)).toEqual({ code });
      expect(under13ExamGuard(code)).toBe(true);
    });
  }

  it("the hub's own seed words for every kids' exam are caught (its shortName)", () => {
    for (const [short, code] of [["SOF IMO", "SOF_IMO"], ["SOF NSO", "SOF_NSO"], ["SZF IOS", "SZF_IOS"], ["SZF IOM", "SZF_IOM"], ["NSTSE", "NSTSE"], ["PRIL", "PRIL"], ["ZIO", "ZIO"]]) {
      expect(kidsExamNamedIn(`Quiz me on my weakest ${short} topic`), short).toEqual({ code });
      expect(kidsExamNamedIn(`Give me 3 fastest shortcuts for ${short}`), short).toEqual({ code });
    }
  });

  it("SOF or Silverzone named alone → the family (no one exam)", () => {
    expect(kidsExamNamedIn("Is SOF olympiad worth it?")).toEqual({ family: "SOF olympiads" });
    expect(kidsExamNamedIn("Science Olympiad Foundation exams")).toEqual({ family: "SOF olympiads" });
    expect(kidsExamNamedIn("silverzone olympiad fees")).toEqual({ family: "Silverzone olympiads" });
    expect(kidsExamNamedIn("sof olympiad class 3")).toEqual({ family: "SOF olympiads" });
    expect(kidsExamNamedIn("science olympiad foundation exam")).toEqual({ family: "SOF olympiads" });
    expect(kidsExamNamedIn("NCO cyber olympiad class 4")).toEqual({ family: "SOF olympiads" });
  });
});

describe("kidsExamNamedIn — never fires on exams for older students or ordinary words", () => {
  const none = [
    "IMO 2026 preparation after IOQM", // the International Mathematical Olympiad (IOQM → INMO → IMO)
    "International Mathematical Olympiad shortlist",
    "IOQM previous papers",
    "NSEJS cut off",
    "NSEP and NSEC syllabus",
    "SSC CGL Tier 1",
    "What is photosynthesis?",
    "my sofa is broken, software engineering",
    "the pril and zio of it", // lower case is not a name
    "nso ieo in lower case", // a short name alone, no olympiad / class / level
    // review, 12 Oct 2026: adult government-exam questions
    "What did the NSO say about GDP growth in Q1?",
    "NSO PLFS unemployment rate current affairs",
    "NSO data on inflation for SSC CGL current affairs",
    "PLFS report is released by NSO or NSSO?",
    "Pegasus spyware was made by Israel's NSO Group",
    "Navodaya Vidyalaya Samiti TGT recruitment syllabus",
    "Navodaya teacher recruitment 2026",
    "Jawahar Navodaya Vidyalayas were set up under which policy?",
    "How do I qualify for the International Mathematics Olympiad after INMO?",
    "IMO olympiad preparation books",
    "Class 1 officer posts in UPSC",
    "Teach me fractions",
    "",
  ];
  for (const msg of none) {
    it(JSON.stringify(msg), () => expect(kidsExamNamedIn(msg)).toBeNull());
  }
  it("non-strings are null", () => {
    expect(kidsExamNamedIn(null)).toBeNull();
    expect(kidsExamNamedIn(undefined)).toBeNull();
  });
});

describe("kidsExamNamedInConversation — this message, then the earlier turns (review, 12 Oct 2026)", () => {
  it("a follow-up after the kids' line is caught through the line itself or the first question", () => {
    const h = [
      { role: "user", content: "Quiz me on my weakest SOF NSO topic" },
      { role: "assistant", content: "The AI tutor is not open to guests on SOF NSO, because children sit this exam." },
    ];
    expect(kidsExamNamedInConversation("ok, start with an easy one", h)).toEqual({ code: "SOF_NSO" });
    expect(kidsExamNamedInConversation("ok", [h[1]])).toEqual({ code: "SOF_NSO" });
    expect(kidsExamNamedInConversation("ok", [{ role: "assistant", content: "The AI tutor is not open to guests on SOF olympiads, because children sit this exam." }])).toEqual({ family: "SOF olympiads" });
  });
  it("an ordinary conversation is not", () => {
    expect(kidsExamNamedInConversation("and the next one?", [{ role: "user", content: "Teach me percentages" }, { role: "assistant", content: "Percent means per hundred." }])).toBeNull();
    expect(kidsExamNamedInConversation("hi", null)).toBeNull();
  });
});

describe("the chat client after the kids' line (src/app/chat/ChatInterface.tsx)", () => {
  const SRC = fs.readFileSync(path.resolve(__dirname, "../../src/app/chat/ChatInterface.tsx"), "utf8").replace(/\r\n/g, "\n");
  it("the done code sets kidsOff; kidsOff closes every offer and keeps nothing", () => {
    expect(SRC).toContain("if (parsed?.code === KIDS_GUEST_TUTOR_CODE) setKidsOff(true);");
    expect(SRC).toContain("under13Ref.current = under13 || kidsOff;");
    expect(SRC).toContain("under13: under13 || kidsOff,");
    expect(SRC).toContain("{guestBanner && guestSignInHref && !school && !under13 && !kidsOff && (");
    expect(SRC).toContain("if (under13 || kidsOff) dropKeptGuestChat();");
    expect(SRC).toContain("if (under13 || kidsOff) dropGuestUnanswered(localStore());");
    expect(SRC).toContain("if (under13 || kidsOff) dropGuestQuestionCarry();");
  });
});
