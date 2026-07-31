"use client";

// The Ask Shishya hero bar — top of the homepage, right under the live
// strip. One big box where an aspirant types a real question in plain
// language. The rotating placeholder IS the tutorial: it cycles through
// genuine questions so visitors learn what this box can do without
// reading a word of instructions.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SAMPLES = [
  "I want a government job in Bihar — what can I apply for?",
  "What is the salary in SSC CGL posts?",
  "Which exams can a 12th-pass student write?",
  "How many railway job vacancies are open right now?",
  "मुझे यूपी में सरकारी नौकरी चाहिए — कौन सी परीक्षा दूं?",
  "Bank jobs for a B.Com graduate — where do I start?",
  "When is the next SSC CGL exam and am I eligible?",
];

export function AskSearchBar({
  compact = false,
}: {
  /** compact: the pinned-band variant — no top margin, no helper line
   *  (the rotating placeholder does the teaching), so the sticky unit
   *  stays slim. */
  compact?: boolean;
} = {}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setI((v) => (v + 1) % SAMPLES.length);
        setFade(true);
      }, 250);
    }, 3200);
    return () => clearInterval(id);
  }, []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const question = q.trim();
    if (!question) {
      // Empty submit = run the currently-shown sample; the visitor is
      // saying "yes, answer THAT". Zero-typing path to the first wow.
      router.push(`/ask?q=${encodeURIComponent(SAMPLES[i])}`);
      return;
    }
    router.push(`/ask?q=${encodeURIComponent(question)}`);
  }

  return (
    <form onSubmit={submit} className={compact ? "" : "mt-4"}>
      <div className="flex items-center gap-2 rounded-2xl border-2 border-saffron-400 bg-white p-2 shadow-sm transition-shadow focus-within:shadow-md">
        <span className="pl-2 text-xl" aria-hidden>
          ✨
        </span>
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={SAMPLES[i]}
          aria-label="Ask Shishya anything about government jobs and exams"
          className={`w-full bg-transparent py-2.5 text-base text-ink-900 outline-none transition-opacity duration-200 placeholder:text-ink-400 ${
            fade ? "placeholder:opacity-100" : "placeholder:opacity-0"
          }`}
          maxLength={800}
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600"
        >
          Ask →
        </button>
      </div>
      {!compact && (
        <p className="mt-1.5 px-2 text-xs text-ink-500">
          Ask in any language — jobs for your state, salary, eligibility, vacancies, dates.
          Answered from Shishya&apos;s data for 177 exams. Free, no login.
        </p>
      )}
    </form>
  );
}
