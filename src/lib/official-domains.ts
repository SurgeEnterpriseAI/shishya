// Official vs other sources for Ask Shishya's answers (26 Sep 2026).
//
// Founder decision, 26 Sep 2026: "no need to block, keep as many official
// sources whatever you get as possible". So nothing here blocks a domain: an
// aggregator, coaching or news site stays in the answer, labelled "Other
// source" and ordered after the official ones. What this file decides is only
// the LABEL and the ORDER:
//   * official — a regulated government / academic domain (every host
//     src/lib/official-source.ts isOfficialSource accepts: gov.in, nic.in,
//     ac.in, res.in, edu.in, mil.in and its named bodies), the foreign
//     equivalents a study-abroad answer cites (.gov, .edu, .ac.uk, .edu.au …),
//     the conducting bodies, boards and test owners that sit on commercial
//     domains (CISCE on cisce.org, ICAI on icai.org, ETS on ets.org …), and
//     any official URL a tool of this run returned (the exam's own portal
//     from ExamEligibility.officialUrl);
//   * other — everything else, kept.
// Why a separate file, not official-source.ts: that file decides the date
// TIER (the gold "official" badge, schema.org Event data) for every tracker
// surface; widening it would re-tier stored dates site-wide. This one only
// labels the sources of an AI answer, and asks official-source.ts first so
// the two never disagree about a host it knows.
// PURE: no DB, no model. Tests: tests/unit/official-domains.test.ts.

import { isOfficialSource } from "@/lib/official-source";
import { normUrl, urlsIn, type WebSource } from "@/lib/ask-links";

type Locale = "en" | "hi" | "te";

/** Restricted foreign government / academic suffixes (study-abroad answers cite universities and visa offices). */
const FOREIGN_OFFICIAL_SUFFIXES = ["gov", "edu", "mil", "gov.uk", "ac.uk", "gov.au", "edu.au", "govt.nz", "ac.nz", "gc.ca", "canada.ca", "gov.sg", "edu.sg", "go.jp", "ac.jp", "europa.eu"];

/** RBI's restricted domain for banks (sbi.bank.in and the rest): a bank's own recruitment notice. */
const INDIAN_EXTRA_SUFFIXES = ["bank.in"];

/**
 * Official bodies by host (a subdomain counts: exams.nta.ac.in → NTA). The
 * name is what the /ask panel may print beside the link. Hosts on
 * gov.in / nic.in / ac.in are official without being listed; they are here
 * only for their name.
 */
