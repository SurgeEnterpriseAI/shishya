// /insights/[slug] — per-article page.
//
// 3 Oct 2026: the body is drawn by the shared notes renderer
// (src/components/NotesMarkdown.tsx, rich → src/lib/notes-markdown.ts). The
// local markdown-lite renderer it replaces knew no tables, so 11 of 23
// articles printed their pipe tables as raw text.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { NotesMarkdown } from "@/components/NotesMarkdown";
import { findArticle, INSIGHTS_ARTICLES } from "@/data/insights-articles";

interface PageParams { slug: string }

export async function generateStaticParams() {
  return INSIGHTS_ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: { params: Promise<PageParams> }): Promise<Metadata> {
  const { slug } = await params;
  const a = findArticle(slug);
  if (!a) return { title: "Article not found — Shishya" };
  return {
    title: `${a.title} | Shishya Insights`,
    description: a.dek,
    alternates: { canonical: `https://shishya.in/insights/${slug}` },
    keywords: a.tags,
    openGraph: {
      title: a.title,
      description: a.dek,
      url: `https://shishya.in/insights/${slug}`,
      siteName: "Shishya",
      locale: "en_IN",
      type: "article",
      publishedTime: a.publishedOn,
      authors: [a.author],
    },
  };
}

export default async function ArticlePage({
  params,
}: { params: Promise<PageParams> }) {
  const { slug } = await params;
  const a = findArticle(slug);
  if (!a) notFound();

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: a.title,
    description: a.dek,
    datePublished: a.publishedOn,
    author: { "@type": "Organization", name: a.author },
    publisher: { "@type": "Organization", name: "Shishya" },
    mainEntityOfPage: `https://shishya.in/insights/${slug}`,
  };

  // Other articles by overlapping tag (excluding this one)
  const related = INSIGHTS_ARTICLES.filter((x) => x.slug !== a.slug)
    .filter((x) => x.tags.some((t) => a.tags.includes(t)))
    .slice(0, 3);

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/insights" className="hover:text-ink-800">Insights</Link> · {a.tags[0]}
        </p>
        <div className="mt-2 flex flex-wrap items-baseline gap-2">
          <span className="rounded bg-saffron-100 px-2 py-0.5 text-[10px] font-medium text-saffron-800">
            {a.tags[0]}
          </span>
          <span className="text-[11px] text-ink-500">
            {a.publishedOn} · {a.readMins} min read · {a.author}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 leading-tight">{a.title}</h1>
        <p className="mt-3 text-base text-ink-700 leading-relaxed">{a.dek}</p>

        {/* Body */}
        <article className="prose prose-sm sm:prose-base mt-8 max-w-none">
          <NotesMarkdown markdown={a.body} rich />
        </article>

        {/* Sources */}
        <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-base font-semibold text-ink-900">Sources cited</h2>
          <ul className="mt-3 space-y-2 text-xs">
            {a.sources.map((s) => (
              <li key={s.url}>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-saffron-700 underline hover:text-saffron-800"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-ink-500">
            If a claim looks wrong, please flag it — the verification system
            applies to editorial content the same way as exam/college facts.
          </p>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <>
            <h2 className="mt-10 text-base font-semibold text-ink-900">Related</h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link
                    href={`/insights/${r.slug}`}
                    className="block rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                      {r.tags[0]}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-900">{r.title}</p>
                    <p className="mt-1 text-xs text-ink-600 line-clamp-2">{r.dek}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
    </main>
  );
}
