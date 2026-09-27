// A chat message in which the writer says they are under 13 (27 Sep 2026).
//
// Founder rule (content first, 27 Sep 2026): below 13, Shishya shows content
// only — no sign-up and no data taken. The tutor prompts already tell the
// model to stop kindly when someone says they are in Class 1-7 or younger than
// 13 (src/lib/ai/prompts.ts SAFETY_RULES, src/lib/school/tutor-persona.ts), but
// a model reply is still a model call, a stored guest turn and — in the chat
// UI — a "keep this conversation in an account" card. This check catches the
// plain first-person declarations BEFORE any of that, so /api/chat answers
// with a fixed line, stores nothing, and the chat closes without a sign-in ask
// (src/lib/chat-scope.ts, src/app/chat/ChatInterface.tsx).
//
// First person only: "I am 11", "I'm in class 6", "main 10 saal ka hoon",
// "मैं कक्षा 6 में हूँ", "నేను 6వ తరగతి". A parent or teacher writing about a
// child ("my son is in class 6", "teach class 6 fractions") is not matched —
// the model's own rule handles anything subtler.
//
// Pure: no DB, no network. Tests: tests/unit/under13.test.ts.

const DEVANAGARI_DIGITS = "०१२३४५६७८९";
const TELUGU_DIGITS = "౦౧౨౩౪౫౬౭౮౯";

function asciiDigits(s: string): string {
  return s.replace(/[०-९౦-౯]/g, (d) => {
    const i = DEVANAGARI_DIGITS.indexOf(d);
    return String(i >= 0 ? i : TELUGU_DIGITS.indexOf(d));
  });
}

