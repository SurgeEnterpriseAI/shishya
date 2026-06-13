"use client";

// Empty-state activation surface — the single most important conversion
// lever on the platform.
//
// WHY THIS EXISTS
// Prod funnel (13 Jun 2026): 112 signups, 26% onboarded, 27% started a
// mock. The old flow HARD-REDIRECTED every new signup into a 3-step
// onboarding wizard (stage / state / exam) before they could reach the
// dashboard — 74% bounced at that wall. This component replaces the
// wizard-then-dashboard path with a single screen:
//
//   sign in → dashboard → tap your exam → first question
//
// Tapping an exam launches a 5-question diagnostic immediately (which also
// auto-enrols the user in that exam, so we still capture the one signal
// that matters — what they're preparing for — without the form).
//
// If the user DID onboard earlier, their primary exam is pre-selected so
// it's a true one-click "Start" button.

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiPost } from "@/lib/api";

interface ExamLite {
  code: string;
  shortName: string;
  name: string;
}

export interface QuickStartLabels {
  eyebrow: string;        // "⚡ Start here"
  headline: string;       // "See where you stand in 90 seconds"
  sub: string;            // "5 questions across the syllabus…"
  whichExam: string;      // "Which exam are you preparing for?"
  searchPlaceholder: string;
  startPrefix: string;    // "Start your"
  startSuffix: string;    // "diagnostic →"
  building: string;       // "Building your diagnostic…"
  change: string;         // "change exam"
  noMatch: string;        // "No exams match"
  personalize: string;    // "Want personalised suggestions? Set up your profile"
}

interface Props {
  exams: ExamLite[];          // exams that have content (validated Qs), searchable
  popularCodes: string[];     // default chips, in priority order
  presetCode: string | null;  // primary onboarding pick → one-click
  labels: QuickStartLabels;
}

export function QuickStartDiagnostic({ exams, popularCodes, presetCode, labels }: Props) {
  const router = useRouter();
  const byCode = useMemo(() => new Map(exams.map((e) => [e.code, e])), [exams]);

  const [selected, setSelected] = useState<string | null>(
    presetCode && byCode.has(presetCode) ? presetCode : null,
  );
  const [query, setQuery] = useState("");
  const [busyCode, setBusyCode] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const popular = useMemo(
    () => popularCodes.map((c) => byCode.get(c)).filter((e): e is ExamLite => !!e).slice(0, 6),
    [popularCodes, byCode],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return exams
      .filter(
        (e) =>
          e.shortName.toLowerCase().includes(q) ||
          e.name.toLowerCase().includes(q) ||
          e.code.toLowerCase().includes(q),
      )
      .slice(0, 12);
  }, [query, exams]);

  async function launch(code: string) {
    setErr(null);
    setBusyCode(code);
    try {
      const res = await apiPost<{ mock: { id: string } }>("/api/mocks", {
        examCode: code,
        request: { type: "DIAGNOSTIC", questionCount: 5 },
      });
      router.push(`/mocks/${res.mock.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't start the diagnostic — try again.");
      setBusyCode(null);
    }
  }

  const presetExam = selected ? byCode.get(selected) : null;
  const busy = busyCode !== null;

  return (
    <div className="rounded-2xl border-2 border-saffron-300 bg-gradient-to-br from-saffron-50/80 to-white p-6 sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          {labels.eyebrow}
        </p>
        <h3 className="mt-2 text-xl font-bold text-ink-900 sm:text-2xl">{labels.headline}</h3>
        <p className="mt-2 text-sm text-ink-600">{labels.sub}</p>
      </div>

      {/* Pre-selected exam (onboarded users) → one big button. */}
      {presetExam ? (
        <div className="mx-auto mt-6 max-w-md text-center">
          <button
            type="button"
            onClick={() => launch(presetExam.code)}
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-saffron-500 px-6 py-3.5 text-base font-bold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-saffron-600 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:cursor-wait disabled:opacity-70"
          >
            {busy ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                {labels.building}
              </>
            ) : (
              <>{labels.startPrefix} {presetExam.shortName} {labels.startSuffix}</>
            )}
          </button>
          {!busy && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-3 text-xs text-ink-500 underline-offset-2 hover:text-ink-800 hover:underline"
            >
              {labels.change}
            </button>
          )}
        </div>
      ) : (
        /* No pre-selection → pick an exam; tap launches immediately. */
        <div className="mx-auto mt-6 max-w-2xl">
          <p className="text-center text-sm font-medium text-ink-800">{labels.whichExam}</p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {popular.map((e) => (
              <ExamButton key={e.code} exam={e} busyCode={busyCode} onPick={launch} />
            ))}
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels.searchPlaceholder}
            disabled={busy}
            className="mt-4 w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500 disabled:opacity-60"
          />

          {query.trim() !== "" && (
            <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-ink-200 bg-white p-2">
              {results.length === 0 ? (
                <p className="px-2 py-3 text-center text-xs text-ink-500">
                  {labels.noMatch} &ldquo;{query}&rdquo;.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {results.map((e) => (
                    <ExamButton key={e.code} exam={e} busyCode={busyCode} onPick={launch} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {err && <p className="mt-4 text-center text-xs text-rose-700">{err}</p>}

      <p className="mx-auto mt-6 max-w-2xl text-center text-[11px] text-ink-500">
        <Link href="/onboarding?rerun=1" className="font-medium text-saffron-700 underline-offset-2 hover:underline">
          {labels.personalize}
        </Link>
      </p>
    </div>
  );
}

function ExamButton({
  exam,
  busyCode,
  onPick,
}: {
  exam: ExamLite;
  busyCode: string | null;
  onPick: (code: string) => void;
}) {
  const isBusy = busyCode === exam.code;
  const disabled = busyCode !== null;
  return (
    <button
      type="button"
      onClick={() => onPick(exam.code)}
      disabled={disabled}
      title={exam.name}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        isBusy
          ? "border-saffron-500 bg-saffron-500 text-white"
          : "border-ink-300 bg-white text-ink-800 hover:border-saffron-400 hover:bg-saffron-50/50"
      }`}
    >
      {isBusy && <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
      {exam.shortName}
    </button>
  );
}
