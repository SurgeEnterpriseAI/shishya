// Tiny home-grown i18n. No external library — just a string dictionary
// keyed by locale, plus a helper that picks the right one. Falls back to
// English on missing keys so we never crash on a missing translation.

// English + the 18 scheduled languages of India (the historical "Eighteen
// Languages" list — pre-2003 schedule). Order: English first, then Hindi
// (most spoken), then alphabetical by ISO code.
export const locales = [
  "en",   // English
  "hi",   // Hindi (हिन्दी)
  "as",   // Assamese (অসমীয়া)
  "bn",   // Bengali (বাংলা)
  "gu",   // Gujarati (ગુજરાતી)
  "kn",   // Kannada (ಕನ್ನಡ)
  "kok",  // Konkani (कोंकणी)
  "ks",   // Kashmiri (कॉशुर)
  "ml",   // Malayalam (മലയാളം)
  "mni",  // Manipuri / Meitei (মণিপুরী)
  "mr",   // Marathi (मराठी)
  "ne",   // Nepali (नेपाली)
  "or",   // Odia (ଓଡ଼ିଆ)
  "pa",   // Punjabi (ਪੰਜਾਬੀ)
  "sa",   // Sanskrit (संस्कृतम्)
  "sd",   // Sindhi (سنڌي)
  "ta",   // Tamil (தமிழ்)
  "te",   // Telugu (తెలుగు)
  "ur",   // Urdu (اردو)
] as const;
export type Locale = (typeof locales)[number];

/** Native-script display names used in the language selector. */
export const localeNames: Record<Locale, string> = {
  en:  "English",
  hi:  "हिन्दी",
  as:  "অসমীয়া",
  bn:  "বাংলা",
  gu:  "ગુજરાતી",
  kn:  "ಕನ್ನಡ",
  kok: "कोंकणी",
  ks:  "کٲشُر",
  ml:  "മലയാളം",
  mni: "মৈতৈলোন্",
  mr:  "मराठी",
  ne:  "नेपाली",
  or:  "ଓଡ଼ିଆ",
  pa:  "ਪੰਜਾਬੀ",
  sa:  "संस्कृतम्",
  sd:  "سنڌي",
  ta:  "தமிழ்",
  te:  "తెలుగు",
  ur:  "اردو",
};

/** Right-to-left scripts (Perso-Arabic). Affects html dir attribute. */
export const rtlLocales: ReadonlySet<Locale> = new Set(["ur", "sd", "ks"]);
export function isRtl(locale: Locale): boolean {
  return rtlLocales.has(locale);
}

