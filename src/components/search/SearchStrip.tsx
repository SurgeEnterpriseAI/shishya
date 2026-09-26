"use client";

// The Shishya search strip (26 Sep 2026, founder brief: "bring back the search
// strip — for the entire redesigned platform, in any language; every search
// takes them to the page we already have; if nothing is there, the AI tutor
// answers and recommends a page").
//
// One calm box. variant "hero" sits under the home H1 and tagline
// (src/components/home/HomeHero.tsx, `search` slot); variant "page" is the
// box on /ask. It is a real GET form to /ask (or /hi/ask, /te/ask), so with no
// JavaScript the server resolver does the whole job (a clear match 307s to
// its page; anything else lists pages).
//
// With JavaScript:
//   * the lite site-wide index (GET /api/search/index) and the resolver load
//     lazily — on first focus, or when the browser is idle a few seconds after
//     load (./strip-engine.ts, a separate chunk) — so the home page's first
//     load carries only this shell;
//   * every keystroke resolves in the browser (no network): what we
//     understood (chips), the best match with its "↵ Open" hint, rows grouped
//     by section (≤ 3 each, 8 in all), and "Ask Shishya's AI" last (first when
//     no page fits);
//   * Enter: a clear match opens its page at once ("Opening …" line, route
//     prefetched when the match settled, no artificial delay); otherwise
//     /ask?q= lists the pages. Shift/Alt+Enter and the Ask row go to
//     /ask?q=&ai=1. Empty Enter runs the example on show. Enter is ignored
//     while an Indic IME / Gboard transliteration is composing.
//   * before /ask, a human submit writes the sessionStorage intent token
//     {q, at} (ASK_INTENT_KEY) — the only thing that lets the /ask answer
//     panel start the AI by itself. This component never calls /api/ask and
//     never a model: a bot that lands here spends nothing.
// Rotating examples cover every section and several scripts (tested to land
// where they claim); prefers-reduced-motion shows one. "/" and Ctrl/Cmd+K
// focus the box. Recent searches stay in this viewer's localStorage only.
// All copy comes in through `copy` (src/lib/search-copy.ts, en/hi/te).
// What the dropdown shows and what Enter does are pure rules in
// ./strip-logic.ts (unit tested); this file is the React shell around them.

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import type { SearchCopy } from "@/lib/search-copy";
import { isDistressQuery } from "@/lib/ask-distress";
import type { resolveQuery } from "@/lib/search/resolve";
import type { PageStatus, Resolution, SearchHit, SearchIndex, SearchSection } from "@/lib/search/types";
import { ASK_INTENT_KEY, RECENT_KEY, SECTION_ICON } from "@/lib/search/types";
import {
  MAX_STRIP_QUERY as MAX_Q,
  askHref,
  buildStripView,
  cleanQuery as clean,
  enterTarget,
  isSitePath,
  type EngineState,
  type StripOpt as Opt,
  type StripResults as Results,
} from "./strip-logic";

type AskBase = "/ask" | "/hi/ask" | "/te/ask";
type PageLocale = "en" | "hi" | "te";
interface Engine {
  index: SearchIndex;
  resolve: typeof resolveQuery;
}
type From = "enter" | "row" | "sample" | "try" | "recent" | "shift" | "quick";

const STATUS_TONE: Record<PageStatus, string> = {
  ready: "bg-emerald-50 text-emerald-800",
  "book-only": "bg-ink-100 text-ink-600",
  coming: "bg-amber-50 text-amber-800",
  "sign-in": "bg-ink-100 text-ink-600",
};

const MAX_RECENT = 5;

// ── Lazy engine (one per tab) ─────────────────────────────────────────

let enginePromise: Promise<Engine> | null = null;
function loadEngine(): Promise<Engine> {
  if (!enginePromise) {
    enginePromise = import("./strip-engine")
      .then(async (m) => ({ index: await m.loadSearchIndexClient(), resolve: m.resolveQuery }))
      .catch((err: unknown) => {
        enginePromise = null; // a later focus retries
        throw err;
      });
  }
  return enginePromise;
}

