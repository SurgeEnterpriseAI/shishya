"use client";

// The guest tutor's first-answer sign-up card (8 Oct 2026 — the rules, the
// words and why: src/lib/chat-first-answer.ts).
//
// The caller shows it only while the guest's FIRST answered turn is the latest
// (guestChatOffer "first-answer": never a school chat, never after the
// under-13 line, never a kids' exam chat, never while a reply streams or the
// B6 unanswered-question door is up), in the save card's place. Inside:
//   • the reason line, tied to what they asked (firstAnswerVariant: the guest
//     quiz's score, the exam's tests, or saved chats), marked data-su-reason —
//     the button's own visible line (explain="own", as the save card and the
//     B6 door: never a second caption under it);
//   • the shared white "Sign up with Google" button (src/components/
//     SignUpButton.tsx), door id "chat-first-answer", whose link returns to
//     this chat and names the door in its callback (firstAnswerHref), so the
//     SIGNUP row carries it. It is a SignInLink: the press sends the one
//     "signin-click"; onSignInClick (and the chat's capture listener) keeps
//     the conversation for the account (src/lib/guest-chat-carry.ts). Its
//     tooltip opens above it: this sits at the end of the scrolling pane;
//   • the age small print — "Free · … · For students 13 and above" (the 401
//     doors' and the B6 door's, src/lib/content-signup.ts nudgeBarCopy).
// When it comes up, the pane is scrolled to its end so the card is in view —
// the same step the pane takes for every new piece of the reply (the reply's
// last piece arrives before the card, so the card used to land out of sight).
// Nothing is covered: the card is in the flow, under the answer.
// Counted once: { cta: "signin-door", action: "shown", surface:
// "chat-first-answer", examCode, variant, impression: true } when at least half
// of it is on screen (where IntersectionObserver is missing: when it mounts).

import { useEffect, useRef, type RefObject } from "react";
import { SignUpButton } from "@/components/SignUpButton";
import { nudgeBarCopy } from "@/lib/content-signup";
import { CHAT_FIRST_ANSWER_DOOR } from "@/lib/signin-cta";
import { firstAnswerReason, firstAnswerShownBeacon, firstAnswerVariant } from "@/lib/chat-first-answer";
import { useSignUpPageData } from "@/lib/use-signup-words";

export function FirstAnswerOffer({
  href,
  locale,
  exam,
  examCode,
  firstQuestion,
  pane,
  onSignInClick,
}: {
  /** firstAnswerHref(the chat's /login link) — it returns to this chat. */
  href: string;
  /** The chat's UI language (en / hi / te; anything else reads English). */
  locale: string;
  /** The exam's short name the page passed; null in the general chat. */
  exam?: string | null;
  examCode: string | null;
  /** The guest's first question in this chat (the seed, when one opened it). */
  firstQuestion: string | null;
  /** The scrolling message pane the card sits in. */
  pane?: RefObject<HTMLDivElement | null>;
  /** Keeps the conversation for the account (the chat's own bookkeeping). */
  onSignInClick?: () => void;
}) {
  const page = useSignUpPageData();
  const view = firstAnswerVariant({ examCode, exam, page, firstQuestion });
  const ref = useRef<HTMLDivElement | null>(null);
  const variantRef = useRef(view.variant);
  variantRef.current = view.variant;

  // Into view as it comes up (see the header).
  useEffect(() => {
    const box = pane?.current;
    if (!box) return;
    try {
      box.scrollTo({ top: box.scrollHeight, behavior: "smooth" });
    } catch {
      box.scrollTop = box.scrollHeight;
    }
  }, [pane]);

  // One "shown" row, once half of the card is on screen.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let sent = false;
    const send = () => {
      if (sent) return;
      sent = true;
      firstAnswerShownBeacon(examCode, variantRef.current);
    };
    if (typeof IntersectionObserver === "undefined") {
      send();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting && e.intersectionRatio >= 0.5)) {
          send();
          io.disconnect();
        }
      },
      { threshold: [0.5] },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [examCode]);

  return (
    <div ref={ref} data-signin-door={CHAT_FIRST_ANSWER_DOOR} className="rounded-md border border-saffron-200 bg-saffron-50/60 p-3">
      <p data-su-reason className="text-center text-sm font-semibold text-ink-900">{firstAnswerReason(locale, view)}</p>
      <SignUpButton
        href={href}
        surface="chat-first-answer"
        locale={locale}
        exam={exam}
        examCode={examCode}
        beaconProps={{ examCode, variant: view.variant }}
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
