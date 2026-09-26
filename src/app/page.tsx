// / — Shishya home page: "Doors" (26 Sep 2026).
//
// The founder's idea, in his words: Shishya is ONE free platform for anyone
// who is studying — school (any government board), plus-one / plus-two,
// graduation, post-graduation, PhD, and competitive or government exams.
// These are INDEPENDENT sections, not a sequence: a person at any stage of
// life comes and uses the section for their stage. It sits beside the
// teaching they already get at school or college; it is their own place to
// practise and improve towards whatever they want to become.
//
// After the unchanged header (src/components/Header.tsx):
//   1. one sentence + the ungated tutor line + five section jump-pills
//      (HomeHero), with "Use any one, any time. There is no order.";
//   2. the week's exam days / live tests, only on such days (unchanged
//      ExamsTodayStrip + LiveTestTodayBanner);
//   3. five equal doors — School · Entrance exams · Government exams ·
//      College & scholarships · Careers — and a dashed "being built" cell
//      for graduation / PG / PhD study, which does not exist yet (HomeDoors).
//      26 Sep 2026 (review): the Entrance door is its own hub — one-tap exam
//      chips from the loaded catalogue and no whole-card link, because no
//      page lists admission tests alone (the catalogue leads with state-level
//      government exams); the Government door opens the whole catalogue and
//      carries no count, since the catalogue count is government AND
//      entrance exams (a read-only probe that day: 117 of 180 were
//      government-job exams — scripts/tmp-home-fixer-probe.ts);
//   4. the one typed exam search + the exams most people sit + the 2-minute
//      government-exam finder + "Browse all {n} exams", the live catalogue
//      count on the one link that opens exactly those rows (HomeFinder);
//   5. the founder's two saffron-edged rails, moved into the flow
//      (HomeRails: VacancyExplorerPanel + HomeCalendarRail);
//   6. four steps that hold in every section (HomeHowItWorks);
//   7. a small sign-in line and the mentor line (HomeSignIn).
//
// Honesty: every section shown as available exists (routes verified in
// src/components/home/HomeDoors.tsx); counts come only from data this page
// loads (portalStats.examCount, CAREERS.length, INDIAN_LANGUAGE_COUNT);
// school notes and practice are "being written". Copy is per locale in
// src/lib/home-doors-copy.ts for the /hi and /te twins.
//
// Retired here (26 Sep 2026): the ?g= / ?s= / ?st= goal funnel (inbound
// links now 308 to the catalogue — legacyFunnelRedirect), the sticky live
// counters + Ask bar, the vacancy finder hero, the coach story card, the
// stats band, the Wall of Grinders, the feature cards, the inspiration
// carousel, the page tour, the chat-router FAB, the persona links and the
// fixed side rails. tests/unit/home-doors.test.ts pins what may not return.

import type { Metadata } from "next";
import { permanentRedirect } from "next/navigation";
import { SUPPRESSED_SOURCE } from "@/lib/exam-timeline";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { NOT_SCHOOL_SQL, NOT_SCHOOL_WHERE, REAL_EXAM_WHERE } from "@/lib/db/exam-scope";
import { getT } from "@/lib/i18n-server";
import { calendarRailLabels } from "@/lib/home-strip-copy";
import { homeDoorsCopy } from "@/lib/home-doors-copy";
import {
  ENTRANCE_DOOR_CODES,
  GOVERNMENT_DOOR_CODES,
  cbseClassTiles,
  doorExamChips,
  legacyFunnelRedirect,
  mostTakenExams,
} from "@/lib/home-doors";
import { INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { CAREERS } from "@/data/careers";
import { findBoard } from "@/lib/schooling-data";
import { Header } from "@/components/Header";
import type { ExamCard } from "@/components/ExamPicker";
import { computeExamTags } from "@/lib/exam-tags";
import { isPassedEstimate, sourceTier } from "@/lib/official-source";
import type { UpcomingEvent, CalendarBucket } from "@/components/UpcomingExamsSidebar";
import { loadVacancyExplorer, type VacancyExplorer } from "@/lib/vacancy-explorer";
import { loadTodaysLiveTests } from "@/lib/live-test-today";
import { LiveTestTodayBanner } from "@/components/LiveTestTodayBanner";
import { ExamsTodayStrip } from "@/components/ExamsTodayStrip";
import { resolvePhase, istDayNumber } from "@/lib/exam-phase";
import { LiveCountersStrip } from "@/components/LiveCounters";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeDoors } from "@/components/home/HomeDoors";
import { HomeFinder } from "@/components/home/HomeFinder";
import { HomeRails } from "@/components/home/HomeRails";
import { HomeHowItWorks } from "@/components/home/HomeHowItWorks";
import { HomeSignIn } from "@/components/home/HomeSignIn";
import { HomeBeacons } from "@/components/home/HomeBeacons";
// 26 Sep 2026: the whole-platform search strip in the hero (founder brief).
import { SearchStrip } from "@/components/search/SearchStrip";
import { askBaseFor, searchCopy } from "@/lib/search-copy";

