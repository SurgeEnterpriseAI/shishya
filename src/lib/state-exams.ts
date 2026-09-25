// State directory of Shishya's exams (15 Sep 2026, SEO/AEO wave 1).
//
// One loader feeds the per-state pages (/exams/state/{slug}), the all-states
// index (/exams/state) and llms-full.txt, so the three never disagree. Every
// sentence those surfaces say is built from these rows:
//   • an exam type is named only when an exam of that type exists in the state;
//   • a date is given only from an announced tracker row (tier official or
//     reported) — never an estimate;
//   • application portals come from the exams' own ExamEligibility records.
//
// Pure helpers (examTypeOf, stateFaq, formatDay) are unit-tested in
// tests/unit/state-exams.test.ts; the loaders are the only DB readers.

import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { STATES, stateSlug } from "@/lib/state-info";
import { buildTimeline } from "@/lib/exam-timeline";
import { fillState, stateCopy, type StateCopyLocale } from "@/lib/state-exams-copy";

export type ExamType = "PSC" | "Staff selection" | "Police" | "Teaching" | "Entrance" | "Other";

/** Display order of the type groups on a state page. */
export const EXAM_TYPE_ORDER: readonly ExamType[] = ["PSC", "Staff selection", "Police", "Teaching", "Entrance", "Other"];

export interface StateExam {
  code: string;
  name: string;
  shortName: string;
  type: ExamType;
  /** ISO string — unstable_cache serialises Dates. */
  updatedAt: string;
  officialUrl: string | null;
  officialName: string | null;
}

export interface StateDirectoryEntry {
  code: string;
  slug: string;
  name: string;
  nativeName: string;
  hindiName: string;
  exams: StateExam[];
}

export interface StateDate {
  examCode: string;
  examShort: string;
  label: string;
  kind: string;
  /** IST calendar day, YYYY-MM-DD. */
  day: string;
  tier: "official" | "reported";
  url: string | null;
}

export interface FaqItem {
  q: string;
  a: string;
}

/** Exam type from its code and names. Order matters: HSSC CET is a staff
 *  selection test, not an entrance exam; a PSC-run police post stays Police. */
export function examTypeOf(e: { code: string; name: string; shortName: string }): ExamType {
  const s = `${e.code} ${e.shortName} ${e.name}`;
  if (/police|constable|sub[- ]?inspector|\bSI\b|KSRP|SRPF|arakshak|lokrakshak/i.test(s)) return "Police";
  if (/\b[A-Z]*TET\b|_TET\b|teacher eligibility|shikshak/i.test(s)) return "Teaching";
  if (/PSC|public service commission|civil services|administrative service/i.test(s)) return "PSC";
  if (/SSSB|SSSC|\bSSB\b|staff selection|subordinate service|employees selection|ESB\b|HSSC|recruitment board|recruitment test|group [a-d]\b/i.test(s)) {
    return "Staff selection";
  }
  if (/\bCET\b|_CET\b|COMEDK|EAMCET|EAPCET|entrance|polytechnic|nursing|admission/i.test(s)) return "Entrance";
  return "Other";
}

/** "2026-09-20" → "20 Sept 2026" (en-IN, the calendar day itself). */
export function formatDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

const hostOf = (url: string): string | null => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
};

/** Official application portals of a state's exams, one per host and one per
 *  body name (KPSC's application portal and its older site are one body). */
export function statePortals(exams: readonly StateExam[]): { name: string; url: string; host: string }[] {
  const seenHosts = new Set<string>();
  const seenNames = new Set<string>();
  const out: { name: string; url: string; host: string }[] = [];
  for (const e of exams) {
    if (!e.officialUrl) continue;
    const host = hostOf(e.officialUrl);
    if (!host || seenHosts.has(host)) continue;
    const name = e.officialName?.trim() || host;
    if (seenNames.has(name.toLowerCase())) continue;
    seenHosts.add(host);
    seenNames.add(name.toLowerCase());
    out.push({ name, url: e.officialUrl, host });
  }
  return out;
}

