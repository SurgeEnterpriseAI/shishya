// Topic-note provenance shared by the English note and its Hindi twin
// (6 Oct 2026, search plan doNow 2).
//
// The 420 Hindi notes (/exams/[code]/topics/[topicCode]/hi) said only "this
// Hindi translation was prepared by Shishya" — no AI line, no review line —
// and their Article JSON-LD had no author, while the English note says
// "Drafted with AI from Shishya's syllabus outline for this exam · Reviewed
// by a person: not yet" and names the Organization as author.
//
// What is true of a Hindi note: scripts/generate-hindi-notes.ts translates
// the stored English note with Claude Haiku into TopicNoteTranslation; the
// English note was itself drafted with AI from Shishya's syllabus outline
// (scripts/generate-topic-notes.ts — no official document is read); and
// TopicNoteTranslation has no review field, so no person has reviewed any
// translation. The author is the same Organization entity as the English
// note's — no person is named or implied.

/** The Article author both note pages print: the Organization, as the
 *  English note has always named it. */
export const NOTE_AUTHOR = { "@type": "Organization", name: "Shishya", url: "https://shishya.in" } as const;

/** The Hindi note's author: the English note's entity, unchanged. */
export const HINDI_NOTE_AUTHOR = NOTE_AUTHOR;

/** The Hindi note's provenance line. hi wording: founder review. */
export const HINDI_NOTE_DISCLOSURE = {
  hi: "अंग्रेज़ी नोट का AI अनुवाद; अंग्रेज़ी नोट Shishya की सिलेबस रूपरेखा से AI ने तैयार किया है · किसी व्यक्ति ने जाँचा: अभी नहीं",
  en: "AI-translated from the English note, which was drafted with AI from Shishya's syllabus outline · Reviewed by a person: not yet",
} as const;
