// /terms — Terms of Service. Plain-language, honest, and specific to
// what Shishya actually is: a free platform with one optional paid
// human service (mentor sessions, ₹9 incl. GST from the second session).

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Shishya",
  description: "Terms of service for Shishya (shishya.in) — a free study platform for school, entrance and government exams, colleges, scholarships and careers, with optional paid mentor sessions.",
  // Self canonical (16 Sep 2026): one of 7 sitemap landings the crawl found without one.
  alternates: { canonical: "https://shishya.in/terms" },
};

export default function TermsPage() {
  return (
    <main className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
      <h1 className="text-2xl font-bold text-ink-900">Terms of Service</h1>
      <p className="mt-1 text-xs text-ink-500">Last updated: 27 September 2026</p>

      <h2 className="mt-6 text-base font-bold text-ink-900">1. Who we are</h2>
      <p className="mt-2">
        Shishya (shishya.in) is operated by <b>Surge Software Solutions Pvt Ltd</b> (&ldquo;Surge&rdquo;,
        &ldquo;we&rdquo;). Contact: <a className="text-saffron-700 underline" href="mailto:corp@surgesoftware.co.in">corp@surgesoftware.co.in</a>.
      </p>

      <h2 className="mt-6 text-base font-bold text-ink-900">2. The platform is free</h2>
      <p className="mt-2">
        Every learning feature on Shishya — school chapter pages, practice questions, mock tests,
        previous-year-pattern papers, study notes, the AI tutor, the personal coach, status reports,
        study packs, live tests, cutoffs, guides, and the college, scholarship and career pages — is
        free for every student. We do not charge for platform usage, and signing up requires no
        payment details.
      </p>

      <h2 className="mt-6 text-base font-bold text-ink-900">3. Mentor sessions (the one paid service)</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>A student preparing for an exam may optionally request a live session with a verified human mentor who has cleared that exam.</li>
        <li><b>The first mentor session is free.</b> From the second session onwards, a session (approximately 10 minutes) costs <b>₹9, inclusive of GST at 18%</b> (SAC 999293 — commercial training and coaching services).</li>
        <li>Payment is collected only <b>after</b> a mentor accepts your request, via our payment partner. The session room unlocks on payment.</li>
        <li>The fee honours the mentor&apos;s time. It is not a charge for using Shishya.</li>
        <li>Refunds are governed by our <Link href="/refunds" className="text-saffron-700 underline">Refund Policy</Link>.</li>
      </ul>

      <h2 className="mt-6 text-base font-bold text-ink-900">4. Fair use</h2>
      <p className="mt-2">
        Don&apos;t scrape at abusive rates, resell access, attempt to break other users&apos; privacy, or use
        the AI tutor for anything other than studying — it answers study questions only. We may
        rate-limit or suspend accounts that abuse the service.
      </p>

      <h2 className="mt-6 text-base font-bold text-ink-900">5. Accounts and age</h2>
      <p className="mt-2">
        Accounts are for people aged 13 and above. Class 1-7 school pages are content only, with no
        sign-in, no tutor and no visitor identifier stored. On CBSE Class 8-12 chapter pages anyone
        can ask the AI tutor without an account; it answers study questions only and has a daily
        message limit. No page asks your age or role before showing content; the optional
        personalise step asks your stage only if you open it. An account that answered the older
        one-time school question keeps that answer: a student who said 13-17 keeps the class tutor
        only, and the class tutor is told the answer.
      </p>

      <h2 className="mt-6 text-base font-bold text-ink-900">6. Honest-effort disclaimer</h2>
      <p className="mt-2">
        Questions, notes, cutoffs and guidance are prepared with care (and verified where possible)
        but may contain errors; expected cutoffs and analyses are indicative, never official. Always
        verify critical details (dates, eligibility, patterns) on the conducting body&apos;s official
        website. Shishya does not guarantee selection in any exam.
      </p>

      <h2 className="mt-6 text-base font-bold text-ink-900">7. Your content and data</h2>
      <p className="mt-2">
        Your preparation data belongs to you. How we collect and use it is described in the{" "}
        <Link href="/privacy" className="text-saffron-700 underline">Privacy Policy</Link>. Your
        report is shared with a mentor only when you explicitly consent at the time of requesting a
        session.
      </p>

      <h2 className="mt-6 text-base font-bold text-ink-900">8. Changes and governing law</h2>
      <p className="mt-2">
        We may update these terms; material changes will be noted on this page with a new date.
        These terms are governed by the laws of India; courts at Bengaluru, Karnataka have
        jurisdiction.
      </p>
    </main>
  );
}
