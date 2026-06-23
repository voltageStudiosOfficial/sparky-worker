import type { Env, TelegramMessage, TelegramPhotoSize, TelegramVoice, TelegramUpdate, DiscordAttachment } from "../types/index.js";
import { getModel } from "../modules/model.js";
import { callAI } from "./ai.js";

const TELEGRAM_FILE_API = "https://api.telegram.org/file/bot";

/**
 * Get the bot token from environment
 */
function getBotToken(env: Env): string {
  return env.TELEGRAM_BOT_TOKEN;
}

/**
 * Get file URL for a Telegram file_id
 */
export function getTelegramFileUrl(env: Env, fileId: string): string {
  return `${TELEGRAM_FILE_API}${env.TELEGRAM_BOT_TOKEN}/${fileId}`;
}

/**
 * Get the file path for a Telegram file_id
 */
export async function getTelegramFilePath(env: Env, fileId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getFile?file_id=${fileId}`,
    );
    const data = (await response.json()) as { result?: { file_path?: string } };
    return data.result?.file_path || null;
  } catch (error) {
    console.error("[multimedia] Failed to get file path:", error);
    return null;
  }
}

/**
 * Download a file from Telegram
 */
export async function downloadTelegramFile(
  env: Env,
  fileId: string,
): Promise<ArrayBuffer | null> {
  try {
    const filePath = await getTelegramFilePath(env, fileId);
    if (!filePath) {
      console.warn("[multimedia] Could not get file path for:", fileId);
      return null;
    }

    const url = `${TELEGRAM_FILE_API}${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      console.warn("[multimedia] Failed to download file:", filePath, response.status);
      return null;
    }

    return await response.arrayBuffer();
  } catch (error) {
    console.error("[multimedia] Failed to download file:", error);
    return null;
  }
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Get the best quality photo from a Telegram photo array
 */
export function getBestPhoto(photos: TelegramPhotoSize[]): TelegramPhotoSize | null {
  if (!photos || photos.length === 0) return null;
  
  // Find the photo with the largest file_size
  return photos.reduce((best, current) => {
    return (current.file_size || 0) > (best.file_size || 0) ? current : best;
  });
}

/**
 * Check if the bot is mentioned in a Telegram message
 */
export function isBotMentioned(msg: TelegramMessage, botUsername: string): boolean {
  if (!msg.text && !msg.caption) return false;
  
  const text = msg.text || msg.caption || "";
  
  // Check for @botname mention
  if (text.includes(`@${botUsername}`)) {
    return true;
  }
  
  // Check entities for mentions
  if (msg.entities) {
    for (const entity of msg.entities) {
      if (entity.type === "mention" || entity.type === "text_mention") {
        // If it's a mention of the bot
        if (entity.user?.username === botUsername) {
          return true;
        }
      }
    }
  }
  
  // Check caption entities too
  if (msg.caption_entities) {
    for (const entity of msg.caption_entities) {
      if (entity.type === "mention" || entity.type === "text_mention") {
        if (entity.user?.username === botUsername) {
          return true;
        }
      }
    }
  }
  
  return false;
}

/**
 * Extract mentions from a Telegram message
 */
export function extractMentions(msg: TelegramMessage): { users: string[]; text: string } {
  const mentions: string[] = [];
  let displayText = msg.text || msg.caption || "";
  
  if (msg.entities) {
    for (const entity of msg.entities) {
      if (entity.type === "mention" || entity.type === "text_mention") {
        if (entity.user?.username) {
          mentions.push(entity.user.username);
        }
      }
    }
  }
  
  return { users: mentions, text: displayText };
}

/**
 * Check if a Discord message mentions the bot
 */
export function isDiscordBotMentioned(
  message: any,
  botUserId: string,
  botUsername?: string,
): boolean {
  if (!message) return false;
  
  // Check mentions array
  if (message.mentions) {
    for (const mention of message.mentions) {
      if (mention.id === botUserId || mention.username === botUsername) {
        return true;
      }
    }
  }
  
  // Check if the bot username is in the content
  if (botUsername && message.content && message.content.includes(`@${botUsername}`)) {
    return true;
  }
  
  return false;
}

/**
 * Get image URLs from Telegram message
 */
export function getImageUrlsFromTelegram(msg: TelegramMessage, env: Env): string[] {
  const urls: string[] = [];
  
  if (msg.photo && msg.photo.length > 0) {
    const best = getBestPhoto(msg.photo);
    if (best) {
      urls.push(getTelegramFileUrl(env, best.file_id));
    }
  }
  
  if (msg.document && isImageMimeType(msg.document.mime_type)) {
    urls.push(getTelegramFileUrl(env, msg.document.file_id));
  }
  
  return urls;
}

/**
 * Get voice/audio from Telegram message
 */
export function getVoiceFromTelegram(msg: TelegramMessage): TelegramVoice | null {
  return msg.voice || msg.audio || null;
}

/**
 * Check if MIME type is an image
 */
export function isImageMimeType(mimeType: string | undefined): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("image/");
}

/**
 * Check if MIME type is audio
 */
export function isAudioMimeType(mimeType: string | undefined): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith("audio/");
}

/**
 * Check if the message contains any mention of the bot
 */
export function shouldRespondToMessage(
  msg: TelegramMessage,
  botUsername: string,
  env: Env,
): boolean {
  // Always respond to direct messages
  if (msg.chat.type === "private") {
    return true;
  }
  
  // Check if bot is mentioned
  if (isBotMentioned(msg, botUsername)) {
    return true;
  }
  
  // Check if message is a reply to the bot
  if (msg.reply_to_message) {
    // If the bot sent the message being replied to
    if (msg.reply_to_message.from?.username === botUsername) {
      return true;
    }
  }
  
  // For group chats, only respond if mentioned or in reply
  return false;
}

/**
 * Get image URLs from Discord attachments
 */
export function getImageUrlsFromDiscord(attachments: DiscordAttachment[]): string[] {
  const urls: string[] = [];
  
  if (!attachments) return urls;
  
  for (const attachment of attachments) {
    if (attachment.content_type && attachment.content_type.startsWith("image/")) {
      urls.push(attachment.url);
    } else if (attachment.filename) {
      // Check filename extension
      const ext = attachment.filename.toLowerCase();
      if (ext.endsWith(".png") || ext.endsWith(".jpg") || ext.endsWith(".jpeg") || ext.endsWith(".gif") || ext.endsWith(".webp")) {
        urls.push(attachment.url);
      }
    }
  }
  
  return urls;
}
