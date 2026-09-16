// Shared server-side view used by all three phase routes:
//   /exams/[code]/checklist  (CHECKLIST  — T-7 to T-1)
//   /exams/[code]/live       (LIVE       — T-0)
//   /exams/[code]/reactions  (REACTIONS  — T+1 to T+3)
//
// Renders:
//   1. Exam crumb + phase title
//   2. "Updated X min ago" badge (this is the trust signal — students
//      land here from Google search for "UPSC Prelims difficulty 2026"
//      and need to know the content is fresh)
//   3. Markdown body (AI-generated from cited public sources — sanitized
//      via the same markdown pipeline the rest of the site uses)
//   4. Sources we read (footer transparency)
//   5. ReactionButtons (👍 / 👎)
//   6. ShareButtons (X / WhatsApp / Telegram / LinkedIn / FB / copy)
//   7. Link to / start a Discussion thread scoped to this article
//
// Content comes from the phase-article cron (src/lib/refresh-phase-
// articles.ts): compiled from public student discussion, published only
// when at least two real sources exist (src/lib/phase-article-quality.ts).
//
// Honesty (6 Sep 2026 review, Exam Week Mode wave 2):
//   • an ACTIVE row that fails the quality gate (fewer than two cited
//     sources, or a placeholder body) renders as absent — the empty-state
//     copy — exactly as the AEO surfaces and IndexNow already treat it;
//     the same gate filters the "Previous updates" list
//   • the badge / tagline / fallback title come from
//     src/lib/phase-article-copy.ts, which reads the shared exam-week state
//     machine: "is happening today" / "is done" only on an announced
//     (official / reported) exam day that the tracker puts today / behind
//     us; otherwise the dated "{date} ({tier}) paper", or a neutral line
//     when no typed exam day exists. The page routes build their <title>
//     from the same helper, so metadata and body never disagree.
//
// Exam night (13 Sep 2026): /live and /reactions pass
//   • `lead`        — the first-party ExamNightFacts block, rendered right
//                     under the tagline, BEFORE any article
//   • `articleGate` — "strict": the active row and the archived versions
//                     must pass passesStrictArticleGate (an archived LIVE
//                     body saying "we don't have reliable data yet" passed
//                     the base gate, audit 11 Sep)
//   • `hideEmpty`   — no empty-state paragraph: the lead block is the page
//   • `summary`     — what the lead renders, so the tagline names only
//                     that (its `article` flag is overridden here by the
//                     row this render actually shows)
// With a lead, the H1 is the page title and the article keeps its own
// title as an H2 below the facts. /checklist passes none of these and
// renders exactly as before.

import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { ReactionButtons } from "./ReactionButtons";
import { ShareButtons } from "./ShareButtons";
import { renderMarkdown } from "@/lib/markdown";
import { isRealArticle } from "@/lib/phase-article-quality";
import { passesStrictArticleGate } from "@/lib/phase-article-strict-gate";
import { getExamWeekInputs } from "@/lib/exam-week-inputs";
import { stageAwareClaim } from "@/lib/exam-night-facts";
import { examDayClaim, phaseArticleCopy, type ExamNightSummary } from "@/lib/phase-article-copy";
import type { ExamPhase, ArticleReaction } from "@prisma/client";

export interface PhaseSource {
  url: string;
  type: "reddit" | "rss" | "telegram" | "youtube" | "news" | "manual";
  scrapedAt?: string;
  /** 1-5; higher = more weight in the AI summary. */
  weight?: number;
  /** Optional human-readable label shown in the "Sources we read" list. */
  label?: string;
}

const PHASE_SLUG: Record<ExamPhase, "checklist" | "live" | "reactions"> = {
  CHECKLIST: "checklist",
  LIVE: "live",
  REACTIONS: "reactions",
};

