"use client";

// Search box for the /exams catalog. Tiny client component: updates the
// `?q=` URL param as the user types (debounced 250ms) so the server
// re-renders the filtered list. We keep this client-side specifically
// because the rest of the page is a server component — this is the only
// piece that needs interactivity, and even it works without JS (form
// submit falls back to a regular GET).

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function ExamSearchBox({ placeholder }: { placeholder: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const [value, setValue] = useState(sp.get("q") ?? "");

  // Debounced push to URL — avoids hammering the server on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(sp.toString());
      const trimmed = value.trim();
      if (trimmed) next.set("q", trimmed);
      else next.delete("q");
      const qs = next.toString();
      router.replace(qs ? `/exams?${qs}` : "/exams", { scroll: false });
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <form
      action="/exams"
      method="GET"
      className="relative flex items-center"
      onSubmit={(e) => {
        e.preventDefault();
      }}
    >
      <svg
        className="pointer-events-none absolute left-3 h-4 w-4 text-ink-400"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={2}
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.34-4.34M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
      </svg>
      <input
        type="search"
        name="q"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-ink-300 bg-white py-2.5 pl-10 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        aria-label={placeholder}
      />
    </form>
  );
}
