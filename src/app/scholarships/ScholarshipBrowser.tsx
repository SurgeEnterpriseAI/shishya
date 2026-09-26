"use client";

// Filter UI + card grid for the /scholarships page. Client component so
// filtering is instant (no server round-trip) — the data is static and
// already shipped to the browser via the server component's prop.
//
// 26 Sep 2026: every card title links its own page, /scholarships/{id}
// (src/app/scholarships/[id]/page.tsx; generateStaticParams maps the same
// s.id). The 208 detail pages were in the sitemap but no page linked them —
// crawlers and students reached them only through search. The official
// apply / awarding-body links stay on the card.
// 26 Sep 2026 (G4): "Ready lists" — plain links to the crawlable list pages
// (/scholarships/for/{filter}, /scholarships/closing-soon), passed in by the
// server page with their computed counts (this client file does not import
// the list module, so the catalogue ships once). A discontinued scheme
// (Scholarship.closed) is labelled on its card and has no apply button.

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Scholarship, ScholarshipType, ScholarshipCategory, ScholarshipLevel } from "@/data/scholarships";

// State codes used in our data. Lifted into a constant so the dropdown
// is exhaustive and ordered. ALL = no state filter (default).
const STATE_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "ALL", label: "All states" },
  { value: "NATIONAL", label: "National only" },
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

const TYPE_FILTERS: Array<{ value: ScholarshipType | "ALL"; label: string }> = [
  { value: "ALL", label: "All types" },
  { value: "CENTRAL", label: "Central govt" },
  { value: "STATE", label: "State govt" },
  { value: "PRIVATE", label: "Private / Foundation" },
  { value: "MERIT", label: "Merit-based" },
  { value: "RESEARCH", label: "Research / PhD" },
  { value: "EXAM_SPECIFIC", label: "Exam-specific" },
];

const CATEGORY_FILTERS: Array<{ value: ScholarshipCategory | "ALL"; label: string }> = [
  { value: "ALL", label: "All categories" },
  { value: "GEN", label: "General / Open" },
  { value: "OBC", label: "OBC" },
  { value: "SC", label: "SC" },
  { value: "ST", label: "ST" },
  { value: "EWS", label: "EWS" },
  { value: "MIN", label: "Minority" },
];

const LEVEL_FILTERS: Array<{ value: ScholarshipLevel | "ALL"; label: string }> = [
  { value: "ALL", label: "All levels" },
  { value: "CLASS_9_10", label: "Class 9–10" },
  { value: "CLASS_11_12", label: "Class 11–12" },
  { value: "DIPLOMA", label: "Diploma / ITI" },
  { value: "UG", label: "Undergraduate" },
  { value: "PG", label: "Postgraduate" },
  { value: "PHD", label: "PhD / Research" },
];

const GENDER_FILTERS: Array<{ value: "ALL" | "F" | "M"; label: string }> = [
  { value: "ALL", label: "Any gender" },
  { value: "F", label: "Girls / Women only" },
];

/** A ready list the server page links (26 Sep 2026, G4). */
export interface ReadyListLink {
  href: string;
  label: string;
  count: number;
}

