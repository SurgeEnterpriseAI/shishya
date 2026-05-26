// /login/institution — admin login for coaching institutes. Separate
// route from the student-side /login (which is Google OAuth) so the
// two flows never confuse each other.

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { InstitutionLoginForm } from "./LoginForm";

export const metadata: Metadata = {
  title: "Institution login | Shishya",
  description:
    "Log in to your institution's Shishya dashboard. Manage cohorts, share mocks, and reach more aspirants.",
  alternates: { canonical: "https://shishya.in/login/institution" },
  robots: { index: false }, // login surfaces should not appear in search results
};

export default function InstitutionLoginPage() {
  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-14">
        <div className="mx-auto max-w-md">
          <p className="text-xs font-semibold uppercase tracking-wider text-saffron-700">
            For institutions
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Log in to your dashboard
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Manage cohorts, share Shishya mocks, edit your listing.
          </p>
          <div className="mt-6 rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
            <InstitutionLoginForm />
          </div>
          <p className="mt-4 text-center text-xs text-ink-500">
            New here?{" "}
            <Link
              href="/institutions/new"
              className="font-medium text-saffron-700 underline-offset-2 hover:underline"
            >
              List your institution — free
            </Link>
          </p>
          <p className="mt-2 text-center text-xs text-ink-500">
            Student account?{" "}
            <Link
              href="/login"
              className="font-medium text-ink-700 underline-offset-2 hover:underline"
            >
              Use the student sign-in instead
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
