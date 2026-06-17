import type { Env } from "../types/index.js";

/**
 * Get the primary AI model from environment
 */
export function getModel(env: Env): string | null {
  return env.PRIMARY_MODEL && env.PRIMARY_MODEL.trim()
    ? env.PRIMARY_MODEL
    : null;
}
