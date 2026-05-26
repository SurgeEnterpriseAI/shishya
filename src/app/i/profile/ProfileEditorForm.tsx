"use client";

// Profile editor form. Optimistic state, PATCH on submit, refresh on
// success. Examcodes input is a comma-separated string for v1 to keep
// the form simple — later we'll convert to a search-pick widget against
// the real Exam table.

import { useState } from "react";
import { useRouter } from "next/navigation";

interface State {
  code: string;
  name: string;
}

interface InitialValues {
  name: string;
  slug: string;
  tagline: string;
  description: string;
  logoUrl: string;
  websiteUrl: string;
  contactEmail: string;
  contactPhone: string;
  city: string;
  state: string;
  modes: string[];
  examCodes: string[];
}

const ALL_MODES = ["ONLINE", "OFFLINE", "HYBRID"] as const;

export function ProfileEditorForm({
  institution,
  states,
}: {
  institution: InitialValues;
  states: State[];
}) {
  const router = useRouter();
  const [tagline, setTagline] = useState(institution.tagline);
  const [description, setDescription] = useState(institution.description);
  const [logoUrl, setLogoUrl] = useState(institution.logoUrl);
  const [websiteUrl, setWebsiteUrl] = useState(institution.websiteUrl);
  const [contactPhone, setContactPhone] = useState(institution.contactPhone);
  const [city, setCity] = useState(institution.city);
  const [stateCode, setStateCode] = useState(institution.state);
  const [modes, setModes] = useState<string[]>(institution.modes);
  const [examCodesText, setExamCodesText] = useState(institution.examCodes.join(", "));
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleMode(m: string) {
    setModes((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const examCodes = examCodesText
        .split(/[\s,;]+/)
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);

      const res = await fetch("/api/i/institution", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          tagline: tagline.trim() || null,
          description: description.trim() || null,
          logoUrl: logoUrl.trim() || null,
          websiteUrl: websiteUrl.trim() || null,
          contactPhone: contactPhone.trim() || null,
          city: city.trim() || null,
          state: stateCode || null,
          modes,
          examCodes,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not save — try again.");
        setSubmitting(false);
        return;
      }
      setSavedAt(new Date());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-md bg-ink-50/60 px-3 py-2 text-xs text-ink-600">
        <span className="font-semibold">Institution name:</span> {institution.name} ·{" "}
        <span className="font-semibold">URL:</span> /institutions/
        <span className="font-mono">{institution.slug}</span> ·{" "}
        <span className="font-semibold">Login email:</span> {institution.contactEmail}
        <p className="mt-1 text-ink-500">
          (Name / slug / login email aren&apos;t editable here — email{" "}
          <a
            href="mailto:venumuvva@surgesoftware.co.in"
            className="text-saffron-700 underline-offset-2 hover:underline"
          >
            shishya support
          </a>{" "}
          if you need them changed.)
        </p>
      </div>

      <Field label="Tagline" hint="1-line pitch shown right under your name. ≤ 160 chars.">
        <input
          type="text"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          maxLength={160}
          placeholder="Top results in Hindi-medium UPSC for 12 years."
          className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </Field>

      <Field label="About" hint="2-5 short paragraphs. Faculty, history, what makes you different.">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
          rows={6}
          className="w-full resize-none rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Logo URL" hint="https:// link to a square logo (PNG / SVG / JPG).">
          <input
            type="url"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            maxLength={500}
            placeholder="https://example.com/logo.png"
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </Field>

        <Field label="Website" hint="Your main website, if any.">
          <input
            type="url"
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            maxLength={500}
            placeholder="https://example.com"
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Phone" hint="Optional. Shown publicly as a tap-to-call link.">
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            maxLength={20}
            placeholder="+91 99XXX XXXXX"
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </Field>

        <Field label="City">
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={80}
            placeholder="e.g. Hyderabad"
            className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
          />
        </Field>
      </div>

      <Field label="State / UT">
        <select
          value={stateCode}
          onChange={(e) => setStateCode(e.target.value)}
          className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        >
          <option value="">— Select —</option>
          {states.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Teaching modes" hint="Tick all that apply.">
        <div className="flex flex-wrap gap-2">
          {ALL_MODES.map((m) => (
            <label
              key={m}
              className={`flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${
                modes.includes(m)
                  ? "border-saffron-400 bg-saffron-50 text-saffron-900"
                  : "border-ink-300 bg-white text-ink-700 hover:bg-ink-50"
              }`}
            >
              <input
                type="checkbox"
                className="sr-only"
                checked={modes.includes(m)}
                onChange={() => toggleMode(m)}
              />
              {m.charAt(0) + m.slice(1).toLowerCase()}
            </label>
          ))}
        </div>
      </Field>

      <Field
        label="Exams you coach for"
        hint="Comma-separated exam codes — e.g. SSC_CGL, IBPS_PO, JEE_MAIN, UPSC_PRELIMS. (We'll add a picker UI soon.)"
      >
        <textarea
          value={examCodesText}
          onChange={(e) => setExamCodesText(e.target.value)}
          rows={2}
          placeholder="SSC_CGL, IBPS_PO, RRB_NTPC"
          className="w-full resize-none rounded-md border border-ink-300 px-3 py-2 font-mono text-xs focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </Field>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-4">
        <p className="text-xs text-ink-500">
          {savedAt ? (
            <span className="text-emerald-700">
              ✓ Saved at {savedAt.toLocaleTimeString("en-IN")}
            </span>
          ) : (
            "Changes save when you click 'Save profile'."
          )}
        </p>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-800">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-ink-500">{hint}</p>}
    </label>
  );
}
