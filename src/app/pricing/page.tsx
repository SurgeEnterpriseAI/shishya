// /pricing — the shortest pricing page in ed-tech: everything free,
// one optional human service at ₹9. Razorpay KYC-review requirement.

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing — Shishya",
  description: "Shishya is free for aspirants. The only optional paid service is a mentor session: first free, then ₹9 per session inclusive of GST.",
};

export default function PricingPage() {
  return (
    <main className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
      <h1 className="text-2xl font-bold text-ink-900">Pricing</h1>

      <div className="mt-5 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 p-5">
        <p className="text-base font-bold text-ink-900">The platform: ₹0. Free, always.</p>
        <p className="mt-1">
          Mock tests for 175+ exams, previous-year papers, study notes, the AI tutor in 22 Indian
          languages, personal coach plans, daily status reports, personalised study packs, All-India
          live tests, cutoffs and guides — all free. No trial, no credit card, no premium tier.
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-ink-200 bg-white p-5">
        <p className="text-base font-bold text-ink-900">Mentor sessions (optional): first free, then ₹9</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>A live ~10-minute one-on-one session with a verified mentor who has cleared your exam.</li>
          <li><b>Your first session is free.</b></li>
          <li>From the second session: <b>₹9 per session, inclusive of 18% GST</b> (₹7.63 + ₹1.37 tax, SAC 999293).</li>
          <li>You pay only after a mentor accepts your request; the session room unlocks on payment.</li>
          <li>The fee honours the mentor&apos;s time — it is not a platform charge. See{" "}
            <Link href="/refunds" className="text-saffron-700 underline">refund policy</Link>.</li>
        </ul>
      </div>

      <p className="mt-6 text-xs text-ink-500">
        Prices in Indian Rupees. Payments processed by our payment partner; we never see your card
        or UPI details. Operated by Surge Software Solutions Pvt Ltd.
      </p>
    </main>
  );
}
