// The tutor prompts Shishya itself writes (15 Sep 2026).
//
// Buttons across the site open the tutor with a prefilled message — "Go deeper
// on X for Y — examples and edge cases I should know.", "On Q4 of my NDA mock
// (topic: …)", the general starters, and so on. Those words are ours, not the
// student's, so demand mining (src/lib/demand-mine.ts) must not count them as
// requests. Until this list the miner knew 11 prefixes and missed 16 live
// templates: /admin/demand clusters such as "calculation speed tips" and
// "syllabus coverage guide" were built partly from our own buttons.
//
// Each pattern anchors on the template's fixed wording, so a student's own
// sentence that merely starts the same way ("I'm weak in maths, help") still
// counts. When a template changes, change it here too — the test lists one
// real instance of every template.

const TEMPLATES: readonly RegExp[] = [
  // results page, anonymous quiz, study-day links
  /^I just took a .{1,80} mock and got \d+ questions? wrong/u,
  /^I just took a quick .{1,120} quiz for .{1,80} and scored \d+\/\d+/u,
  /^I just finished a .{1,80} mock and scored /u,
  /^On my last .{1,80} mock I got \d+\/\d+ on /u,
  /^On Q\d+ of my .{1,80} mock \(topic: /u,
  // topic pages, tutor chips, dashboards
  /^I'm studying .{1,160} for .{1,80}\. Be my tutor for this topic/u,
  /^I'm weak in .{1,160} for .{1,80}\. Tutor me on this topic/u,
  /^Teach me .{1,160} for .{1,80} — /u,
  /^Tutor me on .{1,160} — that's my weakest area in /u,
  /^Go deeper on .{1,160} for .{1,80} — examples and edge cases I should know/u,
  /^Give me 3 fastest shortcuts to solve .{1,160} questions in the exam/u,
  /^What are the most common mistakes students make on .{1,160}\? How do I avoid them/u,
  /^What are the most common mistakes .{1,80} aspirants make\?/u,
  /^Walk me through these .{1,160} practice questions for .{1,80} one at a time/u,
  /^Walk me through the .{1,80} syllabus and which topics carry highest weight/u,
  /^Explain the concept I got wrong most in my last .{1,80} mock/u,
  /^Explain the .{1,80} exam pattern and which topics carry the most marks/u,
  /^Make me a (?:focused )?30-minute study plan for .{1,80} today/u,
  /^Give me a 30-minute plan to start preparing for .{1,80} today/u,
  /^Pick up where we left off on /u,
  /^Quiz me on /u,
  /^Quiz me with one .{1,80} question — start easy, then go harder/u,
  // exam hub, PYQ pages, exam week
  /^I'm preparing for .{1,80} \(.{1,200}\)\. There are no .{1,80} practice questions on Shishya yet/u,
  /^I'm solving PYQ-pattern questions modelled on the /u,
  /^I'm solving the .{1,80} \d{4} /u,
  /^My .{1,80} exam is in \S+ days\. What should I revise and what should I skip\?/u,
];

// General-mode starters (src/lib/i18n.ts; Hindi has its own, other languages
// fall back to the English ones).
const EXACT = new Set([
  "Which exam should I prepare for if I want a stable government job?",
  "How do I study consistently for 6 months without burning out?",
  "What's the difference between SSC CGL and a state-level PSC exam?",
  "I have 2 hours a day. How should I split it across mock tests, revision, and weak topics?",
  "अगर मुझे स्थायी सरकारी नौकरी चाहिए तो किस परीक्षा की तैयारी करूँ?",
  "6 महीने तक बिना थके लगातार कैसे पढ़ूँ?",
  "SSC CGL और राज्य-स्तर PSC परीक्षा में क्या फ़र्क़ है?",
  "रोज़ 2 घंटे हैं। मॉक टेस्ट, रिवीज़न और कमज़ोर विषयों में कैसे बाँटूँ?",
]);

/** True when a tutor message is one of Shishya's own prefilled prompts. */
export function isOurTutorPrompt(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  return EXACT.has(t) || TEMPLATES.some((re) => re.test(t));
}
