// /soft-skills — Soft skills + employability content hub.
//
// What schools + colleges don't teach but employers expect: English
// fluency, professional communication, presentation skills, email writing,
// time management, basic financial literacy, work etiquette.

import Link from "next/link";
import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Soft Skills + Employability — English, communication, professional life | Shishya",
  description:
    "What schools + colleges don't teach but every employer expects. English fluency, professional communication, email writing, presentation skills, time management, financial literacy basics. Free, India-context.",
  alternates: { canonical: "https://shishya.in/soft-skills" },
  keywords: [
    "english fluency india",
    "professional communication",
    "email writing professional",
    "presentation skills",
    "time management students",
    "financial literacy india",
    "soft skills employability",
  ],
};

export const revalidate = 86_400;

const SKILLS = [
  {
    slug: "english-fluency",
    icon: "🗣️",
    name: "English Fluency",
    why: "More than degree quality, this gates entry to product companies, consulting, IB, MBA programmes, and most corporate roles. Even within India, English fluency separates ₹3 LPA from ₹10 LPA roles at the same fresher tier.",
    realisticTimeline: "6-12 months of consistent practice to move from B1 → C1.",
    whatWorks: [
      "Read English daily — fiction or non-fiction, doesn't matter. Build vocabulary by exposure, not by memorising word lists.",
      "Listen to native podcasts (BBC, NPR, Freakonomics) with subtitles. Mimic native speakers' rhythm + intonation aloud.",
      "Write daily — journaling, blogs, even tweets. Get a peer or AI to flag mistakes.",
      "Speak aloud daily — read articles aloud + record yourself + play back. Brutal but works.",
      "British Council + Cambridge Assessment offer free resources online.",
    ],
    whatDoesnt: [
      "Memorising 'word of the day' lists — without context they don't stick",
      "Watching Hollywood movies passively — entertainment without active engagement",
      "Spoken English classes that focus only on grammar — practice + correction matters",
      "Avoiding speaking until you're 'ready' — you become fluent by speaking imperfectly",
    ],
    careerImpact: "Direct: tech sales, consulting, content writing, customer success, BPO/BPM, journalism. Indirect: all other careers gate at communication.",
  },
  {
    slug: "professional-communication",
    icon: "📧",
    name: "Professional Communication",
    why: "Bad email = junior. Good email = professional. Most students enter the workforce writing personal-tone emails to clients/managers, signalling inexperience.",
    realisticTimeline: "2-3 months of consistent practice to write competent professional emails + chat.",
    whatWorks: [
      "Subject line: 5-7 words, action-oriented (\"Q3 review meeting — proposed slots\").",
      "First sentence states the ask or context. Don't bury it.",
      "Use bullet points for >2 items. Wall of text is unread.",
      "Sign off professionally. \"Best, [Name]\" works for 95% of emails.",
      "For Slack/Teams: avoid \"Hi can I ask you something\" — just ask the question. Lead with the question.",
    ],
    whatDoesnt: [
      "Over-formal Victorian English (\"Greetings esteemed sir, hoping this missive finds you in optimum health\")",
      "Excessive emojis in professional contexts",
      "Vague asks (\"Need help with something whenever you're free\")",
      "Avoiding ownership (\"It happened that the file...\" instead of \"I uploaded the wrong file\")",
    ],
    careerImpact: "Universal. Your written communication is the first proof of your professionalism every single day.",
  },
  {
    slug: "presentation-skills",
    icon: "🎤",
    name: "Presentation Skills",
    why: "Promotion path post-30 typically requires presenting to senior stakeholders. Engineers who can present become managers; engineers who can't stay ICs.",
    realisticTimeline: "Cumulative — 5-10 presentations is when habits form. 50+ before you're consistently good.",
    whatWorks: [
      "Slide design: 1 idea per slide. Less text. More visual.",
      "Tell a story, not a data dump. Setup → conflict → resolution → ask.",
      "Practice with a timer. 80% of presentation issues are people running over.",
      "Record yourself — body language + filler words + pacing are invisible until you watch playback.",
      "Toastmasters + local Toastmasters clubs are still the best India-wide practice ground.",
    ],
    whatDoesnt: [
      "Reading slides word-for-word",
      "Cramming 12 bullets per slide",
      "Apologising at the start (\"Sorry I'm not very good at this...\")",
      "Random animations + transitions distracting from content",
    ],
    careerImpact: "Direct: any client-facing role, consulting, sales, founders, senior management. Indirect: promotion path beyond mid-IC.",
  },
  {
    slug: "time-management",
    icon: "⏰",
    name: "Time Management + Deep Work",
    why: "Difference between productive 8-hour workday and meandering 11-hour workday is structured time blocks + ruthless prioritisation. Students underestimate how much of senior-level work is just consistent focus.",
    realisticTimeline: "2-4 weeks of habit-building. Lifetime of refinement.",
    whatWorks: [
      "Block time on calendar for deep work — 2-hour blocks beat 8 fragmented hours.",
      "Eisenhower matrix: urgent + important / urgent / important / neither. Most of \"urgent\" is someone else's poor planning.",
      "Phone away during deep work. Notifications off. Single-tab browser.",
      "Plan the next day the previous evening. Brain processes overnight.",
      "Weekly review (1 hour, Sunday) — what worked, what didn't, plan next week.",
    ],
    whatDoesnt: [
      "Productivity apps without consistent use — habit beats tooling",
      "Multitasking — actual task-switching with 23-min recovery time per switch (research)",
      "All-nighters or weekend grinds — burnout debt accrues",
      "Pomodoro for everyone — works for some, not all",
    ],
    careerImpact: "Universal. Senior pay correlates with focused output per hour, not hours worked.",
  },
  {
    slug: "financial-literacy",
    icon: "💰",
    name: "Personal Financial Literacy",
    why: "Schools + colleges don't teach: SIP vs lump sum, term + health insurance, tax planning, mortgages, credit cards. Most Indian professionals learn by losing money on bad advice from \"finance uncles\".",
    realisticTimeline: "2-4 weeks of structured learning + lifetime of execution.",
    whatWorks: [
      "Read Zerodha Varsity (free, India-context, no upsell).",
      "Start SIPs in 1-2 index funds (Nifty 50 + Nifty 500) before stock picking.",
      "Take term insurance (NOT ULIP) at age 25 — premium locked.",
      "Health insurance ₹10L+ floater for family — out-of-pocket medical is largest cause of Indian middle-class bankruptcies.",
      "Track expenses for 3 months — discover where money actually goes.",
      "Tax: NPS + 80C + Section 24 (home loan interest) — basic optimisations save lakhs over a career.",
    ],
    whatDoesnt: [
      "Trading stocks short-term as a primary investment strategy (~95% retail traders lose)",
      "LIC traditional plans with ULIP-bundled insurance — split insurance + investment",
      "Crypto as a savings strategy (different from speculation)",
      "Following random social-media \"finance gurus\" who push specific products",
    ],
    careerImpact: "Indirect but massive. Financial stability gives optionality in career choices — can afford to leave bad jobs, take entrepreneurship risks, switch fields.",
  },
  {
    slug: "interview-presence",
    icon: "🤝",
    name: "Interview Presence + Networking",
    why: "Knowing someone at a company increases your callback rate 5-10x. Networking + interview presence are skills, not luck.",
    realisticTimeline: "3-6 months to build a meaningful professional network + 50+ informational chats.",
    whatWorks: [
      "LinkedIn: post your work + commentary monthly. Comment thoughtfully on industry leaders' posts.",
      "Cold-DM senior people with specific asks (\"I'm building X; you mentioned Y last week — could we talk for 15 min?\").",
      "Attend 1-2 in-person events monthly — meetups, conferences, alumni gatherings.",
      "Interview prep: research the company, prepare 2-3 specific examples for each STAR-format question.",
      "End every interview asking a thoughtful question. Don't ask \"what's the work culture like\" — research that.",
    ],
    whatDoesnt: [
      "Mass LinkedIn connection requests with no message",
      "Generic \"I'm looking for opportunities\" outreach",
      "Memorising scripted answers — interviewers detect them instantly",
      "Avoiding eye contact + low energy — confidence is partly performative",
    ],
    careerImpact: "Direct: every job switch, internal promotion negotiation, freelance client acquisition.",
  },
];

