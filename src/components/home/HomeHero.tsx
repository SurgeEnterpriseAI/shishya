// Home hero (26 Sep 2026, "Doors"): one sentence that says what Shishya is,
// the ungated tutor line, and a row of five section jump-pills so a 390 px
// phone sees every section before the first scroll — the stacked doors
// below then cannot read as a top-to-bottom order. Server component, no JS
// of its own; the search strip it hosts is a client island passed in.

import type { ReactNode } from "react";
import Link from "next/link";
import type { HomeDoorsCopy } from "@/lib/home-doors-copy";
import { HOME_DOOR_IDS, type HomeDoorId } from "@/lib/home-doors";

const PILL_ICON: Record<HomeDoorId, string> = {
  school: "🏫",
  entrance: "🎯",
  government: "🏛️",
  college: "🎓",
  careers: "🧭",
};

export function HomeHero({ copy, search }: { copy: HomeDoorsCopy; search?: ReactNode }) {
  return (
    <section className="pt-10 text-center sm:pt-16" aria-labelledby="home-h1">
      <h1
        id="home-h1"
        className="text-balance text-[34px] font-bold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl"
      >
        {copy.hero.h1}
      </h1>
      <p className="mx-auto mt-3.5 max-w-2xl text-balance text-[17px] leading-relaxed text-ink-600 sm:text-lg">
        {copy.hero.tagline}
      </p>
      {/* 26 Sep 2026 (founder: "bring back the search strip — for the whole
          platform, in any language"): the page passes the whole-platform
          search strip (src/components/search/SearchStrip.tsx) into this slot,
          under the tagline and above the tutor line. It replaces the interim
          exam-only Ask box; a clear match opens its page, anything else lists
          pages on /ask with the AI beside them. */}
      {search && <div className="mx-auto mt-6 max-w-2xl text-left">{search}</div>}
      {/* The proven no-login tutor path stays a text link so the hero keeps
          one accent; tutor opens are watched after this change. */}
      <Link
        href="/chat?general=1"
        data-home-cta="hero-ask"
        className="mt-3.5 inline-block text-sm font-medium text-saffron-700 hover:text-saffron-800"
      >
        {copy.hero.ask}
      </Link>

      <nav aria-label={copy.kicker.label} className="mt-6">
        <ul className="flex flex-wrap justify-center gap-2">
          {HOME_DOOR_IDS.map((id) => (
            <li key={id}>
              <a
                href={`#${id}`}
                data-home-cta={`pill-${id}`}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 text-[13px] font-semibold text-ink-800 shadow-sm transition-colors hover:border-saffron-400 hover:bg-saffron-50"
              >
                <span aria-hidden>{PILL_ICON[id]}</span>
                {copy.pills[id]}
              </a>
            </li>
          ))}
        </ul>
        {/* Independence, in words: nobody should read the pills or the
            doors as steps. */}
        <p className="mt-2.5 text-xs text-ink-500">{copy.kicker.line}</p>
      </nav>
    </section>
  );
}
