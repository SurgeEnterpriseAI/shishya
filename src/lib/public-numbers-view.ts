// Printable views of Shishya's public numbers (27 Sep 2026).
//
// Why: /shishya-in-numbers renders the numbers as HTML and
// /shishya-in-numbers/context.md renders the same numbers as markdown for
// answer engines. Both must print the same cells with the same privacy gate
// (K_MIN, src/lib/public-stats.ts), so the cell text is built once here and
// each surface only lays it out. The Dataset JSON-LD is built here too.
//
// Pure: type-only imports from src/lib/public-numbers.ts (erased at build),
// no DB, no Next imports (tests/unit/public-numbers-rules.test.ts).

import type { CounterRow, CoverageGroup, PublicNumbers } from "@/lib/public-numbers";
import { istDayLabel, parseWeekSlug } from "@/lib/iso-week";
import { K_MIN, SUPPRESSED, cell, formatInt, formatPct, publishable, ratioCell, share, shareCell, subsetPublishable } from "@/lib/public-stats";
import { SITE_ORG_ID, SITE_URL } from "@/lib/site-description";
import {
  NUMBERS_PATH,
  NUMBERS_URL,
  PEOPLE_FIRST_WEEK,
  TAGGED_IDENTITY_FROM_DAY,
  WEEKLY_COLUMNS,
  aiSourceCount,
  answerCheckMethod,
  citationLine,
  humanRuleMissesTaggedSinglePage,
  namedSourceCount,
  numbersFaq,
  type AnswerCheck,
  type CohortReturns,
  type PublicNumber,
  type SourceSplit,
  type WeeklyColumn,
  type WeeklyUsage,
} from "@/lib/public-numbers-rules";

export const NOT_COMPUTED_TEXT = "could not be computed right now";
export const CONTEXT_MD_PATH = `${NUMBERS_PATH}/context.md`;

/** "14–20 Sep 2026" → "14–20 Sep" (the table's period line carries the year). */
export function shortWeekLabel(label: string): string {
  return label.replace(/ \d{4}$/, "");
}

/** Accessible sparkline text: "Sign-ups by week, 27 Jul–20 Sep 2026: 118, 124, …".
 *  `digits` set → every value is printed with that many decimals (ratios). */
export function sparkLabel(name: string, period: string, values: readonly (number | null)[], digits?: number): string {
  const list = values.map((v) => (v === null ? "not shown" : digits !== undefined ? v.toFixed(digits) : formatInt(v))).join(", ");
  return `${name} by week, ${period}: ${list}`;
}

/** Decimals a weekly column prints with (only the ratio has any). */
export function weeklyDigits(key: WeeklyColumn): number | undefined {
  return key === "mocksPerActive" ? 2 : undefined;
}

/** A counter's printed value: people counts go through the K_MIN gate. */
export function counterCell(c: Pick<CounterRow, "value" | "people">): string {
  return c.people ? cell(c.value) : formatInt(c.value);
}

// ── Headline tiles ────────────────────────────────────────────────────

export interface TileView {
  id: string;
  label: string;
  value: string | null;
  sub: string | null;
  definition: string;
  period: string | null;
  asOf: string | null;
}

function pooledTile(n: PublicNumber<{ num: number; den: number }> | null | undefined, fallback: { id: string; label: string; definition: string }): TileView {
  if (!n) return { ...fallback, value: null, sub: null, period: null, asOf: null };
  const v = n.value;
  // 27 Sep 2026 (fixer review): "213 of 742" also prints 742 − 213, so the
  // rest must pass the gate too (subsetPublishable).
  const ok = subsetPublishable(v.num, v.den);
  return {
    id: n.id,
    label: n.label,
    value: ok ? shareCell(v.num, v.den) : SUPPRESSED,
    sub: ok ? `${formatInt(v.num)} of ${formatInt(v.den)} accounts` : `a group under ${formatInt(K_MIN)} would show; not printed`,
    definition: n.definition,
    period: n.period,
    asOf: n.asOf,
  };
}

