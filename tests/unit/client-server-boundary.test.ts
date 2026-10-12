// No client component may import (through any chain of value imports) a
// server-only module (12 Oct 2026). Release 2 (f1b3335) passed tsc and the
// full vitest run but failed `next build` on Vercel: src/app/coach/
// CoachIntake.tsx ("use client") imported src/lib/date-tier-view.ts, whose
// imports reach src/lib/ai/exam-info.ts (the Anthropic SDK) and
// src/lib/ai/usage.ts (`after` from next/server). The live site stayed on the
// last good deploy, but main could not deploy until it was fixed. This scan is
// the gate's stand-in for that part of `next build`: it walks every
// "use client" file's static value imports (type-only imports are erased and
// skipped) and fails on any chain that reaches one of SERVER_ONLY.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");

/** Module specifiers a client bundle must never reach. */
const SERVER_ONLY = /^(next\/server|next\/headers|server-only|@anthropic-ai\/sdk|@prisma\/client|@\/lib\/db\/prisma|node:|fs$|crypto$)/;

const IMPORT_RE = /^\s*(?:import|export)\s+([^;]*?)\s+from\s+["']([^"']+)["']|^\s*import\s+["']([^"']+)["']/gm;

function listFiles(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) listFiles(p, out);
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}

const textCache = new Map<string, string>();
const read = (p: string) => {
  let t = textCache.get(p);
  if (t === undefined) {
    t = fs.readFileSync(p, "utf8");
    textCache.set(p, t);
  }
  return t;
};

function resolveSpec(spec: string, from: string): string | null {
  let base: string;
  if (spec.startsWith("@/")) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith(".")) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts"), path.join(base, "index.tsx")]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

/** Value-import specifiers of one file (an `import type …` / `export type …`
 *  or an all-`type` brace list is erased by the compiler, so it is skipped). */
function valueImports(file: string): string[] {
  const out: string[] = [];
  for (const m of read(file).matchAll(IMPORT_RE)) {
    const what = (m[1] ?? "").trim();
    const spec = m[2] ?? m[3];
    if (what.startsWith("type ") || /^\{\s*(?:type\s+\w+(?:\s+as\s+\w+)?\s*,?\s*)+\}$/.test(what)) continue;
    out.push(spec);
  }
  return out;
}

/** The first chain from a client file to a server-only specifier, or null. */
function serverChain(client: string): string[] | null {
  const parent = new Map<string, string | null>([[client, null]]);
  const stack = [client];
  while (stack.length) {
    const file = stack.pop()!;
    for (const spec of valueImports(file)) {
      if (SERVER_ONLY.test(spec)) {
        const chain = [spec];
        for (let f: string | null = file; f; f = parent.get(f) ?? null) chain.push(path.relative(ROOT, f).replace(/\\/g, "/"));
        return chain;
      }
      const next = resolveSpec(spec, file);
      if (next && !parent.has(next)) {
        parent.set(next, file);
        stack.push(next);
      }
    }
  }
  return null;
}

describe("client/server boundary (the part of next build that tsc and vitest miss)", () => {
  const clients = listFiles(SRC).filter((f) => /^\s*["']use client["']/.test(read(f)));

  it("finds the client components (the scan is not vacuous)", () => {
    expect(clients.length).toBeGreaterThan(100);
    expect(clients.some((f) => f.replace(/\\/g, "/").endsWith("src/app/coach/CoachIntake.tsx"))).toBe(true);
  });

  it("no client component reaches a server-only module through its value imports", () => {
    const bad = clients.map(serverChain).filter((c): c is string[] => c !== null).map((c) => c.join(" <- "));
    expect(bad).toEqual([]);
  }, 120_000);

  it("the scan does catch the 12 Oct chain (date-tier-view reaches the Anthropic SDK)", () => {
    const chain = serverChain(path.join(SRC, "lib/date-tier-view.ts"));
    expect(chain).not.toBeNull();
    expect(chain![0]).toMatch(SERVER_ONLY);
  });

  it("CoachIntake takes its prefill words from the import-free module", () => {
    const intake = read(path.join(SRC, "app/coach/CoachIntake.tsx"));
    expect(intake).toContain('import { coachPrefillDateNote } from "@/lib/coach-prefill-note";');
    expect(valueImports(path.join(SRC, "lib/coach-prefill-note.ts"))).toEqual([]);
  });
});
