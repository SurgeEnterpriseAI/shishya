// The school tutor's daily cap (26 Sep 2026): 20 USER messages per account
// per IST day on school chats, enforced by POST /api/chat before any model
// call or DB write.
//
// Why a cap: the exam tutor has a per-minute rate limit (src/lib/rate-limit.ts,
// 30/min) and no daily limit; a child with an evening free could run the
// paid tutor for hours. Twenty turns is a real study session (the September
// median signed-in conversation was well under ten) and a plain number a
// student can be told in advance. The count is read from ChatMessage rows on
// the account's school sessions (ChatSession.exam is a SCHOOL_BOARD
// container; src/lib/school/tutor-context.ts countSchoolTutorMessagesToday),
// so a reload, a second tab or a retry never lets a student around it, and
// nothing new is stored. The day is the IST calendar day, like every other
// "today" on Shishya (src/lib/exam-phase.ts).
//
// Over the cap the route answers with the friendly line below as an ordinary
// reply stream (meta / delta / done) plus `code: "school-daily-cap"` on the
// done event, so the chat shows the line as a bubble and disables the
// composer — no error state, no Retry, no "Not answered" (25 Sep 2026 rules
// in src/lib/chat-reply-status.ts). The line names tomorrow and the chapter
// page, never a streak or a nudge.
//
// Pure — no DB, no React, no prisma import (the chat island imports the
// code and the copy). Tests: tests/unit/school-tutor.test.ts.

import { istDayNumber } from "@/lib/exam-phase";

/** USER messages per account per IST day on school chats. */
export const SCHOOL_TUTOR_DAILY_CAP = 20;

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

/** The UTC instant at which `now`'s IST calendar day began (00:00 IST). */
export function schoolTutorDayStart(now: Date = new Date()): Date {
  return new Date(istDayNumber(now) * MS_PER_DAY - IST_OFFSET_MS);
}

/** True when the account has used its day: `usedToday` USER rows already stored. */
export function schoolTutorCapReached(usedToday: number): boolean {
  return usedToday >= SCHOOL_TUTOR_DAILY_CAP;
}

/** Messages the account may still send today (never negative). */
export function schoolTutorMessagesLeft(usedToday: number): number {
  return Math.max(0, SCHOOL_TUTOR_DAILY_CAP - usedToday);
}

/** The `code` on the done event of a capped turn. */
export const SCHOOL_CAP_CODE = "school-daily-cap";

export type SchoolUiLang = "en" | "hi" | "te";

/** The site UI language (shishya-lang cookie) the cap line is shown in. */
export function schoolUiLang(cookie: string | null | undefined): SchoolUiLang {
  return cookie === "hi" || cookie === "te" ? cookie : "en";
}

/** The end-of-day line, with the cap written out (never a typed "20" elsewhere). */
export const SCHOOL_TUTOR_CAP_COPY: Record<SchoolUiLang, string> = {
  en: `That's ${SCHOOL_TUTOR_DAILY_CAP} messages with the tutor for today — it opens again tomorrow. Till then, the chapter's notes and practice are open on its page.`,
  hi: `आज के लिए ट्यूटर से ${SCHOOL_TUTOR_DAILY_CAP} संदेश हो गए — कल फिर खुलेगा। तब तक अध्याय के नोट्स और अभ्यास उसके पेज पर खुले हैं।`,
  te: `ఈ రోజుకు ట్యూటర్‌తో ${SCHOOL_TUTOR_DAILY_CAP} సందేశాలు అయ్యాయి — రేపు మళ్లీ తెరుచుకుంటుంది. అప్పటి వరకు అధ్యాయం నోట్స్, ప్రాక్టీస్ దాని పేజీలో ఉన్నాయి.`,
};

/**
 * The SSE frames of a capped turn: the same meta / delta / done events a
 * reply streams, so the chat renders the line as the tutor's bubble. No meta
 * frame without a conversation id (the chat would otherwise carry a fake id
 * into its next request).
 */
export function schoolCapFrames(sessionId: string | null, lang: SchoolUiLang): string {
  const frames: string[] = [];
  if (sessionId) frames.push(`event: meta\ndata: ${JSON.stringify({ sessionId })}\n\n`);
  frames.push(`event: delta\ndata: ${JSON.stringify(SCHOOL_TUTOR_CAP_COPY[lang])}\n\n`);
  frames.push(`event: done\ndata: ${JSON.stringify({ messageId: "school-cap", actions: [], toolCalls: [], code: SCHOOL_CAP_CODE })}\n\n`);
  return frames.join("");
}
