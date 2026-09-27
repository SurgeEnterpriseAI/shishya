// /chat — full-page "Ask Shishya" chat: /chat and /chat?general=1 (any
// study question), /chat?examCode=SSC_CGL (one exam) and the Class 8-12
// school chat. Server component picks the scope and hands off to client.
//
// 27 Sep 2026 (whole-platform tutor + content first): the general chat is the
// default — a signed-in account with no real-exam enrolment, or several with
// none named, gets it with the exam dropdown one optional tap away (no "pick
// your exam" screen, no "no enrolments" wall); guests get the school chat
// too, with no sign-in card; nobody is asked an age band.
//
// School tutor (26 Sep 2026): /chat?examCode=NCERT_C09&topicCode=<chapter>
// &seed=… is the entry from a Class 8-12 school chapter page. It renders
// BEFORE the exam flows below — the school chat, guest or signed in — and
// never enrols, never reads the exam dropdown. See the school branch in the
// body.
// Fixer review, same day: the exam flows below read real-exam enrolments
// only (exam: NOT_SCHOOL_WHERE — the school profile flow enrols a declared
// account on its class container, and plain /chat used to pick that
// container as "the exam" and render the exam island on it), a declared
// 13-17 account is sent to its class chat from every other /chat URL, and a
// school-only adult account on plain /chat lands on its class chat too.

