import type { Env } from "../types/index.js";

// grab the ai model we're rockin with
export function getModel(env: Env): string | null {
  return env.PRIMARY_MODEL && env.PRIMARY_MODEL.trim()
    ? env.PRIMARY_MODEL
    : null;
}
