import { describe, expect, it } from "vitest";
import { declaresUnder13, under13Locale, UNDER13_REPLY } from "@/lib/under13";
import { chatScopeReply, CHAT_SCOPE_CODE } from "@/lib/chat-scope";

// 27 Sep 2026 — founder: below 13, content only and no data. A first-person
// "I am 11" / "I am in class 6" in the chat gets the fixed 13-and-above line
// before any model call or stored turn (src/lib/under13.ts, src/lib/chat-scope.ts).

describe("declaresUnder13", () => {
  it.each([
    "I am 11 and in class 6, teach me fractions",
    "i'm 9 years old",
    "im 10 yrs",
    "My age is 12",
    "I am in class 6",
    "i'm in std 5",
    "I study in 7th class",
    "I am a class 4 student",
    "my class is 3",
    "main 10 saal ka hoon",
    "mai class 6 mein hoon",
    "मैं 11 साल का हूँ",
    "मेरी उम्र 10 साल है",
    "मैं कक्षा 6 में पढ़ता हूँ",
    "मैं ६वीं कक्षा में हूँ",
    "నేను 11 ఏళ్ల అమ్మాయిని",
    "నా వయసు 10",
    "నేను 6వ తరగతి చదువుతున్నాను",
  ])("catches %s", (m) => {
    expect(declaresUnder13(m)).toBe(true);
  });

  it.each([
    "I am 13",
    "I am 18 years old",
    "I'm in class 8",
    "I am in class 12",
    "I am 12th pass, which exams can I write?",
    "I am 10th pass",
    "I am 10 days away from my exam",
    "I am 5 marks short of the cutoff",
    "teach class 6 fractions",
    "my son is in class 6, how can I help him?",
    "Explain Newton's three laws of motion with everyday examples.",
    "main 5 saal se taiyari kar raha hoon",
    "मैं 5 साल से तैयारी कर रहा हूँ",
    "నేను 10 ఏళ్ల నుంచి ప్రిపేర్ అవుతున్నాను",
    "నేను 10 ప్రశ్నలు అడుగుతాను",
    "I scored 11 in the mock",
    "",
  ])("leaves %s alone", (m) => {
    expect(declaresUnder13(m)).toBe(false);
  });
});

describe("chatScopeReply — under 13", () => {
  it("answers with the fixed line and the under-13 code", () => {
    const r = chatScopeReply("I am 11 and in class 6, teach me fractions", "en");
    expect(r).toEqual({ text: UNDER13_REPLY.en, code: CHAT_SCOPE_CODE.under13 });
    expect(r?.text).not.toMatch(/sign in|account/i);
  });

  it("replies in the message's own script", () => {
    expect(chatScopeReply("मैं 11 साल का हूँ", "en")?.text).toBe(UNDER13_REPLY.hi);
    expect(chatScopeReply("నేను 6వ తరగతి చదువుతున్నాను", "en")?.text).toBe(UNDER13_REPLY.te);
    expect(under13Locale("I am 9", "te")).toBe("te");
  });

  it("distress still comes first", () => {
    const r = chatScopeReply("I am 11 and I want to kill myself", "en");
    expect(r?.code).toBe(CHAT_SCOPE_CODE.distress);
  });

  it("an ordinary question still goes to the model", () => {
    expect(chatScopeReply("I am in class 9, explain photosynthesis", "en")).toBeNull();
  });
});
