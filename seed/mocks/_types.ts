// Shared types for system mock-test seeds.
// "System" mocks have userId = null and are visible to every user enrolled
// in the exam. AI-personalised mocks are generated per-user at runtime
// (see src/lib/ai/generator.ts) and are NOT seeded.

export interface SystemMock {
  /** Exam code in our DB, e.g. "SSC_CGL". Must already be seeded. */
  examCode: string;
  /**
   * Stable identifier inside the exam. Used for upsert. Examples:
   *   "full-length-1", "topic-percentage-easy", "previous-year-sscale-2024"
   */
  slug: string;
  title: string;
  type: "FULL_LENGTH" | "TOPIC_DRILL" | "MIXED" | "PYQ_FULL";
  /**
   * How questions are picked when the user starts an attempt.
   *  - PRESET_IDS: an explicit ordered list (e.g. a real PYQ paper).
   *  - TOPIC_FILTER: pull N validated questions matching topic + difficulty filter.
   */
  picker:
    | { kind: "PRESET_IDS"; questionTags: string[] /* tag prefix e.g. pyq:SSC_CGL:2024:shift-1 */ }
    | {
        kind: "TOPIC_FILTER";
        topicCodes: string[];
        difficultyMix: { EASY: number; MEDIUM: number; HARD: number };
        count: number;
      };
  durationMin: number;
  description?: string;
}
