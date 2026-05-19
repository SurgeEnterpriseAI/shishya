// /scholarships/[id] — per-scholarship detail page.
//
// SEO target: long-tail queries like "Reliance Foundation UG scholarship
// 2026 eligibility", "AICTE Pragati eligibility income", etc. Each
// scholarship becomes its own indexable URL.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SaveScholarshipButton } from "@/components/SaveScholarshipButton";
import { SCHOLARSHIPS, type Scholarship } from "@/data/scholarships";

interface PageParams { id: string }

export async function generateStaticParams() {
  return SCHOLARSHIPS.map((s) => ({ id: s.id }));
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
  const year = new Date().getUTCFullYear();
  const title = `${s.name} ${year} — Eligibility, Amount, Apply | Shishya`;
  return {
    title,
    description: `${s.description} ${s.eligibility.note ?? ""} Amount: ${s.amount}. Free to apply.`.slice(0, 280),
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
      description: s.description.slice(0, 200),
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
                <Link
                  key={code}
                  href={`/exams/${code}`}
                  className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
                >
                  {code.replace(/_/g, " ")}
                </Link>
              ))}
            </div>
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
