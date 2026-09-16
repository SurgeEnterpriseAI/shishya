// Words that depend on what an exam's pages actually hold (16 Sep 2026).
// The pure half of the machine-surface honesty pass: src/lib/exam-page-gates.ts
// says which sub-pages render; this file turns "no notes / no questions / no
// stored relaxation / a sibling exam page" into the lines the sitemap-side
// surfaces print (context.md, llms-full.txt, Ask) and the topic and syllabus
// pages' titles. No DB reads here — tests/unit/page-gates-copy.test.ts pins
// every branch.
//
// The 16 Sep scout found:
//   • MP_RAEO's context.md giving the central "OBC +3, SC/ST +5" relaxation
//     (hard-coded for all 140 exams with an age limit, 112 of them state
//     exams) while the exam's own row holds the MP rule book's text;
//   • topic pages titled "Notes, Practice & Study Help" and the syllabus page
//     "with Free Study Notes" for exams that have no notes at all (MP_RAEO,
//     KA_KSRP: 60 topics, 0 notes; 9 topics with 0 questions, indexable);
//   • MP_MPESB's page carrying RAEO's exam date via testbook with no link to
//     the dedicated MP_RAEO page that has the official row.

function oneLine(text: string | null | undefined): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

/** context.md eligibility line. The exam's own stored relaxation when there
 *  is one; otherwise no relaxation rule at all — a central-government rule
 *  printed for a state board or an olympiad is a wrong fact. */
export function ageEligibilityLine(
  minAge: number | null,
  maxAge: number | null,
  relaxation: string | null | undefined,
): string | null {
  if (minAge == null && maxAge == null) return null;
  const range = `${minAge ?? "?"}–${maxAge ?? "?"} years`;
  const rel = oneLine(relaxation);
  return rel
    ? `Age: ${range}; relaxation: ${rel}`
    : `Age: ${range} (before any relaxation — category relaxation, if any, is set by the official notice)`;
}

/** Ask Shishya's get_exam_details `age` field — same rule, compact form. */
export function askAgeSummary(
  minAge: number | null,
  maxAge: number | null,
  relaxation: string | null | undefined,
): string | null {
  if (minAge == null) return null;
  const rel = oneLine(relaxation);
  return `${minAge}-${maxAge ?? "?"} ${rel ? `(relaxation: ${rel})` : "(relaxation not stored — check the official notice)"}`;
}

/** A combined-board exam whose recruitments have their own exam page. The
 *  combined page's context.md names the dedicated page, so an answer engine
 *  reading the board file finds the recruitment's own tracker (raeo.11). */
export const RELATED_EXAM_PAGES: Readonly<Record<string, readonly { code: string; label: string }[]>> = {
  MP_MPESB: [{ code: "MP_RAEO", label: "Group 2 Sub Group 1 — Krishi Vistar Adhikari / RAEO" }],
};

/** Blockquote lines for context.md's header; only targets that are active. */
export function relatedExamLines(code: string, isActive: (code: string) => boolean, site: string): string[] {
  return (RELATED_EXAM_PAGES[code] ?? [])
    .filter((r) => isActive(r.code))
    .map(
      (r) =>
        `> ${r.label} has its own exam page with its own tracker and key dates — cite that page for this recruitment: ${site}/exams/${r.code} (context file: ${site}/exams/${r.code}/context.md)`,
    );
}

/** A topic page is noindex only when it holds nothing: no notes and no
 *  checked question (raeo.6 corrected fix). A topic with 1–2 questions stays
 *  indexable — 1,254 such pages, some with Bing and ChatGPT landings. */
export function topicIndexable(hasNotes: boolean, validatedQuestions: number): boolean {
  return hasNotes || validatedQuestions > 0;
}

/** Title / description / keywords / robots for
 *  /exams/[code]/topics/[topicCode]. Everything is unchanged for topics that
 *  have notes. */