export const OFFICIAL_BODIES: Readonly<Record<string, string>> = {
  // Recruitment and entrance-exam bodies
  "upsc.gov.in": "UPSC",
  "ssc.gov.in": "Staff Selection Commission (SSC)",
  "ssc.nic.in": "Staff Selection Commission (SSC)",
  "nta.ac.in": "National Testing Agency (NTA)",
  "nta.nic.in": "National Testing Agency (NTA)",
  "ibps.in": "IBPS",
  "rbi.org.in": "Reserve Bank of India",
  "sbi.co.in": "State Bank of India",
  "sbi.bank.in": "State Bank of India",
  "indianrailways.gov.in": "Indian Railways",
  "rrbcdg.gov.in": "Railway Recruitment Boards",
  "rrbapply.gov.in": "Railway Recruitment Boards",
  "joinindianarmy.nic.in": "Indian Army",
  "joinindiannavy.gov.in": "Indian Navy",
  "indianairforce.nic.in": "Indian Air Force",
  "cdac.in": "C-DAC",
  "isro.gov.in": "ISRO",
  "tgprb.in": "Telangana State Level Police Recruitment Board",
  "iimcat.ac.in": "CAT (IIMs)",
  "consortiumofnlus.ac.in": "Consortium of NLUs (CLAT)",
  "josaa.nic.in": "JoSAA",
  "mcc.nic.in": "Medical Counselling Committee (MCC)",
  "nmc.org.in": "National Medical Commission",
  "icai.org": "ICAI",
  "icsi.edu": "ICSI",
  "icmai.in": "ICMAI",
  "barcouncilofindia.org": "Bar Council of India",
  "comedk.org": "COMEDK",
  "bitsadmission.com": "BITS Pilani admissions",
  "snaptest.org": "Symbiosis (SNAP)",
  "mahacet.org": "Maharashtra State CET Cell",
  "licindia.in": "LIC",
  "newindia.co.in": "New India Assurance",
  "nabard.org": "NABARD",
  "sidbi.in": "SIDBI",
  "ntpc.co.in": "NTPC",
  "ongcindia.com": "ONGC",
  "iocl.com": "Indian Oil",
  "bhel.com": "BHEL",
  "sail.co.in": "SAIL",
  "coalindia.in": "Coal India",
  "powergrid.in": "POWERGRID",
  "hal-india.co.in": "HAL",
  "bel-india.in": "BEL",
  "aai.aero": "Airports Authority of India",
  // Boards, ministries and regulators
  "cbse.gov.in": "CBSE",
  "cbseacademic.nic.in": "CBSE",
  "ncert.nic.in": "NCERT",
  "cisce.org": "CISCE",
  "nios.ac.in": "NIOS",
  "mahahsscboard.in": "Maharashtra State Board",
  "gseb.org": "Gujarat Secondary and Higher Secondary Education Board",
  "hpbose.org": "HP Board of School Education",
  "education.gov.in": "Ministry of Education",
  "ugc.gov.in": "UGC",
  "ugc.ac.in": "UGC",
  "aicte-india.org": "AICTE",
  "aicte.gov.in": "AICTE",
  "nirfindia.org": "NIRF (Ministry of Education)",
  "scholarships.gov.in": "National Scholarship Portal",
  "mygov.in": "MyGov (Government of India)",
  "india.gov.in": "National Portal of India",
  "pib.gov.in": "Press Information Bureau",
  // Study-abroad test owners
  "ielts.org": "IELTS",
  "ets.org": "ETS (TOEFL / GRE)",
  "pearsonpte.com": "Pearson PTE",
  "mba.com": "GMAC (GMAT)",
  "gmac.com": "GMAC",
  "britishcouncil.org": "British Council",
  "britishcouncil.in": "British Council",
  "cambridgeenglish.org": "Cambridge English",
  "englishtest.duolingo.com": "Duolingo English Test",
  "collegeboard.org": "College Board (SAT)",
  "act.org": "ACT",
};

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

/** The listed body a host belongs to (the longest matching key wins), else null. */
function bodyKey(host: string): string | null {
  let best: string | null = null;
  for (const k of Object.keys(OFFICIAL_BODIES)) if (onDomain(host, k) && (!best || k.length > best.length)) best = k;
  return best;
}

/**
 * True when the URL is an official source: a regulated government / academic
 * domain, a listed body, or on the host of an official URL a tool of this run
 * returned (`toolOfficial` — e.g. get_exam_details' official portal).
 */
export function isOfficialUrl(url: string | null | undefined, toolOfficial: Iterable<string> = []): boolean {
  const host = hostOf(url);
  if (!host) return false;
  if (isOfficialSource(url)) return true;
  if ([...FOREIGN_OFFICIAL_SUFFIXES, ...INDIAN_EXTRA_SUFFIXES].some((s) => onDomain(host, s))) return true;
  if (bodyKey(host)) return true;
  for (const o of toolOfficial) if (isOfficialSource(url, o)) return true;
  return false;
}

