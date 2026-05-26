// /i/profile — institution profile editor.
//
// Server component loads the current Institution row + passes it to
// the client form. On save the form PATCHes /api/i/institution with
// just the changed fields, then we router.refresh() to pull updated
// values from the server.

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { requireInstitutionSession } from "@/lib/institution-auth";
import { INDIAN_STATES } from "@/lib/states";
import { ProfileEditorForm } from "./ProfileEditorForm";

export const metadata: Metadata = {
  title: "Edit profile | Institution dashboard | Shishya",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function InstitutionProfileEditPage() {
  const { institution } = await requireInstitutionSession();

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        <div className="mx-auto max-w-2xl">
          <nav className="mb-2 text-xs text-ink-500">
            <Link
              href="/i/dashboard"
              className="font-medium text-saffron-700 hover:underline"
            >
              ← Dashboard
            </Link>
          </nav>
          <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
            Edit your public profile
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            These details appear on{" "}
            <Link
              href={`/institutions/${institution.slug}`}
              className="font-medium text-saffron-700 underline-offset-2 hover:underline"
            >
              your public profile
            </Link>{" "}
            and in the directory. Changes go live within 5 minutes.
          </p>

          <div className="mt-6 rounded-xl border border-ink-200 bg-white p-6 shadow-sm">
            <ProfileEditorForm
              institution={{
                name: institution.name,
                slug: institution.slug,
                tagline: institution.tagline ?? "",
                description: institution.description ?? "",
                logoUrl: institution.logoUrl ?? "",
                websiteUrl: institution.websiteUrl ?? "",
                contactEmail: institution.contactEmail,
                contactPhone: institution.contactPhone ?? "",
                city: institution.city ?? "",
                state: institution.state ?? "",
                modes: institution.modes,
                examCodes: institution.examCodes,
              }}
              states={INDIAN_STATES.map((s) => ({ code: s.code, name: s.name }))}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
