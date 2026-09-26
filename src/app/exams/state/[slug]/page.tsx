// /exams/state/[slug] — a state's government exams on Shishya.
//
// The page to rank and be cited for "{state} government exams",
// "{state} govt exams 2026", "महाराष्ट्र सरकारी परीक्षा" and similar queries.
//
// 15 Sep 2026 (SEO/AEO wave 1): retitled from "Entrance Exams" to government
// exams, and every claim is now built from data (src/lib/state-exams.ts).
// The old copy named "PSC, TET, Police, Polytechnic, CET" for every state —
// including states with a single exam — and said every question was
// "available in" the state's languages (questions are English, readable in
// other languages inside a test). Added: exams grouped by the types that
// exist, announced upcoming dates (official / reported only), where to apply
// (the exams' own official portals), and an FAQ that matches its FAQPage
// JSON-LD. Hourly ISR — the page used to be frozen at build time.
//
// 16 Sep 2026: the body is written in en / hi / te (src/lib/state-exams-copy.ts)
// and its language is the URL's — an optional `lang` route param, never
// getT(). getT() reads cookies and headers, which would turn these
// prerendered, CDN-cached pages (X-Nextjs-Prerender: 1) into per-request
// renders for every visitor and crawler — for twins that still canonicalise
// to the English URL. This route has no `lang` param, so it renders English
// exactly as before; the Hindi and Telugu bodies switch on when a cached
// [lang] twin route passes `lang` (the /guide and /tricks pattern in
// src/lib/cache-pilot-routes.ts). Until then /hi and /te serve this page's
// English copy, as they have since 15 Sep.
//
// 26 Sep 2026 (src/lib/state-exam-sections.ts): 28 state exams are admission
// tests (KCET, MHT-CET, EAMCET, KEAM, WBJEE, POLYCETs …), so a state with one
// is titled "{State} Government and Entrance Exams" and its exams are listed
// in two groups — government recruitment exams (by type, as before) and
// admission tests (state CETs). The state's own-script name joins the meta
// description ("Karnataka (ಕರ್ನಾಟಕ)") and the JSON-LD (a State node with its
// alternate names); titles stay Latin-first. An "Also for {State} students"
// block links the state's NIRF colleges page, its school boards' pages
// (official board links only) and its scholarships — each a slug or id that
// exists in the data.
//
// 26 Sep 2026 (G4): a "By qualification" block — the state's exams grouped
// by the lowest qualification each lists (src/lib/exam-qualification.ts, the
// same helper as /exams/after/{level}), each linked to its hub, with a link
// to the all-India level page. Same URL, no state × qualification pages.
// English body only (lc === "en"): the Hindi and Telugu bodies stay as they
// are, so no English block eats a twin's localisation budget.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { STATES, stateCodeFromSlug, stateSlug, languageList, languageName } from "@/lib/state-info";
import {
  EXAM_TYPE_ORDER,
  formatDay,
  getStateDirectory,
  getStateExamCards,
  getStateUpcoming,
  stateFaq,
  statePortals,
  type ExamType,
} from "@/lib/state-exams";
import { tFor } from "@/lib/i18n-server";
import { isUrlLocale } from "@/lib/seo-locale";
import { fillState, stateCopy, stateCopyLocale, stateDisplayName, stateOtherNames, type StateCopyLocale } from "@/lib/state-exams-copy";
import { splitStateExams, stateAlsoLinks, stateJsonLd, stateNameWithNative } from "@/lib/state-exam-sections";
import { getExamListRows } from "@/lib/exam-list-rows";
import { PUBLISHED_LEVELS, levelOf } from "@/lib/exam-qualification";

export const revalidate = 3600;

const HORIZON_DAYS = 120;

export async function generateStaticParams() {
  return Object.keys(STATES).map((code) => ({ slug: stateSlug(code) }));
}

/** A language other than English the state's students read, for "readable in …".
 *  Named in English for the metadata and the English body, in its own script
 *  inside a Hindi or Telugu sentence (16 Sep 2026). */
