// Feature requests (/ideas) — the pure half of "close the loop" (13 Sep 2026).
//
// Audit 11 Sep 2026: 15 of 16 public ideas read "Open" with 0 upvotes
// although at least 5 were built, and nobody who asked was ever told.
// This file holds every rule that decides WHAT happens when the admin
// marks a request built; src/lib/feature-requests-ship.ts does the I/O.
// No prisma import here — safe on the client, the server and in tests.
//
// Rules (founder, absolute):
//   * The system never decides something is built. The admin marks it,
//     after checking depth, with a one-line "what we built" note and a
//     deep link. SHIPPED without both (or without the depth check) is
//     rejected.
//   * Only people who asked (the author) or upvoted BEFORE the ship
//     moment are told — never anyone else, never twice.
//   * Labels say exactly the stored state; no counts or urgency on the
//     student's dashboard card.
//
// Storage without a migration: FeatureRequest has no shippedAt / shipUrl
// columns, so the ship record lives as a small versioned block at the top
// of `adminNote`. Anything after the block is the admin's private triage
// note and is never rendered publicly. A note without a well-formed block
// is treated as entirely private (legacy rows).

export const FEATURE_REQUEST_STATUSES = ["OPEN", "UNDER_REVIEW", "PLANNED", "SHIPPED", "DECLINED"] as const;
export type FeatureRequestStatusValue = (typeof FEATURE_REQUEST_STATUSES)[number];

export function isFeatureRequestStatus(v: unknown): v is FeatureRequestStatusValue {
  return typeof v === "string" && (FEATURE_REQUEST_STATUSES as readonly string[]).includes(v);
}

/** Public labels — exactly the stored state, nothing promised. */
export const PUBLIC_STATUS_LABEL: Record<FeatureRequestStatusValue, string> = {
  OPEN: "Open",
  UNDER_REVIEW: "Under review",
  PLANNED: "Planned",
  SHIPPED: "Built",
  DECLINED: "Declined",
};

export const STATUS_TONE: Record<FeatureRequestStatusValue, string> = {
  OPEN: "bg-ink-100 text-ink-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  PLANNED: "bg-saffron-100 text-saffron-800",
  SHIPPED: "bg-emerald-100 text-emerald-800",
  DECLINED: "bg-ink-100 text-ink-500",
};

/** Statuses shown in the "still open" half of the public board. */
export const OPEN_BOARD_STATUSES: readonly FeatureRequestStatusValue[] = ["OPEN", "UNDER_REVIEW", "PLANNED"];

export const SHIP_NOTE_MIN = 8;
export const SHIP_NOTE_MAX = 160;
export const SHIP_LINK_MAX = 300;
export const PRIVATE_NOTE_MAX = 2000;
/** Dashboard card window: ships older than this stop showing. */
export const BUILT_FOR_YOU_DAYS = 30;
export const BUILT_FOR_YOU_LIMIT = 3;

const DAY_MS = 86_400_000;

// ── Ship record codec ────────────────────────────────────────────────────

export interface ShipRecord {
  /**
   * ISO timestamp of the moment the admin first marked it built — NOT the
   * day it was built (a feature can be marked weeks after it went live, or
   * point an asker to something that already existed). Every surface shows
   * it as "Marked built <date>" via markedBuiltLabel(), never "Built <date>".
   */
  shippedAt: string;
  /** One line: what we built. */
  note: string;
  /** Site-relative deep link, e.g. /exams/SSC_CGL/build-mock. */
  link: string;
}

export interface ParsedAdminNote {
  ship: ShipRecord | null;
  /** Admin-only triage text. Never rendered on a public surface. */
  privateNote: string;
}

const SHIP_OPEN = "[[ship v1]]";
const SHIP_CLOSE = "[[/ship]]";
const SHIP_BLOCK_RE =
  /^\[\[ship v1\]\]\r?\nat: ([^\r\n]+)\r?\nnote: ([^\r\n]+)\r?\nlink: ([^\r\n]+)\r?\n\[\[\/ship\]\](?:\r?\n)?([\s\S]*)$/;

