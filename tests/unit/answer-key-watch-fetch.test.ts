// The watch's fetch (30 Sep 2026), fetchForWatch in src/lib/answer-key-watch-run.ts,
// after the dry pilot read UPSC as HTTP 403: upsc.gov.in is read on www (the
// bare host redirects every path to the www home page); an HTTP 403 is retried
// under our name without the URL, then — on upsc.gov.in only — curl's default
// agent (as scripts/import-official-papers.ts falls back to curl); one
// deadline for the whole call; a firewall "Request Rejected" page (HTTP 200)
// reads as 403 — gate 2 never takes it for a file; cookies a host sets go back
// to it (RRB's firewall), never to a whole registry suffix. Global fetch
// stubbed: no network.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  CURL_UA,
  CookieJar,
  WATCH_AGENTS,
  WATCH_UA,
  WATCH_UA_PLAIN,
  fetchForWatch,
  officialFetchUrl,
  watchAgentsFor,
  wwwRetryUrl,
} from "@/lib/answer-key-watch-run";

interface Seen {
  url: string;
  agent: string;
  cookie: string | null;
}

function fakeResponse(o: { status?: number; url: string; body?: string; contentType?: string; setCookie?: string[] }) {
  const headers = new Headers({ "content-type": o.contentType ?? "text/html; charset=utf-8" });
  for (const c of o.setCookie ?? []) headers.append("set-cookie", c);
  return { status: o.status ?? 200, url: o.url, headers, body: new Response(o.body ?? "").body } as unknown as Response;
}

function stubFetch(answer: (s: Seen) => Response) {
  const seen: Seen[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    const h = (init.headers ?? {}) as Record<string, string>;
    const s = { url, agent: h["user-agent"], cookie: h.cookie ?? null };
    seen.push(s);
    return answer(s);
  });
  return seen;
}

/** A fake clock each request moves on by `ms`, and the timeout each attempt
 *  was given (AbortSignal.timeout). */
