// Tiny shared JSON-LD emitter + builders for the page types that only
// need lightweight structured data (hub/collection pages, breadcrumbs).
// The content-heavy pages (exam hubs, topics, cutoff/tricks/syllabus,
// phase articles, colleges, schooling) build their richer schemas
// inline — this helper exists so the long tail of hub pages doesn't
// each reinvent the boilerplate.
//
// AEO rationale: answer engines (Google AI Overviews, ChatGPT search,
// Perplexity) preferentially quote pages whose purpose is machine-
// stated. CollectionPage + BreadcrumbList is the minimum that tells
// them "this is the hub for X on shishya.in".

import React from "react";

const SITE = "https://shishya.in";

export function JsonLd({ data }: { data: object | object[] }) {
  const items = Array.isArray(data) ? data : [data];
  return (
    <>
      {items.map((d, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(d) }}
        />
      ))}
    </>
  );
}

/** BreadcrumbList from [name, path] pairs (path relative, "" = home). */
export function breadcrumbLd(crumbs: [string, string][]): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["Home", ""] as [string, string], ...crumbs].map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: `${SITE}${path.startsWith("/") || path === "" ? path : `/${path}`}` || SITE,
    })),
  };
}

/** CollectionPage — for hub/list pages. */
export function collectionPageLd(opts: {
  name: string;
  description: string;
  path: string;
}): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: `${SITE}${opts.path}`,
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    isPartOf: { "@type": "WebSite", name: "Shishya", url: SITE },
    publisher: { "@type": "EducationalOrganization", name: "Shishya", url: SITE },
  };
}
