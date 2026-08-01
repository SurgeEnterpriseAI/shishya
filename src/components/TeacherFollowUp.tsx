"use client";

// Teacher-request follow-up card — the student side of the closure
// guarantee. Renders wherever TalkToTeacher lives (it is mounted from
// inside that component so every surface gets it for free) and shows
// the student's open request at its current stage:
//
//   awaiting  →  "Did our teacher reach you?"  [Yes, got help ✅] [Not yet]
//                 "Not yet" → warm promise: callback shortly, and a
//                 guaranteed written answer right here either way.
//   answered  →  the written answer (team or AI) + [Solved ✅] [Need more help]
//
// Design rules:
//   • zero friction — one-tap everything, works for guests, no forms
//   • never a dead end — every path ends in "solved" or "we owe you
//     an answer and here is where it will appear"
//   • never a demotivation story — copy stays warm and certain
//   • only ONE instance renders per page (module-level claim) even
//     though TalkToTeacher mounts several times on some pages
//   • silent when there's nothing actionable (the 95% case)

import { useEffect, useRef, useState } from "react";
import { ChatMarkdown } from "@/components/ChatMarkdown";

interface MineRequest {
  id: string;
  examCode: string | null;
  subject: string;
  createdAt: string;
  stage: "awaiting" | "answered";
  answerText: string | null;
  answeredBy: "team" | "ai" | null;
  studentRating: string | null;
}

// One card per page, no matter how many TalkToTeacher mounts exist.
let claimed = false;

// Don't re-ask about a request-stage the student dismissed this session.
const dismissKey = (id: string, stage: string) => `shishya_tfu_${id}_${stage}`;

export function TeacherFollowUp() {
  const [reqs, setReqs] = useState<MineRequest[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [thanks, setThanks] = useState<string | null>(null);
  const [promised, setPromised] = useState(false);
  const owner = useRef(false);

  useEffect(() => {
    if (claimed) return;
    claimed = true;
    owner.current = true;
    fetch("/api/teacher-request/mine", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((d: { requests: MineRequest[] }) => {
        const visible = (d.requests ?? []).filter((r) => {
          try {
            return !sessionStorage.getItem(dismissKey(r.id, r.stage));
          } catch {
            return true;
          }
        });
        setReqs(visible);
      })
      .catch(() => {});
    return () => {
      if (owner.current) claimed = false;
    };
  }, []);

  const req = reqs[0];
  if (!req && !thanks) return null;

  async function rate(id: string, rating: string) {
    try {
      void fetch("/api/teacher-request/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, rating }),
      });
    } catch {
      /* best-effort — the UI transition matters more than the ack */
    }
    if (rating === "GOT_HELP" || rating === "SOLVED") {
      setThanks("Wonderful — glad you got the help! This request is closed. Ask again anytime, free as always. 💛");
      setReqs((p) => p.filter((r) => r.id !== id));
    } else if (rating === "NOT_YET") {
      setPromised(true);
    } else {
      // NEED_MORE_HELP
      setThanks(
        "Got it — your question is back with our teachers as top priority. A better answer will appear right here (and we may also call you). You will not be left waiting. 💪",
      );
      setReqs((p) => p.filter((r) => r.id !== id));
    }
  }

  function dismiss(id: string, stage: string) {
    try {
      sessionStorage.setItem(dismissKey(id, stage), "1");
    } catch {
      /* private mode */
    }
    setReqs((p) => p.filter((r) => r.id !== id));
  }

  if (thanks) {
    return (
      <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        {thanks}
      </div>
    );
  }
  if (!req) return null;

  return (
    <div className="mb-4 rounded-xl border-2 border-indigo-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-700">
          🙋 Your teacher request{req.examCode ? ` · ${req.examCode.replace(/_/g, " ")}` : ""}
        </p>
        <button
          type="button"
          aria-label="Hide for now"
          onClick={() => dismiss(req.id, req.stage)}
          className="shrink-0 rounded-md p-0.5 text-ink-400 hover:bg-ink-100 hover:text-ink-700"
        >
          ✕
        </button>
      </div>

      {req.stage === "awaiting" && !promised && (
        <>
          <p className="mt-2 text-sm font-semibold text-ink-900">Did our teacher reach you?</p>
          <p className="mt-0.5 text-xs text-ink-500">“{req.subject}”</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => rate(req.id, "GOT_HELP")}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Yes, got help ✅
            </button>
            <button
              type="button"
              onClick={() => rate(req.id, "NOT_YET")}
              className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              Not yet
            </button>
          </div>
        </>
      )}

      {req.stage === "awaiting" && promised && (
        <p className="mt-2 text-sm leading-relaxed text-ink-700">
          No worries — our teacher will call you back shortly. And even if the call doesn&apos;t
          reach you, <strong>your answer will appear right here</strong> — your question is never
          dropped. Keep practising meanwhile; you&apos;re doing the right things. 💛
        </p>
      )}

      {req.stage === "answered" && (
        <>
          <p className="mt-2 text-sm font-semibold text-ink-900">
            {req.answeredBy === "ai"
              ? "Your answer from Shishya (our teacher will follow up personally too):"
              : "Your teacher's answer:"}
          </p>
          <div className="mt-2 max-h-72 overflow-y-auto rounded-lg bg-ink-50/60 p-3 text-sm text-ink-800">
            {expanded || (req.answerText ?? "").length <= 600 ? (
              <ChatMarkdown text={req.answerText ?? ""} />
            ) : (
              <>
                <ChatMarkdown text={(req.answerText ?? "").slice(0, 600) + "…"} />
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="mt-1 text-xs font-semibold text-indigo-700 hover:text-indigo-800"
                >
                  Read full answer →
                </button>
              </>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => rate(req.id, "SOLVED")}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Solved ✅
            </button>
            <button
              type="button"
              onClick={() => rate(req.id, "NEED_MORE_HELP")}
              className="rounded-lg border border-ink-300 bg-white px-4 py-2 text-sm font-semibold text-ink-700 hover:bg-ink-50"
            >
              Need more help
            </button>
          </div>
        </>
      )}
    </div>
  );
}
