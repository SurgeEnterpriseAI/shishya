"use client";

// Onboarding wizard — 4 steps in a single client component.
//
// Step 1: pick stage (radio cards).
// Step 2: pick state (searchable select).
// Step 3: confirm the medium (12 Sep 2026 — language chips, pre-selected
//         from the state via suggestLangForState; one tap confirms; written
//         to User.preferredLang + the shishya-lang cookie).
// Step 4: pick prep targets (multi-select chips; pre-suggested from stage).
//
// Each step shows progress at the top, "Back" and "Next" controls at
// the bottom. The final Submit posts to /api/me/onboarding-profile,
// then router.push to the coach intake (an exam was picked) or to
// redirectAfter (/dashboard) — never the anonymous homepage.
//
// Persona-aware shortcut: when the user lands on /onboarding?p=<slug>
// (via the homepage persona tiles or a /for/[persona] CTA), the page
// passes `prefill` with the persona's stage + suggested exam codes.
// We then render a "These look right — start" 1-click banner at the
// top of step 1; the user can confirm in one click or fall back to
// the regular 4-step flow.

import { useMemo, useState, useTransition } from "react";
import { contextualExamFilter } from "@/lib/exam-aliases";
import { useRouter } from "next/navigation";
import { STAGE_OPTIONS, statesForWizard } from "@/lib/onboarding-options";
import {
  isLanguageCode,
  LANGUAGE_CODES,
  languageToLocale,
  suggestLangForState,
  type LanguageCode,
} from "@/lib/preferred-lang";
import { languageName, STATES } from "@/lib/state-info";

/** Copy for the language step, translated server-side (page.tsx) so the
 *  step itself renders in the student's current UI language. */
export interface LangStepCopy {
  title: string;
  body: string;
  /** Contains "{state}". */
  suggested: string;
  note: string;
  /** Progress line under the bar; contains "{n}" (16 Sep 2026 — it was an
   *  English literal on a wizard whose language step was already
   *  translated). Optional, so a caller without it still gets English. */
  step?: string;
}

const LANG_COPY_EN: LangStepCopy = {
  title: "Which language do you study in?",
  body: "Questions, mock hints and the tutor follow this. Change it anytime from the language menu.",
  suggested: "Suggested for {state}",
  note: "Translated questions are Shishya-translated — cross-check the English when in doubt.",
  step: "Step {n} of 4",
};

const LANG_COOKIE = "shishya-lang";

interface ExamLite {
  code: string;
  shortName: string;
  name: string;
  category: string;
}

export interface PersonaPrefill {
  slug: string;
  label: string;
  pageTitle: string;
  stage: string;
  prepCodes: string[];
}

