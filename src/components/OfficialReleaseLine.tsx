// OfficialReleaseLine — "Official answer key released — {date} — {host}" and
// "Official result published — {date} — {host}" on the exam hub and the
// tracker (30 Sep 2026). Server component, no DB reads: the caller hands the
// live tracker rows it already loaded.
//
// Only rows the official watch wrote (source official-watch: our own fetch
// read the link on the conducting body's page) are worded "released" /
// "published" (src/lib/official-release.ts); they show for 30 days after the
// release, whatever the exam-week phase. Every other row keeps the tracker's
// "{date} (official)". Renders nothing when no such row is recent.

import type { Locale, StringKey } from "@/lib/i18n";
import { tFor } from "@/lib/i18n-server";
import { officialReleases, releaseLineKey, releaseLineParts, type OfficialRelease, type ReleaseRowInput } from "@/lib/official-release";

export function OfficialReleaseLine({
  rows,
  officialUrl,
  locale,
  now = new Date(),
}: {
  rows: readonly ReleaseRowInput[];
  officialUrl: string | null;
  locale: Locale;
  now?: Date;
}) {
  const rs = officialReleases(rows, officialUrl, now);
  const list = [rs.result, rs.answerKey].filter((r): r is OfficialRelease => !!r).sort((a, b) => b.date.getTime() - a.date.getTime());
  if (list.length === 0) return null;
  const t = tFor(locale) as (key: StringKey) => string;
  return (
    <section id="official-release" className="mt-4 space-y-1.5">
      {list.map((r) => {
        const p = releaseLineParts(t(releaseLineKey(r)), r, locale);
        return (
          <p
            key={r.id}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900"
            data-release-kind={r.kind}
          >
            <span aria-hidden className="mr-1">
              {r.kind === "ANSWER_KEY" ? "🔑" : "🏁"}
            </span>
            {p.before}
            <a href={r.url} target="_blank" rel="noopener noreferrer" className="underline decoration-emerald-400 underline-offset-2 hover:text-emerald-700">
              {p.host} ↗
            </a>
            {p.after}
          </p>
        );
      })}
    </section>
  );
}