export function headlineTiles(p: PublicNumbers): TileView[] {
  const tiles: TileView[] = [
    pooledTile(p.cohorts?.within7, { id: "came-back-7-days", label: "Came back within 7 days of signing up", definition: "" }),
    pooledTile(p.cohorts?.days8to30, { id: "came-back-8-30-days", label: "Came back on days 8 to 30", definition: "" }),
  ];
  // 30-day actives: the share and the active count only — the team-free
  // account total is never printed (it would reveal the team's size next to
  // the all-time counter).
  // 27 Sep 2026 (fixer review): the tile leads with the strict figure
  // (activity on a day after the sign-up day). Creating an account is a
  // signed-in event, so the plain figure counts every new account as active
  // just for signing up (717 of 821 on 27 Sep) — it follows as a share only,
  // labelled as such; its count beside the strict count would pin the
  // team-free total. The tile keeps the "active-30-days" anchor.
  const a = p.actives;
  if (a) {
    const all = a.all.value;
    const strict = a.afterSignupDay.value;
    const strictPct = shareCell(strict.num, strict.den);
    const allPct = shareCell(all.num, all.den);
    tiles.push({
      id: a.all.id,
      label: a.afterSignupDay.label,
      value: strictPct,
      sub:
        strictPct !== SUPPRESSED
          ? `${formatInt(strict.num)} accounts` +
            (allPct !== SUPPRESSED ? `; counting the sign-up day too, when a new account is active just for signing up: ${allPct}` : "")
          : null,
      definition: `${a.afterSignupDay.definition} The second figure: ${a.all.definition}`,
      period: a.afterSignupDay.period,
      asOf: a.afterSignupDay.asOf,
    });
  } else {
    tiles.push({ id: "active-30-days", label: "Active in the last 30 days, on a day after signing up", value: null, sub: null, definition: "", period: null, asOf: null });
  }
  const m = p.weekly?.mocksPerActive;
  if (m) {
    const v = m.value;
    // 27 Sep 2026 (fixer review): the per-taker ratio gives the mock-takers
    // back (mocks ÷ ratio), so actives − takers must pass the gate too.
    const perTaker = subsetPublishable(v.mockTakers, v.actives) ? ratioCell(v.mocks, v.mockTakers) : SUPPRESSED;
    tiles.push({
      id: m.id,
      label: m.label,
      value: ratioCell(v.mocks, v.actives),
      sub:
        publishable(v.actives)
          ? `${formatInt(v.mocks)} mocks ÷ ${formatInt(v.actives)} active accounts` + (perTaker !== SUPPRESSED ? `; ${perTaker} per account that took a mock` : "")
          : null,
      definition: m.definition,
      period: `week of ${m.period}`,
      asOf: m.asOf,
    });
  } else {
    tiles.push({ id: "mocks-per-active-account", label: "Mocks per weekly active account", value: null, sub: null, definition: "", period: null, asOf: null });
  }
  return tiles;
}

// ── Cohort table ──────────────────────────────────────────────────────

export interface CohortTableRow {
  week: string;
  label: string;
  signups: string;
  returned: string;
  share: string;
}

export function cohortTable(c: CohortReturns): CohortTableRow[] {
  // 27 Sep 2026 (fixer review): "came back" beside "sign-ups" also prints
  // the ones who did not; both must pass the gate (subsetPublishable).
  return c.weekly.value.map((w) => ({
    week: w.week,
    label: shortWeekLabel(w.label),
    signups: cell(w.cohort),
    returned: subsetPublishable(w.returned, w.cohort) ? cell(w.returned) : SUPPRESSED,
    share: shareCell(w.returned, w.cohort),
  }));
}

// ── Weekly table ──────────────────────────────────────────────────────

export interface WeeklyView {
  columns: readonly { key: WeeklyColumn; label: string; definition: string }[];
  rows: { week: string; label: string; cells: Record<WeeklyColumn, string> }[];
  series: Record<WeeklyColumn, (number | null)[]>;
  footnotes: string[];
}

