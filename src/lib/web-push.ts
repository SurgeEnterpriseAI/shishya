// Web push delivery (13 Sep 2026, reach program #3 — exam alerts on the
// phone). Server only. The rules — allowed endpoints, what a notification
// says — are in src/lib/push-alert-rules.ts.
//
// Configuration (all three, or the feature is off: the alert box hides the
// phone option, /api/push/subscribe answers 503 and the cron sends nothing):
//   NEXT_PUBLIC_VAPID_PUBLIC_KEY  also compiled into the browser bundle
//   VAPID_PRIVATE_KEY             server secret
//   VAPID_SUBJECT                 mailto: contact the push services can reach

import * as webpush from "web-push";
import type { PushPayload } from "@/lib/push-alert-rules";

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** "gone" = the push service says this subscription no longer exists
 *  (404 / 410): the caller retires the row. */
export type PushOutcome = "sent" | "gone" | "failed";

let configured: boolean | null = null;

export function pushConfigured(): boolean {
  if (configured !== null) return configured;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return (configured = false);
  try {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    configured = true;
  } catch (err) {
    console.error("[web-push] invalid VAPID configuration:", (err as Error)?.message);
    configured = false;
  }
  return configured;
}

export async function sendPush(target: PushTarget, payload: PushPayload): Promise<PushOutcome> {
  if (!pushConfigured()) return "failed";
  try {
    await webpush.sendNotification(
      { endpoint: target.endpoint, keys: { p256dh: target.p256dh, auth: target.auth } },
      JSON.stringify(payload),
      // A day to reach a phone that is off; an exam alert older than that is stale.
      { TTL: 24 * 60 * 60, urgency: "normal", timeout: 10_000 },
    );
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("[web-push] send failed:", status ?? "no status", String((err as Error)?.message ?? "").slice(0, 200));
    return "failed";
  }
}
