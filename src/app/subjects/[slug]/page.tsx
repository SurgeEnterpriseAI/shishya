// /subjects/{slug} — one competitive-exam subject across every exam that
// tests it (27 Sep 2026, discoverability wave 2, group "subject-hubs").
//
// Why: "reasoning questions", "quantitative aptitude", "gk questions" and
// the like had no page on Shishya; the resolver landed them on one arbitrary
// exam's topic page. A hub lists the subject's topics grouped by name, and
// for each topic links every exam's own topic page that is study-ready
// (Shishya notes, or at least 10 checked questions — the rule that keeps a
// topic page indexable for Google). No per-topic cross-exam URL exists or is
// created: the links always go to the exam-scoped pages.
//
// Rules, copy and floors: src/lib/subject-hubs.ts (pure, tested in
// tests/unit/subject-hubs.test.ts); reads: src/lib/db/subject-hubs-db.ts.
// Below the data floor a hub renders with noindex, follow; a hub with
// nothing to list is a 404. Not under /exams, so the /exams/[code] static
// sibling list is unaffected. English only: /hi and /te prefixes are not
// twins here (the middleware redirects un-twinned prefixed paths to the
// plain path). ISR hourly, rendered on first request (no build-time DB
// read); no cookie, header or session read. A failed read throws, so Next
// keeps serving the last good copy rather than caching an empty hub.

import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { Header } from "@/components/Header";
import { loadSubjectHubs } from "@/lib/db/subject-hubs-db";
import {
  SITE,
  SUBJECT_HUBS,
  fmt,
  jsonLdText,
  subjectHubContextPath,
  subjectHubDef,
  subjectHubDescription,
  subjectHubHeading,
  subjectHubIndexable,
  subjectHubJsonLd,
  subjectHubKeywords,
  subjectHubLead,
  subjectHubPath,
  subjectHubRenderable,
  subjectHubRobots,
  subjectHubTitle,
  type HubTopicLink,
} from "@/lib/subject-hubs";
import { TOPIC_GOOGLE_MIN_QUESTIONS } from "@/lib/page-gates-copy";

export const revalidate = 3600;

/** No build-time render: each hub renders on its first request and is then
 *  ISR-cached (an empty list = every slug on demand). */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

/** One read per render — generateMetadata and the page share it. */
const loadHubs = cache(async () => loadSubjectHubs());

const OG_IMAGE = `${SITE}/opengraph-image`;

type Params = { params: Promise<{ slug: string }> };

async function hubFor(slug: string) {
  const def = subjectHubDef(slug);
  if (!def) return null;
  const hub = (await loadHubs()).get(def.slug);
  return hub && subjectHubRenderable(hub.totals) ? hub : null;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const hub = await hubFor(slug);
  if (!hub) return { title: "Subject not found — Shishya", robots: { index: false, follow: true } };
  const url = `${SITE}${subjectHubPath(hub.def.slug)}`;
  const title = subjectHubTitle(hub);
  const description = subjectHubDescription(hub);
  const ogTitle = title.replace(/ \| Shishya$/, "");
  return {
    title,
    description,
    // The Markdown brief exists only above the data floor (its route 404s below).
    alternates: subjectHubIndexable(hub.totals)
      ? { canonical: url, types: { "text/markdown": `${SITE}${subjectHubContextPath(hub.def.slug)}` } }
      : { canonical: url },
    ...subjectHubRobots(hub.totals),
    keywords: subjectHubKeywords(hub),
    // A page-level openGraph block replaces the root's, so the root card is named.
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
      images: [{ url: OG_IMAGE, width: 1200, height: 630, alt: "Shishya — one smart place to study" }],
    },
    twitter: { card: "summary_large_image", title: ogTitle, description, images: [OG_IMAGE] },
  };
}

/** "(notes)" when the page has notes, else "(N Qs)" — what the link opens. */
function linkNote(l: HubTopicLink): string {
  if (l.hasNotes) return "notes";
  return l.checked === 1 ? "1 Q" : `${fmt(l.checked)} Qs`;
}

