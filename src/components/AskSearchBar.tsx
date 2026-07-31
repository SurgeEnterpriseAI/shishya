"use client";

// The Ask Shishya hero bar — top of the homepage, right under the live
// strip. One big box where an aspirant types a real question in plain
// language. The rotating placeholder IS the tutorial: it cycles through
// genuine questions so visitors learn what this box can do without
// reading a word of instructions.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// The placeholder IS the tutorial — one real aspirant question after
// another, covering the whole psychological range people actually ask
// from (drawn from our tutor logs and search queries): discovery,
// eligibility doubt, age anxiety, salary curiosity, comparisons,
// dates, results, and the emotional ones. A few in Hindi/Marathi/
// Telugu so vernacular aspirants instantly know they can ask in their
// own language.
const SAMPLES = [
  "I want a government job in Bihar — what can I apply for?",
  "Which exams can a 12th-pass student write?",
  "What is the salary in SSC CGL posts?",
  "I am 29 years old — which government exams am I still eligible for?",
  "How many railway job vacancies are open right now?",
  "मुझे यूपी में सरकारी नौकरी चाहिए — कौन सी परीक्षा दूं?",
  "Bank jobs for a B.Com graduate — where do I start?",
  "When is the next SSC CGL exam and am I eligible?",
  "Government jobs for women with 10th pass?",
  "SSC or Banking — which is easier to crack for a beginner?",
  "What is the age relaxation for OBC in government exams?",
  "Can I prepare for a government job without coaching?",
  "Police constable salary and physical test requirements?",
  "Which government exams have no interview stage?",
  "मैं दो बार फेल हो गया — क्या मुझे फिर से कोशिश करनी चाहिए?",
  "Teacher jobs in my state — what is the eligibility?",
  "Highest paying government job apart from UPSC?",
  "How many bank clerk vacancies this year?",
  "Can a final-year student apply for SSC CGL?",
  "सरकारी नोकरीसाठी कोणती परीक्षा सोपी आहे?",
  "Government jobs I can prepare for while working full-time?",
  "What is the expected cutoff for SSC GD this year?",
  "Which state police exams are open right now?",
  "డిగ్రీ పూర్తయింది — ఏ ప్రభుత్వ ఉద్యోగాలకు అప్లై చేయగలను?",
  "Railway ALP vs Group D — what is the difference?",
  "Am I too old for a government job at 32?",
  "Which exams can an engineering graduate write besides GATE?",
  "What documents are needed after clearing a government exam?",
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
      <p
        className={
          compact
            ? "mt-1 truncate px-2 text-center text-[11px] text-ink-500"
            : "mt-1.5 px-2 text-xs text-ink-500"
        }
      >
        Ask in any language — jobs for your state, salary, eligibility, vacancies, dates.
        Answered from Shishya&apos;s data for 177 exams. Free, no login.
      </p>
    </form>
  );
}
