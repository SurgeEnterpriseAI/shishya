// Hosts that are never an official source (13 Oct 2026).
//
// Two lists, read by every official-host rule (src/lib/official-source.ts
// isOfficialSource — the date tiers, news wording, crawlers and the
// answer-key watch; src/lib/official-domains.ts isOfficialUrl — Ask Shishya's
// source labels and the web-research fetcher's robots.txt choice;
// src/lib/official-papers.ts isOfficialHost — the official-paper importer).
// PURE: no imports, so the official-paper rules stay import-free.
// Tests: tests/unit/never-official-hosts.test.ts.
//
// ── Coaching companies and college blogs on academic domains ─────────────
// Why: ".ac.in" and ".edu.in" are meant for academic institutions, but some
// coaching companies hold names there, and the regulated-suffix rule passed
// every one of them as a conducting body. So a date or news item cited to a
// coaching page could be labelled OFFICIAL ("Compiled by Shishya from
// official notifications"), and the page fetchers skipped those sites'
// robots.txt, because "official" hosts are fetched without it. Found by the
// research review of 13 Oct 2026: 11 web-research rows filed official from
// aakash.ac.in / motion.ac.in (one a coaching "(expected)" guess), and
// allen.ac.in passing isOfficialUrl. In the DB on 13 Oct 2026
// (scripts/ai-eval/official-hosts-probe.ts, read-only): aakash.ac.in (WBJEE
// news, NSEJS dates), motion.ac.in (NSEA news, SOF IEO date), iimtu.edu.in
// (3 live NEET PG dates + 1 news item, all from a private university's blog
// post) and kccitm.edu.in (CUET UG / CAT, a private college's pages).
//
// A host on this list is still a source: its rows stay "reported" with a
// "Source" link, like any coaching or news site on a .com (founder decision,
// 26 Sep 2026: nothing is blocked, only labelled). Real conducting bodies on
// the same suffixes stay official (nta.ac.in, jeeadv.ac.in,
// gate2027.iitm.ac.in, iimcat.ac.in, natboard.edu.in,
// olympiads.hbcse.tifr.res.in …): only the listed hosts and their
// subdomains are refused, never a whole suffix. Each entry was checked
// against the site's own home page on 13 Oct 2026; add one on evidence.
//
// ── Our own site ──────────────────────────────────────────────────────────
// Why: shishya.in prints what our own generator and checks wrote earlier, so
// a date or news item "cited" to it is our own claim coming back — circular:
// neither official nor an independent report. The research review of 13 Oct
// 2026 found the web-research harness reading shishya.in/exams/SOF_IMO/updates
// as evidence (3 rows), and the DB holds a CDS result row and a CDS news item
// cited to shishya.in/exams/CDS/updates (both archived). official-source.ts
// treats it like a denylisted host (tier "expected", the link never offered
// as a source). Preview deploys (shishya-*.vercel.app) count as our site.

export const NEVER_OFFICIAL_HOSTS: readonly string[] = [
  // coaching institutes on .ac.in
  "aakash.ac.in", // Aakash Educational Services (NEET / JEE coaching)
  "allen.ac.in", // ALLEN Career Institute, Kota
  "motion.ac.in", // Motion Education, Kota
  "resonance.ac.in", // Resonance Eduventures, Kota
  "careerpoint.ac.in", // Career Point, Kota
  "bansal.ac.in", // Bansal Classes, Kota
  "srichaitanya.ac.in", // Sri Chaitanya (school chain and JEE / NEET coaching)
  // private colleges' admission blogs about exams other bodies conduct
  "iimtu.edu.in", // IIMT University blog (NEET PG)
  "kccitm.edu.in", // KCC Institute (CUET UG, CAT)
  "krmangalam.edu.in", // K.R. Mangalam University blog (CTET)
];

export const SELF_HOSTS: readonly string[] = ["shishya.in"];
const SELF_PREVIEW_RE = /^shishya[a-z0-9-]*\.vercel\.app$/;

/** Lower-case host without "www." or a trailing dot; null for anything that
 *  is not an http(s) URL. */
function hostOf(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  } catch {
    return null;
  }
}

const onDomain = (host: string, domain: string) => host === domain || host.endsWith(`.${domain}`);

/** True when `url` is on our own site (shishya.in, a subdomain, or a preview deploy). */
export function isSelfSource(url: string | null | undefined): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return SELF_HOSTS.some((d) => onDomain(host, d)) || SELF_PREVIEW_RE.test(host);
}

/** True when `url` is never an official source: a listed coaching /
 *  college-blog host (or a subdomain of one), or our own site. A look-alike
 *  that merely contains a listed name ("notallen.ac.in",
 *  "allen.ac.in.example.com") is not on the list. */
export function isNeverOfficial(url: string | null | undefined): boolean {
  const host = hostOf(url);
  if (!host) return false;
  return isSelfSource(url) || NEVER_OFFICIAL_HOSTS.some((d) => onDomain(host, d));
}
