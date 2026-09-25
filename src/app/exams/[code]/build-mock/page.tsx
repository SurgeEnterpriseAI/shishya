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
//
// Empty builder (16 Sep 2026): an exam with no topic holding 3 validated
// questions (the sitemap's "buildable" rule, src/lib/exam-page-gates.ts) is
// noindex, carries no WebApplication JSON-LD ("any of 0 syllabus topics"), and
// says plainly that no topic has enough questions yet. The 12 exams with no
// questions (NEET_PG, NIFT …) were indexable empty builders linked from
// llms-full.txt and context.md, whose empty state sent students to "the full
// mocks" of a bank with no questions.
//
// Honest availability (25 Sep 2026): 232 of 370 builder mocks came back
// short — a topic is listed at 3 validated questions (median per topic:
// SBI Clerk 9, UKSSSC 2) while the sizes were 10/25/50. The page now loads
// each topic's validated count PER DIFFICULTY (withdrawn "rejected" rows
// excluded), so the form can show what the chosen difficulty really draws
// on (EASY/HARD fall back to MEDIUM, as the API does), grey out sizes the
// selection cannot fill and offer "All N" — no extra round trip.
// "Seen" is now ANSWERED (src/lib/answered-questions.ts), per topic and
// difficulty, and the seen lines come from src/lib/builder-fill-copy.ts
// because the old build.seen.* strings say "any mock you opened counts".
//
// Guest quiz under the sign-in (25 Sep 2026): 183 signed-out people opened
// this page in 11-24 Sep and 131 never signed in. The form's sign-in button
// is untouched; BELOW the builder a signed-out visitor now also gets the
// exam's 5-question guest quiz (the one /exams/[code]/quiz serves), whose
// result screen signs in and comes back here (src/components/GuestQuizGate).
// Signed-in visitors, crawlers' view of the form and the JSON-LD are
// unchanged; the quiz is read only for a guest and only when the form shows.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { getExamTheme } from "@/lib/exam-theme";
import { BuilderForm, type BuilderLabels } from "./BuilderForm";
import { OTHER_INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { getAnsweredCountByTopic } from "@/lib/answered-questions";
import { SEEN_WINDOW_DAYS } from "@/lib/question-pick";
import { ZERO_COUNTS, type DiffCounts } from "@/lib/mock-fill";
import { builderFillCopy, type BuilderFillCopy } from "@/lib/builder-fill-copy";
import { getT } from "@/lib/i18n-server";
import { fillTemplate, type StringKey } from "@/lib/i18n";
import { buildMockCopy } from "@/lib/quiz-entry-copy";
import { BUILDABLE_TOPIC_MIN, examPageGates } from "@/lib/exam-page-gates";
import { loadGuestQuizEmbed } from "@/lib/guest-quiz-embed";
import { buildGateCallbackPath } from "@/lib/mock-gate";
import { mockGateCopy } from "@/lib/mock-gate-copy";
import { GuestQuizGate } from "@/components/GuestQuizGate";

// The form's copy in the visitor's locale (13 Sep 2026): cookie / URL /
// preferredLang via getT(). Not exported — a page file may only export
// Next's own fields. The answered / availability lines (25 Sep 2026) come
// from builderFillCopy in the same locale.
function builderLabels(t: (key: StringKey) => string, F: BuilderFillCopy): BuilderLabels {
  return {
    seenLine: F.answeredLine,
    seenShort: F.answeredShort,
    seenExhausted: F.answeredExhausted,
    seenExamPage: t("build.seen.examPage"),
    topicSeenTitle: F.topicAnsweredTitle,
    topicNewOf: F.topicNotAnsweredOf,
    builtRepeats: F.builtRepeats,
    builtShort: F.builtShort,
    builtStart: t("build.built.start"),
    builtChange: t("build.built.change"),
    questions: t("build.questions"),
    difficulty: t("build.difficulty"),
    diffMixed: t("build.diff.mixed"),
    diffEasy: t("build.diff.easy"),
    diffHard: t("build.diff.hard"),
    availableOne: t("build.available.one"),
    availableMany: t("build.available.many"),
    sizeAll: F.sizeAll,
    sizeTooBig: F.sizeTooBig,
    onlyAvailable: F.onlyAvailable,
    tooFew: F.tooFew,
    fallbackEasy: F.fallbackEasy,
    fallbackHard: F.fallbackHard,
    fallbackNoneEasy: F.fallbackNoneEasy,
    fallbackNoneHard: F.fallbackNoneHard,
    fallbackAnsweredEasy: F.fallbackAnsweredEasy,
    fallbackAnsweredHard: F.fallbackAnsweredHard,
    fallbackAnsweredNoneEasy: F.fallbackAnsweredNoneEasy,
    fallbackAnsweredNoneHard: F.fallbackAnsweredNoneHard,
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
  // A failed gate read keeps the page indexable (GATES_OPEN), as before.
  const buildable = (await examPageGates(code)).buildMock;
  const title = `${exam.shortName} topic-wise mock test builder — pick your topics, free | Shishya`;
  const description = buildable
    ? `Build your own ${exam.name} mock: choose exact topics (polity, number system, anything), size and difficulty. Instant scoring, solutions, Hindi + ${OTHER_INDIAN_LANGUAGE_COUNT} languages. Free.`
    : `${exam.name} topic-wise mock builder: no topic of this exam has enough checked questions for a topic mock yet.`;
  return {
    title,
    description,
    ...(buildable ? {} : { robots: { index: false, follow: true } }),
    alternates: { canonical: `https://shishya.in/exams/${code}/build-mock` },
    openGraph: { title, description, url: `https://shishya.in/exams/${code}/build-mock`, siteName: "Shishya", locale: "en_IN", type: "website" },
  };
}

export default async function BuildMockPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ topics?: string; pyq?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }>;
}) {
  const [{ code }, sp, session, tt] = await Promise.all([params, searchParams, auth().catch(() => null), getT()]);
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, shortName: true, name: true, active: true, category: true, durationMin: true, totalQuestions: true },
  });
  if (!exam || !exam.active) notFound();

  const pyq = sp.pyq === "1";
  const signedIn = !!session?.user?.id;
  // Guest only: the exam's guest quiz, read alongside the topic counts. A
  // failed read is null and the page is exactly as before.
  const guestQuizP = signedIn ? Promise.resolve(null) : loadGuestQuizEmbed(exam.code, tt.t, tt.locale).catch(() => null);

  // Subjects → topics with validated-question counts, all and PYQ-pattern
  // only, each split by difficulty (25 Sep 2026) so the form can count what
  // the chosen difficulty really draws on. Topics under 3 questions in the
  // chosen mode are hidden — a 2-question "topic mock" reads as broken.
  // Withdrawn questions (tag "rejected") are never counted: the API never
  // picks them.
  const rowsRead = await prisma.$queryRaw<
    {
      sname: string; sweight: number | null; tid: string; tcode: string; tname: string;
      n: bigint; ne: bigint; nm: bigint; nh: bigint;
      npyq: bigint; pe: bigint; pm: bigint; ph: bigint;
    }[]
  >`
    SELECT s.name sname, s.weight sweight, t.id tid, t.code tcode, t.name tname, COUNT(q.id) n,
           COUNT(q.id) FILTER (WHERE q.difficulty = 'EASY') ne,
           COUNT(q.id) FILTER (WHERE q.difficulty = 'MEDIUM') nm,
           COUNT(q.id) FILTER (WHERE q.difficulty = 'HARD') nh,
           COUNT(q.id) FILTER (WHERE q.source = 'PYQ') npyq,
           COUNT(q.id) FILTER (WHERE q.source = 'PYQ' AND q.difficulty = 'EASY') pe,
           COUNT(q.id) FILTER (WHERE q.source = 'PYQ' AND q.difficulty = 'MEDIUM') pm,
           COUNT(q.id) FILTER (WHERE q.source = 'PYQ' AND q.difficulty = 'HARD') ph
    FROM "Subject" s
    JOIN "Topic" t ON t."subjectId" = s.id
    JOIN "Question" q ON q."topicId" = t.id AND q.validated = TRUE AND NOT ('rejected' = ANY(q.tags))
    WHERE s."examId" = ${exam.id}
    GROUP BY 1, 2, 3, 4, 5
    HAVING COUNT(q.id) >= 3
    ORDER BY s.weight DESC NULLS LAST, s.name, COUNT(q.id) DESC`.catch(() => null);
  // A failed read is not "no topic has enough questions" (16 Sep 2026).
  const rowsFailed = rowsRead === null;
  const allRows = rowsRead ?? [];
  const pyqAvailable = allRows.some((r) => Number(r.npyq) >= 3);
  const rows = (pyq ? allRows.filter((r) => Number(r.npyq) >= 3) : allRows).map((r) => ({
    ...r,
    n: pyq ? r.npyq : r.n,
    diff: pyq
      ? { EASY: Number(r.pe), MEDIUM: Number(r.pm), HARD: Number(r.ph) }
      : { EASY: Number(r.ne), MEDIUM: Number(r.nm), HARD: Number(r.nh) },
  }));

  // Signed in: how many validated questions of each topic this student
  // has ANSWERED on this exam in the last SEEN_WINDOW_DAYS days, per
  // difficulty — one query — so the form can say "answered N of M" with
  // real numbers. Questions that were only on screen (a mock left at
  // question 1) do not count (25 Sep 2026). Anonymous → no data, no copy.
  // The query returns null on a DB error: then seenKnown=false and the
  // form hides every answered line rather than asserting "0 of M".
  const seenResult = session?.user?.id
    ? await getAnsweredCountByTopic(session.user.id, exam.id, undefined, { pyqOnly: pyq })
    : null;
  const seenKnown = seenResult !== null;
  const guestQuiz = await guestQuizP;
  const seenByTopic = seenResult ?? new Map<string, DiffCounts>();

  const theme = getExamTheme(exam.category);
  const subjects = new Map<
    string,
    { name: string; topics: { id: string; code: string; name: string; n: number; seen: number; diff: DiffCounts; seenDiff: DiffCounts }[] }
  >();
  for (const r of rows) {
    const s = subjects.get(r.sname) ?? { name: r.sname, topics: [] };
    const n = Number(r.n);
    const got = seenByTopic.get(r.tid) ?? ZERO_COUNTS;
    // Never more answered than the topic holds, per difficulty.
    const seenDiff = {
      EASY: Math.min(r.diff.EASY, got.EASY),
      MEDIUM: Math.min(r.diff.MEDIUM, got.MEDIUM),
      HARD: Math.min(r.diff.HARD, got.HARD),
    };
    const seen = Math.min(n, seenDiff.EASY + seenDiff.MEDIUM + seenDiff.HARD);
    s.topics.push({ id: r.tid, code: r.tcode, name: r.tname, n, seen, diff: r.diff, seenDiff });
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
  const empty = allRows.length === 0;
  const jsonLd = [
    ...(empty ? [] : [{
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
    }]),
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
  // The page's visible words in the reader's language (16 Sep 2026). The
  // <title>, description, canonical and the JSON-LD above stay English: they
  // are one stable answer per URL, and a crawler carries no cookie, so the
  // indexed text is unchanged. "PYQ-pattern" keeps "pattern" in every
  // language — these are questions built to the years' pattern, not the
  // original questions.
  const C = buildMockCopy(tt.locale);
  const GC = mockGateCopy(tt.locale);
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
          <Link href={`/exams/${exam.code}`} className="hover:text-ink-800">{exam.shortName}</Link> · {C.crumb}
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">
          {fillTemplate(pyq ? C.h1Pyq : C.h1, { exam: exam.shortName })}
        </h1>
        {!empty && (
          <p className="mt-2 max-w-3xl text-sm text-ink-700">
            {fillTemplate(C.intro, { n: OTHER_INDIAN_LANGUAGE_COUNT })}
          </p>
        )}

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
        ) : subjects.size === 0 && rowsFailed ? (
          <p className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-4 py-6 text-sm text-ink-500">
            {C.loadFailed}
          </p>
        ) : subjects.size === 0 ? (
          <p className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-4 py-6 text-sm text-ink-500">
            {fillTemplate(C.emptyBefore, { exam: exam.shortName, min: BUILDABLE_TOPIC_MIN })}
            <Link href={`/exams/${exam.code}`} className="font-medium text-saffron-700 hover:underline">{fillTemplate(C.emptyLink, { exam: exam.shortName })}</Link>
            {C.emptyAfter}
          </p>
        ) : (
          <BuilderForm
            examCode={exam.code}
            pyqOnly={pyq}
            subjects={[...subjects.values()]}
            preselected={preIds}
            signedIn={signedIn}
            seenKnown={seenKnown}
            windowDays={SEEN_WINDOW_DAYS}
            labels={builderLabels(tt.t, builderFillCopy(tt.locale))}
          />
        )}
        {/* Secondary, under the builder and its sign-in button: only for a
            guest, and only when the form (and so that button) is on screen. */}
        {!signedIn && subjects.size > 0 && guestQuiz && (
          <div className="max-w-3xl">
            <GuestQuizGate
              quiz={guestQuiz.quiz}
              translation={guestQuiz.translation}
              labels={guestQuiz.labels}
              challengeLabels={guestQuiz.challengeLabels}
              locale={guestQuiz.locale}
              copy={{
                heading: GC.quizHeading,
                line: GC.quizLine,
                start: GC.quizStart,
                endSignIn: GC.buildQuizEndSignIn,
              }}
              signInCallbackUrl={buildGateCallbackPath(exam.code, pyq, sp)}
              beacons={{ start: "build-gate-quiz-start", done: "build-gate-quiz-done", signin: "build-gate-signin-click" }}
              beaconProps={{ examCode: exam.code }}
            />
          </div>
        )}
      </section>
    </main>
  );
}
