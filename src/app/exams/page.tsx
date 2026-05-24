// /exams — guided 3-step funnel.
//
// Replaces the older "163-exam catalogue + search box" page with a
// conversational picker that mirrors how students actually think:
//
//   Step 1   — visitor lands on /exams. Sees "What are you looking
//              for?" and 10 big goal cards (Engineering, Medical, Govt
//              jobs, Banking, Civil services, Teaching, Law, MBA,
//              Defence, Olympiad). One tap → step 2.
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
import { UpcomingExamsSidebar, type UpcomingEvent } from "@/components/UpcomingExamsSidebar";
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

  let title = "Entrance & Government Exams — Pick what you're preparing for | Shishya";
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
    alternates: { canonical: "https://shishya.in/exams" },
    openGraph: {
      title,
      description,
      url: "https://shishya.in/exams",
      siteName: "Shishya",
      locale: "en_IN",
      type: "website",
    },
  };
}

// Fallback list — used only when the DB is unreachable so the public
// page still renders something useful. Real exam list is below.
const FALLBACK_EXAMS: ExamCard[] = [
  { code: "SSC_CGL",      shortName: "SSC CGL",        name: "SSC Combined Graduate Level",       category: "GOVT_JOBS",  candidatesPerYear: 3_000_000, live: true,  tags: ["popular", "national", "govt"] },
  { code: "NEET_UG",      shortName: "NEET UG",        name: "National Eligibility cum Entrance", category: "MEDICAL",    candidatesPerYear: 2_400_000, live: false, tags: ["popular", "national", "medical"] },
  { code: "JEE_MAIN",     shortName: "JEE Main",       name: "Joint Entrance Examination",        category: "ENGINEERING",candidatesPerYear: 1_400_000, live: false, tags: ["popular", "national", "engineering"] },
  { code: "UPSC_PRELIMS", shortName: "UPSC Prelims",   name: "UPSC Civil Services Examination",   category: "CIVIL_SERVICES", candidatesPerYear: 1_100_000, live: false, tags: ["popular", "national", "govt", "civil_services"] },
];

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
  } catch {
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
    }));
  } catch {
    return [];
  }
}
const loadInitialThreads = unstable_cache(
  loadInitialThreadsRaw,
  ["home-discussions-v2"],
  { revalidate: 60, tags: ["discussions"] },
);

async function loadUpcomingEventsRaw(): Promise<UpcomingEvent[]> {
  try {
    const rows = await prisma.examImportantDate.findMany({
      where: { date: { gte: new Date() }, exam: { active: true } },
      orderBy: { date: "asc" },
      take: 30,
      include: { exam: { select: { code: true, shortName: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      examCode: r.exam.code,
      examShort: r.exam.shortName,
      date: r.date.toISOString(),
      label: r.label,
      isExamDay: r.isExamDay,
    }));
  } catch {
    return [];
  }
}
const loadUpcomingEvents = unstable_cache(
  loadUpcomingEventsRaw,
  ["home-upcoming-v2"],
  { revalidate: 300, tags: ["exam-dates"] },
);

export default async function ExamsPage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; s?: string; st?: string }>;
}) {
  const sp = await searchParams;
  const { t } = await getT();

  const [signedIn, exams, initialThreads, upcomingEvents] = await Promise.all([
    auth().then((s) => Boolean(s?.user)).catch(() => false),
    loadExams(),
    loadInitialThreads(),
    loadUpcomingEvents(),
  ]);

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

      <UpcomingExamsSidebar events={upcomingEvents} />

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

      <div className="lg:pl-80 lg:pr-80">
        <section className="container-prose pt-10 pb-20 sm:pt-14">
          <Breadcrumbs goal={goal} scope={effectiveScope} stateCode={stateCode} />

          {step === "goals" && <StepGoals exams={exams} />}
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
        </section>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Step 1 — Goal picker (the landing state).
// ─────────────────────────────────────────────────────────────────────
function StepGoals({ exams }: { exams: ExamCard[] }) {
  // Per-goal exam count for the tile sub-label (e.g. "32 exams").
  // We compute it here rather than in the data file so it stays
  // accurate as exams are added/removed from the DB.
  const countFor = (goal: ExamGoal) =>
    exams.filter((e) => matchesGoal(e.tags as ExamTag[], goal)).length;

  return (
    <div>
      <div className="mx-auto max-w-3xl text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-saffron-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-saffron-800">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-saffron-500" aria-hidden />
          Step 1 of 2
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight text-ink-900 sm:text-5xl">
          What are you preparing for?
        </h1>
        <p className="mt-4 text-base text-ink-600 sm:text-lg">
          Tap a goal — we&apos;ll show you the national-level options and your
          state&apos;s options next.
        </p>
      </div>

      <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {EXAM_GOALS.map((goal) => {
          const count = countFor(goal);
          return (
            <li key={goal.slug}>
              <Link
                href={`/exams?g=${goal.slug}`}
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

    </div>
  );
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
          href={`/exams?g=${goal.slug}&s=national`}
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
          href={`/exams?g=${goal.slug}&s=state`}
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
                  href={`/exams?g=${goal.slug}&s=state&st=${s.code}`}
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
            href={`/exams?g=${goal.slug}&s=state`}
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
      <Link href="/exams" className="font-medium text-saffron-700 hover:underline">
        All exams
      </Link>
      <span aria-hidden>›</span>
      {scope ? (
        <Link
          href={`/exams?g=${goal.slug}`}
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
              href={`/exams?g=${goal.slug}&s=${scope}`}
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
