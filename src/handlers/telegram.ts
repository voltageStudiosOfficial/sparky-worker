import type { Env, TelegramUpdate, TelegramMessage, ChatMessage } from "../types/index.js";
import { getModel } from "../modules/model.js";
import { getSystemPrompt } from "../modules/system.js";
import { typingLoop } from "../modules/typing.js";
import {
  sendMessage,
  formatUserMessage,
  checkBotStatus,
} from "../services/telegram.js";
import { loadHistory, saveHistory, clearHistory } from "../services/memory.js";
import { callAI, callVisionAI, isVisionModel, supportsVision } from "../services/ai.js";
import {
  isBotMentioned,
  extractMentions,
  getImageUrlsFromTelegram,
  getVoiceFromTelegram,
  shouldRespondToMessage,
  arrayBufferToBase64,
  downloadTelegramFile,
  getBestPhoto,
  getTelegramFilePath,
} from "../services/multimedia.js";
import { transcribeTelegramVoice } from "../services/transcription.js";

// /start command vibes
async function handleStart(
  env: Env,
  chatId: number,
  msgId: number,
  username: string,
  botUsername: string,
): Promise<void> {
  await clearHistory(env, chatId);

  const signal = { done: false };
  const typingTask = typingLoop(env, chatId, signal);

  const helloMsg: ChatMessage = {
    role: "user",
    content: `@${username}: hello`,
  };

  const data = await callAI(
    env,
    [...getSystemPrompt(env), helloMsg],
    getModel(env),
  );

  signal.done = true;
  await typingTask;

  const reply = data?.choices?.[0]?.message?.content || "AI failed";

  await sendMessage(env, chatId, reply, msgId);
}

// reset the convo (clean slate energy)
async function handleReset(
  env: Env,
  chatId: number,
  msgId: number,
): Promise<void> {
  await clearHistory(env, chatId);
  await sendMessage(env, chatId, "Chat history cleared. Send a message to start fresh!", msgId);
}

// handle ur messages like a boss
async function handleMessage(
  env: Env,
  chatId: number,
  msgId: number,
  update: TelegramUpdate,
  botUsername: string,
): Promise<void> {
  const msg = update.message;
  if (!msg) return;

  const mem = await loadHistory(env, chatId);
  const history = mem.h;

  // Format the user message with multimedia support
  let userMsg: ChatMessage = {
    role: "user",
    content: `@${msg.from?.username || msg.from?.first_name || "user"}: ${msg.text || msg.caption || ""}`,
    images: [],
  };

  // Check if this is a voice message
  if (msg.voice) {
    // Try to transcribe the voice message
    let transcription = null;
    if (env.OPENROUTER_API_KEY) {
      transcription = await transcribeTelegramVoice(env, msg.voice.file_id, msg.voice.duration);
    }
    
    if (transcription) {
      userMsg.content = `@${msg.from?.username || msg.from?.first_name || "user"}: [Voice: ${msg.voice.duration}s] ${transcription}`;
    } else {
      userMsg.content = `@${msg.from?.username || msg.from?.first_name || "user"}: [Voice message: ${msg.voice.duration}s - transcription unavailable]`;
    }
    
    userMsg.content += msg.caption ? `\nCaption: ${msg.caption}` : "";
  }

  // Check for images
  if (msg.photo && msg.photo.length > 0) {
    // Get the best quality photo
    const bestPhoto = getBestPhoto(msg.photo);
    if (bestPhoto) {
      // Try to get the file URL
      const filePath = await getTelegramFilePath(env, bestPhoto.file_id);
      if (filePath) {
        const imageUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
        userMsg.images?.push(imageUrl);
      }
      
      // Add photo description to content
      userMsg.content = `@${msg.from?.username || msg.from?.first_name || "user"}: [Photo]` + (msg.caption ? ` ${msg.caption}` : "");
    }
  }

  // Check for documents that might be images
  if (msg.document) {
    // Try to get the file URL
    const filePath = await getTelegramFilePath(env, msg.document.file_id);
    if (filePath) {
      const fileUrl = `https://api.telegram.org/file/bot${env.TELEGRAM_BOT_TOKEN}/${filePath}`;
      
      // Check if it's an image
      if (msg.document.mime_type && msg.document.mime_type.startsWith("image/")) {
        userMsg.images?.push(fileUrl);
        userMsg.content = `@${msg.from?.username || msg.from?.first_name || "user"}: [Image: ${msg.document.file_name || "file"}]` + (msg.caption ? ` ${msg.caption}` : "");
      } else {
        // For other document types
        userMsg.content = `@${msg.from?.username || msg.from?.first_name || "user"}: [Document: ${msg.document.file_name || "file"}]` + (msg.caption ? ` ${msg.caption}` : "");
      }
    }
  }

  // Check for audio messages
  if (msg.audio && !msg.voice) {
    userMsg.content = `@${msg.from?.username || msg.from?.first_name || "user"}: [Audio message: ${msg.audio.duration}s]` + (msg.caption ? ` ${msg.caption}` : "");
  }

  // Add to history
  history.push(userMsg);

  const messages = [...getSystemPrompt(env), ...history];

  const signal = { done: false };
  const typingTask = typingLoop(env, chatId, signal);

  // Check if we have images and the model supports vision
  const model = getModel(env);
  const hasImages = userMsg.images && userMsg.images.length > 0;
  
  let data: AIResponse;
  if (hasImages && isVisionModel(model)) {
    // Use vision model for images
    data = await callVisionAI(env, messages, model);
  } else {
    // Use regular model
    data = await callAI(env, messages, model);
  }

  signal.done = true;
  await typingTask;

  const reply = data?.choices?.[0]?.message?.content || "AI failed";

  history.push({
    role: "assistant",
    content: reply,
  });

  await saveHistory(env, chatId, history);
  await sendMessage(env, chatId, reply, msgId);
}

