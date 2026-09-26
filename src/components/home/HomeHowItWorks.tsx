// "How Shishya works" (26 Sep 2026): four steps that hold in every section
// — for a Class 9 student and a UPSC aspirant alike — and the ungated tutor
// line. The language count is INDIAN_LANGUAGE_COUNT, passed in, never typed.
// Server component, no JS.

import Link from "next/link";
import type { HomeDoorsCopy } from "@/lib/home-doors-copy";
import { fillHome } from "@/lib/home-strip-copy";

export function HomeHowItWorks({ copy, languageCount }: { copy: HomeDoorsCopy; languageCount: number }) {
  const H = copy.how;
  const steps: [string, string][] = [
    [H.s1t, H.s1b],
    [H.s2t, H.s2b],
    [H.s3t, H.s3b],
    [H.s4t, H.s4b],
  ];
  return (
    <section aria-labelledby="home-how-h2" className="mt-14">
      <h2 id="home-how-h2" className="text-center text-[22px] font-semibold tracking-tight text-ink-900">
        {H.h2}
      </h2>
      <p className="mt-1.5 text-center text-sm text-ink-500">{H.lead}</p>
      <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
        {steps.map(([title, body], i) => (
          <li key={title} className="rounded-xl border border-ink-200 bg-white p-[18px]">
            <span
              aria-hidden
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-saffron-100 text-[13px] font-bold text-saffron-800"
            >
              {i + 1}
            </span>
            <h3 className="mt-2.5 text-[15px] font-semibold text-ink-900">{title}</h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ink-600">{body}</p>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-center text-sm">
        <Link href="/chat?general=1" data-home-cta="how-ask" className="font-semibold text-saffron-700 hover:text-saffron-800">
          {fillHome(H.ask, { n: languageCount })}
        </Link>
      </p>
    </section>
  );
}
