"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export function GoogleSignInButton({
  callbackUrl,
  label,
}: {
  callbackUrl: string;
  label: string;
}) {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      disabled={loading}
      onClick={() => {
        setLoading(true);
        signIn("google", { callbackUrl });
      }}
      className="btn-primary mt-6 w-full disabled:opacity-60"
    >
      {loading ? "…" : label}
    </button>
  );
}
