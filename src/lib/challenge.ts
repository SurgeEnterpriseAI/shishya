// Challenge a friend (14 Sep 2026) — the pure rules, safe on the client and
// the server. Unit-tested in tests/unit/challenge.test.ts. Storage and
// notifications: src/lib/challenge-db.ts; routes: src/app/api/challenge/;
// landing: src/app/c/[token]/.
//
// Why: the share loop measured ~zero — 0 of 383 signups in the 14 days to
// 14 Sep 2026 arrived on a share link. "Try 5 questions" gave a friend
// nothing to beat and told the sharer nothing back. A challenge is the SAME
// questions with a real score to beat, a side-by-side result for the
// friend, and a note to the challenger when a friend plays.
//
// Honesty rules:
//   • Every stored score is graded on the server against the answer key;
//     the browser's own tally is never stored.
//   • A mock challenge uses evenly spaced questions from the mock (never
//     the ones the student got right); a skipped question is not correct.
//   • A name is shown only if that person typed it. No counters, no
//     countdowns, no pressure copy.
//   • Before a friend's score is sent, they are told the challenger will see
//     it, and they can keep it to themselves.

import { clipText, type PushPayload } from "@/lib/push-alert-rules";

export type ChallengeSource = "quiz" | "topic" | "mock" | "challenge";

export const CHALLENGE_MIN_QUESTIONS = 5;
export const CHALLENGE_MAX_QUESTIONS = 10;
/** The link stops working this long after it was made. */
export const CHALLENGE_TTL_DAYS = 30;
/** At most one email per challenge in this window (it lists every play so far). */
export const CHALLENGE_EMAIL_GAP_MS = 6 * 60 * 60 * 1000;
/** At most one phone notification per challenge in this window. */
export const CHALLENGE_PUSH_GAP_MS = 20 * 60 * 1000;
export const CHALLENGE_NAME_MAX = 24;

// No look-alike characters (0/O, 1/l/I), so a token retyped from a
// screenshot still works. 57 symbols: a 10-character token is ~58 bits, a
// 32-character key ~187 bits.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
export const CHALLENGE_TOKEN_RE = /^[A-HJ-NP-Za-km-z2-9]{10}$/;
export const CHALLENGE_KEY_RE = /^[A-HJ-NP-Za-km-z2-9]{32}$/;

function cryptoBytes(n: number): Uint8Array {
  const a = new Uint8Array(n);
  globalThis.crypto.getRandomValues(a);
  return a;
}

/** Uniform random string over the alphabet (rejection sampling, no modulo bias). */
export function randomChallengeString(length: number, bytes: (n: number) => Uint8Array = cryptoBytes): string {
  const limit = 256 - (256 % ALPHABET.length);
  let out = "";
  while (out.length < length) {
    for (const b of bytes(length * 2)) {
      if (b < limit) out += ALPHABET[b % ALPHABET.length];
      if (out.length === length) break;
    }
  }
  return out;
}

/** The public id in /c/{token}. */
export const newChallengeToken = () => randomChallengeString(10);
/** The secret a browser keeps for a challenge it made (creator) or played (player). */
export const newChallengeKey = () => randomChallengeString(32);

/**
 * A typed first name as friends may see it: letters in any script, spaces,
 * dots, hyphens and apostrophes — collapsed, trimmed, capped. Null when no
 * letter remains, so the copy says "your friend" instead.
 */
