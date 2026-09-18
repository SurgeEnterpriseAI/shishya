// "What we actually do" cards — six tiles that describe the core
// platform flows in plain language. Surfaces below the funnel/search
// so visitors who scroll past "Pick a goal" see HOW Shishya helps,
// not just WHAT it asks for.
//
// Six flows, in the order they happen for a student:
//   1. Pick your exam      → goal picker / search
//   2. Daily plan          → fresh mocks every day
//   3. PYQ                 → PYQ-pattern papers (modelled on each year's paper)
//   4. Adaptive mocks      → each next mock targets weak topics
//   5. Weakness map        → per-topic mastery surfaces
//   6. AI tutor            → ask Shishya anything
//
// Pure markup — no client logic. They live in a server component so
// they're SEO-indexable and add zero JS weight. Five cards render (flow 1
// is the goal picker above them), so the heading names no count (16 Sep 2026).

import Link from "next/link";
import { homeStripCopy, type HomeStripCopy } from "@/lib/home-strip-copy";

interface CardSpec {
  icon: string;
  title: string;
  body: string;
  /** Where the card jumps to when clicked. Most go to /dashboard
   *  (for signed-in users) or the sign-in flow (for visitors). */
  href: string;
}

// 16 Sep 2026: the card copy comes from src/lib/home-strip-copy.ts so the /hi
// and /te twins of "/" read in the visitor's language. English is unchanged,
// and the PYQ card keeps saying "PYQ-pattern … modelled on each year's paper"
// in every locale.
const cardsFor = (C: HomeStripCopy): CardSpec[] => [
  { icon: "🎓", title: C.featCoachTitle, body: C.featCoachBody, href: "/coach" },
  { icon: "📚", title: C.featPyqTitle, body: C.featPyqBody, href: "/dashboard" },
  { icon: "⚙️", title: C.featAdaptiveTitle, body: C.featAdaptiveBody, href: "/dashboard" },
  { icon: "📊", title: C.featWeaknessTitle, body: C.featWeaknessBody, href: "/dashboard" },
  { icon: "💬", title: C.featTutorTitle, body: C.featTutorBody, href: "/chat" },
];

export function HomeFeatureCards({ signedIn, locale }: { signedIn: boolean; locale?: string }) {
  const C = homeStripCopy(locale);
  const CARDS = cardsFor(C);
  // For signed-out visitors the dashboard/chat hrefs are gated, so
  // bounce them through /login with a callbackUrl. Keeps the funnel
  // honest — no broken clicks.
  const wrapHref = (href: string) =>
    signedIn ? href : `/login?callbackUrl=${encodeURIComponent(href)}`;

  return (
    <section className="mt-20" aria-labelledby="how-shishya-helps">
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
          {C.featKicker}
        </p>
        <h2
          id="how-shishya-helps"
          className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl"
        >
          {C.featHeading}
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-ink-600">{C.featSub}</p>
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
