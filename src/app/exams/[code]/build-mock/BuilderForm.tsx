"use client";

// Client half of the custom mock builder: topic checkboxes grouped by
// subject, size + difficulty, live availability count, one POST →
// straight into the player. Anonymous visitors see the whole form
// (SEO + appetite) but the submit routes through sign-in.
//
// Seen-exclusion (11 Sep 2026): signed-in students see, per selection,
// how many of the validated questions they have already met in the last
// `windowDays` days (real per-topic counts from the page), and — when a
// set cannot avoid repeats — the API's exact repeat count before they
// start. No "fresh set weekly" promise anywhere: no such cron exists.
// `seenKnown` is false when the page's seen query failed: every seen line
// is then hidden — "0 of M" is only shown when it was actually measured.
//
// Language (13 Sep 2026): every string arrives as `labels` from the server
// page (build.* keys in src/lib/i18n.ts and src/lib/builder-fill-copy.ts,
// en + hi + te) — templates keep {seen} {total} {days} … and are filled
// here with the real numbers. Server error messages from /api/mocks/custom
// are shown as sent.
//
// PYQ mode (15 Sep 2026): `pyqOnly` — the page counted PYQ-pattern
// questions only, so the POST asks the API for that same pool.
//
// Honest size (25 Sep 2026): 232 of 370 builder mocks came back short. The
// availability line now counts what the chosen difficulty really draws on
// (EASY / HARD fall back to MEDIUM, as the API does — src/lib/mock-fill.ts),
// sizes the selection cannot fill are greyed out, "All N" is offered when
// it holds fewer than 50, and the POST asks for the size the set will
// really have. If the API still builds fewer (the bank changed since the
// page loaded), the student is told before starting. "Seen" now counts
// ANSWERED questions (src/lib/answered-questions.ts). The Easy / Hard note
// gives only bounds that always hold ("at least N of these 25 will be
// medium", levelMix): the API picks every unanswered question, whatever the
// level, before an answered one, so "hard first" was not true.

import { Fragment, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { OTHER_INDIAN_LANGUAGE_COUNT } from "@/lib/languages";
import { fillTemplate } from "@/lib/i18n";
import {
  BUILDER_SIZES,
  MAX_BUILDER_QUESTIONS,
  MIN_MOCK_QUESTIONS,
  availableFor,
  effectiveSize,
  levelMix,
  levelNote,
  sizeChoices,
  sumCounts,
  type DiffCounts,
  type LevelNote,
  type SizeChoice,
  type SizePick,
} from "@/lib/mock-fill";

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
  /** {count} {requested} */
  builtShort: string;
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
  /** {n} */
  sizeAll: string;
  /** {n} */
  sizeTooBig: string;
  /** {n} {count} */
  onlyAvailable: string;
  /** {n} {min} {mixed} */
  tooFew: string;
  /** {strict} {medium} {size} */
  fallbackEasy: string;
  /** {strict} {medium} {size} */
  fallbackHard: string;
  /** {size} */
  fallbackNoneEasy: string;
  /** {size} */
  fallbackNoneHard: string;
  /** {answered} {total} {medium} {size} */
  fallbackAnsweredEasy: string;
  /** {answered} {total} {medium} {size} */
  fallbackAnsweredHard: string;
  /** {answered} {total} {size} */
  fallbackAnsweredNoneEasy: string;
  /** {answered} {total} {size} */
  fallbackAnsweredNoneHard: string;
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
  /** Of those, answered by this student in the window (0 when anonymous). */
  seen: number;
  /** `n` split by difficulty. */
  diff: DiffCounts;
  /** `seen` split by difficulty. */
  seenDiff: DiffCounts;
}

interface Built {
  id: string;
  count: number;
  requested: number;
  bank: { size: number; seen: number; repeats: number; windowDays: number } | null;
}

/** The Easy / Hard note's template for each levelNote(). */
const LEVEL_NOTE_LABEL: Record<"EASY" | "HARD", Record<LevelNote, keyof BuilderLabels>> = {
  EASY: {
    short: "fallbackEasy",
    none: "fallbackNoneEasy",
    answered: "fallbackAnsweredEasy",
    answeredNone: "fallbackAnsweredNoneEasy",
  },
  HARD: {
    short: "fallbackHard",
    none: "fallbackNoneHard",
    answered: "fallbackAnsweredHard",
    answeredNone: "fallbackAnsweredNoneHard",
  },
};

