// /about — who is behind Shishya and why it exists. Also a Razorpay
// KYC-review requirement (About Us page).

import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About — Shishya",
  description: "Shishya is India's free, AI-first exam-preparation platform, built by Surge Software Solutions Pvt Ltd.",
};

export default function AboutPage() {
  return (
    <main className="container-prose max-w-3xl py-10 text-sm leading-relaxed text-ink-700">
      <h1 className="text-2xl font-bold text-ink-900">About Shishya</h1>
      <p className="mt-4">
        Crores of Indians prepare for government and entrance exams every year, and most are told
        the serious way to prepare costs ₹30,000–₹1,50,000 at a coaching institute. Shishya exists
        to delete that fee: everything a coaching institute sells — mock tests for 175+ exams,
        previous-year papers, study notes, a personal AI tutor in 22 Indian languages, a day-by-day
        coach plan, cutoffs and exam-day analysis — free, in the aspirant&apos;s own language.
      </p>
      <p className="mt-3">
        The platform is AI-first and runs with a tiny team, which is why it can stay free for
        aspirants permanently. The only thing that ever carries a price is optional <b>human</b>{" "}
        time: a short mentor session with someone who has cleared your exam, first session free,
        then ₹9 per session inclusive of GST (see <Link href="/pricing" className="text-saffron-700 underline">Pricing</Link>).
      </p>
      <p className="mt-3">
        Shishya is built and operated by <b>Surge Software Solutions Pvt Ltd</b>, an Indian software
        company. Reach us any time at{" "}
        <a className="text-saffron-700 underline" href="mailto:corp@surgesoftware.co.in">corp@surgesoftware.co.in</a>{" "}
        or via the <Link href="/contact" className="text-saffron-700 underline">contact page</Link>.
      </p>
      <p className="mt-6">
        <Link href="/" className="font-medium text-saffron-700 underline">Start preparing — pick your exam →</Link>
      </p>
    </main>
  );
}
