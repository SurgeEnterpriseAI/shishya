// /privacy — Privacy Policy. Honest and specific: what we collect, what
// we do with it, the consent gate on mentor sharing, and what we never do.

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Shishya",
  description: "How Shishya (shishya.in) collects, uses and protects aspirant data.",
};

export default function PrivacyPage() {
  return (
    <main className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
      <h1 className="text-2xl font-bold text-ink-900">Privacy Policy</h1>
      <p className="mt-1 text-xs text-ink-500">Last updated: 16 August 2026</p>

      <h2 className="mt-6 text-base font-bold text-ink-900">What we collect</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li><b>Account:</b> name and email from Google sign-in. We never see or store passwords.</li>
        <li><b>Preparation activity:</b> test attempts and scores, topics studied, tutor questions, coach-plan settings — the data that powers your reports, packs and plans.</li>
        <li><b>Usage analytics:</b> pages viewed, with a first-party cookie identifier. Automated crawlers are tagged and excluded from human metrics.</li>
        <li><b>Payments (mentor sessions only):</b> handled entirely by our payment partner; we never see or store card/UPI details.</li>
      </ul>

      <h2 className="mt-6 text-base font-bold text-ink-900">How we use it</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>To run your personal features: weakness maps, daily coach plans, status reports, study packs, week-over-week comparisons.</li>
        <li>To send preparation emails (daily practice, reminders, exam-eve wishes). Every email can be ignored without losing access; write to us to stop them entirely.</li>
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
