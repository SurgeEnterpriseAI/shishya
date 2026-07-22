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

const apiKey = process.env.RESEND_API_KEY;
const from = process.env.EMAIL_FROM ?? "Shishya <tutor@shishya.in>";

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
  try {
    const res = await c.emails.send({
      from,
      to: payload.to,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
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
• Adaptive mocks that get smarter as you answer
• Real previous-year papers, organised by year + topic
• Ask Shishya — AI tutor that knows your syllabus + your mistakes
• Free, in your language

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
      <li>Adaptive mocks that get smarter with every answer</li>
      <li>Real previous-year papers, organised by year + topic</li>
      <li>Ask Shishya — AI tutor that knows your syllabus + your mistakes</li>
      <li>Free, in your language</li>
    </ul>
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
    <p style="font-size:13px;line-height:1.55;margin:24px 0;color:#475569;">After the diagnostic, Shishya will tell you the 3 topics dragging your score down + recommend exactly which mock to take next. No more guessing.</p>
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
  name: string | null;
  examShort: string;
  /** Current streak (days). When ≥2, the email leads with loss-aversion
   *  — the single strongest reason-to-return we can put in a subject line. */
  streakCurrent?: number;
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

  const text = `${first},

Your Daily 5 is ready — 5 quick questions on your weakest ${p.examShort} topic. ${streakLineText}

Start now: https://shishya.in/dashboard

Small daily reps are how toppers are made. See you inside.
— Shishya

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
    <p style="font-size:12px;color:#64748b;margin:18px 0 0;">
      Small daily reps are how toppers are made. — Shishya
    </p>
    <p style="font-size:11px;color:#94a3b8;margin:10px 0 0;">Reply to this email to stop the daily reminder.</p>
  </div>
</body></html>`;
  return sendEmail({ to: p.to, subject, html, text, tag: "daily-five" });
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
  return sendEmail({ to: user.email, subject, html, text, tag: "day3-nudge" });
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
