// DB reads behind saved tutor chats (30 Sep 2026) — rules and why in
// src/lib/recent-chats.ts. Every read is the member's OWN rows (by userId);
// nothing here writes.

import { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { REAL_EXAM_WHERE, isSchoolCategory } from "./exam-scope";
import {
  RECENT_CHATS_DAYS,
  RESUME_TURNS,
  reviewTagOf,
  type RecentChatRow,
  type StoredChatRow,
} from "@/lib/recent-chats";

/**
 * Which conversations a list shows:
 *   • { examId } — one scope: an exam's chat, or a school class's chat;
 *   • "general" — the general chat's list: general chats AND every real-exam
 *     chat (99% of chats are exam-scoped, and plain /chat opens the general
 *     chat for a member with several exams), each linking to its own scope;
 *   • "not-school" — the dashboard: the same set.
 * School sessions are only ever listed inside their own school chat.
 * 30 Sep 2026 (review fix): the general and dashboard lists leave out chats
 * on an exam that is no longer active — /chat cannot open that exam's scope,
 * so "Continue" landed on a blank chat. { examId } lists are left as they
 * are: an exam chat's page only renders for an active exam, and school
 * containers are inactive by design (exam-scope.ts).
 */
export type RecentChatsScope = { examId: string } | "general" | "not-school";

export async function listRecentChats(
  userId: string,
  scope: RecentChatsScope,
  opts: { limit: number; days?: number; now?: Date },
): Promise<RecentChatRow[]> {
  const now = opts.now ?? new Date();
  const since = new Date(now.getTime() - (opts.days ?? RECENT_CHATS_DAYS) * 86_400_000);
  const sessions = await prisma.chatSession.findMany({
    where: {
      userId,
      updatedAt: { gte: since },
      ...(typeof scope === "object" ? { examId: scope.examId } : { OR: [{ examId: null }, { exam: REAL_EXAM_WHERE }] }),
    },
    orderBy: { updatedAt: "desc" },
    // A few spare: a conversation with no stored question is not listed.
    take: opts.limit + 5,
    select: { id: true, updatedAt: true, contextSnapshot: true, exam: { select: { code: true, shortName: true, category: true, active: true } } },
  });
  if (sessions.length === 0) return [];
  const ids = sessions.map((s) => s.id);
  const [openers, lastRows] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { sessionId: { in: ids }, role: "USER" },
      orderBy: { createdAt: "asc" },
      distinct: ["sessionId"],
      select: { sessionId: true, content: true },
    }),
    prisma.chatMessage.findMany({
      where: { sessionId: { in: ids } },
      orderBy: { createdAt: "desc" },
      distinct: ["sessionId"],
      select: { sessionId: true, role: true, createdAt: true },
    }),
  ]);
  const openerOf = new Map(openers.map((o) => [o.sessionId, o.content]));
  const lastOf = new Map(lastRows.map((r) => [r.sessionId, r]));
  const out: RecentChatRow[] = [];
  for (const s of sessions) {
    const opener = openerOf.get(s.id);
    const last = lastOf.get(s.id);
    if (!opener || !last) continue;
    // A school session reaches a list only through its own { examId }.
    const school = isSchoolCategory(s.exam?.category);
    if (school && typeof scope !== "object") continue;
    // Second guard for the where above: no inactive exam outside its own scope.
    if (typeof scope !== "object" && s.exam && s.exam.active === false) continue;
    out.push({
      id: s.id,
      examCode: s.exam?.code ?? null,
      examShort: s.exam?.shortName ?? null,
      opener,
      lastAt: last.createdAt > s.updatedAt ? last.createdAt : s.updatedAt,
      lastRole: last.role,
      reviewMockTitle: reviewTagOf(s.contextSnapshot)?.mockTitle ?? null,
    });
  }
  return out.sort((a, b) => b.lastAt.getTime() - a.lastAt.getTime()).slice(0, opts.limit);
}

/** A saved conversation the member reopens on /chat. */
export interface ResumableChat {
  id: string;
  /** Null = a general chat. */
  examId: string | null;
  examCode: string | null;
  school: boolean;
  lastAt: Date;
  /** The last RESUME_TURNS rows, oldest first. */
  rows: StoredChatRow[];
  /** The conversation's first question (it may be outside `rows`). */
  opener: string | null;
  reviewMockTitle: string | null;
}

/** The member's own conversation by id, or null (not theirs, unknown, or empty). */
export async function loadResumableChat(userId: string, sessionId: string): Promise<ResumableChat | null> {
  const s = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      examId: true,
      updatedAt: true,
      contextSnapshot: true,
      exam: { select: { code: true, category: true } },
    },
  });
  if (!s || s.userId !== userId) return null;
  const [rows, opener] = await Promise.all([
    prisma.chatMessage.findMany({
      where: { sessionId: s.id },
      orderBy: { createdAt: "desc" },
      take: RESUME_TURNS,
      select: { id: true, role: true, content: true, metadata: true, createdAt: true },
    }),
    prisma.chatMessage.findFirst({
      where: { sessionId: s.id, role: "USER" },
      orderBy: { createdAt: "asc" },
      select: { content: true },
    }),
  ]);
  if (rows.length === 0) return null;
  rows.reverse();
  const lastRowAt = rows[rows.length - 1].createdAt;
  return {
    id: s.id,
    examId: s.examId,
    examCode: s.exam?.code ?? null,
    school: isSchoolCategory(s.exam?.category),
    lastAt: lastRowAt > s.updatedAt ? lastRowAt : s.updatedAt,
    rows: rows.map((r) => ({ id: r.id, role: r.role, content: r.content, metadata: r.metadata })),
    opener: opener?.content ?? null,
    reviewMockTitle: reviewTagOf(s.contextSnapshot)?.mockTitle ?? null,
  };
}

/**
 * An existing mistake review of this attempt, most recently active first:
 *   • a conversation tagged with this attempt (POST /api/chat writes the tag
 *     on a review started from the results page since 30 Sep 2026), or
 *   • an older, untagged one whose question is this attempt's own seed text,
 *     started after the attempt finished and before the student's next
 *     finished attempt on the same exam (the seed names only the exam, the
 *     wrong count and the weakest topics, so a later attempt with the same
 *     numbers must not claim it).
 */
export async function findMistakeReviewChat(
  userId: string,
  a: { attemptId: string; examId: string; finishedAt: Date | null; seed: string },
): Promise<{ id: string; startedAt: Date } | null> {
  const nextAttempt = a.finishedAt
    ? await prisma.attempt.findFirst({
        where: { userId, id: { not: a.attemptId }, mock: { examId: a.examId }, finishedAt: { gt: a.finishedAt } },
        orderBy: { finishedAt: "asc" },
        select: { finishedAt: true },
      })
    : null;
  const byText: Prisma.ChatSessionWhereInput | null = a.finishedAt
    ? {
        contextSnapshot: { equals: Prisma.DbNull },
        createdAt: { gte: a.finishedAt, ...(nextAttempt?.finishedAt ? { lt: nextAttempt.finishedAt } : {}) },
        messages: { some: { role: "USER", content: a.seed } },
      }
    : null;
  const s = await prisma.chatSession.findFirst({
    where: {
      userId,
      examId: a.examId,
      OR: [{ contextSnapshot: { path: ["reviewAttemptId"], equals: a.attemptId } }, ...(byText ? [byText] : [])],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, createdAt: true },
  });
  return s ? { id: s.id, startedAt: s.createdAt } : null;
}
