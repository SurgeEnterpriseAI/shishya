// The skip-/login test's uneven split (3 Oct 2026, sign-ups-to-100 plan, lever 6).
//
// On 3 Oct the test (src/lib/direct-signin-ab.ts, src/components/SignInLink.tsx)
// counted 45 browsers in "direct" and 28-29 in "login". The check found NO fault
// in the code: the arm is drawn 50/50 once per browser and stored, and BOTH arms
// send the same single click beacon (navigator.sendBeacon, which outlives any
// navigation) BEFORE the tap goes anywhere — so the arm cannot change whether a
// click is counted. The split is within chance (exact two-sided p 0.06-0.08).
// Most of the gap came early: 33 vs 13 on 30 Sep - 1 Oct, then 12 vs 16 from 2 Oct,
// with no commit to the click path in between (a cut chosen after seeing the data).
// The read-only queries: scripts/tmp-skip-login-split.ts (section 7 is the decision
// read, with sensitivity rows) and -2.ts.
//
// These tests pin exactly what that conclusion rests on, by running the real
// button's click handler in both arms (no DOM, no network): a later change that
// beacons in one arm only, beacons after the navigation starts, sends a second
// beacon, or lets a storage failure land in "direct" would make the two arms'
// counts incomparable again — and fails here.
//
// Run: npx vitest run tests/unit/direct-signin-split.test.ts

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import * as signinCtaMod from "@/lib/signin-cta";
import * as sessionHintMod from "@/lib/session-hint";
import * as inAppMod from "@/lib/in-app-browser";
import * as directMod from "@/lib/direct-signin-ab";

const { DIRECT_SIGNIN_AB_KEY, DIRECT_SIGNIN_SURFACES, DIRECT_SIGNIN_TEST_ON } = directMod;
const ROOT = process.cwd();

// ── The real SignInLink, loaded with React's two hooks answered outside a render ──
// (useState gives its initial value, useEffect does nothing: the click handler is
// all that is exercised). next/link is a stub: the element it would render is
// returned as is, so its props — the handlers — can be called directly.

const order: string[] = [];
const handoff = {
  goToGoogle: vi.fn(async (_cb: string) => {
    order.push("google");
  }),
  warmGoogleHandoff: vi.fn(async () => {
    order.push("warm");
    return "token";
  }),
};

const STUBS: Record<string, unknown> = {
  react: { ...React, useState: <T,>(v: T) => [v, () => {}], useEffect: () => {} },
  "react/jsx-runtime": jsxRuntime,
  "next/link": { __esModule: true, default: function LinkStub() { return null; } },
  "@/lib/session-hint": sessionHintMod,
  "@/lib/in-app-browser": inAppMod,
  "@/lib/direct-signin-ab": directMod,
  "@/lib/signin-cta": signinCtaMod,
  "@/lib/google-handoff": { __esModule: true, ...handoff },
};

function loadSignInLink(): (p: Record<string, unknown>) => React.ReactElement<Record<string, unknown>> {
  const file = path.join(ROOT, "src/components/SignInLink.tsx");
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    fileName: file,
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mod = { exports: {} as Record<string, unknown> };
  const req = (spec: string): unknown => {
    if (spec in STUBS) return STUBS[spec];
    throw new Error(`SignInLink imports an unexpected module: ${spec}`);
  };
  new Function("require", "module", "exports", "process", out)(req, mod, mod.exports, process);
  return mod.exports.SignInLink as (p: Record<string, unknown>) => React.ReactElement<Record<string, unknown>>;
}
const SignInLink = loadSignInLink();

// ── A browser: storage, cookie, user agent, and the beacon transport ──

const CHROME = "Mozilla/5.0 (Linux; Android 14; SM-A146B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36";
let beacons: Blob[] = [];

