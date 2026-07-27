"use client";

// Client studio for /descriptive: pick a task, pick/write a prompt,
// write the answer with a live word count, submit → examiner card.
// Anonymous users can write; submission returns 401 → login redirect
// (their draft survives via sessionStorage).

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type TaskType = "essay" | "letter" | "precis" | "upsc-answer";

const TASKS: {
  key: TaskType;
  label: string;
  icon: string;
  target: string;
  suggested: string[];
}[] = [
  {
    key: "essay",
    label: "Essay",
    icon: "📝",
    target: "200–250 words · SSC descriptive / bank PO",
    suggested: [
      "Is artificial intelligence a threat or an opportunity for Indian jobs?",
      "One nation, one election — merits and challenges",
      "The importance of financial literacy for young India",
      "Water conservation: the next big challenge for Indian cities",
    ],
  },
  {
    key: "letter",
    label: "Formal letter",
    icon: "✉️",
    target: "120–150 words · SSC CHSL / bank PO",
    suggested: [
      "Write a letter to the Municipal Commissioner about irregular garbage collection in your locality.",
      "Write a letter to the branch manager reporting an unauthorised transaction in your account.",
      "Write a letter to the editor about the shortage of public libraries for exam aspirants.",
    ],
  },
  {
    key: "precis",
    label: "Précis",
    icon: "📄",
    target: "≈ one-third of the passage, own words",
    suggested: [
      "Summarise: 'Discipline is the bridge between goals and accomplishment. Aspirants often believe that talent decides selection, but every year the merit lists tell a different story — steady, average students who practised daily outrank brilliant but inconsistent ones. Preparation is less about heroic single days and more about ordinary days repeated. A fixed study window, honest revision of mistakes, and weekly mock tests compound quietly. The exam hall then feels familiar, not fearsome, because the mind has rehearsed the pressure a hundred times before.'",
    ],
  },
  {
    key: "upsc-answer",
    label: "UPSC Mains answer",
    icon: "🏛️",
    target: "150–250 words · GS style",
    suggested: [
      "\"India's demographic dividend will become a demographic burden without urgent investment in skills.\" Discuss. (150 words)",
      "Examine the role of self-help groups in rural women's empowerment in India. (150 words)",
      "Climate change is a governance challenge more than an environmental one. Comment. (250 words)",
    ],
  },
];

interface Evaluation {
  score: number;
  maxScore: number;
  verdict: string;
  strengths: string[];
  improvements: string[];
  grammarIssues: string[];
  modelOutline: string;
  remainingToday: number;
}

export function DescriptiveStudio() {
  const router = useRouter();
  const [task, setTask] = useState<TaskType>("essay");
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<Evaluation | null>(null);

  const t = TASKS.find((x) => x.key === task)!;
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;

  // Restore a draft that survived a login round-trip.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem("shishya-descriptive-draft");
      if (saved) {
        const d = JSON.parse(saved);
        if (d.task) setTask(d.task);
        if (d.prompt) setPrompt(d.prompt);
        if (d.answer) setAnswer(d.answer);
        sessionStorage.removeItem("shishya-descriptive-draft");
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function submit() {
    if (!prompt.trim() || words < 30) {
      setErr("Pick or write a prompt, and write at least ~30 words before evaluating.");
      return;
    }
    setBusy(true);
    setErr(null);
    setResult(null);
    try {
      const res = await fetch("/api/descriptive", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskType: task, prompt: prompt.trim(), answer }),
      });
      if (res.status === 401) {
        try {
          sessionStorage.setItem(
            "shishya-descriptive-draft",
            JSON.stringify({ task, prompt, answer }),
          );
        } catch {
          /* ignore */
        }
        router.push(`/login?callbackUrl=${encodeURIComponent("/descriptive")}`);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error ?? "Evaluation failed — try again.");
        return;
      }
      setResult(data as Evaluation);
    } catch {
      setErr("Network hiccup — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      {/* Task picker */}
      <div className="flex flex-wrap gap-2">
        {TASKS.map((x) => (
          <button
            key={x.key}
            type="button"
            onClick={() => {
              setTask(x.key);
              setPrompt("");
              setResult(null);
            }}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold transition-colors ${
              task === x.key
                ? "border-saffron-400 bg-saffron-500 text-white"
                : "border-ink-300 bg-white text-ink-700 hover:border-saffron-400"
            }`}
          >
            {x.icon} {x.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-ink-500">Target: {t.target}</p>

      {/* Prompt */}
      <div className="mt-4">
        <p className="text-sm font-semibold text-ink-800">Pick a prompt (or write your own)</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {t.suggested.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setPrompt(s)}
              className={`max-w-full truncate rounded-full border px-3 py-1 text-left text-xs font-medium sm:max-w-[48%] ${
                prompt === s
                  ? "border-saffron-400 bg-saffron-50 text-saffron-800"
                  : "border-ink-300 bg-white text-ink-600 hover:border-saffron-400"
              }`}
              title={s}
            >
              {s}
            </button>
          ))}
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="…or type your own topic / letter task / question here"
          className="mt-2 h-20 w-full rounded-lg border border-ink-300 bg-white p-3 text-sm text-ink-900 outline-none focus:border-saffron-400"
        />
      </div>

      {/* Answer */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <p className="text-sm font-semibold text-ink-800">Your answer</p>
          <p className="text-xs tabular-nums text-ink-500">{words} words</p>
        </div>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Write here — English or Hindi. The examiner evaluates whichever you write in."
          className="mt-2 h-64 w-full rounded-xl border border-ink-300 bg-white p-4 text-[15px] leading-relaxed text-ink-900 outline-none focus:border-saffron-400"
        />
      </div>

      {err && <p className="mt-3 text-sm text-rose-700">{err}</p>}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="mt-3 rounded-lg bg-saffron-500 px-6 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? "Examiner is reading…" : "Evaluate my answer →"}
      </button>
      <span className="ml-3 text-xs text-ink-500">Free · 3 evaluations/day · instant</span>

      {/* Result */}
      {result && (
        <div className="mt-6 rounded-xl border-2 border-saffron-200 bg-saffron-50/50 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-ink-900">Examiner&apos;s evaluation</p>
            <p className="rounded-lg bg-white px-4 py-1.5 text-lg font-bold text-saffron-700">
              {result.score}<span className="text-sm font-semibold text-ink-500">/{result.maxScore}</span>
            </p>
          </div>
          <p className="mt-2 text-sm italic leading-relaxed text-ink-800">“{result.verdict}”</p>

          {result.strengths?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">What worked</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-700">
                {result.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.improvements?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-rose-700">Fix these first</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-700">
                {result.improvements.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.grammarIssues?.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-600">Grammar</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-700">
                {result.grammarIssues.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          )}
          {result.modelOutline && (
            <div className="mt-4 rounded-lg bg-white p-3">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-600">
                How a top answer would be structured
              </p>
              <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-ink-700">
                {result.modelOutline}
              </p>
            </div>
          )}
          <p className="mt-4 text-xs text-ink-500">
            {result.remainingToday > 0
              ? `${result.remainingToday} free evaluation${result.remainingToday === 1 ? "" : "s"} left today — revise and resubmit to beat this score.`
              : "That's today's 3 — come back tomorrow with a fresh attempt."}
          </p>
        </div>
      )}
    </div>
  );
}
