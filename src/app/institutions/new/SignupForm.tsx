"use client";

// Institution signup form. 4 fields, client-side validation, POSTs to
// /api/institutions/signup, then redirects to /i/dashboard on success.

import { useState } from "react";
import { useRouter } from "next/navigation";

export function InstitutionSignupForm() {
  const router = useRouter();
  const [institutionName, setInstName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordOK = password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
  const formValid =
    institutionName.trim().length >= 3 &&
    adminName.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    passwordOK;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/institutions/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ institutionName, adminName, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Could not create the account. Try again.");
        setSubmitting(false);
        return;
      }
      // Session cookie is set server-side — straight to dashboard.
      router.push("/i/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error. Try again.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Institution name"
        hint="What does your coaching centre call itself?"
        required
      >
        <input
          type="text"
          autoComplete="organization"
          value={institutionName}
          onChange={(e) => setInstName(e.target.value)}
          maxLength={120}
          placeholder="e.g. Sankalp IAS Academy"
          className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </Field>

      <Field
        label="Your name"
        hint="Owner / primary contact who'll administer the listing."
        required
      >
        <input
          type="text"
          autoComplete="name"
          value={adminName}
          onChange={(e) => setAdminName(e.target.value)}
          maxLength={80}
          placeholder="e.g. Rajesh Kumar"
          className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </Field>

      <Field
        label="Email"
        hint="Used to log in. Also shown publicly on your profile as the contact email — students will reach you here."
        required
      >
        <input
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={120}
          placeholder="admissions@sankalp.in"
          className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </Field>

      <Field
        label="Password"
        hint={
          passwordOK
            ? "✓ Looks good."
            : "At least 8 characters with one letter and one number."
        }
        hintColor={passwordOK ? "text-emerald-700" : "text-ink-500"}
        required
      >
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          maxLength={120}
          minLength={8}
          placeholder="At least 8 characters"
          className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />
      </Field>

      {error && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!formValid || submitting}
        className="w-full rounded-md bg-saffron-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:opacity-50"
      >
        {submitting ? "Creating your listing…" : "Create my institution listing →"}
      </button>

      <p className="text-[11px] text-ink-500">
        By signing up you agree we may verify your institution&apos;s existence
        before promoting it. Listing is free for the foreseeable future.
      </p>
    </form>
  );
}

function Field({
  label,
  hint,
  hintColor = "text-ink-500",
  required,
  children,
}: {
  label: string;
  hint?: string;
  hintColor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-ink-800">
        {label}
        {required && <span className="ml-1 text-rose-600">*</span>}
      </span>
      <div className="mt-1">{children}</div>
      {hint && <p className={`mt-1 text-[11px] ${hintColor}`}>{hint}</p>}
    </label>
  );
}
