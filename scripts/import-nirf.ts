// 27 Sep 2026 (organic wave 3, official answers): NIRF ranks for the
// /colleges catalogue, read from the official NIRF tables only.
//
// Why: src/lib/colleges-data.ts said "Every rank field is from the published
// 2024 list", but a cell-by-cell check against nirfindia.org found ranks that
// the 2024 tables do not state — Jindal Global Law School "Law #8" and NLU
// Jodhpur "Law #10" (neither is in the NIRF 2024 or 2025 Law table at all),
// RMNLU "Law #12" (2024 table: 20), GNLU "Law #9" (8), RGSOIPL "Law #5"
// (IIT Kharagpur, 7), Christ University "University #35" (60), IIIT Allahabad
// "Engineering #84" (87), IIT Madras "Management #4" (13 in 2024) — and
// NIRF 2025 has been published since (nirfindia.org/Rankings/2025). Students
// search "NIRF ranking <college>"; the answer must be the official table.
//
// What it does:
//   1. Reads the ranking years linked from https://www.nirfindia.org/ and
//      takes the newest (or --year YYYY); fails if that year's index page
//      is not on nirfindia.org (no aggregator ever).
//   2. Fetches that year's and the previous year's category tables (Overall,
//      Engineering, Management, Medical, Law, University, Pharmacy,
//      Architecture and Planning, Research Institutions) plus their
//      rank-band pages (e.g. "Rank-band: 101-150").
//   3. Matches each of the 77 colleges by its NIRF institute code (the
//      "U-0456" tail of "IR-E-U-0456", the same across categories) — never
//      by fuzzy name. Band pages carry no code, so a band row matches only
//      on an exact NIRF name + city already seen for that code.
//   4. Prints, per college, the ranks now in colleges-data.ts and the ranks
//      the official tables state (this year and the previous year), with
//      each table cell's category, rank, institute ID, name, city and URL.
//   5. --apply rewrites only the `nirf`, `nirfBands` and `nirfPrevious`
//      lines of each college in src/lib/colleges-data.ts, the two year
//      constants, and data/nirf/nirf-evidence.json (every matched table row
//      with its source URL). Idempotent: a second run changes nothing.
//
// Sub-units: DMS IIT Delhi, SJMSOM IIT Bombay, RGSOIPL (IIT Kharagpur) and
// IMS BHU take ONLY their parent's rank in their own category (NIRF ranks
// the parent institute there). A separately ranked constituent is never
// credited to its university (Symbiosis International does not get SIBM's
// Management or SLS's Law rank). A college NIRF does not rank gets no rank.
//
// No DB, no AI calls. Code files only — review the git diff after --apply.
//
// Run: npx tsx scripts/import-nirf.ts [--year 2025] [--apply]

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, "src/lib/colleges-data.ts");
const EVIDENCE_FILE = path.join(ROOT, "data/nirf/nirf-evidence.json");
const BASE = "https://www.nirfindia.org";

type Cat = "overall" | "engineering" | "medical" | "management" | "law" | "university" | "pharmacy" | "architecture" | "research";
// Order = the NirfRanks interface order, so generated lines read the same way.
const CATS: readonly Cat[] = ["overall", "engineering", "medical", "management", "law", "university", "pharmacy", "architecture", "research"];
const PAGE: Record<Cat, string> = {
  overall: "Overall",
  engineering: "Engineering",
  medical: "Medical",
  management: "Management",
  law: "Law",
  university: "University",
  pharmacy: "Pharmacy",
  architecture: "Architecture",
  research: "Research",
};

interface Row {
  year: number;
  category: Cat;
  /** "1", "27" or a band such as "101-150". */
  rank: string;
  /** Institute ID as printed, e.g. "IR-E-U-0456"; absent on band pages. */
  instituteId?: string;
  name: string;
  city: string;
  state: string;
  score?: string;
  /** The page the cell was read on, and its heading. */
  sourceUrl: string;
  heading: string;
}

/** Which NIRF institute each college is. `only` limits a sub-unit to its
 *  parent's rank in its own category; `none` says why there is no rank. */
