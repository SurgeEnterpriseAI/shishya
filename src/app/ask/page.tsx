// /ask — Search or ask Shishya (26 Sep 2026: one search for the whole
// platform; founder brief "every search takes them to the page we already
// have; if nothing is there, the AI tutor answers and recommends a page").
//
//   /ask?q=…          the server resolves the query over the site-wide index
//                     (src/lib/search): one clear page → HTTP 307 to it (the
//                     back button returns to where the search started);
//                     otherwise a noindex, follow results page — the pages we
//                     have, grouped by section — with the AI panel below it.
//   /ask?q=…&ai=1     the same results, never redirected (the strip's "Ask
//                     Shishya's AI" row).
//   /ask              the indexable landing: the search box, what you can
//                     search (each example linked straight to its page) and
//                     the FAQ.
// /hi/ask and /te/ask are the middleware twins: copy in that language, and
// results open the /hi or /te twin of pages that have one.
//
// 26 Sep 2026 (fixer — founder: distress → Tele-MANAS 14416 / Childline 1098
// and a trusted adult): a query that src/lib/ask-scope.ts reads as distress
// gets the helpline reply right here, from the server, whatever the resolver
// says — never a redirect, no study rows and no AI panel ("stop the lesson",
// as the school tutor persona does). Before this, a Class 1-7 child typing it
// saw only Class N study pages (the panel is not rendered for Class 1-7), and
// a "list" outcome needed a click to reach the helplines.
//
// This render NEVER calls a model and records no analytics row: SearchAction
// visits, llms.txt deep links, shared links and crawlers get pages, not AI.
// The AI runs only from the panel (src/app/ask/AskAnswer.tsx) — on a click, or
// automatically for a search a person just submitted (sessionStorage token).
// No loading.tsx under src/app or src/app/ask: the redirect happens before any
// byte streams, so it is a real 307.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
// 26 Sep 2026 (UI builder): the page's box is the search strip (variant
// "page") — the same real GET form to this route that AskSearchForm was, so
// it still works with no JavaScript, plus the as-you-type page list.
import { SearchStrip } from "@/components/search/SearchStrip";
import { SearchResults } from "@/components/search/SearchResults";
import { getUrlLocale } from "@/lib/i18n-server";
import { loadSearchIndex, resolveQueryServer } from "@/lib/search/index-build";
import { resolveQuery } from "@/lib/search/resolve";
import { isSafePath } from "@/lib/search/targets";
import { SECTION_ICON } from "@/lib/search/types";
import { askBaseFor, searchCopy, type SearchCopy } from "@/lib/search-copy";
import { askScopeOf, offTopicReply } from "@/lib/ask-scope";
import { ChatMarkdown } from "@/components/ChatMarkdown";
import { AskAnswer } from "./AskAnswer";

export const dynamic = "force-dynamic";

type SP = Promise<{ q?: string | string[]; ai?: string | string[] }>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const readQ = (v: string | string[] | undefined) => (first(v) ?? "").replace(/\s+/g, " ").trim().slice(0, 200);

const TITLE = "Search Shishya — exams, school chapters, colleges, scholarships and careers | Shishya";
const DESCRIPTION =
  "One search across Shishya in any language: school classes, subjects and chapters; entrance and government exams with their dates, syllabus, cutoff and previous-paper pages; colleges, scholarships and careers. A clear match opens its page. When no page fits, Shishya's AI answers from Shishya's own data.";

export async function generateMetadata({ searchParams }: { searchParams: SP }): Promise<Metadata> {
  const q = readQ((await searchParams).q);
  return {
    title: TITLE,
    description: DESCRIPTION,
    alternates: { canonical: "https://shishya.in/ask" },
    // A results page is a view of other pages: not indexed, links followed.
    ...(q ? { robots: { index: false, follow: true } } : {}),
    openGraph: { title: "Search or ask Shishya", description: DESCRIPTION, url: "https://shishya.in/ask", siteName: "Shishya", locale: "en_IN", type: "website" },
    twitter: { card: "summary_large_image", title: "Search or ask Shishya", description: DESCRIPTION },
  };
}

const FAQ = [
  {
    q: "How do I search Shishya in Hindi or Telugu?",
    a: "Type in any language or script — English, Hindi, Telugu, or romanised Hindi such as 'ssc cgl ka cutoff'. Shishya reads the class, subject, chapter, exam, state and page words (cutoff, admit card, syllabus, previous papers) and opens the matching page. On the Hindi and Telugu pages, results open in that language wherever the page has a Hindi or Telugu version.",
  },
  {
    q: "What happens when Shishya has no page for my question?",
    // 26 Sep 2026 (search fixer): school questions get route-only answers (the AI points to the class,
    // subject and chapter pages; it does not teach from the textbook) — the FAQ no longer uses a school
    // concept as its example of an AI-answered question.
    a: "If several pages fit, you get a short list to pick from. If none fits, or you ask a real question such as 'which government exams can I write after 12th', Shishya's AI answers from Shishya's own data and links the closest real pages. For school subjects it points you to the right class, subject and chapter pages instead of teaching from the textbook. For Classes 1–7, Shishya shows pages only, with no AI answers.",
  },
  {
    q: "Where do the AI answers come from?",
    a: "From Shishya's own exam, school, college, scholarship and career data first. When something is outside that data, the answer may use a web search, and that part is marked tentative. Exam dates keep the label they carry on the exam's tracker (official, reported or expected). Check the official notice before you act.",
  },
];

