// /schooling/cbse/class-10/board-exam and /schooling/cbse/class-12/board-exam
// (26 Sep 2026, G4 honest page families).
//
// One page per CBSE board class with CBSE's OWN links for the 2026-27
// session: every sample question paper and marking scheme CBSE has
// published (each PDF answered HTTP 200 the day it was checked), the
// 2026-27 curriculum, CBSE's previous-years page, the result portals, the
// notices that concern the exam and the date-sheet status — "not announced"
// until CBSE publishes it (src/data/board-exams.ts). Links only: no PDF is
// copied, summarised or re-hosted, and no textbook text appears here.
// Shishya's own part is listed separately and computed from the live school
// rows: the chapters that have Shishya's notes AND checked practice.
//
// Any other board or class is a 404 (dynamicParams = false); CISCE is not
// built. The static segment "board-exam" beside [subject] never shadows a
// subject — no subject slug is "board-exam" (pinned in
// tests/unit/board-exams.test.ts). Indexable only with at least
// BOARD_EXAM_MIN_LINKS verified official links (src/lib/board-exams.ts).
// ISR every 10 minutes, as the other school pages (the chapter list moves).

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { SHISHYA_ORG_REF } from "@/components/JsonLd";
import { OfficialLink, SchoolCrumbs } from "@/components/school/SchoolBits";
import { findBoardExamHub, type BoardExamHub, type SamplePaper } from "@/data/board-exams";
import { boardExamDescription, boardExamLastChecked, boardExamLead, boardExamPath, boardExamTitle, isBoardExamIndexable, splitSamplePapers } from "@/lib/board-exams";
import { SCHOOL_SITE } from "@/lib/school/copy";
import { getLiveSchoolClass } from "@/lib/school/db";
import { hasSchoolGuestQuiz } from "@/lib/school/scope";
import { parseSchoolClassSlug, schoolChapterPath, schoolClassPath, schoolSubjectPath, type SchoolSurfaceClass } from "@/lib/school/surface";
import { SCHOOLING_ROBOTS, schoolRobots } from "@/lib/schooling-data";

// 10 minutes = SCHOOL_REVALIDATE (src/lib/school/scope.ts; Next needs the literal).
export const revalidate = 600;
export const dynamicParams = false;

interface PageParams { slug: string; classSlug: string }

export function generateStaticParams() {
  return [
    { slug: "cbse", classSlug: "class-10" },
    { slug: "cbse", classSlug: "class-12" },
  ];
}

