// One reply and one analytics row for "the AI is unavailable" (2 Oct 2026).
//
// Why: the Anthropic credit is topped up by hand, so the balance is sometimes
// zero and every model call then fails at once with HTTP 400 "Your credit
// balance is too low … Plans & Billing". That 400 looked exactly like one of
// our own validation errors (`err.status === 400` → `bad(err.message)`), so
// Explain and the mock player's translation printed the provider's billing
// text to students, and none of these failures was recorded anywhere.
//
// What a route does in its catch, in this order:
//   1. aiUnavailableReason(err) — classifyTutorFailure (src/lib/ai/tutor-failure.ts)
//      says the AI was unavailable (credit, auth, overload, rate limit, 5xx,
//      timeout, network)? → recordAiUnavailable(...) and aiUnavailableReply(feature):
//      status 503, { code: "ai-unavailable", error: <the fixed line> };
//   2. isOwnBadRequest(err) — one of OUR validation errors (parseBody in
//      src/lib/http.ts)? → bad(err.message), as before: the student still
//      reads what was wrong with the request;
//   3. anything else → serverError(err). The provider's text is logged by the
//      route, never returned.
// The classifier runs BEFORE the status check: the empty-balance error is a
// 400 too.
//
// The analytics row (plan section 6): AnalyticsEvent, kind CTA_CLICKED,
// props { surface: "ai-unavailable", feature, reason, sent, alt } — one row
// per failed AI request by a person, so the next outage's cost is a count.
// It is left out of the admin board's click counts (src/lib/analytics.ts
// eventCountsByKind). Never written for Class 1-7 (a Class 1-7 container, a
// Class 1-7 school page, or an exam scope that could not be read); a Class
// 8-12 school row carries no anon id, as AnonTutorLog already does.
//
// Lines: src/lib/ai-unavailable-copy.ts. Tests: tests/unit/ai-unavailable-reply.test.ts

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { recordEvent, type RecordEventInput } from "@/lib/analytics";
import { classifyClient } from "@/lib/client-class";
import { prisma } from "@/lib/db/prisma";
import { classifyTutorFailure, isAiUnavailable, type TutorFailReason } from "@/lib/ai/tutor-failure";
import { AI_UNAVAILABLE_CODE, AI_UNAVAILABLE_COPY, type AiUnavailableFeature } from "@/lib/ai-unavailable-copy";
import { isStudentModeClass, isUnder13SchoolPath, schoolContainerClassOf } from "@/lib/school/student-classes";

/**
 * True for one of our own "bad request" errors: a plain Error given status
 * 400 by parseBody (src/lib/http.ts). The SDK's errors are APIError instances
 * and carry `headers` and `error`; a test double of one carries them too.
 */
export function isOwnBadRequest(err: unknown): err is Error & { status: 400 } {
  if (!(err instanceof Error) || err instanceof Anthropic.APIError) return false;
  const e = err as Error & { status?: unknown; headers?: unknown; error?: unknown };
  return e.status === 400 && e.headers === undefined && e.error === undefined;
}

/** Why the AI was unavailable, or null when the failure was not that (ours, a bad request, a bug). */
export function aiUnavailableReason(err: unknown): TutorFailReason | null {
  if (isOwnBadRequest(err)) return null;
  const reason = classifyTutorFailure(err);
  return isAiUnavailable(reason) ? reason : null;
}

/** The default line per feature (a route passes its own when the line depends on the request). */
const DEFAULT_LINE: Readonly<Record<AiUnavailableFeature, string>> = {
  explain: AI_UNAVAILABLE_COPY.explain,
  translate: AI_UNAVAILABLE_COPY.translation,
  fresh: AI_UNAVAILABLE_COPY.fresh,
  "custom-mock": AI_UNAVAILABLE_COPY.customMock,
  mock: AI_UNAVAILABLE_COPY.mock,
  essay: AI_UNAVAILABLE_COPY.essay,
  // /ask and the chat own their lines (src/lib/search-copy.ts, src/lib/tutor-unavailable.ts)
  // and always pass one; this is only the shape's fallback.
  ask: AI_UNAVAILABLE_COPY.generic,
  tutor: AI_UNAVAILABLE_COPY.generic,
  "tutor-guest": AI_UNAVAILABLE_COPY.generic,
};

/** The body of an AI-unavailable reply: the stable code and the fixed line — nothing from the provider. */
export function aiUnavailableBody(feature: AiUnavailableFeature, line?: string): { code: typeof AI_UNAVAILABLE_CODE; error: string } {
  return { code: AI_UNAVAILABLE_CODE, error: line && line.trim() ? line : DEFAULT_LINE[feature] };
}

