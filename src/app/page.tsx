// / — Shishya homepage. Guided 3-step exam funnel.
//
// This IS the entry point of the site now. The older persona-first
// homepage + the older /exams catalogue have both been retired into a
// single guided funnel here at the root. /exams still 301-redirects
// here (preserving query params) so all inbound links keep working.
// All non-exam surfaces (schooling, careers, colleges, scholarships,
// ideas) still exist at their original URLs but are not promoted from
// the header until Shishya hits its first traction milestone.
//
//   Step 1   — visitor lands on /. Sees "What are you preparing for?"
//              and 10 big goal cards (Engineering, Medical, Govt jobs,
//              Banking, Civil services, Teaching, Law, MBA, Defence,
//              Olympiad). One tap → step 2.
//
//   Step 2   — ?g=<goal> in the URL. Page asks "National-level or
//              your state's exams?" via two big buttons. Auto-skipped
//              for goals that only have one scope (Banking → national
//              only; Defence → national only; Olympiad → national
//              only) — those go straight to step 3.
//
//   Step 3a  — ?g=<goal>&s=national. Lists the national exams under
//              that goal as cards. Tap → /exams/{CODE}.
//   Step 3b  — ?g=<goal>&s=state. Shows the state picker; tap a state
//              to add &st=<code>; that variant lists state-specific
//              exams under that goal.
//
// The left rail (Upcoming exam dates) and right rail (Live discussions)
// stay across all steps so the social proof never disappears as the
// visitor drills down.

import type { Metadata } from "next";
import Link from "next/link";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { Header } from "@/components/Header";
import type { ExamCard } from "@/components/ExamPicker";
import { computeExamTags } from "@/lib/exam-tags";
import { DiscussionsSidebar, type ThreadItem } from "@/components/DiscussionsSidebar";
import { LiveCountersStrip } from "@/components/LiveCounters";
import { HomeSearch } from "@/components/HomeSearch";
import { HomeFeatureCards } from "@/components/HomeFeatureCards";
import { HomeChatRouter } from "@/components/HomeChatRouter";
import { PageTour } from "@/components/PageTour";
import { UpcomingExamsSidebar, type UpcomingEvent, type CalendarBucket } from "@/components/UpcomingExamsSidebar";
import { buildCuratedSections, type SectionTitleKey } from "@/lib/exam-browse";
import { resolvePhase, istDayNumber } from "@/lib/exam-phase";
import { EXAM_GOALS, findGoal, matchesGoal, type ExamGoal } from "@/data/exam-goals";
import { INDIAN_STATES } from "@/lib/states";
import type { ExamTag } from "@/lib/exam-tags";

