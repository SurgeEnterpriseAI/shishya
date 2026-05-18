"use client";

// Match Wizard — step-by-step picker for the student profile, then
// renders the top-ranked matches.
//
// We persist the answers to localStorage so a student doesn't lose
// their selections on refresh. Nothing leaves the browser.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Scholarship, ScholarshipCategory, ScholarshipLevel } from "@/data/scholarships";
import { findMatches, type StudentProfile } from "@/lib/scholarship-match";

const STORAGE_KEY = "shishya:scholarship-match-profile";

const STATES: Array<{ value: string; label: string }> = [
  { value: "", label: "— Select your state —" },
  { value: "AP", label: "Andhra Pradesh" },
  { value: "AR", label: "Arunachal Pradesh" },
  { value: "AS", label: "Assam" },
  { value: "BR", label: "Bihar" },
  { value: "CG", label: "Chhattisgarh" },
  { value: "DL", label: "Delhi" },
  { value: "GA", label: "Goa" },
  { value: "GJ", label: "Gujarat" },
  { value: "HR", label: "Haryana" },
  { value: "HP", label: "Himachal Pradesh" },
  { value: "JK", label: "J&K + Ladakh" },
  { value: "JH", label: "Jharkhand" },
  { value: "KA", label: "Karnataka" },
  { value: "KL", label: "Kerala" },
  { value: "MP", label: "Madhya Pradesh" },
  { value: "MH", label: "Maharashtra" },
  { value: "MN", label: "Manipur" },
  { value: "ML", label: "Meghalaya" },
  { value: "MZ", label: "Mizoram" },
  { value: "NL", label: "Nagaland" },
  { value: "OD", label: "Odisha" },
  { value: "PB", label: "Punjab" },
  { value: "RJ", label: "Rajasthan" },
  { value: "SK", label: "Sikkim" },
  { value: "TN", label: "Tamil Nadu" },
  { value: "TS", label: "Telangana" },
  { value: "TR", label: "Tripura" },
  { value: "UK", label: "Uttarakhand" },
  { value: "UP", label: "Uttar Pradesh" },
  { value: "WB", label: "West Bengal" },
];

const CATEGORIES: Array<{ value: ScholarshipCategory | ""; label: string; help: string }> = [
  { value: "",    label: "Prefer not to say",   help: "Wizard surfaces general + restricted schemes with warnings" },
  { value: "GEN", label: "General",             help: "No reservation-based scheme will be highlighted" },
  { value: "OBC", label: "OBC",                 help: "Other Backward Classes" },
  { value: "SC",  label: "SC",                  help: "Scheduled Caste" },
  { value: "ST",  label: "ST",                  help: "Scheduled Tribe" },
  { value: "EWS", label: "EWS",                 help: "Economically Weaker Section (general category)" },
  { value: "MIN", label: "Minority",            help: "Muslim / Christian / Sikh / Buddhist / Parsi / Jain" },
];

const GENDERS: Array<{ value: "" | "F" | "M"; label: string }> = [
  { value: "",  label: "Prefer not to say" },
  { value: "F", label: "Female / Girl" },
  { value: "M", label: "Male / Boy" },
];

const LEVELS: Array<{ value: ScholarshipLevel | ""; label: string }> = [
  { value: "",            label: "— Select your level —" },
  { value: "CLASS_9_10",  label: "Class 9 / 10" },
  { value: "CLASS_11_12", label: "Class 11 / 12" },
  { value: "DIPLOMA",     label: "Diploma / ITI" },
  { value: "UG",          label: "Undergraduate (BA / BSc / BTech / MBBS)" },
  { value: "PG",          label: "Postgraduate (MA / MSc / MTech / MD)" },
  { value: "PHD",         label: "PhD / Research" },
];

