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
  // 27 Sep 2026: the whole-platform general starters (en / hi / te)
  "Explain Newton's three laws of motion with everyday examples.",
  "Which entrance exams can I take after Class 12 with PCM or PCB, and how are they different?",
  "How do scholarships for college work, and how do I find ones I qualify for?",
  "Which government jobs can I aim for after graduation, and how are their exams different?",
  "न्यूटन के गति के तीनों नियम रोज़मर्रा के उदाहरणों से समझाइए।",
  "12वीं के बाद PCM या PCB से कौन-सी प्रवेश परीक्षाएँ दी जा सकती हैं, और उनमें क्या फ़र्क़ है?",
  "कॉलेज के लिए छात्रवृत्ति कैसे मिलती है, और अपने लिए सही छात्रवृत्ति कैसे ढूँढूँ?",
  "ग्रेजुएशन के बाद किन सरकारी नौकरियों की तैयारी कर सकते हैं, और उनकी परीक्षाओं में क्या फ़र्क़ है?",
  "న్యూటన్ మూడు గమన నియమాలను రోజువారీ ఉదాహరణలతో వివరించండి.",
  "ఇంటర్ (MPC లేదా BiPC) తర్వాత ఏ ప్రవేశ పరీక్షలు రాయవచ్చు, వాటి మధ్య తేడా ఏమిటి?",
  "కాలేజీ చదువుకు స్కాలర్‌షిప్‌లు ఎలా వస్తాయి, నాకు అర్హత ఉన్నవాటిని ఎలా కనుక్కోవాలి?",
  "డిగ్రీ తర్వాత ఏ ప్రభుత్వ ఉద్యోగాలకు ప్రయత్నించవచ్చు, వాటి పరీక్షల మధ్య తేడా ఏమిటి?",
  // the school chat: starters, a filled class starter (en / hi / te) and the three seeds
  "I'm stuck on a question from this chapter — give me a hint, not the answer.",
  "ఈ అధ్యాయం ముఖ్య ఆలోచనను సులభమైన మాటల్లో వివరించండి.",
  "Help me plan this week's study for Class 9 · CBSE.",
  "कक्षा 9 · CBSE के लिए इस हफ़्ते की पढ़ाई की योजना बनाने में मदद कीजिए।",
  "9వ తరగతి · CBSE కోసం ఈ వారం చదువు ప్రణాళిక వేయడంలో సహాయం చేయండి.",
  'Help me understand "Matter in Our Surroundings" (Class 9 Science) step by step. Start with what the chapter is about in simple words, then ask me one question to check what I already know.',
  'I practised "Matter in Our Surroundings" (Class 9) and got 2 questions wrong — mostly on States of matter. Go through my mistakes one at a time: give me a hint first, then show the working step by step.',
  'On question 3 of my "Number Systems" (Class 9) practice I picked B but the answer was C. The question was: "Which of these is irrational?". Give me a hint first, then show the working step by step.',
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
