// Cache pilot (16 Sep 2026): the /hi and /te URLs of /exams/[code]/guide and
// /tricks pass through src/middleware.ts to the [lang] route un-rewritten,
// while every other twin keeps the rewrite + x-shishya-lang header, and the
// language-cookie and redirect rules stay as they were. Runs the real
// middleware against NextRequests; no user-agent is set, so the AI-bot
// logger never fires a request.

import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

const event = { waitUntil() {}, sourcePage: "" } as never;

function run(url: string, init?: { headers?: Record<string, string>; cookie?: string }) {
  const headers = new Headers(init?.headers ?? {});
  if (init?.cookie) headers.set("cookie", init.cookie);
  return middleware(new NextRequest(url, { headers }), event);
}

const rewriteTarget = (res: Response) => {
  const v = res.headers.get("x-middleware-rewrite");
  return v ? new URL(v).pathname : null;
};

describe("middleware: cache-pilot twins pass through", () => {
  it("/hi/exams/X/guide is served by the [lang] route: no rewrite, no language header", () => {
    const res = run("https://shishya.in/hi/exams/SSC_GD/guide");
    expect(res.status).toBe(200);
    expect(res.headers.get("x-middleware-next")).toBe("1");
    expect(rewriteTarget(res)).toBeNull();
    expect(res.headers.get("x-middleware-request-x-shishya-lang")).toBeNull();
  });

  it("/te/exams/X/tricks too, with or without a trailing slash", () => {
    for (const u of ["https://shishya.in/te/exams/SSC_GD/tricks", "https://shishya.in/te/exams/SSC_GD/tricks/"]) {
      const res = run(u);
      expect(res.headers.get("x-middleware-next")).toBe("1");
      expect(rewriteTarget(res)).toBeNull();
    }
  });

  it("a spoofed x-shishya-lang on a pilot twin is dropped, not forwarded", () => {
    const res = run("https://shishya.in/hi/exams/SSC_GD/guide", { headers: { "x-shishya-lang": "te" } });
    expect(res.headers.get("x-middleware-request-x-shishya-lang")).toBeNull();
    expect(res.headers.get("x-middleware-override-headers") ?? "").not.toMatch(/x-shishya-lang/);
  });

  it("still sets the language cookie for a cold visitor, never over an existing one, never on prefetch", () => {
    const cold = run("https://shishya.in/hi/exams/SSC_GD/guide");
    expect(cold.cookies.get("shishya-lang")?.value).toBe("hi");

    const chosen = run("https://shishya.in/hi/exams/SSC_GD/guide", { cookie: "shishya-lang=te" });
    expect(chosen.cookies.get("shishya-lang")).toBeUndefined();

    const prefetch = run("https://shishya.in/te/exams/SSC_GD/tricks", { headers: { "next-router-prefetch": "1" } });
    expect(prefetch.cookies.get("shishya-lang")).toBeUndefined();
  });
});

describe("middleware: everything else is unchanged", () => {
  it("other public twins are still rewritten with the language header", () => {
    for (const [u, target] of [
      ["https://shishya.in/hi/exams/SSC_GD", "/exams/SSC_GD"],
      ["https://shishya.in/hi/exams/SSC_GD/cutoff", "/exams/SSC_GD/cutoff"],
      ["https://shishya.in/te/exams/SSC_GD/updates", "/exams/SSC_GD/updates"],
      ["https://shishya.in/hi/exams/SSC_GD/topics/ga.history/hi", "/exams/SSC_GD/topics/ga.history/hi"],
      ["https://shishya.in/hi/exam-calendar", "/exam-calendar"],
      ["https://shishya.in/te", "/"],
    ] as const) {
      const res = run(u);
      expect(rewriteTarget(res), u).toBe(target);
      expect(res.headers.get("x-middleware-request-x-shishya-lang"), u).toBe(u.includes("/te") ? "te" : "hi");
    }
  });

  it("private paths under a prefix still redirect to the plain path", () => {
    const res = run("https://shishya.in/hi/dashboard");
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe("/dashboard");
  });

  it("the English pilot URLs pass through as before, spoofed header stripped", () => {
    const plain = run("https://shishya.in/exams/SSC_GD/guide");
    expect(plain.headers.get("x-middleware-next")).toBe("1");
    expect(rewriteTarget(plain)).toBeNull();

    const spoofed = run("https://shishya.in/exams/SSC_GD/tricks", { headers: { "x-shishya-lang": "hi" } });
    expect(spoofed.headers.get("x-middleware-request-x-shishya-lang")).toBeNull();
  });
});
