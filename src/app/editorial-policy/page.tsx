// /editorial-policy — how Shishya's content is produced and checked
// (25 Aug 2026, E-E-A-T). Every claim on this page is verifiable in the
// product: official-source links on trackers, the report-a-question
// loop, the mentor desk. No puffery — raters and users read this page
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
// 6 Oct 2026 (search plan doNow 1): the page said notes and summaries "are
// grounded in … official notifications from the conducting bodies,
// previous-year papers, and each exam's published pattern". That was not
// true: notes are drafted by AI from Shishya's syllabus outline (no official
// document is read — scripts/generate-topic-notes.ts), no note has been
// reviewed by a person (TopicTeachingNote.validatedAt: 0 rows), every practice
// question is written by AI and checked by an automated AI answer check, and
// the previous-year pages hold questions written in each year's pattern, not
// the original paper. The page now says exactly that; the date tiers, the
// school, colleges, scholarships and careers sections are unchanged.
const EDITORIAL_TITLE = "How Shishya builds and checks its content | Shishya";
const EDITORIAL_DESCRIPTION =
  "Shishya's editorial policy: study notes drafted with AI from a syllabus outline and not reviewed by a person, AI-written practice questions with an automated AI answer check, previous-year pages that hold pattern questions, not the original paper, dates labelled official, reported or expected, school pages that link the official books and never copy them, stated sources for colleges, scholarships and careers, and student error-reporting on every question.";

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

        <h2 className="mt-8 text-lg font-semibold text-ink-900">Written with AI — what that means</h2>
        <p className="mt-2">
          Shishya covers school, entrance and government exams, colleges, scholarships and careers.
          At that breadth, our study notes, practice questions and exam summaries are written with
          AI. This is exactly how each is made:
        </p>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>
            <b>Study notes</b> on exam topic pages are drafted by AI from Shishya&apos;s syllabus
            outline for the exam (for many exams that outline was itself drafted with AI). No
            official document is read when a note is written. Notes are <b>not reviewed by a
            person</b> unless the page says so: each topic note shows &ldquo;Reviewed by a
            person&rdquo; with a date, or &ldquo;not yet&rdquo;. Hindi notes are AI translations of
            the English note and are not reviewed by a person either.
          </li>
          <li>
            <b>Practice questions</b> are written by AI and checked by an automated AI answer check:
            each question is solved several times by an AI model that is not shown the stored answer
            key, and an AI examiner compares the key with those solves. The question is kept, its
            key is corrected, or it is withdrawn. The check is automated, not a person, and it can
            be wrong. Some older questions were validated before the check existed and have not been
            through it yet;{" "}
            <Link href="/shishya-in-numbers#answer-check" className="text-saffron-700 underline">the numbers page</Link>{" "}
            counts them, with what the check kept, corrected and withdrew.
          </li>
          <li>
            <b>Previous-year paper pages</b> hold questions written by AI in the pattern of each
            year&apos;s paper — not the original paper&apos;s questions. Where we have found the
            original paper on the conducting body&apos;s site, the page links it.
          </li>
          <li>
            <b>Exam news</b> items are AI summaries. Where a source link is stored, the item shows
            it (never a copycat or scraper site); where none is stored, the item says so.
          </li>
          <li>
            <b>Dates</b> marked <b>Official</b> link the conducting body&apos;s own site (see the
            next section).
          </li>
        </ul>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">Official, reported or expected — always labelled</h2>
        <p className="mt-2">
          On every exam tracker, a date is marked <b>Official</b> only when it is cited from the
          conducting body&apos;s own site and was checked there — by a person, or, for a released
          answer key or result, by our own read of that page; the link is right there. A date cited through a secondary source, such as a news or coaching
          site, or found by our AI and not yet checked by a person, is marked{" "}
          <b>Reported</b>: not yet checked against an official notice, so confirm it. Anything else is marked <b>Expected</b>: an
          estimate from previous cycles, never presented as an announcement. We also show when each
          exam&apos;s data was last updated, and we always tell students to confirm on the
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
          Class 1-7 pages are content only: no sign-in, no chat tutor and no visitor identifier
          stored. On CBSE Class 8-12 chapter pages anyone can ask the AI tutor about the chapter
          without an account (study questions only, with a daily message limit); students aged 13
          and above can sign in to save practice.
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
          Students can also send any doubt to a mentor, free: a person answers, and if no one
          has within a day, Shishya&apos;s AI answers it, labelled as such, and the team follows up.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">The AI tutor (Ask Shishya)</h2>
        <p className="mt-2">
          Ask Shishya is an AI tutor for a student&apos;s studies in India — school (Class 8–12),
          entrance and government exams, colleges and courses, scholarships and careers. It says it
          is an AI and answers study questions only. For school subjects it explains concepts in its
          own words and points to the official textbook; it never copies, summarises or translates
          textbook text. Class 1–7 pages have no tutor.
        </p>

        <h2 className="mt-6 text-lg font-semibold text-ink-900">What we will not do</h2>
        <ul className="mt-2 list-disc pl-5 space-y-1">
          <li>No paywall on preparation — mocks, papers, notes, tutor, plans stay free.</li>
          <li>No invented vacancy counts, cutoffs or dates presented as fact.</li>
          <li>No ads, no affiliate links, no selling of student data.</li>
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
