// Signed-in hint (13 Sep 2026, phone-first speed audit).
//
// The problem: the NextAuth session cookie is httpOnly, so client islands
// could not tell a guest from a student without asking /api/auth/session —
// and the header rail, Today link, FeedbackWidget, SignupNudge and the
// exam-page panels each asked, 3-4 identical calls per guest page view.
//
// The fix: a non-httpOnly, PII-free cookie `shishya_in=1`. It is set by the
// NextAuth signIn event and cleared by the signOut event (src/lib/auth.ts),
// and refreshed / cleared client-side by every real probe below. It carries
// no id, no email, nothing but "a session probably exists": it only decides
// WHETHER to ask the session endpoint, never what the answer is. A stale
// hint costs one probe, which then clears it.
//
// Guests (no hint) fire ZERO session calls, with two narrow exceptions:
//   • on a page the server only renders for signed-in students (it
//     redirects guests to /login), a hint-less visit probes — that is how a
//     student whose hint was lost (cookie reset, sign-in before this
//     shipped) gets it back: /login itself redirects a signed-in visitor to
//     /dashboard, which is on the list;
//   • until LEGACY_PROBE_UNTIL_MS, a browser that has never probed probes
//     ONCE (localStorage flag), so students signed in before the deploy are
//     not treated as guests — no signup nudge for them. After that date the
//     branch is dead: every legacy JWT (30-day maxAge) has expired.
//
// Pure helpers first (unit-tested in tests/unit/session-hint.test.ts), DOM
// wrappers after. No DOM access at import, so server code (auth.ts) can
// import the constants.

export const SESSION_HINT_COOKIE = "shishya_in";
export const SESSION_HINT_VALUE = "1";
/** Matches NextAuth's default JWT session maxAge (30 days). A real probe
 *  re-issues the hint, so it rolls forward with an active session. */
export const SESSION_HINT_MAX_AGE_S = 30 * 24 * 3600;
/** One-time legacy probe window: deploy (mid Sep 2026) + the 30-day JWT
 *  maxAge, plus a few days' margin. */
export const LEGACY_PROBE_UNTIL_MS = Date.UTC(2026, 9, 20); // 20 Oct 2026
export const LEGACY_PROBE_KEY = "shishya_in_probed";

const HINT_RE = /(?:^|;\s*)shishya_in=1(?:;|$)/;

/** True when a `document.cookie`-style string carries the hint. */
export function cookieHasSessionHint(cookie: string | null | undefined): boolean {
  return typeof cookie === "string" && HINT_RE.test(cookie);
}

/**
 * Paths whose server component redirects a guest to /login before render
 * (dashboard/page.tsx, today/page.tsx, mocks/[id]/page.tsx,
 * onboarding/page.tsx, me/**, mentor/**, attempts/[id]/results). A client
 * island running on one of these is, by construction, looking at a signed-in
 * student — so probing there costs a guest nothing. Keep this list to routes
 * that really redirect; a public route here would make its guests probe.
 */
export function isSignedInOnlyPath(path: string): boolean {
  const p = (path || "/").split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (p === "/dashboard" || p === "/today" || p === "/onboarding") return true;
  if (p === "/me" || p.startsWith("/me/")) return true;
  if (p === "/mentor" || p.startsWith("/mentor/")) return true;
  if (/^\/mocks\/[^/]+$/.test(p)) return true;
  if (/^\/attempts\/[^/]+\/results$/.test(p)) return true;
  return false;
}

