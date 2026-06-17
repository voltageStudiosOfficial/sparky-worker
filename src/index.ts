import type { Env, TelegramUpdate } from "./types/index.js";
import { processTelegramUpdate, checkStatus } from "./handlers/telegram.js";

interface CloudflareWorkerRequest extends Request {
  env: Env;
}

export default {
  async fetch(req: CloudflareWorkerRequest, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Status endpoint (for monitoring)
    if (url.pathname === "/status") {
      return await checkStatus(env);
    }

    // GET requests
    if (req.method === "GET") {
      return new Response("Sparky API online");
    }

    // Only process Telegram webhook
    if (url.pathname !== "/telegram") {
      return new Response("ignored");
    }

    // Only accept POST
    if (req.method !== "POST") {
      return new Response("ok");
    }

    try {
      const update = (await req.json()) as TelegramUpdate;
      return await processTelegramUpdate(env, update);
    } catch (error) {
      console.log("SPARKY ERROR:", error);
      return new Response("ok");
    }
  },
};
