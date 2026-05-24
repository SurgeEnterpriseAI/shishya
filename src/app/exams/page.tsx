// /exams — permanent redirect to /.
//
// The exam funnel moved to the site root (/) so there is only one
// canonical exam-discovery surface. We keep this route alive as a
// 308 redirect so:
//   - inbound links from emails / shared URLs / search-engine cache
//     continue to land users on the right page
//   - any `?g=…&s=…&st=…` query params from before the move are
//     forwarded through unchanged
//
// Sub-routes under /exams/[examCode] are unaffected — this redirect
// only fires on the bare /exams index path.

import { permanentRedirect } from "next/navigation";

export default async function ExamsRedirect({
  searchParams,
}: {
  searchParams: Promise<{ g?: string; s?: string; st?: string }>;
}) {
  const sp = await searchParams;
  const qs = new URLSearchParams();
  if (sp.g) qs.set("g", sp.g);
  if (sp.s) qs.set("s", sp.s);
  if (sp.st) qs.set("st", sp.st);
  const target = qs.toString() ? `/?${qs.toString()}` : "/";
  permanentRedirect(target);
}
