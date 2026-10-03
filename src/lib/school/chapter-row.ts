// Where Shishya sends someone for a school chapter (3 Oct 2026, school growth).
// PURE, no imports: the search wire decoder (src/lib/search/index-codec.ts)
// runs in the browser.
//
// A chapter with no Shishya content — no notes and under 5 checked questions
// (the surface's `indexable` is false; its page is noindex and says "not
// ready yet") — is no longer linked from its subject page or from its
// neighbours' previous / next cards. Site search follows the same rule: it
// sends a student to that chapter's ROW on its subject page, where the
// chapter's official NCERT PDF is linked, instead of to the empty page.
// One rule for the subject page's row ids
// (src/app/schooling/[slug]/[classSlug]/[subject]/page.tsx), the search index
// (src/lib/search/index-core.ts) and the search wire (index-codec.ts).

/** The id of a chapter's row on its subject page: "ch-" + the chapter slug. */
export function schoolChapterRowId(chapterSlug: string): string {
  return `ch-${chapterSlug}`;
}

/** The search path of a chapter: its own page when it has Shishya's notes or
 *  checked practice; otherwise its row on the subject page. */
export function schoolChapterSearchPath(subjectPath: string, chapterSlug: string, ready: boolean): string {
  return ready ? `${subjectPath}/${chapterSlug}` : `${subjectPath}#${schoolChapterRowId(chapterSlug)}`;
}