function fakeTime(stepsMs: number[]) {
  let now = 1_000_000;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  const timeouts: number[] = [];
  const real = AbortSignal.timeout.bind(AbortSignal);
  vi.spyOn(AbortSignal, "timeout").mockImplementation((ms: number) => {
    timeouts.push(ms);
    return real(60_000);
  });
  return { timeouts, tick: () => (now += stepsMs.shift() ?? 0) };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("where to ask", () => {
  it("upsc.gov.in on www; other hosts untouched", () => {
    expect(officialFetchUrl("https://upsc.gov.in/examinations/answer-key")).toBe("https://www.upsc.gov.in/examinations/answer-key");
    expect(officialFetchUrl("https://www.upsc.gov.in/whats-new")).toBe("https://www.upsc.gov.in/whats-new");
    expect(officialFetchUrl("https://ssc.gov.in/home/answer-key")).toBe("https://ssc.gov.in/home/answer-key");
  });

  it("a bare host that landed on its www home page is read again on www with the path", () => {
    expect(wwwRetryUrl("https://board.gov.in/results/2026", "https://www.board.gov.in/")).toBe("https://www.board.gov.in/results/2026");
    expect(wwwRetryUrl("https://board.gov.in/results/2026", "https://www.board.gov.in/results/2026")).toBeNull(); // landed where asked
    expect(wwwRetryUrl("https://board.gov.in/", "https://www.board.gov.in/")).toBeNull();
    expect(wwwRetryUrl("https://board.gov.in/results", "https://other.gov.in/")).toBeNull();
  });

  it("a bare-host redirect to the www home page is followed by the page itself", async () => {
    const seen = stubFetch((s) =>
      s.url === "https://board.gov.in/results/2026"
        ? fakeResponse({ url: "https://www.board.gov.in/", body: "<html>home</html>" })
        : fakeResponse({ url: s.url, body: "<html>results</html>" }),
    );
    const p = await fetchForWatch("https://board.gov.in/results/2026", { maxBytes: 10_000 });
    expect(seen.map((s) => s.url)).toEqual(["https://board.gov.in/results/2026", "https://www.board.gov.in/results/2026"]);
    expect(p).toMatchObject({ status: 200, body: "<html>results</html>", finalUrl: "https://www.board.gov.in/results/2026" });
  });
});

describe("who asks", () => {
  it("our own name first; after a 403 our name without the URL; curl's default agent only on upsc.gov.in", async () => {
    expect(WATCH_AGENTS).toEqual([WATCH_UA, WATCH_UA_PLAIN]);
    expect(watchAgentsFor("https://www.upsc.gov.in/x")).toEqual([WATCH_UA, WATCH_UA_PLAIN, CURL_UA]);
    expect(watchAgentsFor("https://ssc.gov.in/x")).toEqual([WATCH_UA, WATCH_UA_PLAIN]);
    expect(WATCH_UA_PLAIN).not.toMatch(/https?:\/\//);
    const seen = stubFetch((s) => (s.agent === WATCH_UA ? fakeResponse({ status: 403, url: s.url, body: "Forbidden" }) : fakeResponse({ url: s.url, body: "<html>ok</html>" })));
    const p = await fetchForWatch("https://upsc.gov.in/examinations/answer-key", { maxBytes: 10_000 });
    expect(seen).toEqual([
      { url: "https://www.upsc.gov.in/examinations/answer-key", agent: WATCH_UA, cookie: null },
      { url: "https://www.upsc.gov.in/examinations/answer-key", agent: WATCH_UA_PLAIN, cookie: null },
    ]);
    expect(p).toMatchObject({ status: 200, agent: WATCH_UA_PLAIN, body: "<html>ok</html>" });
  });

  it("a server that refuses every agent stays a 403 (three asks on UPSC, two elsewhere — never curl's agent)", async () => {
    const seen = stubFetch((s) => fakeResponse({ status: 403, url: s.url }));
    const p = await fetchForWatch("https://www.upsc.gov.in/x", { maxBytes: 1000 });
    expect(seen.map((s) => s.agent)).toEqual([WATCH_UA, WATCH_UA_PLAIN, CURL_UA]);
    expect(p.status).toBe(403);
    seen.length = 0;
    expect((await fetchForWatch("https://board.gov.in/keys", { maxBytes: 1000 })).status).toBe(403);
    expect(seen.map((s) => s.agent)).toEqual([WATCH_UA, WATCH_UA_PLAIN]);
  });

  it("any other status is final", async () => {
    const seen = stubFetch((s) => fakeResponse({ status: 500, url: s.url }));
    expect((await fetchForWatch("https://ibpsreg.ibps.in/x/login.php", { maxBytes: 1000 })).status).toBe(500);
    expect(seen).toHaveLength(1);
  });
});

describe("one deadline for the whole call (review, 30 Sep 2026)", () => {
  it("the rungs share the call's timeout: each gets what is left", async () => {
    const t = fakeTime([5_000, 5_000, 5_000]);
    const seen = stubFetch((s) => {
      t.tick();
      return fakeResponse({ status: 403, url: s.url });
    });
    const p = await fetchForWatch("https://www.upsc.gov.in/x", { maxBytes: 1000, timeoutMs: 12_000 });
    expect(t.timeouts).toEqual([12_000, 7_000, 2_000]);
    expect(seen).toHaveLength(3);
    expect(p.status).toBe(403);
  });

  it("no rung starts with under a second left; a later rung that runs out keeps the 403", async () => {
    const t = fakeTime([11_500]);
    const seen = stubFetch((s) => {
      t.tick();
      return fakeResponse({ status: 403, url: s.url });
    });
    expect((await fetchForWatch("https://www.upsc.gov.in/x", { maxBytes: 1000, timeoutMs: 12_000 })).status).toBe(403);
    expect(seen).toHaveLength(1);

    vi.restoreAllMocks();
    const t2 = fakeTime([1_000]);
    let n = 0;
    stubFetch((s) => {
      t2.tick();
      if (n++ === 0) return fakeResponse({ status: 403, url: s.url });
      throw new DOMException("The operation was aborted due to timeout", "TimeoutError");
    });
    const p = await fetchForWatch("https://www.upsc.gov.in/x", { maxBytes: 1000, timeoutMs: 12_000 });
    expect(p).toMatchObject({ status: 403, agent: WATCH_UA });
  });

  it("the www retry needs time left too: the www home page is never returned for the page", async () => {
    const t = fakeTime([11_800]);
    const seen = stubFetch((s) => {
      t.tick();
      return fakeResponse({ url: "https://www.board.gov.in/", body: "<html>home</html>" });
    });
    const p = await fetchForWatch("https://board.gov.in/results/2026", { maxBytes: 10_000, timeoutMs: 12_000 });
    expect(seen).toHaveLength(1);
    expect(p).toMatchObject({ status: 0, body: "" });
    expect(p.error).toMatch(/^no time left to read https:\/\/www\.board\.gov\.in\/results\/2026$/);
  });
});

describe("firewall pages and cookies", () => {
  const rejected =
    "<html><head><title>Request Rejected</title></head><body>The requested URL was rejected. Please consult with your administrator.<br><br>Your support ID is: 1</body></html>";

  it("an HTTP 200 'Request Rejected' page reads as 403, not as the page or file", async () => {
    const seen = stubFetch((s) => fakeResponse({ url: s.url, body: rejected }));
    const p = await fetchForWatch("https://rrb.indianrailways.gov.in/-/image/x.pdf/examsDocuments", { maxBytes: 65_536 });
    expect(p).toMatchObject({ status: 403, body: "", error: "firewall 'Request Rejected' page (HTTP 200)" });
    expect(seen).toHaveLength(1); // a firewall is not an agent problem: no ladder
  });

  it("cookies the region page sets are sent with the next request to that host only", async () => {
    const jar = new CookieJar();
    const seen = stubFetch((s) =>
      s.url.endsWith("/chandigarh")
        ? fakeResponse({
            url: s.url,
            body: "<html>RRB</html>",
            setCookie: ["JSESSIONID=abc; Path=/; HttpOnly", "TS019286b9=01ee; Path=/; Domain=.rrb.indianrailways.gov.in", "evil=1; Domain=.example.com"],
          })
        : fakeResponse({ url: s.url, body: "<html>table</html>" }),
    );
    await fetchForWatch("https://rrb.indianrailways.gov.in/chandigarh", { maxBytes: 10_000, jar });
    await fetchForWatch("https://rrb.indianrailways.gov.in/getdata?loc=chandigarh&category=Exam%20Results", { maxBytes: 10_000, jar });
    await fetchForWatch("https://www.upsc.gov.in/whats-new", { maxBytes: 10_000, jar });
    expect(seen.map((s) => s.cookie)).toEqual([null, "JSESSIONID=abc; TS019286b9=01ee", null]); // another site's cookie: rejected
  });

  it("the jar never scopes a cookie to a registry suffix (gov.in, .in, nic.in …)", () => {
    const jar = new CookieJar();
    jar.store("https://ssc.gov.in/x", ["a=1; Domain=gov.in", "b=2; Domain=.in", "c=3; Domain=ssc.gov.in", "d=4; Domain=nic.in"]);
    expect(jar.header("https://upsc.gov.in/")).toBeNull();
    expect(jar.header("https://www.ssc.gov.in/")).toBe("c=3");
    expect(jar.header("https://ssc.gov.in/")).toBe("c=3");
  });

  it("the jar: Domain covers subdomains, host-only does not", () => {
    const jar = new CookieJar();
    jar.store("https://rrb.indianrailways.gov.in/chandigarh", ["a=1; Domain=indianrailways.gov.in", "b=2"]);
    expect(jar.header("https://www.indianrailways.gov.in/")).toBe("a=1");
    expect(jar.header("https://rrb.indianrailways.gov.in/x")).toBe("a=1; b=2");
    expect(jar.header("https://x.rrb.indianrailways.gov.in/")).toBe("a=1");
  });
});
