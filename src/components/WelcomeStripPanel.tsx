"use client";

// "Your Shishya is ready" — the one-time strip's body (30 Sep 2026, sign-up
// build 2). Loaded by src/components/WelcomeStrip.tsx only when there is
// something to show, never server-rendered (so reading the language cookie
// in render is safe). Rules and the "shown once" mechanism:
// src/lib/welcome-strip.ts; words and their honesty notes:
// src/lib/welcome-strip-copy.ts.
//
// A new member sees one line — what is now theirs, their exam and a "Change
// exam" button — and the ticked list of what is kept for them (on phones
// behind "What is kept for you", so the strip stays about one line and
// never pushes the page's start or sign-in controls far down). "Change exam"
// opens a small inline search (the exam list loads on that tap), and a pick
// is saved by POST /api/me/welcome. Beacons (cta "welcome-strip"): shown
// (the island), change, changed, dismiss, chat-continue. A member who only
// had a guest chat imported (not a new account) gets the chat line alone.
// 30 Sep 2026 (review): the exam and its Daily 5 flags are DERIVED each
// render (welcomeStripNow) from the server's answer or the student's pick —
// the panel can mount before GET answers (a guest chat imported first), and
// a copy taken at mount stayed empty. A pick takes the new exam's practice /
// mail flags from POST, so "Daily 5" follows the exam actually chosen.

import { useMemo, useState } from "react";
import { clientUiLocale } from "@/lib/ui-locale-copy";
import { ctaBeacon } from "@/lib/cta-beacon";
import { WELCOME_CTA, matchExams, welcomeStripNow, type WelcomeData, type WelcomePick } from "@/lib/welcome-strip";
import { WELCOME_STRIP_COPY, welcomeStripHeadline, welcomeStripPoints } from "@/lib/welcome-strip-copy";

interface ExamOption {
  code: string;
  name: string;
  shortName: string;
}