function norm(s: string): string {
  return asciiDigits(String(s ?? ""))
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const AGE_MIN = 4;
const AGE_MAX = 12;
const CLASS_MAX = 7;

// English / Hinglish: "i am 11", "i'm 9 years old", "im 10 yrs", "my age is 12", "age 11"
const EN_AGE = /\b(?:i am|i'm|im|iam|i m|my age is|my age)\s+(?:only\s+|just\s+)?(\d{1,2})(?:\s*(?:years?|yrs?|yo|y\/o)(?:\s*old)?)?(?![\w%])(?!\s*(?:th|st|nd|rd|%|marks?|days?|hours?|hrs?|months?|mins?|minutes?|weeks?|questions?|chapters?|am|pm|lakh|rank|feet|ft|kg|cm|percent|out of)\b)/;
// "i am in class 6", "i'm class 5", "i study in 6th class", "i am a class 7 student", "my class is 6"
const EN_CLASS_A = /\b(?:i am|i'm|im|iam|i m|i study|i'm studying|i am studying|studying)\s+(?:in\s+|a\s+)?(?:class|std|standard|grade)\s*(\d{1,2})\b(?!\s*(?:th|st|nd|rd)?\s*(?:pass|passed|result))/;
const EN_CLASS_B = /\b(?:i am|i'm|im|iam|i m|i study|i'm studying|i am studying|studying)\s+(?:in\s+|a\s+)?(\d{1,2})(?:st|nd|rd|th)\s*(?:class|std|standard|grade)\b/;
const EN_CLASS_C = /\bmy class is\s*(\d{1,2})\b/;
// Hinglish: "main 10 saal ka hoon", "mai class 6 mein hoon", "main 6th class me padhta hoon"
const HINGLISH_AGE = /\b(?:main|mai|mein|mera umar|meri umar|meri age|meri umra)\s+(\d{1,2})\s*(?:saal|sal|years?|varsh)\b(?!\s*(?:se|say|sey)\b)/; // not "5 saal se taiyari" (for 5 years)
const HINGLISH_CLASS = /\b(?:main|mai)\s+(?:class|kaksha)\s*(\d{1,2})(?:st|nd|rd|th)?\s*(?:mein|me|mai|mei)\b|\b(?:main|mai)\s+(\d{1,2})(?:st|nd|rd|th)?\s*(?:class|kaksha)\s*(?:mein|me|mai|mei)\b/;
// Hindi: "मैं 11 साल का हूँ", "मेरी उम्र 10 साल", "मैं कक्षा 6 में हूँ", "मैं 6वीं कक्षा में"
const HI_AGE = /(?:मैं|मै|मेरी उम्र|मेरी आयु)\s*(\d{1,2})\s*(?:साल|वर्ष)(?!\s*(?:से|सें))/; // not "5 साल से" (for 5 years)
const HI_CLASS = /(?:मैं|मै)\s*(?:कक्षा|क्लास)\s*(\d{1,2})\s*(?:वीं|वी|ठी|री|थी)?\s*(?:में|मे)|(?:मैं|मै)\s*(\d{1,2})\s*(?:वीं|वी|ठी|री|थी)?\s*(?:कक्षा|क्लास)\s*(?:में|मे)/;
// Telugu: "నేను 11 ఏళ్ల", "నా వయసు 10", "నేను 6వ తరగతి"
const TE_AGE = /(?:నేను|నా వయసు|నా వయస్సు)\s*(\d{1,2})\s*(?:ఏళ్ల|ఏళ్ళ|సంవత్సరాల|సంవత్సరాలు|ఏళ్లు)?(?!\s*(?:నుంచి|నుండి|గా))/; // not "10 ఏళ్ల నుంచి" (for 10 years)
const TE_CLASS = /నేను\s*(\d{1,2})\s*(?:వ|వ\s)?\s*(?:తరగతి|క్లాస్)/;

function num(m: RegExpMatchArray | null): number | null {
  if (!m) return null;
  const g = m.slice(1).find((x) => x != null);
  const n = g == null ? NaN : Number(g);
  return Number.isFinite(n) ? n : null;
}

const isAge = (n: number | null) => n != null && n >= AGE_MIN && n <= AGE_MAX;
const isClass = (n: number | null) => n != null && n >= 1 && n <= CLASS_MAX;

/** True when the writer says, in the first person, that they are under 13 or in Class 1-7. */
export function declaresUnder13(message: string): boolean {
  const s = norm(message);
  if (!s) return false;
  if (isAge(num(s.match(EN_AGE))) || isAge(num(s.match(HINGLISH_AGE))) || isAge(num(s.match(HI_AGE)))) return true;
  // Telugu age needs the age word or the "my age" form — "నేను 10 ప్రశ్నలు" is not an age.
  const te = s.match(TE_AGE);
  if (te && isAge(num(te)) && /ఏళ్ల|ఏళ్ళ|సంవత్సరాల|సంవత్సరాలు|ఏళ్లు|వయసు|వయస్సు/.test(te[0])) return true;
  for (const re of [EN_CLASS_A, EN_CLASS_B, EN_CLASS_C, HINGLISH_CLASS, HI_CLASS, TE_CLASS]) {
    if (isClass(num(s.match(re)))) return true;
  }
  return false;
}

export type Under13Locale = "en" | "hi" | "te";

/** The fixed reply /api/chat sends instead of a lesson. */
export const UNDER13_REPLY: Record<Under13Locale, string> = {
  en: "Shishya's tutor is for students aged 13 and above. The class pages at https://shishya.in/schooling are free to read — go through them with a parent or teacher.",
  hi: "Shishya का ट्यूटर 13 साल और उससे बड़े विद्यार्थियों के लिए है। https://shishya.in/schooling पर कक्षा के पेज मुफ़्त हैं — इन्हें माता-पिता या शिक्षक के साथ पढ़िए।",
  te: "Shishya ట్యూటర్ 13 ఏళ్లు, ఆపై వయసు విద్యార్థుల కోసం. https://shishya.in/schooling లో తరగతి పేజీలు ఉచితం — వాటిని తల్లిదండ్రులు లేదా టీచర్‌తో కలిసి చదవండి.",
};

/** The line the chat shows in place of the composer after that reply. */
export const UNDER13_CLOSED: Record<Under13Locale, { line: string; link: string }> = {
  en: { line: "This chat is closed: Shishya's tutor is for students aged 13 and above.", link: "Read the class pages →" },
  hi: { line: "यह चैट बंद है: Shishya का ट्यूटर 13 साल और उससे बड़े विद्यार्थियों के लिए है।", link: "कक्षा के पेज पढ़िए →" },
  te: { line: "ఈ చాట్ మూసివేశాం: Shishya ట్యూటర్ 13 ఏళ్లు, ఆపై వయసు విద్యార్థుల కోసం.", link: "తరగతి పేజీలు చదవండి →" },
};

/** The reply's language: the message's own script, else the site UI language. */
export function under13Locale(message: string, uiLang: string): Under13Locale {
  if (/[ఀ-౿]/.test(message)) return "te";
  if (/[ऀ-ॿ]/.test(message)) return "hi";
  return uiLang === "hi" || uiLang === "te" ? uiLang : "en";
}
