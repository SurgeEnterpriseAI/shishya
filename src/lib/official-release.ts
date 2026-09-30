// Official releases on the surfaces (30 Sep 2026). PURE — no DB, no dict.
//
// The official watch (src/lib/answer-key-watch.ts) writes an answer-key /
// result row with source OFFICIAL_WATCH_SOURCE only after our own fetch read
// the link on the conducting body's page. Those rows — and only those — may
// be worded "released" / "published":
//   hub + /updates   "Official answer key released — {date} — {host}"
//                    "Official result published — {date} — {host}"
//                    ({host} is the link), for RELEASE_SHOWN_DAYS days after
//                    the release, whatever the exam-week phase (the exam-week
//                    block ends 7 days after the exam; results come a median
//                    25 days after it);
//   /updates title   "{exam} answer key {year} (official)" — only while such a
//                    row is on the page;
//   context.md / llms-full.txt   one line per release, same wording.
// An AI-cited official row keeps "{date} (official)": an announced DATE, not
// a release anyone saw. A row first seen without a printed date says "first
// seen {date} on {host}" — never a release day we did not read.

import { FIRST_SEEN_NOTE_PREFIX, OFFICIAL_WATCH_SOURCE, fmtDay, resolveKind } from "@/lib/exam-timeline";
import { citableSourceUrl, sourceHostLabel, sourceTier } from "@/lib/official-source";
import { istDayNumber } from "@/lib/exam-phase";

export const RELEASE_SHOWN_DAYS = 30;
/** The note prefix answer-key-watch writes when the body printed no single
 *  release date (defined in exam-timeline so TimelineRow.firstSeen reads it). */
export { FIRST_SEEN_NOTE_PREFIX };

export type ReleaseKind = "ANSWER_KEY" | "RESULT";

export interface ReleaseRowInput {
  id: string;
  label: string;
  date: Date | string;
  isExamDay: boolean;
  kind?: string | null;
  confidence?: string | null;
  url?: string | null;
  source?: string | null;
  notes?: string | null;
}

export interface OfficialRelease {
  kind: ReleaseKind;
  id: string;
  date: Date;
  /** ISO day of the release (the stored IST day). */
  day: string;
  host: string;
  url: string;
  label: string;
  /** The body printed no single date: `date` is the day we first saw it. */
  firstSeen: boolean;
  /** The cycle year a title may print: the label's own year, else the date's. */
  year: number;
}

export interface OfficialReleases {
  answerKey: OfficialRelease | null;
  result: OfficialRelease | null;
}

/** Is this row a verified release (official-watch source, official tier,
 *  citable link, answer-key or result kind)? */
export function isVerifiedRelease(r: ReleaseRowInput, officialUrl: string | null | undefined): boolean {
  if ((r.source ?? "") !== OFFICIAL_WATCH_SOURCE) return false;
  const url = citableSourceUrl(r.url ?? null);
  if (!url) return false;
  const kind = resolveKind({ kind: r.kind, label: r.label, isExamDay: !!r.isExamDay });
  if (kind !== "ANSWER_KEY" && kind !== "RESULT") return false;
  return sourceTier(r.confidence, url, officialUrl) === "official";
}

/** The newest verified answer key and result released within the last
 *  RELEASE_SHOWN_DAYS IST days (none dated after today). Dates may arrive as
 *  ISO strings (unstable_cache hits). */
export function officialReleases(
  rows: readonly ReleaseRowInput[],
  officialUrl: string | null | undefined,
  now: Date = new Date(),
): OfficialReleases {
  const today = istDayNumber(now);
  const out: OfficialReleases = { answerKey: null, result: null };
  for (const r of rows) {
    if (!isVerifiedRelease(r, officialUrl)) continue;
    const date = r.date instanceof Date ? r.date : new Date(r.date);
    if (!Number.isFinite(date.getTime())) continue;
    const d = istDayNumber(date);
    if (d > today || today - d > RELEASE_SHOWN_DAYS) continue;
    const kind = resolveKind({ kind: r.kind, label: r.label, isExamDay: !!r.isExamDay }) as ReleaseKind;
    const url = citableSourceUrl(r.url ?? null)!;
    const named = /(?:^|[^0-9])(20[0-9]{2})(?![0-9])/.exec(r.label);
    const rel: OfficialRelease = {
      kind,
      id: r.id,
      date,
      day: date.toISOString().slice(0, 10),
      host: sourceHostLabel(url),
      url,
      label: r.label,
      firstSeen: (r.notes ?? "").toLowerCase().startsWith(FIRST_SEEN_NOTE_PREFIX),
      year: named ? Number(named[1]) : date.getUTCFullYear(),
    };
    const slot = kind === "ANSWER_KEY" ? "answerKey" : "result";
    const prev = out[slot];
    if (!prev || rel.date.getTime() > prev.date.getTime() || (rel.date.getTime() === prev.date.getTime() && rel.id > prev.id)) out[slot] = rel;
  }
  return out;
}

/** The i18n key of a release line. */
export function releaseLineKey(r: Pick<OfficialRelease, "kind" | "firstSeen">): "release.ak" | "release.akFirstSeen" | "release.result" | "release.resultFirstSeen" {
  if (r.kind === "ANSWER_KEY") return r.firstSeen ? "release.akFirstSeen" : "release.ak";
  return r.firstSeen ? "release.resultFirstSeen" : "release.result";
}

/** A template split around its {host} slot, {date} filled — so a surface
 *  can render the host as the link. */
export function releaseLineParts(template: string, r: Pick<OfficialRelease, "date" | "host">, locale: string): { before: string; host: string; after: string } {
  const filled = template.replace(/\{date\}/g, fmtDay(r.date, locale));
  const i = filled.indexOf("{host}");
  if (i === -1) return { before: filled, host: "", after: "" };
  return { before: filled.slice(0, i), host: r.host, after: filled.slice(i + "{host}".length) };
}

/** The whole line as text (context.md, llms, tests). */
export function releaseLineText(template: string, r: Pick<OfficialRelease, "date" | "host">, locale: string): string {
  const p = releaseLineParts(template, r, locale);
  return `${p.before}${p.host}${p.after}`;
}

/** The release the /updates title names: the newer of the two (a result
 *  after its key is the moment searchers want). */
export function titleRelease(rs: OfficialReleases): OfficialRelease | null {
  const { answerKey: a, result: r } = rs;
  if (a && r) return r.date.getTime() >= a.date.getTime() ? r : a;
  return a ?? r;
}

/** English machine line (context.md / llms-full.txt): what was seen, where,
 *  and the file — the same honesty as the page. */
export function releaseMachineLine(r: OfficialRelease): string {
  const what = r.kind === "ANSWER_KEY" ? "Official answer key released" : "Official result published";
  // Review, 30 Sep 2026: "first seen" also covers a row whose printed dates
  // all fell outside the exam-to-today window — "no single release date".
  const when = r.firstSeen ? `first seen ${r.day} on ${r.host} (no single release date printed beside the link)` : `${r.day} — ${r.host}`;
  return `${what} — ${when}: ${r.url}`;
}
