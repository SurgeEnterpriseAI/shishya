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
}