// 26 Sep 2026 (repair): readonly — the page passes SCHOLARSHIP_SCHEMES (src/lib/scholarship-schemes.ts).
export function ScholarshipBrowser({ scholarships, lists = [] }: { scholarships: readonly Scholarship[]; lists?: readonly ReadyListLink[] }) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<string>("ALL");
  const [type, setType] = useState<ScholarshipType | "ALL">("ALL");
  const [category, setCategory] = useState<ScholarshipCategory | "ALL">("ALL");
  const [level, setLevel] = useState<ScholarshipLevel | "ALL">("ALL");
  const [gender, setGender] = useState<"ALL" | "F" | "M">("ALL");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return scholarships.filter((s) => {
      // STATE: ALL passes all; NATIONAL only allows state=null; specific code matches state OR national.
      if (state === "NATIONAL" && s.state !== null) return false;
      if (state !== "ALL" && state !== "NATIONAL") {
        if (s.state !== null && s.state !== state) return false;
      }
      if (type !== "ALL" && s.type !== type) return false;
      if (level !== "ALL" && !s.levels.includes(level)) return false;
      if (category !== "ALL") {
        // Untyped eligibility.categories means "open to anyone" — passes every category filter.
        if (s.eligibility.categories && !s.eligibility.categories.includes(category)) return false;
      }
      if (gender !== "ALL") {
        // s.eligibility.gender=null means "any" — passes both gender filters.
        if (s.eligibility.gender && s.eligibility.gender !== gender) return false;
      }
      if (needle) {
        const hay = [
          s.name,
          s.awardingBody,
          s.description,
          s.eligibility.note ?? "",
          s.tags.join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      return true;
    });
  }, [scholarships, q, state, type, category, level, gender]);

  const clearAll = () => {
    setQ("");
    setState("ALL");
    setType("ALL");
    setCategory("ALL");
    setLevel("ALL");
    setGender("ALL");
  };
  const activeFilterCount =
    (state !== "ALL" ? 1 : 0) +
    (type !== "ALL" ? 1 : 0) +
    (category !== "ALL" ? 1 : 0) +
    (level !== "ALL" ? 1 : 0) +
    (gender !== "ALL" ? 1 : 0) +
    (q.trim() ? 1 : 0);

  return (
    <div className="mt-8">
      {lists.length > 0 && (
        <nav aria-label="Ready scholarship lists" className="mb-4 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-ink-500">Ready lists:</span>
          {lists.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full border border-ink-200 bg-white px-3 py-1 text-ink-700 hover:border-saffron-400 hover:bg-saffron-50/30"
            >
              {l.label} <span className="text-[10px] text-ink-500">{l.count}</span>
            </Link>
          ))}
        </nav>
      )}
      {/* Search + filter row */}
      <div className="rounded-lg border border-ink-200 bg-white p-4 shadow-sm">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, awarding body, or keyword (e.g. 'engineering', 'girls', 'reliance')"
          className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
        />

        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <Select label="State" value={state} onChange={setState} options={STATE_OPTIONS} />
          <Select label="Type" value={type} onChange={(v) => setType(v as any)} options={TYPE_FILTERS} />
          <Select label="Level" value={level} onChange={(v) => setLevel(v as any)} options={LEVEL_FILTERS} />
          <Select label="Category" value={category} onChange={(v) => setCategory(v as any)} options={CATEGORY_FILTERS} />
          <Select label="Gender" value={gender} onChange={(v) => setGender(v as any)} options={GENDER_FILTERS} />
        </div>

        {activeFilterCount > 0 && (
          <div className="mt-3 flex items-center justify-between text-xs">
            <p className="text-ink-600">
              <span className="font-semibold text-ink-900">{filtered.length}</span>{" "}
              of {scholarships.length} scholarships match
            </p>
            <button
              onClick={clearAll}
              className="font-medium text-saffron-700 hover:text-saffron-800 hover:underline"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <p className="mt-8 rounded-md border border-dashed border-ink-300 bg-white px-4 py-8 text-center text-sm text-ink-500">
          No scholarships match these filters. Try removing one.
        </p>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((s) => (
            <ScholarshipCard key={s.id} s={s} />
          ))}
        </ul>
      )}

      <p className="mt-10 text-xs text-ink-500">
        Don&apos;t see your scholarship? Tell us via the feedback widget — we&apos;ll add it.
        For the broadest discovery beyond this curated list, try the{" "}
        <a
          href="https://www.buddy4study.com/scholarships"
          target="_blank"
          rel="noopener noreferrer"
          className="text-saffron-700 underline hover:text-saffron-800"
        >
          Buddy4Study aggregator
        </a>{" "}
        {/* 26 Sep 2026: "800+ active" was a third party's count we never checked. */}
        for a wider list.
      </p>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-ink-300 bg-white px-2 py-1.5 text-xs focus:border-saffron-500 focus:outline-none focus:ring-2 focus:ring-saffron-200"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