// Step-specific metadata so each funnel state has its own title/OG.
// Useful for share-back links ("here's the page for engineering state
// exams in Maharashtra") and lets Search Console show distinct titles
// for the high-traffic permutations.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; s?: string; st?: string }>;
}): Promise<Metadata> {
  const sp = await searchParams;
  const goal = findGoal(sp.g);
  const scope = sp.s === "state" ? "state" : sp.s === "national" ? "national" : null;
  const state = sp.st ? INDIAN_STATES.find((s) => s.code === sp.st!.toUpperCase()) : null;

  let title = "Shishya — Free exam prep for India's entrance & government exams";
  let description =
    "163 entrance and government exams in India. Tell us what you're preparing for — engineering, medical, govt jobs, banking, civil services — and we'll show you the national and state-level options. Free mocks, PYQ, study help in every Indian language.";

  if (goal && !scope) {
    title = `${goal.label} entrance exams in India — Shishya`;
    description = `${goal.blurb} See national + state-level options for ${goal.label.toLowerCase()} and start prepping for free in your language.`;
  } else if (goal && scope === "national") {
    title = `National ${goal.label.toLowerCase()} entrance exams — Shishya`;
    description = `All national-level ${goal.label.toLowerCase()} exams in India. Free mocks, previous-year papers and verified study help.`;
  } else if (goal && scope === "state" && state) {
    title = `${goal.label} exams in ${state.name} — Shishya`;
    description = `${state.name}'s state-level ${goal.label.toLowerCase()} entrance and recruitment exams. Free prep, in your language.`;
  } else if (goal && scope === "state") {
    title = `${goal.label} state exams — pick your state | Shishya`;
    description = `Every state's ${goal.label.toLowerCase()} entrance and recruitment exams in one place.`;
  }

  return {
    title,
    description,
    alternates: { canonical: "https://shishya.in/" },
    openGraph: {
      title,
      description,
      url: "https://shishya.in/",
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
  };
}

// Fallback list — used when the DB is unreachable so the public
// page still renders something useful. ~35 exams covering every
// goal tile so degraded mode never shows "0 exams" anywhere.
// See src/data/fallback-exams.ts for the rationale.
import { FALLBACK_EXAMS } from "@/data/fallback-exams";

async function loadExamsRaw(): Promise<ExamCard[]> {
  try {
    const rows = await prisma.exam.findMany({
      where: { active: true, category: { not: "SCHOOL_BOARD" } },
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
  } catch (err) {
    // Log loudly so Vercel observability picks it up. Returning the
    // (now-comprehensive) fallback keeps the funnel visually healthy.
    console.error("[shishya/loadExams] DB query failed, using fallback:", err);
    return FALLBACK_EXAMS;
  }
}

const loadExams = unstable_cache(loadExamsRaw, ["home-exams-v1"], {
  revalidate: 60,
  tags: ["exams"],
});

async function loadInitialThreadsRaw(): Promise<ThreadItem[]> {
  try {
    const rows = await prisma.discussion.findMany({
      orderBy: [{ pinned: "desc" }, { lastActivityAt: "desc" }],
      take: 12,
      include: { exam: { select: { shortName: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      examShort: r.exam?.shortName ?? null,
      authorName: r.authorName,
      messageCount: r.messageCount,
      pinned: r.pinned,
      lastActivityAt: r.lastActivityAt.toISOString(),
      isSeed: r.isSeed,
    }));
  } catch (err) {
    console.error("[shishya/loadInitialThreads] DB query failed:", err);
    return [];
  }
}
// v3 cache key — busts the v2 cache so the new isSeed field flows
// through to the sidebar immediately on next deploy.
const loadInitialThreads = unstable_cache(
  loadInitialThreadsRaw,
  ["home-discussions-v3"],
  { revalidate: 60, tags: ["discussions"] },
);

async function loadUpcomingEventsRaw(): Promise<{ events: UpcomingEvent[]; defaultTab: CalendarBucket }> {
  try {
    // Window: 60 days past → upcoming, classified into three tabs
    // with IST calendar-day math:
    //   concluded — exam days in the last 7 days (incl. today after
    //               18:00 IST, when resolvePhase flips LIVE→REACTIONS).
    //               The answer-key / expected-cutoff rush window.
    //   upcoming  — today (pre-18:00) + all future events of any kind.
    //   past      — exam days 8-60 days back; their verdict/cutoff
    //               analyses stay reachable instead of vanishing.
    // Past NON-exam-day rows ("admit card released") are noise — dropped.
    const now = new Date();
    const nowDay = istDayNumber(now);
    const from = new Date(now.getTime() - 60.5 * 86_400_000);
    // IMPORTANT: past exam-day rows must include ARCHIVED ones. The
    // refresh-exam-data cron archives dates a few days after they pass,
    // so an archivedAt:null filter would slowly drain the Concluded/
    // Past tabs to empty as the cron does its job. Live rows stay the
    // only source for today/future (archived future rows are replaced
    // cycles); past buckets take both, deduped below preferring live.
    const rowsRaw = await prisma.examImportantDate.findMany({
      where: {
        date: { gte: from },
        exam: { active: true },
        OR: [{ archivedAt: null }, { isExamDay: true }],
      },
      orderBy: { date: "asc" },
      take: 800, // over-fetch — bucketed + deduped + capped below
      include: { exam: { select: { id: true, code: true, shortName: true } } },
    });
    type RawRow = (typeof rowsRaw)[number];
    const classify = (r: RawRow): CalendarBucket | null => {
      const dDay = istDayNumber(r.date);
      if (dDay >= nowDay) {
        // Today/future: only live rows — an archived future/today row is
        // a superseded cycle the cron already replaced.
        if (r.archivedAt) return null;
        if (dDay > nowDay) return "upcoming";
        if (!r.isExamDay) return "upcoming";
        return resolvePhase(r.date, now) === "REACTIONS" ? "concluded" : "upcoming";
      }
      if (!r.isExamDay) return null; // past non-exam-day = noise
      return nowDay - dDay <= 7 ? "concluded" : "past";
    };
    const byBucket: Record<CalendarBucket, RawRow[]> = { concluded: [], upcoming: [], past: [] };
    // Dedupe past/concluded on (exam, IST day) — the same exam day can
    // exist as both a live row and an archived copy; prefer the live one.
    const seenPast = new Map<string, RawRow>();
    for (const r of rowsRaw) {
      const b = classify(r);
      if (!b) continue;
      if (b === "upcoming") {
        byBucket.upcoming.push(r);
        continue;
      }
      const key = `${b}:${r.examId}:${istDayNumber(r.date)}`;
      const prev = seenPast.get(key);
      if (!prev || (prev.archivedAt && !r.archivedAt)) seenPast.set(key, r);
    }
    for (const r of seenPast.values()) {
      const b = classify(r);
      if (b && b !== "upcoming") byBucket[b].push(r);
    }
    byBucket.concluded.sort((a, b) => a.date.getTime() - b.date.getTime());
    byBucket.past.sort((a, b) => a.date.getTime() - b.date.getTime());
    // Upcoming stays soonest-first (query order); the two backward-
    // looking tabs read newest-first.
    byBucket.concluded.reverse();
    byBucket.past.reverse();
    const buckets: { bucket: CalendarBucket; row: RawRow }[] = [
      ...byBucket.concluded.slice(0, 15).map((row) => ({ bucket: "concluded" as const, row })),
      ...byBucket.upcoming.slice(0, 30).map((row) => ({ bucket: "upcoming" as const, row })),
      ...byBucket.past.slice(0, 20).map((row) => ({ bucket: "past" as const, row })),
    ];
    const rows = buckets.map((b) => b.row);
    const bucketById = new Map(buckets.map((b) => [b.row.id, b.bucket]));
    // Smart default: land on Concluded only while the answer-key rush
    // is real (an exam ran within the last ~3 days) — else Upcoming.
    const defaultTab: CalendarBucket = byBucket.concluded.some(
      (r) => nowDay - istDayNumber(r.date) <= 3,
    )
      ? "concluded"
      : "upcoming";

    // For exam-day rows, attach the matching ExamPhaseArticle's
    // summarySnippet so the sidebar renders the AI-written teaser
    // instead of a bare "Live" pill. Rows outside the live phase
    // windows (Concluded day 4-7, the whole Past tab) look up their
    // REACTIONS article — the verdict/cutoff analysis outlives the
    // 3-day phase window. Single batched query covers every event.
    const lookupPhaseFor = (r: RawRow): ReturnType<typeof resolvePhase> => {
      if (!r.isExamDay) return null;
      const live = resolvePhase(r.date, now);
      if (live) return live;
      return bucketById.get(r.id) !== "upcoming" ? "REACTIONS" : null;
    };
    const phaseLookups = rows
      .map((r) => ({ row: r, phase: lookupPhaseFor(r) }))
      .filter((x): x is { row: RawRow; phase: NonNullable<ReturnType<typeof resolvePhase>> } => x.phase !== null);
    let snippetsByKey = new Map<string, string>();
    if (phaseLookups.length > 0) {
      const examIds = [...new Set(phaseLookups.map((x) => x.row.exam.id))];
      const articles = await prisma.examPhaseArticle.findMany({
        // archivedAt: null → only the live version's snippet feeds the
        // sidebar chip (phase articles are now versioned).
        where: { examId: { in: examIds }, archivedAt: null },
        select: { examId: true, phase: true, summarySnippet: true },
      });
      snippetsByKey = new Map(
        articles
          .filter((a) => a.summarySnippet)
          .map((a) => [`${a.examId}:${a.phase}`, a.summarySnippet as string]),
      );
    }

    const events = rows.map((r) => {
      const phase = lookupPhaseFor(r);
      return {
        id: r.id,
        examCode: r.exam.code,
        examShort: r.exam.shortName,
        date: r.date.toISOString(),
        label: r.label,
        isExamDay: r.isExamDay,
        phaseSnippet: phase ? (snippetsByKey.get(`${r.exam.id}:${phase}`) ?? null) : null,
        bucket: bucketById.get(r.id) ?? ("upcoming" as CalendarBucket),
      };
    });
    return { events, defaultTab };
  } catch (err) {
    // Fall back to the static next-6-months list so the left rail
    // never shows "No upcoming dates announced." just because Vercel
    // couldn't reach Neon for a few seconds. The static list is
    // sourced from each exam body's official notification — same
    // policy as the live data — so it's accurate, just less fresh.
    console.error("[shishya/loadUpcomingEvents] DB query failed, using fallback:", err);
    const { getFallbackEvents } = await import("@/data/fallback-events");
    return { events: getFallbackEvents(), defaultTab: "upcoming" as CalendarBucket };
  }
}
// v4 — busts the v3 cache: the loader now returns { events, defaultTab }
// with the three-tab bucket field attached to every event.
const loadUpcomingEvents = unstable_cache(
  loadUpcomingEventsRaw,
  ["home-upcoming-v5"],
  { revalidate: 300, tags: ["exam-dates"] },
);

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; s?: string; st?: string }>;
}) {
  const sp = await searchParams;
  const { t } = await getT();

  const [signedIn, exams, initialThreads, calendar] = await Promise.all([
    auth().then((s) => Boolean(s?.user)).catch(() => false),
    loadExams(),
    loadInitialThreads(),
    loadUpcomingEvents(),
  ]);
  const upcomingEvents = calendar.events;

  // SEO/AEO: schema.org Event markup for the upcoming exam days —
  // Google event rich-results + a machine-readable date list AI
  // engines can quote directly ("when is the next SSC CGL exam?").
  const jsonLdEvents = upcomingEvents
    .filter((e) => (e.bucket ?? "upcoming") === "upcoming" && e.isExamDay)
    .slice(0, 15);
  const examDatesJsonLd =
    jsonLdEvents.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          name: "Upcoming Indian government exam dates",
          description:
            "Official exam-day calendar for Indian government and entrance exams, with free mock tests, syllabus and cutoff analysis for each.",
          itemListElement: jsonLdEvents.map((e, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "Event",
              name: `${e.examShort} — ${e.label}`,
              startDate: e.date.slice(0, 10),
              eventStatus: "https://schema.org/EventScheduled",
              eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
              location: {
                "@type": "Place",
                name: "India (multiple centres)",
                address: { "@type": "PostalAddress", addressCountry: "IN" },
              },
              about: { "@type": "Thing", name: e.examShort },
              url: `https://shishya.in/exams/${e.examCode}`,
            },
          })),
        }
      : null;

  // ── Funnel state from URL ──────────────────────────────────────────
  const goal = findGoal(sp.g);
  const requestedScope: "national" | "state" | null =
    sp.s === "state" ? "state" : sp.s === "national" ? "national" : null;
  const stateCode = sp.st?.toUpperCase() ?? null;

  // ── Match exams to the active goal so we can:
  //   (a) count for the National vs State buttons in Step 2
  //   (b) render the actual list in Step 3
  // Empty array when no goal is selected.
  const goalExams: ExamCard[] = goal
    ? exams.filter((e) => matchesGoal(e.tags as ExamTag[], goal))
    : [];

  const nationalExams = goalExams.filter((e) => e.tags.includes("national"));
  const stateExams = goalExams.filter((e) => e.tags.includes("state"));

  // If the goal only has one scope (e.g. Banking is national-only),
  // auto-resolve `scope` so we skip Step 2 entirely.
  const effectiveScope: "national" | "state" | null =
    requestedScope ??
    (goal
      ? stateExams.length === 0
        ? "national"
        : nationalExams.length === 0
          ? "state"
          : null
      : null);

  // ── Decide which step renders ──────────────────────────────────────
  type StepKind = "goals" | "scope" | "state-picker" | "exam-list";
  let step: StepKind;
  if (!goal) step = "goals";
  else if (effectiveScope === null) step = "scope";
  else if (effectiveScope === "state" && !stateCode) step = "state-picker";
  else step = "exam-list";

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />

      <LiveCountersStrip
        labels={{
          preparingNow:      t("live.preparingNow"),
          inMockNow:         t("live.inMockNow"),
          activeDiscussions: t("disc.title"),
          totalEver:         t("live.totalEver"),
        }}
      />

      {examDatesJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(examDatesJsonLd) }}
        />
      )}
      <UpcomingExamsSidebar events={upcomingEvents} defaultTab={calendar.defaultTab} />

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

      {/* Floating chat-router: bottom-left FAB that asks "What are you
          looking for?" and POSTs the answer to /api/chat-route. Claude
          interprets intent and the modal navigates to the right page
          (or surfaces a manual button on low-confidence matches). The
          right-side bottom corner is already owned by the Discussions
          FAB, hence we anchor this one left. */}
      <HomeChatRouter />

      {/* First-visit coach-mark tour — only Step 1 (goals picker)
          gets a guided walk. Deeper funnel steps don't need one
          since the visitor has already committed to a path. */}
      {step === "goals" && (
        <PageTour
          tourId="home-v1"
          steps={[
            {
              key: "welcome",
              icon: "👋",
              title: "Welcome to Shishya",
              body: "30 seconds to find your exam. Let me show you the 3 ways to get there — search, browse, or describe what you want.",
            },
            {
              key: "search",
              anchor: "home-search",
              title: "Already know your exam? Just type it",
              body: "Try 'SSC CGL' or 'NEET' or 'मेरी UPSC' — search-as-you-type, picks straight to the exam.",
              icon: "🔍",
            },
            {
              key: "categories",
              anchor: "home-categories",
              title: "Or browse by category",
              body: "Most popular this week · Government jobs · Engineering · Banking. Tap any exam to open it.",
              icon: "📚",
            },
            {
              key: "goals",
              anchor: "home-goals",
              title: "Or pick a goal",
              body: "If you only know broadly — 'I want a banking job', 'I'm prepping medical' — pick a tile and we'll narrow down national vs your state.",
              icon: "🎯",
            },
            {
              key: "chat",
              anchor: "home-chat-fab",
              placement: "top",
              title: "Or just describe it",
              body: "Stuck? Tap 'What are you looking for?' bottom-left. Type in any language — Claude reads your intent and takes you to the right page.",
              icon: "🤖",
            },
            {
              key: "done",
              icon: "✓",
              title: "That's it. You're set",
              body: "Pick any path above. Every action is free. We track your weak areas as you take mocks and serve adaptive practice that targets them.",
            },
          ]}
        />
      )}

      <div className="lg:pl-80 lg:pr-80">
        <section className="container-prose pt-10 pb-20 sm:pt-14">
          <Breadcrumbs goal={goal} scope={effectiveScope} stateCode={stateCode} />

          {step === "goals" && <StepGoals exams={exams} t={t} signedIn={signedIn} />}
          {step === "scope" && goal && (
            <StepScope
              goal={goal}
              nationalCount={nationalExams.length}
              stateCount={stateExams.length}
            />
          )}
          {step === "state-picker" && goal && (
            <StepStatePicker goal={goal} stateExams={stateExams} />
          )}
          {step === "exam-list" && goal && effectiveScope && (
            <StepExamList
              goal={goal}
              scope={effectiveScope}
              stateCode={stateCode}
              exams={effectiveScope === "national" ? nationalExams : stateExams}
            />
          )}

          {!signedIn && step !== "goals" && (
            <div className="mt-14 text-center">
              <Link href="/login?callbackUrl=%2Fdashboard" className="btn-primary">
                Free sign-up — start prepping
              </Link>
              <p className="mt-2 text-xs text-ink-500">
                Verified by students who&apos;ve cleared the same path · in your language
              </p>
            </div>
          )}

          {/* ── Mobile-only inline rails ──────────────────────────────
              On lg+ the upcoming-exams panel mounts as a fixed left
              rail and discussions as a fixed right rail. Below lg
              both rails are hidden (UpcomingExamsSidebar has no
              mobile FAB at all; DiscussionsSidebar has one but it's
              easy to miss). On phones / small tablets we surface the
              same content inline here as horizontal-scroll + vertical
              list cards, so visitors see the social-proof + calendar
              without hunting for a FAB. */}
          <MobileInlineRails events={upcomingEvents} threads={initialThreads} />
        </section>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────
