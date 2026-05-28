// Pool of synthetic student handles used for:
//   1. AI-seeded discussion thread authors (the right-rail sidebar
//      threads). Previously these all read "Shishya sample" which
//      visibly outed them as filler — now they wear varied Indian
//      student names + last-initial.
//   2. AI auto-reply authors when a real user posts in a discussion.
//
// Names are intentionally diverse across:
//   - region (north/south/east/west India + Hindi/Tamil/Telugu/Bengali roots)
//   - gender (mix of female + male first names)
//   - language script (we keep them in English transliteration since
//     the discussions UI doesn't yet preview per-locale fonts).
//
// Each entry is "First L." style — matches how Shishya's own real
// users render (we display first name + last initial for privacy via
// displayName() in src/app/exams/[code]/page.tsx).

export const SYNTHETIC_HANDLES: readonly string[] = [
  // North / Hindi belt
  "Aarav S.",
  "Ananya G.",
  "Vivaan K.",
  "Diya M.",
  "Ishaan T.",
  "Aditi R.",
  "Kabir J.",
  "Saanvi P.",
  "Rohan B.",
  "Tanvi V.",
  "Aryan D.",
  "Mehak C.",
  // South — Telugu / Tamil / Kannada / Malayalam
  "Sai Krishna R.",
  "Lakshmi N.",
  "Karthik S.",
  "Divya R.",
  "Praveen K.",
  "Sneha V.",
  "Arjun P.",
  "Harini M.",
  "Vignesh A.",
  "Pooja K.",
  "Anand B.",
  "Meera J.",
  // East — Bengali / Odia / Assamese
  "Ritwik B.",
  "Priyanka D.",
  "Soumya P.",
  "Sneha C.",
  "Arnab M.",
  "Anushka S.",
  // West — Marathi / Gujarati
  "Rohit P.",
  "Sneha K.",
  "Karan S.",
  "Riya M.",
  "Aditya J.",
  "Khushi P.",
  // Punjabi / Sikh
  "Harman S.",
  "Simran K.",
  "Manpreet S.",
  // Muslim names — represented in proportion
  "Faisal A.",
  "Zoya R.",
  "Imran K.",
  "Sana M.",
  // Generic / pan-India
  "Akash V.",
  "Neha S.",
  "Rahul M.",
  "Priya T.",
  "Vikram R.",
  "Shruti N.",
];

/** Pick a random handle. Optional `avoid` list keeps consecutive
 *  posts from collapsing to the same persona (e.g. don't AI-reply
 *  as the same name twice in a row in the same thread). */
export function pickSyntheticHandle(avoid: ReadonlyArray<string> = []): string {
  const pool = SYNTHETIC_HANDLES.filter((h) => !avoid.includes(h));
  const arr = pool.length > 0 ? pool : SYNTHETIC_HANDLES;
  return arr[Math.floor(Math.random() * arr.length)];
}
