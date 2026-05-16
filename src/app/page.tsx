// Landing page — search-first, minimal, bilingual.
// Server Component; the picker (search + chips + filter) is a client island.

import Link from "next/link";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { LangSwitcher } from "@/components/LangSwitcher";
import { ExamPicker, type ExamCard } from "@/components/ExamPicker";
import { computeExamTags, TAG_ORDER } from "@/lib/exam-tags";
import { buildCuratedSections, buildStateInfo } from "@/lib/exam-browse";
import { DiscussionsSidebar, type ThreadItem } from "@/components/DiscussionsSidebar";
import { LiveCountersStrip } from "@/components/LiveCounters";
import { UpcomingExamsSidebar, type UpcomingEvent } from "@/components/UpcomingExamsSidebar";

// Fallback list — used only when the DB is unreachable so the public landing
// page still renders something. Real exam list is queried from Prisma below.
const FALLBACK_EXAMS: ExamCard[] = [
  { code: "SSC_CGL",      shortName: "SSC CGL",        name: "SSC Combined Graduate Level",       category: "GOVT_JOBS",  candidatesPerYear: 3_000_000, live: true,  tags: ["popular", "national", "govt"] },
  { code: "NEET_UG",      shortName: "NEET UG",        name: "National Eligibility cum Entrance", category: "MEDICAL",    candidatesPerYear: 2_400_000, live: false, tags: ["popular", "national", "medical"] },
  { code: "JEE_MAIN",     shortName: "JEE Main",       name: "Joint Entrance Examination",        category: "ENGINEERING",candidatesPerYear: 1_400_000, live: false, tags: ["popular", "national", "engineering"] },
  { code: "UPSC_PRELIMS", shortName: "UPSC Prelims",   name: "UPSC Civil Services Examination",   category: "CIVIL_SERVICES", candidatesPerYear: 1_100_000, live: false, tags: ["popular", "national", "govt", "civil_services"] },
];

// Loads the 163-exam list. Wrapped in unstable_cache (60s TTL) so the
// language switcher's router.refresh() doesn't re-pay the US→Asia DB
// round-trip + 163-row read every time — the user-visible "6 seconds
// to switch language" was almost entirely this query. The exam list
// barely changes minute-to-minute; 60s of staleness is fine.
async function loadExamsRaw(): Promise<ExamCard[]> {
  try {
    // "Live" means a student can start something on this exam page right now.
    // Two ways to be live: (a) ≥1 SME-validated question, or (b) ≥1 system
    // mock (userId=null) — the latter covers exams whose pool is currently
    // AI-drafted but already assembled into ready-to-take full mocks. Either
    // path turns the badge from "Coming" to "Live".
    const rows = await prisma.exam.findMany({
      where: { active: true },
      orderBy: [{ candidatesPerYear: "desc" }, { code: "asc" }],
      select: {
        code: true,
        name: true,
        shortName: true,
        category: true,
        candidatesPerYear: true,
        state: true,
        _count: {
          select: {
            questions: { where: { validated: true } },
            mocks: { where: { userId: null } },
          },
        },
      },
    });
    return rows.map((e) => ({
      code: e.code,
      name: e.name,
      shortName: e.shortName,
      category: e.category,
      candidatesPerYear: e.candidatesPerYear,
      state: e.state ?? null,
      live: ((e._count?.questions ?? 0) > 0) || ((e._count?.mocks ?? 0) > 0),
      tags: computeExamTags({
        code: e.code,
        category: e.category,
        state: e.state ?? null,
        candidatesPerYear: e.candidatesPerYear,
      }),
    }));
  } catch {
    return FALLBACK_EXAMS;
  }
}

const loadExams = unstable_cache(loadExamsRaw, ["home-exams-v1"], {
  revalidate: 60,
  tags: ["exams"],
});

