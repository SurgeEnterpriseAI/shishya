// English strings for the one-daily-loop surfaces (nav "Today", /today,
// the results-page streak block). Kept out of src/lib/i18n.ts on purpose
// for this build — the i18n owner adds the keys listed at the bottom and
// swaps these constants for tk()/t() calls.
//
// Honesty notes baked into the copy:
//   • The Daily-5 cron is scheduled at 03:20 UTC = 08:50 IST (vercel.json)
//     and Vercel crons can run late, so the mail line says "around 9 AM",
//     never "8:30". The 8:30 figure is only the student's own .ics
//     reminder, which they control.
//   • The cron skips anyone who already visited that morning, so the mail
//     line carries "unless you've already opened Shishya by then".
//   • "Tomorrow's 5 is on X" names the weakest topic RIGHT NOW; more study
//     today can change tomorrow's pick, and the line says so.
//   • No countdowns, no "others are ahead", no fake urgency.

export const NAV_TODAY = "Today";
export const NAV_TODAY_TITLE = "Today's 5 — 3 minutes on your weakest topic";

export const TODAY_PAGE_TITLE = "Today's 5 — Shishya";
export const TODAY_BUILDING = "Building today's 5…";
export const TODAY_BUILDING_SUB = (examShort: string, topicName: string | null): string =>
  topicName
    ? `5 questions on ${topicName} (${examShort}) — about 3 minutes.`
    : `A 5-question baseline set for ${examShort} — about 3 minutes.`;
export const TODAY_FAILED = "Couldn't build today's 5 — start it from your dashboard instead.";
export const TODAY_FAILED_NETWORK = "Network hiccup — reload to try again, or start from your dashboard.";
export const TODAY_GO_DASHBOARD = "Go to your dashboard →";

export const RESULTS_STREAK = {
  kept: (n: number): string => `🔥 ${n}-day streak — today counts.`,
  milestone: (n: number): string => `🎉 ${n}-day streak — milestone reached today.`,
  started: "Day 1 of your streak — today counts.",
  atRisk: (n: number): string => `🔥 ${n}-day streak — nothing yet today. Today's 5 keeps it.`,
  none: "Start your streak — today's 5 is one tap away.",
} as const;

export const RESULTS_TOMORROW_TOPIC = (topicName: string): string =>
  `Tomorrow's 5 is on ${topicName} — your weakest topic right now.`;
export const RESULTS_TOMORROW_BASELINE = "Tomorrow's 5 is a 5-question baseline set.";
/** Shown only when wouldGetDailyFiveMail() is true. */
export const RESULTS_TOMORROW_MAIL =
  "Open shishya.in/today any time — we'll also email you around 9 AM, unless you've already opened Shishya by then.";
export const RESULTS_TOMORROW_SELF = "Ready any time at shishya.in/today.";
export const RESULTS_OPEN_TODAY = "Open today's 5 →";
export const RESULTS_ICS = "Add an 8:30 AM reminder (.ics)";

/** Keys for src/lib/i18n.ts (outside this build's partition). */
export const I18N_KEYS_TO_ADD = [
  "nav.today",
  "nav.today.title",
  "today.title",
  "today.building",
  "today.building.sub.topic",
  "today.building.sub.baseline",
  "today.failed",
  "today.failed.network",
  "today.goDashboard",
  "results.streak.kept",
  "results.streak.milestone",
  "results.streak.started",
  "results.streak.atRisk",
  "results.streak.none",
  "results.tomorrow.topic",
  "results.tomorrow.baseline",
  "results.tomorrow.mail",
  "results.tomorrow.self",
  "results.tomorrow.open",
  "results.tomorrow.ics",
] as const;
