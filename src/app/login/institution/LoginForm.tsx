"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InstitutionLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const formValid = email.includes("@") && password.length >= 1;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/institutions/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Login failed. Try again.");
        setSubmitting(false);
        return;
      }
      router.push("/i/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="text-sm font-medium text-ink-800">Email</span>
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-ink-800">Password</span>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </label>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!formValid || submitting}
        className="w-full rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:opacity-50"
      >
        {submitting ? "Signing in…" : "Log in →"}
      </button>
    </form>
  );
}
