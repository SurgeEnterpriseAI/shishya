"use client";

// SaveScholarshipButton — adds/removes a scholarship from the user's
// browser-local saved list AND fires the SCHOLARSHIP_SAVED analytics
// event the first time the user saves a given scholarship.
//
// No DB persistence yet — saved scholarships live in localStorage so
// we ship instantly without a new table. Future: when the saved-list
// hits real engagement, migrate to a SavedScholarship table.

import { useEffect, useState } from "react";

const STORAGE_KEY = "shishya:saved-scholarships";

function loadSaved(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function persistSaved(ids: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

export function SaveScholarshipButton({
  scholarshipId,
  scholarshipName,
}: {
  scholarshipId: string;
  scholarshipName: string;
}) {
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSaved(loadSaved().includes(scholarshipId));
    setHydrated(true);
  }, [scholarshipId]);

  function toggle() {
    const all = loadSaved();
    if (saved) {
      const next = all.filter((id) => id !== scholarshipId);
      persistSaved(next);
      setSaved(false);
    } else {
      const next = [...all.filter((id) => id !== scholarshipId), scholarshipId];
      persistSaved(next);
      setSaved(true);
      // Fire analytics ONLY on save (not on un-save), so the metric
      // tracks interest rather than churn.
      window.shishyaTrack?.("SCHOLARSHIP_SAVED", {
        scholarshipId,
        scholarshipName,
      });
    }
  }

  if (!hydrated) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-500"
      >
        ☆ Save
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={
        saved
          ? "inline-flex items-center gap-1 rounded-md border border-saffron-500 bg-saffron-50 px-3 py-1.5 text-xs font-medium text-saffron-800"
          : "inline-flex items-center gap-1 rounded-md border border-ink-300 px-3 py-1.5 text-xs font-medium text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
      }
      aria-pressed={saved}
    >
      {saved ? "★ Saved" : "☆ Save"}
    </button>
  );
}