const listNames = (items: string[], and = "and"): string =>
  items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} ${and} ${items[items.length - 1]}`;

/** The state page's FAQ — visible on the page and in its FAQPage JSON-LD.
 *  Every answer is a fact from the rows passed in; an item whose fact is
 *  missing is left out rather than guessed.
 *  `state.name` is the name in the reader's script (stateDisplayName) and
 *  `locale` picks the sentences (16 Sep 2026). Both default to English, so
 *  the context file and the English page are unchanged. */
export function stateFaq(
  state: { name: string; slug: string },
  exams: readonly StateExam[],
  upcoming: readonly StateDate[],
  horizonDays: number,
  locale: StateCopyLocale = "en",
): FaqItem[] {
  const C = stateCopy(locale);
  const items: FaqItem[] = [];
  if (exams.length > 0) {
    const shown = exams.slice(0, 12).map((e) => (e.shortName === e.name ? e.shortName : `${e.shortName} (${e.name})`));
    const more = exams.length > 12 ? fillState(C.faqWhichMore, { n: exams.length - 12 }) : "";
    items.push({
      q: fillState(C.faqWhichQ, { state: state.name }),
      a: fillState(C.faqWhichA, {
        n: exams.length,
        state: state.name,
        pageWord: exams.length === 1 ? C.examPageOne : C.examPageMany,
        list: shown.join("; "),
        more,
        url: `https://shishya.in/exams/state/${state.slug}`,
      }),
    });
  }

  const nextExams = upcoming.filter((d) => d.kind === "EXAM" && (d.tier === "official" || d.tier === "reported")).slice(0, 3);
  items.push({
    q: fillState(C.faqNextQ, { state: state.name }),
    a: nextExams.length
      ? nextExams
          .map((d) =>
            fillState(C.faqNextRow, {
              exam: d.examShort,
              label: d.label,
              date: formatDay(d.day),
              tier: d.tier === "official" ? C.tierOfficialLong : C.tierReportedLong,
            }),
          )
          .join(`${C.sentenceEnd} `) + C.sentenceEnd
      : fillState(C.faqNextNone, { state: state.name, days: horizonDays }),
  });

  const portals = statePortals(exams);
  if (portals.length > 0) {
    items.push({
      q: fillState(C.faqApplyQ, { state: state.name }),
      a: fillState(C.faqApplyA, { list: listNames(portals.slice(0, 6).map((p) => `${p.name} (${p.url})`), C.listAnd) }),
    });
  }
  return items;
}

/** The state's context file for AI crawlers (/exams/state/{slug}/context.md):
 *  the state page's facts as token-cheap markdown. `asOf` is the IST day. */
export function stateContextMarkdown(
  entry: StateDirectoryEntry,
  upcoming: readonly StateDate[],
  horizonDays: number,
  asOf: string,
): string {
  const SITE = "https://shishya.in";
  const page = `${SITE}/exams/state/${entry.slug}`;
  const L: string[] = [
    `# ${entry.name} government exams — Shishya context file`,
    "",
    `> State page: ${page} · all states: ${SITE}/exams/state · data as of ${asOf} (IST)`,
    "> Dates are only those announced by the conducting body (official) or reported with a cited source (reported); estimates are left out.",
    "",
    `## Exams on Shishya in ${entry.name} (${entry.exams.length})`,
  ];
  for (const type of EXAM_TYPE_ORDER) {
    const list = entry.exams.filter((e) => e.type === type);
    if (list.length === 0) continue;
    L.push(`### ${type}`);
    for (const e of list) L.push(`- ${e.shortName} — ${e.name}: ${SITE}/exams/${e.code} (context: ${SITE}/exams/${e.code}/context.md)`);
  }
  L.push("", `## Upcoming announced dates (next ${horizonDays} days)`);
  if (upcoming.length > 0) {
    for (const d of upcoming) L.push(`- ${d.day} — ${d.examShort}: ${d.label} (${d.tier}${d.url ? `, source: ${d.url}` : ""})`);
  } else {
    L.push(`- None announced on Shishya's tracker for the next ${horizonDays} days. Each exam's tracker lists its expected dates, marked as estimates.`);
  }
  const portals = statePortals(entry.exams);
  if (portals.length > 0) {
    L.push("", "## Where to apply (official websites)");
    for (const p of portals) L.push(`- ${p.name}: ${p.url}`);
  }
  L.push("", "## Questions and answers");
  for (const f of stateFaq({ name: entry.name, slug: entry.slug }, entry.exams, upcoming, horizonDays)) {
    L.push(`### ${f.q}`, f.a, "");
  }
  L.push(`Everything on Shishya is free. Platform index for LLMs: ${SITE}/llms.txt and ${SITE}/llms-full.txt`, "");
  return L.join("\n");
}

