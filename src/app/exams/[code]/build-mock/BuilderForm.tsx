"use client";

// Client half of the custom mock builder: topic checkboxes grouped by
// subject, size + difficulty, live availability count, one POST →
// straight into the player. Anonymous visitors see the whole form
// (SEO + appetite) but the submit routes through sign-in.

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface TopicRow {
  id: string;
  code: string;
  name: string;
  n: number;
}

export function BuilderForm({
  examCode,
  subjects,
  preselected,
  signedIn,
}: {
  examCode: string;
  subjects: { name: string; topics: TopicRow[] }[];
  preselected: string[];
  signedIn: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [sel, setSel] = useState<Set<string>>(new Set(preselected));
  const [count, setCount] = useState<10 | 25 | 50>(25);
  const [difficulty, setDifficulty] = useState<"MIXED" | "EASY" | "HARD">("MIXED");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const all = useMemo(() => subjects.flatMap((s) => s.topics), [subjects]);
  const available = useMemo(
    () => all.filter((t) => sel.has(t.id)).reduce((a, t) => a + t.n, 0),
    [all, sel],
  );

  const toggle = (id: string) => {
    setErr(null);
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 10) next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (sel.size === 0) {
      setErr("Pick at least one topic.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/mocks/custom", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, topicIds: [...sel], count, difficulty }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) throw new Error(data?.error ?? "Couldn't build the mock — try again.");
      router.push(`/mocks/${data.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't build the mock — try again.");
      setBusy(false);
    }
  };

  return (
    <div className="mt-6">
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          {subjects.map((s) => (
            <section key={s.name} className="rounded-xl border border-ink-200 bg-white p-4">
              <h2 className="text-sm font-bold text-ink-900">{s.name}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {s.topics.map((t) => {
                  const on = sel.has(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggle(t.id)}
                      aria-pressed={on}
                      className={
                        on
                          ? "rounded-full border border-saffron-500 bg-saffron-500 px-2.5 py-1 text-xs font-semibold text-white"
                          : "rounded-full border border-ink-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-saffron-400"
                      }
                    >
                      {t.name} <span className={on ? "opacity-80" : "text-ink-400"}>· {t.n}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-500">Questions</p>
            <div className="mt-2 flex gap-2">
              {([10, 25, 50] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCount(c)}
                  aria-pressed={count === c}
                  className={
                    count === c
                      ? "flex-1 rounded-md bg-ink-900 px-3 py-1.5 text-sm font-bold text-white"
                      : "flex-1 rounded-md border border-ink-300 px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                  }
                >
                  {c}
                </button>
              ))}
            </div>
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">Difficulty</p>
            <div className="mt-2 flex gap-2">
              {(["MIXED", "EASY", "HARD"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDifficulty(d)}
                  aria-pressed={difficulty === d}
                  className={
                    difficulty === d
                      ? "flex-1 rounded-md bg-ink-900 px-2 py-1.5 text-xs font-bold text-white"
                      : "flex-1 rounded-md border border-ink-300 px-2 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
                  }
                >
                  {d === "MIXED" ? "Mixed" : d === "EASY" ? "Easy" : "Hard"}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm text-ink-700">
              <span className="font-bold text-ink-900">{sel.size}</span> topic{sel.size === 1 ? "" : "s"} ·{" "}
              <span className="font-bold text-ink-900">{available}</span> questions available
            </p>
            {available > 0 && available < count && (
              <p className="mt-1 text-xs text-amber-700">
                Fewer than {count} in this selection — the mock will use what&apos;s there.
              </p>
            )}

            {signedIn ? (
              <button
                type="button"
                onClick={submit}
                disabled={busy || sel.size === 0}
                className="btn-primary mt-4 w-full !py-2.5 text-sm disabled:opacity-50"
              >
                {busy ? "Building…" : "Build & start →"}
              </button>
            ) : (
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(pathname ?? `/exams/${examCode}/build-mock`)}`}
                className="btn-primary mt-4 block w-full text-center !py-2.5 text-sm"
              >
                Sign in free & build →
              </Link>
            )}
            {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
            <p className="mt-3 text-xs text-ink-500">
              Timed to the real exam&apos;s pace · full solutions after · readable in हिंदी + 12 languages inside
              the test.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