export function encodeAdminNote(ship: ShipRecord | null, privateNote: string | null | undefined): string | null {
  const priv = (privateNote ?? "").trim();
  if (!ship) return priv || null;
  const block = [SHIP_OPEN, `at: ${ship.shippedAt}`, `note: ${ship.note}`, `link: ${ship.link}`, SHIP_CLOSE].join("\n");
  return priv ? `${block}\n${priv}` : block;
}

export function parseAdminNote(raw: string | null | undefined): ParsedAdminNote {
  if (!raw) return { ship: null, privateNote: "" };
  const m = SHIP_BLOCK_RE.exec(raw);
  if (!m) return { ship: null, privateNote: raw.trim() };
  const at = m[1].trim();
  const note = normaliseShipNote(m[2]);
  const link = normaliseShipLink(m[3]);
  if (!Number.isFinite(Date.parse(at)) || !note || !link) {
    // A damaged block is not a ship record — keep the text admin-only.
    return { ship: null, privateNote: raw.trim() };
  }
  return { ship: { shippedAt: new Date(at).toISOString(), note, link }, privateNote: m[4].trim() };
}

// ── Input normalisation ──────────────────────────────────────────────────

/** One line, 8–160 characters after collapsing whitespace; null otherwise. */
export function normaliseShipNote(input: string | null | undefined): string | null {
  const s = (input ?? "").replace(/\s+/g, " ").trim();
  if (s.length < SHIP_NOTE_MIN || s.length > SHIP_NOTE_MAX) return null;
  return s;
}

/**
 * A deep link on shishya.in only, returned site-relative. Accepts "/path"
 * or "https://shishya.in/path" (www. allowed). Rejects other hosts,
 * protocol-relative "//x" (in EITHER form — "https://shishya.in//x" would
 * otherwise yield the path "//x", a link to host "x"), javascript:,
 * whitespace and quote characters. Idempotent: every value it returns
 * normalises to itself, so a stored record always parses back.
 */
