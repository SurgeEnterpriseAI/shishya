// scripts/fix-bank-items-10-2026b.ts — 31 bank questions with a stale or
// false fact in the stem, an option or the solution, flagged by the ITV Shorts
// factory (13–14 Oct 2026) or found by a no-AI text scan of the served bank
// for the same faults (14 Oct 2026; 4 of them added by the review the same
// day: brics-bpsc, brics-upsssc-pet, cec-cuet, kgf-ksrp). All rows read with
// SELECT only.
//
// Why: Shishya serves these rows in mocks, quizzes and the tutor, and the ITV
// Shorts factory puts bank questions on YouTube. Every one passed the
// automatic checks (AI_VALIDATED, factoryVerify ACCEPT), so nothing else will
// catch them. The founder's rule: a wrong key, a false fact or a stale
// "current" fact is fixed or withdrawn.
//
//   family       rows  what is wrong → what this does
//   brics          7   "BRICS is an association of five major emerging economies": since
//                      Jan 2024 (Egypt, Ethiopia, Iran, UAE) and Jan 2025 (Indonesia) it has
//                      more members. Two copies (KPSC KAS, TSPSC Group 4) ask which country is
//                      NOT a member, keyed C Indonesia — now a member, so no option was right
//                      → option C reads Argentina (invited 2023, declined), stem says BRICS
//                      began as five and has expanded; key C kept. UPPSC "last to join" → asks
//                      which country joined in 2010 (key C South Africa kept). MPESB "most
//                      recently among the original five" → asks about the five members before
//                      the 2024 expansion. MPESB NDB → solution only ("BRICS consists of five"). BPSC
//                      "includes Brazil, Russia, India, China and which other country?" (option
//                      D Saudi Arabia, which official BRICS sources list) → asks for the five
//                      countries behind the name; key B South Africa kept. UPSSSC PET 2024
//                      expansion: key option said BRICS "admitted … Saudi Arabia" (unconfirmed)
//                      and the stem called BRICS "regional" → option B names the four 2024
//                      joiners, stem fixed; key B kept.
//   loksabha      12   "Maximum strength of the Lok Sabha" keyed 552. Article 81(1) gives 530 +
//                      20 = 550; the 2 Anglo-Indian seats (Article 331) ended on 25 Jan 2020
//                      (Article 334; not extended by the 104th Amendment). Six rows have no 550
//                      option → their "552" option now reads "550", key kept. Five rows have
//                      both 550 and 552 → re-keyed to 550 (rekeyedBy/rekeyedFrom). BR TET
//                      (Money Bill) → solution only: it called option A wrong while giving 552.
//   anglo          3   Anglo-Indian nomination stated as current: TN Police "can be nominated
//                      to the Lok Sabha" → stem in the past ("Until January 2020"); MPSC
//                      Group C Article 333 ("can the Governor nominate", and the solution said
//                      Art. 333 "empowers" the Governor) → stem (Marathi and English) in the
//                      past, solution. Its PYQ 2025 label is a PYQ-pattern build
//                      (scripts/build-full-pyq-papers.ts: fresh wording, never verbatim;
//                      metadata.fullPaperBuild), so the stem is not a past paper's text; TS
//                      Police Telangana Assembly "119 = 118 elected + 1 nominated" → 119
//                      elected (the nominee was extra, until 2023), stem no longer asks a
//                      "minimum".
//   cec            2   KPSC KAS, CEC appointed by the President (key right): the solution's
//                      committee had the Chief Justice; the 2023 Act has a Union Cabinet
//                      Minister → solution rewritten. CUET "Who was appointed CEC in May
//                      2023?" (nobody was: Rajiv Kumar took charge in May 2022) → asks who
//                      was CEC in May 2023; key B Rajiv Kumar kept.
//   uk             2   UKSSSC interim capital (key right): solution put the High Court in
//                      Dehradun (it is in Nainital) → solution. UPSSSC PET capital: solution
//                      called Gairsain the "winter capital" (it is the summer capital,
//                      Bhararisain, 2020) → solution.
//   plassey        2   UPSSSC PET: option C "Mir Qasim of Awadh" (he was Nawab of Bengal) →
//                      option C "Shuja-ud-Daulah of Awadh", key B kept. UP Police: solution
//                      said Mir Qasim succeeded Siraj-ud-Daulah (it was Mir Jafar; Mir Qasim
//                      in 1760) → solution.
//   raichur        1   PSSSB: "defeated the Bahmani Sultan at Raichur in 1520" — it was Ismail
//                      Adil Shah of Bijapur → stem fixed, key B kept.
//   selfrespect    1   TNPSC Group 2 (key 1925 right, one of Qwen's disagreements): the
//                      solution said Periyar left the Congress "due to discrimination at
//                      Vaikom" → solution rewritten (he left in 1925 over communal
//                      representation; at Vaikom he campaigned against caste rules).
//   kgf            1   KSRP, Karnataka the largest gold producer (key right): the solution
//                      named the Kolar Gold Fields among the "primary gold-producing areas"
//                      (KGF, in Kolar district, closed on 28 Feb 2001) → solution rewritten
//                      (Hutti, Raichur district).
//
// Not changed (decided, with references, in the dry run's notes): the other
// five key disagreements (Satavahana lead coins, DNH&DD merger 2020, HCF 20,
// Rudraprayag, Kshipra → Chambal) are keyed right; the scan's borderline rows
// are listed, never written.
//
// References (read 14 Oct 2026): en.wikipedia.org/wiki/BRICS; /wiki/Lok_Sabha
// ("currently it is 550"); constitutionofindia.net Articles 81 and 334;
// /wiki/Election_Commission_of_India and the 2023 Act's article; /wiki/
// Uttarakhand_High_Court (Nainital); /wiki/Gairsain (summer capital notified
// 8 June 2020); /wiki/Mir_Qasim (Nawab of Bengal 1760–63); /wiki/
// Battle_of_Plassey; /wiki/Battle_of_Raichur (19 May 1520, Bijapur);
// /wiki/Telangana_Legislative_Assembly (119 elected, one nominee till 2023);
// /wiki/Andhra_Pradesh_Reorganisation_Act,_2014 (294 → 175 + 119);
// /wiki/Periyar_and_the_Indian_National_Congress (Kanchipuram 1925).
//
// The write, per row, in one transaction (as scripts/fix-bank-items-10-2026.ts):
//   • the question's fields (stem, options, key, solution) with
//     metadata.bankFix (by, at, group, why, ref, previous key / stem / options /
//     solution), plus metadata.rekeyedBy / rekeyedFrom on a re-key. Nothing is
//     withdrawn here and a question is never deleted.
//   • its cached translations (QuestionTranslation) are removed with
//     clearQuestionTranslations(tx, id) (src/lib/question-translation-cache.ts),
//     in the same transaction: each one translates the OLD stem / options /
//     solution. The transaction first checks that the cache holds exactly the
//     rows the log holds (so the undo can put every one back) and that the
//     helper removed that many. The next reader in that language gets a fresh
//     translation of the fixed row; until then the question shows in English.
//     These cache rows are the ONLY delete.
//   Past attempts keep their stored grades; each solution's "Correction
//   (14 Oct 2026)" line tells a past taker what changed.
//
// Guards: dry run by default; --apply needs --only <all | family | group,…>;
// unknown flags are refused. Each row is found by its exact stem within its
// exam and topic — never by id alone — and must still have the options and key
// read on 14 Oct; a row missing, matched twice, held by another id, changed
// since or already fixed is printed and skipped. Another served row anywhere
// with the same old stem AND the same options (a copy not in this script) is
// a problem; an unserved copy, or a same-stem row with other options, is
// listed and left.
// Each plan re-runs its own check (first solution line names the new key and
// its text, the correction line, the family's rule) and is skipped if it fails.
// The undo log (status "pending") is on disk before the first write; every row
// is re-read inside the transaction and the run stops if anything changed.
//
// Undo: --apply writes data/fix-logs/fix-bank-items-10-2026b.<only>.<time>.json;
// --undo <file> is a dry run of the undo; --undo <file> --apply puts the
// questions back, removes any translation made since the fix (it translates
// the fixed text) and re-creates the logged ones, in one transaction.
//
// USAGE (from the repo root; .env.local is PRODUCTION):
//   npx tsx --env-file=.env.local scripts/fix-bank-items-10-2026b.ts                         # dry run, all 31
//   npx tsx --env-file=.env.local scripts/fix-bank-items-10-2026b.ts --apply --only all      # or --only brics,plassey-pet
//   npx tsx --env-file=.env.local scripts/fix-bank-items-10-2026b.ts --undo data/fix-logs/<file>.json [--apply]
//
// Tests: tests/unit/fix-bank-items-10-2026b.test.ts

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Prisma } from "@prisma/client";
import { clearQuestionTranslations } from "../src/lib/question-translation-cache";
import { WITHDRAWN_TAG } from "../src/lib/question-withdrawn";

export const LOG_DIR = "data/fix-logs";
export const LOG_STEM = "fix-bank-items-10-2026b";
export const TAG = "datafix:fix-bank-items-10-2026b";
export const SITE = "https://shishya.in";
export const FIX_DAY = "14 Oct 2026";

export interface Option {
  key: string;
  text: string;
}

/** A row as read on 14 Oct 2026 (SELECT): where it lives and what it asks. */
export interface AsRead {
  exam: string;
  topic: string;
  body: string;
  options: Option[];
  answerKey: string;
}

// ── The rows as read on 14 Oct 2026 (exact text; selection matches on it) ──

