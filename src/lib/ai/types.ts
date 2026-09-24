// Shared types for the Shishya AI pipeline.
// Every AI service consumes/produces these so the UI and DB layers are decoupled.

export type Language = "EN" | "HI" | "TE" | "TA" | "KN" | "ML" | "MR" | "BN" | "GU" | "PA";

export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface QuestionRef {
  id: string;
  topicId: string;
  topicCode: string;
  difficulty: Difficulty;
}

export interface QuestionFull extends QuestionRef {
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  language: Language;
}

export interface AnswerRecord {
  questionId: string;
  chosen: string | null;
  correct: boolean;
  timeSec: number;
  marked: boolean;
}

export interface AttemptSnapshot {
  attemptId: string;
  mockId: string;
  examCode: string;
  startedAt: string;
  finishedAt: string | null;
  durationSec: number | null;
  answers: AnswerRecord[];
  scoreRaw: number;
  scoreMax: number;
  scorePct: number;
  topicScores: Record<string, { correct: number; total: number; score: number }>;
}

export interface TopicMastery {
  topicId: string;
  topicCode: string;
  topicName: string;
  masteryScore: number; // 0..1
  attemptsCount: number;
  correctCount: number;
  avgTimeSec?: number;
}

export interface StudentState {
  userId: string;
  examCode: string;
  examName: string;
  preferredLang: Language;
  enrolledAt: string;
  targetDate?: string;
  weaknesses: TopicMastery[]; // sorted ascending by masteryScore
  strengths: TopicMastery[];  // sorted descending by masteryScore
  totalMocksTaken: number;
  lastMockScorePct?: number;
  bestMockScorePct?: number;
  recentTrend?: "IMPROVING" | "FLAT" | "DECLINING";
}

// ─────────────────────────────────────────────────────────────────────────
// Diagnostic Analyzer
// ─────────────────────────────────────────────────────────────────────────
export interface DiagnosticInput {
  attempt: AttemptSnapshot;
  syllabus: SyllabusContext;
  language: Language;
}

export interface DiagnosticOutput {
  summary: string;                    // human-readable, 2–3 sentences in student's language
  topicMastery: TopicMastery[];       // updated mastery per topic
  weaknessHighlights: string[];       // ["Profit & Loss is your weakest area", ...]
  recommendedActions: RecommendedAction[];
  estimatedReadiness: number;         // 0..100 — how ready for real exam
}

export interface RecommendedAction {
  kind: "TAKE_MOCK" | "STUDY_TOPIC" | "ASK_TUTOR" | "REVISE_MISTAKES";
  topicCode?: string;
  reason: string;
  priority: number; // 1 = highest
}

// ─────────────────────────────────────────────────────────────────────────
// Mock Generator
// ─────────────────────────────────────────────────────────────────────────
export interface GenerateMockInput {
  studentState: StudentState;
  request: GenerateMockRequest;
  availableQuestions: QuestionRef[]; // candidate pool from DB
  syllabus: SyllabusContext;
}

export type GenerateMockRequest =
  | { type: "DIAGNOSTIC"; questionCount: number }
  | { type: "ADAPTIVE"; questionCount: number; durationMin?: number }
  | { type: "TOPIC"; topicCode: string; questionCount: number; difficulty?: Difficulty }
  | { type: "SUBJECT"; subjectCode: string; questionCount: number }
  | { type: "FULL"; }
  | { type: "REVISION"; questionCount: number }
  | { type: "USER_REQUEST"; instruction: string; questionCount: number };

export interface GenerateMockOutput {
  title: string;
  rationale: string;            // why these questions were chosen, shown to student
  questionIds: string[];        // ordered
  durationMin: number;
  topicMix: Record<string, number>;     // topicCode -> count
  difficultyMix: Record<Difficulty, number>;
}

