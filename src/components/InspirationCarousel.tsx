"use client";

// Homepage inspiration carousel — real, validated YouTube success-story
// videos for aspirants (topper interviews, "how I cracked it"). Fills
// the emotional-hook slot above the finder card. A horizontal scroll-
// snap row; each thumbnail opens the video on YouTube. Thumbnails are
// guaranteed to resolve (every id was oEmbed-validated at generation).
//
// Instrumented: fires CTA_CLICKED beacons for a first hover (soft
// engagement) and each video click, so we can measure whether anyone
// actually engages before deciding where the carousel belongs on the
// page. Client component, but still SSRs its markup (SEO intact).

import { useRef } from "react";

export interface InspoVideo {
  youtubeId: string;
  title: string;
  channel: string | null;
  thumbnailUrl: string | null;
  reason: string | null;
  examTag: string | null;
}

function track(cta: string, extra?: Record<string, unknown>) {
  try {
    navigator.sendBeacon?.(
      "/api/analytics",
      new Blob(
        [JSON.stringify({
          kind: "CTA_CLICKED",
          path: typeof location !== "undefined" ? location.pathname : "/",
          props: { cta, surface: "inspiration", ...extra },
        })],
        { type: "application/json" },
      ),
    );
  } catch {
    /* analytics is best-effort */
  }
}

export function InspirationCarousel({ videos }: { videos: InspoVideo[] }) {
  const hovered = useRef(false);
  if (!videos.length) return null;
  return (
    <section
      aria-label="Inspiration — topper success stories"
      onMouseEnter={() => {
        // Fire once per page load — "did anyone even mouse over it?"
        if (hovered.current) return;
        hovered.current = true;
        track("inspiration-hover");
      }}
    >
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-saffron-700">
          🎬 Real toppers, real stories — get inspired
        </p>
        <span className="text-[10px] text-ink-400">Scroll →</span>
      </div>
      <ul className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        {videos.map((v) => (
          <li key={v.youtubeId} className="shrink-0 snap-start">
            <a
              href={`https://www.youtube.com/watch?v=${v.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track("inspiration-video-click", { youtubeId: v.youtubeId, examTag: v.examTag })}
              className="group block w-56 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-sm transition-all hover:border-saffron-400 hover:shadow-md"
            >
              <div className="relative aspect-video bg-ink-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={v.thumbnailUrl ?? `https://img.youtube.com/vi/${v.youtubeId}/hqdefault.jpg`}
                  alt={v.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <span className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors group-hover:bg-black/20">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-600 text-white shadow-lg">
                    <svg viewBox="0 0 24 24" className="ml-0.5 h-5 w-5" fill="currentColor" aria-hidden>
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </span>
                </span>
                {v.examTag && (
                  <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {v.examTag}
                  </span>
                )}
              </div>
              <div className="p-2.5">
                <p className="line-clamp-2 text-xs font-semibold leading-snug text-ink-900">{v.title}</p>
                {v.reason && <p className="mt-1 line-clamp-2 text-[10px] text-ink-500">{v.reason}</p>}
                {v.channel && <p className="mt-1 truncate text-[10px] font-medium text-ink-400">{v.channel}</p>}
              </div>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