/** Size chips before any topic is picked: every size, none greyed out. */
const OPEN_CHOICES: SizeChoice[] = BUILDER_SIZES.map((s) => ({ pick: s, size: s, fits: true }));

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
  // The size the student chose; the set holds effectiveSize(pick, available).
  const [pick, setPick] = useState<SizePick>(25);
  const [difficulty, setDifficulty] = useState<"MIXED" | "EASY" | "HARD">("MIXED");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  // Set when the API built a mock that repeats questions or holds fewer
  // than asked: we show the exact numbers and a Start link instead of
  // auto-redirecting.
  const [built, setBuilt] = useState<Built | null>(null);

  const all = useMemo(() => subjects.flatMap((s) => s.topics), [subjects]);
  const selected = useMemo(() => all.filter((t) => sel.has(t.id)), [all, sel]);
  // What the chosen difficulty really draws on (EASY/HARD + MEDIUM fallback).
  const avail = useMemo(() => availableFor(sumCounts(selected.map((t) => t.diff)), difficulty), [selected, difficulty]);
  const available = avail.total;
  const seenTotal = useMemo(
    () => Math.min(available, availableFor(sumCounts(selected.map((t) => t.seenDiff)), difficulty).total),
    [selected, difficulty, available],
  );
  const unseen = Math.max(0, available - seenTotal);
  const hasSel = sel.size > 0;
  const choices = hasSel ? sizeChoices(available) : OPEN_CHOICES;
  // The number of questions the set will really hold.
  const setSize = hasSel ? effectiveSize(pick, available) : pick === "all" ? MAX_BUILDER_QUESTIONS : pick;
  const tooFew = hasSel && available < MIN_MOCK_QUESTIONS;
  const capped = hasSel && !tooFew && pick !== "all" && pick > available;
  // Repeats it cannot avoid ≈ setSize − unseen (the API returns the exact
  // number after building).
  const estRepeats = Math.max(0, setSize - unseen);
  // Easy / Hard note (25 Sep 2026): bounds that always hold ("at least N
  // medium"), not "hard first" — the API takes unanswered MEDIUM questions
  // before answered chosen-level ones, so the student's answered counts are
  // used when measured (src/lib/mock-fill.ts levelMix).
  const mix = useMemo(
    () =>
      hasSel
        ? levelMix(
            sumCounts(selected.map((t) => t.diff)),
            showSeen ? sumCounts(selected.map((t) => t.seenDiff)) : null,
            difficulty,
            setSize,
          )
        : null,
    [hasSel, selected, showSeen, difficulty, setSize],
  );
  const diffLabel = (d: "MIXED" | "EASY" | "HARD") =>
    d === "MIXED" ? labels.diffMixed : d === "EASY" ? labels.diffEasy : labels.diffHard;

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
    if (tooFew) {
      setErr(fillTemplate(labels.tooFew, { n: available, min: MIN_MOCK_QUESTIONS, mixed: labels.diffMixed }));
      return;
    }
    setBusy(true);
    setErr(null);
    setBuilt(null);
    try {
      const res = await fetch("/api/mocks/custom", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, topicIds: [...sel], count: setSize, difficulty, ...(pyqOnly ? { pyqOnly: true } : {}) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.id) throw new Error(data?.error ?? labels.failed);
      const count = Number(data.count ?? 0);
      const requested = Number(data.requested ?? setSize);
      // bank is null when the API's seen query failed (no numbers).
      const bank = (data.bank ?? null) as Built["bank"];
      const repeats = bank && typeof bank.repeats === "number" && bank.repeats > 0;
      if (repeats || count < requested) {
        // Honest interstitial: the real size / repeat count before
        // starting. Neither → straight into the player as before.
        setBuilt({ id: data.id, count, requested, bank });
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
                  // The topic's count at the chosen difficulty (= n for Mixed).
                  const tn = availableFor(t.diff, difficulty).total;
                  const tSeen = Math.min(tn, availableFor(t.seenDiff, difficulty).total);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => toggle(t.id)}
                      aria-pressed={on}
                      title={
                        showSeen && tSeen > 0
                          ? fillTemplate(labels.topicSeenTitle, { seen: tSeen, n: tn, days: windowDays })
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
                        {showSeen && tSeen > 0
                          ? fillTemplate(labels.topicNewOf, { new: tn - tSeen, n: tn })
                          : tn}
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
              {choices.map((c) => {
                const on = c.fits && c.size === setSize;
                return (
                  <button
                    key={String(c.pick)}
                    type="button"
                    disabled={!c.fits}
                    title={c.fits ? undefined : fillTemplate(labels.sizeTooBig, { n: available })}
                    onClick={() => {
                      setPick(c.pick);
                      setBuilt(null);
                    }}
                    aria-pressed={on}
                    className={
                      on
                        ? "flex-1 rounded-md bg-ink-900 px-2 py-1.5 text-sm font-bold text-white"
                        : c.fits
                          ? "flex-1 rounded-md border border-ink-300 px-2 py-1.5 text-sm font-medium text-ink-700 hover:bg-ink-50"
                          : "flex-1 cursor-not-allowed rounded-md border border-dashed border-ink-200 px-2 py-1.5 text-sm font-medium text-ink-300 line-through"
                    }
                  >
                    {c.pick === "all" ? fillTemplate(labels.sizeAll, { n: c.size }) : c.size}
                  </button>
                );
              })}
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
                  {diffLabel(d)}
                </button>
              ))}
            </div>

            <p className="mt-4 text-sm text-ink-700">
              {fillBold(sel.size === 1 ? labels.availableOne : labels.availableMany, {
                topics: sel.size,
                n: available,
              })}
            </p>
            {/* EASY / HARD also draw MEDIUM questions — said only when this
                set will certainly hold some, with the fewest it will hold. */}
            {mix && difficulty !== "MIXED" && (
              <p className="mt-1 text-xs text-ink-600">
                {fillTemplate(labels[LEVEL_NOTE_LABEL[difficulty][levelNote(mix)]], {
                  strict: mix.maxStrict,
                  medium: mix.minMedium,
                  size: mix.size,
                  answered: mix.strictAnswered,
                  total: mix.strictTotal,
                })}
              </p>
            )}
            {tooFew && (
              <p className="mt-1 text-xs text-amber-700">
                {fillTemplate(labels.tooFew, { n: available, min: MIN_MOCK_QUESTIONS, mixed: labels.diffMixed })}
              </p>
            )}
            {capped && (
              <p className="mt-1 text-xs text-amber-700">
                {fillTemplate(labels.onlyAvailable, { n: available, count: pick })}
              </p>
            )}

            {/* Honest answered / unanswered state — real per-topic counts,
                signed-in AND measured only (showSeen): a failed query shows nothing. */}
            {showSeen && sel.size > 0 && available > 0 && (
              <p className="mt-1 text-xs text-ink-600">
                {fillTemplate(labels.seenLine, { seen: seenTotal, total: available, days: windowDays })}
              </p>
            )}
            {showSeen && !tooFew && available > 0 && unseen > 0 && estRepeats > 0 && (
              <p className="mt-1 text-xs text-amber-700">
                {fillTemplate(labels.seenShort, { unseen, size: setSize, repeats: estRepeats })}
              </p>
            )}
            {showSeen && !tooFew && available > 0 && unseen === 0 && (
              <p className="mt-1 text-xs text-amber-700">
                {fillTemplate(labels.seenExhausted, { total: available, days: windowDays })}{" "}
                <Link href={`/exams/${examCode}`} className="font-medium text-saffron-700 hover:underline">
                  {labels.seenExamPage}
                </Link>
              </p>
            )}

            {built ? (
              <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3">
                {built.count < built.requested && (
                  <p className="text-xs text-ink-800">
                    {fillTemplate(labels.builtShort, { count: built.count, requested: built.requested })}
                  </p>
                )}
                {built.bank && built.bank.repeats > 0 && (
                  <p className={`text-xs text-ink-800 ${built.count < built.requested ? "mt-1" : ""}`}>
                    {fillTemplate(labels.builtRepeats, {
                      count: built.count,
                      repeats: built.bank.repeats,
                      days: built.bank.windowDays,
                      seen: built.bank.seen,
                      size: built.bank.size,
                    })}
                  </p>
                )}
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
                disabled={busy || sel.size === 0 || tooFew}
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
