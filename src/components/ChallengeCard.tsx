"use client";

// Challenge a friend (14 Sep 2026) — the card on a result screen that turns
// "I scored X" into a link to the SAME questions with that score to beat.
// On the anonymous / topic quiz result (AnonQuizPlayer), on a friend's own
// challenge result (the chain), and under the mock results share card.
//
// One tap makes the link (POST /api/challenge — the score is graded on the
// server), then WhatsApp / copy / the phone's share sheet, and optionally a
// phone notification when a friend plays. The creator key comes back once
// and stays in this browser (src/lib/challenge-local.ts) so /c/{token} can
// show its scores. Share taps beacon CTA_CLICKED {cta: 'share', surface:
// 'challenge'}, so the share-loop readout on /admin/loops counts them.
//
// Every string arrives as `labels` from the server page (src/lib/challenge-
// copy.ts), and the page language is stored on the challenge, so a friend
// opening the link lands in the same language.

import { useEffect, useState } from "react";
import Link from "next/link";
import { fillTemplate } from "@/lib/i18n";
import { challengeCompareText, challengeShareMessage, type ChallengeLabels } from "@/lib/challenge-copy";
import { rememberMadeChallenge } from "@/lib/challenge-local";
import { pushSupported, subscribeThisDevice } from "@/lib/push-client";
import { shareUrl, type ShareChannel } from "@/lib/share-url";

// First-party analytics beacon (same shape as ShareScoreButton).
function beacon(props: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({ kind: "CTA_CLICKED", path: typeof location !== "undefined" ? location.pathname : "/", props })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}

export type ChallengeFrom =
  | { source: "quiz" | "topic"; questionIds: string[]; choices: (string | null)[] }
  | { source: "challenge"; parentToken: string; choices: (string | null)[] }
  | { source: "mock"; attemptId: string };

interface Made {
  token: string;
  creatorKey: string;
  creatorCorrect: number;
  questionCount: number;
  examShort: string;
  fromMock: boolean;
}

export function ChallengeCard({
  from,
  examCode,
  examShort,
  surface,
  heading,
  note,
  labels,
  locale,
}: {
  from: ChallengeFrom;
  examCode: string;
  examShort: string;
  /** Where the card sits, for analytics: "anon-quiz", "topic-quiz", "challenge", "results". */
  surface: string;
  heading: string;
  note?: string;
  labels: ChallengeLabels;
  /** Page language — stored on the challenge so the friend's page matches. */
  locale: string;
}) {
  const L = labels;
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [made, setMade] = useState<Made | null>(null);

  async function create() {
    setBusy(true);
    setErr(null);
    const body =
      from.source === "mock"
        ? { source: "mock", attemptId: from.attemptId, name, locale }
        : from.source === "challenge"
          ? { source: "challenge", parentToken: from.parentToken, choices: from.choices, name, locale }
          : { source: from.source, examCode, questionIds: from.questionIds, choices: from.choices, name, locale };
    try {
      const res = await fetch("/api/challenge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || typeof j?.token !== "string" || typeof j?.creatorKey !== "string") {
        setErr(L["challenge.card.error"]);
        return;
      }
      rememberMadeChallenge(j.token, j.creatorKey);
      setMade({
        token: j.token,
        creatorKey: j.creatorKey,
        creatorCorrect: Number(j.creatorCorrect),
        questionCount: Number(j.questionCount),
        examShort: typeof j.examShort === "string" ? j.examShort : examShort,
        fromMock: j.fromMock === true,
      });
      beacon({ cta: "challenge-create", surface, source: from.source, exam: examCode, lang: locale });
    } catch {
      setErr(L["challenge.card.errorNet"]);
    } finally {
      setBusy(false);
    }
  }

  const inputId = `challenge-name-${surface}`;
  return (
    <div className="mt-4 rounded-xl border-2 border-saffron-300 bg-saffron-50/60 p-4 sm:p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">{L["challenge.kicker"]}</p>
      {made ? (
        <ChallengeShare
          token={made.token}
          creatorKey={made.creatorKey}
          examCode={examCode}
          examShort={made.examShort}
          correct={made.creatorCorrect}
          total={made.questionCount}
          fromMock={made.fromMock}
          title={fillTemplate(L["challenge.share.ready"], { correct: made.creatorCorrect, total: made.questionCount })}
          labels={L}
        />
      ) : (
        <>
          <p className="mt-1 text-base font-bold text-ink-900">{heading}</p>
          {note && <p className="mt-1 text-xs text-ink-600">{note}</p>}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label htmlFor={inputId} className="sr-only">
              {L["challenge.card.name"]}
            </label>
            <input
              id={inputId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={24}
              autoComplete="given-name"
              placeholder={L["challenge.card.name"]}
              className="min-w-0 flex-1 rounded-lg border border-ink-300 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-saffron-400 focus:outline-none focus:ring-2 focus:ring-saffron-200"
            />
            <button
              type="button"
              onClick={create}
              disabled={busy}
              className="inline-flex items-center justify-center rounded-lg bg-saffron-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-saffron-600 focus:outline-none focus:ring-2 focus:ring-saffron-300 disabled:opacity-60"
            >
              {busy ? L["challenge.card.making"] : L["challenge.card.make"]}
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink-500">{name.trim() ? L["challenge.card.fineName"] : L["challenge.card.fine"]}</p>
          {err && <p className="mt-2 text-xs text-rose-700">{err}</p>}
        </>
      )}
    </div>
  );
}

/** Share buttons for a challenge that exists: WhatsApp, copy, the phone's
 *  share sheet, and the phone-notification toggle. */
export function ChallengeShare({
  token,
  creatorKey,
  examCode,
  examShort,
  correct,
  total,
  fromMock,
  title,
  labels,
  showScoresLink = true,
}: {
  token: string;
  creatorKey: string | null;
  examCode: string;
  examShort: string;
  correct: number;
  total: number;
  fromMock: boolean;
  title: string;
  labels: ChallengeLabels;
  showScoresLink?: boolean;
}) {
  const L = labels;
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
  }, []);

  const textFor = (channel: ShareChannel) =>
    challengeShareMessage(L, {
      correct,
      total,
      exam: examShort,
      fromMock,
      url: shareUrl(`/c/${token}`, { surface: "challenge", channel, exam: examCode }),
    });
  const track = (via: ShareChannel) => beacon({ cta: "share", surface: "challenge", via, exam: examCode });

  async function copy() {
    try {
      await navigator.clipboard.writeText(textFor("copy"));
      setCopied(true);
      track("copy");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* old browsers without the clipboard API */
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: fillTemplate(L["challenge.share.title"], { exam: examShort }), text: textFor("native") });
      track("native");
    } catch {
      /* cancelled */
    }
  }

  return (
    <>
      <p className="mt-1 text-base font-bold text-ink-900">{title}</p>
      <p className="mt-1 text-xs text-ink-600">{fillTemplate(L["challenge.share.desc"], { total })}</p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(textFor("whatsapp"))}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("whatsapp")}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
          </svg>
          {L["challenge.share.whatsapp"]}
        </a>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center rounded-lg border border-ink-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-50 focus:outline-none focus:ring-2 focus:ring-saffron-300"
        >
          {copied ? L["challenge.share.copied"] : L["challenge.share.copy"]}
        </button>
        {canShare && (
          <button
            type="button"
            onClick={nativeShare}
            className="inline-flex items-center justify-center rounded-lg border border-ink-300 bg-white px-4 py-2.5 text-sm font-medium text-ink-800 transition-colors hover:bg-ink-50"
          >
            {L["challenge.share.more"]}
          </button>
        )}
      </div>
      <ChallengeWatchButton token={token} creatorKey={creatorKey} labels={L} />
      {showScoresLink && (
        <p className="mt-3 text-xs">
          <Link href={`/c/${token}`} className="font-semibold text-saffron-700 hover:underline">
            {L["challenge.share.seeScores"]}
          </Link>
        </p>
      )}
    </>
  );
}

