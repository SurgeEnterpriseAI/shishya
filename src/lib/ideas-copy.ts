// /ideas, its cards and the dashboard's "you asked, we built" block in the
// student's language (16 Sep 2026 — i18n.6).
//
// The board is not a /hi or /te twin, so its locale comes from getT() (the
// shishya-lang cookie or User.preferredLang); the page's <title> and
// description stay English and the area chips keep their English values,
// which are also the ?area= query values and the words the suggestion
// widget shows. The status chip (Open / Under review / Planned / Built) and
// the "marked built without a note" line ARE translated: they state the
// stored status and nothing more, in every language.
//
// Honesty, unchanged in every language (src/lib/feature-requests.ts is the
// rule): the date is the day the team MARKED an idea built, never a claim
// that it went live that day and never a claim that it was built BECAUSE
// the student asked. "Marked built" keeps its hedge in hi and te.
//
// Product names stay in Latin script: Shishya.

import { fillTemplate } from "@/lib/i18n";
import {
  BUILT_WITHOUT_RECORD_LINE,
  PUBLIC_STATUS_LABEL,
  builtForYouHeading,
  builtForYouShareMessage,
  formatShipDate,
  isFeatureRequestStatus,
  markedBuiltLabel,
  type FeatureRequestStatusValue,
  type ShipRole,
} from "@/lib/feature-requests";
import { asCopyLocale, pickCopy, type CopyLocale } from "@/lib/ui-locale-copy";

export interface IdeasPageCopy {
  home: string;
  crumb: string;
  h1: string;
  /** The intro is split around the literal pill label, which stays English
   *  because that is what the widget on every page actually shows. */
  introBefore: string;
  pill: string;
  introAfter: string;
  all: string;
  emptyBoard: string;
  builtHeading: string;
  builtNote: string;
  openHeading: string;
  upvoteHint: string;
  upvoteHintSignedOut: string;
  emptyOpen: string;
  /** "{built} built · {open} open shown." */
  footer: string;
  /** The status chip on a card — exactly the stored state, nothing promised
   *  (PUBLIC_STATUS_LABEL is the English source). */
  statusOpen: string;
  statusUnderReview: string;
  statusPlanned: string;
  statusBuilt: string;
  statusDeclined: string;
  /** A built idea with no ship record (BUILT_WITHOUT_RECORD_LINE). */
  noRecord: string;
}

