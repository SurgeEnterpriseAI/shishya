// Result card (14 Sep 2026) — a mock result as a phone-size image a student
// posts to WhatsApp Status or a prep group. Pure rules and the card's words;
// the DB read is src/lib/result-card-db.ts, the image
// src/app/attempts/[id]/result-card/route.tsx, the button
// src/components/ResultCardShare.tsx.
//
// Honesty rules:
//   • A rank is printed only for the attempt that holds it (each student's
//     first attempt on the paper — a later practice run of the same paper
//     has a different score) and only when at least RESULT_CARD_MIN_COHORT
//     students were ranked. "Rank 1 of 2" is true and says nothing; on 14 Sep
//     2026 no shared mock had 30 takers and live tests had 0–2 in their
//     window, so most cards carry no rank yet.
//   • "All-India" only for the Sunday live test (one paper, one day, open to
//     everyone). An exam-week rehearsal stays open for days: its rank is "of
//     N who took this rehearsal", never All-India.
//   • The name is the account's first name, and only in Latin script, and the
//     card's words are English: next/og (Satori) draws Devanagari and Telugu
//     glyphs but does not shape them — conjuncts print with a visible virama
//     and pre-base vowel signs land after the consonant (checked 14 Sep 2026:
//     स्कोर, श्री and శ్రీనివాస్ all came out malformed), so Indic text would
//     look broken on the image. The buttons around it are translated.

import type { StringKey } from "@/lib/i18n";

export const RESULT_CARD_MIN_COHORT = 30;

/** What kind of paper the attempt was on. */
export type CardPaper = "live" | "rehearsal" | "shared" | "personal";

export interface PaperRank {
  rank: number;
  of: number;
  /** The attempt that holds this rank (the student's first on the paper). */
  rankedAttemptId: string;
}

/** The rank the card may print for this attempt, or null. */
export function printableRank(
  paper: CardPaper,
  r: PaperRank | null,
  attemptId: string,
  min: number = RESULT_CARD_MIN_COHORT,
): PaperRank | null {
  if (!r || paper === "personal") return null;
  if (r.rankedAttemptId !== attemptId) return null;
  if (!Number.isInteger(r.rank) || !Number.isInteger(r.of) || r.rank < 1 || r.rank > r.of || r.of < min) return null;
  return r;
}

const LATIN_WORD = /^[\p{Script=Latin}.'-]+$/u;

/** First word of the account name when it is Latin script and fits the card. */
export function cardFirstName(name: string | null | undefined): string | null {
  const first = (name ?? "").trim().split(/\s+/)[0] ?? "";
  if (!first || first.length > 18 || !LATIN_WORD.test(first)) return null;
  return first;
}

export interface ResultCardInput {
  firstName: string | null;
  examShort: string;
  paper: CardPaper;
  scoreRaw: number | null;
  scoreMax: number | null;
  scorePct: number | null;
  correct: number;
  total: number;
  personalBest: boolean;
  /** Already passed through printableRank. */
  rank: PaperRank | null;
}

export interface ResultCardCopy {
  kicker: string;
  headline: string;
  score: string;
  detail: string;
  badge: string | null;
  rankLine: string | null;
  footer: string;
}

/** Same display rule as formatDisplayScorePct (src/lib/scoring.ts): clamp at 0, one decimal. */
function pct(p: number | null): string {
  return p == null ? "—" : `${Math.max(0, p).toFixed(1)}%`;
}

/** 120 → "120", 37.5 → "37.5", 12.25 → "12.25". */
function marks(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
}

const count = (n: number) => n.toLocaleString("en-IN");

export function resultCardCopy(c: ResultCardInput): ResultCardCopy {
  const kicker =
    c.paper === "live"
      ? `${c.examShort} · All-India Live Test`
      : c.paper === "rehearsal"
        ? `${c.examShort} · exam-week rehearsal`
        : `${c.examShort} · mock test`;
  const correct = `${c.correct} of ${c.total} correct`;
  const detail = c.scoreRaw != null && c.scoreMax != null && c.scoreMax > 0 ? `${marks(Math.max(0, c.scoreRaw))} / ${marks(c.scoreMax)} marks · ${correct}` : correct;
  let rankLine: string | null = null;
  if (c.rank) {
    const { rank, of } = c.rank;
    if (c.paper === "live") rankLine = `All-India Rank ${count(rank)} of ${count(of)}`;
    else if (c.paper === "rehearsal") rankLine = `Rank ${count(rank)} of ${count(of)} who took this rehearsal`;
    else if (c.paper === "shared") rankLine = `Rank ${count(rank)} of ${count(of)} who took this mock`;
  }
  return {
    kicker,
    headline: c.firstName ? `${c.firstName} scored` : "My score",
    score: pct(c.scorePct),
    detail,
    badge: c.personalBest ? "Personal best" : null,
    rankLine,
    footer: "Free mocks, past papers and an AI tutor",
  };
}

// ── Button labels (translated) ─────────────────────────────────────────────

export const RESULT_CARD_I18N_KEYS = [
  "results.card.title",
  "results.card.body",
  "results.card.share",
  "results.card.preparing",
  "results.card.save",
  "results.card.saveHint",
  "results.card.error",
  "results.card.text",
] as const satisfies readonly StringKey[];

export interface ResultCardLabels {
  title: string;
  body: string;
  share: string;
  preparing: string;
  save: string;
  saveHint: string;
  error: string;
  /** {exam} {score} {url} */
  text: string;
}

export function resultCardLabels(t: (key: StringKey) => string): ResultCardLabels {
  return {
    title: t("results.card.title"),
    body: t("results.card.body"),
    share: t("results.card.share"),
    preparing: t("results.card.preparing"),
    save: t("results.card.save"),
    saveHint: t("results.card.saveHint"),
    error: t("results.card.error"),
    text: t("results.card.text"),
  };
}
