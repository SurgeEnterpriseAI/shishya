"use client";

import { useState, useTransition } from "react";
import Link from "next/link";

const HANDLE_PATTERN = /^[a-z0-9_-]{3,30}$/;

interface Props {
  initialProfilePublic: boolean;
  initialHandle: string;
}

export function ProfileSettingsForm({ initialProfilePublic, initialHandle }: Props) {
  const [profilePublic, setProfilePublic] = useState(initialProfilePublic);
  const [handle, setHandle] = useState(initialHandle);
  const [savedHandle, setSavedHandle] = useState(initialHandle);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleValid = !handle || HANDLE_PATTERN.test(handle);
  const canGoPublic = profilePublic ? handle.length > 0 && handleValid : true;

  function save() {
    setError(null);
    setSuccess(null);
    if (profilePublic && !handle) {
      setError("Pick a handle before making your profile public.");
      return;
    }
    if (handle && !HANDLE_PATTERN.test(handle)) {
      setError("Handle must be 3–30 characters: lowercase letters, digits, dashes or underscores.");
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/me/profile-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profilePublic, handle: handle || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Save failed (${res.status})`);
        return;
      }
      setSavedHandle(handle);
      setSuccess(
        profilePublic
          ? `Public profile is ON — share /u/${handle}`
          : "Public profile is OFF. The page is no longer reachable.",
      );
    });
  }

  return (
    <div className="mt-6 space-y-6">
      {/* Privacy toggle */}
      <div className="rounded-lg border border-ink-200 bg-white p-5">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-ink-900">Public profile</h2>
            <p className="mt-1 text-xs text-ink-600">
              When ON, your verification work is visible at /u/[your handle]
              for anyone with the link. Default OFF.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center">
            <input
              type="checkbox"
              checked={profilePublic}
              onChange={(e) => setProfilePublic(e.target.checked)}
              className="peer sr-only"
            />
            <span className="relative h-6 w-11 rounded-full bg-ink-200 transition-colors peer-checked:bg-saffron-500">
              <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
            </span>
          </label>
        </div>
      </div>

      {/* Handle */}
      <div className="rounded-lg border border-ink-200 bg-white p-5">
        <h2 className="text-base font-semibold text-ink-900">URL handle</h2>
        <p className="mt-1 text-xs text-ink-600">
          Your public profile lives at <code className="rounded bg-ink-100 px-1 text-[11px]">shishya.in/u/[handle]</code>.
          3–30 characters: lowercase letters, digits, dashes or underscores.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="text-sm text-ink-500">shishya.in/u/</span>
          <input
            type="text"
            value={handle}
            onChange={(e) => setHandle(e.target.value.toLowerCase().trim())}
            placeholder="e.g. priya-iit"
            className="flex-1 rounded-md border border-ink-300 px-3 py-1.5 text-sm focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
            maxLength={30}
          />
        </div>
        {!handleValid && handle.length > 0 && (
          <p className="mt-2 text-xs text-rose-700">
            Use lowercase letters, digits, dashes, or underscores. 3–30 chars.
          </p>
        )}
        {savedHandle && (
          <p className="mt-2 text-[11px] text-ink-500">
            Current handle saved: <code className="rounded bg-ink-100 px-1">{savedHandle}</code>{" "}
            {profilePublic && <Link href={`/u/${savedHandle}`} className="text-saffron-700 underline">view ↗</Link>}
          </p>
        )}
      </div>

      {/* Save */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={isPending || !canGoPublic}
          className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600 disabled:cursor-not-allowed disabled:bg-ink-300"
        >
          {isPending ? "Saving..." : "Save settings"}
        </button>
        {error && <p className="text-xs text-rose-700">{error}</p>}
        {success && <p className="text-xs text-emerald-700">{success}</p>}
      </div>
    </div>
  );
}
