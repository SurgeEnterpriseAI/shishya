// /logout — branded signout confirmation page.
// Replaces NextAuth's default unstyled signout view (configured via
// authOptions.pages.signOut). Confirming runs signOut() on the client
// which POSTs to /api/auth/signout (CSRF-protected) and then redirects
// to "/" — the public landing page.

import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { LogoutConfirm } from "./LogoutConfirm";

export const dynamic = "force-dynamic";

export default async function LogoutPage() {
  const [session, { t }] = await Promise.all([auth(), getT()]);
  // If the user is already signed out, send them to home instead of
  // showing a confirm-signout page they can't act on.
  if (!session?.user) redirect("/");

  return (
    <main className="min-h-screen bg-saffron-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-ink-200 bg-white p-8 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 text-lg font-bold text-white">
            शि
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold text-ink-900">{t("logout.h1")}</h1>
        <p className="mt-2 text-sm text-ink-600">
          {t("logout.body")}{" "}
          <span className="font-medium text-ink-800">{session.user.email}</span>.
        </p>
        <LogoutConfirm
          labels={{
            confirm: t("logout.confirm"),
            cancel: t("logout.cancel"),
            signingOut: t("logout.signingOut"),
          }}
        />
        <p className="mt-6 text-xs text-ink-500">{t("logout.smallprint")}</p>
      </div>
    </main>
  );
}