export function weeklyView(w: WeeklyUsage): WeeklyView {
  const rows = w.weeks.value;
  const ratio = (mocks: number, act: number): number | null => (publishable(act) ? Math.round((mocks / act) * 100) / 100 : null);
  const gate = (n: number | null): number | null => (publishable(n) ? n : null);
  const first = parseWeekSlug(PEOPLE_FIRST_WEEK);
  const footnotes: string[] = [];
  if (first) {
    footnotes.push(
      `“People who came” shows ${SUPPRESSED} for weeks before ${istDayLabel(first.startDay)}: identity rules changed on 31 Jul and 16 Aug 2026, so earlier weeks are not comparable.`,
    );
  }
  if (humanRuleMissesTaggedSinglePage()) {
    footnotes.push(
      // 27 Sep 2026 (integrator): such identities failed the rule before this
      // day too (about 45 a week in the two weeks before it), so the footnote
      // says "more of these" rather than dating the whole gap from it.
      `A visitor who arrives on a tagged link (for example from ChatGPT) with no referrer and reads a single page is not counted when that visit carries an identity, because one tagged page view does not meet the counter's rule; with no identity it is counted as a landing. From ${istDayLabel(TAGGED_IDENTITY_FROM_DAY)} more of these visitors are given an identity, so weeks from then on read lower than earlier weeks by that many.`,
    );
  }
  return {
    columns: WEEKLY_COLUMNS,
    rows: rows.map((r) => ({
      week: r.week,
      label: shortWeekLabel(r.label),
      cells: {
        signups: cell(r.signups),
        peopleWhoCame: r.peopleWhoCame === null ? SUPPRESSED : cell(r.peopleWhoCame),
        mocks: cell(r.mocks),
        tutorQuestions: cell(r.tutorQuestions),
        activeAccounts: cell(r.activeAccounts),
        mocksPerActive: ratioCell(r.mocks, r.activeAccounts),
      },
    })),
    // The sparklines print through the same K_MIN gate as the cells.
    series: {
      signups: rows.map((r) => gate(r.signups)),
      peopleWhoCame: rows.map((r) => gate(r.peopleWhoCame)),
      mocks: rows.map((r) => gate(r.mocks)),
      tutorQuestions: rows.map((r) => gate(r.tutorQuestions)),
      activeAccounts: rows.map((r) => gate(r.activeAccounts)),
      mocksPerActive: rows.map((r) => ratio(r.mocks, r.activeAccounts)),
    },
    footnotes,
  };
}

// ── Sources ───────────────────────────────────────────────────────────

export interface SourceView {
  rows: { key: string; label: string; n: string; share: string }[];
  total: string;
  named: string | null;
  ai: string | null;
}

/** 27 Sep 2026 (fixer review): the "Named source" and "From AI assistants"
 *  lines go through sourceSubsetCount — printed only when the subset is a
 *  union of the table's groups and it and the rest pass K_MIN. Week 38 had
 *  15 sign-ups with no source merged into a group of 37; "128 of 143" gave
 *  them back by subtraction. */
export function sourceView(s: PublicNumber<SourceSplit>): SourceView {
  const v = s.value;
  const line = (n: number | null): string | null => {
    if (n === null) return null;
    const pct = shareCell(n, v.total);
    return pct === SUPPRESSED ? null : `${formatInt(n)} of ${formatInt(v.total)} (${pct})`;
  };
  return {
    rows: v.groups.map((g) => ({ key: g.key, label: g.label, n: cell(g.n), share: shareCell(g.n, v.total) })),
    total: cell(v.total),
    named: line(namedSourceCount(v)),
    ai: line(aiSourceCount(v)),
  };
}

export const SOURCE_LIMITS =
  "What cannot be seen: a visitor who reads one page and arrives with no referrer and no tag gets no identity, and some apps strip both the referrer and the tag, so the AI-assistant share is a floor. ChatGPT's links carry utm_source=chatgpt.com and no referrer; they are counted by that tag.";

