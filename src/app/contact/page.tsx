// /contact — how to reach us. Razorpay KYC-review requirement
// (Contact Us page).

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Shishya",
  description: "Contact Shishya / Surge Software Solutions Pvt Ltd.",
};

export default function ContactPage() {
  return (
    <main className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
      <h1 className="text-2xl font-bold text-ink-900">Contact us</h1>
      <p className="mt-4">
        <b>Shishya</b> is operated by <b>Surge Software Solutions Pvt Ltd</b>, India.
      </p>
      <ul className="mt-4 space-y-2">
        <li>
          📧 <b>Email:</b>{" "}
          <a className="text-saffron-700 underline" href="mailto:corp@surgesoftware.co.in">corp@surgesoftware.co.in</a>{" "}
          — support, refunds, data requests, partnerships. We respond within 48 hours.
        </li>
        <li>
          📞 <b>Phone:</b> +91 91600 57000 (business hours, IST)
        </li>
        <li>
          🌐 <b>Company:</b>{" "}
          <a className="text-saffron-700 underline" href="https://surgesoftware.co.in" target="_blank" rel="noopener noreferrer">surgesoftware.co.in</a>
        </li>
      </ul>
      <p className="mt-6 text-xs text-ink-500">
        For help inside the platform, the fastest route is the AI tutor (free, any language) or the
        &ldquo;talk to a subject expert&rdquo; option on any exam page.
      </p>
    </main>
  );
}
