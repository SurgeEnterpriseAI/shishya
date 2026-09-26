// Ask Shishya answers study questions only — the cheap pre-model check
// (26 Sep 2026).
//
// Founder decision, 26 Sep 2026: "anonymous teenager answers is fine as we
// will be showing only study related content for them". /ask is open to
// anyone, signed in or not, and many askers are 13-17. So every AI answer on
// /ask stays on study: exams, school subjects, colleges, scholarships,
// careers, government jobs, study skills. The system prompt
// (src/lib/ask-prompt.ts, STUDY ONLY) holds the rule for everything that
// reaches the model; this file keeps the OBVIOUS off-topic and unsafe
// questions from reaching it at all — no model cost, no chance of a slip —
// in English, Hinglish, Hindi and Telugu (script and romanised).
//
//   askScopeOf(question) → { inScope } | { inScope: false, reason, distress? }
//   offTopicReply(locale, {question, distress}) → the /api/ask body: one
//     polite line that Shishya's AI answers study questions + 3 real section
//     pages (or, for distress, the helplines and no pages).
//
// Conservative by design: a false "off-topic" blocks a real student, a
// missed one only costs a model call (the prompt refuses it). So:
//   * patterns are phrases, never bare words that have a syllabus meaning —
//     "Love waves", "bomb calorimeter", "sex ratio", "carbon dating",
//     "drug inspector", "satta ki sajhedari" (Class 10 power sharing), "kill
//     time", "study hacks", "weed control" all pass
//     (tests/unit/ask-scope.test.ts pins them);
//   * most rules step aside when the question also carries a study word
//     (an exam, a subject, a class, "essay", "law", "section", "theory"…) —
//     the model then answers only the study part;
//   * a few rules never step aside: explicit sexual content, prompt
//     injection, whole-message chit-chat;
//   * DISTRESS is checked first. A first-person sign ("I want to die",
//     "mujhe marna hai", "chanipovalani undi") always gets the helpline
//     reply — Tele-MANAS 14416, Childline 1098, a trusted adult, 112 — as the
//     school tutor persona does (src/lib/school/tutor-persona.ts). The bare
//     topic word ("suicide", "आत्महत्या", "ఆత్మహత్య") gets it too unless the
//     question is plainly academic (Durkheim, farmer suicides essay, IPC 309,
//     suicide inhibition) and the asker is not the subject of the harm ("i am
//     thinking about suicide" — FIRST_PERSON_HARM; a "give me" or "i need
//     notes" does not count, 26 Sep 2026 fixer).
// PURE: no DB, no model, no network.

import type { PageLink, SearchSection } from "@/lib/search/types";
import { SEARCH_LANDINGS } from "@/lib/search/landings";
import { localeTarget } from "@/lib/search/targets";
import { NEXT_MARK, PAGES_MARK, SITE } from "@/lib/ask-links";
import { isDistressQuery, normScope } from "@/lib/ask-distress";

export type AskLocale = "en" | "hi" | "te";

export type AskScopeReason =
  | "distress"
  | "instructions"
  | "adult"
  | "weapons"
  | "violence"
  | "drugs"
  | "gambling"
  | "hacking"
  | "politics"
  | "celebrity"
  | "entertainment"
  | "romance"
  | "jokes"
  | "chit-chat";

export interface AskScope {
  inScope: boolean;
  reason?: AskScopeReason;
  /** The helpline reply, not the study-only line. */
  distress?: boolean;
}

/** The notice the /api/ask body carries for a reply built here. */
export type AskScopeNotice = "off-topic" | "distress";

// ── Normalising ──────────────────────────────────────────────────────

export { normScope } from "@/lib/ask-distress";
// ── Study words: a rule marked `study` steps aside when one is present ─

const STUDY_RE = new RegExp(
  [
    String.raw`\b(?:exams?|syllabus|chapters?|ncert|cbse|icse|isc|board exams?|boards|pyqs?|mcqs?|question papers?|previous year|notes|essay|paragraph|theory|theories|theorem|formula|equation|probability|statistics|physics|chemistry|biology|botany|zoology|maths?|mathematics|science|history|geography|polity|civics|economics|sociology|psychology|political science|literature|grammar|upsc|ssc|neet|jee|gate|clat|cuet|nda|cds|ibps|rrb|ctet|tet|psc|tspsc|appsc|gk|general knowledge|current affairs|constitution|article \d+|ipc|bns|crpc|pocso|ndps|laws?|legal|section \d+|act(?! as\b)|census|ncrb|durkheim|class ?\d{1,2}(?:st|nd|rd|th)?|\d{1,2}(?:st|nd|rd|th) class|semester|b\.?tech|b\.?sc|m\.?sc|mbbs|study|studies|studying|padhai|padhaai|pariksha|kaksha|nibandh|adhyay|taragathi|chaduvu|vyasam)\b`,
    "परीक्षा|सिलेबस|पाठ्यक्रम|अध्याय|कक्षा|विज्ञान|इतिहास|भूगोल|निबंध|भौतिकी|रसायन|जीव विज्ञान|गणित|संविधान|धारा|अधिनियम|अनुच्छेद|समाजशास्त्र|पढाई",
    "పరీక్ష|సిలబస్|అధ్యాయం|తరగతి|పాఠం|సైన్స్|చరిత్ర|భౌతిక|రసాయన|గణితం|వ్యాసం|రాజ్యాంగం|ఆర్టికల్|సెక్షన్|చట్టం|చదువు",
  ].join("|"),
);

// ── Off-topic rules ──────────────────────────────────────────────────

interface Rule {
  reason: Exclude<AskScopeReason, "distress" | "chit-chat">;
  re: readonly RegExp[];
  /** Steps aside when the question also carries a study word (the model then answers only the study part). */
  study: boolean;
  /** Never matches when this does (a syllabus sense of the same words). */
  unless?: RegExp;
}

