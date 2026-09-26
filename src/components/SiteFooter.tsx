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
// 26 Sep 2026 (whole-education identity): every page links the independent
// sections (src/lib/site-description.ts SECTION_LINKS) so crawlers reach
// school, entrance, government, colleges, scholarships and careers from any
// URL, and the tagline is "one smart place to study", not "free for
// aspirants". The row adds English letters to every /hi and /te twin page:
// SITE_FRAME_LATIN in src/lib/twin-localisation.ts should follow.
import { SECTION_LINKS } from "@/lib/site-description";

export function SiteFooter() {
  return (
    <footer className="border-t border-ink-100 bg-white py-5 print:hidden">
      <nav aria-label="Sections" className="container-prose mb-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-ink-700">
        {SECTION_LINKS.map((s) => (
          <Link key={s.href} href={s.href} className="hover:text-ink-900">
            {s.label}
          </Link>
        ))}
      </nav>
      <div className="container-prose flex flex-wrap items-center justify-between gap-2 text-xs text-ink-500">
        <p>
          © {new Date().getFullYear()} Surge Software Solutions Pvt Ltd · Shishya — one smart, free place
          to study.
        </p>
        <p className="flex flex-wrap gap-4">
          {/* 26 Sep 2026 (entry points): the one crawlable link to the
              whole-platform search and AI answers on every page. The
              header's "Ask Shishya" chip opens /chat, which robots.txt
              blocks for every crawler, so /ask had almost no internal
              link. The anchor is the page's own H1 ("Search or ask
              Shishya"). Adds 18 English letters to every /hi and /te twin:
              SITE_FRAME_LATIN in src/lib/twin-localisation.ts should follow. */}
          <Link href="/ask" className="hover:text-ink-800">Search or ask Shishya</Link>
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