// ─────────────────────────────────────────────────────────────────────────
// AI Tutor (chat)
// ─────────────────────────────────────────────────────────────────────────
export interface TutorInput {
  studentState: StudentState;
  syllabus: SyllabusContext;
  history: ChatTurn[];
  userMessage: string;
  language: Language;
  /** Topic the student is currently focused on (set when the chat was
   *  opened from a study-notes page). Anchors the tutor to that topic. */
  topicFocus?: {
    code: string;
    name: string;
    subjectName: string;
    notesExcerpt: string | null;
  };
  /** Cross-session memory — past chats, today's brief, last mock, open
   *  recommended actions. Lets the tutor feel continuous instead of
   *  starting from scratch each session. */
  journey?: {
    examCode: string;
    threads: Array<{
      startedAt: string;
      examShort: string;
      openingMessage: string;
      topicCodes: string[];
    }>;
    topAskedTopics: Array<{ topicCode: string; count: number }>;
    todayBrief: { reflection: string; mockTitle: string | null } | null;
    lastMock: { date: string; scorePct: number; mockTitle: string; examShort: string } | null;
    openActions: Array<{ kind: string; topicCode?: string; reason: string }>;
  };
  /** True when the chat is in exam-agnostic "General Interaction" mode.
   *  Tutor skips syllabus + journey blocks, doesn't expose tools, and
   *  uses a generic persona suited to cross-exam Q&A. */
  generalMode?: boolean;
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface TutorOutput {
  reply: string;
  suggestedActions?: RecommendedAction[];
  citedTopics?: string[];     // topicCodes referenced in the reply
}

// ─────────────────────────────────────────────────────────────────────────
// Solution Explainer
// ─────────────────────────────────────────────────────────────────────────
export interface ExplainInput {
  question: QuestionFull;
  studentChosen: string | null;
  language: Language;
  detailLevel?: "BRIEF" | "STANDARD" | "DEEP";
}

export interface ExplainOutput {
  stepByStep: string[];
  whyChosenIsWrong?: string;
  similarConcepts?: string[];
  practiceTopicCode?: string;
  /** True when the AI thinks the marked answer key doesn't fit the
   *  question (e.g. broken jumble, insufficient data). UI uses this
   *  to invite the student to file a report instead of pretending to
   *  defend a bad answer. */
  keyDisputed?: boolean;
  keyDisputeReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Progress Coach
// ─────────────────────────────────────────────────────────────────────────
export interface CoachInput {
  studentState: StudentState;
  recentAttempts: AttemptSnapshot[];
  windowDays: number;
  language: Language;
}

export interface CoachOutput {
  weeklySummary: string;
  trendInsights: string[];
  goalForNextWeek: string;
  motivationalNudge: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Syllabus context — passed to most services for grounding
// ─────────────────────────────────────────────────────────────────────────
export interface SyllabusContext {
  examCode: string;
  examName: string;
  examShortName: string;
  subjects: Array<{
    code: string;
    name: string;
    weight: number;
    topics: Array<{
      code: string;
      name: string;
      description?: string;
      subtopics?: Array<{ code: string; name: string; description?: string }>;
    }>;
  }>;
  /** What the tutor's per-exam facts are built from (24 Sep 2026): the
   *  pattern from the Exam row, the exam's tracker rows and which exam pages
   *  exist. Loaded by getSyllabusContext; absent when the read failed or for
   *  the empty general-mode syllabus. Nothing in it depends on today's date:
   *  getSyllabusContext is an unstable_cache entry, and Next serves a STALE
   *  entry at once after an idle gap (revalidating in the background), so a
   *  "today" or "upcoming" baked in here could be days old. The date-relative
   *  facts are worked out when the prompt is built — buildTutorExamFacts in
   *  src/lib/ai/exam-facts.ts, called by tutorSystemBlocks. */
  examFacts?: TutorExamFactsSource;
}

/** A stored tracker row as the facts source carries it. JSON-safe (the
 *  cache round-trips through JSON), so `date` is the ISO string; `url` is
 *  already the row's citation (rowCitation: its url, else an http source). */
export interface TutorTrackerRow {
  id: string;
  label: string;
  date: string;
  isExamDay: boolean;
  kind: string | null;
  confidence: string | null;
  url: string | null;
}

/** The date-free input to buildTutorExamFacts, cached with the syllabus. */
export interface TutorExamFactsSource {
  exam: {
    code: string;
    name: string;
    shortName: string;
    description: string;
    totalQuestions: number;
    scoredQuestions: number | null;
    totalMarks: number;
    marksPerQ: number;
    negativeMark: number;
    durationMin: number;
    /** Language enum codes from Exam.languages. */
    languages: string[];
  };
  /** The exam's non-archived tracker rows, oldest first — every one of them
   *  (the /updates page shows them all), newest kept if the read's limit hit. */
  rows: TutorTrackerRow[];
  /** False when the read hit its row limit: then "the tracker has no row of
   *  this kind" cannot be claimed. */
  rowsComplete: boolean;
  officialUrl: string | null;
  officialName: string | null;
  /** Which gated exam sub-pages render (src/lib/exam-page-gates.ts); null = unknown. */
  pages: { cutoff: boolean; tricks: boolean; guide: boolean; syllabus: boolean; buildMock: boolean } | null;
  /** A "Full-Length Mock (Real Pattern)" paper exists; null = unknown. */
  fullPatternMock: boolean | null;
  /** Years with PYQ-pattern practice sets (/exams/{code}/pyq/{year}). */
  pyqYears: number[];
  /** Years with an official question paper in the hub's "Official papers" block. */
  officialPaperYears: string[];
}

/** One announced tracker row as the tutor is shown it. Expected-tier rows
 *  (estimates) never become one of these — see src/lib/ai/exam-facts.ts. */
export interface TutorTrackerDate {
  /** IST calendar day, YYYY-MM-DD. */
  day: string;
  /** The tracker's kind (NOTIFICATION, EXAM, RESULT …; src/lib/exam-timeline.ts). */
  kind: string;
  label: string;
  /** official = cited on the conducting body's own site; reported = announced
   *  but cited via a secondary source (src/lib/official-source.ts). */
  tier: "official" | "reported";
  /** Host of the cited notice, e.g. "ssc.gov.in" or "testbook.com". */
  host: string;
  status: "past" | "today" | "upcoming";
}

/** The facts as the prompt states them, worked out for one moment. */
export interface TutorExamFacts {
  /** IST day the prompt was built (YYYY-MM-DD) — the tutor's "today". */
  asOfDay: string;
  pattern: {
    totalQuestions: number;
    /** Set only when the paper asks more questions than it scores. */
    scoredQuestions: number | null;
    totalMarks: number;
    /** Null when src/lib/marking-scheme.ts cannot state one scheme. */
    marksPerQ: number | null;
    /** Why no per-question mark can be stated; null when it can. */
    markingNote: string | null;
    durationMin: number;
    negativeMark: number;
    /** Language enum codes from Exam.languages. */
    languages: string[];
  };
  /** The conducting body's site from ExamEligibility, when known. */
  officialPortal: { url: string; name: string | null } | null;
  /** Announced tracker rows (official + reported), oldest first: for every
   *  kind the latest past and the next upcoming row whatever their age, then
   *  the last 60 days to the next 12 months up to the cap. */
  dates: TutorTrackerDate[];
  /** Announced rows on the tracker (any age) that are not in `dates`. */
  datesOmitted: number;
  /** Kinds students ask about with NO official or reported row anywhere on
   *  the tracker; null when the rows read was incomplete (then unknown). */
  notAnnouncedKinds: string[] | null;
  /** Which gated exam sub-pages render (src/lib/exam-page-gates.ts); null = unknown. */
  pages: { cutoff: boolean; tricks: boolean; guide: boolean; syllabus: boolean; buildMock: boolean } | null;
  /** A "Full-Length Mock (Real Pattern)" paper exists; null = unknown. */
  fullPatternMock: boolean | null;
  /** Years with PYQ-pattern practice sets (/exams/{code}/pyq/{year}), newest first. */
  pyqYears: number[];
  /** Years ("2024", "2024-25" — as the body names them) with an official
   *  question paper in the hub's "Official papers" block, newest first. */
  officialPaperYears: string[];
}
