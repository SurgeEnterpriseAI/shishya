"use client";

// Mentor application form — deliberately short (2 minutes): the founder
// verifies credentials in the follow-up call, so the form only needs
// enough to start that conversation. Works signed-out.

import { useState } from "react";

export function MentorApplyForm() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({
    name: "",
    phone: "",
    email: "",
    examCode: "",
    clearedYear: "",
    credential: "",
    languages: "",
    city: "",
    why: "",
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (f.name.trim().length < 2 || f.phone.replace(/\D/g, "").length < 10) {
      setErr("Add your name and a 10-digit phone number.");
      return;
    }
    if (f.examCode.trim().length < 2 || f.credential.trim().length < 10) {
      setErr("Tell us which exam you cleared and a line about your rank/post.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/mentor-application", {
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
        Application received — thank you! 🙏 We review every application personally and will reach
        you on WhatsApp or a call within a few days. Meanwhile, see what your future mentees use
        every day: <a href="/jobs-map" className="font-semibold underline">India&apos;s Government Jobs Map</a>.
      </div>
    );
  }

  const input =
    "w-full rounded-lg border border-ink-200 px-3 py-2 text-sm focus:border-saffron-400 focus:outline-none";

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <input className={input} placeholder="Your name *" value={f.name} onChange={set("name")} />
      <input className={input} placeholder="Phone / WhatsApp *" value={f.phone} onChange={set("phone")} inputMode="tel" />
      <input className={input} placeholder="Email (optional)" value={f.email} onChange={set("email")} inputMode="email" />
      <input className={input} placeholder="Exam you cleared * (e.g. SSC CGL, AP Police, KAS)" value={f.examCode} onChange={set("examCode")} />
      <input className={input} placeholder="Year cleared (e.g. 2024)" value={f.clearedYear} onChange={set("clearedYear")} />
      <input className={input} placeholder="Languages you can mentor in" value={f.languages} onChange={set("languages")} />
      <input className={input} placeholder="City" value={f.city} onChange={set("city")} />
      <div className="sm:col-span-2">
        <textarea
          className={input}
          rows={2}
          placeholder="Your rank / post / proof you cleared it * (e.g. 'AIR 1240, posted as Inspector, Bengaluru')"
          value={f.credential}
          onChange={set("credential")}
        />
      </div>
      <div className="sm:col-span-2">
        <textarea
          className={input}
          rows={2}
          placeholder="Why do you want to mentor? Availability? (optional)"
          value={f.why}
          onChange={set("why")}
        />
      </div>
      {err && <p className="text-xs font-medium text-rose-700 sm:col-span-2">{err}</p>}
      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-saffron-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:opacity-60"
        >
          {busy ? "Sending…" : "Apply to be a founding mentor →"}
        </button>
      </div>
    </form>
  );
}