function readableIn(languages: string[], lc: StateCopyLocale = "en"): string {
  const n = languageName(languages.find((l) => l !== "EN") ?? "HI");
  return lc === "en" ? n.en : n.native;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const code = stateCodeFromSlug(slug);
  if (!code) return { title: "State not found — Shishya" };
  const st = STATES[code];
  const year = new Date().getUTCFullYear();
  const entry = (await getStateDirectory().catch(() => [])).find((s) => s.code === code);
  const exams = entry?.exams ?? [];
  const top = exams.slice(0, 4).map((e) => e.shortName);
  const { recruitment, admission } = splitStateExams(exams);
  const kinds = admission.length > 0 ? "Government and Entrance" : "Government";

  const title = `${st.name} ${kinds} Exams ${year} — Free Mock Tests, Dates & Syllabus | Shishya`;
  const split =
    admission.length > 0
      ? ` (${recruitment.length} government recruitment ${recruitment.length === 1 ? "exam" : "exams"}, ${admission.length} admission ${admission.length === 1 ? "test" : "tests"})`
      : "";
  const description =
    `${exams.length} ${stateNameWithNative(st)} ${exams.length === 1 ? "exam" : "exams"} on Shishya${split}${top.length ? `: ${top.join(", ")}${exams.length > 4 ? " and more" : ""}` : ""}. ` +
    `Free mock tests, announced exam dates with their source, where to apply, syllabus and cutoffs — questions readable in ${readableIn(st.languages)} inside every test.`;
  const url = `https://shishya.in/exams/state/${slug}`;

  return {
    title,
    description: description.slice(0, 300),
    alternates: { canonical: url, types: { "text/markdown": `${url}/context.md` } },
    keywords: [
      `${st.name} government exams ${year}`,
      `${st.name} govt exams`,
      `${st.name} government jobs exams`,
      `${st.name} sarkari exam`,
      `${st.hindiName} सरकारी परीक्षा`,
      ...(st.nativeName !== st.name && st.nativeName !== st.hindiName ? [`${st.nativeName} exams`] : []),
      ...(admission.length > 0 ? [`${st.name} entrance exams ${year}`, `${st.name} CET`, `${st.hindiName} प्रवेश परीक्षा`] : []),
      `${st.name} exam calendar ${year}`,
      `${st.name} mock tests free`,
      ...exams.slice(0, 8).map((e) => `${e.shortName} mock test`),
    ],
    openGraph: { title, description: description.slice(0, 300), url, siteName: "Shishya", locale: "en_IN", type: "website" },
    twitter: { card: "summary_large_image", title, description: description.slice(0, 200) },
  };
}

