// loops-readout — the numbers behind /admin/loops (13 Sep 2026).
//
// Audit (11 Sep 2026): the score-share beacon had been written since wave
// 1 and read by nobody; 238 mails/day had no open/click readout; 264 of
// 800 signups carried no source; 30k+ AI-crawler hits a week sat unread in
// BotVisit. This module is the ONE reader for all of that:
//
//   • top half — PURE helpers (tag → mail family, touch-tag split, the
//     K-factor arithmetic, funnel fold, day pivot). Unit-tested, no DB.
//   • bottom half — sequential raw-SQL readers over EXISTING tables
//     (EmailTouch, AnalyticsEvent, User.signupReferrerHost, BotVisit).
//     Each swallows its own error and returns null so the page can print
//     "could not load" for that block instead of crashing the whole page.
//
// prisma is imported lazily inside the readers (same pattern as
// src/lib/email.ts) so email.ts can import `mailFamily` from here without
// dragging PrismaClient into every module that sends mail. Nothing here is
// shown publicly; /admin/loops is admin-gated, noindex and robots-disallowed.

// ── Constants ──────────────────────────────────────────────────────────

/** Crawler families the founder asked to see first (then the rest by total). */
export const BOT_FAMILIES_FIRST: readonly string[] = ["OAI-SearchBot", "ChatGPT-User", "Bingbot", "Googlebot"];

/** Stable row order for the mail funnel; families not listed sort after, A→Z. */
export const MAIL_FAMILY_ORDER: readonly string[] = [
  "welcome",
  "day3-nudge",
  "daily-five",
  "coach-morning",
  "evening-rescue",
  "winback",
  "live-test-invite",
  "live-test-reminder",
  "lt-result",
  "lt-rehearsal-result",
  "exam-eve",
  "exam-day-after",
  "result-day",
  "exam-alert",
  "demand-shipped",
];

/** Mail kinds that carry `unsubUserId` and therefore leave a 'sent:' row in
 *  EmailTouch (src/lib/email.ts sendEmail). Transactional kinds (welcome,
 *  aptitude-pass, mentor-session, …) log no send — their denominator on
 *  the page is the webhook's 'delivered:' count, never a fabricated sends
 *  number. */
export const LOGGED_SEND_FAMILIES: ReadonlySet<string> = new Set([
  "daily-five",
  "coach-morning",
  "evening-rescue",
  "winback",
  "day3-nudge",
  "live-test-invite",
  "exam-eve",
  "exam-day-after",
  "result-day",
  "challenge-play",
]);

/** Answers the "How did you find Shishya?" chip can record (FoundViaChipClient). */
export const FOUND_VIA_OPTIONS: readonly string[] = ["chatgpt", "google", "bing", "whatsapp", "telegram", "youtube", "other"];

// ── Pure helpers ───────────────────────────────────────────────────────

/**
 * The mail KIND behind a Resend tag. Per-instance tags (one per cluster,
 * per exam, per mock) collapse onto their family so the funnel has one row
 * per kind, not one per send batch. Unknown tags pass through unchanged.
 */
export function mailFamily(tag: string | null | undefined): string {
  const t = (tag ?? "").trim();
  if (!t) return "email";
  if (/^demand-shipped-/.test(t)) return "demand-shipped";
  if (/^result-day-[A-Za-z0-9_-]+-\d{8}$/.test(t)) return "result-day";
  if (/^exam-eve-[A-Z0-9_]+$/.test(t)) return "exam-eve";
  // The cron guard row is 'lt-result:<mockId>'; the Resend tag sanitiser
  // turns the colon into a dash, so the webhook echoes 'lt-result-<mockId>'.
  if (/^lt-result[:-][A-Za-z0-9_-]+$/.test(t) && t !== "lt-result") return "lt-result";
  return t;
}

export type TouchEvent = "sent" | "delivered" | "open" | "click" | "guard";

/**
 * Split an EmailTouch tag into its event prefix + the mail tag. Only the
 * four event prefixes are recognised; anything else (cron guard rows such
 * as 'winback', 'coach-morning', 'exam-eve-SSC_CGL', 'lt-result:<mockId>')
 * is `guard` with the tag intact — a colon inside a non-event tag must NOT
 * be read as a prefix, or the funnel miscounts.
 */
