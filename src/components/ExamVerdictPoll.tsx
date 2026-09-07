"use client";

// ExamVerdictPoll — "How was the paper?" one-tap poll (6 Sep 2026, Exam
// Week Mode). Rendered by ExamWeekBlock on exam night, inside a multi-day
// window and on the days after.
//
//   • three chips (Easy / Moderate / Tough) → POST /api/exam-verdict
//   • optional hardest-section chips (the exam's subject names) after a
//     verdict lands — a second POST carrying the same verdict + section
//   • tally line: counts only, shown from n >= 10, else ew.verdict.few;
//     never worded as a prediction
//   • ?verdict=EASY|MODERATE|TOUGH in the URL (the day-after mail links)
//     preselects and auto-submits once, then the param is stripped
//   • wave 2 (6 Sep 2026): after an ANONYMOUS vote, one sign-in nudge
//     (nofollow, /login?callbackUrl=<this page>); after a signed-in vote
//     nothing extra. From n >= minN a WhatsApp share line carries the
//     tally + the hub URL (CTA_CLICKED via window.shishyaTrack).
//
// Identity is the server's business (session or shishya_anon cookie,
// issued on demand) — this never asks for a login. Labels come from the
// server so /hi and /te render in the page's language. Deliberately NOT
// built on PulseAsk: its one-prompt-per-session mutex would silence the
// poll whenever any other pulse row mounted first.

import { useCallback, useEffect, useRef, useState } from "react";
import type { VerdictTally } from "@/lib/exam-verdict";

const VERDICTS = ["EASY", "MODERATE", "TOUGH"] as const;
type Verdict = (typeof VERDICTS)[number];

export interface ExamVerdictLabels {
  prompt: string;
  easy: string;
  moderate: string;
  tough: string;
  section: string;
  thanks: string;
  /** Template with {n} {easy} {moderate} {tough}. */
  tally: string;
  few: string;
  /** Optional failure line; without it a failed tap just re-enables the chips. */
  err?: string;
  /** ew.signup.nudge — shown once after an anonymous vote (needs signedIn=false). */
  nudge?: string;
  /** ew.share.tally — template with {n} {exam} {easy} {moderate} {tough}. */
  shareTally?: string;
  /** ew.share.cta — the WhatsApp link text. */
  shareCta?: string;
}

