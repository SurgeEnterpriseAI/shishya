// /schooling — Schooling section landing.
//
// Phase 3 first cut: ~20 major boards (national + state + international)
// each with its own indexable per-board page. Replaces the Phase 1
// "coming soon" skeleton with real content that already provides value
// (official syllabus links + sample paper links + class-level filters).

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { BOARDS, type BoardType } from "@/lib/schooling-data";
import { stateInfo } from "@/lib/state-info";

export const revalidate = 86_400;

export const metadata: Metadata = {
  title: "Schooling — CBSE, ICSE, state boards Class 1–12 syllabus & sample papers | Shishya",
  description:
    "Indian school boards in one place — CBSE, ICSE, NIOS, IB, Cambridge, plus every major state board (Maharashtra SSC/HSC, UP Board, Tamil Nadu, Karnataka PUC, WBBSE, AP/TS BIE, Kerala DHSE, GSEB, RBSE, MPBSE, BSEB, PSEB). Official syllabus + sample paper links, no third-party reposts.",
  alternates: { canonical: "https://shishya.in/schooling" },
  keywords: [
    "CBSE syllabus",
    "ICSE syllabus",
    "state board syllabus",
    "UP Board",
    "Maharashtra HSC",
    "Tamil Nadu state board",
    "Karnataka PUC",
    "NIOS",
    "IB India",
    "Cambridge IGCSE India",
    "class 10 sample papers",
    "class 12 sample papers",
    "board exam preparation",
  ],
  openGraph: {
    title: "Schooling on Shishya — Class 1 to 12, every board",
    description: "CBSE, ICSE, state boards, IB, Cambridge. Official sources only.",
    url: "https://shishya.in/schooling",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

interface SP {
  type?: BoardType;
  state?: string;
  class?: string;
}

const TYPE_LABELS: Record<BoardType, string> = {
  "national-public":  "National (Govt)",
  "national-private": "National (Private)",
  "state":            "State board",
  "international":    "International",
};

export default async function SchoolingLanding({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const type = sp.type;
  const state = sp.state?.toUpperCase();
  const klass = sp.class ? parseInt(sp.class, 10) : undefined;

  const filtered = BOARDS.filter((b) => {
    if (type && b.type !== type) return false;
    if (state && b.state && b.state !== state) return false;
    // If state filter is active, ALSO show national boards (they cover all states).
    if (klass !== undefined && !b.classes.includes(klass)) return false;
    return true;
  });

  function chipHref(patch: Partial<SP>) {
    const next = new URLSearchParams();
    const merged: SP = { type, state, class: klass ? String(klass) : undefined, ...patch };
    if (merged.type) next.set("type", merged.type);
    if (merged.state) next.set("state", merged.state);
    if (merged.class) next.set("class", merged.class);
    const qs = next.toString();
    return qs ? `/schooling?${qs}` : "/schooling";
  }

  // Counts for chips.
  const typeCounts: Record<string, number> = {};
  for (const b of BOARDS) typeCounts[b.type] = (typeCounts[b.type] ?? 0) + 1;
  const statesWithStateBoard = Array.from(new Set(BOARDS.filter((b) => b.state).map((b) => b.state!)));

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Indian school boards on Shishya",
    numberOfItems: filtered.length,
    itemListElement: filtered.map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `https://shishya.in/schooling/${b.slug}`,
      name: b.shortName,
    })),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Schooling", item: "https://shishya.in/schooling" },
    ],
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Schooling
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          Every class, every board, in your language
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">
          Syllabi, chapters, practice, and study help — verified against
          official board sources. For students and parents. {BOARDS.length}{" "}
          school boards covered — national (CBSE, ICSE, NIOS), major state
          boards from Maharashtra to Tamil Nadu, plus international (IB,
          Cambridge). Every entry links to the board&apos;s own syllabus and
          sample-paper pages — current version, straight from the board.
        </p>

        {/* Stream selection CTA — the most consequential Class 10 decision */}
        <div className="mt-6 rounded-lg border border-saffron-300 bg-saffron-50/50 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-2xl">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">
                Class 10 student? Read this first
              </p>
              <h2 className="mt-1 text-lg font-semibold text-ink-900">
                Stream Selection — Science vs Commerce vs Humanities
              </h2>
              <p className="mt-1 text-xs text-ink-700">
                The single most consequential decision in your school years.
                Honest guide to what each stream opens + closes, who should
                pick it, and the myths to ignore.
              </p>
            </div>
            <Link
              href="/schooling/streams"
              className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600"
            >
              Stream selection guide →
            </Link>
          </div>
        </div>

        {/* Type filter */}
        <div className="mt-6">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By board type</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={chipHref({ type: undefined })} className={chipClass(!type)}>All types</Link>
            {(Object.keys(TYPE_LABELS) as BoardType[]).map((t) => {
              const n = typeCounts[t] ?? 0;
              if (n === 0) return null;
              return (
                <Link
                  key={t}
                  href={chipHref({ type: type === t ? undefined : t })}
                  className={chipClass(type === t)}
                >
                  {TYPE_LABELS[t]} <span className="ml-1 text-[10px] opacity-70">{n}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Class filter */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By class</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={chipHref({ class: undefined })} className={chipClass(!klass)}>All classes</Link>
            {[10, 12, 11, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((c) => (
              <Link
                key={c}
                href={chipHref({ class: klass === c ? undefined : String(c) })}
                className={chipClass(klass === c)}
              >
                Class {c}
              </Link>
            ))}
          </div>
        </div>

        {/* State filter — state boards only */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By state (state-board coverage)</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={chipHref({ state: undefined })} className={chipClass(!state)}>All India</Link>
            {statesWithStateBoard.map((c) => (
              <Link
                key={c}
                href={chipHref({ state: state === c ? undefined : c })}
                className={chipClass(state === c)}
                title={stateInfo(c)?.nativeName}
              >
                {stateInfo(c)?.name ?? c}
              </Link>
            ))}
          </div>
        </div>

        {/* Result list */}
        {filtered.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-8 text-center">
            <p className="text-sm text-ink-700">
              No boards match these filters. <Link href="/schooling" className="text-saffron-700 underline">Clear all</Link>.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {filtered.map((b) => (
              <li key={b.slug}>
                <Link
                  href={`/schooling/${b.slug}`}
                  className="block rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-semibold text-ink-900">{b.shortName}</h2>
                    <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600">
                      {TYPE_LABELS[b.type]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-500 line-clamp-1">{b.name}</p>
                  {b.state && (
                    <p className="mt-1 text-[11px] text-ink-500">
                      {stateInfo(b.state)?.name ?? b.state} · Classes {b.classes[0]}–{b.classes[b.classes.length - 1]}
                    </p>
                  )}
                  <p className="mt-2 text-xs text-ink-700 line-clamp-2">{b.blurb}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* Phase-3 roadmap */}
        <div className="mt-12 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
          <h3 className="text-base font-semibold text-ink-900">What's still coming</h3>
          <p className="mt-2">
            Per board × class × subject pages with chapter-wise concept
            summaries, key formulas, practice questions and mastery quizzes.
            Board exam preparation hubs (Class 10 / Class 12) with sample
            papers, blueprint, last 10 years' papers and a study planner
            tied to your real exam date. School-level scholarships hub.
            Olympiad guidance (NSO, IMO, IJSO).
          </p>
          <p className="mt-2 text-[11px] text-ink-500">
            Phase 3 of the roadmap. The boards above are live now with
            official syllabus + sample paper links. Cross-link to{" "}
            <Link href="/exams" className="text-saffron-700 underline">
              Entrance &amp; Government Exams
            </Link>{" "}
            once you're past Class 12.
          </p>
        </div>
      </section>
    </main>
  );
}

function chipClass(active: boolean): string {
  return active
    ? "inline-flex items-center rounded-full bg-saffron-500 px-3 py-1 text-xs font-medium text-white shadow-sm"
    : "inline-flex items-center rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30";
}
