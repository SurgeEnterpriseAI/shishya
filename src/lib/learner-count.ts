// Who counts as ONE learner on the live strip (3 Oct 2026) — pure: SQL
// fragments + a JS mirror of the same rules for tests and read-only scripts.
//
// Why (RCA 2 Oct 2026): on 2 Oct the strip said "+336 today" while about
// 112-138 new people came. Three faults:
//   1. a new account was counted twice — once by the anonymous id its
//      browser had before sign-in, once by the account id (18 of 19 that day;
//      fixed below for accounts made since 11 Sep 2026 — see PERSON KEY);
//   2. every identity-less browser page view counted as one learner — a page
//      view, not a person;
//   3. one automated reader (176 of those views) was not tagged as a bot
//      (fixed in src/lib/bot-scrub.ts, deep-reader rule — tagged rows leave
//      the count because only client = 'browser' rows are read here).
//
// The rules:
//   • PERSON KEY (identified page views): the account id; else the account
//     the browser's anonymous id signed up as (the SIGNUP row carries both
//     ids — the first account if one browser made two); else the anonymous
//     id. The stats scripts' rule (scripts/tmp-latest-stats.ts, CTE sig).
//     The learner rule itself (2+ page views, or one view with a referrer or
//     a tag) is unchanged and applies to the merged person.
//     ONLY FOR ACCOUNTS MADE SINCE 11 SEP 2026: SIGNUP rows carry the
//     browser id from 11 Sep 2026 16:02 UTC on (every one since; none
//     before). The 1,033 accounts made between 30 Jul 2026 (when the browser
//     id began) and that moment cannot be joined to the browser id they
//     signed up from, so most of those people still count twice: 1,031 of
//     the accounts are learners themselves, and a 2-minute time match (right
//     293 times in 303 on sign-ups whose link is known) finds a learner
//     browser id for 687 of them — an estimated 660 to 1,030 people counted
//     twice in the all-time figure (scripts/tmp-strip-8.ts, 3 Oct 2026).
//     "+N today" is not affected. Accounts made before 30 Jul had no browser
//     id to join (their earlier visits were not counted as people). A
//     one-time link from the time match (single candidate within 2 minutes)
//     would remove about 660 of them; founder decision, not built.
//   • LANDING KEY (identity-less browser page views — client = 'browser',
//     no userId, no anonId; tagged bots never enter):
//       – with an address fingerprint (every such row since 18 Aug 2026
//         03:23 UTC, except Class 1-7 pages): one learner per device per IST
//         day — ipHash + uaHash + the IST date;
//       – a Class 1-7 school page (stored with no fingerprint by design,
//         founder rule 5): one learner per class page (board + class) per IST
//         day. The data (3 Oct 2026): 42 such rows ever, 7 of them within 2
//         minutes of the previous row on the same class; 21 class-days. One
//         row per learner overstated; one per class-day cannot.
//       – no fingerprint, before 18 Aug 2026 (3,681 rows, 30 Jul–18 Aug):
//         nothing to group by, so one learner per row — but only when the row
//         carries a referrer or a tag, or lands on an entry page (the bot
//         scrub's human-safety list): 1,636 referred, 692 tagged, 160 entry
//         pages. A direct deep-page row of that era (1,193 rows) is not
//         counted: once fingerprints existed, 96% of that class (17,428 of
//         18,125 rows) were tagged as machines (the botnet rule or the
//         deep-reader rule), and before them its night share (00-06 IST) was
//         26.3% against 4.5% for referred rows — flat round-the-clock
//         traffic, a crawler's (scripts/tmp-strip-5.ts, 3 Oct 2026). Nobody
//         is lost through the gap-era overlap by this: the persons it
//         subtracts had a counted row just before their first identified
//         view (892, against 248 in a control window an hour earlier), the
//         dropped class only at chance (48 against 51). Kept but doubtful:
//         the 160 direct entry-page rows of that era have an 18.1% night
//         share, so perhaps 100 of them were machines (review, 3 Oct 2026).
//   • The gap-era overlap (identities whose first view falls 30 Jul 20:00 –
//     16 Aug 17:00 UTC left one identity-less landing each) is subtracted as
//     before, on the merged person.
//   • NOT corrected (3 Oct 2026, open): a visitor whose first page had no
//     referrer and no tag gets an identity only from the second page, so
//     that first landing counts as a device AND the identity as a person.
//     Identified rows carry no fingerprint (privacy rule of the ingest), so
//     the two cannot be joined; measured at 1–13 new persons a day (about 7)
//     over 20 Sep – 3 Oct 2026.
//
// learners = engaged persons + max(0, landing keys − gap-era overlap).
// "+N today" = persons that first met the rule today − gap-era overlaps that
// closed today + today's landing keys (a key holds its IST date, so every key
// of a row since midnight is new today).

