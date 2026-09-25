// Official papers and the full-length mock on a PYQ year page (25 Sep 2026).
//
// OfficialYearPapers is the page's "original {year} paper" block (14 Sep
// 2026), moved here so the empty-year view can show it too. A year whose
// only official files are answer keys is now headed as the answer key, not
// as the paper.
//
// WholePaperLinks answers "the real 200 question paper": the exam's
// full-length real-pattern mock, and the conducting body's papers from other
// years when this year has none. Selection and copy: src/lib/pyq-full-paper.ts.
// It renders nothing when there is nothing real to link — no placeholder.
//
// The mock link is /mocks/{id}, exactly what the hub's "Full-Length Mock
// (Real Pattern)" tile links: a signed-out visitor meets the same sign-in
// redirect there as from the hub. Server components — no client bundle.

import Link from "next/link";
import type { Locale } from "@/lib/i18n";
import { tFor } from "@/lib/i18n-server";
import { formatPdfSize, hostOf, type OfficialPaperRow } from "@/lib/official-papers";
import { fillPyq, pyqYearCopy } from "@/lib/pyq-year-copy";
import {
  hasWholePaperLinks,
  isQuestionPaper,
  publishersOf,
  pyqFullPaperCopy,
  type FullPatternLink,
  type OfficialPaperLinks,
} from "@/lib/pyq-full-paper";

const fileLinkCls = "break-words font-medium text-saffron-800 underline underline-offset-2 hover:text-saffron-900";

function PaperLine({ r, locale, showYear }: { r: OfficialPaperRow; locale: Locale; showYear?: boolean }) {
  const t = tFor(locale);
  const P = pyqYearCopy(locale);
  // The hub's kind labels (exam.papers.*), in the reader's language.
  const kind =
    r.kind === "answer key"
      ? t("exam.papers.kindKey")
      : r.kind === "question paper with answer key"
        ? t("exam.papers.kindQuestionKey")
        : t("exam.papers.kindQuestion");
  return (
    <li className="text-sm leading-snug">
      {showYear && <span className="text-xs font-semibold tabular-nums text-ink-700">{r.year} · </span>}
      <a href={r.url} target="_blank" rel="noopener nofollow" className={fileLinkCls}>
        {r.paper} ↗
      </a>
      <span className="text-xs text-ink-500">
        {[kind, r.language, r.scan ? P.scannedPdf : P.pdf, formatPdfSize(r.bytes)]
          .filter(Boolean)
          .map((s) => ` · ${s}`)
          .join("")}
      </span>
    </li>
  );
}

/** That year's official files, as the conducting body published them. */
export function OfficialYearPapers({ rows, year, locale }: { rows: OfficialPaperRow[]; year: number; locale: Locale }) {
  if (rows.length === 0) return null;
  const P = pyqYearCopy(locale);
  const F = pyqFullPaperCopy(locale);
  const heading = rows.some(isQuestionPaper) ? P.officialHeading : F.officialKeyHeading;
  return (
    <div id="official-paper" className="mt-3 max-w-3xl rounded-md border border-ink-200 bg-white p-3">
      <p className="text-sm font-semibold text-ink-900">{fillPyq(heading, { year, publisher: rows[0].publisher })}</p>
      <ul className="mt-1 space-y-1">
        {rows.map((r) => (
          <PaperLine key={r.url} r={r} locale={locale} />
        ))}
      </ul>
    </div>
  );
}

export function WholePaperLinks({
  fullMock,
  official,
  examCode,
  examShortName,
  locale,
}: {
  fullMock: FullPatternLink | null;
  official: OfficialPaperLinks;
  examCode: string;
  examShortName: string;
  locale: Locale;
}) {
  if (!hasWholePaperLinks(fullMock, official)) return null;
  const t = tFor(locale);
  const F = pyqFullPaperCopy(locale);
  const hasPapers = official.otherYears.length > 0 || official.listings.length > 0 || official.moreOnHub;
  return (
    <div id="whole-paper" className="mt-3 max-w-3xl rounded-md border border-saffron-200 bg-saffron-50/40 p-3">
      {fullMock && (
        <div>
          <Link
            href={`/mocks/${fullMock.id}`}
            prefetch={false}
            rel="nofollow"
            className="text-sm font-semibold text-saffron-800 underline underline-offset-2 hover:text-saffron-900"
          >
            {fillPyq(fullMock.minutes ? F.fullMock : F.fullMockNoMin, { n: fullMock.questions, m: fullMock.minutes ?? "" })} →
          </Link>
          <p className="mt-0.5 text-xs text-ink-500">{F.fullMockNote}</p>
        </div>
      )}
      {hasPapers && (
        <div className={fullMock ? "mt-3 border-t border-saffron-100 pt-2" : ""}>
          {official.otherYears.length > 0 && (
            <>
              <p className="text-sm font-semibold text-ink-900">
                {fillPyq(F.otherYearsHeading, { publisher: publishersOf(official.otherYears) })}
              </p>
              <ul className="mt-1 space-y-1">
                {official.otherYears.map((r) => (
                  <PaperLine key={r.url} r={r} locale={locale} showYear />
                ))}
              </ul>
            </>
          )}
          {official.listings.map((r) => (
            <p key={r.url} className="text-xs text-ink-600">
              {fillPyq(t("exam.papers.listing"), { publisher: r.publisher, paper: r.paper })}{" "}
              <a href={r.url} target="_blank" rel="noopener nofollow" className="font-medium text-saffron-800 underline underline-offset-2">
                {hostOf(r.url)} ↗
              </a>
            </p>
          ))}
          {official.moreOnHub && (
            <Link
              href={`/exams/${examCode}#official-papers`}
              className={`${official.otherYears.length > 0 || official.listings.length > 0 ? "mt-1 " : ""}inline-block text-xs font-medium text-saffron-700 hover:text-saffron-800`}
            >
              {fillPyq(F.allOfficial, { short: examShortName })}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
