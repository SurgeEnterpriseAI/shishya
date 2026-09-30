// utm_content on analytics events (30 Sep 2026). The tracker records
// utm_source / utm_medium / utm_campaign as columns; the YouTube test on the
// founder's ITV channel (one Short per page, utm_campaign=itv-test,
// utm_content=<video slug>) needs the fourth tag to count landings and
// sign-ups per video. It rides in the event's props (no new column):
// props.utmContent, a short slug-like string. Never on Class 1-7 rows (the
// route drops every tag there). Pure.

/** A slug-safe, length-capped utm_content, or null when absent or unusable. */
export function cleanUtmContent(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 64);
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