export default function SoftSkillsPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Soft Skills + Employability — English, communication, professional life",
            description:
              "What schools + colleges don't teach but every employer expects. English fluency, professional communication, email writing, presentation skills, time management, financial literacy basics. Free, India-context.",
            path: "/soft-skills",
          }),
          breadcrumbLd([["Soft skills", "/soft-skills"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Soft Skills + Employability
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink-900 sm:text-4xl">
          What schools + colleges don't teach
        </h1>
        <p className="mt-2 max-w-3xl text-base text-ink-700">
          English fluency. Professional email. Presenting to seniors. Time
          management. Financial literacy. Interview presence. The skills
          that gate employability + promotion as much as your degree does
          — none of which appear in NCERT.
        </p>

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50/40 p-5 text-sm text-ink-700">
          <p className="font-semibold text-ink-900">Why these matter more than you think</p>
          <p className="mt-2 text-xs">
            Two engineers with the same CGPA from the same college, one of
            whom can present clearly + write decent emails + comes across
            confident in interviews — will earn 30-50% more by year 5. The
            "soft skills" framing under-sells how concretely these affect
            promotion + pay. They're hard skills, just less visible than
            coding or accounting.
          </p>
        </div>

        {/* Skills */}
        <ul className="mt-10 space-y-6">
          {SKILLS.map((s) => (
            <li key={s.slug} id={s.slug} className="rounded-lg border border-ink-200 bg-white p-6">
              <div className="flex items-baseline gap-3">
                <span className="text-3xl">{s.icon}</span>
                <h2 className="text-xl font-semibold text-ink-900">{s.name}</h2>
              </div>
              <p className="mt-3 text-sm text-ink-700"><strong>Why it matters:</strong> {s.why}</p>
              <p className="mt-2 text-xs text-ink-600"><strong>Realistic timeline:</strong> {s.realisticTimeline}</p>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700">What works</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-700">
                    {s.whatWorks.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
                <div className="rounded-lg border border-rose-200 bg-rose-50/30 p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-rose-700">What doesn't</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-ink-700">
                    {s.whatDoesnt.map((w, i) => <li key={i}>{w}</li>)}
                  </ul>
                </div>
              </div>

              <p className="mt-4 text-xs text-ink-700"><strong>Career impact:</strong> {s.careerImpact}</p>
            </li>
          ))}
        </ul>

        <div className="mt-12 rounded-lg border border-saffron-200 bg-saffron-50/40 p-5 text-sm text-ink-700">
          <h2 className="text-base font-semibold text-ink-900">If you're starting from scratch</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs">
            <li><strong>Pick one skill</strong>, not all six. Multi-tasking 6 skills = 6 weak ones.</li>
            <li><strong>English fluency first</strong> if you're below C1. Everything else compounds easier on top.</li>
            <li><strong>Practice in real situations</strong>. Office emails, college presentations, real conversations — not just YouTube tutorials.</li>
            <li><strong>Find feedback loops</strong>. Peer reviews, Toastmasters, AI feedback, mentorship.</li>
            <li><strong>Stack over years</strong>. By year 10, the compounded difference between you + someone who skipped these is substantial.</li>
          </ol>
        </div>
      </section>
    </main>
  );
}