export function splitTouchTag(tag: string): { event: TouchEvent; tag: string } {
  const m = /^(sent|delivered|open|click):(.*)$/.exec(tag);
  if (!m) return { event: "guard", tag };
  return { event: m[1] as TouchEvent, tag: m[2] ?? "" };
}

export interface KInput {
  /** Share-button taps in the window (every surface × channel). */
  taps: number;
  /** Distinct signed-in users with any non-bot event in the window. */
  activeUsers: number;
  /** SIGNUP rows whose utm_medium=share (arrived on a share link). */
  shareSignups: number;
}

/**
 * K-factor upper bound of the MEASURED share loop:
 *   K ≤ shareSignups ÷ activeUsers = (taps ÷ activeUsers) × (shareSignups ÷ taps)
 * Every zero denominator yields 0 for that ratio (never NaN/Infinity).
 * `k` is computed directly, so it stays defined when taps = 0 and equals
 * tapsPerUser × signupsPerTap whenever both factors are defined.
 */
export function kFactor(x: KInput): { tapsPerUser: number; signupsPerTap: number; k: number } {
  const tapsPerUser = x.activeUsers > 0 ? x.taps / x.activeUsers : 0;
  const signupsPerTap = x.taps > 0 ? x.shareSignups / x.taps : 0;
  const k = x.activeUsers > 0 ? x.shareSignups / x.activeUsers : 0;
  return { tapsPerUser, signupsPerTap, k };
}

export interface FunnelRow {
  sent: number;
  delivered: number;
  open: number;
  click: number;
  /** Distinct users behind the 'sent:' rows (reach). */
  sentUsers: number;
}

/**
 * Fold EmailTouch (tag, n, users) rows into one funnel row per mail
 * family. Guard rows (no event prefix) are ignored; `n` is the row count
 * for every event column (the webhook writes at most one open/click/
 * delivered row per user per kind per 20 h, so rows ≈ user-days).
 */
export function foldFunnel(rows: { tag: string; n: number; users: number }[]): Map<string, FunnelRow> {
  const out = new Map<string, FunnelRow>();
  for (const r of rows) {
    const { event, tag } = splitTouchTag(r.tag);
    if (event === "guard") continue;
    const fam = mailFamily(tag);
    const row = out.get(fam) ?? { sent: 0, delivered: 0, open: 0, click: 0, sentUsers: 0 };
    row[event] += Number(r.n) || 0;
    if (event === "sent") row.sentUsers += Number(r.users) || 0;
    out.set(fam, row);
  }
  return out;
}

/** Sort mail families: MAIL_FAMILY_ORDER first (in that order), then the rest A→Z. */
export function orderFamilies(keys: Iterable<string>): string[] {
  const set = new Set(keys);
  const first = MAIL_FAMILY_ORDER.filter((k) => set.has(k));
  const rest = [...set].filter((k) => !MAIL_FAMILY_ORDER.includes(k)).sort();
  return [...first, ...rest];
}

/**
 * Pivot (key, day, n) rows into one row per key with a cell per day (in
 * the order of `days`; missing cells are 0), sorted by total desc.
 */
export function pivotByDay(
  rows: { key: string; day: string; n: number }[],
  days: string[],
): { key: string; total: number; cells: number[] }[] {
  const idx = new Map(days.map((d, i) => [d, i] as const));
  const acc = new Map<string, number[]>();
  for (const r of rows) {
    const i = idx.get(r.day);
    if (i === undefined) continue;
    const cells = acc.get(r.key) ?? new Array<number>(days.length).fill(0);
    cells[i] += Number(r.n) || 0;
    acc.set(r.key, cells);
  }
  return [...acc.entries()]
    .map(([key, cells]) => ({ key, total: cells.reduce((s, v) => s + v, 0), cells }))
    .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key));
}

const IST_OFFSET_MS = 330 * 60_000;

