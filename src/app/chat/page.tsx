// /chat?examCode=SSC_CGL — full-page AI tutor chat.
// Server component picks the exam (default first enrolled) and hands off to client.

import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getT } from "@/lib/i18n-server";
import { ChatInterface } from "./ChatInterface";

export default async function ChatPage({
  searchParams,
}: {
  searchParams: Promise<{ examCode?: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/chat");
  const sp = await searchParams;
  const { t } = await getT();

  const enrollments = await prisma.enrollment.findMany({
    where: { userId: session.user.id, active: true },
    include: { exam: { select: { code: true, shortName: true } } },
    orderBy: { createdAt: "desc" },
  });

  if (enrollments.length === 0) {
    return (
      <main className="min-h-screen bg-ink-50/40">
        <Header />
        <section className="container-prose py-16 text-center">
          <h1 className="text-xl font-semibold text-ink-900">{t("dash.no.enrollments")}</h1>
          <Link href="/dashboard" className="btn-primary mt-6 !py-2 !px-4 text-sm">
            {t("nav.dashboard")} →
          </Link>
        </section>
      </main>
    );
  }

  const examCode =
    sp.examCode && enrollments.find((e) => e.exam.code === sp.examCode)
      ? sp.examCode
      : enrollments[0].exam.code;

  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose flex flex-col py-6 sm:py-8" style={{ minHeight: "calc(100vh - 64px)" }}>
        <div className="flex items-baseline justify-between">
          <div>
            <p className="text-xs text-ink-500">
              <Link href="/dashboard" className="hover:text-ink-800">{t("nav.dashboard")}</Link> · {t("nav.tutor").replace(" →", "")}
            </p>
            <h1 className="mt-1 text-xl font-semibold text-ink-900">{t("chat.title")}</h1>
          </div>
          {enrollments.length > 1 && (
            <form className="text-sm" method="get">
              <label className="text-xs text-ink-500">{t("nav.exams")}:</label>
              <select
                name="examCode"
                defaultValue={examCode}
                className="ml-2 rounded-md border border-ink-300 bg-white px-2 py-1 text-sm"
                onChange={(e) => e.currentTarget.form?.submit()}
              >
                {enrollments.map((e) => (
                  <option key={e.exam.code} value={e.exam.code}>{e.exam.shortName}</option>
                ))}
              </select>
            </form>
          )}
        </div>

        <ChatInterface
          examCode={examCode}
          labels={{
            placeholder: t("chat.placeholder"),
            send: t("chat.send"),
            thinking: t("chat.thinking"),
            empty: t("chat.empty.body"),
            emptyExamPrefix: t("chat.empty.examPrefix"),
            suggested: t("chat.suggested"),
            starters: [t("chat.starter.1"), t("chat.starter.2"), t("chat.starter.3"), t("chat.starter.4")],
          }}
        />
      </section>
    </main>
  );
}
