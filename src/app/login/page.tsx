// /login — minimal sign-in page (bilingual).

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");
  const sp = await searchParams;
  const cb = sp.callbackUrl ?? "/dashboard";
  const { t } = await getT();

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
        <a
          href={`/api/auth/signin/google?callbackUrl=${encodeURIComponent(cb)}`}
          className="btn-primary mt-6 w-full"
        >
          {t("login.continue")}
        </a>
        <p className="mt-6 text-xs text-ink-500">{t("login.smallprint")}</p>
      </div>
    </main>
  );
}
