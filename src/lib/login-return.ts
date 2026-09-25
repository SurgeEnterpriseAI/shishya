// Login return keeps the email tag (25 Sep 2026 email-reach read).
//
// A signed-out click from an email to /dashboard or /mocks/{id} is bounced
// by the page to /login?callbackUrl=<page>, and /today with no set to pick
// falls back to /dashboard. Those server redirects dropped the utm_* tags
// the mail carried (src/lib/email.ts withMailUtm), so the page the student
// finally landed on after sign-in had none and the return never counted as
// email: 5 of the 7 win-back utm arrivals since 14 Sep were signed out, and
// win-back returns within 24 h were 15 against 2 that joined to a utm.
//
// These helpers carry ONLY utm_source / utm_medium / utm_campaign (the three
// the tracker records, see AnalyticsTracker + /api/analytics), each checked
// against the charset email.ts's utmSlug() emits: [A-Za-z0-9_.-], at most
// 64. A tag outside it is dropped, never rewritten. Nothing else on the
// inbound URL (tokens, emails, ids) is ever copied.
//
// The return path is always a same-origin relative path. Anything absolute
// ("https://…", "javascript:…"), protocol-relative ("//host") or
// backslashed ("/\host", which browsers read as "//host") falls back to
// /dashboard, /login's own default.
//
// The tags ride INSIDE callbackUrl, the way /today already did, not on the
// /login URL itself: the middleware reads utm on /login as a sign-up
// source, and an email click is never how a student signed up. The post-
// login page view carries them, so the tracker's session attribution
// (sessionStorage) credits the return to email.

export const RETURN_UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"] as const;

/** Where /login sends a student when no usable callback is given. */
export const DEFAULT_RETURN_PATH = "/dashboard";

const UTM_VALUE_RE = /^[A-Za-z0-9_.-]{1,64}$/;

// One leading "/", then not a second "/" or "\" (the host forms); no
// whitespace, no backslash, no control characters anywhere.
const SAME_ORIGIN_PATH_RE = /^\/(?![/\\])[^\s\\\x00-\x1f\x7f]*$/;

/** Next.js page searchParams, or a URLSearchParams (tests, route handlers). */
export type SearchParamsInput =
  | Record<string, string | string[] | undefined>
  | URLSearchParams
  | null
  | undefined;

function firstValue(sp: NonNullable<SearchParamsInput>, key: string): string | undefined {
  if (sp instanceof URLSearchParams) return sp.get(key) ?? undefined;
  const raw = sp[key];
  return Array.isArray(raw) ? raw[0] : raw;
}

/** The valid tags only, in RETURN_UTM_KEYS order. */
export function returnUtmTags(sp: SearchParamsInput): Array<[string, string]> {
  if (!sp) return [];
  const out: Array<[string, string]> = [];
  for (const k of RETURN_UTM_KEYS) {
    const v = firstValue(sp, k)?.trim();
    if (v && UTM_VALUE_RE.test(v)) out.push([k, v]);
  }
  return out;
}

/** "?utm_source=…&utm_medium=…&utm_campaign=…" with the valid tags, or "". */
export function returnUtmQuery(sp: SearchParamsInput): string {
  const s = new URLSearchParams(returnUtmTags(sp)).toString();
  return s ? `?${s}` : "";
}

/** True for a same-origin relative path ("/x"), false for "//x", "/\x", "http:…", "x". */
export function isSameOriginPath(path: string): boolean {
  return SAME_ORIGIN_PATH_RE.test(path);
}

/**
 * `path` with the valid tags added (replacing any utm_* of the same name it
 * already had; its other params and #hash stay). An unsafe path becomes
 * /dashboard. With no valid tag the path comes back unchanged.
 */
export function withReturnUtm(path: string, sp: SearchParamsInput): string {
  const safe = isSameOriginPath(path) ? path : DEFAULT_RETURN_PATH;
  const tags = returnUtmTags(sp);
  if (tags.length === 0) return safe;
  const hashAt = safe.indexOf("#");
  const head = hashAt === -1 ? safe : safe.slice(0, hashAt);
  const hash = hashAt === -1 ? "" : safe.slice(hashAt);
  const qAt = head.indexOf("?");
  const pathname = qAt === -1 ? head : head.slice(0, qAt);
  const query = new URLSearchParams(qAt === -1 ? "" : head.slice(qAt + 1));
  for (const [k, v] of tags) query.set(k, v);
  return `${pathname}?${query.toString()}${hash}`;
}

/** "/login?callbackUrl=<path + tags>", the callback percent-encoded once. */
export function loginRedirectPath(path: string, sp: SearchParamsInput): string {
  return `/login?callbackUrl=${encodeURIComponent(withReturnUtm(path, sp))}`;
}
