// "Next on Shishya" — the next steps a landing page offers right under its
// answer (27 Sep 2026).
//
// Why: a 14-day read of anonymous landings (13–26 Sep 2026, 1,902 landings,
// scripts/tmp-landing-funnel.ts) — exam hubs, whose practice and sign-up box
// sit within the first screen or two, turned 21% of landers into accounts;
// the pages people land on from Bing and other search with ONE question
// (exam updates, cutoffs, current-affairs capsules, scholarships, careers)
// turned 0–2%, with 71–93% leaving after that one page. Those pages answered
// and then offered nothing until far down (updates: first practice link 4.5
// phone screens down; the September capsule is 61 screens long with no
// practice link at all; scholarship pages had no next step). This block puts
// the hub's next steps under the answer, as real links (crawlable), with the
// free sign-up offer for guests (src/components/SignupInline.tsx).
//
// Only links to pages that exist: the exam hub, updates and the AI tutor
// always exist for a live exam; the 5-question quiz only when the exam has
// practice (examPracticeState). Pure: copy + builders.

export type ActionLocale = "en" | "hi" | "te";
export interface LandingAction {
  href: string;
  label: string;
  primary?: boolean;
}

const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w+)\}/g, (m, k) => v[k] ?? m);
const loc = (l: string | null | undefined): ActionLocale => (l === "hi" || l === "te" ? l : "en");

const T = {
  en: {
    heading: "Next on Shishya",
    quiz: "Try 5 free {exam} questions — no sign-in →",
    hub: "Free {exam} mock tests, previous-year-pattern papers and syllabus →",
    hubNoPractice: "Everything on {exam}: syllabus, dates and the exam pattern →",
    updates: "{exam} dates, admit card and results →",
    tutorExam: "Ask the AI tutor anything about {exam} →",
    caQuiz: "Quiz me on {month} current affairs (AI tutor) →",
    caExams: "Government exams — dates, syllabus and free mocks →",
    caCalendar: "Exam calendar: every announced exam date →",
    caLive: "Free All-India live tests with your rank →",
    schMatch: "Find the scholarships you are eligible for →",
    schClosing: "Scholarships closing soon →",
    schTutor: "Ask the AI tutor about {name} →",
    colleges: "Colleges with NIRF ranks →",
    entrance: "Entrance exams after Class 12 →",
    careerTutor: "Ask the AI tutor how to become {a} {name} →",
    scholarships: "Scholarships you can apply for →",
  },
  hi: {
    heading: "Shishya पर आगे",
    quiz: "{exam} के 5 मुफ़्त प्रश्न हल करें — बिना साइन-इन →",
    hub: "{exam} के मुफ़्त मॉक टेस्ट, पिछले वर्षों के पैटर्न वाले पेपर और सिलेबस →",
    hubNoPractice: "{exam} के बारे में सब: सिलेबस, तारीखें और परीक्षा पैटर्न →",
    updates: "{exam} की तारीखें, एडमिट कार्ड और परिणाम →",
    tutorExam: "{exam} के बारे में AI ट्यूटर से कुछ भी पूछें →",
    caQuiz: "{month} के करंट अफ़ेयर्स पर मेरा क्विज़ लें (AI ट्यूटर) →",
    caExams: "सरकारी परीक्षाएँ — तारीखें, सिलेबस और मुफ़्त मॉक →",
    caCalendar: "परीक्षा कैलेंडर: हर घोषित परीक्षा तिथि →",
    caLive: "मुफ़्त अखिल भारतीय लाइव टेस्ट, आपकी रैंक के साथ →",
    schMatch: "जिन छात्रवृत्तियों के लिए आप पात्र हैं, उन्हें खोजें →",
    schClosing: "जल्द बंद होने वाली छात्रवृत्तियाँ →",
    schTutor: "{name} के बारे में AI ट्यूटर से पूछें →",
    colleges: "NIRF रैंक वाले कॉलेज →",
    entrance: "कक्षा 12 के बाद की प्रवेश परीक्षाएँ →",
    careerTutor: "AI ट्यूटर से पूछें: {name} कैसे बनें →",
    scholarships: "जिन छात्रवृत्तियों के लिए आवेदन कर सकते हैं →",
  },
  te: {
    heading: "Shishya లో తర్వాత",
    quiz: "{exam} 5 ఉచిత ప్రశ్నలు ప్రయత్నించండి — సైన్-ఇన్ అవసరం లేదు →",
    hub: "{exam} ఉచిత మాక్ టెస్ట్‌లు, గత సంవత్సరాల నమూనా పేపర్లు, సిలబస్ →",
    hubNoPractice: "{exam} గురించి అన్నీ: సిలబస్, తేదీలు, పరీక్ష విధానం →",
    updates: "{exam} తేదీలు, అడ్మిట్ కార్డ్, ఫలితాలు →",
    tutorExam: "{exam} గురించి AI ట్యూటర్‌ను ఏదైనా అడగండి →",
    caQuiz: "{month} కరెంట్ అఫైర్స్‌పై నాకు క్విజ్ (AI ట్యూటర్) →",
    caExams: "ప్రభుత్వ పరీక్షలు — తేదీలు, సిలబస్, ఉచిత మాక్‌లు →",
    caCalendar: "పరీక్షల క్యాలెండర్: ప్రకటించిన ప్రతి పరీక్ష తేదీ →",
    caLive: "మీ ర్యాంక్‌తో ఉచిత అఖిల భారత లైవ్ టెస్ట్‌లు →",
    schMatch: "మీకు అర్హత ఉన్న స్కాలర్‌షిప్‌లు కనుగొనండి →",
    schClosing: "త్వరలో ముగిసే స్కాలర్‌షిప్‌లు →",
    schTutor: "{name} గురించి AI ట్యూటర్‌ను అడగండి →",
    colleges: "NIRF ర్యాంకులతో కాలేజీలు →",
    entrance: "12వ తరగతి తర్వాత ప్రవేశ పరీక్షలు →",
    careerTutor: "{name} ఎలా కావాలో AI ట్యూటర్‌ను అడగండి →",
    scholarships: "మీరు దరఖాస్తు చేయగల స్కాలర్‌షిప్‌లు →",
  },
} as const;