export function normaliseShipLink(input: string | null | undefined): string | null {
  const s = (input ?? "").trim();
  if (!s || s.length > SHIP_LINK_MAX || /\s/.test(s)) return null;
  let path: string;
  const abs = /^https?:\/\/(?:www\.)?shishya\.in(\/\S*)?$/i.exec(s);
  if (abs) path = abs[1] || "/";
  else if (s.startsWith("/")) path = s;
  else return null;
  if (!path.startsWith("/") || path.startsWith("//")) return null;
  if (/[\\<>"'`]/.test(path)) return null;
  return path;
}

// ── Status transition ────────────────────────────────────────────────────

export interface StatusChangeInput {
  /** Target status; omitted = edit the private note only. */
  status?: string;
  shipNote?: string;
  shipLink?: string;
  /** The admin confirms they opened the link and used the feature. */
  depthChecked?: boolean;
  /** Replaces the private note; undefined keeps it. */
  privateNote?: string | null;
}

export interface CurrentRequestState {
  status: FeatureRequestStatusValue;
  adminNote: string | null;
}

export type StatusChangePlan =
  | { ok: false; error: string }
  | {
      ok: true;
      status: FeatureRequestStatusValue;
      adminNote: string | null;
      ship: ShipRecord | null;
      /** Run the (idempotent) delivery to askers + prior upvoters. */
      notify: boolean;
      /** First time this request becomes SHIPPED. */
      enteredShipped: boolean;
    };

export function planStatusChange(
  current: CurrentRequestState,
  input: StatusChangeInput,
  now: Date,
): StatusChangePlan {
  if (input.status !== undefined && !isFeatureRequestStatus(input.status)) {
    return { ok: false, error: "Unknown status." };
  }
  if (input.status === undefined && input.privateNote === undefined) {
    return { ok: false, error: "Nothing to update." };
  }
  const parsed = parseAdminNote(current.adminNote);
  const privateNote = input.privateNote === undefined ? parsed.privateNote : (input.privateNote ?? "").trim();
  if (privateNote.length > PRIVATE_NOTE_MAX) {
    return { ok: false, error: `Private note is longer than ${PRIVATE_NOTE_MAX} characters.` };
  }

  const next: FeatureRequestStatusValue = (input.status as FeatureRequestStatusValue | undefined) ?? current.status;

  if (next !== "SHIPPED") {
    // Leaving (or never in) SHIPPED drops the public ship record; the
    // private note survives. Notices already sent cannot be unsent.
    return { ok: true, status: next, adminNote: encodeAdminNote(null, privateNote), ship: null, notify: false, enteredShipped: false };
  }

  if (input.status === undefined) {
    // Private-note edit on a request that is already built: the ship
    // record is left exactly as it was and nobody is notified.
    return { ok: true, status: "SHIPPED", adminNote: encodeAdminNote(parsed.ship, privateNote), ship: parsed.ship, notify: false, enteredShipped: false };
  }

  const note = normaliseShipNote(input.shipNote);
  if (!note) {
    return { ok: false, error: `Write one line (${SHIP_NOTE_MIN}–${SHIP_NOTE_MAX} characters) saying what we built.` };
  }
  const link = normaliseShipLink(input.shipLink);
  if (!link) {
    return { ok: false, error: "The link must be a shishya.in page, e.g. /exams/SSC_CGL/build-mock." };
  }
  if (input.depthChecked !== true) {
    return { ok: false, error: "Confirm you opened the link and checked the feature end to end before marking it built." };
  }
  // Re-marking keeps the ORIGINAL ship moment, so the upvoters-before-ship
  // cut and the dashboard's 30-day window never move on an edit.
  const shippedAt = current.status === "SHIPPED" && parsed.ship ? parsed.ship.shippedAt : now.toISOString();
  const ship: ShipRecord = { shippedAt, note, link };
  return {
    ok: true,
    status: "SHIPPED",
    adminNote: encodeAdminNote(ship, privateNote),
    ship,
    notify: true,
    enteredShipped: current.status !== "SHIPPED",
  };
}

// ── Who is told ──────────────────────────────────────────────────────────

export type ShipRole = "asked" | "upvoted";

export interface ShipRecipient {
  userId: string;
  role: ShipRole;
}

/**
 * The author (if signed in) plus everyone who upvoted at or before the
 * ship moment. One entry per user; an author who also upvoted is "asked".
 * Nobody else — the list is built only from these two sources.
 */
export function shipRecipients(input: {
  authorId: string | null;
  upvotes: ReadonlyArray<{ userId: string; createdAt: Date | string }>;
  shippedAt: string;
}): ShipRecipient[] {
  const cut = Date.parse(input.shippedAt);
  const out: ShipRecipient[] = [];
  const seen = new Set<string>();
  if (input.authorId) {
    out.push({ userId: input.authorId, role: "asked" });
    seen.add(input.authorId);
  }
  const sorted = [...input.upvotes].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  for (const u of sorted) {
    if (!u.userId || seen.has(u.userId)) continue;
    if (!(new Date(u.createdAt).getTime() <= cut)) continue;
    out.push({ userId: u.userId, role: "upvoted" });
    seen.add(u.userId);
  }
  return out;
}

/**
 * Notification dedup key — one per request. Notification is unique on
 * (userId, dedupKey), so this is "once per person per request". It equals
 * the key the pre-13-Sep route used for authors, so an author that route
 * already told is not told again.
 */
export function shipDedupKey(requestId: string): string {
  return `feature:${requestId}:SHIPPED`;
}

/** Resend tag (and EmailTouch `sent:<tag>` guard) for the ship mail. */
export function shipEmailTag(requestId: string): string {
  return `idea-shipped-${requestId.replace(/[^A-Za-z0-9_-]/g, "-")}`;
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
}

// ── Student-facing copy ──────────────────────────────────────────────────
//
// Sequence-neutral on purpose. The admin marks what is ON Shishya; that can
// be something built after the ask, built before the ask, or built long
// before it was marked. So no copy says "we built it because you asked",
// "it's built now" or gives a build date — only that it is there, and the
// day it was marked.

/** The only way a ship date is printed: the marking date, labelled as such. */
export function markedBuiltLabel(shippedAt: string | Date, opts: { capital?: boolean } = {}): string {
  return `${opts.capital === false ? "marked" : "Marked"} built ${formatShipDate(shippedAt)}`;
}

/** Shown on /ideas for a SHIPPED row with no ship record (legacy / old route). */
export const BUILT_WITHOUT_RECORD_LINE = "Marked built without a note — no description or link yet.";

export function shipNoticeTitle(role: ShipRole): string {
  return role === "asked" ? "You asked for this — here it is" : "An idea you upvoted is on Shishya";
}

export function builtForYouHeading(roles: readonly ShipRole[]): string {
  const asked = roles.filter((r) => r === "asked").length;
  const upvoted = roles.length - asked;
  if (roles.length === 1) return asked ? "You asked for this — it's on Shishya" : "An idea you upvoted is on Shishya";
  if (upvoted === 0) return "Ideas you asked for are on Shishya";
  if (asked === 0) return "Ideas you upvoted are on Shishya";
  return "Ideas you asked for or upvoted are on Shishya";
}

export function builtForYouShareMessage(role: ShipRole, title: string): string {
  return role === "asked"
    ? `I asked Shishya for this and it's there now: ${title}`
    : `Students asked Shishya for this and it's there now: ${title}`;
}

export interface ShipNotificationInput {
  userId: string;
  type: "SUGGESTION_ACCEPTED";
  title: string;
  body: string;
  link: string;
  dedupKey: string;
}

export function planShipNotifications(
  request: { id: string; title: string },
  ship: ShipRecord,
  recipients: readonly ShipRecipient[],
): ShipNotificationInput[] {
  const seen = new Set<string>();
  const out: ShipNotificationInput[] = [];
  for (const r of recipients) {
    if (seen.has(r.userId)) continue;
    seen.add(r.userId);
    out.push({
      userId: r.userId,
      type: "SUGGESTION_ACCEPTED",
      title: shipNoticeTitle(r.role),
      body: `${clip(request.title, 90)} — ${ship.note}`,
      link: ship.link,
      dedupKey: shipDedupKey(request.id),
    });
  }
  return out;
}

export interface EmailCandidate extends ShipRecipient {
  email: string | null;
}

export interface ShipEmailPlan {
  send: Array<EmailCandidate & { email: string }>;
  skippedAlreadySent: number;
  skippedNoAddress: number;
  skippedOverCap: number;
}

/**
 * Who gets the one plain mail: recipients with an address who have no
 * prior `sent:<shipEmailTag>` row. Opt-out is enforced later, inside
 * sendEmail. Capped per run; the remainder is picked up by a re-mark.
 */
export function planShipEmails(
  candidates: readonly EmailCandidate[],
  alreadyEmailed: ReadonlySet<string>,
  cap: number,
): ShipEmailPlan {
  const plan: ShipEmailPlan = { send: [], skippedAlreadySent: 0, skippedNoAddress: 0, skippedOverCap: 0 };
  const seen = new Set<string>();
  for (const c of candidates) {
    if (seen.has(c.userId)) continue;
    seen.add(c.userId);
    if (alreadyEmailed.has(c.userId)) {
      plan.skippedAlreadySent++;
      continue;
    }
    const email = (c.email ?? "").trim();
    if (!email || !email.includes("@")) {
      plan.skippedNoAddress++;
      continue;
    }
    if (plan.send.length >= cap) {
      plan.skippedOverCap++;
      continue;
    }
    plan.send.push({ ...c, email });
  }
  return plan;
}

// ── The plain mail ───────────────────────────────────────────────────────

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export const SHIP_SITE = "https://shishya.in";

export function formatShipDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });
}