// Record-id shapes: cuid, uuid, long hex, long number, or a long token that
// contains a digit. Backstop for when route params are unavailable.
const ID_SHAPED =
  /^(?:c[a-z0-9]{20,}|[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{16,}|\d{6,}|(?=[\w-]*\d)[\w-]{20,})$/i;

/**
 * Route template for a beacon that must not carry per-student ids — the
 * web-vitals row (src/components/WebVitals.tsx). Every path segment that is
 * a dynamic route param value becomes `[name]` (`/attempts/ck9/results` →
 * `/attempts/[id]/results`, `/u/venu` → `/u/[handle]`, `/join/AB12` →
 * `/join/[inviteCode]`); as a backstop, any id-shaped segment becomes
 * `[id]` even without params (404s, rewrites). Query and hash are dropped.
 * `params` is Next's useParams() — the full param set of the current route.
 */
export function routeTemplatePath(
  path: string | null | undefined,
  params?: Record<string, string | string[] | undefined> | null,
): string {
  const clean = (path || "/").split(/[?#]/)[0] || "/";
  const byValue = new Map<string, string>();
  for (const [name, v] of Object.entries(params ?? {})) {
    for (const one of Array.isArray(v) ? v : v == null ? [] : [v]) {
      if (one) byValue.set(one, name);
    }
  }
  const out = clean.split("/").map((seg) => {
    if (seg === "") return seg;
    let decoded = seg;
    try {
      decoded = decodeURIComponent(seg);
    } catch {
      /* malformed escape — judge the raw segment */
    }
    const name = byValue.get(decoded) ?? byValue.get(seg);
    if (name) return `[${name}]`;
    if (ID_SHAPED.test(decoded)) return "[id]";
    return seg;
  });
  return out.join("/").slice(0, 256) || "/";
}

export interface ProbeInput {
  /** shishya_in=1 present */
  hint: boolean;
  /** location.pathname */
  path: string;
  /** Date.now() */
  nowMs: number;
  /** LEGACY_PROBE_KEY already set in localStorage (or storage unavailable) */
  legacyProbed: boolean;
}

/** "probe" = ask /api/auth/session; "guest" = answer false with no request. */
export function decideSessionProbe(i: ProbeInput): "probe" | "guest" {
  if (i.hint) return "probe";
  if (isSignedInOnlyPath(i.path)) return "probe";
  if (i.nowMs < LEGACY_PROBE_UNTIL_MS && !i.legacyProbed) return "probe";
  return "guest";
}

/** The `document.cookie` assignment string that sets (on=true) or clears
 *  the hint. Same name + path as the server-set cookie, so either side can
 *  overwrite the other. */
export function sessionHintCookieString(on: boolean, secure: boolean): string {
  const base = on
    ? `${SESSION_HINT_COOKIE}=${SESSION_HINT_VALUE}; path=/; max-age=${SESSION_HINT_MAX_AGE_S}; samesite=lax`
    : `${SESSION_HINT_COOKIE}=; path=/; max-age=0; samesite=lax`;
  return secure ? `${base}; secure` : base;
}

// ── DOM wrappers (client islands only; every access guarded) ─────────

export function hasSessionHint(): boolean {
  try {
    return typeof document !== "undefined" && cookieHasSessionHint(document.cookie);
  } catch {
    return false;
  }
}

function writeHint(on: boolean): void {
  try {
    if (typeof document === "undefined") return;
    if (cookieHasSessionHint(document.cookie) === on) return; // nothing to change
    document.cookie = sessionHintCookieString(on, location.protocol === "https:");
  } catch {
    /* no DOM / cookies blocked */
  }
}

function refreshHint(): void {
  try {
    if (typeof document === "undefined") return;
    // Re-issue unconditionally so max-age rolls forward with the session.
    document.cookie = sessionHintCookieString(true, location.protocol === "https:");
  } catch {
    /* no DOM / cookies blocked */
  }
}

export function clearSessionHint(): void {
  writeHint(false);
}

function legacyProbed(): boolean {
  try {
    return localStorage.getItem(LEGACY_PROBE_KEY) != null;
  } catch {
    return true; // no storage → cannot remember a one-time probe → never probe
  }
}

function markLegacyProbed(): void {
  try {
    localStorage.setItem(LEGACY_PROBE_KEY, "1");
  } catch {
    /* ok */
  }
}

// One in-flight /api/auth/session request per page, shared by every island
// mounted on it. Short TTL (not a forever cache) so a client-side navigation
// a little later still re-checks; sign-in / sign-out are full navigations
// and reset module state anyway. Failed probes are not cached.
const SESSION_TTL_MS = 10_000;
let sessionCache: { at: number; p: Promise<boolean | null> } | null = null;

function probe(): Promise<boolean | null> {
  const now = Date.now();
  if (sessionCache && now - sessionCache.at < SESSION_TTL_MS) return sessionCache.p;
  const p = fetch("/api/auth/session", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`session ${r.status}`))))
    .then((data: { user?: { id?: string } } | null) => {
      const signedIn = Boolean(data?.user?.id);
      if (signedIn) refreshHint();
      else clearSessionHint();
      markLegacyProbed();
      return signedIn;
    })
    .catch(() => {
      sessionCache = null;
      return null;
    });
  sessionCache = { at: now, p };
  return p;
}

/**
 * true = signed in · false = guest · null = the probe itself failed
 * (network / 5xx; only possible when a probe was actually sent).
 *
 * Guests without a hint resolve `false` immediately with NO request.
 * `force: true` always asks the server (still shared with any in-flight
 * probe) — for the rare moments where a wrong "guest" answer would do
 * harm, e.g. right before a signup nudge is shown.
 */
export function fetchSignedIn(opts?: { force?: boolean }): Promise<boolean | null> {
  if (!opts?.force) {
    let path = "/";
    try {
      path = location.pathname;
    } catch {
      /* no DOM */
    }
    const decision = decideSessionProbe({
      hint: hasSessionHint(),
      path,
      nowMs: Date.now(),
      legacyProbed: legacyProbed(),
    });
    if (decision === "guest") return Promise.resolve(false);
  }
  return probe();
}
