// Official sample papers on the exam hub (29 Sep 2026). A student who had just
// taken an SOF IEO practice set asked for "free PDFs of sample papers". SOF
// publishes one free sample paper per class on sofworld.org ("SAMPLE PAPER
// 2026-27" on page 1); this block links those files — the body's own, never a
// copy — verified by scripts/import-official-papers.ts. They are the body's
// practice papers for the coming exam, not previous years' papers, and the
// block says so. Renders nothing for an exam without verified sample papers.

import { fillTemplate } from "@/lib/i18n";
import { getT } from "@/lib/i18n-server";
import { formatPdfSize, sampleClassOf, samplePaperGroups } from "@/lib/official-papers";
import { loadOfficialSamplePapers } from "@/lib/official-papers-db";

export async function OfficialSamplePapersBlock({ examId }: { examId: string }) {
  const groups = samplePaperGroups(await loadOfficialSamplePapers(examId));
  if (groups.length === 0) return null;
  const { t } = await getT();
  const label = (paper: string) => {
    const n = sampleClassOf(paper);
    if (n === null) return paper;
    const rest = paper.replace(/^\s*class\s*\d{1,2}\s*/i, "").replace(/^[·,:–-]\s*/, "").trim();
    return fillTemplate(t("exam.samples.class"), { n: String(n) }) + (rest ? ` · ${rest}` : "");
  };

  return (
    <div id="official-sample-papers" className="mt-3 scroll-mt-20 rounded-md border border-ink-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-ink-900">{t("exam.samples.title")}</h3>
      {groups.map((g) => (
        <div key={g.session} className="mt-1">
          <p className="text-xs text-ink-500">{fillTemplate(t("exam.samples.intro"), { publisher: g.publisher, session: g.session })}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {g.rows.map((r) => (
              <li key={r.url}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener nofollow"
                  title={[r.language, r.scan ? t("exam.papers.scan") : "", formatPdfSize(r.bytes)].filter(Boolean).join(" · ")}
                  className="inline-flex min-h-[40px] items-center rounded-md border border-ink-200 px-3 py-1.5 text-sm font-medium text-saffron-800 hover:border-saffron-400 hover:text-saffron-900"
                >
                  {label(r.paper)} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
