// School notes provenance comment (26 Sep 2026).
//
// Why its own file: scripts/school-content-batch.ts stores each chapter's
// provenance (class, book, chapter, official URL, prompt version, run) as an
// HTML comment at the end of the note's markdown (content-plan.ts). The
// school pages strip it before rendering, and they must not import
// content-plan.ts for that — it pulls content-prompts.ts and with it the
// Anthropic client into a page bundle. content-plan.ts re-exports these, so
// the runner and its tests are unchanged.

export const PROVENANCE_COMMENT_PREFIX = "<!-- shishya-school-batch provenance ";

export interface NotesProvenance {
  pipeline: "school-batch-v1";
  promptVersion: string;
  model: string;
  runId: string;
  producedAt: string;
  class: number;
  examCode: string;
  subject: string;
  book: string;
  bookTitle: string;
  chapter: string | null;
  chapterTitle: string;
  topicCode: string;
  officialUrl: string;
  /** What the model was given: the chapter identity only — never textbook text. */
  groundedIn: string[];
}

/** Stored notes without the provenance comment — what a page renders and what a later Phase G run feeds the MCQ prompt as grounding. */
export function stripProvenanceComment(content: string): string {
  const i = content.lastIndexOf(PROVENANCE_COMMENT_PREFIX);
  if (i < 0) return content;
  const end = content.indexOf(" -->", i);
  return (end < 0 ? content.slice(0, i) : content.slice(0, i) + content.slice(end + 4)).trimEnd();
}

/** Reads the provenance comment back from stored notes (null when absent — a govt-exam note). */
export function readProvenanceComment(content: string): NotesProvenance | null {
  const i = content.lastIndexOf(PROVENANCE_COMMENT_PREFIX);
  if (i < 0) return null;
  const end = content.indexOf(" -->", i);
  if (end < 0) return null;
  try {
    return JSON.parse(content.slice(i + PROVENANCE_COMMENT_PREFIX.length, end)) as NotesProvenance;
  } catch {
    return null;
  }
}