export const READ_14_OCT: Readonly<Record<string, AsRead>> = {
  "cmp1kx5gk015ctvg71om18aru": {
    exam: "KA_KPSC_KAS",
    topic: "gs.current_affairs.international",
    body: "BRICS is an association of five major emerging economies. Which country is NOT a member of BRICS?",
    options: [{ key: "A", text: "Brazil" }, { key: "B", text: "Russia" }, { key: "C", text: "Indonesia" }, { key: "D", text: "South Africa" }],
    answerKey: "C",
  },
  "cmp1m8yao02dytvg7rbxmk265": {
    exam: "TS_TSPSC_GROUP4",
    topic: "gs.current_affairs.intl",
    body: "BRICS is an association of five major emerging economies. Which country is NOT a member of BRICS?",
    options: [{ key: "A", text: "Brazil" }, { key: "B", text: "Russia" }, { key: "C", text: "Indonesia" }, { key: "D", text: "South Africa" }],
    answerKey: "C",
  },
  "cmp1mgaql02lftvg78tfms1kg": {
    exam: "UP_UPPSC_PCS",
    topic: "gs.current_events",
    body: "BRICS is an association of five major emerging economies. Which country was the last to join this group?",
    options: [{ key: "A", text: "Russia" }, { key: "B", text: "China" }, { key: "C", text: "South Africa" }, { key: "D", text: "India" }],
    answerKey: "C",
  },
  "cmp0qoanl0041jm3fyuob4ktz": {
    exam: "MP_MPESB",
    topic: "gk.intl_orgs",
    body: "BRICS is an association of five major emerging economies. Which country joined BRICS most recently among the original five members?",
    options: [{ key: "A", text: "Brazil" }, { key: "B", text: "Russia" }, { key: "C", text: "South Africa" }, { key: "D", text: "China" }],
    answerKey: "C",
  },
  "cmp0qofrc0045jm3fkhrd7emd": {
    exam: "MP_MPESB",
    topic: "gk.intl_orgs",
    body: "The New Development Bank (NDB), established in 2014 with headquarters in Shanghai, was created by which group of countries?",
    options: [{ key: "A", text: "SAARC member countries" }, { key: "B", text: "BRICS member countries" }, { key: "C", text: "ASEAN member countries" }, { key: "D", text: "G7 member countries" }],
    answerKey: "B",
  },
  "cmp1q44vr00058six3o3r7awg": {
    exam: "AP_APPSC_GROUP1",
    topic: "gs.indian_polity.political_system",
    body: "The maximum strength of the Lok Sabha as prescribed by the Constitution is:",
    options: [{ key: "A", text: "500" }, { key: "B", text: "530" }, { key: "C", text: "545" }, { key: "D", text: "552" }],
    answerKey: "D",
  },
  "cmozsc3ad00vvaral7fjp2xna": {
    exam: "SSC_GD",
    topic: "gd.gk.polity",
    body: "What is the maximum strength of the Lok Sabha as per the Constitution of India?",
    options: [{ key: "A", text: "525 members" }, { key: "B", text: "530 members" }, { key: "C", text: "545 members" }, { key: "D", text: "552 members" }],
    answerKey: "D",
  },
  "cmp0yxeut037njm3fh4kag8im": {
    exam: "MH_MAHATET",
    topic: "ss.civics.government",
    body: "The maximum strength of the Lok Sabha as per the Constitution of India is:",
    options: [{ key: "A", text: "530 members" }, { key: "B", text: "545 members" }, { key: "C", text: "552 members" }, { key: "D", text: "500 members" }],
    answerKey: "C",
  },
  "cmp03ezdd004zwf3znwyxyqcq": {
    exam: "TN_TNPSC_GROUP4",
    topic: "gs.polity",
    body: "What is the maximum strength of the Lok Sabha as provided in the Constitution of India?",
    options: [{ key: "A", text: "500 members" }, { key: "B", text: "530 members" }, { key: "C", text: "545 members" }, { key: "D", text: "552 members" }],
    answerKey: "D",
  },
  "cmp1m3u4g0282tvg7bx0q7naa": {
    exam: "TS_LAWCET",
    topic: "legal.parliament",
    body: "What is the maximum strength of the Lok Sabha as provided in the Constitution?",
    options: [{ key: "A", text: "500" }, { key: "B", text: "530" }, { key: "C", text: "545" }, { key: "D", text: "552" }],
    answerKey: "D",
  },
  "cmp1lmpa601setvg7mp6mlw14": {
    exam: "PB_POLICE_PC",
    topic: "pb.gk.indian_constitution.legislature",
    body: "What is the maximum strength of the Lok Sabha as provided in the Constitution?",
    options: [{ key: "A", text: "500" }, { key: "B", text: "530" }, { key: "C", text: "545" }, { key: "D", text: "552" }],
    answerKey: "D",
  },
  "cmozwpwqi00sp3zmld2d0xzcr": {
    exam: "UP_UPSSSC_PET",
    topic: "const.parliamentary_system",
    body: "What is the maximum strength of the Lok Sabha as provided under the Constitution of India?",
    options: [{ key: "A", text: "530 members" }, { key: "B", text: "545 members" }, { key: "C", text: "552 members" }, { key: "D", text: "550 members" }],
    answerKey: "C",
  },
  "cmozx3yx900yd3zml6vn4u4xz": {
    exam: "UP_UPSSSC_PET",
    topic: "ga.parliament",
    body: "What is the maximum strength of the Lok Sabha as per the Constitution of India?",
    options: [{ key: "A", text: "530 members" }, { key: "B", text: "545 members" }, { key: "C", text: "552 members" }, { key: "D", text: "550 members" }],
    answerKey: "C",
  },
  "cmp1el54j04gzwsox2br7sppn": {
    exam: "MP_TET",
    topic: "ss.civics.democracy",
    body: "Which of the following is the maximum strength of the Lok Sabha as per the Constitution of India?",
    options: [{ key: "A", text: "545 members" }, { key: "B", text: "552 members" }, { key: "C", text: "550 members" }, { key: "D", text: "530 members" }],
    answerKey: "B",
  },
  "cmp0z4s3d03bjjm3frcn6rsv2": {
    exam: "WB_POLICE_PC",
    topic: "gk.polity",
    body: "What is the maximum strength of the Lok Sabha as per the Constitution of India?",
    options: [{ key: "A", text: "530 members" }, { key: "B", text: "545 members" }, { key: "C", text: "550 members" }, { key: "D", text: "552 members" }],
    answerKey: "D",
  },
  "cmp1jqlgq003otvg7nxhda6h6": {
    exam: "AP_LAWCET",
    topic: "legal.parliament_executive",
    body: "What is the maximum strength of the Lok Sabha as per the Constitution?",
    options: [{ key: "A", text: "545" }, { key: "B", text: "550" }, { key: "C", text: "552" }, { key: "D", text: "530" }],
    answerKey: "C",
  },
  "cmp0xk9yw02n9jm3ftz0dnh0r": {
    exam: "BR_TET",
    topic: "ss.civics.democracy",
    body: "The Parliament of India consists of the President and two Houses. Which of the following statements about the two Houses is correct?",
    options: [{ key: "A", text: "The Lok Sabha has a maximum strength of 552 members, while the Rajya Sabha has a maximum strength of 250 members" }, { key: "B", text: "The Rajya Sabha is directly elected by the people, while the Lok Sabha members are nominated" }, { key: "C", text: "A Money Bill can be introduced only in the Lok Sabha" }, { key: "D", text: "Both Houses have equal powers in all legislative matters" }],
    answerKey: "C",
  },
  "cmp0ou9vn00cz6k7x7t41wqc5": {
    exam: "TN_POLICE_PC",
    topic: "gk.polity",
    body: "What is the maximum strength of members that can be nominated by the President to the Lok Sabha?",
    options: [{ key: "A", text: "2 members" }, { key: "B", text: "12 members" }, { key: "C", text: "10 members" }, { key: "D", text: "5 members" }],
    answerKey: "A",
  },
  "cmuk2gtwj000g59d758gz4msu": {
    exam: "TS_POLICE_PC",
    topic: "ts.state.administration",
    body: "What is the minimum number of members required in the Telangana Legislative Assembly as per the Andhra Pradesh Reorganisation Act, 2014?",
    options: [{ key: "A", text: "99 members" }, { key: "B", text: "119 members" }, { key: "C", text: "150 members" }, { key: "D", text: "175 members" }],
    answerKey: "B",
  },
  "cmskd2ijh003f70nsscwdkf8q": {
    exam: "MH_MPSC_GROUP_C",
    topic: "gs.polity.constitution",
    body: "भारतीय राज्यघटनेतील कोणत्या अनुच्छेदानुसार राज्यपाल राज्य विधानसभेच्या सदस्यांची नियुक्ती करू शकतो?\n\nUnder which Article of the Indian Constitution can the Governor nominate members to the State Legislative Assembly?",
    options: [{ key: "A", text: "अनुच्छेद 331 / Article 331" }, { key: "B", text: "अनुच्छेद 333 / Article 333" }, { key: "C", text: "अनुच्छेद 335 / Article 335" }, { key: "D", text: "अनुच्छेद 337 / Article 337" }],
    answerKey: "B",
  },
  "cmp1kx5gm015wtvg7t8wosqfz": {
    exam: "KA_KPSC_KAS",
    topic: "gs.current_affairs.appointments",
    body: "The Chief Election Commissioner of India is appointed by which authority?",
    options: [{ key: "A", text: "Prime Minister of India" }, { key: "B", text: "President of India" }, { key: "C", text: "Parliament of India" }, { key: "D", text: "Supreme Court of India" }],
    answerKey: "B",
  },
  "cmtyj3kwy000n26zpsbb5e1y1": {
    exam: "UK_UKSSSC",
    topic: "uk.formation",
    body: "Which city was designated as the interim capital of Uttarakhand upon its formation in 2000?",
    options: [{ key: "A", text: "Dehradun" }, { key: "B", text: "Nainital" }, { key: "C", text: "Haridwar" }, { key: "D", text: "Gairsain" }],
    answerKey: "A",
  },
  "cmozx3nwg00y73zmlzpv0wiq0": {
    exam: "UP_UPSSSC_PET",
    topic: "ga.states_uts",
    body: "Which of the following is the capital of Uttarakhand?",
    options: [{ key: "A", text: "Dehradun" }, { key: "B", text: "Nainital" }, { key: "C", text: "Haridwar" }, { key: "D", text: "Rishikesh" }],
    answerKey: "A",
  },
  "cmozwe5da00o13zmlmqsf55fx": {
    exam: "UP_UPSSSC_PET",
    topic: "history.british_rule",
    body: "The Battle of Plassey (1757) was fought between the English East India Company and which ruler?",
    options: [{ key: "A", text: "Tipu Sultan of Mysore" }, { key: "B", text: "Siraj-ud-Daulah of Bengal" }, { key: "C", text: "Mir Qasim of Awadh" }, { key: "D", text: "Nizam of Hyderabad" }],
    answerKey: "B",
  },
  "cmozuykjc005t3zml2mqoivnk": {
    exam: "UP_POLICE_CONSTABLE",
    topic: "gk.history",
    body: "The famous 'Battle of Plassey' was fought in 1757 between the British East India Company and which Indian ruler?",
    options: [{ key: "A", text: "Tipu Sultan" }, { key: "B", text: "Siraj-ud-Daulah" }, { key: "C", text: "Hyder Ali" }, { key: "D", text: "Mir Qasim" }],
    answerKey: "B",
  },
  "cmp1lns2901tjtvg7zbonq1gu": {
    exam: "PB_PSSSB",
    topic: "gk.history.medieval",
    body: "Which Vijayanagara ruler defeated the Bahmani Sultan at the Battle of Raichur in 1520?",
    options: [{ key: "A", text: "Harihara II" }, { key: "B", text: "Krishnadevaraya" }, { key: "C", text: "Devaraya II" }, { key: "D", text: "Achyutadevaraya" }],
    answerKey: "B",
  },
  "cmp0gvkzc05jvwf3z959h7mcf": {
    exam: "TN_TNPSC_GROUP2",
    topic: "tn.movements",
    body: "The Self-Respect Movement was founded by Periyar E.V. Ramasamy in which year?",
    options: [{ key: "A", text: "1916" }, { key: "B", text: "1920" }, { key: "C", text: "1925" }, { key: "D", text: "1930" }],
    answerKey: "C",
  },
  // Added by the review (14 Oct 2026, read with SELECT the same day).
  "cmp1jz3nq00bbtvg75iup0hga": {
    exam: "BR_BPSC_CCE",
    topic: "gs.current_events.international",
    body: "The BRICS group of nations includes Brazil, Russia, India, China and which other country?",
    options: [{ key: "A", text: "Spain" }, { key: "B", text: "South Africa" }, { key: "C", text: "Switzerland" }, { key: "D", text: "Saudi Arabia" }],
    answerKey: "B",
  },
  "cmozx2mm300xt3zmlpzdcxfb1": {
    exam: "UP_UPSSSC_PET",
    topic: "ca.international",
    body: "In early 2024, which regional organization admitted Egypt and which other country as new members, marking its first expansion in over a decade?",
    options: [{ key: "A", text: "ASEAN - admitted Myanmar and Laos" }, { key: "B", text: "BRICS - admitted Egypt, Ethiopia, Iran, Saudi Arabia, and UAE" }, { key: "C", text: "European Union - admitted Serbia and Albania" }, { key: "D", text: "Arab League - admitted South Sudan and Eritrea" }],
    answerKey: "B",
  },
  "cmp0jlp9e06otwf3zfz67rlw8": {
    exam: "CUET_UG",
    topic: "gen.current_affairs",
    body: "Who was appointed as the Chief Election Commissioner of India in May 2023?",
    options: [{ key: "A", text: "Sushil Chandra" }, { key: "B", text: "Rajiv Kumar" }, { key: "C", text: "Anup Chandra Pandey" }, { key: "D", text: "Arun Goel" }],
    answerKey: "B",
  },
  "cmu23yr5j00cdo8z9qlxvow37": {
    exam: "KA_KSRP",
    topic: "gs.geography",
    body: "Which of the following mineral resources is Karnataka the largest producer of in India?",
    options: [{ key: "A", text: "Bauxite" }, { key: "B", text: "Gold" }, { key: "C", text: "Copper" }, { key: "D", text: "Zinc" }],
    answerKey: "B",
  },
};

// ── Facts the checks use ─────────────────────────────────────────────────

/** BRICS full members on 14 Oct 2026 (en.wikipedia.org/wiki/BRICS). Saudi
 *  Arabia is left out: invited in 2023, listed by official BRICS sources,
 *  never publicly confirmed — no question here relies on its status. */
export const BRICS_MEMBERS = ["Brazil", "Russia", "India", "China", "South Africa", "Egypt", "Ethiopia", "Iran", "United Arab Emirates", "Indonesia"] as const;

/** Phrases that state a lapsed or false fact. A fixed stem / option must match
 *  none of them (solutions may quote the old text inside the correction line). */
export const STALE_IN_QUESTION: readonly RegExp[] = [
  /\bis an association of five\b/i,
  /\bMir Qasim of Awadh\b/i,
  /\bdefeated the Bahmani Sultan\b/i,
  /\bcan be nominated\b/i,
  /\bminimum number of members required\b/i,
  /\bcan the Governor nominate\b/i,
  /\bincludes Brazil, Russia, India, China and which\b/i,
  /\bregional organi[sz]ation\b/i,
  /\badmitted\b[^.?]*\bSaudi Arabia\b/i,
  /\bappointed as the Chief Election Commissioner\b/i,
];

// ── Targets ──────────────────────────────────────────────────────────────

export const FAMILIES = ["brics", "loksabha", "anglo", "cec", "uk", "plassey", "raichur", "selfrespect", "kgf"] as const;
export type Family = (typeof FAMILIES)[number];

export interface Target {
  family: Family;
  /** Unique name (for --only and the log). */
  group: string;
  /** The row read on 14 Oct 2026 (printed; another id holding the stem is a problem). */
  id: string;
  exam: string;
  topic: string;
  /** Exact stem, options and key as read on 14 Oct 2026. */
  body: string;
  options: Option[];
  answerKey: string;
  newBody?: string;
  newOptions?: Option[];
  newAnswerKey?: string;
  solution: string;
  why: string;
  /** Where the fact was checked (read 14 Oct 2026). */
  ref: string;
  /** The family's own re-check of the after-state: null when sound, else the reason to skip. */
  check?: (after: { body: string; options: Option[]; answerKey: string }) => string | null;
}

