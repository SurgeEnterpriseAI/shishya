// Browser push helpers for Challenge a friend (14 Sep 2026): the challenger
// taps "Tell me on this phone when a friend plays". Same service worker
// (/push-sw.js), VAPID key and permission flow as the exam alert box, which
// keeps its own copy of the first two helpers (src/components/ExamAlertBox.tsx).

export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export function pushSupported(): boolean {
  try {
    return (
      VAPID_PUBLIC_KEY.length > 0 &&
      window.isSecureContext &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  } catch {
    return false;
  }
}

/** base64url VAPID key → the raw bytes PushManager.subscribe expects. */
export function vapidKeyBytes(base64url: string): ArrayBuffer {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buf = new ArrayBuffer(raw.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < raw.length; i++) view[i] = raw.charCodeAt(i);
  return buf;
}

export interface DeviceSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Ask for permission, register the service worker and return this device's
 *  push subscription, or why not: "denied" (blocked for the site),
 *  "dismissed" (prompt closed) or "error". */
export async function subscribeThisDevice(): Promise<
  { ok: true; subscription: DeviceSubscription } | { ok: false; reason: "denied" | "dismissed" | "error" }
> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: permission === "denied" ? "denied" : "dismissed" };
    const registration = await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready;
    const subscription =
      (await registration.pushManager.getSubscription()) ??
      (await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKeyBytes(VAPID_PUBLIC_KEY) }));
    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return { ok: false, reason: "error" };
    return { ok: true, subscription: { endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } } };
  } catch {
    return { ok: false, reason: "error" };
  }
}
