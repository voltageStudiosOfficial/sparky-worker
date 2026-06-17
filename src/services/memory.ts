import type { Env, MemoryStore, ChatMessage } from "../types/index.js";

/**
 * Get KV namespace instance
 */
function getKVStore(env: Env): KVNamespace | null {
  return env.KV || null;
}

/**
 * Load chat history from KV store
 */
export async function loadHistory(
  env: Env,
  chatId: number,
): Promise<MemoryStore> {
  try {
    const store = getKVStore(env);
    if (!store) return { h: [] };

    const raw = await store.get(`c:${chatId}`);
    return { h: raw ? (JSON.parse(raw) as ChatMessage[]) : [] };
  } catch {
    return { h: [] };
  }
}

/**
 * Save chat history to KV store (keep last 20 messages)
 */
export async function saveHistory(
  env: Env,
  chatId: number,
  history: ChatMessage[],
): Promise<void> {
  try {
    const store = getKVStore(env);
    if (!store) return;

    await store.put(`c:${chatId}`, JSON.stringify(history.slice(-20)));
  } catch {
    // Silent fail for history save
  }
}

/**
 * Clear chat history from KV store
 */
export async function clearHistory(env: Env, chatId: number): Promise<void> {
  try {
    const store = getKVStore(env);
    if (!store) return;

    await store.delete(`c:${chatId}`);
  } catch {
    // Silent fail for history clear
  }
}