interface Match {
  inst?: string;
  only?: Cat[];
  none?: string;
}
const MATCH: Record<string, Match> = {
  "iit-madras": { inst: "U-0456" },
  "iit-delhi": { inst: "I-1074" },
  "iit-bombay": { inst: "U-0306" },
  "iit-kanpur": { inst: "I-1075" },
  "iit-kharagpur": { inst: "U-0573" },
  "iit-roorkee": { inst: "U-0560" },
  "iit-guwahati": { inst: "U-0053" },
  "iit-hyderabad": { inst: "U-0013" },
  "iit-bhu-varanasi": { inst: "U-0701" },
  "iit-ism-dhanbad": { inst: "U-0205" },
  "nit-trichy": { inst: "U-0467" },
  "nit-rourkela": { inst: "U-0357" },
  "nit-surathkal": { inst: "U-0237" },
  "nit-warangal": { inst: "U-0025" },
  "anna-university": { inst: "U-0439" },
  "jadavpur-university": { inst: "U-0575" },
  "iit-indore": { inst: "U-0273" },
  "iit-mandi": { inst: "U-0184" },
  "dtu-delhi": { inst: "U-0098" },
  "vit-vellore": { inst: "U-0490" },
  "bits-pilani": { inst: "U-0391" },
  "iim-ahmedabad": { inst: "S-8890" },
  "iim-bangalore": { inst: "S-8903" },
  "iim-kozhikode": { inst: "S-8909" },
  "iim-calcutta": { inst: "S-8972" },
  "iim-lucknow": { inst: "S-8959" },
  "iim-indore": { inst: "S-8918" },
  "xlri-jamshedpur": { inst: "S-132" },
  "iit-delhi-dms": { inst: "I-1074", only: ["management"] },
  "iit-bombay-sjmsom": { inst: "U-0306", only: ["management"] },
  "aiims-delhi": { inst: "N-15" },
  "pgimer-chandigarh": { inst: "U-0079" },
  "cmc-vellore": { inst: "C-45654" },
  "nimhans-bangalore": { inst: "U-0236" },
  "jipmer-puducherry": { inst: "U-0368" },
  "sgpgi-lucknow": { inst: "N-33" },
  "kmc-manipal": { inst: "C-7242" },
  "nlsiu-bangalore": { inst: "U-0238" },
  "nlu-delhi": { inst: "U-0111" },
  "nalsar-hyderabad": { inst: "N-18" },
  "iit-kgp-rgsoipl": { inst: "U-0573", only: ["law"] },
  "jindal-global-law": { none: "O.P. Jindal Global University (Sonipat) is in none of the NIRF tables read (Overall, Law, University, Management and the others, with their rank bands)." },
  "wbnujs-kolkata": { inst: "U-0585" },
  "iisc-bangalore": { inst: "U-0220" },
  "jnu-delhi": { inst: "U-0109" },
  "jamia-millia-islamia": { inst: "U-0108" },
  "bhu-varanasi": { inst: "U-0500" },
  "delhi-university": { inst: "U-0120" },
  "hyderabad-university": { inst: "U-0042" },
  "manipal-academy": { inst: "U-0234" },
  "amrita-vishwa-vidyapeetham": { inst: "U-0436" },
  "jamia-hamdard": { inst: "U-0107" },
  "niper-mohali": { inst: "U-0380" },
  "iiit-hyderabad": { inst: "U-0014" },
  "iiit-allahabad": { inst: "U-0516" },
  "iiit-bangalore": { inst: "U-0221" },
  "iiser-pune": { inst: "U-0305" },
  "iiser-kolkata": { inst: "U-0572" },
  "iiser-mohali": { inst: "U-0377" },
  "iit-gandhinagar": { inst: "U-0139" },
  "iit-jodhpur": { inst: "U-0395" },
  "nit-calicut": { inst: "U-0263" },
  "iit-ropar": { inst: "U-0378" },
  "iit-bhubaneswar": { inst: "U-0355" },
  "iim-shillong": { inst: "S-8937" },
  "iim-trichy": { inst: "S-8948" },
  "mdi-gurgaon": { inst: "I-1170" },
  "spjimr-mumbai": { inst: "I-1044" },
  "amrita-medical-faridabad": { none: "NIRF's Medical table ranks Amrita Vishwa Vidyapeetham (Coimbatore) as one institution; the Faridabad campus has no rank of its own." },
  "kgmu-lucknow": { inst: "U-0523" },
  "bhu-medical": { inst: "U-0500", only: ["medical"] },
  "gnlu-gandhinagar": { inst: "U-0134" },
  "nlu-jodhpur": { none: "National Law University, Jodhpur is in none of the NIRF tables read (Law, Overall, University and the others, with their rank bands)." },
  "rmnlu-lucknow": { inst: "U-0511" },
  "vit-vellore-university": { inst: "U-0490", only: ["university"] },
  "christ-university": { inst: "U-0217" },
  "symbiosis-pune": { inst: "U-0329" },
};

