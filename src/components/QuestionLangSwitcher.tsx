"use client";

// Question-level language switcher. Unlike <LangSwitcher /> (which sets a
// cookie and refreshes the route to re-render UI strings in the chosen
// locale), this one is a *controlled* dropdown: it just reports the user's
// pick to the parent, which then fetches translations for the questions on
// screen via /api/mocks/[id]/translate or /api/attempts/[id]/translate.
//
// Used on the mock-taking player and the results review page.

import { locales, localeNames, type Locale } from "@/lib/i18n";

export function QuestionLangSwitcher({
  current,
  onChange,
  disabled,
  pending,
  label = "Question language",
}: {
  current: Locale;
  onChange: (next: Locale) => void;
  disabled?: boolean;
  pending?: boolean;
  label?: string;
}) {
  return (
    <label className="relative inline-flex items-center gap-1.5">
      <span className="sr-only">{label}</span>
      <GlobeIcon />
      <select
        value={current}
        onChange={(e) => onChange(e.target.value as Locale)}
        disabled={disabled || pending}
        className="appearance-none rounded-md border border-ink-200 bg-white py-1.5 pl-7 pr-7 text-xs font-medium text-ink-800 hover:border-saffron-400 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 disabled:cursor-wait disabled:opacity-60"
        aria-label={label}
        title={label}
      >
        {locales.map((lc) => (
          <option key={lc} value={lc}>
            {localeNames[lc]}
          </option>
        ))}
      </select>
      <ChevronIcon />
      {pending && (
        <span
          className="ml-1 inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-saffron-200 border-t-saffron-500"
          aria-hidden
        />
      )}
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
