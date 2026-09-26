"use client";

// Compact "← Back" navigation for every page.
//
// Strategy: prefer browser history (router.back()) when the user actually
// came from somewhere on the site. If they landed directly (Google search,
// SEO page, etc.) fall back to a path-derived parent — e.g. /exams/SSC_CGL/
// topics/quant.percentage → /exams/SSC_CGL/syllabus.
//
// 26 Sep 2026: the parent rule moved to src/lib/url-normalize.ts (inferParent)
// and is pattern-mapped. Stripping the last segment sent /exams/X/news/{id},
// /exams/X/results/{id}, /current-affairs/capsule/{month}, /colleges/stream/*,
// /for/*, /u/*, /c/*, /g/* … to paths with no page (404) or to a redirect.
// tests/unit/backlink-parent.test.ts walks every route under src/app.

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { inferParent } from "@/lib/url-normalize";

export function BackLink() {
  const router = useRouter();
  const pathname = usePathname();
  const [canPopHistory, setCanPopHistory] = useState(false);

  useEffect(() => {
    // window.history.length is unreliable (always >= 1, includes
    // the entry tab), but combined with the document.referrer check
    // gives us a decent "did the user navigate here from inside the
    // site" signal.
    try {
      const sameOrigin =
        document.referrer && new URL(document.referrer).origin === window.location.origin;
      setCanPopHistory(Boolean(sameOrigin) && window.history.length > 1);
    } catch {
      setCanPopHistory(window.history.length > 1);
    }
  }, []);

  const parent = inferParent(pathname ?? "/");
  if (!parent && !canPopHistory) return null;
  if (pathname === "/") return null;

  if (canPopHistory) {
    return (
      <button
        type="button"
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-ink-700 hover:border-saffron-400 hover:bg-saffron-50 hover:text-saffron-800"
        aria-label="Back"
      >
        <span aria-hidden>←</span>
        <span>Back</span>
      </button>
    );
  }

  return (
    <Link
      href={parent!}
      className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-2 py-1 text-xs font-medium text-ink-700 hover:border-saffron-400 hover:bg-saffron-50 hover:text-saffron-800"
      aria-label="Back"
    >
      <span aria-hidden>←</span>
      <span>Back</span>
    </Link>
  );
}
