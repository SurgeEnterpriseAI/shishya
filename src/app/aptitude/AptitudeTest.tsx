"use client";

// Client runner for the Surge admission aptitude test.
//   intro (rules + candidate details) → test (30 MCQs, 30-min timer) → result
// Answers are scored server-side (/api/aptitude/submit); this component
// never sees the answer key.

import { useCallback, useEffect, useRef, useState } from "react";

type Section = "QUANT" | "REASONING" | "VERBAL";
interface Question {
  id: string;
  section: Section;
  question: string;
  options: string[];
}
interface Config {
  durationMinutes: number;
  totalQuestions: number;
  passPercent: number;
}
interface Result {
  score: number;
  total: number;
  percent: number;
  passed: boolean;
  sections: Record<Section, { correct: number; total: number }>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AptitudeTest({
  questions,
  config,
  sectionLabels,
}: {
  questions: Question[];
  config: Config;
  sectionLabels: Record<Section, string>;
}) {
  const [stage, setStage] = useState<"intro" | "test" | "result">("intro");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(config.durationMinutes * 60);

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submittedRef = useRef(false);

  const submit = useCallback(
    async (auto: boolean) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      setSubmitting(true);
      setError(null);
      const durationSec = config.durationMinutes * 60 - secondsLeft;
      try {
        const res = await fetch("/api/aptitude/submit", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, email, phone: phone || undefined, answers, durationSec }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error ?? `Submit failed (${res.status})`);
        setResult(data);
        setStage("result");
      } catch (e: any) {
        setError(e?.message ?? "Could not submit. Please check your connection and try again.");
        submittedRef.current = false; // allow retry
      } finally {
        setSubmitting(false);
      }
    },
    [answers, name, email, phone, secondsLeft, config.durationMinutes]
  );

  // Countdown — runs only during the test. Auto-submits at 0.
  useEffect(() => {
    if (stage !== "test") return;
    if (secondsLeft <= 0) {
      void submit(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [stage, secondsLeft, submit]);

  function startTest() {
    if (!name.trim()) return setFormError("Please enter your full name.");
    if (!EMAIL_RE.test(email.trim())) return setFormError("Please enter a valid email address.");
    setFormError(null);
    setStage("test");
  }

  // ── INTRO ────────────────────────────────────────────────────────────
  if (stage === "intro") {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-saffron-200 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            Surge Admission · Aptitude Round
          </p>
          <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">Aptitude Test</h1>
          <p className="mt-2 text-sm text-ink-600">
            A short screening test for candidates seeking admission to the Surge
            process. Modelled on the aptitude rounds used by companies like TCS
            and Infosys. Clear the cutoff to be shortlisted.
          </p>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { k: "Questions", v: String(config.totalQuestions) },
              { k: "Duration", v: `${config.durationMinutes} min` },
              { k: "Sections", v: "3" },
              { k: "To clear", v: `${config.passPercent}%` },
            ].map((s) => (
              <div key={s.k} className="rounded-lg bg-ink-50 px-3 py-2 text-center">
                <p className="text-lg font-bold text-ink-900">{s.v}</p>
                <p className="text-[11px] uppercase tracking-wide text-ink-500">{s.k}</p>
              </div>
            ))}
          </div>

          <ul className="mt-5 space-y-1.5 text-sm text-ink-700">
            <li>• Sections: Quantitative Aptitude, Logical Reasoning, Verbal Ability.</li>
            <li>• One mark per question. No negative marking.</li>
            <li>• The timer starts when you click Begin and the test auto-submits at 0:00.</li>
            <li>• Don&apos;t refresh or leave the page — your progress will reset.</li>
          </ul>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Full name *</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
                placeholder="Your name"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-ink-700">Email *</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
                placeholder="you@example.com"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-xs font-medium text-ink-700">Phone (optional)</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
                placeholder="10-digit mobile"
              />
            </label>
          </div>

          {formError && <p className="mt-3 text-sm text-rose-700">{formError}</p>}

          <button
            onClick={startTest}
            className="mt-5 w-full rounded-lg bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 sm:w-auto"
          >
            Begin test →
          </button>
        </div>
      </div>
    );
  }

  // ── RESULT ───────────────────────────────────────────────────────────
  if (stage === "result" && result) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="rounded-xl border border-ink-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div
            className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold ${
              result.passed ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
            }`}
          >
            {result.percent}%
          </div>
          <h1 className="mt-4 text-2xl font-bold text-ink-900">
            {result.passed ? "Congratulations — you cleared the cutoff 🎉" : "Not cleared this time"}
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            You scored <strong>{result.score}</strong> out of <strong>{result.total}</strong>.{" "}
            {result.passed
              ? "You've been shortlisted — the Surge team will reach out to you over email about the next steps."
              : `The cutoff is ${config.passPercent}%. Keep practising and you can re-attempt when invited.`}
          </p>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {(Object.keys(result.sections) as Section[]).map((s) => {
              const sec = result.sections[s];
              return (
                <div key={s} className="rounded-lg bg-ink-50 px-3 py-3 text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-500">
                    {sectionLabels[s]}
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-ink-900">
                    {sec.correct}/{sec.total}
                  </p>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-ink-500">
            Your result has been recorded under {email}. You may close this page.
          </p>
        </div>
      </div>
    );
  }

  // ── TEST ─────────────────────────────────────────────────────────────
  const q = questions[current];
  const answeredCount = Object.keys(answers).length;
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const lowTime = secondsLeft <= 120;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Sticky bar: progress + timer */}
      <div className="sticky top-0 z-10 -mx-4 mb-4 flex items-center justify-between gap-3 border-b border-ink-200 bg-ink-50/95 px-4 py-3 backdrop-blur">
        <div>
          <p className="text-xs text-ink-500">
            Question {current + 1} of {questions.length} · {answeredCount} answered
          </p>
          <span className="mt-0.5 inline-block rounded-full bg-saffron-100 px-2 py-0.5 text-[11px] font-medium text-saffron-800">
            {sectionLabels[q.section]}
          </span>
        </div>
        <div
          className={`rounded-md px-3 py-1.5 font-mono text-lg font-bold tabular-nums ${
            lowTime ? "bg-rose-100 text-rose-700" : "bg-ink-900 text-white"
          }`}
          aria-label="Time remaining"
        >
          {mm}:{ss}
        </div>
      </div>

      {/* Question */}
      <div className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-base font-medium text-ink-900 whitespace-pre-line">{q.question}</p>
        <ul className="mt-4 space-y-2">
          {q.options.map((opt, i) => {
            const picked = answers[q.id] === i;
            return (
              <li key={i}>
                <button
                  type="button"
                  onClick={() => setAnswers((a) => ({ ...a, [q.id]: i }))}
                  className={`flex w-full items-start gap-3 rounded-md border px-3 py-2.5 text-left text-sm transition-colors ${
                    picked
                      ? "border-saffron-500 bg-saffron-50"
                      : "border-ink-200 bg-white hover:border-saffron-400 hover:bg-saffron-50/40"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                      picked ? "bg-saffron-500 text-white" : "border border-ink-300 text-ink-700"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-ink-800">{opt}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="rounded-md border border-ink-300 px-4 py-2 text-sm font-medium text-ink-700 hover:bg-ink-50 disabled:opacity-40"
          >
            ← Previous
          </button>
          {current < questions.length - 1 ? (
            <button
              type="button"
              onClick={() => setCurrent((c) => Math.min(questions.length - 1, c + 1))}
              className="rounded-md bg-ink-900 px-5 py-2 text-sm font-semibold text-white hover:bg-ink-800"
            >
              Next →
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void submit(false)}
              disabled={submitting}
              className="rounded-md bg-emerald-600 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit test"}
            </button>
          )}
        </div>
      </div>

      {/* Question palette */}
      <div className="mt-4 rounded-xl border border-ink-200 bg-white p-4">
        <p className="mb-2 text-xs font-medium text-ink-500">Jump to question</p>
        <div className="flex flex-wrap gap-1.5">
          {questions.map((qq, i) => {
            const done = answers[qq.id] !== undefined;
            const isCur = i === current;
            return (
              <button
                key={qq.id}
                type="button"
                onClick={() => setCurrent(i)}
                className={`h-8 w-8 rounded-md text-xs font-medium ${
                  isCur
                    ? "bg-saffron-500 text-white"
                    : done
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-ink-100 text-ink-600 hover:bg-ink-200"
                }`}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-ink-500">{answeredCount}/{questions.length} answered</p>
          <button
            type="button"
            onClick={() => void submit(false)}
            disabled={submitting}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit test"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      )}
    </div>
  );
}