function browser(opts: { stored?: string; storage?: "ok" | "throws" | "missing"; cookie?: string; ua?: string } = {}) {
  const m = new Map<string, string>();
  if (opts.stored) m.set(DIRECT_SIGNIN_AB_KEY, opts.stored);
  const storage = { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
  const win: Record<string, unknown> = { location: { href: "https://shishya.in/exams/SSC_CGL", pathname: "/exams/SSC_CGL" }, addEventListener() {}, removeEventListener() {} };
  if (opts.storage === "throws")
    Object.defineProperty(win, "localStorage", {
      get() {
        throw new Error("SecurityError: storage is blocked");
      },
    });
  else if (opts.storage !== "missing") win.localStorage = storage;
  vi.stubGlobal("window", win);
  vi.stubGlobal("location", win.location);
  vi.stubGlobal("document", { cookie: opts.cookie ?? "" });
  vi.stubGlobal("navigator", {
    userAgent: opts.ua ?? CHROME,
    sendBeacon: (url: string, body: Blob) => {
      order.push(`beacon ${url}`);
      beacons.push(body);
      return true;
    },
  });
  return { stored: () => m.get(DIRECT_SIGNIN_AB_KEY) ?? null, win };
}

const HREF = "/login?callbackUrl=%2Fexams%2FSSC_CGL%3Fstart%3Dpractice&from=hub-box";
function button(surface = "hub-box") {
  return SignInLink({ href: HREF, surface, className: "x", children: "Sign up with Google", beaconProps: { examCode: "SSC_CGL" } }).props as {
    onClick: (e: unknown) => void;
    onPointerEnter: () => void;
    onTouchStart: () => void;
    onFocus: () => void;
    href: string;
  };
}
function tap(extra: Record<string, unknown> = {}) {
  const e = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, preventDefault: () => order.push("preventDefault"), ...extra };
  button().onClick(e);
}
const settle = () => new Promise((r) => setTimeout(r, 0));
async function sent(): Promise<Array<{ kind: string; path: string; props: Record<string, unknown> }>> {
  return Promise.all(beacons.map(async (b) => JSON.parse(await b.text())));
}

