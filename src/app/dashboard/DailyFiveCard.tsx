"use client";

// Retention build (Jul 20 checkpoint verdict: D1-7 return stuck at 14%,
// one-and-done 85% — conversion levers didn't move it, so the product now
// gives a REASON to come back daily). The Daily 5: one tap → 5 questions
// on your current weakest topic → done in ~3 minutes → streak preserved.
// Users literally asked the tutor to "make me a study plan for today";
// this IS the plan, pre-made, every day.
//
// Language (16 Sep 2026): the dashboard page passes its `locale` when it
// has one; until it does (it is outside this partition) the card reads the
// shishya-lang cookie itself, AFTER mount — the server cannot know it, and
// switching during render would be a hydration mismatch. English is what the
// server renders, so an English student never sees a change. The API's own
// error string is passed through as it arrives; only the fallback line is
// translated.

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fillTemplate } from "@/lib/i18n";
import { clientUiLocale, type CopyLocale } from "@/lib/ui-locale-copy";
import { dailyFiveCopy } from "@/lib/dashboard-cards-copy";

interface Props {
  examCode: string;
  examShort: string;
  topicCode?: string | null;
  topicName?: string | null;
  /** The picker skipped a weaker topic whose unseen questions ran out. */
  rotated?: boolean;
  streakCurrent: number;
  activeToday: boolean;
  /** The page's locale when the server already has one (16 Sep 2026);
   *  without it the card reads the shishya-lang cookie after mount. */
  locale?: string;
}

export function DailyFiveCard({
  examCode,
  examShort,
  topicCode,
  topicName,
  rotated = false,
  streakCurrent,
  activeToday,
  locale,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [cookieLocale, setCookieLocale] = useState<CopyLocale>("en");
  useEffect(() => {
    if (locale == null) setCookieLocale(clientUiLocale());
  }, [locale]);
  const C = dailyFiveCopy(locale ?? cookieLocale);

  async function start() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          examCode,
          request: topicCode
            ? { type: "TOPIC", topicCode, questionCount: 5 }
            // No weakest topic yet → rule-based baseline set (same as /today);
            // ADAPTIVE would have spent a model call per new student.
            : { type: "DIAGNOSTIC", questionCount: 5 },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.mock?.id) {
        setErr(data?.error ?? C.errBuild);
        setBusy(false);
        return;
      }
      router.push(`/mocks/${data.mock.id}`);
    } catch {
      setErr(C.errNetwork);
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-saffron-50 to-amber-50 p-5 shadow-sm">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
            {C.eyebrow}
          </p>
          <p className="mt-1 text-base font-bold text-ink-900">
            {topicName
              ? fillTemplate(C.titleTopic, { topic: topicName, exam: examShort })
              : fillTemplate(C.titleExam, { exam: examShort })}
          </p>
          <p className="mt-1 text-xs text-ink-600">
            {rotated ? C.subRotated : C.subNormal}{" "}
            {streakCurrent > 0
              ? activeToday
                ? fillTemplate(C.streakActive, { n: streakCurrent })
                : fillTemplate(C.streakKeep, { n: streakCurrent })
              : C.streakNone}
          </p>
          {err && <p className="mt-1 text-xs text-rose-700">{err}</p>}
        </div>
        <button
          type="button"
          onClick={start}
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-500 px-6 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:cursor-wait disabled:opacity-70"
        >
          {busy ? C.building : C.start}
        </button>
      </div>
    </section>
  );
}
