// /discussions/new — auth-gated; renders the compose form.

import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { ComposeForm } from "./ComposeForm";

export default async function NewDiscussionPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=%2Fdiscussions%2Fnew");
  const { t } = await getT();

  const exams = await prisma.exam.findMany({
    where: { active: true },
    select: { code: true, shortName: true },
    orderBy: { candidatesPerYear: "desc" },
  });

  return (
    <main className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-200/50 bg-white/80 backdrop-blur">
        <div className="container-prose flex h-16 items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-saffron-500 text-lg font-bold text-white">
              शि
            </span>
            <span className="text-lg font-semibold tracking-tight text-ink-900">Shishya</span>
          </Link>
          <Link href="/discussions" className="text-sm text-ink-700 hover:text-ink-900">← Back</Link>
        </div>
      </header>

      <section className="container-prose py-8 sm:py-12">
        <h1 className="text-2xl font-bold text-ink-900 sm:text-3xl">{t("disc.startNew")}</h1>
        <p className="mt-1 text-sm text-ink-600">
          {t("disc.subtitle")}
        </p>

        <div className="mt-6">
          <ComposeForm
            exams={exams}
            labels={{
              titlePlaceholder: t("disc.compose.titlePlaceholder"),
              bodyPlaceholder: t("disc.compose.bodyPlaceholder"),
              examLabel: t("disc.compose.examLabel"),
              publish: t("disc.compose.publish"),
            }}
          />
        </div>
      </section>
    </main>
  );
}