// Get bot info from Telegram API
export async function getBotInfo(env: Env): Promise<{ username: string; id: number } | null> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/getMe`,
    );
    const data = (await response.json()) as {
      ok?: boolean;
      result?: { username: string; id: number };
    };
    if (data.ok && data.result) {
      return data.result;
    }
    return null;
  } catch {
    return null;
  }
}

// main webhook processor energy
export async function processTelegramUpdate(
  env: Env,
  update: TelegramUpdate,
): Promise<Response> {
  const msg = update.message || update.edited_message;

  if (!msg) return new Response("ok");

  const chatId = msg.chat.id;
  const msgId = msg.message_id;
  
  // Get bot info to check for mentions
  const botInfo = await getBotInfo(env);
  const botUsername = botInfo?.username || "";

  // Check if we should respond to this message
  // In private chats, always respond. In groups, only respond if mentioned or in reply
  if (msg.chat.type !== "private") {
    const shouldRespond = isBotMentioned(msg, botUsername) || 
      (msg.reply_to_message && msg.reply_to_message.from?.username === botUsername);
    
    if (!shouldRespond) {
      // Not mentioned and not in a private chat - ignore
      return new Response("ok");
    }
  }

  // Handle edited messages - just acknowledge
  if (update.edited_message) {
    // For now, just treat it as a normal message
    // Could add special handling for edits later
  }

  const text = msg.text || msg.caption || "";
  const username = msg.from?.username || msg.from?.first_name || "user";

  const model = getModel(env);

  // /start szn
  if (text.trim() === "/start") {
    await handleStart(env, chatId, msgId, username, botUsername);
    return new Response("start");
  }

  // /reset vibes
  if (text.trim() === "/reset") {
    await handleReset(env, chatId, msgId);
    return new Response("reset");
  }

  // /help command
  if (text.trim() === "/help") {
    const helpText = `🤖 Sparky Bot Help\n\n` +
      `• /start - Start a new chat\n` +
      `• /reset - Clear chat history\n` +
      `• /help - Show this help\n\n` +
      `Send photos and I'll describe them (if using a vision model).\n` +
      `Mention me in groups with @${botUsername} or reply to my messages.`;
    await sendMessage(env, chatId, helpText, msgId);
    return new Response("help");
  }

  // Check if there's any content (text, photo, voice, document, etc.)
  const hasContent = !!(
    msg.text ||
    msg.caption ||
    msg.photo ||
    msg.voice ||
    msg.audio ||
    msg.document ||
    msg.video
  );

  if (!hasContent) return new Response("ok");

  // just a normal message, let's go
  await handleMessage(env, chatId, msgId, update, botUsername);
  return new Response("ok");
}

// is sparky feelin ok tho?
export async function checkStatus(env: Env): Promise<Response> {
  const ok = await checkBotStatus(env);
  return new Response(ok ? "OK" : "FAIL", {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "text/plain" },
  });
}
