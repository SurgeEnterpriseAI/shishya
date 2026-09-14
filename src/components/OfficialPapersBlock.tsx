// Official previous-year papers on the exam hub (14 Sep 2026): the question
// papers and answer keys the conducting body publishes, linked to its own
// files, never copied (src/lib/official-papers.ts). Renders nothing for an
// exam without verified rows. Server component: loads its own rows, cached
// for an hour (src/lib/official-papers-db.ts).

import { fillTemplate } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { formatPdfSize, groupPapersByYear, hostOf, listingPages } from "@/lib/official-papers";
import { loadOfficialPapers } from "@/lib/official-papers-db";

export async function OfficialPapersBlock({ examId }: { examId: string }) {
  const rows = await loadOfficialPapers(examId);
  const groups = groupPapersByYear(rows);
  const listings = listingPages(rows);
  if (groups.length === 0 && listings.length === 0) return null;
  const { t } = await getT();
  const kind = (k: string) =>
    k === "answer key"
      ? t("exam.papers.kindKey")
      : k === "question paper with answer key"
        ? t("exam.papers.kindQuestionKey")
        : t("exam.papers.kindQuestion");
  const publishers = [...new Set(groups.flatMap((g) => g.rows.map((r) => r.publisher)))];

  return (
    <div id="official-papers" className="mt-3 scroll-mt-20 rounded-md border border-ink-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-ink-900">{t("exam.papers.title")}</h3>
      <p className="mt-0.5 text-xs text-ink-500">{t("exam.papers.intro")}</p>
      {groups.length > 0 && (
        <ul className="mt-2 divide-y divide-ink-100">
          {groups.map((g) => (
            <li key={g.year} className="py-2">
              <p className="text-sm font-semibold tabular-nums text-ink-900">{g.year}</p>
              <ul className="mt-1 space-y-1.5">
                {g.rows.map((r) => (
                  <li key={r.url} className="text-sm leading-snug">
                    <span className="text-xs font-medium text-ink-500">{kind(r.kind)}:</span>{" "}
                    <a
                      href={r.url}
                      target="_blank"
                      rel="noopener nofollow"
                      className="break-words text-saffron-800 underline underline-offset-2 hover:text-saffron-900"
                    >
                      {r.paper} ↗
                    </a>
                    <span className="text-xs text-ink-500">
                      {[r.language, r.scan ? t("exam.papers.scan") : "", formatPdfSize(r.bytes)]
                        .filter(Boolean)
                        .map((s) => ` · ${s}`)
                        .join("")}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
      {publishers.length > 0 && (
        <p className="mt-1 text-xs text-ink-500">{fillTemplate(t("exam.papers.by"), { publisher: publishers.join(" · ") })}</p>
      )}
      {listings.map((r) => (
        <p key={r.url} className="mt-2 text-xs text-ink-600">
          {fillTemplate(t("exam.papers.listing"), { publisher: r.publisher, paper: r.paper })}{" "}
          <a href={r.url} target="_blank" rel="noopener nofollow" className="font-medium text-saffron-800 underline underline-offset-2">
            {hostOf(r.url)} ↗
          </a>
        </p>
      ))}
    </div>
  );
}