// ── Fetch + parse ────────────────────────────────────────────────────────

async function get(url: string): Promise<string> {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (Shishya NIRF import; +https://shishya.in)" } });
      if (res.status === 404) throw Object.assign(new Error(`404 ${url}`), { notFound: true });
      if (!res.ok) throw new Error(`${res.status} ${url}`);
      return await res.text();
    } catch (e) {
      if ((e as { notFound?: boolean }).notFound || attempt >= 3) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&#039;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

function parsePage(html: string, year: number, category: Cat, url: string): Row[] {
  const head = html.match(/India Rankings (\d{4}):[^<]*/);
  const heading = head ? decode(head[0]) : "";
  if (!head || Number(head[1]) !== year) throw new Error(`${url}: heading "${heading}" is not India Rankings ${year}`);
  const band = heading.match(/Rank-band:\s*(\d+-\d+)/)?.[1];
  let start = html.indexOf('id="tbl_overall"');
  let end: number;
  if (start >= 0) {
    const next = html.indexOf("<table id=", start + 10);
    end = next > 0 ? next : html.length;
  } else {
    start = html.indexOf('id="div_overall"');
    if (start < 0) throw new Error(`${url}: no ranking table`);
    end = html.indexOf("</table>", start) + 8;
  }
  const sec = html
    .slice(start, end)
    .replace(/<div class="tbl_hidden".*?<\/table>\s*<\/div>/gs, "")
    .replace(/<div style="float:right;">.*?<\/div>/gs, "");
  const rows: Row[] = [];
  for (const tr of sec.matchAll(/<tr[^>]*>(.*?)<\/tr>/gs)) {
    const cells = [...tr[1].matchAll(/<td[^>]*>(.*?)<\/td>/gs)].map((m) => decode(m[1]));
    if (cells.length === 6 && cells[0].startsWith("IR-")) {
      rows.push({ year, category, rank: cells[5], instituteId: cells[0], name: cells[1], city: cells[2], state: cells[3], score: cells[4], sourceUrl: url, heading });
    } else if (cells.length === 3 && band) {
      rows.push({ year, category, rank: band, name: cells[0], city: cells[1], state: cells[2], sourceUrl: url, heading });
    }
  }
  if (rows.length === 0) throw new Error(`${url}: table parsed to 0 rows`);
  return rows;
}

async function readYear(year: number): Promise<Row[]> {
  const out: Row[] = [];
  for (const cat of CATS) {
    const url = `${BASE}/Rankings/${year}/${PAGE[cat]}Ranking.html`;
    const html = await get(url);
    out.push(...parsePage(html, year, cat, url));
    const bands = [...new Set([...html.matchAll(new RegExp(`href="(${PAGE[cat]}Ranking\\d+\\.html)"`, "g"))].map((m) => m[1]))];
    for (const b of bands) {
      const bu = `${BASE}/Rankings/${year}/${b}`;
      out.push(...parsePage(await get(bu), year, cat, bu));
    }
  }
  return out;
}

/** "IR-E-U-0456" → "U-0456" (the institute's code, same in every category). */
const instOf = (id: string) => id.split("-").slice(2).join("-");
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

// ── colleges-data.ts ─────────────────────────────────────────────────────

type Ranks = Partial<Record<Cat, number>>;
type Bands = Partial<Record<Cat, string>>;

function block(src: string, slug: string): { start: number; end: number } {
  const i = src.indexOf(`slug: "${slug}",`);
  if (i < 0) throw new Error(`colleges-data.ts: no college "${slug}"`);
  const open = src.lastIndexOf("\n  {", i);
  const close = src.indexOf("\n  },", i);
  return { start: open, end: close };
}

function currentNirf(src: string, slug: string): string {
  const { start, end } = block(src, slug);
  const m = src.slice(start, end).match(/\n\s+nirf: (\{[^}]*\}),/);
  return m ? m[1] : "(none)";
}

const lit = (o: Record<string, number | string>) => {
  const parts = CATS.filter((c) => o[c] !== undefined).map((c) => `${c}: ${typeof o[c] === "string" ? JSON.stringify(o[c]) : o[c]}`);
  return parts.length ? `{ ${parts.join(", ")} }` : "{}";
};

function rewrite(src: string, slug: string, now: Ranks, nowBands: Bands, prevYear: number, prev: Ranks, prevBands: Bands): string {
  const { start, end } = block(src, slug);
  let b = src.slice(start, end);
  b = b.replace(/\n\s+nirfBands: \{[^}]*\},/g, "").replace(/\n\s+nirfPrevious: \{.*\},/g, "");
  const lines = [`    nirf: ${lit(now)},`];
  if (Object.keys(nowBands).length) lines.push(`    nirfBands: ${lit(nowBands)},`);
  const prevParts = [`year: ${prevYear}`, `ranks: ${lit(prev)}`];
  if (Object.keys(prevBands).length) prevParts.push(`bands: ${lit(prevBands)}`);
  lines.push(`    nirfPrevious: { ${prevParts.join(", ")} },`);
  const re = /\n\s+nirf: \{[^}]*\},/;
  if (!re.test(b)) throw new Error(`${slug}: no nirf line`);
  b = b.replace(re, "\n" + lines.join("\n"));
  return src.slice(0, start) + b + src.slice(end);
}

