// /recognition title, description, JSON-LD text and intro (26 Sep 2026).
//
// The page is a scaffold until the first window opens (RECOGNITION_ACTIVATION),
// yet its meta and CollectionPage JSON-LD said Shishya "celebrates the top
// community contributors", naming the two senior badge tiers — on 26 Sep 2026
// no user held any badge level above NEWCOMER. The copy is now tense-aware:
// future tense until the first window opens, then the programme as it runs.
// Months, days, the list size and years all come from RECOGNITION_ACTIVATION
// and recognitionStatus(); nothing is typed.

import { RECOGNITION_ACTIVATION, type RecognitionStatus } from "@/lib/db/recognition";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface RecognitionCopy {
  title: string;
  description: string;
  /** CollectionPage JSON-LD name. */
  ldName: string;
  /** First paragraph under the H1. */
  intro: string;
}

export function recognitionCopy(status: RecognitionStatus): RecognitionCopy {
  const A = RECOGNITION_ACTIVATION;
  const openMonth = MONTHS[A.WINDOW_OPEN_MONTH - 1];
  const closeMonth = MONTHS[A.WINDOW_CLOSE_MONTH - 1];
  // Last day of the closing month (day 0 of the following month).
  const closeDay = new Date(Date.UTC(2001, A.WINDOW_CLOSE_MONTH, 0)).getUTCDate();
  const who = "the students who confirmed, flagged or corrected facts on the site";
  const noMoney = "No money, just recognition.";
  const currency = "Recognition is the only currency on Shishya — there is no money in this system, ever.";

  if (status.kind === "ACTIVE") {
    return {
      title: `Annual Recognition ${status.year} — top contributors | Shishya`,
      description:
        `Shishya's ${status.year} recognition list, open until ${closeDay} ${closeMonth}: the top ${A.TOP_N} of ${who} this year, ranked by points. ${noMoney}`,
      ldName: `Annual Recognition ${status.year}`,
      intro: `Once a year, Shishya recognises ${who}. ${currency}`,
    };
  }
  const next = status.nextActivationYear;
  const firstWindowOpened = next > A.FIRST_YEAR;
  if (!firstWindowOpened) {
    return {
      title: `Annual Recognition — opens ${openMonth} ${next} | Shishya`,
      description:
        `From 1 ${openMonth} ${next}, Shishya will recognise ${who} that year: a top-${A.TOP_N} list open until ${closeDay} ${closeMonth}. How the points, tie-breakers and privacy will work. ${noMoney}`,
      ldName: "Annual Recognition",
      intro: `From ${openMonth} ${next}, Shishya will recognise, once a year, ${who}. ${currency}`,
    };
  }
  return {
    title: `Annual Recognition — next list opens ${openMonth} ${next} | Shishya`,
    description:
      `Once a year, from 1 ${openMonth} to ${closeDay} ${closeMonth}, Shishya lists the top ${A.TOP_N} of ${who}. The next list opens on 1 ${openMonth} ${next}. ${noMoney}`,
    ldName: "Annual Recognition",
    intro: `Once a year, Shishya recognises ${who}. ${currency}`,
  };
}
