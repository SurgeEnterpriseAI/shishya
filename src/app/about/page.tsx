// /about — who is behind Shishya and why it exists. Also a Razorpay
// KYC-review requirement (About Us page).
//
// 26 Sep 2026 (whole-education identity): the page opens with Shishya's one
// shared description in its computed form (src/lib/site-description.ts) —
// every number read from the DB or a code constant by
// loadSiteDescriptionCounts(), the static form when the read fails — then the
// sections, and an AboutPage + FAQPage JSON-LD whose mainEntity is the root
// layout's Organization node. The typed "175+ exams" is gone. /hi/about and
// /te/about are middleware rewrites of this same page (src/middleware.ts);
// nothing here reads the locale, so they are unchanged.

import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd } from "@/components/JsonLd";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { MENTOR_SESSION_FEE_PAISE } from "@/lib/razorpay";
import { SECTION_LINKS, SITE_ORG_ID, SITE_URL, siteDescription, siteDescriptionStatic } from "@/lib/site-description";
import { loadSiteDescriptionCounts } from "@/lib/site-description-counts";

// The counts move slowly (exams, checked questions, chapters); one DB read
// an hour at most.
export const revalidate = 3600;

const ABOUT_URL = `${SITE_URL}/about`;
const ABOUT_TITLE = "About Shishya — one smart, free place to study for students in India";
const ABOUT_DESCRIPTION =
  "Shishya is a free, AI-supported practice platform for students in India — school (CBSE, CISCE), entrance and government exams, colleges, scholarships and careers — built by Surge Software Solutions Pvt Ltd, Bengaluru.";

export const metadata: Metadata = {
  title: ABOUT_TITLE,
  description: ABOUT_DESCRIPTION,
  // Self canonical (16 Sep 2026): one of 7 sitemap landings the crawl found without one.
  alternates: { canonical: ABOUT_URL },
  openGraph: { title: ABOUT_TITLE, description: ABOUT_DESCRIPTION, url: ABOUT_URL, siteName: "Shishya", locale: "en_IN", type: "website" },
};

/** The mentor fee as the payment code charges it (src/lib/razorpay.ts). */
const MENTOR_FEE = `₹${MENTOR_SESSION_FEE_PAISE / 100}`;

/** Same facts as /pricing, /terms and /contact. */
const FREE_ANSWER = `Yes. Every study feature on Shishya is free with no paywall and no premium tier — school chapters, practice questions, mock tests, previous-year-pattern sets, notes, exam trackers, the AI tutor, and the colleges, scholarships and careers pages. The only paid item is an optional session with a human mentor: the first session is free, later ones are ${MENTOR_FEE} each, inclusive of GST, paid only after a mentor accepts the request.`;
const WHO_ANSWER =
  "Shishya is built and operated by Surge Software Solutions Pvt Ltd, an Indian software company in Bengaluru, Karnataka. Contact: corp@surgesoftware.co.in or https://shishya.in/contact.";

async function aboutDescription(): Promise<string> {
  try {
    return siteDescription(await loadSiteDescriptionCounts());
  } catch (err) {
    console.error("[about] site counts unavailable — static description", err);
    return siteDescriptionStatic();
  }
}

export default async function AboutPage() {
  const description = await aboutDescription();
  const faq: [string, string][] = [
    ["What is Shishya?", description],
    ["Is Shishya free?", FREE_ANSWER],
    ["Who runs Shishya?", WHO_ANSWER],
  ];
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "@id": `${ABOUT_URL}#page`,
      url: ABOUT_URL,
      name: ABOUT_TITLE,
      description,
      inLanguage: "en-IN",
      isPartOf: { "@type": "WebSite", name: "Shishya", url: SITE_URL },
      mainEntity: { "@id": SITE_ORG_ID },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
    },
  ];
  return (
    <main className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
      <JsonLd data={jsonLd} />
      <h1 className="text-2xl font-bold text-ink-900">About Shishya</h1>
      <p className="mt-4">{description}</p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">The sections</h2>
      <p className="mt-1 text-xs text-ink-500">Each section stands on its own — open the one you need.</p>
      <ul className="mt-2 space-y-2">
        {SECTION_LINKS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="font-semibold text-saffron-700 underline">{s.label}</Link> — {s.blurb}
          </li>
        ))}
      </ul>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">Why it exists</h2>
      <p className="mt-2">
        Crores of Indians prepare for government and entrance exams every year, and most are told
        the serious way to prepare costs ₹30,000–₹1,50,000 at a coaching institute. Shishya exists
        to delete that fee: everything a coaching institute sells — mock tests for entrance and
        government exams, previous-year papers, study notes, a personal AI tutor in {INDIAN_LANGUAGE_COUNT} Indian languages, a day-by-day
        coach plan, cutoffs and exam-day analysis — free, in the student&apos;s own language.
      </p>
      <p className="mt-3">
        The platform is AI-first and runs with a tiny team, which is why it can stay free for
        students permanently. The only thing that ever carries a price is optional <b>human</b>{" "}
        time: a short mentor session with someone who has cleared your exam, first session free,
        then {MENTOR_FEE} per session inclusive of GST (see <Link href="/pricing" className="text-saffron-700 underline">Pricing</Link>).
      </p>
      <p className="mt-3">
        Shishya is built and operated by <b>Surge Software Solutions Pvt Ltd</b>, an Indian software
        company. Reach us any time at{" "}
        <a className="text-saffron-700 underline" href="mailto:corp@surgesoftware.co.in">corp@surgesoftware.co.in</a>{" "}
        or via the <Link href="/contact" className="text-saffron-700 underline">contact page</Link>.
        How our content is produced and checked — including what is AI-assisted, what is
        official-source-linked, and how errors get fixed — is documented in our{" "}
        <Link href="/editorial-policy" className="text-saffron-700 underline">editorial policy</Link>.
      </p>

      <h2 className="mt-8 text-lg font-semibold text-ink-900">Questions</h2>
      <dl className="mt-2 space-y-3">
        {faq.map(([q, a]) => (
          <div key={q}>
            <dt className="font-semibold text-ink-900">{q}</dt>
            <dd className="mt-0.5">{a}</dd>
          </div>
        ))}
      </dl>

      <p className="mt-6">
        <Link href="/" className="font-medium text-saffron-700 underline">Start studying — go to the home page →</Link>
      </p>
    </main>
  );
}
