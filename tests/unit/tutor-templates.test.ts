import { describe, expect, it } from "vitest";
import { isOurTutorPrompt } from "@/lib/tutor-templates";

// One real instance of every prefilled tutor prompt the site sends.
const OURS = [
  "I just took a SSC CGL mock and got 3 questions wrong. Go through my mistakes one by one.",
  "I just took a quick Percentage quiz for SSC CGL and scored 3/5. Give me the next things to study.",
  "I just finished a NDA mock and scored 62.5%.",
  "On my last KPSC KAS mock I got 3/10 on Rivers of Karnataka. Help me improve on this topic.",
  'On Q4 of my NDA mock (topic: Trigonometry), I picked B but the answer was C. The question was: "If cos A = 4/5" — walk me through it.',
  "I'm studying Number System for TS Police PC. Be my tutor for this topic.",
  "I'm weak in Syllogism for SBI Clerk. Tutor me on this topic.",
  "Teach me Simple Interest for SSC GD — concepts, formulas, examples.",
  "Tutor me on Tourism in MP — that's my weakest area in MPESB Group.",
  "Go deeper on Telangana History, Movement & Culture for TS Police SI — examples and edge cases I should know.",
  "Give me 3 fastest shortcuts to solve Festivals and Traditions questions in the exam.",
  "What are the most common mistakes students make on Satavahanas and Ikshvakus? How do I avoid them?",
  "What are the most common mistakes UKSSSC aspirants make?",
  "Walk me through these Time and Distance practice questions for MPESB Group one at a time — let me try first, then explain where I go wrong.",
  "Walk me through the UPSC Prelims syllabus and which topics carry highest weight.",
  "Explain the concept I got wrong most in my last NDA mock.",
  "Explain the concept I got wrong most in my last NSEJS mock",
  "Explain the CTET exam pattern and which topics carry the most marks.",
  "Make me a focused 30-minute study plan for SSC CGL today.",
  "Make me a 30-minute study plan for CDS today",
  "Give me a 30-minute plan to start preparing for IBPS PO today.",
  "Pick up where we left off on Indian Polity for UPSC Prelims.",
  "Quiz me on my weakest CTET topic — start easy and adapt.",
  "Quiz me with one SSC GD question — start easy, then go harder.",
  "I'm preparing for AP AMVI (AP Assistant Motor Vehicle Inspector). There are no AP AMVI practice questions on Shishya yet — ask me what I need.",
  "I'm solving PYQ-pattern questions modelled on the APPSC Group II 2025 paper. Explain the questions and concepts I'm stuck on, step by step.",
  "My SSC CGL exam is in 3 days. What should I revise and what should I skip?",
  "I have 2 hours a day. How should I split it across mock tests, revision, and weak topics?",
  "What's the difference between SSC CGL and a state-level PSC exam?",
  "रोज़ 2 घंटे हैं। मॉक टेस्ट, रिवीज़न और कमज़ोर विषयों में कैसे बाँटूँ?",
];

// Typed by students (from production, 1–14 Sep 2026) — these are demand signals.
const THEIRS = [
  "Explain my mistake",
  "Explain my wrong answer",
  "Give me a 25-question MCQ quiz on Heterodox Sects: Buddhism & Jainism philosophies",
  "I'm weak in maths, what should I do?",
  "Mujhe site par hi pyq chayiye woh batao kaise miklenge topic based",
  "I want to study from zero to 100 means I want detailed lectures of Astronomy from starting",
  "can you explain in marathi",
  "Why repeatedly questions asked ?? 😭",
  "I just took a break, can we continue?",
  "Marathi",
];

describe("isOurTutorPrompt", () => {
  it.each(OURS)("ours: %s", (text) => {
    expect(isOurTutorPrompt(text)).toBe(true);
  });
  it.each(THEIRS)("student's own: %s", (text) => {
    expect(isOurTutorPrompt(text)).toBe(false);
  });
  it("empty text is not a template", () => {
    expect(isOurTutorPrompt("")).toBe(false);
    expect(isOurTutorPrompt(null)).toBe(false);
  });
});
