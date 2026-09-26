// The comparison table of the exam list pages (26 Sep 2026, G4):
// /exams/category/{slug} and /exams/after/{level}. Server-rendered; every
// cell comes from the row (src/lib/exam-list-rows.ts) or the hand-checked
// deep content (src/lib/exam-categories.ts eligibilityView):
//   exam → its hub, conducting body, next exam day with its tier, age limit
//   and qualification (labelled "checked {month}" or "indicative" with the
//   source link), official site, and Shishya's mock-test count.
// No vacancies and no paper pattern (no provenance for either).

import Link from "next/link";
import { eligibilityView, nextExamCell, type ExamLike } from "@/lib/exam-categories";

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function ExamCompareTable({ rows, showLevels = false }: { rows: readonly ExamLike[]; showLevels?: boolean }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-lg border border-ink-200 bg-white">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-ink-50 text-[11px] uppercase tracking-wider text-ink-500">
          <tr>
            <th scope="col" className="px-3 py-2 font-semibold">Exam</th>
            <th scope="col" className="px-3 py-2 font-semibold">Next exam day</th>
            <th scope="col" className="px-3 py-2 font-semibold">Age limit</th>
            <th scope="col" className="px-3 py-2 font-semibold">Qualification</th>
            <th scope="col" className="px-3 py-2 font-semibold">Official site</th>
            <th scope="col" className="px-3 py-2 font-semibold">Practice on Shishya</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-100 align-top">
          {rows.map((e) => {
            const el = eligibilityView(e);
            const levels = (e.eligibility?.educationTags ?? []).filter((t) => ["10TH", "ITI", "12TH", "DIPLOMA", "GRADUATE", "POSTGRADUATE"].includes(t)).length;
            return (
              <tr key={e.code}>
                <td className="px-3 py-3">
                  <Link href={`/exams/${e.code}`} className="font-semibold text-ink-900 hover:text-saffron-800 hover:underline">
                    {e.shortName}
                  </Link>
                  {e.name !== e.shortName && <p className="mt-0.5 text-xs text-ink-500">{e.name}</p>}
                  {e.eligibility?.officialName && <p className="mt-0.5 text-[11px] text-ink-500">{e.eligibility.officialName}</p>}
                </td>
                <td className="px-3 py-3 text-xs text-ink-700">{nextExamCell(e)}</td>
                <td className="px-3 py-3 text-xs text-ink-700">{el ? el.age : "Not listed"}</td>
                <td className="px-3 py-3 text-xs text-ink-700">
                  {el ? (
                    <>
                      <span>{el.qualification}</span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wider text-ink-500">
                        {el.basis === "checked" ? `Checked against the notification (${el.checkedMonth})` : "Indicative — confirm officially"}
                        {el.sourceUrl && (
                          <>
                            {" · "}
                            <a href={el.sourceUrl} target="_blank" rel="noopener noreferrer" className="normal-case text-saffron-700 hover:underline">
                              source ↗
                            </a>
                          </>
                        )}
                      </span>
                      {showLevels && levels > 1 && (
                        <span className="mt-1 block text-[10px] uppercase tracking-wider text-amber-800">Several levels listed — see the rule</span>
                      )}
                    </>
                  ) : (
                    "Not listed"
                  )}
                </td>
                <td className="px-3 py-3 text-xs">
                  {e.eligibility?.officialUrl ? (
                    <a href={e.eligibility.officialUrl} target="_blank" rel="noopener noreferrer" className="text-saffron-700 hover:underline">
                      {host(e.eligibility.officialUrl)} ↗
                    </a>
                  ) : (
                    <span className="text-ink-500">Not listed</span>
                  )}
                </td>
                <td className="px-3 py-3 text-xs text-ink-700">
                  {e.mockCount > 0 ? `${e.mockCount} mock ${e.mockCount === 1 ? "test" : "tests"}` : "No mock test yet"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
