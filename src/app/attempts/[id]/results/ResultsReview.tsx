"use client";

// Per-question review with on-demand AI explanation.
// Each Q is collapsible; tapping it reveals the options with correct/wrong markers,
// the existing solution from the DB, and a button to ask Claude for a deeper
// step-by-step (POST /api/explain).

import { useEffect, useRef, useState } from "react";
import { apiPost } from "@/lib/api";
import { QuestionLangSwitcher } from "@/components/QuestionLangSwitcher";
import type { Locale } from "@/lib/i18n";

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

interface Translation {
  body: string;
  options: { key: string; text: string }[];
  solution: string;
}

export function ResultsReview({
  questions,
  attemptId,
  examCode,
  examShortName,
  initialLocale = "en",
}: {
  questions: ReviewQ[];
  attemptId: string;
  examCode: string;
  examShortName: string;
  initialLocale?: Locale;
}) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  // ── On-demand translation. Same pattern as MockPlayer: server holds
  // a (questionId, locale) cache, we only pay Anthropic on cold misses.
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [translations, setTranslations] = useState<Map<string, Translation>>(new Map());
  const [translating, setTranslating] = useState(false);
  const [translateErr, setTranslateErr] = useState<string | null>(null);

  async function fetchTranslations(target: Locale) {
    if (target === "en") {
      setTranslations(new Map());
      return;
    }
    setTranslating(true);
    setTranslateErr(null);
    try {
      const res = await apiPost<{
        locale: Locale;
        questions: { id: string; body: string; options: { key: string; text: string }[]; solution: string }[];
      }>(`/api/attempts/${attemptId}/translate`, { locale: target });
      const map = new Map<string, Translation>();
      for (const t of res.questions) {
        map.set(t.id, { body: t.body, options: t.options, solution: t.solution });
      }
      setTranslations(map);
    } catch (e: any) {
      setTranslateErr(e?.message ?? "Translation failed; showing original.");
    } finally {
      setTranslating(false);
    }
  }

  async function changeLocale(next: Locale) {
    if (next === locale) return;
    setLocale(next);
    await fetchTranslations(next);
  }

  const didInitRef = useRef(false);
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;
    if (locale !== "en") fetchTranslations(locale);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <div className="mt-3 flex items-center justify-end gap-2">
        <QuestionLangSwitcher current={locale} onChange={changeLocale} pending={translating} />
      </div>
      {translateErr && (
        <p className="mt-2 text-xs text-rose-700">{translateErr}</p>
      )}
      <ul className="mt-4 space-y-2">
        {questions.map((q, i) => {
          const tr = translations.get(q.id);
          const displayQ: ReviewQ = tr && tr.options.length === q.options.length
            ? { ...q, body: tr.body, options: tr.options, solution: tr.solution }
            : q;
          return (
            <li key={q.id} className="overflow-hidden rounded-md border border-ink-200 bg-white">
              <button
                onClick={() => toggle(q.id)}
                className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-ink-50/60"
              >
                <Status correct={q.correct} chosen={q.chosen} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm text-ink-800">
                    <span className="text-ink-500">Q{i + 1}.</span> {displayQ.body}
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
                <ReviewBody q={displayQ} index={i} examCode={examCode} examShortName={examShortName} />
              )}
            </li>
          );
        })}
      </ul>
    </>
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
  const [explain, setExplain] = useState<{
    stepByStep: string[];
    whyChosenIsWrong?: string;
    keyDisputed?: boolean;
    keyDisputeReason?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportStatus, setReportStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  async function submitReport() {
    const reason = reportReason.trim();
    if (reason.length < 3) {
      setReportStatus("error");
      return;
    }
    setReportStatus("sending");
    try {
      const res = await fetch(`/api/questions/${q.id}/report`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) throw new Error("send failed");
      setReportStatus("sent");
    } catch {
      setReportStatus("error");
    }
  }

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
            {/* Report bad question. Students were hitting AI-generated
                questions with wrong answer keys or missing words in the
                jumble. This routes their flag straight into QuestionReport
                so the operator can sweep + fix in /admin. */}
            <button
              type="button"
              onClick={() => setReportOpen((v) => !v)}
              className="rounded-md border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50"
            >
              Report this question
            </button>
          </div>
        )}

        {reportOpen && reportStatus !== "sent" && (
          <div className="mt-3 rounded-md border border-rose-200 bg-rose-50/60 p-3">
            <p className="text-xs font-medium text-rose-800">
              What looks wrong with this question?
            </p>
            <textarea
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              placeholder="e.g. The jumbled words don't include 'went' but the solution treats it as a word."
              rows={3}
              maxLength={1000}
              className="mt-2 w-full rounded-md border border-ink-300 px-3 py-2 text-sm focus:border-rose-500 focus:outline-none"
            />
            {reportStatus === "error" && (
              <p className="mt-1 text-xs text-rose-700">
                Couldn&apos;t send — please add at least 3 characters and try again.
              </p>
            )}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={submitReport}
                disabled={reportStatus === "sending"}
                className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {reportStatus === "sending" ? "Sending…" : "Submit report"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportOpen(false);
                  setReportReason("");
                  setReportStatus("idle");
                }}
                className="rounded-md border border-ink-300 px-3 py-1.5 text-xs text-ink-700 hover:bg-ink-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {reportStatus === "sent" && (
          <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            Thanks — we&apos;ve flagged this question for review. It will be checked and corrected shortly.
          </p>
        )}

        {err && <p className="mt-2 text-xs text-rose-700">{err}</p>}

        {explain && explain.keyDisputed && (
          // The AI examined the question and decided the marked answer key
          // doesn't actually fit (broken jumble, missing word, insufficient
          // data, etc.). Instead of pretending to defend a bad answer with
          // chain-of-thought hedging, surface the dispute and invite a
          // one-click report so the operator can fix the question.
          <div className="mt-2 rounded-md border border-amber-300 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-800">
              The answer key may be wrong
            </p>
            <p className="mt-1 text-sm text-ink-800">
              Looking at this question, the marked answer doesn&apos;t cleanly
              follow from what&apos;s stated.{" "}
              {explain.keyDisputeReason && (
                <span className="text-ink-700">{explain.keyDisputeReason}</span>
              )}
            </p>
            <p className="mt-2 text-xs text-ink-600">
              If you agree, please report it so we can fix it.
            </p>
            <button
              type="button"
              onClick={() => {
                setReportOpen(true);
                if (!reportReason) {
                  setReportReason(
                    explain.keyDisputeReason
                      ? `AI Explain flagged: ${explain.keyDisputeReason}`
                      : "AI Explain flagged this question as having an inconsistent answer key.",
                  );
                }
              }}
              className="mt-2 rounded-md bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
            >
              Report this question
            </button>
          </div>
        )}
        {explain && !explain.keyDisputed && explain.stepByStep.length > 0 && (
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
        {explain && !explain.keyDisputed && explain.stepByStep.length === 0 && (
          <div className="mt-2 rounded-md border border-ink-200 bg-white p-3 text-sm text-ink-600">
            Couldn&apos;t generate a clean explanation for this one. Try the deep
            explanation, or report it if it looks broken.
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
