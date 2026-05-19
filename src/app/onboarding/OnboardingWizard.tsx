"use client";

// Onboarding wizard — 3 steps in a single client component.
//
// Step 1: pick stage (radio cards).
// Step 2: pick state (searchable select).
// Step 3: pick prep targets (multi-select chips; pre-suggested from stage).
//
// Each step shows progress at the top, "Back" and "Next" controls at
// the bottom. The final Submit posts to /api/me/onboarding-profile,
// then router.push('/') to the personalised homepage.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { STAGE_OPTIONS, statesForWizard } from "@/lib/onboarding-options";

interface ExamLite {
  code: string;
  shortName: string;
  name: string;
  category: string;
}

export function OnboardingWizard({ exams }: { exams: ExamLite[] }) {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  const [stage, setStage] = useState<string>("");
  const [state, setState] = useState<string>("");
  const [prepCodes, setPrepCodes] = useState<string[]>([]);
  const [examQuery, setExamQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const stageOption = STAGE_OPTIONS.find((s) => s.value === stage);
  const allStates = useMemo(() => statesForWizard(), []);

  // Pre-suggest exams based on stage; show them at top of step 3 list.
  const suggestedExams = useMemo(() => {
    if (!stageOption) return [];
    const set = new Set(stageOption.suggestedPrepCodes);
    return exams.filter((e) => set.has(e.code));
  }, [stageOption, exams]);

  const filteredExams = useMemo(() => {
    const q = examQuery.trim().toLowerCase();
    if (!q) return exams;
    return exams.filter(
      (e) =>
        e.shortName.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        e.code.toLowerCase().includes(q),
    );
  }, [examQuery, exams]);

  function toggleExam(code: string) {
    setPrepCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  function next() {
    setError(null);
    if (stepIdx === 0) {
      if (!stage) {
        setError("Pick where you are in your journey to continue.");
        return;
      }
      // Pre-populate prep codes from suggested set the first time.
      if (prepCodes.length === 0) {
        const opt = STAGE_OPTIONS.find((s) => s.value === stage);
        if (opt) setPrepCodes(opt.suggestedPrepCodes);
      }
    }
    setStepIdx((i) => Math.min(i + 1, 2));
  }

  function back() {
    setError(null);
    setStepIdx((i) => Math.max(i - 1, 0));
  }

  function submit() {
    setError(null);
    if (!stage) {
      setError("Pick where you are in your journey.");
      setStepIdx(0);
      return;
    }
    startTransition(async () => {
      const res = await fetch("/api/me/onboarding-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage, state, prepCodes }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Save failed (${res.status})`);
        return;
      }
      router.push("/");
      router.refresh();
    });
  }

  function skip() {
    startTransition(async () => {
      // Skip writes the stage as "OTHER" + completed=NOW so the wizard
      // doesn't reappear. User can still revisit /me/settings to set it.
      await fetch("/api/me/onboarding-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage: "OTHER", state: "", prepCodes: [] }),
      });
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="mt-8 rounded-lg border border-ink-200 bg-white p-6 shadow-sm">
      {/* Progress */}
      <div className="flex items-center gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= stepIdx ? "bg-saffron-500" : "bg-ink-200"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-500">Step {stepIdx + 1} of 3</p>

      <div className="mt-5">
        {stepIdx === 0 && (
          <Step1 stage={stage} setStage={setStage} />
        )}
        {stepIdx === 1 && (
          <Step2 state={state} setState={setState} options={allStates} />
        )}
        {stepIdx === 2 && (
          <Step3
            stage={stageOption?.label ?? "your stage"}
            prepCodes={prepCodes}
            toggleExam={toggleExam}
            examQuery={examQuery}
            setExamQuery={setExamQuery}
            suggestedExams={suggestedExams}
            filteredExams={filteredExams}
          />
        )}
      </div>

      {error && <p className="mt-4 text-xs text-rose-700">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={skip}
          disabled={pending}
          className="text-xs text-ink-500 hover:text-ink-800 hover:underline disabled:opacity-50"
        >
          Skip for now
        </button>
        <div className="flex gap-2">
          {stepIdx > 0 && (
            <button
              type="button"
              onClick={back}
              disabled={pending}
              className="rounded-md border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-50"
            >
              Back
            </button>
          )}
          {stepIdx < 2 ? (
            <button
              type="button"
              onClick={next}
              disabled={pending}
              className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600 disabled:opacity-50"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={pending}
              className="rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white hover:bg-saffron-600 disabled:opacity-50"
            >
              {pending ? "Saving…" : "Finish setup ✓"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Step renderers ──────────────────────────────────────────────────────

function Step1({ stage, setStage }: { stage: string; setStage: (v: string) => void }) {
  return (
    <>
      <h2 className="text-lg font-semibold text-ink-900">Where are you right now?</h2>
      <p className="mt-1 text-xs text-ink-600">
        We use this to surface the right kind of content first.
      </p>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {STAGE_OPTIONS.map((opt) => {
          const active = stage === opt.value;
          return (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => setStage(opt.value)}
                className={`flex w-full flex-col items-start gap-1 rounded-lg border px-4 py-3 text-left transition-colors ${
                  active
                    ? "border-saffron-500 bg-saffron-50"
                    : "border-ink-200 bg-white hover:border-saffron-400"
                }`}
                aria-pressed={active}
              >
                <span className="text-sm font-semibold text-ink-900">{opt.label}</span>
                <span className="text-[11px] text-ink-600">{opt.description}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </>
  );
}

function Step2({
  state,
  setState,
  options,
}: {
  state: string;
  setState: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <>
      <h2 className="text-lg font-semibold text-ink-900">Which state are you in?</h2>
      <p className="mt-1 text-xs text-ink-600">
        We'll surface your state's scholarships, board exam info, and any state-level exams. Optional — skip if you'd rather not say.
      </p>
      <select
        value={state}
        onChange={(e) => setState(e.target.value)}
        className="mt-4 w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
      >
        <option value="">— Prefer not to say —</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      {state && (
        <p className="mt-2 text-[11px] text-ink-500">
          You can change this anytime in /me/settings.
        </p>
      )}
    </>
  );
}

function Step3({
  stage,
  prepCodes,
  toggleExam,
  examQuery,
  setExamQuery,
  suggestedExams,
  filteredExams,
}: {
  stage: string;
  prepCodes: string[];
  toggleExam: (code: string) => void;
  examQuery: string;
  setExamQuery: (q: string) => void;
  suggestedExams: ExamLite[];
  filteredExams: ExamLite[];
}) {
  const showSuggested = examQuery.trim() === "" && suggestedExams.length > 0;
  const showList = examQuery.trim() !== "" ? filteredExams : filteredExams.slice(0, 30);
  return (
    <>
      <h2 className="text-lg font-semibold text-ink-900">What are you preparing for?</h2>
      <p className="mt-1 text-xs text-ink-600">
        Pick any exams you're targeting. Selections become your personalised dashboard. Skip if you're just exploring.
      </p>

      {showSuggested && (
        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-500">
            Suggested for {stage}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestedExams.map((e) => {
              const active = prepCodes.includes(e.code);
              return (
                <ExamChip key={e.code} exam={e} active={active} onToggle={toggleExam} />
              );
            })}
          </div>
        </div>
      )}

      <div className="mt-4">
        <input
          type="search"
          value={examQuery}
          onChange={(e) => setExamQuery(e.target.value)}
          placeholder="Search 100+ exams (UPSC, GATE, SSC, NEET, CAT, IBPS…)"
          className="w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none focus:ring-1 focus:ring-saffron-500"
        />
      </div>

      <div className="mt-3 max-h-64 overflow-y-auto rounded-md border border-ink-200 bg-ink-50/30 p-2">
        {showList.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-ink-500">No exams match "{examQuery}".</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {showList.map((e) => {
              const active = prepCodes.includes(e.code);
              return <ExamChip key={e.code} exam={e} active={active} onToggle={toggleExam} />;
            })}
          </div>
        )}
      </div>

      {prepCodes.length > 0 && (
        <p className="mt-3 text-[11px] text-ink-500">
          <strong className="text-ink-700 tabular-nums">{prepCodes.length}</strong>{" "}
          exam{prepCodes.length === 1 ? "" : "s"} selected.
        </p>
      )}
    </>
  );
}

function ExamChip({
  exam,
  active,
  onToggle,
}: {
  exam: ExamLite;
  active: boolean;
  onToggle: (code: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(exam.code)}
      className={
        active
          ? "rounded-full border border-saffron-500 bg-saffron-500 px-3 py-1 text-[11px] font-medium text-white"
          : "rounded-full border border-ink-300 bg-white px-3 py-1 text-[11px] text-ink-700 hover:border-saffron-400"
      }
      aria-pressed={active}
      title={exam.name}
    >
      {exam.shortName}
    </button>
  );
}