// 26 Sep 2026: one title and description for "/" — the per-step funnel
// metadata went with the funnel. The exam count is the same daily-cached
// DB count the finder's "Browse all" link shows; number-free phrasing if
// unknown. It counts the whole catalogue — government AND entrance exams —
// so it is never called a count of government exams (review, 26 Sep 2026).
export async function generateMetadata(): Promise<Metadata> {
  const { examCount } = await loadPortalStats().catch(() => ({ examCount: "", questions: "", notes: "" }));
  const examScope = examCount ? `${examCount} government and entrance exams` : "government and entrance exams";
  const title = "Shishya — One smart place to study: school, entrance & government exams";
  const description =
    `Free practice for anyone studying in India. CBSE and ICSE school chapters with the official book and syllabus links; ${examScope} — JEE, NEET, CUET, SSC, banking, railways, state PSCs, UPSC — with free mocks, previous-year practice, cutoffs and dates; colleges, scholarships and career paths. A tutor in ${INDIAN_LANGUAGE_COUNT} Indian languages. Free, no paywall.`;

  return {
    title,
    description,
    // 26 Sep 2026 (G2): the whole-platform machine brief (src/app/context.md)
    // advertised the way the section and exam pages advertise theirs.
    alternates: { canonical: "https://shishya.in/", types: { "text/markdown": "https://shishya.in/context.md" } },
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
      where: REAL_EXAM_WHERE,
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
    // (now-comprehensive) fallback keeps the page visually healthy.
    console.error("[shishya/loadExams] DB query failed, using fallback:", err);
    return FALLBACK_EXAMS;
  }
}