const READ = (id: string): AsRead => {
  const r = READ_14_OCT[id];
  if (!r) throw new Error(`no 14 Oct read for ${id}`);
  return r;
};
const textOf = (options: readonly Option[], key: string) => options.find((o) => o.key === key)?.text ?? "";
const withOption = (options: readonly Option[], key: string, text: string): Option[] => options.map((o) => (o.key === key ? { key, text } : { ...o }));
const correction = (s: string) => `Correction (${FIX_DAY}): ${s}`;
const lines = (...xs: string[]) => xs.join("\n");

// ── brics ────────────────────────────────────────────────────────────────

const BRICS_NOW =
  "BRICS has since expanded: Egypt, Ethiopia, Iran and the United Arab Emirates joined in January 2024, and Indonesia in January 2025. Saudi Arabia was also invited in 2023; official BRICS sources list it, but Saudi Arabia has not publicly confirmed that it joined.";

const BRICS_NOT_MEMBER_BODY = "BRICS began as a group of five major emerging economies and has since expanded. Which of these countries is NOT a member of BRICS?";
const bricsNotMemberOptions = (id: string) => withOption(READ(id).options, "C", "Argentina");
const BRICS_NOT_MEMBER_SOLUTION = lines(
  "Answer: C (Argentina).",
  "",
  "Brazil, Russia, India and China held the first BRIC summit in 2009. South Africa joined in December 2010, and the group became BRICS.",
  BRICS_NOW,
  "",
  "Argentina was invited at the Johannesburg summit in August 2023 but declined the invitation in December 2023, so it is not a member. Brazil, Russia and South Africa (options A, B and D) are members.",
  "",
  correction(
    "option C used to read Indonesia, and the solution said Indonesia was not a member. Indonesia became a full member of BRICS on 6 January 2025, so no option was correct. Option C now reads Argentina, and the question no longer says BRICS is five economies. The answer letter, C, is unchanged.",
  ),
);
const bricsNotMemberCheck = (after: { options: Option[]; answerKey: string }) => {
  const members = new Set<string>(BRICS_MEMBERS);
  const keyed = textOf(after.options, after.answerKey);
  if (members.has(keyed)) return `the keyed option ${keyed} is a BRICS member`;
  const others = after.options.filter((o) => o.key !== after.answerKey && !members.has(o.text));
  return others.length ? `options ${others.map((o) => o.text).join(", ")} are not members either` : null;
};

// ── loksabha ─────────────────────────────────────────────────────────────

const LS_WHY_NOT: Record<string, string> = {
  "500": "not the maximum today.",
  "525": "not the maximum today.",
  "530": "the cap for members chosen from the States alone.",
  "545": "the House's full strength until 2019: 543 elected members and 2 nominated Anglo-Indian members.",
  "552": "the maximum only until January 2020; it counted the 2 Anglo-Indian seats, which have since ended.",
};
const leadingNumber = (s: string) => s.match(/^\d+/)?.[0] ?? "";

/** The Lok Sabha solution for a row whose answer is the "550" option. */
export function lsSolution(options: readonly Option[], key: string, correctionText: string): string {
  const others = options.filter((o) => o.key !== key);
  return lines(
    `Answer: ${key} (${textOf(options, key)}).`,
    "",
    "Article 81(1) of the Constitution provides for not more than 530 members chosen by direct election from the States and not more than 20 members to represent the Union Territories. So the maximum strength of the Lok Sabha is 530 + 20 = 550.",
    "",
    "Until January 2020, Article 331 also allowed the President to nominate up to 2 members of the Anglo-Indian community, which made the maximum 552. Article 334 limited that nomination to 70 years from the commencement of the Constitution. The 104th Amendment Act, 2019 extended the reservation of seats for Scheduled Castes and Scheduled Tribes to 80 years but did not extend the Anglo-Indian nomination, so it ended on 25 January 2020. Older books and answer keys still give 552.",
    "",
    "Today all 543 seats of the Lok Sabha are filled by election; no member is nominated.",
    "",
    "Why not the others:",
    ...others.map((o) => `- ${o.key} (${o.text}): ${LS_WHY_NOT[leadingNumber(o.text)] ?? "not the maximum."}`),
    "",
    correction(correctionText),
  );
}
const lsCheck = (after: { options: Option[]; answerKey: string }) => {
  if (leadingNumber(textOf(after.options, after.answerKey)) !== "550") return `the keyed option reads ${JSON.stringify(textOf(after.options, after.answerKey))}, not 550`;
  const n550 = after.options.filter((o) => leadingNumber(o.text) === "550").length;
  return n550 === 1 ? null : `${n550} options read 550`;
};

/** A row without a 550 option: its "552" option is rewritten to "550", key kept. */
function lsOptionTarget(group: string, id: string): Target {
  const r = READ(id);
  const key = r.answerKey;
  const old = textOf(r.options, key);
  if (leadingNumber(old) !== "552") throw new Error(`${group}: keyed option is ${old}, expected 552`);
  const newOptions = withOption(r.options, key, old.replace(/^552/, "550"));
  return {
    family: "loksabha",
    group,
    id,
    ...r,
    newOptions,
    solution: lsSolution(
      newOptions,
      key,
      `option ${key} used to read ${old}, the maximum before the Anglo-Indian nomination ended in January 2020. It now reads ${textOf(newOptions, key)}, the maximum today. The answer letter, ${key}, is unchanged.`,
    ),
    why: `Keyed ${old}: the 2 Anglo-Indian seats ended on 25 Jan 2020 (Art. 334), so the maximum is 530 + 20 = 550; no option said 550. Option ${key} now reads ${textOf(newOptions, key)}; key kept.`,
    ref: "en.wikipedia.org/wiki/Lok_Sabha (maximum 550, was 552 before the Anglo-Indian seats ended); constitutionofindia.net Art. 81, 334",
    check: lsCheck,
  };
}
/** A row with both 550 and 552: re-keyed to 550. */
function lsRekeyTarget(group: string, id: string): Target {
  const r = READ(id);
  const newKey = r.options.find((o) => leadingNumber(o.text) === "550")?.key;
  if (!newKey) throw new Error(`${group}: no 550 option`);
  const old = textOf(r.options, r.answerKey);
  if (leadingNumber(old) !== "552") throw new Error(`${group}: keyed option is ${old}, expected 552`);
  return {
    family: "loksabha",
    group,
    id,
    ...r,
    newAnswerKey: newKey,
    solution: lsSolution(
      r.options,
      newKey,
      `this question was keyed ${r.answerKey} (${old}) until this date. 552 was the maximum only until the Anglo-Indian nomination ended in January 2020; the maximum today is 550, so the answer is now ${newKey}. If you chose ${newKey} (${textOf(r.options, newKey)}) before ${FIX_DAY}, your answer was right.`,
    ),
    why: `Keyed ${r.answerKey} (${old}): the 2 Anglo-Indian seats ended on 25 Jan 2020 (Art. 334), so the maximum is 530 + 20 = 550 = option ${newKey}. Re-keyed ${r.answerKey}→${newKey}.`,
    ref: "en.wikipedia.org/wiki/Lok_Sabha (maximum 550, was 552 before the Anglo-Indian seats ended); constitutionofindia.net Art. 81, 334",
    check: lsCheck,
  };
}

// ── The 31 targets ───────────────────────────────────────────────────────

function fix(group: string, family: Family, id: string, rest: Omit<Target, "group" | "family" | "id" | keyof AsRead>): Target {
  return { group, family, id, ...READ(id), ...rest };
}