export default async function SubjectHubPage({ params }: Params) {
  const { slug } = await params;
  const hub = await hubFor(slug);
  if (!hub) notFound();
  const t = hub.totals;
  const hubs = await loadHubs();
  const others = SUBJECT_HUBS.filter((d) => {
    if (d.slug === hub.def.slug) return false;
    const h = hubs.get(d.slug);
    return !!h && subjectHubRenderable(h.totals) && subjectHubIndexable(h.totals);
  });
  const ready = hub.exams.filter((e) => e.studyReady > 0);
  const notYet = hub.exams.filter((e) => e.studyReady === 0);

  return (
    <main className="min-h-screen bg-ink-50/40">
      {subjectHubJsonLd(hub).map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(d) }} />
      ))}
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/subjects" className="hover:text-ink-800">Subjects</Link> · {hub.def.name}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">{subjectHubHeading(hub)}</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">{subjectHubLead(hub)}</p>
        {hub.def.related && hub.def.related.length > 0 && (
          <p className="mt-2 max-w-3xl text-sm text-ink-700">
            Also:{" "}
            {hub.def.related.map((r, i) => (
              <span key={r.href}>
                {i > 0 && " · "}
                <Link href={r.href} className="font-medium text-saffron-700 hover:underline">
                  {r.label}
                </Link>
              </span>
            ))}
          </p>
        )}

        <dl className="mt-5 grid max-w-3xl grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-md border border-ink-200 bg-white p-3">
            <dt className="text-xs text-ink-500">Exams listed</dt>
            <dd className="mt-0.5 text-lg font-semibold text-ink-900">{fmt(t.examsWithStudyReady)}</dd>
          </div>
          <div className="rounded-md border border-ink-200 bg-white p-3">
            <dt className="text-xs text-ink-500">Topic pages listed</dt>
            <dd className="mt-0.5 text-lg font-semibold text-ink-900">{fmt(t.studyReady)}</dd>
          </div>
          <div className="rounded-md border border-ink-200 bg-white p-3">
            <dt className="text-xs text-ink-500">With study notes</dt>
            <dd className="mt-0.5 text-lg font-semibold text-ink-900">{fmt(t.withNotes)}</dd>
          </div>
          <div className="rounded-md border border-ink-200 bg-white p-3">
            <dt className="text-xs text-ink-500">Checked questions</dt>
            <dd className="mt-0.5 text-lg font-semibold text-ink-900">{fmt(t.checked)}</dd>
          </div>
        </dl>
        <p className="mt-3 max-w-3xl text-xs text-ink-500">
          A topic page is listed when it has Shishya study notes or at least {TOPIC_GOOGLE_MIN_QUESTIONS} checked practice questions.
          &ldquo;Checked questions&rdquo; counts every checked question in these syllabus sections, on all their topics. Each link opens
          that exam&apos;s own topic page; &ldquo;notes&rdquo; means it has study notes, otherwise the number of checked questions it
          practises from is shown. Syllabus sections that mix this subject with another are not counted here; each exam&apos;s
          syllabus page lists them.
        </p>

        <section className="mt-8" aria-labelledby="hub-topics">
          <h2 id="hub-topics" className="text-xl font-bold text-ink-900">
            {hub.def.name} topics <span className="text-sm font-normal text-ink-500">({fmt(t.groups)})</span>
          </h2>
          <ul className="mt-3 divide-y divide-ink-100 rounded-lg border border-ink-200 bg-white">
            {hub.groups.map((g) => (
              <li key={g.key} className="px-4 py-3">
                <p className="text-sm font-semibold text-ink-900">
                  {g.name}{" "}
                  <span className="text-xs font-normal text-ink-500">
                    — {g.links.length === 1 ? "1 exam" : `${fmt(g.links.length)} exams`}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-6 text-ink-700">
                  {g.links.map((l, i) => (
                    <span key={l.examCode}>
                      {i > 0 && " · "}
                      <Link href={l.href} prefetch={false} className="font-medium text-saffron-700 hover:underline">
                        {l.examShort}
                      </Link>{" "}
                      <span className="text-xs text-ink-500">({linkNote(l)})</span>
                    </span>
                  ))}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-labelledby="hub-exams">
          <h2 id="hub-exams" className="text-xl font-bold text-ink-900">
            Exams with a {hub.def.lower} section{" "}
            <span className="text-sm font-normal text-ink-500">({fmt(t.exams)})</span>
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {ready.map((e) => (
              <li key={e.code} className="rounded-md border border-ink-200 bg-white p-3">
                <Link href={`/exams/${e.code}`} prefetch={false} className="text-sm font-semibold text-ink-900 hover:text-saffron-700">
                  {e.shortName}
                </Link>
                <p className="mt-0.5 text-xs text-ink-500">{e.sections.join(" · ")}</p>
                <p className="mt-1 text-xs text-ink-600">
                  {fmt(e.studyReady)} of {e.topics === 1 ? "1 topic" : `${fmt(e.topics)} topics`} listed here
                  {e.withNotes > 0 ? ` · ${fmt(e.withNotes)} with notes` : ""} · {e.checked === 1 ? "1 checked question" : `${fmt(e.checked)} checked questions`} ·{" "}
                  <Link href={e.syllabusHref} prefetch={false} className="font-medium text-saffron-700 hover:underline">
                    syllabus
                  </Link>
                </p>
              </li>
            ))}
          </ul>
          {notYet.length > 0 && (
            <div className="mt-4 rounded-md border border-ink-200 bg-white p-4">
              <p className="text-sm text-ink-700">
                These exams also have a {hub.def.lower} section, but none of its topic pages has notes or {TOPIC_GOOGLE_MIN_QUESTIONS} checked
                questions yet. Their syllabus pages list the topics:
              </p>
              <p className="mt-2 text-sm leading-6">
                {notYet.map((e, i) => (
                  <span key={e.code}>
                    {i > 0 && " · "}
                    <Link href={e.syllabusHref} prefetch={false} className="font-medium text-saffron-700 hover:underline">
                      {e.shortName}
                    </Link>
                  </span>
                ))}
              </p>
            </div>
          )}
        </section>

        <nav aria-label="Other subjects" className="mt-10 rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-base font-semibold text-ink-900">Other subjects and practice</h2>
          <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {others.map((d) => (
              <li key={d.slug}>
                <Link href={subjectHubPath(d.slug)} className="font-medium text-saffron-700 hover:underline">
                  {d.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/current-affairs" className="font-medium text-saffron-700 hover:underline">
                Current affairs
              </Link>
            </li>
            <li>
              <Link href="/exams/browse" className="font-medium text-saffron-700 hover:underline">
                All exams
              </Link>
            </li>
          </ul>
        </nav>
      </section>
    </main>
  );
}
