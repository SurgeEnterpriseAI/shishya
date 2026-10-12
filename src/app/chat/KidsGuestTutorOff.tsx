// /chat?examCode=<kids' exam> for a guest (14 Oct 2026, Release 2 — the rule
// and why in src/lib/kids-tutor.ts): the short line in place of the chat. The
// chat island never mounts, so nothing is sent — a seed in the URL included —
// and nothing is logged. No sign-up offer: a kids' exam's pages carry none.

import Link from "next/link";
import { kidsGuestTutorView, type KidsTutorLang, type KidsTutorOffer } from "@/lib/kids-tutor";

export function KidsGuestTutorOff({ offer, lang }: { offer: KidsTutorOffer; lang: KidsTutorLang }) {
  const v = kidsGuestTutorView(offer, lang);
  return (
    <div className="mt-4 rounded-md border border-ink-200 bg-white px-5 py-5" data-kids-guest-tutor-off="">
      <p className="text-sm text-ink-800">{v.line}</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {v.links.map((l) => (
          <li key={l.kind}>
            <Link
              href={l.href}
              className="inline-flex min-h-[40px] items-center rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-saffron-800 hover:border-saffron-400 hover:text-saffron-900"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
