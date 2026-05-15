"use client";

// One row in the admin triage table — handles the inline status
// change + note save via PATCH /api/admin/feedback/[id]. Optimistic
// update so the table feels snappy; reverts on error.

import { useState } from "react";
import { apiPatch } from "@/lib/api";

type Status = "OPEN" | "UNDER_REVIEW" | "PLANNED" | "SHIPPED" | "DECLINED";

const STATUS_TONE: Record<Status, string> = {
  OPEN: "bg-ink-100 text-ink-700",
  UNDER_REVIEW: "bg-amber-100 text-amber-800",
  PLANNED: "bg-saffron-100 text-saffron-800",
  SHIPPED: "bg-emerald-100 text-emerald-800",
  DECLINED: "bg-ink-100 text-ink-500",
};

export function FeedbackRow(props: {
  id: string;
  title: string;
  body: string;
  area: string;
  routePath: string;
  examCode: string | null;
  authorName: string | null;
  authorEmail: string | null;
  upvoteCount: number;
  status: Status;
  adminNote: string | null;
  createdAt: string;
}) {
  const [status, setStatus] = useState<Status>(props.status);
  const [note, setNote] = useState<string>(props.adminNote ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function update(next: { status?: Status; adminNote?: string }) {
    const prevStatus = status;
    const prevNote = props.adminNote ?? "";
    if (next.status) setStatus(next.status);
    setSaving(true);
    setErr(null);
    try {
      await apiPatch(`/api/admin/feedback/${props.id}`, next);
    } catch (e: any) {
      // revert
      if (next.status) setStatus(prevStatus);
      if (next.adminNote !== undefined) setNote(prevNote);
      setErr(e?.message ?? "save failed");
    } finally {
      setSaving(false);
    }
  }

  const created = new Date(props.createdAt);

  return (
    <article className="rounded-md border border-ink-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2">
            <h2 className="text-sm font-semibold text-ink-900">{props.title}</h2>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_TONE[status]}`}>
              {status.replace("_", " ")}
            </span>
          </div>
          <p className="mt-1.5 whitespace-pre-line text-sm text-ink-700">{props.body}</p>
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-500">
            <span className="rounded bg-ink-100 px-1.5 py-0.5 font-medium text-ink-700">
              {props.area}
            </span>
            <code className="text-ink-700">{props.routePath}</code>
            {props.examCode && <span className="text-saffron-700">{props.examCode}</span>}
            <span>{props.authorName ?? "anon"}{props.authorEmail ? ` (${props.authorEmail})` : ""}</span>
            <span>· {created.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
            <span>· ▲ {props.upvoteCount}</span>
          </p>
        </div>
      </div>

      {/* Status changer */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-[11px] uppercase tracking-wider text-ink-500">Status</label>
        <select
          value={status}
          onChange={(e) => update({ status: e.target.value as Status })}
          disabled={saving}
          className="rounded-md border border-ink-300 bg-white px-2 py-1 text-xs focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 disabled:opacity-50"
        >
          {(["OPEN", "UNDER_REVIEW", "PLANNED", "SHIPPED", "DECLINED"] as const).map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
        {!editing ? (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs text-saffron-700 hover:underline"
          >
            {props.adminNote ? "Edit note" : "Add note"}
          </button>
        ) : null}
        {err && <span className="text-xs text-rose-700">{err}</span>}
      </div>

      {editing && (
        <div className="mt-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            placeholder="Why we're declining / linking to a related issue / shipping note for the student…"
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-xs focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setNote(props.adminNote ?? ""); setEditing(false); }}
              className="text-xs text-ink-500 hover:text-ink-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => { await update({ adminNote: note }); setEditing(false); }}
              disabled={saving}
              className="btn-primary !py-1 !px-2 text-xs disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      )}
      {!editing && props.adminNote && (
        <p className="mt-2 rounded bg-ink-50 p-2 text-xs italic text-ink-700">
          📝 {props.adminNote}
        </p>
      )}
    </article>
  );
}
