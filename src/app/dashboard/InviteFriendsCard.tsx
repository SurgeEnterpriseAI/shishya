// InviteFriendsCard — the word-of-mouth loop, made explicit.
//
// Journey stage 12 (advocacy): aspirants prep in WhatsApp groups, and a
// peer's recommendation is the strongest mindshare driver there is —
// it's how "Shishya = government exams" spreads person to person. This
// is a gentle, low-pressure invite that turns an engaged user into a
// recruiter, framed around studying together (not a spammy referral
// program — no rewards, no friction, one tap).
//
// Two homes: the dashboard (default copy) and, since 11 Sep 2026, the
// results page at an EARNED moment — a new personal best or the first
// mock — where "study with me" is true rather than a sales line. The
// message is first person, carries the student's own number only, and
// promises nothing (no incentive, no counter).
//
// Reuses ShareExamButton so the WhatsApp/copy/native-share plumbing,
// utm tags and analytics are shared. Server component wrapper; the
// button is client.

import { ShareExamButton } from "@/components/ShareExamButton";

export type InviteMoment = "personal-best" | "first-mock";

export function InviteFriendsCard({
  examShort,
  examCode,
  firstName,
  moment,
  scoreDisplay,
}: {
  examShort: string | null;
  examCode: string | null;
  firstName: string | null;
  /** Results-page earned moment — switches the copy and the utm campaign. */
  moment?: InviteMoment;
  /** The student's own formatted score, quoted in the earned-moment message. */
  scoreDisplay?: string | null;
}) {
  // Land the friend on the relevant exam hub (or home) — a page that
  // immediately shows free mocks/PYQs/syllabus for that exam.
  const url = examCode ? `https://shishya.in/exams/${examCode}` : "https://shishya.in";
  const who = firstName ? `${firstName} here — ` : "";
  const free = "free mock tests, previous-year papers & an AI tutor in your own language";
  const message =
    moment === "personal-best" && examShort
      ? `${who}I just hit my personal best${scoreDisplay ? ` (${scoreDisplay})` : ""} on a ${examShort} mock on Shishya — ${free}. Study with me:`
      : moment === "first-mock" && examShort
        ? `${who}I just took my first ${examShort} mock on Shishya — ${free}. Take yours and let's compare:`
        : examShort
          ? `${who}I'm prepping for ${examShort} free on Shishya — ${free}, all free. Study with me:`
          : `${who}I'm prepping on Shishya — ${free} for government exams. Study with me:`;

  const heading = moment ? "📣 Bring your batch along" : "📣 Prep is easier with your batch";
  const body =
    moment === "personal-best"
      ? "A good day to invite a friend or your WhatsApp study group — they get the same free mocks, papers and tutor. No signup wall to try."
      : moment === "first-mock"
        ? "Baseline set — invite a friend or your WhatsApp study group to take theirs. Same free mocks, papers and tutor; no signup wall to try."
        : "Invite a friend or your WhatsApp study group — everyone gets the same free mocks, papers and tutor. No signup wall to try.";

  return (
    <section className={`${moment ? "mt-4" : "mt-10"} rounded-xl border border-ink-200 bg-white p-5`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-base font-semibold text-ink-900">{heading}</p>
          <p className="mt-1 text-sm text-ink-600">{body}</p>
        </div>
        <div className="shrink-0">
          <ShareExamButton
            url={url}
            message={message}
            label="Invite:"
            surface={moment ? "invite-results" : "invite"}
            exam={examCode}
          />
        </div>
      </div>
    </section>
  );
}
