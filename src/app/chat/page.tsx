// /chat?examCode=SSC_CGL — full-page "Ask Shishya" chat.
// Server component picks the exam (default first enrolled) and hands off to client.

import Link from "next/link";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { ChatInterface } from "./ChatInterface";
import { ExamSwitcher } from "./ExamSwitcher";
import { recordEvent } from "@/lib/analytics";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ examCode?: string; topicCode?: string; seed?: string; general?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const { t } = await getT();
  const generalMode = sp.general === "1";

  // ── Anonymous tutor — UNGATED ────────────────────────────────────────
  // The AI tutor is open to signed-out visitors. Two anons reached /chat
  // and bounced at the old login wall every day — they came for the tutor.
  // Guests get a stateless, tools-off tutor scoped to the exam syllabus
  // (or general), nothing persisted, with a soft sign-in nudge. The scope
  // guardrail in the prompt keeps it exam-only for everyone.
  if (!session?.user?.id) {
    let anonExamCode: string | null = null;
    let anonExamShort: string | null = null;
    if (!generalMode && sp.examCode) {
      const ex = await prisma.exam.findUnique({
        where: { code: sp.examCode },
        select: { code: true, shortName: true, active: true },
      });
      if (ex && ex.active) {
        anonExamCode = ex.code;
        anonExamShort = ex.shortName;
      }
    }
    void recordEvent({
      kind: "CHAT_OPENED",
      path: "/chat",
      props: { examCode: anonExamCode, general: anonExamCode == null, anon: true },
    });
    const anonStarters = anonExamShort
      ? [
          `Explain the ${anonExamShort} exam pattern and which topics carry the most marks.`,
          `Give me a 30-minute plan to start preparing for ${anonExamShort} today.`,
          `Quiz me with one ${anonExamShort} question — start easy, then go harder.`,
          `What are the most common mistakes ${anonExamShort} aspirants make?`,
        ]
      : [
          t("chat.general.starter.1"),
          t("chat.general.starter.2"),
          t("chat.general.starter.3"),
          t("chat.general.starter.4"),
        ];
    const loginHref = `/login?callbackUrl=${encodeURIComponent(
      anonExamCode ? `/chat?examCode=${anonExamCode}` : "/chat"
    )}`;
    return (
      <main className="min-h-screen bg-ink-50/40">
        <Header />
        <section
          className="container-prose flex flex-col py-6 sm:py-8"
          style={{ minHeight: "calc(100vh - 64px)" }}
        >
          <div>
            <p className="text-xs text-ink-500">{t("nav.tutor").replace(" →", "")}</p>
            <h1 className="mt-1 text-xl font-semibold text-ink-900">
              {anonExamShort ? `Ask Shishya — ${anonExamShort}` : t("chat.title")}
            </h1>
            <p className="mt-2 rounded-md bg-saffron-50 px-3 py-2 text-xs text-ink-600 ring-1 ring-saffron-200">
              You&apos;re chatting as a guest — ask anything about{" "}
              {anonExamShort ? `${anonExamShort} or its syllabus` : "your exam prep"}.{" "}
              <Link href={loginHref} className="font-medium text-saffron-700 hover:underline">
                Sign in free
              </Link>{" "}
              to save your chats and get tutoring tuned to your weak topics.
            </p>
          </div>

          <ChatInterface
            examCode={anonExamCode}
            topicFocus={null}
            initialSeed={sp.seed ?? null}
            labels={{
              placeholder: t("chat.placeholder"),
              send: t("chat.send"),
              thinking: t("chat.thinking"),
              empty: anonExamShort ? t("chat.empty.body") : t("chat.general.empty"),
              emptyExamPrefix: anonExamShort ? t("chat.empty.examPrefix") : "",
              suggested: t("chat.suggested"),
              starters: anonStarters,
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

  // Analytics — server-side CHAT_OPENED so we don't double-fire with
  // PAGE_VIEW. Captures the exam scope as a prop.
  void recordEvent({
    kind: "CHAT_OPENED",
    userId: session.user.id,
    path: "/chat",
    props: {
      examCode: sp.examCode ?? null,
      topicCode: sp.topicCode ?? null,
      general: generalMode,
    },
  });

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

  // General-mode chat — Shishya without exam context. Reached either by
  // the "General Interaction" tile on the picker (multi-exam users) or
  // by passing ?general=1 directly (e.g. a user who hasn't enrolled in
  // anything yet but wants help picking an exam).
  if (generalMode) {
    return (
      <main className="min-h-screen bg-ink-50/40">
        <Header />
        <section className="container-prose flex flex-col py-6 sm:py-8" style={{ minHeight: "calc(100vh - 64px)" }}>
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-xs text-ink-500">
                <Link href="/dashboard" className="hover:text-ink-800">{t("nav.dashboard")}</Link> · {t("nav.tutor").replace(" →", "")}
              </p>
              <h1 className="mt-1 text-xl font-semibold text-ink-900">{t("chat.general.title")}</h1>
              <p className="mt-0.5 text-xs text-ink-500">{t("chat.general.subtitle")}</p>
            </div>
          </div>

          <ChatInterface
            examCode={null}
            topicFocus={null}
            initialSeed={sp.seed ?? null}
            labels={{
              placeholder: t("chat.placeholder"),
              send: t("chat.send"),
              thinking: t("chat.thinking"),
              empty: t("chat.general.empty"),
              emptyExamPrefix: "",
              suggested: t("chat.suggested"),
              starters: [
                t("chat.general.starter.1"),
                t("chat.general.starter.2"),
                t("chat.general.starter.3"),
                t("chat.general.starter.4"),
              ],
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

  if (enrollments.length === 0) {
    return (
      <main className="min-h-screen bg-ink-50/40">
        <Header />
        <section className="container-prose py-16 text-center">
          <h1 className="text-xl font-semibold text-ink-900">{t("dash.no.enrollments")}</h1>
          <p className="mt-2 text-sm text-ink-600">{t("chat.pick.subtitle")}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link href="/exams" className="btn-primary !py-2 !px-4 text-sm">
              {t("nav.exams")} →
            </Link>
            <Link href="/chat?general=1" className="btn-secondary !py-2 !px-4 text-sm">
              {t("chat.general.cta")}
            </Link>
          </div>
        </section>
      </main>
    );
  }

  // Picker mode: when the student lands on /chat from a generic surface
  // (e.g. the dashboard's top-bar "Ask Shishya" button) we must NOT
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
            {/* General-mode tile — exam-agnostic chat for cross-exam
                questions, career advice, "which exam should I pick",
                study technique tips, etc. */}
            <li>
              <Link
                href="/chat?general=1"
                className="block rounded-md border border-ink-200 bg-gradient-to-br from-saffron-50 to-white p-4 hover:border-saffron-400 hover:bg-saffron-50/60"
              >
                <p className="text-sm font-semibold text-ink-900">{t("chat.general.tile.title")}</p>
                <p className="mt-0.5 text-xs text-ink-600">{t("chat.general.tile.body")}</p>
                <p className="mt-1 text-xs text-saffron-700">{t("chat.general.tile.cta")} →</p>
              </Link>
            </li>
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

  // If a topic was passed (e.g. user clicked "Ask Shishya" from a
  // study-notes page), look it up so the chat can anchor on it and the UI
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