export const TARGETS: readonly Target[] = [
  // brics
  fix("brics-kas", "brics", "cmp1kx5gk015ctvg71om18aru", {
    newBody: BRICS_NOT_MEMBER_BODY,
    newOptions: bricsNotMemberOptions("cmp1kx5gk015ctvg71om18aru"),
    solution: BRICS_NOT_MEMBER_SOLUTION,
    why: "Keyed C Indonesia as NOT a member; Indonesia joined BRICS on 6 Jan 2025, so no option was right, and BRICS is no longer five. Option C → Argentina (declined in Dec 2023); stem says BRICS began as five and has expanded; key C kept.",
    ref: "en.wikipedia.org/wiki/BRICS (Indonesia joined 6 Jan 2025; Argentina declined)",
    check: bricsNotMemberCheck,
  }),
  fix("brics-tspsc", "brics", "cmp1m8yao02dytvg7rbxmk265", {
    newBody: BRICS_NOT_MEMBER_BODY,
    newOptions: bricsNotMemberOptions("cmp1m8yao02dytvg7rbxmk265"),
    solution: BRICS_NOT_MEMBER_SOLUTION,
    why: "Exact copy of the KPSC KAS row (same stem, options, key C Indonesia). Indonesia joined BRICS on 6 Jan 2025. Same fix: option C → Argentina, stem says BRICS has expanded, key C kept.",
    ref: "en.wikipedia.org/wiki/BRICS (Indonesia joined 6 Jan 2025; Argentina declined)",
    check: bricsNotMemberCheck,
  }),
  fix("brics-uppsc", "brics", "cmp1mgaql02lftvg78tfms1kg", {
    newBody: "BRIC became BRICS when a fifth country joined the group in 2010. Which country was it?",
    solution: lines(
      "Answer: C (South Africa).",
      "",
      "Brazil, Russia, India and China held the first BRIC summit in 2009. South Africa joined in December 2010, and the group became BRICS. Russia, China and India (options A, B and D) were founding members of BRIC.",
      "",
      BRICS_NOW + " So South Africa is no longer the newest member.",
      "",
      correction(
        "the question used to call BRICS \"an association of five major emerging economies\" and ask which country was \"the last to join\". Since January 2024 other countries have joined after South Africa, so the question now asks which country joined in 2010. The answer, C, is unchanged.",
      ),
    ),
    why: "\"Last to join\" is no longer South Africa (Egypt, Ethiopia, Iran, UAE in 2024; Indonesia in 2025) and BRICS is not five. Stem now asks which country joined in 2010; key C South Africa kept.",
    ref: "en.wikipedia.org/wiki/BRICS (South Africa joined 24 Dec 2010; 2024 and 2025 joiners)",
  }),
  fix("brics-mpesb-joined", "brics", "cmp0qoanl0041jm3fyuob4ktz", {
    // Review (14 Oct): "began as five … which of the original five was the last to join"
    // contradicted itself (BRIC began as four; South Africa joined in 2010).
    newBody: "Until BRICS expanded in 2024, it had five members. Which of these five was the last to join the group?",
    solution: lines(
      "Answer: C (South Africa).",
      "",
      "Brazil, Russia, India and China held the first BRIC summit in 2009. South Africa joined in December 2010, and BRIC became BRICS. Brazil, Russia and China (options A, B and D) were founding members.",
      "",
      BRICS_NOW + " So BRICS is no longer a group of five.",
      "",
      correction(
        "the question used to say BRICS \"is an association of five major emerging economies\". It has had more members since January 2024, so the question now asks about the five members it had until then. The answer, C, is unchanged.",
      ),
    ),
    why: "Stem said BRICS \"is an association of five\"; it has had more members since Jan 2024. Stem now asks about the five members before the 2024 expansion; key C South Africa (the last of those five to join) kept.",
    ref: "en.wikipedia.org/wiki/BRICS",
  }),
  fix("brics-mpesb-ndb", "brics", "cmp0qofrc0045jm3fkhrd7emd", {
    solution: lines(
      "Answer: B (BRICS member countries).",
      "",
      "The New Development Bank (NDB) was set up by the BRICS countries, which were then Brazil, Russia, India, China and South Africa, at the 6th BRICS Summit in Fortaleza, Brazil, in July 2014. It mobilises resources for infrastructure and sustainable development projects in BRICS and other emerging economies, and its headquarters is in Shanghai, China.",
      "",
      "BRICS has since grown beyond those five: Egypt, Ethiopia, Iran and the United Arab Emirates joined in January 2024, and Indonesia in January 2025.",
      "",
      "Why not the others: SAARC is a South Asian regional organisation, ASEAN a Southeast Asian bloc and the G7 a group of developed economies; none of them created the NDB.",
      "",
      correction(
        "the earlier solution said BRICS \"consists of five major emerging economies\". Those five were its members when the NDB was founded; BRICS has had more members since January 2024. The answer, B, is unchanged.",
      ),
    ),
    why: "Key right; the solution said BRICS \"consists of five major emerging economies\" (more members since Jan 2024). Solution rewritten.",
    ref: "en.wikipedia.org/wiki/BRICS",
  }),
  fix("brics-bpsc", "brics", "cmp1jz3nq00bbtvg75iup0hga", {
    newBody: "The name BRICS comes from the initials of its first five members: Brazil, Russia, India, China and which other country?",
    solution: lines(
      "Answer: B (South Africa).",
      "",
      "Brazil, Russia, India and China held the first BRIC summit in 2009. South Africa joined in December 2010, and the group became BRICS: the final S stands for South Africa.",
      BRICS_NOW,
      "",
      "Why not the others: Spain and Switzerland are not members of BRICS. Saudi Arabia was invited to join in 2023, but it is not one of the five countries whose initials make up the name BRICS.",
      "",
      correction(
        "the question used to say BRICS \"includes Brazil, Russia, India, China and\" one other country, as if it still had five members. It has had more members since January 2024, and official BRICS sources also list Saudi Arabia (option D), so the question now asks about the five countries behind the name. The answer, B, is unchanged.",
      ),
    ),
    why: "Stem said BRICS \"includes Brazil, Russia, India, China and which other country\" (one more): BRICS has had more members since Jan 2024, and official BRICS sources list option D Saudi Arabia too. Stem now asks for the five countries behind the name; key B South Africa kept.",
    ref: "en.wikipedia.org/wiki/BRICS (South Africa joined 24 Dec 2010; Saudi Arabia listed by official sources, not confirmed by Saudi Arabia)",
    check: (after) => (textOf(after.options, after.answerKey) === "South Africa" ? null : "the keyed option is not South Africa"),
  }),
  fix("brics-upsssc-pet", "brics", "cmozx2mm300xt3zmlpzdcxfb1", {
    newBody: "In January 2024, which international group admitted Egypt as a new member, in its first expansion in over a decade?",
    newOptions: withOption(READ("cmozx2mm300xt3zmlpzdcxfb1").options, "B", "BRICS - admitted Egypt, Ethiopia, Iran and the UAE"),
    solution: lines(
      "Answer: B (BRICS - admitted Egypt, Ethiopia, Iran and the UAE).",
      "",
      "At its Johannesburg summit in August 2023, BRICS (then Brazil, Russia, India, China and South Africa) invited six countries to join from 1 January 2024: Argentina, Egypt, Ethiopia, Iran, Saudi Arabia and the United Arab Emirates. Egypt, Ethiopia, Iran and the UAE joined on that date, the group's first expansion since South Africa joined in 2010.",
      "",
      "Argentina declined the invitation in December 2023. Saudi Arabia is listed as a member by official BRICS sources, but Saudi Arabia has not publicly confirmed that it joined. Indonesia became a member in January 2025. BRICS is not a regional organisation: its members are spread across South America, Asia, Europe and Africa.",
      "",
      "Why not the others: Myanmar and Laos joined ASEAN in 1997; Serbia and Albania are candidates for membership of the European Union, not members; South Sudan and Eritrea are not members of the Arab League.",
      "",
      correction(
        "option B used to say BRICS admitted Saudi Arabia, and the question called BRICS a \"regional organization\" and asked for \"Egypt and which other country\". Saudi Arabia was invited but has not publicly confirmed that it joined, and BRICS is not a regional group. Option B now names the four countries that joined on 1 January 2024, and the question asks which group admitted Egypt. The answer, B, is unchanged.",
      ),
    ),
    why: "Key option B said BRICS \"admitted … Saudi Arabia\" in 2024 (invited; official BRICS sources list it, Saudi Arabia has not confirmed); the stem called BRICS a \"regional organization\" and asked for \"Egypt and which other country\" against options naming several. Option B → the four Jan 2024 joiners; stem fixed; key B kept.",
    ref: "en.wikipedia.org/wiki/BRICS (Egypt, Ethiopia, Iran, UAE joined 1 Jan 2024; Saudi Arabia disputed; Argentina withdrew 29 Dec 2023)",
    check: (after) => (after.options.some((o) => /Saudi/i.test(o.text)) ? "an option still says Saudi Arabia was admitted" : null),
  }),

  // loksabha — no 550 option: "552" → "550", key kept
  lsOptionTarget("ls-appsc", "cmp1q44vr00058six3o3r7awg"),
  lsOptionTarget("ls-sscgd", "cmozsc3ad00vvaral7fjp2xna"),
  lsOptionTarget("ls-mahatet", "cmp0yxeut037njm3fh4kag8im"),
  lsOptionTarget("ls-tnpsc4", "cmp03ezdd004zwf3znwyxyqcq"),
  lsOptionTarget("ls-tslawcet", "cmp1m3u4g0282tvg7bx0q7naa"),
  lsOptionTarget("ls-pbpolice", "cmp1lmpa601setvg7mp6mlw14"),
  // loksabha — both 550 and 552: re-keyed to 550
  lsRekeyTarget("ls-upsssc-a", "cmozwpwqi00sp3zmld2d0xzcr"),
  lsRekeyTarget("ls-upsssc-b", "cmozx3yx900yd3zml6vn4u4xz"),
  lsRekeyTarget("ls-mptet", "cmp1el54j04gzwsox2br7sppn"),
  lsRekeyTarget("ls-wbpolice", "cmp0z4s3d03bjjm3frcn6rsv2"),
  lsRekeyTarget("ls-aplawcet", "cmp1jqlgq003otvg7nxhda6h6"),
  fix("ls-brtet", "loksabha", "cmp0xk9yw02n9jm3ftz0dnh0r", {
    solution: lines(
      "Answer: C (A Money Bill can be introduced only in the Lok Sabha).",
      "",
      "Article 109(1) of the Constitution says a Money Bill shall not be introduced in the Rajya Sabha (Council of States), so it can be introduced only in the Lok Sabha; Article 110 defines what a Money Bill is. The Rajya Sabha can only make recommendations on it, within 14 days, which the Lok Sabha may accept or reject.",
      "",
      "Why not the others:",
      "- A: the Rajya Sabha's maximum is indeed 250 (up to 238 representatives of the States and Union Territories, and 12 members nominated by the President), but the Lok Sabha's maximum is now 550 (530 from the States + 20 from the Union Territories), not 552. The figure 552 counted the 2 Anglo-Indian members the President could nominate, a provision that ended on 25 January 2020.",
      "- B: it is the other way round. Lok Sabha members are directly elected by the people; Rajya Sabha members are elected indirectly by the elected members of the Legislative Assemblies, and 12 are nominated.",
      "- D: the Houses do not have equal powers. The Lok Sabha has the final say on Money Bills, and the Council of Ministers is responsible to the Lok Sabha alone.",
      "",
      correction(
        "the earlier solution called option A incorrect but gave 552 as the Lok Sabha's maximum, which would have made A correct. The maximum has been 550 since the Anglo-Indian nomination ended in January 2020, and that is why A is incorrect. The answer, C, is unchanged.",
      ),
    ),
    why: "Key C right; the solution called option A (\"Lok Sabha 552, Rajya Sabha 250\") wrong while itself giving 552. Since Jan 2020 the maximum is 550, which is why A is wrong. Solution rewritten (also cites Art. 109 for the Money Bill rule).",
    ref: "en.wikipedia.org/wiki/Lok_Sabha; constitutionofindia.net Art. 81, 334",
  }),

  // anglo
  fix("anglo-tnpolice", "anglo", "cmp0ou9vn00cz6k7x7t41wqc5", {
    newBody: "Until January 2020, up to how many members of the Anglo-Indian community could the President nominate to the Lok Sabha?",
    solution: lines(
      "Answer: A (2 members).",
      "",
      "Article 331 of the Constitution allowed the President, if of the opinion that the Anglo-Indian community was not adequately represented in the Lok Sabha, to nominate not more than 2 members of that community.",
      "",
      "Article 334 limited this nomination to 70 years from the commencement of the Constitution. The 104th Amendment Act, 2019 extended the reservation for Scheduled Castes and Scheduled Tribes to 80 years but not the Anglo-Indian nomination, so it ended on 25 January 2020. Since then no member of the Lok Sabha is nominated.",
      "",
      "Why not the others: 12 (option B) is the number of members the President nominates to the Rajya Sabha for their knowledge of literature, science, art and social service (Article 80); 10 and 5 are not the number of nominated members of either House.",
      "",
      correction(
        "the question used to ask how many members \"can be nominated\" to the Lok Sabha, as if the provision were still in force. It ended in January 2020, so the question now asks about the rule before then. The answer, A, is unchanged.",
      ),
    ),
    why: "Asked how many members \"can be nominated\" to the Lok Sabha; the Anglo-Indian nomination (Art. 331) ended on 25 Jan 2020. Stem now asks about the rule until Jan 2020; key A (2) kept.",
    ref: "constitutionofindia.net Art. 334; en.wikipedia.org/wiki/Lok_Sabha",
  }),
  fix("anglo-telangana", "anglo", "cmuk2gtwj000g59d758gz4msu", {
    newBody: "The Andhra Pradesh Reorganisation Act, 2014 provided for how many elected members in the Telangana Legislative Assembly?",
    solution: lines(
      "Answer: B (119 members).",
      "",
      "The Andhra Pradesh Reorganisation Act, 2014, which created Telangana on 2 June 2014, divided the 294 Assembly seats of undivided Andhra Pradesh: 175 went to the residuary Andhra Pradesh and 119 to Telangana. So the Telangana Legislative Assembly has 119 elected members.",
      "",
      "Until 2023 the Assembly also had one member of the Anglo-Indian community nominated by the Governor under Article 333, in addition to the 119. That nomination provision lapsed on 25 January 2020 (Article 334; the 104th Amendment Act, 2019 did not extend it), and the member already nominated served until the end of that Assembly's term in 2023.",
      "",
      "Why not the others: 175 (option D) is the Andhra Pradesh Assembly's figure; 99 and 150 are not figures from the Act.",
      "",
      correction(
        "the earlier solution said the 119 were made up of 118 elected members and 1 nominated Anglo-Indian member, and the question asked for a \"minimum number of members required\". In fact 119 is the number of elected seats (the nominated member was in addition), and the Act fixed the number of seats, not a minimum. The answer, B, is unchanged.",
      ),
    ),
    why: "Solution said 119 = 118 elected + 1 nominated Anglo-Indian; the Assembly has 119 elected seats (the nominee was extra, until 2023). Stem asked a \"minimum number required\"; the Act fixed the seats. Stem and solution fixed; key B kept.",
    ref: "en.wikipedia.org/wiki/Telangana_Legislative_Assembly (119 elected; one nominee till 2023); /wiki/Andhra_Pradesh_Reorganisation_Act,_2014 (294 → 175 + 119)",
  }),
  fix("anglo-art333", "anglo", "cmskd2ijh003f70nsscwdkf8q", {
    // Labelled PYQ 2025 (source PYQ, pyqYear 2025), but it is a PYQ-pattern build
    // (scripts/build-full-pyq-papers.ts: "fresh wording — never verbatim";
    // metadata.fullPaperBuild, metadata.sources = syllabus pages), not a past
    // paper's text, so its stale stem is fixed like any other row's.
    newBody:
      "जानेवारी 2020 पर्यंत भारतीय राज्यघटनेतील कोणत्या अनुच्छेदानुसार राज्यपाल अँग्लो-इंडियन समुदायाच्या एका सदस्याची राज्य विधानसभेवर नियुक्ती करू शकत होते?\n\nUntil January 2020, under which Article of the Indian Constitution could the Governor nominate a member of the Anglo-Indian community to the State Legislative Assembly?",
    solution: lines(
      "Answer: B (अनुच्छेद 333 / Article 333).",
      "",
      "Article 333 is the Article under which the Governor could nominate a member to the State Legislative Assembly. Note that this provision has lapsed: since 25 January 2020 no Governor can make such a nomination.",
      "",
      "Article 333 allowed the Governor of a State, if of the opinion that the Anglo-Indian community needed representation in the State Legislative Assembly and was not adequately represented in it, to nominate one member of that community to the Assembly.",
      "",
      "Article 334 limited this nomination to 70 years from the commencement of the Constitution. The 104th Amendment Act, 2019 did not extend it, so it lapsed on 25 January 2020; members already nominated stayed until their Assembly was dissolved.",
      "",
      "Why not the others: Article 331 was the matching provision for the Lok Sabha (up to 2 members, nominated by the President); Article 335 concerns the claims of Scheduled Castes and Scheduled Tribes to services and posts; Article 337 concerns educational grants for the benefit of the Anglo-Indian community.",
      "",
      correction(
        "the question used to ask under which Article the Governor \"can\" nominate members to the State Legislative Assembly, and the earlier solution said Article 333 \"empowers\" the Governor to do so, as if the provision were still in force. It lapsed on 25 January 2020, so the question now asks about the rule until then. The answer, B, is unchanged.",
      ),
    ),
    why: "Key B (Art. 333) right; the stem asked under which Article the Governor \"can\" nominate Assembly members and the solution said Art. 333 \"empowers\" the Governor, but that nomination lapsed on 25 Jan 2020. The PYQ 2025 label is a PYQ-pattern build (fresh wording), so the stem (Marathi and English) is put in the past and the solution rewritten.",
    ref: "constitutionofindia.net Art. 334 (clause (b), seventy years); scripts/build-full-pyq-papers.ts (PYQ-pattern, never verbatim)",
    check: (after) => (/जानेवारी 2020 पर्यंत/.test(after.body) && /^Until January 2020\b/m.test(after.body) ? null : "the stem is not in the past in both languages"),
  }),

  // cec
  fix("cec-kas", "cec", "cmp1kx5gm015wtvg7t8wosqfz", {
    solution: lines(
      "Answer: B (President of India).",
      "",
      "Article 324(2) of the Constitution provides that the Chief Election Commissioner and the other Election Commissioners are appointed by the President.",
      "",
      "Under the Chief Election Commissioner and Other Election Commissioners (Appointment, Conditions of Service and Term of Office) Act, 2023, the President appoints them on the recommendation of a Selection Committee of the Prime Minister (chairperson), the Leader of the Opposition in the Lok Sabha and a Union Cabinet Minister nominated by the Prime Minister.",
      "",
      "Before that Act, in March 2023, the Supreme Court had ordered (Anoop Baranwal v. Union of India) that until Parliament made a law the committee would be the Prime Minister, the Leader of the Opposition and the Chief Justice of India. The 2023 Act replaced the Chief Justice with the Cabinet Minister.",
      "",
      "Why not the others: the Prime Minister (A) chairs the committee but does not make the appointment; Parliament (C) made the law; the Supreme Court (D) has no role in the appointment today.",
      "",
      correction(
        "the earlier solution named the Chief Justice of India as a member of the recommending committee. Under the 2023 Act the third member is a Union Cabinet Minister nominated by the Prime Minister. The answer, B, is unchanged.",
      ),
    ),
    why: "Key B right; the solution's committee (PM, LoP, Chief Justice) is the Supreme Court's interim one of March 2023. The 2023 Act's committee is PM, LoP, a Cabinet Minister. Solution rewritten.",
    ref: "en.wikipedia.org/wiki/Election_Commission_of_India; /wiki/Chief_Election_Commissioner_and_Other_Election_Commissioners_(Appointment,_Conditions_of_Service_and_Term_of_Office)_Act,_2023",
  }),
  fix("cec-cuet", "cec", "cmp0jlp9e06otwf3zfz67rlw8", {
    newBody: "Who was the Chief Election Commissioner of India in May 2023?",
    solution: lines(
      "Answer: B (Rajiv Kumar).",
      "",
      "Rajiv Kumar took charge as Chief Election Commissioner on 15 May 2022, succeeding Sushil Chandra, and held the office until 18 February 2025, when Gyanesh Kumar succeeded him. So he was the Chief Election Commissioner throughout 2023.",
      "",
      "Why not the others: Sushil Chandra was Chief Election Commissioner from April 2021 until he retired on 14 May 2022. Anup Chandra Pandey and Arun Goel were Election Commissioners in May 2023, not the Chief Election Commissioner.",
      "",
      correction(
        "the question used to ask who was \"appointed\" Chief Election Commissioner in May 2023. Nobody was appointed to the post then: Rajiv Kumar took charge in May 2022. The question now asks who held the post in May 2023. The answer, B, is unchanged.",
      ),
    ),
    why: "Stem asked who was \"appointed\" CEC in May 2023 — nobody was: Rajiv Kumar took charge on 15 May 2022 (the old solution said so itself). Stem now asks who was CEC in May 2023; key B Rajiv Kumar kept.",
    ref: "en.wikipedia.org/wiki/Chief_Election_Commissioner_of_India (Rajiv Kumar 15 May 2022 – 18 Feb 2025; Sushil Chandra to 14 May 2022); /wiki/Anup_Chandra_Pandey (EC 9 Jun 2021 – 14 Feb 2024); /wiki/Arun_Goel (EC 21 Nov 2022 – 9 Mar 2024)",
    check: (after) => (/\bappointed\b/i.test(after.body) ? "the stem still asks who was appointed" : null),
  }),

  // uk
  fix("uk-interim", "uk", "cmtyj3kwy000n26zpsbb5e1y1", {
    solution: lines(
      "Answer: A (Dehradun).",
      "",
      "When Uttarakhand was formed on 9 November 2000, Dehradun was designated its interim (temporary) capital, pending a decision on a permanent one; Gairsain, more central to the hill districts, had long been proposed. Dehradun still houses the state secretariat and most government offices.",
      "",
      "In 2020 Bhararisain, near Gairsain in Chamoli district, was declared the summer capital (notified on 8 June 2020). Dehradun serves as the winter capital.",
      "",
      "Why not the others: Nainital is the seat of the Uttarakhand High Court (the state's judicial capital), not the capital; Haridwar is a pilgrimage city; Gairsain was not the capital in 2000.",
      "",
      correction("the earlier solution said Dehradun houses the state's high court. The Uttarakhand High Court sits in Nainital. The answer, A, is unchanged."),
    ),
    why: "Key A right; the solution said Dehradun houses the high court. The Uttarakhand High Court is in Nainital. Solution rewritten (also notes the 2020 summer capital).",
    ref: "en.wikipedia.org/wiki/Uttarakhand_High_Court (Nainital); /wiki/Gairsain (summer capital, notified 8 June 2020)",
  }),
  fix("uk-capital", "uk", "cmozx3nwg00y73zmlzpv0wiq0", {
    solution: lines(
      "Answer: A (Dehradun).",
      "",
      "Uttarakhand was formed on 9 November 2000 as the 27th state of India, carved out of Uttar Pradesh. Dehradun was made its capital, at first as an interim capital, and it houses the state secretariat and most government offices.",
      "",
      "In 2020 Bhararisain, near Gairsain in Chamoli district, was declared the state's summer capital (notified on 8 June 2020). Dehradun serves as the winter capital.",
      "",
      "Why not the others: Nainital is the seat of the Uttarakhand High Court; Haridwar and Rishikesh are pilgrimage cities, not capitals.",
      "",
      correction("the earlier solution said Gairsain was declared the winter capital in 2020. It was declared the summer capital (at Bhararisain); Dehradun is the winter capital. The answer, A, is unchanged."),
    ),
    why: "Key A right; the solution called Gairsain the \"winter capital\". Bhararisain (Gairsain) was declared the summer capital in 2020; Dehradun is the winter capital. Solution rewritten.",
    ref: "en.wikipedia.org/wiki/Gairsain (summer capital, notified 8 June 2020); /wiki/Uttarakhand (Dehradun winter capital)",
  }),

  // plassey
  fix("plassey-pet", "plassey", "cmozwe5da00o13zmlmqsf55fx", {
    newOptions: withOption(READ("cmozwe5da00o13zmlmqsf55fx").options, "C", "Shuja-ud-Daulah of Awadh"),
    solution: lines(
      "Answer: B (Siraj-ud-Daulah of Bengal).",
      "",
      "The Battle of Plassey was fought on 23 June 1757 between the East India Company's forces under Robert Clive and Siraj-ud-Daulah, the Nawab of Bengal. Siraj-ud-Daulah lost largely because his commander-in-chief, Mir Jafar, had secretly sided with the British and kept his troops out of the fight. Clive then made Mir Jafar the Nawab, and the Company gained control over Bengal's resources. The battle marked the beginning of British political dominance in India.",
      "",
      "Why not the others: Tipu Sultan of Mysore (ruled 1782–1799) fought the British in the Anglo-Mysore Wars; Shuja-ud-Daulah, Nawab of Awadh, fought them later, at Buxar in 1764, alongside Mir Qasim of Bengal and the Mughal emperor Shah Alam II; the Nizam of Hyderabad took no part in Plassey.",
      "",
      correction(
        "option C used to read \"Mir Qasim of Awadh\". Mir Qasim was Nawab of Bengal (1760–1763), not of Awadh, so option C now names Shuja-ud-Daulah of Awadh. The answer, B, is unchanged.",
      ),
    ),
    why: "Key B right; option C \"Mir Qasim of Awadh\" is false (Mir Qasim was Nawab of Bengal, 1760–63). Option C → \"Shuja-ud-Daulah of Awadh\"; solution rewritten.",
    ref: "en.wikipedia.org/wiki/Mir_Qasim (Nawab of Bengal 1760–1763; allied with Shuja-ud-Daula of Avadh at Buxar); /wiki/Battle_of_Plassey",
    check: (after) => (after.options.some((o) => /Mir Qasim/i.test(o.text)) ? "an option still names Mir Qasim" : null),
  }),
  fix("plassey-uppolice", "plassey", "cmozuykjc005t3zml2mqoivnk", {
    solution: lines(
      "Answer: B (Siraj-ud-Daulah).",
      "",
      "The Battle of Plassey was fought on 23 June 1757 at Plassey (present-day Palashi, West Bengal), between the British East India Company led by Robert Clive and Siraj-ud-Daulah, the Nawab of Bengal. It was decisive because Mir Jafar, the commander of Siraj's army, had secretly sided with the British and kept his troops out of the fight. The victory marked the beginning of British political dominance in India.",
      "",
      "After Plassey the British made Mir Jafar the Nawab of Bengal. Mir Qasim replaced him in 1760 and later fought the British at Buxar (1764).",
      "",
      "Why not the others: Tipu Sultan and Hyder Ali were rulers of Mysore who fought the British later, in the Anglo-Mysore Wars; Mir Qasim was not Nawab at the time of Plassey.",
      "",
      correction(
        "the earlier solution said Mir Qasim became Nawab of Bengal after Siraj-ud-Daulah was defeated. It was Mir Jafar who succeeded Siraj-ud-Daulah in 1757; Mir Qasim became Nawab in 1760. The answer, B, is unchanged.",
      ),
    ),
    why: "Key B right; the solution said Mir Qasim succeeded Siraj-ud-Daulah. Mir Jafar did (1757); Mir Qasim became Nawab in 1760. Solution rewritten.",
    ref: "en.wikipedia.org/wiki/Mir_Qasim (Nawab of Bengal 1760–1763); /wiki/Battle_of_Plassey (Clive placed Mir Jafar on the throne)",
  }),

  // raichur
  fix("raichur", "raichur", "cmp1lns2901tjtvg7zbonq1gu", {
    newBody: "Which Vijayanagara ruler defeated Ismail Adil Shah of Bijapur at the Battle of Raichur in 1520?",
    solution: lines(
      "Answer: B (Krishnadevaraya).",
      "",
      "Krishnadevaraya (ruled 1509–1529), of the Tuluva dynasty, defeated Ismail Adil Shah, the Sultan of Bijapur, at the Battle of Raichur on 19 May 1520 and took the Raichur fort, securing the Raichur Doab between the Krishna and the Tungabhadra. By then the Bahmani Sultanate had broken up into the Deccan Sultanates, and Bijapur was one of them.",
      "",
      "Why not the others: Harihara II and Devaraya II were earlier rulers of the Sangama dynasty; Achyutadevaraya succeeded Krishnadevaraya in 1529.",
      "",
      correction(
        "the question used to say Krishnadevaraya defeated \"the Bahmani Sultan\" at Raichur. His opponent there was Ismail Adil Shah of Bijapur. The answer, B, is unchanged.",
      ),
    ),
    why: "Key B right; the stem said the Bahmani Sultan was defeated at Raichur (1520). The opponent was Ismail Adil Shah of Bijapur. Stem and solution fixed.",
    ref: "en.wikipedia.org/wiki/Battle_of_Raichur (19 May 1520; Vijayanagara vs Sultanate of Bijapur, Ismail Adil Shah)",
  }),

  // selfrespect
  fix("selfrespect", "selfrespect", "cmp0gvkzc05jvwf3z959h7mcf", {
    solution: lines(
      "Answer: C (1925).",
      "",
      "E.V. Ramasamy (Periyar) launched the Self-Respect Movement in 1925, the year he left the Indian National Congress. It worked for a society without caste discrimination: equal rights and self-respect for non-Brahmin and lower-caste people, rationalism, opposition to Brahminical dominance, and support for inter-caste marriages and women's rights. It laid the foundation for the Dravidian movement.",
      "",
      "Why he left the Congress: for years he had tried to get the Tamil Nadu Congress to accept communal representation (reservation for non-Brahmin communities). At its 1925 conference at Kanchipuram he was not allowed to move that resolution, and he left. Before that he had clashed with the Congress-supported Gurukulam at Cheranmahadevi, where Brahmin and non-Brahmin pupils were made to eat separately.",
      "",
      "Vaikom: in 1924 Periyar took a leading part in the Vaikom Satyagraha in Travancore, against caste rules that kept lower castes off the roads around the Vaikom temple, and he was hailed as \"Vaikom Veerar\". It was a campaign against caste discrimination, not the reason he left the Congress.",
      "",
      correction(
        "the earlier solution said Periyar started the movement \"after leaving the Congress party due to discrimination at Vaikom\". He left the Congress in 1925 over its refusal of communal representation; at Vaikom he had campaigned against caste discrimination. The answer, C, is unchanged.",
      ),
    ),
    why: "Key C (1925) right (one of Qwen's disagreements); the solution said Periyar left the Congress \"due to discrimination at Vaikom\". He left in 1925 over communal representation (Kanchipuram); Vaikom was his 1924 campaign. Solution rewritten.",
    ref: "en.wikipedia.org/wiki/Periyar_and_the_Indian_National_Congress (Kanchipuram 1925, Gurukulam); /wiki/Periyar (Vaikom 1924, left Congress 1925); /wiki/Self-Respect_Movement (1925)",
  }),

  // kgf
  fix("kgf-ksrp", "kgf", "cmu23yr5j00cdo8z9qlxvow37", {
    solution: lines(
      "Answer: B (Gold).",
      "",
      "Karnataka is India's largest producer of gold. Its gold now comes mainly from the Hutti Gold Mines in Raichur district, run by the state-owned Hutti Gold Mines Company.",
      "",
      "The Kolar Gold Fields (KGF), in Kolar district, were once among the deepest gold mines in the world, but mining there stopped on 28 February 2001.",
      "",
      "Why not the others: Odisha is the largest producer of bauxite and Rajasthan of zinc, and most of India's copper ore comes from Madhya Pradesh and Rajasthan.",
      "",
      correction(
        "the earlier solution named the Kolar Gold Fields (KGF) and Hutti, \"in Raichur district\", as the state's primary gold-producing areas and said KGF mining had \"reduced\". KGF is in Kolar district and its mines closed in 2001; Karnataka's gold now comes mainly from Hutti, in Raichur district. The answer, B, is unchanged.",
      ),
    ),
    why: "Key B (gold) right; the solution named the Kolar Gold Fields among Karnataka's \"primary gold-producing areas\" and said KGF mining had \"reduced\" — KGF (Kolar district) closed on 28 Feb 2001; the gold comes from Hutti (Raichur district). Solution rewritten.",
    ref: "en.wikipedia.org/wiki/Kolar_Gold_Fields (Kolar district; closed 28 February 2001); ibm.gov.in Hutti mine report (Lingsugur taluk, Raichur district)",
  }),
];

