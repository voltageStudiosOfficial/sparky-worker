import type { Env, TelegramUpdate } from "../types/index.js";
import { getModel } from "../modules/model.js";
import { getSystemPrompt } from "../modules/system.js";
import { typingLoop } from "../modules/typing.js";
import {
  sendMessage,
  formatUserMessage,
  checkBotStatus,
} from "../services/telegram.js";
import { loadHistory, saveHistory, clearHistory } from "../services/memory.js";
import { callAI } from "../services/ai.js";

/**
 * Handle /start command
 */
async function handleStart(
  env: Env,
  chatId: number,
  msgId: number,
  username: string,
): Promise<void> {
  await clearHistory(env, chatId);

  const signal = { done: false };
  const typingTask = typingLoop(env, chatId, signal);

  const helloMsg = {
    role: "user" as const,
    content: `@${username}: hello`,
  };

  const data = await callAI(env, [...getSystemPrompt(env), helloMsg], getModel(env) || "");

  signal.done = true;
  await typingTask;

  const reply = data?.choices?.[0]?.message?.content || "AI failed";

  await sendMessage(env, chatId, reply, msgId);
}

/**
 * Handle /reset command
 */
async function handleReset(
  env: Env,
  chatId: number,
  msgId: number,
): Promise<void> {
  await clearHistory(env, chatId);
  await sendMessage(env, chatId, "hello", msgId);
}

/**
 * Handle normal message
 */
async function handleMessage(
  env: Env,
  chatId: number,
  msgId: number,
  update: TelegramUpdate,
): Promise<void> {
  const mem = await loadHistory(env, chatId);
  const history = mem.h;

  history.push(formatUserMessage(update.message));

  const messages = [...getSystemPrompt(env), ...history];

  const signal = { done: false };
  const typingTask = typingLoop(env, chatId, signal);

  const data = await callAI(env, messages, getModel(env) || "");

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

/**
 * Process Telegram webhook update
 */
export async function processTelegramUpdate(
  env: Env,
  update: TelegramUpdate,
): Promise<Response> {
  const msg = update.message;

  if (!msg?.text) return new Response("ok");

  const chatId = msg.chat.id;
  const text = msg.text;
  const msgId = msg.message_id;
  const username = msg.from?.username || msg.from?.first_name || "user";

  const model = getModel(env);

  if (!model) {
    await sendMessage(
      env,
      chatId,
      "Seems like Tanner forgot to choose the model.",
      msgId,
    );
    return new Response("no_model");
  }

  // /start command
  if (text === "/start") {
    await handleStart(env, chatId, msgId, username);
    return new Response("start");
  }

  // /reset command
  if (text === "/reset") {
    await handleReset(env, chatId, msgId);
    return new Response("reset");
  }

  // Normal message
  await handleMessage(env, chatId, msgId, update);
  return new Response("ok");
}

/**
 * Check bot status endpoint
 */
export async function checkStatus(env: Env): Promise<Response> {
  const ok = await checkBotStatus(env);
  return new Response(ok ? "OK" : "FAIL", {
    status: ok ? 200 : 500,
    headers: { "Content-Type": "text/plain" },
  });
}
