// /exams/:code — exam landing page (bilingual, SEO-indexable).
//
// PUBLIC: this page renders fully for unauthenticated visitors (Google,
// Bing, students linked from search) so it gets crawled and ranked for
// queries like "RRB NTPC syllabus" or "SSC CGL previous year papers".
// Interactive parts (Start Mock, Ask Shishya, Score Boost rail, Weakness
// map, Recent attempts) are gated behind a Sign-in CTA so we keep the
// auth model clean without blocking the crawler.

import { fillTemplate } from "@/lib/i18n";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import { Header } from "@/components/Header";
import { RankLadder } from "@/components/RankCard";
import { AnonQuizRecall } from "@/components/AnonQuizRecall";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getExamShared } from "@/lib/db/exam-cache";
import { examUncheckedQuestionCount } from "@/lib/exam-answer-check";
import { getT, getUrlLocale, tFor } from "@/lib/i18n-server";
import { computeExamWeekState } from "@/lib/exam-week";
import { standingSitting } from "@/lib/score-sitting";
import { getExamWeekInputs } from "@/lib/exam-week-inputs";
import { shiftDayIso } from "@/lib/exam-week-student";
import { buildTimeline } from "@/lib/exam-timeline";
import { passedEstimateLine, passedEstimateView } from "@/lib/official-source";
import { ExamWeekBlock, type ExamWeekViewer } from "@/components/ExamWeekBlock";
import { HubSignInLink, StartMockButton } from "./StartMockButton";
import { PageTour } from "@/components/PageTour";
import { formatDisplayScorePct } from "@/lib/scoring";
import { computeScoreBoost } from "@/lib/focus-topics";
import { ScholarshipsForExamSection } from "@/components/ScholarshipsForExamSection";
import { CollegesForExamSection } from "@/components/CollegesForExamSection";
import { SectionVerificationSummary } from "@/components/VerificationBadge";
import { ExamDeepContentBlock } from "@/components/ExamDeepContentBlock";
import { ShareExamButton } from "@/components/ShareExamButton";
import { SubjectTestButton } from "./SubjectTestButton";
import { CustomMockBuilder } from "./CustomMockBuilder";
import { ExamFaq } from "@/components/ExamFaq";
import { findDeepContent, hasDeepContent } from "@/data/exam-deep-content";
import { getExamTheme } from "@/lib/exam-theme";
import { DiagnosticHero } from "@/components/DiagnosticHero";
import { TryOneQuestion } from "./TryOneQuestion";
import { CoachEntry } from "@/components/CoachEntry";
import { PulseAsk } from "@/components/PulseAsk";
import { PeerProofLine } from "@/components/PeerProofLine";
import { CoachNextTask } from "@/components/CoachNextTask";
import { examPeerProof } from "@/lib/peer-proof";
import { REHEARSAL_CLOSE_IST_HOUR } from "@/lib/live-test";
import { INDIAN_LANGUAGE_COUNT, OTHER_INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { OfficialPapersBlock } from "@/components/OfficialPapersBlock";
import { hubPyqPhrase } from "@/lib/pyq-naming";
import { examHubCopy, fillHub, type ExamHubCopy } from "@/lib/exam-hub-copy";
import { examPageGates, GATES_CLOSED } from "@/lib/exam-page-gates";
import {
  clipDescription,
  heldDescriptionLead,
  heldTitleLead,
  heldYearDescriptionLead,
  hubCourseNameTail,
  hubDateLead,
  hubPracticeCtaCopy,
  hubPracticeSuffix,
  hubShareMessage,
  hubTitlePrefix,
  hubTitleYear,
  revisionDescriptionLead,
  revisionTitleLead,
  type HubOffers,
} from "@/lib/hub-title";
import { cutoffHeadlineSentences, hubLead, leadDescription } from "@/lib/answer-lead";
import { verifiedPattern } from "@/lib/pattern-verified";
import { hubFaqExtraItems, hubPyqOffer } from "@/lib/hub-faq";
import { groupCutoffTables, type OfficialCutoffRow } from "@/lib/official-cutoffs";
import { pickCutoffHeadline, type CutoffHeadline } from "@/lib/official-cutoff-title";
import { newestCutoffLabelYear } from "@/lib/cutoff-label-year";
import { examKind, examKindLabel } from "@/lib/exam-kind";
import { relatedLinks, type RelatedLink } from "@/lib/exam-related-links";
import { loadSchoolSurface } from "@/lib/school/surface";
import { CAREERS } from "@/data/careers";
import { examHasNotes } from "@/lib/page-gates-notes";

// Honesty line for the Previous Papers cards (7 Sep + 11 Sep 2026).
// Every PYQ question on the platform is freshly worded in the PATTERN of
// that year's paper (src/lib/ai/pyq-generator.ts) — none of them is the
// paper, so no card may read "Take paper" / "real questions". The line
// keeps the "N of M" depth framing (534 of 587 exam-years on prod hold
// under half a real paper) against the real paper's question count.
// 16 Sep 2026: the same sentence in the reader's language on the /hi and /te
// twins (src/lib/exam-hub-copy.ts) — the "PYQ-pattern" label and the N-of-M
// depth travel with it. English is unchanged.
function pyqSetLine(C: ExamHubCopy, held: number, year: number | null, totalQuestions: number): string {
  const paper = year ? fillHub(C.pyqPaperYear, { year }) : C.pyqPaperThat;
  // totalQuestions <= 0 → real paper size unknown; claim nothing about it.
  return totalQuestions > 0
    ? fillHub(C.pyqSet, { held, paper, total: totalQuestions })
    : fillHub(C.pyqSetNoTotal, { held, paper });
}
// The published cutoff the hub FAQ quotes (26 Sep 2026, G3): the cutoff
// page's own headline figure (src/lib/official-cutoff-title.ts) — the first
// table's first category — with its document. Cached per exam for an hour:
// SSC GD holds 4,205 rows and the hub renders per request.
const getHubCutoffHeadline = unstable_cache(
  async (examId: string, officialUrl: string | null): Promise<{ headline: CutoffHeadline | null; year: number | null } | null> => {
    const rows = await prisma
      .$queryRaw<OfficialCutoffRow[]>`
        SELECT cycle, stage, post, region, gender, category, "categoryLabel", marks, "maxMarks", "scoreType",
               "sourceUrl", "sourceTitle", publisher, "publishedOn"
        FROM "OfficialCutoff" WHERE "examId" = ${examId} AND "archivedAt" IS NULL
      `.catch(() => [] as OfficialCutoffRow[]);
    if (rows.length === 0) return null;
    const tables = groupCutoffTables(rows);
    return { headline: pickCutoffHeadline(tables, officialUrl), year: newestCutoffLabelYear(tables.map((t) => t.cycle)) };
  },
  ["hub-cutoff-headline-v1"],
  { revalidate: 3600 },
);

// "6:00 pm" from an IST hour constant — the rehearsal close time comes
// from src/lib/live-test.ts, never a typed number.
function formatIstHour(hour24: number): string {
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h12}:00 ${hour24 < 12 ? "am" : "pm"}`;
}

// Per-exam meta. Beefed-up version that bakes in:
//   1. state name (for "Tamil Nadu PSC" / "तमिलनाडु TET" style searches)
//   2. native-script + English language coverage (for "TNPSC in Tamil" type
//      long-tail queries, which is most of the high-intent India traffic)
//   3. the cycle year (26 Sep 2026: from the tracker rows, src/lib/hub-title.ts
//      hubTitleYear — no longer the calendar year)
//   4. JSON-LD Course schema is added inline in the page body further down
//
// Goal: rank for every plausible spelling of every exam in the catalogue
// in every Indian language a student would type in.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  // Same cached payload the page renders from (exam + tracker rows +
  // official portal) — one cache hit instead of a separate exam query.
  const shared = await getExamShared(code);
  if (!shared || !shared.exam.active) return { title: "Exam not found — Shishya" };
  const { exam, importantDates, titleDates, officialUrl } = shared;

  const { stateInfo, languageList, languageName } = await import("@/lib/state-info");
  // URL locale (23 Aug 2026): /hi/exams/X and /te/exams/X are crawlable
  // twins — self-canonical, hreflang-paired, titled in that language.
  const { getUrlLocale } = await import("@/lib/i18n-server");
  const { localizedUrl, languageAlternates, ogLocale, twinCanonical } = await import("@/lib/seo-locale");
  const { getTwinVerdict } = await import("@/lib/twin-localisation");
  const urlLocale = await getUrlLocale();
  // Index shape (13 Sep 2026): a twin is declared (self-canonical +
  // hreflang) only when its rendered body is ≥ 30% native script — the hub
  // twins measured 91-93% English. Otherwise canonical → the English URL.
  const twins = await getTwinVerdict("hub", exam.id);
  const st = stateInfo(exam.state);
  // Empty languages = the official notice does not state the question
  // paper's language (KA_KSRP, 15 Sep 2026). The description then names only
  // English, which is true of Shishya's own questions; the FAQ makes no claim.
  const langs = exam.languages.length > 0 ? exam.languages : ["EN"];

  // Exam-date answer in the title/description — GSC (16 Aug 2026) found
  // a large ZERO-CLICK query class: "{exam} exam date {year}" queries
  // where we rank ~8-10 but never win the click because the title
  // doesn't answer the question. Lead with the date when we have one.
  // Honesty (23 Aug 2026, tightened 11 Sep 2026): the title leads ONLY
  // with an ANNOUNCED next exam day — source tier official (bare) or
  // reported (with its tier word). It never leads with an estimate: the
  // next expected row is often a LATER stage ("SSC CGL 2026 — Exam Date
  // 15 Jan 2027 (expected)" while the tracker's own news says Tier 1
  // dates are awaited), and a passed estimate is worse still. With no
  // announced row the true answer to the query is "not announced yet".
  //
  // Held exams (16 Sep 2026, src/lib/hub-title.ts): with no announced day
  // ahead, an announced written exam held in the last 60 days leads instead
  // ("Exam Held 6 Sept 2026 (reported), Next Exam Date Not Announced Yet,")
  // — IOQM, CDS and NEET PG said "Exam Date Not Announced Yet" days after
  // their exam, the weeks students search for the answer key and result.
  // Conflicting rows: when the next day has a same-stage announced row on
  // another day (MPSC Group C Prelims 27 Sep beside "revised" 25 Oct),
  // neither date is stated — "Exam Date Under Revision,".
  // titleDates, not the capped Important Dates list: a sitting dropped by
  // the cap turned AP TET's ended window into "Exam Ended 21 Aug 2026"
  // (17 Sep 2026). Over every live row the rule states no date instead.
  const titleRows = titleDates.length > 0 ? titleDates : importantDates;
  const titleNow = new Date();
  const timeline = buildTimeline(titleRows, titleNow, officialUrl);
  const dateLead = hubDateLead(timeline, exam, new Map(titleRows.map((r) => [r.id, r.createdAt] as const)));
  // The year beside the name (26 Sep 2026, src/lib/hub-title.ts hubTitleYear):
  // it was the calendar year, so in September 2026 the hubs said "JEE Main
  // 2026 — Exam Date Not Announced Yet" months after JEE Main 2026 was held.
  // Now the next announced exam day decides, else the next exam day or
  // pre-exam row of any tier (the year only — an expected DATE still never
  // leads), else the held lead's own year; with nothing ahead the title
  // says "{Exam} — 2026 Exam Held; Next Exam Date Not Announced Yet" or
  // carries no year at all. No future year is invented.
  const titleYear = hubTitleYear(dateLead, timeline, exam, titleNow);
  const year = titleYear.kind === "none" ? null : titleYear.year;
  // Descriptions and keywords name only a cycle year ("Free SSC CGL … 2027
  // mock tests"); a held year stays in the held words.
  const cycleYearText = titleYear.kind === "cycle" ? ` ${titleYear.year}` : "";
  const announced = dateLead.kind === "announced" ? dateLead.row : null;
  const held = dateLead.kind === "held" ? dateLead : null;
  const revision = dateLead.kind === "revision";
  const tierWord = tFor(urlLocale);
  const heldTier = held && held.row.tier !== "official" ? tierWord("ew.tier.reported") : null;
  const nextDate = announced
    ? announced.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) +
      (announced.tier === "official" ? "" : ` (${tierWord("ew.tier.reported")})`)
    : null;
  const notAnnounced =
    urlLocale === "hi" ? "अभी घोषित नहीं" : urlLocale === "te" ? "ఇంకా ప్రకటించలేదు" : "not announced yet";

  // What the hub holds (26 Sep 2026, G3 — src/lib/hub-title.ts
  // hubPracticeSuffix): the title said "Free Mock Tests, PYQ" on 12 hubs with
  // no shared mock and 44 with no previous year paper. A failed gates read
  // claims no syllabus here (GATES_CLOSED) — a title must never over-promise.
  // Both names (15 Sep 2026, src/lib/pyq-naming.ts).
  const { loadOfficialPapers: loadOfficialPapersMeta } = await import("@/lib/official-papers-db");
  const hubHasOfficial = (await loadOfficialPapersMeta(exam.id)).some((r) => r.kind !== "answer key" && r.kind !== "listing page");
  const metaGates = await examPageGates(exam.code, GATES_CLOSED);
  const offers: HubOffers = {
    hasMocks: shared.systemMocks.length > 0,
    hasPyq: shared.pyqYears.length > 0 || hubHasOfficial,
    hasSyllabus: metaGates.syllabus,
    hasEligibility: !!findDeepContent(exam.code)?.eligibility,
  };

  // Title — prioritises state name for state exams (huge SEO lever for
  // "Tamil Nadu TET 2026" / "Bihar Police mock test"-style searches),
  // and the exam-date answer when known.
  const stateBit = st ? ` (${st.name})` : "";
  const dateBit = held
    ? `${heldTitleLead("en", held, heldTier)}, `
    : revision
      ? `${revisionTitleLead("en")}, `
      : nextDate ? `Exam Date ${nextDate}, ` : "Exam Date Not Announced Yet, ";
  const title = `${hubTitlePrefix("en", `${exam.shortName}${stateBit}`, titleYear, dateBit)}${hubPracticeSuffix("en", offers)} | Shishya`;

  // Description — packs in: the date answer first (zero-click queries),
  // exam full name, state name (English + Hindi + native script), the
  // languages the questions are available in, and the year. ≤300 chars
  // so Google doesn't truncate.
  const langCopy = languageList(langs);
  const stateCopy = st ? `${st.name} (${st.nativeName} / ${st.hindiName}). ` : "";
  const dateCopy = held
    ? heldDescriptionLead("en", exam.shortName, held, heldTier)
    : revision
      ? revisionDescriptionLead("en", exam.shortName)
      : titleYear.kind === "held-year"
        ? heldYearDescriptionLead("en", exam.shortName, titleYear.year)
        : `${exam.shortName} exam date: ${nextDate ?? notAnnounced}. `;
  // Honesty (11 Sep 2026): no "verified by students who cleared it" — the
  // content is AI-drafted and checked against the official notification
  // (the page's own SectionVerificationSummary says exactly that).
  // 26 Sep 2026 (G3): mock tests, previous year papers and the question
  // languages are named only where the hub has them.
  const offerText = [
    offers.hasMocks ? "mock tests" : null,
    hubPyqOffer(shared.pyqYears.length > 0, hubHasOfficial),
    "AI tutor",
    "a free day-by-day coach plan",
  ].filter((x): x is string => !!x);
  const descriptionOffer =
    `Free ${exam.shortName} (${exam.name})${cycleYearText} preparation: ${offerText.slice(0, -1).join(", ")} and ${offerText[offerText.length - 1]} — AI-drafted, checked against the official notification. ` +
    `${stateCopy}${shared.validatedQuestionCount > 0 ? `Questions available in ${langCopy}. ` : ""}No paywall.`;
  const description = `${dateCopy}${descriptionOffer}`;
  // The answer lead (26 Sep 2026, G3 — src/lib/answer-lead.ts): the same
  // date decision as the title, the verified pattern, the official site. It
  // heads the English meta description (~160 characters); the twins keep
  // their own description.
  const lead = hubLead({
    short: exam.shortName,
    dateLead,
    titleYear,
    timeline,
    pattern: verifiedPattern(exam),
    officialUrl,
  });

  // Keywords — a wide net mixing English, native-script state name, exam
  // name in native script (transliteration via state's hindi/native name),
  // and the standard long-tail phrases students actually type.
  const baseKeywords = [
    `${exam.shortName} syllabus`,
    `${exam.shortName} mock test`,
    ...(year !== null ? [`${exam.shortName} mock test ${year}`] : []),
    `${exam.shortName} previous year papers`,
    `${exam.shortName} PYQ`,
    `${exam.shortName} preparation`,
    `${exam.shortName} free mocks`,
    `${exam.shortName} online test`,
    ...(year !== null ? [`${exam.shortName} ${year}`] : []),
    `${exam.name}`,
    `Shishya ${exam.shortName}`,
  ];
  const stateKeywords = st ? [
    `${st.name} entrance exams`,
    `${st.name} government exams`,
    `${st.nativeName} ${exam.shortName}`,
    `${st.hindiName} ${exam.shortName}`,
    ...(year !== null ? [`${exam.shortName} ${st.name} ${year}`] : []),
    `${st.name} state exam mock test`,
  ] : [];
  const langKeywords = langs.flatMap((l) => {
    const ln = languageName(l);
    return [
      `${exam.shortName} in ${ln.en}`,
      `${exam.shortName} mock test in ${ln.en}`,
      `${exam.shortName} ${ln.native}`,
    ];
  });

  const path = `/exams/${exam.code}`;
  const url = localizedUrl(path, urlLocale);
  // Localised title/description for the Hindi/Telugu twins — the exam
  // name stays in Latin script (that's how aspirants type it), the
  // intent words are in the language the URL promises.
  const locTitle =
    urlLocale === "hi"
      ? `${hubTitlePrefix("hi", `${exam.shortName}${stateBit}`, titleYear, `${held ? heldTitleLead("hi", held, heldTier) : revision ? revisionTitleLead("hi") : `परीक्षा तिथि ${nextDate ?? notAnnounced}`}, `)}${hubPracticeSuffix("hi", offers)} | Shishya`
      : urlLocale === "te"
        ? `${hubTitlePrefix("te", `${exam.shortName}${stateBit}`, titleYear, `${held ? heldTitleLead("te", held, heldTier) : revision ? revisionTitleLead("te") : `పరీక్ష తేదీ ${nextDate ?? notAnnounced}`}, `)}${hubPracticeSuffix("te", offers)} | Shishya`
        : title;
  const locDateCopy = (lc: "hi" | "te"): string =>
    held
      ? heldDescriptionLead(lc, exam.shortName, held, heldTier)
      : revision
        ? revisionDescriptionLead(lc, exam.shortName)
        : titleYear.kind === "held-year"
          ? heldYearDescriptionLead(lc, exam.shortName, titleYear.year)
          : lc === "hi"
            ? `${exam.shortName} परीक्षा तिथि: ${nextDate ?? notAnnounced}. `
            : `${exam.shortName} పరీక్ష తేదీ: ${nextDate ?? notAnnounced}. `;
  // 26 Sep 2026 (G3): the twins' offer list names only what the hub holds,
  // like the English one.
  const hiOffers = [
    offers.hasMocks ? "मुफ़्त मॉक टेस्ट" : null,
    offers.hasPyq ? "पिछले साल के पेपर" : null,
    offers.hasSyllabus ? "सिलेबस" : null,
    metaGates.cutoff ? "कटऑफ़" : null,
    "AI ट्यूटर",
  ].filter((x): x is string => !!x);
  const teOffers = [
    offers.hasMocks ? "ఉచిత మాక్ టెస్టులు" : null,
    offers.hasPyq ? "గత సంవత్సరాల పేపర్లు" : null,
    offers.hasSyllabus ? "సిలబస్" : null,
    metaGates.cutoff ? "కటాఫ్" : null,
    "AI ట్యూటర్",
  ].filter((x): x is string => !!x);
  const locDescription =
    urlLocale === "hi"
      ? `${locDateCopy("hi")}${exam.shortName} (${exam.name})${cycleYearText} के ${hiOffers.slice(0, -1).join(", ")} और ${hiOffers[hiOffers.length - 1]} — हिंदी में। ${stateCopy}कोई पेवॉल नहीं।`
      : urlLocale === "te"
        ? `${locDateCopy("te")}${exam.shortName} (${exam.name})${cycleYearText} ${teOffers.join(", ")} — తెలుగులో. ${stateCopy}పేవాల్ లేదు.`
        : description;
  // 26 Sep 2026: clipped at the last sentence or word boundary at or under
  // 300 characters (it was sliced mid-word at exactly 300). English: the
  // answer lead heads it, ~160 characters in all (G3).
  const metaDescription =
    urlLocale === "en" && lead ? leadDescription(lead, descriptionOffer) : clipDescription(locDescription, 300);
  return {
    title: locTitle,
    description: metaDescription,
    alternates: {
      canonical: twinCanonical(path, urlLocale, twins),
      languages: languageAlternates(path, twins),
      // Machine-readable twin for AI crawlers/answer engines: the same
      // facts as clean markdown, a fraction of the tokens.
      types: { "text/markdown": `https://shishya.in${path}/context.md` },
    },
    keywords: [...baseKeywords, ...stateKeywords, ...langKeywords],
    openGraph: {
      title: locTitle,
      description: metaDescription,
      url,
      siteName: "Shishya",
      locale: ogLocale(urlLocale),
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: urlLocale === "en" ? metaDescription : clipDescription(description, 200),
    },
  };
}

