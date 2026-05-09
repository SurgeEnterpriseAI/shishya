"use client";

// Language selector — a compact dropdown showing all 19 supported languages
// (English + 18 scheduled languages of India). Selecting a language sets a
// long-lived cookie and refreshes the route so server components re-render
// in the chosen locale.
//
// We keep this as a native <select> for accessibility (screen readers,
// keyboard navigation, mobile native picker) — far better UX than a custom
// popover at this scale.

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { locales, localeNames, type Locale } from "@/lib/i18n";

const COOKIE = "shishya-lang";

export function LangSwitcher({ current }: { current: Locale }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLocale(lc: Locale) {
    if (lc === current) return;
    document.cookie = `${COOKIE}=${lc}; path=/; max-age=${60 * 60 * 24 * 365}`;
    startTransition(() => router.refresh());
  }

  return (
    <label className="relative inline-flex items-center">
      <span className="sr-only">Language</span>
      <GlobeIcon />
      <select
        value={current}
        onChange={(e) => setLocale(e.target.value as Locale)}
        disabled={pending}
        className="appearance-none rounded-md border border-ink-200 bg-white py-1.5 pl-7 pr-7 text-xs font-medium text-ink-800 hover:border-saffron-400 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 disabled:opacity-60"
        aria-label="Select language"
      >
        {locales.map((lc) => (
          <option key={lc} value={lc}>
            {localeNames[lc]}
          </option>
        ))}
      </select>
      <ChevronIcon />
    </label>
  );
}

function GlobeIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0 0c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3s-4.5 4.03-4.5 9 2.015 9 4.5 9Zm-9-9h18"
      />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  );
}