import { entryPathSql, isEntryPath } from "@/lib/bot-scrub";

/** The gap era (identity-less first hits, before the 16 Aug 2026 referred-first-hit fix). */
export const GAP_ERA_FROM = "2026-07-30T20:00:00Z";
export const GAP_ERA_TO = "2026-08-16T17:00:00Z";

/** isUnder13SchoolPath's regex (src/lib/school/student-classes.ts), as SQL — pinned equal in tests. */
export const CHILD_PATH_RE = "^/schooling/[^/?#]+/class-[1-7]([/?#]|$)";
const CHILD_PAGE_RE = "^/schooling/[^/?#]+/class-[1-7]";

/** CTE "sig": anonymous id → the account it signed up as. Prefix a query with `WITH ${SIGNUP_LINK_CTE}`. */
export const SIGNUP_LINK_CTE = `sig AS (
      SELECT DISTINCT ON (s."anonId") s."anonId", s."userId" FROM "AnalyticsEvent" s
      WHERE s.kind = 'SIGNUP' AND s."anonId" IS NOT NULL AND s."userId" IS NOT NULL
      ORDER BY s."anonId", s."createdAt")`;

/** The join that brings sig in for alias a. */
export const signupJoinSql = (a: string): string => `LEFT JOIN sig ON sig."anonId" = ${a}."anonId"`;

/** The merged person of an identified row (needs signupJoinSql). */
export const personKeySql = (a: string): string => `COALESCE(${a}."userId", sig."userId", ${a}."anonId")`;

/** The rows the landing key applies to. */
export const walkInWhereSql = (a: string): string =>
  `${a}.kind = 'PAGE_VIEW' AND ${a}."client" = 'browser' AND ${a}."userId" IS NULL AND ${a}."anonId" IS NULL`;

/** The landing key of an identity-less browser page view (NULL = not counted). */
export function landingKeySql(a: string): string {
  const day = `to_char(${a}."createdAt" + interval '330 minutes', 'YYYYMMDD')`;
  return `CASE
        WHEN ${a}."ipHash" IS NOT NULL THEN 'd' || ${day} || ':' || ${a}."ipHash" || ':' || COALESCE(${a}."uaHash", '')
        WHEN COALESCE(${a}.path, '') ~ '${CHILD_PATH_RE}' THEN 'c' || ${day} || ':' || substring(${a}.path from '${CHILD_PAGE_RE}')
        WHEN ${a}."refHost" IS NOT NULL OR ${a}."utmSource" IS NOT NULL OR ${entryPathSql(`${a}.path`)} THEN 'r' || ${a}.id
      END`;
}

// ── JS mirror (tests, read-only scripts) ──────────────────────────────

export interface LearnerRow {
  id: string;
  kind: string;
  userId: string | null;
  anonId: string | null;
  refHost: string | null;
  utmSource: string | null;
  uaHash: string | null;
  ipHash: string | null;
  client: string | null;
  path: string | null;
  createdAt: Date;
}

const IST_MS = 5.5 * 3600_000;
const istDate = (at: Date) => new Date(at.getTime() + IST_MS).toISOString().slice(0, 10).replace(/-/g, "");

/** anonId → account, from SIGNUP rows (the first sign-up of a browser wins). */
export function signupLinks(rows: readonly LearnerRow[]): Map<string, string> {
  const out = new Map<string, { userId: string; at: number }>();
  for (const r of rows) {
    if (r.kind !== "SIGNUP" || !r.anonId || !r.userId) continue;
    const prev = out.get(r.anonId);
    if (!prev || r.createdAt.getTime() < prev.at) out.set(r.anonId, { userId: r.userId, at: r.createdAt.getTime() });
  }
  return new Map([...out].map(([a, v]) => [a, v.userId]));
}

export function personKey(r: LearnerRow, links: ReadonlyMap<string, string>): string | null {
  return r.userId ?? (r.anonId ? (links.get(r.anonId) ?? r.anonId) : null);
}

export function isWalkInRow(r: LearnerRow): boolean {
  return r.kind === "PAGE_VIEW" && r.client === "browser" && r.userId === null && r.anonId === null;
}

export function landingKey(r: LearnerRow): string | null {
  const day = istDate(r.createdAt);
  const path = r.path ?? "";
  if (r.ipHash !== null) return `d${day}:${r.ipHash}:${r.uaHash ?? ""}`;
  if (new RegExp(CHILD_PATH_RE).test(path)) return `c${day}:${path.match(new RegExp(CHILD_PAGE_RE))![0]}`;
  if (r.refHost !== null || r.utmSource !== null || isEntryPath(r.path)) return `r${r.id}`;
  return null;
}

