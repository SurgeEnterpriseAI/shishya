// The home page's meta description (27 Sep 2026).
//
// It was ~300 characters — every section, exam family and tool in one run —
// and search engines cut it at about 160. This is the whole platform in one
// line within HOME_META_MAX: the "one smart place to study" framing, what each
// section holds, the computed exam count (src/app/page.tsx loadPortalStats)
// and the tutor's language count (INDIAN_LANGUAGE_COUNT). Nothing is typed as
// a number; "free mock tests" is its own item, never a claim that every exam
// counted has one. A count too long to fit gives the number-free line.
// Pure; tests/unit/home-meta.test.ts.

export const HOME_META_MAX = 160;

export function homeMetaDescription(examCount: string, indianLanguages: number): string {
  const line = (exams: string) =>
    `One smart place to study: school chapters, ${exams}, free mock tests, colleges, scholarships, careers. A tutor in ${indianLanguages} Indian languages.`;
  const withCount = examCount.trim() ? line(`${examCount.trim()} government and entrance exams`) : "";
  return withCount && withCount.length <= HOME_META_MAX ? withCount : line("government and entrance exams");
}