export function WelcomeStripPanel({
  data,
  chatHref,
  onClose,
}: {
  data: WelcomeData | null;
  chatHref: string | null;
  onClose: () => void;
}) {
  const [lang] = useState(() => clientUiLocale());
  const c = WELCOME_STRIP_COPY[lang];
  const [picked, setPicked] = useState<WelcomePick | null>(null);
  const now = welcomeStripNow(data, picked);
  const exam = now.exam;
  const [more, setMore] = useState(false);
  const [changing, setChanging] = useState(false);
  const [exams, setExams] = useState<ExamOption[] | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const matches = useMemo(() => matchExams(exams ?? [], query), [exams, query]);
  const newMember = !!data?.show;

  function close() {
    ctaBeacon(WELCOME_CTA, { action: "dismiss", examCode: exam?.code ?? null, newMember });
    onClose();
  }

  function openChange() {
    setChanging(true);
    setStatus("idle");
    ctaBeacon(WELCOME_CTA, { action: "change", examCode: exam?.code ?? null });
    if (exams) return;
    fetch("/api/exams")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        const rows: ExamOption[] = Array.isArray(j?.exams)
          ? j.exams
              .filter((e: Partial<ExamOption>) => typeof e?.code === "string" && typeof e?.shortName === "string")
              .map((e: ExamOption) => ({ code: e.code, name: e.name ?? e.shortName, shortName: e.shortName }))
          : [];
        setExams(rows);
      })
      .catch(() => setExams([]));
  }

  async function pick(o: ExamOption) {
    if (status === "saving") return;
    setStatus("saving");
    try {
      const res = await fetch("/api/me/welcome", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: o.code, from: exam?.code ?? null }),
      });
      const j = res.ok ? await res.json() : null;
      if (!j?.exam?.code) throw new Error("not saved");
      ctaBeacon(WELCOME_CTA, { action: "changed", from: exam?.code ?? null, to: j.exam.code, dropped: !!j.dropped });
      setPicked({
        code: j.exam.code,
        shortName: j.exam.shortName ?? o.shortName,
        practice: j.practice === true,
        dailyFiveEmail: j.dailyFiveEmail === true,
      });
      setStatus("saved");
      setChanging(false);
      setQuery("");
    } catch {
      setStatus("failed");
    }
  }

  const chatLine = chatHref ? (
    <>
      {newMember ? c.chat : c.chatOnly}
      <a
        href={chatHref}
        onClick={() => ctaBeacon(WELCOME_CTA, { action: "chat-continue", newMember })}
        className="font-semibold text-saffron-700 underline underline-offset-2 hover:text-saffron-800"
      >
        {c.chatLink}
      </a>
    </>
  ) : null;

  const points = newMember
    ? welcomeStripPoints({
        dailyFiveEmail: now.dailyFiveEmail,
        hasExam: !!exam,
        chatHref,
        challenges: data?.challenges ?? 0,
        alerts: data?.alerts ?? 0,
      })
    : [];

  return (
    <div role="status" aria-live="polite" className="border-t border-emerald-200 bg-emerald-50">
      <div className="container-prose flex items-start gap-2 py-2 text-[13px] leading-snug text-ink-800 sm:gap-3">
        <span aria-hidden className="mt-px font-bold text-emerald-700">
          ✓
        </span>
        <div className="min-w-0 flex-1">
          {newMember ? (
            <>
              <p>
                <strong className="font-semibold text-emerald-900">{c.title}</strong>
                <span className="text-ink-400"> · </span>
                {welcomeStripHeadline(c, now, status === "saved")}{" "}
                {!changing && (
                  <button
                    type="button"
                    onClick={openChange}
                    className="font-semibold text-saffron-700 underline underline-offset-2 hover:text-saffron-800"
                  >
                    {exam ? c.change : c.pick}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setMore((v) => !v)}
                  aria-expanded={more}
                  className="ml-3 text-xs font-medium text-ink-600 underline underline-offset-2 sm:hidden"
                >
                  {c.more}
                </button>
              </p>
              <ul className={`${more ? "flex" : "hidden"} mt-1 flex-col gap-0.5 text-xs text-ink-700 sm:flex sm:flex-row sm:flex-wrap sm:gap-x-4`}>
                {points.map((p) => (
                  <li key={p}>
                    <span aria-hidden className="mr-1 text-emerald-700">
                      ✓
                    </span>
                    {p === "weak" && c.weak}
                    {p === "mocks" && c.mocks}
                    {p === "daily" && (
                      <>
                        {c.dailyA}
                        <a href="/today" className="font-medium text-saffron-700 underline underline-offset-2">
                          {c.dailyLink}
                        </a>
                        {c.dailyB}
                      </>
                    )}
                    {p === "chat" && chatLine}
                    {p === "challenges" && c.challenges}
                    {p === "alerts" && c.alerts}
                  </li>
                ))}
              </ul>
              {changing && (
                <div className="mt-2 max-w-md">
                  <label htmlFor="welcome-exam-search" className="sr-only">
                    {c.changeLabel}
                  </label>
                  <input
                    id="welcome-exam-search"
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={c.changePlaceholder}
                    className="w-full rounded-md border border-ink-300 bg-white px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
                  />
                  {exams === null ? (
                    <p className="mt-1 text-xs text-ink-500">{c.changeLoading}</p>
                  ) : query.trim() && matches.length === 0 ? (
                    <p className="mt-1 text-xs text-ink-500">{c.changeNone}</p>
                  ) : (
                    <ul className="mt-1 flex flex-wrap gap-1.5">
                      {matches.map((o) => (
                        <li key={o.code}>
                          <button
                            type="button"
                            disabled={status === "saving"}
                            onClick={() => pick(o)}
                            title={o.name}
                            className="rounded-md border border-ink-200 bg-white px-2.5 py-1 text-xs font-medium text-ink-800 hover:border-saffron-400 hover:bg-saffron-50 disabled:opacity-60"
                          >
                            {o.shortName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {status === "failed" && <p className="mt-1 text-xs text-rose-700">{c.changeFailed}</p>}
                </div>
              )}
            </>
          ) : (
            <p>{chatLine}</p>
          )}
        </div>
        <button
          type="button"
          onClick={close}
          aria-label={c.close}
          title={c.close}
          className="shrink-0 rounded px-1.5 text-ink-500 hover:bg-emerald-100 hover:text-ink-800"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
