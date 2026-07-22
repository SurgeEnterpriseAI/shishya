// InviteFriendsCard — the word-of-mouth loop, made explicit.
//
// Journey stage 12 (advocacy): aspirants prep in WhatsApp groups, and a
// peer's recommendation is the strongest mindshare driver there is —
// it's how "Shishya = government exams" spreads person to person. This
// is a gentle, low-pressure invite that turns an engaged user into a
// recruiter, framed around studying together (not a spammy referral
// program — no rewards, no friction, one tap).
//
// Reuses ShareExamButton so the WhatsApp/copy/native-share plumbing +
// analytics are shared. Server component wrapper; the button is client.

import { ShareExamButton } from "@/components/ShareExamButton";

export function InviteFriendsCard({
  examShort,
  examCode,
  firstName,
}: {
  examShort: string | null;
  examCode: string | null;
  firstName: string | null;
}) {
  // Land the friend on the relevant exam hub (or home) — a page that
  // immediately shows free mocks/PYQs/syllabus for that exam.
  const url = examCode ? `https://shishya.in/exams/${examCode}` : "https://shishya.in";
  const who = firstName ? `${firstName} here — ` : "";
  const message = examShort
    ? `${who}I'm prepping for ${examShort} free on Shishya — mock tests, previous-year papers & an AI tutor in your own language, all free. Study with me:`
    : `${who}I'm prepping on Shishya — free mock tests, previous-year papers & an AI tutor in your own language for 177 govt exams. Study with me:`;

  return (
    <section className="mt-10 rounded-xl border border-ink-200 bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink-900">
            📣 Prep is easier with your batch
          </p>
          <p className="mt-1 text-sm text-ink-600">
            Invite a friend or your WhatsApp study group — everyone gets the same free mocks,
            papers and tutor. No signup wall to try.
          </p>
        </div>
        <div className="shrink-0">
          <ShareExamButton url={url} message={message} label="Invite:" surface="invite" />
        </div>
      </div>
    </section>
  );
}
