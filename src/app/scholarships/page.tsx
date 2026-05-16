// /scholarships — public catalogue of every scholarship Shishya knows
// about. Static curated data (src/data/scholarships.ts), filtered
// entirely client-side so the page is cacheable + fast.
//
// Future: gate "Match me" personalised view behind sign-in once we
// collect home-state, category, income-band, etc. on a profile page.

import { Header } from "@/components/Header";
import { SCHOLARSHIPS } from "@/data/scholarships";
import { ScholarshipBrowser } from "./ScholarshipBrowser";

export const metadata = {
  title: "Free scholarships for Indian students · Shishya",
  description:
    "Curated catalogue of central, state and private scholarships every Indian student can apply for — by state, category, level, and exam. Free forever.",
};

export const revalidate = 3600; // refresh static cache every hour

export default function ScholarshipsPage() {
  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-10">
        <h1 className="text-3xl font-bold text-ink-900 sm:text-4xl">Scholarships for Indian students</h1>
        <p className="mt-2 max-w-2xl text-base text-ink-700">
          Curated list of central government, state government and private foundation scholarships
          you can apply for — covering school, diploma, UG, PG, research. Filter by your state,
          category, level, or target exam. <strong className="text-ink-900">All free to apply.</strong>
        </p>
        <p className="mt-2 max-w-2xl text-sm text-ink-500">
          We link to the awarding body&apos;s official portal. Shishya does not collect any payment
          or charge a finder&apos;s fee — the link is direct.
        </p>

        <ScholarshipBrowser scholarships={SCHOLARSHIPS} />
      </section>
    </main>
  );
}
