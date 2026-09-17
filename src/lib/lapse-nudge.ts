// Lapse day 4-6 nudge (16 Sep 2026) — the gap between Daily-5 and win-back.
//
// Daily-5 mails only students seen in the last 72 hours; win-back starts at
// 7 days. On 16 Sep, 109 enrolled, emailable students were last seen 3-7
// days ago and at least 78 of them got no mail at all on day 4 or later.
// This is ONE template mail (no model call) in that window, built as its own
// cron (src/app/api/cron/lapse-nudge/route.ts) with its own budget, so it
// can never eat Daily-5's 200 or win-back's 60.
//
// NOT SCHEDULED: inbox cadence is the founder's call (he reverted the inbox
// budget on 25 Aug 2026). The route runs by hand, ?dry=1 first.
//
// Who gets it (all must hold — lapseEligibility, pure, unit-tested):
//   • an email address, not opted out;
//   • an active enrollment OR a coach plan whose exam date is still ahead;
//   • last seen (latest signed-in AnalyticsEvent) more than 72 hours and less
//     than 7 days ago;
//   • no 'lapse-d4' guard row AND no 'sent:lapse-d4' send-log row in the last
//     21 days (one per 21 days — the send log counts too, so a guard insert
//     that failed can't let the same student get it again the next day;
//     review, 16 Sep 2026);
//   • no mail of any kind in the last 20 hours ('sent:<tag>' rows — covers
//     the coach-morning mail plan holders already get, and a Daily-5 sent
//     the same morning);
//   • no day-3 nudge or win-back in the last 4 days (no two check-ins back
//     to back).
// Newest-lapsed first, at most LAPSE_NUDGE_MAX_SENDS per run.

export const LAPSE_NUDGE_TAG = "lapse-d4";
export const LAPSE_NUDGE_MAX_SENDS = 60;
export const LAPSE_MIN_MS = 72 * 3600_000;
export const LAPSE_MAX_MS = 7 * 86_400_000;
export const LAPSE_REPEAT_MS = 21 * 86_400_000;
/** Any mail this recent holds the nudge (a same-morning Daily-5 or coach mail). */
export const LAPSE_RECENT_MAIL_MS = 20 * 3600_000;
/** Other check-ins this recent hold it too. */
export const LAPSE_CHECKIN_GAP_MS = 4 * 86_400_000;
const CHECKIN_TAGS = new Set(["sent:day3-nudge", "sent:winback", "winback"]);
/** The guard row the cron writes, and the send log sendEmail writes. */
const REPEAT_TAGS = new Set([LAPSE_NUDGE_TAG, `sent:${LAPSE_NUDGE_TAG}`]);

export interface LapseCandidate {
  id: string;
  email: string;
  emailOptOut: boolean;
  lastSeen: Date;
  enrolled: boolean;
  /** Coach plan with a future exam date. */
  livePlan: boolean;
  /** The student's EmailTouch rows of the last 21 days (any tag). */
  touches: { tag: string; sentAt: Date }[];
}

export type LapseVerdict =
  | { ok: true; daysGone: number }
  | { ok: false; reason: "no-email" | "opted-out" | "no-exam" | "window" | "repeat" | "recent-mail" | "recent-checkin" };

/** Whole days since last seen (3-6 inside the window). */
export function lapseDaysGone(lastSeen: Date, now: Date): number {
  return Math.floor((now.getTime() - lastSeen.getTime()) / 86_400_000);
}

export function lapseEligibility(c: LapseCandidate, now: Date): LapseVerdict {
  if (!c.email || !c.email.includes("@")) return { ok: false, reason: "no-email" };
  if (c.emailOptOut) return { ok: false, reason: "opted-out" };
  if (!c.enrolled && !c.livePlan) return { ok: false, reason: "no-exam" };
  const gone = now.getTime() - c.lastSeen.getTime();
  if (!(gone > LAPSE_MIN_MS && gone < LAPSE_MAX_MS)) return { ok: false, reason: "window" };
  const t = now.getTime();
  if (c.touches.some((x) => REPEAT_TAGS.has(x.tag) && t - x.sentAt.getTime() < LAPSE_REPEAT_MS)) {
    return { ok: false, reason: "repeat" };
  }
  if (c.touches.some((x) => x.tag.startsWith("sent:") && t - x.sentAt.getTime() < LAPSE_RECENT_MAIL_MS)) {
    return { ok: false, reason: "recent-mail" };
  }
  if (c.touches.some((x) => CHECKIN_TAGS.has(x.tag) && t - x.sentAt.getTime() < LAPSE_CHECKIN_GAP_MS)) {
    return { ok: false, reason: "recent-checkin" };
  }
  return { ok: true, daysGone: lapseDaysGone(c.lastSeen, now) };
}

/** Eligible candidates, newest-lapsed first, capped. */
export function pickLapseRecipients<T extends LapseCandidate>(
  candidates: T[],
  now: Date,
  cap: number = LAPSE_NUDGE_MAX_SENDS,
): (T & { daysGone: number })[] {
  const out: (T & { daysGone: number })[] = [];
  for (const c of [...candidates].sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime())) {
    const v = lapseEligibility(c, now);
    if (v.ok) out.push({ ...c, daysGone: v.daysGone });
    if (out.length >= cap) break;
  }
  return out;
}