export async function PhaseArticleView({
  code,
  phase,
  lead,
  summary,
  articleGate = "base",
  hideEmpty = false,
}: {
  code: string;
  phase: ExamPhase;
  /** First-party block rendered under the tagline, before the article. */
  lead?: ReactNode;
  /** What `lead` renders — drives the summary-aware tagline. */
  summary?: ExamNightSummary;
  /** "strict" = passesStrictArticleGate (LIVE / REACTIONS); "base" = isRealArticle. */
  articleGate?: "base" | "strict";
  /** Render nothing (instead of the empty-state copy) when no article passes. */
  hideEmpty?: boolean;
}) {
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, name: true, shortName: true },
  });
  if (!exam) notFound();

  const [activeRow, archivedRows, inputs, session] = await Promise.all([
    // Active (current) version — archivedAt IS NULL. findFirst because
    // the (examId, phase) unique was replaced by version history; there
    // can be many archived rows + one active row.
    prisma.examPhaseArticle.findFirst({
      where: { examId: exam.id, phase, archivedAt: null },
      orderBy: { lastUpdatedAt: "desc" },
      include: {
        _count: { select: { reactions: true } },
      },
    }),
    // Previous (archived) versions — earlier cycles' write-ups, newest
    // first. Shown collapsed under the live article so a student can read
    // what last cycle's checklist / live / reactions said. Over-fetched a
    // little because hollow placeholders are dropped below.
    prisma.examPhaseArticle.findMany({
      where: { examId: exam.id, phase, archivedAt: { not: null } },
      orderBy: { archivedAt: "desc" },
      take: 24,
      select: {
        id: true,
        title: true,
        bodyMarkdown: true,
        summarySnippet: true,
        sourcesScraped: true,
        lastUpdatedAt: true,
        archivedAt: true,
      },
    }),
    // Tracker rows + official portal (15-min cache) for the honest copy.
    getExamWeekInputs(exam.id),
    auth().catch(() => null),
  ]);

  // Quality gate: a row that is not REAL is treated as absent. On the
  // exam-night routes the stricter body gate applies to every version.
  const passes = (a: { bodyMarkdown: string; sourcesScraped: unknown }) =>
    articleGate === "strict" ? passesStrictArticleGate(a, exam) : isRealArticle(a);
  const article = activeRow && passes(activeRow) ? activeRow : null;
  const archivedVersions = archivedRows.filter((v) => passes(v)).slice(0, 12);
  // Stage-aware like the <title> (16 Sep 2026): on another stage's day the
  // claim names that stage and drops "today" / "held" for a staged short name.
  const claim = stageAwareClaim(exam, examDayClaim(inputs.rows, inputs.officialUrl));
  const copy = phaseArticleCopy(phase, exam.shortName, claim, summary ? { ...summary, article: !!article } : undefined);

  const userId = session?.user?.id ?? null;

  // Reaction counts — broken down by like vs dislike. Done as two
  // count() queries so we don't have to enumerate rows.
  const [likes, dislikes] = article
    ? await Promise.all([
        prisma.examArticleReaction.count({
          where: { articleId: article.id, reaction: "LIKE" satisfies ArticleReaction },
        }),
        prisma.examArticleReaction.count({
          where: { articleId: article.id, reaction: "DISLIKE" satisfies ArticleReaction },
        }),
      ])
    : [0, 0];

  // User's existing reaction (for highlighting their button as
  // already-pressed on render).
  const myReaction =
    article && userId
      ? await prisma.examArticleReaction.findFirst({
          where: { articleId: article.id, userId },
          select: { reaction: true },
        })
      : null;

  const sources = (article?.sourcesScraped as unknown as PhaseSource[]) ?? [];

  // JSON-LD — Article + BreadcrumbList. Mirrors the NewsArticle markup on
  // the per-news permalink pages so Google treats these phase write-ups as
  // first-class editorial content (rich-result + Discover eligibility).
  // Only emitted when a REAL article exists — empty-state pages have no
  // content to mark up. Highest leverage during the T-7 → T+3 window when
  // these pages spike in search ("<exam> checklist", "<exam> cutoff").
  const phaseUrl = `https://shishya.in/exams/${exam.code}/${PHASE_SLUG[phase]}`;
  const phaseLabel = copy.label;
  const articleJsonLd = article
    ? {
        "@context": "https://schema.org",
        "@type": "Article",
        headline: article.title,
        description: article.summarySnippet || undefined,
        datePublished: article.createdAt.toISOString(),
        dateModified: article.lastUpdatedAt.toISOString(),
        inLanguage: "en-IN",
        isAccessibleForFree: true,
        author: { "@type": "EducationalOrganization", name: "Shishya", url: "https://shishya.in" },
        publisher: {
          "@type": "EducationalOrganization",
          name: "Shishya",
          url: "https://shishya.in",
          logo: { "@type": "ImageObject", url: "https://shishya.in/icon.svg" },
        },
        about: {
          "@type": "Course",
          name: exam.name,
          url: `https://shishya.in/exams/${exam.code}`,
        },
        mainEntityOfPage: phaseUrl,
      }
    : null;
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://shishya.in" },
      { "@type": "ListItem", position: 2, name: "Exams", item: "https://shishya.in/exams" },
      { "@type": "ListItem", position: 3, name: exam.shortName, item: `https://shishya.in/exams/${exam.code}` },
      { "@type": "ListItem", position: 4, name: phaseLabel, item: phaseUrl },
    ],
  };

  const articleBody = article ? (
    <div className="prose prose-ink mt-4 max-w-none">
      <div dangerouslySetInnerHTML={{ __html: renderMarkdown(article.bodyMarkdown) }} />
    </div>
  ) : null;

  return (
    <article className="container-prose py-10">
      {/* JSON-LD for Google rich-result eligibility */}
      {articleJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-1.5 text-xs text-ink-500" aria-label="Breadcrumb">
        <Link href="/" className="font-medium text-saffron-700 hover:underline">
          All exams
        </Link>
        <span aria-hidden>›</span>
        <Link href={`/exams/${exam.code}`} className="font-medium text-saffron-700 hover:underline">
          {exam.shortName}
        </Link>
        <span aria-hidden>›</span>
        <span className="font-medium text-ink-700">{phaseLabel}</span>
      </nav>

      {/* Phase badge + freshness */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${copy.badgeColor}`}
        >
          {copy.badge}
        </span>
        {article && !lead && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Updated {formatRelativeTime(article.lastUpdatedAt)}
          </span>
        )}
      </div>

      {/* Title + tagline */}
      <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
        {lead ? copy.fallbackTitle : (article?.title ?? copy.fallbackTitle)}
      </h1>
      <p className="mt-3 text-base text-ink-600">{copy.tagline}</p>

      {/* First-party facts lead the exam-night pages. */}
      {lead}

      {/* Body — the article (below the lead when there is one), or the
          empty-state placeholder unless the route hides it. */}
      {lead ? (
        article && (
          <section className="mt-10">
            <h2 className="text-2xl font-bold tracking-tight text-ink-900">{article.title}</h2>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-500">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              Compiled from public student discussion · updated {formatRelativeTime(article.lastUpdatedAt)}
            </p>
            {articleBody}
          </section>
        )
      ) : article ? (
        <div className="mt-4">{articleBody}</div>
      ) : hideEmpty ? null : (
        <div className="prose prose-ink mt-8 max-w-none">
          <p className="text-ink-600">{copy.emptyBody}</p>
        </div>
      )}

      {/* Reactions + share — only shown once the article exists.
          Empty-state articles get nothing to react to. */}
      {article && (
        <section className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-200 bg-white p-4 shadow-sm">
          <ReactionButtons
            articleId={article.id}
            likes={likes}
            dislikes={dislikes}
            myReaction={myReaction?.reaction ?? null}
          />
          <ShareButtons
            articleId={article.id}
            url={`https://shishya.in/exams/${exam.code}/${PHASE_SLUG[phase]}`}
            title={article.title}
          />
        </section>
      )}

      {/* Sources transparency */}
      {article && sources.length > 0 && (
        <section className="mt-8 rounded-lg border border-ink-100 bg-ink-50/40 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Sources we read
          </p>
          <ul className="mt-2 space-y-1 text-xs text-ink-700">
            {sources.map((src) => (
              <li key={src.url}>
                <a
                  href={src.url}
                  className="text-saffron-700 hover:underline"
                  target="_blank"
                  rel="noopener nofollow noreferrer"
                >
                  {src.label ?? src.url}
                </a>{" "}
                <span className="text-[10px] uppercase text-ink-400">· {src.type}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Previous updates — archived earlier versions of this phase
          article. Each is a native <details> so it's collapsible with
          zero client JS (server-rendered). Preserves the institutional
          memory of every cron cycle: a student can read what last
          cycle's checklist / live coverage / reactions said. */}
      {archivedVersions.length > 0 && (
        <section className="mt-10">
          <h2 className="text-base font-semibold text-ink-800">
            Previous updates ({archivedVersions.length})
          </h2>
          <p className="mt-1 text-xs text-ink-500">
            Earlier versions of this {phaseLabel.toLowerCase()},
            archived as the page refreshed. Tap to expand.
          </p>
          <div className="mt-3 space-y-2">
            {archivedVersions.map((v) => (
              <details
                key={v.id}
                className="group rounded-lg border border-ink-200 bg-white"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-sm hover:bg-ink-50/60">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink-800">
                      {v.title}
                    </span>
                    {v.summarySnippet && (
                      <span className="mt-0.5 block truncate text-xs text-ink-500">
                        {v.summarySnippet}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-[11px] text-ink-400">
                    {v.archivedAt
                      ? new Date(v.archivedAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : ""}
                  </span>
                </summary>
                <div className="border-t border-ink-100 px-4 py-4">
                  <div
                    className="prose prose-ink prose-sm max-w-none opacity-90"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(v.bodyMarkdown) }}
                  />
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* Discussion CTA — links to existing thread system scoped to
          this exam. Stage-2 will create per-article threads. */}
      <section className="mt-10 rounded-xl border border-ink-200 bg-saffron-50/40 p-5">
        <h3 className="text-base font-semibold text-ink-900">
          Talk to other {exam.shortName} candidates
        </h3>
        <p className="mt-1 text-sm text-ink-600">
          Comments, what-did-you-get threads, doubts, score estimates — scoped
          to this exam. Shishya&apos;s own starter questions and AI replies are labelled.
        </p>
        <Link
          href={`/discussions?examCode=${exam.code}`}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-saffron-700 hover:underline"
        >
          Open {exam.shortName} discussions
          <span aria-hidden>→</span>
        </Link>
      </section>
    </article>
  );
}

// Lightweight "5 min ago / 2 h ago / 3 d ago" formatter — duplicated
// here to keep this component server-rendered without pulling in the
// (client) relative-time formatter from lib/relative-time.
function formatRelativeTime(date: Date): string {
  const ms = Date.now() - date.getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const d = Math.round(hr / 24);
  return `${d} d ago`;
}
