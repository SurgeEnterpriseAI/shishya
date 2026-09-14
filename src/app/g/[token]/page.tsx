// /g/:token — a study group's invite page (14 Sep 2026).
//
// noindex and not in the sitemap; middleware records it as a share landing so
// a friend who signs up from it is attributed to the invite. A visitor who is
// not a member sees only the group's name, its member count and exactly what
// members see — the board itself lives on members' dashboards. Rules:
// src/lib/study-group.ts.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { getT } from "@/lib/i18n-server";
import { GROUP_MAX_MEMBERS, USER_MAX_GROUPS } from "@/lib/study-group";
import { findGroup, isMember } from "@/lib/study-group-db";
import { JoinGroupButton } from "./JoinGroupButton";

export const dynamic = "force-dynamic";

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const [group, { t }] = await Promise.all([findGroup(token).catch(() => null), getT()]);
  return {
    title: group ? `${fill(t("sg.join.title"), { name: group.name })} | Shishya` : "Shishya",
    robots: { index: false, follow: false },
  };
}

export default async function StudyGroupInvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const group = await findGroup(token).catch(() => null);
  if (!group) notFound();
  const [{ t }, session] = await Promise.all([getT(), auth().catch(() => null)]);
  const userId = session?.user?.id ?? null;
  const member = userId ? await isMember(group.id, userId).catch(() => false) : false;
  const full = group.members >= GROUP_MAX_MEMBERS;

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-12">
        <div className="mx-auto max-w-lg rounded-2xl border border-saffron-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">👥 {t("sg.card.title")}</p>
          <h1 className="mt-2 text-2xl font-bold text-ink-900">{fill(t("sg.join.title"), { name: group.name })}</h1>
          <p className="mt-1 text-sm text-ink-600">{fill(t("sg.join.members"), { n: group.members })}</p>
          <p className="mt-4 text-sm text-ink-700">{t("sg.card.intro")}</p>
          <p className="mt-3 rounded-lg bg-ink-50 px-3 py-2 text-xs text-ink-700">{t("sg.join.what")}</p>
          <div className="mt-5">
            {member ? (
              <>
                <p className="text-sm font-semibold text-emerald-700">{t("sg.join.already")}</p>
                <Link href="/dashboard#study-groups" className="mt-2 inline-block text-sm font-semibold text-saffron-700 hover:underline">
                  {t("sg.join.open")}
                </Link>
              </>
            ) : full ? (
              <p className="text-sm font-semibold text-ink-800">{fill(t("sg.join.full"), { max: GROUP_MAX_MEMBERS })}</p>
            ) : !userId ? (
              <Link href={`/login?callbackUrl=${encodeURIComponent(`/g/${group.token}`)}`} className="btn-primary inline-block !px-5 !py-2.5 text-sm">
                {t("sg.join.signin")}
              </Link>
            ) : (
              <JoinGroupButton
                token={group.token}
                labels={{
                  button: t("sg.join.button"),
                  joining: t("sg.join.joining"),
                  error: t("sg.join.error"),
                  full: fill(t("sg.join.full"), { max: GROUP_MAX_MEMBERS }),
                  limit: fill(t("sg.limit"), { max: USER_MAX_GROUPS }),
                }}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