// MobileInlineRails — calendar + discussions surfaced inline on
// viewports < lg (where the fixed side rails are hidden). Server-
// rendered; data comes from the same loaders as the desktop rails.
// ─────────────────────────────────────────────────────────────────────
function MobileInlineRails({
  events,
  threads,
}: {
  events: UpcomingEvent[];
  threads: ThreadItem[];
}) {
  // The horizontal strip only carries the fresh windows — just-concluded
  // (answer-key rush) first, then upcoming. The Past tab is a desktop-
  // rail affordance; on mobile it would push live dates off-screen.
  const stripEvents = events.filter((e) => (e.bucket ?? "upcoming") !== "past");
  if (stripEvents.length === 0 && threads.length === 0) return null;
  return (
    <section className="mt-14 space-y-5 lg:hidden">
      {stripEvents.length > 0 && (
        <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-700">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-saffron-500 align-middle" aria-hidden />
              Exam calendar
            </p>
            <span className="text-[10px] text-ink-400">{stripEvents.length} dates</span>
          </div>
          <ul className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1">
            {stripEvents.slice(0, 12).map((e) => (
              <li key={e.id} className="shrink-0">
                <Link
                  href={`/exams/${e.examCode}`}
                  prefetch={false}
                  className={`block w-48 rounded-md border px-3 py-2 transition-colors hover:border-saffron-400 ${
                    e.isExamDay
                      ? "border-saffron-300 bg-saffron-50/60"
                      : "border-ink-200 bg-white"
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-ink-900">{e.examShort}</p>
                  <p className={`mt-0.5 text-[11px] font-medium tabular-nums ${
                    e.isExamDay ? "text-saffron-800" : "text-ink-600"
                  }`}>
                    {new Date(e.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    {e.isExamDay && (
                      <span
                        className={`ml-1.5 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
                          e.bucket === "concluded"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-saffron-200 text-saffron-900"
                        }`}
                      >
                        {e.bucket === "concluded" ? "Done" : "Exam"}
                      </span>
                    )}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] text-ink-600">{e.label}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      {threads.length > 0 && (
        <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-sm">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
              <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 align-middle" aria-hidden />
              What students are talking about
            </p>
            <Link
              href="/discussions"
              prefetch={false}
              className="text-[10px] font-medium text-saffron-700 hover:text-saffron-800"
            >
              All →
            </Link>
          </div>
          <ul className="mt-2 divide-y divide-ink-100">
            {threads.slice(0, 6).map((th) => (
              <li key={th.id}>
                <Link
                  href={`/discussions/${th.id}`}
                  prefetch={false}
                  className="block py-2.5 hover:bg-saffron-50/40"
                >
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-ink-900">
                    {th.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-ink-500">
                    {th.examShort && (
                      <span className="mr-1.5 rounded bg-ink-100 px-1 py-0.5 text-[10px] font-medium text-ink-600">
                        {th.examShort}
                      </span>
                    )}
                    <span className="font-medium text-ink-700">
                      {th.messageCount} {th.messageCount === 1 ? "reply" : "replies"}
                    </span>
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 1 — Goal picker (the landing state).
// ─────────────────────────────────────────────────────────────────────
function StepGoals({
  exams,
  t,
  signedIn,
}: {
  exams: ExamCard[];
  t: (key: SectionTitleKey) => string;
  signedIn: boolean;
}) {
  // 27 May 2026 funnel telemetry — 96 signups, 0 mock attempts in
  // last 24h. The page leads visitors into a goal funnel but never
  // explicitly asks them to sign up + take their first mock. Banner
  // below the hero fills that gap for signed-out visitors. It sits
  // BETWEEN hero and search so visitors who don't want to commit
  // still see search + cards immediately below.
  // Per-goal exam count for the tile sub-label (e.g. "32 exams").
  // We compute it here rather than in the data file so it stays
  // accurate as exams are added/removed from the DB.
  const countFor = (goal: ExamGoal) =>
    exams.filter((e) => matchesGoal(e.tags as ExamTag[], goal)).length;

  // Curated category sections rendered under the goal cards. We pull
  // 4 high-signal sections from the full set buildCuratedSections
  // would normally return — keeps the page focused while still giving
  // visitors who think "I want a popular government job" / "show me
  // banking exams" a one-tap entry that bypasses the goal funnel.
  const sectionPriority: SectionTitleKey[] = [
    "land.section.popular",
    "land.section.govt",
    "land.section.engineering",
    "land.section.banking",
  ];
  const allSections = buildCuratedSections(exams, t);
  const featuredSections = sectionPriority
    .map((key) => allSections.find((s) => t(key) === s.title))
    .filter((s): s is NonNullable<typeof s> => s !== undefined);

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-saffron-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-saffron-800">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-saffron-500" aria-hidden />
          Step 1 of 2
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          Pick your exam. We do the rest.
        </h1>
        <p className="mt-4 text-base text-ink-600 sm:text-lg">
          Take mocks → Shishya spots your weak areas → serves adaptive
          practice that targets them. Plus cutoffs, news and last-minute
          checklists for every exam.{" "}
          <span className="font-medium text-ink-800">
            Bet yours is covered.
          </span>
        </p>
        {/* Optional path for the undecided — "I want a govt job but don't
            know which exam". Zero friction for those who already know
            their exam (they use search / goal cards below). */}
        <p className="mt-4 text-sm">
          <span className="text-ink-500">Not sure which exam?</span>{" "}
          <Link href="/find-your-exam" className="font-semibold text-saffron-700 hover:text-saffron-800 hover:underline">
            Find the government exams that fit you →
          </Link>
        </p>
      </div>

      {/* ── Signed-out signup CTA banner ──────────────────────────
          Visitors who scrolled past the hero see this; one tap →
          /login → /onboarding → /dashboard with a recommended
          first mock. Skipped for signed-in users (they don't need
          a sign-up CTA, they need their dashboard). */}
      {!signedIn && (
        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5 shadow-sm sm:p-6">
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
                ✦ Free · No credit card · 22 Indian languages
              </p>
              <p className="mt-1.5 text-base font-bold text-ink-900 sm:text-lg">
                Sign up free → take your first adaptive mock
              </p>
              <p className="mt-1 text-sm text-ink-600">
                Personalised practice in 60 seconds. We pick the 3-5 exams
                that match your stage and serve mocks that target your weak
                topics.
              </p>
            </div>
            <Link
              href="/login?callbackUrl=%2Fdashboard"
              className="shrink-0 rounded-md bg-saffron-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
            >
              Sign up — start prepping →
            </Link>
          </div>
          {/* No-friction on-ramp: the AI tutor is now open to signed-out
              visitors, but the signup banner never said so. Surfacing it
              here gives hesitant visitors a zero-commitment way to feel the
              product (ask a real exam question, no login) — and a softer
              path to conversion. (Gemini growth suggestion: promote the
              ungated AI tutor as a signup hook.) */}
          <div className="mt-3 border-t border-saffron-200/70 pt-3 text-center sm:text-left">
            <Link
              href="/chat?general=1"
              className="text-sm font-medium text-saffron-700 transition-colors hover:text-saffron-900"
            >
              Not ready to sign up? Ask Shishya — our free AI tutor, no login needed →
            </Link>
          </div>
        </div>
      )}

      {/* ── Search-by-name (highest-intent entry) ─────────────────
          Visitors who already know "I want SSC CGL" skip the funnel
          entirely. Search-as-you-type, client-side filter against
          the full ~165-exam list passed from the server. */}
      <div data-tour="home-search">
        <HomeSearch exams={exams} />
      </div>

      {/* ── Curated category sections (browse by topic) ──────────
          Visitors who don't know an exact exam but think in
          categories ("show me popular government jobs", "what are
          the engineering entrances"). Promoted above the goal-card
          funnel because top-of-funnel scanning works better than
          choose-a-goal commitment for most first-time visitors. */}
      {featuredSections.length > 0 && (
        <div data-tour="home-categories" className="mt-12 space-y-10">
          <p className="text-center text-xs font-semibold uppercase tracking-wider text-ink-500">
            Or browse by category
          </p>
          {featuredSections.map((section) => (
            <CategorySection key={section.id} section={section} />
          ))}
        </div>
      )}

      {/* ── Goal-card funnel (commit to a goal → narrow down) ────
          For visitors who DO want guided narrowing — pick a goal,
          then national/state, then specific exam. Lives below the
          search + categories so the page leads with low-commitment
          scanning and offers the funnel as the deeper path. */}
      <p className="mt-16 text-center text-xs font-semibold uppercase tracking-wider text-ink-500">
        Or pick a goal
      </p>

      {/* Grid columns: the page has 320px fixed rails on both sides
          at lg+ (pl-80 pr-80 = 640px total), so the middle column at
          typical laptop widths (1366-1440px) is only ~730-800px. A
          3-column grid here would squeeze each card to ~240px, which
          wrapped the blurb 2-words-per-line. Stay at 2-col through
          xl and only go 3-wide at 2xl (1536px+) where there's actually
          breathing room. */}
      <ul data-tour="home-goals" className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {EXAM_GOALS.map((goal) => {
          const count = countFor(goal);
          return (
            <li key={goal.slug}>
              <Link
                href={`/?g=${goal.slug}`}
                prefetch={false}
                className="group flex h-full items-start gap-4 rounded-xl border border-ink-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-300"
              >
                <span className="text-3xl" aria-hidden>
                  {goal.icon}
                </span>
                <span className="flex-1">
                  <span className="block text-base font-semibold text-ink-900">
                    {goal.label}
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-ink-600">
                    {goal.blurb}
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-saffron-700">
                    {count} exam{count === 1 ? "" : "s"}
                    <span aria-hidden>→</span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ── 6 feature cards: "what we actually do" ───────────────
          Surfaces the platform's flows in plain language so
          visitors who scrolled past the funnel see HOW Shishya
          helps, not just WHAT it asks for. Each card is a Link
          into the dashboard / signed-out users get bounced
          through /login first. */}
      <HomeFeatureCards signedIn={signedIn} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Single curated category section (e.g. "Popular exams", "Banking").
// Renders top N exams in a responsive grid of compact cards.
// ─────────────────────────────────────────────────────────────────────
function CategorySection({
  section,
}: {
  section: { id: string; title: string; exams: ExamCard[]; totalCount: number };
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-ink-900">{section.title}</h3>
        {section.totalCount > section.exams.length && (
          <span className="text-xs text-ink-500">
            Showing {section.exams.length} of {section.totalCount}
          </span>
        )}
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {section.exams.map((e) => (
          <li key={e.code}>
            <Link
              href={`/exams/${e.code}`}
              prefetch={false}
              className="block rounded-lg border border-ink-200 bg-white px-3 py-2.5 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
            >
              <p className="truncate text-sm font-semibold text-ink-900">
                {e.shortName}
              </p>
              {e.candidatesPerYear && e.candidatesPerYear > 0 && (
                <p className="mt-0.5 text-[11px] text-ink-500">
                  {formatCandidateCount(e.candidatesPerYear)} / year
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function formatCandidateCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return n.toLocaleString("en-IN");
}

// ─────────────────────────────────────────────────────────────────────
// Step 2 — National vs State scope chooser.
// ─────────────────────────────────────────────────────────────────────
function StepScope({
  goal,
  nationalCount,
  stateCount,
}: {
  goal: ExamGoal;
  nationalCount: number;
  stateCount: number;
}) {
  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-saffron-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-saffron-800">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-saffron-500" aria-hidden />
          Step 2 of 2
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          <span aria-hidden>{goal.icon}</span> {goal.label} — where?
        </h1>
        <p className="mt-4 text-base text-ink-600 sm:text-lg">
          Do you want a national-level exam (same paper across India) or
          your own state&apos;s exam?
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
        <Link
          href={`/?g=${goal.slug}&s=national`}
          prefetch={false}
          className="group flex flex-col items-start gap-2 rounded-xl border-2 border-ink-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-300"
        >
          <span className="text-3xl" aria-hidden>🇮🇳</span>
          <span className="text-lg font-semibold text-ink-900">National exams</span>
          <span className="text-sm leading-snug text-ink-600">
            One paper, all-India. Conducted by central bodies (UPSC, NTA,
            SSC, IBPS, …).
          </span>
          <span className="mt-1 text-xs font-medium text-saffron-700">
            {nationalCount} exam{nationalCount === 1 ? "" : "s"} →
          </span>
        </Link>
        <Link
          href={`/?g=${goal.slug}&s=state`}
          prefetch={false}
          className="group flex flex-col items-start gap-2 rounded-xl border-2 border-ink-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-300"
        >
          <span className="text-3xl" aria-hidden>📍</span>
          <span className="text-lg font-semibold text-ink-900">My state&apos;s exams</span>
          <span className="text-sm leading-snug text-ink-600">
            Conducted by your state government / PSC / SSC. Pick the
            state next.
          </span>
          <span className="mt-1 text-xs font-medium text-saffron-700">
            {stateCount} exam{stateCount === 1 ? "" : "s"} across India →
          </span>
        </Link>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 3a — State picker (only shown after scope=state).
// ─────────────────────────────────────────────────────────────────────
function StepStatePicker({
  goal,
  stateExams,
}: {
  goal: ExamGoal;
  stateExams: ExamCard[];
}) {
  // Count exams per state code so we can dim states with zero options.
  const byState = new Map<string, number>();
  for (const e of stateExams) {
    if (!e.state) continue;
    byState.set(e.state, (byState.get(e.state) ?? 0) + 1);
  }
  const ordered = INDIAN_STATES.map((s) => ({
    ...s,
    examCount: byState.get(s.code) ?? 0,
  })).sort((a, b) => {
    if ((a.examCount > 0) !== (b.examCount > 0)) return b.examCount - a.examCount;
    return a.name.localeCompare(b.name);
  });

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-saffron-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-saffron-800">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-saffron-500" aria-hidden />
          Pick your state
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          {goal.label} — which state?
        </h1>
        <p className="mt-4 text-base text-ink-600">
          We&apos;ll show {goal.label.toLowerCase()} exams conducted by your
          state&apos;s government / PSC / board.
        </p>
      </div>

      <ul className="mt-10 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {ordered.map((s) => {
          const disabled = s.examCount === 0;
          return (
            <li key={s.code}>
              {disabled ? (
                <div className="block cursor-not-allowed rounded-lg border border-ink-100 bg-ink-50/40 px-4 py-3 opacity-60">
                  <p className="text-sm font-medium text-ink-500">{s.name}</p>
                  <p className="mt-0.5 text-[11px] text-ink-400">No exam yet</p>
                </div>
              ) : (
                <Link
                  href={`/?g=${goal.slug}&s=state&st=${s.code}`}
                  prefetch={false}
                  className="block rounded-lg border border-ink-200 bg-white px-4 py-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/60"
                >
                  <p className="text-sm font-semibold text-ink-900">{s.name}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-saffron-700">
                    {s.examCount} exam{s.examCount === 1 ? "" : "s"} →
                  </p>
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 3b — Final exam list (either national-level or state-specific).
// ─────────────────────────────────────────────────────────────────────
function StepExamList({
  goal,
  scope,
  stateCode,
  exams,
}: {
  goal: ExamGoal;
  scope: "national" | "state";
  stateCode: string | null;
  exams: ExamCard[];
}) {
  const state = stateCode ? INDIAN_STATES.find((s) => s.code === stateCode) : null;
  const filtered = scope === "state" && stateCode
    ? exams.filter((e) => e.state === stateCode)
    : exams;

  const heading =
    scope === "state" && state
      ? `${goal.label} exams in ${state.name}`
      : scope === "national"
        ? `National ${goal.label.toLowerCase()} exams`
        : `${goal.label} exams`;

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
          {heading}
        </h1>
        <p className="mt-3 text-base text-ink-600">
          {filtered.length === 0
            ? "No exams in this slot yet — try a different state or the national-level option."
            : `${filtered.length} exam${filtered.length === 1 ? "" : "s"} — tap any to see syllabus, dates, mocks and discussions.`}
        </p>
      </div>

      {filtered.length > 0 && (
        <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {filtered
            .slice()
            .sort((a, b) => (b.candidatesPerYear ?? 0) - (a.candidatesPerYear ?? 0))
            .map((e) => (
              <li key={e.code}>
                <Link
                  href={`/exams/${e.code}`}
                  prefetch={false}
                  className="group flex h-full items-start justify-between gap-3 rounded-xl border border-ink-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-300"
                >
                  <span className="flex-1">
                    <span className="block text-base font-semibold text-ink-900">
                      {e.shortName}
                    </span>
                    <span className="mt-1 block text-sm leading-snug text-ink-600">
                      {e.name}
                    </span>
                    {e.candidatesPerYear && e.candidatesPerYear > 0 && (
                      <span className="mt-2 block text-[11px] text-ink-500">
                        {formatCandidates(e.candidatesPerYear)} candidates / year
                      </span>
                    )}
                  </span>
                  <span
                    className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                      e.live
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-ink-100 text-ink-600"
                    }`}
                  >
                    {e.live ? "Live" : "Coming"}
                  </span>
                </Link>
              </li>
            ))}
        </ul>
      )}

      {scope === "state" && state && (
        <p className="mt-8 text-center text-xs text-ink-500">
          <Link
            href={`/?g=${goal.slug}&s=state`}
            className="font-medium text-saffron-700 hover:underline"
          >
            ← Pick a different state
          </Link>
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Breadcrumb — shown at the top of every step EXCEPT the goals page
// (which is the root). Lets visitors hop back without using browser back.
// ─────────────────────────────────────────────────────────────────────
function Breadcrumbs({
  goal,
  scope,
  stateCode,
}: {
  goal: ExamGoal | null;
  scope: "national" | "state" | null;
  stateCode: string | null;
}) {
  if (!goal) return null;
  const state = stateCode ? INDIAN_STATES.find((s) => s.code === stateCode) : null;
  return (
    <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-ink-500" aria-label="Breadcrumb">
      <Link href="/" className="font-medium text-saffron-700 hover:underline">
        All exams
      </Link>
      <span aria-hidden>›</span>
      {scope ? (
        <Link
          href={`/?g=${goal.slug}`}
          className="font-medium text-saffron-700 hover:underline"
        >
          {goal.label}
        </Link>
      ) : (
        <span className="font-medium text-ink-700">{goal.label}</span>
      )}
      {scope && (
        <>
          <span aria-hidden>›</span>
          {state ? (
            <Link
              href={`/?g=${goal.slug}&s=${scope}`}
              className="font-medium text-saffron-700 hover:underline"
            >
              {scope === "national" ? "National" : "By state"}
            </Link>
          ) : (
            <span className="font-medium text-ink-700">
              {scope === "national" ? "National" : "By state"}
            </span>
          )}
        </>
      )}
      {state && (
        <>
          <span aria-hidden>›</span>
          <span className="font-medium text-ink-700">{state.name}</span>
        </>
      )}
    </nav>
  );
}

function formatCandidates(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toLocaleString("en-IN");
}
