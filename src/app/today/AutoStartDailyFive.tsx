"use client";

// Builds today's 5 the moment /today mounts and replaces the URL with the
// mock — zero taps for the student. Same POST /api/mocks contract as the
// dashboard's DailyFiveCard and the topic page's ?start=1 auto-start
// (TopicMasteryPanel): the server picks from the validated pool with the
// rule-based TOPIC / DIAGNOSTIC generators — no model call.
//
// If the weakest topic's pool is empty (/api/mocks answers 400), retry once
// as a 5-question DIAGNOSTIC baseline — still rule-based, still today's 5.
// A ref guard (not a cancelled flag) makes the effect fire exactly once,
// including under React strict-mode double effects in dev.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { DailyFiveRequest } from "@/lib/study-day-five";
import {
  TODAY_BUILDING,
  TODAY_BUILDING_SUB,
  TODAY_FAILED,
  TODAY_FAILED_NETWORK,
  TODAY_GO_DASHBOARD,
} from "@/lib/study-day-copy";

export function AutoStartDailyFive({
  examCode,
  examShort,
  topicName,
  request,
  qs,
}: {
  examCode: string;
  examShort: string;
  topicName: string | null;
  request: DailyFiveRequest;
  /** "?utm_source=…" or "" — forwarded onto /mocks/{id} for attribution. */
  qs: string;
}) {
  const router = useRouter();
  const started = useRef(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const post = async (req: DailyFiveRequest) => {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ examCode, request: req }),
      });
      const data = await res.json().catch(() => ({}));
      return { res, data } as { res: Response; data: { mock?: { id?: string }; error?: string } };
    };

    (async () => {
      try {
        let { res, data } = await post(request);
        if (res.status === 400 && request.type === "TOPIC") {
          ({ res, data } = await post({ type: "DIAGNOSTIC", questionCount: 5 }));
        }
        if (!res.ok || !data?.mock?.id) {
          setFailed(data?.error ?? TODAY_FAILED);
          return;
        }
        router.replace(`/mocks/${data.mock.id}${qs}`);
      } catch {
        setFailed(TODAY_FAILED_NETWORK);
      }
    })();
    // examCode/request/qs are fixed for the life of this page render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section
      className="rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50 via-saffron-50 to-amber-50 p-6 text-center shadow-sm"
      aria-live="polite"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">☀️ Today&apos;s 5</p>
      {failed ? (
        <>
          <p className="mt-2 text-base font-bold text-ink-900">{failed}</p>
          <Link href="/dashboard" className="btn-primary mt-4 inline-block !py-2 !px-5 text-sm">
            {TODAY_GO_DASHBOARD}
          </Link>
        </>
      ) : (
        <>
          <p className="mt-2 text-base font-bold text-ink-900">{TODAY_BUILDING}</p>
          <p className="mt-1 text-sm text-ink-600">{TODAY_BUILDING_SUB(examShort, topicName)}</p>
        </>
      )}
    </section>
  );
}