const INCOMES: Array<{ value: string; label: string }> = [
  { value: "",   label: "Prefer not to say" },
  { value: "1",  label: "Under ₹1 lakh / year" },
  { value: "2",  label: "₹1 – ₹2 lakh / year" },
  { value: "2.5",label: "₹2 – ₹2.5 lakh / year" },
  { value: "5",  label: "₹2.5 – ₹5 lakh / year" },
  { value: "8",  label: "₹5 – ₹8 lakh / year" },
  { value: "12", label: "₹8 – ₹12 lakh / year" },
  { value: "99", label: "Above ₹12 lakh / year" },
];

const EXAMS: Array<{ value: string; label: string }> = [
  { value: "JEE_MAIN",      label: "JEE Main" },
  { value: "JEE_ADVANCED",  label: "JEE Advanced" },
  { value: "NEET_UG",       label: "NEET UG" },
  { value: "UPSC_PRELIMS",  label: "UPSC Civil Services" },
  { value: "CLAT",          label: "CLAT" },
  { value: "CAT",           label: "CAT" },
  { value: "GATE",          label: "GATE" },
];

interface SavedProfile {
  state: string;
  category: string;
  gender: string;
  level: string;
  income: string;
  examCodes: string[];
}

const EMPTY: SavedProfile = {
  state: "",
  category: "",
  gender: "",
  level: "",
  income: "",
  examCodes: [],
};

