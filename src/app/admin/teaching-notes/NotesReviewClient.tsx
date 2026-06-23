"use client";

// Client side of the teaching-note admin review UI. Renders each topic's
// note preview with Validate / Needs-review buttons that call
// POST /api/admin/topics/:id/notes-review (session-admin auth).

import { useState } from "react";

interface Item {
  id: string;
  name: string;
  code: string;
  subject: string;
  exam: string;
  preview: string;
  validated: boolean;
}

export function NotesReviewClient({ items }: { items: Item[] }) {
  const [state, setState] = useState<Record<string, { validated: boolean; busy: boolean; err?: string }>>(
    Object.fromEntries(items.map((i) => [i.id, { validated: i.validated, busy: false }]))
  );
  const [open, setOpen] = useState<Record<string, boolean>>({});

  async function review(id: string, action: "validate" | "needs_review") {
    setState((s) => ({ ...s, [id]: { ...s[id], busy: true, err: undefined } }));
    try {
      const res = await fetch(`/api/admin/topics/${id}/notes-review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Failed (${res.status})`);
      setState((s) => ({ ...s, [id]: { validated: action === "validate", busy: false } }));
    } catch (e: any) {
      setState((s) => ({ ...s, [id]: { ...s[id], busy: false, err: e?.message ?? "Failed" } }));
    }
  }

  if (!items.length) {
    return <p className="mt-8 text-sm text-ink-500">No topics in this view.</p>;
  }

  return (
    <ul className="mt-5 space-y-3">
      {items.map((it) => {
        const st = state[it.id];
        return (
          <li key={it.id} className="rounded-lg border border-ink-200 bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-semibold text-ink-900">{it.name}</p>
                <p className="text-xs text-ink-500">
                  {it.exam} · {it.subject} · <code className="text-ink-400">{it.code}</code>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    st.validated ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {st.validated ? "Validated" : "Needs review"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen((o) => ({ ...o, [it.id]: !o[it.id] }))}
              className="mt-2 text-xs font-medium text-saffron-700 hover:underline"
            >
              {open[it.id] ? "Hide note" : "View note"}
            </button>
            {open[it.id] && (
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-ink-50 p-3 text-xs leading-relaxed text-ink-700">
                {it.preview}
                {it.preview.length >= 900 ? "\n…" : ""}
              </pre>
            )}

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => review(it.id, "validate")}
                disabled={st.busy || st.validated}
                className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {st.busy ? "…" : "✓ Validate"}
              </button>
              <button
                type="button"
                onClick={() => review(it.id, "needs_review")}
                disabled={st.busy || !st.validated}
                className="rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
              >
                ↺ Needs review
              </button>
              {st.err && <span className="text-xs text-rose-700">{st.err}</span>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