export default async function HomePage() {
  const { locale, t } = await getT();
  // Resilient session lookup: if env vars (DATABASE_URL / NEXTAUTH_*) are
  // missing or the DB is unreachable, the landing page must still render.
  // We just treat the user as logged-out in that case.
  let signedIn = false;
  try {
    const session = await auth();
    signedIn = Boolean(session?.user);
  } catch {
    signedIn = false;
  }

  const exams = await loadExams();
  const stateInfo = buildStateInfo(exams);
  const featuredSections = buildCuratedSections(exams, t);

  // Initial discussion threads for the right-side sidebar. Resilient: if the
  // DB isn't reachable yet (env vars missing), the sidebar falls back to an
  // empty list and the rest of the landing still renders.
  let initialThreads: ThreadItem[] = [];
  try {
    initialThreads = await prisma.discussion.findMany({
      orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
      take: 12,
      include: { exam: { select: { shortName: true } } },
    }).then((rows) =>
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        examShort: r.exam?.shortName ?? null,
        authorName: r.authorName,
        messageCount: r.messageCount,
        pinned: r.pinned,
        lastActivityAt: r.lastActivityAt.toISOString(),
      }))
    );
  } catch {
    initialThreads = [];
  }

  // Upcoming exam events for the left-side calendar rail. Resilient: if
  // the DB hiccups the rail just renders empty + the rest of the page
  // still works.
  let upcomingEvents: UpcomingEvent[] = [];
  try {
    upcomingEvents = await prisma.examImportantDate.findMany({
      where: { date: { gte: new Date() }, exam: { active: true } },
      orderBy: { date: "asc" },
      take: 30,
      include: { exam: { select: { code: true, shortName: true } } },
    }).then((rows) =>
      rows.map((r) => ({
        id: r.id,
        examCode: r.exam.code,
        examShort: r.exam.shortName,
        date: r.date.toISOString(),
        label: r.label,
        isExamDay: r.isExamDay,
      }))
    );
  } catch {
    upcomingEvents = [];
  }

  const catLabels: Record<string, string> = {
    GOVT_JOBS:      t("land.cat.GOVT_JOBS"),
    BANKING:        t("land.cat.BANKING"),
    CIVIL_SERVICES: t("land.cat.CIVIL_SERVICES"),
    MEDICAL:        t("land.cat.MEDICAL"),
    ENGINEERING:    t("land.cat.ENGINEERING"),
    TEACHING:       t("land.cat.TEACHING"),
    UNIVERSITY:     t("land.cat.UNIVERSITY"),
    MBA:            t("land.cat.MBA"),
    LAW:            t("land.cat.LAW"),
    DEFENCE:        t("land.cat.DEFENCE"),
    OLYMPIAD:       t("land.cat.OLYMPIAD"),
    STATE_LEVEL:    t("land.cat.STATE_LEVEL"),
  };

  const tagLabels: Record<string, string> = {
    popular:        t("land.tag.popular"),
    national:       t("land.tag.national"),
    state:          t("land.tag.state"),
    govt:           t("land.tag.govt"),
    engineering:    t("land.tag.engineering"),
    medical:        t("land.tag.medical"),
    teaching:       t("land.tag.teaching"),
    banking:        t("land.tag.banking"),
    olympiad:       t("land.tag.olympiad"),
    civil_services: t("land.tag.civil_services"),
    mba:            t("land.tag.mba"),
    law:            t("land.tag.law"),
    police:         t("land.tag.police"),
    university:     t("land.tag.university"),
    polytechnic:    t("land.tag.polytechnic"),
    defence:        t("land.tag.defence"),
  };

  return (
    <main className="min-h-screen bg-saffron-50/30">
      {/* Header + live-counters strip stay full-width so the Sign-in /
          language picker / social-proof banner reach the viewport's
          right edge instead of being squeezed by the discussions panel.
          Everything BELOW the strip gets lg:pr-80 to clear the panel. */}
      <SiteHeader locale={locale} t={t} signedIn={signedIn} />

      {/* Live activity strip — full-width social proof banner */}
      <LiveCountersStrip
        labels={{
          preparingNow:      t("live.preparingNow"),
          inMockNow:         t("live.inMockNow"),
          activeDiscussions: t("disc.title"),
          totalEver:         t("live.totalEver"),
        }}
      />

      {/* Upcoming exam dates — fixed left rail on lg+, hidden below */}
      <UpcomingExamsSidebar events={upcomingEvents} />

      {/* Live community discussions — fixed right rail on lg+, FAB+drawer otherwise */}
      <DiscussionsSidebar
        initial={initialThreads}
        signedIn={signedIn}
        labels={{
          title:      t("disc.title"),
          subtitle:   t("disc.subtitle"),
          replies:    t("disc.replies"),
          reply:      t("disc.reply"),
          viewAll:    t("disc.viewAll"),
          startNew:   t("disc.startNew"),
          empty:      t("disc.empty"),
          justNow:    t("disc.justNow"),
          minutesAgo: t("disc.minutesAgo"),
          hoursAgo:   t("disc.hoursAgo"),
          daysAgo:    t("disc.daysAgo"),
          openAria:   t("disc.sidebar.openAria"),
          closeAria:  t("disc.sidebar.closeAria"),
          liveTitle:       t("live.block.title"),
          liveOnline:      t("live.block.online"),
          liveInMock:      t("live.block.inMock"),
          liveTodaysMocks: t("live.block.todaysMocks"),
        }}
      />

      {/* Body sections — lg:px-80 (320px each side) clears both rails:
          upcoming-exams panel on the left, discussions panel on the
          right. Header + live strip above stay full-width. */}
      <div className="lg:pl-80 lg:pr-80">

      {/* ── Hero: brand line + search + chips + grid ───────────────── */}
      <section className="container-prose pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="bg-gradient-to-r from-ink-900 via-saffron-700 to-ink-900 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl">
            {t("land.title")}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-ink-600 sm:text-lg">
            {t("land.subtitle")}
          </p>
        </div>

        <div className="mt-10">
          <ExamPicker
            exams={exams}
            states={stateInfo}
            featured={featuredSections}
            signedIn={signedIn}
            labels={{
              searchPlaceholder: t("land.search.placeholder"),
              searchLabel: t("land.search.label"),
              noResults: t("land.no.results"),
              catAll: t("land.cat.all"),
              catLabels,
              tagLabels,
              tagOrder: [...TAG_ORDER],
              statusLive: t("land.status.live"),
              statusComing: t("land.status.coming"),
              candidatesPerYear: t("land.candidates"),
              pickState: t("land.pickState"),
              pickStateBack: t("land.pickStateBack"),
              examsConductedBy: t("land.examsConductedBy"),
              seeAll: t("land.seeAll"),
              browseAllExams: t("land.browseAllExams"),
            }}
          />
        </div>

        {!signedIn && (
          <div className="mt-10 text-center">
            <Link href="/login?callbackUrl=%2Fdashboard" className="btn-primary">
              {t("land.cta.start")}
            </Link>
          </div>
        )}
      </section>

      {/* ── Mobile-only inline rails ─────────────────────────────────
          On lg+ the upcoming-exams and live-discussions panels mount
          as fixed side rails. Below lg those rails are hidden — so on
          phones / small tablets we surface the same content as two
          horizontal-scroll cards right below the hero, BEFORE the
          feature pillars. Hidden at lg+ to avoid duplication. */}
      <section className="container-prose mt-2 mb-12 space-y-6 lg:hidden">
        {upcomingEvents.length > 0 && (
          <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
                🟡 Upcoming exam dates
              </p>
              <Link href="/exams" className="text-xs font-medium text-saffron-700 hover:text-saffron-800">
                All exams →
              </Link>
            </div>
            <ul className="mt-3 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {upcomingEvents.slice(0, 12).map((e) => (
                <li key={e.id} className="shrink-0">
                  <Link
                    href={`/exams/${e.examCode}`}
                    prefetch={false}
                    className={`block w-44 rounded-md border px-3 py-2 hover:border-saffron-400 ${
                      e.isExamDay
                        ? "border-saffron-300 bg-saffron-50/60"
                        : "border-ink-200 bg-white"
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-ink-900">{e.examShort}</p>
                    <p className={`mt-0.5 text-[11px] font-medium tabular-nums ${e.isExamDay ? "text-saffron-800" : "text-ink-600"}`}>
                      {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {e.isExamDay && <span className="ml-1.5 rounded bg-saffron-200 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-saffron-900">Exam</span>}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[11px] text-ink-600">{e.label}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {initialThreads.length > 0 && (
          <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-sm">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
                🟢 What students are talking about
              </p>
              <Link href="/discussions" className="text-xs font-medium text-saffron-700 hover:text-saffron-800">
                All discussions →
              </Link>
            </div>
            <ul className="mt-3 divide-y divide-ink-100">
              {initialThreads.slice(0, 5).map((th) => (
                <li key={th.id}>
                  <Link href={`/discussions/${th.id}`} className="block py-2.5 hover:bg-saffron-50/50">
                    <p className="line-clamp-2 text-sm font-medium leading-snug text-ink-900">{th.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-500">
                      {th.examShort && (
                        <span className="mr-1.5 rounded bg-ink-100 px-1 py-0.5 text-[10px] font-medium text-ink-600">
                          {th.examShort}
                        </span>
                      )}
                      <span className="font-medium text-ink-700">{th.messageCount} {th.messageCount === 1 ? t("disc.reply") : t("disc.replies")}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* ── Feature pillars: everything you need ─────────────────── */}
      <section id="features" className="border-t border-ink-200/50 bg-white py-16 sm:py-24">
        <div className="container-prose">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {t("features.title")}
            </h2>
            <p className="mt-3 text-base text-ink-600">{t("features.subtitle")}</p>
          </div>

          {(() => {
            // Each feature card is a CTA: signed-in users go straight to
            // /dashboard, signed-out users go through /login which bounces
            // back to /dashboard after auth. Keeps the landing focused on
            // converting visitors.
            const featureHref = signedIn ? "/dashboard" : "/login?callbackUrl=%2Fdashboard";
            return (
              <ul className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FeatureCard href={featureHref} icon="📚" title={t("features.pyq.title")} body={t("features.pyq.body")} />
                <FeatureCard href={featureHref} icon="📅" title={t("features.daily.title")} body={t("features.daily.body")} />
                <FeatureCard href={featureHref} icon="🎯" title={t("features.weakness.title")} body={t("features.weakness.body")} />
                <FeatureCard href={featureHref} icon="🤖" title={t("features.adaptive.title")} body={t("features.adaptive.body")} />
                <FeatureCard href={featureHref} icon="📈" title={t("features.progress.title")} body={t("features.progress.body")} />
                <FeatureCard href={featureHref} icon="💬" title={t("features.tutor.title")} body={t("features.tutor.body")} />
              </ul>
            );
          })()}
        </div>
      </section>

      {/* ── Progress demo ─────────────────────────────────────────── */}
      <section id="progress" className="bg-saffron-50/40 py-16 sm:py-24">
        <div className="container-prose">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {t("progress.title")}
            </h2>
            <p className="mt-3 text-base text-ink-600">{t("progress.subtitle")}</p>
          </div>

          <ProgressDemo
            examLabel={t("progress.demo.exam")}
            thisWeekLabel={t("progress.demo.thisweek")}
            mocksLabel={t("progress.demo.mocks")}
            questionsLabel={t("progress.demo.questions")}
            topicsLabel={t("progress.demo.topicsImproved")}
            deltaLabel={t("progress.demo.delta")}
          />
        </div>
      </section>

      {/* ── The Loop ─────────────────────────────────────────────── */}
      <section id="how" className="border-t border-ink-200/50 bg-white py-16 sm:py-20">
        <div className="container-prose">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
              {t("loop.title")}
            </h2>
            <p className="mt-3 text-base text-ink-600">{t("loop.subtitle")}</p>
          </div>

          {(() => {
            // Same CTA target as the feature cards above — every visible card on
            // the landing should route an interested visitor into the funnel.
            const loopHref = signedIn ? "/dashboard" : "/login?callbackUrl=%2Fdashboard";
            return (
              <ol className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <LoopStep href={loopHref} icon="📝" title={t("loop.s1.title")} body={t("loop.s1.body")} />
                <LoopStep href={loopHref} icon="📊" title={t("loop.s2.title")} body={t("loop.s2.body")} />
                <LoopStep href={loopHref} icon="🤖" title={t("loop.s3.title")} body={t("loop.s3.body")} />
                <LoopStep href={loopHref} icon="💬" title={t("loop.s4.title")} body={t("loop.s4.body")} />
              </ol>
            );
          })()}

          <p className="mt-10 text-center text-xs text-ink-500">
            <span className="font-medium text-ink-800">हर छात्र, एक ही मंच पर ·</span>{" "}
            Built by <a className="underline hover:text-ink-700" href="https://surgesoftware.co.in">Surge</a>
          </p>
        </div>
      </section>

      <Footer />
      </div>{/* /lg:pr-80 body wrapper */}
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Pieces
// ─────────────────────────────────────────────────────────────────────────
function SiteHeader({
  locale,
  t,
  signedIn,
}: {
  locale: any;
  t: (k: any) => string;
  signedIn: boolean;
}) {
  return (
    <header className="border-b border-ink-200/50 bg-white/70 backdrop-blur">
      <div className="container-prose flex h-16 items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 text-lg font-bold text-white">
            शि
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
        </Link>
        <div className="flex items-center gap-3">
          <LangSwitcher current={locale} />
          {signedIn ? (
            <Link href="/dashboard" className="btn-primary !py-2 !px-4 text-xs sm:text-sm">
              {t("nav.dashboard")} →
            </Link>
          ) : (
            <Link href="/login" className="btn-primary !py-2 !px-4 text-xs sm:text-sm">
              {t("nav.signin.short")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

function LoopStep({
  icon,
  title,
  body,
  href,
}: {
  icon: string;
  title: string;
  body: string;
  href: string;
}) {
  // Same routing as FeatureCard — clicking any "how it works" step pulls
  // the visitor into the signup/dashboard funnel rather than dead-ending.
  return (
    <li>
      <Link
        href={href}
        prefetch={false}
        className="group block h-full rounded-lg border border-ink-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-300"
      >
        <div className="text-3xl" aria-hidden>
          {icon}
        </div>
        <h3 className="mt-3 text-base font-semibold text-ink-900">{title}</h3>
        <p className="mt-1 text-sm leading-relaxed text-ink-600">{body}</p>
      </Link>
    </li>
  );
}

function FeatureCard({
  icon,
  title,
  body,
  href,
}: {
  icon: string;
  title: string;
  body: string;
  href: string;
}) {
  // Whole card is a Link → /dashboard (signed-in) or /login?callbackUrl=/dashboard.
  // Auto-prefetch is disabled — landing page has 6 of these + the ExamPicker grid,
  // so we don't want them all firing prefetches on first paint.
  return (
    <li>
      <Link
        href={href}
        prefetch={false}
        className="group block h-full rounded-xl border border-ink-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-300"
      >
        <div
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-saffron-100 text-2xl transition-colors group-hover:bg-saffron-200"
          aria-hidden
        >
          {icon}
        </div>
        <h3 className="mt-4 text-base font-semibold text-ink-900">{title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink-600">{body}</p>
      </Link>
    </li>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ProgressDemo — sample dashboard mock-up shown on the marketing page so
// visitors can see what their progress will actually look like. Numbers are
// hardcoded illustration; not real data.
// ─────────────────────────────────────────────────────────────────────────
const PROGRESS_TOPICS = [
  { name: "Profit & Loss",        mastery: 0.78, delta: +12, color: "bg-emerald-500" },
  { name: "Time, Speed, Distance", mastery: 0.65, delta: +8,  color: "bg-emerald-500" },
  { name: "Geometry",              mastery: 0.52, delta: +15, color: "bg-amber-500"   },
  { name: "Data Interpretation",   mastery: 0.43, delta: +4,  color: "bg-amber-500"   },
  { name: "Trigonometry",          mastery: 0.31, delta: +6,  color: "bg-rose-500"    },
] as const;

function ProgressDemo({
  examLabel,
  thisWeekLabel,
  mocksLabel,
  questionsLabel,
  topicsLabel,
  deltaLabel,
}: {
  examLabel: string;
  thisWeekLabel: string;
  mocksLabel: string;
  questionsLabel: string;
  topicsLabel: string;
  deltaLabel: string;
}) {
  return (
    <div className="mx-auto mt-12 max-w-3xl">
      {/* Frame styled like a dashboard card */}
      <div className="overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lg ring-1 ring-ink-900/5">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-ink-200 bg-ink-50/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </div>
          <p className="text-xs font-medium text-ink-500">{examLabel}</p>
          <span className="text-xs text-ink-400">●</span>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-8">
          <ul className="space-y-4">
            {PROGRESS_TOPICS.map((t) => (
              <li key={t.name}>
                <div className="flex items-baseline justify-between">
                  <p className="text-sm font-medium text-ink-900">{t.name}</p>
                  <p className="text-xs tabular-nums text-ink-500">
                    <span className="font-semibold text-ink-800">{Math.round(t.mastery * 100)}%</span>
                    <span className="mx-2 text-ink-300">·</span>
                    <span className="font-medium text-emerald-700">↑ {t.delta}%</span>{" "}
                    <span className="text-ink-400">{deltaLabel}</span>
                  </p>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-ink-100">
                  <div
                    className={`h-full rounded-full ${t.color} transition-all`}
                    style={{ width: `${Math.round(t.mastery * 100)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>

          {/* Weekly stats footer */}
          <div className="mt-7 grid grid-cols-3 divide-x divide-ink-200 rounded-lg border border-ink-200 bg-ink-50/40">
            <Stat value="3" label={mocksLabel} />
            <Stat value="47" label={questionsLabel} />
            <Stat value="18" label={topicsLabel} />
          </div>
          <p className="mt-2 text-center text-[11px] uppercase tracking-wider text-ink-400">
            {thisWeekLabel}
          </p>
        </div>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="px-3 py-3 text-center">
      <p className="text-xl font-bold text-ink-900 tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] text-ink-500">{label}</p>
    </div>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-200 bg-white py-10">
      <div className="container-prose flex flex-col items-center justify-between gap-3 text-xs text-ink-500 sm:flex-row">
        <p>© {new Date().getFullYear()} Shishya · Built by Surge Software Solutions</p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/scholarships" className="hover:text-ink-800">Scholarships</Link>
          <Link href="/ideas" className="hover:text-ink-800">Ideas board</Link>
          <a href="https://github.com/SurgeEnterpriseAI/shishya" className="hover:text-ink-800">GitHub</a>
          <a href="mailto:venumuvva@surgesoftware.co.in" className="hover:text-ink-800">Contact</a>
          <a href="https://surgesoftware.co.in" className="hover:text-ink-800">Surge</a>
        </div>
      </div>
    </footer>
  );
}
