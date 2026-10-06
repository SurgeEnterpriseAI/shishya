"use client";

// "Get 10 fresh questions" — the results-page card for the student's weakest
// topic (topicArr[0] on the page).
//
// 6 Oct 2026: the set is picked, not written. The card used to have the AI
// write the questions on the tap; those were never answer-checked, so since
// 26 Sep every set opened on "This mock is being rebuilt" (none was played).
// Now POST /api/mocks/fresh picks up to 10 of the exam's answer-checked
// questions this student has never seen, in the language of this attempt's
// paper — this topic first, then the attempt's other weak topics, then the
// wider exam (src/lib/fresh-set.ts) — and the tap goes straight into the
// player. A set the student has not submitted yet comes back instead of a
// new one (reused: true). When fewer than 5 are left the
// route makes no mock and the card says how many of the exam's answer-checked
// questions the student has practised, with links to the topic quizzes and
// previous-year papers, in place of the button.
//
// Words: src/lib/fresh-set-copy.ts (en/hi/te), in the visitor's UI language
// read after mount (clientUiLocale) so hydration matches. The attempt id
// comes from this page's own URL (/attempts/[id]/results), so the route can
// prefer the topics the student got wrong.
//
// Beacon (CTA_CLICKED, cta "fresh-generate", surface "results"): step "press"
// on the tap, then step "result" with result "ok" | "too-few" | "error", the
// count (questions in the set / unseen left / 0) and the HTTP status (0 for a
// network failure); an ok also carries mockId and reused. From 26 Sep to 6 Oct nothing recorded a press, so presses
// vs. sets played could not show the break; now they can.
//
// Never on a school attempt: the page hides it on Class 8-12 chapter practice,
// and this card hides itself for any school container code (Class 1-7
// included); the route treats one as an unknown exam.

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { clientUiLocale, type CopyLocale } from "@/lib/ui-locale-copy";
import { fillFresh, freshSetCopy, tooFewLine } from "@/lib/fresh-set-copy";
import { schoolContainerClassOf } from "@/lib/school/student-classes";

/** Best-effort, non-blocking — the results page's first-party CTA_CLICKED beacon (ResultsCtaLink). */
function beacon(props: Record<string, string | number | boolean | null>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({ kind: "CTA_CLICKED", path: typeof location !== "undefined" ? location.pathname : "/attempts", props })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}

interface Props {
  examCode: string;
  topicCode: string;
  topicName: string;
  count?: number;
}

interface TooFew {
  practised: number;
  total: number;
  exam: string;
  topics: string | null;
  pyq: string | null;
}

/** Only the hub's own links are rendered. */
const hubLink = (v: unknown): string | null => (typeof v === "string" && v.startsWith("/exams/") ? v : null);
const num = (v: unknown): number => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function FreshQuestionsButton({ examCode, topicCode, topicName, count = 10 }: Props) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const attemptId = typeof params?.id === "string" ? params.id : undefined;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [tooFew, setTooFew] = useState<TooFew | null>(null);
  const [locale, setLocale] = useState<CopyLocale>("en");
  useEffect(() => {
    setLocale(clientUiLocale());
  }, []);
  const copy = freshSetCopy(locale);

  // Never on a school container (Class 1-12), whatever the caller passes.
  if (schoolContainerClassOf(examCode) !== null) return null;

  async function pick() {
    setBusy(true);
    setErr(null);
    const base = { cta: "fresh-generate", surface: "results", exam: examCode, topic: topicCode };
    beacon({ ...base, step: "press", count });
    let status = 0;
    try {
      const res = await fetch("/api/mocks/fresh", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, topicCode, count, ...(attemptId ? { attemptId } : {}) }),
      });
      status = res.status;
      const data = await res.json().catch(() => null);
      if (res.ok && data?.result === "ok" && typeof data?.mock?.id === "string") {
        const reused = data.mock.reused === true;
        beacon({ ...base, step: "result", result: "ok", count: num(data.mock.questionCount), status, mockId: data.mock.id, reused });
        router.push(`/mocks/${data.mock.id}`);
        return;
      }
      if (res.ok && data?.result === "too-few") {
        beacon({ ...base, step: "result", result: "too-few", count: num(data.available), status });
        setTooFew({
          practised: num(data.practised),
          total: num(data.total),
          exam: typeof data?.exam?.shortName === "string" ? data.exam.shortName : examCode,
          topics: hubLink(data?.links?.topics),
          pyq: hubLink(data?.links?.pyq),
        });
        setBusy(false);
        return;
      }
      beacon({ ...base, step: "result", result: "error", count: 0, status });
      setErr(copy.failed);
      setBusy(false);
    } catch {
      beacon({ ...base, step: "result", result: "error", count: 0, status });
      setErr(copy.network);
      setBusy(false);
    }
  }

  if (tooFew) {
    return (
      <div className="mt-6 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5 shadow-sm">
        <p className="text-sm text-ink-800">{tooFewLine(copy, tooFew.practised, tooFew.total, tooFew.exam)}</p>
        {(tooFew.topics || tooFew.pyq) && (
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold">
            {tooFew.topics && (
              <a href={tooFew.topics} className="text-saffron-700 underline-offset-2 hover:underline">
                {copy.topicsLink}
              </a>
            )}
            {tooFew.pyq && (
              <a href={tooFew.pyq} className="text-saffron-700 underline-offset-2 hover:underline">
                {copy.pyqLink}
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border-2 border-saffron-300 bg-gradient-to-r from-saffron-50 to-amber-50 p-5 shadow-sm">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">{copy.eyebrow}</p>
          <p className="mt-1 text-base font-bold text-ink-900">{fillFresh(copy.title, { count, topic: topicName })}</p>
          <p className="mt-1 text-xs text-ink-600">{fillFresh(copy.body, { topic: topicName })}</p>
          {err && <p className="mt-2 text-xs text-rose-700">{err}</p>}
        </div>
        <button
          type="button"
          onClick={pick}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-saffron-500 px-5 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {copy.busy}
            </>
          ) : (
            <>{fillFresh(copy.button, { count })}</>
          )}
        </button>
      </div>
    </div>
  );
}
