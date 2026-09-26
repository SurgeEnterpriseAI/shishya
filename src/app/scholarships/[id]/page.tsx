// /scholarships/[id] — per-scholarship detail page.
//
// SEO target: long-tail queries like "Reliance Foundation UG scholarship
// 2026 eligibility", "AICTE Pragati eligibility income", etc. Each
// scholarship becomes its own indexable URL.
//
// 26 Sep 2026 (every-education-search wave):
//   • linked from every card on /scholarships (they were orphans), and this
//     page links on: up to 6 related scholarships (same state first, then a
//     shared level, then the same type or reserved category), the match
//     wizard, /colleges and /schooling/streams;
//   • MonetaryGrant JSON-LD: our URL, the awarding body as funder, the
//     amount only as the data's own text (no number is parsed or invented);
//   • descriptions cut at a sentence / word boundary (was .slice(0, 280));
//   • exam chips link only codes in the live catalogue (GATE had none);
//   • revalidate daily — the page now reads the live exam list.
// 26 Sep 2026 (repair): the catalogue's one outside aggregator (Buddy4Study,
// tag "aggregator") is not a scholarship. It had a detail page marked up as
// a MonetaryGrant funded by "Buddy4Study (aggregator)", with a superlative
// and a third party's unchecked count in its text. Its URL now redirects
// (308) to /scholarships, which links the aggregator once, labelled as one;
// static params, related blocks and every count use SCHOLARSHIP_SCHEMES
// (src/lib/scholarship-schemes.ts).

import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { ExamChip } from "@/components/ExamChip";
import { SaveScholarshipButton } from "@/components/SaveScholarshipButton";
import { SCHOLARSHIPS, type Scholarship } from "@/data/scholarships";
import { SCHOLARSHIP_SCHEMES, isAggregatorListing } from "@/lib/scholarship-schemes";
import { loadLiveExams } from "@/lib/live-exam-codes";
import { relatedScholarships } from "@/lib/section-related";
import { clipDescription } from "@/lib/section-seo";

export const revalidate = 86_400;

interface PageParams { id: string }

export async function generateStaticParams() {
  return SCHOLARSHIP_SCHEMES.map((s) => ({ id: s.id }));
}

