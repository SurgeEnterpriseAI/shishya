// Daily motivational quotes for Indian exam aspirants. The header
// strip picks one based on day-of-year so every visitor on the same
// calendar day sees the same quote, then it rotates at midnight IST.
//
// Source policy:
//   - An attributed quote carries a name only when the words are in a
//     documented source (the speaker's own book, speech or collected
//     works; the scripture's verse). No attribution by popular repute.
//   - Anonymous quotes are common-currency aspirant wisdom — the kind
//     a senior tells a junior the night before an exam. They carry no
//     name and no invented numbers.
//   - Mix of English, Hindi (Devanagari), and code-mixed Hinglish so
//     the strip occasionally surprises a Hindi-medium visitor with a
//     line in their language.
//
// 26 Sep 2026 (discoverability G2, trust): removed every attribution
// without a documented source — the Churchill line (the International
// Churchill Society lists it as falsely attributed), "It always seems
// impossible until it is done" (the Nelson Mandela Foundation has no
// record of it), the Og Mandino line credited to A. P. J. Abdul Kalam,
// and the other popular-repute credits (Kalam, Ziglar, Hayes, Collier,
// Eckhart, Rohn, Bruce Lee, Sophia Bush, Campbell, Notke). "Whatever happened, happened for the good" is
// not in the Bhagavad Gita and is gone; the real 2.47 (karmaṇy evā-
// dhikāras te) now carries the verse number. Removed the aspirant line
// that typed a number ("costs you 4 marks") nobody measured.
//
// Pick rule: dayOfYear % QUOTES.length — deterministic per calendar
// day. To replace today's quote: edit position (dayOfYear-1) in the
// list. To rotate the entire pool: append new quotes to the end; the
// position-rotation gives them a turn over the next 12 months.

export interface MotivationalQuote {
  text: string;
  /** Author or documented source, if known. Absent for proverbial / aspirant wisdom. */
  author?: string;
}

export const QUOTES: MotivationalQuote[] = [
  // ── Indian thought (documented sources) ─────────────────────────
  // Complete Works of Swami Vivekananda (Katha Upanishad 1.3.14; Raja Yoga).
  { text: "Arise, awake, and stop not till the goal is reached.", author: "Swami Vivekananda" },
  { text: "Take up one idea. Make that one idea your life — think of it, dream of it, live on that idea.", author: "Swami Vivekananda" },

  // ── Sanskrit / Hindi shloka spirit ───────────────────────────────
  { text: "उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः — Tasks are accomplished by effort, not by wishful thinking.", author: "Hitopadesha" },
  { text: "विद्या ददाति विनयं — Knowledge gives humility. From humility, worthiness; from worthiness, wealth; from wealth, dharma.", author: "Hitopadesha" },
  { text: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन — Your right is to action alone, never to the fruit.", author: "Bhagavad Gita 2.47" },
  { text: "Mehnat itni khaamoshi se karo ki safalta shor macha de.", author: "अनाम" },
  { text: "Padhai ek aisi cheez hai jo kisi ki nahi sunti — sirf jo ise time deta hai, usse mil jaati hai." },

  // ── Universal classics (documented sources) ─────────────────────
  // Stanford commencement address, 12 June 2005.
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },

  // ── Aspirant-specific (common-currency wisdom) ───────────────────
  { text: "Every PYQ you solve today is one less surprise on exam day." },
  { text: "The student who outlasts the syllabus, not the one who outsmarts it, gets the rank." },
  { text: "There is no such thing as a 'fresh start' on Monday. There is only the next hour." },
  { text: "Mocks don't measure how much you know. They measure how you behave under pressure. Use them for that." },
  { text: "Two students start with the same syllabus. The one who revises wins. Always." },
  { text: "The night before the exam, sleep. A rested mind recalls what a tired one has only read." },
  { text: "A topic you 'somewhat know' is a topic you don't know yet. Be honest about your weak areas." },
  { text: "Toppers are not smarter. They are more consistent. Show up every day, even when you don't feel like it." },
  { text: "If you can't explain a concept simply, you don't understand it well enough — yet." },
  { text: "Your mock score from today doesn't predict your rank. Your hours from today do." },

  // ── For tough days ──────────────────────────────────────────────
  // The title of his 1983 book.
  { text: "Tough times never last, but tough people do.", author: "Robert H. Schuller" },
  { text: "Fall seven times, stand up eight.", author: "Japanese proverb" },
  { text: "Even the longest syllabus has a last page." },
  { text: "Tomorrow's topper is just someone who didn't quit yesterday." },
  { text: "Begin again. It's the most powerful thing you can do." },
];

/**
 * Returns the quote for today (deterministic per IST calendar day so
 * every visitor sees the same quote within a day).
 */
export function getDailyQuote(now: Date = new Date()): MotivationalQuote {
  // Same IST-day arithmetic as src/lib/exam-phase.ts so calendar day
  // matches what the rest of the site considers "today".
  const IST_OFFSET_MS = 5.5 * 3600 * 1000;
  const dayIndex = Math.floor((now.getTime() + IST_OFFSET_MS) / 86_400_000);
  return QUOTES[((dayIndex % QUOTES.length) + QUOTES.length) % QUOTES.length];
}
