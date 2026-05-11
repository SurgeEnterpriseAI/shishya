"use client";

// Per-question review with on-demand AI explanation.
// Each Q is collapsible; tapping it reveals the options with correct/wrong markers,
// the existing solution from the DB, and a button to ask Claude for a deeper
// step-by-step (POST /api/explain).

import { useState } from "react";
import { apiPost } from "@/lib/api";

interface ReviewQ {
  id: string;
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  topic: { code: string; name: string };
  difficulty: string;
  chosen: string | null;
  correct: boolean;
  timeSec: number;
  marked: boolean;
}

export function ResultsReview({
  questions,
  examCode,
  examShortName,
}: {
  questions: ReviewQ[];
  examCode: string;
  examShortName: string;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <ul className="mt-4 space-y-2">
      {questions.map((q, i) => (
        <li key={q.id} className="overflow-hidden rounded-md border border-ink-200 bg-white">
          <button
            onClick={() => toggle(q.id)}
            className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ink-50/60"
          >
            <Status correct={q.correct} chosen={q.chosen} />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-sm text-ink-800">
                <span className="text-ink-500">Q{i + 1}.</span> {q.body}
              </p>
              <p className="mt-0.5 text-xs text-ink-500">
                {q.topic.name} · {q.difficulty} ·{" "}
                {q.chosen
                  ? `You chose ${q.chosen}, correct ${q.answerKey}`
                  : `Skipped · correct ${q.answerKey}`}{" "}
                · {q.timeSec}s
              </p>
            </div>
            <span className="text-ink-400 shrink-0">{openIds.has(q.id) ? "▾" : "▸"}</span>
          </button>

          {openIds.has(q.id) && (
            <ReviewBody q={q} index={i} examCode={examCode} examShortName={examShortName} />
          )}
        </li>
      ))}
    </ul>
  );
}

function ReviewBody({
  q,
  index,
  examCode,
  examShortName,
}: {
  q: ReviewQ;
  index: number;
  examCode: string;
  examShortName: string;
}) {
  const [explain, setExplain] = useState<{ stepByStep: string[]; whyChosenIsWrong?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function fetchExplanation(detailLevel: "STANDARD" | "DEEP") {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiPost<{ explanation: any }>("/api/explain", {
        questionId: q.id,
        studentChosen: q.chosen,
        detailLevel,
      });
      setExplain(res.explanation);
    } catch (e: any) {
      setErr(e.message ?? "Could not fetch explanation");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-ink-200 bg-ink-50/50 px-4 py-4">
      <p className="text-sm text-ink-800 whitespace-pre-line">{q.body}</p>

      <ul className="mt-3 space-y-1.5">
        {q.options.map((opt) => {
          const isCorrect = opt.key === q.answerKey;
          const isChosen = opt.key === q.chosen;
          const colour = isCorrect
            ? "border-emerald-400 bg-emerald-50"
            : isChosen
            ? "border-rose-300 bg-rose-50"
            : "border-ink-200 bg-white";
          return (
            <li
              key={opt.key}
              className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${colour}`}
            >
              <span
                className={
                  isCorrect
                    ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-xs font-semibold text-white"
                    : isChosen
                    ? "flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-rose-500 text-xs font-semibold text-white"
                    : "flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-ink-300 text-xs font-medium text-ink-700"
                }
              >
                {opt.key}
              </span>
              <span className="text-ink-800">{opt.text}</span>
              {isCorrect && <span className="ml-auto text-xs text-emerald-700">Correct</span>}
              {isChosen && !isCorrect && <span className="ml-auto text-xs text-rose-700">Your answer</span>}
            </li>
          );
        })}
      </ul>

      {/* DB solution */}
      <div className="mt-4 rounded-md border border-ink-200 bg-white p-3">
        <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Solution</p>
        <p className="mt-1.5 whitespace-pre-line text-sm text-ink-800">{q.solution}</p>
      </div>

      {/* AI explanation */}
      <div className="mt-4">
        {!explain && (
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => fetchExplanation("STANDARD")}
              disabled={busy}
              className="btn-secondary !py-1.5 !px-3 text-xs disabled:opacity-50"
            >
              {busy ? "Asking AI…" : "Explain step-by-step (AI)"}
            </button>
            <button
              onClick={() => fetchExplanation("DEEP")}
              disabled={busy}
              className="btn-secondary !py-1.5 !px-3 text-xs disabled:opacity-50"
            >
              Deep explanation
            </button>
            <a
              href={`/chat?examCode=${examCode}&topicCode=${encodeURIComponent(q.topic.code)}&seed=${encodeURIComponent(
                `On Q${index + 1} of my ${examShortName} mock (topic: ${q.topic.name}), ${
                  q.chosen
                    ? `I picked ${q.chosen} but the answer was ${q.answerKey}.`
                    : `I skipped it; the answer was ${q.answerKey}.`
                } The question was: "${q.body.length > 200 ? q.body.slice(0, 200) + "…" : q.body}" — walk me through it.`
              )}`}
              className="btn-secondary !py-1.5 !px-3 text-xs"
            >
              Ask Shishya about this Q
            </a>
          </div>
        )}

        {err && <p className="mt-2 text-xs text-rose-700">{err}</p>}

        {explain && (
          <div className="mt-2 rounded-md border border-saffron-200 bg-saffron-50/60 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-saffron-800">AI explanation</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink-800">
              {explain.stepByStep.map((step, i) => (
                <li key={i}>{step}</li>
              ))}
            </ol>
            {explain.whyChosenIsWrong && (
              <p className="mt-3 rounded-md bg-white p-2 text-xs text-ink-700">
                <span className="font-medium text-rose-800">Why your choice was wrong: </span>
                {explain.whyChosenIsWrong}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Status({ correct, chosen }: { correct: boolean; chosen: string | null }) {
  if (chosen == null)
    return <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-ink-300" />;
  return (
    <span
      className={
        correct
          ? "mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-500"
          : "mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500"
      }
    />
  );
}