const PEOPLE =
  String.raw`(?:someone|somebody|anyone|a person|people|him|her|them|my (?:teacher|sir|madam|father|dad|mother|mom|brother|sister|friend|classmate|neighbou?r|boss|wife|husband|girl ?friend|boy ?friend|ex|enemy|uncle|aunt|principal|step ?father|step ?mother)|a (?:teacher|girl|boy|man|woman|child|kid|person|classmate))`;
const PARTY = String.raw`(?:bjp|congress|aap|tdp|ysrcp|ycp|brs|trs|bsp|samajwadi party|tmc|dmk|aiadmk|janasena|shiv sena|ncp|jdu|jds|rjd|bjd|aimim)`;
// Full names where the first name is a common one ("rahul is better than me in maths" is not politics).
const LEADER = String.raw`(?:narendra modi|modi|rahul gandhi|kejriwal|yogi adityanath|mamata banerjee|chandrababu naidu|chandrababu|cbn|ys jagan|jagan mohan reddy|revanth reddy|kcr|ktr|pawan kalyan|mk stalin|owaisi|amit shah|nitish kumar|siddaramaiah|priyanka gandhi|akhilesh yadav|mayawati|nara lokesh)`;
const HARD_DRUG = String.raw`(?:weed|ganja|charas|cocaine|mdma|molly|lsd|meth|heroin|brown sugar|opium|afeem|cannabis|marijuana|hashish|ecstasy|shrooms)`;
const CELEB = String.raw`(?:actor|actress|heroine|hero|cricketer|celebrity|celebrities|celeb|singer|youtuber|influencer|film star|movie star|star kid|bollywood|tollywood|kollywood)`;

const re = (s: string) => new RegExp(s);

