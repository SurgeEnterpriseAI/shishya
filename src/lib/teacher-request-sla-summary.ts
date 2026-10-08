// The team's summary mail after a teacher-request SLA run (7 Oct 2026,
// inbox fix B5). The cron (src/app/api/cron/teacher-request-sla/route.ts)
// sent it through sendTeacherRequestEmail — the NEW-request template — so it
// arrived as "🙋 New teacher request (from sla)", "From: Student (guest)",
// and read like one more student waiting. It is a summary of answers already
// written: its own subject ("Teacher requests — 24h AI answers sent (N)"),
// no From / Contact rows, one line per request (id, exam, the student's own
// ask, "reopened" when it was a second answer), and the queue link.
// The words promise only what the cron did: an AI answer is on each
// student's follow-up card. (The email copy to the student is best-effort,
// so it is not claimed here.)

import { sendEmail } from "@/lib/email";

export interface SlaAnswered {
  id: string;
  examCode: string | null;
  /** The student's own words (tap-log wrapper stripped), may be empty. */
  ask: string;
  /** A NEED_MORE_HELP reopen: this was the second, deeper answer. */
  reopen: boolean;
}

export const QUEUE_URL = "https://shishya.in/admin/teacher-requests";
const ASK_MAX = 90;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function askLine(a: SlaAnswered): string {
  const ask = a.ask.replace(/\s+/g, " ").trim();
  const cut = ask.length > ASK_MAX ? `${ask.slice(0, ASK_MAX - 1).trimEnd()}…` : ask;
  return cut || "(no question left — a check-in was sent)";
}

export function slaSummaryEmail(answered: readonly SlaAnswered[]): { subject: string; text: string; html: string } {
  const n = answered.length;
  const subject = `Teacher requests — 24h AI answers sent (${n})`;
  const lead =
    `The 24h safety net wrote an AI answer on ${n} waiting request${n === 1 ? "" : "s"}. ` +
    `Each student now sees it on their follow-up card. Please follow up personally.`;
  const rows = answered.map((a) => ({
    head: `${a.id} · ${a.examCode ?? "no exam"}${a.reopen ? " · reopened (second answer)" : ""}`,
    ask: askLine(a),
  }));
  const text = `${lead}

${rows.map((r) => `• ${r.head}\n  ${r.ask}`).join("\n")}

Work the queue: ${QUEUE_URL}`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:16px;margin-bottom:8px;">Teacher requests — 24h AI answers sent (${n})</div>
    <p style="font-size:14px;line-height:1.55;margin:0 0 14px;">${esc(lead)}</p>
    <ul style="margin:0;padding:0 0 0 18px;font-size:13px;line-height:1.5;">${rows
      .map((r) => `<li style="margin:0 0 8px;"><span style="color:#64748b;">${esc(r.head)}</span><br>${esc(r.ask)}</li>`)
      .join("")}</ul>
    <a href="${QUEUE_URL}" style="display:inline-block;margin-top:16px;background:#c2410c;color:#fff;text-decoration:none;font-weight:600;font-size:13px;border-radius:8px;padding:9px 16px;">Work the queue →</a>
  </div>
</body></html>`;
  return { subject, text, html };
}

/** Send the run's summary to the team inbox. Best-effort, never throws. */
export async function sendTeacherRequestSlaSummary(to: string, answered: readonly SlaAnswered[]): Promise<boolean> {
  if (answered.length === 0) return false;
  const { subject, text, html } = slaSummaryEmail(answered);
  return sendEmail({ to, subject, html, text, tag: "teacher-request-sla" }).catch(() => false);
}
