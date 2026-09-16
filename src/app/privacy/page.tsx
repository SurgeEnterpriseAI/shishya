// /privacy — Privacy Policy. Honest and specific: what we collect, what
// we do with it, the consent gate on mentor sharing, and what we never do.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Shishya",
  description: "How Shishya (shishya.in) collects, uses and protects aspirant data.",
  // Self canonical (16 Sep 2026): one of 7 sitemap landings the crawl found without one.
  alternates: { canonical: "https://shishya.in/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
      <h1 className="text-2xl font-bold text-ink-900">Privacy Policy</h1>
      <p className="mt-1 text-xs text-ink-500">Last updated: 14 September 2026</p>

      <h2 className="mt-6 text-base font-bold text-ink-900">What we collect</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li><b>Account:</b> name and email from Google sign-in. We never see or store passwords.</li>
        <li><b>Preparation activity:</b> test attempts and scores, topics studied, tutor questions, coach-plan settings — the data that powers your reports, packs and plans. What students ask the tutor (signed in or not, with emails and phone numbers removed) is also read in aggregate to decide which content and features to build next.</li>
        <li><b>Usage analytics:</b> pages viewed, with a first-party cookie identifier. Automated crawlers are tagged and excluded from human metrics.</li>
        <li><b>Page speed (about half of page loads):</b> how quickly the page loaded and responded, the connection type (such as 4G), whether the device has a touch screen, the page language, whether you were signed in, and the page&apos;s address pattern (never a record id). It is sent without cookies and stored without your account, a device identifier or your IP address.</li>
        <li><b>Phone alerts (only if you turn them on):</b> the push-notification address your browser creates for this device, and the exam you chose to follow. Used only to send that exam&apos;s alerts; switch them off in your browser&apos;s site settings for shishya.in.</li>
        <li><b>Challenges (only if you make or play one):</b> the questions, your answers and score, and a first name only if you type one. Anyone who opens a challenge link sees the challenger&apos;s score and typed name; a friend&apos;s score (and typed name) goes only to the challenger, and only if the friend chooses to send it. Challenge links stop working after 30 days. If a challenger asks to be told when a friend plays, we keep that device&apos;s push-notification address for that challenge.</li>
        <li><b>Score estimates (only if you add yours):</b> the score calculator keeps nothing by itself. If you tap &ldquo;add my score&rdquo;, we keep the counts you entered and the score for that exam sitting, with a random key stored in your browser so adding again replaces your entry — no name, no account, no analytics identifier. Other candidates see only how many scored higher or lower, never your entry.</li>
        <li><b>Study groups (only if you join one):</b> the other members of that group see your first name, how many days you studied this week and how many questions you practised this week — never your scores or answers. Someone with the invite link who is not a member sees only the group&apos;s name and how many members it has. Leave the group and you disappear from its board.</li>
        <li><b>Payments (mentor sessions only):</b> handled entirely by our payment partner; we never see or store card/UPI details.</li>
      </ul>

      <h2 className="mt-6 text-base font-bold text-ink-900">How we use it</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>To run your personal features: weakness maps, daily coach plans, status reports, study packs, week-over-week comparisons.</li>
        <li>To send preparation emails (daily practice, reminders, exam-eve wishes). Every email can be ignored without losing access; write to us to stop them entirely.</li>
        <li>To send the exam alerts you asked for — by email, or as a notification on your phone — only when something real changes for that exam.</li>
        <li>To improve the platform with aggregate, de-identified statistics.</li>
      </ul>

      <h2 className="mt-6 text-base font-bold text-ink-900">The mentor consent gate</h2>
      <p className="mt-2">
        Your preparation report is <b>private by default</b>. It is shown to a verified mentor only
        when you explicitly tick the consent box while requesting a session — and only to the mentor
        who takes your request. Withdrawn simply by not requesting sessions.
      </p>

      <h2 className="mt-6 text-base font-bold text-ink-900">What we never do</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>Sell or rent your personal data to anyone.</li>
        <li>Share your identifiable preparation data with advertisers or third parties (aside from the processors that run the service: hosting, database, email and payment infrastructure).</li>
        <li>Publish your scores with your name — public walls of activity are anonymous.</li>
      </ul>

      <h2 className="mt-6 text-base font-bold text-ink-900">Your controls</h2>
      <p className="mt-2">
        Email <a className="text-saffron-700 underline" href="mailto:corp@surgesoftware.co.in">corp@surgesoftware.co.in</a>{" "}
        from your registered address to export or permanently delete your account and data; deletion
        completes within 30 days.
      </p>

      <p className="mt-6 text-xs text-ink-500">
        Operated by Surge Software Solutions Pvt Ltd, India.
      </p>
    </main>
  );
}
