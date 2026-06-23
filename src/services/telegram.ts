import type { Env, TelegramMessage, ChatMessage } from "../types/index.js";

// send that message fr fr
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

// telegram message but make it pretty
export function formatUserMessage(msg: TelegramMessage): ChatMessage {
  const username = msg.from?.username || msg.from?.first_name || "user";

  return {
    role: "user",
    content: `@${username}: ${msg.text || ""}`,
  };
}

// Format a Telegram message with multimedia support
export function formatUserMessageWithMultimedia(
  msg: TelegramMessage,
  botUsername: string,
): ChatMessage {
  const username = msg.from?.username || msg.from?.first_name || "user";
  const images: string[] = [];
  let content = msg.text || msg.caption || "";
  
  // Extract mentions
  const mentions = extractMentions(msg);
  
  // Add mention info to content if there are mentions
  if (mentions.users.length > 0) {
    content = `[Mentions: ${mentions.users.join(", ")}] ${content}`;
  }
  
  // Handle voice messages
  if (msg.voice) {
    content = `[Voice message: ${msg.voice.duration}s] ${content}`;
    // Note: Voice transcription would need to be added separately
  }
  
  // Handle audio messages
  if (msg.audio) {
    content = `[Audio message: ${msg.audio.duration}s] ${content}`;
  }
  
  // Handle documents
  if (msg.document) {
    content = `[Document: ${msg.document.file_name || "file"}] ${content}`;
  }
  
  // Handle photos - for vision models, include image URLs
  if (msg.photo && msg.photo.length > 0) {
    const best = getBestPhoto(msg.photo);
    if (best) {
      // We'll add the image URL to the images array
      // The actual URL will be constructed when processing
      content = `[Photo] ${content}`;
    }
  }
  
  return {
    role: "user",
    content: `@${username}: ${content.trim()}`,
    images: [], // Will be populated with URLs when processing
  };
}

// is the bot alive? let's find out
export async function checkBotStatus(env: Env): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`,
    );
    const data = (await response.json()) as { ok?: boolean };
    return data?.ok && !!env.OPENROUTER_API_KEY;
  } catch {
    return false;
  }
}
