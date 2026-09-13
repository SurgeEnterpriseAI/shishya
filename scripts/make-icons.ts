// Generate the web-app-manifest PNG icons from public/icon.svg.
//
//   npx tsx scripts/make-icons.ts
//
// Output (committed, referenced by src/app/manifest.ts):
//   public/icons/icon-192.png           any       192x192
//   public/icons/icon-512.png           any       512x512
//   public/icons/icon-maskable-512.png  maskable  512x512 (full-bleed saffron,
//                                        glyph inside the 80% safe zone)
//
// How: there is no SVG rasteriser in node_modules, and the "शि" glyph needs
// real Devanagari shaping, so this drives a local headless Chromium (Edge or
// Chrome) to screenshot a tiny wrapper page. Node built-ins only — no src/
// imports, no database, no network. Set CHROME_PATH to use another binary.
//
// A temporary --user-data-dir is mandatory: without it a running Chrome
// swallows the command ("Opening in existing browser session") and writes
// nothing. Never shell out to `convert` — on Windows that is the NTFS tool.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(__dirname, "..");
const SRC_SVG = path.join(ROOT, "public", "icon.svg");
const OUT_DIR = path.join(ROOT, "public", "icons");
const SAFFRON = "#f97316"; // same fill as public/icon.svg

type Target = { file: string; size: number; kind: "any" | "maskable" };
const TARGETS: Target[] = [
  { file: "icon-192.png", size: 192, kind: "any" },
  { file: "icon-512.png", size: 512, kind: "any" },
  { file: "icon-maskable-512.png", size: 512, kind: "maskable" },
];

function findBrowser(): string | null {
  const candidates = [
    process.env.CHROME_PATH,
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
  ].filter((p): p is string => Boolean(p));
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

function wrapperHtml(t: Target): string {
  const head = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden}`;
  if (t.kind === "any") {
    return `${head}html,body{background:transparent}img{display:block;width:${t.size}px;height:${t.size}px}</style></head><body><img src="icon.svg"></body></html>`;
  }
  // Maskable: launchers crop to a circle/squircle of ~80% diameter. Paint the
  // whole square saffron and keep the (same-colour) tile + glyph at 70%.
  // icon.svg sets its glyph baseline high (y=40 of 64), so nudge the tile
  // down ~11% to centre the glyph optically — it stays inside the safe zone.
  const inner = Math.round(t.size * 0.7);
  const nudge = Math.round(t.size * 0.11);
  return `${head}html,body{background:${SAFFRON}}body{width:${t.size}px;height:${t.size}px;display:flex;align-items:center;justify-content:center}img{display:block;width:${inner}px;height:${inner}px;position:relative;top:${nudge}px}</style></head><body><img src="icon.svg"></body></html>`;
}

function sleepMs(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// On Windows msedge.exe/chrome.exe can return exit 0 BEFORE the screenshot
// is on disk (the launcher hands off to the browser process), so poll until
// the file exists and its size has stopped changing.
function waitForFile(file: string, timeoutMs: number): boolean {
  const deadline = Date.now() + timeoutMs;
  let lastSize = -1;
  while (Date.now() < deadline) {
    if (fs.existsSync(file)) {
      const size = fs.statSync(file).size;
      if (size > 1024 && size === lastSize) return true;
      lastSize = size;
    }
    sleepMs(300);
  }
  return fs.existsSync(file) && fs.statSync(file).size > 1024;
}

function main(): void {
  const bin = findBrowser();
  if (!bin) {
    console.error("[make-icons] No Chromium found. Install Edge/Chrome or set CHROME_PATH.");
    process.exit(1);
  }
  if (!fs.existsSync(SRC_SVG)) {
    console.error(`[make-icons] Missing ${SRC_SVG}`);
    process.exit(1);
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "shishya-pwa-icons-"));
  fs.copyFileSync(SRC_SVG, path.join(tmp, "icon.svg"));
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let failed = 0;
  for (const t of TARGETS) {
    const htmlPath = path.join(tmp, `${t.kind}-${t.size}.html`);
    fs.writeFileSync(htmlPath, wrapperHtml(t), "utf8");
    const out = path.join(OUT_DIR, t.file);
    if (fs.existsSync(out)) fs.rmSync(out);
    const url = "file:///" + htmlPath.replace(/\\/g, "/").replace(/^\/+/, "");
    const r = spawnSync(
      bin,
      [
        "--headless=new",
        "--disable-gpu",
        "--hide-scrollbars",
        "--no-first-run",
        "--no-default-browser-check",
        // One profile PER target: reusing a profile while the previous
        // headless instance is still alive forwards the command to it,
        // and a forwarded command never takes the screenshot.
        `--user-data-dir=${path.join(tmp, `profile-${t.kind}-${t.size}`)}`,
        `--window-size=${t.size},${t.size}`,
        "--force-device-scale-factor=1",
        "--default-background-color=00000000",
        `--screenshot=${out}`,
        url,
      ],
      { stdio: "inherit", timeout: 60_000 },
    );
    const ok = r.status === 0 && waitForFile(out, 30_000);
    if (ok) {
      console.log(`[make-icons] ${t.file}  ${t.size}x${t.size}  ${fs.statSync(out).size} bytes`);
    } else {
      failed++;
      console.error(`[make-icons] FAILED ${t.file} (exit ${r.status}${r.error ? `, ${r.error.message}` : ""})`);
    }
  }

  try {
    fs.rmSync(tmp, { recursive: true, force: true });
  } catch {
    /* a lingering browser process may hold the profile dir — harmless */
  }
  if (failed) process.exit(1);
}

main();
