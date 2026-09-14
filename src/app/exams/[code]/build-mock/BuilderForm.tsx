"use client";

// Client half of the custom mock builder: topic checkboxes grouped by
// subject, size + difficulty, live availability count, one POST →
// straight into the player. Anonymous visitors see the whole form
// (SEO + appetite) but the submit routes through sign-in.
//
// Seen-exclusion (11 Sep 2026): signed-in students see, per selection,
// how many of the validated questions they have already had on screen
// in the last `windowDays` days (real per-topic counts from the page),
// and — when a set cannot avoid repeats — the API's exact repeat count
// before they start. No "fresh set weekly" promise anywhere: no such
// cron exists. `seenKnown` is false when the page's seen query failed:
// every seen line is then hidden — "seen 0 of M" is only shown when it
// was actually measured.
//
// Language (13 Sep 2026): every string arrives as `labels` from the server
// page (build.* keys in src/lib/i18n.ts, en + hi + te) — templates keep
// {seen} {total} {days} … and are filled here with the real numbers. Server
// error messages from /api/mocks/custom are shown as sent.
//
// PYQ mode (15 Sep 2026): `pyqOnly` — the page counted PYQ-pattern
// questions only, so the POST asks the API for that same pool.

import { Fragment, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { OTHER_INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { fillTemplate } from "@/lib/i18n";

export interface BuilderLabels {
  /** {seen} {total} {days} */
  seenLine: string;
  /** {unseen} {size} {repeats} */
  seenShort: string;
  /** {total} {days} */
  seenExhausted: string;
  seenExamPage: string;
  /** {seen} {n} {days} */
  topicSeenTitle: string;
  /** {new} {n} */
  topicNewOf: string;
  /** {count} {repeats} {days} {seen} {size} */
  builtRepeats: string;
  builtStart: string;
  builtChange: string;
  questions: string;
  difficulty: string;
  diffMixed: string;
  diffEasy: string;
  diffHard: string;
  /** {topics} {n} */
  availableOne: string;
  /** {topics} {n} */
  availableMany: string;
  /** {count} */
  fewer: string;
  pickOne: string;
  failed: string;
  building: string;
  start: string;
  signin: string;
  /** {n} = other Indian languages */
  footer: string;
}

/** fillTemplate, but each filled value is rendered bold (the availability
 *  line highlights its two numbers). */
function fillBold(template: string, vars: Record<string, string | number>): ReactNode[] {
  return template.split(/(\{\w+\})/g).map((part, i) => {
    const m = /^\{(\w+)\}$/.exec(part);
    if (m && Object.prototype.hasOwnProperty.call(vars, m[1])) {
      return (
        <span key={i} className="font-bold text-ink-900">
          {vars[m[1]]}
        </span>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

interface TopicRow {
  id: string;
  code: string;
  name: string;
  /** Validated questions in the topic. */
  n: number;
  /** Of those, seen by this student in the window (0 when anonymous). */
  seen: number;
}

interface Built {
  id: string;
  count: number;
  bank: { size: number; seen: number; repeats: number; windowDays: number };
}

export function BuilderForm({
  examCode,
  pyqOnly = false,
  subjects,
  preselected,
  signedIn,
  seenKnown,
  windowDays,
  labels,
}: {
  examCode: string;
  /** Counts and the built set are PYQ-pattern questions only (?pyq=1). */
  pyqOnly?: boolean;
  subjects: { name: string; topics: TopicRow[] }[];
  preselected: string[];
  signedIn: boolean;
  /** False when the per-topic seen query failed (or anonymous): no seen copy at all. */
  seenKnown: boolean;
  windowDays: number;
  labels: BuilderLabels;
}) {
  const router = useRouter();
  const pathname = usePathname();
  // Seen copy needs BOTH a signed-in student and a successful seen query.
  const showSeen = signedIn && seenKnown;
  const [sel, setSel] = useState<Set<string>>(new Set(preselected));
  const [count, setCount] = useState<10 | 25 | 50>(25);
  const [difficulty, setDifficulty] = useState<"MIXED" | "EASY" | "HARD">("MIXED");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Set when the API built a mock that repeats questions: we show the
  // exact numbers and a Start link instead of auto-redirecting.
  const [built, setBuilt] = useState<Built | null>(null);

  const all = useMemo(() => subjects.flatMap((s) => s.topics), [subjects]);
  const selected = useMemo(() => all.filter((t) => sel.has(t.id)), [all, sel]);
  const available = useMemo(() => selected.reduce((a, t) => a + t.n, 0), [selected]);
  const seenTotal = useMemo(() => selected.reduce((a, t) => a + t.seen, 0), [selected]);
  const unseen = Math.max(0, available - seenTotal);
  // The set is min(count, available); repeats it cannot avoid ≈ setSize − unseen
  // (an estimate — the difficulty filter narrows the pool further; the
  // API returns the exact number after building).
  const setSize = Math.min(count, available);
  const estRepeats = Math.max(0, setSize - unseen);

  const toggle = (id: string) => {
    setErr(null);
    setBuilt(null);
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < 10) next.add(id);
      return next;
    });
  };

  const submit = async () => {
    if (sel.size === 0) {
      setErr(labels.pickOne);
      return;
    }
    setBusy(true);
    setErr(null);
    setBuilt(null);
    try {
      const res = await fetch("/api/mocks/custom", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, topicIds: [...sel], count, difficulty, ...(pyqOnly ? { pyqOnly: true } : {}) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) throw new Error(data?.error ?? labels.failed);
      // bank is null when the API's seen query failed (no numbers → no
      // interstitial, straight into the player).
      const bank = data.bank as Built["bank"] | null | undefined;
      if (bank && typeof bank.repeats === "number" && bank.repeats > 0) {
        // Honest interstitial: the student sees the real repeat count
        // before starting. No repeats → straight into the player as before.
        setBuilt({ id: data.id, count: Number(data.count ?? 0), bank });
        setBusy(false);
        return;
      }
      router.push(`/mocks/${data.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : labels.failed);
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
                      title={
                        showSeen && t.seen > 0
                          ? fillTemplate(labels.topicSeenTitle, { seen: t.seen, n: t.n, days: windowDays })
                          : undefined
                      }
                      className={
                        on
                          ? "rounded-full border border-saffron-500 bg-saffron-500 px-2.5 py-1 text-xs font-semibold text-white"
                          : "rounded-full border border-ink-300 bg-white px-2.5 py-1 text-xs font-medium text-ink-700 hover:border-saffron-400"
                      }
                    >
                      {t.name}{" "}
                      <span className={on ? "opacity-80" : "text-ink-400"}>
                        ·{" "}
                        {showSeen && t.seen > 0
                          ? fillTemplate(labels.topicNewOf, { new: t.n - t.seen, n: t.n })
                          : t.n}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        <aside className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-ink-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-500">{labels.questions}</p>
            <div className="mt-2 flex gap-2">
              {([10, 25, 50] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCount(c);
                    setBuilt(null);
                  }}
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
            <p className="mt-4 text-xs font-medium uppercase tracking-wider text-ink-500">{labels.difficulty}</p>
            <div className="mt-2 flex gap-2">
              {(["MIXED", "EASY", "HARD"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => {
                    setDifficulty(d);
                    setBuilt(null);
                  }}
                  aria-pressed={difficulty === d}
                  className={
                    difficulty === d
                      ? "flex-1 rounded-md bg-ink-900 px-2 py-1.5 text-xs font-bold text-white"
                      : "flex-1 rounded-md border border-ink-300 px-2 py-1.5 text-xs font-medium text-ink-700 hover:bg-ink-50"
                  }
                >
                  {d === "MIXED" ? labels.diffMixed : d === "EASY" ? labels.diffEasy : labels.diffHard}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm text-ink-700">
              {fillBold(sel.size === 1 ? labels.availableOne : labels.availableMany, {
                topics: sel.size,
                n: available,
              })}
            </p>
            {available > 0 && available < count && (
              <p className="mt-1 text-xs text-amber-700">{fillTemplate(labels.fewer, { count })}</p>
            )}

            {/* Honest seen / unseen state — real per-topic counts, signed-in
                AND measured only (showSeen): a failed seen query shows nothing. */}
            {showSeen && sel.size > 0 && available > 0 && (
              <p className="mt-1 text-xs text-ink-600">
                {fillTemplate(labels.seenLine, { seen: seenTotal, total: available, days: windowDays })}
              </p>
            )}
            {showSeen && available > 0 && unseen > 0 && estRepeats > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                {fillTemplate(labels.seenShort, { unseen, size: setSize, repeats: estRepeats })}
              </p>
            )}
            {showSeen && available > 0 && unseen === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                {fillTemplate(labels.seenExhausted, { total: available, days: windowDays })}{" "}
                <Link href={`/exams/${examCode}`} className="font-medium text-saffron-700 hover:underline">
                  {labels.seenExamPage}
                </Link>
              </p>
            )}

            {built ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs text-ink-800">
                  {fillTemplate(labels.builtRepeats, {
                    count: built.count,
                    repeats: built.bank.repeats,
                    days: built.bank.windowDays,
                    seen: built.bank.seen,
                    size: built.bank.size,
                  })}
                </p>
                <Link href={`/mocks/${built.id}`} className="btn-primary mt-3 block w-full text-center !py-2.5 text-sm">
                  {labels.builtStart}
                </Link>
                <button
                  type="button"
                  onClick={() => setBuilt(null)}
                  className="mt-2 w-full text-center text-xs text-ink-500 hover:text-ink-800"
                >
                  {labels.builtChange}
                </button>
              </div>
            ) : signedIn ? (
              <button
                type="button"
                onClick={submit}
                disabled={busy || sel.size === 0}
                className="btn-primary mt-4 w-full !py-2.5 text-sm disabled:opacity-50"
              >
                {busy ? labels.building : labels.start}
              </button>
            ) : (
              <Link
                href={`/login?callbackUrl=${encodeURIComponent(`${pathname ?? `/exams/${examCode}/build-mock`}${pyqOnly ? "?pyq=1" : ""}`)}`}
                className="btn-primary mt-4 block w-full text-center !py-2.5 text-sm"
              >
                {labels.signin}
              </Link>
            )}
            {err && <p className="mt-2 text-xs text-red-600">{err}</p>}
            <p className="mt-3 text-xs text-ink-500">
              {fillTemplate(labels.footer, { n: OTHER_INDIAN_LANGUAGE_COUNT })}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
