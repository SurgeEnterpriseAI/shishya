// LEGACY pool of invented student handles — RETIRED FOR AUTHORSHIP.
//
// Until the 11 Sep 2026 audit these names were written as the authors of
// AI-seeded discussion threads and of AI auto-replies, so the rail read
// as real students chatting. That is synthetic social proof, which the
// founder rules forbid. Live code no longer signs anything with them:
// seed threads are authored "Shishya" (src/app/api/cron/refresh-
// discussions) and AI replies "Shishya AI" (src/lib/ai/discussion-reply).
//
// The list is kept for ONE reason: rows written before the audit still
// carry these names, and the thread page must recognise them so they
// render as "Shishya AI" instead of as a person. Do not add a new use.
// (The one-off scripts that used to pick these names —
// scripts/rename-seed-authors.ts and scripts/seed-discussion-replies.ts —
// and the pickSyntheticHandle helper were deleted in the same audit.)

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

/** True when a stored authorName is one of the retired invented handles. */
export function isSyntheticHandle(name: string | null | undefined): boolean {
  return !!name && SYNTHETIC_HANDLES.includes(name);
}
