// GET /api/ops/email-health — non-sensitive email deliverability check.
//
// Runs server-side in prod (where RESEND_API_KEY lives) and reports
// ONLY non-secret diagnostics: whether the key is present, the from-
// address (already visible in every email header), and each Resend
// sending domain's verification status. The API key itself is never
// returned. This lets us diagnose "why did no email send?" in one call
// without exposing anything sensitive. Cached 60s to avoid abuse.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Shishya <tutor@shishya.in>";
  const fromDomain = (from.match(/@([^>\s]+)/)?.[1] ?? "").toLowerCase();

  const out: Record<string, unknown> = {
    resendKeyPresent: Boolean(key),
    emailFrom: from,
    fromDomain,
    cronSecretPresent: Boolean(process.env.CRON_SECRET),
  };

  if (key) {
    try {
      const res = await fetch("https://api.resend.com/domains", {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      });
      out.resendDomainsHttp = res.status;
      if (res.ok) {
        const j = (await res.json()) as { data?: { name: string; status: string; region?: string }[] };
        out.resendDomains = (j.data ?? []).map((d) => ({ name: d.name, status: d.status, region: d.region }));
        const match = (j.data ?? []).find((d) => d.name.toLowerCase() === fromDomain);
        out.fromDomainStatus = match ? match.status : "NOT_FOUND_IN_RESEND";
      } else {
        out.resendError = (await res.text()).slice(0, 200);
      }
    } catch (err) {
      out.resendError = String((err as Error)?.message).slice(0, 200);
    }
  }

  return Response.json(out, { headers: { "cache-control": "public, s-maxage=60" } });
}