beforeEach(() => {
  order.length = 0;
  beacons = [];
  handoff.goToGoogle.mockClear();
  handoff.warmGoogleHandoff.mockClear();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe.runIf(DIRECT_SIGNIN_TEST_ON)("the skip-/login test: both arms are counted the same way", () => {
  it("'direct': ONE beacon, sent before the tap leaves for Google", async () => {
    browser({ stored: "direct" });
    tap();
    await settle();
    expect(order).toEqual(["beacon /api/analytics", "preventDefault", "google"]);
    const [ev] = await sent();
    expect(ev.kind).toBe("CTA_CLICKED");
    expect(ev.props).toEqual({ cta: "signin-click", surface: "hub-box", examCode: "SSC_CGL", callbackFamily: "exam", via: "google", bucket: "direct" });
    expect(handoff.goToGoogle).toHaveBeenCalledWith("/exams/SSC_CGL?start=practice");
  });

  it("'login': ONE beacon, sent before the link's own navigation to /login (nothing is prevented, Google is not called)", async () => {
    browser({ stored: "login" });
    tap();
    await settle();
    expect(order).toEqual(["beacon /api/analytics"]);
    const [ev] = await sent();
    expect(ev.props).toEqual({ cta: "signin-click", surface: "hub-box", examCode: "SSC_CGL", callbackFamily: "exam", via: "login", bucket: "login" });
    expect(handoff.goToGoogle).not.toHaveBeenCalled();
  });

  it("the two arms' beacons differ only in bucket and via — same kind, path, keys, transport", async () => {
    browser({ stored: "direct" });
    tap();
    const [d] = await sent();
    beacons = [];
    browser({ stored: "login" });
    tap();
    const [l] = await sent();
    expect(Object.keys(d.props).sort()).toEqual(Object.keys(l.props).sort());
    expect({ ...d, props: { ...d.props, bucket: "-", via: "-" } }).toEqual({ ...l, props: { ...l.props, bucket: "-", via: "-" } });
  });

  it("a fallback to /login in the direct arm (the hand-off chunk failed) sends no second beacon", async () => {
    const env = browser({ stored: "direct" });
    handoff.goToGoogle.mockImplementationOnce(async () => {
      throw new Error("chunk failed");
    });
    tap();
    await settle();
    await settle();
    expect(beacons).toHaveLength(1);
    expect((env.win.location as { href: string }).href).toBe(HREF);
  });

  it("hover, touch and focus draw the arm and send NO beacon, in either arm", async () => {
    for (const stored of ["direct", "login"]) {
      browser({ stored });
      const b = button();
      b.onPointerEnter();
      b.onTouchStart();
      b.onFocus();
      await settle();
      expect(beacons, stored).toHaveLength(0);
    }
    // A fresh browser: the arm is drawn (and kept) on the first hover, not on the tap.
    vi.spyOn(Math, "random").mockReturnValue(0.7);
    const env = browser();
    button().onPointerEnter();
    expect(env.stored()).toBe("login");
    expect(beacons).toHaveLength(0);
  });

  it("a fresh browser's first tap draws 50/50 and keeps the arm; the beacon carries the drawn arm", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.2);
    const a = browser();
    tap();
    expect(a.stored()).toBe("direct");
    vi.spyOn(Math, "random").mockReturnValue(0.7);
    tap(); // kept: a later draw never moves the browser
    expect(a.stored()).toBe("direct");
    const evs = await sent();
    expect(evs.map((e) => e.props.bucket)).toEqual(["direct", "direct"]);
    // Over a uniform grid of draws, through the button itself: exactly half 'direct'.
    let direct = 0;
    for (let i = 0; i < 200; i++) {
      vi.spyOn(Math, "random").mockReturnValue(i / 200);
      const b = browser();
      button().onPointerEnter();
      if (b.stored() === "direct") direct++;
    }
    expect(direct).toBe(100);
  });

  it("blocked or missing storage is never 'direct' and always goes to /login; a signed-in hint is in neither arm", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1); // would draw 'direct'
    for (const storage of ["throws", "missing"] as const) {
      browser({ storage });
      tap();
    }
    browser({ cookie: "a=1; shishya_in=1" });
    tap();
    await settle();
    const evs = await sent();
    expect(evs).toHaveLength(3);
    const [blocked, missing, hinted] = evs;
    // A storage failure never drew an arm. Today it is labelled 'login'; leaving it
    // outside the test (no bucket) would be right too. Only 'direct' would be a fault,
    // because it would add browsers to 'direct' that never drew it.
    for (const ev of [blocked, missing]) {
      expect(["login", null]).toContain(ev.props.bucket ?? null);
      expect(ev.props.via).toBe("login");
    }
    expect(hinted.props.bucket ?? null).toBeNull();
    expect(hinted.props.via).toBe("login");
    expect(order.filter((o) => o === "preventDefault")).toHaveLength(0);
    expect(handoff.goToGoogle).not.toHaveBeenCalled();
  });

  it("an in-app browser keeps its drawn arm on the beacon (marked inApp) and always goes to /login", async () => {
    browser({ stored: "direct", ua: "Mozilla/5.0 (Linux; Android 13; wv) AppleWebKit/537.36 Instagram 300.0" });
    tap();
    await settle();
    const [ev] = await sent();
    expect(ev.props).toMatchObject({ bucket: "direct", via: "login", inApp: "instagram" });
    expect(order).toEqual(["beacon /api/analytics"]);
  });

  it("every surface in the test gets the same treatment (the hub box is not special)", async () => {
    for (const surface of DIRECT_SIGNIN_SURFACES) {
      for (const stored of ["direct", "login"]) {
        beacons = [];
        order.length = 0;
        browser({ stored });
        button(surface).onClick({ button: 0, preventDefault: () => order.push("preventDefault") });
        const evs = await sent();
        expect(evs, `${surface} ${stored}`).toHaveLength(1);
        expect(evs[0].props.bucket, `${surface} ${stored}`).toBe(stored);
        expect(order[0], `${surface} ${stored}`).toBe("beacon /api/analytics");
      }
    }
  });
});
