// Rank prediction card.
//
// Server Component — receives the student's mock score + the exam's rank
// bands and renders a single "if you scored this in the real exam, you'd
// be in this band → these outcomes" card.
//
// Caller is responsible for fetching examRankBand rows; this component
// just decides which band matches the score and renders.

import Link from "next/link";

export interface RankBandRow {
  scorePctMin: number;
  scorePctMax: number;
  rankMin: number | null;
  rankMax: number | null;
  label: string;
  outcomes: string;
}

function pickBand(scorePct: number, bands: RankBandRow[]): RankBandRow | null {
  if (bands.length === 0) return null;
  // Bands are sorted by scorePctMin desc — first one whose range contains
  // the score wins. We tolerate small float gaps by allowing the upper
  // bound to be exclusive only when another band's lower bound starts.
  for (const b of bands) {
    if (scorePct >= b.scorePctMin - 1e-9 && scorePct <= b.scorePctMax + 1e-9) return b;
  }
  // Fall back: clamp to nearest band by min distance.
  return bands.slice().sort((a, b) => {
    const da = Math.min(Math.abs(scorePct - a.scorePctMin), Math.abs(scorePct - a.scorePctMax));
    const db = Math.min(Math.abs(scorePct - b.scorePctMin), Math.abs(scorePct - b.scorePctMax));
    return da - db;
  })[0];
}

function renderRank(b: RankBandRow): string {
  if (b.rankMin == null && b.rankMax == null) return "Post-based exam (no numeric rank)";
  if (b.rankMin != null && b.rankMax != null) {
    return `Rank ${b.rankMin.toLocaleString("en-IN")} – ${b.rankMax.toLocaleString("en-IN")}`;
  }
  if (b.rankMin != null) return `Rank ${b.rankMin.toLocaleString("en-IN")}+`;
  if (b.rankMax != null) return `Rank up to ${b.rankMax.toLocaleString("en-IN")}`;
  return "—";
}

export function RankCard({
  scorePct,
  examShortName,
  bands,
  source,
}: {
  scorePct: number; // 0-100
  examShortName: string;
  bands: RankBandRow[];
  source?: string | null;
}) {
  if (bands.length === 0) {
    return null;
  }
  const band = pickBand(scorePct, bands);
  if (!band) return null;

  const lines = band.outcomes
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <section className="rounded-md border border-saffron-200 bg-saffron-50/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-saffron-800">
        Rank prediction · {examShortName}
      </p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-ink-900">{band.label}</p>
      <p className="mt-0.5 text-xs text-ink-600">
        Score band {Math.round(band.scorePctMin)}–{Math.round(band.scorePctMax)}% · {renderRank(band)}
      </p>
      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-500">
          Likely outcomes
        </p>
        <ul className="mt-2 space-y-1 text-sm text-ink-800">
          {lines.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-saffron-600">•</span>
              <span>{l.replace(/^[-*]\s*/, "")}</span>
            </li>
          ))}
        </ul>
      </div>
      {source === "ai-generated:claude" && (
        <p className="mt-3 text-[10px] text-ink-400">
          AI-curated based on historic cut-off patterns. Verify with the official notification before making decisions.
        </p>
      )}
    </section>
  );
}

/** Full ladder of bands — used on the exam landing page. */
export function RankLadder({
  examShortName,
  bands,
  source,
}: {
  examShortName: string;
  bands: RankBandRow[];
  source?: string | null;
}) {
  if (bands.length === 0) return null;
  return (
    <section className="rounded-md border border-ink-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-saffron-800">
        What can I get from {examShortName}?
      </p>
      <p className="mt-1 text-xs text-ink-500">
        Mock-score → expected rank → likely outcome. Use the mocks below to
        find your current band, then plan how many marks you need to climb.
      </p>
      <ul className="mt-3 space-y-3">
        {bands.map((b, i) => (
          <li
            key={i}
            className={`rounded-md border p-3 ${
              i === 0
                ? "border-emerald-200 bg-emerald-50/40"
                : "border-ink-200 bg-white"
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm font-semibold text-ink-900">{b.label}</p>
              <p className="text-xs text-ink-500 tabular-nums">
                {Math.round(b.scorePctMin)}–{Math.round(b.scorePctMax)}% · {renderRank(b)}
              </p>
            </div>
            <ul className="mt-2 space-y-1 text-xs text-ink-700">
              {b.outcomes
                .split(/\r?\n/)
                .map((l) => l.trim())
                .filter(Boolean)
                .map((l, j) => (
                  <li key={j} className="flex gap-2">
                    <span className="text-saffron-600">•</span>
                    <span>{l.replace(/^[-*]\s*/, "")}</span>
                  </li>
                ))}
            </ul>
          </li>
        ))}
      </ul>
      {source === "ai-generated:claude" && (
        <p className="mt-3 text-[10px] text-ink-400">
          AI-curated from historic cut-off patterns. Always verify with the latest official notification before making decisions.
        </p>
      )}
    </section>
  );
}