export function OnboardingWizard({
  exams,
  prefill,
  // Default is the DASHBOARD (23 Aug 2026): a signed-in user finishing or
  // skipping the wizard used to be dropped onto the anonymous homepage.
  redirectAfter = "/dashboard",
  initialLang = null,
  langCopy = LANG_COPY_EN,
}: {
  exams: ExamLite[];
  prefill?: PersonaPrefill | null;
  /**
   * Where to send the user once they skip or finish the wizard without
   * picking an exam. /dashboard (the page passes it too, 16 Sep 2026), so
   * a fresh signup lands on the "Pick your first exam" hero.
   */
  redirectAfter?: string;
  /** A language the student already signalled (stored non-EN
   *  preferredLang, or a non-English cookie). Pre-selects step 3 and
   *  suppresses the state-based suggestion. Null = suggest from state. */
  initialLang?: string | null;
  langCopy?: LangStepCopy;
}) {
  const router = useRouter();
  const [stepIdx, setStepIdx] = useState(0);
  // Pre-fill stage + prep codes from the persona if provided. State
  // stays empty so the wizard's Step 2 still asks for it (state is
  // useful for state-specific exams + scholarships).
  const [stage, setStage] = useState<string>(prefill?.stage ?? "");
  const [state, setState] = useState<string>("");
  // Language step. `langTouched` = the student tapped a chip (or arrived
  // with a real signal), so the state-based suggestion never overrides an
  // explicit choice — including an explicit English.
  const [lang, setLang] = useState<LanguageCode | "">(isLanguageCode(initialLang) ? initialLang : "");
  const [langTouched, setLangTouched] = useState(isLanguageCode(initialLang));
  const [prepCodes, setPrepCodes] = useState<string[]>(prefill?.prepCodes ?? []);
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

  const filteredExams = useMemo(
    // Contextual: "daroga"/"steno"/"shikshak" resolve to the right exams.
    () => contextualExamFilter(examQuery, exams),
    [examQuery, exams],
  );

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
    if (stepIdx === 1 && !langTouched) {
      // Leaving the state step: pre-select the medium from the state
      // (MH → Marathi, AP/TS → Telugu, Hindi belt → Hindi, …). Only a
      // suggestion — step 3 confirms it in one tap.
      setLang(suggestLangForState(state));
    }
    setStepIdx((i) => Math.min(i + 1, 3));
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
        body: JSON.stringify({ stage, state, prepCodes, lang: lang || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Save failed (${res.status})`);
        return;
      }
      // Mirror the confirmed medium into the UI cookie (same write as
      // <LangSwitcher />). An explicit English writes "en" too — the
      // stored EN is otherwise read as "unset" (src/lib/preferred-lang.ts),
      // so this is what keeps an English chooser in English.
      if (lang) {
        try {
          document.cookie = `${LANG_COOKIE}=${languageToLocale(lang) ?? "en"}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
        } catch {
          /* non-DOM env */
        }
      }
      // The consequent flow: they just told us their exam — the single
      // most valuable next step is turning it into a day-by-day plan.
      // The coach intake opens pre-filled with their first pick (exam +
      // official date), so it's ~15 seconds from here. Skipping is one
      // tap (header nav) — no trap.
      if (prepCodes.length > 0) {
        router.push(`/coach?exam=${encodeURIComponent(prepCodes[0])}`);
      } else {
        router.push(redirectAfter);
      }
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
      router.push(redirectAfter);
      router.refresh();
    });
  }

  // 1-click confirm — fires only when a persona prefilled the form.
  // Writes the persona's stage + prep codes directly and skips the
  // 4-step flow. Includes a small analytics ping to track which
  // personas convert here vs in the full wizard. The kind=CTA_CLICKED
  // is the generic ad-hoc event kind; the actual event subtype lives
  // in props so we don't need a schema migration to ship persona
  // analytics.
  function confirmPersona() {
    if (!prefill) return;
    startTransition(async () => {
      try {
        await fetch("/api/analytics", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind: "CTA_CLICKED",
            path: "/onboarding",
            props: {
              event: "persona_onboarding_confirmed",
              persona: prefill.slug,
              stage: prefill.stage,
              prepCodesCount: prefill.prepCodes.length,
            },
          }),
        });
      } catch {
        // analytics failures shouldn't block onboarding
      }
      const res = await fetch("/api/me/onboarding-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: prefill.stage,
          state: "",
          prepCodes: prefill.prepCodes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? `Save failed (${res.status})`);
        return;
      }
      router.push(redirectAfter === "/" ? "/dashboard" : redirectAfter);
      router.refresh();
    });
  }

  return (
    <div className="mt-8 rounded-lg border border-ink-200 bg-white p-6 shadow-sm">
      {/* Persona prefill banner — shown only when /onboarding?p=<slug>
          delivered a recognised persona. Gives the user a 1-click
          confirm path so they don't have to walk through the wizard. */}
      {prefill && (
        <div className="-mt-2 mb-5 rounded-md border border-saffron-300 bg-saffron-50/60 p-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-saffron-800">
            Pre-pinned for {prefill.label.replace(/^I'm\s+/, "")}
          </p>
          <p className="mt-1 text-sm text-ink-800">
            Stage <strong>{stage || prefill.stage}</strong> · {prefill.prepCodes.length}{" "}
            exams pinned. State picker stays in step 2 so we can show
            state-specific exams + scholarships.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={confirmPersona}
              disabled={pending}
              className="btn-primary !py-2 !px-4 text-xs disabled:opacity-60"
            >
              {pending ? "Saving…" : "Looks right — start"}
            </button>
            <span className="text-[11px] text-ink-500">
              or scroll through and customise below
            </span>
          </div>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= stepIdx ? "bg-saffron-500" : "bg-ink-200"
            }`}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-ink-500">
        {(langCopy.step ?? LANG_COPY_EN.step ?? "").replace("{n}", String(stepIdx + 1))}
      </p>

      <div className="mt-5">
        {stepIdx === 0 && (
          <Step1 stage={stage} setStage={setStage} />
        )}
        {stepIdx === 1 && (
          <Step2 state={state} setState={setState} options={allStates} />
        )}
        {stepIdx === 2 && (
          <StepLang
            lang={lang}
            setLang={(v) => {
              setLang(v);
              setLangTouched(true);
            }}
            suggested={suggestLangForState(state)}
            stateName={state ? STATES[state]?.name ?? "" : ""}
            copy={langCopy}
          />
        )}
        {stepIdx === 3 && (
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
          {stepIdx < 3 ? (
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

// Step 3 — the medium. Chips over the ten storable languages, the
// state's suggestion first and pre-selected; one tap changes it, "Continue"
// confirms. English is a chip like any other — an explicit choice, never a
// silent default.
function StepLang({
  lang,
  setLang,
  suggested,
  stateName,
  copy,
}: {
  lang: LanguageCode | "";
  setLang: (v: LanguageCode) => void;
  suggested: LanguageCode;
  stateName: string;
  copy: LangStepCopy;
}) {
  const ordered: LanguageCode[] = [suggested, ...LANGUAGE_CODES.filter((c) => c !== suggested)];
  return (
    <>
      <h2 className="text-lg font-semibold text-ink-900">{copy.title}</h2>
      <p className="mt-1 text-xs text-ink-600">{copy.body}</p>
      {stateName && (
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-wider text-ink-500">
          {copy.suggested.replace("{state}", stateName)}
        </p>
      )}
      <ul className={`${stateName ? "mt-2" : "mt-4"} grid grid-cols-2 gap-2 sm:grid-cols-3`}>
        {ordered.map((code) => {
          const active = lang === code;
          const name = languageName(code);
          return (
            <li key={code}>
              <button
                type="button"
                onClick={() => setLang(code)}
                className={`flex w-full flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors ${
                  active
                    ? "border-saffron-500 bg-saffron-50"
                    : "border-ink-200 bg-white hover:border-saffron-400"
                }`}
                aria-pressed={active}
                lang={code.toLowerCase()}
              >
                <span className="text-sm font-semibold text-ink-900">{name.native}</span>
                {name.en !== name.native && (
                  <span className="text-[11px] text-ink-600" lang="en">{name.en}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] text-ink-500">{copy.note}</p>
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
