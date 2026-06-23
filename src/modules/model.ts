import type { Env } from "../types/index.js";

// Use the free GPT-OSS 20B endpoint from OpenRouter
// This is the free :free endpoint that doesn't cost anything
const FREE_MODEL = "openrouter/gpt-oss-20b";

// grab the ai model we're rockin with
// Always uses the free GPT-OSS 20B :free endpoint
export function getModel(env: Env): string {
  // Always use the free GPT-OSS 20B model
  // PRIMARY_MODEL is ignored - we always use the free endpoint
  return FREE_MODEL;
}

// Get the free model explicitly
export function getFreeModel(): string {
  return FREE_MODEL;
}