export default async function StateExamsPage({ params }: { params: Promise<{ slug: string; lang?: string }> }) {
  const { slug, lang } = await params;
  const code = stateCodeFromSlug(slug);
  if (!code) notFound();
  const st = STATES[code];
  // 16 Sep 2026: the body's language is the URL's (see the file header) —
  // none on this route, hi / te from a [lang] twin route; anything else is
  // not a twin prefix. No cookies(), headers() or getT() here: the render
  // stays static and ISR-cached. generateMetadata above is deliberately
  // untouched: every locale canonicalises to the English URL, so the title
  // stays one stable answer per URL.
  if (lang !== undefined && !isUrlLocale(lang)) notFound();
  const lc = stateCopyLocale(lang);
  const t = tFor(lc);
  const C = stateCopy(lc);
  const stateName = stateDisplayName(st, lc);
  const entry = (await getStateDirectory().catch(() => [])).find((s) => s.code === code);
  if (!entry || entry.exams.length === 0) notFound();

  const exams = entry.exams;
  const year = new Date().getUTCFullYear();
  // Card facts (pattern, description) and the announced dates: cached hourly
  // in src/lib/state-exams.ts (16 Sep 2026), so the language copies of a
  // state share one read. The directory carries names and types.
  const details = new Map((await getStateExamCards(code).catch(() => [])).map((d) => [d.code, d]));
  const upcoming = await getStateUpcoming(code, HORIZON_DAYS).catch(() => []);
  const faq = stateFaq({ name: stateName, slug }, exams, upcoming, HORIZON_DAYS, lc);
  const portals = statePortals(exams);
  const groups = EXAM_TYPE_ORDER.map((type) => ({ type, list: exams.filter((e) => e.type === type) })).filter((g) => g.list.length > 0);
  const typeNames = groups.map((g) => g.type).filter((ty) => ty !== "Other").map((ty) => C.typeShort[ty]);
  // 26 Sep 2026: recruitment exams keep their type groups; admission tests
  // (state CETs) are their own group when the state has any.
  const { recruitment, admission } = splitStateExams(exams);
  const recruitmentGroups = EXAM_TYPE_ORDER.map((type) => ({ type, list: recruitment.filter((e) => e.type === type) })).filter(
    (g) => g.list.length > 0,
  );
  const hasAdmission = admission.length > 0;
  const kindsEn = hasAdmission ? "government and entrance exams" : "government exams";
  const alsoLinks = stateAlsoLinks(code, stateName, { colleges: C.alsoColleges, board: C.alsoBoard, scholarshipMatch: C.alsoScholarshipMatch });
  const pageUrl = `https://shishya.in/exams/state/${slug}`;
  // 26 Sep 2026 (G4): the state's exams by lowest listed qualification
  // (English body only; a failed read leaves the block out).
  const byQualification =
    lc === "en"
      ? await getExamListRows()
          .then((rows) => {
            const mine = rows.filter((e) => e.state === code);
            return PUBLISHED_LEVELS.map((level) => ({ level, list: mine.filter((e) => levelOf(e)?.slug === level.slug) })).filter((g) => g.list.length > 0);
          })
          .catch(() => [])
      : [];

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${st.name} ${kindsEn} on Shishya`,
    url: pageUrl,
    // The state with its own-script and Hindi names (26 Sep 2026).
    about: stateJsonLd(st),
    mainEntity: {
      "@type": "ItemList",
      name: `${st.name} ${kindsEn} on Shishya`,
      itemListElement: exams.map((e, i) => ({ "@type": "ListItem", position: i + 1, url: `https://shishya.in/exams/${e.code}`, name: e.shortName })),
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Exams by state", item: "https://shishya.in/exams/state" },
      { "@type": "ListItem", position: 3, name: `${st.name} ${kindsEn}`, item: pageUrl },
    ],
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  const jsonLd = (d: object) => JSON.stringify(d).replace(/</g, "\\u003c");
  const typeLabel = (ty: ExamType) => C.types[ty];
  // An exam card's paper languages: the English list as before; each language
  // in its own script on the Hindi and Telugu pages.
  const langsOf = (codes: string[]): string => {
    if (lc === "en") return languageList(codes);
    const names = codes.map((c) => languageName(c).native);
    return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} ${C.listAnd} ${names[names.length - 1]}`;
  };
  // One exam card list — the markup the type groups always used; the card
  // title is an h3 under an h2 group, an h4 under a recruitment type h3.
  const examCards = (list: typeof exams, level: 3 | 4 = 3) => {
    const Title = level === 3 ? "h3" : "h4";
    return (
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {list.map((e) => {
          const d = details.get(e.code);
          return (
            <li key={e.code}>
              <Link
                href={`/exams/${e.code}`}
                className="block rounded-lg border border-ink-200 bg-white p-4 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
              >
                <Title className="text-sm font-semibold text-ink-900">{e.shortName}</Title>
                <p className="mt-0.5 text-xs text-ink-500">{e.name}</p>
                {d?.description && <p className="mt-2 line-clamp-2 text-xs text-ink-600">{d.description}</p>}
                {d && (
                  <p className="mt-2 text-[11px] text-ink-500">
                    {fillState(C.cardMeta, {
                      n: d.totalQuestions,
                      min: d.durationMin,
                      langs: d.languages.length > 0 ? langsOf(d.languages) : C.langNotStated,
                    })}
                  </p>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <main className="min-h-screen bg-ink-50/40">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemListJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqJsonLd) }} />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">{C.home}</Link> ·{" "}
          <Link href="/exams/state" className="hover:text-ink-800">{C.examsByState}</Link> · {stateName}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          {fillState(hasAdmission ? C.h1Entrance : C.h1, { state: stateName, year })}
        </h1>
        <p className="mt-1 text-lg text-ink-600">{stateOtherNames(st, lc)}</p>

        <p className="mt-4 max-w-3xl text-sm text-ink-700">
          {fillState(C.intro, {
            n: exams.length,
            state: stateName,
            pageWord: exams.length === 1 ? C.examPageOne : C.examPageMany,
            types: typeNames.length ? ` — ${typeNames.join(", ")}` : "",
            lang: readableIn(st.languages, lc),
          })}
        </p>

        {hasAdmission ? (
          <>
            {recruitment.length > 0 && (
              <section className="mt-8" aria-labelledby="state-recruitment">
                <h2 id="state-recruitment" className="text-xl font-bold text-ink-900">
                  {C.recruitmentHeading}
                </h2>
                {recruitmentGroups.map((g) => (
                  <div key={g.type} className="mt-5">
                    <h3 className="text-lg font-semibold text-ink-900">{typeLabel(g.type)}</h3>
                    {examCards(g.list, 4)}
                  </div>
                ))}
              </section>
            )}
            <section className="mt-10" aria-labelledby="state-admission">
              <h2 id="state-admission" className="text-xl font-bold text-ink-900">
                {C.admissionHeading}
              </h2>
              {examCards(admission)}
            </section>
          </>
        ) : (
          groups.map((g) => (
            <div key={g.type} className="mt-8">
              <h2 className="text-lg font-semibold text-ink-900">{typeLabel(g.type)}</h2>
              {examCards(g.list)}
            </div>
          ))
        )}

        <div className="mt-10 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink-900">{C.upcomingHeading}</h2>
          {upcoming.length > 0 ? (
            <ul className="mt-3 divide-y divide-ink-100 text-sm">
              {upcoming.map((d, i) => (
                <li key={`${d.examCode}-${d.day}-${i}`} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
                  <span className="w-28 shrink-0 font-medium text-ink-900">{formatDay(d.day)}</span>
                  <Link href={`/exams/${d.examCode}/updates`} className="font-semibold text-saffron-700 hover:underline">
                    {d.examShort}
                  </Link>
                  <span className="text-ink-700">{d.label}</span>
                  <span className={d.tier === "official" ? "rounded bg-amber-100 px-1.5 text-[11px] text-amber-900" : "rounded bg-ink-100 px-1.5 text-[11px] text-ink-700"}>
                    {d.tier === "official" ? t("ew.tier.official") : t("ew.tier.reported")}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-600">
              {fillState(C.noneAnnounced, { state: stateName, days: HORIZON_DAYS })}
            </p>
          )}
          <p className="mt-3 text-xs text-ink-500">{C.tierLegend}</p>
        </div>

        {byQualification.length > 0 && (
          <section className="mt-6 rounded-lg border border-ink-200 bg-white p-5" aria-labelledby="state-by-qualification">
            <h2 id="state-by-qualification" className="text-lg font-semibold text-ink-900">
              {st.name} exams by qualification
            </h2>
            <p className="mt-1 text-xs text-ink-500">
              Grouped by the lowest qualification each exam lists (indicative — a post may ask for more; each exam page and its official
              notification have the rule).
            </p>
            <div className="mt-3 space-y-3 text-sm">
              {byQualification.map((g) => (
                <div key={g.level.slug}>
                  <h3 className="font-semibold text-ink-900">
                    After {g.level.after} ({g.list.length})
                  </h3>
                  <p className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                    {g.list.map((e) => (
                      <Link key={e.code} href={`/exams/${e.code}`} className="text-saffron-700 hover:underline">
                        {e.shortName}
                      </Link>
                    ))}
                    <Link href={`/exams/after/${g.level.slug}`} className="text-xs font-medium text-ink-600 hover:underline">
                      All exams after {g.level.after} in India →
                    </Link>
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {portals.length > 0 && (
          <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-ink-900">{C.applyHeading}</h2>
            <p className="mt-1 text-sm text-ink-600">{C.applyNote}</p>
            <ul className="mt-3 space-y-1 text-sm">
              {portals.map((p) => (
                <li key={p.host}>
                  <a href={p.url} rel="noopener" target="_blank" className="text-saffron-700 hover:underline">
                    {p.name}
                  </a>{" "}
                  <span className="text-xs text-ink-500">({p.host})</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-ink-900">{C.faqHeading}</h2>
          <dl className="mt-3 space-y-4 text-sm">
            {faq.map((f) => (
              <div key={f.q}>
                <dt className="font-semibold text-ink-900">{f.q}</dt>
                <dd className="mt-1 text-ink-700">{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>

        {alsoLinks.length > 0 && (
          <nav aria-labelledby="state-also" className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
            <h2 id="state-also" className="text-lg font-semibold text-ink-900">
              {fillState(C.alsoHeading, { state: stateName })}
            </h2>
            <ul className="mt-3 space-y-1.5 text-sm">
              {alsoLinks.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-saffron-700 hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}

        <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href="/exams/state" className="font-medium text-saffron-700 hover:underline">{C.allStates}</Link>
          <Link href="/exam-calendar" className="font-medium text-saffron-700 hover:underline">{C.examCalendar}</Link>
          <Link href="/find-your-exam" className="font-medium text-saffron-700 hover:underline">{C.findExam}</Link>
          <Link href="/jobs-map" className="font-medium text-saffron-700 hover:underline">{C.jobsMap}</Link>
        </p>
      </section>
    </main>
  );
}