// ── Answer check ──────────────────────────────────────────────────────

export interface CheckRowView {
  label: string;
  value: string;
  note?: string;
}

export function answerCheckRows(a: PublicNumber<AnswerCheck>): { outcomes: CheckRowView[]; liveBefore: CheckRowView[] } {
  const c = a.value;
  const outcomes: CheckRowView[] = [
    { label: "Questions checked", value: formatInt(c.checked) },
    { label: "Accepted as written", value: formatInt(c.accepted) },
    { label: "Answer key corrected", value: formatInt(c.keyCorrected) },
    // 27 Sep 2026 (integrator): includes questions that were never live, so
    // not "removed"; the live-before rows below show what the check took out.
    { label: "Withdrawn (not served in any practice pool)", value: formatInt(c.withdrawn) },
  ];
  if (c.other > 0) outcomes.push({ label: "Other outcome (changed by hand after the check)", value: formatInt(c.other) });
  outcomes.push({
    label: "Live questions never checked",
    value: formatInt(c.uncheckedLive),
    note: `on ${formatInt(c.uncheckedExams)} exam${c.uncheckedExams === 1 ? "" : "s"}; validated at insert or in bulk before the check existed`,
  });
  if (c.lastCheckDay) outcomes.push({ label: "Last check day", value: istDayLabel(c.lastCheckDay) });
  const liveBefore: CheckRowView[] = publishable(c.liveBefore)
    ? [
        { label: "Questions live before the check", value: formatInt(c.liveBefore) },
        { label: "Kept as written", value: formatInt(c.liveKept), note: formatPct(share(c.liveKept, c.liveBefore)) },
        { label: "Answer key corrected", value: formatInt(c.liveCorrected), note: formatPct(share(c.liveCorrected, c.liveBefore)) },
        { label: "Withdrawn", value: formatInt(c.liveWithdrawn), note: formatPct(share(c.liveWithdrawn, c.liveBefore)) },
      ]
    : [];
  return { outcomes, liveBefore };
}

// ── JSON-LD ───────────────────────────────────────────────────────────

function pv(name: string, value: number | null, unitText: string, description: string, digits = 1): object | null {
  if (value === null || !Number.isFinite(value)) return null;
  const f = 10 ** digits;
  return { "@type": "PropertyValue", name, value: Math.round(value * f) / f, unitText, description };
}

function pooledPct(n: PublicNumber<{ num: number; den: number }> | null | undefined): number | null {
  if (!n || !subsetPublishable(n.value.num, n.value.den)) return null;
  return share(n.value.num, n.value.den);
}