/** The last `days` IST calendar days as 'YYYY-MM-DD', oldest first, ending today (IST). */
export function istDayList(days: number, now: Date = new Date()): string[] {
  const n = Math.max(1, Math.floor(days));
  const todayIst = new Date(now.getTime() + IST_OFFSET_MS);
  const base = Date.UTC(todayIst.getUTCFullYear(), todayIst.getUTCMonth(), todayIst.getUTCDate());
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(new Date(base - i * 86_400_000).toISOString().slice(0, 10));
  return out;
}

/** 0 → "–", else one-decimal percentage of a/b. */
export function pct(a: number, b: number): string {
  if (!b) return "–";
  return `${((100 * a) / b).toFixed(1)}%`;
}

// ── Readers (sequential raw SQL; each returns null on failure) ─────────

async function db() {
  const { prisma } = await import("@/lib/db/prisma");
  return prisma;
}

function fail(what: string) {
  return (err: unknown) => {
    console.error(`[loops] ${what} failed:`, err);
    return null;
  };
}

export interface TouchRow {
  tag: string;
  n: number;
  users: number;
}

/** Every EmailTouch tag in the window with row + distinct-user counts. */
export async function mailTouches(days: number): Promise<TouchRow[] | null> {
  const p = await db();
  return p.$queryRaw<TouchRow[]>`
    SELECT tag, COUNT(*)::int AS n, COUNT(DISTINCT "userId")::int AS users
    FROM "EmailTouch"
    WHERE "sentAt" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY tag`.catch(fail("mailTouches"));
}

export interface ReturnRow {
  tag: string;
  sends: number;
  returned: number;
}

/**
 * Of the logged 'sent:' rows old enough to have had their 36 h, how many
 * were followed by ANY non-bot event from that user within 36 h. The
 * EXISTS probes the (userId, createdAt) index per send row.
 */
export async function mailReturns(days: number): Promise<ReturnRow[] | null> {
  const p = await db();
  return p.$queryRaw<ReturnRow[]>`
    SELECT t.tag,
      COUNT(*)::int AS sends,
      COUNT(*) FILTER (WHERE EXISTS (
        SELECT 1 FROM "AnalyticsEvent" e
        WHERE e."userId" = t."userId"
          AND e.client IS DISTINCT FROM 'bot'
          AND e."createdAt" > t."sentAt"
          AND e."createdAt" < t."sentAt" + INTERVAL '36 hours'))::int AS returned
    FROM "EmailTouch" t
    WHERE t.tag LIKE 'sent:%'
      AND t."sentAt" >= NOW() - (${days} * INTERVAL '1 day')
      AND t."sentAt" < NOW() - INTERVAL '36 hours'
    GROUP BY t.tag`.catch(fail("mailReturns"));
}

export interface ShareTapRow {
  surface: string;
  via: string;
  taps: number;
  sharers: number;
}

/** Share-button taps (CTA_CLICKED {cta:'share'}) by surface × channel. */
export async function shareTaps(days: number): Promise<ShareTapRow[] | null> {
  const p = await db();
  return p.$queryRaw<ShareTapRow[]>`
    SELECT COALESCE(props->>'surface', '?') AS surface,
      COALESCE(props->>'via', '?') AS via,
      COUNT(*)::int AS taps,
      COUNT(DISTINCT COALESCE("userId", "anonId"))::int AS sharers
    FROM "AnalyticsEvent"
    WHERE kind = 'CTA_CLICKED'::"EventKind"
      AND props->>'cta' = 'share'
      AND client IS DISTINCT FROM 'bot'
      AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY 1, 2
    ORDER BY taps DESC`.catch(fail("shareTaps"));
}

export interface ShareArrivalRow {
  src: string;
  /** Distinct identified visitors (userId or anonId) on utm_medium=share pages. */
  identified: number;
  /** Cookie-less, referrer-less first pages — WhatsApp landers the identity rule leaves unidentified. */
  firstHits: number;
}

/**
 * Arrivals on share links (PAGE_VIEW with utm_medium=share) by utm_source.
 * WhatsApp strips the referrer, so a lander's first page has no cookie and
 * no referrer and /api/analytics leaves it unidentified (anonId NULL);
 * identity begins on the second hit. Both numbers are shown, never summed.
 */
