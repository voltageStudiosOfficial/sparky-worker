import type { Env, TypingSignal } from "../types/index.js";

/**
 * Send typing indicator loop to Telegram chat
 */
export async function typingLoop(
  env: Env,
  chatId: number,
  signal: TypingSignal,
): Promise<void> {
  try {
    while (!signal.done) {
      await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendChatAction`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            action: "typing",
          }),
        },
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }
  } catch {
    // Silent fail for typing indicator
  }
}