/** Dataset JSON-LD: every headline number with its definition. */
export function numbersDatasetLd(p: PublicNumbers): object {
  const vars: (object | null)[] = [
    pv("Came back within 7 days of signing up", pooledPct(p.cohorts?.within7), "percent", p.cohorts?.within7.definition ?? ""),
    pv("Came back on days 8 to 30", pooledPct(p.cohorts?.days8to30), "percent", p.cohorts?.days8to30.definition ?? ""),
    // 27 Sep 2026 (fixer review): the strict figure, as on the tile.
    pv("Active in the last 30 days, on a day after signing up", pooledPct(p.actives?.afterSignupDay), "percent of accounts", p.actives?.afterSignupDay.definition ?? ""),
    p.weekly && publishable(p.weekly.mocksPerActive.value.actives)
      ? pv(
          "Mocks per weekly active account",
          p.weekly.mocksPerActive.value.mocks / p.weekly.mocksPerActive.value.actives,
          "mocks per account",
          p.weekly.mocksPerActive.definition,
          2,
        )
      : null,
    // 27 Sep 2026 (fixer review): the same gate as the page's AI line.
    p.signupSources && aiSourceCount(p.signupSources.value) !== null
      ? pv("Sign-ups arriving from AI assistants", share(aiSourceCount(p.signupSources.value), p.signupSources.value.total), "percent of sign-ups", p.signupSources.definition)
      : null,
    p.answerCheck ? pv("Questions answer-checked", p.answerCheck.value.checked, "questions", p.answerCheck.definition) : null,
    p.answerCheck ? pv("Answer keys corrected by the check", p.answerCheck.value.keyCorrected, "questions", p.answerCheck.definition) : null,
    p.answerCheck ? pv("Questions withdrawn by the check", p.answerCheck.value.withdrawn, "questions", p.answerCheck.definition) : null,
    ...(p.counters?.value ?? []).map((c: CounterRow) => (counterCell(c) === SUPPRESSED ? null : pv(c.label, c.value, "count", c.definition))),
  ];
  const weeks = [...(p.cohorts?.weekly.value ?? []).map((w) => w.week), ...(p.weekly?.weeks.value ?? []).map((w) => w.week)]
    .map((s) => parseWeekSlug(s))
    .filter((w): w is NonNullable<typeof w> => w !== null)
    .sort((a, b) => (a.startDay < b.startDay ? -1 : 1));
  const temporal = weeks.length ? `${weeks[0].startDay}/${weeks[weeks.length - 1].endDay}` : undefined;
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${NUMBERS_URL}#dataset`,
    name: "Shishya in numbers",
    description:
      "Numbers about Shishya, a free study platform for students in India, each with its definition and date: sign-ups, mocks and AI tutor questions by week, how many students come back, where they arrive from, and what the automated answer check found.",
    url: NUMBERS_URL,
    creator: { "@id": SITE_ORG_ID },
    publisher: { "@id": SITE_ORG_ID },
    dateModified: p.today,
    ...(temporal ? { temporalCoverage: temporal } : {}),
    isAccessibleForFree: true,
    inLanguage: "en-IN",
    measurementTechnique: "Counts over Shishya's production database; definitions on the page",
    variableMeasured: vars.filter((v): v is object => v !== null),
    distribution: [{ "@type": "DataDownload", encodingFormat: "text/markdown", contentUrl: `${SITE_URL}${CONTEXT_MD_PATH}` }],
  };
}

export function numbersFaqFor(p: PublicNumbers): [string, string][] {
  return numbersFaq({
    today: p.today,
    accounts: p.counters?.value.find((c) => c.key === "totalSignups")?.value ?? null,
    cohorts: p.cohorts,
    actives: p.actives,
    signupSources: p.signupSources,
    answerCheck: p.answerCheck,
  });
}

// ── Markdown (context.md) ─────────────────────────────────────────────

function mdTable(head: string[], rows: string[][]): string[] {
  const esc = (s: string) => s.replace(/\|/g, "\\|");
  return [`| ${head.map(esc).join(" | ")} |`, `| ${head.map(() => "---").join(" | ")} |`, ...rows.map((r) => `| ${r.map(esc).join(" | ")} |`)];
}

function defLine(n: { definition: string; period: string; asOf: string }): string {
  return `Definition: ${n.definition} Period: ${n.period}. Computed ${istDayLabel(n.asOf)} (IST).`;
}

