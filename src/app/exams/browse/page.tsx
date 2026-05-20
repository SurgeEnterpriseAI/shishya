// /exams — public catalog of every active exam on Shishya, with
// searchable + filterable browse UI.
//
// Filter dimensions (all sync to URL params, so every combination is its
// own indexable URL):
//   ?q=<text>       — substring match on exam name / shortName / code
//   ?state=<code>   — ISO state code (TN, KA, MH, ...)
//   ?lang=<code>    — Language enum value (HI, TA, TE, KN, ML, MR, BN, GU, PA)
//   ?category=<key> — ExamCategory enum (GOVT_JOBS, BANKING, etc.)
//
// Page stays server-rendered so Google crawls every variant. Only the
// search input is a tiny client component (debounced URL update).

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";
import { STATES, stateSlug, languageName } from "@/lib/state-info";
import { ExamSearchBox } from "./ExamSearchBox";

export const revalidate = 300; // 5 min — the underlying list barely changes

export const metadata: Metadata = {
  title: "All Entrance Exams in India — Search by State, Exam, Language | Shishya",
  description:
    "Search and filter 163 entrance exams across India by state, exam name, language, or category. Free mock tests, previous year papers, study help — verified by students who cleared the same path. SSC, UPSC, IBPS, RRB, NEET, JEE, GATE, CAT, all state PSCs, all TETs, all Police exams.",
  alternates: { canonical: "https://shishya.in/exams/browse" },
  keywords: [
    "entrance exams india",
    "search entrance exams",
    "state-wise entrance exams",
    "exam by language",
    "free mock tests",
    "previous year papers",
    "exam preparation online",
    "SSC RRB NEET JEE UPSC preparation",
    "state level exams india",
    "olympiad mock tests",
    "Shishya verified prep",
    "government job exam list",
    "banking exam list",
    "teaching exam list",
  ],
  openGraph: {
    title: "Search All Entrance Exams in India — Free Mocks & Study Help",
    description: "163 entrance exams. Filter by state, language, or category. Free.",
    url: "https://shishya.in/exams/browse",
    siteName: "Shishya",
    locale: "en_IN",
    type: "website",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  GOVT_JOBS: "Government Jobs",
  BANKING: "Banking",
  CIVIL_SERVICES: "Civil Services",
  MEDICAL: "Medical Entrance",
  ENGINEERING: "Engineering Entrance",
  TEACHING: "Teaching",
  UNIVERSITY: "University Entrance",
  MBA: "MBA Entrance",
  LAW: "Law Entrance",
  DEFENCE: "Defence",
  OLYMPIAD: "Olympiads",
  STATE_LEVEL: "State-Level Exams",
  OTHER: "Other",
};

// The set of categories we let users filter by, in display order.
const FILTER_CATEGORIES = [
  "GOVT_JOBS",
  "CIVIL_SERVICES",
  "BANKING",
  "STATE_LEVEL",
  "TEACHING",
  "ENGINEERING",
  "MEDICAL",
  "UNIVERSITY",
  "MBA",
  "LAW",
  "DEFENCE",
  "OLYMPIAD",
] as const;

const FILTER_LANGS = ["HI", "TA", "TE", "KN", "ML", "MR", "BN", "GU", "PA"] as const;

interface SP {
  q?: string;
  state?: string;
  lang?: string;
  category?: string;
}

export default async function ExamsCatalogPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";
  const state = sp.state?.trim().toUpperCase();
  const lang = sp.lang?.trim().toUpperCase();
  const category = sp.category?.trim().toUpperCase();

  // Build Prisma where clause from the URL params. ANDed together, so
  // /exams?state=TN&lang=TA narrows to "Tamil Nadu exams offered in Tamil".
  // SCHOOL_BOARD entries belong to /schooling, not the entrance-exam browse.
  const where: Prisma.ExamWhereInput = { active: true, category: { not: "SCHOOL_BOARD" } };
  if (q) {
    where.OR = [
      { shortName: { contains: q, mode: "insensitive" } },
      { name: { contains: q, mode: "insensitive" } },
      { code: { contains: q.toUpperCase().replace(/[\s-]+/g, "_") } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (state && state in STATES) where.state = state;
  if (lang && (FILTER_LANGS as readonly string[]).includes(lang)) {
    where.languages = { has: lang as any };
  }
  if (category && (FILTER_CATEGORIES as readonly string[]).includes(category)) {
    where.category = category as any;
  }

  const exams = await prisma.exam.findMany({
    where,
    select: {
      code: true,
      name: true,
      shortName: true,
      category: true,
      state: true,
      languages: true,
      description: true,
      candidatesPerYear: true,
      _count: {
        select: {
          questions: { where: { validated: true } },
          mocks: { where: { userId: null } },
        },
      },
    },
    orderBy: [{ candidatesPerYear: "desc" }, { code: "asc" }],
  });

  // Counts per facet — drives the "number of exams" pill beside each
  // filter chip. Computed off the SAME `where` (minus the facet we're
  // counting) so the counts feel correct as filters compose.
  const totalActive = await prisma.exam.count({ where: { active: true, category: { not: "SCHOOL_BOARD" } } });

  // Facet counts: state, category, lang (each computed without their own
  // current filter applied so a chip's count reflects what the user would
  // see if they ADDED that filter to the current selection).
  const stateCounts = await prisma.exam.groupBy({
    by: ["state"],
    where: {
      active: true,
      state: { not: null },
      ...(q ? { OR: where.OR } : {}),
      ...(lang && (FILTER_LANGS as readonly string[]).includes(lang) ? { languages: { has: lang as any } } : {}),
      ...(category && (FILTER_CATEGORIES as readonly string[]).includes(category) ? { category: category as any } : {}),
    },
    _count: { _all: true },
  });
  const stateCountMap = Object.fromEntries(
    stateCounts.map((s) => [s.state, s._count._all]),
  ) as Record<string, number>;

  const categoryCounts = await prisma.exam.groupBy({
    by: ["category"],
    where: {
      active: true,
      ...(q ? { OR: where.OR } : {}),
      ...(state && state in STATES ? { state } : {}),
      ...(lang && (FILTER_LANGS as readonly string[]).includes(lang) ? { languages: { has: lang as any } } : {}),
    },
    _count: { _all: true },
  });
  const categoryCountMap = Object.fromEntries(
    categoryCounts.map((c) => [c.category, c._count._all]),
  ) as Record<string, number>;

  // For lang facet we count by iterating languages on each exam (Prisma
  // can't groupBy array columns), so we do it client-side from the full
  // filtered set ignoring the current lang filter.
  const langFilterBase = await prisma.exam.findMany({
    where: {
      active: true,
      ...(q ? { OR: where.OR } : {}),
      ...(state && state in STATES ? { state } : {}),
      ...(category && (FILTER_CATEGORIES as readonly string[]).includes(category) ? { category: category as any } : {}),
    },
    select: { languages: true },
  });
  const langCountMap: Record<string, number> = {};
  for (const e of langFilterBase) {
    for (const l of e.languages) {
      langCountMap[l] = (langCountMap[l] ?? 0) + 1;
    }
  }

  // Build chip-href helpers — preserves all OTHER filters when toggling
  // one. Keeps the user's compounded narrowing intact.
  function chipHref(patch: Partial<SP>) {
    const next = new URLSearchParams();
    const merged: SP = { ...{ q: q || undefined, state, lang, category }, ...patch };
    if (merged.q) next.set("q", merged.q);
    if (merged.state) next.set("state", merged.state);
    if (merged.lang) next.set("lang", merged.lang);
    if (merged.category) next.set("category", merged.category);
    const qs = next.toString();
    return qs ? `/exams/browse?${qs}` : "/exams/browse";
  }

  // Group results by category for display structure.
  const grouped = new Map<string, typeof exams>();
  for (const e of exams) {
    const key = e.category ?? "OTHER";
    const list = grouped.get(key) ?? [];
    list.push(e);
    grouped.set(key, list);
  }
  const sections = [...grouped.entries()].sort((a, b) => b[1].length - a[1].length);

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Entrance Exams on Shishya",
    numberOfItems: exams.length,
    itemListElement: exams.slice(0, 50).map((e, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: e.shortName,
      url: `https://shishya.in/exams/${e.code}`,
    })),
  };

  const hasAnyFilter = q || state || lang || category;
  const sortedStateChips = Object.keys(STATES)
    .filter((c) => (stateCountMap[c] ?? 0) > 0)
    .sort((a, b) => (stateCountMap[b] ?? 0) - (stateCountMap[a] ?? 0));

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/exams" className="hover:text-ink-800">Exams</Link> · Browse
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          Search entrance exams in India
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          {totalActive} entrance exams. Filter by state, exam name, language or
          category. Every exam is free with adaptive mock tests, previous year
          papers and Ask Shishya for study help when you need it.
        </p>

        {/* Search box */}
        <div className="mt-6">
          <ExamSearchBox placeholder="Search by exam name (TNPSC, UPSC, JEE...)" />
        </div>

        {/* Category filter */}
        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By category</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link
              href={chipHref({ category: undefined })}
              className={chipClass(!category)}
            >
              All categories
            </Link>
            {FILTER_CATEGORIES.map((c) => {
              const n = categoryCountMap[c] ?? 0;
              if (n === 0) return null;
              return (
                <Link
                  key={c}
                  href={chipHref({ category: c.toLowerCase() === category?.toLowerCase() ? undefined : c })}
                  className={chipClass(category === c)}
                >
                  {CATEGORY_LABELS[c]} <span className="ml-1 text-[10px] opacity-70">{n}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Language filter */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By language</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={chipHref({ lang: undefined })} className={chipClass(!lang)}>
              All languages
            </Link>
            {FILTER_LANGS.map((l) => {
              const n = langCountMap[l] ?? 0;
              if (n === 0) return null;
              const ln = languageName(l);
              return (
                <Link
                  key={l}
                  href={chipHref({ lang: lang === l ? undefined : l })}
                  className={chipClass(lang === l)}
                >
                  {ln.en} <span className="ml-1 text-[10px] opacity-70">{ln.native}</span>
                  <span className="ml-1 text-[10px] opacity-70">{n}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* State filter */}
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">By state</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Link href={chipHref({ state: undefined })} className={chipClass(!state)}>
              All India
            </Link>
            {sortedStateChips.map((c) => (
              <Link
                key={c}
                href={chipHref({ state: state === c ? undefined : c })}
                className={chipClass(state === c)}
                title={STATES[c]?.nativeName}
              >
                {STATES[c]?.name} <span className="ml-1 text-[10px] opacity-70">{stateCountMap[c]}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Active-filter summary + clear */}
        {hasAnyFilter ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 rounded-md bg-saffron-50/60 border border-saffron-200 px-3 py-2 text-xs text-ink-700">
            <span className="font-medium">{exams.length} match</span>
            {q && <span className="rounded bg-white px-2 py-0.5">name: "{q}"</span>}
            {state && <span className="rounded bg-white px-2 py-0.5">state: {STATES[state]?.name ?? state}</span>}
            {lang && <span className="rounded bg-white px-2 py-0.5">language: {languageName(lang).en}</span>}
            {category && <span className="rounded bg-white px-2 py-0.5">category: {CATEGORY_LABELS[category]}</span>}
            <Link href="/exams/browse" className="ml-auto text-saffron-700 underline hover:text-saffron-800">
              clear all
            </Link>
          </div>
        ) : null}

        {/* Results */}
        {exams.length === 0 ? (
          <div className="mt-10 rounded-lg border border-dashed border-ink-300 bg-white p-8 text-center">
            <p className="text-sm text-ink-700">
              No exams match these filters. Try removing one, or{" "}
              <Link href="/exams/browse" className="text-saffron-700 underline">clear all</Link>.
            </p>
          </div>
        ) : (
          sections.map(([cat, list]) => (
            <section key={cat} className="mt-10">
              <h2 className="text-base font-semibold text-ink-800">
                {CATEGORY_LABELS[cat] ?? cat}{" "}
                <span className="text-xs font-normal text-ink-500">
                  ({list.length})
                </span>
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((e) => {
                  const isLive =
                    (e._count?.questions ?? 0) > 0 ||
                    (e._count?.mocks ?? 0) > 0;
                  const st = e.state ? STATES[e.state] : null;
                  return (
                    <li key={e.code}>
                      <Link
                        href={`/exams/${e.code}`}
                        className="block rounded-md border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/30"
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-semibold text-ink-900">
                            {e.shortName}
                          </p>
                          <span
                            className={
                              isLive
                                ? "rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
                                : "rounded-full bg-ink-100 px-2 py-0.5 text-[10px] font-medium text-ink-600"
                            }
                          >
                            {isLive ? "Live" : "Coming"}
                          </span>
                        </div>
                        <p className="mt-0.5 text-xs text-ink-500 line-clamp-1">
                          {e.name}
                          {st && <span className="text-ink-400"> · {st.name}</span>}
                        </p>
                        {e.description && (
                          <p className="mt-2 text-xs text-ink-600 line-clamp-2">
                            {e.description}
                          </p>
                        )}
                        <p className="mt-2 text-[10px] text-ink-500">
                          {e.languages.map((l) => languageName(l).en).join(" · ")}
                        </p>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}

        {/* Bottom hint — encourages state-page navigation for SEO depth */}
        {!hasAnyFilter && (
          <div className="mt-12 rounded-lg border border-ink-200 bg-white p-5 text-sm text-ink-700">
            <h3 className="text-base font-semibold text-ink-900">Browse by state</h3>
            <p className="mt-1 text-xs text-ink-600">
              Jump straight to a state's full exam list:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.keys(STATES)
                .filter((c) => (stateCountMap[c] ?? 0) > 0)
                .sort((a, b) => (stateCountMap[b] ?? 0) - (stateCountMap[a] ?? 0))
                .map((c) => (
                  <Link
                    key={c}
                    href={`/exams/state/${stateSlug(c)}`}
                    className="rounded-md border border-ink-200 bg-white px-3 py-1.5 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
                  >
                    {STATES[c].name}{" "}
                    <span className="text-[10px] text-ink-500">{stateCountMap[c]}</span>
                  </Link>
                ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function chipClass(active: boolean): string {
  return active
    ? "inline-flex items-center rounded-full bg-saffron-500 px-3 py-1 text-xs font-medium text-white shadow-sm"
    : "inline-flex items-center rounded-full border border-ink-200 bg-white px-3 py-1 text-xs text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30";
}