const loadExams = unstable_cache(loadExamsRaw, ["home-exams-v1"], {
  revalidate: 60,
  tags: ["exams"],
});

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
    //
    // Two reads, each with its own cap (15 Sep 2026). The single
    // oldest-first read capped at 800 filled the cap with 60 days of past
    // rows — mostly archived exam-day copies — before it reached today:
    // 2,686 rows matched, the 800th was dated 10 Sep, and Upcoming said
    // "No upcoming dates announced." with 579 live future rows stored.
    // Past and today/future are fetched apart so the past can never
    // starve the future again.
    const todayStartUtc = new Date(nowDay * 86_400_000 - 5.5 * 3_600_000);
    const [pastRows, futureRows] = await Promise.all([
      // Past: exam days only (classify drops past non-exam-day rows),
      // live and archived, newest first.
      prisma.examImportantDate.findMany({
        // Suppressed rows (a human archived them as wrong) are not history.
        // 25 Sep 2026: real exams only here and below — school class
        // containers stay off the home page (src/lib/db/exam-scope.ts).
        where: { date: { gte: from, lt: todayStartUtc }, exam: REAL_EXAM_WHERE, isExamDay: true, OR: [{ source: null }, { source: { not: SUPPRESSED_SOURCE } }] },
        orderBy: { date: "desc" },
        take: 800,
        include: { exam: { select: { id: true, code: true, shortName: true, eligibility: { select: { officialUrl: true } } } } },
      }),
      // Today/future: live rows only, soonest first.
      prisma.examImportantDate.findMany({
        where: { date: { gte: todayStartUtc }, exam: REAL_EXAM_WHERE, archivedAt: null },
        orderBy: { date: "asc" },
        take: 400,
        include: { exam: { select: { id: true, code: true, shortName: true, eligibility: { select: { officialUrl: true } } } } },
      }),
    ]);
    const rowsRaw = [...pastRows.reverse(), ...futureRows];
    type RawRow = (typeof rowsRaw)[number];
    const classify = (r: RawRow): Exclude<CalendarBucket, "results"> | null => {
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
      // Passed estimates (24 Sep 2026, src/lib/official-source.ts): an
      // EXPECTED exam day that went by is not an exam that ran — nothing was
      // announced — so it leaves the Concluded / Past tabs instead of sitting
      // there with its date and a "was expected" chip.
      if (isPassedEstimate({ tier: sourceTier(r.confidence, r.url, r.exam.eligibility?.officialUrl), date: r.date }, now)) return null;
      return nowDay - dDay <= 7 ? "concluded" : "past";
    };
    const byBucket: Record<Exclude<CalendarBucket, "results">, RawRow[]> = { concluded: [], upcoming: [], past: [] };
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
    // An expected (unconfirmed) date never counts as an exam that ran.
    const defaultTab: CalendarBucket = byBucket.concluded.some(
      (r) =>
        nowDay - istDayNumber(r.date) <= 3 &&
        sourceTier(r.confidence, r.url, r.exam.eligibility?.officialUrl) !== "expected",
    )
      ? "concluded"
      : "upcoming";

    // For exam-day rows, attach the matching ExamPhaseArticle's
    // summarySnippet so the rail renders the AI-written teaser
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
        // rail chip (phase articles are now versioned).
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
      const tier = sourceTier(r.confidence, r.url, r.exam.eligibility?.officialUrl);
      return {
        id: r.id,
        examCode: r.exam.code,
        examShort: r.exam.shortName,
        date: r.date.toISOString(),
        label: r.label,
        // Only an ANNOUNCED row (tier official/reported) is an exam day
        // (11 Sep 2026 audit: an expected SSC CGL date was pilled "EXAM
        // DAY" under Concluded). An expected exam-day row stays in its
        // bucket but renders "(expected)" / "was expected — not
        // confirmed" instead — never the exam-day pill or a phase chip.
        isExamDay: r.isExamDay && tier !== "expected",
        expectedExamDay: r.isExamDay && tier === "expected",
        tier,
        // Tracker honesty flag (23 Aug 2026, tiered 29 Aug 2026): only
        // gold-tier rows — announced AND cited on the conducting body's
        // own domain (incl. the exam's portal) — may become Events below.
        official: tier === "official",
        phaseSnippet: phase ? (snippetsByKey.get(`${r.exam.id}:${phase}`) ?? null) : null,
        bucket: bucketById.get(r.id) ?? ("upcoming" as CalendarBucket),
      };
    });
    return { events, defaultTab };
  } catch (err) {
    // Fall back to the static next-6-months list so the calendar rail
    // never shows "No upcoming dates announced." just because Vercel
    // couldn't reach Neon for a few seconds. The static list is
    // sourced from each exam body's official notification — same
    // policy as the live data — so it's accurate, just less fresh.
    console.error("[shishya/loadUpcomingEvents] DB query failed, using fallback:", err);
    const { getFallbackEvents } = await import("@/data/fallback-events");
    // The static list cites no URL per row, so under the source-tier
    // model its exam days are estimates: rendered "(expected)", never
    // pilled as exam days.
    const events = getFallbackEvents()
      .map((e) => (e.isExamDay ? { ...e, isExamDay: false, expectedExamDay: true, tier: "expected" as const } : e))
      // Same passed-estimate rule as the live loader (24 Sep 2026).
      .filter((e) => !(e.expectedExamDay && isPassedEstimate({ tier: "expected", date: e.date })));
    return { events, defaultTab: "upcoming" as CalendarBucket };
  }
}
// v4 — busts the v3 cache: the loader now returns { events, defaultTab }
// with the three-tab bucket field attached to every event.
const loadUpcomingEvents = unstable_cache(
  loadUpcomingEventsRaw,
  // v7: `official` tightened to gold source tier (conducting-body domain).
  // v8: `isExamDay` only for announced rows; `expectedExamDay` + `tier` added.
  // v9: past and today/future read apart (the 800-row cap hid every future date).
  ["home-upcoming-v10"],
  { revalidate: 300, tags: ["exam-dates"] },
);