export const GROUPS: readonly string[] = TARGETS.map((x) => x.group);

/** Key disagreements (Qwen chose another option) decided as keyed right, with nothing
 *  false in the row — no change. (The sixth, the Self-Respect year, is keyed right
 *  too; only its solution is fixed: group selfrespect.) */
export const KEPT_AS_IS: readonly { id: string; exam: string; why: string; ref: string }[] = [
  { id: "cmtzps85x000fcdohvwpm1ona", exam: "AP_APPSC_GROUP2", why: "Satavahana coins: lead (key C). They issued mainly lead and copper coins, lead the most; the standard exam answer is lead. Qwen's careful pass agreed.", ref: "en.wikipedia.org/wiki/Satavahana_dynasty#Coinage" },
  { id: "cmozx3nxp00y93zmlxi3xispn", exam: "UP_UPSSSC_PET", why: "DNH and DD merged into one UT on 26 Jan 2020 (key B 2020); the Act is of 2019, the merger took effect in 2020; capital Daman.", ref: "en.wikipedia.org/wiki/Dadra_and_Nagar_Haveli_and_Daman_and_Diu" },
  { id: "cmp0fgsfq0501wf3zjval0at2", exam: "TN_TNPSC_GROUP2", why: "Numbers 2k, 3k, 4k (k a whole number, since 3k − 2k = k): LCM 12k = 240 → k = 20 = HCF (key C). Checked: HCF(40,60,80) = 20, LCM = 240.", ref: "worked by hand" },
  { id: "cms9snm0m000d9us63574pstn", exam: "UK_UKSSSC", why: "Alaknanda + Mandakini meet at Rudraprayag (key D).", ref: "en.wikipedia.org/wiki/Rudraprayag" },
  { id: "cmp0qq8j30053jm3f2zyq9rqe", exam: "MP_MPESB", why: "The Shipra rises in Indore district and joins the Chambal (key C) at the MP–Rajasthan border; Qwen's \"Sindh → Narmada\" is wrong (the Sindh flows to the Yamuna). Solution's 195 km and Kakri Bardi hills check out.", ref: "en.wikipedia.org/wiki/Shipra_River" },
];

