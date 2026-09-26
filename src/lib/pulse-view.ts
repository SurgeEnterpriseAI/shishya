// Shishya Pulse — the view (27 Sep 2026): the shape the pages and
// /pulse/context.md render, the public copy with each table's definition,
// the citation line, the JSON-LD builders, the markdown twin and the
// sparkline geometry. Pure: no DB, no Next, no React — tested in
// tests/unit/pulse-view.test.ts. Every value in a PulseView has already been
// through the gates in src/lib/pulse-rules.ts (the loader applies them
// before caching), so nothing here can print a count under 20.
//
// Copy rules (founder strategy, 27 Sep 2026): numbers with definitions, no
// ranking or superlative claims about Shishya, no growth-rate headline, no
// quotes of anything a student wrote, students as the subject.

import { SITE_ORG_ID, SITE_URL } from "@/lib/site-description";
import {
  PULSE_HARD_MIN_ANSWERS,
  PULSE_HARD_MIN_TOPICS,
  PULSE_K,
  PULSE_MIN_PEOPLE,
  PULSE_TOPIC_MIN_PEOPLE,
  PULSE_WINDOW_WEEKS,
  istDayLabel,
  type ExamMockRow,
  type GroupRow,
  type PulseWeek,
  type TopicRow,
  type TutorRow,
} from "@/lib/pulse-rules";

// ── Shape ─────────────────────────────────────────────────────────────

export interface PulseSeriesPoint {
  slug: string;
  label: string;
  /** Gated: null when under 20. */
  signups: number | null;
  mocks: number | null;
  tutor: number | null;
}

export interface PulseWeekLine {
  signups: number | null;
  mocks: number | null;
  tutor: number | null;
  prevSignups: number | null;
  prevMocks: number | null;
  prevTutor: number | null;
  /** Oldest first, ending with the Pulse week. */
  series: PulseSeriesPoint[];
}

export interface PulseOfficialDate {
  /** IST calendar day, YYYY-MM-DD. */
  day: string;
  examCode: string;
  examName: string;
  label: string;
  /** The citable notice (never a denylisted host). */
  url: string;
}

export interface PulseSignupSections {
  rows: GroupRow[];
  /** Set when no section other than this one reached 20: the page prints a
   *  sentence instead of counts. */
  onlySection: string | null;
}

export interface PulseView {
  week: PulseWeek;
  /** The four weeks the topic and tutor tables read, ending with `week`. */
  windowLabel: string;
  /** IST calendar day the numbers were computed, YYYY-MM-DD. */
  computedDay: string;
  weekLine: PulseWeekLine | null;
  examMocks: ExamMockRow[] | null;
  kindMocks: GroupRow[] | null;
  practisedTopics: TopicRow[] | null;
  hardestTopics: TopicRow[] | null;
  officialDates: PulseOfficialDate[] | null;
  tutorByExam: TutorRow[] | null;
  signupSections: PulseSignupSections | null;
}

// ── Copy ──────────────────────────────────────────────────────────────

export const PULSE_NAME = "Shishya Pulse";
export const PULSE_URL = `${SITE_URL}/pulse`;
export const PULSE_SERIES_ID = `${PULSE_URL}#series`;
export const PULSE_CONTEXT_URL = `${PULSE_URL}/context.md`;

export const PULSE_UNAVAILABLE = "This could not be computed right now. The page refreshes hourly.";

export const PULSE_DESCRIPTION =
  "A weekly data note from Shishya: the exams students took the most mock tests for, the most-practised and hardest topics, the week's official exam dates and what students asked the AI tutor about. Counts only; every group is at least 20.";

export const PULSE_INTRO = `What students on Shishya practised, counted from Shishya's database. Every number counts at least ${PULSE_K} mocks, answers, questions or sign-ups; smaller groups are merged or left out. It describes Shishya's own students, not all students in India.`;