function resolve(p: PageParams): BoardExamHub | null {
  const cls = parseSchoolClassSlug(p.classSlug);
  if (cls === null) return null;
  return findBoardExamHub(p.slug, cls) ?? null;
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const hub = resolve(await params);
  if (!hub) return { title: "Not found — Shishya", robots: SCHOOLING_ROBOTS };
  const title = boardExamTitle(hub);
  const description = boardExamDescription(hub);
  const url = `${SCHOOL_SITE}${boardExamPath(hub)}`;
  return {
    title: `${title} | Shishya`,
    description,
    alternates: { canonical: url },
    robots: schoolRobots(isBoardExamIndexable(hub)),
    openGraph: { title, description, url, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

interface ReadyChapter {
  href: string;
  subject: string;
  chapter: string;
}

/** Chapters of the live class with Shishya's notes AND checked practice. */
function readyChapters(live: SchoolSurfaceClass): ReadyChapter[] {
  const out: ReadyChapter[] = [];
  for (const s of live.subjects) {
    for (const ch of s.chapters) {
      if (ch.hasNotes && hasSchoolGuestQuiz(ch)) {
        out.push({ href: schoolChapterPath(live.boardSlug, live.cls, s.slug, ch.slug), subject: s.name, chapter: ch.name });
      }
    }
  }
  return out;
}

export default async function BoardExamPage({ params }: { params: Promise<PageParams> }) {
  const hub = resolve(await params);
  if (!hub) notFound();
  const url = `${SCHOOL_SITE}${boardExamPath(hub)}`;
  const classPath = schoolClassPath(hub.board, hub.cls);
  // The live class is read for Shishya's own chapters only. A failed read
  // leaves that one section out rather than claiming "none".
  const live = await getLiveSchoolClass(hub.board, hub.cls).catch(() => null);
  const ready = live ? readyChapters(live) : null;
  const { main, other } = splitSamplePapers(hub);
  const years = hub.previousPapers.years;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      name: boardExamTitle(hub),
      description: boardExamLead(hub),
      url,
      inLanguage: "en-IN",
      isAccessibleForFree: true,
      educationalLevel: `Class ${hub.cls}`,
      dateModified: boardExamLastChecked(hub),
      about: { "@type": "Organization", name: "Central Board of Secondary Education", url: "https://www.cbse.gov.in/" },
      isPartOf: { "@type": "WebSite", name: "Shishya", url: SCHOOL_SITE },
      publisher: SHISHYA_ORG_REF,
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: SCHOOL_SITE },
        { "@type": "ListItem", position: 2, name: "Schooling", item: `${SCHOOL_SITE}/schooling` },
        { "@type": "ListItem", position: 3, name: "CBSE", item: `${SCHOOL_SITE}/schooling/cbse` },
        { "@type": "ListItem", position: 4, name: `Class ${hub.cls}`, item: `${SCHOOL_SITE}${classPath}` },
        { "@type": "ListItem", position: 5, name: "Board exam", item: url },
      ],
    },
  ];
  const ld = (d: object) => JSON.stringify(d).replace(/</g, "\\u003c");

  return (
    <main className="min-h-screen bg-saffron-50/30">
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: ld(d) }} />
      ))}
      <Header />
      <section className="container-prose py-10">
        <SchoolCrumbs
          crumbs={[
            { label: "Home", href: "/" },
            { label: "Schooling", href: "/schooling" },
            { label: "CBSE", href: "/schooling/cbse" },
            { label: `Class ${hub.cls}`, href: classPath },
            { label: "Board exam" },
          ]}
        />
        <h1 className="mt-1 text-3xl font-bold text-ink-900">
          CBSE Class {hub.cls} Board Exam {hub.examYear}
        </h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">{boardExamLead(hub)}</p>
        <p className="mt-2 max-w-3xl text-xs text-ink-500">
          Every link below opens CBSE&apos;s own site or DigiLocker. Shishya keeps no copy of any paper.
        </p>

        <h2 className="mt-8 text-xl font-bold text-ink-900">Sample question papers and marking schemes {hub.session}</h2>
        <p className="mt-1 text-xs text-ink-500">
          From{" "}
          <a href={hub.samplePapers.page.url} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
            {hub.samplePapers.page.label} ↗
          </a>
        </p>
        {main.length > 0 && <PaperTable caption="Main subjects" papers={main} />}
        {other.length > 0 && <PaperTable caption="Languages and other subjects" papers={other} />}

        <h2 className="mt-10 text-xl font-bold text-ink-900">Date sheet {hub.examYear}</h2>
        {hub.dateSheet.tier === "official" ? (
          <p className="mt-2 text-sm text-ink-700">
            <OfficialLink href={hub.dateSheet.url} primary>
              {hub.dateSheet.label} ↗
            </OfficialLink>
          </p>
        ) : (
          <p className="mt-2 max-w-3xl text-sm text-ink-700">
            Not announced yet. CBSE publishes the date sheet on{" "}
            <a href={hub.dateSheet.checkedUrl} target="_blank" rel="noopener noreferrer" className="text-saffron-700 underline">
              cbse.gov.in ↗
            </a>
            ; it showed none for {hub.examYear} when checked on {hub.dateSheet.checkedOn}.
          </p>
        )}

        <h2 className="mt-10 text-xl font-bold text-ink-900">Curriculum {hub.session}</h2>
        <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          {[hub.curriculum.page, ...hub.curriculum.documents].map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-saffron-700 hover:underline">
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl font-bold text-ink-900">Past question papers</h2>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          CBSE&apos;s own page has the Class {hub.cls} main-examination papers for {years.join(", ")}, subject by subject. {hub.previousPapers.note}
        </p>
        <div className="mt-3">
          <OfficialLink href={hub.previousPapers.page.url}>{hub.previousPapers.page.label} ↗</OfficialLink>
        </div>

        <h2 className="mt-10 text-xl font-bold text-ink-900">Results</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {hub.results.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-saffron-700 hover:underline">
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>

        <h2 className="mt-10 text-xl font-bold text-ink-900">CBSE notices for this session</h2>
        <ul className="mt-3 space-y-1.5 text-sm">
          {hub.notices.map((l) => (
            <li key={l.url}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-saffron-700 hover:underline">
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>

        {ready && (
          <section className="mt-10 rounded-lg border border-ink-200 bg-white p-5" aria-labelledby="board-ours">
            <h2 id="board-ours" className="text-base font-semibold text-ink-900">
              On Shishya: Class {hub.cls} chapters with our notes and checked practice
            </h2>
            {ready.length > 0 ? (
              <ul className="mt-3 space-y-1.5 text-sm">
                {ready.map((c) => (
                  <li key={c.href}>
                    <Link href={c.href} className="text-saffron-700 hover:underline">
                      {c.subject}: {c.chapter}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-ink-700">
                No Class {hub.cls} chapter has Shishya&apos;s notes and checked practice yet. Each chapter on the{" "}
                <Link href={classPath} className="text-saffron-700 underline">
                  Class {hub.cls} page
                </Link>{" "}
                links its official NCERT PDF.
              </p>
            )}
            {live && live.subjects.length > 0 && (
              <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                {live.subjects.map((s) => (
                  <Link key={s.slug} href={schoolSubjectPath(hub.board, hub.cls, s.slug)} className="text-saffron-700 hover:underline">
                    {s.name}
                  </Link>
                ))}
              </p>
            )}
          </section>
        )}

        <p className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm">
          <Link href={classPath} className="font-medium text-saffron-700 hover:underline">
            CBSE Class {hub.cls} subjects and NCERT books →
          </Link>
          {hub.cls === 10 ? (
            <Link href="/schooling/streams" className="font-medium text-saffron-700 hover:underline">
              Choosing a Class 11 stream →
            </Link>
          ) : (
            <Link href="/exams/entrance" className="font-medium text-saffron-700 hover:underline">
              Entrance exams after Class 12 →
            </Link>
          )}
          <Link href={`/scholarships/for/class-${hub.cls === 10 ? "9-10" : "11-12"}`} className="font-medium text-saffron-700 hover:underline">
            Scholarships for Class {hub.cls === 10 ? "9 and 10" : "11 and 12"} students →
          </Link>
        </p>
      </section>
    </main>
  );
}

function PaperTable({ caption, papers }: { caption: string; papers: readonly SamplePaper[] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-ink-200 bg-white">
      <table className="w-full min-w-[520px] text-left text-sm">
        <caption className="px-3 pt-3 text-left text-sm font-semibold text-ink-900">
          {caption} ({papers.length})
        </caption>
        <thead className="text-[11px] uppercase tracking-wider text-ink-500">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Subject</th>
            <th scope="col" className="px-3 py-2 font-semibold">Sample paper</th>
            <th scope="col" className="px-3 py-2 font-semibold">Marking scheme</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100">
          {papers.map((p) => (
            <tr key={p.subject}>
              <td className="px-3 py-2 text-ink-900">{p.subject}</td>
              <td className="px-3 py-2">
                <a href={p.sqp} target="_blank" rel="noopener noreferrer" className="text-saffron-700 hover:underline">
                  PDF ↗
                </a>
              </td>
              <td className="px-3 py-2">
                <a href={p.ms} target="_blank" rel="noopener noreferrer" className="text-saffron-700 hover:underline">
                  PDF ↗
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
