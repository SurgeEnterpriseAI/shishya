// Minimal site-wide footer. Exists primarily so the legal pages
// (Terms / Privacy / Refunds) are reachable from every page — a
// payment-gateway (Razorpay) onboarding requirement — plus the
// operating-entity line. Deliberately quiet: one row, small type.

import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white py-5 print:hidden">
      <div className="container-prose flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
        <p>
          © {new Date().getFullYear()} Surge Software Solutions Pvt Ltd · Shishya is free for
          aspirants, always.
        </p>
        <p className="flex gap-4">
          <Link href="/terms" className="hover:text-ink-800">Terms</Link>
          <Link href="/privacy" className="hover:text-ink-800">Privacy</Link>
          <Link href="/refunds" className="hover:text-ink-800">Refunds</Link>
          <a href="mailto:corp@surgesoftware.co.in" className="hover:text-ink-800">Contact</a>
        </p>
      </div>
    </footer>
  );
}
