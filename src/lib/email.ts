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
import { tk } from "./i18n";

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
  /** Informational only since 25 Aug 2026 (founder call: revert the
   *  inbox-budget hold — email scenarios back to the pre-22-Aug
   *  behaviour). The field is kept on senders so the classification is
   *  ready if the budget ever returns; sendEmail no longer holds
   *  anything based on it. Opt-out is still always enforced. */
  priority?: "routine" | "important";
  /** Email-keyed list mail (exam-tracker alerts, 23 Aug 2026) where the
   *  recipient may have NO account: supplies its own unsubscribe URLs so
   *  the send gets List-Unsubscribe headers + a footer and NO founder
   *  BCC, without the user-keyed opt-out/budget machinery (which needs a
   *  userId). When `unsubUserId` is ALSO set, that path wins. */
  bulk?: { unsubscribeUrl: string; unsubscribeApiUrl: string };
}

/** One founder copy per marketing tag per invocation (a cron run is one
 *  warm invocation, so this is "first email of each wave"). */
const founderCopySent = new Set<string>();

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
    // Inbox budget REVERTED 25 Aug 2026 (founder call: back to the
    // pre-22-Aug sending behaviour). The unified EmailTouch send log
    // below stays — it costs nothing and gives the send/return baseline
    // we never had. Per-kind duplicate guards live in the crons.
  }
  try {
    // Don't BCC the founder onto an email that IS already addressed to
    // them (growth report, teacher-request alerts) — avoids a duplicate.
    // Also no BCC on MARKETING mail (unsubUserId set): the BCC copy carried
    // that student's one-click List-Unsubscribe token, so a single founder
    // tap on Gmail's "Unsubscribe" would silently opt the student out
    // (review 22 Aug 2026) — and bulk nudges flooded the inbox anyway.
    const isList = !!payload.unsubUserId || !!payload.bulk;
    const bcc = isList
      ? []
      : founderBcc.filter((a) => a.toLowerCase() !== payload.to.toLowerCase());
    // Marketing mail gets the opt-out footer + RFC 8058 one-click headers.
    // A per-list (bulk) unsubscribe takes precedence over the global one:
    // "stop THESE alerts" must not be the "stop ALL Shishya email" switch.
    const html = payload.bulk
      ? payload.html +
        `<p style="font-size:11px;color:#94a3b8;margin:18px 0 0;font-family:system-ui,sans-serif;">You asked for these alerts on shishya.in. <a href="${payload.bulk.unsubscribeUrl}" style="color:#64748b;">Unsubscribe</a> any time.</p>`
      : payload.unsubUserId
        ? payload.html + unsubFooterHtml(payload.unsubUserId)
        : payload.html;
    // One-click header points at the POST API (state change on POST only);
    // the body footer links to the confirm PAGE (no state change on GET).
    const headers = payload.bulk
      ? {
          "List-Unsubscribe": `<${payload.bulk.unsubscribeApiUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        }
      : payload.unsubUserId
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
      // Resend rejects tag values with anything outside [A-Za-z0-9_-] —
      // a colon in a tag fails the WHOLE send (learned 1 Sep 2026 when
      // "demand-shipped:cluster" bounced 10/10). Sanitize defensively.
      tags: payload.tag ? [{ name: "kind", value: payload.tag.replace(/[^A-Za-z0-9_-]/g, "-") }] : undefined,
    });
    if ("error" in res && res.error) {
      console.error("[email] send rejected:", res.error);
      return false;
    }
    // FOUNDER COPY (26 Aug 2026): one copy of each marketing WAVE to the
    // founder — the first send of each tag in this invocation. Replaces
    // the old per-recipient BCC (removed 22 Aug: the BCC copy carried the
    // student's one-click unsubscribe token — one founder tap on Gmail's
    // "Unsubscribe" would silently opt the student out — and 90+ copies
    // per morning buried the inbox). The copy goes out transactionally
    // (no token, no footer) with the ORIGINAL body.
    if (payload.unsubUserId && payload.tag && !founderCopySent.has(payload.tag) && founderBcc.length > 0) {
      founderCopySent.add(payload.tag);
      for (const addr of founderBcc) {
        if (addr.toLowerCase() === payload.to.toLowerCase()) continue;
        void c.emails
          .send({
            from,
            to: addr,
            subject: `[wave: ${payload.tag}] ${payload.subject}`,
            html: payload.html,
            text: payload.text,
            tags: [{ name: "kind", value: "founder-copy" }],
          })
          .catch(() => {});
      }
    }
    // Unified send log for the inbox budget: every mail to a KNOWN user
    // leaves a row, so the next routine send in the window is held.
    // (Crons also write their own dedup tags; both coexist.)
    if (payload.unsubUserId) {
      try {
        const { prisma } = await import("./db/prisma");
        const { randomUUID } = await import("node:crypto");
        await prisma.$executeRaw`
          INSERT INTO "EmailTouch" (id, "userId", tag) VALUES (${randomUUID()}, ${payload.unsubUserId}, ${"sent:" + (payload.tag ?? "email")})`;
      } catch {
        /* logging must never fail a delivered send */
      }
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
• PYQ-pattern papers — questions modelled on each year's paper, organised by year + topic
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
      <li>PYQ-pattern papers — questions modelled on each year's paper, organised by year + topic</li>
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
// them they're shortlisted and who to contact for the next steps.
// Contact = Muvva (founder) since 23 Aug 2026 — all calls/requests route
// to 9160057000 (was Nikhil / 7624967999).
const SURGE_CONTACT = {
  name: "Muvva",
  phone: "9160057000",
  // WhatsApp deep-link (India country code).
  whatsapp: "https://wa.me/919160057000",
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
/** "Never name a finished exam" (Exam Week Mode wave 2, play 10): when a
 *  student's enrolled exam is over, the routine mails roll over to the next
 *  exam in their track — with its date AND tier word — or go generic. */
export interface MailRollover {
  /** The finished exam's short name. */
  done: string;
  /** Next exam in the student's track (7–60 days out); `when` already
   *  carries the tier word, e.g. "12 Oct (official)". Null = none known. */
  next: { code: string; short: string; when: string } | null;
}

function rolloverBlock(r: MailRollover | null | undefined): { text: string; html: string } {
  if (!r) return { text: "", html: "" };
  const text = r.next
    ? `✅ Your ${r.done} is done. Next exam in your track: ${r.next.short} on ${r.next.when} — https://shishya.in/exams/${r.next.code}`
    : `✅ Your ${r.done} is done. The exam calendar lists every upcoming exam with its source tier: https://shishya.in/exam-calendar`;
  const html = r.next
    ? `<div style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:12px 14px;margin:16px 0 0;">
      <p style="font-size:13px;line-height:1.6;margin:0;color:#14532d;">✅ Your <strong>${esc(r.done)}</strong> is done. Next exam in your track: <strong>${esc(r.next.short)}</strong> on ${esc(r.next.when)} — <a href="https://shishya.in/exams/${esc(r.next.code)}" style="color:#15803d;font-weight:600;text-decoration:none;">${esc(r.next.short)} hub →</a></p>
    </div>`
    : `<div style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:12px 14px;margin:16px 0 0;">
      <p style="font-size:13px;line-height:1.6;margin:0;color:#14532d;">✅ Your <strong>${esc(r.done)}</strong> is done. Every upcoming exam, with its source tier: <a href="https://shishya.in/exam-calendar" style="color:#15803d;font-weight:600;text-decoration:none;">exam calendar →</a></p>
    </div>`;
  return { text, html };
}

export async function sendDailyFiveEmail(p: {
  to: string;
  userId?: string;
  name: string | null;
  /** Exam the mail may name. Null = generic (the enrolled exam is over and
   *  no next exam in the track is known) — no exam name anywhere. */
  examShort: string | null;
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
  /** Exam-week line (phase week / eve) from examWeekMailLine(). */
  examWeek?: { text: string; html: string } | null;
  /** Set when the enrolled exam is over: "Your X is done. Next: Y on date (tier)". */
  rollover?: MailRollover | null;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const streak = p.streakCurrent ?? 0;
  const hasStreak = streak >= 2;
  const exam = p.examShort ? esc(p.examShort) : null;
  const roll = rolloverBlock(p.rollover);

  const subject = hasStreak
    ? `🔥 ${first}, don't break your ${streak}-day streak`
    : exam
      ? `☀️ ${first}, your Daily 5 for ${p.examShort} is ready`
      : `☀️ ${first}, your Daily 5 is ready`;

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
  const weakText = p.examShort ? `your weakest ${p.examShort} topic` : "your weakest topic";
  const weakHtml = exam ? `your weakest <strong>${exam}</strong> topic` : "your weakest topic";
  const coachTarget = p.examShort ? `your ${p.examShort} exam` : "your exam date";

  const text = `${first},

Your Daily 5 is ready — 5 quick questions on ${weakText}. ${streakLineText}
${peerText}${p.examWeek ? `\n${p.examWeek.text}\n` : ""}${roll.text ? `\n${roll.text}\n` : ""}${p.liveTest ? `\n${p.liveTest.text}\n` : ""}

Start now: https://shishya.in/today?utm_source=email&utm_medium=daily-five

Small daily reps are how toppers are made. See you inside.
— Shishya
${
  p.hasCoachPlan === false
    ? `\nP.S. Five questions keep the habit alive — but a plan is what actually cracks the job. Your free personal coach maps every day from here to ${coachTarget}, and rebuilds it each morning around what you actually did. It's the most useful thing on Shishya and it costs nothing: https://shishya.in/coach\n`
    : ""
}
(Reply to this email to stop the daily reminder.)`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:18px;">${hasStreak ? `🔥 Keep your ${streak}-day streak alive` : "☀️ Your Daily 5 is ready"}</div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0;">
      ${esc(first)}, 5 quick questions on ${weakHtml} are waiting.
      ${streakLineHtml}
    </p>
    <a href="https://shishya.in/today?utm_source=email&utm_medium=daily-five"
       style="display:inline-block;background:#f59e0b;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">
      Start today's 5 →
    </a>
    ${peerHtml}
    ${p.examWeek?.html ?? ""}
    ${roll.html}
    ${p.liveTest?.html ?? ""}
    <p style="font-size:12px;color:#64748b;margin:18px 0 0;">
      Small daily reps are how toppers are made. — Shishya
    </p>
    ${
      p.hasCoachPlan === false
        ? `<div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:10px;padding:12px 14px;margin:16px 0 0;">
      <p style="font-size:13px;font-weight:700;margin:0 0 4px;color:#0f172a;">The surest way to crack the job</p>
      <p style="font-size:12px;line-height:1.55;margin:0 0 8px;color:#334155;">Five questions keep the habit alive — a plan is what gets you selected. Your <strong style="color:#0f172a;">free personal coach</strong> maps every day from here to ${esc(coachTarget)} and rebuilds it each morning around what you actually did.</p>
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
  /** Exam the mail may name; null = generic (plan's exam is over, no next known). */
  examShort: string | null;
  /** Days to the named exam; null when there is no date to count to. On a
   *  rollover this counts to the NEXT exam's tracker date (its tier word is
   *  in `rollover.next.when`), not to the finished plan's date. */
  daysLeft: number | null;
  tasks: string[];
  note: string | null;
  streakCurrent?: number;
  /** Exam-week line (phase week / eve) from examWeekMailLine(). */
  examWeek?: { text: string; html: string } | null;
  /** Set when the plan's exam is over: rolls the mail to the next exam in
   *  the track and offers "Set up my next plan". */
  rollover?: MailRollover | null;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const dl = p.daysLeft == null ? null : `${p.daysLeft} ${p.daysLeft === 1 ? "day" : "days"}`;
  const streak = p.streakCurrent ?? 0;
  const exam = p.examShort ? esc(p.examShort) : null;
  const roll = rolloverBlock(p.rollover);
  const subject =
    p.examShort && dl
      ? streak >= 3
        ? `📋 ${first}, day ${streak} — today's plan (${dl} to ${p.examShort})`
        : `📋 ${first}, your ${p.examShort} plan for today — ${dl} left`
      : streak >= 3
        ? `📋 ${first}, day ${streak} — today's plan`
        : `📋 ${first}, your plan for today`;
  const headingHtml = exam && dl ? `${dl} to your ${exam} exam` : "Your plan for today";
  const withText = p.examShort && dl ? `, with ${dl} to your ${p.examShort} exam` : "";
  const nextPlanText = p.rollover
    ? `\n${tk("ew.coach.postexam.title").replace("{exam}", p.rollover.done)} ${tk("ew.coach.postexam.body")} ${tk("ew.coach.postexam.cta")}: https://shishya.in/coach\n`
    : "";
  const nextPlanHtml = p.rollover
    ? `<div style="border:1px solid #fed7aa;background:#fff7ed;border-radius:10px;padding:12px 14px;margin:12px 0 0;">
      <p style="font-size:13px;font-weight:700;margin:0 0 4px;color:#0f172a;">${esc(tk("ew.coach.postexam.title").replace("{exam}", p.rollover.done))}</p>
      <p style="font-size:12px;line-height:1.55;margin:0 0 8px;color:#334155;">${esc(tk("ew.coach.postexam.body"))}</p>
      <a href="https://shishya.in/coach" style="font-size:12px;font-weight:600;color:#c2410c;text-decoration:none;">${esc(tk("ew.coach.postexam.cta"))} →</a>
    </div>`
    : "";

  const taskLines = p.tasks.map((t) => `  • ${t}`).join("\n");
  const text = `${first},

Your coach rebuilt your plan around what you did — here's today${withText}:

${taskLines}
${p.note ? `\n${p.note}\n` : ""}${p.examWeek ? `\n${p.examWeek.text}\n` : ""}${roll.text ? `\n${roll.text}\n` : ""}${nextPlanText}
Do just these today and you're a day closer. Open your plan: https://shishya.in/coach

Your report (strong & weak areas, days left): https://shishya.in/me/report
Today's study pack, built from your weakest topics: https://shishya.in/me/report/pack

— Shishya (your free personal coach)

(Reply to stop, or unsubscribe below.)`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <p style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#c2410c;margin:0 0 4px;">Your plan for today</p>
    <div style="font-weight:700;font-size:20px;margin:0 0 4px;">${headingHtml}${streak >= 3 ? ` · day ${streak} 🔥` : ""}</div>
    <p style="font-size:13px;line-height:1.6;margin:8px 0 16px;color:#334155;">
      ${esc(first)}, your coach rebuilt today around what you actually did. Just these — nothing more to figure out:
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
    ${p.examWeek?.html ?? ""}
    ${roll.html}
    ${nextPlanHtml}
    <p style="font-size:13px;color:#475569;margin:16px 0 0;line-height:1.6;">
      Do just these today and you're a day closer. That's the whole game — small, aimed, daily.
    </p>
    <p style="font-size:12px;color:#475569;margin:12px 0 0;line-height:1.6;">
      📊 <a href="https://shishya.in/me/report" style="color:#c2410c;font-weight:600;text-decoration:none;">Your report</a> (strong &amp; weak areas, days left) and
      📚 <a href="https://shishya.in/me/report/pack" style="color:#c2410c;font-weight:600;text-decoration:none;">today's study pack</a> — rebuilt from your own weakest topics, ready to save as PDF.
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
Save it now: https://shishya.in/today?utm_source=email&utm_medium=evening-rescue

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
    <a href="https://shishya.in/today?utm_source=email&utm_medium=evening-rescue"
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
  /** Exam the mail may name; null = generic (enrolled exam is over, no next known). */
  examShort: string | null;
  /** Wrong answers sitting in their Mistake Notebook (0 = hide line). */
  mistakes: number;
  /** Days since last seen — used for honest, warm framing. */
  daysGone: number;
  /** If they have a live coach plan, days to their exam — the email then
   *  leads with "your coach already rebuilt your plan, N days left". */
  coachDaysLeft?: number;
  /** Set when the enrolled exam is over: "Your X is done. Next: Y on date (tier)". */
  rollover?: MailRollover | null;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const hasCoach = typeof p.coachDaysLeft === "number" && p.coachDaysLeft > 0 && !!p.examShort;
  const exam = p.examShort ? esc(p.examShort) : null;
  const roll = rolloverBlock(p.rollover);
  const subject = hasCoach
    ? `🧭 ${first}, your coach rebuilt your plan — ${p.coachDaysLeft} days to ${p.examShort}, still winnable`
    : p.mistakes > 0
      ? `📓 ${first}, ${p.mistakes} mistakes in your notebook are ready to become marks`
      : p.rollover?.next
        ? `🎯 ${first}, your ${p.rollover.done} is done — ${p.rollover.next.short} is next, and your prep is saved`
        : p.examShort
          ? `🎯 ${first}, your ${p.examShort} preparation is saved right where you left it`
          : `🎯 ${first}, your preparation is saved right where you left it`;
  const coachLineHtml = hasCoach
    ? `<div style="border:1px solid #fcd34d;background:#fffbeb;border-radius:10px;padding:12px 14px;margin:0 0 14px;">
      <p style="font-size:13px;line-height:1.6;margin:0;color:#92400e;"><strong>Your coach already rebuilt your plan for the days you have left.</strong> ${p.coachDaysLeft} days to your ${exam} exam — that's still enough if you start today. Open it and today's work is waiting: <a href="https://shishya.in/coach" style="color:#c2410c;font-weight:700;text-decoration:none;">shishya.in/coach</a></p>
    </div>`
    : "";
  const coachTarget = p.examShort ? `your ${p.examShort} date` : "your exam date";

  const mistakeText =
    p.mistakes > 0
      ? `Your Mistake Notebook still holds ${p.mistakes} wrong answers from your mocks — each one you clear is a mark you won't lose in the real exam. Re-testing them takes minutes: https://shishya.in/revision`
      : `Your practice history and weak-area map are saved exactly as you left them — pick any mock and the platform remembers where you were.`;

  const text = `${first},

It's been about ${p.daysGone} days — no lecture, exams don't care about gaps, and neither do we. What matters: everything you built here is still yours.

${mistakeText}
${roll.text ? `\n${roll.text}\n` : ""}
Since you were last here, Shishya also added:
• A free Personal Coach — a day-by-day plan to ${coachTarget}, rebuilt every morning: https://shishya.in/coach
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
    <div style="font-weight:700;font-size:18px;">${p.mistakes > 0 ? `📓 ${p.mistakes} mistakes, waiting to become marks` : exam ? `🎯 Your ${exam} prep is saved` : "🎯 Your prep is saved"}</div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0;">
      ${esc(first)}, it's been about ${p.daysGone} days — no lecture. Exams don't care about gaps, and neither do we.
      What matters: <strong>everything you built here is still yours.</strong>
    </p>
    ${coachLineHtml}
    ${roll.html ? roll.html.replace("margin:16px 0 0;", "margin:0 0 14px;") : ""}
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
        🧭 <a href="https://shishya.in/coach" style="color:#c2410c;font-weight:600;text-decoration:none;">Personal Coach</a> — day-by-day plan to ${esc(coachTarget)}, rebuilt every morning<br/>
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
  // User-requested, time-bound ("remind me Sunday") — always important:
  // must never be held by the routine inbox budget.
  return sendEmail({ to: p.to, subject, html, text, tag: "live-test-reminder", priority: "important" });
}

/** Exam-tracker alert (23 Aug 2026) — sent by /api/cron/exam-alerts when
 *  something MATERIAL changed for an exam the subscriber follows
 *  (notification / admit card / exam date / answer key / result). One
 *  email per subscriber-exam per 7 days max. Email-keyed: anonymous
 *  subscribers get their own HMAC unsubscribe; known users also get the
 *  opt-out + "important" priority (they asked for it). */
/** "You asked — it's live" (1 Sep 2026): the demand closure loop.
 *  Sent to each signed-in student whose mined ask (tutor chat, PulseAsk
 *  note, teacher request, ideas post) a ship answers. Their OWN words
 *  are quoted back — that's the whole magic of the mail. Marketing-
 *  classed (unsubUserId): opt-out enforced, footer + one-click headers,
 *  founder gets one wave copy per cluster tag. */
export async function sendDemandShippedEmail(p: {
  to: string;
  userId: string;
  /** The student's own scrubbed words, quoted back. */
  askedQuote: string;
  /** Human date they said it, e.g. "28 Aug". */
  askedOn: string;
  /** What shipped, e.g. "Build-your-own topic mock". */
  title: string;
  /** 1-2 sentences: what it does, in plain words. */
  note: string;
  /** Personalised destination (already exam-resolved). */
  url: string;
  clusterKey: string;
}): Promise<boolean> {
  const subject = `You asked for it — it's live: ${p.title.slice(0, 70)}`;
  const text = `You told us what was missing, and we built it.

On ${p.askedOn} you wrote:
  "${p.askedQuote}"

It's live now — ${p.title}.
${p.note}

Go explore: ${p.url}

Everything on Shishya stays free. Keep telling us what you need — we read every word.
— Team Shishya`;
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#b45309;">You asked · we built</div>
    <div style="font-weight:700;font-size:20px;margin-top:6px;">${esc(p.title)} — live now</div>
    <div style="margin:16px 0 0;border-left:3px solid #f97316;background:#fffbeb;border-radius:0 10px 10px 0;padding:10px 14px;">
      <div style="font-size:11px;color:#92400e;text-transform:uppercase;letter-spacing:.03em;">Your words, ${esc(p.askedOn)}</div>
      <div style="font-size:14px;font-style:italic;color:#431407;margin-top:2px;">&ldquo;${esc(p.askedQuote)}&rdquo;</div>
    </div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0 0;color:#334155;">${esc(p.note)}</p>
    <a href="${esc(p.url)}" style="display:inline-block;margin-top:18px;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">Go explore it →</a>
    <p style="font-size:12px;line-height:1.6;margin:20px 0 0;color:#64748b;">Everything on Shishya stays free. Keep telling us what you need — we read every word, and when we build it, you&rsquo;ll hear from us like this.</p>
    <p style="font-size:12px;color:#94a3b8;margin:14px 0 0;">— Team Shishya</p>
  </div>
</body></html>`;
  return sendEmail({
    to: p.to,
    subject,
    html,
    text,
    tag: `demand-shipped-${p.clusterKey}`,
    unsubUserId: p.userId,
  });
}

export async function sendExamAlertEmail(p: {
  to: string;
  userId?: string | null;
  examCode: string;
  examShort: string;
  examName: string;
  /** 1–4 bullet lines describing what changed, already plain text.
   *  linkLabel: "official notice" ONLY for conducting-body URLs (gold
   *  source tier) — callers pass "source" for press/coaching citations. */
  changes: { title: string; detail?: string | null; url?: string | null; linkLabel?: string }[];
  /** Next key date, if known. */
  nextDate?: { label: string; date: string; official: boolean } | null;
  unsubscribeUrl: string;
  unsubscribeApiUrl: string;
}): Promise<boolean> {
  const tracker = `https://shishya.in/exams/${p.examCode}/updates`;
  const first = p.changes[0];
  const subject = `${p.examShort}: ${first ? first.title.slice(0, 80) : "update"}`;
  const nextLine = p.nextDate
    ? `Next key date: ${p.nextDate.label} — ${p.nextDate.date}${p.nextDate.official ? "" : " (expected, not yet announced)"}.`
    : "";
  const text = `${p.examName} — update you asked to be told about:

${p.changes.map((c) => `• ${c.title}${c.detail ? ` — ${c.detail}` : ""}${c.url ? `\n  ${c.url}` : ""}`).join("\n")}

${nextLine ? nextLine + "\n\n" : ""}Full tracker (every date, official vs expected, latest notices): ${tracker}
Practice while you wait — free ${p.examShort} mock: https://shishya.in/exams/${p.examCode}

Always confirm on the official website before acting.
— Shishya`;
  const rows = p.changes
    .map(
      (c) =>
        `<li style="margin:0 0 8px;"><strong>${esc(c.title)}</strong>${c.detail ? ` — ${esc(c.detail)}` : ""}${
          c.url ? ` <a href="${esc(c.url)}" style="color:#b45309;">${esc(c.linkLabel ?? "source")} ↗</a>` : ""
        }</li>`,
    )
    .join("");
  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#b45309;">${esc(p.examShort)} · exam tracker</div>
    <div style="font-weight:700;font-size:18px;margin-top:6px;">${esc(p.examName)} — what changed</div>
    <ul style="font-size:14px;line-height:1.6;margin:14px 0 0;padding-left:18px;">${rows}</ul>
    ${nextLine ? `<p style="font-size:13px;line-height:1.6;margin:14px 0 0;color:#334155;">${esc(nextLine)}</p>` : ""}
    <a href="${tracker}" style="display:inline-block;margin-top:16px;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">Open the full tracker →</a>
    <p style="font-size:13px;color:#334155;margin:16px 0 0;">Practice while you wait — <a href="https://shishya.in/exams/${esc(p.examCode)}" style="color:#b45309;">free ${esc(p.examShort)} mock</a>, instant score and weak areas.</p>
    <p style="font-size:12px;color:#64748b;margin:18px 0 0;">Always confirm on the official website before acting. — Shishya</p>
  </div>
</body></html>`;
  // The ExamAlert row IS the consent record (explicit per-exam opt-in with
  // its own unsubscribe), so this goes out on the bulk path only — it is
  // not gated by the global emailOptOut/inbox budget (review 23 Aug 2026:
  // a globally opted-out user who then asks for alerts would otherwise
  // subscribe successfully and silently never receive one).
  return sendEmail({
    to: p.to,
    subject,
    html,
    text,
    tag: "exam-alert",
    bulk: { unsubscribeUrl: p.unsubscribeUrl, unsubscribeApiUrl: p.unsubscribeApiUrl },
  });
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
  /** Cross-exam invite (Exam Week Mode wave 2, play 14): the student's own
   *  exam just finished; `examShort` is the NEXT same-track exam whose
   *  paper runs this Sunday. `when` carries the tier word ("12 Oct
   *  (official)"); null when the tracker has no upcoming date for it. */
  crossExam?: { done: string; when: string | null } | null;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const cross = p.crossExam ?? null;
  const subject = cross
    ? `🏆 ${first}, your ${cross.done} is done — ${p.examShort}'s All-India Live Test is on ${p.sundayLabel}`
    : `🏆 ${first}, your ${p.examShort} All-India Live Test is on ${p.sundayLabel}`;
  const urgency = cross
    ? cross.when
      ? `Your ${cross.done} is done. ${p.examShort} is on ${cross.when} — Sunday's shared paper, national rank, free.`
      : `Your ${cross.done} is done. ${p.examShort} is next in your track — Sunday's shared paper, national rank, free.`
    : p.daysToExam && p.daysToExam > 0
      ? `Your ${p.examShort} exam is about ${p.daysToExam} days away — this is the rehearsal that counts.`
      : `A full paper under real timing, before the real day.`;
  const opener = cross
    ? `You just sat ${cross.done} — the next exam in your track is ${p.examShort}, and its shared paper runs this Sunday.`
    : `You've been preparing for ${p.examShort} on Shishya — so this is for you.`;

  const text = `${first},

${opener}

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
    <div style="font-weight:700;font-size:18px;">🏆 ${cross ? `${esc(p.examShort)} All-India Live Test` : `Your ${esc(p.examShort)} All-India Live Test`} — ${esc(p.sundayLabel)}</div>
    <p style="font-size:14px;line-height:1.6;margin:14px 0;">
      ${esc(first)}, ${cross ? `you just sat <strong>${esc(cross.done)}</strong> — the next exam in your track is <strong>${esc(p.examShort)}</strong>, and its shared paper runs this Sunday.` : `you&apos;ve been preparing for <strong>${esc(p.examShort)}</strong> on Shishya — so this one is for you.`}
      ${esc(urgency)}
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
 *  checklist, and encouragement that survives either result.
 *
 *  Exam Week Mode (6 Sep 2026): the mail now carries the date WITH its
 *  tier word, the sourced checklist article (or the hub when there is
 *  none), the official admit-card row when the tracker has one, the
 *  tracker's next two dated rows, and the one promise the product does
 *  keep — "tomorrow evening we will ask you how the paper was". The old
 *  "Shishya is here the next morning with your weak areas mapped" line
 *  is gone: nothing sends that. */
export async function sendExamEveEmail(p: {
  to: string;
  userId?: string;
  name: string | null;
  examShort: string;
  examCode: string;
  /** Plain IST day, e.g. "12 Sep" — the template adds the tier word. */
  examDate: string;
  /** Tier word for examDate ("official" / "reported"), already localised. */
  tier: string;
  /** Last day of a multi-day / multi-shift window (null for single-day exams). */
  windowEnd?: { date: string; tier: string } | null;
  /** /exams/{code}/checklist only when a sourced CHECKLIST article exists, else the hub. */
  checklistUrl: string;
  checklistIsArticle: boolean;
  /** Official ADMIT_CARD row from the tracker, when it has one. `when`
   *  carries the tier word; `notes` = reporting instructions, when the row
   *  has them. With notes the line reads "Reporting: {notes}"; without them
   *  it describes the release date — "Admit card: {date (tier)}" — the
   *  same rule ExamWeekBlock applies (ew.eve.admit vs ew.eve.admitCard). */
  admitCard?: { label: string; when: string; url: string | null; notes?: string | null } | null;
  /** The tracker's next two dated rows after the exam; `when` carries the tier word. */
  nextDates: { label: string; when: string }[];
  quote: { text: string; author?: string | null };
  /** markingSchemeStatable(exam) — only then may the score-estimator link
   *  appear (11 Sep 2026); a calculator on a mixed-scheme paper hands the
   *  student a wrong number on exam night. Omitted = no link. */
  canEstimate?: boolean;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const subject = `🌟 All the best for your ${p.examShort} tomorrow, ${first}`;
  const attribution = p.quote.author ? ` — ${p.quote.author}` : "";
  const hub = `https://shishya.in/exams/${p.examCode}`;
  const tracker = `${hub}/updates`;
  // 11 Sep 2026: the three things the mail used to leave out — the poll
  // (one tap, no login, opens once the first shift is over), the calendar
  // file, and the estimator when the marking scheme can be stated.
  const utm = "utm_source=email&utm_medium=exam-eve";
  const pollUrl = `${hub}?${utm}`;
  const icsUrl = `${hub}/exam-week.ics`;
  const estimateUrl = p.canEstimate ? `${hub}/score-estimate?${utm}` : null;
  const dateLine = p.windowEnd
    ? fillVars(tk("ew.window.title"), {
        from: p.examDate,
        to: p.windowEnd.date,
        tier: p.windowEnd.tier === p.tier ? p.tier : `${p.tier} / ${p.windowEnd.tier}`,
      })
    : fillVars(tk("ew.eve.title"), { date: p.examDate, tier: p.tier });
  const admitNotes = p.admitCard?.notes?.trim() || null;
  const admitLine = p.admitCard
    ? admitNotes
      ? fillVars(tk("ew.eve.admit"), { text: admitNotes })
      : fillVars(tk("ew.eve.admitCard"), { text: p.admitCard.when })
    : "";
  const checklistLabel = p.checklistIsArticle ? `${tk("ew.week.checklist")} for ${p.examShort}` : `Your ${p.examShort} hub`;

  const text = `${first},

Tomorrow is your ${p.examShort} exam. All the best. 🌟
${dateLine}

You've put in the work — on Shishya and outside it. Tonight is not for new topics. It's for sleep, a calm mind, and trusting what you already know.

Before you sleep, just check:
• Admit card printed + a photo ID
• Exam centre location and how long it takes to reach
• Reach early — rushing costs more marks than any topic
• Sleep. A rested brain scores higher than a tired one that revised one extra chapter.
${admitLine ? `\n${admitLine}${p.admitCard?.url ? `\n  ${p.admitCard.url}` : ""}\n` : ""}
${checklistLabel}: ${p.checklistUrl}
${
  p.nextDates.length
    ? `\nAfter the exam, from the ${p.examShort} tracker:\n${p.nextDates.map((d) => `• ${d.label}: ${d.when}`).join("\n")}\nFull tracker: ${tracker}\n`
    : `\nFull tracker (every date, official vs expected): ${tracker}\n`
}
"${p.quote.text}"${attribution}

And whatever tomorrow's paper brings: one exam does not measure you. Selection lists change every year; the discipline you built doesn't. Once your shift is over the exam page will ask you how the paper was, and the next morning we will email you the same question — one tap, and once 10 or more students have rated it you will see how the paper felt to them.

After your shift, rate the paper in one tap — no login: ${pollUrl}
Add the exam day, answer key and result dates to your calendar (each with its source): ${icsUrl}
${estimateUrl ? `Estimate your score when the key is out: ${estimateUrl}\n` : ""}
Go show up. We're rooting for you.
— Shishya

(You're getting this because you're preparing for ${p.examShort} on shishya.in. Reply to stop, or unsubscribe below.)`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-weight:700;font-size:19px;">🌟 All the best for your ${esc(p.examShort)} tomorrow</div>
    <p style="font-size:13px;font-weight:600;margin:6px 0 0;color:#b45309;">${esc(dateLine)}</p>
    <p style="font-size:14px;line-height:1.6;margin:14px 0;">
      ${esc(first)}, you&apos;ve put in the work — on Shishya and outside it. Tonight isn&apos;t for new
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
      ${
        admitLine
          ? `<p style="font-size:12px;line-height:1.6;margin:8px 0 0;color:#0f172a;">🎫 ${esc(admitLine)}${
              p.admitCard?.url ? ` <a href="${esc(p.admitCard.url)}" style="color:#b45309;">official notice ↗</a>` : ""
            }</p>`
          : ""
      }
    </div>
    <a href="${esc(p.checklistUrl)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">${esc(checklistLabel)} →</a>
    ${
      p.nextDates.length
        ? `<div style="border:1px solid #fed7aa;background:#fff;border-radius:10px;padding:12px 14px;margin:16px 0 0;">
      <p style="font-size:12px;font-weight:700;margin:0 0 6px;color:#0f172a;">After the exam, from the ${esc(p.examShort)} tracker</p>
      <p style="font-size:12px;line-height:1.8;margin:0;color:#334155;">${p.nextDates.map((d) => `${esc(d.label)}: <strong>${esc(d.when)}</strong>`).join("<br/>")}</p>
      <p style="font-size:12px;margin:6px 0 0;"><a href="${tracker}" style="color:#b45309;">Full tracker →</a></p>
    </div>`
        : `<p style="font-size:12px;margin:14px 0 0;color:#334155;">Every date, official vs expected: <a href="${tracker}" style="color:#b45309;">${esc(p.examShort)} tracker →</a></p>`
    }
    <blockquote style="margin:16px 0;padding:12px 16px;border-left:3px solid #f59e0b;background:#fffbeb;font-size:14px;line-height:1.6;font-style:italic;color:#0f172a;">
      &ldquo;${esc(p.quote.text)}&rdquo;${p.quote.author ? `<span style="display:block;margin-top:6px;font-style:normal;font-size:12px;color:#92400e;">— ${esc(p.quote.author)}</span>` : ""}
    </blockquote>
    <p style="font-size:13px;line-height:1.65;margin:0 0 14px;color:#334155;">
      And whatever tomorrow&apos;s paper brings: <strong>one exam does not measure you.</strong>
      Selection lists change every year; the discipline you built doesn&apos;t.
      Once your shift is over the exam page will ask you how the paper was, and the next morning we will email you the same question — one tap, and once 10 or more
      students have rated it you will see how the paper felt to them.
    </p>
    <div style="border:1px solid #e2e8f0;background:#fff;border-radius:10px;padding:12px 14px;margin:0 0 16px;">
      <p style="font-size:12px;line-height:1.8;margin:0;color:#334155;">
        🗳️ <a href="${pollUrl}" style="color:#b45309;font-weight:600;">After your shift, rate the paper in one tap — no login →</a><br/>
        📅 <a href="${icsUrl}" style="color:#b45309;font-weight:600;">Add the exam day, answer key and result dates to your calendar →</a> <span style="color:#64748b;">(each with its source)</span>${
          estimateUrl ? `<br/>🧮 <a href="${estimateUrl}" style="color:#b45309;font-weight:600;">Estimate your score when the key is out →</a>` : ""
        }
      </p>
    </div>
    <p style="font-size:14px;font-weight:600;margin:0;color:#0f172a;">Go show up. We&apos;re rooting for you. 💪</p>
    <p style="font-size:12px;color:#64748b;margin:16px 0 0;">— Shishya</p>
  </div>
</body></html>`;
  // Exam eve is IMPORTANT — the night before their exam always gets through the inbox budget.
  return sendEmail({ to: p.to, subject, html, text, tag: "exam-eve", unsubUserId: p.userId, priority: "important" });
}

/** "How did the paper go?" — the morning after the exam day, to the
 *  students who got the exam-eve mail (Exam Week Mode, 6 Sep 2026).
 *  Three one-tap verdict links land on the exam hub, which preselects
 *  the chip and posts it. Then ONLY what the tracker holds: answer key /
 *  result with their tier word or "not announced yet", the cutoff page,
 *  and the next exam in the student's track. No prediction, no LLM. */
export async function sendExamDayAfterEmail(p: {
  to: string;
  userId: string;
  name: string | null;
  examShort: string;
  examCode: string;
  /** Yesterday's exam day WITH its tier word, e.g. "12 Sep (official)". */
  examDayLine: string;
  /** Last day of a still-running window, tier-worded; null once the window is over. */
  windowEndLine?: string | null;
  /** "Answer key: 20 Sep (expected)" / "Answer key: not announced yet" — built by statusLine(). */
  answerKeyLine: string;
  resultLine: string;
  /** Next exam in the same category + state, 7–60 days out: plain day + its tier word. */
  nextExam?: { code: string; short: string; date: string; tier: string } | null;
  /** Does the tracker hold an ANSWER_KEY row on/after the exam day? Decides
   *  whether the alert line promises the key or the result (11 Sep 2026). */
  answerKeyAnnounced?: boolean;
  /** markingSchemeStatable(exam) — only then the score-estimator link. */
  canEstimate?: boolean;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const hub = `https://shishya.in/exams/${p.examCode}`;
  const subject = `${first}, how did the ${p.examShort} paper go?`;
  const utm = "utm_source=email&utm_medium=exam-day-after";
  const verdictUrl = (v: "EASY" | "MODERATE" | "TOUGH") => `${hub}?verdict=${v}&${utm}`;
  // The tracker page carries the email-keyed alert box (ExamAlertBox):
  // one email when the official key / result lands, never a guessed date.
  const alertUrl = `${hub}/updates?${utm}`;
  const alertLine = p.answerKeyAnnounced
    ? "One email when the official result is out"
    : "Official answer key: not announced yet — one email when it is";
  const estimateUrl = p.canEstimate ? `${hub}/score-estimate?${utm}` : null;
  // First-person invite the student can forward as-is: the next exam in
  // their track, prepared together. No countdown, no urgency.
  const inviteUrl = p.nextExam ? `https://shishya.in/exams/${p.nextExam.code}?${utm}` : null;
  const inviteLine = p.nextExam
    ? `Prep for ${p.nextExam.short} together — forward this to a friend: "I'm preparing for ${p.nextExam.short} on Shishya, free. Join me: ${inviteUrl}"`
    : "";
  const chips: { key: "ew.verdict.easy" | "ew.verdict.moderate" | "ew.verdict.tough"; v: "EASY" | "MODERATE" | "TOUGH" }[] = [
    { key: "ew.verdict.easy", v: "EASY" },
    { key: "ew.verdict.moderate", v: "MODERATE" },
    { key: "ew.verdict.tough", v: "TOUGH" },
  ];
  const opener = p.windowEndLine
    ? `Your ${p.examShort} exam window opened yesterday, ${p.examDayLine}, and runs to ${p.windowEndLine}. ${tk("ew.window.tip")}`
    : `Yesterday was your ${p.examShort} exam: ${p.examDayLine}. ${tk("ew.today.pm")}`;
  const nextLine = p.nextExam ? fillVars(tk("ew.post.next"), { exam: p.nextExam.short, date: p.nextExam.date, tier: p.nextExam.tier }) : "";

  const text = `${first},

${opener} One tap:

${chips.map((c) => `${tk(c.key)}: ${verdictUrl(c.v)}`).join("\n")}

Your rating joins other students' — we show the split as counts once 10 or more have rated, never as a prediction.

What happens next, from the ${p.examShort} tracker:
• ${p.answerKeyLine}
• ${p.resultLine}
• ${alertLine}: ${alertUrl}
${estimateUrl ? `• Estimate your score when the key is out: ${estimateUrl}\n` : ""}• ${tk("ew.post.cutoff")}: ${hub}/cutoff
Full tracker: ${hub}/updates
${nextLine ? `\n${nextLine}: https://shishya.in/exams/${p.nextExam?.code}\n${inviteLine}\n` : ""}
Whatever the paper felt like, the next step is the same one — keep the routine going.
— Shishya (free, always)

(Reply to stop, or unsubscribe below.)`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#b45309;">${esc(p.examShort)} · exam week</div>
    <div style="font-weight:700;font-size:19px;margin-top:6px;">${esc(tk("ew.today.pm"))}</div>
    <p style="font-size:14px;line-height:1.6;margin:12px 0 14px;">${esc(first)}, ${esc(opener)} One tap:</p>
    <div style="margin:0 0 10px;">
      ${chips
        .map(
          (c) =>
            `<a href="${verdictUrl(c.v)}" style="display:inline-block;margin:0 8px 8px 0;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">${esc(tk(c.key))}</a>`,
        )
        .join("")}
    </div>
    <p style="font-size:12px;color:#64748b;margin:0 0 18px;line-height:1.6;">Your rating joins other students&apos; — we show the split as counts once 10 or more have rated, never as a prediction.</p>
    <div style="border:1px solid #fed7aa;background:#fff;border-radius:10px;padding:12px 14px;margin:0 0 16px;">
      <p style="font-size:12px;font-weight:700;margin:0 0 6px;color:#0f172a;">What happens next, from the ${esc(p.examShort)} tracker</p>
      <p style="font-size:13px;line-height:1.8;margin:0;color:#334155;">
        🔑 ${esc(p.answerKeyLine)}<br/>
        🏁 ${esc(p.resultLine)}<br/>
        🔔 <a href="${alertUrl}" style="color:#b45309;font-weight:600;">${esc(alertLine)} →</a><br/>${
          estimateUrl ? `\n        🧮 <a href="${estimateUrl}" style="color:#b45309;font-weight:600;">Estimate your score when the key is out →</a><br/>` : ""
        }
        🎯 <a href="${hub}/cutoff" style="color:#b45309;font-weight:600;">${esc(tk("ew.post.cutoff"))} →</a>
      </p>
      <p style="font-size:12px;margin:6px 0 0;"><a href="${hub}/updates" style="color:#b45309;">Full tracker →</a></p>
    </div>
    ${
      nextLine && p.nextExam
        ? `<p style="font-size:13px;line-height:1.6;margin:0 0 8px;color:#334155;">${esc(nextLine)} — <a href="https://shishya.in/exams/${esc(p.nextExam.code)}" style="color:#b45309;font-weight:600;">${esc(p.nextExam.short)} hub →</a></p>
    <p style="font-size:12px;line-height:1.6;margin:0 0 14px;color:#334155;">Prep for ${esc(p.nextExam.short)} together — forward this to a friend: <em>&ldquo;I&apos;m preparing for ${esc(p.nextExam.short)} on Shishya, free. Join me: <a href="${inviteUrl}" style="color:#b45309;">${esc(inviteUrl ?? "")}</a>&rdquo;</em></p>`
        : ""
    }
    <p style="font-size:13px;line-height:1.6;margin:0;color:#334155;">Whatever the paper felt like, the next step is the same one — keep the routine going.</p>
    <p style="font-size:12px;color:#64748b;margin:16px 0 0;">— Shishya, free always</p>
  </div>
</body></html>`;
  return sendEmail({ to: p.to, subject, html, text, tag: "exam-day-after", unsubUserId: p.userId });
}

/** Result-day mail (Exam Week Mode wave 2, play 13) — sent once per
 *  (student, exam, result day) when the tracker holds an OFFICIAL result
 *  row dated in the last two days.
 *
 *  HONESTY (fix 7 Sep 2026): a RESULT date row certifies the DATE the
 *  conducting body announced — it does NOT certify that the result is
 *  published, live, or that the student's own name is on a list. The mail
 *  therefore never says "the result is out"; it says what the tracker
 *  holds ("the official result date is 5 Sep (official)") and sends the
 *  student to the conducting body's own notice to see whether it is up.
 *
 *  Two honest paths, nothing else: cleared → the next stage exactly as the
 *  tracker has it (with tier word, or "not announced yet"); not this time
 *  → the next exam in the student's track with its date and tier word.
 *  Plus the conducting body's own notice, the cutoff page and the tracker.
 *  No score, no prediction, no LLM. Marketing tag → opt-out footer +
 *  one-click unsubscribe headers via sendEmail. */
export async function sendResultDayEmail(p: {
  to: string;
  userId: string;
  name: string | null;
  examShort: string;
  examCode: string;
  /** The result row's label + date WITH its tier word, e.g. "Tier 1 result — 5 Sep (official)". */
  resultLine: string;
  /** Just the result row's date + tier word, e.g. "5 Sep (official)" — the
   *  subject and heading print this, never a claim of publication. */
  resultWhen: string;
  /** The conducting body's notice (the result row's URL — official tier only). */
  officialUrl: string;
  /** Next stage for cleared candidates, as the tracker has it; null → "not announced yet". */
  nextStage: { label: string; when: string } | null;
  /** Next exam in the student's track (7–60 days out): plain IST day + its tier word. */
  nextExam: { code: string; short: string; date: string; tier: string } | null;
  /** Send-log tag = the cron's once-per-(user, exam, result day) guard,
   *  e.g. "result-day-SSC_CGL-20260905". sendEmail writes 'sent:'+tag, which
   *  is what the cron's NOT EXISTS check reads. Keyed on the result DAY so a
   *  Tier-2 / next-cycle result still reaches a student who got the last one. */
  guardTag: string;
}): Promise<boolean> {
  const first = (p.name ?? "").split(" ")[0] || "Aspirant";
  const hub = `https://shishya.in/exams/${p.examCode}`;
  const subject = `${first}, ${p.examShort} result day: ${p.resultWhen}`;
  const nextStageText = p.nextStage
    ? `Next stage: ${p.nextStage.label} — ${p.nextStage.when}`
    : `Next stage: ${tk("ew.post.notAnnounced")}`;
  const nextExamText = p.nextExam
    ? fillVars(tk("ew.post.next"), { exam: p.nextExam.short, date: p.nextExam.date, tier: p.nextExam.tier })
    : `Next exam in your track: ${tk("ew.post.notAnnounced")} — every upcoming exam with its tier: https://shishya.in/exam-calendar`;

  const text = `${first},

The tracker's ${p.examShort} result date: ${p.resultLine}.
That date is what the conducting body announced — it is not a promise the list is already on screen. Check the notice for your own name; nothing else counts: ${p.officialUrl}

If you cleared:
• ${nextStageText}
• Full tracker (every date with its source tier): ${hub}/updates

If not this time:
• ${nextExamText}${p.nextExam ? ` — https://shishya.in/exams/${p.nextExam.code}` : ""}
• Your practice history, weak-area map and mistake notebook carry over: https://shishya.in/dashboard

Either way: ${tk("ew.post.cutoff")} — ${hub}/cutoff (the official cutoff is in the notice above; ours is indicative).

One result does not measure you. Selection lists change every year; the routine you built does not.
— Shishya (free, always)

(You are getting this once per announced ${p.examShort} result date because you are enrolled in it on shishya.in. Unsubscribe below to stop all Shishya email.)`;

  const html = `<!doctype html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#fff7ed;font-family:system-ui,sans-serif;color:#0f172a;">
  <div style="max-width:520px;margin:0 auto;padding:28px 24px;">
    <div style="font-size:12px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#b45309;">${esc(p.examShort)} · result day</div>
    <div style="font-weight:700;font-size:19px;margin-top:6px;">${esc(p.examShort)} result day: ${esc(p.resultWhen)}</div>
    <p style="font-size:13px;font-weight:600;margin:6px 0 0;color:#b45309;">${esc(p.resultLine)}</p>
    <p style="font-size:14px;line-height:1.6;margin:12px 0 14px;">${esc(first)}, that is the date the conducting body announced — only its own notice says whether the list is up. Check your own name there; nothing else counts.</p>
    <a href="${esc(p.officialUrl)}" style="display:inline-block;background:#f97316;color:#fff;text-decoration:none;font-weight:700;font-size:14px;border-radius:10px;padding:12px 22px;">Official notice ↗</a>
    <div style="border:1px solid #bbf7d0;background:#f0fdf4;border-radius:10px;padding:12px 14px;margin:18px 0 0;">
      <p style="font-size:12px;font-weight:700;margin:0 0 6px;color:#14532d;">If you cleared</p>
      <p style="font-size:13px;line-height:1.8;margin:0;color:#334155;">
        🎯 ${esc(nextStageText)}<br/>
        📅 <a href="${hub}/updates" style="color:#15803d;font-weight:600;">Full tracker →</a> every date with its source tier
      </p>
    </div>
    <div style="border:1px solid #fed7aa;background:#fff;border-radius:10px;padding:12px 14px;margin:12px 0 0;">
      <p style="font-size:12px;font-weight:700;margin:0 0 6px;color:#0f172a;">If not this time</p>
      <p style="font-size:13px;line-height:1.8;margin:0;color:#334155;">
        ➡️ ${esc(nextExamText)}${p.nextExam ? ` — <a href="https://shishya.in/exams/${esc(p.nextExam.code)}" style="color:#b45309;font-weight:600;">${esc(p.nextExam.short)} hub →</a>` : ""}<br/>
        📓 Your practice history, weak-area map and mistake notebook carry over — <a href="https://shishya.in/dashboard" style="color:#b45309;font-weight:600;">dashboard →</a>
      </p>
    </div>
    <p style="font-size:12px;line-height:1.6;margin:14px 0 0;color:#334155;">Either way: <a href="${hub}/cutoff" style="color:#b45309;font-weight:600;">${esc(tk("ew.post.cutoff"))} →</a> — the official cutoff is in the notice above; ours is indicative.</p>
    <p style="font-size:13px;line-height:1.6;margin:14px 0 0;color:#334155;">One result does not measure you. Selection lists change every year; the routine you built does not.</p>
    <p style="font-size:12px;color:#64748b;margin:16px 0 0;">— Shishya, free always</p>
  </div>
</body></html>`;
  // The cron owns the guard tag (exam code + result DAY): sendEmail writes
  // 'sent:'+tag, which is exactly what its NOT EXISTS check reads.
  return sendEmail({ to: p.to, subject, html, text, tag: p.guardTag, unsubUserId: p.userId });
}

function fillVars(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
