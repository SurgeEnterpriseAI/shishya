"use client";

// One row in the admin triage table. Every change goes through
// PATCH /api/admin/feature-requests/[id].
//
// Choosing BUILT does not save anything: it opens a small form — one-line
// "what we built", a shishya.in link, and the depth check. Only submitting
// that form marks the idea built and tells the people who asked/upvoted.
// The server enforces the same three requirements (src/lib/feature-requests.ts).

import { useState } from "react";
import { apiPatch } from "@/lib/api";
import {
  FEATURE_REQUEST_STATUSES,
  SHIP_NOTE_MAX,
  STATUS_TONE,
  markedBuiltLabel,
  type FeatureRequestStatusValue as Status,
  type ShipRecord,
} from "@/lib/feature-requests";

interface Delivery {
  asked: number;
  upvoted: number;
  notified: number;
  emailed: number;
  emailFailedOrOptedOut: number;
  emailSkippedAlreadySent: number;
  emailSkippedNoAddress: number;
  emailSkippedOverCap: number;
  emailGuardUnavailable: number;
}

interface PatchResponse {
  request: { id: string; status: Status; ship: ShipRecord | null; privateNote: string };
  enteredShipped: boolean;
  delivery: Delivery | null;
}

function describeDelivery(d: Delivery): string {
  if (d.asked + d.upvoted === 0) {
    return "Saved. Nobody to tell: no signed-in author and no upvotes from before it was built.";
  }
  const parts = [
    `Saved. In-app notice for ${d.asked} who asked + ${d.upvoted} who upvoted (anyone already told is skipped).`,
    `Emails sent now: ${d.emailed}`,
  ];
  if (d.emailGuardUnavailable) {
    parts.push(
      `emails NOT sent: ${d.emailGuardUnavailable} — could not check who was already emailed; save again to send`,
    );
  }
  if (d.emailSkippedAlreadySent) parts.push(`already emailed earlier: ${d.emailSkippedAlreadySent}`);
  if (d.emailSkippedNoAddress) parts.push(`no email address: ${d.emailSkippedNoAddress}`);
  if (d.emailFailedOrOptedOut) parts.push(`not sent (failed or opted out): ${d.emailFailedOrOptedOut}`);
  if (d.emailSkippedOverCap) parts.push(`over this run's cap: ${d.emailSkippedOverCap} — save again to send`);
  return parts.join(" · ");
}

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
  ship: ShipRecord | null;
  privateNote: string;
  createdAt: string;
}) {
  const [status, setStatus] = useState<Status>(props.status);
  const [ship, setShip] = useState<ShipRecord | null>(props.ship);
  const [privateNote, setPrivateNote] = useState<string>(props.privateNote);
  const [noteDraft, setNoteDraft] = useState<string>(props.privateNote);
  const [editingNote, setEditingNote] = useState(false);
  const [shipFormOpen, setShipFormOpen] = useState(false);
  const [shipNote, setShipNote] = useState<string>(props.ship?.note ?? "");
  const [shipLink, setShipLink] = useState<string>(props.ship?.link ?? "");
  const [depthChecked, setDepthChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);

  async function send(body: Record<string, unknown>): Promise<PatchResponse | null> {
    setSaving(true);
    setErr(null);
    setReport(null);
    try {
      const res = await apiPatch<PatchResponse>(`/api/admin/feature-requests/${props.id}`, body);
      setStatus(res.request.status);
      setShip(res.request.ship);
      setPrivateNote(res.request.privateNote);
      setNoteDraft(res.request.privateNote);
      if (res.delivery) setReport(describeDelivery(res.delivery));
      return res;
    } catch (e: any) {
      setErr(e?.message ?? "save failed");
      return null;
    } finally {
      setSaving(false);
    }
  }

  function openShipForm() {
    setShipNote(ship?.note ?? "");
    setShipLink(ship?.link ?? "");
    setDepthChecked(false);
    setErr(null);
    setShipFormOpen(true);
  }

  function onSelect(next: Status) {
    if (next === "SHIPPED") {
      openShipForm();
      return;
    }
    if (next === status) return;
    if (
      status === "SHIPPED" &&
      !window.confirm(
        "Move this idea out of Built? It leaves the Built list on /ideas and students' dashboards. Notices already sent cannot be unsent.",
      )
    ) {
      return;
    }
    setShipFormOpen(false);
    void send({ status: next });
  }

  async function submitShip() {
    const res = await send({ status: "SHIPPED", shipNote, shipLink, depthChecked });
    if (res) {
      setShipFormOpen(false);
      setDepthChecked(false);
    }
  }

  const created = new Date(props.createdAt);
  const noteLen = shipNote.replace(/\s+/g, " ").trim().length;

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

      {/* Ship record (public: /ideas, dashboards, the notice) */}
      {status === "SHIPPED" && !shipFormOpen && (
        ship ? (
          <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/60 p-2 text-xs text-ink-800">
            <p>
              <span className="font-semibold">{markedBuiltLabel(ship.shippedAt)}:</span> {ship.note}
            </p>
            <p className="mt-1 flex flex-wrap items-center gap-x-3">
              <a href={ship.link} target="_blank" rel="noopener noreferrer" className="text-emerald-700 hover:underline">
                {ship.link}
              </a>
              <button type="button" onClick={openShipForm} className="text-saffron-700 hover:underline">
                Edit note / link
              </button>
            </p>
          </div>
        ) : (
          <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-ink-800">
            Marked built earlier without a note or link — it shows as Built on /ideas, but nobody has been
            told and it cannot appear on dashboards.{" "}
            <button type="button" onClick={openShipForm} className="font-semibold text-saffron-700 hover:underline">
              Add note &amp; link
            </button>
          </div>
        )
      )}

      {/* Status changer */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="text-[11px] uppercase tracking-wider text-ink-500" htmlFor={`status-${props.id}`}>
          Status
        </label>
        <select
          id={`status-${props.id}`}
          value={status}
          onChange={(e) => onSelect(e.target.value as Status)}
          disabled={saving}
          className="rounded-md border border-ink-300 bg-white px-2 py-1 text-xs focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200 disabled:opacity-50"
        >
          {FEATURE_REQUEST_STATUSES.map((s) => (
            <option key={s} value={s}>{s === "SHIPPED" ? "SHIPPED (built)" : s.replace("_", " ")}</option>
          ))}
        </select>
        {!editingNote ? (
          <button
            type="button"
            onClick={() => setEditingNote(true)}
            className="text-xs text-saffron-700 hover:underline"
          >
            {privateNote ? "Edit private note" : "Add private note"}
          </button>
        ) : null}
        {saving && <span className="text-xs text-ink-500">Saving…</span>}
        {err && <span className="text-xs text-rose-700">{err}</span>}
      </div>

      {report && <p className="mt-2 rounded bg-emerald-50 p-2 text-xs text-emerald-900">{report}</p>}

      {shipFormOpen && (
        <div className="mt-3 rounded-md border border-emerald-300 bg-emerald-50/40 p-3">
          <p className="text-xs font-semibold text-ink-900">
            {status === "SHIPPED" ? "Edit what we built" : "Mark as built"}
          </p>
          <p className="mt-0.5 text-[11px] text-ink-600">
            Saving tells the student who asked and everyone who upvoted before it was built — in-app, plus
            at most one plain email each. It cannot be unsent; saving again never tells anyone twice.
            Students see the date as &ldquo;Marked built&rdquo; (the day you first mark it), never as a
            build date, and the copy only says it is on Shishya — fine for something that already existed.
          </p>

          <label className="mt-3 block text-[11px] font-medium text-ink-700" htmlFor={`ship-note-${props.id}`}>
            What we built — one line, shown on /ideas, the student&rsquo;s dashboard and the notice
          </label>
          <input
            id={`ship-note-${props.id}`}
            type="text"
            value={shipNote}
            onChange={(e) => setShipNote(e.target.value)}
            maxLength={SHIP_NOTE_MAX + 40}
            placeholder="Tap the mic on any question to ask the tutor by voice."
            className="mt-1 w-full rounded-md border border-ink-300 px-2 py-1.5 text-xs focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
          <p className={`mt-0.5 text-right text-[10px] ${noteLen > SHIP_NOTE_MAX ? "text-rose-700" : "text-ink-500"}`}>
            {noteLen}/{SHIP_NOTE_MAX}
          </p>

          <label className="mt-1 block text-[11px] font-medium text-ink-700" htmlFor={`ship-link-${props.id}`}>
            Deep link on shishya.in
          </label>
          <input
            id={`ship-link-${props.id}`}
            type="text"
            value={shipLink}
            onChange={(e) => setShipLink(e.target.value)}
            placeholder="/exams/SSC_CGL/build-mock"
            className="mt-1 w-full rounded-md border border-ink-300 px-2 py-1.5 font-mono text-xs focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />

          <label className="mt-3 flex items-start gap-2 text-[11px] text-ink-800">
            <input
              type="checkbox"
              checked={depthChecked}
              onChange={(e) => setDepthChecked(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I opened this link and used the feature the way this student asked for it — depth checked,
              not just that the page loads.
            </span>
          </label>

          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShipFormOpen(false); setDepthChecked(false); }}
              className="text-xs text-ink-500 hover:text-ink-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={submitShip}
              disabled={saving || !depthChecked}
              className="btn-primary !py-1 !px-2 text-xs disabled:opacity-50"
            >
              {saving ? "Saving…" : status === "SHIPPED" ? "Save" : "Mark built & notify"}
            </button>
          </div>
        </div>
      )}

      {editingNote && (
        <div className="mt-2">
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            rows={2}
            placeholder="Private triage note — admin only, never shown to students."
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-xs focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setNoteDraft(privateNote); setEditingNote(false); }}
              className="text-xs text-ink-500 hover:text-ink-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={async () => {
                const res = await send({ privateNote: noteDraft });
                if (res) setEditingNote(false);
              }}
              disabled={saving}
              className="btn-primary !py-1 !px-2 text-xs disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
          </div>
        </div>
      )}
      {!editingNote && privateNote && (
        <p className="mt-2 rounded bg-ink-50 p-2 text-xs italic text-ink-700">
          📝 {privateNote}
        </p>
      )}
    </article>
  );
}
