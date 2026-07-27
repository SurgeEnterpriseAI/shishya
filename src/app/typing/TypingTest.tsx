"use client";

// The typing test player. Fully client-side (works for anonymous
// visitors — zero friction), scored the way real skill tests score:
//   gross WPM  = (typed characters / 5) / minutes
//   net WPM    = gross − (wrong words / minutes)
//   accuracy   = correct words / typed words
//   KDPH       = typed characters extrapolated to an hour (SSC DEST
//                standard is 8,000 key depressions per hour)
// Paste is blocked; the timer starts on the first keystroke.

import { useEffect, useMemo, useRef, useState } from "react";
import { EN_PASSAGES, HI_PASSAGES } from "./passages";

type Lang = "en" | "hi";

// Pass benchmarks aspirants actually face. WPM thresholds are the
// commonly prescribed ones; DEST is keystroke-based.
const BENCHMARKS: { label: string; en: number; hi: number }[] = [
  { label: "SSC CHSL / CGL DEST (≈8,000 KDPH)", en: 27, hi: 25 },
  { label: "RRB NTPC typing skill test", en: 30, hi: 25 },
  { label: "Typist / Steno posts (typical)", en: 35, hi: 30 },
];

function track(props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({
          kind: "CTA_CLICKED",
          path: typeof location !== "undefined" ? location.pathname : "/typing",
          props: { cta: "typing-completed", surface: "typing", ...props },
        })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* best-effort */
  }
}

