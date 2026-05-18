// Notification bell — shown in the Header for signed-in users only.
// Server component that queries the unread count once per request.
//
// Clicking the bell routes to /me/notifications (which marks-all-read
// on load). This avoids needing a separate API call + client-side
// state for a feature that doesn't need real-time updates yet.

import Link from "next/link";
import { auth } from "@/lib/auth";
import { unreadCount } from "@/lib/db/notifications";

export async function NotificationBell() {
  const session = await auth();
  if (!session?.user?.id) return null;
  const count = await unreadCount(session.user.id).catch(() => 0);

  return (
    <Link
      href="/me/notifications"
      className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-ink-700 hover:bg-ink-100 hover:text-ink-900"
      aria-label={count > 0 ? `${count} unread notifications` : "Notifications"}
      title={count > 0 ? `${count} unread` : "Notifications"}
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        className="h-5 w-5"
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
        />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-saffron-500 px-1 text-[10px] font-semibold text-white tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
