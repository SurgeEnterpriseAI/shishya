"use client";

// Language toggle. Sets a long-lived cookie and refreshes the route so server
// components re-render with the new locale.

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
    <div className="inline-flex rounded-md border border-ink-200 bg-white p-0.5 text-xs">
      {locales.map((lc) => (
        <button
          key={lc}
          onClick={() => setLocale(lc)}
          disabled={pending}
          className={
            current === lc
              ? "rounded px-2 py-1 font-medium bg-saffron-500 text-white"
              : "rounded px-2 py-1 font-medium text-ink-700 hover:bg-ink-50"
          }
          aria-label={`Switch to ${localeNames[lc]}`}
        >
          {lc === "hi" ? "हिं" : "EN"}
        </button>
      ))}
    </div>
  );
}