export function numbersMarkdown(p: PublicNumbers): string {
  const L: string[] = [];
  L.push("# Shishya in numbers");
  L.push("");
  L.push(
    `Every number below is counted from Shishya's database when this file is built, with its definition. Computed ${istDayLabel(p.today)} (IST), refreshed hourly. Only complete ISO weeks (IST, Monday to Sunday) are reported, and no count of people, or of what they did, is printed below ${formatInt(K_MIN)} (counts of exams, papers and chapters can be smaller). HTML page: ${NUMBERS_URL}`,
  );
  L.push("");

  L.push("## Do students come back?");
  L.push("");
  for (const t of headlineTiles(p)) {
    L.push(`- ${t.label}: ${t.value ?? NOT_COMPUTED_TEXT}${t.sub ? ` — ${t.sub}` : ""}${t.period ? ` (${t.period})` : ""}.`);
    if (t.definition) L.push(`  Definition: ${t.definition}`);
  }
  if (p.cohorts) {
    L.push("");
    L.push(`### ${p.cohorts.weekly.label}`);
    L.push("");
    L.push(...mdTable(["Sign-up week", "Sign-ups", "Came back within 7 days", "Share"], cohortTable(p.cohorts).map((r) => [r.label, r.signups, r.returned, r.share])));
    L.push("");
    L.push(defLine(p.cohorts.weekly));
  }
  L.push("");

  L.push("## Where new students arrive from");
  L.push("");
  for (const s of [p.signupSources, p.newPeople]) {
    if (!s) continue;
    const v = sourceView(s);
    L.push(`### ${s.label} (${s.period})`);
    L.push("");
    L.push(...mdTable(["Source", "Count", "Share"], v.rows.map((r) => [r.label, r.n, r.share])));
    if (v.named) L.push("", `Named source (a tag or referrer said where the first visit came from): ${v.named}.`);
    if (v.ai) L.push(`From AI assistants: ${v.ai}.`);
    L.push("", defLine(s), "");
  }
  L.push(SOURCE_LIMITS);
  L.push("");

  if (p.weekly) {
    const wv = weeklyView(p.weekly);
    L.push("## Week by week");
    L.push("");
    L.push(...mdTable(["Week", ...wv.columns.map((c) => c.label)], wv.rows.map((r) => [r.label, ...wv.columns.map((c) => r.cells[c.key])])));
    L.push("");
    L.push(defLine(p.weekly.weeks));
    for (const c of wv.columns) L.push(`- ${c.label}: ${c.definition}`);
    for (const f of wv.footnotes) L.push(`- ${f}`);
    L.push("");
  }

  if (p.counters) {
    L.push("## All-time counters");
    L.push("");
    for (const c of p.counters.value) L.push(`- ${c.label}: ${counterCell(c)}. Definition: ${c.definition}`);
    L.push("", `Computed ${istDayLabel(p.counters.asOf)} (IST). Live numbers (active now, today) are on the home page strip: ${SITE_URL}/`, "");
  }

  if (p.coverage) {
    L.push("## What Shishya covers");
    L.push("");
    for (const g of p.coverage.value as CoverageGroup[]) {
      L.push(`### ${g.title}`, "");
      for (const r of g.rows) L.push(`- ${r.label}: ${formatInt(r.value)}${r.detail ? ` (${r.detail})` : ""}. ${r.definition}`);
      L.push("");
    }
  }

  L.push("## Answer check");
  L.push("");
  L.push(answerCheckMethod());
  if (p.answerCheck) {
    const rows = answerCheckRows(p.answerCheck);
    L.push("");
    for (const r of rows.outcomes) L.push(`- ${r.label}: ${r.value}${r.note ? ` (${r.note})` : ""}`);
    if (rows.liveBefore.length) {
      L.push("", "Among questions that were live before the check:");
      for (const r of rows.liveBefore) L.push(`- ${r.label}: ${r.value}${r.note ? ` (${r.note})` : ""}`);
    }
    L.push("", defLine(p.answerCheck));
  } else {
    L.push("", `Results: ${NOT_COMPUTED_TEXT}.`);
  }
  if (p.reports && publishable(p.reports.value.den) && publishable(p.reports.value.num)) {
    L.push("", `Student question reports: ${formatInt(p.reports.value.den)} received, ${formatInt(p.reports.value.num)} closed (all time). ${p.reports.definition}`);
  }
  L.push("");

  L.push("## Questions");
  L.push("");
  for (const [q, a] of numbersFaqFor(p)) L.push(`### ${q}`, "", a, "");

  L.push("## How to cite");
  L.push("");
  L.push(citationLine(p.today));
  L.push("");
  L.push(`Editorial policy: ${SITE_URL}/editorial-policy · Weekly data note: ${SITE_URL}/pulse · Press kit: ${SITE_URL}/press · About: ${SITE_URL}/about`);
  L.push("");
  return L.join("\n");
}
