// Exam alerts as phone notifications (web push) — the pure rules
// (13 Sep 2026, reach program #3). Unit-tested in
// tests/unit/push-alert-rules.test.ts; delivery lives in src/lib/web-push.ts.
//
// Why: of the people who find Shishya, 2.3% come back within 14 days
// (13 Sep baseline). A student who follows an exam on their phone hears
// about the admit card or the result without having to remember us.
//
// Rules:
//   • Only real browser push services are accepted as endpoints. The cron
//     later POSTs to that URL, so an open field would let anyone make
//     shishya.in call a server of their choosing.
//   • A notification states what changed in one line and opens OUR tracker,
//     where every date carries its source tier — never a bare claim.
//   • The same cadence caps as the email alert apply (the cron passes each
//     device's lastNotifiedAt), and one notification per device per run.

/** Hostnames of the browser push services. A leading dot = any subdomain. */
export const PUSH_SERVICE_HOSTS: readonly string[] = [
  "fcm.googleapis.com", // Chrome, Samsung Internet, Opera, Edge on Android
  "updates.push.services.mozilla.com", // Firefox
  "push.services.mozilla.com",
  "web.push.apple.com", // Safari, iOS / iPadOS home-screen apps
  ".notify.windows.com", // Edge on Windows (WNS)
];

export function isAllowedPushEndpoint(endpoint: string): boolean {
  let u: URL;
  try {
    u = new URL(endpoint);
  } catch {
    return false;
  }
  if (u.protocol !== "https:" || u.username || u.password || u.port) return false;
  const host = u.hostname.toLowerCase();
  return PUSH_SERVICE_HOSTS.some((h) => (h.startsWith(".") ? host.endsWith(h) && host.length > h.length : host === h));
}

export interface PushPayload {
  title: string;
  body: string;
  /** Same-origin path the notification opens (the service worker refuses anything else). */
  url: string;
  /** Replaces an earlier notification for the same exam instead of stacking. */
  tag: string;
}

export function clipText(s: string, max: number): string {
  const t = (s ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max - 1).trimEnd()}…` : t;
}

/** One notification for the changes a device has not been told about yet
 *  (newest first is the caller's order). */
export function examAlertPushPayload(p: {
  examCode: string;
  examShort: string;
  changes: { title: string; detail?: string | null }[];
}): PushPayload {
  const first = p.changes[0];
  const more = p.changes.length > 1 ? ` · +${p.changes.length - 1} more on the tracker` : "";
  return {
    title: clipText(`${p.examShort}: ${first ? first.title : "update"}`, 72),
    body: clipText(first?.detail ? `${first.detail}${more}` : `Open the tracker for the details and the source${more}`, 140),
    url: `/exams/${encodeURIComponent(p.examCode)}/updates?utm_source=push&utm_medium=alert`,
    tag: `exam-${p.examCode}`,
  };
}

/** The one confirmation sent when a device first follows an exam — it
 *  proves the subscription works, and says exactly what will come. */
export function welcomePushPayload(examShort: string, examCode: string): PushPayload {
  return {
    title: clipText(`Alerts on for ${examShort}`, 72),
    body: "One notification when something real happens: a date, the admit card, the answer key or the result.",
    url: `/exams/${encodeURIComponent(examCode)}/updates?utm_source=push&utm_medium=welcome`,
    tag: `exam-${examCode}`,
  };
}
