// Transactional email via Resend.
//
// Stub-safe: if RESEND_API_KEY is absent at runtime (preview deploys,
// local dev) every send is a no-op that just logs the intended
// payload. Production needs the env var + a verified sender domain
// (set in Resend dashboard → Domains).
//
// Templates are plain TS objects, not React Email — the volume is
// tiny right now (welcome + day-3 nudge) and inlining gets us to
// shipping faster. Migrate to react-email if we ever ship 3+
// templates that share components.
//
// Env vars required for live sending:
//   RESEND_API_KEY    sk-...  (from resend.com → API Keys)
//   EMAIL_FROM        e.g. "Shishya <tutor@shishya.in>"
//                     Must use a domain verified in the Resend
//                     dashboard, or sends will be rejected.
//                     Defaults to tutor@shishya.in if unset.

import { Resend } from "resend";
import { unsubFooterHtml, unsubApiUrl } from "./email-unsubscribe";

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Shishya <tutor@shishya.in>";

// Founder oversight: BCC the founder on every outbound email so there's
// a full record of what candidates receive. Env-overridable (set
// FOUNDER_BCC="" to turn it off, or to a different / comma-separated
// list). BCC — never To/Cc — so candidates never see this address.
const founderBcc = (process.env.FOUNDER_BCC ?? "venumuvva@gmail.com")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

// Lazy-init so a missing key at import time doesn't crash the
// build. We just refuse to send at the call site.
let _client: Resend | null = null;
function client(): Resend | null {
  if (!apiKey) return null;
  if (!_client) _client = new Resend(apiKey);
  return _client;
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  /** Optional plain-text fallback for clients that don't render HTML.
   *  If omitted, Resend strips the HTML automatically. */
  text?: string;
  /** Optional tag for analytics — appears in the Resend dashboard. */
  tag?: string;
  /** Where replies should go. Used for founder outreach so a student
   *  can simply hit Reply and reach a human inbox, not the send-only
   *  transactional domain. */
  replyTo?: string;
  /** When set, this is a marketing/nudge email to that user: append a
   *  one-click unsubscribe footer and the List-Unsubscribe headers.
   *  Omit for purely transactional mail the user's own action triggered
   *  (mentor replies, payment receipts) — those need no opt-out. */
  unsubUserId?: string;
}

/**
 * Send a transactional email. Returns true on accepted-for-delivery,
 * false on any failure (logged). Never throws — caller treats email
 * as best-effort, never as a blocking dependency of a user flow.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const c = client();
  if (!c) {
    console.log(
      `[email] STUB (no RESEND_API_KEY) — would send to ${payload.to}: "${payload.subject}"`,
    );
    return false;
  }
  // Opt-out is enforced at the send layer, not just in cron filters: a
  // marketing email (unsubUserId set) to an opted-out user is dropped
  // here even if the caller forgot to exclude them. Transactional mail
  // (no unsubUserId) always sends.
  if (payload.unsubUserId) {
    try {
      const { prisma } = await import("./db/prisma");
      const rows = await prisma.$queryRaw<Array<{ opt: boolean }>>`
        SELECT "emailOptOut" AS opt FROM "User" WHERE id = ${payload.unsubUserId} LIMIT 1`;
      if (rows[0]?.opt) {
        console.log(`[email] skipped — user ${payload.unsubUserId} opted out`);
        return false;
      }
    } catch (err) {
      // FAIL CLOSED (review 22 Aug 2026): if we can't verify opt-out
      // status, don't send marketing mail — a missed nudge is harmless, a
      // nudge to someone who unsubscribed is a broken promise.
      console.error("[email] opt-out check failed — skipping marketing send:", err);
      return false;
    }
  }
  try {
    // Don't BCC the founder onto an email that IS already addressed to
    // them (growth report, teacher-request alerts) — avoids a duplicate.
    // Also no BCC on MARKETING mail (unsubUserId set): the BCC copy carried
    // that student's one-click List-Unsubscribe token, so a single founder
    // tap on Gmail's "Unsubscribe" would silently opt the student out
    // (review 22 Aug 2026) — and bulk nudges flooded the inbox anyway.
    const bcc = payload.unsubUserId
      ? []
      : founderBcc.filter((a) => a.toLowerCase() !== payload.to.toLowerCase());
    // Marketing mail gets the opt-out footer + RFC 8058 one-click headers.
    const html = payload.unsubUserId
      ? payload.html + unsubFooterHtml(payload.unsubUserId)
      : payload.html;
    // One-click header points at the POST API (state change on POST only);
    // the body footer links to the confirm PAGE (no state change on GET).
    const headers = payload.unsubUserId
      ? {
          "List-Unsubscribe": `<${unsubApiUrl(payload.unsubUserId)}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : undefined;
    const res = await c.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html,
      text: payload.text,
      bcc: bcc.length > 0 ? bcc : undefined,
      replyTo: payload.replyTo,
      headers,
      tags: payload.tag ? [{ name: "kind", value: payload.tag }] : undefined,
    });
    if ("error" in res && res.error) {
      console.error("[email] send rejected:", res.error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] send threw:", err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────
// Templates. Plain TS — no JSX, no react-email. Each function takes
// a small typed payload and returns a ready-to-send {subject,html,text}.
// ─────────────────────────────────────────────────────────────────────

interface CommonProps {
  /** First name if available, else email-local-part. We address by
   *  first name because students respond better to "Hi Riya" than
   *  "Hi riya.kumar2003". */
  firstName: string;
}

interface WelcomeProps extends CommonProps {
  /** URL students should land on after clicking the primary CTA in
   *  the welcome email. Right now that's /dashboard which auto-stages
   *  the Diagnostic-5 hero — perfect first-action target. */
  ctaUrl: string;
}

