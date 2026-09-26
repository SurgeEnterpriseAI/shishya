// scripts/cache-check.ts — before/after check for a caching change (27 Sep 2026,
// cache wave 2). READ-ONLY: plain HTTP GETs of public pages, one at a time.
// No DB, no AI calls, no IndexNow / Search Console, no cookies except an
// optional language cookie. The user agent is our own and is not in the
// middleware's AI-bot list, so no BotVisit row is written and crawler
// analytics stay clean (never run this with a Googlebot/Bingbot UA).
//
// Why: /exams/[code]/syllabus (then /cutoff and /updates) move from a
// per-request render ("Cache-Control: private, no-store", X-Vercel-Cache
// MISS) to the ISR cache the guide/tricks pilot already uses
// (src/lib/cache-pilot-routes.ts). The brief: no URL, title, description,
// canonical, hreflang (= the twin gate's output), robots line, JSON-LD or
// body text may change, and the headers + TTFB must show the cache working.
// This records, per URL, the status, Cache-Control, X-Vercel-Cache, Age,
// X-Matched-Path, Content-Language, TTFB (time to response headers) and the
// crawler-read tags (src/lib/page-head-snapshot.ts), then compares two runs
// byte for byte.
//
// Usage (from the repo root):
//   Before the deploy:
//     npx tsx scripts/cache-check.ts --out <dir>/cw2-before.json
//   After the deploy (repeat 2: the second GET of each URL should be a HIT):
//     npx tsx scripts/cache-check.ts --out <dir>/cw2-after.json --repeat 2
//   Compare (exit 1 when any tag, body text or status differs):
//     npx tsx scripts/cache-check.ts --compare <dir>/cw2-before.json <dir>/cw2-after.json
// Options:
//   --base https://shishya.in      origin (a preview deployment URL works too)
//   --codes SSC_CGL,NDA            exam codes (default: the 28-day most-crawled sample below)
//   --families syllabus,cutoff,updates
//   --locales en,hi,te
//   --repeat 1                     GETs per URL (the snapshot is taken from the first 200)
//   --gap-ms 400                   pause between requests (be polite to our own origin)
//   --lang-cookie hi               send "shishya-lang=hi" (the cookie-reader view); nothing else is ever sent
//
// TTFB here is fetch() time to response headers from a warm keep-alive
// connection — comparable run to run, a little lower than curl's
// time_starttransfer on a cold connection. For a one-off curl read:
//   MSYS_NO_PATHCONV=1 curl -s -o /dev/null -A "shishya-cache-check/1.0" -D - \
//     -w "TTFB=%{time_starttransfer}\n" https://shishya.in/exams/SSC_CGL/syllabus

import fs from "node:fs";
import path from "node:path";
import {
  CACHE_CHECK_UA as UA,
  cacheableByHeader,
  compareSnapshots,
  extractHeadSnapshot,
  summarizeSnapshot,
  type PageHeadSnapshot,
  type PageHeadSummary,
  type SnapshotDiff,
} from "../src/lib/page-head-snapshot";

// Nine of the 15 most-crawled codes on /syllabus, /cutoff and /updates
// (BotVisit, 28 days to 27 Sep 2026; scripts/tmp-w2-cachewave2.ts --top) —
// national, state and olympiad; AP_APPSC_GROUP2's /updates twins were the
// sample's localised, self-canonical ones (hreflang = 4), so the twin gate's
// output is covered — plus SSC_CGL, on 27 Sep the only exam in
// src/lib/pattern-verified.ts (the /syllabus pattern table).
const DEFAULT_CODES = [
  "IOQM",
  "MH_MPSC_GROUP_C",
  "TN_TNPSC_GROUP4",
  "CDS",
  "SBI_CLERK",
  "AP_APPSC_GROUP2",
  "NDA",
  "RRB_GROUP_D",
  "UP_UPPSC_RO_ARO",
  "SSC_CGL",
];
const DEFAULT_FAMILIES = ["syllabus", "cutoff", "updates"];
const DEFAULT_LOCALES = ["en", "hi", "te"];

interface Attempt {
  status: number;
  ttfbMs: number;
  totalMs: number;
  bytes: number;
  cacheControl: string | null;
  xVercelCache: string | null;
  age: string | null;
  matchedPath: string | null;
  contentLanguage: string | null;
  vary: string | null;
  location: string | null;
  setCookieNames: string[];
}

