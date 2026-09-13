// Copy for the one-daily-loop surfaces (nav "Today", /today, the
// results-page streak block). The strings themselves live in
// src/lib/i18n.ts — en + hi + te, plus mr/ta/kn/gu/bn/ml/pa for the nav and
// results lines (13 Sep 2026 language-first pass). This module only
// assembles them.
//
// No runtime import of the dictionary here: HeaderAuthControls (a client
// island in the static Header on ~127 pages) imports NAV_TODAY from this
// file, so the dict must never ride in through it. Server components pass
// their own t() in; client components receive plain strings as props and
// fill placeholders with fillTemplate (dict-free).
//
// Honesty notes baked into the copy (every locale keeps them):
//   • The Daily-5 cron is scheduled at 03:20 UTC = 08:50 IST (vercel.json)
//     and Vercel crons can run late, so the mail line says "around 9 AM",
//     never "8:30". The 8:30 figure is only the student's own .ics
//     reminder, which they control.
//   • The cron skips anyone who already visited that morning, so the mail
//     line carries "unless you've already opened Shishya by then".
//   • "Tomorrow's 5 is on X" names the weakest topic RIGHT NOW; more study
//     today can change tomorrow's pick, and the line says so.
//   • No countdowns, no "others are ahead", no fake urgency.

import { fillTemplate, type Locale, type StringKey } from "@/lib/i18n";

export type Translate = (key: StringKey) => string;

/** English nav label. The Header is static (edge-cached, no locale on the
 *  server), so the "Today" pill stays English until HeaderAuthControls
 *  picks a locale on the client — the translated keys are nav.today and
 *  nav.today.title. tests/unit/i18n-keys.test.ts pins these to dict.en. */
export const NAV_TODAY = "Today";
export const NAV_TODAY_TITLE = "Today's 5 — 3 minutes on your weakest topic";

/** Dict-free copy of nav.today / nav.today.title for the static Header's
 *  client island, which can read the shishya-lang cookie but must not
 *  import the dictionary. Locales missing here fall back to English.
 *  Pinned byte-for-byte to dict by tests/unit/i18n-keys.test.ts. */
export const NAV_TODAY_BY_LOCALE: Readonly<Partial<Record<Locale, { label: string; title: string }>>> = {
  en: { label: NAV_TODAY, title: NAV_TODAY_TITLE },
  hi: { label: "आज", title: "आज के 5 — आपके सबसे कमज़ोर टॉपिक पर 3 मिनट" },
  te: { label: "ఈరోజు", title: "ఈరోజు 5 — మీ బలహీనమైన టాపిక్‌పై 3 నిమిషాలు" },
  mr: { label: "आज", title: "आजचे 5 — तुमच्या सर्वात कमकुवत topic वर 3 मिनिटे" },
  gu: { label: "આજે", title: "આજના 5 — તમારા સૌથી નબળા ટોપિક પર 3 મિનિટ" },
  ta: { label: "இன்று", title: "இன்றைய 5 — உங்கள் பலவீனமான topic-ல் 3 நிமிடங்கள்" },
  kn: { label: "ಇಂದು", title: "ಇಂದಿನ 5 — ನಿಮ್ಮ ದುರ್ಬಲ topic ಮೇಲೆ 3 ನಿಮಿಷ" },
  bn: { label: "আজ", title: "আজকের 5 — আপনার সবচেয়ে দুর্বল topic-এ 3 মিনিট" },
  ml: { label: "ഇന്ന്", title: "ഇന്നത്തെ 5 — നിങ്ങളുടെ ഏറ്റവും ദുർബലമായ topic-ൽ 3 മിനിറ്റ്" },
  pa: { label: "ਅੱਜ", title: "ਅੱਜ ਦੇ 5 — ਤੁਹਾਡੇ ਸਭ ਤੋਂ ਕਮਜ਼ੋਰ topic 'ਤੇ 3 ਮਿੰਟ" },
};

/** Every i18n key this module's surfaces use. */
export const STUDY_DAY_I18N_KEYS = [
  "nav.today",
  "nav.today.title",
  "today.title",
  "today.eyebrow",
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
] as const satisfies readonly StringKey[];

/** Plain strings for the /today client island (functions cannot cross the
 *  server → client boundary). subTopic / subBaseline are templates. */
export interface TodayLabels {
  eyebrow: string;
  building: string;
  /** "{topic} ({exam})" template. */
  subTopic: string;
  /** "{exam}" template. */
  subBaseline: string;
  failed: string;
  failedNetwork: string;
  goDashboard: string;
}

export function todayLabels(t: Translate): TodayLabels {
  return {
    eyebrow: t("today.eyebrow"),
    building: t("today.building"),
    subTopic: t("today.building.sub.topic"),
    subBaseline: t("today.building.sub.baseline"),
    failed: t("today.failed"),
    failedNetwork: t("today.failed.network"),
    goDashboard: t("today.goDashboard"),
  };
}

/** "5 questions on {topic} ({exam})…" or the baseline line when there is
 *  no weakest topic yet. */
export function todayBuildingSub(
  labels: Pick<TodayLabels, "subTopic" | "subBaseline">,
  examShort: string,
  topicName: string | null,
): string {
  return topicName
    ? fillTemplate(labels.subTopic, { topic: topicName, exam: examShort })
    : fillTemplate(labels.subBaseline, { exam: examShort });
}

/** The results-page streak + tomorrow block, in the page's locale. */
export function resultsStudyDayCopy(t: Translate) {
  return {
    streak: {
      kept: (n: number): string => fillTemplate(t("results.streak.kept"), { n }),
      milestone: (n: number): string => fillTemplate(t("results.streak.milestone"), { n }),
      started: t("results.streak.started"),
      atRisk: (n: number): string => fillTemplate(t("results.streak.atRisk"), { n }),
      none: t("results.streak.none"),
    },
    tomorrowTopic: (topicName: string): string => fillTemplate(t("results.tomorrow.topic"), { topic: topicName }),
    tomorrowBaseline: t("results.tomorrow.baseline"),
    /** Shown only when wouldGetDailyFiveMail() is true. */
    tomorrowMail: t("results.tomorrow.mail"),
    tomorrowSelf: t("results.tomorrow.self"),
    openToday: t("results.tomorrow.open"),
    ics: t("results.tomorrow.ics"),
  };
}
