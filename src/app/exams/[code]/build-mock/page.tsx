// /exams/:code/build-mock — the custom mock builder (1 Sep 2026).
//
// Straight from mined demand (/admin/demand): students literally typed
// "create a mock test for me in which (maths - number system and ratio
// & proportion), Polity(...)" and "I want topic wise mock test like,
// today india polity" into the tutor. This page is that sentence as a
// form: pick topics → pick size → pick difficulty → attempt in the
// normal player (which already translates into Hindi + the other
// supported languages on demand — count from src/lib/languages.ts).
//
// Deliberately NOT in the sitemap while the Google suppression
// recovery runs (no new mass URL families) — discovery is via the exam
// hub, results page and llms.txt.
//
// PYQ mode (15 Sep 2026): ?pyq=1 counts and draws only PYQ-pattern
// questions (source PYQ, every year) per topic — students typed "PYQ topic
// based". Same page and canonical; the mode switch shows when at least one
// topic holds 3 or more of them.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { getExamTheme } from "@/lib/exam-theme";
import { BuilderForm, type BuilderLabels } from "./BuilderForm";
import { OTHER_INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { getSeenCountByTopic } from "@/lib/seen-questions";
import { SEEN_WINDOW_DAYS } from "@/lib/question-pick";
import { getT } from "@/lib/i18n-server";
import type { StringKey } from "@/lib/i18n";

// The form's copy in the visitor's locale (13 Sep 2026): cookie / URL /
// preferredLang via getT(). Not exported — a page file may only export
// Next's own fields.
function builderLabels(t: (key: StringKey) => string): BuilderLabels {
  return {
    seenLine: t("build.seen.line"),
    seenShort: t("build.seen.short"),
    seenExhausted: t("build.seen.exhausted"),
    seenExamPage: t("build.seen.examPage"),
    topicSeenTitle: t("build.topic.seenTitle"),
    topicNewOf: t("build.topic.newOf"),
    builtRepeats: t("build.built.repeats"),
    builtStart: t("build.built.start"),
    builtChange: t("build.built.change"),
    questions: t("build.questions"),
    difficulty: t("build.difficulty"),
    diffMixed: t("build.diff.mixed"),
    diffEasy: t("build.diff.easy"),
    diffHard: t("build.diff.hard"),
    availableOne: t("build.available.one"),
    availableMany: t("build.available.many"),
    fewer: t("build.fewer"),
    pickOne: t("build.pickOne"),
    failed: t("build.failed"),
    building: t("build.building"),
    start: t("build.start"),
    signin: t("build.signin"),
    footer: t("build.footer"),
  };
}

// Per-request: the form shows the signed-in student's own "seen N of M"
// numbers per topic, which must never be cached across users. (auth()
// already made this page dynamic; saying so explicitly keeps it that
// way if the auth call ever moves.)
export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code } = await params;
  const exam = await prisma.exam.findUnique({ where: { code }, select: { shortName: true, name: true } });
  if (!exam) return { title: "Build a mock — Shishya" };
  const title = `${exam.shortName} topic-wise mock test builder — pick your topics, free | Shishya`;
  const description = `Build your own ${exam.name} mock: choose exact topics (polity, number system, anything), size and difficulty. Instant scoring, solutions, Hindi + ${OTHER_INDIAN_LANGUAGE_COUNT} languages. Free.`;
  return {
    title,
    description,
    alternates: { canonical: `https://shishya.in/exams/${code}/build-mock` },
    openGraph: { title, description, url: `https://shishya.in/exams/${code}/build-mock`, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

export default async function BuildMockPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ topics?: string; pyq?: string }>;
}) {
  const [{ code }, sp, session, tt] = await Promise.all([params, searchParams, auth().catch(() => null), getT()]);
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true, active: true, category: true, durationMin: true, totalQuestions: true },
  });
  if (!exam || !exam.active) notFound();

  const pyq = sp.pyq === "1";

  // Subjects → topics with validated-question counts, all and PYQ-pattern
  // only. Topics under 3 questions in the chosen mode are hidden — a
  // 2-question "topic mock" reads as broken.
  const allRows = await prisma.$queryRaw<
    { sname: string; sweight: number | null; tid: string; tcode: string; tname: string; n: bigint; npyq: bigint }[]
  >`
    SELECT s.name sname, s.weight sweight, t.id tid, t.code tcode, t.name tname, COUNT(q.id) n,
           COUNT(q.id) FILTER (WHERE q.source = 'PYQ') npyq
    FROM "Subject" s
    JOIN "Topic" t ON t."subjectId" = s.id
    JOIN "Question" q ON q."topicId" = t.id AND q.validated = TRUE
    WHERE s."examId" = ${exam.id}
    GROUP BY 1, 2, 3, 4, 5
    HAVING COUNT(q.id) >= 3
    ORDER BY s.weight DESC NULLS LAST, s.name, COUNT(q.id) DESC`.catch(() => []);
  const pyqAvailable = allRows.some((r) => Number(r.npyq) >= 3);
  const rows = pyq ? allRows.filter((r) => Number(r.npyq) >= 3).map((r) => ({ ...r, n: r.npyq })) : allRows;

  // Signed in: how many validated questions of each topic this student
  // has had on screen (any mock they opened on this exam) in the last
  // SEEN_WINDOW_DAYS days — one query — so the form can say "seen N of
  // M" with real numbers. Anonymous → no seen data, no seen copy. The
  // query returns null on a DB error: then seenKnown=false and the form
  // hides every seen line rather than asserting "seen 0 of M".
  const seenResult = session?.user?.id
    ? await getSeenCountByTopic(session.user.id, exam.id, undefined, { pyqOnly: pyq })
    : null;
  const seenKnown = seenResult !== null;
  const seenByTopic = seenResult ?? new Map<string, number>();

  const theme = getExamTheme(exam.category);
  const subjects = new Map<string, { name: string; topics: { id: string; code: string; name: string; n: number; seen: number }[] }>();
  for (const r of rows) {
    const s = subjects.get(r.sname) ?? { name: r.sname, topics: [] };
    const n = Number(r.n);
    s.topics.push({ id: r.tid, code: r.tcode, name: r.tname, n, seen: Math.min(n, seenByTopic.get(r.tid) ?? 0) });
    subjects.set(r.sname, s);
  }
  // PYQ mode re-ranks each subject's topics by their PYQ-pattern count.
  for (const s of subjects.values()) s.topics.sort((a, b) => b.n - a.n);
  // Preselect from ?topics=code1,code2 (results page passes the
  // student's weakest topic codes).
  const pre = (sp.topics ?? "").split(",").filter(Boolean);
  const preIds = rows.filter((r) => pre.includes(r.tcode)).map((r) => r.tid);
  // The mode switch keeps a ?topics= preselection.
  const modeHref = (pyqMode: boolean) => {
    const q = new URLSearchParams();
    if (pyqMode) q.set("pyq", "1");
    if (sp.topics) q.set("topics", sp.topics);
    const s = q.toString();
    return `/exams/${exam.code}/build-mock${s ? `?${s}` : ""}`;
  };

  // Structured data: a free educational web app scoped to this exam, plus
  // breadcrumbs. Topic names are listed so answer engines can match
  // "[exam] [topic] mock test" queries to this page.
  const pageUrl = `https://shishya.in/exams/${exam.code}/build-mock`;
  const topicNames = [...subjects.values()].flatMap((s) => s.topics.map((t) => t.name));
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${exam.shortName} topic-wise mock test builder`,
      url: pageUrl,
      applicationCategory: "EducationalApplication",
      operatingSystem: "Any",
      isAccessibleForFree: true,
      offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
      inLanguage: ["en-IN", "hi-IN", "te-IN"],
      description: `Build a custom ${exam.name} mock from any of ${topicNames.length} syllabus topics — 10, 25 or 50 questions, mixed/easy/hard, timed to the real exam, scored with solutions.`,
      about: { "@type": "Course", name: exam.name, url: `https://shishya.in/exams/${exam.code}` },
      featureList: topicNames.slice(0, 40),
      publisher: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
        { "@type": "ListItem", position: 2, name: exam.shortName, item: `https://shishya.in/exams/${exam.code}` },
        { "@type": "ListItem", position: 3, name: "Build your own mock", item: pageUrl },
      ],
    },
  ];
  const jsonLdText = (d: object) =>
    JSON.stringify(d).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026");

  return (
    <main className={`min-h-screen ${theme.pageBg}`}>
      {jsonLd.map((d, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdText(d) }} />
      ))}
      <div className={`h-1.5 w-full ${theme.ribbon}`} aria-hidden />
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href={`/exams/${exam.code}`} className="hover:text-ink-800">{exam.shortName}</Link> · Build your own mock
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
          {pyq ? `Topic-wise ${exam.shortName} PYQ-pattern practice` : `Build your own ${exam.shortName} mock`}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-700">
          Pick exactly the topics you want — today polity, tomorrow number system — choose the size and
          difficulty, and attempt it like any mock: timed, scored, full solutions, weak-topic analysis.
          Questions can be read in Hindi and {OTHER_INDIAN_LANGUAGE_COUNT} other languages inside the test.
        </p>

        {(pyqAvailable || pyq) && (
          <div className="mt-4 inline-flex rounded-lg border border-ink-200 bg-white p-0.5 text-xs font-semibold" role="group">
            {[false, true].map((mode) => (
              <Link
                key={String(mode)}
                href={modeHref(mode)}
                prefetch={false}
                aria-current={mode === pyq ? "page" : undefined}
                className={mode === pyq ? "rounded-md bg-ink-900 px-3 py-1.5 text-white" : "rounded-md px-3 py-1.5 text-ink-700 hover:bg-ink-50"}
              >
                {tt.t(mode ? "build.mode.pyq" : "build.mode.all")}
              </Link>
            ))}
          </div>
        )}
        {pyq && <p className="mt-2 max-w-3xl text-xs text-ink-600">{tt.t("build.pyq.note")}</p>}

        {subjects.size === 0 && pyq ? (
          <p className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-4 py-6 text-sm text-ink-500">
            {tt.t("build.pyq.none")}{" "}
            <Link href={modeHref(false)} className="font-medium text-saffron-700 hover:underline">
              {tt.t("build.mode.all")} →
            </Link>
          </p>
        ) : subjects.size === 0 ? (
          <p className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-4 py-6 text-sm text-ink-500">
            This exam&apos;s topic-tagged question bank is still being built — try the{" "}
            <Link href={`/exams/${exam.code}`} className="font-medium text-saffron-700 hover:underline">full mocks</Link>{" "}
            meanwhile.
          </p>
        ) : (
          <BuilderForm
            examCode={exam.code}
            pyqOnly={pyq}
            subjects={[...subjects.values()]}
            preselected={preIds}
            signedIn={!!session?.user?.id}
            seenKnown={seenKnown}
            windowDays={SEEN_WINDOW_DAYS}
            labels={builderLabels(tt.t)}
          />
        )}
      </section>
    </main>
  );
}
