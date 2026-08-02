"use client";

// Educator pilot-interest form — short on purpose: the founder's
// follow-up call does the real qualification. Works signed-out.

import { useState } from "react";

export function EducatorLeadForm() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    name: "",
    organisation: "",
    phone: "",
    email: "",
    audience: "",
    examFocus: "",
    message: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (f.name.trim().length < 2 || f.phone.replace(/\D/g, "").length < 10) {
      setErr("Add your name and a 10-digit WhatsApp number.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/educator-lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(f),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data?.error ?? "Couldn't send that — please try again.");
        setBusy(false);
        return;
      }
      setDone(true);
    } catch {
      setErr("Network hiccup — try again.");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        Got it — thank you! 🙏 The founder will reach you on WhatsApp within 24 hours to set up
        your pilot batch. Want a head start? Create your institution now at{" "}
        <a href="/institutions/new" className="font-semibold underline">shishya.in/institutions/new</a>.
      </div>
    );
  }

  const input =
    "w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-saffron-400 focus:outline-none";

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input className={input} placeholder="Your name *" value={f.name} onChange={set("name")} />
      <input className={input} placeholder="Channel / institute name" value={f.organisation} onChange={set("organisation")} />
      <input className={input} placeholder="WhatsApp number *" value={f.phone} onChange={set("phone")} inputMode="tel" />
      <input className={input} placeholder="Email (optional)" value={f.email} onChange={set("email")} inputMode="email" />
      <input className={input} placeholder="Audience size (e.g. 80k YouTube, 12k Telegram)" value={f.audience} onChange={set("audience")} />
      <input className={input} placeholder="Exams you teach (e.g. SSC CGL, UP Police)" value={f.examFocus} onChange={set("examFocus")} />
      <div className="sm:col-span-2">
        <textarea
          className={input}
          rows={2}
          placeholder="Anything else — batch size, current tools, what you need (optional)"
          value={f.message}
          onChange={set("message")}
        />
      </div>
      {err && <p className="text-xs font-medium text-rose-700 sm:col-span-2">{err}</p>}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-saffron-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Request my free pilot →"}
        </button>
      </div>
    </form>
  );
}