// ── Small helpers (all storage and analytics best-effort) ─────────────

const modified = (e: ReactMouseEvent) => e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;

function track(kind: "CTA_CLICKED" | "SEARCH_MISS", props: Record<string, unknown>) {
  try {
    window.shishyaTrack?.(kind, { surface: "search-strip", ...props });
  } catch {
    /* analytics is best-effort */
  }
}

function writeIntent(q: string) {
  try {
    sessionStorage.setItem(ASK_INTENT_KEY, JSON.stringify({ q, at: Date.now() }));
  } catch {
    /* storage off: /ask shows its "Get Shishya's answer" button instead */
  }
}

function readRecent(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.length > 0).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function writeRecent(list: string[]) {
  try {
    if (list.length) localStorage.setItem(RECENT_KEY, JSON.stringify(list));
    else localStorage.removeItem(RECENT_KEY);
  } catch {
    /* private window / blocked storage: recent searches simply do not persist */
  }
}

// ── Icons ─────────────────────────────────────────────────────────────

function MagnifierIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}

// ── The strip ─────────────────────────────────────────────────────────

export function SearchStrip({
  variant = "hero",
  copy,
  askBase,
  initialQuery = "",
}: {
  variant?: "hero" | "page";
  copy: SearchCopy;
  askBase: AskBase;
  initialQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const uid = useId();
  const listId = `${uid}-list`;
  const optId = (i: number) => `${uid}-opt-${i}`;
  const pageLocale: PageLocale = askBase === "/hi/ask" ? "hi" : askBase === "/te/ask" ? "te" : "en";
  const hero = variant === "hero";
  const examples = copy.placeholder;
  // 26 Sep 2026 (founder): the box first says what it does ("type anything —
  // we'll take you to your page"), then alternates that prompt with the
  // tested examples: even ticks show the prompt, odd ticks an example.
  const cycle = examples.length * 2;

  const [q, setQ] = useState(initialQuery);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [engineState, setEngineState] = useState<EngineState>("idle");
  const [active, setActive] = useState(-1);
  const [sample, setSample] = useState(0);
  const [fade, setFade] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [opening, setOpening] = useState<{ label: string; section: SearchSection; text: string } | null>(null);
  const [bar, setBar] = useState(0);
  const [maxH, setMaxH] = useState(520);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const recentLoaded = useRef(false);
  const skipSubmitUntil = useRef(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const warm = useCallback(() => {
    setEngineState((s) => (s === "ready" ? s : "loading"));
    loadEngine()
      .then((e) => {
        setEngine(e);
        setEngineState("ready");
      })
      .catch(() => setEngineState("error"));
  }, []);

  const loadRecentOnce = () => {
    if (recentLoaded.current) return;
    recentLoaded.current = true;
    setRecent(readRecent());
  };

  // The /ask page re-renders the strip with the new q after each search.
  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    try {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReduced(m.matches);
      const on = () => setReduced(m.matches);
      m.addEventListener?.("change", on);
      return () => m.removeEventListener?.("change", on);
    } catch {
      return undefined;
    }
  }, []);

  // Rotating prompt + examples: every 3.2 s, paused while focused or typed in; the prompt alone under reduced motion.
  useEffect(() => {
    if (reduced || focused || q || examples.length < 1) return;
    let swap: ReturnType<typeof setTimeout> | undefined;
    const tick = setInterval(() => {
      setFade(false);
      swap = setTimeout(() => {
        setSample((i) => (i + 1) % cycle);
        setFade(true);
      }, 220);
    }, 3200);
    return () => {
      clearInterval(tick);
      if (swap) clearTimeout(swap);
      setFade(true);
    };
  }, [reduced, focused, q, examples.length, cycle]);
  const showing = sample % 2 === 1 ? examples[(sample - 1) / 2] : undefined;

  // Warm the engine when the browser is idle (hero: a few seconds after load, so first paint is untouched).
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const t = setTimeout(
      () => {
        if (w.requestIdleCallback) w.requestIdleCallback(() => warm(), { timeout: 4000 });
        else warm();
      },
      hero ? 3000 : 300,
    );
    return () => clearTimeout(t);
  }, [hero, warm]);

  // "/" and Ctrl/Cmd+K focus the box (never while typing in another field).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const slash = e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey;
      const cmdK = (e.key === "k" || e.key === "K") && (e.ctrlKey || e.metaKey) && !e.altKey;
      if (!slash && !cmdK) return;
      const el = inputRef.current;
      if (!el) return;
      e.preventDefault();
      el.focus();
      el.select();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A finished navigation clears the "Opening …" line.
  useEffect(() => {
    setOpening(null);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!opening) {
      setBar(0);
      return;
    }
    const raf = requestAnimationFrame(() => setBar(0.85));
    const safety = setTimeout(() => setOpening(null), 8000);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(safety);
    };
  }, [opening]);

  // Resolve as the student types — in the browser, over the lite index.
  const deferred = useDeferredValue(q);
  const text = clean(deferred);
  const res = useMemo<Results | null>(() => {
    if (!engine || !text) return null;
    try {
      return {
        typing: engine.resolve(text, engine.index, { typing: true, pageLocale }),
        submit: engine.resolve(text, engine.index, { typing: false, pageLocale }),
      };
    } catch {
      return null;
    }
  }, [engine, text, pageLocale]);

  const { rows, opts, def, chips, notes, aiMode } = useMemo(
    () => buildStripView(text, res, engineState, copy, recent),
    [text, res, engineState, copy, recent],
  );

  useEffect(() => {
    setActive(-1);
  }, [text]);

  // Prefetch the page Enter would open, once the match has settled.
  const prefetchUrl = res?.submit.outcome === "direct" ? (res.submit.best?.url ?? null) : null;
  useEffect(() => {
    if (!prefetchUrl || !isSitePath(prefetchUrl)) return;
    const t = setTimeout(() => {
      try {
        router.prefetch(prefetchUrl.split("#")[0]);
      } catch {
        /* prefetch is an optimisation */
      }
    }, 150);
    return () => clearTimeout(t);
  }, [prefetchUrl, router]);

  const dropdownVisible = open && !opening && rows.length > 0;

  // Keep the dropdown inside the visible viewport (phone keyboards shrink it).
  useEffect(() => {
    if (!dropdownVisible) return;
    const vv = window.visualViewport;
    const calc = () => {
      const box = boxRef.current?.getBoundingClientRect();
      if (!box) return;
      const vh = vv ? vv.height + vv.offsetTop : window.innerHeight;
      const room = vh - box.bottom - 12;
      setMaxH(Math.round(Math.max(180, Math.min(520, vh * 0.7, room))));
    };
    calc();
    vv?.addEventListener("resize", calc);
    vv?.addEventListener("scroll", calc);
    window.addEventListener("scroll", calc, { passive: true });
    return () => {
      vv?.removeEventListener("resize", calc);
      vv?.removeEventListener("scroll", calc);
      window.removeEventListener("scroll", calc);
    };
  }, [dropdownVisible]);

  // ── Actions ─────────────────────────────────────────────────────────

  const askUrl = (t: string, ai: boolean) => askHref(askBase, t, ai);

  function remember(t: string) {
    const base = recentLoaded.current ? recent : readRecent();
    recentLoaded.current = true;
    const next = [t, ...base.filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, MAX_RECENT);
    setRecent(next);
    writeRecent(next);
  }

  /** To /ask: the pages for this search (and the AI when ai=1 or no page fits). */
  function goAsk(t: string, ai: boolean, action: "list" | "ai" | "ask", r: Resolution | null, from: From) {
    writeIntent(t); // a person submitted this, in this tab, just now
    remember(t);
    if (r?.logMiss) track("SEARCH_MISS", { variant, q: t.slice(0, 120), nearest: r.hits.slice(0, 3).map((h) => h.url) });
    track("CTA_CLICKED", { variant, action, from, outcome: r?.outcome ?? null, q: t.slice(0, 120), url: askBase, section: r?.hits[0]?.section ?? null, why: null, rank: null });
    setOpen(false);
    setActive(-1);
    router.push(askUrl(t, ai));
  }

  /** Open a real page now, with the "Opening …" line. */
  function openHit(hit: SearchHit, t: string, action: "open" | "suggestion", rank: number, r: Resolution | null, from: From) {
    // 26 Sep 2026: a distress sign never opens a study page ("class 6 i want to
    // die" matched the Class 6 page); /ask shows the helplines instead.
    if (isDistressQuery(t)) {
      goAsk(t, false, "ask", r, from);
      return;
    }
    if (!isSitePath(hit.url)) {
      goAsk(t, false, "list", r, from);
      return;
    }
    remember(t);
    track("CTA_CLICKED", { variant, action, from, outcome: r?.outcome ?? null, q: t.slice(0, 120), url: hit.url, section: hit.section, why: hit.why, rank });
    setOpen(false);
    setActive(-1);
    setOpening({ label: hit.label, section: hit.section, text: t });
    inputRef.current?.blur(); // phones: drop the keyboard so the page shows
    router.push(hit.url);
  }

  /** What Enter does with a query: open the one clear page, else list the pages on /ask. */
  function run(raw: string, from: From) {
    const t = clean(raw);
    if (!t) return;
    if (!engine) {
      goAsk(t, false, "list", null, from); // the server resolves (and 307s a clear match)
      return;
    }
    let r: Resolution | null = null;
    try {
      r = engine.resolve(t, engine.index, { typing: false, pageLocale });
    } catch {
      r = null;
    }
    const target = enterTarget(r);
    if (target.kind === "open") openHit(target.hit, t, "open", 0, r, from);
    else goAsk(t, false, target.action, r, from);
  }

  function activate(opt: Opt) {
    const t = clean(q);
    const r = res?.submit ?? null;
    if (opt.kind === "hit") openHit(opt.hit, t, opt.best ? "open" : "suggestion", opt.rank, r, "row");
    else if (opt.kind === "all") goAsk(t, false, "list", r, "row");
    else if (opt.kind === "ask") goAsk(t, true, "ask", r, "row");
    else {
      setQ(opt.q);
      run(opt.q, opt.kind);
    }
  }

  function submitNow(forceAsk: boolean) {
    const t = clean(q);
    if (forceAsk) {
      if (t) goAsk(t, true, "ask", res?.submit ?? null, "shift");
      return;
    }
    const chosen = active >= 0 ? opts[active] : undefined;
    if (chosen) {
      activate(chosen);
      return;
    }
    if (!t) {
      const ex = showing?.text; // empty Enter runs the example on show
      if (ex) {
        setQ(ex);
        run(ex, "sample");
      } else {
        setOpen(true); // the prompt is showing: open the "Try" rows instead
      }
      return;
    }
    run(t, "enter");
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (Date.now() < skipSubmitUntil.current) return; // an IME just confirmed a word
    submitNow(false);
  }

  function onKeyDown(e: ReactKeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      // Indic IMEs and Gboard transliteration press Enter to confirm a word.
      if (e.nativeEvent.isComposing || e.keyCode === 229) {
        skipSubmitUntil.current = Date.now() + 150;
        return;
      }
      e.preventDefault();
      submitNow(e.shiftKey || e.altKey);
      return;
    }
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      const n = opts.length;
      if (!n) return;
      const down = e.key === "ArrowDown";
      setActive((a) => (down ? (a + 1 >= n ? 0 : a + 1) : a <= 0 ? n - 1 : a - 1));
      return;
    }
    if (e.key === "Escape") {
      if (open && rows.length) {
        setOpen(false);
        setActive(-1);
      } else if (q) {
        setQ("");
      }
    }
  }

  function onFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setFocused(true);
    setOpen(true);
    loadRecentOnce();
    if (!engine) warm();
    // Phones: lift the box under the sticky strip so the list sits above the keyboard.
    if (hero && typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches) {
      setTimeout(() => {
        const el = boxRef.current;
        if (!el) return;
        const sticky = document.querySelector<HTMLElement>("div.sticky.top-0");
        const offset = (sticky?.offsetHeight ?? 0) + 8;
        const top = el.getBoundingClientRect().top + window.scrollY - offset;
        if (Math.abs(window.scrollY - top) > 4) window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
      }, 60);
    }
  }

  function onBlur() {
    // A short grace period: a tap on a row lands before the list closes.
    blurTimer.current = setTimeout(() => {
      setFocused(false);
      setOpen(false);
      setActive(-1);
    }, 150);
  }

  useEffect(
    () => () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    },
    [],
  );

  // ── Render ──────────────────────────────────────────────────────────

  const typed = clean(q);
  const top = res ? (res.submit.best ?? res.typing.hits[0] ?? res.submit.hits[0] ?? null) : null;
  const glyphSection: SearchSection | null = opening
    ? opening.section
    : typed
      ? (top?.section ?? null)
      : focused
        ? null
        : (showing?.section ?? null);
  const shownText = clean(deferred) || typed;

  function renderOpt(opt: Opt, i: number): ReactNode {
    const isActive = active === i;
    const isDefault = def === i && active < 0;
    const base = `flex w-full min-h-[48px] items-center gap-3 px-3 text-left transition-colors ${isActive ? "bg-saffron-50" : "hover:bg-ink-50"}`;
    const kbd = (label: string) => (
      <kbd className="hidden shrink-0 rounded-md border border-ink-200 bg-white px-1.5 py-0.5 font-sans text-[11px] font-medium text-ink-500 sm:inline">
        {label}
      </kbd>
    );
    const common = { id: optId(i), role: "option" as const, "aria-selected": isActive, tabIndex: -1 };

    if (opt.kind === "hit") {
      const h = opt.hit;
      return (
        <a
          {...common}
          href={h.url}
          data-search-row={h.docId}
          onClick={(e) => {
            if (modified(e)) return;
            e.preventDefault();
            activate(opt);
          }}
          className={`${base} ${opt.best ? "py-3" : "py-2"}`}
        >
          <span
            aria-hidden
            className={`grid shrink-0 place-items-center rounded-xl ${opt.best ? "h-10 w-10 bg-saffron-50 text-xl" : "h-8 w-8 bg-ink-50 text-base"}`}
          >
            {SECTION_ICON[h.section]}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-semibold text-ink-900 ${opt.best ? "text-[15px]" : "text-sm"}`}>{h.label}</span>
            {h.sub && h.sub !== h.label && <span className="block truncate text-[12.5px] leading-snug text-ink-500">{h.sub}</span>}
            {h.status && (
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS_TONE[h.status]}`}>{copy.badges[h.status]}</span>
            )}
          </span>
          {isDefault && kbd(`↵ ${copy.strip.openKey}`)}
        </a>
      );
    }

    if (opt.kind === "all") {
      return (
        <a
          {...common}
          href={askUrl(shownText, false)}
          onClick={(e) => {
            if (modified(e)) return;
            e.preventDefault();
            activate(opt);
          }}
          className={`${base} py-2`}
        >
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink-50 text-ink-600">
            <MagnifierIcon />
          </span>
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink-900">{copy.strip.seeAll.replace("{q}", shownText)}</span>
          {isDefault && kbd("↵")}
        </a>
      );
    }

    if (opt.kind === "ask") {
      return (
        <a
          {...common}
          href={askUrl(shownText, true)}
          data-search-ask
          onClick={(e) => {
            if (modified(e)) return;
            e.preventDefault();
            activate(opt);
          }}
          className={`${base} py-2.5 ${aiMode && !isActive ? "bg-saffron-50/70" : ""} ${aiMode ? "" : "border-t border-ink-100"}`}
        >
          <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-saffron-500 text-sm font-bold text-white">
            ✦
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink-900">
              {copy.askRow}: “{shownText}”
            </span>
            <span className="block truncate text-[12px] leading-snug text-ink-500">{copy.askRowSub}</span>
          </span>
          {isDefault && kbd("↵")}
        </a>
      );
    }

    const label = opt.q;
    return (
      <button
        {...common}
        type="button"
        onClick={() => activate(opt)}
        className={`${base} py-2`}
      >
        <span aria-hidden className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink-50 text-base">
          {opt.kind === "try" ? SECTION_ICON[opt.section] : "↺"}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-ink-800">{label}</span>
        {opt.kind === "try" && <span className="hidden shrink-0 text-[11px] text-ink-400 sm:inline">{copy.sections[opt.section]}</span>}
      </button>
    );
  }

  return (
    <div className="w-full">
      <form role="search" method="get" action={askBase} onSubmit={onSubmit} className="relative w-full" autoComplete="off">
        <div
          ref={boxRef}
          onPointerEnter={() => {
            if (!engine && engineState === "idle") warm();
          }}
          className={`relative flex items-center gap-1 rounded-2xl border bg-white pl-2 pr-1.5 transition-[border-color,box-shadow] duration-150 ${
            hero ? "h-[52px] sm:h-14" : "h-[52px]"
          } ${
            focused
              ? "border-saffron-400 shadow-lg shadow-saffron-500/10 ring-4 ring-saffron-100"
              : "border-ink-200 shadow-[0_1px_2px_rgba(15,23,42,0.05),0_12px_32px_-14px_rgba(249,115,22,0.35)] hover:border-ink-300"
          }`}
        >
          <span
            aria-hidden
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-lg transition-opacity duration-200 ${
              glyphSection ? "bg-saffron-50" : "text-ink-400"
            } ${fade || typed || focused ? "opacity-100" : "opacity-0"}`}
          >
            {glyphSection ? SECTION_ICON[glyphSection] : <MagnifierIcon />}
          </span>
          <label htmlFor="shishya-search" className="sr-only">
            {copy.strip.inputLabel}
          </label>
          <input
            ref={inputRef}
            id="shishya-search"
            name="q"
            type="text"
            role="combobox"
            aria-expanded={dropdownVisible}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={dropdownVisible && active >= 0 ? optId(active) : undefined}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
              if (!engine && engineState !== "loading") warm();
            }}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            placeholder={showing?.text ?? copy.prompt}
            maxLength={MAX_Q}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            inputMode="search"
            className={`h-full min-w-0 flex-1 bg-transparent px-1.5 text-[17px] text-ink-900 outline-none placeholder:text-ink-400 placeholder:transition-opacity placeholder:duration-200 sm:text-lg ${
              fade ? "placeholder:opacity-100" : "placeholder:opacity-0"
            }`}
          />
          {q && !opening && (
            <button
              type="button"
              aria-label={copy.strip.clearInput}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQ("");
                setActive(-1);
                inputRef.current?.focus();
              }}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700"
            >
              <ClearIcon />
            </button>
          )}
          {!focused && !q && (
            <kbd
              title={copy.strip.shortcut}
              className="mr-1 hidden h-6 min-w-[24px] place-items-center rounded-md border border-ink-200 bg-ink-50 px-1.5 font-sans text-xs text-ink-500 sm:[@media(hover:hover)]:grid"
            >
              /
            </kbd>
          )}
          <button
            type="submit"
            aria-label={copy.submit}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-saffron-500 text-white shadow-sm transition-colors hover:bg-saffron-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-saffron-300"
          >
            <ArrowIcon />
          </button>

          {opening && (
            <div className="absolute inset-0 flex items-center gap-2.5 rounded-2xl bg-white pl-2 pr-3">
              <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-saffron-50 text-lg">
                {SECTION_ICON[opening.section]}
              </span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-ink-800">
                {copy.opening} {opening.label}…
              </span>
              <a
                href={askUrl(opening.text, true)}
                onClick={(e) => {
                  if (modified(e)) return;
                  e.preventDefault();
                  goAsk(opening.text, true, "ask", null, "row");
                }}
                className="shrink-0 text-xs font-semibold text-saffron-700 hover:text-saffron-800"
              >
                {copy.askInstead}
              </a>
            </div>
          )}
          {opening && !reduced && (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-x-3 bottom-0 h-0.5 origin-left rounded-full bg-saffron-500 transition-transform duration-[600ms] ease-out"
              style={{ transform: `scaleX(${bar})` }}
            />
          )}
        </div>

        {dropdownVisible && (
          <div
            className="absolute inset-x-0 top-full z-50 mt-2 overflow-y-auto overscroll-contain rounded-2xl border border-ink-200 bg-white py-1.5 text-left shadow-xl shadow-ink-900/10"
            style={{ maxHeight: maxH }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {chips.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 px-3 pb-1.5 pt-1 text-[12px]">
                <span className="font-semibold text-ink-500">{copy.understood}:</span>
                {chips.map((c, i) => (
                  <span key={`${c}-${i}`} className="rounded-full bg-ink-100 px-2 py-0.5 text-ink-700">
                    {c}
                  </span>
                ))}
              </div>
            )}
            {notes.map((n) => (
              <p key={n} className="mx-3 my-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-[12px] leading-snug text-amber-900">
                {n}
              </p>
            ))}
            <ul role="listbox" id={listId} aria-label={copy.strip.inputLabel}>
              {rows.map((row, ri) => {
                if (row.type === "opt") {
                  return (
                    <li key={`o-${row.i}`} role="none">
                      {renderOpt(row.opt, row.i)}
                    </li>
                  );
                }
                if (row.type === "head") {
                  return (
                    <li
                      key={`h-${row.key}`}
                      role="presentation"
                      className="flex items-center justify-between gap-2 px-3 pb-1 pt-2.5 text-[11px] font-semibold uppercase tracking-wide text-ink-500"
                    >
                      <span className="flex items-center gap-1.5">
                        {row.icon && <span aria-hidden>{row.icon}</span>}
                        {row.label}
                      </span>
                      {row.clear && (
                        <button
                          type="button"
                          onClick={() => {
                            setRecent([]);
                            writeRecent([]);
                            setActive(-1);
                          }}
                          className="rounded px-1.5 py-0.5 text-[11px] font-medium normal-case tracking-normal text-saffron-700 hover:bg-saffron-50"
                        >
                          {copy.strip.clearRecent}
                        </button>
                      )}
                    </li>
                  );
                }
                if (row.type === "quick") {
                  return (
                    <li key={`q-${ri}`} role="presentation" className="flex flex-wrap items-center gap-1.5 px-3 pb-2 pl-16">
                      <span className="sr-only">{copy.quickLinks}:</span>
                      {row.hits.map((h) => (
                        <a
                          key={h.url}
                          href={h.url}
                          tabIndex={-1}
                          onClick={(e) => {
                            if (modified(e)) return;
                            e.preventDefault();
                            openHit(h, clean(q), "suggestion", -1, res?.submit ?? null, "quick");
                          }}
                          className="rounded-full border border-ink-200 bg-white px-2.5 py-1 text-[12px] font-medium text-ink-700 transition-colors hover:border-saffron-400 hover:text-saffron-800"
                        >
                          {h.label.split(" · ").pop()}
                        </a>
                      ))}
                    </li>
                  );
                }
                if (row.type === "loading") {
                  return (
                    <li key="loading" role="presentation" className="flex items-center gap-2 px-3 py-2 text-[13px] text-ink-500">
                      <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-saffron-500" />
                      {copy.strip.loading}
                    </li>
                  );
                }
                return (
                  <li key={`n-${row.key}`} role="presentation" className="px-3 py-2 text-[13px] text-ink-600">
                    {row.text}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </form>

      {hero && <p className="mt-2.5 text-balance text-center text-[13px] leading-snug text-ink-500">{copy.helper}</p>}
      <p className="sr-only" aria-live="polite">
        {opening ? `${copy.opening} ${opening.label}` : ""}
      </p>
    </div>
  );
}
