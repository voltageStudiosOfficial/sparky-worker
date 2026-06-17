import type { Env, TelegramMessage, ChatMessage } from "../types/index.js";

/**
 * Send a message to Telegram chat
 */
export async function sendMessage(
  env: Env,
  chatId: number,
  text: string,
  replyToId?: number,
): Promise<void> {
  const body: Record<string, unknown> = { chat_id: chatId, text };
  if (replyToId) body.reply_to_message_id = replyToId;

  await fetch(
    `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

/**
 * Format Telegram message into chat message format
 */
export function formatUserMessage(msg: TelegramMessage): ChatMessage {
  const username =
    msg.from?.username || msg.from?.first_name || "user";

  return {
    role: "user",
    content: `@${username}: ${msg.text || ""}`,
  };
}

/**
 * Check bot status
 */
export async function checkBotStatus(env: Env): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`,
    );
    const data = await response.json() as { ok?: boolean };
    return data?.ok && !!env.OPENROUTER_API_KEY;
  } catch {
    return false;
  }
}