export function topicPageMeta(i: {
  topicName: string;
  examShort: string;
  topicDescription: string | null;
  hasNotes: boolean;
  validatedQuestions: number;
}): { title: string; description: string; keywords: string[]; index: boolean } {
  const tail = i.topicDescription ?? "";
  const index = topicIndexable(i.hasNotes, i.validatedQuestions);
  const keywords = [
    `${i.topicName} ${i.examShort}`,
    ...(i.hasNotes ? [`${i.topicName} notes`, `${i.topicName} formulas`] : []),
    ...(i.hasNotes || i.validatedQuestions > 0 ? [`${i.topicName} practice questions`] : []),
    `${i.examShort} ${i.topicName} preparation`,
    `${i.examShort} ${i.topicName} pyq`,
  ];
  if (i.hasNotes) {
    return {
      title: `${i.topicName} for ${i.examShort} — Notes, Practice & Study Help | Shishya`,
      description:
        `Free ${i.topicName} study notes for ${i.examShort} preparation. ` +
        `Concepts, formulas, common mistakes, practice questions, and Ask Shishya ` +
        `when you need help on this topic. ${tail}`.slice(0, 300),
      keywords,
      index,
    };
  }
  if (i.validatedQuestions > 0) {
    return {
      title: `${i.topicName} for ${i.examShort} — Practice & Study Help | Shishya`,
      description: `${i.topicName} practice questions for ${i.examShort} preparation, and Ask Shishya when you need help on this topic. ${tail}`
        .trim()
        .slice(0, 300),
      keywords,
      index,
    };
  }
  return {
    title: `${i.topicName} for ${i.examShort} — Syllabus Topic & Study Help | Shishya`,
    description: `${i.topicName} is a topic in the ${i.examShort} syllabus. Ask Shishya to teach it when you need help on this topic. ${tail}`
      .trim()
      .slice(0, 300),
    keywords,
    index,
  };
}

/** Copy for /exams/[code]/syllabus. `linkedTopics` = topics the page links
 *  to their notes (hasUsableNotes); "study notes" is said only when > 0.
 *  `weightageShown` = the page prints a subject weightage (weight > 1); the
 *  no-notes title says "with Weightage" only then — 77 of the 127 no-notes
 *  exams show none (MP_RAEO's weights are 0.05–0.075). */
export function syllabusPageCopy(i: {
  examShort: string;
  examName: string;
  year: number;
  subjects: number;
  topicCount: number;
  linkedTopics: number;
  weightageShown: boolean;
  buildMock: boolean;
}): { title: string; description: string; keywords: string[]; intro: string; jsonLdDescription: string; shareMessage: string } {
  const notes = i.linkedTopics > 0;
  const offers = [notes ? "free study notes" : null, "practice questions", i.buildMock ? "topic-wise mock tests" : null].filter(
    (x): x is string => x !== null,
  );
  const offerText = offers.length > 1 ? `${offers.slice(0, -1).join(", ")} and ${offers[offers.length - 1]}` : offers[0];
  const keywords = [
    `${i.examShort} syllabus ${i.year}`,
    `${i.examShort} syllabus topics`,
    `${i.examShort} subject wise syllabus`,
    `${i.examShort} syllabus with weightage`,
    ...(notes ? [`${i.examShort} study notes`] : []),
  ];
  const head = `The complete ${i.examName} syllabus: ${i.subjects} subjects, ${i.topicCount} topics.`;
  return {
    title: notes
      ? `${i.examShort} Syllabus ${i.year} — Complete Topic List with Free Study Notes | Shishya`
      : i.weightageShown
        ? `${i.examShort} Syllabus ${i.year} — Complete Topic List with Weightage | Shishya`
        : `${i.examShort} Syllabus ${i.year} — Complete Topic List | Shishya`,
    description:
      `Complete ${i.examShort} (${i.examName}) syllabus ${i.year}: every subject and topic with weightage, ` +
      `${offerText}. No coaching fees, in your language.`,
    keywords,
    intro: notes
      ? `${head} ${i.linkedTopics === 1 ? "1 topic below links" : `${i.linkedTopics} topics below link`} to free study notes.`
      : `${head} Study notes for this exam are not published yet; every topic is listed so you can see the whole syllabus.`,
    jsonLdDescription: `Full ${i.examName} syllabus: ${i.subjects} subjects, ${i.topicCount} topics${notes ? `, ${i.linkedTopics} with free study notes` : ""}.`,
    shareMessage: notes
      ? `Complete ${i.examShort} syllabus ${i.year} — topics with free study notes & practice (Shishya):`
      : `Complete ${i.examShort} syllabus ${i.year} — every subject & topic (Shishya):`,
  };
}

/** News permalink copy that names study notes only for an exam with notes
 *  (the funnel link lands on the syllabus page, which says "not published
 *  yet" otherwise). `hasNotes` null = the read failed: claim none. */
export function newsPermalinkCopy(examShort: string, hasNotes: boolean | null): { descriptionTail: string; syllabusLabel: string } {
  return hasNotes
    ? { descriptionTail: `Free ${examShort} mock tests, PYQs & study notes on Shishya.`, syllabusLabel: "Syllabus & study notes" }
    : { descriptionTail: `Free ${examShort} mock tests & PYQs on Shishya.`, syllabusLabel: "Syllabus" };
}
