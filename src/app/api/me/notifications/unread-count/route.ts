// GET /api/me/notifications/unread-count
//
// Returns the unread notification count for the signed-in user. Used
// by the <NotificationBell /> client component in the header to render
// the badge without forcing the header into a server-component
// boundary (which would block edge caching of every page).
//
// 401 (not signed in) → { count: 0 } so the client doesn't have to
// special-case auth state — it just renders nothing for zero.

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { unreadCount } from "@/lib/db/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ count: 0 }, { status: 200 });
    }
    const count = await unreadCount(session.user.id).catch(() => 0);
    return NextResponse.json(
      { count },
      {
        status: 200,
        headers: {
          // No public caching — the count is per-user. Short stale
          // window for SWR-style refreshes from the bell component.
          "cache-control": "private, no-store",
        },
      },
    );
  } catch (err) {
    console.error("[api/me/notifications/unread-count] failed:", err);
    return NextResponse.json({ count: 0 }, { status: 200 });
  }
}
