// Distress detection shared by /api/ask (src/lib/ask-scope.ts) and the home
// search strip (src/components/search/SearchStrip.tsx). 26 Sep 2026: moved
// out of ask-scope.ts so the strip can check a query BEFORE it opens a page
// directly — "class 6 i want to die" must reach the helplines on /ask, never
// the Class 6 page. Pure, no imports, safe in the browser bundle.

/**
 * Lower case, one space, curly quotes straight, zero-width joiners gone
 * (Telugu "గర్ల్‌ఫ్రెండ్" is typed with and without ZWNJ), Devanagari nukta
 * dropped and chandrabindu read as anusvara ("ज़िंदगी" = "जिंदगी", "हूँ" =
 * "हूं") — the patterns below are written in that form.
 */
export function normScope(q: string): string {
  return String(q ?? "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[​-‍⁠﻿]/g, "")
    .replace(/़/g, "")
    .replace(/ँ/g, "ं")
    .replace(/[’‘`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Distress ─────────────────────────────────────────────────────────

/** A first-person sign: the helpline reply whatever else the question says. */
const DISTRESS_ALWAYS: readonly RegExp[] = [
  /\b(?:kill|hang|hurt|harm|cut|poison|shoot|stab|burn|end) (?:my ?self|myself)\b/,
  /\b(?:end|take) my (?:own )?life\b/,
  // 26 Sep 2026 (fixer): "going to die" only with a first-person subject — "species going to die out",
  // "why are coral reefs going to die" and "the bird thought it was going to die" (Class 7 English) are study.
  /\b(?:want|wanna|planning|plan|ready|decided|thinking|trying|wish|like) (?:to|of) (?:die|dying|commit suicide|suicide|end it all)\b(?! out\b)/,
  /\b(?:i|i'm|im|i m|i am|i'll|i will) (?:going to|gonna) (?:die|kill myself|end it all|end my life)\b(?! (?:out\b|of (?:boredom|laughter|laughing|hunger|curiosity|cold|heat)))/,
  /\b(?:i am|i'm|im|i feel|feeling|i was) (?:so |very )?suicidal\b/,
  /\bwish i (?:was|were) (?:dead|never born)\b/,
  /\bbetter off dead\b/,
  /\b(?:no|nothing|zero) (?:reason|point) (?:to live|in living|living)\b/,
  /\bdon'?t (?:want|wanna) to (?:live|be alive|exist|wake up)\b/,
  /\bpainless (?:way|death|method)\b/,
  /\bhow (?:many|much) (?:sleeping )?(?:pills|tablets|paracetamol|medicine)\b.{0,40}\b(?:die|death|dead|overdose|kill)\b/,
  /\bhow to (?:overdose|hang myself|slit)\b/,
  /\b(?:my|our) (?:step ?)?(?:father|dad|papa|mother|mom|mummy|mum|uncle|brother|cousin|teacher|tuition (?:teacher|sir)|coach|neighbou?r|relative) (?:beats|hits|abuses|touches|touched|molests|molested|harasses|harassed|rapes|raped) me\b/,
  /\b(?:i am|i'm|im|i was|i got|i'm being|i am being) (?:being )?(?:bullied|abused|molested|harassed|raped)\b/,
  /\bsomeone (?:touched|touches|is touching) me\b/,
  // Hinglish
  /\b(?:mujhe|mujhko|mai|main) (?:bhi )?(?:marna|mar jana|mar jaana) (?:hai|chahta|chahti)\b/,
  /\b(?:marna|mar jana|mar jaana) (?:chahta|chahti|chahata|chahati) (?:hu|hoon|hun|hu+n)\b/,
  /\b(?:marne|mar jaane|mar jane) ka (?:mann|man|dil|khayal|khyal)\b/,
  /\bjeena nahi?n? (?:chahta|chahti)\b/,
  /\bjeene ka (?:mann|man|dil) nahi?n?\b/,
  /\b(?:suicide|atmahatya|aatmahatya|khudkushi) (?:karna|karni|karunga|karungi|kar lunga|kar lungi|kar lu|karne ka|karne ki)\b/,
  /\b(?:suicide|atmahatya|aatmahatya|khudkushi) (?:ke|ka) (?:khayal|khyal|vichar|vichaar|thoughts?)\b/,
  /\bzindagi (?:khatam|khatm|khtm) (?:kar|karna|karni|karunga|karungi)\b/,
  /\bkhud ko (?:maar|khatam|khatm|hurt|nuksan|nuksaan|chot)\b/,
  // Hindi
  /मरना चाहत|मर जाना चाहत|मरने का मन|मरने का दिल|जीना नहीं चाहत|जीने का मन नहीं|जीने की इच्छा नहीं|खुद को मार|जिंदगी खत्म|जिन्दगी खत्म|अपनी जान ले|(?:आत्महत्या|खुदकुशी) (?:करना|करने|कर लूं|कर लूंगा|कर लूंगी)/,
  // 26 Sep 2026 (fixer): suicidal thoughts, first person implied ("मुझे आत्महत्या के विचार आते हैं").
  /(?:आत्महत्या|खुदकुशी) (?:के|का) (?:विचार|ख्याल|खयाल)|(?:आत्महत्या|खुदकुशी) के बारे में (?:सोच रहा|सोच रही|सोचता|सोचती)/,
  // Telugu (script and romanised)
  /చనిపోవాల|చచ్చిపోవాల|చావాలని|బతకాలని లేదు|బ్రతకాలని లేదు|నన్ను నేను చంపుకో|ప్రాణం తీసుకో|ఆత్మహత్య చేసుకోవాల|ఆత్మహత్య చేసుకుంటా|ఆత్మహత్య ఆలోచన/,
  /\b(?:chanipovali|chanipovalani|chachipovali|chachipovalani|chavalani|bathakalani ledu|brathakalani ledu|bratakalani ledu|batakalani ledu)\b/,
  /\b(?:atmahatya|aatmahatya|suicide) (?:chesukovali|chesukovalani|chesukunta|chesukuntanu)\b/,
];

/**
 * The topic word alone: the helpline reply unless the question is plainly
 * academic and the asker is not the subject of the harm. 26 Sep 2026
 * (fixer): biology senses (suicide inhibition / inhibitor, suicide genes,
 * NEET) and essay-request words count as academic; "exam" no longer does — a
 * failed exam is where a teenager's distress most often starts.
 */
const DISTRESS_TOPIC = /\bsuicid\w*|\bself[- ]?harm\w*|\b(?:atmahatya|aatmahatya|khudkushi)\b|आत्महत्या|खुदकुशी|ఆత్మహత్య/;
const ACADEMIC_HARM =
  /\b(?:durkheim|sociolog\w*|theory|theories|rates?|ncrb|statistic\w*|data|prevention|prevent|essay|act|laws?|section|ipc|bns|309|awareness|report|case stud\w*|farmers?|kisan|mental healthcare|literature|novel|poem|psychology|upsc|chapter|decriminali\w*|euthanasia|article|causes|project|assignment|speech|debate|paragraph|inhibit\w*|inhibitors?|enzymes?|genes?|genetic\w*|biolog\w*|biochem\w*|neet|cells?|apoptosis|bacteri\w*|substrates?|mechanism)\b|किसान|निबंध|धारा|अधिनियम|रिपोर्ट|कारण|రైతు|వ్యాసం|చట్టం|సెక్షన్|కారణాలు/;
/**
 * The asker as the subject of the harm (26 Sep 2026, fixer — the old bare
 * "I / me / mujhe" test turned "give me an essay on farmer suicides" and "i
 * need notes on farmer suicides for upsc" into distress). Only feeling and
 * intent words may sit between the pronoun and the topic word: "i am thinking
 * about suicide", "i feel like committing suicide", "exam pressure is making
 * me think of suicide", "my self harm". First-person phrasings in Hindi and
 * Telugu are DISTRESS_ALWAYS patterns ("आत्महत्या करना चाहता",
 * "ఆత్మహత్య చేసుకోవాల", "आत्महत्या के विचार").
 */
const FP_FILLER = String.raw`(?:am|m|was|have|had|keep|kept|been|also|really|sometimes|often|always|just|still|now|seriously|actually|so|feel|feeling|felt|think|thinking|thought|want|wanted|wanting|wanna|plan|planning|planned|tried|try|trying|attempt|attempted|attempting|consider|considering|considered|going|gonna|will|would|getting|get|having|like|about|of|to|commit|committing|doing)`;
const HARM_WORD = String.raw`(?:suicid\w*|self[- ]?harm\w*)`;
const FIRST_PERSON_HARM = new RegExp(
  [
    String.raw`\b(?:i|i'm|im|i've|ive|i'll|i'd)(?: ${FP_FILLER}){0,6} ${HARM_WORD}`,
    String.raw`\bme (?:feel|feeling|think|thinking|want|wanting|consider|considering)(?: (?:like|of|about|to|commit|committing|doing))* ${HARM_WORD}`,
    String.raw`\bmy (?:own )?${HARM_WORD}`,
  ].join("|"),
);

/** True when the question shows a first-person sign of distress (the helpline reply, never a study page). */
export function isDistressQuery(question: string): boolean {
  const n = normScope(question);
  if (!n) return false;
  if (DISTRESS_ALWAYS.some((r) => r.test(n))) return true;
  return DISTRESS_TOPIC.test(n) && (FIRST_PERSON_HARM.test(n) || !ACADEMIC_HARM.test(n));
}
