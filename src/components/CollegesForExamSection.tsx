// Top colleges that admit via a given exam.
//
// Rendered on every /exams/[code] page right next to ScholarshipsForExamSection.
// Drives the "I'm prepping for X — where can I actually go?" intent into
// our colleges section, and gives us a strong internal SEO crosslink.
//
// Server Component. No DB queries — uses the curated NIRF dataset.

import Link from "next/link";
import { COLLEGES, type CollegeStream, formatNirfRanks } from "@/lib/colleges-data";
import { stateInfo } from "@/lib/state-info";

// Map ExamCategory → CollegeStream. Drives "show colleges for this exam".
const EXAM_TO_STREAM: Record<string, CollegeStream> = {
  ENGINEERING:    "engineering",
  MEDICAL:        "medical",
  MBA:            "management",
  LAW:            "law",
  UNIVERSITY:     "university",
};

// Specific exam codes that map to a different stream than their category
// suggests (e.g., GATE category is GOVT_JOBS in our schema but it's a
// PG engineering entrance, so it should surface engineering colleges).
const EXAM_CODE_OVERRIDES: Record<string, CollegeStream> = {
  GATE:          "engineering",
  CAT:           "management",
  XAT:           "management",
  CMAT:          "management",
  SNAP:          "management",
  CLAT:          "law",
  AILET:         "law",
  CLAT_PG:       "law",
  NEET_PG:       "medical",
  NEET_SS:       "medical",
  JEE_MAIN:      "engineering",
  JEE_ADVANCED:  "engineering",
  BITSAT:        "engineering",
  VITEEE:        "engineering",
  KCET:          "engineering",
  WBJEE:         "engineering",
  MHT_CET:       "engineering",
  AP_EAPCET:     "engineering",
  TS_EAMCET:     "engineering",
  IPMAT:         "management",
};

export function CollegesForExamSection({
  examCode,
  examShortName,
  examCategory,
}: {
  examCode: string;
  examShortName: string;
  examCategory: string;
}) {
  const stream =
    EXAM_CODE_OVERRIDES[examCode] ?? EXAM_TO_STREAM[examCategory] ?? null;
  if (!stream) return null;

  const matches = COLLEGES.filter((c) => c.streams.includes(stream))
    .sort((a, b) => {
      // Sort by stream-specific NIRF rank where present
      const ar = (a.nirf as any)[stream] ?? a.nirf.overall ?? 999;
      const br = (b.nirf as any)[stream] ?? b.nirf.overall ?? 999;
      return ar - br;
    })
    .slice(0, 5);

  if (matches.length === 0) return null;

  return (
    <div className="mt-6 rounded-lg border border-ink-200 bg-white p-5">
      <h3 className="text-sm font-semibold text-ink-900">
        Top colleges that admit via {examShortName}
      </h3>
      <p className="mt-1 text-xs text-ink-500">
        NIRF {new Date().getUTCFullYear() - 1}-ranked — clear of marketing fluff.
      </p>
      <ul className="mt-3 space-y-2">
        {matches.map((c) => (
          <li key={c.slug}>
            <Link
              href={`/colleges/${c.slug}`}
              className="block rounded-md border border-ink-100 bg-ink-50/40 p-3 transition-colors hover:border-saffron-400 hover:bg-saffron-50/40"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-ink-900">{c.shortName}</p>
                <span className="text-[10px] text-ink-500">{c.city}</span>
              </div>
              <p className="mt-0.5 text-[11px] text-ink-500">
                {stateInfo(c.state)?.name ?? c.state} · {c.type}
              </p>
              {formatNirfRanks(c.nirf) && (
                <p className="mt-1 text-[10px] font-medium text-saffron-700">
                  {formatNirfRanks(c.nirf)}
                </p>
              )}
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href={`/colleges/stream/${stream}`}
        className="mt-3 inline-flex text-xs font-medium text-saffron-700 hover:text-saffron-800"
      >
        See all {stream} colleges →
      </Link>
    </div>
  );
}