/** Every state with at least one active exam, exams most-taken first. */
export async function loadStateDirectory(): Promise<StateDirectoryEntry[]> {
  const exams = await prisma.exam.findMany({
    // 25 Sep 2026: real exams only — a state board's class containers carry
    // a state code too and must not join a state's exam directory.
    where: { ...REAL_EXAM_WHERE, state: { not: null } },
    select: {
      code: true,
      name: true,
      shortName: true,
      state: true,
      updatedAt: true,
      eligibility: { select: { officialUrl: true, officialName: true } },
    },
    orderBy: [{ candidatesPerYear: { sort: "desc", nulls: "last" } }, { shortName: "asc" }],
  });
  const byState = new Map<string, StateExam[]>();
  for (const e of exams) {
    if (!e.state || !(e.state in STATES)) continue;
    const list = byState.get(e.state) ?? [];
    list.push({
      code: e.code,
      name: e.name,
      shortName: e.shortName,
      type: examTypeOf(e),
      updatedAt: e.updatedAt.toISOString(),
      officialUrl: e.eligibility?.officialUrl ?? null,
      officialName: e.eligibility?.officialName ?? null,
    });
    byState.set(e.state, list);
  }
  return [...byState.entries()]
    .map(([code, list]) => {
      const st = STATES[code];
      return { code, slug: stateSlug(code), name: st.name, nativeName: st.nativeName, hindiName: st.hindiName, exams: list };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Cached for page renders (hourly, busted with the exam catalog). */
export const getStateDirectory = unstable_cache(loadStateDirectory, ["state-directory-v1"], {
  revalidate: 3600,
  tags: ["exam-catalog"],
});

/** Announced (official / reported) upcoming tracker rows for a state's exams,
 *  soonest first. Estimates never appear here. */
export async function loadStateUpcoming(
  exams: readonly Pick<StateExam, "code" | "shortName" | "officialUrl">[],
  horizonDays: number,
  now: Date = new Date(),
): Promise<StateDate[]> {
  if (exams.length === 0) return [];
  const byCode = new Map(exams.map((e) => [e.code, e]));
  const rows = await prisma.examImportantDate.findMany({
    where: {
      archivedAt: null,
      exam: { code: { in: exams.map((e) => e.code) }, active: true },
      date: { gte: new Date(now.getTime() - 86_400_000), lte: new Date(now.getTime() + horizonDays * 86_400_000) },
    },
    select: { id: true, label: true, date: true, isExamDay: true, kind: true, confidence: true, url: true, notes: true, source: true, exam: { select: { code: true } } },
    orderBy: { date: "asc" },
    take: 400,
  });
  const grouped = new Map<string, typeof rows>();
  for (const r of rows) grouped.set(r.exam.code, [...(grouped.get(r.exam.code) ?? []), r]);
  const out: StateDate[] = [];
  for (const [code, list] of grouped) {
    const exam = byCode.get(code);
    if (!exam) continue;
    for (const t of buildTimeline(list, now, exam.officialUrl)) {
      if (t.daysFromToday < 0 || (t.tier !== "official" && t.tier !== "reported")) continue;
      out.push({ examCode: code, examShort: exam.shortName, label: t.label, kind: t.kind, day: t.day, tier: t.tier, url: t.url });
    }
  }
  return out.sort((a, b) => a.day.localeCompare(b.day)).slice(0, 12);
}

// The state page's two DB reads, cached hourly and busted with the exam
// catalog (16 Sep 2026). The page is ISR, so on its own it reads once per
// state per hour; the cache is for the day its /hi and /te twins are cached
// routes of their own — three copies of a state then share one read instead
// of making three. A failed read throws, so it is never cached; the page
// falls back to an empty list for that render.
//
// Both read the state's exams by `state` directly. They must NOT call
// getStateDirectory(): an unstable_cache called inside another one skips its
// cache (Next 15 bypasses nested entries), so every miss here would re-run
// the whole directory query.

/** loadStateUpcoming for one state's active exams. */
export const getStateUpcoming = unstable_cache(
  async (stateCode: string, horizonDays: number): Promise<StateDate[]> => {
    const exams = await prisma.exam.findMany({
      where: { ...REAL_EXAM_WHERE, state: stateCode },
      select: { code: true, shortName: true, eligibility: { select: { officialUrl: true } } },
    });
    return loadStateUpcoming(
      exams.map((e) => ({ code: e.code, shortName: e.shortName, officialUrl: e.eligibility?.officialUrl ?? null })),
      horizonDays,
    );
  },
  ["state-upcoming-v2"],
  { revalidate: 3600, tags: ["exam-catalog"] },
);

/** Card facts (pattern, description) of one state's active exams. */
export const getStateExamCards = unstable_cache(
  async (stateCode: string) =>
    prisma.exam.findMany({
      where: { ...REAL_EXAM_WHERE, state: stateCode },
      select: { code: true, description: true, totalQuestions: true, durationMin: true, languages: true },
    }),
  ["state-exam-cards-v2"],
  { revalidate: 3600, tags: ["exam-catalog"] },
);
