import type { Env, MemoryStore, ChatMessage } from "../types/index.js";

// get that kv store
function getKVStore(env: Env): KVNamespace | null {
  return env.KV || null;
}

// load up the convo history from the vault
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

// stash that convo (keep the last 20 msgs tho)
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
    // oop
    // let it fail silently lol
  }
}

// wipe the slate clean bestie
export async function clearHistory(env: Env, chatId: number): Promise<void> {
  try {
    const store = getKVStore(env);
    if (!store) return;

    await store.delete(`c:${chatId}`);
  } catch {
    // oop
    // let it fail silently lol
  }
}