/** Rows a person checked on 14 Oct 2026 while reading the scan's keyword
 *  matches, and found fine (printed as "checked, fine" when a pattern hits). */
export const REVIEWED_OK: Readonly<Record<string, string>> = {
  cmp1q6dvo002r8sixl7dckwe7: "CEC appointed by the President; the Chief Justice is only a wrong option",
  cmp07vvma01wnwf3z7x1tjf71: "CEC appointed by the President; the Chief Justice is only a wrong option",
  cmu756jw1000hlnix4qsmosgf: "Chief Secretary question; no CEC appointment claim",
  cmsk9o2c600136kk52s7a8c5q: "Raichur Doab was contested by Vijayanagara and the Bahmani kingdom (true)",
  cmozwgtpq00p53zmlni5ut7z5: "Government of India Act 1935 separate electorates (historical)",
  cmozwk0rt00qf3zmlo08fafmc: "Gairsain correctly called the summer capital",
};

/** Borderline rows the scan found: listed in the dry run, NEVER written. */
export const BORDERLINE: Readonly<Record<string, string>> = {
  // (The review of 14 Oct moved four former borderline rows into the script:
  // brics-bpsc, brics-upsssc-pet, cec-cuet, kgf-ksrp.)
  cmp1l6pre01ebtvg76pjp2rsx: "MN MPSC NDB as the BRICS 'alternative to the World Bank and IMF': the Contingency Reserve Arrangement (option D) is the IMF-side alternative",
  cmp0pzpfg00th6k7xcld6amdb: "UPSC 'NOT a ground for removal of the CEC': option D (impeachment process) is a procedure, not a ground, so it is also 'not a ground'",
  cmshaukjq000f1qlbxwn6aetb: "APPSC Gr 2 'Vijayanagara reached its zenith under …' keyed Devaraya II (the Abdur Razzaq clue), with Krishnadevaraya as an option — 'zenith' is usually Krishnadevaraya",
};

// ── Rows, fields, selection ──────────────────────────────────────────────

export interface Row {
  id: string;
  body: string;
  options: unknown;
  answerKey: string;
  solution: string;
  validated: boolean;
  tags: string[];
  metadata: unknown;
  exam: { code: string };
  topic: { code: string };
}
export const ROW_SELECT = {
  id: true,
  body: true,
  options: true,
  answerKey: true,
  solution: true,
  validated: true,
  tags: true,
  metadata: true,
  exam: { select: { code: true } },
  topic: { select: { code: true } },
} as const;

export interface Fields {
  body: string;
  options: unknown;
  answerKey: string;
  solution: string;
  validated: boolean;
  tags: string[];
  metadata: unknown;
}
export const fieldsOf = (r: Pick<Row, keyof Fields>): Fields => ({
  body: r.body,
  options: r.options,
  answerKey: r.answerKey,
  solution: r.solution,
  validated: r.validated,
  tags: [...(r.tags ?? [])],
  metadata: r.metadata ?? null,
});

/** JSON with object keys sorted, so a jsonb round trip (which reorders keys)
 *  does not read as a change. */
export function canonical(v: unknown): string {
  return JSON.stringify(v, (_k, x) =>
    x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]])) : x,
  );
}
export const sameFields = (a: Fields, b: Fields) => canonical(a) === canonical(b);

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const served = (r: { validated: boolean; tags: string[] }) => r.validated && !(r.tags ?? []).includes(WITHDRAWN_TAG);

/** The after-state of a target's question (stem, options, key). */
export const afterQuestion = (t: Target) => ({ body: t.newBody ?? t.body, options: t.newOptions ?? t.options, answerKey: t.newAnswerKey ?? t.answerKey });

/** Every target's own re-check: the after-state is a sound question and the
 *  new solution names it. Null when sound, else the reason to skip. */
export function checkTarget(t: Target): string | null {
  const a = afterQuestion(t);
  const keys = (o: readonly Option[]) => o.map((x) => x.key).join("");
  if (keys(a.options) !== keys(t.options)) return `option letters changed (${keys(t.options)} → ${keys(a.options)})`;
  if (new Set(a.options.map((o) => o.text.trim().toLowerCase())).size !== a.options.length) return "two options read the same";
  const keyed = a.options.find((o) => o.key === a.answerKey);
  if (!keyed) return `no option ${a.answerKey}`;
  const first = t.solution.split("\n")[0];
  if (first !== `Answer: ${a.answerKey} (${keyed.text}).`) return `the solution's first line ${JSON.stringify(first)} does not name ${a.answerKey} (${keyed.text})`;
  if (!t.solution.includes(`Correction (${FIX_DAY}): `)) return "no correction line";
  if (/\b(wait|let me re-?check|hmm)\b/i.test(t.solution)) return "the solution thinks aloud";
  for (const re of STALE_IN_QUESTION) {
    if (re.test(a.body) || a.options.some((o) => re.test(o.text))) return `the fixed question still matches ${re}`;
  }
  return t.check ? t.check(a) : null;
}

export interface TargetPick {
  target: Target;
  row: Row;
}

/** One row per target, or a problem line: missing, already fixed, matched
 *  twice, held by another id, changed since the 14 Oct read, a copy of its
 *  stem and options outside the script, or failing its own re-check —
 *  printed and skipped, never guessed. `rows` are every row (any exam) whose
 *  stem equals a target's old or new stem. Also returns info lines: rows that
 *  share an old stem but have other options (different questions; left). */
export function selectTargets(rows: readonly Row[], groups: readonly string[]): { picks: TargetPick[]; problems: string[]; info: string[] } {
  const picks: TargetPick[] = [];
  const problems: string[] = [];
  const info: string[] = [];
  const targetIds = new Set(TARGETS.map((x) => x.id));
  for (const t of TARGETS.filter((x) => groups.includes(x.group))) {
    const say = (s: string) => problems.push(`${t.group}: ${s} — skipped`);
    const inPlace = (r: Row) => r.exam.code === t.exam && r.topic.code === t.topic;
    // Copies of the old stem elsewhere that the script does not name.
    for (const r of rows.filter((x) => x.body === t.body && !inPlace(x) && !targetIds.has(x.id))) {
      const exact = canonical(r.options) === canonical(t.options);
      if (exact && served(r)) problems.push(`${t.group}: ${r.id} (${r.exam.code}, served) is an exact copy (stem and options) not in this script — read it by hand`);
      else if (exact) info.push(`${t.group}: ${r.id} (${r.exam.code}, not served) is an exact copy (stem and options), already out of every pool — left`);
      else info.push(`${t.group}: ${r.id} (${r.exam.code}, ${served(r) ? "served" : "not served"}) has the same stem but other options — a different question, left`);
    }
    const found = rows.filter((r) => inPlace(r) && r.body === t.body);
    if (found.length === 0) {
      const fixed = t.newBody ? rows.filter((r) => inPlace(r) && r.body === t.newBody) : [];
      say(fixed.length ? `the new stem is already in place (${fixed.map((r) => r.id).join(", ")}): already fixed?` : `no ${t.exam} ${t.topic} row with the stem read on 14 Oct (missing or edited)`);
      continue;
    }
    if (found.length > 1) {
      say(`${found.length} rows match the stem (${found.map((r) => r.id).join(", ")}), never guessed`);
      continue;
    }
    const r = found[0];
    if (r.id !== t.id) {
      say(`the stem is held by ${r.id}, not ${t.id} as read on 14 Oct`);
      continue;
    }
    const a = afterQuestion(t);
    if (r.solution === t.solution || ((t.newOptions || t.newAnswerKey) && canonical(r.options) === canonical(a.options) && r.answerKey === a.answerKey)) {
      say("the new solution / options / key are already in place: already fixed?");
      continue;
    }
    if (canonical(r.options) !== canonical(t.options) || r.answerKey !== t.answerKey) {
      say(`options or key changed since the 14 Oct read (key ${r.answerKey}, options ${JSON.stringify(r.options)})`);
      continue;
    }
    if (!served(r)) {
      say(`no longer served (validated ${r.validated}, tags ${JSON.stringify(r.tags)}): left for a person`);
      continue;
    }
    const bad = checkTarget(t);
    if (bad) {
      say(`its own re-check failed: ${bad}`);
      continue;
    }
    picks.push({ target: t, row: r });
  }
  return { picks, problems, info };
}

// ── Translations (the cache this script clears) ──────────────────────────

export interface TrRow {
  id: string;
  questionId: string;
  locale: string;
  body: string;
  options: unknown;
  solution: string;
  hints: unknown;
  generator: string | null;
  createdAt: string;
}
export const TR_SELECT = { id: true, questionId: true, locale: true, body: true, options: true, solution: true, hints: true, generator: true, createdAt: true } as const;
export const trOf = (r: Omit<TrRow, "createdAt"> & { createdAt: Date | string }): TrRow => ({
  id: r.id,
  questionId: r.questionId,
  locale: r.locale,
  body: r.body,
  options: r.options,
  solution: r.solution,
  hints: r.hints ?? null,
  generator: r.generator ?? null,
  createdAt: new Date(r.createdAt).toISOString(),
});
export const sameTr = (a: TrRow, b: TrRow) => canonical(a) === canonical(b);
/** A question's translations as one comparable string (order-free). */
export const trSet = (xs: readonly TrRow[]) => canonical([...xs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)));

// ── Plan ─────────────────────────────────────────────────────────────────

export interface Planned {
  group: string;
  family: Family;
  questionId: string;
  exam: string;
  topic: string;
  before: Fields;
  after: Fields;
  /** Cached translations removed with the fix (whole rows, for the undo). */
  translations: TrRow[];
  why: string;
}

