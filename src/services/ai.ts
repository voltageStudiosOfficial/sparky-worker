import type { Env, ChatMessage, AIResponse } from "../types/index.js";

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Vision-capable models that can process images
export const VISION_MODELS = [
  "openai/gpt-4-vision-preview",
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "anthropic/claude-3-haiku-20240307",
  "anthropic/claude-3-sonnet-20240229",
  "anthropic/claude-3-opus-20240229",
  "google/gemini-pro-vision",
  "google/gemini-1.5-pro",
  "google/gemini-1.5-flash",
  "meta/llama-3.2-vision",
];

/**
 * Check if a model supports vision/multimodal input
 */
export function isVisionModel(modelId: string): boolean {
  return VISION_MODELS.includes(modelId.toLowerCase());
}

/**
 * Check if current model supports vision
 */
export function supportsVision(env: Env, model: string): boolean {
  return isVisionModel(model) || isVisionModel(env.PRIMARY_MODEL || "");
}

/**
 * Format a message with images for vision models
 * Vision models expect images in a specific format (base64 or URL)
 */
export function formatMessageForVision(
  message: ChatMessage,
  model: string,
): any {
  // If the message has images and the model supports vision
  if (message.images && message.images.length > 0 && isVisionModel(model)) {
    // Different models have different formats for multimodal content
    
    if (model.startsWith("openai/") || model.startsWith("anthropic/")) {
      // OpenAI and Anthropic use content array with type: "image_url" or "text"
      const content: Array<{ type: "text" | "image_url"; text?: string; image_url?: string }> = [];
      
      // Add text if present
      if (message.content) {
        content.push({ type: "text", text: message.content });
      }
      
      // Add images
      for (const img of message.images) {
        if (img.startsWith("data:")) {
          // Base64 encoded image
          content.push({ type: "image_url", image_url: img });
        } else {
          // URL to image
          content.push({ type: "image_url", image_url: img });
        }
      }
      
      return { role: message.role, content };
    } else if (model.startsWith("google/")) {
      // Google Gemini format
      const parts: Array<{ text?: string; inline_data?: { mime_type: string; data: string } }> = [];
      
      if (message.content) {
        parts.push({ text: message.content });
      }
      
      for (const img of message.images) {
        if (img.startsWith("data:")) {
          // Extract mime type and data from data URL
          const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
          if (match) {
            parts.push({ inline_data: { mime_type: match[1], data: match[2] } });
          }
        } else {
          // For URLs, Google models might not support them directly
          // We'd need to download and encode as base64
          parts.push({ text: `[Image: ${img}]` });
        }
      }
      
      return { role: message.role, parts };
    } else {
      // For non-vision models, just include image URLs in the text
      let content = message.content || "";
      if (message.images.length > 0) {
        content += "\n\nImages:" + message.images.map(img => `\n- ${img}`).join("");
      }
      return { role: message.role, content };
    }
  }
  
  // No images or model doesn't support vision
  return message;
}

// hit up the ai gods and ask em for wisdom
export async function callAI(
  env: Env,
  messages: ChatMessage[],
  model: string,
): Promise<AIResponse> {
  const url = env.AI_API || OPENROUTER_URL;

  // Format messages for the specific model
  const formattedMessages = messages.map(msg => formatMessageForVision(msg, model));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      // OpenRouter specific headers for multimodal
      "HTTP-Referer": "https://sparky-bot.workers.dev",
      "X-Title": "Sparky Bot",
    },
    body: JSON.stringify({
      model,
      messages: formattedMessages,
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

/**
 * Call AI with a specific vision model
 * Useful when you need to force vision capabilities
 */
export async function callVisionAI(
  env: Env,
  messages: ChatMessage[],
  preferredModel?: string,
): Promise<AIResponse> {
  // Find the best vision model available
  let model = preferredModel;
  
  // If no preferred model, try to find one that supports vision
  if (!model) {
    // Check if current PRIMARY_MODEL supports vision
    const primary = env.PRIMARY_MODEL || "";
    if (isVisionModel(primary)) {
      model = primary;
    } else {
      // Fall back to a known vision model
      model = "openai/gpt-4o";
    }
  }
  
  return callAI(env, messages, model);
}
