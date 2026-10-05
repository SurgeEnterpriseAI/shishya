// utm_content on analytics events (30 Sep 2026). The tracker records
// utm_source / utm_medium / utm_campaign as columns; the YouTube test on the
// founder's ITV channel (one Short per page, utm_campaign=itv-test,
// utm_content=<video slug>) needs the fourth tag to count landings and
// sign-ups per video. It rides in the event's props (no new column):
// props.utmContent, a short slug-like string. Never on Class 1-7 rows (the
// route drops every tag there). Pure.
//
// 3 Oct 2026 (sign-ups-to-100 plan, lever "store utm_content"): the SAME
// cleaned value now also reaches the SIGNUP row (props.utmContent), through
// the first-landing attribution cookie (src/middleware.ts →
// src/lib/signup-attribution.ts → src/lib/signin-cta.ts signupEventProps),
// so per-link sources — a YouTube Short, one coaching centre's link — can be
// counted from landing to account. And no personal data: a value that looks
// like an email address (an "@") or a phone number (ten or more digits in
// all, separators ignored) is dropped whole, never stored in part. Our own
// links carry slugs ("ssc-cgl", "itv-test-tnpsc-g4", "centre-03"); an ad
// tool or a mailer that pastes a reader's address or number into the tag is
// exactly what must not be kept.
// This rule reaches page views too (the analytics route uses this cleaner):
// a stricter privacy rule, which none of the 14 values stored by 3 Oct 2026
// trips. Its cost: a slug with ten or more digits in all is dropped as well
// — a date-stamped one ("2026-10-05-centre-01") or an ad tool's numeric id.
// So every per-link slug we make keeps to NINE digits or fewer ("centre-01",
// "ap-centre-10"); tests/unit/signup-utm-content.test.ts pins that format.

/** At most this many characters are kept (the slug is cut, never refused for length). */
export const UTM_CONTENT_MAX = 64;

/** Ten or more digits in all: an Indian mobile number, with or without +91 and separators. */
const PHONE_LIKE_MIN_DIGITS = 10;

/** A slug-safe, length-capped utm_content, or null when absent, unusable, or personal. */
export function cleanUtmContent(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  // Personal data is dropped whole: an email address, or a phone number.
  // 3 Oct 2026 (review): also an address encoded twice ("a%2540gmail.com"
  // arrives here as "a%40gmail.com", with no "@" in it).
  if (raw.includes("@") || /%40/i.test(raw) || (raw.match(/\d/g) ?? []).length >= PHONE_LIKE_MIN_DIGITS) return null;
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, UTM_CONTENT_MAX);
  return s || null;
}

/** The event's props with utmContent added (props untouched when there is none). */
export function withUtmContent(
  props: Record<string, unknown> | undefined,
  raw: unknown,
): Record<string, unknown> | undefined {
  const utmContent = cleanUtmContent(raw);
  if (!utmContent) return props;
  return { ...(props ?? {}), utmContent };
}