export interface LearnerCounts {
  /** uniqueVisitors */
  total: number;
  /** uniqueVisitorsToday */
  today: number;
  engaged: number;
  walkIns: number;
  overlap: number;
  /** today's parts: persons new today, overlaps closed today, landing keys today */
  engagedToday: number;
  overlapToday: number;
  walkInsToday: number;
  /** Per section (when sectionOf is given): the strip's by-section fold. */
  sections?: Record<string, { total: number; today: number }>;
}

/** The strip's learner arithmetic on rows, the way the SQL does it.
 *  sectionOf maps a page path to its group (null/"exploring" = no vote). */
export function countLearners(rows: readonly LearnerRow[], dayStart: Date, sectionOf?: (path: string | null) => string): LearnerCounts {
  const links = signupLinks(rows);
  const start = dayStart.getTime();
  const gapFrom = Date.parse(GAP_ERA_FROM);
  const gapTo = Date.parse(GAP_ERA_TO);
  type P = { c: number; r: boolean; u: boolean; cb: number; rb: boolean; ub: boolean; first: number; votes: Map<string, { n: number; last: number }> };
  const persons = new Map<string, P>();
  type W = { today: boolean; votes: Map<string, { n: number; last: number }> };
  const walk = new Map<string, W>();
  const vote = (m: Map<string, { n: number; last: number }>, r: LearnerRow) => {
    if (!sectionOf) return;
    const s = sectionOf(r.path);
    if (!s || s === "exploring") return;
    const v = m.get(s) ?? { n: 0, last: 0 };
    v.n++;
    v.last = Math.max(v.last, r.createdAt.getTime());
    m.set(s, v);
  };
  for (const r of rows) {
    if (r.kind !== "PAGE_VIEW") continue;
    const t = r.createdAt.getTime();
    if (r.userId !== null || r.anonId !== null) {
      const k = personKey(r, links)!;
      const p = persons.get(k) ?? { c: 0, r: false, u: false, cb: 0, rb: false, ub: false, first: Infinity, votes: new Map() };
      p.c++;
      p.r ||= r.refHost !== null;
      p.u ||= r.utmSource !== null;
      if (t < start) {
        p.cb++;
        p.rb ||= r.refHost !== null;
        p.ub ||= r.utmSource !== null;
      }
      p.first = Math.min(p.first, t);
      vote(p.votes, r);
      persons.set(k, p);
    } else if (isWalkInRow(r)) {
      const k = landingKey(r);
      if (k === null) continue;
      const w = walk.get(k) ?? { today: false, votes: new Map() };
      w.today ||= t >= start;
      vote(w.votes, r);
      walk.set(k, w);
    }
  }
  const primary = (votes: Map<string, { n: number; last: number }>) =>
    [...votes.entries()].sort((a, b) => b[1].n - a[1].n || b[1].last - a[1].last)[0]?.[0] ?? "exploring";
  const sections: Record<string, { total: number; today: number }> = {};
  const add = (s: string, total: number, today: number) => {
    const b = sections[s] ?? { total: 0, today: 0 };
    b.total += total;
    b.today += today;
    sections[s] = b;
  };
  let engaged = 0;
  let engagedToday = 0;
  let overlap = 0;
  let overlapToday = 0;
  for (const p of persons.values()) {
    const meets = p.c >= 2 || (p.c === 1 && (p.r || p.u));
    if (!meets) continue;
    const metBefore = p.cb >= 2 || (p.cb === 1 && (p.rb || p.ub));
    const isNew = metBefore ? 0 : 1;
    engaged++;
    engagedToday += isNew;
    const gap = p.c >= 2 && p.first >= gapFrom && p.first < gapTo;
    const gapToday = gap && p.cb < 2 ? 1 : 0;
    if (gap) overlap++;
    overlapToday += gapToday;
    if (sectionOf) add(primary(p.votes), 1 - (gap ? 1 : 0), isNew - gapToday);
  }
  let walkInsToday = 0;
  for (const w of walk.values()) {
    if (w.today) walkInsToday++;
    if (sectionOf) add(primary(w.votes), 1, w.today ? 1 : 0);
  }
  const walkIns = walk.size;
  return {
    total: engaged + Math.max(0, walkIns - overlap),
    today: Math.max(0, engagedToday - overlapToday + walkInsToday),
    engaged,
    walkIns,
    overlap,
    engagedToday,
    overlapToday,
    walkInsToday,
    ...(sectionOf ? { sections } : {}),
  };
}
