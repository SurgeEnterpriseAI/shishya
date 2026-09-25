import { describe, expect, it } from "vitest";
import {
  DEFAULT_RETURN_PATH,
  isSameOriginPath,
  loginRedirectPath,
  returnUtmQuery,
  returnUtmTags,
  withReturnUtm,
} from "@/lib/login-return";

// What src/lib/email.ts withMailUtm() puts on a win-back link.
const EMAIL = { utm_source: "email", utm_medium: "winback", utm_campaign: "winback" };

/** Decode the callbackUrl the way /login's searchParams will see it. */
function callbackOf(loginPath: string): string {
  expect(loginPath.startsWith("/login?callbackUrl=")).toBe(true);
  return new URLSearchParams(loginPath.slice("/login?".length)).get("callbackUrl") ?? "";
}

describe("returnUtmTags / returnUtmQuery", () => {
  it("keeps utm_source, utm_medium and utm_campaign in that order", () => {
    expect(returnUtmQuery({ utm_campaign: "winback", utm_source: "email", utm_medium: "winback" })).toBe(
      "?utm_source=email&utm_medium=winback&utm_campaign=winback",
    );
  });

  it("drops every other param: utm_content, tokens, emails, ids", () => {
    const q = returnUtmQuery({
      ...EMAIL,
      utm_content: "ssc-cgl",
      token: "abc123",
      email: "someone@example.com",
      callbackUrl: "https://evil.example",
      joined: "1",
    });
    expect(q).toBe("?utm_source=email&utm_medium=winback&utm_campaign=winback");
  });

  it("returns an empty string when no tag is present", () => {
    expect(returnUtmQuery({})).toBe("");
    expect(returnUtmQuery({ joined: "1" })).toBe("");
    expect(returnUtmQuery(null)).toBe("");
    expect(returnUtmQuery(undefined)).toBe("");
  });

  it("drops a value outside [A-Za-z0-9_.-] or over 64 chars instead of rewriting it", () => {
    expect(
      returnUtmTags({
        utm_source: "email",
        utm_medium: "win back",
        utm_campaign: "<script>",
      }),
    ).toEqual([["utm_source", "email"]]);
    expect(returnUtmTags({ utm_source: "a".repeat(65) })).toEqual([]);
    expect(returnUtmTags({ utm_source: "a".repeat(64) })).toEqual([["utm_source", "a".repeat(64)]]);
    expect(returnUtmTags({ utm_source: "x&utm_medium=evil" })).toEqual([]);
    expect(returnUtmTags({ utm_source: "" })).toEqual([]);
  });

  it("accepts the slugs email.ts emits (dots, dashes, underscores, mixed case)", () => {
    expect(returnUtmTags({ utm_source: "chatgpt.com", utm_medium: "daily-five", utm_campaign: "Exam_Eve" })).toEqual([
      ["utm_source", "chatgpt.com"],
      ["utm_medium", "daily-five"],
      ["utm_campaign", "Exam_Eve"],
    ]);
  });

  it("takes the first value of a repeated param and trims it", () => {
    expect(returnUtmQuery({ utm_source: ["email", "evil"], utm_medium: " winback " })).toBe(
      "?utm_source=email&utm_medium=winback",
    );
  });

  it("reads a URLSearchParams the same way", () => {
    const sp = new URLSearchParams("utm_source=email&utm_medium=daily-five&token=zzz");
    expect(returnUtmQuery(sp)).toBe("?utm_source=email&utm_medium=daily-five");
  });
});

describe("isSameOriginPath", () => {
  it("accepts site-relative paths", () => {
    expect(isSameOriginPath("/dashboard")).toBe(true);
    expect(isSameOriginPath("/mocks/cmf123abc")).toBe(true);
    expect(isSameOriginPath("/today?utm_source=email")).toBe(true);
    expect(isSameOriginPath("/")).toBe(true);
  });

  it("rejects absolute, protocol-relative, backslashed and scheme URLs", () => {
    expect(isSameOriginPath("https://evil.example/x")).toBe(false);
    expect(isSameOriginPath("http://shishya.in/dashboard")).toBe(false);
    expect(isSameOriginPath("//evil.example")).toBe(false);
    expect(isSameOriginPath("/\\evil.example")).toBe(false);
    expect(isSameOriginPath("/dash\\board")).toBe(false);
    expect(isSameOriginPath("javascript:alert(1)")).toBe(false);
    expect(isSameOriginPath("dashboard")).toBe(false);
    expect(isSameOriginPath("")).toBe(false);
  });

  it("rejects whitespace and control characters (browsers strip tabs/newlines)", () => {
    expect(isSameOriginPath("/\t/evil.example")).toBe(false);
    expect(isSameOriginPath("/\n/evil.example")).toBe(false);
    expect(isSameOriginPath("/x y")).toBe(false);
    expect(isSameOriginPath("/x\u0000")).toBe(false);
  });
});