export function renderWelcomeEmail(p: WelcomeProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `Welcome to Shishya, ${p.firstName} — your 90-second diagnostic is ready`;
  const text = `Hi ${p.firstName},

Welcome to Shishya. You're 1 click away from seeing where you stand on the syllabus.

We've staged a 90-second, 5-question diagnostic for you — once you finish, Shishya knows your weak topics and every next mock targets exactly those. No timer pressure. No cost.

Open it: ${p.ctaUrl}

What you'll get inside:
• Your free personal coach — a day-by-day plan to your exam date, rebuilt every morning around what you actually did: https://shishya.in/coach
• Adaptive mocks that get smarter as you answer
• Real previous-year papers, organised by year + topic
• Ask Shishya — AI tutor that knows your syllabus + your mistakes
• Talk to a real subject expert — free 1-to-1 human help, matched to your exam and the exact topic you're stuck on
• Free, in your language

One thing before you go: the difference between aspirants who crack a government job and those who keep re-attempting is almost never talent or hours studied. It's having a clear plan for TODAY — and following it on the ordinary days. That is exactly what your free personal coach does: it turns the whole syllabus into today's 2-3 things, and rebuilds them every morning around what you actually did. It is the single most useful thing on this platform, and it costs nothing.

Set it up in 30 seconds (three answers): https://shishya.in/coach

— The Shishya team`;

  // Inline-CSS HTML so most email clients (Gmail, Outlook, mobile)
  // render it consistently. No <style> tags — many clients strip them.
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:'Inter',system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;background:#f97316;border-radius:10px;line-height:48px;color:#fff;font-weight:700;font-size:22px;">शि</div>
      <div style="font-weight:700;font-size:18px;margin-top:8px;">Shishya</div>
    </div>
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;">Welcome, ${p.firstName} 👋</h1>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;color:#334155;">You're 1 click away from seeing where you stand. We've staged a <strong>90-second, 5-question diagnostic</strong> — Shishya uses your answers to spot the topics dragging your score down, then every next mock targets exactly those.</p>
    <p style="margin:24px 0;text-align:center;">
      <a href="${p.ctaUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">Take my diagnostic →</a>
    </p>
    <p style="font-size:13px;line-height:1.55;margin:24px 0 8px;color:#475569;">What you'll get inside:</p>
    <ul style="font-size:13px;line-height:1.6;margin:0 0 24px;padding-left:20px;color:#475569;">
      <li><strong style="color:#0f172a;">Your free personal coach</strong> — the surest way to crack the job: a day-by-day plan to your exam date, rebuilt every morning around what you actually did</li>
      <li>Adaptive mocks that get smarter with every answer</li>
      <li>Real previous-year papers, organised by year + topic</li>
      <li>Ask Shishya — AI tutor that knows your syllabus + your mistakes</li>
      <li><strong style="color:#0f172a;">Talk to a real subject expert</strong> — free 1-to-1 human help, matched to your exam and the exact topic you're stuck on</li>
      <li>Free, in your language</li>
    </ul>
    <div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:10px;padding:16px 18px;margin:0 0 24px;">
      <p style="font-size:14px;font-weight:700;margin:0 0 6px;color:#0f172a;">The surest way to crack the job</p>
      <p style="font-size:13px;line-height:1.6;margin:0 0 10px;color:#334155;">What separates aspirants who get selected from those who keep re-attempting is almost never talent or hours — it's knowing what to study <em>today</em>, and doing it on ordinary days. Your <strong style="color:#0f172a;">free personal coach</strong> turns the whole syllabus into today's 2–3 things and rebuilds them every morning around what you actually did. Miss a day and it simply re-plans — no backlog, no guilt.</p>
      <a href="https://shishya.in/coach" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:9px 18px;border-radius:8px;">Set up my free coach (30s) →</a>
    </div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:11px;line-height:1.6;color:#94a3b8;margin:0;text-align:center;">
      You're getting this because you signed up at <a href="https://shishya.in" style="color:#c2410c;">shishya.in</a>. If this wasn't you, ignore this email.
    </p>
  </div>
</body></html>`;
  return { subject, html, text };
}

interface NudgeProps extends CommonProps {
  ctaUrl: string;
  /** Days since signup — usually 3. Drives the copy hook. */
  daysSinceSignup: number;
}

export function renderDay3NudgeEmail(p: NudgeProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `${p.firstName}, your diagnostic is still waiting — 5 questions, 90 seconds`;
  const text = `Hi ${p.firstName},

Quick reminder — you signed up ${p.daysSinceSignup} days ago and haven't taken your diagnostic yet.

It's 5 questions. 90 seconds. The moment you finish, Shishya can show you which topics deserve tomorrow's hour and which you can safely skip.

Take it now: ${p.ctaUrl}

And remember — if a topic has you stuck, you can talk to a real subject expert free, 1-to-1, matched to your exam. You're never on your own here.

If today's not the day, no stress — but the longer you wait, the longer Shishya can't help.

— The Shishya team`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:'Inter',system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;background:#f97316;border-radius:10px;line-height:48px;color:#fff;font-weight:700;font-size:22px;">शि</div>
      <div style="font-weight:700;font-size:18px;margin-top:8px;">Shishya</div>
    </div>
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;">Your diagnostic is still waiting, ${p.firstName}</h1>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;color:#334155;">You signed up ${p.daysSinceSignup} days ago — and the platform can't help you until it sees how you answer. <strong>5 questions. 90 seconds.</strong> That's the unlock.</p>
    <p style="margin:24px 0;text-align:center;">
      <a href="${p.ctaUrl}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">Take my 5-question diagnostic →</a>
    </p>
    <p style="font-size:13px;line-height:1.55;margin:24px 0 8px;color:#475569;">After the diagnostic, Shishya will tell you the 3 topics dragging your score down + recommend exactly which mock to take next. No more guessing.</p>
    <p style="font-size:13px;line-height:1.55;margin:0 0 16px;color:#475569;">And if a topic has you stuck, <strong style="color:#0f172a;">talk to a real subject expert</strong> — free, 1-to-1, matched to your exam. You're never on your own here.</p>
    <div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:10px;padding:14px 16px;margin:0 0 24px;">
      <p style="font-size:14px;font-weight:700;margin:0 0 6px;color:#0f172a;">The surest way to crack the job</p>
      <p style="font-size:13px;line-height:1.55;margin:0 0 10px;color:#334155;">Studying in bursts is why most attempts fail — not lack of ability. Aspirants who get selected do a little every day, and the hard part is simply knowing <em>what</em> to do today. Your <strong style="color:#0f172a;">free personal coach</strong> answers that every single morning and re-plans whenever life gets in the way. It is the one thing on Shishya most likely to put you in the merit list.</p>
      <a href="https://shishya.in/coach" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:600;font-size:13px;padding:9px 18px;border-radius:8px;">Set up my free coach (30s) →</a>
    </div>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:11px;line-height:1.6;color:#94a3b8;margin:0;text-align:center;">
      Not interested? Just ignore this email — we won't send again.<br>
      <a href="https://shishya.in" style="color:#c2410c;">shishya.in</a>
    </p>
  </div>
</body></html>`;
  return { subject, html, text };
}

