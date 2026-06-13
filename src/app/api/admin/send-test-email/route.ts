// GET /api/admin/send-test-email?to=<email>&kind=welcome|nudge
//
// One-shot verification endpoint for the Resend setup. Auth via Bearer
// ${CRON_SECRET} (same as the cron routes) so it can be triggered from
// the CLI to confirm real delivery once RESEND_API_KEY + EMAIL_FROM are
// set in Vercel and the shishya.in domain is verified in Resend.
//
//   curl -H "Authorization: Bearer $CRON_SECRET" \
//        "https://shishya.in/api/admin/send-test-email?to=you@gmail.com"
//
// Returns { ok, sent, from, hasKey } so the response itself tells you
// whether the API key is wired (hasKey) and whether Resend accepted the
// message (sent). If hasKey is false you're still in stub mode — set the
// env var in Vercel and redeploy.

import { sendWelcomeEmail, sendDay3NudgeEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return Response.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const to = url.searchParams.get("to");
  const kind = url.searchParams.get("kind") ?? "welcome";
  if (!to || !to.includes("@")) {
    return Response.json({ error: "pass ?to=<email>" }, { status: 400 });
  }

  const hasKey = Boolean(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM ?? "Shishya <tutor@shishya.in>";

  let sent = false;
  if (kind === "nudge") {
    sent = await sendDay3NudgeEmail({ email: to, name: null, daysSinceSignup: 3 });
  } else {
    sent = await sendWelcomeEmail({ email: to, name: null });
  }

  return Response.json({
    ok: true,
    kind,
    to,
    from,
    hasKey, // false → still in stub mode (RESEND_API_KEY not set in this env)
    sent, // true → Resend accepted the message for delivery
    hint: hasKey
      ? sent
        ? "Sent. Check the inbox (+ spam). If it's missing, verify the domain in Resend."
        : "Key present but send was rejected — check Resend logs (domain not verified, or EMAIL_FROM uses an unverified domain)."
      : "Stub mode: RESEND_API_KEY is not set in this environment. Set it in Vercel and redeploy.",
  });
}