// Live government-vacancy explorer data — powers the Government
// vacancies rail (national / state / category drill-down). Cached daily;
// a DB blip falls back to an empty-but-safe shape.
const EMPTY_VACANCY: VacancyExplorer = {
  grandTotal: 0, totalLakh: "0.0", examCount: 0,
  national: { total: 0, exams: [] }, states: [], categories: [], updatedAt: null,
};
// The catch must live OUTSIDE unstable_cache: errors are never cached,
// but a caught-and-returned fallback IS. With the old inside-the-cache
// catch, one Neon blip during revalidation cached EMPTY_VACANCY for
// 24h → homepage showed "0 GOVT EXAMS · 0 vacancies" all day (seen
// live 2 Aug 2026). Now a blip degrades exactly one request and the
// next request retries the DB.
const loadVacancyExplorerCached = unstable_cache(
  loadVacancyExplorer,
  // v3 — busts the v2 entry poisoned by the fallback-caching bug.
  ["home-vacancy-explorer-v3"],
  { revalidate: 86400 },
);
async function loadVacancyExplorerSafe(): Promise<VacancyExplorer> {
  try {
    return await loadVacancyExplorerCached();
  } catch {
    return EMPTY_VACANCY;
  }
}

// Catalogue-depth counts — real counts, rounded DOWN to an honest "+"
// figure. Cached daily. 26 Sep 2026: the page shows only examCount (the
// finder's "Browse all {n} exams" link and the metadata — the whole
// catalogue, government and entrance, so never a door's count — review,
// 26 Sep 2026); questions and notes stay in
// the loader's shape because tests/unit/exam-scope-guard.test.ts pins
// that these counts join the exam category — see the open questions.
async function loadPortalStatsRaw(): Promise<{ examCount: string; questions: string; notes: string }> {
  try {
    const [ex, q, n] = await Promise.all([
      prisma.exam.count({ where: REAL_EXAM_WHERE }),
      // 26 Sep 2026: questions and notes of real exams only — school
      // (curriculum, class) containers share the tree (exam-scope.ts) and
      // would inflate the govt-exam band. Same numbers today (0 school rows).
      prisma.question.count({ where: { exam: NOT_SCHOOL_WHERE } }),
      prisma.$queryRaw<{ c: bigint }[]>`
        SELECT COUNT(*)::bigint AS c FROM "TopicTeachingNote" n
        JOIN "Topic" t ON t.id = n."topicId"
        JOIN "Subject" s ON s.id = t."subjectId"
        JOIN "Exam" e ON e.id = s."examId"
        WHERE ${NOT_SCHOOL_SQL}`,
    ]);
    const notesCount = Number(n[0]?.c ?? 0);
    const floorTo = (v: number, step: number) => Math.floor(v / step) * step;
    return {
      examCount: String(ex),
      questions: `${floorTo(q, 1000).toLocaleString("en-IN")}+`,
      notes: `${floorTo(notesCount, 100).toLocaleString("en-IN")}+`,
    };
  } catch {
    // DB unreachable: stable "+" wording, never a precise number that
    // goes stale (audit 11 Sep 2026: this carried a typed 177).
    return { examCount: "170+", questions: "30,000+", notes: "3,700+" };
  }
}
const loadPortalStats = unstable_cache(loadPortalStatsRaw, ["home-portal-stats-v2"], { revalidate: 86400 });

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; s?: string; st?: string }>;
}) {
  const sp = await searchParams;
  // 26 Sep 2026: the goal funnel (?g=, ?s=, ?st=) is retired. Indexed and
  // shared links to it 308 to the catalogue's matching category (or the
  // state list) instead of landing on a page that no longer reads them.
  const legacy = legacyFunnelRedirect(sp);
  if (legacy) permanentRedirect(legacy);

  // 16 Sep 2026: "/" reads in the visitor's language on the /hi and /te
  // twins. generateMetadata above is untouched — "/" canonicalises to
  // https://shishya.in/ in every locale.
  const { locale, t } = await getT();
  const copy = homeDoorsCopy(locale);

  const [signedIn, exams, calendar, vacancy, portalStats, liveToday] = await Promise.all([
    auth().then((s) => Boolean(s?.user)).catch(() => false),
    loadExams(),
    loadUpcomingEvents(),
    loadVacancyExplorerSafe(),
    loadPortalStats(),
    loadTodaysLiveTests(),
  ]);
  const upcomingEvents = calendar.events;

  // SEO/AEO: schema.org Event markup for the upcoming exam days —
  // Google event rich-results + a machine-readable date list AI
  // engines can quote directly ("when is the next SSC CGL exam?").
  const jsonLdEvents = upcomingEvents
    // Only OFFICIAL (cited) exam days become Events — never an estimate.
    .filter((e) => (e.bucket ?? "upcoming") === "upcoming" && e.isExamDay && e.official)
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
              // GSC "improve item appearance" (2 Sep 2026): description,
              // endDate and image were missing on all 47 valid Events.
              description: `${e.examShort} ${e.label} — exam day per the official notice. Free mock tests, syllabus and cutoff analysis on Shishya.`,
              startDate: e.date.slice(0, 10),
              endDate: e.date.slice(0, 10),
              image: [`https://shishya.in/exams/${e.examCode}/opengraph-image`],
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

  // The exams most people sit, for the finder chips (curated "popular"
  // first, then by candidates per year — live data, never a typed list).
  const chips = mostTakenExams(exams, 8);
  // The exam doors' one-tap chips (26 Sep 2026, review): only exams present
  // in the loaded catalogue render, so a chip never links a page that 404s.
  const entranceChips = doorExamChips(exams, ENTRANCE_DOOR_CODES);
  const governmentChips = doorExamChips(exams, GOVERNMENT_DOOR_CODES);
  // CBSE classes for the School door's one-tap tiles, from the board data.
  const cbseClasses = cbseClassTiles(findBoard("cbse")?.classes);

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />

      {examDatesJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(examDatesJsonLd) }}
        />
      )}
      {/* One delegated CTA_CLICKED beacon for every data-home-cta element. */}
      <HomeBeacons />

      {/* 26 Sep 2026: the live stats strip (visited · mocks attempted ·
          signed up) came back at the founder's request after the rewrite
          dropped it; sticky under the header as before, without the old
          Ask bar. */}
      <div className="sticky top-0 z-40">
        <LiveCountersStrip
          sticky={false}
          labels={{
            // 26 Sep 2026: one label per counter, each the honest description
            // of what src/lib/live-counts-server.ts counts (LIVE_COUNT_DEFINITIONS).
            activeNow: t("live.activeNow"),
            pageViews: t("live.pageViews"),
            visitors: t("live.visitors"),
            mocksTaken: t("live.mocksTaken"),
            signedUp: t("live.signedUp"),
            tutorQuestions: t("live.tutorQuestions"),
            questionsAnswered: t("live.questionsAnswered"),
            liveTests: t("live.liveTests"),
            examGoals: t("live.examGoals"),
            exams: t("live.exams"),
            questions: t("live.questions"),
            notes: t("live.notes"),
            schoolChapters: t("live.schoolChapters"),
            languages: t("live.languages"),
            today: t("live.today"),
            thisWeek: t("live.thisWeek"),
          }}
        />
      </div>

      <div className="container-prose pb-16">
        <HomeHero copy={copy} search={<SearchStrip variant="hero" copy={searchCopy(locale)} askBase={askBaseFor(locale)} />} />

        <HomeDoors
          copy={copy}
          careersCount={CAREERS.length}
          cbseClasses={cbseClasses}
          entranceChips={entranceChips}
          governmentChips={governmentChips}
        />

        {/* The week's events, only on such days: live tests open today and
            this week's announced exam days (both render nothing otherwise;
            the wrapper hides itself when empty). 26 Sep 2026: the founder
            moved them from under the pills to between the sections and the
            exam finder, side by side on wide screens. */}
        <div className="mt-7 grid gap-4 empty:hidden lg:grid-cols-2 lg:items-start">
          <LiveTestTodayBanner data={liveToday} />
          <ExamsTodayStrip />
        </div>

        <HomeFinder copy={copy} exams={exams} chips={chips} examCount={portalStats.examCount} />

        <HomeRails
          vacancy={vacancy}
          signedIn={signedIn}
          events={upcomingEvents}
          defaultTab={calendar.defaultTab}
          labels={calendarRailLabels(locale)}
          copy={copy}
        />

        <HomeHowItWorks copy={copy} languageCount={INDIAN_LANGUAGE_COUNT} />

        <HomeSignIn copy={copy} signedIn={signedIn} />
      </div>
    </main>
  );
}