export function afterFields(t: Target, before: Fields, now: Date): Fields {
  const meta: Record<string, unknown> = isObj(before.metadata) ? { ...before.metadata } : {};
  const bankFix: Record<string, unknown> = { by: TAG, at: now.toISOString(), group: t.group, why: t.why, ref: t.ref, prevAnswerKey: before.answerKey, prevSolution: before.solution };
  if (t.newBody) bankFix.prevBody = before.body;
  if (t.newOptions) bankFix.prevOptions = before.options;
  meta.bankFix = bankFix;
  if (t.newAnswerKey && t.newAnswerKey !== before.answerKey) {
    meta.rekeyedBy = TAG;
    meta.rekeyedFrom = before.answerKey;
  }
  return {
    ...before,
    body: t.newBody ?? before.body,
    options: t.newOptions ?? before.options,
    answerKey: t.newAnswerKey ?? before.answerKey,
    solution: t.solution,
    metadata: meta,
  };
}

export function plan(picks: readonly TargetPick[], translations: ReadonlyMap<string, TrRow[]>, now: Date): Planned[] {
  return picks.map(({ target, row }) => {
    const before = fieldsOf(row);
    return {
      group: target.group,
      family: target.family,
      questionId: row.id,
      exam: target.exam,
      topic: target.topic,
      before,
      after: afterFields(target, before, now),
      translations: [...(translations.get(row.id) ?? [])],
      why: target.why,
    };
  });
}

/** Topic pages that can print these questions (ISR 10 min), for IndexNow after the apply. */
export function indexNowUrls(planned: readonly Pick<Planned, "exam" | "topic">[]): string[] {
  const out = new Set<string>();
  for (const p of planned) {
    out.add(`${SITE}/exams/${p.exam}/topics/${p.topic}`);
    out.add(`${SITE}/hi/exams/${p.exam}/topics/${p.topic}`);
  }
  return [...out];
}

// ── CLI ──────────────────────────────────────────────────────────────────

export interface Cli {
  apply: boolean;
  groups: string[];
  only: string;
  undoFile: string | null;
  log: string | null;
}

/** Parse argv (without node and the script). --only takes "all", family names
 *  and group names, comma-separated. Refuses unknown flags, a flag without its
 *  value, an unknown name, and --apply without --only. */
export function parseCli(argv: readonly string[]): Cli {
  const known = new Set(["--apply", "--only", "--undo", "--log"]);
  const takesValue = new Set(["--only", "--undo", "--log"]);
  const values: Record<string, string> = {};
  const flags = new Set<string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!known.has(a)) throw new Error(`unknown argument ${JSON.stringify(a)} — allowed: ${[...known].join(" ")}`);
    if (takesValue.has(a)) {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      values[a] = v;
      i++;
    } else flags.add(a);
  }
  const apply = flags.has("--apply");
  const undoFile = values["--undo"] ?? null;
  if (undoFile) {
    if (values["--only"]) throw new Error("--undo takes the log file only (the log says which rows it changed)");
    return { apply, groups: [], only: "all", undoFile, log: null };
  }
  const raw = values["--only"] ?? (apply ? "" : "all");
  if (!raw) throw new Error(`--apply needs --only all | ${FAMILIES.join(",")} | a group name (say which rows)`);
  const groups = new Set<string>();
  for (const name of raw.split(",").map((s) => s.trim())) {
    if (name === "all") TARGETS.forEach((x) => groups.add(x.group));
    else if ((FAMILIES as readonly string[]).includes(name)) TARGETS.filter((x) => x.family === name).forEach((x) => groups.add(x.group));
    else if (GROUPS.includes(name)) groups.add(name);
    else throw new Error(`unknown family or group ${JSON.stringify(name)} — families: ${FAMILIES.join(", ")}; groups: ${GROUPS.join(", ")} (or all)`);
  }
  return { apply, groups: GROUPS.filter((g) => groups.has(g)), only: raw, undoFile: null, log: values["--log"] ?? null };
}

// ── Write ────────────────────────────────────────────────────────────────

export interface LogEntry {
  group: string;
  questionId: string;
  exam: string;
  topic: string;
  before: Fields;
  after: Fields;
  /** apply: the cached translations it removed. undo: the ones made since the fix that it removed. */
  translations: TrRow[];
  /** undo only: the logged translations it re-created. */
  recreated?: TrRow[];
  why: string;
}
export interface LogFile {
  script: string;
  kind: "apply" | "undo";
  startedAt: string;
  status: "pending" | "applied" | "failed";
  only: string;
  undoOf?: string;
  entries: LogEntry[];
  error?: string;
}

/** The part of the Prisma client this script uses. The only delete is on
 *  the translation cache (clearQuestionTranslations); a question is only
 *  ever updated. */
export interface TxDb {
  question: {
    findUnique(args: unknown): Promise<unknown>;
    update(args: unknown): Promise<unknown>;
  };
  questionTranslation: {
    findMany(args: unknown): Promise<unknown[]>;
    deleteMany(args: { where: { questionId: string } }): Promise<{ count: number }>;
    create(args: unknown): Promise<unknown>;
  };
}
export interface Db {
  question: TxDb["question"] & { findMany(args: unknown): Promise<unknown[]> };
  questionTranslation: TxDb["questionTranslation"];
  mock: { findMany(args: unknown): Promise<unknown[]> };
  /** SELECT only (the scan report). */
  $queryRawUnsafe(sql: string, ...values: unknown[]): Promise<unknown>;
  $transaction<T>(fn: (tx: TxDb) => Promise<T>, opts?: { timeout?: number }): Promise<T>;
}

/** Prisma writes a JSON null as Prisma.DbNull, never as plain null. */
const jsonOrDbNull = (v: unknown) => (v === null || v === undefined ? Prisma.DbNull : (v as Prisma.InputJsonValue));
export const updateData = (f: Fields) => ({
  body: f.body,
  options: f.options as Prisma.InputJsonValue,
  answerKey: f.answerKey,
  solution: f.solution,
  validated: f.validated,
  tags: { set: f.tags },
  metadata: jsonOrDbNull(f.metadata),
});
const readQuestion = async (db: TxDb, id: string) => (await db.question.findUnique({ where: { id }, select: ROW_SELECT })) as Row | null;
/** Every cached translation of a question, by locale. */
export const readTranslations = async (db: Pick<TxDb, "questionTranslation">, questionId: string): Promise<TrRow[]> =>
  ((await db.questionTranslation.findMany({ where: { questionId }, select: TR_SELECT, orderBy: { locale: "asc" } })) as (Omit<TrRow, "createdAt"> & { createdAt: Date | string })[]).map(trOf);

export function writeLog(path: string, log: LogFile) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(log, null, 1));
}

/** Writes the plan in one transaction. The log (status "pending") is on disk
 *  before the first write; a write error or a row changed since the plan
 *  marks it "failed" and rethrows (nothing is written). */
export async function applyPlanned(db: Db, planned: readonly Planned[], logPath: string, only: string, say: (s: string) => void = console.log) {
  const entries: LogEntry[] = planned.map((p) => ({ group: p.group, questionId: p.questionId, exam: p.exam, topic: p.topic, before: p.before, after: p.after, translations: p.translations, why: p.why }));
  const log: LogFile = { script: LOG_STEM, kind: "apply", startedAt: new Date().toISOString(), status: "pending", only, entries };
  writeLog(logPath, log); // before any write: if this throws, nothing is written
  try {
    await db.$transaction(
      async (tx) => {
        for (const p of planned) {
          const now = await readQuestion(tx, p.questionId);
          if (!now || !sameFields(fieldsOf(now), p.before)) throw new Error(`question ${p.questionId} [${p.group}] changed since the plan — nothing written; re-run the dry run`);
          // The cache must be exactly what the log holds, so the undo can put all of it back.
          if (trSet(await readTranslations(tx, p.questionId)) !== trSet(p.translations)) throw new Error(`the cached translations of ${p.questionId} [${p.group}] changed since the plan — nothing written; re-run the dry run`);
          await tx.question.update({ where: { id: p.questionId }, data: updateData(p.after) });
          const cleared = await clearQuestionTranslations(tx, p.questionId);
          if (cleared !== p.translations.length) throw new Error(`cleared ${cleared} cached translation(s) of ${p.questionId}, the plan logged ${p.translations.length} — nothing written`);
        }
      },
      { timeout: 120_000 },
    );
    log.status = "applied";
  } catch (e) {
    log.status = "failed";
    log.error = (e as Error).message;
  }
  try {
    writeLog(logPath, log);
  } catch (e) {
    say(`Could not write the log (${(e as Error).message}); here it is:\n${JSON.stringify(log, null, 1)}`);
  }
  if (log.status === "failed") throw new Error(log.error);
  say(`\nAPPLIED ${entries.length} question fix(es), ${entries.reduce((n, e) => n + e.translations.length, 0)} cached translation(s) removed. Undo log: ${logPath}`);
  say(`Undo: npx tsx --env-file=.env.local scripts/${LOG_STEM}.ts --undo ${logPath.replace(/\\/g, "/")} --apply`);
}

/** Puts an applied log back: each question to its `before` (only if it still
 *  holds `after`); every translation made since the fix (of the fixed text)
 *  is removed through clearQuestionTranslations and every logged one (of the
 *  old text) re-created, in the same transaction. Dry run unless `apply`; the
 *  undo writes its own log first. */
