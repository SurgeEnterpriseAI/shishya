// "What we promise about your data" (17 Oct 2026, founder: tell students,
// parents and everyone their data is safe). Only promises the privacy policy
// already makes — never sold or rented, no ads / nothing shared with
// advertisers, scores never published with a name, deletion on request within
// 30 days — and who makes Shishya. No line says where data is kept: the
// database and site servers are in Singapore and most AI calls go to Claude,
// so "your data stays in Bengaluru / India" would be untrue (pinned in
// tests/unit/home-doors.test.ts). Server component, no JS.

import Link from "next/link";
import type { HomeDoorsCopy } from "@/lib/home-doors-copy";

const DELETE_EMAIL = "corp@surgesoftware.co.in";

export function HomeTrust({ copy }: { copy: HomeDoorsCopy }) {
  const T = copy.trust;
  const promises = [T.sell, T.ads, T.names];
  return (
    <section aria-labelledby="home-trust-h2" className="mt-12 rounded-2xl border border-ink-200 bg-white p-5 sm:p-6">
      <h2 id="home-trust-h2" className="text-[19px] font-semibold tracking-tight text-ink-900">
        {T.h2}
      </h2>
      <p className="mt-1 text-sm text-ink-500">{T.lead}</p>
      <ul className="mt-4 grid grid-cols-1 gap-x-6 gap-y-2.5 text-[14px] leading-relaxed text-ink-700 sm:grid-cols-2">
        {promises.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="mt-0.5 text-emerald-600">✓</span>
            <span>{line}</span>
          </li>
        ))}
        <li className="flex gap-2">
          <span aria-hidden className="mt-0.5 text-emerald-600">✓</span>
          <span>
            {T.delete}{" "}
            <a href={`mailto:${DELETE_EMAIL}`} className="whitespace-nowrap text-saffron-700 underline underline-offset-2">
              {DELETE_EMAIL}
            </a>
          </span>
        </li>
      </ul>
      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-600">
        <span>{T.maker}</span>
        <Link href="/privacy" data-home-cta="trust-privacy" className="font-medium text-saffron-700 hover:text-saffron-800">
          {T.policy}
        </Link>
      </p>
    </section>
  );
}