// ── Surge admission: aptitude PASS email ───────────────────────────────
// Sent to a candidate the moment they clear the aptitude cutoff. Tells
// them they're shortlisted and to contact Nikhil for the next steps.
const SURGE_CONTACT = {
  name: "Nikhil",
  phone: "7624967999",
  // WhatsApp deep-link (India country code).
  whatsapp: "https://wa.me/917624967999",
} as const;

interface AptitudePassProps extends CommonProps {
  score: number;
  total: number;
}

export function renderAptitudePassEmail(p: AptitudePassProps): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = `You've cleared the Surge aptitude round, ${p.firstName} 🎉`;
  const text = `Hi ${p.firstName},

Congratulations! You scored ${p.score}/${p.total} and cleared the Surge admission aptitude round.

Next step — reach out to ${SURGE_CONTACT.name} for your further steps in the Surge process:

  Call or WhatsApp ${SURGE_CONTACT.name}: ${SURGE_CONTACT.phone}
  WhatsApp: ${SURGE_CONTACT.whatsapp}

Please mention your name and that you've cleared the aptitude test so ${SURGE_CONTACT.name} can guide you on what comes next.

We're glad to have you in the process.

— Team Surge`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:'Inter',system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:48px;height:48px;background:#f97316;border-radius:10px;line-height:48px;color:#fff;font-weight:700;font-size:22px;">शि</div>
      <div style="font-weight:700;font-size:18px;margin-top:8px;">Shishya · Surge</div>
    </div>
    <h1 style="font-size:22px;line-height:1.3;margin:0 0 12px;">Congratulations, ${p.firstName} 🎉</h1>
    <p style="font-size:15px;line-height:1.55;margin:0 0 16px;color:#334155;">You scored <strong>${p.score}/${p.total}</strong> and <strong>cleared the Surge admission aptitude round.</strong> You're shortlisted for the next stage.</p>
    <div style="background:#fff;border:1px solid #fed7aa;border-radius:10px;padding:18px 20px;margin:20px 0;">
      <p style="font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:#9a3412;font-weight:700;margin:0 0 6px;">Your next step</p>
      <p style="font-size:15px;line-height:1.55;margin:0 0 4px;color:#0f172a;">Reach out to <strong>${SURGE_CONTACT.name}</strong> for your further steps:</p>
      <p style="font-size:20px;font-weight:700;margin:8px 0 4px;color:#0f172a;">📞 ${SURGE_CONTACT.phone}</p>
      <p style="font-size:13px;color:#475569;margin:0;">Call or WhatsApp. Please mention your name and that you've cleared the aptitude test.</p>
    </div>
    <p style="margin:22px 0;text-align:center;">
      <a href="${SURGE_CONTACT.whatsapp}" style="display:inline-block;background:#22c55e;color:#fff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:8px;">Message ${SURGE_CONTACT.name} on WhatsApp →</a>
    </p>
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;">
    <p style="font-size:11px;line-height:1.6;color:#94a3b8;margin:0;text-align:center;">
      You're receiving this because you cleared the aptitude test at <a href="https://shishya.in/aptitude" style="color:#c2410c;">shishya.in/aptitude</a>.
    </p>
  </div>
</body></html>`;
  return { subject, html, text };
}

export async function sendAptitudePassEmail(candidate: {
  email: string;
  name?: string | null;
  score: number;
  total: number;
}): Promise<boolean> {
  const firstName = pickFirstName(candidate.name, candidate.email);
  const { subject, html, text } = renderAptitudePassEmail({
    firstName,
    score: candidate.score,
    total: candidate.total,
  });
  return sendEmail({ to: candidate.email, subject, html, text, tag: "aptitude-pass" });
}

// ── Weekly Gemini growth report (to the founder) ───────────────────────
export async function sendGrowthReportEmail(p: {
  to: string;
  weekLabel: string;
  metricsLine: string; // one-line headline numbers
  narrative: string;
  priorReview: string;
  suggestions: { title: string; category: string; effort: string; expectedImpact: string }[];
  analysed: boolean; // false = metrics only (Gemini key not set yet)
}): Promise<boolean> {
  const subject = `Shishya growth report — week of ${p.weekLabel}${p.analysed ? "" : " (metrics only)"}`;
  const sugRows = p.suggestions
    .map(
      (s, i) =>
        `${i + 1}. [${s.category} · ${s.effort}] ${s.title} — ${s.expectedImpact}`
    )
    .join("\n");
  const text = `Shishya growth report — week of ${p.weekLabel}

${p.metricsLine}

