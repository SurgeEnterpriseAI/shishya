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
//
// Language (16 Sep 2026): the card speaks the student's own language, so the
// line they forward to their WhatsApp group is one they would write. A
// caller that already resolved a locale passes it in (the results page
// does); otherwise the card resolves it itself. A Hindi or Telugu invite
// links the exam hub's /hi|/te twin (or the /hi|/te home) so the friend lands
// in the language of the message; the English link is unchanged. Nothing else
// changes — the message still carries only the student's own number and
// promises nothing.

import { ShareExamButton } from "@/components/ShareExamButton";
import { getLocale } from "@/lib/i18n-server";
import { inviteCopy, inviteMessage } from "@/lib/dashboard-cards-copy";
import { asCopyLocale } from "@/lib/ui-locale-copy";

export type InviteMoment = "personal-best" | "first-mock";

export async function InviteFriendsCard({
  examShort,
  examCode,
  firstName,
  moment,
  scoreDisplay,
  locale,
}: {
  examShort: string | null;
  examCode: string | null;
  firstName: string | null;
  /** Results-page earned moment — switches the copy and the utm campaign. */
  moment?: InviteMoment;
  /** The student's own formatted score, quoted in the earned-moment message. */
  scoreDisplay?: string | null;
  /** The page's locale when it already has one; resolved here otherwise. */
  locale?: string;
}) {
  const lang = locale ?? (await getLocale());
  const C = inviteCopy(lang);
  // Land the friend on the relevant exam hub (or home) — a page that
  // immediately shows free mocks/PYQs/syllabus for that exam.
  // hi/te: the same page's locale twin — both the hub and the home have one
  // (middleware TWIN_PUBLIC_RE), and a friend with no language cookie keeps
  // that language on the next click.
  const copyLang = asCopyLocale(lang);
  const site = copyLang === "en" ? "https://shishya.in" : `https://shishya.in/${copyLang}`;
  const url = examCode ? `${site}/exams/${examCode}` : site;
  const message = inviteMessage(lang, { firstName, examShort, moment, scoreDisplay });

  const heading = moment ? C.headingMoment : C.headingDefault;
  const body =
    moment === "personal-best"
      ? C.bodyPersonalBest
      : moment === "first-mock"
        ? C.bodyFirstMock
        : C.bodyDefault;

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
            label={C.shareLabel}
            surface={moment ? "invite-results" : "invite"}
            exam={examCode}
          />
        </div>
      </div>
    </section>
  );
}