// ── Main ─────────────────────────────────────────────────────────────────

async function main() {
  const apply = process.argv.includes("--apply");
  const yArg = process.argv.indexOf("--year");
  const home = await get(`${BASE}/`);
  const linked = [...new Set([...home.matchAll(/Rankings\/(\d{4})\//g)].map((m) => Number(m[1])))].sort((a, b) => b - a);
  const year = yArg > 0 ? Number(process.argv[yArg + 1]) : linked[0];
  if (!linked.includes(year)) throw new Error(`nirfindia.org home links ranking years ${linked.join(", ")} — ${year} is not among them. Stop.`);
  const prevYear = year - 1;
  console.log(`nirfindia.org home page links ranking years: ${linked.join(", ")}. Using ${year} (previous: ${prevYear}).`);
  try {
    await get(`${BASE}/Rankings/${year + 1}/Ranking.html`);
    console.log(`NOTE: ${BASE}/Rankings/${year + 1}/Ranking.html exists — a newer year may be published; re-run with --year ${year + 1}.`);
  } catch {
    console.log(`${BASE}/Rankings/${year + 1}/Ranking.html: not published (404).`);
  }

  const rows = [...(await readYear(year)), ...(await readYear(prevYear))];
  const pages = new Set(rows.map((r) => r.sourceUrl));
  console.log(`Read ${rows.length} table rows from ${pages.size} official pages.\n`);

  let src = readFileSync(DATA_FILE, "utf8");
  const slugs = [...src.matchAll(/\n\s+slug: "([^"]+)",/g)].map((m) => m[1]);
  const unmapped = slugs.filter((s) => !MATCH[s]);
  const stale = Object.keys(MATCH).filter((s) => !slugs.includes(s));
  if (unmapped.length || stale.length) throw new Error(`MATCH out of step with colleges-data.ts — unmapped: ${unmapped.join(", ") || "none"}; not in data: ${stale.join(", ") || "none"}`);

  const evidence: Record<string, { none?: string; rows: Row[] }> = {};
  let changed = 0;
  const summary: string[] = [];
  for (const slug of slugs) {
    const m = MATCH[slug];
    const before = currentNirf(src, slug);
    const picked: Row[] = [];
    if (m.inst) {
      const coded = rows.filter((r) => r.instituteId && instOf(r.instituteId) === m.inst);
      if (coded.length === 0) throw new Error(`${slug}: NIRF code ${m.inst} is in neither year's tables — check MATCH`);
      const names = new Set(coded.map((r) => `${norm(r.name)}|${norm(r.city)}`));
      const banded = rows.filter((r) => !r.instituteId && names.has(`${norm(r.name)}|${norm(r.city)}`));
      picked.push(...coded, ...banded);
    }
    const use = picked.filter((r) => !m.only || m.only.includes(r.category));
    const ranks = (y: number) => {
      const n: Ranks = {};
      const b: Bands = {};
      for (const r of use.filter((x) => x.year === y)) {
        if (/^\d+$/.test(r.rank)) {
          if (n[r.category] !== undefined && n[r.category] !== Number(r.rank)) throw new Error(`${slug}: two ${y} ${r.category} ranks`);
          n[r.category] = Number(r.rank);
        } else b[r.category] = r.rank;
      }
      return { n, b };
    };
    const now = ranks(year);
    const prev = ranks(prevYear);
    const after = lit(now.n);
    const next = rewrite(src, slug, now.n, now.b, prevYear, prev.n, prev.b);
    const diff = next !== src;
    if (diff) changed++;
    src = next;
    evidence[slug] = { ...(m.none ? { none: m.none } : {}), rows: use.sort((a, b) => b.year - a.year || CATS.indexOf(a.category) - CATS.indexOf(b.category)) };
    console.log(`${slug}${diff ? "" : "  (no change)"}`);
    console.log(`  before : nirf ${before}`);
    console.log(`  ${year}   : nirf ${after}${Object.keys(now.b).length ? `  bands ${lit(now.b)}` : ""}`);
    console.log(`  ${prevYear}   : ${lit(prev.n)}${Object.keys(prev.b).length ? `  bands ${lit(prev.b)}` : ""}`);
    if (m.none) console.log(`  no rank: ${m.none}`);
    if (m.only) console.log(`  sub-unit: parent's ${m.only.join("/")} rank only`);
    for (const r of evidence[slug].rows.filter((x) => x.year === year)) {
      console.log(`    ${r.year} ${PAGE[r.category]} ${r.rank} — ${r.instituteId ?? "(band page)"} "${r.name}", ${r.city} — ${r.sourceUrl}`);
    }
    summary.push(`${slug.padEnd(28)} ${before.padEnd(58)} → ${after}`);
  }

  src = src
    .replace(/export const NIRF_SOURCE_YEAR = \d{4};/, `export const NIRF_SOURCE_YEAR = ${year};`)
    .replace(/export const NIRF_PREVIOUS_YEAR = \d{4};/, `export const NIRF_PREVIOUS_YEAR = ${prevYear};`);
  const original = readFileSync(DATA_FILE, "utf8");
  console.log(`\n── Summary: ${slugs.length} colleges, ${changed} with a change ──`);
  for (const l of summary) console.log(l);
  const noRank = slugs.filter((s) => lit(ranks0(evidence[s].rows, year)) === "{}");
  console.log(`\nNo ${year} numeric rank (${noRank.length}): ${noRank.join(", ")}`);

  const evidenceJson =
    JSON.stringify(
      {
        note: "Every NIRF table row behind src/lib/colleges-data.ts nirf / nirfBands / nirfPrevious — read on nirfindia.org by scripts/import-nirf.ts.",
        year,
        previousYear: prevYear,
        pages: [...pages].sort(),
        colleges: evidence,
      },
      null,
      1,
    ) + "\n";
  let oldEvidence = "";
  try {
    oldEvidence = readFileSync(EVIDENCE_FILE, "utf8");
  } catch {}
  if (src === original && evidenceJson === oldEvidence) {
    console.log("\nAlready up to date — nothing to write.");
    return;
  }
  if (!apply) {
    console.log(`\nDry run — pass --apply to rewrite ${path.relative(ROOT, DATA_FILE)} and write ${path.relative(ROOT, EVIDENCE_FILE)}.`);
    return;
  }
  if (!/export const NIRF_PREVIOUS_YEAR = \d{4};/.test(src)) throw new Error("colleges-data.ts has no NIRF_PREVIOUS_YEAR constant — add it first.");
  writeFileSync(DATA_FILE, src);
  mkdirSync(path.dirname(EVIDENCE_FILE), { recursive: true });
  writeFileSync(EVIDENCE_FILE, evidenceJson);
  console.log(`\nWritten: ${path.relative(ROOT, DATA_FILE)} and ${path.relative(ROOT, EVIDENCE_FILE)}.`);
}

function ranks0(rows: Row[], year: number): Ranks {
  const n: Ranks = {};
  for (const r of rows) if (r.year === year && /^\d+$/.test(r.rank)) n[r.category] = Number(r.rank);
  return n;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
