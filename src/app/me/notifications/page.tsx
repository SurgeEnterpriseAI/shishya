// /me/notifications — full list of all notifications for the signed-in
// user. Reached via the bell dropdown or directly.
//
// Reads + marks-all-read on load (since the user has navigated here
// with intent to see them). That keeps the bell counter sane without
// requiring a separate "mark all read" action.

import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { auth } from "@/lib/auth";
import { listNotifications, markAllRead } from "@/lib/db/notifications";

export const metadata: Metadata = {
  title: "Your notifications — Shishya",
  description: "Updates about your verifications, credentials, and badge progress.",
  robots: { index: false, follow: false },
};

const TYPE_LABEL: Record<string, string> = {
  VERIFICATION_APPROVED: "Verification approved",
  VERIFICATION_REJECTED: "Verification rejected",
  VERIFICATION_CORRECTED: "Verification corrected",
  CREDENTIAL_VOUCHED:    "Vouch received",
  CREDENTIAL_VERIFIED:   "Credential verified",
  CREDENTIAL_REJECTED:   "Credential rejected",
  BADGE_PROMOTED:        "Badge promoted",
  FLAG_VALIDATED:        "Flag validated",
  SUGGESTION_ACCEPTED:   "Suggestion accepted",
  ADMIN_MESSAGE:         "From the team",
};

const TYPE_COLOR: Record<string, string> = {
  VERIFICATION_APPROVED: "border-emerald-300 bg-emerald-50 text-emerald-800",
  VERIFICATION_REJECTED: "border-rose-300 bg-rose-50 text-rose-800",
  VERIFICATION_CORRECTED: "border-amber-300 bg-amber-50 text-amber-800",
  CREDENTIAL_VOUCHED:    "border-saffron-300 bg-saffron-50 text-saffron-800",
  CREDENTIAL_VERIFIED:   "border-saffron-300 bg-saffron-100 text-saffron-900",
  CREDENTIAL_REJECTED:   "border-rose-300 bg-rose-50 text-rose-800",
  BADGE_PROMOTED:        "border-saffron-300 bg-saffron-100 text-saffron-900",
  FLAG_VALIDATED:        "border-emerald-300 bg-emerald-50 text-emerald-800",
  SUGGESTION_ACCEPTED:   "border-emerald-300 bg-emerald-50 text-emerald-800",
  ADMIN_MESSAGE:         "border-ink-300 bg-ink-50 text-ink-800",
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/me/notifications");
  const userId = session.user.id;

  const rows = await listNotifications(userId, 100);
  // Mark-all-read on page load — user has navigated here with intent.
  await markAllRead(userId).catch(() => undefined);

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> ·{" "}
          <Link href="/me" className="hover:text-ink-800">Your profile</Link> · Notifications
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink-900">Notifications</h1>
        <p className="mt-1 text-sm text-ink-600">
          {rows.length === 0
            ? "Nothing here yet. We'll surface updates here when your contributions resolve."
            : `${rows.length} notification${rows.length === 1 ? "" : "s"}, oldest 100 shown.`}
        </p>

        {rows.length > 0 && (
          <ul className="mt-6 divide-y divide-ink-100 overflow-hidden rounded-lg border border-ink-200 bg-white">
            {rows.map((n) => {
              const wasUnread = n.readAt === null;
              const label = TYPE_LABEL[n.type] ?? n.type;
              const color = TYPE_COLOR[n.type] ?? "border-ink-300 bg-ink-50 text-ink-800";
              return (
                <li key={n.id} className={`px-4 py-3 ${wasUnread ? "bg-saffron-50/30" : ""}`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="flex flex-wrap items-baseline gap-2">
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${color}`}>
                        {label}
                      </span>
                      {n.link ? (
                        <Link href={n.link} className="text-sm font-medium text-ink-900 hover:text-saffron-800">
                          {n.title}
                        </Link>
                      ) : (
                        <span className="text-sm font-medium text-ink-900">{n.title}</span>
                      )}
                    </p>
                    <span className="text-xs text-ink-500 tabular-nums">
                      {n.createdAt.toISOString().slice(0, 10)}
                    </span>
                  </div>
                  {n.body && <p className="mt-1 text-xs text-ink-600">{n.body}</p>}
                </li>
              );
            })}
          </ul>
        )}

        <div className="mt-8 rounded-lg border border-ink-200 bg-white p-5 text-xs text-ink-600">
          <p className="font-semibold text-ink-800">Email digest</p>
          <p className="mt-1">
            A weekly digest will land in your inbox once email
            infrastructure is connected. Until then, this page is the
            single source of truth for your notification history.
          </p>
        </div>
      </section>
    </main>
  );
}