export const PULSE_DEFINITIONS = {
  weekLine: `Mocks taken: mocks students finished in the week (submitted, or submitted automatically when time ran out). Questions to the AI tutor: messages students sent to the tutor — signed-in students, and guests with a Shishya cookie. Sign-ups: accounts created in the week. The same rules as the live counters on the home page, sliced by week. A count under ${PULSE_K} is shown as "fewer than ${PULSE_K}".`,
  examMocks: `Mocks finished in the week, by exam. An exam is listed only when at least ${PULSE_K} mocks were taken by at least ${PULSE_MIN_PEOPLE} different students, so the rows do not add up to the week's total. The week before is shown only when that week also met the same rule.`,
  kindMocks: `The same week's mocks grouped by the kind of exam. A group with fewer than ${PULSE_K} mocks or ${PULSE_MIN_PEOPLE} students is merged with the next smallest.`,
  practised: `Answers students gave in finished mocks over the ${PULSE_WINDOW_WEEKS} weeks shown, by topic. A topic is listed only when at least ${PULSE_TOPIC_MIN_PEOPLE} different students answered it. Ranked by answers.`,
  hardest: `Topics with at least ${PULSE_HARD_MIN_ANSWERS} answers from at least ${PULSE_TOPIC_MIN_PEOPLE} different students over the same ${PULSE_WINDOW_WEEKS} weeks, the lowest share of correct answers first. The table is printed only when at least ${PULSE_HARD_MIN_TOPICS} topics qualify.`,
  // 27 Sep 2026 (fixer review): one qualifying topic is not "the hardest".
  hardestEmpty: `Fewer than ${PULSE_HARD_MIN_TOPICS} topics reached ${PULSE_HARD_MIN_ANSWERS} answers from ${PULSE_TOPIC_MIN_PEOPLE} different students in these weeks, so no topic is called the hardest.`,
  hardestCaveat:
    "This is the share of answers that were correct, not a difficulty rating: adaptive mocks give stronger students harder questions.",
  officialDates:
    "Dates from Shishya's exam trackers that fall in this week and were announced and cited on the conducting body's own website (the tracker's official tier). A row whose own label says expected is left out. Reported and expected dates are on each exam's tracker and in the exam calendar.",
  tutor: `Questions sent to the AI tutor over the ${PULSE_WINDOW_WEEKS} weeks shown, grouped by the exam the tutor was set to. An exam is listed only with at least ${PULSE_K} questions from at least ${PULSE_MIN_PEOPLE} different people. The text of questions is never read for this page.`,
  sections: `Accounts created in the week, grouped by the section of the first page their browser opened on Shishya. Groups under ${PULSE_K} are merged.`,
  method: `Weeks run from Monday 00:00 to Sunday 23:59 India time (IST). Numbers are counted from Shishya's database when the page is built and refreshed hourly. Team accounts are left out. Every printed number counts at least ${PULSE_K}; smaller groups are merged or left out. Only dates are printed, never times.`,
} as const;

export function pulseWeekUrl(w: PulseWeek): string {
  return `${PULSE_URL}/${w.slug}`;
}

/** "week 38 of 2026 (14–20 Sep 2026)" */
export function pulseWeekPhrase(w: PulseWeek): string {
  return `week ${w.week} of ${w.year} (${w.label})`;
}

export function pulseWeekTitle(w: PulseWeek): string {
  return `Shishya Pulse, ${pulseWeekPhrase(w)} — mocks, topics and exam dates`;
}

export function pulseWeekHeading(w: PulseWeek): string {
  return `Shishya Pulse — ${pulseWeekPhrase(w)}`;
}

export function pulseHubTitle(latest: PulseWeek | null): string {
  return latest ? `Shishya Pulse — what students practised in the week of ${latest.label}` : "Shishya Pulse — a weekly note on what students practised";
}

export function pulseWeekDescription(w: PulseWeek): string {
  return `What students on Shishya practised in the week of ${w.label}: the exams they took the most mock tests for, the most-practised and hardest topics, official exam dates and what they asked the AI tutor about. Counts only; every group is at least ${PULSE_K}.`;
}

/** The "How to cite" line. */
export function pulseCitation(w: PulseWeek, computedDay: string): string {
  return `Shishya Pulse, ${pulseWeekPhrase(w)}, ${pulseWeekUrl(w)}, computed ${istDayLabel(computedDay)}.`;
}

/** Labels of a merged group in one phrase: "Olympiads and entrance exams";
 *  labels that already hold a list are joined with semicolons ("Exam
 *  lists, calendar and mock-test pages; entrance exam and olympiad pages"). */
export function joinLabels(labels: readonly string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  const tail = labels.slice(1).map((l) => l.charAt(0).toLowerCase() + l.slice(1));
  if (labels.some((l) => /,| and /.test(l))) return [labels[0], ...tail].join("; ");
  return tail.length === 1 ? `${labels[0]} and ${tail[0]}` : `${labels[0]}, ${tail.slice(0, -1).join(", ")} and ${tail[tail.length - 1]}`;
}

/** A gated count in words: "1,234" or "fewer than 20". */
export function countText(n: number | null): string {
  return n == null ? `fewer than ${PULSE_K}` : n.toLocaleString("en-IN");
}

export function examHref(code: string): string {
  return `/exams/${encodeURIComponent(code)}`;
}

export function topicHref(examCode: string, topicCode: string): string {
  return `/exams/${encodeURIComponent(examCode)}/topics/${encodeURIComponent(topicCode)}`;
}

