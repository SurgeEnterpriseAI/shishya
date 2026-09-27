// Sign-up wall EXPERIMENT on the pages search visitors leave after one page
// (27 Sep 2026, founder: "show the first lines, blur the rest, ask them to
// sign up free — and see how many convert").
//
// Where: exam updates, cutoff, current-affairs capsule + daily page,
// scholarship and career pages — the families that lost 71–93% of landers
// after one page in the 13–26 Sep read (src/lib/landing-actions.ts). The
// answer at the top and "Next on Shishya" stay open; below them, a few lines
// show and the rest is blurred behind a free sign-in card.
//
// Who: signed-out visitors only, never a crawler (their HTML is always the
// full page; the page carries the standard registration-wall markup, so the
// content is not hidden from search engines), never a child school page.
// HALF of those visitors (bucket "wall"), the other half see the open page
// (bucket "open") — the only way to know what the wall adds in sign-ups and
// what it costs in people leaving. The bucket is kept in this browser
// (localStorage), so a person stays in one arm. No bucket = open.
//
// Read: scripts/tmp-softwall-read.ts compares the arms (exposures, sign-in
// clicks, sign-ups joined by the SIGNUP event's anonId, pages per visit).
// Pure: rules, bucket, copy.

export const SOFT_WALL_KEY = "shishya_wall_ab_v1";
export type WallBucket = "wall" | "open";

/** Page families in the experiment. */
export function softWallFamily(path: string | null | undefined): string | null {
  if (typeof path !== "string") return null;
  const p = path.split(/[?#]/)[0].replace(/^\/(hi|te)(?=\/)/, "");
  if (/^\/exams\/[A-Z0-9_]+\/updates$/.test(p)) return "exam-updates";
  if (/^\/exams\/[A-Z0-9_]+\/cutoff$/.test(p)) return "exam-cutoff";
  if (/^\/current-affairs\/capsule\/[0-9]{4}-[0-9]{2}$/.test(p)) return "ca-capsule";
  if (/^\/current-affairs\/[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(p)) return "ca-daily";
  if (/^\/scholarships\/[a-z0-9-]+$/.test(p) && !/^\/scholarships\/(match|closing-soon|for)$/.test(p)) return "scholarship";
  if (/^\/careers\/[a-z0-9-]+$/.test(p)) return "career";
  return null;
}

/** The stored arm, or a fresh 50/50 draw (stored). Storage refused → "open". */
export function readOrAssignBucket(storage: Pick<Storage, "getItem" | "setItem"> | null, rand: () => number = Math.random): WallBucket {
  try {
    if (!storage) return "open";
    const v = storage.getItem(SOFT_WALL_KEY);
    if (v === "wall" || v === "open") return v;
    const b: WallBucket = rand() < 0.5 ? "wall" : "open";
    storage.setItem(SOFT_WALL_KEY, b);
    return storage.getItem(SOFT_WALL_KEY) === b ? b : "open";
  } catch {
    return "open";
  }
}

export interface SoftWallCopy {
  title: string;
  body: string;
}

const COPY: Record<"en" | "hi" | "te", SoftWallCopy> = {
  en: {
    title: "Read the rest of this page — free",
    body: "Sign in free with Google to read the full page. Shishya then remembers you: your exams, weak topics, saved results and a personal plan.",
  },
  hi: {
    title: "इस पेज का बाकी हिस्सा पढ़ें — मुफ़्त",
    body: "पूरा पेज पढ़ने के लिए Google से मुफ़्त साइन इन करें। Shishya आपको याद रखेगा: आपकी परीक्षाएँ, कमज़ोर टॉपिक, सेव परिणाम और आपका प्लान।",
  },
  te: {
    title: "ఈ పేజీలో మిగతా భాగం చదవండి — ఉచితం",
    body: "పూర్తి పేజీ చదవడానికి Google తో ఉచితంగా సైన్ ఇన్ చేయండి. Shishya మిమ్మల్ని గుర్తుంచుకుంటుంది: మీ పరీక్షలు, బలహీన టాపిక్‌లు, సేవ్ అయిన ఫలితాలు, మీ ప్లాన్.",
  },
};

export function softWallCopy(locale: string | null | undefined): SoftWallCopy {
  return locale === "hi" ? COPY.hi : locale === "te" ? COPY.te : COPY.en;
}

/** Registration-wall markup (schema.org): the gated part is marked, the HTML
 *  always carries the full text — what search engines expect of a wall. */
export const SOFT_WALL_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  isAccessibleForFree: false,
  hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".shishya-wall" },
} as const;
