"use client";

// The friction-free questionnaire for the "which government exam suits
// ME?" matcher. 5 quick taps, no signup. On submit it just sets URL
// params and navigates — so results are server-rendered, shareable, and
// the back button re-opens the form with the answers intact.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INDIAN_STATES } from "@/lib/states";

const EDU = [
  ["10TH", "10th pass"],
  ["12TH", "12th pass"],
  ["ITI", "ITI"],
  ["DIPLOMA", "Diploma"],
  ["GRADUATE", "Graduate"],
  ["POSTGRADUATE", "Post-graduate"],
] as const;
const STREAM = [
  ["ANY", "Any / not sure"],
  ["ENGINEERING", "Engineering"],
  ["MEDICAL", "Medical"],
  ["SCIENCE", "Science (BSc)"],
  ["COMMERCE", "Commerce"],
  ["ARTS", "Arts / Humanities"],
  ["LAW", "Law"],
] as const;
const CAT = [["GEN", "General"], ["EWS", "EWS"], ["OBC", "OBC"], ["SC", "SC"], ["ST", "ST"]] as const;
const STR = [
  ["quant", "Maths / Quant"],
  ["reasoning", "Reasoning"],
  ["gk", "GK / Current affairs"],
  ["english", "English / Language"],
  ["technical", "Technical / Subject"],
] as const;

export function FindExamQuiz({ initial }: { initial?: Partial<Record<string, string>> }) {
  const router = useRouter();
  const [age, setAge] = useState(initial?.age ?? "");
  const [edu, setEdu] = useState(initial?.edu ?? "");
  const [stream, setStream] = useState(initial?.stream ?? "ANY");
  const [state, setState] = useState(initial?.state ?? "");
  const [cat, setCat] = useState(initial?.cat ?? "GEN");
  const [str, setStr] = useState<string[]>(initial?.str ? initial.str.split(",").filter(Boolean) : []);
  const [err, setErr] = useState<string | null>(null);

  const needsStream = edu === "GRADUATE" || edu === "POSTGRADUATE";

  function toggleStr(s: string) {
    setStr((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));
  }

  function submit() {
    const a = parseInt(age, 10);
    if (!a || a < 13 || a > 60) { setErr("Enter a valid age."); return; }
    if (!edu) { setErr("Pick your education level."); return; }
    const q = new URLSearchParams({ age: String(a), edu, stream: needsStream ? stream : "ANY", cat });
    if (state) q.set("state", state);
    if (str.length) q.set("str", str.join(","));
    router.push(`/find-your-exam?${q.toString()}#results`);
  }

  const label = "text-xs font-semibold uppercase tracking-wide text-ink-500";
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
      on ? "border-saffron-500 bg-saffron-500 text-white" : "border-ink-300 bg-white text-ink-700 hover:border-saffron-400"
    }`;

  return (
    <div className="rounded-2xl border-2 border-saffron-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Age */}
        <div>
          <p className={label}>Your age</p>
          <input
            type="number" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value)}
            placeholder="e.g. 22" min={13} max={60}
            className="mt-2 w-32 rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
          />
        </div>
        {/* Category */}
        <div>
          <p className={label}>Category</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {CAT.map(([v, l]) => (
              <button key={v} type="button" onClick={() => setCat(v)} className={chip(cat === v)}>{l}</button>
            ))}
          </div>
        </div>
        {/* Education */}
        <div className="sm:col-span-2">
          <p className={label}>Highest education</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {EDU.map(([v, l]) => (
              <button key={v} type="button" onClick={() => setEdu(v)} className={chip(edu === v)}>{l}</button>
            ))}
          </div>
        </div>
        {/* Stream — only for grads */}
        {needsStream && (
          <div className="sm:col-span-2">
            <p className={label}>Your stream / degree</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {STREAM.map(([v, l]) => (
                <button key={v} type="button" onClick={() => setStream(v)} className={chip(stream === v)}>{l}</button>
              ))}
            </div>
          </div>
        )}
        {/* State */}
        <div>
          <p className={label}>Your state</p>
          <select
            value={state} onChange={(e) => setState(e.target.value)}
            className="mt-2 w-full rounded-lg border border-ink-300 px-3 py-2 text-sm focus:border-saffron-500 focus:outline-none"
          >
            <option value="">Select (for state exams)</option>
            {INDIAN_STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </select>
        </div>
        {/* Strengths */}
        <div className="sm:col-span-2">
          <p className={label}>What are you good at? <span className="font-normal normal-case text-ink-400">(optional — helps us rank the best fit)</span></p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {STR.map(([v, l]) => (
              <button key={v} type="button" onClick={() => toggleStr(v)} className={chip(str.includes(v))}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {err && <p className="mt-3 text-sm text-rose-700">{err}</p>}
      <button
        type="button" onClick={submit}
        className="mt-5 w-full rounded-xl bg-saffron-500 px-6 py-3.5 text-base font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300"
      >
        Show the exams I can crack →
      </button>
      <p className="mt-2 text-center text-xs text-ink-400">Free · no signup needed to see your matches</p>
    </div>
  );
}
