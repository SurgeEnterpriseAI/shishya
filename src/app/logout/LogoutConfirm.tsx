"use client";

// Client island for the branded /logout page. Calls signOut() from
// next-auth/react which clears the session cookie via POST + then
// navigates to callbackUrl=/ (home).

import { signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";
import { clearSessionHint } from "@/lib/session-hint";
import { dropKeptGuestChat } from "@/lib/guest-chat-carry";

export function LogoutConfirm({
  labels,
}: {
  labels: { confirm: string; cancel: string; signingOut: string };
}) {
  const [pending, setPending] = useState(false);
  return (
    <div className="mt-6 flex flex-col gap-2 sm:flex-row">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setPending(true);
          // Backup to the server's signOut event (src/lib/auth.ts): drop the
          // signed-in hint now, so the next page's islands never probe.
          clearSessionHint();
          // 30 Sep 2026 (review): an imported guest chat stays in this
          // browser for up to 30 minutes so its chat page can restore it
          // (src/lib/guest-chat-carry.ts). Signing out ends that — the next
          // account on a shared phone must never see this conversation.
          dropKeptGuestChat();
          signOut({ callbackUrl: "/" });
        }}
        className="btn-primary flex-1 disabled:opacity-60"
      >
        {pending ? labels.signingOut : labels.confirm}
      </button>
      <Link href="/dashboard" className="btn-secondary flex-1 text-center">
        {labels.cancel}
      </Link>
    </div>
  );
}
