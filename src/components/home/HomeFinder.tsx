// "Know your exam? Type it." (26 Sep 2026): the one typed exam search on the
// page (the existing HomeSearch island, 16 px input so iOS does not zoom),
// the exams most people sit as one-tap chips, the 2-minute finder and the
// catalogue. Keeps the proven paths: every exam page one tap away.
//
// 26 Sep 2026 (review): the live catalogue count (portalStats.examCount,
// "170+" when the DB is down) lives here on "Browse all {n} exams", the one
// link that opens exactly the rows it counts — government AND entrance —
// and not on the Government door, whose 180 would have overstated it.

import Link from "next/link";
import { HomeSearch } from "@/components/HomeSearch";
import type { ExamCard } from "@/components/ExamPicker";
import type { HomeDoorsCopy } from "@/lib/home-doors-copy";
import { fillHome } from "@/lib/home-strip-copy";

export function HomeFinder({
  copy,
  exams,
  chips,
  examCount,
}: {
  copy: HomeDoorsCopy;
  exams: ExamCard[];
  chips: ExamCard[];
  /** portalStats.examCount — the whole catalogue, the page /exams/browse lists. */
  examCount: string;
}) {
  const F = copy.finder;
  return (
    <section
      id="exams"
      aria-labelledby="home-finder-h2"
      className="mt-8 scroll-mt-4 rounded-2xl border border-ink-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider text-saffron-700">{F.kicker}</p>
      <h2 id="home-finder-h2" className="mt-1 text-xl font-semibold tracking-tight text-ink-900">
        {F.h2}
      </h2>
      <p className="mt-1 text-sm text-ink-600">{F.sub}</p>
      {/* HomeSearch carries the old page's mt-10 / max-w-2xl on its root;
          the child variants override both so it sits flush in this card. */}
      <div className="[&>div]:mt-3.5 [&>div]:max-w-none">
        <HomeSearch exams={exams} />
      </div>
      {chips.length > 0 && (
        <div className="mt-4">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-500">{F.mostTaken}</p>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {chips.map((e) => (
              <li key={e.code}>
                <Link
                  href={`/exams/${e.code}`}
                  prefetch={false}
                  data-home-cta={`chip-${e.code}`}
                  className="inline-flex min-h-[36px] items-center rounded-lg border border-ink-200 bg-white px-3 text-[13px] font-semibold text-ink-800 transition-colors hover:border-saffron-400 hover:bg-saffron-50"
                >
                  {e.shortName}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        <Link href="/find-your-exam" data-home-cta="finder" className="font-semibold text-saffron-700 hover:text-saffron-800">
          {F.finder}
        </Link>
        <Link href="/exams/browse" data-home-cta="browse-all" className="font-medium text-ink-500 hover:text-ink-800">
          {fillHome(F.browse, { n: examCount })}
        </Link>
      </div>
    </section>
  );
}