function fill(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

function isVerdict(x: unknown): x is Verdict {
  return typeof x === "string" && (VERDICTS as readonly string[]).includes(x);
}

export function ExamVerdictPoll({
  examCode,
  examDate,
  labels,
  sections,
  initialTally,
  minN = 10,
  signedIn = false,
  examShort,
  shareUrl,
}: {
  examCode: string;
  /** IST exam day in focus, "YYYY-MM-DD". */
  examDate: string;
  labels: ExamVerdictLabels;
  /** Hardest-section chip labels (the exam's subject names, max 6). */
  sections: string[];
  initialTally: VerdictTally | null;
  minN?: number;
  /** Server-known session state — decides whether the post-vote nudge shows. */
  signedIn?: boolean;
  /** {exam} in the share line; defaults to the code. */
  examShort?: string;
  /** Absolute hub URL appended to the WhatsApp text. */
  shareUrl?: string;
}) {
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [section, setSection] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState(false);
  const [tally, setTally] = useState<VerdictTally | null>(initialTally);
  const autoFired = useRef(false);

  const submit = useCallback(
    async (v: Verdict, s?: string) => {
      setBusy(true);
      setErr(false);
      try {
        const res = await fetch("/api/exam-verdict", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ examCode, examDate, verdict: v, ...(s !== undefined ? { section: s } : {}) }),
        });
        const j = (await res.json().catch(() => null)) as { ok?: boolean; tally?: VerdictTally } | null;
        if (!res.ok || !j?.ok) throw new Error();
        setVerdict(v);
        if (s !== undefined) setSection(s);
        if (j.tally) setTally(j.tally);
        setDone(true);
        try {
          window.shishyaTrack?.("CTA_CLICKED", { cta: "exam-verdict", examCode, verdict: v, section: s ?? null });
        } catch {
          /* analytics is best-effort */
        }
      } catch {
        // A failed tap leaves the chips enabled and unselected — that is
        // the retry affordance; the optional err label adds words.
        setVerdict(null);
        setErr(true);
      } finally {
        setBusy(false);
      }
    },
    [examCode, examDate],
  );

  // Day-after mail links: /exams/X?verdict=TOUGH → one auto-submit, then
  // the param is stripped so a reload or share never re-votes. The ref
  // guards the once-only even if the effect re-runs.
  useEffect(() => {
    if (autoFired.current) return;
    autoFired.current = true;
    try {
      const url = new URL(window.location.href);
      const v = url.searchParams.get("verdict")?.toUpperCase();
      if (!isVerdict(v)) return;
      url.searchParams.delete("verdict");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
      setVerdict(v);
      void submit(v);
    } catch {
      /* URL API unavailable — the chips still work */
    }
  }, [submit]);

  const chips: { v: Verdict; label: string }[] = [
    { v: "EASY", label: labels.easy },
    { v: "MODERATE", label: labels.moderate },
    { v: "TOUGH", label: labels.tough },
  ];

  const pct =
    tally && tally.n >= minN
      ? {
          n: tally.n,
          easy: Math.round((tally.easy / tally.n) * 100),
          moderate: Math.round((tally.moderate / tally.n) * 100),
          tough: Math.round((tally.tough / tally.n) * 100),
        }
      : null;
  const tallyLine = pct ? fill(labels.tally, pct) : labels.few;

  // WhatsApp share — the tally sentence plus the hub URL. Only from the
  // floor: below it there is nothing honest to share.
  const shareText =
    pct && labels.shareTally && labels.shareCta
      ? `${fill(labels.shareTally, { ...pct, exam: examShort ?? examCode })}\n${shareUrl ?? `https://shishya.in/exams/${examCode}`}`
      : null;
  const shareHref = shareText ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : null;

  // Sign-in nudge lands on the page the student is on (hub or tracker);
  // computed at render on the client only — it is gated by `done`, which
  // is never true during SSR, so there is no hydration mismatch.
  const loginHref = `/login?callbackUrl=${encodeURIComponent(
    typeof window !== "undefined" && window.location?.pathname ? window.location.pathname : `/exams/${examCode}`,
  )}`;

  return (
    <div className="mt-2">
      <p className="text-sm font-semibold text-ink-900">{labels.prompt}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label={labels.prompt}>
        {chips.map((c) => {
          const selected = verdict === c.v;
          return (
            <button
              key={c.v}
              type="button"
              disabled={busy}
              aria-pressed={selected}
              onClick={() => void submit(c.v)}
              className={
                selected
                  ? "rounded-full border-2 border-saffron-500 bg-saffron-500 px-3.5 py-1.5 text-sm font-bold text-white shadow-sm disabled:opacity-60"
                  : "rounded-full border-2 border-ink-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-800 transition-colors hover:border-saffron-400 hover:text-saffron-700 disabled:opacity-60"
              }
            >
              {c.label}
            </button>
          );
        })}
      </div>
      {done && verdict && (
        <p className="mt-2 text-xs font-medium text-emerald-700">✓ {labels.thanks}</p>
      )}
      {done && verdict && sections.length > 0 && (
        <div className="mt-2">
          <p className="text-xs text-ink-600">{labels.section}</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sections.map((s) => {
              const selected = section === s;
              return (
                <button
                  key={s}
                  type="button"
                  disabled={busy}
                  aria-pressed={selected}
                  onClick={() => void submit(verdict, s)}
                  className={
                    selected
                      ? "rounded-full border border-saffron-500 bg-saffron-100 px-2.5 py-1 text-xs font-semibold text-saffron-900"
                      : "rounded-full border border-ink-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 transition-colors hover:border-saffron-400 hover:text-saffron-700 disabled:opacity-50"
                  }
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {done && verdict && !signedIn && labels.nudge && (
        <p className="mt-2 text-xs text-ink-700">
          <a rel="nofollow" href={loginHref} className="font-semibold text-saffron-700 underline-offset-2 hover:underline">
            {labels.nudge} →
          </a>
        </p>
      )}
      {err && labels.err && <p className="mt-2 text-xs text-rose-700">{labels.err}</p>}
      <p className="mt-2 text-xs text-ink-600">{tallyLine}</p>
      {shareHref && (
        <p className="mt-1 text-xs text-ink-700">
          <a
            href={shareHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              try {
                window.shishyaTrack?.("CTA_CLICKED", { cta: "exam-verdict-share", examCode, examDate, via: "whatsapp" });
              } catch {
                /* analytics is best-effort */
              }
            }}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
            </svg>
            {labels.shareCta}
          </a>
        </p>
      )}
    </div>
  );
}
