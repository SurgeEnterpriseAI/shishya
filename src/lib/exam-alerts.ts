// Exam-tracker alert helpers (23 Aug 2026).
//
// Subscriptions are email-keyed (ExamAlert.email + examId) so anonymous
// search visitors can subscribe. The unsubscribe link therefore can't be
// the user-token flow in email-unsubscribe.ts — it is an HMAC over
// (email, examId) that proves the link came from us, verified in
// constant time. No DB lookup needed to verify; one row flip to act.

import { createHmac, timingSafeEqual } from "node:crypto";

const SITE = "https://shishya.in";

function secret(): string {
  return process.env.NEXTAUTH_SECRET ?? "shishya-exam-alerts";
}

export function normaliseEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function alertToken(email: string, examId: string): string {
  return createHmac("sha256", secret())
    .update(`exam-alert:${normaliseEmail(email)}:${examId}`)
    .digest("hex")
    .slice(0, 24);
}

export function verifyAlertToken(email: string, examId: string, token: string): boolean {
  const expected = alertToken(email, examId);
  if (typeof token !== "string" || token.length !== expected.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

/** Confirm page (GET, no state change). */
export function alertUnsubUrl(email: string, examId: string, examCode: string): string {
  const e = encodeURIComponent(normaliseEmail(email));
  return `${SITE}/exam-alerts/unsubscribe?e=${e}&x=${encodeURIComponent(examId)}&c=${encodeURIComponent(examCode)}&t=${alertToken(email, examId)}`;
}

/** One-click POST endpoint for the List-Unsubscribe header (RFC 8058). */
export function alertUnsubApiUrl(email: string, examId: string): string {
  const e = encodeURIComponent(normaliseEmail(email));
  return `${SITE}/api/exam-alerts/unsubscribe?e=${e}&x=${encodeURIComponent(examId)}&t=${alertToken(email, examId)}`;
}
