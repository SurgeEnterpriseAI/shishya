// /login — minimal sign-in page (bilingual).

import Link from "next/link";
import { redirect } from "next/navigation";
import { headers, cookies } from "next/headers";
import { auth } from "@/lib/auth";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { getT } from "@/lib/i18n-server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const sp = await searchParams;
  const cb = sp.callbackUrl ?? "/dashboard";
  const { t } = await getT();

  // Attribution capture. Read the visitor's Referer header (where they
  // came FROM to land on /login) and any UTM params on the URL. Stash
  // both in a short-lived cookie that the dashboard reads on first
  // signed-in load and writes to the User row. No PII — just the source
  // URL so we can answer "where did this signup come from".
  try {
    const h = await headers();
    const referer = h.get("referer") ?? "";
    const utmSource = sp.utm_source ?? "";
    const utmMedium = sp.utm_medium ?? "";
    const utmCampaign = sp.utm_campaign ?? "";
    const haveSomething =
      Boolean(referer) || Boolean(utmSource) || Boolean(utmMedium) || Boolean(utmCampaign);
    if (haveSomething) {
      const payload = JSON.stringify({
        ref: referer,
        utm_source: utmSource,
        utm_medium: utmMedium,
        utm_campaign: utmCampaign,
      });
      const jar = await cookies();
      jar.set("shishya_attrib", payload, {
        path: "/",
        maxAge: 30 * 60, // 30 min — long enough to outlast the OAuth round-trip
        httpOnly: true,
        sameSite: "lax",
      });
    }
  } catch {
    /* attribution is best-effort; never let it break the login page */
  }

  return (
    <main className="min-h-screen bg-saffron-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-ink-200 bg-white p-8 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 text-lg font-bold text-white">
            शि
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-ink-900">{t("login.h1")}</h1>
        <p className="mt-2 text-sm text-ink-600">{t("login.body")}</p>
        <GoogleSignInButton callbackUrl={cb} label={t("login.continue")} />
        <p className="mt-6 text-xs text-ink-500">{t("login.smallprint")}</p>
      </div>
    </main>
  );
}