${p.analysed ? p.narrative + "\n\nPrior week: " + p.priorReview + "\n\nThis week's build list for Claude:\n" + sugRows : "Gemini analysis was skipped (GEMINI_API_KEY not set). Add the key in Vercel to get suggestions next run."}`;

  const sugHtml = p.suggestions
    .map(
      (s, i) => `<li style="margin:0 0 10px;">
        <span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:10px;font-weight:700;text-transform:uppercase;border-radius:4px;padding:1px 6px;">${s.category} · ${s.effort}</span>
        <div style="font-weight:600;font-size:14px;margin-top:3px;">${i + 1}. ${s.title}</div>
        <div style="font-size:12px;color:#475569;">→ ${s.expectedImpact}</div>
      </li>`
    )
    .join("");

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:16px;margin-bottom:4px;">📈 Shishya growth report</div>
    <div style="font-size:12px;color:#64748b;margin-bottom:16px;">Week of ${p.weekLabel} · Gemini analyst → Claude build list</div>
    <div style="background:#0f172a;color:#e2e8f0;border-radius:8px;padding:12px 14px;font-size:13px;line-height:1.5;">${p.metricsLine}</div>
    ${
      p.analysed
        ? `<p style="font-size:14px;line-height:1.6;margin:18px 0 8px;color:#1e293b;">${p.narrative}</p>
    <p style="font-size:12px;line-height:1.55;margin:0 0 18px;color:#64748b;"><strong>Prior week:</strong> ${p.priorReview}</p>
    <div style="font-size:13px;font-weight:700;margin:0 0 8px;">This week's build list for Claude</div>
    <ol style="padding-left:18px;margin:0;">${sugHtml}</ol>`
        : `<p style="font-size:13px;line-height:1.6;margin:18px 0;color:#b45309;">Gemini analysis was skipped — <strong>GEMINI_API_KEY isn't set in Vercel yet.</strong> Add it and the next run (or a manual trigger) will include the suggestion list.</p>`
    }
    <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0;">
    <p style="font-size:11px;color:#94a3b8;margin:0;">Automated weekly by the Shishya growth loop · <a href="https://shishya.in" style="color:#c2410c;">shishya.in</a></p>
  </div>
</body></html>`;
  return sendEmail({ to: p.to, subject, html, text, tag: "growth-report" });
}

/**
 * Team notification for a new "Talk to a real teacher" request. During the
 * pilot these are worked manually, so the team needs to see each one fast.
 */
export async function sendTeacherRequestEmail(p: {
  to: string;
  surface: string;
  examCode: string | null;
  topicCode: string | null;
  studentName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  message: string;
  signedIn: boolean;
}): Promise<boolean> {
  const subject = `🙋 New teacher request${p.examCode ? ` — ${p.examCode}` : ""} (from ${p.surface})`;
  const rows = [
    ["From", `${p.studentName ?? "Student"}${p.signedIn ? " (signed in)" : " (guest)"}`],
    ["Contact", [p.contactEmail, p.contactPhone].filter(Boolean).join(" · ") || "—"],
    ["Exam", p.examCode ?? "—"],
    ["Topic", p.topicCode ?? "—"],
    ["Came from", p.surface],
  ];
  const text = `New "talk to a teacher" request

${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}

Their message:
${p.message}

Work the queue: https://shishya.in/admin/teacher-requests`;
  const rowsHtml = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:3px 12px 3px 0;color:#64748b;font-size:12px;">${k}</td><td style="padding:3px 0;font-size:13px;font-weight:500;">${v}</td></tr>`
    )
    .join("");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:600px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:16px;margin-bottom:12px;">🙋 New teacher request</div>
    <table style="border-collapse:collapse;margin-bottom:14px;">${rowsHtml}</table>
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:12px 14px;font-size:14px;line-height:1.55;white-space:pre-wrap;">${p.message.replace(/</g, "&lt;")}</div>
    <a href="https://shishya.in/admin/teacher-requests" style="display:inline-block;margin-top:16px;background:#c2410c;color:#fff;text-decoration:none;font-weight:600;font-size:13px;border-radius:8px;padding:9px 16px;">Work the queue →</a>
  </div>