export function MatchWizard({ scholarships }: { scholarships: Scholarship[] }) {
  const [profile, setProfile] = useState<SavedProfile>(EMPTY);
  const [submitted, setSubmitted] = useState(false);

  // Hydrate from localStorage once.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SavedProfile>;
        setProfile({ ...EMPTY, ...parsed });
        setSubmitted(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  function setField<K extends keyof SavedProfile>(key: K, value: SavedProfile[K]) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function toggleExam(code: string) {
    setProfile((p) => ({
      ...p,
      examCodes: p.examCodes.includes(code)
        ? p.examCodes.filter((e) => e !== code)
        : [...p.examCodes, code],
    }));
  }

  function submit() {
    setSubmitted(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      /* localStorage full or disabled — fine */
    }
  }

  function reset() {
    setProfile(EMPTY);
    setSubmitted(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  const studentProfile: StudentProfile = useMemo(() => ({
    state: profile.state || null,
    category: (profile.category || null) as ScholarshipCategory | null,
    gender: (profile.gender || null) as "F" | "M" | null,
    level: (profile.level || null) as ScholarshipLevel | null,
    incomeLakhs: profile.income ? Number(profile.income) : null,
    examCodes: profile.examCodes,
  }), [profile]);

  const matches = useMemo(
    () => (submitted ? findMatches(studentProfile, scholarships) : []),
    [submitted, studentProfile, scholarships],
  );

  // Track which questions are mandatory-ish — we require LEVEL for any
  // useful match; everything else can be "prefer not to say".
  const canSubmit = profile.level !== "";

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-3">
      {/* LEFT: form */}
      <div className="lg:col-span-1">
        <div className="rounded-lg border border-ink-200 bg-white p-5">
          <h2 className="text-base font-semibold text-ink-900">Tell us about you</h2>
          <p className="mt-1 text-[11px] text-ink-500">
            All fields optional except level. Skip anything you don't want
            to share.
          </p>

          <div className="mt-4 space-y-4">
            <Field label="State" value={profile.state} onChange={(v) => setField("state", v)} options={STATES} />
            <Field
              label="Level *"
              value={profile.level}
              onChange={(v) => setField("level", v)}
              options={LEVELS}
              required
            />
            <Field
              label="Category"
              value={profile.category}
              onChange={(v) => setField("category", v)}
              options={CATEGORIES.map((c) => ({ value: c.value, label: c.label }))}
              help={CATEGORIES.find((c) => c.value === profile.category)?.help}
            />
            <Field
              label="Gender"
              value={profile.gender}
              onChange={(v) => setField("gender", v)}
              options={GENDERS}
              help="Girls-only schemes will be highlighted when applicable"
            />
            <Field
              label="Family annual income"
              value={profile.income}
              onChange={(v) => setField("income", v)}
              options={INCOMES}
            />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
                Exams you've cleared / are preparing for
              </p>
              <p className="mt-1 text-[11px] text-ink-500">Optional. Helps surface exam-specific scholarships.</p>
              <div className="mt-2 flex flex-wrap gap-1">
                {EXAMS.map((e) => {
                  const active = profile.examCodes.includes(e.value);
                  return (
                    <button
                      key={e.value}
                      type="button"
                      onClick={() => toggleExam(e.value)}
                      className={
                        active
                          ? "rounded-full border border-saffron-500 bg-saffron-500 px-2.5 py-1 text-[11px] font-medium text-white"
                          : "rounded-full border border-ink-300 bg-white px-2.5 py-1 text-[11px] text-ink-700 hover:border-saffron-400"
                      }
                    >
                      {e.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600 disabled:cursor-not-allowed disabled:bg-ink-300"
            >
              {submitted ? "Update matches" : "Find scholarships"}
            </button>
            {submitted && (
              <button
                type="button"
                onClick={reset}
                className="text-xs text-ink-500 hover:text-ink-800 hover:underline"
              >
                Reset
              </button>
            )}
          </div>
          {!canSubmit && (
            <p className="mt-2 text-[11px] text-rose-700">Select your level to continue.</p>
          )}
        </div>
      </div>

      {/* RIGHT: results */}
      <div className="lg:col-span-2">
        {!submitted ? (
          <div className="rounded-lg border border-dashed border-ink-300 bg-white p-8 text-center text-sm text-ink-600">
            <p className="font-semibold text-ink-800">Your matches will appear here.</p>
            <p className="mt-1 text-xs">
              We only need your education level to start. Everything else
              refines the ranking.
            </p>
          </div>
        ) : matches.length === 0 ? (
          <div className="rounded-lg border border-rose-200 bg-rose-50/30 p-6 text-sm text-ink-800">
            <p className="font-semibold">No matches found.</p>
            <p className="mt-2 text-xs">
              Try removing constraints — your income band, exams, or
              category may be excluding everything. Or browse the full
              catalogue at{" "}
              <Link href="/scholarships" className="text-saffron-700 underline">
                /scholarships
              </Link>.
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-ink-700">
              <strong className="text-ink-900">{matches.length}</strong>{" "}
              scholarship{matches.length === 1 ? "" : "s"} match your profile.
              Highest-relevance first.
            </p>
            <ul className="mt-4 space-y-3">
              {matches.map((m) => (
                <MatchCard key={m.scholarship.id} match={m} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  options,
  required,
  help,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
  required?: boolean;
  help?: string;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-500">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-ink-300 px-2.5 py-1.5 text-sm focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
        required={required}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {help && <p className="mt-1 text-[10px] text-ink-500">{help}</p>}
    </label>
  );
}

function MatchCard({ match }: { match: ReturnType<typeof findMatches>[number] }) {
  const s = match.scholarship;
  return (
    <li className="rounded-lg border border-ink-200 bg-white p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold text-ink-900">
          <Link href={`/scholarships/${s.id}`} className="hover:text-saffron-800">
            {s.name}
          </Link>
        </h3>
        <span className="rounded bg-saffron-100 px-2 py-0.5 text-[10px] font-medium text-saffron-800">
          {s.type.replace(/_/g, " ")}
        </span>
      </div>
      <p className="mt-0.5 text-xs text-ink-500">{s.awardingBody}</p>
      <p className="mt-2 text-sm text-ink-700">{s.description}</p>

      {match.matchReasons.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-1">
          {match.matchReasons.map((r, i) => (
            <li
              key={i}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-800"
            >
              ✓ {r}
            </li>
          ))}
        </ul>
      )}

      {match.warnings.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1">
          {match.warnings.map((w, i) => (
            <li
              key={i}
              className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800"
            >
              ⚠ {w}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap items-baseline gap-3">
        <a
          href={s.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-saffron-600"
        >
          Apply on official portal ↗
        </a>
        <span className="text-[11px] text-ink-500">
          Amount: <span className="text-ink-700">{s.amount}</span> · {s.deadline}
        </span>
      </div>
    </li>
  );
}