/** "Tell me on this phone when a friend plays" — hidden where web push isn't available. */
export function ChallengeWatchButton({
  token,
  creatorKey,
  labels,
}: {
  token: string;
  creatorKey: string | null;
  labels: ChallengeLabels;
}) {
  const L = labels;
  const [supported, setSupported] = useState(false);
  const [state, setState] = useState<"idle" | "busy" | "on" | "denied" | "error">("idle");
  useEffect(() => {
    setSupported(pushSupported());
  }, []);

  async function turnOn() {
    setState("busy");
    const sub = await subscribeThisDevice();
    if (!sub.ok) {
      setState(sub.reason === "denied" ? "denied" : sub.reason === "dismissed" ? "idle" : "error");
      return;
    }
    try {
      const res = await fetch(`/api/challenge/${token}/watch`, {
        method: "POST",
        headers: { "content-type": "application/json", ...(creatorKey ? { "x-challenge-key": creatorKey } : {}) },
        body: JSON.stringify({ subscription: sub.subscription }),
      });
      if (!res.ok) {
        setState("error");
        return;
      }
      setState("on");
      beacon({ cta: "challenge-watch" });
    } catch {
      setState("error");
    }
  }

  if (!supported) return null;
  if (state === "on") {
    return <p className="mt-3 text-xs font-medium text-emerald-700">{L["challenge.watch.on"]}</p>;
  }
  if (state === "denied") {
    return <p className="mt-3 text-xs text-ink-600">{L["challenge.watch.denied"]}</p>;
  }
  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={turnOn}
        disabled={state === "busy"}
        className="inline-flex items-center gap-1.5 rounded-lg border border-ink-300 bg-white px-3 py-2 text-xs font-semibold text-ink-800 transition-colors hover:bg-ink-50 disabled:opacity-60"
      >
        <span aria-hidden>📱</span>
        {state === "busy" ? L["challenge.watch.busy"] : L["challenge.watch.button"]}
      </button>
      {state === "error" && <p className="mt-1 text-xs text-rose-700">{L["challenge.watch.error"]}</p>}
    </div>
  );
}

/** Both scores side by side, with one plain line under them. */
export function ChallengeScores({
  mine,
  theirs,
  total,
  name,
  labels,
}: {
  mine: number;
  theirs: number;
  total: number;
  name: string | null;
  labels: ChallengeLabels;
}) {
  const L = labels;
  return (
    <div className="rounded-xl border border-saffron-200 bg-saffron-50/70 p-4">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">{L["challenge.you"]}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-ink-900">
            {mine}
            <span className="text-lg text-ink-400">/{total}</span>
          </p>
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold uppercase tracking-wider text-ink-500">{name ?? L["challenge.yourFriend"]}</p>
          <p className="mt-1 text-3xl font-extrabold tabular-nums text-ink-900">
            {theirs}
            <span className="text-lg text-ink-400">/{total}</span>
          </p>
        </div>
      </div>
      <p className="mt-2 text-center text-sm text-ink-700">{challengeCompareText(L, { mine, theirs, total, name })}</p>
    </div>
  );
}