export function renderShipEmail(p: {
  role: ShipRole;
  requestTitle: string;
  /** The author's own words (used only for role "asked"). */
  askedText: string;
  askedAt: Date | string;
  ship: ShipRecord;
}): { subject: string; text: string; html: string } {
  const title = clip(p.requestTitle, 70);
  const url = `${SHIP_SITE}${p.ship.link}`;
  const subject = `${shipNoticeTitle(p.role)}: ${title}`;
  const quoted = p.role === "asked" ? clip(p.askedText, 300) : clip(p.requestTitle, 160);
  const intro =
    p.role === "asked"
      ? `On ${formatShipDate(p.askedAt)} you suggested this on the Shishya ideas board:`
      : "You upvoted this idea on the Shishya ideas board:";
  const text = `${intro}
  "${quoted}"

It's on Shishya. What we built: ${p.ship.note}

Open it: ${url}

— Team Shishya`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#ffffff;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:24px;">
    <p style="font-size:14px;line-height:1.6;margin:0;">${escHtml(intro)}</p>
    <p style="font-size:14px;line-height:1.6;margin:8px 0 0;padding-left:12px;border-left:3px solid #cbd5e1;font-style:italic;">&ldquo;${escHtml(quoted)}&rdquo;</p>
    <p style="font-size:14px;line-height:1.6;margin:16px 0 0;">It&rsquo;s on Shishya. What we built: ${escHtml(p.ship.note)}</p>
    <p style="font-size:14px;line-height:1.6;margin:16px 0 0;">Open it: <a href="${escHtml(url)}">${escHtml(url)}</a></p>
    <p style="font-size:13px;color:#64748b;margin:20px 0 0;">— Team Shishya</p>
  </div>
</body></html>`;
  return { subject, text, html };
}

// ── Read surfaces ────────────────────────────────────────────────────────

export interface BuiltForYouRow {
  id: string;
  title: string;
  status: string;
  adminNote: string | null;
  authorId: string | null;
  /** When THIS student upvoted it, if they did. */
  myUpvoteAt: Date | string | null;
}

export interface BuiltForYouItem {
  id: string;
  title: string;
  note: string;
  link: string;
  shippedAt: string;
  role: ShipRole;
}

/**
 * Dashboard card: SHIPPED requests this student asked for, or upvoted
 * before they were built, marked built within the last 30 days. Newest
 * first, at most 3. Rows without a ship record (legacy) never show — we
 * cannot say when or where.
 */
export function selectBuiltForYou(
  rows: readonly BuiltForYouRow[],
  userId: string,
  now: Date,
  opts: { days?: number; limit?: number } = {},
): BuiltForYouItem[] {
  const days = opts.days ?? BUILT_FOR_YOU_DAYS;
  const limit = opts.limit ?? BUILT_FOR_YOU_LIMIT;
  const nowMs = now.getTime();
  const out: BuiltForYouItem[] = [];
  for (const r of rows) {
    if (r.status !== "SHIPPED") continue;
    const ship = parseAdminNote(r.adminNote).ship;
    if (!ship) continue;
    const shippedMs = Date.parse(ship.shippedAt);
    if (shippedMs > nowMs || nowMs - shippedMs > days * DAY_MS) continue;
    let role: ShipRole | null = null;
    if (r.authorId && r.authorId === userId) role = "asked";
    else if (r.myUpvoteAt && new Date(r.myUpvoteAt).getTime() <= shippedMs) role = "upvoted";
    if (!role) continue;
    out.push({ id: r.id, title: r.title, note: ship.note, link: ship.link, shippedAt: ship.shippedAt, role });
  }
  out.sort((a, b) => Date.parse(b.shippedAt) - Date.parse(a.shippedAt));
  return out.slice(0, limit);
}

export interface BoardRow {
  status: string;
  adminNote: string | null;
  upvoteCount: number;
  createdAt: Date;
}

/**
 * Public board order: built items first (newest ship first; legacy built
 * rows without a record after them), then open / under review / planned
 * by upvotes. DECLINED never appears. Private notes are not carried out.
 */
export function splitIdeasBoard<T extends BoardRow>(
  rows: readonly T[],
): { built: Array<{ row: T; ship: ShipRecord | null }>; open: T[] } {
  const built = rows
    .filter((r) => r.status === "SHIPPED")
    .map((row) => ({ row, ship: parseAdminNote(row.adminNote).ship }))
    .sort((a, b) => {
      if (a.ship && b.ship) return Date.parse(b.ship.shippedAt) - Date.parse(a.ship.shippedAt);
      if (a.ship) return -1;
      if (b.ship) return 1;
      return b.row.createdAt.getTime() - a.row.createdAt.getTime();
    });
  const open = rows
    .filter((r) => (OPEN_BOARD_STATUSES as readonly string[]).includes(r.status))
    .sort((a, b) => b.upvoteCount - a.upvoteCount || b.createdAt.getTime() - a.createdAt.getTime());
  return { built, open };
}