export function landingHeading(locale: string | null | undefined): string {
  return T[loc(locale)].heading;
}

const chat = (seed: string, examCode?: string) =>
  examCode ? `/chat?examCode=${encodeURIComponent(examCode)}&seed=${encodeURIComponent(seed)}` : `/chat?general=1&seed=${encodeURIComponent(seed)}`;

/** An exam sub-page (updates, cutoff, syllabus, news): practice first when the exam has it. */
export function examNextActions(
  exam: { code: string; shortName: string },
  hasPractice: boolean,
  current: "updates" | "cutoff" | "syllabus" | "news" | "other",
  locale: string | null | undefined,
  /** the page's locale-preserving link maker (the /hi and /te twins) */
  link: (rel: string) => string = (rel) => rel,
): LandingAction[] {
  const c = T[loc(locale)];
  const v = { exam: exam.shortName };
  const out: LandingAction[] = [];
  if (hasPractice) out.push({ href: `/exams/${exam.code}/quiz`, label: fill(c.quiz, v), primary: true });
  out.push({ href: link(`/exams/${exam.code}`), label: fill(hasPractice ? c.hub : c.hubNoPractice, v), primary: !hasPractice });
  if (current !== "updates") out.push({ href: link(`/exams/${exam.code}/updates`), label: fill(c.updates, v) });
  out.push({ href: chat(`Tell me what I should know about ${exam.shortName} and how to prepare for it.`, exam.code), label: fill(c.tutorExam, v) });
  return out;
}

/** A current-affairs page (daily or monthly capsule). */
export function currentAffairsActions(monthLabel: string, locale: string | null | undefined): LandingAction[] {
  const c = T[loc(locale)];
  return [
    { href: chat(`Quiz me with 5 questions on ${monthLabel} current affairs for government exams, one at a time, and explain each answer.`), label: fill(c.caQuiz, { month: monthLabel }), primary: true },
    { href: "/live-test", label: c.caLive },
    { href: "/exams/browse", label: c.caExams },
    { href: "/exam-calendar", label: c.caCalendar },
  ];
}

/** A scholarship page. */
export function scholarshipActions(name: string, locale: string | null | undefined): LandingAction[] {
  const c = T[loc(locale)];
  return [
    { href: "/scholarships/match", label: c.schMatch, primary: true },
    { href: "/scholarships/closing-soon", label: c.schClosing },
    { href: chat(`Explain the ${name}: who can apply, how much it pays and how to apply. Point me to the official page.`), label: fill(c.schTutor, { name }) },
    { href: "/colleges", label: c.colleges },
  ];
}

/** "a" or "an" for an English career name. */
const article = (name: string) => (/^[aeiou]/i.test(name.trim()) ? "an" : "a");

/** A career page. */
export function careerActions(name: string, locale: string | null | undefined): LandingAction[] {
  const c = T[loc(locale)];
  return [
    { href: chat(`How do I become ${article(name)} ${name} in India? Which exams, courses and colleges lead there?`), label: fill(c.careerTutor, { name, a: article(name) }), primary: true },
    { href: "/exams/entrance", label: c.entrance },
    { href: "/colleges", label: c.colleges },
    { href: "/scholarships", label: c.scholarships },
  ];
}
