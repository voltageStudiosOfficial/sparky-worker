import type { Env } from "../types/index.js";

const FALLBACK_MODEL = "openrouter/gpt-oss-20b";

// grab the ai model we're rockin with
// falls back to GPT-OSS 20B free endpoint if not configured
export function getModel(env: Env): string {
  return env.PRIMARY_MODEL && env.PRIMARY_MODEL.trim()
    ? env.PRIMARY_MODEL
    : FALLBACK_MODEL;
}