export function sanitizeChallengeName(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .normalize("NFC")
    .replace(/[^\p{L}\p{M}\s.'-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  const capped = Array.from(cleaned).slice(0, CHALLENGE_NAME_MAX).join("").trim();
  return /\p{L}/u.test(capped) ? capped : null;
}

/** Correct answers: one choice per question in question order; a missing or
 *  null choice is a skip and is not correct. Extra choices are ignored. */
export function gradeChoices(answerKeys: readonly string[], choices: readonly (string | null | undefined)[]): number {
  let correct = 0;
  answerKeys.forEach((key, i) => {
    if (typeof choices[i] === "string" && choices[i] === key) correct++;
  });
  return correct;
}

/**
 * The questions a mock challenge uses: `max` evenly spaced picks from the
 * eligible questions in mock order, so the slice never depends on what the
 * student got right. Null when fewer than CHALLENGE_MIN_QUESTIONS are
 * eligible.
 */
export function mockSlice<T>(eligible: readonly T[], max = CHALLENGE_MAX_QUESTIONS): T[] | null {
  if (eligible.length < CHALLENGE_MIN_QUESTIONS) return null;
  if (eligible.length <= max) return [...eligible];
  return Array.from({ length: max }, (_, i) => eligible[Math.floor((i * eligible.length) / max)]);
}

export function challengeExpiresAt(createdAt: Date): Date {
  return new Date(createdAt.getTime() + CHALLENGE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export function isChallengeExpired(expiresAt: Date | string, now: Date = new Date()): boolean {
  return new Date(expiresAt).getTime() <= now.getTime();
}

/** Notification cap: true when nothing was sent yet or the gap has passed. */
export function canNotifyAgain(last: Date | string | null | undefined, now: Date, gapMs: number): boolean {
  if (!last) return true;
  const t = new Date(last).getTime();
  return !Number.isFinite(t) || now.getTime() - t >= gapMs;
}

export type ChallengeVerdict = "ahead" | "tied" | "behind";

export function challengeVerdict(mine: number, theirs: number): ChallengeVerdict {
  return mine > theirs ? "ahead" : mine === theirs ? "tied" : "behind";
}

/** The one line under the side-by-side scores: what happened, nothing more. */
export function challengeCompareLine(p: { mine: number; theirs: number; total: number; name: string | null }): string {
  const same = `on the same ${p.total} questions`;
  switch (challengeVerdict(p.mine, p.theirs)) {
    case "ahead":
      return `You're ahead of ${p.name ?? "your friend"} by ${p.mine - p.theirs} ${same}.`;
    case "tied":
      return `You and ${p.name ?? "your friend"} tied ${same}.`;
    default:
      return `${p.name ?? "Your friend"} is ahead by ${p.theirs - p.mine} ${same}.`;
  }
}

/** Landing headline, e.g. "Ravi scored 7/10 on 10 SSC GD questions". */
export function challengeHeadline(p: { name: string | null; correct: number; total: number; examShort: string; fromMock: boolean }): string {
  const what = p.fromMock ? `${p.total} questions from a ${p.examShort} mock` : `${p.total} ${p.examShort} questions`;
  return `${p.name ?? "Your friend"} scored ${p.correct}/${p.total} on ${what}`;
}

/** WhatsApp / copy text for a new challenge (the sender is known to the chat, so no name). */
export function challengeShareText(p: { correct: number; total: number; examShort: string; fromMock: boolean; url: string }): string {
  const what = p.fromMock ? `${p.total} questions from my ${p.examShort} mock` : `these ${p.total} ${p.examShort} questions`;
  return `I got ${p.correct}/${p.total} on ${what}. Can you beat that? Same questions, free, no sign-in:\n${p.url}`;
}

/** Phone notification to the challenger when a friend's score arrives. */
export function challengePlayPushPayload(p: {
  token: string;
  examShort: string;
  playerName: string | null;
  playerCorrect: number;
  creatorCorrect: number;
  total: number;
}): PushPayload {
  const who = p.playerName ?? "A friend";
  return {
    title: clipText(`${who} played your ${p.examShort} challenge`, 72),
    body: clipText(`${who}: ${p.playerCorrect}/${p.total} · you: ${p.creatorCorrect}/${p.total}. Tap to see every score.`, 140),
    url: `/c/${p.token}?utm_source=push&utm_medium=challenge`,
    tag: `challenge-${p.token}`,
  };
}

/** The one confirmation when a challenger turns on phone notifications. */
export function challengeWatchWelcomePayload(p: { token: string; examShort: string }): PushPayload {
  return {
    title: clipText(`Notifications on for your ${p.examShort} challenge`, 72),
    body: "You'll get one when a friend plays — at most one every 20 minutes.",
    url: `/c/${p.token}?utm_source=push&utm_medium=challenge-welcome`,
    tag: `challenge-${p.token}`,
  };
}

const HTML_ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);

/** Email to a signed-in challenger: every play so far, newest first. */
export function challengePlayEmail(p: {
  token: string;
  examShort: string;
  creatorCorrect: number;
  total: number;
  /** Newest first. */
  plays: { name: string | null; correct: number }[];
}): { subject: string; text: string; html: string } {
  const url = `https://shishya.in/c/${p.token}`;
  const latest = p.plays[0];
  const who = latest?.name ?? "A friend";
  const subject = clipText(
    `${who} took your ${p.examShort} challenge: ${latest?.correct ?? 0}/${p.total} (you: ${p.creatorCorrect}/${p.total})`,
    110,
  );
  const n = p.plays.length;
  const shown = p.plays.slice(0, 10);
  const more = n > shown.length ? n - shown.length : 0;
  const opener = `${n === 1 ? "A friend has played" : `${n} friends have played`} the ${p.examShort} challenge you sent. Your score: ${p.creatorCorrect}/${p.total}.`;
  const text = `${opener}

${shown.map((x) => `${x.name ?? "A friend"}: ${x.correct}/${p.total}`).join("\n")}${more ? `\n…and ${more} more on the page.` : ""}

See every score: ${url}

— Shishya
(At most one of these emails every 6 hours per challenge.)`;
  const rows = shown
    .map(
      (x) =>
        `<tr><td style="padding:6px 0;font-size:14px;">${esc(x.name ?? "A friend")}</td><td style="padding:6px 0;font-size:14px;text-align:right;font-weight:700;">${x.correct}/${p.total}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:18px;">${esc(who)} took your ${esc(p.examShort)} challenge</div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0;">${esc(opener)}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 14px;">${rows}</table>
    ${more ? `<p style="font-size:13px;color:#334155;margin:0 0 14px;">…and ${more} more on the page.</p>` : ""}
    <a href="${url}"
       style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">
      See every score →
    </a>
    <p style="font-size:11px;color:#94a3b8;margin:18px 0 0;">At most one of these emails every 6 hours per challenge.</p>
  </div>
</body></html>`;
  return { subject, text, html };
}
