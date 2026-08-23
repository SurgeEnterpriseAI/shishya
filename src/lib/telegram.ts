// Telegram Bot API helper — just HTTPS POSTs, no SDK needed.
//
// Powers (a) the daily-digest CHANNEL (aspirants organise prep in
// Telegram; a Shishya channel that posts the day's current affairs, exam
// dates and a practice nudge meets them where they are and seeds
// forwards → joins → click-throughs) and (b) the interactive BOT
// (/today, /exam, /calendar, /livetest — see src/app/api/telegram/webhook).
//
// Setup (one-time, by the operator):
//   1. Create a bot via @BotFather → get the token
//   2. Create a public channel, add the bot as an admin
//   3. Set env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHANNEL_ID (e.g. @shishya_in)
// Until both are set, every send no-ops (returns false) so crons are safe
// to deploy before the channel exists. The webhook registers itself (see
// ensureTelegramWebhook) — no manual curl needed.

import { createHmac } from "node:crypto";

export const SITE = "https://shishya.in";

export function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHANNEL_ID);
}

export function telegramBotConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** Low-level Bot API call. Returns the parsed JSON (or null on failure). */
export async function tgApi<T = any>(method: string, body: Record<string, unknown>): Promise<T | null> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok || !json?.ok) {
      console.error(`[telegram] ${method} failed`, res.status, JSON.stringify(json ?? {}).slice(0, 200));
      return null;
    }
    return json.result as T;
  } catch (err) {
    console.error(`[telegram] ${method} error`, (err as Error)?.message);
    return null;
  }
}

export interface InlineButton {
  text: string;
  url?: string;
  callback_data?: string;
}

export async function sendTelegramMessage(opts: {
  text: string;
  /** Override the default channel (defaults to TELEGRAM_CHANNEL_ID). */
  chatId?: string | number;
  /** Telegram parse mode. HTML is easiest to keep valid. */
  parseMode?: "HTML" | "MarkdownV2";
  disablePreview?: boolean;
  /** Inline keyboard rows. */
  buttons?: InlineButton[][];
  replyToMessageId?: number;
}): Promise<boolean> {
  const chatId = opts.chatId ?? process.env.TELEGRAM_CHANNEL_ID;
  if (!process.env.TELEGRAM_BOT_TOKEN || !chatId) return false;
  const r = await tgApi("sendMessage", {
    chat_id: chatId,
    text: opts.text.slice(0, 4096),
    parse_mode: opts.parseMode ?? "HTML",
    disable_web_page_preview: opts.disablePreview ?? false,
    ...(opts.buttons ? { reply_markup: { inline_keyboard: opts.buttons } } : {}),
    ...(opts.replyToMessageId ? { reply_to_message_id: opts.replyToMessageId } : {}),
  });
  return !!r;
}

export async function editTelegramMessage(opts: {
  chatId: string | number;
  messageId: number;
  text: string;
  buttons?: InlineButton[][];
}): Promise<boolean> {
  const r = await tgApi("editMessageText", {
    chat_id: opts.chatId,
    message_id: opts.messageId,
    text: opts.text.slice(0, 4096),
    parse_mode: "HTML",
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: opts.buttons ?? [] },
  });
  return !!r;
}

export async function answerCallback(callbackQueryId: string, text?: string, alert = false): Promise<void> {
  await tgApi("answerCallbackQuery", { callback_query_id: callbackQueryId, ...(text ? { text: text.slice(0, 200), show_alert: alert } : {}) });
}

/** Escape a string for safe inclusion in HTML parse-mode text. */
export function tgEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Attribution for every link the bot/channel emits. */
export function tgUrl(path: string, medium: "bot" | "channel" = "bot"): string {
  const u = new URL(path.startsWith("http") ? path : `${SITE}${path}`);
  u.searchParams.set("utm_source", "telegram");
  u.searchParams.set("utm_medium", medium);
  return u.toString();
}

// ── Webhook registration ────────────────────────────────────────────────
// Secret derived from NEXTAUTH_SECRET so no extra env var is needed; the
// webhook route rejects updates that don't carry it.
export function telegramWebhookSecret(): string {
  return createHmac("sha256", process.env.NEXTAUTH_SECRET ?? "shishya-telegram").update("tg-webhook-v1").digest("hex").slice(0, 40);
}

export const TELEGRAM_WEBHOOK_PATH = "/api/telegram/webhook";

/** Idempotent: sets the webhook if Telegram has a different/no URL. Safe to
 *  call from a daily cron. Returns what Telegram reports after the call. */
export async function ensureTelegramWebhook(): Promise<{ ok: boolean; url?: string; changed: boolean }> {
  if (!process.env.TELEGRAM_BOT_TOKEN) return { ok: false, changed: false };
  const want = `${SITE}${TELEGRAM_WEBHOOK_PATH}`;
  const info = await tgApi<{ url?: string }>("getWebhookInfo", {});
  if (info?.url === want) return { ok: true, url: info.url, changed: false };
  const set = await tgApi("setWebhook", {
    url: want,
    secret_token: telegramWebhookSecret(),
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: false,
  });
  return { ok: !!set, url: want, changed: !!set };
}