const IDEAS_PAGE: Readonly<Record<CopyLocale, IdeasPageCopy>> = {
  en: {
    home: "Home",
    crumb: "Ideas",
    h1: "Ideas board",
    introBefore:
      "What students asked us to build — what is built so far, and what is still open. Upvote the open ones you want next, or click the ",
    pill: "💡 Suggest a feature",
    introAfter: " pill on any page to add your own.",
    all: "All",
    emptyBoard:
      "No ideas in this area yet. Be the first to suggest one — click the pill at the bottom-right of any page.",
    builtHeading: "Built",
    builtNote:
      "Ideas the Shishya team has marked built. The date is the day it was marked, not necessarily the day it went live.",
    openHeading: "Still open",
    upvoteHint: "Upvote the ones you want built next.",
    upvoteHintSignedOut: "Sign in to upvote the ones you want built next.",
    emptyOpen: "No open ideas in this area. Suggest one from the pill at the bottom-right of any page.",
    footer: "{built} built · {open} open shown.",
    statusOpen: "Open",
    statusUnderReview: "Under review",
    statusPlanned: "Planned",
    statusBuilt: "Built",
    statusDeclined: "Declined",
    noRecord: "Marked built without a note — no description or link yet.",
  },
  hi: {
    home: "होम",
    crumb: "आइडिया",
    h1: "आइडिया बोर्ड",
    introBefore:
      "छात्रों ने हमसे क्या बनाने को कहा — अब तक क्या बन चुका है और क्या अब भी खुला है। जो खुले आइडिया आप अगला चाहते हैं उन्हें अपवोट करें, या अपना आइडिया जोड़ने के लिए किसी भी पेज पर ",
    pill: "💡 Suggest a feature",
    introAfter: " पिल पर क्लिक करें।",
    all: "सभी",
    emptyBoard:
      "इस क्षेत्र में अभी कोई आइडिया नहीं है। पहला सुझाव आपका हो — किसी भी पेज पर नीचे-दाईं ओर दिए पिल पर क्लिक करें।",
    builtHeading: "बन चुके",
    builtNote:
      "जिन आइडिया को Shishya टीम ने 'बन चुका' चिह्नित किया है। तारीख वह दिन है जब इसे चिह्नित किया गया, ज़रूरी नहीं कि उसी दिन यह लाइव हुआ हो।",
    openHeading: "अब भी खुले",
    upvoteHint: "जो आप अगला बनवाना चाहते हैं उन्हें अपवोट करें।",
    upvoteHintSignedOut: "जो आप अगला बनवाना चाहते हैं उन्हें अपवोट करने के लिए साइन इन करें।",
    emptyOpen: "इस क्षेत्र में कोई खुला आइडिया नहीं है। किसी भी पेज पर नीचे-दाईं ओर दिए पिल से सुझाव दें।",
    footer: "{built} बन चुके · {open} खुले दिखाए गए।",
    statusOpen: "खुला",
    statusUnderReview: "समीक्षा में",
    statusPlanned: "योजना में",
    statusBuilt: "बन चुका",
    statusDeclined: "अस्वीकृत",
    noRecord: "बिना नोट के 'बन चुका' चिह्नित — अभी कोई विवरण या लिंक नहीं है।",
  },
  te: {
    home: "హోమ్",
    crumb: "ఐడియాలు",
    h1: "ఐడియా బోర్డ్",
    introBefore:
      "విద్యార్థులు మమ్మల్ని ఏం చేయమని అడిగారు — ఇప్పటివరకు ఏం పూర్తయింది, ఇంకా ఏం మిగిలి ఉంది. మీకు తర్వాత కావాల్సిన ఓపెన్ ఐడియాలకు అప్‌వోట్ చేయండి, లేదా మీ సొంత ఐడియా జోడించడానికి ఏ పేజీలోనైనా ",
    pill: "💡 Suggest a feature",
    introAfter: " పిల్‌పై క్లిక్ చేయండి.",
    all: "అన్నీ",
    emptyBoard:
      "ఈ విభాగంలో ఇంకా ఏ ఐడియా లేదు. మొదటి సూచన మీదే అవ్వండి — ఏ పేజీలోనైనా కింద కుడి వైపు ఉన్న పిల్‌పై క్లిక్ చేయండి.",
    builtHeading: "పూర్తయినవి",
    builtNote:
      "Shishya టీమ్ 'పూర్తయింది' అని గుర్తించిన ఐడియాలు. ఇక్కడి తేదీ గుర్తించిన రోజు, అది లైవ్‌కి వచ్చిన రోజు కాకపోవచ్చు.",
    openHeading: "ఇంకా ఓపెన్‌లో",
    upvoteHint: "తర్వాత ఏది కావాలో వాటికి అప్‌వోట్ చేయండి.",
    upvoteHintSignedOut: "తర్వాత ఏది కావాలో వాటికి అప్‌వోట్ చేయడానికి సైన్ ఇన్ చేయండి.",
    emptyOpen: "ఈ విభాగంలో ఓపెన్ ఐడియాలు లేవు. ఏ పేజీలోనైనా కింద కుడి వైపు ఉన్న పిల్ ద్వారా సూచించండి.",
    footer: "{built} పూర్తయినవి · {open} ఓపెన్‌వి చూపబడ్డాయి.",
    statusOpen: "ఓపెన్",
    statusUnderReview: "సమీక్షలో ఉంది",
    statusPlanned: "ప్రణాళికలో ఉంది",
    statusBuilt: "పూర్తయింది",
    statusDeclined: "తిరస్కరించబడింది",
    noRecord: "నోట్ లేకుండా 'పూర్తయింది' అని గుర్తించారు — ఇంకా వివరణ లేదా లింక్ లేదు.",
  },
};

export function ideasPageCopy(locale: string | null | undefined): IdeasPageCopy {
  return pickCopy(IDEAS_PAGE, locale);
}

const STATUS_KEY: Readonly<Record<FeatureRequestStatusValue, keyof IdeasPageCopy>> = {
  OPEN: "statusOpen",
  UNDER_REVIEW: "statusUnderReview",
  PLANNED: "statusPlanned",
  SHIPPED: "statusBuilt",
  DECLINED: "statusDeclined",
};

/** The card's status chip. English reads PUBLIC_STATUS_LABEL itself, so the
 *  two can never drift; an unknown stored value shows as Open, as before. */
export function ideaStatusLabelFor(locale: string | null | undefined, status: string): string {
  const s: FeatureRequestStatusValue = isFeatureRequestStatus(status) ? status : "OPEN";
  if (asCopyLocale(locale) === "en") return PUBLIC_STATUS_LABEL[s];
  return ideasPageCopy(locale)[STATUS_KEY[s]];
}

