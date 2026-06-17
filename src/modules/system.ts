import type { Env, ChatMessage } from "../types/index.js";

/**
 * System prompt that defines AI behavior
 */
export function getSystemPrompt(env: Env): ChatMessage[] {
  const prompt = env.SYSTEM_PROMPT;
  return prompt && prompt.trim() ? [{ role: "system", content: prompt }] : [];
}