describe("withReturnUtm", () => {
  it("adds the tags to a bare path", () => {
    expect(withReturnUtm("/dashboard", EMAIL)).toBe(
      "/dashboard?utm_source=email&utm_medium=winback&utm_campaign=winback",
    );
  });

  it("returns the path unchanged when there is no valid tag", () => {
    expect(withReturnUtm("/dashboard", {})).toBe("/dashboard");
    expect(withReturnUtm("/mocks/abc", { token: "x" })).toBe("/mocks/abc");
  });

  it("keeps an existing query and hash, replacing a same-name utm", () => {
    expect(withReturnUtm("/exams/SSC_CGL?start=diagnostic&utm_source=old#custom", { utm_source: "email" })).toBe(
      "/exams/SSC_CGL?start=diagnostic&utm_source=email#custom",
    );
  });

  it("falls back to /dashboard for an unsafe path, tags still carried", () => {
    expect(withReturnUtm("https://evil.example", EMAIL)).toBe(
      `${DEFAULT_RETURN_PATH}?utm_source=email&utm_medium=winback&utm_campaign=winback`,
    );
    expect(withReturnUtm("//evil.example", {})).toBe(DEFAULT_RETURN_PATH);
    expect(withReturnUtm("/\\evil.example", {})).toBe(DEFAULT_RETURN_PATH);
  });
});

describe("loginRedirectPath", () => {
  it("encodes the tagged callback once; /login decodes it back to a same-origin path", () => {
    const out = loginRedirectPath("/dashboard", EMAIL);
    expect(out).toBe(
      "/login?callbackUrl=%2Fdashboard%3Futm_source%3Demail%26utm_medium%3Dwinback%26utm_campaign%3Dwinback",
    );
    // The tags are inside the callback, not on /login itself.
    const outer = new URLSearchParams(out.slice("/login?".length));
    expect([...outer.keys()]).toEqual(["callbackUrl"]);
    const cb = callbackOf(out);
    expect(cb).toBe("/dashboard?utm_source=email&utm_medium=winback&utm_campaign=winback");
    expect(isSameOriginPath(cb)).toBe(true);
  });

  it("matches /today's old signed-out redirect byte for byte for email tags", () => {
    const sp = { utm_source: "email", utm_medium: "daily-five", utm_campaign: "daily-five" };
    const qs = "?utm_source=email&utm_medium=daily-five&utm_campaign=daily-five";
    expect(loginRedirectPath("/today", sp)).toBe(`/login?callbackUrl=${encodeURIComponent(`/today${qs}`)}`);
  });

  it("matches the old /mocks redirect exactly when there are no tags", () => {
    expect(loginRedirectPath("/mocks/cmf123abc", {})).toBe(
      `/login?callbackUrl=${encodeURIComponent("/mocks/cmf123abc")}`,
    );
  });

  it("never lets a non-utm param or an unsafe path into the callback", () => {
    const cb = callbackOf(
      loginRedirectPath("//evil.example/steal", { ...EMAIL, token: "secret", email: "a@b.c" }),
    );
    expect(cb).toBe("/dashboard?utm_source=email&utm_medium=winback&utm_campaign=winback");
    expect(cb).not.toContain("secret");
    expect(cb).not.toContain("a@b.c");
  });

  it("an injection attempt inside a utm value cannot add a param", () => {
    const cb = callbackOf(loginRedirectPath("/dashboard", { utm_source: "email&callbackUrl=//evil" }));
    expect(cb).toBe("/dashboard");
  });
});