/** The Monday after the week (the day it could first be published). */
export function pulsePublishedDay(w: PulseWeek): string {
  const d = new Date(`${w.endDay}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ── JSON-LD ───────────────────────────────────────────────────────────

const ORG_REF = { "@type": "EducationalOrganization", "@id": SITE_ORG_ID, name: "Shishya", url: SITE_URL } as const;

export function pulseSeriesLd(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CreativeWorkSeries",
    "@id": PULSE_SERIES_ID,
    name: PULSE_NAME,
    description: PULSE_DESCRIPTION,
    url: PULSE_URL,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    publisher: ORG_REF,
  };
}

/** /pulse: CollectionPage whose main entity lists every published week. */
export function pulseHubLd(latest: PulseWeek | null, archive: readonly PulseWeek[]): Record<string, unknown>[] {
  return [
    pulseSeriesLd(),
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${PULSE_URL}#page`,
      url: PULSE_URL,
      name: pulseHubTitle(latest),
      description: PULSE_DESCRIPTION,
      inLanguage: "en-IN",
      isAccessibleForFree: true,
      isPartOf: { "@type": "WebSite", name: "Shishya", url: SITE_URL },
      about: { "@id": PULSE_SERIES_ID },
      publisher: ORG_REF,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: archive.length,
        itemListElement: archive.map((w, i) => ({
          "@type": "ListItem",
          position: i + 1,
          url: pulseWeekUrl(w),
          name: `${PULSE_NAME}, ${pulseWeekPhrase(w)}`,
        })),
      },
    },
  ];
}

/** /pulse/{week}: one Article in the series. Dates only, never times. */
export function pulseWeekLd(w: PulseWeek, computedDay: string): Record<string, unknown> {
  const url = pulseWeekUrl(w);
  const published = pulsePublishedDay(w);
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${url}#article`,
    headline: `${PULSE_NAME}, ${pulseWeekPhrase(w)}`,
    description: pulseWeekDescription(w),
    url,
    mainEntityOfPage: url,
    datePublished: published,
    dateModified: computedDay > published ? computedDay : published,
    author: ORG_REF,
    publisher: ORG_REF,
    isPartOf: { "@id": PULSE_SERIES_ID },
    isAccessibleForFree: true,
    inLanguage: "en-IN",
  };
}

// ── Sparkline geometry ────────────────────────────────────────────────

export const SPARK_W = 120;
export const SPARK_H = 28;

/** Points of a sparkline in a SPARK_W × SPARK_H box (2 px padding), or null
 *  when there is nothing honest to draw (fewer than 2 points, or a gated
 *  value among them). */
export function sparklinePoints(values: readonly (number | null)[]): { x: number; y: number }[] | null {
  if (values.length < 2 || values.some((v) => v == null || !Number.isFinite(v))) return null;
  const vs = values as number[];
  const min = Math.min(...vs);
  const max = Math.max(...vs);
  const pad = 2;
  const w = SPARK_W - pad * 2;
  const h = SPARK_H - pad * 2;
  return vs.map((v, i) => ({
    x: Math.round((pad + (w * i) / (vs.length - 1)) * 10) / 10,
    y: Math.round((pad + (max === min ? h / 2 : h - ((v - min) / (max - min)) * h)) * 10) / 10,
  }));
}

export function sparklinePath(points: readonly { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join(" ");
}

// ── Markdown twin (/pulse/context.md) ─────────────────────────────────

const mdCell = (s: string) => s.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

function mdTable(head: string[], rows: string[][]): string[] {
  return [`| ${head.map(mdCell).join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.map(mdCell).join(" | ")} |`)];
}

function mdSection(title: string, definition: string, body: string[] | null, empty: string): string[] {
  const out = ["", `## ${title}`, "", definition, ""];
  if (body == null) out.push(PULSE_UNAVAILABLE);
  else if (body.length === 0) out.push(empty);
  else out.push(...body);
  return out;
}

