import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Serve AI crawlers fully-rendered blocking HTML instead of a
  // streamed response. Streamed pages arrive as an empty shell plus
  // content inside `<div hidden id="S:N">` revealed by inline script —
  // readability-style parsers used by non-rendering crawlers (GPTBot,
  // ClaudeBot, PerplexityBot, Amazonbot, Meta AI) drop hidden nodes,
  // so to them our pages looked header-only. Bingbot — the one engine
  // that ranks us well and feeds ChatGPT search — was ALREADY on
  // Next's default blocking list; this extends the same treatment to
  // the rest (30k+ AI-crawler hits/week per BotVisit). Setting this
  // REPLACES Next's default regex, so the default list is inlined
  // first.
  // 26 Sep 2026: Googlebot too. It renders JS, but on a cold fetch the
  // streamed metadata can land after </head>: 1 of about 45 cold fetches
  // streamed <title> and the canonical link after </head>, where Google
  // may ignore them — so Googlebot now gets the same blocking HTML as
  // Bingbot. + Amzn-SearchBot / Amzn-User (Amazon's search crawler and
  // user fetcher, non-rendering). Google-CloudVertexBot is already
  // matched by Google-[\w-]+.
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Googlebot|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|Amzn-SearchBot|Amzn-User|Amazonbot|meta-external|FacebookBot|Bytespider|CCBot|DuckAssistBot|MistralAI|cohere|YouBot|Diffbot/i,
  experimental: {
    // Server actions enabled by default in Next 15
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google profile pics
    ],
  },
  // 3 Oct 2026: X-Robots-Tag headers. A header, not only a robots meta,
  // because a header is on every response — a 307 redirect and a streamed
  // 200 alike — where a page's <head> may never arrive. Checked by
  // tests/unit/robots-headers.test.ts.
  //   • /discussions and /discussions/*: no student has started a thread
  //     yet and every stored thread was written by Shishya; nothing there is
  //     indexable until the founder opens it (DISCUSSIONS_INDEXABLE in
  //     src/lib/discussion-visibility.ts — change both together).
  //   • private pages: a search engine obeys noindex only on a URL it may
  //     fetch, so these say noindex on every response.
  async headers() {
    // Order matters: when two entries match a path and set the same key, Next keeps the LAST.
    // The private list comes after the discussions list, so /discussions/new ends "noindex, nofollow".
    const discussions = [{ key: "X-Robots-Tag", value: "noindex, follow" }]; // while DISCUSSIONS_INDEXABLE is false
    const none = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }];
    const noindex = [{ key: "X-Robots-Tag", value: "noindex" }];
    return [
      { source: "/discussions", headers: discussions },
      { source: "/discussions/:path*", headers: discussions },
      ...["/dashboard/:path*", "/today/:path*", "/me/:path*", "/onboarding/:path*", "/logout", "/mentor/:path*",
          "/attempts/:path*", "/admin/:path*", "/i/:path*", "/discussions/new", "/exams/:code/attempts", "/api/:path*"]
        .map((source) => ({ source, headers: none })),
      ...["/login/:path*", "/chat", "/mocks/:path*"].map((source) => ({ source, headers: noindex })),
    ];
  },
};

export default nextConfig;
