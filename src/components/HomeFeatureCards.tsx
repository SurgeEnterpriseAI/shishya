// "What we actually do" cards — six tiles that describe the core
// platform flows in plain language. Surfaces below the funnel/search
// so visitors who scroll past "Pick a goal" see HOW Shishya helps,
// not just WHAT it asks for.
//
// Six flows, in the order they happen for a student:
//   1. Pick your exam      → goal picker / search
//   2. Daily plan          → fresh mocks every day
//   3. PYQ                 → real previous-year papers
//   4. Adaptive mocks      → each next mock targets weak topics
//   5. Weakness map        → per-topic mastery surfaces
//   6. AI tutor            → ask Shishya anything
//
// All six are pure markup — no client logic. They live in a server
// component so they're SEO-indexable and add zero JS weight.

import Link from "next/link";

interface CardSpec {
  icon: string;
  title: string;
  body: string;
  /** Where the card jumps to when clicked. Most go to /dashboard
   *  (for signed-in users) or the sign-in flow (for visitors). */
  href: string;
}

const CARDS: CardSpec[] = [
  {
    icon: "🎯",
    title: "Pick your exam",
    body:
      "Tap a goal, search by name, or browse categories. Shishya curates the right 3-5 exams for your stage instead of dumping the full 163-exam list.",
    href: "/",
  },
  {
    icon: "📅",
    title: "Daily plan",
    body:
      "Fresh mocks each day from subject experts — Shishya keeps your prep varied so you never see the same paper twice.",
    href: "/dashboard",
  },
  {
    icon: "📚",
    title: "Previous year papers",
    body:
      "Real PYQs for every exam, organised by year and topic. Practise the questions that actually appear, not made-up clones.",
    href: "/dashboard",
  },
  {
    icon: "⚙️",
    title: "Adaptive mocks",
    body:
      "Each next mock targets the topics you got wrong last time. Less time on what you've already mastered, more on what's blocking your score.",
    href: "/dashboard",
  },
  {
    icon: "📊",
    title: "Weakness map",
    body:
      "Per-topic mastery score that updates with every attempt. See exactly which 3 topics deserve tomorrow's hour — no vague percentile.",
    href: "/dashboard",
  },
  {
    icon: "💬",
    title: "AI tutor on tap",
    body:
      "Ask Shishya anything — knows your syllabus, your weak topics and every mock you've taken. Answers in English or your language.",
    href: "/chat",
  },
];

export function HomeFeatureCards({ signedIn }: { signedIn: boolean }) {
  // For signed-out visitors the dashboard/chat hrefs are gated, so
  // bounce them through /login with a callbackUrl. Keeps the funnel
  // honest — no broken clicks.
  const wrapHref = (href: string) =>
    signedIn ? href : `/login?callbackUrl=${encodeURIComponent(href)}`;

  return (
    <section className="mt-20" aria-labelledby="how-shishya-helps">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          How Shishya helps you crack it
        </p>
        <h2
          id="how-shishya-helps"
          className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
        >
          The six tools you'll actually use
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-ink-600">
          Every prep step a serious aspirant needs, on one free platform —
          curated for your exam, in your language.
        </p>
      </div>

      {/* Same column math as the goal grid above: lg has 640px of
          fixed rails eating viewport, so 3 columns would squeeze each
          card too tight. 2-col through xl, 3-col only at 2xl+. */}
      <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {CARDS.map((card) => (
          <li key={card.title}>
            <Link
              href={wrapHref(card.href)}
              prefetch={false}
              className="group block h-full rounded-xl border border-ink-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-saffron-300"
            >
              <div
                className="flex h-11 w-11 items-center justify-center rounded-lg bg-saffron-100 text-2xl transition-colors group-hover:bg-saffron-200"
                aria-hidden
              >
                {card.icon}
              </div>
              <h3 className="mt-4 text-base font-semibold text-ink-900">
                {card.title}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-600">
                {card.body}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