export const dict = {
  en: {
    // ── brand
    "brand.tagline": "Free, expert-curated prep for India's top entrance exams. Supported by Shishya AI.",

    // ── header / nav
    "nav.signin": "Sign in with Google",
    "nav.signin.short": "Sign in",
    "nav.signout": "Sign out",
    "nav.dashboard": "Dashboard",
    "nav.exams": "Exams",
    "nav.howItWorks": "How it works",
    "nav.whyFree": "Why free",
    "nav.tutor": "Ask the AI tutor →",

    // ── new search-first landing
    "land.title": "What exam do you want to crack today?",
    "land.title.accent": "",
    "land.subtitle": "Type the exam you're preparing for — SSC, NEET, JEE, UPSC, CAT — and we'll give you previous year papers, expert-curated mocks, weak-area analysis, and Shishya AI as your tutor.",
    "land.search.placeholder": "Type your exam — e.g. SSC CGL, NEET UG, JEE Main…",
    "land.search.label": "What are you preparing for?",
    "land.no.results": "No exams match. Try another keyword or pick a category above.",
    "land.cat.all": "All",
    "land.cat.GOVT_JOBS": "Govt Jobs",
    "land.cat.BANKING": "Banking",
    "land.cat.CIVIL_SERVICES": "Civil Services",
    "land.cat.MEDICAL": "Medical",
    "land.cat.ENGINEERING": "Engineering",
    "land.cat.TEACHING": "Teaching",
    "land.cat.UNIVERSITY": "University",
    "land.cat.MBA": "MBA",
    "land.cat.LAW": "Law",
    "land.cat.DEFENCE": "Defence",
    "land.status.live": "Live",
    "land.status.coming": "Coming",
    "land.cta.start": "Start free with Google →",
    "land.candidates": "candidates / yr",
    // ── 4-step loop (the new "how it works")
    "loop.title": "How it works — a simple loop",
    "loop.subtitle": "Take a test, see where you stand, ask the AI for help, take another. Until you're ready.",
    "loop.s1.title": "1. Take a test",
    "loop.s1.body": "Diagnostic, topic drill, or a full mock — pick what you need.",
    "loop.s2.title": "2. Get scored",
    "loop.s2.body": "Per-topic score, not just an overall mark. Honest data.",
    "loop.s3.title": "3. AI analyses",
    "loop.s3.body": "Weakness map shows exactly which topics to fix.",
    "loop.s4.title": "4. Chat & improve",
    "loop.s4.body": "Ask Shishya AI for materials or another mock — it picks the right one from our curated bank.",

    // ── Feature pillars (the "everything you need" section)
    "features.title": "Everything you need to crack your exam",
    "features.subtitle": "Real PYQs, fresh expert-curated mocks every day, weak-area detection with Shishya AI, and a progress bar that shows what to fix. All free.",
    "features.pyq.title": "Previous year papers",
    "features.pyq.body": "Real PYQs for every exam, organised by year and topic. Practice the questions that actually appear.",
    "features.daily.title": "Fresh mocks every day",
    "features.daily.body": "Subject experts curate fresh mocks each day. Shishya AI keeps your prep varied — never the same paper twice.",
    "features.weakness.title": "Weakness map",
    "features.weakness.body": "Per-topic mastery score. See exactly which topics need tomorrow's hour, not a vague overall percentile.",
    "features.adaptive.title": "Adaptive mocks",
    "features.adaptive.body": "Expert-curated mocks; Shishya AI picks the right one for you each time. Every next mock targets your weakest topics.",
    "features.progress.title": "Real progress tracker",
    "features.progress.body": "Topic-by-topic progress bars. Watch mastery climb week after week. Honest data — no fake streaks.",
    "features.tutor.title": "24/7 AI tutor",
    "features.tutor.body": "Stuck on a concept? Ask. The tutor knows your syllabus and your weak topics. English or Hindi.",

    // ── Discussion panel (rolling chat threads on the home page)
    "disc.title": "What other students are talking about",
    "disc.subtitle": "Live discussion threads. Read freely; sign in to reply.",
    "disc.replies": "replies",
    "disc.reply": "reply",
    "disc.viewAll": "All discussions →",
    "disc.startNew": "Start a new discussion",
    "disc.empty": "No active discussions yet. Be the first to post.",
    "disc.thread.title": "Discussion",
    "disc.thread.replyPlaceholder": "Add to the discussion…",
    "disc.thread.send": "Post reply",
    "disc.thread.signinToReply": "Sign in to reply",
    "disc.thread.locked": "This thread is locked.",
    "disc.thread.you": "you",
    "disc.thread.shishya": "Shishya AI",
    "disc.compose.titlePlaceholder": "What's on your mind? (e.g. 'Best resources for SSC CGL Quant?')",
    "disc.compose.bodyPlaceholder": "Add details, context, or your specific question…",
    "disc.compose.examLabel": "Tag exam (optional)",
    "disc.compose.publish": "Publish",
    "disc.justNow": "just now",
    "disc.minutesAgo": "min ago",
    "disc.hoursAgo": "hr ago",
    "disc.daysAgo": "d ago",
    "disc.sidebar.openAria": "Open community discussions",
    "disc.sidebar.closeAria": "Close discussions",

    // ── Exam timeline (news + important dates on /exams/[code])
    "timeline.news.title": "Latest news",
    "timeline.news.empty": "No news yet for this exam.",
    "timeline.dates.title": "Important dates",
    "timeline.dates.empty": "No dates published yet.",
    "timeline.dates.examDay": "Exam day",
    "timeline.dates.daysAway": "days away",
    "timeline.dates.tomorrow": "tomorrow",
    "timeline.dates.today": "today",
    "timeline.dates.passed": "passed",

    // ── Progress demo block (sample dashboard)
    "progress.title": "Your progress at a glance",
    "progress.subtitle": "A sample dashboard — every topic climbs as you practice. Real numbers, weekly deltas, no vanity metrics.",
    "progress.demo.exam": "SSC CGL · Quantitative Aptitude",
    "progress.demo.thisweek": "This week",
    "progress.demo.mocks": "mocks taken",
    "progress.demo.questions": "questions practised",
    "progress.demo.topicsImproved": "topics improved",
    "progress.demo.delta": "this week",

    // ── (legacy keys kept below for any pages still referencing them)
    "hero.badge": "Free forever · For every student in India",
    "hero.h1.line1": "Expert-curated prep for India's",
    "hero.h1.line2": "top 10 entrance exams.",
    "hero.body":
      "Take a diagnostic mock. We map your weak spots. Subject experts curate every mock; Shishya AI picks the right one for you next. You improve. Repeat.",
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
      "We're starting with SSC CGL and rolling out the rest through 2026. Every exam comes with the full syllabus, expert-curated mocks, and step-by-step solutions.",
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
    "brand.tagline": "भारत के शीर्ष प्रवेश परीक्षाओं की मुफ़्त, विशेषज्ञों द्वारा तैयार तैयारी। Shishya AI के सहयोग से।",

    // ── new search-first landing
    "land.title": "आज आप कौन सी परीक्षा क्रैक करना चाहते हैं?",
    "land.title.accent": "",
    "land.subtitle": "जिस परीक्षा की तैयारी कर रहे हैं उसका नाम लिखिए — SSC, NEET, JEE, UPSC, CAT — हम पिछले वर्षों के प्रश्न, विषय-विशेषज्ञों द्वारा तैयार किए गए मॉक, कमज़ोर विषयों का विश्लेषण और सहायक के रूप में Shishya AI देंगे।",
    "land.search.placeholder": "अपनी परीक्षा लिखिए — जैसे SSC CGL, NEET UG, JEE Main…",
    "land.search.label": "किसकी तैयारी कर रहे हैं?",
    "land.no.results": "कोई परीक्षा नहीं मिली। दूसरा कीवर्ड आज़माइए या ऊपर से श्रेणी चुनें।",
    "land.cat.all": "सभी",
    "land.cat.GOVT_JOBS": "सरकारी नौकरी",
    "land.cat.BANKING": "बैंकिंग",
    "land.cat.CIVIL_SERVICES": "सिविल सेवा",
    "land.cat.MEDICAL": "मेडिकल",
    "land.cat.ENGINEERING": "इंजीनियरिंग",
    "land.cat.TEACHING": "शिक्षण",
    "land.cat.UNIVERSITY": "विश्वविद्यालय",
    "land.cat.MBA": "MBA",
    "land.cat.LAW": "क़ानून",
    "land.cat.DEFENCE": "रक्षा",
    "land.status.live": "उपलब्ध",
    "land.status.coming": "जल्द",
    "land.cta.start": "Google से मुफ़्त शुरू करें →",
    "land.candidates": "उम्मीदवार / वर्ष",
    // ── 4-step loop
    "loop.title": "कैसे काम करता है — एक सरल चक्र",
    "loop.subtitle": "टेस्ट दीजिए, स्थिति देखिए, AI से मदद माँगिए, फिर टेस्ट दीजिए। जब तक तैयार न हों।",
    "loop.s1.title": "१. टेस्ट दीजिए",
    "loop.s1.body": "डायग्नोस्टिक, टॉपिक ड्रिल, या पूरा मॉक — जो चाहिए वो चुनिए।",
    "loop.s2.title": "२. स्कोर देखिए",
    "loop.s2.body": "विषयवार स्कोर, सिर्फ़ कुल अंक नहीं। सच्चा डेटा।",
    "loop.s3.title": "३. AI विश्लेषण",
    "loop.s3.body": "कमज़ोरी का नक़्शा — किन विषयों पर मेहनत चाहिए, साफ़ दिखता है।",
    "loop.s4.title": "४. चैट और सुधार",
    "loop.s4.body": "Shishya AI से सामग्री या नया मॉक माँगिए — हमारे विशेषज्ञ-तैयार बैंक से सही मॉक चुनकर देगा।",

    // ── Feature pillars
    "features.title": "परीक्षा क्रैक करने के लिए सब कुछ — एक ही जगह",
    "features.subtitle": "असली PYQs, विशेषज्ञों द्वारा तैयार किए गए ताज़ा मॉक, Shishya AI से कमज़ोर विषयों की पहचान, और एक प्रोग्रेस बार जो दिखाता है क्या ठीक करना है। सब मुफ़्त।",
    "features.pyq.title": "पिछले वर्षों के प्रश्न",
    "features.pyq.body": "हर परीक्षा के असली PYQs — वर्ष और विषय के अनुसार व्यवस्थित। वही सवाल जो असल में आते हैं।",
    "features.daily.title": "रोज़ नए मॉक",
    "features.daily.body": "विषय-विशेषज्ञ हर दिन नए मॉक तैयार करते हैं। Shishya AI आपकी तैयारी में विविधता बनाए रखता है — वही पेपर दोबारा नहीं।",
    "features.weakness.title": "कमज़ोरी का नक़्शा",
    "features.weakness.body": "विषयवार मास्टरी स्कोर। ठीक-ठीक देखें कौन से विषय पर कल का घंटा देना है — कोई अस्पष्ट परसेंटाइल नहीं।",
    "features.adaptive.title": "एडैप्टिव मॉक",
    "features.adaptive.body": "विशेषज्ञों द्वारा तैयार मॉक; Shishya AI हर बार आपके लिए सही मॉक चुनता है। हर अगला मॉक आपके सबसे कमज़ोर विषयों पर केंद्रित होता है।",
    "features.progress.title": "असली प्रगति ट्रैकर",
    "features.progress.body": "विषयवार प्रोग्रेस बार। हफ़्ते-दर-हफ़्ते मास्टरी बढ़ती देखें। सच्चा डेटा — नक़ली स्ट्रीक नहीं।",
    "features.tutor.title": "24/7 AI ट्यूटर",
    "features.tutor.body": "किसी कॉन्सेप्ट पर अटक गए? पूछिए। ट्यूटर आपका सिलेबस और कमज़ोर विषय जानता है। हिंदी या English।",

    // ── Discussions
    "disc.title": "बाक़ी छात्र किस बारे में बात कर रहे हैं",
    "disc.subtitle": "लाइव चर्चा थ्रेड। पढ़ना सबके लिए खुला है; जवाब देने के लिए साइन इन करें।",
    "disc.replies": "जवाब",
    "disc.reply": "जवाब",
    "disc.viewAll": "सभी चर्चाएँ →",
    "disc.startNew": "नई चर्चा शुरू करें",
    "disc.empty": "अभी कोई सक्रिय चर्चा नहीं है। पहले पोस्ट करने वाले बनें।",
    "disc.thread.title": "चर्चा",
    "disc.thread.replyPlaceholder": "चर्चा में जोड़ें…",
    "disc.thread.send": "जवाब पोस्ट करें",
    "disc.thread.signinToReply": "जवाब देने के लिए साइन इन करें",
    "disc.thread.locked": "यह थ्रेड बंद है।",
    "disc.thread.you": "आप",
    "disc.thread.shishya": "Shishya AI",
    "disc.compose.titlePlaceholder": "क्या सोच रहे हैं? (जैसे 'SSC CGL Quant के लिए सबसे अच्छे संसाधन?')",
    "disc.compose.bodyPlaceholder": "विवरण, संदर्भ या अपना ख़ास सवाल जोड़ें…",
    "disc.compose.examLabel": "परीक्षा टैग करें (वैकल्पिक)",
    "disc.compose.publish": "प्रकाशित करें",
    "disc.justNow": "अभी",
    "disc.minutesAgo": "मिनट पहले",
    "disc.hoursAgo": "घंटे पहले",
    "disc.daysAgo": "दिन पहले",
    "disc.sidebar.openAria": "सामुदायिक चर्चाएँ खोलें",
    "disc.sidebar.closeAria": "चर्चाएँ बंद करें",

    "timeline.news.title": "ताज़ा ख़बरें",
    "timeline.news.empty": "इस परीक्षा के लिए अभी कोई ख़बर नहीं।",
    "timeline.dates.title": "महत्वपूर्ण तारीख़ें",
    "timeline.dates.empty": "अभी कोई तारीख़ें प्रकाशित नहीं।",
    "timeline.dates.examDay": "परीक्षा का दिन",
    "timeline.dates.daysAway": "दिन बाद",
    "timeline.dates.tomorrow": "कल",
    "timeline.dates.today": "आज",
    "timeline.dates.passed": "बीत गया",

    // ── Progress demo
    "progress.title": "आपकी प्रगति, एक नज़र में",
    "progress.subtitle": "एक सैंपल डैशबोर्ड — अभ्यास के साथ हर विषय ऊपर चढ़ता है। असली नंबर, साप्ताहिक डेल्टा, कोई दिखावटी मेट्रिक नहीं।",
    "progress.demo.exam": "SSC CGL · क्वांटिटेटिव एप्टीट्यूड",
    "progress.demo.thisweek": "इस हफ़्ते",
    "progress.demo.mocks": "मॉक दिए",
    "progress.demo.questions": "सवाल हल किए",
    "progress.demo.topicsImproved": "विषयों में सुधार",
    "progress.demo.delta": "इस हफ़्ते",

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

  // ─────────────────────────────────────────────────────────────────────
  // Bengali (বাংলা) — full landing-page translations.
  // Spoken by ~9.7Cr (West Bengal, Tripura).
  // Other keys gracefully fall back to English via tk().
  // ─────────────────────────────────────────────────────────────────────
  bn: {
    "land.title": "আপনার পরীক্ষা খুঁজুন।",
    "land.title.accent": "বিনামূল্যে প্রস্তুতি নিন।",
    "land.subtitle": "ভারতের শীর্ষ ২০ পরীক্ষা। বিশেষজ্ঞ-সংকলিত মক টেস্ট, Shishya AI-এর সহায়তায়। সহজ লুপ — যতক্ষণ না আপনি প্রস্তুত।",
    "land.search.placeholder": "আপনার পরীক্ষা খুঁজুন — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "সব",
    "land.cat.GOVT_JOBS": "সরকারি চাকরি",
    "land.cat.BANKING": "ব্যাঙ্কিং",
    "land.cat.CIVIL_SERVICES": "সিভিল সার্ভিস",
    "land.cat.MEDICAL": "মেডিকেল",
    "land.cat.ENGINEERING": "ইঞ্জিনিয়ারিং",
    "land.cat.TEACHING": "শিক্ষকতা",
    "land.cat.UNIVERSITY": "বিশ্ববিদ্যালয়",
    "land.cat.MBA": "MBA",
    "land.cat.LAW": "আইন",
    "land.cat.DEFENCE": "প্রতিরক্ষা",
    "land.status.live": "চালু",
    "land.status.coming": "শীঘ্রই",
    "land.cta.start": "Google দিয়ে বিনামূল্যে শুরু করুন →",
    "loop.title": "কীভাবে কাজ করে — একটি সহজ লুপ",
    "features.title": "আপনার পরীক্ষা পাশ করার জন্য সব কিছু",
    "progress.title": "আপনার অগ্রগতি, এক নজরে",
    "nav.signin": "Google দিয়ে সাইন ইন",
    "nav.signin.short": "সাইন ইন",
    "nav.dashboard": "ড্যাশবোর্ড",
    "lang.switch": "ভাষা",
  },

  // Telugu (తెలుగు) — ~8.2Cr speakers (Andhra Pradesh, Telangana)
  te: {
    "land.title": "మీ పరీక్షను కనుగొనండి.",
    "land.title.accent": "ఉచితంగా సిద్ధం అవ్వండి.",
    "land.subtitle": "భారత ఉత్తమ 20 పరీక్షలు. నిపుణుల-రూపొందించిన మాక్ టెస్ట్‌లు, Shishya AI మద్దతుతో. మీరు సిద్ధమయ్యే వరకు సరళమైన లూప్.",
    "land.search.placeholder": "మీ పరీక్షను శోధించండి — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "అన్నీ",
    "land.cat.GOVT_JOBS": "ప్రభుత్వ ఉద్యోగాలు",
    "land.cat.BANKING": "బ్యాంకింగ్",
    "land.cat.CIVIL_SERVICES": "సివిల్ సర్వీసెస్",
    "land.cat.MEDICAL": "మెడికల్",
    "land.cat.ENGINEERING": "ఇంజినీరింగ్",
    "land.cat.TEACHING": "ఉపాధ్యాయ",
    "land.cat.UNIVERSITY": "విశ్వవిద్యాలయం",
    "land.cat.MBA": "MBA",
    "land.cat.LAW": "న్యాయ",
    "land.cat.DEFENCE": "రక్షణ",
    "land.status.live": "అందుబాటులో",
    "land.status.coming": "త్వరలో",
    "land.cta.start": "Google తో ఉచితంగా ప్రారంభించండి →",
    "loop.title": "ఎలా పనిచేస్తుంది — ఒక సరళమైన లూప్",
    "features.title": "మీ పరీక్ష పాస్ చేయడానికి అవసరమైన అన్నీ",
    "progress.title": "మీ పురోగతి, ఒక చూపులో",
    "nav.signin": "Google తో సైన్ ఇన్",
    "nav.signin.short": "సైన్ ఇన్",
    "nav.dashboard": "డ్యాష్‌బోర్డ్",
    "lang.switch": "భాష",
  },

  // Marathi (मराठी) — ~8.3Cr speakers (Maharashtra, Goa)
  mr: {
    "land.title": "तुमची परीक्षा शोधा.",
    "land.title.accent": "मोफत तयारी करा.",
    "land.subtitle": "भारतातील शीर्ष 20 परीक्षा. तज्ञांनी तयार केलेले मॉक, Shishya AI च्या सहाय्याने. तयार होईपर्यंत सोपा चक्र.",
    "land.search.placeholder": "तुमची परीक्षा शोधा — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "सर्व",
    "land.cat.GOVT_JOBS": "सरकारी नोकरी",
    "land.cat.BANKING": "बँकिंग",
    "land.cat.CIVIL_SERVICES": "नागरी सेवा",
    "land.cat.MEDICAL": "वैद्यकीय",
    "land.cat.ENGINEERING": "अभियांत्रिकी",
    "land.cat.TEACHING": "शिक्षण",
    "land.cat.UNIVERSITY": "विद्यापीठ",
    "land.cat.MBA": "MBA",
    "land.cat.LAW": "कायदा",
    "land.cat.DEFENCE": "संरक्षण",
    "land.status.live": "उपलब्ध",
    "land.status.coming": "लवकरच",
    "land.cta.start": "Google ने मोफत सुरू करा →",
    "loop.title": "कसे काम करते — एक साधा चक्र",
    "features.title": "तुमची परीक्षा क्रॅक करण्यासाठी सर्व काही",
    "progress.title": "तुमची प्रगती, एका नजरेत",
    "nav.signin": "Google ने साइन इन",
    "nav.signin.short": "साइन इन",
    "nav.dashboard": "डॅशबोर्ड",
    "lang.switch": "भाषा",
  },

  // Tamil (தமிழ்) — ~8Cr speakers (Tamil Nadu, Puducherry)
  ta: {
    "land.title": "உங்கள் தேர்வை கண்டறியுங்கள்.",
    "land.title.accent": "இலவசமாக தயாராகுங்கள்.",
    "land.subtitle": "இந்தியாவின் முதல் 20 தேர்வுகள். நிபுணர்களால் தயாரிக்கப்பட்ட மாக் டெஸ்ட், Shishya AI ஆதரவுடன். நீங்கள் தயாராகும் வரை எளிய சுழற்சி.",
    "land.search.placeholder": "உங்கள் தேர்வைத் தேடுங்கள் — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "அனைத்தும்",
    "land.cat.GOVT_JOBS": "அரசு வேலை",
    "land.cat.BANKING": "வங்கி",
    "land.cat.CIVIL_SERVICES": "சிவில் சர்வீஸ்",
    "land.cat.MEDICAL": "மருத்துவம்",
    "land.cat.ENGINEERING": "பொறியியல்",
    "land.cat.TEACHING": "ஆசிரியர்",
    "land.cat.UNIVERSITY": "பல்கலைக்கழகம்",
    "land.cat.MBA": "MBA",
    "land.cat.LAW": "சட்டம்",
    "land.cat.DEFENCE": "பாதுகாப்பு",
    "land.status.live": "கிடைக்கிறது",
    "land.status.coming": "விரைவில்",
    "land.cta.start": "Google உடன் இலவசமாக தொடங்கவும் →",
    "loop.title": "எப்படி வேலை செய்கிறது — ஒரு எளிய சுழற்சி",
    "features.title": "உங்கள் தேர்வை வெல்ல தேவையான அனைத்தும்",
    "progress.title": "உங்கள் முன்னேற்றம், ஒரே பார்வையில்",
    "nav.signin": "Google உடன் உள்நுழைய",
    "nav.signin.short": "உள்நுழைய",
    "nav.dashboard": "டாஷ்போர்டு",
    "lang.switch": "மொழி",
  },

  // Gujarati (ગુજરાતી) — ~5.6Cr speakers
  gu: {
    "land.title": "તમારી પરીક્ષા શોધો.",
    "land.title.accent": "મફત તૈયારી કરો.",
    "land.subtitle": "ભારતની ટોચની 20 પરીક્ષાઓ. નિષ્ણાત-તૈયાર મોક, Shishya AI ના સહયોગથી. તમે તૈયાર ન થાવ ત્યાં સુધી સરળ લૂપ.",
    "land.search.placeholder": "તમારી પરીક્ષા શોધો — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "બધા",
    "land.cat.GOVT_JOBS": "સરકારી નોકરી",
    "land.cat.BANKING": "બેન્કિંગ",
    "land.cat.CIVIL_SERVICES": "નાગરિક સેવા",
    "land.cat.MEDICAL": "મેડિકલ",
    "land.cat.ENGINEERING": "ઇજનેરી",
    "land.cat.TEACHING": "શિક્ષણ",
    "land.cat.UNIVERSITY": "યુનિવર્સિટી",
    "land.cat.MBA": "MBA",
    "land.cat.LAW": "કાયદો",
    "land.cat.DEFENCE": "સંરક્ષણ",
    "land.status.live": "ઉપલબ્ધ",
    "land.status.coming": "ટૂંક સમયમાં",
    "land.cta.start": "Google થી મફત શરૂ કરો →",
    "loop.title": "કેવી રીતે કામ કરે છે — એક સરળ લૂપ",
    "features.title": "તમારી પરીક્ષા પાસ કરવા માટે બધું જ",
    "progress.title": "તમારી પ્રગતિ, એક ઝલકમાં",
    "nav.signin": "Google થી સાઇન ઇન કરો",
    "nav.signin.short": "સાઇન ઇન",
    "nav.dashboard": "ડેશબોર્ડ",
    "lang.switch": "ભાષા",
  },

  // Kannada (ಕನ್ನಡ) — ~4.4Cr speakers (Karnataka)
  kn: {
    "land.title": "ನಿಮ್ಮ ಪರೀಕ್ಷೆಯನ್ನು ಹುಡುಕಿ.",
    "land.title.accent": "ಉಚಿತವಾಗಿ ತಯಾರಾಗಿ.",
    "land.subtitle": "ಭಾರತದ ಅಗ್ರ 20 ಪರೀಕ್ಷೆಗಳು. ತಜ್ಞ-ರಚಿತ ಮಾಕ್, Shishya AI ಬೆಂಬಲದೊಂದಿಗೆ. ನೀವು ಸಿದ್ಧವಾಗುವವರೆಗೆ ಸರಳ ಲೂಪ್.",
    "land.search.placeholder": "ನಿಮ್ಮ ಪರೀಕ್ಷೆಯನ್ನು ಹುಡುಕಿ — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "ಎಲ್ಲಾ",
    "land.cat.GOVT_JOBS": "ಸರ್ಕಾರಿ ಉದ್ಯೋಗ",
    "land.cat.BANKING": "ಬ್ಯಾಂಕಿಂಗ್",
    "land.cat.CIVIL_SERVICES": "ನಾಗರಿಕ ಸೇವೆ",
    "land.cat.MEDICAL": "ವೈದ್ಯಕೀಯ",
    "land.cat.ENGINEERING": "ಎಂಜಿನಿಯರಿಂಗ್",
    "land.cat.TEACHING": "ಬೋಧನೆ",
    "land.cat.UNIVERSITY": "ವಿಶ್ವವಿದ್ಯಾಲಯ",
    "land.cat.MBA": "MBA",
    "land.cat.LAW": "ಕಾನೂನು",
    "land.cat.DEFENCE": "ರಕ್ಷಣಾ",
    "land.status.live": "ಲಭ್ಯವಿದೆ",
    "land.status.coming": "ಶೀಘ್ರದಲ್ಲೇ",
    "land.cta.start": "Google ನೊಂದಿಗೆ ಉಚಿತವಾಗಿ ಪ್ರಾರಂಭಿಸಿ →",
    "loop.title": "ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತದೆ — ಸರಳ ಲೂಪ್",
    "features.title": "ನಿಮ್ಮ ಪರೀಕ್ಷೆಯನ್ನು ಗೆಲ್ಲಲು ಬೇಕಾಗಿರುವ ಎಲ್ಲವೂ",
    "progress.title": "ನಿಮ್ಮ ಪ್ರಗತಿ, ಒಂದು ನೋಟದಲ್ಲಿ",
    "nav.signin": "Google ನೊಂದಿಗೆ ಸೈನ್ ಇನ್",
    "nav.signin.short": "ಸೈನ್ ಇನ್",
    "nav.dashboard": "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    "lang.switch": "ಭಾಷೆ",
  },

  // Malayalam (മലയാളം) — ~3.5Cr speakers (Kerala)
  ml: {
    "land.title": "നിങ്ങളുടെ പരീക്ഷ കണ്ടെത്തൂ.",
    "land.title.accent": "സൗജന്യമായി തയ്യാറാകൂ.",
    "land.subtitle": "ഇന്ത്യയിലെ മികച്ച 20 പരീക്ഷകൾ. വിദഗ്ദ്ധർ തയ്യാറാക്കിയ മോക്, Shishya AI പിന്തുണയോടെ. നിങ്ങൾ തയ്യാറാകുന്നതുവരെ ലളിതമായ ലൂപ്പ്.",
    "land.search.placeholder": "നിങ്ങളുടെ പരീക്ഷ തിരയുക — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "എല്ലാം",
    "land.cat.GOVT_JOBS": "സർക്കാർ ജോലി",
    "land.cat.BANKING": "ബാങ്കിംഗ്",
    "land.cat.CIVIL_SERVICES": "സിവിൽ സർവീസ്",
    "land.cat.MEDICAL": "മെഡിക്കൽ",
    "land.cat.ENGINEERING": "എഞ്ചിനീയറിംഗ്",
    "land.cat.TEACHING": "അധ്യാപനം",
    "land.cat.UNIVERSITY": "സർവകലാശാല",
    "land.cat.MBA": "MBA",
    "land.cat.LAW": "നിയമം",
    "land.cat.DEFENCE": "പ്രതിരോധം",
    "land.status.live": "ലഭ്യമാണ്",
    "land.status.coming": "ഉടൻ",
    "land.cta.start": "Google ഉപയോഗിച്ച് സൗജന്യമായി ആരംഭിക്കുക →",
    "loop.title": "എങ്ങനെ പ്രവർത്തിക്കുന്നു — ഒരു ലളിത ലൂപ്പ്",
    "features.title": "നിങ്ങളുടെ പരീക്ഷ വിജയിക്കാൻ ആവശ്യമായ എല്ലാം",
    "progress.title": "നിങ്ങളുടെ പുരോഗതി, ഒറ്റ നോട്ടത്തിൽ",
    "nav.signin": "Google ഉപയോഗിച്ച് സൈൻ ഇൻ ചെയ്യുക",
    "nav.signin.short": "സൈൻ ഇൻ",
    "nav.dashboard": "ഡാഷ്ബോർഡ്",
    "lang.switch": "ഭാഷ",
  },

  // Punjabi (ਪੰਜਾਬੀ) — ~3.3Cr speakers (Punjab)
  pa: {
    "land.title": "ਆਪਣੀ ਪ੍ਰੀਖਿਆ ਲੱਭੋ।",
    "land.title.accent": "ਮੁਫ਼ਤ ਤਿਆਰੀ ਕਰੋ।",
    "land.subtitle": "ਭਾਰਤ ਦੀਆਂ ਚੋਟੀ ਦੀਆਂ 20 ਪ੍ਰੀਖਿਆਵਾਂ। ਮਾਹਰਾਂ ਦੁਆਰਾ ਤਿਆਰ ਮੌਕ, Shishya AI ਦੀ ਮਦਦ ਨਾਲ। ਜਦੋਂ ਤੱਕ ਤੁਸੀਂ ਤਿਆਰ ਨਹੀਂ ਹੋ ਜਾਂਦੇ — ਇੱਕ ਸਧਾਰਨ ਲੂਪ।",
    "land.search.placeholder": "ਆਪਣੀ ਪ੍ਰੀਖਿਆ ਖੋਜੋ — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "ਸਾਰੇ",
    "land.cat.GOVT_JOBS": "ਸਰਕਾਰੀ ਨੌਕਰੀ",
    "land.cat.BANKING": "ਬੈਂਕਿੰਗ",
    "land.cat.CIVIL_SERVICES": "ਸਿਵਲ ਸੇਵਾ",
    "land.cat.MEDICAL": "ਮੈਡੀਕਲ",
    "land.cat.ENGINEERING": "ਇੰਜੀਨੀਅਰਿੰਗ",
    "land.cat.TEACHING": "ਅਧਿਆਪਨ",
    "land.cat.UNIVERSITY": "ਯੂਨੀਵਰਸਿਟੀ",
    "land.cat.MBA": "MBA",
    "land.cat.LAW": "ਕਾਨੂੰਨ",
    "land.cat.DEFENCE": "ਰੱਖਿਆ",
    "land.status.live": "ਉਪਲਬਧ",
    "land.status.coming": "ਜਲਦੀ",
    "land.cta.start": "Google ਨਾਲ ਮੁਫ਼ਤ ਸ਼ੁਰੂ ਕਰੋ →",
    "loop.title": "ਇਹ ਕਿਵੇਂ ਕੰਮ ਕਰਦਾ ਹੈ — ਇੱਕ ਸਧਾਰਨ ਲੂਪ",
    "features.title": "ਆਪਣੀ ਪ੍ਰੀਖਿਆ ਪਾਸ ਕਰਨ ਲਈ ਸਭ ਕੁਝ",
    "progress.title": "ਤੁਹਾਡੀ ਤਰੱਕੀ, ਇੱਕ ਨਜ਼ਰ ਵਿੱਚ",
    "nav.signin": "Google ਨਾਲ ਸਾਈਨ ਇਨ ਕਰੋ",
    "nav.signin.short": "ਸਾਈਨ ਇਨ",
    "nav.dashboard": "ਡੈਸ਼ਬੋਰਡ",
    "lang.switch": "ਭਾਸ਼ਾ",
  },

  // Urdu (اردو) — ~5Cr speakers · RTL script
  ur: {
    "land.title": "اپنا امتحان تلاش کریں۔",
    "land.title.accent": "مفت تیاری کریں۔",
    "land.subtitle": "بھارت کے سرفہرست 20 امتحانات۔ ماہرین کے تیار کردہ ماک، Shishya AI کی مدد سے۔ جب تک آپ تیار نہ ہو جائیں — ایک سادہ لوپ۔",
    "land.search.placeholder": "اپنا امتحان تلاش کریں — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "سب",
    "land.cat.GOVT_JOBS": "سرکاری ملازمت",
    "land.cat.BANKING": "بینکنگ",
    "land.cat.CIVIL_SERVICES": "سول سروس",
    "land.cat.MEDICAL": "میڈیکل",
    "land.cat.ENGINEERING": "انجینئرنگ",
    "land.cat.TEACHING": "تدریس",
    "land.cat.UNIVERSITY": "یونیورسٹی",
    "land.cat.MBA": "MBA",
    "land.cat.LAW": "قانون",
    "land.cat.DEFENCE": "دفاع",
    "land.status.live": "دستیاب",
    "land.status.coming": "جلد",
    "land.cta.start": "Google سے مفت شروع کریں ←",
    "loop.title": "یہ کیسے کام کرتا ہے — ایک سادہ لوپ",
    "features.title": "اپنا امتحان پاس کرنے کے لیے سب کچھ",
    "progress.title": "آپ کی پیش رفت، ایک نظر میں",
    "nav.signin": "Google سے سائن ان کریں",
    "nav.signin.short": "سائن ان",
    "nav.dashboard": "ڈیش بورڈ",
    "lang.switch": "زبان",
  },

  // ─────────────────────────────────────────────────────────────────────
  // Less-densely-spoken scheduled languages.
  // Smaller dictionaries — most keys gracefully fall back to English.
  // Native speakers can contribute fuller translations as the platform grows.
  // ─────────────────────────────────────────────────────────────────────

  // Odia (ଓଡ଼ିଆ) — Odisha
  or: {
    "land.title": "ଆପଣଙ୍କ ପରୀକ୍ଷା ଖୋଜନ୍ତୁ।",
    "land.title.accent": "ମାଗଣାରେ ପ୍ରସ୍ତୁତ ହୁଅନ୍ତୁ।",
    "land.subtitle": "ଭାରତର ଶୀର୍ଷ ୨୦ ପରୀକ୍ଷା। AI ନିର୍ମିତ ମକ୍। ଆପଣ ପ୍ରସ୍ତୁତ ହେବା ପର୍ଯ୍ୟନ୍ତ ଏକ ସରଳ ଲୁପ୍।",
    "land.search.placeholder": "ଆପଣଙ୍କ ପରୀକ୍ଷା ଖୋଜନ୍ତୁ — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "ସମସ୍ତ",
    "land.cta.start": "Google ସହିତ ମାଗଣାରେ ଆରମ୍ଭ କରନ୍ତୁ →",
    "nav.signin.short": "ସାଇନ୍ ଇନ୍",
    "lang.switch": "ଭାଷା",
  },

  // Assamese (অসমীয়া) — Assam
  as: {
    "land.title": "আপোনাৰ পৰীক্ষা বিচাৰক।",
    "land.title.accent": "বিনামূলে প্ৰস্তুতি লওক।",
    "land.subtitle": "ভাৰতৰ শীৰ্ষ ২০ পৰীক্ষা। AI-নিৰ্মিত মক। আপুনি প্ৰস্তুত নোহোৱালৈকে এটা সৰল লুপ।",
    "land.search.placeholder": "আপোনাৰ পৰীক্ষা বিচাৰক — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "সকলো",
    "land.cta.start": "Google ৰ সৈতে বিনামূলে আৰম্ভ কৰক →",
    "nav.signin.short": "ছাইন ইন",
    "lang.switch": "ভাষা",
  },

  // Nepali (नेपाली) — Sikkim, Darjeeling region
  ne: {
    "land.title": "तपाईंको परीक्षा खोज्नुहोस्।",
    "land.title.accent": "निःशुल्क तयारी गर्नुहोस्।",
    "land.subtitle": "भारतका शीर्ष २० परीक्षाहरू। AI द्वारा निर्मित मक। तपाईं तयार नहुन्जेल एउटा सरल लूप।",
    "land.search.placeholder": "तपाईंको परीक्षा खोज्नुहोस् — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "सबै",
    "land.cta.start": "Google सँग निःशुल्क सुरु गर्नुहोस् →",
    "nav.signin.short": "साइन इन",
    "lang.switch": "भाषा",
  },

  // Sanskrit (संस्कृतम्) — heritage / classical language
  sa: {
    "land.title": "स्वस्य परीक्षां अन्विष्यतु।",
    "land.title.accent": "निःशुल्कं सज्जीभवतु।",
    "land.subtitle": "भारतस्य शीर्षाणि विंशतिः परीक्षाः। विशेषज्ञैः निर्मिताः अनुकरणपरीक्षाः, Shishya AI सहाय्येन। यावत् सज्जः न भवसि तावत् सरलं चक्रम्।",
    "land.search.placeholder": "स्वपरीक्षां अन्विष्यतु — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "सर्वम्",
    "land.cta.start": "Google द्वारा निःशुल्कम् आरभतु →",
    "nav.signin.short": "प्रवेशः",
    "lang.switch": "भाषा",
  },

  // Konkani (कोंकणी) — Goa, coastal Karnataka
  kok: {
    "land.title": "तुमची परीक्षा सोदात.",
    "land.title.accent": "फुकट तयारी करात.",
    "land.subtitle": "भारतांतल्यो उच्च 20 परीक्षा. तज्ज्ञांनी रचलेले मॉक, Shishya AI च्या आधारान. तुमी तयार जायसर एक सादो चक्र.",
    "land.search.placeholder": "तुमची परीक्षा सोदात — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "सगळे",
    "land.cta.start": "Google वरवीं फुकट सुरू करात →",
    "nav.signin.short": "साइन इन",
    "lang.switch": "भास",
  },

  // Manipuri / Meitei (মৈতৈলোন্) — Manipur (uses Bengali script for general use)
  mni: {
    "land.title": "অদোমগী ৱাহং থিদোক্কু।",
    "land.title.accent": "ফংনা শেমগৎলু।",
    "land.subtitle": "ভারতকী মতেং অহন্বা ২০ ৱাহংশিং। AI না সেমখিবা মক। অদোম শেম-শা না নাইদ্রিবা ফাওবা অমা সিম্পল লুপ।",
    "land.search.placeholder": "অদোমগী ৱাহং থিদোক্কু — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "পুম্নমক",
    "land.cta.start": "Google গা ফংনা হৌরকপীয়ু →",
    "nav.signin.short": "সাইন ইন",
    "lang.switch": "লোন্",
  },

  // Kashmiri (کٲشُر) — Kashmir, RTL
  ks: {
    "land.title": "اَپنہٕ اِمتِحان تَلاش کٔریو۔",
    "land.title.accent": "مُفت تَیّٲری کٔریو۔",
    "land.subtitle": "ہِندوستٲنُک ٹاپ ۲۰ اِمتِحان۔ AI نَمونہٕ ٹیسٹ۔ تٔمی پؠٹھ تَیّار گٔژھتاوُن یَتھ تام آسان لوپ۔",
    "land.search.placeholder": "پَنُن اِمتِحان تَلاش کٔریو — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "سٲری",
    "land.cta.start": "Google سٕتؠ مُفت شُروع کٔریو ←",
    "nav.signin.short": "سائن اِن",
    "lang.switch": "زبان",
  },

  // Sindhi (سنڌي) — Sindhi-speaking community, RTL
  sd: {
    "land.title": "پنھنجو امتحان ڳوليو.",
    "land.title.accent": "مفت تياري ڪريو.",
    "land.subtitle": "ھندستان جا ٽاپ 20 امتحان. AI ٺاھيل ماڪ. جيستائين توھان تيار نه ٿيو، ھڪ سادو لوپ.",
    "land.search.placeholder": "پنھنجو امتحان ڳوليو — SSC, NEET, JEE, UPSC, CAT…",
    "land.cat.all": "سڀ",
    "land.cta.start": "Google سان مفت شروع ڪريو ←",
    "nav.signin.short": "سائن ان",
    "lang.switch": "ٻولي",
  },
} as const;

export type StringKey = keyof typeof dict.en;

/** Translate a key into the given locale; falls back to English on miss. */
export function tk(key: StringKey, locale: Locale = "en"): string {
  return (dict[locale] as any)[key] ?? dict.en[key];
}