export async function shareArrivals(days: number): Promise<ShareArrivalRow[] | null> {
  const p = await db();
  return p.$queryRaw<ShareArrivalRow[]>`
    SELECT COALESCE("utmSource", '?') AS src,
      COUNT(DISTINCT COALESCE("userId", "anonId"))::int AS identified,
      COUNT(*) FILTER (WHERE "userId" IS NULL AND "anonId" IS NULL)::int AS "firstHits"
    FROM "AnalyticsEvent"
    WHERE kind = 'PAGE_VIEW'::"EventKind"
      AND "utmMedium" = 'share'
      AND client IS DISTINCT FROM 'bot'
      AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY 1
    ORDER BY identified DESC`.catch(fail("shareArrivals"));
}

export interface SourceCountRow {
  src: string;
  n: number;
}

/** SIGNUP rows that arrived on a share link, by utm_source. */
export async function shareSignups(days: number): Promise<SourceCountRow[] | null> {
  const p = await db();
  return p.$queryRaw<SourceCountRow[]>`
    SELECT COALESCE("utmSource", '?') AS src, COUNT(*)::int AS n
    FROM "AnalyticsEvent"
    WHERE kind = 'SIGNUP'::"EventKind"
      AND "utmMedium" = 'share'
      AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY 1
    ORDER BY n DESC`.catch(fail("shareSignups"));
}

/** All SIGNUP rows in the window. */
export async function totalSignups(days: number): Promise<number | null> {
  const p = await db();
  const rows = await p.$queryRaw<{ n: number }[]>`
    SELECT COUNT(*)::int AS n FROM "AnalyticsEvent"
    WHERE kind = 'SIGNUP'::"EventKind"
      AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')`.catch(fail("totalSignups"));
  return rows ? Number(rows[0]?.n ?? 0) : null;
}

/** Distinct signed-in users with any non-bot event in the window (the K denominator). Heaviest read — call last. */
export async function activeUsers(days: number): Promise<number | null> {
  const p = await db();
  const rows = await p.$queryRaw<{ n: number }[]>`
    SELECT COUNT(DISTINCT "userId")::int AS n FROM "AnalyticsEvent"
    WHERE "userId" IS NOT NULL
      AND client IS DISTINCT FROM 'bot'
      AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')`.catch(fail("activeUsers"));
  return rows ? Number(rows[0]?.n ?? 0) : null;
}

export interface FoundViaRow {
  /** What the student tapped ('chatgpt' … 'other', or 'dismissed'). */
  said: string;
  /** utm_source, else refHost, else User.signupReferrerHost, else '(direct)'. */
  derived: string;
  n: number;
}

/**
 * "How did you find Shishya?" answers (CTA_CLICKED {cta:'found-via'}) next
 * to what the SIGNUP row / referrer said for the same user. 'dismissed' is
 * its own bucket (answer rate = answered ÷ (answered + dismissed)), never
 * a source.
 */
export async function foundVia(days = 90): Promise<FoundViaRow[] | null> {
  const p = await db();
  return p.$queryRaw<FoundViaRow[]>`
    SELECT COALESCE(f.props->>'value', '?') AS said,
      COALESCE(s."utmSource", s."refHost", u."signupReferrerHost", '(direct)') AS derived,
      COUNT(*)::int AS n
    FROM "AnalyticsEvent" f
    LEFT JOIN LATERAL (
      SELECT s."utmSource", s."refHost" FROM "AnalyticsEvent" s
      WHERE s."userId" = f."userId" AND s.kind = 'SIGNUP'::"EventKind"
      ORDER BY s."createdAt" LIMIT 1) s ON TRUE
    LEFT JOIN "User" u ON u.id = f."userId"
    WHERE f.kind = 'CTA_CLICKED'::"EventKind"
      AND f.props->>'cta' = 'found-via'
      AND f."userId" IS NOT NULL
      AND f."createdAt" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY 1, 2`.catch(fail("foundVia"));
}

export interface BotDayRow {
  bot: string;
  day: string;
  n: number;
}