export default async function ExamPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const session = await auth();
  const userId = session?.user?.id ?? null;
  const { code } = await params;
  const [{ locale, t }, urlLocale] = await Promise.all([getT(), getUrlLocale()]);
  // 16 Sep 2026: hub copy changed in the 11-16 Sep waves, in the reader’s
  // language on the /hi and /te twins (src/lib/exam-hub-copy.ts).
  const H = examHubCopy(locale);

  // Shared payload — cached by unstable_cache for EXAM_CACHE_TTL seconds.
  // First request after a content change pays the DB cost; everyone else
  // gets it from Next's data cache. Drops a hot /exams/[code] TTFB from
  // ~2-3s to ~50-200ms.
  const shared = await getExamShared(code);
  // An inactive exam is seeded ahead of its verified question bank (MP_RAEO,
  // KA_KSRP on 15 Sep 2026). Its hub would promise free mock tests that do
  // not exist yet, so it is not public until it is activated.
  if (!shared || !shared.exam.active) notFound();
  const {
    exam,
    validatedQuestionCount,
    newsItems,
    importantDates,
    pyqYears,
    systemMocks,
    examStats,
    rankBands,
    officialUrl,
  } = shared;

  // Exam Week Mode (6 Sep 2026) — recomputed per request (pure, no DB)
  // rather than read off the cached copy: the today-am/today-pm split
  // flips at 18:00 IST inside the cache TTL, and cache hits hand back
  // Date fields as strings. Phase "none" keeps the plain countdown chip
  // (now with its source tier); any other phase mounts ExamWeekBlock.
  const examWeek = computeExamWeekState(importantDates, officialUrl);
  const nextExamDay =
    examWeek.phase === "none"
      ? buildTimeline(importantDates, new Date(), officialUrl).find((r) => r.kind === "EXAM" && r.daysFromToday > 0) ?? null
      : null;

  // Passed estimates (24 Sep 2026, src/lib/official-source.ts): an EXPECTED
  // date that has gone by is printed as "No official date yet — the expected
  // notification date has passed" — or, where announced rows say it may have
  // gone ahead, "The expected admit card date has passed — check the official
  // website" — never as the date (AP_APPSC_GROUP1 listed "Notification
  // release · 15 Aug 2026" into late September), and is left out when an
  // announced row of the same event (same kind, close in date, same stage)
  // is on the tracker. Judged against every live row (titleDates), not only
  // the capped list, so an announced row beyond the cap still counts.
  const hubDateNow = new Date();
  const hubDateRows = buildTimeline(importantDates, hubDateNow, officialUrl);
  const hubDateRef = shared.titleDates.length > 0 ? buildTimeline(shared.titleDates, hubDateNow, officialUrl) : hubDateRows;
  const hubDateView = new Map(hubDateRows.map((r) => [r.id, { view: passedEstimateView(r, hubDateRef, hubDateNow), kind: r.kind }] as const));
  const hubDates = importantDates.filter((d) => hubDateView.get(d.id)?.view !== "omit");

  // Answer-key time (14 Sep 2026): the score calculator pill shows while a
  // sitting is open for comparison. Read from the tracker inputs the
  // calculator page and the score-entry API use, not importantDates: the
  // hub's copy starts 10 days back, so an exam held weeks before its answer
  // key would never count as held here.
  const scoreSittingOpen = standingSitting(exam, await getExamWeekInputs(exam.id)) !== null;

  // Sub-page gates (16 Sep 2026, src/lib/exam-page-gates.ts): /cutoff,
  // /tricks and /guide 404 for MP RAEO and KA KSRP, /syllabus 404s and
  // /build-mock is empty for the 12 exams with no subjects — all were linked
  // from every hub. Pills, FAQ answers and builder links now name only the
  // pages that render; a failed gate read keeps every link (GATES_OPEN).
  const gates = await examPageGates(exam.code);
  // 26 Sep 2026: the FAQ said "full syllabus with study notes" wherever a
  // syllabus exists, but 127 of the 168 exams with one have no notes (their
  // syllabus page says so). "Study notes" only where a topic has them
  // (src/lib/page-gates-notes.ts; a failed read claims none).
  const hubHasNotes = (await examHasNotes(exam.code)) === true;
  // 26 Sep 2026 (repair): the FAQ claimed every question was answer-checked;
  // 157 validated questions on 55 exams carry no answer-check record. The
  // count answer now states this exam's split; null (failed read) → no claim.
  const faqUncheckedCount = await examUncheckedQuestionCount(exam.code);

  // Subject-wise test rows (gap-fill #1 — users asked for "25-question
  // English/GK/Computer tests" verbatim; the SUBJECT mock API existed but
  // had no UI). Only subjects with ≥10 validated questions get a button.
  const subjectTests = await prisma
    .$queryRaw<{ code: string; name: string; qcount: number }[]>`
      SELECT s.code, s.name, COUNT(q.id)::int AS qcount
      FROM "Subject" s
      JOIN "Topic" t ON t."subjectId" = s.id
      JOIN "Question" q ON q."topicId" = t.id AND q.validated = TRUE
      WHERE s."examId" = ${exam.id}
      GROUP BY s.code, s.name, s."orderIdx"
      HAVING COUNT(q.id) >= 10
      ORDER BY s."orderIdx" ASC
    `.catch(() => [] as { code: string; name: string; qcount: number }[]);

  // Per-category visual theme. The brand saffron stays as the primary
  // CTA colour everywhere on the page (buttons, score boost rail) —
  // this theme drives the secondary accent surfaces so an engineering
  // student walking into JEE feels electric-blue, a medical student
  // into NEET feels emerald, etc. See src/lib/exam-theme.ts.
  const theme = getExamTheme(exam.category);

  // User-specific queries — only run when authenticated. Defaults to empty so
  // unauth render path stays simple. Crawlers never trigger these.
  //
  // We SERIALIZE these 4 queries rather than Promise.all-ing them: the
  // pooled pgbouncer connection_limit=1 makes concurrent queries queue,
  // and when /exams/[code] is prefetched 10+ times in parallel (one per
  // visible dashboard card), the queue overflows the 10s pool timeout
  // and pages take 20+ seconds. Sequential is +200-400ms in isolation
  // but avoids pile-up entirely.
  // Fire EVERY user-specific query in parallel — including
  // computeScoreBoost which itself fans out into 5 more parallel
  // queries. Connection_limit=5 on the pool means these all complete
  // in ~max(query_time) instead of the old sum() wall clock. We
  // speculate on scoreBoost for any signed-in user; if they turn out
  // to be unenrolled we just discard the result (1 wasted query, not
  // worth gating sequentially).
  const [enrollment, weakness, recent, myBest, speculativeScoreBoost] = userId
    ? await Promise.all([
        prisma.enrollment.findUnique({
          where: { userId_examId: { userId, examId: exam.id } },
        }),
        prisma.weaknessMap.findMany({
          where: { userId, examId: exam.id },
          include: { topic: true },
          orderBy: { masteryScore: "asc" },
          take: 5,
        }),
        prisma.attempt.findMany({
          where: {
            userId,
            mock: { examId: exam.id },
            status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
          },
          include: { mock: true },
          orderBy: { startedAt: "desc" },
          take: 5,
        }),
        prisma.attempt.findFirst({
          where: {
            userId,
            mock: { examId: exam.id },
            status: { in: ["SUBMITTED", "AUTO_SUBMITTED"] },
            scorePct: { not: null },
          },
          orderBy: { scorePct: "desc" },
          select: { id: true, scorePct: true, percentile: true, rank: true, finishedAt: true },
        }),
        computeScoreBoost(userId, exam.id).catch(() => null),
      ])
    : ([null, [], [], null, null] as const);

  const isEnrolled = !!enrollment;
  const hasContent = validatedQuestionCount > 0;
  // Discard speculative score boost when user isn't enrolled — no UI uses it.
  const scoreBoost = isEnrolled ? speculativeScoreBoost : null;
  // Exam Week Mode wave 2: what the block knows about THIS student — the
  // shift-day picker (enrolled) and the stored shift day (re-keys the
  // phase). Anonymous → null, nothing new renders.
  const examWeekViewer: ExamWeekViewer | null = userId
    ? { enrolled: isEnrolled, shiftDay: shiftDayIso(enrollment?.shiftDate) }
    : null;
  // Empty-state seed (wave 2): the chat auto-sends the seed as the first
  // message, so it is a complete ask, not an open-ended prefix.
  const emptySeed = `I'm preparing for ${exam.shortName} (${exam.name}). There are no ${exam.shortName} practice questions on Shishya yet — ask me what I need (topics, question types, language) so it can be built.`;

  // Vacancy figure + OFFICIAL source so a student who came to verify "are
  // these vacancies real?" can check at the authoritative site. Raw SQL
  // keeps it independent of the Prisma client typegen. Honest framing:
  // our number is indicative; the link is where the truth lives.
  const eligRows = await prisma
    .$queryRaw<{ vacanciesApprox: number | null; vacanciesNote: string | null; officialUrl: string | null; officialName: string | null; generatedAt: Date }[]>`
      SELECT "vacanciesApprox", "vacanciesNote", "officialUrl", "officialName", "generatedAt"
      FROM "ExamEligibility" WHERE "examId" = ${exam.id} LIMIT 1
    `.catch(() => []);
  const elig = eligRows[0] ?? null;

  // All-India Live Test for this exam — open now, or opening within 7
  // days. One indexed-lookup query; renders the banner under the chips.
  //
  // Exam-week rehearsals (live-test.ts createRehearsalLiveTests) are also
  // LiveTest rows, but they open on a weekday and close at
  // REHEARSAL_CLOSE_IST_HOUR on exam eve — so they must never be announced
  // with the Sunday paper's "this Sunday / closes 11 PM" copy. The join
  // carries the marker so the banner can say what the row actually is.
  const ltRows = await prisma
    .$queryRaw<{ opensAt: Date; closesAt: Date; rehearsalFor: string | null }[]>`
      SELECT lt."opensAt", lt."closesAt", m.config->>'rehearsalFor' AS "rehearsalFor"
      FROM "LiveTest" lt LEFT JOIN "Mock" m ON m.id = lt."mockId"
      WHERE lt."examId" = ${exam.id} AND lt."closesAt" > NOW()
        AND lt."opensAt" < NOW() + INTERVAL '7 days'
      ORDER BY lt."opensAt" ASC LIMIT 1
    `.catch(() => []);
  const liveTest = ltRows[0]
    ? {
        open: ltRows[0].opensAt <= new Date(),
        rehearsal: !!ltRows[0].rehearsalFor,
      }
    : null;
  // Rehearsal close hour = the live-test module's constant (one source of
  // truth shared with the reminder emails and /live-test), formatted here.
  const rehearsalCloseIst = formatIstHour(REHEARSAL_CLOSE_IST_HOUR);

  // Suppress the coach entry for students who already committed to a
  // plan — repeating the ask would be noise.
  const peerProof = await examPeerProof(exam.id, userId).catch(() => null);

  const hasCoachPlan = userId
    ? (
        await prisma
          .$queryRaw<{ n: bigint }[]>`SELECT COUNT(*) n FROM "CoachPlan" WHERE "userId" = ${userId}`
          .catch(() => [{ n: BigInt(0) }])
      )[0].n > BigInt(0)
    : false;

  // Signed-in student's unfinished mock for THIS exam (the ~30%
  // abandonment leak) — resume banner under the chips.
  let resumeMock: { mockId: string; answered: number; total: number } | null = null;
  if (userId) {
    const rm = await prisma
      .$queryRaw<{ mid: string; answers: any; qcount: number }[]>`
        SELECT a."mockId" AS mid, a.answers,
               COALESCE(array_length(m."questionIds", 1), 0)::int AS qcount
        FROM "Attempt" a JOIN "Mock" m ON m.id = a."mockId"
        WHERE a."userId" = ${userId} AND m."examId" = ${exam.id}
          AND a.status = 'IN_PROGRESS' AND a."startedAt" > NOW() - INTERVAL '48 hours'
        ORDER BY a."startedAt" DESC LIMIT 1
      `.catch(() => []);
    if (rm[0]) {
      resumeMock = {
        mockId: rm[0].mid,
        answered: Array.isArray(rm[0].answers)
          ? rm[0].answers.filter((x: any) => x?.chosen != null).length
          : 0,
        total: rm[0].qcount,
      };
    }
  }

  // ── "Try one question" hook for SIGNED-OUT visitors ───────────────
  // 91% of unique visitors browse anonymously and leave without signing
  // in. The exam pages pull strong organic SEO traffic, but the page
  // gives an anonymous visitor nothing to DO — just a "Sign in to start"
  // wall. This fetches ONE real validated question so a signed-out
  // visitor can answer it instantly (no signup), see if they got it
  // right + the worked solution, then hit a "sign in to keep going"
  // gate at peak engagement. Convert the taste into a signup.
  //
  // Prefer a MEDIUM question (representative, not trivial/brutal) from a
  // core topic. Cheap single query; only runs for anonymous visitors.
  let sampleQuestion:
    | { id: string; body: string; options: { key: string; text: string }[]; answerKey: string; solution: string; topicName: string }
    | null = null;
  if (!userId && hasContent) {
    try {
      const q =
        (await prisma.question.findFirst({
          where: { examId: exam.id, validated: true, difficulty: "MEDIUM" },
          select: { id: true, body: true, options: true, answerKey: true, solution: true, topic: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        })) ??
        (await prisma.question.findFirst({
          where: { examId: exam.id, validated: true },
          select: { id: true, body: true, options: true, answerKey: true, solution: true, topic: { select: { name: true } } },
          orderBy: { createdAt: "asc" },
        }));
      if (q) {
        sampleQuestion = {
          id: q.id,
          body: q.body,
          options: (q.options as unknown as { key: string; text: string }[]) ?? [],
          answerKey: q.answerKey,
          solution: q.solution,
          topicName: q.topic?.name ?? "",
        };
      }
    } catch (err) {
      console.error("[exam] sample question fetch failed (non-fatal):", err);
    }
  }

  // JSON-LD structured data — helps Google show this page as a rich
  // Course result with breadcrumb. Built from public exam data only.
  // For state exams we add an `about` field (state name) and a 4-step
  // breadcrumb that includes the state index page, giving Google a clear
  // hierarchy: Home → Exams → State → Specific exam.
  const { stateInfo: lookupState } = await import("@/lib/state-info");
  const stateInfo2 = lookupState(exam.state);
  // Both names on previous-year content (15 Sep 2026, src/lib/pyq-naming.ts).
  const { loadOfficialPapers: loadOfficialPapersHub } = await import("@/lib/official-papers-db");
  const hubPageHasOfficial = (await loadOfficialPapersHub(exam.id)).some((r) => r.kind !== "answer key" && r.kind !== "listing page");
  // What this hub holds (26 Sep 2026, G3 — the title's rule, src/lib/hub-title.ts).
  const hubOffers: HubOffers = {
    hasMocks: systemMocks.length > 0,
    hasPyq: pyqYears.length > 0 || hubPageHasOfficial,
    hasSyllabus: gates.syllabus,
    hasEligibility: !!findDeepContent(exam.code)?.eligibility,
  };
  // Pattern numbers only from a notice read by hand (src/lib/pattern-verified.ts).
  const pattern = verifiedPattern(exam);
  // English body on the English URL: the answer lead and the hub's own FAQ
  // questions (the /hi and /te twins keep their localised copy — G3 veto).
  const englishBody = locale === "en" && urlLocale === "en";
  const courseJsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${exam.shortName}${stateInfo2 ? ` (${stateInfo2.name})` : ""} — ${hubCourseNameTail(hubOffers)}`,
    description: exam.description ?? `${exam.name} preparation on Shishya — ${hubOffers.hasMocks ? "free full-length mocks, " : ""}${hubOffers.hasPyq ? `${hubPyqPhrase(hubPageHasOfficial)}, ` : ""}an AI tutor and a free day-by-day coach plan. Content is AI-drafted and checked against the official notification.`,
    // 26 Sep 2026: the provider points at the one Organization node the root
    // layout declares (src/lib/site-description.ts SITE_ORG_ID), and the
    // level says what the exam is — it said "Entrance Exam" for SSC GD and
    // every state PSC (src/lib/exam-kind.ts).
    provider: {
      "@type": "EducationalOrganization",
      "@id": "https://shishya.in/#organization",
      name: "Shishya",
      url: "https://shishya.in",
    },
    educationalLevel: examKindLabel({ code: exam.code, category: String(exam.category) }),
    inLanguage: exam.languages.length > 0 ? exam.languages : ["en"],
    url: `https://shishya.in/exams/${exam.code}`,
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "Online",
      courseWorkload: `PT${exam.durationMin}M`,
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "INR",
      availability: "https://schema.org/InStock",
      url: `https://shishya.in/exams/${exam.code}`,
    },
  };
  if (stateInfo2) {
    courseJsonLd.about = {
      "@type": "AdministrativeArea",
      name: stateInfo2.name,
      alternateName: [stateInfo2.nativeName, stateInfo2.hindiName],
    };
  }
  const { stateSlug } = await import("@/lib/state-info");
  const breadcrumbItems: Array<Record<string, unknown>> = [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
    // /exams redirects to / — point at pages that exist (15 Sep 2026).
    stateInfo2
      ? { "@type": "ListItem", position: 2, name: "Exams by state", item: "https://shishya.in/exams/state" }
      : { "@type": "ListItem", position: 2, name: "All exams", item: "https://shishya.in/exams/browse" },
  ];
  if (stateInfo2) {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: `${stateInfo2.name} exams`,
      item: `https://shishya.in/exams/state/${stateSlug(stateInfo2.code)}`,
    });
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 4,
      name: exam.shortName,
      item: `https://shishya.in/exams/${exam.code}`,
    });
  } else {
    breadcrumbItems.push({
      "@type": "ListItem",
      position: 3,
      name: exam.shortName,
      item: `https://shishya.in/exams/${exam.code}`,
    });
  }
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems,
  };

  // The hub's own FAQ questions (26 Sep 2026, G3 — src/lib/hub-faq.ts).
  // They were a second, schema-only FAQPage here beside ExamFaq's visible
  // one; now they join ExamFaq's list, so ONE FAQPage carries exactly the
  // questions the accordion shows. Built ONLY from the exam's own stored
  // facts: pattern and negative-marking answers only for a verified
  // pattern, the cutoff answer quotes the published figure and its document
  // when the cutoff page has one (official tier only), each offer only
  // where the hub has it. English body only — the twins keep ExamFaq's four.
  // 27 Sep 2026 (repair): the languages answer comes from the verified
  // pattern's notice (src/lib/hub-faq.ts), never the unsourced
  // Exam.languages list.
  const hubCutoff = englishBody && gates.cutoff ? await getHubCutoffHeadline(exam.id, officialUrl).catch(() => null) : null;
  const hubCutoffOfficial =
    hubCutoff?.headline && hubCutoff.headline.tier === "official"
      ? cutoffHeadlineSentences(exam.shortName, hubCutoff.year, hubCutoff.headline).join(" ")
      : null;
  const hubFaqExtra = englishBody
    ? hubFaqExtraItems({
        code: exam.code,
        short: exam.shortName,
        name: exam.name,
        pattern,
        cutoffPage: gates.cutoff,
        cutoffOfficial: hubCutoffOfficial,
        realPatternMock: systemMocks.some((m) => (m.config as any)?.pattern === "real"),
        buildMock: gates.buildMock,
        hasContent,
        hasPyqSets: pyqYears.length > 0,
        hasOfficialPapers: hubPageHasOfficial,
        syllabus: gates.syllabus,
        notes: hubHasNotes,
        tricks: gates.tricks,
        otherLanguageCount: OTHER_INDIAN_LANGUAGE_COUNT,
        tutorLanguageCount: INDIAN_LANGUAGE_COUNT,
      })
    : [];
  // The answer lead under the H1 (26 Sep 2026, G3 — src/lib/answer-lead.ts):
  // the title's date decision over the same live rows, the verified pattern,
  // the official site. English body only.
  const leadRows = shared.titleDates.length > 0 ? shared.titleDates : importantDates;
  const leadNow = new Date();
  const leadTimeline = buildTimeline(leadRows, leadNow, officialUrl);
  const leadDecision = hubDateLead(leadTimeline, exam, new Map(leadRows.map((r) => [r.id, r.createdAt] as const)));
  const hubLeadText = englishBody
    ? hubLead({
        short: exam.shortName,
        dateLead: leadDecision,
        titleYear: hubTitleYear(leadDecision, leadTimeline, exam, leadNow),
        timeline: leadTimeline,
        pattern,
        officialUrl,
      })
    : null;
  // Sign-in box copy for a hub with no previous year paper (G3): the default
  // promises "previous year paper practice".
  const ctaCopy = hubPracticeCtaCopy(locale, hubOffers);

  // "Related on Shishya" (26 Sep 2026, src/lib/exam-related-links.ts): the
  // NCERT subject pages an entrance or olympiad aspirant studies from and the
  // career guides that name this exam — at most eight links, each to a page
  // that exists. The school surface is the cached read the sitemap uses; a
  // failed read drops the school links, never the page.
  const relatedSurface = await loadSchoolSurface().catch(() => ({ classes: [] }));
  const related: RelatedLink[] = relatedLinks(exam.code, relatedSurface, CAREERS);
  // Entrance and olympiad hubs also point at the entrance landing
  // (/exams/entrance) — the one page that lists every entrance exam,
  // olympiad and state CET on Shishya.
  const hubKind = examKind({ code: exam.code, category: String(exam.category) });
  const entranceIndex = hubKind === "entrance" || hubKind === "olympiad";

  return (
    // Whole-page background tinted to the category theme. This is the
    // single biggest visual differentiator — walking from NEET (emerald
    // wash) into JEE (blue wash) into UPSC (rose wash) feels like
    // moving between different rooms. Saffron CTAs / cards stay on top
    // of the wash so the brand remains intact.
    <main className={`min-h-screen ${theme.pageBg}`}>
      {/* JSON-LD for Google rich-result eligibility */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(courseJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* 26 Sep 2026 (G3): no second FAQPage here — ExamFaq below carries the
          one FAQPage, built from the questions its accordion shows. */}
      <Header />
      {/* Per-category top ribbon — 6px coloured strip that immediately
          signals which "track" the visitor is in (engineering blue,
          medical green, civil-services red, etc). Saffron remains the
          brand colour beneath the ribbon. */}
      <div className={`h-1.5 w-full ${theme.ribbon}`} aria-hidden />
      <section className="container-prose py-10">
        <AnonQuizRecall examCode={exam.code} />
        <p className="text-xs text-ink-500">
          {/* 26 Sep 2026 (G3): the dashboard crumb only for a signed-in
              student — for everyone else (and crawlers) it was a link to a
              sign-in wall. They get the exam index instead. */}
          {userId ? (
            <>
              <Link href="/dashboard" className="hover:text-ink-800">{t("nav.dashboard")}</Link> · {t("nav.exams")} ·{" "}
            </>
          ) : (
            <>
              <Link href="/exams/browse" prefetch={false} className="hover:text-ink-800">{t("nav.exams")}</Link> ·{" "}
            </>
          )}
          {stateInfo2 && (
            <>
              <Link href={`/exams/state/${stateSlug(stateInfo2.code)}`} prefetch={false} className="hover:text-ink-800">
                {fillTemplate(t("exam.state.crumb"), { state: stateInfo2.name })}
              </Link>{" "}
              ·{" "}
            </>
          )}
          {exam.shortName}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Category badge — pill above the title that mirrors the
              ribbon's hue. Tells the visitor at a glance which
              category this exam falls into, without forcing them to
              scroll/search for it. */}
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${theme.badge}`}
          >
            <span aria-hidden>{theme.icon}</span>
            {theme.label}
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-ink-900">{exam.shortName}</h1>
        {/* The answer first (26 Sep 2026, G3): what the searcher came for, from
            stored rows only — the date the title states, with its tier. */}
        {hubLeadText && <p className="mt-2 max-w-3xl text-base leading-relaxed text-ink-800">{hubLeadText}</p>}
        <p className="mt-1 text-sm text-ink-600">{exam.name}</p>
        <p className="mt-4 max-w-3xl text-sm text-ink-700">{exam.description}</p>
        {/* The state page link (15 Sep 2026): hubs named their state only in
            JSON-LD, so crawlers barely reached the state pages. */}
        {stateInfo2 && (
          <p className="mt-2 text-sm">
            <Link href={`/exams/state/${stateSlug(stateInfo2.code)}`} prefetch={false} className="font-medium text-saffron-700 hover:underline">
              {fillTemplate(t("exam.state.more"), { state: stateInfo2.name })}
            </Link>
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-3 text-xs text-ink-600">
          {/* Exam-day countdown — only while the exam is MORE than a week
              out (phase none). Inside the week the ExamWeekBlock below
              takes over, and it keeps rendering on exam day and after
              (the old chip died at 05:30 IST on D0). IST day math, and
              the source tier travels with the number — an estimated
              date is never counted down to bare. */}
          {nextExamDay && (
            <span className={`inline-flex items-center gap-1 rounded-full border-2 px-3 py-1 font-semibold ${theme.borderAccent} bg-white text-ink-900`}>
              <span aria-hidden>🎯</span>
              {nextExamDay.daysFromToday === 1
                ? t("exam.countdown.tomorrow")
                : `${nextExamDay.daysFromToday} ${t("exam.countdown.days")}`}
              <span className="font-normal text-ink-500">({t(`ew.tier.${nextExamDay.tier}`)})</span>
            </span>
          )}
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.totalQuestions} {t("exam.totalQs")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.totalMarks} {t("exam.marks")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">{exam.durationMin} {t("exam.minutes")}</span>
          <span className="rounded-full bg-white border border-ink-200 px-3 py-1">
            {t("exam.negative")}: {exam.negativeMark === 0 ? t("exam.no.negative") : `−${formatNegativeMark(exam.negativeMark)}`}
          </span>
          {/* Deep links to the dedicated SEO landings — also internal-link
              equity for the "[exam] syllabus/cutoff" pages. Each sub-page
              pill only where that page renders (gates, 16 Sep 2026). */}
          <Link
            href={`/exams/${exam.code}/updates`}
            className="rounded-full border border-saffron-400 bg-saffron-100 px-3 py-1 font-semibold text-saffron-900 hover:bg-saffron-200"
          >
            {t("tracker.pill")}
          </Link>
          {gates.syllabus && (
            <Link
              href={`/exams/${exam.code}/syllabus`}
              className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 font-medium text-saffron-800 hover:bg-saffron-100"
            >
              📋 Full syllabus
            </Link>
          )}
          {gates.cutoff && (
            <Link
              href={`/exams/${exam.code}/cutoff`}
              className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 font-medium text-saffron-800 hover:bg-saffron-100"
            >
              🎯 Expected cutoff
            </Link>
          )}
          {/* Answer-key time (14 Sep 2026): while a sitting is open for
              comparison — the exam window, or an official key under 45 days
              old — and its marking scheme can be stated. */}
          {scoreSittingOpen && (
            <Link
              href={`/exams/${exam.code}/score-estimate`}
              className="rounded-full border border-saffron-400 bg-saffron-100 px-3 py-1 font-semibold text-saffron-900 hover:bg-saffron-200"
            >
              🧮 {H.scoreCalc}
            </Link>
          )}
          {gates.tricks && (
            <Link
              href={`/exams/${exam.code}/tricks`}
              className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 font-medium text-saffron-800 hover:bg-saffron-100"
            >
              🧠 Tricks &amp; mnemonics
            </Link>
          )}
          {gates.guide && (
            <Link
              href={`/exams/${exam.code}/guide`}
              className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 font-medium text-saffron-800 hover:bg-saffron-100"
            >
              📖 How to crack it
            </Link>
          )}
          <Link
            href="/revision"
            className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 font-medium text-saffron-800 hover:bg-saffron-100"
          >
            🔁 Mistake Notebook
          </Link>
          {["GOVT_JOBS", "BANKING", "STATE_LEVEL"].includes(exam.category) && (
            <Link
              href="/typing"
              className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 font-medium text-saffron-800 hover:bg-saffron-100"
            >
              ⌨️ Typing practice
            </Link>
          )}
          {["GOVT_JOBS", "BANKING", "CIVIL_SERVICES", "STATE_LEVEL"].includes(exam.category) && (
            <Link
              href="/descriptive"
              className="rounded-full border border-saffron-300 bg-saffron-50 px-3 py-1 font-medium text-saffron-800 hover:bg-saffron-100"
            >
              ✍️ Essay &amp; letter check
            </Link>
          )}
        </div>

        {/* Exam Week Mode (6 Sep 2026) — one card that changes with the
            IST phase: week / eve / exam day / window / post. Renders
            nothing outside the ±7-day window. Sits above everything
            else because on D-1 and D0 this is what the visitor came for.
            Weakest-topic quiz link only for a signed-in student whose
            weakness map we already loaded. */}
        {examWeek.phase !== "none" && (
          <ExamWeekBlock
            exam={{ id: exam.id, code: exam.code, shortName: exam.shortName, category: exam.category, state: exam.state, name: exam.name }}
            rows={importantDates}
            officialUrl={officialUrl}
            locale={locale}
            urlLocale={urlLocale}
            signedIn={!!userId}
            weakTopicCode={weakness[0]?.topic.code ?? null}
            viewer={examWeekViewer}
          />
        )}

        {/* Sign-in CTA banner for unauthenticated visitors. Crawlers see
            this; search-arriving students see exactly what they get for free.
            Border + background take their colour from the per-category theme
            so the CTA feels native to the exam track (blue for engineering,
            green for medical, etc) rather than a generic saffron pop-out.
            Audit 11 Sep 2026: sells the concrete account value (the coach
            plan is what converts — coach landers bounce 8%), in CoachEntry's
            own words; no "expert-curated" / "verified by students who
            cleared" — content is AI-drafted and checked against the official
            notification.
            18 Sep 2026: the 11 Sep coach-plan pitch ("build my plan",
            callback /coach) cost sign-ins — hub -> /login within 30 min went
            49% -> 40% -> 31% — because a visitor who asked for mocks or
            previous year papers was offered a plan. The box leads with
            practice again, the plan is one of the things the account saves,
            and sign-in returns to this exam page where the mocks are.
            22 Sep 2026: the read of that fix (n=145 ChatGPT hub guests, old
            identity rule) put hub -> /login within 30 min back at 52% (was
            40%), so the next lever queued by the 18 Sep synthesis ships: the
            box moves up from the 7th block to right after the chips, on the
            first or second phone screen. */}
        {/* 26 Sep 2026 (G3): only where the hub has checked questions — on the
            12 hubs with none the box promised mock tests that do not exist
            (the Mock Tests section's empty state asks what to build instead).
            A hub with no previous year paper gets copy that names none. */}
        {!userId && hasContent && (
          <div className={`mt-6 rounded-md border p-5 ${theme.borderAccent} ${theme.heroTint}`}>
            <p className="text-sm font-semibold text-ink-900">
              {fillHub(ctaCopy?.coachTitle ?? H.coachTitle, { short: exam.shortName })}
            </p>
            <p className="mt-1 text-sm text-ink-700">
              {ctaCopy?.coachBodyA ?? H.coachBodyA}<strong>Shishya</strong>{" "}
              {H.coachBodyB}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {/* Click beacon (16 Sep 2026): the one hub CTA that sent no
                  CTA_CLICKED, so its volume could only be guessed from
                  /login views. Same <a>: href, class and text unchanged. */}
              <HubSignInLink
                examCode={exam.code}
                href={`/login?callbackUrl=${encodeURIComponent(`/exams/${exam.code}`)}`}
                className="btn-primary inline-block !py-2 !px-4 text-sm"
              >
                {H.coachButton}
              </HubSignInLink>
              {/* Lever #2 — anonymous 5-question diagnostic. Lets a signed-out
                  visitor experience the mock loop before the login gate (44%
                  bail there). Was a text link — got ~zero organic clicks, so
                  it's a proper button with equal visual weight now. */}
              <Link
                href={`/exams/${exam.code}/quiz`}
                className="inline-flex items-center justify-center rounded-md border-2 border-saffron-500 bg-white px-4 py-2 text-sm font-bold text-saffron-700 transition-colors hover:bg-saffron-50"
              >
                Try a free 5-question quiz — no signup →
              </Link>
            </div>
          </div>
        )}

        {/* Coach entry — the exam hub is where most organic visitors
            actually land (not the homepage), so this is the coach's
            highest-intent door. Hidden for students who already have a
            plan: their dashboard carries it instead. */}
        {/* Cohort proof — "your competition studied today" is the most
            motivating true sentence we can show on an exam page. */}
        <PeerProofLine proof={peerProof} examShort={exam.shortName} variant="exam" />

        {!hasCoachPlan && <CoachEntry examCode={exam.code} examShort={exam.shortName} />}

        {/* Plan-holders don't get re-asked — they get their plan back:
            the next-task breadcrumb (client-side; renders nothing for
            everyone else, so the ISR page stays clean). */}
        {hasCoachPlan && <CoachNextTask />}

        {/* Unfinished-mock resume banner. */}
        {resumeMock && (
          <Link
            href={`/mocks/${resumeMock.mockId}`}
            rel="nofollow"
            className="mt-5 flex items-center justify-between gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 transition-colors hover:border-amber-400"
          >
            <span className="text-sm text-ink-800">
              ⏸ You have an unfinished {exam.shortName} mock — {resumeMock.answered}/
              {resumeMock.total} answered
            </span>
            <span className="shrink-0 text-sm font-bold text-amber-700">Resume →</span>
          </Link>
        )}

        {/* All-India Live Test banner — shown while this exam has a
            test open now or opening within the week. */}
        {liveTest && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-ink-900">
                {liveTest.rehearsal ? (
                  <>
                    🇮🇳 {H.rehearsalKicker} —{" "}
                    {fillHub(liveTest.open ? H.rehearsalOpen : H.rehearsalSoon, { time: rehearsalCloseIst })}
                  </>
                ) : (
                  <>
                    🇮🇳 All-India Live Test —{" "}
                    {liveTest.open ? "LIVE now, closes 11 PM IST" : `this Sunday, 6 AM – 11 PM IST`}
                  </>
                )}
              </p>
              <p className="text-xs text-ink-600">
                Same {exam.shortName} paper across India. Your national rank, the moment you
                submit. Free.
              </p>
            </div>
            <Link
              href="/live-test"
              className="shrink-0 rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-saffron-600"
            >
              {liveTest.open ? "Write it now →" : "See details →"}
            </Link>
          </div>
        )}

        {/* Vacancies + OFFICIAL source — the "is this real?" verification
            block. Our figure is indicative; the link goes to the
            authoritative conducting body where the truth is published. */}
        {(elig?.vacanciesApprox || elig?.officialUrl) && (
          <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50/50 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              {elig?.vacanciesApprox ? (
                <span className="font-semibold text-ink-900">
                  ~{elig.vacanciesApprox.toLocaleString("en-IN")} vacancies
                  <span className="ml-1 font-normal text-ink-500">(indicative / typical)</span>
                </span>
              ) : null}
              {elig?.officialUrl && (
                <a
                  href={elig.officialUrl}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                >
                  ✓ Verify on {elig.officialName || "the official site"} ↗
                </a>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-500">
              {elig?.generatedAt && (
                <span className="inline-flex items-center gap-1 text-ink-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                  Updated {new Date(elig.generatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} ·
                </span>
              )}
              Vacancy counts change every cycle — always confirm the exact number in the latest
              official notification before applying.
            </p>
          </div>
        )}

        {/* WhatsApp-first share — aspirants organise prep in WhatsApp
            groups; one tap spreads this free PYQ/syllabus hub to a whole
            batch and seeds a referral the channel report can attribute. */}
        <div className="mt-5">
          <ShareExamButton
            url={`https://shishya.in/exams/${exam.code}`}
            message={hubShareMessage(exam.shortName, hubOffers, hasContent)}
            surface="exam"
          />
        </div>

        {/* Single section-level verification badge covers the static
            exam meta above (pattern, duration, marks). Once per-fact
            verification rows ship in Phase 2 each chip will get its
            own badge. */}
        <SectionVerificationSummary
          status="ai"
          source="official exam authority notification"
          refreshCadence="weekly"
        />

        {/* "Try one question" hook — converts anonymous SEO traffic.
            Shown to signed-out visitors (the sign-in box itself moved up
            to the chips on 22 Sep 2026; this stays after the source line):
            answer one real question free, see the worked solution, then
            sign in to continue. Only renders when we found a sample. */}
        {!userId && sampleQuestion && (
          <TryOneQuestion
            examCode={exam.code}
            examShortName={exam.shortName}
            topicName={sampleQuestion.topicName}
            question={{
              body: sampleQuestion.body,
              options: sampleQuestion.options,
              answerKey: sampleQuestion.answerKey,
              solution: sampleQuestion.solution,
            }}
          />
        )}

        {/* Per-exam Diagnostic-5 hero.
            Surfaces for signed-in users who landed on this exam page
            from search / direct link / share and have ZERO prior
            attempts on it. Mirrors the /dashboard hero but scoped
            to this exam — catches the "high-intent organic arrival"
            case where the user signed up specifically because of
            THIS exam and was bouncing because the dashboard hero
            offered a different exam (or because they never made it
            to /dashboard at all). */}
        {userId && hasContent && recent.length === 0 && (
          <DiagnosticHero
            examCode={exam.code}
            examShortName={exam.shortName}
          />
        )}

        {/* Action panel */}
        <div className="mt-8 rounded-md border border-ink-200 bg-white p-6">
          {!hasContent ? (
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-ink-600">{t("exam.no.content")}</p>
              <Link rel="nofollow" href={`/chat?examCode=${exam.code}`} className="btn-secondary !py-2 !px-4 text-xs sm:text-sm">
                {t("nav.tutor")}
              </Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-ink-900">
                    {isEnrolled ? t("exam.action.continue") : t("exam.action.start")}
                  </p>
                  <p className="mt-0.5 text-xs text-ink-500">
                    {isEnrolled ? t("exam.action.continue.body") : t("exam.action.start.body")}
                  </p>
                </div>
                <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
                  <Link
                    rel="nofollow" href={`/chat?examCode=${exam.code}`}
                    data-tour="exam-ask"
                    className="btn-secondary !py-2 !px-4 text-xs sm:text-sm"
                  >
                    {t("nav.tutor")}
                  </Link>
                  <span data-tour="exam-start-mock">
                    <StartMockButton locale={locale}
                      examCode={exam.code}
                      hasHistory={isEnrolled && recent.length > 0}
                      labels={{
                        adaptive: t("exam.cta.adaptive"),
                        diagnostic: t("exam.cta.diagnostic"),
                        firstDiagnostic: t("exam.cta.firstDiagnostic"),
                        building: t("exam.cta.building"),
                      }}
                    />
                  </span>
                </div>
              </div>
              {/* Exam Week Mode wave 2: the one promise attached to
                  enrolling — under the enrol (first diagnostic) button,
                  until the student is enrolled. */}
              {!isEnrolled && (
                <p className="mt-2 text-[11px] text-ink-500 sm:text-right">{t("ew.enrol.resultNote")}</p>
              )}
            </>
          )}
          {/* Custom mock builder + language line (1 Sep 2026) — both are
              top mined demands: "mock in which (maths, polity…)" and
              "mock test only hindi language". The builder link answers
              the first; the line answers the second (the player has
              translated questions since July — students just never
              found the picker). */}
          {gates.buildMock && (
            <p className="mt-3 text-xs text-ink-600">
              🧩{" "}
              <Link href={`/exams/${exam.code}/build-mock`} className="font-semibold text-saffron-700 hover:underline">
                {H.buildMock}
              </Link>{" "}
              <span className="text-ink-500">{fillHub(H.langLine, { n: OTHER_INDIAN_LANGUAGE_COUNT })}</span>
            </p>
          )}
        </div>

        {/* ── Deep content (eligibility / cutoffs / paper analysis / salary)
            ───────────────────────────────────────────────────────────
            Per-exam high-intent SEO content. Renders only when authored
            for this exam (see src/data/exam-deep-content.ts). Sits ABOVE
            the interactive PYQ/Mocks panel so organic-search arrivals
            see the answer to their query before the CTA wall. */}
        {(() => {
          const deep = findDeepContent(exam.code);
          if (!deep || !hasDeepContent(deep)) return null;
          return <ExamDeepContentBlock content={deep} examShortName={exam.shortName} />;
        })()}

        {/* FAQ — visible accordion + FAQPage JSON-LD (rich-result eligible).
            Sits above the interactive panel with the deep content so organic
            arrivals get answers to "is it free / how many questions / PYQs"
            before the CTA wall. */}
        <ExamFaq
          examShortName={exam.shortName}
          examName={exam.name}
          questionCount={validatedQuestionCount}
          uncheckedCount={faqUncheckedCount}
          pyqYears={pyqYears
            .map((y) => y.pyqYear)
            .filter((n): n is number => typeof n === "number")}
          durationMin={pattern ? pattern.durationMin : null}
          hasOfficialPapers={hubPageHasOfficial}
          locale={locale}
          extraItems={hubFaqExtra}
        />

        <div className="mt-2 lg:grid lg:grid-cols-3 lg:gap-8">
        <div className="lg:col-span-2 min-w-0">

        {/* ── Previous Papers ─────────────────────────────────────────── */}
        <section id="pyqs" className="mt-10 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.pyq.title")}</h2>
            <span className="text-xs text-ink-500">
              {pyqYears.reduce((a, r) => a + r._count, 0)} {t("exam.pyq.totalQs")}
            </span>
          </div>
          {/* The real papers first (14 Sep 2026): students and ChatGPT look for
              them, and the sets below are pattern practice, never the paper. */}
          <OfficialPapersBlock examId={exam.id} />
          {pyqYears.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
              {t("exam.pyq.empty")}
            </p>
          ) : (
            <>
              {/* Honesty (11 Sep 2026): none of these is the paper. Every
                  question is freshly worded in that year's pattern, and a
                  student scanning five year cards should not have to open
                  one to find out it is 20 questions against a 150-Q paper. */}
              <p className="mt-2 text-xs text-ink-500">{H.pyqNote}</p>
              <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                {pyqYears.map((y) => (
                  <li key={y.pyqYear ?? 0} className="rounded-md border border-ink-200 bg-white p-3">
                    <p className="text-lg font-semibold text-ink-900">{y.pyqYear}</p>
                    <p className="mt-0.5 text-xs text-ink-500">
                      {pyqSetLine(H, y._count, y.pyqYear, exam.totalQuestions)}
                    </p>
                    <Link
                      href={`/exams/${exam.code}/pyq/${y.pyqYear}`}
                      className="mt-2 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800"
                    >
                      {t("exam.pyq.takeSet")} →
                    </Link>
                  </li>
                ))}
              </ul>
              {/* Topic-wise PYQs (15 Sep 2026): students asked for "PYQ topic based" —
                  the builder's PYQ-pattern mode draws a topic's questions from every year. */}
              {gates.buildMock && pyqYears.reduce((a, r) => a + r._count, 0) >= 20 && (
                <Link
                  href={`/exams/${exam.code}/build-mock?pyq=1`}
                  prefetch={false}
                  className="mt-3 inline-block text-xs font-semibold text-saffron-700 hover:text-saffron-800"
                >
                  {t("exam.pyq.byTopic")}
                </Link>
              )}
            </>
          )}
        </section>

        {/* ── Mock Tests ──────────────────────────────────────────────── */}
        <section id="mocks" className="mt-10 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.mocks.title")}</h2>
            {/* A student's own attempts: signed-in only (26 Sep 2026, G3). */}
            {userId && (
              <Link
                href={`/exams/${exam.code}/attempts`}
                className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
              >
                {t("exam.mocks.allAttempts")} →
              </Link>
            )}
          </div>
          <p className="mt-1 text-xs text-ink-500">{t("exam.mocks.langHint")}</p>
          {/* START SMALL for newcomers (23 Aug 2026): week data — 25-Q
              subject / topic tests finish 81% of the time, 100-Q full
              mocks only 66%; a first full mock is the #1 abandonment
              point. Until an aspirant has finished 2 mocks on this exam,
              short formats are listed first and a one-line steer points
              at the subject tests. Full mocks stay one scroll away. */}
          {recent.length < 2 && subjectTests.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900">
              <span className="font-semibold">New to {exam.shortName}? Start small:</span>
              <span>a 25-question subject test first — 4 in 5 aspirants finish these; full mocks after your first win.</span>
              <a href="#subject-tests" className="font-semibold underline underline-offset-2">Pick a subject test ↓</a>
            </div>
          )}
          {systemMocks.length === 0 && validatedQuestionCount === 0 ? (
            /* Exam Week Mode wave 2 — honest empty state: no validated
               questions AND no shared mocks. Instead of "being curated",
               the student tells the tutor what they need (the chat seed is
               auto-sent as the first message) and gets one email when it
               is live. nofollow: the chat is a per-student surface. */
            <div className="mt-3 rounded-xl border-2 border-dashed border-saffron-300 bg-white px-4 py-5">
              <p className="text-sm font-bold text-ink-900">{String(t("ew.empty.title")).replace("{exam}", exam.shortName)}</p>
              <p className="mt-1 text-sm text-ink-700">{String(t("ew.empty.body")).replace(/\{exam\}/g, exam.shortName)}</p>
              <Link
                rel="nofollow"
                href={`/chat?examCode=${exam.code}&seed=${encodeURIComponent(emptySeed)}`}
                className="mt-3 inline-block rounded-lg bg-saffron-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-saffron-600"
              >
                💬 {t("ew.empty.cta")} →
              </Link>
            </div>
          ) : systemMocks.length === 0 ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
              {t("exam.mocks.empty")}
            </p>
          ) : (
            // Mocks live inside the lg:col-span-2 main column (2/3 of
            // container-prose, ~830px at common laptop widths). A
            // 3-col grid here squeezes each tile to ~260px which
            // wrapped longer mock titles awkwardly. Hold at 2-col
            // until xl (1280px+) where the main column reaches
            // ~960px and 3 columns have proper breathing room.
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {(recent.length < 2
                ? [...systemMocks].sort((a, b) => {
                    // Newcomers: short formats first (diagnostic, subject,
                    // topic), full-length papers after — stable otherwise.
                    const w = (m: { type: string }) =>
                      m.type === "DIAGNOSTIC" ? 0 : m.type === "SUBJECT" || m.type === "TOPIC" ? 1 : m.type === "FULL" ? 3 : 2;
                    return w(a) - w(b);
                  })
                : systemMocks
              ).map((m) => (
                <li key={m.id} className="rounded-md border border-ink-200 bg-white p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-ink-900">{m.title}</p>
                    <span className="rounded-full border border-ink-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-600">
                      {/* 15 Sep 2026: a "FULL" mock holding under 80% of the real paper
                          (most PYQ-pattern years) is a set, not a full paper. */}
                      {m.type === "FULL" && exam.totalQuestions > 0 && m.questionIds.length < 0.8 * exam.totalQuestions ? "SET" : m.type}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">
                    {m.questionIds.length} {t("exam.pyq.questions")}
                    {(m.config as any)?.durationMin ? ` · ${(m.config as any).durationMin} ${t("exam.minutes")}` : ""}
                  </p>
                  <Link
                    href={`/mocks/${m.id}`}
                    rel="nofollow"
                    prefetch={false}
                    className="mt-2 inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800"
                  >
                    {t("exam.mocks.take")} →
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {recent.length > 0 && (
            <div className="mt-5">
              <h3 className="text-xs font-medium uppercase tracking-wide text-ink-500">
                {t("exam.mocks.recent")}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {recent.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center justify-between rounded-md border border-ink-200 bg-white px-3 py-2 text-sm">
                    <span className="text-ink-800">{a.mock.title}</span>
                    <span className="flex items-center gap-3 text-xs text-ink-500">
                      <span>{formatDisplayScorePct(a.scorePct)}</span>
                      <Link href={`/attempts/${a.id}/results`} prefetch={false} className="font-medium text-saffron-700 hover:text-saffron-800">
                        {t("exam.mocks.review")} →
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* ── Practice by subject (gap-fill #1) ─────────────────────────
            Users asked for longer subject-wise tests verbatim. One tap per
            subject → 25-Q SUBJECT mock from the validated pool. */}
        {subjectTests.length > 0 && (
          <section id="subject-tests" className="mt-10 scroll-mt-20">
            <h2 className="text-base font-semibold text-ink-800">Practice by subject &amp; topic</h2>
            <p className="mt-1 text-xs text-ink-500">
              Full-length subject tests below — 25 questions each, real exam format, instant scoring.
              {/* 26 Sep 2026 (repair): said "Every topic has its own 10-question test";
                  the topic page's quiz is 5 questions and shows only on topics with
                  practice questions (about half of all topics have none yet). */}
              Want to drill a single topic? Open it from the{" "}
              <a href="#syllabus" className="font-medium text-saffron-700 underline-offset-2 hover:underline">
                syllabus
              </a>{" "}
              — a topic that has practice questions has a short quiz on its page.
            </p>
            <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {subjectTests.map((s) => (
                <li key={s.code} className="rounded-md border border-ink-200 bg-white p-4">
                  <div className="flex items-baseline justify-between">
                    <p className="text-sm font-medium text-ink-900">{s.name}</p>
                    <span className="text-[11px] tabular-nums text-ink-500">
                      {s.qcount.toLocaleString("en-IN")} Qs
                    </span>
                  </div>
                  <div className="mt-3">
                    <SubjectTestButton
                      examCode={exam.code}
                      subjectCode={s.code}
                      subjectName={s.name}
                      available={s.qcount}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* ── Build my own mock (custom generation UI over the existing
            USER_REQUEST / ADAPTIVE APIs — "give me 20 hard questions on
            Percentage" finally has a button). */}
        {hasContent && (
          <section id="custom-mock" className="mt-10 scroll-mt-20">
            <h2 className="text-base font-semibold text-ink-800">🎯 Build my own mock</h2>
            <p className="mt-1 text-sm text-ink-600">
              Tell Shishya exactly what to test you on — topics, size, difficulty — and get a fresh
              mock in seconds. Leave the box blank and we&apos;ll target your weakest topics.
            </p>
            <div className="mt-3">
              <CustomMockBuilder examCode={exam.code} />
            </div>
          </section>
        )}

        {/* ── Rank & Leaderboard ──────────────────────────────────────── */}
        <section id="rank" className="mt-10 scroll-mt-20">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.rank.title")}</h2>
            <span className="text-xs text-ink-500">{t("exam.rank.subtitle")}</span>
          </div>
          {!myBest ? (
            <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
              {t("exam.rank.empty")}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-saffron-300 bg-saffron-50 p-4">
                <p className="text-xs uppercase tracking-wide text-saffron-800">{t("exam.rank.bestScore")}</p>
                <p className="mt-1 text-3xl font-bold text-ink-900 tabular-nums">{formatDisplayScorePct(myBest.scorePct)}</p>
              </div>
              <div className="rounded-md border border-ink-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-ink-500">{t("exam.rank.percentile")}</p>
                <p className="mt-1 text-3xl font-bold text-ink-900 tabular-nums">
                  {myBest.percentile?.toFixed(1) ?? "—"}
                </p>
              </div>
              <div className="rounded-md border border-ink-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-ink-500">{t("exam.rank.rank")}</p>
                <p className="mt-1 text-3xl font-bold text-ink-900 tabular-nums">
                  {myBest.rank ? `#${myBest.rank}` : "—"}
                </p>
              </div>
            </div>
          )}

          {/* Aggregate cohort stats — how many took it and how they
              scored. PRIVACY: no names, no individual rows; a student's
              own rank shows only to that signed-in student (cards above). */}
          {examStats.attempts > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-md border border-ink-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-ink-500">Students</p>
                <p className="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{examStats.students.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-md border border-ink-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-ink-500">Mocks taken</p>
                <p className="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{examStats.attempts.toLocaleString("en-IN")}</p>
              </div>
              <div className="rounded-md border border-ink-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-ink-500">Average score</p>
                <p className="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{examStats.avgPct != null ? `${Math.round(examStats.avgPct)}%` : "—"}</p>
              </div>
              <div className="rounded-md border border-ink-200 bg-white p-4">
                <p className="text-xs uppercase tracking-wide text-ink-500">Top score</p>
                <p className="mt-1 text-2xl font-bold text-ink-900 tabular-nums">{examStats.topPct != null ? `${Math.round(examStats.topPct)}%` : "—"}</p>
              </div>
            </div>
          )}
        </section>

        {/* ── Performance Analysis ────────────────────────────────────── */}
        {recent.length > 0 && (
          <section id="analysis" className="mt-10 scroll-mt-20">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.analysis.title")}</h2>
            <p className="mt-1 text-sm text-ink-600">{t("exam.analysis.body")}</p>

            {/* Score-over-time mini-chart (text + bars) */}
            <div className="mt-4 rounded-md border border-ink-200 bg-white p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-500">
                {t("exam.analysis.lastFive")}
              </p>
              <ul className="mt-3 space-y-2">
                {[...recent].reverse().map((a) => {
                  const pct = Math.max(0, a.scorePct ?? 0);
                  return (
                    <li key={a.id} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 text-xs text-ink-500">
                        {a.startedAt.toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </span>
                      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                        <div
                          className="h-full bg-saffron-500"
                          style={{ width: `${Math.max(2, Math.min(100, pct))}%` }}
                        />
                      </div>
                      <span className="w-14 shrink-0 text-right text-sm font-medium tabular-nums text-ink-800">
                        {formatDisplayScorePct(a.scorePct)}
                      </span>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs text-ink-500">
                {t("exam.analysis.trend")}:{" "}
                <span className="font-medium text-ink-700">{describeTrend(recent.map((a) => a.scorePct ?? 0))}</span>
              </p>
            </div>
          </section>
        )}

        {/* ── Rank ladder — full score→rank→outcome map for this exam.
            Public so signed-out visitors see what's achievable, which is
            a big motivator for landing-page conversions. */}
        {rankBands.length > 0 && (
          <section className="mt-10">
            <RankLadder
              examShortName={exam.shortName}
              bands={rankBands}
              source={rankBands[0]?.source ?? null}
            />
          </section>
        )}

        {/* News + Important Dates */}
        {(newsItems.length > 0 || importantDates.length > 0) && (
          <section className="mt-10">
            {/* "See older updates" link → archive page. Surfacing it
                here (above the news/dates panel) so students who
                want last year's postponement notice or prior cutoff
                trajectories find their way in one click. */}
            <div className="mb-3 flex items-center justify-between">
              <h2 className="sr-only">News & timeline</h2>
              <Link
                href={`/exams/${exam.code}/archive`}
                prefetch={false}
                className="ml-auto text-xs font-medium text-saffron-700 hover:text-saffron-800"
              >
                See older updates →
              </Link>
            </div>
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* News */}
            <div>
              <h2 className="text-base font-semibold text-ink-800">{t("timeline.news.title")}</h2>
              {newsItems.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
                  {t("timeline.news.empty")}
                </p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {newsItems.map((n) => {
                    // unstable_cache serialises Date objects to ISO
                    // strings on cache hits, so we always coerce.
                    const publishedAt = new Date(n.publishedAt as unknown as string | Date);
                    const ageDays = Math.floor((Date.now() - publishedAt.getTime()) / (24 * 60 * 60 * 1000));
                    return (
                      <li key={n.id} className="rounded-md border border-ink-200 bg-white p-4">
                        <div className="flex items-baseline justify-between gap-2">
                          {/* Linked headline → news permalink. Each
                              item gets its own indexable page so the
                              cron's output accumulates into a long-
                              tail SEO surface. See /exams/[code]/news/[id]. */}
                          <h3 className="text-sm font-semibold text-ink-900">
                            <Link
                              href={`/exams/${exam.code}/news/${n.id}`}
                              prefetch={false}
                              className="hover:text-saffron-700"
                            >
                              {n.title}
                            </Link>
                          </h3>
                          <span className="shrink-0 text-xs text-ink-500">
                            {ageDays === 0 ? t("timeline.dates.today")
                              : ageDays === 1 ? `1 ${t("disc.daysAgo")}`
                              : `${ageDays} ${t("disc.daysAgo")}`}
                          </span>
                        </div>
                        <p className="mt-1.5 text-sm text-ink-700">{n.body}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          <Link
                            href={`/exams/${exam.code}/news/${n.id}`}
                            prefetch={false}
                            className="font-medium text-saffron-700 hover:text-saffron-800"
                          >
                            Read full notice →
                          </Link>
                          {/* Only real URLs become links — internal provenance
                              tags (ai-generated:claude) were rendering as a
                              broken anchor + trust-killing label. */}
                          {n.source && n.source.startsWith("http") && (
                            <a
                              href={n.source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-medium text-ink-500 hover:text-ink-700"
                            >
                              Source ↗
                            </a>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Important Dates */}
            <div>
              <h2 className="text-base font-semibold text-ink-800">{t("timeline.dates.title")}</h2>
              {hubDates.length === 0 ? (
                <p className="mt-3 rounded-md border border-dashed border-ink-300 bg-white px-4 py-5 text-sm text-ink-500">
                  {t("timeline.dates.empty")}
                </p>
              ) : (
                <ol className="mt-3 space-y-2">
                  {/* The cache now carries up to 30 tracker rows (3 past +
                      27 from 10 days ago onward) so the exam day is never
                      missing; the hub column shows the first 12 and the
                      tracker pill above holds the full list. */}
                  {hubDates.slice(0, 12).map((d) => {
                    // Same Date deserialisation guard as newsItems above.
                    const dateObj = new Date(d.date as unknown as string | Date);
                    const est = hubDateView.get(d.id);
                    const days = Math.ceil((dateObj.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                    const passed = days < 0;
                    let when: string;
                    if (passed) when = t("timeline.dates.passed");
                    else if (days === 0) when = t("timeline.dates.today");
                    else if (days === 1) when = t("timeline.dates.tomorrow");
                    else when = `${days} ${t("timeline.dates.daysAway")}`;
                    return (
                      <li
                        key={d.id}
                        className={
                          d.isExamDay
                            ? `rounded-md border-2 p-4 ${theme.borderAccent} ${theme.examDayBg}`
                            : passed
                            ? "rounded-md border border-ink-200 bg-ink-50/40 p-4 opacity-60"
                            : "rounded-md border border-ink-200 bg-white p-4"
                        }
                      >
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-sm font-medium text-ink-900">
                            {d.isExamDay && <span className="mr-1">{theme.icon}</span>}
                            {d.label}
                          </p>
                          <span className={d.isExamDay ? `shrink-0 text-xs font-semibold ${theme.examDayText}` : "shrink-0 text-xs text-ink-500"}>
                            {when}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-ink-500">
                          {est && (est.view === "line" || est.view === "unsure")
                            ? passedEstimateLine(est.kind, locale, est.view)
                            : dateObj.toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" })}
                        </p>
                        {d.notes && <p className="mt-1.5 text-xs text-ink-600">{d.notes}</p>}
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
            </div>{/* /grid news+dates */}
          </section>
        )}

        {/* Weakness map */}
        {weakness.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-semibold text-ink-800">{t("exam.weakest")}</h2>
            <ul className="mt-3 space-y-2">
              {weakness.map((w) => (
                <li key={w.id}>
                  <Link
                    rel="nofollow" href={`/chat?examCode=${exam.code}&topicCode=${encodeURIComponent(w.topic.code)}&seed=${encodeURIComponent(`I'm weak in ${w.topic.name} for ${exam.shortName}. Tutor me on this topic.`)}`}
                    className="block rounded-md border border-ink-200 bg-white p-3 hover:border-saffron-400 hover:bg-saffron-50/30"
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-medium text-ink-900">{w.topic.name}</p>
                      <p className="text-xs text-ink-500">
                        {w.correctCount}/{w.attemptsCount}
                      </p>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-ink-100">
                      <div
                        className="h-full bg-saffron-500"
                        style={{ width: `${Math.round(w.masteryScore * 100)}%` }}
                      />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Syllabus */}
        <section id="syllabus" data-tour="exam-syllabus" className="mt-10 scroll-mt-20">
          <h2 className="text-base font-semibold text-ink-800">{t("exam.syllabus")}</h2>
          <p className="mt-1 text-xs text-ink-500">{t("exam.syllabus.clickHint")}</p>
          <div className="mt-4 space-y-6">
            {exam.subjects.map((s) => (
              <div key={s.id}>
                <h3 className="text-sm font-semibold text-ink-900">{s.name}</h3>
                <ul className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {s.topics.map((tp) => (
                    <li
                      key={tp.id}
                      id={`syllabus-topic-${tp.code}`}
                      className="scroll-mt-24 syllabus-target"
                    >
                      <Link
                        href={`/exams/${exam.code}/topics/${tp.code}`} prefetch={false}
                        className="group block rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-700 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
                      >
                        <p className="font-medium text-ink-800 group-hover:text-saffron-800">{tp.name}</p>
                        {tp.description && (
                          <p className="mt-0.5 text-xs text-ink-500 line-clamp-2">{tp.description}</p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        </div>{/* /lg:col-span-2 */}

        {/* ── Right rail: Shishya helper (sticky on lg+) ─────────────────
            Replaces the previous inline Score Boost + Focus Topics +
            Shishya Interaction sections which were tucked far down the
            page. The rail follows the student as they scroll mocks / news
            / syllabus, so the quick-prompt CTAs and topic uplift never
            require a long scroll. */}
        <aside className="mt-10 lg:col-span-1 lg:mt-0 lg:sticky lg:top-20 lg:self-start space-y-4">

          {scoreBoost && scoreBoost.focusTopics.length > 0 && (
            <div className="rounded-md border border-saffron-200 bg-gradient-to-b from-saffron-50 to-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-saffron-800">
                {t("dash.boost.eyebrow")}
              </p>
              <h3 className="mt-1 text-sm font-semibold text-ink-900">
                {t("dash.boost.title.before")} {exam.shortName} {t("dash.boost.title.after")}
              </h3>

              {scoreBoost.latestScorePct != null && (
                <div className="mt-3 rounded-md border border-ink-200 bg-white px-3 py-2 text-xs">
                  <p className="text-ink-500">{t("dash.boost.latest")}</p>
                  <p className="mt-0.5">
                    <span className="text-base font-bold text-ink-900 tabular-nums">
                      {formatDisplayScorePct(scoreBoost.latestScorePct)}
                    </span>
                    {scoreBoost.currentRank && (
                      <span className="ml-2 text-ink-500">
                        · {t("dash.boost.rank")} #{scoreBoost.currentRank}
                        {scoreBoost.totalCohort > 1 && (
                          <span className="text-ink-400"> / {scoreBoost.totalCohort}</span>
                        )}
                      </span>
                    )}
                  </p>
                </div>
              )}

              <p className="mt-3 text-xs font-medium uppercase tracking-wider text-ink-500">
                {t("dash.boost.focusOn")}
              </p>
              <ul className="mt-2 space-y-1.5">
                {scoreBoost.focusTopics.map((ft) => (
                  <li key={ft.topicId}>
                    <div className="rounded-md border border-ink-200 bg-white p-3">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-xs font-medium text-ink-900">{ft.topicName}</p>
                        <p className="shrink-0 text-[11px] text-ink-500">
                          {Math.round(ft.currentMastery * 100)}%
                        </p>
                      </div>
                      <p className="mt-0.5 text-[11px] text-emerald-700">
                        +{ft.estimatedExtraMarks.toFixed(1)} {t("dash.focus.marks")}{" "}
                        <span className="text-ink-500">{t("dash.focus.uplift.atTarget")}</span>
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <a
                          href={`#syllabus-topic-${encodeURIComponent(ft.topicCode)}`}
                          className="rounded border border-saffron-300 bg-saffron-100 px-2 py-1 text-[11px] font-medium text-saffron-900 hover:bg-saffron-200"
                        >
                          {t("exam.focus.gotoSyllabus")} ↓
                        </a>
                        <Link
                          href={`/exams/${exam.code}/topics/${encodeURIComponent(ft.topicCode)}`}
                          className="rounded border border-ink-200 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:border-saffron-400"
                        >
                          {t("dash.focus.cta.study")}
                        </Link>
                        <Link
                          rel="nofollow" href={`/chat?examCode=${exam.code}&topicCode=${encodeURIComponent(ft.topicCode)}&seed=${encodeURIComponent(`I'm weak in ${ft.topicName} for ${exam.shortName}. Tutor me on this topic.`)}`}
                          className="rounded border border-ink-200 bg-white px-2 py-1 text-[11px] font-medium text-ink-700 hover:border-saffron-400"
                        >
                          {t("dash.focus.cta.ask")}
                        </Link>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-3 rounded-md bg-saffron-100 px-3 py-2 text-xs text-ink-800">
                <p>
                  <strong>{t("dash.boost.combined")}:</strong>{" "}
                  +{scoreBoost.combinedExtraMarks.toFixed(1)} {t("dash.focus.marks")}{" "}
                  <span className="text-ink-500">(+{scoreBoost.combinedExtraPct.toFixed(1)}%)</span>
                </p>
                {scoreBoost.projectedRank &&
                  scoreBoost.currentRank &&
                  scoreBoost.projectedRank < scoreBoost.currentRank && (
                    <p className="mt-1 text-emerald-800">
                      {t("dash.boost.rankUplift")} #{scoreBoost.currentRank} →{" "}
                      <strong>#{scoreBoost.projectedRank}</strong>
                    </p>
                  )}
                {scoreBoost.projectedScorePct != null && (
                  <p className="mt-1 text-ink-600">
                    {t("dash.boost.projected")}{" "}
                    <strong className="text-ink-900">
                      {formatDisplayScorePct(scoreBoost.projectedScorePct)}
                    </strong>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Shishya quick prompts — primary engagement surface, so it
              sits above the scholarships list. */}
          {hasContent && (
            <div id="shishya" className="scroll-mt-20 rounded-md border border-ink-200 bg-white p-4 shadow-sm">
              <div className="flex items-baseline justify-between">
                <h3 className="text-sm font-semibold text-ink-900">{t("exam.shishya.title")}</h3>
                <Link
                  rel="nofollow" href={`/chat?examCode=${exam.code}`}
                  className="text-xs font-medium text-saffron-700 hover:text-saffron-800"
                >
                  {t("exam.shishya.openChat")} →
                </Link>
              </div>
              <p className="mt-1 text-xs text-ink-600">{t("exam.shishya.body")}</p>
              <ul className="mt-3 space-y-1.5">
                {([
                  ["exam.shishya.prompt.weakest", `Quiz me on my weakest ${exam.shortName} topic`],
                  ["exam.shishya.prompt.explain", `Explain the concept I got wrong most in my last ${exam.shortName} mock`],
                  ["exam.shishya.prompt.plan", `Make me a 30-minute study plan for ${exam.shortName} today`],
                  ["exam.shishya.prompt.syllabus", `Walk me through the ${exam.shortName} syllabus and which topics carry highest weight`],
                ] as const).map(([labelKey, q]) => (
                  <li key={labelKey}>
                    <Link
                      rel="nofollow" href={`/chat?examCode=${exam.code}&seed=${encodeURIComponent(q)}`}
                      className="block rounded-md border border-ink-200 bg-white p-2.5 text-xs text-ink-800 hover:border-saffron-400 hover:bg-saffron-50/40"
                    >
                      <span className="block font-medium">{t(labelKey)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(related.length > 0 || entranceIndex) && (
            <section aria-labelledby="exam-related-heading" className="rounded-lg border border-ink-200 bg-white p-4">
              <h2 id="exam-related-heading" className="text-sm font-semibold text-ink-900">
                Related on Shishya
              </h2>
              <ul className="mt-2 space-y-1.5 text-sm">
                {related.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-saffron-700 hover:underline">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
              {entranceIndex && (
                <p className="mt-2 text-sm">
                  <Link href="/exams/entrance" className="font-medium text-saffron-700 hover:underline">
                    Entrance exams in India — JEE, NEET, CUET, NDA, olympiads and state CETs →
                  </Link>
                </p>
              )}
            </section>
          )}

          {/* Scholarships for this exam — surfaced on every exam page so
              students who can't afford coaching see they qualify for funded
              schemes. Always rendered (no auth gate, no DB hit). */}
          <ScholarshipsForExamSection
            examCode={exam.code}
            examShortName={exam.shortName}
            examCategory={String(exam.category)}
            examState={null}
          />

          {/* Top NIRF colleges that admit via this exam — drives the
              "I'm preparing for X, where can I go?" intent into our
              colleges section. Pure server render, no DB hit. */}
          <CollegesForExamSection
            examCode={exam.code}
            examShortName={exam.shortName}
            examCategory={String(exam.category)}
          />

        </aside>

        </div>{/* /lg:grid */}

        {/* PulseAsk (1 Sep 2026): the exam hub is the commitment
            surface — one quiet line asking what's missing for THIS
            exam, keyed per exam. Anon visitors get chips only. */}
        <PulseAsk
          surface="exam"
          promptKey={`exam-${exam.code}`}
          prompt={`What's missing here for your ${exam.shortName} prep?`}
          chips={["More PYQs", "A full study path", "Cutoff clarity", "Nothing — it's enough"]}
          signedIn={!!userId}
          examCode={exam.code}
        />
      </section>

      {/* First-visit coach-mark tour for the per-exam page. tourId is
          shared across all per-exam pages (`exam-v1`) — once a user
          has been guided through one exam's layout they don't need it
          again on another exam (the layout is identical). Steps point
          at the three primary actions: Start Mock, Ask Shishya, and
          the syllabus block.

          Gated to SIGNED-IN users only. A full-page dimming coach-mark
          over a signed-out SEO landing page interrupts the visitor who
          came from search to READ content (cutoffs, syllabus, PYQ) —
          it hurts dwell time + bounce. Signed-in users have committed
          to the platform and benefit from the orientation. */}
      {userId && (
      <PageTour
        tourId="exam-v1"
        steps={[
          {
            key: "exam-welcome",
            icon: "👋",
            title: `You're on ${exam.shortName}`,
            body: "Three things matter here — start a mock, ask Shishya if you're stuck, or browse the syllabus. Let me show you each.",
          },
          {
            key: "exam-start",
            anchor: "exam-start-mock",
            placement: "bottom",
            icon: "🎯",
            title: "Start an adaptive mock",
            body: "Tap this to begin. The first attempt is a diagnostic — Shishya uses it to spot your weak topics. Every next mock targets those.",
          },
          {
            key: "exam-ask",
            anchor: "exam-ask",
            placement: "bottom",
            icon: "💬",
            title: "Stuck on a topic? Ask Shishya",
            body: "Free AI tutor that knows this exam's syllabus + your mock history. Answers in English, Hindi, or your language.",
          },
          {
            key: "exam-syllabus",
            anchor: "exam-syllabus",
            icon: "📚",
            title: "Browse the syllabus",
            body: "Every topic is clickable — see PYQs, practice questions, and your mastery score per topic.",
          },
          {
            key: "exam-done",
            icon: "✓",
            title: "Take your first mock now",
            body: "Scroll back up and tap Start. 30 minutes, free, with full solutions after. Your weak topics get mapped automatically.",
          },
        ]}
      />
      )}
    </main>
  );
}

function describeTrend(scores: number[]): string {
  if (scores.length < 2) return "—";
  const first = scores[scores.length - 1];
  const last = scores[0];
  const delta = last - first;
  if (Math.abs(delta) < 1.5) return "stable";
  return delta > 0 ? `up ${delta.toFixed(1)}%` : `down ${Math.abs(delta).toFixed(1)}%`;
}

/**
 * Format the per-Q negative-mark value for display in the meta chip
 * row. Several exams store fractions as raw floats (e.g. UPSC = 1/3
 * → 0.6666666666666666) that read as garbage in the UI. We detect
 * the most common fraction forms and render them as "1/3", "1/4",
 * "2/3" etc; everything else rounds to 2 decimals.
 */
function formatNegativeMark(n: number): string {
  // Common UPSC/MPSC pattern: 1/3 per question wrong.
  if (Math.abs(n - 1 / 3) < 1e-6) return "1/3";
  if (Math.abs(n - 2 / 3) < 1e-6) return "2/3";
  // SSC + IBPS pattern: 0.25 / 0.50 / 0.75 — render as fractions for
  // readability, not as 0.25 marks.
  if (Math.abs(n - 0.25) < 1e-6) return "1/4";
  if (Math.abs(n - 0.5) < 1e-6) return "1/2";
  if (Math.abs(n - 0.75) < 1e-6) return "3/4";
  // Whole numbers (NEET = 1, JEE Adv = 1 or 2) render bare.
  if (Number.isInteger(n)) return String(n);
  // Everything else: 2-decimal display.
  return n.toFixed(2);
}