interface UrlRecord {
  path: string;
  code: string | null;
  family: string | null;
  locale: string | null;
  attempts: Attempt[];
  snapshot: PageHeadSnapshot | null;
  summary: PageHeadSummary | null;
  /** Every later 200 attempt carried the same snapshot as the first. */
  consistent: boolean;
}

interface RunFile {
  takenAt: string;
  base: string;
  ua: string;
  langCookie: string | null;
  urls: UrlRecord[];
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}
const list = (v: string | undefined, dflt: string[]) =>
  v
    ? v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : dflt;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const median = (xs: number[]) => {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

async function getOnce(url: string, langCookie: string | null): Promise<{ attempt: Attempt; html: string }> {
  const headers: Record<string, string> = { "user-agent": UA, accept: "text/html" };
  if (langCookie) headers.cookie = `shishya-lang=${langCookie}`;
  const t0 = performance.now();
  const res = await fetch(url, { headers, redirect: "manual" });
  const t1 = performance.now();
  const html = await res.text();
  const t2 = performance.now();
  const h = res.headers;
  const setCookie = typeof h.getSetCookie === "function" ? h.getSetCookie() : [];
  return {
    html,
    attempt: {
      status: res.status,
      ttfbMs: Math.round(t1 - t0),
      totalMs: Math.round(t2 - t0),
      bytes: Buffer.byteLength(html),
      cacheControl: h.get("cache-control"),
      xVercelCache: h.get("x-vercel-cache"),
      age: h.get("age"),
      matchedPath: h.get("x-matched-path"),
      contentLanguage: h.get("content-language"),
      vary: h.get("vary"),
      location: h.get("location"),
      setCookieNames: setCookie.map((c) => c.split("=")[0]),
    },
  };
}

function sameSnapshot(a: PageHeadSnapshot, b: PageHeadSnapshot): boolean {
  return compareSnapshots(a, b).length === 0;
}

async function capture(): Promise<void> {
  const out = arg("out");
  if (!out) throw new Error("--out <file.json> is required (or use --compare <before> <after>)");
  const base = (arg("base") ?? "https://shishya.in").replace(/\/$/, "");
  const codes = list(arg("codes"), DEFAULT_CODES);
  const families = list(arg("families"), DEFAULT_FAMILIES);
  const locales = list(arg("locales"), DEFAULT_LOCALES);
  const repeat = Math.max(1, Number(arg("repeat") ?? 1));
  const gapMs = Math.max(0, Number(arg("gap-ms") ?? 400));
  const langCookie = arg("lang-cookie") ?? null;
  if (langCookie && !/^(en|hi|te)$/.test(langCookie)) throw new Error("--lang-cookie must be en, hi or te");

  const records: UrlRecord[] = [];
  for (const code of codes) {
    for (const family of families) {
      for (const locale of locales) {
        const p = `${locale === "en" ? "" : `/${locale}`}/exams/${code}/${family}`;
        const rec: UrlRecord = { path: p, code, family, locale, attempts: [], snapshot: null, summary: null, consistent: true };
        for (let i = 0; i < repeat; i++) {
          try {
            const { attempt, html } = await getOnce(`${base}${p}`, langCookie);
            rec.attempts.push(attempt);
            if (attempt.status === 200) {
              const snap = extractHeadSnapshot(html);
              if (!rec.snapshot) {
                rec.snapshot = snap;
                rec.summary = summarizeSnapshot(snap);
              } else if (!sameSnapshot(rec.snapshot, snap)) {
                rec.consistent = false;
              }
            }
          } catch (e) {
            rec.attempts.push({
              status: 0,
              ttfbMs: 0,
              totalMs: 0,
              bytes: 0,
              cacheControl: null,
              xVercelCache: null,
              age: null,
              matchedPath: null,
              contentLanguage: null,
              vary: null,
              location: `fetch failed: ${(e as Error).message.slice(0, 120)}`,
              setCookieNames: [],
            });
          }
          await sleep(gapMs);
        }
        records.push(rec);
        const a = rec.attempts;
        console.log(
          [
            p.padEnd(44),
            a.map((x) => x.status).join("/").padEnd(8),
            (a[0]?.cacheControl ?? "-").replace("must-revalidate", "m-r").slice(0, 44).padEnd(45),
            a.map((x) => x.xVercelCache ?? "-").join("/").padEnd(12),
            a.map((x) => `${x.ttfbMs}ms`).join("/").padEnd(14),
            rec.summary?.canonical ?? "-",
            rec.summary ? `hreflang=${rec.summary.hreflang.length}` : "",
            rec.consistent ? "" : "INCONSISTENT",
          ].join(" "),
        );
      }
    }
  }
  const file: RunFile = { takenAt: new Date().toISOString(), base, ua: UA, langCookie, urls: records };
  fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
  fs.writeFileSync(out, JSON.stringify(file, null, 1));
  const ok = records.filter((r) => r.attempts.some((a) => a.status === 200));
  const cacheable = ok.filter((r) => cacheableByHeader(r.attempts[r.attempts.length - 1].cacheControl));
  const hits = records.flatMap((r) => r.attempts).filter((a) => a.xVercelCache === "HIT").length;
  const ttfb = records.flatMap((r) => r.attempts.filter((a) => a.status === 200).map((a) => a.ttfbMs));
  console.log(
    `\n${records.length} URLs · ${ok.length} answered 200 · ${cacheable.length} cacheable by Cache-Control · ${hits} HIT responses · median TTFB ${Math.round(median(ttfb))} ms`,
  );
  console.log(`written ${out}`);
}

function describeDiff(d: SnapshotDiff): string {
  const cut = (s: string) => (s.length > 220 ? `${s.slice(0, 220)}…` : s);
  return [`    ${d.field}:`, ...d.removed.map((x) => `      - ${cut(x)}`), ...d.added.map((x) => `      + ${cut(x)}`)].join("\n");
}

function compare(beforeFile: string, afterFile: string): void {
  const before: RunFile = JSON.parse(fs.readFileSync(beforeFile, "utf8"));
  const after: RunFile = JSON.parse(fs.readFileSync(afterFile, "utf8"));
  const byPath = new Map(before.urls.map((u) => [u.path, u] as const));
  let identical = 0;
  let differing = 0;
  let statusChanged = 0;
  let missing = 0;
  const ttfbB: number[] = [];
  const ttfbA: number[] = [];
  console.log(`before ${before.takenAt} (${before.base})  →  after ${after.takenAt} (${after.base})\n`);
  for (const a of after.urls) {
    const b = byPath.get(a.path);
    if (!b) {
      missing++;
      console.log(`${a.path}: not in the before run`);
      continue;
    }
    const sb = b.attempts[0]?.status ?? 0;
    const sa = a.attempts[0]?.status ?? 0;
    for (const x of b.attempts) if (x.status === 200) ttfbB.push(x.ttfbMs);
    for (const x of a.attempts) if (x.status === 200) ttfbA.push(x.ttfbMs);
    const head = [
      a.path.padEnd(44),
      `${sb}→${sa}`.padEnd(8),
      `${cacheableByHeader(b.attempts[0]?.cacheControl ?? null) ? "cacheable" : "no-store"}→${cacheableByHeader(a.attempts[a.attempts.length - 1]?.cacheControl ?? null) ? "cacheable" : "no-store"}`.padEnd(22),
      a.attempts.map((x) => x.xVercelCache ?? "-").join("/").padEnd(12),
      `TTFB ${Math.round(median(b.attempts.map((x) => x.ttfbMs)))}→${Math.round(median(a.attempts.map((x) => x.ttfbMs)))}ms`,
    ].join(" ");
    if (sb !== sa) statusChanged++;
    const diffs = b.snapshot && a.snapshot ? compareSnapshots(b.snapshot, a.snapshot) : [];
    const oneMissing = !!b.snapshot !== !!a.snapshot;
    if (diffs.length === 0 && !oneMissing && sb === sa) {
      identical++;
      console.log(`${head}  identical${a.consistent ? "" : " (after run INCONSISTENT between attempts)"}`);
    } else {
      differing++;
      console.log(`${head}  DIFFERS`);
      if (oneMissing) console.log(`    snapshot: ${b.snapshot ? "present" : "none"} → ${a.snapshot ? "present" : "none"}`);
      for (const d of diffs) console.log(describeDiff(d));
    }
  }
  console.log(
    `\n${after.urls.length} URLs · ${identical} identical · ${differing} differ · ${statusChanged} status changes · ${missing} not in before` +
      ` · median TTFB ${Math.round(median(ttfbB))} → ${Math.round(median(ttfbA))} ms`,
  );
  if (differing > 0 || statusChanged > 0) process.exit(1);
}

async function main() {
  const i = process.argv.indexOf("--compare");
  if (i >= 0) {
    const b = process.argv[i + 1];
    const a = process.argv[i + 2];
    if (!b || !a) throw new Error("--compare <before.json> <after.json>");
    compare(b, a);
    return;
  }
  await capture();
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