/** The latest week as markdown, for AI assistants and crawlers. */
export function pulseMarkdown(view: PulseView, archive: readonly PulseWeek[]): string {
  const w = view.week;
  const url = pulseWeekUrl(w);
  const L: string[] = [
    `# ${pulseWeekHeading(w)}`,
    "",
    PULSE_INTRO,
    "",
    `- Week: ${w.label} (Monday to Sunday, India time)`,
    `- Topic and tutor tables: the ${PULSE_WINDOW_WEEKS} weeks ${view.windowLabel}`,
    `- Computed: ${istDayLabel(view.computedDay)} (IST), from Shishya's database`,
    `- Web page: ${url}`,
  ];

  const wl = view.weekLine;
  L.push(
    ...mdSection(
      "The week in numbers",
      PULSE_DEFINITIONS.weekLine,
      wl
        ? mdTable(
            ["", "This week", "The week before"],
            [
              ["Mocks taken", countText(wl.mocks), countText(wl.prevMocks)],
              ["Questions to the AI tutor", countText(wl.tutor), countText(wl.prevTutor)],
              ["Sign-ups", countText(wl.signups), countText(wl.prevSignups)],
            ],
          )
        : null,
      "",
    ),
  );

  L.push(
    ...mdSection(
      "Most-taken mocks",
      PULSE_DEFINITIONS.examMocks,
      view.examMocks
        ? view.examMocks.length
          ? mdTable(
              ["Exam", "Mocks this week", "Mocks the week before"],
              view.examMocks.map((r) => [`${r.name} (${SITE_URL}${examHref(r.code)})`, countText(r.mocks), r.prevMocks == null ? "—" : countText(r.prevMocks)]),
            )
          : []
        : null,
      `No exam reached ${PULSE_K} mocks from ${PULSE_MIN_PEOPLE} different students this week.`,
    ),
  );

  L.push(
    ...mdSection(
      "Mocks by kind of exam",
      PULSE_DEFINITIONS.kindMocks,
      view.kindMocks ? (view.kindMocks.length ? mdTable(["Kind of exam", "Mocks"], view.kindMocks.map((g) => [joinLabels(g.labels), countText(g.n)])) : []) : null,
      "Not shown this week: the groups were too small to print separately.",
    ),
  );

  L.push(
    ...mdSection(
      `Most-practised topics, ${view.windowLabel}`,
      PULSE_DEFINITIONS.practised,
      view.practisedTopics
        ? view.practisedTopics.length
          ? mdTable(
              ["Exam", "Topic", "Answers"],
              view.practisedTopics.map((t) => [t.examName, `${t.topicName} (${SITE_URL}${topicHref(t.examCode, t.topicCode)})`, countText(t.answers)]),
            )
          : []
        : null,
      `No topic was answered by ${PULSE_TOPIC_MIN_PEOPLE} different students in these weeks.`,
    ),
  );

  L.push(
    ...mdSection(
      `Hardest topics, ${view.windowLabel}`,
      `${PULSE_DEFINITIONS.hardest} ${PULSE_DEFINITIONS.hardestCaveat}`,
      view.hardestTopics
        ? view.hardestTopics.length
          ? mdTable(
              ["Exam", "Topic", "Answers", "Share correct"],
              view.hardestTopics.map((t) => [t.examName, t.topicName, countText(t.answers), `${(t.sharePct ?? 0).toFixed(1)}%`]),
            )
          : []
        : null,
      PULSE_DEFINITIONS.hardestEmpty,
    ),
  );

  L.push(
    ...mdSection(
      "Official exam dates this week",
      PULSE_DEFINITIONS.officialDates,
      view.officialDates
        ? view.officialDates.length
          ? mdTable(
              ["Day", "Exam", "What", "Official notice"],
              view.officialDates.map((d) => [istDayLabel(d.day), d.examName, d.label, d.url]),
            )
          : []
        : null,
      "No official-tier date fell in this week.",
    ),
  );

  L.push(
    ...mdSection(
      `What students asked the AI tutor about, ${view.windowLabel}`,
      PULSE_DEFINITIONS.tutor,
      view.tutorByExam ? (view.tutorByExam.length ? mdTable(["Exam the tutor was set to", "Questions"], view.tutorByExam.map((t) => [t.label, countText(t.questions)])) : []) : null,
      `No exam reached ${PULSE_K} questions from ${PULSE_MIN_PEOPLE} different people in these weeks.`,
    ),
  );

  const ss = view.signupSections;
  L.push(
    ...mdSection(
      "Sign-ups by section of their first page",
      PULSE_DEFINITIONS.sections,
      ss
        ? ss.onlySection
          ? [`No section other than ${ss.onlySection.toLowerCase()} reached ${PULSE_K} sign-ups this week.`]
          : ss.rows.length
            ? mdTable(["Section of the first page", "Sign-ups"], ss.rows.map((g) => [joinLabels(g.labels), countText(g.n)]))
            : []
        : null,
      `Fewer than ${PULSE_K} sign-ups this week.`,
    ),
  );

  L.push("", "## Method", "", PULSE_DEFINITIONS.method, "", "## How to cite", "", pulseCitation(w, view.computedDay), "");
  L.push("## Every week", "");
  for (const a of archive) L.push(`- ${PULSE_NAME}, ${pulseWeekPhrase(a)}: ${pulseWeekUrl(a)}`);
  L.push("", `Definitions of Shishya's other public numbers: ${SITE_URL}/shishya-in-numbers`, "");
  return L.join("\n");
}