</body></html>`;
  return sendEmail({ to: p.to, subject, html, text, tag: "teacher-request" });
}

/**
 * The Daily 5 nudge — retention loop. Sent each morning to recently-active
 * students who haven't visited yet today: "your 5 questions are ready".
 */
export async function sendDailyFiveEmail(p: {
  to: string;
  userId?: string;
  name: string | null;
  examShort: string;
  /** Current streak (days). When ≥2, the email leads with loss-aversion
   *  — the single strongest reason-to-return we can put in a subject line. */
  streakCurrent?: number;
  /** When false, the mail closes with the coach invitation — the
   *  escalation from "daily 5 questions" to "a real plan to the exam". */
  hasCoachPlan?: boolean;
  /** Yesterday's cohort effort — "N aspirants studied yesterday".
   *  Omitted when the cohort was too thin to inspire. */
  peers?: { students: number; sets: number } | null;
  /** Live-test day/eve notice from liveTestEmailNotice() — rendered as
   *  a highlighted box (html) + a line before the signature (text). */
  liveTest?: { text: string; html: string } | null;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const streak = p.streakCurrent ?? 0;
  const hasStreak = streak >= 2;

  const subject = hasStreak
    ? `🔥 ${first}, don't break your ${streak}-day streak`
    : `☀️ ${first}, your Daily 5 for ${p.examShort} is ready`;

  const streakLineText = hasStreak
    ? `You're on a ${streak}-day streak. 3 minutes today keeps it alive — miss today and it resets to zero.`
    : `~3 minutes, and it starts building your daily streak.`;
  const streakLineHtml = hasStreak
    ? `You're on a <strong>${streak}-day streak</strong> 🔥 — 3 minutes today keeps it alive. Miss today and it resets to zero.`
    : `About 3 minutes — and it starts building your daily streak. 🔥`;

  const peerText = p.peers
    ? `\n${p.peers.students} aspirants put in ${p.peers.sets} practice sets on Shishya yesterday. Your turn.\n`
    : "";
  const peerHtml = p.peers
    ? `<p style="font-size:13px;line-height:1.6;margin:12px 0 0;color:#334155;">🔥 <strong>${p.peers.students} aspirants</strong> put in ${p.peers.sets} practice sets on Shishya yesterday. Your turn.</p>`
    : "";

  const text = `${first},

Your Daily 5 is ready — 5 quick questions on your weakest ${p.examShort} topic. ${streakLineText}
${peerText}${p.liveTest ? `\n${p.liveTest.text}\n` : ""}

Start now: https://shishya.in/dashboard

Small daily reps are how toppers are made. See you inside.
— Shishya
${
  p.hasCoachPlan === false
    ? `\nP.S. Five questions keep the habit alive — but a plan is what actually cracks the job. Your free personal coach maps every day from here to your ${p.examShort} exam, and rebuilds it each morning around what you actually did. It's the most useful thing on Shishya and it costs nothing: https://shishya.in/coach\n`
    : ""
}
(Reply to this email to stop the daily reminder.)`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:18px;">${hasStreak ? `🔥 Keep your ${streak}-day streak alive` : "☀️ Your Daily 5 is ready"}</div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0;">
      ${first}, 5 quick questions on your weakest <strong>${p.examShort}</strong> topic are waiting.
      ${streakLineHtml}
    </p>
    <a href="https://shishya.in/dashboard"
       style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">
      Start today's 5 →
    </a>
    ${peerHtml}
    ${p.liveTest?.html ?? ""}
    <p style="font-size:12px;color:#64748b;margin:18px 0 0;">
      Small daily reps are how toppers are made. — Shishya
    </p>
    ${
      p.hasCoachPlan === false
        ? `<div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:10px;padding:12px 14px;margin:16px 0 0;">
      <p style="font-size:13px;font-weight:700;margin:0 0 4px;color:#0f172a;">The surest way to crack the job</p>
      <p style="font-size:12px;line-height:1.55;margin:0 0 8px;color:#334155;">Five questions keep the habit alive — a plan is what gets you selected. Your <strong style="color:#0f172a;">free personal coach</strong> maps every day from here to your ${p.examShort} exam and rebuilds it each morning around what you actually did.</p>
      <a href="https://shishya.in/coach" style="font-size:12px;font-weight:600;color:#c2410c;text-decoration:none;">Set up my free coach (30s) →</a>
    </div>`
        : ""
    }
    <p style="font-size:11px;color:#94a3b8;margin:10px 0 0;">Reply to this email to stop the daily reminder.</p>
  </div>
</body></html>`;
  return sendEmail({ to: p.to, subject, html, text, tag: "daily-five", unsubUserId: p.userId });
}

/** The coach's morning email — a DEDICATED, standalone "here's your plan
 *  for today" for coach-plan holders (founder call 18 Aug 2026: keep it
 *  independent of the Daily-5 so the plan content itself pulls them back
 *  to preparation). Leads with the coach's note + the day's 2-3 tasks +
 *  days to exam. Sent ~7 AM IST after the 4 AM night-brain builds today's
 *  plan. Marketing → carries the opt-out footer. */