import Link from "next/link";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_WHERE, realExamKey } from "@/lib/db/exam-scope";
import { ensureEnrollment } from "@/lib/db/enrollment";
import { getT } from "@/lib/i18n-server";
import { ChatInterface } from "./ChatInterface";
import { ExamSwitcher } from "./ExamSwitcher";
import { ChatOpenedBeacon } from "@/components/ChatOpenedBeacon";
import { attemptSeedScope } from "@/lib/chat-seed-once";
import { notFound, redirect } from "next/navigation";
import { fillTemplate } from "@/lib/i18n";
import { isMinorBand, isStudentModeClass, schoolBandOfProfile, schoolContainerClassOf } from "@/lib/school/student-classes";
import { schoolOnlyChatPath } from "@/lib/school/tutor-scope";
import { countSchoolTutorMessagesToday, getSchoolChapterFocus, getSchoolTutorContext } from "@/lib/school/tutor-context";
import { SCHOOL_TUTOR_CAP_COPY, schoolTutorCapReached, schoolTutorMessagesLeft, schoolUiLang } from "@/lib/school/tutor-cap";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ examCode?: string; topicCode?: string; seed?: string; general?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const { t, locale } = await getT();
  const generalMode = sp.general === "1";

  // CHAT_OPENED is now fired client-side by <ChatOpenedBeacon> at the
  // point ChatInterface mounts, so bot crawls and router prefetches
  // (neither of which run effects) no longer inflate it. The old
  // server-side fire + prefetch-header guard is gone.

  // ── School tutor (26 Sep 2026) ────────────────────────────────────
  // /chat?examCode=NCERT_C09&topicCode=<chapter>&seed=… is the "Ask the AI
  // tutor" entry on a Class 8-12 chapter page (src/lib/school/student-classes.ts
  // schoolTutorHref). Founder decision, 26 Sep 2026: Classes 8-12 get the
  // tutor; Classes 1-7 stay content only, so their codes 404 here for
  // everyone. Every visitor, guest or signed in, gets the school chat — the
  // "AI tutor" line, the age line, the chapter focus, hint-first starters,
  // the daily cap — and none of the exam CTAs (diagnostic, teacher,
  // save-conversation, suggested actions). Nothing here enrols, reads
  // mastery or touches the exam dropdown below.
  const schoolCls = !generalMode && sp.examCode ? schoolContainerClassOf(sp.examCode) : null;
  if (schoolCls !== null) {
    if (!isStudentModeClass(schoolCls)) notFound();
    const examCode = sp.examCode!;
    const ctx = await getSchoolTutorContext(examCode);
    if (!ctx) notFound();
    const focus = sp.topicCode ? await getSchoolChapterFocus(examCode, sp.topicCode) : null;
    const classLabel = fillTemplate(t("chat.school.classLabel"), { n: schoolCls, board: ctx.scope.boardShort });
    const backHref = focus?.path ?? ctx.scope.classPath;
    const backLabel = focus ? t("chat.school.back.chapter") : t("chat.school.back.class");
    // 27 Sep 2026 (founder, content first): guests get the class tutor with no sign-in and nobody is asked an age band; the safeguards come from this context — the school persona, the study-only pre-filter and the daily cap (per account, or per browser for a guest, in POST /api/chat).
    const memberId = session?.user?.id ?? null;
    const usedToday = memberId ? await countSchoolTutorMessagesToday(memberId) : 0;
    const starters = focus
      ? [t("chat.school.starter.1"), t("chat.school.starter.2"), t("chat.school.starter.3"), t("chat.school.starter.4")]
      : [
          fillTemplate(t("chat.school.classStarter.1"), { cls: classLabel }),
          t("chat.school.classStarter.2"),
          t("chat.school.classStarter.3"),
          t("chat.school.classStarter.4"),
        ];
    return (
      <main className="min-h-screen bg-ink-50/40">
        <Header />
        <section className="container-prose flex flex-col py-6 sm:py-8" style={{ minHeight: "calc(100vh - 64px)" }}>
          <div>
            <p className="text-xs text-ink-500">
              <Link href="/schooling" className="hover:text-ink-800">{t("chat.school.crumb")}</Link> ·{" "}
              <Link href={ctx.scope.classPath} className="hover:text-ink-800">{classLabel}</Link>
              {focus && (
                <>
                  {" "}· <Link href={focus.path} className="hover:text-ink-800">{focus.subjectName}</Link>
                </>
              )}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-ink-900">{fillTemplate(t("chat.school.title"), { cls: classLabel })}</h1>
            <p className="mt-0.5 text-xs text-ink-500">{t("chat.school.subtitle")}</p>
            <p className="mt-0.5 text-[11px] text-ink-500">{t("chat.school.ageLine")}</p>
          </div>

          <ChatOpenedBeacon props={{ examCode, topicCode: sp.topicCode ?? null, general: false, anon: memberId == null, school: true }} />
          <ChatInterface
            examCode={examCode}
            topicFocus={focus ? { code: focus.code, name: focus.name, subjectName: focus.subjectName, examShortName: classLabel } : null}
            initialSeed={sp.seed ?? null}
            school={{
              aiLine: t("chat.school.aiLine"),
              classLabel,
              capReached: memberId ? schoolTutorCapReached(usedToday) : false,
              capLine: SCHOOL_TUTOR_CAP_COPY[schoolUiLang(locale)],
              messagesLeft: memberId ? schoolTutorMessagesLeft(usedToday) : null,
              leftTemplate: t("chat.school.left"),
              backHref,
              backLabel,
            }}
            labels={{
              placeholder: t("chat.placeholder"),
              send: t("chat.send"),
              thinking: t("chat.thinking"),
              empty: t("chat.school.empty"),
              emptyExamPrefix: t("chat.empty.examPrefix"),
              suggested: t("chat.suggested"),
              starters,
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

  // ── Anonymous tutor — UNGATED ────────────────────────────────────────
  // The AI tutor is open to signed-out visitors. Two anons reached /chat
  // and bounced at the old login wall every day — they came for the tutor.
  // Guests get a stateless, tools-off tutor scoped to the exam syllabus or,
  // with no exam, to any study question (27 Sep 2026: school, entrance and
  // government exams, college, scholarships, careers), nothing kept in an
  // account, with one soft sign-in line. The pre-filter and the scope rules
  // keep it a study-only tutor for everyone.
  if (!session?.user?.id) {
    let anonExamCode: string | null = null;
    let anonExamShort: string | null = null;
    if (!generalMode && sp.examCode) {
      const ex = await prisma.exam.findUnique({
        where: realExamKey({ code: sp.examCode }),
        select: { code: true, shortName: true, active: true },
      });
      if (ex && ex.active) {
        anonExamCode = ex.code;
        anonExamShort = ex.shortName;
      }
    }
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
      anonExamCode ? `/chat?examCode=${anonExamCode}` : "/chat?general=1"
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
              {anonExamShort ? `Ask Shishya — ${anonExamShort}` : t("chat.general.title")}
            </h1>
            {!anonExamShort && <p className="mt-0.5 text-xs text-ink-500">{t("chat.general.subtitle")}</p>}
            <p className="mt-2 rounded-md bg-saffron-50 px-3 py-2 text-xs text-ink-600 ring-1 ring-saffron-200">
              {anonExamShort ? fillTemplate(t("chat.guest.leadExam"), { exam: anonExamShort }) : t("chat.guest.lead")}{" "}
              <Link href={loginHref} className="font-medium text-saffron-700 hover:underline">
                {t("chat.guest.signin")}
              </Link>{" "}
              {anonExamShort ? t("chat.guest.tailExam") : t("chat.guest.tail")}
            </p>
          </div>

          <ChatOpenedBeacon
            props={{ examCode: anonExamCode, general: anonExamCode == null, anon: true }}
          />
          <ChatInterface
            examCode={anonExamCode}
            examShortName={anonExamShort}
            topicFocus={null}
            initialSeed={sp.seed ?? null}
            guestSignInHref={loginHref}
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
  // PAGE_VIEW. Fired client-side via <ChatOpenedBeacon> in the return
  // below so bot crawls / prefetches don't inflate it (see the beacon
  // component and the anon path above).
  const chatOpenedProps = {
    examCode: sp.examCode ?? null,
    topicCode: sp.topicCode ?? null,
    general: generalMode,
    anon: false,
  };

  // The account's school age band (26 Sep 2026 fixer review — the rule and
  // the why are in src/lib/school/tutor-scope.ts). A declared 13-17 student
  // gets the school tutor ONLY: general mode, plain /chat and every
  // /chat?examCode=<real exam> (which auto-enrols below) go to the class
  // chat, where the school persona, the AI line and the daily cap apply.
  // Adult school bands (18+, parent, teacher) keep the exam tutor; with no
  // real-exam enrolment, plain /chat takes them to the class chat rather
  // than the general chat. Bands are no longer asked (27 Sep 2026); these
  // rules hold only for accounts that stored one before then.
  const profile = await prisma.user.findUnique({ where: { id: session.user.id }, select: { onbStage: true, onbPrepCodes: true } });
  const schoolProfile = schoolBandOfProfile(profile);
  if (schoolProfile && isMinorBand(schoolProfile.band)) redirect(schoolOnlyChatPath(schoolProfile.classCodes, sp.examCode));

  // Real exams only: the school profile flow enrols a declared account on
  // its class container (src/lib/school/student-db.ts), and that row must
  // never feed the dropdown or enrollments[0] here — the school chat is the
  // branch above, reached by its own examCode.
  let enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id, active: true, exam: NOT_SCHOOL_WHERE },
    include: { exam: { select: { code: true, shortName: true } } },
    orderBy: { createdAt: "desc" },
  });
  if (schoolProfile && !generalMode && !sp.examCode && enrollments.length === 0) {
    redirect(schoolOnlyChatPath(schoolProfile.classCodes, null));
  }

  // If the URL points at a real exam the user isn't enrolled in yet (e.g.
  // they followed a topic / weakness / mock-results deep link for an exam
  // they were just browsing), auto-enroll them so the tutor scopes mastery
  // lookups, mocks, and the exam-switcher dropdown to the exam they came
  // from rather than silently falling back to enrollments[0]. Without this
  // a user coming from SSC GD sees "RRB NTPC" in the switcher because their
  // first enrollment happened to be RRB NTPC.
  if (sp.examCode && !enrollments.find((e) => e.exam.code === sp.examCode)) {
    const target = await prisma.exam.findUnique({
      where: realExamKey({ code: sp.examCode }),
      select: { id: true, code: true, shortName: true, active: true, category: true },
    });
    if (target && target.active) {
      await ensureEnrollment(session.user.id, target, { active: true });
      // Re-read enrollments so the switcher and downstream logic include the
      // freshly-added one. orderBy createdAt desc puts the new one first.
      enrollments = await prisma.enrollment.findMany({
        where: { userId: session.user.id, active: true, exam: NOT_SCHOOL_WHERE },
        include: { exam: { select: { code: true, shortName: true } } },
        orderBy: { createdAt: "desc" },
      });
    }
  }

  // Which enrolled exam the URL names, if any (the auto-enrol above has
  // already added a real exam it named).
  const explicitExamCode =
    sp.examCode && enrollments.find((e) => e.exam.code === sp.examCode)
      ? sp.examCode
      : null;
  // 27 Sep 2026 (founder, content first): no picker before the tutor — no real-exam enrolment, or several with none named, opens the general tutor with the exam dropdown one optional tap away.
  const general = generalMode || enrollments.length === 0 || (!explicitExamCode && !sp.seed && !sp.topicCode && enrollments.length > 1);

  // General-mode chat — any study question not tied to one exam: ?general=1,
  // plain /chat with no real-exam enrolment or with several, and the
  // dropdown's first option. A student with exactly one enrolment lands on
  // that exam's chat, whose dropdown offers this one too.
  if (general) {
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
            {enrollments.length > 0 && <ExamSwitcher current="" generalLabel={t("chat.general.tile.title")} options={enrollments.map((e) => ({ code: e.exam.code, shortName: e.exam.shortName }))} label={`${t("nav.exams")}:`} />}
          </div>

          <ChatOpenedBeacon props={{ examCode: null, general: true, anon: false }} />
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

  // A seeded chat's once-per-tab key includes the student's latest attempt
  // (24 Sep 2026 review): the same seed text after another attempt — a second
  // results page with the same wrong count and topics, "Quiz me…" again after
  // taking that quiz — sends by itself instead of waiting as a repeat. One
  // indexed row, and only when a seed is present.
  const seedScope = sp.seed
    ? attemptSeedScope(
        await prisma.attempt.findFirst({
          where: { userId: session.user.id },
          orderBy: { startedAt: "desc" },
          select: { id: true, finishedAt: true },
        }),
      )
    : null;

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
          {enrollments.length >= 1 && (
            <ExamSwitcher
              current={examCode}
              generalLabel={t("chat.general.tile.title")}
              options={enrollments.map((e) => ({ code: e.exam.code, shortName: e.exam.shortName }))}
              label={`${t("nav.exams")}:`}
            />
          )}
        </div>

        <ChatOpenedBeacon props={chatOpenedProps} />
        <ChatInterface
          examCode={examCode}
          examShortName={examShort}
          topicFocus={topicFocus}
          initialSeed={sp.seed ?? null}
          seedScope={seedScope}
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
