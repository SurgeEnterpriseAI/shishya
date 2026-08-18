// Razorpay payment links — the entire integration surface for mentor-
// session fees. Deliberately tiny: create a link, check a link. No SDK
// (the REST API is two calls), no card data ever touches our servers.
//
// Env: RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET (test keys until KYC
// approval, then live keys — same code). Missing keys → callers treat
// the session as free rather than blocking a mentor's accept.

const BASE = "https://api.razorpay.com/v1";

function authHeader(): string | null {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) return null;
  return "Basic " + Buffer.from(`${id}:${secret}`).toString("base64");
}

export const MENTOR_SESSION_FEE_PAISE = 900; // ₹9 inclusive of 18% GST (₹7.63 + ₹1.37)

export async function createMentorFeeLink(opts: {
  requestId: string;
  studentName: string | null;
  studentEmail: string | null;
}): Promise<{ id: string; shortUrl: string } | null> {
  const auth = authHeader();
  if (!auth) return null;
  try {
    const res = await fetch(`${BASE}/payment_links`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: auth },
      body: JSON.stringify({
        amount: MENTOR_SESSION_FEE_PAISE,
        currency: "INR",
        description: "₹9 (incl. GST) — only for your mentor's personal time. Everything on Shishya — mocks, notes, plans, reports — is free, always.",
        customer: {
          name: opts.studentName ?? undefined,
          email: opts.studentEmail ?? undefined,
        },
        notify: { email: false, sms: false },
        notes: { requestId: opts.requestId },
        callback_url: `https://shishya.in/me/report?paid=1`,
        callback_method: "get",
        // Expire the link in 7 days — a stale link for a long-closed
        // session shouldn't stay payable forever (audit 18 Aug 2026).
        // Razorpay wants a Unix-seconds timestamp.
        expire_by: Math.floor((Date.now() + 7 * 24 * 3600_000) / 1000),
        reminder_enable: false,
      }),
    });
    if (!res.ok) {
      console.error("[razorpay] link create failed:", res.status, (await res.text()).slice(0, 200));
      return null;
    }
    const j = (await res.json()) as { id: string; short_url: string };
    return { id: j.id, shortUrl: j.short_url };
  } catch (err) {
    console.error("[razorpay] link create error:", err);
    return null;
  }
}

/** True once the link has been fully paid. */
export async function isLinkPaid(paymentLinkId: string): Promise<boolean> {
  const auth = authHeader();
  if (!auth) return false;
  try {
    const res = await fetch(`${BASE}/payment_links/${paymentLinkId}`, {
      headers: { Authorization: auth },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const j = (await res.json()) as { status?: string };
    return j.status === "paid";
  } catch {
    return false;
  }
}

/** Cancel a payment link so it can no longer be paid — used when a
 *  session is closed or released while still unpaid, so a student can't
 *  pay for a session that's over (audit 18 Aug 2026). Best-effort;
 *  Razorpay rejects cancelling an already-paid link, which is fine. */
export async function cancelLink(paymentLinkId: string): Promise<void> {
  const auth = authHeader();
  if (!auth) return;
  try {
    await fetch(`${BASE}/payment_links/${paymentLinkId}/cancel`, {
      method: "POST",
      headers: { Authorization: auth },
    });
  } catch {
    /* best-effort */
  }
}
