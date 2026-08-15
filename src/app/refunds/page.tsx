// /refunds — Refund & Cancellation policy. Required by the payment
// gateway; written to almost never need invoking (payment is collected
// only after a mentor accepts, so orphan payments barely exist).

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy — Shishya",
  description: "Refunds and cancellations for Shishya mentor sessions (the platform itself is free).",
};

export default function RefundsPage() {
  return (
    <main className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
      <h1 className="text-2xl font-bold text-ink-900">Refund &amp; Cancellation Policy</h1>
      <p className="mt-1 text-xs text-ink-500">Last updated: 16 August 2026</p>

      <p className="mt-4">
        Shishya&apos;s platform is free, so there is nothing to refund for platform usage. This policy
        covers the only paid service: <b>mentor sessions</b> (₹9 per session, inclusive of GST, from
        the second session onwards; the first is free).
      </p>

      <h2 className="mt-6 text-base font-bold text-ink-900">When you get a full refund</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li><b>Mentor no-show:</b> you paid, joined the room, and the mentor did not join within the scheduled window.</li>
        <li><b>Technical failure on our side:</b> the session room did not work and the session could not happen.</li>
        <li><b>Cancellation before the session:</b> you cancel any time before the session starts.</li>
      </ul>
      <p className="mt-2">
        Refunds are issued to the original payment method within <b>5–7 business days</b> of your
        request.
      </p>

      <h2 className="mt-6 text-base font-bold text-ink-900">When a refund does not apply</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>The session happened (mentor and aspirant both joined).</li>
        <li>You did not join the room during the scheduled window while the mentor did.</li>
      </ul>

      <h2 className="mt-6 text-base font-bold text-ink-900">How to request a refund</h2>
      <p className="mt-2">
        Email <a className="text-saffron-700 underline" href="mailto:corp@surgesoftware.co.in">corp@surgesoftware.co.in</a>{" "}
        from your registered email with the session date. We respond within 48 hours. Because
        payment is only collected after a mentor accepts your request, orphan payments are rare by
        design.
      </p>
    </main>
  );
}
