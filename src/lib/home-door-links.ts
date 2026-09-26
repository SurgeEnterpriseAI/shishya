// The home doors' data-driven links (26 Sep 2026, entry points).
//
// Why: the home page is the page AI assistants fetch most (28 days to
// 26 Sep 2026: ChatGPT-User 754 and OAI-SearchBot 2,194 fetches — probe
// scripts/tmp-w2-complete.ts), yet its doors linked two robots-blocked filter
// URLs (/exams/browse?category=OLYMPIAD / =BANKING; robots.txt disallows
// '/exams/browse?*') and none of the new list pages. Every link here renders
// only while its page clears that page's OWN floor, computed from the same
// data the page itself reads:
//   • Banking chip → /exams/category/banking while that hub is live
//     (EXAM_CATEGORY_MIN over the cached exam rows); otherwise no chip — the
//     Government door's "All exams" link already opens /exams/browse.
//   • Olympiads chip → /exams/entrance#entrance-olympiad. Olympiads have no
//     category hub (examsInCategory leaves them out); the entrance hub lists
//     them under their own heading (id "entrance-olympiad").
//   • Exams after 12th / after graduation → /exams/after/{slug} while
//     indexable (isLevelIndexable). Postgraduation is held and never linked.
//   • Scholarships closing soon → /scholarships/closing-soon while it has
//     CLOSING_SOON_MIN schemes for today's IST date (static data, no DB).
//   • CBSE Class 10 / 12 board exam → each board-exam hub that clears
//     BOARD_EXAM_MIN_LINKS (static data, no DB).
//   • PG entrance exams on Shishya ({n}) → /post-graduation#pg-entrances,
//     n = the active rows among PG_ENTRANCE_CODES; hidden at 0.
// When the exam rows cannot be read (DB down), the DB-derived links drop out
// and the doors keep their fixed links — nothing is guessed.
// Pure except loadHomeDoorLinks (a lazy import of the cached loader), so
// tests/unit/home-door-links.test.ts runs without a DB.

import { examsInCategory, findExamCategory, isCategoryLive, type ExamCategorySlug, type ExamLike } from "@/lib/exam-categories";
import { entranceGroupOf } from "@/lib/exam-kind";
import { examsAfter, findQualificationLevel, isLevelIndexable } from "@/lib/exam-qualification";
import { closingSoon, isClosingSoonIndexable, istToday } from "@/lib/scholarship-lists";
import { BOARD_EXAM_HUBS, type BoardExamClass } from "@/data/board-exams";
import { boardExamPath, isBoardExamIndexable } from "@/lib/board-exams";
import { pgEntranceCount } from "@/lib/pg-entrances";

/** The entrance hub's olympiad heading (src/app/exams/entrance/page.tsx
 *  renders id={`entrance-${g.key}`}; the group key is "olympiad"). */
export const OLYMPIADS_HREF = "/exams/entrance#entrance-olympiad";
export const PG_ENTRANCES_HREF = "/post-graduation#pg-entrances";
export const CLOSING_SOON_HREF = "/scholarships/closing-soon";

/** The qualification pages the Government door may link, in order. */
export const HOME_AFTER_LEVELS = ["12th", "graduation"] as const;
export type HomeAfterLevel = (typeof HOME_AFTER_LEVELS)[number];

export interface HomeDoorLinks {
  /** /exams/category/banking while live, else null. */
  banking: string | null;
  /** Olympiads on the entrance hub; null only when the rows show none. */
  olympiads: string | null;
  /** The indexable qualification pages among HOME_AFTER_LEVELS. */
  after: { level: HomeAfterLevel; href: string }[];
  /** /scholarships/closing-soon while it clears its floor, else null. */
  closingSoon: string | null;
  /** The indexable CBSE board-exam hubs, by class. */
  boardExams: { cls: BoardExamClass; href: string }[];
  /** The PG entrance exams link with its computed count; null at 0 or unknown. */
  pgEntrances: { href: string; n: number } | null;
}

/** /exams/category/{slug} while that hub has its floor of exams, else null. */
export function liveCategoryHref(slug: ExamCategorySlug, rows: readonly ExamLike[]): string | null {
  const cat = findExamCategory(slug);
  if (!cat) return null;
  return isCategoryLive(examsInCategory(cat, rows)) ? `/exams/category/${cat.slug}` : null;
}

/** The HOME_AFTER_LEVELS pages that are indexable over these rows. */
export function indexableAfterLinks(rows: readonly ExamLike[]): HomeDoorLinks["after"] {
  const out: HomeDoorLinks["after"] = [];
  for (const slug of HOME_AFTER_LEVELS) {
    const level = findQualificationLevel(slug);
    if (level && isLevelIndexable(level, examsAfter(level, rows))) out.push({ level: slug, href: `/exams/after/${slug}` });
  }
  return out;
}

/** /scholarships/closing-soon while it clears CLOSING_SOON_MIN on `today` (IST day). */
export function closingSoonHref(today: string): string | null {
  return isClosingSoonIndexable(closingSoon(today)) ? CLOSING_SOON_HREF : null;
}

/** The CBSE board-exam hubs that clear their floor. */
export function boardExamHubLinks(): HomeDoorLinks["boardExams"] {
  return BOARD_EXAM_HUBS.filter(isBoardExamIndexable).map((h) => ({ cls: h.cls, href: boardExamPath(h) }));
}

/** The PG entrance link with its count, or null when no such exam is active. */
export function pgEntrancesLink(rows: readonly { code: string }[]): HomeDoorLinks["pgEntrances"] {
  const n = pgEntranceCount(rows);
  return n > 0 ? { href: PG_ENTRANCES_HREF, n } : null;
}

/** Every data-driven door link. `rows` = the active exam rows, or null when
 *  they could not be read (then only the static-data links render, and the
 *  olympiad chip keeps pointing at the entrance hub, which always exists). */
export function homeDoorLinks(rows: readonly ExamLike[] | null, today: string): HomeDoorLinks {
  return {
    banking: rows ? liveCategoryHref("banking", rows) : null,
    olympiads: !rows || rows.some((r) => entranceGroupOf(r) === "olympiad") ? OLYMPIADS_HREF : null,
    after: rows ? indexableAfterLinks(rows) : [],
    closingSoon: closingSoonHref(today),
    boardExams: boardExamHubLinks(),
    pgEntrances: rows ? pgEntrancesLink(rows) : null,
  };
}

/** The links for this render: the cached exam rows (hourly, the same read the
 *  category, qualification and entrance pages use) and today's IST day. */
export async function loadHomeDoorLinks(now: Date = new Date()): Promise<HomeDoorLinks> {
  let rows: ExamLike[] | null = null;
  try {
    const { getExamListRows } = await import("@/lib/exam-list-rows");
    rows = await getExamListRows();
  } catch (err) {
    console.error("[shishya/home-door-links] exam rows unavailable; DB-derived door links hidden:", err);
  }
  return homeDoorLinks(rows, istToday(now));
}
