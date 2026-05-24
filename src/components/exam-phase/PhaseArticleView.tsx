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
//   3. Markdown body (AI-generated + verified — sanitized via the
//      same markdown pipeline the rest of the site uses)
//   4. Sources we read (footer transparency)
//   5. ReactionButtons (👍 / 👎)
//   6. ShareButtons (X / WhatsApp / Telegram / LinkedIn / FB / copy)
//   7. Link to / start a Discussion thread scoped to this article
//
// Stage-1 content is hand-seeded; Stage 2 (next sprint) plugs the
// 2-hour Claude scraping pipeline in to keep it fresh.

import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { ReactionButtons } from "./ReactionButtons";
import { ShareButtons } from "./ShareButtons";
import { renderMarkdown } from "@/lib/markdown";
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

const PHASE_COPY: Record<
  ExamPhase,
  {
    badge: string;
    badgeColor: string;
    tagline: (examShort: string) => string;
    emptyBody: (examShort: string) => string;
  }
> = {
  CHECKLIST: {
    badge: "📋 Last-minute checklist",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    tagline: (s) =>
      `One week to go for ${s}. Here's the cheat-sheet to revise — what to carry, last-mile topics, formulae, mock targets.`,
    emptyBody: (s) =>
      `We're putting together the last-minute checklist for ${s}. Check back closer to the exam date — students who've cleared the same paper will have written the revision sheet by then.`,
  },
  LIVE: {
    badge: "🔴 Live — exam day",
    badgeColor: "bg-rose-100 text-rose-900 border-rose-300",
    tagline: (s) =>
      `${s} is happening today. Live difficulty, shift-by-shift analysis and the first answer-key trackers as they release — refreshed every two hours from Reddit, X, Telegram, YouTube comments.`,
    emptyBody: (s) =>
      `Live coverage for ${s} starts shortly. As students step out of the centre, we'll surface their first reactions, difficulty signals and any leaked answer keys here — refreshed every two hours.`,
  },
  REACTIONS: {
    badge: "📊 Post-exam reactions",
    badgeColor: "bg-sky-100 text-sky-900 border-sky-300",
    tagline: (s) =>
      `${s} is done — here's the verdict. Student consensus on difficulty, expected cutoff, answer-key analysis and "did you get Q-34?" threads.`,
    emptyBody: (s) =>
      `Post-exam analysis for ${s} is being compiled. Within hours of the last shift ending we'll publish the student verdict — expected cutoff, difficulty breakdown, answer-key analysis.`,
  },
};

const PHASE_SLUG: Record<ExamPhase, "checklist" | "live" | "reactions"> = {
  CHECKLIST: "checklist",
  LIVE: "live",
  REACTIONS: "reactions",
};

export async function PhaseArticleView({
  code,
  phase,
}: {
  code: string;
  phase: ExamPhase;
}) {
  const exam = await prisma.exam.findUnique({
    where: { code },
    select: { id: true, code: true, name: true, shortName: true },
  });
  if (!exam) notFound();

  const article = await prisma.examPhaseArticle.findUnique({
    where: { examId_phase: { examId: exam.id, phase } },
    include: {
      _count: { select: { reactions: true } },
    },
  });

  const session = await auth().catch(() => null);
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

  const copy = PHASE_COPY[phase];
  const sources = (article?.sourcesScraped as unknown as PhaseSource[]) ?? [];

  return (
    <article className="container-prose py-10">
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
        <span className="font-medium text-ink-700">{copy.badge.replace(/^[^ ]+\s/, "")}</span>
      </nav>

      {/* Phase badge + freshness */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider ${copy.badgeColor}`}
        >
          {copy.badge}
        </span>
        {article && (
          <span className="inline-flex items-center gap-1 text-xs text-ink-500">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
            Updated {formatRelativeTime(article.lastUpdatedAt)}
          </span>
        )}
      </div>

      {/* Title + tagline */}
      <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
        {article?.title ?? `${exam.shortName} — ${copy.badge.replace(/^[^ ]+\s/, "")}`}
      </h1>
      <p className="mt-3 text-base text-ink-600">{copy.tagline(exam.shortName)}</p>

      {/* Body — either rendered markdown or the empty-state placeholder */}
      <div className="prose prose-ink mt-8 max-w-none">
        {article ? (
          <div
            dangerouslySetInnerHTML={{ __html: renderMarkdown(article.bodyMarkdown) }}
          />
        ) : (
          <p className="text-ink-600">{copy.emptyBody(exam.shortName)}</p>
        )}
      </div>

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

      {/* Discussion CTA — links to existing thread system scoped to
          this exam. Stage-2 will create per-article threads. */}
      <section className="mt-10 rounded-xl border border-ink-200 bg-saffron-50/40 p-5">
        <h3 className="text-base font-semibold text-ink-900">
          Talk to other {exam.shortName} candidates
        </h3>
        <p className="mt-1 text-sm text-ink-600">
          Comments, what-did-you-get threads, doubts, score predictions — every
          post is from someone preparing or who&apos;s cleared the same paper.
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