export async function sendCoachDayEmail(p: {
  to: string;
  userId: string;
  name: string | null;
  examShort: string;
  daysLeft: number;
  tasks: string[];
  note: string | null;
  streakCurrent?: number;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const dl = `${p.daysLeft} ${p.daysLeft === 1 ? "day" : "days"}`;
  const streak = p.streakCurrent ?? 0;
  const subject =
    streak >= 3
      ? `📋 ${first}, day ${streak} — today's plan (${dl} to ${p.examShort})`
      : `📋 ${first}, your ${p.examShort} plan for today — ${dl} left`;

  const taskLines = p.tasks.map((t) => `  • ${t}`).join("\n");
  const text = `${first},

Your coach rebuilt your plan around what you did — here's today, with ${dl} to your ${p.examShort} exam:

${taskLines}
${p.note ? `\n${p.note}\n` : ""}
Do just these today and you're a day closer. Open your plan: https://shishya.in/coach

— Shishya (your free personal coach)

(Reply to stop, or unsubscribe below.)`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <p style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#c2410c;margin:0 0 4px;">Your plan for today</p>
    <div style="font-weight:700;font-size:20px;margin:0 0 4px;">${dl} to your ${p.examShort} exam${streak >= 3 ? ` · day ${streak} 🔥` : ""}</div>
    <p style="font-size:13px;line-height:1.6;margin:8px 0 16px;color:#334155;">
      ${first}, your coach rebuilt today around what you actually did. Just these — nothing more to figure out:
    </p>
    ${
      p.note
        ? `<p style="font-size:14px;line-height:1.6;margin:0 0 14px;color:#0f172a;border-left:3px solid #f59e0b;padding-left:12px;font-style:italic;">"${p.note.replace(/</g, "&lt;")}"</p>`
        : ""
    }
    <div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:12px;padding:14px 16px;margin:0 0 18px;">
      <ol style="margin:0;padding-left:20px;">
        ${p.tasks.map((t) => `<li style="font-size:14px;line-height:1.8;color:#0f172a;">${t.replace(/</g, "&lt;")}</li>`).join("")}
      </ol>
    </div>
    <a href="https://shishya.in/coach"
       style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 24px;">
      Open my plan →
    </a>
    <p style="font-size:13px;color:#475569;margin:16px 0 0;line-height:1.6;">
      Do just these today and you're a day closer. That's the whole game — small, aimed, daily.
    </p>
    <p style="font-size:12px;color:#94a3b8;margin:14px 0 0;">— Shishya, your free personal coach</p>
  </div>
</body></html>`;

  return sendEmail({ to: p.to, subject, html, text, tag: "coach-morning", unsubUserId: p.userId });
}

/** Evening streak-rescue — sent ~8:30 PM IST ONLY to students whose
 *  live streak dies at midnight (studied yesterday, not yet today).
 *  Peak loss-aversion moment + the 9 PM-midnight study block is the
 *  platform's biggest usage window, so the timing meets them when
 *  they'd study anyway. Deliberately scarce: streak-holders only. */
export async function sendEveningRescueEmail(p: {
  to: string;
  userId?: string;
  name: string | null;
  examShort: string;
  streakCurrent: number;
  /** When false, closes with the coach invite — a student fighting to
   *  keep a streak alive is exactly who benefits from a real plan. */
  hasCoachPlan?: boolean;
  /** Live-test notice (Saturday eve: "tomorrow is Live Test Sunday"). */
  liveTest?: { text: string; html: string } | null;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const subject = `🔥 ${first}, your ${p.streakCurrent}-day streak ends at midnight`;
  const text = `${first},

Your ${p.streakCurrent}-day streak is still alive — but only until midnight. One Daily 5 (~3 minutes) on your weakest ${p.examShort} topic saves it.
${p.liveTest ? `\n${p.liveTest.text}\n` : ""}
Save it now: https://shishya.in/dashboard

Miss tonight and it resets to zero. Toppers aren't smarter — they just don't skip.
— Shishya
${
  p.hasCoachPlan === false
    ? `\nP.S. A streak is the habit; a plan is what converts the habit into a selection. Your free personal coach decides your 2-3 things every morning, never holds a missed day against you, and keeps aiming everything at your exam date — free: https://shishya.in/coach\n`
    : ""
}
(Reply to this email to stop these reminders.)`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:18px;">🔥 ${p.streakCurrent}-day streak — ends at midnight</div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0;">
      ${first}, you've shown up ${p.streakCurrent} days in a row. One <strong>3-minute Daily 5</strong> on your weakest
      <strong>${p.examShort}</strong> topic keeps the run alive. Miss tonight and it resets to zero.
    </p>
    <a href="https://shishya.in/dashboard"
       style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">
      Save my streak →
    </a>
    ${p.liveTest?.html ?? ""}
    <p style="font-size:12px;color:#64748b;margin:18px 0 0;">
      Toppers aren't smarter — they just don't skip. — Shishya
    </p>
    ${
      p.hasCoachPlan === false
        ? `<div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:10px;padding:12px 14px;margin:16px 0 0;">
      <p style="font-size:13px;font-weight:700;margin:0 0 4px;color:#0f172a;">The surest way to crack the job</p>
      <p style="font-size:12px;line-height:1.55;margin:0 0 8px;color:#334155;">A streak is the habit — a plan is what turns it into a selection. Your <strong style="color:#0f172a;">free personal coach</strong> decides your 2–3 things every morning, never holds a missed day against you, and keeps everything aimed at your exam date.</p>
      <a href="https://shishya.in/coach" style="font-size:12px;font-weight:600;color:#c2410c;text-decoration:none;">Set up my free coach (30s) →</a>
    </div>`
        : ""
    }
  </div>
</body></html>`;
  return sendEmail({ to: p.to, subject, html, text, tag: "evening-rescue", unsubUserId: p.userId });
}

/** Win-back — sent to users lapsed 7+ days (the band no other flow
 *  touches: Daily-5 needs 3-day recency, evening rescue needs a live
 *  streak). Loss-framed but NEVER guilt-framed: their preparation is
 *  saved, their mistakes are waiting to become marks, the door is
 *  open. Max 2 touches per user, 21 days apart (EmailTouch). */
export async function sendWinbackEmail(p: {
  to: string;
  userId?: string;
  name: string | null;
  examShort: string;
  /** Wrong answers sitting in their Mistake Notebook (0 = hide line). */
  mistakes: number;
  /** Days since last seen — used for honest, warm framing. */
  daysGone: number;
  /** If they have a live coach plan, days to their exam — the email then
   *  leads with "your coach already rebuilt your plan, N days left". */
  coachDaysLeft?: number;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const hasCoach = typeof p.coachDaysLeft === "number" && p.coachDaysLeft > 0;
  const subject = hasCoach
    ? `🧭 ${first}, your coach rebuilt your plan — ${p.coachDaysLeft} days to ${p.examShort}, still winnable`
    : p.mistakes > 0
      ? `📓 ${first}, ${p.mistakes} mistakes in your notebook are ready to become marks`
      : `🎯 ${first}, your ${p.examShort} preparation is saved right where you left it`;
  const coachLineHtml = hasCoach
    ? `<div style="border:1px solid #fcd34d;background:#fffbeb;border-radius:10px;padding:12px 14px;margin:0 0 14px;">
      <p style="font-size:13px;line-height:1.6;margin:0;color:#92400e;"><strong>Your coach already rebuilt your plan for the days you have left.</strong> ${p.coachDaysLeft} days to your ${p.examShort} exam — that's still enough if you start today. Open it and today's work is waiting: <a href="https://shishya.in/coach" style="color:#c2410c;font-weight:700;text-decoration:none;">shishya.in/coach</a></p>
    </div>`
    : "";

  const mistakeText =
    p.mistakes > 0
      ? `Your Mistake Notebook still holds ${p.mistakes} wrong answers from your mocks — each one you clear is a mark you won't lose in the real exam. Re-testing them takes minutes: https://shishya.in/revision`
      : `Your practice history and weak-area map are saved exactly as you left them — pick any mock and the platform remembers where you were.`;

  const text = `${first},

It's been about ${p.daysGone} days — no lecture, exams don't care about gaps, and neither do we. What matters: everything you built here is still yours.

${mistakeText}

Since you were last here, Shishya also added:
• A free Personal Coach — a day-by-day plan to your ${p.examShort} date, rebuilt every morning: https://shishya.in/coach
• All-India Live Tests every Sunday with real ranks: https://shishya.in/live-test
• Ask Shishya — any govt-job question, any language: https://shishya.in/ask

Continue where you left off: https://shishya.in/dashboard

One good session is all it takes to be back in rhythm. See you inside.
— Shishya (100% free, always)

(Reply to this email to stop these check-ins.)`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:18px;">${p.mistakes > 0 ? `📓 ${p.mistakes} mistakes, waiting to become marks` : `🎯 Your ${p.examShort} prep is saved`}</div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0;">
      ${first}, it's been about ${p.daysGone} days — no lecture. Exams don't care about gaps, and neither do we.
      What matters: <strong>everything you built here is still yours.</strong>
    </p>
    ${coachLineHtml}
    <p style="font-size:13px;line-height:1.6;margin:0 0 14px;color:#334155;">
      ${
        p.mistakes > 0
          ? `Your Mistake Notebook holds <strong>${p.mistakes} wrong answers</strong> from your mocks — each one you clear is a mark you won't lose in the real exam.`
          : `Your practice history and weak-area map are exactly as you left them — pick any mock and the platform remembers where you were.`
      }
    </p>
    <a href="${p.mistakes > 0 ? "https://shishya.in/revision" : "https://shishya.in/dashboard"}"
       style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">
      ${p.mistakes > 0 ? "Clear my mistakes →" : "Continue where I left off →"}
    </a>
    <div style="border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:12px 14px;margin:16px 0 0;">
      <p style="font-size:12px;font-weight:700;margin:0 0 6px;color:#0f172a;">New since you were last here</p>
      <p style="font-size:12px;line-height:1.7;margin:0;color:#334155;">
        🧭 <a href="https://shishya.in/coach" style="color:#c2410c;font-weight:600;text-decoration:none;">Personal Coach</a> — day-by-day plan to your ${p.examShort} date, rebuilt every morning<br/>
        🏆 <a href="https://shishya.in/live-test" style="color:#c2410c;font-weight:600;text-decoration:none;">All-India Live Tests</a> — every Sunday, real ranks<br/>
        ✨ <a href="https://shishya.in/ask" style="color:#c2410c;font-weight:600;text-decoration:none;">Ask Shishya</a> — any govt-job question, any language
      </p>
    </div>
    <p style="font-size:12px;color:#64748b;margin:18px 0 0;">
      One good session and you're back in rhythm. — Shishya, 100% free always
    </p>
  </div>
</body></html>`;
  return sendEmail({ to: p.to, subject, html, text, tag: "winback", unsubUserId: p.userId });
}

/** Convenience wrappers — caller doesn't have to think about
 *  templating, just hands us a user. */
export async function sendWelcomeEmail(user: {
  email: string;
  name?: string | null;
}): Promise<boolean> {
  const firstName = pickFirstName(user.name, user.email);
  const { subject, html, text } = renderWelcomeEmail({
    firstName,
    ctaUrl: "https://shishya.in/dashboard",
  });
  return sendEmail({ to: user.email, subject, html, text, tag: "welcome" });
}

export async function sendDay3NudgeEmail(user: {
  id?: string;
  email: string;
  name?: string | null;
  daysSinceSignup: number;
}): Promise<boolean> {
  const firstName = pickFirstName(user.name, user.email);
  const { subject, html, text } = renderDay3NudgeEmail({
    firstName,
    ctaUrl: "https://shishya.in/dashboard",
    daysSinceSignup: user.daysSinceSignup,
  });
  return sendEmail({ to: user.email, subject, html, text, tag: "day3-nudge", unsubUserId: user.id });
}

/** "Aarav Sharma" → "Aarav", "riya.kumar2003@gmail.com" → "Riya".
 *  Capitalises the first letter so the greeting reads cleanly. */
function pickFirstName(name: string | null | undefined, email: string): string {
  const raw = (name?.trim().split(/\s+/)[0] ?? email.split("@")[0].split(/[._-]/)[0])
    .replace(/[0-9]+/g, "")
    .trim();
  if (!raw) return "there";
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

/** Sunday-morning All-India Live Test reminder — sent ONLY to students
 *  who asked for it during the week from the announcement banner. The
 *  ritual's alarm clock: papers are open 6 AM–11 PM, rank on submit. */
export async function sendLiveTestReminderEmail(p: {
  to: string;
  exams: string[];
  count: number;
}): Promise<boolean> {
  const names = p.exams.slice(0, 5).join(", ") + (p.exams.length > 5 ? ` +${p.exams.length - 5} more` : "");
  const subject = `🏆 Today: ${p.count} All-India Live Test${p.count > 1 ? "s" : ""} — you asked us to remind you`;
  const text = `The test hall is open.

You registered for today's All-India Live Tests: ${names}.

Free, and you see your All-India rank the moment you submit. Open now, closes 11 PM tonight.

Enter the test hall: https://shishya.in/live-test

One paper today tells you exactly where you stand against aspirants across India. Good luck!
— Shishya

(You asked for this reminder on shishya.in. Reply to stop.)`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:18px;">🏆 The test hall is open</div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0;">
      You asked us to remind you — today&apos;s <strong>All-India Live Test${p.count > 1 ? "s" : ""}</strong>:
      ${names}.
    </p>
    <p style="font-size:13px;line-height:1.6;margin:0 0 14px;color:#334155;">
      Free, and your <strong>All-India rank</strong> appears the moment you submit.
      Open now &middot; closes 11 PM tonight.
    </p>
    <a href="https://shishya.in/live-test"
       style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">
      Enter the test hall →
    </a>
    <p style="font-size:12px;color:#64748b;margin:18px 0 0;">
      One paper today tells you exactly where you stand against aspirants across India. — Shishya
    </p>
    <p style="font-size:11px;color:#94a3b8;margin:10px 0 0;">You asked for this reminder on shishya.in. Reply to stop.</p>
  </div>
</body></html>`;
  return sendEmail({ to: p.to, subject, html, text, tag: "live-test-reminder" });
}

/** Personalised All-India Live Test invite — sent midweek to students
 *  who have ALREADY engaged with that exam (enrolled, practised, or
 *  planned it). Not a broadcast: it names their exam, their date, and
 *  the one thing a shared paper gives that solo practice cannot —
 *  where they stand among aspirants sitting the same exam. */
export async function sendLiveTestInviteEmail(p: {
  to: string;
  userId?: string;
  name: string | null;
  examShort: string;
  /** Days until the real exam, when known — makes the urgency honest. */
  daysToExam?: number | null;
  sundayLabel: string;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const subject = `🏆 ${first}, your ${p.examShort} All-India Live Test is on ${p.sundayLabel}`;
  const urgency =
    p.daysToExam && p.daysToExam > 0
      ? `Your ${p.examShort} exam is about ${p.daysToExam} days away — this is the rehearsal that counts.`
      : `A full paper under real timing, before the real day.`;

  const text = `${first},

You've been preparing for ${p.examShort} on Shishya — so this is for you.

🏆 All-India Live Test — ${p.examShort} — ${p.sundayLabel}, 6 AM to 11 PM.
${urgency}

Why a shared paper beats a solo mock:
• Your All-India rank the moment you submit — where you actually stand among aspirants writing the same exam
• A section-wise strength and weakness map from one sitting
• Real exam timing, real pressure, zero cost

Register (or just show up): https://shishya.in/live-test

Whatever your score, you'll know exactly what to fix in the days that matter most.
— Shishya (free, always)

(Reply to stop these.)`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:18px;">🏆 Your ${p.examShort} All-India Live Test — ${p.sundayLabel}</div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0;">
      ${first}, you&apos;ve been preparing for <strong>${p.examShort}</strong> on Shishya — so this one is for you.
      ${urgency}
    </p>
    <div style="border:1px solid #fed7aa;background:#fff;border-radius:10px;padding:12px 14px;margin:0 0 16px;">
      <p style="font-size:12px;font-weight:700;margin:0 0 6px;color:#0f172a;">Why a shared paper beats a solo mock</p>
      <p style="font-size:12px;line-height:1.7;margin:0;color:#334155;">
        🥇 Your <strong>All-India rank</strong> the moment you submit — where you actually stand<br/>
        🎯 A section-wise <strong>strength &amp; weakness map</strong> from one sitting<br/>
        ⏱️ Real exam timing, real pressure, zero cost
      </p>
    </div>
    <a href="https://shishya.in/live-test"
       style="display:inline-block;background:#dc2626;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">
      See ${p.sundayLabel}&apos;s papers →
    </a>
    <p style="font-size:12px;color:#64748b;margin:18px 0 0;">
      Whatever your score, you&apos;ll know exactly what to fix in the days that matter most. — Shishya
    </p>
  </div>
</body></html>`;
  return sendEmail({ to: p.to, subject, html, text, tag: "live-test-invite", unsubUserId: p.userId });
}

/** Exam-eve wishes — the evening before a student's registered exam.
 *  Founder call (6 Aug 2026): "say all the best just before the exam
 *  and send a motivational quote that encourages them whatever be the
 *  outcome." Deliberately contains NO new study advice (nothing that
 *  could rattle someone the night before) — only calm, a practical
 *  checklist, and encouragement that survives either result. */
export async function sendExamEveEmail(p: {
  to: string;
  userId?: string;
  name: string | null;
  examShort: string;
  quote: { text: string; author?: string | null };
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const subject = `🌟 All the best for your ${p.examShort} tomorrow, ${first}`;
  const attribution = p.quote.author ? ` — ${p.quote.author}` : "";

  const text = `${first},

Tomorrow is your ${p.examShort} exam. All the best. 🌟

You've put in the work — on Shishya and outside it. Tonight is not for new topics. It's for sleep, a calm mind, and trusting what you already know.

Before you sleep, just check:
• Admit card printed + a photo ID
• Exam centre location and how long it takes to reach
• Reach early — rushing costs more marks than any topic
• Sleep. A rested brain scores higher than a tired one that revised one extra chapter.

"${p.quote.text}"${attribution}

And whatever tomorrow's paper brings: one exam does not measure you. Selection lists change every year; the discipline you built doesn't. If it goes well, we'll celebrate. If it doesn't, Shishya is here the next morning with your weak areas mapped and the next attempt planned — free, always.

Go show up. We're rooting for you.
— Shishya

(You're getting this because you're preparing for ${p.examShort} on shishya.in. Reply to stop.)`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:19px;">🌟 All the best for your ${p.examShort} tomorrow</div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0;">
      ${first}, you&apos;ve put in the work — on Shishya and outside it. Tonight isn&apos;t for new
      topics. It&apos;s for sleep, a calm mind, and trusting what you already know.
    </p>
    <div style="border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:12px 14px;margin:0 0 16px;">
      <p style="font-size:12px;font-weight:700;margin:0 0 6px;color:#0f172a;">Before you sleep</p>
      <p style="font-size:12px;line-height:1.8;margin:0;color:#334155;">
        📄 Admit card printed + photo ID<br/>
        📍 Centre location &amp; travel time checked<br/>
        ⏰ Reach early — rushing costs more marks than any topic<br/>
        😴 Sleep. A rested brain scores higher than a tired one that revised one more chapter.
      </p>
    </div>
    <blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #f59e0b;background:#fffbeb;font-size:14px;line-height:1.6;font-style:italic;color:#0f172a;">
      &ldquo;${p.quote.text}&rdquo;${p.quote.author ? `<span style="display:block;margin-top:6px;font-style:normal;font-size:12px;color:#92400e;">— ${p.quote.author}</span>` : ""}
    </blockquote>
    <p style="font-size:13px;line-height:1.65;margin:0 0 14px;color:#334155;">
      And whatever tomorrow&apos;s paper brings: <strong>one exam does not measure you.</strong>
      Selection lists change every year; the discipline you built doesn&apos;t. If it goes well,
      we&apos;ll celebrate. If it doesn&apos;t, Shishya is here the next morning with your weak
      areas mapped and the next attempt planned — free, always.
    </p>
    <p style="font-size:14px;font-weight:600;margin:0;color:#0f172a;">Go show up. We&apos;re rooting for you. 💪</p>
    <p style="font-size:12px;color:#64748b;margin:16px 0 0;">— Shishya</p>
  </div>
</body></html>`;
  return sendEmail({ to: p.to, subject, html, text, tag: "exam-eve", unsubUserId: p.userId });
}
