// Private pages carry their own noindex tag and title (3 Oct 2026, fix C13).
//
// Live on 2-3 Oct a guest's fetch of /dashboard, /admin, /attempts/{id}/results
// and /discussions/new answered 200 (the redirect arrives inside the stream
// because of loading.tsx) with the site default "index, follow"; /logout and
// /exams/{code}/attempts printed it on their redirect. Each now states
// robots { index: false, follow: false } itself, and the admin section gets a
// layout that does the same for the 10 admin pages without a robots of their
// own. Sources are read as text; the admin layout is imported (no DB).

import fs from "node:fs";
import path from "node:path";
import { describe, it, expect } from "vitest";
import type { ReactNode } from "react";
import * as adminLayout from "@/app/admin/layout";

const ROOT = path.resolve(__dirname, "../..");
const read = (f: string) => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const PAGES: [file: string, title: string][] = [
  ["src/app/dashboard/page.tsx", "Your dashboard — Shishya"],
  ["src/app/logout/page.tsx", "Sign out — Shishya"],
  ["src/app/attempts/[id]/results/page.tsx", "Your result — Shishya"],
  ["src/app/exams/[code]/attempts/page.tsx", "Your attempts — Shishya"],
  ["src/app/discussions/new/page.tsx", "Start a discussion — Shishya"],
];

describe("private pages: their own noindex and title", () => {
  for (const [file, title] of PAGES) {
    it(file, () => {
      const code = stripComments(read(file));
      expect(code).toContain("index: false");
      expect(code).toContain(
        `export const metadata: Metadata = { title: "${title}", robots: { index: false, follow: false } };`,
      );
      expect(code).toMatch(/import type \{ Metadata \} from "next";/);
      // One metadata source per page: a generateMetadata would compete with it.
      expect(code).not.toMatch(/export (async )?function generateMetadata/);
    });
  }
});

describe("admin layout", () => {
  it("contains index: false and sets robots noindex, nofollow", () => {
    const code = stripComments(read("src/app/admin/layout.tsx"));
    expect(code).toContain("index: false");
    expect(adminLayout.metadata).toEqual({ robots: { index: false, follow: false } });
  });

  it("returns its children untouched (admin/loading.tsx keeps working)", () => {
    const child = { marker: "admin page" } as unknown as ReactNode;
    expect(adminLayout.default({ children: child })).toBe(child);
    expect(fs.existsSync(path.join(ROOT, "src/app/admin/loading.tsx"))).toBe(true);
  });
});
