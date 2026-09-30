// JSON-LD for the life-stage pages (30 Sep 2026, P1 build 1, spec §2.2 /
// §2.3). The pages (agent B) render these through <JsonLd>.
//
// Hubs (/after-10th, /after-12th): CollectionPage + an ItemList of the
// options (@id {url}#options; each ListItem's url is the option's own page —
// the stream page after Class 10, the family's first existing page after
// Class 12) + BreadcrumbList, and a FAQPage ONLY when the page prints the
// same question and answer visibly (stageHubFaq builds it from data; a
// FAQPage for text the reader cannot see is a structured-data violation).
// No EducationalOccupationalProgram on the hubs: they compare programmes,
// they are not one.
//
// Stream pages (/schooling/streams/{option}): a WebPage whose mainEntity is
// the EducationalOccupationalProgram — name, the aliases as alternateName,
// our own one-line description, timeToComplete only when the duration fact
// is confirmed (streamDurationIso: "P2Y" / "P3Y"), and programPrerequisites
// only where a confirmed fact says what the entry qualification is. No
// provider, offers, salary or occupational data: Shishya does not run these
// courses and prints no pay. Plus BreadcrumbList.
//
// Pure: no DB, no clock, no React (the builders are plain objects). The
// BreadcrumbList, CollectionPage and publisher shapes mirror
// src/components/JsonLd.tsx breadcrumbLd / collectionPageLd / SHISHYA_ORG_REF
// field for field; they are rebuilt here because that module is a .tsx that
// the unit tests cannot load (tsconfig keeps JSX for Next), and these
// builders are pinned in tests/unit/paths-context-md.test.ts.

import type { StreamOption } from "@/data/paths";
import { SITE_ORG_ID } from "@/lib/site-description";
import { SITE, absoluteUrl } from "./index-helpers";
import type { StageHubModel } from "./stage-pages";
import { streamDurationIso, type StreamPageModel } from "./stream-pages";

type Crumbs = ReadonlyArray<readonly [string, string]>;

/** The root layout Organization, joined by "@id" (JsonLd.tsx SHISHYA_ORG_REF). */
export const PATH_ORG_REF = { "@type": "EducationalOrganization", "@id": SITE_ORG_ID, name: "Shishya", url: SITE } as const;

/** BreadcrumbList from a model's crumbs, Home first (JsonLd.tsx breadcrumbLd). */
export function pathBreadcrumbLd(crumbs: Crumbs): object {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [["Home", ""] as const, ...crumbs].map(([name, path], i) => ({
      "@type": "ListItem",
      position: i + 1,
      name,
      item: path === "" ? SITE : absoluteUrl(path.startsWith("/") ? path : `/${path}`),
    })),
  };
}

/** CollectionPage for a hub (JsonLd.tsx collectionPageLd). */
export function pathCollectionPageLd(opts: { name: string; description: string; path: string }): object {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: opts.name,
    description: opts.description,
    url: absoluteUrl(opts.path),
    inLanguage: "en-IN",
    isAccessibleForFree: true,
    isPartOf: { "@type": "WebSite", name: "Shishya", url: SITE },
    publisher: PATH_ORG_REF,
  };
}

// ── Hubs ────────────────────────────────────────────────────────────────

/** The options as an ItemList, @id {url}#options, registry order. */
export function stageHubItemListLd(model: StageHubModel): object {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "@id": `${model.canonical}#options`,
    name: model.h1,
    numberOfItems: model.options.length,
    itemListOrder: "https://schema.org/ItemListUnordered",
    itemListElement: model.options.map((o, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: o.name,
      ...(o.href ? { url: absoluteUrl(o.href) } : {}),
    })),
  };
}

/** The one hub question, built from data (the qualificationFaq pattern).
 *  The page must print it visibly before it may emit stageHubFaqLd. */
export function stageHubFaq(model: StageHubModel): { q: string; a: string } {
  const names = model.options.map((o) => o.shortName);
  const noun = model.stage.id === "after-10th" ? "options" : "paths";
  return {
    q: model.h1,
    a: `Shishya compares ${names.length} ${noun} side by side: ${names.join(", ")}. Each one says what it is, how long it takes where an official page states it, and what it leads to, with every rule quoted from an official page and the day it was read. Confirm dates and rules on the official site before you decide.`,
  };
}

/** FAQPage for Q&A the page prints visibly — never for hidden text. */
export function faqPageLd(items: ReadonlyArray<{ q: string; a: string }>): object {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
  };
}

/** Everything a hub renders: CollectionPage, ItemList, BreadcrumbList, and
 *  the FAQPage only when `visibleFaq` (the Q&A printed on the page) is passed. */
export function stageHubJsonLd(model: StageHubModel, visibleFaq?: { q: string; a: string } | null): object[] {
  return [
    pathCollectionPageLd({ name: model.h1, description: model.description, path: model.path }),
    stageHubItemListLd(model),
    pathBreadcrumbLd(model.breadcrumb),
    ...(visibleFaq ? [faqPageLd([visibleFaq])] : []),
  ];
}

// ── Stream pages ────────────────────────────────────────────────────────

/** The entry qualification, only where a confirmed fact states it:
 *  Class 11-12 (incl. vocational) follows Class 10 (CBSE's XI-XII scheme);
 *  the AICTE diploma needs Class 10 (AICTE handbook); an ITI trade is entered
 *  after Class VIII or Class X by trade (DGT). NIOS: not read — none. */
export function streamPrerequisite(option: Pick<StreamOption, "kind">): string | null {
  switch (option.kind) {
    case "class-11-12":
    case "vocational-11-12":
    case "diploma":
      return "Class 10 pass";
    case "iti":
      return "Class 8 or Class 10 pass, depending on the trade";
    default:
      return null;
  }
}

/** The option as an EducationalOccupationalProgram (no provider, offers or salary). */
export function streamProgramLd(model: StreamPageModel): object {
  const o = model.option;
  const iso = streamDurationIso(o);
  const pre = streamPrerequisite(o);
  return {
    "@type": "EducationalOccupationalProgram",
    "@id": `${model.canonical}#program`,
    name: model.h1,
    alternateName: [...o.aliases],
    description: o.whatItIs,
    url: model.canonical,
    ...(iso ? { timeToComplete: iso } : {}),
    ...(pre ? { programPrerequisites: { "@type": "EducationalOccupationalCredential", credentialCategory: pre } } : {}),
  };
}

/** Everything a stream page renders: WebPage (mainEntity = the programme) and BreadcrumbList. */
export function streamPageJsonLd(model: StreamPageModel): object[] {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": model.canonical,
      url: model.canonical,
      name: model.title,
      description: model.description,
      inLanguage: "en-IN",
      isAccessibleForFree: true,
      isPartOf: { "@type": "WebSite", name: "Shishya", url: SITE },
      publisher: PATH_ORG_REF,
      mainEntity: streamProgramLd(model),
    },
    pathBreadcrumbLd(model.breadcrumb),
  ];
}
