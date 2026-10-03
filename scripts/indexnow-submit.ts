// scripts/indexnow-submit.ts
//
// Push every sitemap URL to IndexNow — the shared instant-indexing
// API behind Bing (which powers ChatGPT search + Copilot), Seznam,
// Naver and Yandex. This gets the whole site into the Bing index
// WITHOUT waiting on the manual Bing Webmaster Tools setup.
//
// Key is hosted at https://shishya.in/<KEY>.txt (public/ file) per the
// IndexNow verification protocol. Safe to re-run any time (idempotent
// server-side; engines dedupe). Max 10,000 URLs per POST — we chunk.
//
// Since 13 Sep 2026 (index shape) the weekly cron no longer pushes the whole
// sitemap, so after a ship push only the URL families that are new or
// changed: --match takes a regex over the sitemap URLs.
//
// 3 Oct 2026 (fix C16):
//   --sections  send the section hubs, the machine files and the life-stage
//               pages (sectionHubUrls + machineFileUrls + lifeStageUrls in
//               src/lib/indexnow.ts) instead of the sitemap — the pages that
//               change only with a deploy. --match still filters them.
//   --dry       print what would be sent and send nothing.
//   --all       needed to send more than 2,000 URLs (a bare run is the whole
//               sitemap, about 8,000 URLs; it is refused without --all).
//
// USAGE: npx tsx scripts/indexnow-submit.ts --all                    # every sitemap URL
//        npx tsx scripts/indexnow-submit.ts --match "/checklist$|/ideas$"
//        npx tsx scripts/indexnow-submit.ts --dry --match "/exams/[^/]+/(guide|tricks)$"
//        npx tsx scripts/indexnow-submit.ts --sections --dry

// 1 Oct 2026: a module, not a global script. With no import/export its
// top-level `main` shared the global scope with any other script file that
// declares one (scripts/tmp-audit-chk-school-c.ts that day), so tsc — and the
// type check of a plain local `next build`, which includes **/*.ts — failed
// with TS2393 "Duplicate function implementation". Behaviour is unchanged.
// 3 Oct 2026: the named exports below (main, sizeRefusal, MAX_WITHOUT_ALL)
// keep it a module, so the bare `export {}` is gone.

const HOST = "shishya.in";
const KEY = "7e0b8421fc95cdb98187e2b89a6e2437";
const SITEMAP = `https://${HOST}/sitemap.xml`;
const CHUNK = 10_000;

/** The most URLs one run sends without --all. */
export const MAX_WITHOUT_ALL = 2_000;

function arg(argv: readonly string[], name: string): string | undefined {
  const i = argv.indexOf(name);
  return i >= 0 ? argv[i + 1] : undefined;
}

/** Why a run of `count` URLs is refused, or null when it may send. */
export function sizeRefusal(count: number, all: boolean): string | null {
  if (count > MAX_WITHOUT_ALL && !all) {
    return `refusing to send ${count} URLs (more than ${MAX_WITHOUT_ALL}): narrow it with --match or --sections, or pass --all to send them all`;
  }
  return null;
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

/** Runs the submit; resolves to the process exit code (0 = done). */
export async function main(argv: readonly string[] = process.argv, fetchImpl: FetchLike = fetch): Promise<number> {
  const dry = argv.includes("--dry");
  const all = argv.includes("--all");
  const match = arg(argv, "--match");

  let source: string;
  let pool: string[];
  if (argv.includes("--sections")) {
    const { sectionHubUrls, machineFileUrls, lifeStageUrls } = await import("../src/lib/indexnow");
    pool = [...new Set([...sectionHubUrls(), ...machineFileUrls(), ...lifeStageUrls()])];
    source = "section hubs + machine files + life-stage pages";
  } else {
    const xml = await (await fetchImpl(SITEMAP)).text();
    pool = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    source = "sitemap";
  }
  const urls = match ? pool.filter((u) => new RegExp(match).test(u)) : pool;
  console.log(`${source} URLs: ${pool.length}${match ? ` · matching ${match}: ${urls.length}` : ""}`);
  if (urls.length === 0) {
    console.error("no URLs to submit");
    return 1;
  }

  const refusal = sizeRefusal(urls.length, all);
  if (dry) {
    for (const u of urls) console.log(u);
    console.log(`DRY RUN — nothing sent (${urls.length} URLs)${refusal ? `; a real run would be refused: ${refusal}` : ""}`);
    return 0;
  }
  if (refusal) {
    console.error(refusal);
    return 1;
  }

  for (let i = 0; i < urls.length; i += CHUNK) {
    const chunk = urls.slice(i, i + CHUNK);
    const res = await fetchImpl("https://api.indexnow.org/IndexNow", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({
        host: HOST,
        key: KEY,
        keyLocation: `https://${HOST}/${KEY}.txt`,
        urlList: chunk,
      }),
    });
    console.log(`chunk ${i / CHUNK + 1}: ${chunk.length} URLs → HTTP ${res.status} ${res.statusText}`);
    const body = await res.text();
    if (body) console.log(`  response: ${body.slice(0, 200)}`);
  }
  return 0;
}

// Run only when executed as a script (npx tsx scripts/indexnow-submit.ts …),
// not when a test imports main() / sizeRefusal().
if (/indexnow-submit\.ts$/.test(process.argv[1] ?? "")) {
  main().then(
    (code) => {
      process.exitCode = code;
    },
    (e) => {
      console.error(e);
      process.exit(1);
    },
  );
}