export async function undo(db: Db, file: string, apply: boolean, logDir: string = LOG_DIR, say: (s: string) => void = console.log): Promise<{ restored: number; recreated: number; problems: string[] }> {
  const log = JSON.parse(readFileSync(file, "utf8")) as LogFile;
  // "pending": the run stopped between its commit and the log's last write.
  // Safe to undo — each row is restored only if it still holds `after`.
  if (log.script !== LOG_STEM || log.kind !== "apply" || (log.status !== "applied" && log.status !== "pending")) throw new Error(`${file} is not an applied log of ${LOG_STEM}`);
  say(`UNDO of ${file} (${log.entries.length} entries, ${log.status} ${log.startedAt}). ${apply ? "APPLY" : "DRY RUN"}\n`);
  if (log.status === "pending") say("  (the log says pending: the run may have stopped after its commit; only rows that still hold the logged change are restored)\n");
  const steps: { entry: LogEntry; current: Fields; since: TrRow[] }[] = [];
  const problems: string[] = [];
  for (const e of [...log.entries].reverse()) {
    const r = await readQuestion(db, e.questionId);
    if (!r) {
      problems.push(`${e.questionId} [${e.group}]: question not found — skipped`);
      continue;
    }
    const current = fieldsOf(r);
    if (!sameFields(current, e.after)) {
      problems.push(`${e.questionId} [${e.group}]: changed since this script wrote it — skipped, check by hand`);
      continue;
    }
    // Translations made since the fix translate the FIXED text: they go, and
    // the logged ones (of the old text) come back.
    steps.push({ entry: e, current, since: await readTranslations(db, e.questionId) });
  }
  for (const s of steps) {
    say(`  RESTORE ${s.entry.exam} ${s.entry.questionId} [${s.entry.group}]`);
    for (const k of Object.keys(s.current) as (keyof Fields)[]) {
      if (canonical(s.current[k]) !== canonical(s.entry.before[k])) say(`      ${k}: ${short(s.current[k])} → ${short(s.entry.before[k])}`);
    }
    for (const tr of s.since) say(`      remove translation ${tr.locale} (${tr.id}), made since the fix from the fixed text`);
    for (const tr of s.entry.translations) say(`      re-create translation ${tr.locale} (${tr.id})`);
  }
  for (const p of problems) say(`  ! ${p}`);
  if (!apply) {
    say("\nDry run — re-run with --apply to write.");
    return { restored: 0, recreated: 0, problems };
  }
  const logPath = join(logDir, `${LOG_STEM}.undo.${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
  const undoLog: LogFile = {
    script: LOG_STEM,
    kind: "undo",
    startedAt: new Date().toISOString(),
    status: "pending",
    only: log.only,
    undoOf: file,
    entries: steps.map((s) => ({ ...s.entry, before: s.current, after: s.entry.before, translations: s.since, recreated: s.entry.translations, why: `undo of ${file}` })),
  };
  writeLog(logPath, undoLog);
  try {
    await db.$transaction(
      async (tx) => {
        for (const s of steps) {
          const r = await readQuestion(tx, s.entry.questionId);
          if (!r || !sameFields(fieldsOf(r), s.current)) throw new Error(`question ${s.entry.questionId} changed during the undo — nothing written`);
          if (trSet(await readTranslations(tx, s.entry.questionId)) !== trSet(s.since)) throw new Error(`the cached translations of ${s.entry.questionId} changed during the undo — nothing written`);
          await tx.question.update({ where: { id: s.entry.questionId }, data: updateData(s.entry.before) });
          await clearQuestionTranslations(tx, s.entry.questionId);
          for (const tr of s.entry.translations) {
            await tx.questionTranslation.create({
              data: {
                id: tr.id,
                questionId: tr.questionId,
                locale: tr.locale,
                body: tr.body,
                options: tr.options as Prisma.InputJsonValue,
                solution: tr.solution,
                hints: jsonOrDbNull(tr.hints),
                generator: tr.generator,
                createdAt: new Date(tr.createdAt),
              },
            });
          }
        }
      },
      { timeout: 120_000 },
    );
    undoLog.status = "applied";
  } catch (e) {
    undoLog.status = "failed";
    undoLog.error = (e as Error).message;
  }
  writeLog(logPath, undoLog);
  if (undoLog.status === "failed") throw new Error(undoLog.error);
  const recreated = steps.reduce((n, s) => n + s.entry.translations.length, 0);
  const removed = steps.reduce((n, s) => n + s.since.length, 0);
  say(`\nUNDONE ${steps.length} question(s), ${removed} translation(s) of the fixed text removed, ${recreated} logged translation(s) re-created. Log: ${logPath}`);
  return { restored: steps.length, recreated, problems };
}

// ── Scan report (no AI; printed only) ────────────────────────────────────

/** The faults this script fixes, as text patterns over stem + options + solution. */
export const SCAN_PATTERNS: readonly { name: string; test: (text: string) => boolean }[] = [
  { name: "brics-five", test: (s) => /\bfive major emerging economies\b/i.test(s) || /\bBRICS\b[^.]{0,40}\b(is|consists of|comprises|comprising)\b[^.]{0,40}\bfive\b/i.test(s) },
  { name: "lok-sabha-552", test: (s) => /\b552\b/.test(s) && /Lok Sabha|House of the People/i.test(s) },
  { name: "anglo-indian-nomination", test: (s) => /Anglo[- ]Indian/i.test(s) && /nominat/i.test(s) },
  { name: "cec-chief-justice", test: (s) => /Election Commission/i.test(s) && /Chief Justice/i.test(s) },
  { name: "mir-qasim-awadh", test: (s) => /\bMir Qasim,?\s+(?:the\s+)?(?:Nawab\s+)?of\s+(?:Awadh|Oudh|Avadh)\b/i.test(s) },
  { name: "mir-qasim-after-siraj", test: (s) => /Mir Qasim[^.]{0,60}\bafter Siraj/i.test(s) },
  { name: "raichur-bahmani", test: (s) => /Bahmani[^.]{0,80}Raichur|Raichur[^.]{0,80}Bahmani/i.test(s) },
  { name: "gairsain-winter", test: (s) => /Gairsain[^.]{0,60}\bwinter\b|\bwinter capital[^.]{0,40}Gairsain/i.test(s) },
  { name: "dehradun-high-court", test: (s) => /Dehradun[^.]{0,160}\bhigh court\b/i.test(s) },
  { name: "vaikom-congress", test: (s) => /Vaikom[^.]{0,80}Congress|Congress[^.]{0,80}Vaikom/i.test(s) },
  // Added by the review (14 Oct 2026) with brics-bpsc, brics-upsssc-pet, cec-cuet, kgf-ksrp.
  { name: "brics-includes-one-more", test: (s) => /\bincludes Brazil, Russia, India,? (?:and )?China,? and which\b/i.test(s) },
  { name: "brics-saudi-joined", test: (s) => /\bBRICS\b/.test(s) && /\b(?:admitt(?:ed|ing)|joined)\b[^.?]{0,100}\bSaudi Arabia\b|\bSaudi Arabia\b(?![^.?]{0,40}\bnot\b)[^.?]{0,40}\b(?:joined|accepted|became a (?:full )?member)\b/i.test(s) },
  { name: "cec-appointed-2023-24", test: (s) => /\bappointed as the (?:new )?Chief Election Commissioner of India in (?:May )?202[34]\b/i.test(s) },
  { name: "kgf-producing", test: (s) => /Kolar Gold Fields[^.]{0,120}\b(?:primary|main|major|leading)\b[^.]{0,60}\bgold[- ]producing\b|\bKGF mining operations have reduced\b/i.test(s) },
];
export const SCAN_LIKE = ["%BRICS%", "%five major emerging%", "%552%", "%Anglo%Indian%", "%Election Commission%", "%Mir Qasim%", "%Raichur%", "%Gairsain%", "%Dehradun%", "%Vaikom%", "%Kolar Gold%"];
export const SCAN_SQL = `SELECT q.id, q.body, q.options, q."answerKey", q.solution, q.validated, q.tags, e.code AS exam
  FROM "Question" q JOIN "Exam" e ON e.id = q."examId"
 WHERE (q.body || ' ' || q.solution || ' ' || q.options::text) ILIKE ANY ($1::text[])
 ORDER BY q.id`;

export interface ScanRow {
  id: string;
  body: string;
  options: unknown;
  answerKey: string;
  solution: string;
  validated: boolean;
  tags: string[];
  exam: string;
}
export type ScanFate = "in script" | "borderline (left)" | "checked, fine" | "not served (left)" | "NOT in this script (read it by hand)";
export function scanFate(r: ScanRow): ScanFate {
  if (TARGETS.some((x) => x.id === r.id)) return "in script";
  if (BORDERLINE[r.id]) return "borderline (left)";
  if (REVIEWED_OK[r.id]) return "checked, fine";
  if (!served(r)) return "not served (left)";
  return "NOT in this script (read it by hand)";
}
export function scanHits(r: ScanRow): string[] {
  const text = `${r.body}\n${JSON.stringify(r.options)}\n${r.solution}`;
  return SCAN_PATTERNS.filter((p) => p.test(text)).map((p) => p.name);
}

/** The scan: every row whose text matches a pattern, with its fate. */
export async function scanReport(db: Db, say: (s: string) => void): Promise<Record<ScanFate, number>> {
  const rows = (await db.$queryRawUnsafe(SCAN_SQL, SCAN_LIKE)) as ScanRow[];
  const tally = { "in script": 0, "borderline (left)": 0, "checked, fine": 0, "not served (left)": 0, "NOT in this script (read it by hand)": 0 } as Record<ScanFate, number>;
  const hits = rows.map((r) => ({ r, hits: scanHits(r) })).filter((x) => x.hits.length);
  say(`\nSCAN (no AI): ${rows.length} rows mention a keyword; ${hits.length} match a fault pattern:`);
  for (const { r, hits: h } of hits) {
    const fate = scanFate(r);
    tally[fate]++;
    const note = fate === "borderline (left)" ? ` — ${BORDERLINE[r.id]}` : fate === "checked, fine" ? ` — ${REVIEWED_OK[r.id]}` : fate === "in script" ? ` — group ${TARGETS.find((x) => x.id === r.id)!.group}` : "";
    say(`  ${fate.padEnd(36)} ${r.exam.padEnd(20)} ${r.id} [${h.join(", ")}]${note}`);
  }
  const listed = new Set(hits.map((x) => x.r.id));
  for (const [id, why] of Object.entries(BORDERLINE)) if (!listed.has(id)) say(`  borderline (left)                    ${id} — ${why}`);
  say(`  tally: ${Object.entries(tally).map(([k, n]) => `${k} ${n}`).join(" · ")}`);
  return tally;
}

// ── Run ──────────────────────────────────────────────────────────────────

function short(v: unknown, max = 160): string {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  const one = (s ?? "null").replace(/\s+/g, " ");
  return JSON.stringify(one.length > max ? `${one.slice(0, max)}…` : one);
}

interface MockUse {
  id: string;
  title: string;
  userId: string | null;
  questionIds: string[];
  _count: { attempts: number };
}

export interface RunOpts {
  now?: Date;
  say?: (s: string) => void;
  logDir?: string;
}

export async function run(argv: readonly string[], db: Db, opts: RunOpts = {}): Promise<{ planned: Planned[]; problems: string[]; applied: boolean }> {
  const cli = parseCli(argv);
  const say = opts.say ?? console.log;
  const logDir = opts.logDir ?? LOG_DIR;
  if (cli.undoFile) {
    if (!existsSync(cli.undoFile)) throw new Error(`no such log: ${cli.undoFile}`);
    await undo(db, cli.undoFile, cli.apply, logDir, say);
    return { planned: [], problems: [], applied: cli.apply };
  }
  const now = opts.now ?? new Date();
  const targets = TARGETS.filter((x) => cli.groups.includes(x.group));
  const bodies = [...new Set(targets.flatMap((x) => [x.body, ...(x.newBody ? [x.newBody] : [])]))];
  const rows = (await db.question.findMany({ where: { body: { in: bodies } }, select: ROW_SELECT, orderBy: { id: "asc" } })) as Row[];
  const { picks, problems, info } = selectTargets(rows, cli.groups);
  const trByQ = new Map<string, TrRow[]>();
  for (const p of picks) {
    trByQ.set(p.row.id, await readTranslations(db, p.row.id));
  }
  const planned = plan(picks, trByQ, now);

  say(`Bank fixes (14 Oct 2026: ITV Shorts factory flags + same-fault scan) — only: ${cli.only}. ${cli.apply ? "APPLY" : "DRY RUN (nothing is written)"}`);
  say(`Planned ${planned.length}; problems ${problems.length}.\n`);
  for (const p of planned) {
    const tg = TARGETS.find((x) => x.group === p.group)!;
    const mocks = (await db.mock.findMany({ where: { questionIds: { has: p.questionId } }, select: { id: true, title: true, userId: true, questionIds: true, _count: { select: { attempts: true } } } })) as MockUse[];
    const sys = mocks.filter((m) => m.userId === null);
    say(`── [${p.group}] FIX ${p.exam} ${p.topic} ${p.questionId}`);
    say(`   why: ${p.why}`);
    say(`   ref: ${tg.ref}`);
    for (const k of ["body", "options", "answerKey", "validated", "tags"] as const) {
      if (canonical(p.before[k]) !== canonical(p.after[k])) say(`   ${k}: ${short(p.before[k], 400)}\n      → ${short(p.after[k], 400)}`);
    }
    say(`   metadata adds: ${Object.keys(p.after.metadata as object).filter((k) => !isObj(p.before.metadata) || !(k in p.before.metadata)).join(", ")}`);
    say(`   solution (old): ${short(p.before.solution, 300)}`);
    say(`   solution (new):\n${tg.solution.split("\n").map((l) => `      | ${l}`).join("\n")}`);
    say(`   used in: ${sys.length} system mock(s)${sys.length ? ` (${sys.map((m) => `"${m.title}" slot ${m.questionIds.indexOf(p.questionId) + 1}, ${m._count.attempts} attempt(s)`).join("; ")})` : ""}, ${mocks.length - sys.length} personal mock(s)`);
    const trs = trByQ.get(p.questionId) ?? [];
    if (!trs.length) say("   translations: none cached");
    else say(`   translations removed (re-translated from the fixed row on the next read): ${trs.map((x) => `${x.locale} ${x.id} (${x.generator ?? "?"}, ${x.createdAt.slice(0, 10)})`).join(", ")}`);
    say("");
  }
  for (const p of problems) say(`  ! ${p}`);
  for (const i of info) say(`  · ${i}`);

  say(`\nKEY DISAGREEMENTS KEPT AS KEYED (no change):`);
  for (const k of KEPT_AS_IS) say(`  ${k.exam.padEnd(18)} ${k.id} — ${k.why} (${k.ref})`);

  await scanReport(db, say);

  say(`\nINDEXNOW after the apply (topic pages that can print these questions; ${indexNowUrls(planned).length} URLs):`);
  for (const u of indexNowUrls(planned)) say(`  ${u}`);
  say("");

  const totals = { rows: planned.length, rekeyed: planned.filter((p) => p.before.answerKey !== p.after.answerKey).length, stems: planned.filter((p) => p.before.body !== p.after.body).length, options: planned.filter((p) => canonical(p.before.options) !== canonical(p.after.options)).length, translations: planned.reduce((n, p) => n + p.translations.length, 0) };
  say(`Totals: ${totals.rows} rows (${totals.rekeyed} re-keyed, ${totals.stems} stems, ${totals.options} option sets, every solution rewritten); ${totals.translations} cached translation(s) removed; ${problems.length} problem(s).`);
  if (!cli.apply) {
    say(`Dry run — nothing written. Write with --apply --only all (or a comma list of families: ${FAMILIES.join(", ")}, or group names).`);
    return { planned, problems, applied: false };
  }
  if (planned.length === 0) {
    say("Nothing to write.");
    return { planned, problems, applied: false };
  }
  const logPath = cli.log ?? join(logDir, `${LOG_STEM}.${cli.only.replace(/[^a-z0-9,-]/g, "").replace(/,/g, "+").slice(0, 60)}.${now.toISOString().replace(/[:.]/g, "-")}.json`);
  await applyPlanned(db, planned, logPath, cli.only, say);
  return { planned, problems, applied: true };
}

async function main() {
  const { prisma } = await import("../src/lib/db/prisma");
  try {
    await run(process.argv.slice(2), prisma as unknown as Db);
  } finally {
    await prisma.$disconnect();
  }
}

if (/fix-bank-items-10-2026b\.[cm]?[jt]s$/.test(process.argv[1] ?? "")) {
  main().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
}
