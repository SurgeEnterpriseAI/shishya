"use client";

// Language-twin links (English / हिंदी में / తెలుగులో) shown on the
// exam hub/tracker/calendar. Two jobs the plain <Link> couldn't do
// (review 23 Aug 2026):
//   • the ENGLISH link must also reset the shishya-lang cookie, otherwise
//     a visitor coming from /hi/... (where the middleware set the cookie
//     to "hi") clicks "English" and still gets Hindi on the plain URL;
//   • no prefetch — a prefetched /hi URL used to flip the visitor's
//     cookie without a click (the middleware now ignores prefetches too,
//     belt and braces).
// Humans and crawlers both see real anchors, so the hreflang graph stays
// discoverable.

import Link from "next/link";

const COOKIE = "shishya-lang";

function setLang(lang: string) {
  try {
    document.cookie = `${COOKIE}=${lang}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  } catch {
    /* non-DOM */
  }
}

export function LangTwinLinks({ path, current }: { path: string; current: "en" | "hi" | "te" }) {
  const items: { lang: "en" | "hi" | "te"; href: string; label: string }[] = [
    { lang: "en", href: path, label: "English" },
    { lang: "hi", href: `/hi${path === "/" ? "" : path}`, label: "हिंदी में" },
    { lang: "te", href: `/te${path === "/" ? "" : path}`, label: "తెలుగులో" },
  ];
  return (
    <p className="mt-2 text-xs text-ink-500">
      {items
        .filter((i) => i.lang !== current)
        .map((i) => (
          <Link
            key={i.lang}
            href={i.href}
            prefetch={false}
            hrefLang={i.lang}
            onClick={() => setLang(i.lang)}
            className="mr-3 hover:text-ink-800"
          >
            {i.label}
          </Link>
        ))}
    </p>
  );
}