function jsonLd() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Search Shishya",
      applicationCategory: "EducationalApplication",
      operatingSystem: "Web",
      url: "https://shishya.in/ask",
      description: DESCRIPTION,
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      provider: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: "https://shishya.in/ask?q={search_term_string}" },
        "query-input": "required name=search_term_string",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    },
  ];
}

/** The /ask landing: each example links straight to the page it opens (or to its results when it lists). */
async function Directory({ copy, locale, askBase }: { copy: SearchCopy; locale: "en" | "hi" | "te"; askBase: string }) {
  // 26 Sep 2026 (search fixer): ONE index load for the whole directory, then
  // the pure resolver per example. The old 15 parallel resolveQueryServer
  // calls each ran the unstable_cache read on its own — on a cold entry that
  // was 15 concurrent DB read chains (≈75 Neon queries) for one landing view.
  const index = await loadSearchIndex("deep");
  const cards = copy.directory.map((d) => ({
    section: d.section,
    links: d.examples.map((ex) => {
      const r = resolveQuery(ex, index, { pageLocale: locale });
      const href = r.outcome === "direct" && r.best && isSafePath(r.best.url) ? r.best.url : `${askBase}?q=${encodeURIComponent(ex)}`;
      return { ex, href };
    }),
  }));
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-500">{copy.directoryTitle}</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.section} className="rounded-2xl border border-ink-200 bg-white p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <span aria-hidden className="text-lg">
                {SECTION_ICON[c.section]}
              </span>
              {copy.sections[c.section]}
            </p>
            <ul className="mt-2 space-y-1">
              {c.links.map((l) => (
                <li key={l.ex}>
                  <a href={l.href} className="text-sm text-saffron-700 hover:text-saffron-800 hover:underline">
                    {l.ex} →
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

export default async function AskPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const q = readQ(sp.q);
  const forceAi = first(sp.ai) === "1";
  const locale = await getUrlLocale();
  const copy = searchCopy(locale);
  const askBase = askBaseFor(locale);

  if (q && askScopeOf(q).distress) {
    // The helplines first and alone — no model call, no redirect, no study rows.
    const help = offTopicReply(locale, { question: q, distress: true });
    return (
      <main className="min-h-screen bg-paper-50">
        <Header />
        <section className="container-prose py-6 sm:py-8">
          <SearchStrip variant="page" copy={copy} askBase={askBase} initialQuery={q} />
          <section className="mt-8 rounded-2xl border border-saffron-200 bg-saffron-50/40 p-4 sm:p-5" data-ask-help>
            <h1 className="text-sm font-bold text-ink-900">{copy.answerTitle}</h1>
            <div className="mt-3 break-words rounded-xl border border-ink-200 bg-white p-4">
              <ChatMarkdown text={help.answer} />
            </div>
          </section>
        </section>
      </main>
    );
  }

  if (q) {
    const r = await resolveQueryServer(q, locale);
    // One clear page: open it. Only index paths, with one leading "/" (no open redirect).
    if (r.outcome === "direct" && !forceAi && r.best && isSafePath(r.best.url)) redirect(r.best.url);
    const best = r.hits[0] ? { url: r.hits[0].url, label: r.hits[0].label, section: r.hits[0].section, status: r.hits[0].status } : null;
    return (
      <main className="min-h-screen bg-paper-50">
        <Header />
        <section className="container-prose py-6 sm:py-8">
          <SearchStrip variant="page" copy={copy} askBase={askBase} initialQuery={q} />
          <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-saffron-700">{copy.resultsFor}</p>
          <h1 className="mt-1 break-words text-2xl font-bold text-ink-900 sm:text-3xl">“{q}”</h1>
          <SearchResults resolution={r} copy={copy} />
          {/* Class 1-7: pages only, no AI (the notice above says so; /api/ask refuses too). */}
          {/* key (26 Sep 2026, search fixer): Next keeps client state across ?q= navigations on the same route —
              without a key, /ask?q=a → /ask?q=b showed a's answer under b and never ran b. One panel per search. */}
          {r.schoolScope !== "class1to7" && (
            <AskAnswer key={`${q}|${forceAi ? 1 : 0}`} q={q} outcome={r.outcome} forceAi={forceAi} copy={copy} locale={locale} best={best} />
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper-50">
      {jsonLd().map((j, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }} />
      ))}
      <Header />
      <section className="container-prose py-8">
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{copy.hubH1}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-600">{copy.hubSub}</p>
        <div className="mt-5">
          <SearchStrip variant="page" copy={copy} askBase={askBase} />
          <p className="mt-2 text-xs text-ink-500">{copy.helper}</p>
        </div>
        <Directory copy={copy} locale={locale} askBase={askBase} />
        <section className="mt-10 max-w-3xl">
          {FAQ.map((f) => (
            <details key={f.q} className="border-b border-ink-200 py-3">
              <summary className="cursor-pointer text-sm font-semibold text-ink-900">{f.q}</summary>
              <p className="mt-2 text-sm leading-relaxed text-ink-600">{f.a}</p>
            </details>
          ))}
        </section>
      </section>
    </main>
  );
}
