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
  // first. Googlebot renders JS and is deliberately left streaming.
  htmlLimitedBots:
    /[\w-]+-Google|Google-[\w-]+|Chrome-Lighthouse|Slurp|DuckDuckBot|baiduspider|yandex|sogou|bitlybot|tumblr|vkShare|quora link preview|redditbot|ia_archiver|Bingbot|BingPreview|applebot|facebookexternalhit|facebookcatalog|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|SkypeUriPreview|Yeti|googleweblight|GPTBot|OAI-SearchBot|ChatGPT-User|ClaudeBot|Claude-User|Claude-SearchBot|anthropic-ai|PerplexityBot|Perplexity-User|Amazonbot|meta-external|FacebookBot|Bytespider|CCBot|DuckAssistBot|MistralAI|cohere|YouBot|Diffbot/i,
  experimental: {
    // Server actions enabled by default in Next 15
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" }, // Google profile pics
    ],
  },
};

export default nextConfig;