/** 503 { code: "ai-unavailable", error: <fixed line> }. */
export function aiUnavailableReply(feature: AiUnavailableFeature, line?: string) {
  return NextResponse.json(aiUnavailableBody(feature, line), { status: 503 });
}

// ── The analytics row ────────────────────────────────────────────────

/**
 * Which school band an exam code is in:
 *   none    — a real exam (or a feature with no exam);
 *   student — a Class 8-12 container: the row carries no anon id;
 *   young   — a Class 1-7 container: no row at all;
 *   unknown — the scope could not be read: no row (never guess about a child).
 */
export type SchoolBand = "none" | "student" | "young" | "unknown";

export function schoolBandOfExamCode(code: string | null | undefined): SchoolBand {
  if (typeof code !== "string" || !code) return "unknown";
  const cls = schoolContainerClassOf(code);
  if (cls === null) return "none";
  return isStudentModeClass(cls) ? "student" : "young";
}

export interface AiUnavailableEventInput {
  feature: AiUnavailableFeature;
  reason: TutorFailReason;
  userId?: string | null;
  anonId?: string | null;
  client?: "browser" | "bot" | null;
  /** The page the person was on (same-origin Referer path), when known. */
  path?: string | null;
  /** The alternative the line names: bank-test, solution, pages, build-mock … or null. */
  alt?: string | null;
  /** false when the server did not make the call (a later build); true here. */
  sent?: boolean;
  /** Defaults to "none" (a feature with no exam scope). */
  school?: SchoolBand;
}

/** The row for a failed AI request, or null when none may be written (Class 1-7, unknown scope). Pure. */
export function aiUnavailableEventRow(input: AiUnavailableEventInput): RecordEventInput | null {
  const school = input.school ?? "none";
  if (school === "young" || school === "unknown") return null;
  if (isUnder13SchoolPath(input.path)) return null;
  const userId = input.userId ?? null;
  // One id per row, as /api/analytics keeps it; a school row never carries the anon id.
  const anonId = userId || school === "student" ? null : (input.anonId ?? null);
  return {
    kind: "CTA_CLICKED",
    userId,
    anonId,
    client: input.client ?? null,
    path: input.path ?? null,
    props: { surface: AI_UNAVAILABLE_CODE, feature: input.feature, reason: input.reason, sent: input.sent ?? true, alt: input.alt ?? null },
  };
}

/** Write the row. Never throws and never delays the reply (recordEvent swallows its own errors). */
export function recordAiUnavailable(input: AiUnavailableEventInput): void {
  try {
    const row = aiUnavailableEventRow(input);
    if (row) void recordEvent(row);
  } catch (err) {
    console.error("[ai-unavailable] event skipped:", (err as Error)?.message);
  }
}

// ── Who asked, read from the request (failure path only) ─────────────

/** The shishya_anon cookie (a random UUID; the chat and /ask routes' regex). */
export function anonIdOfRequest(req: Request): string | null {
  return (req.headers.get("cookie") || "").match(/(?:^|;\s*)shishya_anon=([^;]+)/)?.[1] ?? null;
}

/** The path of the page that sent the request, when the Referer is this site's; null otherwise. */
export function refererPathOf(req: Request): string | null {
  const ref = req.headers.get("referer");
  if (!ref) return null;
  try {
    const u = new URL(ref);
    if (u.host !== new URL(req.url).host) return null;
    return u.pathname.slice(0, 300);
  } catch {
    return null;
  }
}

/** { anonId, client, path } of a request, for recordAiUnavailable. */
export function requestIdentity(req: Request): { anonId: string | null; client: "browser" | "bot"; path: string | null } {
  return { anonId: anonIdOfRequest(req), client: classifyClient(req.headers.get("user-agent")), path: refererPathOf(req) };
}

/**
 * The exam code a question or a mock belongs to — read ONLY on a failure
 * path, to keep the Class 1-7 rule. null when it cannot be read (then no row
 * is written). Through the relation, so this is not an exam lookup by a
 * client-supplied key.
 */
export async function examCodeOfQuestion(questionId: string): Promise<string | null> {
  try {
    const q = await prisma.question.findUnique({ where: { id: questionId }, select: { exam: { select: { code: true } } } });
    return q?.exam?.code ?? null;
  } catch {
    return null;
  }
}

export async function examCodeOfMock(mockId: string): Promise<string | null> {
  try {
    const m = await prisma.mock.findUnique({ where: { id: mockId }, select: { exam: { select: { code: true } } } });
    return m?.exam?.code ?? null;
  } catch {
    return null;
  }
}

export async function examCodeOfAttempt(attemptId: string): Promise<string | null> {
  try {
    const a = await prisma.attempt.findUnique({ where: { id: attemptId }, select: { mock: { select: { exam: { select: { code: true } } } } } });
    return a?.mock?.exam?.code ?? null;
  } catch {
    return null;
  }
}