/** The name to print for a source: the listed body, else the bare host ("ssc.gov.in" → "Staff Selection Commission (SSC)", "jagranjosh.com" → "jagranjosh.com"). */
export function sourceName(url: string): string {
  const host = hostOf(url);
  if (!host) return url.replace(/^https?:\/\//i, "").split(/[/?#]/)[0];
  const k = bodyKey(host);
  return k ? OFFICIAL_BODIES[k] : host;
}

const TAG: Readonly<Record<Locale, { official: string; other: string }>> = {
  en: { official: "Official", other: "Other source" },
  hi: { official: "आधिकारिक", other: "अन्य स्रोत" },
  te: { official: "అధికారిక", other: "ఇతర మూలం" },
};

/** "Official" / "Other source" in the answer's language (the words the prompt asks the model to use). */
export function sourceTag(official: boolean, locale: Locale = "en"): string {
  const t = TAG[locale] ?? TAG.en;
  return official ? t.official : t.other;
}

export interface LabelledSource extends WebSource {
  /** On an official domain (see the header). */
  official: boolean;
  /** The body's name, or the bare host for any other site. */
  source: string;
}

/** One source with its official flag and printable source name. */
export function labelSource(s: WebSource, toolOfficial: Iterable<string> = []): LabelledSource {
  return { title: s.title, url: s.url, official: isOfficialUrl(s.url, toolOfficial), source: sourceName(s.url) };
}

/**
 * The answer's sources for the /ask panel: every one kept (nothing blocked),
 * duplicates dropped, official ones first, each group in the order the answer
 * gave them. With `max`, the cap falls on the other sources first, so an
 * official source is never dropped while an aggregator stays.
 */
export function rankSources(sources: readonly WebSource[], opts: { toolOfficial?: Iterable<string>; max?: number } = {}): LabelledSource[] {
  const toolOfficial = [...(opts.toolOfficial ?? [])];
  const seen = new Set<string>();
  const official: LabelledSource[] = [];
  const other: LabelledSource[] = [];
  for (const s of sources) {
    if (!s || typeof s.url !== "string" || !/^https?:\/\//i.test(s.url)) continue;
    const k = normUrl(s.url);
    if (seen.has(k)) continue;
    seen.add(k);
    const l = labelSource(s, toolOfficial);
    (l.official ? official : other).push(l);
  }
  const all = [...official, ...other];
  return opts.max != null && opts.max >= 0 ? all.slice(0, opts.max) : all;
}

/**
 * The official URLs inside a tool result (26 Sep 2026, fixer): every URL under
 * a key that starts with "official" — get_exam_details' `official` (the
 * exam's portal from ExamEligibility.officialUrl), page_facts' officialBooks /
 * officialChapterPdf / officialSyllabus / officialSite / officialWebsite /
 * visa.officialUrl. They are `toolOfficial` for isOfficialUrl and rankSources:
 * a conducting body's portal on a commercial domain counts as official.
 */
export function officialUrlsIn(value: unknown): string[] {
  const out = new Set<string>();
  const walk = (v: unknown, official: boolean, depth: number) => {
    if (v == null || depth > 8) return;
    if (typeof v === "string") {
      if (official) for (const u of urlsIn(v)) out.add(u);
    } else if (Array.isArray(v)) {
      for (const x of v) walk(x, official, depth + 1);
    } else if (typeof v === "object") {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, official || /^official/i.test(k), depth + 1);
    }
  };
  walk(value, false, 0);
  return [...out];
}

const MD_LINK = /\[([^\]\n]*)\]\(\s*<?((?:[^()\s<>]|\([^()\s<>]*\))+)>?\s*\)/g;
/** "Official — <body>", "Official: <body>", "Official source — …" (en / hi / te), the label rule 7 of the prompt asks for. */
const OFFICIAL_LABEL = /^\s*(official|आधिकारिक|అధికారిక)(?:\s+(?:source|site|website|portal|स्रोत|वेबसाइट|మూలం|వెబ్‌సైట్))?\s*(?:[—–:-]\s*[\s\S]*)?$/i;
const SHISHYA = /^https?:\/\/(?:www\.)?shishya\.in(?=[/?#]|$)/i;

/**
 * The model's "Official" claims, checked (26 Sep 2026, fixer): a markdown
 * link labelled as the prompt's rule 7 says — "[Official — Staff Selection
 * Commission](url)" — whose URL is NOT an official source (isOfficialUrl,
 * with this run's tool portals) is relabelled "[Other source — <site>](url)"
 * in the label's language. The link itself stays (nothing is blocked); only
 * the false claim goes. Official links, other labels and Shishya links are
 * left exactly as written.
 */
export function relabelOfficialClaims(md: string, toolOfficial: Iterable<string> = []): string {
  const tools = [...toolOfficial];
  return String(md ?? "").replace(MD_LINK, (whole: string, label: string, url: string) => {
    const m = OFFICIAL_LABEL.exec(label);
    if (!m || !/^https?:\/\//i.test(url) || SHISHYA.test(url)) return whole;
    if (isOfficialUrl(url, tools)) return whole;
    const lang: Locale = /[ऀ-ॿ]/.test(m[1]) ? "hi" : /[ఀ-౿]/.test(m[1]) ? "te" : "en";
    return `[${sourceTag(false, lang)} — ${sourceName(url)}](${url})`;
  });
}
