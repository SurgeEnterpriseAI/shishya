"use client";

// Client half of /revision: tabbed (Mistakes | Starred) list grouped by
// exam, expandable question cards showing the correct answer + solution,
// star toggles, and a one-tap "Re-test these" that spawns a REVISION
// mock via the existing /api/mocks engine (min 5 questions).

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiPost } from "@/lib/api";

export interface NotebookQuestion {
  id: string;
  body: string;
  options: { key: string; text: string }[];
  answerKey: string;
  solution: string;
  topicName: string;
  examCode: string;
  examShort: string;
}

function groupByExam(qs: NotebookQuestion[]) {
  const groups = new Map<string, { examCode: string; examShort: string; qs: NotebookQuestion[] }>();
  for (const q of qs) {
    const g = groups.get(q.examCode) ?? { examCode: q.examCode, examShort: q.examShort, qs: [] };
    g.qs.push(q);
    groups.set(q.examCode, g);
  }
  return [...groups.values()].sort((a, b) => b.qs.length - a.qs.length);
}

export function RevisionNotebook({
  mistakes,
  starred,
  starredIds,
}: {
  mistakes: NotebookQuestion[];
  starred: NotebookQuestion[];
  starredIds: string[];
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"mistakes" | "starred">("mistakes");
  const [stars, setStars] = useState<Set<string>>(new Set(starredIds));
  const [openId, setOpenId] = useState<string | null>(null);
  const [busyExam, setBusyExam] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // Starred tab reflects live toggles; un-starring hides the card there.
  const starredLive = useMemo(
    () => starred.filter((q) => stars.has(q.id)),
    [starred, stars],
  );
  const list = tab === "mistakes" ? mistakes : starredLive;
  const groups = useMemo(() => groupByExam(list), [list]);

  async function toggleStar(q: NotebookQuestion) {
    const has = stars.has(q.id);
    setStars((prev) => {
      const next = new Set(prev);
      if (has) next.delete(q.id);
      else next.add(q.id);
      return next;
    });
    try {
      await apiPost("/api/bookmarks", { questionId: q.id, action: has ? "remove" : "add" });
    } catch {
      setStars((prev) => {
        const next = new Set(prev);
        if (has) next.add(q.id);
        else next.delete(q.id);
        return next;
      });
    }
  }

  async function retest(examCode: string, count: number) {
    setBusyExam(examCode);
    setErr(null);
    try {
      const data = await apiPost<{ mock: { id: string } }>("/api/mocks", {
        examCode,
        request: { type: "REVISION", questionCount: Math.min(30, Math.max(5, count)) },
      });
      router.push(`/mocks/${data.mock.id}`);
    } catch {
      setErr("Couldn't build the re-test — try again in a moment.");
      setBusyExam(null);
    }
  }

  const empty =
    tab === "mistakes" ? (
      <div className="mt-8 rounded-xl border border-ink-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-ink-800">No mistakes collected yet 🎯</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">
          Attempt any mock and every question you get wrong lands here automatically, ready to
          re-test.
        </p>
      </div>
    ) : (
      <div className="mt-8 rounded-xl border border-ink-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-ink-800">Nothing starred yet ⭐</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-ink-600">
          On any mock&apos;s review screen, tap ☆ on a question worth revisiting and it&apos;s
          saved here.
        </p>
      </div>
    );

  return (
    <div className="mt-6">
      <div className="flex gap-2" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "mistakes"}
          onClick={() => setTab("mistakes")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            tab === "mistakes"
              ? "bg-saffron-500 text-white"
              : "border border-ink-300 bg-white text-ink-700 hover:border-saffron-400"
          }`}
        >
          My mistakes ({mistakes.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "starred"}
          onClick={() => setTab("starred")}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
            tab === "starred"
              ? "bg-saffron-500 text-white"
              : "border border-ink-300 bg-white text-ink-700 hover:border-saffron-400"
          }`}
        >
          Starred ({starredLive.length})
        </button>
      </div>

      {err && <p className="mt-3 text-sm text-rose-700">{err}</p>}
      {groups.length === 0 && empty}

      {groups.map((g) => (
        <div key={g.examCode} className="mt-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-ink-900">
              {g.examShort} <span className="font-normal text-ink-500">· {g.qs.length} questions</span>
            </h2>
            {tab === "mistakes" && g.qs.length >= 5 && (
              <button
                type="button"
                onClick={() => retest(g.examCode, g.qs.length)}
                disabled={busyExam !== null}
                className="rounded-lg bg-saffron-500 px-4 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 disabled:cursor-wait disabled:opacity-70"
              >
                {busyExam === g.examCode ? "Building…" : `Re-test these (${Math.min(30, g.qs.length)}) →`}
              </button>
            )}
          </div>

          <ul className="mt-3 space-y-2">
            {g.qs.map((q) => {
              const open = openId === q.id;
              return (
                <li key={q.id} className="rounded-lg border border-ink-200 bg-white">
                  <div className="flex items-start gap-2 p-3">
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : q.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <p className={`text-sm text-ink-800 ${open ? "" : "line-clamp-2"}`}>{q.body}</p>
                      <p className="mt-1 text-[11px] text-ink-500">
                        {q.topicName} · tap to {open ? "hide" : "see"} answer
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleStar(q)}
                      aria-label={stars.has(q.id) ? "Remove star" : "Star for revision"}
                      className="shrink-0 text-lg leading-none"
                      title={stars.has(q.id) ? "Remove star" : "Star for revision"}
                    >
                      {stars.has(q.id) ? "⭐" : "☆"}
                    </button>
                  </div>
                  {open && (
                    <div className="border-t border-ink-100 p-3">
                      <ul className="space-y-1.5">
                        {q.options.map((o) => (
                          <li
                            key={o.key}
                            className={`rounded-md px-3 py-1.5 text-sm ${
                              o.key === q.answerKey
                                ? "bg-emerald-50 font-semibold text-emerald-900"
                                : "text-ink-700"
                            }`}
                          >
                            {o.key}. {o.text}
                            {o.key === q.answerKey && " ✓"}
                          </li>
                        ))}
                      </ul>
                      {q.solution && (
                        <p className="mt-2 text-sm leading-relaxed text-ink-700">{q.solution}</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
