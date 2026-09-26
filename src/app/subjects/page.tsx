// /subjects — the index of the subject hubs (27 Sep 2026, discoverability
// wave 2, group "subject-hubs").
//
// Every hub's "← Back" parent (inferParent strips the last segment, and
// tests/unit/backlink-parent.test.ts requires the parent to render), and one
// place that lists the hubs with their computed counts and most-shared
// topics. A directory, not a destination: noindex, follow (the hubs carry
// the content). Copy and rules: src/lib/subject-hubs.ts; reads:
// src/lib/db/subject-hubs-db.ts. ISR hourly, first request renders; no
// cookie, header or session read.

import Link from "next/link";
import type { Metadata } from "next";
import { cache } from "react";
import { Header } from "@/components/Header";
import { loadSubjectHubs } from "@/lib/db/subject-hubs-db";
import {
  SITE,
  SUBJECT_HUB_ROOT,
  andList,
  sharedGroups,
  subjectHubCardLine,
  subjectHubIndexDescription,
  subjectHubIndexRows,
  subjectHubIndexTitle,
  subjectHubPath,
} from "@/lib/subject-hubs";

export const revalidate = 3600;

const loadRows = cache(async () => subjectHubIndexRows(await loadSubjectHubs()));

export async function generateMetadata(): Promise<Metadata> {
  const rows = await loadRows();
  return {
    title: subjectHubIndexTitle(rows),
    description: subjectHubIndexDescription(rows),
    alternates: { canonical: `${SITE}${SUBJECT_HUB_ROOT}` },
    robots: { index: false, follow: true },
  };
}

export default async function SubjectsIndexPage() {
  const rows = await loadRows();
  return (
    <main className="min-h-screen bg-ink-50/40">
      <Header />
      <section className="container-prose py-8 sm:py-10">
        <p className="text-xs text-ink-500">
          <Link href="/" className="hover:text-ink-800">Home</Link> · Subjects
        </p>
        <h1 className="mt-1 text-2xl font-bold text-ink-900 sm:text-3xl">Subjects across exams</h1>
        <p className="mt-3 max-w-3xl text-sm text-ink-700">
          {rows.length
            ? `${andList(rows.map((h) => h.def.name))}: each page groups a subject's topics across the exams that test it and links each exam's own topic page with Shishya notes or checked practice questions.`
            : "No subject page has topics to list right now. Each exam's syllabus page lists its topics."}
        </p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {rows.map((h) => {
            const top = sharedGroups(h).slice(0, 4);
            return (
              <li key={h.def.slug} className="rounded-lg border border-ink-200 bg-white p-4">
                <Link href={subjectHubPath(h.def.slug)} className="text-base font-semibold text-ink-900 hover:text-saffron-700">
                  {h.def.name}
                </Link>
                <p className="mt-1 text-xs text-ink-600">{subjectHubCardLine(h)}</p>
                {top.length > 0 && (
                  <p className="mt-2 text-xs text-ink-500">
                    Most shared: {top.map((g) => `${g.name} (${g.links.length} exams)`).join(" · ")}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-8 text-sm">
          <Link href="/current-affairs" className="font-medium text-saffron-700 hover:underline">Current affairs</Link>
          {" · "}
          <Link href="/exams/browse" className="font-medium text-saffron-700 hover:underline">All exams</Link>
        </p>
      </section>
    </main>
  );
}
