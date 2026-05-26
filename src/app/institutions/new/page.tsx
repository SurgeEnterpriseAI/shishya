// /institutions/new — self-service signup for coaching centers and
// training providers. Creates an Institution + first admin user in
// one form, then redirects to /i/dashboard.
//
// Fully client-side form because we need real-time validation feedback
// (password rules, email format) and a smooth submit→redirect path.
// The server-side POST handler lives at /api/institutions/signup.

import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { InstitutionSignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "List your coaching institute — free | Shishya",
  description:
    "Create your institution's free listing on Shishya. Manage cohorts, share Shishya mocks with your students, and reach aspirants across India.",
  alternates: { canonical: "https://shishya.in/institutions/new" },
};

export default function NewInstitutionPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-14">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            For institutions
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            List your coaching centre on Shishya
          </h1>
          <p className="mt-3 text-sm text-ink-600">
            Free forever. Reach aspirants across India, manage your in-house
            cohorts, and share Shishya&apos;s adaptive mocks with every student
            you teach.{" "}
            <span className="font-medium text-ink-800">
              No credit card, no setup call.
            </span>
          </p>
          <div className="mt-8 rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
            <InstitutionSignupForm />
          </div>
          <p className="mt-4 text-center text-xs text-ink-500">
            Already listed?{" "}
            <a
              href="/login/institution"
              className="font-medium text-saffron-700 underline-offset-2 hover:underline"
            >
              Log in to your dashboard
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
