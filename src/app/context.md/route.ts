// GET /context.md — the whole-platform machine brief (26 Sep 2026,
// B-machine-crawl).
//
// The per-exam, per-state and per-class context files existed; nothing told
// an answer engine what Shishya is as a whole — every section, its hub, its
// counts and its own context file — in one cheap fetch. This is that file:
// the computed platform description (src/lib/section-context.ts; the counts
// from src/lib/platform-counts.ts, the school surface and the static data
// files — none typed), then one block per section. A failed count read
// prints the number-free description instead. Headers as the exam context
// files, plus an HTTP canonical link to the home page. Logged, never
// changed, by the middleware (OBSERVE_ONLY).

import { istDay } from "@/lib/exam-week";
import { locales } from "@/lib/i18n";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { ALL_STREAMS, COLLEGES, NIRF_SOURCE_YEAR } from "@/lib/colleges-data";
// 26 Sep 2026 (repair): the schemes, never the one outside aggregator
// (Buddy4Study) the raw catalogue holds — src/lib/scholarship-schemes.ts.
import { SCHOLARSHIP_SCHEMES } from "@/lib/scholarship-schemes";
import { CAREERS } from "@/data/careers";
import { TEST_PREP, WORLDWIDE_COUNTRIES } from "@/lib/worldwide-data";
import { PERSONAS } from "@/data/personas";
import { INSIGHTS_ARTICLES } from "@/data/insights-articles";
import { loadSchoolSurface, schoolSurfaceCounts } from "@/lib/school/surface";
import { loadCheckedQuestionCount, loadRealExamCatalog } from "@/lib/platform-counts";
import { SITE, contextMarkdownHeaders, languagesLine, ncertChapterCount, platformContextMarkdown, type PlatformCounts } from "@/lib/section-context";
// 27 Sep 2026 (wave 2 search): the wave's page families, from the sitemap's own list.
import { familyBriefLines, loadFamilyLinks } from "@/lib/page-families-brief";

export const revalidate = 3600;

export async function GET() {
  const [exams, checked, school, families] = await Promise.all([
    loadRealExamCatalog().catch(() => null),
    loadCheckedQuestionCount().catch(() => null),
    loadSchoolSurface().catch(() => null),
    loadFamilyLinks(SITE),
  ]);
  const liveExams = exams && exams.length > 0 ? exams : null;
  const liveSchool = school && school.classes.length > 0 ? school : null;
  const sc = liveSchool ? schoolSurfaceCounts(liveSchool) : null;
  const counts: PlatformCounts | null =
    liveExams && checked !== null && checked > 0 && liveSchool && sc
      ? {
          exams: liveExams.length,
          checkedQuestions: checked,
          ncertChapters: ncertChapterCount(liveSchool),
          chaptersWithOurContent: sc.indexableChapters,
          chaptersWithNotes: sc.chaptersWithNotes,
          chaptersWithPractice: sc.chaptersWithPractice,
          colleges: COLLEGES.length,
          nirfYear: NIRF_SOURCE_YEAR,
          scholarships: SCHOLARSHIP_SCHEMES.length,
          careers: CAREERS.length,
          indianLanguages: INDIAN_LANGUAGE_COUNT,
        }
      : null;
  const md = platformContextMarkdown(
    {
      counts,
      indianLanguages: INDIAN_LANGUAGE_COUNT,
      exams: liveExams,
      school: liveSchool,
      colleges: COLLEGES,
      streams: ALL_STREAMS,
      nirfYear: NIRF_SOURCE_YEAR,
      scholarships: SCHOLARSHIP_SCHEMES,
      careers: CAREERS,
      countries: WORLDWIDE_COUNTRIES,
      testPrep: TEST_PREP,
      personas: PERSONAS,
      insights: INSIGHTS_ARTICLES,
      languages: languagesLine(locales),
    },
    istDay(new Date()),
  );
  // 27 Sep 2026: point answer engines at the public numbers (each with its
  // definition and date), the weekly Pulse note and the press kit.
  const transparency = [
    "",
    "## Transparency",
    `- Shishya in numbers: ${SITE}/shishya-in-numbers (markdown ${SITE}/shishya-in-numbers/context.md)`,
    `- Shishya Pulse, weekly data note: ${SITE}/pulse (markdown ${SITE}/pulse/context.md)`,
    `- Press kit: ${SITE}/press`,
    "",
  ].join("\n");
  // 27 Sep 2026 (wave 2 search): the pages that list or compare across exams,
  // subjects and boards — the sitemap's own list, each labelled from its
  // family's data (src/lib/page-families-brief.ts); none when none may be indexed.
  const familyBlock = familyBriefLines(families).join("\n");
  return new Response(md + transparency + (familyBlock ? `\n${familyBlock}` : ""), { headers: contextMarkdownHeaders(`${SITE}/`) });
}