/** BUILT_WITHOUT_RECORD_LINE in the reader's language. English delegates. */
export function builtWithoutRecordFor(locale: string | null | undefined): string {
  if (asCopyLocale(locale) === "en") return BUILT_WITHOUT_RECORD_LINE;
  return ideasPageCopy(locale).noRecord;
}

/** Plain strings for IdeaCard, a client island. */
export interface IdeaCardCopy {
  votingClosed: string;
  /** "{n} upvote, voting closed" / "{n} upvotes, voting closed" */
  votesClosedOne: string;
  votesClosedMany: string;
  removeUpvote: string;
  upvoteThis: string;
  signInToUpvote: string;
  showMore: string;
  showLess: string;
  whatWeBuilt: string;
  openIt: string;
  anon: string;
  justNow: string;
  /** "{n}m ago" */
  minAgo: string;
  hourAgo: string;
  dayAgo: string;
}

const IDEA_CARD: Readonly<Record<CopyLocale, IdeaCardCopy>> = {
  en: {
    votingClosed: "Voting is closed on built ideas",
    votesClosedOne: "{n} upvote, voting closed",
    votesClosedMany: "{n} upvotes, voting closed",
    removeUpvote: "Remove your upvote",
    upvoteThis: "Upvote this idea",
    signInToUpvote: "Sign in to upvote",
    showMore: "Show more",
    showLess: "Show less",
    whatWeBuilt: "What we built:",
    openIt: "Open it →",
    anon: "anon",
    justNow: "just now",
    minAgo: "{n}m ago",
    hourAgo: "{n}h ago",
    dayAgo: "{n}d ago",
  },
  hi: {
    votingClosed: "बन चुके आइडिया पर वोटिंग बंद है",
    votesClosedOne: "{n} अपवोट, वोटिंग बंद",
    votesClosedMany: "{n} अपवोट, वोटिंग बंद",
    removeUpvote: "अपना अपवोट हटाएँ",
    upvoteThis: "इस आइडिया को अपवोट करें",
    signInToUpvote: "अपवोट करने के लिए साइन इन करें",
    showMore: "और दिखाएँ",
    showLess: "कम दिखाएँ",
    whatWeBuilt: "हमने क्या बनाया:",
    openIt: "इसे खोलें →",
    anon: "अनाम",
    justNow: "अभी",
    minAgo: "{n} मि. पहले",
    hourAgo: "{n} घं. पहले",
    dayAgo: "{n} दिन पहले",
  },
  te: {
    votingClosed: "పూర్తయిన ఐడియాలపై ఓటింగ్ ముగిసింది",
    votesClosedOne: "{n} అప్‌వోట్, ఓటింగ్ ముగిసింది",
    votesClosedMany: "{n} అప్‌వోట్‌లు, ఓటింగ్ ముగిసింది",
    removeUpvote: "మీ అప్‌వోట్ తీసివేయండి",
    upvoteThis: "ఈ ఐడియాకు అప్‌వోట్ చేయండి",
    signInToUpvote: "అప్‌వోట్ చేయడానికి సైన్ ఇన్ చేయండి",
    showMore: "మరింత చూపు",
    showLess: "తక్కువ చూపు",
    whatWeBuilt: "మేము ఏం చేశాము:",
    openIt: "దీన్ని తెరవండి →",
    anon: "అనామక",
    justNow: "ఇప్పుడే",
    minAgo: "{n} ని. క్రితం",
    hourAgo: "{n} గం. క్రితం",
    dayAgo: "{n} రోజుల క్రితం",
  },
};

export function ideaCardCopy(locale: string | null | undefined): IdeaCardCopy {
  return pickCopy(IDEA_CARD, locale);
}

/** The dashboard block. `heading*` mirror builtForYouHeading()'s branches. */
export interface BuiltForYouCopy {
  headingAsked: string;
  headingUpvoted: string;
  headingAllAsked: string;
  headingAllUpvoted: string;
  headingMixed: string;
  youSuggested: string;
  youUpvoted: string;
  /** "marked built {date}" — the hedge must survive translation. */
  markedBuilt: string;
  whatWeBuilt: string;
  openIt: string;
  tellGroup: string;
  shareAsked: string;
  shareUpvoted: string;
}

