"use client";

// Client island for the branded /logout page. Calls signOut() from
// next-auth/react which clears the session cookie via POST + then
// navigates to callbackUrl=/ (home).

import { signOut } from "next-auth/react";
import { useState } from "react";
import Link from "next/link";

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
