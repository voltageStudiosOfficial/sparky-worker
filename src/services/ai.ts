import type { Env, ChatMessage, AIResponse } from "../types/index.js";

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

/**
 * Call OpenRouter AI API
 */
export async function callAI(
  env: Env,
  messages: ChatMessage[],
  model: string,
): Promise<AIResponse> {
  const url = env.AI_API || OPENROUTER_URL;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.6,
    }),
  });

  const text = await response.text();

  try {
    return JSON.parse(text) as AIResponse;
  } catch {
    return { error: text };
  }
}
