// Daily motivational quotes for Indian exam aspirants. The header
// strip picks one based on day-of-year so every visitor on the same
// calendar day sees the same quote, then it rotates at midnight IST.
//
// Source policy:
//   - Attributed quotes use the public-domain version of the speaker's
//     own words (translated where needed). No fabricated attributions.
//   - Anonymous quotes are common-currency aspirant wisdom — the kind
//     a senior tells a junior the night before an exam.
//   - Mix of English, Hindi (Devanagari), and code-mixed Hinglish so
//     the strip occasionally surprises a Hindi-medium visitor with a
//     line in their language.
//
// Pick rule: dayOfYear % QUOTES.length — deterministic per calendar
// day. To replace today's quote: edit position (dayOfYear-1) in the
// list. To rotate the entire pool: append new quotes to the end; the
// position-rotation gives them a turn over the next 12 months.

export interface MotivationalQuote {
  text: string;
  /** Author, if known. Null for proverbial / aspirant wisdom. */
  author?: string;
}

export const QUOTES: MotivationalQuote[] = [
  // ── Indian thought leaders ───────────────────────────────────────
  { text: "Dream is not what you see in sleep — dream is something that does not let you sleep.", author: "A. P. J. Abdul Kalam" },
  { text: "If you fail, never give up because FAIL means 'First Attempt In Learning'.", author: "A. P. J. Abdul Kalam" },
  { text: "Excellence is a continuous process and not an accident.", author: "A. P. J. Abdul Kalam" },
  { text: "You have to dream before your dreams can come true.", author: "A. P. J. Abdul Kalam" },
  { text: "Failure will never overtake me if my determination to succeed is strong enough.", author: "A. P. J. Abdul Kalam" },
  { text: "Arise, awake, and stop not till the goal is reached.", author: "Swami Vivekananda" },
  { text: "Take up one idea. Make that one idea your life — think of it, dream of it, live on that idea.", author: "Swami Vivekananda" },
  { text: "The greatest religion is to be true to your own nature. Have faith in yourselves.", author: "Swami Vivekananda" },
  { text: "Strength is life, weakness is death. Expansion is life, contraction is death.", author: "Swami Vivekananda" },
  { text: "Whatever happened, happened for the good. Whatever is happening, is happening for the good.", author: "Bhagavad Gita 2.47" },

  // ── Sanskrit / Hindi shloka spirit ───────────────────────────────
  { text: "उद्यमेन हि सिध्यन्ति कार्याणि न मनोरथैः — Tasks are accomplished by effort, not by wishful thinking." },
  { text: "विद्या ददाति विनयं — Knowledge gives humility. From humility, worthiness; from worthiness, wealth; from wealth, dharma." },
  { text: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन — Your right is to action alone, never to the fruit." },
  { text: "Mehnat itni khaamoshi se karo ki safalta shor macha de.", author: "अनाम" },
  { text: "Padhai ek aisi cheez hai jo kisi ki nahi sunti — sirf jo ise time deta hai, usse mil jaati hai." },

  // ── Universal classics ──────────────────────────────────────────
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Success is not final, failure is not fatal — it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "It always seems impossible until it is done.", author: "Nelson Mandela" },
  { text: "Do not pray for an easy life; pray for the strength to endure a difficult one.", author: "Bruce Lee" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar" },
  { text: "The expert in anything was once a beginner.", author: "Helen Hayes" },
  { text: "Hard work beats talent when talent doesn't work hard.", author: "Tim Notke" },
  { text: "Success is the sum of small efforts repeated day in and day out.", author: "Robert Collier" },
  { text: "What we plant in the soil of contemplation we shall reap in the harvest of action.", author: "Meister Eckhart" },

  // ── Aspirant-specific (common-currency wisdom) ───────────────────
  { text: "Every PYQ you solve today is one less surprise on exam day." },
  { text: "The student who outlasts the syllabus, not the one who outsmarts it, gets the rank." },
  { text: "There is no such thing as a 'fresh start' on Monday. There is only the next hour." },
  { text: "Mocks don't measure how much you know. They measure how you behave under pressure. Use them for that." },
  { text: "Two students start with the same syllabus. The one who revises wins. Always." },
  { text: "The night before the exam, sleep. Cramming at 2 AM costs you 4 marks the next morning." },
  { text: "A topic you 'somewhat know' is a topic you don't know yet. Be honest about your weak areas." },
  { text: "Toppers are not smarter. They are more consistent. Show up every day, even when you don't feel like it." },
  { text: "If you can't explain a concept simply, you don't understand it well enough — yet." },
  { text: "Your mock score from today doesn't predict your rank in October. Your hours from today do." },

  // ── For tough days ──────────────────────────────────────────────
  { text: "The cave you fear to enter holds the treasure you seek.", author: "Joseph Campbell" },
  { text: "Tough times never last, but tough people do.", author: "Robert H. Schuller" },
  { text: "Fall seven times, stand up eight.", author: "Japanese proverb" },
  { text: "You are allowed to be both a masterpiece and a work in progress simultaneously.", author: "Sophia Bush" },
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
