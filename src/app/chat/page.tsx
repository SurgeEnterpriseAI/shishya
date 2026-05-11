// /chat?examCode=SSC_CGL — full-page AI tutor chat.
// Server component picks the exam (default first enrolled) and hands off to client.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { ChatInterface } from "./ChatInterface";
import { ExamSwitcher } from "./ExamSwitcher";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ examCode?: string; topicCode?: string; seed?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/chat");
  const sp = await searchParams;
  const { t } = await getT();

  let enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id, active: true },
    include: { exam: { select: { code: true, shortName: true } } },
    orderBy: { createdAt: "desc" },
  });

  // If the URL points at a real exam the user isn't enrolled in yet (e.g.
  // they followed a topic / weakness / mock-results deep link for an exam
  // they were just browsing), auto-enroll them so the tutor scopes mastery
  // lookups, mocks, and the exam-switcher dropdown to the exam they came
  // from rather than silently falling back to enrollments[0]. Without this
  // a user coming from SSC GD sees "RRB NTPC" in the switcher because their
  // first enrollment happened to be RRB NTPC.
  if (sp.examCode && !enrollments.find((e) => e.exam.code === sp.examCode)) {
    const target = await prisma.exam.findUnique({
      where: { code: sp.examCode },
      select: { id: true, code: true, shortName: true, active: true },
    });
    if (target && target.active) {
      await prisma.enrollment.upsert({
        where: { userId_examId: { userId: session.user.id, examId: target.id } },
        update: { active: true },
        create: { userId: session.user.id, examId: target.id },
      });
      // Re-read enrollments so the switcher and downstream logic include the
      // freshly-added one. orderBy createdAt desc puts the new one first.
      enrollments = await prisma.enrollment.findMany({
        where: { userId: session.user.id, active: true },
        include: { exam: { select: { code: true, shortName: true } } },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  if (enrollments.length === 0) {
    return (
      <main className="min-h-screen bg-ink-50/40">
        <Header />
        <section className="container-prose py-16 text-center">
          <h1 className="text-xl font-semibold text-ink-900">{t("dash.no.enrollments")}</h1>
          <Link href="/dashboard" className="btn-primary mt-6 !py-2 !px-4 text-sm">
            {t("nav.dashboard")} →
          </Link>
        </section>
      </main>
    );
  }

  // Picker mode: when the student lands on /chat from a generic surface
  // (e.g. the dashboard's top-bar "Ask Shishya AI" button) we must NOT
  // silently scope the tutor to their most-recent enrollment — that was
  // confusing students who'd just been browsing one exam and got auto-
  // dropped into a different one. If they have multiple enrollments and
  // didn't pass an explicit examCode + topicCode + seed, show a tile
  // picker so they choose. Single-enrollment users skip the picker (no
  // choice to make).
  const explicitExamCode =
    sp.examCode && enrollments.find((e) => e.exam.code === sp.examCode)
      ? sp.examCode
      : null;
  const needsPicker =
    !explicitExamCode && !sp.seed && !sp.topicCode && enrollments.length > 1;

  if (needsPicker) {
    return (
      <main className="min-h-screen bg-ink-50/40">
        <Header />
        <section className="container-prose py-10">
          <p className="text-xs text-ink-500">
            <Link href="/dashboard" className="hover:text-ink-800">{t("nav.dashboard")}</Link>{" "}
            · {t("nav.tutor").replace(" →", "")}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900">{t("chat.pick.title")}</h1>
          <p className="mt-1 text-sm text-ink-600">{t("chat.pick.subtitle")}</p>
          <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {enrollments.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/chat?examCode=${e.exam.code}`}
                  className="block rounded-md border border-ink-200 bg-white p-4 hover:border-saffron-400 hover:bg-saffron-50/30"
                >
                  <p className="text-sm font-semibold text-ink-900">{e.exam.shortName}</p>
                  <p className="mt-1 text-xs text-saffron-700">{t("chat.pick.cta")} →</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </main>
    );
  }

  const examCode = explicitExamCode ?? enrollments[0].exam.code;
  const currentEnrollment = enrollments.find((e) => e.exam.code === examCode);
  const examShort = currentEnrollment?.exam.shortName ?? examCode;

  // Build exam-aware starter prompts. The default i18n list ("Profit & Loss",
  // "Compound Interest", "Time and Work") is SSC-Math-flavoured — wrong for
  // NEET, JEE, UPSC, and even narrow for an SSC CGL student. We pull the
  // student's weakest topic for this exam (cheap single-row lookup) so the
  // first prompt can name a real weakness; the other three reference the
  // exam by name.
  const weakest = currentEnrollment
    ? await prisma.weaknessMap.findFirst({
        where: { userId: session.user.id, examId: currentEnrollment.examId },
        orderBy: { masteryScore: "asc" },
        select: { topic: { select: { name: true, code: true } }, attemptsCount: true },
      })
    : null;

  const examStarters: string[] = [
    weakest && weakest.attemptsCount > 0
      ? `Tutor me on ${weakest.topic.name} — that's my weakest area in ${examShort}.`
      : `Quiz me on my weakest ${examShort} topic — start easy and adapt.`,
    `Explain the concept I got wrong most in my last ${examShort} mock.`,
    `Make me a focused 30-minute study plan for ${examShort} today.`,
    `Walk me through the ${examShort} syllabus and which topics carry highest weight.`,
  ];

  // If a topic was passed (e.g. user clicked "Open Shishya tutor" from a
  // study-notes page), look it up so the tutor can anchor on it and the UI
  // can show a focus chip + topic-tailored starters.
  let topicFocus: {
    code: string;
    name: string;
    subjectName: string;
    examShortName: string;
  } | null = null;
  if (sp.topicCode) {
    const exam = enrollments.find((e) => e.exam.code === examCode)?.exam;
    const topic = await prisma.topic.findFirst({
      where: { code: sp.topicCode, subject: { exam: { code: examCode } } },
      select: {
        code: true,
        name: true,
        subject: { select: { name: true } },
      },
    });
    if (topic && exam) {
      topicFocus = {
        code: topic.code,
        name: topic.name,
        subjectName: topic.subject.name,
        examShortName: exam.shortName,
      };
    }
  }

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose flex flex-col py-6 sm:py-8" style={{ minHeight: "calc(100vh - 64px)" }}>
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-ink-500">
              <Link href="/dashboard" className="hover:text-ink-800">{t("nav.dashboard")}</Link> · {t("nav.tutor").replace(" →", "")}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-ink-900">{t("chat.title")}</h1>
          </div>
          {enrollments.length > 1 && (
            <ExamSwitcher
              current={examCode}
              options={enrollments.map((e) => ({ code: e.exam.code, shortName: e.exam.shortName }))}
              label={`${t("nav.exams")}:`}
            />
          )}
        </div>

        <ChatInterface
          examCode={examCode}
          topicFocus={topicFocus}
          initialSeed={sp.seed ?? null}
          labels={{
            placeholder: t("chat.placeholder"),
            send: t("chat.send"),
            thinking: t("chat.thinking"),
            empty: t("chat.empty.body"),
            emptyExamPrefix: t("chat.empty.examPrefix"),
            suggested: t("chat.suggested"),
            starters: examStarters,
            focusLabel: t("chat.focus.label"),
            focusClear: t("chat.focus.clear"),
            diagnosticCta: t("chat.diagnostic.cta"),
            diagnosticBuilding: t("chat.diagnostic.building"),
            diagnosticHint: t("chat.diagnostic.hint"),
          }}
        />
      </section>
    </main>
  );
}
