import type { Env, TelegramUpdate } from "./types/index.js";
import { processTelegramUpdate, checkStatus } from "./handlers/telegram.js";
import { handleTestGUI } from "./handlers/test-gui.js";

interface CloudflareWorkerRequest extends Request {
  env: Env;
}

export default {
  async fetch(req: CloudflareWorkerRequest, env: Env): Promise<Response> {
    const url = new URL(req.url);

    // Test GUI endpoint
    if (url.pathname === "/test" || url.pathname === "/test-gui") {
      return await handleTestGUI(req, env);
    }

    // Status endpoint (for monitoring)
    if (url.pathname === "/status" && req.method === "GET") {
      return await checkStatus(env);
    }
    // Set webhook endpoint (for Telegram)
    if (url.pathname === "/set-webhook" && req.method === "GET") {
      const webhookUrl = env.WEBHOOK_URL;
      if (!webhookUrl) {
        return new Response("WEBHOOK_URL not set in environment variables", {
          status: 500,
        });
      }
      const telegramApiUrl = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/setWebhook?url=${webhookUrl}`;
      const response = await fetch(telegramApiUrl);
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
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
