// The /ask page's own search box (26 Sep 2026) — a real GET form to the
// locale's /ask, so it works with no JavaScript: the server resolver does the
// whole job (a clear match 307s to its page, anything else lists pages).
// INTEGRATION POINT: the UI builder's client combobox
// (src/components/search/SearchStrip.tsx, variant "page") replaces this form;
// its no-JS fallback must stay this exact form (name="q", method GET).

import type { SearchCopy } from "@/lib/search-copy";

export function AskSearchForm({ action, copy, initialQuery = "" }: { action: string; copy: SearchCopy; initialQuery?: string }) {
  const example = copy.placeholder[0]?.text ?? "";
  return (
    <form role="search" method="get" action={action} className="flex gap-2">
      <label className="sr-only" htmlFor="ask-q">
        {copy.hubH1}
      </label>
      <input
        id="ask-q"
        type="search"
        name="q"
        defaultValue={initialQuery}
        placeholder={example}
        maxLength={200}
        autoComplete="off"
        enterKeyHint="search"
        className="min-h-[52px] w-full rounded-2xl border-2 border-ink-200 bg-white px-4 text-[17px] text-ink-900 outline-none focus:border-saffron-500 focus:ring-4 focus:ring-saffron-200/60"
      />
      <button
        type="submit"
        className="shrink-0 rounded-2xl bg-saffron-500 px-5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
      >
        {copy.submit}
      </button>
    </form>
  );
}