export function TypingTest() {
  const [lang, setLang] = useState<Lang>("en");
  const [durationMin, setDurationMin] = useState<2 | 5>(2);
  const [passageIdx, setPassageIdx] = useState(0);
  const [typed, setTyped] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const startedRef = useRef(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // Long target text: the chosen passage plus the rest of the bank, so
  // fast typists never run out of copy.
  const target = useMemo(() => {
    const bank = lang === "en" ? EN_PASSAGES : HI_PASSAGES;
    const rotated = [...bank.slice(passageIdx), ...bank.slice(0, passageIdx)];
    return rotated.join(" ");
  }, [lang, passageIdx]);

  // Countdown.
  useEffect(() => {
    if (secondsLeft === null || finished) return;
    if (secondsLeft <= 0) {
      setFinished(true);
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => (s === null ? null : s - 1)), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft, finished]);

  const results = useMemo(() => {
    if (!finished) return null;
    const minutes = durationMin;
    const chars = typed.length;
    const typedWords = typed.trim().length ? typed.trim().split(/\s+/) : [];
    const targetWords = target.trim().split(/\s+/);
    let correct = 0;
    for (let i = 0; i < typedWords.length; i++) {
      if (typedWords[i] === targetWords[i]) correct++;
    }
    const wrong = typedWords.length - correct;
    const grossWpm = Math.round(chars / 5 / minutes);
    const netWpm = Math.max(0, Math.round(grossWpm - wrong / minutes));
    const accuracy = typedWords.length ? Math.round((correct / typedWords.length) * 100) : 0;
    const kdph = Math.round(chars * (60 / minutes));
    return { grossWpm, netWpm, accuracy, kdph, typedWords: typedWords.length, wrong };
  }, [finished, typed, target, durationMin]);

  // Fire the beacon once per finished test.
  const trackedRef = useRef(false);
  useEffect(() => {
    if (results && !trackedRef.current) {
      trackedRef.current = true;
      track({ lang, durationMin, netWpm: results.netWpm, accuracy: results.accuracy });
    }
  }, [results, lang, durationMin]);

  function reset(nextLang?: Lang) {
    setTyped("");
    setSecondsLeft(null);
    setFinished(false);
    startedRef.current = false;
    trackedRef.current = false;
    setPassageIdx((i) => (i + 1) % EN_PASSAGES.length);
    if (nextLang) setLang(nextLang);
    setTimeout(() => areaRef.current?.focus(), 0);
  }

  function onType(v: string) {
    if (finished) return;
    if (!startedRef.current && v.length > 0) {
      startedRef.current = true;
      setSecondsLeft(durationMin * 60);
    }
    setTyped(v);
  }

  const mm = secondsLeft !== null ? Math.floor(secondsLeft / 60) : durationMin;
  const ss = secondsLeft !== null ? secondsLeft % 60 : 0;

  // Live per-word coloring of the passage (target words typed so far).
  const typedWordsLive = typed.trim().length ? typed.trim().split(/\s+/) : [];
  const targetWordsAll = useMemo(() => target.trim().split(/\s+/), [target]);
  const visibleTarget = targetWordsAll.slice(0, Math.max(80, typedWordsLive.length + 60));

  return (
    <div className="mt-6">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-ink-300 bg-white p-0.5">
          {(["en", "hi"] as Lang[]).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => reset(l)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
                lang === l ? "bg-saffron-500 text-white" : "text-ink-700"
              }`}
            >
              {l === "en" ? "English" : "हिंदी"}
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-ink-300 bg-white p-0.5">
          {([2, 5] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDurationMin(d);
                reset();
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold ${
                durationMin === d ? "bg-saffron-500 text-white" : "text-ink-700"
              }`}
            >
              {d} min
            </button>
          ))}
        </div>
        <span
          className={`ml-auto rounded-lg px-4 py-1.5 text-sm font-bold tabular-nums ${
            secondsLeft !== null && secondsLeft <= 15 && !finished
              ? "bg-rose-100 text-rose-800"
              : "bg-ink-100 text-ink-800"
          }`}
          aria-live="polite"
        >
          ⏱ {mm}:{ss.toString().padStart(2, "0")}
        </span>
      </div>

      {/* Passage */}
      <div
        className="mt-4 max-h-56 overflow-y-auto rounded-xl border border-ink-200 bg-white p-5 text-[15px] leading-relaxed text-ink-800 select-none"
        lang={lang === "hi" ? "hi" : "en"}
      >
        {visibleTarget.map((w, i) => {
          const t = typedWordsLive[i];
          const state = t === undefined ? "pending" : t === w ? "ok" : "bad";
          return (
            <span
              key={i}
              className={
                state === "ok"
                  ? "text-emerald-700"
                  : state === "bad"
                    ? "bg-rose-100 text-rose-800"
                    : i === typedWordsLive.length
                      ? "bg-saffron-100"
                      : undefined
              }
            >
              {w}{" "}
            </span>
          );
        })}
      </div>

      {/* Input */}
      <textarea
        ref={areaRef}
        value={typed}
        onChange={(e) => onType(e.target.value)}
        onPaste={(e) => e.preventDefault()}
        disabled={finished}
        placeholder={
          lang === "hi"
            ? "यहां टाइप करना शुरू करें — पहला अक्षर टाइप करते ही समय शुरू हो जाएगा…"
            : "Start typing here — the clock starts on your first keystroke…"
        }
        className="mt-3 h-36 w-full rounded-xl border border-ink-300 bg-white p-4 text-[15px] leading-relaxed text-ink-900 outline-none focus:border-saffron-400 disabled:bg-ink-50"
        lang={lang === "hi" ? "hi" : "en"}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {/* Results */}
      {results && (
        <div className="mt-4 rounded-xl border-2 border-saffron-200 bg-saffron-50/50 p-5">
          <p className="text-sm font-bold text-ink-900">Your result</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-2xl font-bold text-saffron-700">{results.netWpm}</p>
              <p className="text-[11px] text-ink-500">Net WPM</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-2xl font-bold text-ink-800">{results.grossWpm}</p>
              <p className="text-[11px] text-ink-500">Gross WPM</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-2xl font-bold text-ink-800">{results.accuracy}%</p>
              <p className="text-[11px] text-ink-500">Accuracy</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-2xl font-bold text-ink-800">{results.kdph.toLocaleString("en-IN")}</p>
              <p className="text-[11px] text-ink-500">Key depressions/hour</p>
            </div>
          </div>

          <ul className="mt-4 space-y-1.5">
            {BENCHMARKS.map((b) => {
              const need = lang === "en" ? b.en : b.hi;
              const pass = results.netWpm >= need;
              return (
                <li key={b.label} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-ink-700">{b.label}</span>
                  <span className={`font-semibold ${pass ? "text-emerald-700" : "text-rose-700"}`}>
                    {pass ? "✓ On track" : `Need ${need} WPM`}
                  </span>
                </li>
              );
            })}
          </ul>

          <button
            type="button"
            onClick={() => reset()}
            className="mt-4 rounded-lg bg-saffron-500 px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
          >
            Try again (new passage) →
          </button>
        </div>
      )}
    </div>
  );
}
