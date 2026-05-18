"use client";

// Form for submitting a new credential claim. Domain dropdown +
// institution text + claim type + notes. POSTs to /api/credentials.

import { useState } from "react";
import { useRouter } from "next/navigation";

const DOMAINS: Array<{ value: string; label: string }> = [
  { value: "civil-services",     label: "Civil Services (UPSC / state PSCs)" },
  { value: "iit-nit-iiit",       label: "IIT / NIT / IIIT engineering" },
  { value: "medical",            label: "AIIMS / JIPMER / medical" },
  { value: "iim-management",     label: "IIM / management" },
  { value: "nlu-law",            label: "NLU / law" },
  { value: "defence",            label: "Defence services" },
  { value: "banking",            label: "Banking sector" },
  { value: "railways",           label: "Railways" },
  { value: "teaching",           label: "Teaching (TET cleared / teaching)" },
  { value: "research",           label: "Research (PhD / researcher)" },
  { value: "foreign-universities", label: "Foreign universities (student / alumnus)" },
];

const CLAIM_TYPES = [
  { value: "alumnus",          label: "Alumnus / graduate" },
  { value: "current_student",  label: "Current student" },
  { value: "currently_at",     label: "Currently working at" },
  { value: "working_at",       label: "Previously worked at" },
  { value: "exam_cleared",     label: "Cleared the exam" },
];

export function CredentialForm() {
  const router = useRouter();
  const [domain, setDomain] = useState("");
  const [claimType, setClaimType] = useState("");
  const [institution, setInstitution] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/credentials", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ domain, claimType, institution, notes: notes || undefined }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || j.message || `HTTP ${res.status}`);
        return;
      }
      setDone(true);
      router.refresh();
    } catch (e: any) {
      setError(e?.message || "Network error");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50/50 p-4 text-sm text-emerald-800">
        Claim submitted. It will appear under "Pending" above. Share the
        community-vouching URL with someone who can vouch.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-3 rounded-lg border border-ink-200 bg-white p-5">
      <div>
        <label className="text-xs font-medium text-ink-900">Domain</label>
        <select
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-ink-300 bg-white px-2 py-1.5 text-sm text-ink-900"
        >
          <option value="">— select —</option>
          {DOMAINS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-ink-900">Claim type</label>
        <select
          value={claimType}
          onChange={(e) => setClaimType(e.target.value)}
          required
          className="mt-1 w-full rounded-md border border-ink-300 bg-white px-2 py-1.5 text-sm text-ink-900"
        >
          <option value="">— select —</option>
          {CLAIM_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      <div>
        <label className="text-xs font-medium text-ink-900">Institution name</label>
        <input
          type="text"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
          required
          maxLength={120}
          placeholder="e.g., IIT Bombay, UPSC, AIIMS Delhi"
          className="mt-1 w-full rounded-md border border-ink-300 bg-white px-2 py-1.5 text-sm text-ink-900"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-ink-900">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Year of graduation, department, specialisation — helpful context for the people vouching."
          className="mt-1 w-full rounded-md border border-ink-300 bg-white px-2 py-1.5 text-sm text-ink-900"
        />
      </div>

      {error && <p className="rounded-md border border-rose-200 bg-rose-50/50 p-2 text-xs text-rose-800">{error}</p>}

      <button
        type="submit"
        disabled={busy || !domain || !claimType || !institution}
        className="rounded-md bg-saffron-500 px-4 py-2 text-xs font-semibold text-white hover:bg-saffron-600 disabled:opacity-60"
      >
        {busy ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
