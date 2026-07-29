// Wall of Grinders — anonymous social proof. Shows today's real effort
// (practice sets, topics, doubts) per aspirant with their exam, never a
// name and never a score. Renders nothing when the day is still quiet,
// so a new visitor never sees an empty hall.

import Link from "next/link";
import type { GrinderEntry } from "@/lib/wall-of-grinders";

export function WallOfGrinders({ entries }: { entries: GrinderEntry[] }) {
  if (entries.length < 3) return null;

  return (
    <section className="mt-12" aria-labelledby="wall-of-grinders">
      <div className="text-center">
        <p className="inline-flex items-center gap-2 rounded-full bg-saffron-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-saffron-800">
          <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-saffron-500" aria-hidden />
          Wall of Grinders · today
        </p>
        <h2 id="wall-of-grinders" className="mt-3 text-xl font-bold text-ink-900 sm:text-2xl">
          Right now, across India, aspirants are putting in the work
        </h2>
        <p className="mt-1.5 text-sm text-ink-600">
          Real effort from today — no names, no scores, no ranking. Just people like you,
          showing up.
        </p>
      </div>

      <ul className="mx-auto mt-5 grid max-w-3xl gap-2 sm:grid-cols-2">
        {entries.map((e, i) => (
          <li
            key={i}
            className="flex items-start gap-3 rounded-xl border border-ink-200 bg-white px-4 py-3"
          >
            <span className="text-lg leading-none" aria-hidden>
              {e.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink-900">{e.who}</span>
              <span className="block text-xs text-ink-600">{e.what}</span>
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-center text-sm text-ink-700">
        <Link href="/coach" className="font-bold text-saffron-700 hover:underline">
          Put your name on tomorrow&apos;s wall — start your free plan →
        </Link>
      </p>
    </section>
  );
}
