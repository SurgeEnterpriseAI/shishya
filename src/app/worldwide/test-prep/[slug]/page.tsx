// /worldwide/test-prep/[slug] — per-test prep guide.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { TEST_PREP } from "@/lib/worldwide-data";

interface PageParams { slug: string }

export async function generateStaticParams() {
  return TEST_PREP.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { slug } = await params;
  const t = TEST_PREP.find((x) => x.slug === slug);
  if (!t) return { title: "Not found — Shishya" };
  const year = new Date().getUTCFullYear();
  return {
    title: `${t.name} Prep Guide ${year} — Format, Fee, Strategy, Free Resources | Shishya`,
    description: `${t.fullName}. ${t.format.slice(0, 100)} Fee: ${t.feeInr}. Validity: ${t.validity}.`.slice(0, 280),
    alternates: { canonical: `https://shishya.in/worldwide/test-prep/${slug}` },
    keywords: [
      `${t.name} preparation`,
      `${t.name} free prep`,
      `${t.name} ${year}`,
      `${t.name} for ${t.acceptedFor[0]}`,
      `${t.name} fee India`,
      `${t.name} score validity`,
    ],
  };
}

export default async function TestPrepPage({
  params,
}: { params: Promise<PageParams> }) {
  const { slug } = await params;
  const t = TEST_PREP.find((x) => x.slug === slug);
  if (!t) notFound();

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/worldwide" className="hover:text-ink-800">Worldwide</Link> · Test prep · {t.name}
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">{t.name}</h1>
        <p className="mt-1 text-sm text-ink-500">{t.fullName}</p>

        <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Fact label="Test format" value={t.format} />
          <Fact label="Fee (India)" value={t.feeInr} />
          <Fact label="Validity" value={t.validity} />
          <Fact label="Accepted for" value={t.acceptedFor.join(", ")} />
        </dl>

        <h2 className="mt-10 text-base font-semibold text-ink-900">Prep strategy</h2>
        <p className="mt-2 text-sm text-ink-700">{t.prepStrategy}</p>

        <div className="mt-6 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">Official portal</p>
          <p className="mt-1 text-sm text-ink-700">
            Book the test directly on the official portal. We never sell test
            slots, vouchers, or "guaranteed score" packages.
          </p>
          <a
            href={t.officialSite}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600"
          >
            Open {t.name} official site ↗
          </a>
        </div>

        <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5 text-xs text-ink-700">
          <p className="font-semibold text-ink-800">Note on free prep</p>
          <p className="mt-2">
            Every test publisher (ETS, IDP, Pearson, GMAC) ships free official
            practice tests. Use those first before paying for any coaching.
            The official tests are the highest signal — coaching only matters
            once you've identified weaknesses from official mocks.
          </p>
        </div>

        <h2 className="mt-10 text-base font-semibold text-ink-900">Other tests</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {TEST_PREP.filter((o) => o.slug !== t.slug).map((o) => (
            <li key={o.slug}>
              <Link
                href={`/worldwide/test-prep/${o.slug}`}
                className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
              >
                {o.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-ink-200 bg-white p-3">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-1 text-xs text-ink-700">{value}</dd>
    </div>
  );
}
