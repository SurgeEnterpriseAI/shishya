// The tutor's memory of a member's earlier chats (30 Sep 2026, "the tutor
// remembers") — the pure half of src/lib/db/student-journey.ts.
//
// Why it changed (audit of 31 Aug – 29 Sep 2026): the "Recent journey" block
// kept the first 140 characters of the opening message of the 5 most recent
// chats in 14 days. 64% of chats open with the same results-page seed ("I
// just took a … mock and got N questions wrong …") and a tutor-day has 2.09
// chats, so those 5 lines covered about two days and were mostly the same
// template. Nothing said whether a question was ever answered: 213 of 1,266
// chats (16.8%) end on the student's message with no stored reply. Now:
//   • the student's own TYPED questions only (Shishya's prefilled prompts and
//     quick replies are ours — src/lib/tutor-templates.ts), up to 8 threads
//     from 30 days, each marked answered or not by its last stored row;
//   • mistake-review openers folded into ONE line (how many, which exams,
//     the latest weakest topics named, whether the latest got a reply);
//   • the last 3 weak topics the student chose to ask about (the weak-topic
//     buttons on home, dashboard, hub and results);
//   • general chats get the journey too (questions only — no scores, no
//     topic codes, no suggested actions: general mode has no exam scope).
// Every text is cut to 140 characters and the block is capped
// (JOURNEY_MAX_CHARS). It rides in the per-turn context, never in the cached
// system prompt, so the prompt cache is unchanged. The school tutor gets none.
//
// 30 Sep 2026 (review fix — the offer): the "answer the waiting question
// first" instruction first fired for ANY unanswered thread or review in the
// 30 days, in every new chat until that same chat was continued. With 16.8%
// of chats unanswered (mostly credit outages) that meant an old-question
// offer opening a month of first replies, results-page reviews included —
// and an unanswered REVIEW made the tutor offer to go through mock mistakes
// it cannot read from a general chat or another exam's chat (no tools there),
// inviting a made-up review. Now the offer is one named question
// (TutorJourney.offer): only from the NEWEST remembered conversation, only
// when it ended on a question the student typed with no reply, only within
// OFFER_WINDOW_MS, and never from a mistake review. NO REPLY YET markers stay
// as plain information. POST /api/chat also drops the offer when the new
// message is one of Shishya's own prompts (a seed, starter or quick reply).
//
// Pure — tests: tests/unit/tutor-memory.test.ts

import { isOurTutorPrompt } from "@/lib/tutor-templates";
import { cutText } from "@/lib/recent-chats";

/** Look-back for chat memory (was 14). */
export const MEMORY_WINDOW_DAYS = 30;
/** Threads with typed questions kept (was 5 threads of any kind). */
export const MAX_THREADS = 8;
/** Characters kept of any remembered text. */
export const MEMORY_TEXT_CHARS = 140;
/** Weak topics the student chose to ask about. */
export const MAX_ASKED_WEAK = 3;
/** Topic codes listed as most asked (exam mode). */
export const MAX_TOPICS = 8;
/** Open suggested actions (exam mode). */
export const MAX_ACTIONS = 4;
/** Hard cap on the rendered journey block; threads are dropped from the end to fit. */
export const JOURNEY_MAX_CHARS = 3200;
/** How long an unanswered typed question is offered again in a new chat. */
export const OFFER_WINDOW_MS = 72 * 3600_000;

/** The tutor's cross-session memory, as the prompt renders it. */
export interface TutorJourney {
  /** The exam this turn is scoped to, or null for a general chat. */
  examCode: string | null;
  /** Conversations in which the student typed a question of their own, most recent first. */
  threads: Array<{
    sessionId: string;
    /** Last activity in the conversation (ISO). */
    startedAt: string;
    examShort: string;
    /** The first question the student typed there. */
    openingMessage: string;
    topicCodes: string[];
    /** The conversation's last stored row is a tutor reply. */
    answered?: boolean;
    /** The student's last typed message, when it has no reply and is not the opening one. */
    waiting?: string | null;
  }>;
  /** Mistake reviews from the results page, folded into one line. */
  reviews?: {
    count: number;
    examShorts: string[];
    /** The "weakest: …" of the latest review, cut. */
    latestWeakest: string | null;
    latestAt: string;
    latestAnswered: boolean;
  } | null;
  /** Weak topics the student chose to ask the tutor about, most recent first. */
  askedWeakTopics?: Array<{ name: string; examShort: string }>;
  /**
   * The one question the tutor may offer to answer first: the student's last
   * typed question in their NEWEST remembered conversation, when it got no
   * reply, within OFFER_WINDOW_MS, and not in a mistake review. Null/absent =
   * no offer (the NO REPLY YET markers are then information only).
   */
  offer?: { text: string } | null;
  topAskedTopics: Array<{ topicCode: string; count: number }>;
  todayBrief: { reflection: string; mockTitle: string | null } | null;
  lastMock: { date: string; scorePct: number; mockTitle: string; examShort: string } | null;
  openActions: Array<{ kind: string; topicCode?: string; reason: string }>;
}

