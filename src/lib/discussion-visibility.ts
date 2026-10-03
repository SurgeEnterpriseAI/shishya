// Which discussion rows a visitor, a crawler or an API caller may see (3 Oct 2026).
// A thread is a STUDENT thread only when a signed-in account started it: POST /api/discussions
// always sets authorId and nothing in the app nulls it. Every other row was written by Shishya:
// the 34 threads of the retired seed/discussions*.ts scripts (7–9 May 2026, invented names,
// marked isSeed = TRUE on 3 Oct 2026 by scripts/mark-seeded-discussions.ts), the retired cron's
// "starter questions", and topic study rooms. Shishya-written threads are never shown as a
// discussion; a study room opens by its own link only.
// No prisma import, so the rule is unit-testable (tests/unit/discussion-honesty.test.ts).

export interface ThreadVisibility {
  authorId: string | null;
  isSeed: boolean;
  topicCode: string | null;
}

/** Started by a signed-in student — the only kind of thread a list shows. */
export const isStudentThread = (t: ThreadVisibility): boolean => t.authorId !== null && !t.isSeed;

/** A topic study room: Shishya-made, opened from its topic page by its own link. */
export const isStudyRoom = (t: ThreadVisibility): boolean => t.topicCode !== null;

/** May the thread page / thread API return it at all? */
export const isReadableThread = (t: ThreadVisibility): boolean => isStudentThread(t) || isStudyRoom(t);

/** Prisma `where` for every list and count of threads shown as student activity. */
export const STUDENT_THREAD_WHERE = { authorId: { not: null }, isSeed: false } as const;

/** false until the founder opens student threads to search engines; next.config.ts sends the
 *  matching X-Robots-Tag "noindex, follow" on /discussions and /discussions/* (tests keep the
 *  two in step: tests/unit/robots-headers.test.ts). */
export const DISCUSSIONS_INDEXABLE: boolean = false;
