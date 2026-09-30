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

/** The results page's "Explain my mistakes" seed — a mistake review
 *  (src/app/attempts/[id]/results/page.tsx). 30 Sep 2026: named so the chat
 *  can offer its next-mistake chips and the tutor's memory can fold these
 *  openers into one line (src/lib/recent-chats.ts, src/lib/tutor-memory.ts). */
export const MISTAKE_REVIEW_OPENER = /^I just took a (.{1,80}) mock and got (\d+) questions? wrong/u;

const TEMPLATES: readonly RegExp[] = [
  // results page, anonymous quiz, study-day links
  MISTAKE_REVIEW_OPENER,
  /^I just took a quick .{1,120} quiz for .{1,80} and scored \d+\/\d+/u,
  /^I just finished a .{1,80} mock and scored /u,
  /^On my last .{1,80} mock I got \d+\/\d+ on /u,
  /^On Q\d+ of my .{1,80} mock \(topic: /u,
  // topic pages, tutor chips, dashboards
  /^I'm studying .{1,160} for .{1,80}\. Be my tutor for this topic/u,
  /^I'm weak in .{1,160} for .{1,80}\. Tutor me on this topic/u,
  // 30 Sep 2026: the home page's weak-topic "Ask the tutor" seed
  // (src/components/home/HomeForYou.tsx) was missing from this list.
  /^.{1,160} is one of my weakest topics for .{1,80}\. Explain the key ideas and give me one practice question/u,
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
  // school chat (26-27 Sep 2026): chat.school.classStarter.1 in en / hi / te,
  // and the seeds of the chapter page and the school results page
  // (src/lib/school/student-classes.ts schoolTutorSeed,
  // src/lib/school/student-copy.ts schoolMistakesSeed / schoolQuestionSeed)
  /^Help me plan this week's study for .{1,60}\.$/u,
  /^.{1,60} के लिए इस हफ़्ते की पढ़ाई की योजना बनाने में मदद कीजिए।$/u,
  /^.{1,60} కోసం ఈ వారం చదువు ప్రణాళిక వేయడంలో సహాయం చేయండి\.$/u,
  /^Help me understand ".{1,200}" \(Class \d+ .{1,80}\) step by step\./u,
  /^I practised ".{1,200}" \(Class \d+\) and got \d+ questions? wrong/u,
  /^On question \d+ of my ".{1,200}" \(Class \d+\) practice /u,
];

// General-mode starters (src/lib/i18n.ts; Hindi and Telugu have their own, other languages fall back to English) and the school chat starters.
// The first eight are the pre-27 Sep 2026 general starters, kept so older
// logged turns still classify as ours.
const EXACT = new Set([
  "Which exam should I prepare for if I want a stable government job?",
  "How do I study consistently for 6 months without burning out?",
  "What's the difference between SSC CGL and a state-level PSC exam?",
  "I have 2 hours a day. How should I split it across mock tests, revision, and weak topics?",
  "अगर मुझे स्थायी सरकारी नौकरी चाहिए तो किस परीक्षा की तैयारी करूँ?",
  "6 महीने तक बिना थके लगातार कैसे पढ़ूँ?",
  "SSC CGL और राज्य-स्तर PSC परीक्षा में क्या फ़र्क़ है?",
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
  // chat.school.starter.1-4 and chat.school.classStarter.2-4 (en / hi / te)
  "Explain the main idea of this chapter in simple words.",
  "I'm stuck on a question from this chapter — give me a hint, not the answer.",
  "Ask me 3 quick questions to check I understood this chapter.",
  "What should I remember from this chapter for a class test?",
  "इस अध्याय का मुख्य विचार आसान शब्दों में समझाइए।",
  "इस अध्याय के एक सवाल में अटका हूँ — जवाब नहीं, एक संकेत दीजिए।",
  "यह अध्याय समझ आया या नहीं, यह जाँचने के लिए मुझसे 3 छोटे सवाल पूछिए।",
  "क्लास टेस्ट के लिए इस अध्याय से क्या याद रखना चाहिए?",
  "ఈ అధ్యాయం ముఖ్య ఆలోచనను సులభమైన మాటల్లో వివరించండి.",
  "ఈ అధ్యాయంలోని ఒక ప్రశ్న దగ్గర ఆగిపోయాను — సమాధానం కాదు, ఒక సూచన ఇవ్వండి.",
  "ఈ అధ్యాయం అర్థమైందో లేదో చూడటానికి నన్ను 3 చిన్న ప్రశ్నలు అడగండి.",
  "క్లాస్ టెస్ట్ కోసం ఈ అధ్యాయం నుంచి ఏమి గుర్తుంచుకోవాలి?",
  "I have a class test coming — how do I revise a chapter well?",
  "Explain a topic I'm finding hard — I'll tell you which.",
  "Ask me 3 quick questions on a chapter I've just read.",
  "क्लास टेस्ट आने वाला है — किसी अध्याय को अच्छे से कैसे दोहराऊँ?",
  "जो टॉपिक मुझे कठिन लग रहा है, उसे समझाइए — मैं बताता हूँ कौन-सा।",
  "अभी-अभी पढ़े अध्याय पर मुझसे 3 छोटे सवाल पूछिए।",
  "క్లాస్ టెస్ట్ రాబోతోంది — ఒక అధ్యాయాన్ని బాగా రివైజ్ ఎలా చేయాలి?",
  "నాకు కష్టంగా ఉన్న ఒక టాపిక్ వివరించండి — ఏదో నేను చెబుతాను.",
  "నేను ఇప్పుడే చదివిన అధ్యాయంపై నన్ను 3 చిన్న ప్రశ్నలు అడగండి.",
  // 30 Sep 2026: the mistake review's quick replies (src/lib/recent-chats.ts
  // REVIEW_CHIPS, en / hi / te) — our words, not the student's.
  "Next mistake",
  "Give me a similar question",
  "Explain it more simply",
  "अगली गलती",
  "ऐसा ही एक और सवाल दीजिए",
  "इसे और आसान तरीके से समझाइए",
  "తర్వాతి తప్పు",
  "ఇలాంటి ఇంకో ప్రశ్న ఇవ్వండి",
  "దీన్ని ఇంకా సులభంగా వివరించండి",
  // 30 Sep 2026: the practice follow-up of "Pick up where you left off"
  // (src/lib/pickup-followup.ts PRACTICE_FOLLOW_UP, en / hi / te) — our words.
  "Give me 3 practice questions on this",
  "इस पर मुझे 3 अभ्यास प्रश्न दीजिए",
  "దీనిపై నాకు 3 ప్రాక్టీస్ ప్రశ్నలు ఇవ్వండి",
]);

/** True when a tutor message is one of Shishya's own prefilled prompts. */
export function isOurTutorPrompt(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  if (!t) return false;
  return EXACT.has(t) || TEMPLATES.some((re) => re.test(t));
}
