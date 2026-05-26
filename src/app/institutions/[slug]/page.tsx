// /institutions/[slug] — public profile page for a coaching institute.
//
// Anyone (including search engines) can view: brand info, courses,
// active batches, fees, location, modes, reviews. The data shown
// here is the result of edits the institution admins make in their
// /i/profile dashboard.
//
// SSR with revalidate=300 so admins see edits within 5 minutes
// without us bumping a cache key on every save.

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { prisma } from "@/lib/db/prisma";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const inst = await prisma.institution
    .findUnique({
      where: { slug },
      select: { name: true, tagline: true, city: true, state: true },
    })
    .catch(() => null);
  if (!inst) return { title: "Institution not found — Shishya" };
  const location = [inst.city, inst.state].filter(Boolean).join(", ");
  return {
    title: `${inst.name}${location ? ` — ${location}` : ""} | Shishya`,
    description:
      inst.tagline ??
      `${inst.name} on Shishya — courses, batches, fees and student reviews.`,
    alternates: { canonical: `https://shishya.in/institutions/${slug}` },
  };
}

export default async function InstitutionProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const inst = await prisma.institution
    .findUnique({
      where: { slug },
      include: {
        courses: {
          orderBy: { createdAt: "asc" },
          include: {
            batches: {
              where: { archived: false },
              orderBy: { startDate: "asc" },
              select: {
                id: true,
                name: true,
                startDate: true,
                endDate: true,
                mode: true,
                capacity: true,
                _count: { select: { enrollments: true } },
              },
            },
          },
        },
        reviews: {
          where: { status: "APPROVED" },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    })
    .catch(() => null);
  if (!inst || !inst.active) notFound();

  const avgRating =
    inst.reviews.length > 0
      ? Math.round(
          (inst.reviews.reduce((s, r) => s + r.rating, 0) / inst.reviews.length) *
            10,
        ) / 10
      : null;

  return (
    <main className="min-h-screen bg-saffron-50/30">
      <Header />
      <section className="container-prose py-10">
        {/* ── Header card ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-ink-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="flex items-start gap-4">
            {inst.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={inst.logoUrl}
                alt=""
                className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-ink-200"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-saffron-100 text-2xl font-bold text-saffron-800">
                {inst.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-3xl">
                {inst.name}
                {inst.verified ? (
                  <span
                    className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 align-middle text-[11px] font-semibold text-emerald-800"
                    title="Verified by Shishya"
                  >
                    ✓ Verified
                  </span>
                ) : (
                  <span
                    className="ml-2 inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 align-middle text-[11px] font-semibold text-amber-800"
                    title="Pending Shishya verification"
                  >
                    Pending verification
                  </span>
                )}
              </h1>
              {inst.tagline && (
                <p className="mt-1 text-sm text-ink-700">{inst.tagline}</p>
              )}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                {(inst.city || inst.state) && (
                  <span>📍 {[inst.city, inst.state].filter(Boolean).join(", ")}</span>
                )}
                {inst.modes.length > 0 && (
                  <span>
                    {inst.modes.map((m) => m.toLowerCase()).join(" · ")}
                  </span>
                )}
                {avgRating !== null && (
                  <span>
                    ⭐ {avgRating.toFixed(1)} ({inst.reviews.length} reviews)
                  </span>
                )}
              </div>
            </div>
          </div>
          {inst.description && (
            <p className="mt-6 whitespace-pre-wrap text-sm leading-relaxed text-ink-700">
              {inst.description}
            </p>
          )}
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            {inst.websiteUrl && (
              <a
                href={inst.websiteUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-3 py-1.5 font-medium text-ink-800 hover:border-saffron-400"
              >
                🌐 Website
              </a>
            )}
            {inst.contactEmail && (
              <a
                href={`mailto:${inst.contactEmail}`}
                className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-3 py-1.5 font-medium text-ink-800 hover:border-saffron-400"
              >
                ✉️ {inst.contactEmail}
              </a>
            )}
            {inst.contactPhone && (
              <a
                href={`tel:${inst.contactPhone}`}
                className="inline-flex items-center gap-1 rounded-md border border-ink-200 bg-white px-3 py-1.5 font-medium text-ink-800 hover:border-saffron-400"
              >
                📞 {inst.contactPhone}
              </a>
            )}
          </div>
        </div>

        {/* ── Courses ─────────────────────────────────────────── */}
        {inst.courses.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-ink-900">Courses</h2>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {inst.courses.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-ink-200 bg-white p-5 shadow-sm"
                >
                  <h3 className="text-base font-semibold text-ink-900">{c.name}</h3>
                  {c.description && (
                    <p className="mt-1 line-clamp-3 text-sm text-ink-600">
                      {c.description}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-ink-500">
                    {c.examCode && (
                      <Link
                        href={`/exams/${c.examCode}`}
                        className="rounded bg-saffron-100 px-1.5 py-0.5 font-semibold text-saffron-800 hover:bg-saffron-200"
                      >
                        {c.examCode.replace(/_/g, " ")}
                      </Link>
                    )}
                    {c.durationWeeks && <span>{c.durationWeeks} weeks</span>}
                    {c.feesInr != null && (
                      <span>₹{c.feesInr.toLocaleString("en-IN")}</span>
                    )}
                  </div>
                  {c.batches.length > 0 && (
                    <ul className="mt-3 divide-y divide-ink-100 border-t border-ink-100 pt-2">
                      {c.batches.slice(0, 3).map((b) => (
                        <li
                          key={b.id}
                          className="flex items-center justify-between py-1.5 text-xs"
                        >
                          <span className="font-medium text-ink-800">{b.name}</span>
                          <span className="text-ink-500">
                            {b._count.enrollments}
                            {b.capacity ? `/${b.capacity}` : ""} enrolled · {b.mode}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Reviews ──────────────────────────────────────────── */}
        {inst.reviews.length > 0 && (
          <div className="mt-10">
            <h2 className="text-lg font-semibold text-ink-900">Student reviews</h2>
            <ul className="mt-4 space-y-3">
              {inst.reviews.map((r) => (
                <li
                  key={r.id}
                  className="rounded-xl border border-ink-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold text-amber-700">
                    {"★".repeat(r.rating)}
                    <span className="text-ink-300">{"★".repeat(5 - r.rating)}</span>
                  </p>
                  <p className="mt-1 text-sm text-ink-700">{r.body}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-12 rounded-xl border border-ink-200 bg-white p-5 text-center text-xs text-ink-500 shadow-sm">
          Listing claimed by {inst.name}. To edit this page, log in at{" "}
          <Link
            href="/login/institution"
            className="font-medium text-saffron-700 underline-offset-2 hover:underline"
          >
            /login/institution
          </Link>
          .
        </div>
      </section>
    </main>
  );
}
