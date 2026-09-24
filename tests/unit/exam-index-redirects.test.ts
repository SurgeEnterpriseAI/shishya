// /exams/[code]/topics and /exams/[code]/pyq (24 Sep 2026): both were 404s
// that students reached by editing a topic or PYQ-year URL up one level
// (46 views from 20 people in September). They now redirect to the hub's
// Syllabus (#syllabus) and Previous Papers (#pyqs) sections — in the /hi or
// /te twin when the request came through one — and an unknown or inactive
// exam stays a 404. Prisma, the URL-locale reader and next/navigation are
// mocked; the pages are the real modules.

import { describe, it, expect, vi, beforeEach } from "vitest";

const state = vi.hoisted(() => ({
  exam: null as null | { code: string; active: boolean },
  locale: "en" as string,
  lookups: [] as unknown[],
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    exam: {
      findUnique: async (args: unknown) => {
        state.lookups.push(args);
        return state.exam;
      },
    },
  },
}));
vi.mock("@/lib/i18n-server", () => ({ getUrlLocale: async () => state.locale }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  },
}));

import TopicsIndexPage from "@/app/exams/[code]/topics/page";
import PyqIndexPage from "@/app/exams/[code]/pyq/page";

async function outcome(page: (p: { params: Promise<{ code: string }> }) => Promise<unknown>, code: string): Promise<string> {
  try {
    await page({ params: Promise.resolve({ code }) });
    return "rendered";
  } catch (e) {
    const err = e as Error & { url?: string };
    return err.message === "NEXT_REDIRECT" ? `redirect ${err.url}` : err.message;
  }
}

beforeEach(() => {
  state.exam = { code: "TS_POLICE_PC", active: true };
  state.locale = "en";
  state.lookups = [];
});

describe("/exams/[code]/topics → the hub's Syllabus section", () => {
  it("redirects to /exams/{code}#syllabus", async () => {
    expect(await outcome(TopicsIndexPage, "TS_POLICE_PC")).toBe("redirect /exams/TS_POLICE_PC#syllabus");
    expect(state.lookups).toEqual([{ where: { code: "TS_POLICE_PC" }, select: { code: true, active: true } }]);
  });

  it("keeps the /hi and /te twin", async () => {
    state.locale = "hi";
    expect(await outcome(TopicsIndexPage, "TS_POLICE_PC")).toBe("redirect /hi/exams/TS_POLICE_PC#syllabus");
    state.locale = "te";
    expect(await outcome(TopicsIndexPage, "TS_POLICE_PC")).toBe("redirect /te/exams/TS_POLICE_PC#syllabus");
  });

  it("an unknown exam is a 404, and so is an inactive one (as the hub)", async () => {
    state.exam = null;
    expect(await outcome(TopicsIndexPage, "NOPE")).toBe("NEXT_NOT_FOUND");
    state.exam = { code: "MP_RAEO", active: false };
    expect(await outcome(TopicsIndexPage, "MP_RAEO")).toBe("NEXT_NOT_FOUND");
  });
});

describe("/exams/[code]/pyq → the hub's Previous Papers section", () => {
  it("redirects to /exams/{code}#pyqs, in the twin's language", async () => {
    expect(await outcome(PyqIndexPage, "TS_POLICE_PC")).toBe("redirect /exams/TS_POLICE_PC#pyqs");
    state.locale = "te";
    expect(await outcome(PyqIndexPage, "TS_POLICE_PC")).toBe("redirect /te/exams/TS_POLICE_PC#pyqs");
  });

  it("an unknown or inactive exam is a 404", async () => {
    state.exam = null;
    expect(await outcome(PyqIndexPage, "NOPE")).toBe("NEXT_NOT_FOUND");
    state.exam = { code: "KA_KSRP", active: false };
    expect(await outcome(PyqIndexPage, "KA_KSRP")).toBe("NEXT_NOT_FOUND");
  });
});

describe("the anchors the redirects land on", () => {
  it("the hub still renders id=\"syllabus\" and id=\"pyqs\"", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const hub = fs.readFileSync(path.join(process.cwd(), "src/app/exams/[code]/page.tsx"), "utf8");
    expect(hub).toMatch(/<section id="syllabus"/);
    expect(hub).toMatch(/<section id="pyqs"/);
  });
});
