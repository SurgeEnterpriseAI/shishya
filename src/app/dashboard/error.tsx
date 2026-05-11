"use client";

// Error boundary for /dashboard. Catches uncaught errors from the server
// component data fetch + render, logs the actual message + digest to the
// console (so it surfaces in Vercel runtime logs), and gives the student
// a clear retry path instead of the generic Next "Application error" page.

import { useEffect } from "react";
import Link from "next/link";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Logs the message + stack to the browser console AND (because this
    // mounts after the server-component throw) the digest from the server
    // side. Together with the digest, the server logs in Vercel now have a
    // matching client-side breadcrumb if the user reports the URL.
    console.error("[dashboard] render failed", {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    });
  }, [error]);

  return (
    <main className="min-h-screen bg-ink-50/40">
      <section className="container-prose py-16">
        <div className="mx-auto max-w-lg rounded-md border border-rose-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-rose-700">
            Dashboard couldn&apos;t load
          </p>
          <h1 className="mt-1 text-xl font-semibold text-ink-900">
            Something went wrong on our side.
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Try again in a moment. If it keeps failing, sign out and sign in
            again — that fixes most transient issues.
          </p>
          {error.digest && (
            <p className="mt-3 text-xs text-ink-500">
              Reference: <span className="font-mono">{error.digest}</span>
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => reset()}
              className="btn-primary !py-2 !px-4 text-sm"
            >
              Try again
            </button>
            <Link
              href="/logout"
              className="btn-secondary !py-2 !px-4 text-sm"
            >
              Sign out
            </Link>
            <Link
              href="/exams"
              className="btn-secondary !py-2 !px-4 text-sm"
            >
              Browse exams
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