const RULES: readonly Rule[] = [
  {
    reason: "instructions",
    study: false,
    re: [
      /\bignore (?:all |any |the |your |my |these |those )?(?:(?:previous|prior|above|earlier|system|original|safety) )*(?:instructions|rules|prompts?|guidelines|directions)\b/,
      /\b(?:jail ?break|dan mode|developer mode|do anything now)\b/,
      /\b(?:your|the) (?:system|hidden|initial|secret|original) (?:prompt|instructions|message|rules)\b/,
      /\b(?:reveal|print|repeat|leak|show me) your (?:prompt|instructions|rules)\b/,
      /\b(?:pretend|imagine) (?:that )?(?:you are|you're|to be) (?:not an ai|a human|human|a person|my|an? (?:girl|boy)|dan)\b/,
      /\b(?:act|behave|roleplay|role-play|role play) as (?:my|a|an) (?:girl ?friend|boy ?friend|friend|lover|wife|husband|human|person|character|dan|girl|boy|villain)\b/,
      /\byou are (?:now )?(?:dan|my (?:girl ?friend|boy ?friend|lover|wife|husband))\b/,
    ],
  },
  {
    // Explicit: never steps aside.
    reason: "adult",
    study: false,
    re: [
      /\bxxx\b/,
      /\bp[o0]rn\w* (?:videos?|sites?|movies?|clips?|links?|stars?|hub)\b|\bpornhub\b/,
      /\bs[e3]x (?:videos?|vids?|chat|story|stories|kahani|kahaniya|photos?|pics?|movies?|clips?|films?|tape|cam|call|websites?|sites?)\b/,
      /\bs[e3]xy (?:girls?|videos?|photos?|pics?|bhabhi|aunty|aunties|wom[ae]n|dance|images?)\b/,
      /\b(?:send|share|want|need|see|get) (?:me |my |your |her |his )?nudes\b|\bnude (?:pics?|photos?|videos?|images?|selfies?)\b/,
      /\bonlyfans\b|\bsexting\b|\bblue films?\b|\bboobs\b|\bchud(?:ai|ne|na|wa)\w*/,
      /\bhot (?:girls?|bhabhi|aunty|aunties|videos?|pics|photos|scenes?|actress(?:es)?)\b/,
      /\b(?:18 ?\+|adult) (?:videos?|content|movies?|photos?|pics?|sites?|web ?series|chat)\b/,
      /सेक्सी|सेक्स वीडियो|सेक्स कहानी|पोर्न|ब्लू फिल्म|नंगी|चुदाई/,
      /సెక్స్ వీడియో|సెక్సీ|పోర్న్|బూతు (?:వీడియో|కథలు|బొమ్మలు)|నగ్న (?:ఫోటో|వీడియో)/,
      /\bboothu (?:videos?|kathalu|bommalu|cinema)\b/,
    ],
  },
  {
    // 26 Sep 2026 (fixer): explicit — never steps aside for a study word — except zoology's
    // "horny scales" and "the horny layer of the skin", which are syllabus.
    reason: "adult",
    study: false,
    unless: /\b(?:scales?|layers?|beaks?|epiderm\w*|skin|keratin\w*|reptil\w*|plates?|claws?|hoofs?|hooves|sheath|zoolog\w*|biolog\w*|stratum|corneum)\b/,
    re: [/\bhorny\b/],
  },
  {
    reason: "adult",
    study: true,
    re: [/\bp[o0]rn\w*/, /\bnudes?\b(?! (?:mice|mouse|gene|genes))/, /\bmasturbat\w*/],
  },
  {
    // 26 Sep 2026 (fixer): Class 10 Heredity asks "how is the sex of a child determined in human
    // beings?" — a syllabus question with or without the class typed.
    reason: "adult",
    study: true,
    unless:
      /determin\w*|decide\w*|inherit\w*|chromosom\w*|genet\w*|heredit\w*|reproduc\w*|biolog\w*|zoolog\w*|gametes?|zygotes?|offspring|embryos?|foetus|fetus|\bof (?:a |an |the )?(?:child|baby|babies|offspring|foetus|fetus|embryo|organism|individual|plant|animal)s?\b/,
    re: [/(?<!gender (?:and|or|vs\.?) )\bsex\b(?! (?:ratio|determination|chromosomes?|linked|cells?|hormones?|organs?|education|differentiation|selection|and gender|or gender|vs\.? gender))/],
  },
  {
    reason: "weapons",
    study: true,
    unless: /calorimeter/,
    re: [
      /\b(?:how (?:to|do i|can i|do you|should i)|ways to|steps to) (?:make|build|assemble|create|prepare|manufacture|get|buy) (?:a |an |my own |homemade |home made |desi )?(?:bombs?|explosives?|ied|grenades?|guns?|pistols?|revolvers?|rifles?|katta|molotov|petrol bomb|weapons?|firearms?|bullets?|silencer)\b/,
      /\bdesi katta\b/,
      /\b(?:bomb|bam|pistol|katta|bandook|banduk) (?:kaise|kese|kyse) (?:banaye|banaen|banayein|banate|banana|banau|banaun|milega|milegi|kharide|kharidein)\b/,
      /\b(?:buy|kharid\w*|order) (?:a |an )?(?:gun|pistol|revolver|katta|rifle|bullets?)\b/,
      /(?:बम|बंदूक|पिस्तौल|कट्टा|हथियार) कैसे (?:बनाए|बनाएं|बनायें|बनाते|बनाना|बनाऊं|खरीदे|खरीदें|मिलेगा|मिलेगी)/,
      /(?:బాంబు|బాంబ్|తుపాకీ|తుపాకి|ఆయుధం|ఆయుధాలు) (?:ఎలా|ఎక్కడ) (?:తయారు|చేయాలి|చేయడం|కొనాలి|దొరుకుతుంది)/,
      /\b(?:bomb|gun|thupaki|tupaki) (?:ela|ekkada) (?:tayaru|thayaru|cheyali|konali|dorukutundi)\b/,
    ],
  },
  {
    reason: "violence",
    study: true,
    re: [
      re(String.raw`\bhow (?:to|do i|can i|should i) (?:kill|murder|stab|poison|strangle|kidnap|beat up|attack|shoot|hurt|torture|slap) ${PEOPLE}\b`),
      re(String.raw`\bi(?: will|'ll| want to| wanna| am going to| am gonna| m gonna| gonna) (?:kill|murder|stab|shoot|beat up|hurt|poison|attack) (?:${PEOPLE}|you|everyone|everybody)\b`),
      re(String.raw`\b(?:kill|murder|stab|shoot) my (?:teacher|sir|madam|father|dad|mother|mom|brother|sister|friend|classmate|neighbou?r|boss|wife|husband|girl ?friend|boy ?friend|ex|enemy|uncle|aunt|principal)\b`),
      /\bjaan se (?:maar|mar)\w*/,
      /\b(?:maar|mar) (?:daalu|dalu|daalunga|dalunga|daalungi|dalungi|dunga|dungi|doonga|doongi)\b/,
      /\b(?:katl|qatl|khoon|murder|hatya) (?:kaise|kese) (?:kare|karu|karein|karte|karun)\b/,
      /(?:हत्या|कत्ल|मर्डर) कैसे (?:करें|करूं|करे|करते|करू)|जान से मार|मार डालूं|मार डालूंगा|मार डालूंगी|मार दूंगा|मार दूंगी/,
      /(?:వాడిని|వాడ్ని|దాన్ని|ఆమెను|అతన్ని|వాళ్ళని|వాళ్లని|నిన్ను) (?:చంపాలి|చంపేస్తా|చంపుతా|చంపేస్తాను|చంపాలని)/,
      /\b(?:vadini|vaadini|vadni|vaadni|danini|daanini|aameni|atanni|vallani|ninnu) (?:champali|champesta|champestha|champutha|champuta|champestanu)\b/,
    ],
  },
  {
    reason: "drugs",
    study: true,
    re: [
      re(String.raw`\b(?:buy|kharid\w*|order|score) (?:some |good |cheap )?(?:${HARD_DRUG}|drugs)\b`),
      re(String.raw`\bwhere (?:to|can i|do i|can we) (?:buy|get|find|score) (?:some )?(?:${HARD_DRUG}|drugs)\b`),
      /\b(?:weed|ganja|charas|maal|drugs|afeem) (?:kahan|kaha|kidhar|kaise|kese) (?:milega|milegi|milta|milti|milenge|kharide|kharidein)\b/,
      re(String.raw`\bhow (?:to|do i|can i) (?:smoke|roll|inject|snort) (?:${HARD_DRUG}|a joint|joints?|drugs)\b`),
      re(String.raw`\bhow (?:to|do i|can i) (?:grow|cook|make|get|take|do|use) ${HARD_DRUG}\b`),
      /\bhow (?:to|do i|can i) get (?:stoned|drunk)\b/,
      /\b(?:nasha|nashe) (?:kaise|kese) (?:kare|karein|karu|karte)\b|\bnashe ke liye\b|\bnasha karne (?:ka|ke)\b/,
      /\b(?:buy|kharid\w*) (?:a |some )?(?:vapes?|daru|daaru|beer|vodka|whisky|whiskey|liquor|cigarettes?|cigs|hookah)\b/,
      /(?:गांजा|चरस|ड्रग्स|अफीम|स्मैक|नशा) (?:कहां|कैसे) (?:मिलेगा|मिलेगी|मिलता|मिलती|मिलेंगे|खरीदे|खरीदें|करें|करते)/,
      /(?:గంజాయి|గంజా|డ్రగ్స్|మత్తు మందు) (?:ఎక్కడ|ఎలా) (?:దొరుకుతుంది|దొరుకుతాయి|కొనాలి|తీసుకోవాలి|తాగాలి)/,
      /\b(?:ganjayi|ganja|drugs) (?:ekkada|ela) (?:dorukutundi|dorukuthundi|dorukutayi|konali|kavali)\b/,
    ],
  },
  {
    reason: "gambling",
    study: true,
    re: [
      /\bsatta (?:matka|king|results?|numbers?|chart|bazaa?r|game)\b/,
      /\bmatka (?:results?|numbers?|chart|guessing|open|close)\b/,
      /\b(?:online|cricket|ipl|football|sports) betting\b|\bbetting (?:tips|apps?|sites?|ids?|tricks?|predictions?)\b/,
      /\bdream ?11 (?:teams?|predictions?|tips|captain|grand league|gl team)\b/,
      /\b(?:today'?s?|todays|tomorrow'?s?) (?:match|toss) (?:predictions?|winner)\b|\bwho will win (?:today'?s?|todays|tomorrow'?s?) match\b/,
      /\bteen ?patti\b|\brummy (?:apps?|cash|circle|online|real money|tricks)\b|\bonline rummy\b/,
      /\bcasinos?\b/,
      /\baviator (?:game|predictor|prediction|hack|signals?|tricks?)\b|\bcolou?r (?:prediction|trading) (?:game|apps?|tricks?)\b/,
      /\blottery (?:results?|tickets?|numbers?|sambad|today)\b|\b(?:kerala|nagaland|punjab|sikkim) (?:state )?lottery\b/,
      /सट्टा (?:मटका|किंग|नंबर|रिजल्ट|बाजार)|मटका (?:रिजल्ट|नंबर)|जुआ (?:कैसे|कहां)|लॉटरी (?:रिजल्ट|नंबर|टिकट)/,
      /బెట్టింగ్|పేకాట|లాటరీ (?:ఫలితాలు|నంబర్|టికెట్)/,
    ],
  },
  {
    reason: "hacking",
    study: true,
    unless: /ethical|cyber ?security|course|career|certificat|ceh|\bjobs?\b|salary/,
    re: [
      /\bhow (?:to|do i|can i) hack\b/,
      /\bhack(?:ing)? (?:a |an |someone'?s? |my (?:friend|gf|bf|ex|girlfriend|boyfriend)'?s? |his |her )?(?:instagram|insta|facebook|fb|whatsapp|wifi|wi-fi|gmail|email|snapchat|phone|mobile|account|password|free ?fire|pubg|bgmi|game|website|cctv|camera)\b/,
      /\b(?:instagram|insta|facebook|fb|whatsapp|wifi|wi-fi|gmail|snapchat|free ?fire|pubg|bgmi) (?:account )?(?:hack|hacking|hacker|password crack|password hack)\b/,
      /\bhack (?:kaise|kese) (?:kare|karein|karte|kre)\b|\bhack ela (?:cheyali|chestaru)\b|हैक कैसे|హ్యాక్ ఎలా/,
    ],
  },
  {
    reason: "politics",
    study: true,
    // Polity for exams is study: the party system, anti-defection, the Election Commission.
    unless: /party system|multi-?party|two-?party|single-?party|one-?party|anti-?defection|tenth schedule|election commission|model code/,
    re: [
      /\b(?:which|what|kaun ?si|konsi|kis|e|ye|ee) party\b.{0,24}\b(?:vote|support|choose|best|better|good|win|jitegi|jeetegi|manchidi|gelustundi)\b/,
      /\b(?:who|whom) (?:should|to|do) (?:i|we) vote\b|\b(?:kisko|kise|kis ko|kisse) vote (?:dena|du|doon|dun|karu|karun|karna|de)\b|\b(?:evariki|evvariki) vote (?:veyali|veyyali|vesthe)\b/,
      re(String.raw`\bvote (?:for|to|kare|karein|do|dena|dein) (?:${PARTY}|${LEADER})\b`),
      re(String.raw`\b${PARTY} (?:vs\.?|versus|or|v/s) ${PARTY}\b`),
      re(String.raw`\b${LEADER} (?:vs\.?|versus|or|v/s) ${LEADER}\b`),
      re(String.raw`\b(?:is|was|are) (?:${LEADER}|${PARTY}) (?:a )?(?:good|bad|better|best|worst|corrupt|right|wrong|honest|dishonest|fake|great|useless)\b`),
      re(String.raw`\b(?:${LEADER}|${PARTY}) (?:is|was) (?:a |the )?(?:good|bad|better|best|worst|corrupt|honest|dishonest|fake|great|useless)\b`),
      re(String.raw`\b(?:${LEADER}|${PARTY}) (?:acha|achha|accha|acche|achhe|bura|bure|buri|achi|achhi|acchi) (?:hai|he|hain|h)\b`),
      /\bwho will win (?:the )?(?:next |upcoming |coming )?(?:\d{4} )?(?:lok sabha |assembly |general |state |bihar |ap |telangana |up )?(?:elections?|polls|chunav)\b/,
      /\bevaru gelust(?:h)?aru\b/,
      /किसको वोट|किस पार्टी को वोट|कौन सी पार्टी (?:अच्छी|बेहतर|सही)|चुनाव कौन जीतेगा|कौन जीतेगा चुनाव|मोदी (?:अच्छे|बुरे)|(?:भाजपा|कांग्रेस) (?:अच्छी|बुरी)/,
      /ఎవరికి ఓటు|ఏ పార్టీకి ఓటు|ఏ పార్టీ మంచిది|ఎన్నికల్లో ఎవరు గెలుస్తారు/,
    ],
  },
  {
    reason: "celebrity",
    study: true,
    re: [
      re(String.raw`\b${CELEB}s?'?s? (?:girl ?friends?|boy ?friends?|affairs?|break ?ups?|divorces?|wife|wives|husbands?|dating|relationships?|love life|love story|marriage|net worth|hot|photos?|pics?|images|gossip|scandals?|controvers\w*|leaked)\b`),
      /\bbigg boss\b|\bbig ?boss (?:\d+|telugu|hindi|kannada|tamil|malayalam|ott|winner|vote|voting|contestants?|elimination|live|season)\b/,
      /\bbox office (?:collections?|report|day \d+|verdict)\b/,
      /\b(?:movies?|films?|pictures?|cinema|web ?series) (?:reviews?|collections?|release date|downloads?|leaked?|hd|free)\b/,
      /\b(?:movierulz|ibomma|tamilrockers|filmyzilla|filmywap|9xmovies|vegamovies|khatrimaza|moviesda)\b|\bott release\b/,
      /\bwho is (?:dating|the girlfriend of|the boyfriend of)\b/,
      /बिग बॉस|बॉक्स ऑफिस कलेक्शन|(?:फिल्म|मूवी) (?:डाउनलोड|रिव्यू|कलेक्शन)|(?:हीरोइन|एक्ट्रेस|अभिनेत्री|हीरो|क्रिकेटर) (?:का|की|के) (?:बॉयफ्रेंड|गर्लफ्रेंड|अफेयर|शादी|पति|पत्नी)/,
      /బిగ్ ?బాస్|బాక్స్ ఆఫీస్|సినిమా (?:డౌన్లోడ్|రివ్యూ|కలెక్షన్)|హీరోయిన్ (?:బాయ్ ?ఫ్రెండ్|ఎఫైర్|పెళ్లి)/,
    ],
  },
  {
    reason: "entertainment",
    study: true,
    re: [
      /\bfree ?fire (?:diamonds?|redeem|redeem codes?|hack|id|max|headshot|sensitivity|names?|top up)\b/,
      /\b(?:bgmi|pubg) (?:uc|redeem|redeem codes?|hack|id|tips|sensitivity|names?|lite)\b/,
      /\bredeem codes?\b|\bmod apk\b|\bcheat codes?\b/,
      /\b(?:gta ?(?:5|v|6|vi)|minecraft|roblox|fortnite|free ?fire|bgmi|pubg) (?:download|apk|cheats?|mod|hack)\b/,
      /\b(?:increase|get|gain|buy) (?:free )?(?:instagram|insta|youtube|yt|tiktok|facebook) (?:followers|likes|subscribers|views)\b/,
      /\b(?:instagram|insta|youtube|yt) (?:followers|likes|subscribers) (?:kaise|kese) (?:badhaye|badhayein|badhaen|badhae)\b/,
    ],
  },
  {
    reason: "romance",
    study: true,
    // "How to impress the interviewer / examiner" is exam prep. 26 Sep 2026
    // (integrator): so are the Romantic poets and a set text's or history's
    // lovers ("romantic poetry features", "Shah Jahan and Mumtaz love story").
    unless: /interview|examiner|recruiter|\bpanel\b|\bboss\b|\bromantic (?:poets?|poetry|poems?|period|era|age|movement|revival|literature|novel(?:ist)?s?)\b|\bromanticism\b|\b(?:shakespeare|keats|wordsworth|shelley|byron|coleridge|tagore|premchand|kalidas[a]?|shakuntala|dushyant|shah ?jahan|mumtaz|prithviraj|sanyogita|romeo|juliet|heer|ranjha|laila|majnu|anarkali|bajirao|mastani)\b/,
    re: [
      // 26 Sep 2026 (integrator, live proof): "tell me a romantic story" reached
      // the model — a request for romantic / love stories, lines or messages is
      // romance too (the founder's study-only rule), in the four languages.
      /\b(?:romantic|romance|love|pyaa?r|prem|ishq) (?:story|stories|kahani|kahaani|kahaniya|kahaniyan|kahaaniyan|katha|kathalu|novels?|scenes?|movies?|films?|songs?|web ?series)\b/,
      /\bromantic (?:lines|messages?|msgs?|sms|quotes?|status|captions?|dialogues?|things to (?:say|do)|ideas|gifts?|date|dinner|places)\b|\b(?:something|anything|kuch|kuchh|edaina) romantic\b/,
      /(?:रोमांटिक|प्रेम|प्यार|लव) (?:कहानी|कहानियां|स्टोरी|कथा)|रोमांटिक (?:शायरी|मैसेज|बातें)/,
      /(?:రొమాంటిక్|ప్రేమ|లవ్) (?:కథ|కథలు|స్టోరీ|స్టోరీలు)/,
      /\bgirl ?friends?\b|\bboy ?friends?\b/,
      /\b(?:my|meri|mera|apni|apne|his|her|ex|without) (?:gf|bf)\b|\b(?:gf|bf) (?:ko|se|ke|ki|kaise|kese|banana|banaye|banani|patana|chahiye|nahi)\b/,
      /\b(?:my|meri|mera|a|ek|his|her) crush\b|\bcrush (?:ko|se|pe|par|on|hai|ne|ki|ka|ke)\b/,
      /\bhow (?:to|do i|can i|should i) (?:impress|propose|patao|pataye|pataun|attract|seduce|flirt with|kiss|date|woo|ask out) (?:a |my |the |this |that )?(?:girls?|boys?|ladki|ladka|crush|her|him|gf|bf|girl ?friend|boy ?friend|lover|wom[ae]n|guys?)\b/,
      /\b(?:propose|impress) (?:a|my|her|him|the|that|this) (?:girl|boy|crush|lover)\b|\b(?:propose|impress) (?:her|him)\b/,
      /\b(?:ladki|ladka|larki|larka|ladkiyan|ladkiyon) (?:kaise |kese |kyse )?(?:pataye|pataen|patayein|patau|pataun|patana|patane|impress)\b|\b(?:ladki|ladka|larki|larka) ko (?:impress|propose|pata)\w*/,
      /\bflirt(?:ing|y)?\b|\bdating (?:apps?|sites?|tips|advice|coach)\b|\bonline dating\b|\b(?:go|going) on a date\b|\bask (?:her|him) out\b/,
      /\blove (?:letters?|proposal|propose|tips|advice|problems?|marriage|life|affair|guru|failure|breakup|quotes|shayari|messages?|sms)\b/,
      /\bbreak ?up (?:with|ho ?gaya|hogaya|ho gya|ke baad|after|kaise)\b|\b(?:get|getting) my ex back\b|\bmy ex (?:ko|wapas|back)\b/,
      /\bhow to kiss\b|\bkiss (?:kaise|kese|karna)\b|\bkiss (?:her|him|my|a girl|a boy)\b/,
      /\b(?:she|he) (?:doesn'?t|does not|dont) (?:love|like) me\b|\b(?:does|do) (?:she|he) (?:love|like) me\b|\bi (?:love|like) (?:a|this|one) (?:girl|boy)\b|\bone sided love\b/,
      /\bpyaa?r (?:kaise|kese|ka izhaa?r|ho gaya|hogaya)\b/,
      /गर्लफ्रेंड|बॉयफ्रेंड|गर्ल फ्रेंड|बॉय फ्रेंड|प्रपोज|लडकी (?:कैसे )?पटा|प्रेमिका को|प्रेमी को|प्यार का इजहार|किस कैसे/,
      /గర్ల్ ?ఫ్రెండ్|బాయ్ ?ఫ్రెండ్|ప్రపోజ్|ప్రేమలేఖ|లవ్ లెటర్|లవ్ ప్రపోజ్|అమ్మాయిని (?:ఎలా )?(?:పడేయాలి|పటాయించాలి|ఇంప్రెస్)/,
      /\b(?:ammayi|ammai|ammayini|ammaini|abbayi|abbayini) (?:ni )?(?:ela )?(?:patayali|pataayali|padeyali|padeyyali|padagottali|impress cheyali|propose cheyali|love cheyali)\b|\blove (?:cheyali|chestunna|chesthunna)\b/,
    ],
  },
  {
    reason: "jokes",
    study: true,
    re: [
      /\b(?:tell|say|give|share|send|crack)(?: me| us)? (?:a |an |some |one |ek |any |more )?(?:funny |good |new |dirty |double meaning |hindi |telugu |english |bad |dad |non ?veg )?(?:jokes?|memes?|pick ?-?up lines?|chutkul[ae]s?)\b/,
      /\bjokes? (?:sunao|batao|chahiye|cheppu|cheppandi|cheppava|in hindi|in telugu|please|plz)\b|\b(?:ek|koi) (?:joke|chutkula)\b|\bchutkul[ae]\b/,
      /\bpick ?-?up lines?\b|\b(?:love|sad|attitude|romantic|dosti|bewafa|funny|birthday|gf|bf) shayari\b|\broast me\b|\bmake me (?:laugh|smile)\b|\bdouble meaning\b|\bmemes?\b/,
      /चुटकुल|जोक सुना|जोक्स सुना|मजेदार जोक|शायरी सुना/,
      /జోక్ చెప్పు|జోక్స్ చెప్పు|జోకులు|జోక్ చెప్పండి|జోక్స్ చెప్పండి/,
    ],
  },
];

// ── Chit-chat: the whole message is a greeting, thanks or small talk ──

const CHAT_LATIN = [
  "h+i+", "h+e+l+o+", "hel+o+", "h+l+o+", "he+y+", "yo+", "hola", "namaste", "namaskar", "namaskaram", "salaam", "salam",
  "good (?:morning|afternoon|evening|night)", "gm", "gn",
  "how are (?:you|u)(?: doing)?", "how r (?:u|you)", "how(?:s| is) (?:it going|life|your day)", "whats up", "wassup", "sup",
  "kaise ho(?: aap)?", "kaise hain(?: aap)?", "kaisa hai", "kya haal(?: hai)?", "kya hal hai", "kya chal raha(?: hai)?",
  "ela unnav(?:u|a)?", "ela unnaru", "ela unnaaru", "bagunnava", "bagunnara", "baagunnava", "em chestunnav(?:u)?", "emchestunnav",
  "thanks?(?: a lot)?(?: you)?", "thank (?:you|u)(?: so much| very much)?", "thanku", "thankyou", "thx", "tysm",
  "ok+", "okay", "k", "bye+", "tata", "good ?bye", "see (?:you|u)", "lol+", "lmao", "(?:ha)+h?", "(?:he)+h?", "hm+", "nice", "cool", "great", "wow",
  "who are (?:you|u)", "what are (?:you|u)", "who r u", "what is your name", "whats your name", "your name", "tell me about yourself",
  "are (?:you|u) (?:a )?(?:human|robot|bot|ai|real|person|chatgpt|gemini)",
  "tum kaun ho", "aap kaun ho", "aap kaun hai", "tu kaun hai", "nuvvu evaru", "meeru evaru", "mee peru enti", "nee peru enti", "tera naam kya hai", "aapka naam kya hai",
  "i love (?:you|u)", "love (?:you|u)", "i miss (?:you|u)", "i am bored", "im bored", "bored", "bore ho raha (?:hu|hoon|hun)",
  "what can (?:you|u) do", "how can (?:you|u) help(?: me)?", "help", "help me", "test", "testing",
];
const ADDRESS = "(?: (?:shishya|bro|sir|mam|maam|madam|dear|there|buddy|anna|bhai|didi|ai|bot|friend|ji|yaar|ra|guys|everyone|all))*";
const CHAT_RE = new RegExp(`^(?:${CHAT_LATIN.join("|")})${ADDRESS}$`);
const CHAT_INDIC = new RegExp(
  `^(?:${[
    "नमस्ते", "नमस्कार", "हैलो", "हेलो", "हाय", "कैसे हो", "आप कैसे हैं", "कैसे हैं आप", "धन्यवाद", "शुक्रिया", "तुम कौन हो", "आप कौन हैं", "आप कौन हो", "तुम्हारा नाम क्या है", "आपका नाम क्या है", "गुड मॉर्निंग", "सुप्रभात", "शुभ रात्रि",
    "నమస్తే", "నమస్కారం", "నమస్కారాలు", "హలో", "హాయ్", "ఎలా ఉన్నావు", "ఎలా ఉన్నారు", "బాగున్నావా", "బాగున్నారా", "ధన్యవాదాలు", "థ్యాంక్స్", "నువ్వు ఎవరు", "మీరు ఎవరు", "నీ పేరు ఏమిటి", "మీ పేరు ఏమిటి", "శుభోదయం", "గుడ్ మార్నింగ్",
  ].join("|")})(?: जी| గారు)?$`,
);

/** The message with punctuation, emoji and apostrophes gone — for the whole-message chit-chat test. */
function bareWords(n: string): string {
  return n.replace(/'/g, "").replace(/[\p{P}\p{S}]+/gu, " ").replace(/\s+/g, " ").trim();
}

// ── The check ────────────────────────────────────────────────────────

/**
 * Whether a question typed into /ask is in Shishya's study scope. Pure and
 * cheap (a few dozen regexes); call it before the model. `inScope: true` is
 * not a promise that the question is study — only that it is not an obvious
 * off-topic one; the system prompt's STUDY ONLY rule covers the rest.
 */
export function askScopeOf(question: string): AskScope {
  const n = normScope(question);
  if (!n) return { inScope: true };

  if (isDistressQuery(n)) return { inScope: false, reason: "distress", distress: true };

  const study = STUDY_RE.test(n);
  for (const rule of RULES) {
    if (rule.study && study) continue;
    if (rule.unless?.test(n)) continue;
    if (rule.re.some((r) => r.test(n))) return { inScope: false, reason: rule.reason };
  }

  const bare = bareWords(n);
  if (bare && (CHAT_RE.test(bare) || CHAT_INDIC.test(bare))) return { inScope: false, reason: "chit-chat" };
  return { inScope: true };
}

// ── The reply (no model) ─────────────────────────────────────────────

/** The helplines every distress reply gives (the numbers the prompt names too). */
export const HELPLINES = {
  teleManas: "14416",
  teleManasTollFree: "1800-891-4416",
  childline: "1098",
  emergency: "112",
} as const;

/** True when an answer is a distress reply (it names Tele-MANAS): no study pages are appended to it. */
export function isDistressAnswer(text: string): boolean {
  return new RegExp(`(^|\\D)${HELPLINES.teleManas}(\\D|$)`).test(String(text ?? ""));
}

/** The section pages an off-topic reply offers — landings every index has (src/lib/search/landings.ts). */
export const OFF_TOPIC_PAGES: readonly string[] = ["/exams/browse", "/schooling", "/careers"];

const PAGE_LABEL: Readonly<Record<AskLocale, Readonly<Record<string, string>>>> = {
  en: {},
  hi: { "/exams/browse": "सभी परीक्षाएं", "/schooling": "स्कूल", "/careers": "करियर" },
  te: { "/exams/browse": "అన్ని పరీక్షలు", "/schooling": "స్కూల్", "/careers": "కెరీర్" },
};

const PAGE_WHY: Readonly<Record<AskLocale, Readonly<Record<string, string>>>> = {
  en: { "/exams/browse": "every exam on Shishya, by category", "/schooling": "classes, subjects and chapters", "/careers": "career paths and how to get there" },
  hi: { "/exams/browse": "शिष्य की हर परीक्षा, श्रेणी के हिसाब से", "/schooling": "कक्षाएं, विषय और अध्याय", "/careers": "करियर के रास्ते और वहां तक कैसे पहुंचें" },
  te: { "/exams/browse": "శిష్యలోని ప్రతి పరీక్ష, విభాగాల వారీగా", "/schooling": "తరగతులు, సబ్జెక్టులు, అధ్యాయాలు", "/careers": "కెరీర్ మార్గాలు, అక్కడికి ఎలా చేరాలి" },
};

const COPY: Readonly<Record<AskLocale, { offTopic: string; pagesHeading: string; openNext: string; distress: readonly string[] }>> = {
  en: {
    offTopic:
      "I'm Shishya's AI, and I answer study questions only — exams, school subjects, colleges, scholarships, careers and government jobs. Ask me one of those, or start from a page below.",
    pagesHeading: "Pages on Shishya for this:",
    openNext: "Open next:",
    distress: [
      "I'm really sorry you're feeling this way. You don't have to carry it alone.",
      "",
      "- Please talk to someone you trust **right now** — a parent, a teacher or another adult.",
      `- **Tele-MANAS ${HELPLINES.teleManas}** — free, 24 hours, in many Indian languages (or ${HELPLINES.teleManasTollFree}).`,
      `- **Childline ${HELPLINES.childline}** — free, 24 hours, for anyone under 18.`,
      `- In an emergency, call **${HELPLINES.emergency}**.`,
      "",
      "I'm Shishya's AI, not a counsellor — the people on these lines are trained to help, and calling them is a strong step.",
    ],
  },
  hi: {
    offTopic:
      "मैं शिष्य का AI हूं और सिर्फ पढ़ाई से जुड़े सवालों के जवाब देता हूं — परीक्षाएं, स्कूल के विषय, कॉलेज, छात्रवृत्ति, करियर और सरकारी नौकरियां। इनमें से कुछ पूछिए, या नीचे दिए किसी पेज से शुरू कीजिए।",
    pagesHeading: "शिष्य पर इसके लिए पेज:",
    openNext: "अगला खोलें:",
    distress: [
      "मुझे बहुत दुख है कि आप ऐसा महसूस कर रहे हैं। आपको यह अकेले नहीं सहना है।",
      "",
      "- **अभी** किसी भरोसेमंद व्यक्ति से बात करें — माता-पिता, शिक्षक या कोई और बड़ा जिस पर आप भरोसा करते हैं।",
      `- **टेली-मानस ${HELPLINES.teleManas}** — मुफ्त, 24 घंटे, कई भारतीय भाषाओं में (या ${HELPLINES.teleManasTollFree})।`,
      `- **चाइल्डलाइन ${HELPLINES.childline}** — मुफ्त, 24 घंटे, 18 साल से कम उम्र वालों के लिए।`,
      `- आपात स्थिति में **${HELPLINES.emergency}** पर कॉल करें।`,
      "",
      "मैं शिष्य का AI हूं, काउंसलर नहीं — इन नंबरों पर बात करने वाले लोग मदद के लिए प्रशिक्षित हैं, और उन्हें कॉल करना एक मजबूत कदम है।",
    ],
  },
  te: {
    offTopic:
      "నేను శిష్య AI ని. చదువుకు సంబంధించిన ప్రశ్నలకు మాత్రమే సమాధానం ఇస్తాను — పరీక్షలు, స్కూల్ సబ్జెక్టులు, కాలేజీలు, స్కాలర్‌షిప్‌లు, కెరీర్లు, ప్రభుత్వ ఉద్యోగాలు. వీటిలో ఏదైనా అడగండి, లేదా కింది పేజీ నుండి మొదలుపెట్టండి.",
    pagesHeading: "దీని కోసం శిష్యలో పేజీలు:",
    openNext: "తర్వాత తెరవండి:",
    distress: [
      "మీరు ఇలా బాధపడుతున్నందుకు నాకు చాలా బాధగా ఉంది. మీరు దీన్ని ఒంటరిగా మోయాల్సిన అవసరం లేదు.",
      "",
      "- **ఇప్పుడే** మీరు నమ్మే వారితో మాట్లాడండి — అమ్మానాన్న, టీచర్ లేదా మీరు నమ్మే మరో పెద్దవారు.",
      `- **టెలి-మానస్ ${HELPLINES.teleManas}** — ఉచితం, 24 గంటలు, చాలా భారతీయ భాషల్లో (లేదా ${HELPLINES.teleManasTollFree}).`,
      `- **చైల్డ్‌లైన్ ${HELPLINES.childline}** — ఉచితం, 24 గంటలు, 18 ఏళ్ల లోపు వారికి.`,
      `- అత్యవసరమైతే **${HELPLINES.emergency}** కి కాల్ చేయండి.`,
      "",
      "నేను శిష్య AI ని, కౌన్సెలర్‌ని కాదు — ఈ నంబర్లలో మాట్లాడేవారు సహాయం చేయడానికి శిక్షణ పొందినవారు, వారికి కాల్ చేయడం ఒక ధైర్యమైన అడుగు.",
    ],
  },
};

/** The language of the reply: the script the question was typed in, else the page's locale ("hi" / "te" pages answer a Latin question in English — the prompt's mirror rule). */
export function scopeReplyLocale(question: string | undefined, pageLocale: AskLocale): AskLocale {
  const q = String(question ?? "");
  if (/[ऀ-ॿ]/.test(q)) return "hi";
  if (/[ఀ-౿]/.test(q)) return "te";
  return q.trim() ? "en" : pageLocale;
}

/** The /api/ask body for a reply built here — the same fields as a model answer, plus the notice. */
export interface AskScopePayload {
  answer: string;
  usedWeb: false;
  pages: PageLink[];
  links: PageLink[];
  next: PageLink | null;
  webSources: [];
  notice: AskScopeNotice;
}

function sectionOf(path: string): SearchSection {
  return SEARCH_LANDINGS.find((l) => l.path === path)?.section ?? "more";
}

/**
 * The reply for a question askScopeOf put out of scope — no model call.
 * `locale` is the page's (/hi/ask → "hi": twin links keep the prefix); the
 * text follows the question's script when `question` is given. Distress gets
 * the helplines and NO pages (a child in distress is not sent to study).
 */
export function offTopicReply(locale: AskLocale = "en", opts: { question?: string; distress?: boolean } = {}): AskScopePayload {
  const lang = opts.question !== undefined ? scopeReplyLocale(opts.question, locale) : locale;
  const copy = COPY[lang] ?? COPY.en;
  if (opts.distress) {
    return { answer: copy.distress.join("\n"), usedWeb: false, pages: [], links: [], next: null, webSources: [], notice: "distress" };
  }
  const pages: PageLink[] = OFF_TOPIC_PAGES.map((p) => ({
    url: localeTarget(p, locale),
    label: PAGE_LABEL[lang][p] ?? SEARCH_LANDINGS.find((l) => l.path === p)?.title ?? p,
    section: sectionOf(p),
  }));
  const block = [
    `${PAGES_MARK} ${copy.pagesHeading}`,
    ...pages.map((p, i) => `- [${p.label}](${SITE}${p.url}) — ${PAGE_WHY[lang][OFF_TOPIC_PAGES[i]]}`),
    `${NEXT_MARK} ${copy.openNext} [${pages[0].label}](${SITE}${pages[0].url})`,
  ];
  return { answer: [copy.offTopic, "", ...block].join("\n"), usedWeb: false, pages, links: pages, next: pages[0], webSources: [], notice: "off-topic" };
}

/** askScopeOf + offTopicReply in one call: null when the question may go to the model. */
export function askScopeReply(question: string, locale: AskLocale = "en"): (AskScopePayload & { reason: AskScopeReason }) | null {
  const s = askScopeOf(question);
  if (s.inScope) return null;
  return { ...offTopicReply(locale, { question, distress: s.distress }), reason: s.reason ?? "chit-chat" };
}