const BUILT_FOR_YOU: Readonly<Record<CopyLocale, BuiltForYouCopy>> = {
  en: {
    headingAsked: "You asked for this — it's on Shishya",
    headingUpvoted: "An idea you upvoted is on Shishya",
    headingAllAsked: "Ideas you asked for are on Shishya",
    headingAllUpvoted: "Ideas you upvoted are on Shishya",
    headingMixed: "Ideas you asked for or upvoted are on Shishya",
    youSuggested: "You suggested",
    youUpvoted: "You upvoted",
    markedBuilt: "marked built {date}",
    whatWeBuilt: "What we built:",
    openIt: "Open it →",
    tellGroup: "Tell your prep group:",
    shareAsked: "I asked Shishya for this and it's there now: {title}",
    shareUpvoted: "Students asked Shishya for this and it's there now: {title}",
  },
  hi: {
    headingAsked: "आपने यह माँगा था — यह Shishya पर है",
    headingUpvoted: "आपने जिस आइडिया को अपवोट किया था वह Shishya पर है",
    headingAllAsked: "आपने जो आइडिया माँगे थे वे Shishya पर हैं",
    headingAllUpvoted: "आपने जिन आइडिया को अपवोट किया था वे Shishya पर हैं",
    headingMixed: "आपने जो आइडिया माँगे या अपवोट किए वे Shishya पर हैं",
    youSuggested: "आपने सुझाया",
    youUpvoted: "आपने अपवोट किया",
    markedBuilt: "{date} को 'बन चुका' चिह्नित",
    whatWeBuilt: "हमने क्या बनाया:",
    openIt: "इसे खोलें →",
    tellGroup: "अपने प्रेप ग्रुप को बताएँ:",
    shareAsked: "मैंने Shishya से यह माँगा था और अब यह वहाँ है: {title}",
    shareUpvoted: "छात्रों ने Shishya से यह माँगा था और अब यह वहाँ है: {title}",
  },
  te: {
    headingAsked: "మీరు దీన్ని అడిగారు — ఇది Shishya లో ఉంది",
    headingUpvoted: "మీరు అప్‌వోట్ చేసిన ఐడియా Shishya లో ఉంది",
    headingAllAsked: "మీరు అడిగిన ఐడియాలు Shishya లో ఉన్నాయి",
    headingAllUpvoted: "మీరు అప్‌వోట్ చేసిన ఐడియాలు Shishya లో ఉన్నాయి",
    headingMixed: "మీరు అడిగిన లేదా అప్‌వోట్ చేసిన ఐడియాలు Shishya లో ఉన్నాయి",
    youSuggested: "మీరు సూచించారు",
    youUpvoted: "మీరు అప్‌వోట్ చేశారు",
    markedBuilt: "{date}న 'పూర్తయింది' అని గుర్తించారు",
    whatWeBuilt: "మేము ఏం చేశాము:",
    openIt: "దీన్ని తెరవండి →",
    tellGroup: "మీ ప్రిపరేషన్ గ్రూప్‌కు చెప్పండి:",
    shareAsked: "నేను Shishya ని ఇది అడిగాను, ఇప్పుడు అది అక్కడ ఉంది: {title}",
    shareUpvoted: "విద్యార్థులు Shishya ని ఇది అడిగారు, ఇప్పుడు అది అక్కడ ఉంది: {title}",
  },
};

export function builtForYouCopy(locale: string | null | undefined): BuiltForYouCopy {
  return pickCopy(BUILT_FOR_YOU, locale);
}

/** builtForYouHeading() in the student's language. English delegates to the
 *  English-only builder, so its five branches stay byte-identical. */
export function builtForYouHeadingFor(locale: string | null | undefined, roles: readonly ShipRole[]): string {
  if (asCopyLocale(locale) === "en") return builtForYouHeading(roles);
  const C = builtForYouCopy(locale);
  const asked = roles.filter((r) => r === "asked").length;
  const upvoted = roles.length - asked;
  if (roles.length === 1) return asked ? C.headingAsked : C.headingUpvoted;
  if (upvoted === 0) return C.headingAllAsked;
  if (asked === 0) return C.headingAllUpvoted;
  return C.headingMixed;
}

/** markedBuiltLabel() in the student's language. The date itself keeps the
 *  en-IN form formatShipDate() prints — a date is a date in every language. */
export function markedBuiltFor(
  locale: string | null | undefined,
  shippedAt: string | Date,
  opts: { capital?: boolean } = {},
): string {
  if (asCopyLocale(locale) === "en") return markedBuiltLabel(shippedAt, opts);
  return fillTemplate(builtForYouCopy(locale).markedBuilt, { date: formatShipDate(shippedAt) });
}

/** The WhatsApp line the student forwards. English delegates. */
export function builtForYouShareFor(locale: string | null | undefined, role: ShipRole, title: string): string {
  if (asCopyLocale(locale) === "en") return builtForYouShareMessage(role, title);
  const C = builtForYouCopy(locale);
  return fillTemplate(role === "asked" ? C.shareAsked : C.shareUpvoted, { title });
}
