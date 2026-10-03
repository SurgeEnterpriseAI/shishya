// IndexNow — the written-content kinds (3 Oct 2026, fix C16).
//
// Four kinds of page change only when a generator writes a row, and none of
// them was ever pinged: exam topic notes (TopicTeachingNote, 4,345 rows),
// Hindi notes (TopicNoteTranslation "hi", 420), guides (ExamGuide, 178) and
// tricks (ExamTricks, 177). Each writer sets generatedAt to now on a rewrite,
// so the news cron (src/app/api/cron/indexnow/route.ts) reads the rows written
// in its own window and sends their pages through this builder.
//
// Pure: no DB, no clock, no network. The URL shapes are the sitemap's own
// (src/app/sitemap.ts: guideUrls, tricksUrls, topicUrls, hindiTopicUrls).
// Kept out of src/lib/indexnow.ts on purpose (that file carries unreleased
// work on 3 Oct 2026).

import { SITE_ORIGIN } from "@/lib/indexnow";

/** The most content URLs one cron run sends; the rest wait for the sitemap.
 *  A bulk rewrite (321 notes on 13 Sep) fits; a whole-corpus rewrite does not. */
export const CONTENT_CAP = 1_000;

/** One topic note: the exam code and the topic code. */
export interface TopicRef {
  exam: string;
  topic: string;
}

export interface ContentRows {
  /** Exam codes whose guide was written in the window. */
  guides: readonly string[];
  /** Exam codes whose tricks page was written in the window. */
  tricks: readonly string[];
  /** Topic notes written in the window. */
  notes: readonly TopicRef[];
  /** Hindi notes written in the window. */
  hindi: readonly TopicRef[];
}

export interface ContentUpdateUrls {
  /** De-duplicated, in the order guides, tricks, notes, Hindi notes; at most `cap`. */
  urls: string[];
  /** How many distinct URLs were left out by the cap (0 when none). */
  overCap: number;
}

/** The pages to ping for content written in a window: /exams/{code}/guide,
 *  /exams/{code}/tricks, /exams/{code}/topics/{topic} and
 *  /exams/{code}/topics/{topic}/hi, in that order, de-duplicated, cut at the cap. */
export function contentUpdateUrls(rows: ContentRows, cap: number = CONTENT_CAP, base: string = SITE_ORIGIN): ContentUpdateUrls {
  const all = new Set<string>();
  for (const code of rows.guides) if (code) all.add(`${base}/exams/${code}/guide`);
  for (const code of rows.tricks) if (code) all.add(`${base}/exams/${code}/tricks`);
  for (const n of rows.notes) if (n.exam && n.topic) all.add(`${base}/exams/${n.exam}/topics/${n.topic}`);
  for (const n of rows.hindi) if (n.exam && n.topic) all.add(`${base}/exams/${n.exam}/topics/${n.topic}/hi`);
  const list = [...all];
  const limit = Math.max(0, Math.floor(cap));
  return { urls: list.slice(0, limit), overCap: Math.max(0, list.length - limit) };
}
