// Root layout shell (26 Sep 2026, every-education-search wave, group
// "site-shell"): two site-wide signals in src/app/layout.tsx.
//
//   • The Organization JSON-LD declared the GitHub repository as Shishya's
//     sameAs — and that repo is result #1 for a "Shishya" brand search,
//     above shishya.in. sameAs is removed until the founder supplies the
//     brand's real public profiles.
//   • Default metadata robots: index + follow (what a page with no robots
//     tag already meant) plus max-image-preview:large and max-snippet:-1.
//     A page with its own robots replaces the whole object (Next merges
//     metadata per top-level key), as before.
//
// The layout must stay synchronous and static (no cookies()/headers()/auth())
// so pages can keep static rendering and edge caching.
//
// Vitest cannot import the layout directly (tsconfig keeps jsx: "preserve"
// for Next), so the test transpiles the real file with TypeScript
// (react-jsx) and evaluates it with the fonts, the CSS and the four client
// components stubbed; React, react-dom/server, Next's robots resolver and
// src/lib/site-description.ts are real. No DB, no network.
// Run: npx vitest run tests/unit/site-shell-metadata.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
// Next's own resolver: the exact <meta name="robots"> content it renders.
import { resolveRobots } from "next/dist/lib/metadata/resolvers/resolve-basics";
import * as siteDescription from "@/lib/site-description";

const ROOT = path.resolve(__dirname, "../..");
const LAYOUT = "src/app/layout.tsx";
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
/** Comments quote removed values on purpose; check only code. */
const code = (f: string) =>
  read(f)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:"'`])\/\/.*$/gm, "$1");

type Node = Record<string, unknown>;
type LayoutModule = {
  default: (props: { children: React.ReactNode }) => React.ReactElement;
  metadata: { robots?: unknown };
};

const nullComponent = () => null;
const STUBS: Record<string, unknown> = {
  react: React,
  "react/jsx-runtime": jsxRuntime,
  "@/lib/site-description": siteDescription,
  "next/font/google": {
    Inter: () => ({ variable: "font-inter", className: "font-inter" }),
    Noto_Sans_Devanagari: () => ({ variable: "font-noto", className: "font-noto" }),
  },
  "@/components/FeedbackWidget": { FeedbackWidget: nullComponent },
  "@/components/AnalyticsTracker": { AnalyticsTracker: nullComponent },
  "@/components/SignupNudge": { SignupNudge: nullComponent },
  "@/components/SiteFooter": { SiteFooter: nullComponent },
  "./globals.css": {},
};

function loadLayout(): LayoutModule {
  const out = ts.transpileModule(read(LAYOUT), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const req = (id: string) => {
    if (!(id in STUBS)) throw new Error(`layout imports an unexpected module: ${id}`);
    return STUBS[id];
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports as unknown as LayoutModule;
}

const layout = loadLayout();

function jsonLdNodes(): Node[] {
  const html = renderToStaticMarkup(React.createElement(layout.default, { children: React.createElement("main", null, "page") }));
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  return blocks.map((b) => JSON.parse(b) as Node);
}

describe("root metadata robots default", () => {
  it("declares index, follow, max-image-preview:large and max-snippet:-1", () => {
    expect(layout.metadata.robots).toEqual({
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    });
  });

  it("renders as one robots meta value through Next's resolver, with no googleBot block", () => {
    const resolved = resolveRobots(layout.metadata.robots as never);
    expect(resolved?.basic).toBe("index, follow, max-image-preview:large, max-snippet:-1");
    // A page's googleBot-only rule is its own; the root adds none.
    expect(resolved?.googleBot).toBeNull();
    expect(resolved?.basic).not.toMatch(/noindex|nofollow|nosnippet|noimageindex/);
  });
});

describe("site-wide JSON-LD", () => {
  const nodes = jsonLdNodes();
  const org = nodes.find((n) => n["@type"] === "EducationalOrganization");
  const site = nodes.find((n) => n["@type"] === "WebSite");

  it("renders exactly the WebSite and EducationalOrganization nodes, each parseable, on schema.org", () => {
    expect(nodes).toHaveLength(2);
    expect(site).toBeDefined();
    expect(org).toBeDefined();
    for (const n of nodes) expect(n["@context"]).toBe("https://schema.org");
    expect(org?.["@id"]).toBe(siteDescription.SITE_ORG_ID);
  });

  it("the Organization names no sameAs (the GitHub repo is not Shishya's profile)", () => {
    expect(org).not.toHaveProperty("sameAs");
  });

  it("no JSON-LD node points at github.com", () => {
    expect(JSON.stringify(nodes)).not.toMatch(/github\.com/i);
  });

  it("the removal kept the real-entity signals (operator, contact, logo)", () => {
    const parent = org?.parentOrganization as Node | undefined;
    expect(parent?.name).toBe("Surge Software Solutions Pvt Ltd");
    expect(org?.contactPoint).toBeDefined();
    expect(org?.logo).toBeDefined();
  });
});

describe("layout source stays synchronous and static", () => {
  const src = code(LAYOUT);

  it("RootLayout is a plain (non-async) function", () => {
    expect(src).toMatch(/export default function RootLayout\(/);
    expect(src).not.toMatch(/export default async function/);
  });

  it("reads no request data (cookies, headers, auth, draftMode) and sets no dynamic flags", () => {
    expect(src).not.toMatch(/from "next\/headers"/);
    expect(src).not.toMatch(/\bcookies\(|\bheaders\(|\bauth\(|\bdraftMode\(/);
    expect(src).not.toMatch(/export const (dynamic|revalidate)\b/);
  });

  it("names no GitHub URL and no sameAs in code", () => {
    expect(src).not.toMatch(/github\.com/i);
    expect(src).not.toMatch(/\bsameAs\b/);
  });
});
