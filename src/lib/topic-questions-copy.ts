// Words of the "practice questions with answers" block on a topic page
// (29 Sep 2026) — en / hi / te; other locales read English.
//
// Honesty: the questions are Shishya's own practice questions, written with
// AI; the check on each answer is automated. The block says both, once, and
// never calls them the exam's questions or a past paper.

export interface TopicQuestionsCopy {
  /** {n} questions, {topic}, {exam} */
  heading: string;
  headingOne: string;
  notice: string;
  showAnswer: string;
  answer: string;
  solution: string;
  report: string;
  /** {topic}, {exam} */
  quizLink: string;
}

const COPY: Record<"en" | "hi" | "te", TopicQuestionsCopy> = {
  en: {
    heading: "{n} practice questions on {topic} for {exam}, with answers",
    headingOne: "A practice question on {topic} for {exam}, with its answer",
    notice: "Shishya's practice questions, written with AI. Each answer was checked by an automated second pass, not by a person.",
    showAnswer: "Show the answer and solution",
    answer: "Answer",
    solution: "Solution",
    report: "Report an error",
    quizLink: "Take these as a quiz →",
  },
  hi: {
    heading: "{exam} के लिए {topic} पर {n} अभ्यास प्रश्न, उत्तर सहित",
    headingOne: "{exam} के लिए {topic} पर एक अभ्यास प्रश्न, उत्तर सहित",
    notice: "Shishya के अभ्यास प्रश्न, AI से लिखे गए। हर उत्तर की जाँच एक स्वचालित दूसरी जाँच ने की है, किसी व्यक्ति ने नहीं।",
    showAnswer: "उत्तर और हल देखें",
    answer: "उत्तर",
    solution: "हल",
    report: "ग़लती बताएँ",
    quizLink: "इन्हें क्विज़ की तरह हल करें →",
  },
  te: {
    heading: "{exam} కోసం {topic} పై {n} సాధన ప్రశ్నలు, జవాబులతో",
    headingOne: "{exam} కోసం {topic} పై ఒక సాధన ప్రశ్న, జవాబుతో",
    notice: "Shishya సాధన ప్రశ్నలు, AI తో రాసినవి. ప్రతి జవాబును ఒక ఆటోమేటిక్ రెండో తనిఖీ సరిచూసింది, మనిషి కాదు.",
    showAnswer: "జవాబు, సాధన చూడండి",
    answer: "జవాబు",
    solution: "సాధన",
    report: "తప్పు తెలియజేయండి",
    quizLink: "వీటిని క్విజ్‌గా రాయండి →",
  },
};

export function topicQuestionsCopy(locale: string | null | undefined): TopicQuestionsCopy {
  return locale === "hi" || locale === "te" ? COPY[locale] : COPY.en;
}

export function fillTopicQuestions(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}
