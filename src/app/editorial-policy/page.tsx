// /editorial-policy — how Shishya's content is produced and checked
// (25 Aug 2026, E-E-A-T). Every claim on this page is verifiable in the
// product: official-source links on trackers, the report-a-question
// loop, the expert desk. No puffery — raters and users read this page
// the same way.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { NIRF_SOURCE_URL, NIRF_SOURCE_YEAR } from "@/lib/colleges-data";

// 26 Sep 2026 (whole-education identity): the typed "175+ exams" is gone;
// the page now also says how the school pages and the colleges,
// scholarships and careers data are made. Each data source below is stated
// exactly as the data file's own header comment states it
// (src/lib/colleges-data.ts, src/data/scholarships.ts, src/data/careers.ts)
// — nothing added. The date tiers match src/lib/official-source.ts.
const EDITORIAL_TITLE = "How Shishya builds and checks its content | Shishya";
const EDITORIAL_DESCRIPTION =
  "Shishya's editorial policy: AI-assisted content grounded in official notifications and previous-year papers, dates labelled official, reported or expected, school pages that link the official books and never copy them, stated sources for colleges, scholarships and careers, and student error-reporting on every question.";

export const metadata: Metadata = {
  title: EDITORIAL_TITLE,
  description: EDITORIAL_DESCRIPTION,
  alternates: { canonical: "https://shishya.in/editorial-policy" },
  openGraph: {
    title: EDITORIAL_TITLE,
    description: EDITORIAL_DESCRIPTION,
    url: "https://shishya.in/editorial-policy",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

export default function EditorialPolicyPage() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
        <h1 className="text-2xl font-bold text-ink-900">How Shishya builds and checks its content</h1>
        <p className="mt-2 text-xs text-ink-500">
          Operated by Surge Software Solutions Pvt Ltd, Bengaluru ·{" "}
          <a className="text-saffron-700 underline" href="mailto:corp@surgesoftware.co.in">corp@surgesoftware.co.in</a>
        </p>

        <h2 className="mt-8 text-lg font-semibold text-ink-900">AI-assisted, source-grounded</h2>
        <p className="mt-2">
          Shishya covers school, entrance and government exams, colleges, scholarships and careers.
          At that breadth, our practice questions, study notes and exam summaries are drafted with
          AI — we say that plainly — and they are grounded in the material that matters: official
          notifications from the conducting bodies, previous-year papers, and each exam&apos;s
          published pattern. Practice questions go through a validation step before they are served
          to students.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">Official, reported or expected — always labelled</h2>
        <p className="mt-2">
          On every exam tracker, a date is marked <b>Official</b> only when it is cited from the
          conducting body&apos;s own site — the link is right there. A date that was announced but
          is cited through a secondary source, such as a news or coaching site, is marked{" "}
          <b>Reported</b>: real, but worth confirming. Anything else is marked <b>Expected</b>: an
          estimate from previous cycles, never presented as an announcement. We also show when each
          exam&apos;s data was last updated, and we always tell aspirants to confirm on the
          conducting body&apos;s website before acting.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">School pages</h2>
        <p className="mt-2">
          For CBSE, the school section follows the NCERT textbooks: class, subject and chapter
          pages link the official NCERT books and chapter PDFs on ncert.nic.in, with chapter titles
          as NCERT prints them. The books are NCERT&apos;s — we never copy, summarise or translate textbook
          text; we link it. For CISCE (ICSE / ISC) we link the council&apos;s own syllabus and
          curriculum documents. Shishya&apos;s own chapter notes and its AI-written, answer-checked
          practice questions appear only on the chapters marked as having them; every other chapter
          page shows the official link only.
        </p>
        <p className="mt-2">
          Class 1-7 pages are content only: no sign-in and no chat tutor. On Class 8-12 pages,
          students aged 13 and above can sign in for an AI tutor scoped to their class.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">Colleges, scholarships and careers data</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>
            <b>Colleges:</b> National Institutional Ranking Framework (NIRF) {NIRF_SOURCE_YEAR},
            Ministry of Education, Government of India —{" "}
            <a className="text-saffron-700 underline" href={NIRF_SOURCE_URL} rel="noopener">{NIRF_SOURCE_URL.replace(/^https?:\/\//, "")}</a>.
            Every rank is from the published {NIRF_SOURCE_YEAR} list; where we are not certain of an
            exact rank, we omit the number rather than guess. Each college page links the
            college&apos;s own website.
          </li>
          <li>
            {/* 26 Sep 2026 (repair): said links "never" go to a third-party aggregator, but the
                catalogue held one (Buddy4Study); it is now kept out of the scholarship lists and
                counts (src/lib/scholarship-schemes.ts) and linked once, labelled, on /scholarships. */}
            <b>Scholarships:</b> each entry was cross-checked against the official site at the time
            of writing, and each scheme links its awarding body or official portal directly. One
            outside aggregator (Buddy4Study) is also linked for wider discovery; it is labelled as an
            aggregator and is not counted among the scholarships. Where amounts vary by year or
            category we describe the typical band rather than a fixed number.
          </li>
          <li>
            <b>Careers:</b> salary bands draw on the NASSCOM Indian IT salary report, the Naukri
            JobSpeak quarterly index, 7th Pay Commission tables for government roles, PayScale and
            AmbitionBox aggregates for private roles, and official salary structures published by
            ministries (UPSC, banks, defence). The bands are deliberately wide — real salaries vary
            by city, employer, tier and performance.
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">Every question can be challenged</h2>
        <p className="mt-2">
          {/* 27 Sep 2026: the old line said reports are "reviewed by a human"; all 72
              closed reports were closed by the automated re-check. Say what happens. */}
          Every practice question carries a <b>Report</b> action. A reported question is re-checked —
          today by an automated review that solves it again against its answer key — and the key is
          corrected or the question is withdrawn; reporters are notified by email of the outcome.
          Aspirants can also send any doubt to the free expert desk: a person answers, and if no one
          has within a day, Shishya&apos;s AI answers it, labelled as such, and the team follows up.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">What we will not do</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>No paywall on preparation — mocks, papers, notes, tutor, plans stay free.</li>
          <li>No invented vacancy counts, cutoffs or dates presented as fact.</li>
          <li>No ads, no affiliate links, no selling of aspirant data.</li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">Corrections</h2>
        <p className="mt-2">
          Found something wrong? Use the report button on the question, the{" "}
          <Link href="/contact" className="text-saffron-700 underline">contact page</Link>, or email{" "}
          <a className="text-saffron-700 underline" href="mailto:corp@surgesoftware.co.in">corp@surgesoftware.co.in</a>{" "}
          — corrections ship fast and quietly.
        </p>

        <p className="mt-8">
          <Link href="/about" className="font-medium text-saffron-700 underline">About Shishya →</Link>
        </p>
      </section>
    </main>
  );
}
