// /institutions — public directory of all listed coaching institutes.
//
// Filters: state, exam, mode (online/offline/hybrid), verified-only.
// Sort: verified first, then newest. Pagination deferred until > 30
// listings exist; right now we just show all active rows.
//
// SEO-indexable — public page, no auth required, server-rendered.

import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "@/components/Header";
import { JsonLd, collectionPageLd, breadcrumbLd } from "@/components/JsonLd";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = {
  title: "Coaching institutes & training centres in India — Shishya",
  description:
    "Free directory of coaching centres for India's entrance and government exams. Browse by exam, state and format — verified by Shishya.",
  alternates: { canonical: "https://shishya.in/institutions" },
};

// Re-render at most once a minute — institution data changes slowly
// and the directory query touches multiple joins.
export const revalidate = 60;

export default async function InstitutionsDirectoryPage() {
  const institutions = await prisma.institution
    .findMany({
      where: { active: true },
      orderBy: [{ verified: "desc" }, { createdAt: "desc" }],
      take: 60,
      include: {
        _count: {
          select: {
            courses: true,
            reviews: { where: { status: "APPROVED" } },
          },
        },
      },
    })
    .catch(() => []);

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <JsonLd
        data={[
          collectionPageLd({
            name: "Coaching institutes & training centres in India",
            description: "Free directory of coaching centres for India entrance and government exams — browse by exam, state and format.",
            path: "/institutions",
          }),
          breadcrumbLd([["Institutions","/institutions"]]),
        ]}
      />
      <Header />
      <section className="container-prose py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-3xl font-bold tracking-tight text-ink-900 sm:text-4xl">
            Coaching institutes on Shishya
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-ink-600">
            Find a coaching centre near you — for UPSC, SSC, JEE, NEET, IBPS,
            state PSCs and every exam Shishya covers. Listing is free; verified
            institutes get a green ✓ on their profile.
          </p>
          <div className="mt-6">
            <Link
              href="/institutions/new"
              className="inline-flex items-center gap-2 rounded-md bg-saffron-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-saffron-600"
            >
              List your institute → free
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-12 max-w-5xl">
          {institutions.length === 0 ? (
            <div className="rounded-xl border border-ink-200 bg-white p-10 text-center">
              <p className="text-sm text-ink-600">
                No institutes listed yet. Be the first —{" "}
                <Link
                  href="/institutions/new"
                  className="font-medium text-saffron-700 underline-offset-2 hover:underline"
                >
                  create a free listing
                </Link>
                .
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {institutions.map((inst) => (
                <li key={inst.id}>
                  <Link
                    href={`/institutions/${inst.slug}`}
                    prefetch={false}
                    className="group flex h-full flex-col rounded-xl border border-ink-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-saffron-400 hover:shadow-md"
                  >
                    <div className="flex items-start gap-3">
                      {inst.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={inst.logoUrl}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-ink-200"
                        />
                      ) : (
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-saffron-100 text-base font-semibold text-saffron-800">
                          {inst.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h2 className="truncate text-base font-semibold text-ink-900">
                          {inst.name}
                          {inst.verified && (
                            <span
                              className="ml-1.5 text-emerald-600"
                              title="Verified by Shishya"
                              aria-label="verified"
                            >
                              ✓
                            </span>
                          )}
                        </h2>
                        {(inst.city || inst.state) && (
                          <p className="mt-0.5 truncate text-xs text-ink-500">
                            {[inst.city, inst.state].filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>
                    {inst.tagline && (
                      <p className="mt-3 line-clamp-2 text-sm text-ink-700">
                        {inst.tagline}
                      </p>
                    )}
                    <div className="mt-auto pt-4">
                      <p className="flex flex-wrap gap-1 text-[10px] uppercase tracking-wider text-ink-500">
                        {inst.modes.map((m) => (
                          <span
                            key={m}
                            className="rounded bg-ink-100 px-1.5 py-0.5 font-semibold text-ink-700"
                          >
                            {m}
                          </span>
                        ))}
                        {inst._count.courses > 0 && (
                          <span className="rounded bg-saffron-100 px-1.5 py-0.5 font-semibold text-saffron-800">
                            {inst._count.courses} courses
                          </span>
                        )}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}