/** BotVisit rows by crawler family × IST day (grouped in the DB; uses the (at) index). */
export async function botVisits(days: number): Promise<BotDayRow[] | null> {
  const p = await db();
  return p.$queryRaw<BotDayRow[]>`
    SELECT bot, to_char(("at" + INTERVAL '330 minutes')::date, 'YYYY-MM-DD') AS day, COUNT(*)::int AS n
    FROM "BotVisit"
    WHERE "at" >= NOW() - (${days} * INTERVAL '1 day')
    GROUP BY 1, 2`.catch(fail("botVisits"));
}

export interface ChallengeFunnel {
  /** Challenge links made in the window, and by where they were made. */
  made: number;
  fromQuiz: number;
  fromMock: number;
  /** Made from a friend's challenge result (the chain). */
  chained: number;
  /** Distinct makers: signed-in user, else analytics id, else browser key. */
  makers: number;
  /** PAGE_VIEW rows on /c/ pages, and distinct identified visitors. */
  landingViews: number;
  landingVisitors: number;
  /** Scores friends chose to send (a kept-private play leaves no row). */
  plays: number;
  players: number;
  /** SIGNUP rows whose landing carried utm_campaign=challenge. */
  signups: number;
}

/** Challenge a friend (14 Sep 2026): links made → challenge page views →
 *  scores sent → links made in turn → signups. Null when any read fails,
 *  including before scripts/create-challenge-tables.ts has run. */
export async function challengeFunnel(days: number): Promise<ChallengeFunnel | null> {
  const p = await db();
  try {
    const [c] = await p.$queryRaw<{ made: number; fromQuiz: number; fromMock: number; chained: number; makers: number }[]>`
      SELECT COUNT(*)::int AS made,
        COUNT(*) FILTER (WHERE source IN ('quiz', 'topic'))::int AS "fromQuiz",
        COUNT(*) FILTER (WHERE source = 'mock')::int AS "fromMock",
        COUNT(*) FILTER (WHERE source = 'challenge')::int AS chained,
        COUNT(DISTINCT COALESCE("creatorUserId", "creatorAnonId", "creatorKeyHash"))::int AS makers
      FROM "Challenge"
      WHERE "createdAt" >= NOW() - (${days} * INTERVAL '1 day')`;
    const [v] = await p.$queryRaw<{ views: number; visitors: number }[]>`
      SELECT COUNT(*)::int AS views, COUNT(DISTINCT COALESCE("userId", "anonId"))::int AS visitors
      FROM "AnalyticsEvent"
      WHERE kind = 'PAGE_VIEW'::"EventKind"
        AND path LIKE '/c/%'
        AND client IS DISTINCT FROM 'bot'
        AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')`;
    const [pl] = await p.$queryRaw<{ plays: number; players: number }[]>`
      SELECT COUNT(*)::int AS plays,
        COUNT(DISTINCT COALESCE("playerUserId", "playerAnonId", "playerKeyHash"))::int AS players
      FROM "ChallengePlay"
      WHERE "createdAt" >= NOW() - (${days} * INTERVAL '1 day')`;
    const [s] = await p.$queryRaw<{ n: number }[]>`
      SELECT COUNT(*)::int AS n FROM "AnalyticsEvent"
      WHERE kind = 'SIGNUP'::"EventKind"
        AND "utmCampaign" = 'challenge'
        AND "createdAt" >= NOW() - (${days} * INTERVAL '1 day')`;
    return {
      made: Number(c?.made ?? 0),
      fromQuiz: Number(c?.fromQuiz ?? 0),
      fromMock: Number(c?.fromMock ?? 0),
      chained: Number(c?.chained ?? 0),
      makers: Number(c?.makers ?? 0),
      landingViews: Number(v?.views ?? 0),
      landingVisitors: Number(v?.visitors ?? 0),
      plays: Number(pl?.plays ?? 0),
      players: Number(pl?.players ?? 0),
      signups: Number(s?.n ?? 0),
    };
  } catch (err) {
    console.error("[loops] challengeFunnel failed:", err);
    return null;
  }
}
