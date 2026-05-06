// Tiny home-grown i18n. No external library — just a string dictionary
// keyed by locale, plus a helper that picks the right one. Falls back to
// English on missing keys so we never crash on a missing translation.

export const locales = ["en", "hi"] as const;
export type Locale = (typeof locales)[number];

export const localeNames: Record<Locale, string> = {
  en: "English",
  hi: "हिन्दी",
};

export const dict = {
  en: {
    // ── brand
    "brand.tagline": "Free, AI-tutored prep for India's top entrance exams.",

    // ── header / nav
    "nav.signin": "Sign in with Google",
    "nav.signin.short": "Sign in",
    "nav.signout": "Sign out",
    "nav.dashboard": "Dashboard",
    "nav.exams": "Exams",
    "nav.howItWorks": "How it works",
    "nav.whyFree": "Why free",
    "nav.tutor": "Ask the AI tutor →",

    // ── landing hero
    "hero.badge": "Free forever · For every student in India",
    "hero.h1.line1": "AI-tutored prep for India's",
    "hero.h1.line2": "top 10 entrance exams.",
    "hero.body":
      "Take a diagnostic mock. We map your weak spots. Our AI builds the next mock for you. You improve. Repeat.",
    "hero.body.bold": "No fees. No paywalls.",
    "hero.cta.primary": "Start free with Google →",
    "hero.cta.secondary": "See how it works",
    "hero.smallprint": "हर छात्र के लिए मुफ़्त · Built by",

    // ── value props
    "values.diag.title": "Diagnostic that actually maps you",
    "values.diag.body": "One mock and we know exactly where you stand — topic by topic, not just an overall score.",
    "values.adapt.title": "AI that adapts to you",
    "values.adapt.body": "Every next mock is built around what you got wrong. The system learns with you.",
    "values.expl.title": "Step-by-step solutions",
    "values.expl.body": "Got a question wrong? Tap and get a clear explanation in your language — English or Hindi.",
    "values.tutor.title": "Tutor that answers anything",
    "values.tutor.body": "Stuck on a concept? Ask. The AI tutor knows your syllabus and your weak areas.",

    // ── how it works
    "how.h2": "How Shishya works",
    "how.body":
      "A loop, not a library. You don't read endless content — you practice, get diagnosed, and practice again with a smarter mock each time.",
    "how.s1.title": "Sign in with Google",
    "how.s1.body": "No forms. No fees. Just your Gmail and you're in.",
    "how.s2.title": "Pick your exam",
    "how.s2.body": "SSC CGL, NEET, JEE, UPSC, CAT — choose what you're preparing for.",
    "how.s3.title": "Take a diagnostic mock",
    "how.s3.body": "Ten to twelve questions across the syllabus. We score every topic, not just the total.",
    "how.s4.title": "Get your weakness map",
    "how.s4.body": "AI shows you exactly which topics need work and which you've nailed.",
    "how.s5.title": "Take adaptive mocks",
    "how.s5.body": "Each new mock is generated for you — focused on what you missed last time.",
    "how.s6.title": "Track real improvement",
    "how.s6.body": "Watch mastery scores climb topic by topic. Honest data. No fake gamification.",

    // ── exams grid
    "exams.h2": "Top 10 entrance exams. Covered.",
    "exams.body":
      "We're starting with SSC CGL and rolling out the rest through 2026. Every exam comes with the full syllabus, AI-built mocks, and step-by-step solutions.",
    "exams.status.live": "Live",
    "exams.status.coming": "Coming",

    // ── social impact
    "impact.h2": "Why we made this free.",
    "impact.body1":
      "Coaching for these exams costs ₹15,000–₹2,00,000. That's a non-starter for crores of students in tier-2 and tier-3 India. Quality prep should not depend on PIN code.",
    "impact.body2.prefix": "Shishya is built by",
    "impact.body2.middle": "as a public product. The AI runs on",
    "impact.body2.brand": "Anthropic's Claude",
    "impact.body2.suffix": ". Costs are absorbed by the company.",
    "impact.signoff.hi": "हर छात्र, एक ही मंच पर।",
    "impact.signoff.en": "Every student. One platform. No fees.",

    // ── footer
    "footer.built": "Built by Surge Software Solutions",
    "footer.github": "GitHub",
    "footer.contact": "Contact",
    "footer.surge": "Surge",

    // ── login
    "login.h1": "Sign in to start",
    "login.body": "We use Google sign-in only. No passwords. No spam.",
    "login.continue": "Continue with Google",
    "login.smallprint":
      "By continuing, you agree to use this platform responsibly. Your email is the only thing we read from your Google account.",

    // ── dashboard
    "dash.welcome": "Welcome back,",
    "dash.subtitle": "Pick up where you left off, or explore a new exam.",
    "dash.your.exams": "Your exams",
    "dash.no.enrollments": "You're not enrolled in any exam yet. Pick one below to start with a diagnostic mock.",
    "dash.recent": "Recent attempts",
    "dash.explore": "Explore other exams",
    "dash.continue": "Continue →",
    "dash.syllabus": "Syllabus",

    // ── exam page
    "exam.totalQs": "Qs",
    "exam.marks": "marks",
    "exam.minutes": "min",
    "exam.negative": "Negative",
    "exam.no.negative": "None",
    "exam.action.continue": "Continue practising",
    "exam.action.start": "Start with a diagnostic",
    "exam.action.continue.body": "Take an adaptive mock built around your weak topics.",
    "exam.action.start.body": "10 questions across the syllabus to see where you stand.",
    "exam.no.content": "We're seeding questions for this exam. Check back soon.",
    "exam.weakest": "Your weakest topics",
    "exam.syllabus": "Syllabus",
    "exam.cta.adaptive": "Start adaptive mock →",
    "exam.cta.diagnostic": "New diagnostic",
    "exam.cta.firstDiagnostic": "Take diagnostic mock →",
    "exam.cta.building": "Building your mock…",

    // ── mock player
    "player.q.of": "of",
    "player.mark": "Mark for review",
    "player.marked": "Marked ✓",
    "player.prev": "← Previous",
    "player.saveNext": "Save & next →",
    "player.reviewSubmit": "Review & submit →",
    "player.submitMock": "Submit mock",
    "player.summary.answered": "answered",
    "player.summary.marked": "marked",
    "player.summary.left": "left",
    "player.confirm.title": "Submit your answers?",
    "player.confirm.body.prefix": "You've answered",
    "player.confirm.body.of": "of",
    "player.confirm.body.note": "Unanswered questions get 0 marks.",
    "player.confirm.keep": "Keep practising",
    "player.confirm.submit": "Submit now",
    "player.confirm.submitting": "Submitting…",

    // ── results
    "results.title.results": "Results",
    "results.score": "Score",
    "results.correct": "Correct",
    "results.wrong": "Wrong",
    "results.skipped": "skipped",
    "results.time": "Time",
    "results.topicHeader": "Topic-by-topic performance",
    "results.review.title": "Review each question",
    "results.review.subtitle": "Tap any question to see the correct answer and ask the AI to explain it.",
    "results.cta.another": "Take another mock →",
    "results.cta.back": "Back to dashboard",

    // ── chat
    "chat.title": "Ask anything",
    "chat.placeholder": "Type your question…",
    "chat.send": "Send",
    "chat.thinking": "Thinking…",
    "chat.empty.body": "Ask me anything about your prep — concepts, mocks, weak areas.",
    "chat.empty.examPrefix": "for",
    "chat.suggested": "Suggested next steps",
    "chat.starter.1": "I'm weak in Profit & Loss. Where do I start?",
    "chat.starter.2": "Explain Compound Interest with one example.",
    "chat.starter.3": "What's the easiest topic in Quant to score on?",
    "chat.starter.4": "Make me a 10-question mock on Time and Work.",

    // ── lang switcher
    "lang.switch": "Language",
  },

  hi: {
    "brand.tagline": "भारत के शीर्ष प्रवेश परीक्षाओं की मुफ़्त, AI-संचालित तैयारी।",

    "nav.signin": "Google से साइन इन करें",
    "nav.signin.short": "साइन इन",
    "nav.signout": "साइन आउट",
    "nav.dashboard": "डैशबोर्ड",
    "nav.exams": "परीक्षाएँ",
    "nav.howItWorks": "कैसे काम करता है",
    "nav.whyFree": "मुफ़्त क्यों",
    "nav.tutor": "AI ट्यूटर से पूछें →",

    "hero.badge": "हमेशा मुफ़्त · भारत के हर छात्र के लिए",
    "hero.h1.line1": "भारत की शीर्ष 10 प्रवेश परीक्षाओं के लिए",
    "hero.h1.line2": "AI-संचालित तैयारी।",
    "hero.body":
      "एक डायग्नोस्टिक मॉक दीजिए। हम आपकी कमज़ोरियाँ ढूँढते हैं। हमारा AI आपके लिए अगला मॉक बनाता है। आप सुधरते हैं। यही चक्र चलता है।",
    "hero.body.bold": "कोई फ़ीस नहीं। कोई पेवॉल नहीं।",
    "hero.cta.primary": "Google से मुफ़्त शुरू करें →",
    "hero.cta.secondary": "कैसे काम करता है, देखें",
    "hero.smallprint": "हर छात्र के लिए मुफ़्त · निर्माण",

    "values.diag.title": "डायग्नोस्टिक जो असल में आपको पहचानता है",
    "values.diag.body": "एक मॉक — और हम जानते हैं आप कहाँ खड़े हैं, विषयवार, सिर्फ़ कुल अंक नहीं।",
    "values.adapt.title": "आपके अनुसार ढलने वाला AI",
    "values.adapt.body": "हर अगला मॉक उन सवालों पर केंद्रित होता है जो पिछली बार ग़लत हुए थे।",
    "values.expl.title": "स्टेप-बाय-स्टेप समाधान",
    "values.expl.body": "कोई सवाल ग़लत हुआ? टैप करें और हिंदी या अंग्रेज़ी में स्पष्ट व्याख्या पाएँ।",
    "values.tutor.title": "हर सवाल का जवाब देने वाला ट्यूटर",
    "values.tutor.body": "किसी कॉन्सेप्ट पर अटक गए? पूछिए। AI ट्यूटर आपके सिलेबस और कमज़ोरियों को जानता है।",

    "how.h2": "Shishya कैसे काम करता है",
    "how.body":
      "यह एक लूप है, लाइब्रेरी नहीं। अनगिनत सामग्री पढ़ने के बजाय — आप अभ्यास करते हैं, डायग्नोस होते हैं, और हर बार बेहतर मॉक के साथ फिर अभ्यास करते हैं।",
    "how.s1.title": "Google से साइन इन करें",
    "how.s1.body": "कोई फ़ॉर्म नहीं। कोई फ़ीस नहीं। बस अपना Gmail चाहिए।",
    "how.s2.title": "अपनी परीक्षा चुनें",
    "how.s2.body": "SSC CGL, NEET, JEE, UPSC, CAT — जिसकी तैयारी कर रहे हैं वही चुनें।",
    "how.s3.title": "डायग्नोस्टिक मॉक दीजिए",
    "how.s3.body": "सिलेबस के 10–12 सवाल। हर विषय का अलग स्कोर मिलता है, सिर्फ़ कुल नहीं।",
    "how.s4.title": "अपनी कमज़ोरी का नक़्शा देखें",
    "how.s4.body": "AI दिखाता है कि किन विषयों पर मेहनत चाहिए और किन में आप मज़बूत हैं।",
    "how.s5.title": "एडैप्टिव मॉक दें",
    "how.s5.body": "हर नया मॉक आपके लिए बनता है — पिछली ग़लतियों पर केंद्रित।",
    "how.s6.title": "असली सुधार ट्रैक करें",
    "how.s6.body": "विषयवार मास्टरी बढ़ती देखें। सच्चा डेटा। बनावटी गेमिफ़िकेशन नहीं।",

    "exams.h2": "शीर्ष 10 प्रवेश परीक्षाएँ। सब कवर्ड।",
    "exams.body":
      "हम SSC CGL से शुरू कर रहे हैं और 2026 में बाक़ी जोड़ेंगे। हर परीक्षा के लिए पूरा सिलेबस, AI मॉक और स्टेप-बाय-स्टेप समाधान।",
    "exams.status.live": "उपलब्ध",
    "exams.status.coming": "जल्द",

    "impact.h2": "हमने यह मुफ़्त क्यों बनाया।",
    "impact.body1":
      "इन परीक्षाओं की कोचिंग पर ₹15,000–₹2,00,000 ख़र्च होते हैं। टियर-2 और टियर-3 भारत के करोड़ों छात्रों के लिए यह असंभव है। अच्छी तैयारी पिन कोड पर निर्भर नहीं होनी चाहिए।",
    "impact.body2.prefix": "Shishya का निर्माण",
    "impact.body2.middle": "एक सार्वजनिक उत्पाद के रूप में करता है। AI",
    "impact.body2.brand": "Anthropic के Claude",
    "impact.body2.suffix": "पर चलता है। लागत कंपनी उठाती है।",
    "impact.signoff.hi": "हर छात्र, एक ही मंच पर।",
    "impact.signoff.en": "Every student. One platform. No fees.",

    "footer.built": "निर्माण: Surge Software Solutions",
    "footer.github": "GitHub",
    "footer.contact": "संपर्क",
    "footer.surge": "Surge",

    "login.h1": "शुरू करने के लिए साइन इन करें",
    "login.body": "हम केवल Google साइन-इन का उपयोग करते हैं। कोई पासवर्ड नहीं। कोई स्पैम नहीं।",
    "login.continue": "Google से जारी रखें",
    "login.smallprint":
      "जारी रखकर, आप इस मंच का ज़िम्मेदारी से उपयोग करने के लिए सहमत हैं। हम आपके Google खाते से केवल आपका ईमेल पढ़ते हैं।",

    "dash.welcome": "वापस स्वागत है,",
    "dash.subtitle": "जहाँ छोड़ा था वहीं से जारी रखें, या नई परीक्षा देखें।",
    "dash.your.exams": "आपकी परीक्षाएँ",
    "dash.no.enrollments": "अभी कोई परीक्षा नहीं चुनी है। नीचे से चुनें और डायग्नोस्टिक मॉक से शुरू करें।",
    "dash.recent": "हाल के प्रयास",
    "dash.explore": "अन्य परीक्षाएँ देखें",
    "dash.continue": "जारी रखें →",
    "dash.syllabus": "सिलेबस",

    "exam.totalQs": "प्रश्न",
    "exam.marks": "अंक",
    "exam.minutes": "मिनट",
    "exam.negative": "नेगेटिव",
    "exam.no.negative": "नहीं",
    "exam.action.continue": "अभ्यास जारी रखें",
    "exam.action.start": "डायग्नोस्टिक से शुरू करें",
    "exam.action.continue.body": "आपकी कमज़ोरियों पर केंद्रित एडैप्टिव मॉक दीजिए।",
    "exam.action.start.body": "सिलेबस के 10 सवाल — देखें आप कहाँ खड़े हैं।",
    "exam.no.content": "हम इस परीक्षा के लिए सवाल जोड़ रहे हैं। जल्द ही उपलब्ध होगा।",
    "exam.weakest": "आपके सबसे कमज़ोर विषय",
    "exam.syllabus": "सिलेबस",
    "exam.cta.adaptive": "एडैप्टिव मॉक शुरू करें →",
    "exam.cta.diagnostic": "नया डायग्नोस्टिक",
    "exam.cta.firstDiagnostic": "डायग्नोस्टिक मॉक दीजिए →",
    "exam.cta.building": "आपका मॉक बना रहे हैं…",

    "player.q.of": "/",
    "player.mark": "बाद के लिए चिह्नित करें",
    "player.marked": "चिह्नित ✓",
    "player.prev": "← पिछला",
    "player.saveNext": "सहेजें और अगला →",
    "player.reviewSubmit": "समीक्षा करें और जमा करें →",
    "player.submitMock": "मॉक जमा करें",
    "player.summary.answered": "उत्तर दिए",
    "player.summary.marked": "चिह्नित",
    "player.summary.left": "बाक़ी",
    "player.confirm.title": "उत्तर जमा करें?",
    "player.confirm.body.prefix": "आपने जवाब दिए",
    "player.confirm.body.of": "में से",
    "player.confirm.body.note": "बिना जवाब वाले सवालों पर 0 अंक मिलेंगे।",
    "player.confirm.keep": "अभ्यास जारी रखें",
    "player.confirm.submit": "अभी जमा करें",
    "player.confirm.submitting": "जमा हो रहा है…",

    "results.title.results": "परिणाम",
    "results.score": "स्कोर",
    "results.correct": "सही",
    "results.wrong": "ग़लत",
    "results.skipped": "छूटे",
    "results.time": "समय",
    "results.topicHeader": "विषय-वार प्रदर्शन",
    "results.review.title": "हर सवाल की समीक्षा करें",
    "results.review.subtitle": "किसी भी सवाल पर टैप करें — सही उत्तर देखें और AI से व्याख्या माँगें।",
    "results.cta.another": "एक और मॉक दीजिए →",
    "results.cta.back": "डैशबोर्ड पर वापस",

    "chat.title": "कुछ भी पूछिए",
    "chat.placeholder": "अपना सवाल टाइप करें…",
    "chat.send": "भेजें",
    "chat.thinking": "सोच रहा हूँ…",
    "chat.empty.body": "अपनी तैयारी से जुड़ा कुछ भी पूछिए — कॉन्सेप्ट, मॉक, कमज़ोरियाँ।",
    "chat.empty.examPrefix": "के लिए",
    "chat.suggested": "अगले सुझाए गए कदम",
    "chat.starter.1": "मैं Profit & Loss में कमज़ोर हूँ। कहाँ से शुरू करूँ?",
    "chat.starter.2": "Compound Interest एक उदाहरण से समझाइए।",
    "chat.starter.3": "Quant में सबसे आसान विषय कौन सा है?",
    "chat.starter.4": "Time and Work पर 10 सवालों का मॉक बनाइए।",

    "lang.switch": "भाषा",
  },
} as const;

export type StringKey = keyof typeof dict.en;

/** Translate a key into the given locale; falls back to English on miss. */
export function tk(key: StringKey, locale: Locale = "en"): string {
  return (dict[locale] as any)[key] ?? dict.en[key];
}
