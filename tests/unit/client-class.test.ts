// Browser-or-bot verdict on a User-Agent — moved unchanged from the analytics
// route to src/lib/client-class.ts (24 Sep 2026) so /api/chat can keep
// crawlers off the guest tutor (~188 guest replies went to bots in September).
// Pure — no DB. Run: npx vitest run tests/unit/client-class.test.ts

import { describe, it, expect } from "vitest";
import { BOT_UA, classifyClient } from "@/lib/client-class";

const CHROME_ANDROID =
  "Mozilla/5.0 (Linux; Android 13; SM-A145F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Mobile Safari/537.36";
const SAFARI_IOS =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const CHROME_WINDOWS =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

describe("classifyClient", () => {
  it("reads ordinary phone and desktop browsers as browsers", () => {
    expect(classifyClient(CHROME_ANDROID)).toBe("browser");
    expect(classifyClient(SAFARI_IOS)).toBe("browser");
    expect(classifyClient(CHROME_WINDOWS)).toBe("browser");
  });

  it("reads crawlers and automation as bots", () => {
    expect(classifyClient("Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)")).toBe("bot");
    expect(classifyClient("Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)")).toBe("bot");
    expect(classifyClient("Mozilla/5.0 (compatible; ClaudeBot/1.0; +claudebot@anthropic.com)")).toBe("bot");
    expect(classifyClient(CHROME_WINDOWS.replace("Chrome/", "HeadlessChrome/"))).toBe("bot");
    expect(classifyClient("python-requests/2.32.3")).toBe("bot");
    expect(classifyClient("curl/8.7.1 (x86_64-pc-linux-gnu)")).toBe("bot");
    expect(classifyClient("facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)")).toBe("bot");
  });

  it("reads a missing, empty or stub user-agent as a bot", () => {
    expect(classifyClient(null)).toBe("bot");
    expect(classifyClient(undefined)).toBe("bot");
    expect(classifyClient("")).toBe("bot");
    expect(classifyClient("   Mozilla/5.0  ")).toBe("bot");
  });

  it("BOT_UA is stateless across calls (no global flag)", () => {
    expect(BOT_UA.global).toBe(false);
    expect(classifyClient("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe("bot");
    expect(classifyClient("Googlebot/2.1 (+http://www.google.com/bot.html)")).toBe("bot");
  });
});