/** One stored conversation, as the memory loader reads it. */
export interface MemorySession {
  id: string;
  /** Last stored row's time. */
  lastAt: Date;
  /** "" for a general chat. */
  examShort: string;
  /** The student's rows, oldest first. */
  userRows: Array<{ content: string }>;
  /** The last stored row's role. */
  lastRole: string | null;
  /** Metadata of the tutor's rows (tool calls, suggested actions), oldest first. */
  assistantMeta: unknown[];
}

// The results page's seed, with its optional "— weakest: …" part.
const REVIEW_RE = /^I just took a (.{1,80}) mock and got (\d+) questions? wrong(?: — weakest: (.{1,400}?))?\. Go through my mistakes/u;

// The weak-topic buttons' seeds → [topic, exam]. Home (HomeForYou), dashboard
// and hub ("I'm weak in …"), /chat's first starter ("Tutor me on …") and the
// results page's per-topic link ("On my last … mock I got a/b on …").
const WEAK_SEEDS: ReadonlyArray<{ re: RegExp; topic: number; exam: number }> = [
  { re: /^I'm weak in (.{1,160}) for (.{1,80})\. Tutor me on this topic/u, topic: 1, exam: 2 },
  { re: /^(.{1,160}) is one of my weakest topics for (.{1,80})\. Explain the key ideas/u, topic: 1, exam: 2 },
  { re: /^Tutor me on (.{1,160}) — that's my weakest area in (.{1,80}?)\.?$/u, topic: 1, exam: 2 },
  { re: /^On my last (.{1,80}) mock I got \d+\/\d+ on (.{1,160})\. Help me improve on this topic/u, topic: 2, exam: 1 },
];

/** The weak topic a weak-topic button's seed names, or null. */
export function weakTopicOfSeed(text: string | null | undefined): { name: string; examShort: string } | null {
  const t = (text ?? "").trim();
  for (const s of WEAK_SEEDS) {
    const m = s.re.exec(t);
    if (m) return { name: m[s.topic].trim(), examShort: m[s.exam].trim() };
  }
  return null;
}

/** A mistake-review seed's parts, or null. */
export function reviewOfSeed(text: string | null | undefined): { examShort: string; wrong: number; weakest: string | null } | null {
  const m = REVIEW_RE.exec((text ?? "").trim());
  if (!m) return null;
  return { examShort: m[1].trim(), wrong: Number(m[2]), weakest: m[3] ? m[3].trim() : null };
}

/** A question the student typed themselves (not one of Shishya's prompts or quick replies). */
export function isTypedQuestion(text: string | null | undefined): boolean {
  const t = (text ?? "").trim();
  return t.length > 0 && !isOurTutorPrompt(t);
}

/**
 * The offer (see the header): the newest conversation's last typed question,
 * when that conversation ended on it with no reply, within OFFER_WINDOW_MS of
 * `now`, and is not a mistake review (its follow-ups are about mock questions
 * a new chat cannot read). `newest` = the most recently active remembered
 * conversation, or undefined.
 */
export function offerOf(newest: MemorySession | undefined, now: Date): { text: string } | null {
  if (!newest || newest.lastRole === "ASSISTANT") return null;
  if (now.getTime() - newest.lastAt.getTime() > OFFER_WINDOW_MS) return null;
  if (reviewOfSeed(newest.userRows[0]?.content)) return null;
  const last = newest.userRows[newest.userRows.length - 1]?.content ?? "";
  if (!isTypedQuestion(last)) return null;
  return { text: cutText(last, MEMORY_TEXT_CHARS) };
}

/**
 * Stored conversations → the memory fields. `sessions` in any order; the
 * result is most recent first. `exam` false (a general chat) leaves out
 * topic codes and suggested actions. `now` (default: the clock) bounds the offer.
 */
export function summariseChatMemory(
  sessions: readonly MemorySession[],
  opts: { exam: boolean; now?: Date },
): Pick<TutorJourney, "threads" | "reviews" | "askedWeakTopics" | "offer" | "topAskedTopics" | "openActions"> {
  const ordered = [...sessions].sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime());
  const threads: TutorJourney["threads"] = [];
  const weak: Array<{ name: string; examShort: string }> = [];
  const weakSeen = new Set<string>();
  const topicCounts = new Map<string, number>();
  const actions = new Map<string, { kind: string; topicCode?: string; reason: string }>();
  let reviewCount = 0;
  const reviewExams: string[] = [];
  let latestReview: { at: Date; weakest: string | null; answered: boolean } | null = null;

  for (const s of ordered) {
    const opener = s.userRows[0]?.content ?? "";
    const review = reviewOfSeed(opener);
    if (review) {
      reviewCount += 1;
      if (!reviewExams.includes(review.examShort)) reviewExams.push(review.examShort);
      if (!latestReview) latestReview = { at: s.lastAt, weakest: review.weakest, answered: s.lastRole === "ASSISTANT" };
    }
    for (const row of s.userRows) {
      const w = weakTopicOfSeed(row.content);
      if (!w) continue;
      const key = w.name.toLowerCase();
      if (weakSeen.has(key)) continue;
      weakSeen.add(key);
      weak.push(w);
    }

    const topicCodes = new Set<string>();
    if (opts.exam) {
      for (const md of s.assistantMeta) {
        const m = md as { toolCalls?: Array<{ args?: { topic_code?: unknown } }>; actions?: Array<{ kind?: string; topicCode?: string; reason?: string }> } | null;
        for (const c of m?.toolCalls ?? []) {
          const code = c?.args?.topic_code;
          if (typeof code === "string") {
            topicCodes.add(code);
            topicCounts.set(code, (topicCounts.get(code) ?? 0) + 1);
          }
        }
        for (const a of m?.actions ?? []) {
          if (!a?.kind || !a?.reason) continue;
          const key = `${a.kind}|${a.topicCode ?? ""}|${a.reason}`;
          if (!actions.has(key)) actions.set(key, { kind: a.kind, topicCode: a.topicCode, reason: a.reason });
        }
      }
    }

    if (threads.length >= MAX_THREADS) continue;
    const typed = s.userRows.filter((r) => isTypedQuestion(r.content));
    if (typed.length === 0) continue;
    const first = typed[0].content;
    const lastUser = s.userRows[s.userRows.length - 1]?.content ?? "";
    const answered = s.lastRole === "ASSISTANT";
    const waiting =
      !answered && lastUser !== first && isTypedQuestion(lastUser) ? cutText(lastUser, MEMORY_TEXT_CHARS) : null;
    threads.push({
      sessionId: s.id,
      startedAt: s.lastAt.toISOString(),
      examShort: s.examShort,
      openingMessage: cutText(first, MEMORY_TEXT_CHARS),
      topicCodes: [...topicCodes].slice(0, 4),
      answered,
      waiting,
    });
  }

  return {
    threads,
    reviews: latestReview
      ? {
          count: reviewCount,
          examShorts: reviewExams.slice(0, 3),
          latestWeakest: latestReview.weakest ? cutText(latestReview.weakest, MEMORY_TEXT_CHARS) : null,
          latestAt: latestReview.at.toISOString(),
          latestAnswered: latestReview.answered,
        }
      : null,
    askedWeakTopics: weak.slice(0, MAX_ASKED_WEAK).map((w) => ({ name: cutText(w.name, 80), examShort: cutText(w.examShort, 40) })),
    offer: offerOf(ordered[0], opts.now ?? new Date()),
    topAskedTopics: [...topicCounts.entries()]
      .map(([topicCode, count]) => ({ topicCode, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, MAX_TOPICS),
    openActions: [...actions.values()].slice(0, MAX_ACTIONS),
  };
}
