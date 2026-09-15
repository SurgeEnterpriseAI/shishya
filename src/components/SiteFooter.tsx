// Minimal site-wide footer. Exists primarily so the legal pages
// (Terms / Privacy / Refunds) are reachable from every page — a
// payment-gateway (Razorpay) onboarding requirement — plus the
// operating-entity line. Deliberately quiet: one row, small type.

import Link from "next/link";
// 13 Sep 2026 (phone-first): two client islands that must exist on every
// page ride along with the footer — the once-only home-screen offer and
// the field web-vitals beacon. Both render nothing most of the time.
import { InstallOffer } from "./InstallOffer";
import { WebVitals } from "./WebVitals";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white py-5 print:hidden">
      <div className="container-prose flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
        <p>
          © {new Date().getFullYear()} Surge Software Solutions Pvt Ltd · Shishya is free for
          aspirants, always.
        </p>
        <p className="flex flex-wrap gap-4">
          {/* Exam calendar in the site-wide footer (25 Aug 2026): every
              page passes crawl equity to the tracker surface — the
              counter-move for the Google slump. */}
          <Link href="/exam-calendar" className="hover:text-ink-800">Exam calendar</Link>
          <Link href="/exams/state" className="hover:text-ink-800">Exams by state</Link>
          <Link href="/about" className="hover:text-ink-800">About</Link>
          <Link href="/editorial-policy" className="hover:text-ink-800">Editorial policy</Link>
          <Link href="/pricing" className="hover:text-ink-800">Pricing</Link>
          <Link href="/terms" className="hover:text-ink-800">Terms</Link>
          <Link href="/privacy" className="hover:text-ink-800">Privacy</Link>
          <Link href="/refunds" className="hover:text-ink-800">Refunds</Link>
          <Link href="/contact" className="hover:text-ink-800">Contact</Link>
        </p>
      </div>
      <InstallOffer />
      <WebVitals />
    </footer>
  );
}
