// /insights/[slug] — per-article page.
//
// Lightweight markdown-lite renderer (paragraphs + headings + bullet
// lists + bold/italic inline) — keeps us off a heavyweight MD lib for
// what's currently a handful of articles.

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
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
        <article className="prose-article mt-8">
          <Markdown text={a.body} />
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

// ── Minimal markdown-lite renderer ─────────────────────────────────────
function Markdown({ text }: { text: string }) {
  const blocks = text
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4 text-sm text-ink-800 leading-relaxed">
      {blocks.map((b, i) => {
        if (b.startsWith("## ")) {
          return (
            <h2 key={i} className="mt-6 text-lg font-semibold text-ink-900">
              {b.replace(/^## /, "")}
            </h2>
          );
        }
        if (b.startsWith("### ")) {
          return (
            <h3 key={i} className="mt-4 text-base font-semibold text-ink-900">
              {b.replace(/^### /, "")}
            </h3>
          );
        }
        // Ordered list (line-prefixed with "1. " etc.)
        if (/^\d+\.\s/.test(b.split("\n")[0])) {
          const items = b.split("\n").filter((l) => /^\d+\.\s/.test(l)).map((l) => l.replace(/^\d+\.\s+/, ""));
          return (
            <ol key={i} className="list-decimal space-y-1.5 pl-5">
              {items.map((it, j) => <li key={j}><InlineMd text={it} /></li>)}
            </ol>
          );
        }
        // Bullet list
        if (b.startsWith("- ")) {
          const items = b.split("\n").filter((l) => l.startsWith("- ")).map((l) => l.replace(/^- /, ""));
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5">
              {items.map((it, j) => <li key={j}><InlineMd text={it} /></li>)}
            </ul>
          );
        }
        // Paragraph
        return <p key={i}><InlineMd text={b.replace(/\n/g, " ")} /></p>;
      })}
    </div>
  );
}

function InlineMd({ text }: { text: string }) {
  // Bold (**...**) → <strong>; italic (*...*) → <em>; backticks (`...`) → <code>
  const parts: Array<{ kind: "text" | "bold" | "italic" | "code"; value: string }> = [];
  let i = 0;
  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end === -1) { parts.push({ kind: "text", value: text.slice(i) }); break; }
      parts.push({ kind: "bold", value: text.slice(i + 2, end) });
      i = end + 2;
    } else if (text[i] === "*") {
      const end = text.indexOf("*", i + 1);
      if (end === -1) { parts.push({ kind: "text", value: text.slice(i) }); break; }
      parts.push({ kind: "italic", value: text.slice(i + 1, end) });
      i = end + 1;
    } else if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end === -1) { parts.push({ kind: "text", value: text.slice(i) }); break; }
      parts.push({ kind: "code", value: text.slice(i + 1, end) });
      i = end + 1;
    } else {
      const nextSpecial = text.slice(i).search(/(\*\*|\*|`)/);
      if (nextSpecial === -1) { parts.push({ kind: "text", value: text.slice(i) }); break; }
      parts.push({ kind: "text", value: text.slice(i, i + nextSpecial) });
      i += nextSpecial;
    }
  }
  return (
    <>
      {parts.map((p, idx) => {
        if (p.kind === "bold") return <strong key={idx} className="font-semibold text-ink-900">{p.value}</strong>;
        if (p.kind === "italic") return <em key={idx}>{p.value}</em>;
        if (p.kind === "code") return <code key={idx} className="rounded bg-ink-100 px-1 text-[12px]">{p.value}</code>;
        return <span key={idx}>{p.value}</span>;
      })}
    </>
  );
}
