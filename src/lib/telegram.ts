// Telegram Bot API helper — just an HTTPS POST, no SDK needed.
//
// Powers the daily-digest channel: aspirants organise prep in Telegram,
// so a Shishya channel that posts the day's current affairs + a practice
// nudge (each linking back) meets them where they already are and seeds
// forwards → joins → click-throughs.
//
// Setup (one-time, by the operator):
//   1. Create a bot via @BotFather → get the token
//   2. Create a public channel, add the bot as an admin
//   3. Set env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID (e.g. @shishya)
// Until both are set, sendTelegramMessage no-ops (returns false) so the
// cron is safe to deploy before the channel exists.

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}

export async function sendTelegramMessage(opts: {
  text: string;
  /** Override the default channel (defaults to TELEGRAM_CHANNEL_ID). */
  chatId?: string;
  /** Telegram parse mode. HTML is easiest to keep valid. */
  parseMode?: "HTML" | "MarkdownV2";
  disablePreview?: boolean;
}): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = opts.chatId ?? process.env.TELEGRAM_CHANNEL_ID;
  if (!token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: opts.text,
        parse_mode: opts.parseMode ?? "HTML",
        disable_web_page_preview: opts.disablePreview ?? false,
      }),
    });
    if (!res.ok) {
      console.error("[telegram] sendMessage failed", res.status, (await res.text()).slice(0, 200));
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] sendMessage error", (err as Error)?.message);
    return false;
  }
}

/** Escape a string for safe inclusion in HTML parse-mode text. */
export function tgEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
