// A /chat?seed=… prompt auto-sends once, not on every mount.
//
// 24 Sep 2026 (September data read): ChatInterface fired the seed on EVERY
// mount — a reload, a back-navigation into /chat or a reopened tab re-sent
// it. 204 identical re-sends within 30 minutes in September; one student sent
// the same results-page prompt 25 times from 2 clicks, and the tutor, reading
// its own history, told them they had taken "five/six mocks in a row".
//
// Now a given seed (same text, exam and topic) auto-sends at most once per
// tab in 30 minutes: the fire time is kept in sessionStorage, and a repeat
// mount inside the window puts the prompt in the input box unsent. The seed
// param is also stripped from the URL after it is used (stripSeedParam), so a
// reload does not carry it. A different seed — a new results page, a new
// topic — still auto-sends; so does the same text after the student started
// or finished another attempt (seedFingerprint's scope).
//
// Pure except for the Storage handed in; every storage call is wrapped
// (blocked site data, private windows and some WebViews throw).

/** How long a fired seed stays "already sent" in this tab. */
export const SEED_ONCE_TTL_MS = 30 * 60_000;
/** sessionStorage key holding { [fingerprint]: firedAtMs }. */
export const SEED_ONCE_KEY = "shishya_seed_fired";
/** Most fingerprints kept (oldest dropped first). */
export const SEED_ONCE_MAX = 30;

type SeedStore = Pick<Storage, "getItem" | "setItem">;

/** FNV-1a 32-bit — short, stable key; a collision only means one seed waits in the input box. */
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/**
 * Identity of one seeded chat: the prompt text (whitespace-normalised), exam
 * and topic — plus, for a signed-in student, `scope`: their latest attempt
 * as /chat rendered it (review, 24 Sep 2026). Results-page seeds carry no
 * attempt id ("…got 6 questions wrong — weakest: …"), so two attempts with
 * the same count and topics gave the same text, and the second results page
 * was held as a repeat of the first; "Quiz me…" clicked again after taking
 * the quiz was held too. A new attempt since the seed fired changes the
 * scope, so the seed sends again. No scope → the same key as before.
 */
export function seedFingerprint(
  seed: string,
  examCode: string | null | undefined,
  topicCode: string | null | undefined,
  scope?: string | null,
): string {
  const text = seed.trim().replace(/\s+/g, " ");
  const key = `${examCode ?? "-"}|${topicCode ?? "-"}|${text}` + (scope ? `|${scope}` : "");
  return fnv1a(key) + `.${text.length}`;
}

/** seedFingerprint's scope for a signed-in student: their latest attempt, and whether it has finished. */
export function attemptSeedScope(latest: { id: string; finishedAt: Date | null } | null | undefined): string | null {
  if (!latest) return null;
  return `${latest.id}:${latest.finishedAt ? latest.finishedAt.getTime() : "open"}`;
}

/** Parses the stored map, dropping anything malformed or older than the TTL. */
export function readFiredMap(raw: string | null, now: number): Record<string, number> {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof v === "number" && Number.isFinite(v) && v <= now && now - v < SEED_ONCE_TTL_MS) out[k] = v;
  }
  return out;
}

/** True when this seed already auto-sent in this tab within the TTL. */
export function wasSeedFiredRecently(store: SeedStore | null, fp: string, now = Date.now()): boolean {
  if (!store) return false;
  try {
    return fp in readFiredMap(store.getItem(SEED_ONCE_KEY), now);
  } catch {
    return false; // storage unreadable — behave as before (send)
  }
}

/** Records that this seed auto-sent now (prunes expired entries, keeps the newest SEED_ONCE_MAX). */
export function markSeedFired(store: SeedStore | null, fp: string, now = Date.now()): void {
  if (!store) return;
  try {
    const map = readFiredMap(store.getItem(SEED_ONCE_KEY), now);
    map[fp] = now;
    const kept = Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, SEED_ONCE_MAX);
    store.setItem(SEED_ONCE_KEY, JSON.stringify(Object.fromEntries(kept)));
  } catch {
    /* storage blocked or full — the seed still sends, it just isn't remembered */
  }
}

/**
 * The same URL without its `seed` param (other params and the hash kept), as
 * a path + query + hash for history.replaceState — or null when there is no
 * seed param (nothing to replace).
 */
export function stripSeedParam(href: string): string | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (!url.searchParams.has("seed")) return null;
  url.searchParams.delete("seed");
  const qs = url.searchParams.toString();
  return `${url.pathname}${qs ? `?${qs}` : ""}${url.hash}`;
}
