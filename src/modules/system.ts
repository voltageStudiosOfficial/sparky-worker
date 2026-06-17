import type { Env, ChatMessage } from "../types/index.js";

// the vibes that make sparky be sparky
export function getSystemPrompt(env: Env): ChatMessage[] {
  const prompt = env.SYSTEM_PROMPT;
  return prompt && prompt.trim() ? [{ role: "system", content: prompt }] : [];
}
