// /share/[id] — the WhatsApp landing, in the visitor's language (16 Sep
// 2026 — i18n.11).
//
// /share is not a locale twin, so there is no URL locale to read. The page
// asks getLocale() — the same call its <Header /> and the quiz it links to
// make (shishya-lang cookie → User.preferredLang) — so the three never
// disagree. A friend with NO language of their own (first visit, signed out:
// the person a share is meant to reach) gets the language the message was
// written in: the share link carries ?lang=hi|te (shareLandingPath), the
// same hand-off /c/[token] makes from the challenger's stored locale. The
// visitor's own choice always beats the link.
//
// The page's <title>, description and OG card stay English on purpose: the
// preview is rendered for the social crawler, which carries no cookie and
// no account, and the page is noindex, so a translated title would never be
// seen by anyone. Only the body follows the visitor.
//
// Honesty, unchanged in every language: no score is shown unless the sharer
// has a name on their account (a bare "a student scored 72%" reads as
// synthetic social proof), and "no sign-in" describes the 5-question quiz,
// nothing else.
//
// Product names stay in Latin script: Shishya.

import { asCopyLocale, pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

export interface ShareLandingCopy {
  /** Headline around the score span: "{name} scored " + <score>. */
  scoredBefore: string;
  scoredAfter: string;
  /** "on a " + <exam link> + " mock at Shishya" */
  onMockBefore: string;
  onMockAfter: string;
  /** "A friend sent you a " + <exam link> + " mock" */
  sentBefore: string;
  sentAfter: string;
  fromShishya: string;
  freeNoSignIn: string;
  ctaHeadingScore: string;
  ctaHeadingPlain: string;
  ctaSub: string;
  ctaButton: string;
  fineprint: string;
  exploreCount: string;
  exploreAll: string;
}

const SHARE_LANDING: Readonly<Record<CopyLocale, ShareLandingCopy>> = {
  en: {
    scoredBefore: "{name} scored ",
    scoredAfter: "",
    onMockBefore: "on a ",
    onMockAfter: " mock at Shishya",
    sentBefore: "A friend sent you a ",
    sentAfter: " mock",
    fromShishya: "from Shishya — free mocks, previous-year papers and exam dates for {exam}",
    freeNoSignIn: "Free · no sign-in",
    ctaHeadingScore: "Your friend scored {score} — check your own 5 questions",
    ctaHeadingPlain: "Check your own 5 {exam} questions",
    ctaSub: "About 90 seconds: 5 {exam}-level questions, graded instantly, with the answers. No account, no app.",
    ctaButton: "Try 5 {exam} questions — no sign-in →",
    fineprint: "Free · No credit card · {n} languages",
    exploreCount: "Explore all {n} exams →",
    exploreAll: "Explore all exams →",
  },
  hi: {
    scoredBefore: "{name} ने ",
    scoredAfter: " स्कोर किया",
    onMockBefore: "Shishya पर ",
    onMockAfter: " मॉक में",
    sentBefore: "एक दोस्त ने आपको ",
    sentAfter: " मॉक भेजा है",
    fromShishya: "Shishya से — {exam} के लिए मुफ़्त मॉक, पिछले साल के पेपर और परीक्षा तिथियाँ",
    freeNoSignIn: "मुफ़्त · बिना साइन-इन",
    ctaHeadingScore: "आपके दोस्त ने {score} स्कोर किया — अपने 5 सवाल आज़माएँ",
    ctaHeadingPlain: "अपने 5 {exam} सवाल आज़माएँ",
    ctaSub: "करीब 90 सेकंड: {exam} स्तर के 5 सवाल, तुरंत जाँच और जवाब के साथ। कोई खाता नहीं, कोई ऐप नहीं।",
    ctaButton: "{exam} के 5 सवाल आज़माएँ — बिना साइन-इन →",
    fineprint: "मुफ़्त · कोई क्रेडिट कार्ड नहीं · {n} भाषाएँ",
    exploreCount: "सभी {n} परीक्षाएँ देखें →",
    exploreAll: "सभी परीक्षाएँ देखें →",
  },
  te: {
    scoredBefore: "{name} ",
    scoredAfter: " స్కోరు చేశారు",
    onMockBefore: "Shishya లో ",
    onMockAfter: " మాక్‌లో",
    sentBefore: "ఒక స్నేహితుడు మీకు ",
    sentAfter: " మాక్ పంపారు",
    fromShishya: "Shishya నుండి — {exam} కోసం ఉచిత మాక్‌లు, గత సంవత్సరాల ప్రశ్నపత్రాలు, పరీక్ష తేదీలు",
    freeNoSignIn: "ఉచితం · సైన్-ఇన్ అవసరం లేదు",
    ctaHeadingScore: "మీ స్నేహితుడు {score} స్కోరు చేశారు — మీ సొంత 5 ప్రశ్నలు చూసుకోండి",
    ctaHeadingPlain: "మీ సొంత 5 {exam} ప్రశ్నలు చూసుకోండి",
    ctaSub:
      "సుమారు 90 సెకన్లు: {exam} స్థాయి 5 ప్రశ్నలు, వెంటనే మూల్యాంకనం, జవాబులతో. ఖాతా అవసరం లేదు, యాప్ అవసరం లేదు.",
    ctaButton: "{exam} 5 ప్రశ్నలు ప్రయత్నించండి — సైన్-ఇన్ లేకుండా →",
    fineprint: "ఉచితం · క్రెడిట్ కార్డ్ అవసరం లేదు · {n} భాషలు",
    exploreCount: "అన్ని {n} పరీక్షలు చూడండి →",
    exploreAll: "అన్ని పరీక్షలు చూడండి →",
  },
};

export function shareLandingCopy(locale: string | null | undefined): ShareLandingCopy {
  return pickCopy(SHARE_LANDING, locale);
}

// ── The link carries the language of the message (16 Sep 2026, review) ───
//
// A Hindi WhatsApp line that opens an English page is a worse hand-off than
// the all-English one it replaced. Pure helpers, shared by the results
// page's share button (client) and the landing (server).

export const SHARE_LANG_PARAM = "lang";

/** Site-relative path of the landing for a message written in `locale`.
 *  English — and every locale we have no words for — is the bare path,
 *  byte-identical to the link before this wave. */
export function shareLandingPath(attemptId: string, locale: string | null | undefined): string {
  const lang = asCopyLocale(locale);
  return lang === "en" ? `/share/${attemptId}` : `/share/${attemptId}?${SHARE_LANG_PARAM}=${lang}`;
}

/** ?lang= read back: "hi" or "te"; anything else (absent, "en", garbage) is
 *  null, so a hand-edited link can only ever pick a language we have. */
export function shareLinkLocale(v: string | string[] | undefined): CopyLocale | null {
  const one = Array.isArray(v) ? v[0] : v;
  return one === "hi" || one === "te" ? one : null;
}

/** The landing's language. `own` is getLocale()'s answer, which is "en" both
 *  for "chose English" and for "no signal" — the cookie tells them apart,
 *  because every explicit English choice writes shishya-lang=en
 *  (src/lib/preferred-lang.ts). Only a visitor with no signal follows the
 *  link. */
export function resolveShareLandingLocale(p: {
  own: string;
  cookie: string | null | undefined;
  link: CopyLocale | null;
}): string {
  if (p.own !== "en") return p.own;
  if (p.cookie === "en") return "en";
  return p.link ?? "en";
}

/** The quiz CTA. In hi/te it points at the quiz's own /hi|/te twin: the
 *  middleware renders that URL in that language and, when the friend has no
 *  language cookie yet, sets it — so the quiz and the clicks after it stay in
 *  the language of the message. English is the plain path, as before. */
export function shareQuizPath(examCode: string, locale: string | null | undefined): string {
  const lang = asCopyLocale(locale);
  return lang === "en" ? `/exams/${examCode}/quiz` : `/${lang}/exams/${examCode}/quiz`;
}
