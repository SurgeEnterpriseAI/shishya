"use client";

// "Pick up where you left off" (30 Sep 2026) — the card. Rules, copy and why:
// src/lib/pickup.ts. It renders a PickupView built on the server (home "For
// you", dashboard) or by GET /api/me/pickup (the hub's member strip), so it
// holds no words of its own and reads nothing. Each tap sends one
// CTA_CLICKED beacon { cta: "pickup-click", surface, action } so the card's
// use can be read by surface; nothing else.
// Tests: tests/unit/pickup.test.ts (view + source checks).

import Link from "next/link";
import { ctaBeacon } from "@/lib/cta-beacon";
import type { PickupView } from "@/lib/pickup";

export type PickupSurface = "home" | "dashboard" | "hub";

export function PickupCard({
  view,
  surface,
  className = "",
}: {
  view: PickupView;
  surface: PickupSurface;
  className?: string;
}) {
  const a = view.answered ?? null;
  const q = view.question;
  const m = view.mock;
  if (!a && !q && !m) return null;
  const tap = (action: string) => () => ctaBeacon("pickup-click", { surface, action });
  const compact = surface === "hub";
  return (
    <section
      aria-label={view.title}
      data-pickup-card={surface}
      className={`rounded-xl border border-saffron-300 bg-saffron-50/60 ${compact ? "px-4 py-3" : "p-4"} ${className}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-saffron-800">{view.title}</p>
      {/* 1 Oct 2026: a question an outage left unanswered, answered later — first (src/lib/pickup.ts). */}
      {a && (
        <div className="mt-2 min-w-0 rounded-lg border border-emerald-300 bg-white px-3 py-2">
          <p className="text-xs font-semibold text-emerald-800">
            {a.label} · <span className="font-normal text-ink-500">{a.meta}</span>
          </p>
          {a.text && <p className="mt-0.5 line-clamp-2 text-sm font-medium text-ink-900">“{a.text}”</p>}
          <p className="mt-0.5 text-xs text-ink-600">{a.note}</p>
          <Link
            href={a.href}
            prefetch={false}
            rel="nofollow"
            onClick={tap("answered")}
            className="mt-2 inline-block rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
          >
            {a.cta}
          </Link>
        </div>
      )}
      <div className={`mt-2 grid gap-3 ${q && m ? "md:grid-cols-2" : ""}`}>
        {q && (
          <div className="min-w-0">
            <p className={`text-xs ${q.answered ? "text-ink-600" : "font-semibold text-rose-700"}`}>
              {q.label} · <span className="font-normal text-ink-500">{q.meta}</span>
            </p>
            <p className="mt-0.5 line-clamp-2 text-sm font-medium text-ink-900">“{q.text}”</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Link
                href={q.primary.href}
                prefetch={false}
                rel="nofollow"
                onClick={tap(q.answered ? "continue" : "answer")}
                className="rounded-md bg-saffron-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-saffron-600"
              >
                {q.primary.label}
              </Link>
              {q.followUp && (
                <Link
                  href={q.followUp.href}
                  prefetch={false}
                  rel="nofollow"
                  onClick={tap("follow-up")}
                  className="rounded-full border border-saffron-300 bg-white px-3 py-1 text-xs font-medium text-saffron-800 hover:bg-saffron-50"
                >
                  {q.followUp.label}
                </Link>
              )}
            </div>
          </div>
        )}
        {m && (
          <div className="min-w-0">
            <p className="text-xs text-ink-600">
              {m.label} · <span className="text-ink-500">{m.meta}</span>
            </p>
            <Link
              href={m.href}
              prefetch={false}
              rel="nofollow"
              onClick={tap("result")}
              className="mt-0.5 flex items-baseline justify-between gap-2 text-sm hover:underline"
            >
              <span className="truncate font-medium text-ink-900">{m.title}</span>
              <span className="shrink-0 font-bold text-ink-900">{m.score}</span>
            </Link>
            {m.weak.length > 0 && (
              <>
                <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-500">{m.weakLabel}</p>
                <ul className="mt-1 space-y-1">
                  {m.weak.map((w) => (
                    <li key={w.key} className="flex flex-wrap items-center justify-between gap-x-2 text-xs">
                      <span className="min-w-0 text-ink-800">
                        {w.name} <span className="text-ink-500">· {w.detail}</span>
                      </span>
                      <Link
                        href={w.href}
                        prefetch={false}
                        rel="nofollow"
                        onClick={tap("weak-topic")}
                        className="shrink-0 font-semibold text-saffron-700 hover:underline"
                      >
                        {w.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