const TYPE_TONE: Record<ScholarshipType, string> = {
  CENTRAL: "bg-blue-100 text-blue-800",
  STATE: "bg-emerald-100 text-emerald-800",
  PRIVATE: "bg-purple-100 text-purple-800",
  EXAM_SPECIFIC: "bg-saffron-100 text-saffron-800",
  MERIT: "bg-amber-100 text-amber-800",
  RESEARCH: "bg-rose-100 text-rose-800",
};

function ScholarshipCard({ s }: { s: Scholarship }) {
  return (
    <li className="flex flex-col rounded-lg border border-ink-200 bg-white p-5 shadow-sm hover:border-saffron-300 hover:shadow-md transition">
      <div className="flex flex-wrap items-baseline gap-2">
        <h2 className="text-base font-semibold text-ink-900">
          <Link href={`/scholarships/${s.id}`} className="hover:text-saffron-800 hover:underline">
            {s.name}
          </Link>
        </h2>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_TONE[s.type]}`}>
          {s.type.replace("_", " ")}
        </span>
        {s.closed && (
          <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-medium text-rose-800">Discontinued</span>
        )}
      </div>
      <p className="mt-0.5 text-xs text-ink-500">{s.awardingBody}</p>

      <p className="mt-3 text-sm text-ink-700">{s.description}</p>

      <dl className="mt-4 space-y-1.5 text-xs">
        <Row label="Amount" value={s.amount} highlight />
        <Row label="Levels" value={s.levels.map((l) => prettyLevel(l)).join(" · ")} />
        {s.eligibility.note && <Row label="Eligibility" value={s.eligibility.note} />}
        {s.eligibility.categories && (
          <Row label="Categories" value={s.eligibility.categories.join(", ")} />
        )}
        {s.eligibility.gender && (
          <Row label="Gender" value={s.eligibility.gender === "F" ? "Girls / Women only" : "Boys / Men only"} />
        )}
        {s.eligibility.incomeMaxLakhs && (
          <Row label="Income cap" value={`Family income ≤ ₹${s.eligibility.incomeMaxLakhs} lakh/year`} />
        )}
        {s.eligibility.minMarksPct && (
          <Row label="Min marks" value={`${s.eligibility.minMarksPct}%`} />
        )}
        {/* 26 Sep 2026 (G4): this year's date only as read on the official portal, with its tier and check day. */}
        {s.cycle?.closesOn && (
          <Row label="2026-27 last date" value={`${isoDayLabel(s.cycle.closesOn)} (${s.cycle.tier}, checked ${isoDayLabel(s.cycle.checkedOn)})`} highlight />
        )}
        <Row label="Usual window" value={s.deadline} />
      </dl>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        {s.closed ? (
          <Link href={`/scholarships/${s.id}`} className="text-xs font-medium text-rose-800 hover:underline">
            No new applications — why →
          </Link>
        ) : (
          <a
            href={s.applyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary !py-1.5 !px-3 text-xs"
          >
            Apply on official portal →
          </a>
        )}
        {s.officialSite && s.officialSite !== s.applyUrl && (
          <a
            href={s.officialSite}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-ink-500 hover:text-ink-800 hover:underline"
          >
            About the awarding body
          </a>
        )}
      </div>
    </li>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
        {label}
      </dt>
      <dd className={highlight ? "text-ink-900 font-medium" : "text-ink-700"}>{value}</dd>
    </div>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10-31" → "31 Oct 2026" (the same words as src/lib/scholarship-lists.ts formatIsoDay; no clock). */
function isoDayLabel(day: string): string {
  const [y, m, d] = day.split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

function prettyLevel(l: ScholarshipLevel): string {
  switch (l) {
    case "CLASS_9_10": return "Class 9–10";
    case "CLASS_11_12": return "Class 11–12";
    case "DIPLOMA": return "Diploma";
    case "UG": return "UG";
    case "PG": return "PG";
    case "PHD": return "PhD";
  }
}
