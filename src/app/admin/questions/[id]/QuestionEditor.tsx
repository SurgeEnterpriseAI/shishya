"use client";

// Client component that powers the question editor.
// Edits are saved via PATCH /api/admin/questions/:id; the same endpoint handles
// validate/reject toggles.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiPatch, apiDel } from "@/lib/api";

type Diff = "EASY" | "MEDIUM" | "HARD";

interface Initial {
  id: string;
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  difficulty: Diff;
  topicCode: string;
  tags: string[];
  source: string;
  validated: boolean;
  validatedBy: string | null;
}

export function QuestionEditor({
  initial,
  topics,
}: {
  initial: Initial;
  topics: { code: string; name: string }[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [busy, setBusy] = useState<null | string>(null);
  const [err, setErr] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const isRejected = draft.tags.includes("rejected");

  function setOption(idx: number, text: string) {
    setDraft((d) => ({
      ...d,
      options: d.options.map((o, i) => (i === idx ? { ...o, text } : o)),
    }));
  }

  async function save(extra: Record<string, any> = {}) {
    setErr(null);
    setBusy(extra.validated === true ? "validate" : extra.reject ? "reject" : "save");
    try {
      await apiPatch(`/api/admin/questions/${initial.id}`, {
        body: draft.body,
        options: draft.options,
        answerKey: draft.answerKey,
        solution: draft.solution,
        difficulty: draft.difficulty,
        topicCode: draft.topicCode,
        tags: draft.tags.filter((t) => t !== "rejected"),
        ...extra,
      });
      setSavedAt(Date.now());
      router.refresh();
    } catch (e: any) {
      setErr(e.message ?? "Failed to save");
    } finally {
      setBusy(null);
    }
  }

  async function deleteForever() {
    if (!confirm("Delete this question permanently? This cannot be undone.")) return;
    setBusy("delete");
    try {
      await apiDel(`/api/admin/questions/${initial.id}`);
      router.push("/admin/questions");
    } catch (e: any) {
      setErr(e.message ?? "Delete failed");
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-5 rounded-md border border-ink-200 bg-white p-6">
        {/* Body */}
        <Field label="Question body">
          <textarea
            value={draft.body}
            onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            rows={4}
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm font-mono leading-relaxed"
          />
        </Field>

        {/* Options */}
        <Field label="Options">
          <div className="space-y-2">
            {draft.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDraft({ ...draft, answerKey: opt.key })}
                  className={
                    draft.answerKey === opt.key
                      ? "h-8 w-8 shrink-0 rounded-md bg-emerald-500 font-semibold text-white"
                      : "h-8 w-8 shrink-0 rounded-md border border-ink-300 font-medium text-ink-700 hover:bg-ink-50"
                  }
                  title="Mark as correct answer"
                >
                  {opt.key}
                </button>
                <input
                  value={opt.text}
                  onChange={(e) => setOption(i, e.target.value)}
                  className="flex-1 rounded-md border border-ink-300 px-3 py-1.5 text-sm"
                />
              </div>
            ))}
          </div>
          <p className="mt-1 text-xs text-ink-500">Click the letter to mark the correct answer.</p>
        </Field>

        {/* Solution */}
        <Field label="Step-by-step solution">
          <textarea
            value={draft.solution}
            onChange={(e) => setDraft({ ...draft, solution: e.target.value })}
            rows={5}
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm leading-relaxed"
          />
        </Field>

        {/* Meta */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Difficulty">
            <select
              value={draft.difficulty}
              onChange={(e) => setDraft({ ...draft, difficulty: e.target.value as Diff })}
              className="w-full rounded-md border border-ink-300 bg-white px-3 py-1.5 text-sm"
            >
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </Field>
          <Field label="Topic">
            <select
              value={draft.topicCode}
              onChange={(e) => setDraft({ ...draft, topicCode: e.target.value })}
              className="w-full rounded-md border border-ink-300 bg-white px-3 py-1.5 text-sm"
            >
              {topics.map((t) => (
                <option key={t.code} value={t.code}>{t.name}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Tags (comma-separated)">
          <input
            value={draft.tags.join(", ")}
            onChange={(e) =>
              setDraft({
                ...draft,
                tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              })
            }
            className="w-full rounded-md border border-ink-300 px-3 py-1.5 text-sm"
          />
        </Field>

        {err && (
          <div className="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
            {err}
          </div>
        )}
      </div>

      {/* Actions panel */}
      <aside className="space-y-3 rounded-md border border-ink-200 bg-white p-5 lg:sticky lg:top-6 lg:self-start">
        <StatusBadge validated={draft.validated} source={draft.source} rejected={isRejected} />
        {draft.validatedBy && (
          <p className="text-xs text-ink-500">Validated by {draft.validatedBy}</p>
        )}

        <button
          onClick={() => save()}
          disabled={!dirty || !!busy}
          className="btn-secondary w-full !py-2 !text-sm disabled:opacity-50"
        >
          {busy === "save" ? "Saving…" : dirty ? "Save edits" : "No changes"}
        </button>

        <button
          onClick={() => save({ validated: true })}
          disabled={!!busy}
          className="btn-primary w-full !py-2 !text-sm disabled:opacity-50"
        >
          {busy === "validate" ? "Validating…" : draft.validated ? "Re-validate" : "Validate ✓"}
        </button>

        {draft.validated && (
          <button
            onClick={() => save({ validated: false })}
            disabled={!!busy}
            className="w-full rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-50"
          >
            Un-validate
          </button>
        )}

        <button
          onClick={() => save({ reject: true })}
          disabled={!!busy}
          className="w-full rounded-md border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100 disabled:opacity-50"
        >
          {busy === "reject" ? "Rejecting…" : "Reject"}
        </button>

        <hr className="my-2 border-ink-200" />

        <button
          onClick={deleteForever}
          disabled={!!busy}
          className="w-full text-xs text-ink-500 hover:text-rose-700 disabled:opacity-50"
        >
          Delete permanently
        </button>

        {savedAt && (
          <p className="text-xs text-emerald-700">Saved at {new Date(savedAt).toLocaleTimeString()}</p>
        )}
      </aside>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-500">{label}</span>
      {children}
    </label>
  );
}

function StatusBadge({
  validated,
  source,
  rejected,
}: {
  validated: boolean;
  source: string;
  rejected: boolean;
}) {
  if (rejected)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-medium text-rose-800">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Rejected
      </span>
    );
  if (validated)
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Validated
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      {source === "AI_GENERATED" ? "Pending review (AI)" : "Pending review"}
    </span>
  );
}
