"use client";

// The guest tutor's unanswered-question door (7 Oct 2026, B6 — the flow and
// its rules: src/lib/guest-question-carry.ts).
//
// The guest's question failed because the AI tutor was unavailable, and this
// browser kept it. Under the notice, the standing sign-up pattern:
//   • the reason line, "Sign up free and we'll answer this question here as
//     soon as the tutor is back." (src/lib/tutor-unavailable.ts, en / hi / te),
//     marked data-su-reason: the button's own visible line (explain="own", as
//     the save card and the banner — never a second caption under it);
//   • the shared white "Sign up with Google" button (src/components/
//     SignUpButton.tsx) under the door id "chat-unanswered", whose link returns
//     to this chat; its tooltip is the save card's entry (src/lib/
//     signup-place.ts — "the chats you have from then on are saved"). It is a
//     SignInLink: the press sends the one "signin-click"; the chat's capture
//     listener (and onSignInClick here) keeps the question for the account;
//   • the age line, "Free · … · For students 13 and above" — the 401 doors'
//     small print (src/lib/content-signup.ts nudgeBarCopy).
// One { cta: "signin-door", action: "shown", surface: "chat-unanswered",
// examCode, impression: true } when it opens (review, 8 Oct 2026: flagged as
// an impression like the first-answer card's — it is not a press, as a 401
// door's is: src/lib/signin-cta.ts doorShownIsPress).
// The caller decides whether it shows (guestQuestionDoor: never a school chat,
// never after the under-13 line, never a kids' exam chat). The tooltip opens
// above the button: like the save card, this sits at the end of the scrolling
// message pane.

import { useEffect } from "react";
import { SignUpButton } from "@/components/SignUpButton";
import { nudgeBarCopy } from "@/lib/content-signup";
import { CHAT_QUESTION_DOOR, signinDoorShownBeacon } from "@/lib/signin-cta";
import { guestQuestionDoorReason } from "@/lib/tutor-unavailable";

export function GuestQuestionDoor({
  href,
  locale,
  exam,
  examCode,
  onSignInClick,
}: {
  /** The chat's /login link (it returns to this chat) with &from=chat-unanswered. */
  href: string;
  /** The chat's UI language (en / hi / te; anything else reads English). */
  locale: string;
  /** The exam's short name, for the button's words; null in the general chat. */
  exam?: string | null;
  examCode: string | null;
  /** Keeps the question for the account (the chat's own bookkeeping). */
  onSignInClick?: () => void;
}) {
  useEffect(() => {
    signinDoorShownBeacon(CHAT_QUESTION_DOOR, { examCode, impression: true });
  }, [examCode]);
  return (
    <div data-signin-door={CHAT_QUESTION_DOOR} className="rounded-md border border-saffron-200 bg-saffron-50/60 p-3">
      <p data-su-reason className="text-center text-sm font-semibold text-ink-900">{guestQuestionDoorReason(locale)}</p>
      <SignUpButton
        href={href}
        surface="chat-unanswered"
        locale={locale}
        exam={exam}
        examCode={examCode}
        beaconProps={{ examCode }}
        explain="own"
        side="top"
        block
        className="mt-2"
        onSignInClick={onSignInClick}
      />
      <p className="mt-1 text-center text-[11px] text-ink-500">{nudgeBarCopy(locale).privacy}</p>
    </div>
  );
}
