// Robots config — open the public marketing + exam pages to crawlers,
// keep the API / auth / mock-taking / dashboard paths out of the index.

import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "https://shishya.in";
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/exams",
          "/exams/",
          "/exams/state/",
          "/exams/browse",
          "/schooling",
          "/schooling/",
          "/colleges",
          "/colleges/",
          "/scholarships",
          "/post-graduation",
          "/jobs",
          "/worldwide",
          "/insights",
          "/verification",
          "/login",
        ],
        disallow: [
          "/api/",          // no point indexing JSON endpoints
          "/admin/",        // SME tooling — never index
          "/dashboard",     // personal data
          "/chat",          // auth-gated AI tutor
          "/mocks/",        // per-attempt mock player
          "/attempts/",     // per-user results
          "/logout",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