function findScholarship(id: string): Scholarship | undefined {
  return SCHOLARSHIPS.find((s) => s.id === id);
}

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { id } = await params;
  const s = findScholarship(id);
  if (!s) return { title: "Scholarship not found — Shishya" };
  // An aggregator listing redirects to /scholarships (see the page below).
  if (isAggregatorListing(s)) return { title: "Scholarships in India | Shishya", robots: { index: false, follow: true } };
  const year = new Date().getUTCFullYear();
  const title = `${s.name} ${year} — Eligibility, Amount, Apply | Shishya`;
  return {
    title,
    description: clipDescription(`${s.description} ${s.eligibility.note ?? ""} Amount: ${s.amount}. Free to apply.`),
    alternates: { canonical: `https://shishya.in/scholarships/${id}` },
    keywords: [
      s.name,
      s.awardingBody,
      `${s.name} eligibility`,
      `${s.name} ${year}`,
      `${s.name} apply`,
      ...s.tags,
    ],
    openGraph: {
      title,
      description: clipDescription(s.description, 200),
      url: `https://shishya.in/scholarships/${id}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
    },
  };
}

const LEVEL_LABEL: Record<string, string> = {
  CLASS_9_10: "Class 9–10",
  CLASS_11_12: "Class 11–12",
  DIPLOMA: "Diploma / ITI",
  UG: "Undergraduate",
  PG: "Postgraduate",
  PHD: "PhD / Research",
};

export default async function ScholarshipDetailPage({
  params,
}: { params: Promise<PageParams> }) {
  const { id } = await params;
  const s = findScholarship(id);
  if (!s) notFound();
  if (isAggregatorListing(s)) permanentRedirect("/scholarships");
  const [live] = await Promise.all([loadLiveExams()]);
  const related = relatedScholarships(s, SCHOLARSHIP_SCHEMES);
  const url = `https://shishya.in/scholarships/${s.id}`;

  // MonetaryGrant (26 Sep 2026): what the grant is and who funds it. The
  // amount is the data's own prose ("₹12,000/year for 4 years", "Full
  // tuition waiver"), carried as text — never parsed into a number.
  const grantJsonLd = {
    "@context": "https://schema.org",
    "@type": "MonetaryGrant",
    name: s.name,
    url,
    description: clipDescription(s.description, 300),
    funder: {
      "@type": "Organization",
      name: s.awardingBody,
      ...(s.officialSite ? { url: s.officialSite } : {}),
    },
    amount: { "@type": "MonetaryAmount", description: s.amount },
    // 26 Sep 2026: no isAccessibleForFree — schema.org defines it on CreativeWork,
    // Event, Offer and Place, not on MonetaryGrant.
  };

  // FAQ JSON-LD — Google rich result for "what is...", "who is eligible
  // for...", "how much does X pay" queries.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `Who is eligible for ${s.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text:
            (s.eligibility.note ?? "") +
            (s.eligibility.categories ? ` Reserved for ${s.eligibility.categories.join("/")} categories.` : "") +
            (s.eligibility.incomeMaxLakhs ? ` Family income ceiling ₹${s.eligibility.incomeMaxLakhs}L.` : "") +
            (s.eligibility.gender === "F" ? " For girls/women only." : "") +
            (s.eligibility.minMarksPct ? ` Minimum ${s.eligibility.minMarksPct}% marks required.` : ""),
        },
      },
      {
        "@type": "Question",
        name: `How much does ${s.name} pay?`,
        acceptedAnswer: { "@type": "Answer", text: s.amount },
      },
      {
        "@type": "Question",
        name: `How do I apply for ${s.name}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Apply directly on the awarding body's official portal: ${s.applyUrl}. Shishya does not collect applications. Deadline: ${s.deadline}.`,
        },
      },
    ],
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Scholarships", item: "https://shishya.in/scholarships" },
      { "@type": "ListItem", position: 3, name: s.name, item: `https://shishya.in/scholarships/${s.id}` },
    ],
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(grantJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/scholarships" className="hover:text-ink-800">Scholarships</Link> · {s.name}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-3">
          <h1 className="text-3xl font-bold text-ink-900">{s.name}</h1>
          <span className="rounded bg-saffron-100 px-2 py-0.5 text-[10px] font-medium text-saffron-800">
            {s.type.replace(/_/g, " ")}
          </span>
          <SaveScholarshipButton scholarshipId={s.id} scholarshipName={s.name} />
        </div>
        <p className="mt-1 text-sm text-ink-500">{s.awardingBody}</p>
        <p className="mt-4 max-w-3xl text-sm text-ink-700">{s.description}</p>

        {/* Quick facts */}
        <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fact label="Amount" value={s.amount} />
          <Fact label="Level" value={s.levels.map((l) => LEVEL_LABEL[l]).join(", ")} />
          <Fact label="State" value={s.state ? s.state : "National (all India)"} />
          <Fact label="Deadline" value={s.deadline} />
          {s.eligibility.categories && (
            <Fact label="Categories" value={s.eligibility.categories.join(", ")} />
          )}
          {s.eligibility.gender && (
            <Fact label="Gender" value={s.eligibility.gender === "F" ? "Girls / Women only" : "Boys / Men only"} />
          )}
          {s.eligibility.incomeMaxLakhs !== undefined && (
            <Fact label="Income ceiling" value={`₹${s.eligibility.incomeMaxLakhs} lakh / year`} />
          )}
          {s.eligibility.minMarksPct !== undefined && (
            <Fact label="Minimum marks" value={`${s.eligibility.minMarksPct}%`} />
          )}
          {s.eligibility.requiresExam && s.eligibility.requiresExam.length > 0 && (
            <Fact label="Requires exam" value={s.eligibility.requiresExam.map((e) => e.replace(/_/g, " ")).join(", ")} />
          )}
        </dl>

        {/* Apply CTA */}
        <div className="mt-6 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">
            Apply directly
          </p>
          <p className="mt-1 text-sm text-ink-700">
            Shishya does not collect applications. The link below goes
            straight to {s.awardingBody}.
          </p>
          <a
            href={s.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600"
          >
            Open official portal ↗
          </a>
          {s.officialSite && s.officialSite !== s.applyUrl && (
            <a
              href={s.officialSite}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-2 inline-flex rounded-md border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50"
            >
              Awarding body website ↗
            </a>
          )}
        </div>

        {/* Eligibility detail */}
        {s.eligibility.note && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">Eligibility</h2>
            <p className="mt-2 text-sm text-ink-700 whitespace-pre-line">{s.eligibility.note}</p>
          </>
        )}

        {/* Related exams */}
        {s.relevantExamCodes && s.relevantExamCodes.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">Relevant for these exams</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {s.relevantExamCodes.map((code) => (
                <ExamChip
                  key={code}
                  code={code}
                  live={live}
                  className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
                />
              ))}
            </div>
          </>
        )}

        {/* Related scholarships (26 Sep 2026) — server-rendered, so every
            detail page links six more and none is an orphan. */}
        {related.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">Related scholarships</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/scholarships/${r.id}`}
                    className="block h-full rounded-lg border border-ink-200 bg-white p-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                  >
                    <p className="text-sm font-semibold text-ink-900">{r.name}</p>
                    <p className="mt-0.5 text-[11px] text-ink-500">
                      {r.awardingBody} · {r.levels.map((l) => LEVEL_LABEL[l]).join(", ")}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Try match wizard */}
        <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">Not sure if you qualify?</h3>
          <p className="mt-2 text-xs">
            Run the Match Wizard. 5 quick questions, no signup, and you'll
            see which scholarships you actually qualify for ranked by relevance.
          </p>
          <Link
            href="/scholarships/match"
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
          >
            Open Match Wizard →
          </Link>
        </div>

        {/* Where to go next (26 Sep 2026). */}
        <nav aria-label="More on Shishya" className="mt-6 flex flex-wrap gap-2 text-xs">
          <Link href="/scholarships" className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
            All scholarships →
          </Link>
          <Link href="/colleges" className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
            Colleges by stream and state →
          </Link>
          <Link href="/schooling/streams" className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
            Choosing a Class 11 stream →
          </Link>
          <Link href="/careers" className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-ink-700 hover:border-saffron-400">
            Career guides →
          </Link>
        </nav>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-1 text-sm text-ink-800">{value}</dd>
    </div>
  );
}
